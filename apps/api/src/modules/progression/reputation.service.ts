import { Injectable } from '@nestjs/common';
import {
  SEUILS,
  niveauPourReputation,
  type CodeNiveau,
  type MotifMouvementReputation,
} from '@vysora/shared';
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
import { contenu, mouvementReputation, niveau, utilisateur } from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';

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
      sauf pour un contenu supprimé depuis, sauf les points d'une réponse qui n'est plus la réponse
      acceptée de son sujet (RG-63 : l'auteur du sujet en a choisi une autre entre-temps), et sauf
      ceux de la validation d'un cas qui n'est plus validé (RG-71 : modifié ou refusé depuis). Les
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
          // RG-71 : les points d'un cas validé ne reviennent pas s'il a été refusé entre-temps.
          or(
            ne(initial.motif, 'CAS_VALIDE'),
            sql`exists (select 1 from cas_bon_reflexe cb
              where cb.id = ${initial.contenuId} and cb.statut_validation = 'VALIDE')`,
          ),
        ),
      );
    if (annules.length) await tx.insert(mouvementReputation).values(annules);
  }

  /** RG-102, CI-24 : ajustement de la réputation par un administrateur (fraude avérée), justifié
      par sa décision : ni contenu d'origine, ni plafond. Un ajustement qui fait passer un palier
      est notifié comme les autres points (F-71). */
  async ajuster(
    tx: Transaction,
    ajustement: { beneficiaireId: number; acteurId: number; decisionId: number; points: number },
    maintenant = new Date(),
  ) {
    await this.inscrire(tx, { ...ajustement, motif: 'AJUSTEMENT_MODERATION' }, maintenant);
  }

  /** Nouveau mouvement ; le bénéficiaire qui passe un palier en est notifié (F-71). */
  private async inscrire(
    tx: Transaction,
    mouvement: Omit<typeof mouvementReputation.$inferInsert, 'id' | 'date'>,
    maintenant: Date,
  ) {
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
