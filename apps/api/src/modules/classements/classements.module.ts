import { Module } from '@nestjs/common';
import { DefisModule } from '../defis/defis.module.js';
import { ClassementsController } from './classements.controller.js';
import { ClassementsService } from './classements.service.js';

/* Classements (S-08, F-75, RG-87) : palmarès de la semaine, défi de la semaine (S-07) et
   classement des membres. */
@Module({
  imports: [DefisModule],
  controllers: [ClassementsController],
  providers: [ClassementsService],
})
export class ClassementsModule {}
