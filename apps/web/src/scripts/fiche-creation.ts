/* Fiche création (CREA-03), portée de prototype/fiche-creation.js : copie des prompts (F-24),
   partage du lien (F-26), image en grand, fenêtres, section courante de la navigation,
   vote « Utile » (F-30), enregistrement (F-34), reproductions (F-32), commentaires et réponses
   (F-40, F-42), signalement (F-90), actions de l'auteur (CREA-05). Le contenu est rendu par le
   serveur. */

import type {
  CommentaireApi,
  CreationFicheApi,
  EnregistrementApi,
  ProblemeApi,
  ReproductionDeclareeApi,
  ResultatReproduction,
  SignalementEnregistreApi,
  VoteApi,
} from '@vysora/shared';
import { ISSUES, motReproductions, noteEchantillon } from '../lib/creations';
import { dateCourte } from '../lib/texte';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { $, $$, esc, icon, messageApresChargement, t, toast } from './commun/outils';

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

/** Essai déclaré, ajouté en tête des retours détaillés : même balisage que le serveur. */
function ligneEssai(essai: ReproductionDeclareeApi['reproduction']): string {
  const nom = essai.auteur.nom;
  const avatar = essai.auteur.avatar
    ? `<img src="${esc(essai.auteur.avatar)}" alt="" width="40" height="40" decoding="async">`
    : `<span class="avatar compte-avatar" style="width:40px;height:40px" aria-hidden="true">${icon('user', '')}</span>`;
  const logo = essai.outil.logo
    ? `<img src="/assets/logos-ia/${esc(essai.outil.logo)}.svg" alt="" width="24" height="24">`
    : '';
  const modele = essai.modele ? ` · ${esc(essai.modele)}` : '';
  return `<article class="repro-item"><div class="person">${avatar}<div><strong>${esc(nom)}</strong><span>${esc(ISSUES[essai.resultat])}</span></div></div><span class="ai-tool"><span class="detail-tool-name">${logo}${esc(essai.outil.nom)}</span>${modele}</span>${essai.retour ? `<p>${t(essai.retour)}</p>` : ''}</article>`;
}

const fiche = $('.creation-shell');
// Aperçu dans l'éditeur (CREA-02) : la fiche se regarde, rien ne s'y déclenche.
if (fiche && document.documentElement.hasAttribute('data-apercu')) fiche.inert = true;

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

  /* F-23 : une fiche publiée compte une vue à son ouverture ; l'API la compte une fois par visiteur
     et par jour, jamais pour l'auteur. L'aperçu de l'éditeur ne compte pas. */
  if (
    fiche.dataset.statut === 'publiee' &&
    !fiche.hasAttribute('data-auteur') &&
    !document.documentElement.hasAttribute('data-apercu')
  )
    void api('POST', `/api/v1/contenus/${creationId}/vues`);

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

  /* F-32 : « J'ai essayé » ; indicateurs de preuve mis à jour (F-33, RG-43). */
  const dialogueEssai = $<HTMLDialogElement>('#try-dialog');
  const formulaireEssai = $<HTMLFormElement>('#try-form');
  const noteEssai = $<HTMLTextAreaElement>('#try-note');
  for (const bouton of $$('[data-try]'))
    bouton.addEventListener('click', () => {
      if (exiger('contribuer', 'partager votre essai')) dialogueEssai?.showModal();
    });
  // Le message du retour tombe dès que le retour ou le résultat change (un succès n'exige rien).
  for (const evenement of ['input', 'change'])
    formulaireEssai?.addEventListener(evenement, () => noteEssai?.setCustomValidity(''));
  formulaireEssai?.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!noteEssai || !exiger('contribuer', 'partager votre essai')) return;
    const resultat = new FormData(formulaireEssai).get('outcome') as ResultatReproduction | null;
    const configuration = JSON.parse($<HTMLSelectElement>('#try-model')?.value ?? '{}') as object;
    const signaler = (message: string) => {
      noteEssai.setCustomValidity(message);
      noteEssai.reportValidity();
    };
    // RG-42 : un résultat partiel ou un échec s'explique en 20 caractères au moins.
    if (resultat && resultat !== 'SUCCES' && noteEssai.value.trim().length < 20)
      return signaler('Décrivez ce que vous avez obtenu : 20 caractères au moins.');
    const bouton = $<HTMLButtonElement>('button:not([data-close])', formulaireEssai);
    if (bouton) bouton.disabled = true;
    const reponse = await api<ReproductionDeclareeApi>(
      'POST',
      `/api/v1/creations/${creationId}/reproductions`,
      { ...configuration, resultat, retour: noteEssai.value },
    );
    if (bouton) bouton.disabled = false;
    if (!reponse.ok) {
      const { erreurs } = reponse.probleme;
      if (erreurs?.retour) return signaler(erreurs.retour);
      return signalerEchec(reponse.probleme);
    }
    const { reproduction, total, tauxSucces } = reponse.donnees;
    for (const compteur of $$('[data-repro-count]')) compteur.textContent = String(total);
    for (const mot of $$('[data-repro-mot]')) mot.textContent = motReproductions(total);
    for (const taux of $$('[data-success]')) taux.textContent = `${tauxSucces ?? 0} %`;
    const resume = $('.success-summary');
    if (resume) resume.hidden = tauxSucces === null;
    const tauxEncart = $('.proof-stats [data-success]')?.parentElement;
    if (tauxEncart) tauxEncart.hidden = tauxSucces === null;
    const note = $('.proof-note');
    if (note)
      note.textContent =
        total < 3
          ? 'Taux de succès disponible à partir de 3 essais'
          : 'Selon les retours de la communauté';
    const liste = $('#repro-list');
    if (liste && reproduction.retour) {
      $('.empty-detail', liste)?.remove();
      liste.insertAdjacentHTML('afterbegin', ligneEssai(reproduction));
    } else {
      const vide = $('#repro-list .empty-detail');
      if (vide)
        vide.textContent = 'Les essais déclarés ne comportent pas encore de retour détaillé.';
    }
    const echantillon = $('[data-sample-note]');
    const retours = $$('#repro-list .repro-item').length;
    if (echantillon && retours) {
      echantillon.textContent = noteEchantillon(retours, total);
      echantillon.hidden = false;
    }
    dialogueEssai?.close();
    formulaireEssai.reset();
    toast('Votre essai a été ajouté.', 'repeat');
  });

  $('#share')?.addEventListener('click', () => {
    void copier(`${location.origin}${location.pathname}`, 'Lien de la création copié.');
  });

  /* F-90 : signaler la création. RG-100 : un motif de la liste, une précision exigée pour « Autre »,
     un seul signalement ouvert par membre (le bouton le sait, l'API le refuse). */
  const boutonSignaler = $<HTMLButtonElement>('#report-open');
  const dialogueSignalement = $<HTMLDialogElement>('#report-dialog');
  const formulaireSignalement = $<HTMLFormElement>('#report-form');
  const motifSignalement = $<HTMLSelectElement>('#report-reason');
  const precisionSignalement = $<HTMLTextAreaElement>('#report-note');
  const dejaSignale = () =>
    toast('Vous avez déjà signalé ce contenu. La modération l’examine.', 'flag');
  boutonSignaler?.addEventListener('click', () => {
    if (!exiger('contribuer', 'signaler un contenu')) return;
    if (boutonSignaler.hasAttribute('data-signale')) return dejaSignale();
    dialogueSignalement?.showModal();
  });
  motifSignalement?.addEventListener('change', () => {
    motifSignalement.setCustomValidity('');
    if (precisionSignalement) precisionSignalement.required = motifSignalement.value === 'AUTRE';
  });
  precisionSignalement?.addEventListener('input', () => precisionSignalement.setCustomValidity(''));
  formulaireSignalement?.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!motifSignalement || !precisionSignalement || !exiger('contribuer', 'signaler un contenu'))
      return;
    const signaler = (element: HTMLSelectElement | HTMLTextAreaElement, message: string) => {
      element.setCustomValidity(message);
      element.reportValidity();
    };
    if (!motifSignalement.value)
      return signaler(motifSignalement, 'Choisissez le motif du signalement.');
    if (motifSignalement.value === 'AUTRE' && !precisionSignalement.value.trim())
      return signaler(precisionSignalement, 'Précisez le motif du signalement.');
    const bouton = $<HTMLButtonElement>('button:not([data-close])', formulaireSignalement);
    if (bouton) bouton.disabled = true;
    const reponse = await api<SignalementEnregistreApi>(
      'POST',
      `/api/v1/contenus/${creationId}/signalements`,
      { motif: motifSignalement.value, precision: precisionSignalement.value },
    );
    if (bouton) bouton.disabled = false;
    if (!reponse.ok) {
      const { erreurs, status } = reponse.probleme;
      if (erreurs?.motif) return signaler(motifSignalement, erreurs.motif);
      if (erreurs?.precision) return signaler(precisionSignalement, erreurs.precision);
      if (status === 409) {
        boutonSignaler?.setAttribute('data-signale', '');
        dialogueSignalement?.close();
        return dejaSignale();
      }
      if (status === 429) return toast(reponse.probleme.title, 'alert');
      return signalerEchec(reponse.probleme);
    }
    boutonSignaler?.setAttribute('data-signale', '');
    dialogueSignalement?.close();
    formulaireSignalement.reset();
    precisionSignalement.required = false;
    toast('Signalement enregistré.', 'flag');
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

  /* CREA-05 : actions de l'auteur (prototype : fiche-creation.js). La publication demande la case de
     confirmation (RG-17) ; la page est rechargée ensuite, car votes, essais et commentaires
     apparaissent ou disparaissent avec elle. La suppression montre l'écran « Création supprimée ». */
  const fenetrePublication = $<HTMLDialogElement>('#publish-dialog');
  const formulairePublication = $<HTMLFormElement>('#publish-form');
  const casePublication = $<HTMLInputElement>('#publish-consent');
  const erreurCase = $('#publish-consent-err');
  const erreursPublication = $('#publish-errors');
  const fenetreSuppression = $<HTMLDialogElement>('#delete-dialog');

  const signalerCase = (visible: boolean) => {
    if (!erreurCase || !casePublication) return;
    erreurCase.hidden = !visible;
    if (visible) {
      casePublication.setAttribute('aria-invalid', 'true');
      casePublication.setAttribute('aria-describedby', 'publish-consent-err');
    } else {
      casePublication.removeAttribute('aria-invalid');
      casePublication.removeAttribute('aria-describedby');
    }
  };
  casePublication?.addEventListener('change', () => signalerCase(false));

  async function depublier(bouton: HTMLElement): Promise<void> {
    if (bouton.getAttribute('aria-busy') === 'true') return;
    bouton.setAttribute('aria-busy', 'true');
    const reponse = await api<CreationFicheApi>(
      'DELETE',
      `/api/v1/creations/${creationId}/publication`,
    );
    bouton.removeAttribute('aria-busy');
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    messageApresChargement('Création dépubliée : elle est de nouveau un brouillon.');
    location.reload();
  }

  fiche.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const action = cible.closest<HTMLElement>('[data-status-action]');
    if (action?.dataset.statusAction === 'publier') {
      if (!exiger('contribuer', 'publier cette création')) return;
      if (casePublication) casePublication.checked = false;
      signalerCase(false);
      if (erreursPublication) erreursPublication.hidden = true;
      fenetrePublication?.showModal();
    } else if (action?.dataset.statusAction === 'depublier') {
      if (exiger('contribuer', 'dépublier cette création')) void depublier(action);
    } else if (cible.closest('[data-delete]')) fenetreSuppression?.showModal();
  });

  formulairePublication?.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!casePublication?.checked) {
      signalerCase(true);
      casePublication?.focus();
      return;
    }
    const bouton = $<HTMLButtonElement>('[type="submit"]', formulairePublication);
    if (bouton?.getAttribute('aria-busy') === 'true') return;
    bouton?.setAttribute('aria-busy', 'true');
    const reponse = await api<CreationFicheApi>(
      'POST',
      `/api/v1/creations/${creationId}/publication`,
      { confirmationDonnees: true },
    );
    bouton?.removeAttribute('aria-busy');
    if (reponse.ok) {
      messageApresChargement('Création publiée.');
      location.reload();
      return;
    }
    // Points à compléter (RG-10 à RG-16) ou limite de publication (RG-85) : affichés dans la fenêtre.
    const { probleme } = reponse;
    const points = Object.entries(probleme.erreurs ?? {}).filter(
      ([cle]) => cle !== 'confirmationDonnees',
    );
    if (!points.length && probleme.erreurs?.confirmationDonnees) return signalerCase(true);
    if (erreursPublication && (points.length || probleme.code === 'LIMITE_ATTEINTE')) {
      erreursPublication.innerHTML = points.length
        ? `<p><b>${t(probleme.detail ?? probleme.title)}</b></p><ul>${points
            .map(([, message]) => `<li>${t(message)}</li>`)
            .join('')}</ul>`
        : `<p>${t(probleme.detail ?? probleme.title)}</p>`;
      erreursPublication.hidden = false;
      erreursPublication.focus();
      return;
    }
    fenetrePublication?.close();
    signalerEchec(probleme);
  });

  $('[data-delete-confirm]')?.addEventListener('click', async (evenement) => {
    const bouton = evenement.currentTarget as HTMLButtonElement;
    if (bouton.getAttribute('aria-busy') === 'true') return;
    bouton.setAttribute('aria-busy', 'true');
    const reponse = await api('DELETE', `/api/v1/creations/${creationId}`);
    bouton.removeAttribute('aria-busy');
    fenetreSuppression?.close();
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    fiche.dataset.affichage = 'supprimee';
    scrollTo({ top: 0 });
    $<HTMLElement>('[data-off="supprimee"] h1')?.focus();
    toast('Création supprimée.', 'trash');
  });

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
