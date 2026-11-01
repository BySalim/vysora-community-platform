import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  schemaContenuGuide,
  schemaDemandeGuide,
  schemaGuide,
  schemaNouveauGuide,
  schemaPagePropositions,
  schemaRelecturePiege,
  type DemandesAdministreesApi,
  type GuideAdministreApi,
  type GuidesAdministresApi,
  type PropositionsPiegeApi,
  type RelecturePiege,
  type RelecturePiegeApi,
  type SaisieContenuGuide,
  type SaisieDemandeGuide,
  type SaisieGuide,
  type SaisieNouveauGuide,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { AdministrationGuidesService } from './administration-guides.service.js';
import { RelectureGuidesService } from './relecture-guides.service.js';

/* Administration des guides d'Explorer (DEC-02) : administrateurs dont l'identité est confirmée
   (@Exige('administrer'), SEC-02). */
@Controller('admin')
@Exige('administrer')
export class AdministrationGuidesController {
  constructor(
    private readonly guides: AdministrationGuidesService,
    private readonly relecture: RelectureGuidesService,
  ) {}

  /** GET /api/v1/admin/guides : guides en préparation et publiés. */
  @Get('guides')
  liste(): Promise<GuidesAdministresApi> {
    return this.guides.liste();
  }

  /** POST /api/v1/admin/guides : nouveau guide, en préparation. */
  @Post('guides')
  @HttpCode(201)
  creer(
    @Body(new ValidationZod(schemaNouveauGuide)) saisie: SaisieNouveauGuide,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.creer(session.utilisateur.id, saisie);
  }

  /** GET /api/v1/admin/guides/:id */
  @Get('guides/:id')
  guide(@Param('id', IdentifiantPipe) id: number): Promise<GuideAdministreApi> {
    return this.guides.lire(id);
  }

  /** PUT /api/v1/admin/guides/:id : objectif, méthode, pièges et lacunes. */
  @Put('guides/:id')
  modifier(
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaGuide)) saisie: SaisieGuide,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.modifier(session.utilisateur.id, id, saisie);
  }

  /** DELETE /api/v1/admin/guides/:id : guide en préparation créé par erreur. */
  @Delete('guides/:id')
  @HttpCode(204)
  supprimer(
    @Param('id', IdentifiantPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<void> {
    return this.guides.supprimer(session.utilisateur.id, id);
  }

  /** POST /api/v1/admin/guides/:id/publication : le guide apparaît dans Explorer. */
  @Post('guides/:id/publication')
  @HttpCode(200)
  publier(
    @Param('id', IdentifiantPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.publier(session.utilisateur.id, id);
  }

  /** DELETE /api/v1/admin/guides/:id/publication : le guide repasse en préparation. */
  @Delete('guides/:id/publication')
  mettreEnPreparation(
    @Param('id', IdentifiantPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.mettreEnPreparation(session.utilisateur.id, id);
  }

  /** POST /api/v1/admin/guides/:id/contenus : parcours, question ou cas ajouté au guide. */
  @Post('guides/:id/contenus')
  @HttpCode(201)
  ajouterContenu(
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaContenuGuide)) saisie: SaisieContenuGuide,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.ajouterContenu(session.utilisateur.id, id, saisie.contenuId);
  }

  /** DELETE /api/v1/admin/guides/:id/contenus/:contenuId : retiré du guide (un parcours mal rangé
      par le rapprochement n'y revient plus). */
  @Delete('guides/:id/contenus/:contenuId')
  retirerContenu(
    @Param('id', IdentifiantPipe) id: number,
    @Param('contenuId', IdentifiantPipe) contenuId: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<GuideAdministreApi> {
    return this.guides.retirerContenu(session.utilisateur.id, id, contenuId);
  }

  /** GET /api/v1/admin/propositions-pieges?page= : pièges signalés en attente de relecture. */
  @Get('propositions-pieges')
  propositions(
    @Query(new ValidationZod(schemaPagePropositions)) parametres: { page: number },
  ): Promise<PropositionsPiegeApi> {
    return this.relecture.propositions(parametres.page);
  }

  /** POST /api/v1/admin/propositions-pieges/:id/relecture : retenu (écrit dans le guide) ou écarté. */
  @Post('propositions-pieges/:id/relecture')
  @HttpCode(200)
  relire(
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaRelecturePiege)) saisie: RelecturePiege,
    @SessionCourante() session: SessionOuverte,
  ): Promise<RelecturePiegeApi> {
    return this.relecture.relire(session.utilisateur.id, id, saisie);
  }

  /** GET /api/v1/admin/demandes : « Ce que la communauté cherche encore », ouvertes et closes. */
  @Get('demandes')
  demandes(): Promise<DemandesAdministreesApi> {
    return this.relecture.demandes();
  }

  /** POST /api/v1/admin/demandes */
  @Post('demandes')
  @HttpCode(201)
  async creerDemande(
    @Body(new ValidationZod(schemaDemandeGuide)) saisie: SaisieDemandeGuide,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DemandesAdministreesApi> {
    await this.relecture.creerDemande(session.utilisateur.id, saisie);
    return this.relecture.demandes();
  }

  /** POST /api/v1/admin/demandes/:id/cloture : un guide couvre l'objectif. */
  @Post('demandes/:id/cloture')
  @HttpCode(200)
  async clore(
    @Param('id', IdentifiantPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DemandesAdministreesApi> {
    await this.relecture.clore(session.utilisateur.id, id, true);
    return this.relecture.demandes();
  }

  /** DELETE /api/v1/admin/demandes/:id/cloture : la demande est rouverte. */
  @Delete('demandes/:id/cloture')
  async rouvrir(
    @Param('id', IdentifiantPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DemandesAdministreesApi> {
    await this.relecture.clore(session.utilisateur.id, id, false);
    return this.relecture.demandes();
  }
}
