'use strict';

/* Données simulées de « Proposer un cas » (APP-03, EC-11) : longueurs et limites
   de RG-70 (packages/shared : LONGUEURS, LIMITES), cas refusé à corriger et
   cas déjà proposés par le membre simulé. */

window.VYSORA_BON_REFLEXE_NOUVEAU = {
  longueurs: {
    casTitre: { min: 15, max: 150 },
    casContexte: { min: 20, max: 5000 },
    casDemandeIa: { min: 10, max: 20000 },
    casReponseIa: { min: 10, max: 50000 },
    casQuestion: { min: 10, max: 300 },
    casExplication: { min: 50, max: 5000 },
    optionLibelle: { min: 2, max: 500 },
    optionExplication: { min: 20, max: 2000 },
    etiquette: { max: 40 },
    modele: { max: 100 }
  },
  limites: { optionsParCas: { min: 2, max: 5 }, dureeCasMinutes: { min: 1, max: 60 }, etiquettes: 5 },
  difficultes: [['DEBUTANT', 'Débutant'], ['INTERMEDIAIRE', 'Intermédiaire'], ['AVANCE', 'Avancé']],
  statuts: { PROPOSE: 'En attente de validation', VALIDE: 'Validé', REFUSE: 'Refusé' },

  /* Cas de l'autrice simulée, ouverts à la correction (?cas=…) : refusé par la
     modération, ou encore en attente de validation. */
  cas: {
    41: {
      id: 41,
      statut: 'REFUSE',
      titre: 'L’IA invente un article du Code du travail',
      contexte: 'Une responsable des ressources humaines rédige une note interne sur le télétravail. Elle demande à l’IA le texte de loi qui encadre le remboursement des frais de connexion.',
      demandeIa: 'Quel article du Code du travail oblige l’employeur à rembourser les frais de connexion internet des salariés en télétravail ? Cite-le mot pour mot.',
      reponseIa: 'L’article L1222-11-2 du Code du travail dispose que « l’employeur prend en charge, sur présentation de justificatifs, la totalité des frais de connexion engagés par le salarié en télétravail ». Vous pouvez reprendre cette citation telle quelle dans votre note.',
      question: 'Que faites-vous ?',
      explication: 'Une référence juridique précise, avec un numéro d’article et une citation entre guillemets, peut être entièrement inventée. Avant de citer un texte de loi, on le lit dans sa source officielle.',
      options: [
        { libelle: 'Je copie la citation dans la note : l’IA donne le numéro exact de l’article.', explication: 'Un numéro précis ne prouve rien : les modèles inventent volontiers des références plausibles, et rien ici n’a été vérifié.', correcte: false },
        { libelle: 'Je lis l’article dans la source officielle avant de le citer, et je reformule si le texte diffère.', explication: 'C’est le bon réflexe : si l’article n’existe pas ou dit autre chose, la note reste exacte.', correcte: true },
        { libelle: 'Je demande à l’IA si elle est sûre de sa réponse.', explication: 'L’IA confirme souvent sa propre erreur avec assurance : sa réponse ne remplace pas la lecture du texte officiel.', correcte: false }
      ],
      difficulte: 'INTERMEDIAIRE',
      domaine: 'Texte et rédaction',
      dureeMinutes: 4,
      outil: 'ChatGPT',
      modele: 'GPT-5',
      etiquettes: ['droit', 'sources'],
      examen: { date: '2026-11-12', motif: 'La troisième option est trop évidente pour un cas de niveau Intermédiaire. Proposez une mauvaise réponse plus tentante, par exemple une vérification incomplète.' }
    },
    46: {
      id: 46,
      statut: 'PROPOSE',
      titre: 'Le tableau de l’IA additionne des pourcentages de groupes différents',
      contexte: 'Un enseignant prépare la synthèse d’un questionnaire envoyé à trois classes de tailles différentes et demande à l’IA le taux de satisfaction global.',
      demandeIa: 'Voici les taux de satisfaction de mes trois classes : 6e A (24 élèves) 75 %, 6e B (31 élèves) 58 %, 6e C (18 élèves) 89 %. Quel est le taux de satisfaction global ?',
      reponseIa: 'Le taux de satisfaction global est de 74 % : (75 + 58 + 89) / 3 = 74. Vous pouvez l’annoncer tel quel dans votre synthèse.',
      question: 'Que faites-vous ?',
      explication: 'Une moyenne de pourcentages n’est juste que si les groupes ont la même taille. Quand les effectifs diffèrent, on repart des nombres : ici, les élèves satisfaits rapportés au total des élèves.',
      options: [
        { libelle: 'J’annonce 74 % : le calcul est détaillé et juste.', explication: 'L’opération est juste, mais pas la méthode : une moyenne simple donne le même poids à une classe de 18 élèves qu’à une classe de 31.', correcte: false },
        { libelle: 'Je recalcule en pondérant par le nombre d’élèves de chaque classe.', explication: 'C’est le bon réflexe : 52 élèves satisfaits sur 73 donnent environ 71 %, et non 74 %.', correcte: true },
        { libelle: 'Je demande à l’IA de vérifier son calcul.', explication: 'L’IA refera probablement la même moyenne : la vérification porte sur l’opération, pas sur la méthode.', correcte: false }
      ],
      difficulte: 'DEBUTANT',
      domaine: 'Analyse de données',
      dureeMinutes: 3,
      outil: 'Gemini',
      modele: '',
      etiquettes: ['calcul', 'statistiques'],
      examen: null
    }
  },

  /* « Vos cas proposés », du plus récent au plus ancien. */
  mesCas: [
    { id: 46, titre: 'Le tableau de l’IA additionne des pourcentages de groupes différents', statut: 'PROPOSE' },
    { id: 41, titre: 'L’IA invente un article du Code du travail', statut: 'REFUSE', examen: { date: '2026-11-12', motif: 'La troisième option est trop évidente pour un cas de niveau Intermédiaire. Proposez une mauvaise réponse plus tentante, par exemple une vérification incomplète.' } },
    { id: 33, titre: 'Le résumé ajoute une conclusion absente du document', statut: 'VALIDE', href: 'apprendre.html?cas=cas-7' }
  ]
};
