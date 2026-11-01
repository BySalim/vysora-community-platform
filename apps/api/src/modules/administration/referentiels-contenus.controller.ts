import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  schemaEtatReferentiel,
  schemaCategorie,
  schemaFiltresEtiquettes,
  schemaLicence,
  schemaModificationLicence,
  schemaOrdreReferentiel,
  type EtatReferentiel,
  type OrdreReferentiel,
  type BadgeAdministreApi,
  type CategorieAdministreeApi,
  type EtiquetteAdministreeApi,
  type FiltresEtiquettes,
  type LicenceAdministreeApi,
  type ListeEtiquettesAdministreesApi,
  type ModificationLicence,
  type SaisieCategorie,
  type SaisieLicence,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { ReferentielsContenusService } from './referentiels-contenus.service.js';

/* Référentiels des contenus (ADM-02, EC-22, F-95, RG-110) : catégories, licences, étiquettes et
   badges, réservés aux administrateurs dont la session a confirmé l'identité (SEC-02). */
@Controller('admin')
@Exige('administrer')
export class ReferentielsContenusController {
  constructor(private readonly referentiels: ReferentielsContenusService) {}

  /** GET /api/v1/admin/categories : archivées comprises, dans l'ordre d'affichage. */
  @Get('categories')
  categories(): Promise<CategorieAdministreeApi[]> {
    return this.referentiels.categories();
  }

  /** POST /api/v1/admin/categories (F-95). */
  @Post('categories')
  @HttpCode(201)
  creerCategorie(
    @Body(new ValidationZod(schemaCategorie)) saisie: SaisieCategorie,
    @SessionCourante() session: SessionOuverte,
  ): Promise<CategorieAdministreeApi> {
    return this.referentiels.creerCategorie(session.utilisateur.id, saisie);
  }

  /** PUT /api/v1/admin/categories/ordre : ordre des domaines, archivés compris (F-95). */
  @Put('categories/ordre')
  ordonnerCategories(
    @Body(new ValidationZod(schemaOrdreReferentiel)) { ids }: OrdreReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<CategorieAdministreeApi[]> {
    return this.referentiels.ordonnerCategories(session.utilisateur.id, ids);
  }

  /** PUT /api/v1/admin/categories/:id : libellé, icône et présentation du domaine. */
  @Put('categories/:id')
  modifierCategorie(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaCategorie)) saisie: SaisieCategorie,
    @SessionCourante() session: SessionOuverte,
  ): Promise<CategorieAdministreeApi> {
    return this.referentiels.modifierCategorie(session.utilisateur.id, id, saisie);
  }

  /** PATCH /api/v1/admin/categories/:id : archiver ou proposer de nouveau (RG-110). */
  @Patch('categories/:id')
  activerCategorie(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaEtatReferentiel)) { actif }: EtatReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<CategorieAdministreeApi> {
    return this.referentiels.activerCategorie(session.utilisateur.id, id, actif);
  }

  /** GET /api/v1/admin/licences */
  @Get('licences')
  licences(): Promise<LicenceAdministreeApi[]> {
    return this.referentiels.licences();
  }

  /** POST /api/v1/admin/licences (F-17, F-95). */
  @Post('licences')
  @HttpCode(201)
  creerLicence(
    @Body(new ValidationZod(schemaLicence)) saisie: SaisieLicence,
    @SessionCourante() session: SessionOuverte,
  ): Promise<LicenceAdministreeApi> {
    return this.referentiels.creerLicence(session.utilisateur.id, saisie);
  }

  /** PUT /api/v1/admin/licences/ordre : ordre des licences proposées, archivées comprises. */
  @Put('licences/ordre')
  ordonnerLicences(
    @Body(new ValidationZod(schemaOrdreReferentiel)) { ids }: OrdreReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<LicenceAdministreeApi[]> {
    return this.referentiels.ordonnerLicences(session.utilisateur.id, ids);
  }

  /** PUT /api/v1/admin/licences/:id : libellé, résumé et adresse du texte. */
  @Put('licences/:id')
  modifierLicence(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaModificationLicence)) saisie: ModificationLicence,
    @SessionCourante() session: SessionOuverte,
  ): Promise<LicenceAdministreeApi> {
    return this.referentiels.modifierLicence(session.utilisateur.id, id, saisie);
  }

  /** PATCH /api/v1/admin/licences/:id : archiver ou proposer de nouveau (RG-110, CI-26). */
  @Patch('licences/:id')
  activerLicence(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaEtatReferentiel)) { actif }: EtatReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<LicenceAdministreeApi> {
    return this.referentiels.activerLicence(session.utilisateur.id, id, actif);
  }

  /** POST /api/v1/admin/licences/:id/defaut : licence proposée par défaut (CI-26). */
  @Post('licences/:id/defaut')
  @HttpCode(200)
  licenceParDefaut(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<LicenceAdministreeApi[]> {
    return this.referentiels.licenceParDefaut(session.utilisateur.id, id);
  }

  /** GET /api/v1/admin/etiquettes?q=&etat=&page= */
  @Get('etiquettes')
  etiquettes(
    @Query(new ValidationZod(schemaFiltresEtiquettes)) filtres: FiltresEtiquettes,
  ): Promise<ListeEtiquettesAdministreesApi> {
    return this.referentiels.etiquettes(filtres);
  }

  /** PATCH /api/v1/admin/etiquettes/:id : archiver ou proposer de nouveau (CI-04, RG-110). */
  @Patch('etiquettes/:id')
  activerEtiquette(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaEtatReferentiel)) { actif }: EtatReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<EtiquetteAdministreeApi> {
    return this.referentiels.activerEtiquette(session.utilisateur.id, id, actif);
  }

  /** GET /api/v1/admin/badges */
  @Get('badges')
  badges(): Promise<BadgeAdministreApi[]> {
    return this.referentiels.badges();
  }

  /** PATCH /api/v1/admin/badges/:id : arrêter ou reprendre l'attribution (RG-86). */
  @Patch('badges/:id')
  activerBadge(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationZod(schemaEtatReferentiel)) { actif }: EtatReferentiel,
    @SessionCourante() session: SessionOuverte,
  ): Promise<BadgeAdministreApi> {
    return this.referentiels.activerBadge(session.utilisateur.id, id, actif);
  }
}
