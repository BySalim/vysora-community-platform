import { Controller, Get, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AccueilApi, ActiviteRecenteApi } from '@vysora/shared';
import type { RequeteVysora } from '../auth/requete.js';
import { AccueilService } from './accueil.service.js';

/* Accueil (ACC-01, F-21) : ce que la page présente, calculé à chaque visite ; le fil d'activité se
   relit tant que la page reste ouverte. */
@Controller('accueil')
export class AccueilController {
  constructor(private readonly accueil: AccueilService) {}

  /** GET /api/v1/accueil */
  @Get()
  lire(@Req() requete: RequeteVysora): Promise<AccueilApi> {
    const membre = requete.sessionOuverte?.utilisateur;
    return this.accueil.accueil(membre ? { id: membre.id, role: membre.role } : null);
  }

  /** GET /api/v1/accueil/activite : « Dernières contributions ». */
  @Get('activite')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  activite(): Promise<ActiviteRecenteApi> {
    return this.accueil.activite();
  }
}
