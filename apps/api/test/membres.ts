import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { jetonAleatoire, sha256 } from '../src/commun/securite/empreintes.js';
import type { BaseDeDonnees } from '../src/db/client.js';
import {
  acceptationDocument,
  documentLegal,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
import { COOKIE_SESSION } from './outils.js';

/* Membres de test créés directement en base, sans passer par l'inscription (limitée en débit). */

export const MOT_DE_PASSE = 'une lagune au petit matin';
let empreinte: Promise<string> | undefined;

export interface MembreDeTest {
  id: number;
  pseudo: string;
  email: string;
}

export async function creerMembre(
  db: BaseDeDonnees,
  options: Partial<typeof utilisateur.$inferInsert> & { documentsAcceptes?: boolean } = {},
): Promise<MembreDeTest> {
  const { documentsAcceptes = true, ...valeurs } = options;
  empreinte ??= hash(MOT_DE_PASSE, { algorithm: 2 });
  const [membre] = await db
    .insert(utilisateur)
    .values({
      pseudo: `membre-${Math.random().toString(36).slice(2, 10)}`,
      email: `${Math.random().toString(36).slice(2, 10)}@example.com`,
      emailVerifie: true,
      empreinteMotDePasse: await empreinte,
      ...valeurs,
    })
    .returning({ id: utilisateur.id, pseudo: utilisateur.pseudo, email: utilisateur.email });
  if (!membre?.email) throw new Error('Membre de test non créé');
  if (documentsAcceptes) {
    const documents = await db.select({ id: documentLegal.id }).from(documentLegal);
    await db
      .insert(acceptationDocument)
      .values(documents.map((d) => ({ utilisateurId: membre.id, documentLegalId: d.id })));
  }
  return { id: membre.id, pseudo: membre.pseudo, email: membre.email };
}

/** Ouvre une session en base pour un membre et renvoie l'en-tête Cookie à envoyer. */
export async function ouvrirSession(
  db: BaseDeDonnees,
  utilisateurId: number,
  expiration = new Date(Date.now() + 86_400_000),
): Promise<string> {
  const jeton = jetonAleatoire();
  await db.insert(session).values({ id: sha256(jeton), utilisateurId, dateExpiration: expiration });
  return `${COOKIE_SESSION}=${jeton}`;
}

export const sessionsDe = (db: BaseDeDonnees, utilisateurId: number) =>
  db.select().from(session).where(eq(session.utilisateurId, utilisateurId));
