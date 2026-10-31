import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { AdministrationController } from './administration.controller.js';
import { AdministrationService } from './administration.service.js';
import { DocumentsLegauxAdminController } from './documents-legaux-admin.controller.js';
import { DocumentsLegauxAdminService } from './documents-legaux-admin.service.js';
import { ReferentielsAdminService } from './referentiels-admin.service.js';
import { ReferentielsContenusController } from './referentiels-contenus.controller.js';
import { ReferentielsContenusService } from './referentiels-contenus.service.js';

/* Administration (ADM-01, ADM-02) : rôles et double authentification de l'équipe, codes
   d'invitation, journal des décisions, référentiels (outils et modèles ; catégories, licences,
   étiquettes et badges), documents légaux. Décisions réservées aux administrateurs : ADM-02. */
@Module({
  imports: [AuthModule, ModerationModule],
  controllers: [
    AdministrationController,
    ReferentielsContenusController,
    DocumentsLegauxAdminController,
  ],
  providers: [
    AdministrationService,
    ReferentielsAdminService,
    ReferentielsContenusService,
    DocumentsLegauxAdminService,
  ],
})
export class AdministrationModule {}
