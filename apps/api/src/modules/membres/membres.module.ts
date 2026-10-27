import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CreationsModule } from '../creations/creations.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ExportService } from './export.service.js';
import { ParametresController } from './parametres.controller.js';
import { ParametresService } from './parametres.service.js';
import { SuppressionService } from './suppression.service.js';

/* Membres : paramètres du compte, export des données et suppression du compte (PARAM-01, EC-17) ;
   présentation d'un membre à côté d'un contenu (resumes.ts). Le profil public viendra avec PROF-01. */
@Module({
  imports: [AuthModule, NotificationsModule, CreationsModule],
  controllers: [ParametresController],
  providers: [ParametresService, ExportService, SuppressionService],
  exports: [SuppressionService],
})
export class MembresModule {}
