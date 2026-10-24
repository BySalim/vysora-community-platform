import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { CommentairesController } from './commentaires.controller.js';
import { CommentairesService } from './commentaires.service.js';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';

/* Interactions (INT-01, INT-03, S-01) : votes, commentaires et enregistrements. Reproductions et vues suivront. */
@Module({
  imports: [AuthModule, ProgressionModule],
  controllers: [InteractionsController, CommentairesController],
  providers: [InteractionsService, CommentairesService],
})
export class InteractionsModule {}
