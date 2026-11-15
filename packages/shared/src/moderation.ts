import type {
  ActionDecision,
  ActionDecisionAdministrateur,
  ActionDecisionModerateur,
  AvertissementAgent,
  MotifSignalement,
  Role,
  StatutCompte,
  StatutContenu,
  StatutSignalement,
  TypeContenu,
} from './enums';
import { NIVEAUX, SEUILS, niveauPourReputation, type DefinitionNiveau } from './regles';

/* Modération (F-90 à F-93) : libellés des motifs et des actions, décisions possibles sur un contenu,
   règle de clôture des signalements et seuil du masquage automatique, que l'API applique et que les
   écrans de la modération (MOD-02) annoncent. */

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

/** État d'un contenu qui décide des mesures possibles. */
export interface EtatContenuModere {
  type: TypeContenu;
  statut: StatutContenu;
  /** Créations seulement (null sinon). */
  avertissementAgent: AvertissementAgent | null;
  /** F-93 : date du masquage automatique qui attend l'examen d'un modérateur ; null sinon. */
  masquageAutomatique?: string | null;
}

/** RG-102 et RG-23 : décisions qu'un modérateur peut prendre sur un contenu dans son état. On ne
    masque pas un contenu masqué, on ne rétablit qu'un contenu masqué ; l'avertissement
    « instructions pour agent » concerne les créations : la modération l'ajoute s'il n'est pas déjà
    le sien et retire celui qui est posé. Plus aucune décision sur un contenu supprimé. F-93 : un
    contenu masqué automatiquement attend d'abord l'examen d'un modérateur, qui confirme le masquage
    (« masquer »), rétablit ou supprime le contenu ; les autres mesures viennent ensuite. */
export function actionsPossibles(contenu: EtatContenuModere): ActionDecisionModerateur[] {
  if (contenu.statut === 'SUPPRIME') return [];
  if (contenu.statut === 'MASQUE' && contenu.masquageAutomatique)
    return ['MASQUER', 'RETABLIR', 'SUPPRIMER'];
  const masque = contenu.statut === 'MASQUE';
  const creation = contenu.type === 'CREATION';
  const avertissement = contenu.avertissementAgent ?? 'AUCUN';
  return [
    'AUCUNE',
    ...(masque ? (['RETABLIR'] as const) : (['MASQUER'] as const)),
    'SUPPRIMER',
    'AVERTIR',
    'SUSPENDRE',
    ...(creation && avertissement !== 'MODERATION'
      ? (['AJOUTER_AVERTISSEMENT_AGENT'] as const)
      : []),
    ...(creation && avertissement !== 'AUCUN' ? (['RETIRER_AVERTISSEMENT_AGENT'] as const) : []),
  ];
}

/** Membre qui a signalé un contenu, tel que le masquage automatique le considère. */
export interface SignaleurPourMasquage {
  role: Role;
  /** Somme de ses mouvements de réputation (RG-83). */
  reputation: number;
}

/** RG-101 et RG-85 : le signalement de ce membre compte pour le masquage automatique s'il a atteint
    le niveau Apprenti (privilège du niveau) ; les modérateurs et les administrateurs échappent aux
    limites des niveaux. */
export function compteDansMasquageAutomatique(
  signaleur: SignaleurPourMasquage,
  niveaux: readonly DefinitionNiveau[] = NIVEAUX,
): boolean {
  if (signaleur.role !== 'MEMBRE') return true;
  return niveauPourReputation(signaleur.reputation, niveaux).compteDansMasquageAutomatique;
}

/** RG-101 : un contenu est masqué automatiquement quand ses signalements ouverts viennent d'au
    moins trois membres distincts dont le signalement compte (un signalement ouvert par membre et
    par contenu, CI-21). */
export function masquageAutomatiqueAtteint(
  signaleurs: readonly SignaleurPourMasquage[],
  niveaux: readonly DefinitionNiveau[] = NIVEAUX,
): boolean {
  const comptent = signaleurs.filter((s) => compteDansMasquageAutomatique(s, niveaux)).length;
  return comptent >= SEUILS.signalementsPourMasquageAutomatique;
}

/** Ce qui décide des mesures qu'un administrateur peut prendre sur un membre. */
export interface EtatMembreSanctionne {
  /** Le membre est l'administrateur lui-même (RG-104, CI-19). */
  soi: boolean;
  statutCompte: StatutCompte;
  /** Badges que le membre a obtenus. */
  badges: number;
}

/** RG-102, RG-103, RG-104 : décisions qu'un administrateur peut prendre sur un membre. Aucune sur son
    propre compte, ni sur un compte banni ou supprimé ; le bannissement ferme un compte actif (un
    compte en cours de suppression est fermé au trentième jour) ; un badge se retire s'il a été
    obtenu. */
export function actionsAdministrateurPossibles(
  membre: EtatMembreSanctionne,
): ActionDecisionAdministrateur[] {
  if (membre.soi || membre.statutCompte === 'BANNI' || membre.statutCompte === 'SUPPRIME')
    return [];
  return [
    ...(membre.statutCompte === 'ACTIF' ? (['BANNIR'] as const) : []),
    'AJUSTER_REPUTATION',
    ...(membre.badges > 0 ? (['RETIRER_BADGE'] as const) : []),
  ];
}
