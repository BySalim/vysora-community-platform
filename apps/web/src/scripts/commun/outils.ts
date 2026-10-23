/* Outils des scripts de page, repris de prototype/commun.js (window.Vysora) :
   sélecteurs, icônes, notification passagère, typographie du contenu affiché. */

import { t, typo } from '../../lib/texte';

export { esc, fmt, pluriel, t, typo } from '../../lib/texte';

export const $ = <E extends Element = HTMLElement>(
  selecteur: string,
  zone: ParentNode = document,
) => zone.querySelector<E>(selecteur);
export const $$ = <E extends Element = HTMLElement>(
  selecteur: string,
  zone: ParentNode = document,
) => [...zone.querySelectorAll<E>(selecteur)];

/** Icône du sprite de la page : <svg class="icon icon-sm"><use href="#i-nom"/></svg>. */
export const icon = (nom: string, classe = 'icon-sm') =>
  `<svg class="icon ${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;

let minuterieToast: ReturnType<typeof setTimeout> | undefined;
/** Message bref en bas de l'écran (zone [data-toast], annoncée aux lecteurs d'écran). */
export function toast(message: string, nomIcone = 'check'): void {
  const zone = $('[data-toast]');
  if (!zone) return;
  clearTimeout(minuterieToast);
  zone.innerHTML = `${icon(nomIcone)}<span>${t(message)}</span>`;
  requestAnimationFrame(() => requestAnimationFrame(() => zone.classList.add('is-visible')));
  minuterieToast = setTimeout(() => {
    zone.classList.remove('is-visible');
    setTimeout(() => {
      if (!zone.classList.contains('is-visible')) zone.textContent = '';
    }, 400);
  }, 2600);
}

/** Applique la typographie française aux textes d'une zone (hors code et champs de saisie). */
export function corrigerTypographie(zone: Node): void {
  const parcours = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, {
    acceptNode: (noeud) =>
      noeud.parentElement?.closest('script, style, pre, code, textarea')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const noeuds: Node[] = [];
  while (parcours.nextNode()) noeuds.push(parcours.currentNode);
  for (const noeud of noeuds) {
    const corrige = typo(noeud.nodeValue ?? '');
    if (corrige !== noeud.nodeValue) noeud.nodeValue = corrige;
  }
}

/** Niveau d'animation effectif (préférence de l'appareil comprise). */
export const animations = {
  niveau: () => document.documentElement.getAttribute('data-motion-effective') ?? 'full',
  completes: () =>
    (document.documentElement.getAttribute('data-motion-effective') ?? 'full') === 'full',
};

const CLE_MESSAGE = 'vysora-message';

/** Message à montrer une fois la page suivante chargée (déconnexion, puis rechargement). */
export function messageApresChargement(message: string): void {
  try {
    sessionStorage.setItem(CLE_MESSAGE, message);
  } catch {
    // Stockage indisponible (navigation privée stricte) : le message est simplement perdu.
  }
}

/** Message laissé par la page précédente, lu une seule fois. */
export function lireMessageEnAttente(): string | null {
  try {
    const message = sessionStorage.getItem(CLE_MESSAGE);
    if (message) sessionStorage.removeItem(CLE_MESSAGE);
    return message;
  } catch {
    return null;
  }
}
