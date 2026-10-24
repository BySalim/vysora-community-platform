import type { CodeTypeVote } from '../enums';

/* Contrats des interactions sur un contenu (INT-01, S-01) :
   PUT et DELETE /api/v1/contenus/:id/votes/:type, PUT et DELETE /api/v1/contenus/:id/enregistrement. */

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
