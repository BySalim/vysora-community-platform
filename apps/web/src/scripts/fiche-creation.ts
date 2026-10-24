/* Fiche création (CREA-03), portée de prototype/fiche-creation.js : copie des prompts (F-24),
   partage du lien (F-26), image en grand, fenêtres, section courante de la navigation,
   vote « Utile » (F-30), enregistrement (F-34), commentaires et réponses (F-40, F-42).
   Le contenu est rendu par le serveur ; l'essai et le signalement arrivent avec leurs tâches. */

import type { CommentaireApi, EnregistrementApi, ProblemeApi, VoteApi } from '@vysora/shared';
import { dateCourte } from '../lib/texte';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { $, $$, esc, icon, t, toast } from './commun/outils';

/** Message d'une action refusée ou interrompue. */
function signalerEchec(probleme: ProblemeApi): void {
  if (probleme.status === 404) toast('Cette création n’est plus disponible.', 'alert');
  else if (probleme.status === 401 || probleme.status === 403)
    toast(probleme.detail ?? probleme.title, 'alert');
  else toast('L’action n’a pas abouti. Réessayez dans un instant.', 'alert');
}

/** Commentaire ajouté sans recharger la page : même balisage que celui rendu par le serveur. */
function ligneCommentaire(commentaire: CommentaireApi, enReponseA: string | null): string {
  const nom = commentaire.auteur?.nom ?? '';
  const avatar = commentaire.auteur?.avatar
    ? `<img src="${esc(commentaire.auteur.avatar)}" alt="" width="40" height="40" decoding="async">`
    : `<span class="avatar compte-avatar" style="width:40px;height:40px" aria-hidden="true">${icon('user', '')}</span>`;
  const contexte = enReponseA ? `${t(`En réponse à ${enReponseA} :`)}\n` : '';
  return `<article class="comment-row" id="commentaire-${commentaire.id}"><div class="person">${avatar}<div><strong>${esc(nom)}</strong></div><time datetime="${esc(commentaire.date)}">${esc(dateCourte(commentaire.date))}</time></div><p>${contexte}${t(commentaire.corps ?? '')}</p><button class="text-button" type="button" data-reply="${commentaire.id}" data-nom="${esc(nom)}">Répondre<span class="sr-only"> à ${esc(nom)}</span></button></article>`;
}

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

  const creationId = fiche.dataset.creation;

  /* F-30 : vote « Utile », retiré par un second clic. */
  const utile = $<HTMLButtonElement>('#useful');
  utile?.addEventListener('click', async () => {
    if (utile.disabled || utile.getAttribute('aria-busy') === 'true') return;
    if (!exiger('contribuer', 'voter « Utile »')) return;
    const ajouter = utile.getAttribute('aria-pressed') !== 'true';
    utile.setAttribute('aria-busy', 'true');
    const reponse = await api<VoteApi>(
      ajouter ? 'PUT' : 'DELETE',
      `/api/v1/contenus/${creationId}/votes/UTILE`,
    );
    utile.removeAttribute('aria-busy');
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    utile.setAttribute('aria-pressed', String(reponse.donnees.aVote));
    const compteur = $('#useful-count');
    if (compteur) compteur.textContent = String(reponse.donnees.nombre);
    toast(reponse.donnees.aVote ? 'Votre vote a été ajouté.' : 'Votre vote a été retiré.', 'utile');
  });

  /* F-34 : liste « Enregistrés » du membre. */
  const enregistrer = $<HTMLButtonElement>('#save');
  enregistrer?.addEventListener('click', async () => {
    if (enregistrer.getAttribute('aria-busy') === 'true') return;
    if (!exiger('contribuer', 'enregistrer cette création')) return;
    const ajouter = enregistrer.getAttribute('aria-pressed') !== 'true';
    enregistrer.setAttribute('aria-busy', 'true');
    const reponse = await api<EnregistrementApi>(
      ajouter ? 'PUT' : 'DELETE',
      `/api/v1/contenus/${creationId}/enregistrement`,
    );
    enregistrer.removeAttribute('aria-busy');
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    const enregistre = reponse.donnees.enregistre;
    enregistrer.setAttribute('aria-pressed', String(enregistre));
    enregistrer.setAttribute(
      'aria-label',
      enregistre ? 'Retirer des créations enregistrées' : 'Enregistrer la création',
    );
    toast(enregistre ? 'Création enregistrée.' : 'Création retirée des enregistrements.', 'folder');
  });

  /* F-40, F-42 : commenter, répondre à un commentaire. */
  const formulaire = $<HTMLFormElement>('#comment-form');
  const champ = $<HTMLTextAreaElement>('#comment');
  const contexteReponse = $('#comment-context');
  let reponseA: { id: number; nom: string } | null = null;
  const annulerReponse = () => {
    reponseA = null;
    if (contexteReponse) contexteReponse.hidden = true;
  };

  $('#comments-list')?.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-reply]');
    if (!bouton || !contexteReponse || !champ || !exiger('contribuer', 'répondre')) return;
    reponseA = { id: Number(bouton.dataset.reply), nom: bouton.dataset.nom ?? '' };
    contexteReponse.hidden = false;
    contexteReponse.textContent = `En réponse à ${reponseA.nom} `;
    const annuler = document.createElement('button');
    annuler.type = 'button';
    annuler.className = 'text-button';
    annuler.textContent = 'Annuler';
    annuler.addEventListener('click', annulerReponse);
    contexteReponse.append(annuler);
    champ.focus();
  });

  champ?.addEventListener('input', () => champ.setCustomValidity(''));
  formulaire?.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!champ || !exiger('contribuer', 'commenter')) return;
    const signaler = (message: string) => {
      champ.setCustomValidity(message);
      champ.reportValidity();
    };
    if (!champ.value.trim()) return signaler('Écrivez votre commentaire.');
    const bouton = $<HTMLButtonElement>('button', formulaire);
    if (bouton) bouton.disabled = true;
    const cible = reponseA;
    const reponse = await api<CommentaireApi>(
      'POST',
      `/api/v1/creations/${creationId}/commentaires`,
      { corps: champ.value, parentId: cible?.id ?? null },
    );
    if (bouton) bouton.disabled = false;
    if (!reponse.ok) {
      const { erreurs } = reponse.probleme;
      if (erreurs?.corps) return signaler(erreurs.corps);
      if (erreurs?.parentId) {
        annulerReponse();
        return toast(erreurs.parentId, 'alert');
      }
      if (reponse.probleme.code === 'LIMITE_ATTEINTE')
        return toast(reponse.probleme.detail ?? reponse.probleme.title, 'alert');
      return signalerEchec(reponse.probleme);
    }
    const liste = $('#comments-list');
    $('.empty-detail', liste ?? undefined)?.remove();
    liste?.insertAdjacentHTML('beforeend', ligneCommentaire(reponse.donnees, cible?.nom ?? null));
    const compteur = $('#comment-count');
    if (compteur) compteur.textContent = String(Number(compteur.textContent) + 1);
    formulaire.reset();
    annulerReponse();
    toast('Commentaire publié.', 'message');
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
