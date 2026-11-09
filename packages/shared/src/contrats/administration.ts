import type {
  ActionDecisionAdministrateur,
  CategorieBadge,
  FamilleOutil,
  Role,
  StatutCompte,
  TonBadge,
  TypeDocumentLegal,
  TypeOutil,
} from '../enums';
import type { MembreResumeApi } from './creations';
import type { DecisionApi } from './moderation';
import type { BadgeObtenuApi } from './profil';

/** Membre tel que l'administration le présente pour gérer son rôle (EC-23, F-96). */
export interface MembreAdministreApi {
  membre: MembreResumeApi;
  role: Role;
  statutCompte: StatutCompte;
  dateInscription: string;
  /** SEC-02 : double authentification activée, commencée (clé affichée, jamais confirmée) ou absente. */
  deuxFacteurs: 'active' | 'en-attente' | 'absente';
  /** ADM-03 : compte créé par l'administration dont le lien d'activation n'a pas encore servi
      (ni mot de passe, ni adresse confirmée). */
  activationEnAttente: boolean;
}

/** GET /api/v1/admin/membres : l'équipe par défaut, ou les membres trouvés (vingt au plus). */
export interface ListeMembresAdministresApi {
  elements: MembreAdministreApi[];
  /** Administrateurs au compte actif (RG-111 : jamais moins d'un). */
  administrateursActifs: number;
}

/** GET /api/v1/admin/membres/:id : dossier d'un membre, avant une décision réservée aux
    administrateurs (RG-102 : bannir, ajuster la réputation, retirer un badge). */
export interface DossierMembreApi {
  membre: MembreAdministreApi;
  /** RG-83 : somme des mouvements de réputation, sans plancher (le site affiche au moins 0). */
  pointsReputation: number;
  badges: BadgeObtenuApi[];
  /** Fin de la suspension en cours (RG-103). */
  suspensionJusqua: string | null;
  /** Décisions qui ont visé le membre ou ses contenus, des plus récentes aux plus anciennes
      (cinquante au plus). */
  decisions: DecisionApi[];
  /** Décisions possibles (actionsAdministrateurPossibles) ; aucune sur son propre compte. */
  actions: ActionDecisionAdministrateur[];
  /** Le membre est l'administrateur qui consulte (RG-104). */
  soi: boolean;
}

/** Code d'invitation de la bêta fermée (INV-01), tel que l'administration le suit. */
export interface InvitationAdministreeApi {
  code: string;
  dateCreation: string;
  dateExpiration: string | null;
  createur: MembreResumeApi | null;
  /** Membre inscrit avec ce code et date de l'inscription ; null tant que le code est libre. */
  utilisation: { date: string; membre: MembreResumeApi | null } | null;
  /** Désactivé par l'administration (ADM-02) : refusé à l'inscription. */
  dateDesactivation: string | null;
  /** Ni utilisé, ni expiré, ni désactivé : seul un code libre se désactive. */
  libre: boolean;
}

/** GET /api/v1/admin/invitations : les plus récents d'abord. */
export interface ListeInvitationsApi {
  elements: InvitationAdministreeApi[];
  total: number;
  libres: number;
  page: number;
  pages: number;
}

/** GET /api/v1/admin/decisions : journal des décisions de modération (EC-21, F-92). */
export interface JournalDecisionsApi {
  /** De la plus récente à la plus ancienne, vingt par page. */
  elements: DecisionApi[];
  total: number;
  page: number;
  pages: number;
}

/** Action inscrite au journal d'audit (ENF-09). */
export interface EntreeAuditApi {
  id: number;
  date: string;
  /** Une action d'ACTIONS_AUDIT. */
  action: string;
  acteur: MembreResumeApi | null;
  /** Élément visé : un membre (présenté), ou un élément d'un référentiel, un défi, une version d'un
      document légal, avec son nom s'il existe encore ; null pour des codes d'invitation. */
  cible: {
    type: string;
    id: number | null;
    nom: string | null;
    membre: MembreResumeApi | null;
  } | null;
  /** Ce que l'action a changé, tel qu'il a été inscrit (rôle avant et après, nombre de codes…). */
  details: Record<string, unknown> | null;
}

/** GET /api/v1/admin/journal : de la plus récente à la plus ancienne, vingt par page. */
export interface JournalAuditApi {
  elements: EntreeAuditApi[];
  total: number;
  page: number;
  pages: number;
}

/** Défi tel que l'administration le gère (EC-24). */
export interface DefiAdministreApi {
  id: number;
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string | null;
  dateDebut: string;
  dateFin: string;
  statut: 'BROUILLON' | 'PUBLIE' | 'CLOTURE' | 'ANNULE';
  participations: number;
  /** Actions possibles dans l'état du défi (RG-73). */
  actions: ('publier' | 'annuler' | 'cloturer')[];
}

/** Éditeur d'outils et de modèles d'IA tel que l'administration le gère (EC-22, F-95, RG-110). */
export interface EditeurAdministreApi {
  id: number;
  nom: string;
  /** Proposé à la saisie d'un nouvel outil ; archivé, ses outils et modèles l'ont été avec lui. */
  actif: boolean;
  /** Ses outils, proposés d'abord, chacun par ordre alphabétique. */
  outils: { id: number; nom: string; statut: 'ACTIF' | 'ARCHIVE' }[];
  /** Ses modèles, et ceux encore proposés. */
  modeles: number;
  modelesProposes: number;
}

/** Outil du référentiel tel que l'administration le gère (EC-22, F-95, RG-110). */
export interface OutilAdministreApi {
  id: number;
  nom: string;
  slug: string;
  editeurId: number;
  editeur: string;
  /** Un outil d'un éditeur archivé ne se propose de nouveau qu'avec son éditeur. */
  editeurActif: boolean;
  type: TypeOutil;
  famille: FamilleOutil;
  logo: string | null;
  logoMonochrome: boolean;
  statut: 'ACTIF' | 'ARCHIVE';
  /** Contenus qui citent l'outil (créations, sujets, cas, essais) : il s'archive, il ne se supprime pas. */
  utilisations: number;
  modeles: {
    id: number;
    nom: string;
    nomCourt: string;
    dateSortie: string | null;
    statut: 'DISPONIBLE' | 'RETIRE';
  }[];
}

/** Catégorie (domaine) telle que l'administration la gère (EC-22, RG-110). */
export interface CategorieAdministreeApi {
  id: number;
  libelle: string;
  /** Adresse de la page du domaine (/categories/[slug]) : fixée à la création. */
  slug: string;
  icone: string | null;
  description: string | null;
  active: boolean;
  /** Créations, guides et cas du domaine. */
  utilisations: number;
}

/** Licence telle que l'administration la gère (EC-22, F-17, CI-26, RG-110). */
export interface LicenceAdministreeApi {
  id: number;
  code: string;
  libelle: string;
  resume: string | null;
  url: string;
  autoriseVariantes: boolean;
  /** Exactement une licence par défaut, toujours proposée (CI-26). */
  parDefaut: boolean;
  active: boolean;
  /** Créations sous cette licence, brouillons compris. */
  utilisations: number;
}

/** Étiquette telle que l'administration la gère : les membres les créent en les saisissant (CI-04). */
export interface EtiquetteAdministreeApi {
  id: number;
  libelle: string;
  slug: string;
  active: boolean;
  /** Contenus étiquetés (créations, sujets, cas). */
  utilisations: number;
}

/** GET /api/v1/admin/etiquettes : les plus utilisées d'abord, cinquante par page. */
export interface ListeEtiquettesAdministreesApi {
  elements: EtiquetteAdministreeApi[];
  total: number;
  page: number;
  pages: number;
  /** Sur tout le référentiel, quels que soient les filtres. */
  proposees: number;
  archivees: number;
}

/** Badge tel que l'administration le gère (RG-86) : ses critères sont fixés par les règles. */
export interface BadgeAdministreApi {
  id: number;
  code: string;
  libelle: string;
  critere: string;
  categorie: CategorieBadge;
  icone: string;
  ton: TonBadge;
  /** Encore attribuable ; un badge arrêté reste affiché chez les membres qui l'ont obtenu. */
  actif: boolean;
  obtentions: number;
}

/** Version d'un document légal telle que l'administration la suit (EC-25, RG-112). */
export interface VersionDocumentAdministreeApi {
  id: number;
  /** AAAA-MM-JJ, la date d'effet des versions publiées depuis l'administration. */
  version: string;
  dateEffet: string;
  resumeChangements: string | null;
  etat: 'a-venir' | 'en-vigueur' | 'remplacee';
  /** RG-90 : e-mail aux membres envoyé à la date d'effet ; null tant qu'il n'est pas parti. */
  dateAnnonce: string | null;
  /** Membres qui ont accepté cette version (RG-03). */
  acceptations: number;
  /** Une version à venir, jamais annoncée ni acceptée, se retire (erreur de saisie). */
  retirable: boolean;
}

/** GET /api/v1/admin/documents-legaux : chaque document et ses versions, la plus récente d'abord. */
export interface DocumentLegalAdministreApi {
  type: TypeDocumentLegal;
  /** Page du site qui porte le texte du document. */
  url: string;
  /** La politique de confidentialité informe ; les conditions et la charte s'acceptent. */
  acceptationRequise: boolean;
  versions: VersionDocumentAdministreeApi[];
}
