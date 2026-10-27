import { champRecherche, contientJeton, jetonsRecherche, plierRecherche } from '@vysora/shared';
import { esc, typo } from '../texte';

/* Recherche d'un objectif dans Explorer, reprise de prototype/explorer-modele.js : texte replié
   (sans accents ni ponctuation), mots vides écartés, pluriels simples ramenés au singulier,
   synonymes (@vysora/shared, partagés avec l'API), surlignage des mots trouvés. Utilisable par le
   serveur comme par le navigateur. */

/** Texte replié : un caractère par caractère d'origine, lettres sans accents, le reste en espaces. */
export const plier = plierRecherche;

/** Mots d'une recherche, chacun avec ses variantes (racine, synonymes). */
export const decouper = jetonsRecherche;

/** Un mot de la recherche commence un mot du texte replié (précédé d'une espace). */
export const contient = contientJeton;

/** Texte replié précédé d'une espace, prêt pour `contient`. */
export const champ = champRecherche;

/** Score d'un objectif (prototype : scoreGuide) : 3 par mot trouvé dans son titre ou ses mots-clés,
    1 ailleurs, 0 si un mot manque. Sans recherche, tout correspond. */
export function score(titre: string, texte: string, jetons: string[][]): number {
  if (!jetons.length) return 1;
  let total = 0;
  for (const variantes of jetons) {
    if (contient(titre, variantes)) total += 3;
    else if (contient(texte, variantes)) total += 1;
    else return 0;
  }
  return total;
}

/** Texte échappé, typographie appliquée, les mots trouvés dans <mark> (prototype : highlight). */
export function surligner(texte: string, jetons: string[][]): string {
  const brut = typo(texte);
  if (!jetons.length) return esc(brut);
  const plie = plier(brut);
  const caracteres = Array.from(brut);
  const marques = Array.from({ length: caracteres.length }, () => false);
  for (const variante of jetons.flat()) {
    let depart = 0;
    while (depart < plie.length) {
      const position = plie.indexOf(variante, depart);
      if (position < 0) break;
      if (position === 0 || plie[position - 1] === ' ') {
        let fin = position + variante.length;
        while (fin < plie.length && plie[fin] !== ' ') fin += 1;
        for (let i = position; i < fin; i += 1) marques[i] = true;
      }
      depart = position + 1;
    }
  }
  let html = '';
  let ouvert = false;
  caracteres.forEach((caractere, i) => {
    if (marques[i] && !ouvert) {
      html += '<mark>';
      ouvert = true;
    }
    if (!marques[i] && ouvert) {
      html += '</mark>';
      ouvert = false;
    }
    html += esc(caractere);
  });
  return ouvert ? `${html}</mark>` : html;
}
