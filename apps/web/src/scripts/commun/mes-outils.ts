/* « Mes outils » (prototype : commun.js, initToolsDialog) : les outils que la personne utilise,
   gardés par son navigateur (clé partagée avec Explorer). La fenêtre [data-tools-dialog] de la page
   permet de les choisir ; la sélection ne s'applique qu'à l'enregistrement. */

import type { FamilleOutil, OutilResumeApi } from '@vysora/shared';
import { plier } from '../../lib/explorer/recherche';
import { FAMILLES } from '../../lib/publier/donnees';
import { $, esc, icon, pluriel, t, toast } from './outils';

export interface OutilChoisissable extends OutilResumeApi {
  famille: FamilleOutil;
}

const CLE = 'vysora-mes-outils';

/** Adresses des outils suivis, limitées à celles du référentiel. */
export function lireMesOutils(connus: Iterable<string>): Set<string> {
  const valides = new Set(connus);
  try {
    const lus: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    return new Set(
      (Array.isArray(lus) ? lus : []).filter(
        (slug): slug is string => typeof slug === 'string' && valides.has(slug),
      ),
    );
  } catch {
    return new Set();
  }
}

function ecrireMesOutils(outils: Set<string>): void {
  try {
    localStorage.setItem(CLE, JSON.stringify([...outils]));
  } catch {
    // Stockage indisponible (navigation privée stricte) : la sélection dure le temps de la page.
  }
}

/** Branche la fenêtre « Mes outils » de la page ; `surEnregistrement` reçoit la nouvelle sélection. */
export function monterMesOutils(
  outils: OutilChoisissable[],
  surEnregistrement: (selection: Set<string>) => void,
): { ouvrir: () => void } {
  const dialogue = $<HTMLDialogElement>('[data-tools-dialog]');
  const liste = $('[data-tools-list]', dialogue ?? document);
  const filtre = $<HTMLInputElement>('[data-tools-filter]', dialogue ?? document);
  let brouillon = new Set<string>();

  const libelleEnregistrer = () => {
    const bouton = $('[data-tools-save]', dialogue ?? document);
    if (bouton)
      bouton.textContent = brouillon.size
        ? `Enregistrer ${pluriel(brouillon.size, 'outil', 'outils')}`
        : 'Enregistrer';
  };

  const rendre = () => {
    if (!liste || !filtre) return;
    const requete = plier(filtre.value).trim();
    const groupes = FAMILLES.map(
      (f) =>
        [
          f,
          outils.filter((o) => o.famille === f.id && (!requete || plier(o.nom).includes(requete))),
        ] as const,
    ).filter(([, membres]) => membres.length);
    liste.innerHTML = groupes.length
      ? groupes
          .map(
            ([f, membres]) =>
              `<section class="ex-tools-fam"><h3>${t(f.label)}</h3><div class="ex-tools-grid">${membres
                .map(
                  (o) =>
                    `<button class="ex-tool-opt" type="button" aria-pressed="${brouillon.has(o.slug)}" data-tool="${esc(o.slug)}">${o.logo ? `<img class="tool-logo${o.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(o.logo)}.svg" alt="" width="18" height="18" decoding="async">` : ''}<span>${t(o.nom)}</span>${icon('check')}</button>`,
                )
                .join('')}</div></section>`,
          )
          .join('')
      : `<p class="ex-empty-note">${t(`Aucun outil ne correspond à « ${filtre.value} ».`)}</p>`;
    libelleEnregistrer();
  };

  const ouvrir = () => {
    if (!dialogue || !filtre) return;
    brouillon = lireMesOutils(outils.map((o) => o.slug));
    dialogue.returnValue = '';
    filtre.value = '';
    rendre();
    dialogue.showModal();
    filtre.focus();
  };

  liste?.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-tool]');
    const slug = bouton?.dataset.tool;
    if (!bouton || !slug) return;
    if (brouillon.has(slug)) brouillon.delete(slug);
    else brouillon.add(slug);
    bouton.setAttribute('aria-pressed', String(brouillon.has(slug)));
    libelleEnregistrer();
  });
  filtre?.addEventListener('input', rendre);
  $('[data-tools-reset]', dialogue ?? document)?.addEventListener('click', () => {
    brouillon.clear();
    rendre();
  });
  $('[data-close-tools]', dialogue ?? document)?.addEventListener('click', () =>
    dialogue?.close(''),
  );
  // « Enregistrer » soumet le formulaire : la sélection s'applique aussitôt, sans attendre
  // l'événement « close » (que le navigateur peut différer) ; Échap ou « Fermer » ne changent rien.
  dialogue?.querySelector('form')?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    dialogue.close('save');
    const selection = new Set(brouillon);
    ecrireMesOutils(selection);
    toast(
      selection.size
        ? `${pluriel(selection.size, 'outil enregistré', 'outils enregistrés')}.`
        : 'Sélection d’outils effacée.',
    );
    surEnregistrement(selection);
  });

  return { ouvrir };
}
