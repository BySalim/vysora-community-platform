import { Injectable } from '@nestjs/common';
import { SEUILS, type MotifMouvementReputation } from '@vysora/shared';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Transaction } from '../../db/client.js';
import { contenu, mouvementReputation, utilisateur } from '../../db/schema/index.js';

/** Motifs plafonnés par jour (RG-81). */
const MOTIFS_DE_VOTE: MotifMouvementReputation[] = ['VOTE_UTILE_RECU', 'VOTE_TESTE_RECU'];
/** Points d'une réponse acceptée, pour son auteur et pour celui du sujet (RG-63). */
const MOTIFS_D_ACCEPTATION: MotifMouvementReputation[] = [
  'REPONSE_ACCEPTEE',
  'ACCEPTATION_REPONSE',
];

/** Début du jour (temps universel) d'une date : le plafond de RG-81 se compte par jour UTC. */
const debutDuJour = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

interface Mouvement {
  beneficiaireId: number;
  /** Membre dont l'action déclenche le mouvement (votant…). */
  acteurId: number;
  contenuId: number;
  motif: MotifMouvementReputation;
  points: number;
}

/* REP-01 (première partie) : mouvements de réputation (RG-80), plafond quotidien des votes reçus
   (RG-81), annulations (RG-82). La réputation reste calculée (somme des mouvements, RG-83).
   Chaque méthode s'exécute dans la transaction de l'action qui la déclenche. */
@Injectable()
export class ReputationService {
  /** RG-80, RG-81 : crédite un vote reçu, dans la limite de 200 points de votes par jour. */
  async crediterVote(tx: Transaction, mouvement: Mouvement, maintenant = new Date()) {
    // Les votes reçus par un même membre sont comptés l'un après l'autre (plafond exact).
    await tx
      .select({ id: utilisateur.id })
      .from(utilisateur)
      .where(eq(utilisateur.id, mouvement.beneficiaireId))
      .for('update');
    // Les points accordés comptent même s'ils ont été annulés : retirer puis remettre un vote
    // ne permet pas de dépasser le plafond.
    const [dejaRecus] = await tx
      .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
      .from(mouvementReputation)
      .where(
        and(
          eq(mouvementReputation.beneficiaireId, mouvement.beneficiaireId),
          inArray(mouvementReputation.motif, MOTIFS_DE_VOTE),
          gte(mouvementReputation.date, debutDuJour(maintenant)),
        ),
      );
    const restant = Math.max(0, SEUILS.plafondQuotidienPointsDeVotes - (dejaRecus?.points ?? 0));
    const points = Math.min(mouvement.points, restant);
    if (points > 0)
      await tx.insert(mouvementReputation).values({ ...mouvement, points, date: maintenant });
  }

  /** RG-80 : points accordés une seule fois pour une même action d'un membre sur un contenu
      (reproduction déclarée, reproduction réussie reçue), tant qu'ils n'ont pas été annulés. */
  async crediterUneFois(tx: Transaction, mouvement: Mouvement, maintenant = new Date()) {
    if (await this.mouvementEnCours(tx, mouvement)) return;
    await tx.insert(mouvementReputation).values({ ...mouvement, date: maintenant });
  }

  /** RG-82 : mouvement opposé au dernier mouvement non annulé de cette action. */
  async annuler(
    tx: Transaction,
    action: Pick<Mouvement, 'acteurId' | 'contenuId' | 'motif'>,
    maintenant = new Date(),
  ) {
    const initial = await this.mouvementEnCours(tx, action);
    if (!initial) return;
    await tx.insert(mouvementReputation).values({
      beneficiaireId: initial.beneficiaireId,
      points: -initial.points,
      motif: 'ANNULATION',
      contenuId: action.contenuId,
      acteurId: action.acteurId,
      mouvementAnnuleId: initial.id,
      date: maintenant,
    });
  }

  /** RG-19, RG-82 : annule, action par action, les mouvements encore en cours nés de ces contenus
      (création supprimée ou masquée, avec ses commentaires et ses reproductions). Les ajustements
      de la modération restent. */
  async annulerContenus(tx: Transaction, contenuIds: number[], maintenant = new Date()) {
    if (!contenuIds.length) return;
    const annulation = alias(mouvementReputation, 'annulation');
    const actions = await tx
      .selectDistinct({
        acteurId: mouvementReputation.acteurId,
        contenuId: mouvementReputation.contenuId,
        motif: mouvementReputation.motif,
      })
      .from(mouvementReputation)
      .leftJoin(annulation, eq(annulation.mouvementAnnuleId, mouvementReputation.id))
      .where(
        and(
          inArray(mouvementReputation.contenuId, contenuIds),
          isNotNull(mouvementReputation.acteurId),
          notInArray(mouvementReputation.motif, ['ANNULATION', 'AJUSTEMENT_MODERATION']),
          isNull(annulation.id),
        ),
      );
    for (const { acteurId, contenuId, motif } of actions)
      if (acteurId !== null && contenuId !== null)
        await this.annuler(tx, { acteurId, contenuId, motif }, maintenant);
  }

  /** RG-82 : un contenu rétabli après masquage génère de nouveau les mouvements que le masquage a
      annulés : ceux dont l'annulation porte la date de la décision (annulerContenus reçoit la même),
      sauf pour un contenu supprimé depuis, et sauf les points d'une réponse qui n'est plus la réponse
      acceptée de son sujet (RG-63 : l'auteur du sujet en a choisi une autre entre-temps). Les
      mouvements regénérés gardent leur date d'origine : le plafond du jour (RG-81) et les points de
      la semaine (RG-87) ne s'en trouvent pas faussés. */
  async retablirContenus(tx: Transaction, contenuIds: number[], dateDuMasquage: Date) {
    if (!contenuIds.length) return;
    const initial = alias(mouvementReputation, 'initial');
    const annules = await tx
      .select({
        beneficiaireId: initial.beneficiaireId,
        points: initial.points,
        motif: initial.motif,
        date: initial.date,
        contenuId: initial.contenuId,
        acteurId: initial.acteurId,
      })
      .from(mouvementReputation)
      .innerJoin(initial, eq(initial.id, mouvementReputation.mouvementAnnuleId))
      .innerJoin(contenu, eq(contenu.id, initial.contenuId))
      .where(
        and(
          eq(mouvementReputation.motif, 'ANNULATION'),
          inArray(mouvementReputation.contenuId, contenuIds),
          eq(mouvementReputation.date, dateDuMasquage),
          ne(contenu.statut, 'SUPPRIME'),
          or(
            notInArray(initial.motif, MOTIFS_D_ACCEPTATION),
            sql`exists (select 1 from sujet s where s.message_accepte_id = ${initial.contenuId})`,
          ),
        ),
      );
    if (annules.length) await tx.insert(mouvementReputation).values(annules);
  }

  /** Dernier mouvement de cette action qui n'a pas été annulé. */
  private async mouvementEnCours(
    tx: Transaction,
    action: Pick<Mouvement, 'acteurId' | 'contenuId' | 'motif'>,
  ) {
    const annulation = alias(mouvementReputation, 'annulation');
    const [mouvement] = await tx
      .select({
        id: mouvementReputation.id,
        beneficiaireId: mouvementReputation.beneficiaireId,
        points: mouvementReputation.points,
      })
      .from(mouvementReputation)
      .leftJoin(annulation, eq(annulation.mouvementAnnuleId, mouvementReputation.id))
      .where(
        and(
          eq(mouvementReputation.acteurId, action.acteurId),
          eq(mouvementReputation.contenuId, action.contenuId),
          eq(mouvementReputation.motif, action.motif),
          isNull(annulation.id),
        ),
      )
      .orderBy(desc(mouvementReputation.date), desc(mouvementReputation.id))
      .limit(1);
    return mouvement ?? null;
  }
}
