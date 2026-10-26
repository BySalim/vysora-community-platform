import { Injectable } from '@nestjs/common';
import {
  SEUILS,
  niveauPourReputation,
  type CodeNiveau,
  type MotifMouvementReputation,
} from '@vysora/shared';
import { and, desc, eq, gte, inArray, isNotNull, isNull, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Transaction } from '../../db/client.js';
import { mouvementReputation, niveau, utilisateur } from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** Motifs plafonnés par jour (RG-81). */
const MOTIFS_DE_VOTE: MotifMouvementReputation[] = ['VOTE_UTILE_RECU', 'VOTE_TESTE_RECU'];

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
   (RG-81), annulations (RG-82), notification du niveau atteint (F-71, RG-91). La réputation reste
   calculée (somme des mouvements, RG-83). Chaque méthode s'exécute dans la transaction de l'action
   qui la déclenche. */
@Injectable()
export class ReputationService {
  constructor(private readonly notifications: NotificationsService) {}

  /** RG-80, RG-81 : crédite un vote reçu, dans la limite de 200 points de votes par jour.
      Renvoie les points accordés (0 une fois le plafond atteint). */
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
    if (points > 0) await this.inscrire(tx, { ...mouvement, points }, maintenant);
    return points;
  }

  /** RG-80 : points accordés une seule fois pour une même action d'un membre sur un contenu
      (reproduction déclarée, reproduction réussie reçue), tant qu'ils n'ont pas été annulés.
      Renvoie les points accordés (0 s'ils l'avaient déjà été). */
  async crediterUneFois(tx: Transaction, mouvement: Mouvement, maintenant = new Date()) {
    if (await this.mouvementEnCours(tx, mouvement)) return 0;
    await this.inscrire(tx, mouvement, maintenant);
    return mouvement.points;
  }

  /** RG-82 : mouvement opposé au dernier mouvement non annulé de cette action. Renvoie les points
      retirés au bénéficiaire (0 s'il n'y avait rien à annuler). */
  async annuler(
    tx: Transaction,
    action: Pick<Mouvement, 'acteurId' | 'contenuId' | 'motif'>,
    maintenant = new Date(),
  ) {
    const initial = await this.mouvementEnCours(tx, action);
    if (!initial) return 0;
    await tx.insert(mouvementReputation).values({
      beneficiaireId: initial.beneficiaireId,
      points: -initial.points,
      motif: 'ANNULATION',
      contenuId: action.contenuId,
      acteurId: action.acteurId,
      mouvementAnnuleId: initial.id,
      date: maintenant,
    });
    return initial.points;
  }

  /** RG-19, RG-82 : annule, action par action, les mouvements encore en cours nés de ces contenus
      (création supprimée, avec ses commentaires et ses reproductions). Les ajustements de la
      modération restent. */
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

  /** Mouvement positif ; le bénéficiaire qui passe un palier en est notifié (F-71). */
  private async inscrire(tx: Transaction, mouvement: Mouvement, maintenant: Date) {
    const [avant] = await tx
      .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
      .from(mouvementReputation)
      .where(eq(mouvementReputation.beneficiaireId, mouvement.beneficiaireId));
    await tx.insert(mouvementReputation).values({ ...mouvement, date: maintenant });
    const niveaux = (await tx.select().from(niveau)).map((n) => ({
      ...n,
      code: n.code as CodeNiveau,
    }));
    const ancien = niveauPourReputation(avant?.points ?? 0, niveaux);
    const nouveau = niveauPourReputation((avant?.points ?? 0) + mouvement.points, niveaux);
    if (nouveau.rang > ancien.rang)
      await this.notifications.niveauAtteint(
        tx,
        mouvement.beneficiaireId,
        nouveau.code,
        maintenant,
      );
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
