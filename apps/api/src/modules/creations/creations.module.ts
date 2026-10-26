import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { CreationsController } from './creations.controller.js';
import { CreationsService } from './creations.service.js';
import { EcritureCreationsService } from './ecriture.service.js';

/* Créations : lecture d'une fiche selon la visibilité (CREA-01, RG-30) ; écriture par l'auteur
   (CREA-05 : brouillon, publication, modification, dépublication, suppression). */
@Module({
  imports: [AuthModule, ProgressionModule, NotificationsModule],
  controllers: [CreationsController],
  providers: [CreationsService, EcritureCreationsService],
  exports: [CreationsService],
})
export class CreationsModule {}
