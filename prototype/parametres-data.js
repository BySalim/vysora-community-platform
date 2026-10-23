'use strict';

/* Données propres à la page Paramètres (EC-17, F-06, F-07, F-08, F-02) : compte de Clarisse Mendy,
   le membre simulé par etats.js (MOI). Son ancienneté, ses créations et ses badges viennent de
   profil-data.js ; les comptes Google et GitHub, de auth-data.js. */

window.VYSORA_PARAMETRES = {
  email: 'clarisse.mendy@gmail.com',
  /* Adresse proposée dans le changement d'e-mail en attente (état « Nouvelle adresse à confirmer »). */
  nouvelEmail: 'contact@clarissemendy.sn',

  /* Langue d'interface (FR, EN ; défaut FR, D-06) et format des dates et des nombres. */
  langues: [
    { id: 'fr', nom: 'Français', locale: 'fr-FR' },
    { id: 'en', nom: 'English', locale: 'en-GB' }
  ],

  /* Fuseaux proposés pour les horaires des défis et des notifications. */
  fuseaux: [
    { id: 'Africa/Dakar', ville: 'Dakar' },
    { id: 'Africa/Abidjan', ville: 'Abidjan' },
    { id: 'Africa/Bamako', ville: 'Bamako' },
    { id: 'Africa/Douala', ville: 'Douala' },
    { id: 'Africa/Kinshasa', ville: 'Kinshasa' },
    { id: 'Africa/Casablanca', ville: 'Casablanca' },
    { id: 'Africa/Tunis', ville: 'Tunis' },
    { id: 'Europe/Paris', ville: 'Paris' },
    { id: 'Europe/Brussels', ville: 'Bruxelles' },
    { id: 'America/Montreal', ville: 'Montréal' }
  ],

  /* Appareils où le compte est ouvert. vu : dernière activité (date ou date et heure). */
  appareils: [
    { id: 'ici', type: 'ordinateur', nom: 'Chrome sur Windows', lieu: 'Ziguinchor, Sénégal', actuel: true },
    { id: 'iphone', type: 'telephone', nom: 'Safari sur iPhone', lieu: 'Ziguinchor, Sénégal', vu: '2026-10-13T08:12' },
    { id: 'ubuntu', type: 'ordinateur', nom: 'Firefox sur Ubuntu', lieu: 'Dakar, Sénégal', vu: '2026-10-04T17:36' }
  ],

  /* E-mails transactionnels, toujours envoyés (RG-90). */
  emailsToujours: [
    'Vérification de votre adresse e-mail',
    'Réinitialisation du mot de passe',
    'Changement d’adresse e-mail',
    'Nouvelle version d’un document légal',
    'Décision de modération vous concernant',
    'Demande et confirmation de suppression du compte',
    'Export de vos données prêt'
  ],

  /* Événements notifiés (RG-91), regroupés comme sur la page Notifications.
     email : envoi par e-mail par défaut ; toujours : envoi obligatoire (RG-90). */
  evenements: [
    { id: 'echanges', titre: 'Échanges', icone: 'message', items: [
      { id: 'commentaire', label: 'Commentaires sur vos créations' },
      { id: 'reponse-commentaire', label: 'Réponses à vos commentaires' },
      { id: 'reponse-sujet', label: 'Réponses à vos sujets', email: true },
      { id: 'reponse-acceptee', label: 'Vos réponses acceptées', email: true }
    ] },
    { id: 'preuves', titre: 'Essais et votes', icone: 'repeat', items: [
      { id: 'reproduction', label: 'Essais de vos créations' },
      { id: 'variante', label: 'Variantes de vos créations' },
      { id: 'obsolescence', label: 'Obsolescence signalée sur vos contenus' },
      { id: 'votes', label: 'Votes « Utile », regroupés par jour' }
    ] },
    { id: 'progression', titre: 'Progression', icone: 'award', items: [
      { id: 'badge', label: 'Badges obtenus' },
      { id: 'niveau', label: 'Niveaux atteints' },
      { id: 'cas', label: 'Cas Bon réflexe validés ou refusés' },
      { id: 'defi', label: 'Résultats des défis' }
    ] },
    { id: 'moderation', titre: 'Modération', icone: 'shield', items: [
      { id: 'masque', label: 'Contenu masqué ou rétabli' },
      { id: 'decision', label: 'Décisions de modération vous concernant', toujours: true }
    ] }
  ],

  /* Ce que voient les autres membres et les visiteurs (F-05, RG-88, politique de confidentialité). */
  visibilite: [
    { label: 'Pseudo, photo, biographie et lien personnel', public: true },
    { label: 'Niveau, réputation et badges', public: true },
    { label: 'Créations publiées, réponses et essais déclarés', public: true },
    { label: 'Adresse e-mail', public: false },
    { label: 'Statistiques d’apprentissage et progression vers les badges', public: false },
    { label: 'Brouillons et contenus enregistrés', public: false }
  ],

  /* Contributions qui ne figurent pas dans profil-data.js, selon le niveau :
     sujets, réponses et commentaires publiés ; votes émis ; contenus enregistrés. */
  activite: {
    curieux: { messages: 3, votes: 6, enregistrements: 4 },
    apprenti: { messages: 17, votes: 41, enregistrements: 12 },
    artisan: { messages: 46, votes: 133, enregistrements: 27 },
    expert: { messages: 118, votes: 402, enregistrements: 64 },
    maitre: { messages: 297, votes: 1186, enregistrements: 141 }
  },

  /* Délais : rétractation de la suppression (D-09, RG-05) et validité du lien d'export (F-07). */
  delais: { suppression: 30, export: 7 },
  /* Demande d'export simulée : heure de la demande, et date du lien expiré. */
  export: { heure: '10:42', expire: '2026-10-11' },
  /* Changement d'adresse en attente : heure d'envoi du lien de confirmation. */
  changement: { heure: '09:18' }
};
