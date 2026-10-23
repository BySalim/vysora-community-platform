import { createHash, createHmac, randomBytes } from 'node:crypto';

/** Empreinte SHA-256 en hexadécimal (jetons de session et liens envoyés par e-mail). */
export const sha256 = (valeur: string): string => createHash('sha256').update(valeur).digest('hex');

/** Empreinte salée d'une donnée à ne pas conserver en clair (adresse IP) ; le sel vient de SEL_EMPREINTES. */
export const empreinteSalee = (sel: string, valeur: string): string =>
  createHmac('sha256', sel).update(valeur).digest('hex');

/** Jeton aléatoire non devinable (32 octets), transmis au navigateur ou par e-mail. */
export const jetonAleatoire = (): string => randomBytes(32).toString('base64url');
