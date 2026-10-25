/* Dossier de la modération (MOD-02, F-91) : formulaire de décision. La durée ne se demande que pour
   une suspension, avec la date de fin ; le compteur suit le motif ; l'issue des signalements ouverts
   est annoncée (RG-102). La saisie est contrôlée avec le schéma de l'API, l'envoi passe par une
   fenêtre de confirmation, puis la page est rechargée avec la décision dans le dossier. */

import {
  DELAIS,
  LIBELLES_ACTION_DECISION,
  LONGUEURS,
  erreursParChamp,
  schemaDecisionModeration,
  type ActionDecisionModerateur,
  type DecisionApi,
} from '@vysora/shared';
import {
  QUESTIONS_ACTION,
  confirmationDecision,
  finSuspension,
  issueAnnoncee,
} from '../lib/moderation';
import { dateLongue } from '../lib/texte';
import { api } from './commun/api';
import { $, $$, fmt, messageApresChargement, typo } from './commun/outils';

const { min, max } = DELAIS.suspensionJours;
const formulaire = $<HTMLFormElement>('[data-md-form]');
const dialogue = $<HTMLDialogElement>('[data-md-dialogue]');

if (formulaire && dialogue) {
  const contenuId = Number(formulaire.dataset.contenu);
  const ouverts = Number(formulaire.dataset.ouverts ?? 0);
  const zoneDuree = $('[data-md-duree]', formulaire);
  const champDuree = $<HTMLInputElement>('#md-duree', formulaire);
  const aideDuree = $('[data-md-fin]', formulaire);
  const aideDureeInitiale = aideDuree?.textContent ?? '';
  const motif = $<HTMLTextAreaElement>('#md-motif', formulaire);
  const compteur = $('[data-md-compteur]', formulaire);
  const issue = $('[data-md-issue]', formulaire);
  const envoyer = $<HTMLButtonElement>('.md-envoyer', formulaire);
  const titreDialogue = $('[data-md-dialogue-titre]', dialogue);
  const texteDialogue = $('[data-md-dialogue-texte]', dialogue);
  const confirmer = $<HTMLButtonElement>('[data-md-confirmer]', dialogue);

  const action = (): ActionDecisionModerateur | null =>
    ($<HTMLInputElement>('input[name="action"]:checked', formulaire)?.value as
      ActionDecisionModerateur | undefined) ?? null;
  const duree = (): number | null => (champDuree?.value.trim() ? Number(champDuree.value) : null);

  const CHAMPS: Record<string, HTMLElement | null> = {
    action: $('input[name="action"]', formulaire),
    dureeJours: champDuree,
    motif,
  };

  /** Message sous un champ ; sans message, l'erreur s'efface. */
  function erreur(champ: string, message = ''): void {
    const zone = $(`[data-md-erreur="${champ}"]`, formulaire ?? document);
    if (zone) {
      zone.textContent = typo(message);
      zone.hidden = !message;
    }
    const element = CHAMPS[champ];
    if (element && champ !== 'action')
      element.setAttribute('aria-invalid', String(Boolean(message)));
  }
  const effacer = () => ['action', 'dureeJours', 'motif', 'general'].forEach((c) => erreur(c));

  function afficherErreurs(erreurs: Record<string, string>): void {
    for (const [champ, message] of Object.entries(erreurs))
      erreur(champ in CHAMPS ? champ : 'general', message);
    const premier = Object.keys(erreurs).find((c) => c in CHAMPS);
    (premier ? CHAMPS[premier] : null)?.focus();
  }

  /** Durée, date de fin et issue des signalements selon la décision choisie. */
  function suivreChoix(): void {
    const choisie = action();
    const suspension = choisie === 'SUSPENDRE';
    if (zoneDuree) zoneDuree.hidden = !suspension;
    if (champDuree) champDuree.required = suspension;
    if (!suspension && champDuree) {
      champDuree.value = '';
      erreur('dureeJours');
    }
    const message = choisie ? issueAnnoncee(choisie, ouverts) : '';
    if (issue) {
      issue.textContent = typo(message);
      issue.hidden = !message;
    }
    if (choisie) erreur('action');
  }

  function suivreDuree(): void {
    const jours = duree();
    if (!aideDuree) return;
    aideDuree.textContent =
      jours !== null && Number.isInteger(jours) && jours >= min && jours <= max
        ? typo(`Jusqu’au ${dateLongue(finSuspension(jours))}.`)
        : aideDureeInitiale;
    erreur('dureeJours');
  }

  function suivreMotif(): void {
    if (compteur && motif)
      compteur.textContent = `${fmt(motif.value.length)} / ${fmt(LONGUEURS.motifDecision.max)}`;
    erreur('motif');
  }

  for (const choix of $$<HTMLInputElement>('input[name="action"]', formulaire))
    choix.addEventListener('change', suivreChoix);
  champDuree?.addEventListener('input', suivreDuree);
  motif?.addEventListener('input', suivreMotif);

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    effacer();
    const saisie = { action: action(), motif: motif?.value ?? '', dureeJours: duree() };
    const resultat = schemaDecisionModeration.safeParse(saisie);
    if (!resultat.success) return afficherErreurs(erreursParChamp(resultat.error));
    const { action: choisie, dureeJours } = resultat.data;
    if (titreDialogue) titreDialogue.textContent = typo(QUESTIONS_ACTION[choisie]);
    if (texteDialogue)
      texteDialogue.textContent = typo(
        confirmationDecision(choisie, ouverts, dureeJours ? finSuspension(dureeJours) : null),
      );
    if (confirmer) {
      confirmer.textContent = typo(LIBELLES_ACTION_DECISION[choisie]);
      confirmer.classList.toggle('is-danger', choisie === 'SUPPRIMER');
    }
    dialogue.showModal();
  });

  // L'envoi part du bouton lui-même : l'événement « close » d'une fenêtre peut se faire attendre
  // (page en arrière-plan).
  confirmer?.addEventListener('click', async () => {
    dialogue.close();
    const resultat = schemaDecisionModeration.safeParse({
      action: action(),
      motif: motif?.value ?? '',
      dureeJours: duree(),
    });
    if (!resultat.success) return afficherErreurs(erreursParChamp(resultat.error));
    if (envoyer) {
      envoyer.disabled = true;
      envoyer.setAttribute('aria-busy', 'true');
    }
    const reponse = await api<DecisionApi>(
      'POST',
      `/api/v1/moderation/contenus/${contenuId}/decisions`,
      resultat.data,
    );
    if (reponse.ok) {
      messageApresChargement(
        resultat.data.action === 'AUCUNE'
          ? 'Décision enregistrée.'
          : 'Décision enregistrée. L’auteur en est informé par e-mail.',
      );
      // Nouvelle visite plutôt que rechargement : le navigateur ne remet pas l’ancienne saisie.
      window.location.replace(window.location.pathname);
      return;
    }
    if (envoyer) {
      envoyer.disabled = false;
      envoyer.removeAttribute('aria-busy');
    }
    const { status, erreurs, detail, title } = reponse.probleme;
    if (erreurs && Object.keys(erreurs).length) return afficherErreurs(erreurs);
    erreur(
      'general',
      status === 409 || status === 403
        ? `${detail ?? title} Rechargez la page pour voir l’état du contenu.`
        : status === 404
          ? 'Ce contenu est introuvable : il a pu être supprimé entre-temps.'
          : 'La décision n’a pas été enregistrée. Réessayez dans un instant.',
    );
  });

  /* Fenêtre de confirmation : un clic hors de la fenêtre l'annule. */
  dialogue.addEventListener('click', (evenement) => {
    if (evenement.target !== dialogue) return;
    const cadre = dialogue.getBoundingClientRect();
    const { clientX: x, clientY: y } = evenement;
    if (x < cadre.left || x > cadre.right || y < cadre.top || y > cadre.bottom)
      dialogue.close('annuler');
  });

  suivreChoix();
  suivreMotif();
}
