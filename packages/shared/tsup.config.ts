import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2023',
  dts: true,
  sourcemap: true,
  // En mode surveillance, ne pas vider dist : l'API qui démarre en parallèle y lit le paquet.
  clean: !options.watch,
}));
