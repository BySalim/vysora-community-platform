import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  MOTIF_SAVOIR,
  schemaIllustrationSavoir,
  schemaSujetSavoir,
  type MomentsCreationApi,
  type SaisieIllustrationSavoir,
  type SaisieSujetSavoir,
  type SavoirsAdministresApi,
} from '@vysora/shared';
import { introuvable } from '../../commun/erreurs.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { ComplementsSavoirsService } from './complements-savoirs.service.js';

/** Identifiant d'un savoir (contenu éditorial du site) : lettres minuscules, chiffres, tirets. */
function savoirDe(savoir: string): string {
  if (!MOTIF_SAVOIR.test(savoir)) throw introuvable('Ce savoir est introuvable.');
  return savoir;
}

/* Compléments des savoirs d'Apprendre (APP-03) : moments clés qui illustrent un savoir et sujet du
   forum lié, choisis par l'équipe ; réservés aux administrateurs dont la session a confirmé
   l'identité (SEC-02). */
@Controller('admin')
@Exige('administrer')
export class SavoirsAdminController {
  constructor(private readonly complements: ComplementsSavoirsService) {}

  /** GET /api/v1/admin/savoirs : illustrations et sujets de tous les savoirs, montrés ou non. */
  @Get('savoirs')
  savoirs(): Promise<SavoirsAdministresApi> {
    return this.complements.administres();
  }

  /** GET /api/v1/admin/creations/:id/moments : moments clés d'une création publiée et visible. */
  @Get('creations/:id/moments')
  moments(@Param('id', ParseIntPipe) id: number): Promise<MomentsCreationApi> {
    return this.complements.momentsDe(id);
  }

  /** POST /api/v1/admin/savoirs/:savoir/illustrations */
  @Post('savoirs/:savoir/illustrations')
  @HttpCode(201)
  ajouterIllustration(
    @Param('savoir') savoir: string,
    @Body(new ValidationZod(schemaIllustrationSavoir)) saisie: SaisieIllustrationSavoir,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SavoirsAdministresApi> {
    return this.complements.ajouterIllustration(session.utilisateur.id, savoirDe(savoir), saisie);
  }

  /** DELETE /api/v1/admin/illustrations-savoirs/:id */
  @Delete('illustrations-savoirs/:id')
  retirerIllustration(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SavoirsAdministresApi> {
    return this.complements.retirerIllustration(session.utilisateur.id, id);
  }

  /** PUT /api/v1/admin/savoirs/:savoir/sujet : le sujet du forum de « Pour aller plus loin ». */
  @Put('savoirs/:savoir/sujet')
  lierSujet(
    @Param('savoir') savoir: string,
    @Body(new ValidationZod(schemaSujetSavoir)) { sujetId }: SaisieSujetSavoir,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SavoirsAdministresApi> {
    return this.complements.lierSujet(session.utilisateur.id, savoirDe(savoir), sujetId);
  }

  /** DELETE /api/v1/admin/savoirs/:savoir/sujet */
  @Delete('savoirs/:savoir/sujet')
  retirerSujet(
    @Param('savoir') savoir: string,
    @SessionCourante() session: SessionOuverte,
  ): Promise<SavoirsAdministresApi> {
    return this.complements.retirerSujet(session.utilisateur.id, savoirDe(savoir));
  }
}
