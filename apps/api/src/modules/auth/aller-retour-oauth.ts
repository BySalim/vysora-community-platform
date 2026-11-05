import { INTENTIONS_SERVICE, SERVICES_EXTERNES } from '@vysora/shared';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import type { Configuration } from '../../config/env.js';
import { chiffrer, dechiffrer } from '../../commun/securite/chiffrement.js';

/* Aller-retour vers GitHub ou Google (S-10) : ce que l'API doit retrouver au retour (secrets du
   protocole, intention, code d'invitation, page où revenir) voyage dans un cookie chiffré et
   authentifié (AES-256-GCM, CLE_CHIFFREMENT), propre à ce navigateur et valable 10 minutes. C'est
   lui qui lie `state` au navigateur : un retour sans ce cookie, ou avec un autre `state`, est refusé
   (falsification de connexion). SameSite=Lax : il accompagne le retour du service, une navigation
   de premier niveau. */

const DUREE_MS = 10 * 60_000;
const CHEMIN = '/api/v1/auth';

const schemaAllerRetour = z.object({
  service: z.enum(SERVICES_EXTERNES),
  intention: z.enum(INTENTIONS_SERVICE),
  state: z.string().min(1),
  verificateur: z.string().min(1),
  nonce: z.string().min(1),
  /** Code d'invitation saisi avant de partir (inscription pendant la bêta, INV-01). */
  invitation: z.string().max(32).optional(),
  /** « retour=…&pour=… » de la page de départ, déjà validé. */
  requete: z.string().max(400).optional(),
  expire: z.number(),
});
export type AllerRetour = z.output<typeof schemaAllerRetour>;

const nomCookie = (config: Pick<Configuration, 'NODE_ENV'>): string =>
  config.NODE_ENV === 'production' ? '__Secure-vysora_oauth' : 'vysora_oauth';

const options = (config: Pick<Configuration, 'NODE_ENV'>): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  path: CHEMIN,
});

export function poserAllerRetour(
  reponse: Response,
  config: Pick<Configuration, 'NODE_ENV' | 'CLE_CHIFFREMENT'>,
  allerRetour: Omit<AllerRetour, 'expire'>,
): void {
  const valeur = chiffrer(
    config.CLE_CHIFFREMENT,
    JSON.stringify({ ...allerRetour, expire: Date.now() + DUREE_MS }),
  );
  reponse.cookie(nomCookie(config), valeur, { ...options(config), maxAge: DUREE_MS });
}

/** L'aller-retour en cours, ou null s'il manque, a expiré ou a été modifié. */
export function lireAllerRetour(
  requete: Request,
  config: Pick<Configuration, 'NODE_ENV' | 'CLE_CHIFFREMENT'>,
): AllerRetour | null {
  const valeur: unknown = requete.cookies?.[nomCookie(config)];
  if (typeof valeur !== 'string' || !valeur) return null;
  try {
    const lu = schemaAllerRetour.safeParse(JSON.parse(dechiffrer(config.CLE_CHIFFREMENT, valeur)));
    if (!lu.success || lu.data.expire < Date.now()) return null;
    return lu.data;
  } catch {
    return null;
  }
}

export function effacerAllerRetour(
  reponse: Response,
  config: Pick<Configuration, 'NODE_ENV'>,
): void {
  reponse.clearCookie(nomCookie(config), options(config));
}
