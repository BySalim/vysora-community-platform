import { Module } from '@nestjs/common';
import { ComptesController } from './comptes.controller.js';
import { ComptesService } from './comptes.service.js';
import { ConnexionService } from './connexion.service.js';
import { EtatVisiteurService } from './etat-visiteur.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import { SessionController } from './session.controller.js';
import { SessionGuard } from './session.guard.js';
import { SessionsService } from './sessions.service.js';

/* Authentification (F-01, F-03, ADR-0005) : comptes, sessions, droits. La garde SessionGuard est
   déclarée globale dans AppModule, après la vérification de l'origine et la limitation de débit. */
@Module({
  controllers: [SessionController, ComptesController],
  providers: [
    SessionsService,
    EtatVisiteurService,
    MotsDePasseService,
    ConnexionService,
    ComptesService,
    SessionGuard,
  ],
  exports: [SessionsService, EtatVisiteurService, MotsDePasseService, SessionGuard],
})
export class AuthModule {}
