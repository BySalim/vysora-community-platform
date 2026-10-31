import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaListeControle,
  schemaPropositionPiege,
  schemaRechercheCreations,
  type GuideApi,
  type GuidesApi,
  type IndexRechercheApi,
  type ListeControleApi,
  type ListeControleSaisie,
  type PropositionPiegeApi,
  type PropositionPiegeSaisie,
  type RechercheCreations,
  type RechercheCreationsApi,
  type SoutienDemandeApi,
} from '@vysora/shared';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { ContributionsGuidesService } from './contributions-guides.service.js';
import { GuidesService } from './guides.service.js';
import { IndexRechercheService } from './index-recherche.service.js';
import { RechercheService } from './recherche.service.js';

/* Explorer (DEC-01, F-22) : guides, ce que la communauté cherche encore, recherche des parcours. */
@Controller()
export class DecouverteController {
  constructor(
    private readonly guides: GuidesService,
    private readonly contributions: ContributionsGuidesService,
    private readonly recherche: RechercheService,
    private readonly indexDuSite: IndexRechercheService,
  ) {}

  /** GET /api/v1/guides : guides publiés, domaines, demandes (index d'Explorer). */
  @Get('guides')
  index(@Req() requete: RequeteVysora): Promise<GuidesApi> {
    return this.guides.index(requete.sessionOuverte?.utilisateur.id ?? null);
  }

  /** GET /api/v1/guides/:slug : guide d'un objectif. */
  @Get('guides/:slug')
  guide(@Param('slug') slug: string, @Req() requete: RequeteVysora): Promise<GuideApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.guides.guide(slug, membre ? { id: membre.id, role: membre.role } : null);
  }

  /** PUT /api/v1/guides/:slug/liste : « Ma liste de contrôle », gardée aussi en lecture seule. */
  @Put('guides/:slug/liste')
  @Exige('parametres')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  liste(
    @SessionCourante() session: SessionOuverte,
    @Param('slug') slug: string,
    @Body(new ValidationZod(schemaListeControle)) saisie: ListeControleSaisie,
  ): Promise<ListeControleApi> {
    return this.contributions.enregistrerListe(slug, session.utilisateur.id, saisie);
  }

  /** POST /api/v1/guides/:slug/propositions : « Signaler un piège ». */
  @Post('guides/:slug/propositions')
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  proposer(
    @SessionCourante() session: SessionOuverte,
    @Param('slug') slug: string,
    @Body(new ValidationZod(schemaPropositionPiege)) saisie: PropositionPiegeSaisie,
  ): Promise<PropositionPiegeApi> {
    return this.contributions.proposerPiege(slug, session.utilisateur.id, saisie);
  }

  /** PUT /api/v1/demandes/:id/soutien : « Je le cherche aussi ». */
  @Put('demandes/:id/soutien')
  @Exige('contribuer')
  soutenir(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SoutienDemandeApi> {
    return this.contributions.soutenir(id, session.utilisateur.id);
  }

  /** DELETE /api/v1/demandes/:id/soutien */
  @Delete('demandes/:id/soutien')
  @Exige('contribuer')
  retirerSoutien(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<SoutienDemandeApi> {
    return this.contributions.retirerSoutien(id, session.utilisateur.id);
  }

  /** GET /api/v1/recherche/creations?q= : parcours qui correspondent (RG-31). */
  @Get('recherche/creations')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  creations(
    @Query(new ValidationZod(schemaRechercheCreations)) parametres: RechercheCreations,
  ): Promise<RechercheCreationsApi> {
    return this.recherche.creations(parametres.q);
  }

  /** GET /api/v1/recherche/index : ce que la recherche de tout le site parcourt (S-11). */
  @Get('recherche/index')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  indexRecherche(): Promise<IndexRechercheApi> {
    return this.indexDuSite.index();
  }
}
