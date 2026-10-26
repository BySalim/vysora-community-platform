/* Zone du compte de l'en-tête, mise à jour sans rechargement (prototype/commun.js : rendreCompte) :
   pastille des notifications non lues, libellé du lien, point sur la photo, nombre du menu. */

import { ROUTES } from '../../lib/navigation';
import { etats } from './etats';
import { $, $$, animations } from './outils';

export function afficherNonLues(nombre: number): void {
  const avant = etats.nonLues();
  etats.definirNonLues(nombre);
  for (const zone of $$('.compte')) {
    $('[data-compte-notifs]', zone)?.setAttribute(
      'aria-label',
      nombre ? `Notifications, ${nombre} non lues` : 'Notifications',
    );
    const pastille = $('[data-compte-nb]', zone);
    if (pastille) {
      pastille.textContent = nombre ? String(nombre) : '';
      // Une notification de plus : la pastille rebondit (notifications.css, nt-bond).
      if (nombre > avant && animations.completes()) {
        pastille.classList.remove('nt-bond');
        void pastille.offsetWidth;
        pastille.classList.add('nt-bond');
      }
    }
    $('[data-compte-btn]', zone)?.classList.toggle('has-unread', nombre > 0);
    const lien = $(`.compte-liens a[href="${ROUTES.notifications}"]`, zone);
    if (lien) {
      $('.compte-nb', lien)?.remove();
      if (nombre)
        lien.insertAdjacentHTML(
          'beforeend',
          `<span class="compte-nb" aria-label="${nombre} non lues">${nombre}</span>`,
        );
    }
  }
}
