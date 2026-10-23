/* État de la personne qui consulte, côté navigateur : même interface que prototype/etats.js
   (membre(), get(), peut(), raison(), on()), mais lu dans la page rendue par le serveur, jamais simulé.
   Il ne change qu'avec une réponse de l'API (conditions acceptées) : `appliquer`. */

import {
  raisonRefus,
  type ActionReservee,
  type EtatVisiteur,
  type SessionApi,
  type RaisonRefus,
} from '@vysora/shared';
import { attributsEtat } from '../../lib/etat-html';

type EtatPage = Pick<
  SessionApi,
  'etat' | 'membre' | 'nonLues' | 'suspensionJusqua' | 'conditionsDepuis'
>;

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

let page = lire();
const abonnes = new Set<(etat: EtatVisiteur) => void>();
const ATTRIBUTS = ['data-session', 'data-role', 'data-niveau', 'data-compte', 'data-notifications'];

export const etats = {
  get: (): EtatVisiteur => page.etat,
  membre: (): boolean => page.etat.session === 'membre',
  /** Pseudo et nom du membre connecté (MOI dans le prototype). */
  moi: () => page.membre,
  nonLues: (): number => page.nonLues,
  /** Fin de la suspension et date des nouvelles conditions (DATES dans le prototype). */
  dates: () => ({
    suspensionJusqua: page.suspensionJusqua,
    conditionsDepuis: page.conditionsDepuis,
  }),
  raison: (action: ActionReservee = 'contribuer'): RaisonRefus | null =>
    raisonRefus(action, page.etat),
  peut: (action: ActionReservee = 'contribuer'): boolean => raisonRefus(action, page.etat) === null,
  /** Nouvel état renvoyé par l'API : attributs de <html> (lus par etats.css) et abonnés à jour. */
  appliquer(session: EtatPage): void {
    page = {
      etat: session.etat,
      membre: session.membre,
      nonLues: session.nonLues,
      suspensionJusqua: session.suspensionJusqua,
      conditionsDepuis: session.conditionsDepuis,
    };
    const racine = document.documentElement;
    for (const nom of ATTRIBUTS) racine.removeAttribute(nom);
    for (const [nom, valeur] of Object.entries(attributsEtat(page)))
      racine.setAttribute(nom, valeur);
    for (const abonne of abonnes) abonne(page.etat);
  },
  /** Prévient la page quand l'état change ; renvoie la fonction qui désabonne. */
  on(abonne: (etat: EtatVisiteur) => void): () => void {
    abonnes.add(abonne);
    return () => abonnes.delete(abonne);
  },
};
