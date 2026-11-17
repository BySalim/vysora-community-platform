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
import { schemaParticipation, type DefisApi, type SaisieParticipation } from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { DefisService } from './defis.service.js';
import { ParticipationsService } from './participations.service.js';

@Controller('defis')
export class DefisController {
  constructor(
    private readonly defis: DefisService,
    private readonly participations: ParticipationsService,
  ) {}

  /** GET /api/v1/defis?defi=<id> : le défi demandé (à défaut, celui en cours), ses participations
      et les défis clôturés. */
  @Get()
  lire(@Req() requete: RequeteVysora, @Query('defi') defi?: string): Promise<DefisApi> {
    const id = typeof defi === 'string' && /^\d{1,15}$/.test(defi) ? Number(defi) : undefined;
    return this.defis.defis(requete.sessionOuverte?.utilisateur.id ?? null, id);
  }

  /** POST /api/v1/defis/:id/participations (S-17) : publier sa participation, une par personne. */
  @Post(':id/participations')
  @HttpCode(201)
  @Exige('contribuer')
  publierParticipation(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaParticipation)) saisie: SaisieParticipation,
    @SessionCourante() session: SessionOuverte,
  ): Promise<{ id: number }> {
    return this.participations.publier(session.utilisateur.id, id, saisie);
  }

  /** PUT /api/v1/defis/:id/participations/:participation : la modifier tant que le défi est en cours. */
  @Put(':id/participations/:participation')
  @HttpCode(204)
  @Exige('contribuer')
  async modifierParticipation(
    @Param('id', ParseIntPipe) id: number,
    @Param('participation', ParseIntPipe) participation: number,
    @Body(new ValidationZod(schemaParticipation)) saisie: SaisieParticipation,
    @SessionCourante() session: SessionOuverte,
  ): Promise<void> {
    await this.participations.modifier(session.utilisateur.id, id, participation, saisie);
  }

  /** GET /api/v1/defis/:id/participations/:participation/jeu : le code du jeu, pour son auteur. */
  @Get(':id/participations/:participation/jeu')
  sourceParticipation(
    @Param('id', ParseIntPipe) id: number,
    @Param('participation', ParseIntPipe) participation: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<{ jeu: { nom: string; html: string } | null }> {
    return this.participations.source(session.utilisateur.id, id, participation);
  }

  /** DELETE /api/v1/defis/:id/participations/:participation : la supprimer tant que le défi est en cours. */
  @Delete(':id/participations/:participation')
  @HttpCode(204)
  @Exige('contribuer')
  async supprimerParticipation(
    @Param('id', ParseIntPipe) id: number,
    @Param('participation', ParseIntPipe) participation: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<void> {
    await this.participations.supprimer(session.utilisateur.id, id, participation);
  }

  /** PUT /api/v1/defis/:id/participation (F-64) : remplacé par la participation (S-17), refusé. */
  @Put(':id/participation')
  @HttpCode(204)
  @Exige('contribuer')
  participer(): never {
    return this.defis.participer();
  }

  /** DELETE /api/v1/defis/:id/participation : tant que le défi est en cours. */
  @Delete(':id/participation')
  @HttpCode(204)
  @Exige('contribuer')
  async retirer(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<void> {
    await this.defis.retirer(session.utilisateur.id, id);
  }
}
