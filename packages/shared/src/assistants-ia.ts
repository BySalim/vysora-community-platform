import { z } from 'zod';

/* REF-03 : assistants d'IA qui lisent Vysora ou y envoient des visiteurs. Le serveur du site s'en
   sert pour ne signaler que leurs passages ; l'API les reconnaît à nouveau avant de les compter.
   Seuls des compteurs sont gardés (jour, assistant, nature, page) : ni adresse IP ni navigateur. */

/** Nature d'un passage :
    - VISITE : une personne arrive d'un assistant (lien cité dans une réponse) ;
    - LECTURE : l'assistant lit une page à la demande d'une personne, pour lui répondre ;
    - EXPLORATION : le robot de recherche de l'assistant parcourt le site pour son index ;
    - ENTRAINEMENT : un robot de collecte pour l'entraînement, que robots.txt refuse (REF-01). */
export const NATURES_PASSAGE = ['VISITE', 'LECTURE', 'EXPLORATION', 'ENTRAINEMENT'] as const;
export type NaturePassage = (typeof NATURES_PASSAGE)[number];

export const LIBELLES_NATURE_PASSAGE: Record<NaturePassage, string> = {
  VISITE: 'Visites envoyées',
  LECTURE: 'Pages lues pour une personne',
  EXPLORATION: 'Pages explorées pour leur index',
  ENTRAINEMENT: 'Demandes des robots d’entraînement',
};

interface DefinitionAssistant {
  nom: string;
  /** Jetons du User-Agent de ses robots, par nature (comparaison sans casse). */
  robots: Partial<Record<Exclude<NaturePassage, 'VISITE'>, readonly string[]>>;
  /** Domaines d'où arrivent les personnes (en-tête Referer, réduit à l'origine par les navigateurs). */
  domaines: readonly string[];
  /** Valeurs de utm_source que l'assistant ajoute à ses liens. */
  utm: readonly string[];
}

export const ASSISTANTS_IA = {
  CHATGPT: {
    nom: 'ChatGPT',
    robots: { LECTURE: ['ChatGPT-User'], EXPLORATION: ['OAI-SearchBot'], ENTRAINEMENT: ['GPTBot'] },
    domaines: ['chatgpt.com', 'chat.openai.com'],
    utm: ['chatgpt.com', 'chatgpt'],
  },
  CLAUDE: {
    nom: 'Claude',
    robots: {
      LECTURE: ['Claude-User'],
      EXPLORATION: ['Claude-SearchBot'],
      ENTRAINEMENT: ['ClaudeBot', 'anthropic-ai'],
    },
    domaines: ['claude.ai'],
    utm: ['claude.ai', 'claude'],
  },
  PERPLEXITY: {
    nom: 'Perplexity',
    robots: { LECTURE: ['Perplexity-User'], EXPLORATION: ['PerplexityBot'] },
    domaines: ['perplexity.ai'],
    utm: ['perplexity.ai', 'perplexity'],
  },
  GEMINI: {
    nom: 'Gemini',
    robots: {},
    domaines: ['gemini.google.com'],
    utm: ['gemini.google.com', 'gemini'],
  },
  COPILOT: {
    nom: 'Copilot',
    robots: {},
    domaines: ['copilot.microsoft.com', 'copilot.cloud.microsoft'],
    utm: ['copilot.microsoft.com', 'copilot'],
  },
  MISTRAL: {
    nom: 'Le Chat (Mistral AI)',
    robots: { LECTURE: ['MistralAI-User'] },
    domaines: ['chat.mistral.ai'],
    utm: ['chat.mistral.ai', 'mistral'],
  },
  DEEPSEEK: {
    nom: 'DeepSeek',
    robots: {},
    domaines: ['chat.deepseek.com'],
    utm: ['deepseek'],
  },
  DUCKDUCKGO: {
    nom: 'Duck.ai (DuckDuckGo)',
    robots: { EXPLORATION: ['DuckAssistBot'] },
    domaines: ['duck.ai'],
    utm: ['duck.ai'],
  },
  META: {
    nom: 'Meta AI',
    robots: { ENTRAINEMENT: ['Meta-ExternalAgent', 'FacebookBot'] },
    domaines: ['meta.ai'],
    utm: ['meta.ai'],
  },
  AUTRES: {
    nom: 'Autres robots d’IA',
    robots: {
      ENTRAINEMENT: ['CCBot', 'Bytespider', 'cohere-training-data-crawler', 'AI2Bot'],
    },
    domaines: [],
    utm: [],
  },
} as const satisfies Record<string, DefinitionAssistant>;

export type CodeAssistantIa = keyof typeof ASSISTANTS_IA;
export const CODES_ASSISTANT_IA = Object.keys(ASSISTANTS_IA) as CodeAssistantIa[];

export interface PassageAssistant {
  assistant: CodeAssistantIa;
  nature: NaturePassage;
}

export interface RequeteObservee {
  userAgent?: string | null;
  /** En-tête Referer de la requête. */
  referent?: string | null;
  /** Paramètre utm_source de l'adresse demandée. */
  utmSource?: string | null;
}

const hote = (adresse: string): string | null => {
  try {
    return new URL(adresse).hostname.toLowerCase();
  } catch {
    return null;
  }
};
const surDomaine = (nom: string, domaine: string) => nom === domaine || nom.endsWith(`.${domaine}`);

/** Assistant d'IA à l'origine d'une requête, et la nature du passage ; null pour tout le reste
    (personnes venues d'ailleurs, moteurs de recherche classiques). Le robot passe avant la
    provenance : un robot n'envoie pas de Referer, une personne n'a pas ces User-Agent. */
export function reconnaitreAssistant(requete: RequeteObservee): PassageAssistant | null {
  const agent = requete.userAgent?.toLowerCase() ?? '';
  if (agent)
    for (const code of CODES_ASSISTANT_IA) {
      const robots: DefinitionAssistant['robots'] = ASSISTANTS_IA[code].robots;
      for (const [nature, jetons] of Object.entries(robots) as [NaturePassage, string[]][])
        if (jetons.some((jeton) => agent.includes(jeton.toLowerCase())))
          return { assistant: code, nature };
    }
  const origine = requete.referent ? hote(requete.referent) : null;
  const source = requete.utmSource?.trim().toLowerCase() ?? '';
  for (const code of CODES_ASSISTANT_IA) {
    const { domaines, utm }: DefinitionAssistant = ASSISTANTS_IA[code];
    if (origine && domaines.some((d) => surDomaine(origine, d)))
      return { assistant: code, nature: 'VISITE' };
    if (source && utm.includes(source)) return { assistant: code, nature: 'VISITE' };
  }
  return null;
}

/** Paramètres qui désignent une page à eux (guide d'Explorer, savoir ou rubrique d'Apprendre). */
const PARAMETRES_DE_PAGE = ['guide', 'savoir', 'rubrique'] as const;
export const LONGUEUR_CHEMIN_MESURE = 160;
/** Zones qui ne se mesurent pas : l'API, les fichiers techniques du site, l'équipe. */
const HORS_MESURE = /^\/(?:api|_astro|_image|admin|moderation)(?:\/|$)/;

/** Page mesurée pour une adresse demandée (« /explorer?guide=x&utm_source=… » donne
    « /explorer?guide=x ») ; null si l'adresse ne se mesure pas. */
export function cheminMesure(adresse: string): string | null {
  if (!adresse.startsWith('/') || adresse.startsWith('//')) return null;
  let url: URL;
  try {
    url = new URL(adresse, 'http://vysora.invalid');
  } catch {
    return null;
  }
  const chemin = url.pathname.toLowerCase();
  if (HORS_MESURE.test(chemin) || !/^[a-z0-9/._~-]+$/.test(chemin)) return null;
  const parametre = PARAMETRES_DE_PAGE.find((p) => url.searchParams.get(p));
  const page = parametre
    ? `${chemin}?${parametre}=${encodeURIComponent(url.searchParams.get(parametre) ?? '')}`
    : chemin;
  return page.length <= LONGUEUR_CHEMIN_MESURE ? page : null;
}

/** Périodes proposées par le tableau de l'administration, en jours. */
export const PERIODES_MESURE_ASSISTANTS = [7, 30, 90] as const;

/** POST /api/v1/assistants-ia/passages : passage relevé par le serveur du site sur une page servie. */
export const schemaPassageAssistant = z.object({
  adresse: z.string().min(1).max(500),
  userAgent: z.string().max(500).nullish(),
  referent: z.string().max(500).nullish(),
});
export type SaisiePassageAssistant = z.output<typeof schemaPassageAssistant>;

/** GET /api/v1/admin/assistants-ia?jours= */
export const schemaPeriodeMesure = z.object({
  jours: z.coerce
    .number()
    .refine((n) => (PERIODES_MESURE_ASSISTANTS as readonly number[]).includes(n))
    .optional()
    .default(30),
});
export type PeriodeMesure = z.output<typeof schemaPeriodeMesure>;

export type CompteursPassages = Record<NaturePassage, number>;

export interface MesureAssistantsApi {
  jours: number;
  /** Premier et dernier jour compris (UTC, AAAA-MM-JJ). */
  du: string;
  au: string;
  totaux: CompteursPassages;
  /** Assistants vus sur la période, du plus actif au moins actif. */
  assistants: ({ code: CodeAssistantIa; nom: string } & CompteursPassages)[];
  /** Pages les plus visitées et lues par les assistants (20 au plus). */
  pages: ({ chemin: string } & CompteursPassages)[];
}
