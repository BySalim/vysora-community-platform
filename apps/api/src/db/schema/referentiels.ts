import {
  CATEGORIES_BADGE,
  CODES_TYPE_VOTE,
  FAMILLES_OUTIL,
  STATUTS_MODELE,
  STATUTS_OUTIL,
  TONS_BADGE,
  TYPES_DOCUMENT_LEGAL,
  TYPES_OUTIL,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';

/* Référentiels administrés (F-95). Un élément utilisé n'est jamais supprimé : il est archivé (RG-110). */

export const editeur = pgTable('editeur', {
  id: identifiant(),
  nom: varchar({ length: 100 }).notNull().unique(),
  siteWeb: varchar({ length: 2048 }),
  estActif: boolean().notNull().default(true),
});

export const outil = pgTable(
  'outil',
  {
    id: identifiant(),
    editeurId: reference()
      .notNull()
      .references(() => editeur.id),
    nom: varchar({ length: 100 }).notNull().unique(),
    /** Extension : identifiant d'adresse (filtres, pages). */
    slug: varchar({ length: 100 }).notNull().unique(),
    type: text({ enum: TYPES_OUTIL }).notNull(),
    /** Extension (prototype) : famille affichée dans le catalogue. */
    famille: text({ enum: FAMILLES_OUTIL }).notNull(),
    /** Extension (charte 13.6) : nom du fichier SVG dans /assets/logos-ia, sans extension. */
    logo: varchar({ length: 80 }),
    /** Extension : logo monochrome, passé en blanc sur les sections sombres. */
    logoMonochrome: boolean().notNull().default(false),
    /** Extension (prototype, toolAliases) : autres noms qui désignent l'outil dans un texte. */
    alias: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Extension (F-19) : l'outil agit sur des fichiers, des commandes ou des services. */
    estAgent: boolean().notNull().default(false),
    siteWeb: varchar({ length: 2048 }),
    statut: text({ enum: STATUTS_OUTIL }).notNull().default('ACTIF'),
  },
  (t) => [
    valeursPermises('outil_type_check', t.type, TYPES_OUTIL),
    valeursPermises('outil_famille_check', t.famille, FAMILLES_OUTIL),
    valeursPermises('outil_statut_check', t.statut, STATUTS_OUTIL),
    index('outil_editeur_idx').on(t.editeurId),
  ],
);

export const modele = pgTable(
  'modele',
  {
    id: identifiant(),
    editeurId: reference()
      .notNull()
      .references(() => editeur.id),
    /** Nom complet et version, unique par éditeur (« Claude Sonnet 4.5 »). */
    nom: varchar({ length: 100 }).notNull(),
    /** Extension : nom affiché après celui de l'outil (« Claude · Sonnet 4.5 »). */
    nomCourt: varchar({ length: 60 }).notNull(),
    dateSortie: date({ mode: 'string' }),
    statut: text({ enum: STATUTS_MODELE }).notNull().default('DISPONIBLE'),
  },
  (t) => [
    uniqueIndex('modele_editeur_nom_unique').on(t.editeurId, t.nom),
    valeursPermises('modele_statut_check', t.statut, STATUTS_MODELE),
  ],
);

/** Extension (prototype, nouvelle-creation-data.js) : modèles proposés à la saisie pour un outil. */
export const outilModele = pgTable(
  'outil_modele',
  {
    outilId: reference()
      .notNull()
      .references(() => outil.id, { onDelete: 'cascade' }),
    modeleId: reference()
      .notNull()
      .references(() => modele.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.outilId, t.modeleId] }),
    index('outil_modele_modele_idx').on(t.modeleId),
  ],
);

export const categorie = pgTable('categorie', {
  id: identifiant(),
  libelle: varchar({ length: 60 }).notNull().unique(),
  /** Extension : adresse de la page catégorie (/categories/[slug]). */
  slug: varchar({ length: 80 }).notNull().unique(),
  description: text(),
  /** Extension (charte 13.2) : icône du sprite, sans le préfixe « i- ». */
  icone: varchar({ length: 40 }),
  ordreAffichage: smallint().notNull().default(0),
  estActive: boolean().notNull().default(true),
});

export const licence = pgTable(
  'licence',
  {
    id: identifiant(),
    code: varchar({ length: 30 }).notNull().unique(),
    libelle: varchar({ length: 100 }).notNull(),
    /** Extension (prototype) : ce que la licence permet, en une phrase. */
    resume: varchar({ length: 200 }),
    url: varchar({ length: 2048 }).notNull(),
    autoriseVariantes: boolean().notNull(),
    estParDefaut: boolean().notNull().default(false),
    estActive: boolean().notNull().default(true),
    ordreAffichage: smallint().notNull().default(0),
  },
  // CI-26 : au plus une licence par défaut (exactement une, garanti par l'administration).
  (t) => [
    uniqueIndex('licence_par_defaut_unique')
      .on(t.estParDefaut)
      .where(sql`${t.estParDefaut}`),
  ],
);

export const etiquette = pgTable(
  'etiquette',
  {
    id: identifiant(),
    libelle: varchar({ length: 40 }).notNull(),
    /** Extension : adresse de la page étiquette (/etiquettes/[slug]). */
    slug: varchar({ length: 60 }).notNull().unique(),
    estActive: boolean().notNull().default(true),
  },
  (t) => [uniqueIndex('etiquette_libelle_unique').on(sql`lower(${t.libelle})`)],
);

export const typeVote = pgTable(
  'type_vote',
  {
    code: varchar({ length: 20 }).primaryKey(),
    libelle: varchar({ length: 50 }).notNull(),
  },
  (t) => [valeursPermises('type_vote_code_check', t.code, CODES_TYPE_VOTE)],
);

/** RG-84 et RG-85 : paliers de réputation et privilèges associés (null : sans limite). */
export const niveau = pgTable(
  'niveau',
  {
    rang: smallint().primaryKey(),
    /** Extension : code stable utilisé par l'interface (data-niveau). */
    code: varchar({ length: 20 }).notNull().unique(),
    libelle: varchar({ length: 30 }).notNull(),
    seuilPoints: integer().notNull().unique(),
    creationsPar24h: integer(),
    sujetsPar24h: integer(),
    reponsesEtCommentairesPar24h: integer(),
    liensParContenu: integer(),
    compteDansMasquageAutomatique: boolean().notNull(),
    peutProposerUnCas: boolean().notNull(),
  },
  (t) => [
    check('niveau_rang_check', sql`${t.rang} between 1 and 5`),
    check('niveau_seuil_check', sql`${t.seuilPoints} >= 0`),
  ],
);

export const badge = pgTable(
  'badge',
  {
    id: identifiant(),
    code: varchar({ length: 40 }).notNull().unique(),
    libelle: varchar({ length: 60 }).notNull(),
    description: text().notNull(),
    critere: text().notNull(),
    categorie: text({ enum: CATEGORIES_BADGE }).notNull(),
    /** Icône du sprite affichée dans l'emblème (charte 13.8). */
    icone: varchar({ length: 40 }).notNull(),
    /** Extension (charte 13.8) : ton de l'emblème. */
    ton: text({ enum: TONS_BADGE }).notNull(),
    estActif: boolean().notNull().default(true),
  },
  (t) => [
    valeursPermises('badge_categorie_check', t.categorie, CATEGORIES_BADGE),
    valeursPermises('badge_ton_check', t.ton, TONS_BADGE),
  ],
);

/** F-04 et RG-112 : versions successives des documents légaux. */
export const documentLegal = pgTable(
  'document_legal',
  {
    id: identifiant(),
    type: text({ enum: TYPES_DOCUMENT_LEGAL }).notNull(),
    version: varchar({ length: 20 }).notNull(),
    dateEffet: date({ mode: 'string' }).notNull(),
    url: varchar({ length: 2048 }).notNull(),
    /** Extension (prototype) : la politique de confidentialité informe, elle ne s'accepte pas. */
    acceptationRequise: boolean().notNull().default(true),
    /** Extension (prototype) : résumé des changements montré à la réacceptation. */
    resumeChangements: text(),
    /** Extension : texte complet en Markdown, pour publier une version sans redéployer. */
    texte: text(),
    /** RG-90, WF-03 : envoi de l'e-mail aux membres à la date d'effet (EMAIL-01) ; jamais deux fois. */
    dateAnnonce: horodatage(),
  },
  (t) => [
    uniqueIndex('document_legal_type_version_unique').on(t.type, t.version),
    valeursPermises('document_legal_type_check', t.type, TYPES_DOCUMENT_LEGAL),
  ],
);
