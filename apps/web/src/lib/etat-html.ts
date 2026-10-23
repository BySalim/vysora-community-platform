/* Attributs d'état posés sur <html> : par le gabarit au rendu de la page, puis par le navigateur
   quand l'état du compte change sans rechargement (conditions acceptées). */

import type { SessionApi } from '@vysora/shared';

/** Attributs data-* de <html> lus par prototype/etats.css (data-pour, compte, rôle). */
export function attributsEtat({
  etat,
  nonLues,
}: Pick<SessionApi, 'etat' | 'nonLues'>): Record<string, string> {
  if (etat.session !== 'membre') return { 'data-session': 'visiteur' };
  return {
    'data-session': 'membre',
    'data-role': etat.role,
    'data-niveau': etat.niveau,
    'data-compte': etat.compte,
    'data-notifications': nonLues > 0 ? 'nouvelles' : 'lues',
  };
}
