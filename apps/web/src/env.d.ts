/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Personne qui consulte, telle que l'interface la montre (etats.js du prototype). */
    etat: import('@vysora/shared').EtatVisiteur;
    /** Notifications non lues (pastille de l'en-tête). */
    nonLues: number;
    /** Membre connecté : pseudo et nom affichés dans le menu du compte. */
    membre: { pseudo: string; nom: string; points: number; avatar: string | null } | null;
  }
}
