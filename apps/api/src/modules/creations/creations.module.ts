import { Module } from '@nestjs/common';
import { CreationsController } from './creations.controller.js';
import { CreationsService } from './creations.service.js';

/* Créations (CREA-01) : lecture d'une fiche selon la visibilité (RG-30). */
@Module({
  controllers: [CreationsController],
  providers: [CreationsService],
  exports: [CreationsService],
})
export class CreationsModule {}
