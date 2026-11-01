import type { ComplementSavoirDemo } from '../types.js';

/* Savoirs d'Apprendre (prototype, apprendre-data.js : examples, links.topic) : moments clés de la
   communauté qui les illustrent (« Vu dans la communauté ») et sujet du forum de « Pour aller plus
   loin ». Une illustration désigne une création par sa clé, puis le rang de son moment clé dans le
   parcours (à partir de 0) ou une note de l'équipe. */
export const COMPLEMENTS_SAVOIRS: ComplementSavoirDemo[] = [
  {
    savoir: 'outil-et-modele',
    exemples: [
      [
        'lettre-motivation',
        'Reproduite avec succès sur Mistral Large 2, Claude Sonnet 4.5 et GPT-5 : la méthode ne dépend pas d’un seul modèle.',
      ],
    ],
    sujet: null,
  },
  {
    savoir: 'demande-claire',
    exemples: [
      ['lettre-motivation', 0],
      ['avis-restaurant', 0],
    ],
    sujet: 'sujet-6',
  },
  {
    savoir: 'reponses-differentes',
    exemples: [['affiche-alpes', 0]],
    sujet: null,
  },
  {
    savoir: 'ce-que-ia-ignore',
    exemples: [
      ['traduction-glossaire', 0],
      ['avis-restaurant', 0],
    ],
    sujet: 'sujet-11',
  },
  {
    savoir: 'une-chose-a-la-fois',
    exemples: [
      ['portrait-gouache', 0],
      ['facade-goree', 0],
    ],
    sujet: null,
  },
  {
    savoir: 'verifier-avant-reprendre',
    exemples: [
      ['ventes-boutique', 0],
      ['quiz-histoire', 0],
    ],
    sujet: 'sujet-4',
  },
  {
    savoir: 'garder-la-main',
    exemples: [
      ['relance-devis', 0],
      ['factures-auto', 0],
    ],
    sujet: 'sujet-5',
  },
  {
    savoir: 'noter-moments-cles',
    exemples: [
      ['keur-awa', 0],
      ['keur-awa', 1],
    ],
    sujet: null,
  },
  {
    savoir: 'agent',
    exemples: [['extension-navigateur', 0]],
    sujet: 'sujet-14',
  },
  {
    savoir: 'donnee-personnelle',
    exemples: [['agenda-kine', 1]],
    sujet: null,
  },
  {
    savoir: 'exemple-demande',
    exemples: [['avis-restaurant', 0]],
    sujet: null,
  },
  {
    savoir: 'hallucination',
    exemples: [['resume-canal', 0]],
    sujet: null,
  },
  {
    savoir: 'image-reference',
    exemples: [['icones-3d', 0]],
    sujet: 'sujet-1',
  },
  {
    savoir: 'iteration',
    exemples: [['portrait-gouache', 0]],
    sujet: null,
  },
  {
    savoir: 'mode-simulation',
    exemples: [
      ['renommer-photos', 0],
      ['trier-telechargements', 0],
    ],
    sujet: null,
  },
  {
    savoir: 'moment-cle',
    exemples: [['keur-awa', 0]],
    sujet: null,
  },
  {
    savoir: 'recalculer-chiffre',
    exemples: [
      ['ventes-boutique', 0],
      ['ventes-boutique', 1],
      ['requete-sql', 0],
    ],
    sujet: 'sujet-8',
  },
  {
    savoir: 'retrouver-source',
    exemples: [
      ['quiz-histoire', 0],
      ['fiches-revision', 0],
    ],
    sujet: 'sujet-17',
  },
  {
    savoir: 'tests-du-modele',
    exemples: [
      ['extension-navigateur', 1],
      ['requete-sql', 0],
    ],
    sujet: 'sujet-15',
  },
  {
    savoir: 'resume-fidele',
    exemples: [
      ['resume-canal', 0],
      ['fiches-revision', 0],
    ],
    sujet: 'sujet-4',
  },
  {
    savoir: 'simulation-dabord',
    exemples: [
      ['renommer-photos', 0],
      ['trier-telechargements', 0],
    ],
    sujet: 'sujet-2',
  },
  {
    savoir: 'perimetre-agent',
    exemples: [['extension-navigateur', 0]],
    sujet: 'sujet-14',
  },
  {
    savoir: 'valider-avant-envoi',
    exemples: [
      ['relance-devis', 0],
      ['factures-auto', 0],
    ],
    sujet: 'sujet-5',
  },
  {
    savoir: 'minimiser-donnees',
    exemples: [
      ['keur-awa', 1],
      ['agenda-kine', 1],
    ],
    sujet: null,
  },
  {
    savoir: 'pas-que-couleur',
    exemples: [
      ['formulaire-asso', 0],
      ['marque-cosmetique', 0],
    ],
    sujet: null,
  },
  {
    savoir: 'astuce-sref',
    exemples: [['affiche-alpes', 0]],
    sujet: 'sujet-1',
  },
  {
    savoir: 'astuce-reference-angle',
    exemples: [['icones-3d', 0]],
    sujet: null,
  },
  {
    savoir: 'astuce-guillemets',
    exemples: [
      ['logo-karite', 0],
      ['logo-tontine', 0],
    ],
    sujet: 'sujet-3',
  },
  {
    savoir: 'astuce-camera-fixe',
    exemples: [['animation-logo', 0]],
    sujet: null,
  },
  {
    savoir: 'astuce-plans-courts',
    exemples: [],
    sujet: 'sujet-16',
  },
  {
    savoir: 'astuce-fin-franche',
    exemples: [['jingle-podcast', 0]],
    sujet: 'sujet-13',
  },
  {
    savoir: 'astuce-musique-avant',
    exemples: [['teaser-festival', 0]],
    sujet: null,
  },
  {
    savoir: 'astuce-pauses-voix',
    exemples: [
      [
        'voix-off',
        'Un rythme posé sur trois minutes de tutoriel, réglé uniquement par la ponctuation du texte.',
      ],
    ],
    sujet: null,
  },
  {
    savoir: 'astuce-premier-plan',
    exemples: [['facade-goree', 0]],
    sujet: null,
  },
  {
    savoir: 'astuce-ordre-mois',
    exemples: [['pluie-bamako', 0]],
    sujet: null,
  },
  {
    savoir: 'astuce-glossaire',
    exemples: [['traduction-glossaire', 0]],
    sujet: 'sujet-11',
  },
  {
    savoir: 'astuce-detail-avis',
    exemples: [['avis-restaurant', 0]],
    sujet: 'sujet-6',
  },
  {
    savoir: 'astuce-cursor-fichiers',
    exemples: [['extension-navigateur', 0]],
    sujet: 'sujet-14',
  },
  {
    savoir: 'astuce-n8n-a-verifier',
    exemples: [
      ['factures-auto', 0],
      ['factures-auto', 1],
    ],
    sujet: 'sujet-5',
  },
  {
    savoir: 'astuce-notebooklm-pages',
    exemples: [
      ['quiz-histoire', 0],
      ['fiches-revision', 0],
    ],
    sujet: 'sujet-17',
  },
];
