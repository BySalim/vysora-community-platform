import { lireConfiguration } from '../../config/env.js';
import { creerBaseDeDonnees } from '../client.js';
import { semer } from './semer.js';

/* pnpm db:seed : charge ou met à jour les référentiels (idempotent). */

const { db, pool } = creerBaseDeDonnees(lireConfiguration().DATABASE_URL);
try {
  await semer(db);
  console.log('Référentiels chargés.');
} finally {
  await pool.end();
}
