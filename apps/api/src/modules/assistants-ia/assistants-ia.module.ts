import { Module } from '@nestjs/common';
import { AssistantsIaAdminController, AssistantsIaController } from './assistants-ia.controller.js';
import { AssistantsIaService } from './assistants-ia.service.js';

/* REF-03 : passages des assistants d'IA (mesure, tableau de l'administration). */
@Module({
  controllers: [AssistantsIaController, AssistantsIaAdminController],
  providers: [AssistantsIaService],
})
export class AssistantsIaModule {}
