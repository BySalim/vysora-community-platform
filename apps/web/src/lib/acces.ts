/* Messages d'accès aux actions réservées (prototype/commun.js : MOTIFS, accesBloc, invitation).
   Quand `raisonRefus` refuse une action, ces messages expliquent pourquoi (connexion, e-mail,
   conditions, suspension, niveau, rôle) et proposent la suite. Fonctions pures : le serveur les
   rend dans une page (AccesBloc.astro), le navigateur dans le dialogue (scripts/commun/acces.ts). */

import { NIVEAUX, type CodeNiveau, type RaisonRefus } from '@vysora/shared';
import { ROUTES } from './navigation';
import { dateLongue, esc, fmt, t } from './texte';

/** Ce que le message doit savoir de la page et de la personne qui consulte. */
export interface ContexteAcces {
  /** Page courante (chemin, requête, ancre) : retour après la connexion ou l'inscription. */
  page: string;
  /** Adresse complète de la page, transmise au formulaire de contact pour un signalement sans compte. */
  adresse: string;
  /** Fin de la suspension (ISO 8601). */
  suspensionJusqua: string | null;
  /** Date d'effet des documents légaux à accepter (AAAA-MM-JJ). */
  conditionsDepuis: string | null;
  niveau: CodeNiveau;
  points: number;
}

/** Contexte d'une page rendue par le serveur (Astro.locals, Astro.url, Astro.site). */
export function contexteServeur(locals: App.Locals, url: URL, site?: URL): ContexteAcces {
  const page = `${url.pathname}${url.search}`;
  return {
    page,
    adresse: new URL(page, site ?? url).href,
    suspensionJusqua: locals.suspensionJusqua,
    conditionsDepuis: locals.conditionsDepuis,
    niveau: locals.etat.niveau,
    points: locals.membre?.points ?? 0,
  };
}

/** Boutons d'action branchés par scripts/commun/acces.ts (attribut data-acces-bouton). */
export type BoutonAcces = 'email' | 'conditions';

export type ActionAcces =
  | { genre: 'lien'; libelle: string; cible: string; style: StyleBouton }
  | { genre: 'bouton'; libelle: string; cible: BoutonAcces; style: StyleBouton }
  | { genre: 'fermer'; libelle: string; style: StyleBouton };
type StyleBouton = 'primary' | 'secondary';

export interface MessageAcces {
  icone: string;
  titre: string;
  texte: string;
  actions: ActionAcces[];
}

/** Paramètres transmis à la connexion et à l'inscription : page d'origine et action demandée. */
export const suiteConnexion = (page: string, quoi?: string): string =>
  `retour=${encodeURIComponent(page)}${quoi ? `&pour=${encodeURIComponent(quoi)}` : ''}`;

const SEUIL_EXPERT = NIVEAUX.find((n) => n.code === 'expert')?.seuilPoints ?? 0;
const nomNiveau = (code: CodeNiveau) => NIVEAUX.find((n) => n.code === code)?.libelle ?? code;
const date = (valeur: string | null) => (valeur ? dateLongue(valeur) : '');

export function messageAcces(raison: RaisonRefus, quoi: string, c: ContexteAcces): MessageAcces {
  const suite = suiteConnexion(c.page, quoi);
  switch (raison) {
    case 'connexion':
      return /signal/.test(quoi)
        ? {
            icone: 'flag',
            titre: `Connectez-vous pour ${quoi}`,
            texte:
              'Sans compte, vous pouvez aussi nous signaler un contenu illicite depuis le formulaire de contact.',
            actions: [
              {
                genre: 'lien',
                libelle: 'Se connecter',
                cible: `${ROUTES.connexion}?${suite}`,
                style: 'primary',
              },
              {
                genre: 'lien',
                libelle: 'Signaler sans compte',
                cible: `${ROUTES.contact}?motif=signalement&contenu=${encodeURIComponent(c.adresse)}`,
                style: 'secondary',
              },
            ],
          }
        : {
            icone: 'user',
            titre: `Connectez-vous pour ${quoi}`,
            texte:
              'Votre compte garde vos votes, vos essais et vos brouillons, et fait progresser votre réputation.',
            actions: [
              {
                genre: 'lien',
                libelle: 'Créer un compte',
                cible: `${ROUTES.inscription}?${suite}`,
                style: 'primary',
              },
              {
                genre: 'lien',
                libelle: 'Se connecter',
                cible: `${ROUTES.connexion}?${suite}`,
                style: 'secondary',
              },
            ],
          };
    case 'email':
      return {
        icone: 'mail',
        titre: `Confirmez votre adresse e-mail pour ${quoi}`,
        texte:
          'Ouvrez le lien reçu à l’inscription : il reste valable 24 heures. Vous pouvez en recevoir un nouveau.',
        actions: [
          { genre: 'bouton', libelle: 'Renvoyer l’e-mail', cible: 'email', style: 'primary' },
          { genre: 'fermer', libelle: 'Plus tard', style: 'secondary' },
        ],
      };
    case 'conditions': {
      const depuis = date(c.conditionsDepuis);
      return {
        icone: 'doc',
        titre: `Acceptez les nouvelles conditions pour ${quoi}`,
        texte: `Les conditions générales et la charte communautaire ont changé${depuis ? ` le ${depuis}` : ''}.`,
        actions: [
          {
            genre: 'bouton',
            libelle: 'Accepter les conditions',
            cible: 'conditions',
            style: 'primary',
          },
          {
            genre: 'lien',
            libelle: 'Lire les changements',
            cible: `${ROUTES.cgu}#changements`,
            style: 'secondary',
          },
        ],
      };
    }
    case 'suspendu': {
      const fin = date(c.suspensionJusqua);
      return {
        icone: 'lock',
        titre: fin ? `Votre compte est suspendu jusqu’au ${fin}` : 'Votre compte est suspendu',
        texte: `Vous pourrez ${quoi} dès la fin de la suspension. D’ici là, vous gardez l’accès à la lecture et à vos paramètres.`,
        actions: [
          { genre: 'fermer', libelle: 'Fermer', style: 'primary' },
          {
            genre: 'lien',
            libelle: 'Voir la décision',
            cible: ROUTES.notifications,
            style: 'secondary',
          },
        ],
      };
    }
    case 'niveau':
      return {
        icone: 'shield',
        titre: `Le niveau Expert permet de ${quoi}`,
        texte: `Vous êtes ${nomNiveau(c.niveau)} avec ${fmt(c.points)} points. Le niveau Expert commence à ${fmt(SEUIL_EXPERT)} points.`,
        actions: [
          {
            genre: 'lien',
            libelle: 'Voir comment gagner des points',
            cible: `${ROUTES.classements}#niveaux`,
            style: 'primary',
          },
          { genre: 'fermer', libelle: 'Fermer', style: 'secondary' },
        ],
      };
    case 'role':
      return {
        icone: 'shield',
        titre: 'Cette action est réservée à la modération',
        texte:
          'Les modérateurs et les administrateurs traitent les signalements et valident les cas proposés.',
        actions: [{ genre: 'fermer', libelle: 'Fermer', style: 'primary' }],
      };
  }
}

const icone = (nom: string) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${esc(nom)}"/></svg>`;

/** Boutons et liens du message ; « fermer » n'a pas de sens dans un bloc intégré à la page. */
export function actionsAccesHtml(actions: ActionAcces[], enLigne: boolean): string {
  return actions
    .filter((action) => !(enLigne && action.genre === 'fermer'))
    .map((action) => {
      if (action.genre === 'lien')
        return `<a class="btn btn-${action.style}" href="${esc(action.cible)}">${t(action.libelle)}</a>`;
      const attribut =
        action.genre === 'bouton' ? `data-acces-bouton="${action.cible}"` : 'data-acces-fermer';
      return `<button class="btn btn-${action.style}" type="button" ${attribut}>${t(action.libelle)}</button>`;
    })
    .join('');
}

/** Contenu du dialogue d'accès (<dialog class="acces">). */
export function dialogueAccesHtml(m: MessageAcces): string {
  return `<button class="icon-btn acces-fermer" type="button" aria-label="Fermer" data-acces-fermer>${icone('close')}</button>
      <span class="acces-icone" aria-hidden="true">${icone(m.icone)}</span>
      <h2 id="acces-titre">${t(m.titre)}</h2>
      <p>${t(m.texte)}</p>
      <div class="acces-actions">${actionsAccesHtml(m.actions, false)}</div>`;
}

export type BaliseTitre = 'h1' | 'h2' | 'h3';

/** Même message, intégré à la page (l'éditeur ouvert par un visiteur, Mes contenus, Notifications). */
export function blocAccesHtml(m: MessageAcces, titre: BaliseTitre = 'h2'): string {
  return `<div class="acces-bloc" data-acces-bloc><span class="acces-icone" aria-hidden="true">${icone(m.icone)}</span><${titre}>${t(m.titre)}</${titre}><p>${t(m.texte)}</p><div class="acces-actions">${actionsAccesHtml(m.actions, true)}</div></div>`;
}

/** Phrase d'invitation à placer dans la page (« Créez un compte ou connectez-vous pour… »). */
export function invitationHtml(raison: RaisonRefus, quoi: string, c: ContexteAcces): string {
  const suite = esc(suiteConnexion(c.page, quoi));
  switch (raison) {
    case 'connexion':
      return `<a href="${ROUTES.inscription}?${suite}">Créez un compte</a> ou <a href="${ROUTES.connexion}?${suite}">connectez-vous</a> pour ${t(quoi)}.`;
    case 'email':
      return `Confirmez votre adresse e-mail pour ${t(quoi)}.`;
    case 'conditions':
      return `Acceptez les nouvelles conditions pour ${t(quoi)}.`;
    case 'suspendu': {
      const fin = date(c.suspensionJusqua);
      return fin
        ? `Vous pourrez ${t(quoi)} à la fin de la suspension, le ${t(fin)}.`
        : `Vous pourrez ${t(quoi)} à la fin de la suspension.`;
    }
    case 'niveau':
      return `Le niveau Expert permet de ${t(quoi)}.`;
    case 'role':
      return 'Cette action est réservée à la modération.';
  }
}
