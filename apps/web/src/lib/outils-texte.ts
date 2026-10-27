import type { OutilApi } from '@vysora/shared';
import { logo } from './explorer/elements';
import { esc, typo } from './texte';

/* Logos des outils dans un texte (prototype/app.js et commun.js : withLogos). Le premier nom d'outil
   ou d'alias (« GPT-5 » pour ChatGPT) reçoit son logo, les suivants restent du texte. */

export type OutilNomme = Pick<OutilApi, 'nom' | 'logo' | 'logoMonochrome' | 'alias'>;

const MOT = /[0-9A-Za-zÀ-ÿ]/;

/** Fonction qui insère les logos des outils du référentiel dans un texte (typographie et
    échappement compris). */
export function avecLogos(outils: readonly OutilNomme[]): (texte: string) => string {
  const cles = [
    ...outils.map((o) => [o.nom, o] as const),
    ...outils.flatMap((o) => o.alias.map((alias) => [alias, o] as const)),
  ].toSorted((a, b) => b[0].length - a[0].length);
  return (texte) => {
    const brut = typo(texte);
    const vus = new Set<string>();
    let html = '';
    let simple = '';
    let i = 0;
    while (i < brut.length) {
      const trouve = MOT.test(brut[i - 1] ?? ' ')
        ? undefined
        : cles.find(([cle]) => brut.startsWith(cle, i) && !MOT.test(brut[i + cle.length] ?? ' '));
      if (!trouve) {
        simple += brut[i];
        i += 1;
        continue;
      }
      const [cle, outil] = trouve;
      html += esc(simple);
      simple = '';
      if (vus.has(outil.nom)) html += esc(cle);
      else {
        vus.add(outil.nom);
        html += `<span class="tool-ref">${logo(outil)}${esc(cle)}</span>`;
      }
      i += cle.length;
    }
    return html + esc(simple);
  };
}
