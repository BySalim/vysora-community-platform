import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  OBJECTIFS_BADGES,
  prochainsBadges,
  type CodeBadgeAvancement,
  type ProchainBadgeApi,
  type TonBadge,
} from '@vysora/shared';
import { sql, type SQL } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { FileTaches } from '../file/file-taches.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export const TACHE_BADGES = 'badges.attribuer';

/** Contenu visible de tous (RG-30). */
const VISIBLE = sql.raw(`c.statut = 'VISIBLE'`);

/** Réponses acceptées d'un membre dans le sujet d'un autre. */
const REPONSES_ACCEPTEES = sql`select c.auteur_id as id, count(*) as valeur from sujet s
  join contenu sc on sc.id = s.id join contenu c on c.id = s.message_accepte_id
  where ${VISIBLE} and c.auteur_id <> sc.auteur_id group by c.auteur_id`;

/* RG-86 : où en est chaque membre pour chaque badge (requête qui rend `id` et `valeur`, une ligne par
   membre), comparé à l'objectif du badge (OBJECTIFS_BADGES) : la même mesure attribue le badge et
   montre l'avancement à son propriétaire (PROF-02). Le badge Pionnier s'obtient à l'inscription avec
   un code d'invitation (INV-01). */
const MESURES: Record<CodeBadgeAvancement, SQL> = {
  PREMIERE_CREATION: sql`select c.auteur_id as id, count(*) as valeur
    from creation cr join contenu c on c.id = cr.id
    where cr.statut_publication = 'PUBLIEE' and ${VISIBLE} group by c.auteur_id`,
  PARCOURS_COMPLET: sql`select c.auteur_id as id, count(*) as valeur
    from creation cr join contenu c on c.id = cr.id
    where cr.type_creation = 'PROJET' and cr.statut_publication = 'PUBLIEE' and ${VISIBLE}
      and (select count(*) from etape e where e.creation_id = cr.id) >= 3
      and exists (select 1 from moment_cle m join etape e on e.id = m.etape_id
        where e.creation_id = cr.id)
    group by c.auteur_id`,
  // Membres qui ont réussi la création la plus reproduite.
  REPRODUCTIBLE: sql`select x.id, max(x.n) as valeur from (
      select c.auteur_id as id, count(distinct rc.auteur_id) as n
      from creation cr join contenu c on c.id = cr.id
      join reproduction r on r.creation_id = cr.id and r.resultat = 'SUCCES'
      join contenu rc on rc.id = r.id and rc.statut = 'VISIBLE' and rc.auteur_id <> c.auteur_id
      where ${VISIBLE} group by cr.id, c.auteur_id) x
    group by x.id`,
  // Votes « Testé, ça marche » de l'astuce la mieux notée.
  ASTUCIEUX: sql`select x.id, max(x.n) as valeur from (
      select c.auteur_id as id, count(*) as n
      from sujet s join contenu c on c.id = s.id
      join vote v on v.contenu_id = s.id and v.type_vote_code = 'TESTE_OK'
      where s.type_sujet = 'ASTUCE' and ${VISIBLE} group by s.id, c.auteur_id) x
    group by x.id`,
  PREMIER_ESSAI: sql`select c.auteur_id as id, count(*) as valeur
    from reproduction r join contenu c on c.id = r.id where ${VISIBLE} group by c.auteur_id`,
  BON_REFLEXE: sql`select co.utilisateur_id as id, count(*) as valeur from choix_option co
    join option_reponse o on o.id = co.option_id
    where o.est_correcte group by co.utilisateur_id`,
  ASSIDU: sql`select utilisateur_id as id, count(*) as valeur from choix_option
    group by utilisateur_id`,
  PREMIER_COUP_DE_MAIN: REPONSES_ACCEPTEES,
  MENTOR: REPONSES_ACCEPTEES,
  VIGILANT: sql`select signaleur_id as id, count(*) as valeur from signalement
    where statut = 'FONDE' group by signaleur_id`,
  PARTICIPANT: sql`select c.auteur_id as id, count(distinct d.id) as valeur
    from creation cr join contenu c on c.id = cr.id join defi d on d.id = cr.defi_id
    where d.statut = 'CLOTURE' and cr.statut_publication = 'PUBLIEE' and ${VISIBLE}
    group by c.auteur_id`,
  PODIUM: sql`select c.auteur_id as id, count(*) as valeur
    from creation cr join contenu c on c.id = cr.id
    where cr.rang_final_participation between 1 and 3 and ${VISIBLE} group by c.auteur_id`,
};

/* Badges (S-09, F-74, RG-86) : attribués automatiquement, une seule fois, et conservés même si le
   critère cesse d'être rempli. Une tâche de la file applique les critères toutes les cinq minutes ;
   chaque nouvelle obtention notifie le membre (BADGE_OBTENU). Le profil montre à son propriétaire
   les prochains badges à sa portée (PROF-02). */
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
    for (const [code, mesure] of Object.entries(MESURES)) {
      const { objectif } = OBJECTIFS_BADGES[code as CodeBadgeAvancement];
      total += await this.db.transaction(async (tx) => {
        const { rows } = await tx.execute<{ utilisateur_id: string }>(sql`
          insert into obtention_badge (utilisateur_id, badge_id, date_obtention)
          select m.id, b.id, ${maintenant}::timestamptz
          from (${mesure}) m
          join utilisateur u on u.id = m.id
          join badge b on b.code = ${code} and b.est_actif
          where m.valeur >= ${objectif} and u.statut_compte not in ('BANNI', 'SUPPRIME')
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

  /** PROF-02 : avancement d'un membre vers les badges actifs qu'il n'a pas encore, les plus avancés
      d'abord. Un objectif atteint s'affiche atteint jusqu'au passage de l'attribution. */
  async prochains(id: number): Promise<ProchainBadgeApi[]> {
    const mesures = Object.entries(MESURES).map(
      ([code, mesure]) => sql`select ${code}::text as code,
        coalesce((select m.valeur from (${mesure}) m where m.id = ${id}), 0)::int as valeur`,
    );
    const { rows } = await this.db.execute<{
      code: CodeBadgeAvancement;
      libelle: string;
      critere: string;
      icone: string;
      ton: TonBadge;
      valeur: number;
    }>(sql`
      select b.code, b.libelle, b.critere, b.icone, b.ton, a.valeur
      from (${sql.join(mesures, sql` union all `)}) a
      join badge b on b.code = a.code and b.est_actif
      where not exists (select 1 from obtention_badge ob
        where ob.badge_id = b.id and ob.utilisateur_id = ${id})
      order by b.id`);
    return prochainsBadges(
      rows.map((r) => {
        const { objectif, unite } = OBJECTIFS_BADGES[r.code];
        return { ...r, valeur: Math.min(r.valeur, objectif), objectif, unite };
      }),
    );
  }
}
