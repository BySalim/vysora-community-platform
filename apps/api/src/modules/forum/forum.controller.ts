import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaFiltresSujets,
  schemaMessage,
  schemaSujet,
  type FiltresSujets,
  type ListeSujetsApi,
  type MessageApi,
  type SaisieMessage,
  type SaisieSujet,
  type SujetApi,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { EcritureSujetsService, type Intervenant } from './ecriture-sujets.service.js';
import { ListeSujetsService } from './liste-sujets.service.js';
import { MessagesService, type Repondant } from './messages.service.js';
import { SujetsService } from './sujets.service.js';

const intervenant = (session: SessionOuverte): Intervenant => ({
  id: session.utilisateur.id,
  role: session.utilisateur.role,
});

/* Forum (F-50 à F-55) : liste et lecture des sujets, écriture par leur auteur, réponses, réponse
   acceptée, fermeture. */
@Controller()
export class ForumController {
  constructor(
    private readonly liste: ListeSujetsService,
    private readonly sujets: SujetsService,
    private readonly ecriture: EcritureSujetsService,
    private readonly messages: MessagesService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/sujets : sujets visibles, filtrés, triés, par pages de dix. */
  @Get('sujets')
  lister(
    @Query(new ValidationZod(schemaFiltresSujets)) filtres: FiltresSujets,
  ): Promise<ListeSujetsApi> {
    return this.liste.liste(filtres);
  }

  /** GET /api/v1/sujets/:id : sujet et réponses, selon ce que la personne peut voir (RG-30). */
  @Get('sujets/:id')
  sujet(
    @Param('id', IdentifiantPipe) id: number,
    @Req() requete: RequeteVysora,
  ): Promise<SujetApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.sujets.sujet(id, membre ? { id: membre.id, role: membre.role } : null);
  }

  /** POST /api/v1/sujets (F-50) */
  @Post('sujets')
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async creer(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Body(new ValidationZod(schemaSujet)) saisie: SaisieSujet,
  ): Promise<SujetApi> {
    return this.ecriture.creer(await this.membre(session, requete), saisie);
  }

  /** PUT /api/v1/sujets/:id : contenu complet, par son auteur. */
  @Put('sujets/:id')
  @Exige('contribuer')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async modifier(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaSujet)) saisie: SaisieSujet,
  ): Promise<SujetApi> {
    return this.ecriture.modifier(await this.membre(session, requete), id, saisie);
  }

  /** DELETE /api/v1/sujets/:id : retirer le sien reste possible en lecture seule. */
  @Delete('sujets/:id')
  @HttpCode(204)
  @Exige('parametres')
  supprimer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.ecriture.supprimer(session.utilisateur.id, id);
  }

  /** PUT /api/v1/sujets/:id/fermeture : fermer (F-55, RG-65). */
  @Put('sujets/:id/fermeture')
  @Exige('contribuer')
  fermer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SujetApi> {
    return this.ecriture.fermer(intervenant(session), id);
  }

  /** DELETE /api/v1/sujets/:id/fermeture : rouvrir (RG-65). */
  @Delete('sujets/:id/fermeture')
  @Exige('contribuer')
  rouvrir(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SujetApi> {
    return this.ecriture.rouvrir(intervenant(session), id);
  }

  /** POST /api/v1/sujets/:id/messages : répondre (F-51). */
  @Post('sujets/:id/messages')
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async repondre(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) sujetId: number,
    @Body(new ValidationZod(schemaMessage)) saisie: SaisieMessage,
  ): Promise<MessageApi> {
    return this.messages.repondre(await this.membre(session, requete), sujetId, saisie);
  }

  /** PATCH /api/v1/messages/:id */
  @Patch('messages/:id')
  @Exige('contribuer')
  modifierMessage(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaMessage)) saisie: SaisieMessage,
  ): Promise<MessageApi> {
    return this.messages.modifier(intervenant(session), id, saisie);
  }

  /** DELETE /api/v1/messages/:id : retirer la sienne reste possible en lecture seule. */
  @Delete('messages/:id')
  @HttpCode(204)
  @Exige('parametres')
  supprimerMessage(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.messages.supprimer(session.utilisateur.id, id);
  }

  /** PUT /api/v1/messages/:id/acceptation : accepter cette réponse (F-52, RG-63). */
  @Put('messages/:id/acceptation')
  @Exige('contribuer')
  accepter(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SujetApi> {
    return this.messages.accepter(intervenant(session), id);
  }

  /** DELETE /api/v1/messages/:id/acceptation : retirer l'acceptation (RG-63). */
  @Delete('messages/:id/acceptation')
  @Exige('contribuer')
  retirerAcceptation(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SujetApi> {
    return this.messages.retirerAcceptation(intervenant(session), id);
  }

  private async membre(session: SessionOuverte, requete: RequeteVysora): Promise<Repondant> {
    const { etat } = await this.etatCompte.pour(requete);
    return { ...intervenant(session), etat };
  }
}
