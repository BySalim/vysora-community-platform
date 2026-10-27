import type { DemandeGuideDemo, GuideDemo } from '../types.js';

/* Guides d'Explorer (prototype/explorer-data.js : objectives, requests). Méthode, pièges et lacunes
   sont repris tels quels ; les parcours, sujets et cas sont désignés par leur clé. Les chiffres
   (reproductions, réussite, activité) ne sont pas repris : ils se calculent sur les données chargées. */

export const GUIDES: GuideDemo[] = [
  {
    cle: 'rendez-vous',
    domaine: 'Application web',
    titre: 'Mettre en place la prise de rendez-vous en ligne',
    titreCourt: 'Prise de rendez-vous en ligne',
    motsCles: [
      'réservation',
      'rendez-vous',
      'rdv',
      'créneau',
      'agenda',
      'planning',
      'calendrier',
      'inscription',
      'cours',
    ],
    etapes: [
      {
        titre: 'Décrire les prestations, leur durée et les horaires',
        conseil:
          'Plus la description est précise (durées, pauses, jours de fermeture), moins l’IA invente de créneaux.',
        sources: ['keur-awa', 'resa-terrain', 'agenda-kine', 'cours-yoga'],
        citation: 'agenda-kine',
        citationTexte:
          'Les séances durent 30 ou 45 minutes selon le soin. Calcule les créneaux disponibles à partir des horaires du cabinet et empêche qu’une séance de 45 minutes chevauche la suivante.',
      },
      {
        titre: 'Générer le parcours de réservation',
        conseil:
          'Une première version réunit le choix de la prestation, la date et la confirmation. Elle sert de base aux corrections.',
        sources: ['keur-awa', 'resa-terrain', 'agenda-kine', 'cours-yoga'],
        citation: 'keur-awa',
        citationTexte:
          'Crée une page de réservation pour le salon Keur Awa. Affiche les prestations, leur durée et les créneaux disponibles. Les créneaux déjà réservés doivent être désactivés.',
      },
      {
        titre: 'Refuser un créneau déjà pris au moment de confirmer',
        conseil:
          'Désactiver le créneau à l’écran ne suffit pas : la disponibilité est vérifiée une seconde fois, côté serveur, à la confirmation.',
        sources: ['keur-awa', 'resa-terrain', 'cours-yoga'],
        citation: 'keur-awa',
        citationTexte:
          'Les créneaux déjà réservés restent sélectionnables. Désactive-les et refuse côté serveur toute réservation sur un créneau pris.',
      },
      {
        titre: 'Confirmer la réservation au client',
        conseil: 'Un message reprend la date, l’heure et le moyen d’annuler.',
        sources: ['keur-awa', 'resa-terrain'],
      },
      {
        titre: 'Limiter les données personnelles conservées',
        conseil:
          'Seules les informations utiles au rendez-vous sont demandées, et rien n’est gardé dans le navigateur.',
        sources: ['keur-awa', 'agenda-kine'],
      },
    ],
    pieges: [
      {
        titre: 'Deux personnes réservent le même créneau',
        solution:
          'Vérifiez la disponibilité côté serveur au moment de confirmer, pas seulement à l’affichage.',
        sources: ['keur-awa', 'resa-terrain', 'cours-yoga'],
        etape: 2,
        sujet: 'sujet-7',
        cas: 'cas-6',
      },
      {
        titre: 'Des données personnelles conservées sans raison',
        solution:
          'Ne demandez que ce qui sert au rendez-vous et refusez tout stockage dans le navigateur.',
        sources: ['keur-awa', 'agenda-kine'],
        etape: 4,
      },
      {
        titre: 'Des créneaux décalés d’une heure',
        solution:
          'Précisez le fuseau horaire et testez une date située après le changement d’heure.',
        sources: ['resa-terrain'],
        etape: 1,
      },
      {
        titre: 'Des séances qui se chevauchent',
        solution:
          'Calculez les créneaux à partir de la durée de chaque prestation, pas d’une grille fixe.',
        sources: ['agenda-kine'],
        etape: 0,
      },
    ],
    lacunes: [
      'Aucun parcours ne gère encore le paiement d’un acompte.',
      'Pas encore de parcours réalisé avec Gemini ou Le Chat.',
    ],
    parcours: ['keur-awa', 'resa-terrain', 'agenda-kine', 'cours-yoga'],
    sujets: ['sujet-7', 'sujet-15'],
    cas: ['cas-6'],
  },
  {
    cle: 'site-vitrine',
    domaine: 'Application web',
    titre: 'Lancer un site vitrine qui reçoit des demandes',
    titreCourt: 'Site vitrine et formulaires',
    motsCles: [
      'site',
      'vitrine',
      'formulaire',
      'contact',
      'devis',
      'page',
      'landing',
      'inscription',
      'accessibilité',
    ],
    etapes: [
      {
        titre: 'Rédiger le contenu avant de générer le site',
        conseil:
          'Le texte des pages, les prestations et les photos sont prêts avant la première demande.',
        sources: ['site-traiteur'],
      },
      {
        titre: 'Construire le formulaire de demande',
        conseil:
          'Chaque champ a un libellé visible ; seules les informations utiles sont demandées.',
        sources: ['site-traiteur', 'formulaire-asso'],
        citation: 'formulaire-asso',
        citationTexte:
          'Chaque champ doit avoir un libellé visible et un message d’erreur relié par aria-describedby. Après l’envoi, place le focus sur le premier champ en erreur.',
      },
      {
        titre: 'Rendre les erreurs compréhensibles',
        conseil: 'Un message sous le champ concerné, et le focus placé sur la première erreur.',
        sources: ['formulaire-asso'],
      },
      {
        titre: 'Vérifier l’affichage sur mobile et au clavier',
        conseil: 'Chaque page est testée sur trois tailles d’écran et parcourue sans souris.',
        sources: ['site-traiteur', 'formulaire-asso'],
      },
    ],
    pieges: [
      {
        titre: 'Une demande envoyée sans accusé de réception',
        solution: 'Affichez une confirmation et envoyez une copie de la demande à la personne.',
        sources: ['site-traiteur'],
        etape: 1,
      },
      {
        titre: 'Des erreurs signalées seulement par la couleur',
        solution: 'Écrivez l’erreur sous le champ, reliez-la au champ et placez le focus dessus.',
        sources: ['formulaire-asso'],
        etape: 2,
        cas: 'cas-6',
      },
    ],
    lacunes: [
      'Aucun parcours sur le référencement du site.',
      'Seulement deux parcours : ce guide se construit avec vos publications.',
    ],
    parcours: ['site-traiteur', 'formulaire-asso'],
    sujets: [],
    cas: ['cas-6'],
  },
  {
    cle: 'identite',
    domaine: 'Identité visuelle',
    titre: 'Créer un logo et une identité visuelle',
    titreCourt: 'Logo et identité visuelle',
    motsCles: [
      'logo',
      'marque',
      'identité',
      'charte',
      'couleurs',
      'palette',
      'typographie',
      'symbole',
    ],
    etapes: [
      {
        titre: 'Décrire le symbole et le nom séparément',
        conseil:
          'Le symbole est décrit dans une phrase, le nom exact est donné à part, entre guillemets.',
        sources: ['logo-karite', 'logo-tontine'],
        citation: 'logo-tontine',
        citationTexte:
          'Logo pour « Natt » : trois cercles qui se rejoignent, trait épais, bleu nuit et ocre, le nom en dessous en minuscules, fond blanc, aucun autre texte.',
      },
      {
        titre: 'Limiter la palette à quelques couleurs',
        conseil:
          'Trois à cinq couleurs, avec leurs codes, choisies pour l’écran comme pour l’impression.',
        sources: ['marque-cosmetique', 'logo-tontine'],
        citation: 'marque-cosmetique',
        citationTexte:
          'Propose une palette de cinq couleurs inspirée du karité et de l’indigo, avec leurs codes hexadécimaux et un contraste suffisant pour le texte. Associe une typographie de titre et une de texte.',
      },
      {
        titre: 'Vérifier la lisibilité en petit format',
        conseil: 'Le logo est testé à la taille d’une icône d’application avant d’être retenu.',
        sources: ['logo-tontine', 'logo-karite'],
      },
      {
        titre: 'Mesurer le contraste du texte',
        conseil: 'Chaque couleur destinée au texte est contrôlée sur son fond.',
        sources: ['marque-cosmetique'],
      },
    ],
    pieges: [
      {
        titre: 'Le nom de la marque mal orthographié',
        solution:
          'Placez le nom exact entre guillemets et décrivez le symbole dans une phrase à part.',
        sources: ['logo-karite', 'logo-tontine'],
        etape: 0,
        sujet: 'sujet-3',
      },
      {
        titre: 'Un contraste insuffisant pour le texte',
        solution: 'Mesurez le contraste avant de valider une couleur pour du texte.',
        sources: ['marque-cosmetique'],
        etape: 3,
      },
      {
        titre: 'Un symbole illisible à petite taille',
        solution: 'Testez le logo à 32 pixels avant de le retenir.',
        sources: ['logo-tontine'],
        etape: 2,
      },
    ],
    lacunes: ['Aucun parcours ne vérifie la ressemblance avec des marques existantes.'],
    parcours: ['marque-cosmetique', 'logo-karite', 'logo-tontine'],
    sujets: ['sujet-3'],
    cas: ['cas-5'],
  },
  {
    cle: 'serie-images',
    domaine: 'Image et illustration',
    titre: 'Créer des illustrations au style cohérent',
    titreCourt: 'Illustrations au style cohérent',
    motsCles: [
      'illustration',
      'image',
      'style',
      'série',
      'personnage',
      'affiche',
      'portrait',
      'icône',
      'dessin',
      'peinture',
      'visuel',
    ],
    etapes: [
      {
        titre: 'Nommer la technique et la matière',
        conseil:
          'Gouache, aquarelle, relief mat : la technique nommée évite le rendu photographique par défaut.',
        sources: ['portrait-gouache', 'cite-ciel-mer', 'pochette-album'],
        citation: 'portrait-gouache',
        citationTexte:
          'Portrait éditorial, gouache numérique, touches visibles, papier à grain fin, fond sarcelle uni, lumière chaude de fin d’après-midi --ar 4:3',
      },
      {
        titre: 'Placer le sujet dans la composition',
        conseil: 'Indiquer où se trouve le sujet principal et l’espace à laisser libre.',
        sources: ['cite-ciel-mer', 'visuel-conference'],
        citation: 'visuel-conference',
        citationTexte:
          'Volutes abstraites en relief, bleu nuit et bleu électrique, éclairage studio, composition horizontale avec un espace libre à gauche pour le titre --ar 16:9',
      },
      {
        titre: 'Fixer une référence de style',
        conseil:
          'Une image de référence ou un code de style garde les couleurs et la matière d’une image à l’autre.',
        sources: ['affiche-alpes', 'icones-3d'],
        citation: 'affiche-alpes',
        citationTexte:
          'Lac alpin émeraude entre forêts de sapins et sommets calcaires, petite cabane rouille au bord de l’eau, brume du matin, illustration peinte détaillée --sref 3127845 --ar 2:3',
      },
      {
        titre: 'Générer plusieurs essais et garder le meilleur',
        conseil: 'L’auteur indique combien d’essais ont été nécessaires.',
        sources: ['cite-ciel-mer', 'visuel-conference', 'portrait-gouache'],
      },
    ],
    pieges: [
      {
        titre: 'Le style change d’une image à l’autre',
        solution:
          'Gardez la même référence et les mêmes indications de style ; ne changez que le sujet.',
        sources: ['icones-3d', 'affiche-alpes'],
        etape: 2,
        sujet: 'sujet-1',
      },
      {
        titre: 'Un rendu trop photographique',
        solution: 'Nommez la technique et la matière du support.',
        sources: ['portrait-gouache'],
        etape: 0,
        sujet: 'sujet-9',
      },
      {
        titre: 'Un code de style qui ne fonctionne plus après une mise à jour',
        solution:
          'Notez la version du modèle avec le code de style et vérifiez-le avant de lancer une série.',
        sources: ['affiche-alpes'],
        etape: 2,
      },
      {
        titre: 'Une composition trop chargée',
        solution: 'Précisez où placer le sujet principal.',
        sources: ['cite-ciel-mer'],
        etape: 1,
      },
    ],
    lacunes: ['Peu de parcours avec Adobe Firefly ou Krea.'],
    parcours: [
      'cite-ciel-mer',
      'portrait-gouache',
      'affiche-alpes',
      'icones-3d',
      'visuel-conference',
      'pochette-album',
    ],
    sujets: ['sujet-1', 'sujet-9'],
    cas: ['cas-5'],
  },
  {
    cle: 'photo',
    domaine: 'Image et illustration',
    titre: 'Obtenir une photo réaliste d’un produit ou d’un lieu',
    titreCourt: 'Photos réalistes',
    motsCles: [
      'photo',
      'produit',
      'photographie',
      'lieu',
      'voyage',
      'lumière',
      'packshot',
      'e-commerce',
    ],
    etapes: [
      {
        titre: 'Décrire la lumière et sa direction',
        conseil: 'D’où vient la lumière, à quel moment de la journée, douce ou dure.',
        sources: ['bissap', 'facade-goree'],
        citation: 'bissap',
        citationTexte:
          'Photo produit en studio, tasse en céramique blanche remplie d’infusion de bissap rouge rubis, fleurs d’hibiscus séchées autour, lumière naturelle douce venant de gauche, fond lin écru, faible profondeur de champ.',
      },
      {
        titre: 'Préciser l’objectif et le cadrage',
        conseil:
          'Focale, distance et profondeur de champ rapprochent le résultat d’une vraie photo.',
        sources: ['facade-goree', 'bissap'],
        citation: 'facade-goree',
        citationTexte:
          'Photographie d’une façade ocre rose à Gorée, volets bleu passé, palmiers, pirogue colorée au premier plan, lumière dorée de fin de journée, 35 mm, couleurs naturelles.',
      },
      {
        titre: 'Simplifier le premier plan',
        conseil: 'Moins d’éléments au premier plan, moins de formes déformées.',
        sources: ['facade-goree'],
      },
      {
        titre: 'Comparer avec le produit réel',
        conseil: 'Les couleurs et les proportions sont vérifiées avant publication.',
        sources: ['bissap'],
      },
    ],
    pieges: [
      {
        titre: 'Des reflets et une lumière incohérents',
        solution: 'Indiquez la direction et la qualité de la lumière.',
        sources: ['bissap'],
        etape: 0,
      },
      {
        titre: 'Des objets déformés au premier plan',
        solution: 'Réduisez le nombre d’éléments au premier plan.',
        sources: ['facade-goree'],
        etape: 2,
      },
    ],
    lacunes: ['Aucun parcours sur la retouche d’une vraie photo de produit.'],
    parcours: ['facade-goree', 'bissap'],
    sujets: [],
    cas: ['cas-5'],
  },
  {
    cle: 'automatiser',
    domaine: 'Automatisation',
    titre: 'Automatiser le traitement des e-mails et des documents',
    titreCourt: 'E-mails et documents automatisés',
    motsCles: [
      'automatisation',
      'automatiser',
      'e-mail',
      'mail',
      'facture',
      'devis',
      'relance',
      'résumé',
      'n8n',
      'zapier',
      'make',
    ],
    etapes: [
      {
        titre: 'Délimiter ce que l’automatisation traite',
        conseil: 'Quels messages, quels documents, et ce qui reste à faire à la main.',
        sources: ['factures-auto', 'relance-devis', 'resume-canal'],
      },
      {
        titre: 'Extraire les informations utiles',
        conseil: 'Montant, fournisseur, décisions : chaque information extraite garde sa source.',
        sources: ['factures-auto', 'resume-canal'],
        citation: 'resume-canal',
        citationTexte:
          'Résume les messages des dernières 24 heures en trois rubriques : décisions, questions ouvertes, tâches attribuées. Cite l’auteur de chaque décision. Ignore les messages de bienvenue et les réactions.',
      },
      {
        titre: 'Mettre de côté les cas douteux',
        conseil: 'Un dossier « à vérifier » reçoit tout ce qui est ambigu.',
        sources: ['factures-auto'],
      },
      {
        titre: 'Valider avant tout envoi à l’extérieur',
        conseil: 'Une personne relit chaque message destiné à un client.',
        sources: ['relance-devis'],
      },
    ],
    pieges: [
      {
        titre: 'Des informations attribuées à la mauvaise source',
        solution:
          'Faites citer la source de chaque information extraite et isolez les cas ambigus.',
        sources: ['resume-canal', 'factures-auto'],
        etape: 1,
        sujet: 'sujet-5',
      },
      {
        titre: 'Des messages envoyés sans relecture',
        solution: 'Ajoutez une étape de validation avant tout message envoyé à un client.',
        sources: ['relance-devis'],
        etape: 3,
        cas: 'cas-4',
      },
      {
        titre: 'Des documents scannés ignorés',
        solution: 'Prévoyez une reconnaissance de texte ou un dossier « à traiter à la main ».',
        sources: ['factures-auto'],
        etape: 2,
      },
    ],
    lacunes: ['Aucun parcours avec Dify ou LangChain.'],
    parcours: ['factures-auto', 'relance-devis', 'resume-canal'],
    sujets: ['sujet-5'],
    cas: ['cas-4'],
  },
  {
    cle: 'donnees',
    domaine: 'Analyse de données',
    titre: 'Nettoyer et analyser vos données',
    titreCourt: 'Nettoyage et analyse de données',
    motsCles: [
      'données',
      'tableur',
      'excel',
      'csv',
      'analyse',
      'graphique',
      'ventes',
      'sql',
      'contacts',
      'doublons',
      'tableau de bord',
    ],
    etapes: [
      {
        titre: 'Décrire la structure des données',
        conseil: 'Colonnes, formats et tables sont décrits avant toute demande.',
        sources: ['requete-sql', 'doublons-contacts', 'pluie-bamako'],
        citation: 'requete-sql',
        citationTexte:
          'Écris une requête PostgreSQL qui liste les clients sans commande depuis 90 jours, avec la date de leur dernière commande et leur total dépensé. Tables : clients(id, nom, email) et commandes(id, client_id, date, montant).',
      },
      {
        titre: 'Nettoyer avant d’analyser',
        conseil: 'Doublons, valeurs manquantes et formats incohérents sont traités en premier.',
        sources: ['ventes-boutique', 'doublons-contacts'],
        citation: 'doublons-contacts',
        citationTexte:
          'Repère les doublons en comparant l’e-mail, le téléphone normalisé et le nom. Ne fusionne jamais deux contacts dont seul le nom correspond : liste-les à part pour vérification.',
      },
      {
        titre: 'Recalculer les chiffres clés',
        conseil: 'Chaque pourcentage et chaque total annoncés par l’IA sont recalculés.',
        sources: ['ventes-boutique', 'pluie-bamako'],
      },
      {
        titre: 'Présenter avec les unités et la source',
        conseil: 'Axes nommés, unités, période et source sous chaque graphique.',
        sources: ['pluie-bamako', 'ventes-boutique'],
      },
    ],
    pieges: [
      {
        titre: 'Des chiffres faux présentés avec assurance',
        solution: 'Recalculez chaque pourcentage à partir des valeurs de départ.',
        sources: ['ventes-boutique'],
        etape: 2,
        sujet: 'sujet-4',
        cas: 'cas-1',
      },
      {
        titre: 'Des périodes ou un ordre incohérents',
        solution: 'Comparez des périodes de même durée et imposez l’ordre chronologique.',
        sources: ['pluie-bamako', 'ventes-boutique'],
        etape: 3,
        sujet: 'sujet-8',
      },
      {
        titre: 'Des fusions abusives entre homonymes',
        solution: 'Ne fusionnez que sur un identifiant fiable et mettez le reste de côté.',
        sources: ['doublons-contacts'],
        etape: 1,
      },
      {
        titre: 'Des lignes oubliées par une requête',
        solution:
          'Testez la requête sur un cas limite, par exemple un client sans aucune commande.',
        sources: ['requete-sql'],
        etape: 0,
      },
    ],
    lacunes: [],
    parcours: ['ventes-boutique', 'doublons-contacts', 'requete-sql', 'pluie-bamako'],
    sujets: ['sujet-8', 'sujet-4'],
    cas: ['cas-1'],
  },
  {
    cle: 'textes',
    domaine: 'Texte et rédaction',
    titre: 'Rédiger des textes qui sonnent juste',
    titreCourt: 'Textes qui sonnent juste',
    motsCles: [
      'texte',
      'rédaction',
      'lettre',
      'motivation',
      'avis',
      'réponse',
      'ton',
      'traduction',
      'cv',
      'rédiger',
      'écrire',
    ],
    etapes: [
      {
        titre: 'Donner des faits plutôt que des qualités',
        conseil: 'Des chiffres, des lieux, des détails concrets remplacent les adjectifs.',
        sources: ['lettre-motivation', 'avis-restaurant'],
        citation: 'lettre-motivation',
        citationTexte:
          'Remplace chaque qualité générale par un fait vérifiable tiré de mon CV. Supprime les formules comme « passionné et dynamique ».',
      },
      {
        titre: 'Montrer le ton attendu par l’exemple',
        conseil: 'Deux textes déjà publiés valent mieux qu’une liste d’adjectifs.',
        sources: ['avis-restaurant'],
        citation: 'avis-restaurant',
        citationTexte:
          'Rédige une réponse à cet avis pour le restaurant Le Baobab. Remercie la personne, reprends un détail précis de son avis et propose une solution si un problème est mentionné. 60 mots maximum, sans formule toute faite.',
      },
      {
        titre: 'Imposer le vocabulaire du métier',
        conseil: 'Un glossaire joint à la demande fixe les termes à employer.',
        sources: ['traduction-glossaire'],
        citation: 'traduction-glossaire',
        citationTexte:
          'Traduis cette fiche en anglais en respectant strictement le glossaire ci-dessous. Signale chaque terme absent du glossaire au lieu de le traduire librement.',
      },
      {
        titre: 'Relire phrase par phrase',
        conseil: 'Chaque phrase est relue pour vérifier qu’elle dit quelque chose de vrai.',
        sources: ['lettre-motivation', 'traduction-glossaire'],
      },
    ],
    pieges: [
      {
        titre: 'Des formules toutes faites',
        solution: 'Listez les formules à éviter et demandez un détail concret par phrase.',
        sources: ['lettre-motivation', 'avis-restaurant'],
        etape: 0,
        sujet: 'sujet-6',
      },
      {
        titre: 'Des termes métier mal traduits',
        solution:
          'Joignez un glossaire et faites signaler les termes absents au lieu de les traduire librement.',
        sources: ['traduction-glossaire'],
        etape: 2,
        sujet: 'sujet-11',
      },
    ],
    lacunes: ['Aucun parcours sur la rédaction de documents administratifs.'],
    parcours: ['lettre-motivation', 'avis-restaurant', 'traduction-glossaire'],
    sujets: ['sujet-6', 'sujet-11'],
    cas: ['cas-7', 'cas-2'],
  },
  {
    cle: 'scripts',
    domaine: 'Code et scripts',
    titre: 'Faire écrire un script sans risque pour vos fichiers',
    titreCourt: 'Scripts sans risque',
    motsCles: [
      'script',
      'python',
      'code',
      'fichiers',
      'dossier',
      'extension',
      'navigateur',
      'renommer',
      'ranger',
      'programme',
    ],
    etapes: [
      {
        titre: 'Décrire le résultat et les cas particuliers',
        conseil: 'Ce que le script doit faire, et ce qu’il ne doit jamais toucher.',
        sources: ['trier-telechargements', 'extension-navigateur'],
        citation: 'trier-telechargements',
        citationTexte:
          'Écris un script Python qui range les fichiers du dossier Téléchargements dans des sous-dossiers par type (Images, Documents, Archives). Commence par un mode simulation qui liste les déplacements prévus, ne supprime jamais rien et ignore les fichiers en cours de téléchargement.',
      },
      {
        titre: 'Exiger un mode simulation',
        conseil: 'Le script liste les opérations prévues sans rien modifier.',
        sources: ['renommer-photos', 'trier-telechargements'],
        citation: 'renommer-photos',
        citationTexte:
          'Écris un script Python qui renomme les photos JPG d’un dossier selon leur date EXIF, au format AAAA-MM-JJ_HHMMSS. Ajoute un mode simulation qui affiche les changements sans modifier les fichiers.',
      },
      {
        titre: 'Tester sur une copie',
        conseil: 'Le premier vrai lancement se fait sur une copie du dossier.',
        sources: ['renommer-photos'],
      },
      {
        titre: 'Limiter les permissions',
        conseil: 'Le script ou l’extension ne reçoit que les droits nécessaires.',
        sources: ['extension-navigateur'],
      },
    ],
    pieges: [
      {
        titre: 'Une action destructive lancée sans aperçu',
        solution: 'Demandez un mode simulation qui liste les opérations avant d’agir.',
        sources: ['renommer-photos', 'trier-telechargements'],
        etape: 1,
        sujet: 'sujet-2',
        cas: 'cas-3',
      },
      {
        titre: 'Des cas particuliers oubliés',
        solution:
          'Listez les exceptions dans la demande : fichiers en cours de téléchargement, contenus chargés plus tard…',
        sources: ['trier-telechargements', 'extension-navigateur'],
        etape: 0,
      },
      {
        titre: 'Des permissions trop larges',
        solution: 'N’accordez que les droits nécessaires à la tâche.',
        sources: ['extension-navigateur'],
        etape: 3,
        sujet: 'sujet-14',
        cas: 'cas-4',
      },
    ],
    lacunes: ['Aucun parcours pour les scripts PowerShell ou les tâches planifiées.'],
    parcours: ['extension-navigateur', 'renommer-photos', 'trier-telechargements'],
    sujets: ['sujet-2', 'sujet-14'],
    cas: ['cas-3', 'cas-4', 'cas-8'],
  },
  {
    cle: 'reviser',
    domaine: 'Éducation',
    titre: 'Préparer des révisions fidèles au cours',
    titreCourt: 'Révisions fidèles au cours',
    motsCles: [
      'révision',
      'réviser',
      'quiz',
      'fiches',
      'cours',
      'élève',
      'étudiant',
      'éducation',
      'examen',
    ],
    etapes: [
      {
        titre: 'Fournir le cours comme seule source',
        conseil: 'Les documents du cours sont joints, et l’IA ne doit rien ajouter d’autre.',
        sources: ['fiches-revision', 'quiz-histoire'],
        citation: 'quiz-histoire',
        citationTexte:
          'À partir des trois documents fournis uniquement, crée un quiz de 10 questions à choix multiples sur l’empire du Mali. Donne la bonne réponse et le passage source pour chaque question.',
      },
      {
        titre: 'Exiger la source de chaque réponse',
        conseil: 'Chaque réponse cite la page ou le passage dont elle provient.',
        sources: ['fiches-revision', 'quiz-histoire'],
        citation: 'fiches-revision',
        citationTexte:
          'À partir de mon cours en pièce jointe, crée 12 fiches question-réponse sur la photosynthèse. Chaque réponse doit citer la page du cours dont elle provient.',
      },
      {
        titre: 'Vérifier les réponses avec le cours',
        conseil: 'Chaque réponse est comparée à son passage source avant de réviser.',
        sources: ['quiz-histoire'],
      },
    ],
    pieges: [
      {
        titre: 'Des réponses absentes du cours',
        solution: 'Faites citer la page ou le passage, et retirez ce qui n’en a pas.',
        sources: ['fiches-revision', 'quiz-histoire'],
        etape: 1,
        sujet: 'sujet-17',
        cas: 'cas-7',
      },
    ],
    lacunes: ['Aucun parcours pour les matières scientifiques avec formules.'],
    parcours: ['quiz-histoire', 'fiches-revision'],
    sujets: ['sujet-17'],
    cas: ['cas-7'],
  },
  {
    cle: 'audio-video',
    domaine: 'Vidéo',
    titre: 'Produire un jingle, une voix off ou une courte vidéo',
    titreCourt: 'Jingles, voix off et vidéos courtes',
    motsCles: [
      'vidéo',
      'musique',
      'jingle',
      'podcast',
      'voix',
      'voix off',
      'son',
      'audio',
      'animation',
      'teaser',
      'montage',
      'générique',
    ],
    etapes: [
      {
        titre: 'Décrire la durée, le rythme et l’ambiance',
        conseil:
          'Durée exacte, tempo, instruments ou ton de voix sont précisés dès la première demande.',
        sources: ['jingle-podcast', 'teaser-festival', 'voix-off'],
        citation: 'jingle-podcast',
        citationTexte:
          'Générique instrumental de 10 secondes pour un podcast de société, kora et basse douce, tempo 96, motif mélodique simple répété deux fois, fin franche, sans voix.',
      },
      {
        titre: 'Composer la musique avant le montage',
        conseil: 'Les plans sont calés sur le tempo de la musique.',
        sources: ['teaser-festival'],
      },
      {
        titre: 'Fixer la caméra et le cadre',
        conseil: 'Un cadre fixe évite les déformations du texte et du logo.',
        sources: ['animation-logo'],
        citation: 'animation-logo',
        citationTexte:
          'À partir de cette image du logo, fais apparaître le symbole par un tracé lumineux, puis le nom en fondu. Caméra fixe, fond blanc, aucune déformation des lettres.',
      },
      {
        titre: 'Écrire les pauses dans le script',
        conseil: 'Les pauses écrites rendent la voix plus naturelle.',
        sources: ['voix-off'],
        citation: 'voix-off',
        citationTexte:
          'Voix féminine, français standard, débit posé, ton chaleureux et clair. Marque une courte pause après chaque étape numérotée du script.',
      },
    ],
    pieges: [
      {
        titre: 'Une fin qui s’éteint en fondu',
        solution: 'Demandez une fin franche et une durée exacte.',
        sources: ['jingle-podcast'],
        etape: 0,
        sujet: 'sujet-13',
      },
      {
        titre: 'Des lettres qui se déforment',
        solution: 'Fixez la caméra et interdisez toute déformation du texte.',
        sources: ['animation-logo'],
        etape: 2,
      },
      {
        titre: 'Des coupes à contretemps',
        solution: 'Composez la musique d’abord, puis calez les plans sur le tempo.',
        sources: ['teaser-festival'],
        etape: 1,
      },
    ],
    lacunes: ['Aucun parcours de sous-titrage pour l’instant.'],
    parcours: ['jingle-podcast', 'voix-off', 'animation-logo', 'teaser-festival'],
    sujets: ['sujet-12', 'sujet-13', 'sujet-16'],
    cas: [],
  },
];

/** « Ce que la communauté cherche encore » : `soutiens` membres de démonstration le cherchent. */
export const DEMANDES: DemandeGuideDemo[] = [
  {
    libelle: 'Podcast en wolof',
    domaine: 'Musique et son',
    soutiens: 23,
  },
  {
    libelle: 'Devis pour un artisan du bâtiment',
    domaine: 'Automatisation',
    soutiens: 17,
  },
  {
    libelle: 'Menu de restaurant en plusieurs langues',
    domaine: 'Texte et rédaction',
    soutiens: 12,
  },
  {
    libelle: 'Sous-titres d’une vidéo',
    domaine: 'Vidéo',
    soutiens: 9,
  },
  {
    libelle: 'Portfolio de photographe',
    domaine: 'Application web',
    soutiens: 7,
  },
  {
    libelle: 'Planning d’équipe en restauration',
    domaine: 'Application web',
    soutiens: 6,
  },
];
