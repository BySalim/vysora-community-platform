'use strict';

/* Forum : sujets, réponses et membres qui aident le plus. */

window.VYSORA_FORUM = {
  now: '2026-10-13T16:20',
  helpers: [
    { name: 'Claire Dubois', accepted: 23, answers: 61, tools: ['ChatGPT', 'Claude'] },
    { name: 'Ousmane Sy', accepted: 17, answers: 44, tools: ['Cursor', 'Claude'] },
    { name: 'Ibrahima Sow', accepted: 14, answers: 39, tools: ['Suno', 'ElevenLabs'] },
    { name: 'Kofi Mensah', accepted: 11, answers: 30, tools: ['Midjourney', 'Flux'] },
    { name: 'Moussa Diallo', accepted: 9, answers: 26, tools: ['n8n', 'Make'] }
  ],
  topics: [
    {
      id: 'sujet-1', kind: 'clinique', status: 'resolved',
      title: 'Mon personnage change de visage à chaque nouvelle image',
      author: 'Koffi Amoussou', tool: 'Midjourney', model: 'v7', domain: 'Image et illustration',
      at: '2026-10-12T09:40', useful: 41, follows: 23, creation: 'portrait-gouache',
      tags: ['Personnage', 'Cohérence', 'Portrait'],
      body: 'Je prépare une série de six portraits pour une histoire illustrée. Même en recopiant la même description, le visage change d’une scène à l’autre : la forme des yeux, la coupe et même l’âge apparent.',
      clinic: {
        prompt: 'Portrait d’un jeune homme aux cheveux courts, manteau bleu, assis dans un café, illustration à la gouache, lumière douce du matin.',
        got: 'Six visages différents : la mâchoire, les yeux et l’âge apparent changent à chaque scène.',
        expected: 'Le même personnage, reconnaissable d’une scène à l’autre ; seul le décor change.'
      },
      replies: [
        {
          id: 'r1-1', author: 'Claire Dubois', at: '2026-10-12T10:25', useful: 34, accepted: true, acceptedAt: '2026-10-12T15:48',
          tested: 14, testedWith: [['Midjourney', 'v7'], ['Flux', '1.1 Pro']], lastTest: '2026-10-13',
          text: 'Le texte seul ne suffit pas à fixer un visage. Générez d’abord une planche de référence du personnage, de face et de trois quarts, puis passez-la en référence de personnage à chaque scène. Décrivez le visage avec les mêmes mots partout et ne faites varier que le décor.',
          prompt: 'Même personnage que la référence : jeune homme aux cheveux courts, mâchoire carrée, yeux en amande, manteau bleu. Assis dans un café, illustration à la gouache, lumière douce du matin. --cref planche-personnage.png --cw 80'
        },
        { id: 'r1-2', author: 'Kofi Mensah', at: '2026-10-12T11:02', useful: 12, text: 'Pour la gouache, baissez le poids de la référence à 60 dans les scènes larges : au-delà, la texture du portrait d’origine écrase le décor.' },
        { id: 'r1-3', author: 'Koffi Amoussou', at: '2026-10-12T15:48', useful: 5, text: 'Testé sur les six scènes avec la planche de référence : le visage tient, même de profil. Merci Claire, j’accepte votre réponse.' },
        { id: 'r1-4', author: 'Sébastien Roy', at: '2026-10-13T08:15', useful: 2, text: 'Est-ce que la méthode fonctionne avec Flux ? Je n’ai pas d’option de référence de personnage.' },
        { id: 'r1-5', author: 'Claire Dubois', at: '2026-10-13T09:02', useful: 6, text: 'Avec Flux 1.1 Pro, passez la planche en image d’entrée avec une influence modérée et décrivez le visage en détail. Le résultat est un peu moins stable, mais il tient sur trois ou quatre scènes.' }
      ]
    },
    {
      id: 'sujet-2', kind: 'question', status: 'open',
      title: 'Comment vérifier qu’un script ne supprime rien par erreur ?',
      author: 'Mariam Diop', tool: 'ChatGPT', model: 'GPT-5', domain: 'Code et scripts',
      at: '2026-10-11T14:10', useful: 27, follows: 15, creation: 'trier-telechargements',
      tags: ['Script', 'Fichiers', 'Sécurité'],
      body: 'Je veux faire trier mes fichiers dans plusieurs dossiers par un script Python écrit avec ChatGPT. Avant de le lancer, comment voir exactement les fichiers concernés et m’assurer qu’aucun document utile ne sera supprimé ?',
      replies: [
        {
          id: 'r2-1', author: 'Ousmane Sy', at: '2026-10-11T15:02', useful: 19,
          text: 'Demandez une exécution à blanc : le script affiche chaque opération prévue sans rien modifier. Relisez la liste, puis relancez avec une option explicite pour appliquer les changements.',
          prompt: 'Ajoute une option --essai active par défaut : le script affiche chaque opération prévue (fichier, action, destination) sans modifier aucun fichier. Les fichiers ne sont déplacés qu’avec l’option --appliquer.'
        },
        { id: 'r2-2', author: 'Thomas Lefèvre', at: '2026-10-11T18:30', useful: 4, text: 'Je copie aussi le dossier dans un dossier de test avant le premier vrai lancement. Cela m’a évité de perdre des factures.' },
        { id: 'r2-3', author: 'Ibrahima Sow', at: '2026-10-12T08:45', useful: 9, text: 'Remplacez toute suppression par un déplacement vers une corbeille dédiée : vous pourrez revenir en arrière si le tri se trompe.' }
      ]
    },
    {
      id: 'sujet-3', kind: 'astuce', status: 'open',
      title: 'Isoler le texte exact dans un logo généré',
      author: 'Fatoumata Coulibaly', tool: 'Ideogram', model: '3.0', domain: 'Identité visuelle',
      at: '2026-10-10T11:20', useful: 36, follows: 19, creation: 'logo-karite',
      tags: ['Logo', 'Texte', 'Typographie'],
      body: 'Les noms de marque sortent souvent avec une lettre en trop ou en moins. Mettre le texte exact entre guillemets, en capitales, et le décrire séparément du symbole règle le problème dans la plupart des cas.',
      tip: {
        before: 'Logo pour une marque de beurre de karité appelée Karité Doré, style minimaliste, couleurs chaudes.',
        beforeResult: '« Karité Dorée », « Karite Dore » : une lettre change d’un essai à l’autre.',
        after: 'Logo minimaliste, couleurs chaudes. Symbole : une noix de karité stylisée. Texte exact, en capitales : "KARITÉ DORÉ". Aucun autre texte.',
        afterResult: 'Le nom exact sur 9 essais sur 10.',
        tested: 27, testedWith: [['Ideogram', '3.0'], ['ChatGPT', 'GPT Image 1'], ['Recraft', 'V3']], lastTest: '2026-10-12'
      },
      replies: [
        { id: 'r3-1', author: 'Ndeye Fall', at: '2026-10-10T13:00', useful: 6, text: 'Testé avec Recraft V3 : même effet. J’ajoute aussi le style de police souhaité, par exemple « linéale grasse ».' },
        { id: 'r3-2', author: 'Kofi Mensah', at: '2026-10-11T09:12', useful: 8, text: 'Avec GPT Image 1, précisez bien « aucun autre texte » : sinon un slogan apparaît parfois sous le logo.' },
        { id: 'r3-3', author: 'Aïssatou Ndiaye', at: '2026-10-12T17:40', useful: 2, text: 'La méthode fonctionne aussi pour les menus et les affiches.' }
      ]
    },
    {
      id: 'sujet-4', kind: 'clinique', status: 'resolved',
      title: 'Le résumé de mon rapport invente des chiffres',
      author: 'Julien Moreau', tool: 'ChatGPT', model: 'GPT-5', domain: 'Texte et rédaction',
      at: '2026-10-09T10:05', useful: 38, follows: 21,
      tags: ['Résumé', 'Vérification', 'Chiffres'],
      body: 'Je fais résumer un rapport d’activité de 40 pages. Le résumé est clair, mais deux chiffres n’existent nulle part dans le rapport.',
      clinic: {
        prompt: 'Résume ce rapport d’activité en une page pour le conseil d’administration, avec les chiffres clés.',
        got: 'Un résumé fluide, mais « +18 % de chiffre d’affaires » et « 240 bénéficiaires » ne figurent pas dans le rapport.',
        expected: 'Un résumé fidèle, où chaque chiffre provient du rapport.'
      },
      replies: [
        {
          id: 'r4-1', author: 'Claire Dubois', at: '2026-10-09T11:30', useful: 28, accepted: true, acceptedAt: '2026-10-10T09:00',
          tested: 11, testedWith: [['ChatGPT', 'GPT-5'], ['Claude', 'Sonnet 4.5']], lastTest: '2026-10-12',
          text: 'Imposez que chaque chiffre soit suivi de sa page et autorisez explicitement l’IA à écrire « non indiqué ». Vérifiez ensuite chaque chiffre à la page citée.',
          prompt: 'Résume ce rapport d’activité en une page pour le conseil d’administration. N’utilise que des chiffres présents dans le rapport et indique la page entre parenthèses après chacun. Si une information manque, écris « non indiqué ».'
        },
        { id: 'r4-2', author: 'Moussa Diallo', at: '2026-10-09T14:20', useful: 7, text: 'Je demande ensuite une deuxième passe : « Liste chaque chiffre du résumé avec la phrase exacte du rapport ». Les erreurs ressortent tout de suite.' },
        { id: 'r4-3', author: 'Julien Moreau', at: '2026-10-10T09:00', useful: 3, text: 'Avec les pages citées, j’ai retrouvé l’origine des deux chiffres : ils venaient du rapport de l’an dernier, collé plus tôt dans la même conversation.' },
        { id: 'r4-4', author: 'Awa Sarr', at: '2026-10-11T16:45', useful: 2, text: 'Bon à savoir : je repartirai d’une conversation vide pour chaque document.' }
      ]
    },
    {
      id: 'sujet-5', kind: 'retour', status: 'open',
      title: 'Ce que j’ai ajusté pour automatiser le tri de mes factures',
      author: 'Moussa Diallo', tool: 'n8n', model: '', domain: 'Automatisation',
      at: '2026-10-08T17:30', useful: 24, follows: 12, creation: 'factures-auto',
      tags: ['Factures', 'E-mails', 'Automatisation'],
      body: 'Trois semaines de tri automatique des factures reçues par e-mail, avec n8n et Claude Haiku 4.5. Voici ce qui a changé entre la première version et celle qui tourne aujourd’hui.',
      steps: [
        'Lire le fournisseur dans le PDF plutôt que dans l’objet de l’e-mail : l’objet était faux une fois sur cinq.',
        'Envoyer les factures douteuses dans un dossier « À vérifier » au lieu de les classer quand même.',
        'Ajouter le montant et la date dans le nom du fichier pour retrouver une facture sans l’ouvrir.'
      ],
      replies: [
        { id: 'r5-1', author: 'Ousmane Sy', at: '2026-10-08T19:05', useful: 9, text: 'Le dossier « À vérifier » est la meilleure décision : une automatisation qui sait dire « je ne sais pas » vaut mieux qu’un classement faux.' },
        { id: 'r5-2', author: 'Hugo Girard', at: '2026-10-09T10:40', useful: 3, text: 'Comment gérez-vous les factures de plusieurs pages ?' },
        { id: 'r5-3', author: 'Moussa Diallo', at: '2026-10-09T12:15', useful: 4, text: 'Je lis la première page pour le fournisseur et la dernière pour le total. Cela suffit pour la quasi-totalité de mes factures.' }
      ]
    },
    {
      id: 'sujet-6', kind: 'discussion', status: 'open',
      title: 'Comment garder un ton naturel dans les textes générés ?',
      author: 'Yacine Benali', tool: 'Le Chat', model: 'Mistral Large 2', domain: 'Texte et rédaction',
      at: '2026-10-07T12:00', useful: 33, follows: 26, creation: 'avis-restaurant',
      tags: ['Ton', 'Rédaction', 'Avis clients'],
      body: 'Mes réponses aux avis clients se ressemblent toutes : « Nous sommes ravis… », « N’hésitez pas… ». Quelles méthodes employez-vous pour obtenir un ton proche de votre façon d’écrire ?',
      replies: [
        { id: 'r6-1', author: 'Awa Sarr', at: '2026-10-07T13:20', useful: 14, text: 'Je colle trois de mes vraies réponses en exemple et je demande de reprendre leur longueur et leur vocabulaire. Le résultat change complètement.' },
        { id: 'r6-2', author: 'Julien Moreau', at: '2026-10-07T15:45', useful: 11, text: 'Je donne une liste de formules interdites. Elle est courte, mais efficace.' },
        { id: 'r6-3', author: 'Claire Dubois', at: '2026-10-08T09:10', useful: 16, text: 'Demandez une première version, puis faites-la raccourcir d’un tiers : les formules creuses partent en premier.' },
        { id: 'r6-4', author: 'Ndeye Fall', at: '2026-10-09T18:25', useful: 3, text: 'J’ai adopté la liste de formules interdites, merci.' }
      ]
    },
    {
      id: 'sujet-7', kind: 'question', status: 'open',
      title: 'Comment éviter deux réservations sur le même créneau ?',
      author: 'Aïssatou Ndiaye', tool: 'Claude', model: 'Sonnet 4.5', domain: 'Application web',
      at: '2026-10-06T19:20', useful: 11, follows: 9, creation: 'keur-awa',
      tags: ['Réservation', 'Base de données'],
      body: 'Mon site de réservation pour un salon de coiffure accepte deux rendez-vous sur le même créneau quand deux clientes réservent en même temps. Que faut-il demander pour que le créneau soit vérifié au moment de confirmer ?',
      replies: []
    },
    {
      id: 'sujet-8', kind: 'question', status: 'open',
      title: 'Comparer les ventes sans mélanger les périodes',
      author: 'Claire Dubois', tool: 'ChatGPT', model: 'GPT-5', domain: 'Analyse de données',
      at: '2026-10-05T09:30', useful: 15, follows: 8, creation: 'ventes-boutique',
      tags: ['Ventes', 'Tableau', 'Périodes'],
      body: 'Je compare les ventes de septembre à celles d’août, mais le tableau généré mélange parfois les semaines à cheval sur deux mois. Comment cadrer la demande ?',
      replies: [
        {
          id: 'r8-1', author: 'Ibrahima Sow', at: '2026-10-05T10:15', useful: 8,
          text: 'Donnez les dates de début et de fin de chaque période, au jour près, et demandez de les rappeler en tête du tableau.',
          prompt: 'Compare les ventes du 1er au 30 septembre 2026 à celles du 1er au 31 août 2026. Rappelle ces deux périodes en tête du tableau et n’inclus aucune vente hors de ces dates.'
        },
        { id: 'r8-2', author: 'Moussa Diallo', at: '2026-10-05T13:40', useful: 4, text: 'Ajoutez une colonne « nombre de jours » : un mois de 31 jours contre un mois de 30 fausse déjà la comparaison.' },
        { id: 'r8-3', author: 'Claire Dubois', at: '2026-10-06T08:20', useful: 2, text: 'Avec les bornes en tête du tableau, l’erreur se voit tout de suite. Merci.' }
      ]
    },
    {
      id: 'sujet-9', kind: 'discussion', status: 'open',
      title: 'Garder une texture de gouache sans perdre les détails du portrait',
      author: 'Kofi Mensah', tool: 'Midjourney', model: 'v7', domain: 'Image et illustration',
      at: '2026-10-04T15:10', useful: 19, follows: 11, creation: 'portrait-gouache',
      tags: ['Gouache', 'Portrait', 'Texture'],
      body: 'Plus j’insiste sur la texture de gouache, plus les détails du visage se perdent. Comment trouvez-vous l’équilibre ?',
      replies: [
        { id: 'r9-1', author: 'Léa Martin', at: '2026-10-04T17:30', useful: 7, text: 'Je décris la texture pour le fond et les vêtements, et je demande un visage « peint avec précision ». La matière reste, le visage aussi.' },
        { id: 'r9-2', author: 'Fatoumata Coulibaly', at: '2026-10-05T09:50', useful: 5, text: 'Le paramètre de stylisation à 150 au lieu de 250 m’a rendu les yeux.' },
        { id: 'r9-3', author: 'Kofi Mensah', at: '2026-10-06T11:05', useful: 3, text: 'Les deux combinés fonctionnent bien sur mes derniers essais.' }
      ]
    },
    {
      id: 'sujet-10', kind: 'question', status: 'open',
      title: 'Structurer un tableau à partir de notes de réunion',
      author: 'Léa Martin', tool: 'Claude', model: 'Sonnet 4.5', domain: 'Texte et rédaction',
      at: '2026-10-03T10:45', useful: 6, follows: 4,
      tags: ['Réunion', 'Tableau'],
      body: 'J’ai des notes de réunion en vrac : décisions, tâches, questions ouvertes. Je voudrais un tableau avec le responsable et l’échéance de chaque tâche, mais certaines échéances sont inventées. Comment l’éviter ?',
      replies: []
    },
    {
      id: 'sujet-11', kind: 'astuce', status: 'open',
      title: 'Faire relire une traduction avec un glossaire métier',
      author: 'Awa Sarr', tool: 'ChatGPT', model: 'GPT-5', domain: 'Texte et rédaction',
      at: '2026-10-02T14:00', useful: 22, follows: 10, creation: 'traduction-glossaire',
      tags: ['Traduction', 'Glossaire', 'Relecture'],
      body: 'Pour une traduction technique, je fournis un glossaire de dix à vingt termes et je demande une relecture limitée à ces termes. Les contresens sur le vocabulaire métier disparaissent.',
      tip: {
        before: 'Relis cette traduction anglaise de notre fiche produit et corrige les erreurs.',
        beforeResult: 'Des tournures reformulées, mais « clé à choc » toujours traduit par « shock key ».',
        after: 'Relis cette traduction anglaise. Vérifie uniquement les termes du glossaire ci-dessous et signale chaque écart dans un tableau : terme, traduction trouvée, traduction attendue. Glossaire : clé à choc = impact wrench ; douille = socket ; couple de serrage = tightening torque.',
        afterResult: 'Les quatre écarts du glossaire signalés, sans reformulation du reste.',
        tested: 9, testedWith: [['ChatGPT', 'GPT-5'], ['DeepSeek', 'V3.2'], ['Le Chat', 'Mistral Large 2']], lastTest: '2026-10-11'
      },
      replies: [
        { id: 'r11-1', author: 'Yacine Benali', at: '2026-10-02T16:10', useful: 5, text: 'Testé avec Le Chat sur une notice : même résultat. Le tableau des écarts se relit en deux minutes.' },
        { id: 'r11-2', author: 'Hugo Girard', at: '2026-10-03T11:30', useful: 2, text: 'Le glossaire peut-il dépasser vingt termes ?' },
        { id: 'r11-3', author: 'Awa Sarr', at: '2026-10-03T12:05', useful: 4, text: 'Au-delà de trente termes, je découpe en deux passes : la relecture reste précise.' }
      ]
    },
    {
      id: 'sujet-12', kind: 'retour', status: 'closed', closedAt: '2026-10-05T18:00', closedBy: 'Hugo Girard',
      title: 'Préparer des sous-titres à partir d’un entretien',
      author: 'Hugo Girard', tool: 'Le Chat', model: 'Mistral Large 2', domain: 'Vidéo',
      at: '2026-10-01T16:30', useful: 9, follows: 5,
      tags: ['Sous-titres', 'Transcription'],
      body: 'Retour sur les sous-titres d’un entretien de 25 minutes : transcription, découpage, puis relecture.',
      steps: [
        'Découper la transcription par phrases complètes, jamais au milieu d’une idée.',
        'Limiter chaque sous-titre à deux lignes de 42 caractères.',
        'Relire les noms propres à part : ce sont eux qui sortent le plus souvent faux.'
      ],
      replies: [
        { id: 'r12-1', author: 'Sébastien Roy', at: '2026-10-02T09:15', useful: 3, text: 'La règle des 42 caractères par ligne m’a fait gagner beaucoup de temps.' },
        { id: 'r12-2', author: 'Hugo Girard', at: '2026-10-05T17:50', useful: 1, text: 'Je ferme le sujet : la méthode complète est dans mon parcours sur les sous-titres.' }
      ]
    },
    {
      id: 'sujet-13', kind: 'clinique', status: 'open',
      title: 'Mon générique de podcast dépasse toujours les 10 secondes',
      author: 'Ndeye Fall', tool: 'Suno', model: 'v4.5', domain: 'Musique et son',
      at: '2026-10-13T11:05', useful: 4, follows: 3, creation: 'jingle-podcast',
      tags: ['Durée', 'Générique', 'Podcast'],
      body: 'Je cherche un générique court pour l’ouverture de mon podcast. Malgré la durée indiquée dans la demande, chaque morceau dure au moins 30 secondes.',
      clinic: {
        prompt: 'Générique de podcast de 10 secondes, percussions légères, kora, ambiance chaleureuse, fin nette.',
        got: 'Des morceaux de 30 secondes ou plus, avec un fondu qui s’étire.',
        expected: 'Un générique de 10 secondes avec une fin franche, prêt à placer en ouverture.'
      },
      replies: [
        {
          id: 'r13-1', author: 'Ibrahima Sow', at: '2026-10-13T12:30', useful: 4,
          text: 'Suno ne garantit pas une durée aussi courte. Annoncez plutôt une structure (intro de quatre mesures, fin nette) et un tempo, puis coupez à la mesure dans un éditeur audio. Je détaille la méthode dans mon parcours sur le même sujet.',
          prompt: 'Générique de podcast, 90 BPM, intro de 4 mesures puis fin nette, percussions légères, kora, ambiance chaleureuse, sans voix.'
        }
      ]
    },
    {
      id: 'sujet-14', kind: 'question', status: 'open',
      title: 'L’agent modifie des fichiers que je ne lui ai pas demandé de toucher',
      author: 'Thomas Lefèvre', tool: 'Cursor', model: '', domain: 'Code et scripts',
      at: '2026-10-13T15:35', useful: 2, follows: 3,
      tags: ['Agent', 'Code', 'Revue'],
      body: 'Je demande à l’agent de corriger la couleur d’un bouton, et il modifie aussi trois autres fichiers. Comment limiter son champ d’action ?',
      replies: []
    },
    {
      id: 'sujet-15', kind: 'astuce', status: 'open',
      title: 'Faire écrire les tests avant la fonction',
      author: 'Ousmane Sy', tool: 'Claude', model: 'Sonnet 4.5', domain: 'Application web',
      at: '2026-10-12T18:20', useful: 29, follows: 17,
      tags: ['Tests', 'Code', 'Fiabilité'],
      body: 'Avant de demander une fonction, je fais écrire les tests des cas limites. Je relis les tests, puis je demande la fonction qui les fait passer : les oublis apparaissent avant même d’exécuter le code.',
      tip: {
        before: 'Ajoute une fonction qui calcule le prix total du panier avec les remises.',
        beforeResult: 'La fonction oublie le cas d’une remise supérieure au total : le prix devient négatif.',
        after: 'Écris d’abord les tests de la fonction prixTotal : panier vide, remise en pourcentage, remise supérieure au total, quantité à zéro. Montre-moi les tests, puis écris la fonction qui les fait passer.',
        afterResult: 'Les quatre cas couverts ; le prix négatif est corrigé avant la première exécution.',
        tested: 12, testedWith: [['Claude', 'Sonnet 4.5'], ['ChatGPT', 'GPT-5'], ['Cursor', '']], lastTest: '2026-10-13'
      },
      replies: [
        { id: 'r15-1', author: 'Mariam Diop', at: '2026-10-12T20:05', useful: 6, text: 'Testé sur une fonction de calcul de frais de port : deux cas oubliés sont apparus dès la liste des tests.' },
        { id: 'r15-2', author: 'Thomas Lefèvre', at: '2026-10-13T09:40', useful: 3, text: 'Je relis surtout la liste des tests, plus courte que le code. Bonne habitude.' }
      ]
    },
    {
      id: 'sujet-16', kind: 'question', status: 'open',
      title: 'Les mains se déforment dans mes plans de plus de 5 secondes',
      author: 'Sébastien Roy', tool: 'Runway', model: 'Gen-4', domain: 'Vidéo',
      at: '2026-10-12T21:10', useful: 5, follows: 6,
      tags: ['Vidéo', 'Mouvement', 'Mains'],
      body: 'Dans un teaser, mes plans de 8 secondes montrent une musicienne qui joue de la guitare. Après 5 secondes environ, ses doigts fusionnent ou se multiplient. Faut-il raccourcir les plans ou décrire le geste autrement ?',
      replies: []
    },
    {
      id: 'sujet-17', kind: 'clinique', status: 'resolved',
      title: 'Les questions de mon quiz sortent du programme',
      author: 'Awa Sarr', tool: 'Gemini', model: '2.5 Pro', domain: 'Éducation',
      at: '2026-10-11T08:20', useful: 17, follows: 9, creation: 'quiz-histoire',
      tags: ['Quiz', 'Révision', 'Sources'],
      body: 'Je prépare un quiz de révision pour mon fils à partir de son cours d’histoire. La moitié des questions portent sur des événements que le cours ne mentionne pas.',
      clinic: {
        prompt: 'Crée un quiz de 10 questions sur la Seconde Guerre mondiale pour un élève de troisième.',
        got: 'Des questions sur des batailles et des dates absentes du cours.',
        expected: 'Des questions fidèles au cours fourni, avec le passage qui contient chaque réponse.'
      },
      replies: [
        {
          id: 'r17-1', author: 'Ibrahima Sow', at: '2026-10-11T09:05', useful: 12, accepted: true, acceptedAt: '2026-10-11T19:30',
          tested: 6, testedWith: [['Gemini', '2.5 Pro'], ['NotebookLM', '']], lastTest: '2026-10-12',
          text: 'Collez le cours dans la demande et exigez que chaque question cite le passage qui contient la réponse. Sans ce texte de référence, l’IA puise dans ce qu’elle sait du sujet.',
          prompt: 'À partir du cours ci-dessous uniquement, crée un quiz de 10 questions pour un élève de troisième. Pour chaque question, cite le passage du cours qui contient la réponse. Aucune question hors de ce texte.'
        },
        { id: 'r17-2', author: 'Claire Dubois', at: '2026-10-11T11:40', useful: 5, text: 'Avec NotebookLM, importez le cours comme source : les citations renvoient au passage exact du cours.' },
        { id: 'r17-3', author: 'Awa Sarr', at: '2026-10-11T19:30', useful: 2, text: 'Avec le cours collé et les passages cités, les dix questions sont dans le programme. Merci.' }
      ]
    }
  ]
};
