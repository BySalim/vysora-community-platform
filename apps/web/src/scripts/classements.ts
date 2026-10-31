/* Classements (portés de prototype/classements.js) : choix de l'outil, classement de la semaine ou
   général, filtre par niveau, dix ou cinquante premiers, et apparition des sections au défilement.
   Les données sont rendues par le serveur ; rien n'est recalculé ici. */

import { $, $$, icon, typo } from './commun/outils';

/* Choix de l'outil (prototype : openTools, moveTool, setTool) : une liste d'options au clavier comme
   à la souris ; choisir un outil charge l'adresse du palmarès limité à cet outil. */
const choix = $('[data-cl-tool-picker]');
if (choix) {
  const bouton = $<HTMLButtonElement>('[data-cl-tool-btn]', choix)!;
  const liste = $<HTMLUListElement>('[data-cl-tool-list]', choix)!;
  const options = $$<HTMLLIElement>('[role="option"]', liste);
  let active = 0;

  const deplacer = (pas: number) => {
    active = Math.min(options.length - 1, Math.max(0, active + pas));
    options.forEach((o, i) => o.classList.toggle('is-active', i === active));
    const option = options[active];
    if (!option) return;
    liste.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  };
  const ouvrir = () => {
    liste.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    active = Math.max(
      0,
      options.findIndex((o) => o.getAttribute('aria-selected') === 'true'),
    );
    deplacer(0);
    liste.focus();
  };
  const fermer = (rendreLeFocus = true) => {
    if (liste.hidden) return;
    liste.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
    if (rendreLeFocus) bouton.focus();
  };
  const choisir = (option: HTMLLIElement | undefined) => {
    if (!option) return;
    if (option.getAttribute('aria-selected') === 'true') return fermer();
    window.location.assign(option.dataset.clToolHref ?? window.location.href);
  };

  bouton.addEventListener('click', () => (liste.hidden ? ouvrir() : fermer()));
  bouton.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return;
    evenement.preventDefault();
    ouvrir();
  });
  liste.addEventListener('click', (evenement) => {
    choisir((evenement.target as Element).closest<HTMLLIElement>('[role="option"]') ?? undefined);
  });
  liste.addEventListener('keydown', (evenement) => {
    const { key } = evenement;
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      evenement.preventDefault();
      deplacer({ ArrowDown: 1, ArrowUp: -1, Home: -options.length, End: options.length }[key]);
    } else if (key === 'Enter' || key === ' ') {
      evenement.preventDefault();
      choisir(options[active]);
    } else if (key === 'Escape' || key === 'Tab') {
      if (key === 'Escape') evenement.preventDefault();
      fermer(key === 'Escape');
    } else if (key.length === 1) {
      // Première lettre : l'outil suivant qui commence par elle.
      const i = options.findIndex(
        (o, n) => n > 0 && (o.textContent ?? '').trim().toLowerCase().startsWith(key.toLowerCase()),
      );
      if (i >= 0) {
        active = i;
        deplacer(0);
      }
    }
  });
  document.addEventListener('click', (evenement) => {
    if (!(evenement.target as Element).closest('[data-cl-tool-picker]')) fermer(false);
  });
}

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
