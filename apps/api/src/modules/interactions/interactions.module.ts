import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { ContributionsController } from './contributions.controller.js';
import { CommentairesService } from './commentaires.service.js';
import { EnregistrementsService } from './enregistrements.service.js';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';
import { MesEnregistrementsController } from './mes-enregistrements.controller.js';
import { ReproductionsService } from './reproductions.service.js';
import { VuesService } from './vues.service.js';

/* Interactions (INT-01 à INT-04, S-01) : votes, reproductions, commentaires, vues, enregistrements et
   leur liste (« Mes contenus », CREA-04). Chaque interaction reçue, sauf une vue, est notifiée à
   l'auteur du contenu (NOTIF-01). */
@Module({
  imports: [AuthModule, ProgressionModule, NotificationsModule],
  controllers: [InteractionsController, ContributionsController, MesEnregistrementsController],
  providers: [
    InteractionsService,
    CommentairesService,
    ReproductionsService,
    EnregistrementsService,
    VuesService,
  ],
})
export class InteractionsModule {}
