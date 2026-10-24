/* Fiche création (CREA-03), portée de prototype/fiche-creation.js : copie des prompts (F-24),
   partage du lien (F-26), image en grand, fenêtres, section courante de la navigation.
   Le contenu est rendu par le serveur ; les actions qui écrivent (vote, essai, commentaire,
   signalement) arrivent avec leurs tâches. */

import { $, $$, toast } from './commun/outils';

const fiche = $('.creation-shell');

if (fiche && fiche.dataset.affichage === 'creation') {
  const agent = fiche.hasAttribute('data-alerte-agent');
  const messageCopie = () =>
    agent
      ? 'Prompt copié. Relisez les instructions avant de les confier à un agent.'
      : 'Prompt copié.';

  async function copier(texte: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texte);
      toast(message, 'copy');
    } catch {
      toast('Copie indisponible. Sélectionnez le texte pour le copier.', 'alert');
    }
  }

  // F-24 : le texte exact du prompt, tel que l'auteur l'a saisi.
  for (const bouton of $$('[data-copy]'))
    bouton.addEventListener('click', () => {
      void copier($('#prompt-text')?.textContent ?? '', messageCopie());
    });
  for (const bouton of $$('[data-step-copy]'))
    bouton.addEventListener('click', () => {
      void copier($(`#step-prompt-${bouton.dataset.stepCopy}`)?.textContent ?? '', messageCopie());
    });

  $('#share')?.addEventListener('click', () => {
    void copier(`${location.origin}${location.pathname}`, 'Lien de la création copié.');
  });

  /* Fenêtres : bouton de fermeture, clic hors de la fenêtre. */
  for (const bouton of $$('[data-close]'))
    bouton.addEventListener('click', () => bouton.closest('dialog')?.close());
  for (const fenetre of $$<HTMLDialogElement>('dialog'))
    fenetre.addEventListener('click', (evenement) => {
      if (evenement.target !== fenetre) return;
      const cadre = fenetre.getBoundingClientRect();
      const { clientX: x, clientY: y } = evenement;
      if (x < cadre.left || x > cadre.right || y < cadre.top || y > cadre.bottom) fenetre.close();
    });
  $('.image-open')?.addEventListener('click', () => $<HTMLDialogElement>('#lightbox')?.showModal());

  /* Section courante dans la navigation de la fiche. */
  const liens = $$<HTMLAnchorElement>('.section-nav a');
  const sections = $$('#resultat, #parcours, #reproductions, #commentaires').filter(
    (section) => !section.hidden,
  );
  const suivreSection = () => {
    let courante = sections[0];
    for (const section of sections)
      if (section.getBoundingClientRect().top <= Math.max(200, innerHeight * 0.35))
        courante = section;
    for (const lien of liens) {
      const active = lien.hash === `#${courante?.id}`;
      lien.classList.toggle('active', active);
      if (active) lien.setAttribute('aria-current', 'location');
      else lien.removeAttribute('aria-current');
    }
  };
  let enAttente = false;
  addEventListener(
    'scroll',
    () => {
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(() => {
        suivreSection();
        enAttente = false;
      });
    },
    { passive: true },
  );
  addEventListener('resize', suivreSection);
  suivreSection();
}
