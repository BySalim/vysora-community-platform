import { MOTIFS_CONTACT, STATUTS_MESSAGE_CONTACT, TYPES_JETON } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  customType,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { contenu } from './contenus.js';

/* Données techniques, hors MCD (doc 05, section 1) : sessions, jetons, double authentification,
   tentatives de connexion, journal d'audit (ENF-09), vues, index de recherche, messages de contact.
   Aucune adresse IP n'est conservée en clair : seulement une empreinte salée (SEL_EMPREINTES). */

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

/** Session ouverte sur un appareil. L'identifiant est l'empreinte SHA-256 du jeton du cookie. */
export const session = pgTable(
  'session',
  {
    id: varchar({ length: 64 }).primaryKey(),
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    dateCreation: horodatage().notNull().defaultNow(),
    dateExpiration: horodatage().notNull(),
    dateDerniereActivite: horodatage().notNull().defaultNow(),
    /** Appareil et navigateur, résumés (« Chrome sur Windows »). */
    appareil: varchar({ length: 120 }),
    /** Lieu approximatif (ville, pays), si connu. */
    lieu: varchar({ length: 120 }),
    empreinteIp: varchar({ length: 64 }),
    /** ENF-05 : double authentification validée sur cette session (modération, administration). */
    deuxFacteursValide: boolean().notNull().default(false),
  },
  (t) => [
    index('session_utilisateur_idx').on(t.utilisateurId),
    index('session_expiration_idx').on(t.dateExpiration),
  ],
);

/** Jeton à usage unique envoyé par e-mail ; seule son empreinte est stockée. */
export const jeton = pgTable(
  'jeton',
  {
    id: identifiant(),
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    type: text({ enum: TYPES_JETON }).notNull(),
    empreinte: varchar({ length: 64 }).notNull().unique(),
    /** Nouvelle adresse à confirmer (changement d'e-mail). */
    emailCible: varchar({ length: 254 }),
    dateCreation: horodatage().notNull().defaultNow(),
    dateExpiration: horodatage().notNull(),
    dateUtilisation: horodatage(),
  },
  (t) => [
    index('jeton_utilisateur_type_idx').on(t.utilisateurId, t.type),
    valeursPermises('jeton_type_check', t.type, TYPES_JETON),
  ],
);

/** ENF-05 : secret TOTP chiffré (CLE_CHIFFREMENT) et codes de secours hachés. */
export const doubleAuthentification = pgTable('double_authentification', {
  utilisateurId: reference()
    .primaryKey()
    .references(() => utilisateur.id, { onDelete: 'cascade' }),
  secretChiffre: text().notNull(),
  /** Nulle tant que le premier code n'a pas été confirmé. */
  dateActivation: horodatage(),
  codesSecours: jsonb()
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  /** Dernier pas de 30 secondes accepté : un code déjà utilisé est refusé (rejeu). */
  dernierPas: bigint({ mode: 'number' }),
});

/** F-03 : tentatives de connexion, pour temporiser après 5 échecs consécutifs. */
export const tentativeConnexion = pgTable(
  'tentative_connexion',
  {
    id: identifiant(),
    utilisateurId: reference().references(() => utilisateur.id, { onDelete: 'cascade' }),
    /** Empreinte salée de l'adresse saisie : la temporisation s'applique de la même façon,
        que l'adresse corresponde à un compte ou non (pas de révélation des comptes existants). */
    empreinteIdentifiant: varchar({ length: 64 }),
    empreinteIp: varchar({ length: 64 }),
    reussie: boolean().notNull(),
    date: horodatage().notNull().defaultNow(),
  },
  (t) => [
    index('tentative_connexion_utilisateur_idx').on(t.utilisateurId, t.date),
    index('tentative_connexion_identifiant_idx').on(t.empreinteIdentifiant, t.date),
    index('tentative_connexion_ip_idx').on(t.empreinteIp, t.date),
  ],
);

/** ENF-09 : changements de rôle et actions d'administration (les décisions de modération ont leur table). */
export const journalAudit = pgTable(
  'journal_audit',
  {
    id: identifiant(),
    acteurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    action: varchar({ length: 60 }).notNull(),
    cibleType: varchar({ length: 40 }),
    cibleId: bigint({ mode: 'number' }),
    details: jsonb().$type<Record<string, unknown>>(),
    date: horodatage().notNull().defaultNow(),
    empreinteIp: varchar({ length: 64 }),
  },
  (t) => [
    index('journal_audit_date_idx').on(t.date),
    index('journal_audit_acteur_idx').on(t.acteurId, t.date),
    index('journal_audit_cible_idx').on(t.cibleType, t.cibleId),
  ],
);

/** F-23 : une vue par visiteur et par jour ; les lignes de plus de 2 jours sont purgées. */
export const vueContenu = pgTable(
  'vue_contenu',
  {
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    empreinteVisiteur: varchar({ length: 64 }).notNull(),
    jour: date({ mode: 'string' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.contenuId, t.empreinteVisiteur, t.jour] })],
);

/** RG-31 : index plein texte des contenus publiés et visibles (configuration « vysora_fr », sans accents). */
export const rechercheDocument = pgTable(
  'recherche_document',
  {
    contenuId: reference()
      .primaryKey()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    vecteur: tsvector().notNull(),
    dateMiseAJour: horodatage().notNull().defaultNow(),
  },
  (t) => [index('recherche_document_vecteur_idx').using('gin', t.vecteur)],
);

/** Extension (prototype, contact.html) : messages envoyés à l'équipe, y compris sans compte. */
export const messageContact = pgTable(
  'message_contact',
  {
    id: identifiant(),
    /** Référence communiquée à l'expéditeur (VYS-AAAA-NNNNN). */
    reference: varchar({ length: 20 }).notNull().unique(),
    motif: text({ enum: MOTIFS_CONTACT }).notNull(),
    nom: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    /** Adresse du contenu signalé ou référence de la décision contestée. */
    contenu: varchar({ length: 2048 }),
    message: text().notNull(),
    bonneFoi: boolean().notNull().default(false),
    utilisateurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    empreinteIp: varchar({ length: 64 }),
    statut: text({ enum: STATUTS_MESSAGE_CONTACT }).notNull().default('NOUVEAU'),
    dateEnvoi: horodatage().notNull().defaultNow(),
    dateTraitement: horodatage(),
  },
  (t) => [
    index('message_contact_statut_idx').on(t.statut, t.dateEnvoi),
    valeursPermises('message_contact_motif_check', t.motif, MOTIFS_CONTACT),
    valeursPermises('message_contact_statut_check', t.statut, STATUTS_MESSAGE_CONTACT),
  ],
);
