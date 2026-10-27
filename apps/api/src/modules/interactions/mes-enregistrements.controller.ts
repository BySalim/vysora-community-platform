import { Controller, Get } from '@nestjs/common';
import type { MesEnregistrementsApi } from '@vysora/shared';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { EnregistrementsService } from './enregistrements.service.js';

/* Liste « Enregistrés » (S-01, F-34), privée : le membre connecté ne lit que la sienne, même en
   lecture seule (« parametres »). */
@Controller('moi')
export class MesEnregistrementsController {
  constructor(private readonly enregistrements: EnregistrementsService) {}

  /** GET /api/v1/moi/enregistrements : du plus récent au plus ancien. */
  @Get('enregistrements')
  @Exige('parametres')
  lister(@SessionCourante() session: SessionOuverte): Promise<MesEnregistrementsApi> {
    return this.enregistrements.lister(session.utilisateur.id);
  }
}
