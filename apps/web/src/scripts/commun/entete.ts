/* En-tête : progression et masquage au défilement, menu mobile, menu du compte, recherche
   (prototype/commun.js : initHeader, monterCompte et monterRecherche). Chargé par toutes les pages. */

import { estProblemeApi } from '@vysora/shared';
import { $, icon, lireMessageEnAttente, messageApresChargement, toast } from './outils';

const racine = document.documentElement;

function initialiserEntete(): void {
  const entete = $('[data-header]');
  if (!entete) return;
  const progression = $('[data-scroll-progress]', entete);
  const bouton = $<HTMLButtonElement>('.menu-toggle', entete);
  const panneau = $('#mobile-panel');
  let dernierY = window.scrollY;
  let enAttente = false;
  let menuOuvert = false;

  const image = () => {
    enAttente = false;
    const y = window.scrollY;
    const max = racine.scrollHeight - window.innerHeight;
    progression?.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
    entete.classList.toggle('is-scrolled', y > 8);
    if (!menuOuvert && !entete.contains(document.activeElement)) {
      if (y > dernierY + 6 && y > 480) entete.classList.add('is-hidden');
      else if (y < dernierY - 6 || y < 480) entete.classList.remove('is-hidden');
    }
    racine.toggleAttribute('data-header-hidden', entete.classList.contains('is-hidden'));
    dernierY = y;
  };
  const demander = () => {
    if (!enAttente) {
      enAttente = true;
      requestAnimationFrame(image);
    }
  };
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', demander);
  image();

  if (!bouton || !panneau) return;
  const regler = (ouvert: boolean) => {
    menuOuvert = ouvert;
    panneau.hidden = !ouvert;
    bouton.setAttribute('aria-expanded', String(ouvert));
    bouton.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    bouton.innerHTML = icon(ouvert ? 'close' : 'menu', '');
    entete.classList.remove('is-hidden');
  };
  bouton.addEventListener('click', () => regler(Boolean(panneau.hidden)));
  panneau.addEventListener('click', (evenement) => {
    if ((evenement.target as Element).closest('a')) regler(false);
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && menuOuvert) {
      regler(false);
      bouton.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1023 && menuOuvert) regler(false);
  });
}

function initialiserCompte(): void {
  const zone = $('.compte');
  const bouton = $<HTMLButtonElement>('[data-compte-btn]', zone ?? document);
  const menu = $('[data-compte-menu]', zone ?? document);
  if (!zone || !bouton || !menu) return;
  const regler = (ouvert: boolean) => {
    menu.hidden = !ouvert;
    bouton.setAttribute('aria-expanded', String(ouvert));
  };
  bouton.addEventListener('click', () => regler(Boolean(menu.hidden)));
  zone.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && !menu.hidden) {
      evenement.stopPropagation();
      regler(false);
      bouton.focus();
    }
  });
  zone.addEventListener('focusout', (evenement) => {
    if (!zone.contains(evenement.relatedTarget as Node | null)) regler(false);
  });
  // pointerdown plutôt que click : sur iPhone, toucher un texte inerte n'envoie pas toujours de
  // « click » jusqu'au document, et le menu resterait ouvert.
  document.addEventListener('pointerdown', (evenement) => {
    if (!zone.contains(evenement.target as Node)) regler(false);
  });

  const sortir = $<HTMLButtonElement>('[data-deconnexion]', menu);
  sortir?.addEventListener('click', async () => {
    sortir.disabled = true;
    try {
      const reponse = await fetch('/api/v1/session', { method: 'DELETE' });
      if (!reponse.ok && reponse.status !== 401) {
        const probleme: unknown = await reponse.json().catch(() => null);
        throw new Error(estProblemeApi(probleme) ? probleme.title : String(reponse.status));
      }
      // La page est rendue de nouveau par le serveur, pour une visiteuse ; le message suit.
      messageApresChargement('Vous êtes déconnecté.');
      location.reload();
    } catch {
      sortir.disabled = false;
      toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'alert');
    }
  });
}

function afficherMessageEnAttente(): void {
  const message = lireMessageEnAttente();
  if (!message) return;
  toast(message);
  // Comme dans le prototype : après la déconnexion, le focus revient sur « Se connecter ».
  $<HTMLElement>('.header-login')?.focus();
}

/* Recherche sur tout le site : la loupe ([data-recherche-ouvrir]) et Ctrl K (⌘ K) l'ouvrent. Son
   script et sa feuille de style (recherche.ts) se chargent au premier survol de la loupe ou après
   le chargement de la page, puis servent aux ouvertures suivantes.
   Les champs de recherche des pages (accueil, Explorer, forum) et le bouton « Rechercher »
   d'Apprendre n'ont que l'aspect d'une saisie : ils portent eux aussi [data-recherche-ouvrir] et
   ouvrent cette même recherche, qui part de la loupe de l'en-tête, avec le texte qu'ils affichent
   (data-recherche-texte) ou la touche frappée sur le champ, sur l'onglet de leur page
   (data-recherche-portee : guides, forum, apprendre). */
let recherche: Promise<typeof import('./recherche')> | null = null;
const chargerRecherche = () => (recherche ??= import('./recherche'));
const loupeEnTete = () => $('.site-header [data-recherche-ouvrir]');

/** Ouvre la recherche du site depuis un déclencheur (loupe, champ d'une page). Les pages y mènent
 * la touche `/` en cliquant leur champ (`champ.click()`). */
function ouvrirRecherche(declencheur: Element | null, texte = ''): void {
  const portee = declencheur instanceof HTMLElement ? declencheur.dataset.recherchePortee : null;
  const depart = declencheur?.closest('.site-header')
    ? declencheur
    : (loupeEnTete() ?? declencheur);
  void chargerRecherche().then((r) => r.ouvrir(depart, { texte, portee }));
}

function initialiserRecherche(): void {
  const ouvrir = ouvrirRecherche;
  document.addEventListener('click', (evenement) => {
    const declencheur = (evenement.target as Element).closest('[data-recherche-ouvrir]');
    if (!declencheur) return;
    evenement.preventDefault();
    ouvrir(declencheur, (declencheur as HTMLElement).dataset.rechercheTexte ?? '');
  });
  const intention = (evenement: Event) => {
    if ((evenement.target as Element).closest?.('[data-recherche-ouvrir]'))
      void chargerRecherche().then((r) => r.prechauffer());
  };
  for (const type of ['pointerover', 'focusin', 'touchstart'])
    document.addEventListener(type, intention, { passive: true });
  document.addEventListener('keydown', (evenement) => {
    const champ = (evenement.target as Element).closest?.<HTMLElement>(
      '.champ-recherche[data-recherche-ouvrir]',
    );
    if (
      champ &&
      evenement.key.length === 1 &&
      evenement.key !== ' ' &&
      !evenement.ctrlKey &&
      !evenement.metaKey &&
      !evenement.altKey
    ) {
      evenement.preventDefault();
      ouvrir(champ, (champ.dataset.rechercheTexte ?? '') + evenement.key);
      return;
    }
    if (
      evenement.key.toLowerCase() !== 'k' ||
      !(evenement.ctrlKey || evenement.metaKey) ||
      evenement.altKey ||
      evenement.shiftKey
    )
      return;
    evenement.preventDefault();
    ouvrir(loupeEnTete() ?? $('[data-recherche-ouvrir]'));
  });
  const plusTard = (fn: () => void) =>
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(fn, { timeout: 4000 })
      : setTimeout(fn, 1500);
  const precharger = () => plusTard(() => void chargerRecherche());
  if (document.readyState === 'complete') precharger();
  else window.addEventListener('load', precharger, { once: true });
}

initialiserEntete();
initialiserCompte();
initialiserRecherche();
afficherMessageEnAttente();
