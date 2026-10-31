import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { schemaParticipationDefi, type DefisApi, type ParticipationDefi } from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { DefisService } from './defis.service.js';

@Controller('defis')
export class DefisController {
  constructor(private readonly defis: DefisService) {}

  /** GET /api/v1/defis?defi=<id> : le défi demandé (à défaut, celui en cours), ses participations
      et les défis clôturés. */
  @Get()
  lire(@Req() requete: RequeteVysora, @Query('defi') defi?: string): Promise<DefisApi> {
    const id = typeof defi === 'string' && /^\d{1,15}$/.test(defi) ? Number(defi) : undefined;
    return this.defis.defis(requete.sessionOuverte?.utilisateur.id ?? null, id);
  }

  /** PUT /api/v1/defis/:id/participation (F-64, RG-74). */
  @Put(':id/participation')
  @HttpCode(204)
  @Exige('contribuer')
  async participer(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaParticipationDefi)) { creationId }: ParticipationDefi,
    @SessionCourante() session: SessionOuverte,
  ): Promise<void> {
    await this.defis.participer(session.utilisateur.id, id, creationId);
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
