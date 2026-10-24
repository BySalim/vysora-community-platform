import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaModificationCommentaire,
  schemaNouveauCommentaire,
  type CommentaireApi,
  type ModificationCommentaire,
  type NouveauCommentaire,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { CommentairesService } from './commentaires.service.js';

/* Commentaires d'une création (F-40, F-42) : publier, modifier, supprimer le sien. */
@Controller()
export class CommentairesController {
  constructor(
    private readonly commentaires: CommentairesService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** POST /api/v1/creations/:id/commentaires */
  @Post('creations/:id/commentaires')
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async commenter(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) creationId: number,
    @Body(new ValidationZod(schemaNouveauCommentaire)) saisie: NouveauCommentaire,
  ): Promise<CommentaireApi> {
    const { etat } = await this.etatCompte.pour(requete);
    return this.commentaires.commenter({ id: session.utilisateur.id, etat }, creationId, saisie);
  }

  /** PATCH /api/v1/commentaires/:id */
  @Patch('commentaires/:id')
  @Exige('contribuer')
  modifier(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaModificationCommentaire)) saisie: ModificationCommentaire,
  ): Promise<CommentaireApi> {
    return this.commentaires.modifier(session.utilisateur.id, id, saisie);
  }

  /** DELETE /api/v1/commentaires/:id : retirer le sien reste possible en lecture seule. */
  @Delete('commentaires/:id')
  @HttpCode(204)
  @Exige('parametres')
  supprimer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.commentaires.supprimer(session.utilisateur.id, id);
  }
}
