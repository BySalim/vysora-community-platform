'use strict';

/* Données simulées des écrans de modération : file des signalements, dossiers des contenus et cas
   Bon réflexe à valider. Les dates sont relatives au moment de la visite (heures écoulées), comme
   la file du site, qui compte l'attente depuis le premier signalement ouvert (RG-105 : 72 h). */

window.VYSORA_MODERATION = (() => {
  const membre = (pseudo, nom, niveau, photo = true) => ({ pseudo, nom, niveau, avatar: photo ? `assets/avatars/${pseudo}.webp` : null });
  const M = {
    hugo: membre('hugo-girard', 'Hugo Girard', 'Apprenti'),
    thomas: membre('thomas-lefevre', 'Thomas Lefèvre', 'Curieux'),
    karim: membre('karim-mansouri', 'Karim Mansouri', 'Artisan'),
    camille: membre('camille-bernard', 'Camille Bernard', 'Apprenti'),
    nicolas: membre('nicolas-fontaine', 'Nicolas Fontaine', 'Curieux'),
    sebastien: membre('sebastien-roy', 'Sébastien Roy', 'Artisan'),
    yacine: membre('yacine-benali', 'Yacine Benali', 'Expert'),
    mariam: membre('mariam-diop', 'Mariam Diop', 'Artisan'),
    lea: membre('lea-martin', 'Léa Martin', 'Expert'),
    kofi: membre('kofi-mensah', 'Kofi Mensah', 'Artisan'),
    aissatou: membre('aissatou-ndiaye', 'Aïssatou Ndiaye', 'Maître'),
    awa: membre('awa-sarr', 'Awa Sarr', 'Apprenti'),
    moussa: membre('moussa-diallo', 'Moussa Diallo', 'Apprenti'),
    rokia: membre('rokia-keita', 'Rokia Keïta', 'Artisan'),
    ndeye: membre('ndeye-fall', 'Ndèye Fall', 'Expert'),
    ibrahima: membre('ibrahima-sow', 'Ibrahima Sow', 'Expert'),
    clarisse: membre('clarisse-mendy', 'Clarisse Mendy', 'Apprenti', false)
  };

  /* Contenus signalés, avec leur dossier. `depuis` : heures d'attente dans la file ; `masquageAuto`
     et les dates en heures écoulées. */
  const contenus = [
    {
      id: 4812, type: 'CREATION', statut: 'MASQUE', intitule: 'Pochette d’album lo-fi dans le style d’un illustrateur connu',
      auteur: M.hugo, creeIlYa: 26, page: 'fiche-creation.html?id=keur-awa', depuis: 9, masquageAuto: 5, avertissementAgent: 'AUCUN',
      signalements: [
        { signaleur: M.mariam, motif: 'PLAGIAT', statut: 'OUVERT', ilYa: 9, precision: 'Le prompt cite le nom d’un illustrateur vivant et demande de reproduire une de ses pochettes, couleurs et composition comprises.' },
        { signaleur: M.kofi, motif: 'PLAGIAT', statut: 'OUVERT', ilYa: 7, precision: '' },
        { signaleur: M.rokia, motif: 'ILLICITE', statut: 'OUVERT', ilYa: 5, precision: '' }
      ],
      decisions: [], historique: []
    },
    {
      id: 3977, type: 'COMMENTAIRE', statut: 'VISIBLE', intitule: 'Découvrez ma formation complète pour vendre vos images générées, lien en bio…',
      auteur: M.thomas, creeIlYa: 82, page: 'fiche-creation.html?id=cite-ciel-mer#commentaires', depuis: 80,
      texte: 'Découvrez ma formation complète pour vendre vos images générées, lien en bio. Accès à vie, réduction de 70 % pour les 50 premiers inscrits, places limitées.',
      signalements: [
        { signaleur: M.lea, motif: 'SPAM', statut: 'OUVERT', ilYa: 80, precision: '' },
        { signaleur: M.awa, motif: 'SPAM', statut: 'OUVERT', ilYa: 61, precision: '' }
      ],
      decisions: [],
      historique: [
        { id: 812, action: 'AVERTIR', decideur: M.ndeye, ilYa: 340, motif: 'Messages publicitaires répétés sous plusieurs créations', contenuId: 3540, intituleContenu: 'Gagnez 500 € par mois avec vos prompts…' }
      ]
    },
    {
      id: 4630, type: 'MESSAGE', statut: 'VISIBLE', intitule: 'Si tu ne sais pas écrire un prompt aussi simple, change de passe-temps.',
      auteur: M.nicolas, creeIlYa: 31, page: null, depuis: 30,
      texte: 'Si tu ne sais pas écrire un prompt aussi simple, change de passe-temps. Ça fait trois fois que tu poses la même question ici.',
      signalements: [
        { signaleur: M.camille, motif: 'HARCELEMENT', statut: 'OUVERT', ilYa: 30, precision: 'Réponse adressée à une membre débutante, sur un ton méprisant.' }
      ],
      decisions: [],
      historique: [
        { id: 905, action: 'AVERTIR', decideur: M.ibrahima, ilYa: 190, motif: 'Ton agressif envers un autre membre dans le forum', contenuId: 4402, intituleContenu: 'Réponse à « Pourquoi mes visages se déforment au troisième essai ? »' },
        { id: 871, action: 'MASQUER', decideur: M.ndeye, ilYa: 420, motif: 'Insulte dans une réponse', contenuId: 4120, intituleContenu: 'Réponse à « Garder le même personnage d’une image à l’autre »' }
      ]
    },
    {
      id: 4475, type: 'CREATION', statut: 'MASQUE', intitule: 'Fiches de révision du bac générées depuis les annales officielles',
      auteur: M.karim, creeIlYa: 140, page: 'fiche-creation.html?id=cite-ciel-mer', depuis: 20, nouvelExamen: true, modifieIlYa: 20, avertissementAgent: 'AUCUN',
      signalements: [
        { signaleur: M.aissatou, motif: 'PLAGIAT', statut: 'FONDE', ilYa: 98, precision: 'Les fiches reprennent mot pour mot des corrigés vendus par un éditeur scolaire.' }
      ],
      decisions: [
        { id: 948, action: 'MASQUER', decideur: M.ibrahima, ilYa: 96, motif: 'Les fiches reprennent des corrigés protégés ; retirez-les ou rédigez vos propres synthèses', signalementsClos: 1 }
      ],
      historique: []
    },
    {
      id: 4701, type: 'REPRODUCTION', statut: 'VISIBLE', intitule: 'Essai réussi avec Midjourney, j’ai mis le numéro de la cliente dans le prompt pour tester…',
      auteur: M.camille, creeIlYa: 4, page: 'fiche-creation.html?id=keur-awa#essais', depuis: 3,
      texte: 'Essai réussi avec Midjourney, j’ai mis le numéro de la cliente dans le prompt pour tester la carte de visite : +221 77 000 00 00, Mme Diallo, rue 10 à Ziguinchor.',
      signalements: [
        { signaleur: M.yacine, motif: 'DONNEES_PERSONNELLES', statut: 'OUVERT', ilYa: 3, precision: 'Le retour donne le téléphone et l’adresse d’une cliente.' }
      ],
      decisions: [], historique: []
    },
    {
      id: 4722, type: 'SUJET', statut: 'VISIBLE', intitule: 'Quel ordinateur acheter pour jouer en 2026 ?',
      auteur: M.sebastien, creeIlYa: 2, page: null, depuis: 0.8,
      texte: 'Bonjour, je cherche un ordinateur portable pour jouer, budget 900 €. Vous me conseillez quoi ?',
      signalements: [
        { signaleur: M.moussa, motif: 'HORS_SUJET', statut: 'OUVERT', ilYa: 0.8, precision: '' }
      ],
      decisions: [], historique: []
    },
    {
      id: 4588, type: 'CAS_BON_REFLEXE', statut: 'VISIBLE', intitule: 'Un assistant te propose d’exécuter un script téléchargé : que fais-tu ?',
      auteur: M.yacine, creeIlYa: 300, page: null, depuis: 46,
      signalements: [
        { signaleur: M.kofi, motif: 'AUTRE', statut: 'OUVERT', ilYa: 46, precision: 'La correction recommande de désactiver l’antivirus pour tester le script : c’est un mauvais conseil.' }
      ],
      decisions: [], historique: []
    }
  ];

  /* Cas Bon réflexe proposés (MOD-03), du plus anciennement soumis au plus récent. `soumisIlYa` en
     heures ; `mien` : cas du modérateur (il ne l'examine pas, RG-71). */
  const cas = [
    {
      id: 61, titre: 'L’IA invente une référence de loi dans un courrier', auteur: M.aissatou, difficulte: 'INTERMEDIAIRE', soumisIlYa: 52, proposeIlYa: 52,
      domaine: 'Rédaction et communication', duree: 4, outil: 'ChatGPT', modele: 'GPT-5', etiquettes: ['hallucination', 'vérification'],
      contexte: 'Vous préparez une lettre de réclamation à votre bailleur. Vous demandez à l’IA de citer l’article de loi qui oblige le propriétaire à faire les réparations.',
      demande: 'Rédige une lettre polie à mon bailleur pour qu’il répare la fuite de la salle de bains, en citant la loi qui l’y oblige.',
      reponse: 'Madame, Monsieur, conformément à l’article 1719-4 du Code civil, qui impose au bailleur de réparer sous 15 jours toute fuite signalée par écrit, je vous prie…',
      question: 'Que faites-vous avant d’envoyer la lettre ?',
      options: [
        { libelle: 'Je l’envoie : l’IA cite un article précis, c’est donc vérifié.', explication: 'Une référence précise n’est pas une référence exacte : les modèles inventent volontiers des numéros d’articles plausibles.' },
        { libelle: 'Je vérifie l’article sur un site officiel et je corrige la lettre si besoin.', explication: 'C’est le bon réflexe : l’article 1719-4 n’existe pas, et le délai de 15 jours non plus.', correcte: true },
        { libelle: 'Je demande à l’IA si elle est sûre de sa source.', explication: 'L’IA confirmera souvent sa propre erreur : il faut une source extérieure.' }
      ],
      explication: 'Toute référence juridique, médicale ou chiffrée produite par une IA se vérifie à la source avant d’être utilisée.'
    },
    {
      id: 64, titre: 'Un script de nettoyage qui supprime plus que prévu', auteur: M.lea, difficulte: 'AVANCE', soumisIlYa: 20, proposeIlYa: 140, nouvelleSoumission: true,
      examen: { ilYa: 70, motif: 'La bonne option n’explique pas pourquoi la commande est dangereuse ; précisez ce que fait l’option -rf' },
      domaine: 'Code et scripts', duree: 6, outil: 'Claude', modele: 'Sonnet', etiquettes: ['shell', 'sauvegarde'],
      contexte: 'Votre dossier de photos déborde. Vous demandez à l’IA une commande pour supprimer les doublons d’un dossier.',
      demande: 'Donne-moi une commande pour supprimer les doublons dans ~/Photos.',
      reponse: 'Voici une commande : find ~/Photos -type f -name "*copie*" -exec rm -rf {} +',
      question: 'Quel est le bon réflexe avant de lancer la commande ?',
      options: [
        { libelle: 'La lancer : la commande vient d’une IA réputée.', explication: 'rm -rf supprime sans corbeille ni confirmation : une erreur de motif efface des fichiers pour de bon.' },
        { libelle: 'La lancer d’abord sans -exec pour voir la liste des fichiers visés, sur une copie sauvegardée.', explication: 'Voir ce que la commande vise et garder une sauvegarde rend l’erreur réparable.', correcte: true },
        { libelle: 'Ajouter sudo pour qu’elle aille plus vite.', explication: 'sudo n’accélère rien et étend les dégâts possibles à tout le système.' }
      ],
      explication: 'Une commande qui supprime se teste à blanc, sur une sauvegarde, avant d’être lancée pour de bon.'
    },
    {
      id: 66, titre: 'Une photo de passeport à « améliorer »', auteur: M.clarisse, difficulte: 'DEBUTANT', soumisIlYa: 6, proposeIlYa: 6, mien: true,
      domaine: 'Images et design', duree: 3, outil: 'Midjourney', modele: null, etiquettes: ['données personnelles'],
      contexte: 'Une amie vous envoie la photo de son passeport pour que l’IA en fasse une version « plus nette ».',
      demande: 'Améliore la netteté de cette photo de passeport.',
      reponse: 'Voici une version plus nette de l’image envoyée.',
      question: 'Quel est le problème ?',
      options: [
        { libelle: 'Aucun : la photo est plus nette.', explication: 'Le document contient des données d’identité qui ne devraient pas quitter l’appareil.' },
        { libelle: 'Envoyer un document d’identité à un service d’IA l’expose : on ne le fait pas.', explication: 'Un document d’identité ne se confie pas à un service en ligne sans nécessité.', correcte: true }
      ],
      explication: 'Les documents d’identité ne s’envoient pas à un service d’IA.'
    }
  ];

  return { M, contenus, cas, moi: M.clarisse };
})();
