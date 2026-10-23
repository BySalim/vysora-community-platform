import { STATUTS_CONTENU, TYPES_CONTENU, TYPES_MIME_IMAGE, type TypeContenu } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { echange } from './creations.js';
import { etiquette, modele, typeVote } from './referentiels.js';

/* Généralisation CONTENU (MCD, section 6) : une table commune et une table par sous-type,
   dont la clé primaire est aussi une clé étrangère vers contenu (id, type_contenu).
   Le couple (id, type_contenu) empêche un même contenu d'appartenir à deux sous-types (CI-01). */

export const contenu = pgTable(
  'contenu',
  {
    id: identifiant(),
    typeContenu: text({ enum: TYPES_CONTENU }).notNull(),
    /** REDIGER */
    auteurId: reference()
      .notNull()
      .references(() => utilisateur.id),
    dateCreation: horodatage().notNull().defaultNow(),
    /** RG-18 : date de dernière modification affichée. */
    dateModification: horodatage(),
    /** CV-02 : statut de modération. */
    statut: text({ enum: STATUTS_CONTENU }).notNull().default('VISIBLE'),
    /** F-23 : au plus une vue par visiteur et par jour (dédoublonnage dans vue_contenu). */
    nbVues: integer().notNull().default(0),
    /** Technique (F-93) : masquage automatique au seuil de signalements, prioritaire dans la file. */
    dateMasquageAutomatique: horodatage(),
  },
  (t) => [
    unique('contenu_id_type_unique').on(t.id, t.typeContenu),
    index('contenu_auteur_idx').on(t.auteurId, t.typeContenu),
    valeursPermises('contenu_type_check', t.typeContenu, TYPES_CONTENU),
    valeursPermises('contenu_statut_check', t.statut, STATUTS_CONTENU),
    check('contenu_vues_check', sql`${t.nbVues} >= 0`),
  ],
);

/** Colonnes d'un sous-type : clé héritée de contenu et discriminant constant. */
export function colonnesSousType<const T extends TypeContenu>(type: T) {
  return {
    id: reference().primaryKey(),
    typeContenu: text({ enum: [type] })
      .notNull()
      .default(type),
  };
}

/** Clé étrangère (id, type_contenu) vers contenu et contrôle du discriminant. */
export function contraintesSousType(
  table: string,
  t: { id: AnyPgColumn; typeContenu: AnyPgColumn },
  type: TypeContenu,
) {
  return [
    foreignKey({
      name: `${table}_contenu_fk`,
      columns: [t.id, t.typeContenu],
      foreignColumns: [contenu.id, contenu.typeContenu],
    }).onDelete('cascade'),
    check(`${table}_type_contenu_check`, sql`${t.typeContenu} = ${sql.raw(`'${type}'`)}`),
  ];
}

/** VOTER : un vote de chaque type par membre et par contenu (RG-40). */
export const vote = pgTable(
  'vote',
  {
    votantId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    typeVoteCode: varchar({ length: 20 })
      .notNull()
      .references(() => typeVote.code),
    dateVote: horodatage().notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.votantId, t.contenuId, t.typeVoteCode] }),
    // Compteurs et popularité sur 7 jours glissants (RG-32).
    index('vote_contenu_type_date_idx').on(t.contenuId, t.typeVoteCode, t.dateVote),
  ],
);

/** ENREGISTRER : liste privée « Enregistrés » (RG-45). */
export const enregistrement = pgTable(
  'enregistrement',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    dateEnregistrement: horodatage().notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.utilisateurId, t.contenuId] }),
    index('enregistrement_utilisateur_date_idx').on(t.utilisateurId, t.dateEnregistrement),
  ],
);

/** SIGNALER_OBSOLESCENCE : une fois par membre, contenu et modèle (RG-44). */
export const signalementObsolescence = pgTable(
  'signalement_obsolescence',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    modeleId: reference()
      .notNull()
      .references(() => modele.id),
    date: horodatage().notNull().defaultNow(),
    remarque: varchar({ length: 1000 }),
  },
  (t) => [
    primaryKey({ columns: [t.utilisateurId, t.contenuId, t.modeleId] }),
    index('signalement_obsolescence_contenu_modele_idx').on(t.contenuId, t.modeleId),
  ],
);

/** ETIQUETER */
export const contenuEtiquette = pgTable(
  'contenu_etiquette',
  {
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    etiquetteId: reference()
      .notNull()
      .references(() => etiquette.id),
  },
  (t) => [
    primaryKey({ columns: [t.contenuId, t.etiquetteId] }),
    index('contenu_etiquette_etiquette_idx').on(t.etiquetteId),
  ],
);

/** RG-16 : image téléversée, rattachée à un contenu (ILLUSTRER) ou à un échange (JOINDRE), jamais aux deux (CI-02).
    Sans rattachement, elle vient d'être téléversée : une tâche de nettoyage supprime les images orphelines. */
export const media = pgTable(
  'media',
  {
    id: identifiant(),
    /** TELEVERSER */
    televerseurId: reference()
      .notNull()
      .references(() => utilisateur.id),
    contenuId: reference().references(() => contenu.id, { onDelete: 'cascade' }),
    echangeId: reference().references(() => echange.id, { onDelete: 'cascade' }),
    /** Clé du fichier original dans le stockage. */
    fichier: varchar({ length: 255 }).notNull(),
    typeMime: text({ enum: TYPES_MIME_IMAGE }).notNull(),
    tailleOctets: integer().notNull(),
    /** Technique : dimensions, pour réserver la place à l'affichage (CLS, ENF-03). */
    largeur: integer(),
    hauteur: integer(),
    /** Technique : déclinaisons produites (largeur → clé), par exemple { "720": "…", "1280": "…" }. */
    variantes: jsonb()
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    texteAlternatif: varchar({ length: 250 }).notNull(),
    legende: varchar({ length: 300 }),
    ordre: smallint().notNull().default(0),
    dateTeleversement: horodatage().notNull().defaultNow(),
  },
  (t) => [
    index('media_contenu_idx').on(t.contenuId),
    index('media_echange_idx').on(t.echangeId),
    valeursPermises('media_type_mime_check', t.typeMime, TYPES_MIME_IMAGE),
    check('media_taille_check', sql`${t.tailleOctets} > 0 and ${t.tailleOctets} <= 5242880`),
    check('media_rattachement_check', sql`${t.contenuId} is null or ${t.echangeId} is null`),
  ],
);
