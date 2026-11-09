import type { EtatVisiteur } from '@vysora/shared';

/* Pages de l'équipe (modération et administration) : pour qui n'en a pas le rôle, elles n'existent
   pas (page introuvable, comme un dépôt privé chez GitHub) ; on ne signale pas une zone réservée à
   qui ne peut pas y entrer, et rien ne laisse croire qu'un compte suffirait pour y accéder.
   L'API reste seule juge des droits (401, 403) : ce filtre ne fait que l'affichage. */

export type ZoneReservee = 'administration' | 'moderation';

/** Zone réservée d'une adresse du site, ou null. */
export function zoneReservee(chemin: string): ZoneReservee | null {
  if (/^\/admin(\/|$)/.test(chemin)) return 'administration';
  if (/^\/moderation(\/|$)/.test(chemin)) return 'moderation';
  return null;
}

/** Vrai si la personne a le rôle de la zone : elle voit les pages, et leurs messages d'accès
    (conditions à accepter, adresse à confirmer) lui sont adressés. Sinon, page introuvable. */
export function zoneVisible(zone: ZoneReservee, etat: EtatVisiteur): boolean {
  if (etat.session !== 'membre') return false;
  return zone === 'administration' ? etat.role === 'admin' : etat.role !== 'membre';
}

/** Accueil d'une zone ouverte sans page précise (« /admin », « /moderation »). */
export function accueilZone(chemin: string): ZoneReservee | null {
  const propre = chemin.replace(/\/+$/, '');
  if (propre === '/admin') return 'administration';
  if (propre === '/moderation') return 'moderation';
  return null;
}
