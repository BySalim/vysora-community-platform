/* Contexte d'arrivée sur la connexion et l'inscription (prototype/auth.js, `contexte`) :
   « retour » désigne la page d'origine, « pour » l'action réservée qui a mené ici (« enregistrer
   cette création »). Seule une adresse interne au site est acceptée comme retour : jamais de
   redirection vers un autre site. */

/** Libellé du lien de retour selon la page d'origine (prototype/auth-data.js, `pages`). */
const PAGES: [prefixe: string, libelle: string][] = [
  ['/creations/nouvelle', 'Retour à l’éditeur'],
  ['/creations/', 'Retour à la création'],
  ['/explorer', 'Retour à Explorer'],
  ['/categories/', 'Retour à la catégorie'],
  ['/forum', 'Retour au forum'],
  ['/apprendre', 'Retour à Apprendre'],
  ['/bon-reflexe', 'Retour à Bon réflexe'],
  ['/classements', 'Retour aux classements'],
  ['/defis', 'Retour aux défis'],
  ['/moderation', 'Retour à la modération'],
  ['/admin', 'Retour à l’administration'],
];
const RETOUR_ACCUEIL = 'Retour à l’accueil';
const RETOUR_AUTRE = 'Retour à la page précédente';

/** Pages vers lesquelles le retour n'a pas de sens. */
const EXCLUES = ['/connexion', '/inscription', '/api'];

/** Icône associée à l'action demandée (prototype/auth-data.js, `actions`). */
const ACTIONS: [motif: RegExp, icone: string][] = [
  [/enregistrer vos réponses|progression/, 'bulb'],
  [/enregistrer|retrouver/, 'bookmark'],
  [/essai|reproduction/, 'repeat'],
  [/vot|utile|fonctionne|cherchez/i, 'utile'],
  [/défi/, 'trophy'],
  [/publier une création/, 'layers'],
  [/question/, 'message'],
  [/répondre/, 'message'],
  [/commenter/, 'message'],
  [/suivre/, 'bell'],
  [/signaler/, 'flag'],
];

export interface ContexteArrivee {
  /** Une page d'origine et une action : « Pour enregistrer cette création », « Reprendre où vous en étiez ». */
  actif: boolean;
  pour: string;
  icone: string;
  /** Page où revenir une fois connecté (chemin interne), sinon l'accueil. */
  destination: string;
  libelleRetour: string;
  /** Paramètres à transmettre entre la connexion et l'inscription (« retour=…&pour=… »), ou vide. */
  requete: string;
}

/** Chemin interne sûr (« /forum?type=question ») ou null. */
export function cheminInterne(brut: string | null | undefined): string | null {
  if (!brut || !brut.startsWith('/') || brut.startsWith('//') || brut.startsWith('/\\'))
    return null;
  try {
    const base = 'https://vysora.invalid';
    const url = new URL(brut, base);
    if (url.origin !== base) return null;
    if (EXCLUES.some((exclue) => url.pathname === exclue || url.pathname.startsWith(`${exclue}/`)))
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function libelleDe(chemin: string | null): string {
  if (!chemin) return RETOUR_ACCUEIL;
  const pathname = chemin.split(/[?#]/)[0] ?? '/';
  if (pathname === '/') return RETOUR_ACCUEIL;
  return PAGES.find(([prefixe]) => pathname.startsWith(prefixe))?.[1] ?? RETOUR_AUTRE;
}

export function contexteArrivee(parametres: URLSearchParams): ContexteArrivee {
  const pour = (parametres.get('pour') ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
  const cible = cheminInterne(parametres.get('retour'));
  const icone = ACTIONS.find(([motif]) => motif.test(pour))?.[1] ?? 'arrow';
  const requete = cible
    ? `retour=${encodeURIComponent(cible)}${pour ? `&pour=${encodeURIComponent(pour)}` : ''}`
    : '';
  return {
    actif: Boolean(cible && pour),
    pour,
    icone,
    destination: cible ?? '/',
    libelleRetour: libelleDe(cible),
    requete,
  };
}
