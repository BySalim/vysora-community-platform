import { Module } from '@nestjs/common';
import { ReputationService } from './reputation.service.js';

/* Progression (REP-01, en cours) : mouvements de réputation. Niveaux, badges et classements suivront. */
@Module({
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ProgressionModule {}
