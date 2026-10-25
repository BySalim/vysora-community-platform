/* Écrans de la modération (MOD-02, EC-19) : ce que la file et le dossier d'un contenu affichent
   (nature du contenu, page où il se lit, ancienneté, effet de chaque décision). Les règles viennent
   de l'API et de @vysora/shared (actionsPossibles, issueDesSignalements). */

import {
  DELAIS,
  issueDesSignalements,
  type ActionDecisionModerateur,
  type PageDuContenuApi,
  type StatutSignalement,
  type TypeContenu,
} from '@vysora/shared';
import { ROUTES } from './navigation';
import { dateLongue, fmt, pluriel } from './texte';

export const LIBELLES_TYPE_CONTENU: Record<TypeContenu, string> = {
  CREATION: 'Création',
  COMMENTAIRE: 'Commentaire',
  REPRODUCTION: 'Essai',
  SUJET: 'Sujet du forum',
  MESSAGE: 'Réponse du forum',
  CAS_BON_REFLEXE: 'Cas Bon réflexe',
};

export const ICONES_TYPE_CONTENU: Record<TypeContenu, string> = {
  CREATION: 'layers',
  COMMENTAIRE: 'message',
  REPRODUCTION: 'repeat',
  SUJET: 'help',
  MESSAGE: 'reply',
  CAS_BON_REFLEXE: 'bulb',
};

/** Titre du dossier d'un contenu sans titre propre, dont le texte entier suit (le début du texte
    sert d'intitulé dans la file). */
export const TITRES_DOSSIER: Partial<Record<TypeContenu, string>> = {
  COMMENTAIRE: 'Commentaire sur une création',
  REPRODUCTION: 'Essai déclaré sur une création',
  MESSAGE: 'Réponse dans le forum',
};

/** Titre de la section qui donne le texte entier d'un contenu sans page propre. */
export const TITRES_TEXTE: Partial<Record<TypeContenu, string>> = {
  COMMENTAIRE: 'Texte du commentaire',
  REPRODUCTION: 'Retour de l’essai',
  SUJET: 'Texte du sujet',
  MESSAGE: 'Texte de la réponse',
};

/** Page où le contenu se lit ; null tant que cette page n'est pas portée (forum, cas). */
export function adresseDuContenu(page: PageDuContenuApi | null): string | null {
  if (page?.genre !== 'CREATION') return null;
  return `${ROUTES.creation(page.id, page.slug)}${page.ancre ? `#${page.ancre}` : ''}`;
}

/** Libellé du lien vers la page du contenu. */
export function lienDuContenu(type: TypeContenu): string {
  return type === 'CREATION' ? 'Voir la création' : 'Voir sur la fiche de la création';
}

/** Temps écoulé depuis une date, pour l'attente d'un contenu dans la file : « 25 min », « 5 h »,
    « 3 jours ». */
export function anciennete(depuis: string, maintenant = new Date()): string {
  const minutes = Math.floor((maintenant.getTime() - new Date(depuis).getTime()) / 60_000);
  if (minutes < 60) return `${fmt(Math.max(1, minutes))} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 48) return `${fmt(heures)} h`;
  return pluriel(Math.floor(heures / 24), 'jour', 'jours');
}

/** RG-105 : délai cible de traitement, en toutes lettres. */
export const DELAI_CIBLE = `${DELAIS.traitementSignalementHeures} heures`;

export const LIBELLES_STATUT_SIGNALEMENT: Record<StatutSignalement, string> = {
  OUVERT: 'Ouvert',
  FONDE: 'Fondé',
  NON_FONDE: 'Non fondé',
};

/** Ce que chaque décision change, annoncé dans le formulaire (RG-102, RG-103, RG-23, RG-82). */
export const EFFETS_ACTION: Record<ActionDecisionModerateur, string> = {
  AUCUNE: 'Le contenu reste tel quel ; l’auteur n’est pas prévenu.',
  MASQUER:
    'Seuls l’auteur et la modération le voient encore et ses points sont retirés. L’auteur peut le corriger pour demander un nouvel examen.',
  RETABLIR: 'Le contenu redevient visible de tous et ses points sont rendus.',
  SUPPRIMER:
    'Le contenu disparaît du site, ses images sont effacées et ses points retirés. Cette mesure est définitive.',
  AVERTIR: 'L’auteur reçoit un avertissement ; le contenu reste tel quel.',
  SUSPENDRE:
    'L’auteur garde la lecture et ses paramètres, mais ne peut plus publier ni interagir pendant la durée choisie.',
  AJOUTER_AVERTISSEMENT_AGENT:
    'La fiche avertit que le contenu donne des instructions à un agent ; seule la modération pourra retirer l’avertissement.',
  RETIRER_AVERTISSEMENT_AGENT: 'La fiche n’affiche plus l’avertissement.',
};

/** Les actions sur le contenu viennent avant celles qui visent son auteur (CI-19). */
export const GROUPES_ACTIONS: { titre: string; actions: ActionDecisionModerateur[] }[] = [
  {
    titre: 'Le contenu',
    actions: [
      'AUCUNE',
      'MASQUER',
      'RETABLIR',
      'SUPPRIMER',
      'AJOUTER_AVERTISSEMENT_AGENT',
      'RETIRER_AVERTISSEMENT_AGENT',
    ],
  },
  { titre: 'Son auteur', actions: ['AVERTIR', 'SUSPENDRE'] },
];

/** Titre de la fenêtre de confirmation (une décision se confirme, plan du site, section 13). */
export const QUESTIONS_ACTION: Record<ActionDecisionModerateur, string> = {
  AUCUNE: 'Ne prendre aucune mesure ?',
  MASQUER: 'Masquer ce contenu ?',
  RETABLIR: 'Rétablir ce contenu ?',
  SUPPRIMER: 'Supprimer ce contenu ?',
  AVERTIR: 'Avertir l’auteur ?',
  SUSPENDRE: 'Suspendre l’auteur ?',
  AJOUTER_AVERTISSEMENT_AGENT: 'Ajouter l’avertissement ?',
  RETIRER_AVERTISSEMENT_AGENT: 'Retirer l’avertissement ?',
};

/** Texte de la fenêtre de confirmation : durée d'une suspension, issue des signalements, e-mail
    à l'auteur (F-92 : rien pour « aucune mesure »), décision immuable (RG-102). */
export function confirmationDecision(
  action: ActionDecisionModerateur,
  ouverts: number,
  finSuspension: Date | null,
): string {
  return [
    action === 'SUSPENDRE' && finSuspension
      ? `Le compte de l’auteur sera suspendu jusqu’au ${dateLongue(finSuspension)}.`
      : '',
    issueAnnoncee(action, ouverts),
    action === 'AUCUNE' ? '' : 'L’auteur en est informé par e-mail, avec votre motif.',
    'La décision ne pourra plus être modifiée.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Fin d'une suspension qui commence maintenant. */
export const finSuspension = (jours: number, maintenant = new Date()): Date =>
  new Date(maintenant.getTime() + jours * 86_400_000);

/** RG-102 : ce que deviennent les signalements ouverts du contenu après la décision. */
export function issueAnnoncee(action: ActionDecisionModerateur, ouverts: number): string {
  if (!ouverts) return '';
  const issue = issueDesSignalements(action) === 'FONDE' ? 'fondé' : 'non fondé';
  return ouverts > 1
    ? `Les ${fmt(ouverts)} signalements ouverts seront clos comme ${issue}s.`
    : `Le signalement ouvert sera clos comme ${issue}.`;
}
