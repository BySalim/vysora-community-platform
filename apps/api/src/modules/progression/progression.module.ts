import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BadgesService } from './badges.service.js';
import { ReputationService } from './reputation.service.js';

/* Progression (REP-01, S-09) : mouvements de réputation, notification du niveau atteint et
   attribution automatique des badges (tâche `badges.attribuer`). Classements : module classements. */
@Module({
  imports: [NotificationsModule],
  providers: [ReputationService, BadgesService],
  exports: [ReputationService, BadgesService],
})
export class ProgressionModule {}
