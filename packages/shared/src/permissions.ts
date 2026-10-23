/* Droits de la personne qui consulte (docs/produit/03-fonctionnalites-mvp.md, section 3).
   Repris de prototype/etats.js : mêmes états, mêmes actions, mêmes raisons de refus.
   L'API applique ces règles (seule autorité) ; le site s'en sert pour adapter l'affichage. */

import type { Role, StatutCompte } from './enums';
import { NIVEAUX, type CodeNiveau, type DefinitionNiveau } from './regles';

/** Valeurs reportées sur <html> en attributs data-* (prototype/etats.css s'en sert). */
export type SessionAffichee = 'visiteur' | 'membre';
export type RoleAffiche = 'membre' | 'moderateur' | 'admin';
/** État du compte vu par l'interface : hors « actif », le compte est en lecture seule. */
export type CompteAffiche = 'actif' | 'email' | 'conditions' | 'suspendu';

export interface EtatVisiteur {
  session: SessionAffichee;
  role: RoleAffiche;
  niveau: CodeNiveau;
  compte: CompteAffiche;
}

export const ETAT_VISITEUR: EtatVisiteur = {
  session: 'visiteur',
  role: 'membre',
  niveau: 'curieux',
  compte: 'actif',
};

/** Actions soumises à condition. « parametres » reste permis à un compte en lecture seule. */
export type ActionReservee =
  'contribuer' | 'parametres' | 'proposer-cas' | 'moderer' | 'administrer';
export type RaisonRefus = 'connexion' | 'email' | 'conditions' | 'suspendu' | 'niveau' | 'role';

/** null si l'action est permise, sinon la raison du refus (etats.js, `raison`). */
export function raisonRefus(action: ActionReservee, etat: EtatVisiteur): RaisonRefus | null {
  if (etat.session !== 'membre') return 'connexion';
  if (action === 'parametres') return null;
  if (etat.compte !== 'actif') return etat.compte;
  if (
    action === 'proposer-cas' &&
    etat.role === 'membre' &&
    !niveauPermet(etat.niveau, 'peutProposerUnCas')
  )
    return 'niveau';
  if (action === 'moderer' && etat.role === 'membre') return 'role';
  if (action === 'administrer' && etat.role !== 'admin') return 'role';
  return null;
}

export const peut = (action: ActionReservee, etat: EtatVisiteur): boolean =>
  raisonRefus(action, etat) === null;

/** RG-85 : publications permises par 24 h ; les modérateurs et administrateurs n'ont pas de limite. */
export function limiteQuotidienne(
  type: 'creations' | 'sujets' | 'reponses',
  etat: EtatVisiteur,
  niveaux: readonly DefinitionNiveau[] = NIVEAUX,
): number {
  if (etat.session !== 'membre' || etat.role !== 'membre') return Number.POSITIVE_INFINITY;
  const niveau = niveaux.find((n) => n.code === etat.niveau);
  const limite =
    type === 'creations'
      ? niveau?.creationsPar24h
      : type === 'sujets'
        ? niveau?.sujetsPar24h
        : niveau?.reponsesEtCommentairesPar24h;
  return limite ?? Number.POSITIVE_INFINITY;
}

function niveauPermet(code: CodeNiveau, privilege: 'peutProposerUnCas'): boolean {
  return NIVEAUX.find((n) => n.code === code)?.[privilege] ?? false;
}

export const ROLE_AFFICHE: Record<Role, RoleAffiche> = {
  MEMBRE: 'membre',
  MODERATEUR: 'moderateur',
  ADMINISTRATEUR: 'admin',
};

/** Ce que l'interface doit montrer d'un compte, d'après ses données (priorité du prototype). */
export function compteAffiche(compte: {
  statut: StatutCompte;
  emailVerifie: boolean;
  documentsAAccepter: boolean;
  suspenduJusqua: Date | null;
  maintenant?: Date;
}): CompteAffiche {
  const maintenant = compte.maintenant ?? new Date();
  if (compte.suspenduJusqua && compte.suspenduJusqua > maintenant) return 'suspendu';
  if (!compte.emailVerifie) return 'email';
  if (compte.documentsAAccepter) return 'conditions';
  return 'actif';
}
