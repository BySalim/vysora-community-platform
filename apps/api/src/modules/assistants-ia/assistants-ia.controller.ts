import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaPassageAssistant,
  schemaPeriodeMesure,
  type MesureAssistantsApi,
  type PeriodeMesure,
  type SaisiePassageAssistant,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige } from '../auth/droits.js';
import { AssistantsIaService } from './assistants-ia.service.js';

@Controller('assistants-ia')
export class AssistantsIaController {
  constructor(private readonly assistants: AssistantsIaService) {}

  /** POST /api/v1/assistants-ia/passages : page servie par le site à un assistant d'IA ou à une
      personne venue de l'un d'eux (REF-03). La réponse est la même que le passage compte ou non. */
  @Post('passages')
  @HttpCode(204)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async passage(
    @Body(new ValidationZod(schemaPassageAssistant)) saisie: SaisiePassageAssistant,
  ): Promise<void> {
    await this.assistants.enregistrer(saisie);
  }
}

/* Tableau de l'administration (REF-03). */
@Controller('admin/assistants-ia')
@Exige('administrer')
export class AssistantsIaAdminController {
  constructor(private readonly assistants: AssistantsIaService) {}

  /** GET /api/v1/admin/assistants-ia?jours=7|30|90 */
  @Get()
  mesure(
    @Query(new ValidationZod(schemaPeriodeMesure)) periode: PeriodeMesure,
  ): Promise<MesureAssistantsApi> {
    return this.assistants.mesure(periode.jours);
  }
}
