import { lireConfiguration } from '../../config/env.js';
import { creerBaseDeDonnees } from '../client.js';
import { chargerDemo, decrireBilan } from './charger.js';

/* pnpm db:demo : charge les données de démonstration (développement et préproduction), après pnpm db:seed.
   Refusé en production ; relancé, il n'ajoute que ce qui manque. */

const config = lireConfiguration();
if (config.NODE_ENV === 'production') {
  console.error('Données de démonstration refusées : NODE_ENV vaut production.');
  process.exit(1);
}

const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
try {
  console.log(decrireBilan(await chargerDemo(db, { environnement: config.NODE_ENV })));
} finally {
  await pool.end();
}
