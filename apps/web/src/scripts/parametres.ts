/* Page Paramètres (PARAM-01, EC-17 ; F-06, F-07, F-08), portée de prototype/parametres.js : le compte
   du membre connecté, en cinq rubriques (Compte, Connexion et sécurité, Notifications, Mes données,
   Supprimer le compte) faites de lignes séparées par des filets. Les réglages du prototype sont figés
   sur leurs valeurs par défaut : rubriques sur une seule page, modification dans la ligne, intertitres
   à icône, « MVP et propositions ». Les choix simples (fuseau, e-mails) s'enregistrent dès qu'ils
   changent ; les autres s'ouvrent dans leur ligne. Tout passe par l'API ; rien n'est simulé.
   Écarts au prototype : voir docs/registre.md, « Écarts au prototype (paramètres) ». */

import {
  DELAIS,
  FUSEAUX_HORAIRES,
  NOTIFICATIONS_EMAIL_IMPOSE,
  evaluerMotDePasse,
  type DisponibilitePseudo,
  type DocumentLegalApi,
  type ParametresApi,
  type PreferencesNotificationsApi,
  type ProblemeApi,
  type SessionApi,
  type SuppressionDemandeeApi,
  type TypeNotification,
} from '@vysora/shared';
import { RESUMES_DOCUMENTS, CLE_DOCUMENT } from '../lib/documents-legaux';
import { ROUTES } from '../lib/navigation';
import { dateLongue, masquerEmail } from '../lib/texte';
import {
  alerte,
  erreur,
  jauge,
  messageEmail,
  messageMotDePasse,
  motDePasse,
  passerEnVisiteur,
  premierInvalide,
  surveillerEmail,
} from './auth/commun';
import { DOCUMENTS_ACCEPTES } from './commun/acces';
import { api, type ReponseApi } from './commun/api';
import { etats } from './commun/etats';
import { $, $$, animations, esc, fmt, icon, pluriel, t, toast, typo } from './commun/outils';

interface Donnees {
  parametres: ParametresApi | null;
  documents: DocumentLegalApi[];
}

type Champ = HTMLInputElement;
type Cle = string;

const donnees = ((): Donnees | null => {
  try {
    const source = document.getElementById('pa-donnees')?.textContent;
    return source ? (JSON.parse(source) as Donnees) : null;
  } catch {
    return null;
  }
})();

const root = document.documentElement;
const ANONYME = 'membre-supprime-7f3a';
const RUBRIQUES = [
  { id: 'compte', label: 'Compte', icone: 'user' },
  { id: 'securite', label: 'Connexion et sécurité', icone: 'lock' },
  { id: 'notifications', label: 'Notifications', icone: 'bell' },
  { id: 'donnees', label: 'Mes données', icone: 'download' },
  { id: 'suppression', label: 'Supprimer le compte', icone: 'trash' },
] as const;
type IdRubrique = (typeof RUBRIQUES)[number]['id'];
const ROLES: Record<string, string> = {
  MODERATEUR: 'Modérateur',
  ADMINISTRATEUR: 'Administrateur',
};

/* Prototype : parametres-data.js. */
const EMAILS_TOUJOURS = [
  'Vérification de votre adresse e-mail',
  'Réinitialisation du mot de passe',
  'Changement d’adresse e-mail',
  'Nouvelle version d’un document légal',
  'Décision de modération vous concernant',
  'Demande et confirmation de suppression du compte',
  'Export de vos données prêt',
];
/** Événements notifiés (RG-91), regroupés comme sur la page Notifications ; chacun règle un ou
    plusieurs types de notification. Les mesures de la modération partent toujours (RG-90). */
const EVENEMENTS: {
  id: string;
  titre: string;
  icone: string;
  items: { id: string; label: string; types: TypeNotification[] }[];
}[] = [
  {
    id: 'echanges',
    titre: 'Échanges',
    icone: 'message',
    items: [
      { id: 'commentaire', label: 'Commentaires sur vos créations', types: ['COMMENTAIRE_RECU'] },
      {
        id: 'reponse-commentaire',
        label: 'Réponses à vos commentaires',
        types: ['REPONSE_COMMENTAIRE'],
      },
      { id: 'reponse-sujet', label: 'Réponses à vos sujets', types: ['REPONSE_SUJET'] },
      { id: 'reponse-acceptee', label: 'Vos réponses acceptées', types: ['REPONSE_ACCEPTEE'] },
    ],
  },
  {
    id: 'preuves',
    titre: 'Essais et votes',
    icone: 'repeat',
    items: [
      { id: 'reproduction', label: 'Essais de vos créations', types: ['REPRODUCTION_RECUE'] },
      { id: 'variante', label: 'Variantes de vos créations', types: ['VARIANTE_PUBLIEE'] },
      {
        id: 'obsolescence',
        label: 'Obsolescence signalée sur vos contenus',
        types: ['OBSOLESCENCE_SIGNALEE'],
      },
      { id: 'votes', label: 'Votes « Utile », regroupés par jour', types: ['VOTES_UTILE_RECUS'] },
    ],
  },
  {
    id: 'progression',
    titre: 'Progression',
    icone: 'award',
    items: [
      { id: 'badge', label: 'Badges obtenus', types: ['BADGE_OBTENU'] },
      { id: 'niveau', label: 'Niveaux atteints', types: ['NIVEAU_ATTEINT'] },
      {
        id: 'cas',
        label: 'Cas Bon réflexe validés ou refusés',
        types: ['CAS_VALIDE', 'CAS_REFUSE'],
      },
      { id: 'defi', label: 'Résultats des défis', types: ['RESULTAT_DEFI'] },
    ],
  },
  {
    id: 'moderation',
    titre: 'Modération',
    icone: 'shield',
    items: [
      {
        id: 'masque',
        label: 'Contenu masqué ou rétabli',
        types: ['CONTENU_MASQUE', 'CONTENU_RETABLI'],
      },
      {
        id: 'decision',
        label: 'Décisions de modération vous concernant',
        types: ['DECISION_MODERATION'],
      },
    ],
  },
];
const toujours = (types: TypeNotification[]) =>
  types.every((type) => NOTIFICATIONS_EMAIL_IMPOSE.includes(type));
/** Ce que voient les autres membres et les visiteurs (F-05, RG-88, politique de confidentialité). */
const VISIBILITE = [
  { label: 'Pseudo, photo, biographie et lien personnel', public: true },
  { label: 'Niveau, réputation et badges', public: true },
  { label: 'Créations publiées, réponses et essais déclarés', public: true },
  { label: 'Adresse e-mail', public: false },
  { label: 'Statistiques d’apprentissage et progression vers les badges', public: false },
  { label: 'Brouillons et contenus enregistrés', public: false },
];
const DOCUMENTS: { type: DocumentLegalApi['type']; href: string }[] = [
  { type: 'CGU', href: ROUTES.cgu },
  { type: 'CONFIDENTIALITE', href: ROUTES.confidentialite },
  { type: 'CHARTE', href: ROUTES.charte },
];

const params = new URLSearchParams(location.search);
const demandee = [params.get('rubrique'), location.hash.slice(1)]
  .map((id) => (id === 'export' ? 'donnees' : id))
  .find((id): id is IdRubrique => RUBRIQUES.some((r) => r.id === id));

let p = donnees?.parametres ?? null;
let documents = donnees?.documents ?? [];
const ui: {
  rubrique: IdRubrique;
  edition: Cle | null;
  sale: boolean;
  garde: (() => void) | null;
  flash: Cle | null;
  minuteurFlash: ReturnType<typeof setTimeout> | undefined;
  suiviExport: ReturnType<typeof setTimeout> | undefined;
} = {
  rubrique: demandee ?? 'compte',
  edition: null,
  sale: false,
  garde: null,
  flash: null,
  minuteurFlash: undefined,
  suiviExport: undefined,
};

/* Contexte ------------------------------------------------------------------------------------- */

const membre = () => etats.membre() && p !== null;
const moi = () => etats.moi();
const lectureSeuleEmail = () => p?.emailVerifie === false;
const fuseau = () => FUSEAUX_HORAIRES.find((f) => f.id === p?.fuseauHoraire) ?? FUSEAUX_HORAIRES[0];
const doux = (): ScrollBehavior => (animations.completes() ? 'smooth' : 'auto');
const enTete = () =>
  root.hasAttribute('data-header-hidden') ? 0 : ($('[data-header]')?.offsetHeight ?? 72);
/** Hauteur occupée en haut de l'écran : en-tête, et sur mobile la barre des rubriques. */
const decalageHaut = () => {
  const rail = $('[data-pa-rail]');
  const liste = $('.pa-rail-liste');
  const horizontal = rail && getComputedStyle(liste ?? rail).display === 'flex';
  return (enTete() || 72) + (horizontal && rail ? rail.offsetHeight : 0) + 20;
};

const MOIS_COURTS = [
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
const jourLocal = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const joursEcoules = (iso: string) =>
  Math.round((jourLocal(new Date()).getTime() - jourLocal(new Date(iso)).getTime()) / 86_400_000);
/** « aujourd’hui », « hier », « il y a 3 jours », « le 4 oct. » (prototype : relativeDay). */
function jourRelatif(iso: string): string {
  const n = joursEcoules(iso);
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'hier';
  if (n < 7) return `il y a ${n} jours`;
  const d = new Date(iso);
  return `le ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}
const heure = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
/** Date et heure locales d'un envoi : « 27 octobre 2026 à 09:18 ». */
const dateEtHeure = (iso: string) => {
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(d)
    .replace(/^1 /, '1er ');
  return `${jour} à ${heure(iso)}`;
};
function decalage(zone: string): string {
  try {
    return (
      new Intl.DateTimeFormat('fr-FR', { timeZone: zone, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((partie) => partie.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}
function heureDans(zone: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return '';
  }
}
const fuseauAppareil = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
})();

/* Éléments communs --------------------------------------------------------------------------- */

const statut = (ton: string, ic: string, texte: string) =>
  `<span class="pa-statut" data-ton="${ton}">${icon(ic, 'icon-sm')}${t(texte)}</span>`;
function interrupteur(
  id: string,
  on: boolean,
  etiquette: string,
  { decrit = '', label = '', inactif = false } = {},
): string {
  return `<button class="pa-switch" type="button" role="switch" aria-checked="${on}"${etiquette ? ` aria-labelledby="${etiquette}"` : ''}${label ? ` aria-label="${esc(typo(label))}"` : ''}${decrit ? ` aria-describedby="${decrit}"` : ''} data-pa-switch="${id}"${inactif ? ' disabled' : ''}><span aria-hidden="true"></span></button>`;
}
const groupeTitre = (id: string, ic: string, titre: string) =>
  `<h3 class="pa-groupe-titre" id="pa-g-${id}" tabindex="-1">${icon(ic, 'icon')}<span>${t(titre)}</span></h3>`;
function modifier(cle: Cle, label = 'Modifier', objet = '', classe = 'btn-secondary'): string {
  return `<button class="btn ${classe} btn-sm" type="button" data-pa-modifier="${cle}" aria-expanded="${ui.edition === cle}" aria-controls="pa-edition-${cle}">${t(label)}${objet ? `<span class="sr-only"> ${t(objet)}</span>` : ''}</button>`;
}
function ligne({
  cle,
  titre,
  valeur = '',
  aide = '',
  action = '',
  niveau = 3,
  suite = '',
  classe = '',
}: {
  cle: Cle;
  titre: string;
  valeur?: string;
  aide?: string;
  action?: string;
  niveau?: number;
  suite?: string;
  classe?: string;
}): string {
  const ouverte = ui.edition === cle;
  const h = `h${niveau}`;
  return `<div class="pa-ligne${ouverte ? ' is-ouverte' : ''}${ui.flash === cle ? ' is-flash' : ''}${classe ? ` ${classe}` : ''}" data-pa-ligne="${cle}">
      <${h} class="pa-ligne-titre" id="pa-t-${cle}">${titre}</${h}>
      <div class="pa-ligne-valeur">${valeur}${aide ? `<p class="pa-aide" id="pa-a-${cle}">${aide}</p>` : ''}</div>
      <div class="pa-ligne-action">${ui.flash === cle ? `<span class="pa-fait" data-pa-fait>${icon('check', 'icon-sm')}Enregistré</span>` : ''}${action}</div>
      ${suite}
      ${cle in FORMS ? `<div class="pa-edition" id="pa-edition-${cle}" data-pa-slot="${cle}"></div>` : ''}
    </div>`;
}

/* Tête de page ----------------------------------------------------------------------------------- */

function avatarMoi(taille: number): string {
  const photo = moi()?.avatar;
  return photo
    ? `<img class="compte-avatar" src="${esc(photo)}" alt="" width="${taille}" height="${taille}" decoding="async">`
    : `<span class="avatar compte-avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', 'icon')}</span>`;
}

function rendreTete(): void {
  const qui = $('[data-pa-qui]');
  if (!qui) return;
  qui.hidden = !membre();
  if (!membre() || !p) {
    qui.innerHTML = '';
    return;
  }
  const role = ROLES[p.role];
  qui.innerHTML = `${avatarMoi(48)}<p><b>${t(p.nom)}</b><span>${t(p.pseudo)}<i aria-hidden="true">·</i>${t(`${p.niveau.libelle}, ${pluriel(p.points, 'point', 'points')}`)}${role ? `<i aria-hidden="true">·</i><em>${t(role)}</em>` : ''}</span><span>${t(`Membre depuis le ${dateLongue(p.dateInscription)}`)}</span></p>`;
}

/* Rail des rubriques ---------------------------------------------------------------------------- */

function attention(id: IdRubrique): string {
  if (!p) return '';
  if (id === 'compte' && lectureSeuleEmail()) return 'adresse e-mail à confirmer';
  if (id === 'compte' && p.changementEmail) return 'changement d’adresse en attente';
  if (id === 'donnees' && etats.get().compte === 'conditions') return 'conditions à accepter';
  if (id === 'donnees' && p.export.etat === 'PRET') return 'export prêt';
  return '';
}
function rendreRail(): void {
  const rail = $('[data-pa-rail]');
  if (!rail) return;
  rail.innerHTML = `<ul class="pa-rail-liste">${RUBRIQUES.map((r) => {
    const a = attention(r.id);
    return `<li${r.id === 'suppression' ? ' class="is-fin"' : ''}><a href="#${r.id}" data-pa-aller="${r.id}">${icon(r.icone, 'icon')}<span>${t(r.label)}</span>${a ? `<span class="pa-rail-point" aria-hidden="true"></span><span class="sr-only">, ${t(a)}</span>` : ''}</a></li>`;
  }).join('')}<li class="pa-rail-indic" aria-hidden="true" data-pa-indic></li></ul>`;
  majRail(false);
}
function majRail(anime = true): void {
  let actif: HTMLElement | null = null;
  for (const a of $$('[data-pa-aller]', $('[data-pa-rail]') ?? document)) {
    if (a.dataset.paAller === ui.rubrique) {
      a.setAttribute('aria-current', 'location');
      actif = a;
    } else a.removeAttribute('aria-current');
  }
  const indic = $('[data-pa-indic]');
  if (!indic || !actif) return;
  indic.classList.toggle('is-fixe', !anime);
  const li = actif.parentElement as HTMLElement;
  indic.style.setProperty('--x', `${li.offsetLeft}px`);
  indic.style.setProperty('--y', `${li.offsetTop}px`);
  indic.style.setProperty('--w', `${li.offsetWidth}px`);
  indic.style.setProperty('--h', `${li.offsetHeight}px`);
  indic.classList.toggle('is-danger', ui.rubrique === 'suppression');
  // Sur mobile, la rubrique active reste visible dans le rail horizontal.
  const liste = $('.pa-rail-liste');
  if (liste && liste.scrollWidth > liste.clientWidth + 2) {
    const cible = li.offsetLeft - (liste.clientWidth - li.offsetWidth) / 2;
    liste.scrollTo({ left: cible, behavior: anime ? doux() : 'auto' });
  }
}

/* Rubrique Compte ---------------------------------------------------------------------------------- */

function compteHTML(): string {
  if (!p) return '';
  const aConfirmer = lectureSeuleEmail();
  const attente = p.changementEmail;
  const pseudo = ligne({
    cle: 'pseudo',
    titre: 'Pseudo',
    valeur: `<p class="pa-valeur">${t(p.pseudo)}</p>`,
    aide: `Adresse de votre profil : <a href="${esc(ROUTES.profil(p.pseudo))}">/membres/${t(p.pseudo)}</a>`,
    action: modifier('pseudo', 'Modifier', 'le pseudo'),
  });
  const adresse = ligne({
    cle: 'email',
    titre: 'Adresse e-mail',
    valeur:
      `<p class="pa-valeur pa-valeur-ligne"><span class="pa-coupe">${t(p.email)}</span>${aConfirmer ? statut('attention', 'alert', 'À confirmer') : statut('ok', 'check-circle', 'Confirmée')}</p>` +
      (attente
        ? `<div class="pa-attente"><p class="pa-attente-quoi">${icon('clock', 'icon-sm')}<span><b>${t(attente.email)}</b> en attente de confirmation</span></p><p class="pa-aide">${t(`Lien envoyé le ${dateEtHeure(attente.envoyeLe)}, valable 24 heures. D’ici là, votre adresse actuelle reste active${aConfirmer ? '' : ' ; elle a reçu une alerte du changement'}.`)}</p><div class="pa-attente-actions"><button class="btn btn-quiet btn-sm" type="button" data-pa-email-renvoyer>${icon('replay', 'icon-sm')}Renvoyer le lien</button><button class="btn btn-quiet btn-sm" type="button" data-pa-email-annuler>Annuler le changement</button></div></div>`
        : ''),
    aide: attente
      ? ''
      : aConfirmer
        ? t('Ouvrez le lien reçu à l’inscription pour publier, voter et répondre.')
        : t('Jamais visible sur votre profil public.'),
    action: attente
      ? ''
      : `${aConfirmer ? '<button class="btn btn-quiet btn-sm" type="button" data-acces-bouton="email">Renvoyer le lien</button>' : ''}${modifier('email', 'Modifier', 'l’adresse e-mail')}`,
  });
  const f = fuseau();
  const suggestion =
    fuseauAppareil && fuseauAppareil !== f.id
      ? FUSEAUX_HORAIRES.find((x) => x.id === fuseauAppareil)
      : undefined;
  const fuseauLigne = ligne({
    cle: 'fuseau',
    titre: '<label for="pa-fuseau">Fuseau horaire</label>',
    valeur: `<div class="pa-select"><select id="pa-fuseau" data-pa-fuseau aria-describedby="pa-a-fuseau">${FUSEAUX_HORAIRES.map((x) => `<option value="${x.id}"${x.id === f.id ? ' selected' : ''}>${t(`${x.ville} (${decalage(x.id)})`)}</option>`).join('')}</select>${icon('chevron-down', 'icon-sm')}</div>`,
    aide: `${t(`Il est ${heureDans(f.id)} à ${f.ville}. Les horaires des défis et des notifications suivent ce fuseau.`)}${suggestion ? ` <button class="lien" type="button" data-pa-fuseau-appareil="${suggestion.id}">${t(`Utiliser ${suggestion.ville}, le fuseau de cet appareil`)}</button>` : ''}`,
  });
  const profilLigne = ligne({
    cle: 'profil',
    titre: 'Profil public',
    valeur: `<p class="pa-valeur">${t('Photo, biographie et lien personnel')}</p>`,
    aide: t(
      'Ils se modifient depuis votre profil, avec un aperçu de ce que voient les autres membres.',
    ),
    action: `<a class="btn btn-quiet btn-sm" href="${esc(ROUTES.profil(p.pseudo))}">Ouvrir mon profil${icon('arrow', 'icon-sm')}</a>`,
  });
  return `<div class="pa-lignes">${pseudo}${adresse}${fuseauLigne}${profilLigne}</div>`;
}

/* Rubrique Connexion et sécurité ------------------------------------------------------------------- */

function activite(a: ParametresApi['appareils'][number]): string {
  if (a.actuel)
    return `<span class="pa-actif"><i aria-hidden="true"></i>${t('Actif maintenant')}</span>`;
  const n = joursEcoules(a.derniereActivite);
  return t(
    `Dernière activité ${jourRelatif(a.derniereActivite)}${n <= 1 ? ` à ${heure(a.derniereActivite)}` : ''}`,
  );
}
function appareilsHTML(): string {
  if (!p) return '';
  const autres = p.appareils.filter((a) => !a.actuel);
  const nom = (a: ParametresApi['appareils'][number]) => a.nom ?? 'Navigateur non reconnu';
  return `<section class="pa-groupe" aria-labelledby="pa-g-appareils">${groupeTitre('appareils', 'monitor', 'Appareils connectés')}
      <ul class="pa-appareils">${p.appareils
        .map(
          (a) => `<li class="pa-appareil" data-pa-appareil="${esc(a.cle)}">
        <span class="pa-appareil-icone" aria-hidden="true">${icon(a.telephone ? 'phone' : 'monitor', 'icon')}</span>
        <div><p class="pa-appareil-nom">${t(nom(a))}${a.actuel ? `<span class="pa-ici">${t('Cet appareil')}</span>` : ''}</p><p class="pa-aide">${a.lieu ? `${t(a.lieu)}<i aria-hidden="true">·</i>` : ''}${activite(a)}</p></div>
        ${a.actuel ? '' : `<button class="btn btn-quiet btn-sm" type="button" data-pa-sortir="${esc(a.cle)}">${t('Déconnecter')}<span class="sr-only"> ${t(nom(a))}</span></button>`}
      </li>`,
        )
        .join('')}</ul>
      ${autres.length > 1 ? `<div class="pa-groupe-pied"><button class="btn btn-secondary btn-sm" type="button" data-pa-sortir-tous>${icon('logout', 'icon-sm')}${t('Déconnecter les autres appareils')}</button></div>` : autres.length ? '' : `<p class="pa-groupe-note">${t('Votre compte n’est ouvert que sur cet appareil.')}</p>`}
    </section>`;
}
function securiteHTML(): string {
  if (!p) return '';
  const intro = `<div class="pa-methodes"><p>${t('Vous vous connectez uniquement avec :')}</p><ul><li>${icon('mail', 'icon-sm')}${t('Adresse e-mail et mot de passe')}</li></ul></div>`;
  const mdp = ligne({
    cle: 'mdp',
    titre: 'Mot de passe',
    valeur:
      '<p class="pa-valeur pa-secret"><span aria-hidden="true">••••••••••••</span><span class="sr-only">Mot de passe défini</span></p>',
    aide: t(
      p.motDePasseModifieLe
        ? `Modifié le ${dateLongue(p.motDePasseModifieLe)}`
        : `Défini à l’inscription, le ${dateLongue(p.dateInscription)}`,
    ),
    action: modifier('mdp', 'Modifier', 'le mot de passe'),
  });
  return `${intro}<div class="pa-lignes">${mdp}</div>${appareilsHTML()}`;
}

/* Rubrique Notifications -------------------------------------------------------------------------- */

function notificationsHTML(): string {
  if (!p) return '';
  const actif = p.notifications.email;
  const choix = p.notifications.evenements;
  const aConfirmer = lectureSeuleEmail();
  const intro = `<p class="pa-intro">${t('Vos notifications arrivent toujours dans Vysora. Choisissez celles que vous recevez aussi par e-mail, à')} <b>${t(p.email)}</b>.</p>`;
  const aide = aConfirmer ? t('Confirmez votre adresse e-mail pour les recevoir.') : '';
  const matrice = `<div class="pa-matrice-zone${actif ? '' : ' is-inactive'}"><table class="pa-matrice">
        <caption class="sr-only">${t('Notifications reçues dans Vysora et par e-mail')}</caption>
        <thead><tr><th scope="col">${t('Événement')}</th><th scope="col">${t('Dans Vysora')}</th><th scope="col">${t('Par e-mail')}</th></tr></thead>
        ${EVENEMENTS.map(
          (g) =>
            `<tbody><tr class="pa-matrice-groupe"><th scope="rowgroup" colspan="3">${icon(g.icone, 'icon-sm')}${t(g.titre)}</th></tr>${g.items
              .map(
                (i) => `<tr${ui.flash === `evt:${i.id}` ? ' class="is-flash"' : ''}>
          <th scope="row">${t(i.label)}</th>
          <td><span class="pa-toujours-app">${icon('check', 'icon-sm')}<span class="sr-only">${t('Toujours')}</span></span></td>
          <td>${toujours(i.types) ? `<span class="pa-toujours">${icon('lock', 'icon-xs')}${t('Toujours')}</span>` : interrupteur(`evt:${i.id}`, actif && i.types.every((type) => choix[type]), '', { label: `${i.label}, par e-mail`, inactif: !actif })}</td>
        </tr>`,
              )
              .join('')}</tbody>`,
        ).join('')}
      </table></div>`;
  const corps = `<div class="pa-lignes">${ligne({
    cle: 'emails',
    titre: 'Notifications par e-mail',
    aide:
      aide ||
      t(
        actif
          ? 'Selon vos choix ci-dessous. Les e-mails liés à votre compte sont toujours envoyés.'
          : 'Désactivées : vos notifications restent visibles dans Vysora.',
      ),
    action: interrupteur('emails', actif, 'pa-t-emails', { decrit: 'pa-a-emails' }),
  })}</div>${matrice}`;
  const toujoursEnvoyes = `<section class="pa-groupe" aria-labelledby="pa-g-toujours">${groupeTitre('toujours', 'lock', 'Toujours envoyés par e-mail')}
      <p class="pa-groupe-note">${t('Ils concernent la sécurité de votre compte et vos droits.')}</p>
      <ul class="pa-colonnes">${EMAILS_TOUJOURS.map((x) => `<li>${icon('mail', 'icon-sm')}${t(x)}</li>`).join('')}</ul></section>`;
  return `${intro}${corps}${toujoursEnvoyes}<p class="pa-renvoi"><a href="${ROUTES.notifications}">${t('Ouvrir mes notifications')}${icon('arrow', 'icon-sm')}</a></p>`;
}

/* Rubrique Mes données ----------------------------------------------------------------------------- */

function donneesHTML(): string {
  if (!p) return '';
  const visibilite = `<section class="pa-groupe" aria-labelledby="pa-g-visibilite">${groupeTitre('visibilite', 'eye', 'Qui voit quoi')}
      <table class="pa-visibilite"><caption class="sr-only">${t('Qui voit vos informations')}</caption>
        <thead><tr><th scope="col">${t('Information')}</th><th scope="col">${icon('users', 'icon-sm')}${t('Tout le monde')}</th><th scope="col">${icon('lock', 'icon-sm')}${t('Vous seul')}</th></tr></thead>
        <tbody>${VISIBILITE.map((v) => `<tr><th scope="row">${t(v.label)}</th><td>${v.public ? `${icon('check', 'icon')}<span class="sr-only">Oui</span>` : '<span class="sr-only">Non</span>'}</td><td>${v.public ? '<span class="sr-only">Non</span>' : `${icon('check', 'icon')}<span class="sr-only">Oui</span>`}</td></tr>`).join('')}</tbody>
      </table>
      <p class="pa-groupe-note">${t('Seuls les cookies strictement nécessaires au fonctionnement du site sont utilisés.')} <a href="${ROUTES.confidentialite}">${t('Politique de confidentialité')}</a></p>
    </section>`;
  const aAccepter = documents.filter((d) => d.aAccepter);
  const depuis = etats.dates().conditionsDepuis;
  const documentsHTML = `<section class="pa-groupe" aria-labelledby="pa-g-documents">${groupeTitre('documents', 'doc', 'Documents acceptés')}
      ${aAccepter.length ? `<div class="pa-accepter"><p>${t(`${aAccepter.length > 1 ? 'Les conditions générales et la charte communautaire ont changé' : `${aAccepter[0]?.type === 'CHARTE' ? 'La charte communautaire a changé' : 'Les conditions générales ont changé'}`}${depuis ? ` le ${dateLongue(depuis)}` : ''}. Acceptez-les pour continuer à publier et à participer.`)}</p><button class="btn btn-primary btn-sm" type="button" data-acces-bouton="conditions">${t('Accepter les nouvelles versions')}</button></div>` : ''}
      <div class="pa-lignes">${DOCUMENTS.map(({ type, href }) => {
        const doc = documents.find((d) => d.type === type);
        const titre = RESUMES_DOCUMENTS[CLE_DOCUMENT[type]].titre;
        if (!doc) return '';
        const etatDoc = doc.aAccepter
          ? statut('attention', 'alert', 'Nouvelle version à accepter')
          : doc.acceptationRequise
            ? statut('ok', 'check-circle', 'Acceptée')
            : statut('ok', 'check-circle', 'En vigueur');
        const changement = doc.resumeChangements
          ? `${doc.resumeChangements.charAt(0).toLowerCase()}${doc.resumeChangements.slice(1)}`
          : '';
        return ligne({
          cle: `doc-${type.toLowerCase()}`,
          niveau: 4,
          titre: t(titre),
          valeur: `<p class="pa-valeur pa-valeur-ligne"><span>${t(`Version du ${dateLongue(doc.dateEffet)}`)}</span>${etatDoc}</p>`,
          aide: doc.aAccepter && changement ? t(`Ce qui change : ${changement}`) : '',
          action: `<a class="btn btn-quiet btn-sm" href="${href}">Lire<span class="sr-only"> ${t(titre)}</span></a>`,
        });
      }).join('')}</div>
    </section>`;
  return `${visibilite}${documentsHTML}${exportHTML()}`;
}

function exportHTML(): string {
  if (!p) return '';
  const x = p.export;
  const c = x.contenu;
  const contenu: [string, number | null][] = [
    ['Compte et préférences', null],
    ['Acceptations des documents légaux', c.documents],
    ['Créations', c.creations],
    ['Sujets, réponses et commentaires', c.messages],
    ['Essais déclarés', c.essais],
    ['Cas Bon réflexe', c.cas],
    ['Votes émis', c.votes],
    ['Contenus enregistrés', c.enregistrements],
    ['Badges', c.badges],
    ['Mouvements de réputation', c.mouvements],
  ];
  const pret = x.etat === 'PRET';
  const arbre = `<div class="pa-fichier${pret ? ' is-pret' : ''}">
      <p class="pa-fichier-tete">${icon('fichier', 'icon')}<span class="pa-fichier-nom">${t(x.nomFichier)}</span><span class="pa-fichier-taille">JSON</span></p>
      <ul class="pa-arbre">${contenu.map(([label, n], i) => `<li style="--n:${i}"><span>${t(label)}</span>${n === null ? '' : `<b>${fmt(n)}</b>`}</li>`).join('')}</ul>
    </div>`;
  const demande = x.dateDemande ? dateEtHeure(x.dateDemande) : '';
  const limite = x.expiration ? dateLongue(x.expiration) : '';
  let etapes: [string, string][] = [
    ['Demande envoyée', demande],
    ['Préparation', x.etat === 'PREPARATION' ? 'En cours' : 'Terminée'],
    x.etat === 'EXPIRE' ? ['Lien expiré', limite] : ['Prêt à télécharger', `Jusqu’au ${limite}`],
  ];
  const atteinte = { PREPARATION: 1, PRET: 2, EXPIRE: 2, AUCUN: -1 }[x.etat];
  if (atteinte < 0)
    etapes = [
      ['Votre demande', 'Un fichier à jour à chaque demande'],
      ['Préparation', 'Un e-mail vous prévient'],
      ['Téléchargement', `Lien valable ${DELAIS.lienExportJours} jours`],
    ];
  const frise = `<ol class="pa-etapes" data-pa-etape="${x.etat.toLowerCase()}">${etapes.map(([label, info], i) => `<li class="${i < atteinte ? 'is-fait' : i === atteinte ? 'is-courant' : ''}"${i === atteinte ? ' aria-current="step"' : ''}><span class="pa-etape-point" aria-hidden="true">${i < atteinte || (i === atteinte && pret) ? icon('check', 'icon-xs') : ''}</span><b>${t(label)}</b><small>${t(info)}</small></li>`).join('')}</ol>`;
  let action: string;
  if (x.etat === 'PREPARATION') {
    action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><div class="pa-progres" aria-hidden="true"><span></span></div><p><b>${t('Préparation de votre fichier…')}</b> ${t(`Nous vous écrivons à ${masquerEmail(p.email)} dès qu’il est prêt. Une seule demande peut être en cours à la fois.`)}</p></div>`;
  } else if (pret) {
    action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><p><b>${t('Votre fichier est prêt.')}</b> ${t(`Le lien reste valable jusqu’au ${limite}.`)}</p><div class="pa-export-actions"><a class="btn btn-primary" href="/api/v1/moi/export/fichier" download="${esc(x.nomFichier)}" data-pa-telecharger>${icon('download', 'icon-sm')}${t('Télécharger')}</a><button class="btn btn-quiet btn-sm" type="button" data-pa-export-demander>${t('Demander un nouvel export')}</button></div></div>`;
  } else if (x.etat === 'EXPIRE') {
    action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><p><b>${t(`Le lien de téléchargement a expiré le ${limite}.`)}</b> ${t('Demandez un nouvel export pour obtenir un fichier à jour.')}</p><div class="pa-export-actions"><button class="btn btn-primary" type="button" data-pa-export-demander>${icon('download', 'icon-sm')}${t('Demander un nouvel export')}</button></div></div>`;
  } else {
    action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><div class="pa-export-actions"><button class="btn btn-primary" type="button" data-pa-export-demander>${icon('download', 'icon-sm')}${t('Demander l’export')}</button></div></div>`;
  }
  return `<section class="pa-groupe pa-export" aria-labelledby="pa-g-export" id="export">${groupeTitre('export', 'download', 'Exporter mes données')}
      <p class="pa-groupe-note">${t(`Un fichier JSON avec tout ce que Vysora conserve sur vous, préparé à votre demande. Le lien de téléchargement reste valable ${DELAIS.lienExportJours} jours.`)}</p>
      <div class="pa-export-grille">${arbre}<div class="pa-export-cote">${frise}${action}</div></div>
    </section>`;
}

/* Rubrique Supprimer le compte ---------------------------------------------------------------------- */

const plusJours = (date: Date, n: number) => new Date(date.getTime() + n * 86_400_000);

function friseSuppression(fin: Date, creations: 'garder' | 'supprimer' | null = null): string {
  const derniere =
    creations === 'supprimer'
      ? `Vos données personnelles et vos créations sont supprimées. Vos autres contributions sont signées ${ANONYME}.`
      : creations === 'garder'
        ? `Vos données personnelles sont effacées. Vos contributions restent, signées ${ANONYME}.`
        : `Vos données personnelles sont effacées. Vos contributions restent, signées par un pseudo anonyme comme ${ANONYME}, sauf si vous demandez aussi la suppression de vos créations.`;
  return `<ol class="pa-frise">
      <li class="is-maintenant"><span class="pa-frise-point" aria-hidden="true"></span><b>${t('Aujourd’hui')}</b><p>${t('Votre session est fermée et votre profil n’est plus accessible aux autres membres.')}</p></li>
      <li><span class="pa-frise-point" aria-hidden="true"></span><b>${t(`Jusqu’au ${dateLongue(plusJours(fin, -1))}`)}</b><p>${t('Il suffit de vous reconnecter pour annuler la demande : rien n’est perdu.')}</p></li>
      <li class="is-fin"><span class="pa-frise-point" aria-hidden="true"></span><b>${t(`Le ${dateLongue(fin)}`)}</b><p>${t(derniere)}</p></li>
    </ol>`;
}
function suppressionHTML(): string {
  const fin = plusJours(new Date(), DELAIS.retractationSuppressionJours);
  const avant = ligne({
    cle: 'copie',
    titre: 'Copie de vos données',
    valeur: `<p class="pa-valeur">${t('Gardez vos créations et votre activité avant de partir.')}</p>`,
    action: `<a class="btn btn-quiet btn-sm" href="#export" data-pa-vers-export>${t('Exporter mes données')}</a>`,
  });
  const suppr = ligne({
    cle: 'suppression',
    titre: 'Supprimer mon compte',
    valeur: `<p class="pa-valeur">${t('Vous confirmez avec votre mot de passe.')}</p>`,
    action: modifier('suppression', 'Supprimer mon compte', '', 'btn-danger-contour'),
  });
  return `<p class="pa-intro">${t(`Après votre demande, votre compte reste récupérable pendant ${DELAIS.retractationSuppressionJours} jours.`)}</p>${friseSuppression(fin)}<div class="pa-lignes">${avant}${suppr}</div>`;
}

/* Formulaires --------------------------------------------------------------------------------------- */

function champMdp(
  id: string,
  label: string,
  autocomplete: string,
  { jaugeMdp = false, oubli = false, voir = 'le mot de passe' } = {},
): string {
  return `<div class="champ">
      <label for="${id}">${t(label)}</label>
      <div class="saisie a-oeil" data-mdp>
        <input id="${id}" name="${autocomplete}" type="password" autocomplete="${autocomplete}" required aria-describedby="${[jaugeMdp && `${id}-aide`, `${id}-maj`, `${id}-erreur`].filter(Boolean).join(' ')}">
        <button class="saisie-oeil" type="button" aria-controls="${id}" aria-pressed="false" aria-label="${esc(`Afficher ${voir}`)}" data-voir></button>
      </div>
      ${jaugeMdp ? `<div class="force-ligne"><div class="force" data-force aria-hidden="true"><span></span><span></span><span></span><span></span></div><p class="message force-texte" id="${id}-aide" data-aide-mdp>${t('12 caractères minimum')}</p></div><p class="sr-only" aria-live="polite" data-annonce></p>` : ''}
      <p class="message is-alerte" id="${id}-maj" hidden>${icon('info')}Majuscules verrouillées</p>
      <p class="message is-erreur" id="${id}-erreur" hidden></p>
      ${oubli ? `<button class="lien pa-oubli" type="button" data-pa-oubli>${t('Mot de passe oublié ?')}</button>` : ''}
    </div>`;
}
const identifiant = () =>
  `<input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(p?.email ?? '')}" tabindex="-1" aria-hidden="true" readonly>`;
const pied = (cle: Cle, envoyer: string, classe = 'btn-primary') =>
  `<div class="pa-alerte" role="alert" data-pa-alerte hidden></div>
    <div class="pa-garde" role="alertdialog" aria-labelledby="pa-garde-${cle}" data-pa-garde hidden></div>
    <div class="pa-form-pied"><button class="btn btn-quiet" type="button" data-pa-annuler>Annuler</button><button class="btn ${classe}" type="submit">${t(envoyer)}</button></div>`;
const MOTIF_PSEUDO = /^[A-Za-z0-9_-]*$/;

function surveillerPseudo(form: HTMLFormElement): void {
  const input = form.elements.namedItem('pseudo') as Champ;
  const icone = $('[data-pa-pseudo-etat]', form)!;
  const aide = $('#pa-pseudo-aide', form)!;
  const zone = $('[data-pa-propositions]', form)!;
  const annonce = $('[data-pa-pseudo-annonce]', form)!;
  const adresse = $('[data-pa-pseudo-url]', form)!;
  const AIDE = aide.textContent ?? '';
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  let demande = 0;
  const afficher = (e: string) => {
    icone.dataset.etat = e;
    icone.innerHTML =
      e === 'libre' ? icon('check') : ['pris', 'invalide'].includes(e) ? icon('alert') : '';
  };
  function verifier(): void {
    clearTimeout(minuterie);
    demande += 1;
    const v = input.value;
    adresse.textContent = v || (p?.pseudo ?? '');
    zone.hidden = true;
    zone.innerHTML = '';
    aide.className = 'message';
    aide.textContent = AIDE;
    aide.hidden = false;
    if (!v || v === p?.pseudo || v.length < 3) {
      afficher('');
      erreur(input);
      return;
    }
    if (!MOTIF_PSEUDO.test(v)) {
      afficher('invalide');
      aide.hidden = true;
      erreur(input, 'Utilisez seulement des lettres, des chiffres, le tiret et le tiret bas.');
      return;
    }
    erreur(input);
    afficher('verification');
    const numero = demande;
    minuterie = setTimeout(async () => {
      const reponse = await api<DisponibilitePseudo>(
        'GET',
        `/api/v1/pseudos/${encodeURIComponent(v)}/disponibilite`,
      );
      if (numero !== demande || !reponse.ok) {
        if (numero === demande) afficher('');
        return;
      }
      const r = reponse.donnees;
      if (r.disponible) {
        afficher('libre');
        aide.className = 'message is-ok';
        aide.innerHTML = `${icon('check')}<span>Disponible</span>`;
        annonce.textContent = `${v} est disponible.`;
        return;
      }
      afficher(r.motif === 'format' ? 'invalide' : 'pris');
      aide.hidden = true;
      erreur(
        input,
        r.motif === 'reserve'
          ? 'Ce pseudo est réservé. Choisissez-en un autre.'
          : 'Ce pseudo est déjà pris.',
      );
      const liste = r.propositions.slice(0, 3);
      zone.hidden = !liste.length;
      zone.innerHTML = liste.length
        ? `<span>Disponibles :</span>${liste.map((s) => `<button class="proposition" type="button" data-pa-proposition="${esc(s)}">${t(s)}</button>`).join('')}`
        : '';
      annonce.textContent = liste.length
        ? 'Ce pseudo n’est pas disponible. Des pseudos disponibles sont proposés.'
        : 'Ce pseudo n’est pas disponible.';
    }, 450);
  }
  input.addEventListener('input', () => {
    const position = input.selectionStart ?? input.value.length;
    const propre = input.value.normalize('NFC').replace(/\s/g, '-');
    if (propre !== input.value) {
      input.value = propre;
      input.setSelectionRange(position, position);
    }
    verifier();
  });
  zone.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-pa-proposition]');
    if (!bouton) return;
    input.value = bouton.dataset.paProposition ?? '';
    ui.sale = true;
    verifier();
    input.focus();
  });
}

const champ = (form: HTMLFormElement, nom: string) => form.elements.namedItem(nom) as Champ | null;

interface Formulaire {
  rubrique: IdRubrique;
  html: () => string;
  monter: (form: HTMLFormElement) => void;
  envoyer: (form: HTMLFormElement, bouton: HTMLButtonElement) => Promise<void>;
}

const FORMS: Record<Cle, Formulaire> = {
  pseudo: {
    rubrique: 'compte',
    html: () => `<form class="pa-form" data-pa-form="pseudo" novalidate>
        <div class="champ">
          <label for="pa-pseudo">${t('Nouveau pseudo')}</label>
          <div class="saisie a-etat"><input id="pa-pseudo" name="pseudo" value="${esc(p?.pseudo ?? '')}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="30" required aria-describedby="pa-pseudo-aide pa-pseudo-erreur"><span class="saisie-etat" data-pa-pseudo-etat aria-hidden="true"></span></div>
          <p class="message" id="pa-pseudo-aide">${t('3 à 30 caractères : lettres, chiffres, tirets.')}</p>
          <p class="message is-erreur" id="pa-pseudo-erreur" hidden></p>
          <div class="propositions" data-pa-propositions hidden></div>
          <p class="sr-only" aria-live="polite" data-pa-pseudo-annonce></p>
        </div>
        <p class="pa-note">${icon('link', 'icon-sm')}<span>${t('Votre profil deviendra')} <b>/membres/<span data-pa-pseudo-url>${t(p?.pseudo ?? '')}</span></b>. ${t('Les liens qui utilisent votre pseudo actuel ne fonctionneront plus.')}</span></p>
        ${pied('pseudo', 'Enregistrer le pseudo')}
      </form>`,
    monter: (form) => {
      surveillerPseudo(form);
      champ(form, 'pseudo')?.select();
    },
    async envoyer(form, bouton) {
      const input = champ(form, 'pseudo')!;
      const v = input.value.trim();
      const message = !v
        ? 'Saisissez un pseudo.'
        : !MOTIF_PSEUDO.test(v)
          ? 'Utilisez seulement des lettres, des chiffres, le tiret et le tiret bas.'
          : v.length < 3
            ? 'Utilisez au moins 3 caractères.'
            : v === p?.pseudo
              ? 'C’est déjà votre pseudo. Saisissez-en un autre.'
              : input.getAttribute('aria-invalid') === 'true'
                ? ($('#pa-pseudo-erreur', form)?.textContent ?? '')
                : '';
      erreur(input, message);
      if (message) {
        premierInvalide(form);
        return;
      }
      const reponse = await enregistrer(
        form,
        bouton,
        () => api<SessionApi>('PATCH', '/api/v1/moi', { pseudo: v }),
        { champs: { pseudo: input } },
      );
      if (!reponse) return;
      etats.appliquer(reponse);
      if (p) p = { ...p, pseudo: v };
      terminer('pseudo', `Pseudo modifié : ${v}.`);
    },
  },
  email: {
    rubrique: 'compte',
    html: () => `<form class="pa-form" data-pa-form="email" novalidate>
        <div class="champ">
          <label for="pa-email">${t('Nouvelle adresse e-mail')}</label>
          <div class="saisie"><input id="pa-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required aria-describedby="pa-email-erreur pa-email-suggestion"></div>
          <p class="message is-erreur" id="pa-email-erreur" hidden></p>
          <p class="message" id="pa-email-suggestion" hidden></p>
        </div>
        ${identifiant()}${champMdp('pa-email-mdp', 'Mot de passe actuel', 'current-password', { oubli: true, voir: 'le mot de passe actuel' })}
        <p class="pa-note">${icon('info', 'icon-sm')}<span>${t(lectureSeuleEmail() ? 'Un lien de confirmation part vers la nouvelle adresse. Votre adresse actuelle reste celle du compte jusqu’à la confirmation.' : 'Un lien de confirmation part vers la nouvelle adresse. Votre adresse actuelle reste active jusqu’à la confirmation, et reçoit une alerte du changement.')}</span></p>
        ${pied('email', 'Envoyer le lien de confirmation')}
      </form>`,
    monter: (form) => surveillerEmail(champ(form, 'email')!),
    async envoyer(form, bouton) {
      const input = champ(form, 'email')!;
      const mdp = champ(form, 'current-password')!;
      let message = messageEmail(input.value);
      if (!message && input.value.trim().toLowerCase() === p?.email.toLowerCase())
        message = 'C’est déjà l’adresse de votre compte.';
      erreur(input, message);
      erreur(mdp, mdp.value ? '' : 'Saisissez votre mot de passe actuel.');
      if (premierInvalide(form)) return;
      const nouvelle = input.value.trim();
      const reponse = await enregistrer(
        form,
        bouton,
        () =>
          api<ParametresApi>('POST', '/api/v1/moi/email', {
            email: nouvelle,
            motDePasse: mdp.value,
          }),
        { texte: 'Envoi…', champs: { email: input, motDePasse: mdp } },
      );
      if (!reponse) return;
      p = reponse;
      terminer('email', `Lien de confirmation envoyé à ${nouvelle}.`, 'mail');
    },
  },
  mdp: {
    rubrique: 'securite',
    html: () => `<form class="pa-form" data-pa-form="mdp" novalidate>
        ${identifiant()}
        ${champMdp('pa-mdp-actuel', 'Mot de passe actuel', 'current-password', { oubli: true, voir: 'le mot de passe actuel' })}
        ${champMdp('pa-mdp-nouveau', 'Nouveau mot de passe', 'new-password', { jaugeMdp: true, voir: 'le nouveau mot de passe' })}
        ${(p?.appareils.length ?? 0) > 1 ? `<label class="pa-case"><input type="checkbox" name="deconnecter" checked><span>${t('Déconnecter mes autres appareils')}</span></label>` : ''}
        ${pied('mdp', 'Enregistrer le mot de passe')}
      </form>`,
    monter: (form) => {
      jauge(champ(form, 'new-password')!, () => ({ pseudo: p?.pseudo, email: p?.email }));
    },
    async envoyer(form, bouton) {
      const actuel = champ(form, 'current-password')!;
      const nouveau = champ(form, 'new-password')!;
      const evaluation = evaluerMotDePasse(nouveau.value, { pseudo: p?.pseudo, email: p?.email });
      let message =
        evaluation.etat === 'vide'
          ? 'Choisissez un nouveau mot de passe.'
          : messageMotDePasse(evaluation);
      if (!message && nouveau.value === actuel.value)
        message = 'Choisissez un mot de passe différent de l’actuel.';
      erreur(actuel, actuel.value ? '' : 'Saisissez votre mot de passe actuel.');
      erreur(nouveau, message);
      if (premierInvalide(form)) return;
      const deconnecter =
        (form.elements.namedItem('deconnecter') as Champ | null)?.checked ?? false;
      const reponse = await enregistrer(
        form,
        bouton,
        () =>
          api<ParametresApi>('PUT', '/api/v1/moi/mot-de-passe', {
            actuel: actuel.value,
            nouveau: nouveau.value,
            deconnecterAutres: deconnecter,
          }),
        { champs: { actuel, nouveau } },
      );
      if (!reponse) return;
      p = reponse;
      terminer(
        'mdp',
        deconnecter
          ? 'Mot de passe modifié. Vos autres appareils sont déconnectés.'
          : 'Mot de passe modifié.',
        'lock',
      );
    },
  },
  suppression: {
    rubrique: 'suppression',
    html: () => {
      const n = p?.creationsPubliees ?? 0;
      const choix = n
        ? `<fieldset class="pa-options">
            <legend>${t(n > 1 ? `Vos ${fmt(n)} créations publiées` : 'Votre création publiée')}</legend>
            <label class="pa-option"><input type="radio" name="creations" value="garder" checked><span><b>${t(n > 1 ? 'Les conserver sous un pseudo anonyme' : 'La conserver sous un pseudo anonyme')}</b><small>${t(n > 1 ? `Elles restent consultables, signées ${ANONYME}, avec leurs essais et leurs variantes.` : `Elle reste consultable, signée ${ANONYME}, avec ses essais et ses variantes.`)}</small></span></label>
            <label class="pa-option"><input type="radio" name="creations" value="supprimer"><span><b>${t(n > 1 ? 'Les supprimer aussi' : 'La supprimer aussi')}</b><small>${t(n > 1 ? 'Leurs commentaires et leurs essais disparaissent ; les variantes indiquent « Création source supprimée ».' : 'Ses commentaires et ses essais disparaissent ; ses variantes indiquent « Création source supprimée ».')}</small></span></label>
          </fieldset>`
        : `<p class="pa-note">${icon('info', 'icon-sm')}<span>${t(`Vous n’avez publié aucune création. Vos réponses, commentaires et essais seront signés ${ANONYME}.`)}</span></p>`;
      return `<form class="pa-form is-danger" data-pa-form="suppression" novalidate>
          ${choix}${identifiant()}${champMdp('pa-suppr-mdp', 'Confirmez avec votre mot de passe', 'current-password', { oubli: true })}
          ${pied('suppression', 'Supprimer mon compte', 'btn-danger')}
        </form>`;
    },
    monter: () => {},
    async envoyer(form, bouton) {
      const mdp = champ(form, 'current-password')!;
      erreur(mdp, mdp.value ? '' : 'Saisissez votre mot de passe pour confirmer.');
      if (premierInvalide(form)) return;
      const creations =
        ((form.elements.namedItem('creations') as RadioNodeList | null)?.value as
          'garder' | 'supprimer' | undefined) ?? 'garder';
      const adresse = { email: p?.email ?? '', verifie: p?.emailVerifie ?? false };
      const reponse = await enregistrer(
        form,
        bouton,
        () =>
          api<SuppressionDemandeeApi>('POST', '/api/v1/moi/suppression', {
            motDePasse: mdp.value,
            supprimerCreations: creations === 'supprimer',
          }),
        { texte: 'Suppression…', champs: { motDePasse: mdp } },
      );
      if (!reponse) return;
      ui.sale = false;
      fermerEdition({ focus: false, rendre: false });
      partir(new Date(reponse.dateEffacement), creations, adresse);
    },
  },
};

/* Enregistrement ------------------------------------------------------------------------------------- */

function occupe(bouton: HTMLButtonElement, on: boolean, texte = ''): void {
  if (on) {
    bouton.dataset.paLibelle = bouton.innerHTML;
    bouton.style.minWidth = `${bouton.offsetWidth}px`;
    bouton.innerHTML = `<span class="pa-roue" aria-hidden="true"></span>${t(texte)}`;
    bouton.disabled = true;
    bouton.closest('form')?.setAttribute('aria-busy', 'true');
  } else if (bouton.dataset.paLibelle !== undefined) {
    bouton.innerHTML = bouton.dataset.paLibelle;
    delete bouton.dataset.paLibelle;
    bouton.style.minWidth = '';
    bouton.disabled = false;
    bouton.closest('form')?.removeAttribute('aria-busy');
  }
}

/** Session terminée ailleurs : la page est rendue de nouveau, en visiteuse. */
function sessionTerminee(probleme: ProblemeApi): boolean {
  if (probleme.status !== 401) return false;
  location.reload();
  return true;
}

/** Envoi d'un formulaire : erreurs de l'API sous leurs champs, ou message dans le formulaire. */
async function enregistrer<T>(
  form: HTMLFormElement,
  bouton: HTMLButtonElement,
  appel: () => Promise<ReponseApi<T>>,
  { texte = 'Enregistrement…', champs = {} as Record<string, Champ> } = {},
): Promise<T | null> {
  const zone = $('[data-pa-alerte]', form);
  alerte(zone, '');
  occupe(bouton, true, texte);
  const reponse = await appel();
  if (!form.isConnected) return null;
  occupe(bouton, false);
  if (reponse.ok) return reponse.donnees;
  const { probleme } = reponse;
  if (sessionTerminee(probleme)) return null;
  const erreurs = probleme.erreurs ?? {};
  const places = Object.entries(erreurs).filter(([nom]) => champs[nom]);
  for (const [nom, message] of places) erreur(champs[nom]!, message);
  if (places.length) {
    premierInvalide(form);
    return null;
  }
  const detail =
    probleme.code === 'ERREUR_INTERNE'
      ? '<b>Enregistrement impossible.</b> La connexion a été interrompue. Vos saisies sont conservées : réessayez dans un instant.'
      : `<b>${t(probleme.detail ?? probleme.title)}</b>`;
  alerte(zone, typo(detail));
  bouton.focus();
  return null;
}

/* Ouverture et fermeture des formulaires ---------------------------------------------------------- */

const formOuvert = () => (ui.edition ? $<HTMLFormElement>(`[data-pa-form="${ui.edition}"]`) : null);
const premierChamp = (form: HTMLElement | null) =>
  form
    ? $$<HTMLInputElement>('input, select, textarea', form).find(
        (el) =>
          el.type !== 'hidden' && el.tabIndex !== -1 && !el.disabled && el.offsetParent !== null,
      )
    : undefined;

function ouvrirEdition(cle: Cle): void {
  if (!FORMS[cle] || !membre()) return;
  if (ui.edition === cle) {
    premierChamp(formOuvert())?.focus();
    return;
  }
  if (ui.edition && ui.sale) {
    demanderAbandon(() => ouvrirEdition(cle));
    return;
  }
  fermerEdition({ focus: false });
  ui.edition = cle;
  ui.sale = false;
  const f = FORMS[cle]!;
  rendreRubrique(f.rubrique);
  const slot = $(`[data-pa-slot="${cle}"]`);
  if (!slot) return;
  slot.innerHTML = f.html();
  const form = formOuvert();
  if (!form) return;
  motDePasse(form);
  f.monter(form);
  form.scrollIntoView({ block: 'nearest', behavior: doux() });
  premierChamp(form)?.focus({ preventScroll: true });
}
function fermerEdition({ focus = true, rendre = true } = {}): void {
  const cle = ui.edition;
  if (!cle) return;
  ui.edition = null;
  ui.sale = false;
  ui.garde = null;
  if (rendre) rendreRubrique(FORMS[cle]!.rubrique);
  if (focus) $(`[data-pa-modifier="${cle}"]`)?.focus();
}
function demanderAbandon(suite: () => void): void {
  const form = formOuvert();
  if (!form) {
    suite();
    return;
  }
  ui.garde = suite;
  const zone = $('[data-pa-garde]', form)!;
  zone.innerHTML = `<p id="${zone.getAttribute('aria-labelledby')}">${t('Abandonner la modification en cours ?')}</p><div><button class="btn btn-quiet btn-sm" type="button" data-pa-garde-non>${t('Continuer la modification')}</button><button class="btn btn-secondary btn-sm" type="button" data-pa-garde-oui>Abandonner</button></div>`;
  zone.hidden = false;
  zone.scrollIntoView({ block: 'nearest', behavior: doux() });
  $('[data-pa-garde-non]', zone)?.focus();
}
/** Après un enregistrement réussi : la ligne se referme, puis montre brièvement « Enregistré ». */
function terminer(cle: Cle, message: string, ic = 'check'): void {
  ui.edition = null;
  ui.sale = false;
  eclairer(cle);
  toast(message, ic);
}
function eteindre(): void {
  ui.minuteurFlash = setTimeout(() => {
    ui.flash = null;
    for (const el of $$('[data-pa-fait]')) el.remove();
    for (const el of $$('.pa-ligne.is-flash, tr.is-flash')) el.classList.remove('is-flash');
  }, 2600);
}
function eclairer(cle: Cle): void {
  clearTimeout(ui.minuteurFlash);
  ui.flash = cle;
  render();
  const ligneEl = $(`[data-pa-ligne="${cle}"]`);
  if (ligneEl)
    (
      $('[data-pa-modifier], .pa-ligne-action button, .pa-ligne-action a', ligneEl) ??
      $('button, a, select', ligneEl)
    )?.focus({ preventScroll: true });
  eteindre();
}

/* Choix enregistrés immédiatement (fuseau, e-mails) : la valeur change tout de suite, puis revient
   en arrière si l'enregistrement échoue. */
async function enregistrerChoix<T>({
  appliquer,
  annuler,
  appel,
  apres,
  message,
  ic,
  cle,
  cible,
}: {
  appliquer: () => void;
  annuler: () => void;
  appel: () => Promise<ReponseApi<T>>;
  apres?: (donnees: T) => void;
  message: string;
  ic: string;
  cle: Cle;
  cible: string;
}): Promise<void> {
  const rubrique = rubriqueDe(cle);
  appliquer();
  rendreRubrique(rubrique);
  focaliser(cible);
  const reponse = await appel();
  if (!reponse.ok) {
    if (sessionTerminee(reponse.probleme)) return;
    annuler();
    rendreRubrique(rubrique);
    focaliser(cible);
    toast('Modification non enregistrée. Vérifiez votre connexion, puis réessayez.', 'wifi-off');
    return;
  }
  apres?.(reponse.donnees);
  clearTimeout(ui.minuteurFlash);
  ui.flash = cle;
  rendreRubrique(rubrique);
  focaliser(cible);
  eteindre();
  toast(message, ic);
}
const rubriqueDe = (cle: Cle): IdRubrique =>
  cle.startsWith('evt:') || cle === 'emails'
    ? 'notifications'
    : cle === 'mdp'
      ? 'securite'
      : cle === 'suppression'
        ? 'suppression'
        : 'compte';
const focaliser = (selecteur: string) => $(selecteur)?.focus({ preventScroll: true });

/* Rendu ---------------------------------------------------------------------------------------------- */

const CONTENUS: Record<IdRubrique, () => string> = {
  compte: compteHTML,
  securite: securiteHTML,
  notifications: notificationsHTML,
  donnees: donneesHTML,
  suppression: suppressionHTML,
};
function rubriqueHTML(r: (typeof RUBRIQUES)[number]): string {
  return `<section class="pa-rubrique${r.id === 'suppression' ? ' is-danger' : ''}" id="${r.id}" aria-labelledby="pa-h-${r.id}" data-pa-rubrique="${r.id}">
      <h2 class="pa-rubrique-titre" id="pa-h-${r.id}" tabindex="-1">${t(r.label)}</h2>
      <div class="pa-rubrique-corps" data-pa-corps-rubrique>${CONTENUS[r.id]()}</div>
    </section>`;
}
/* Le formulaire ouvert dans une ligne est déplacé tel quel d'un rendu à l'autre : saisies et focus gardés. */
function garderFormulaire(portee: ParentNode) {
  if (!ui.edition) return null;
  const form = $(`[data-pa-form="${ui.edition}"]`, portee);
  return form
    ? {
        form,
        actif: form.contains(document.activeElement)
          ? (document.activeElement as HTMLElement)
          : null,
      }
    : null;
}
function replacerFormulaire(garde: ReturnType<typeof garderFormulaire>): void {
  if (!garde) return;
  const slot = $(`[data-pa-slot="${ui.edition}"]`);
  if (!slot) return;
  slot.replaceChildren(garde.form);
  garde.actif?.focus({ preventScroll: true });
}
function rendreRubrique(id: IdRubrique): void {
  const section = document.getElementById(id);
  if (!section || !membre()) return;
  const garde = garderFormulaire(section);
  const corps = $('[data-pa-corps-rubrique]', section);
  if (corps) corps.innerHTML = CONTENUS[id]();
  replacerFormulaire(garde);
  rendreRail();
}
function render(): void {
  rendreTete();
  const acces = $('[data-pa-acces]');
  const corps = $('[data-pa-corps]');
  const rubriques = $('[data-pa-rubriques]');
  if (!acces || !corps || !rubriques) return;
  if (!membre()) {
    if (etats.membre() && !p) {
      // Paramètres illisibles (API indisponible) : la page le dit et propose de réessayer.
      corps.hidden = true;
      acces.hidden = false;
      acces.innerHTML = `<div class="pa-depart"><span class="pa-depart-icone" aria-hidden="true">${icon('wifi-off', 'icon')}</span><h2>${t('Vos paramètres sont momentanément indisponibles')}</h2><p class="pa-depart-texte">${t('Vérifiez votre connexion, puis rechargez la page.')}</p><div class="pa-depart-actions"><button class="btn btn-primary" type="button" data-pa-recharger>${t('Recharger la page')}</button></div></div>`;
    }
    return;
  }
  acces.hidden = true;
  acces.innerHTML = '';
  corps.hidden = false;
  const garde = garderFormulaire(rubriques);
  rubriques.innerHTML = RUBRIQUES.map(rubriqueHTML).join('');
  replacerFormulaire(garde);
  rendreRail();
  $$('.pa-rubrique').forEach((el, i) => el.style.setProperty('--i', String(i + 1)));
  $$('.pa-rail-liste > li').forEach((el, i) => el.style.setProperty('--i', String(i)));
}

/* Départ ---------------------------------------------------------------------------------------------- */

/** Demande enregistrée : la session est fermée, la page devient celle du départ (prototype). */
function partir(
  fin: Date,
  creations: 'garder' | 'supprimer',
  { email, verifie }: { email: string; verifie: boolean },
): void {
  clearTimeout(ui.suiviExport);
  p = null;
  passerEnVisiteur();
  // Ce qui suppose une session disparaît : bandeau du compte, fil d'Ariane vers le profil.
  for (const bandeau of $$('[data-etat-bandeau]')) bandeau.remove();
  const ariane = $('[data-pa-ariane] li a');
  if (ariane) {
    ariane.textContent = 'Accueil';
    ariane.setAttribute('href', ROUTES.accueil);
  }
  const acces = $('[data-pa-acces]');
  const corps = $('[data-pa-corps]');
  const qui = $('[data-pa-qui]');
  if (!acces || !corps) return;
  if (qui) qui.hidden = true;
  corps.hidden = true;
  acces.hidden = false;
  // L'API n'écrit qu'à une adresse confirmée (une adresse jamais confirmée peut être celle d'un tiers).
  acces.innerHTML = `<div class="pa-depart">
      <span class="pa-depart-icone" aria-hidden="true">${icon('clock', 'icon')}</span>
      <h2 tabindex="-1" data-pa-depart-titre>${t(`Votre compte sera supprimé le ${dateLongue(fin)}`)}</h2>
      ${verifie ? `<p class="pa-depart-texte">${t(`Un e-mail de confirmation a été envoyé à ${masquerEmail(email)}.`)}</p>` : ''}
      ${friseSuppression(fin, creations)}
      <p class="pa-depart-retour">${t(`Vous changez d’avis ? Reconnectez-vous avant le ${dateLongue(fin)} : votre compte sera conservé tel quel.`)}</p>
      <div class="pa-depart-actions"><a class="btn btn-primary" href="${ROUTES.connexion}?retour=${encodeURIComponent(ROUTES.parametres)}">${t('Se reconnecter')}</a><a class="btn btn-secondary" href="${ROUTES.accueil}">${t('Retour à l’accueil')}</a></div>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('[data-pa-depart-titre]')?.focus({ preventScroll: true });
}

/* Navigation entre rubriques ------------------------------------------------------------------------ */

function allerA(id: IdRubrique, { cible = '' } = {}): void {
  ui.rubrique = id;
  history.replaceState(null, '', `${location.pathname}${location.search}#${cible || id}`);
  majRail();
  const el = (cible ? document.getElementById(cible) : null) ?? document.getElementById(id);
  if (el)
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - decalageHaut(),
      behavior: doux(),
    });
  const titre = cible ? $(`#pa-g-${cible}`) : $(`#pa-h-${id}`);
  titre?.focus({ preventScroll: true });
}
let defile = false;
function suivreDefilement(): void {
  defile = false;
  if (!membre()) return;
  const ligneHaut = decalageHaut() + 120;
  let courant: IdRubrique = RUBRIQUES[0].id;
  for (const r of RUBRIQUES) {
    const el = document.getElementById(r.id);
    if (el && el.getBoundingClientRect().top <= ligneHaut) courant = r.id;
  }
  const derniere = document.getElementById('suppression');
  if (derniere && derniere.getBoundingClientRect().bottom < window.innerHeight - 40)
    courant = 'suppression';
  if (courant !== ui.rubrique) {
    ui.rubrique = courant;
    majRail();
  }
}
window.addEventListener(
  'scroll',
  () => {
    if (!defile) {
      defile = true;
      requestAnimationFrame(suivreDefilement);
    }
  },
  { passive: true },
);
window.addEventListener('resize', () => majRail(false));

/* Actions ----------------------------------------------------------------------------------------- */

async function sortir(cles: string[] | 'tous'): Promise<void> {
  if (!p) return;
  const appareils = p.appareils;
  const ids = cles === 'tous' ? appareils.filter((a) => !a.actuel).map((a) => a.cle) : cles;
  const reponse =
    cles === 'tous'
      ? await api<ParametresApi>('DELETE', '/api/v1/moi/sessions')
      : await api<ParametresApi>(
          'DELETE',
          `/api/v1/moi/sessions/${encodeURIComponent(cles[0] ?? '')}`,
        );
  if (!reponse.ok && reponse.probleme.status !== 404) {
    if (sessionTerminee(reponse.probleme)) return;
    toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'wifi-off');
    return;
  }
  const lignes = ids
    .map((cle) => $(`[data-pa-appareil="${CSS.escape(cle)}"]`))
    .filter((el): el is HTMLElement => el !== null);
  const finir = async () => {
    if (reponse.ok) p = reponse.donnees;
    else {
      const relu = await api<ParametresApi>('GET', '/api/v1/moi/parametres');
      if (relu.ok) p = relu.donnees;
    }
    rendreRubrique('securite');
    ($('[data-pa-sortir]') ?? $('#pa-g-appareils'))?.focus({ preventScroll: true });
    const noms = appareils.filter((a) => ids.includes(a.cle));
    toast(
      noms.length > 1
        ? `${noms.length} appareils déconnectés.`
        : `${noms[0]?.nom ?? 'Appareil'} : déconnecté.`,
      'logout',
    );
  };
  if (!animations.completes() || !lignes.length) {
    void finir();
    return;
  }
  const anims = lignes.map((li) =>
    li.animate(
      [
        { opacity: 1, height: `${li.offsetHeight}px` },
        { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
    ),
  );
  void anims[0]?.finished.then(finir);
}

/** Préparation de l'export : la page suit la demande quelques minutes, sans attendre l'e-mail. */
function suivreExport(essai = 0): void {
  clearTimeout(ui.suiviExport);
  if (essai > 40) return;
  ui.suiviExport = setTimeout(
    async () => {
      if (!membre() || p?.export.etat !== 'PREPARATION') return;
      const reponse = await api<ParametresApi>('GET', '/api/v1/moi/parametres');
      if (!reponse.ok) {
        suivreExport(essai + 1);
        return;
      }
      if (reponse.donnees.export.etat === 'PREPARATION') {
        suivreExport(essai + 1);
        return;
      }
      const dedans = $('[data-pa-export-etat]')?.contains(document.activeElement) ?? false;
      p = reponse.donnees;
      rendreRubrique('donnees');
      if (dedans) $('[data-pa-telecharger]')?.focus({ preventScroll: true });
      toast('Vos données sont prêtes à télécharger.', 'download');
    },
    essai < 5 ? 1500 : 5000,
  );
}
let exportEnCours = false;
async function demanderExport(bouton: HTMLButtonElement): Promise<void> {
  if (exportEnCours || p?.export.etat === 'PREPARATION') return;
  exportEnCours = true;
  occupe(bouton, true, 'Envoi…');
  const reponse = await api<ParametresApi>('POST', '/api/v1/moi/export');
  exportEnCours = false;
  if (bouton.isConnected) occupe(bouton, false);
  if (!reponse.ok) {
    if (sessionTerminee(reponse.probleme)) return;
    toast(
      reponse.probleme.status === 409
        ? (reponse.probleme.detail ?? reponse.probleme.title)
        : reponse.probleme.code === 'TROP_DE_REQUETES'
          ? 'Trop de demandes. Réessayez dans un moment.'
          : 'La demande n’a pas abouti. Réessayez dans un instant.',
      'alert',
    );
    return;
  }
  p = reponse.donnees;
  rendreRubrique('donnees');
  $('[data-pa-export-etat]')?.focus({ preventScroll: true });
  if (p.export.etat === 'PRET') {
    toast('Vos données sont prêtes à télécharger.', 'download');
    return;
  }
  toast('Demande envoyée. Nous vous prévenons par e-mail dès que le fichier est prêt.', 'mail');
  suivreExport();
}

async function emailEnAttente(action: 'renvoyer' | 'annuler', bouton: HTMLButtonElement) {
  if (!p) return;
  const nouvelle = p.changementEmail?.email ?? '';
  bouton.disabled = true;
  const reponse =
    action === 'renvoyer'
      ? await api<ParametresApi>('POST', '/api/v1/moi/email/renvoi')
      : await api<ParametresApi>('DELETE', '/api/v1/moi/email');
  if (bouton.isConnected) bouton.disabled = false;
  if (!reponse.ok) {
    if (sessionTerminee(reponse.probleme)) return;
    toast(
      reponse.probleme.code === 'TROP_DE_REQUETES'
        ? 'Trop de demandes. Réessayez dans quelques minutes.'
        : (reponse.probleme.detail ?? 'L’envoi n’a pas abouti. Réessayez dans un instant.'),
      'alert',
    );
    return;
  }
  p = reponse.donnees;
  if (action === 'renvoyer') {
    toast(`Nouveau lien envoyé à ${nouvelle}.`, 'mail');
    return;
  }
  rendreRubrique('compte');
  $('[data-pa-modifier="email"]')?.focus({ preventScroll: true });
  toast(`Changement annulé : votre adresse reste ${p.email}.`, 'mail');
}

async function motDePasseOublie(): Promise<void> {
  if (!p) return;
  const reponse = await api('POST', '/api/v1/mot-de-passe/oubli', { email: p.email });
  toast(
    reponse.ok
      ? `Lien de réinitialisation envoyé à ${masquerEmail(p.email)}.`
      : 'L’envoi n’a pas abouti. Réessayez dans un instant.',
    reponse.ok ? 'mail' : 'alert',
  );
}

function basculer(bouton: HTMLButtonElement): void {
  if (!p) return;
  const id = bouton.dataset.paSwitch ?? '';
  const valeur = bouton.getAttribute('aria-checked') !== 'true';
  const cible = `[data-pa-switch="${id}"]`;
  const appliquerPreferences = (preferences: PreferencesNotificationsApi) => {
    if (p) p = { ...p, notifications: preferences };
  };
  if (id === 'emails') {
    void enregistrerChoix({
      appliquer: () => p && (p.notifications = { ...p.notifications, email: valeur }),
      annuler: () => p && (p.notifications = { ...p.notifications, email: !valeur }),
      appel: () =>
        api<PreferencesNotificationsApi>('PUT', '/api/v1/moi/preferences-notifications', {
          email: valeur,
        }),
      apres: appliquerPreferences,
      message: valeur
        ? 'Vous recevrez aussi ces notifications par e-mail.'
        : 'Vos notifications ne vous seront plus envoyées par e-mail.',
      ic: 'mail',
      cle: 'emails',
      cible,
    });
    return;
  }
  const item = EVENEMENTS.flatMap((g) => g.items).find((i) => `evt:${i.id}` === id);
  if (!item) return;
  const avant = { ...p.notifications.evenements };
  const choix = Object.fromEntries(item.types.map((type) => [type, valeur]));
  void enregistrerChoix({
    appliquer: () =>
      p &&
      (p.notifications = {
        ...p.notifications,
        evenements: { ...p.notifications.evenements, ...choix },
      }),
    annuler: () => p && (p.notifications = { ...p.notifications, evenements: avant }),
    appel: () =>
      api<PreferencesNotificationsApi>('PUT', '/api/v1/moi/preferences-notifications', {
        evenements: choix,
      }),
    apres: appliquerPreferences,
    message: `${item.label} : ${valeur ? 'envoyés aussi par e-mail' : 'plus d’e-mail'}.`,
    ic: 'mail',
    cle: id,
    cible,
  });
}
function choisirFuseau(id: string, cible: string): void {
  if (!p) return;
  const avant = p.fuseauHoraire;
  const f = FUSEAUX_HORAIRES.find((x) => x.id === id);
  if (!f || id === avant) return;
  void enregistrerChoix({
    appliquer: () => p && (p.fuseauHoraire = id),
    annuler: () => p && (p.fuseauHoraire = avant),
    appel: () => api<SessionApi>('PATCH', '/api/v1/moi', { fuseauHoraire: id }),
    message: `Fuseau horaire : ${f.ville}.`,
    ic: 'clock',
    cle: 'fuseau',
    cible,
  });
}

document.addEventListener('click', (evenement) => {
  const el = (evenement.target as Element).closest<HTMLElement>(
    '[data-pa-modifier], [data-pa-annuler], [data-pa-aller], [data-pa-switch], [data-pa-sortir], [data-pa-sortir-tous], [data-pa-export-demander], [data-pa-telecharger], [data-pa-email-renvoyer], [data-pa-email-annuler], [data-pa-oubli], [data-pa-garde-oui], [data-pa-garde-non], [data-pa-vers-export], [data-pa-fuseau-appareil], [data-pa-recharger]',
  );
  if (!el) return;
  const d = el.dataset;
  if (d.paModifier !== undefined) ouvrirEdition(d.paModifier);
  else if (d.paAnnuler !== undefined) fermerEdition();
  else if (d.paAller !== undefined) {
    if (
      (evenement as MouseEvent).button !== 0 ||
      evenement.metaKey ||
      evenement.ctrlKey ||
      evenement.shiftKey
    )
      return;
    evenement.preventDefault();
    allerA(d.paAller as IdRubrique);
  } else if (d.paVersExport !== undefined) {
    evenement.preventDefault();
    allerA('donnees', { cible: 'export' });
  } else if (d.paGardeNon !== undefined) {
    const zone = el.closest<HTMLElement>('[data-pa-garde]');
    if (zone) zone.hidden = true;
    ui.garde = null;
    premierChamp(formOuvert())?.focus();
  } else if (d.paGardeOui !== undefined) {
    const suite = ui.garde;
    ui.sale = false;
    ui.garde = null;
    if (suite) suite();
    else fermerEdition();
  } else if (d.paSwitch !== undefined) basculer(el as HTMLButtonElement);
  else if (d.paSortir !== undefined) void sortir([d.paSortir]);
  else if (d.paSortirTous !== undefined) void sortir('tous');
  else if (d.paExportDemander !== undefined) void demanderExport(el as HTMLButtonElement);
  else if (d.paTelecharger !== undefined) toast('Téléchargement de vos données.', 'download');
  else if (d.paEmailRenvoyer !== undefined)
    void emailEnAttente('renvoyer', el as HTMLButtonElement);
  else if (d.paEmailAnnuler !== undefined) void emailEnAttente('annuler', el as HTMLButtonElement);
  else if (d.paOubli !== undefined) void motDePasseOublie();
  else if (d.paFuseauAppareil !== undefined) choisirFuseau(d.paFuseauAppareil, '#pa-fuseau');
  else if (d.paRecharger !== undefined) location.reload();
});

document.addEventListener('change', (evenement) => {
  const el = evenement.target as HTMLElement;
  if (el.matches('[data-pa-fuseau]')) choisirFuseau((el as HTMLSelectElement).value, '#pa-fuseau');
});

document.addEventListener('submit', (evenement) => {
  const form = (evenement.target as Element).closest<HTMLFormElement>('[data-pa-form]');
  if (!form) return;
  evenement.preventDefault();
  const bouton = $<HTMLButtonElement>('button[type="submit"]', form);
  if (!bouton || bouton.disabled) return;
  void FORMS[form.dataset.paForm ?? '']?.envoyer(form, bouton);
});
document.addEventListener('input', (evenement) => {
  const cible = evenement.target as HTMLInputElement;
  if (cible.closest('[data-pa-form]') && cible.name !== 'username') ui.sale = true;
});
document.addEventListener('keydown', (evenement) => {
  if (evenement.key !== 'Escape' || !ui.edition) return;
  if (!formOuvert()?.contains(document.activeElement)) return;
  if (ui.sale) demanderAbandon(() => fermerEdition());
  else fermerEdition();
});
window.addEventListener('beforeunload', (evenement) => {
  if (!ui.sale) return;
  evenement.preventDefault();
});

/* Conditions acceptées depuis la rubrique « Mes données » ou le bandeau : documents relus. */
document.addEventListener(DOCUMENTS_ACCEPTES, async () => {
  const reponse = await api<DocumentLegalApi[]>('GET', '/api/v1/documents-legaux');
  if (reponse.ok) documents = reponse.donnees;
  rendreRubrique('donnees');
});

/* Retour du lien de confirmation d'une nouvelle adresse (?adresse=…, posé par le serveur). */
const ISSUES_ADRESSE: Record<string, [string, string]> = {
  confirmee: [
    'Votre nouvelle adresse e-mail est confirmée : elle est désormais celle de votre compte.',
    'check',
  ],
  expiree: [
    'Ce lien de confirmation n’est plus valable. Demandez un nouveau lien depuis la rubrique Compte.',
    'alert',
  ],
  prise: ['Cette adresse est déjà associée à un compte Vysora.', 'alert'],
};
const issue = ISSUES_ADRESSE[params.get('adresse') ?? ''];
if (issue) {
  params.delete('adresse');
  history.replaceState(
    null,
    '',
    `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`,
  );
}

root.classList.add('pa-entree');
render();
if (p?.export.etat === 'PREPARATION') suivreExport();
// Rubrique demandée (?rubrique=, #export du lien de l'e-mail) : atteinte sans animation, dès le
// rendu, sans attendre une image (une page en arrière-plan n'en dessine aucune).
if (demandee && membre()) {
  const el = document.getElementById(location.hash.slice(1) === 'export' ? 'export' : demandee);
  if (el)
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - decalageHaut(),
      behavior: 'instant',
    });
}
suivreDefilement();
if (issue) setTimeout(() => toast(issue[0], issue[1]), 300);
setTimeout(() => root.classList.remove('pa-entree'), 1400);
