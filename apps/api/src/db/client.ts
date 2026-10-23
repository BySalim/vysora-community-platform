import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type BaseDeDonnees = NodePgDatabase<typeof schema>;
/** Transaction en cours (db.transaction(async (tx) => …)). */
export type Transaction = Parameters<Parameters<BaseDeDonnees['transaction']>[0]>[0];
/** Client ou transaction : un service qui écrit accepte l'un ou l'autre, pour s'inscrire dans une transaction plus large. */
export type Executeur = BaseDeDonnees | Transaction;

/** Pool PostgreSQL et client Drizzle (noms de colonnes en snake_case, comme les migrations). */
export function creerBaseDeDonnees(url: string): { db: BaseDeDonnees; pool: pg.Pool } {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, pool };
}
