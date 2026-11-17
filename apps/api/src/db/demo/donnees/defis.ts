import type { DefiDemo } from '../types.js';

/* Défis des semaines 40 à 42 (classements-data.js), dont les participations sont des créations
   (creations.ts), et le défi « jeu » de la page Défis (S-17), avec ses participations jouables. */

export const DEFIS: DefiDemo[] = [
  {
    // S-17 : le défi « jeu » de la démo validée (prototype/defis-data.js), en cours ; ses trois
    // participations sont jouables (prototype/assets/jeux).
    slug: 'deploy-friday',
    titre: 'Deploy Friday',
    definition:
      '« Deploy Friday » : mettre un site en production le vendredi soir, juste avant le week-end. La hantise des développeurs.',
    enonce:
      'Faites-en un jeu de plateforme ou un runner, jouable dans le navigateur, en un seul prompt. Un héros qui a du caractère, un niveau qui monte en tension, une fin qui se mérite.',
    contraintes:
      '- Un seul prompt : le jeu est publié tel que l’IA l’a livré, sans retouche.\n- Un fichier HTML autonome, jouable dans le navigateur.\n- Ni bibliothèque ni image chargée depuis Internet.',
    cases: [
      { chiffre: '1', intitule: 'seul prompt', precision: 'Sans retouche du jeu obtenu' },
      { chiffre: '1', intitule: 'fichier HTML', precision: 'Jouable dans le navigateur' },
      { chiffre: '0', intitule: 'ressource en ligne', precision: 'Ni bibliothèque ni image' },
      { chiffre: '1', intitule: 'participation', precision: 'Par personne' },
    ],
    criteres: [
      { icone: 'user', libelle: 'Animation du personnage' },
      { icone: 'keyboard', libelle: 'Fluidité des contrôles' },
      { icone: 'smile', libelle: 'Humour' },
      { icone: 'trend-up', libelle: 'Progression du niveau' },
    ],
    criteresCommuns: [
      'Rendu visuel',
      'Sensations de jeu',
      'Rejouabilité',
      'Marche du premier coup',
    ],
    debut: '2026-10-13T00:00',
    fin: '2026-10-19T23:59',
    statut: 'PUBLIE',
    participations: [
      {
        auteur: 'awa-sarr',
        titre: 'Hotfix Hero',
        idee: 'Un runner en pixel art où l’horloge sert de niveau : chaque quart d’heure avant 18 h accélère la course.',
        outil: 'claude',
        modele: 'Sonnet 4.5',
        prompts: [
          'Écris un jeu complet dans un seul fichier HTML (canvas, JavaScript sans bibliothèque, aucune ressource externe). Genre : runner horizontal en pixel art, 960 × 540, mis à l’échelle sans flou. Héroïne : une développeuse à capuche, son ordinateur portable sous le bras ; animation de course en 6 images, saut, glissade, chute. Contrôles : Espace ou flèche haut pour sauter (plus haut si l’on maintient), flèche bas pour glisser ; sur téléphone, toucher la moitié droite de l’écran pour sauter, la moitié gauche pour glisser. Le décor défile en trois plans (open space, fenêtres sur la ville au coucher du soleil, néons du plafond). Obstacles : des bugs qui rampent, des invitations « Réunion rapide (1 h) » qui volent à hauteur de tête, des chaises à roulettes qui glissent vers elle. Les cafés remplissent une jauge ; pleine, elle donne un double saut pendant 5 secondes. Une horloge en haut passe de 17 h 30 à 18 h 00 : c’est la progression du niveau, la vitesse augmente chaque quart d’heure. À 18 h 00, combat final contre « La Prod » : un serveur en feu qui lance des erreurs 500 ; il faut esquiver trois vagues puis sauter sur le bouton « Déployer ». Écran titre, écran de fin avec un message drôle selon la cause de la défaite, meilleur score de la session, touche R pour rejouer. Sons synthétisés avec Web Audio, touche M pour couper.',
        ],
        essais: 1,
        moment:
          'Décrire l’horloge comme la progression du niveau a donné un rythme au jeu sans écrire de niveaux à la main.',
        jeu: 'hotfix-hero',
        publication: '2026-10-13T08:14',
        utiles: 14,
      },
      {
        auteur: 'kofi-mensah',
        titre: 'L’ascenseur est en panne',
        idee: 'Douze étages à gravir en rebondissant de bureau en bureau, avec une blague de développeur à chaque palier.',
        outil: 'chatgpt',
        modele: 'GPT-5',
        prompts: [
          'Crée un jeu HTML jouable dans le navigateur, tout dans un seul fichier, sans images externes. C’est vendredi, 17 h 45, l’ascenseur est en panne et la salle des serveurs est au 12e étage : mon personnage, un développeur en sweat bleu, doit monter en sautant de bureau en bureau. Il rebondit tout seul ; on le dirige à gauche et à droite avec les flèches, ou en touchant les côtés de l’écran sur téléphone. Chaque étage a ses pièges : des tickets qui tombent du plafond, des collègues qui veulent « juste deux minutes » et le retiennent, des plantes vertes glissantes. Les tasses de café donnent un super saut. Affiche l’étage, l’heure qui avance, et à chaque nouvel étage un panneau avec une blague de développeur. Au 12e, le patron arrive : « Finalement, on déploie lundi ? » ; il faut l’esquiver trois fois pour atteindre la console de déploiement. Style dessin plat, couleurs douces, animations souples (il s’étire et s’écrase au rebond). Écran de victoire avec le temps total.',
        ],
        essais: 3,
        moment:
          'Sur trois essais, le premier ne gérait pas le toucher et le deuxième plantait au 12e étage : j’ai gardé le troisième, sans y toucher.',
        jeu: 'ascenseur-en-panne',
        publication: '2026-10-13T10:40',
        utiles: 11,
      },
      {
        auteur: 'moussa-diallo',
        titre: 'git push vendredi',
        idee: 'Un jeu à un seul bouton, tout en caractères : le pipeline de déploiement devient le niveau.',
        outil: 'gemini',
        modele: '2.5 Pro',
        prompts: [
          'Un seul fichier HTML. Jeu à un bouton dans l’esthétique d’un terminal : fond noir, texte vert et ambre, police monospace, tout est dessiné avec des caractères. Le joueur est un curseur ▌ qui court sur la ligne de commande d’un pipeline de déploiement : build → tests → staging → prod. Chaque étape est un niveau plus rapide que le précédent. Appui court : petit saut ; appui long : grand saut (Espace, clic ou toucher). Obstacles : BUG, TODO, MEETING 15:30, npm WARN. Ramasser ☕ donne un bouclier qui absorbe un choc. En prod, boss final : un bloc HTTP 500 qui tire des lignes de log rouges ; survivre 20 secondes pour afficher « Deployed. Bon week-end. » Barre de progression du pipeline en haut, scanlines discrètes, sons de clavier.',
        ],
        essais: 1,
        jeu: 'pipeline',
        publication: '2026-10-13T13:05',
        utiles: 9,
      },
    ],
  },
  {
    slug: 'une-affiche-touristique-en-trois-echanges',
    titre: 'Une affiche touristique en trois échanges',
    enonce:
      'Créez l’affiche touristique d’un lieu que vous aimez, en trois échanges au plus avec l’IA. Publiez l’affiche avec les prompts utilisés : la communauté vote pour les méthodes qui lui sont utiles.',
    contraintes:
      '- Trois échanges au maximum avec l’IA\n- Un texte lisible et sans faute sur l’affiche\n- Un lieu réel, photographié ou décrit',
    debut: '2026-10-12T00:00',
    fin: '2026-10-19T23:59',
    statut: 'PUBLIE',
  },
  {
    slug: 'un-logo-lisible-en-petit-format',
    titre: 'Un logo lisible en petit format',
    enonce:
      'Créez le logo d’une entreprise de votre quartier, lisible même en très petit format. Publiez le logo et le chemin parcouru, du premier essai à la version retenue.',
    contraintes:
      '- Lisible à 32 pixels\n- Deux couleurs au maximum\n- Le nom exact de l’entreprise',
    debut: '2026-10-05T00:00',
    fin: '2026-10-11T23:59',
    statut: 'CLOTURE',
  },
  {
    slug: 'un-script-qui-ne-supprime-rien',
    titre: 'Un script qui ne supprime rien',
    enonce:
      'Faites écrire par l’IA un script qui range, renomme ou nettoie des fichiers sans jamais rien supprimer. Publiez le script, le prompt complet et la façon dont vous l’avez vérifié.',
    contraintes:
      '- Un mode simulation avant toute action\n- Aucune suppression définitive\n- Le prompt complet publié avec le script',
    debut: '2026-09-28T00:00',
    fin: '2026-10-04T23:59',
    statut: 'CLOTURE',
  },
];
