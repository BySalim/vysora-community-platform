import { Module } from '@nestjs/common';
import { ProgressionModule } from '../progression/progression.module.js';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';

/* Interactions (INT-01, S-01) : votes et enregistrements. Reproductions, commentaires et vues suivront. */
@Module({
  imports: [ProgressionModule],
  controllers: [InteractionsController],
  providers: [InteractionsService],
})
export class InteractionsModule {}
