import { Controller, Get, Header } from '@nestjs/common';
import type { ReferentielsApi } from '@vysora/shared';
import { ReferentielsService } from './referentiels.service.js';

@Controller('referentiels')
export class ReferentielsController {
  constructor(private readonly referentiels: ReferentielsService) {}

  /** GET /api/v1/referentiels : public, mis en cache quelques minutes. */
  @Get()
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  lister(): Promise<ReferentielsApi> {
    return this.referentiels.lister();
  }
}
