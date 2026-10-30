import { Body, Controller, Delete, Get, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { schemaConnexion, type Connexion, type SessionApi } from '@vysora/shared';
import type { Request, Response } from 'express';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { ConnexionService } from './connexion.service.js';
import { EtatVisiteurService, SESSION_VISITEUR } from './etat-visiteur.service.js';
import { SessionsService } from './sessions.service.js';
import { VisiteurCourant, type Visiteur } from './visiteur.js';

/* Session de la personne qui consulte (ADR-0005) : lecture de l'état, connexion, déconnexion. */
@Controller('session')
export class SessionController {
  constructor(
    private readonly connexion: ConnexionService,
    private readonly sessions: SessionsService,
    private readonly etats: EtatVisiteurService,
  ) {}

  /** GET /api/v1/session : état à afficher (visiteur ou membre), lu par le site à chaque page. */
  @Get()
  @Header('Cache-Control', 'no-store')
  lire(@VisiteurCourant() visiteur: Visiteur | null): Promise<SessionApi> | SessionApi {
    return visiteur ? this.etats.pour(visiteur.utilisateurId) : SESSION_VISITEUR;
  }

  /** POST /api/v1/session : connexion par e-mail et mot de passe (F-03), 10 essais par minute et par adresse IP. */
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  connecter(
    @Body(new ValidationZod(schemaConnexion)) identifiants: Connexion,
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<SessionApi> {
    return this.connexion.connecter(identifiants, requete, reponse);
  }

  /** DELETE /api/v1/session : déconnexion de l'appareil courant (F-03). */
  @Delete()
  @HttpCode(204)
  async deconnecter(
    @VisiteurCourant() visiteur: Visiteur | null,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<void> {
    if (visiteur) await this.sessions.fermer(visiteur.sessionId, reponse);
  }
}
