import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Tests de bout en bout : l'application complète sur la base vysora_test (docker compose).
const fichierEnv = resolve(import.meta.dirname, '../../.env');
if (existsSync(fichierEnv)) process.loadEnvFile(fichierEnv);

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/preparation-globale.ts'],
    // Une seule base partagée : les fichiers s'exécutent l'un après l'autre.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      // Aucun appel extérieur pendant les tests : la liste intégrée suffit.
      VERIFICATION_FUITES: 'locale',
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? 'postgres://vysora:vysora@localhost:5432/vysora_test',
    },
  },
});
