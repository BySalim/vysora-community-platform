import type { CasDemo } from '../types.js';

/* Cas Bon réflexe (explorer-data.js pour le cas, apprendre-data.js pour la demande faite à l'IA). */

export const CAS: CasDemo[] = [
  {
    cle: 'cas-1',
    auteur: 'claire-dubois',
    titre: 'Des ventes en hausse ?',
    contexte:
      'Les ventes passent de 120 à 150 commandes. Vous demandez à l’IA de calculer la hausse.',
    demandeIa: 'Mes ventes passent de 120 commandes en août à 150 en septembre. Calcule la hausse.',
    reponseIa: 'Les ventes ont augmenté de 30 % : vous avez gagné 30 commandes.',
    question: 'Que faites-vous ?',
    explication:
      'Le gain est de 30 commandes, mais la hausse est de 25 %. On rapporte la différence à la valeur de départ : (150 − 120) ÷ 120 × 100 = 25 %. Une formulation assurée ne garantit pas un calcul juste.',
    difficulte: 'DEBUTANT',
    domaine: 'Analyse de données',
    duree: 3,
    outil: 'ChatGPT',
    modele: 'GPT-5',
    options: [
      {
        libelle: 'Publier le résultat tel quel',
        correcte: false,
        explication:
          'Le nombre de commandes supplémentaires est juste, mais le pourcentage est faux.',
      },
      {
        libelle: 'Vérifier le calcul à partir de 120',
        correcte: true,
        explication:
          'La valeur de départ est bien la base du calcul : c’est ce qui distingue un écart d’un pourcentage.',
      },
      {
        libelle: 'Demander une phrase plus courte',
        correcte: false,
        explication: 'Raccourcir la phrase ne corrige pas le calcul.',
      },
    ],
    etiquettes: [],
    date: '2026-10-12T10:00',
    utiles: 58,
    reponses: 846,
    repartition: [18, 74, 8],
  },
  {
    cle: 'cas-2',
    auteur: 'lea-martin',
    titre: 'Une référence qui semble sérieuse',
    contexte:
      'Vous préparez un article sur le travail à distance. Vous demandez à l’IA une étude pour étayer votre argument.',
    demandeIa:
      'Trouve-moi une étude récente qui montre que le télétravail améliore la productivité.',
    reponseIa:
      'Selon l’étude Travail distribué et performance, publiée en 2025 par l’Institut européen des usages numériques, le télétravail améliore la productivité de 42 %.',
    question: 'Que faites-vous ?',
    explication:
      'Une référence précise peut être inventée. Retrouvez la publication originale, vérifiez son auteur, sa méthode et la portée du chiffre. Si vous ne la retrouvez pas, ne présentez pas cette affirmation comme établie.',
    difficulte: 'DEBUTANT',
    domaine: 'Texte et rédaction',
    duree: 4,
    outil: 'Gemini',
    modele: '2.5 Pro',
    options: [
      {
        libelle: 'Citer l’étude avec son titre et sa date',
        correcte: false,
        explication: 'Un titre et une date ne prouvent pas que la publication existe.',
      },
      {
        libelle: 'Demander à l’IA si elle est certaine',
        correcte: false,
        explication:
          'L’IA peut confirmer une erreur avec assurance : il faut une source indépendante.',
      },
      {
        libelle: 'Retrouver l’étude et vérifier ses résultats',
        correcte: true,
        explication:
          'Consulter la source permet de vérifier son existence et ce qu’elle affirme réellement.',
      },
    ],
    etiquettes: ['Vérification des sources'],
    date: '2026-10-11T10:00',
    utiles: 51,
    reponses: 1204,
    repartition: [12, 21, 67],
  },
  {
    cle: 'cas-3',
    auteur: 'mariam-diop',
    titre: 'Un script prêt à lancer ?',
    contexte:
      'Vous demandez à l’IA un script pour supprimer les fichiers en double. Elle propose une suppression fondée uniquement sur leur nom.',
    demandeIa: 'Écris un script qui supprime les fichiers en double dans mon dossier Documents.',
    reponseIa:
      'Ce script conserve le premier fichier trouvé et supprime tous ceux qui portent le même nom. Vous pouvez le lancer sur votre dossier Documents.',
    question: 'Que faites-vous ?',
    explication:
      'Deux fichiers qui portent le même nom peuvent avoir des contenus différents. Vérifiez le critère de doublon, demandez un aperçu sans suppression et testez sur une copie avant toute opération sur les originaux.',
    difficulte: 'INTERMEDIAIRE',
    domaine: 'Code et scripts',
    duree: 5,
    outil: 'Claude',
    modele: 'Sonnet 4.5',
    options: [
      {
        libelle: 'Lancer le script sur le dossier Documents',
        correcte: false,
        explication: 'Une suppression fondée sur le nom peut effacer des documents différents.',
      },
      {
        libelle: 'Examiner les actions sur une copie des fichiers',
        correcte: true,
        explication:
          'Un aperçu et une copie permettent de repérer les erreurs avant de toucher aux originaux.',
      },
      {
        libelle: 'Lancer le script avec les droits administrateur',
        correcte: false,
        explication:
          'Des droits supplémentaires aggravent les conséquences possibles sans corriger la logique.',
      },
    ],
    etiquettes: [],
    date: '2026-10-10T10:00',
    utiles: 47,
    reponses: 932,
    repartition: [9, 87, 4],
  },
  {
    cle: 'cas-4',
    auteur: 'moussa-diallo',
    titre: 'L’agent propose de vider le dossier du projet pour « repartir proprement »',
    contexte:
      'Un agent de code ne parvient pas à corriger une erreur de compilation. Il propose de supprimer le dossier du projet, puis de tout régénérer.',
    demandeIa: 'Corrige l’erreur de compilation du projet.',
    reponseIa:
      'Je vais exécuter rm -rf ./ pour repartir sur une base propre, puis recréer les fichiers nécessaires.',
    question: 'Que faites-vous ?',
    explication:
      'Une suppression récursive du dossier courant efface aussi le travail non sauvegardé. Refusez, vérifiez la portée exacte de la commande et assurez-vous qu’une sauvegarde récupérable existe avant toute suppression.',
    difficulte: 'AVANCE',
    domaine: 'Code et scripts',
    duree: 6,
    outil: 'Cursor',
    options: [
      {
        libelle: 'Accepter : la régénération corrigera l’erreur',
        correcte: false,
        explication:
          'Régénérer ne restaure ni l’historique ni les fichiers qui n’ont pas été versionnés.',
      },
      {
        libelle: 'Refuser, vérifier le chemin et sauvegarder avant toute suppression',
        correcte: true,
        explication:
          'Contrôler la portée de la commande et disposer d’une sauvegarde rend l’opération réversible.',
      },
      {
        libelle: 'Accepter seulement si l’agent le confirme',
        correcte: false,
        explication: 'Une confirmation de l’agent ne change rien à la portée de la commande.',
      },
    ],
    etiquettes: [],
    date: '2026-10-09T10:00',
    utiles: 44,
    reponses: 632,
    repartition: [21, 42, 37],
  },
  {
    cle: 'cas-5',
    auteur: 'kofi-mensah',
    titre: 'L’IA affirme qu’une image générée est libre de droits',
    contexte:
      'Vous souhaitez utiliser une image générée pour une campagne commerciale. Vous demandez à l’IA si vous pouvez l’employer librement.',
    demandeIa: 'Puis-je utiliser cette image générée pour ma campagne publicitaire ?',
    reponseIa:
      'Oui, les images générées sont libres de droits : vous pouvez les utiliser comme vous le souhaitez.',
    question: 'Que faites-vous ?',
    explication:
      'Les droits dépendent des conditions d’utilisation de l’outil, de votre abonnement et du contenu de l’image : une marque ou un personnage reconnaissable reste protégé. Une affirmation du modèle ne remplace pas cette vérification.',
    difficulte: 'INTERMEDIAIRE',
    domaine: 'Image et illustration',
    duree: 4,
    outil: 'ChatGPT',
    modele: 'GPT-5',
    options: [
      {
        libelle: 'Utiliser l’image sans autre vérification',
        correcte: false,
        explication:
          'L’affirmation du modèle n’engage ni l’éditeur de l’outil ni les titulaires de droits.',
      },
      {
        libelle: 'Lire les conditions d’utilisation de l’outil et vérifier les éléments protégés',
        correcte: true,
        explication:
          'Les conditions d’utilisation et le contenu de l’image déterminent ce qui est permis.',
      },
      {
        libelle: 'Demander à l’IA une attestation écrite',
        correcte: false,
        explication: 'Une attestation générée n’a aucune valeur juridique.',
      },
    ],
    etiquettes: [],
    date: '2026-10-08T10:00',
    utiles: 39,
    reponses: 957,
    repartition: [24, 58, 18],
  },
  {
    cle: 'cas-6',
    auteur: 'aissatou-ndiaye',
    titre: 'Une case « Je ne suis pas un robot » suffit-elle à bloquer les robots ?',
    contexte:
      'L’IA a ajouté à votre formulaire de contact une case à cocher « Je ne suis pas un robot », sans autre contrôle.',
    demandeIa: 'Protège mon formulaire de contact contre les robots.',
    reponseIa:
      'Le formulaire est maintenant protégé contre les robots grâce à la case de vérification.',
    question: 'Que faites-vous ?',
    explication:
      'Une case cochée côté navigateur se contourne facilement. Vérifiez que le serveur contrôle effectivement chaque envoi : limitation du nombre de requêtes, jeton de vérification ou service anti-robots.',
    difficulte: 'INTERMEDIAIRE',
    domaine: 'Application web',
    duree: 5,
    outil: 'Lovable',
    options: [
      {
        libelle: 'Mettre le formulaire en ligne',
        correcte: false,
        explication: 'Un robot peut cocher la case ou envoyer la requête directement au serveur.',
      },
      {
        libelle: 'Vérifier que le serveur contrôle réellement les envois',
        correcte: true,
        explication: 'Seul un contrôle côté serveur bloque réellement les envois automatisés.',
      },
      {
        libelle: 'Agrandir la case pour la rendre plus visible',
        correcte: false,
        explication: 'La taille de la case n’a aucun effet sur la protection.',
      },
    ],
    etiquettes: [],
    date: '2026-10-07T10:00',
    utiles: 42,
    reponses: 1284,
    repartition: [17, 64, 19],
  },
  {
    cle: 'cas-7',
    auteur: 'julien-moreau',
    titre: 'Le résumé ajoute une conclusion absente du document',
    contexte:
      'Vous demandez le résumé d’un rapport de dix pages. Le résumé se termine par une recommandation que vous ne retrouvez nulle part dans le rapport.',
    demandeIa: 'Résume ce rapport de dix pages pour la réunion de demain.',
    reponseIa:
      'En conclusion, le rapport recommande de doubler le budget de communication dès le prochain trimestre.',
    question: 'Que faites-vous ?',
    explication:
      'Un résumé doit distinguer ce que dit le document de ce que le modèle en déduit. Demandez le passage source de chaque affirmation et retirez celles qui n’en ont pas.',
    difficulte: 'DEBUTANT',
    domaine: 'Texte et rédaction',
    duree: 3,
    outil: 'Claude',
    modele: 'Sonnet 4.5',
    options: [
      {
        libelle: 'Garder la conclusion, elle paraît logique',
        correcte: false,
        explication: 'Une conclusion plausible n’est pas une conclusion du document.',
      },
      {
        libelle: 'Retirer la conclusion et demander les passages sources',
        correcte: true,
        explication: 'Les passages sources permettent de vérifier chaque affirmation du résumé.',
      },
      {
        libelle: 'Demander une conclusion plus courte',
        correcte: false,
        explication: 'Raccourcir la conclusion conserve l’information inventée.',
      },
    ],
    etiquettes: [],
    date: '2026-10-06T10:00',
    utiles: 36,
    reponses: 718,
    repartition: [11, 81, 8],
  },
  {
    cle: 'cas-8',
    auteur: 'ousmane-sy',
    titre: 'Le modèle dit avoir testé son code',
    contexte:
      'Dans une conversation sans outil d’exécution, l’IA vous livre une fonction de calcul de TVA et précise qu’elle l’a testée.',
    demandeIa: 'Écris une fonction qui calcule la TVA d’un montant hors taxes.',
    reponseIa:
      'J’ai testé cette fonction avec plusieurs montants : elle renvoie toujours le bon résultat.',
    question: 'Que faites-vous ?',
    explication:
      'Sans outil d’exécution, le modèle n’a rien pu lancer : il décrit un test qui n’a pas eu lieu. Écrivez vos propres tests, avec les arrondis, les montants nuls et les montants négatifs.',
    difficulte: 'AVANCE',
    domaine: 'Code et scripts',
    duree: 5,
    outil: 'ChatGPT',
    modele: 'GPT-5',
    options: [
      {
        libelle: 'Considérer la fonction comme vérifiée',
        correcte: false,
        explication: 'L’affirmation ne prouve pas qu’un test a été exécuté.',
      },
      {
        libelle: 'Écrire et lancer vos propres tests, y compris les cas limites',
        correcte: true,
        explication:
          'Vos tests, exécutés par vous, sont la seule preuve que la fonction est correcte.',
      },
      {
        libelle: 'Demander à l’IA la liste des tests effectués',
        correcte: false,
        explication: 'Une liste de tests peut être inventée aussi facilement que le résultat.',
      },
    ],
    etiquettes: [],
    date: '2026-10-04T10:00',
    utiles: 31,
    reponses: 488,
    repartition: [8, 46, 46],
  },
];
