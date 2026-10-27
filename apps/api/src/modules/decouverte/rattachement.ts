import { champRecherche, contientJeton, jetonsRecherche } from '@vysora/shared';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { Executeur } from '../../db/client.js';
import { guide, guideContenu } from '../../db/schema/index.js';

/* DEC-01 : une création publiée rejoint le guide de son objectif (prototype, nouvelle-creation.js :
   guide ; « Votre création rejoint le guide… »). Le rapprochement est celui du prototype : chaque
   mot fort du titre, de l'objectif et des étiquettes compte 2 s'il est dans le titre ou les mots-clés
   d'un guide, 1 s'il est ailleurs dans le guide ; le domaine commun ajoute 1 ; il faut 2 au moins.
   L'équipe garde la main sur la méthode et les pièges ; elle retire un parcours mal rangé. */

/** Mots trop généraux pour rapprocher une création d'un guide (prototype : MOTS_VIDES). */
// prettier-ignore
const MOTS_GENERAUX = new Set([
  'san', 'sans', 'tout', 'tou', 'tous', 'plus', 'tres', 'votre', 'vos', 'notre', 'nos', 'faire', 'fait',
  'cette', 'entre', 'chaque', 'comme', 'avoir', 'etre', 'leur', 'leurs', 'deux', 'trois',
]);

export interface CreationARanger {
  titre: string;
  objectif: string;
  etiquettes: string[];
  /** Adresse de la catégorie. */
  categorie: string | null;
}

export interface GuideCandidat {
  id: number;
  domaine: string;
  /** Titre, nom court et mots-clés. */
  cles: string;
  /** Tout le guide : étapes, pièges, parcours, leurs étiquettes et leurs outils. */
  texte: string;
}

/** Guide le plus proche d'une création, ou null si aucun ne l'est assez. */
export function guideLePlusProche(c: CreationARanger, guides: GuideCandidat[]): number | null {
  const vus = new Set<string>();
  const forts = jetonsRecherche(`${c.titre} ${c.objectif} ${c.etiquettes.join(' ')}`).filter(
    (variantes) => {
      const cle = variantes.join('/');
      const [mot = ''] = variantes;
      if (vus.has(cle) || MOTS_GENERAUX.has(mot) || mot.length < 4) return false;
      vus.add(cle);
      return true;
    },
  );
  if (!forts.length) return null;
  let meilleur: number | null = null;
  let note = 0;
  for (const g of guides) {
    const cles = champRecherche(g.cles);
    const texte = champRecherche(g.texte);
    const n = forts.reduce(
      (total, v) => total + (contientJeton(cles, v) ? 2 : contientJeton(texte, v) ? 1 : 0),
      0,
    );
    const total = n + (c.categorie && g.domaine === c.categorie ? 1 : 0);
    if (n && total > note) {
      meilleur = g.id;
      note = total;
    }
  }
  return note >= 2 ? meilleur : null;
}

/** À la publication : la création rejoint le guide le plus proche, si elle n'est dans aucun guide
    publié (une nouvelle publication après un retour en brouillon la laisse où elle était). */
export async function rattacherAuGuide(db: Executeur, creationId: number): Promise<number | null> {
  const [deja] = await db
    .select({ id: guide.id })
    .from(guideContenu)
    .innerJoin(guide, eq(guide.id, guideContenu.guideId))
    .where(and(eq(guideContenu.contenuId, creationId), isNotNull(guide.datePublication)))
    .limit(1);
  if (deja) return deja.id;

  const [creation] = (
    await db.execute<{
      titre: string;
      objectif: string;
      categorie: string | null;
      etiquettes: string[] | null;
    }>(sql`
      select c.titre, c.objectif, cat.slug as categorie,
        (select array_agg(e.libelle) from contenu_etiquette ce join etiquette e on e.id = ce.etiquette_id
          where ce.contenu_id = c.id) as etiquettes
      from creation c left join categorie cat on cat.id = c.categorie_id
      where c.id = ${creationId}`)
  ).rows;
  if (!creation) return null;
  const { rows: guides } = await db.execute<{
    id: string;
    domaine: string;
    cles: string;
    texte: string;
  }>(sql`
    select g.id, cat.slug as domaine,
      concat_ws(' ', g.titre, g.titre_court, array_to_string(g.mots_cles, ' ')) as cles,
      concat_ws(' ', cat.libelle,
        (select string_agg(ge.titre, ' ') from guide_etape ge where ge.guide_id = g.id),
        (select string_agg(gp.titre, ' ') from guide_piege gp where gp.guide_id = g.id),
        (select string_agg(concat_ws(' ', cr.titre,
            (select string_agg(et.libelle, ' ') from contenu_etiquette ce
              join etiquette et on et.id = ce.etiquette_id where ce.contenu_id = cr.id),
            (select string_agg(o.nom, ' ') from configuration_ia ci join etape e on e.id = ci.etape_id
              join outil o on o.id = ci.outil_id where e.creation_id = cr.id)), ' ')
          from guide_contenu gc join creation cr on cr.id = gc.contenu_id
          join contenu co on co.id = cr.id
          where gc.guide_id = g.id and co.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE')
      ) as texte
    from guide g join categorie cat on cat.id = g.categorie_id
    where g.date_publication is not null
    order by g.id`);
  const choisi = guideLePlusProche(
    {
      titre: creation.titre,
      objectif: creation.objectif,
      etiquettes: creation.etiquettes ?? [],
      categorie: creation.categorie,
    },
    guides.map((g) => ({ ...g, id: Number(g.id) })),
  );
  if (choisi === null) return null;
  await db
    .insert(guideContenu)
    .values({
      guideId: choisi,
      contenuId: creationId,
      ordre: sql`(select coalesce(max(gc.ordre), 0) + 1 from guide_contenu gc where gc.guide_id = ${choisi})`,
    })
    .onConflictDoNothing();
  return choisi;
}
