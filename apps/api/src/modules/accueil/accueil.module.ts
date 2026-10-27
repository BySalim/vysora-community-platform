import { Module } from '@nestjs/common';
import { ApprentissageModule } from '../apprentissage/apprentissage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccueilController } from './accueil.controller.js';
import { AccueilService } from './accueil.service.js';

/* Accueil (ACC-01, F-21, EC-01) : créations utiles de la semaine (RG-32), nouveautés et plus
   reproduites, domaines, chiffres de la communauté, fil d'activité publique, interactions
   d'apprentissage, questions en attente, astuce de la semaine, classement de la semaine (RG-87),
   cas Bon réflexe (présenté par le module apprentissage), clinique résolue, défi en cours. */
@Module({
  imports: [AuthModule, ApprentissageModule],
  controllers: [AccueilController],
  providers: [AccueilService],
})
export class AccueilModule {}
