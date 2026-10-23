import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module.js';
import { configurerApplication } from '../src/application.js';
import { BASE } from '../src/db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../src/db/client.js';
import { utilisateur } from '../src/db/schema/index.js';
import { DocumentsLegauxService } from '../src/modules/auth/documents-legaux.service.js';
import { MotsDePasseService } from '../src/modules/auth/mots-de-passe.service.js';
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

let derniereIp = 0;
/** Adresse IP propre à un test (X-Forwarded-For, accepté du relais local) : les limites de débit
    par adresse ne débordent pas d'un test à l'autre. */
export const ipDeTest = (): string =>
  `10.0.${Math.floor(++derniereIp / 250)}.${(derniereIp % 250) + 1}`;

export const MOT_DE_PASSE = 'lagune ocre baobab';

/** Membre créé directement en base : e-mail vérifié et documents en vigueur acceptés, sauf indication contraire. */
export async function creerMembre(
  contexte: ApplicationDeTest,
  valeurs: Partial<typeof utilisateur.$inferInsert> & {
    motDePasse?: string;
    documentsAcceptes?: boolean;
  } = {},
): Promise<typeof utilisateur.$inferSelect> {
  const { motDePasse = MOT_DE_PASSE, documentsAcceptes = true, ...colonnes } = valeurs;
  const [membre] = await contexte.db
    .insert(utilisateur)
    .values({
      pseudo: 'awa-sarr',
      email: 'awa.sarr@example.com',
      emailVerifie: true,
      empreinteMotDePasse: await contexte.app.get(MotsDePasseService).hacher(motDePasse),
      ...colonnes,
    })
    .returning();
  if (!membre) throw new Error('Membre non créé');
  if (documentsAcceptes)
    await contexte.app.get(DocumentsLegauxService).accepterEnVigueur(membre.id);
  return membre;
}

/** Valeur d'un cookie posé par la réponse (en-têtes Set-Cookie), ou undefined. */
export function cookieRecu(
  entetes: Record<string, unknown>,
  nom = 'vysora_session',
): string | undefined {
  const cookies = ([] as string[]).concat(
    (entetes['set-cookie'] as string[] | string | undefined) ?? [],
  );
  return cookies.find((cookie) => cookie.startsWith(`${nom}=`));
}
