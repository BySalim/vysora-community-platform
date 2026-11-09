import type { TypeDocumentLegal } from '../enums';
import type { EtatVisiteur } from '../permissions';
import type { ServiceExterne } from '../services-externes';

/* Contrats de la session (ADR-0005) : GET, POST et DELETE /api/v1/session, POST /api/v1/comptes,
   PATCH /api/v1/moi et les vérifications de disponibilité de l'inscription. */

/** Membre connecté, tel que l'en-tête et le menu du compte l'affichent. */
export interface MembreConnecte {
  id: number;
  pseudo: string;
  /** Nom affiché (« Clarisse Mendy ») ; à défaut, le pseudo. */
  nom: string;
  /** Réputation (RG-83). */
  points: number;
  avatar: string | null;
}

/** Personne qui consulte, vue par l'interface (prototype/etats.js). */
export interface SessionApi {
  etat: EtatVisiteur;
  membre: MembreConnecte | null;
  /** Notifications non lues (pastille de l'en-tête). */
  nonLues: number;
  /** Fin de la suspension en cours (ISO 8601) si le compte est suspendu. */
  suspensionJusqua: string | null;
  /** Date d'effet (AAAA-MM-JJ) des documents légaux qui restent à accepter. */
  conditionsDepuis: string | null;
  /** ENF-05, SEC-02 : compte de modération ou d'administration dont la session n'a pas encore
      confirmé l'identité. « verifier » : saisir un code ; « configurer » : activer la double
      authentification. Tant que ce n'est pas fait, la session agit comme celle d'un membre ;
      `role` est celui que la vérification donnera. */
  deuxFacteurs?: { etape: 'verifier' | 'configurer'; role: 'moderateur' | 'admin' };
}

/** Réponse de POST /api/v1/session. */
export interface ConnexionReussie extends SessionApi {
  /** WF-23 : la connexion a annulé la demande de suppression du compte faite à cette date (ISO 8601). */
  suppressionAnnulee: string | null;
}

/** Réponse de GET /api/v1/pseudos/:pseudo/disponibilite. */
export interface DisponibilitePseudo {
  pseudo: string;
  disponible: boolean;
  motif: 'format' | 'reserve' | 'pris' | null;
  /** Variantes libres, proposées quand le pseudo ne l'est pas. */
  propositions: string[];
}

/** Réponse de POST /api/v1/comptes/disponibilite. */
export interface DisponibiliteEmail {
  disponible: boolean;
}

/** Réponse de POST /api/v1/comptes/verification/renvoi : adresse à laquelle le nouveau lien est parti. */
export interface LienEnvoye {
  email: string;
}

/** Réponse de POST /api/v1/mot-de-passe/lien : compte concerné par un lien de réinitialisation valable. */
export interface LienReinitialisation {
  email: string;
  /** ADM-03 : lien d'activation d'un compte de l'équipe (premier mot de passe, documents acceptés). */
  activation: boolean;
}

/** Version en vigueur d'un document légal (GET /api/v1/documents-legaux). */
export interface DocumentLegalApi {
  type: TypeDocumentLegal;
  version: string;
  /** AAAA-MM-JJ */
  dateEffet: string;
  url: string;
  acceptationRequise: boolean;
  resumeChangements: string | null;
  /** RG-03 : vrai si le membre connecté doit encore accepter cette version (faux sans session). */
  aAccepter: boolean;
}

/** GET /api/v1/inscription : conditions de l'inscription (INV-01). */
export interface ConditionsInscriptionApi {
  /** Bêta fermée : un code d'invitation est exigé. */
  surInvitation: boolean;
}

/** GET /api/v1/services-externes : services avec lesquels on se connecte sur ce serveur (F-02,
    S-10) ; un service sans identifiants configurés n'y figure pas. */
export interface ServicesExternesApi {
  ouverts: ServiceExterne[];
}

/** GET /api/v1/invitations/:code : lien d'invitation reçu (« Claire Dubois vous invite »). */
export interface InvitationApi {
  valable: boolean;
  /** Membre qui a créé l'invitation, s'il existe encore. */
  par: { nom: string; avatar: string | null } | null;
}

/** POST /api/v1/session/deux-facteurs/configuration : clé à saisir dans l'application. */
export interface ConfigurationDeuxFacteursApi {
  /** Clé en base32, à saisir à la main si le QR code ne peut pas être lu. */
  cle: string;
  /** Adresse otpauth://, contenue dans le QR code. */
  adresse: string;
}

/** PUT /api/v1/session/deux-facteurs/configuration : codes de secours, montrés une seule fois. */
export interface ActivationDeuxFacteursApi {
  codesSecours: string[];
  session: SessionApi;
}
