import { Controller, Get, Inject, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';

/** État de l'API pour la supervision et les sondes de déploiement : GET /api/health. */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
export class SanteController {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  @Get()
  async verifier(@Res({ passthrough: true }) reponse: Response) {
    try {
      await this.db.execute(sql`select 1`);
      return { statut: 'ok', baseDeDonnees: 'ok' };
    } catch {
      reponse.status(503);
      return { statut: 'degrade', baseDeDonnees: 'indisponible' };
    }
  }
}
