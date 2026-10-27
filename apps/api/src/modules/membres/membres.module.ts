import { Module } from '@nestjs/common';
import { ApprentissageModule } from '../apprentissage/apprentissage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CreationsModule } from '../creations/creations.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ExportService } from './export.service.js';
import { ParametresController } from './parametres.controller.js';
import { ParametresService } from './parametres.service.js';
import { ProfilController } from './profil.controller.js';
import { ProfilService } from './profil.service.js';
import { SuppressionService } from './suppression.service.js';

/* Membres : profil public (PROF-01, EC-14), paramètres du compte, export des données et suppression
   du compte (PARAM-01, EC-17) ; présentation d'un membre à côté d'un contenu (resumes.ts). */
@Module({
  imports: [AuthModule, NotificationsModule, CreationsModule, ApprentissageModule],
  controllers: [ParametresController, ProfilController],
  providers: [ParametresService, ExportService, SuppressionService, ProfilService],
  exports: [SuppressionService],
})
export class MembresModule {}
