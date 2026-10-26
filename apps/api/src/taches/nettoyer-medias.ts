import { lireConfiguration } from '../config/env.js';
import { creerBaseDeDonnees } from '../db/client.js';
import { MediasService } from '../modules/medias/medias.service.js';
import { StockageDisque } from '../modules/medias/stockage-disque.js';

/* pnpm medias:nettoyer : supprime les images déposées et jamais enregistrées dans un contenu depuis
   24 heures, puis les fichiers qu'aucune ligne ne désigne plus. L'API le fait chaque jour à 3 h 30 UTC
   (tâche « medias.nettoyer », EMAIL-01) ; la commande sert à le lancer à la main. */

const config = lireConfiguration();
const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
try {
  const service = new MediasService(db, new StockageDisque(config.STOCKAGE_DOSSIER));
  const bilan = await service.nettoyer();
  const nombre = (n: number, singulier: string, pluriel: string) =>
    `${n} ${n > 1 ? pluriel : singulier}`;
  console.log(
    `Nettoyage des images : ${nombre(bilan.images, 'image abandonnée', 'images abandonnées')} et ${nombre(bilan.fichiers, 'fichier sans ligne', 'fichiers sans ligne')} supprimés.`,
  );
} finally {
  await pool.end();
}
