import { z } from 'zod';
import { ACTIONS_DECISION_MODERATEUR, MOTIFS_SIGNALEMENT } from '../enums';
import { DELAIS, LONGUEURS } from '../regles';

/* Modération (F-90, F-91). Signaler : un motif de RG-100, une précision facultative, exigée pour
   « Autre ». Décider : une action et un motif communiqué à l'auteur (RG-102), une durée de 1 à
   90 jours pour une suspension. */

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export const schemaSignalement = z
  .object({
    motif: z.enum(MOTIFS_SIGNALEMENT, { error: 'Choisissez le motif du signalement.' }),
    precision: z
      .string()
      .trim()
      .max(LONGUEURS.precisionSignalement.max, {
        error: `Votre précision compte ${nombre(LONGUEURS.precisionSignalement.max)} caractères au plus.`,
      })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((saisie, ctx) => {
    // RG-100 : la précision est obligatoire pour « Autre ».
    if (saisie.motif === 'AUTRE' && !saisie.precision)
      ctx.addIssue({
        code: 'custom',
        path: ['precision'],
        message: 'Précisez le motif du signalement.',
      });
  });
export type SignalementSaisi = z.input<typeof schemaSignalement>;
export type Signalement = z.output<typeof schemaSignalement>;

const { min, max } = DELAIS.suspensionJours;

export const schemaDecisionModeration = z
  .object({
    action: z.enum(ACTIONS_DECISION_MODERATEUR, { error: 'Choisissez la décision.' }),
    motif: z
      .string({ error: 'Rédigez le motif communiqué à l’auteur.' })
      .trim()
      .min(1, { error: 'Rédigez le motif communiqué à l’auteur.' })
      .max(LONGUEURS.motifDecision.max, {
        error: `Le motif compte ${nombre(LONGUEURS.motifDecision.max)} caractères au plus.`,
      }),
    /** F-91 : durée d'une suspension, en jours. */
    dureeJours: z
      .number({ error: `Indiquez une durée de ${min} à ${max} jours.` })
      .int({ error: `Indiquez une durée de ${min} à ${max} jours.` })
      .min(min, { error: `Indiquez une durée de ${min} à ${max} jours.` })
      .max(max, { error: `Indiquez une durée de ${min} à ${max} jours.` })
      .nullish()
      .transform((valeur) => valeur ?? null),
  })
  .superRefine((saisie, ctx) => {
    if (saisie.action === 'SUSPENDRE' && saisie.dureeJours === null)
      ctx.addIssue({
        code: 'custom',
        path: ['dureeJours'],
        message: `Indiquez la durée de la suspension : de ${min} à ${max} jours.`,
      });
    if (saisie.action !== 'SUSPENDRE' && saisie.dureeJours !== null)
      ctx.addIssue({
        code: 'custom',
        path: ['dureeJours'],
        message: 'Une durée ne s’indique que pour une suspension.',
      });
  });
export type DecisionModerationSaisie = z.input<typeof schemaDecisionModeration>;
export type DecisionModeration = z.output<typeof schemaDecisionModeration>;
