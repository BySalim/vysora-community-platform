import pg from 'pg';
import { lireConfiguration } from '../config/env.js';
import { creerBaseDeDonnees } from './client.js';
import { migrer } from './migrations.js';
import { semer } from './seed/semer.js';

/* pnpm db:reset : efface la base de développement, la recrée à partir des migrations puis la remplit.
   Refusé en production. */

const config = lireConfiguration();
if (config.NODE_ENV === 'production') {
  console.error('Réinitialisation refusée : NODE_ENV vaut production.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: config.DATABASE_URL });
await client.connect();
await client.query('drop schema if exists drizzle cascade');
await client.query('drop schema public cascade');
await client.query('create schema public');
await client.query('drop text search configuration if exists vysora_fr');
await client.end();

await migrer(config.DATABASE_URL);
const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
try {
  await semer(db);
} finally {
  await pool.end();
}
console.log('Base réinitialisée : migrations appliquées et référentiels chargés.');
