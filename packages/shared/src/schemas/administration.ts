import { z } from 'zod';
import { ACTIONS_DECISION, ROLES } from '../enums';

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
