/* Périodes de l'accueil (ACC-01), en temps universel comme le classement de la semaine (RG-87). */

export const JOUR_MS = 86_400_000;

/** Minuit (UTC) du jour de `date`. */
export const minuitUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** Lundi 00:00 (UTC) de la semaine de `date` (RG-87). */
export function lundiUtc(date: Date): Date {
  const minuit = minuitUtc(date);
  const depuisLundi = (minuit.getUTCDay() + 6) % 7;
  return new Date(minuit.getTime() - depuisLundi * JOUR_MS);
}

/** Jour au format AAAA-MM-JJ. */
export const jourIso = (date: Date): string => date.toISOString().slice(0, 10);

/** « Interactions d'apprentissage » (prototype : activity) : du lundi trois semaines avant la
    semaine en cours jusqu'à aujourd'hui, journée en cours comprise. */
export function joursDeLaCourbe(maintenant: Date): string[] {
  const debut = lundiUtc(maintenant).getTime() - 21 * JOUR_MS;
  const nombre = Math.round((minuitUtc(maintenant).getTime() - debut) / JOUR_MS) + 1;
  return Array.from({ length: nombre }, (_, i) => jourIso(new Date(debut + i * JOUR_MS)));
}

/** Contraintes d'un défi, une par ligne, sans leur puce Markdown. */
export const reglesDuDefi = (contraintes: string | null): string[] =>
  (contraintes ?? '')
    .split('\n')
    .map((ligne) => ligne.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
