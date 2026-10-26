import type {
  ActionDecision,
  ResultatReproduction,
  TypeCreation,
  TypeNotification,
  TypeSujet,
} from '../enums';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { BadgeApi, NiveauApi } from './referentiels';

/* Contrats de la page Notifications (NOTIF-01, F-81, RG-91) : GET /api/v1/notifications et les
   routes de lecture. Les textes des membres (commentaire, retour d'essai, réponse du forum) sont lus
   au moment de l'affichage : un texte retiré, masqué ou devenu invisible pour le destinataire ne
   s'affiche plus (`disponible` faux). Ils sont en texte brut, affichés tels quels. */

/** Contenu concerné, tel que le volet de lecture le présente (prototype : cible, contexte). */
export interface CibleNotificationApi {
  nature: 'CREATION' | 'SUJET' | 'CAS_BON_REFLEXE' | 'DEFI';
  id: number;
  slug: string | null;
  titre: string;
  /** Le destinataire en est l'auteur (« votre création »). */
  aMoi: boolean;
  /** Création : type, catégorie, auteur, publication et image de couverture. */
  typeCreation: TypeCreation | null;
  categorie: string | null;
  auteur: MembreResumeApi | null;
  datePublication: string | null;
  image: MediaApi | null;
  /** Sujet du forum : question, clinique, astuce… */
  typeSujet: TypeSujet | null;
}

/** Message d'un fil (commentaire d'origine, réponse du destinataire). */
export interface MessageNotificationApi {
  auteur: MembreResumeApi | null;
  /** Écrit par le destinataire (« Vous »). */
  moi: boolean;
  texte: string;
  date: string;
}

export interface NotificationApi {
  id: number;
  type: TypeNotification;
  /** ISO 8601 ; pour des votes regroupés, celle du dernier vote. */
  date: string;
  lue: boolean;
  /** Événements regroupés : votes « Utile » d'un même jour sur un même contenu (RG-91). */
  nombre: number;
  /** Membre à l'origine de l'événement (absent pour un badge, un niveau, une décision). */
  par: MembreResumeApi | null;
  /** Votes regroupés : les membres qui ont voté ce jour-là, du plus récent au plus ancien. */
  votants: MembreResumeApi[];
  /** Faux si le contenu concerné n'est plus visible du destinataire (retiré, masqué, dépublié). */
  disponible: boolean;
  cible: CibleNotificationApi | null;
  /** Les votes portent sur une réponse du destinataire dans ce sujet, non sur le sujet. */
  surReponse: boolean;
  /** Commentaire, retour d'essai ou réponse du forum qui a déclenché la notification. */
  texte: string | null;
  /** Commentaire auquel on a répondu (réponse à un commentaire, réponse dans un fil). */
  origine: MessageNotificationApi | null;
  /** Réponse déjà publiée par le destinataire dans ce fil, après le commentaire. */
  reponse: MessageNotificationApi | null;
  /** Commentaire auquel le destinataire peut répondre depuis la notification (F-42). */
  repondreA: { creationId: number; commentaireId: number } | null;
  /** Points gagnés par le destinataire avec cet événement. */
  points: number | null;
  reproduction: {
    resultat: ResultatReproduction;
    outil: OutilResumeApi;
    modele: string | null;
  } | null;
  /** Variante publiée d'une création du destinataire (S-04), avec son outil principal. */
  variante: (CibleNotificationApi & { outil: OutilResumeApi | null; modele: string | null }) | null;
  badge: BadgeApi | null;
  niveau: NiveauApi | null;
  /** Défi clos : rang du destinataire et nombre de participants. */
  defi: { rang: number; participants: number; dateDebut: string; dateFin: string } | null;
  /** Cas refusé, contenu masqué, décision : motif communiqué au membre. */
  motif: string | null;
  decision: { action: ActionDecision; finSuspension: string | null } | null;
  /** Obsolescence au-delà du seuil (RG-44). */
  obsolescence: { modele: string; membres: number } | null;
  /** Réponse du forum acceptée par le destinataire ; sujet déjà résolu par une autre réponse. */
  acceptee: boolean;
  sujetResolu: boolean;
}

/** Réponse de GET /api/v1/notifications (pagination par curseur, la plus récente d'abord). */
export interface NotificationsApi {
  elements: NotificationApi[];
  suivant: string | null;
  /** Toutes les non lues du membre, pas seulement celles de la page. */
  nonLues: number;
  /** F-81 : réponses à ses sujets et réponses acceptées aussi envoyées par e-mail. */
  email: boolean;
  /** Réputation (RG-83) et réputation gagnée depuis lundi 00:00 UTC (semaine de RG-87). */
  points: number;
  pointsSemaine: number;
  dateInscription: string;
}

/** Réponse des routes de lecture : le nombre de non lues pour l'en-tête. */
export interface LectureNotificationsApi {
  nonLues: number;
  /** Tout marquer comme lu : les notifications passées à « lue », pour pouvoir annuler. */
  ids: number[];
}

/** Réponse de PUT /api/v1/moi/preferences-notifications. */
export interface PreferencesNotificationsApi {
  email: boolean;
}
