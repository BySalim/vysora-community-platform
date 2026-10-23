import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ChargementSession } from './chargement-session.middleware.js';
import { ComptesController } from './comptes.controller.js';
import { ComptesService } from './comptes.service.js';
import { ConnexionService } from './connexion.service.js';
import { DocumentsLegauxService } from './documents-legaux.service.js';
import { DroitsGuard } from './droits.js';
import { EtatCompteService } from './etat-compte.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import { SessionController } from './session.controller.js';
import { SessionsService } from './sessions.service.js';
import { TemporisationService } from './temporisation.service.js';

/* Authentification (F-01 à F-04, ADR-0005) : comptes, sessions, mots de passe, documents légaux,
   droits. La garde DroitsGuard est déclarée globale par AppModule, après l'origine et le débit. */
@Module({
  controllers: [SessionController, ComptesController],
  providers: [
    SessionsService,
    MotsDePasseService,
    TemporisationService,
    DocumentsLegauxService,
    EtatCompteService,
    ComptesService,
    ConnexionService,
    DroitsGuard,
  ],
  exports: [SessionsService, EtatCompteService, DocumentsLegauxService, DroitsGuard],
})
export class AuthModule implements NestModule {
  configure(consommateur: MiddlewareConsumer): void {
    consommateur.apply(ChargementSession).forRoutes('{*chemin}');
  }
}
