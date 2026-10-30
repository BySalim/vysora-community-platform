import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/* Codes à usage unique basés sur le temps (TOTP, RFC 6238 ; HOTP, RFC 4226) pour la double
   authentification (SEC-02, ENF-05) : HMAC-SHA1, pas de 30 secondes, 6 chiffres, comme les
   applications d'authentification courantes. Sans dépendance extérieure. */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PAS_SECONDES = 30;
const CHIFFRES = 6;

export function encoderBase32(octets: Buffer): string {
  let bits = 0;
  let valeur = 0;
  let sortie = '';
  for (const octet of octets) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      sortie += BASE32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += BASE32[(valeur << (5 - bits)) & 31];
  return sortie;
}

export function decoderBase32(texte: string): Buffer {
  const propre = texte.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let valeur = 0;
  const octets: number[] = [];
  for (const caractere of propre) {
    const index = BASE32.indexOf(caractere);
    if (index < 0) throw new Error('Clé base32 invalide');
    valeur = (valeur << 5) | index;
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(octets);
}

/** Nouvelle clé secrète : 20 octets aléatoires (160 bits), en base32. */
export const nouvelleCle = (): string => encoderBase32(randomBytes(20));

/** HOTP (RFC 4226) : code du compteur donné. */
export function hotp(cle: Buffer, compteur: number, chiffres = CHIFFRES): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(compteur));
  const empreinte = createHmac('sha1', cle).update(message).digest();
  const decalage = (empreinte[empreinte.length - 1] ?? 0) & 0x0f;
  const binaire = empreinte.readUInt32BE(decalage) & 0x7fffffff;
  return String(binaire % 10 ** chiffres).padStart(chiffres, '0');
}

export const pasDuMoment = (instant: Date): number =>
  Math.floor(instant.getTime() / 1000 / PAS_SECONDES);

/** Le code correspond-il au pas courant ou à l'un de ses voisins (décalage d'horloge) ?
    Renvoie le pas reconnu, pour refuser un code déjà utilisé. */
export function verifierTotp(
  cleBase32: string,
  code: string,
  instant = new Date(),
  fenetre = 1,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const cle = decoderBase32(cleBase32);
  const courant = pasDuMoment(instant);
  for (let ecart = -fenetre; ecart <= fenetre; ecart += 1) {
    const attendu = Buffer.from(hotp(cle, courant + ecart));
    if (timingSafeEqual(attendu, Buffer.from(code))) return courant + ecart;
  }
  return null;
}

/** Adresse otpauth:// lue par les applications (QR code ou lien sur mobile). */
export const adresseOtpauth = (cleBase32: string, compte: string): string =>
  `otpauth://totp/${encodeURIComponent(`Vysora:${compte}`)}?secret=${cleBase32}&issuer=Vysora&algorithm=SHA1&digits=${CHIFFRES}&period=${PAS_SECONDES}`;
