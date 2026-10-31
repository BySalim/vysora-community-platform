import {
  SEUILS,
  type DomaineApi,
  type EtapeGuideResumeApi,
  type MediaApi,
  type ModeleGuideApi,
  type OutilResumeApi,
  type ResultatReproduction,
  type TypeCreation,
} from '@vysora/shared';

/* Chiffres d'un guide d'Explorer (DEC-01), calculés sur ses parcours publiés et visibles (RG-30),
   comme explorer-modele.js les tirait de ses données : reproductions et réussite (RG-43), activité de
   la semaine (RG-32), modèles employés et reproduits, obsolescence (RG-44), guides proches. Fonctions
   pures : la lecture en base est dans donnees-guides.ts. */

/** Outil et modèle d'une configuration ou d'une reproduction. */
export interface OutilModeleLu {
  outil: OutilResumeApi;
  /** Modèle du référentiel : nom complet (« Claude Sonnet 4.5 ») et nom court (« Sonnet 4.5 »). */
  modeleId: number | null;
  modeleNom: string | null;
  modeleCourt: string | null;
  /** Modèle saisi en texte libre (RG-14). */
  modeleTexte: string | null;
}

export interface ReproductionLue extends OutilModeleLu {
  date: Date;
  resultat: ResultatReproduction;
}

/** Parcours d'un guide, publié et visible. */
export interface ParcoursLu {
  id: number;
  slug: string | null;
  type: TypeCreation;
  titre: string;
  objectif: string;
  categorie: { libelle: string; slug: string } | null;
  auteurId: number;
  datePublication: Date;
  utiles: number;
  /** Votes « Utile » des 7 derniers jours (RG-32). */
  utilesSemaine: number;
  /** Configurations du parcours, dans son ordre. */
  configurations: OutilModeleLu[];
  /** Reproductions visibles, de la plus récente à la plus ancienne. */
  reproductions: ReproductionLue[];
  /** RG-44 : modèle signalé par le plus de membres, à partir du seuil. */
  obsolescence: { modele: string; membres: number } | null;
  etiquettes: string[];
  couverture: MediaApi | null;
  /** Début du premier prompt écrit (comparaison des parcours). */
  prompt: string | null;
}

export interface EtapeLue {
  id: number;
  titre: string;
  conseil: string;
  /** Parcours qui suivent l'étape, visibles ou non (filtrés au calcul). */
  sources: number[];
  citation: { creationId: number; texte: string } | null;
}

export interface PiegeLu {
  id: number;
  ordre: number;
  titre: string;
  solution: string;
  etapeId: number | null;
  sujetId: number | null;
  casId: number | null;
  sources: number[];
}

export interface GuideLu {
  id: number;
  slug: string;
  titre: string;
  titreCourt: string;
  motsCles: string[];
  lacunes: string[];
  domaine: DomaineApi;
  /** Parcours publiés et visibles, dans l'ordre du guide. */
  parcours: number[];
  sujets: number[];
  cas: number[];
  etapes: EtapeLue[];
  pieges: PiegeLu[];
}

/** Nom complet d'un modèle (prototype : fullModel) : celui du référentiel, sinon l'outil suivi du
    texte saisi, sinon l'outil seul. */
export function cleModele(m: OutilModeleLu): string {
  if (m.modeleNom) return m.modeleNom;
  if (m.modeleTexte) return `${m.outil.nom} ${m.modeleTexte}`;
  return m.outil.nom;
}

const groupeModele = (m: OutilModeleLu): string =>
  `${m.outil.id}\u0000${m.modeleId ?? `texte:${(m.modeleTexte ?? '').toLowerCase()}`}`;

const reussies = (p: ParcoursLu) => p.reproductions.filter((r) => r.resultat === 'SUCCES');
const plusRecente = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a > b ? a : b);

/** RG-43 : pourcentage arrondi, à partir de 3 reproductions ; null en dessous. */
export const tauxDeReussite = (total: number, succes: number): number | null =>
  total >= SEUILS.reproductionsPourTauxDeSucces ? Math.round((succes / total) * 100) : null;

/** Dernière reproduction réussie d'un parcours (prototype : c.last). */
export function derniereReussite(p: ParcoursLu): { date: Date; modele: string } | null {
  const r = reussies(p)[0];
  return r ? { date: r.date, modele: cleModele(r) } : null;
}

/** Parcours d'un guide, dans son ordre (seuls les parcours lus, publiés et visibles). */
export const parcoursDu = (guide: GuideLu, parcours: Map<number, ParcoursLu>): ParcoursLu[] =>
  guide.parcours.flatMap((id) => parcours.get(id) ?? []);

/** Pièges d'un guide, du plus rencontré au moins rencontré (prototype : tri par sources), sources
    réduites aux parcours visibles. */
export function piegesDu(guide: GuideLu, visibles: Set<number>): PiegeLu[] {
  return guide.pieges
    .map((p) => ({ ...p, sources: p.sources.filter((id) => visibles.has(id)) }))
    .toSorted((a, b) => b.sources.length - a.sources.length || a.ordre - b.ordre);
}

/** « Ce qui a été testé, outil par outil » : modèles employés par les auteurs et modèles avec
    lesquels un membre a reproduit un parcours avec succès, des plus reproduits aux moins reproduits. */
export function modelesDu(parcours: ParcoursLu[]): ModeleGuideApi[] {
  const groupes = new Map<
    string,
    ModeleGuideApi & { employes: Set<number>; reproduits: Set<number> }
  >();
  const groupe = (m: OutilModeleLu) => {
    const cle = groupeModele(m);
    let g = groupes.get(cle);
    if (!g) {
      g = {
        cle: cleModele(m),
        outil: m.outil,
        employe: [],
        reproduit: [],
        derniere: null,
        employes: new Set(),
        reproduits: new Set(),
      };
      groupes.set(cle, g);
    }
    return g;
  };
  for (const p of parcours) {
    for (const c of p.configurations) groupe(c).employes.add(p.id);
    for (const r of reussies(p)) {
      const g = groupe(r);
      g.reproduits.add(p.id);
      const date = r.date.toISOString();
      if (!g.derniere || date > g.derniere) g.derniere = date;
    }
  }
  return [...groupes.values()]
    .map(({ employes, reproduits, ...g }) => ({
      ...g,
      employe: parcours.filter((p) => employes.has(p.id)).map((p) => p.id),
      reproduit: parcours.filter((p) => reproduits.has(p.id)).map((p) => p.id),
    }))
    .toSorted(
      (a, b) =>
        b.reproduit.length - a.reproduit.length ||
        b.employe.length - a.employe.length ||
        a.cle.localeCompare(b.cle, 'fr'),
    );
}

export interface ChiffresGuide {
  parcours: ParcoursLu[];
  reproductions: number;
  reussies: number;
  tauxReussite: number | null;
  activite: number;
  recent: Date | null;
  miseAJour: Date | null;
  derniereReussite: { date: Date; modele: string } | null;
  auteurs: number[];
  etapes: EtapeGuideResumeApi[];
  pieges: PiegeLu[];
  obsolescence: { parcours: number; modele: string } | null;
  modeles: ModeleGuideApi[];
  domaines: string[];
}

/** Chiffres d'un guide (prototype : explorer-modele.js, `guides`). */
export function chiffresDu(guide: GuideLu, tous: Map<number, ParcoursLu>): ChiffresGuide {
  const parcours = parcoursDu(guide, tous);
  const visibles = new Set(parcours.map((p) => p.id));
  // Un projet se consulte, il ne se reproduit pas : ses éventuelles reproductions ne comptent pas.
  const reproductibles = parcours.filter((p) => p.type !== 'PROJET');
  const reproductions = reproductibles.reduce((n, p) => n + p.reproductions.length, 0);
  const nbReussies = reproductibles.reduce((n, p) => n + reussies(p).length, 0);
  let derniere: { date: Date; modele: string } | null = null;
  for (const p of parcours) {
    const d = derniereReussite(p);
    if (d && (!derniere || d.date > derniere.date)) derniere = d;
  }
  const recent = parcours.reduce<Date | null>((r, p) => plusRecente(r, p.datePublication), null);
  const pieges = piegesDu(guide, visibles);
  const obsoletes = parcours.filter((p) => p.obsolescence);
  return {
    parcours,
    reproductions,
    reussies: nbReussies,
    tauxReussite: tauxDeReussite(reproductions, nbReussies),
    activite: parcours.reduce((n, p) => n + p.utilesSemaine, 0),
    recent,
    miseAJour: plusRecente(recent, derniere?.date ?? null),
    derniereReussite: derniere,
    auteurs: [...new Set(parcours.map((p) => p.auteurId))],
    etapes: guide.etapes.map((e) => ({
      id: e.id,
      titre: e.titre,
      suivie: e.sources.filter((id) => visibles.has(id)).length,
      piege: pieges.some((p) => p.etapeId === e.id),
    })),
    pieges,
    obsolescence: obsoletes[0]?.obsolescence
      ? { parcours: obsoletes.length, modele: obsoletes[0].obsolescence.modele }
      : null,
    modeles: modelesDu(parcours),
    domaines: [
      ...new Set([guide.domaine.slug, ...parcours.flatMap((p) => p.categorie?.slug ?? [])]),
    ],
  };
}

/** Mots où chercher un objectif (prototype : searchText) : titres, domaine, mots-clés, étapes,
    pièges, et pour chaque parcours son titre, ses étiquettes et ses outils. */
export function texteRecherche(guide: GuideLu, chiffres: ChiffresGuide): string {
  return [
    guide.titre,
    guide.titreCourt,
    guide.domaine.libelle,
    ...guide.motsCles,
    ...guide.etapes.map((e) => e.titre),
    ...guide.pieges.map((p) => p.titre),
    ...chiffres.parcours.flatMap((p) => [
      p.titre,
      ...p.etiquettes,
      ...new Set(p.configurations.map((c) => c.outil.nom)),
    ]),
  ].join(' ');
}

/** Domaines voisins (prototype : NEAR) : mêmes savoir-faire, mêmes outils. */
const VOISINAGES: readonly string[][] = [
  ['image-et-illustration', 'identite-visuelle', 'video'],
  ['application-web', 'code-et-scripts', 'automatisation'],
  ['automatisation', 'analyse-de-donnees'],
  ['texte-et-redaction', 'education', 'automatisation'],
  ['video', 'musique-et-son'],
];
const voisins = (a: string, b: string) =>
  VOISINAGES.some((groupe) => groupe.includes(a) && groupe.includes(b));

/** Domaines voisins d'un domaine (prototype : nearDomains), puis les plus fournis, trois au plus. */
export function domainesVoisins(slug: string, parcours: Map<string, number>, nombre = 3): string[] {
  const proches = [...new Set(VOISINAGES.filter((g) => g.includes(slug)).flat())].filter(
    (autre) => autre !== slug && parcours.has(autre),
  );
  const autres = [...parcours.keys()]
    .filter((autre) => autre !== slug && !proches.includes(autre))
    .toSorted((a, b) => (parcours.get(b) ?? 0) - (parcours.get(a) ?? 0));
  return [...proches, ...autres].slice(0, nombre);
}

/** Guides proches (prototype : relatedGuides) : même domaine, puis domaine voisin, puis outils
    communs (deux au plus comptent), à égalité les plus actifs. */
export function guidesProches<
  G extends { id: number; domaine: string; outils: Set<string>; activite: number },
>(guide: G, tous: G[], nombre = 3): G[] {
  return tous
    .filter((o) => o.id !== guide.id)
    .map((o) => ({
      o,
      score:
        (o.domaine === guide.domaine ? 6 : voisins(o.domaine, guide.domaine) ? 3 : 0) +
        Math.min(2, [...o.outils].filter((outil) => guide.outils.has(outil)).length),
    }))
    .toSorted((a, b) => b.score - a.score || b.o.activite - a.o.activite)
    .slice(0, nombre)
    .map((r) => r.o);
}

/** « Souvent cherché » : premier mot-clé des guides les plus actifs, chacun une fois. */
export function souventCherches(guides: { motsCles: string[]; activite: number }[], nombre = 6) {
  const termes: string[] = [];
  for (const g of guides.toSorted((a, b) => b.activite - a.activite)) {
    const terme = g.motsCles[0];
    if (terme && !termes.includes(terme)) termes.push(terme);
    if (termes.length === nombre) break;
  }
  return termes;
}
