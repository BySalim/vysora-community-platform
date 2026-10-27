import type {
  CategorieBadge,
  FamilleOutil,
  TonBadge,
  TypeDocumentLegal,
  TypeOutil,
} from '@vysora/shared';

/* Valeurs initiales des référentiels, reprises du prototype (data.js, nouvelle-creation-data.js,
   profil-data.js, auth-data.js) et des règles RG-20, RG-84 à RG-86. Elles sont ensuite administrées (F-95). */

/** Domaines d'Explorer (explorer-data.js : domains), avec leur présentation. */
// prettier-ignore
export const CATEGORIES: { libelle: string; icone: string; description: string }[] = [
  { libelle: 'Application web', icone: 'browser', description: 'Réservations, formulaires, sites vitrines : les parcours pour construire une application qui fonctionne vraiment, sécurité comprise.' },
  { libelle: 'Image et illustration', icone: 'image', description: 'Illustrations, photos réalistes, séries cohérentes : les méthodes pour obtenir l’image voulue, puis la garder d’une image à l’autre.' },
  { libelle: 'Texte et rédaction', icone: 'pen', description: 'Lettres, réponses aux clients, traductions : des textes précis, au bon ton, sans formules toutes faites.' },
  { libelle: 'Code et scripts', icone: 'code', description: 'Scripts, extensions, requêtes : faire écrire du code qui fait ce que l’on attend, et rien de plus.' },
  { libelle: 'Automatisation', icone: 'flow', description: 'E-mails, factures, résumés : automatiser les tâches répétitives en gardant la main sur ce qui part.' },
  { libelle: 'Analyse de données', icone: 'chart', description: 'Nettoyage, calculs, graphiques : des chiffres justes et des comparaisons honnêtes.' },
  { libelle: 'Vidéo', icone: 'film', description: 'Teasers, animations, montages courts : rythme, cadrage et cohérence d’un plan à l’autre.' },
  { libelle: 'Musique et son', icone: 'music', description: 'Génériques, voix off, ambiances : une durée, un rythme et un ton maîtrisés.' },
  { libelle: 'Éducation', icone: 'school', description: 'Fiches, quiz, supports de révision : des contenus fidèles au cours, avec leurs sources.' },
  { libelle: 'Identité visuelle', icone: 'shapes', description: 'Logos, palettes, typographies : une identité lisible partout, de l’emballage à l’écran.' },
];

// prettier-ignore
export const LICENCES = [
  { code: 'CC-BY-4.0', libelle: 'CC BY 4.0', resume: 'Réutilisation libre, avec mention de votre nom', url: 'https://creativecommons.org/licenses/by/4.0/deed.fr', autoriseVariantes: true, estParDefaut: true },
  { code: 'CC-BY-SA-4.0', libelle: 'CC BY-SA 4.0', resume: 'Réutilisation avec mention, sous la même licence', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr', autoriseVariantes: true, estParDefaut: false },
  { code: 'CC-BY-NC-4.0', libelle: 'CC BY-NC 4.0', resume: 'Réutilisation avec mention, sans usage commercial', url: 'https://creativecommons.org/licenses/by-nc/4.0/deed.fr', autoriseVariantes: true, estParDefaut: false },
  { code: 'CC0-1.0', libelle: 'CC0 1.0', resume: 'Réutilisation sans aucune condition', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr', autoriseVariantes: true, estParDefaut: false },
  { code: 'TOUS-DROITS-RESERVES', libelle: 'Tous droits réservés', resume: 'Réutilisation et variantes soumises à votre accord', url: '/cgu#licences', autoriseVariantes: false, estParDefaut: false },
] as const;

export const TYPES_VOTE = [
  { code: 'UTILE', libelle: 'Utile' },
  { code: 'TESTE_OK', libelle: 'Testé, ça marche' },
] as const;

interface DefinitionModele {
  editeur: string;
  nom: string;
  nomCourt: string;
}

// prettier-ignore
export const MODELES: DefinitionModele[] = [
  { editeur: 'OpenAI', nom: 'GPT-5', nomCourt: 'GPT-5' },
  { editeur: 'OpenAI', nom: 'GPT-5 mini', nomCourt: 'GPT-5 mini' },
  { editeur: 'OpenAI', nom: 'GPT-5-Codex', nomCourt: 'GPT-5-Codex' },
  { editeur: 'OpenAI', nom: 'GPT Image 1', nomCourt: 'GPT Image 1' },
  { editeur: 'OpenAI', nom: 'GPT-4o', nomCourt: 'GPT-4o' },
  { editeur: 'OpenAI', nom: 'o3', nomCourt: 'o3' },
  { editeur: 'OpenAI', nom: 'DALL·E 3', nomCourt: 'DALL·E 3' },
  { editeur: 'OpenAI', nom: 'Sora 2', nomCourt: 'Sora 2' },
  { editeur: 'Anthropic', nom: 'Claude Sonnet 4.5', nomCourt: 'Sonnet 4.5' },
  { editeur: 'Anthropic', nom: 'Claude Opus 4.1', nomCourt: 'Opus 4.1' },
  { editeur: 'Anthropic', nom: 'Claude Haiku 4.5', nomCourt: 'Haiku 4.5' },
  { editeur: 'Google', nom: 'Gemini 2.5 Pro', nomCourt: '2.5 Pro' },
  { editeur: 'Google', nom: 'Gemini 2.5 Flash', nomCourt: '2.5 Flash' },
  { editeur: 'Mistral AI', nom: 'Mistral Large 2', nomCourt: 'Mistral Large 2' },
  { editeur: 'Mistral AI', nom: 'Mistral Medium 3', nomCourt: 'Mistral Medium 3' },
  { editeur: 'Perplexity', nom: 'Sonar Pro', nomCourt: 'Sonar Pro' },
  { editeur: 'DeepSeek', nom: 'DeepSeek V3.2', nomCourt: 'V3.2' },
  { editeur: 'DeepSeek', nom: 'DeepSeek R1', nomCourt: 'R1' },
  { editeur: 'xAI', nom: 'Grok 4', nomCourt: 'Grok 4' },
  { editeur: 'Alibaba Cloud', nom: 'Qwen3', nomCourt: 'Qwen3' },
  { editeur: 'Meta', nom: 'Llama 4 Maverick', nomCourt: 'Llama 4 Maverick' },
  { editeur: 'Midjourney', nom: 'Midjourney v7', nomCourt: 'v7' },
  { editeur: 'Midjourney', nom: 'Midjourney v6.1', nomCourt: 'v6.1' },
  { editeur: 'Midjourney', nom: 'Niji 6', nomCourt: 'Niji 6' },
  { editeur: 'Black Forest Labs', nom: 'Flux 1.1 Pro', nomCourt: '1.1 Pro' },
  { editeur: 'Black Forest Labs', nom: 'Flux Kontext Pro', nomCourt: 'Kontext Pro' },
  { editeur: 'Ideogram', nom: 'Ideogram 3.0', nomCourt: '3.0' },
  { editeur: 'Stability AI', nom: 'SDXL', nomCourt: 'SDXL' },
  { editeur: 'Stability AI', nom: 'Stable Diffusion 3.5 Large', nomCourt: 'SD 3.5 Large' },
  { editeur: 'Adobe', nom: 'Firefly Image 4', nomCourt: 'Image 4' },
  { editeur: 'Recraft', nom: 'Recraft V3', nomCourt: 'V3' },
  { editeur: 'Runway', nom: 'Gen-4', nomCourt: 'Gen-4' },
  { editeur: 'Runway', nom: 'Gen-4 Turbo', nomCourt: 'Gen-4 Turbo' },
  { editeur: 'Kuaishou', nom: 'Kling 2.1', nomCourt: '2.1' },
  { editeur: 'Kuaishou', nom: 'Kling 2.0', nomCourt: '2.0' },
  { editeur: 'Luma AI', nom: 'Ray2', nomCourt: 'Ray2' },
  { editeur: 'Suno', nom: 'Suno v4.5', nomCourt: 'v4.5' },
  { editeur: 'Udio', nom: 'Udio v1.5', nomCourt: 'v1.5' },
  { editeur: 'ElevenLabs', nom: 'Eleven Multilingual v2', nomCourt: 'Multilingual v2' },
  { editeur: 'ElevenLabs', nom: 'Eleven v3', nomCourt: 'v3' },
  { editeur: 'Cognition', nom: 'SWE-1', nomCourt: 'SWE-1' },
];

interface DefinitionOutil {
  nom: string;
  editeur: string;
  famille: FamilleOutil;
  type: TypeOutil;
  logo: string;
  monochrome?: boolean;
  agent?: boolean;
  alias?: string[];
  /** Noms complets des modèles proposés à la saisie, dans l'ordre. */
  modeles?: string[];
}

/** Catalogue de référence : 64 outils en 6 familles (charte, section 13.6). */
// prettier-ignore
export const OUTILS: DefinitionOutil[] = [
  // Assistants
  { nom: 'ChatGPT', editeur: 'OpenAI', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'openai', monochrome: true, alias: ['GPT-5', 'GPT Image'], modeles: ['GPT-5', 'GPT-5 mini', 'GPT Image 1', 'GPT-4o', 'o3'] },
  { nom: 'Claude', editeur: 'Anthropic', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'claude-color', alias: ['Sonnet', 'Haiku'], modeles: ['Claude Sonnet 4.5', 'Claude Opus 4.1', 'Claude Haiku 4.5'] },
  { nom: 'Gemini', editeur: 'Google', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'gemini-color', modeles: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] },
  { nom: 'Le Chat', editeur: 'Mistral AI', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'mistral-color', alias: ['Mistral'], modeles: ['Mistral Large 2', 'Mistral Medium 3'] },
  { nom: 'Copilot', editeur: 'Microsoft', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'copilot-color', modeles: ['GPT-5'] },
  { nom: 'Perplexity', editeur: 'Perplexity', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'perplexity-color', modeles: ['Sonar Pro'] },
  { nom: 'DeepSeek', editeur: 'DeepSeek', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'deepseek-color', modeles: ['DeepSeek V3.2', 'DeepSeek R1'] },
  { nom: 'Grok', editeur: 'xAI', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'grok', monochrome: true, modeles: ['Grok 4'] },
  { nom: 'Qwen', editeur: 'Alibaba Cloud', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'qwen-color', modeles: ['Qwen3'] },
  { nom: 'Llama', editeur: 'Meta', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'meta-color', modeles: ['Llama 4 Maverick'] },
  { nom: 'Kimi', editeur: 'Moonshot AI', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'kimi-color' },
  { nom: 'Poe', editeur: 'Quora', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'poe-color', monochrome: true },
  { nom: 'NotebookLM', editeur: 'Google', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'notebooklm', monochrome: true, modeles: ['Gemini 2.5 Flash'] },
  { nom: 'Notion AI', editeur: 'Notion Labs', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'notion', monochrome: true },
  { nom: 'Manus', editeur: 'Manus AI', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'manus', monochrome: true, agent: true },
  { nom: 'Google AI Studio', editeur: 'Google', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'aistudio', monochrome: true },
  { nom: 'Gemma', editeur: 'Google', famille: 'ASSISTANT', type: 'AUTRE', logo: 'gemma-color' },
  { nom: 'Cohere', editeur: 'Cohere', famille: 'ASSISTANT', type: 'ASSISTANT_CONVERSATIONNEL', logo: 'cohere-color' },
  { nom: 'Hugging Face', editeur: 'Hugging Face', famille: 'ASSISTANT', type: 'AUTRE', logo: 'huggingface-color' },
  { nom: 'Ollama', editeur: 'Ollama', famille: 'ASSISTANT', type: 'AUTRE', logo: 'ollama', monochrome: true },
  { nom: 'LM Studio', editeur: 'Element Labs', famille: 'ASSISTANT', type: 'AUTRE', logo: 'lmstudio', monochrome: true },
  { nom: 'OpenRouter', editeur: 'OpenRouter', famille: 'ASSISTANT', type: 'AUTRE', logo: 'openrouter-color' },
  // Image
  { nom: 'Midjourney', editeur: 'Midjourney', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'midjourney', monochrome: true, modeles: ['Midjourney v7', 'Midjourney v6.1', 'Niji 6'] },
  { nom: 'DALL·E', editeur: 'OpenAI', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'dalle-color', modeles: ['DALL·E 3'] },
  { nom: 'Flux', editeur: 'Black Forest Labs', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'flux', monochrome: true, modeles: ['Flux 1.1 Pro', 'Flux Kontext Pro'] },
  { nom: 'Ideogram', editeur: 'Ideogram', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'ideogram', monochrome: true, modeles: ['Ideogram 3.0'] },
  { nom: 'Stable Diffusion', editeur: 'Stability AI', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'stability-color', alias: ['SDXL'], modeles: ['SDXL', 'Stable Diffusion 3.5 Large'] },
  { nom: 'Adobe Firefly', editeur: 'Adobe', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'adobefirefly-color', modeles: ['Firefly Image 4'] },
  { nom: 'Krea', editeur: 'Krea', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'krea', monochrome: true },
  { nom: 'Recraft', editeur: 'Recraft', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'recraft', monochrome: true, modeles: ['Recraft V3'] },
  { nom: 'ComfyUI', editeur: 'Comfy Org', famille: 'IMAGE', type: 'GENERATEUR_IMAGE', logo: 'comfyui-color' },
  { nom: 'Civitai', editeur: 'Civitai', famille: 'IMAGE', type: 'AUTRE', logo: 'civitai-color' },
  { nom: 'Figma', editeur: 'Figma', famille: 'IMAGE', type: 'AUTRE', logo: 'figma-color' },
  // Vidéo
  { nom: 'Runway', editeur: 'Runway', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'runway', monochrome: true, modeles: ['Gen-4', 'Gen-4 Turbo'] },
  { nom: 'Sora', editeur: 'OpenAI', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'sora-color', modeles: ['Sora 2'] },
  { nom: 'Kling', editeur: 'Kuaishou', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'kling-color', modeles: ['Kling 2.1', 'Kling 2.0'] },
  { nom: 'Pika', editeur: 'Pika', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'pika', monochrome: true },
  { nom: 'Luma', editeur: 'Luma AI', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'luma-color', modeles: ['Ray2'] },
  { nom: 'Hailuo', editeur: 'MiniMax', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'hailuo-color' },
  { nom: 'PixVerse', editeur: 'PixVerse', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'pixverse-color' },
  { nom: 'Vidu', editeur: 'ShengShu', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'vidu-color' },
  { nom: 'CapCut', editeur: 'ByteDance', famille: 'VIDEO', type: 'GENERATEUR_VIDEO', logo: 'capcut', monochrome: true },
  // Audio
  { nom: 'Suno', editeur: 'Suno', famille: 'AUDIO', type: 'GENERATEUR_AUDIO', logo: 'suno', monochrome: true, modeles: ['Suno v4.5'] },
  { nom: 'Udio', editeur: 'Udio', famille: 'AUDIO', type: 'GENERATEUR_AUDIO', logo: 'udio-color', modeles: ['Udio v1.5'] },
  { nom: 'ElevenLabs', editeur: 'ElevenLabs', famille: 'AUDIO', type: 'GENERATEUR_AUDIO', logo: 'elevenlabs', monochrome: true, modeles: ['Eleven Multilingual v2', 'Eleven v3'] },
  { nom: 'Fish Audio', editeur: 'Fish Audio', famille: 'AUDIO', type: 'GENERATEUR_AUDIO', logo: 'fishaudio', monochrome: true },
  // Code
  { nom: 'Cursor', editeur: 'Anysphere', famille: 'CODE', type: 'EDITEUR_CODE', logo: 'cursor', monochrome: true, agent: true, modeles: ['Claude Sonnet 4.5', 'GPT-5'] },
  { nom: 'GitHub Copilot', editeur: 'GitHub', famille: 'CODE', type: 'EDITEUR_CODE', logo: 'githubcopilot', monochrome: true, agent: true, modeles: ['GPT-5', 'Claude Sonnet 4.5'] },
  { nom: 'Windsurf', editeur: 'Cognition', famille: 'CODE', type: 'EDITEUR_CODE', logo: 'windsurf', monochrome: true, agent: true, modeles: ['SWE-1'] },
  { nom: 'v0', editeur: 'Vercel', famille: 'CODE', type: 'CONSTRUCTEUR_APPLICATION', logo: 'v0', monochrome: true },
  { nom: 'Lovable', editeur: 'Lovable', famille: 'CODE', type: 'CONSTRUCTEUR_APPLICATION', logo: 'lovable-color' },
  { nom: 'Replit', editeur: 'Replit', famille: 'CODE', type: 'CONSTRUCTEUR_APPLICATION', logo: 'replit-color', agent: true },
  { nom: 'Claude Code', editeur: 'Anthropic', famille: 'CODE', type: 'AGENT_CODE', logo: 'claudecode-color', agent: true, modeles: ['Claude Sonnet 4.5', 'Claude Opus 4.1'] },
  { nom: 'Gemini CLI', editeur: 'Google', famille: 'CODE', type: 'AGENT_CODE', logo: 'geminicli-color', agent: true, modeles: ['Gemini 2.5 Pro'] },
  { nom: 'Codex', editeur: 'OpenAI', famille: 'CODE', type: 'AGENT_CODE', logo: 'codex-color', agent: true, modeles: ['GPT-5-Codex'] },
  { nom: 'Trae', editeur: 'ByteDance', famille: 'CODE', type: 'EDITEUR_CODE', logo: 'trae-color', agent: true },
  { nom: 'Cline', editeur: 'Cline', famille: 'CODE', type: 'AGENT_CODE', logo: 'cline', monochrome: true, agent: true, modeles: ['Claude Sonnet 4.5'] },
  { nom: 'Devin', editeur: 'Cognition', famille: 'CODE', type: 'AGENT_CODE', logo: 'devin-color', agent: true },
  { nom: 'Kiro', editeur: 'Amazon Web Services', famille: 'CODE', type: 'EDITEUR_CODE', logo: 'kiro-color', agent: true },
  // Automatisation
  { nom: 'n8n', editeur: 'n8n', famille: 'AUTOMATISATION', type: 'AUTRE', logo: 'n8n-color' },
  { nom: 'Zapier', editeur: 'Zapier', famille: 'AUTOMATISATION', type: 'AUTRE', logo: 'zapier-color' },
  { nom: 'Make', editeur: 'Make', famille: 'AUTOMATISATION', type: 'AUTRE', logo: 'make-color' },
  { nom: 'Dify', editeur: 'LangGenius', famille: 'AUTOMATISATION', type: 'AUTRE', logo: 'dify-color' },
  { nom: 'LangChain', editeur: 'LangChain', famille: 'AUTOMATISATION', type: 'AUTRE', logo: 'langchain-color' },
];

interface DefinitionBadge {
  code: string;
  libelle: string;
  critere: string;
  categorie: CategorieBadge;
  icone: string;
  ton: TonBadge;
}

/** RG-86, avec les emblèmes du prototype (profil-data.js). */
// prettier-ignore
export const BADGES: DefinitionBadge[] = [
  { code: 'PIONNIER', libelle: 'Pionnier', critere: 'Être inscrit pendant la bêta fermée', categorie: 'COMMUNAUTE', icone: 'flag', ton: 'ENCRE' },
  { code: 'PREMIERE_CREATION', libelle: 'Première création', critere: 'Publier sa première création', categorie: 'CONTRIBUTION', icone: 'layers', ton: 'BLEU' },
  { code: 'PARCOURS_COMPLET', libelle: 'Parcours complet', critere: 'Publier un projet d’au moins 3 étapes avec un moment clé', categorie: 'CONTRIBUTION', icone: 'route', ton: 'BLEU' },
  { code: 'REPRODUCTIBLE', libelle: 'Reproductible', critere: 'Être reproduit avec succès par 5 membres', categorie: 'CONTRIBUTION', icone: 'repeat', ton: 'VERT' },
  { code: 'ASTUCIEUX', libelle: 'Astucieux', critere: 'Recevoir 10 votes « Testé, ça marche » sur une astuce', categorie: 'CONTRIBUTION', icone: 'utile', ton: 'VERT' },
  { code: 'PREMIER_ESSAI', libelle: 'Premier essai', critere: 'Déclarer sa première reproduction', categorie: 'APPRENTISSAGE', icone: 'check-circle', ton: 'BLEU' },
  { code: 'BON_REFLEXE', libelle: 'Bon réflexe', critere: 'Réussir 10 cas Bon réflexe', categorie: 'APPRENTISSAGE', icone: 'bulb', ton: 'AMBRE' },
  { code: 'ASSIDU', libelle: 'Assidu', critere: 'Répondre à 50 cas Bon réflexe', categorie: 'APPRENTISSAGE', icone: 'history', ton: 'AMBRE' },
  { code: 'PREMIER_COUP_DE_MAIN', libelle: 'Premier coup de main', critere: 'Obtenir sa première réponse acceptée', categorie: 'COMMUNAUTE', icone: 'reply', ton: 'VERT' },
  { code: 'MENTOR', libelle: 'Mentor', critere: 'Obtenir 10 réponses acceptées', categorie: 'COMMUNAUTE', icone: 'message', ton: 'ENCRE' },
  { code: 'VIGILANT', libelle: 'Vigilant', critere: 'Avoir 5 signalements jugés fondés', categorie: 'COMMUNAUTE', icone: 'shield', ton: 'ENCRE' },
  { code: 'PARTICIPANT', libelle: 'Participant', critere: 'Participer à un défi clôturé', categorie: 'COMMUNAUTE', icone: 'calendar', ton: 'BLEU' },
  { code: 'PODIUM', libelle: 'Podium', critere: 'Terminer dans les 3 premiers d’un défi', categorie: 'COMMUNAUTE', icone: 'trophy', ton: 'AMBRE' },
];

interface DefinitionDocumentLegal {
  type: TypeDocumentLegal;
  version: string;
  dateEffet: string;
  url: string;
  acceptationRequise: boolean;
  resumeChangements?: string;
}

/** Versions en vigueur dans le prototype (auth-data.js). */
// prettier-ignore
export const DOCUMENTS_LEGAUX: DefinitionDocumentLegal[] = [
  { type: 'CGU', version: '2026-10-15', dateEffet: '2026-10-15', url: '/cgu', acceptationRequise: true, resumeChangements: 'Le nombre de publications autorisées par 24 heures dépend désormais de votre niveau.' },
  { type: 'CONFIDENTIALITE', version: '2026-09-01', dateEffet: '2026-09-01', url: '/confidentialite', acceptationRequise: false },
  { type: 'CHARTE', version: '2026-10-15', dateEffet: '2026-10-15', url: '/charte-communautaire', acceptationRequise: true, resumeChangements: 'Un prompt qui contient une clé d’API ou une donnée personnelle est masqué jusqu’à sa correction.' },
];

/** Étiquettes de départ (forum-data.js) ; la liste s'enrichit à la saisie. */
export const ETIQUETTES = [
  'Personnage',
  'Cohérence',
  'Portrait',
  'Script',
  'Fichiers',
  'Sécurité',
  'Logo',
  'Texte',
  'Typographie',
  'Résumé',
  'Vérification',
  'Chiffres',
  'Factures',
  'E-mails',
  'Automatisation',
  'Ton',
  'Rédaction',
  'Avis clients',
  'Réservation',
  'Base de données',
  'Ventes',
  'Tableau',
  'Périodes',
  'Gouache',
  'Texture',
  'Réunion',
  'Traduction',
  'Glossaire',
  'Relecture',
  'Sous-titres',
  'Transcription',
];
