import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ReputationService } from './reputation.service.js';

/* Progression (REP-01, en cours) : mouvements de réputation et notification du niveau atteint.
   Badges et classements suivront. */
@Module({
  imports: [NotificationsModule],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ProgressionModule {}
