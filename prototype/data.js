'use strict';

window.VYSORA_DATA = {
  today: '2026-10-13',
  challengeEnd: '2026-10-19T23:59:00',

  avatars: {
    'Léa Martin': 'lea-martin',
    'Claire Dubois': 'claire-dubois',
    'Aïssatou Ndiaye': 'aissatou-ndiaye',
    'Ndeye Fall': 'ndeye-fall',
    'Awa Sarr': 'awa-sarr',
    'Fatoumata Coulibaly': 'fatoumata-coulibaly',
    'Mariam Diop': 'mariam-diop',
    'Kofi Mensah': 'kofi-mensah',
    'Moussa Diallo': 'moussa-diallo',
    'Ibrahima Sow': 'ibrahima-sow',
    'Ousmane Sy': 'ousmane-sy',
    'Koffi Amoussou': 'koffi-amoussou',
    'Yacine Benali': 'yacine-benali',
    'Julien Moreau': 'julien-moreau',
    'Hugo Girard': 'hugo-girard',
    'Sébastien Roy': 'sebastien-roy',
    'Thomas Lefèvre': 'thomas-lefevre'
  },

  showcase: [
    {
      id: 'cite-ciel-mer',
      type: 'prompt',
      title: 'Cité imaginaire entre ciel et mer',
      author: 'Léa Martin', level: 'Apprenti',
      config: 'ChatGPT · GPT Image 1',
      media: { kind: 'image', name: 'cite-imaginaire', large: 1280, alt: 'Cité de tours élancées sur une île rocheuse au coucher du soleil' },
      prompt: 'Illustration panoramique d’une cité méditerranéenne imaginaire, tours élancées au centre, île rocheuse, mer bleu cobalt, ciel abricot, texture peinte, sans texte.',
      method: [
        { kind: 'config', text: 'Meilleur résultat parmi 4 essais' },
        { kind: 'moment', type: 'Découverte', text: '« Tours élancées au centre » a évité les compositions chargées.' }
      ],
      proof: '44 reproductions · 61 % de succès',
      chips: ['Moment clé · Découverte', '44 reproductions', 'Testée avec 3 modèles']
    },
    {
      id: 'keur-awa',
      type: 'iteration',
      title: 'Prise de rendez-vous pour un salon de coiffure',
      author: 'Aïssatou Ndiaye', level: 'Artisan',
      config: 'Claude · Sonnet 4.5',
      media: { kind: 'mock', mock: 'booking', alt: 'Page de réservation d’un salon de coiffure avec les créneaux du samedi' },
      prompt: 'Les créneaux déjà réservés restent sélectionnables. Désactive-les et refuse côté serveur toute réservation sur un créneau pris.',
      method: [
        { kind: 'moment', type: 'Vérification', text: 'Deux réservations passaient sur le même créneau.' },
        { kind: 'moment', type: 'Refus', text: 'Les numéros de téléphone étaient stockés dans le navigateur.' }
      ],
      proof: '31 reproductions · 84 % de succès',
      chips: ['Moment clé · Refus', '31 reproductions', '3 échanges']
    },
    {
      id: 'portrait-gouache',
      type: 'iteration',
      title: 'Portrait éditorial en gouache numérique',
      author: 'Kofi Mensah', level: 'Expert',
      config: 'Midjourney · v7',
      media: { kind: 'image', name: 'portrait-indigo', large: 1254, alt: 'Portrait peint d’une jeune femme au turban orange et bleu' },
      prompt: 'Portrait éditorial, gouache numérique, touches visibles, papier à grain fin, fond sarcelle uni, lumière chaude de fin d’après-midi --ar 4:3',
      method: [
        { kind: 'moment', type: 'Correction', text: 'Rendu trop photoréaliste : la technique a été nommée.' },
        { kind: 'moment', type: 'Découverte', text: 'La lumière de fin d’après-midi a réchauffé les tons.' }
      ],
      proof: '18 reproductions · 72 % de succès',
      chips: ['Moment clé · Correction', '18 reproductions', 'Midjourney v7']
    }
  ],

  creations: [
    { id: 'cite-ciel-mer', title: 'Cité imaginaire entre ciel et mer', type: 'prompt', category: 'Image', author: 'Léa Martin', level: 'Apprenti', config: 'ChatGPT · GPT Image 1', media: { kind: 'image', name: 'cite-imaginaire', large: 1280, alt: 'Cité de tours élancées sur une île rocheuse au coucher du soleil' }, steps: [1], useful: 389, week: 156, repro: 44, success: 61, published: '6 oct.' },
    { id: 'keur-awa', title: 'Prise de rendez-vous pour un salon de coiffure', type: 'iteration', category: 'Application web', author: 'Aïssatou Ndiaye', level: 'Artisan', config: 'Claude · Sonnet 4.5', media: { kind: 'mock', mock: 'booking', alt: 'Page de réservation avec les créneaux du samedi' }, steps: [0, 1, 1], useful: 412, week: 148, repro: 31, success: 84, published: '2 oct.' },
    { id: 'portrait-gouache', title: 'Portrait éditorial en gouache numérique', type: 'iteration', category: 'Illustration', author: 'Kofi Mensah', level: 'Expert', config: 'Midjourney · v7', media: { kind: 'image', name: 'portrait-indigo', large: 1254, alt: 'Portrait peint d’une jeune femme au turban orange et bleu' }, steps: [0, 1, 1], useful: 356, week: 121, repro: 18, success: 72, published: '4 oct.' },
    { id: 'ventes-boutique', title: 'Tableau de bord des ventes d’une boutique en ligne', type: 'projet', category: 'Analyse de données', author: 'Claire Dubois', level: 'Maître', config: 'ChatGPT · GPT-5 et Google Sheets', media: { kind: 'mock', mock: 'dashboard', alt: 'Tableau de bord avec trois indicateurs et un graphique mensuel' }, steps: [0, 1, 1, 1], useful: 288, week: 97, repro: null, published: '29 sept.' },
    { id: 'factures-auto', title: 'Tri automatique des factures reçues par e-mail', type: 'projet', category: 'Automatisation', author: 'Moussa Diallo', level: 'Expert', config: 'n8n et Claude · Haiku 4.5', media: { kind: 'mock', mock: 'flow', alt: 'Schéma reliant la messagerie, l’extraction des montants et le classement' }, steps: [1, 0, 1, 0], useful: 197, week: 74, repro: null, published: '1 oct.' },
    { id: 'lettre-motivation', title: 'Lettre de motivation sans formules toutes faites', type: 'iteration', category: 'Texte', author: 'Yacine Benali', level: 'Artisan', config: 'Le Chat · Mistral Large 2', media: { kind: 'mock', mock: 'letter', alt: 'Lettre où une formule générique est remplacée par un fait précis' }, steps: [0, 1, 1], useful: 240, week: 69, repro: 27, success: 89, published: '3 oct.' },
    { id: 'bissap', title: 'Photo produit pour une infusion de bissap', type: 'prompt', category: 'Image', author: 'Ndeye Fall', level: 'Apprenti', config: 'Flux 1.1 Pro', media: { kind: 'image', name: 'bissap', large: 1280, alt: 'Tasse d’infusion rouge posée sur des fleurs d’hibiscus séchées' }, steps: [1], useful: 12, week: 12, repro: 0, published: 'il y a 9 min' },
    { id: 'renommer-photos', title: 'Script Python qui renomme des photos selon leur date', type: 'prompt', category: 'Code', author: 'Julien Moreau', level: 'Artisan', config: 'ChatGPT · GPT-5', media: { kind: 'mock', mock: 'code', alt: 'Extrait d’un script Python qui parcourt un dossier de photos' }, steps: [1], useful: 9, week: 9, repro: 1, published: 'il y a 26 min' },
    { id: 'icones-3d', title: 'Icônes 3D pour une application de covoiturage', type: 'iteration', category: 'Image', author: 'Sébastien Roy', level: 'Curieux', config: 'Midjourney · v7', media: { kind: 'image', name: 'formes-pastel', large: 1200, alt: 'Formes arrondies en relief aux tons bleu pâle et pêche' }, steps: [0, 1], useful: 6, week: 6, repro: 0, published: 'il y a 48 min' },
    { id: 'fiches-revision', title: 'Fiches de révision sur la photosynthèse', type: 'iteration', category: 'Éducation', author: 'Awa Sarr', level: 'Apprenti', config: 'Gemini · 2.5 Pro', media: { kind: 'mock', mock: 'cards', alt: 'Fiches de révision empilées sur la photosynthèse' }, steps: [0, 1], useful: 5, week: 5, repro: 0, published: 'il y a 1 h' },
    { id: 'teaser-festival', title: 'Teaser de 15 secondes pour un festival de musique', type: 'projet', category: 'Vidéo', author: 'Ibrahima Sow', level: 'Expert', config: 'Runway · Gen-4 et Suno · v4.5', media: { kind: 'image', name: 'scene-festival', large: 1280, alt: 'Faisceaux de lumière bleue traversant une scène dans la brume' }, steps: [0, 1, 0], useful: 4, week: 4, repro: null, published: 'il y a 2 h' },
    { id: 'logo-karite', title: 'Logo pour une coopérative de karité', type: 'iteration', category: 'Identité visuelle', author: 'Fatoumata Coulibaly', level: 'Artisan', config: 'Ideogram · 3.0', media: { kind: 'mock', mock: 'logo', alt: 'Logo avec une noix de karité stylisée et le nom de la coopérative' }, steps: [0, 1], useful: 3, week: 3, repro: 0, published: 'il y a 3 h' },
    { id: 'visuel-conference', title: 'Visuel d’ouverture pour une conférence tech', type: 'prompt', category: 'Image', author: 'Thomas Lefèvre', level: 'Apprenti', config: 'Midjourney · v7', media: { kind: 'image', name: 'vagues-3d', large: 1200, alt: 'Volutes bleues en relief superposées sur fond bleu nuit' }, steps: [1], useful: 3, week: 3, repro: 0, published: 'il y a 4 h' },
    { id: 'pochette-album', title: 'Motif génératif pour une pochette d’album', type: 'iteration', category: 'Image', author: 'Hugo Girard', level: 'Artisan', config: 'Stable Diffusion · SDXL', media: { kind: 'image', name: 'spirale', large: 1280, alt: 'Spirale de fines lames bleu nuit aux bords turquoise' }, steps: [0, 1], useful: 2, week: 2, repro: 0, published: 'il y a 5 h' }
  ],

  lists: {
    useful: ['cite-ciel-mer', 'keur-awa', 'portrait-gouache', 'ventes-boutique', 'factures-auto', 'lettre-motivation'],
    recent: ['bissap', 'renommer-photos', 'icones-3d', 'fiches-revision', 'teaser-festival', 'logo-karite'],
    reproduced: ['cite-ciel-mer', 'keur-awa', 'lettre-motivation', 'portrait-gouache', 'renommer-photos', 'visuel-conference']
  },

  categories: [
    { name: 'Application web', icon: 'browser', count: 312 },
    { name: 'Image et illustration', icon: 'image', count: 588 },
    { name: 'Texte et rédaction', icon: 'pen', count: 241 },
    { name: 'Code et scripts', icon: 'code', count: 276 },
    { name: 'Automatisation', icon: 'flow', count: 97 },
    { name: 'Analyse de données', icon: 'chart', count: 133 },
    { name: 'Vidéo', icon: 'film', count: 64 },
    { name: 'Musique et son', icon: 'music', count: 41 },
    { name: 'Éducation', icon: 'school', count: 118 },
    { name: 'Identité visuelle', icon: 'shapes', count: 87 }
  ],

  tools: [
    { name: 'ChatGPT', logo: 'openai', family: 'assistant', mono: true },
    { name: 'Claude', logo: 'claude-color', family: 'assistant' },
    { name: 'Gemini', logo: 'gemini-color', family: 'assistant' },
    { name: 'Le Chat', logo: 'mistral-color', family: 'assistant' },
    { name: 'Copilot', logo: 'copilot-color', family: 'assistant' },
    { name: 'Perplexity', logo: 'perplexity-color', family: 'assistant' },
    { name: 'DeepSeek', logo: 'deepseek-color', family: 'assistant' },
    { name: 'Grok', logo: 'grok', family: 'assistant', mono: true },
    { name: 'Qwen', logo: 'qwen-color', family: 'assistant' },
    { name: 'Llama', logo: 'meta-color', family: 'assistant' },
    { name: 'Kimi', logo: 'kimi-color', family: 'assistant' },
    { name: 'Poe', logo: 'poe-color', family: 'assistant', mono: true },
    { name: 'NotebookLM', logo: 'notebooklm', family: 'assistant', mono: true },
    { name: 'Notion AI', logo: 'notion', family: 'assistant', mono: true },
    { name: 'Manus', logo: 'manus', family: 'assistant', mono: true },
    { name: 'Google AI Studio', logo: 'aistudio', family: 'assistant', mono: true },
    { name: 'Gemma', logo: 'gemma-color', family: 'assistant' },
    { name: 'Cohere', logo: 'cohere-color', family: 'assistant' },
    { name: 'Hugging Face', logo: 'huggingface-color', family: 'assistant' },
    { name: 'Ollama', logo: 'ollama', family: 'assistant', mono: true },
    { name: 'LM Studio', logo: 'lmstudio', family: 'assistant', mono: true },
    { name: 'OpenRouter', logo: 'openrouter-color', family: 'assistant' },
    { name: 'Midjourney', logo: 'midjourney', family: 'image', mono: true },
    { name: 'DALL·E', logo: 'dalle-color', family: 'image' },
    { name: 'Flux', logo: 'flux', family: 'image', mono: true },
    { name: 'Ideogram', logo: 'ideogram', family: 'image', mono: true },
    { name: 'Stable Diffusion', logo: 'stability-color', family: 'image' },
    { name: 'Adobe Firefly', logo: 'adobefirefly-color', family: 'image' },
    { name: 'Krea', logo: 'krea', family: 'image', mono: true },
    { name: 'Recraft', logo: 'recraft', family: 'image', mono: true },
    { name: 'ComfyUI', logo: 'comfyui-color', family: 'image' },
    { name: 'Civitai', logo: 'civitai-color', family: 'image' },
    { name: 'Figma', logo: 'figma-color', family: 'image' },
    { name: 'Runway', logo: 'runway', family: 'video', mono: true },
    { name: 'Sora', logo: 'sora-color', family: 'video' },
    { name: 'Kling', logo: 'kling-color', family: 'video' },
    { name: 'Pika', logo: 'pika', family: 'video', mono: true },
    { name: 'Luma', logo: 'luma-color', family: 'video' },
    { name: 'Hailuo', logo: 'hailuo-color', family: 'video' },
    { name: 'PixVerse', logo: 'pixverse-color', family: 'video' },
    { name: 'Vidu', logo: 'vidu-color', family: 'video' },
    { name: 'CapCut', logo: 'capcut', family: 'video', mono: true },
    { name: 'Suno', logo: 'suno', family: 'audio', mono: true },
    { name: 'Udio', logo: 'udio-color', family: 'audio' },
    { name: 'ElevenLabs', logo: 'elevenlabs', family: 'audio', mono: true },
    { name: 'Fish Audio', logo: 'fishaudio', family: 'audio', mono: true },
    { name: 'Cursor', logo: 'cursor', family: 'code', mono: true },
    { name: 'GitHub Copilot', logo: 'githubcopilot', family: 'code', mono: true },
    { name: 'Windsurf', logo: 'windsurf', family: 'code', mono: true },
    { name: 'v0', logo: 'v0', family: 'code', mono: true },
    { name: 'Lovable', logo: 'lovable-color', family: 'code' },
    { name: 'Replit', logo: 'replit-color', family: 'code' },
    { name: 'Claude Code', logo: 'claudecode-color', family: 'code' },
    { name: 'Gemini CLI', logo: 'geminicli-color', family: 'code' },
    { name: 'Codex', logo: 'codex-color', family: 'code' },
    { name: 'Trae', logo: 'trae-color', family: 'code' },
    { name: 'Cline', logo: 'cline', family: 'code', mono: true },
    { name: 'Devin', logo: 'devin-color', family: 'code' },
    { name: 'Kiro', logo: 'kiro-color', family: 'code' },
    { name: 'n8n', logo: 'n8n-color', family: 'automation' },
    { name: 'Zapier', logo: 'zapier-color', family: 'automation' },
    { name: 'Make', logo: 'make-color', family: 'automation' },
    { name: 'Dify', logo: 'dify-color', family: 'automation' },
    { name: 'LangChain', logo: 'langchain-color', family: 'automation' }
  ],

  toolFamilies: [
    { id: 'all', label: 'Tous' },
    { id: 'assistant', label: 'Assistants' },
    { id: 'image', label: 'Image' },
    { id: 'video', label: 'Vidéo' },
    { id: 'audio', label: 'Audio' },
    { id: 'code', label: 'Code' },
    { id: 'automation', label: 'Automatisation' }
  ],

  toolAliases: { 'GPT-5': 'ChatGPT', 'GPT Image': 'ChatGPT', 'Sonnet': 'Claude', 'Haiku': 'Claude', 'Mistral': 'Le Chat', 'SDXL': 'Stable Diffusion' },

  heroLeads: {
    court: 'Vysora est la communauté où l’on publie ce que l’on crée avec l’IA. Pour reproduire ce qui fonctionne, et comprendre pourquoi.',
    methode: 'Sur Vysora, chaque création publiée montre comment elle a été obtenue. Reproduisez ce qui fonctionne, et comprenez pourquoi.',
    chemin: 'Vysora réunit celles et ceux qui créent avec l’IA et en partagent le chemin parcouru, pour que chacun reproduise ce qui fonctionne et comprenne pourquoi.',
    apprendre: 'Apprenez à créer avec l’IA auprès de celles et ceux qui le font déjà : chaque création est publiée avec ses prompts, ses outils et ses corrections.',
    communaute: 'Les membres de Vysora publient ce qu’ils créent avec l’IA, reproduisent les créations des autres et les améliorent ensemble.'
  },

  feed: [
    { icon: 'repeat', who: 'Awa Sarr', text: 'a reproduit « Lettre de motivation sans formules toutes faites » avec Claude Sonnet 4.5', tag: 'Succès' },
    { icon: 'check-circle', who: 'Moussa Diallo', text: 'a vu sa réponse acceptée dans « Comment vérifier qu’un script ne supprime rien ? »', tag: '+15 points' },
    { icon: 'layers', who: 'Ndeye Fall', text: 'a publié « Photo produit pour une infusion de bissap »', tag: '1 prompt' },
    { icon: 'bulb', who: 'Hugo Girard', text: 'a réussi le cas Bon réflexe « Le pourcentage cité par l’IA est-il fiable ? »', tag: 'Débutant' },
    { icon: 'utile', who: 'Léa Martin', text: 'a testé l’astuce « Isoler le texte exact dans un logo »', tag: 'Testé, ça marche' },
    { icon: 'repeat', who: 'Julien Moreau', text: 'a reproduit « Cité imaginaire entre ciel et mer » avec Flux 1.1 Pro', tag: 'Partiel' },
    { icon: 'alert', who: 'Ousmane Sy', text: 'a signalé qu’une astuce ne fonctionne plus avec Midjourney v6', tag: 'Obsolescence' },
    { icon: 'message', who: 'Mariam Diop', text: 'a ouvert une clinique : « Mon résumé invente des chiffres »', tag: 'Clinique' },
    { icon: 'award', who: 'Sébastien Roy', text: 'a obtenu le badge Premier essai', tag: 'Badge' },
    { icon: 'flag', who: 'Ibrahima Sow', text: 'participe au défi « Une affiche touristique en trois échanges »', tag: 'Défi' },
    { icon: 'repeat', who: 'Claire Dubois', text: 'a reproduit « Prise de rendez-vous pour un salon de coiffure » avec GPT-5', tag: 'Succès' },
    { icon: 'check-circle', who: 'Kofi Mensah', text: 'a aidé à résoudre « Mon personnage change de visage à chaque image »', tag: '+15 points' }
  ],

  activity: {
    start: '2026-09-21',
    values: [1180, 1265, 1302, 1288, 1215, 930, 902, 1290, 1350, 1388, 1361, 1302, 1004, 968, 1488, 1610, 1702, 1655, 1590, 1206, 1173, 1764, 1342]
  },

  week: {
    days: ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'],
    values: [1764, 1342, null, null, null, null, null],
    previous: [1488, 1610, 1702, 1655, 1590, 1206, 1173],
    breakdown: [
      { label: 'Votes « Utile » et « Testé, ça marche »', value: 1291 },
      { label: 'Reproductions déclarées', value: 822 },
      { label: 'Cas Bon réflexe réussis', value: 806 },
      { label: 'Réponses acceptées', value: 187 }
    ]
  },

  topics: [
    { id: 'sujet-1', type: 'Clinique du prompt', title: 'Mon personnage change de visage à chaque nouvelle image', author: 'Koffi Amoussou', time: 'il y a 25 min', config: 'Midjourney · v7' },
    { id: 'sujet-2', type: 'Question', title: 'Comment vérifier qu’un script généré ne supprime rien par erreur ?', author: 'Mariam Diop', time: 'il y a 1 h', config: 'Python' },
    { id: 'sujet-4', type: 'Clinique du prompt', title: 'Le résumé de mon rapport contient des chiffres absents du document', author: 'Julien Moreau', time: 'il y a 2 h', config: 'ChatGPT · GPT-5' }
  ],

  leaderboard: [
    { name: 'Claire Dubois', level: 'Maître', points: 412 },
    { name: 'Kofi Mensah', level: 'Expert', points: 365 },
    { name: 'Aïssatou Ndiaye', level: 'Artisan', points: 341 },
    { name: 'Moussa Diallo', level: 'Expert', points: 296 },
    { name: 'Yacine Benali', level: 'Artisan', points: 254 }
  ],

  badges: [
    { name: 'Pionnier', icon: 'flag', tone: 'ink', rule: 'Être inscrit pendant la bêta fermée' },
    { name: 'Première création', icon: 'layers', tone: 'blue', rule: 'Publier sa première création' },
    { name: 'Parcours complet', icon: 'route', tone: 'blue', rule: 'Publier un projet d’au moins 3 étapes avec un moment clé' },
    { name: 'Reproductible', icon: 'repeat', tone: 'green', rule: 'Être reproduit avec succès par 5 membres' },
    { name: 'Bon réflexe', icon: 'bulb', tone: 'amber', rule: 'Réussir 10 cas Bon réflexe' },
    { name: 'Mentor', icon: 'message', tone: 'ink', rule: 'Obtenir 10 réponses acceptées' },
    { name: 'Astucieux', icon: 'utile', tone: 'green', rule: 'Recevoir 10 votes « Testé, ça marche » sur une astuce' },
    { name: 'Podium', icon: 'trophy', tone: 'amber', rule: 'Terminer dans les 3 premiers d’un défi' }
  ]
};
