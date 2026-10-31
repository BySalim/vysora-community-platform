import { lireConfiguration } from '../../config/env.js';
import { StockageDisque } from '../../modules/medias/stockage-disque.js';
import { creerBaseDeDonnees } from '../client.js';
import { chargerDemo, decrireBilan } from './charger.js';
import { MOT_DE_PASSE_DEMO } from './identifiants.js';

/* pnpm db:demo : charge les données de démonstration (développement et préproduction), après pnpm db:seed.
   Refusé en production (NODE_ENV=production sans ENVIRONNEMENT=preproduction) ; relancé, il n'ajoute
   que ce qui manque. */

const config = lireConfiguration();
const environnement = config.ENVIRONNEMENT === 'preproduction' ? 'preproduction' : config.NODE_ENV;
if (environnement === 'production') {
  console.error('Données de démonstration refusées : NODE_ENV vaut production.');
  process.exit(1);
}
// Une préproduction est en ligne : le mot de passe du dépôt, public, ouvrirait les comptes d'équipe.
const motDePasse = config.MOT_DE_PASSE_DEMO || undefined;
if (
  environnement === 'preproduction' &&
  (!motDePasse || motDePasse.length < 16 || motDePasse === MOT_DE_PASSE_DEMO)
) {
  console.error(
    'Données de démonstration refusées : en préproduction, MOT_DE_PASSE_DEMO doit être propre au serveur (16 caractères au moins).',
  );
  process.exit(1);
}

const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
try {
  const stockage = new StockageDisque(config.STOCKAGE_DOSSIER);
  console.log(decrireBilan(await chargerDemo(db, { environnement, stockage, motDePasse })));
} finally {
  await pool.end();
}
