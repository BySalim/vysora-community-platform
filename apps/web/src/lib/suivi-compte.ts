import type { EtatVisiteur } from '@vysora/shared';

/* Le compte a changé ailleurs que dans cette page : adresse confirmée par le lien reçu, conditions
   acceptées, session fermée ou rôle modifié. Ce que la page doit en faire : se mettre à jour sur
   place quand le compte sort simplement de la lecture seule, être rendue de nouveau sinon (le
   serveur a rendu l'en-tête, les menus et les blocs d'accès pour l'ancien état). */

export interface EffetChangement {
  /** Vrai si seule une nouvelle page montre le bon état. */
  recharger: boolean;
  /** Message à afficher, ou null. */
  message: string | null;
}

/** Ce que le compte a gagné, dit à la personne. */
const MESSAGES: Partial<Record<EtatVisiteur['compte'], string>> = {
  email: 'Votre adresse e-mail est confirmée.',
  conditions: 'Conditions acceptées.',
};

/** Effet d'un changement d'état sur une page déjà affichée ; null si rien n'a changé. */
export function effetChangement(avant: EtatVisiteur, apres: EtatVisiteur): EffetChangement | null {
  const identique =
    avant.session === apres.session &&
    avant.role === apres.role &&
    avant.niveau === apres.niveau &&
    avant.compte === apres.compte;
  if (identique) return null;

  // Connexion, déconnexion ou rôle changé : l'en-tête et les menus sont ceux de l'ancien état.
  if (avant.session !== apres.session || avant.role !== apres.role)
    return { recharger: true, message: null };

  if (avant.compte === apres.compte) return { recharger: false, message: null };
  // Le compte sort de la lecture seule (adresse confirmée, conditions acceptées) : la page suit.
  if (apres.compte === 'actif')
    return { recharger: false, message: MESSAGES[avant.compte] ?? null };
  // Suspension, ou autre lecture seule qui commence : nouvelle page.
  return { recharger: true, message: null };
}
