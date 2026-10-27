import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { FiltreErreurs } from './commun/http/filtre-erreurs.js';
import { OrigineGuard } from './commun/http/origine.guard.js';
import { CONFIG, ConfigurationModule } from './config/configuration.module.js';
import type { Configuration } from './config/env.js';
import { BaseDeDonneesModule } from './db/base-de-donnees.module.js';
import { ApprentissageModule } from './modules/apprentissage/apprentissage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DroitsGuard } from './modules/auth/droits.js';
import { ContactModule } from './modules/contact/contact.module.js';
import { CreationsModule } from './modules/creations/creations.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { FileModule } from './modules/file/file.module.js';
import { ForumModule } from './modules/forum/forum.module.js';
import { InteractionsModule } from './modules/interactions/interactions.module.js';
import { MediasModule, StockageModule } from './modules/medias/medias.module.js';
import { MembresModule } from './modules/membres/membres.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ReferentielsModule } from './modules/referentiels/referentiels.module.js';
import { SanteModule } from './modules/sante/sante.module.js';
import { TachesModule } from './modules/taches/taches.module.js';

/* Racine de l'API. Un domaine fonctionnel = un module dans src/modules (docs/architecture.md). */
@Module({
  imports: [
    ConfigurationModule,
    LoggerModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [CONFIG],
      useFactory: (config: Configuration) => ({
        pinoHttp: {
          level: config.LOG_LEVEL,
          transport:
            config.NODE_ENV === 'development'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
                }
              : undefined,
          // Journal minimal : ni en-têtes (cookies, autorisation), ni adresse IP, ni corps de requête.
          serializers: {
            req: (requete: { id: unknown; method: string; url: string }) => ({
              id: requete.id,
              method: requete.method,
              url: requete.url,
            }),
            res: (reponse: { statusCode: number }) => ({ statusCode: reponse.statusCode }),
          },
          autoLogging: { ignore: (requete) => requete.url?.startsWith('/api/health') ?? false },
        },
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    BaseDeDonneesModule,
    StockageModule,
    FileModule,
    EmailModule,
    AuthModule,
    SanteModule,
    ReferentielsModule,
    ContactModule,
    MediasModule,
    CreationsModule,
    InteractionsModule,
    NotificationsModule,
    TachesModule,
    ModerationModule,
    ForumModule,
    ApprentissageModule,
    MembresModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: FiltreErreurs },
    { provide: APP_GUARD, useClass: OrigineGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Après l'origine et le débit : droits de la personne connectée sur les routes réservées (AUTH-06).
    { provide: APP_GUARD, useExisting: DroitsGuard },
  ],
})
export class AppModule {}
