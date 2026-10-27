import { Inject, Injectable } from '@nestjs/common';
import type { RechercheCreationsApi, TypeCreation } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';

/** Prototype (explorer.js) : six parcours au plus sous les guides. */
const RESULTATS = 6;

/* DEC-01, RG-31 : recherche plein texte dans les documents des créations publiées et visibles
   (configuration « vysora_fr »), les plus pertinentes d'abord. Chaque résultat indique le guide qui
   le présente (« dans le guide Prise de rendez-vous en ligne »). */
@Injectable()
export class RechercheService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async creations(q: string): Promise<RechercheCreationsApi> {
    const requete = sql`websearch_to_tsquery('vysora_fr', ${q})`;
    const { rows } = await this.db.execute<{
      id: string;
      slug: string | null;
      type_creation: TypeCreation;
      titre: string;
      guide_slug: string | null;
      guide_titre: string | null;
    }>(sql`
      select c.id, c.slug, c.type_creation, c.titre, g.slug as guide_slug, g.titre_court as guide_titre
      from recherche_document r
      join creation c on c.id = r.contenu_id
      join contenu co on co.id = c.id
      left join lateral (
        select g.slug, g.titre_court from guide_contenu gc join guide g on g.id = gc.guide_id
        where gc.contenu_id = c.id and g.date_publication is not null
        order by g.id limit 1
      ) g on true
      where co.statut = 'VISIBLE' and c.statut_publication = 'PUBLIEE' and r.vecteur @@ ${requete}
      order by ts_rank(r.vecteur, ${requete}) desc, c.date_publication desc, c.id desc
      limit ${RESULTATS}`);
    return {
      elements: rows.map((r) => ({
        id: Number(r.id),
        slug: r.slug,
        type: r.type_creation,
        titre: r.titre,
        guide:
          r.guide_slug && r.guide_titre ? { slug: r.guide_slug, titreCourt: r.guide_titre } : null,
      })),
    };
  }
}
