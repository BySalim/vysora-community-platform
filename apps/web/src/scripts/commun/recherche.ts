/* Recherche sur tout le site (S-11, prototype/recherche.js) : ouverte par la loupe de l'en-tête
   ([data-recherche-ouvrir]) ou par Ctrl K (⌘ K), chargée à la demande par entete.ts. Elle porte sur
   les créations, les guides et les domaines d'Explorer, les sujets du forum, les savoirs et les cas
   Bon réflexe, les membres, les outils et les pages du site. Les contenus viennent de
   GET /api/v1/recherche/index (publiés et visibles de tous), les savoirs du site lui-même ; la
   recherche se fait dans le navigateur, comme dans le prototype. Clavier : ↑ ↓ pour choisir, Entrée
   pour ouvrir, Échap pour fermer, Suppr pour oublier une recherche récente. Styles : recherche.css. */

import '../../styles/recherche.css';
import {
  MOTS_VIDES_RECHERCHE,
  SYNONYMES_RECHERCHE,
  type DifficulteCas,
  type FamilleOutil,
  type IndexRechercheApi,
  type MediaApi,
  type MembreIndexApi,
  type TypeCreation,
  type TypeSujet,
} from '@vysora/shared';
import { ROUTES } from '../../lib/navigation';
import { dateLongue } from '../../lib/texte';
import { api } from './api';
import { etats } from './etats';
import { $, $$, animations, esc, fmt, pluriel, t, typo } from './outils';

const racineDoc = document.documentElement;
const CLE_RECENTES = 'vysora-recherches-recentes';
const EMPH = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const DOUX = 'cubic-bezier(0.2, 0, 0, 1)';
const SORTIE = 'cubic-bezier(0.3, 0, 0.8, 0.15)';

/* Icônes ------------------------------------------------------------------ */

const TRACES: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  'search-x':
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8.6 8.6l4.8 4.8M13.4 8.6l-4.8 4.8"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  entree: '<path d="M20 5v6a4 4 0 0 1-4 4H5"/><path d="m9 10-5 5 5 5"/>',
  haut: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  bas: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  'type-prompt':
    '<circle cx="5.5" cy="12" r="2.5"/><path d="M8 12h5"/><rect x="14" y="7.5" width="8" height="9" rx="2"/>',
  'type-iteration':
    '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3.5V8h-4.5"/><circle cx="12" cy="12" r="1.6"/>',
  'type-projet':
    '<circle cx="5" cy="18" r="2.4"/><circle cx="12" cy="6.5" r="2.4"/><rect x="16.6" y="13.6" width="5" height="5" rx="1.2"/><path d="m6.4 15.9 4.3-7.3M13.5 8.6l3.6 5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  browser:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/>',
  pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14 6l4 4"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  flow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  school: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  shapes:
    '<circle cx="7" cy="7" r="4"/><path d="M14 3h7v7h-7zM7.5 14l4 7h-8z"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.4-2.6 4"/><path d="M12 17.4h.01"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.4 2.5"/>',
  route:
    '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  layers:
    '<path d="m12 2.5 9.5 5L12 12.5 2.5 7.5z"/><path d="m2.5 12 9.5 5 9.5-5M2.5 16.5l9.5 5 9.5-5"/>',
  shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  scale:
    '<path d="M12 3v18M5 21h14M6 7h12"/><path d="m6 7-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  'user-plus': '<circle cx="10" cy="8" r="4"/><path d="M17 21a7 7 0 0 0-14 0M19 8v6M16 11h6"/>',
  folder:
    '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  trophy:
    '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  flag: '<path d="M5 22V4"/><path d="M5 15s1.2-1 4-1 5 2 8 2 3-1 3-1V4s-.5 1-3 1-5-2-8-2-4 1-4 1"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  login: '<path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="m10 17 5-5-5-5M15 12H3"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
};
const ic = (nom: string, classe = '') =>
  `<svg class="icon${classe ? ` ${classe}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRACES[nom] ?? TRACES.layers}</svg>`;
const touche = (contenu: string) => `<kbd>${contenu}</kbd>`;

/* Texte : pliage, mots, fautes de frappe --------------------------------- */

const plierCar = (car: string) => {
  const base = car.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return base.length === 1 && /[a-z0-9]/.test(base) ? base : ' ';
};
const plier = (texte: unknown) => Array.from(String(texte ?? ''), plierCar).join('');
const champ = (...parties: unknown[]) =>
  ` ${plier(
    parties
      .flat(Infinity as 1)
      .filter(Boolean)
      .join(' '),
  )
    .replace(/\s+/g, ' ')
    .trim()} `;
const racine = (mot: string) => (mot.length > 3 ? mot.replace(/(s|x)$/, '') : mot);
function mots(requete: string): string[] {
  const tous = plier(requete)
    .split(' ')
    .filter((m) => m.length > 1 || /\d/.test(m));
  const utiles = tous.filter((m) => !MOTS_VIDES_RECHERCHE.has(m));
  return utiles.length ? utiles : tous;
}
function variantes(mot: string): string[] {
  const liste = new Set([racine(mot)]);
  const synonyme = SYNONYMES_RECHERCHE[mot];
  // Un synonyme de plusieurs mots se cherche comme une expression (« rdv » : « rendez vous »).
  if (synonyme)
    liste.add(plier(synonyme).replace(/\s+/g, ' ').trim().split(' ').map(racine).join(' '));
  return [...liste];
}
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let avant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const ligne = [i];
    let min = i;
    for (let j = 1; j <= b.length; j += 1) {
      ligne[j] = Math.min(
        (avant[j] ?? 0) + 1,
        (ligne[j - 1] ?? 0) + 1,
        (avant[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if ((ligne[j] ?? 0) < min) min = ligne[j] ?? 0;
    }
    if (min > max) return max + 1;
    avant = ligne;
  }
  return avant[b.length] ?? max + 1;
}
/** Surligne le début des mots trouvés, sans toucher aux espaces typographiques. */
function surligner(texte: string, racines: string[]): string {
  const brut = typo(texte);
  const caracteres = Array.from(brut);
  const plie = caracteres.map(plierCar).join('');
  const marques = Array.from({ length: caracteres.length }, () => false);
  for (const r of racines.filter(Boolean)) {
    let de = 0;
    while ((de = plie.indexOf(r, de)) >= 0) {
      if (de === 0 || plie[de - 1] === ' ')
        for (let i = de; i < de + r.length; i += 1) marques[i] = true;
      de += 1;
    }
  }
  let html = '';
  let ouvert = false;
  caracteres.forEach((car, i) => {
    if (marques[i] && !ouvert) {
      html += '<mark>';
      ouvert = true;
    }
    if (!marques[i] && ouvert) {
      html += '</mark>';
      ouvert = false;
    }
    html += esc(car);
  });
  return ouvert ? `${html}</mark>` : html;
}

/* Petites mémoires du navigateur (recherches récentes) ------------------------ */

const memoire = {
  lire(): string[] {
    try {
      const valeur: unknown = JSON.parse(localStorage.getItem(CLE_RECENTES) ?? '[]');
      return Array.isArray(valeur) ? valeur.filter((r): r is string => typeof r === 'string') : [];
    } catch {
      return [];
    }
  },
  ecrire(liste: string[]): void {
    try {
      localStorage.setItem(CLE_RECENTES, JSON.stringify(liste));
    } catch {
      // Stockage indisponible (navigation privée) : l'historique ne se garde pas.
    }
  },
};

/* Données ------------------------------------------------------------------ */

type IdGroupe = 'creations' | 'guides' | 'forum' | 'apprendre' | 'membres' | 'outils' | 'pages';

interface Entree {
  cle: string;
  groupe: IdGroupe;
  titre: string;
  href: string;
  f0: string;
  f1: string;
  f2: string;
  pop: number;
  vcls?: string;
  vignette: () => string;
  meta: () => string[];
  apercu: () => string;
}

interface PageSite extends Entree {
  id: string;
  icone: string;
  texte: string;
}

interface Option {
  cle?: string;
  kind?: 'terme' | 'portee' | 'effacer';
  terme?: string;
  portee?: IdGroupe;
  href?: string;
  cls?: string;
  vignette?: string;
  vcls?: string;
  sur?: string;
  titre: string;
  meta?: string[];
  fin?: string;
  apercu?: () => string;
}

let donnees: Promise<void> | null = null;
let pret = false;
let index: Entree[] = [];
let vocabulaire: string[] = [];
let frequentes: string[] = [
  'réservation',
  'logo',
  'script',
  'factures',
  'illustration',
  'traduction',
];
let defi: IndexRechercheApi['defi'] = null;

const prechauffer = (): Promise<void> => {
  donnees ??= Promise.all([
    api<IndexRechercheApi>('GET', '/api/v1/recherche/index'),
    import('../../lib/apprendre/contenus'),
  ]).then(([reponse, apprendre]) => {
    construire(reponse.ok ? reponse.donnees : null, apprendre.APPRENDRE);
    pret = true;
  });
  return donnees;
};

const GROUPES: {
  id: IdGroupe;
  label: string;
  court?: string;
  max: number;
  plus: (n: number) => string;
}[] = [
  { id: 'creations', label: 'Créations', max: 4, plus: (n) => `Voir les ${n} créations` },
  {
    id: 'guides',
    label: 'Guides et domaines',
    court: 'Guides',
    max: 2,
    plus: (n) => `Voir les ${n} guides et domaines`,
  },
  { id: 'forum', label: 'Forum', max: 3, plus: (n) => `Voir les ${n} sujets` },
  { id: 'apprendre', label: 'Apprendre', max: 3, plus: (n) => `Voir les ${n} savoirs et cas` },
  { id: 'membres', label: 'Membres', max: 3, plus: (n) => `Voir les ${n} membres` },
  { id: 'outils', label: 'Outils', max: 3, plus: (n) => `Voir les ${n} outils` },
  { id: 'pages', label: 'Pages', max: 3, plus: (n) => `Voir les ${n} pages` },
];
const GROUPE = Object.fromEntries(GROUPES.map((g) => [g.id, g])) as Record<
  IdGroupe,
  (typeof GROUPES)[number]
>;
const TYPES: Record<TypeCreation, [string, string]> = {
  UN_PROMPT: ['type-prompt', '1 prompt'],
  ITERATION: ['type-iteration', 'Itération'],
  PROJET: ['type-projet', 'Projet'],
};
const SUJETS: Record<TypeSujet, [string, string]> = {
  QUESTION: ['help', 'Question'],
  CLINIQUE: ['scan', 'Clinique du prompt'],
  ASTUCE: ['bulb', 'Astuce avant/après'],
  RETOUR_EXPERIENCE: ['route', 'Retour d’expérience'],
  DISCUSSION: ['users', 'Discussion'],
};
const NIVEAUX_CAS: Record<DifficulteCas, string> = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
};
const FAMILLES: Record<FamilleOutil, string> = {
  ASSISTANT: 'Assistants',
  IMAGE: 'Image',
  VIDEO: 'Vidéo',
  AUDIO: 'Audio',
  CODE: 'Code',
  AUTOMATISATION: 'Automatisation',
};

type OutilIndex = IndexRechercheApi['outils'][number];
let outilParNom = new Map<string, OutilIndex>();
const logo = (nom: string | OutilIndex, taille: number) => {
  const o = typeof nom === 'string' ? outilParNom.get(nom) : nom;
  return o?.logo
    ? `<img class="tool-logo${o.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(o.logo)}.svg" alt="" width="${taille}" height="${taille}" decoding="async">`
    : '';
};
const estMoi = (pseudo: string) => etats.membre() && etats.moi()?.pseudo === pseudo;
const quiAffiche = (m: MembreIndexApi) => (estMoi(m.pseudo) ? 'Vous' : m.nom);
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
const avatar = (m: MembreIndexApi, taille: number) =>
  m.avatar
    ? `<img class="avatar" src="${esc(m.avatar)}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${esc(initiales(m.nom))}</span>`;
const outilLigne = ({ nom, modeles }: { nom: string; modeles: string[] }) =>
  `<span>${logo(nom, 15)}${t(modeles.length ? `${nom} · ${modeles.join(', ')}` : nom)}</span>`;
const infos = (lignes: [string, string][]) =>
  `<dl class="rch-ap-infos">${lignes
    .filter(([, valeur]) => valeur)
    .map(([libelle, valeur]) => `<div><dt>${t(libelle)}</dt><dd>${valeur}</dd></div>`)
    .join('')}</dl>`;
const tuile = (contenu: string) =>
  `<div class="rch-ap-media"><div class="rch-ap-tuile">${contenu}</div></div>`;
/** Plus petite déclinaison d'au moins 720 px (vignette et aperçu). */
const image = (m: MediaApi, alt = m.texteAlternatif) => {
  const src = m.declinaisons.find((d) => d.largeur >= 720)?.url ?? m.url;
  return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
};
const apercuBase = ({
  media = '',
  sur,
  titre,
  texte = '',
  details = '',
  action,
}: {
  media?: string;
  sur: string;
  titre: string;
  texte?: string;
  details?: string;
  action: string;
}) =>
  `${media}<p class="rch-ap-sur">${sur}</p><h3 class="rch-ap-titre">${t(titre)}</h3>${texte ? `<p class="rch-ap-texte">${t(texte)}</p>` : ''}${details}<p class="rch-ap-action">${touche(ic('entree'))}${t(action)}</p>`;

function construire(
  X: IndexRechercheApi | null,
  A: typeof import('../../lib/apprendre/contenus').APPRENDRE,
): void {
  const domaines = X?.domaines ?? [];
  const domaineIcone = Object.fromEntries(domaines.map((d) => [d.libelle, d.icone ?? 'layers']));
  const creations = X?.creations ?? [];
  const ajout: Entree[] = [];
  const max = <T>(liste: T[], f: (x: T) => number) => Math.max(1, ...liste.map(f));
  outilParNom = new Map((X?.outils ?? []).map((o) => [o.nom, o]));
  if (X?.frequentes.length) frequentes = X.frequentes;
  defi = X?.defi ?? null;

  const maxUtile = max(creations, (c) => c.utiles);
  for (const c of creations) {
    const [icone, type] = TYPES[c.type];
    const outil = c.outils[0];
    const iconeDomaine = (c.domaine && domaineIcone[c.domaine]) || 'layers';
    ajout.push({
      cle: `creation:${c.id}`,
      groupe: 'creations',
      titre: c.titre,
      href: ROUTES.creation(c.id, c.slug),
      f0: champ(c.titre),
      f1: champ(
        c.etiquettes,
        c.outils.map((o) => [o.nom, o.modeles]),
        c.auteur.nom,
        c.domaine,
        type,
      ),
      f2: champ(c.objectif),
      pop: c.utiles / maxUtile,
      vignette: () => (c.image ? image(c.image, '') : ic(iconeDomaine)),
      meta: () => [
        `${ic(icone)}${type}`,
        t(c.domaine ?? ''),
        outil ? `${logo(outil.nom, 14)}${t(outil.nom)}` : '',
        t(quiAffiche(c.auteur)),
      ],
      apercu: () =>
        apercuBase({
          media: c.image
            ? `<div class="rch-ap-media">${image(c.image)}</div>`
            : tuile(ic(iconeDomaine)),
          sur: `${ic(icone)}${type}`,
          titre: c.titre,
          texte: c.objectif,
          details: infos([
            [c.outils.length > 1 ? 'Outils' : 'Outil', c.outils.map(outilLigne).join('')],
            ['Auteur', `<span>${avatar(c.auteur, 20)}${t(quiAffiche(c.auteur))}</span>`],
            [
              'Reproductions',
              c.type !== 'PROJET' && c.reproductions
                ? t(
                    c.tauxReussite === null
                      ? fmt(c.reproductions)
                      : `${fmt(c.reproductions)}, avec ${c.tauxReussite} % de succès`,
                  )
                : '',
            ],
            ['Votes « Utile »', c.type === 'PROJET' && c.utiles ? fmt(c.utiles) : ''],
          ]),
          action: 'Ouvrir la fiche',
        }),
    });
  }

  for (const g of X?.guides ?? [])
    ajout.push({
      cle: `guide:${g.slug}`,
      groupe: 'guides',
      titre: g.titre,
      href: ROUTES.guide(g.slug),
      f0: champ(g.titre, g.titreCourt),
      f1: champ(g.motsCles, g.domaine, 'guide'),
      f2: champ(g.etapes),
      pop: 0.7,
      vcls: 'est-accent',
      vignette: () => ic('compass'),
      meta: () => ['Guide', t(g.domaine), pluriel(g.etapes.length, 'étape', 'étapes')],
      apercu: () =>
        apercuBase({
          media: tuile(ic(domaineIcone[g.domaine] ?? 'compass')),
          sur: `${ic('compass')}Guide · ${t(g.domaine)}`,
          titre: g.titre,
          details: `<ol class="rch-ap-liste">${g.etapes
            .slice(0, 4)
            .map((e) => `<li>${ic('check')}${t(e)}</li>`)
            .join('')}</ol>`,
          action: 'Ouvrir le guide',
        }),
    });

  for (const d of domaines) {
    const exemples = creations
      .filter((c) => c.domaine === d.libelle)
      .toSorted((a, b) => b.utiles - a.utiles)
      .slice(0, 3);
    const icone = d.icone ?? 'layers';
    ajout.push({
      cle: `domaine:${d.slug}`,
      groupe: 'guides',
      titre: d.libelle,
      href: `${ROUTES.explorer}?categorie=${encodeURIComponent(d.slug)}`,
      f0: champ(d.libelle),
      f1: champ('domaine catégorie'),
      f2: champ(d.description),
      pop: 0.6,
      vignette: () => ic(icone),
      meta: () => ['Domaine', d.creations ? pluriel(d.creations, 'création', 'créations') : ''],
      apercu: () =>
        apercuBase({
          media: tuile(ic(icone)),
          sur: `${ic('layers')}Domaine`,
          titre: d.libelle,
          texte: d.description ?? '',
          details: exemples.length
            ? `<ul class="rch-ap-liste">${exemples.map((c) => `<li>${ic(TYPES[c.type][0])}${t(c.titre)}</li>`).join('')}</ul>`
            : '',
          action: 'Parcourir le domaine',
        }),
    });
  }

  const sujets = X?.sujets ?? [];
  const maxSujet = max(sujets, (s) => s.utiles);
  for (const s of sujets) {
    const [icone, genre] = SUJETS[s.type];
    const statut =
      s.etat === 'RESOLU'
        ? `<span class="est-resolu">${ic('check-circle')}Résolu</span>`
        : s.etat === 'FERME'
          ? `${ic('lock')}Fermé`
          : '';
    ajout.push({
      cle: `sujet:${s.id}`,
      groupe: 'forum',
      titre: s.titre,
      href: ROUTES.sujet(s.id, s.slug),
      f0: champ(s.titre),
      f1: champ(s.etiquettes, s.outil, s.modele, s.auteur.nom, genre),
      f2: champ(s.extrait),
      pop: s.utiles / maxSujet,
      vignette: () => ic(icone),
      meta: () => [
        genre,
        statut,
        s.reponses ? pluriel(s.reponses, 'réponse', 'réponses') : 'Sans réponse',
        s.outil ? `${logo(s.outil, 14)}${t(s.outil)}` : '',
      ],
      apercu: () =>
        apercuBase({
          sur: `${ic(icone)}${t(genre)}`,
          titre: s.titre,
          texte: s.extrait,
          details: infos([
            ['Auteur', `<span>${avatar(s.auteur, 20)}${t(quiAffiche(s.auteur))}</span>`],
            [
              'Outil',
              s.outil ? outilLigne({ nom: s.outil, modeles: s.modele ? [s.modele] : [] }) : '',
            ],
            ['Statut', s.etat === 'RESOLU' ? 'Résolu' : s.etat === 'FERME' ? 'Fermé' : 'Ouvert'],
            ['Réponses', fmt(s.reponses)],
          ]),
          action: 'Lire le sujet',
        }),
    });
  }

  const rubriques = Object.fromEntries(A.rubriques.map((r) => [r.id, r]));
  for (const s of A.savoirs) {
    const r = rubriques[s.kind] ?? { one: 'Savoir', label: 'Savoirs', icon: 'book' };
    const corps = (s.body ?? []).flatMap((b) => [b.h ?? '', ...(b.p ?? []), ...(b.steps ?? [])]);
    ajout.push({
      cle: `savoir:${s.id}`,
      groupe: 'apprendre',
      titre: s.title,
      href: `${ROUTES.apprendre}?savoir=${encodeURIComponent(s.id)}`,
      f0: champ(s.title),
      f1: champ(r.one, r.label, s.short),
      f2: champ(corps),
      pop: 0.5,
      vignette: () => ic(r.icon),
      meta: () => [t(r.one), `${s.minutes} min de lecture`],
      apercu: () =>
        apercuBase({
          sur: `${ic(r.icon)}${t(r.one)}`,
          titre: s.title,
          texte: s.short,
          details: infos([
            ['Lecture', t(`${s.minutes} min`)],
            ['Mise à jour', s.updated ? t(dateLongue(s.updated)) : ''],
          ]),
          action: 'Lire',
        }),
    });
  }
  for (const c of X?.cas ?? [])
    ajout.push({
      cle: `cas:${c.id}`,
      groupe: 'apprendre',
      titre: c.titre,
      href: ROUTES.casBonReflexe(c.id, c.slug),
      f0: champ(c.titre),
      f1: champ('bon réflexe cas', c.domaine, NIVEAUX_CAS[c.difficulte]),
      f2: champ(c.contexte),
      pop: 0.55,
      vignette: () => ic('scale'),
      meta: () => [
        'Cas Bon réflexe',
        NIVEAUX_CAS[c.difficulte],
        c.dureeMinutes ? t(`${c.dureeMinutes} min`) : '',
      ],
      apercu: () =>
        apercuBase({
          sur: `${ic('scale')}Cas Bon réflexe`,
          titre: c.titre,
          texte: c.contexte,
          details: infos([
            ['Niveau', NIVEAUX_CAS[c.difficulte]],
            ['Domaine', t(c.domaine ?? '')],
            ['Durée', c.dureeMinutes ? t(`${c.dureeMinutes} min`) : ''],
            ['Réponses', fmt(c.reponses)],
          ]),
          action: 'Répondre au cas',
        }),
    });

  const membres = (X?.membres ?? []).filter((m) => !estMoi(m.pseudo));
  const maxPoints = max(membres, (m) => m.reputation);
  for (const m of membres)
    ajout.push({
      cle: `membre:${m.pseudo}`,
      groupe: 'membres',
      titre: m.nom,
      href: ROUTES.profil(m.pseudo),
      f0: champ(m.nom, m.pseudo),
      f1: champ(m.niveau, m.outils, 'membre'),
      f2: ' ',
      pop: m.reputation / maxPoints,
      vcls: 'est-avatar',
      vignette: () => avatar(m, 42),
      meta: () => [
        t(m.niveau),
        t(`${fmt(m.reputation)} points`),
        m.outils
          .slice(0, 2)
          .map((o) => logo(o, 14))
          .join(''),
      ],
      apercu: () =>
        apercuBase({
          media: tuile(avatar(m, 84)),
          sur: `${ic('user')}Membre`,
          titre: m.nom,
          details: infos([
            ['Niveau', t(m.niveau)],
            ['Points', fmt(m.reputation)],
            ['Membre depuis', t(dateLongue(m.depuis))],
            ['Outils préférés', m.outils.map((o) => `<span>${logo(o, 15)}${t(o)}</span>`).join('')],
          ]),
          action: 'Voir son profil',
        }),
    });

  const outils = X?.outils ?? [];
  const maxUsage = max(outils, (o) => o.creations);
  for (const o of outils) {
    const liste = creations
      .filter((c) => c.outils.some((x) => x.nom === o.nom))
      .toSorted((a, b) => b.utiles - a.utiles);
    ajout.push({
      cle: `outil:${o.slug}`,
      groupe: 'outils',
      titre: o.nom,
      href: `${ROUTES.explorer}?q=${encodeURIComponent(o.nom)}`,
      f0: champ(o.nom),
      f1: champ(FAMILLES[o.famille], o.alias, o.modeles, 'outil'),
      f2: ' ',
      pop: o.creations / maxUsage,
      vcls: 'est-outil',
      vignette: () => logo(o, 22),
      meta: () => [
        'Outil',
        t(FAMILLES[o.famille]),
        o.creations ? pluriel(o.creations, 'création', 'créations') : '',
      ],
      apercu: () =>
        apercuBase({
          media: tuile(logo(o, 52)),
          sur: `${ic('layers')}Outil · ${t(FAMILLES[o.famille])}`,
          titre: o.nom,
          details: liste.length
            ? `${infos([
                [
                  'Modèles utilisés',
                  o.modeles
                    .slice(0, 3)
                    .map((m) => t(m))
                    .join(', '),
                ],
              ])}<ul class="rch-ap-liste">${liste
                .slice(0, 3)
                .map((c) => `<li>${ic(TYPES[c.type][0])}${t(c.titre)}</li>`)
                .join('')}</ul>`
            : '',
          action: 'Voir dans Explorer',
        }),
    });
  }

  index = ajout;
  const ensemble = new Set<string>();
  for (const e of index)
    for (const m of `${e.f0} ${e.f1}`.split(' ')) if (m.length > 2) ensemble.add(m);
  vocabulaire = [...ensemble];
}

/** Pages du site : elles suivent la session (visiteur ou membre). */
function pages(): PageSite[] {
  const membre = etats.membre();
  const moi = etats.moi();
  const ici = `${location.pathname}${location.search}${location.hash}`;
  const retour = [ROUTES.connexion, ROUTES.inscription].includes(location.pathname as '/connexion')
    ? ''
    : `?retour=${encodeURIComponent(ici)}`;
  const n = membre ? etats.nonLues() : 0;
  type LignePage = readonly [string, string, string, string, string, string, number];
  const liste: LignePage[] = [
    [
      'accueil',
      'Accueil',
      ROUTES.accueil,
      'home',
      'La communauté qui publie le chemin parcouru avec l’IA',
      'accueil vysora presentation',
      0.4,
    ],
    [
      'explorer',
      'Explorer les créations',
      ROUTES.explorer,
      'compass',
      'Guides, domaines et créations de la communauté',
      'explorer catalogue parcourir creations guides',
      0.8,
    ],
    [
      'forum',
      'Forum',
      ROUTES.forum,
      'message',
      'Questions, cliniques du prompt et discussions',
      'forum entraide aide questions discussions communaute',
      0.8,
    ],
    [
      'poser',
      'Poser une question',
      ROUTES.nouveauSujet,
      'help',
      'Demander de l’aide à la communauté',
      'poser question demander aide bloque nouveau sujet',
      0.7,
    ],
    [
      'clinique',
      'Clinique du prompt',
      ROUTES.clinique,
      'scan',
      'Faire reformuler un prompt qui résiste',
      'clinique prompt reformuler corriger ameliorer',
      0.6,
    ],
    [
      'apprendre',
      'Apprendre',
      ROUTES.apprendre,
      'bulb',
      'Bases, notions, règles et astuces',
      'apprendre savoirs bases notions regles astuces cours debuter tutoriel',
      0.8,
    ],
    [
      'bon-reflexe',
      'Bon réflexe',
      ROUTES.bonReflexe,
      'scale',
      'Juger une vraie réponse d’IA, puis comparer avec l’analyse',
      'bon reflexe cas entrainement exercice juger',
      0.7,
    ],
    [
      'classements',
      'Classements',
      ROUTES.classements,
      'trophy',
      'Palmarès de la semaine et classement des membres',
      'classements palmares points reputation niveaux badges',
      0.7,
    ],
    [
      'defis',
      'Défi de la semaine',
      ROUTES.defis,
      'flag',
      defi?.titre ?? 'Le défi en cours et les défis terminés',
      'defi defis concours participer affiche semaine',
      0.7,
    ],
    [
      'publier',
      'Publier une création',
      ROUTES.publier,
      'plus',
      'Partager un résultat et le chemin parcouru',
      'publier partager nouvelle creation poster ajouter',
      0.8,
    ],
    ...(membre && moi
      ? ([
          [
            'profil',
            'Mon profil',
            ROUTES.profil(moi.pseudo),
            'user',
            'Votre réputation, vos créations et vos badges',
            'profil moi compte reputation badges',
            0.6,
          ],
          [
            'mes-contenus',
            'Mes contenus',
            ROUTES.mesContenus,
            'folder',
            'Brouillons, créations publiées et enregistrées',
            'mes contenus brouillons enregistres publies creations',
            0.7,
          ],
          [
            'notifications',
            'Notifications',
            ROUTES.notifications,
            'bell',
            n
              ? pluriel(n, 'notification non lue', 'notifications non lues')
              : 'Réponses, votes et décisions de modération',
            'notifications alertes reponses',
            0.6,
          ],
          [
            'parametres',
            'Paramètres',
            ROUTES.parametres,
            'settings',
            'Compte, sécurité, notifications et données',
            'parametres reglages compte mot passe mail securite confidentialite supprimer donnees',
            0.6,
          ],
        ] satisfies LignePage[])
      : ([
          [
            'connexion',
            'Se connecter',
            `${ROUTES.connexion}${retour}`,
            'login',
            'Retrouver vos votes, vos essais et vos brouillons',
            'connexion connecter identifier compte mot passe oublie',
            0.6,
          ],
          [
            'inscription',
            'Créer un compte',
            `${ROUTES.inscription}${retour}`,
            'user-plus',
            'Explorer, publier et apprendre gratuitement',
            'inscription inscrire creer compte rejoindre',
            0.6,
          ],
        ] satisfies LignePage[])),
    [
      'charte',
      'Charte communautaire',
      ROUTES.charte,
      'heart',
      'Les règles qui font vivre la communauté',
      'charte regles communaute moderation bienveillance',
      0.3,
    ],
    [
      'cgu',
      'Conditions générales d’utilisation',
      ROUTES.cgu,
      'doc',
      'Les règles d’utilisation du service',
      'cgu conditions generales utilisation licence',
      0.2,
    ],
    [
      'confidentialite',
      'Politique de confidentialité',
      ROUTES.confidentialite,
      'lock',
      'Vos données personnelles et vos droits',
      'confidentialite donnees personnelles rgpd vie privee',
      0.2,
    ],
    [
      'cookies',
      'Cookies',
      ROUTES.cookies,
      'doc',
      'Traceurs et mesure d’audience',
      'cookies traceurs mesure audience consentement',
      0.2,
    ],
    [
      'mentions',
      'Mentions légales',
      ROUTES.mentionsLegales,
      'doc',
      'Éditeur et hébergement du site',
      'mentions legales editeur hebergeur',
      0.2,
    ],
    [
      'contact',
      'Contact',
      ROUTES.contact,
      'mail',
      'Écrire à l’équipe Vysora',
      'contact ecrire equipe aide support signaler',
      0.4,
    ],
  ];
  return liste.map(([id, titre, href, icone, texte, motsCles, pop]) => ({
    cle: `page:${id}`,
    id,
    groupe: 'pages' as const,
    titre,
    href,
    icone,
    texte,
    f0: champ(titre),
    f1: champ(motsCles),
    f2: champ(texte),
    pop,
    vignette: () => ic(icone),
    meta: () => [t(texte)],
    apercu: () =>
      apercuBase({
        media:
          id === 'defis' && defi?.image
            ? `<div class="rch-ap-media">${image(defi.image)}</div>`
            : tuile(ic(icone)),
        sur: `${ic(icone)}Page`,
        titre,
        texte,
        action: 'Ouvrir la page',
      }),
  }));
}

/* Recherche ---------------------------------------------------------------- */

function noter(entree: Entree, groupes: string[][]): number {
  let total = 0;
  for (const vars of groupes) {
    const dans = (f: string) => vars.some((v) => f.includes(` ${v}`));
    const poids = dans(entree.f0) ? 10 : dans(entree.f1) ? 5 : dans(entree.f2) ? 2 : 0;
    if (!poids) return 0;
    total += poids;
    if (vars.some((v) => entree.f0.includes(` ${v} `))) total += 2;
  }
  return total;
}
interface Resultat {
  e: Entree;
  score: number;
}
function trouver(liste: Entree[], groupes: string[][], phrase: string): Resultat[] {
  const debut = ` ${plier(phrase).replace(/\s+/g, ' ').trim()}`;
  return liste
    .map((e) => {
      let score = noter(e, groupes);
      if (!score) return null;
      if (e.f0.startsWith(debut)) score += 8;
      if (e.f0.trim() === debut.trim()) score += 12;
      return { e, score: score + e.pop * 3 };
    })
    .filter((r): r is Resultat => r !== null)
    .toSorted((a, b) => b.score - a.score || a.e.titre.localeCompare(b.e.titre, 'fr'));
}
function corriger(liste: string[]): string[] {
  return liste.map((mot) => {
    if (mot.length < 4 || /\d/.test(mot) || SYNONYMES_RECHERCHE[mot]) return mot;
    const r = racine(mot);
    if (vocabulaire.some((m) => m.startsWith(r))) return mot;
    const seuil = mot.length >= 7 ? 2 : 1;
    let meilleur: string | null = null;
    let ecart = seuil + 1;
    for (const m of vocabulaire) {
      let d = distance(mot, m, seuil);
      if (mot.length >= 5 && m.length > mot.length)
        d = Math.min(d, distance(mot, m.slice(0, mot.length), seuil));
      if (d < ecart || (d === ecart && meilleur && m.length < meilleur.length)) {
        ecart = d;
        meilleur = m;
      }
    }
    return meilleur && ecart <= seuil ? meilleur : mot;
  });
}
/** Tous les mots d'abord ; sinon les mots corrigés ; sinon les seuls mots connus. */
function chercher(q: string): { resultats: Resultat[]; racines: string[]; correction?: string } {
  const liste = [...index, ...pages()];
  const tous = mots(q);
  if (!tous.length) return { resultats: [], racines: [] };
  const essai = (m: string[]) => ({
    resultats: trouver(liste, m.map(variantes), m.join(' ')),
    racines: m.map(racine),
  });
  const r = essai(tous);
  if (r.resultats.length || etat.exact) return r;
  const corriges = corriger(tous);
  if (corriges.join(' ') !== tous.join(' ')) {
    const r2 = essai(corriges);
    if (r2.resultats.length) return { ...r2, correction: corriges.join(' ') };
  }
  const connus = corriges.filter((m) => liste.some((e) => noter(e, [variantes(m)])));
  if (connus.length && connus.length < corriges.length) {
    const r3 = essai(connus);
    if (r3.resultats.length) return { ...r3, correction: connus.join(' ') };
  }
  return r;
}

/* Rendu ---------------------------------------------------------------------- */

const etat: { q: string; portee: IdGroupe | 'tout'; exact: boolean } = {
  q: '',
  portee: 'tout',
  exact: false,
};
interface Elements {
  dialogue: HTMLDialogElement;
  voile: HTMLElement;
  feuille: HTMLElement;
  champ: HTMLElement;
  loupe: SVGElement;
  saisie: HTMLInputElement;
  effacer: HTMLButtonElement;
  fermer: HTMLButtonElement;
  filtres: HTMLElement;
  zone: HTMLElement;
  colonne: HTMLElement;
  avant: HTMLElement;
  liste: HTMLElement;
  apercu: HTMLElement;
  pied: HTMLElement;
  total: HTMLElement;
  annonce: HTMLElement;
}
let el: Elements | null = null;
let curseur: HTMLElement | null = null;
let options: Option[] = [];
let elements: HTMLElement[] = [];
let actif = -1;
let cleApercu: string | null = null;
let dejaVues = new Set<string>();
let source: Element | null = null;
let fermeture: Promise<void> | null = null;
let annonceMinuteur = 0;

const groupeHTML = (
  id: string,
  label: string,
  contenu: string,
  { compte = null, colonne = 0 }: { compte?: number | null; colonne?: number } = {},
) =>
  `<div class="rch-groupe" role="group" aria-labelledby="rch-g-${id}"${colonne ? ` data-colonne="${colonne}"` : ''}><p class="rch-groupe-tete" id="rch-g-${id}" role="presentation">${t(label)}${compte !== null ? `<small>${fmt(compte)}</small>` : ''}</p>${contenu}</div>`;
function optionHTML(o: Option): string {
  const i = options.push(o) - 1;
  const nouvelle = !dejaVues.has(o.cle ?? `${o.kind}:${o.titre}`);
  const balise = o.href ? 'a' : 'div';
  const attributs = `id="rch-o-${i}" role="option" aria-selected="false" class="rch-option${o.cls ? ` ${o.cls}` : ''}${nouvelle ? ' est-nouvelle' : ''}" data-i="${i}" style="--i:${Math.min(i, 12)}"${o.href ? ` href="${esc(o.href)}" tabindex="-1"` : ''}`;
  const meta = (o.meta ?? []).filter(Boolean);
  return `<${balise} ${attributs}><span class="rch-vignette${o.vcls ? ` ${o.vcls}` : ''}" aria-hidden="true">${o.vignette ?? ''}</span><span class="rch-texte">${o.sur ? `<span class="rch-sur">${t(o.sur)}</span>` : ''}<span class="rch-titre">${o.titre}</span>${meta.length ? `<span class="rch-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</span>` : ''}</span><span class="rch-fin">${o.fin ?? ic('arrow')}</span></${balise}>`;
}
const depuisEntree = (e: Entree, racines: string[]): Option => ({
  cle: e.cle,
  href: e.href,
  titre: surligner(e.titre, racines),
  meta: e.meta(),
  vignette: e.vignette(),
  vcls: e.vcls,
  apercu: e.apercu,
});

function accueilHTML(): string {
  const recentes = memoire.lire().slice(0, 5);
  const frequents = frequentes.filter(
    (f) => !recentes.some((r) => plier(r).trim() === plier(f).trim()),
  );
  let html = '';
  if (recentes.length) {
    html += groupeHTML(
      'recentes',
      'Recherches récentes',
      [
        ...recentes.map((r) =>
          optionHTML({
            kind: 'terme',
            terme: r,
            cle: `recente:${r}`,
            cls: 'est-compacte',
            vignette: ic('clock'),
            titre: esc(typo(r)),
            fin: `<span class="rch-oublier" data-rch-oublier="${esc(r)}" title="Retirer de l’historique" aria-hidden="true">${ic('close')}</span>`,
          }),
        ),
        optionHTML({
          kind: 'effacer',
          cle: 'effacer',
          cls: 'est-compacte est-discrete',
          titre: 'Effacer l’historique',
          fin: '',
        }),
      ].join(''),
    );
  }
  html += groupeHTML(
    'frequentes',
    'Recherches fréquentes',
    frequents
      .slice(0, 6)
      .map((f) =>
        optionHTML({
          kind: 'terme',
          terme: f,
          cle: `frequente:${f}`,
          cls: 'est-compacte',
          vignette: ic('trend'),
          titre: esc(typo(f)),
        }),
      )
      .join(''),
  );

  const parId = Object.fromEntries(pages().map((p) => [p.id, p]));
  const rapides = etats.membre()
    ? ['mes-contenus', 'notifications', 'poser', 'publier']
    : ['poser', 'bon-reflexe', 'publier', 'inscription'];
  html += groupeHTML(
    'rapides',
    'Accès rapide',
    [
      defi
        ? optionHTML({
            cle: 'rapide:defi',
            href: ROUTES.defi(defi.id, defi.slug),
            cls: 'est-defi',
            vignette: defi.image ? image(defi.image, '') : ic('flag'),
            sur: 'Défi de la semaine',
            titre: t(defi.titre),
            meta: [pluriel(defi.participations, 'participation', 'participations')],
          })
        : '',
      ...rapides
        .map((id) => parId[id])
        .filter((p): p is PageSite => Boolean(p))
        .map((p) =>
          optionHTML({
            cle: `rapide:${p.id}`,
            href: p.href,
            vignette: ic(p.icone),
            titre: t(p.titre),
            meta: [t(p.texte)],
          }),
        ),
    ].join(''),
    { colonne: 2 },
  );
  return html;
}

function resultatsHTML(q: string, x: Elements): string {
  const { resultats, racines, correction } = chercher(q);
  const parGroupe = Object.fromEntries(GROUPES.map((g) => [g.id, [] as Resultat[]])) as Record<
    IdGroupe,
    Resultat[]
  >;
  for (const r of resultats) parGroupe[r.e.groupe].push(r);
  const presents = GROUPES.filter((g) => parGroupe[g.id].length);
  if (etat.portee !== 'tout' && !parGroupe[etat.portee].length) etat.portee = 'tout';

  x.filtres.innerHTML = (
    [
      ['tout', 'Tout', resultats.length],
      ...presents.map((g) => [g.id, g.court ?? g.label, parGroupe[g.id].length]),
    ] as [string, string, number][]
  )
    .map(
      ([id, label, n]) =>
        `<button type="button" aria-pressed="${etat.portee === id}" data-rch-portee="${id}">${t(label)}<small>${fmt(n)}</small></button>`,
    )
    .join('');
  x.filtres.hidden = !resultats.length;
  x.total.textContent = resultats.length
    ? typo(pluriel(resultats.length, 'résultat', 'résultats'))
    : '';
  annoncer(
    resultats.length ? pluriel(resultats.length, 'résultat', 'résultats') : 'Aucun résultat',
  );

  const continuer: Option[] = [
    ...(location.pathname.startsWith(ROUTES.forum)
      ? [
          {
            cle: 'continuer:forum',
            href: `${ROUTES.forum}?q=${encodeURIComponent(q)}`,
            vignette: ic('message'),
            titre: t(`Rechercher « ${q} » dans le forum`),
            meta: ['Questions, cliniques et discussions'],
          },
        ]
      : []),
    {
      cle: 'continuer:explorer',
      href: `${ROUTES.explorer}?q=${encodeURIComponent(q)}`,
      vignette: ic('compass'),
      titre: t(`Rechercher « ${q} » dans Explorer`),
      meta: ['Guides et parcours documentés'],
    },
  ];

  if (!resultats.length) {
    x.avant.innerHTML = `<div class="rch-rien"><span class="rch-rien-icone" aria-hidden="true">${ic('search-x')}</span><h2>${t(`Aucun résultat pour « ${q} »`)}</h2><p>${t('Vérifiez l’orthographe, ou essayez un terme plus général : un objectif, un outil ou un domaine.')}</p></div>`;
    return groupeHTML(
      'suite',
      'Pour aller plus loin',
      [
        optionHTML({
          cle: 'rien:poser',
          href: ROUTES.nouveauSujet,
          vignette: ic('help'),
          titre: 'Poser la question sur le forum',
          meta: ['La communauté vous répond'],
        }),
        optionHTML({
          cle: 'rien:explorer',
          href: ROUTES.explorer,
          vignette: ic('compass'),
          titre: 'Explorer toutes les créations',
          meta: ['Guides, domaines et créations'],
        }),
      ].join(''),
    );
  }

  x.avant.innerHTML = correction
    ? `<p class="rch-correction">${t('Résultats pour')} <b>${esc(correction)}</b>. <button type="button" data-rch-exact>${t(`Rechercher plutôt « ${q} »`)}</button></p>`
    : '';
  const affiches =
    etat.portee === 'tout'
      ? presents.toSorted(
          (a, b) => (parGroupe[b.id][0]?.score ?? 0) - (parGroupe[a.id][0]?.score ?? 0),
        )
      : [GROUPE[etat.portee]];
  let html = affiches
    .map((g) => {
      const lignes = parGroupe[g.id];
      const montrees = etat.portee === 'tout' ? lignes.slice(0, g.max) : lignes.slice(0, 40);
      const plus =
        etat.portee === 'tout' && lignes.length > g.max
          ? optionHTML({
              kind: 'portee',
              portee: g.id,
              cle: `plus:${g.id}`,
              cls: 'est-plus',
              titre: t(g.plus(lignes.length)),
              fin: '',
            })
          : '';
      return groupeHTML(
        g.id,
        g.label,
        montrees.map((r) => optionHTML(depuisEntree(r.e, racines))).join('') + plus,
        { compte: lignes.length },
      );
    })
    .join('');
  html += groupeHTML('continuer', 'Continuer la recherche', continuer.map(optionHTML).join(''));
  return html;
}

const SQUELETTES = Array.from(
  { length: 5 },
  () => '<div class="rch-squelette" aria-hidden="true"><i></i><span><i></i><i></i></span></div>',
).join('');

function rendre({ neuf = false } = {}): void {
  if (!el) return;
  const x = el;
  const brut = x.saisie.value;
  const q = brut.trim().replace(/\s+/g, ' ');
  etat.q = q;
  if (!q) etat.portee = 'tout';
  x.champ.classList.toggle('a-texte', Boolean(brut));
  x.effacer.hidden = !brut;
  x.dialogue.classList.toggle('is-vide', !q);
  x.dialogue.classList.toggle('is-chargement', Boolean(q) && !pret);
  if (neuf) dejaVues = new Set();
  options = [];
  x.avant.innerHTML = '';
  let html = '';
  if (!q) {
    x.filtres.hidden = true;
    x.total.textContent = '';
    html = accueilHTML();
  } else if (!pret) {
    x.filtres.hidden = true;
    x.avant.innerHTML = SQUELETTES;
  } else {
    html = resultatsHTML(q, x);
  }
  x.colonne.classList.toggle('est-rien', Boolean(q) && pret && !options.some((o) => o.apercu));
  x.zone.classList.toggle('sans-apercu', !q || !pret || !options.some((o) => o.apercu));
  x.liste.setAttribute('aria-label', q ? 'Résultats' : 'Suggestions');
  x.liste.innerHTML = `<span class="rch-curseur" aria-hidden="true"></span>${html}`;
  curseur = x.liste.firstElementChild as HTMLElement;
  elements = $$('[role="option"]', x.liste);
  dejaVues = new Set(options.map((o) => o.cle ?? `${o.kind}:${o.titre}`));
  x.liste.scrollTop = 0;
  cleApercu = null;
  actif = -1;
  x.saisie.removeAttribute('aria-activedescendant');
  if (q && pret && elements.length) activer(0, { glisser: false });
  else if (!q || !pret) x.apercu.innerHTML = '';
}

function positionDans(cible: HTMLElement, liste: HTMLElement) {
  let x = 0;
  let y = 0;
  for (
    let n: HTMLElement | null = cible;
    n && n !== liste;
    n = n.offsetParent as HTMLElement | null
  ) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}
function activer(i: number, { defiler = false, glisser = true } = {}): void {
  if (!el || !curseur || !elements.length) return;
  const { liste, saisie, apercu } = el;
  actif = (i + elements.length) % elements.length;
  elements.forEach((option, k) => option.setAttribute('aria-selected', String(k === actif)));
  const option = elements[actif];
  if (!option) return;
  saisie.setAttribute('aria-activedescendant', option.id);
  const { x, y } = positionDans(option, liste);
  if (!glisser || !curseur.classList.contains('is-visible'))
    curseur.classList.add('sans-transition');
  curseur.style.transform = `translate(${x}px, ${y}px)`;
  curseur.style.width = `${option.offsetWidth}px`;
  curseur.style.height = `${option.offsetHeight}px`;
  curseur.classList.add('is-visible');
  curseur.getBoundingClientRect();
  curseur.classList.remove('sans-transition');
  if (defiler) {
    const haut = liste.scrollTop;
    const bas = haut + liste.clientHeight;
    const tete = option.closest('.rch-groupe')?.firstElementChild as HTMLElement | null;
    const cible = option === tete?.nextElementSibling ? y - (tete.offsetHeight + 4) : y - 8;
    const comportement = animations.completes() ? 'smooth' : 'auto';
    if (cible < haut) liste.scrollTo({ top: Math.max(0, cible), behavior: comportement });
    else if (y + option.offsetHeight + 8 > bas)
      liste.scrollTo({
        top: y + option.offsetHeight + 8 - liste.clientHeight,
        behavior: comportement,
      });
  }
  const o = options[actif];
  if (o?.apercu && o.cle !== cleApercu) {
    cleApercu = o.cle ?? null;
    apercu.innerHTML = `<div class="rch-ap is-entree">${o.apercu()}</div>`;
  }
}

function annoncer(texte: string): void {
  clearTimeout(annonceMinuteur);
  annonceMinuteur = window.setTimeout(() => {
    if (el) el.annonce.textContent = typo(texte);
  }, 650);
}
function memoriser(q: string): void {
  const terme = q.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (terme.length < 2) return;
  const avant = memoire.lire().filter((r) => plier(r).trim() !== plier(terme).trim());
  memoire.ecrire([terme, ...avant].slice(0, 6));
}
function oublier(terme: string): void {
  memoire.ecrire(memoire.lire().filter((r) => r !== terme));
  const garde = actif;
  rendre();
  if (garde >= 0 && elements.length)
    activer(Math.min(garde, elements.length - 1), { glisser: false });
  annoncer(`« ${terme} » retiré de l’historique.`);
}
function executer(o: Option): void {
  if (!el) return;
  const { saisie } = el;
  if (o.kind === 'terme' && o.terme) {
    saisie.value = o.terme;
    etat.exact = false;
    rendre({ neuf: true });
    saisie.focus();
    saisie.setSelectionRange(saisie.value.length, saisie.value.length);
  } else if (o.kind === 'portee' && o.portee) {
    etat.portee = o.portee;
    rendre({ neuf: true });
    saisie.focus();
  } else if (o.kind === 'effacer') {
    memoire.ecrire([]);
    rendre();
    saisie.focus();
    annoncer('Historique de recherche effacé.');
  }
}

/* Ouverture et fermeture ----------------------------------------------------- */

const anime = (cible: Element | null, images: Keyframe[], reglages: KeyframeAnimationOptions) =>
  cible && 'animate' in cible ? cible.animate(images, reglages) : null;
/** Seules les animations lancées ici : celles des feuilles de style (fil de chargement,
    apparitions) continuent. */
const animationsScript = (dialogue: HTMLDialogElement) =>
  dialogue
    .getAnimations({ subtree: true })
    .filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition));
const fini = (liste: (Animation | null)[]) =>
  Promise.all(
    liste.filter((a): a is Animation => a !== null).map((a) => a.finished.catch(() => {})),
  ).then(() => undefined);
const centre = (r: DOMRect): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];
const hauteurEnTete = () =>
  parseFloat(getComputedStyle(racineDoc).getPropertyValue('--header-h')) || 72;
const rayon = (dialogue: HTMLElement) =>
  parseFloat(getComputedStyle(dialogue).getPropertyValue('--rch-rayon')) || 0;
const borner = (valeur: number, min: number, max: number) => Math.min(Math.max(valeur, min), max);
function rectSource(): DOMRect | null {
  if (!source?.isConnected) return null;
  const r = source.getBoundingClientRect();
  return r.width && r.bottom > 0 && r.top < window.innerHeight ? r : null;
}
/** Découpe du champ ramenée à la place de la loupe de l'en-tête. */
function insetDepuis(r: DOMRect, c: DOMRect): string {
  const w = Math.min(r.width, c.width);
  const h = Math.min(r.height, c.height);
  const gauche = borner(r.left - c.left, 0, c.width - w);
  const haut = borner(r.top - c.top, 0, c.height - h);
  return `inset(${haut}px ${c.width - gauche - w}px ${c.height - haut - h}px ${gauche}px round ${h / 2}px)`;
}
function insetCentre(c: DOMRect): string {
  const m = Math.max(0, c.width / 2 - c.height / 2);
  return `inset(0px ${m}px 0px ${m}px round ${c.height / 2}px)`;
}

function animerOuverture(x: Elements): void {
  const niveau = animations.niveau();
  if (niveau === 'none') return;
  if (niveau === 'reduced') {
    anime(x.dialogue, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    return;
  }
  const h = hauteurEnTete();
  const R = rayon(x.dialogue);
  const r = rectSource();
  const c = x.champ.getBoundingClientRect();
  anime(x.voile, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: DOUX });
  anime(
    x.feuille,
    [
      { clipPath: `inset(0px 0px calc(100% - ${h}px) 0px round 0px)` },
      { clipPath: `inset(0px 0px 0px 0px round 0px 0px ${R}px ${R}px)` },
    ],
    { duration: 640, easing: EMPH },
  );
  anime(x.feuille, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
  anime(
    x.champ,
    [
      { clipPath: r ? insetDepuis(r, c) : insetCentre(c) },
      { clipPath: `inset(0px 0px 0px 0px round ${c.height / 2}px)` },
    ],
    { duration: 580, easing: EMPH },
  );
  if (r) {
    const [x1, y1] = centre(r);
    const [x2, y2] = centre(x.loupe.getBoundingClientRect());
    anime(
      x.loupe,
      [{ transform: `translate(${x1 - x2}px, ${y1 - y2}px)` }, { transform: 'none' }],
      {
        duration: 580,
        easing: EMPH,
      },
    );
  }
  anime(
    x.saisie,
    [
      { opacity: 0, transform: 'translateX(-10px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 420, delay: 170, easing: EMPH, fill: 'backwards' },
  );
  anime(
    x.fermer,
    [
      { opacity: 0, transform: 'translateX(8px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 360, delay: 140, easing: EMPH, fill: 'backwards' },
  );
  anime(x.pied, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 320,
    delay: 300,
    easing: DOUX,
    fill: 'backwards',
  });
}

function animerFermeture(x: Elements): Promise<void> {
  const niveau = animations.niveau();
  if (niveau === 'none') return Promise.resolve();
  const reglage = (duration: number, extra: KeyframeAnimationOptions = {}) => ({
    duration,
    easing: SORTIE,
    fill: 'forwards' as const,
    ...extra,
  });
  if (niveau === 'reduced')
    return fini([
      anime(x.dialogue, [{ opacity: 1 }, { opacity: 0 }], reglage(140, { easing: 'linear' })),
    ]);
  const h = hauteurEnTete();
  const R = rayon(x.dialogue);
  const r = rectSource();
  const c = x.champ.getBoundingClientRect();
  const a: (Animation | null)[] = [];
  for (const cible of [x.filtres, x.zone, x.pied])
    a.push(anime(cible, [{ opacity: 1 }, { opacity: 0 }], reglage(140, { easing: 'linear' })));
  for (const cible of [x.saisie, x.effacer, x.fermer])
    a.push(anime(cible, [{ opacity: 1 }, { opacity: 0 }], reglage(120, { easing: 'linear' })));
  a.push(
    anime(
      x.champ,
      [
        { clipPath: `inset(0px 0px 0px 0px round ${c.height / 2}px)` },
        { clipPath: r ? insetDepuis(r, c) : insetCentre(c) },
      ],
      reglage(340, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }),
    ),
  );
  if (r) {
    const [x1, y1] = centre(r);
    const [x2, y2] = centre(x.loupe.getBoundingClientRect());
    a.push(
      anime(
        x.loupe,
        [{ transform: 'none' }, { transform: `translate(${x1 - x2}px, ${y1 - y2}px)` }],
        reglage(340, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }),
      ),
    );
  }
  a.push(
    anime(
      x.feuille,
      [
        { clipPath: `inset(0px 0px 0px 0px round 0px 0px ${R}px ${R}px)` },
        { clipPath: `inset(0px 0px calc(100% - ${h}px) 0px round 0px)` },
      ],
      reglage(380),
    ),
  );
  a.push(
    anime(
      x.feuille,
      [{ opacity: 1 }, { opacity: 0 }],
      reglage(150, { delay: 300, easing: 'linear' }),
    ),
  );
  a.push(
    anime(
      x.voile,
      [{ opacity: 1 }, { opacity: 0 }],
      reglage(420, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }),
    ),
  );
  return fini(a);
}

const declencheurs = (ouvert: boolean) => {
  for (const d of $$('[data-recherche-ouvrir]')) d.setAttribute('aria-expanded', String(ouvert));
};

export function ouvrir(declencheur?: Element | null): void {
  const x = monter();
  if (x.dialogue.open && !fermeture) {
    x.saisie.focus();
    x.saisie.select();
    return;
  }
  if (fermeture) return;
  if (!pret)
    void prechauffer().then(() => {
      if (x.dialogue.open && (etat.q || actif < 0)) rendre();
    });
  source = declencheur?.isConnected ? declencheur : $('[data-recherche-ouvrir]');
  x.saisie.placeholder = typo(
    window.innerWidth < 560
      ? 'Rechercher sur Vysora'
      : 'Rechercher une création, un sujet, un outil…',
  );
  x.saisie.value = '';
  etat.portee = 'tout';
  etat.exact = false;
  racineDoc.classList.add('rch-ouverte');
  racineDoc.classList.toggle('rch-gouttiere', window.innerWidth > racineDoc.clientWidth);
  x.dialogue.classList.add('is-ouverture');
  x.dialogue.showModal();
  x.saisie.focus({ preventScroll: true });
  declencheurs(true);
  rendre({ neuf: true });
  animerOuverture(x);
  window.setTimeout(() => x.dialogue.classList.remove('is-ouverture'), 900);
}

function fermer({ instant = false } = {}): void {
  if (!el?.dialogue.open || fermeture) return;
  const x = el;
  racineDoc.classList.remove('rch-ouverte');
  const fin = () => {
    x.dialogue.close();
    for (const a of animationsScript(x.dialogue)) a.cancel();
    racineDoc.classList.remove('rch-gouttiere');
    declencheurs(false);
    fermeture = null;
  };
  if (instant) {
    for (const a of animationsScript(x.dialogue)) a.cancel();
    fin();
    return;
  }
  for (const a of animationsScript(x.dialogue)) a.finish();
  fermeture = animerFermeture(x).then(fin);
}

function monter(): Elements {
  if (el) return el;
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog class="recherche" aria-label="Recherche sur Vysora" data-recherche>
  <div class="rch-voile" data-rch-fermer></div>
  <div class="rch-feuille">
    <div class="rch-grille">
      <a class="rch-logo" href="${ROUTES.accueil}" aria-label="Vysora, accueil"><img src="/assets/logos/vysora%20Bleu-Black.png" alt="" width="337" height="122"></a>
      <div class="rch-champ">
        ${ic('search', 'rch-loupe')}
        <input class="rch-saisie" type="search" role="combobox" aria-expanded="true" aria-controls="rch-liste" aria-autocomplete="list" aria-label="Rechercher sur Vysora" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" maxlength="120">
        <button class="rch-effacer" type="button" aria-label="Effacer la recherche" hidden>${ic('close')}</button>
        <span class="rch-fil" aria-hidden="true"></span>
      </div>
      <button class="rch-fermer" type="button" data-rch-fermer><span class="rch-fermer-ordi">Fermer</span><span class="rch-fermer-mobile">Annuler</span><kbd aria-hidden="true">Échap</kbd></button>
      <div class="rch-filtres" role="group" aria-label="Type de résultat" hidden></div>
      <div class="rch-zone">
        <div class="rch-col">
          <div class="rch-avant"></div>
          <div class="rch-liste" id="rch-liste" role="listbox" aria-label="Suggestions"></div>
        </div>
        <div class="rch-apercu" aria-hidden="true"></div>
      </div>
      <div class="rch-pied" aria-hidden="true"><div class="rch-pied-in"><span>${touche(ic('haut'))}${touche(ic('bas'))}pour choisir</span><span>${touche(ic('entree'))}pour ouvrir</span><span>${touche('Échap')}pour fermer</span><span class="rch-total"></span></div></div>
    </div>
    <p class="sr-only" role="status" aria-live="polite"></p>
  </div>
</dialog>`,
  );
  const dialogue = $<HTMLDialogElement>('[data-recherche]');
  if (!dialogue) throw new Error('Fenêtre de recherche absente');
  const dans = <E extends Element = HTMLElement>(selecteur: string) => {
    const trouve = $<E>(selecteur, dialogue);
    if (!trouve) throw new Error(`Élément de recherche absent : ${selecteur}`);
    return trouve;
  };
  const x: Elements = {
    dialogue,
    voile: dans('.rch-voile'),
    feuille: dans('.rch-feuille'),
    champ: dans('.rch-champ'),
    loupe: dans<SVGElement>('.rch-loupe'),
    saisie: dans<HTMLInputElement>('.rch-saisie'),
    effacer: dans<HTMLButtonElement>('.rch-effacer'),
    fermer: dans<HTMLButtonElement>('.rch-fermer'),
    filtres: dans('.rch-filtres'),
    zone: dans('.rch-zone'),
    colonne: dans('.rch-col'),
    avant: dans('.rch-avant'),
    liste: dans('.rch-liste'),
    apercu: dans('.rch-apercu'),
    pied: dans('.rch-pied'),
    total: dans('.rch-total'),
    annonce: dans('[role="status"]'),
  };
  el = x;

  x.saisie.addEventListener('input', () => {
    etat.exact = false;
    rendre();
  });
  x.saisie.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      if (!elements.length) return;
      const pas = evenement.key === 'ArrowDown' ? 1 : -1;
      activer(actif < 0 ? (pas > 0 ? 0 : elements.length - 1) : actif + pas, { defiler: true });
    } else if (evenement.key === 'Enter') {
      evenement.preventDefault();
      if (evenement.isComposing) return;
      const choisi = elements[actif];
      if (choisi) choisi.click();
      else if (etat.q && pret) {
        memoriser(etat.q);
        location.href = `${ROUTES.explorer}?q=${encodeURIComponent(etat.q)}`;
      }
    } else if (
      (evenement.key === 'Delete' || (evenement.key === 'Backspace' && !x.saisie.value)) &&
      options[actif]?.kind === 'terme' &&
      options[actif]?.cle?.startsWith('recente:')
    ) {
      evenement.preventDefault();
      oublier(options[actif]?.terme ?? '');
    }
  });
  x.effacer.addEventListener('click', () => {
    x.saisie.value = '';
    rendre({ neuf: true });
    x.saisie.focus();
  });
  x.dialogue.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape') {
      evenement.preventDefault();
      evenement.stopPropagation();
      fermer();
    }
  });
  x.dialogue.addEventListener('cancel', (evenement) => {
    evenement.preventDefault();
    fermer();
  });
  x.dialogue.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    if (cible.closest('[data-rch-fermer]')) {
      fermer();
      return;
    }
    if (cible.closest('[data-rch-exact]')) {
      etat.exact = true;
      rendre({ neuf: true });
      x.saisie.focus();
    }
  });
  x.filtres.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-rch-portee]');
    if (!bouton) return;
    etat.portee = (bouton.dataset.rchPortee ?? 'tout') as IdGroupe | 'tout';
    rendre({ neuf: true });
    if (evenement.detail) x.saisie.focus();
    else $<HTMLButtonElement>(`[data-rch-portee="${etat.portee}"]`, x.filtres)?.focus();
  });
  x.filtres.addEventListener('keydown', (evenement) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(evenement.key)) return;
    const boutons = $$<HTMLButtonElement>('button', x.filtres);
    const i = boutons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    evenement.preventDefault();
    boutons[
      (i + (evenement.key === 'ArrowRight' ? 1 : -1) + boutons.length) % boutons.length
    ]?.focus();
  });
  x.liste.addEventListener('pointermove', (evenement) => {
    const option = (evenement.target as Element).closest<HTMLElement>('[role="option"]');
    if (option && Number(option.dataset.i) !== actif) activer(Number(option.dataset.i));
  });
  x.liste.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const oubli = cible.closest<HTMLElement>('[data-rch-oublier]');
    if (oubli) {
      evenement.preventDefault();
      evenement.stopPropagation();
      oublier(oubli.dataset.rchOublier ?? '');
      return;
    }
    const option = cible.closest<HTMLElement>('[role="option"]');
    if (!option) return;
    const o = options[Number(option.dataset.i)];
    if (!o) return;
    if (o.href) {
      if (etat.q) memoriser(etat.q);
      const nouvelOnglet = evenement.ctrlKey || evenement.metaKey || evenement.shiftKey;
      if (!nouvelOnglet && new URL(o.href, location.href).pathname === location.pathname)
        fermer({ instant: true });
      return;
    }
    evenement.preventDefault();
    executer(o);
  });
  window.addEventListener('pageshow', (evenement) => {
    if (evenement.persisted && x.dialogue.open) fermer({ instant: true });
  });
  window.addEventListener('resize', () => {
    if (x.dialogue.open && elements[actif]) activer(actif, { glisser: false });
  });
  etats.on(() => {
    if (x.dialogue.open) rendre();
  });
  return x;
}

export { prechauffer };
