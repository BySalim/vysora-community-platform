import { TYPES_NOTIFICATION, type TypeNotification } from './enums';

/* Paramètres du compte (PARAM-01, EC-17, F-06) : fuseaux proposés et préférences d'e-mail par
   événement (WF-25). L'API applique ces règles ; le site s'en sert pour afficher les choix. */

/** Fuseaux proposés pour les horaires des défis et des notifications (prototype : parametres-data.js). */
export const FUSEAUX_HORAIRES = [
  { id: 'Africa/Dakar', ville: 'Dakar' },
  { id: 'Africa/Abidjan', ville: 'Abidjan' },
  { id: 'Africa/Bamako', ville: 'Bamako' },
  { id: 'Africa/Douala', ville: 'Douala' },
  { id: 'Africa/Kinshasa', ville: 'Kinshasa' },
  { id: 'Africa/Casablanca', ville: 'Casablanca' },
  { id: 'Africa/Tunis', ville: 'Tunis' },
  { id: 'Europe/Paris', ville: 'Paris' },
  { id: 'Europe/Brussels', ville: 'Bruxelles' },
  { id: 'America/Montreal', ville: 'Montréal' },
] as const;
export type FuseauHoraire = (typeof FUSEAUX_HORAIRES)[number]['id'];
export const IDS_FUSEAUX = FUSEAUX_HORAIRES.map((fuseau) => fuseau.id) as [
  FuseauHoraire,
  ...FuseauHoraire[],
];

/** WF-25 : seules les réponses à ses sujets et les réponses acceptées partent par défaut par e-mail. */
const EMAIL_PAR_DEFAUT: readonly TypeNotification[] = ['REPONSE_SUJET', 'REPONSE_ACCEPTEE'];

/** RG-90, F-92 : une mesure de la modération part toujours par e-mail, avec son propre message
    (motif, référence, contestation) ; la préférence ne s'y applique pas. */
export const NOTIFICATIONS_EMAIL_IMPOSE: readonly TypeNotification[] = [
  'CONTENU_MASQUE',
  'CONTENU_RETABLI',
  'DECISION_MODERATION',
];

/** Événements dont le membre choisit l'envoi par e-mail. */
export const NOTIFICATIONS_EMAIL_REGLABLE: readonly TypeNotification[] = TYPES_NOTIFICATION.filter(
  (type) => !NOTIFICATIONS_EMAIL_IMPOSE.includes(type),
);

export type PreferencesEvenements = Record<TypeNotification, boolean>;

/** Préférences par événement : les choix enregistrés, la valeur par défaut ailleurs (sans ligne en
    base, WF-25). Les mesures de la modération sont toujours vraies. */
export function preferencesEvenements(
  enregistrees: Partial<Record<TypeNotification, boolean>> = {},
): PreferencesEvenements {
  return Object.fromEntries(
    TYPES_NOTIFICATION.map((type) => [
      type,
      NOTIFICATIONS_EMAIL_IMPOSE.includes(type) ||
        (enregistrees[type] ?? EMAIL_PAR_DEFAUT.includes(type)),
    ]),
  ) as PreferencesEvenements;
}

/** F-81 : une notification part aussi par e-mail si l'envoi par e-mail est activé et que le membre
    l'a choisi pour cet événement. Les mesures de la modération ont leur propre e-mail. */
export function emailDeNotification(
  type: TypeNotification,
  general: boolean,
  choix: boolean | null | undefined,
): boolean {
  if (NOTIFICATIONS_EMAIL_IMPOSE.includes(type)) return false;
  return general && (choix ?? EMAIL_PAR_DEFAUT.includes(type));
}
