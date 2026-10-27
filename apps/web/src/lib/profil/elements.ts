import type { BadgeObtenuApi, OutilResumeApi, ProfilApi } from '@vysora/shared';
import { embleme } from '../accueil/elements';
import { icone, jourRelatif, logo } from '../explorer/elements';
import { esc, t } from '../texte';

/* Petits éléments du profil (prototype/profil.js : hexagone, emblem, photoHTML, outilHTML, enTete,
   etatVide, dates), utilisés par le serveur et par le script de la page. */

export { icone };

/** Qui regarde le profil. */
export interface ContexteProfil {
  /** Propriétaire connecté, hors aperçu public : progression et actions de modification. */
  prive: boolean;
  /** Propriétaire qui regarde son profil comme les autres membres (?vue=public). */
  apercu: boolean;
  maintenant: Date;
}

const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
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

/** « octobre 2026 » (prototype : moisAnnee). */
export const moisAnnee = (iso: string): string => {
  const d = new Date(iso);
  return `${MOIS_LONGS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** « 1er octobre 2026 » (prototype : dateLongue). */
export const dateLongue = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** « 12 oct. 2026 », ou « 12 oct. » (prototype : V.dateLabel). */
export const dateLabel = (iso: string, avecAnnee = true): string => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}${avecAnnee ? ` ${d.getUTCFullYear()}` : ''}`;
};

/** « aujourd'hui », « hier », « il y a 3 jours », « le 12 oct. » (prototype : V.relativeDay). */
export const jour = (iso: string, maintenant: Date): string => jourRelatif(iso, maintenant);

export const pct = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);

/** Hexagone du niveau (prototype : hexagone). */
export const hexagone = (classe = ''): string =>
  `<svg class="pf-hex${classe ? ` ${classe}` : ''}" viewBox="0 0 56 60" aria-hidden="true"><path d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/></svg>`;

/** Emblème d'un badge, avec une classe en plus (prototype : emblem). */
export const emblemeBadge = (badge: Pick<BadgeObtenuApi, 'icone' | 'ton'>, classe = ''): string =>
  classe ? embleme(badge).replace('class="emblem"', `class="emblem ${classe}"`) : embleme(badge);

/** Photo du membre, ou la silhouette (prototype : photoHTML). */
export function photoHTML(
  membre: Pick<ProfilApi['membre'], 'avatar' | 'nom'>,
  taille: number,
  classe: string,
  prive: boolean,
): string {
  return membre.avatar
    ? `<img class="pf-photo ${classe}" src="${esc(membre.avatar)}" alt="${prive ? 'Votre photo de profil' : t(`Photo de ${membre.nom}`)}" width="${taille}" height="${taille}">`
    : `<span class="pf-photo pf-photo-defaut ${classe}" role="img" aria-label="${prive ? 'Aucune photo de profil' : t(`Profil de ${membre.nom}`)}">${icone('user', '')}</span>`;
}

/** Outil et modèle (prototype : outilHTML). */
export const outilHTML = (outil: OutilResumeApi, modele?: string | null): string =>
  `<span class="pf-outil">${logo(outil)}${t(outil.nom)}${modele ? `<span class="pf-modele"> · ${t(modele)}</span>` : ''}</span>`;

/** En-tête d'une section (prototype : enTete). */
export const enTete = (
  id: string,
  surtitre: string,
  iconeSurtitre: string,
  titre: string,
  compte = '',
  droite = '',
): string => `<div class="pf-tete">
      <div><p class="kicker">${icone(iconeSurtitre)}${t(surtitre)}</p><h2 id="${id}">${t(titre)}${compte !== '' ? ` <span class="pf-nb">${t(compte)}</span>` : ''}</h2></div>
      ${droite ? `<div class="pf-tete-droite">${droite}</div>` : ''}
    </div>`;

/** Section sans contenu (prototype : etatVide). */
export const etatVide = (titre: string, texte: string, action = ''): string =>
  `<div class="pf-vide"><p class="pf-vide-titre">${t(titre)}</p>${texte ? `<p>${t(texte)}</p>` : ''}${action}</div>`;

/** Adresse affichée d'un lien personnel : sans https:// ni barre finale. */
export const lienAffiche = (url: string): string =>
  url.replace(/^https:\/\//, '').replace(/\/$/, '');

/** Prénom d'un nom affiché. */
export const prenom = (nom: string): string => nom.split(' ')[0] ?? nom;
