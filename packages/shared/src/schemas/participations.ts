import { z } from 'zod';

/* Participation à un défi (S-17) : distincte des créations d'Explorer, une par personne et par défi,
   publiée depuis la page Défis. Son résultat est un jeu (un fichier HTML joué dans un cadre isolé)
   ou une image (sa couverture), ou les deux. */

/** Taille maximale du fichier HTML d'un jeu (démo validée : 200 000 caractères). */
export const TAILLE_MAX_JEU = 200_000;

/** Une ligne du contrôle d'un jeu : réussie, à surveiller ou bloquante. */
export interface LigneControleJeu {
  etat: 'ok' | 'attention' | 'non';
  libelle: string;
  /** Explication quand la ligne n'est pas réussie ; vide sinon. */
  detail: string;
}

/* Repères du contrôle (prototype/defis.js) : adresses appelées par le code, champ de mot de
   passe, minage, ouvertures de fenêtre et redirections, code masqué. */
const APPELS =
  /(?:\b(?:src|href|action|poster|data)\s*=\s*["']?\s*|url\(\s*["']?|@import\s+(?:url\(\s*)?["']?|\b(?:fetch|import)\s*\(\s*["'`]|\bfrom\s+["'`]|new\s+(?:WebSocket|EventSource)\s*\(\s*["'`])((?:https?:|wss?:)?\/\/[^\s"'`)<>]+)/gi;
const MOT_DE_PASSE =
  /<input[^>]*type\s*=\s*["']?password|autocomplete\s*=\s*["']?(current|new)-password/i;
const MINAGE = /coinhive|coin-hive|cryptonight|cryptoloot|webminer|stratum\+tcp|minero\.cc/i;
const FENETRES =
  /\bwindow\.open\s*\(|\b(top|parent)\.location|\blocation\.(href|assign|replace)\s*(=|\()\s*["'`]https?:/i;
const MASQUE_APPEL =
  /\b(eval|Function)\s*\(\s*(atob|unescape|decodeURIComponent|String\.fromCharCode)\s*\(/i;
const MASQUE_BLOC = /["'`](?![^"'`]{0,40}data:)[A-Za-z0-9+/=]{4000,}["'`]/;
const PAGE = /<(html|head|body|script|canvas|svg|div|main)\b/i;
const EXTENSION = /\.html?$/i;

/** Contrôle d'un jeu avant publication, dans la page et dans l'API (qui reste juge). Les lignes
    « non » refusent le fichier ; « attention » prévient l'auteur, le jeu restant isolé du site et
    privé de réseau quoi qu'il contienne (ADR-0011). */
export function controlerJeu(
  nom: string,
  html: string,
): { lignes: LigneControleJeu[]; bloquants: string[]; avertissements: string[] } {
  const hotes = new Set<string>();
  for (const m of html.matchAll(APPELS)) {
    try {
      if (m[1]) hotes.add(new URL(m[1], 'https://exemple.invalid').host);
    } catch {
      /* adresse illisible */
    }
  }
  const page =
    EXTENSION.test(nom.trim()) &&
    PAGE.test(html) &&
    html.length <= TAILLE_MAX_JEU &&
    html.trim().length > 0;
  const motDePasse = MOT_DE_PASSE.test(html);
  const minage = MINAGE.test(html);
  const fenetres = FENETRES.test(html);
  const masque = MASQUE_APPEL.test(html) || MASQUE_BLOC.test(html);
  const liste = [...hotes];
  const lignes: LigneControleJeu[] = [
    {
      etat: page ? 'ok' : 'non',
      libelle: 'Une page HTML de 200 000 caractères au plus',
      detail: page
        ? ''
        : html.length > TAILLE_MAX_JEU
          ? 'Ce fichier dépasse 200 000 caractères : le jeu doit tenir dans un fichier plus léger.'
          : 'Choisissez un fichier .html qui contient la page du jeu.',
    },
    {
      etat: motDePasse ? 'non' : 'ok',
      libelle: 'Aucun champ de mot de passe',
      detail: motDePasse
        ? 'Un jeu ne peut pas demander de mot de passe : ce fichier est refusé.'
        : '',
    },
    {
      etat: minage ? 'non' : 'ok',
      libelle: 'Aucun code de minage de cryptomonnaie',
      detail: minage ? 'Ce fichier contient du code de minage : il est refusé.' : '',
    },
    {
      etat: liste.length ? 'attention' : 'ok',
      libelle: 'Aucun appel à Internet',
      detail: liste.length
        ? `Appels vers ${liste.slice(0, 3).join(', ')}${liste.length > 3 ? '…' : ''} : ils seront bloqués, vérifiez que le jeu marche sans eux.`
        : '',
    },
    {
      etat: fenetres ? 'attention' : 'ok',
      libelle: 'Aucune ouverture de fenêtre ni redirection',
      detail: fenetres ? 'Elles seront bloquées sur Vysora.' : '',
    },
    {
      etat: masque ? 'attention' : 'ok',
      libelle: 'Un code lisible',
      detail: masque
        ? 'Une partie du code est masquée : la modération pourra la vérifier avant de la laisser jouer.'
        : '',
    },
  ];
  return {
    lignes,
    bloquants: lignes.filter((l) => l.etat === 'non').map((l) => l.detail),
    avertissements: lignes.filter((l) => l.etat === 'attention').map((l) => l.detail),
  };
}

const texte = (min: number, max: number, nom: string) =>
  z
    .string({ error: `Indiquez ${nom}.` })
    .trim()
    .min(min, {
      error:
        min > 1
          ? `${nom[0]?.toUpperCase()}${nom.slice(1)} compte au moins ${min} caractères.`
          : `Indiquez ${nom}.`,
    })
    .max(max, {
      error: `${nom[0]?.toUpperCase()}${nom.slice(1)} compte ${max} caractères au plus.`,
    });

/** POST et PUT /api/v1/defis/:id/participations (S-17). */
export const schemaParticipation = z
  .object({
    titre: texte(5, 100, 'le titre'),
    /** L'idée en une phrase (démo validée : 20 caractères au moins). */
    idee: texte(20, 300, 'l’idée'),
    outilId: z
      .number({ error: 'Choisissez l’outil d’IA.' })
      .int()
      .positive({ error: 'Choisissez l’outil d’IA.' }),
    /** RG-14 : le modèle, choisi dans la liste ou écrit librement. */
    modele: z
      .string()
      .trim()
      .max(100, { error: 'Le modèle compte 100 caractères au plus.' })
      .nullish()
      .transform((v) => v || null),
    prompts: z
      .array(texte(1, 20_000, 'le prompt'), { error: 'Ajoutez le prompt envoyé.' })
      .min(1, { error: 'Ajoutez le prompt envoyé.' })
      .max(10, { error: 'Dix prompts au plus.' }),
    essais: z.number().int().min(1).max(50).default(1),
    moment: z
      .string()
      .trim()
      .max(600, { error: 'Le moment clé compte 600 caractères au plus.' })
      .nullish()
      .transform((v) => v || null),
    /** Le jeu : son nom de fichier et son code HTML. */
    jeu: z
      .object({
        nom: z.string().trim().min(1).max(120),
        html: z.string().max(TAILLE_MAX_JEU, { error: 'Le fichier dépasse 200 000 caractères.' }),
      })
      .nullish()
      .transform((v) => v ?? null),
    /** L'image de couverture (ou l'image résultat), téléversée avant (POST /api/v1/medias). */
    couvertureId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null),
  })
  .superRefine((p, ctx) => {
    if (!p.jeu && !p.couvertureId)
      ctx.addIssue({
        code: 'custom',
        path: ['jeu'],
        message: 'Ajoutez votre jeu (fichier HTML) ou une image.',
      });
    if (p.jeu) {
      const { bloquants } = controlerJeu(p.jeu.nom, p.jeu.html);
      if (bloquants[0]) ctx.addIssue({ code: 'custom', path: ['jeu'], message: bloquants[0] });
    }
  });
export type SaisieParticipation = z.output<typeof schemaParticipation>;
