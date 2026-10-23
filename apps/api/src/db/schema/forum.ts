import { DIFFICULTES_CAS, STATUTS_VALIDATION_CAS, TYPES_SUJET } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { colonnesSousType, contraintesSousType } from './contenus.js';
import { creation } from './creations.js';

/* Forum et Bon réflexe (MCD, section 4.4). L'état d'un sujet (ouvert, résolu, fermé) se déduit
   de la fermeture et de la réponse acceptée (CV-03). */

export const sujet = pgTable(
  'sujet',
  {
    ...colonnesSousType('SUJET'),
    typeSujet: text({ enum: TYPES_SUJET }).notNull(),
    titre: varchar({ length: 150 }).notNull(),
    /** Extension : adresse lisible (/forum/[id]-[slug]). */
    slug: varchar({ length: 170 }).notNull(),
    /** Markdown ; pour une clinique, les quatre rubriques obligatoires (RG-62). */
    corps: text().notNull(),
    /** RG-61 : exemples obligatoires pour une astuce. */
    exempleAvant: text(),
    exempleApres: text(),
    /** EVOQUER (RG-66) */
    creationId: reference().references(() => creation.id, { onDelete: 'set null' }),
    /** ACCEPTER_REPONSE (RG-63) : au plus une réponse acceptée. */
    messageAccepteId: reference().references((): AnyPgColumn => message.id, {
      onDelete: 'set null',
    }),
    dateAcceptationReponse: horodatage(),
    /** FERMER (RG-65) : supprimée à la réouverture. */
    fermeurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    dateFermeture: horodatage(),
  },
  (t) => [
    ...contraintesSousType('sujet', t, 'SUJET'),
    index('sujet_type_idx').on(t.typeSujet),
    index('sujet_creation_idx').on(t.creationId),
    uniqueIndex('sujet_message_accepte_unique')
      .on(t.messageAccepteId)
      .where(sql`${t.messageAccepteId} is not null`),
    valeursPermises('sujet_type_check', t.typeSujet, TYPES_SUJET),
    check(
      'sujet_astuce_check',
      sql`${t.typeSujet} <> 'ASTUCE' or (${t.exempleAvant} is not null and ${t.exempleApres} is not null)`,
    ),
    check(
      'sujet_acceptation_type_check',
      sql`${t.messageAccepteId} is null or ${t.typeSujet} in ('QUESTION', 'CLINIQUE')`,
    ),
    check(
      'sujet_acceptation_date_check',
      sql`(${t.messageAccepteId} is null) = (${t.dateAcceptationReponse} is null)`,
    ),
    check('sujet_fermeture_check', sql`${t.fermeurId} is null or ${t.dateFermeture} is not null`),
  ],
);

/** REPONDRE : réponse publiée dans un sujet (RG-64). */
export const message = pgTable(
  'message',
  {
    ...colonnesSousType('MESSAGE'),
    sujetId: reference()
      .notNull()
      .references((): AnyPgColumn => sujet.id, { onDelete: 'cascade' }),
    corps: text().notNull(),
  },
  (t) => [
    ...contraintesSousType('message', t, 'MESSAGE'),
    index('message_sujet_idx').on(t.sujetId),
  ],
);

/** F-60 à F-62 : cas d'entraînement au jugement des réponses de l'IA (CV-04). */
export const casBonReflexe = pgTable(
  'cas_bon_reflexe',
  {
    ...colonnesSousType('CAS_BON_REFLEXE'),
    titre: varchar({ length: 150 }).notNull(),
    /** Extension : adresse lisible. */
    slug: varchar({ length: 170 }).notNull(),
    contexte: text().notNull(),
    demandeIa: text().notNull(),
    reponseIa: text().notNull(),
    question: varchar({ length: 300 }).notNull(),
    explication: text().notNull(),
    difficulte: text({ enum: DIFFICULTES_CAS }).notNull(),
    statutValidation: text({ enum: STATUTS_VALIDATION_CAS }).notNull().default('PROPOSE'),
    motifRefus: text(),
    /** EXAMINER (CI-18) : présent si et seulement si le cas est validé ou refusé. */
    examinateurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    dateExamen: horodatage(),
  },
  (t) => [
    ...contraintesSousType('cas_bon_reflexe', t, 'CAS_BON_REFLEXE'),
    index('cas_bon_reflexe_statut_idx').on(t.statutValidation),
    valeursPermises('cas_bon_reflexe_difficulte_check', t.difficulte, DIFFICULTES_CAS),
    valeursPermises('cas_bon_reflexe_statut_check', t.statutValidation, STATUTS_VALIDATION_CAS),
    check(
      'cas_bon_reflexe_examen_check',
      sql`(${t.statutValidation} = 'PROPOSE') = (${t.dateExamen} is null)`,
    ),
    check(
      'cas_bon_reflexe_refus_check',
      sql`${t.statutValidation} <> 'REFUSE' or ${t.motifRefus} is not null`,
    ),
  ],
);

/** PROPOSER : 2 à 5 options, exactement une correcte (CI-16, contrôlé par l'API). Unicité (cas_id, ordre) différée. */
export const optionReponse = pgTable(
  'option_reponse',
  {
    id: identifiant(),
    casId: reference()
      .notNull()
      .references(() => casBonReflexe.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull(),
    libelle: varchar({ length: 500 }).notNull(),
    estCorrecte: boolean().notNull().default(false),
    explication: text().notNull(),
  },
  (t) => [
    unique('option_reponse_id_cas_unique').on(t.id, t.casId),
    index('option_reponse_cas_idx').on(t.casId),
    uniqueIndex('option_reponse_correcte_unique')
      .on(t.casId)
      .where(sql`${t.estCorrecte}`),
  ],
);

/** CHOISIR : une réponse par membre et par cas, définitive (RG-72). */
export const choixOption = pgTable(
  'choix_option',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    casId: reference().notNull(),
    optionId: reference().notNull(),
    dateChoix: horodatage().notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.utilisateurId, t.casId] }),
    foreignKey({
      name: 'choix_option_option_fk',
      columns: [t.optionId, t.casId],
      foreignColumns: [optionReponse.id, optionReponse.casId],
    }).onDelete('cascade'),
    index('choix_option_option_idx').on(t.optionId),
  ],
);
