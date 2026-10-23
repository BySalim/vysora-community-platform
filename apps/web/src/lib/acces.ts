/* Accès aux actions réservées (prototype/commun.js : MOTIFS, invitation) : ce qui manque à la
   personne qui consulte (connexion, e-mail, conditions, suspension, niveau, rôle) et la suite
   proposée. Sans DOM : le dialogue et les gardes de liens (scripts/commun/acces.ts) s'en servent,
   un composant rendu par le serveur pourra s'en servir aussi. */

import {
  NIVEAUX,
  type ActionReservee,
  type CodeNiveau,
  type ProblemeApi,
  type RaisonRefus,
} from '@vysora/shared';
import { ROUTES } from './navigation';
import { esc, fmt, t } from './texte';

/** Boutons du dialogue et du bandeau du compte (data-acces-bouton), BOUTONS dans le prototype. */
export type BoutonAcces = 'email' | 'conditions';

/** ['lien', libellé, adresse, style] · ['bouton', libellé, bouton, style] · ['fermer', libellé, null, style]. */
export type ActionAcces =
  | [genre: 'lien', libelle: string, href: string, style: StyleAction]
  | [genre: 'bouton', libelle: string, bouton: BoutonAcces, style: StyleAction]
  | [genre: 'fermer', libelle: string, cible: null, style: StyleAction];
type StyleAction = 'primary' | 'secondary';

export interface MotifAcces {
  icone: string;
  titre: string;
  texte: string;
  actions: ActionAcces[];
}

/** Ce que les messages disent de la personne et de la page où elle se trouve. */
export interface ContexteAcces {
  /** Page d'origine (chemin, requête et ancre), où revenir après la connexion ou l'inscription. */
  page: string;
  /** Adresse complète de la page, transmise au signalement sans compte. */
  adresse: string;
  niveau: CodeNiveau;
  points: number;
  /** Fin de la suspension (« 23 octobre 2026 »), vide si elle n'est pas connue. */
  suspension: string;
  /** Date d'effet des nouvelles conditions, vide si elle n'est pas connue. */
  conditions: string;
}

const RAISONS_REFUS: readonly RaisonRefus[] = [
  'connexion',
  'email',
  'conditions',
  'suspendu',
  'niveau',
  'role',
];

const ACTIONS: readonly ActionReservee[] = [
  'contribuer',
  'parametres',
  'proposer-cas',
  'moderer',
  'administrer',
];

/** Action lue dans le HTML (data-exige="moderer") ; « contribuer » si elle est absente ou inconnue. */
export const actionDemandee = (valeur: string | undefined): ActionReservee =>
  ACTIONS.find((a) => a === valeur) ?? 'contribuer';

/** Page d'origine et action demandée, transmises à la connexion et à l'inscription (lib/retour.ts). */
export const suite = (quoi: string, page: string): string =>
  `retour=${encodeURIComponent(page)}${quoi ? `&pour=${encodeURIComponent(quoi)}` : ''}`;

const libelleNiveau = (code: CodeNiveau) => NIVEAUX.find((n) => n.code === code)?.libelle ?? code;
const SEUIL_EXPERT = NIVEAUX.find((n) => n.code === 'expert')?.seuilPoints ?? 0;

/** Message du dialogue pour une raison de refus, mêmes textes que le prototype. */
export function motifAcces(raison: RaisonRefus, quoi: string, c: ContexteAcces): MotifAcces {
  const vers = (route: string) => `${route}?${suite(quoi, c.page)}`;
  switch (raison) {
    case 'connexion':
      return /signal/.test(quoi)
        ? {
            icone: 'flag',
            titre: `Connectez-vous pour ${quoi}`,
            texte:
              'Sans compte, vous pouvez aussi nous signaler un contenu illicite depuis le formulaire de contact.',
            actions: [
              ['lien', 'Se connecter', vers(ROUTES.connexion), 'primary'],
              [
                'lien',
                'Signaler sans compte',
                `${ROUTES.contact}?motif=signalement&contenu=${encodeURIComponent(c.adresse)}`,
                'secondary',
              ],
            ],
          }
        : {
            icone: 'user',
            titre: `Connectez-vous pour ${quoi}`,
            texte:
              'Votre compte garde vos votes, vos essais et vos brouillons, et fait progresser votre réputation.',
            actions: [
              ['lien', 'Créer un compte', vers(ROUTES.inscription), 'primary'],
              ['lien', 'Se connecter', vers(ROUTES.connexion), 'secondary'],
            ],
          };
    case 'email':
      return {
        icone: 'mail',
        titre: `Confirmez votre adresse e-mail pour ${quoi}`,
        texte:
          'Ouvrez le lien reçu à l’inscription : il reste valable 24 heures. Vous pouvez en recevoir un nouveau.',
        actions: [
          ['bouton', 'Renvoyer l’e-mail', 'email', 'primary'],
          ['fermer', 'Plus tard', null, 'secondary'],
        ],
      };
    case 'conditions':
      return {
        icone: 'doc',
        titre: `Acceptez les nouvelles conditions pour ${quoi}`,
        texte: c.conditions
          ? `Les conditions générales et la charte communautaire ont changé le ${c.conditions}.`
          : 'Les conditions générales et la charte communautaire ont changé.',
        actions: [
          ['bouton', 'Accepter les conditions', 'conditions', 'primary'],
          ['lien', 'Lire les changements', `${ROUTES.cgu}#changements`, 'secondary'],
        ],
      };
    case 'suspendu':
      return {
        icone: 'lock',
        titre: c.suspension
          ? `Votre compte est suspendu jusqu’au ${c.suspension}`
          : 'Votre compte est suspendu',
        texte: `Vous pourrez ${quoi} dès la fin de la suspension. D’ici là, vous gardez l’accès à la lecture et à vos paramètres.`,
        actions: [
          ['fermer', 'Fermer', null, 'primary'],
          ['lien', 'Voir la décision', ROUTES.notifications, 'secondary'],
        ],
      };
    case 'niveau':
      return {
        icone: 'shield',
        titre: `Le niveau Expert permet de ${quoi}`,
        texte: `Vous êtes ${libelleNiveau(c.niveau)} avec ${fmt(c.points)} points. Le niveau Expert commence à ${fmt(SEUIL_EXPERT)} points.`,
        actions: [
          ['lien', 'Voir comment gagner des points', `${ROUTES.classements}#niveaux`, 'primary'],
          ['fermer', 'Fermer', null, 'secondary'],
        ],
      };
    case 'role':
      return {
        icone: 'shield',
        titre: 'Cette action est réservée à la modération',
        texte:
          'Les modérateurs et les administrateurs traitent les signalements et valident les cas proposés.',
        actions: [['fermer', 'Fermer', null, 'primary']],
      };
  }
}

/** Boutons du message ; dans la page (enLigne), « Fermer » et « Plus tard » n'ont pas de sens. */
export const actionsHTML = (actions: ActionAcces[], enLigne: boolean): string =>
  actions
    .filter(([genre]) => !(enLigne && genre === 'fermer'))
    .map(([genre, libelle, cible, style]) =>
      genre === 'lien'
        ? `<a class="btn btn-${style}" href="${esc(cible)}">${t(libelle)}</a>`
        : `<button class="btn btn-${style}" type="button" ${genre === 'bouton' ? `data-acces-bouton="${cible}"` : 'data-acces-fermer'}>${t(libelle)}</button>`,
    )
    .join('');

/** Phrase à placer dans la page quand l'action n'est pas permise (« Créez un compte ou
    connectez-vous pour suivre votre progression. »), en HTML. */
export function invitationHTML(raison: RaisonRefus, quoi: string, c: ContexteAcces): string {
  switch (raison) {
    case 'connexion': {
      const requete = esc(suite(quoi, c.page));
      return `<a href="${ROUTES.inscription}?${requete}">Créez un compte</a> ou <a href="${ROUTES.connexion}?${requete}">connectez-vous</a> pour ${t(quoi)}.`;
    }
    case 'email':
      return `Confirmez votre adresse e-mail pour ${t(quoi)}.`;
    case 'conditions':
      return `Acceptez les nouvelles conditions pour ${t(quoi)}.`;
    case 'suspendu':
      return c.suspension
        ? `Vous pourrez ${t(quoi)} à la fin de la suspension, le ${t(c.suspension)}.`
        : `Vous pourrez ${t(quoi)} à la fin de la suspension.`;
    case 'niveau':
      return `Le niveau Expert permet de ${t(quoi)}.`;
    case 'role':
      return 'Cette action est réservée à la modération.';
  }
}

/** Raison d'un refus de l'API (401 ou 403 au format RFC 9457, membre « raison », AUTH-06) ;
    null pour toute autre erreur, qui se présente autrement (champ, alerte, message bref). */
export function raisonDuRefus(
  probleme: Pick<ProblemeApi, 'status' | 'code' | 'raison'>,
): RaisonRefus | null {
  if (probleme.status !== 401 && probleme.status !== 403) return null;
  const raison = RAISONS_REFUS.find((r) => r === probleme.raison);
  if (raison) return raison;
  // Session expirée entre-temps : il faut se connecter, même sans raison précisée.
  return probleme.code === 'NON_AUTHENTIFIE' ? 'connexion' : null;
}
