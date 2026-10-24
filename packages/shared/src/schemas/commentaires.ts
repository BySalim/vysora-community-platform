import { z } from 'zod';
import { LONGUEURS } from '../regles';

/* Commentaires d’une création (F-40, F-42, RG-50) : 1 à 5 000 caractères, affichés comme du texte.
   Une réponse vise un commentaire de la même création ; elle est rattachée au commentaire
   d'origine (un seul niveau de réponses). */

const champCorps = z
  .string({ error: 'Écrivez votre commentaire.' })
  .trim()
  .min(LONGUEURS.commentaire.min, { error: 'Écrivez votre commentaire.' })
  .max(LONGUEURS.commentaire.max, {
    error: `Votre commentaire compte ${new Intl.NumberFormat('fr-FR').format(LONGUEURS.commentaire.max)} caractères au plus.`,
  });

export const schemaNouveauCommentaire = z.object({
  corps: champCorps,
  /** Commentaire auquel il répond. */
  parentId: z.number().int().positive().nullish(),
});
export type NouveauCommentaire = z.output<typeof schemaNouveauCommentaire>;

export const schemaModificationCommentaire = z.object({ corps: champCorps });
export type ModificationCommentaire = z.output<typeof schemaModificationCommentaire>;
