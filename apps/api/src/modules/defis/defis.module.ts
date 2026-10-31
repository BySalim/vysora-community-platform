import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { AdministrationDefisController } from './administration-defis.controller.js';
import { AdministrationDefisService } from './administration-defis.service.js';
import { DefisController } from './defis.controller.js';
import { DefisService } from './defis.service.js';

/* Défis (S-07, F-63 à F-65) : défi en cours, participations et défis clôturés ; gestion par
   l'administration (EC-24) : brouillon, publication, annulation et clôture. */
@Module({
  imports: [ProgressionModule, NotificationsModule],
  controllers: [DefisController, AdministrationDefisController],
  providers: [DefisService, AdministrationDefisService],
})
export class DefisModule {}
