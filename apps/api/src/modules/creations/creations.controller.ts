import { Controller, Get, Param, Req } from '@nestjs/common';
import type { CreationFicheApi } from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import type { RequeteVysora } from '../auth/requete.js';
import { CreationsService } from './creations.service.js';

/* Créations (F-10 à F-23). Lecture d'abord (CREA-01) ; l'éditeur viendra ensuite. */
@Controller('creations')
export class CreationsController {
  constructor(private readonly creations: CreationsService) {}

  /** GET /api/v1/creations/:id : fiche complète, selon ce que la personne peut voir (RG-30). */
  @Get(':id')
  fiche(
    @Param('id', IdentifiantPipe) id: number,
    @Req() requete: RequeteVysora,
  ): Promise<CreationFicheApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.creations.fiche(id, membre ? { id: membre.id, role: membre.role } : null);
  }
}
