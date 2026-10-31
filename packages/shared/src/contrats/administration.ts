import type { Role } from '../enums';
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
