/* Classements (portés de prototype/classements.js) : classement de la semaine ou général, filtre par
   niveau, dix ou cinquante premiers, et apparition des sections au défilement. Les données sont
   rendues par le serveur ; rien n'est recalculé ici. */

import { $, $$, icon, typo } from './commun/outils';

const section = $('[data-cl-membres]');

if (section) {
  let tableau: 'semaine' | 'general' = 'semaine';
  let niveau = '';
  let tout = false;
  const plus = $<HTMLButtonElement>('[data-cl-more]', section)!;
  const ligneCompte = $('[data-cl-count-line]', section);

  function rendre(): void {
    for (const panneau of $$<HTMLElement>('[data-cl-panel]', section!)) {
      const actif = panneau.dataset.clPanel === tableau;
      panneau.hidden = !actif;
      if (!actif) continue;
      const lignes = $$<HTMLTableRowElement>('tbody tr', panneau);
      const retenues = lignes.filter((tr) => !niveau || tr.dataset.niveau === niveau);
      const limite = niveau || tout ? 50 : 10;
      for (const tr of lignes) tr.hidden = !retenues.slice(0, limite).includes(tr);
      const vide = $('[data-cl-level-empty]', panneau);
      if (vide) vide.hidden = !(lignes.length && !retenues.length);
      plus.hidden = Boolean(niveau) || retenues.length <= 10;
      plus.innerHTML = tout
        ? `Afficher les 10 premiers${icon('up')}`
        : `Afficher les ${Math.min(50, retenues.length)} premiers${icon('chevron-down')}`;
      plus.setAttribute('aria-expanded', String(tout));
    }
    if (ligneCompte)
      ligneCompte.textContent = typo(
        (tableau === 'semaine' ? ligneCompte.dataset.semaine : ligneCompte.dataset.general) ?? '',
      );
    for (const onglet of $$<HTMLButtonElement>('[data-cl-table-tab]', section!)) {
      const choisi = onglet.dataset.clTableTab === tableau;
      onglet.setAttribute('aria-selected', String(choisi));
      onglet.tabIndex = choisi ? 0 : -1;
    }
    for (const puce of $$<HTMLButtonElement>('[data-cl-level]', section!))
      puce.setAttribute('aria-pressed', String((puce.dataset.clLevel ?? '') === niveau));
  }

  section.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const onglet = cible.closest<HTMLButtonElement>('[data-cl-table-tab]');
    if (onglet) {
      tableau = onglet.dataset.clTableTab === 'general' ? 'general' : 'semaine';
      return rendre();
    }
    const puce = cible.closest<HTMLButtonElement>('[data-cl-level]');
    if (puce) {
      niveau = puce.dataset.clLevel ?? '';
      return rendre();
    }
    if (cible.closest('[data-cl-more]')) {
      tout = !tout;
      rendre();
    }
  });
  // Flèches entre les deux onglets (motif « tablist »).
  section.addEventListener('keydown', (evenement) => {
    const onglet = (evenement.target as Element).closest('[data-cl-table-tab]');
    if (!onglet || !['ArrowLeft', 'ArrowRight'].includes(evenement.key)) return;
    tableau = tableau === 'semaine' ? 'general' : 'semaine';
    rendre();
    $<HTMLButtonElement>(`[data-cl-table-tab="${tableau}"]`, section)?.focus();
  });
  rendre();
}

/* Les sections apparaissent quand elles entrent à l'écran (prototype : observeReveal). */
const aReveler = $$('.cl-reveal');
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees)
        if (entree.isIntersecting) {
          entree.target.classList.add('is-in');
          observateur.unobserve(entree.target);
        }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  for (const el of aReveler) observateur.observe(el);
} else for (const el of aReveler) el.classList.add('is-in');

/* Lauréats : ils entrent une fois les polices chargées (prototype : is-ready). */
void Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 900))]).then(
  () => requestAnimationFrame(() => document.body.classList.add('is-ready')),
);
