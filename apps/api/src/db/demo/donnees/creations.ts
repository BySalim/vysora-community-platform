import type { CreationDemo } from '../types.js';

/* Créations de démonstration : catalogue d'Explorer (explorer-data.js), détaillé par creation-details.js et
   fiche-creation.html ; participations au défi en cours (defis-data.js) ; créations et brouillons de
   Clarisse Mendy (nouvelle-creation-data.js). Les parcours que le prototype ne détaille pas ont été complétés
   pour respecter RG-11 à RG-14 ; le prompt connu est repris tel quel. */

export const CREATIONS: CreationDemo[] = [
  {
    cle: 'keur-awa',
    auteur: 'aissatou-ndiaye',
    type: 'ITERATION',
    titre: 'Prise de rendez-vous pour un salon de coiffure',
    objectif:
      'Permettre aux clientes de choisir un créneau disponible et éviter les doubles réservations.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Interface de réservation',
    aAdapter: [
      'Les prestations et leur durée',
      'Les horaires du salon',
      'Les informations demandées à la réservation',
    ],
    etiquettes: ['Réservation', 'Formulaire', 'Sécurité'],
    publication: '2026-10-02T09:12',
    etapes: [
      {
        configurations: [
          {
            outil: 'Claude',
            modele: 'Sonnet 4.5',
            contexte: 'Même conversation pour les trois échanges',
          },
        ],
        echanges: [
          {
            titre: 'Composer la réservation',
            prompt:
              'Crée une page de réservation pour le salon Keur Awa avec les prestations, la durée et les créneaux disponibles.',
            reponse: 'Une première page réunit le choix de la prestation et les horaires.',
          },
          {
            titre: 'Empêcher les doublons',
            prompt:
              'Les créneaux déjà réservés restent sélectionnables. Désactive-les et refuse côté serveur toute réservation sur un créneau pris.',
            reponse:
              'Les horaires indisponibles sont distingués et la confirmation prévoit un contrôle de disponibilité.',
          },
          {
            titre: 'Limiter les données conservées',
            prompt:
              'Ne conserve pas les numéros de téléphone dans le navigateur. Demande uniquement les informations nécessaires à la réservation.',
            reponse: 'Les données de contact sont retirées du stockage local.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'Deux réservations passaient sur le même créneau. Le contrôle visuel ne suffisait pas : la disponibilité devait aussi être vérifiée au moment de confirmer.',
            titre: 'Vérifier les réservations simultanées',
            echange: 1,
          },
          {
            type: 'REFUS',
            explication: 'Les numéros de téléphone étaient stockés dans le navigateur.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'keur-awa',
        capture: true,
        texteAlternatif:
          'Page de réservation d’un salon avec les créneaux libres et pris de la journée',
      },
    ],
    utiles: 412,
    utilesSemaine: 148,
    reproductions: {
      configurations: [
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 19, reussis: 16 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 8, reussis: 7 },
        { outil: 'Gemini', modele: '2.5 Pro', essais: 4, reussis: 3 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'ChatGPT', modele: 'GPT-5' },
    },
    commentaires: [
      {
        auteur: 'clarisse-mendy',
        date: '2026-10-07T17:05',
        corps: 'Le créneau est-il aussi vérifié par le serveur, ou seulement grisé dans la page ?',
        reponses: [
          {
            auteur: 'aissatou-ndiaye',
            date: '2026-10-07T18:22',
            corps:
              'Oui, le créneau est vérifié par le serveur au moment de confirmer : c’est le troisième échange du parcours.',
          },
        ],
      },
    ],
  },
  {
    cle: 'cite-ciel-mer',
    auteur: 'lea-martin',
    type: 'UN_PROMPT',
    titre: 'Cité imaginaire entre ciel et mer',
    objectif: 'Une cité imaginaire lumineuse, avec des tours au centre et la mer au premier plan.',
    limites: 'La disposition exacte des bâtiments varie d’un essai à l’autre.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Paysage · 4:3',
    aAdapter: [
      'La hauteur et la position des tours',
      'L’heure et la lumière',
      'La texture et le style pictural',
    ],
    etiquettes: ['Paysage', 'Architecture', 'Peinture numérique'],
    publication: '2026-10-06T10:47',
    etapes: [
      {
        recit:
          'J’ai utilisé le même prompt pour quatre générations. J’ai retenu celle dont les tours centrales se détachent le mieux du ciel et dont les ponts relient clairement les quartiers.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT Image 1' }],
        echanges: [
          {
            prompt:
              'Illustration panoramique d’une cité méditerranéenne imaginaire, tours élancées au centre, île rocheuse, mer bleu cobalt, ciel abricot, texture peinte, sans texte.',
            essais: 4,
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            titre: 'Donner un point d’ancrage à la composition',
            explication:
              '« Tours élancées au centre » a évité les compositions chargées. En précisant ce qui devait attirer le regard, la cité a trouvé son équilibre.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'cite-imaginaire',
        texteAlternatif: 'Cité de tours élancées sur une île rocheuse au coucher du soleil',
      },
    ],
    utiles: 389,
    utilesSemaine: 156,
    reproductions: {
      configurations: [
        { outil: 'ChatGPT', modele: 'GPT Image 1', essais: 30, reussis: 21 },
        { outil: 'Midjourney', modele: 'v7', essais: 9, reussis: 4 },
        { outil: 'Stable Diffusion', modele: 'SDXL', essais: 5, reussis: 2 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'ChatGPT', modele: 'GPT Image 1' },
      retours: [
        {
          auteur: 'aissatou-ndiaye',
          resultat: 'SUCCES',
          outil: 'ChatGPT',
          modele: 'GPT Image 1',
          retour:
            'Les tours centrales structurent bien la scène. J’ai conservé le prompt sans modification.',
        },
        {
          auteur: 'kofi-mensah',
          resultat: 'SUCCES',
          outil: 'ChatGPT',
          modele: 'GPT Image 1',
          retour:
            'J’ai remplacé le ciel abricot par une lumière de début de journée. La composition reste lisible.',
        },
        {
          auteur: 'yacine-benali',
          resultat: 'PARTIEL',
          outil: 'Midjourney',
          modele: 'v7',
          retour: 'Les tours sont réussies, mais la texture est plus photographique que peinte.',
        },
      ],
    },
    commentaires: [
      {
        auteur: 'aissatou-ndiaye',
        date: '2026-10-12T10:15',
        corps:
          'La précision sur les tours centrales change vraiment la composition. Merci pour le prompt !',
      },
      {
        auteur: 'lea-martin',
        date: '2026-10-12T11:02',
        corps:
          'Oui, c’est le détail qui a fait la différence. J’ai aussi gardé « sans texte » pour éviter les inscriptions sur les façades.',
      },
    ],
  },
  {
    cle: 'portrait-gouache',
    auteur: 'kofi-mensah',
    type: 'ITERATION',
    titre: 'Portrait éditorial en gouache numérique',
    objectif:
      'Un portrait éditorial avec une matière peinte visible, plutôt qu’un rendu photographique.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Image · 4:3',
    aAdapter: ['La palette du portrait', 'La direction de la lumière', 'Le grain du papier'],
    etiquettes: ['Portrait', 'Peinture numérique', 'Éditorial'],
    publication: '2026-10-04T14:05',
    etapes: [
      {
        configurations: [
          { outil: 'Midjourney', modele: 'v7', contexte: 'Variations successives du portrait' },
        ],
        echanges: [
          {
            titre: 'Composer le portrait',
            prompt:
              'Portrait éditorial d’une femme au turban, cadrage aux épaules, fond uni --ar 4:3',
            reponse: 'Le cadrage est retenu, mais le rendu est trop photographique.',
          },
          {
            titre: 'Affirmer la matière',
            prompt:
              'Gouache numérique, touches visibles, papier à grain fin, fond sarcelle uni --ar 4:3',
            reponse: 'Les touches de peinture deviennent visibles.',
          },
          {
            titre: 'Réchauffer la lumière',
            prompt:
              'Conserve la composition et la matière. Ajoute une lumière chaude de fin d’après-midi.',
            reponse: 'La lumière réchauffe le visage et le turban.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Le premier rendu était trop photoréaliste. Les termes « gouache numérique » et « touches visibles » ont rendu la matière plus présente.',
            titre: 'Nommer précisément la technique',
            echange: 1,
          },
          {
            type: 'DECOUVERTE',
            explication: 'La lumière de fin d’après-midi a réchauffé les tons.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'portrait-indigo',
        texteAlternatif: 'Portrait peint d’une jeune femme au turban orange et bleu',
      },
    ],
    utiles: 356,
    utilesSemaine: 121,
    reproductions: {
      configurations: [
        { outil: 'Midjourney', modele: 'v7', essais: 13, reussis: 9 },
        { outil: 'Flux', modele: '1.1 Pro', essais: 5, reussis: 4 },
      ],
      dernier: { date: '2026-10-10T18:30', outil: 'Midjourney', modele: 'v7' },
    },
  },
  {
    cle: 'ventes-boutique',
    auteur: 'claire-dubois',
    type: 'PROJET',
    titre: 'Tableau de bord des ventes d’une boutique en ligne',
    objectif:
      'Suivre le chiffre d’affaires, les commandes et les retours d’une boutique sur quatre mois.',
    categorie: 'Analyse de données',
    licence: 'CC-BY-4.0',
    formatResultat: 'Tableau de bord',
    aAdapter: [
      'La période d’analyse',
      'La devise de la boutique',
      'Le traitement des remboursements',
    ],
    etiquettes: ['E-commerce', 'Tableur', 'Indicateurs'],
    publication: '2026-09-29T16:38',
    etapes: [
      {
        titre: 'Préparer les données',
        recit: 'Les lignes incomplètes sont isolées avant le calcul.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Vérifie les dates, les montants et les identifiants du tableau de ventes. Signale les doublons.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Définir les indicateurs',
        recit: 'Chaque indicateur possède une règle de calcul explicite.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Distingue ventes brutes, remboursements et chiffre d’affaires net. Écris les formules.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Les remboursements étaient comptés deux fois dans le chiffre d’affaires.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Construire la vue',
        recit:
          'Le tableau de bord permet de comparer les mois, avec les valeurs reprises dans un tableau accessible.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Présente les indicateurs et une évolution mensuelle, avec les valeurs accessibles dans un tableau.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les remboursements étaient inclus dans le chiffre d’affaires. Le calcul a été repris pour distinguer les ventes brutes, les retours et le montant net.',
            titre: 'Définir les indicateurs avant de les afficher',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Vérifier les totaux',
        recit:
          'Les totaux sont rapprochés des données sources ; deux écarts venaient de commandes en double.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Compare les totaux du tableau de bord aux lignes sources et explique les écarts.',
          },
        ],
        moments: [
          {
            type: 'REFUS',
            explication: 'La formule proposée masquait les commandes annulées.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'ventes-boutique',
        capture: true,
        texteAlternatif: 'Tableau de bord avec trois indicateurs et les ventes de chaque mois',
      },
    ],
    utiles: 288,
    utilesSemaine: 97,
  },
  {
    cle: 'factures-auto',
    auteur: 'moussa-diallo',
    type: 'PROJET',
    titre: 'Tri automatique des factures reçues par e-mail',
    objectif: 'Classer les factures reçues par e-mail et extraire leur montant TTC.',
    categorie: 'Automatisation',
    licence: 'CC-BY-4.0',
    formatResultat: 'Parcours d’automatisation',
    aAdapter: ['Le dossier de réception', 'Les règles de classement', 'Les champs à vérifier'],
    etiquettes: ['Factures', 'E-mail', 'Comptabilité'],
    publication: '2026-10-01T18:20',
    etapes: [
      {
        titre: 'Repérer les factures',
        recit: 'Les pièces sont regroupées avec leur message source.',
        configurations: [{ outil: 'n8n' }],
        echanges: [
          {
            prompt:
              'Repère les e-mails portant le libellé Factures et récupère leurs pièces jointes PDF.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'Une facture mal lue peut être classée au mauvais mois. Les dates ou montants incertains sont donc isolés avant le classement.',
            titre: 'Garder une étape de vérification humaine',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Extraire les informations',
        recit: 'Les champs incertains sont orientés vers une revue.',
        configurations: [{ outil: 'Claude', modele: 'Haiku 4.5' }],
        echanges: [
          {
            prompt:
              'Extrais le fournisseur, la date et le montant TTC. Signale les valeurs absentes ou incertaines.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Éviter les doublons',
        recit:
          'Les factures déjà traitées sont écartées, même quand elles arrivent une seconde fois par e-mail.',
        configurations: [{ outil: 'n8n' }],
        echanges: [
          {
            prompt:
              'Compare le fournisseur, le numéro de facture et le montant avant de créer un nouveau document.',
          },
        ],
        moments: [
          {
            type: 'ECHEC',
            explication: 'Les PDF scannés sans texte n’étaient pas lus.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Classer et tracer',
        recit: 'Chaque document reste relié à son e-mail d’origine.',
        configurations: [{ outil: 'n8n' }],
        echanges: [
          {
            prompt:
              'Classe les documents vérifiés par mois et conserve un journal des traitements.',
          },
        ],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'factures-auto',
        capture: true,
        texteAlternatif: 'Schéma reliant la messagerie, l’extraction des montants et le classement',
      },
    ],
    utiles: 197,
    utilesSemaine: 74,
  },
  {
    cle: 'lettre-motivation',
    auteur: 'yacine-benali',
    type: 'ITERATION',
    titre: 'Lettre de motivation sans formules toutes faites',
    objectif: 'Une lettre de motivation qui s’appuie sur des faits précis du parcours.',
    categorie: 'Texte et rédaction',
    licence: 'CC-BY-4.0',
    formatResultat: 'Lettre',
    aAdapter: ['Les missions du poste', 'Les réalisations vérifiables', 'Le ton de la candidature'],
    etiquettes: ['Emploi', 'Lettre', 'Ton'],
    publication: '2026-10-03T11:26',
    etapes: [
      {
        configurations: [
          {
            outil: 'Le Chat',
            modele: 'Mistral Large 2',
            contexte: 'Expériences et offre d’emploi',
          },
        ],
        echanges: [
          {
            titre: 'Rédiger une première version',
            prompt: 'Rédige une lettre de motivation pour un poste de coordination associative.',
            reponse: 'La première version contient des formulations trop générales.',
          },
          {
            titre: 'Ancrer le texte dans le parcours',
            prompt:
              'Remplace les qualités vagues par ce fait : j’ai organisé 14 ateliers de prévention dans trois quartiers d’Abidjan.',
            reponse: 'Le paragraphe met en avant une réalisation vérifiable.',
          },
          {
            titre: 'Relire les affirmations',
            prompt:
              'Vérifie que chaque affirmation vient des informations fournies. Supprime les compétences supposées.',
            reponse: 'Les affirmations non étayées sont retirées.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              '« Passionné et dynamique » ne disait rien du parcours. Le nombre d’ateliers et leur contexte donnent un exemple concret de l’expérience.',
            titre: 'Remplacer les qualités déclarées par des faits',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'lettre-motivation',
        capture: true,
        texteAlternatif: 'Lettre où une formule générique est remplacée par un fait précis',
      },
    ],
    utiles: 240,
    utilesSemaine: 69,
    reproductions: {
      configurations: [
        { outil: 'Le Chat', modele: 'Mistral Large 2', essais: 16, reussis: 14 },
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 7, reussis: 6 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 4, reussis: 4 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'Claude', modele: 'Sonnet 4.5' },
    },
  },
  {
    cle: 'avis-restaurant',
    auteur: 'ndeye-fall',
    type: 'UN_PROMPT',
    titre: 'Réponses personnalisées aux avis clients d’un restaurant',
    objectif: 'Répondre aux avis avec un ton chaleureux, sans que deux réponses se ressemblent.',
    categorie: 'Texte et rédaction',
    licence: 'CC-BY-4.0',
    formatResultat: 'Réponse à un avis',
    aAdapter: ['Le nom du restaurant', 'La longueur de la réponse', 'Le ton de la maison'],
    etiquettes: ['Avis clients', 'Restauration', 'Ton'],
    publication: '2026-10-10T20:02',
    etapes: [
      {
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Rédige une réponse à cet avis pour le restaurant Le Baobab. Remercie la personne, reprends un détail précis de son avis et propose une solution si un problème est mentionné. 60 mots maximum, sans formule toute faite.',
            reponse:
              'Merci pour votre avis et pour ce mot sur notre thiéboudienne : savoir qu’il vous a rappelé celui de votre enfance nous touche beaucoup. Vous avez raison pour l’attente du samedi soir ; nous ajoutons un serveur en salle dès ce week-end. Au plaisir de vous accueillir de nouveau au Baobab.',
            essais: 2,
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Reprendre un détail précis de l’avis évite les réponses identiques.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'avis-restaurant',
        capture: true,
        texteAlternatif: 'Avis d’un client et réponse du restaurant',
      },
    ],
    utiles: 205,
    utilesSemaine: 88,
    reproductions: {
      configurations: [
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 8, reussis: 7 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 4, reussis: 4 },
        { outil: 'Le Chat', modele: 'Mistral Large 2', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'ChatGPT', modele: 'GPT-5' },
    },
  },
  {
    cle: 'doublons-contacts',
    auteur: 'claire-dubois',
    type: 'ITERATION',
    titre: 'Dédoublonner 4 000 contacts sans fusionner les homonymes',
    objectif: 'Nettoyer un fichier de contacts en gardant à part les cas douteux.',
    categorie: 'Analyse de données',
    licence: 'CC-BY-4.0',
    formatResultat: 'Fichier de contacts nettoyé',
    aAdapter: ['Les colonnes comparées', 'Le format des numéros', 'Le seuil des cas douteux'],
    etiquettes: ['Tableur', 'Nettoyage', 'CRM'],
    publication: '2026-09-30T08:44',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            titre: 'Demander une première fusion',
            prompt:
              'Voici un export de 4 000 contacts : nom, e-mail, téléphone et ville. Repère les doublons et propose une version fusionnée du fichier.',
            reponse:
              'J’ai trouvé 312 doublons et fusionné les contacts concernés. Le fichier compte désormais 3 688 lignes.',
          },
          {
            titre: 'Restreindre la règle de fusion',
            prompt:
              'Repère les doublons en comparant l’e-mail, le téléphone normalisé et le nom. Ne fusionne jamais deux contacts dont seul le nom correspond : liste-les à part pour vérification.',
            reponse:
              'La fusion ne porte plus que sur les contacts qui partagent un e-mail ou un téléphone normalisé. Les 37 contacts dont seul le nom correspond sont listés à part.',
          },
          {
            titre: 'Normaliser les téléphones',
            prompt:
              'Normalise les numéros au format international avant de comparer : « 77 123 45 67 », « +221 77 123 45 67 » et « 00221771234567 » désignent le même numéro.',
            reponse:
              'Les numéros sont normalisés au format +221 suivi de neuf chiffres. Huit doublons supplémentaires apparaissent.',
          },
          {
            titre: 'Préparer la relecture',
            prompt:
              'Présente les 37 cas douteux dans un tableau : les deux contacts côte à côte, la colonne qui les rapproche et une colonne « Décision » vide.',
            reponse: 'Voici le tableau des 37 cas à vérifier, triés par nom.',
          },
        ],
        moments: [
          {
            type: 'REFUS',
            explication: 'L’IA fusionnait deux homonymes : la règle de fusion a été restreinte.',
            echange: 1,
          },
          {
            type: 'VERIFICATION',
            explication: '37 cas douteux ont été relus à la main.',
            echange: 3,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'doublons-contacts',
        capture: true,
        texteAlternatif: 'Tableau de contacts avec doublons fusionnés et cas à vérifier',
      },
    ],
    utiles: 187,
    utilesSemaine: 35,
    reproductions: {
      configurations: [
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 10, reussis: 8 },
        { outil: 'Gemini', modele: '2.5 Pro', essais: 4, reussis: 3 },
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-09T18:30', outil: 'Gemini', modele: '2.5 Pro' },
    },
  },
  {
    cle: 'site-traiteur',
    auteur: 'ousmane-sy',
    type: 'PROJET',
    titre: 'Site vitrine d’un traiteur avec demande de devis',
    objectif:
      'Présenter les menus, la galerie et recevoir des demandes de devis pour des réceptions.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Site vitrine',
    aAdapter: [
      'Les formules et les menus',
      'Les informations du devis',
      'Le délai de réponse annoncé',
    ],
    etiquettes: ['Site vitrine', 'Restauration', 'Formulaire'],
    publication: '2026-10-08T13:31',
    etapes: [
      {
        titre: 'Rédiger le cahier des charges',
        recit:
          'J’ai décrit à Claude l’activité du traiteur, ses trois formules et les réceptions qu’il prépare ; il en a tiré un cahier des charges d’une page.',
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Voici l’activité d’un traiteur de Thiès : mariages, baptêmes et repas d’entreprise, trois formules de menus. Rédige le cahier des charges d’un site vitrine avec une demande de devis.',
            reponse:
              'Voici un cahier des charges en cinq rubriques : pages, contenus, formulaire de devis, contraintes d’affichage et éléments à fournir.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Générer la structure du site',
        recit:
          'Lovable a produit en un seul prompt les pages d’accueil, des menus et de la galerie, à partir du cahier des charges collé tel quel.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Crée un site vitrine à partir de ce cahier des charges : accueil, menus, galerie de photos et page de demande de devis.',
            reponse:
              'Le site est prêt : quatre pages, un menu de navigation et un formulaire de devis.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Relier le formulaire de devis',
        recit:
          'Le formulaire transmettait la demande au traiteur sans rien confirmer au client. J’ai refusé cette version et demandé un accusé de réception.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Après l’envoi d’une demande de devis, envoie au client un e-mail qui reprend sa demande et annonce une réponse sous 48 heures.',
            reponse:
              'Chaque demande envoie maintenant deux e-mails : la demande au traiteur et un accusé de réception au client.',
          },
        ],
        moments: [
          {
            type: 'REFUS',
            explication: 'Le formulaire envoyait les devis sans accusé de réception au client.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Vérifier l’affichage sur mobile',
        recit:
          'J’ai ouvert chaque page sur un téléphone, une tablette et un ordinateur, puis corrigé la galerie, qui débordait sur les petits écrans.',
        configurations: [],
        echanges: [],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Chaque page a été testée sur trois tailles d’écran.',
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'site-traiteur',
        capture: true,
        texteAlternatif: 'Page d’accueil du site d’un traiteur avec un bouton de demande de devis',
      },
    ],
    utiles: 176,
    utilesSemaine: 41,
  },
  {
    cle: 'relance-devis',
    auteur: 'aissatou-ndiaye',
    type: 'PROJET',
    titre: 'Relance automatique des devis restés sans réponse',
    objectif:
      'Relancer les devis sans réponse après sept jours, avec une validation avant chaque envoi.',
    categorie: 'Automatisation',
    licence: 'CC-BY-4.0',
    formatResultat: 'Scénario d’automatisation',
    aAdapter: ['Le délai avant la relance', 'Le ton du message', 'La personne qui valide l’envoi'],
    etiquettes: ['Devis', 'E-mail', 'Relance'],
    publication: '2026-09-24T17:55',
    etapes: [
      {
        titre: 'Lire les devis envoyés dans le tableur',
        recit:
          'Chaque matin, Make lit le tableur des devis et retient ceux envoyés depuis plus de sept jours, sans réponse ni relance.',
        configurations: [{ outil: 'Make' }],
        echanges: [],
        moments: [],
      },
      {
        titre: 'Rédiger une relance personnalisée',
        recit:
          'Pour chaque devis retenu, ChatGPT rédige une relance courte qui reprend l’objet du devis et le prénom du client.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Rédige une relance de 80 mots au plus pour ce devis resté sans réponse depuis sept jours. Reprends l’objet du devis et le prénom du client, et propose un appel, sans insister.',
            reponse:
              'Bonjour Mamadou, je reviens vers vous au sujet du devis pour la rénovation de votre cuisine, envoyé le 12 septembre. Avez-vous pu le consulter ? Je peux vous appeler cette semaine pour en parler. Bonne journée, Aïssatou.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Faire valider la relance',
        recit:
          'Les premières relances partaient sans relecture. Chaque relance arrive maintenant dans ma boîte, avec deux choix : l’envoyer ou la modifier.',
        configurations: [{ outil: 'Make' }],
        echanges: [],
        moments: [
          {
            type: 'REFUS',
            explication:
              'Les relances partaient sans relecture : une étape de validation a été ajoutée.',
          },
        ],
      },
      {
        titre: 'Mettre à jour le statut du devis',
        recit:
          'Une fois la relance envoyée, le scénario inscrit sa date dans le tableur pour ne jamais relancer deux fois le même devis.',
        configurations: [{ outil: 'Make' }],
        echanges: [],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'relance-devis',
        capture: true,
        texteAlternatif: 'Scénario reliant le tableur, la rédaction, la validation et l’envoi',
      },
    ],
    utiles: 168,
    utilesSemaine: 22,
  },
  {
    cle: 'marque-cosmetique',
    auteur: 'fatoumata-coulibaly',
    type: 'ITERATION',
    titre: 'Palette et typographie d’une marque de soins au karité',
    objectif:
      'Une palette et une typographie cohérentes, lisibles sur l’emballage comme à l’écran.',
    categorie: 'Identité visuelle',
    licence: 'CC-BY-4.0',
    formatResultat: 'Palette et typographies',
    aAdapter: ['Les couleurs de la marque', 'Les polices disponibles', 'Le support d’impression'],
    etiquettes: ['Charte graphique', 'Couleurs', 'Cosmétique'],
    publication: '2026-09-25T09:12',
    etapes: [
      {
        configurations: [{ outil: 'Recraft', modele: 'V3' }],
        echanges: [
          {
            titre: 'Proposer la palette',
            prompt:
              'Propose une palette de cinq couleurs inspirée du karité et de l’indigo, avec leurs codes hexadécimaux et un contraste suffisant pour le texte. Associe une typographie de titre et une de texte.',
            reponse:
              'Voici une palette de cinq couleurs : indigo profond #1F2A5A, sable #E8D5B0, karité #C9A46A, terre cuite #B5562E et crème #FAF6EE. Titres en Fraunces, texte en Inter.',
          },
          {
            titre: 'Vérifier le contraste du texte',
            prompt:
              'Calcule le contraste de chaque couleur de texte sur chaque couleur de fond. Le texte courant doit atteindre un rapport de 4,5:1 au moins.',
            reponse:
              'Le texte crème sur sable n’atteint que 1,3:1, l’indigo sur karité 3,9:1. Je propose de réserver le sable aux fonds et d’écrire le texte en indigo.',
          },
          {
            titre: 'Décliner sur l’emballage',
            prompt:
              'Montre la palette sur l’étiquette d’un pot de 100 g : nom du produit, ingrédients et mentions légales en petit corps.',
            reponse:
              'Voici l’étiquette : le nom en Fraunces indigo sur fond sable, les ingrédients en Inter 7 points sur fond crème, lisibles à l’impression.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Le contraste du texte sur la couleur sable était insuffisant.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'marque-cosmetique',
        capture: true,
        texteAlternatif: 'Cinq nuances de sable, d’ocre et d’indigo avec le nom de la marque',
      },
    ],
    utiles: 158,
    utilesSemaine: 27,
    reproductions: {
      configurations: [
        { outil: 'Recraft', modele: 'V3', essais: 7, reussis: 5 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 3, reussis: 2 },
      ],
      dernier: { date: '2026-10-05T18:30', outil: 'ChatGPT', modele: 'GPT-5' },
    },
  },
  {
    cle: 'extension-navigateur',
    auteur: 'julien-moreau',
    type: 'PROJET',
    titre: 'Extension qui met en pause les vidéos en lecture automatique',
    objectif: 'Une extension de navigateur légère, qui ne demande que les permissions nécessaires.',
    categorie: 'Code et scripts',
    licence: 'CC-BY-4.0',
    formatResultat: 'Extension de navigateur',
    aAdapter: [
      'Les sites concernés',
      'Les vidéos laissées en lecture',
      'Les permissions demandées',
    ],
    etiquettes: ['Extension', 'JavaScript', 'Navigateur'],
    publication: '2026-10-06T10:47',
    etapes: [
      {
        titre: 'Décrire le comportement attendu',
        recit:
          'J’ai d’abord fait préciser le comportement attendu : quelles vidéos mettre en pause, à quel moment, et ce que l’extension ne doit jamais faire.',
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Je veux une extension de navigateur qui met en pause les vidéos en lecture automatique. Pose-moi les questions nécessaires avant d’écrire du code, puis résume le comportement attendu en dix lignes.',
            reponse:
              'Deux questions avant d’écrire le code : faut-il laisser jouer une vidéo lancée par un clic ? Les vidéos muettes sont-elles concernées ? Voici ensuite le comportement attendu en dix lignes.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Générer le manifeste et le script',
        recit:
          'Le premier manifeste demandait l’accès à tous les sites. J’ai refusé : l’extension n’agit que sur l’onglet ouvert, à la demande.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Écris le manifeste (version 3) et le script de contenu. Limite les permissions à activeTab et scripting : aucune permission sur tous les sites.',
            reponse:
              'Le manifeste ne demande plus que activeTab et scripting. Le script met en pause toute vidéo qui démarre sans action de l’utilisateur.',
          },
        ],
        moments: [
          {
            type: 'REFUS',
            explication:
              'L’extension demandait l’accès à tous les sites : la permission a été limitée.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Tester sur cinq sites',
        recit:
          'Sur deux des cinq sites testés, les vidéos chargées après l’ouverture de la page continuaient de démarrer seules.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Les vidéos ajoutées après le chargement de la page ne sont pas détectées. Observe les ajouts au document avec un MutationObserver.',
            reponse:
              'Le script observe désormais les ajouts au document et met en pause chaque nouvelle vidéo dès son insertion.',
          },
        ],
        moments: [
          {
            type: 'ECHEC',
            explication:
              'Les vidéos ajoutées après le chargement de la page n’étaient pas détectées.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Préparer la publication',
        recit:
          'J’ai rédigé la fiche de la boutique d’extensions, expliqué chaque permission demandée et ajouté une page de confidentialité : l’extension ne collecte rien.',
        configurations: [],
        echanges: [],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'extension-navigateur',
        capture: true,
        texteAlternatif: 'Manifeste de l’extension où la permission globale est remplacée',
      },
    ],
    utiles: 152,
    utilesSemaine: 44,
  },
  {
    cle: 'formulaire-asso',
    auteur: 'hugo-girard',
    type: 'ITERATION',
    titre: 'Formulaire d’inscription accessible pour un club sportif',
    objectif:
      'Un formulaire utilisable au clavier, avec des erreurs claires pour les lecteurs d’écran.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Formulaire d’inscription',
    aAdapter: [
      'Les champs demandés',
      'Les messages d’erreur',
      'Le lecteur d’écran utilisé pour les tests',
    ],
    etiquettes: ['Accessibilité', 'Formulaire', 'Association'],
    publication: '2026-10-09T14:05',
    etapes: [
      {
        configurations: [{ outil: 'v0' }],
        echanges: [
          {
            titre: 'Générer le formulaire',
            prompt:
              'Crée le formulaire d’inscription d’un club de basket : nom, prénom, date de naissance, téléphone d’un parent, catégorie et certificat médical.',
            reponse:
              'Voici le formulaire, avec une validation à l’envoi. Les champs en erreur sont entourés de rouge.',
          },
          {
            titre: 'Signaler les erreurs autrement que par la couleur',
            prompt:
              'Chaque champ doit avoir un libellé visible et un message d’erreur relié par aria-describedby. Après l’envoi, place le focus sur le premier champ en erreur.',
            reponse:
              'Chaque champ a maintenant un libellé visible et un message d’erreur sous le champ, relié par aria-describedby. Après l’envoi, le focus va au premier champ en erreur.',
          },
          {
            titre: 'Résumer les erreurs',
            prompt:
              'Ajoute en haut du formulaire un résumé des erreurs, annoncé par les lecteurs d’écran, avec un lien vers chaque champ concerné.',
            reponse:
              'Un résumé des erreurs apparaît en haut du formulaire, dans une zone annoncée par les lecteurs d’écran, avec un lien vers chaque champ.',
          },
          {
            titre: 'Préparer les tests',
            prompt:
              'Liste les vérifications à faire au clavier seul, puis avec le lecteur d’écran NVDA, avant la mise en ligne du formulaire.',
            reponse:
              'Voici dix vérifications : ordre de tabulation, libellés lus, erreurs annoncées, focus après l’envoi, résumé des erreurs et confirmation finale.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Les erreurs n’étaient signalées que par la couleur rouge.',
            echange: 1,
          },
          {
            type: 'VERIFICATION',
            explication: 'Le parcours a été testé avec un lecteur d’écran.',
            echange: 3,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'formulaire-asso',
        capture: true,
        texteAlternatif: 'Formulaire d’inscription avec un message d’erreur sous le champ e-mail',
      },
    ],
    utiles: 143,
    utilesSemaine: 38,
    reproductions: {
      configurations: [
        { outil: 'v0', essais: 6, reussis: 4 },
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 2, reussis: 2 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 1, reussis: 1 },
      ],
      dernier: { date: '2026-10-11T18:30', outil: 'Claude', modele: 'Sonnet 4.5' },
    },
  },
  {
    cle: 'traduction-glossaire',
    auteur: 'awa-sarr',
    type: 'ITERATION',
    titre: 'Traduction de fiches produits avec un glossaire métier',
    objectif: 'Traduire en anglais sans perdre le vocabulaire précis du métier.',
    categorie: 'Texte et rédaction',
    licence: 'CC-BY-4.0',
    formatResultat: 'Fiches produits traduites',
    aAdapter: ['La langue cible', 'Les termes du glossaire', 'La relecture finale'],
    etiquettes: ['Traduction', 'Glossaire', 'E-commerce'],
    publication: '2026-10-05T16:38',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            titre: 'Traduire une première fiche',
            prompt:
              'Traduis en anglais cette fiche produit : « Beurre de karité brut, pressé à froid à Koutiala. Pot de 250 g. »',
            reponse: 'Raw butter, cold-pressed in Koutiala. 250 g jar.',
          },
          {
            titre: 'Imposer le glossaire',
            prompt:
              'Traduis cette fiche en anglais en respectant strictement le glossaire ci-dessous. Signale chaque terme absent du glossaire au lieu de le traduire librement.',
            reponse:
              'Raw shea butter, cold-pressed in Koutiala. 250 g jar. Terme absent du glossaire : « pressé à froid », traduit par « cold-pressed », à confirmer.',
          },
          {
            titre: 'Traduire toute la gamme',
            prompt:
              'Voici le glossaire complété avec « pressé à froid : cold-pressed ». Traduis les onze autres fiches de la gamme en appliquant ce glossaire.',
            reponse:
              'Voici les onze fiches traduites. Deux termes restent absents du glossaire : « savon noir » et « karité fouetté ».',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              '« Beurre de karité brut » devenait « raw butter » : un glossaire a été ajouté.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'traduction-glossaire',
        capture: true,
        texteAlternatif:
          'Fiche produit en français et sa traduction anglaise, avec le terme du glossaire',
      },
    ],
    utiles: 131,
    utilesSemaine: 34,
    reproductions: {
      configurations: [
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 6, reussis: 4 },
        { outil: 'DeepSeek', modele: 'V3.2', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-08T18:30', outil: 'DeepSeek', modele: 'V3.2' },
    },
  },
  {
    cle: 'resume-canal',
    auteur: 'thomas-lefevre',
    type: 'ITERATION',
    titre: 'Résumé quotidien des décisions d’un canal d’équipe',
    objectif:
      'Recevoir chaque matin les décisions, les questions ouvertes et les tâches de la veille.',
    categorie: 'Automatisation',
    licence: 'CC-BY-4.0',
    formatResultat: 'Résumé quotidien',
    aAdapter: ['Les rubriques du résumé', 'L’heure d’envoi', 'Les messages à ignorer'],
    etiquettes: ['Résumé', 'Équipe', 'Messagerie'],
    publication: '2026-10-04T18:20',
    etapes: [
      {
        configurations: [
          { outil: 'Claude', modele: 'Haiku 4.5', parametres: 'Déclenché chaque matin par Zapier' },
        ],
        echanges: [
          {
            titre: 'Premier résumé',
            prompt: 'Résume les messages de ce canal publiés depuis hier matin.',
            reponse:
              'Hier, l’équipe a validé la nouvelle maquette, reporté la réunion client à jeudi et demandé un devis pour l’impression.',
          },
          {
            titre: 'Structurer le résumé',
            prompt:
              'Résume les messages des dernières 24 heures en trois rubriques : décisions, questions ouvertes, tâches attribuées. Cite l’auteur de chaque décision. Ignore les messages de bienvenue et les réactions.',
            reponse:
              'Décisions : maquette validée (Fatou), réunion client reportée à jeudi (Marc). Questions ouvertes : budget de l’impression. Tâches : devis à demander (Ibrahima).',
          },
          {
            titre: 'Attribuer chaque décision',
            prompt:
              'Quand une décision est annoncée par une personne pour le compte d’une autre, cite les deux. Si l’auteur est incertain, écris « auteur à confirmer ».',
            reponse:
              'Chaque décision cite désormais la personne qui décide et celle qui l’annonce ; une décision sans auteur clair est marquée « auteur à confirmer ».',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Le résumé attribuait des décisions à la mauvaise personne.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'resume-canal',
        capture: true,
        texteAlternatif: 'Résumé du matin avec les décisions et les questions ouvertes',
      },
    ],
    utiles: 121,
    utilesSemaine: 30,
    reproductions: {
      configurations: [
        { outil: 'Claude', modele: 'Haiku 4.5', essais: 8, reussis: 6 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 3, reussis: 2 },
      ],
      dernier: { date: '2026-10-10T18:30', outil: 'Claude', modele: 'Haiku 4.5' },
    },
  },
  {
    cle: 'facade-goree',
    auteur: 'mariam-diop',
    type: 'UN_PROMPT',
    titre: 'Façade de Gorée en lumière de fin de journée',
    objectif: 'Une photographie de façade pour illustrer un guide de voyage.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Photographie · 3:2',
    aAdapter: ['Le lieu photographié', 'L’heure et la lumière', 'Les éléments du premier plan'],
    etiquettes: ['Voyage', 'Photographie', 'Architecture'],
    publication: '2026-10-07T11:26',
    etapes: [
      {
        configurations: [{ outil: 'Flux', modele: '1.1 Pro' }],
        echanges: [
          {
            prompt:
              'Photographie d’une façade ocre rose à Gorée, volets bleu passé, palmiers, pirogue colorée au premier plan, lumière dorée de fin de journée, 35 mm, couleurs naturelles.',
            essais: 5,
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Les pirogues étaient déformées : le premier plan a été simplifié.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'goree',
        texteAlternatif: 'Façade rose bordée de palmiers, avec une barque au premier plan',
      },
    ],
    utiles: 118,
    utilesSemaine: 29,
    reproductions: {
      configurations: [
        { outil: 'Flux', modele: '1.1 Pro', essais: 4, reussis: 3 },
        { outil: 'Midjourney', modele: 'v7', essais: 2, reussis: 1 },
      ],
      dernier: { date: '2026-10-09T18:30', outil: 'Midjourney', modele: 'v7' },
    },
  },
  {
    cle: 'jingle-podcast',
    auteur: 'ibrahima-sow',
    type: 'ITERATION',
    titre: 'Générique de 10 secondes pour un podcast',
    objectif: 'Un générique instrumental reconnaissable, avec une fin nette.',
    categorie: 'Musique et son',
    licence: 'CC-BY-4.0',
    formatResultat: 'Générique de 10 secondes',
    aAdapter: ['Les instruments', 'Le tempo', 'La durée de la version courte'],
    etiquettes: ['Podcast', 'Générique', 'Instrumental'],
    publication: '2026-09-27T20:02',
    etapes: [
      {
        configurations: [{ outil: 'Suno', modele: 'v4.5' }],
        echanges: [
          {
            titre: 'Trouver le motif',
            prompt:
              'Générique instrumental pour un podcast de société, kora et basse douce, ambiance chaleureuse, 10 secondes.',
            reponse:
              'Deux propositions de 30 secondes ; la seconde a le bon motif de kora, mais elle se termine par un long fondu.',
          },
          {
            titre: 'Imposer la durée et la fin',
            prompt:
              'Générique instrumental de 10 secondes pour un podcast de société, kora et basse douce, tempo 96, motif mélodique simple répété deux fois, fin franche, sans voix.',
            reponse:
              'Le morceau dure 10 secondes et se termine net, sur la dernière note du motif.',
          },
          {
            titre: 'Préparer une version courte',
            prompt:
              'Garde le même motif et fais-en une version de 4 secondes pour les transitions entre les rubriques.',
            reponse:
              'La version de 4 secondes reprend les deux premières mesures du motif, avec la même fin franche.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Le morceau se terminait en fondu : une fin franche a été demandée.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'jingle-podcast',
        capture: true,
        texteAlternatif: 'Lecteur audio du générique de 10 secondes',
      },
    ],
    utiles: 109,
    utilesSemaine: 18,
    reproductions: {
      configurations: [
        { outil: 'Suno', modele: 'v4.5', essais: 9, reussis: 6 },
        { outil: 'Udio', modele: 'v1.5', essais: 4, reussis: 3 },
      ],
      dernier: { date: '2026-10-06T18:30', outil: 'Udio', modele: 'v1.5' },
    },
  },
  {
    cle: 'requete-sql',
    auteur: 'mariam-diop',
    type: 'UN_PROMPT',
    titre: 'Requête SQL des clients inactifs depuis 90 jours',
    objectif: 'Retrouver les clients sans commande récente pour une campagne de relance.',
    categorie: 'Code et scripts',
    licence: 'CC-BY-4.0',
    formatResultat: 'Requête SQL',
    aAdapter: ['Le nom des tables', 'La durée d’inactivité', 'Les clients sans commande'],
    etiquettes: ['SQL', 'Base de données', 'Relance'],
    publication: '2026-10-11T08:44',
    etapes: [
      {
        configurations: [{ outil: 'DeepSeek', modele: 'V3.2' }],
        echanges: [
          {
            prompt:
              'Écris une requête PostgreSQL qui liste les clients sans commande depuis 90 jours, avec la date de leur dernière commande et leur total dépensé. Tables : clients(id, nom, email) et commandes(id, client_id, date, montant).',
            reponse:
              "Voici la requête. Elle regroupe les commandes par client et ne garde que ceux dont la dernière commande date de plus de 90 jours.\n\n```sql\nSELECT c.id, c.nom, c.email,\n       MAX(o.date) AS derniere_commande,\n       SUM(o.montant) AS total_depense\nFROM clients c\nJOIN commandes o ON o.client_id = c.id\nGROUP BY c.id, c.nom, c.email\nHAVING MAX(o.date) < CURRENT_DATE - INTERVAL '90 days'\nORDER BY derniere_commande;\n```",
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'Les clients sans aucune commande étaient exclus : la jointure a été corrigée.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'requete-sql',
        capture: true,
        texteAlternatif: 'Requête SQL avec une jointure externe sur les commandes',
      },
    ],
    utiles: 97,
    utilesSemaine: 61,
    reproductions: {
      configurations: [
        { outil: 'DeepSeek', modele: 'V3.2', essais: 7, reussis: 6 },
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 3, reussis: 3 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-13T18:30', outil: 'Claude', modele: 'Sonnet 4.5' },
    },
  },
  {
    cle: 'quiz-histoire',
    auteur: 'moussa-diallo',
    type: 'UN_PROMPT',
    titre: 'Quiz de dix questions sur l’empire du Mali',
    objectif: 'Un quiz fidèle aux documents du cours, avec la source de chaque réponse.',
    categorie: 'Éducation',
    licence: 'CC-BY-4.0',
    formatResultat: 'Quiz de 10 questions',
    aAdapter: ['Les documents fournis', 'Le niveau de la classe', 'Le nombre de questions'],
    etiquettes: ['Quiz', 'Histoire', 'Collège'],
    publication: '2026-10-09T13:31',
    etapes: [
      {
        configurations: [{ outil: 'NotebookLM' }],
        echanges: [
          {
            prompt:
              'À partir des trois documents fournis uniquement, crée un quiz de 10 questions à choix multiples sur l’empire du Mali. Donne la bonne réponse et le passage source pour chaque question.',
            reponse:
              'Voici les dix questions, avec la bonne réponse et le passage source de chacune. Extrait :\n\n1. Qui fonde l’empire du Mali vers 1235 ?\n   a) Soundiata Keïta · b) Kankou Moussa · c) Sonni Ali\n   Réponse : a. Source : document 1, deuxième paragraphe.\n\n2. Quelle ville devient un grand centre d’études sous Kankou Moussa ?\n   a) Gao · b) Tombouctou · c) Djenné\n   Réponse : b. Source : document 2, troisième paragraphe.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Chaque réponse a été comparée au passage source.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'quiz-histoire',
        capture: true,
        texteAlternatif: 'Question de quiz sur Tombouctou avec sa source',
      },
    ],
    utiles: 92,
    utilesSemaine: 40,
    reproductions: {
      configurations: [
        { outil: 'NotebookLM', essais: 4, reussis: 4 },
        { outil: 'Gemini', modele: '2.5 Pro', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'Gemini', modele: '2.5 Pro' },
    },
  },
  {
    cle: 'pluie-bamako',
    auteur: 'koffi-amoussou',
    type: 'UN_PROMPT',
    titre: 'Courbe des précipitations mensuelles à Bamako',
    objectif: 'Un graphique lisible, avec ses unités et sa source, à partir d’un fichier CSV.',
    categorie: 'Analyse de données',
    licence: 'CC-BY-4.0',
    formatResultat: 'Graphique',
    aAdapter: ['Le fichier de données', 'La période affichée', 'La saison mise en évidence'],
    etiquettes: ['Graphique', 'Climat', 'CSV'],
    publication: '2026-10-02T17:55',
    etapes: [
      {
        configurations: [{ outil: 'Gemini', modele: '2.5 Pro' }],
        echanges: [
          {
            prompt:
              'À partir de ce fichier CSV, trace la courbe des précipitations mensuelles à Bamako en 2025. Mets en évidence la saison des pluies, nomme les axes avec leurs unités et ajoute la source sous le graphique.',
            reponse:
              'Voici la courbe des précipitations mensuelles à Bamako en 2025, de janvier à décembre. La saison des pluies, de juin à septembre, est surlignée. L’axe vertical indique les millimètres, l’axe horizontal les mois ; la source figure sous le graphique.',
            essais: 2,
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les mois étaient triés par ordre alphabétique : l’ordre chronologique a été imposé.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'pluie-bamako',
        capture: true,
        texteAlternatif: 'Courbe des précipitations avec la saison des pluies mise en évidence',
      },
    ],
    utiles: 84,
    utilesSemaine: 19,
    reproductions: {
      configurations: [
        { outil: 'Gemini', modele: '2.5 Pro', essais: 5, reussis: 4 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-07T18:30', outil: 'ChatGPT', modele: 'GPT-5' },
    },
  },
  {
    cle: 'voix-off',
    auteur: 'lea-martin',
    type: 'UN_PROMPT',
    titre: 'Voix off posée pour un tutoriel vidéo',
    objectif: 'Une voix claire et chaleureuse, avec un rythme adapté aux étapes d’un tutoriel.',
    categorie: 'Musique et son',
    licence: 'CC-BY-4.0',
    formatResultat: 'Voix off',
    aAdapter: ['La voix et la langue', 'Le débit', 'La durée des pauses'],
    etiquettes: ['Voix off', 'Tutoriel', 'Vidéo'],
    publication: '2026-09-21T09:12',
    etapes: [
      {
        configurations: [{ outil: 'ElevenLabs', modele: 'Multilingual v2' }],
        echanges: [
          {
            prompt:
              'Voix féminine, français standard, débit posé, ton chaleureux et clair. Marque une courte pause après chaque étape numérotée du script.',
            essais: 3,
          },
        ],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'voix-off',
        capture: true,
        texteAlternatif: 'Lecteur audio de la voix off avec un extrait du script',
      },
    ],
    utiles: 76,
    utilesSemaine: 9,
    reproductions: {
      configurations: [{ outil: 'ElevenLabs', modele: 'Multilingual v2', essais: 5, reussis: 4 }],
      dernier: { date: '2026-10-01T18:30', outil: 'ElevenLabs', modele: 'Multilingual v2' },
    },
  },
  {
    cle: 'affiche-alpes',
    auteur: 'sebastien-roy',
    type: 'ITERATION',
    titre: 'Affiche de randonnée au lac alpin',
    objectif: 'Une série d’affiches peintes aux couleurs constantes pour un office de tourisme.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le paysage représenté', 'Le code de style', 'Le format d’impression'],
    etiquettes: ['Affiche', 'Paysage', 'Tourisme'],
    publication: '2026-09-16T10:47',
    etapes: [
      {
        configurations: [{ outil: 'Midjourney', modele: 'v6.1' }],
        echanges: [
          {
            titre: 'Première affiche',
            prompt:
              'Lac alpin émeraude entre forêts de sapins et sommets calcaires, petite cabane rouille au bord de l’eau, brume du matin, illustration peinte détaillée --ar 2:3',
            reponse:
              'Quatre images réussies, mais la palette change d’une génération à l’autre : impossible d’en faire une série.',
          },
          {
            titre: 'Fixer le style',
            prompt:
              'Lac alpin émeraude entre forêts de sapins et sommets calcaires, petite cabane rouille au bord de l’eau, brume du matin, illustration peinte détaillée --sref 3127845 --ar 2:3',
            reponse:
              'Avec le code de style, les quatre images partagent la même palette émeraude et rouille.',
          },
          {
            titre: 'Décliner la série',
            prompt:
              'Col de montagne enneigé au lever du jour, refuge de pierre, sentier en lacets, illustration peinte détaillée --sref 3127845 --ar 2:3',
            reponse:
              'La deuxième affiche de la série reprend exactement les couleurs de la première.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Le code de style --sref a stabilisé les couleurs sur toute la série.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'silence-alpes',
        texteAlternatif: 'Lac émeraude au pied de montagnes calcaires, avec une cabane rouge',
      },
    ],
    utiles: 264,
    utilesSemaine: 12,
    reproductions: {
      configurations: [{ outil: 'Midjourney', modele: 'v6.1', essais: 23, reussis: 12 }],
      dernier: { date: '2026-09-30T18:30', outil: 'Midjourney', modele: 'v6.1' },
    },
    obsolescence: { modele: 'Midjourney v7', membres: 4, depuis: '2026-10-02' },
  },
  {
    cle: 'animation-logo',
    auteur: 'kofi-mensah',
    type: 'ITERATION',
    titre: 'Animation d’un logo en six secondes',
    objectif:
      'Faire apparaître un logo sans déformer les lettres, pour l’introduction d’une chaîne.',
    categorie: 'Vidéo',
    licence: 'CC-BY-4.0',
    formatResultat: 'Animation de 6 secondes',
    aAdapter: ['Le logo animé', 'La durée du tracé', 'Le format de diffusion'],
    etiquettes: ['Animation', 'Logo', 'Introduction'],
    publication: '2026-10-11T14:05',
    etapes: [
      {
        configurations: [{ outil: 'Kling', modele: '2.1' }],
        echanges: [
          {
            titre: 'Animer le logo',
            prompt:
              'À partir de cette image du logo, crée une animation de six secondes : le symbole apparaît, puis le nom. Mouvement de caméra élégant.',
            reponse:
              'La caméra tourne autour du logo ; les lettres se déforment pendant le mouvement.',
          },
          {
            titre: 'Fixer la caméra',
            prompt:
              'À partir de cette image du logo, fais apparaître le symbole par un tracé lumineux, puis le nom en fondu. Caméra fixe, fond blanc, aucune déformation des lettres.',
            reponse:
              'La caméra reste fixe : le symbole se dessine en trois secondes, puis le nom apparaît en fondu, sans déformation.',
          },
          {
            titre: 'Ajuster le rythme',
            prompt:
              'Ralentis le tracé du symbole et laisse le nom affiché seul pendant la dernière seconde.',
            reponse:
              'Le tracé dure quatre secondes et le nom reste seul à l’écran pendant la dernière seconde.',
          },
          {
            titre: 'Préparer le format vertical',
            prompt: 'Même animation au format 9:16, logo centré, marges égales en haut et en bas.',
            reponse:
              'La version verticale garde le logo centré, avec la même durée et le même rythme.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Les lettres se déformaient pendant le mouvement : la caméra a été fixée.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'animation-logo',
        capture: true,
        texteAlternatif: 'Trois images clés de l’animation du logo et sa ligne de temps',
      },
    ],
    utiles: 64,
    utilesSemaine: 37,
    reproductions: {
      configurations: [
        { outil: 'Kling', modele: '2.1', essais: 3, reussis: 1 },
        { outil: 'Runway', modele: 'Gen-4', essais: 1, reussis: 1 },
      ],
      dernier: { date: '2026-10-12T18:30', outil: 'Runway', modele: 'Gen-4' },
    },
  },
  {
    cle: 'bissap',
    auteur: 'ndeye-fall',
    type: 'UN_PROMPT',
    titre: 'Photo produit pour une infusion de bissap',
    objectif: 'Une photo produit lumineuse pour la page d’une infusion artisanale.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Photo produit',
    aAdapter: ['Le récipient', 'La direction de la lumière', 'La disposition des fleurs'],
    etiquettes: ['Photo produit', 'Alimentation', 'E-commerce'],
    publication: '2026-10-13T16:11',
    etapes: [
      {
        configurations: [
          { outil: 'Flux', modele: '1.1 Pro', contexte: 'Prompt sans image de référence' },
        ],
        echanges: [
          {
            prompt:
              'Photographie de produit d’une tasse en verre contenant une infusion de bissap rouge profond, fleurs d’hibiscus séchées au premier plan, lumière latérale douce, fond sobre, texture réaliste, aucun texte ni logo.',
            essais: 3,
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication:
              'Nommer les fleurs d’hibiscus séchées aide à distinguer le bissap d’une boisson rouge générique.',
            titre: 'Décrire les ingrédients visibles',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'bissap',
        texteAlternatif: 'Tasse d’infusion rouge posée sur des fleurs d’hibiscus séchées',
      },
    ],
    utiles: 12,
    utilesSemaine: 12,
  },
  {
    cle: 'renommer-photos',
    auteur: 'julien-moreau',
    type: 'UN_PROMPT',
    titre: 'Script Python qui renomme des photos selon leur date',
    objectif:
      'Renommer 248 photos selon leur date de prise de vue, sans risque de perdre un fichier.',
    categorie: 'Code et scripts',
    licence: 'CC-BY-4.0',
    formatResultat: 'Script Python',
    aAdapter: ['Le dossier des photos', 'Le format du nom', 'Le traitement des fichiers sans date'],
    etiquettes: ['Python', 'Fichiers', 'Photos'],
    publication: '2026-10-13T15:54',
    etapes: [
      {
        configurations: [
          { outil: 'ChatGPT', modele: 'GPT-5', contexte: 'Noms et métadonnées de photos' },
        ],
        echanges: [
          {
            prompt:
              'Écris un script Python qui lit la date EXIF des photos JPG et propose un nom au format AAAA-MM-JJ_HHMMSS. Active la simulation par défaut, affiche les anciens et nouveaux noms, conserve les fichiers sans date et ajoute un suffixe en cas de doublon. Ne remplace jamais un fichier existant.',
            reponse:
              'Voici le script. La simulation est active par défaut : il affiche l’ancien et le nouveau nom de chaque photo sans rien modifier, garde les photos sans date et ajoute un suffixe en cas de doublon.\n\n```python\nfor photo in dossier.glob("*.jpg"):\n    date = lire_date(photo)\n    nom = date.strftime("%Y-%m-%d_%H%M%S")\n    if simulation:\n        print(photo.name, "→", nom)\n```',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'La simulation permet de vérifier les dates et de repérer les collisions de noms. Les photos sans métadonnées restent inchangées.',
            titre: 'Simuler avant de modifier les fichiers',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'renommer-photos',
        capture: true,
        texteAlternatif: 'Extrait d’un script Python qui parcourt un dossier de photos',
      },
    ],
    utiles: 9,
    utilesSemaine: 9,
    reproductions: {
      configurations: [{ outil: 'ChatGPT', modele: 'GPT-5', essais: 1, reussis: 1 }],
      dernier: { date: '2026-10-13T18:30', outil: 'Claude', modele: 'Sonnet 4.5' },
    },
  },
  {
    cle: 'icones-3d',
    auteur: 'sebastien-roy',
    type: 'ITERATION',
    titre: 'Icônes 3D pour une application de covoiturage',
    objectif: 'Une série d’icônes en relief, cohérentes entre elles.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Planche d’icônes',
    aAdapter: ['Les objets représentés', 'La palette de l’application', 'L’angle de vue'],
    etiquettes: ['Icônes', '3D', 'Application mobile'],
    publication: '2026-10-13T15:32',
    etapes: [
      {
        configurations: [
          { outil: 'Midjourney', modele: 'v7', contexte: 'Deux versions de la série' },
        ],
        echanges: [
          {
            titre: 'Définir la série',
            prompt:
              'Collection d’icônes 3D de covoiturage, formes arrondies, bleu pâle et pêche, matière mate.',
            reponse: 'La première série présente des perspectives différentes.',
          },
          {
            titre: 'Unifier le rendu',
            prompt:
              'Conserve la matière et la palette. Utilise la même perspective et une lumière douce venant du haut à gauche.',
            reponse: 'Les formes partagent une direction de lumière et une matière cohérentes.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les premières formes avaient des ombres différentes. Une direction de lumière explicite rend la série plus homogène.',
            titre: 'Fixer une lumière commune',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'formes-pastel',
        texteAlternatif: 'Formes arrondies en relief aux tons bleu pâle et pêche',
      },
    ],
    utiles: 6,
    utilesSemaine: 6,
  },
  {
    cle: 'fiches-revision',
    auteur: 'awa-sarr',
    type: 'ITERATION',
    titre: 'Fiches de révision sur la photosynthèse',
    objectif: 'Douze fiches de révision fidèles au cours de SVT.',
    categorie: 'Éducation',
    licence: 'CC-BY-4.0',
    formatResultat: '12 fiches',
    aAdapter: ['Le niveau scolaire', 'Le nombre de fiches', 'Le vocabulaire du cours'],
    etiquettes: ['Révisions', 'SVT', 'Lycée'],
    publication: '2026-10-13T15:20',
    etapes: [
      {
        configurations: [
          { outil: 'Gemini', modele: '2.5 Pro', contexte: 'Cours de photosynthèse' },
        ],
        echanges: [
          {
            titre: 'Préparer les questions',
            prompt:
              'Prépare 12 questions de révision sur la photosynthèse, niveau seconde, avec leurs réponses.',
            reponse: 'Plusieurs questions mélangent des notions distinctes.',
          },
          {
            titre: 'Séparer les notions',
            prompt:
              'Limite chaque fiche à une seule notion. Distingue réactifs, produits, lumière et chlorophylle.',
            reponse: 'Les questions sont plus courtes et les réponses ciblées.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'Une fiche qui mélange réactifs et produits est difficile à mémoriser. Chaque question porte sur une seule notion.',
            titre: 'Séparer les notions dans les questions',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'fiches-revision',
        capture: true,
        texteAlternatif: 'Fiches de révision empilées sur la photosynthèse',
      },
    ],
    utiles: 5,
    utilesSemaine: 5,
  },
  {
    cle: 'teaser-festival',
    auteur: 'ibrahima-sow',
    type: 'PROJET',
    titre: 'Teaser de 15 secondes pour un festival de musique',
    objectif: 'Annoncer la programmation d’un festival avec un montage rythmé.',
    categorie: 'Vidéo',
    licence: 'CC-BY-4.0',
    formatResultat: 'Image extraite du teaser',
    aAdapter: ['La durée des plans', 'Le rythme musical', 'Les informations de fin'],
    etiquettes: ['Teaser', 'Événement', 'Montage'],
    publication: '2026-10-13T14:20',
    etapes: [
      {
        titre: 'Préparer le découpage',
        recit: 'Les durées et les mouvements sont définis avant la génération.',
        configurations: [{ outil: 'Runway', modele: 'Gen-4' }],
        echanges: [
          {
            prompt:
              'Découpe un teaser de festival en trois plans sur 15 secondes, de la scène dans la brume au plan large.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Créer l’ambiance sonore',
        recit:
          'La piste fournit les temps forts du montage, sur lesquels les transitions sont ensuite calées.',
        configurations: [{ outil: 'Suno', modele: 'v4.5' }],
        echanges: [
          {
            prompt:
              'Compose une courte piste instrumentale avec une montée progressive et une conclusion nette.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication:
              'Le montage initial changeait de plan au milieu des phrases musicales. Le découpage a été ajusté aux temps forts de la bande-son.',
            titre: 'Caler les transitions sur les temps forts',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Assembler les plans',
        recit: 'Le montage relie les plans au rythme de la bande-son.',
        configurations: [{ outil: 'Runway', modele: 'Gen-4' }],
        echanges: [
          {
            prompt:
              'Place les transitions sur les temps forts et conserve une durée totale de 15 secondes.',
          },
        ],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'scene-festival',
        texteAlternatif: 'Faisceaux de lumière bleue traversant une scène dans la brume',
      },
    ],
    utiles: 4,
    utilesSemaine: 4,
  },
  {
    cle: 'logo-karite',
    auteur: 'fatoumata-coulibaly',
    type: 'ITERATION',
    titre: 'Logo pour une coopérative de karité',
    objectif: 'Un logo lisible en petit format, avec le nom exact de la coopérative.',
    categorie: 'Identité visuelle',
    licence: 'CC-BY-4.0',
    formatResultat: 'Identité visuelle',
    aAdapter: ['Le nom de la coopérative', 'La taille de l’étiquette', 'La version monochrome'],
    etiquettes: ['Logo', 'Coopérative', 'Agriculture'],
    publication: '2026-10-13T13:20',
    etapes: [
      {
        configurations: [
          { outil: 'Ideogram', modele: '3.0', contexte: 'Deux propositions de logo' },
        ],
        echanges: [
          {
            titre: 'Composer le logo',
            prompt:
              'Logo pour Karité de Koutiala, noix de karité et feuille, noir et bleu, fond blanc.',
            reponse: 'La première proposition comporte trop de détails fins.',
          },
          {
            titre: 'Simplifier le signe',
            prompt:
              'Simplifie la silhouette pour une petite étiquette. Conserve le nom exact « Karité de Koutiala ».',
            reponse: 'Le signe reste lisible avec moins de détails.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les détails de la première proposition disparaissaient sur une étiquette. La silhouette a été simplifiée et le nom relu séparément.',
            titre: 'Vérifier le signe à petite taille',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'logo-karite',
        capture: true,
        texteAlternatif: 'Logo avec une noix de karité stylisée et le nom de la coopérative',
      },
    ],
    utiles: 3,
    utilesSemaine: 3,
  },
  {
    cle: 'visuel-conference',
    auteur: 'thomas-lefevre',
    type: 'UN_PROMPT',
    titre: 'Visuel d’ouverture pour une conférence tech',
    objectif: 'Un visuel abstrait aux couleurs de la conférence, avec la place pour le titre.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Fond de conférence',
    aAdapter: ['La zone réservée au titre', 'Le format de projection', 'L’intensité des reliefs'],
    etiquettes: ['Événement', 'Abstrait', 'Présentation'],
    publication: '2026-10-13T12:20',
    etapes: [
      {
        configurations: [
          { outil: 'Midjourney', modele: 'v7', contexte: 'Prompt sans image de référence' },
        ],
        echanges: [
          {
            prompt:
              'Composition abstraite de volutes bleues en relief sur fond bleu nuit, lumière latérale douce, profondeur sculpturale, zone calme au centre pour accueillir un titre ajouté ensuite, aucun texte ni logo --ar 16:9',
            essais: 6,
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication:
              'Préciser une zone calme évite que les détails du fond concurrencent le texte de la conférence.',
            titre: 'Réserver la place du titre',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'vagues-3d',
        texteAlternatif: 'Volutes bleues en relief superposées sur fond bleu nuit',
      },
    ],
    utiles: 3,
    utilesSemaine: 3,
  },
  {
    cle: 'pochette-album',
    auteur: 'hugo-girard',
    type: 'ITERATION',
    titre: 'Motif génératif pour une pochette d’album',
    objectif: 'Un motif hypnotique pour la pochette d’un album électronique.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Motif de pochette',
    aAdapter: ['La couleur des arêtes', 'La densité de la spirale', 'Le cadrage de la pochette'],
    etiquettes: ['Pochette', 'Musique', 'Motif'],
    publication: '2026-10-13T11:20',
    etapes: [
      {
        configurations: [
          {
            outil: 'Stable Diffusion',
            modele: 'SDXL',
            contexte: 'Deux générations comparées en miniature',
          },
        ],
        echanges: [
          {
            titre: 'Explorer le motif',
            prompt: 'Motif abstrait de lames bleu nuit et turquoise, relief fin, fond sombre.',
            reponse: 'Le motif contient trop de détails sur les bords.',
          },
          {
            titre: 'Recentrer la composition',
            prompt:
              'Organise les lames en spirale centrée et simplifie la périphérie. Aucun texte.',
            reponse: 'La spirale reste identifiable en miniature.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'La première version devenait confuse en miniature. La composition centrée rend le motif plus lisible.',
            titre: 'Réduire les détails périphériques',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'spirale',
        texteAlternatif: 'Spirale de fines lames bleu nuit aux bords turquoise',
      },
    ],
    utiles: 2,
    utilesSemaine: 2,
  },
  {
    cle: 'resa-terrain',
    auteur: 'moussa-diallo',
    type: 'PROJET',
    titre: 'Réservation d’un terrain de foot à cinq',
    objectif: 'Laisser les équipes réserver un créneau d’une heure et payer sur place.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Application de réservation',
    aAdapter: ['Les terrains et leurs horaires', 'Le fuseau horaire', 'Le texte du SMS'],
    etiquettes: ['Réservation', 'Sport', 'Calendrier'],
    publication: '2026-10-07T10:47',
    etapes: [
      {
        titre: 'Décrire les terrains et les horaires',
        recit:
          'Avant de générer quoi que ce soit, j’ai fait décrire précisément les deux terrains, les créneaux d’une heure et les horaires du week-end.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Le complexe a deux terrains de foot à cinq, ouverts de 9 h à 23 h en semaine et de 8 h à minuit le week-end. Les créneaux durent une heure et se paient sur place. Rédige les règles de réservation sous forme de liste.',
            reponse:
              'Voici les règles en neuf points, et une question : une équipe peut-elle réserver deux créneaux à la suite ?',
          },
        ],
        moments: [],
      },
      {
        titre: 'Générer le calendrier de réservation',
        recit:
          'Lovable a généré le calendrier des deux terrains. Après le passage à l’heure d’hiver, les créneaux du dimanche apparaissaient décalés d’une heure.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Crée un calendrier de réservation pour les deux terrains à partir de ces règles. Enregistre les créneaux avec le fuseau horaire Europe/Paris.',
            reponse:
              'Le calendrier affiche les deux terrains côte à côte ; les créneaux enregistrés avec leur fuseau horaire restent à la bonne heure après le changement d’heure.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les créneaux du dimanche étaient décalés d’une heure après le changement d’heure.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Bloquer le créneau au moment de valider',
        recit:
          'En réservant le même créneau depuis deux téléphones à la même seconde, les deux réservations passaient. Le créneau est désormais bloqué à la validation.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Deux équipes peuvent réserver le même créneau si elles valident en même temps. Vérifie la disponibilité au moment d’enregistrer la réservation, dans la base de données.',
            reponse:
              'Une contrainte d’unicité sur le terrain et l’heure refuse la seconde réservation ; l’équipe voit un message et choisit un autre créneau.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Deux équipes réservaient le même créneau en même temps.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Envoyer la confirmation par SMS',
        recit:
          'Le SMS de confirmation reprend le terrain, la date et l’heure, et rappelle que le paiement se fait sur place.',
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Rédige le SMS de confirmation : 160 caractères au plus, avec le terrain, la date, l’heure et le rappel du paiement sur place.',
            reponse:
              'Terrain 2 réservé le samedi 18 octobre de 19 h à 20 h. Paiement sur place à l’accueil. Pour annuler, répondez ANNULER.',
          },
        ],
        moments: [],
      },
    ],
    images: [
      {
        fichier: 'resa-terrain',
        capture: true,
        texteAlternatif:
          'Calendrier de réservation de deux terrains, avec les créneaux pris et libres',
      },
    ],
    utiles: 233,
    utilesSemaine: 61,
  },
  {
    cle: 'agenda-kine',
    auteur: 'hugo-girard',
    type: 'ITERATION',
    titre: 'Agenda en ligne d’un cabinet de kinésithérapie',
    objectif: 'Proposer des séances de 30 ou 45 minutes selon le soin, sans chevauchement.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Agenda en ligne',
    aAdapter: ['Les soins et leur durée', 'Les horaires du cabinet', 'Les informations demandées'],
    etiquettes: ['Santé', 'Réservation', 'Agenda'],
    publication: '2026-10-09T14:05',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            titre: 'Générer l’agenda',
            prompt:
              'Crée l’agenda en ligne d’un cabinet de kinésithérapie, ouvert du lundi au vendredi de 8 h à 19 h, avec une pause de 12 h 30 à 14 h. Les patients choisissent un soin, puis un créneau.',
            reponse:
              'Voici l’agenda : une grille de créneaux de 30 minutes, le choix du soin, un champ « Motif de consultation » et une confirmation par e-mail.',
          },
          {
            titre: 'Calculer les créneaux selon la durée',
            prompt:
              'Les séances durent 30 ou 45 minutes selon le soin. Calcule les créneaux disponibles à partir des horaires du cabinet et empêche qu’une séance de 45 minutes chevauche la suivante.',
            reponse:
              'Les créneaux sont calculés à partir de la durée du soin : une séance de 45 minutes ne peut plus commencer à 11 h 45 si 12 h est déjà réservé.',
          },
          {
            titre: 'Limiter les données demandées',
            prompt:
              'Ne demande que le nom, le téléphone et le soin choisi. N’enregistre pas le motif de consultation.',
            reponse: 'Le champ « Motif de consultation » est retiré du formulaire et de la base.',
          },
          {
            titre: 'Prévoir les annulations',
            prompt:
              'Ajoute un lien d’annulation dans l’e-mail de confirmation, valable jusqu’à la veille à 18 h.',
            reponse:
              'L’e-mail de confirmation contient un lien d’annulation ; passé la veille à 18 h, il invite à appeler le cabinet.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Les séances de 45 minutes chevauchaient le créneau suivant.',
            echange: 1,
          },
          {
            type: 'REFUS',
            explication: 'L’IA proposait d’enregistrer le motif de consultation sans consentement.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'agenda-kine',
        capture: true,
        texteAlternatif: 'Agenda de la journée avec des séances de 30 et 45 minutes',
      },
    ],
    utiles: 154,
    utilesSemaine: 52,
    reproductions: {
      configurations: [
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 8, reussis: 6 },
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 4, reussis: 3 },
      ],
      dernier: { date: '2026-10-11T18:30', outil: 'Claude', modele: 'Sonnet 4.5' },
    },
  },
  {
    cle: 'cours-yoga',
    auteur: 'koffi-amoussou',
    type: 'PROJET',
    titre: 'Inscriptions aux cours de yoga avec liste d’attente',
    objectif:
      'Remplir chaque cours sans dépasser le nombre de places, et prévenir la personne suivante en cas d’annulation.',
    categorie: 'Application web',
    licence: 'CC-BY-4.0',
    formatResultat: 'Inscriptions avec liste d’attente',
    aAdapter: ['Les cours et leurs places', 'Le délai de confirmation', 'Le message envoyé'],
    etiquettes: ['Réservation', 'Sport', 'Liste d’attente'],
    publication: '2026-09-28T16:38',
    etapes: [
      {
        titre: 'Modéliser les cours et les places',
        recit:
          'J’ai décrit les cours de la semaine, la capacité de chaque salle et la règle de la liste d’attente, puis fait proposer le modèle de données.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Propose le modèle de données d’un studio de yoga : cours, séances, capacité, inscriptions et liste d’attente ordonnée. Explique chaque table en une phrase.',
            reponse:
              'Quatre tables : cours, séance, inscription et attente. La position dans la liste d’attente est fixée au moment de l’inscription.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Générer l’inscription et la liste d’attente',
        recit:
          'Cursor a généré la page d’inscription : quand une séance est complète, la personne rejoint la liste d’attente et voit sa position.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Génère la page d’inscription à une séance. Si la séance est complète, propose la liste d’attente et affiche la position obtenue.',
            reponse:
              'La page affiche les places restantes ; une séance complète propose « Rejoindre la liste d’attente » et indique la position.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Libérer la place en cas d’annulation',
        recit:
          'À chaque annulation, la première personne de la liste d’attente reçoit la place et un e-mail ; elle a deux heures pour confirmer.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Quand une inscription est annulée, attribue la place à la première personne de la liste d’attente et envoie-lui un e-mail. Sans confirmation sous deux heures, passe à la suivante.',
            reponse:
              'L’annulation attribue la place à la première personne en attente ; une tâche planifiée passe à la suivante après deux heures.',
          },
        ],
        moments: [],
      },
      {
        titre: 'Tester des inscriptions simultanées',
        recit:
          'Un test lance vingt inscriptions en même temps sur la dernière place : deux personnes l’obtenaient. Un verrou sur la séance règle le problème.',
        configurations: [{ outil: 'Cursor' }],
        echanges: [
          {
            prompt:
              'Écris un test qui lance vingt inscriptions simultanées sur une séance qui n’a plus qu’une place, et corrige le code si plus d’une inscription réussit.',
            reponse:
              'Le test échouait : deux inscriptions réussissaient. La séance est maintenant verrouillée pendant l’inscription et le test passe.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'Deux personnes obtenaient la dernière place en même temps.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'cours-yoga',
        capture: true,
        texteAlternatif: 'Cours de yoga complet avec trois personnes en liste d’attente',
      },
    ],
    utiles: 128,
    utilesSemaine: 20,
  },
  {
    cle: 'logo-tontine',
    auteur: 'ousmane-sy',
    type: 'ITERATION',
    titre: 'Logo d’une application de tontine',
    objectif: 'Un logo simple, lisible sur une icône d’application, avec le nom exact.',
    categorie: 'Identité visuelle',
    licence: 'CC-BY-4.0',
    formatResultat: 'Logo d’application',
    aAdapter: ['Le nom de l’application', 'Les couleurs du symbole', 'La taille de l’icône'],
    etiquettes: ['Logo', 'Finance', 'Application mobile'],
    publication: '2026-10-05T18:20',
    etapes: [
      {
        configurations: [{ outil: 'Ideogram', modele: '3.0' }],
        echanges: [
          {
            titre: 'Premier logo',
            prompt:
              'Logo pour une application de tontine appelée Natt : trois cercles qui se rejoignent, bleu nuit et ocre, le nom en dessous, fond blanc.',
            reponse:
              'Le symbole convient, mais le nom est écrit « Nat » sur trois essais sur quatre.',
          },
          {
            titre: 'Écrire le nom exact',
            prompt:
              'Logo pour « Natt » : trois cercles qui se rejoignent, trait épais, bleu nuit et ocre, le nom en dessous en minuscules, fond blanc, aucun autre texte.',
            reponse: 'Le nom « natt » est correct sur les quatre essais.',
          },
          {
            titre: 'Tester en petit format',
            prompt:
              'Montre le symbole seul en 32 × 32 pixels, sur fond blanc puis sur fond bleu nuit.',
            reponse:
              'À 32 pixels, les trois cercles restent distincts grâce au trait épais ; la version ocre sur bleu nuit est la plus lisible.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication: 'Le nom apparaissait « Nat » : il a été placé entre guillemets.',
            echange: 1,
          },
          {
            type: 'VERIFICATION',
            explication: 'Le symbole reste lisible à 32 pixels.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'logo-tontine',
        capture: true,
        texteAlternatif: 'Logo de trois cercles entrelacés avec le nom Natt',
      },
    ],
    utiles: 118,
    utilesSemaine: 33,
    reproductions: {
      configurations: [
        { outil: 'Ideogram', modele: '3.0', essais: 5, reussis: 4 },
        { outil: 'Recraft', modele: 'V3', essais: 2, reussis: 1 },
      ],
      dernier: { date: '2026-10-10T18:30', outil: 'Recraft', modele: 'V3' },
    },
  },
  {
    cle: 'trier-telechargements',
    auteur: 'mariam-diop',
    type: 'UN_PROMPT',
    titre: 'Script qui range le dossier Téléchargements',
    objectif:
      'Ranger des centaines de fichiers par type, sans rien supprimer ni déplacer par erreur.',
    categorie: 'Code et scripts',
    licence: 'CC-BY-4.0',
    formatResultat: 'Script Python',
    aAdapter: ['Le dossier à ranger', 'Les types de fichiers', 'Les fichiers à ignorer'],
    etiquettes: ['Python', 'Fichiers', 'Rangement'],
    publication: '2026-10-10T11:26',
    etapes: [
      {
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Écris un script Python qui range les fichiers du dossier Téléchargements dans des sous-dossiers par type (Images, Documents, Archives). Commence par un mode simulation qui liste les déplacements prévus, ne supprime jamais rien et ignore les fichiers en cours de téléchargement.',
            reponse:
              'Voici le script. Par défaut, il affiche les déplacements prévus sans rien toucher ; ajoutez --appliquer pour les effectuer. Les fichiers en cours de téléchargement sont ignorés et rien n’est jamais supprimé.\n\n```python\nfrom pathlib import Path\nimport shutil\nimport sys\n\nTYPES = {\n    "Images": {".jpg", ".jpeg", ".png", ".webp", ".gif"},\n    "Documents": {".pdf", ".docx", ".xlsx", ".txt"},\n    "Archives": {".zip", ".rar", ".7z"},\n}\nEN_COURS = {".crdownload", ".part", ".tmp"}\n\n\ndef ranger(dossier, appliquer=False):\n    for fichier in sorted(dossier.iterdir()):\n        if not fichier.is_file() or fichier.suffix.lower() in EN_COURS:\n            continue\n        for nom, extensions in TYPES.items():\n            if fichier.suffix.lower() in extensions:\n                cible = dossier / nom / fichier.name\n                print(fichier.name, "→", f"{nom}/")\n                if appliquer and not cible.exists():\n                    cible.parent.mkdir(exist_ok=True)\n                    shutil.move(fichier, cible)\n                break\n\n\nif __name__ == "__main__":\n    ranger(Path.home() / "Downloads", appliquer="--appliquer" in sys.argv)\n```',
            essais: 2,
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'La simulation a montré que les fichiers en cours de téléchargement auraient été déplacés.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'trier-telechargements',
        capture: true,
        texteAlternatif:
          'Simulation listant les déplacements prévus vers les dossiers Images, Documents et Archives',
      },
    ],
    utiles: 136,
    utilesSemaine: 58,
    reproductions: {
      configurations: [
        { outil: 'Claude', modele: 'Sonnet 4.5', essais: 12, reussis: 11 },
        { outil: 'ChatGPT', modele: 'GPT-5', essais: 5, reussis: 4 },
        { outil: 'DeepSeek', modele: 'V3.2', essais: 2, reussis: 2 },
      ],
      dernier: { date: '2026-10-13T18:30', outil: 'ChatGPT', modele: 'GPT-5' },
    },
  },
  {
    cle: 'affiche-1',
    auteur: 'ibrahima-sow',
    type: 'ITERATION',
    titre: 'Saint-Louis, les pirogues de Guet Ndar',
    objectif:
      'Une affiche de voyage pour Saint-Louis, où les pirogues peintes guident le regard vers le titre.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-12T09:10',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'Midjourney', modele: 'v7' }],
        echanges: [
          {
            titre: 'Décrire le lieu et fixer la composition verticale',
            prompt:
              'Une affiche touristique de Saint-Louis au Sénégal. Pirogues peintes au premier plan, façades coloniales en arrière-plan. Composition verticale, lumière de fin de journée. Texte exact : « Saint-Louis ».',
          },
          {
            titre: 'Réduire le nombre de pirogues pour dégager le titre',
            prompt:
              'Réduis le nombre de pirogues à trois et dégage le haut de l’image pour le titre.',
          },
          {
            titre: 'Corriger le texte et vérifier sa lisibilité en petit format',
            prompt:
              'Le titre est mal orthographié. Écris exactement « Saint-Louis » et vérifie qu’il reste lisible en petit format.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Les pirogues guident le regard vers le titre.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'affiche-saint-louis',
        texteAlternatif: 'Pirogues peintes amarrées devant les façades coloniales de Saint-Louis',
      },
    ],
    utiles: 7,
    utilesSemaine: 7,
  },
  {
    cle: 'affiche-2',
    auteur: 'mariam-diop',
    type: 'ITERATION',
    titre: 'Gorée, la maison aux volets bleus',
    objectif: 'Une affiche épurée de Gorée, où une seule façade suffit à évoquer l’île.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-12T14:30',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'Flux', modele: '1.1 Pro' }],
        echanges: [
          {
            titre: 'Décrire la façade et la palette du lieu',
            prompt:
              'Affiche de voyage pour Gorée, Sénégal. Une façade ocre et des volets bleus, lumière douce, composition épurée. Réserver le haut de l’image au titre exact « Gorée ».',
          },
          {
            titre: 'Simplifier l’arrière-plan et replacer le titre',
            prompt: 'Simplifie l’arrière-plan et replace le titre « Gorée » en haut de l’image.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Une seule façade suffit à évoquer le lieu.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      { fichier: 'goree', texteAlternatif: 'Façade ocre aux volets bleus sur l’île de Gorée' },
    ],
    utiles: 6,
    utilesSemaine: 6,
  },
  {
    cle: 'affiche-3',
    auteur: 'lea-martin',
    type: 'ITERATION',
    titre: 'Chefchaouen, la ville bleue',
    objectif:
      'Une affiche lumineuse de Chefchaouen, où un oranger équilibre les bleus de la ville.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-12T19:45',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT Image 1' }],
        echanges: [
          {
            titre: 'Définir le point de vue et les éléments du lieu',
            prompt:
              'Une affiche touristique de Chefchaouen au Maroc. Ruelle aux murs bleus, escalier et oranger. Illustration lumineuse. Titre exact : « Chefchaouen ».',
          },
          {
            titre: 'Ajouter un oranger pour équilibrer les bleus',
            prompt: 'Ajoute un oranger dans la ruelle pour équilibrer les bleus.',
          },
          {
            titre: 'Agrandir le titre et retirer les petits textes inutiles',
            prompt: 'Agrandis le titre « Chefchaouen » et retire les petits textes inutiles.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'L’oranger apporte le contraste qui manquait.',
            echange: 1,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'affiche-chefchaouen',
        texteAlternatif: 'Ruelle bleue de Chefchaouen sous un oranger',
      },
    ],
    utiles: 5,
    utilesSemaine: 5,
  },
  {
    cle: 'affiche-4',
    auteur: 'samuel-owusu',
    type: 'ITERATION',
    titre: 'Cape Coast au lever du jour',
    objectif: 'Une affiche typographique de Cape Coast, construite autour du nom du lieu.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-13T08:20',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'Ideogram', modele: '3.0' }],
        echanges: [
          {
            titre: 'Composer l’affiche autour du nom du lieu',
            prompt:
              'Affiche typographique pour Cape Coast au Ghana. Nom du lieu très lisible, bleu profond et blanc. Sous-titre exact : « Au lever du jour ».',
          },
          {
            titre: 'Ajuster les espacements et vérifier chaque lettre',
            prompt:
              'Augmente l’espace entre les lettres du titre et vérifie l’orthographe de chaque mot.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Le nom du lieu devient le centre de la composition.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      { fichier: 'affiche-4', capture: true, texteAlternatif: 'Cape Coast au lever du jour' },
    ],
    utiles: 3,
    utilesSemaine: 3,
  },
  {
    cle: 'affiche-5',
    auteur: 'esther-kouassi',
    type: 'ITERATION',
    titre: 'Grand-Bassam, la plage du phare',
    objectif: 'Une affiche typographique de Grand-Bassam qui réserve une vraie place au texte.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-13T11:40',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'Midjourney', modele: 'v7' }],
        echanges: [
          {
            titre: 'Poser le nom et le sous-titre',
            prompt:
              'Affiche typographique touristique : « Grand-Bassam ». Sous-titre : « La plage du phare ». Bleu et blanc, composition verticale et grands espaces.',
          },
          {
            titre: 'Réduire les éléments secondaires',
            prompt: 'Réduis les éléments secondaires : garde le phare et la ligne d’horizon.',
          },
          {
            titre: 'Vérifier le contraste et l’orthographe',
            prompt:
              'Vérifie le contraste du titre sur le fond et l’orthographe de « Grand-Bassam ».',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication: 'La composition réserve une vraie place au texte.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      { fichier: 'affiche-5', capture: true, texteAlternatif: 'Grand-Bassam, la plage du phare' },
    ],
    utiles: 3,
    utilesSemaine: 3,
  },
  {
    cle: 'affiche-6',
    auteur: 'ndeye-fall',
    type: 'ITERATION',
    titre: 'Ziguinchor, au fil des bolongs',
    objectif:
      'Une affiche de Ziguinchor qui part d’une photographie des bolongs pour ancrer l’image dans le lieu.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    formatResultat: 'Affiche · 2:3',
    aAdapter: ['Le lieu et son titre', 'La palette de l’affiche', 'Le texte de l’affiche'],
    etiquettes: ['Affiche', 'Tourisme', 'Voyage'],
    publication: '2026-10-13T15:05',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT Image 1' }],
        echanges: [
          {
            titre: 'Partir d’une photographie du paysage',
            prompt:
              'Créer une affiche touristique de Ziguinchor à partir d’une photographie des bolongs. Préserver le paysage. Texte exact : « Ziguinchor ». Composition verticale, titre lisible.',
          },
          {
            titre: 'Simplifier la composition et poser le titre',
            prompt:
              'Simplifie la composition et place le titre « Ziguinchor » en haut de l’affiche.',
          },
          {
            titre: 'Corriger le texte sans modifier le lieu',
            prompt: 'Corrige l’orthographe du titre sans modifier le paysage.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Une photographie de départ ancre l’affiche dans le lieu.',
            echange: 0,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'affiche-ziguinchor',
        texteAlternatif:
          'Affiche de Ziguinchor : une pirogue sur un bolong au lever du soleil, entre les palétuviers, sous le titre « Ziguinchor ».',
      },
    ],
    utiles: 2,
    utilesSemaine: 2,
  },
  {
    cle: 'clarisse-iteration',
    auteur: 'clarisse-mendy',
    type: 'ITERATION',
    titre: 'Affiche touristique de Ziguinchor en trois prompts',
    objectif:
      'Une affiche de voyage pour Ziguinchor, lisible de loin, qui donne envie de prendre la pirogue sur la Casamance.',
    limites:
      'Le fromager change de forme à chaque génération et les palétuviers restent très stylisés. Relisez le titre et le sous-titre lettre par lettre.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    etiquettes: ['Affiche', 'Voyage', 'Sérigraphie', 'Casamance'],
    publication: '2026-10-12T09:12',
    modification: '2026-10-12T22:10',
    etapes: [
      {
        configurations: [
          { outil: 'ChatGPT', modele: 'GPT Image 1', parametres: 'Format portrait 2:3' },
        ],
        echanges: [
          {
            prompt:
              'Crée une affiche touristique de Ziguinchor, au Sénégal. Une pirogue glisse sur le fleuve Casamance au lever du soleil, des palétuviers sur les rives, un grand fromager à gauche. En haut, le titre « ZIGUINCHOR » ; en bas, « Casamance · Sénégal ». Format portrait 2:3.',
            reponse:
              'Voici une affiche de Ziguinchor : une pirogue sur la Casamance au lever du soleil, entre les palétuviers, avec un grand fromager au premier plan.',
            images: [
              {
                fichier: 'ziguinchor-photo',
                texteAlternatif:
                  'Premier essai au rendu photographique : un piroguier sur une eau calme, sous un ciel rose.',
              },
            ],
          },
          {
            prompt:
              'Le rendu est trop photographique, on dirait une photo retouchée. Je veux une affiche de voyage en sérigraphie : des aplats, cinq couleurs au maximum, aucun dégradé. Garde la même composition.',
            reponse:
              'J’ai repris la composition en sérigraphie, avec cinq aplats : bleu nuit, ocre, vert mangrove, corail et crème.',
            images: [
              {
                fichier: 'affiche-ziguinchor-essai',
                texteAlternatif:
                  'Deuxième essai en sérigraphie ; le titre est mal orthographié « ZINGUICHOR ».',
              },
            ],
          },
          {
            prompt:
              'Le titre est mal écrit : « ZINGUICHOR ». Écris exactement « ZIGUINCHOR », sans rien changer d’autre à l’image.',
            reponse:
              'C’est corrigé : le titre indique désormais « ZIGUINCHOR ». Le reste de l’affiche est identique.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Le premier rendu ressemblait à une photo retouchée. Nommer la technique, la sérigraphie, et limiter la palette à cinq aplats a suffi pour obtenir une vraie affiche, sans toucher à la composition.',
            echange: 1,
          },
          {
            type: 'VERIFICATION',
            explication:
              'J’ai relu le titre lettre par lettre : l’IA avait écrit « ZINGUICHOR ». Demander le mot exact entre guillemets, sans autre changement, a corrigé le titre sans perdre le reste de l’image.',
            echange: 2,
          },
        ],
      },
    ],
    images: [
      {
        fichier: 'affiche-ziguinchor',
        texteAlternatif:
          'Affiche en sérigraphie : pirogue sur la Casamance au lever du soleil, fromager à gauche, titre « ZIGUINCHOR » et sous-titre « Casamance · Sénégal ».',
      },
    ],
    utiles: 2,
    vues: 286,
    reproductions: {
      configurations: [{ outil: 'ChatGPT', modele: 'GPT Image 1', essais: 1, reussis: 1 }],
    },
    obsolescence: { modele: 'GPT Image 1', membres: 2, depuis: '2026-10-12T21:00' },
    commentaires: [
      {
        auteur: 'ibrahima-sow',
        date: '2026-10-12T20:15',
        corps: 'Le titre reste lisible même en vignette. Vous la proposez au défi de la semaine ?',
      },
      {
        auteur: 'kofi-mensah',
        date: '2026-10-13T10:05',
        corps:
          'Le fromager à gauche équilibre très bien la pirogue. Vous avez imposé la police du titre dès le premier prompt, ou seulement au troisième ?',
      },
    ],
  },
  {
    cle: 'clarisse-prompt',
    auteur: 'clarisse-mendy',
    type: 'UN_PROMPT',
    titre: 'Renommer des photos d’après leur date de prise de vue',
    objectif:
      'Un script qui renomme plusieurs centaines de photos d’après leur date de prise de vue, sans jamais écraser un fichier.',
    limites:
      'Les photos sans date de prise de vue, comme les captures d’écran ou les images reçues par messagerie, gardent leur nom. Le script ne parcourt pas les sous-dossiers.',
    resultat: {
      nature: 'CODE',
      nom: 'renommer_photos.py',
      texte:
        'from pathlib import Path\nfrom PIL import Image\nimport sys\n\nDATE_EXIF = 36867  # DateTimeOriginal\n\n\ndef lire_date(photo):\n    with Image.open(photo) as image:\n        valeur = image.getexif().get_ifd(0x8769).get(DATE_EXIF)\n    if not valeur:\n        return None\n    return valeur.replace(":", "-", 2).replace(" ", "_").replace(":", "")\n\n\ndef renommer(dossier, simulation=True):\n    pris = set()\n    for photo in sorted(Path(dossier).glob("*.jpg")):\n        date = lire_date(photo)\n        if not date:\n            print("Sans date :", photo.name)\n            continue\n        nom, n = f"{date}.jpg", 2\n        while nom in pris or (photo.with_name(nom).exists() and photo.name != nom):\n            nom, n = f"{date}-{n}.jpg", n + 1\n        pris.add(nom)\n        print(photo.name, "→", nom)\n        if not simulation:\n            photo.rename(photo.with_name(nom))\n\n\nif __name__ == "__main__":\n    renommer(sys.argv[1], simulation="--renommer" not in sys.argv)\n',
    },
    categorie: 'Code et scripts',
    licence: 'CC-BY-4.0',
    etiquettes: ['Python', 'Photos', 'EXIF'],
    publication: '2026-10-08T16:38',
    modification: '2026-10-12T21:40',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Écris un script Python qui renomme toutes les photos JPEG d’un dossier d’après leur date de prise de vue (EXIF), au format AAAA-MM-JJ_HHMMSS.jpg. Si deux photos ont la même date, ajoute un suffixe -2, -3. Ajoute un mode simulation, actif par défaut, qui affiche les changements sans rien renommer. N’utilise que Pillow.',
            reponse:
              'Voici le script. Il lit la date de prise de vue avec Pillow, affiche les nouveaux noms en mode simulation et ne renomme qu’avec l’option --renommer.\n\n```python\nfrom pathlib import Path\nfrom PIL import Image\nimport sys\n\nDATE_EXIF = 36867  # DateTimeOriginal\n\n\ndef lire_date(photo):\n    with Image.open(photo) as image:\n        valeur = image.getexif().get_ifd(0x8769).get(DATE_EXIF)\n    if not valeur:\n        return None\n    return valeur.replace(":", "-", 2).replace(" ", "_").replace(":", "")\n\n\ndef renommer(dossier, simulation=True):\n    pris = set()\n    for photo in sorted(Path(dossier).glob("*.jpg")):\n        date = lire_date(photo)\n        if not date:\n            print("Sans date :", photo.name)\n            continue\n        nom, n = f"{date}.jpg", 2\n        while nom in pris or (photo.with_name(nom).exists() and photo.name != nom):\n            nom, n = f"{date}-{n}.jpg", n + 1\n        pris.add(nom)\n        print(photo.name, "→", nom)\n        if not simulation:\n            photo.rename(photo.with_name(nom))\n\n\nif __name__ == "__main__":\n    renommer(sys.argv[1], simulation="--renommer" not in sys.argv)\n```',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'J’ai lancé la simulation sur une copie de 30 photos, dont deux prises en rafale à la même seconde. Les noms proposés étaient justes et aucune photo n’était écrasée : je n’ai renommé les vraies photos qu’ensuite.',
            echange: 0,
          },
        ],
      },
    ],
    utiles: 1,
    vues: 412,
    reproductions: {
      configurations: [{ outil: 'ChatGPT', modele: 'GPT-5', essais: 3, reussis: 2 }],
    },
    commentaires: [
      {
        auteur: 'koffi-amoussou',
        date: '2026-10-09T17:50',
        corps:
          'Précisez peut-être qu’il faut installer Pillow avant le premier lancement : j’ai cherché un moment.',
      },
      {
        auteur: 'hugo-girard',
        date: '2026-10-11T11:20',
        corps:
          'Le suffixe en cas de doublon m’a évité une belle erreur : 40 photos prises en rafale pendant un mariage.',
      },
    ],
  },
  {
    cle: 'clarisse-projet',
    auteur: 'clarisse-mendy',
    type: 'PROJET',
    titre: 'Réservation des sorties en pirogue d’un campement',
    objectif:
      'Permettre aux voyageurs de réserver une sortie en pirogue dans les bolongs, sans jamais dépasser les sept places de chaque départ.',
    limites:
      'Les groupes de plus de sept voyageurs doivent encore appeler le campement. Les rappels par SMS la veille du départ restent à faire.',
    categorie: 'Application web',
    licence: 'CC-BY-NC-4.0',
    etiquettes: ['Réservation', 'Sécurité', 'Fuseau horaire', 'Supabase'],
    publication: '2026-10-03T17:55',
    modification: '2026-10-10T23:05',
    etapes: [
      {
        titre: 'Écrire les règles avant de générer',
        recit:
          'Avant de générer quoi que ce soit, j’ai fait reformuler nos règles. La liste obtenue a servi de cahier des charges pour toute la suite.',
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Voici comment fonctionnent les sorties en pirogue du campement Les Bolongs, à Cap Skirring. Deux départs par jour, à 9 h et à 15 h. Huit places par pirogue, guide compris. Annulation gratuite jusqu’à la veille à 18 h. Reformule ces règles en une liste numérotée, puis signale ce qui reste ambigu.',
            reponse:
              'Voici les règles reformulées, et deux points ambigus : un enfant occupe-t-il une place ? Que devient une réservation si la marée décale le départ ?',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication:
              'Demander ce qui restait ambigu a fait apparaître deux règles jamais écrites : un enfant occupe une place, et un départ décalé par la marée reste réservé. Sans elles, l’application aurait été fausse dès le départ.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Générer l’application sans compte client',
        recit: 'Une première version complète en un prompt, dont je n’ai gardé que la réservation.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Crée une application de réservation pour le campement Les Bolongs à partir de ces règles : choix du départ, nombre de places, nom et téléphone. Affiche les places restantes pour chaque départ.',
            reponse:
              'L’application est prête : calendrier des départs, formulaire de réservation, création d’un compte client et tableau de bord des réservations.',
          },
          {
            prompt:
              'Retire la création de compte. On réserve avec un nom, un numéro de téléphone et le nombre de places, puis on reçoit un lien d’annulation par SMS.',
          },
        ],
        moments: [
          {
            type: 'REFUS',
            explication:
              'Lovable imposait un compte client pour réserver. Je l’ai refusé : les voyageurs réservent une seule fois, un lien d’annulation suffit et nous conservons moins de données personnelles.',
            echange: 1,
          },
        ],
      },
      {
        titre: 'Refuser une place de trop dans la base',
        recit: 'J’ai testé en envoyant deux réservations à la même seconde depuis deux téléphones.',
        configurations: [{ outil: 'Lovable' }],
        echanges: [
          {
            prompt:
              'Deux familles ont réservé en même temps les deux dernières places du départ de 15 h : la pirogue compte maintenant neuf voyageurs pour sept places. Vérifie le nombre de places au moment d’enregistrer la réservation, dans la base, pas seulement à l’écran.',
            reponse:
              'Une contrainte dans la base refuse désormais toute réservation au-delà des places restantes, même lorsque deux demandes arrivent à la même seconde.',
          },
        ],
        moments: [
          {
            type: 'VERIFICATION',
            explication:
              'En simulant deux réservations simultanées, la pirogue de 15 h est passée à neuf voyageurs pour sept places. Le contrôle à l’écran ne suffisait pas : la base refuse désormais toute réservation au-delà des places restantes.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Afficher les départs à l’heure de Dakar',
        recit: 'Un voyageur à Paris voyait le départ de 9 h affiché à 11 h.',
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Un voyageur qui réserve depuis Paris voit le départ de 9 h affiché à 11 h. Pourquoi, et comment le corriger ?',
            reponse:
              'Les heures sont enregistrées sans fuseau horaire. Enregistrez-les avec le fuseau Africa/Dakar et affichez toujours l’heure du campement.',
          },
        ],
        moments: [
          {
            type: 'CHANGEMENT_OUTIL',
            explication:
              'Lovable ne trouvait pas l’origine du décalage. J’ai changé d’outil pour faire lire le code et comprendre que le problème venait de l’enregistrement des heures, pas de leur affichage.',
          },
          {
            type: 'CORRECTION',
            explication:
              'Les départs étaient enregistrés sans fuseau horaire. Ils le sont désormais avec celui de Dakar, et la page précise « heure de Dakar » à côté de chaque départ.',
            echange: 0,
          },
        ],
      },
      {
        titre: 'Mettre en ligne',
        recit:
          'Mise en ligne le 2 octobre sur le site du campement. Les vingt premières réservations sont passées sans erreur.',
        configurations: [],
        echanges: [],
        moments: [],
      },
    ],
    liens: [
      {
        type: 'DEMO',
        url: 'https://reservations.lesbolongs.example',
        libelle: 'Réserver une sortie',
      },
      { type: 'DEPOT_CODE', url: 'https://depot.example/clarisse-mendy/bolongs-reservations' },
    ],
    images: [
      {
        fichier: 'bolongs-reservation',
        texteAlternatif:
          'Écran de réservation du campement : départ de 15 h, 3 places restantes sur 7, heure de Dakar indiquée.',
      },
    ],
    utiles: 4,
    vues: 586,
    commentaires: [
      {
        auteur: 'claire-dubois',
        date: '2026-10-04T11:00',
        corps:
          'Très clair. Ajoutez la capture de l’erreur de fuseau horaire : le moment clé se comprendrait d’un coup d’œil.',
      },
      {
        auteur: 'lea-martin',
        date: '2026-10-05T16:10',
        corps:
          'Le passage à l’heure de Dakar m’a fait revoir mes propres réservations. Merci pour ce détail.',
      },
      {
        auteur: 'awa-sarr',
        date: '2026-10-06T10:15',
        corps: 'Le gérant reçoit-il un message quand une sortie est complète ?',
        reponses: [
          {
            auteur: 'clarisse-mendy',
            date: '2026-10-06T12:40',
            corps: 'Oui, un message lui part dès que la dernière place est réservée.',
          },
        ],
      },
      {
        auteur: 'ousmane-sy',
        date: '2026-10-08T19:45',
        corps:
          'Bonne idée d’écrire les règles avant de générer. Vous pourriez joindre la liste obtenue à la première étape ?',
        reponses: [
          {
            auteur: 'clarisse-mendy',
            date: '2026-10-08T21:02',
            corps: 'Bonne idée, je l’ajoute à la première étape ce week-end.',
          },
        ],
      },
      {
        auteur: 'moussa-diallo',
        date: '2026-10-10T09:40',
        corps:
          'Comment avez-vous envoyé les deux réservations à la même seconde ? Avec deux téléphones en main ?',
        reponses: [
          {
            auteur: 'clarisse-mendy',
            date: '2026-10-10T12:15',
            corps:
              'Oui, deux téléphones et le même départ, envoyés au même moment. La seconde réservation a bien été refusée.',
          },
        ],
      },
    ],
  },
  {
    cle: 'clarisse-avis',
    auteur: 'clarisse-mendy',
    type: 'UN_PROMPT',
    titre: 'Répondre aux avis des voyageurs d’un campement',
    objectif:
      'Une réponse courte et personnelle à chaque avis laissé sur le campement : remercier pour un détail précis et dire ce qui change quand un voyageur signale un problème.',
    limites:
      'Un avis rédigé en anglais reçoit une réponse en français si la langue n’est pas précisée.',
    categorie: 'Texte et rédaction',
    licence: 'CC-BY-4.0',
    etiquettes: ['Avis clients', 'Tourisme', 'Ton'],
    modification: '2026-10-13T11:20',
    etapes: [
      {
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Voici trois avis laissés sur le campement Les Bolongs, à Cap Skirring. Rédige une réponse pour chacun : 60 mots au plus, en vouvoyant, sans formule toute faite. Remercie pour un détail précis de l’avis et, s’il y a un reproche, dis ce que nous changeons.',
            reponse:
              'Merci d’avoir remarqué le calme du bolong au lever du soleil : c’est aussi le départ préféré de notre guide. Vous avez attendu votre pirogue vingt minutes ; nous envoyons désormais un message dès que le départ est confirmé.',
          },
        ],
        moments: [
          {
            type: 'CORRECTION',
            explication:
              'Les premières réponses commençaient toutes par « Merci pour votre retour ». Demander de remercier pour un détail précis de chaque avis a suffi à les rendre personnelles.',
            echange: 0,
          },
        ],
      },
    ],
    utiles: 0,
  },
  {
    cle: 'clarisse-kafountine',
    auteur: 'clarisse-mendy',
    type: 'ITERATION',
    titre: 'Affiche du festival de Kafountine en trois échanges',
    objectif:
      'Une affiche pour le festival de musique de Kafountine, lisible de loin, avec la date et le lieu écrits sans faute.',
    categorie: 'Image et illustration',
    licence: 'CC-BY-4.0',
    etiquettes: ['Affiche', 'Festival', 'Casamance'],
    modification: '2026-10-13T09:05',
    defi: 'une-affiche-touristique-en-trois-echanges',
    etapes: [
      {
        configurations: [
          { outil: 'ChatGPT', modele: 'GPT Image 1', parametres: 'Format portrait 2:3' },
        ],
        echanges: [
          {
            prompt:
              'Crée une affiche pour le festival de musique de Kafountine, en Casamance : des djembés et des pirogues sur la plage au coucher du soleil. En haut, « KAFOUNTINE » ; en bas, « Festival · 20 et 21 février ».',
            reponse:
              'Voici l’affiche : des pirogues colorées sur la plage, des djembés au premier plan, le titre en haut et les dates en bas.',
          },
          {
            prompt:
              'Les dates sont illisibles de loin. Agrandis la ligne du bas et passe-la en blanc sur un aplat bleu nuit, sans rien changer d’autre.',
            reponse:
              'La ligne des dates est maintenant deux fois plus grande, en blanc sur un aplat bleu nuit.',
          },
          {
            prompt:
              'Vérifie l’orthographe de chaque mot de l’affiche et corrige uniquement ce qui est faux.',
          },
        ],
        moments: [],
      },
    ],
    utiles: 0,
  },
  {
    cle: 'clarisse-marees',
    auteur: 'clarisse-mendy',
    type: 'ITERATION',
    titre: 'Horaires des sorties en pirogue selon les marées',
    objectif: '',
    categorie: '',
    licence: 'CC-BY-4.0',
    etiquettes: ['Marées', 'Planning'],
    modification: '2026-10-12T22:47',
    etapes: [
      {
        configurations: [{ outil: 'ChatGPT', modele: 'GPT-5' }],
        echanges: [
          {
            prompt:
              'Voici l’annuaire des marées de Ziguinchor pour novembre. Propose deux horaires de départ par jour pour une sortie de deux heures dans les bolongs, en évitant la marée basse.',
            reponse:
              'Voici un tableau des départs conseillés pour chaque jour de novembre, avec l’heure de pleine mer et la marge avant la basse mer.',
          },
          {
            prompt:
              'Le 14 novembre, ton départ de 16 h tombe en pleine marée basse. Vérifie chaque ligne avec l’heure de basse mer et signale les journées où aucun départ n’est possible.',
          },
        ],
        moments: [],
      },
    ],
    utiles: 0,
  },
  {
    cle: 'clarisse-commandes',
    auteur: 'clarisse-mendy',
    type: 'PROJET',
    titre: 'Suivi des commandes de jus de bouye d’une boutique',
    objectif:
      'Un tableau partagé où la boutique note chaque commande de jus de bouye, et un message WhatsApp prêt à envoyer quand la commande est prête.',
    limites: 'Les commandes passées par téléphone sont encore saisies à la main.',
    categorie: 'Automatisation',
    licence: 'CC-BY-NC-4.0',
    etiquettes: ['Commandes', 'Tableur', 'WhatsApp'],
    modification: '2026-10-06T19:12',
    etapes: [
      {
        titre: 'Décrire la journée de la boutique',
        recit:
          'J’ai noté avec la gérante comment arrivent les commandes, qui les prépare et quand les clients passent les chercher. Ce récit a servi de base à tout le reste.',
        configurations: [{ outil: 'Claude', modele: 'Sonnet 4.5' }],
        echanges: [
          {
            prompt:
              'Voici comment la boutique reçoit et prépare les commandes de jus de bouye. Propose les colonnes d’un tableau de suivi, avec un statut pour chaque étape.',
            reponse:
              'Colonnes proposées : client, téléphone, quantité, parfum, date de retrait et statut (reçue, en préparation, prête, retirée).',
          },
        ],
        moments: [],
      },
      {
        titre: 'Prévenir le client quand c’est prêt',
        recit:
          'Quand une commande passe au statut « prête », un message est préparé avec le prénom du client et l’heure de fermeture.',
        configurations: [{ outil: 'Make' }],
        echanges: [
          {
            prompt:
              'Quand une ligne passe au statut « prête », prépare un message WhatsApp avec le prénom du client, la quantité et l’heure de fermeture de la boutique. Ne l’envoie pas : je le valide d’abord.',
            reponse:
              'Le scénario prépare le message dans WhatsApp Business ; l’envoi reste manuel.',
          },
        ],
        moments: [],
      },
    ],
    utiles: 0,
  },
  {
    cle: 'clarisse-esquisse',
    auteur: 'clarisse-mendy',
    type: 'UN_PROMPT',
    titre: '',
    objectif: '',
    categorie: '',
    licence: 'CC-BY-4.0',
    etiquettes: [],
    modification: '2026-10-02T21:30',
    etapes: [
      {
        configurations: [{ outil: 'Gemini', modele: '2.5 Flash' }],
        echanges: [{ prompt: 'Fais-moi un logo pour' }],
        moments: [],
      },
    ],
    utiles: 0,
  },
];

export const RETOURS_REPRODUCTION: { PARTIEL: string[]; ECHEC: string[] } = {
  PARTIEL: [
    'Le résultat ressemble à l’original, mais il a fallu reformuler une partie de la demande.',
    'La structure est la bonne ; quelques détails diffèrent et demandent une seconde passe.',
    'Résultat proche, mais moins précis : j’ai dû ajouter une consigne pour retrouver l’effet décrit.',
    'Le principe fonctionne, mais le modèle n’a pas respecté toutes les contraintes du prompt.',
    'Bon point de départ ; le résultat final m’a demandé deux corrections.',
  ],
  ECHEC: [
    'Le modèle s’écarte de la demande dès la première réponse : je n’ai pas obtenu le résultat décrit.',
    'Je n’ai pas réussi à reproduire le résultat, même en relançant la demande plusieurs fois.',
    'Le résultat obtenu ne correspond pas à celui de la fiche ; une précision manque sans doute à mon essai.',
  ],
};
