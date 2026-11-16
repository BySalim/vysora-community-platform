import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RELEVE_ERREURS } from '../../commun/http/releve-erreurs.js';
import { AudienceAdminController, AudienceController } from './audience.controller.js';
import { AudienceService } from './audience.service.js';
import { EtapeParcoursInterceptor } from './etape-parcours.js';

/* LEG-03 : mesure d'audience de l'équipe (pages, erreurs, parcours acceptés, tableau). Le service
   relève aussi les erreurs rendues par l'API (FiltreErreurs) et les actions marquées EtapeParcours. */
@Module({
  controllers: [AudienceController, AudienceAdminController],
  providers: [
    AudienceService,
    { provide: RELEVE_ERREURS, useExisting: AudienceService },
    { provide: APP_INTERCEPTOR, useClass: EtapeParcoursInterceptor },
  ],
  exports: [AudienceService, RELEVE_ERREURS],
})
export class AudienceModule {}
