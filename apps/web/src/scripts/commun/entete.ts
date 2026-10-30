/* En-tête : progression et masquage au défilement, menu mobile, menu du compte
   (prototype/commun.js : initHeader et monterCompte). Chargé par toutes les pages. */

import { $, icon, toast } from './outils';

const racine = document.documentElement;
/** Message à montrer après le rechargement de la page (déconnexion). */
const CLE_MESSAGE = 'vysora-message';

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
  document.addEventListener('click', (evenement) => {
    if (!zone.contains(evenement.target as Node)) regler(false);
  });

  // F-03 : la session de cet appareil est fermée, puis la page se recharge pour une visiteuse.
  const sortir = $<HTMLButtonElement>('[data-deconnexion]', menu);
  sortir?.addEventListener('click', async () => {
    sortir.disabled = true;
    try {
      const reponse = await fetch('/api/v1/session', {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
      try {
        sessionStorage.setItem(CLE_MESSAGE, 'Vous êtes déconnecté.');
      } catch {
        // Stockage indisponible : la page se recharge sans message.
      }
      location.reload();
    } catch {
      sortir.disabled = false;
      toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'alert');
    }
  });
}

function afficherMessageEnAttente(): void {
  try {
    const message = sessionStorage.getItem(CLE_MESSAGE);
    if (!message) return;
    sessionStorage.removeItem(CLE_MESSAGE);
    toast(message);
  } catch {
    // Stockage indisponible : rien à afficher.
  }
}

initialiserEntete();
initialiserCompte();
afficherMessageEnAttente();
