/* Référencement (ENF-04, F-26) : ce que les moteurs de recherche et les assistants d'IA peuvent
   lire, et comment ils le comprennent. Robots.txt, plan du site, llms.txt et données structurées
   (schema.org en JSON-LD) sont construits ici ; les pages, le gabarit et les routes /robots.txt,
   /sitemap.xml et /llms.txt s'en servent. Voir docs/referencement.md. */

/** Ce que le site laisse indexer (variable INDEXATION du serveur du site).
    - aucune : rien (développement, essais) ;
    - pages : pages de l'équipe (accueil, Explorer, Apprendre, guides, domaines, défis, forum,
      classements, pages légales), mais pas les contenus des membres, tant que la préproduction
      montre les membres et créations de démonstration (DEMO-04) ;
    - complete : tout ce qui est public (ouverture publique). */
export const MODES_INDEXATION = ['aucune', 'pages', 'complete'] as const;
export type ModeIndexation = (typeof MODES_INDEXATION)[number];

export function modeIndexation(
  valeur: string | undefined = process.env.INDEXATION,
): ModeIndexation {
  const mode = valeur?.trim().toLowerCase();
  return MODES_INDEXATION.find((m) => m === mode) ?? 'aucune';
}

/** Directive robots d'une page ; undefined : page indexable, sans balise. */
export function directiveRobots(
  page: { nonIndexee?: boolean; contenuDeMembre?: boolean },
  mode: ModeIndexation,
): string | undefined {
  if (page.nonIndexee || mode === 'aucune') return 'noindex, nofollow';
  // Les liens restent suivis : la page mène aux pages de l'équipe, qui, elles, sont indexées.
  if (page.contenuDeMembre && mode === 'pages') return 'noindex, follow';
  return 'max-image-preview:large';
}

/* robots.txt ---------------------------------------------------------------- */

/** Robots qui collectent des pages pour entraîner des modèles d'IA : refusés (choix du porteur du
    projet, 2026-11-15). Les robots qui cherchent et citent leurs sources (OAI-SearchBot,
    ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, DuckAssistBot,
    MistralAI-User…) suivent les règles communes. Google-Extended et Applebot-Extended ne collectent
    rien eux-mêmes : ils disent à Google et à Apple de ne pas se servir des pages pour leurs modèles
    (Google-Extended couvre aussi les réponses de Gemini ; Googlebot, lui, reste admis). */
export const ROBOTS_ENTRAINEMENT = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Bytespider',
  'cohere-training-data-crawler',
  'AI2Bot',
] as const;

/** Chemins sans intérêt pour un moteur : espace personnel, formulaires, éditeurs, API. Les zones de
    l'équipe (/admin, /moderation) n'y figurent pas : elles sont introuvables pour qui n'en a pas le
    rôle (ADM-04), et ce fichier public les révélerait. */
export const CHEMINS_EXCLUS = [
  '/api/',
  '/connexion',
  '/inscription',
  '/notifications',
  '/parametres',
  '/mes-contenus',
  '/creations/nouvelle',
  '/forum/nouveau',
  '/bon-reflexe/nouveau',
  '/*/modifier',
] as const;

export function texteRobots(site: URL, mode: ModeIndexation): string {
  if (mode === 'aucune')
    return [
      '# Vysora : ce site n’est pas ouvert aux moteurs de recherche.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  return [
    '# Vysora : voir comment l’IA crée, apprendre à créer avec elle.',
    '# Moteurs de recherche et assistants qui citent leurs sources : bienvenus.',
    '# Présentation du site pour les assistants d’IA : ' + new URL('/llms.txt', site).href,
    'User-agent: *',
    // Images des créations et photos de profil, servies par l'API.
    'Allow: /api/v1/fichiers/',
    ...CHEMINS_EXCLUS.map((chemin) => `Disallow: ${chemin}`),
    '',
    '# Collecte de pages pour entraîner des modèles d’IA : refusée.',
    ...ROBOTS_ENTRAINEMENT.map((robot) => `User-agent: ${robot}`),
    'Disallow: /',
    '',
    `Sitemap: ${new URL('/sitemap.xml', site).href}`,
    '',
  ].join('\n');
}

/* Plan du site -------------------------------------------------------------- */

export interface EntreePlan {
  /** Chemin, éventuellement suivi de paramètres (/explorer?guide=rendez-vous). */
  chemin: string;
  /** Dernière modification connue (ISO 8601). */
  modification?: string | null;
}

const echapperXml = (texte: string): string =>
  texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

/** Date au format du plan du site (AAAA-MM-JJ) ; undefined si elle ne se lit pas. */
function jourW3c(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** Plan du site au format sitemaps.org, chaque adresse une fois (la première rencontrée). */
export function planDuSite(entrees: EntreePlan[], site: URL): string {
  const vues = new Set<string>();
  const lignes = entrees.flatMap(({ chemin, modification }) => {
    const adresse = new URL(chemin, site).href;
    if (vues.has(adresse)) return [];
    vues.add(adresse);
    const jour = jourW3c(modification);
    return [
      `  <url><loc>${echapperXml(adresse)}</loc>${jour ? `<lastmod>${jour}</lastmod>` : ''}</url>`,
    ];
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...lignes,
    '</urlset>',
    '',
  ].join('\n');
}

/* Données structurées (JSON-LD) ---------------------------------------------- */

export type DonneeStructuree = Record<string, unknown>;

/** Texte d'un <script type="application/ld+json"> : « < » échappé, aucune valeur ne peut fermer la
    balise (les contenus des membres y figurent). */
export function jsonLd(donnees: DonneeStructuree | DonneeStructuree[]): string {
  const liste = Array.isArray(donnees) ? donnees : [donnees];
  const corps =
    liste.length === 1
      ? { '@context': 'https://schema.org', ...liste[0] }
      : { '@context': 'https://schema.org', '@graph': liste };
  return JSON.stringify(corps)
    .replaceAll('<', '\\u003c')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');
}

export const SLOGAN = 'Voir comment l’IA crée. Apprendre à créer avec elle.';
export const PRESENTATION =
  'Vysora est une plateforme communautaire gratuite où l’on publie ce que l’on crée avec l’IA avec le chemin parcouru : prompts, outils, modèles et moments clés. La communauté évalue, reproduit, discute et apprend.';

const absolue = (chemin: string, site: URL): string => new URL(chemin, site).href;

/** Vysora, éditeur du site : désigné par son identifiant dans les autres données. */
export function organisation(site: URL): DonneeStructuree {
  return {
    '@type': 'Organization',
    '@id': absolue('/#organisation', site),
    name: 'Vysora',
    url: absolue('/', site),
    logo: absolue('/assets/logos/vysora%20logo%20bleu.png', site),
    slogan: SLOGAN,
    description: PRESENTATION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: absolue('/contact', site),
      availableLanguage: 'fr',
    },
  };
}

export function siteWeb(site: URL): DonneeStructuree {
  return {
    '@type': 'WebSite',
    '@id': absolue('/#site', site),
    name: 'Vysora',
    url: absolue('/', site),
    inLanguage: 'fr-FR',
    description: PRESENTATION,
    publisher: { '@id': absolue('/#organisation', site) },
  };
}

/** Membre auteur d'un contenu, avec l'adresse de son profil. */
export function personne(
  membre: { pseudo: string; nom: string; avatar?: string | null },
  site: URL,
): DonneeStructuree {
  return {
    '@type': 'Person',
    name: membre.nom,
    alternateName: membre.pseudo,
    url: absolue(`/membres/${encodeURIComponent(membre.pseudo)}`, site),
    ...(membre.avatar ? { image: absolue(membre.avatar, site) } : {}),
  };
}

/** Compteur d'interactions (votes « Utile », réponses, reproductions). */
export function compteur(
  type: 'LikeAction' | 'CommentAction' | 'ViewAction' | 'WriteAction',
  nombre: number,
): DonneeStructuree {
  return {
    '@type': 'InteractionCounter',
    interactionType: `https://schema.org/${type}`,
    userInteractionCount: nombre,
  };
}

/** Fil d'Ariane : Accueil, puis les niveaux donnés. */
export function filAriane(niveaux: { nom: string; chemin: string }[], site: URL): DonneeStructuree {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ nom: 'Accueil', chemin: '/' }, ...niveaux].map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: n.nom,
      item: absolue(n.chemin, site),
    })),
  };
}

/** Texte brut d'un Markdown de membre, pour un résumé : ni balise ni mise en forme, longueur bornée. */
export function texteBrut(markdown: string, longueur = 500): string {
  const texte = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return texte.length <= longueur ? texte : `${texte.slice(0, longueur - 1).trimEnd()}…`;
}
