import { LIBELLES_TYPE_SUJET, type ActiviteAccueilApi, type TypeSujet } from '@vysora/shared';
import { LIBELLES_TYPE } from '../creations';
import { icone, logo } from '../explorer/elements';
import { esc, t } from '../texte';
import { avatar, ilYa } from './elements';

/* « Dernières contributions » (prototype/app.js : feed, feedHTML, TONE, tagIcon). */

const ISSUES: Record<NonNullable<ActiviteAccueilApi['resultat']>, string> = {
  SUCCES: 'Succès',
  PARTIEL: 'Partiel',
  ECHEC: 'Échec',
};

const SUJETS: Record<TypeSujet, { action: string; etiquette: string; icone: string }> = {
  QUESTION: { action: 'a posé une question', etiquette: 'Question', icone: 'help' },
  CLINIQUE: { action: 'a ouvert une clinique', etiquette: 'Clinique', icone: 'message' },
  ASTUCE: { action: 'a partagé une astuce', etiquette: 'Astuce', icone: 'bulb' },
  RETOUR_EXPERIENCE: {
    action: 'a partagé un retour d’expérience',
    etiquette: LIBELLES_TYPE_SUJET.RETOUR_EXPERIENCE,
    icone: 'message',
  },
  DISCUSSION: { action: 'a lancé une discussion', etiquette: 'Discussion', icone: 'message' },
};

interface Ligne {
  icone: string;
  texte: string;
  etiquette: string;
  ton?: 'success' | 'warn';
  iconeEtiquette?: string;
}

const titre = (a: ActiviteAccueilApi) => a.cible?.titre ?? '';

function ligne(a: ActiviteAccueilApi): Ligne {
  switch (a.genre) {
    case 'publication':
      return {
        icone: 'layers',
        texte: t(`a publié « ${titre(a)} »`),
        etiquette: a.typeCreation ? LIBELLES_TYPE[a.typeCreation] : 'Création',
        ...(a.typeCreation === 'UN_PROMPT' ? { iconeEtiquette: 'type-prompt' } : {}),
      };
    case 'participation':
      return {
        icone: 'flag',
        texte: t(`participe au défi « ${titre(a)} »`),
        etiquette: 'Défi',
      };
    case 'reproduction': {
      const resultat = a.resultat ?? 'SUCCES';
      return {
        icone: 'repeat',
        texte: `${t(`a reproduit « ${titre(a)} »`)}${a.outil ? ` avec <span class="tool-ref">${logo(a.outil)}${t(a.outil.nom)}</span>${a.modele ? t(` ${a.modele}`) : ''}` : ''}`,
        etiquette: ISSUES[resultat],
        ton: resultat === 'SUCCES' ? 'success' : 'warn',
      };
    }
    case 'reponse-acceptee':
      return {
        icone: 'check-circle',
        texte: t(`a vu sa réponse acceptée dans « ${titre(a)} »`),
        etiquette: `+${a.points ?? 0} points`,
        ton: 'success',
      };
    case 'sujet': {
      const genre = SUJETS[a.typeSujet ?? 'DISCUSSION'];
      return {
        icone: genre.icone,
        texte: t(`${genre.action} : « ${titre(a)} »`),
        etiquette: genre.etiquette,
      };
    }
    case 'badge':
      return {
        icone: 'award',
        texte: t(`a obtenu le badge ${a.badge ?? ''}`),
        etiquette: 'Badge',
      };
  }
}

/** Contenu d'une ligne du fil (prototype : feedHTML). */
export function activiteHTML(a: ActiviteAccueilApi, maintenant: Date): string {
  const l = ligne(a);
  const iconeEtiquette =
    l.ton === 'success'
      ? icone('check', 'icon-xs')
      : l.ton === 'warn'
        ? icone('alert', 'icon-xs')
        : l.iconeEtiquette
          ? icone(l.iconeEtiquette, 'icon-xs')
          : '';
  return `<div><span class="feed-who" aria-hidden="true">${avatar(a.membre, 36)}<span class="feed-badge">${icone(l.icone, 'icon-xs')}</span></span><p class="feed-text"><b>${t(a.membre.nom)}</b> ${l.texte}<time datetime="${esc(a.date)}" data-created="${esc(a.date)}">${t(ilYa(a.date, maintenant))}</time></p><span class="feed-tag"${l.ton ? ` data-tone="${l.ton}"` : ''}>${iconeEtiquette}${t(l.etiquette)}</span></div>`;
}

/** Lignes du fil rendues par le serveur. */
export const filHTML = (activite: ActiviteAccueilApi[], maintenant: Date): string =>
  activite
    .map(
      (a) => `<li class="feed-item" data-cle="${esc(a.cle)}">${activiteHTML(a, maintenant)}</li>`,
    )
    .join('');
