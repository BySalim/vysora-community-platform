import { defineConfig } from 'vitest/config';

// Tests unitaires : services et règles, sans base de données (fichiers *.spec.ts dans src).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
