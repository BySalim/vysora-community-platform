import { LIBELLES_TYPE_SUJET, slugifier, type TriSujets, type TypeSujet } from '@vysora/shared';

/* Forum (FORUM-02) : état de la liste lu dans l'adresse (prototype : forum.js, readURL et writeURL),
   et sa traduction en paramètres de GET /api/v1/sujets. Le prototype filtrait en mémoire ; ici
   chaque filtre est dans l'adresse, que le serveur rend et que l'on peut partager. */

/** Clés des types dans l'adresse (prototype : ?type=clinique), et leur présentation (KINDS). */
export const TYPES: Record<
  TypeSujet,
  { cle: string; pluriel: string; icone: string; aPose: string; aide: string }
> = {
  QUESTION: {
    cle: 'question',
    pluriel: 'Questions',
    icone: 'help',
    aPose: 'a posé',
    aide: 'Vous cherchez comment obtenir un résultat ou utiliser un outil.',
  },
  CLINIQUE: {
    cle: 'clinique',
    pluriel: 'Cliniques du prompt',
    icone: 'scan',
    aPose: 'a soumis',
    aide: 'Un prompt ne donne pas le résultat attendu : faites-le examiner.',
  },
  ASTUCE: {
    cle: 'astuce',
    pluriel: 'Astuces',
    icone: 'bulb',
    aPose: 'a partagé',
    aide: 'Une méthode qui fonctionne, preuve avant et après à l’appui.',
  },
  RETOUR_EXPERIENCE: {
    cle: 'retour',
    pluriel: 'Retours d’expérience',
    icone: 'route',
    aPose: 'a publié',
    aide: 'Ce que vous avez ajusté au fil d’un projet, et pourquoi.',
  },
  DISCUSSION: {
    cle: 'discussion',
    pluriel: 'Discussions',
    icone: 'users',
    aPose: 'a lancé',
    aide: 'Une question ouverte, sans réponse unique.',
  },
};
export const ORDRE_TYPES: TypeSujet[] = [
  'QUESTION',
  'CLINIQUE',
  'ASTUCE',
  'RETOUR_EXPERIENCE',
  'DISCUSSION',
];
export const libelleType = (type: TypeSujet): string => LIBELLES_TYPE_SUJET[type];
const typeDeCle = (cle: string | null): TypeSujet | undefined =>
  ORDRE_TYPES.find((type) => TYPES[type].cle === cle);

/** Onglets de la liste (prototype : TABS). */
export const ONGLETS = [
  ['recentes', 'Récentes'],
  ['actives', 'Actives'],
  ['sans-reponse', 'Sans réponse'],
  ['utiles', 'Plus utiles'],
] as const;
export type Onglet = (typeof ONGLETS)[number][0];

/** Tri choisi dans le panneau « Filtrer » ; vide : celui de l'onglet. */
export const TRIS_FILTRE = [
  ['', 'Selon l’onglet'],
  ['recentes', 'Les plus récents'],
  ['actives', 'Activité récente'],
  ['utiles', 'Les plus utiles'],
  ['reproduites', 'Les plus reproduits'],
] as const;
export type TriFiltre = (typeof TRIS_FILTRE)[number][0];

const TRI_API: Record<Exclude<TriFiltre, ''> | 'sans-reponse', TriSujets> = {
  recentes: 'recents',
  actives: 'actifs',
  'sans-reponse': 'anciens',
  utiles: 'utiles',
  reproduites: 'reproduits',
};

export interface FiltresListe {
  sansReponse: boolean;
  sansReponseAcceptee: boolean;
  avecPrompt: boolean;
  /** « Sur mes outils » : adresses des outils suivis (gardés par le navigateur, posés dans l'adresse). */
  mesOutils: string[];
  types: TypeSujet[];
  tri: TriFiltre;
}

export interface EtatListe {
  onglet: Onglet;
  q: string;
  /** Adresse d'une étiquette. */
  etiquette: string;
  /** Adresse d'un outil. */
  outil: string;
  /** Pseudo d'un membre : ses sujets et ceux où il a répondu. */
  membre: string;
  page: number;
  filtres: FiltresListe;
}

const ADRESSE_SURE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const PSEUDO_SUR = /^[A-Za-z0-9_-]{1,30}$/;

export function lireAdresse(parametres: URLSearchParams): EtatListe {
  const onglet =
    ONGLETS.find(([cle]) => cle === parametres.get('onglet'))?.[0] ??
    (parametres.get('vue') === 'sans-reponse' ? 'sans-reponse' : 'recentes');
  const sure = (valeur: string | null, motif: RegExp) =>
    valeur && motif.test(valeur.trim()) ? valeur.trim() : '';
  const types = [
    ...new Set(
      parametres
        .getAll('type')
        .map(typeDeCle)
        .filter((type): type is TypeSujet => Boolean(type)),
    ),
  ];
  const tri = TRIS_FILTRE.find(([cle]) => cle && cle === parametres.get('tri'))?.[0] ?? '';
  return {
    onglet,
    q: (parametres.get('q') ?? '').trim().slice(0, 200),
    etiquette: sure(parametres.get('etiquette'), ADRESSE_SURE),
    outil: sure(parametres.get('outil'), ADRESSE_SURE),
    membre: sure(parametres.get('membre'), PSEUDO_SUR),
    page: Math.max(1, Math.min(1000, Number.parseInt(parametres.get('page') ?? '', 10) || 1)),
    filtres: {
      sansReponse: parametres.has('sansReponse'),
      sansReponseAcceptee: parametres.has('sansReponseAcceptee'),
      avecPrompt: parametres.has('avecPrompt'),
      mesOutils: (parametres.get('mesOutils') ?? '')
        .split(',')
        .map((slug) => slug.trim())
        .filter((slug) => ADRESSE_SURE.test(slug))
        .slice(0, 20),
      types,
      tri,
    },
  };
}

/** Adresse de la liste pour un état donné (prototype : writeURL), sans la page 1 ni les valeurs par défaut. */
export function ecrireAdresse(etat: EtatListe): string {
  const p = new URLSearchParams();
  if (etat.onglet !== 'recentes') p.set('onglet', etat.onglet);
  if (etat.q) p.set('q', etat.q);
  if (etat.etiquette) p.set('etiquette', etat.etiquette);
  if (etat.outil) p.set('outil', etat.outil);
  if (etat.membre) p.set('membre', etat.membre);
  for (const type of etat.filtres.types) p.append('type', TYPES[type].cle);
  if (etat.filtres.sansReponse) p.set('sansReponse', '1');
  if (etat.filtres.sansReponseAcceptee) p.set('sansReponseAcceptee', '1');
  if (etat.filtres.avecPrompt) p.set('avecPrompt', '1');
  if (etat.filtres.mesOutils.length) p.set('mesOutils', etat.filtres.mesOutils.join(','));
  if (etat.filtres.tri) p.set('tri', etat.filtres.tri);
  if (etat.page > 1) p.set('page', String(etat.page));
  const requete = p.toString();
  return `/forum${requete ? `?${requete}` : ''}`;
}

export const etatVide = (): EtatListe => lireAdresse(new URLSearchParams());

/** Recherche du prototype : « [étiquette] » cherche une étiquette, le reste est du texte (parseQuery). */
export function lireRecherche(q: string): { etiquettes: string[]; texte: string } {
  const etiquettes = [...q.matchAll(/\[([^\]]+)\]/g)].map((m) => slugifier(m[1] ?? ''));
  return {
    etiquettes: etiquettes.filter(Boolean),
    texte: q
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  };
}

/** Paramètres de GET /api/v1/sujets pour l'état de la liste. */
export function requeteApi(etat: EtatListe): URLSearchParams {
  const p = new URLSearchParams();
  const { etiquettes, texte } = lireRecherche(etat.q);
  if (texte) p.set('q', texte);
  // L'API filtre sur une étiquette : celle du filtre, à défaut la première de la recherche.
  const etiquette = etat.etiquette || etiquettes[0];
  if (etiquette) p.set('etiquette', etiquette);
  const outils = etat.outil ? [etat.outil] : etat.filtres.mesOutils;
  for (const outil of outils) p.append('outil', outil);
  if (etat.membre) p.set('membre', etat.membre);
  for (const type of etat.filtres.types) p.append('type', type);
  if (etat.filtres.sansReponse) p.set('sansReponse', 'true');
  if (etat.filtres.sansReponseAcceptee) p.set('sansReponseAcceptee', 'true');
  if (etat.filtres.avecPrompt) p.set('avecPrompt', 'true');
  if (etat.onglet === 'sans-reponse') p.set('enAttente', 'true');
  p.set('tri', TRI_API[etat.filtres.tri || etat.onglet]);
  if (etat.page > 1) p.set('page', String(etat.page));
  return p;
}

/** Nombre de filtres actifs (pastille du bouton « Filtrer »). */
export function filtresActifs(
  etat: EtatListe,
  noms: { outil?: string; membre?: string },
): { cle: string; libelle: string }[] {
  const actifs: { cle: string; libelle: string }[] = [];
  if (etat.etiquette) actifs.push({ cle: 'etiquette', libelle: `[${etat.etiquette}]` });
  if (etat.outil) actifs.push({ cle: 'outil', libelle: noms.outil ?? etat.outil });
  if (etat.membre)
    actifs.push({ cle: 'membre', libelle: `Membre : ${noms.membre ?? etat.membre}` });
  const f = etat.filtres;
  if (f.sansReponse) actifs.push({ cle: 'sansReponse', libelle: 'Sans réponse' });
  if (f.sansReponseAcceptee)
    actifs.push({ cle: 'sansReponseAcceptee', libelle: 'Sans réponse acceptée' });
  if (f.avecPrompt) actifs.push({ cle: 'avecPrompt', libelle: 'Avec un prompt corrigé' });
  if (f.mesOutils.length) actifs.push({ cle: 'mesOutils', libelle: 'Sur mes outils' });
  for (const type of f.types)
    actifs.push({ cle: `type:${TYPES[type].cle}`, libelle: TYPES[type].pluriel });
  return actifs;
}

/** État sans le filtre désigné (puces « Retirer le filtre »). */
export function sansFiltre(etat: EtatListe, cle: string): EtatListe {
  const suite: EtatListe = { ...etat, page: 1, filtres: { ...etat.filtres } };
  if (cle === 'etiquette') suite.etiquette = '';
  else if (cle === 'outil') suite.outil = '';
  else if (cle === 'membre') suite.membre = '';
  else if (cle === 'sansReponse') suite.filtres.sansReponse = false;
  else if (cle === 'sansReponseAcceptee') suite.filtres.sansReponseAcceptee = false;
  else if (cle === 'avecPrompt') suite.filtres.avecPrompt = false;
  else if (cle === 'mesOutils') suite.filtres.mesOutils = [];
  else if (cle.startsWith('type:'))
    suite.filtres.types = suite.filtres.types.filter((type) => `type:${TYPES[type].cle}` !== cle);
  return suite;
}
