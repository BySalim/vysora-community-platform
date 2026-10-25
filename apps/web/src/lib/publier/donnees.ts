import type { FamilleOutil, TypeCreation, TypeMomentCle } from '@vysora/shared';

/* Référentiels propres à l'éditeur (CREA-02), repris de prototype/nouvelle-creation.js et
   nouvelle-creation-data.js. Les outils, leurs modèles, les catégories et les licences viennent
   de l'API (GET /api/v1/referentiels) ; ce fichier garde ce que le prototype rédigeait pour la page :
   libellés, aides de saisie, motifs de repérage appliqués dans le navigateur (C-02, RG-22). */

/** Type de création déduit du chemin parcouru (nouvelle-creation.js : TYPES). */
export const TYPES: Record<TypeCreation, { label: string; sens: string; icone: string }> = {
  UN_PROMPT: { label: '1 prompt', sens: 'Un seul prompt a suffi.', icone: 'type-prompt' },
  ITERATION: {
    label: 'Itération',
    sens: 'Plusieurs prompts dans une même conversation.',
    icone: 'type-iteration',
  },
  PROJET: { label: 'Projet', sens: 'Plusieurs étapes ou plusieurs outils.', icone: 'type-projet' },
};

export type SorteResultat = 'texte' | 'code' | 'fichier' | 'lien';

/** Formes du résultat (SORTES). RG-16 : seules les images sont hébergées, le reste passe par un lien. */
export const SORTES: Record<SorteResultat, { label: string; icone: string; retirer: string }> = {
  texte: { label: 'Texte', icone: 'doc', retirer: 'Retirer ce texte' },
  code: { label: 'Code', icone: 'code', retirer: 'Retirer ce code' },
  fichier: { label: 'Image', icone: 'image', retirer: 'Retirer cette image' },
  lien: { label: 'Lien', icone: 'link', retirer: 'Retirer ce lien' },
};

/** Types de moment clé (F-14) : libellé et question qui aide à le rédiger. */
export const MOMENTS_SAISIE: { id: TypeMomentCle; label: string; aide: string }[] = [
  {
    id: 'CORRECTION',
    label: 'Correction',
    aide: 'Qu’avez-vous rectifié, et pourquoi la première réponse ne convenait-elle pas ?',
  },
  {
    id: 'REFUS',
    label: 'Refus',
    aide: 'Quelle proposition de l’IA avez-vous écartée, et pour quelle raison ?',
  },
  {
    id: 'ECHEC',
    label: 'Échec',
    aide: 'Qu’est-ce qui n’a pas fonctionné, et qu’en avez-vous tiré ?',
  },
  {
    id: 'CHANGEMENT_OUTIL',
    label: 'Changement d’outil',
    aide: 'Pourquoi avez-vous changé d’outil ou de modèle à ce moment-là ?',
  },
  {
    id: 'VERIFICATION',
    label: 'Vérification',
    aide: 'Qu’avez-vous contrôlé, comment, et qu’avez-vous trouvé ?',
  },
  {
    id: 'DECOUVERTE',
    label: 'Découverte',
    aide: 'Quel réglage ou quelle formulation a fait la différence ?',
  },
];

/** Familles du catalogue d'outils, dans l'ordre du prototype (data.js : toolFamilies). */
export const FAMILLES: { id: FamilleOutil; label: string }[] = [
  { id: 'ASSISTANT', label: 'Assistants' },
  { id: 'IMAGE', label: 'Image' },
  { id: 'VIDEO', label: 'Vidéo' },
  { id: 'AUDIO', label: 'Audio' },
  { id: 'CODE', label: 'Code' },
  { id: 'AUTOMATISATION', label: 'Automatisation' },
];

/** Catégorie proposée d'après la famille de l'outil ; quelques outils ont la leur (libellés du référentiel). */
export const CATEGORIE_PAR_FAMILLE: Record<FamilleOutil, string> = {
  ASSISTANT: 'Texte et rédaction',
  IMAGE: 'Image et illustration',
  VIDEO: 'Vidéo',
  AUDIO: 'Musique et son',
  CODE: 'Code et scripts',
  AUTOMATISATION: 'Automatisation',
};
export const CATEGORIE_PAR_OUTIL: Record<string, string> = {
  Lovable: 'Application web',
  v0: 'Application web',
  Replit: 'Application web',
  Figma: 'Identité visuelle',
  Recraft: 'Identité visuelle',
  NotebookLM: 'Éducation',
};

/** Motifs de repérage, appliqués dans le navigateur sans appel à un modèle (C-02, RG-22). */
export const MOTIFS = {
  /* Début de message : « Vous avez dit : », « ChatGPT a dit : », « **User:** », « ## Response: »… */
  utilisateur:
    /^\s*(?:\*\*|#{1,3}\s*)?(?:vous avez dit|you said|vous|moi|you|user|utilisateur|utilisatrice|humain|human|prompt|demande)\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i,
  assistant:
    /^\s*(?:\*\*|#{1,3}\s*)?(chatgpt|claude code|claude|gemini cli|gemini|le chat|mistral|copilot|perplexity|deepseek|grok|qwen|lovable|cursor|codex|v0|replit|notebooklm|assistant|réponse|response|ia|ai)(?:\s+(?:a dit|said))?\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i,
  midjourney: /^\s*\/imagine\s+(?:prompt\s*:?)?\s*(.+)$/i,
  image:
    /^\s*(?:\[(?:image|images|image générée|generated image|capture)[^\]]*\]|!\[[^\]]*\]\([^)]*\))\s*$/i,
  libelles: {
    chatgpt: 'ChatGPT',
    'claude code': 'Claude Code',
    claude: 'Claude',
    'gemini cli': 'Gemini CLI',
    gemini: 'Gemini',
    'le chat': 'Le Chat',
    mistral: 'Le Chat',
    copilot: 'Copilot',
    perplexity: 'Perplexity',
    deepseek: 'DeepSeek',
    grok: 'Grok',
    qwen: 'Qwen',
    lovable: 'Lovable',
    cursor: 'Cursor',
    codex: 'Codex',
    v0: 'v0',
    replit: 'Replit',
    notebooklm: 'NotebookLM',
  } as Record<string, string>,
  /* Réglages recopiés dans la configuration : paramètres Midjourney, Stable Diffusion, modes des assistants. */
  reglages: [
    /--(?:ar|aspect)\s+\d+:\d+/gi,
    /--(?:stylize|s)\s+\d+/gi,
    /--(?:chaos|c)\s+\d+/gi,
    /--(?:weird|w)\s+\d+/gi,
    /--(?:sref|cref|oref)\s+\S+/gi,
    /--seed\s+\d+/gi,
    /--tile\b/gi,
    /--style\s+raw/gi,
    /--(?:q|quality)\s+[\d.]+/gi,
    /--(?:v|version)\s+[\d.]+/gi,
    /--niji\s+\d+/gi,
    /\bSteps:\s*\d+/g,
    /\bCFG scale:\s*[\d.]+/g,
    /\bSeed:\s*\d+/g,
    /\bSampler:\s*[^,\n]+/g,
    /\bSize:\s*\d+x\d+/g,
    /\btemp[ée]rature\s*[:=]?\s*[\d.,]+/gi,
    /\bréflexion (?:étendue|approfondie)\b/gi,
    /\bextended thinking\b/gi,
    /\brecherche (?:web|sur le web)\b/gi,
    /\bmode agent\b/gi,
  ],
  /* Données sensibles (F-18) : signalées, jamais bloquantes ; l'auteur masque ou confirme. */
  sensibles: [
    {
      id: 'cle',
      label: 'Clé d’API',
      re: /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})/g,
      masque: '[clé masquée]',
    },
    {
      id: 'jeton',
      label: 'Jeton d’accès',
      re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
      masque: '[jeton masqué]',
    },
    {
      id: 'secret',
      label: 'Mot de passe ou secret',
      re: /\b(?:password|passwd|mot de passe|api[_ -]?key)\s*[:=]\s*["'«]?\s*[^\s"'»]{6,}/gi,
      masque: '[secret masqué]',
    },
    {
      id: 'email',
      label: 'Adresse e-mail',
      re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
      masque: '[adresse e-mail masquée]',
    },
    {
      id: 'telephone',
      label: 'Numéro de téléphone',
      re: /(?:\+|\b00)\d{2,3}(?:[\s.-]?\d{1,3}){3,5}\b|\b0[1-9](?:[\s.-]?\d{2}){4}\b/g,
      masque: '[numéro masqué]',
    },
  ],
  /* Instructions confiées à un agent qui agit (F-19) : à signaler sur la fiche. */
  agent:
    /(\blance\b|exécute|supprime|efface|pousse|\bpush\b|\bcommit\b|déploie|installe|rm -rf|\bgit\s|\bnpm\s|\bpip\s|\bsudo\b|base de production|modifie (?:les|tous les) fichiers)/i,
};
