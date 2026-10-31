/* Page d'un domaine d'Explorer (S-06), portée de prototype/categorie.js : filtres et tri des parcours,
   « Afficher d'autres parcours », pièges, « Mes outils », « Je le cherche aussi », section active du
   sommaire. La page est rendue par le serveur avec lib/explorer/domaine ; le script reprend les mêmes
   fonctions quand l'état change. */

import type { DomainePageApi, SoutienDemandeApi } from '@vysora/shared';
import {
  PAR_PAGE,
  corpsSection,
  demandesDomaine,
  type CleSectionDomaine,
  type EtatDomaine,
  type TriDomaine,
  type TypeFiltre,
} from '../lib/explorer/domaine';
import { boutonMesOutils } from '../lib/explorer/index-guides';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { lireMesOutils, monterMesOutils, type OutilChoisissable } from './commun/mes-outils';
import { $, $$, animations, corrigerTypographie, toast } from './commun/outils';

interface DonneesDomaine {
  page: DomainePageApi;
  outils: OutilChoisissable[];
  maintenant: string;
}

const lues = (() => {
  try {
    return JSON.parse($('#dm-donnees')?.textContent ?? 'null') as DonneesDomaine | null;
  } catch {
    return null;
  }
})();

if (lues) demarrer(lues);

function demarrer(donnees: DonneesDomaine): void {
  const outils = donnees.outils;
  const outilsParSlug = new Map(outils.map((o) => [o.slug, o]));
  const etat: EtatDomaine = {
    page: donnees.page,
    maintenant: new Date(donnees.maintenant),
    type: 'tous',
    tri: 'reproduits',
    avecMesOutils: false,
    affiches: PAR_PAGE,
    tousLesPieges: false,
    mesOutils: lireMesOutils(outils.map((o) => o.slug)),
  };

  const rendre = (cle: CleSectionDomaine) => {
    const section = $(`[data-section="${cle}"]`);
    if (!section) return;
    section.innerHTML = corpsSection(cle, etat);
    corrigerTypographie(section);
  };
  const rendreOutils = () => {
    const zone = $('[data-mytools]');
    if (zone) zone.innerHTML = boutonMesOutils([...etat.mesOutils], outilsParSlug, true);
    for (const cle of ['guides', 'outils', 'parcours'] as const) rendre(cle);
  };
  // Le serveur ne connaît pas les outils de la personne (gardés par son navigateur).
  if (etat.mesOutils.size) rendreOutils();

  const fenetreOutils = monterMesOutils(outils, (selection) => {
    etat.mesOutils = selection;
    if (!selection.size) etat.avecMesOutils = false;
    rendreOutils();
  });

  /* « Je le cherche aussi » : compté par l'API, 30 jours (DEC-01). */
  async function soutenir(bouton: HTMLButtonElement): Promise<void> {
    if (!exiger('contribuer', 'indiquer que vous cherchez ce parcours')) return;
    const id = Number(bouton.dataset.want);
    const demande = etat.page.demandes.find((d) => d.id === id);
    if (!demande) return;
    bouton.disabled = true;
    const reponse = await api<SoutienDemandeApi>(
      demande.soutenue ? 'DELETE' : 'PUT',
      `/api/v1/demandes/${id}/soutien`,
    );
    if (!reponse.ok) {
      bouton.disabled = false;
      toast(
        reponse.probleme.status === 0 || reponse.probleme.status >= 500
          ? 'Votre demande n’a pas pu être enregistrée. Réessayez dans un instant.'
          : reponse.probleme.title,
        'alert',
      );
      return;
    }
    const { soutiens, soutenue } = reponse.donnees;
    etat.page = {
      ...etat.page,
      demandes: etat.page.demandes
        .map((d) => (d.id === id ? { ...d, soutiens, soutenue } : d))
        .toSorted((a, b) => b.soutiens - a.soutiens || a.libelle.localeCompare(b.libelle, 'fr')),
    };
    const zone = $('[data-dm-demandes]');
    if (zone) {
      zone.innerHTML = demandesDomaine(etat.page);
      corrigerTypographie(zone);
    }
    if (soutenue)
      toast('Votre intérêt est compté : les auteurs voient ce que la communauté attend.');
    $<HTMLElement>(`[data-want="${id}"]`)?.focus();
  }

  document.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const saut = cible.closest<HTMLElement>('[data-jump]');
    if (saut) {
      const section = document.getElementById(saut.dataset.jump ?? '');
      if (section) {
        evenement.preventDefault();
        section.scrollIntoView({
          behavior: animations.completes() ? 'smooth' : 'auto',
          block: 'start',
        });
        $<HTMLElement>('h2', section)?.focus({ preventScroll: true });
        history.replaceState(null, '', `#${saut.dataset.jump}`);
      }
      return;
    }
    if (cible.closest('[data-open-tools]')) {
      fenetreOutils.ouvrir();
      return;
    }
    const type = cible.closest<HTMLElement>('[data-type]');
    if (type) {
      etat.type = (type.dataset.type ?? 'tous') as TypeFiltre;
      etat.affiches = PAR_PAGE;
      rendre('parcours');
      $<HTMLElement>(`[data-type="${etat.type}"]`)?.focus();
      return;
    }
    if (cible.closest('[data-mine]')) {
      if (!etat.mesOutils.size) {
        fenetreOutils.ouvrir();
        return;
      }
      etat.avecMesOutils = !etat.avecMesOutils;
      etat.affiches = PAR_PAGE;
      rendre('parcours');
      $<HTMLElement>('[data-mine]')?.focus();
      return;
    }
    if (cible.closest('[data-reset-filters]')) {
      Object.assign(etat, { type: 'tous', avecMesOutils: false, affiches: PAR_PAGE });
      rendre('parcours');
      $<HTMLElement>('[data-type="tous"]')?.focus();
      return;
    }
    if (cible.closest('[data-load-more]')) {
      const avant = etat.affiches;
      etat.affiches += PAR_PAGE;
      rendre('parcours');
      $$<HTMLAnchorElement>('.dm-card h3 a')[avant]?.focus();
      return;
    }
    if (cible.closest('[data-more-pits]')) {
      etat.tousLesPieges = !etat.tousLesPieges;
      rendre('pieges');
      $<HTMLElement>('[data-more-pits]')?.focus();
      return;
    }
    const soutien = cible.closest<HTMLButtonElement>('[data-want]');
    if (soutien) void soutenir(soutien);
  });

  document.addEventListener('change', (evenement) => {
    const liste = evenement.target as HTMLSelectElement;
    if (!liste.matches('[data-sort]')) return;
    etat.tri = liste.value as TriDomaine;
    etat.affiches = PAR_PAGE;
    rendre('parcours');
    $<HTMLSelectElement>('[data-sort]')?.focus();
  });

  /* Section active du sommaire (prototype : observeSections). */
  const liens = $$<HTMLAnchorElement>('[data-dm-toc] a');
  const observateur = new IntersectionObserver(
    (entrees) => {
      const visible = entrees
        .filter((e) => e.isIntersecting)
        .toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      for (const lien of liens)
        if (lien.dataset.jump === visible.target.id) lien.setAttribute('aria-current', 'true');
        else lien.removeAttribute('aria-current');
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const section of $$('[data-section]')) observateur.observe(section);

  // Le rail mobile montre le domaine courant.
  const courant = $<HTMLElement>('[data-dm-rail] [aria-current="page"]');
  const rail = courant?.parentElement?.parentElement;
  if (courant?.parentElement && rail) rail.scrollLeft = courant.parentElement.offsetLeft - 16;

  if (location.hash.length > 1) {
    const cible = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (cible) requestAnimationFrame(() => cible.scrollIntoView({ block: 'start' }));
  }
  const policesPretes = document.fonts?.ready ?? Promise.resolve();
  void Promise.race([policesPretes, new Promise((fin) => setTimeout(fin, 900))]).then(() =>
    requestAnimationFrame(() => document.body.classList.add('is-ready')),
  );
}
