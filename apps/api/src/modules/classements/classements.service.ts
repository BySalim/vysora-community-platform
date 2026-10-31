import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  niveauPourReputation,
  type ClassementsApi,
  type EntreeAstuceApi,
  type EntreeCreationApi,
  type EntreeEntraideApi,
  type MembreResumeApi,
  type RangClassementApi,
  type SemaineClassementApi,
  type SujetPalmaresApi,
  type TypeCreation,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { JOUR_MS, jourIso, lundiUtc } from '../accueil/periodes.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/** Semaines proposées : la semaine en cours et les deux précédentes. */
const SEMAINES = 3;
const PAR_PALMARES = 5;
const PAR_CLASSEMENT = 50;
const LONGUEUR_EXTRAIT = 220;

interface Periode {
  debut: Date;
  fin: Date;
}

const extrait = (texte: string) => {
  const valeur = texte
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return valeur.length > LONGUEUR_EXTRAIT
    ? `${valeur.slice(0, LONGUEUR_EXTRAIT - 1).trimEnd()}…`
    : valeur;
};

/** Membres classés (RG-87) : comptes actifs, sans suspension en cours. */
const membreClasse = (maintenant: Date) => sql`u.statut_compte = 'ACTIF'
  and not exists (select 1 from decision_moderation d where d.membre_vise_id = u.id
    and d.action = 'SUSPENDRE' and d.date_fin_suspension > ${maintenant})`;

/** Contenu visible de tous (RG-30). */
const visible = (alias: string) => sql.raw(`${alias}.statut = 'VISIBLE'`);

/* Classements (S-08, F-75, RG-87) : palmarès de la semaine par contribution (méthodes réussies,
   entraide, créations utiles, astuces vérifiées), classement des membres de la semaine et général,
   cinquante premiers. Les palmarès comptent les gestes des autres membres pendant la semaine ; les
   classements, les points de réputation (mouvements, annulations comprises). */
@Injectable()
export class ClassementsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  /** Semaines proposées, la plus récente d'abord. */
  semaines(maintenant = new Date()): SemaineClassementApi[] {
    const lundi = lundiUtc(maintenant).getTime();
    return Array.from({ length: SEMAINES }, (_, i) => {
      const debut = new Date(lundi - i * 7 * JOUR_MS);
      return {
        debut: jourIso(debut),
        fin: jourIso(new Date(debut.getTime() + 6 * JOUR_MS)),
        statut: i === 0 ? 'provisoire' : 'arretee',
      };
    });
  }

  async classements(
    lecteurId: number | null,
    semaineDemandee?: string,
    maintenant = new Date(),
  ): Promise<ClassementsApi> {
    const semaines = this.semaines(maintenant);
    const semaine = semaines.find((s) => s.debut === semaineDemandee) ?? semaines[0]!;
    const debut = new Date(`${semaine.debut}T00:00:00Z`);
    const periode: Periode = { debut, fin: new Date(debut.getTime() + 7 * JOUR_MS) };
    const precedente: Periode = { debut: new Date(debut.getTime() - 7 * JOUR_MS), fin: debut };

    const [chiffres, reussites, utiles, entraide, astuces, rangs, rangsAvant, general, moi] =
      await Promise.all([
        this.chiffres(periode),
        this.reussites(periode),
        this.utiles(periode),
        this.entraide(periode),
        this.astuces(periode),
        this.rangsSemaine(periode, maintenant),
        this.rangsSemaine(precedente, maintenant),
        this.rangsGeneraux(maintenant),
        lecteurId === null ? null : this.moi(lecteurId, periode, maintenant),
      ]);

    const ids = [
      ...reussites.flatMap((e) => [e.auteur, ...e.par]),
      ...utiles.map((e) => e.auteur),
      ...entraide.flatMap((e) => [e.membre, ...(e.demandeur === null ? [] : [e.demandeur])]),
      ...astuces.map((e) => e.auteur),
      ...rangs.lignes.slice(0, PAR_CLASSEMENT).map((r) => r.id),
      ...general.lignes.map((r) => r.id),
    ];
    const creations = [...reussites, ...utiles].map((e) => ({ id: e.id, type: e.type }));
    const [membres, apercus] = await Promise.all([
      resumerMembres(this.db, this.stockage, ids),
      apercusDesCreations(this.db, this.stockage, creations),
    ]);
    const membre = (id: number): MembreResumeApi => {
      const resume = membres.get(id);
      if (!resume) throw new Error(`Membre introuvable : ${id}`);
      return resume;
    };
    const creation = (e: LigneCreation) => ({
      id: e.id,
      slug: e.slug,
      titre: e.titre,
      type: e.type,
      outils: apercus.get(e.id)?.outils ?? [],
      couverture: apercus.get(e.id)?.couverture ?? null,
    });
    const rangAvant = new Map(rangsAvant.lignes.map((r) => [r.id, r.rang]));
    const rang = (r: LigneRang, semaineEnCours: boolean): RangClassementApi => {
      const resume = membre(r.id);
      const avant = rangAvant.get(r.id);
      return {
        rang: r.rang,
        membre: resume,
        niveau: resume.niveau.code,
        points: r.points,
        evolution: !semaineEnCours ? null : avant === undefined ? 'nouveau' : avant - r.rang,
      };
    };

    return {
      semaines,
      semaine,
      chiffres,
      palmares: {
        reussites: reussites.map((e): EntreeCreationApi => ({
          membre: membre(e.auteur),
          creation: creation(e),
          nombre: e.nombre,
          declarees: e.declarees,
          par: e.par.map(membre),
          points: e.nombre * BAREME_REPUTATION.reproductionReussieRecue,
        })),
        entraide: entraide.map((e): EntreeEntraideApi => ({
          membre: membre(e.membre),
          nombre: e.nombre,
          utiles: e.utiles,
          echange: {
            sujet: e.sujet,
            demandeur: e.demandeur === null ? null : membre(e.demandeur),
            extrait: extrait(e.corps),
            date: e.date,
          },
          points:
            e.nombre * BAREME_REPUTATION.reponseAcceptee +
            e.utiles * BAREME_REPUTATION.voteUtileSurAutreContenu,
        })),
        utiles: utiles.map((e): EntreeCreationApi => ({
          membre: membre(e.auteur),
          creation: creation(e),
          nombre: e.nombre,
          points: e.nombre * BAREME_REPUTATION.voteUtileSurCreation,
        })),
        astuces: astuces.map((e): EntreeAstuceApi => ({
          membre: membre(e.auteur),
          sujet: e.sujet,
          nombre: e.nombre,
          points: e.nombre * BAREME_REPUTATION.voteTesteSurAstuce,
        })),
      },
      membres: {
        semaine: rangs.lignes.slice(0, PAR_CLASSEMENT).map((r) => rang(r, true)),
        general: general.lignes.map((r) => rang(r, false)),
        classesSemaine: rangs.total,
        classesGeneral: general.total,
      },
      moi,
    };
  }

  private async chiffres({ debut, fin }: Periode): Promise<ClassementsApi['chiffres']> {
    const { rows } = await this.db.execute<{
      votes: number;
      reproductions: number;
      cas: number;
      acceptees: number;
    }>(sql`select
      (select count(*) from vote where date_vote >= ${debut} and date_vote < ${fin})::int as votes,
      (select count(*) from reproduction r join contenu c on c.id = r.id
        where c.date_creation >= ${debut} and c.date_creation < ${fin})::int as reproductions,
      (select count(*) from choix_option co join option_reponse o on o.id = co.option_id
        where o.est_correcte and co.date_choix >= ${debut} and co.date_choix < ${fin})::int as cas,
      (select count(*) from sujet where date_acceptation_reponse >= ${debut}
        and date_acceptation_reponse < ${fin})::int as acceptees`);
    const l = rows[0] ?? { votes: 0, reproductions: 0, cas: 0, acceptees: 0 };
    return {
      votes: l.votes,
      reproductions: l.reproductions,
      casReussis: l.cas,
      reponsesAcceptees: l.acceptees,
      interactions: l.votes + l.reproductions + l.cas + l.acceptees,
    };
  }

  /** Méthodes réussies : reproductions réussies déclarées par d'autres membres (une fois par membre
      et par création) sur une création « 1 prompt » ou « Itération ». */
  private async reussites({ debut, fin }: Periode): Promise<(LigneCreation & ReussiteEnPlus)[]> {
    const { rows } = await this.db.execute<
      LigneSqlCreation & { declarees: number; par: string[] }
    >(sql`
      select cc.id, cc.auteur_id, cr.slug, cr.titre, cr.type_creation,
        count(distinct rc.auteur_id) filter (where r.resultat = 'SUCCES')::int as nombre,
        count(*)::int as declarees,
        (array_agg(distinct rc.auteur_id) filter (where r.resultat = 'SUCCES'))::text[] as par
      from reproduction r
      join contenu rc on rc.id = r.id
      join creation cr on cr.id = r.creation_id
      join contenu cc on cc.id = cr.id
      join utilisateur u on u.id = cc.auteur_id
      where rc.date_creation >= ${debut} and rc.date_creation < ${fin}
        and ${visible('rc')} and ${visible('cc')} and cr.statut_publication = 'PUBLIEE'
        and cr.type_creation in ('UN_PROMPT', 'ITERATION') and rc.auteur_id <> cc.auteur_id
        and u.statut_compte = 'ACTIF'
      group by cc.id, cc.auteur_id, cr.slug, cr.titre, cr.type_creation, cr.date_publication
      having count(*) filter (where r.resultat = 'SUCCES') > 0
      order by nombre desc, cr.date_publication asc, cc.id asc
      limit ${PAR_PALMARES}`);
    return rows.map((r) => ({
      ...ligneCreation(r),
      declarees: r.declarees,
      par: (r.par ?? []).slice(0, 9).map(Number),
    }));
  }

  /** Créations utiles : votes « Utile » reçus pendant la semaine, tous types de création. */
  private async utiles({ debut, fin }: Periode): Promise<LigneCreation[]> {
    const { rows } = await this.db.execute<LigneSqlCreation>(sql`
      select cc.id, cc.auteur_id, cr.slug, cr.titre, cr.type_creation, count(*)::int as nombre
      from vote v
      join creation cr on cr.id = v.contenu_id
      join contenu cc on cc.id = cr.id
      join utilisateur u on u.id = cc.auteur_id
      where v.type_vote_code = 'UTILE' and v.date_vote >= ${debut} and v.date_vote < ${fin}
        and ${visible('cc')} and cr.statut_publication = 'PUBLIEE' and u.statut_compte = 'ACTIF'
      group by cc.id, cc.auteur_id, cr.slug, cr.titre, cr.type_creation, cr.date_publication
      order by nombre desc, cr.date_publication asc, cc.id asc
      limit ${PAR_PALMARES}`);
    return rows.map(ligneCreation);
  }

  /** Entraide : réponses acceptées pendant la semaine, puis votes « Utile » reçus sur les réponses. */
  private async entraide({ debut, fin }: Periode) {
    const { rows } = await this.db.execute<
      LigneSujet & {
        membre: string;
        nombre: number;
        utiles: number;
        demandeur: string | null;
        corps: string;
        date: Date | string;
      }
    >(sql`
      with acceptees as (
        select mc.auteur_id as membre, s.id, s.slug, s.titre, sc.auteur_id as demandeur,
          m.corps, s.date_acceptation_reponse as date, s.outil_id, s.modele_id,
          s.modele_non_reference
        from sujet s
        join contenu sc on sc.id = s.id
        join message m on m.id = s.message_accepte_id
        join contenu mc on mc.id = m.id
        join utilisateur u on u.id = mc.auteur_id
        where s.date_acceptation_reponse >= ${debut} and s.date_acceptation_reponse < ${fin}
          and ${visible('sc')} and ${visible('mc')} and mc.auteur_id <> sc.auteur_id
          and u.statut_compte = 'ACTIF'
      ), par_membre as (
        select membre, count(*)::int as nombre, max(date) as derniere from acceptees group by membre
      )
      select p.membre, p.nombre,
        (select count(*) from vote v join contenu c on c.id = v.contenu_id
          where c.type_contenu = 'MESSAGE' and c.auteur_id = p.membre
            and v.type_vote_code = 'UTILE' and v.date_vote >= ${debut}
            and v.date_vote < ${fin})::int as utiles,
        a.id, a.slug, a.titre, a.demandeur, a.corps, a.date,
        o.id as outil_id, o.nom as outil_nom, o.slug as outil_slug, o.logo as outil_logo,
        o.logo_monochrome as outil_mono, coalesce(mo.nom_court, a.modele_non_reference) as modele
      from par_membre p
      join acceptees a on a.membre = p.membre and a.date = p.derniere
      left join outil o on o.id = a.outil_id
      left join modele mo on mo.id = a.modele_id
      order by p.nombre desc, utiles desc, p.derniere asc
      limit ${PAR_PALMARES}`);
    return rows.map((r) => ({
      membre: Number(r.membre),
      nombre: r.nombre,
      utiles: r.utiles,
      demandeur: r.demandeur === null ? null : Number(r.demandeur),
      corps: r.corps,
      date: new Date(r.date).toISOString(),
      sujet: sujetPalmares(r),
    }));
  }

  /** Astuces vérifiées : votes « Testé, ça marche » reçus pendant la semaine. */
  private async astuces({ debut, fin }: Periode) {
    const { rows } = await this.db.execute<LigneSujet & { auteur_id: string; nombre: number }>(sql`
      select s.id, s.slug, s.titre, sc.auteur_id, count(*)::int as nombre,
        o.id as outil_id, o.nom as outil_nom, o.slug as outil_slug, o.logo as outil_logo,
        o.logo_monochrome as outil_mono, coalesce(mo.nom_court, s.modele_non_reference) as modele
      from vote v
      join sujet s on s.id = v.contenu_id
      join contenu sc on sc.id = s.id
      join utilisateur u on u.id = sc.auteur_id
      left join outil o on o.id = s.outil_id
      left join modele mo on mo.id = s.modele_id
      where v.type_vote_code = 'TESTE_OK' and v.date_vote >= ${debut} and v.date_vote < ${fin}
        and s.type_sujet = 'ASTUCE' and ${visible('sc')} and u.statut_compte = 'ACTIF'
      group by s.id, s.slug, s.titre, sc.auteur_id, sc.date_creation, o.id, mo.nom_court
      order by nombre desc, sc.date_creation asc, s.id asc
      limit ${PAR_PALMARES}`);
    return rows.map((r) => ({
      auteur: Number(r.auteur_id),
      nombre: r.nombre,
      sujet: sujetPalmares(r),
    }));
  }

  /** RG-87 : points gagnés pendant la semaine ; rang partagé à égalité. */
  private async rangsSemaine({ debut, fin }: Periode, maintenant: Date) {
    const { rows } = await this.db.execute<{ id: string; points: number; rang: number }>(sql`
      select mr.beneficiaire_id as id, sum(mr.points)::int as points,
        rank() over (order by sum(mr.points) desc)::int as rang
      from mouvement_reputation mr
      join utilisateur u on u.id = mr.beneficiaire_id
      where mr.date >= ${debut} and mr.date < ${fin} and ${membreClasse(maintenant)}
      group by mr.beneficiaire_id
      having sum(mr.points) > 0
      order by points desc, mr.beneficiaire_id asc`);
    return { lignes: rows.map(ligneRang), total: rows.length };
  }

  /** RG-87 : réputation totale, cinquante premiers. */
  private async rangsGeneraux(maintenant: Date) {
    const { rows } = await this.db.execute<{
      id: string;
      points: number;
      rang: number;
      total: number;
    }>(sql`
      select * from (
        select mr.beneficiaire_id as id, sum(mr.points)::int as points,
          rank() over (order by sum(mr.points) desc)::int as rang,
          count(*) over ()::int as total
        from mouvement_reputation mr
        join utilisateur u on u.id = mr.beneficiaire_id
        where ${membreClasse(maintenant)}
        group by mr.beneficiaire_id
        having sum(mr.points) > 0
      ) classes
      order by points desc, id asc
      limit ${PAR_CLASSEMENT}`);
    return { lignes: rows.map(ligneRang), total: rows[0]?.total ?? 0 };
  }

  /** La semaine de la personne connectée et ses rangs. */
  private async moi(id: number, { debut, fin }: Periode, maintenant: Date) {
    const { rows } = await this.db.execute<{
      semaine: number;
      reputation: number;
      rang_semaine: number | null;
      rang_general: number | null;
    }>(sql`
      with semaine as (
        select mr.beneficiaire_id as id, sum(mr.points) as points
        from mouvement_reputation mr join utilisateur u on u.id = mr.beneficiaire_id
        where mr.date >= ${debut} and mr.date < ${fin} and ${membreClasse(maintenant)}
        group by mr.beneficiaire_id having sum(mr.points) > 0
      ), general as (
        select mr.beneficiaire_id as id, sum(mr.points) as points
        from mouvement_reputation mr join utilisateur u on u.id = mr.beneficiaire_id
        where ${membreClasse(maintenant)}
        group by mr.beneficiaire_id having sum(mr.points) > 0
      )
      select
        (select coalesce(sum(points), 0) from mouvement_reputation
          where beneficiaire_id = ${id} and date >= ${debut} and date < ${fin})::int as semaine,
        (select coalesce(sum(points), 0) from mouvement_reputation
          where beneficiaire_id = ${id})::int as reputation,
        (select 1 + count(*) from semaine where points > (select points from semaine where id = ${id}))::int
          as rang_semaine,
        (select 1 + count(*) from general where points > (select points from general where id = ${id}))::int
          as rang_general,
        exists (select 1 from semaine where id = ${id}) as classe_semaine,
        exists (select 1 from general where id = ${id}) as classe_general`);
    const l = rows[0] as
      ((typeof rows)[number] & { classe_semaine: boolean; classe_general: boolean }) | undefined;
    const reputation = Math.max(0, l?.reputation ?? 0);
    return {
      points: l?.semaine ?? 0,
      rangSemaine: l?.classe_semaine ? l.rang_semaine : null,
      rangGeneral: l?.classe_general ? l.rang_general : null,
      reputation,
      niveau: niveauPourReputation(reputation).code,
    };
  }
}

type LigneSqlCreation = {
  id: string;
  auteur_id: string;
  slug: string;
  titre: string;
  type_creation: TypeCreation;
  nombre: number;
};
interface LigneCreation {
  id: number;
  auteur: number;
  slug: string;
  titre: string;
  type: TypeCreation;
  nombre: number;
}
interface ReussiteEnPlus {
  declarees: number;
  par: number[];
}
const ligneCreation = (r: LigneSqlCreation): LigneCreation => ({
  id: Number(r.id),
  auteur: Number(r.auteur_id),
  slug: r.slug,
  titre: r.titre,
  type: r.type_creation,
  nombre: r.nombre,
});

type LigneSujet = {
  id: string;
  slug: string;
  titre: string;
  outil_id: string | null;
  outil_nom: string | null;
  outil_slug: string | null;
  outil_logo: string | null;
  outil_mono: boolean | null;
  modele: string | null;
};
const sujetPalmares = (r: LigneSujet): SujetPalmaresApi => ({
  id: Number(r.id),
  slug: r.slug,
  titre: r.titre,
  outil:
    r.outil_id && r.outil_nom && r.outil_slug
      ? {
          id: Number(r.outil_id),
          nom: r.outil_nom,
          slug: r.outil_slug,
          logo: r.outil_logo,
          logoMonochrome: Boolean(r.outil_mono),
        }
      : null,
  modele: r.modele,
});

interface LigneRang {
  id: number;
  points: number;
  rang: number;
}
const ligneRang = (r: { id: string; points: number; rang: number }): LigneRang => ({
  id: Number(r.id),
  points: r.points,
  rang: r.rang,
});
