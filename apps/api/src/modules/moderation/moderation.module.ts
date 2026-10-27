import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { DecisionsService } from './decisions.service.js';
import { DossiersService } from './dossiers.service.js';
import { ModerationController, SignalementsController } from './moderation.controller.js';
import { SignalementsService } from './signalements.service.js';

/* Modération (MOD-01, F-90 à F-92) : signalements des membres, file de la modération, dossier d'un
   contenu, décisions. Le masquage automatique (F-93) viendra avec S-13, les écrans avec MOD-02. */
@Module({
  imports: [AuthModule, ProgressionModule],
  controllers: [SignalementsController, ModerationController],
  providers: [SignalementsService, DossiersService, DecisionsService],
})
export class ModerationModule {}
