/* LEG-03 : choix sur les cookies (components/ChoixCookies.astro, FinalitesCookies.astro).
   - Panneau à onglets (Consentement, Détails, À propos) : « Tout refuser », « Personnaliser » (ouvre
     « Détails » et devient « Enregistrer mes choix »), « Tout accepter ». Les interrupteurs de
     « Détails » changent sans rien enregistrer jusqu'au bouton. Le lien « Gérer les cookies » du
     pied de page ([data-ck-gerer]) rouvre le panneau sur « Détails », avec un bouton de fermeture.
   - Page Cookies ([data-ck-choix]) : chaque interrupteur enregistre le choix aussitôt.
   Le choix est retenu 6 mois par le cookie vysora_consentement, sans prolongation ; il remplace
   l'ancien refus de la page Cookies (vysora_audience), effacé au passage. Le serveur du site et
   l'API le relisent à chaque page : le suivi d'une visite commence à la page suivante, et son cookie
   de visite est effacé par le serveur à la première page après un retrait. */

import {
  COOKIE_CONSENTEMENT,
  COOKIE_REFUS_AUDIENCE,
  DELAIS,
  audienceRefusee,
  lireChoixCookies,
  parcoursAccepte,
  valeurChoixCookies,
} from '@vysora/shared';
import { dateLongue } from '../../lib/texte';
import { $, $$, toast } from './outils';

export interface Choix {
  audience: boolean;
  parcours: boolean;
}

/** Événement du document après un choix (detail : Choix). */
export const COOKIES_CHOISIS = 'vysora:cookies-choisis';

const securise = () => (location.protocol === 'https:' ? '; Secure' : '');

/** Choix en vigueur : celui du cookie, sinon la mesure anonyme (sauf ancien refus) sans parcours. */
export const choixActuel = (): Choix => ({
  audience: !audienceRefusee(document.cookie),
  parcours: parcoursAccepte(document.cookie),
});

export function retenirChoix(choix: Choix): void {
  const maintenant = new Date();
  const fin = new Date(maintenant);
  fin.setMonth(fin.getMonth() + DELAIS.choixCookiesMois);
  const valeur = valeurChoixCookies({ ...choix, date: maintenant.toISOString().slice(0, 10) });
  document.cookie = `${COOKIE_CONSENTEMENT.nom}=${valeur}; Expires=${fin.toUTCString()}; Path=/; SameSite=Lax${securise()}`;
  document.cookie = `${COOKIE_REFUS_AUDIENCE.nom}=; Max-Age=0; Path=/; SameSite=Lax${securise()}`;
  document.dispatchEvent(new CustomEvent<Choix>(COOKIES_CHOISIS, { detail: choix }));
}

const interrupteurs = (zone: ParentNode) => $$<HTMLButtonElement>('[data-ck-finalite]', zone);

function poser(zone: ParentNode, choix: Choix): void {
  for (const bouton of interrupteurs(zone)) {
    const cle = bouton.dataset.ckFinalite as keyof Choix;
    bouton.setAttribute('aria-checked', String(choix[cle]));
  }
}

function lire(zone: ParentNode): Choix {
  const choix = choixActuel();
  for (const bouton of interrupteurs(zone))
    choix[bouton.dataset.ckFinalite as keyof Choix] =
      bouton.getAttribute('aria-checked') === 'true';
  return choix;
}

const basculer = (bouton: HTMLButtonElement) =>
  bouton.setAttribute('aria-checked', String(bouton.getAttribute('aria-checked') !== 'true'));

/* Panneau du choix ------------------------------------------------------------------------------ */

type Vue = 'consentement' | 'details' | 'apropos';
const panneau = $<HTMLDialogElement>('[data-ck-panneau]');
const onglets = panneau ? $$<HTMLButtonElement>('[data-ck-onglet]', panneau) : [];

function afficherVue(vue: Vue, { focus = false } = {}): void {
  if (!panneau) return;
  panneau.dataset.ckVue = vue;
  for (const onglet of onglets) {
    const actif = onglet.dataset.ckOnglet === vue;
    onglet.setAttribute('aria-selected', String(actif));
    onglet.tabIndex = actif ? 0 : -1;
    if (actif && focus) onglet.focus();
  }
  for (const zone of $$('[role="tabpanel"]', panneau)) zone.hidden = zone.id !== `ck-vue-${vue}`;
  // « Personnaliser » mène aux détails ; une fois dans les détails, il enregistre les choix.
  const bouton = $<HTMLElement>('.ck-personnaliser', panneau);
  const libelle = $('[data-ck-libelle]', panneau);
  if (bouton && libelle) {
    const details = vue === 'details';
    bouton.dataset.ckAction = details ? 'enregistrer' : 'personnaliser';
    libelle.textContent = details ? 'Enregistrer mes choix' : 'Personnaliser';
  }
}

function fermerPanneau(): void {
  if (!panneau?.open) return;
  panneau.close();
}

// Fenêtre fermée : le focus revient où il était (lien « Gérer les cookies »), sinon au contenu.
panneau?.addEventListener('close', () => {
  if (document.activeElement === document.body) $('#contenu')?.focus({ preventScroll: true });
});

// Échap ne ferme que la fenêtre rouverte depuis le pied de page : la première attend un choix. La
// touche est retenue dès keydown, car Chrome ignore le refus de « cancel » avant tout clic sur la page.
const premiere = () => Boolean(panneau && $('[data-ck-fermer]', panneau)?.hidden);
panneau?.addEventListener('keydown', (evenement) => {
  if (evenement.key === 'Escape' && premiere()) evenement.preventDefault();
});
panneau?.addEventListener('cancel', (evenement) => {
  if (premiere()) evenement.preventDefault();
});

// Aucun choix retenu pour la version en cours : la fenêtre s'ouvre, la page derrière est inerte.
if (panneau?.hasAttribute('data-ck-attendu')) panneau.showModal();

function choisir(choix: Choix): void {
  retenirChoix(choix);
  fermerPanneau();
  toast('Vos choix sont enregistrés.');
}

/** Rouvre le panneau sur ses détails (lien « Gérer les cookies »), avec un bouton de fermeture. */
export function ouvrirGestionCookies(): void {
  if (!panneau) return;
  poser(panneau, choixActuel());
  const fermer = $('[data-ck-fermer]', panneau);
  if (fermer) fermer.hidden = false;
  if (!panneau.open) panneau.showModal();
  afficherVue('details', { focus: true });
}

document.addEventListener('click', (evenement) => {
  const cible = evenement.target as Element;
  const interrupteur = cible.closest<HTMLButtonElement>('[data-ck-panneau] [data-ck-finalite]');
  if (interrupteur) {
    basculer(interrupteur);
    return;
  }
  const onglet = cible.closest<HTMLElement>('[data-ck-onglet]');
  if (onglet) {
    afficherVue(onglet.dataset.ckOnglet as Vue);
    return;
  }
  if (cible.closest('[data-ck-gerer]')) {
    evenement.preventDefault();
    ouvrirGestionCookies();
    return;
  }
  if (cible.closest('[data-ck-fermer]')) {
    fermerPanneau();
    return;
  }
  const action = cible.closest<HTMLElement>('[data-ck-action]')?.dataset.ckAction;
  if (action === 'refuser') choisir({ audience: false, parcours: false });
  else if (action === 'accepter') choisir({ audience: true, parcours: true });
  else if (action === 'personnaliser') afficherVue('details', { focus: true });
  else if (action === 'enregistrer' && panneau) choisir(lire(panneau));
});

// Onglets au clavier (flèches, début, fin).
panneau?.addEventListener('keydown', (evenement) => {
  const actuel = onglets.indexOf(evenement.target as HTMLButtonElement);
  if (actuel < 0) return;
  const suivant =
    evenement.key === 'ArrowRight'
      ? (actuel + 1) % onglets.length
      : evenement.key === 'ArrowLeft'
        ? (actuel - 1 + onglets.length) % onglets.length
        : evenement.key === 'Home'
          ? 0
          : evenement.key === 'End'
            ? onglets.length - 1
            : -1;
  if (suivant < 0) return;
  evenement.preventDefault();
  afficherVue(onglets[suivant]?.dataset.ckOnglet as Vue, { focus: true });
});

/* Page Cookies : choix enregistré à chaque changement ------------------------------------------ */

function etatDuChoix(): string {
  const choix = lireChoixCookies(document.cookie);
  if (!choix || choix.version < COOKIE_CONSENTEMENT.version)
    return 'Aucun choix enregistré sur cet appareil : la mesure d’audience anonyme s’applique et vos parcours ne sont pas suivis.';
  const fin = new Date(`${choix.date}T12:00:00Z`);
  fin.setUTCMonth(fin.getUTCMonth() + DELAIS.choixCookiesMois);
  return `Choix enregistré sur cet appareil le ${dateLongue(choix.date)}, retenu jusqu’au ${dateLongue(fin)}.`;
}

const zonePage = $('[data-ck-choix]');
if (zonePage) {
  const etat = $('[data-ck-etat]', zonePage);
  const rafraichir = (choix: Choix) => {
    poser(zonePage, choix);
    if (etat) etat.textContent = etatDuChoix();
  };
  zonePage.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLButtonElement>('[data-ck-finalite]');
    if (!bouton) return;
    basculer(bouton);
    const choix = lire(zonePage);
    retenirChoix(choix);
    fermerPanneau();
    const active = bouton.getAttribute('aria-checked') === 'true';
    toast(
      bouton.dataset.ckFinalite === 'audience'
        ? active
          ? 'Vos visites sont de nouveau comptées.'
          : 'Vos visites ne sont plus comptées.'
        : active
          ? 'Le parcours de vos visites sera suivi à partir de la page suivante.'
          : 'Le parcours de vos visites n’est plus suivi.',
    );
  });
  document.addEventListener(COOKIES_CHOISIS, (evenement) =>
    rafraichir((evenement as CustomEvent<Choix>).detail),
  );
  rafraichir(choixActuel());
}
