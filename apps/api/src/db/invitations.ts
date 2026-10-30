import { sql } from 'drizzle-orm';
import { lireConfiguration } from '../config/env.js';
import { genererCodeInvitation } from '../modules/auth/invitations.service.js';
import { creerBaseDeDonnees } from './client.js';
import { invitation, utilisateur } from './schema/index.js';

/* INV-01 : crée des codes d'invitation de la bêta fermée, en attendant l'administration (ADM-01).
   pnpm invitations:creer -- 10 claire-dubois 30  →  10 codes, créés au nom de claire-dubois,
   valables 30 jours (le membre et la durée sont facultatifs). */

const [nombreBrut = '1', pseudo, joursBrut] = process.argv.slice(2).filter((a) => a !== '--');
const nombre = Math.min(500, Math.max(1, Number.parseInt(nombreBrut, 10) || 1));
const jours = joursBrut ? Number.parseInt(joursBrut, 10) : null;

const config = lireConfiguration();
const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
try {
  let createurId: number | null = null;
  if (pseudo) {
    const [membre] = await db
      .select({ id: utilisateur.id })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.pseudo}) = ${pseudo.toLowerCase()}`);
    if (!membre) throw new Error(`Aucun membre ne s’appelle « ${pseudo} ».`);
    createurId = membre.id;
  }
  const expiration = jours ? new Date(Date.now() + jours * 86_400_000) : null;
  const codes: string[] = [];
  while (codes.length < nombre) {
    const [cree] = await db
      .insert(invitation)
      .values({ code: genererCodeInvitation(), createurId, dateExpiration: expiration })
      .onConflictDoNothing()
      .returning({ code: invitation.code });
    if (cree) codes.push(cree.code);
  }
  console.log(codes.join('\n'));
} finally {
  await pool.end();
}
