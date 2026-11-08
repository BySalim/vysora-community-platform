/* Accès aux actions réservées (prototype/commun.js : exiger, accesBloc, invitation, gardes de liens).
   exiger('contribuer', 'voter') : vrai si l'action est permise ; sinon un dialogue explique pourquoi
   (connexion, e-mail, conditions, suspension, niveau, rôle) et propose la suite. Le site ne fait
   qu'anticiper : l'API refuse de toute façon, avec la même raison. Chargé par toutes les pages. */

import type { ActionReservee, LienEnvoye, SessionApi } from '@vysora/shared';
import {
  blocAccesHtml,
  dialogueAccesHtml,
  invitationHtml,
  messageAcces,
  type BaliseTitre,
  type BoutonAcces,
  type ContexteAcces,
} from '../../lib/acces';
import { ROUTES } from '../../lib/navigation';
import { api } from './api';
import { etats } from './etats';
import { $, messageApresChargement, toast } from './outils';
import { annoncerChangementCompte } from './suivi-compte';

const contexte = (): ContexteAcces => ({
  page: `${location.pathname}${location.search}${location.hash}`,
  adresse: location.href,
  ...etats.dates(),
  niveau: etats.get().niveau,
  points: etats.moi()?.points ?? 0,
});

let dialogue: HTMLDialogElement | null = null;

function ouvrirAcces(action: ActionReservee, quoi: string): void {
  const raison = etats.raison(action);
  if (!raison) return;
  if (!dialogue) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog class="acces" aria-labelledby="acces-titre" data-acces></dialog>',
    );
    dialogue = $<HTMLDialogElement>('[data-acces]')!;
    dialogue.addEventListener('click', (evenement) => {
      const cible = evenement.target as Element;
      if (cible === dialogue || cible.closest('[data-acces-fermer]')) dialogue?.close();
    });
  }
  dialogue.innerHTML = dialogueAccesHtml(messageAcces(raison, quoi, contexte()));
  if (!dialogue.open) dialogue.showModal();
  $<HTMLElement>('.acces-actions > *', dialogue)?.focus();
}

/** Vrai si l'action est permise ; sinon ouvre le dialogue qui explique la suite. */
export function exiger(action: ActionReservee = 'contribuer', quoi = 'participer'): boolean {
  if (etats.peut(action)) return true;
  ouvrirAcces(action, quoi);
  return false;
}

/** Même message, intégré à la page ; vide si l'action est permise. */
export function accesBloc(action: ActionReservee, quoi: string, titre: BaliseTitre = 'h2'): string {
  const raison = etats.raison(action);
  return raison ? blocAccesHtml(messageAcces(raison, quoi, contexte()), titre) : '';
}

/** Phrase d'invitation à placer dans la page quand l'action n'est pas permise ; vide sinon. */
export function invitation(action: ActionReservee, quoi: string): string {
  const raison = etats.raison(action);
  return raison ? invitationHtml(raison, quoi, contexte()) : '';
}

/* Boutons du dialogue, du bandeau du compte et des paramètres (data-acces-bouton). ------------- */

/** L'état a changé ailleurs (autre onglet, session expirée) : la page est rendue de nouveau. */
function recharger(message: string): void {
  messageApresChargement(message);
  location.reload();
}

async function renvoyerEmail(): Promise<void> {
  const reponse = await api<LienEnvoye>('POST', '/api/v1/comptes/verification/renvoi', {});
  if (reponse.ok) {
    toast('E-mail de confirmation renvoyé.', 'mail');
    return;
  }
  const { status, code } = reponse.probleme;
  if (status === 409) recharger('Votre adresse e-mail est déjà confirmée.');
  else if (status === 401) recharger('Votre session a pris fin. Connectez-vous de nouveau.');
  else if (code === 'TROP_DE_REQUETES')
    toast('Trop de demandes. Réessayez dans quelques minutes.', 'alert');
  else toast('L’envoi n’a pas abouti. Réessayez dans un instant.', 'alert');
}

/** Événement émis sur document quand le membre a accepté les versions en vigueur (pages légales). */
export const DOCUMENTS_ACCEPTES = 'vysora:documents-acceptes';

/** RG-03 : acceptation des versions en vigueur ; le compte sort de la lecture seule.
    Vrai si l'acceptation est enregistrée (le message est alors affiché). */
export async function accepterDocuments(message: string): Promise<boolean> {
  const reponse = await api<SessionApi>('POST', '/api/v1/moi/acceptations', { accepte: true });
  if (!reponse.ok) {
    if (reponse.probleme.status === 401)
      recharger('Votre session a pris fin. Connectez-vous de nouveau.');
    else
      toast('L’enregistrement est momentanément indisponible. Réessayez dans un instant.', 'alert');
    return false;
  }
  const session = reponse.donnees;
  // Les autres onglets ouverts sur Vysora sortent aussi de la lecture seule.
  annoncerChangementCompte();
  // Une version entrée en vigueur entre-temps, ou un bloc d'accès rendu par le serveur à la place
  // du contenu : seule une nouvelle page montre le bon état.
  if (session.etat.compte === 'conditions' || $('[data-acces-bloc]')) {
    recharger(message);
    return true;
  }
  const bandeau = $('[data-etat-bandeau][data-motif="conditions"]');
  const focusDansBandeau = bandeau?.contains(document.activeElement) ?? false;
  etats.appliquer(session);
  bandeau?.remove();
  if (focusDansBandeau) $<HTMLElement>('#contenu')?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent(DOCUMENTS_ACCEPTES));
  toast(message);
  return true;
}

const BOUTONS: Record<BoutonAcces, () => Promise<unknown>> = {
  email: renvoyerEmail,
  conditions: () => accepterDocuments('Conditions acceptées.'),
};
const enCours = new Set<BoutonAcces>();

document.addEventListener('click', async (evenement) => {
  const bouton = (evenement.target as Element).closest<HTMLButtonElement>('[data-acces-bouton]');
  if (!bouton) return;
  const cle = bouton.dataset.accesBouton as BoutonAcces;
  const traitement = BOUTONS[cle];
  if (!traitement || enCours.has(cle)) return;
  bouton.closest('dialog')?.close();
  enCours.add(cle);
  // aria-disabled plutôt que disabled : un bouton désactivé perdrait le focus du clavier.
  bouton.setAttribute('aria-disabled', 'true');
  try {
    await traitement();
  } finally {
    enCours.delete(cle);
    bouton.removeAttribute('aria-disabled');
  }
});

/* Gardes des liens qui mènent à une action réservée (publier une création, ouvrir un sujet) ;
   ailleurs, data-exige="action" et data-exige-quoi="…" posent la même garde. Dans une zone
   data-sans-garde (connexion, inscription), les liens ramènent simplement à la page d'origine :
   celle-ci explique elle-même ce qui manque. */

const ACTIONS: readonly ActionReservee[] = [
  'contribuer',
  'parametres',
  'proposer-cas',
  'moderer',
  'administrer',
];
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
    const cible = evenement.target;
    if (!(cible instanceof Element) || cible.closest('[data-sans-garde]')) return;
    const garde = GARDES.find(([selecteur]) => cible.closest(selecteur));
    if (!garde) return;
    const element = cible.closest<HTMLElement>(garde[0])!;
    const demandee = element.dataset.exige as ActionReservee | undefined;
    const action = demandee && ACTIONS.includes(demandee) ? demandee : 'contribuer';
    if (exiger(action, element.dataset.exigeQuoi || garde[1])) return;
    evenement.preventDefault();
    evenement.stopImmediatePropagation();
  },
  true,
);
