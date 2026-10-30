import { Inject, Injectable } from '@nestjs/common';
import {
  DIFFICULTES_CAS,
  type CasAValiderApi,
  type CasResumeApi,
  type DifficulteCas,
  type FiltresCas,
  type ListeCasApi,
  type ListeCasAValiderApi,
  type MembreResumeApi,
  type TriCas,
} from '@vysora/shared';
import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { erreurValidation } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { casBonReflexe, choixOption, contenu, modele, outil } from '../../db/schema/index.js';
import { etiquettesDes } from '../forum/contenu-sujet.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { CAS_PUBLIC } from './cas.service.js';
import { corriger, domainesDes, optionsDes } from './contenu-cas.js';

const PAR_PAGE = 20;

/** Chiffres d'un cas visible de tous, pour les filtres, les tris et la liste (un type plutôt qu'une
    interface : execute<T> demande une signature d'index). */
type LigneCas = {
  id: string;
  difficulte: DifficulteCas;
  date_examen: Date | string;
  reponses: number;
  utiles: number;
};

const ORDRES: Record<TriCas, SQL> = {
  recents: sql`date_examen desc, id desc`,
  anciens: sql`date_examen asc, id asc`,
  repondus: sql`reponses desc, date_examen desc, id desc`,
  utiles: sql`utiles desc, date_examen desc, id desc`,
};

/** Curseur de la liste des cas à valider : date de soumission et identifiant du dernier cas. */
const ecrireCurseur = (depuis: Date, id: number) =>
  Buffer.from(`${depuis.toISOString()}|${id}`).toString('base64url');
function lireCurseur(curseur: string | undefined): { depuis: Date; id: number } | null {
  if (!curseur) return null;
  const [date, id] = Buffer.from(curseur, 'base64url').toString().split('|');
  const depuis = new Date(date ?? '');
  const identifiant = Number(id);
  if (Number.isNaN(depuis.getTime()) || !Number.isSafeInteger(identifiant) || identifiant < 1)
    throw erreurValidation({ apres: 'Cette page de la liste n’existe pas.' });
  return { depuis, id: identifiant };
}

/* APP-01 : liste des cas Bon réflexe validés (EC-09), avec les puces de niveau du prototype
   (apprendre.js, rubCas) et la réponse de la personne connectée ; recherche plein texte sur le
   document du cas (RG-31). Pages numérotées, comme le forum. Liste des cas proposés pour la
   modération (EC-20, F-61). */
@Injectable()
export class ListeCasService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async liste(filtres: FiltresCas, lecteurId: number | null): Promise<ListeCasApi> {
    const conditions = this.conditions(filtres, lecteurId);
    const difficultes = filtres.difficulte.length
      ? sql`cb.difficulte in (${sql.join(
          filtres.difficulte.map((d) => sql`${d}`),
          sql`, `,
        )})`
      : sql`true`;
    const [parDifficulte, comptes] = await Promise.all([
      this.db
        .execute<{ difficulte: DifficulteCas; total: number }>(
          sql`
          select cb.difficulte, count(*)::int as total
          from cas_bon_reflexe cb join contenu c on c.id = cb.id
          where ${CAS_PUBLIC} and ${conditions}
          group by cb.difficulte`,
        )
        .then((r) => r.rows),
      this.db
        .execute<{ total: number }>(
          sql`
          select count(*)::int as total
          from cas_bon_reflexe cb join contenu c on c.id = cb.id
          where ${CAS_PUBLIC} and ${conditions} and ${difficultes}`,
        )
        .then((r) => r.rows),
    ]);
    const total = comptes[0]?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
    // Comme le forum, une page au-delà de la dernière montre la dernière.
    const page = Math.min(filtres.page, pages);
    const repartition = Object.fromEntries(
      DIFFICULTES_CAS.map((d) => [d, parDifficulte.find((l) => l.difficulte === d)?.total ?? 0]),
    ) as Record<DifficulteCas, number>;
    if (!total) return { elements: [], total, page, pages, parDifficulte: repartition };

    const { rows } = await this.db.execute<LigneCas>(sql`
      select * from (
        select cb.id, cb.difficulte, cb.date_examen,
          (select count(*) from choix_option ch where ch.cas_id = cb.id)::int as reponses,
          (select count(*) from vote v where v.contenu_id = cb.id and v.type_vote_code = 'UTILE')::int
            as utiles
        from cas_bon_reflexe cb join contenu c on c.id = cb.id
        where ${CAS_PUBLIC} and ${conditions} and ${difficultes}
      ) cas order by ${ORDRES[filtres.tri]}
      limit ${PAR_PAGE} offset ${(page - 1) * PAR_PAGE}`);
    return {
      elements: await this.presenter(rows, lecteurId),
      total,
      page,
      pages,
      parDifficulte: repartition,
    };
  }

  /** F-61 : cas proposés, du plus anciennement soumis au plus récent, par pages de vingt. Les cas de
      la personne y figurent, marqués : un autre membre de l'équipe les examinera (RG-71). */
  async aValider(moderateurId: number, apres?: string): Promise<ListeCasAValiderApi> {
    const curseur = lireCurseur(apres);
    const proposes = sql`
      select cb.id, coalesce(c.date_modification, c.date_creation) as depuis
      from cas_bon_reflexe cb join contenu c on c.id = cb.id
      where cb.statut_validation = 'PROPOSE' and c.statut <> 'SUPPRIME'`;
    const [[compte], { rows }] = await Promise.all([
      this.db
        .execute<{ total: number }>(sql`select count(*)::int as total from (${proposes}) p`)
        .then((r) => r.rows),
      this.db.execute<{ id: string; depuis: Date | string }>(sql`
        select id, depuis from (${proposes}) p
        where ${curseur?.depuis.toISOString() ?? null}::timestamptz is null
          or (depuis, id) > (${curseur?.depuis.toISOString() ?? null}::timestamptz, ${curseur?.id ?? 0}::bigint)
        order by depuis, id
        limit ${PAR_PAGE + 1}`),
    ]);
    const page = rows.slice(0, PAR_PAGE);
    const ids = page.map((r) => Number(r.id));
    const lignes = ids.length
      ? await this.db
          .select({
            id: casBonReflexe.id,
            slug: casBonReflexe.slug,
            titre: casBonReflexe.titre,
            difficulte: casBonReflexe.difficulte,
            auteurId: contenu.auteurId,
            statut: contenu.statut,
            dateModification: contenu.dateModification,
          })
          .from(casBonReflexe)
          .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
          .where(inArray(casBonReflexe.id, ids))
      : [];
    const membres = await resumerMembres(
      this.db,
      this.stockage,
      lignes.map((l) => l.auteurId),
    );
    const elements = page.map((r): CasAValiderApi => {
      const l = lignes.find((x) => x.id === Number(r.id));
      const auteur = l && membres.get(l.auteurId);
      if (!l || !auteur) throw new Error(`Cas introuvable : ${r.id}`);
      return {
        id: l.id,
        slug: l.slug,
        titre: l.titre,
        difficulte: l.difficulte,
        auteur,
        dateSoumission: new Date(r.depuis).toISOString(),
        nouvelleSoumission: l.dateModification !== null,
        mien: l.auteurId === moderateurId,
        masquee: l.statut === 'MASQUE',
      };
    });
    const dernier = page.at(-1);
    return {
      elements,
      total: compte?.total ?? 0,
      suivant:
        rows.length > PAR_PAGE && dernier
          ? ecrireCurseur(new Date(dernier.depuis), Number(dernier.id))
          : null,
    };
  }

  /** Filtres sur le cas, hors difficulté (comptée à part pour les puces). */
  private conditions(f: FiltresCas, lecteurId: number | null): SQL {
    const conditions: SQL[] = [sql`true`];
    if (f.etiquette)
      conditions.push(sql`exists (select 1 from contenu_etiquette ce
        join etiquette et on et.id = ce.etiquette_id
        where ce.contenu_id = cb.id and et.slug = ${f.etiquette})`);
    if (f.outil.length)
      conditions.push(
        sql`cb.outil_id in (select o.id from outil o where o.slug in (${sql.join(
          f.outil.map((o) => sql`${o}`),
          sql`, `,
        )}))`,
      );
    if (f.q)
      conditions.push(sql`exists (select 1 from recherche_document r
        where r.contenu_id = cb.id and r.vecteur @@ websearch_to_tsquery('vysora_fr', ${f.q}))`);
    // F-21 : un visiteur n'a répondu à rien ; un membre ne répond pas à ses propres cas (RG-72).
    if (f.nonRepondus && lecteurId !== null)
      conditions.push(sql`c.auteur_id <> ${lecteurId} and not exists (select 1 from choix_option ch
        where ch.cas_id = cb.id and ch.utilisateur_id = ${lecteurId})`);
    return sql.join(conditions, sql` and `);
  }

  private async presenter(lignes: LigneCas[], lecteurId: number | null): Promise<CasResumeApi[]> {
    const ids = lignes.map((l) => Number(l.id));
    const [cas, etiquettes, options, domaines, reponses] = await Promise.all([
      this.db
        .select({
          id: casBonReflexe.id,
          slug: casBonReflexe.slug,
          titre: casBonReflexe.titre,
          contexte: casBonReflexe.contexte,
          explication: casBonReflexe.explication,
          modeleNonReference: casBonReflexe.modeleNonReference,
          auteurId: contenu.auteurId,
          outil: {
            id: outil.id,
            nom: outil.nom,
            slug: outil.slug,
            logo: outil.logo,
            logoMonochrome: outil.logoMonochrome,
          },
          modele: modele.nomCourt,
        })
        .from(casBonReflexe)
        .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
        .leftJoin(outil, eq(outil.id, casBonReflexe.outilId))
        .leftJoin(modele, eq(modele.id, casBonReflexe.modeleId))
        .where(inArray(casBonReflexe.id, ids)),
      etiquettesDes(this.db, ids),
      optionsDes(this.db, ids),
      domainesDes(this.db, ids),
      lecteurId === null
        ? []
        : this.db
            .select({ casId: choixOption.casId, optionId: choixOption.optionId })
            .from(choixOption)
            .where(and(eq(choixOption.utilisateurId, lecteurId), inArray(choixOption.casId, ids))),
    ]);
    const membres = await resumerMembres(
      this.db,
      this.stockage,
      cas.map((c) => c.auteurId),
    );
    const membre = (id: number): MembreResumeApi => {
      const resume = membres.get(id);
      if (!resume) throw new Error(`Membre introuvable : ${id}`);
      return resume;
    };

    return lignes.map((l): CasResumeApi => {
      const id = Number(l.id);
      const c = cas.find((x) => x.id === id);
      if (!c) throw new Error(`Cas introuvable : ${id}`);
      const sesOptions = options.get(id) ?? [];
      const reponse = reponses.find((r) => r.casId === id);
      return {
        id,
        slug: c.slug,
        titre: c.titre,
        contexte: c.contexte,
        difficulte: l.difficulte,
        domaine: domaines.get(id)?.domaine ?? null,
        dureeMinutes: domaines.get(id)?.dureeMinutes ?? null,
        outil: c.outil,
        modele: c.outil ? (c.modele ?? c.modeleNonReference) : null,
        etiquettes: etiquettes.get(id) ?? [],
        auteur: membre(c.auteurId),
        date: new Date(l.date_examen).toISOString(),
        reponses: l.reponses,
        reussite: corriger(c.explication, sesOptions).reussite,
        utiles: l.utiles,
        maReponse: reponse
          ? { correcte: sesOptions.find((o) => o.id === reponse.optionId)?.correcte ?? false }
          : null,
      };
    });
  }
}
