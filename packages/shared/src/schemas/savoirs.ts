import { z } from 'zod';

/* Compléments des savoirs d'Apprendre (APP-03), choisis par l'équipe : moment clé d'une création
   publiée (ou la création avec une note), sujet du forum lié. */

const numero = (message: string) =>
  z.number({ error: message }).int({ error: message }).positive({ error: message });

/** POST /api/v1/admin/savoirs/:savoir/illustrations */
export const schemaIllustrationSavoir = z
  .object({
    creationId: numero('Indiquez l’adresse ou le numéro de la création.'),
    momentId: numero('Choisissez un moment clé de la création.').nullish().default(null),
    note: z
      .string()
      .trim()
      .max(300, { error: 'La note compte 300 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((v, ctx) => {
    if (v.momentId === null && v.note === null)
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Choisissez un moment clé de la création, ou écrivez une note.',
      });
  });
export type SaisieIllustrationSavoir = z.output<typeof schemaIllustrationSavoir>;

/** PUT /api/v1/admin/savoirs/:savoir/sujet */
export const schemaSujetSavoir = z.object({
  sujetId: numero('Indiquez l’adresse ou le numéro du sujet.'),
});
export type SaisieSujetSavoir = z.output<typeof schemaSujetSavoir>;
