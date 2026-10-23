// Rassemble les icônes du prototype (sprites <symbol id="i-…"> de chaque page et ICONES de commun.js)
// dans un registre unique pour le site : apps/web/src/lib/icones.ts.
// Usage : node scripts/extraire-icones.mjs   (à relancer si le prototype ajoute des icônes)
// Une même icône dessinée différemment selon les pages est signalée : la première rencontrée est gardée.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PROTOTYPE = 'prototype';
const SORTIE = 'apps/web/src/lib/icones.ts';

const icones = new Map();
const conflits = [];
const ajouter = (nom, viewBox, corps, source) => {
  const propre = corps.replace(/\s+/g, ' ').trim();
  const existante = icones.get(nom);
  if (!existante) icones.set(nom, { viewBox, corps: propre, source });
  else if (existante.corps !== propre || existante.viewBox !== viewBox)
    conflits.push(`${nom} : ${existante.source} ≠ ${source}`);
};

const pages = readdirSync(PROTOTYPE)
  .filter((f) => f.endsWith('.html'))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
for (const page of pages) {
  const html = readFileSync(join(PROTOTYPE, page), 'utf8');
  for (const [, nom, viewBox, corps] of html.matchAll(
    /<symbol id="i-([\w-]+)" viewBox="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g,
  )) {
    ajouter(nom, viewBox, corps, page);
  }
}

const commun = readFileSync(join(PROTOTYPE, 'commun.js'), 'utf8');
const blocIcones = commun.match(/const ICONES = \{([\s\S]*?)\n  \};/)?.[1] ?? '';
for (const [, nom, corps] of blocIcones.matchAll(/^\s*'?([\w-]+)'?: '(.*)',?$/gm)) {
  ajouter(nom, '0 0 24 24', corps, 'commun.js');
}

const lignes = [...icones.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([nom, { viewBox, corps }]) =>
      `  '${nom}': { viewBox: '${viewBox}', corps: '${corps.replaceAll("'", "\\'")}' },`,
  );

writeFileSync(
  SORTIE,
  `/* Registre des icônes du site, extrait du prototype par scripts/extraire-icones.mjs.
   Chaque page inclut les symboles qu'elle utilise (composant Sprite) et les référence par <use href="#i-nom">.
   Pour une nouvelle icône : l'ajouter ici (tracé SVG sur une grille de 24 × 24, trait sans remplissage). */

export interface Icone {
  viewBox: string;
  corps: string;
}

export const ICONES: Record<string, Icone> = {
${lignes.join('\n')}
};
`,
);

console.log(`${icones.size} icônes écrites dans ${SORTIE}.`);
if (conflits.length)
  console.log(
    `Icônes dessinées différemment selon les pages (première version gardée) :\n  ${conflits.join('\n  ')}`,
  );
