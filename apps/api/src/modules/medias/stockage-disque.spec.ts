import { mkdtemp, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { cleFichier, nouvelIdentifiantFichier } from './stockage.js';
import { StockageDisque } from './stockage-disque.js';

describe('StockageDisque', () => {
  let dossier: string;
  let stockage: StockageDisque;

  beforeEach(async () => {
    dossier = await mkdtemp(join(tmpdir(), 'vysora-stockage-'));
    stockage = new StockageDisque(dossier);
  });
  afterEach(() => rm(dossier, { recursive: true, force: true }));

  it('écrit, relit, liste et supprime un fichier par sa clé', async () => {
    const cle = cleFichier(nouvelIdentifiantFichier(), 720);
    await stockage.ecrire(cle, Buffer.from('contenu'));

    const ouvert = await stockage.ouvrir(cle);
    expect(ouvert?.taille).toBe(7);
    expect(ouvert && (await text(ouvert.flux))).toBe('contenu');

    const listes = [];
    for await (const fichier of stockage.lister()) listes.push(fichier.cle);
    expect(listes).toEqual([cle]);

    await stockage.supprimer([cle, cleFichier(nouvelIdentifiantFichier(), 1280)]);
    expect(await stockage.ouvrir(cle)).toBeNull();
  });

  it('n’écrase jamais un fichier existant', async () => {
    const cle = cleFichier(nouvelIdentifiantFichier(), 720);
    await stockage.ecrire(cle, Buffer.from('premier'));
    await expect(stockage.ecrire(cle, Buffer.from('second'))).rejects.toThrow();
  });

  it('ne sert que des clés de la forme attendue : aucun chemin ne sort du dossier', async () => {
    for (const cle of ['../.env', '..%2F.env', 'a/../../b-720.webp', 'x-720.webp', 'cle.webp'])
      expect(await stockage.ouvrir(cle)).toBeNull();
    await expect(stockage.ecrire('../evasion-720.webp', Buffer.from('x'))).rejects.toThrow();
  });

  it('date chaque fichier, pour que le nettoyage épargne les envois récents', async () => {
    const cle = cleFichier(nouvelIdentifiantFichier(), 300);
    await stockage.ecrire(cle, Buffer.from('x'));
    const hier = new Date(Date.now() - 86_400_000);
    await utimes(join(dossier, cle.slice(0, 2), cle), hier, hier);
    for await (const fichier of stockage.lister())
      expect(Math.abs(fichier.date.getTime() - hier.getTime())).toBeLessThan(1000);
    expect(stockage.adresse(cle)).toBe(`/api/v1/fichiers/${cle}`);
  });
});
