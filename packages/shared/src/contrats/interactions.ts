import type { CodeTypeVote } from '../enums';
import type { RetourReproductionApi } from './creations';

/* Contrats des interactions sur un contenu (INT-01, INT-02, S-01) :
   PUT et DELETE /api/v1/contenus/:id/votes/:type, PUT et DELETE /api/v1/contenus/:id/enregistrement,
   POST /api/v1/creations/:id/reproductions. */

/** Vote après l'action : nombre de votes de ce type sur le contenu et vote de la personne. */
export interface VoteApi {
  type: CodeTypeVote;
  nombre: number;
  aVote: boolean;
}

/** RG-45 : le contenu figure-t-il dans la liste « Enregistrés » du membre ? */
export interface EnregistrementApi {
  enregistre: boolean;
}

/** Reproduction déclarée (F-32) et indicateurs de preuve de la création, mis à jour (F-33). */
export interface ReproductionDeclareeApi {
  reproduction: RetourReproductionApi;
  total: number;
  reussies: number;
  /** RG-43 : à partir de 3 reproductions ; null en dessous. */
  tauxSucces: number | null;
}
