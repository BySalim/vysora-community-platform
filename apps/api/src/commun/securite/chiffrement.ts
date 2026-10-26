import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/* Chiffrement authentifié (AES-256-GCM) des données sensibles stockées en base : e-mails en attente
   dans la file (EMAIL-01, liens à usage unique compris), plus tard le secret de double
   authentification (SEC-02). La clé est CLE_CHIFFREMENT (32 octets en base64url, config/env.ts). */

const ALGORITHME = 'aes-256-gcm';
const OCTETS_IV = 12;
const OCTETS_ETIQUETTE = 16;

const cleBrute = (cle: string): Buffer => Buffer.from(cle, 'base64url');

/** Texte chiffré, en base64url : vecteur d'initialisation, étiquette d'authenticité, puis données. */
export function chiffrer(cle: string, texte: string): string {
  const iv = randomBytes(OCTETS_IV);
  const chiffreur = createCipheriv(ALGORITHME, cleBrute(cle), iv);
  const donnees = Buffer.concat([chiffreur.update(texte, 'utf8'), chiffreur.final()]);
  return Buffer.concat([iv, chiffreur.getAuthTag(), donnees]).toString('base64url');
}

/** Lève une erreur si la valeur a été modifiée ou chiffrée avec une autre clé. */
export function dechiffrer(cle: string, valeur: string): string {
  const octets = Buffer.from(valeur, 'base64url');
  const iv = octets.subarray(0, OCTETS_IV);
  const etiquette = octets.subarray(OCTETS_IV, OCTETS_IV + OCTETS_ETIQUETTE);
  const dechiffreur = createDecipheriv(ALGORITHME, cleBrute(cle), iv);
  dechiffreur.setAuthTag(etiquette);
  return Buffer.concat([
    dechiffreur.update(octets.subarray(OCTETS_IV + OCTETS_ETIQUETTE)),
    dechiffreur.final(),
  ]).toString('utf8');
}
