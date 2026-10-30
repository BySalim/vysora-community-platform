import { pluriel } from '../texte';

/* Dates du forum, reprises de prototype/forum.js (ago, waited) : « il y a 12 min », « hier »,
   « le 12 oct. ». Les jours se comptent en jours civils UTC, comme le reste du site. */

const MOIS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const JOUR = 86_400_000;
const jourUtc = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const minutes = (iso: string, maintenant: Date): number =>
  Math.max(0, Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000));
const joursCivils = (iso: string, maintenant: Date): number =>
  Math.round((jourUtc(maintenant) - jourUtc(new Date(iso))) / JOUR);

/** « 12 oct. 2026 », ou « 12 oct. » (prototype : dateLabel). */
export function dateCourte(iso: string, avecAnnee = true): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}${avecAnnee ? ` ${d.getUTCFullYear()}` : ''}`;
}

/** Moment d'une action (prototype : ago). */
export function ilYA(iso: string, maintenant: Date): string {
  const m = minutes(iso, maintenant);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const jours = joursCivils(iso, maintenant);
  if (jours <= 0) return `il y a ${Math.floor(m / 60)} h`;
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  return `le ${dateCourte(iso, false)}`;
}

/** Temps d'attente d'un sujet sans réponse (prototype : waited). */
export function attente(iso: string, maintenant: Date): string {
  const m = minutes(iso, maintenant);
  if (m < 60) return `${Math.max(1, m)} min`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} h`;
  return pluriel(Math.floor(m / 1440), 'jour', 'jours');
}
