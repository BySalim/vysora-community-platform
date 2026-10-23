import type { CookieOptions, Response } from 'express';
import type { Configuration } from '../../config/env.js';

/** Nom du cookie de session : préfixe __Host- en production (HTTPS, sans domaine, chemin /). */
export const nomCookieSession = (config: Pick<Configuration, 'NODE_ENV'>): string =>
  config.NODE_ENV === 'production' ? '__Host-vysora_session' : 'vysora_session';

/* ADR-0005 : jeton illisible en JavaScript (HttpOnly), envoyé seulement en HTTPS en production,
   jamais par une requête venue d'un autre site qui modifie des données (SameSite=Lax + OrigineGuard). */
const options = (config: Pick<Configuration, 'NODE_ENV'>): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

export function poserCookieSession(
  reponse: Response,
  config: Pick<Configuration, 'NODE_ENV'>,
  jeton: string,
  expiration: Date,
): void {
  reponse.cookie(nomCookieSession(config), jeton, { ...options(config), expires: expiration });
}

export function effacerCookieSession(
  reponse: Response,
  config: Pick<Configuration, 'NODE_ENV'>,
): void {
  reponse.clearCookie(nomCookieSession(config), options(config));
}
