'use strict';

/* Classements : palmarès de la semaine par contribution et classement des membres.
   Les points d'une semaine incluent ceux des contributions citées dans le palmarès ;
   le reste vient des contributions non classées et de l'apprentissage. */

(() => {
  const D = window.VYSORA_DATA;
  if (!D) return;

  Object.assign(D.avatars, {
    'Cheikh Gueye': 'cheikh-gueye', 'Serge Kouamé': 'serge-kouame', 'Lamine Ndour': 'lamine-ndour', 'Samuel Owusu': 'samuel-owusu',
    'Abdoulaye Kane': 'abdoulaye-kane', 'Karim Mansouri': 'karim-mansouri', 'Idrissa Ouattara': 'idrissa-ouattara', 'Emmanuel Adjovi': 'emmanuel-adjovi',
    'Amine Bouzid': 'amine-bouzid', 'Pierre Durand': 'pierre-durand', 'Nicolas Fontaine': 'nicolas-fontaine', 'Boubacar Camara': 'boubacar-camara',
    'Youssef Amrani': 'youssef-amrani', 'Bernard Lemoine': 'bernard-lemoine', 'Mamadou Bâ': 'mamadou-ba', 'Amadou Touré': 'amadou-toure',
    'Rokia Keïta': 'rokia-keita', 'Binta Ba': 'binta-ba', 'Esther Kouassi': 'esther-kouassi', 'Salimata Ouédraogo': 'salimata-ouedraogo',
    'Grâce Mbemba': 'grace-mbemba', 'Adjoa Asante': 'adjoa-asante', 'Hawa Cissé': 'hawa-cisse', 'Djeneba Konaté': 'djeneba-konate',
    'Marie Faye': 'marie-faye', 'Camille Bernard': 'camille-bernard', 'Sophie Laurent': 'sophie-laurent', 'Chloé Petit': 'chloe-petit',
    'Yasmine Cherif': 'yasmine-cherif', 'Khadija Benjelloun': 'khadija-benjelloun', 'Hélène Garnier': 'helene-garnier', 'Aminata Traoré': 'aminata-traore',
    'Mai Nguyen': 'mai-nguyen'
  });

  /* Membres : réputation actuelle, points des semaines 42, 41 et 40, date d'inscription, outils, statistiques publiques
     [créations publiées, reproductions reçues, taux de succès, réponses acceptées] */
  const M = (total, w42, w41, w40, since, tools, stats) => ({ total, weeks: { 42: w42, 41: w41, 40: w40 }, since, tools, stats });
  const members = {
    'Claire Dubois': M(8214, 412, 1186, 1042, '2026-06-02', ['ChatGPT', 'Claude'], [14, 96, 81, 23]),
    'Mamadou Bâ': M(6318, 88, 402, 455, '2026-06-04', ['Claude', 'NotebookLM'], [9, 41, 78, 19]),
    'Hélène Garnier': M(5902, 64, 318, 296, '2026-06-09', ['ChatGPT', 'NotebookLM'], [11, 52, 74, 16]),
    'Kofi Mensah': M(3918, 365, 1024, 876, '2026-06-11', ['Midjourney', 'Flux'], [8, 47, 72, 11]),
    'Moussa Diallo': M(3712, 296, 812, 941, '2026-06-15', ['n8n', 'Make'], [7, 12, 100, 9]),
    'Ibrahima Sow': M(3431, 218, 968, 702, '2026-06-18', ['Suno', 'ElevenLabs'], [6, 23, 69, 14]),
    'Ousmane Sy': M(3205, 231, 744, 688, '2026-06-18', ['Cursor', 'Claude'], [5, 14, 71, 17]),
    'Aminata Traoré': M(2840, 196, 506, 563, '2026-06-23', ['ChatGPT', 'Gemini'], [4, 9, 77, 10]),
    'Idrissa Ouattara': M(2516, 143, 452, 389, '2026-07-01', ['n8n', 'Zapier'], [5, 6, 83, 8]),
    'Bernard Lemoine': M(2268, 72, 298, 341, '2026-06-26', ['ChatGPT', 'Le Chat'], [6, 11, 64, 6]),
    'Karim Mansouri': M(1588, 118, 386, 244, '2026-07-08', ['DeepSeek', 'Cursor'], [4, 8, 75, 5]),
    'Aïssatou Ndiaye': M(1388, 341, 412, 236, '2026-07-02', ['Claude', 'Make'], [5, 39, 84, 3]),
    'Yacine Benali': M(1284, 254, 366, 301, '2026-07-06', ['Le Chat', 'ChatGPT'], [4, 33, 89, 2]),
    'Julien Moreau': M(1044, 92, 214, 188, '2026-07-12', ['Cursor', 'ChatGPT'], [6, 9, 88, 3]),
    'Fatoumata Coulibaly': M(1176, 184, 412, 226, '2026-07-14', ['Ideogram', 'Recraft'], [5, 12, 70, 1]),
    'Hugo Girard': M(874, 76, 163, 171, '2026-07-19', ['ChatGPT', 'v0'], [6, 21, 76, 2]),
    'Mariam Diop': M(987, 138, 241, 262, '2026-07-21', ['Claude', 'DeepSeek'], [5, 37, 88, 1]),
    'Samuel Owusu': M(745, 61, 154, 122, '2026-07-25', ['Midjourney', 'Ideogram'], [4, 7, 71, 2]),
    'Khadija Benjelloun': M(662, 104, 182, 96, '2026-07-28', ['ChatGPT', 'Claude'], [3, 5, 80, 4]),
    'Abdoulaye Kane': M(618, 57, 131, 118, '2026-08-02', ['DeepSeek', 'ChatGPT'], [3, 6, 83, 3]),
    'Grâce Mbemba': M(642, 83, 126, 94, '2026-08-04', ['Cursor', 'n8n'], [2, 3, 67, 2]),
    'Pierre Durand': M(588, 44, 97, 108, '2026-08-07', ['ChatGPT', 'Copilot'], [3, 2, 50, 2]),
    'Adjoa Asante': M(466, 96, 138, 71, '2026-08-10', ['Stable Diffusion', 'Recraft'], [4, 6, 83, 0]),
    'Youssef Amrani': M(561, 39, 88, 102, '2026-08-12', ['Claude', 'Lovable'], [3, 3, 67, 1]),
    'Mai Nguyen': M(596, 71, 116, 84, '2026-08-18', ['Gemini', 'Ideogram'], [3, 4, 75, 1]),
    'Amadou Touré': M(517, 33, 74, 91, '2026-08-21', ['ChatGPT', 'NotebookLM'], [2, 2, 100, 1]),
    'Serge Kouamé': M(318, 52, 109, 63, '2026-08-25', ['Runway', 'Suno'], [3, 3, 67, 0]),
    'Léa Martin': M(286, 96, 138, 32, '2026-08-30', ['ChatGPT', 'ElevenLabs'], [2, 49, 61, 0]),
    'Ndeye Fall': M(241, 47, 88, 31, '2026-09-02', ['Claude', 'Flux'], [3, 14, 93, 0]),
    'Awa Sarr': M(213, 58, 71, 18, '2026-09-03', ['ChatGPT', 'Gemini'], [3, 8, 75, 0]),
    'Thomas Lefèvre': M(188, 36, 52, 44, '2026-09-05', ['Midjourney', 'Zapier'], [2, 11, 73, 0]),
    'Koffi Amoussou': M(164, 41, 48, 22, '2026-09-08', ['Gemini', 'Cursor'], [2, 7, 86, 0]),
    'Esther Kouassi': M(152, 62, 30, 8, '2026-09-10', ['Midjourney', 'Ideogram'], [2, 1, 100, 0]),
    'Camille Bernard': M(139, 27, 38, 12, '2026-09-12', ['ChatGPT', 'Notion AI'], [1, 0, 0, 1]),
    'Boubacar Camara': M(129, 35, 24, 9, '2026-09-14', ['Claude', 'Lovable'], [2, 1, 100, 0]),
    'Lamine Ndour': M(121, 49, 33, 18, '2026-09-16', ['Ideogram', 'ChatGPT'], [1, 0, 0, 1]),
    'Rokia Keïta': M(108, 24, 18, 9, '2026-09-18', ['Suno', 'ChatGPT'], [2, 1, 100, 0]),
    'Sophie Laurent': M(97, 22, 14, 6, '2026-09-19', ['Midjourney', 'Claude'], [1, 2, 50, 0]),
    'Emmanuel Adjovi': M(84, 31, 24, 16, '2026-09-21', ['Cursor', 'Claude'], [1, 0, 0, 0]),
    'Nicolas Fontaine': M(73, 12, 6, 3, '2026-09-23', ['ChatGPT', 'Make'], [1, 0, 0, 0]),
    'Hawa Cissé': M(66, 29, 17, 12, '2026-09-26', ['Flux', 'ChatGPT'], [1, 0, 0, 0]),
    'Salimata Ouédraogo': M(58, 34, 14, 8, '2026-09-28', ['Gemini', 'ChatGPT'], [1, 0, 0, 0]),
    'Sébastien Roy': M(46, 26, 12, 7, '2026-09-30', ['Midjourney', 'Runway'], [3, 2, 50, 0]),
    'Chloé Petit': M(38, 21, 14, 0, '2026-10-02', ['ChatGPT', 'Flux'], [1, 0, 0, 0]),
    'Marie Faye': M(31, 19, 9, 0, '2026-10-04', ['Claude', 'Gemini'], [0, 0, 0, 0]),
    'Cheikh Gueye': M(27, 14, 8, 0, '2026-10-05', ['ChatGPT', 'Suno'], [0, 0, 0, 0]),
    'Binta Ba': M(24, 17, 0, 0, '2026-10-06', ['Gemini', 'ChatGPT'], [0, 0, 0, 0]),
    'Amine Bouzid': M(19, 12, 3, 0, '2026-10-08', ['Midjourney', 'ChatGPT'], [1, 0, 0, 0]),
    'Djeneba Konaté': M(16, 9, 0, 0, '2026-10-09', ['Ideogram', 'ChatGPT'], [0, 0, 0, 0]),
    'Yasmine Cherif': M(12, 7, 0, 0, '2026-10-11', ['Claude', 'Gemini'], [0, 0, 0, 0])
  };

  /* Badges obtenus avant la semaine 40, par niveau ; ceux des semaines suivantes sont dans chaque semaine. */
  const earlier = {
    'Claire Dubois': ['Pionnier', 'Première création', 'Parcours complet', 'Reproductible', 'Mentor', 'Premier coup de main', 'Astucieux'],
    'Mamadou Bâ': ['Pionnier', 'Première création', 'Parcours complet', 'Mentor', 'Premier coup de main', 'Vigilant'],
    'Hélène Garnier': ['Pionnier', 'Première création', 'Parcours complet', 'Reproductible', 'Mentor', 'Premier coup de main'],
    'Kofi Mensah': ['Pionnier', 'Première création', 'Reproductible', 'Mentor', 'Premier coup de main'],
    'Moussa Diallo': ['Pionnier', 'Première création', 'Parcours complet', 'Premier coup de main', 'Participant'],
    'Ibrahima Sow': ['Pionnier', 'Première création', 'Parcours complet', 'Reproductible', 'Mentor', 'Premier coup de main'],
    'Ousmane Sy': ['Pionnier', 'Première création', 'Parcours complet', 'Reproductible', 'Mentor', 'Premier coup de main', 'Participant'],
    'Aminata Traoré': ['Pionnier', 'Première création', 'Premier coup de main', 'Vigilant'],
    'Idrissa Ouattara': ['Première création', 'Parcours complet', 'Premier coup de main', 'Reproductible'],
    'Bernard Lemoine': ['Pionnier', 'Première création', 'Reproductible', 'Premier coup de main'],
    'Karim Mansouri': ['Première création', 'Reproductible', 'Premier coup de main', 'Premier essai'],
    'Aïssatou Ndiaye': ['Première création', 'Parcours complet', 'Reproductible', 'Premier coup de main'],
    'Yacine Benali': ['Première création', 'Reproductible', 'Premier essai', 'Premier coup de main'],
    'Julien Moreau': ['Première création', 'Parcours complet', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Fatoumata Coulibaly': ['Première création', 'Reproductible', 'Premier coup de main', 'Participant'],
    'Hugo Girard': ['Première création', 'Reproductible', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Mariam Diop': ['Première création', 'Reproductible', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Samuel Owusu': ['Première création', 'Reproductible', 'Premier essai', 'Premier coup de main'],
    'Khadija Benjelloun': ['Première création', 'Premier essai', 'Premier coup de main', 'Bon réflexe'],
    'Abdoulaye Kane': ['Première création', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Grâce Mbemba': ['Première création', 'Premier essai', 'Premier coup de main', 'Bon réflexe'],
    'Pierre Durand': ['Première création', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Adjoa Asante': ['Première création', 'Reproductible', 'Premier essai', 'Participant'],
    'Youssef Amrani': ['Première création', 'Premier essai', 'Premier coup de main'],
    'Mai Nguyen': ['Première création', 'Premier essai', 'Premier coup de main', 'Participant'],
    'Amadou Touré': ['Première création', 'Premier essai', 'Premier coup de main', 'Bon réflexe'],
    'Serge Kouamé': ['Première création', 'Premier essai', 'Bon réflexe'],
    'Léa Martin': ['Première création', 'Premier essai'],
    'Ndeye Fall': ['Première création', 'Premier essai'],
    'Awa Sarr': ['Première création', 'Premier essai', 'Bon réflexe'],
    'Thomas Lefèvre': ['Première création', 'Premier essai', 'Assidu', 'Bon réflexe'],
    'Koffi Amoussou': ['Premier essai', 'Bon réflexe'],
    'Esther Kouassi': ['Première création', 'Premier essai'],
    'Camille Bernard': ['Première création', 'Premier essai', 'Premier coup de main'],
    'Boubacar Camara': ['Première création', 'Premier essai'],
    'Lamine Ndour': ['Première création', 'Premier essai'],
    'Rokia Keïta': ['Première création', 'Premier essai'],
    'Sophie Laurent': ['Première création', 'Premier essai', 'Bon réflexe'],
    'Emmanuel Adjovi': ['Première création'],
    'Nicolas Fontaine': ['Première création', 'Premier essai'],
    'Hawa Cissé': ['Première création', 'Premier essai'],
    'Salimata Ouédraogo': ['Première création', 'Premier essai'],
    'Sébastien Roy': ['Première création', 'Premier essai'],
    'Chloé Petit': ['Première création', 'Premier essai'],
    'Marie Faye': ['Premier essai'],
    'Cheikh Gueye': ['Premier essai'],
    'Binta Ba': [],
    'Amine Bouzid': ['Premier essai'],
    'Djeneba Konaté': [],
    'Yasmine Cherif': []
  };

  /* Badges qui ne figurent pas dans data.js (règle RG-86). */
  const badges = [
    { name: 'Premier essai', icon: 'check-circle', tone: 'blue', rule: 'Déclarer sa première reproduction' },
    { name: 'Assidu', icon: 'history', tone: 'amber', rule: 'Répondre à 50 cas Bon réflexe' },
    { name: 'Premier coup de main', icon: 'reply', tone: 'green', rule: 'Obtenir sa première réponse acceptée' },
    { name: 'Vigilant', icon: 'shield', tone: 'ink', rule: 'Avoir 5 signalements jugés fondés' },
    { name: 'Participant', icon: 'calendar', tone: 'blue', rule: 'Participer à un défi clôturé' }
  ];

  window.VYSORA_CLASSEMENTS = {
    now: '2026-10-13T16:20',
    members,
    earlier,
    badges,

    you: {
      level: 'Apprenti', total: 182, since: '2026-09-15',
      weeks: {
        42: { pts: 41, detail: [['Cas Bon réflexe réussis', 11, 1], ['Reproductions déclarées', 4, 2], ['Votes « Utile » reçus sur vos réponses', 2, 5], ['Vote « Utile » reçu sur votre création', 1, 10], ['Réponse acceptée à votre question', 1, 2]] },
        41: { pts: 63, detail: [['Cas Bon réflexe réussis', 17, 1], ['Reproductions déclarées', 6, 2], ['Votes « Utile » reçus sur votre création', 2, 10], ['Vote « Testé, ça marche » reçu sur votre astuce', 1, 5], ['Votes « Utile » reçus sur vos réponses', 1, 5], ['Réponses acceptées à vos questions', 2, 2]] },
        40: { pts: 38, detail: [['Cas Bon réflexe réussis', 9, 1], ['Reproductions déclarées', 5, 2], ['Vote « Utile » reçu sur votre création', 1, 10], ['Réponses acceptées à vos questions', 2, 2], ['Vote « Utile » reçu sur votre réponse', 1, 5]] }
      }
    },

    weeks: [
      {
        id: 42, start: '2026-10-12', end: '2026-10-18', status: 'provisoire',
        figures: { total: 3106, votes: 1291, repro: 822, cases: 806, accepted: 187 },
        reussites: [
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 9, d: 11, by: ['Hugo Girard', 'Mai Nguyen', 'Samuel Owusu', 'Grâce Mbemba', 'Lamine Ndour', 'Camille Bernard', 'Esther Kouassi', 'Youssef Amrani', 'Rokia Keïta'] },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 7, d: 8, by: ['Khadija Benjelloun', 'Sophie Laurent', 'Abdoulaye Kane', 'Nicolas Fontaine', 'Chloé Petit', 'Marie Faye', 'Binta Ba'] },
          { m: 'Léa Martin', c: 'cite-ciel-mer', n: 5, d: 9, by: ['Thomas Lefèvre', 'Adjoa Asante', 'Hawa Cissé', 'Cheikh Gueye', 'Djeneba Konaté'] },
          { m: 'Mariam Diop', c: 'trier-telechargements', n: 5, d: 6, by: ['Pierre Durand', 'Karim Mansouri', 'Emmanuel Adjovi', 'Boubacar Camara', 'Julien Moreau'] },
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 4, d: 6, by: ['Esther Kouassi', 'Amine Bouzid', 'Sébastien Roy', 'Thomas Lefèvre'] },
          { m: 'Hugo Girard', c: 'agenda-kine', n: 3, d: 4, by: ['Grâce Mbemba', 'Youssef Amrani', 'Boubacar Camara'] },
          { m: 'Ndeye Fall', c: 'avis-restaurant', n: 3, d: 3, by: ['Marie Faye', 'Salimata Ouédraogo', 'Camille Bernard'] },
          { m: 'Koffi Amoussou', c: 'pluie-bamako', n: 2, d: 2, by: ['Mai Nguyen', 'Amadou Touré'] }
        ],
        utiles: [
          { m: 'Moussa Diallo', c: 'factures-auto', n: 22 },
          { m: 'Claire Dubois', c: 'ventes-boutique', n: 21 },
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 15 },
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 13 },
          { m: 'Ousmane Sy', c: 'site-traiteur', n: 9 },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 8 },
          { m: 'Fatoumata Coulibaly', c: 'marque-cosmetique', n: 7 },
          { m: 'Ibrahima Sow', c: 'jingle-podcast', n: 6 }
        ],
        entraide: [
          { m: 'Claire Dubois', n: 4, v: 12, q: { title: 'Mon personnage change de visage à chaque nouvelle image', asker: 'Koffi Amoussou', tool: 'Midjourney', model: 'v7', sujet: 'sujet-1', at: '2026-10-12T15:48', excerpt: 'Le texte seul ne suffit pas à fixer un visage. Générez d’abord une planche de référence du personnage, de face et de trois quarts, puis passez-la en référence à chaque scène.', tested: 14 } },
          { m: 'Ibrahima Sow', n: 3, v: 7, q: { title: 'Ma voix off coupe la fin de chaque phrase', asker: 'Léa Martin', tool: 'ElevenLabs', model: 'Multilingual v2' } },
          { m: 'Ousmane Sy', n: 3, v: 5, q: { title: 'L’agent réécrit tout le fichier pour corriger une seule ligne', asker: 'Thomas Lefèvre', tool: 'Cursor', model: '' } },
          { m: 'Aminata Traoré', n: 2, v: 6, q: { title: 'Garder les mêmes catégories d’un mois à l’autre dans mon budget', asker: 'Camille Bernard', tool: 'ChatGPT', model: 'GPT-5' } },
          { m: 'Idrissa Ouattara', n: 2, v: 3, q: { title: 'Mon flux s’arrête quand une pièce jointe manque', asker: 'Grâce Mbemba', tool: 'n8n', model: '' } },
          { m: 'Kofi Mensah', n: 1, v: 4, q: { title: 'Les couleurs changent entre deux variantes d’une illustration', asker: 'Sophie Laurent', tool: 'Midjourney', model: 'v7' } },
          { m: 'Karim Mansouri', n: 1, v: 3, q: { title: 'Compter les clients inactifs sans les compter deux fois', asker: 'Pierre Durand', tool: 'DeepSeek', model: 'V3.2' } },
          { m: 'Lamine Ndour', n: 1, v: 2, q: { title: 'Le logo généré ajoute une lettre au nom de ma boutique', asker: 'Djeneba Konaté', tool: 'Ideogram', model: '3.0' } }
        ],
        astuces: [
          { m: 'Ousmane Sy', n: 7, t: { title: 'Faire écrire les tests avant la fonction', tool: 'Claude', model: 'Sonnet 4.5', sujet: 'sujet-15', with: [['Claude', 'Sonnet 4.5', 4], ['ChatGPT', 'GPT-5', 2], ['Cursor', '', 1]] } },
          { m: 'Fatoumata Coulibaly', n: 6, t: { title: 'Isoler le texte exact dans un logo généré', tool: 'Ideogram', model: '3.0', sujet: 'sujet-3', with: [['Ideogram', '3.0', 3], ['ChatGPT', 'GPT Image 1', 2], ['Recraft', 'V3', 1]] } },
          { m: 'Kofi Mensah', n: 5, t: { title: 'Nommer la technique picturale plutôt qu’un style', tool: 'Midjourney', model: 'v7', with: [['Midjourney', 'v7', 3], ['Flux', '1.1 Pro', 2]] } },
          { m: 'Khadija Benjelloun', n: 4, t: { title: 'Montrer un paragraphe modèle avant de demander le texte', tool: 'ChatGPT', model: 'GPT-5', with: [['ChatGPT', 'GPT-5', 2], ['Claude', 'Sonnet 4.5', 1], ['Le Chat', 'Mistral Large 2', 1]] } },
          { m: 'Mai Nguyen', n: 3, t: { title: 'Demander le tableau de données avant le graphique', tool: 'Gemini', model: '2.5 Pro', with: [['Gemini', '2.5 Pro', 2], ['ChatGPT', 'GPT-5', 1]] } },
          { m: 'Adjoa Asante', n: 3, t: { title: 'Garder la même graine pour comparer deux prompts', tool: 'Stable Diffusion', model: 'SDXL', with: [['Stable Diffusion', 'SDXL', 2], ['Flux', '1.1 Pro', 1]] } },
          { m: 'Grâce Mbemba', n: 2, t: { title: 'Limiter l’agent à un seul dossier de travail', tool: 'Cursor', model: '', with: [['Cursor', '', 1], ['Claude', 'Sonnet 4.5', 1]] } },
          { m: 'Hélène Garnier', n: 2, t: { title: 'Demander la liste des sources avant le résumé', tool: 'NotebookLM', model: '', with: [['NotebookLM', '', 1], ['Claude', 'Sonnet 4.5', 1]] } }
        ],
        defi: {
          title: 'Une affiche touristique en trois échanges', theme: 'Un lieu que vous aimez', start: '2026-10-12', end: '2026-10-19', closed: false, count: 87,
          rules: ['Trois échanges au maximum avec l’IA', 'Un texte lisible et sans faute sur l’affiche', 'Un lieu réel, photographié ou décrit'],
          entries: [
            { m: 'Ibrahima Sow', n: 7, title: 'Saint-Louis, les pirogues de Guet Ndar', tool: 'Midjourney', model: 'v7', visual: { kind: 'poster', src: 'affiche-saint-louis', place: 'Saint-Louis', line: 'Sénégal', alt: 'Pirogues peintes amarrées devant les façades coloniales de Saint-Louis' } },
            { m: 'Mariam Diop', n: 6, title: 'Gorée, la maison aux volets bleus', tool: 'Flux', model: '1.1 Pro', visual: { kind: 'poster', src: 'goree', place: 'Gorée', line: 'Île de mémoire', alt: 'Façade ocre aux volets bleus sur l’île de Gorée' } },
            { m: 'Léa Martin', n: 5, title: 'Chefchaouen, la ville bleue', tool: 'ChatGPT', model: 'GPT Image 1', visual: { kind: 'poster', src: 'affiche-chefchaouen', place: 'Chefchaouen', line: 'Maroc', alt: 'Ruelle bleue de Chefchaouen sous un oranger' } },
            { m: 'Samuel Owusu', n: 3, title: 'Cape Coast au lever du jour', tool: 'Ideogram', model: '3.0' },
            { m: 'Esther Kouassi', n: 3, title: 'Grand-Bassam, la plage du phare', tool: 'Midjourney', model: 'v7' }
          ]
        },
        badges: [
          { m: 'Aminata Traoré', b: 'Mentor', at: '2026-10-13' },
          { m: 'Lamine Ndour', b: 'Premier coup de main', at: '2026-10-12' },
          { m: 'Esther Kouassi', b: 'Bon réflexe', at: '2026-10-12' },
          { m: 'Amine Bouzid', b: 'Première création', at: '2026-10-12' },
          { m: 'Djeneba Konaté', b: 'Premier essai', at: '2026-10-13' },
          { m: 'Binta Ba', b: 'Premier essai', at: '2026-10-13' }
        ]
      },
      {
        id: 41, start: '2026-10-05', end: '2026-10-11', status: 'arrete',
        figures: { total: 10424, votes: 4318, repro: 2761, cases: 2702, accepted: 643 },
        reussites: [
          { m: 'Léa Martin', c: 'cite-ciel-mer', n: 14, d: 21, by: ['Thomas Lefèvre', 'Sophie Laurent', 'Samuel Owusu', 'Adjoa Asante', 'Esther Kouassi', 'Amine Bouzid', 'Hugo Girard', 'Rokia Keïta', 'Chloé Petit', 'Mai Nguyen', 'Nicolas Fontaine', 'Cheikh Gueye', 'Marie Faye', 'Sébastien Roy'] },
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 11, d: 13, by: ['Youssef Amrani', 'Grâce Mbemba', 'Boubacar Camara', 'Koffi Amoussou', 'Emmanuel Adjovi', 'Pierre Durand', 'Camille Bernard', 'Hawa Cissé', 'Lamine Ndour', 'Abdoulaye Kane', 'Julien Moreau'] },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 9, d: 10, by: ['Khadija Benjelloun', 'Awa Sarr', 'Camille Bernard', 'Salimata Ouédraogo', 'Nicolas Fontaine', 'Rokia Keïta', 'Marie Faye', 'Amadou Touré', 'Ndeye Fall'] },
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 7, d: 9, by: ['Esther Kouassi', 'Sophie Laurent', 'Samuel Owusu', 'Thomas Lefèvre', 'Adjoa Asante', 'Amine Bouzid', 'Hawa Cissé'] },
          { m: 'Mariam Diop', c: 'trier-telechargements', n: 7, d: 8, by: ['Karim Mansouri', 'Pierre Durand', 'Boubacar Camara', 'Emmanuel Adjovi', 'Grâce Mbemba', 'Abdoulaye Kane', 'Koffi Amoussou'] },
          { m: 'Hugo Girard', c: 'formulaire-asso', n: 5, d: 6, by: ['Youssef Amrani', 'Boubacar Camara', 'Camille Bernard', 'Mai Nguyen', 'Lamine Ndour'] },
          { m: 'Claire Dubois', c: 'doublons-contacts', n: 4, d: 5, by: ['Bernard Lemoine', 'Amadou Touré', 'Nicolas Fontaine', 'Khadija Benjelloun'] },
          { m: 'Awa Sarr', c: 'traduction-glossaire', n: 3, d: 4, by: ['Hélène Garnier', 'Salimata Ouédraogo', 'Rokia Keïta'] }
        ],
        utiles: [
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 38 },
          { m: 'Claire Dubois', c: 'ventes-boutique', n: 35 },
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 30 },
          { m: 'Moussa Diallo', c: 'resa-terrain', n: 27 },
          { m: 'Ousmane Sy', c: 'site-traiteur', n: 22 },
          { m: 'Julien Moreau', c: 'extension-navigateur', n: 14 },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 12 },
          { m: 'Ibrahima Sow', c: 'jingle-podcast', n: 9 }
        ],
        entraide: [
          { m: 'Ibrahima Sow', n: 5, v: 14, q: { title: 'Les questions de mon quiz sortent du programme', asker: 'Awa Sarr', tool: 'Gemini', model: '2.5 Pro', sujet: 'sujet-17', at: '2026-10-11T19:30', excerpt: 'Collez le cours dans la demande et exigez que chaque question cite le passage qui contient la réponse. Sans ce texte de référence, l’IA puise dans ce qu’elle sait du sujet.', tested: 6 } },
          { m: 'Claire Dubois', n: 4, v: 11, q: { title: 'Le résumé de mon rapport invente des chiffres', asker: 'Julien Moreau', tool: 'ChatGPT', model: 'GPT-5', sujet: 'sujet-4', at: '2026-10-10T09:00', excerpt: 'Imposez que chaque chiffre soit suivi de sa page et autorisez explicitement l’IA à écrire « non indiqué ».', tested: 11 } },
          { m: 'Ousmane Sy', n: 3, v: 9, q: { title: 'Mon extension demande l’accès à tous les sites', asker: 'Julien Moreau', tool: 'Cursor', model: '' } },
          { m: 'Moussa Diallo', n: 3, v: 6, q: { title: 'Mon automatisation classe deux fois la même facture', asker: 'Youssef Amrani', tool: 'n8n', model: '' } },
          { m: 'Mamadou Bâ', n: 2, v: 8, q: { title: 'Faire relire un bail de location sans perdre les clauses', asker: 'Binta Ba', tool: 'Claude', model: 'Sonnet 4.5' } },
          { m: 'Aminata Traoré', n: 2, v: 5, q: { title: 'Un tableau croisé qui mélange les mois', asker: 'Rokia Keïta', tool: 'ChatGPT', model: 'GPT-5' } },
          { m: 'Kofi Mensah', n: 2, v: 4, q: { title: 'Garder la même lumière sur toute une série', asker: 'Sébastien Roy', tool: 'Midjourney', model: 'v7' } },
          { m: 'Hélène Garnier', n: 1, v: 6, q: { title: 'Traduire un contrat sans changer le sens des clauses', asker: 'Mai Nguyen', tool: 'ChatGPT', model: 'GPT-5' } }
        ],
        astuces: [
          { m: 'Fatoumata Coulibaly', n: 11, t: { title: 'Isoler le texte exact dans un logo généré', tool: 'Ideogram', model: '3.0', sujet: 'sujet-3', with: [['Ideogram', '3.0', 6], ['ChatGPT', 'GPT Image 1', 3], ['Recraft', 'V3', 2]] } },
          { m: 'Awa Sarr', n: 6, t: { title: 'Faire relire une traduction avec un glossaire métier', tool: 'ChatGPT', model: 'GPT-5', sujet: 'sujet-11', with: [['ChatGPT', 'GPT-5', 3], ['DeepSeek', 'V3.2', 2], ['Le Chat', 'Mistral Large 2', 1]] } },
          { m: 'Ousmane Sy', n: 5, t: { title: 'Demander un plan avant la première ligne de code', tool: 'Claude', model: 'Sonnet 4.5', with: [['Claude', 'Sonnet 4.5', 3], ['Cursor', '', 2]] } },
          { m: 'Kofi Mensah', n: 4, t: { title: 'Nommer la technique picturale plutôt qu’un style', tool: 'Midjourney', model: 'v7', with: [['Midjourney', 'v7', 3], ['Flux', '1.1 Pro', 1]] } },
          { m: 'Khadija Benjelloun', n: 3, t: { title: 'Montrer un paragraphe modèle avant de demander le texte', tool: 'ChatGPT', model: 'GPT-5', with: [['ChatGPT', 'GPT-5', 2], ['Claude', 'Sonnet 4.5', 1]] } },
          { m: 'Idrissa Ouattara', n: 3, t: { title: 'Découper un flux en petites étapes testables', tool: 'n8n', model: '', with: [['n8n', '', 2], ['Make', '', 1]] } },
          { m: 'Bernard Lemoine', n: 2, t: { title: 'Exiger l’unité de chaque colonne dans un tableau', tool: 'ChatGPT', model: 'GPT-5', with: [['ChatGPT', 'GPT-5', 1], ['Le Chat', 'Mistral Large 2', 1]] } },
          { m: 'Mai Nguyen', n: 2, t: { title: 'Demander le tableau de données avant le graphique', tool: 'Gemini', model: '2.5 Pro', with: [['Gemini', '2.5 Pro', 2]] } }
        ],
        defi: {
          title: 'Un logo lisible en petit format', theme: 'Une entreprise de votre quartier', start: '2026-10-05', end: '2026-10-11', closed: true, count: 64,
          rules: ['Lisible à 32 pixels', 'Deux couleurs au maximum', 'Le nom exact de l’entreprise'],
          entries: [
            { m: 'Fatoumata Coulibaly', n: 24, title: 'Monogramme d’une teinturerie de bazin', tool: 'Ideogram', model: '3.0', visual: { kind: 'logo', mark: 'bazin', name: 'Bazin Sira', line: 'Teinturerie · Bamako' } },
            { m: 'Ousmane Sy', n: 19, title: 'Logo d’une application de tontine', tool: 'Ideogram', model: '3.0', c: 'logo-tontine', visual: { kind: 'mock', mock: 'logo-natt' } },
            { m: 'Adjoa Asante', n: 11, title: 'Logo d’une épicerie solidaire', tool: 'Recraft', model: 'V3', visual: { kind: 'logo', mark: 'panier', name: 'Le Panier', line: 'Épicerie solidaire · Treichville' } },
            { m: 'Mai Nguyen', n: 8, title: 'Logo d’un atelier de céramique', tool: 'Ideogram', model: '3.0' },
            { m: 'Hugo Girard', n: 7, title: 'Pictogramme d’un service de covoiturage', tool: 'Recraft', model: 'V3' }
          ]
        },
        badges: [
          { m: 'Fatoumata Coulibaly', b: 'Podium', at: '2026-10-11' },
          { m: 'Adjoa Asante', b: 'Podium', at: '2026-10-11' },
          { m: 'Fatoumata Coulibaly', b: 'Astucieux', at: '2026-10-10' },
          { m: 'Léa Martin', b: 'Reproductible', at: '2026-10-07' },
          { m: 'Ibrahima Sow', b: 'Astucieux', at: '2026-10-09' },
          { m: 'Emmanuel Adjovi', b: 'Premier essai', at: '2026-10-06' },
          { m: 'Lamine Ndour', b: 'Participant', at: '2026-10-11' }
        ]
      },
      {
        id: 40, start: '2026-09-28', end: '2026-10-04', status: 'arrete',
        figures: { total: 8663, votes: 3590, repro: 2284, cases: 2268, accepted: 521 },
        reussites: [
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 8, d: 9, by: ['Hugo Girard', 'Youssef Amrani', 'Grâce Mbemba', 'Boubacar Camara', 'Pierre Durand', 'Camille Bernard', 'Koffi Amoussou', 'Mai Nguyen'] },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 6, d: 7, by: ['Khadija Benjelloun', 'Awa Sarr', 'Rokia Keïta', 'Nicolas Fontaine', 'Sophie Laurent', 'Amadou Touré'] },
          { m: 'Koffi Amoussou', c: 'pluie-bamako', n: 4, d: 4, by: ['Mai Nguyen', 'Aminata Traoré', 'Abdoulaye Kane', 'Esther Kouassi'] },
          { m: 'Claire Dubois', c: 'doublons-contacts', n: 3, d: 4, by: ['Bernard Lemoine', 'Amadou Touré', 'Khadija Benjelloun'] },
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 3, d: 5, by: ['Sophie Laurent', 'Thomas Lefèvre', 'Samuel Owusu'] },
          { m: 'Ibrahima Sow', c: 'jingle-podcast', n: 2, d: 3, by: ['Rokia Keïta', 'Serge Kouamé'] },
          { m: 'Léa Martin', c: 'voix-off', n: 2, d: 2, by: ['Ndeye Fall', 'Esther Kouassi'] },
          { m: 'Fatoumata Coulibaly', c: 'marque-cosmetique', n: 2, d: 3, by: ['Adjoa Asante', 'Samuel Owusu'] }
        ],
        utiles: [
          { m: 'Moussa Diallo', c: 'factures-auto', n: 41 },
          { m: 'Claire Dubois', c: 'ventes-boutique', n: 39 },
          { m: 'Aïssatou Ndiaye', c: 'keur-awa', n: 19 },
          { m: 'Fatoumata Coulibaly', c: 'marque-cosmetique', n: 14 },
          { m: 'Ibrahima Sow', c: 'jingle-podcast', n: 11 },
          { m: 'Kofi Mensah', c: 'portrait-gouache', n: 10 },
          { m: 'Yacine Benali', c: 'lettre-motivation', n: 8 },
          { m: 'Thomas Lefèvre', c: 'resume-canal', n: 4 }
        ],
        entraide: [
          { m: 'Ousmane Sy', n: 5, v: 12, q: { title: 'Mon agent relance l’installation à chaque commande', asker: 'Pierre Durand', tool: 'Cursor', model: '', excerpt: 'Donnez à l’agent la liste des commandes autorisées et demandez-lui de vérifier si les dépendances sont déjà installées avant d’en lancer une.' } },
          { m: 'Claire Dubois', n: 4, v: 10, q: { title: 'Comparer deux mois qui n’ont pas le même nombre de jours', asker: 'Samuel Owusu', tool: 'ChatGPT', model: 'GPT-5' } },
          { m: 'Mamadou Bâ', n: 3, v: 9, q: { title: 'Résumer un procès-verbal sans perdre les décisions', asker: 'Hawa Cissé', tool: 'Claude', model: 'Sonnet 4.5' } },
          { m: 'Ibrahima Sow', n: 3, v: 6, q: { title: 'Mon générique finit en fondu au lieu de s’arrêter net', asker: 'Rokia Keïta', tool: 'Suno', model: 'v4.5' } },
          { m: 'Kofi Mensah', n: 2, v: 5, q: { title: 'Les mains restent déformées malgré les corrections', asker: 'Amine Bouzid', tool: 'Midjourney', model: 'v7' } },
          { m: 'Idrissa Ouattara', n: 2, v: 4, q: { title: 'Envoyer un récapitulatif seulement les jours ouvrés', asker: 'Nicolas Fontaine', tool: 'Zapier', model: '' } },
          { m: 'Aminata Traoré', n: 2, v: 3, q: { title: 'Vérifier les sources d’un exposé d’histoire', asker: 'Awa Sarr', tool: 'Gemini', model: '2.5 Pro' } },
          { m: 'Bernard Lemoine', n: 1, v: 5, q: { title: 'Réécrire un courrier administratif plus simplement', asker: 'Camille Bernard', tool: 'Le Chat', model: 'Mistral Large 2' } }
        ],
        astuces: [
          { m: 'Kofi Mensah', n: 9, t: { title: 'Nommer la technique picturale plutôt qu’un style', tool: 'Midjourney', model: 'v7', with: [['Midjourney', 'v7', 6], ['Flux', '1.1 Pro', 2], ['Ideogram', '3.0', 1]] } },
          { m: 'Hélène Garnier', n: 7, t: { title: 'Demander la liste des sources avant le résumé', tool: 'NotebookLM', model: '', with: [['NotebookLM', '', 4], ['Claude', 'Sonnet 4.5', 2], ['ChatGPT', 'GPT-5', 1]] } },
          { m: 'Idrissa Ouattara', n: 5, t: { title: 'Découper un flux en petites étapes testables', tool: 'n8n', model: '', with: [['n8n', '', 3], ['Make', '', 2]] } },
          { m: 'Khadija Benjelloun', n: 4, t: { title: 'Montrer un paragraphe modèle avant de demander le texte', tool: 'ChatGPT', model: 'GPT-5', with: [['ChatGPT', 'GPT-5', 3], ['Claude', 'Sonnet 4.5', 1]] } },
          { m: 'Ousmane Sy', n: 3, t: { title: 'Demander un plan avant la première ligne de code', tool: 'Claude', model: 'Sonnet 4.5', with: [['Claude', 'Sonnet 4.5', 2], ['Cursor', '', 1]] } },
          { m: 'Bernard Lemoine', n: 3, t: { title: 'Exiger l’unité de chaque colonne dans un tableau', tool: 'ChatGPT', model: 'GPT-5', with: [['ChatGPT', 'GPT-5', 2], ['Le Chat', 'Mistral Large 2', 1]] } },
          { m: 'Awa Sarr', n: 2, t: { title: 'Faire relire une traduction avec un glossaire métier', tool: 'ChatGPT', model: 'GPT-5', sujet: 'sujet-11', with: [['ChatGPT', 'GPT-5', 2]] } },
          { m: 'Mai Nguyen', n: 2, t: { title: 'Demander le tableau de données avant le graphique', tool: 'Gemini', model: '2.5 Pro', with: [['Gemini', '2.5 Pro', 1], ['ChatGPT', 'GPT-5', 1]] } }
        ],
        defi: {
          title: 'Un script qui ne supprime rien', theme: 'Ranger, renommer ou nettoyer des fichiers', start: '2026-09-28', end: '2026-10-04', closed: true, count: 52,
          rules: ['Un mode simulation avant toute action', 'Aucune suppression définitive', 'Le prompt complet publié avec le script'],
          entries: [
            { m: 'Mariam Diop', n: 18, title: 'Ranger ses téléchargements en mode simulation', tool: 'Claude', model: 'Sonnet 4.5', visual: { kind: 'mock', mock: 'files' } },
            { m: 'Julien Moreau', n: 15, title: 'Renommer des photos sans écraser les doublons', tool: 'ChatGPT', model: 'GPT-5', visual: { kind: 'mock', mock: 'code' } },
            { m: 'Ousmane Sy', n: 12, title: 'Limiter les droits d’une extension avant de nettoyer', tool: 'Cursor', model: '', visual: { kind: 'mock', mock: 'diff' } },
            { m: 'Abdoulaye Kane', n: 7, title: 'Archiver les factures de l’année par client', tool: 'DeepSeek', model: 'V3.2' },
            { m: 'Pierre Durand', n: 5, title: 'Dédoublonner une photothèque avec une corbeille', tool: 'ChatGPT', model: 'GPT-5' }
          ]
        },
        badges: [
          { m: 'Mariam Diop', b: 'Podium', at: '2026-10-04' },
          { m: 'Julien Moreau', b: 'Podium', at: '2026-10-04' },
          { m: 'Ousmane Sy', b: 'Podium', at: '2026-10-04' },
          { m: 'Kofi Mensah', b: 'Astucieux', at: '2026-10-03' },
          { m: 'Koffi Amoussou', b: 'Première création', at: '2026-09-28' },
          { m: 'Abdoulaye Kane', b: 'Reproductible', at: '2026-10-02' }
        ]
      }
    ]
  };
})();
