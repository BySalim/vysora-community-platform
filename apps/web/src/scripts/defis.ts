/* Défis (portés de prototype/defis.js) : filtre par outil, recherche et tri des participations,
   vote « Utile » (PUT ou DELETE /api/v1/contenus/:id/votes/UTILE), inscription d'une création au
   défi (PUT /api/v1/defis/:id/participation, RG-74), apparition des sections au défilement. */

import { normaliser } from '../lib/texte';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { $, $$, messageApresChargement, toast, typo } from './commun/outils';

const donnees = JSON.parse($('#df-donnees')?.textContent ?? '{}') as {
  defi: number | null;
  connecte: boolean;
  participation: string | null;
};
const etat = { outil: '', recherche: '', tri: 'utiles' };
const grille = $('[data-entries]');

function rendre(): void {
  if (!grille) return;
  const cartes = $$<HTMLElement>('.df-card', grille);
  const q = normaliser(etat.recherche.trim());
  const visibles = cartes.filter(
    (c) =>
      (!etat.outil || c.dataset.outil === etat.outil) &&
      (!q || (c.dataset.texte ?? '').includes(q)),
  );
  const ordre = cartes.toSorted((a, b) =>
    etat.tri === 'recentes'
      ? (b.dataset.date ?? '').localeCompare(a.dataset.date ?? '')
      : Number(b.dataset.utiles) - Number(a.dataset.utiles) ||
        (a.dataset.date ?? '').localeCompare(b.dataset.date ?? ''),
  );
  for (const c of ordre) {
    c.hidden = !visibles.includes(c);
    grille.append(c);
  }
  const total = Number($('[data-selection]')?.dataset.total ?? cartes.length);
  const selection = $('[data-selection]');
  if (selection && total)
    selection.textContent = typo(
      `${visibles.length} ${visibles.length > 1 ? 'créations affichées' : 'création affichée'} sur ${total} ${total > 1 ? 'participations' : 'participation'}`,
    );
  const aucune = $('[data-aucune]');
  if (aucune) aucune.hidden = visibles.length > 0 || cartes.length === 0;
  const statut = $('[data-results-status]');
  if (statut) statut.textContent = `${visibles.length} parcours affichés.`;
  for (const b of $$<HTMLButtonElement>('[data-tool]'))
    b.setAttribute('aria-pressed', String((b.dataset.tool ?? '') === etat.outil));
}

const dialogue = $<HTMLDialogElement>('[data-df-dialogue]');

document.addEventListener('click', async (evenement) => {
  const b = (evenement.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.hasAttribute('data-participer')) {
    if (donnees.participation) {
      window.location.assign(donnees.participation);
      return;
    }
    if (!exiger('contribuer', 'participer au défi')) return;
    dialogue?.showModal();
    return;
  }
  if (b.hasAttribute('data-close')) dialogue?.close();
  if (b.dataset.tool !== undefined) {
    etat.outil = b.dataset.tool;
    rendre();
  }
  if (b.hasAttribute('data-clear')) {
    etat.outil = '';
    etat.recherche = '';
    const champ = $<HTMLInputElement>('[data-search]');
    if (champ) champ.value = '';
    rendre();
  }
  if (b.dataset.vote) {
    if (!exiger('contribuer', 'voter « Utile »')) return;
    const vote = b.getAttribute('aria-pressed') === 'true';
    b.disabled = true;
    const reponse = await api(
      vote ? 'DELETE' : 'PUT',
      `/api/v1/contenus/${b.dataset.vote}/votes/UTILE`,
    );
    b.disabled = false;
    if (!reponse.ok) {
      toast(
        reponse.probleme.detail ?? 'Le vote n’a pas été enregistré. Réessayez dans un instant.',
        'alert',
      );
      return;
    }
    const carte = b.closest<HTMLElement>('.df-card');
    const n = Number(carte?.dataset.utiles ?? 0) + (vote ? -1 : 1);
    if (carte) carte.dataset.utiles = String(n);
    b.setAttribute('aria-pressed', String(!vote));
    const libelle = $('span', b);
    if (libelle) libelle.textContent = `${n} Utile`;
    toast(vote ? 'Votre vote a été retiré.' : 'Votre vote Utile a été ajouté.');
  }
});

$('[data-search]')?.addEventListener('input', (evenement) => {
  etat.recherche = (evenement.target as HTMLInputElement).value;
  rendre();
});
$('[data-sort]')?.addEventListener('change', (evenement) => {
  etat.tri = (evenement.target as HTMLSelectElement).value;
  rendre();
});

const formulaire = $<HTMLFormElement>('[data-df-form]');
formulaire?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const choix = $<HTMLInputElement>('input[name="creation"]:checked', formulaire);
  const erreur = $('[data-df-erreur]', formulaire);
  if (!choix || donnees.defi === null) return;
  const envoyer = $<HTMLButtonElement>('button[type="submit"]', formulaire);
  if (envoyer) envoyer.disabled = true;
  const reponse = await api('PUT', `/api/v1/defis/${donnees.defi}/participation`, {
    creationId: Number(choix.value),
  });
  if (envoyer) envoyer.disabled = false;
  if (reponse.ok) {
    messageApresChargement('Votre création participe au défi.');
    window.location.reload();
    return;
  }
  if (erreur) {
    erreur.textContent = typo(
      reponse.probleme.detail ?? 'L’inscription n’a pas abouti. Réessayez dans un instant.',
    );
    erreur.hidden = false;
  }
});

dialogue?.addEventListener('click', (evenement) => {
  if (evenement.target !== dialogue) return;
  const cadre = dialogue.getBoundingClientRect();
  const { clientX: x, clientY: y } = evenement;
  if (x < cadre.left || x > cadre.right || y < cadre.top || y > cadre.bottom) dialogue.close();
});

/* Les sections apparaissent quand elles entrent à l'écran (prototype : observe). */
const aReveler = $$('.df-reveal');
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees)
        if (entree.isIntersecting) {
          entree.target.classList.add('is-in');
          observateur.unobserve(entree.target);
        }
    },
    { threshold: 0.06 },
  );
  for (const el of aReveler) observateur.observe(el);
} else for (const el of aReveler) el.classList.add('is-in');

rendre();
