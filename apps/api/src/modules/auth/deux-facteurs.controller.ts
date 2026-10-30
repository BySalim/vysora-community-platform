import { Body, Controller, HttpCode, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaCodeDeuxFacteurs,
  type ActivationDeuxFacteursApi,
  type CodeDeuxFacteurs,
  type ConfigurationDeuxFacteursApi,
  type SessionApi,
} from '@vysora/shared';
import { z } from 'zod';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { DeuxFacteursService } from './deux-facteurs.service.js';
import { Exige, SessionCourante } from './droits.js';
import { EtatCompteService } from './etat-compte.service.js';
import type { SessionOuverte } from './requete.js';

const schemaActivation = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: 'Saisissez les six chiffres du code.' }),
});

/* Double authentification de la session (SEC-02, ENF-05). Ouvert à tout membre connecté, même en
   lecture seule : c'est l'étape qui donne ensuite accès à la modération et à l'administration. */
@Controller('session/deux-facteurs')
export class DeuxFacteursController {
  constructor(
    private readonly deuxFacteurs: DeuxFacteursService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** POST /api/v1/session/deux-facteurs : code de l'application ou code de secours. */
  @Post()
  @HttpCode(200)
  @Exige('parametres')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async verifier(
    @Body(new ValidationZod(schemaCodeDeuxFacteurs)) saisie: CodeDeuxFacteurs,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SessionApi> {
    await this.deuxFacteurs.verifier(session.utilisateur.id, session.id, saisie);
    return this.etatCompte.calculer({ ...session, deuxFacteursValide: true });
  }

  /** POST /api/v1/session/deux-facteurs/configuration : nouvelle clé, avant activation. */
  @Post('configuration')
  @HttpCode(200)
  @Exige('parametres')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  configurer(@SessionCourante() session: SessionOuverte): Promise<ConfigurationDeuxFacteursApi> {
    return this.deuxFacteurs.configurer(session.utilisateur.id, session.utilisateur.pseudo);
  }

  /** PUT /api/v1/session/deux-facteurs/configuration : premier code, activation, codes de secours. */
  @Put('configuration')
  @Exige('parametres')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async activer(
    @Body(new ValidationZod(schemaActivation)) { code }: z.output<typeof schemaActivation>,
    @SessionCourante() session: SessionOuverte,
  ): Promise<ActivationDeuxFacteursApi> {
    const codesSecours = await this.deuxFacteurs.activer(session.utilisateur.id, session.id, code);
    return {
      codesSecours,
      session: await this.etatCompte.calculer({ ...session, deuxFacteursValide: true }),
    };
  }
}
