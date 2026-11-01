import {
  FOURNISSEURS_EXTERNES,
  LANGUES_INTERFACE,
  MOTIFS_MOUVEMENT_REPUTATION,
  ROLES,
  STATUTS_COMPTE,
  STATUTS_DEMANDE_DROIT,
  TYPES_DEMANDE_DROIT,
  TYPES_NOTIFICATION,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { horodatage, identifiant, reference, valeursPermises } from './_outils.js';
import { contenu } from './contenus.js';
import { decisionModeration } from './moderation.js';
import { badge, documentLegal } from './referentiels.js';

/* Comptes, conformité, progression et notifications (MCD, section 4.1). */

export const utilisateur = pgTable(
  'utilisateur',
  {
    id: identifiant(),
    /** RG-01 : unique sans distinction de casse ; remplacé par « membre-supprime-xxxx » à la suppression. */
    pseudo: varchar({ length: 30 }).notNull(),
    /** Extension (prototype) : nom affiché à côté des contenus (« Claire Dubois ») ; à défaut, le pseudo. */
    nomAffiche: varchar({ length: 60 }),
    /** RG-02 ; effacé à la suppression du compte (RG-05). */
    email: varchar({ length: 254 }),
    emailVerifie: boolean().notNull().default(false),
    /** Absente si le compte n'utilise qu'un compte externe (ENF-05 : jamais le mot de passe en clair). */
    empreinteMotDePasse: varchar({ length: 255 }),
    /** Extension (prototype, paramètres) : dernier changement du mot de passe ; nulle s'il date de l'inscription. */
    dateMotDePasse: horodatage(),
    role: text({ enum: ROLES }).notNull().default('MEMBRE'),
    statutCompte: text({ enum: STATUTS_COMPTE }).notNull().default('ACTIF'),
    /** Clé du fichier dans le stockage des images. */
    avatar: varchar({ length: 255 }),
    biographie: varchar({ length: 500 }),
    urlSite: varchar({ length: 2048 }),
    langueInterface: text({ enum: LANGUES_INTERFACE }).notNull().default('FR'),
    /** Extension (prototype, paramètres) : fuseau des horaires affichés. */
    fuseauHoraire: varchar({ length: 64 }).notNull().default('Africa/Dakar'),
    /** F-81 : préférence générale ; le détail par événement est dans preference_notification. */
    notificationsEmail: boolean().notNull().default(true),
    /** Extension (prototype, confidentialité) : refus d'être compté dans la mesure d'audience. */
    refusMesureAudience: boolean().notNull().default(false),
    dateInscription: horodatage().notNull().defaultNow(),
    dateDerniereConnexion: horodatage(),
  },
  (t) => [
    uniqueIndex('utilisateur_pseudo_unique').on(sql`lower(${t.pseudo})`),
    uniqueIndex('utilisateur_email_unique')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.email} is not null`),
    valeursPermises('utilisateur_role_check', t.role, ROLES),
    valeursPermises('utilisateur_statut_check', t.statutCompte, STATUTS_COMPTE),
    valeursPermises('utilisateur_langue_check', t.langueInterface, LANGUES_INTERFACE),
    check('utilisateur_email_check', sql`${t.email} is not null or ${t.statutCompte} = 'SUPPRIME'`),
  ],
);

/** F-02 : compte GitHub ou Google lié pour la connexion (LIER). */
export const compteExterne = pgTable(
  'compte_externe',
  {
    id: identifiant(),
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    fournisseur: text({ enum: FOURNISSEURS_EXTERNES }).notNull(),
    identifiantFournisseur: varchar({ length: 255 }).notNull(),
    dateLiaison: horodatage().notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('compte_externe_fournisseur_unique').on(t.fournisseur, t.identifiantFournisseur),
    uniqueIndex('compte_externe_utilisateur_unique').on(t.utilisateurId, t.fournisseur),
    valeursPermises('compte_externe_fournisseur_check', t.fournisseur, FOURNISSEURS_EXTERNES),
  ],
);

/** ACCEPTER : acceptation datée d'une version de document légal (RG-03). */
export const acceptationDocument = pgTable(
  'acceptation_document',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    documentLegalId: reference()
      .notNull()
      .references(() => documentLegal.id),
    dateAcceptation: horodatage().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.documentLegalId] })],
);

/** F-07, F-08 : demandes d'export ou de suppression (CV-08). */
export const demandeDroit = pgTable(
  'demande_droit',
  {
    id: identifiant(),
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    type: text({ enum: TYPES_DEMANDE_DROIT }).notNull(),
    dateDemande: horodatage().notNull().defaultNow(),
    statut: text({ enum: STATUTS_DEMANDE_DROIT }).notNull().default('EN_COURS'),
    dateTraitement: horodatage(),
    suppressionCreations: boolean(),
    /** Technique : fichier d'export produit et fin de validité du lien (7 jours). */
    fichierExport: varchar({ length: 255 }),
    dateExpirationExport: horodatage(),
  },
  (t) => [
    // CI-31 : au plus une demande en cours par membre et par type de droit.
    uniqueIndex('demande_droit_en_cours_unique')
      .on(t.utilisateurId, t.type)
      .where(sql`${t.statut} = 'EN_COURS'`),
    valeursPermises('demande_droit_type_check', t.type, TYPES_DEMANDE_DROIT),
    valeursPermises('demande_droit_statut_check', t.statut, STATUTS_DEMANDE_DROIT),
    check(
      'demande_droit_traitement_check',
      sql`${t.statut} <> 'TRAITEE' or ${t.dateTraitement} is not null`,
    ),
    check(
      'demande_droit_suppression_check',
      sql`(${t.type} = 'SUPPRESSION') = (${t.suppressionCreations} is not null)`,
    ),
  ],
);

/** RG-80 à RG-83 : la réputation est la somme des mouvements (donnée calculée, section 8). */
export const mouvementReputation = pgTable(
  'mouvement_reputation',
  {
    id: identifiant(),
    /** CREDITER */
    beneficiaireId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    points: integer().notNull(),
    motif: text({ enum: MOTIFS_MOUVEMENT_REPUTATION }).notNull(),
    date: horodatage().notNull().defaultNow(),
    /** ORIGINER : contenu à l'origine du mouvement. */
    contenuId: reference().references(() => contenu.id, { onDelete: 'set null' }),
    /** JUSTIFIER : décision d'ajustement par un administrateur. */
    decisionId: reference().references(() => decisionModeration.id),
    /** Technique : membre dont l'action a déclenché le mouvement (votant, déclarant…), pour l'unicité et l'annulation. */
    acteurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    /** Technique : mouvement annulé par ce mouvement (RG-82). */
    mouvementAnnuleId: reference().references((): AnyPgColumn => mouvementReputation.id),
  },
  (t) => [
    index('mouvement_reputation_beneficiaire_date_idx').on(t.beneficiaireId, t.date),
    index('mouvement_reputation_date_idx').on(t.date),
    index('mouvement_reputation_contenu_idx').on(t.contenuId),
    valeursPermises('mouvement_reputation_motif_check', t.motif, MOTIFS_MOUVEMENT_REPUTATION),
    // CI-24 : un ajustement est justifié par une décision ; les autres mouvements n'en ont pas.
    check(
      'mouvement_reputation_justification_check',
      sql`(${t.motif} = 'AJUSTEMENT_MODERATION') = (${t.decisionId} is not null)`,
    ),
  ],
);

/** F-81 : notification dans l'application (DESTINER, DECLENCHER, CONCERNER). */
export const notification = pgTable(
  'notification',
  {
    id: identifiant(),
    destinataireId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    declencheurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    contenuId: reference().references(() => contenu.id, { onDelete: 'cascade' }),
    type: text({ enum: TYPES_NOTIFICATION }).notNull(),
    date: horodatage().notNull().defaultNow(),
    estLue: boolean().notNull().default(false),
    nombreRegroupe: integer().notNull().default(1),
    /** Extension : détails figés au moment de l'événement (points, résultat, extrait). */
    donnees: jsonb().$type<Record<string, unknown>>(),
    /** Technique : clé de regroupement (votes par contenu et par jour, RG-91). */
    cleRegroupement: varchar({ length: 120 }),
    /** Technique : e-mail encore à décider selon les préférences du destinataire (WF-25, PARAM-01). */
    emailEnAttente: boolean().notNull().default(false),
  },
  (t) => [
    index('notification_destinataire_idx').on(t.destinataireId, t.estLue, t.date),
    index('notification_email_en_attente_idx')
      .on(t.id)
      .where(sql`${t.emailEnAttente}`),
    uniqueIndex('notification_regroupement_unique')
      .on(t.destinataireId, t.cleRegroupement)
      .where(sql`${t.cleRegroupement} is not null`),
    valeursPermises('notification_type_check', t.type, TYPES_NOTIFICATION),
    check('notification_nombre_check', sql`${t.nombreRegroupe} >= 1`),
  ],
);

/** OBTENIR : un badge donné au plus une fois (CI-27). */
export const obtentionBadge = pgTable(
  'obtention_badge',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    badgeId: reference()
      .notNull()
      .references(() => badge.id),
    dateObtention: horodatage().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.badgeId] })],
);

/** Extension (prototype, paramètres) : canaux choisis par événement ; sans ligne, la valeur par défaut s'applique. */
export const preferenceNotification = pgTable(
  'preference_notification',
  {
    utilisateurId: reference()
      .notNull()
      .references(() => utilisateur.id, { onDelete: 'cascade' }),
    evenement: text({ enum: TYPES_NOTIFICATION }).notNull(),
    application: boolean().notNull().default(true),
    email: boolean().notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.utilisateurId, t.evenement] }),
    valeursPermises('preference_notification_evenement_check', t.evenement, TYPES_NOTIFICATION),
  ],
);

/** Extension (doc 01, bêta fermée sur invitation ; prototype, inscription) : code d'invitation à usage unique. */
export const invitation = pgTable(
  'invitation',
  {
    id: identifiant(),
    code: varchar({ length: 40 }).notNull().unique(),
    createurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    utilisateurId: reference().references(() => utilisateur.id, { onDelete: 'set null' }),
    dateCreation: horodatage().notNull().defaultNow(),
    dateExpiration: horodatage(),
    dateUtilisation: horodatage(),
    /** ADM-02 : un code libre désactivé par l'administration n'est plus accepté (définitif). */
    dateDesactivation: horodatage(),
  },
  (t) => [index('invitation_createur_idx').on(t.createurId)],
);
