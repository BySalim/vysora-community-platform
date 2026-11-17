import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  slugifier,
  type ActionAudit,
  type DefiAdministreApi,
  type SaisieDefi,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { conflit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { defi, journalAudit } from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PARTICIPATIONS_VISIBLES } from './participation.js';
import { ReputationService } from '../progression/reputation.service.js';

type LigneDefi = {
  id: string;
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string | null;
  definition: string | null;
  cases: DefiAdministreApi['cases'];
  criteres: DefiAdministreApi['criteres'];
  criteres_communs: string[];
  pause_depuis: Date | string | null;
  date_debut: Date | string;
  date_fin: Date | string;
  statut: DefiAdministreApi['statut'];
  participations: number;
};

const iso = (d: Date | string) => new Date(d).toISOString();

/** RG-73 : BROUILLON → PUBLIE → CLOTURE ; BROUILLON ou PUBLIE → ANNULE. Un défi publié se clôture
    dès qu'il a commencé, avant sa fin si l'administration le décide (décision du 2026-11-16). */
function actionsDe(l: LigneDefi, maintenant: Date): DefiAdministreApi['actions'] {
  if (l.statut === 'BROUILLON') return ['publier', 'annuler'];
  if (l.statut === 'ANNULE') return ['retablir'];
  if (l.statut !== 'PUBLIE') return [];
  if (new Date(l.date_debut) > maintenant) return ['ouvrir', 'annuler'];
  // S-17 : un défi en cours se met en pause (plus aucune participation), puis reprend.
  if (new Date(l.date_fin) > maintenant)
    return [l.pause_depuis ? 'reprendre' : 'pause', 'cloturer', 'annuler'];
  return ['cloturer', 'annuler'];
}

/** Champs S-17 d'une saisie de défi, tels que la base les range. */
const champsS17 = (saisie: SaisieDefi) => ({
  definition: saisie.definition,
  cases: saisie.cases,
  criteres: saisie.criteres,
  criteresCommuns: saisie.criteresCommuns,
});

/* Gestion des défis par l'administration (S-07, EC-24, F-63, F-65) : brouillon, publication,
   annulation et clôture. La clôture fige le classement (RG-75 : votes « Utile » reçus pendant la
   période, puis la création publiée la première), crédite les points de participation et du podium
   (RG-80) et prévient chaque participant (RESULTAT_DEFI) ; chaque action est journalisée (ENF-09). */
@Injectable()
export class AdministrationDefisService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
  ) {}

  async liste(maintenant = new Date()): Promise<DefiAdministreApi[]> {
    const { rows } = await this.db.execute<LigneDefi>(sql`
      select d.*, (select count(*) from ${PARTICIPATIONS_VISIBLES} pv
        where pv.defi_id = d.id)::int as participations
      from defi d order by d.date_debut desc, d.id desc`);
    return rows.map((l) => this.presenter(l, maintenant));
  }

  async creer(adminId: number, saisie: SaisieDefi): Promise<DefiAdministreApi> {
    const [cree] = await this.db
      .insert(defi)
      .values({
        organisateurId: adminId,
        titre: saisie.titre,
        slug: slugifier(saisie.titre) || 'defi',
        enonce: saisie.enonce,
        contraintes: saisie.contraintes,
        ...champsS17(saisie),
        dateDebut: saisie.dateDebut,
        dateFin: saisie.dateFin,
      })
      .returning({ id: defi.id });
    await this.auditer(this.db, adminId, 'DEFI_CREE', cree!.id);
    return this.un(cree!.id);
  }

  /** Titre, énoncé, contraintes et dates d'un défi en brouillon ou publié, même commencé : les dates
      se règlent à tout moment (décision du 2026-11-16, qui assouplit RG-73) ; un défi clôturé ou
      annulé ne se modifie plus. La durée reste de 1 à 30 jours (schemaDefi, contrainte de la base). */
  async modifier(adminId: number, id: number, saisie: SaisieDefi): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (ligne.statut === 'CLOTURE' || ligne.statut === 'ANNULE')
        throw conflit('Un défi clôturé ou annulé ne se modifie plus.');
      await tx
        .update(defi)
        .set({
          titre: saisie.titre,
          enonce: saisie.enonce,
          contraintes: saisie.contraintes,
          ...champsS17(saisie),
          dateDebut: saisie.dateDebut,
          dateFin: saisie.dateFin,
        })
        .where(eq(defi.id, id));
      await this.auditer(tx, adminId, 'DEFI_MODIFIE', id);
    });
    return this.un(id);
  }

  /** S-17 : un brouillon se supprime (jamais un défi publié : on l'annule). */
  async supprimer(adminId: number, id: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (ligne.statut !== 'BROUILLON')
        throw conflit('Seul un brouillon se supprime ; un défi publié s’annule.');
      // Une création peut avoir été rattachée au brouillon depuis l'éditeur : elle s'en détache.
      await tx.execute(sql`update creation set defi_id = null where defi_id = ${id}`);
      await tx.delete(defi).where(eq(defi.id, id));
      await this.auditer(tx, adminId, 'DEFI_SUPPRIME', id, { titre: ligne.titre });
    });
  }

  async publier(adminId: number, id: number): Promise<DefiAdministreApi> {
    return this.changer(adminId, id, 'publier', 'PUBLIE', 'DEFI_PUBLIE');
  }

  async annuler(adminId: number, id: number): Promise<DefiAdministreApi> {
    return this.changer(adminId, id, 'annuler', 'ANNULE', 'DEFI_ANNULE');
  }

  /** S-17 : un défi annulé redevient publié ; selon ses dates, il est à venir, en cours ou terminé. */
  async retablir(adminId: number, id: number): Promise<DefiAdministreApi> {
    return this.changer(adminId, id, 'retablir', 'PUBLIE', 'DEFI_RETABLI');
  }

  /** S-17 : mettre en pause un défi en cours (plus aucune participation publiée ni inscrite ; les
      votes et le compte à rebours continuent), puis reprendre. */
  async pause(
    adminId: number,
    id: number,
    reprendre: boolean,
    maintenant = new Date(),
  ): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, maintenant).includes(reprendre ? 'reprendre' : 'pause'))
        throw conflit(
          reprendre
            ? 'Ce défi n’est pas en pause.'
            : 'Seul un défi en cours, qui n’est pas déjà en pause, se met en pause.',
        );
      await tx
        .update(defi)
        .set({ pauseDepuis: reprendre ? null : maintenant })
        .where(eq(defi.id, id));
      await this.auditer(tx, adminId, reprendre ? 'DEFI_REPRIS' : 'DEFI_PAUSE', id);
    });
    return this.un(id);
  }

  /** S-17 : ouvrir maintenant un défi publié à venir ; sa fin reste la même (1 à 30 jours). */
  async ouvrir(adminId: number, id: number, maintenant = new Date()): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, maintenant).includes('ouvrir'))
        throw conflit('Seul un défi publié qui n’a pas commencé s’ouvre avant la date prévue.');
      const jours = (new Date(ligne.date_fin).getTime() - maintenant.getTime()) / 86_400_000;
      if (jours > 30)
        throw conflit(
          'Ouvert maintenant, le défi durerait plus de 30 jours : avancez d’abord sa fin.',
        );
      if (jours < 1)
        throw conflit(
          'Ouvert maintenant, le défi durerait moins d’un jour : repoussez d’abord sa fin.',
        );
      await tx.update(defi).set({ dateDebut: maintenant }).where(eq(defi.id, id));
      await this.auditer(tx, adminId, 'DEFI_OUVERT', id);
    });
    return this.un(id);
  }

  /** F-65 : classement figé, points et notifications, en une transaction. */
  async cloturer(adminId: number, id: number, maintenant = new Date()): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, maintenant).includes('cloturer'))
        throw conflit('Ce défi se clôture une fois publié et commencé.');
      // S-17 : participations et, pour les défis d'avant, créations inscrites, classées ensemble.
      const { rows } = await tx.execute<{ id: string; auteur_id: string; nature: string }>(sql`
        select pv.id, pv.auteur_id, pv.nature from ${PARTICIPATIONS_VISIBLES} pv
        join defi d on d.id = pv.defi_id
        where pv.defi_id = ${id}
        order by (select count(*) from vote v where v.contenu_id = pv.id
            and v.type_vote_code = 'UTILE' and v.date_vote >= d.date_debut
            and v.date_vote <= least(d.date_fin, ${maintenant.toISOString()}::timestamptz)) desc,
          pv.date_publication asc, pv.id asc`);
      for (const [i, r] of rows.entries()) {
        const rang = i + 1;
        const creationId = Number(r.id);
        const auteurId = Number(r.auteur_id);
        await tx.execute(
          r.nature === 'PARTICIPATION'
            ? sql`update participation set rang_final = ${rang} where id = ${creationId}`
            : sql`update creation set rang_final_participation = ${rang} where id = ${creationId}`,
        );
        let points = await this.reputation.crediterUneFois(
          tx,
          {
            beneficiaireId: auteurId,
            acteurId: adminId,
            contenuId: creationId,
            motif: 'PARTICIPATION_DEFI',
            points: BAREME_REPUTATION.participationDefi,
          },
          maintenant,
        );
        const podium = BAREME_REPUTATION.podiumDefi[i];
        if (podium)
          points += await this.reputation.crediterUneFois(
            tx,
            {
              beneficiaireId: auteurId,
              acteurId: adminId,
              contenuId: creationId,
              motif: 'PODIUM_DEFI',
              points: podium,
            },
            maintenant,
          );
        await this.notifications.notifier(tx, {
          destinataireId: auteurId,
          type: 'RESULTAT_DEFI',
          contenuId: creationId,
          donnees: { defiId: id, rang, participants: rows.length, points },
          date: maintenant,
        });
      }
      // Clôturé avant sa fin : la fin devient l'instant de la clôture, si la durée minimale le permet.
      const instant = maintenant.toISOString();
      await tx.execute(sql`update defi set statut = 'CLOTURE', pause_depuis = null,
        date_fin = case when ${instant}::timestamptz < date_fin
            and ${instant}::timestamptz - date_debut >= interval '1 day'
          then ${instant}::timestamptz else date_fin end
        where id = ${id}`);
      await this.auditer(tx, adminId, 'DEFI_CLOTURE', id, { participants: rows.length });
    });
    return this.un(id);
  }

  private async changer(
    adminId: number,
    id: number,
    action: 'publier' | 'annuler' | 'retablir',
    statut: 'PUBLIE' | 'ANNULE',
    trace: ActionAudit,
  ): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, new Date()).includes(action))
        throw conflit(
          action === 'publier'
            ? 'Seul un défi en brouillon se publie.'
            : action === 'retablir'
              ? 'Seul un défi annulé se rétablit.'
              : 'Un défi clôturé ou déjà annulé ne s’annule plus.',
        );
      await tx.execute(sql`update defi set statut = ${statut} where id = ${id}`);
      await this.auditer(tx, adminId, trace, id);
    });
    return this.un(id);
  }

  private async verrouiller(tx: Transaction, id: number) {
    const { rows } = await tx.execute<LigneDefi>(
      sql`select d.*, 0 as participations from defi d where d.id = ${id} for update`,
    );
    if (!rows[0]) throw introuvable('Ce défi est introuvable.');
    return rows[0];
  }

  private async un(id: number): Promise<DefiAdministreApi> {
    const defiTrouve = (await this.liste()).find((d) => d.id === id);
    if (!defiTrouve) throw introuvable('Ce défi est introuvable.');
    return defiTrouve;
  }

  private presenter(l: LigneDefi, maintenant: Date): DefiAdministreApi {
    return {
      id: Number(l.id),
      slug: l.slug,
      titre: l.titre,
      enonce: l.enonce,
      contraintes: l.contraintes,
      definition: l.definition,
      cases: l.cases ?? [],
      criteres: l.criteres ?? [],
      criteresCommuns: l.criteres_communs ?? [],
      pauseDepuis: l.pause_depuis ? iso(l.pause_depuis) : null,
      dateDebut: iso(l.date_debut),
      dateFin: iso(l.date_fin),
      statut: l.statut,
      participations: l.participations,
      actions: actionsDe(l, maintenant),
    };
  }

  private async auditer(
    db: Pick<BaseDeDonnees, 'insert'>,
    acteurId: number,
    action: ActionAudit,
    cibleId: number,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db
      .insert(journalAudit)
      .values({ acteurId, action, cibleType: 'defi', cibleId, details: details ?? null });
  }
}
