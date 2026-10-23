/** Partie lisible d'une adresse : minuscules, sans accents, mots séparés par des tirets. */
export function slugifier(texte: string, longueurMax = 80): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, longueurMax)
    .replace(/-+$/g, '');
}
