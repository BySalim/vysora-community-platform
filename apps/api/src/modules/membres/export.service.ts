import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { DELAIS, type ContenuExportApi, type ExportApi } from '@vysora/shared';
import { aliasedTable, and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  acceptationDocument,
  badge,
  casBonReflexe,
  categorie,
  choixOption,
  commentaire,
  configurationIa,
  contenu,
  creation,
  demandeDroit,
  documentLegal,
  echange,
  enregistrement,
  etape,
  licence,
  message,
  modele,
  mouvementReputation,
  obtentionBadge,
  optionReponse,
  outil,
  reproduction,
  session,
  sujet,
  utilisateur,
  vote,
} from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { FileTaches } from '../file/file-taches.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { emailExportPret } from './courriels.js';

/** Tâche de la file qui prépare un export demandé (WF-22). */
export const TACHE_EXPORT = 'exports.preparer';
const JOUR_MS = 24 * 3600_000;

const iso = (date: Date | null | undefined): string | null => date?.toISOString() ?? null;

/* PARAM-01 (F-07, WF-22, RG-06) : export des données personnelles au format JSON. La demande est
   enregistrée (EN_COURS, une seule à la fois, CI-31), préparée par la file, puis TRAITEE : le membre
   reçoit un e-mail et peut télécharger le fichier pendant 7 jours. Aucune copie n'est gardée : le
   fichier est composé à chaque téléchargement, avec les données du moment (minimisation, ENF-07). */
@Injectable()
export class ExportService implements OnModuleInit {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly file: FileTaches,
    private readonly emails: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.file.declarer<{ demandeId: number }>({
      nom: TACHE_EXPORT,
      executer: ({ demandeId }) => this.preparer(demandeId),
      reprises: { nombre: 5, delaiSecondes: 60 },
      dureeMaximaleSecondes: 600,
      conservationSecondes: 7 * 24 * 3600,
    });
  }

  /** État de la dernière demande et contenu du fichier, pour la rubrique « Mes données ». */
  async etat(utilisateurId: number, pseudo: string, maintenant = new Date()): Promise<ExportApi> {
    const [[derniere], contenuExport] = await Promise.all([
      this.db
        .select()
        .from(demandeDroit)
        .where(and(eq(demandeDroit.utilisateurId, utilisateurId), eq(demandeDroit.type, 'EXPORT')))
        .orderBy(desc(demandeDroit.dateDemande), desc(demandeDroit.id))
        .limit(1),
      this.compter(utilisateurId),
    ]);
    const nomFichier = `vysora-${pseudo}-${maintenant.toISOString().slice(0, 10)}.json`;
    if (!derniere || derniere.statut === 'ANNULEE')
      return {
        etat: 'AUCUN',
        dateDemande: null,
        expiration: null,
        nomFichier,
        contenu: contenuExport,
      };
    const etat =
      derniere.statut === 'EN_COURS'
        ? 'PREPARATION'
        : derniere.dateExpirationExport && derniere.dateExpirationExport > maintenant
          ? 'PRET'
          : 'EXPIRE';
    return {
      etat,
      dateDemande: derniere.dateDemande.toISOString(),
      expiration: iso(derniere.dateExpirationExport),
      nomFichier,
      contenu: contenuExport,
    };
  }

  /** WF-22 : demande enregistrée puis préparée par la file ; une seule en cours à la fois (CI-31). */
  async demander(utilisateurId: number): Promise<void> {
    let demandeId: number;
    try {
      const [ligne] = await this.db
        .insert(demandeDroit)
        .values({ utilisateurId, type: 'EXPORT' })
        .returning({ id: demandeDroit.id });
      if (!ligne) throw new Error('Demande non enregistrée');
      demandeId = ligne.id;
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'demande_droit_en_cours_unique'))
        throw conflit(
          'Votre export est déjà en préparation. Une seule demande peut être en cours.',
        );
      throw erreur;
    }
    await this.file.publier(TACHE_EXPORT, { demandeId });
  }

  /** Préparation : le fichier est composé une fois (il doit pouvoir l'être), la demande passe à
      TRAITEE avec un lien valable 7 jours (F-07), puis l'e-mail part (RG-90). Rejouable. */
  async preparer(demandeId: number, maintenant = new Date()): Promise<void> {
    const [demande] = await this.db
      .select({
        utilisateurId: demandeDroit.utilisateurId,
        statut: demandeDroit.statut,
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
      })
      .from(demandeDroit)
      .innerJoin(utilisateur, eq(utilisateur.id, demandeDroit.utilisateurId))
      .where(eq(demandeDroit.id, demandeId));
    if (demande?.statut !== 'EN_COURS') return;
    await this.composer(demande.utilisateurId);
    const expiration = new Date(maintenant.getTime() + DELAIS.lienExportJours * JOUR_MS);
    const traitees = await this.db
      .update(demandeDroit)
      .set({ statut: 'TRAITEE', dateTraitement: maintenant, dateExpirationExport: expiration })
      .where(and(eq(demandeDroit.id, demandeId), eq(demandeDroit.statut, 'EN_COURS')))
      .returning({ id: demandeDroit.id });
    // Une adresse jamais confirmée peut être celle d'un tiers : le fichier reste dans les paramètres.
    if (traitees.length && demande.email && demande.emailVerifie)
      await this.emails.envoyer(emailExportPret(demande.email, expiration, this.config.SITE_URL));
  }

  /** Téléchargement : seulement pendant les 7 jours qui suivent la préparation. */
  async fichier(
    utilisateurId: number,
    maintenant = new Date(),
  ): Promise<{ nom: string; contenu: string }> {
    const [pret] = await this.db
      .select({ id: demandeDroit.id, pseudo: utilisateur.pseudo })
      .from(demandeDroit)
      .innerJoin(utilisateur, eq(utilisateur.id, demandeDroit.utilisateurId))
      .where(
        and(
          eq(demandeDroit.utilisateurId, utilisateurId),
          eq(demandeDroit.type, 'EXPORT'),
          eq(demandeDroit.statut, 'TRAITEE'),
          sql`${demandeDroit.dateExpirationExport} > ${maintenant}`,
        ),
      )
      .limit(1);
    if (!pret)
      throw introuvable(
        'Aucun fichier n’est prêt : demandez un export depuis la rubrique « Mes données ».',
      );
    const donnees = await this.composer(utilisateurId);
    return {
      nom: `vysora-${pret.pseudo}-${maintenant.toISOString().slice(0, 10)}.json`,
      contenu: JSON.stringify(donnees, null, 2),
    };
  }

  /** Nombre d'éléments de chaque partie du fichier (aperçu de la rubrique). */
  private async compter(id: number): Promise<ContenuExportApi> {
    const auteur = (type: 'CREATION' | 'SUJET' | 'MESSAGE' | 'COMMENTAIRE' | 'REPRODUCTION') =>
      this.db.$count(contenu, and(eq(contenu.auteurId, id), eq(contenu.typeContenu, type)));
    const [documents, creations, sujets, messages, commentaires, essais, cas, reponses] =
      await Promise.all([
        this.db.$count(acceptationDocument, eq(acceptationDocument.utilisateurId, id)),
        auteur('CREATION'),
        auteur('SUJET'),
        auteur('MESSAGE'),
        auteur('COMMENTAIRE'),
        auteur('REPRODUCTION'),
        this.db.$count(
          contenu,
          and(eq(contenu.auteurId, id), eq(contenu.typeContenu, 'CAS_BON_REFLEXE')),
        ),
        this.db.$count(choixOption, eq(choixOption.utilisateurId, id)),
      ]);
    const [votes, enregistrements, badges, mouvements] = await Promise.all([
      this.db.$count(vote, eq(vote.votantId, id)),
      this.db.$count(enregistrement, eq(enregistrement.utilisateurId, id)),
      this.db.$count(obtentionBadge, eq(obtentionBadge.utilisateurId, id)),
      this.db.$count(mouvementReputation, eq(mouvementReputation.beneficiaireId, id)),
    ]);
    return {
      documents,
      creations,
      messages: sujets + messages + commentaires,
      essais,
      cas: cas + reponses,
      votes,
      enregistrements,
      badges,
      mouvements,
    };
  }

  /** F-07 : données du compte, acceptations des documents légaux, contributions (créations, sujets,
      réponses, commentaires, essais, cas), votes émis, enregistrements, badges et mouvements de
      réputation. Les contenus supprimés figurent avec leur statut : ils restent en base (RG-19). */
  async composer(id: number): Promise<Record<string, unknown>> {
    const [compte] = await this.db.select().from(utilisateur).where(eq(utilisateur.id, id));
    if (!compte) throw introuvable();
    const [preferences, sessions, documents, creations, messages, essais, cas, votes] =
      await Promise.all([
        this.notifications.preferences(id),
        this.db
          .select({
            appareil: session.appareil,
            ouverte: session.dateCreation,
            activite: session.dateDerniereActivite,
          })
          .from(session)
          .where(eq(session.utilisateurId, id))
          .orderBy(desc(session.dateDerniereActivite)),
        this.db
          .select({
            document: documentLegal.type,
            version: documentLegal.version,
            effet: documentLegal.dateEffet,
            le: acceptationDocument.dateAcceptation,
          })
          .from(acceptationDocument)
          .innerJoin(documentLegal, eq(documentLegal.id, acceptationDocument.documentLegalId))
          .where(eq(acceptationDocument.utilisateurId, id))
          .orderBy(asc(acceptationDocument.dateAcceptation)),
        this.creations(id),
        this.messages(id),
        this.essais(id),
        this.cas(id),
        this.db
          .select({ contenu: vote.contenuId, vote: vote.typeVoteCode, date: vote.dateVote })
          .from(vote)
          .where(eq(vote.votantId, id))
          .orderBy(asc(vote.dateVote)),
      ]);
    const [enregistrements, badges, mouvements] = await Promise.all([
      this.db
        .select({
          contenu: enregistrement.contenuId,
          type: contenu.typeContenu,
          date: enregistrement.dateEnregistrement,
        })
        .from(enregistrement)
        .innerJoin(contenu, eq(contenu.id, enregistrement.contenuId))
        .where(eq(enregistrement.utilisateurId, id))
        .orderBy(asc(enregistrement.dateEnregistrement)),
      this.db
        .select({ badge: badge.libelle, date: obtentionBadge.dateObtention })
        .from(obtentionBadge)
        .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
        .where(eq(obtentionBadge.utilisateurId, id))
        .orderBy(asc(obtentionBadge.dateObtention)),
      this.db
        .select({
          points: mouvementReputation.points,
          motif: mouvementReputation.motif,
          date: mouvementReputation.date,
          contenu: mouvementReputation.contenuId,
        })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, id))
        .orderBy(asc(mouvementReputation.date), asc(mouvementReputation.id)),
    ]);

    return {
      format: 'Export des données personnelles Vysora (F-07)',
      genere_le: new Date().toISOString(),
      compte: {
        pseudo: compte.pseudo,
        nom_affiche: compte.nomAffiche,
        email: compte.email,
        email_verifie: compte.emailVerifie,
        role: compte.role,
        statut: compte.statutCompte,
        langue: compte.langueInterface,
        fuseau_horaire: compte.fuseauHoraire,
        biographie: compte.biographie,
        site: compte.urlSite,
        inscription: iso(compte.dateInscription),
        derniere_connexion: iso(compte.dateDerniereConnexion),
        mot_de_passe_modifie_le: iso(compte.dateMotDePasse),
        reputation: mouvements.reduce((total, mouvement) => total + mouvement.points, 0),
        notifications_email: preferences.email,
        notifications_email_par_evenement: preferences.evenements,
        refus_mesure_audience: compte.refusMesureAudience,
        appareils: sessions.map((s) => ({
          appareil: s.appareil,
          ouverte_le: iso(s.ouverte),
          derniere_activite: iso(s.activite),
        })),
      },
      documents_acceptes: documents.map((d) => ({
        document: d.document,
        version: d.version,
        date_effet: d.effet,
        acceptee_le: iso(d.le),
      })),
      creations,
      sujets_reponses_commentaires: messages,
      essais_declares: essais,
      cas_bon_reflexe: cas,
      votes_emis: votes.map((v) => ({ contenu: v.contenu, vote: v.vote, date: iso(v.date) })),
      enregistrements: enregistrements.map((e) => ({
        contenu: e.contenu,
        type: e.type,
        date: iso(e.date),
      })),
      badges: badges.map((b) => ({ badge: b.badge, obtenu_le: iso(b.date) })),
      mouvements_reputation: mouvements.map((m) => ({
        points: m.points,
        motif: m.motif,
        date: iso(m.date),
        contenu: m.contenu,
      })),
    };
  }

  /** Créations, brouillons compris, avec leur chemin parcouru (étapes, prompts et réponses). */
  private async creations(id: number) {
    const lignes = await this.db
      .select({
        id: creation.id,
        type: creation.typeCreation,
        statut: contenu.statut,
        publication: creation.statutPublication,
        titre: creation.titre,
        objectif: creation.objectif,
        limites: creation.limites,
        resultat: creation.resultatTexte,
        format: creation.formatResultat,
        categorie: categorie.libelle,
        licence: licence.code,
        creee: contenu.dateCreation,
        modifiee: contenu.dateModification,
        publiee: creation.datePublication,
      })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .leftJoin(categorie, eq(categorie.id, creation.categorieId))
      .leftJoin(licence, eq(licence.id, creation.licenceId))
      .where(eq(contenu.auteurId, id))
      .orderBy(asc(contenu.dateCreation));
    const ids = lignes.map((ligne) => ligne.id);
    const echanges = ids.length
      ? await this.db
          .select({
            creation: etape.creationId,
            etape: etape.id,
            ordreEtape: etape.ordre,
            titreEtape: etape.titre,
            recit: etape.recit,
            titre: echange.titre,
            prompt: echange.prompt,
            reponse: echange.reponse,
            outil: outil.nom,
            modele: sql<
              string | null
            >`coalesce(${modele.nom}, ${configurationIa.modeleNonReference})`,
          })
          .from(etape)
          .leftJoin(echange, eq(echange.etapeId, etape.id))
          .leftJoin(configurationIa, eq(configurationIa.id, echange.configurationId))
          .leftJoin(outil, eq(outil.id, configurationIa.outilId))
          .leftJoin(modele, eq(modele.id, configurationIa.modeleId))
          .where(inArray(etape.creationId, ids))
          .orderBy(asc(etape.ordre), asc(echange.ordre))
      : [];
    return lignes.map((c) => {
      const etapes = new Map<number, Record<string, unknown> & { echanges: unknown[] }>();
      for (const e of echanges.filter((ligne) => ligne.creation === c.id)) {
        const courante = etapes.get(e.etape) ?? {
          ordre: e.ordreEtape,
          titre: e.titreEtape,
          recit: e.recit,
          echanges: [],
        };
        if (e.prompt !== null)
          courante.echanges.push({
            titre: e.titre,
            outil: e.outil,
            modele: e.modele,
            prompt: e.prompt,
            reponse: e.reponse,
          });
        etapes.set(e.etape, courante);
      }
      return {
        id: c.id,
        type: c.type,
        statut: c.statut === 'VISIBLE' ? c.publication : c.statut,
        titre: c.titre,
        objectif: c.objectif,
        limites: c.limites,
        resultat: c.resultat,
        format: c.format,
        categorie: c.categorie,
        licence: c.licence,
        creee_le: iso(c.creee),
        modifiee_le: iso(c.modifiee),
        publiee_le: iso(c.publiee),
        etapes: [...etapes.values()],
      };
    });
  }

  /** Sujets, réponses du forum et commentaires, du plus ancien au plus récent. */
  private async messages(id: number) {
    const sujetParent = aliasedTable(sujet, 'sujet_parent');
    const [sujets, reponses, commentaires] = await Promise.all([
      this.db
        .select({
          id: sujet.id,
          statut: contenu.statut,
          date: contenu.dateCreation,
          type: sujet.typeSujet,
          titre: sujet.titre,
          texte: sujet.corps,
          avant: sujet.exempleAvant,
          apres: sujet.exempleApres,
        })
        .from(sujet)
        .innerJoin(contenu, eq(contenu.id, sujet.id))
        .where(eq(contenu.auteurId, id)),
      this.db
        .select({
          id: message.id,
          statut: contenu.statut,
          date: contenu.dateCreation,
          sujet: message.sujetId,
          titreSujet: sujetParent.titre,
          texte: message.corps,
        })
        .from(message)
        .innerJoin(contenu, eq(contenu.id, message.id))
        .innerJoin(sujetParent, eq(sujetParent.id, message.sujetId))
        .where(eq(contenu.auteurId, id)),
      this.db
        .select({
          id: commentaire.id,
          statut: contenu.statut,
          date: contenu.dateCreation,
          creation: commentaire.creationId,
          texte: commentaire.corps,
        })
        .from(commentaire)
        .innerJoin(contenu, eq(contenu.id, commentaire.id))
        .where(eq(contenu.auteurId, id)),
    ]);
    return [
      ...sujets.map((s) => ({
        type: 'sujet',
        id: s.id,
        statut: s.statut,
        date: iso(s.date),
        genre: s.type,
        titre: s.titre,
        texte: s.texte,
        exemple_avant: s.avant,
        exemple_apres: s.apres,
      })),
      ...reponses.map((r) => ({
        type: 'réponse',
        id: r.id,
        statut: r.statut,
        date: iso(r.date),
        sujet: r.sujet,
        titre_du_sujet: r.titreSujet,
        texte: r.texte,
      })),
      ...commentaires.map((c) => ({
        type: 'commentaire',
        id: c.id,
        statut: c.statut,
        date: iso(c.date),
        creation: c.creation,
        texte: c.texte,
      })),
    ].toSorted((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }

  private async essais(id: number) {
    const lignes = await this.db
      .select({
        id: reproduction.id,
        statut: contenu.statut,
        date: contenu.dateCreation,
        creation: reproduction.creationId,
        resultat: reproduction.resultat,
        retour: reproduction.retour,
        reponse: reproduction.reponseObtenue,
        outil: outil.nom,
        modele: sql<string | null>`coalesce(${modele.nom}, ${reproduction.modeleNonReference})`,
      })
      .from(reproduction)
      .innerJoin(contenu, eq(contenu.id, reproduction.id))
      .leftJoin(outil, eq(outil.id, reproduction.outilId))
      .leftJoin(modele, eq(modele.id, reproduction.modeleId))
      .where(eq(contenu.auteurId, id))
      .orderBy(asc(contenu.dateCreation));
    return lignes.map((e) => ({
      id: e.id,
      statut: e.statut,
      date: iso(e.date),
      creation: e.creation,
      outil: e.outil,
      modele: e.modele,
      resultat: e.resultat,
      retour: e.retour,
      reponse_obtenue: e.reponse,
    }));
  }

  /** Cas proposés par le membre et réponses qu'il a données (F-62). */
  private async cas(id: number) {
    const [proposes, reponses] = await Promise.all([
      this.db
        .select({
          id: casBonReflexe.id,
          statut: contenu.statut,
          date: contenu.dateCreation,
          titre: casBonReflexe.titre,
          contexte: casBonReflexe.contexte,
          question: casBonReflexe.question,
          explication: casBonReflexe.explication,
          difficulte: casBonReflexe.difficulte,
          validation: casBonReflexe.statutValidation,
        })
        .from(casBonReflexe)
        .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
        .where(eq(contenu.auteurId, id))
        .orderBy(asc(contenu.dateCreation)),
      this.db
        .select({
          cas: choixOption.casId,
          titre: casBonReflexe.titre,
          option: optionReponse.libelle,
          correcte: optionReponse.estCorrecte,
          date: choixOption.dateChoix,
        })
        .from(choixOption)
        .innerJoin(optionReponse, eq(optionReponse.id, choixOption.optionId))
        .innerJoin(casBonReflexe, eq(casBonReflexe.id, choixOption.casId))
        .where(eq(choixOption.utilisateurId, id))
        .orderBy(asc(choixOption.dateChoix)),
    ]);
    return {
      proposes: proposes.map((c) => ({
        id: c.id,
        statut: c.statut,
        validation: c.validation,
        date: iso(c.date),
        titre: c.titre,
        difficulte: c.difficulte,
        contexte: c.contexte,
        question: c.question,
        explication: c.explication,
      })),
      reponses: reponses.map((r) => ({
        cas: r.cas,
        titre: r.titre,
        option_choisie: r.option,
        bonne_reponse: r.correcte,
        date: iso(r.date),
      })),
    };
  }
}
