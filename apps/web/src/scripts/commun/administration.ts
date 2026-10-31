/* Outils communs des écrans d'administration (ADM-01, ADM-02) : fenêtre de confirmation, refus de
   l'API et erreurs des formulaires, chacune sous son champ. L'API reste seule juge : un refus
   (dernier administrateur, nom déjà pris, licence par défaut) s'affiche tel qu'elle le formule. */

import { $, $$, toast, typo } from './outils';

export interface ProblemeAdministration {
  status: number;
  detail?: string;
  title: string;
  erreurs?: Record<string, string>;
}

export const dialogue = $<HTMLDialogElement>('[data-ad-dialogue]');
let action: (() => Promise<void>) | null = null;

/** Fenêtre de confirmation ; « Confirmer » lance l'action. */
export function confirmer(
  titre: string,
  texte: string,
  libelle: string,
  surConfirmation: () => Promise<void>,
): void {
  if (!dialogue) return;
  $('[data-ad-dialogue-titre]', dialogue)!.textContent = typo(titre);
  $('[data-ad-dialogue-texte]', dialogue)!.textContent = typo(texte);
  $('[data-ad-confirmer]', dialogue)!.textContent = typo(libelle);
  action = surConfirmation;
  dialogue.showModal();
}
$('[data-ad-confirmer]', dialogue ?? document)?.addEventListener('click', () => {
  dialogue?.close();
  void action?.();
  action = null;
});

export function signalerRefus(probleme: ProblemeAdministration): void {
  toast(
    probleme.status === 409 || probleme.status === 404
      ? (probleme.detail ?? probleme.title)
      : 'La modification n’a pas abouti. Réessayez dans un instant.',
    'alert',
  );
}

/** Erreurs d'un formulaire, chacune sous son champ (`data-ad-erreur`), « general » en dernier. */
export function afficherErreurs(
  formulaire: HTMLFormElement,
  erreurs: Record<string, string>,
): void {
  for (const zone of $$<HTMLElement>('[data-ad-erreur]', formulaire)) {
    const message = erreurs[zone.dataset.adErreur ?? ''] ?? '';
    zone.textContent = typo(message);
    zone.hidden = !message;
    zone
      .closest('.ad-champ')
      ?.querySelector('input, select, textarea')
      ?.setAttribute('aria-invalid', String(Boolean(message)));
  }
}

/** Refus d'un envoi : sous les champs que l'API désigne, sinon sous le formulaire. */
export const erreursDuRefus = (
  probleme: ProblemeAdministration,
  echec = 'L’ajout n’a pas abouti. Réessayez dans un instant.',
): Record<string, string> =>
  probleme.erreurs ?? {
    general:
      probleme.status === 409 || probleme.status === 404
        ? (probleme.detail ?? probleme.title)
        : echec,
  };
