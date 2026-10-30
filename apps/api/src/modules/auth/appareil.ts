/* Résumé lisible de l'appareil d'une session (« Chrome sur Windows »), montré dans la liste des
   appareils connectés (paramètres). Seul ce résumé est conservé, jamais l'en-tête User-Agent complet. */

const NAVIGATEURS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
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
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const trouver = (texte: string, liste: [RegExp, string][]) =>
  liste.find(([motif]) => motif.test(texte))?.[1];

export function resumerAppareil(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const navigateur = trouver(userAgent, NAVIGATEURS);
  const systeme = trouver(userAgent, SYSTEMES);
  if (navigateur && systeme) return `${navigateur} sur ${systeme}`;
  return navigateur ?? systeme ?? null;
}
