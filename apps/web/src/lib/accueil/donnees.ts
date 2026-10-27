import type { AccueilApi, OutilApi } from '@vysora/shared';

/* Données que l'accueil pose pour son script (prototype : data.js, remplacé par l'API). */

export interface DonneesAccueil {
  /** Null si l'API n'a pas répondu : la page garde ses textes, sans contenus. */
  accueil: AccueilApi | null;
  /** Catalogue de la sphère (prototype : tools). */
  outils: Pick<OutilApi, 'nom' | 'logo' | 'logoMonochrome' | 'famille'>[];
  maintenant: string;
}
