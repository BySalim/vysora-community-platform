import { Module } from '@nestjs/common';
import { ClassementsController } from './classements.controller.js';
import { ClassementsService } from './classements.service.js';

/* Classements (S-08, F-75, RG-87) : palmarès de la semaine et classement des membres. */
@Module({
  controllers: [ClassementsController],
  providers: [ClassementsService],
})
export class ClassementsModule {}
