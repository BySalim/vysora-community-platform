import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  schemaChangementRole,
  schemaCreationInvitations,
  schemaFiltresDecisions,
  type ChangementRole,
  type CreationInvitations,
  type FiltresDecisions,
  type JournalDecisionsApi,
  type ListeInvitationsApi,
  type ListeMembresAdministresApi,
  type MembreAdministreApi,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { AdministrationService, type Acteur } from './administration.service.js';

const acteur = (session: SessionOuverte, requete: RequeteVysora): Acteur => ({
  id: session.utilisateur.id,
  ip: requete.ip,
});

/* Administration (ADM-01) : réservée aux administrateurs dont la session a confirmé l'identité
   (@Exige('administrer'), SEC-02). */
@Controller('admin')
@Exige('administrer')
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}

  /** GET /api/v1/admin/membres?q= : l'équipe, ou les membres trouvés (EC-23). */
  @Get('membres')
  membres(@Query('q') q?: string): Promise<ListeMembresAdministresApi> {
    return this.administration.membres(typeof q === 'string' ? q : undefined);
  }

  /** PUT /api/v1/admin/membres/:id/role (F-96, RG-111). */
  @Put('membres/:id/role')
  changerRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaChangementRole)) changement: ChangementRole,
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
  ): Promise<MembreAdministreApi> {
    return this.administration.changerRole(acteur(session, requete), id, changement);
  }

  /** DELETE /api/v1/admin/membres/:id/deux-facteurs : appareil perdu (SEC-02). */
  @Delete('membres/:id/deux-facteurs')
  reinitialiserDeuxFacteurs(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
  ): Promise<MembreAdministreApi> {
    return this.administration.reinitialiserDeuxFacteurs(acteur(session, requete), id);
  }

  /** GET /api/v1/admin/invitations?page= (INV-01). */
  @Get('invitations')
  invitations(@Query('page') page?: string): Promise<ListeInvitationsApi> {
    const numero = Number(page);
    return this.administration.listeInvitations(
      Number.isInteger(numero) && numero >= 1 && numero <= 1000 ? numero : 1,
    );
  }

  /** POST /api/v1/admin/invitations : nouveaux codes (INV-01). */
  @Post('invitations')
  @HttpCode(201)
  creerInvitations(
    @Body(new ValidationZod(schemaCreationInvitations)) creation: CreationInvitations,
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
  ): Promise<{ codes: string[] }> {
    return this.administration.creerInvitations(acteur(session, requete), creation);
  }

  /** GET /api/v1/admin/decisions?moderateur=&membre=&action=&du=&au=&page= (EC-21, F-92). */
  @Get('decisions')
  decisions(
    @Query(new ValidationZod(schemaFiltresDecisions)) filtres: FiltresDecisions,
  ): Promise<JournalDecisionsApi> {
    return this.administration.journal(filtres);
  }
}
