import { randomBytes } from 'node:crypto';
import type { Readable } from 'node:stream';

/* Fichiers téléversés, derrière une interface : disque local au départ, stockage objet
   compatible S3 ensuite (R-03), sans changer les services qui s'en servent. */

/** Clé d'un fichier : identifiant aléatoire de 128 bits, largeur en pixels, extension.
    Jamais tirée d'une saisie : ni le nom du fichier envoyé ni son type annoncé n'y entrent. */
export const MOTIF_CLE = /^[A-Za-z0-9_-]{22}-[1-9]\d{0,4}\.webp$/;

/** Identifiant commun aux déclinaisons d'une même image. */
export const nouvelIdentifiantFichier = (): string => randomBytes(16).toString('base64url');

export const cleFichier = (identifiant: string, largeur: number): string =>
  `${identifiant}-${largeur}.webp`;

export interface FichierStocke {
  cle: string;
  /** Date d'écriture : le nettoyage épargne les fichiers récents (téléversement en cours). */
  date: Date;
}

export interface FichierOuvert {
  flux: Readable;
  taille: number;
}

export abstract class Stockage {
  /** Écrit un nouveau fichier ; une clé déjà prise est une erreur (jamais d'écrasement). */
  abstract ecrire(cle: string, contenu: Buffer): Promise<void>;

  /** Contenu du fichier, ou null s'il n'existe pas (ou si la clé n'a pas la forme attendue). */
  abstract ouvrir(cle: string): Promise<FichierOuvert | null>;

  /** Supprime ces fichiers ; une clé absente est ignorée. */
  abstract supprimer(cles: readonly string[]): Promise<void>;

  /** Tous les fichiers présents, pour le nettoyage. */
  abstract lister(): AsyncIterable<FichierStocke>;

  /** Adresse publique du fichier, telle que les pages l'affichent. */
  abstract adresse(cle: string): string;
}

/** Écrit les déclinaisons d'une image sous un même identifiant (largeur → clé) ; rien ne reste si une écriture échoue. */
export async function ecrireDeclinaisons(
  stockage: Stockage,
  declinaisons: readonly { largeur: number; contenu: Buffer }[],
): Promise<Record<string, string>> {
  const identifiant = nouvelIdentifiantFichier();
  const cles: Record<string, string> = {};
  try {
    for (const declinaison of declinaisons) {
      const cle = cleFichier(identifiant, declinaison.largeur);
      await stockage.ecrire(cle, declinaison.contenu);
      cles[declinaison.largeur] = cle;
    }
  } catch (erreur) {
    await stockage.supprimer(Object.values(cles));
    throw erreur;
  }
  return cles;
}
