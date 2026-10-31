import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  schemaVersionDocumentLegal,
  type DocumentLegalAdministreApi,
  type SaisieVersionDocumentLegal,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { DocumentsLegauxAdminService } from './documents-legaux-admin.service.js';

/* Documents légaux (ADM-02, EC-25, RG-112), réservés aux administrateurs dont la session a confirmé
   l'identité (SEC-02). */
@Controller('admin/documents-legaux')
@Exige('administrer')
export class DocumentsLegauxAdminController {
  constructor(private readonly documents: DocumentsLegauxAdminService) {}

  /** GET /api/v1/admin/documents-legaux : chaque document et ses versions. */
  @Get()
  lister(): Promise<DocumentLegalAdministreApi[]> {
    return this.documents.documents();
  }

  /** POST /api/v1/admin/documents-legaux : nouvelle version et sa date d'effet (RG-112). */
  @Post()
  @HttpCode(201)
  publier(
    @Body(new ValidationZod(schemaVersionDocumentLegal)) saisie: SaisieVersionDocumentLegal,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DocumentLegalAdministreApi[]> {
    return this.documents.publier(session.utilisateur.id, saisie);
  }

  /** DELETE /api/v1/admin/documents-legaux/:id : version à venir publiée par erreur. */
  @Delete(':id')
  retirer(
    @Param('id', ParseIntPipe) id: number,
    @SessionCourante() session: SessionOuverte,
  ): Promise<DocumentLegalAdministreApi[]> {
    return this.documents.retirer(session.utilisateur.id, id);
  }
}
