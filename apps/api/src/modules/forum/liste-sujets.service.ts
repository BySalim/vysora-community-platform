import { Inject, Injectable } from '@nestjs/common';
import {
  etatSujet,
  TYPES_SUJET_RESOLUBLES,
  type FiltresSujets,
  type ListeSujetsApi,
  type MembreResumeApi,
  type SujetResumeApi,
  type TriSujets,
} from '@vysora/shared';
import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { contenu, message, modele, outil, sujet } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { etiquettesDes, lireCorps } from './contenu-sujet.js';

/** Prototype : dix sujets par page (forum.js, PER_PAGE). */
const PAR_PAGE = 10;
const LONGUEUR_EXTRAIT = 300;
/** Début du bloc qui cite un prompt dans une réponse (composerMessage). */
const MARQUE_PROMPT = '```text';

/** Fil d'un sujet visible : chiffres qui servent aux filtres, aux tris et à la liste (un type plutôt
    qu'une interface : execute<T> demande une signature d'index). */
type LigneFil = {
  id: string;
  date_creation: Date | string;
  activite: Date | string;
  reponses: number;
  reponses_autres: number;
  utiles: number;
  testes: number;
  accepte: string | null;
};

const ORDRES: Record<TriSujets, SQL> = {
  recents: sql`date_creation desc, id desc`,
  actifs: sql`activite desc, id desc`,
  anciens: sql`date_creation asc, id asc`,
  utiles: sql`utiles desc, date_creation desc, id desc`,
  reproduits: sql`testes desc, utiles desc, date_creation desc, id desc`,
};

/** Premier paragraphe d'un texte, raccourci pour la liste. */
function extrait(texte: string): string {
  const paragraphe = texte.trim().split(/\n\s*\n/)[0] ?? '';
  const ligne = paragraphe.replace(/\s+/g, ' ').trim();
  return ligne.length > LONGUEUR_EXTRAIT
    ? `${ligne.slice(0, LONGUEUR_EXTRAIT - 1).trimEnd()}…`
    : ligne;
}

/* FORUM-01 : liste des sujets (EC-06), avec les filtres, les onglets et les tris du prototype
   (forum.js : listed, filterPanelHTML). Seuls les sujets visibles de tous y figurent (RG-30) ; leurs
   réponses comptent si elles sont visibles. Recherche plein texte sur le document du sujet (RG-31).
   Pages numérotées, comme le prototype : `total` et `pages` servent à la pagination de l'écran. */
@Injectable()
export class ListeSujetsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async liste(filtres: FiltresSujets): Promise<ListeSujetsApi> {
    const fils = this.fils(this.conditions(filtres));
    const retenus = sql`select * from (${fils}) f where ${this.conditionsDuFil(filtres)}`;
    const [[comptes], [attente]] = await Promise.all([
      this.db
        .execute<{ total: number }>(sql`select count(*)::int as total from (${retenus}) r`)
        .then((r) => r.rows),
      this.db
        .execute<{ total: number }>(
          sql`select count(*)::int as total from (${this.fils(sql`true`)}) f
            where f.reponses_autres = 0 and f.date_fermeture is null`,
        )
        .then((r) => r.rows),
    ]);
    const total = comptes?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
    // Comme le prototype, une page au-delà de la dernière montre la dernière.
    const page = Math.min(filtres.page, pages);
    const enAttente = attente?.total ?? 0;
    if (!total) return { elements: [], total, page, pages, enAttente };

    const { rows } = await this.db.execute<LigneFil>(sql`
      ${retenus} order by ${ORDRES[filtres.tri]}
      limit ${PAR_PAGE} offset ${(page - 1) * PAR_PAGE}`);
    return {
      elements: await this.presenter(rows),
      total,
      page,
      pages,
      enAttente,
    };
  }

  /** Sujets visibles et chiffres de leur fil (réponses visibles, activité, votes, réponse acceptée
      visible). */
  private fils(conditions: SQL): SQL {
    return sql`
      select s.id, c.date_creation, s.type_sujet, s.date_fermeture, am.id as accepte,
        (count(mc.id) filter (where mc.statut = 'VISIBLE'))::int as reponses,
        (count(mc.id) filter (where mc.statut = 'VISIBLE' and mc.auteur_id <> c.auteur_id))::int
          as reponses_autres,
        greatest(c.date_creation, max(mc.date_creation) filter (where mc.statut = 'VISIBLE'))
          as activite,
        (select count(*) from vote v where v.contenu_id = s.id and v.type_vote_code = 'UTILE')::int
          as utiles,
        (select count(*) from vote v where v.contenu_id = s.id and v.type_vote_code = 'TESTE_OK')::int
          as testes
      from sujet s
      join contenu c on c.id = s.id
      left join message m on m.sujet_id = s.id
      left join contenu mc on mc.id = m.id
      left join contenu am on am.id = s.message_accepte_id and am.statut = 'VISIBLE'
      where c.statut = 'VISIBLE' and ${conditions}
      group by s.id, c.id, am.id`;
  }

  /** Filtres sur le sujet lui-même. */
  private conditions(f: FiltresSujets): SQL {
    const conditions: SQL[] = [sql`true`];
    if (f.type.length)
      conditions.push(
        sql`s.type_sujet in (${sql.join(
          f.type.map((t) => sql`${t}`),
          sql`, `,
        )})`,
      );
    if (f.etiquette)
      conditions.push(sql`exists (select 1 from contenu_etiquette ce
        join etiquette et on et.id = ce.etiquette_id
        where ce.contenu_id = s.id and et.slug = ${f.etiquette})`);
    if (f.outil.length)
      conditions.push(
        sql`s.outil_id in (select o.id from outil o where o.slug in (${sql.join(
          f.outil.map((o) => sql`${o}`),
          sql`, `,
        )}))`,
      );
    if (f.membre)
      // Ses sujets et ceux où il a répondu (réponses visibles).
      conditions.push(sql`exists (select 1 from utilisateur u where u.pseudo = ${f.membre}
        and (u.id = c.auteur_id or exists (select 1 from message m2
          join contenu c2 on c2.id = m2.id
          where m2.sujet_id = s.id and c2.auteur_id = u.id and c2.statut = 'VISIBLE')))`);
    if (f.q)
      conditions.push(sql`exists (select 1 from recherche_document r
        where r.contenu_id = s.id and r.vecteur @@ websearch_to_tsquery('vysora_fr', ${f.q}))`);
    if (f.avecPrompt)
      // Une astuce, ou une réponse visible qui cite un prompt (composerMessage).
      conditions.push(sql`(s.type_sujet = 'ASTUCE' or exists (select 1 from message m3
        join contenu c3 on c3.id = m3.id
        where m3.sujet_id = s.id and c3.statut = 'VISIBLE' and position(${MARQUE_PROMPT} in m3.corps) > 0))`);
    return sql.join(conditions, sql` and `);
  }

  /** Filtres sur les chiffres du fil. */
  private conditionsDuFil(f: FiltresSujets): SQL {
    const conditions: SQL[] = [sql`true`];
    if (f.sansReponse) conditions.push(sql`f.reponses_autres = 0`);
    if (f.enAttente) conditions.push(sql`f.reponses_autres = 0 and f.date_fermeture is null`);
    if (f.sansReponseAcceptee)
      conditions.push(
        sql`f.type_sujet in (${sql.join(
          TYPES_SUJET_RESOLUBLES.map((t) => sql`${t}`),
          sql`, `,
        )}) and f.accepte is null`,
      );
    return sql.join(conditions, sql` and `);
  }

  private async presenter(fils: LigneFil[]): Promise<SujetResumeApi[]> {
    const ids = fils.map((f) => Number(f.id));
    const [sujets, etiquettes, dernieres, acceptees] = await Promise.all([
      this.db
        .select({
          id: sujet.id,
          type: sujet.typeSujet,
          titre: sujet.titre,
          slug: sujet.slug,
          corps: sujet.corps,
          dateFermeture: sujet.dateFermeture,
          modeleNonReference: sujet.modeleNonReference,
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
        .from(sujet)
        .innerJoin(contenu, eq(contenu.id, sujet.id))
        .leftJoin(outil, eq(outil.id, sujet.outilId))
        .leftJoin(modele, eq(modele.id, sujet.modeleId))
        .where(inArray(sujet.id, ids)),
      etiquettesDes(this.db, ids),
      // Auteur de la dernière réponse visible de chaque sujet.
      this.db
        .selectDistinctOn([message.sujetId], {
          sujetId: message.sujetId,
          auteurId: contenu.auteurId,
        })
        .from(message)
        .innerJoin(contenu, eq(contenu.id, message.id))
        .where(and(inArray(message.sujetId, ids), eq(contenu.statut, 'VISIBLE')))
        .orderBy(message.sujetId, sql`${contenu.dateCreation} desc`, sql`${message.id} desc`),
      // Auteur de la réponse acceptée, si elle est visible.
      fils.some((f) => f.accepte)
        ? this.db
            .select({ id: contenu.id, auteurId: contenu.auteurId })
            .from(contenu)
            .where(
              inArray(
                contenu.id,
                fils.flatMap((f) => (f.accepte ? [Number(f.accepte)] : [])),
              ),
            )
        : [],
    ]);
    const membres = await resumerMembres(this.db, this.stockage, [
      ...sujets.map((s) => s.auteurId),
      ...dernieres.map((d) => d.auteurId),
      ...acceptees.map((a) => a.auteurId),
    ]);
    const membre = (id: number): MembreResumeApi => {
      const resume = membres.get(id);
      if (!resume) throw new Error(`Membre introuvable : ${id}`);
      return resume;
    };

    return fils.map((f): SujetResumeApi => {
      const id = Number(f.id);
      const s = sujets.find((x) => x.id === id);
      if (!s) throw new Error(`Sujet introuvable : ${id}`);
      const { texte, clinique } = lireCorps(s.type, s.corps);
      const derniere = dernieres.find((d) => d.sujetId === id);
      const solution = acceptees.find((a) => a.id === Number(f.accepte));
      return {
        id,
        slug: s.slug,
        type: s.type,
        titre: s.titre,
        // Prototype : le contexte, à défaut le résultat obtenu d'une clinique.
        extrait: extrait(texte || clinique?.obtenu || ''),
        etat: etatSujet({ ferme: s.dateFermeture !== null, accepte: f.accepte !== null }),
        enAttente: s.dateFermeture === null && f.reponses_autres === 0,
        auteur: membre(s.auteurId),
        date: new Date(f.date_creation).toISOString(),
        derniereActivite: {
          date: new Date(f.activite).toISOString(),
          membre: membre(derniere?.auteurId ?? s.auteurId),
        },
        reponses: f.reponses,
        utiles: f.utiles,
        testes: f.testes,
        solution: solution ? { auteur: membre(solution.auteurId) } : null,
        outil: s.outil,
        modele: s.outil ? (s.modele ?? s.modeleNonReference) : null,
        etiquettes: etiquettes.get(id) ?? [],
      };
    });
  }
}
