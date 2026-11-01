/* Contenus éditoriaux d’Apprendre (bases, notions, règles, astuces, journal), rédigés par l’équipe
   Vysora : repris tels quels de prototype/apprendre-data.js (APP-02). Ils seront administrés avec
   ADM-01 ; d’ici là, une correction se fait dans ce fichier. Les cas Bon réflexe viennent de l’API. */

import type { DonneesApprendre } from './types';

export const APPRENDRE: DonneesApprendre = {
  updated: '2026-10-13',
  rubriques: [
    {
      id: 'bases',
      label: 'Bases',
      one: 'Base',
      icon: 'layers',
      title: 'Les bases',
      lead: 'Huit essentiels pour bien démarrer, à lire dans l’ordre. Comptez une vingtaine de minutes en tout.',
    },
    {
      id: 'notions',
      label: 'Notions',
      one: 'Notion',
      icon: 'book',
      title: 'Les notions',
      lead: 'Les mots que vous croiserez en créant avec l’IA, et sur les fiches de la communauté, expliqués simplement.',
    },
    {
      id: 'regles',
      label: 'Règles',
      one: 'Règle',
      icon: 'shield',
      title: 'Les règles',
      lead: 'Les pratiques qui évitent les erreurs coûteuses. Chacune se vérifie par un cas Bon réflexe ou une question.',
    },
    {
      id: 'astuces',
      label: 'Astuces',
      one: 'Astuce',
      icon: 'bulb',
      title: 'Les astuces',
      lead: 'Les réglages et formulations qui fonctionnent, outil par outil. Chaque astuce indique la version avec laquelle elle a été vérifiée.',
    },
    {
      id: 'bon-reflexe',
      label: 'Bon réflexe',
      one: 'Cas Bon réflexe',
      icon: 'scale',
      title: 'Bon réflexe',
      lead: 'Une vraie réponse d’IA, une décision à prendre. Jugez, puis découvrez l’analyse et ce qu’a répondu la communauté.',
    },
  ],
  themes: [
    {
      id: 'verifier',
      label: 'Vérifier ce que l’IA affirme',
    },
    {
      id: 'agir',
      label: 'Laisser agir l’IA sans risque',
    },
    {
      id: 'proteger',
      label: 'Protéger les personnes',
    },
  ],
  savoirs: [
    {
      id: 'outil-et-modele',
      kind: 'bases',
      order: 1,
      minutes: 2,
      updated: '2026-09-22',
      title: 'Un outil, un modèle : la différence qui compte',
      short:
        'L’outil est l’application que vous ouvrez ; le modèle est le moteur qui produit la réponse. Une même méthode peut réussir avec un modèle et échouer avec un autre.',
      body: [
        {
          h: 'Ce qu’il faut retenir',
          p: [
            'ChatGPT est un outil ; GPT-5 est l’un de ses modèles. Claude, Gemini ou Le Chat proposent eux aussi plusieurs modèles, et chacun change de version au fil des mois.',
            'Quand une astuce fonctionne chez quelqu’un et pas chez vous, comparez d’abord le modèle et sa version. C’est souvent là que se trouve l’écart.',
          ],
        },
        {
          h: 'Sur Vysora',
          p: [
            'Chaque création indique l’outil, le modèle et la date du dernier essai réussi. Les astuces de cette page précisent la version avec laquelle l’équipe les a vérifiées.',
          ],
        },
      ],
      check: {
        q: 'Une astuce fonctionne pour une collègue sur ChatGPT, mais pas pour vous, sur ChatGPT également. Que comparez-vous d’abord ?',
        choices: [
          'La longueur de vos prompts',
          'Le modèle et sa version',
          'Votre connexion internet',
        ],
        correct: 1,
        why: 'Un même outil propose plusieurs modèles, et chacun réagit différemment à une même demande.',
      },
      related: ['modele', 'reponses-differentes'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'demande-claire',
      kind: 'bases',
      order: 2,
      minutes: 3,
      updated: '2026-10-02',
      title: 'Une demande claire : l’objectif, le contexte, les limites',
      short:
        'Dites ce que vous voulez obtenir, à partir de quoi et sous quelle forme. Ce que vous ne précisez pas, l’IA le suppose.',
      prompt: {
        before: 'Écris une lettre de motivation pour un poste de chef de projet.',
        after:
          'Rédige une lettre de 180 mots pour un poste de chef de projet associatif. Appuie-toi sur deux expériences : coordonner 12 bénévoles et organiser 3 ateliers. Garde un ton sobre. N’ajoute aucune expérience.',
        notes: [
          ['180 mots', 'Format'],
          ['chef de projet associatif', 'Objectif'],
          ['coordonner 12 bénévoles et organiser 3 ateliers', 'Contexte'],
          ['N’ajoute aucune expérience', 'Limite'],
        ],
      },
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Une demande vague obtient une réponse moyenne : la plus probable, donc la plus banale. Chaque précision réduit la part de suppositions.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Commencez par l’objectif : le résultat attendu et sa forme (longueur, format, public).',
            'Ajoutez le contexte que l’IA ne peut pas deviner : vos faits, vos contraintes, un exemple.',
            'Fixez les limites : ce qu’elle ne doit pas inventer, ajouter ou modifier.',
          ],
        },
      ],
      check: {
        q: 'Quel ajout rend la demande « Résume ce rapport » la plus fiable ?',
        choices: [
          '« Sois précis et rigoureux »',
          '« En cinq points, pour le conseil d’administration, sans chiffre absent du rapport »',
          '« Fais de ton mieux »',
        ],
        correct: 1,
        why: 'Elle fixe la forme (cinq points), le public (le conseil) et une limite vérifiable (aucun chiffre ajouté).',
      },
      related: ['prompt', 'contexte', 'ce-que-ia-ignore'],
      links: {
        guide: 'textes',
        domain: 'Texte et rédaction',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-10-02', 'Exemple ajouté : les réponses aux avis clients d’un restaurant'],
      ],
    },
    {
      id: 'reponses-differentes',
      kind: 'bases',
      order: 3,
      minutes: 2,
      updated: '2026-09-22',
      title: 'Pourquoi le même prompt donne deux réponses différentes',
      short:
        'Une IA générative compose chaque réponse parmi de nombreuses possibilités. Relancer la même demande donne un autre résultat, et c’est une ressource.',
      body: [
        {
          h: 'Ce qu’il faut retenir',
          p: [
            'Le modèle ne recopie pas une réponse enregistrée : il la compose à chaque fois. Deux essais avec le même prompt diffèrent donc, parfois beaucoup.',
            'Pour juger une demande, relancez-la deux ou trois fois et gardez ce qui revient : c’est la part la plus solide de la réponse.',
          ],
        },
        {
          h: 'Quand il faut un résultat stable',
          p: [
            'Pour une série d’images ou un ton constant, fixez ce qui peut l’être : une graine, une image de référence, un exemple de texte.',
          ],
        },
      ],
      check: {
        q: 'Vous relancez trois fois le même prompt et obtenez trois logos différents. Que faites-vous ?',
        choices: [
          'Vous concluez que le prompt est mauvais',
          'Vous gardez ce qui revient dans les trois essais et précisez le reste',
          'Vous changez d’outil',
        ],
        correct: 1,
        why: 'La variation est normale. Ce qui revient d’un essai à l’autre montre ce que votre prompt fixe déjà ; le reste est à préciser.',
      },
      related: ['graine', 'temperature', 'astuce-sref'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'ce-que-ia-ignore',
      kind: 'bases',
      order: 4,
      minutes: 2,
      updated: '2026-09-29',
      title: 'Ce que l’IA ne sait pas de vous',
      short:
        'L’IA ignore votre projet, votre public et vos fichiers, sauf ce que vous lui donnez. Elle comble les vides par des suppositions plausibles.',
      body: [
        {
          h: 'Pourquoi c’est important',
          p: [
            'Une lettre sans faits devient une suite de formules. Une traduction sans glossaire choisit des mots justes en général, mais faux pour votre métier.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Avant d’écrire votre demande, listez ce qu’une personne extérieure devrait savoir pour bien faire le travail.',
            'Joignez les documents utiles plutôt que de les résumer de mémoire.',
            'Dites qui lira le résultat : un client, un jury, une équipe.',
          ],
        },
      ],
      related: ['contexte', 'demande-claire', 'astuce-glossaire'],
      links: {
        guide: 'textes',
        domain: 'Texte et rédaction',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-09-29', 'Exemple ajouté : une traduction corrigée par un glossaire'],
      ],
    },
    {
      id: 'une-chose-a-la-fois',
      kind: 'bases',
      order: 5,
      minutes: 2,
      updated: '2026-09-22',
      title: 'Corriger une seule chose à la fois',
      short:
        'Quand le résultat ne convient pas, modifiez un seul élément de votre demande, puis comparez. Vous saurez ce qui a fait la différence.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Si vous changez le style, la lumière et le cadrage en même temps, vous ne saurez pas lequel a compté. Au projet suivant, vous repartirez de zéro.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Gardez la version précédente sous les yeux.',
            'Changez un seul élément : un mot, un paramètre, une contrainte.',
            'Comparez, puis notez ce que la modification a produit.',
          ],
        },
      ],
      related: ['iteration', 'noter-moments-cles', 'graine'],
      links: {
        guide: 'serie-images',
        domain: 'Image et illustration',
      },
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'verifier-avant-reprendre',
      kind: 'bases',
      order: 6,
      minutes: 3,
      updated: '2026-10-06',
      title: 'Une réponse bien écrite n’est pas une réponse juste',
      short:
        'L’IA écrit avec la même assurance quand elle a raison et quand elle se trompe. Chiffres, sources, noms et code se vérifient avant d’être repris.',
      body: [
        {
          h: 'Ce qu’il faut retenir',
          p: [
            'Le ton d’une réponse ne dit rien de sa justesse. Un pourcentage faux, une étude qui n’existe pas ou une fonction mal nommée sont présentés avec la même clarté qu’un fait établi.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Repérez ce qui aurait des conséquences si c’était faux : un chiffre publié, un nom cité, un script exécuté.',
            'Vérifiez-le à la source : vos données, le document d’origine, un test sur une copie.',
            'Plus l’enjeu est élevé, plus la vérification doit être complète.',
          ],
        },
      ],
      related: ['hallucination', 'recalculer-chiffre', 'retrouver-source'],
      links: {
        guide: 'donnees',
        domain: 'Analyse de données',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-10-06', 'Exemple ajouté : des remboursements comptés deux fois'],
      ],
    },
    {
      id: 'garder-la-main',
      kind: 'bases',
      order: 7,
      minutes: 2,
      updated: '2026-10-01',
      title: 'Garder la main sur ce que l’IA envoie ou supprime',
      short:
        'Quand l’IA agit à votre place (envoyer, modifier, supprimer), prévoyez une étape où vous validez avant l’action.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Une erreur dans un texte se corrige ; un e-mail parti ou un fichier supprimé, rarement. Plus l’IA agit seule, plus cette étape compte.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Commencez par un aperçu : ce que l’IA ferait, sans le faire.',
            'Gardez une validation humaine avant tout envoi ou toute suppression.',
            'Rangez les cas douteux à part plutôt que de les laisser passer.',
          ],
        },
      ],
      related: ['agent', 'simulation-dabord', 'valider-avant-envoi'],
      links: {
        guide: 'automatiser',
        domain: 'Automatisation',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-10-01', 'Exemple ajouté : des relances de devis validées avant l’envoi'],
      ],
    },
    {
      id: 'noter-moments-cles',
      kind: 'bases',
      order: 8,
      minutes: 2,
      updated: '2026-09-22',
      title: 'Noter ses moments clés',
      short:
        'Un moment clé, c’est l’endroit où vous avez corrigé, refusé ou réorienté l’IA. Le noter, c’est garder ce que vous avez appris.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Le résultat final ne montre pas les erreurs évitées. Ce sont elles qui intéressent ceux qui veulent refaire la même chose, et vous-même au projet suivant.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Pendant que vous créez, notez chaque correction en une phrase : ce qui n’allait pas, ce que vous avez changé.',
            'Indiquez l’outil et la version utilisés à ce moment-là.',
            'En publiant votre création sur Vysora, marquez ces passages comme moments clés.',
          ],
        },
      ],
      related: ['moment-cle', 'reproduction'],
      links: {
        publish: true,
      },
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'agent',
      kind: 'notions',
      minutes: 1,
      updated: '2026-10-08',
      title: 'Agent',
      short:
        'Une IA qui enchaîne elle-même des actions (lire, modifier, exécuter des fichiers) pour atteindre un objectif, au lieu de seulement répondre.',
      body: [
        {
          p: [
            'Cursor, Claude Code ou Codex peuvent travailler en agent : ils ouvrent vos fichiers, les modifient et lancent des commandes. C’est ce qui les rend efficaces, et c’est pourquoi leur périmètre se règle avec soin.',
          ],
        },
      ],
      tools: ['Cursor', 'Claude Code', 'Codex'],
      related: ['perimetre-agent', 'garder-la-main', 'astuce-cursor-fichiers'],
      links: {
        domain: 'Code et scripts',
      },
      history: [['2026-10-08', 'Publication']],
    },
    {
      id: 'biais',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-24',
      title: 'Biais',
      short:
        'Tendance d’un modèle à reproduire les stéréotypes présents dans les données qui l’ont formé : métiers, visages, prénoms, accents.',
      body: [
        {
          p: [
            'Demandez « un médecin » et vous obtiendrez souvent le même profil. Décrivez les personnes que vous voulez voir plutôt que de laisser le modèle choisir à votre place.',
          ],
        },
      ],
      related: ['image-reference', 'droits-images'],
      history: [['2026-09-24', 'Publication']],
    },
    {
      id: 'contexte',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Contexte',
      short:
        'Tout ce que l’IA a sous les yeux quand elle répond : votre demande, les échanges précédents et les documents joints.',
      body: [
        {
          p: [
            'Ce qui n’est pas dans le contexte n’existe pas pour le modèle. Un détail donné il y a vingt messages peut déjà en être sorti : c’est la limite de la fenêtre de contexte.',
          ],
        },
      ],
      related: ['fenetre-contexte', 'ce-que-ia-ignore', 'demande-claire'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'donnee-personnelle',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-27',
      title: 'Donnée personnelle',
      short:
        'Toute information qui permet d’identifier une personne, directement ou non : nom, téléphone, adresse e-mail, motif de consultation.',
      body: [
        {
          p: [
            'Ce que vous collez dans un outil d’IA peut être conservé par son éditeur. Retirez ou remplacez les données personnelles avant de partager un document.',
          ],
        },
      ],
      related: ['minimiser-donnees'],
      history: [['2026-09-27', 'Publication']],
    },
    {
      id: 'exemple-demande',
      kind: 'notions',
      minutes: 1,
      updated: '2026-10-02',
      title: 'Exemple dans la demande',
      short:
        'Un ou plusieurs exemples du résultat attendu, joints à la demande pour que l’IA en reprenne la forme et le ton.',
      body: [
        {
          p: [
            'Deux exemples de réponses à des avis clients en disent plus qu’une description du ton souhaité. Choisissez-les différents, pour que l’IA ne recopie pas un seul modèle.',
          ],
        },
      ],
      related: ['demande-claire', 'astuce-detail-avis'],
      history: [['2026-10-02', 'Publication']],
    },
    {
      id: 'fenetre-contexte',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Fenêtre de contexte',
      short:
        'La quantité de texte qu’un modèle peut prendre en compte à la fois. Au-delà, les premiers éléments sont oubliés ou résumés.',
      body: [
        {
          p: [
            'Dans une très longue conversation, les consignes du début perdent de leur poids. Rappelez-les, ou ouvrez une nouvelle conversation avec un résumé de ce qui compte.',
          ],
        },
      ],
      related: ['contexte', 'jeton'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'graine',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Graine',
      short:
        'Nombre qui fixe le point de départ d’une génération d’image. Même graine, même prompt et même modèle donnent un résultat très proche.',
      body: [
        {
          p: [
            'Dans Midjourney, le paramètre --seed la fixe ; d’autres outils l’affichent dans leurs réglages avancés. Elle permet de mesurer l’effet d’un seul changement de prompt.',
          ],
        },
      ],
      tools: ['Midjourney', 'Stable Diffusion', 'Flux'],
      related: ['reponses-differentes', 'une-chose-a-la-fois', 'image-reference'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'hallucination',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-29',
      title: 'Hallucination',
      short:
        'Affirmation fausse présentée comme vraie : une étude inventée, un chiffre erroné, une fonction de code qui n’existe pas.',
      body: [
        {
          p: [
            'Le modèle produit un texte plausible, pas un texte vérifié. Plus la question est précise et peu documentée, plus le risque augmente.',
          ],
        },
      ],
      related: ['retrouver-source', 'verifier-avant-reprendre', 'resume-fidele'],
      history: [
        ['2026-09-22', 'Publication'],
        [
          '2026-09-29',
          'Exemple ajouté : un résumé qui attribue une décision à la mauvaise personne',
        ],
      ],
    },
    {
      id: 'image-reference',
      kind: 'notions',
      minutes: 1,
      updated: '2026-10-02',
      title: 'Image de référence',
      short:
        'Image jointe à la demande pour guider la composition, le style ou l’apparence d’un personnage.',
      body: [
        {
          p: [
            'Une image de référence fixe ce que les mots décrivent mal : un angle de vue, une palette, un visage. Elle est indispensable pour une série cohérente.',
          ],
        },
      ],
      tools: ['Midjourney', 'Flux', 'Ideogram'],
      related: ['astuce-reference-angle', 'astuce-sref', 'graine'],
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-10-02', 'Exemple ajouté : une série d’icônes 3D'],
      ],
    },
    {
      id: 'instructions-personnalisees',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-25',
      title: 'Instructions personnalisées',
      short:
        'Consignes permanentes données à un outil et appliquées à toutes vos demandes : votre métier, votre ton, ce qu’il doit éviter.',
      body: [
        {
          p: [
            'Dans ChatGPT, Claude ou Le Chat, elles évitent de répéter le même contexte à chaque conversation. Relisez-les de temps en temps : une consigne oubliée explique parfois une réponse inattendue.',
          ],
        },
      ],
      tools: ['ChatGPT', 'Claude', 'Le Chat'],
      related: ['contexte'],
      history: [['2026-09-25', 'Publication']],
    },
    {
      id: 'iteration',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Itération',
      short:
        'Améliorer un résultat par échanges successifs avec l’IA, en corrigeant un point à chaque tour.',
      body: [
        {
          p: [
            'Sur Vysora, une création de type « Itération » montre ces échanges et les moments où le créateur a réorienté l’IA.',
          ],
        },
      ],
      related: ['une-chose-a-la-fois', 'moment-cle'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'jeton',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Jeton',
      short:
        'Unité de texte que compte un modèle, souvent un morceau de mot. Les limites de longueur et les tarifs se calculent en jetons.',
      body: [
        {
          p: [
            'En français, un mot compte en moyenne un peu plus d’un jeton : une limite de 8 000 jetons représente environ 5 500 mots.',
          ],
        },
      ],
      related: ['fenetre-contexte'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'modele',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Modèle',
      short:
        'Le moteur qui produit les réponses d’un outil d’IA : GPT-5, Claude Sonnet 4.5, Midjourney v7. Chaque version se comporte un peu différemment.',
      body: [
        {
          p: [
            'Un outil peut proposer plusieurs modèles et en changer d’une mise à jour à l’autre. C’est pourquoi une astuce se date avec la version utilisée.',
          ],
        },
      ],
      related: ['outil-et-modele'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'mode-simulation',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-30',
      title: 'Mode simulation',
      short: 'Exécution d’un script qui affiche ce qu’il ferait, sans rien modifier.',
      body: [
        {
          p: [
            'On parle aussi d’essai à blanc. C’est la première chose à demander pour tout script qui renomme, déplace ou supprime des fichiers.',
          ],
        },
      ],
      related: ['simulation-dabord', 'garder-la-main'],
      history: [['2026-09-30', 'Publication']],
    },
    {
      id: 'moment-cle',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Moment clé',
      short:
        'Point du chemin parcouru où le créateur a corrigé, refusé ou réorienté l’IA. C’est ce qui rend une création instructive.',
      body: [
        {
          p: [
            'Les moments clés publiés par la communauté sont la matière première des savoirs de cette page : quand une même correction revient dans plusieurs créations, l’équipe en fait une règle ou une astuce.',
          ],
        },
      ],
      related: ['noter-moments-cles', 'iteration'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'prompt',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Prompt',
      short:
        'La demande écrite à l’IA. Il peut réunir une consigne, du contexte, des exemples et des limites.',
      body: [
        {
          p: [
            'Un prompt n’a pas besoin d’être long : il a besoin de dire ce que l’IA ne peut pas deviner.',
          ],
        },
      ],
      related: ['demande-claire', 'exemple-demande'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'prompt-negatif',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Prompt négatif',
      short:
        'Liste de ce que l’image ne doit pas contenir, dans les outils qui le permettent, comme Stable Diffusion.',
      body: [
        {
          p: [
            'Dans Midjourney, le paramètre --no joue le même rôle. Nommez des éléments concrets (« texte, filigrane ») plutôt que des qualités (« laid »).',
          ],
        },
      ],
      tools: ['Stable Diffusion', 'Midjourney'],
      related: ['prompt'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'reproduction',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Reproduction',
      short:
        'Refaire une création publiée avec vos propres outils, en suivant le chemin parcouru par son auteur, puis déclarer le résultat.',
      body: [
        {
          p: [
            'Le taux de réussite des reproductions indique si une méthode tient avec d’autres outils et d’autres mains.',
          ],
        },
      ],
      related: ['outil-et-modele', 'moment-cle'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'temperature',
      kind: 'notions',
      minutes: 1,
      updated: '2026-09-22',
      title: 'Température',
      short:
        'Réglage qui rend les réponses plus prévisibles (valeur basse) ou plus variées (valeur haute), quand l’outil le propose.',
      body: [
        {
          p: [
            'Les applications grand public la fixent pour vous. On la règle dans les espaces pour développeurs, comme Google AI Studio.',
          ],
        },
      ],
      tools: ['Google AI Studio'],
      related: ['reponses-differentes'],
      history: [['2026-09-22', 'Publication']],
    },
    {
      id: 'recalculer-chiffre',
      kind: 'regles',
      theme: 'verifier',
      minutes: 3,
      updated: '2026-10-06',
      situation: 'cas-1',
      title: 'Recalculer un chiffre avant de le publier',
      short:
        'Un pourcentage ou un total produit par l’IA se refait à partir des données de départ, ou se vérifie en demandant le détail du calcul.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'L’IA confond facilement un écart et un pourcentage, une moyenne et une médiane, un mois complet et un mois en cours. L’erreur passe inaperçue parce que la phrase est bien construite.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Demandez le calcul détaillé, étape par étape, avec les valeurs utilisées.',
            'Refaites le calcul principal vous-même, ou dans un tableur.',
            'Vérifiez que les périodes et les catégories comparées sont équivalentes.',
          ],
        },
      ],
      related: ['verifier-avant-reprendre', 'hallucination', 'astuce-ordre-mois'],
      links: {
        guide: 'donnees',
        domain: 'Analyse de données',
      },
      history: [
        ['2026-09-22', 'Publication'],
        [
          '2026-10-06',
          'Exemple ajouté : des remboursements comptés deux fois dans un tableau de bord',
        ],
      ],
    },
    {
      id: 'retrouver-source',
      kind: 'regles',
      theme: 'verifier',
      minutes: 3,
      updated: '2026-09-29',
      situation: 'cas-2',
      title: 'Retrouver une source avant de la citer',
      short:
        'Une référence précise (titre, date, auteur) peut être inventée. Retrouvez la publication et ce qu’elle affirme avant de la reprendre.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Le modèle reconstitue des références plausibles à partir de ce qu’il a lu. Le titre semble réel, l’institut aussi, mais l’étude n’existe pas toujours.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Cherchez la publication par son titre exact dans un moteur de recherche ou une base documentaire.',
            'Lisez le passage cité : il dit parfois autre chose que le résumé de l’IA.',
            'Sans source retrouvée, présentez l’affirmation comme une hypothèse, ou retirez-la.',
          ],
        },
      ],
      related: ['hallucination', 'astuce-notebooklm-pages', 'resume-fidele'],
      links: {
        guide: 'reviser',
        domain: 'Éducation',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-09-29', 'Exemple ajouté : un quiz comparé au passage source'],
      ],
    },
    {
      id: 'tests-du-modele',
      kind: 'regles',
      theme: 'verifier',
      minutes: 3,
      updated: '2026-10-13',
      situation: 'cas-8',
      title: 'Lancer soi-même les tests qu’un modèle dit avoir passés',
      short:
        'Un modèle peut écrire « J’ai testé, tout fonctionne » sans avoir rien exécuté. Seuls les tests que vous lancez comptent.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Un assistant sans accès à votre environnement ne peut pas exécuter votre code. Même un agent qui en a les moyens peut résumer des tests qu’il n’a pas tous lancés.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Demandez les tests eux-mêmes, pas leur compte rendu.',
            'Lancez-les dans votre environnement et lisez le résultat.',
            'Ajoutez un test pour chaque cas limite que vous connaissez : liste vide, donnée manquante, doublon.',
          ],
        },
      ],
      related: ['agent', 'perimetre-agent', 'verifier-avant-reprendre'],
      links: {
        guide: 'scripts',
        domain: 'Code et scripts',
      },
      history: [['2026-10-13', 'Publication']],
    },
    {
      id: 'resume-fidele',
      kind: 'regles',
      theme: 'verifier',
      minutes: 2,
      updated: '2026-10-04',
      situation: 'cas-7',
      title: 'Comparer un résumé au document d’origine',
      short:
        'Un résumé peut ajouter une conclusion, déplacer une décision ou arrondir un chiffre. Relisez-le face au document avant de le diffuser.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Pour rendre un résumé fluide, le modèle comble les transitions. Il lui arrive d’y glisser une conclusion que le document ne contient pas, ou d’attribuer une décision à la mauvaise personne.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Demandez que chaque point du résumé renvoie au passage d’origine.',
            'Vérifiez en priorité les chiffres, les noms et les décisions.',
            'Retirez tout ce que vous ne retrouvez pas dans le document.',
          ],
        },
      ],
      related: ['hallucination', 'retrouver-source'],
      links: {
        guide: 'automatiser',
        domain: 'Automatisation',
      },
      history: [
        ['2026-09-24', 'Publication'],
        ['2026-10-04', 'Comment faire : renvoi au passage d’origine ajouté'],
      ],
    },
    {
      id: 'simulation-dabord',
      kind: 'regles',
      theme: 'agir',
      minutes: 3,
      updated: '2026-09-30',
      situation: 'cas-3',
      title: 'Lancer un script en simulation d’abord',
      short:
        'Tout script qui renomme, déplace ou supprime des fichiers s’exécute d’abord en mode simulation, puis sur une copie.',
      prompt: {
        before: 'Écris un script qui supprime les doublons dans mon dossier Documents.',
        after:
          'Écris un script Python qui repère les fichiers en double dans Documents en comparant leur contenu. Ajoute un mode simulation qui affiche chaque fichier concerné sans rien supprimer. Ne supprime rien sans ma confirmation.',
        notes: [
          ['en comparant leur contenu', 'Critère'],
          ['mode simulation', 'Aperçu'],
          ['Ne supprime rien sans ma confirmation', 'Limite'],
        ],
      },
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Un critère trop large (le nom d’un fichier, une extension) peut viser bien plus de fichiers que prévu. La simulation montre l’effet avant qu’il soit trop tard.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Demandez un mode simulation qui affiche chaque action prévue.',
            'Lisez la liste en entier, en particulier les fichiers que vous ne vous attendiez pas à voir.',
            'Lancez ensuite le script sur une copie du dossier, avec une sauvegarde.',
          ],
        },
      ],
      related: ['mode-simulation', 'garder-la-main', 'perimetre-agent'],
      links: {
        guide: 'scripts',
        domain: 'Code et scripts',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-09-30', 'Exemple de prompt ajouté'],
      ],
    },
    {
      id: 'perimetre-agent',
      kind: 'regles',
      theme: 'agir',
      minutes: 3,
      updated: '2026-10-08',
      situation: 'cas-4',
      title: 'Limiter ce qu’un agent peut modifier',
      short:
        'Avant de confier une tâche à un agent, dites quels fichiers il peut toucher et lesquels il doit laisser, puis relisez chaque modification.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Pour corriger un bouton, un agent peut en profiter pour réorganiser trois autres fichiers. Plus son périmètre est flou, plus la relecture devient longue.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Nommez les fichiers ou dossiers concernés, et excluez le reste.',
            'Refusez toute commande destructive (suppression, réinitialisation) sans votre accord.',
            'Relisez les modifications fichier par fichier avant de les accepter.',
          ],
        },
      ],
      related: ['agent', 'astuce-cursor-fichiers', 'simulation-dabord'],
      links: {
        guide: 'scripts',
        domain: 'Code et scripts',
      },
      history: [
        ['2026-09-26', 'Publication'],
        ['2026-10-08', 'Lien ajouté vers la notion Agent'],
      ],
    },
    {
      id: 'valider-avant-envoi',
      kind: 'regles',
      theme: 'agir',
      minutes: 2,
      updated: '2026-10-01',
      title: 'Valider un message avant qu’il parte',
      short:
        'Une automatisation qui écrit à vos clients garde une étape de relecture, au moins jusqu’à ce que ses résultats aient fait leurs preuves.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Une relance au mauvais client, ou un montant erroné, ne se rattrape pas. Les premières semaines révèlent les cas que vous n’aviez pas prévus.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Faites préparer les messages en brouillon plutôt que de les envoyer.',
            'Relisez chaque brouillon, puis validez l’envoi.',
            'Quand les brouillons sont justes semaine après semaine, réservez la relecture aux cas sensibles.',
          ],
        },
      ],
      check: {
        q: 'Votre automatisation rédige des relances de devis. Comment la mettez-vous en route ?',
        choices: [
          'Envoi automatique dès le premier jour',
          'Brouillons relus et validés avant l’envoi',
          'Envoi automatique, avec une copie pour vous',
        ],
        correct: 1,
        why: 'La copie vous informe après coup ; le brouillon vous laisse corriger avant que le client ne reçoive le message.',
      },
      related: ['garder-la-main', 'astuce-n8n-a-verifier'],
      links: {
        guide: 'automatiser',
        domain: 'Automatisation',
      },
      history: [
        ['2026-09-22', 'Publication'],
        ['2026-10-01', 'Exemple ajouté : des relances de devis'],
      ],
    },
    {
      id: 'minimiser-donnees',
      kind: 'regles',
      theme: 'proteger',
      minutes: 3,
      updated: '2026-09-27',
      title: 'Collecter le moins de données personnelles possible',
      short:
        'Une application générée par l’IA demande souvent plus d’informations qu’il n’en faut, et les range parfois au mauvais endroit. Ne gardez que le nécessaire.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Chaque donnée conservée doit être protégée, et certaines (santé, motif de consultation) exigent un consentement explicite. L’IA ne connaît pas ces obligations à votre place.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Listez les informations vraiment nécessaires au service.',
            'Demandez où et comment chaque donnée est stockée : jamais en clair dans le navigateur.',
            'Pour toute donnée sensible, prévoyez un consentement explicite, ou ne la collectez pas.',
          ],
        },
      ],
      check: {
        q: 'L’IA propose d’ajouter au formulaire de rendez-vous un champ « Motif de la consultation ». Que faites-vous ?',
        choices: [
          'Vous l’acceptez : c’est utile au praticien',
          'Vous le retirez, ou le rendez facultatif avec un consentement explicite',
          'Vous le gardez, mais masqué à l’écran',
        ],
        correct: 1,
        why: 'Le motif de consultation est une donnée de santé : il ne se collecte que s’il est nécessaire, et avec un consentement explicite.',
      },
      related: ['donnee-personnelle', 'formulaire-serveur'],
      links: {
        guide: 'rendez-vous',
        domain: 'Application web',
      },
      history: [['2026-09-27', 'Publication']],
    },
    {
      id: 'droits-images',
      kind: 'regles',
      theme: 'proteger',
      minutes: 2,
      updated: '2026-09-25',
      situation: 'cas-5',
      title: 'Vérifier les droits d’une image générée avant de l’utiliser',
      short:
        'L’IA ne peut pas garantir qu’une image est libre de droits. Les conditions de l’outil, et ce que l’image représente, décident de ce que vous pouvez en faire.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Une image peut ressembler de près à une œuvre existante, à une marque ou à une personne réelle. Et chaque outil fixe ses propres conditions d’usage commercial.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Lisez les conditions d’utilisation de l’outil pour votre formule.',
            'Évitez de demander le style d’un artiste vivant ou une marque reconnaissable.',
            'Pour un usage commercial important, faites vérifier l’image avant de la diffuser.',
          ],
        },
      ],
      related: ['biais', 'image-reference'],
      links: {
        guide: 'identite',
        domain: 'Image et illustration',
      },
      history: [['2026-09-25', 'Publication']],
    },
    {
      id: 'formulaire-serveur',
      kind: 'regles',
      theme: 'proteger',
      minutes: 3,
      updated: '2026-09-24',
      situation: 'cas-6',
      title: 'Protéger un formulaire côté serveur',
      short:
        'Une case à cocher ou un bouton désactivé n’arrêtent pas les robots : la protection se fait sur le serveur, là où le message arrive.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Un robot n’utilise pas votre page : il envoie directement les données au serveur. Tout ce qui se passe dans le navigateur, il le contourne.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Limitez le nombre d’envois par adresse et par minute.',
            'Ajoutez un champ invisible que seuls les robots remplissent.',
            'Vérifiez côté serveur chaque champ reçu, comme s’il venait d’un inconnu.',
          ],
        },
      ],
      related: ['minimiser-donnees', 'pas-que-couleur'],
      links: {
        guide: 'site-vitrine',
        domain: 'Application web',
      },
      history: [['2026-09-24', 'Publication']],
    },
    {
      id: 'pas-que-couleur',
      kind: 'regles',
      theme: 'proteger',
      minutes: 2,
      updated: '2026-10-05',
      title: 'Signaler une erreur par un texte, pas seulement par la couleur',
      short:
        'Un message d’erreur se lit, il ne se devine pas à la couleur. Les personnes daltoniennes et les lecteurs d’écran en dépendent.',
      body: [
        {
          h: 'Pourquoi',
          p: [
            'Les interfaces générées signalent souvent une erreur par une bordure rouge, sans texte. Une partie des utilisateurs ne la voit pas, et un lecteur d’écran ne l’annonce pas.',
          ],
        },
        {
          h: 'Comment faire',
          steps: [
            'Associez à chaque erreur un texte qui dit quoi corriger.',
            'Reliez ce texte au champ concerné pour les lecteurs d’écran.',
            'Vérifiez le contraste du texte sur son fond.',
          ],
        },
      ],
      check: {
        q: 'Le formulaire généré entoure en rouge le champ e-mail incorrect. Que demandez-vous à l’IA ?',
        choices: [
          'Un rouge plus vif',
          'Un message sous le champ qui explique l’erreur, relié au champ',
          'Une icône d’alerte à côté du bouton',
        ],
        correct: 1,
        why: 'Le texte dit quoi corriger à tout le monde, y compris aux personnes qui ne distinguent pas le rouge et aux utilisateurs de lecteurs d’écran.',
      },
      related: ['formulaire-serveur'],
      links: {
        guide: 'site-vitrine',
        domain: 'Application web',
      },
      history: [
        ['2026-09-28', 'Publication'],
        ['2026-10-05', 'Exemple ajouté : le contraste d’une palette de marque'],
      ],
    },
    {
      id: 'astuce-sref',
      kind: 'astuces',
      tool: 'Midjourney',
      model: 'v7',
      verified: '2026-10-09',
      minutes: 2,
      updated: '2026-10-09',
      title: 'Garder le style d’une série avec --sref',
      short:
        'Ajoutez --sref suivi de l’adresse de votre première image : les suivantes reprennent ses couleurs et sa texture.',
      prompt: {
        before: 'affiche de randonnée, lac alpin au lever du jour, style illustration',
        after:
          'affiche de randonnée, lac alpin au lever du jour, style illustration --sref [adresse de la première affiche] --sw 200',
        notes: [
          ['--sref [adresse de la première affiche]', 'Image de style'],
          ['--sw 200', 'Influence du style'],
        ],
      },
      body: [
        {
          h: 'Comment faire',
          steps: [
            'Générez la première image et choisissez celle dont le style vous convient.',
            'Copiez son adresse et ajoutez-la après --sref dans chaque nouveau prompt.',
            'Réglez l’influence avec --sw, de 0 à 1 000 (100 par défaut).',
          ],
        },
        {
          h: 'À savoir',
          p: [
            '--sref reprend le style, pas le contenu. Pour garder un personnage, utilisez plutôt la référence omni (--oref) de la version 7.',
          ],
        },
      ],
      related: ['image-reference', 'reponses-differentes', 'astuce-reference-angle'],
      links: {
        guide: 'serie-images',
        domain: 'Image et illustration',
      },
      history: [
        ['2026-09-18', 'Publication, vérifiée avec Midjourney v6.1'],
        ['2026-10-09', 'Vérifiée avec Midjourney v7'],
      ],
    },
    {
      id: 'astuce-reference-angle',
      kind: 'astuces',
      tool: 'Midjourney',
      model: 'v7',
      verified: '2026-10-02',
      minutes: 2,
      updated: '2026-10-02',
      title: 'Joindre une image de référence pour garder le même angle de vue',
      short:
        'Pour une série d’icônes ou d’objets, une image de référence fixe l’angle et l’éclairage mieux que n’importe quelle description.',
      body: [
        {
          h: 'Comment faire',
          steps: [
            'Choisissez l’icône la plus réussie de la série.',
            'Joignez-la à chaque nouveau prompt comme image de référence.',
            'Ne décrivez dans le texte que ce qui change : l’objet.',
          ],
        },
      ],
      related: ['image-reference', 'astuce-sref'],
      links: {
        guide: 'serie-images',
        domain: 'Image et illustration',
      },
      history: [['2026-10-02', 'Publication']],
    },
    {
      id: 'astuce-guillemets',
      kind: 'astuces',
      tool: 'Ideogram',
      model: '3.0',
      verified: '2026-10-03',
      minutes: 1,
      updated: '2026-10-03',
      title: 'Mettre le texte exact entre guillemets',
      short:
        'Pour un logo ou une affiche, écrivez le texte à afficher entre guillemets droits : son orthographe est respectée bien plus souvent.',
      prompt: {
        before: 'logo pour la coopérative Karité de Koutiala, style épuré',
        after: 'logo avec le texte "Karité de Koutiala", style épuré, une seule ligne de texte',
        notes: [
          ['"Karité de Koutiala"', 'Texte exact'],
          ['une seule ligne de texte', 'Mise en page'],
        ],
      },
      related: ['prompt'],
      links: {
        guide: 'identite',
        domain: 'Identité visuelle',
      },
      history: [['2026-10-03', 'Publication']],
    },
    {
      id: 'astuce-camera-fixe',
      kind: 'astuces',
      tool: 'Kling',
      model: '2.1',
      verified: '2026-10-11',
      minutes: 2,
      updated: '2026-10-11',
      title: 'Fixer la caméra pour animer un logo',
      short:
        'Demandez une « caméra fixe » et décrivez seulement le mouvement du logo : les lettres restent nettes du début à la fin.',
      body: [
        {
          h: 'Comment faire',
          steps: [
            'Partez d’une image du logo sur fond uni.',
            'Écrivez « caméra fixe, plan serré » au début du prompt.',
            'Décrivez un seul mouvement, simple : apparition, rotation lente, rebond.',
          ],
        },
        {
          h: 'À savoir',
          p: [
            'Depuis Kling 2.1, l’ancienne consigne « mouvement lent » déplace aussi la caméra. Cette astuce la remplace.',
          ],
        },
      ],
      related: ['astuce-plans-courts'],
      links: {
        guide: 'audio-video',
        domain: 'Vidéo',
      },
      history: [
        ['2026-09-12', 'Publication, vérifiée avec Kling 2.0'],
        ['2026-10-11', 'Vérifiée avec Kling 2.1 ; remplace « Demander un mouvement lent »'],
      ],
    },
    {
      id: 'astuce-mouvement-lent',
      kind: 'astuces',
      tool: 'Kling',
      model: '2.0',
      verified: '2026-08-28',
      minutes: 1,
      updated: '2026-10-11',
      replacedBy: 'astuce-camera-fixe',
      title: 'Demander un « mouvement lent » pour stabiliser un logo',
      short:
        'Valable jusqu’à Kling 2.0. Depuis la version 2.1, cette consigne déplace aussi la caméra : utilisez plutôt une caméra fixe.',
      related: ['astuce-camera-fixe'],
      history: [
        ['2026-08-28', 'Publication, vérifiée avec Kling 2.0'],
        ['2026-10-11', 'Remplacée : Kling 2.1 interprète la consigne comme un mouvement de caméra'],
      ],
    },
    {
      id: 'astuce-plans-courts',
      kind: 'astuces',
      tool: 'Runway',
      model: 'Gen-4',
      verified: '2026-10-07',
      minutes: 2,
      updated: '2026-10-07',
      title: 'Couper les plans à 5 secondes quand des mains bougent',
      short:
        'Au-delà de 5 secondes, les mains se déforment souvent. Enchaînez deux plans courts plutôt qu’un plan long.',
      body: [
        {
          h: 'Comment faire',
          steps: [
            'Découpez l’action en gestes de moins de 5 secondes.',
            'Gardez le même cadrage et la même image de départ d’un plan à l’autre.',
            'Raccordez les plans au montage, sur un temps fort de la musique.',
          ],
        },
      ],
      related: ['astuce-musique-avant', 'astuce-camera-fixe'],
      links: {
        guide: 'audio-video',
        domain: 'Vidéo',
      },
      history: [['2026-10-07', 'Publication']],
    },
    {
      id: 'astuce-fin-franche',
      kind: 'astuces',
      tool: 'Suno',
      model: 'v4.5',
      verified: '2026-10-09',
      minutes: 1,
      updated: '2026-10-09',
      title: 'Demander une « fin franche » pour tenir une durée',
      short:
        'Un générique qui se termine en fondu dépasse souvent la durée voulue. Précisez la durée en secondes et une fin franche.',
      prompt: {
        before: 'générique de podcast, afro-jazz, joyeux, court',
        after:
          'générique de podcast de 10 secondes, afro-jazz joyeux, fin franche sur un accord, sans fondu',
        notes: [
          ['10 secondes', 'Durée'],
          ['fin franche sur un accord', 'Fin'],
          ['sans fondu', 'Limite'],
        ],
      },
      related: ['astuce-musique-avant'],
      links: {
        guide: 'audio-video',
        domain: 'Musique et son',
      },
      history: [
        ['2026-09-20', 'Publication'],
        ['2026-10-09', 'Vérifiée de nouveau avec Suno v4.5'],
      ],
    },
    {
      id: 'astuce-musique-avant',
      kind: 'astuces',
      tool: 'Suno',
      model: 'v4.5',
      verified: '2026-10-05',
      minutes: 1,
      updated: '2026-10-05',
      title: 'Composer la musique avant le montage',
      short:
        'Générez d’abord la musique, puis calez la durée de chaque plan sur son tempo : le montage paraît pensé, pas assemblé.',
      related: ['astuce-plans-courts', 'astuce-fin-franche'],
      links: {
        guide: 'audio-video',
        domain: 'Vidéo',
      },
      history: [['2026-10-05', 'Publication']],
    },
    {
      id: 'astuce-pauses-voix',
      kind: 'astuces',
      tool: 'ElevenLabs',
      model: 'Multilingual v2',
      verified: '2026-09-30',
      minutes: 1,
      updated: '2026-09-30',
      title: 'Placer les pauses avec la ponctuation',
      short:
        'Une virgule, un point ou des points de suspension règlent le rythme d’une voix off mieux qu’une consigne comme « parle lentement ».',
      prompt: {
        before: 'Étape 2 ouvrez le menu Paramètres puis choisissez Compte',
        after: 'Étape 2. Ouvrez le menu Paramètres… puis choisissez Compte.',
        notes: [
          ['Étape 2.', 'Pause courte'],
          ['Paramètres…', 'Pause longue'],
        ],
      },
      links: {
        guide: 'audio-video',
        domain: 'Musique et son',
      },
      history: [['2026-09-30', 'Publication']],
    },
    {
      id: 'astuce-premier-plan',
      kind: 'astuces',
      tool: 'Flux',
      model: '1.1 Pro',
      verified: '2026-10-01',
      minutes: 1,
      updated: '2026-10-01',
      title: 'Simplifier le premier plan pour éviter les objets déformés',
      short:
        'Plus le premier plan contient d’objets détaillés, plus ils risquent d’être déformés. Gardez-y un ou deux éléments, décrits précisément.',
      related: ['une-chose-a-la-fois'],
      links: {
        guide: 'photo',
        domain: 'Image et illustration',
      },
      history: [['2026-10-01', 'Publication']],
    },
    {
      id: 'astuce-ordre-mois',
      kind: 'astuces',
      tool: 'Gemini',
      model: '2.5 Pro',
      verified: '2026-09-26',
      minutes: 1,
      updated: '2026-09-26',
      title: 'Imposer l’ordre chronologique dans un graphique',
      short:
        'Sans consigne, les mois peuvent être triés par ordre alphabétique. Indiquez l’ordre attendu, de janvier à décembre.',
      related: ['recalculer-chiffre'],
      links: {
        guide: 'donnees',
        domain: 'Analyse de données',
      },
      history: [['2026-09-26', 'Publication']],
    },
    {
      id: 'astuce-glossaire',
      kind: 'astuces',
      tool: 'ChatGPT',
      model: 'GPT-5',
      verified: '2026-10-04',
      minutes: 2,
      updated: '2026-10-04',
      title: 'Joindre un glossaire à chaque traduction',
      short:
        'La liste de vos termes métier et de leur traduction validée évite les contresens, comme « brut » traduit par « raw ».',
      prompt: {
        before: 'Traduis cette fiche produit en anglais.',
        after:
          'Traduis cette fiche produit en anglais. Respecte ce glossaire : beurre de karité brut → unrefined shea butter ; pressé à froid → cold-pressed. Signale tout terme absent du glossaire.',
        notes: [
          ['Respecte ce glossaire', 'Glossaire'],
          ['Signale tout terme absent du glossaire', 'Contrôle'],
        ],
      },
      related: ['ce-que-ia-ignore', 'exemple-demande'],
      links: {
        guide: 'textes',
        domain: 'Texte et rédaction',
      },
      history: [['2026-10-04', 'Publication']],
    },
    {
      id: 'astuce-detail-avis',
      kind: 'astuces',
      tool: 'Claude',
      model: 'Sonnet 4.5',
      verified: '2026-10-02',
      minutes: 1,
      updated: '2026-10-02',
      title: 'Reprendre un détail de chaque avis client',
      short:
        'Demandez de citer un élément précis de l’avis (un plat, une attente, un prénom) : les réponses cessent de se ressembler.',
      related: ['exemple-demande', 'demande-claire'],
      links: {
        guide: 'textes',
        domain: 'Texte et rédaction',
      },
      history: [['2026-10-02', 'Publication']],
    },
    {
      id: 'astuce-cursor-fichiers',
      kind: 'astuces',
      tool: 'Cursor',
      verified: '2026-10-10',
      minutes: 1,
      updated: '2026-10-10',
      title: 'Nommer les fichiers que l’agent peut modifier',
      short:
        'Ajoutez les fichiers concernés au contexte avec @ et précisez « ne modifie aucun autre fichier » : l’agent reste dans son périmètre.',
      related: ['perimetre-agent', 'agent'],
      links: {
        guide: 'scripts',
        domain: 'Code et scripts',
      },
      history: [['2026-10-10', 'Publication']],
    },
    {
      id: 'astuce-n8n-a-verifier',
      kind: 'astuces',
      tool: 'n8n',
      verified: '2026-09-28',
      minutes: 2,
      updated: '2026-09-28',
      title: 'Prévoir une branche « à vérifier » pour les cas ambigus',
      short:
        'Quand l’extraction est incertaine (montant illisible, expéditeur inconnu), envoyez le document dans un dossier à vérifier plutôt que de deviner.',
      related: ['valider-avant-envoi', 'garder-la-main'],
      links: {
        guide: 'automatiser',
        domain: 'Automatisation',
      },
      history: [['2026-09-28', 'Publication']],
    },
    {
      id: 'astuce-notebooklm-pages',
      kind: 'astuces',
      tool: 'NotebookLM',
      verified: '2026-10-06',
      minutes: 1,
      updated: '2026-10-06',
      title: 'Exiger la page source de chaque réponse',
      short:
        'Pour des fiches ou un quiz, demandez que chaque réponse cite le passage et la page du cours : les erreurs se repèrent en quelques secondes.',
      related: ['retrouver-source', 'resume-fidele'],
      links: {
        guide: 'reviser',
        domain: 'Éducation',
      },
      history: [['2026-10-06', 'Publication']],
    },
  ],
  cases: {
    'cas-1': {
      tool: ['ChatGPT', 'GPT-5'],
      ask: 'Mes ventes passent de 120 commandes en août à 150 en septembre. Calcule la hausse.',
      regle: 'recalculer-chiffre',
    },
    'cas-2': {
      tool: ['Gemini', '2.5 Pro'],
      ask: 'Trouve-moi une étude récente qui montre que le télétravail améliore la productivité.',
      regle: 'retrouver-source',
    },
    'cas-3': {
      tool: ['Claude', 'Sonnet 4.5'],
      ask: 'Écris un script qui supprime les fichiers en double dans mon dossier Documents.',
      regle: 'simulation-dabord',
    },
    'cas-4': {
      tool: ['Cursor'],
      ask: 'Corrige l’erreur de compilation du projet.',
      regle: 'perimetre-agent',
    },
    'cas-5': {
      tool: ['ChatGPT', 'GPT-5'],
      ask: 'Puis-je utiliser cette image générée pour ma campagne publicitaire ?',
      regle: 'droits-images',
    },
    'cas-6': {
      tool: ['Lovable'],
      ask: 'Protège mon formulaire de contact contre les robots.',
      regle: 'formulaire-serveur',
    },
    'cas-7': {
      tool: ['Claude', 'Sonnet 4.5'],
      ask: 'Résume ce rapport de dix pages pour la réunion de demain.',
      regle: 'resume-fidele',
    },
    'cas-8': {
      tool: ['ChatGPT', 'GPT-5'],
      ask: 'Écris une fonction qui calcule la TVA d’un montant hors taxes.',
      regle: 'tests-du-modele',
    },
  },
  caseOfDay: 'cas-8',
  journal: [
    {
      date: '2026-10-13',
      kind: 'nouveau',
      savoir: 'tests-du-modele',
      source: 'communaute',
      why: 'Le même piège apparaît dans six créations de code publiées en septembre.',
    },
    {
      date: '2026-10-11',
      kind: 'revu',
      savoir: 'astuce-camera-fixe',
      source: 'outils',
      why: 'Vérifiée avec Kling 2.1, sorti le 8 octobre.',
    },
    {
      date: '2026-10-11',
      kind: 'remplace',
      savoir: 'astuce-mouvement-lent',
      source: 'outils',
      why: 'Depuis Kling 2.1, cette consigne déplace aussi la caméra.',
    },
    {
      date: '2026-10-10',
      kind: 'nouveau',
      savoir: 'astuce-cursor-fichiers',
      source: 'forum',
      why: 'Des agents qui modifient des fichiers hors de leur tâche : la question revient chaque semaine au forum.',
    },
    {
      date: '2026-10-09',
      kind: 'revu',
      savoir: 'astuce-sref',
      source: 'outils',
      why: 'Vérifiée avec Midjourney v7. L’exemple réalisé en v6.1 reste valable.',
    },
    {
      date: '2026-10-08',
      kind: 'nouveau',
      savoir: 'agent',
      source: 'forum',
      why: 'Les questions sur les agents de code ont doublé au forum en un mois.',
    },
    {
      date: '2026-10-06',
      kind: 'revu',
      savoir: 'recalculer-chiffre',
      source: 'communaute',
      why: 'Nouvel exemple : des remboursements comptés deux fois dans un tableau de bord.',
    },
    {
      date: '2026-10-06',
      kind: 'nouveau',
      savoir: 'astuce-notebooklm-pages',
      source: 'communaute',
      why: 'La même vérification dans deux créations de révision.',
    },
    {
      date: '2026-10-03',
      kind: 'nouveau',
      savoir: 'astuce-guillemets',
      source: 'communaute',
      why: 'La même correction dans deux créations de logo publiées la même semaine.',
    },
  ],
  sources: {
    communaute: 'Créations de la communauté',
    forum: 'Questions du forum',
    outils: 'Actualité des outils',
  },
};
