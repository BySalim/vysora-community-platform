import { Inject, Injectable } from '@nestjs/common';
import {
  lireClinique,
  lireMessage,
  type AccueilApi,
  type ActiviteRecenteApi,
  type ApprentissageAccueilApi,
  type AstuceAccueilApi,
  type ChiffresAccueilApi,
  type ClassementSemaineApi,
  type CliniqueAccueilApi,
  type DefiAccueilApi,
  type DomaineAccueilApi,
  type MembreResumeApi,
  type OutilResumeApi,
  type SujetEnAttenteApi,
  type TypeCreation,
  type TypeSujet,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { CasService } from '../apprentissage/cas.service.js';
import { apercusDesCreations } from '../creations/apercus.js';
import type { Lecteur } from '../creations/creations.service.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { activiteRecente } from './activite.js';
import { creationsDeLAccueil } from './cartes.js';
import { JOUR_MS, joursDeLaCourbe, lundiUtc, reglesDuDefi } from './periodes.js';

/** Colonnes de l'outil et du modèle d'un sujet (alias « o » et « m »). */
const OUTIL_MODELE = sql`o.id as outil_id, o.nom as outil_nom, o.slug as outil_slug,
  o.logo as outil_logo, o.logo_monochrome as outil_mono,
  coalesce(m.nom_court, s.modele_non_reference) as modele`;

type LigneOutil = {
  outil_id: string | null;
  outil_nom: string | null;
  outil_slug: string | null;
  outil_logo: string | null;
  outil_mono: boolean | null;
  modele: string | null;
};

const outilDe = (l: LigneOutil): OutilResumeApi | null =>
  l.outil_id && l.outil_nom && l.outil_slug
    ? {
        id: Number(l.outil_id),
        nom: l.outil_nom,
        slug: l.outil_slug,
        logo: l.outil_logo,
        logoMonochrome: l.outil_mono ?? false,
      }
    : null;

/* ACC-01 : accueil (F-21, EC-01). Tout est calculé sur les contenus visibles de tous (RG-30) ; un
   membre reçoit en plus un cas Bon réflexe auquel il n'a pas encore répondu (F-21). Les chiffres de
   la semaine et du jour se comptent en temps universel (RG-87). */
@Injectable()
export class AccueilService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly casBonReflexe: CasService,
  ) {}

  async accueil(lecteur: Lecteur | null, maintenant = new Date()): Promise<AccueilApi> {
    const [
      creations,
      domaines,
      chiffres,
      activite,
      apprentissage,
      enAttente,
      astuce,
      classement,
      bonReflexe,
      clinique,
      defi,
    ] = await Promise.all([
      creationsDeLAccueil(this.db, this.stockage, maintenant),
      this.domaines(),
      this.chiffres(),
      activiteRecente(this.db, this.stockage),
      this.apprentissage(maintenant),
      this.enAttente(),
      this.astuce(maintenant),
      this.classement(maintenant),
      this.bonReflexe(lecteur, maintenant),
      this.clinique(),
      this.defi(maintenant),
    ]);
    return {
      creations,
      domaines,
      chiffres,
      activite,
      apprentissage,
      enAttente,
      astuce,
      classement,
      bonReflexe,
      clinique,
      defi,
      maintenant: maintenant.toISOString(),
    };
  }

  async activite(): Promise<ActiviteRecenteApi> {
    return { elements: await activiteRecente(this.db, this.stockage) };
  }

  private async membres(ids: Iterable<number>): Promise<(id: number) => MembreResumeApi> {
    const resumes = await resumerMembres(this.db, this.stockage, ids);
    return (id) => {
      const membre = resumes.get(id);
      if (!membre) throw new Error(`Membre introuvable : ${id}`);
      return membre;
    };
  }

  /** « Parcourir par domaine » : catégories actives et leurs créations publiées et visibles. */
  private async domaines(): Promise<DomaineAccueilApi[]> {
    const { rows } = await this.db.execute<DomaineAccueilApi & Record<string, unknown>>(sql`
      select cat.libelle, cat.slug, cat.icone, count(c.id)::int as creations
      from categorie cat
      left join creation cr on cr.categorie_id = cat.id and cr.statut_publication = 'PUBLIEE'
      left join contenu c on c.id = cr.id and c.statut = 'VISIBLE'
      where cat.est_active
      group by cat.id
      order by cat.ordre_affichage, cat.id`);
    return rows;
  }

  /** La communauté en chiffres. */
  private async chiffres(): Promise<ChiffresAccueilApi> {
    const { rows } = await this.db.execute<ChiffresAccueilApi & Record<string, unknown>>(sql`
      select
        (select count(*) from creation cr join contenu c on c.id = cr.id
          where c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE')::int as creations,
        (select count(*) from reproduction r
          join contenu rc on rc.id = r.id
          join contenu c on c.id = r.creation_id
          join creation cr on cr.id = r.creation_id
          where rc.statut = 'VISIBLE' and c.statut = 'VISIBLE'
            and cr.statut_publication = 'PUBLIEE')::int as reproductions,
        (select count(*) from sujet s
          join contenu c on c.id = s.id
          join contenu mc on mc.id = s.message_accepte_id
          where c.statut = 'VISIBLE' and mc.statut = 'VISIBLE')::int as "questionsResolues"`);
    return rows[0] ?? { creations: 0, reproductions: 0, questionsResolues: 0 };
  }

  /** « Interactions d'apprentissage » par jour (UTC) et répartition depuis lundi. */
  private async apprentissage(maintenant: Date): Promise<ApprentissageAccueilApi> {
    const jours = joursDeLaCourbe(maintenant);
    const debut = new Date(`${jours[0]}T00:00:00Z`);
    const { rows } = await this.db.execute<{ genre: string; jour: string; nombre: number }>(sql`
      select genre, to_char(jour, 'YYYY-MM-DD') as jour, count(*)::int as nombre from (
        select 'votes' as genre, (v.date_vote at time zone 'UTC')::date as jour
        from vote v where v.date_vote >= ${debut}
        union all
        select 'reproductions', (c.date_creation at time zone 'UTC')::date
        from reproduction r join contenu c on c.id = r.id
        where c.statut = 'VISIBLE' and c.date_creation >= ${debut}
        union all
        select 'casReussis', (co.date_choix at time zone 'UTC')::date
        from choix_option co join option_reponse o on o.id = co.option_id
        where o.est_correcte and co.date_choix >= ${debut}
        union all
        select 'reponsesAcceptees', (s.date_acceptation_reponse at time zone 'UTC')::date
        from sujet s where s.date_acceptation_reponse >= ${debut}
      ) i
      group by genre, jour`);
    const parJour = jours.map((jour) =>
      rows.filter((r) => r.jour === jour).reduce((n, r) => n + r.nombre, 0),
    );
    const lundi = lundiUtc(maintenant).toISOString().slice(0, 10);
    const depuisLundi = (genre: string) =>
      rows.filter((r) => r.genre === genre && r.jour >= lundi).reduce((n, r) => n + r.nombre, 0);
    return {
      debut: jours[0] ?? lundi,
      parJour,
      semaine: {
        votes: depuisLundi('votes'),
        reproductions: depuisLundi('reproductions'),
        casReussis: depuisLundi('casReussis'),
        reponsesAcceptees: depuisLundi('reponsesAcceptees'),
      },
    };
  }

  /** Questions et cliniques ouvertes sans réponse d'un autre membre (`enAttente` du forum). */
  private async enAttente(): Promise<SujetEnAttenteApi[]> {
    const { rows } = await this.db.execute<
      LigneOutil & {
        id: string;
        slug: string;
        type: TypeSujet;
        titre: string;
        auteur_id: string;
        date: Date | string;
      }
    >(sql`
      select s.id, s.slug, s.type_sujet as type, s.titre, c.auteur_id, c.date_creation as date,
        ${OUTIL_MODELE}
      from sujet s
      join contenu c on c.id = s.id
      left join outil o on o.id = s.outil_id
      left join modele m on m.id = s.modele_id
      where c.statut = 'VISIBLE' and s.type_sujet in ('QUESTION', 'CLINIQUE')
        and s.date_fermeture is null and s.message_accepte_id is null
        and not exists (select 1 from message mm join contenu mc on mc.id = mm.id
          where mm.sujet_id = s.id and mc.statut = 'VISIBLE' and mc.auteur_id <> c.auteur_id)
      order by c.date_creation desc, s.id desc
      limit 3`);
    const membre = await this.membres(rows.map((r) => Number(r.auteur_id)));
    return rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      type: r.type,
      titre: r.titre,
      auteur: membre(Number(r.auteur_id)),
      date: new Date(r.date).toISOString(),
      outil: outilDe(r),
      modele: r.modele,
    }));
  }

  /** « Astuce de la semaine » : la plus testée ces 7 derniers jours, à défaut en tout. */
  private async astuce(maintenant: Date): Promise<AstuceAccueilApi | null> {
    const semaine = new Date(maintenant.getTime() - 7 * JOUR_MS);
    const { rows } = await this.db.execute<
      LigneOutil & {
        id: string;
        slug: string;
        titre: string;
        exemple_avant: string;
        exemple_apres: string;
        auteur_id: string;
        testes: number;
      }
    >(sql`
      select s.id, s.slug, s.titre, s.exemple_avant, s.exemple_apres, c.auteur_id,
        (select count(*) from vote v where v.contenu_id = s.id
          and v.type_vote_code = 'TESTE_OK')::int as testes,
        ${OUTIL_MODELE}
      from sujet s
      join contenu c on c.id = s.id
      left join outil o on o.id = s.outil_id
      left join modele m on m.id = s.modele_id
      where c.statut = 'VISIBLE' and s.type_sujet = 'ASTUCE'
      order by (select count(*) from vote v where v.contenu_id = s.id
          and v.type_vote_code = 'TESTE_OK' and v.date_vote > ${semaine}) desc,
        testes desc, c.date_creation desc, s.id desc
      limit 1`);
    const ligne = rows[0];
    if (!ligne) return null;
    const membre = await this.membres([Number(ligne.auteur_id)]);
    return {
      id: Number(ligne.id),
      slug: ligne.slug,
      titre: ligne.titre,
      exempleAvant: ligne.exemple_avant,
      exempleApres: ligne.exemple_apres,
      auteur: membre(Number(ligne.auteur_id)),
      outil: outilDe(ligne),
      modele: ligne.modele,
      testes: ligne.testes,
    };
  }

  /** RG-87 : points gagnés depuis lundi 00:00 (UTC) ; membres actifs seulement (ni suspendus, ni
      bannis, ni en cours de suppression), cinq premiers. */
  private async classement(maintenant: Date): Promise<ClassementSemaineApi[]> {
    const { rows } = await this.db.execute<{ id: string; points: number }>(sql`
      select mr.beneficiaire_id as id, sum(mr.points)::int as points
      from mouvement_reputation mr
      join utilisateur u on u.id = mr.beneficiaire_id
      where mr.date >= ${lundiUtc(maintenant)} and u.statut_compte = 'ACTIF'
        and not exists (select 1 from decision_moderation d
          where d.membre_vise_id = u.id and d.action = 'SUSPENDRE' and d.date_fin_suspension > ${maintenant})
      group by mr.beneficiaire_id
      having sum(mr.points) > 0
      order by points desc, id asc
      limit 5`);
    const membre = await this.membres(rows.map((r) => Number(r.id)));
    return rows.map((r) => ({ membre: membre(Number(r.id)), points: r.points }));
  }

  /** F-21 : pour un membre, le cas validé le plus récent auquel il n'a pas répondu ; sinon (visiteur,
      ou tous répondus) le cas validé le plus récent. */
  private async bonReflexe(
    lecteur: Lecteur | null,
    maintenant: Date,
  ): Promise<AccueilApi['bonReflexe']> {
    const semaine = new Date(maintenant.getTime() - 7 * JOUR_MS);
    // Un membre voit d'abord les cas qu'il peut encore faire (ni les siens, ni ceux déjà répondus).
    const ordre = lecteur
      ? sql`(c.auteur_id <> ${lecteur.id} and not exists (select 1 from choix_option co
          where co.cas_id = cb.id and co.utilisateur_id = ${lecteur.id})) desc,`
      : sql``;
    const [{ rows: choix }, { rows: semaineRows }] = await Promise.all([
      this.db.execute<{ id: string }>(sql`
        select cb.id from cas_bon_reflexe cb
        join contenu c on c.id = cb.id
        where c.statut = 'VISIBLE' and cb.statut_validation = 'VALIDE'
        order by ${ordre} cb.date_examen desc, cb.id desc
        limit 1`),
      this.db.execute<{ nombre: number }>(
        sql`select count(*)::int as nombre from choix_option where date_choix > ${semaine}`,
      ),
    ]);
    const id = choix[0]?.id;
    return {
      cas: id ? await this.casBonReflexe.cas(Number(id), lecteur) : null,
      reponsesSemaine: semaineRows[0]?.nombre ?? 0,
    };
  }

  /** Clinique résolue la plus récente dont la réponse acceptée propose un prompt (à défaut, la plus
      récente), et délai moyen de résolution. */
  private async clinique(): Promise<AccueilApi['clinique']> {
    const [{ rows }, { rows: moyenne }] = await Promise.all([
      this.db.execute<
        LigneOutil & {
          id: string;
          slug: string;
          titre: string;
          corps: string;
          auteur_id: string;
          minutes: number;
          reponse: string;
          repondant_id: string;
          reponses: number;
        }
      >(sql`
        select s.id, s.slug, s.titre, s.corps, c.auteur_id,
          round(extract(epoch from (s.date_acceptation_reponse - c.date_creation)) / 60)::int
            as minutes,
          mm.corps as reponse, mc.auteur_id as repondant_id,
          (select count(*) from message x join contenu xc on xc.id = x.id
            where x.sujet_id = s.id and xc.statut = 'VISIBLE')::int as reponses,
          ${OUTIL_MODELE}
        from sujet s
        join contenu c on c.id = s.id
        join message mm on mm.id = s.message_accepte_id
        join contenu mc on mc.id = mm.id
        left join outil o on o.id = s.outil_id
        left join modele m on m.id = s.modele_id
        where c.statut = 'VISIBLE' and mc.statut = 'VISIBLE' and s.type_sujet = 'CLINIQUE'
        order by s.date_acceptation_reponse desc, s.id desc
        limit 10`),
      this.db.execute<{ minutes: number | null }>(sql`
        select round(avg(extract(epoch from (s.date_acceptation_reponse - c.date_creation)) / 60))::int
          as minutes
        from sujet s
        join contenu c on c.id = s.id
        join contenu mc on mc.id = s.message_accepte_id
        where c.statut = 'VISIBLE' and mc.statut = 'VISIBLE' and s.type_sujet = 'CLINIQUE'`),
    ]);
    const lues = rows.flatMap((r) => {
      const rubriques = lireClinique(r.corps);
      return rubriques ? [{ r, rubriques, reponse: lireMessage(r.reponse) }] : [];
    });
    const retenue = lues.find((l) => l.reponse.prompt) ?? lues[0];
    let exemple: CliniqueAccueilApi | null = null;
    if (retenue) {
      const { r, rubriques, reponse } = retenue;
      const membre = await this.membres([Number(r.auteur_id), Number(r.repondant_id)]);
      exemple = {
        id: Number(r.id),
        slug: r.slug,
        titre: r.titre,
        auteur: membre(Number(r.auteur_id)),
        outil: outilDe(r),
        modele: r.modele,
        resolueEnMinutes: Math.max(0, r.minutes),
        promptInitial: rubriques.prompt,
        promptPropose: reponse.prompt,
        explication: reponse.texte,
        reponseAcceptee: { auteur: membre(Number(r.repondant_id)) },
        reponses: r.reponses,
      };
    }
    return { exemple, resolutionMoyenneMinutes: moyenne[0]?.minutes ?? null };
  }

  /** F-21 : défi publié dont la période est en cours, avec ses participations visibles. */
  private async defi(maintenant: Date): Promise<DefiAccueilApi | null> {
    const { rows } = await this.db.execute<{
      id: string;
      slug: string;
      titre: string;
      contraintes: string | null;
      date_fin: Date | string;
    }>(sql`
      select id, slug, titre, contraintes, date_fin from defi
      where statut = 'PUBLIE' and date_debut <= ${maintenant} and date_fin > ${maintenant}
      order by date_fin asc, id asc
      limit 1`);
    const ligne = rows[0];
    if (!ligne) return null;
    const { rows: participations } = await this.db.execute<{
      id: string;
      auteur_id: string;
      type: TypeCreation;
      date_publication: Date | string;
      utiles: number;
    }>(sql`
      select c.id, c.auteur_id, cr.type_creation as type, cr.date_publication,
        (select count(*) from vote v where v.contenu_id = c.id and v.type_vote_code = 'UTILE')::int
          as utiles
      from creation cr join contenu c on c.id = cr.id
      where cr.defi_id = ${ligne.id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      order by cr.date_publication desc, c.id desc`);
    const participants = [...new Set(participations.map((p) => Number(p.auteur_id)))].slice(0, 5);
    const parUtilite = participations.toSorted((a, b) => b.utiles - a.utiles);
    const [membre, apercus] = await Promise.all([
      this.membres(participants),
      apercusDesCreations(
        this.db,
        this.stockage,
        parUtilite.map((p) => ({ id: Number(p.id), type: p.type })),
      ),
    ]);
    const image =
      parUtilite.map((p) => apercus.get(Number(p.id))?.couverture).find(Boolean) ?? null;
    return {
      id: Number(ligne.id),
      slug: ligne.slug,
      titre: ligne.titre,
      regles: reglesDuDefi(ligne.contraintes),
      dateFin: new Date(ligne.date_fin).toISOString(),
      participations: participations.length,
      participants: participants.map(membre),
      image,
    };
  }
}
