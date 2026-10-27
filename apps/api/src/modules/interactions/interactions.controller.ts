import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  type PipeTransform,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CODES_TYPE_VOTE,
  type CodeTypeVote,
  type EnregistrementApi,
  type VoteApi,
} from '@vysora/shared';
import { introuvable } from '../../commun/erreurs.js';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { InteractionsService } from './interactions.service.js';
import { VuesService } from './vues.service.js';

/** Type de vote dans l'adresse (UTILE, TESTE_OK) ; tout autre ne désigne rien. */
class TypeVotePipe implements PipeTransform<string, CodeTypeVote> {
  transform(valeur: string): CodeTypeVote {
    if (!(CODES_TYPE_VOTE as readonly string[]).includes(valeur)) throw introuvable();
    return valeur as CodeTypeVote;
  }
}

/* Interactions sur un contenu publié (F-23, F-30, F-31, F-34). Voter et enregistrer demandent un
   compte actif (e-mail vérifié, conditions acceptées, pas de suspension) ; une vue compte pour tous. */
@Controller('contenus/:id')
export class InteractionsController {
  constructor(
    private readonly interactions: InteractionsService,
    private readonly vues: VuesService,
  ) {}

  /** POST /api/v1/contenus/:id/vues : envoyé par la page du contenu à son ouverture (INT-04). La
      réponse est la même que la vue compte ou non. */
  @Post('vues')
  @HttpCode(204)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async vue(
    @Param('id', IdentifiantPipe) id: number,
    @Req() requete: RequeteVysora,
  ): Promise<void> {
    await this.vues.compter(id, {
      membreId: requete.sessionOuverte?.utilisateur.id ?? null,
      ip: requete.ip,
      userAgent: requete.headers['user-agent'],
    });
  }

  /** PUT /api/v1/contenus/:id/votes/:type : sans effet si le vote existe déjà. */
  @Put('votes/:type')
  @Exige('contribuer')
  voter(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Param('type', TypeVotePipe) type: CodeTypeVote,
  ): Promise<VoteApi> {
    return this.interactions.voter(session.utilisateur.id, id, type);
  }

  @Delete('votes/:type')
  @Exige('contribuer')
  retirerVote(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Param('type', TypeVotePipe) type: CodeTypeVote,
  ): Promise<VoteApi> {
    return this.interactions.retirerVote(session.utilisateur.id, id, type);
  }

  /** PUT /api/v1/contenus/:id/enregistrement : ajout à la liste « Enregistrés » (RG-45). */
  @Put('enregistrement')
  @Exige('contribuer')
  enregistrer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<EnregistrementApi> {
    return this.interactions.enregistrer(session.utilisateur.id, id);
  }

  @Delete('enregistrement')
  @Exige('contribuer')
  retirerEnregistrement(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<EnregistrementApi> {
    return this.interactions.retirerEnregistrement(session.utilisateur.id, id);
  }
}
