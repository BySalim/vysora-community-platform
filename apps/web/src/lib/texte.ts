/* Texte et nombres, repris de prototype/commun.js : mêmes règles de typographie française,
   utilisables côté serveur (composants Astro) comme dans les scripts des pages. */

const ECHAPPEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Échappe une valeur avant de l'insérer dans du HTML construit à la main. */
export const esc = (valeur: unknown): string =>
  String(valeur).replace(/[&<>"']/g, (c) => ECHAPPEMENTS[c] ?? c);

/** Espaces insécables de la typographie française (deux-points, guillemets, ponctuation haute, nombres). */
export const typo = (valeur: unknown): string =>
  String(valeur)
    .replace(/ ([:»])/g, ' $1')
    .replace(/ ([;!?])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1 $2')
    .replace(/(\d) (%|FCFA|min|h|j|s|points|px|Mo)(?![\wÀ-ÿ])/g, '$1 $2');

/** Typographie puis échappement : pour tout texte inséré dans un gabarit HTML. */
export const t = (valeur: unknown): string => esc(typo(valeur));

const formatNombre = new Intl.NumberFormat('fr-FR');
export const fmt = (valeur: number): string => formatNombre.format(valeur);
export const pluriel = (nombre: number, un: string, plusieurs: string): string =>
  `${fmt(nombre)} ${nombre > 1 ? plusieurs : un}`;

/** Forme comparable d'un texte : sans accents, en minuscules. */
export const normaliser = (valeur: unknown): string =>
  String(valeur ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
