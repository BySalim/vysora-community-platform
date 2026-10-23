import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

/** Réglages HTTP communs au serveur et aux tests de bout en bout (même pile, mêmes protections). */
export function configurerApplication(app: NestExpressApplication): NestExpressApplication {
  app.useLogger(app.get(Logger));
  // Derrière le proxy du site (développement) ou le serveur frontal (production) : adresse IP réelle du client.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(helmet());
  app.use(cookieParser());
  // Les prompts et réponses d'une création peuvent être longs (RG : jusqu'à 200 000 caractères).
  app.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  return app;
}
