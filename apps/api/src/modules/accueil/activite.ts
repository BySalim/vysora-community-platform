import {
  BAREME_REPUTATION,
  type ActiviteAccueilApi,
  type ResultatReproduction,
  type TypeCreation,
  type TypeSujet,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import type { BaseDeDonnees } from '../../db/client.js';
import type { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/** Lignes du fil (prototype : huit). */
export const TAILLE_FIL = 8;

type LigneActivite = {
  genre: ActiviteAccueilApi['genre'];
  id: string;
  date: Date | string;
  membre_id: string;
  titre: string | null;
  cible_id: string | null;
  slug: string | null;
  type_creation: TypeCreation | null;
  type_sujet: TypeSujet | null;
  resultat: ResultatReproduction | null;
  outil_id: string | null;
  outil_nom: string | null;
  outil_slug: string | null;
  outil_logo: string | null;
  outil_mono: boolean | null;
  modele: string | null;
};

const adresses = {
  creation: (id: string, slug: string | null) => `/creations/${id}-${slug ?? ''}`,
  sujet: (id: string, slug: string | null) => `/forum/${id}-${slug ?? ''}`,
  defi: (id: string, slug: string | null) => `/defis/${id}-${slug ?? ''}`,
};

/* « Dernières contributions » (prototype : feed) : ce qui vient d'être fait sur Vysora, du plus récent
   au plus ancien. Seules des actions que chacun voit déjà ailleurs y figurent : une publication ou une
   participation à un défi, un essai déclaré (retours de la fiche), une réponse acceptée, un sujet
   ouvert, un badge obtenu (profil). Ni les votes ni les réponses aux cas, qui restent privés (RG-88).
   Contenus visibles de tous (RG-30), membres qui ne sont ni bannis ni supprimés. */
export async function activiteRecente(
  db: BaseDeDonnees,
  stockage: Stockage,
  nombre = TAILLE_FIL,
): Promise<ActiviteAccueilApi[]> {
  const { rows } = await db.execute<LigneActivite>(sql`
    select a.* from (
      select case when cr.defi_id is null then 'publication' else 'participation' end as genre,
        c.id, cr.date_publication as date, c.auteur_id as membre_id,
        coalesce(d.titre, cr.titre) as titre, coalesce(d.id, c.id) as cible_id,
        coalesce(d.slug, cr.slug) as slug, cr.type_creation, null as type_sujet, null as resultat,
        null::bigint as outil_id, null as outil_nom, null as outil_slug, null as outil_logo,
        null::boolean as outil_mono, null as modele
      from creation cr
      join contenu c on c.id = cr.id
      left join defi d on d.id = cr.defi_id
      where c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      union all
      select 'reproduction', rc.id, rc.date_creation, rc.auteur_id, cr.titre, cr.id, cr.slug,
        cr.type_creation, null, r.resultat, o.id, o.nom, o.slug, o.logo, o.logo_monochrome,
        coalesce(m.nom_court, r.modele_non_reference)
      from reproduction r
      join contenu rc on rc.id = r.id
      join creation cr on cr.id = r.creation_id
      join contenu c on c.id = cr.id
      join outil o on o.id = r.outil_id
      left join modele m on m.id = r.modele_id
      where rc.statut = 'VISIBLE' and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      union all
      select 'reponse-acceptee', s.id, s.date_acceptation_reponse, mc.auteur_id, s.titre, s.id,
        s.slug, null, s.type_sujet, null, null, null, null, null, null, null
      from sujet s
      join contenu c on c.id = s.id
      join contenu mc on mc.id = s.message_accepte_id
      where c.statut = 'VISIBLE' and mc.statut = 'VISIBLE'
      union all
      select 'sujet', s.id, c.date_creation, c.auteur_id, s.titre, s.id, s.slug, null, s.type_sujet,
        null, null, null, null, null, null, null
      from sujet s
      join contenu c on c.id = s.id
      where c.statut = 'VISIBLE'
      union all
      select 'badge', ob.badge_id, ob.date_obtention, ob.utilisateur_id, b.libelle, null, null,
        null, null, null, null, null, null, null, null, null
      from obtention_badge ob
      join badge b on b.id = ob.badge_id
    ) a
    join utilisateur u on u.id = a.membre_id
    where u.statut_compte not in ('BANNI', 'SUPPRIME')
    order by a.date desc, a.genre, a.id desc
    limit ${nombre}`);

  const membres = await resumerMembres(
    db,
    stockage,
    rows.map((r) => Number(r.membre_id)),
  );
  return rows.flatMap((r): ActiviteAccueilApi[] => {
    const membre = membres.get(Number(r.membre_id));
    if (!membre) return [];
    const base = {
      // Un badge se repère par son membre : chacun l'obtient une fois (CI-27).
      cle: r.genre === 'badge' ? `badge:${r.membre_id}:${r.id}` : `${r.genre}:${r.id}`,
      genre: r.genre,
      date: new Date(r.date).toISOString(),
      membre,
    };
    switch (r.genre) {
      case 'publication':
      case 'participation':
        return [
          {
            ...base,
            cible: {
              titre: r.titre ?? '',
              href: (r.genre === 'participation' ? adresses.defi : adresses.creation)(
                r.cible_id ?? r.id,
                r.slug,
              ),
            },
            ...(r.type_creation ? { typeCreation: r.type_creation } : {}),
          },
        ];
      case 'reproduction':
        return [
          {
            ...base,
            cible: { titre: r.titre ?? '', href: adresses.creation(r.cible_id ?? '', r.slug) },
            ...(r.resultat ? { resultat: r.resultat } : {}),
            ...(r.outil_id && r.outil_nom && r.outil_slug
              ? {
                  outil: {
                    id: Number(r.outil_id),
                    nom: r.outil_nom,
                    slug: r.outil_slug,
                    logo: r.outil_logo,
                    logoMonochrome: r.outil_mono ?? false,
                  },
                }
              : {}),
            modele: r.modele,
          },
        ];
      case 'reponse-acceptee':
        return [
          {
            ...base,
            cible: { titre: r.titre ?? '', href: adresses.sujet(r.id, r.slug) },
            points: BAREME_REPUTATION.reponseAcceptee,
          },
        ];
      case 'sujet':
        return [
          {
            ...base,
            cible: { titre: r.titre ?? '', href: adresses.sujet(r.id, r.slug) },
            ...(r.type_sujet ? { typeSujet: r.type_sujet } : {}),
          },
        ];
      case 'badge':
        return [{ ...base, cible: null, badge: r.titre ?? '' }];
    }
  });
}
