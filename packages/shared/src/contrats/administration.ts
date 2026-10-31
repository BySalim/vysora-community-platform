import type {
  CategorieBadge,
  FamilleOutil,
  Role,
  TonBadge,
  TypeDocumentLegal,
  TypeOutil,
} from '../enums';
import type { MembreResumeApi } from './creations';
import type { DecisionApi } from './moderation';

/** Membre tel que l'administration le présente pour gérer son rôle (EC-23, F-96). */
export interface MembreAdministreApi {
  membre: MembreResumeApi;
  role: Role;
  statutCompte: string;
  dateInscription: string;
  /** SEC-02 : double authentification activée, commencée (clé affichée, jamais confirmée) ou absente. */
  deuxFacteurs: 'active' | 'en-attente' | 'absente';
}

/** GET /api/v1/admin/membres : l'équipe par défaut, ou les membres trouvés (vingt au plus). */
export interface ListeMembresAdministresApi {
  elements: MembreAdministreApi[];
  /** Administrateurs au compte actif (RG-111 : jamais moins d'un). */
  administrateursActifs: number;
}

/** Code d'invitation de la bêta fermée (INV-01), tel que l'administration le suit. */
export interface InvitationAdministreeApi {
  code: string;
  dateCreation: string;
  dateExpiration: string | null;
  createur: MembreResumeApi | null;
  /** Membre inscrit avec ce code et date de l'inscription ; null tant que le code est libre. */
  utilisation: { date: string; membre: MembreResumeApi | null } | null;
  /** Ni utilisé ni expiré. */
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

/** Outil du référentiel tel que l'administration le gère (EC-22, F-95, RG-110). */
export interface OutilAdministreApi {
  id: number;
  nom: string;
  slug: string;
  editeur: string;
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
