import type { SujetDemo } from '../types.js';

/* Sujets et réponses du forum (forum-data.js). Une clinique porte ses quatre rubriques dans son corps (RG-62) ;
   le prompt proposé dans une réponse est un bloc de code du corps Markdown. */

export const SUJETS: SujetDemo[] = [
  {
    cle: 'sujet-1',
    auteur: 'koffi-amoussou',
    type: 'CLINIQUE',
    titre: 'Mon personnage change de visage à chaque nouvelle image',
    corps:
      'Je prépare une série de six portraits pour une histoire illustrée. Même en recopiant la même description, le visage change d’une scène à l’autre : la forme des yeux, la coupe et même l’âge apparent.\n\n### Prompt utilisé\n\nPortrait d’un jeune homme aux cheveux courts, manteau bleu, assis dans un café, illustration à la gouache, lumière douce du matin.\n\n### Résultat obtenu\n\nSix visages différents : la mâchoire, les yeux et l’âge apparent changent à chaque scène.\n\n### Résultat attendu\n\nLe même personnage, reconnaissable d’une scène à l’autre ; seul le décor change.\n\n### Outil et modèle\n\nMidjourney · v7',
    outil: 'Midjourney',
    modele: 'v7',
    etiquettes: ['Personnage', 'Cohérence', 'Portrait'],
    date: '2026-10-12T09:40',
    creation: 'portrait-gouache',
    utiles: 41,
    messages: [
      {
        cle: 'r1-1',
        auteur: 'claire-dubois',
        date: '2026-10-12T10:25',
        corps:
          'Le texte seul ne suffit pas à fixer un visage. Générez d’abord une planche de référence du personnage, de face et de trois quarts, puis passez-la en référence de personnage à chaque scène. Décrivez le visage avec les mêmes mots partout et ne faites varier que le décor.\n\n```text\nMême personnage que la référence : jeune homme aux cheveux courts, mâchoire carrée, yeux en amande, manteau bleu. Assis dans un café, illustration à la gouache, lumière douce du matin. --cref planche-personnage.png --cw 80\n```',
        utiles: 34,
      },
      {
        cle: 'r1-2',
        auteur: 'kofi-mensah',
        date: '2026-10-12T11:02',
        corps:
          'Pour la gouache, baissez le poids de la référence à 60 dans les scènes larges : au-delà, la texture du portrait d’origine écrase le décor.',
        utiles: 12,
      },
      {
        cle: 'r1-3',
        auteur: 'koffi-amoussou',
        date: '2026-10-12T15:48',
        corps:
          'Testé sur les six scènes avec la planche de référence : le visage tient, même de profil. Merci Claire, j’accepte votre réponse.',
        utiles: 5,
      },
      {
        cle: 'r1-4',
        auteur: 'sebastien-roy',
        date: '2026-10-13T08:15',
        corps:
          'Est-ce que la méthode fonctionne avec Flux ? Je n’ai pas d’option de référence de personnage.',
        utiles: 2,
      },
      {
        cle: 'r1-5',
        auteur: 'claire-dubois',
        date: '2026-10-13T09:02',
        corps:
          'Avec Flux 1.1 Pro, passez la planche en image d’entrée avec une influence modérée et décrivez le visage en détail. Le résultat est un peu moins stable, mais il tient sur trois ou quatre scènes.',
        utiles: 6,
      },
    ],
    reponseAcceptee: { message: 'r1-1', date: '2026-10-12T15:48' },
  },
  {
    cle: 'sujet-2',
    auteur: 'mariam-diop',
    type: 'QUESTION',
    titre: 'Comment vérifier qu’un script ne supprime rien par erreur ?',
    corps:
      'Je veux faire trier mes fichiers dans plusieurs dossiers par un script Python écrit avec ChatGPT. Avant de le lancer, comment voir exactement les fichiers concernés et m’assurer qu’aucun document utile ne sera supprimé ?',
    outil: 'ChatGPT',
    modele: 'GPT-5',
    etiquettes: ['Script', 'Fichiers', 'Sécurité'],
    date: '2026-10-11T14:10',
    creation: 'trier-telechargements',
    utiles: 27,
    messages: [
      {
        cle: 'r2-1',
        auteur: 'ousmane-sy',
        date: '2026-10-11T15:02',
        corps:
          'Demandez une exécution à blanc : le script affiche chaque opération prévue sans rien modifier. Relisez la liste, puis relancez avec une option explicite pour appliquer les changements.\n\n```text\nAjoute une option --essai active par défaut : le script affiche chaque opération prévue (fichier, action, destination) sans modifier aucun fichier. Les fichiers ne sont déplacés qu’avec l’option --appliquer.\n```',
        utiles: 19,
      },
      {
        cle: 'r2-2',
        auteur: 'thomas-lefevre',
        date: '2026-10-11T18:30',
        corps:
          'Je copie aussi le dossier dans un dossier de test avant le premier vrai lancement. Cela m’a évité de perdre des factures.',
        utiles: 4,
      },
      {
        cle: 'r2-3',
        auteur: 'ibrahima-sow',
        date: '2026-10-12T08:45',
        corps:
          'Remplacez toute suppression par un déplacement vers une corbeille dédiée : vous pourrez revenir en arrière si le tri se trompe.',
        utiles: 9,
      },
    ],
  },
  {
    cle: 'sujet-3',
    auteur: 'fatoumata-coulibaly',
    type: 'ASTUCE',
    titre: 'Isoler le texte exact dans un logo généré',
    corps:
      'Les noms de marque sortent souvent avec une lettre en trop ou en moins. Mettre le texte exact entre guillemets, en capitales, et le décrire séparément du symbole règle le problème dans la plupart des cas.',
    exempleAvant:
      'Logo pour une marque de beurre de karité appelée Karité Doré, style minimaliste, couleurs chaudes.',
    exempleApres:
      'Logo minimaliste, couleurs chaudes. Symbole : une noix de karité stylisée. Texte exact, en capitales : "KARITÉ DORÉ". Aucun autre texte.',
    resultatAvant: '« Karité Dorée », « Karite Dore » : une lettre change d’un essai à l’autre.',
    resultatApres: 'Le nom exact sur 9 essais sur 10.',
    outil: 'Ideogram',
    modele: '3.0',
    etiquettes: ['Logo', 'Texte', 'Typographie'],
    date: '2026-10-10T11:20',
    creation: 'logo-karite',
    utiles: 36,
    testes: 27,
    messages: [
      {
        cle: 'r3-1',
        auteur: 'ndeye-fall',
        date: '2026-10-10T13:00',
        corps:
          'Testé avec Recraft V3 : même effet. J’ajoute aussi le style de police souhaité, par exemple « linéale grasse ».',
        utiles: 6,
      },
      {
        cle: 'r3-2',
        auteur: 'kofi-mensah',
        date: '2026-10-11T09:12',
        corps:
          'Avec GPT Image 1, précisez bien « aucun autre texte » : sinon un slogan apparaît parfois sous le logo.',
        utiles: 8,
      },
      {
        cle: 'r3-3',
        auteur: 'aissatou-ndiaye',
        date: '2026-10-12T17:40',
        corps: 'La méthode fonctionne aussi pour les menus et les affiches.',
        utiles: 2,
      },
    ],
  },
  {
    cle: 'sujet-4',
    auteur: 'julien-moreau',
    type: 'CLINIQUE',
    titre: 'Le résumé de mon rapport invente des chiffres',
    corps:
      'Je fais résumer un rapport d’activité de 40 pages. Le résumé est clair, mais deux chiffres n’existent nulle part dans le rapport.\n\n### Prompt utilisé\n\nRésume ce rapport d’activité en une page pour le conseil d’administration, avec les chiffres clés.\n\n### Résultat obtenu\n\nUn résumé fluide, mais « +18 % de chiffre d’affaires » et « 240 bénéficiaires » ne figurent pas dans le rapport.\n\n### Résultat attendu\n\nUn résumé fidèle, où chaque chiffre provient du rapport.\n\n### Outil et modèle\n\nChatGPT · GPT-5',
    outil: 'ChatGPT',
    modele: 'GPT-5',
    etiquettes: ['Résumé', 'Vérification', 'Chiffres'],
    date: '2026-10-09T10:05',
    utiles: 38,
    messages: [
      {
        cle: 'r4-1',
        auteur: 'claire-dubois',
        date: '2026-10-09T11:30',
        corps:
          'Imposez que chaque chiffre soit suivi de sa page et autorisez explicitement l’IA à écrire « non indiqué ». Vérifiez ensuite chaque chiffre à la page citée.\n\n```text\nRésume ce rapport d’activité en une page pour le conseil d’administration. N’utilise que des chiffres présents dans le rapport et indique la page entre parenthèses après chacun. Si une information manque, écris « non indiqué ».\n```',
        utiles: 28,
      },
      {
        cle: 'r4-2',
        auteur: 'moussa-diallo',
        date: '2026-10-09T14:20',
        corps:
          'Je demande ensuite une deuxième passe : « Liste chaque chiffre du résumé avec la phrase exacte du rapport ». Les erreurs ressortent tout de suite.',
        utiles: 7,
      },
      {
        cle: 'r4-3',
        auteur: 'julien-moreau',
        date: '2026-10-10T09:00',
        corps:
          'Avec les pages citées, j’ai retrouvé l’origine des deux chiffres : ils venaient du rapport de l’an dernier, collé plus tôt dans la même conversation.',
        utiles: 3,
      },
      {
        cle: 'r4-4',
        auteur: 'awa-sarr',
        date: '2026-10-11T16:45',
        corps: 'Bon à savoir : je repartirai d’une conversation vide pour chaque document.',
        utiles: 2,
      },
    ],
    reponseAcceptee: { message: 'r4-1', date: '2026-10-10T09:00' },
  },
  {
    cle: 'sujet-5',
    auteur: 'moussa-diallo',
    type: 'RETOUR_EXPERIENCE',
    titre: 'Ce que j’ai ajusté pour automatiser le tri de mes factures',
    corps:
      'Trois semaines de tri automatique des factures reçues par e-mail, avec n8n et Claude Haiku 4.5. Voici ce qui a changé entre la première version et celle qui tourne aujourd’hui.\n\n1. Lire le fournisseur dans le PDF plutôt que dans l’objet de l’e-mail : l’objet était faux une fois sur cinq.\n2. Envoyer les factures douteuses dans un dossier « À vérifier » au lieu de les classer quand même.\n3. Ajouter le montant et la date dans le nom du fichier pour retrouver une facture sans l’ouvrir.',
    outil: 'n8n',
    etiquettes: ['Factures', 'E-mails', 'Automatisation'],
    date: '2026-10-08T17:30',
    creation: 'factures-auto',
    utiles: 24,
    messages: [
      {
        cle: 'r5-1',
        auteur: 'ousmane-sy',
        date: '2026-10-08T19:05',
        corps:
          'Le dossier « À vérifier » est la meilleure décision : une automatisation qui sait dire « je ne sais pas » vaut mieux qu’un classement faux.',
        utiles: 9,
      },
      {
        cle: 'r5-2',
        auteur: 'hugo-girard',
        date: '2026-10-09T10:40',
        corps: 'Comment gérez-vous les factures de plusieurs pages ?',
        utiles: 3,
      },
      {
        cle: 'r5-3',
        auteur: 'moussa-diallo',
        date: '2026-10-09T12:15',
        corps:
          'Je lis la première page pour le fournisseur et la dernière pour le total. Cela suffit pour la quasi-totalité de mes factures.',
        utiles: 4,
      },
    ],
  },
  {
    cle: 'sujet-6',
    auteur: 'yacine-benali',
    type: 'DISCUSSION',
    titre: 'Comment garder un ton naturel dans les textes générés ?',
    corps:
      'Mes réponses aux avis clients se ressemblent toutes : « Nous sommes ravis… », « N’hésitez pas… ». Quelles méthodes employez-vous pour obtenir un ton proche de votre façon d’écrire ?',
    outil: 'Le Chat',
    modele: 'Mistral Large 2',
    etiquettes: ['Ton', 'Rédaction', 'Avis clients'],
    date: '2026-10-07T12:00',
    creation: 'avis-restaurant',
    utiles: 33,
    messages: [
      {
        cle: 'r6-1',
        auteur: 'awa-sarr',
        date: '2026-10-07T13:20',
        corps:
          'Je colle trois de mes vraies réponses en exemple et je demande de reprendre leur longueur et leur vocabulaire. Le résultat change complètement.',
        utiles: 14,
      },
      {
        cle: 'r6-2',
        auteur: 'julien-moreau',
        date: '2026-10-07T15:45',
        corps: 'Je donne une liste de formules interdites. Elle est courte, mais efficace.',
        utiles: 11,
      },
      {
        cle: 'r6-3',
        auteur: 'claire-dubois',
        date: '2026-10-08T09:10',
        corps:
          'Demandez une première version, puis faites-la raccourcir d’un tiers : les formules creuses partent en premier.',
        utiles: 16,
      },
      {
        cle: 'r6-4',
        auteur: 'ndeye-fall',
        date: '2026-10-09T18:25',
        corps: 'J’ai adopté la liste de formules interdites, merci.',
        utiles: 3,
      },
    ],
  },
  {
    cle: 'sujet-7',
    auteur: 'aissatou-ndiaye',
    type: 'QUESTION',
    titre: 'Comment éviter deux réservations sur le même créneau ?',
    corps:
      'Mon site de réservation pour un salon de coiffure accepte deux rendez-vous sur le même créneau quand deux clientes réservent en même temps. Que faut-il demander pour que le créneau soit vérifié au moment de confirmer ?',
    outil: 'Claude',
    modele: 'Sonnet 4.5',
    etiquettes: ['Réservation', 'Base de données'],
    date: '2026-10-06T19:20',
    creation: 'keur-awa',
    utiles: 11,
    messages: [],
  },
  {
    cle: 'sujet-8',
    auteur: 'claire-dubois',
    type: 'QUESTION',
    titre: 'Comparer les ventes sans mélanger les périodes',
    corps:
      'Je compare les ventes de septembre à celles d’août, mais le tableau généré mélange parfois les semaines à cheval sur deux mois. Comment cadrer la demande ?',
    outil: 'ChatGPT',
    modele: 'GPT-5',
    etiquettes: ['Ventes', 'Tableau', 'Périodes'],
    date: '2026-10-05T09:30',
    creation: 'ventes-boutique',
    utiles: 15,
    messages: [
      {
        cle: 'r8-1',
        auteur: 'ibrahima-sow',
        date: '2026-10-05T10:15',
        corps:
          'Donnez les dates de début et de fin de chaque période, au jour près, et demandez de les rappeler en tête du tableau.\n\n```text\nCompare les ventes du 1er au 30 septembre 2026 à celles du 1er au 31 août 2026. Rappelle ces deux périodes en tête du tableau et n’inclus aucune vente hors de ces dates.\n```',
        utiles: 8,
      },
      {
        cle: 'r8-2',
        auteur: 'moussa-diallo',
        date: '2026-10-05T13:40',
        corps:
          'Ajoutez une colonne « nombre de jours » : un mois de 31 jours contre un mois de 30 fausse déjà la comparaison.',
        utiles: 4,
      },
      {
        cle: 'r8-3',
        auteur: 'claire-dubois',
        date: '2026-10-06T08:20',
        corps: 'Avec les bornes en tête du tableau, l’erreur se voit tout de suite. Merci.',
        utiles: 2,
      },
    ],
  },
  {
    cle: 'sujet-9',
    auteur: 'kofi-mensah',
    type: 'DISCUSSION',
    titre: 'Garder une texture de gouache sans perdre les détails du portrait',
    corps:
      'Plus j’insiste sur la texture de gouache, plus les détails du visage se perdent. Comment trouvez-vous l’équilibre ?',
    outil: 'Midjourney',
    modele: 'v7',
    etiquettes: ['Gouache', 'Portrait', 'Texture'],
    date: '2026-10-04T15:10',
    creation: 'portrait-gouache',
    utiles: 19,
    messages: [
      {
        cle: 'r9-1',
        auteur: 'lea-martin',
        date: '2026-10-04T17:30',
        corps:
          'Je décris la texture pour le fond et les vêtements, et je demande un visage « peint avec précision ». La matière reste, le visage aussi.',
        utiles: 7,
      },
      {
        cle: 'r9-2',
        auteur: 'fatoumata-coulibaly',
        date: '2026-10-05T09:50',
        corps: 'Le paramètre de stylisation à 150 au lieu de 250 m’a rendu les yeux.',
        utiles: 5,
      },
      {
        cle: 'r9-3',
        auteur: 'kofi-mensah',
        date: '2026-10-06T11:05',
        corps: 'Les deux combinés fonctionnent bien sur mes derniers essais.',
        utiles: 3,
      },
    ],
  },
  {
    cle: 'sujet-10',
    auteur: 'lea-martin',
    type: 'QUESTION',
    titre: 'Structurer un tableau à partir de notes de réunion',
    corps:
      'J’ai des notes de réunion en vrac : décisions, tâches, questions ouvertes. Je voudrais un tableau avec le responsable et l’échéance de chaque tâche, mais certaines échéances sont inventées. Comment l’éviter ?',
    outil: 'Claude',
    modele: 'Sonnet 4.5',
    etiquettes: ['Réunion', 'Tableau'],
    date: '2026-10-03T10:45',
    utiles: 6,
    messages: [],
  },
  {
    cle: 'sujet-11',
    auteur: 'awa-sarr',
    type: 'ASTUCE',
    titre: 'Faire relire une traduction avec un glossaire métier',
    corps:
      'Pour une traduction technique, je fournis un glossaire de dix à vingt termes et je demande une relecture limitée à ces termes. Les contresens sur le vocabulaire métier disparaissent.',
    exempleAvant: 'Relis cette traduction anglaise de notre fiche produit et corrige les erreurs.',
    exempleApres:
      'Relis cette traduction anglaise. Vérifie uniquement les termes du glossaire ci-dessous et signale chaque écart dans un tableau : terme, traduction trouvée, traduction attendue. Glossaire : clé à choc = impact wrench ; douille = socket ; couple de serrage = tightening torque.',
    resultatAvant:
      'Des tournures reformulées, mais « clé à choc » toujours traduit par « shock key ».',
    resultatApres: 'Les quatre écarts du glossaire signalés, sans reformulation du reste.',
    outil: 'ChatGPT',
    modele: 'GPT-5',
    etiquettes: ['Traduction', 'Glossaire', 'Relecture'],
    date: '2026-10-02T14:00',
    creation: 'traduction-glossaire',
    utiles: 22,
    testes: 9,
    messages: [
      {
        cle: 'r11-1',
        auteur: 'yacine-benali',
        date: '2026-10-02T16:10',
        corps:
          'Testé avec Le Chat sur une notice : même résultat. Le tableau des écarts se relit en deux minutes.',
        utiles: 5,
      },
      {
        cle: 'r11-2',
        auteur: 'hugo-girard',
        date: '2026-10-03T11:30',
        corps: 'Le glossaire peut-il dépasser vingt termes ?',
        utiles: 2,
      },
      {
        cle: 'r11-3',
        auteur: 'awa-sarr',
        date: '2026-10-03T12:05',
        corps: 'Au-delà de trente termes, je découpe en deux passes : la relecture reste précise.',
        utiles: 4,
      },
    ],
  },
  {
    cle: 'sujet-12',
    auteur: 'hugo-girard',
    type: 'RETOUR_EXPERIENCE',
    titre: 'Préparer des sous-titres à partir d’un entretien',
    corps:
      'Retour sur les sous-titres d’un entretien de 25 minutes : transcription, découpage, puis relecture.\n\n1. Découper la transcription par phrases complètes, jamais au milieu d’une idée.\n2. Limiter chaque sous-titre à deux lignes de 42 caractères.\n3. Relire les noms propres à part : ce sont eux qui sortent le plus souvent faux.',
    outil: 'Le Chat',
    modele: 'Mistral Large 2',
    etiquettes: ['Sous-titres', 'Transcription'],
    date: '2026-10-01T16:30',
    utiles: 9,
    messages: [
      {
        cle: 'r12-1',
        auteur: 'sebastien-roy',
        date: '2026-10-02T09:15',
        corps: 'La règle des 42 caractères par ligne m’a fait gagner beaucoup de temps.',
        utiles: 3,
      },
      {
        cle: 'r12-2',
        auteur: 'hugo-girard',
        date: '2026-10-05T17:50',
        corps: 'Je ferme le sujet : la méthode complète est dans mon parcours sur les sous-titres.',
        utiles: 1,
      },
    ],
    fermeture: { par: 'hugo-girard', date: '2026-10-05T18:00' },
  },
  {
    cle: 'sujet-13',
    auteur: 'ndeye-fall',
    type: 'CLINIQUE',
    titre: 'Mon générique de podcast dépasse toujours les 10 secondes',
    corps:
      'Je cherche un générique court pour l’ouverture de mon podcast. Malgré la durée indiquée dans la demande, chaque morceau dure au moins 30 secondes.\n\n### Prompt utilisé\n\nGénérique de podcast de 10 secondes, percussions légères, kora, ambiance chaleureuse, fin nette.\n\n### Résultat obtenu\n\nDes morceaux de 30 secondes ou plus, avec un fondu qui s’étire.\n\n### Résultat attendu\n\nUn générique de 10 secondes avec une fin franche, prêt à placer en ouverture.\n\n### Outil et modèle\n\nSuno · v4.5',
    outil: 'Suno',
    modele: 'v4.5',
    etiquettes: ['Durée', 'Générique', 'Podcast'],
    date: '2026-10-13T11:05',
    creation: 'jingle-podcast',
    utiles: 4,
    messages: [
      {
        cle: 'r13-1',
        auteur: 'ibrahima-sow',
        date: '2026-10-13T12:30',
        corps:
          'Suno ne garantit pas une durée aussi courte. Annoncez plutôt une structure (intro de quatre mesures, fin nette) et un tempo, puis coupez à la mesure dans un éditeur audio. Je détaille la méthode dans mon parcours sur le même sujet.\n\n```text\nGénérique de podcast, 90 BPM, intro de 4 mesures puis fin nette, percussions légères, kora, ambiance chaleureuse, sans voix.\n```',
        utiles: 4,
      },
    ],
  },
  {
    cle: 'sujet-14',
    auteur: 'thomas-lefevre',
    type: 'QUESTION',
    titre: 'L’agent modifie des fichiers que je ne lui ai pas demandé de toucher',
    corps:
      'Je demande à l’agent de corriger la couleur d’un bouton, et il modifie aussi trois autres fichiers. Comment limiter son champ d’action ?',
    outil: 'Cursor',
    etiquettes: ['Agent', 'Code', 'Revue'],
    date: '2026-10-13T15:35',
    utiles: 2,
    messages: [],
  },
  {
    cle: 'sujet-15',
    auteur: 'ousmane-sy',
    type: 'ASTUCE',
    titre: 'Faire écrire les tests avant la fonction',
    corps:
      'Avant de demander une fonction, je fais écrire les tests des cas limites. Je relis les tests, puis je demande la fonction qui les fait passer : les oublis apparaissent avant même d’exécuter le code.',
    exempleAvant: 'Ajoute une fonction qui calcule le prix total du panier avec les remises.',
    exempleApres:
      'Écris d’abord les tests de la fonction prixTotal : panier vide, remise en pourcentage, remise supérieure au total, quantité à zéro. Montre-moi les tests, puis écris la fonction qui les fait passer.',
    resultatAvant:
      'La fonction oublie le cas d’une remise supérieure au total : le prix devient négatif.',
    resultatApres:
      'Les quatre cas couverts ; le prix négatif est corrigé avant la première exécution.',
    outil: 'Claude',
    modele: 'Sonnet 4.5',
    etiquettes: ['Tests', 'Code', 'Fiabilité'],
    date: '2026-10-12T18:20',
    utiles: 29,
    testes: 12,
    messages: [
      {
        cle: 'r15-1',
        auteur: 'mariam-diop',
        date: '2026-10-12T20:05',
        corps:
          'Testé sur une fonction de calcul de frais de port : deux cas oubliés sont apparus dès la liste des tests.',
        utiles: 6,
      },
      {
        cle: 'r15-2',
        auteur: 'thomas-lefevre',
        date: '2026-10-13T09:40',
        corps: 'Je relis surtout la liste des tests, plus courte que le code. Bonne habitude.',
        utiles: 3,
      },
    ],
  },
  {
    cle: 'sujet-16',
    auteur: 'sebastien-roy',
    type: 'QUESTION',
    titre: 'Les mains se déforment dans mes plans de plus de 5 secondes',
    corps:
      'Dans un teaser, mes plans de 8 secondes montrent une musicienne qui joue de la guitare. Après 5 secondes environ, ses doigts fusionnent ou se multiplient. Faut-il raccourcir les plans ou décrire le geste autrement ?',
    outil: 'Runway',
    modele: 'Gen-4',
    etiquettes: ['Vidéo', 'Mouvement', 'Mains'],
    date: '2026-10-12T21:10',
    utiles: 5,
    messages: [],
  },
  {
    cle: 'sujet-17',
    auteur: 'awa-sarr',
    type: 'CLINIQUE',
    titre: 'Les questions de mon quiz sortent du programme',
    corps:
      'Je prépare un quiz de révision pour mon fils à partir de son cours d’histoire. La moitié des questions portent sur des événements que le cours ne mentionne pas.\n\n### Prompt utilisé\n\nCrée un quiz de 10 questions sur la Seconde Guerre mondiale pour un élève de troisième.\n\n### Résultat obtenu\n\nDes questions sur des batailles et des dates absentes du cours.\n\n### Résultat attendu\n\nDes questions fidèles au cours fourni, avec le passage qui contient chaque réponse.\n\n### Outil et modèle\n\nGemini · 2.5 Pro',
    outil: 'Gemini',
    modele: '2.5 Pro',
    etiquettes: ['Quiz', 'Révision', 'Sources'],
    date: '2026-10-11T08:20',
    creation: 'quiz-histoire',
    utiles: 17,
    messages: [
      {
        cle: 'r17-1',
        auteur: 'ibrahima-sow',
        date: '2026-10-11T09:05',
        corps:
          'Collez le cours dans la demande et exigez que chaque question cite le passage qui contient la réponse. Sans ce texte de référence, l’IA puise dans ce qu’elle sait du sujet.\n\n```text\nÀ partir du cours ci-dessous uniquement, crée un quiz de 10 questions pour un élève de troisième. Pour chaque question, cite le passage du cours qui contient la réponse. Aucune question hors de ce texte.\n```',
        utiles: 12,
      },
      {
        cle: 'r17-2',
        auteur: 'claire-dubois',
        date: '2026-10-11T11:40',
        corps:
          'Avec NotebookLM, importez le cours comme source : les citations renvoient au passage exact du cours.',
        utiles: 5,
      },
      {
        cle: 'r17-3',
        auteur: 'awa-sarr',
        date: '2026-10-11T19:30',
        corps:
          'Avec le cours collé et les passages cités, les dix questions sont dans le programme. Merci.',
        utiles: 2,
      },
    ],
    reponseAcceptee: { message: 'r17-1', date: '2026-10-11T19:30' },
  },
];
