import type { CodeNiveau } from '../regles';
import type { Role } from '../enums';
import type { ServiceExterne } from '../services-externes';
import type { PreferencesNotificationsApi } from './notifications';

/* Contrats de la page Paramètres (PARAM-01, EC-17 ; F-06, F-07, F-08) : GET /api/v1/moi/parametres
   et les routes qui modifient le compte. Chaque modification renvoie les paramètres à jour. */

/** Appareil où le compte est ouvert : une session (ADR-0005). */
export interface AppareilApi {
  /** Désigne la session sans révéler son identifiant. */
  cle: string;
  /** « Chrome sur Windows » ; null si le navigateur n'a pas été reconnu. */
  nom: string | null;
  telephone: boolean;
  /** Ville et pays, si connus (R-07). */
  lieu: string | null;
  /** Session de la requête en cours (« Cet appareil »). */
  actuel: boolean;
  /** ISO 8601 */
  derniereActivite: string;
}

/** F-07 : nombre d'éléments de chaque partie du fichier d'export. */
export interface ContenuExportApi {
  documents: number;
  creations: number;
  /** Sujets, réponses et commentaires. */
  messages: number;
  essais: number;
  /** Cas proposés et réponses aux cas. */
  cas: number;
  votes: number;
  enregistrements: number;
  badges: number;
  mouvements: number;
  /** Explorer (DEC-01) : listes de contrôle, pièges signalés et objectifs cherchés. */
  explorer: number;
}

/** F-07, WF-22 : aucune demande, préparation (EN_COURS), fichier prêt (7 jours), lien expiré. */
export type EtatExport = 'AUCUN' | 'PREPARATION' | 'PRET' | 'EXPIRE';

export interface ExportApi {
  etat: EtatExport;
  /** ISO 8601 */
  dateDemande: string | null;
  /** Fin de validité du lien de téléchargement (prêt) ou date à laquelle il a expiré. */
  expiration: string | null;
  /** « vysora-clarisse-mendy-2026-10-27.json » */
  nomFichier: string;
  contenu: ContenuExportApi;
}

/** Compte GitHub ou Google lié pour la connexion (F-02, S-10). */
export interface CompteExterneApi {
  service: ServiceExterne;
  /** Identifiant GitHub ou adresse Google, tels que le service les a donnés à la liaison. */
  nom: string | null;
  /** ISO 8601 */
  dateLiaison: string;
}

/** Réponse de GET /api/v1/moi/parametres. */
export interface ParametresApi {
  pseudo: string;
  /** Nom affiché ; à défaut, le pseudo. */
  nom: string;
  email: string;
  emailVerifie: boolean;
  /** Nouvelle adresse en attente de confirmation et envoi du lien (ISO 8601). */
  changementEmail: { email: string; envoyeLe: string } | null;
  fuseauHoraire: string;
  role: Role;
  niveau: { code: CodeNiveau; libelle: string };
  points: number;
  /** ISO 8601 */
  dateInscription: string;
  /** Dernier changement du mot de passe ; null s'il date de l'inscription. */
  motDePasseModifieLe: string | null;
  /** Faux pour un compte créé avec GitHub ou Google qui n'a pas encore défini de mot de passe. */
  motDePasse: boolean;
  /** Services ouverts à la liaison (configurés sur ce serveur). */
  servicesOuverts: ServiceExterne[];
  comptesExternes: CompteExterneApi[];
  appareils: AppareilApi[];
  notifications: PreferencesNotificationsApi;
  export: ExportApi;
  /** Créations publiées : la demande de suppression propose de les garder ou de les supprimer. */
  creationsPubliees: number;
}

/** Réponse de POST /api/v1/moi/suppression (F-08, WF-23). */
export interface SuppressionDemandeeApi {
  /** Date (ISO 8601) à laquelle les données seront effacées, faute de reconnexion d'ici là. */
  dateEffacement: string;
  supprimerCreations: boolean;
}

/** Réponse de POST /api/v1/comptes/email/confirmation : nouvelle adresse du compte. */
export interface EmailConfirmeApi {
  email: string;
}
