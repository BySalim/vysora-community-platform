import { Inject, Injectable } from '@nestjs/common';
import {
  etatSujet,
  lireMessage,
  peutFermerSujet,
  peutRouvrirSujet,
  type MembreResumeApi,
  type MessageApi,
  type SujetApi,
} from '@vysora/shared';
import { and, asc, count, eq, inArray, ne } from 'drizzle-orm';
import { introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  contenu,
  creation,
  enregistrement,
  message,
  modele,
  outil,
  signalement,
  sujet,
  vote,
} from '../../db/schema/index.js';
import { apercusDesCreations } from '../creations/apercus.js';
import type { Lecteur } from '../creations/creations.service.js';
import { lireCible } from '../interactions/cibles.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { lireMasquages } from '../moderation/masquages.js';
import { etiquettesDes, lireCorps } from './contenu-sujet.js';

/** Réponses renvoyées avec le sujet ; la pagination viendra si les fils s'allongent. */
const REPONSES_MAXIMUM = 500;

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

/* FORUM-01 : lecture d'un sujet et de ses réponses (EC-07, F-51 à F-55).
   RG-30 : un sujet visible se lit par tous ; masqué, par son auteur (avec une mention) et par la
   modération ; supprimé, par personne. Il en va de même de chaque réponse, dans un sujet que la
   personne peut lire. RG-63 : la réponse acceptée n'est présentée comme telle, et le sujet comme
   résolu, que si elle est visible de tous. */
@Injectable()
export class SujetsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async sujet(id: number, lecteur: Lecteur | null): Promise<SujetApi> {
    const [ligne] = await this.db
      .select({
        sujet,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        dateCreation: contenu.dateCreation,
        dateModification: contenu.dateModification,
        outil: {
          id: outil.id,
          nom: outil.nom,
          slug: outil.slug,
          logo: outil.logo,
          logoMonochrome: outil.logoMonochrome,
        },
        modele: { id: modele.id, nom: modele.nom, nomCourt: modele.nomCourt },
      })
      .from(sujet)
      .innerJoin(contenu, eq(contenu.id, sujet.id))
      .leftJoin(outil, eq(outil.id, sujet.outilId))
      .leftJoin(modele, eq(modele.id, sujet.modeleId))
      .where(eq(sujet.id, id));
    const auteur = lecteur !== null && ligne?.auteurId === lecteur.id;
    const moderation = lecteur !== null && lecteur.role !== 'MEMBRE';
    // Ce qu'une personne ne peut pas voir n'existe pas pour elle : même réponse qu'un sujet inconnu.
    if (
      !ligne ||
      ligne.statut === 'SUPPRIME' ||
      (ligne.statut === 'MASQUE' && !auteur && !moderation)
    )
      throw introuvable('Ce sujet est introuvable.');

    const messages = await this.db
      .select({
        id: message.id,
        corps: message.corps,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        date: contenu.dateCreation,
        dateModification: contenu.dateModification,
      })
      .from(message)
      .innerJoin(contenu, eq(contenu.id, message.id))
      .where(and(eq(message.sujetId, id), ne(contenu.statut, 'SUPPRIME')))
      .orderBy(asc(contenu.dateCreation), asc(message.id));
    const toutesLisibles = messages.filter(
      (m) =>
        m.statut === 'VISIBLE' || moderation || (lecteur !== null && m.auteurId === lecteur.id),
    );
    const lisibles = toutesLisibles.slice(0, REPONSES_MAXIMUM);
    const visibles = messages.filter((m) => m.statut === 'VISIBLE');
    const acceptee = visibles.find((m) => m.id === ligne.sujet.messageAccepteId) ?? null;
    const ids = [id, ...lisibles.map((m) => m.id)];

    const masques = [
      ...(ligne.statut === 'MASQUE' ? [id] : []),
      ...lisibles.filter((m) => m.statut === 'MASQUE').map((m) => m.id),
    ];
    const [etiquettes, votes, moi, masquages, creationLiee, membres] = await Promise.all([
      etiquettesDes(this.db, [id]),
      this.db
        .select({ contenuId: vote.contenuId, type: vote.typeVoteCode, n: count() })
        .from(vote)
        .where(inArray(vote.contenuId, ids))
        .groupBy(vote.contenuId, vote.typeVoteCode),
      lecteur ? this.relation(lecteur.id, id, ids) : null,
      lireMasquages(this.db, masques, moderation),
      ligne.sujet.creationId ? this.creationLiee(ligne.sujet.creationId) : null,
      resumerMembres(this.db, this.stockage, [
        ligne.auteurId,
        ...lisibles.map((m) => m.auteurId),
        ...(ligne.sujet.fermeurId ? [ligne.sujet.fermeurId] : []),
      ]),
    ]);

    const membre = (membreId: number): MembreResumeApi => {
      const resume = membres.get(membreId);
      if (!resume) throw new Error(`Membre introuvable : ${membreId}`);
      return resume;
    };
    const nombre = (contenuId: number, type: string) =>
      votes.find((v) => v.contenuId === contenuId && v.type === type)?.n ?? 0;
    const { texte, clinique } = lireCorps(ligne.sujet.typeSujet, ligne.sujet.corps);
    const ferme = ligne.sujet.dateFermeture !== null;
    const visible = ligne.statut === 'VISIBLE';

    const reponses = lisibles.map((m): MessageApi => {
      const { texte: corps, prompt } = lireMessage(m.corps);
      return {
        id: m.id,
        auteur: membre(m.auteurId),
        date: m.date.toISOString(),
        dateModification: iso(m.dateModification),
        corps,
        prompt,
        utiles: nombre(m.id, 'UTILE'),
        acceptee: acceptee?.id === m.id ? iso(ligne.sujet.dateAcceptationReponse) : null,
        masquee: m.statut === 'MASQUE',
        masquage: masquages.get(m.id) ?? null,
        moi: moi && {
          auteur: m.auteurId === lecteur?.id,
          utile: moi.utiles.has(m.id),
          signalementOuvert: moi.signales.has(m.id),
        },
      };
    });

    return {
      id,
      slug: ligne.sujet.slug,
      type: ligne.sujet.typeSujet,
      titre: ligne.sujet.titre,
      corps: texte,
      clinique,
      astuce:
        ligne.sujet.exempleAvant !== null && ligne.sujet.exempleApres !== null
          ? { avant: ligne.sujet.exempleAvant, apres: ligne.sujet.exempleApres }
          : null,
      outil: ligne.outil,
      modele: ligne.modele,
      modeleNonReference: ligne.sujet.modeleNonReference,
      etiquettes: etiquettes.get(id) ?? [],
      etat: etatSujet({ ferme, accepte: acceptee !== null }),
      fermeture: ligne.sujet.dateFermeture
        ? {
            date: ligne.sujet.dateFermeture.toISOString(),
            par: ligne.sujet.fermeurId ? membre(ligne.sujet.fermeurId) : null,
          }
        : null,
      creation: creationLiee,
      auteur: membre(ligne.auteurId),
      dateCreation: ligne.dateCreation.toISOString(),
      dateModification: iso(ligne.dateModification),
      derniereActivite: (visibles.at(-1)?.date ?? ligne.dateCreation).toISOString(),
      utiles: nombre(id, 'UTILE'),
      testes: nombre(id, 'TESTE_OK'),
      masquee: ligne.statut === 'MASQUE',
      masquage: masquages.get(id) ?? null,
      reponses: { total: toutesLisibles.length, elements: reponses },
      moi: moi && {
        auteur,
        utile: moi.utiles.has(id),
        teste: moi.teste,
        enregistre: moi.enregistre,
        signalementOuvert: moi.signales.has(id),
        peutFermer: visible && !ferme && peutFermerSujet({ auteur, moderation }),
        peutRouvrir:
          visible &&
          ferme &&
          peutRouvrirSujet({
            auteur,
            moderation,
            fermeParLAuteur: ligne.sujet.fermeurId === ligne.auteurId,
          }),
      },
    };
  }

  /** RG-66 : la création évoquée, tant qu'elle est publiée et visible de tous. */
  private async creationLiee(creationId: number): Promise<SujetApi['creation']> {
    const cible = await lireCible(this.db, creationId);
    if (!cible?.public) return null;
    const [lue] = await this.db
      .select({ titre: creation.titre, slug: creation.slug, type: creation.typeCreation })
      .from(creation)
      .where(eq(creation.id, creationId));
    if (!lue) return null;
    const [apercus, auteurs] = await Promise.all([
      apercusDesCreations(this.db, this.stockage, [{ id: creationId, type: lue.type }]),
      resumerMembres(this.db, this.stockage, [cible.auteurId]),
    ]);
    const auteur = auteurs.get(cible.auteurId);
    if (!auteur) throw new Error(`Membre introuvable : ${cible.auteurId}`);
    return {
      id: creationId,
      slug: lue.slug ?? '',
      titre: lue.titre ?? '',
      auteur,
      couverture: apercus.get(creationId)?.couverture ?? null,
    };
  }

  /** Votes, enregistrement et signalements ouverts de la personne connectée. */
  private async relation(membreId: number, sujetId: number, ids: number[]) {
    const [votes, enregistre, signales] = await Promise.all([
      this.db
        .select({ contenuId: vote.contenuId, type: vote.typeVoteCode })
        .from(vote)
        .where(and(eq(vote.votantId, membreId), inArray(vote.contenuId, ids))),
      this.db.$count(
        enregistrement,
        and(eq(enregistrement.utilisateurId, membreId), eq(enregistrement.contenuId, sujetId)),
      ),
      this.db
        .select({ contenuId: signalement.contenuId })
        .from(signalement)
        .where(
          and(
            eq(signalement.signaleurId, membreId),
            eq(signalement.statut, 'OUVERT'),
            inArray(signalement.contenuId, ids),
          ),
        ),
    ]);
    return {
      utiles: new Set(votes.filter((v) => v.type === 'UTILE').map((v) => v.contenuId)),
      teste: votes.some((v) => v.contenuId === sujetId && v.type === 'TESTE_OK'),
      enregistre: enregistre > 0,
      signales: new Set(signales.map((s) => s.contenuId)),
    };
  }
}
