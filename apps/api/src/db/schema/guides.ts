import { STATUTS_PROPOSITION_PIEGE } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { utilisateur } from './comptes.js';
import { contenu } from './contenus.js';
import { creation, momentCle } from './creations.js';
import { casBonReflexe, sujet } from './forum.js';
import { categorie } from './referentiels.js';

/* Extension (prototype, explorer.html ; DEC-01) : guides d'Explorer. Un guide rassemble les parcours
   publiés pour un même objectif. Sa méthode, ses pièges et ses lacunes sont rédigés par l'équipe
   (contenu éditorial, administré) ; ses chiffres sont calculés à la lecture : parcours visibles,
   reproductions, modèles, activité (registre, point « Explorer : guides »). */

const texteVide = () => sql`'{}'::text[]`;

export const guide = pgTable(
  'guide',
  {
    id: identifiant(),
    /** Adresse du guide (/explorer?guide=rendez-vous). */
    slug: varchar({ length: 80 }).notNull().unique(),
    /** Objectif (« Mettre en place la prise de rendez-vous en ligne »). */
    titre: varchar({ length: 150 }).notNull(),
    /** Nom court (« Prise de rendez-vous en ligne »). */
    titreCourt: varchar({ length: 80 }).notNull(),
    /** Domaine du guide. */
    categorieId: reference()
      .notNull()
      .references(() => categorie.id),
    /** Mots qu'une personne peut taper pour trouver l'objectif (« rdv », « créneau »…). */
    motsCles: text().array().notNull().default(texteVide()),
    /** « Ce que ce guide ne couvre pas encore ». */
    lacunes: text().array().notNull().default(texteVide()),
    /** Un guide en préparation n'est montré à personne. */
    datePublication: horodatage(),
    dateCreation: horodatage().notNull().defaultNow(),
    dateModification: horodatage(),
  },
  (t) => [index('guide_categorie_idx').on(t.categorieId)],
);

/** Parcours (créations), questions (sujets) et cas Bon réflexe d'un guide, dans l'ordre du guide.
    Seuls ceux qui sont publiés et visibles sont présentés (RG-30). */
export const guideContenu = pgTable(
  'guide_contenu',
  {
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.guideId, t.contenuId] }),
    index('guide_contenu_contenu_idx').on(t.contenuId),
  ],
);

/** Parcours retiré d'un guide par l'équipe (DEC-02) : le rapprochement ne l'y range plus. */
export const guideContenuRetire = pgTable(
  'guide_contenu_retire',
  {
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    contenuId: reference()
      .notNull()
      .references(() => contenu.id, { onDelete: 'cascade' }),
    date: horodatage().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.contenuId] })],
);

/** « La méthode qui ressort » : étapes communes aux parcours, dans l'ordre où ils les suivent. */
export const guideEtape = pgTable(
  'guide_etape',
  {
    id: identifiant(),
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull(),
    titre: varchar({ length: 150 }).notNull(),
    /** Conseil de l'équipe pour réussir l'étape. */
    conseil: text().notNull(),
    /** « Voir comment Aïssatou l'a demandé » : parcours cité et prompt en texte exact. */
    citationCreationId: reference().references(() => creation.id, { onDelete: 'set null' }),
    citationTexte: text(),
  },
  (t) => [
    unique('guide_etape_ordre_unique').on(t.guideId, t.ordre),
    check(
      'guide_etape_citation_check',
      sql`${t.citationCreationId} is null or ${t.citationTexte} is not null`,
    ),
  ],
);

/** Parcours qui suivent une étape de la méthode. */
export const guideEtapeSource = pgTable(
  'guide_etape_source',
  {
    etapeId: reference()
      .notNull()
      .references(() => guideEtape.id, { onDelete: 'cascade' }),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.etapeId, t.creationId] })],
);

/** « Les pièges à anticiper » : moments clés des parcours regroupés par problème. */
export const guidePiege = pgTable(
  'guide_piege',
  {
    id: identifiant(),
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    ordre: smallint().notNull(),
    titre: varchar({ length: 200 }).notNull(),
    /** « Ce qui a fonctionné ». */
    solution: text().notNull(),
    /** Étape de la méthode où le piège se présente. */
    etapeId: reference().references(() => guideEtape.id, { onDelete: 'set null' }),
    /** « Lire la discussion ». */
    sujetId: reference().references(() => sujet.id, { onDelete: 'set null' }),
    /** « S'entraîner sur ce piège ». */
    casId: reference().references(() => casBonReflexe.id, { onDelete: 'set null' }),
  },
  (t) => [unique('guide_piege_ordre_unique').on(t.guideId, t.ordre)],
);

/** Parcours où un piège a été rencontré. */
export const guidePiegeSource = pgTable(
  'guide_piege_source',
  {
    piegeId: reference()
      .notNull()
      .references(() => guidePiege.id, { onDelete: 'cascade' }),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.piegeId, t.creationId] })],
);

/** « Ce que la communauté cherche encore » : objectif sans guide, retenu par l'équipe. */
export const demandeGuide = pgTable('demande_guide', {
  id: identifiant(),
  libelle: varchar({ length: 120 }).notNull().unique(),
  categorieId: reference().references(() => categorie.id, { onDelete: 'set null' }),
  dateCreation: horodatage().notNull().defaultNow(),
  /** Close quand un guide couvre l'objectif : elle n'est plus présentée. */
  dateCloture: horodatage(),
});

/** « Je le cherche aussi » : compté sur les 30 derniers jours (date renouvelée à chaque clic). */
export const soutienDemande = pgTable(
  'soutien_demande',
  {
    demandeId: reference()
      .notNull()
      .references(() => demandeGuide.id, { onDelete: 'cascade' }),
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    date: horodatage().notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.demandeId, t.utilisateurId] }),
    index('soutien_demande_utilisateur_idx').on(t.utilisateurId),
  ],
);

/** « Signaler un piège » : relu par l'équipe avant de rejoindre le guide. */
export const propositionPiege = pgTable(
  'proposition_piege',
  {
    id: identifiant(),
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    auteurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    titre: varchar({ length: 300 }).notNull(),
    solution: varchar({ length: 1500 }),
    etapeId: reference().references(() => guideEtape.id, { onDelete: 'set null' }),
    /** Outil et modèle, en texte libre. */
    outil: varchar({ length: 100 }),
    date: horodatage().notNull().defaultNow(),
    statut: text({ enum: STATUTS_PROPOSITION_PIEGE }).notNull().default('EN_RELECTURE'),
    relecteurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    dateRelecture: horodatage(),
  },
  (t) => [
    index('proposition_piege_guide_idx').on(t.guideId, t.statut),
    index('proposition_piege_auteur_idx').on(t.auteurId, t.statut),
    valeursPermises('proposition_piege_statut_check', t.statut, STATUTS_PROPOSITION_PIEGE),
    check(
      'proposition_piege_relecture_check',
      sql`(${t.statut} = 'EN_RELECTURE') = (${t.dateRelecture} is null)`,
    ),
  ],
);

/** « Ma liste de contrôle » d'un membre pour un guide : étapes et pièges cochés. */
export const listeControle = pgTable(
  'liste_controle',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    guideId: reference()
      .notNull()
      .references(() => guide.id, { onDelete: 'cascade' }),
    etapes: bigint({ mode: 'number' })
      .array()
      .notNull()
      .default(sql`'{}'::bigint[]`),
    pieges: bigint({ mode: 'number' })
      .array()
      .notNull()
      .default(sql`'{}'::bigint[]`),
    dateModification: horodatage().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.guideId] })],
);

/** Extension (APP-03, prototype : « Vu dans la communauté » d'un savoir d'Apprendre) : moment clé d'une
    création publiée, choisi par l'équipe pour illustrer un savoir (contenu éditorial du site, désigné
    par son identifiant), ou la création seule avec une note de l'équipe. */
export const illustrationSavoir = pgTable(
  'illustration_savoir',
  {
    id: identifiant(),
    savoir: varchar({ length: 80 }).notNull(),
    creationId: reference()
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    /** Moment clé de la création. L'auteur qui réécrit sa création recrée ses moments : le lien tombe
        alors (jamais un autre moment montré à sa place) et l'écran de l'administration le signale. */
    momentCleId: reference().references(() => momentCle.id, { onDelete: 'set null' }),
    note: varchar({ length: 300 }),
    ordre: smallint().notNull(),
    dateAjout: horodatage().notNull().defaultNow(),
  },
  (t) => [
    index('illustration_savoir_savoir_idx').on(t.savoir, t.ordre),
    index('illustration_savoir_creation_idx').on(t.creationId),
  ],
);

/** Extension (APP-03, prototype : sujet du forum de « Pour aller plus loin » d'un savoir) : un sujet
    au plus par savoir, choisi par l'équipe. */
export const sujetSavoir = pgTable('sujet_savoir', {
  savoir: varchar({ length: 80 }).primaryKey(),
  sujetId: reference()
    .notNull()
    .references(() => sujet.id, { onDelete: 'cascade' }),
  dateAjout: horodatage().notNull().defaultNow(),
});
