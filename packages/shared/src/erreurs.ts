import type { RaisonRefus } from './permissions';

/* Format des erreurs renvoyées par l'API : « problem details » (RFC 9457),
   avec un code stable et, pour une saisie invalide, le message de chaque champ. */

export const CODES_ERREUR = [
  'VALIDATION',
  'NON_AUTHENTIFIE',
  'IDENTIFIANTS_INCORRECTS',
  'INTERDIT',
  'INTROUVABLE',
  'CONFLIT',
  'LIMITE_ATTEINTE',
  'TROP_DE_REQUETES',
  'ORIGINE_REFUSEE',
  'ERREUR_INTERNE',
] as const;
export type CodeErreur = (typeof CODES_ERREUR)[number];

export interface ProblemeApi {
  /** URI du type de problème : urn:vysora:probleme:<code en minuscules>. */
  type: string;
  /** Résumé lisible, affichable tel quel. */
  title: string;
  status: number;
  code: CodeErreur;
  detail?: string;
  /** Saisie invalide : message par champ (chemin pointé, par exemple « etapes.0.titre »). */
  erreurs?: Record<string, string>;
  /** Trop de tentatives : secondes à attendre avant de réessayer (aussi dans l'en-tête Retry-After). */
  reessayerDans?: number;
  /** Action refusée : raison à présenter (connexion, e-mail à vérifier, conditions, suspension…). */
  raison?: RaisonRefus;
}

/** Informations complémentaires d'une erreur, reprises telles quelles dans la réponse. */
export type ComplementsProbleme = Pick<ProblemeApi, 'reessayerDans' | 'raison'>;

export const typeProbleme = (code: CodeErreur) => `urn:vysora:probleme:${code.toLowerCase()}`;

export function estProblemeApi(valeur: unknown): valeur is ProblemeApi {
  return (
    typeof valeur === 'object' &&
    valeur !== null &&
    typeof (valeur as ProblemeApi).code === 'string' &&
    typeof (valeur as ProblemeApi).status === 'number'
  );
}
