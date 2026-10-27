import type { ProfilApi } from '@vysora/shared';

/* Données que la page du profil pose pour son script (prototype : profil-data.js, remplacé par l'API). */

export interface DonneesProfil {
  profil: ProfilApi;
  /** Propriétaire hors aperçu public. */
  prive: boolean;
  apercu: boolean;
  maintenant: string;
}
