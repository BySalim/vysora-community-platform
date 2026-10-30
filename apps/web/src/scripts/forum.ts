/* Forum, liste des sujets (FORUM-02), repris de prototype/forum.js : onglets, recherche, panneau
   « Filtrer », puces des filtres, « Mes outils » et « Vos outils suivis ». La liste est rendue par
   le serveur ; chaque changement mène à son adresse. */

import {
  ecrireAdresse,
  sansFiltre,
  TYPES,
  ORDRE_TYPES,
  type EtatListe,
  type Onglet,
  type TriFiltre,
} from '../lib/forum/donnees';
import { panneauFiltreHTML } from '../lib/forum/liste';
import { lireMesOutils, monterMesOutils, type OutilChoisissable } from './commun/mes-outils';
import { $, $$, esc, icon, t } from './commun/outils';

interface DonneesForum {
  etat: EtatListe;
  outils: OutilChoisissable[];
}

const source = document.getElementById('qa-donnees')?.textContent;
const donnees = source ? (JSON.parse(source) as DonneesForum) : null;

if (donnees) {
  const { etat, outils } = donnees;
  const slugs = outils.map((o) => o.slug);
  const aller = (suite: EtatListe) => location.assign(ecrireAdresse(suite));

  /* Vos outils suivis (prototype : sideHTML) */
  const boite = $('[data-outils-suivis]');
  const rendreOutilsSuivis = (suivis: Set<string>) => {
    if (!boite || !suivis.size) return;
    const liens = outils
      .filter((o) => suivis.has(o.slug))
      .map(
        (o) =>
          `<li><a class="qa-tag is-tool" href="${esc(ecrireAdresse({ ...etat, q: '', etiquette: '', membre: '', page: 1, outil: o.slug }))}">${o.logo ? `<img class="tool-logo${o.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(o.logo)}.svg" alt="" width="14" height="14" decoding="async">` : ''}${t(o.nom)}</a></li>`,
      )
      .join('');
    boite.innerHTML = `<h2 id="qa-watch-title">${icon('wrench')}Vos outils suivis</h2><ul class="qa-tags is-wrap">${liens}</ul><button class="link-btn" type="button" data-open-tools>Modifier</button>`;
  };
  rendreOutilsSuivis(lireMesOutils(slugs));

  const mesOutils = monterMesOutils(outils, (selection) => {
    // Le filtre « Sur mes outils » suit la nouvelle sélection.
    if (etat.filtres.mesOutils.length)
      aller({ ...etat, page: 1, filtres: { ...etat.filtres, mesOutils: [...selection] } });
    else rendreOutilsSuivis(selection);
  });

  /* Panneau « Filtrer » (prototype : filterPanelHTML), placé sous la barre des onglets. */
  const basculer = $<HTMLButtonElement>('[data-filter-toggle]');
  const fermerPanneau = () => {
    $('[data-filter-form]')?.remove();
    basculer?.setAttribute('aria-expanded', 'false');
  };
  basculer?.addEventListener('click', () => {
    if (basculer.getAttribute('aria-expanded') === 'true') {
      fermerPanneau();
      return;
    }
    basculer
      .closest('.qa-bar')
      ?.insertAdjacentHTML('afterend', panneauFiltreHTML(etat, lireMesOutils(slugs).size > 0));
    basculer.setAttribute('aria-expanded', 'true');
    $<HTMLInputElement>('[data-filter-form] input')?.focus();
  });
  document.addEventListener('submit', (evenement) => {
    const form = (evenement.target as Element).closest<HTMLFormElement>('[data-filter-form]');
    if (!form) return;
    evenement.preventDefault();
    const coche = (cle: string) => Boolean($<HTMLInputElement>(`[data-f="${cle}"]`, form)?.checked);
    const tri = ($<HTMLInputElement>('input[name="qa-sort"]:checked', form)?.value ??
      '') as TriFiltre;
    aller({
      ...etat,
      page: 1,
      filtres: {
        sansReponse: coche('sansReponse'),
        sansReponseAcceptee: coche('sansReponseAcceptee'),
        avecPrompt: coche('avecPrompt'),
        mesOutils: coche('mesOutils') ? [...lireMesOutils(slugs)] : [],
        types: ORDRE_TYPES.filter(
          (type) => $<HTMLInputElement>(`[data-f-type="${TYPES[type].cle}"]`, form)?.checked,
        ),
        tri,
      },
    });
  });

  /* Recherche : la touche « / » y mène (prototype : raccourci de la liste). */
  const recherche = $<HTMLFormElement>('[data-search]');
  recherche?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const q = $<HTMLInputElement>('#qa-q', recherche)?.value.trim() ?? '';
    aller({ ...etat, q, page: 1 });
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key !== '/' || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
    const cible = evenement.target as HTMLElement;
    if (cible.closest('input, textarea, select, [contenteditable="true"]')) return;
    evenement.preventDefault();
    $<HTMLInputElement>('#qa-q')?.focus();
  });

  document.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    if (cible.closest('[data-open-tools]')) {
      mesOutils.ouvrir();
      return;
    }
    if (cible.closest('[data-filter-cancel]')) {
      fermerPanneau();
      basculer?.focus();
      return;
    }
    const onglet = cible.closest<HTMLElement>('[data-tab]')?.dataset.tab as Onglet | undefined;
    if (onglet) {
      aller({ ...etat, onglet, page: 1 });
      return;
    }
    const filtre = cible.closest<HTMLElement>('[data-unfilter]')?.dataset.unfilter;
    if (filtre) aller(sansFiltre(etat, filtre));
  });

  for (const lien of $$<HTMLAnchorElement>('[data-prefill]')) {
    // « Poser une question » depuis une recherche vide : le titre reprend la recherche.
    if (etat.q) lien.href = `${lien.pathname}?titre=${encodeURIComponent(etat.q)}`;
  }
}
