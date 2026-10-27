/* Présentation des notifications (NOTIF-01), reprise de prototype/notifications.js : catégories du
   filtre, genres, titres et résumés, ce qui reste « À traiter », dates relatives et groupes par date.
   Fonctions pures, partagées par le script de la page et ses tests. */

import {
  NIVEAUX,
  type NotificationApi,
  type ResultatReproduction,
  type TypeContenu,
  type TypeNotification,
  type TypeSujet,
} from '@vysora/shared';
import { fmt, pluriel } from './texte';

/** Clé du prototype de chaque événement (data-* et classes de notifications.css). */
export const CLES: Record<TypeNotification, string> = {
  COMMENTAIRE_RECU: 'commentaire',
  REPONSE_COMMENTAIRE: 'reponse-commentaire',
  REPONSE_SUJET: 'reponse-sujet',
  REPONSE_ACCEPTEE: 'reponse-acceptee',
  REPRODUCTION_RECUE: 'reproduction',
  VARIANTE_PUBLIEE: 'variante',
  OBSOLESCENCE_SIGNALEE: 'obsolescence',
  VOTES_UTILE_RECUS: 'votes',
  BADGE_OBTENU: 'badge',
  NIVEAU_ATTEINT: 'niveau',
  CAS_VALIDE: 'cas-valide',
  CAS_REFUSE: 'cas-refuse',
  RESULTAT_DEFI: 'defi',
  CONTENU_MASQUE: 'masque',
  CONTENU_RETABLI: 'retabli',
  DECISION_MODERATION: 'decision',
};

export const VUES = [
  ['toutes', 'Toutes'],
  ['non-lues', 'Non lues'],
  ['a-traiter', 'À traiter'],
] as const;
export type Vue = (typeof VUES)[number][0];

/** Filtre « Type de notification » (prototype : TYPES). */
export const CATEGORIES: { id: string; libelle: string; types?: TypeNotification[] }[] = [
  { id: 'tout', libelle: 'Tous les types' },
  {
    id: 'echanges',
    libelle: 'Échanges',
    types: ['COMMENTAIRE_RECU', 'REPONSE_COMMENTAIRE', 'REPONSE_SUJET', 'REPONSE_ACCEPTEE'],
  },
  {
    id: 'preuves',
    libelle: 'Essais et votes',
    types: ['REPRODUCTION_RECUE', 'VOTES_UTILE_RECUS', 'VARIANTE_PUBLIEE', 'OBSOLESCENCE_SIGNALEE'],
  },
  {
    id: 'progression',
    libelle: 'Progression',
    types: ['BADGE_OBTENU', 'NIVEAU_ATTEINT', 'RESULTAT_DEFI', 'CAS_VALIDE', 'CAS_REFUSE'],
  },
  {
    id: 'moderation',
    libelle: 'Modération',
    types: ['CONTENU_MASQUE', 'CONTENU_RETABLI', 'DECISION_MODERATION'],
  },
];
export const categorieDe = (type: TypeNotification): string =>
  CATEGORIES.find((c) => c.types?.includes(type))?.id ?? 'tout';

/** Genre affiché au-dessus du titre du volet. */
export const GENRES: Record<TypeNotification, string> = {
  COMMENTAIRE_RECU: 'Commentaire',
  REPONSE_COMMENTAIRE: 'Réponse à votre commentaire',
  REPONSE_SUJET: 'Réponse sur le forum',
  REPONSE_ACCEPTEE: 'Réponse acceptée',
  REPRODUCTION_RECUE: 'Essai de votre création',
  VARIANTE_PUBLIEE: 'Variante',
  VOTES_UTILE_RECUS: 'Votes « Utile »',
  OBSOLESCENCE_SIGNALEE: 'Obsolescence',
  CONTENU_MASQUE: 'Modération',
  CONTENU_RETABLI: 'Modération',
  BADGE_OBTENU: 'Badge',
  NIVEAU_ATTEINT: 'Niveau',
  CAS_VALIDE: 'Cas Bon réflexe',
  CAS_REFUSE: 'Cas Bon réflexe',
  RESULTAT_DEFI: 'Défi',
  DECISION_MODERATION: 'Modération',
};

/** Résultat d'un essai : icône, libellé, valeur de data-resultat. */
export const RESULTATS: Record<ResultatReproduction, [string, string, string]> = {
  SUCCES: ['check-circle', 'Réussi', 'reussi'],
  PARTIEL: ['half-circle', 'Résultat partiel', 'partiel'],
  ECHEC: ['x-circle', 'Échec', 'echec'],
};

const MOTS_SUJET: Record<TypeSujet, string> = {
  QUESTION: 'question',
  CLINIQUE: 'clinique du prompt',
  ASTUCE: 'astuce',
  RETOUR_EXPERIENCE: 'retour d’expérience',
  DISCUSSION: 'discussion',
};
export const motSujet = (n: NotificationApi): string =>
  n.cible?.typeSujet ? MOTS_SUJET[n.cible.typeSujet] : 'sujet';

export const majuscule = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** « de Léa » ou « d’Awa » devant un nom. */
export const deNom = (nom: string): string =>
  /^[aeiouyh]/i.test(nom.normalize('NFD').replace(/[̀-ͯ]/g, '')) ? `d’${nom}` : `de ${nom}`;

/** « 1re », « 3e ». */
export const rangTexte = (rang: number): string => `${rang}${rang === 1 ? 're' : 'e'}`;

export const nomDe = (n: NotificationApi): string => n.par?.nom ?? 'Un membre';

/** Titre du contenu concerné, ou une mention neutre s'il n'est plus disponible. */
export const titreCible = (n: NotificationApi): string =>
  n.cible?.titre ?? 'Contenu qui n’est plus disponible';

/** Contenu visé par une décision de modération, avec son accord (« masquée », « masqué »). */
const DESIGNATIONS: Record<TypeContenu, { nom: string; feminin: boolean }> = {
  CREATION: { nom: 'création', feminin: true },
  COMMENTAIRE: { nom: 'commentaire', feminin: false },
  REPRODUCTION: { nom: 'essai', feminin: false },
  SUJET: { nom: 'sujet', feminin: false },
  MESSAGE: { nom: 'réponse', feminin: true },
  CAS_BON_REFLEXE: { nom: 'cas Bon réflexe', feminin: false },
};

/** Le prototype ne connaît que la création masquée ; la modération vise aussi commentaires, essais,
    sujets, réponses et cas (MOD-01). `e` accorde le participe, `ce` le démonstratif. */
export function contenuVise(n: NotificationApi): {
  type: TypeContenu;
  nom: string;
  e: string;
  ce: string;
  intitule: string;
} {
  const type = n.decision?.contenu?.type ?? 'CREATION';
  const { nom, feminin } = DESIGNATIONS[type];
  return {
    type,
    nom,
    e: feminin ? 'e' : '',
    ce: feminin ? 'Cette' : 'Ce',
    intitule: n.decision?.contenu?.intitule ?? titreCible(n),
  };
}

/** Titre d'une décision de modération qui vise un contenu (« Votre réponse a été supprimée… »). */
function titreDecision(n: NotificationApi): string {
  const { nom, e } = contenuVise(n);
  switch (n.decision?.action) {
    case 'SUSPENDRE':
      return `Votre compte est suspendu jusqu’au ${finSuspension(n)}`;
    case 'AVERTIR':
      return 'La modération vous adresse un avertissement';
    case 'SUPPRIMER':
      return `Votre ${nom} a été supprimé${e} par la modération`;
    case 'AJOUTER_AVERTISSEMENT_AGENT':
      return 'Un avertissement a été ajouté à votre création';
    case 'RETIRER_AVERTISSEMENT_AGENT':
      return 'L’avertissement de votre création a été retiré';
    default:
      return 'La modération a pris une décision qui vous concerne';
  }
}

/** Fin de la suspension, « 20 octobre 2026 ». */
export const finSuspension = (n: NotificationApi): string =>
  n.decision?.finSuspension ? dateLongue(n.decision.finSuspension) : '';

/** « Léa Martin a voté », « Léa Martin et Awa Sarr ont voté », « A, B et 2 autres membres ont voté ». */
export function votantsTexte(noms: string[], total = noms.length): string {
  const [a = 'Un membre', b] = noms;
  if (total <= 1 || !b) return `${a} a voté`;
  if (total === 2) return `${a} et ${b} ont voté`;
  return `${a}, ${b} et ${pluriel(total - 2, 'autre membre', 'autres membres')} ont voté`;
}

/** Titre du volet de lecture (prototype : titreDetail). */
export function titreDetail(n: NotificationApi): string {
  const qui = nomDe(n);
  switch (n.type) {
    case 'COMMENTAIRE_RECU':
      return `${qui} a commenté votre création`;
    case 'REPONSE_COMMENTAIRE':
      return `${qui} a répondu à votre commentaire`;
    case 'REPONSE_SUJET':
      return `${qui} a répondu à votre ${motSujet(n)}`;
    case 'REPONSE_ACCEPTEE':
      return `${qui} a accepté votre réponse`;
    case 'REPRODUCTION_RECUE':
      return `${qui} a essayé votre création`;
    case 'VARIANTE_PUBLIEE':
      return `${qui} a publié une variante de votre création`;
    case 'VOTES_UTILE_RECUS':
      return `${votantsTexte(
        n.votants.map((m) => m.nom),
        n.nombre,
      )} « Utile »`;
    case 'OBSOLESCENCE_SIGNALEE':
      return `Votre création est signalée comme ne fonctionnant plus avec ${n.obsolescence?.modele ?? 'un modèle'}`;
    case 'CONTENU_MASQUE': {
      const { nom, e } = contenuVise(n);
      return `Votre ${nom} a été masqué${e} par la modération`;
    }
    case 'CONTENU_RETABLI':
      return `Votre ${contenuVise(n).nom} est de nouveau visible`;
    case 'BADGE_OBTENU':
      return `Vous avez obtenu le badge « ${n.badge?.libelle ?? ''} »`;
    case 'NIVEAU_ATTEINT':
      return `Vous avez atteint le niveau ${n.niveau?.libelle ?? ''}`;
    case 'CAS_VALIDE':
      return 'Votre cas Bon réflexe a été validé';
    case 'CAS_REFUSE':
      return 'Votre cas Bon réflexe n’a pas été validé';
    case 'RESULTAT_DEFI':
      return `Vous terminez ${rangTexte(n.defi?.rang ?? 0)} du défi`;
    case 'DECISION_MODERATION':
      return titreDecision(n);
  }
}

/** Résumé en texte simple : vue d'ensemble, libellés accessibles, annonces (prototype : resume). */
export function resume(n: NotificationApi): string {
  const qui = nomDe(n);
  const nom = `« ${titreCible(n)} »`;
  switch (n.type) {
    case 'COMMENTAIRE_RECU':
      return `${qui} a commenté ${nom}`;
    case 'REPONSE_COMMENTAIRE':
      return `${qui} a répondu à votre commentaire`;
    case 'REPONSE_SUJET':
      return `${qui} a répondu à votre ${motSujet(n)}`;
    case 'REPONSE_ACCEPTEE':
      return `${qui} a accepté votre réponse`;
    case 'REPRODUCTION_RECUE':
      return `${qui} a essayé ${nom}`;
    case 'VARIANTE_PUBLIEE':
      return `${qui} a publié une variante de ${nom}`;
    case 'VOTES_UTILE_RECUS':
      return `${pluriel(n.nombre, 'membre a', 'membres ont')} voté « Utile » pour ${n.surReponse ? 'votre réponse' : nom}`;
    case 'OBSOLESCENCE_SIGNALEE':
      return `${nom} est signalée comme ne fonctionnant plus avec ${n.obsolescence?.modele ?? 'un modèle'}`;
    case 'CONTENU_MASQUE': {
      const { e, intitule } = contenuVise(n);
      return `« ${intitule} » a été masqué${e} par la modération`;
    }
    case 'CONTENU_RETABLI':
      return `« ${contenuVise(n).intitule} » est de nouveau visible`;
    case 'BADGE_OBTENU':
      return `vous avez obtenu le badge « ${n.badge?.libelle ?? ''} »`;
    case 'NIVEAU_ATTEINT':
      return `vous avez atteint le niveau ${n.niveau?.libelle ?? ''}`;
    case 'CAS_VALIDE':
      return `votre cas ${nom} a été validé`;
    case 'CAS_REFUSE':
      return `votre cas ${nom} n’a pas été validé`;
    case 'RESULTAT_DEFI':
      return `vous terminez ${rangTexte(n.defi?.rang ?? 0)} du défi ${nom}`;
    case 'DECISION_MODERATION': {
      const titre = titreDecision(n);
      return titre.charAt(0).toLowerCase() + titre.slice(1);
    }
  }
}

/** À traiter : une question qui vous est posée, une réponse à départager, une alerte sur une création. */
export function aTraiter(n: NotificationApi): boolean {
  if (!n.disponible) return false;
  if (['OBSOLESCENCE_SIGNALEE', 'CONTENU_MASQUE', 'CAS_REFUSE'].includes(n.type)) return true;
  if (n.reponse) return false;
  if (n.type === 'COMMENTAIRE_RECU' || n.type === 'REPONSE_COMMENTAIRE')
    return n.repondreA !== null && /\?/.test(n.texte ?? '');
  if (n.type === 'REPONSE_SUJET') return !n.sujetResolu;
  return false;
}

/** Décision de suspension non lue : épinglée en tête, ouverte à l'arrivée (« Voir la décision »). */
export const epinglee = (n: NotificationApi): boolean =>
  n.type === 'DECISION_MODERATION' && n.decision?.action === 'SUSPENDRE';

/** Ce que le membre a obtenu en atteignant un niveau (RG-85), texte du prototype. */
export function texteNiveau(code: string): string {
  const i = NIVEAUX.findIndex((n) => n.code === code);
  const niveau = NIVEAUX[i];
  const suivant = NIVEAUX[i + 1];
  switch (code) {
    case 'apprenti':
      return `Vous pouvez publier ${niveau?.creationsPar24h} créations et ${niveau?.sujetsPar24h} sujets par jour, et vos signalements comptent désormais pour le masquage automatique.`;
    case 'artisan':
      return `Vos créations, vos réponses et vos cas réussis vous font passer le cap des ${fmt(niveau?.seuilPoints ?? 0)} points.${suivant ? ` Prochain palier : ${suivant.libelle}, à ${fmt(suivant.seuilPoints)} points.` : ''}`;
    case 'expert':
      return 'Vous pouvez désormais proposer des cas Bon réflexe, et vos publications ne sont plus limitées par jour.';
    case 'maitre':
      return 'Maître est le plus haut niveau de Vysora. Vos cas Bon réflexe et vos réponses servent de référence aux autres membres.';
    default:
      return '';
  }
}

/* Dates : celles de l'API sont en UTC, comme les autres dates affichées par le site. ------------ */

const MOIS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOUR_MS = 24 * 60 * 60_000;

const jourDe = (iso: string | Date): number => {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
/** Jours écoulés entre la date et aujourd'hui (0 : aujourd'hui, 1 : hier). */
export const ecart = (iso: string, maintenant: Date): number =>
  Math.round((jourDe(maintenant) - jourDe(iso)) / JOUR_MS);
const minutes = (iso: string, maintenant: Date): number =>
  Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000);
export const heure = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** « il y a 5 min », « aujourd’hui à 10 h 05 », « hier à 20 h 15 », « le 9 oct. à 17 h 50 ». */
export function quand(iso: string, maintenant: Date): string {
  const m = minutes(iso, maintenant);
  if (m < 1) return 'à l’instant';
  const n = ecart(iso, maintenant);
  if (m < 60 && n === 0) return `il y a ${m} min`;
  if (n <= 0) return `aujourd’hui à ${heure(iso)}`;
  if (n === 1) return `hier à ${heure(iso)}`;
  const d = new Date(iso);
  return `le ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} à ${heure(iso)}`;
}

/** Heure courte d'une ligne de la liste : « 5 min », « 10 h 05 », « sam. 11 », « 9 oct. ». */
export function courte(iso: string, maintenant: Date): string {
  const m = minutes(iso, maintenant);
  if (m < 1) return 'à l’instant';
  const n = ecart(iso, maintenant);
  if (m < 60 && n === 0) return `${m} min`;
  if (n <= 1) return heure(iso);
  const d = new Date(iso);
  return n <= 6
    ? `${JOURS[d.getUTCDay()]} ${d.getUTCDate()}`
    : `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

/** « 26 septembre 2026 ». */
export function dateLongue(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Groupes de la liste, de la plus récente à la plus ancienne. */
export const GROUPES: [string, string, (jours: number) => boolean][] = [
  ['aujourdhui', 'Aujourd’hui', (n) => n <= 0],
  ['hier', 'Hier', (n) => n === 1],
  ['semaine', 'Les 7 derniers jours', (n) => n <= 7],
  ['avant', 'Plus tôt', () => true],
];

/** Lundi 00:00 UTC de la semaine (classement de la semaine, RG-87). */
export function lundi(maintenant: Date): Date {
  const jour = new Date(jourDe(maintenant));
  jour.setUTCDate(jour.getUTCDate() - ((jour.getUTCDay() + 6) % 7));
  return jour;
}
