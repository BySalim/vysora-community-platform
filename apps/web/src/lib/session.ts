import { ETAT_VISITEUR, type SessionApi } from '@vysora/shared';
import { appelerApiAvecCookies } from './api';

export interface EtatSession extends SessionApi {
  /** Cookies posés par l'API (échéance repoussée, cookie périmé effacé), à renvoyer au navigateur. */
  cookies: string[];
}

const VISITEUR: EtatSession = {
  etat: ETAT_VISITEUR,
  membre: null,
  nonLues: 0,
  suspensionJusqua: null,
  conditionsDepuis: null,
  cookies: [],
};

/** Cookie de session (ADR-0005) : préfixe __Host- en production. */
const COOKIE_SESSION = /(?:^|;\s*)(?:__Host-)?vysora_session=/;

/* Personne qui consulte la page : GET /api/v1/session avec le cookie du visiteur. Sans cookie de
   session, c'est une visiteuse : aucun appel. Si l'API ne répond pas, la page s'affiche quand même,
   comme pour une visiteuse. */
export async function chargerSession(
  requete: Request,
  adresseClient?: string,
): Promise<EtatSession> {
  if (!COOKIE_SESSION.test(requete.headers.get('cookie') ?? '')) return VISITEUR;
  try {
    const { donnees, cookies } = await appelerApiAvecCookies<SessionApi>('/api/v1/session', {
      requete,
      adresseClient,
    });
    return { ...donnees, cookies };
  } catch (erreur) {
    console.error('Session non chargée :', erreur);
    return VISITEUR;
  }
}

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
