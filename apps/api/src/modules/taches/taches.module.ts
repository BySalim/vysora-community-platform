import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MediasModule } from '../medias/medias.module.js';
import { ConservationService } from './conservation.service.js';
import { TachesPlanifiees } from './taches-planifiees.js';

/* Tâches planifiées (EMAIL-01) : nettoyages, purges et annonces lancés chaque jour par la file. */
@Module({
  imports: [AuthModule, MediasModule],
  providers: [ConservationService, TachesPlanifiees],
})
export class TachesModule {}
