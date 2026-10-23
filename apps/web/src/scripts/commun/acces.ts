/* Accès aux actions réservées (prototype/commun.js : exiger, accesBloc, invitation, BOUTONS et
   gardes des liens), chargé par toutes les pages. L'API reste seule juge : une page qui reçoit
   un refus 401 ou 403 le présente avec presenterRefus, qui ouvre le même dialogue.

   exiger('contribuer', 'voter') : vrai si l'action est permise ; sinon le dialogue explique
   pourquoi (connexion, e-mail, conditions, suspension, niveau, rôle) et propose la suite. */

import type { ActionReservee, ProblemeApi, RaisonRefus } from '@vysora/shared';
import {
  actionDemandee,
  actionsHTML,
  invitationHTML,
  motifAcces,
  raisonDuRefus,
  type BoutonAcces,
  type ContexteAcces,
} from '../../lib/acces';
import { ROUTES } from '../../lib/navigation';
import { api } from './api';
import { etats } from './etats';
import { $, $$, icon, messageApresChargement, t, toast } from './outils';

const contexte = (): ContexteAcces => ({
  page: `${location.pathname}${location.search}${location.hash}`,
  adresse: location.href,
  niveau: etats.get().niveau,
  points: etats.moi()?.points ?? 0,
  ...etats.dates(),
});

/* Boutons du dialogue et du bandeau du compte (data-acces-bouton) ----------------------- */

/** « Renvoyer l'e-mail » : nouveau lien de confirmation (AUTH-02, RG-02). */
async function renvoyerEmail(): Promise<void> {
  const reponse = await api('POST', '/api/v1/comptes/verification/renvoi', {});
  if (reponse.ok) {
    toast('E-mail de confirmation renvoyé.', 'mail');
    return;
  }
  const { probleme } = reponse;
  if (probleme.status === 409) {
    // Adresse confirmée entre-temps (lien ouvert dans un autre onglet) : la page se met à jour.
    messageApresChargement('Votre adresse e-mail est déjà confirmée.');
    location.reload();
    return;
  }
  if (presenterRefus(probleme, 'continuer')) return;
  toast(
    probleme.code === 'TROP_DE_REQUETES'
      ? 'Trop de demandes. Réessayez dans quelques minutes.'
      : 'L’envoi n’a pas abouti. Réessayez dans un instant.',
    'alert',
  );
}

/** « Accepter » : versions en vigueur des documents légaux (AUTH-05, RG-03). La page est rendue
    de nouveau par le serveur, sans le bandeau ; le message suit. */
async function accepterConditions(): Promise<void> {
  const reponse = await api('POST', '/api/v1/moi/acceptations', { accepte: true });
  if (reponse.ok) {
    messageApresChargement('Conditions acceptées.');
    location.reload();
    return;
  }
  if (presenterRefus(reponse.probleme, 'continuer')) return;
  toast('L’acceptation n’a pas abouti. Réessayez dans un instant.', 'alert');
}

const BOUTONS: Record<BoutonAcces, () => Promise<void>> = {
  email: renvoyerEmail,
  conditions: accepterConditions,
};
const estBouton = (nom: string | undefined): nom is BoutonAcces =>
  nom !== undefined && Object.hasOwn(BOUTONS, nom);

document.addEventListener('click', async (evenement) => {
  const bouton = (evenement.target as Element).closest<HTMLButtonElement>('[data-acces-bouton]');
  if (!bouton) return;
  bouton.closest('dialog')?.close();
  const nom = bouton.dataset.accesBouton;
  if (!estBouton(nom)) return;
  // Le même bouton peut figurer dans le bandeau et dans le dialogue : un seul envoi à la fois.
  const memes = $$<HTMLButtonElement>(`[data-acces-bouton="${nom}"]`);
  if (memes.some((b) => b.disabled)) return;
  memes.forEach((b) => (b.disabled = true));
  try {
    await BOUTONS[nom]();
  } finally {
    memes.forEach((b) => (b.disabled = false));
  }
});

/* Dialogue d'accès ------------------------------------------------------------------- */

let dialogue: HTMLDialogElement | null = null;

/** Ouvre le dialogue pour une raison de refus (celle de l'état de la page ou celle de l'API). */
export function ouvrirAcces(raison: RaisonRefus, quoi = 'participer'): void {
  const m = motifAcces(raison, quoi, contexte());
  if (!dialogue) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog class="acces" aria-labelledby="acces-titre" data-acces></dialog>',
    );
    const cree = $<HTMLDialogElement>('[data-acces]')!;
    cree.addEventListener('click', (evenement) => {
      const cible = evenement.target as Element;
      if (cible === cree || cible.closest('[data-acces-fermer]')) cree.close();
    });
    dialogue = cree;
  }
  dialogue.innerHTML = `<button class="icon-btn acces-fermer" type="button" aria-label="Fermer" data-acces-fermer>${icon('close', '')}</button>
      <span class="acces-icone" aria-hidden="true">${icon(m.icone, '')}</span>
      <h2 id="acces-titre">${t(m.titre)}</h2>
      <p>${t(m.texte)}</p>
      <div class="acces-actions">${actionsHTML(m.actions, false)}</div>`;
  if (!dialogue.open) dialogue.showModal();
  $<HTMLElement>('.acces-actions > *', dialogue)?.focus();
}

/** Vrai si l'action est permise ; sinon ouvre le dialogue qui explique ce qui manque. */
export function exiger(action: ActionReservee = 'contribuer', quoi = 'participer'): boolean {
  const raison = etats.raison(action);
  if (!raison) return true;
  ouvrirAcces(raison, quoi);
  return false;
}

/** Même message, intégré à la page (ex. : l'éditeur ouvert par un visiteur) ; vide si l'action est permise. */
export function accesBloc(action: ActionReservee, quoi: string, titre: 'h2' | 'h3' = 'h2'): string {
  const raison = etats.raison(action);
  if (!raison) return '';
  const m = motifAcces(raison, quoi, contexte());
  return `<div class="acces-bloc"><span class="acces-icone" aria-hidden="true">${icon(m.icone, '')}</span><${titre}>${t(m.titre)}</${titre}><p>${t(m.texte)}</p><div class="acces-actions">${actionsHTML(m.actions, true)}</div></div>`;
}

/** Phrase d'invitation à placer dans la page quand l'action n'est pas permise ; vide sinon. */
export function invitation(action: ActionReservee, quoi: string): string {
  const raison = etats.raison(action);
  return raison ? invitationHTML(raison, quoi, contexte()) : '';
}

/** Refus de l'API (401 ou 403 avec sa raison) : ouvre le bon dialogue et renvoie vrai ;
    faux pour toute autre erreur, que la page présente elle-même. */
export function presenterRefus(probleme: ProblemeApi, quoi = 'participer'): boolean {
  const raison = raisonDuRefus(probleme);
  if (!raison) return false;
  ouvrirAcces(raison, quoi);
  return true;
}

/* Liens qui mènent à une action réservée : publier une création, ouvrir un sujet.
   Ailleurs, data-exige="action" et data-exige-quoi="…" posent la même garde.
   Dans une zone data-sans-garde (connexion, inscription), les liens ramènent simplement
   à la page d'origine : celle-ci explique elle-même ce qui manque. */

const GARDES: [selecteur: string, quoi: string][] = [
  [`a[href^="${ROUTES.publier}"]`, 'publier une création'],
  [`a[href^="${ROUTES.nouveauSujet}"]`, 'publier une question'],
  ['[data-exige]', 'participer'],
];

document.addEventListener(
  'click',
  (evenement) => {
    if (evenement.button !== 0 || evenement.metaKey || evenement.ctrlKey || evenement.shiftKey)
      return;
    const cible = evenement.target as Element;
    if (cible.closest('[data-sans-garde]')) return;
    const garde = GARDES.find(([selecteur]) => cible.closest(selecteur));
    if (!garde) return;
    const element = cible.closest<HTMLElement>(garde[0])!;
    const action = actionDemandee(element.dataset.exige);
    if (exiger(action, element.dataset.exigeQuoi || garde[1])) return;
    evenement.preventDefault();
    evenement.stopImmediatePropagation();
  },
  true,
);
