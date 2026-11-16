import type { Request } from 'express';

/** Jeton du service qui relève les erreurs rendues par l'API pour la mesure d'audience (LEG-03).
    Facultatif : le filtre des erreurs fonctionne sans lui (tests unitaires). */
export const RELEVE_ERREURS = Symbol('RELEVE_ERREURS');

export interface ReleveErreurs {
  enregistrerErreurApi(requete: Request, statut: number, code: string): Promise<void>;
}
