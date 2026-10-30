import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  champPseudo,
  schemaEmail,
  schemaInscription,
  schemaPseudo,
  type ChangementPseudo,
  type DisponibiliteEmail,
  type DisponibilitePseudo,
  type Inscription,
  type SessionApi,
} from '@vysora/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { ComptesService } from './comptes.service.js';
import { Exige, VisiteurCourant, type Visiteur } from './visiteur.js';

const schemaQuestionPseudo = z.object({ pseudo: champPseudo });

/* Comptes (F-01) : inscription, pseudo du compte, disponibilité d'un pseudo ou d'une adresse. */
@Controller()
export class ComptesController {
  constructor(private readonly comptes: ComptesService) {}

  /** POST /api/v1/comptes : crée le compte et ouvre la session ; 10 inscriptions par heure et par adresse IP. */
  @Post('comptes')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  inscrire(
    @Body(new ValidationZod(schemaInscription)) inscription: Inscription,
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<SessionApi> {
    return this.comptes.inscrire(inscription, requete, reponse);
  }

  /** PUT /api/v1/compte/pseudo : permis à un compte en lecture seule (étape « pseudo » de l'inscription). */
  @Put('compte/pseudo')
  @Exige('parametres')
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  changerPseudo(
    @Body(new ValidationZod(schemaPseudo)) { pseudo }: ChangementPseudo,
    @VisiteurCourant() visiteur: Visiteur,
  ): Promise<SessionApi> {
    return this.comptes.changerPseudo(visiteur.utilisateurId, pseudo);
  }

  /** GET /api/v1/disponibilites/pseudo?pseudo=… : vérifié pendant la saisie (prototype : « Disponible »). */
  @Get('disponibilites/pseudo')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  disponibilitePseudo(
    @Query(new ValidationZod(schemaQuestionPseudo))
    { pseudo }: z.output<typeof schemaQuestionPseudo>,
    @VisiteurCourant() visiteur: Visiteur | null,
  ): Promise<DisponibilitePseudo> {
    return this.comptes.disponibilitePseudo(pseudo, visiteur?.utilisateurId);
  }

  /** POST /api/v1/disponibilites/email : première étape de l'inscription (F-01, le champ concerné est indiqué). */
  @Post('disponibilites/email')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async disponibiliteEmail(
    @Body(new ValidationZod(schemaEmail)) { email }: z.output<typeof schemaEmail>,
  ): Promise<DisponibiliteEmail> {
    return { disponible: await this.comptes.emailDisponible(email) };
  }
}
