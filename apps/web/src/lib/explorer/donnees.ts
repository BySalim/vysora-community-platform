import type {
  DomaineApi,
  FamilleOutil,
  GuideApi,
  GuidesApi,
  OutilResumeApi,
  RechercheCreationsApi,
} from '@vysora/shared';
import { plier } from './recherche';
import { TRIS, type Tri } from './index-guides';

/* Données que la page Explorer pose pour son script (prototype : explorer-data.js, remplacé par l'API). */

/** Outil du référentiel pour « Mes outils » : présentation et famille. */
export interface OutilExplorer extends OutilResumeApi {
  famille: FamilleOutil;
}

export interface DonneesExplorer {
  index: GuidesApi | null;
  /** Guide demandé par l'adresse (?guide=), lu par le serveur. */
  guide: GuideApi | null;
  outils: OutilExplorer[];
  /** Parcours qui correspondent à la recherche de l'adresse (?q=). */
  recherche: RechercheCreationsApi['elements'];
  maintenant: string;
}

/** État de l'adresse (prototype : readURL). */
export interface AdresseExplorer {
  guide: string | null;
  q: string;
  /** Adresse du domaine choisi, ou vide. */
  domaine: string;
  tri: Tri;
}

/** Domaine désigné par son adresse ou par son libellé (prototype : findDomain). */
export function domaineDe(valeur: string, domaines: DomaineApi[]): DomaineApi | undefined {
  const plie = plier(valeur).trim();
  if (!plie) return undefined;
  return domaines.find((d) => d.slug === valeur || plier(d.libelle).trim() === plie);
}

export function lireAdresse(parametres: URLSearchParams, domaines: DomaineApi[]): AdresseExplorer {
  const tri = parametres.get('tri') as Tri | null;
  return {
    guide: parametres.get('guide')?.trim() || null,
    q: (parametres.get('q') ?? '').trim().slice(0, 200),
    domaine:
      domaineDe(parametres.get('categorie') ?? parametres.get('domaine') ?? '', domaines)?.slug ??
      '',
    tri: tri && TRIS.includes(tri) ? tri : 'actifs',
  };
}

/** Paramètres de l'adresse d'un état (prototype : writeURL). */
export function ecrireAdresse(a: AdresseExplorer): string {
  const p = new URLSearchParams();
  if (a.guide) p.set('guide', a.guide);
  else {
    if (a.q) p.set('q', a.q);
    if (a.domaine) p.set('categorie', a.domaine);
    if (a.tri !== 'actifs') p.set('tri', a.tri);
  }
  const chaine = p.toString();
  return chaine ? `?${chaine}` : '';
}
