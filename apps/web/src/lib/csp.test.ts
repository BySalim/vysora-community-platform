import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/* La politique de sécurité du contenu (astro.config.mjs) n'autorise un script en ligne que par son
   empreinte : celle du script « is:inline » du gabarit doit suivre son texte, sinon il est bloqué en
   production (la page perd sa classe « js » et son niveau d'animation). */

const lire = (chemin: string) => readFileSync(resolve(import.meta.dirname, chemin), 'utf8');

describe('Politique de sécurité du contenu', () => {
  it('autorise le script en ligne du gabarit par son empreinte', () => {
    const gabarit = lire('../layouts/Base.astro');
    const scripts = [...gabarit.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(
      (m) => m[1] ?? '',
    );
    expect(scripts).toHaveLength(1);
    const empreintes = scripts.map(
      (texte) => `sha256-${createHash('sha256').update(texte).digest('base64')}`,
    );
    const configuration = lire('../../astro.config.mjs');
    for (const empreinte of empreintes) expect(configuration).toContain(empreinte);
  });
});
