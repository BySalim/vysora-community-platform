import { Body, Controller, HttpCode, Post, Put, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaAdresseEmail,
  schemaJeton,
  schemaReinitialisation,
  type LienReinitialisation,
  type Reinitialisation,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { ReinitialisationService } from './reinitialisation.service.js';
import { contexteDe, type RequeteVysora } from './requete.js';

/* Mot de passe oublié (AUTH-03, F-03) : demande du lien, lecture du lien, nouveau mot de passe. */
@Controller('mot-de-passe')
export class MotDePasseController {
  constructor(private readonly reinitialisation: ReinitialisationService) {}

  /** POST /api/v1/mot-de-passe/oubli : toujours la même réponse, que l'adresse possède un compte ou non. */
  @Post('oubli')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async demander(
    @Body(new ValidationZod(schemaAdresseEmail)) { email }: { email: string },
  ): Promise<void> {
    await this.reinitialisation.demander(email);
  }

  /** POST /api/v1/mot-de-passe/lien : le lien reçu est-il valable ? (jeton dans le corps, jamais dans l'adresse) */
  @Post('lien')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  lien(
    @Body(new ValidationZod(schemaJeton)) { jeton }: { jeton: string },
  ): Promise<LienReinitialisation> {
    return this.reinitialisation.lien(jeton);
  }

  /** PUT /api/v1/mot-de-passe : nouveau mot de passe ; toutes les sessions du compte sont fermées. */
  @Put()
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async reinitialiser(
    @Body(new ValidationZod(schemaReinitialisation)) saisie: Reinitialisation,
    @Req() requete: RequeteVysora,
  ): Promise<void> {
    await this.reinitialisation.reinitialiser(saisie, contexteDe(requete));
  }
}
