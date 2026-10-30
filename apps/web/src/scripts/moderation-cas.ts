/* Examen d'un cas Bon réflexe (MOD-03, F-61, RG-71) : valider, ou refuser avec un motif. Le motif ne
   se demande que pour un refus ; la saisie est contrôlée avec le schéma de l'API, puis l'examen part
   (PUT /api/v1/cas/:id/examen) et la liste des cas à valider s'ouvre avec un message. */

import { LONGUEURS, erreursParChamp, schemaExamenCas } from '@vysora/shared';
import { ROUTES } from '../lib/navigation';
import { api } from './commun/api';
import { $, $$, fmt, messageApresChargement, typo } from './commun/outils';

const formulaire = $<HTMLFormElement>('[data-md-cas-form]');

if (formulaire) {
  const casId = Number(formulaire.dataset.cas);
  const zoneMotif = $('[data-md-motif]', formulaire);
  const motif = $<HTMLTextAreaElement>('#md-motif', formulaire);
  const compteur = $('[data-md-compteur]', formulaire);
  const envoyer = $<HTMLButtonElement>('.md-envoyer', formulaire);

  const decision = () =>
    $<HTMLInputElement>('input[name="decision"]:checked', formulaire)?.value ?? null;
  const CHAMPS: Record<string, HTMLElement | null> = {
    decision: $('input[name="decision"]', formulaire),
    motif,
  };

  function erreur(champ: string, message = ''): void {
    const zone = $(`[data-md-erreur="${champ}"]`, formulaire ?? document);
    if (zone) {
      zone.textContent = typo(message);
      zone.hidden = !message;
    }
    CHAMPS[champ]?.setAttribute('aria-invalid', String(Boolean(message)));
  }
  function afficherErreurs(erreurs: Record<string, string>): void {
    for (const champ of ['decision', 'motif', 'general']) erreur(champ, erreurs[champ] ?? '');
    const premier = ['decision', 'motif'].find((champ) => erreurs[champ]);
    if (premier) CHAMPS[premier]?.focus();
  }

  for (const choix of $$<HTMLInputElement>('input[name="decision"]', formulaire))
    choix.addEventListener('change', () => {
      erreur('decision');
      if (zoneMotif) zoneMotif.hidden = decision() !== 'REFUSE';
      if (decision() === 'REFUSE') motif?.focus();
    });
  motif?.addEventListener('input', () => {
    erreur('motif');
    if (compteur)
      compteur.textContent = `${fmt(motif.value.length)} / ${fmt(LONGUEURS.motifRefusCas.max)}`;
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (envoyer?.disabled) return;
    const resultat = schemaExamenCas.safeParse({ decision: decision(), motif: motif?.value ?? '' });
    if (!resultat.success) return afficherErreurs(erreursParChamp(resultat.error));
    afficherErreurs({});
    if (envoyer) {
      envoyer.disabled = true;
      envoyer.setAttribute('aria-busy', 'true');
    }
    const reponse = await api('PUT', `/api/v1/cas/${casId}/examen`, resultat.data);
    if (reponse.ok) {
      messageApresChargement(
        resultat.data.decision === 'VALIDE'
          ? 'Cas validé : il est publié dans Bon réflexe.'
          : 'Cas refusé : son auteur reçoit le motif.',
      );
      window.location.replace(ROUTES.casAValider);
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
        ? `${detail ?? title} Rechargez la page pour voir l’état du cas.`
        : status === 404
          ? 'Ce cas est introuvable : il a pu être supprimé entre-temps.'
          : 'L’examen n’a pas été enregistré. Réessayez dans un instant.',
    );
  });
}
