import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaDecisionModeration,
  schemaSignalement,
  type DecisionApi,
  type DecisionModeration,
  type DossierModerationApi,
  type FileModerationApi,
  type Signalement,
  type SignalementEnregistreApi,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { DecisionsService } from './decisions.service.js';
import { DossiersService } from './dossiers.service.js';
import { SignalementsService } from './signalements.service.js';

/* Signaler un contenu (F-90) : compte actif exigé, comme toute interaction. */
@Controller('contenus/:id/signalements')
export class SignalementsController {
  constructor(private readonly signalements: SignalementsService) {}

  /** POST /api/v1/contenus/:id/signalements */
  @Post()
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  signaler(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) contenuId: number,
    @Body(new ValidationZod(schemaSignalement)) saisie: Signalement,
  ): Promise<SignalementEnregistreApi> {
    return this.signalements.signaler(session.utilisateur.id, contenuId, saisie);
  }
}

/* File de modération, dossier d'un contenu et décisions (F-91) : réservés aux modérateurs et aux
   administrateurs (@Exige('moderer') ; la double authentification s'y ajoutera avec SEC-02). */
@Controller('moderation')
@Exige('moderer')
export class ModerationController {
  constructor(
    private readonly dossiers: DossiersService,
    private readonly decisions: DecisionsService,
  ) {}

  /** GET /api/v1/moderation/file?apres=<curseur> */
  @Get('file')
  file(
    @SessionCourante() session: SessionOuverte,
    @Query('apres') apres?: string,
  ): Promise<FileModerationApi> {
    return this.dossiers.file(session.utilisateur.id, apres);
  }

  /** GET /api/v1/moderation/contenus/:id */
  @Get('contenus/:id')
  dossier(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) contenuId: number,
  ): Promise<DossierModerationApi> {
    return this.dossiers.dossier(session.utilisateur.id, contenuId);
  }

  /** POST /api/v1/moderation/contenus/:id/decisions */
  @Post('contenus/:id/decisions')
  @HttpCode(201)
  decider(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) contenuId: number,
    @Body(new ValidationZod(schemaDecisionModeration)) saisie: DecisionModeration,
  ): Promise<DecisionApi> {
    return this.decisions.decider(session.utilisateur.id, contenuId, saisie);
  }
}
