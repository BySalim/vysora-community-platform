import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaEvenementNavigateur,
  schemaPageServie,
  schemaPeriodeMesure,
  type MesureAudienceApi,
  type PeriodeMesure,
  type SaisieEvenementNavigateur,
  type SaisiePageServie,
} from '@vysora/shared';
import type { Request } from 'express';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige } from '../auth/droits.js';
import { AudienceService } from './audience.service.js';

/* LEG-03 : relevés de la mesure d'audience. La réponse est la même que le relevé compte ou non. */
@Controller('audience')
export class AudienceController {
  constructor(private readonly audience: AudienceService) {}

  /** POST /api/v1/audience/pages : page servie, signalée par le serveur du site avec le cookie et
      l'adresse IP de la personne. */
  @Post('pages')
  @HttpCode(204)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async page(
    @Body(new ValidationZod(schemaPageServie)) saisie: SaisiePageServie,
    @Req() requete: Request,
  ): Promise<void> {
    await this.audience.enregistrerPage(saisie, {
      enteteCookie: requete.headers.cookie,
      ip: requete.ip,
    });
  }

  /** POST /api/v1/audience/evenements : erreur d'un script ou recherche, envoyée par le navigateur. */
  @Post('evenements')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async evenement(
    @Body(new ValidationZod(schemaEvenementNavigateur)) saisie: SaisieEvenementNavigateur,
    @Req() requete: Request,
  ): Promise<void> {
    await this.audience.enregistrerEvenementNavigateur(saisie, requete);
  }
}

/* Tableau de l'administration (LEG-03). */
@Controller('admin/audience')
@Exige('administrer')
export class AudienceAdminController {
  constructor(private readonly audience: AudienceService) {}

  /** GET /api/v1/admin/audience?jours=7|30|90 */
  @Get()
  mesure(
    @Query(new ValidationZod(schemaPeriodeMesure)) periode: PeriodeMesure,
  ): Promise<MesureAudienceApi> {
    return this.audience.mesure(periode.jours);
  }
}
