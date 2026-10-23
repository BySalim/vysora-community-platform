import {
  AVERTISSEMENTS_AGENT,
  MODES_SELECTION,
  RESULTATS_REPRODUCTION,
  STATUTS_DEFI,
  STATUTS_PUBLICATION,
  TYPES_CREATION,
  TYPES_LIEN_EXTERNE,
  TYPES_MOMENT_CLE,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { colonnesSousType, contraintesSousType } from './contenus.js';
import { categorie, licence, modele, outil } from './referentiels.js';

/* Créations, parcours, reproductions, commentaires et défis (MCD, section 4.3).
   Un brouillon peut être incomplet : les champs obligatoires à la publication sont contrôlés
   par l'API au moment de publier (RG-10 à RG-16), et par la base pour la ligne creation. */

export const defi = pgTable(
  'defi',
  {
    id: identifiant(),
    /** ORGANISER (CI-29 : un administrateur). */
    organisateurId: reference()
      .notNull()
      .references(() => utilisateur.id),
    titre: varchar({ length: 150 }).notNull(),
    /** Extension : adresse lisible (/defis/[id]-[slug]). */
    slug: varchar({ length: 170 }).notNull(),
    enonce: text().notNull(),
    contraintes: text(),
    dateDebut: horodatage().notNull(),
    dateFin: horodatage().notNull(),
    statut: text({ enum: STATUTS_DEFI }).notNull().default('BROUILLON'),
  },
  (t) => [
    index('defi_statut_dates_idx').on(t.statut, t.dateDebut, t.dateFin),
    valeursPermises('defi_statut_check', t.statut, STATUTS_DEFI),
    // RG-73 : de 1 à 30 jours.
    check(
      'defi_duree_check',
      sql`${t.dateFin} - ${t.dateDebut} between interval '1 day' and interval '30 days'`,
    ),
  ],
);

export const creation = pgTable(
  'creation',
  {
    ...colonnesSousType('CREATION'),
    /** Non modifiable après la première publication (RG-18). */
    typeCreation: text({ enum: TYPES_CREATION }).notNull(),
    titre: varchar({ length: 120 }),
    /** Extension : partie lisible de l'adresse (/creations/[id]-[slug]). */
    slug: varchar({ length: 140 }),
    objectif: text(),
    limites: text(),
    statutPublication: text({ enum: STATUTS_PUBLICATION }).notNull().default('BROUILLON'),
    datePublication: horodatage(),
    /** Technique (F-16) : confirmation « aucune donnée personnelle de tiers ni aucun secret ». */
    dateConfirmationDonnees: horodatage(),
    avertissementAgent: text({ enum: AVERTISSEMENTS_AGENT }).notNull().default('AUCUN'),
    /** CLASSER */
    categorieId: reference().references(() => categorie.id),
    /** PLACER_SOUS */
    licenceId: reference()
      .notNull()
      .references(() => licence.id),
    /** DERIVER : création source d'une variante (RG-21). */
    sourceId: reference().references((): AnyPgColumn => creation.id, { onDelete: 'set null' }),
    /** PARTICIPER (RG-74) et rang figé à la clôture (RG-75). */
    defiId: reference().references(() => defi.id),
    rangFinalParticipation: smallint(),
  },
  (t) => [
    ...contraintesSousType('creation', t, 'CREATION'),
    index('creation_publication_idx').on(t.statutPublication, t.datePublication),
    index('creation_categorie_idx').on(t.categorieId),
    index('creation_source_idx').on(t.sourceId),
    index('creation_defi_idx').on(t.defiId),
    valeursPermises('creation_type_check', t.typeCreation, TYPES_CREATION),
    valeursPermises('creation_statut_publication_check', t.statutPublication, STATUTS_PUBLICATION),
    valeursPermises(
      'creation_avertissement_agent_check',
      t.avertissementAgent,
      AVERTISSEMENTS_AGENT,
    ),
    check(
      'creation_publiee_complete_check',
      sql`${t.statutPublication} = 'BROUILLON' or (${t.titre} is not null and ${t.objectif} is not null and ${t.categorieId} is not null and ${t.datePublication} is not null)`,
    ),
    check('creation_source_check', sql`${t.sourceId} is null or ${t.sourceId} <> ${t.id}`),
    check(
      'creation_rang_check',
      sql`${t.rangFinalParticipation} is null or ${t.defiId} is not null`,
    ),
  ],
);

/** COMPOSER : segment ordonné du parcours. Unicité (creation_id, ordre) différée, voir la migration manuelle. */
export const etape = pgTable(
  'etape',
  {
    id: identifiant(),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull(),
    titre: varchar({ length: 100 }),
    recit: text(),
  },
  (t) => [index('etape_creation_idx').on(t.creationId)],
);

/** EQUIPER, UTILISER_OUTIL, UTILISER_MODELE (F-13, RG-14). */
export const configurationIa = pgTable(
  'configuration_ia',
  {
    id: identifiant(),
    etapeId: reference()
      .notNull()
      .references(() => etape.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull().default(0),
    outilId: reference().references(() => outil.id),
    modeleId: reference().references(() => modele.id),
    modeleNonReference: varchar({ length: 100 }),
    parametres: text(),
    contexteCache: text(),
  },
  (t) => [
    index('configuration_ia_etape_idx').on(t.etapeId),
    index('configuration_ia_outil_idx').on(t.outilId),
    index('configuration_ia_modele_idx').on(t.modeleId),
    check(
      'configuration_ia_modele_check',
      sql`${t.modeleId} is null or ${t.modeleNonReference} is null`,
    ),
  ],
);

/** CONTENIR, REALISER_AVEC : prompt et réponse obtenue. Unicité (etape_id, ordre) différée. */
export const echange = pgTable(
  'echange',
  {
    id: identifiant(),
    etapeId: reference()
      .notNull()
      .references(() => etape.id, { onDelete: 'cascade' }),
    configurationId: reference().references(() => configurationIa.id, { onDelete: 'set null' }),
    ordre: smallint().notNull(),
    prompt: text(),
    reponse: text(),
    nbEssais: smallint().notNull().default(1),
    modeSelection: text({ enum: MODES_SELECTION }).notNull().default('PREMIER_ESSAI'),
  },
  (t) => [
    index('echange_etape_idx').on(t.etapeId),
    valeursPermises('echange_mode_selection_check', t.modeSelection, MODES_SELECTION),
    check('echange_essais_check', sql`${t.nbEssais} >= 1`),
    check(
      'echange_selection_check',
      sql`${t.nbEssais} > 1 or ${t.modeSelection} = 'PREMIER_ESSAI'`,
    ),
  ],
);

/** MARQUER_ETAPE, MARQUER_ECHANGE (RG-15) : un échange porte au plus un moment clé. */
export const momentCle = pgTable(
  'moment_cle',
  {
    id: identifiant(),
    etapeId: reference()
      .notNull()
      .references(() => etape.id, { onDelete: 'cascade' }),
    echangeId: reference().references(() => echange.id, { onDelete: 'set null' }),
    type: text({ enum: TYPES_MOMENT_CLE }).notNull(),
    explication: text(),
  },
  (t) => [
    index('moment_cle_etape_idx').on(t.etapeId),
    uniqueIndex('moment_cle_echange_unique')
      .on(t.echangeId)
      .where(sql`${t.echangeId} is not null`),
    valeursPermises('moment_cle_type_check', t.type, TYPES_MOMENT_CLE),
  ],
);

/** REFERENCER (F-15, RG-16) : lien HTTPS vers un résultat ou une preuve. */
export const lienExterne = pgTable(
  'lien_externe',
  {
    id: identifiant(),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    type: text({ enum: TYPES_LIEN_EXTERNE }).notNull(),
    url: varchar({ length: 2048 }).notNull(),
    libelle: varchar({ length: 100 }),
    ordre: smallint().notNull().default(0),
  },
  (t) => [
    index('lien_externe_creation_idx').on(t.creationId),
    valeursPermises('lien_externe_type_check', t.type, TYPES_LIEN_EXTERNE),
    check('lien_externe_https_check', sql`${t.url} like 'https://%'`),
  ],
);

/** COMMENTER, REPONDRE_COMMENTAIRE (un seul niveau), ANCRER_ETAPE, ANCRER_ECHANGE (RG-50, CI-11). */
export const commentaire = pgTable(
  'commentaire',
  {
    ...colonnesSousType('COMMENTAIRE'),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    parentId: reference().references((): AnyPgColumn => commentaire.id, { onDelete: 'cascade' }),
    etapeId: reference().references(() => etape.id, { onDelete: 'set null' }),
    echangeId: reference().references(() => echange.id, { onDelete: 'set null' }),
    corps: text().notNull(),
  },
  (t) => [
    ...contraintesSousType('commentaire', t, 'COMMENTAIRE'),
    index('commentaire_creation_idx').on(t.creationId),
    index('commentaire_parent_idx').on(t.parentId),
    check('commentaire_ancrage_check', sql`${t.etapeId} is null or ${t.echangeId} is null`),
    check('commentaire_parent_check', sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  ],
);

/** REPRODUIRE (F-32, RG-42) : essai déclaré par un autre membre que l'auteur. */
export const reproduction = pgTable(
  'reproduction',
  {
    ...colonnesSousType('REPRODUCTION'),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    outilId: reference()
      .notNull()
      .references(() => outil.id),
    modeleId: reference().references(() => modele.id),
    modeleNonReference: varchar({ length: 100 }),
    resultat: text({ enum: RESULTATS_REPRODUCTION }).notNull(),
    retour: text(),
    reponseObtenue: text(),
  },
  (t) => [
    ...contraintesSousType('reproduction', t, 'REPRODUCTION'),
    index('reproduction_creation_idx').on(t.creationId, t.resultat),
    valeursPermises('reproduction_resultat_check', t.resultat, RESULTATS_REPRODUCTION),
    check(
      'reproduction_modele_check',
      sql`${t.modeleId} is null or ${t.modeleNonReference} is null`,
    ),
    check(
      'reproduction_retour_check',
      sql`${t.resultat} = 'SUCCES' or char_length(coalesce(${t.retour}, '')) >= 20`,
    ),
  ],
);
