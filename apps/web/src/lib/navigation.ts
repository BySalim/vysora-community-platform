/* Routes du site et menus communs. Les pages du prototype (fichiers .html) deviennent les routes
   du plan du site (docs/produit/07-sitemap-mvp.md) ; la correspondance est tenue dans docs/portage-prototype.md. */

export const ROUTES = {
  accueil: '/',
  explorer: '/explorer',
  forum: '/forum',
  clinique: '/forum?type=clinique',
  apprendre: '/apprendre',
  bonReflexe: '/apprendre?rubrique=bon-reflexe',
  classements: '/classements',
  defis: '/defis',
  publier: '/creations/nouvelle',
  connexion: '/connexion',
  inscription: '/inscription',
  notifications: '/notifications',
  mesContenus: '/mes-contenus',
  parametres: '/parametres',
  moderation: '/moderation/signalements',
  administration: '/admin/referentiels',
  cgu: '/cgu',
  confidentialite: '/confidentialite',
  cookies: '/cookies',
  charte: '/charte-communautaire',
  mentionsLegales: '/mentions-legales',
  contact: '/contact',
  profil: (pseudo: string) => `/membres/${encodeURIComponent(pseudo)}`,
} as const;

export interface EntreeMenu {
  href: string;
  libelle: string;
  /** Vrai si la page courante appartient à cette rubrique (aria-current="page"). */
  actif: (chemin: string) => boolean;
}

const sous =
  (...prefixes: string[]) =>
  (chemin: string) =>
    prefixes.some((p) => chemin === p || chemin.startsWith(`${p}/`));

/** Menu principal, identique sur toutes les pages, ordinateur et mobile (prototype/commun.js, NAVIGATION). */
export const NAVIGATION: EntreeMenu[] = [
  {
    href: ROUTES.explorer,
    libelle: 'Explorer',
    actif: (chemin) =>
      sous('/explorer', '/categories', '/etiquettes')(chemin) ||
      (chemin.startsWith('/creations/') && !chemin.startsWith(ROUTES.publier)),
  },
  { href: ROUTES.forum, libelle: 'Forum', actif: sous('/forum') },
  { href: ROUTES.apprendre, libelle: 'Apprendre', actif: sous('/apprendre', '/bon-reflexe') },
  { href: ROUTES.classements, libelle: 'Classements', actif: sous('/classements') },
  { href: ROUTES.defis, libelle: 'Défis', actif: sous('/defis') },
];

/** Adresse de retour transmise à la connexion et à l'inscription (?retour=…). */
export const adresseRetour = (url: URL): string =>
  encodeURIComponent(`${url.pathname}${url.search}`);
