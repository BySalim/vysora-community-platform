import { sql } from 'drizzle-orm';
import type { BaseDeDonnees } from '../../db/client.js';
import { documentLegal } from '../../db/schema/index.js';

/** RG-03, RG-112 : versions en vigueur (date d'effet atteinte, la plus récente par type) qui s'acceptent.
    La politique de confidentialité informe sans s'accepter (prototype ; point à trancher du registre). */
export async function documentsAAccepter(
  db: Pick<BaseDeDonnees, 'selectDistinctOn'>,
): Promise<{ id: number }[]> {
  const enVigueur = await db
    .selectDistinctOn([documentLegal.type], {
      id: documentLegal.id,
      acceptationRequise: documentLegal.acceptationRequise,
    })
    .from(documentLegal)
    .where(sql`${documentLegal.dateEffet} <= current_date`)
    .orderBy(documentLegal.type, sql`${documentLegal.dateEffet} desc`);
  return enVigueur.filter((document) => document.acceptationRequise).map(({ id }) => ({ id }));
}
