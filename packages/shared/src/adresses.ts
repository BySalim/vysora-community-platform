/* Adresses internes au site : seule une page de Vysora est acceptée comme destination après la
   connexion, l'inscription ou un aller-retour vers GitHub et Google. Jamais de redirection vers un
   autre site (redirection ouverte). Le site et l'API appliquent la même règle. */

/** Pages vers lesquelles revenir n'a pas de sens. */
const EXCLUES = ['/connexion', '/inscription', '/api'];

/** Chemin interne sûr (« /forum?type=question ») ou null. */
export function cheminInterne(brut: string | null | undefined): string | null {
  if (!brut || !brut.startsWith('/') || brut.startsWith('//') || brut.startsWith('/\\'))
    return null;
  try {
    const base = 'https://vysora.invalid';
    const url = new URL(brut, base);
    if (url.origin !== base) return null;
    if (EXCLUES.some((exclue) => url.pathname === exclue || url.pathname.startsWith(`${exclue}/`)))
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** « Pour enregistrer cette création » : texte court, sans retour à la ligne. */
export const motifArrivee = (brut: string | null | undefined): string =>
  (brut ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
