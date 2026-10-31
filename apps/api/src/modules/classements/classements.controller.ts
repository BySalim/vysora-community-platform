import { Controller, Get, Query, Req } from '@nestjs/common';
import type { ClassementsApi } from '@vysora/shared';
import type { RequeteVysora } from '../auth/requete.js';
import { ClassementsService } from './classements.service.js';

@Controller('classements')
export class ClassementsController {
  constructor(private readonly classements: ClassementsService) {}

  /** GET /api/v1/classements?semaine=AAAA-MM-JJ (lundi) : palmarès et classements (F-75, RG-87).
      Une semaine inconnue donne la semaine en cours. */
  @Get()
  lire(@Req() requete: RequeteVysora, @Query('semaine') semaine?: string): Promise<ClassementsApi> {
    return this.classements.classements(
      requete.sessionOuverte?.utilisateur.id ?? null,
      typeof semaine === 'string' ? semaine : undefined,
    );
  }
}
