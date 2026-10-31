import { z } from 'zod';
import {
  ACTIONS_DECISION_ADMINISTRATEUR,
  ACTIONS_DECISION_MODERATEUR,
  MOTIFS_SIGNALEMENT,
} from '../enums';
import { DELAIS, LIMITES, LONGUEURS } from '../regles';

/* Modération (F-90, F-91). Signaler : un motif de RG-100, une précision facultative, exigée pour
   « Autre ». Décider : une action et un motif communiqué à l'auteur (RG-102), une durée de 1 à
   90 jours pour une suspension. Les administrateurs décident en plus sur un membre : bannir, ajuster
   sa réputation, lui retirer un badge. */

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

/** RG-102 : motif communiqué au membre et conservé avec la décision. */
const motifDecision = (destinataire: string) =>
  z
    .string({ error: `Rédigez le motif communiqué à ${destinataire}.` })
    .trim()
    .min(1, { error: `Rédigez le motif communiqué à ${destinataire}.` })
    .max(LONGUEURS.motifDecision.max, {
      error: `Le motif compte ${nombre(LONGUEURS.motifDecision.max)} caractères au plus.`,
    });

export const schemaDecisionModeration = z
  .object({
    action: z.enum(ACTIONS_DECISION_MODERATEUR, { error: 'Choisissez la décision.' }),
    motif: motifDecision('l’auteur'),
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

const ajustement = LIMITES.ajustementReputation;
const messagePoints = `Indiquez un nombre de points de −${nombre(ajustement)} à ${nombre(ajustement)}, autre que 0.`;

/** RG-102 : décision réservée aux administrateurs, qui vise un membre (CI-19). Un ajustement de la
    réputation donne ses points, ajoutés ou retirés (fraude avérée, CI-24) ; un retrait de badge
    désigne le badge par son code. */
export const schemaDecisionAdministrateur = z
  .object({
    action: z.enum(ACTIONS_DECISION_ADMINISTRATEUR, { error: 'Choisissez la décision.' }),
    motif: motifDecision('ce membre'),
    points: z
      .number({ error: messagePoints })
      .int({ error: messagePoints })
      .min(-ajustement, { error: messagePoints })
      .max(ajustement, { error: messagePoints })
      .refine((points) => points !== 0, { error: messagePoints })
      .nullish()
      .transform((valeur) => valeur ?? null),
    badge: z
      .string({ error: 'Choisissez le badge à retirer.' })
      .trim()
      .max(40, { error: 'Choisissez le badge à retirer.' })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((saisie, ctx) => {
    if (saisie.action === 'AJUSTER_REPUTATION' && saisie.points === null)
      ctx.addIssue({ code: 'custom', path: ['points'], message: messagePoints });
    if (saisie.action !== 'AJUSTER_REPUTATION' && saisie.points !== null)
      ctx.addIssue({
        code: 'custom',
        path: ['points'],
        message: 'Des points ne s’indiquent que pour un ajustement de la réputation.',
      });
    if (saisie.action === 'RETIRER_BADGE' && saisie.badge === null)
      ctx.addIssue({ code: 'custom', path: ['badge'], message: 'Choisissez le badge à retirer.' });
    if (saisie.action !== 'RETIRER_BADGE' && saisie.badge !== null)
      ctx.addIssue({
        code: 'custom',
        path: ['badge'],
        message: 'Un badge ne s’indique que pour un retrait de badge.',
      });
  });
export type DecisionAdministrateurSaisie = z.input<typeof schemaDecisionAdministrateur>;
export type DecisionAdministrateur = z.output<typeof schemaDecisionAdministrateur>;
