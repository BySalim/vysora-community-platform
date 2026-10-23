import { Body, Controller, Delete, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaConnexion,
  type Connexion,
  type ConnexionReussie,
  type SessionApi,
} from '@vysora/shared';
import type { Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import {
  effacerCookieSession,
  nomCookieSession,
  poserCookieSession,
} from '../../commun/securite/cookies.js';
import { ConnexionService } from './connexion.service.js';
import { EtatCompteService } from './etat-compte.service.js';
import { contexteDe, type RequeteVysora } from './requete.js';
import { SessionsService } from './sessions.service.js';

/* La session de la personne qui consulte (ADR-0005) : la lire, l'ouvrir (connexion), la fermer. */
@Controller('session')
export class SessionController {
  constructor(
    private readonly connexion: ConnexionService,
    private readonly sessions: SessionsService,
    private readonly etatCompte: EtatCompteService,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  /** GET /api/v1/session : état affiché par le site (EtatVisiteur, membre, notifications non lues). */
  @Get()
  lire(@Req() requete: RequeteVysora): Promise<SessionApi> {
    return this.etatCompte.pour(requete);
  }

  /** POST /api/v1/session : connexion (F-03). Au plus 20 essais par minute et par adresse IP. */
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async ouvrir(
    @Body(new ValidationZod(schemaConnexion)) saisie: Connexion,
    @Req() requete: RequeteVysora,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<ConnexionReussie> {
    const jetonActuel = this.jetonDe(requete);
    const ouverte = await this.connexion.connecter(saisie, contexteDe(requete), jetonActuel);
    poserCookieSession(reponse, this.config, ouverte.jeton, ouverte.expiration);
    const session = await this.sessions.retrouver(ouverte.jeton);
    const etat = await this.etatCompte.calculer(session ?? undefined);
    return { ...etat, suppressionAnnulee: ouverte.suppressionAnnulee?.toISOString() ?? null };
  }

  /** DELETE /api/v1/session : déconnexion de l'appareil courant (F-03). */
  @Delete()
  @HttpCode(204)
  async fermer(
    @Req() requete: RequeteVysora,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<void> {
    const jeton = this.jetonDe(requete);
    if (jeton) await this.sessions.fermer(jeton);
    effacerCookieSession(reponse, this.config);
  }

  private jetonDe(requete: RequeteVysora): string | undefined {
    const jeton: unknown = requete.cookies?.[nomCookieSession(this.config)];
    return typeof jeton === 'string' && jeton ? jeton : undefined;
  }
}
