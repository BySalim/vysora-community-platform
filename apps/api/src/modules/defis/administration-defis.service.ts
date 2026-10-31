import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  slugifier,
  type DefiAdministreApi,
  type SaisieDefi,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { conflit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { defi, journalAudit } from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReputationService } from '../progression/reputation.service.js';

type LigneDefi = {
  id: string;
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string | null;
  date_debut: Date | string;
  date_fin: Date | string;
  statut: DefiAdministreApi['statut'];
  participations: number;
};

const iso = (d: Date | string) => new Date(d).toISOString();

/** RG-73 : BROUILLON → PUBLIE → CLOTURE ; BROUILLON ou PUBLIE → ANNULE. La clôture attend la fin. */
function actionsDe(l: LigneDefi, maintenant: Date): DefiAdministreApi['actions'] {
  if (l.statut === 'BROUILLON') return ['publier', 'annuler'];
  if (l.statut === 'PUBLIE')
    return new Date(l.date_fin) <= maintenant ? ['cloturer', 'annuler'] : ['annuler'];
  return [];
}

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
      select d.*, (select count(*) from creation cr join contenu c on c.id = cr.id
        where cr.defi_id = d.id and c.statut = 'VISIBLE'
          and cr.statut_publication = 'PUBLIEE')::int as participations
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
        dateDebut: saisie.dateDebut,
        dateFin: saisie.dateFin,
      })
      .returning({ id: defi.id });
    await this.auditer(this.db, adminId, 'DEFI_CREE', cree!.id);
    return this.un(cree!.id);
  }

  async publier(adminId: number, id: number): Promise<DefiAdministreApi> {
    return this.changer(adminId, id, 'publier', 'PUBLIE', 'DEFI_PUBLIE');
  }

  async annuler(adminId: number, id: number): Promise<DefiAdministreApi> {
    return this.changer(adminId, id, 'annuler', 'ANNULE', 'DEFI_ANNULE');
  }

  /** F-65 : classement figé, points et notifications, en une transaction. */
  async cloturer(adminId: number, id: number, maintenant = new Date()): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, maintenant).includes('cloturer'))
        throw conflit('Ce défi se clôture une fois publié et sa date de fin passée.');
      const { rows } = await tx.execute<{ id: string; auteur_id: string }>(sql`
        select cr.id, c.auteur_id from creation cr
        join contenu c on c.id = cr.id
        join defi d on d.id = cr.defi_id
        where cr.defi_id = ${id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
        order by (select count(*) from vote v where v.contenu_id = cr.id
            and v.type_vote_code = 'UTILE' and v.date_vote >= d.date_debut
            and v.date_vote <= d.date_fin) desc,
          cr.date_publication asc, cr.id asc`);
      for (const [i, r] of rows.entries()) {
        const rang = i + 1;
        const creationId = Number(r.id);
        const auteurId = Number(r.auteur_id);
        await tx.execute(
          sql`update creation set rang_final_participation = ${rang} where id = ${creationId}`,
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
      await tx.execute(sql`update defi set statut = 'CLOTURE' where id = ${id}`);
      await this.auditer(tx, adminId, 'DEFI_CLOTURE', id, { participants: rows.length });
    });
    return this.un(id);
  }

  private async changer(
    adminId: number,
    id: number,
    action: 'publier' | 'annuler',
    statut: 'PUBLIE' | 'ANNULE',
    trace: string,
  ): Promise<DefiAdministreApi> {
    await this.db.transaction(async (tx) => {
      const ligne = await this.verrouiller(tx, id);
      if (!actionsDe(ligne, new Date()).includes(action))
        throw conflit(
          action === 'publier'
            ? 'Seul un défi en brouillon se publie.'
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
    action: string,
    cibleId: number,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db
      .insert(journalAudit)
      .values({ acteurId, action, cibleType: 'defi', cibleId, details: details ?? null });
  }
}
