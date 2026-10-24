import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaContenuCreation,
  schemaPublicationCreation,
  type ContenuCreation,
  type CreationFicheApi,
  type PublicationCreation,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { CreationsService } from './creations.service.js';
import { EcritureCreationsService, type Redacteur } from './ecriture.service.js';

/* Créations (F-10 à F-23) : lecture d'une fiche (CREA-01), écriture par l'auteur (CREA-05). */
@Controller('creations')
export class CreationsController {
  constructor(
    private readonly creations: CreationsService,
    private readonly ecriture: EcritureCreationsService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/creations/:id : fiche complète, selon ce que la personne peut voir (RG-30). */
  @Get(':id')
  fiche(
    @Param('id', IdentifiantPipe) id: number,
    @Req() requete: RequeteVysora,
  ): Promise<CreationFicheApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.creations.fiche(id, membre ? { id: membre.id, role: membre.role } : null);
  }

  /** POST /api/v1/creations : nouveau brouillon (F-16). */
  @Post()
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async creer(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Body(new ValidationZod(schemaContenuCreation)) saisie: ContenuCreation,
  ): Promise<CreationFicheApi> {
    return this.ecriture.creer(await this.redacteur(session, requete), saisie);
  }

  /** PUT /api/v1/creations/:id : contenu complet ; publié aussitôt pour une création publiée (RG-18). */
  @Put(':id')
  @Exige('contribuer')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async enregistrer(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaContenuCreation)) saisie: ContenuCreation,
  ): Promise<CreationFicheApi> {
    return this.ecriture.enregistrer(await this.redacteur(session, requete), id, saisie);
  }

  /** POST /api/v1/creations/:id/publication : publier un brouillon (RG-17). */
  @Post(':id/publication')
  @HttpCode(200)
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async publier(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaPublicationCreation)) saisie: PublicationCreation,
  ): Promise<CreationFicheApi> {
    return this.ecriture.publier(await this.redacteur(session, requete), id, saisie);
  }

  /** DELETE /api/v1/creations/:id/publication : dépublier (RG-17). */
  @Delete(':id/publication')
  @Exige('contribuer')
  async depublier(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: RequeteVysora,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<CreationFicheApi> {
    return this.ecriture.depublier(await this.redacteur(session, requete), id);
  }

  /** DELETE /api/v1/creations/:id : supprimer (RG-19) ; retirer le sien reste possible en lecture seule. */
  @Delete(':id')
  @HttpCode(204)
  @Exige('parametres')
  supprimer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.ecriture.supprimer(session.utilisateur.id, id);
  }

  private async redacteur(session: SessionOuverte, requete: RequeteVysora): Promise<Redacteur> {
    const { etat } = await this.etatCompte.pour(requete);
    return { id: session.utilisateur.id, role: session.utilisateur.role, etat };
  }
}
