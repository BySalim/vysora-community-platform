import {
  ACTIONS_DECISION,
  ACTIONS_DECISION_CONTENU,
  ACTIONS_DECISION_MEMBRE,
  MOTIFS_SIGNALEMENT,
  STATUTS_SIGNALEMENT,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { contenu } from './contenus.js';
import { badge } from './referentiels.js';

/* Modération (MCD, section 4.5). Une décision est journalisée et n'est plus modifiable (RG-102) :
   un déclencheur l'interdit en base (migration manuelle). */

const liste = (valeurs: readonly string[]) => sql.raw(valeurs.map((v) => `'${v}'`).join(', '));

export const decisionModeration = pgTable(
  'decision_moderation',
  {
    id: identifiant(),
    /** PRENDRE */
    decideurId: reference()
      .notNull()
      .references(() => utilisateur.id),
    /** PORTER_SUR */
    contenuId: reference().references((): AnyPgColumn => contenu.id),
    /** SANCTIONNER */
    membreViseId: reference().references(() => utilisateur.id),
    action: text({ enum: ACTIONS_DECISION }).notNull(),
    motif: text().notNull(),
    date: horodatage().notNull().defaultNow(),
    dateFinSuspension: horodatage(),
    /** Extension : badge retiré par une décision RETIRER_BADGE. */
    badgeId: reference().references(() => badge.id),
  },
  (t) => [
    index('decision_moderation_contenu_idx').on(t.contenuId),
    index('decision_moderation_membre_idx').on(t.membreViseId, t.action),
    index('decision_moderation_decideur_idx').on(t.decideurId, t.date),
    index('decision_moderation_date_idx').on(t.date),
    valeursPermises('decision_moderation_action_check', t.action, ACTIONS_DECISION),
    check('decision_moderation_motif_check', sql`char_length(${t.motif}) > 0`),
    // CI-19 : une action sur contenu porte sur un contenu, une action sur membre vise un membre.
    check(
      'decision_moderation_cible_check',
      sql`(${t.action} not in (${liste(ACTIONS_DECISION_CONTENU)}) or ${t.contenuId} is not null) and (${t.action} not in (${liste(ACTIONS_DECISION_MEMBRE)}) or ${t.membreViseId} is not null)`,
    ),
    // F-91 : suspension de 1 à 90 jours.
    check(
      'decision_moderation_suspension_check',
      sql`(${t.action} = 'SUSPENDRE') = (${t.dateFinSuspension} is not null) and (${t.dateFinSuspension} is null or ${t.dateFinSuspension} - ${t.date} between interval '1 day' and interval '90 days')`,
    ),
    check(
      'decision_moderation_badge_check',
      sql`(${t.action} = 'RETIRER_BADGE') = (${t.badgeId} is not null)`,
    ),
  ],
);

export const signalement = pgTable(
  'signalement',
  {
    id: identifiant(),
    /** EMETTRE */
    signaleurId: reference()
      .notNull()
      .references(() => utilisateur.id),
    /** VISER */
    contenuId: reference()
      .notNull()
      .references(() => contenu.id),
    motif: text({ enum: MOTIFS_SIGNALEMENT }).notNull(),
    precision: text(),
    date: horodatage().notNull().defaultNow(),
    statut: text({ enum: STATUTS_SIGNALEMENT }).notNull().default('OUVERT'),
    /** RESOUDRE */
    decisionId: reference().references(() => decisionModeration.id),
  },
  (t) => [
    index('signalement_file_idx').on(t.statut, t.date),
    index('signalement_contenu_idx').on(t.contenuId, t.statut),
    // CI-21 : au plus un signalement ouvert par membre et par contenu.
    uniqueIndex('signalement_ouvert_unique')
      .on(t.signaleurId, t.contenuId)
      .where(sql`${t.statut} = 'OUVERT'`),
    valeursPermises('signalement_motif_check', t.motif, MOTIFS_SIGNALEMENT),
    valeursPermises('signalement_statut_check', t.statut, STATUTS_SIGNALEMENT),
    // CI-20 : ouvert si et seulement s'il n'est pas encore résolu par une décision.
    check(
      'signalement_resolution_check',
      sql`(${t.statut} = 'OUVERT') = (${t.decisionId} is null)`,
    ),
    check('signalement_precision_check', sql`${t.motif} <> 'AUTRE' or ${t.precision} is not null`),
  ],
);
