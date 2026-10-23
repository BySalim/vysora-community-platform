/* État de la personne qui consulte, côté navigateur : même interface que prototype/etats.js
   (membre(), get(), peut(), raison(), DATES), mais lu dans la page rendue par le serveur, jamais simulé. */

import {
  raisonRefus,
  type ActionReservee,
  type EtatVisiteur,
  type MembreConnecte,
  type RaisonRefus,
} from '@vysora/shared';
import { dateLongue } from '../../lib/texte';

interface EtatPage {
  etat: EtatVisiteur;
  membre: MembreConnecte | null;
  nonLues: number;
  /** Fin de la suspension en cours (ISO 8601). */
  suspensionJusqua: string | null;
  /** Date d'effet des documents légaux à accepter (AAAA-MM-JJ). */
  conditionsDepuis: string | null;
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
    suspensionJusqua: null,
    conditionsDepuis: null,
  };
}

const date = (valeur: string | null | undefined): string => (valeur ? dateLongue(valeur) : '');

const page = lire();

export const etats = {
  get: (): EtatVisiteur => page.etat,
  membre: (): boolean => page.etat.session === 'membre',
  /** Pseudo et nom du membre connecté (MOI dans le prototype). */
  moi: () => page.membre,
  nonLues: (): number => page.nonLues,
  /** « 23 octobre 2026 » : fin de la suspension et date des nouvelles conditions (vides si sans objet). */
  dates: () => ({
    suspension: date(page.suspensionJusqua),
    conditions: date(page.conditionsDepuis),
  }),
  raison: (action: ActionReservee = 'contribuer'): RaisonRefus | null =>
    raisonRefus(action, page.etat),
  peut: (action: ActionReservee = 'contribuer'): boolean => raisonRefus(action, page.etat) === null,
};
