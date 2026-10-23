/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Personne qui consulte, telle que l'interface la montre (etats.js du prototype). */
    etat: import('@vysora/shared').EtatVisiteur;
    /** Notifications non lues (pastille de l'en-tête). */
    nonLues: number;
    /** Membre connecté : pseudo et nom affichés dans le menu du compte. */
    membre: import('@vysora/shared').MembreConnecte | null;
    /** Fin de la suspension en cours (ISO 8601), pour le bandeau du compte. */
    suspensionJusqua: string | null;
    /** Date d'effet des documents légaux à accepter (AAAA-MM-JJ), pour le bandeau du compte. */
    conditionsDepuis: string | null;
  }
}
