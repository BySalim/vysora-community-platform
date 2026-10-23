import pg from 'pg';
import { creerBaseDeDonnees } from '../src/db/client.js';
import { migrer } from '../src/db/migrations.js';
import { semer } from '../src/db/seed/semer.js';

/* Avant les tests de bout en bout : la base de test est recréée à partir des migrations,
   puis les référentiels sont chargés. Refuse toute base dont le nom ne contient pas « test ». */
export default async function preparer(): Promise<void> {
  const url =
    process.env.DATABASE_URL_TEST ?? 'postgres://vysora:vysora@localhost:5432/vysora_test';
  if (!new URL(url).pathname.includes('test')) {
    throw new Error(
      `Base de test refusée (${new URL(url).pathname}) : son nom doit contenir « test ».`,
    );
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('drop schema if exists drizzle cascade');
  await client.query('drop schema public cascade');
  await client.query('create schema public');
  await client.end();

  await migrer(url);
  const { db, pool } = creerBaseDeDonnees(url);
  try {
    await semer(db);
  } finally {
    await pool.end();
  }
}
