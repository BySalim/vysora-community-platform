import { z } from 'zod';
import { ACTIONS_DECISION, FAMILLES_OUTIL, ROLES, TYPES_OUTIL } from '../enums';
import { DELAIS } from '../regles';

/** PUT /api/v1/admin/membres/:id/role (F-96, RG-111). */
export const schemaChangementRole = z.object({
  role: z.enum(ROLES, { error: 'Choisissez un rôle.' }),
});
export type ChangementRole = z.output<typeof schemaChangementRole>;

/** POST /api/v1/admin/invitations (INV-01) : nombre de codes et durée de validité. */
export const schemaCreationInvitations = z.object({
  nombre: z.coerce
    .number({ error: 'Indiquez un nombre de codes.' })
    .int({ error: 'Indiquez un nombre entier.' })
    .min(1, { error: 'Créez au moins un code.' })
    .max(50, { error: 'Créez 50 codes au plus à la fois.' }),
  joursValidite: z.coerce
    .number({ error: 'Indiquez une durée en jours.' })
    .int({ error: 'Indiquez un nombre entier de jours.' })
    .min(1, { error: 'Un code reste valable au moins un jour.' })
    .max(365, { error: 'Un code reste valable un an au plus.' })
    .nullish()
    .transform((jours) => jours ?? null),
});
export type CreationInvitations = z.output<typeof schemaCreationInvitations>;

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez une date au format AAAA-MM-JJ.' })
  .optional()
  .or(z.literal('').transform(() => undefined));
const pseudo = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((valeur) => valeur || undefined);

/** Filtres du journal des décisions (EC-21, F-92) : modérateur, membre, action et période. */
export const schemaFiltresDecisions = z.object({
  moderateur: pseudo,
  membre: pseudo,
  action: z
    .enum(ACTIONS_DECISION)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  du: date,
  au: date,
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});
export type FiltresDecisions = z.output<typeof schemaFiltresDecisions>;

const MS_JOUR = 86_400_000;
const dateHeure = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/, {
      error: message,
    })
    .transform((valeur) => new Date(/Z|[+-]\d{2}:\d{2}$/.test(valeur) ? valeur : `${valeur}Z`));

/** POST /api/v1/admin/defis (F-63, RG-73) : un défi en brouillon ; dates en UTC. */
export const schemaDefi = z
  .object({
    titre: z
      .string({ error: 'Donnez un titre au défi.' })
      .trim()
      .min(5, { error: 'Le titre compte au moins 5 caractères.' })
      .max(150, { error: 'Le titre compte 150 caractères au plus.' }),
    enonce: z
      .string({ error: 'Rédigez l’énoncé du défi.' })
      .trim()
      .min(20, { error: 'L’énoncé compte au moins 20 caractères.' })
      .max(2000, { error: 'L’énoncé compte 2 000 caractères au plus.' }),
    /** Une contrainte par ligne. */
    contraintes: z
      .string()
      .trim()
      .max(2000, { error: 'Les contraintes comptent 2 000 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
    dateDebut: dateHeure('Indiquez la date de début.'),
    dateFin: dateHeure('Indiquez la date de fin.'),
  })
  .superRefine((d, ctx) => {
    const jours = (d.dateFin.getTime() - d.dateDebut.getTime()) / MS_JOUR;
    if (jours < DELAIS.defiJours.min || jours > DELAIS.defiJours.max)
      ctx.addIssue({
        code: 'custom',
        path: ['dateFin'],
        message: `Un défi dure de ${DELAIS.defiJours.min} à ${DELAIS.defiJours.max} jours.`,
      });
  });
export type SaisieDefi = z.output<typeof schemaDefi>;

/** POST /api/v1/admin/outils (F-95) : un outil, et son éditeur s'il est nouveau. */
export const schemaOutil = z.object({
  nom: z
    .string({ error: 'Indiquez le nom de l’outil.' })
    .trim()
    .min(2, { error: 'Le nom compte au moins 2 caractères.' })
    .max(100, { error: 'Le nom compte 100 caractères au plus.' }),
  editeur: z
    .string({ error: 'Indiquez l’éditeur de l’outil.' })
    .trim()
    .min(2, { error: 'L’éditeur compte au moins 2 caractères.' })
    .max(100, { error: 'L’éditeur compte 100 caractères au plus.' }),
  type: z.enum(TYPES_OUTIL, { error: 'Choisissez le type de l’outil.' }),
  famille: z.enum(FAMILLES_OUTIL, { error: 'Choisissez la famille de l’outil.' }),
});
export type SaisieOutil = z.output<typeof schemaOutil>;

/** POST /api/v1/admin/outils/:id/modeles (F-95) : un modèle proposé avec cet outil. */
export const schemaModele = z.object({
  nom: z
    .string({ error: 'Indiquez le nom complet du modèle.' })
    .trim()
    .min(2, { error: 'Le nom compte au moins 2 caractères.' })
    .max(100, { error: 'Le nom compte 100 caractères au plus.' }),
  nomCourt: z
    .string({ error: 'Indiquez le nom court du modèle.' })
    .trim()
    .min(1, { error: 'Indiquez le nom court du modèle.' })
    .max(60, { error: 'Le nom court compte 60 caractères au plus.' }),
  dateSortie: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez une date au format AAAA-MM-JJ.' })
    .nullish()
    .or(z.literal('').transform(() => null))
    .transform((valeur) => valeur || null),
});
export type SaisieModele = z.output<typeof schemaModele>;

/** PATCH d'un outil ou d'un modèle (RG-110) : archivé ou retiré, il reste affiché sur les contenus. */
export const schemaStatutOutil = z.object({
  statut: z.enum(['ACTIF', 'ARCHIVE'], { error: 'Choisissez un statut.' }),
});
export const schemaStatutModele = z.object({
  statut: z.enum(['DISPONIBLE', 'RETIRE'], { error: 'Choisissez un statut.' }),
});
