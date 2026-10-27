import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { EcritureSujetsService } from './ecriture-sujets.service.js';
import { ForumController } from './forum.controller.js';
import { ListeSujetsService } from './liste-sujets.service.js';
import { MessagesService } from './messages.service.js';
import { SujetsService } from './sujets.service.js';

/* Forum (FORUM-01, F-50 à F-55) : liste des sujets, lecture d'un sujet et de ses réponses (RG-30),
   écriture par l'auteur (cinq types, RG-60 à RG-62, RG-66), réponses (RG-64), réponse acceptée et
   ses points (RG-63, RG-80, RG-82), fermeture (RG-65), limites par 24 heures (RG-85). Votes,
   enregistrements et signalements passent par les modules interactions et moderation. Réponses et
   réponses acceptées sont notifiées (RG-91). */
@Module({
  imports: [AuthModule, ProgressionModule, NotificationsModule],
  controllers: [ForumController],
  providers: [ListeSujetsService, SujetsService, EcritureSujetsService, MessagesService],
})
export class ForumModule {}
