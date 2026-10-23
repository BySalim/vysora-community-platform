/* Outils des scripts de page, repris de prototype/commun.js (window.Vysora) :
   sélecteurs, icônes, notification passagère, typographie du contenu affiché. */

import { icon, t, typo } from '../../lib/texte';

export { esc, fmt, icon, pluriel, t, typo } from '../../lib/texte';

export const $ = <E extends Element = HTMLElement>(
  selecteur: string,
  zone: ParentNode = document,
) => zone.querySelector<E>(selecteur);
export const $$ = <E extends Element = HTMLElement>(
  selecteur: string,
  zone: ParentNode = document,
) => [...zone.querySelectorAll<E>(selecteur)];

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
