import { z } from 'zod';
import { LONGUEURS } from '../regles';

/* Description d'une image téléversée (F-15, MEDIA-01). L'éditeur envoie l'image dès qu'elle est
   déposée, puis le membre la décrit : le texte alternatif peut donc rester vide dans un brouillon ;
   la publication l'exige (contrôles de CREA-01, ENF-01). La légende est facultative. */

const champTexteAlternatif = z
  .string({ error: 'Décrivez l’image.' })
  .trim()
  .max(LONGUEURS.texteAlternatif.max, {
    error: `La description compte ${LONGUEURS.texteAlternatif.max} caractères au plus.`,
  });

const champLegende = z
  .string({ error: 'Indiquez une légende.' })
  .trim()
  .max(LONGUEURS.legende.max, {
    error: `La légende compte ${LONGUEURS.legende.max} caractères au plus.`,
  })
  .nullable()
  .transform((valeur) => valeur || null);

/** Champs envoyés avec le fichier (POST /api/v1/medias) ou modifiés ensuite (PATCH /api/v1/medias/:id). */
export const schemaDescriptionImage = z.object({
  texteAlternatif: champTexteAlternatif.optional(),
  legende: champLegende.optional(),
});
export type DescriptionImage = z.output<typeof schemaDescriptionImage>;
