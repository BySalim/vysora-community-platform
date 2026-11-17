'use strict';

/* Administration : référentiels (ADM-02, EC-22), documents légaux (EC-25), audience (LEG-03) et
   assistants d'IA (REF-03). Données simulées des écrans administration-referentiels.html,
   -editeurs, -categories, -licences, -etiquettes, -badges, -documents-legaux, -audience et
   -assistants-ia : valeurs initiales du site (apps/api/src/db/seed/donnees-referentiels.ts), avec des
   usages plausibles. Une version à venir et les mesures se calculent depuis le jour de la visite ;
   les mesures d'un même jour sont les mêmes quelle que soit la période choisie. */

window.VYSORA_ADMIN_REFERENTIELS = (() => {
  /* Outils et modèles d'IA ------------------------------------------------------------------------ */

  // [nom, éditeur, famille, type, logo, monochrome, contenus qui le citent, modèles, statut]
  const A = 'ASSISTANT_CONVERSATIONNEL';
  const OUTILS = [
    ['ChatGPT', 'OpenAI', 'ASSISTANT', A, 'openai', true, 412, ['GPT-5.1', 'GPT-5', 'GPT-5 mini', 'GPT Image 1', 'GPT-4o', 'o3']],
    ['Claude', 'Anthropic', 'ASSISTANT', A, 'claude-color', false, 356, ['Claude Opus 4.5', 'Claude Sonnet 4.5', 'Claude Opus 4.1', 'Claude Haiku 4.5']],
    ['Gemini', 'Google', 'ASSISTANT', A, 'gemini-color', false, 198, ['Gemini 3 Pro', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash']],
    ['Le Chat', 'Mistral AI', 'ASSISTANT', A, 'mistral-color', false, 87, ['Mistral Medium 3', 'Magistral Medium', 'Mistral Large 2']],
    ['Copilot', 'Microsoft', 'ASSISTANT', A, 'copilot-color', false, 64, ['GPT-5']],
    ['Perplexity', 'Perplexity', 'ASSISTANT', A, 'perplexity-color', false, 71, ['Sonar Pro']],
    ['DeepSeek', 'DeepSeek', 'ASSISTANT', A, 'deepseek-color', false, 49, ['DeepSeek V3.2', 'DeepSeek R1']],
    ['Grok', 'xAI', 'ASSISTANT', A, 'grok', true, 18, ['Grok 4', 'Grok 4 Fast']],
    ['Qwen', 'Alibaba Cloud', 'ASSISTANT', A, 'qwen-color', false, 9, ['Qwen3', 'Qwen3-Coder']],
    ['Llama', 'Meta', 'ASSISTANT', A, 'meta-color', false, 14, ['Llama 4 Maverick']],
    ['Kimi', 'Moonshot AI', 'ASSISTANT', A, 'kimi-color', false, 3, ['Kimi K2']],
    ['Poe', 'Quora', 'ASSISTANT', A, 'poe-color', true, 2, []],
    ['NotebookLM', 'Google', 'ASSISTANT', A, 'notebooklm', true, 22, ['Gemini 2.5 Flash']],
    ['Notion AI', 'Notion Labs', 'ASSISTANT', A, 'notion', true, 11, []],
    ['Manus', 'Manus AI', 'ASSISTANT', A, 'manus', true, 6, []],
    ['Google AI Studio', 'Google', 'ASSISTANT', A, 'aistudio', true, 15, []],
    ['Gemma', 'Google', 'ASSISTANT', 'AUTRE', 'gemma-color', false, 4, []],
    ['Cohere', 'Cohere', 'ASSISTANT', A, 'cohere-color', false, 1, []],
    ['Hugging Face', 'Hugging Face', 'ASSISTANT', 'AUTRE', 'huggingface-color', false, 7, []],
    ['Ollama', 'Ollama', 'ASSISTANT', 'AUTRE', 'ollama', true, 12, []],
    ['LM Studio', 'Element Labs', 'ASSISTANT', 'AUTRE', 'lmstudio', true, 5, []],
    ['OpenRouter', 'OpenRouter', 'ASSISTANT', 'AUTRE', 'openrouter-color', false, 8, []],
    ['Pi', 'Inflection AI', 'ASSISTANT', A, null, false, 3, ['Inflection 3.0'], 'ARCHIVE'],
    ['Midjourney', 'Midjourney', 'IMAGE', 'GENERATEUR_IMAGE', 'midjourney', true, 288, ['Midjourney v7', 'Midjourney v6.1', 'Niji 6']],
    ['DALL·E', 'OpenAI', 'IMAGE', 'GENERATEUR_IMAGE', 'dalle-color', false, 37, ['DALL·E 3'], 'ARCHIVE'],
    ['Flux', 'Black Forest Labs', 'IMAGE', 'GENERATEUR_IMAGE', 'flux', true, 74, ['Flux 1.1 Pro', 'Flux Kontext Pro', 'Flux Kontext Max']],
    ['Ideogram', 'Ideogram', 'IMAGE', 'GENERATEUR_IMAGE', 'ideogram', true, 41, ['Ideogram 3.0']],
    ['Stable Diffusion', 'Stability AI', 'IMAGE', 'GENERATEUR_IMAGE', 'stability-color', false, 52, ['SDXL', 'Stable Diffusion 3.5 Large']],
    ['Adobe Firefly', 'Adobe', 'IMAGE', 'GENERATEUR_IMAGE', 'adobefirefly-color', false, 33, ['Firefly Image 4']],
    ['Krea', 'Krea', 'IMAGE', 'GENERATEUR_IMAGE', 'krea', true, 12, []],
    ['Recraft', 'Recraft', 'IMAGE', 'GENERATEUR_IMAGE', 'recraft', true, 16, ['Recraft V3']],
    ['ComfyUI', 'Comfy Org', 'IMAGE', 'GENERATEUR_IMAGE', 'comfyui-color', false, 21, []],
    ['Civitai', 'Civitai', 'IMAGE', 'AUTRE', 'civitai-color', false, 0, []],
    ['Figma', 'Figma', 'IMAGE', 'AUTRE', 'figma-color', false, 9, []],
    ['Runway', 'Runway', 'VIDEO', 'GENERATEUR_VIDEO', 'runway', true, 46, ['Gen-4', 'Gen-4 Turbo', 'Aleph']],
    ['Sora', 'OpenAI', 'VIDEO', 'GENERATEUR_VIDEO', 'sora-color', false, 38, ['Sora 2']],
    ['Kling', 'Kuaishou', 'VIDEO', 'GENERATEUR_VIDEO', 'kling-color', false, 31, ['Kling 2.5 Turbo', 'Kling 2.1', 'Kling 2.0']],
    ['Pika', 'Pika', 'VIDEO', 'GENERATEUR_VIDEO', 'pika', true, 7, []],
    ['Luma', 'Luma AI', 'VIDEO', 'GENERATEUR_VIDEO', 'luma-color', false, 13, ['Ray3', 'Ray2']],
    ['Hailuo', 'MiniMax', 'VIDEO', 'GENERATEUR_VIDEO', 'hailuo-color', false, 6, []],
    ['PixVerse', 'PixVerse', 'VIDEO', 'GENERATEUR_VIDEO', 'pixverse-color', false, 2, []],
    ['Vidu', 'ShengShu', 'VIDEO', 'GENERATEUR_VIDEO', 'vidu-color', false, 0, []],
    ['CapCut', 'ByteDance', 'VIDEO', 'GENERATEUR_VIDEO', 'capcut', true, 11, []],
    ['Hedra', 'Hedra', 'VIDEO', 'GENERATEUR_VIDEO', null, false, 0, []],
    ['Suno', 'Suno', 'AUDIO', 'GENERATEUR_AUDIO', 'suno', true, 57, ['Suno v5', 'Suno v4.5']],
    ['Udio', 'Udio', 'AUDIO', 'GENERATEUR_AUDIO', 'udio-color', false, 14, ['Udio v1.5']],
    ['ElevenLabs', 'ElevenLabs', 'AUDIO', 'GENERATEUR_AUDIO', 'elevenlabs', true, 29, ['Eleven Multilingual v2', 'Eleven v3']],
    ['Fish Audio', 'Fish Audio', 'AUDIO', 'GENERATEUR_AUDIO', 'fishaudio', true, 3, []],
    ['Cursor', 'Anysphere', 'CODE', 'EDITEUR_CODE', 'cursor', true, 96, ['Claude Sonnet 4.5', 'Claude Opus 4.5', 'GPT-5', 'GPT-5.1']],
    ['GitHub Copilot', 'GitHub', 'CODE', 'EDITEUR_CODE', 'githubcopilot', true, 58, ['GPT-5', 'Claude Sonnet 4.5']],
    ['Windsurf', 'Cognition', 'CODE', 'EDITEUR_CODE', 'windsurf', true, 17, ['SWE-1']],
    ['v0', 'Vercel', 'CODE', 'CONSTRUCTEUR_APPLICATION', 'v0', true, 21, []],
    ['Lovable', 'Lovable', 'CODE', 'CONSTRUCTEUR_APPLICATION', 'lovable-color', false, 34, []],
    ['Replit', 'Replit', 'CODE', 'CONSTRUCTEUR_APPLICATION', 'replit-color', false, 19, []],
    ['Claude Code', 'Anthropic', 'CODE', 'AGENT_CODE', 'claudecode-color', false, 72, ['Claude Sonnet 4.5', 'Claude Opus 4.5', 'Claude Opus 4.1']],
    ['Gemini CLI', 'Google', 'CODE', 'AGENT_CODE', 'geminicli-color', false, 12, ['Gemini 3 Pro', 'Gemini 2.5 Pro']],
    ['Codex', 'OpenAI', 'CODE', 'AGENT_CODE', 'codex-color', false, 25, ['GPT-5-Codex']],
    ['Trae', 'ByteDance', 'CODE', 'EDITEUR_CODE', 'trae-color', false, 4, []],
    ['Cline', 'Cline', 'CODE', 'AGENT_CODE', 'cline', true, 6, ['Claude Sonnet 4.5']],
    ['Devin', 'Cognition', 'CODE', 'AGENT_CODE', 'devin-color', false, 2, []],
    ['Kiro', 'Amazon Web Services', 'CODE', 'EDITEUR_CODE', 'kiro-color', false, 5, []],
    ['n8n', 'n8n', 'AUTOMATISATION', 'AUTRE', 'n8n-color', false, 63, []],
    ['Zapier', 'Zapier', 'AUTOMATISATION', 'AUTRE', 'zapier-color', false, 28, []],
    ['Make', 'Make', 'AUTOMATISATION', 'AUTRE', 'make-color', false, 22, []],
    ['Dify', 'LangGenius', 'AUTOMATISATION', 'AUTRE', 'dify-color', false, 8, []],
    ['LangChain', 'LangChain', 'AUTOMATISATION', 'AUTRE', 'langchain-color', false, 10, []]
  ];

  // [éditeur, nom complet, nom court, sortie (AAAA-MM-JJ ou null), retiré]
  const MODELES = [
    ['OpenAI', 'GPT-5.1', 'GPT-5.1', '2025-11-12'],
    ['OpenAI', 'GPT-5', 'GPT-5', '2025-08-07'],
    ['OpenAI', 'GPT-5 mini', 'GPT-5 mini', '2025-08-07'],
    ['OpenAI', 'GPT-5-Codex', 'GPT-5-Codex', '2025-09-15'],
    ['OpenAI', 'GPT Image 1', 'GPT Image 1', '2025-04-23'],
    ['OpenAI', 'GPT-4o', 'GPT-4o', '2024-05-13'],
    ['OpenAI', 'o3', 'o3', '2025-04-16'],
    ['OpenAI', 'DALL·E 3', 'DALL·E 3', '2023-10-19', true],
    ['OpenAI', 'Sora 2', 'Sora 2', '2025-09-30'],
    ['Anthropic', 'Claude Opus 4.5', 'Opus 4.5', '2025-11-24'],
    ['Anthropic', 'Claude Sonnet 4.5', 'Sonnet 4.5', '2025-09-29'],
    ['Anthropic', 'Claude Opus 4.1', 'Opus 4.1', '2025-08-05'],
    ['Anthropic', 'Claude Haiku 4.5', 'Haiku 4.5', '2025-10-15'],
    ['Google', 'Gemini 3 Pro', '3 Pro', '2025-11-18'],
    ['Google', 'Gemini 2.5 Pro', '2.5 Pro', '2025-06-17'],
    ['Google', 'Gemini 2.5 Flash', '2.5 Flash', '2025-06-17'],
    ['Mistral AI', 'Mistral Large 2', 'Mistral Large 2', '2024-07-24', true],
    ['Mistral AI', 'Mistral Medium 3', 'Mistral Medium 3', '2025-05-07'],
    ['Mistral AI', 'Magistral Medium', 'Magistral Medium', null],
    ['Perplexity', 'Sonar Pro', 'Sonar Pro', null],
    ['DeepSeek', 'DeepSeek V3.2', 'V3.2', '2025-09-29'],
    ['DeepSeek', 'DeepSeek R1', 'R1', '2025-01-20'],
    ['xAI', 'Grok 4', 'Grok 4', '2025-07-09'],
    ['xAI', 'Grok 4 Fast', 'Grok 4 Fast', null],
    ['Alibaba Cloud', 'Qwen3', 'Qwen3', '2025-04-29'],
    ['Alibaba Cloud', 'Qwen3-Coder', 'Qwen3-Coder', null],
    ['Moonshot AI', 'Kimi K2', 'Kimi K2', null],
    ['Meta', 'Llama 4 Maverick', 'Llama 4 Maverick', '2025-04-05'],
    ['Midjourney', 'Midjourney v7', 'v7', '2025-04-03'],
    ['Midjourney', 'Midjourney v6.1', 'v6.1', '2024-07-30'],
    ['Midjourney', 'Niji 6', 'Niji 6', null],
    ['Black Forest Labs', 'Flux 1.1 Pro', '1.1 Pro', '2024-10-02'],
    ['Black Forest Labs', 'Flux Kontext Pro', 'Kontext Pro', '2025-05-29'],
    ['Black Forest Labs', 'Flux Kontext Max', 'Kontext Max', '2025-05-29'],
    ['Ideogram', 'Ideogram 3.0', '3.0', '2025-03-26'],
    ['Stability AI', 'SDXL', 'SDXL', '2023-07-26'],
    ['Stability AI', 'Stable Diffusion 3.5 Large', 'SD 3.5 Large', '2024-10-22'],
    ['Adobe', 'Firefly Image 4', 'Image 4', '2025-04-24'],
    ['Recraft', 'Recraft V3', 'V3', '2024-10-30'],
    ['Runway', 'Gen-4', 'Gen-4', '2025-03-31'],
    ['Runway', 'Gen-4 Turbo', 'Gen-4 Turbo', null],
    ['Runway', 'Aleph', 'Aleph', null],
    ['Kuaishou', 'Kling 2.5 Turbo', '2.5 Turbo', null],
    ['Kuaishou', 'Kling 2.1', '2.1', '2025-05-29'],
    ['Kuaishou', 'Kling 2.0', '2.0', '2025-04-15', true],
    ['Luma AI', 'Ray3', 'Ray3', null],
    ['Luma AI', 'Ray2', 'Ray2', '2025-01-15'],
    ['Suno', 'Suno v5', 'v5', null],
    ['Suno', 'Suno v4.5', 'v4.5', '2025-05-01'],
    ['Udio', 'Udio v1.5', 'v1.5', '2024-07-23'],
    ['ElevenLabs', 'Eleven Multilingual v2', 'Multilingual v2', '2023-08-22'],
    ['ElevenLabs', 'Eleven v3', 'v3', '2025-06-05'],
    ['Cognition', 'SWE-1', 'SWE-1', '2025-05-15'],
    ['Inflection AI', 'Inflection 3.0', 'Inflection 3.0', '2024-10-07', true]
  ];

  /* Modèles écrits en texte libre par les membres (RG-14) parce qu'absents du référentiel, regroupés
     par outil et par saisie : [saisie, outil, contenus qui la citent, dernière saisie (jours)]. */
  const SAISIES_LIBRES = [
    ['Gemini 3 Flash', 'Gemini', 9, 0],
    ['GPT-5.2', 'ChatGPT', 14, 1],
    ['Nano Banana', 'Gemini', 6, 2],
    ['Grok 4.1', 'Grok', 3, 5],
    ['Sonet 4.5', 'Claude', 1, 12]
  ];

  /** Éditeurs archivés (leurs outils et leurs modèles l'ont été avec eux). */
  const EDITEURS_ARCHIVES = ['Inflection AI'];

  const editeurs = [];
  const editeurId = nom => {
    let e = editeurs.find(x => x.nom === nom);
    if (!e) { e = { id: editeurs.length + 1, nom, actif: !EDITEURS_ARCHIVES.includes(nom) }; editeurs.push(e); }
    return e.id;
  };
  OUTILS.forEach(([, editeur]) => editeurId(editeur));
  const modeles = MODELES.map(([editeur, nom, nomCourt, dateSortie, retire], i) => ({
    id: i + 1, editeurId: editeurId(editeur), nom, nomCourt, dateSortie, statut: retire ? 'RETIRE' : 'DISPONIBLE'
  }));
  const outils = OUTILS.map(([nom, editeur, famille, type, logo, mono, utilisations, noms, statut = 'ACTIF'], i) => ({
    id: i + 1, nom, editeurId: editeurId(editeur), famille, type, logo, logoMonochrome: mono, statut, utilisations,
    modeles: noms.map(n => modeles.find(m => m.nom === n).id)
  }));

  /* Catégories, licences, étiquettes, badges ------------------------------------------------------ */

  // [libellé, adresse, icône, présentation, contenus du domaine, archivée]
  const categories = [
    ['Application web', 'application-web', 'browser', 'Réservations, formulaires, sites vitrines : les parcours pour construire une application qui fonctionne vraiment, sécurité comprise.', 64],
    ['Image et illustration', 'image-et-illustration', 'image', 'Illustrations, photos réalistes, séries cohérentes : les méthodes pour obtenir l’image voulue, puis la garder d’une image à l’autre.', 158],
    ['Texte et rédaction', 'texte-et-redaction', 'pen', 'Lettres, réponses aux clients, traductions : des textes précis, au bon ton, sans formules toutes faites.', 121],
    ['Code et scripts', 'code-et-scripts', 'code', 'Scripts, extensions, requêtes : faire écrire du code qui fait ce que l’on attend, et rien de plus.', 87],
    ['Automatisation', 'automatisation', 'flow', 'E-mails, factures, résumés : automatiser les tâches répétitives en gardant la main sur ce qui part.', 49],
    ['Analyse de données', 'analyse-de-donnees', 'chart', 'Nettoyage, calculs, graphiques : des chiffres justes et des comparaisons honnêtes.', 33],
    ['Vidéo', 'video', 'film', 'Teasers, animations, montages courts : rythme, cadrage et cohérence d’un plan à l’autre.', 41],
    ['Musique et son', 'musique-et-son', 'music', 'Génériques, voix off, ambiances : une durée, un rythme et un ton maîtrisés.', 19],
    ['Éducation', 'education', 'school', 'Fiches, quiz, supports de révision : des contenus fidèles au cours, avec leurs sources.', 28],
    ['Identité visuelle', 'identite-visuelle', 'shapes', 'Logos, palettes, typographies : une identité lisible partout, de l’emballage à l’écran.', 36],
    ['Présentations', 'presentations', 'monitor', 'Diaporamas, supports de réunion, pitchs : des diapositives claires, une idée par écran.', 3, true]
  ].map(([libelle, slug, icone, description, utilisations, archivee], i) => ({ id: i + 1, libelle, slug, icone, description, active: !archivee, utilisations }));

  // [code, libellé, résumé, adresse, variantes permises, par défaut, créations, archivée]
  const licences = [
    ['CC-BY-4.0', 'CC BY 4.0', 'Réutilisation libre, avec mention de votre nom', 'https://creativecommons.org/licenses/by/4.0/deed.fr', true, true, 512],
    ['CC-BY-SA-4.0', 'CC BY-SA 4.0', 'Réutilisation avec mention, sous la même licence', 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr', true, false, 64],
    ['CC-BY-NC-4.0', 'CC BY-NC 4.0', 'Réutilisation avec mention, sans usage commercial', 'https://creativecommons.org/licenses/by-nc/4.0/deed.fr', true, false, 97],
    ['CC0-1.0', 'CC0 1.0', 'Réutilisation sans aucune condition', 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr', true, false, 41],
    ['TOUS-DROITS-RESERVES', 'Tous droits réservés', 'Réutilisation et variantes soumises à votre accord', '/cgu#licences', false, false, 58],
    ['LAL-1.3', 'Licence Art Libre 1.3', 'Réutilisation et variantes avec mention, sous la même licence', 'https://artlibre.org/licence/lal/', true, false, 4, true]
  ].map(([code, libelle, resume, url, autoriseVariantes, parDefaut, utilisations, archivee], i) => ({ id: i + 1, code, libelle, resume, url, autoriseVariantes, parDefaut, active: !archivee, utilisations }));

  // [libellé, contenus qui la portent, archivée] : les membres les créent en les saisissant (CI-04).
  const etiquettes = [
    ['Personnage', 48], ['Cohérence', 41], ['Portrait', 37], ['Script', 29], ['Fichiers', 17], ['Sécurité', 33], ['Logo', 26],
    ['Texte', 22], ['Typographie', 15], ['Résumé', 24], ['Vérification', 31], ['Chiffres', 19], ['Factures', 12], ['E-mails', 21],
    ['Automatisation', 27], ['Ton', 16], ['Rédaction', 34], ['Avis clients', 11], ['Réservation', 14], ['Base de données', 13],
    ['Ventes', 9], ['Tableau', 18], ['Périodes', 4], ['Gouache', 7], ['Texture', 10], ['Réunion', 8], ['Traduction', 20],
    ['Glossaire', 6], ['Relecture', 12], ['Sous-titres', 9], ['Transcription', 11], ['Prompt système', 23], ['Exemples', 18],
    ['Prompt négatif', 14], ['Graine', 8], ['Style', 25], ['Éclairage', 16], ['Photoréalisme', 13], ['Aquarelle', 9],
    ['Pixel art', 5], ['Storyboard', 7], ['Animation', 12], ['Voix off', 10], ['Musique', 15], ['Podcast', 6], ['Jingle', 4],
    ['Tableur', 17], ['SQL', 11], ['Python', 22], ['JavaScript', 16], ['API', 13], ['Webhook', 7], ['Formulaire', 12],
    ['Page d’accueil', 9], ['CV', 10], ['Lettre de motivation', 8], ['Compte rendu', 9], ['Quiz', 11], ['Fiches de révision', 10],
    ['Mathématiques', 6], ['Histoire', 3], ['Anglais', 5], ['Wolof', 4], ['Recette', 3], ['Affiche', 14], ['Carte de visite', 2],
    ['Maquette', 8], ['Icônes', 9], ['Palette', 7], ['Infographie', 6], ['Tableau de bord', 12], ['Prévisions', 5],
    ['Nettoyage de données', 8], ['Graphiques', 10], ['Agent', 19], ['RAG', 7], ['Contexte', 13], ['Données personnelles', 15],
    ['Hallucination', 11], ['Sources', 9], ['IA', 64, true], ['Email', 6, true], ['Chatgpt', 5, true], ['Typo', 3, true],
    ['Test', 1, true], ['Divers', 0, true]
  ].map(([libelle, utilisations, archivee], i) => ({ id: i + 1, libelle, active: !archivee, utilisations }));

  // [code, libellé, critère, catégorie, icône, ton, membres qui l'ont obtenu, attribution arrêtée] (RG-86)
  const badges = [
    ['PIONNIER', 'Pionnier', 'Être inscrit pendant la bêta fermée', 'COMMUNAUTE', 'flag', 'ink', 214, true],
    ['PREMIERE_CREATION', 'Première création', 'Publier sa première création', 'CONTRIBUTION', 'layers', 'blue', 486],
    ['PARCOURS_COMPLET', 'Parcours complet', 'Publier un projet d’au moins 3 étapes avec un moment clé', 'CONTRIBUTION', 'route', 'blue', 133],
    ['REPRODUCTIBLE', 'Reproductible', 'Être reproduit avec succès par 5 membres', 'CONTRIBUTION', 'repeat', 'green', 41],
    ['ASTUCIEUX', 'Astucieux', 'Recevoir 10 votes « Testé, ça marche » sur une astuce', 'CONTRIBUTION', 'utile', 'green', 18],
    ['PREMIER_ESSAI', 'Premier essai', 'Déclarer sa première reproduction', 'APPRENTISSAGE', 'check-circle', 'blue', 352],
    ['BON_REFLEXE', 'Bon réflexe', 'Réussir 10 cas Bon réflexe', 'APPRENTISSAGE', 'bulb', 'amber', 97],
    ['ASSIDU', 'Assidu', 'Répondre à 50 cas Bon réflexe', 'APPRENTISSAGE', 'history', 'amber', 26],
    ['PREMIER_COUP_DE_MAIN', 'Premier coup de main', 'Obtenir sa première réponse acceptée', 'COMMUNAUTE', 'reply', 'green', 171],
    ['MENTOR', 'Mentor', 'Obtenir 10 réponses acceptées', 'COMMUNAUTE', 'message', 'ink', 12],
    ['VIGILANT', 'Vigilant', 'Avoir 5 signalements jugés fondés', 'COMMUNAUTE', 'shield', 'ink', 0],
    ['PARTICIPANT', 'Participant', 'Participer à un défi clôturé', 'COMMUNAUTE', 'calendar', 'blue', 143],
    ['PODIUM', 'Podium', 'Terminer dans les 3 premiers d’un défi', 'COMMUNAUTE', 'trophy', 'amber', 21]
  ].map(([code, libelle, critere, categorie, icone, ton, obtentions, arrete], i) => ({ id: i + 1, code, libelle, critere, categorie, icone, ton, actif: !arrete, obtentions }));

  /* Documents légaux (EC-25, RG-112) ------------------------------------------------------------- */

  const jourIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dansJours = n => { const d = new Date(); d.setDate(d.getDate() + n); return jourIso(d); };

  /* Versions de chaque document, la plus récente d'abord. `aVenir` : version à venir (ses dates se
     calculent depuis le jour de la visite), montrée selon l'état « Versions » du panneau Tweaks. */
  const documents = [
    { type: 'CGU', url: 'cgu.html', acceptationRequise: true, versions: [
      { id: 4, dateEffet: '2026-10-15', resumeChangements: 'Le nombre de publications autorisées par 24 heures dépend désormais de votre niveau.', dateAnnonce: '2026-10-15T07:00:00', acceptations: 1184 },
      { id: 1, dateEffet: '2026-09-01', resumeChangements: null, dateAnnonce: null, acceptations: 1027 }
    ] },
    { type: 'CONFIDENTIALITE', url: 'confidentialite.html', acceptationRequise: false, versions: [
      { id: 6, aVenir: 4, resumeChangements: 'Mesure d’audience sans cookie, suivi des parcours avec votre accord, et masquage provisoire d’un contenu signalé à plusieurs reprises.', dateAnnonce: null, acceptations: 0 },
      { id: 2, dateEffet: '2026-09-01', resumeChangements: null, dateAnnonce: null, acceptations: 0 }
    ] },
    { type: 'CHARTE', url: 'charte-communautaire.html', acceptationRequise: true, versions: [
      { id: 5, dateEffet: '2026-10-15', resumeChangements: 'Un prompt qui contient une clé d’API ou une donnée personnelle est masqué jusqu’à sa correction.', dateAnnonce: '2026-10-15T07:00:00', acceptations: 1171 },
      { id: 3, dateEffet: '2026-09-01', resumeChangements: null, dateAnnonce: null, acceptations: 1027 }
    ] }
  ].map(d => ({ ...d, versions: d.versions.map(v => (v.aVenir ? { ...v, dateEffet: dansJours(v.aVenir) } : v)) }));

  /* Adresses du site et pages du prototype ------------------------------------------------------- */

  const CREATIONS = {
    1: 'cite-ciel-mer', 2: 'keur-awa', 3: 'portrait-gouache', 4: 'ventes-boutique', 5: 'factures-auto',
    6: 'lettre-motivation', 7: 'bissap', 8: 'renommer-photos', 11: 'teaser-festival', 12: 'logo-karite'
  };
  /** Page du prototype qui correspond à une adresse du site (« /creations/3-portrait… »). */
  function versPrototype(chemin) {
    const [route, requete = ''] = chemin.split('?');
    const suite = requete ? `?${requete}` : '';
    let m;
    if (route === '/') return 'index.html';
    if ((m = route.match(/^\/creations\/(\d+)/))) return CREATIONS[m[1]] ? `fiche-creation.html?id=${CREATIONS[m[1]]}` : 'explorer.html';
    if ((m = route.match(/^\/forum\/(\d+)/))) return `forum.html?sujet=sujet-${m[1]}`;
    if ((m = route.match(/^\/categories\/([\w-]+)/))) return `categorie.html?domaine=${m[1]}`;
    if (/^\/defis\//.test(route)) return 'defis.html';
    if (/^\/membres\//.test(route)) return 'profil.html';
    return `${route.slice(1)}.html${suite}`;
  }

  /* Mesures : tirage stable, le même pour un jour donné ---------------------------------------- */

  function hasard(graine) {
    let a = graine >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const MS_JOUR = 86400000;
  const numeroJour = iso => Math.round(Date.parse(`${iso}T00:00:00Z`) / MS_JOUR);
  /** Les `jours` derniers jours, aujourd'hui compris. */
  const periode = jours => Array.from({ length: jours }, (_, i) => dansJours(i - jours + 1));
  const repartir = (total, parts) => parts.map(([valeur, part]) => ({ valeur, nombre: Math.round(total * part) })).filter(l => l.nombre > 0);

  /* Audience (LEG-03) ------------------------------------------------------------------------ */

  const PAGES = [
    ['/', 0.21], ['/explorer', 0.14], ['/apprendre', 0.065], ['/forum', 0.055],
    ['/creations/3-portrait-editorial-en-gouache-numerique', 0.034], ['/inscription', 0.032], ['/classements', 0.028],
    ['/explorer?guide=rendez-vous', 0.026], ['/creations/2-prise-de-rendez-vous-pour-un-salon-de-coiffure', 0.024],
    ['/connexion', 0.022], ['/defis', 0.021], ['/apprendre?savoir=hallucination', 0.018],
    ['/categories/image-et-illustration', 0.017], ['/forum/1-mon-personnage-change-de-visage-a-chaque-nouvelle-image', 0.016],
    ['/creations/5-tri-automatique-des-factures-recues-par-e-mail', 0.014], ['/apprendre?rubrique=bon-reflexe', 0.013],
    ['/creations/12-logo-pour-une-cooperative-de-karite', 0.012], ['/categories/application-web', 0.011],
    ['/explorer?guide=identite', 0.01], ['/forum/2-comment-verifier-qu-un-script-ne-supprime-rien-par-erreur', 0.009]
  ];
  const PROVENANCES = [
    ['(direct)', 0.34], ['google.com', 0.24], ['linkedin.com', 0.09], ['whatsapp', 0.07], ['chatgpt.com', 0.05],
    ['facebook.com', 0.045], ['x.com', 0.03], ['bing.com', 0.025], ['newsletter', 0.02], ['claude.ai', 0.015],
    ['perplexity.ai', 0.01], ['github.com', 0.008]
  ];
  const APPAREILS = [['ORDINATEUR', 0.52], ['MOBILE', 0.44], ['TABLETTE', 0.04]];
  const NAVIGATEURS = [['CHROME', 0.58], ['SAFARI', 0.19], ['EDGE', 0.09], ['FIREFOX', 0.06], ['SAMSUNG', 0.04], ['OPERA', 0.02], ['AUTRE', 0.02]];
  const SYSTEMES = [['ANDROID', 0.33], ['WINDOWS', 0.3], ['IOS', 0.15], ['MACOS', 0.14], ['LINUX', 0.05], ['CHROMEOS', 0.02], ['AUTRE', 0.01]];
  // Problèmes relevés sur trente jours, ramenés à la période.
  const INTROUVABLES = [['(autre)', 14], ['/creations/48-affiche-du-salon-du-livre', 9], ['/forum/23', 5], ['/apprendre?savoir=chaine-de-pensee', 3], ['/categories/presentations', 2]];
  const ERREURS_PAGES = [['/creations/31-tableau-de-bord-de-tresorerie', 2]];
  const ERREURS_API = [['POST /api/v1/creations/:id/essais', 3], ['GET /api/v1/recherche', 1]];
  const ERREURS_NAVIGATEUR = [
    { page: '/creations/nouvelle', message: 'TypeError: Cannot read properties of null (reading \'focus\')', nombre: 4 },
    { page: '/explorer', message: 'ResizeObserver loop completed with undelivered notifications.', nombre: 2 }
  ];
  const ramener = (lignes, jours) => lignes.map(([valeur, n]) => ({ valeur, nombre: Math.round((n * jours) / 30) })).filter(l => l.nombre > 0);

  /** Visiteurs du jour : semaine plus calme le week-end, fréquentation qui monte depuis l'ouverture. */
  function jourDeMesure(iso, aujourdhui) {
    const n = numeroJour(iso);
    const r = hasard(n * 7919);
    const semaine = [0.72, 1.08, 1.04, 1.05, 1.03, 0.96, 0.78][new Date(`${iso}T12:00:00`).getDay()];
    const ecart = numeroJour(aujourdhui) - n;
    const tendance = 150 + 80 * Math.max(0, 1 - ecart / 120);
    const partDuJour = ecart === 0 ? 0.45 : 1;
    const visiteurs = Math.round(tendance * semaine * (0.88 + r() * 0.24) * partDuJour);
    return { jour: iso, visiteurs, pagesVues: Math.round(visiteurs * (3.2 + r() * 0.6)) };
  }

  /** Mesure de la période (MesureAudienceApi). */
  function audience(jours) {
    const jourList = periode(jours);
    const aujourdhui = jourList[jourList.length - 1];
    const parJour = jourList.map(iso => jourDeMesure(iso, aujourdhui));
    const visiteurs = parJour.reduce((s, p) => s + p.visiteurs, 0);
    const pagesVues = parJour.reduce((s, p) => s + p.pagesVues, 0);
    const visites = Math.round(visiteurs * 1.12);
    const problemes = {
      introuvables: ramener(INTROUVABLES, jours),
      erreursPages: ramener(ERREURS_PAGES, jours),
      erreursApi: ramener(ERREURS_API, jours),
      erreursNavigateur: ERREURS_NAVIGATEUR.map(e => ({ ...e, nombre: Math.round((e.nombre * jours) / 30) })).filter(e => e.nombre > 0)
    };
    const nbProblemes = [...problemes.introuvables, ...problemes.erreursPages, ...problemes.erreursApi, ...problemes.erreursNavigateur]
      .reduce((s, l) => s + l.nombre, 0);
    const suivies = Math.round(visites * 0.27);
    const parcours = {
      visites: suivies,
      pagesParVisite: 4.3,
      dureeMedianeSecondes: 312,
      entrees: repartir(suivies, [['/', 0.38], ['/explorer', 0.16], ['/apprendre?savoir=hallucination', 0.07], ['/creations/3-portrait-editorial-en-gouache-numerique', 0.06], ['/explorer?guide=rendez-vous', 0.05], ['/forum/1-mon-personnage-change-de-visage-a-chaque-nouvelle-image', 0.04]]),
      sorties: repartir(suivies, [['/explorer', 0.19], ['/', 0.15], ['/inscription', 0.09], ['/creations/3-portrait-editorial-en-gouache-numerique', 0.07], ['/apprendre', 0.06], ['/forum', 0.05]]),
      enchainements: [
        ['/', '/explorer', 0.31], ['/explorer', '/creations/3-portrait-editorial-en-gouache-numerique', 0.12], ['/', '/inscription', 0.1],
        ['/explorer', '/explorer?guide=rendez-vous', 0.09], ['/apprendre', '/apprendre?savoir=hallucination', 0.08], ['/', '/apprendre', 0.08],
        ['/forum', '/forum/1-mon-personnage-change-de-visage-a-chaque-nouvelle-image', 0.06], ['/inscription', '/', 0.05],
        ['/explorer', '/categories/image-et-illustration', 0.05], ['/connexion', '/creations/nouvelle', 0.04], ['/', '/defis', 0.04], ['/classements', '/membres/clarisse-mendy', 0.03]
      ].map(([de, vers, part]) => ({ de, vers, nombre: Math.round(suivies * part) })).filter(s => s.nombre > 0),
      evenements: [['INSCRIPTION', 0.045], ['CONNEXION', 0.21], ['CREATION_PUBLIEE', 0.03], ['SUJET_PUBLIE', 0.012], ['REPONSE_PUBLIEE', 0.02],
        ['COMMENTAIRE_PUBLIE', 0.035], ['ESSAI_DECLARE', 0.018], ['VOTE', 0.09], ['MESSAGE_CONTACT', 0.004], ['RECHERCHE', 0.14]]
        .map(([code, part]) => ({ code, visites: Math.round(suivies * part) })).filter(e => e.visites > 0),
      inscription: { visitesPageInscription: Math.round(suivies * 0.11), visitesInscrites: Math.round(suivies * 0.045) },
      avecErreur: [
        { ilYa: 3, provenance: 'google.com', appareil: 'MOBILE', navigateur: 'CHROME', systeme: 'ANDROID', etapes: [
          { nature: 'PAGE', valeur: '/creations/3-portrait-editorial-en-gouache-numerique', detail: '', secondes: 0 },
          { nature: 'PAGE', valeur: '/connexion', detail: '', secondes: 74 },
          { nature: 'EVENEMENT', valeur: 'CONNEXION', detail: '', secondes: 118 },
          { nature: 'PAGE', valeur: '/creations/3-portrait-editorial-en-gouache-numerique', detail: '', secondes: 121 },
          { nature: 'ERREUR', valeur: 'POST /api/v1/creations/:id/essais', detail: 'ERREUR_INTERNE', secondes: 402 }
        ] },
        { ilYa: 27, provenance: '(direct)', appareil: 'ORDINATEUR', navigateur: 'FIREFOX', systeme: 'WINDOWS', etapes: [
          { nature: 'PAGE', valeur: '/', detail: '', secondes: 0 },
          { nature: 'PAGE', valeur: '/creations/nouvelle', detail: '', secondes: 41 },
          { nature: 'ERREUR', valeur: '/creations/nouvelle', detail: 'TypeError: Cannot read properties of null (reading \'focus\')', secondes: 43 },
          { nature: 'PAGE', valeur: '/creations/nouvelle', detail: '', secondes: 96 },
          { nature: 'EVENEMENT', valeur: 'CREATION_PUBLIEE', detail: '', secondes: 1288 }
        ] },
        { ilYa: 51, provenance: 'linkedin.com', appareil: 'MOBILE', navigateur: 'SAFARI', systeme: 'IOS', etapes: [
          { nature: 'ERREUR', valeur: '/creations/48-affiche-du-salon-du-livre', detail: '404', secondes: 0 },
          { nature: 'PAGE', valeur: '/explorer', detail: '', secondes: 12 },
          { nature: 'EVENEMENT', valeur: 'RECHERCHE', detail: '', secondes: 30 },
          { nature: 'PAGE', valeur: '/categories/image-et-illustration', detail: '', secondes: 58 }
        ] },
        { ilYa: 140, provenance: 'whatsapp', appareil: 'MOBILE', navigateur: 'SAMSUNG', systeme: 'ANDROID', etapes: [
          { nature: 'PAGE', valeur: '/inscription', detail: '', secondes: 0 },
          { nature: 'ERREUR', valeur: 'POST /api/v1/comptes', detail: 'VALIDATION', secondes: 95 },
          { nature: 'EVENEMENT', valeur: 'INSCRIPTION', detail: '', secondes: 151 },
          { nature: 'PAGE', valeur: '/', detail: '', secondes: 154 }
        ] }
      ].filter(v => v.ilYa < jours * 24).map(({ ilYa, ...v }) => ({ ...v, debut: new Date(Date.now() - ilYa * 3600000).toISOString() }))
    };
    return {
      jours, du: jourList[0], au: aujourdhui,
      chiffres: { visiteurs, visites, pagesVues, problemes: nbProblemes },
      parJour,
      pages: repartir(pagesVues, PAGES),
      provenances: repartir(visites, PROVENANCES),
      appareils: repartir(visiteurs, APPAREILS).map(({ valeur, nombre }) => ({ code: valeur, nombre })),
      navigateurs: repartir(visiteurs, NAVIGATEURS).map(({ valeur, nombre }) => ({ code: valeur, nombre })),
      systemes: repartir(visiteurs, SYSTEMES).map(({ valeur, nombre }) => ({ code: valeur, nombre })),
      problemes,
      parcours
    };
  }

  /* Assistants d'IA (REF-03) ----------------------------------------------------------------- */

  // Sur trente jours : [code, nom, visites envoyées, pages lues, pages explorées, entraînement].
  const ASSISTANTS = [
    ['CHATGPT', 'ChatGPT', 214, 386, 1942, 2310], ['CLAUDE', 'Claude', 96, 241, 1108, 1874],
    ['PERPLEXITY', 'Perplexity', 71, 318, 1455, 0], ['GEMINI', 'Gemini', 38, 0, 0, 0], ['COPILOT', 'Copilot', 22, 0, 0, 0],
    ['MISTRAL', 'Le Chat (Mistral AI)', 9, 47, 0, 0], ['DEEPSEEK', 'DeepSeek', 6, 0, 0, 0],
    ['DUCKDUCKGO', 'Duck.ai (DuckDuckGo)', 0, 0, 212, 0], ['META', 'Meta AI', 2, 0, 0, 806], ['AUTRES', 'Autres robots d’IA', 0, 0, 0, 1377]
  ];
  // Sur trente jours : [page, visites envoyées, pages lues, pages explorées].
  const PAGES_ASSISTANTS = [
    ['/', 61, 42, 318], ['/explorer', 27, 35, 286], ['/apprendre?savoir=hallucination', 44, 96, 141],
    ['/apprendre?savoir=demande-claire', 31, 74, 122], ['/creations/3-portrait-editorial-en-gouache-numerique', 28, 51, 97],
    ['/explorer?guide=rendez-vous', 22, 63, 88], ['/apprendre?savoir=prompt', 19, 58, 104],
    ['/forum/1-mon-personnage-change-de-visage-a-chaque-nouvelle-image', 17, 49, 76],
    ['/creations/2-prise-de-rendez-vous-pour-un-salon-de-coiffure', 15, 38, 81], ['/apprendre?rubrique=bon-reflexe', 12, 27, 93],
    ['/categories/image-et-illustration', 9, 22, 112], ['/forum/2-comment-verifier-qu-un-script-ne-supprime-rien-par-erreur', 11, 31, 64],
    ['/creations/8-script-python-qui-renomme-des-photos-selon-leur-date', 10, 29, 58], ['/apprendre', 8, 12, 133], ['/forum', 5, 9, 127],
    ['/creations/5-tri-automatique-des-factures-recues-par-e-mail', 7, 18, 52], ['/explorer?guide=identite', 6, 16, 47],
    ['/classements', 3, 4, 71], ['/defis', 2, 6, 66], ['/categories/application-web', 4, 11, 59]
  ];
  const FACTEURS = { 7: 0.24, 30: 1, 90: 2.4 };

  /** Mesure de la période (MesureAssistantsApi). */
  function assistants(jours) {
    const jourList = periode(jours);
    const f = FACTEURS[jours] ?? jours / 30;
    const n = v => Math.round(v * f);
    const liste = ASSISTANTS
      .map(([code, nom, VISITE, LECTURE, EXPLORATION, ENTRAINEMENT]) => ({ code, nom, VISITE: n(VISITE), LECTURE: n(LECTURE), EXPLORATION: n(EXPLORATION), ENTRAINEMENT: n(ENTRAINEMENT) }))
      .filter(a => a.VISITE + a.LECTURE + a.EXPLORATION + a.ENTRAINEMENT > 0)
      .sort((a, b) => (b.VISITE + b.LECTURE + b.EXPLORATION + b.ENTRAINEMENT) - (a.VISITE + a.LECTURE + a.EXPLORATION + a.ENTRAINEMENT));
    const totaux = ['VISITE', 'LECTURE', 'EXPLORATION', 'ENTRAINEMENT'].reduce((t, nature) => ({ ...t, [nature]: liste.reduce((s, a) => s + a[nature], 0) }), {});
    const pages = PAGES_ASSISTANTS
      .map(([chemin, VISITE, LECTURE, EXPLORATION]) => ({ chemin, VISITE: n(VISITE), LECTURE: n(LECTURE), EXPLORATION: n(EXPLORATION), ENTRAINEMENT: 0 }))
      .filter(p => p.VISITE + p.LECTURE + p.EXPLORATION > 0)
      .sort((a, b) => (b.VISITE + b.LECTURE) - (a.VISITE + a.LECTURE) || b.EXPLORATION - a.EXPLORATION);
    return { jours, du: jourList[0], au: jourList[jourList.length - 1], totaux, assistants: liste, pages };
  }

  return {
    /** Change quand les données changent : les changements simulés d'une session plus ancienne sont oubliés. */
    version: 2,
    saisiesLibres: SAISIES_LIBRES.map(([texte, outil, contenus, ilYa], i) => ({ id: i + 1, texte, outil, contenus, derniere: dansJours(-ilYa) })),
    editeurs, outils, modeles, categories, licences, etiquettes, badges, documents,
    audience, assistants, versPrototype, jourIso
  };
})();
