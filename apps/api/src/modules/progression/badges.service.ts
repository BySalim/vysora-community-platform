import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { FileTaches } from '../file/file-taches.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export const TACHE_BADGES = 'badges.attribuer';

/** Contenu visible de tous (RG-30). */
const VISIBLE = sql.raw(`c.statut = 'VISIBLE'`);

/* RG-86 : membres qui remplissent le critère de chaque badge (requête qui rend `id`). Le badge
   Pionnier s'obtient à l'inscription avec un code d'invitation (INV-01). */
const CRITERES: Record<string, SQL> = {
  PREMIERE_CREATION: sql`select c.auteur_id as id from creation cr join contenu c on c.id = cr.id
    where cr.statut_publication = 'PUBLIEE' and ${VISIBLE}`,
  PARCOURS_COMPLET: sql`select c.auteur_id as id from creation cr join contenu c on c.id = cr.id
    where cr.type_creation = 'PROJET' and cr.statut_publication = 'PUBLIEE' and ${VISIBLE}
      and (select count(*) from etape e where e.creation_id = cr.id) >= 3
      and exists (select 1 from moment_cle m join etape e on e.id = m.etape_id
        where e.creation_id = cr.id)`,
  REPRODUCTIBLE: sql`select c.auteur_id as id from creation cr join contenu c on c.id = cr.id
    where ${VISIBLE} and (select count(distinct rc.auteur_id) from reproduction r
      join contenu rc on rc.id = r.id
      where r.creation_id = cr.id and r.resultat = 'SUCCES' and rc.statut = 'VISIBLE'
        and rc.auteur_id <> c.auteur_id) >= 5`,
  ASTUCIEUX: sql`select c.auteur_id as id from sujet s join contenu c on c.id = s.id
    where s.type_sujet = 'ASTUCE' and ${VISIBLE} and (select count(*) from vote v
      where v.contenu_id = s.id and v.type_vote_code = 'TESTE_OK') >= 10`,
  PREMIER_ESSAI: sql`select c.auteur_id as id from reproduction r join contenu c on c.id = r.id
    where ${VISIBLE}`,
  BON_REFLEXE: sql`select co.utilisateur_id as id from choix_option co
    join option_reponse o on o.id = co.option_id
    where o.est_correcte group by co.utilisateur_id having count(*) >= 10`,
  ASSIDU: sql`select utilisateur_id as id from choix_option group by utilisateur_id
    having count(*) >= 50`,
  PREMIER_COUP_DE_MAIN: sql`select c.auteur_id as id from sujet s
    join contenu sc on sc.id = s.id join contenu c on c.id = s.message_accepte_id
    where ${VISIBLE} and c.auteur_id <> sc.auteur_id`,
  MENTOR: sql`select c.auteur_id as id from sujet s
    join contenu sc on sc.id = s.id join contenu c on c.id = s.message_accepte_id
    where ${VISIBLE} and c.auteur_id <> sc.auteur_id group by c.auteur_id having count(*) >= 10`,
  VIGILANT: sql`select signaleur_id as id from signalement where statut = 'FONDE'
    group by signaleur_id having count(*) >= 5`,
  PARTICIPANT: sql`select c.auteur_id as id from creation cr join contenu c on c.id = cr.id
    join defi d on d.id = cr.defi_id where d.statut = 'CLOTURE' and ${VISIBLE}`,
  PODIUM: sql`select c.auteur_id as id from creation cr join contenu c on c.id = cr.id
    where cr.rang_final_participation between 1 and 3 and ${VISIBLE}`,
};

/* Badges (S-09, F-74, RG-86) : attribués automatiquement, une seule fois, et conservés même si le
   critère cesse d'être rempli. Une tâche de la file applique les critères toutes les cinq minutes ;
   chaque nouvelle obtention notifie le membre (BADGE_OBTENU). */
@Injectable()
export class BadgesService implements OnModuleInit {
  private readonly journal = new Logger(BadgesService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly file: FileTaches,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.file.declarer({
      nom: TACHE_BADGES,
      planification: '*/5 * * * *',
      executer: async () => {
        const attribues = await this.attribuer();
        if (attribues) this.journal.log({ attribues }, 'Badges attribués');
      },
      reprises: { nombre: 2, delaiSecondes: 60 },
      dureeMaximaleSecondes: 300,
      conservationSecondes: 24 * 3600,
    });
  }

  /** Applique tous les critères ; renvoie le nombre de badges attribués. */
  async attribuer(maintenant = new Date()): Promise<number> {
    let total = 0;
    for (const [code, critere] of Object.entries(CRITERES)) {
      total += await this.db.transaction(async (tx) => {
        const { rows } = await tx.execute<{ utilisateur_id: string }>(sql`
          insert into obtention_badge (utilisateur_id, badge_id, date_obtention)
          select distinct m.id, b.id, ${maintenant}::timestamptz
          from (${critere}) m
          join utilisateur u on u.id = m.id
          join badge b on b.code = ${code} and b.est_actif
          where u.statut_compte not in ('BANNI', 'SUPPRIME')
          on conflict do nothing
          returning utilisateur_id`);
        for (const r of rows)
          await this.notifications.notifier(tx, {
            destinataireId: Number(r.utilisateur_id),
            type: 'BADGE_OBTENU',
            donnees: { badge: code },
            date: maintenant,
          });
        return rows.length;
      });
    }
    return total;
  }
}
