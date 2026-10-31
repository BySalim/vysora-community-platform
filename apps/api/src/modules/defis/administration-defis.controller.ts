import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { schemaDefi, type DefiAdministreApi, type SaisieDefi } from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { AdministrationDefisService } from './administration-defis.service.js';

/* Gestion des défis (EC-24) : administrateurs dont l'identité est confirmée (SEC-02). */
@Controller('admin/defis')
@Exige('administrer')
export class AdministrationDefisController {
  constructor(private readonly defis: AdministrationDefisService) {}

  /** GET /api/v1/admin/defis : tous les défis, brouillons compris, du plus récent au plus ancien. */
  @Get()
  liste(): Promise<DefiAdministreApi[]> {
    return this.defis.liste();
  }

  /** POST /api/v1/admin/defis : nouveau défi, en brouillon (F-63, RG-73). */
  @Post()
  @HttpCode(201)
  creer(
    @Body(new ValidationZod(schemaDefi)) saisie: SaisieDefi,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DefiAdministreApi> {
    return this.defis.creer(session.utilisateur.id, saisie);
  }

  /** POST /api/v1/admin/defis/:id/publication | annulation | cloture (RG-73, F-65). */
  @Post(':id/publication')
  @HttpCode(200)
  publier(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DefiAdministreApi> {
    return this.defis.publier(session.utilisateur.id, id);
  }

  @Post(':id/annulation')
  @HttpCode(200)
  annuler(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DefiAdministreApi> {
    return this.defis.annuler(session.utilisateur.id, id);
  }

  @Post(':id/cloture')
  @HttpCode(200)
  cloturer(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DefiAdministreApi> {
    return this.defis.cloturer(session.utilisateur.id, id);
  }
}
