'use strict';

/* Données simulées de la connexion, en plus de auth-data.js : activation de la
   vérification en deux étapes d'un compte de l'équipe (SEC-02 : clé, code QR,
   codes de secours) et lien d'activation d'un compte créé par l'administration
   (ADM-03, valable 7 jours). */

window.VYSORA_CONNEXION = {
  deuxFacteurs: {
    /* Clé TOTP en base 32 ; le code QR porte l'adresse otpauth:// correspondante. */
    cle: 'K7QF2MZPX4RWD3LNHV6TBYJ5CGEA2QSU',
    qr: 'assets/qr-deux-facteurs.svg',
    codesSecours: ['H7KQ-M2XP', 'R9TB-4WNC', 'Z3LD-8FVJ', 'P6YE-K2QS', 'W4MN-7HDT', 'C8RX-3JGA', 'U2VF-9LPB', 'E5ZK-6NWR']
  },
  reinitialisation: { email: 'clarisse.mendy@gmail.com', masque: 'c•••••@gmail.com' },
  activation: { email: 'ibrahima.faye@gmail.com', jours: 7 }
};
