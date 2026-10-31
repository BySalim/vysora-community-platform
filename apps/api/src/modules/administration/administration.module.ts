import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { AdministrationController } from './administration.controller.js';
import { AdministrationService } from './administration.service.js';
import { ReferentielsAdminService } from './referentiels-admin.service.js';

/* Administration (ADM-01) : rôles et double authentification de l'équipe, codes d'invitation,
   journal des décisions, référentiel des outils et modèles. Autres référentiels, documents légaux
   et décisions réservées aux administrateurs : ADM-02. */
@Module({
  imports: [AuthModule, ModerationModule],
  controllers: [AdministrationController],
  providers: [AdministrationService, ReferentielsAdminService],
})
export class AdministrationModule {}
