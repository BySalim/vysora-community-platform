import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { schemaAcceptationDocuments, type DocumentLegalApi, type SessionApi } from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { DocumentsLegauxService } from './documents-legaux.service.js';
import { Exige, SessionCourante } from './droits.js';
import { EtatCompteService } from './etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from './requete.js';

/* Documents légaux (F-04) : versions en vigueur, acceptation des nouvelles versions (WF-03). */
@Controller()
export class DocumentsLegauxController {
  constructor(
    private readonly documents: DocumentsLegauxService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/documents-legaux : version en vigueur de chaque document (RG-112) et, pour un
      membre connecté, celles qu'il lui reste à accepter (RG-03, pages légales). */
  @Get('documents-legaux')
  async enVigueur(@Req() requete: RequeteVysora): Promise<DocumentLegalApi[]> {
    const membre = requete.sessionOuverte?.utilisateur.id;
    const [documents, aAccepter] = await Promise.all([
      this.documents.enVigueur(),
      membre === undefined ? [] : this.documents.aAccepter(membre),
    ]);
    const restants = new Set(aAccepter.map((document) => document.id));
    return documents.map((document) => ({
      type: document.type,
      version: document.version,
      dateEffet: document.dateEffet,
      url: document.url,
      acceptationRequise: document.acceptationRequise,
      resumeChangements: document.resumeChangements,
      aAccepter: restants.has(document.id),
    }));
  }

  /** POST /api/v1/moi/acceptations : le membre accepte les versions en vigueur (RG-03) ; le compte sort de la lecture seule. */
  @Post('moi/acceptations')
  @HttpCode(200)
  @Exige('parametres')
  async accepter(
    @Body(new ValidationZod(schemaAcceptationDocuments)) _saisie: { accepte: true },
    @SessionCourante() session: SessionOuverte,
  ): Promise<SessionApi> {
    await this.documents.accepterEnVigueur(session.utilisateur.id);
    return this.etatCompte.calculer(session);
  }
}
