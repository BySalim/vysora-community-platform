import type { EtatVisiteur } from '../permissions';

/* Contrats de la session (ADR-0005) : GET, POST et DELETE /api/v1/session, POST /api/v1/comptes. */

/** Membre connecté, tel que l'en-tête et les écrans du compte le présentent. */
export interface MembreConnecte {
  id: number;
  pseudo: string;
  /** Adresse du compte : jamais publique, montrée seulement à son titulaire. */
  email: string;
  /** Réputation (RG-83), plancher à 0. */
  points: number;
  /** Adresse de la photo de profil, ou null pour l'avatar par défaut. */
  avatar: string | null;
  /** Fin de la suspension en cours (ISO 8601), si le compte est suspendu (F-91). */
  suspenduJusqua: string | null;
}

/** Personne qui consulte : un visiteur (membre à null) ou un membre et l'état de son compte. */
export interface SessionApi {
  etat: EtatVisiteur;
  membre: MembreConnecte | null;
  /** Notifications non lues (pastille de l'en-tête). */
  nonLues: number;
}

/** GET /api/v1/disponibilites/pseudo?valeur=… */
export interface DisponibilitePseudo {
  disponible: boolean;
  /** Pseudos libres proches, proposés quand celui demandé est pris (3 au plus). */
  propositions: string[];
}

/** POST /api/v1/disponibilites/email */
export interface DisponibiliteEmail {
  disponible: boolean;
}
