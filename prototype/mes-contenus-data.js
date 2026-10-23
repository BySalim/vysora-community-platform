'use strict';

/* Données propres à la page Mes contenus (EC-15, F-16, F-34) : contenus que Clarisse Mendy
   avait déjà enregistrés, alertes simulées sur ses créations publiées, commentaires reçus.
   Ses brouillons et ses créations viennent de nouvelle-creation-data.js (exemples, brouillons) ;
   les statistiques de ses créations, de profil-data.js. */

window.VYSORA_MES_CONTENUS = {
  /* Enregistrés au départ, du plus récent au plus ancien. kind : creation (data.js), sujet, cas (explorer-data.js). */
  enregistres: [
    { kind: 'sujet', id: 'sujet-15', at: '2026-10-12' },
    { kind: 'creation', id: 'portrait-gouache', at: '2026-10-11' },
    { kind: 'sujet', id: 'sujet-4', at: '2026-10-09' },
    { kind: 'cas', id: 'cas-3', at: '2026-10-08' },
    { kind: 'sujet', id: 'sujet-7', at: '2026-10-06' },
    { kind: 'creation', id: 'keur-awa', at: '2026-10-05' },
    { kind: 'cas', id: 'cas-6', at: '2026-10-02' },
    { kind: 'creation', id: 'factures-auto', at: '2026-09-30' }
  ],

  /* Alertes réglables dans le panneau Tweaks, rattachées à une création publiée. */
  alertes: {
    obsolescence: { creation: 'iteration', modele: 'GPT Image 1', membres: 2, depuis: '2026-10-10' },
    masquee: { creation: 'projet', le: '2026-10-12', motif: 'Une capture d’écran laisse lire le numéro de téléphone d’une cliente.' }
  },

  /* Commentaires reçus par les créations publiées de Clarisse (profil-data.js, creations). */
  commentaires: { iteration: 2, prompt: 3, projet: 5, traduction: 2, devis: 4, sauvegarde: 1, paiements: 3, securite: 2, menu: 6, carte: 1, compression: 3, batik: 2, faq: 7, numeros: 4, nuitees: 2, accueil: 1 }
};
