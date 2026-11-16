import {
  DELAIS,
  STATUTS_PAGE_MESURES,
  audienceRefusee,
  estRobot,
  lireCookie,
  nomCookieParcours,
  parcoursAccepte,
} from '@vysora/shared';
import { appelerApi } from './api';

/* LEG-03 : mesure d'audience, côté serveur du site. Chaque page servie (réussie, introuvable ou en
   erreur) est signalée à l'API sans attendre sa réponse ni retarder la page ; l'API relit le choix de
   la personne dans ses cookies et décide de ce qui se compte. Aucun script de mesure dans la page. */

const SECURISE = import.meta.env.PROD;
const NOM_PARCOURS = nomCookieParcours(SECURISE);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DUREE_VISITE = DELAIS.inactiviteParcoursMinutes * 60;

export interface VisiteSuivie {
  /** Identifiant de la visite suivie, null si la personne n'a pas accepté le suivi des parcours. */
  id: string | null;
  /** En-tête Set-Cookie à renvoyer : visite prolongée, commencée, ou cookie effacé après un retrait. */
  cookie: string | null;
}

/** Visite suivie pour cette page : le cookie de visite est repris (et prolongé de 30 minutes) ou
    créé si la personne a accepté le suivi des parcours ; il est effacé si elle l'a retiré. */
export function preparerParcours(requete: Request): VisiteSuivie {
  const entete = requete.headers.get('cookie');
  const actuel = lireCookie(entete, NOM_PARCOURS);
  const attributs = `Path=/; HttpOnly; SameSite=Lax${SECURISE ? '; Secure' : ''}`;
  if (!parcoursAccepte(entete) || estRobot(requete.headers.get('user-agent')))
    return {
      id: null,
      cookie: actuel === undefined ? null : `${NOM_PARCOURS}=; Max-Age=0; ${attributs}`,
    };
  const id = actuel && UUID.test(actuel) ? actuel : crypto.randomUUID();
  return { id, cookie: `${NOM_PARCOURS}=${id}; Max-Age=${DUREE_VISITE}; ${attributs}` };
}

/** Ni une page ouverte par la personne : préchargement (la page n'est peut-être jamais affichée),
    icône demandée d'office (/favicon.ico), aperçu dans un cadre de l'éditeur. */
const pasUneNavigation = (requete: Request) => {
  const destination = requete.headers.get('sec-fetch-dest');
  if (destination && destination !== 'document') return true;
  return /prefetch|prerender/i.test(
    `${requete.headers.get('sec-purpose') ?? ''} ${requete.headers.get('purpose') ?? ''}`,
  );
};

/** Statuts signalés à l'API. */
export const statutMesure = (statut: number): statut is (typeof STATUTS_PAGE_MESURES)[number] =>
  (STATUTS_PAGE_MESURES as readonly number[]).includes(statut);

/** Signale une page servie à l'API (sans attendre). Rien ne part pour un robot, ce qui n'est pas une
    navigation ou une personne qui refuse la mesure sans avoir accepté le suivi des parcours. */
export function signalerPage(
  requete: Request,
  url: URL,
  statut: number,
  options: { adresseClient?: string; visite: string | null },
): void {
  if (requete.method !== 'GET' || !statutMesure(statut)) return;
  const userAgent = requete.headers.get('user-agent');
  if (estRobot(userAgent) || pasUneNavigation(requete)) return;
  if (audienceRefusee(requete.headers.get('cookie')) && !options.visite) return;
  appelerApi('/api/v1/audience/pages', {
    requete,
    adresseClient: options.adresseClient,
    corps: {
      adresse: url.pathname + url.search,
      statut,
      userAgent,
      referent: requete.headers.get('referer'),
      parcours: options.visite,
    },
    signal: AbortSignal.timeout(3000),
  }).catch((erreur: unknown) =>
    console.error('Page non comptée dans la mesure d’audience :', erreur),
  );
}
