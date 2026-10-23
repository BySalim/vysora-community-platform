import { ETAT_VISITEUR, type EtatVisiteur } from '@vysora/shared';

export interface EtatSession {
  etat: EtatVisiteur;
  nonLues: number;
  membre: App.Locals['membre'];
}

/* Personne qui consulte la page. Tant que l'authentification n'existe pas (registre : AUTH-01),
   tout le monde est un visiteur. La tâche d'authentification remplace ce corps par un appel à
   GET /api/v1/session, avec le cookie transmis par appelerApi. */
export async function chargerSession(_requete: Request): Promise<EtatSession> {
  return { etat: ETAT_VISITEUR, nonLues: 0, membre: null };
}

/** Attributs data-* de <html> lus par prototype/etats.css (data-pour, compte, rôle). */
export function attributsEtat({ etat, nonLues }: EtatSession): Record<string, string> {
  if (etat.session !== 'membre') return { 'data-session': 'visiteur' };
  return {
    'data-session': 'membre',
    'data-role': etat.role,
    'data-niveau': etat.niveau,
    'data-compte': etat.compte,
    'data-notifications': nonLues > 0 ? 'nouvelles' : 'lues',
  };
}
