import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { creerBaseDeDonnees } from './client.js';

/** Dossier des migrations versionnées (générées par drizzle-kit, plus les migrations manuelles). */
export const DOSSIER_MIGRATIONS = resolve(import.meta.dirname, '../../drizzle');

/** Applique les migrations en attente sur la base désignée. */
export async function migrer(url: string): Promise<void> {
  const { db, pool } = creerBaseDeDonnees(url);
  try {
    await migrate(db, { migrationsFolder: DOSSIER_MIGRATIONS });
  } finally {
    await pool.end();
  }
}
