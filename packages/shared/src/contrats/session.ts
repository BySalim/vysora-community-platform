import type { TypeDocumentLegal } from '../enums';
import type { EtatVisiteur } from '../permissions';

/* Contrats de la session (ADR-0005) : GET, POST et DELETE /api/v1/session, POST /api/v1/comptes,
   PATCH /api/v1/moi et les vérifications de disponibilité de l'inscription. */

/** Membre connecté, tel que l'en-tête et le menu du compte l'affichent. */
export interface MembreConnecte {
  id: number;
  pseudo: string;
  /** Nom affiché : le pseudo, faute de nom distinct dans le MCD. */
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
