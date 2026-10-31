/* Dossier d'un membre (ADM-02, RG-102) : décisions réservées aux administrateurs. Les points ne se
   demandent que pour un ajustement de la réputation, avec la réputation qui en résulte ; le badge,
   pour un retrait. La saisie est contrôlée avec le schéma de l'API, l'envoi passe par une fenêtre
   de confirmation, puis la page est rechargée avec la décision dans le dossier (comme le dossier
   d'un contenu, scripts/moderation.ts). */

import {
  LIBELLES_ACTION_DECISION,
  LONGUEURS,
  erreursParChamp,
  schemaDecisionAdministrateur,
  type ActionDecisionAdministrateur,
  type DecisionApi,
} from '@vysora/shared';
import { QUESTIONS_ACTION_ADMINISTRATEUR, confirmationDecisionMembre } from '../lib/moderation';
import { pluriel } from '../lib/texte';
import { api } from './commun/api';
import { $, $$, fmt, messageApresChargement, typo } from './commun/outils';

const formulaire = $<HTMLFormElement>('[data-ad-dossier]');
const dialogue = $<HTMLDialogElement>('[data-md-dialogue]');

if (formulaire && dialogue) {
  const membreId = Number(formulaire.dataset.membre);
  const reputation = Number(formulaire.dataset.reputation ?? 0);
  const zonePoints = $('[data-ad-points]', formulaire);
  const champPoints = $<HTMLInputElement>('#ad-points', formulaire);
  const aidePoints = $('[data-ad-points-aide]', formulaire);
  const aidePointsInitiale = aidePoints?.textContent ?? '';
  const zoneBadge = $('[data-ad-badge]', formulaire);
  const champBadge = $<HTMLSelectElement>('#ad-badge', formulaire);
  const motif = $<HTMLTextAreaElement>('#md-motif', formulaire);
  const compteur = $('[data-md-compteur]', formulaire);
  const envoyer = $<HTMLButtonElement>('.md-envoyer', formulaire);
  const titreDialogue = $('[data-md-dialogue-titre]', dialogue);
  const texteDialogue = $('[data-md-dialogue-texte]', dialogue);
  const confirmer = $<HTMLButtonElement>('[data-md-confirmer]', dialogue);

  const action = (): ActionDecisionAdministrateur | null =>
    ($<HTMLInputElement>('input[name="action"]:checked', formulaire)?.value as
      ActionDecisionAdministrateur | undefined) ?? null;
  const points = (): number | null =>
    champPoints?.value.trim() ? Number(champPoints.value) : null;
  const saisie = () => ({
    action: action(),
    motif: motif?.value ?? '',
    points: action() === 'AJUSTER_REPUTATION' ? points() : null,
    badge: action() === 'RETIRER_BADGE' ? champBadge?.value || null : null,
  });

  const CHAMPS: Record<string, HTMLElement | null> = {
    action: $('input[name="action"]', formulaire),
    points: champPoints,
    badge: champBadge,
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
  const effacer = () => ['action', 'points', 'badge', 'motif', 'general'].forEach((c) => erreur(c));

  function afficherErreurs(erreurs: Record<string, string>): void {
    for (const [champ, message] of Object.entries(erreurs))
      erreur(champ in CHAMPS ? champ : 'general', message);
    const premier = Object.keys(erreurs).find((c) => c in CHAMPS);
    (premier ? CHAMPS[premier] : null)?.focus();
  }

  /** Points ou badge selon la décision choisie. */
  function suivreChoix(): void {
    const choisie = action();
    if (zonePoints) zonePoints.hidden = choisie !== 'AJUSTER_REPUTATION';
    if (zoneBadge) zoneBadge.hidden = choisie !== 'RETIRER_BADGE';
    if (choisie !== 'AJUSTER_REPUTATION') erreur('points');
    if (choisie !== 'RETIRER_BADGE') erreur('badge');
    if (choisie) erreur('action');
  }

  function suivrePoints(): void {
    const valeur = points();
    if (aidePoints)
      aidePoints.textContent =
        valeur !== null && Number.isInteger(valeur) && valeur !== 0
          ? typo(
              `Réputation après l’ajustement : ${pluriel(Math.max(0, reputation + valeur), 'point', 'points')}.`,
            )
          : aidePointsInitiale;
    erreur('points');
  }

  function suivreMotif(): void {
    if (compteur && motif)
      compteur.textContent = `${fmt(motif.value.length)} / ${fmt(LONGUEURS.motifDecision.max)}`;
    erreur('motif');
  }

  for (const choix of $$<HTMLInputElement>('input[name="action"]', formulaire))
    choix.addEventListener('change', suivreChoix);
  champPoints?.addEventListener('input', suivrePoints);
  champBadge?.addEventListener('change', () => erreur('badge'));
  motif?.addEventListener('input', suivreMotif);

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    effacer();
    const resultat = schemaDecisionAdministrateur.safeParse(saisie());
    if (!resultat.success) return afficherErreurs(erreursParChamp(resultat.error));
    const { action: choisie } = resultat.data;
    if (titreDialogue) titreDialogue.textContent = typo(QUESTIONS_ACTION_ADMINISTRATEUR[choisie]);
    if (texteDialogue)
      texteDialogue.textContent = typo(
        confirmationDecisionMembre(choisie, {
          points: resultat.data.points,
          reputation,
          badge: champBadge?.selectedOptions[0]?.textContent?.trim() ?? null,
        }),
      );
    if (confirmer) {
      confirmer.textContent = typo(LIBELLES_ACTION_DECISION[choisie]);
      confirmer.classList.toggle('is-danger', choisie === 'BANNIR');
    }
    dialogue.showModal();
  });

  // L'envoi part du bouton lui-même : l'événement « close » d'une fenêtre peut se faire attendre
  // (page en arrière-plan).
  confirmer?.addEventListener('click', async () => {
    dialogue.close();
    const resultat = schemaDecisionAdministrateur.safeParse(saisie());
    if (!resultat.success) return afficherErreurs(erreursParChamp(resultat.error));
    if (envoyer) {
      envoyer.disabled = true;
      envoyer.setAttribute('aria-busy', 'true');
    }
    const reponse = await api<DecisionApi>(
      'POST',
      `/api/v1/admin/membres/${membreId}/decisions`,
      resultat.data,
    );
    if (reponse.ok) {
      messageApresChargement('Décision enregistrée. Le membre en est informé par e-mail.');
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
        ? `${detail ?? title} Rechargez la page pour voir l’état du compte.`
        : status === 404
          ? 'Ce membre est introuvable.'
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
