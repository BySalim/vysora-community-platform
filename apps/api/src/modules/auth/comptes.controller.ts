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
  schemaJeton,
  schemaModificationMembre,
  schemaRenvoiVerification,
  type DisponibiliteEmail,
  type DisponibilitePseudo,
  type EmailConfirmeApi,
  type Inscription,
  type LienEnvoye,
  type ModificationMembre,
  type SessionApi,
  MOTIF_CODE_INVITATION,
  type ConditionsInscriptionApi,
  type InvitationApi,
} from '@vysora/shared';
import type { Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { nomCookieSession, poserCookieSession } from '../../commun/securite/cookies.js';
import { ChangementEmailService } from './changement-email.service.js';
import { ComptesService } from './comptes.service.js';
import { Exige, SessionCourante } from './droits.js';
import { EtatCompteService } from './etat-compte.service.js';
import { InvitationsService } from './invitations.service.js';
import { contexteDe, type RequeteVysora, type SessionOuverte } from './requete.js';
import { SessionsService } from './sessions.service.js';
import { VerificationEmailService } from './verification-email.service.js';

/* Comptes des membres (F-01) : inscription, vérifications de disponibilité, modification par le membre. */
@Controller()
export class ComptesController {
  constructor(
    private readonly comptes: ComptesService,
    private readonly sessions: SessionsService,
    private readonly etatCompte: EtatCompteService,
    private readonly verification: VerificationEmailService,
    private readonly changementEmail: ChangementEmailService,
    private readonly invitations: InvitationsService,
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

  /** GET /api/v1/inscription : l'inscription exige-t-elle un code d'invitation ? (INV-01) */
  @Get('inscription')
  conditionsInscription(): ConditionsInscriptionApi {
    return { surInvitation: this.config.INSCRIPTION_SUR_INVITATION };
  }

  /** GET /api/v1/invitations/:code : lien d'invitation, et qui invite (INV-01). */
  @Get('invitations/:code')
  @Throttle({ default: { limit: 30, ttl: 15 * 60_000 } })
  invitation(@Param('code') code: string): Promise<InvitationApi> {
    if (!MOTIF_CODE_INVITATION.test(code.toUpperCase()))
      return Promise.resolve({ valable: false, par: null });
    return this.invitations.lire(code);
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

  /** POST /api/v1/comptes/verification : le lien reçu par e-mail confirme l'adresse (AUTH-02, RG-02). */
  @Post('comptes/verification')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  async verifier(
    @Body(new ValidationZod(schemaJeton)) { jeton }: { jeton: string },
  ): Promise<void> {
    await this.verification.verifier(jeton);
  }

  /** POST /api/v1/comptes/email/confirmation : le lien reçu à la nouvelle adresse la rend adresse du
      compte (PARAM-01, F-06). Sans session : le lien suffit, la demande a exigé le mot de passe. */
  @Post('comptes/email/confirmation')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  confirmerEmail(
    @Body(new ValidationZod(schemaJeton)) { jeton }: { jeton: string },
  ): Promise<EmailConfirmeApi> {
    return this.changementEmail.confirmer(jeton);
  }

  /** POST /api/v1/comptes/verification/renvoi : nouveau lien, au membre connecté ou depuis un lien expiré. */
  @Post('comptes/verification/renvoi')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  async renvoyer(
    @Body(new ValidationZod(schemaRenvoiVerification)) { jeton }: { jeton?: string },
    @Req() requete: RequeteVysora,
  ): Promise<LienEnvoye> {
    return this.verification.renvoyer(requete.sessionOuverte?.utilisateur.id, jeton);
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

  /** PATCH /api/v1/moi : le membre modifie ses informations, même en lecture seule (paramètres).
      Au plus 10 modifications par quart d'heure : un changement d'adresse envoie un e-mail. */
  @Patch('moi')
  @Exige('parametres')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
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
        nomAffiche:
          modification.nomAffiche === undefined
            ? session.utilisateur.nomAffiche
            : modification.nomAffiche,
      },
    });
  }
}
