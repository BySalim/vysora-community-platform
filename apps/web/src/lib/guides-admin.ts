/* Administration des guides d'Explorer (DEC-02) : présentation commune aux écrans (liste, pièges
   signalés, demandes, rédaction d'un guide) et au script qui les anime. */

import type { ContenuGuideAdministreApi } from '@vysora/shared';
import { ROUTES } from './navigation';

/** Page publique d'un contenu du guide. */
export function adresseContenuGuide(c: Pick<ContenuGuideAdministreApi, 'id' | 'type' | 'slug'>) {
  if (c.type === 'CREATION') return ROUTES.creation(c.id, c.slug);
  if (c.type === 'SUJET') return ROUTES.sujet(c.id, c.slug);
  return ROUTES.casBonReflexe(c.id, c.slug ?? 'cas');
}

/** Pourquoi Explorer ne présente pas un contenu du guide (RG-30), ou null. */
export function etatContenuGuide(
  c: Pick<ContenuGuideAdministreApi, 'type' | 'etat'>,
): string | null {
  switch (c.etat) {
    case 'MASQUE':
      return 'Masqué par la modération';
    case 'SUPPRIME':
      return 'Supprimé';
    case 'NON_PUBLIE':
      return c.type === 'CAS_BON_REFLEXE' ? 'En cours de réexamen' : 'Repassé en brouillon';
    default:
      return null;
  }
}

/** Numéro d'un contenu tiré de son adresse (/creations/12-titre, /forum/4-titre,
    /bon-reflexe/7-titre, avec ou sans le nom du site) ou saisi tel quel ; null sinon. */
export function numeroDeContenu(saisie: string): number | null {
  const texte = saisie.trim();
  const adresse = /\/(?:creations|forum|bon-reflexe)\/(\d{1,15})(?:[-/?#]|$)/.exec(texte);
  const numero = adresse?.[1] ?? /^(?:n°\s*|#)?(\d{1,15})$/i.exec(texte)?.[1];
  const valeur = numero ? Number(numero) : Number.NaN;
  return Number.isSafeInteger(valeur) && valeur > 0 ? valeur : null;
}
