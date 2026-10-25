import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  peut,
  schemaCas,
  schemaExamenCas,
  schemaFiltresCas,
  schemaReponseCas,
  type ApprentissageApi,
  type CasApi,
  type ExamenCas,
  type FiltresCas,
  type ListeCasApi,
  type ListeCasAValiderApi,
  type MesCasApi,
  type ReponseCasApi,
  type SaisieCas,
  type SaisieReponseCas,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import type { Intervenant } from '../forum/ecriture-sujets.service.js';
import { CasService } from './cas.service.js';
import { EcritureCasService } from './ecriture-cas.service.js';
import { ListeCasService } from './liste-cas.service.js';
import { ReponsesCasService } from './reponses-cas.service.js';

const intervenant = (session: SessionOuverte): Intervenant => ({
  id: session.utilisateur.id,
  role: session.utilisateur.role,
});

/* Bon réflexe (F-60 à F-62) : liste et lecture des cas, réponse (visiteur compris), proposition et
   modification par l'auteur, examen par la modération, listes privées de l'auteur et de
   l'apprenant. Votes, enregistrements et signalements passent par les modules interactions et
   moderation. */
@Controller()
export class ApprentissageController {
  constructor(
    private readonly liste: ListeCasService,
    private readonly lecture: CasService,
    private readonly ecriture: EcritureCasService,
    private readonly reponses: ReponsesCasService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/cas : cas validés, filtrés, triés, par pages de vingt. */
  @Get('cas')
  lister(
    @Query(new ValidationZod(schemaFiltresCas)) filtres: FiltresCas,
    @Req() requete: RequeteVysora,
  ): Promise<ListeCasApi> {
    return this.liste.liste(filtres, requete.sessionOuverte?.utilisateur.id ?? null);
  }

  /** GET /api/v1/cas/:id : cas, et sa correction selon la personne (RG-30, F-62). */
  @Get('cas/:id')
  cas(@Param('id', IdentifiantPipe) id: number, @Req() requete: RequeteVysora): Promise<CasApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.lecture.cas(id, membre ? { id: membre.id, role: membre.role } : null);
  }

  /** POST /api/v1/cas (F-60) : niveau Expert ou plus, ou équipe de modération (RG-70, CI-30). */
  @Post('cas')
  @HttpCode(201)
  @Exige('proposer-cas')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  proposer(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaCas)) saisie: SaisieCas,
  ): Promise<CasApi> {
    return this.ecriture.proposer(intervenant(session), saisie);
  }

  /** PUT /api/v1/cas/:id : contenu complet, par son auteur ; le cas est soumis de nouveau (RG-71). */
  @Put('cas/:id')
  @Exige('proposer-cas')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  modifier(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaCas)) saisie: SaisieCas,
  ): Promise<CasApi> {
    return this.ecriture.modifier(intervenant(session), id, saisie);
  }

  /** DELETE /api/v1/cas/:id : retirer le sien reste possible en lecture seule. */
  @Delete('cas/:id')
  @HttpCode(204)
  @Exige('parametres')
  supprimer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.ecriture.supprimer(session.utilisateur.id, id);
  }

  /** POST /api/v1/cas/:id/reponses (F-62) : ouvert à tous ; enregistrée pour un compte actif
      seulement (RG-72). Réponse 200 dans tous les cas : un visiteur ne crée rien. */
  @Post('cas/:id/reponses')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async repondre(
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaReponseCas)) saisie: SaisieReponseCas,
  ): Promise<ReponseCasApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    const personne = membre
      ? {
          id: membre.id,
          role: membre.role,
          enregistrer: peut('contribuer', (await this.etatCompte.pour(requete)).etat),
        }
      : null;
    return this.reponses.repondre(id, saisie.optionId, personne);
  }

  /** PUT /api/v1/cas/:id/examen : valider ou refuser avec un motif (F-61, RG-71). */
  @Put('cas/:id/examen')
  @Exige('moderer')
  examiner(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaExamenCas)) examen: ExamenCas,
  ): Promise<CasApi> {
    return this.ecriture.examiner(intervenant(session), id, examen);
  }

  /** GET /api/v1/moderation/cas?apres=<curseur> : cas proposés, à valider (EC-20). */
  @Get('moderation/cas')
  @Exige('moderer')
  aValider(
    @SessionCourante() session: SessionOuverte,
    @Query('apres') apres?: string,
  ): Promise<ListeCasAValiderApi> {
    return this.liste.aValider(session.utilisateur.id, apres);
  }

  /** GET /api/v1/moi/cas : cas proposés par la personne, quel que soit leur statut. */
  @Get('moi/cas')
  @Exige('parametres')
  mesCas(@SessionCourante() session: SessionOuverte): Promise<MesCasApi> {
    return this.lecture.mesCas(session.utilisateur.id);
  }

  /** GET /api/v1/moi/apprentissage : statistiques d'apprentissage, visibles du seul membre (RG-88). */
  @Get('moi/apprentissage')
  @Exige('parametres')
  apprentissage(@SessionCourante() session: SessionOuverte): Promise<ApprentissageApi> {
    return this.lecture.apprentissage(session.utilisateur.id);
  }
}
