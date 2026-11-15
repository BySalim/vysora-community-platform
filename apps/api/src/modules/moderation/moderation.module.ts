import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { DecisionsService } from './decisions.service.js';
import { DossiersService } from './dossiers.service.js';
import { ModerationController, SignalementsController } from './moderation.controller.js';
import { SignalementsService } from './signalements.service.js';

/* Modération (MOD-01, S-13, F-90 à F-93) : signalements des membres, file de la modération, dossier d'un
   contenu, décisions et notification de l'auteur, masquage automatique au seuil des signalements
   (F-93). */
@Module({
  imports: [AuthModule, ProgressionModule, NotificationsModule],
  controllers: [SignalementsController, ModerationController],
  providers: [SignalementsService, DossiersService, DecisionsService],
  exports: [DossiersService],
})
export class ModerationModule {}
