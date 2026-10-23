import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type pg from 'pg';
import { CONFIG } from '../config/configuration.module.js';
import type { Configuration } from '../config/env.js';
import { creerBaseDeDonnees } from './client.js';

/** Jeton d'injection du client Drizzle : @Inject(BASE) db: BaseDeDonnees. */
export const BASE = Symbol('BASE');
const POOL = Symbol('POOL');

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [CONFIG],
      useFactory: (config: Configuration) => creerBaseDeDonnees(config.DATABASE_URL),
    },
    {
      provide: BASE,
      inject: [POOL],
      useFactory: (connexion: ReturnType<typeof creerBaseDeDonnees>) => connexion.db,
    },
  ],
  exports: [BASE],
})
export class BaseDeDonneesModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly connexion: { pool: pg.Pool }) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connexion.pool.end();
  }
}
