import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { ApprentissageController } from './apprentissage.controller.js';
import { CasService } from './cas.service.js';
import { ComplementsSavoirsService } from './complements-savoirs.service.js';
import { EcritureCasService } from './ecriture-cas.service.js';
import { ListeCasService } from './liste-cas.service.js';
import { ReponsesCasService } from './reponses-cas.service.js';
import { SavoirsAdminController } from './savoirs-admin.controller.js';
import { SavoirsService } from './savoirs.service.js';

/* Apprentissage (APP-01, F-60 à F-62) : cas Bon réflexe. Liste des cas validés et lecture d'un cas
   (RG-30), réponse définitive et ses points (RG-72, RG-80), proposition par un membre de niveau
   Expert (RG-70, CI-16, CI-30), modification et nouvelle soumission (RG-71), examen par la
   modération et ses points (RG-71, CI-18, RG-80, RG-82), statistiques de l'apprenant (RG-88) ;
   progression du membre sur les savoirs d'Apprendre et compléments des savoirs choisis par l'équipe
   (moments clés, sujet du forum ; APP-03). Les défis (S-07) rejoindront ce module. */
@Module({
  imports: [AuthModule, ProgressionModule, NotificationsModule],
  controllers: [ApprentissageController, SavoirsAdminController],
  providers: [
    ListeCasService,
    CasService,
    EcritureCasService,
    ReponsesCasService,
    SavoirsService,
    ComplementsSavoirsService,
  ],
  // Les guides d'Explorer (DEC-01) présentent leurs cas comme la page d'un cas.
  exports: [CasService],
})
export class ApprentissageModule {}
