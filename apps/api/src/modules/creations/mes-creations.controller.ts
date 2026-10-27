import { Controller, Get, Req } from '@nestjs/common';
import type { MesCreationsApi } from '@vysora/shared';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { MesCreationsService } from './mes-creations.service.js';

/* « Mes contenus » (CREA-04, EC-15) : les créations du membre connecté. Un compte en lecture seule
   retrouve encore ses brouillons et ses créations (« parametres », comme la suppression). */
@Controller('moi')
export class MesCreationsController {
  constructor(
    private readonly mesCreations: MesCreationsService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/moi/creations : brouillons et créations publiées, avec la limite RG-85. */
  @Get('creations')
  @Exige('parametres')
  async lister(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
  ): Promise<MesCreationsApi> {
    const { etat } = await this.etatCompte.pour(requete);
    return this.mesCreations.lister({ id: session.utilisateur.id, etat });
  }
}
