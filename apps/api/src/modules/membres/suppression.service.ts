import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DELAIS,
  MESSAGES_PARAMETRES,
  PREFIXE_PSEUDO_SUPPRIME,
  type SuppressionCompte,
  type SuppressionDemandeeApi,
} from '@vysora/shared';
import { and, eq, isNull, lte, ne, sql } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import {
  conflit,
  erreurValidation,
  estViolationUnicite,
  introuvable,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  acceptationDocument,
  compteExterne,
  contenu,
  creation,
  demandeDroit,
  doubleAuthentification,
  enregistrement,
  jeton,
  listeControle,
  media,
  notification,
  preferenceNotification,
  progressionSavoir,
  propositionPiege,
  session,
  soutienDemande,
  tentativeConnexion,
  utilisateur,
} from '../../db/schema/index.js';
import { MotsDePasseService } from '../auth/mots-de-passe.service.js';
import { SessionsService } from '../auth/sessions.service.js';
import { EcritureCreationsService } from '../creations/ecriture.service.js';
import { EmailService } from '../email/email.service.js';
import { Stockage } from '../medias/stockage.js';
import { emailCompteSupprime, emailDemandeSuppression } from './courriels.js';

const JOUR_MS = 24 * 3600_000;

export interface BilanSuppressions {
  comptes: number;
}

/* PARAM-01 (F-08, WF-23, RG-05, D-09) : suppression du compte. La demande, confirmée par le mot de
   passe, passe le compte EN_SUPPRESSION et ferme toutes ses sessions : il n'est plus accessible aux
   autres ; une reconnexion dans les 30 jours l'annule (ConnexionService). Le 30e jour, la tâche
   planifiée efface les données personnelles et signe les contributions d'un pseudo anonyme
   (« membre-supprime-7f3a ») ; les brouillons sont supprimés, les créations publiées aussi si le
   membre l'a demandé (RG-19, points annulés). */
@Injectable()
export class SuppressionService {
  private readonly journal = new Logger(SuppressionService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly creations: EcritureCreationsService,
    private readonly emails: EmailService,
    private readonly stockage: Stockage,
  ) {}

  async demander(
    utilisateurId: number,
    saisie: SuppressionCompte,
    maintenant = new Date(),
  ): Promise<SuppressionDemandeeApi> {
    const [compte] = await this.db
      .select({
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        empreinte: utilisateur.empreinteMotDePasse,
        role: utilisateur.role,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (!compte) throw introuvable();
    if (!(await this.motsDePasse.verifier(compte.empreinte, saisie.motDePasse)))
      throw erreurValidation({ motDePasse: MESSAGES_PARAMETRES.motDePasseIncorrect });
    // RG-111 : l'administration garde toujours au moins un administrateur actif.
    if (compte.role === 'ADMINISTRATEUR' && !(await this.autreAdministrateur(utilisateurId)))
      throw conflit(
        'Vous êtes le seul administrateur : confiez ce rôle à un autre membre avant de supprimer votre compte.',
      );

    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(demandeDroit).values({
          utilisateurId,
          type: 'SUPPRESSION',
          dateDemande: maintenant,
          suppressionCreations: saisie.supprimerCreations,
        });
        await tx
          .update(utilisateur)
          .set({ statutCompte: 'EN_SUPPRESSION' })
          .where(eq(utilisateur.id, utilisateurId));
        await this.sessions.fermerToutes(utilisateurId, tx);
      });
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'demande_droit_en_cours_unique'))
        throw conflit('Une demande de suppression de votre compte est déjà en cours.');
      throw erreur;
    }

    const effacement = new Date(
      maintenant.getTime() + DELAIS.retractationSuppressionJours * JOUR_MS,
    );
    if (compte.email && compte.emailVerifie)
      await this.emails.envoyer(
        emailDemandeSuppression(
          compte.email,
          effacement,
          saisie.supprimerCreations,
          this.config.SITE_URL,
        ),
      );
    return {
      dateEffacement: effacement.toISOString(),
      supprimerCreations: saisie.supprimerCreations,
    };
  }

  /** Tâche quotidienne : comptes dont la demande a 30 jours sans reconnexion (RG-05). */
  async appliquer(maintenant = new Date()): Promise<BilanSuppressions> {
    const limite = new Date(maintenant.getTime() - DELAIS.retractationSuppressionJours * JOUR_MS);
    const echues = await this.db
      .select({
        id: demandeDroit.id,
        utilisateurId: demandeDroit.utilisateurId,
        supprimerCreations: demandeDroit.suppressionCreations,
      })
      .from(demandeDroit)
      .innerJoin(utilisateur, eq(utilisateur.id, demandeDroit.utilisateurId))
      .where(
        and(
          eq(demandeDroit.type, 'SUPPRESSION'),
          eq(demandeDroit.statut, 'EN_COURS'),
          lte(demandeDroit.dateDemande, limite),
          eq(utilisateur.statutCompte, 'EN_SUPPRESSION'),
        ),
      );
    let comptes = 0;
    for (const demande of echues) {
      try {
        await this.effacer(demande.id, demande.utilisateurId, demande.supprimerCreations === true);
        comptes += 1;
      } catch (erreur) {
        // Les autres comptes sont traités ; celui-ci sera repris à la prochaine échéance.
        this.journal.error({ err: erreur, demande: demande.id }, 'Suppression de compte échouée');
      }
    }
    return { comptes };
  }

  private async effacer(
    demandeId: number,
    utilisateurId: number,
    supprimerCreations: boolean,
  ): Promise<void> {
    const [compte] = await this.db
      .select({
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        avatar: utilisateur.avatar,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (!compte) return;

    // RG-19 : brouillons toujours supprimés ; créations publiées aussi, à la demande du membre
    // (leurs commentaires et leurs essais disparaissent, leurs points sont annulés).
    const aSupprimer = await this.db
      .select({ id: creation.id })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .where(
        and(
          eq(contenu.auteurId, utilisateurId),
          ne(contenu.statut, 'SUPPRIME'),
          supprimerCreations ? undefined : eq(creation.statutPublication, 'BROUILLON'),
        ),
      );
    for (const { id } of aSupprimer) await this.creations.supprimer(utilisateurId, id);

    const fichiers = await this.db.transaction(async (tx) => {
      const images = await tx
        .delete(media)
        .where(
          and(
            eq(media.televerseurId, utilisateurId),
            isNull(media.contenuId),
            isNull(media.echangeId),
          ),
        )
        .returning({ variantes: media.variantes });
      await this.effacerDonneesPersonnelles(tx, utilisateurId);
      await this.anonymiser(tx, utilisateurId);
      await tx
        .update(demandeDroit)
        .set({ statut: 'TRAITEE', dateTraitement: new Date() })
        .where(eq(demandeDroit.id, demandeId));
      return [
        ...images.flatMap((image) => Object.values(image.variantes)),
        ...(compte.avatar ? [compte.avatar] : []),
      ];
    });
    await this.stockage.supprimer(fichiers);
    if (compte.email && compte.emailVerifie)
      await this.emails.envoyer(emailCompteSupprime(compte.email, supprimerCreations));
  }

  /** Ce qui ne concerne que le membre : sessions, liens, préférences, notifications, acceptations,
      contenus enregistrés, comptes liés, tentatives de connexion, autres demandes, sa progression
      sur les savoirs d'Apprendre, et dans Explorer ses listes de contrôle, ses pièges signalés (un
      piège retenu a été réécrit dans le guide par l'équipe) et les objectifs qu'il cherchait. */
  private async effacerDonneesPersonnelles(tx: Executeur, id: number): Promise<void> {
    await tx.delete(listeControle).where(eq(listeControle.utilisateurId, id));
    await tx.delete(propositionPiege).where(eq(propositionPiege.auteurId, id));
    await tx.delete(soutienDemande).where(eq(soutienDemande.utilisateurId, id));
    await tx.delete(session).where(eq(session.utilisateurId, id));
    await tx.delete(jeton).where(eq(jeton.utilisateurId, id));
    await tx.delete(compteExterne).where(eq(compteExterne.utilisateurId, id));
    await tx.delete(doubleAuthentification).where(eq(doubleAuthentification.utilisateurId, id));
    await tx.delete(tentativeConnexion).where(eq(tentativeConnexion.utilisateurId, id));
    await tx.delete(preferenceNotification).where(eq(preferenceNotification.utilisateurId, id));
    await tx.delete(notification).where(eq(notification.destinataireId, id));
    await tx.delete(acceptationDocument).where(eq(acceptationDocument.utilisateurId, id));
    await tx.delete(enregistrement).where(eq(enregistrement.utilisateurId, id));
    await tx.delete(progressionSavoir).where(eq(progressionSavoir.utilisateurId, id));
    await tx
      .delete(demandeDroit)
      .where(and(eq(demandeDroit.utilisateurId, id), eq(demandeDroit.type, 'EXPORT')));
  }

  /** D-09 : le compte reste, sans donnée personnelle, pour signer les contributions conservées. */
  private async anonymiser(tx: Executeur, id: number): Promise<void> {
    for (let longueur = 2; ; longueur += 1) {
      const pseudo = `${PREFIXE_PSEUDO_SUPPRIME}-${randomBytes(longueur).toString('hex')}`;
      const pris = await tx.$count(utilisateur, sql`lower(${utilisateur.pseudo}) = ${pseudo}`);
      if (pris) continue;
      await tx
        .update(utilisateur)
        .set({
          pseudo,
          nomAffiche: null,
          email: null,
          emailVerifie: false,
          empreinteMotDePasse: null,
          dateMotDePasse: null,
          avatar: null,
          biographie: null,
          urlSite: null,
          notificationsEmail: false,
          dateDerniereConnexion: null,
          statutCompte: 'SUPPRIME',
        })
        .where(eq(utilisateur.id, id));
      return;
    }
  }

  private async autreAdministrateur(utilisateurId: number): Promise<boolean> {
    return (
      (await this.db.$count(
        utilisateur,
        and(
          eq(utilisateur.role, 'ADMINISTRATEUR'),
          eq(utilisateur.statutCompte, 'ACTIF'),
          ne(utilisateur.id, utilisateurId),
        ),
      )) > 0
    );
  }
}
