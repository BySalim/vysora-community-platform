import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { ContributionsController } from './contributions.controller.js';
import { CommentairesService } from './commentaires.service.js';
import { EnregistrementsService } from './enregistrements.service.js';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';
import { MesEnregistrementsController } from './mes-enregistrements.controller.js';
import { ReproductionsService } from './reproductions.service.js';

/* Interactions (INT-01 à INT-03, S-01) : votes, reproductions, commentaires, enregistrements et leur
   liste (« Mes contenus », CREA-04). Les vues suivront. */
@Module({
  imports: [AuthModule, ProgressionModule],
  controllers: [InteractionsController, ContributionsController, MesEnregistrementsController],
  providers: [
    InteractionsService,
    CommentairesService,
    ReproductionsService,
    EnregistrementsService,
  ],
})
export class InteractionsModule {}
