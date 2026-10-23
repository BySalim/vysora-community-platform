import type { CodeErreur, RaisonRefus } from '@vysora/shared';

/* Erreurs applicatives : un service lève une ErreurApplication ; le filtre HTTP la traduit
   en réponse « problem details » (RFC 9457) avec le statut correspondant. */

export const STATUT_HTTP: Record<CodeErreur, number> = {
  VALIDATION: 400,
  NON_AUTHENTIFIE: 401,
  IDENTIFIANTS_INCORRECTS: 401,
  INTERDIT: 403,
  ORIGINE_REFUSEE: 403,
  INTROUVABLE: 404,
  CONFLIT: 409,
  LIMITE_ATTEINTE: 429,
  TROP_DE_REQUETES: 429,
  ERREUR_INTERNE: 500,
};

/** Résumés affichables tels quels (vouvoiement, sans jargon). */
export const TITRE_ERREUR: Record<CodeErreur, string> = {
  VALIDATION: 'Certaines informations sont à corriger.',
  NON_AUTHENTIFIE: 'Connectez-vous pour continuer.',
  IDENTIFIANTS_INCORRECTS: 'Adresse e-mail ou mot de passe incorrect.',
  INTERDIT: 'Cette action ne vous est pas permise.',
  ORIGINE_REFUSEE: 'Cette requête a été refusée.',
  INTROUVABLE: 'Ce contenu est introuvable.',
  CONFLIT: 'Cette action n’est plus possible dans l’état actuel.',
  LIMITE_ATTEINTE: 'Vous avez atteint votre limite pour le moment.',
  TROP_DE_REQUETES: 'Trop de tentatives. Réessayez dans quelques minutes.',
  ERREUR_INTERNE: 'Une erreur est survenue de notre côté. Réessayez dans un instant.',
};

/** Membres d'extension de la réponse (RFC 9457, section 3.2). */
export interface ExtensionsProbleme {
  /** Action refusée : raison à présenter (raisonRefus). */
  raison?: RaisonRefus;
  /** Tentatives temporisées : secondes à attendre (repris dans l'en-tête Retry-After). */
  reessayerDans?: number;
}

export class ErreurApplication extends Error {
  constructor(
    readonly code: CodeErreur,
    readonly detail?: string,
    readonly erreurs?: Record<string, string>,
    readonly extensions: ExtensionsProbleme = {},
  ) {
    super(detail ?? TITRE_ERREUR[code]);
    this.name = 'ErreurApplication';
  }
}

export const erreurValidation = (erreurs: Record<string, string>, detail?: string) =>
  new ErreurApplication('VALIDATION', detail, erreurs);
export const introuvable = (detail?: string) => new ErreurApplication('INTROUVABLE', detail);
export const interdit = (detail?: string) => new ErreurApplication('INTERDIT', detail);
export const conflit = (detail?: string, erreurs?: Record<string, string>) =>
  new ErreurApplication('CONFLIT', detail, erreurs);

/** Violation d'unicité PostgreSQL (23505), éventuellement sur une contrainte précise. */
export function estViolationUnicite(erreur: unknown, contrainte?: string): boolean {
  const candidats = [erreur, (erreur as { cause?: unknown })?.cause];
  return candidats.some((e) => {
    const pg = e as { code?: string; constraint?: string } | undefined;
    return pg?.code === '23505' && (!contrainte || pg.constraint === contrainte);
  });
}
