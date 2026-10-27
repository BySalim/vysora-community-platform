import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaChangementEmail,
  schemaChangementMotDePasse,
  schemaSuppressionCompte,
  type ChangementEmail,
  type ChangementMotDePasse,
  type ParametresApi,
  type SuppressionCompte,
  type SuppressionDemandeeApi,
} from '@vysora/shared';
import type { Response } from 'express';
import { introuvable } from '../../commun/erreurs.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { effacerCookieSession } from '../../commun/securite/cookies.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ChangementEmailService } from '../auth/changement-email.service.js';
import { ChangementMotDePasseService } from '../auth/changement-mot-de-passe.service.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { SessionsService } from '../auth/sessions.service.js';
import { ExportService } from './export.service.js';
import { ParametresService } from './parametres.service.js';
import { SuppressionService } from './suppression.service.js';

/* Page Paramètres (PARAM-01, EC-17 ; F-06, F-07, F-08). Toutes les routes restent ouvertes à un
   compte en lecture seule (@Exige('parametres')) ; chaque modification renvoie les paramètres à
   jour. Le pseudo, le nom et le fuseau se modifient par PATCH /api/v1/moi, les préférences
   d'e-mail par PUT /api/v1/moi/preferences-notifications. */
@Controller('moi')
@Exige('parametres')
export class ParametresController {
  constructor(
    private readonly parametres: ParametresService,
    private readonly changementEmail: ChangementEmailService,
    private readonly motDePasse: ChangementMotDePasseService,
    private readonly sessions: SessionsService,
    private readonly exports: ExportService,
    private readonly suppression: SuppressionService,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  /** GET /api/v1/moi/parametres */
  @Get('parametres')
  lire(@SessionCourante() session: SessionOuverte): Promise<ParametresApi> {
    return this.parametres.lire(session);
  }

  /** POST /api/v1/moi/email : lien de confirmation vers la nouvelle adresse, alerte à l'actuelle. */
  @Post('email')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async changerEmail(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaChangementEmail)) saisie: ChangementEmail,
  ): Promise<ParametresApi> {
    await this.changementEmail.demander(session.utilisateur.id, saisie);
    return this.parametres.lire(session);
  }

  /** POST /api/v1/moi/email/renvoi : nouveau lien vers l'adresse en attente. */
  @Post('email/renvoi')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async renvoyerEmail(@SessionCourante() session: SessionOuverte): Promise<ParametresApi> {
    await this.changementEmail.renvoyer(session.utilisateur.id);
    return this.parametres.lire(session);
  }

  /** DELETE /api/v1/moi/email : annule le changement d'adresse en attente. */
  @Delete('email')
  async annulerEmail(@SessionCourante() session: SessionOuverte): Promise<ParametresApi> {
    await this.changementEmail.annuler(session.utilisateur.id);
    return this.parametres.lire(session);
  }

  /** PUT /api/v1/moi/mot-de-passe : le mot de passe actuel est exigé (WF-02). */
  @Put('mot-de-passe')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async changerMotDePasse(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaChangementMotDePasse)) saisie: ChangementMotDePasse,
  ): Promise<ParametresApi> {
    await this.motDePasse.modifier(session, saisie);
    return this.parametres.lire(session);
  }

  /** DELETE /api/v1/moi/sessions : déconnecte les autres appareils. */
  @Delete('sessions')
  async deconnecterAutres(@SessionCourante() session: SessionOuverte): Promise<ParametresApi> {
    await this.sessions.fermerAutres(session.utilisateur.id, session.id);
    return this.parametres.lire(session);
  }

  /** DELETE /api/v1/moi/sessions/:cle : déconnecte un autre appareil. */
  @Delete('sessions/:cle')
  async deconnecter(
    @SessionCourante() session: SessionOuverte,
    @Param('cle') cle: string,
  ): Promise<ParametresApi> {
    if (!(await this.sessions.fermerAppareil(session.utilisateur.id, cle, session.id)))
      throw introuvable('Cet appareil n’est plus connecté à votre compte.');
    return this.parametres.lire(session);
  }

  /** POST /api/v1/moi/export : demande d'export (F-07, WF-22). */
  @Post('export')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  async demanderExport(@SessionCourante() session: SessionOuverte): Promise<ParametresApi> {
    await this.exports.demander(session.utilisateur.id);
    return this.parametres.lire(session);
  }

  /** GET /api/v1/moi/export/fichier : le fichier JSON, pendant les 7 jours qui suivent sa préparation. */
  @Get('export/fichier')
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  async telecharger(
    @SessionCourante() session: SessionOuverte,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<StreamableFile> {
    const { nom, contenu } = await this.exports.fichier(session.utilisateur.id);
    reponse.set('Cache-Control', 'no-store');
    return new StreamableFile(Buffer.from(contenu, 'utf8'), {
      type: 'application/json; charset=utf-8',
      disposition: `attachment; filename="${nom}"`,
    });
  }

  /** POST /api/v1/moi/suppression : le compte passe EN_SUPPRESSION et la session se ferme (F-08). */
  @Post('suppression')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async supprimer(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaSuppressionCompte)) saisie: SuppressionCompte,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<SuppressionDemandeeApi> {
    const demande = await this.suppression.demander(session.utilisateur.id, saisie);
    effacerCookieSession(reponse, this.config);
    return demande;
  }
}
