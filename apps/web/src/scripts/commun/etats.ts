/* État de la personne qui consulte, côté navigateur : même interface que prototype/etats.js
   (membre(), get(), peut(), raison()), mais lu dans la page rendue par le serveur, jamais simulé. */

import {
  raisonRefus,
  type ActionReservee,
  type EtatVisiteur,
  type RaisonRefus,
} from '@vysora/shared';

interface EtatPage {
  etat: EtatVisiteur;
  membre: { pseudo: string; nom: string; points: number; avatar: string | null } | null;
  nonLues: number;
}

function lire(): EtatPage {
  const source = document.getElementById('etat-visiteur')?.textContent;
  try {
    if (source) return JSON.parse(source) as EtatPage;
  } catch {
    // Page sans état lisible : la personne est traitée comme une visiteuse.
  }
  return {
    etat: { session: 'visiteur', role: 'membre', niveau: 'curieux', compte: 'actif' },
    membre: null,
    nonLues: 0,
  };
}

const page = lire();

export const etats = {
  get: (): EtatVisiteur => page.etat,
  membre: (): boolean => page.etat.session === 'membre',
  /** Pseudo et nom du membre connecté (MOI dans le prototype). */
  moi: () => page.membre,
  nonLues: (): number => page.nonLues,
  raison: (action: ActionReservee = 'contribuer'): RaisonRefus | null =>
    raisonRefus(action, page.etat),
  peut: (action: ActionReservee = 'contribuer'): boolean => raisonRefus(action, page.etat) === null,
};
