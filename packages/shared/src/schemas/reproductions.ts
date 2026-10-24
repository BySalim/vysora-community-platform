import { z } from 'zod';
import { RESULTATS_REPRODUCTION } from '../enums';
import { LONGUEURS } from '../regles';

/* Reproduction déclarée (F-32, RG-42) : outil obligatoire, modèle du référentiel ou en texte
   libre, résultat, retour obligatoire (20 caractères au moins) pour un résultat partiel ou un échec. */

export const schemaNouvelleReproduction = z
  .object({
    outilId: z.number({ error: 'Choisissez l’outil utilisé.' }).int().positive(),
    modeleId: z.number().int().positive().nullish(),
    modeleNonReference: z
      .string()
      .trim()
      .max(100, { error: 'Le nom du modèle compte 100 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
    resultat: z.enum(RESULTATS_REPRODUCTION, { error: 'Indiquez votre résultat.' }),
    retour: z
      .string()
      .trim()
      .max(LONGUEURS.reproductionRetour.max, {
        error: `Votre retour compte ${new Intl.NumberFormat('fr-FR').format(LONGUEURS.reproductionRetour.max)} caractères au plus.`,
      })
      .nullish()
      .transform((valeur) => valeur || null),
    reponseObtenue: z
      .string()
      .trim()
      .max(LONGUEURS.reponseIa.max, { error: 'Cette réponse est trop longue.' })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((saisie, ctx) => {
    if (
      saisie.resultat !== 'SUCCES' &&
      (saisie.retour ?? '').length < LONGUEURS.reproductionRetour.min
    )
      ctx.addIssue({
        code: 'custom',
        path: ['retour'],
        message: `Décrivez ce que vous avez obtenu : ${LONGUEURS.reproductionRetour.min} caractères au moins.`,
      });
    if (saisie.modeleId && saisie.modeleNonReference)
      ctx.addIssue({
        code: 'custom',
        path: ['modeleNonReference'],
        message: 'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      });
  });
export type NouvelleReproduction = z.output<typeof schemaNouvelleReproduction>;
