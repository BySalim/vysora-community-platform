import { z } from 'zod';
import { reconnaitreAssistant } from './assistants-ia';
import { DELAIS } from './regles';

/* LEG-03 : choix sur les cookies et mesure d'audience de l'équipe. Au-delà des cookies
   indispensables (session, aller-retour vers GitHub ou Google, ce choix), deux finalités :
   - la mesure d'audience : pages vues, provenance, appareils et problèmes techniques, comptés de façon
     anonyme et sans cookie ; exemptée de consentement (CNIL), chacun peut s'y opposer ;
   - les parcours : les pages et les actions d'une même visite, reliées par un cookie de visite, avec
     l'accord de la personne seulement, jamais reliées à son compte.
   Le choix est retenu par le navigateur (COOKIE_CONSENTEMENT) ; le serveur du site et l'API le lisent
   avant de compter quoi que ce soit. */

/** Cookie du choix : `v=1&audience=oui&parcours=non&date=2026-11-15`, gardé 6 mois sans prolongation
    (DELAIS.choixCookiesMois). La version change quand une nouvelle finalité demande de reposer la
    question : le bandeau revient. */
export const COOKIE_CONSENTEMENT = { nom: 'vysora_consentement', version: 1 } as const;

/** Refus de la page Cookies antérieur au bandeau (LEG-02) : respecté tant qu'aucun choix ne le
    remplace, puis effacé par le site. */
export const COOKIE_REFUS_AUDIENCE = { nom: 'vysora_audience', valeur: 'refusee' } as const;

/** Cookie de la visite suivie (parcours) : identifiant tiré au hasard, effacé après
    DELAIS.inactiviteParcoursMinutes sans page vue. Préfixe __Host- en HTTPS. */
export const nomCookieParcours = (securise: boolean): string =>
  securise ? '__Host-vysora_parcours' : 'vysora_parcours';

export interface ChoixCookies {
  /** Mesure d'audience anonyme (active sans choix contraire). */
  audience: boolean;
  /** Suivi des parcours (seulement avec accord). */
  parcours: boolean;
  /** Jour du choix (AAAA-MM-JJ). */
  date: string;
  version: number;
}

/** Valeur d'un cookie dans un en-tête Cookie ; undefined s'il n'y est pas. */
export function lireCookie(
  enteteCookie: string | null | undefined,
  nom: string,
): string | undefined {
  for (const morceau of (enteteCookie ?? '').split(';')) {
    const egal = morceau.indexOf('=');
    if (egal > 0 && morceau.slice(0, egal).trim() === nom) return morceau.slice(egal + 1).trim();
  }
  return undefined;
}

/** Valeur à écrire dans COOKIE_CONSENTEMENT pour un choix de la version en cours. */
export function valeurChoixCookies(
  choix: Pick<ChoixCookies, 'audience' | 'parcours' | 'date'>,
): string {
  const oui = (valeur: boolean) => (valeur ? 'oui' : 'non');
  return `v=${COOKIE_CONSENTEMENT.version}&audience=${oui(choix.audience)}&parcours=${oui(choix.parcours)}&date=${choix.date}`;
}

/** Choix retenu par le navigateur ; null s'il n'y en a pas ou s'il est illisible. */
export function lireChoixCookies(enteteCookie: string | null | undefined): ChoixCookies | null {
  const valeur = lireCookie(enteteCookie, COOKIE_CONSENTEMENT.nom);
  if (!valeur) return null;
  let parametres: URLSearchParams;
  try {
    parametres = new URLSearchParams(decodeURIComponent(valeur));
  } catch {
    return null;
  }
  const version = Number(parametres.get('v'));
  const audience = parametres.get('audience');
  const parcours = parametres.get('parcours');
  const date = parametres.get('date') ?? '';
  const ouiNon = (v: string | null) => v === 'oui' || v === 'non';
  if (!Number.isInteger(version) || version < 1 || !ouiNon(audience) || !ouiNon(parcours))
    return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { version, audience: audience === 'oui', parcours: parcours === 'oui', date };
}

/** Le bandeau se montre tant qu'aucun choix de la version en cours n'est retenu. */
export const choixCookiesAttendu = (enteteCookie: string | null | undefined): boolean =>
  (lireChoixCookies(enteteCookie)?.version ?? 0) < COOKIE_CONSENTEMENT.version;

/** La personne refuse-t-elle la mesure d'audience ? Son choix, sinon l'ancien refus de la page
    Cookies ; sans l'un ni l'autre, la mesure anonyme s'applique. */
export function audienceRefusee(enteteCookie: string | null | undefined): boolean {
  const choix = lireChoixCookies(enteteCookie);
  if (choix) return !choix.audience;
  return lireCookie(enteteCookie, COOKIE_REFUS_AUDIENCE.nom) === COOKIE_REFUS_AUDIENCE.valeur;
}

/** La personne a-t-elle accepté le suivi des parcours, dans la version en cours du choix ? */
export function parcoursAccepte(enteteCookie: string | null | undefined): boolean {
  const choix = lireChoixCookies(enteteCookie);
  return choix?.version === COOKIE_CONSENTEMENT.version && choix.parcours;
}

/* Appareils ------------------------------------------------------------------------------------ */

export const APPAREILS = ['ORDINATEUR', 'MOBILE', 'TABLETTE'] as const;
export type Appareil = (typeof APPAREILS)[number];
export const NAVIGATEURS = [
  'CHROME',
  'SAFARI',
  'FIREFOX',
  'EDGE',
  'OPERA',
  'SAMSUNG',
  'AUTRE',
] as const;
export type Navigateur = (typeof NAVIGATEURS)[number];
export const SYSTEMES = [
  'WINDOWS',
  'MACOS',
  'IOS',
  'ANDROID',
  'LINUX',
  'CHROMEOS',
  'AUTRE',
] as const;
export type Systeme = (typeof SYSTEMES)[number];

export const LIBELLES_APPAREIL: Record<Appareil, string> = {
  ORDINATEUR: 'Ordinateur',
  MOBILE: 'Mobile',
  TABLETTE: 'Tablette',
};
export const LIBELLES_NAVIGATEUR: Record<Navigateur, string> = {
  CHROME: 'Chrome',
  SAFARI: 'Safari',
  FIREFOX: 'Firefox',
  EDGE: 'Edge',
  OPERA: 'Opera',
  SAMSUNG: 'Samsung Internet',
  AUTRE: 'Autres navigateurs',
};
export const LIBELLES_SYSTEME: Record<Systeme, string> = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  IOS: 'iOS et iPadOS',
  ANDROID: 'Android',
  LINUX: 'Linux',
  CHROMEOS: 'ChromeOS',
  AUTRE: 'Autres systèmes',
};

export interface DescriptionAppareil {
  appareil: Appareil;
  navigateur: Navigateur;
  systeme: Systeme;
}

/** Catégories larges lues dans le nom du navigateur (User-Agent) ; rien d'autre n'en est gardé. */
export function decrireAppareil(userAgent: string | null | undefined): DescriptionAppareil {
  const ua = userAgent ?? '';
  const systeme: Systeme = /Windows NT/i.test(ua)
    ? 'WINDOWS'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'IOS'
      : /Android/i.test(ua)
        ? 'ANDROID'
        : /CrOS/.test(ua)
          ? 'CHROMEOS'
          : /Macintosh|Mac OS X/i.test(ua)
            ? 'MACOS'
            : /Linux|X11/i.test(ua)
              ? 'LINUX'
              : 'AUTRE';
  const appareil: Appareil =
    /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
      ? 'TABLETTE'
      : /Mobi|iPhone|iPod/i.test(ua)
        ? 'MOBILE'
        : 'ORDINATEUR';
  const navigateur: Navigateur = /Edg(?:e|A|iOS)?\//.test(ua)
    ? 'EDGE'
    : /OPR\/|Opera/.test(ua)
      ? 'OPERA'
      : /SamsungBrowser\//.test(ua)
        ? 'SAMSUNG'
        : /Firefox\/|FxiOS\//.test(ua)
          ? 'FIREFOX'
          : /Chrome\/|CriOS\/|Chromium\//.test(ua)
            ? 'CHROME'
            : /Version\/[\d.]+.*Safari\//.test(ua)
              ? 'SAFARI'
              : 'AUTRE';
  return { appareil, navigateur, systeme };
}

/** Robots, aperçus de liens et programmes : ils ne sont pas des visiteurs (les assistants d'IA sont
    comptés à part, REF-03). Un navigateur sans nom est un programme. */
const ROBOTS =
  /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl\/|wget\/|python|httpclient|java\/|go-http|node-fetch|undici|axios|okhttp|monitor|uptime|scan/i;

export function estRobot(userAgent: string | null | undefined): boolean {
  if (!userAgent?.trim()) return true;
  if (ROBOTS.test(userAgent)) return true;
  const assistant = reconnaitreAssistant({ userAgent });
  return assistant !== null && assistant.nature !== 'VISITE';
}

/* Provenance ----------------------------------------------------------------------------------- */

/** Visite sans page de provenance : adresse tapée, favori, application. */
export const PROVENANCE_DIRECTE = '(direct)';
/** Visite suivie à partir d'une page ouverte depuis le site (accord donné en cours de visite). */
export const PROVENANCE_SITE = '(site)';

/** Libellé d'une provenance pour l'écran de l'administration. */
export const libelleProvenance = (valeur: string): string =>
  valeur === PROVENANCE_DIRECTE
    ? 'Accès direct'
    : valeur === PROVENANCE_SITE
      ? 'Déjà sur le site'
      : valeur;

/** D'où arrive une visite : utm_source s'il est donné, sinon le domaine de la page de provenance
    (sans « www. ») ou PROVENANCE_DIRECTE ; null pour une page ouverte depuis une autre page du site
    (ce n'est pas une arrivée). Rien d'autre que le domaine n'est gardé. */
export function provenance(
  referent: string | null | undefined,
  utmSource: string | null | undefined,
  hoteSite: string,
): string | null {
  let hote: string | null = null;
  if (referent) {
    try {
      hote = new URL(referent).hostname.toLowerCase();
    } catch {
      hote = null;
    }
  }
  const site = hoteSite.toLowerCase();
  if (hote && hote === site) return null;
  const source = utmSource?.trim().toLowerCase() ?? '';
  if (/^[a-z0-9][a-z0-9._-]{0,59}$/.test(source)) return source;
  if (!hote) return PROVENANCE_DIRECTE;
  return hote.replace(/^(?:www|m|l|lm)\./, '').slice(0, 100);
}

/* Événements des parcours ---------------------------------------------------------------------- */

/** Actions relevées dans une visite suivie : par l'API (réussite de l'action) ou par le navigateur
    (recherche, sans les mots cherchés). */
export const EVENEMENTS_PARCOURS = [
  'INSCRIPTION',
  'CONNEXION',
  'CREATION_PUBLIEE',
  'SUJET_PUBLIE',
  'REPONSE_PUBLIEE',
  'COMMENTAIRE_PUBLIE',
  'ESSAI_DECLARE',
  'VOTE',
  'MESSAGE_CONTACT',
  'RECHERCHE',
] as const;
export type EvenementParcours = (typeof EVENEMENTS_PARCOURS)[number];

export const LIBELLES_EVENEMENT_PARCOURS: Record<EvenementParcours, string> = {
  INSCRIPTION: 'Inscription',
  CONNEXION: 'Connexion',
  CREATION_PUBLIEE: 'Création publiée',
  SUJET_PUBLIE: 'Sujet ouvert au forum',
  REPONSE_PUBLIEE: 'Réponse au forum',
  COMMENTAIRE_PUBLIE: 'Commentaire',
  ESSAI_DECLARE: 'Essai déclaré',
  VOTE: 'Vote',
  MESSAGE_CONTACT: 'Message à l’équipe',
  RECHERCHE: 'Recherche',
};

/** Étapes d'une visite suivie : une page servie, une action réussie, une erreur rencontrée. */
export const NATURES_ETAPE = ['PAGE', 'EVENEMENT', 'ERREUR'] as const;
export type NatureEtape = (typeof NATURES_ETAPE)[number];

/** Compteurs de la mesure anonyme, par jour :
    - PAGE (page) : pages vues ; VISITEURS : visiteurs différents du jour ;
    - PROVENANCE (domaine) : arrivées sur le site ; APPAREIL, NAVIGATEUR, SYSTEME : visiteurs du jour ;
    - INTROUVABLE, ERREUR_PAGE (page) : pages servies en 404 et en 500 ;
    - ERREUR_API (route) : erreurs internes de l'API ; ERREUR_NAVIGATEUR (page, message) : erreurs des
      scripts du site dans le navigateur. */
export const MESURES_AUDIENCE = [
  'PAGE',
  'VISITEURS',
  'PROVENANCE',
  'APPAREIL',
  'NAVIGATEUR',
  'SYSTEME',
  'INTROUVABLE',
  'ERREUR_PAGE',
  'ERREUR_API',
  'ERREUR_NAVIGATEUR',
] as const;
export type MesureAudience = (typeof MESURES_AUDIENCE)[number];

/** Page servie hors du site mesuré, ou adresse illisible (404 des robots qui sondent le site). */
export const PAGE_AUTRE = '(autre)';
export const LONGUEUR_MESSAGE_ERREUR = 160;

/** Message d'erreur d'un script réduit à ce qui aide à corriger : adresses sans paramètres, nombres
    longs (identifiants) masqués, espaces resserrés, 160 caractères au plus. */
export function messageErreurNavigateur(message: string): string {
  return message
    .replace(/(https?:\/\/[^\s?#'")]+)[^\s'")]*/g, '$1')
    .replace(/\d{6,}/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_MESSAGE_ERREUR);
}

/* Saisies et contrats -------------------------------------------------------------------------- */

/** Pages servies que le serveur du site signale : réussies, introuvables, en erreur. */
export const STATUTS_PAGE_MESURES = [200, 404, 500] as const;

/** POST /api/v1/audience/pages : page servie par le site (adresse demandée, statut, provenance,
    navigateur, visite suivie le cas échéant). Le cookie de la personne est transmis avec. */
export const schemaPageServie = z.object({
  adresse: z.string().min(1).max(500),
  statut: z.union([z.literal(200), z.literal(404), z.literal(500)]),
  userAgent: z.string().max(500).nullish(),
  referent: z.string().max(500).nullish(),
  parcours: z.uuid().nullish(),
});
export type SaisiePageServie = z.output<typeof schemaPageServie>;

/** POST /api/v1/audience/evenements : erreur d'un script ou recherche, relevée par le navigateur. */
export const schemaEvenementNavigateur = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ERREUR'),
    page: z.string().min(1).max(500),
    message: z.string().min(1).max(1000),
  }),
  z.object({ type: z.literal('RECHERCHE'), page: z.string().min(1).max(500) }),
]);
export type SaisieEvenementNavigateur = z.output<typeof schemaEvenementNavigateur>;

export interface LigneMesureAudience {
  valeur: string;
  nombre: number;
}

export interface EtapeVisiteApi {
  nature: NatureEtape;
  /** Page (PAGE), événement (EVENEMENT) ou route de l'API ou page (ERREUR). */
  valeur: string;
  /** ERREUR : code de l'erreur ou message du script. */
  detail: string;
  /** Secondes écoulées depuis le début de la visite. */
  secondes: number;
}

export interface VisiteSuivieApi {
  debut: string;
  provenance: string;
  appareil: Appareil;
  navigateur: Navigateur;
  systeme: Systeme;
  etapes: EtapeVisiteApi[];
}

export interface MesureAudienceApi {
  jours: number;
  /** Premier et dernier jour compris (UTC, AAAA-MM-JJ). */
  du: string;
  au: string;
  chiffres: {
    /** Visiteurs différents de chaque jour, additionnés sur la période. */
    visiteurs: number;
    /** Arrivées sur le site (depuis un autre site, un lien direct ou une campagne). */
    visites: number;
    pagesVues: number;
    /** Pages introuvables, pages en erreur, erreurs de l'API et des scripts. */
    problemes: number;
  };
  /** Un point par jour de la période, jours sans visite compris. */
  parJour: { jour: string; visiteurs: number; pagesVues: number }[];
  pages: LigneMesureAudience[];
  provenances: LigneMesureAudience[];
  appareils: { code: Appareil; nombre: number }[];
  navigateurs: { code: Navigateur; nombre: number }[];
  systemes: { code: Systeme; nombre: number }[];
  problemes: {
    introuvables: LigneMesureAudience[];
    erreursPages: LigneMesureAudience[];
    erreursApi: LigneMesureAudience[];
    erreursNavigateur: { page: string; message: string; nombre: number }[];
  };
  parcours: {
    /** Visites suivies (personnes qui l'ont accepté) commencées pendant la période. */
    visites: number;
    pagesParVisite: number;
    dureeMedianeSecondes: number;
    entrees: LigneMesureAudience[];
    sorties: LigneMesureAudience[];
    enchainements: { de: string; vers: string; nombre: number }[];
    /** Visites où chaque action a eu lieu au moins une fois. */
    evenements: { code: EvenementParcours; visites: number }[];
    inscription: { visitesPageInscription: number; visitesInscrites: number };
    /** Dernières visites qui ont rencontré une erreur, avec leurs étapes. */
    avecErreur: VisiteSuivieApi[];
  };
}

/** Repères affichés par l'écran de l'administration. */
export const AUDIENCE = {
  pagesAffichees: 20,
  provenancesAffichees: 12,
  problemesAffiches: 10,
  enchainementsAffiches: 12,
  visitesAvecErreurAffichees: 10,
  /** Au-delà, une visite n'enregistre plus d'étape (protection contre les signalements en boucle). */
  etapesParVisiteMax: 300,
  inactiviteParcoursMinutes: DELAIS.inactiviteParcoursMinutes,
} as const;
