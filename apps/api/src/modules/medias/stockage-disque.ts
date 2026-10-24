import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { MOTIF_CLE, Stockage, type FichierOuvert, type FichierStocke } from './stockage.js';

/** Adresse des fichiers servis par l'API (FichiersController), relayée par le site sur la même origine. */
export const PREFIXE_FICHIERS = '/api/v1/fichiers';

/* Stockage sur le disque du serveur (STOCKAGE_DOSSIER). Un sous-dossier par deux premiers
   caractères de la clé évite les dossiers de dizaines de milliers d'entrées. */
export class StockageDisque extends Stockage {
  private readonly racine: string;

  constructor(dossier: string) {
    super();
    this.racine = resolve(dossier);
  }

  /** Seule une clé de la forme attendue désigne un fichier : aucun chemin ne sort de la racine. */
  private chemin(cle: string): string {
    if (!MOTIF_CLE.test(cle)) throw new Error('Clé de fichier invalide.');
    return join(this.racine, cle.slice(0, 2), cle);
  }

  override async ecrire(cle: string, contenu: Buffer): Promise<void> {
    const chemin = this.chemin(cle);
    await mkdir(dirname(chemin), { recursive: true });
    await writeFile(chemin, contenu, { flag: 'wx' });
  }

  override async ouvrir(cle: string): Promise<FichierOuvert | null> {
    if (!MOTIF_CLE.test(cle)) return null;
    const chemin = this.chemin(cle);
    try {
      const infos = await stat(chemin);
      if (!infos.isFile()) return null;
      return { flux: createReadStream(chemin), taille: infos.size };
    } catch (erreur) {
      if ((erreur as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw erreur;
    }
  }

  override async supprimer(cles: readonly string[]): Promise<void> {
    await Promise.all(cles.map((cle) => rm(this.chemin(cle), { force: true })));
  }

  override async *lister(): AsyncIterable<FichierStocke> {
    let dossiers: string[];
    try {
      dossiers = await readdir(this.racine);
    } catch (erreur) {
      if ((erreur as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw erreur;
    }
    for (const dossier of dossiers) {
      const chemin = join(this.racine, dossier);
      if (!(await stat(chemin)).isDirectory()) continue;
      for (const cle of await readdir(chemin)) {
        if (!MOTIF_CLE.test(cle)) continue;
        yield { cle, date: (await stat(join(chemin, cle))).mtime };
      }
    }
  }

  override adresse(cle: string): string {
    return `${PREFIXE_FICHIERS}/${cle}`;
  }
}
