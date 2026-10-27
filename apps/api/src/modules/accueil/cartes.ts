import { type CarteCreationApi, type CreationsAccueilApi, type TypeCreation } from '@vysora/shared';
import { asc, inArray, sql } from 'drizzle-orm';
import type { BaseDeDonnees } from '../../db/client.js';
import { echange, etape, momentCle } from '../../db/schema/index.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { tauxDeReussite } from '../decouverte/chiffres-guides.js';
import type { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { JOUR_MS } from './periodes.js';

/** Cartes de chaque onglet d'« À explorer » (prototype : six par liste). */
const PAR_LISTE = 6;

type LigneCarte = {
  liste: 'utiles' | 'recentes' | 'reproduites' | 'exemple';
  id: string;
  auteur_id: string;
  type_creation: TypeCreation;
  titre: string;
  slug: string;
  date_publication: Date | string;
  categorie: string | null;
  categorie_slug: string | null;
  utiles: number;
  utiles_semaine: number;
  reproductions: number;
  reussites: number;
  reussites_mois: number;
};

/** Trace du parcours (prototype : steps) : un point par échange (1 prompt, itération) ou par étape
    (projet), marqué s'il porte un moment clé ; la fiche présente les mêmes échanges. */
async function tracesDes(
  db: BaseDeDonnees,
  creations: { id: number; type: TypeCreation }[],
): Promise<Map<number, { trace: boolean[]; moments: number }>> {
  const ids = creations.map((c) => c.id);
  const resultat = new Map<number, { trace: boolean[]; moments: number }>();
  if (!ids.length) return resultat;
  const etapes = await db
    .select({ id: etape.id, creationId: etape.creationId })
    .from(etape)
    .where(inArray(etape.creationId, ids))
    .orderBy(asc(etape.ordre));
  const idsEtapes = etapes.map((e) => e.id);
  const [echanges, moments] = idsEtapes.length
    ? await Promise.all([
        db
          .select({ id: echange.id, etapeId: echange.etapeId })
          .from(echange)
          .where(inArray(echange.etapeId, idsEtapes))
          .orderBy(asc(echange.ordre)),
        db
          .select({ etapeId: momentCle.etapeId, echangeId: momentCle.echangeId })
          .from(momentCle)
          .where(inArray(momentCle.etapeId, idsEtapes)),
      ])
    : [[], []];
  for (const { id, type } of creations) {
    const sesEtapes = etapes.filter((e) => e.creationId === id);
    const sesMoments = moments.filter((m) => sesEtapes.some((e) => e.id === m.etapeId));
    let trace: boolean[];
    if (type === 'PROJET') trace = sesEtapes.map((e) => sesMoments.some((m) => m.etapeId === e.id));
    else {
      const premiere = sesEtapes[0];
      const presentes = premiere ? echanges.filter((x) => x.etapeId === premiere.id) : [];
      trace = (type === 'UN_PROMPT' ? presentes.slice(0, 1) : presentes).map((x) =>
        sesMoments.some((m) => m.echangeId === x.id),
      );
      // Un moment posé sur l'étape sans viser d'échange se lit sur le dernier.
      if (trace.length && sesMoments.some((m) => m.echangeId === null))
        trace[trace.length - 1] = true;
    }
    resultat.set(id, { trace: trace.length ? trace : [false], moments: sesMoments.length });
  }
  return resultat;
}

/* « À explorer » (prototype : lists, cardHTML) et les exemples de « Du prompt au projet » : créations
   publiées et visibles (RG-30). « Plus utiles » suit RG-32 (votes des 7 derniers jours glissants),
   « Plus reproduites » les reproductions réussies des 30 derniers jours ; un projet se lit, il ne se
   reproduit pas. */
export async function creationsDeLAccueil(
  db: BaseDeDonnees,
  stockage: Stockage,
  maintenant: Date,
): Promise<CreationsAccueilApi> {
  const semaine = new Date(maintenant.getTime() - 7 * JOUR_MS);
  const mois = new Date(maintenant.getTime() - 30 * JOUR_MS);
  const { rows } = await db.execute<LigneCarte>(sql`
    with publiees as (
      select c.id, c.auteur_id, cr.type_creation, cr.titre, cr.slug, cr.date_publication,
        cat.libelle as categorie, cat.slug as categorie_slug,
        (select count(*) from vote v where v.contenu_id = c.id and v.type_vote_code = 'UTILE')::int
          as utiles,
        (select count(*) from vote v where v.contenu_id = c.id and v.type_vote_code = 'UTILE'
          and v.date_vote > ${semaine})::int as utiles_semaine,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE')::int as reproductions,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE' and r.resultat = 'SUCCES')::int
          as reussites,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE' and r.resultat = 'SUCCES'
          and rc.date_creation > ${mois})::int as reussites_mois
      from creation cr
      join contenu c on c.id = cr.id
      left join categorie cat on cat.id = cr.categorie_id
      where c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
    )
    (select 'utiles' as liste, * from publiees
      order by utiles_semaine desc, utiles desc, date_publication desc, id desc limit ${PAR_LISTE})
    union all
    (select 'recentes', * from publiees order by date_publication desc, id desc limit ${PAR_LISTE})
    union all
    (select 'reproduites', * from publiees where type_creation <> 'PROJET' and reussites > 0
      order by reussites_mois desc, reussites desc, reproductions desc, date_publication desc, id desc
      limit ${PAR_LISTE})
    union all
    (select distinct on (type_creation) 'exemple', * from publiees
      order by type_creation, utiles desc, date_publication desc, id desc)`);

  const uniques = new Map(rows.map((r) => [Number(r.id), r]));
  const creations = [...uniques.values()].map((r) => ({ id: Number(r.id), type: r.type_creation }));
  const [apercus, traces, membres] = await Promise.all([
    apercusDesCreations(db, stockage, creations),
    tracesDes(db, creations),
    resumerMembres(
      db,
      stockage,
      rows.map((r) => Number(r.auteur_id)),
    ),
  ]);

  const carte = (r: LigneCarte): CarteCreationApi => {
    const id = Number(r.id);
    const apercu = apercus.get(id);
    const auteur = membres.get(Number(r.auteur_id));
    if (!auteur) throw new Error(`Membre introuvable : ${r.auteur_id}`);
    const { trace, moments } = traces.get(id) ?? { trace: [false], moments: 0 };
    const reproductible = r.type_creation !== 'PROJET';
    return {
      id,
      slug: r.slug,
      type: r.type_creation,
      titre: r.titre,
      categorie:
        r.categorie && r.categorie_slug ? { libelle: r.categorie, slug: r.categorie_slug } : null,
      auteur,
      outils: apercu?.outils ?? [],
      couverture: apercu?.couverture ?? null,
      resultat: apercu?.resultat ?? null,
      trace,
      moments,
      reproductions: reproductible ? r.reproductions : 0,
      tauxReussite: reproductible ? tauxDeReussite(r.reproductions, r.reussites) : null,
      datePublication: new Date(r.date_publication).toISOString(),
      utilesSemaine: r.utiles_semaine,
      reussitesMois: reproductible ? r.reussites_mois : 0,
    };
  };
  const liste = (nom: LigneCarte['liste']) => rows.filter((r) => r.liste === nom).map(carte);
  return {
    utiles: liste('utiles'),
    recentes: liste('recentes'),
    reproduites: liste('reproduites'),
    exemples: Object.fromEntries(
      rows
        .filter((r) => r.liste === 'exemple')
        .map((r) => [r.type_creation, { id: Number(r.id), slug: r.slug, titre: r.titre }]),
    ),
  };
}
