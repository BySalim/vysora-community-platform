import { ETAT_VISITEUR, type MembreConnecte, type SessionApi } from '@vysora/shared';
import { appelerApiAvecEntetes } from './api';

export interface EtatSession {
  etat: SessionApi['etat'];
  nonLues: number;
  membre: MembreConnecte | null;
  /** Cookies posés par l'API (session prolongée ou effacée), à renvoyer au navigateur. */
  cookies: string[];
}

const VISITEUR: EtatSession = { etat: ETAT_VISITEUR, nonLues: 0, membre: null, cookies: [] };

/** Le cookie de session s'appelle vysora_session, ou __Host-vysora_session en production (ADR-0005). */
const MOTIF_COOKIE_SESSION = /(?:^|;\s*)(?:__Host-)?vysora_session=/;

/* Personne qui consulte la page : l'API lit le cookie de session (GET /api/v1/session).
   Sans cookie, aucun appel : la personne est une visiteuse. Si l'API ne répond pas, la page
   s'affiche quand même, pour une visiteuse. */
export async function chargerSession(requete: Request): Promise<EtatSession> {
  if (!MOTIF_COOKIE_SESSION.test(requete.headers.get('cookie') ?? '')) return VISITEUR;
  try {
    const { donnees, entetes } = await appelerApiAvecEntetes<SessionApi>('/api/v1/session', {
      requete,
      signal: AbortSignal.timeout(3_000),
    });
    return { ...donnees, cookies: entetes.getSetCookie() };
  } catch (erreur) {
    console.warn(`Session non chargée : ${String(erreur)}`);
    return VISITEUR;
  }
}

/** Attributs data-* de <html> lus par prototype/etats.css (data-pour, compte, rôle). */
export function attributsEtat({
  etat,
  nonLues,
}: Pick<EtatSession, 'etat' | 'nonLues'>): Record<string, string> {
  if (etat.session !== 'membre') return { 'data-session': 'visiteur' };
  return {
    'data-session': 'membre',
    'data-role': etat.role,
    'data-niveau': etat.niveau,
    'data-compte': etat.compte,
    'data-notifications': nonLues > 0 ? 'nouvelles' : 'lues',
  };
}
