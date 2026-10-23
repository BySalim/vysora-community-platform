/* Résumé lisible de l'appareil d'une session (« Chrome sur Windows »), pour la liste des appareils
   connectés des paramètres (prototype/parametres-data.js). L'en-tête User-Agent complet n'est pas conservé. */

const NAVIGATEURS: [RegExp, string][] = [
  [/Edg(A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMES: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Macintosh|Mac OS X/, 'macOS'],
  [/Ubuntu/, 'Ubuntu'],
  [/Linux/, 'Linux'],
];

const trouver = (texte: string, motifs: [RegExp, string][]) =>
  motifs.find(([motif]) => motif.test(texte))?.[1];

export function resumerAppareil(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const navigateur = trouver(userAgent, NAVIGATEURS);
  const systeme = trouver(userAgent, SYSTEMES);
  if (navigateur && systeme) return `${navigateur} sur ${systeme}`;
  return navigateur ?? systeme ?? null;
}
