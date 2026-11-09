import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { AdministrationController } from './administration.controller.js';
import { AdministrationService } from './administration.service.js';
import { DecisionsMembresService } from './decisions-membres.service.js';
import { EquipeService } from './equipe.service.js';
import { JournalAuditService } from './journal-audit.service.js';
import { DocumentsLegauxAdminController } from './documents-legaux-admin.controller.js';
import { DocumentsLegauxAdminService } from './documents-legaux-admin.service.js';
import { ReferentielsAdminService } from './referentiels-admin.service.js';
import { ReferentielsContenusController } from './referentiels-contenus.controller.js';
import { ReferentielsContenusService } from './referentiels-contenus.service.js';

/* Administration (ADM-01, ADM-02, ADM-03) : comptes, rôles et double authentification de l'équipe, codes
   d'invitation, journal des décisions, référentiels (outils et modèles ; catégories, licences,
   étiquettes et badges), documents légaux, décisions réservées aux administrateurs (bannir, ajuster
   la réputation, retirer un badge), journal d'audit. */
@Module({
  imports: [AuthModule, ModerationModule, ProgressionModule, NotificationsModule],
  controllers: [
    AdministrationController,
    ReferentielsContenusController,
    DocumentsLegauxAdminController,
  ],
  providers: [
    AdministrationService,
    DecisionsMembresService,
    EquipeService,
    JournalAuditService,
    ReferentielsAdminService,
    ReferentielsContenusService,
    DocumentsLegauxAdminService,
  ],
})
export class AdministrationModule {}
