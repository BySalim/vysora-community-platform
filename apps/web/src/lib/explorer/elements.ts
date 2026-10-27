import {
  srcsetImage,
  type MediaApi,
  type MembreResumeApi,
  type OutilResumeApi,
  type TypeCreation,
} from '@vysora/shared';
import { ICONES_TYPE, LIBELLES_TYPE } from '../creations';
import { esc, fmt, pluriel, t } from '../texte';

/* Petits éléments des pages d'Explorer, repris de prototype/commun.js (icon, avatar, logo, typeTag,
   mediaHTML, relativeDay) et d'explorer-modele.js (toolsLine, shareHTML, kicker). Ils produisent du
   HTML : le serveur rend la page avec, le script la met à jour avec les mêmes. */

export { esc, fmt, pluriel, t };

/** Icône du sprite de la page. */
export const icone = (nom: string, classe = 'icon-sm'): string =>
  `<svg class="icon${classe ? ` ${classe}` : ''}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;

/** Photo d'un membre (classe « avatar » du prototype), ou la silhouette par défaut. */
export function avatar(membre: Pick<MembreResumeApi, 'avatar'>, taille = 28): string {
  return membre.avatar
    ? `<img class="avatar" src="${esc(membre.avatar)}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icone('user', '')}</span>`;
}

/** Logo d'un outil (assets/logos-ia), rien s'il n'en a pas. */
export function logo(
  outil: Pick<OutilResumeApi, 'logo' | 'logoMonochrome'> | undefined,
  taille = 16,
): string {
  if (!outil?.logo) return '';
  return `<img class="tool-logo${outil.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(outil.logo)}.svg" alt="" width="${taille}" height="${taille}" decoding="async">`;
}

/** « Claude · Sonnet 4.5 + ChatGPT · GPT-5 » (prototype : toolsLine). */
export const ligneOutils = (outils: { outil: OutilResumeApi; modele: string | null }[]): string =>
  outils
    .map(
      ({ outil, modele }) =>
        `<span class="tool-ref">${logo(outil)}${t(modele ? `${outil.nom} · ${modele}` : outil.nom)}</span>`,
    )
    .join('<span class="ex-plus">+</span>');

const CLE_TYPE: Record<TypeCreation, string> = {
  UN_PROMPT: 'prompt',
  ITERATION: 'iteration',
  PROJET: 'projet',
};

/** Type d'une création : « 1 prompt », « Itération », « Projet ». */
export const etiquetteType = (type: TypeCreation): string =>
  `<span class="type-tag" data-type="${CLE_TYPE[type]}">${icone(ICONES_TYPE[type])}${LIBELLES_TYPE[type]}</span>`;

/** Image d'un résultat (prototype : mediaHTML), aux dimensions reçues de l'API. */
export function image(media: MediaApi | null, tailles: string, texteAlternatif = true): string {
  if (!media) return '';
  return `<img src="${esc(media.url)}" srcset="${esc(srcsetImage(media))}" sizes="${esc(tailles)}" width="${media.largeur}" height="${media.hauteur}" alt="${texteAlternatif ? t(media.texteAlternatif) : ''}" loading="lazy" decoding="async">`;
}

const JOUR = 86_400_000;
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
const jourUtc = (iso: string | Date): number => {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** « 12 oct. » (prototype : dateLabel sans l'année). */
export const dateCourteSansAnnee = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
};

/** « aujourd'hui », « hier », « il y a 3 jours », sinon « le 12 oct. » (prototype : relativeDay). */
export function jourRelatif(iso: string, maintenant: Date): string {
  const n = Math.round((jourUtc(maintenant) - jourUtc(iso)) / JOUR);
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'hier';
  if (n < 7) return `il y a ${n} jours`;
  return `le ${dateCourteSansAnnee(iso)}`;
}

/** Points « sur 4 parcours » (prototype : shareHTML). */
export function part(sources: number, total: number): string {
  const points = Array.from(
    { length: total },
    (_, i) => `<i${i < sources ? ' class="on"' : ''}></i>`,
  ).join('');
  return `<span class="ex-share"><span class="ex-dots" aria-hidden="true">${points}</span>${sources === total ? `dans les ${total} parcours` : `dans ${sources} parcours sur ${total}`}</span>`;
}

/** Surtitre de section (prototype : kicker). */
export const surtitre = (nom: string, libelle: string): string =>
  `<p class="kicker">${icone(nom, '')}${t(libelle)}</p>`;

export const lecteurEcran = (texte: string): string => `<span class="sr-only">${t(texte)}</span>`;

/** Prénom d'un nom affiché (« Aïssatou » pour « Aïssatou Ndiaye »). */
export const prenom = (nom: string): string => nom.split(' ')[0] ?? nom;
