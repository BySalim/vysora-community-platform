import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaDisponibiliteEmail,
  schemaInscription,
  schemaModificationMembre,
  type DisponibiliteEmail,
  type DisponibilitePseudo,
  type Inscription,
  type ModificationMembre,
  type SessionApi,
} from '@vysora/shared';
import type { Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { nomCookieSession, poserCookieSession } from '../../commun/securite/cookies.js';
import { ComptesService } from './comptes.service.js';
import { Exige, SessionCourante } from './droits.js';
import { EtatCompteService } from './etat-compte.service.js';
import { contexteDe, type RequeteVysora, type SessionOuverte } from './requete.js';
import { SessionsService } from './sessions.service.js';

/* Comptes des membres (F-01) : inscription, vérifications de disponibilité, modification par le membre. */
@Controller()
export class ComptesController {
  constructor(
    private readonly comptes: ComptesService,
    private readonly sessions: SessionsService,
    private readonly etatCompte: EtatCompteService,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  /** POST /api/v1/comptes : inscription par e-mail ; la session est ouverte dans la foulée. */
  @Post('comptes')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async inscrire(
    @Body(new ValidationZod(schemaInscription)) saisie: Inscription,
    @Req() requete: RequeteVysora,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<SessionApi> {
    const cree = await this.comptes.inscrire(saisie, contexteDe(requete));
    const precedent: unknown = requete.cookies?.[nomCookieSession(this.config)];
    if (typeof precedent === 'string' && precedent) await this.sessions.fermer(precedent);
    poserCookieSession(reponse, this.config, cree.jeton, cree.expiration);
    return this.etatCompte.calculer((await this.sessions.retrouver(cree.jeton)) ?? undefined);
  }

  /** POST /api/v1/comptes/disponibilite : l'adresse est-elle libre ? (première étape de l'inscription) */
  @Post('comptes/disponibilite')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  disponibiliteEmail(
    @Body(new ValidationZod(schemaDisponibiliteEmail)) { email }: { email: string },
  ): Promise<DisponibiliteEmail> {
    return this.comptes.disponibiliteEmail(email);
  }

  /** GET /api/v1/pseudos/:pseudo/disponibilite : vérification pendant la saisie (RG-01). */
  @Get('pseudos/:pseudo/disponibilite')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  disponibilitePseudo(
    @Param('pseudo') pseudo: string,
    @Req() requete: RequeteVysora,
  ): Promise<DisponibilitePseudo> {
    return this.comptes.disponibilitePseudo(pseudo, requete.sessionOuverte?.utilisateur.id);
  }

  /** PATCH /api/v1/moi : le membre modifie ses informations, même en lecture seule (paramètres). */
  @Patch('moi')
  @Exige('parametres')
  async modifier(
    @Body(new ValidationZod(schemaModificationMembre)) modification: ModificationMembre,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SessionApi> {
    await this.comptes.modifier(session.utilisateur.id, modification);
    return this.etatCompte.calculer({
      ...session,
      utilisateur: {
        ...session.utilisateur,
        pseudo: modification.pseudo ?? session.utilisateur.pseudo,
      },
    });
  }
}
