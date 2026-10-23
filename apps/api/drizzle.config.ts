import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit s'exécute depuis apps/api (pnpm --filter) : le fichier .env est à la racine du dépôt.
const fichierEnv = resolve(process.cwd(), '../../.env');
if (existsSync(fichierEnv)) process.loadEnvFile(fichierEnv);

// Les migrations sont générées depuis le schéma TypeScript (pnpm db:generate), relues, puis versionnées.
// Ce que Drizzle ne sait pas décrire (contraintes différées, déclencheurs, recherche plein texte)
// va dans une migration manuelle : pnpm --filter @vysora/api exec drizzle-kit generate --custom --name <nom>.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://vysora:vysora@localhost:5432/vysora',
  },
  strict: true,
  verbose: true,
});
