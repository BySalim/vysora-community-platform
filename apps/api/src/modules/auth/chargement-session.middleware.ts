import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import {
  effacerCookieSession,
  nomCookieSession,
  poserCookieSession,
} from '../../commun/securite/cookies.js';
import type { RequeteVysora } from './requete.js';
import { SessionsService } from './sessions.service.js';

/* Avant chaque route : la session désignée par le cookie est retrouvée et attachée à la requête.
   Un cookie qui ne correspond plus à aucune session valide est effacé ; une session active voit
   son échéance repoussée (expiration glissante, ADR-0005) et son cookie renouvelé. */
@Injectable()
export class ChargementSession implements NestMiddleware {
  private readonly nomCookie: string;

  constructor(
    private readonly sessions: SessionsService,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {
    this.nomCookie = nomCookieSession(config);
  }

  async use(requete: RequeteVysora, reponse: Response, suite: NextFunction): Promise<void> {
    const jeton: unknown = requete.cookies?.[this.nomCookie];
    if (typeof jeton !== 'string' || !jeton) return suite();
    try {
      const ouverte = await this.sessions.retrouver(jeton);
      if (!ouverte) {
        effacerCookieSession(reponse, this.config);
        return suite();
      }
      requete.sessionOuverte = ouverte;
      const expiration = await this.sessions.prolonger(ouverte);
      if (expiration) poserCookieSession(reponse, this.config, jeton, expiration);
      suite();
    } catch (erreur) {
      suite(erreur);
    }
  }
}
