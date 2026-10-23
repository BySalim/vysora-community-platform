import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type BaseDeDonnees = NodePgDatabase<typeof schema>;

/** Pool PostgreSQL et client Drizzle (noms de colonnes en snake_case, comme les migrations). */
export function creerBaseDeDonnees(url: string): { db: BaseDeDonnees; pool: pg.Pool } {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, pool };
}
