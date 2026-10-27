import { Module } from '@nestjs/common';
import { ApprentissageModule } from '../apprentissage/apprentissage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ContributionsGuidesService } from './contributions-guides.service.js';
import { DecouverteController } from './decouverte.controller.js';
import { GuidesService } from './guides.service.js';
import { RechercheService } from './recherche.service.js';

/* Découverte (DEC-01, F-22) : guides d'Explorer (contenu de l'équipe, chiffres calculés sur les
   parcours publiés et visibles, RG-30, RG-32, RG-43, RG-44), ce que la communauté cherche encore,
   pièges signalés par les membres, listes de contrôle, recherche plein texte des parcours (RG-31).
   Les cas d'un guide sont lus par le module apprentissage (correction selon la personne, F-62). */
@Module({
  imports: [AuthModule, ApprentissageModule],
  controllers: [DecouverteController],
  providers: [GuidesService, ContributionsGuidesService, RechercheService],
})
export class DecouverteModule {}
