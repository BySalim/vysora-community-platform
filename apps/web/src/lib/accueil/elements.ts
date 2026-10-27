import type { BadgeApi, MembreResumeApi, OutilEtModelesApi, OutilResumeApi } from '@vysora/shared';
import { icone, jourRelatif, logo } from '../explorer/elements';
import { esc, t } from '../texte';

/* Petits éléments de l'accueil (prototype/app.js : avatar, emblem, timeLabel), utilisés par le serveur
   et par le script de la page. */

/** Photo d'un membre avec les classes du prototype (« avatar avatar-sm »), ou la silhouette. */
export function avatar(membre: Pick<MembreResumeApi, 'avatar'>, taille = 28, classe = ''): string {
  const classes = `avatar${classe ? ` ${classe}` : ''}`;
  return membre.avatar
    ? `<img class="${classes}" src="${esc(membre.avatar)}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="${classes} compte-avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icone('user', '')}</span>`;
}

const TONS: Record<BadgeApi['ton'], string> = {
  BLEU: 'blue',
  VERT: 'green',
  AMBRE: 'amber',
  ENCRE: 'ink',
};

/** Emblème hexagonal d'un badge (prototype : emblem). */
export const embleme = (badge: Pick<BadgeApi, 'icone' | 'ton'>): string =>
  `<span class="emblem" data-tone="${TONS[badge.ton]}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icone(badge.icone, '')}</span>`;

/** Outil et modèle d'un sujet ou d'un essai, logo compris : « Midjourney · v7 », ou « Midjourney v7 »
    avec un autre séparateur. */
export const outilEtModele = (
  outil: OutilResumeApi | null | undefined,
  modele?: string | null,
  separateur = ' · ',
) =>
  outil
    ? `<span class="tool-ref">${logo(outil)}${t(outil.nom)}</span>${modele ? t(`${separateur}${modele}`) : ''}`
    : '';

/** Outils d'un parcours (prototype : config, « n8n et Claude · Haiku 4.5 »). */
export const outilsDuParcours = (outils: OutilEtModelesApi[]): string =>
  outils
    .map(({ outil, modeles }) => outilEtModele(outil, modeles.length ? modeles.join(', ') : null))
    .join(t(' et '));

/** « à l'instant », « il y a 12 min », « il y a 3 h », puis « hier », « il y a 3 jours », « le 12 oct. »
    (prototype : timeLabel, published). */
export function ilYa(iso: string, maintenant: Date): string {
  const minutes = Math.floor((maintenant.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.floor(minutes / 60)} h`;
  return jourRelatif(iso, maintenant);
}

/** Durée d'une résolution : « 40 min », « 2 h », « 3 jours ». */
export function duree(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 48) return `${heures} h`;
  return `${Math.round(heures / 24)} jours`;
}
