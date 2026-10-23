import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ErreurApplication } from '../erreurs.js';
import { nomCookieSession } from '../securite/cookies.js';

const METHODES_SURES = new Set(['GET', 'HEAD', 'OPTIONS']);

/* Protection contre la falsification de requête (CSRF), en complément du cookie SameSite=Lax :
   une requête qui modifie des données doit venir d'une origine autorisée. Sans en-tête Origin
   ni Referer, elle n'est acceptée que si elle ne porte pas de cookie de session. */
@Injectable()
export class OrigineGuard implements CanActivate {
  private readonly autorisees: Set<string>;
  private readonly cookieSession: string;

  constructor(@Inject(CONFIG) config: Configuration) {
    this.autorisees = new Set([...config.ORIGINES_AUTORISEES, new URL(config.SITE_URL).origin]);
    this.cookieSession = nomCookieSession(config);
  }

  canActivate(contexte: ExecutionContext): boolean {
    const requete = contexte.switchToHttp().getRequest<Request>();
    if (METHODES_SURES.has(requete.method)) return true;

    const origine = requete.headers.origin ?? origineDe(requete.headers.referer);
    if (origine) {
      if (this.autorisees.has(origine)) return true;
      throw new ErreurApplication('ORIGINE_REFUSEE');
    }
    if (requete.cookies?.[this.cookieSession]) throw new ErreurApplication('ORIGINE_REFUSEE');
    return true;
  }
}

function origineDe(adresse: string | undefined): string | undefined {
  if (!adresse) return undefined;
  try {
    return new URL(adresse).origin;
  } catch {
    return 'null';
  }
}
