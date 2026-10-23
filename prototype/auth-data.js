'use strict';

/* Données propres à la connexion et à l'inscription : contextes d'arrivée,
   documents en vigueur, pseudos pris, mots de passe compromis, comptes des
   services externes, invitation à la bêta et messageries. */

window.VYSORA_AUTH = {
  /* Contextes simulés depuis le panneau Tweaks ; en usage réel, ils viennent
     des paramètres « retour » et « pour » posés par commun.js. */
  contextes: {
    enregistrer: { pour: 'enregistrer cette création', retour: 'fiche-creation.html?id=cite-ciel-mer' },
    essai: { pour: 'partager votre essai', retour: 'fiche-creation.html?id=keur-awa' },
    'bon-reflexe': { pour: 'enregistrer vos réponses', retour: 'apprendre.html?rubrique=bon-reflexe' },
    defi: { pour: 'participer au défi', retour: 'defis.html' },
    sujet: { pour: 'répondre', retour: 'forum.html?sujet=sujet-1' },
    publier: { pour: 'publier une création', retour: 'nouvelle-creation.html' }
  },

  /* Icône associée à l'action demandée (le texte « pour » de commun.js). */
  actions: [
    { motif: /enregistrer vos réponses|progression/, icone: 'bulb' },
    { motif: /enregistrer|retrouver/, icone: 'bookmark' },
    { motif: /essai|reproduction/, icone: 'repeat' },
    { motif: /vot|utile|fonctionne|cherchez/i, icone: 'utile' },
    { motif: /défi/, icone: 'trophy' },
    { motif: /publier une création/, icone: 'layers' },
    { motif: /question/, icone: 'message' },
    { motif: /répondre/, icone: 'message' },
    { motif: /commenter/, icone: 'message' },
    { motif: /suivre/, icone: 'bell' },
    { motif: /signaler/, icone: 'flag' }
  ],

  /* Pages vers lesquelles le retour est autorisé, avec le libellé du lien de retour. */
  pages: {
    'index.html': 'Retour à l’accueil',
    'explorer.html': 'Retour à Explorer',
    'forum.html': 'Retour au forum',
    'apprendre.html': 'Retour à Apprendre',
    'classements.html': 'Retour aux classements',
    'categorie.html': 'Retour à la catégorie',
    'fiche-creation.html': 'Retour à la création',
    'nouvelle-creation.html': 'Retour à l’éditeur',
    'bon-reflexe.html': 'Retour à Bon réflexe',
    'defis.html': 'Retour aux défis'
  },

  defi: { titre: 'Une affiche touristique en trois échanges' },

  sujets: {
    'sujet-1': { titre: 'Mon personnage change de visage à chaque nouvelle image' }
  },

  /* Documents légaux en vigueur. Les conditions et la charte s'acceptent ;
     la politique de confidentialité informe et ne s'accepte pas. */
  documents: {
    cgu: {
      titre: 'Conditions générales d’utilisation',
      onglet: 'Conditions d’utilisation',
      court: 'conditions générales d’utilisation',
      version: '15 octobre 2026',
      points: [
        'Vysora est gratuit. Vous créez dans vos propres outils d’IA, puis vous publiez sur Vysora le résultat et le chemin parcouru.',
        'Chaque création commence en brouillon privé : rien n’est publié sans votre accord.',
        'Vous restez l’auteur de vos créations. Elles sont publiées sous licence CC BY 4.0, ou sous une autre licence que vous choisissez dans la liste proposée.',
        'Vous respectez les conditions d’utilisation des outils d’IA dont vous partagez les résultats.',
        'Le nombre de publications par 24 heures dépend de votre niveau ; il augmente avec votre réputation.'
      ],
      changement: 'Le nombre de publications autorisées par 24 heures dépend désormais de votre niveau.'
    },
    confidentialite: {
      titre: 'Politique de confidentialité',
      onglet: 'Confidentialité',
      court: 'politique de confidentialité',
      version: '1er septembre 2026',
      points: [
        'Vos données servent uniquement au fonctionnement de Vysora : votre compte, vos contributions, la modération et la sécurité.',
        'Votre adresse e-mail n’apparaît jamais sur votre profil public.',
        'Seuls les cookies strictement nécessaires sont utilisés ; la fréquentation est mesurée sans cookie, et vous pouvez refuser d’y être compté.',
        'Vos données sont hébergées en France ; elles ne sont ni vendues ni utilisées à des fins publicitaires.',
        'Depuis vos paramètres, vous téléchargez vos données ou supprimez votre compte ; toute autre demande reçoit une réponse sous un mois.'
      ]
    },
    charte: {
      titre: 'Charte communautaire',
      onglet: 'Charte communautaire',
      court: 'charte communautaire',
      version: '15 octobre 2026',
      points: [
        'Bienveillance d’abord : Vysora est un espace sûr pour débuter, sans vote négatif.',
        'Créditez les auteurs : une variante cite toujours la création dont elle part.',
        'Ne publiez ni clé d’API, ni mot de passe, ni donnée personnelle dans vos prompts.',
        'Le contournement des protections des outils et les instructions dangereuses sont interdits.',
        'Signalez ce qui pose problème : la modération examine chaque signalement en visant un délai de 72 heures.'
      ],
      changement: 'Un prompt qui contient une clé d’API ou une donnée personnelle est masqué jusqu’à sa correction.'
    }
  },

  /* Pseudos déjà utilisés ou réservés (comparaison sans distinction de casse). */
  pseudosPris: [
    'admin', 'administrateur', 'administration', 'moderation', 'moderateur', 'vysora', 'carneo', 'support', 'aide', 'contact',
    'lea-martin', 'claire-dubois', 'aissatou-ndiaye', 'ndeye-fall', 'awa-sarr', 'kofi-mensah', 'moussa-diallo',
    'yacine-benali', 'ibrahima-sow', 'koffi-amoussou', 'thomas-lefevre', 'hugo-girard', 'julien-moreau', 'ines', 'claire', 'yacine'
  ],

  /* Pseudo proposé à la création du compte : un nom, une couleur et un nombre. */
  pseudoNoms: ['baobab', 'comete', 'lagune', 'prisme', 'atlas', 'aurore', 'boussole', 'origami', 'mosaique', 'zephyr', 'savane', 'pixel', 'encre', 'kora', 'sahel', 'delta', 'orbite', 'ressac', 'cauri', 'meridien'],
  pseudoCouleurs: ['indigo', 'azur', 'corail', 'ocre', 'jade', 'safran', 'cobalt', 'ivoire', 'sepia', 'cyan'],

  /* Échantillon de mots de passe présents dans des fuites connues (RG-04). */
  compromis: [
    'motdepasse123', 'motdepasse1234', 'azertyuiop12', 'azertyuiop123', 'azerty123456', 'qwertyuiop12', 'qwerty123456',
    '123456789012', '1234567890123', 'password1234', 'password12345', 'iloveyou1234', 'bonjour12345', 'soleil123456',
    'abcdefghijkl', 'abc123456789', 'vysora123456', 'jetaime12345', 'football1234', 'marseille123'
  ],

  /* Comptes renvoyés par les services externes (F-02). */
  services: {
    google: { nom: 'Google', compte: 'Clarisse Mendy', email: 'clarisse.mendy@gmail.com', pseudo: 'clarisse-mendy' },
    github: { nom: 'GitHub', compte: 'cmendy', email: 'clarisse.mendy@gmail.com', pseudo: 'cmendy' }
  },

  invitation: { code: 'VYS-K7M2-Q9', par: 'Claire Dubois', niveau: 'Expert' },

  domaines: ['gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.fr', 'icloud.com', 'orange.fr', 'free.fr', 'laposte.net', 'proton.me'],
  messageries: [
    { motif: /@(gmail|googlemail)\./, nom: 'Gmail', lien: 'https://mail.google.com/' },
    { motif: /@(outlook|hotmail|live)\./, nom: 'Outlook', lien: 'https://outlook.live.com/mail/' },
    { motif: /@yahoo\./, nom: 'Yahoo Mail', lien: 'https://mail.yahoo.com/' },
    { motif: /@proton\./, nom: 'Proton Mail', lien: 'https://mail.proton.me/' }
  ]
};
