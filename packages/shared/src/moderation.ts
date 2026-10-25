import type { ActionDecision, MotifSignalement, StatutSignalement } from './enums';

/* Modération (F-90 à F-92) : libellés des motifs et des actions, et règle de clôture des
   signalements, que l'API applique et que les écrans de la modération (MOD-02) annonceront. */

/** RG-100 : motifs proposés au membre qui signale, dans l'ordre de la charte communautaire. */
export const LIBELLES_MOTIF_SIGNALEMENT: Record<MotifSignalement, string> = {
  SPAM: 'Spam',
  ILLICITE: 'Contenu illicite',
  DANGEREUX: 'Contenu dangereux',
  DONNEES_PERSONNELLES: 'Données personnelles',
  PLAGIAT: 'Plagiat',
  HARCELEMENT: 'Harcèlement',
  HORS_SUJET: 'Hors sujet',
  AUTRE: 'Autre',
};

export const LIBELLES_ACTION_DECISION: Record<ActionDecision, string> = {
  AUCUNE: 'Aucune mesure',
  MASQUER: 'Masquer le contenu',
  RETABLIR: 'Rétablir le contenu',
  SUPPRIMER: 'Supprimer le contenu',
  AVERTIR: 'Avertir l’auteur',
  SUSPENDRE: 'Suspendre l’auteur',
  AJOUTER_AVERTISSEMENT_AGENT: 'Ajouter l’avertissement « instructions pour agent »',
  RETIRER_AVERTISSEMENT_AGENT: 'Retirer l’avertissement « instructions pour agent »',
  BANNIR: 'Bannir le compte',
  AJUSTER_REPUTATION: 'Ajuster la réputation',
  RETIRER_BADGE: 'Retirer un badge',
};

/** RG-102 : une décision « aucune » ou « rétablir » clôt les signalements ouverts du contenu comme
    non fondés ; toute autre action les clôt comme fondés (CV-06). */
export function issueDesSignalements(action: ActionDecision): Exclude<StatutSignalement, 'OUVERT'> {
  return action === 'AUCUNE' || action === 'RETABLIR' ? 'NON_FONDE' : 'FONDE';
}
