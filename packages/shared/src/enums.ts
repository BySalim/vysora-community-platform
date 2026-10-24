/* Valeurs énumérées du domaine (MCD, docs/produit/05-mcd-mvp.md), en majuscules et sans accents.
   Source unique : l'API en tire ses contraintes de base de données, le site ses libellés.
   Les ajouts propres au prototype sont signalés « extension ». */

const valeurs = <const T extends readonly string[]>(...liste: T) => liste;

/* Comptes ------------------------------------------------------------------ */

export const ROLES = valeurs('MEMBRE', 'MODERATEUR', 'ADMINISTRATEUR');
export type Role = (typeof ROLES)[number];

/** CV-07. La suspension n'est pas un statut : elle se déduit d'une décision en cours. */
export const STATUTS_COMPTE = valeurs('ACTIF', 'EN_SUPPRESSION', 'SUPPRIME', 'BANNI');
export type StatutCompte = (typeof STATUTS_COMPTE)[number];

export const LANGUES_INTERFACE = valeurs('FR', 'EN');
export type LangueInterface = (typeof LANGUES_INTERFACE)[number];

export const FOURNISSEURS_EXTERNES = valeurs('GITHUB', 'GOOGLE');
export type FournisseurExterne = (typeof FOURNISSEURS_EXTERNES)[number];

export const TYPES_DOCUMENT_LEGAL = valeurs('CGU', 'CONFIDENTIALITE', 'CHARTE');
export type TypeDocumentLegal = (typeof TYPES_DOCUMENT_LEGAL)[number];

export const TYPES_DEMANDE_DROIT = valeurs('EXPORT', 'SUPPRESSION');
export type TypeDemandeDroit = (typeof TYPES_DEMANDE_DROIT)[number];

/** CV-08 */
export const STATUTS_DEMANDE_DROIT = valeurs('EN_COURS', 'TRAITEE', 'ANNULEE');
export type StatutDemandeDroit = (typeof STATUTS_DEMANDE_DROIT)[number];

/** RG-80 */
export const MOTIFS_MOUVEMENT_REPUTATION = valeurs(
  'VOTE_UTILE_RECU',
  'VOTE_TESTE_RECU',
  'REPRODUCTION_REUSSIE_RECUE',
  'REPONSE_ACCEPTEE',
  'ACCEPTATION_REPONSE',
  'REPRODUCTION_DECLAREE',
  'CAS_VALIDE',
  'CAS_REUSSI',
  'PARTICIPATION_DEFI',
  'PODIUM_DEFI',
  'ANNULATION',
  'AJUSTEMENT_MODERATION',
);
export type MotifMouvementReputation = (typeof MOTIFS_MOUVEMENT_REPUTATION)[number];

/** RG-91 */
export const TYPES_NOTIFICATION = valeurs(
  'COMMENTAIRE_RECU',
  'REPONSE_COMMENTAIRE',
  'REPONSE_SUJET',
  'REPONSE_ACCEPTEE',
  'REPRODUCTION_RECUE',
  'VARIANTE_PUBLIEE',
  'OBSOLESCENCE_SIGNALEE',
  'VOTES_UTILE_RECUS',
  'BADGE_OBTENU',
  'NIVEAU_ATTEINT',
  'CAS_VALIDE',
  'CAS_REFUSE',
  'RESULTAT_DEFI',
  'CONTENU_MASQUE',
  'CONTENU_RETABLI',
  'DECISION_MODERATION',
);
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

export const CATEGORIES_BADGE = valeurs('CONTRIBUTION', 'APPRENTISSAGE', 'COMMUNAUTE');
export type CategorieBadge = (typeof CATEGORIES_BADGE)[number];

/** Extension (charte, section 13.8) : ton de l'emblème hexagonal. */
export const TONS_BADGE = valeurs('BLEU', 'VERT', 'AMBRE', 'ENCRE');
export type TonBadge = (typeof TONS_BADGE)[number];

/* Contenus ----------------------------------------------------------------- */

/** RG-41 */
export const CODES_TYPE_VOTE = valeurs('UTILE', 'TESTE_OK');
export type CodeTypeVote = (typeof CODES_TYPE_VOTE)[number];

/** Discriminant de la généralisation CONTENU (CI-01). */
export const TYPES_CONTENU = valeurs(
  'CREATION',
  'SUJET',
  'MESSAGE',
  'COMMENTAIRE',
  'REPRODUCTION',
  'CAS_BON_REFLEXE',
);
export type TypeContenu = (typeof TYPES_CONTENU)[number];

/** CV-02 */
export const STATUTS_CONTENU = valeurs('VISIBLE', 'MASQUE', 'SUPPRIME');
export type StatutContenu = (typeof STATUTS_CONTENU)[number];

/** RG-16 */
export const TYPES_MIME_IMAGE = valeurs('image/png', 'image/jpeg', 'image/webp', 'image/gif');
export type TypeMimeImage = (typeof TYPES_MIME_IMAGE)[number];

/* Créations et référentiels IA ---------------------------------------------- */

export const TYPES_OUTIL = valeurs(
  'ASSISTANT_CONVERSATIONNEL',
  'EDITEUR_CODE',
  'AGENT_CODE',
  'CONSTRUCTEUR_APPLICATION',
  'GENERATEUR_IMAGE',
  'GENERATEUR_VIDEO',
  'GENERATEUR_AUDIO',
  'AUTRE',
);
export type TypeOutil = (typeof TYPES_OUTIL)[number];

/** Extension (prototype, data.js `toolFamilies`) : familles du catalogue affiché. */
export const FAMILLES_OUTIL = valeurs(
  'ASSISTANT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'CODE',
  'AUTOMATISATION',
);
export type FamilleOutil = (typeof FAMILLES_OUTIL)[number];

/** RG-110 */
export const STATUTS_OUTIL = valeurs('ACTIF', 'ARCHIVE');
export type StatutOutil = (typeof STATUTS_OUTIL)[number];

/** RG-110 */
export const STATUTS_MODELE = valeurs('DISPONIBLE', 'RETIRE');
export type StatutModele = (typeof STATUTS_MODELE)[number];

export const TYPES_CREATION = valeurs('UN_PROMPT', 'ITERATION', 'PROJET');
export type TypeCreation = (typeof TYPES_CREATION)[number];

/** Extension (prototype, Publier) : nature du résultat textuel d'une création (texte rédigé ou code). */
export const NATURES_RESULTAT = valeurs('TEXTE', 'CODE');
export type NatureResultat = (typeof NATURES_RESULTAT)[number];

/** CV-01 */
export const STATUTS_PUBLICATION = valeurs('BROUILLON', 'PUBLIEE');
export type StatutPublication = (typeof STATUTS_PUBLICATION)[number];

/** RG-23 */
export const AVERTISSEMENTS_AGENT = valeurs('AUCUN', 'AUTEUR', 'MODERATION');
export type AvertissementAgent = (typeof AVERTISSEMENTS_AGENT)[number];

export const RESULTATS_REPRODUCTION = valeurs('SUCCES', 'PARTIEL', 'ECHEC');
export type ResultatReproduction = (typeof RESULTATS_REPRODUCTION)[number];

export const MODES_SELECTION = valeurs('PREMIER_ESSAI', 'MEILLEUR_ESSAI');
export type ModeSelection = (typeof MODES_SELECTION)[number];

export const TYPES_MOMENT_CLE = valeurs(
  'CORRECTION',
  'REFUS',
  'ECHEC',
  'CHANGEMENT_OUTIL',
  'VERIFICATION',
  'DECOUVERTE',
);
export type TypeMomentCle = (typeof TYPES_MOMENT_CLE)[number];

export const TYPES_LIEN_EXTERNE = valeurs(
  'DEMO',
  'DEPOT_CODE',
  'VIDEO',
  'PREUVE',
  'ARTICLE',
  'AUTRE',
);
export type TypeLienExterne = (typeof TYPES_LIEN_EXTERNE)[number];

/** CV-05 */
export const STATUTS_DEFI = valeurs('BROUILLON', 'PUBLIE', 'CLOTURE', 'ANNULE');
export type StatutDefi = (typeof STATUTS_DEFI)[number];

/* Forum et Bon réflexe ------------------------------------------------------ */

export const TYPES_SUJET = valeurs(
  'QUESTION',
  'CLINIQUE',
  'ASTUCE',
  'RETOUR_EXPERIENCE',
  'DISCUSSION',
);
export type TypeSujet = (typeof TYPES_SUJET)[number];

export const DIFFICULTES_CAS = valeurs('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');
export type DifficulteCas = (typeof DIFFICULTES_CAS)[number];

/** CV-04 */
export const STATUTS_VALIDATION_CAS = valeurs('PROPOSE', 'VALIDE', 'REFUSE');
export type StatutValidationCas = (typeof STATUTS_VALIDATION_CAS)[number];

/* Modération ---------------------------------------------------------------- */

/** RG-100 */
export const MOTIFS_SIGNALEMENT = valeurs(
  'SPAM',
  'ILLICITE',
  'DANGEREUX',
  'DONNEES_PERSONNELLES',
  'PLAGIAT',
  'HARCELEMENT',
  'HORS_SUJET',
  'AUTRE',
);
export type MotifSignalement = (typeof MOTIFS_SIGNALEMENT)[number];

/** CV-06 */
export const STATUTS_SIGNALEMENT = valeurs('OUVERT', 'FONDE', 'NON_FONDE');
export type StatutSignalement = (typeof STATUTS_SIGNALEMENT)[number];

/** RG-102 */
export const ACTIONS_DECISION = valeurs(
  'AUCUNE',
  'MASQUER',
  'RETABLIR',
  'SUPPRIMER',
  'AVERTIR',
  'SUSPENDRE',
  'AJOUTER_AVERTISSEMENT_AGENT',
  'RETIRER_AVERTISSEMENT_AGENT',
  'BANNIR',
  'AJUSTER_REPUTATION',
  'RETIRER_BADGE',
);
export type ActionDecision = (typeof ACTIONS_DECISION)[number];

/** CI-19 : actions qui portent sur un contenu (PORTER_SUR obligatoire). */
export const ACTIONS_DECISION_CONTENU = valeurs(
  'AUCUNE',
  'MASQUER',
  'RETABLIR',
  'SUPPRIMER',
  'AJOUTER_AVERTISSEMENT_AGENT',
  'RETIRER_AVERTISSEMENT_AGENT',
);
/** CI-19 : actions qui visent un membre (SANCTIONNER obligatoire). */
export const ACTIONS_DECISION_MEMBRE = valeurs(
  'AVERTIR',
  'SUSPENDRE',
  'BANNIR',
  'AJUSTER_REPUTATION',
  'RETIRER_BADGE',
);
/** RG-102 : actions réservées aux administrateurs. */
export const ACTIONS_DECISION_ADMINISTRATEUR = valeurs(
  'BANNIR',
  'AJUSTER_REPUTATION',
  'RETIRER_BADGE',
);

/* Données techniques -------------------------------------------------------- */

export const TYPES_JETON = valeurs(
  'VERIFICATION_EMAIL',
  'REINITIALISATION_MOT_DE_PASSE',
  'CHANGEMENT_EMAIL',
  'CONFIRMATION_SUPPRESSION',
);
export type TypeJeton = (typeof TYPES_JETON)[number];

/** Extension (prototype, contact.html) : objet d'un message envoyé à l'équipe. */
export const MOTIFS_CONTACT = valeurs(
  'QUESTION',
  'DONNEES',
  'SIGNALEMENT',
  'CONTESTATION',
  'AUTRE',
);
export type MotifContact = (typeof MOTIFS_CONTACT)[number];

export const STATUTS_MESSAGE_CONTACT = valeurs('NOUVEAU', 'EN_COURS', 'TRAITE');
export type StatutMessageContact = (typeof STATUTS_MESSAGE_CONTACT)[number];
