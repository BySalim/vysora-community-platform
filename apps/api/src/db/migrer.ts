import { lireConfiguration } from '../config/env.js';
import { migrer } from './migrations.js';

/* pnpm db:migrate : applique les migrations en attente (développement, CI, déploiement). */

const { DATABASE_URL } = lireConfiguration();
await migrer(DATABASE_URL);
console.log('Migrations appliquées.');
