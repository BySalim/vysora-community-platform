import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module.js';
import { configurerApplication } from '../src/application.js';
import { BASE } from '../src/db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../src/db/client.js';
import { EmailService, type EmailAEnvoyer } from '../src/modules/email/email.service.js';

/** Origine du site, acceptée par la protection CSRF (valeur par défaut de SITE_URL). */
export const ORIGINE_SITE = 'http://localhost:4321';

export interface ApplicationDeTest {
  app: INestApplication;
  db: BaseDeDonnees;
  /** E-mails « envoyés » pendant le test, gardés en mémoire. */
  emails: EmailAEnvoyer[];
}

/** L'API complète, avec la même configuration HTTP qu'en production, et un service d'e-mail factice. */
export async function demarrerApplication(): Promise<ApplicationDeTest> {
  const emails: EmailAEnvoyer[] = [];
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue({ envoyer: async (email: EmailAEnvoyer) => void emails.push(email) })
    .compile();

  const app = module.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configurerApplication(app);
  await app.init();
  return { app, db: app.get<BaseDeDonnees>(BASE), emails };
}

/** Vide des tables entre deux tests (les référentiels restent chargés). */
export async function vider(db: BaseDeDonnees, ...tables: string[]): Promise<void> {
  if (!tables.length) return;
  await db.execute(
    sql.raw(`truncate table ${tables.map((t) => `"${t}"`).join(', ')} restart identity cascade`),
  );
}
