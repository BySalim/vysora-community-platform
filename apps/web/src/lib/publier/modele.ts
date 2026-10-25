import {
  controlerPublication,
  LIMITES,
  LONGUEURS,
  type CategorieApi,
  type ContenuCreationSaisi,
  type CreationAControler,
  type CreationFicheApi,
  type FamilleOutil,
  type LicenceApi,
  type MediaApi,
  type ModeSelection,
  type TypeCreation,
  type TypeLienExterne,
  type TypeMomentCle,
} from '@vysora/shared';
import { normaliser } from '../texte';
import { CATEGORIE_PAR_FAMILLE, CATEGORIE_PAR_OUTIL, MOTIFS, type SorteResultat } from './donnees';

/* Modèle de l'éditeur (CREA-02), repris de prototype/nouvelle-creation.js : le brouillon tel que la
   page le manipule (le résultat sous ses formes, le chemin parcouru en prompts et en étapes), sa
   conversion vers le contenu que l'API enregistre (schemaContenuCreation) et retour, et les contrôles
   de publication. Ceux-ci sont ceux de l'API (controlerPublication, paquet partagé), rapportés aux
   champs de l'éditeur, complétés de ce que l'éditeur du prototype vérifiait à la saisie. */

/** Outil proposé à la saisie : celui du référentiel, ou celui qu'une création utilise encore. */
export interface OutilEditeur {
  id: number;
  nom: string;
  logo: string | null;
  logoMonochrome: boolean;
  /** null : outil retiré du catalogue, gardé pour la création qui l'utilise. */
  famille: FamilleOutil | null;
  alias: string[];
  estAgent: boolean;
  modeles: { id: number; nom: string; nomCourt: string }[];
}

export interface Referentiels {
  outils: OutilEditeur[];
  categories: CategorieApi[];
  licences: LicenceApi[];
}

export interface Moment {
  type: TypeMomentCle;
  texte: string;
  titre: string;
}

/** Élément du résultat (texte, code, image, lien) ou image jointe à un prompt. */
export interface Resultat {
  id: string;
  kind: SorteResultat;
  /** Texte ou code obtenu. */
  texte: string;
  /** Nom du fichier de code, ou nom du fichier image déposé. */
  nom: string;
  /** Image : identifiant une fois téléversée (POST /api/v1/medias). */
  mediaId: number | null;
  src: string;
  taille: number;
  largeur: number;
  hauteur: number;
  alt: string;
  /** Description connue de l'API : une autre est envoyée avant l'enregistrement (PATCH). */
  altEnregistre: string;
  portrait: boolean;
  /** Vrai pendant le téléversement. */
  envoi: boolean;
  url: string;
  libelle: string;
  type: TypeLienExterne | '';
  typeChoisi: boolean;
}

export interface BlocPrompt {
  id: string;
  kind: 'prompt';
  outilId: number | null;
  modele: string;
  reglages: string;
  prompt: string;
  reponse: string;
  fichiers: Resultat[];
  moment: Moment | null;
  ouvert: { reponse?: boolean; reglages?: boolean };
  /* Gardés tels quels d'un enregistrement à l'autre (l'éditeur ne les montre pas). */
  echangeId: number | null;
  titre: string;
  nbEssais: number;
  modeSelection: ModeSelection;
  contexte: string;
}

export interface BlocEtape {
  id: string;
  kind: 'etape';
  titre: string;
  texte: string;
  moment: Moment | null;
  etapeId: number | null;
  /** Moments de l'étape au-delà du premier (créés ailleurs que dans l'éditeur), gardés tels quels. */
  autresMoments: Moment[];
}

export type Bloc = BlocPrompt | BlocEtape;

export interface Brouillon {
  seq: number;
  creationId: number | null;
  statut: 'brouillon' | 'publiee';
  /** RG-18 : type figé par la première publication. */
  typeVerrouille: TypeCreation | null;
  titre: string;
  objectif: string;
  limites: string;
  formatResultat: string;
  /** Points « À adapter », un par ligne. */
  aAdapter: string;
  resultats: Resultat[];
  chemin: Bloc[];
  categorieId: number | null;
  etiquettes: string[];
  licenceId: number | null;
  /** RG-23 : null tant que l'auteur n'a pas choisi (repérage automatique). */
  agent: boolean | null;
  /** Avertissement posé par la modération : l'auteur ne peut pas le retirer. */
  agentModeration: boolean;
  /** Données sensibles conservées en connaissance de cause (F-18). */
  decisions: Record<string, 1>;
  publieLe: string | null;
  modifieLe: string | null;
  /** Étape qui porte les prompts sans étape (création « 1 prompt » ou itération, début d'un projet). */
  etapeImpliciteId: number | null;
  autresMoments: Moment[];
}

export type GroupeErreur = 'presentation' | 'resultat' | 'chemin' | 'categorie' | 'savoir';

export interface ErreurChamp {
  groupe: GroupeErreur;
  message: string;
}

export const longueur = (texte: unknown): number => String(texte ?? '').trim().length;

/** RG-16 : adresse HTTPS (même motif que schemaLienSaisi). */
export const lienValide = (url: string): boolean => /^https:\/\/[^\s/$.?#]\S*$/.test(url.trim());

/* Création des éléments ---------------------------------------------------------------- */

const nid = (b: Brouillon, prefixe: string) => `${prefixe}${++b.seq}`;

export function nouveauResultat(
  b: Brouillon,
  kind: SorteResultat,
  valeurs: Partial<Resultat> = {},
): Resultat {
  return {
    id: nid(b, 'r'),
    kind,
    texte: '',
    nom: '',
    mediaId: null,
    src: '',
    taille: 0,
    largeur: 0,
    hauteur: 0,
    alt: '',
    altEnregistre: '',
    portrait: false,
    envoi: false,
    url: '',
    libelle: '',
    type: '',
    typeChoisi: false,
    ...valeurs,
  };
}

export function nouveauPrompt(b: Brouillon, valeurs: Partial<BlocPrompt> = {}): BlocPrompt {
  return {
    id: nid(b, 'p'),
    kind: 'prompt',
    outilId: null,
    modele: '',
    reglages: '',
    prompt: '',
    reponse: '',
    fichiers: [],
    moment: null,
    ouvert: {},
    echangeId: null,
    titre: '',
    nbEssais: 1,
    modeSelection: 'PREMIER_ESSAI',
    contexte: '',
    ...valeurs,
  };
}

export function nouvelleEtape(b: Brouillon, valeurs: Partial<BlocEtape> = {}): BlocEtape {
  return {
    id: nid(b, 'e'),
    kind: 'etape',
    titre: '',
    texte: '',
    moment: null,
    etapeId: null,
    autresMoments: [],
    ...valeurs,
  };
}

export function nouveauBrouillon(licenceId: number | null = null): Brouillon {
  const b: Brouillon = {
    seq: 0,
    creationId: null,
    statut: 'brouillon',
    typeVerrouille: null,
    titre: '',
    objectif: '',
    limites: '',
    formatResultat: '',
    aAdapter: '',
    resultats: [],
    chemin: [],
    categorieId: null,
    etiquettes: [],
    licenceId,
    agent: null,
    agentModeration: false,
    decisions: {},
    publieLe: null,
    modifieLe: null,
    etapeImpliciteId: null,
    autresMoments: [],
  };
  b.chemin.push(nouveauPrompt(b));
  return b;
}

/* Lecture du brouillon --------------------------------------------------------------- */

export const estPrompt = (x: Bloc): x is BlocPrompt => x.kind === 'prompt';
export const estEtape = (x: Bloc): x is BlocEtape => x.kind === 'etape';
export const prompts = (d: Brouillon): BlocPrompt[] => d.chemin.filter(estPrompt);
export const etapesChemin = (d: Brouillon): BlocEtape[] => d.chemin.filter(estEtape);
export const fichiersChemin = (d: Brouillon): Resultat[] => prompts(d).flatMap((p) => p.fichiers);
export const tousFichiers = (d: Brouillon): Resultat[] => [
  ...d.resultats.filter((r) => r.kind === 'fichier'),
  ...fichiersChemin(d),
];

export function trouver(d: Brouillon, id: string): Resultat | Bloc | null {
  return (
    d.resultats.find((r) => r.id === id) ??
    d.chemin.find((x) => x.id === id) ??
    fichiersChemin(d).find((f) => f.id === id) ??
    null
  );
}

const CHAMPS_GENERAUX = ['titre', 'objectif', 'limites', 'formatResultat', 'aAdapter'] as const;
type ChampGeneral = (typeof CHAMPS_GENERAUX)[number];
const estChampGeneral = (cle: string): cle is ChampGeneral =>
  (CHAMPS_GENERAUX as readonly string[]).includes(cle);

/** Valeur d'un champ désigné par sa clé : « titre », « r:r2:alt », « b:p3:prompt », « m:p3 » (moment),
    « mt:p3 » (type du moment), « mn:p3 » (titre du moment). */
export function lireChamp(d: Brouillon, cle: string): string {
  const [k = '', id, prop] = cle.split(':');
  if (!id) return estChampGeneral(k) ? d[k] : '';
  const o = trouver(d, id);
  if (!o) return '';
  if (k === 'm' || k === 'mt' || k === 'mn') {
    if (!('moment' in o) || !o.moment) return '';
    return k === 'm' ? o.moment.texte : k === 'mt' ? o.moment.type : o.moment.titre;
  }
  const valeur = prop ? (o as unknown as Record<string, unknown>)[prop] : undefined;
  return typeof valeur === 'string' ? valeur : '';
}

export function ecrireChamp(d: Brouillon, cle: string, valeur: string): void {
  const [k = '', id, prop] = cle.split(':');
  if (!id) {
    if (estChampGeneral(k)) d[k] = valeur;
    return;
  }
  const o = trouver(d, id);
  if (!o) return;
  if (k === 'm' || k === 'mt' || k === 'mn') {
    if (!('moment' in o) || !o.moment) return;
    if (k === 'm') o.moment.texte = valeur;
    else if (k === 'mt') o.moment.type = valeur as TypeMomentCle;
    else o.moment.titre = valeur;
    return;
  }
  if (prop && typeof (o as unknown as Record<string, unknown>)[prop] === 'string')
    (o as unknown as Record<string, unknown>)[prop] = valeur;
}

/** Un bloc encore vide peut être retiré sans confirmation (nouvelle-creation.js : vide). */
export const vide = (x: Bloc): boolean =>
  x.kind === 'prompt'
    ? !longueur(x.prompt) && !longueur(x.reponse) && !x.fichiers.length && !x.moment
    : !longueur(x.titre) && !longueur(x.texte) && !x.moment;

/** Le brouillon contient-il quelque chose ? (Un brouillon vide n'est pas enregistré.) */
export const aDuContenu = (d: Brouillon): boolean =>
  CHAMPS_GENERAUX.some((k) => longueur(d[k]) > 0) ||
  d.resultats.length > 0 ||
  d.chemin.some((x) => !vide(x) || (estPrompt(x) && x.outilId !== null)) ||
  d.etiquettes.length > 0 ||
  d.categorieId !== null;

/** Le type se déduit du chemin : un prompt, plusieurs prompts avec le même outil, ou des étapes et
    plusieurs outils (nouvelle-creation.js : typeDe). */
export function typeDe(d: Pick<Brouillon, 'chemin'>): TypeCreation | null {
  const ps = d.chemin.filter(estPrompt);
  const es = d.chemin.filter(estEtape);
  if (!es.length && !ps.some((p) => longueur(p.prompt))) return null;
  const outils = new Set(ps.map((p) => p.outilId).filter((o) => o !== null));
  if (es.length || outils.size > 1) return 'PROJET';
  return ps.length >= 2 ? 'ITERATION' : 'UN_PROMPT';
}

/** Type d'un lien d'après son adresse (nouvelle-creation.js : typeLien). */
export function typeLien(url: string): TypeLienExterne | '' {
  const u = url.toLowerCase();
  if (/github\.com|gitlab\.com|bitbucket\.org|huggingface\.co/.test(u)) return 'DEPOT_CODE';
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(u)) return 'VIDEO';
  if (
    /chatgpt\.com\/share|chat\.openai\.com\/share|claude\.ai\/share|g\.co\/gemini|gemini\.google\.com\/share|midjourney\.com\/jobs|perplexity\.ai\/search/.test(
      u,
    )
  )
    return 'PREUVE';
  if (/medium\.com|substack\.com|\/blog\//.test(u)) return 'ARTICLE';
  return u ? 'DEMO' : '';
}

export const indexOutils = (refs: Pick<Referentiels, 'outils'>): Map<number, OutilEditeur> =>
  new Map(refs.outils.map((o) => [o.id, o]));

/* Données sensibles et instructions pour agent (F-18, F-19) ---------------------------------- */

export interface Sensible {
  id: string;
  cle: string;
  type: string;
  valeur: string;
  masque: string;
}

/** Champs de texte où chercher des données sensibles, avec leur clé. */
export function champsTexte(d: Brouillon): [string, string][] {
  const champs: [string, string][] = [
    ['titre', d.titre],
    ['objectif', d.objectif],
    ['formatResultat', d.formatResultat],
    ['limites', d.limites],
    ['aAdapter', d.aAdapter],
  ];
  for (const r of d.resultats) {
    if (r.kind === 'texte' || r.kind === 'code') champs.push([`r:${r.id}:texte`, r.texte]);
    if (r.kind === 'lien') champs.push([`r:${r.id}:url`, r.url]);
  }
  for (const x of d.chemin) {
    if (x.kind === 'prompt')
      champs.push(
        [`b:${x.id}:prompt`, x.prompt],
        [`b:${x.id}:reponse`, x.reponse],
        [`b:${x.id}:reglages`, x.reglages],
      );
    else champs.push([`b:${x.id}:titre`, x.titre], [`b:${x.id}:texte`, x.texte]);
    if (x.moment) champs.push([`mn:${x.id}`, x.moment.titre], [`m:${x.id}`, x.moment.texte]);
  }
  return champs.filter(([, valeur]) => valeur);
}

/** Passages sensibles repérés, signalés sous le champ concerné ; l'auteur masque ou conserve. */
export function sensibles(d: Brouillon, cle?: string): Sensible[] {
  const trouves: Sensible[] = [];
  for (const [k, valeur] of champsTexte(d)) {
    if (cle && k !== cle) continue;
    const pris: [number, number][] = [];
    for (const motif of MOTIFS.sensibles) {
      const re = new RegExp(motif.re.source, motif.re.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(valeur))) {
        const debut = m.index;
        const fin = debut + m[0].length;
        if (!m[0]) {
          re.lastIndex += 1;
          continue;
        }
        if (pris.some(([a, b]) => debut < b && fin > a)) continue;
        pris.push([debut, fin]);
        trouves.push({
          id: `${k}|${m[0]}`,
          cle: k,
          type: motif.label,
          valeur: m[0],
          masque: motif.masque,
        });
      }
    }
  }
  return trouves;
}

export const sensiblesATraiter = (d: Brouillon): Sensible[] =>
  sensibles(d).filter((s) => !d.decisions[s.id]);

/** Prompt qui confie des actions à un outil qui agit (F-19). */
export function agentRepere(d: Brouillon, outils: Map<number, OutilEditeur>): BlocPrompt | null {
  return (
    prompts(d).find(
      (p) => p.outilId !== null && outils.get(p.outilId)?.estAgent && MOTIFS.agent.test(p.prompt),
    ) ?? null
  );
}
export const outilAgentPresent = (d: Brouillon, outils: Map<number, OutilEditeur>): boolean =>
  prompts(d).some((p) => p.outilId !== null && outils.get(p.outilId)?.estAgent);
export const agentActif = (d: Brouillon, outils: Map<number, OutilEditeur>): boolean =>
  d.agentModeration || (d.agent ?? Boolean(agentRepere(d, outils)));

/** Catégorie proposée d'après le résultat et les outils, tant que l'auteur n'en a pas choisi. */
export function categorieProposee(d: Brouillon, refs: Referentiels): CategorieApi | null {
  const outils = indexOutils(refs);
  const parLibelle = (libelle: string) =>
    refs.categories.find((c) => c.libelle === libelle) ?? null;
  if (d.resultats.some((r) => r.kind === 'code')) return parLibelle('Code et scripts');
  const premier = prompts(d)
    .map((p) => (p.outilId === null ? undefined : outils.get(p.outilId)))
    .find(Boolean);
  if (premier) {
    const libelle =
      CATEGORIE_PAR_OUTIL[premier.nom] ??
      (premier.famille ? CATEGORIE_PAR_FAMILLE[premier.famille] : undefined);
    if (libelle) return parLibelle(libelle);
  }
  if (d.resultats.some((r) => r.kind === 'fichier')) return parLibelle('Image et illustration');
  if (d.resultats.some((r) => r.kind === 'texte')) return parLibelle('Texte et rédaction');
  return null;
}

/* Vers l'API ---------------------------------------------------------------------------- */

/** Étape envoyée : un bloc « Étape » du chemin, ou l'étape implicite des prompts qui n'en ont pas. */
export interface Groupe {
  bloc: BlocEtape | null;
  prompts: BlocPrompt[];
}

/** Type qui décide de la structure envoyée : celui du chemin, à défaut celui de la publication. */
export const typeStructure = (d: Brouillon): TypeCreation =>
  typeDe(d) ?? d.typeVerrouille ?? 'UN_PROMPT';

/** Prompts regroupés par étape. Pour un « 1 prompt » ou une itération, une seule étape. Dans un
    projet, chaque prompt appartient à l'étape qui le précède ; ceux placés avant la première étape
    forment une étape implicite. Pour les contrôles (`pourControle`), ils sont comptés avec la
    première étape, pour que les numéros d'étape des messages soient ceux de l'éditeur. */
export function groupes(d: Brouillon, pourControle = false): Groupe[] {
  if (typeStructure(d) !== 'PROJET') return [{ bloc: null, prompts: prompts(d) }];
  const liste: Groupe[] = [];
  let courant: Groupe | null = null;
  for (const x of d.chemin) {
    if (x.kind === 'etape') {
      courant = { bloc: x, prompts: [] };
      liste.push(courant);
      continue;
    }
    if (!courant) {
      courant = { bloc: null, prompts: [] };
      liste.push(courant);
    }
    courant.prompts.push(x);
  }
  const [tete, suivant, ...reste] = liste;
  if (pourControle && tete && suivant && tete.bloc === null)
    return [{ bloc: suivant.bloc, prompts: [...tete.prompts, ...suivant.prompts] }, ...reste];
  return liste;
}

const memeNom = (a: string, b: string) => normaliser(a.trim()) === normaliser(b.trim());

/** Configurations d'une étape : un outil par configuration, dans l'ordre d'apparition. Le modèle et
    les réglages sont les premiers renseignés pour cet outil ; un modèle du référentiel est désigné par
    son identifiant, un autre est gardé en texte libre (RG-14). */
function configurationsDe(groupe: Groupe, outils: Map<number, OutilEditeur>) {
  const ordre: number[] = [];
  for (const p of groupe.prompts)
    if (p.outilId !== null && !ordre.includes(p.outilId)) ordre.push(p.outilId);
  return ordre.map((outilId) => {
    const avec = groupe.prompts.filter((p) => p.outilId === outilId);
    const modele = avec.map((p) => p.modele.trim()).find(Boolean) ?? '';
    const reference = modele
      ? outils
          .get(outilId)
          ?.modeles.find((m) => memeNom(m.nomCourt, modele) || memeNom(m.nom, modele))
      : undefined;
    return {
      outilId,
      modeleId: reference?.id ?? null,
      modeleNonReference: reference ? null : modele || null,
      parametres: avec.map((p) => p.reglages.trim()).find(Boolean) ?? null,
      contexteCache: avec.map((p) => p.contexte.trim()).find(Boolean) ?? null,
    };
  });
}

/** Moments d'une étape et ce qui les porte (bloc de l'éditeur, ou null pour un moment gardé tel quel). */
function momentsDe(d: Brouillon, groupe: Groupe, rang: number) {
  const liste: { moment: Moment; echange: number | null; porteur: Bloc | null }[] = [];
  if (groupe.bloc?.moment)
    liste.push({ moment: groupe.bloc.moment, echange: null, porteur: groupe.bloc });
  const gardes = groupe.bloc ? groupe.bloc.autresMoments : rang === 0 ? d.autresMoments : [];
  for (const moment of gardes) liste.push({ moment, echange: null, porteur: null });
  groupe.prompts.forEach((p, x) => {
    if (p.moment) liste.push({ moment: p.moment, echange: x, porteur: p });
  });
  return liste;
}

/** Points « À adapter » : un par ligne non vide. */
export const pointsAAdapter = (d: Brouillon): string[] =>
  d.aAdapter
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter(Boolean);

const resultatTextuel = (d: Brouillon) =>
  d.resultats.find((r) => (r.kind === 'texte' || r.kind === 'code') && longueur(r.texte)) ??
  d.resultats.find((r) => r.kind === 'texte' || r.kind === 'code');

export interface Envoi {
  contenu: ContenuCreationSaisi;
  /** Étapes et échanges dans l'ordre envoyé : identifiants à reporter après l'enregistrement. */
  groupes: Groupe[];
  /** Images décrites autrement que dans l'API : description à envoyer d'abord (PATCH). */
  descriptions: Resultat[];
}

/** Contenu envoyé à POST /api/v1/creations ou PUT /api/v1/creations/:id. Les images en cours
    d'envoi et les liens dont l'adresse n'est pas encore valable attendent l'enregistrement suivant. */
export function versContenu(d: Brouillon, refs: Referentiels, confirmation = false): Envoi {
  const outils = indexOutils(refs);
  const gs = groupes(d);
  const textuel = resultatTextuel(d);
  const images = (liste: Resultat[]) =>
    liste.filter((f) => f.mediaId !== null).map((f) => f.mediaId as number);
  const contenu: ContenuCreationSaisi = {
    type: d.typeVerrouille ?? typeStructure(d),
    titre: d.titre,
    objectif: d.objectif,
    limites: d.limites,
    formatResultat: d.formatResultat,
    aAdapter: pointsAAdapter(d)
      .slice(0, LIMITES.pointsAAdapter)
      .map((point) => point.slice(0, LONGUEURS.pointAAdapter.max)),
    categorieId: d.categorieId,
    licenceId: d.licenceId,
    etiquettes: d.etiquettes,
    instructionsAgent: agentActif(d, outils),
    resultat: textuel
      ? {
          nature: textuel.kind === 'code' ? 'CODE' : 'TEXTE',
          texte: textuel.texte,
          nom: textuel.kind === 'code' ? textuel.nom : null,
        }
      : null,
    images: images(d.resultats.filter((r) => r.kind === 'fichier')),
    liens: d.resultats
      .filter((r) => r.kind === 'lien' && lienValide(r.url))
      .map((r) => ({
        type: r.type || typeLien(r.url) || 'AUTRE',
        url: r.url.trim(),
        libelle: r.libelle,
      })),
    etapes: gs.map((g, rang) => {
      const configurations = configurationsDe(g, outils);
      const ordre = configurations.map((c) => c.outilId);
      const id = g.bloc ? g.bloc.etapeId : d.etapeImpliciteId;
      return {
        ...(id === null ? {} : { id }),
        titre: g.bloc?.titre ?? null,
        recit: g.bloc?.texte ?? null,
        configurations,
        echanges: g.prompts.map((p) => ({
          ...(p.echangeId === null ? {} : { id: p.echangeId }),
          titre: p.titre,
          prompt: p.prompt,
          reponse: p.reponse,
          nbEssais: p.nbEssais,
          modeSelection: p.modeSelection,
          configuration: p.outilId === null ? null : ordre.indexOf(p.outilId),
          images: images(p.fichiers),
        })),
        moments: momentsDe(d, g, rang).map(({ moment, echange }) => ({
          type: moment.type,
          titre: moment.titre,
          explication: moment.texte,
          echange,
        })),
      };
    }),
    confirmationDonnees: confirmation,
  };
  const descriptions = tousFichiers(d).filter(
    (f) => f.mediaId !== null && f.alt.trim() !== f.altEnregistre.trim(),
  );
  return { contenu, groupes: gs, descriptions };
}

/** Après un enregistrement : identifiants des étapes et des échanges créés, pour que les suivants
    les mettent à jour (images et commentaires gardés). */
export function reporterIdentifiants(
  d: Brouillon,
  envoyes: Groupe[],
  fiche: CreationFicheApi,
): void {
  envoyes.forEach((g, rang) => {
    const etape = fiche.etapes[rang];
    if (!etape) return;
    if (g.bloc) g.bloc.etapeId = etape.id;
    else d.etapeImpliciteId = etape.id;
    g.prompts.forEach((p, x) => {
      const echange = etape.echanges[x];
      if (echange) p.echangeId = echange.id;
    });
  });
}

/* Contrôles de publication ---------------------------------------------------------------- */

export interface ContexteControle {
  liensMaximum: number;
}

const MESSAGES_TYPE: Record<TypeCreation, string> = {
  UN_PROMPT:
    'Cette création a été publiée en « 1 prompt » : son type ne change plus. Gardez un seul prompt, avec un seul outil.',
  ITERATION:
    'Cette création a été publiée comme itération : son type ne change plus. Gardez plusieurs prompts avec un même outil, sans étape.',
  PROJET: 'Cette création a été publiée comme projet : son type ne change plus. Gardez ses étapes.',
};

export const ENVOI_EN_COURS = 'Patientez : l’image est en cours d’envoi.';

/** Groupe d'une clé de l'éditeur (liste « Avant de publier »). */
export function groupeDe(d: Brouillon, cle: string): GroupeErreur {
  if (cle === 'titre' || cle === 'objectif') return 'presentation';
  if (cle === 'categorie') return 'categorie';
  if (cle === 'aAdapter' || cle === 'limites') return 'savoir';
  if (cle === 'resultats' || cle === 'formatResultat') return 'resultat';
  const [k, id] = cle.split(':');
  if (k === 'r' && id && d.resultats.some((r) => r.id === id)) return 'resultat';
  return 'chemin';
}

const ORDRE_GROUPES: GroupeErreur[] = ['presentation', 'resultat', 'chemin', 'categorie', 'savoir'];
const ORDRE_PROPRIETES: Record<string, number> = {
  prompt: 1,
  titre: 1,
  texte: 2,
  url: 2,
  alt: 3,
};

/** Rang d'une clé dans la page, pour annoncer les erreurs dans l'ordre où elles apparaissent. */
function rangDe(d: Brouillon, cle: string): number {
  const groupe = ORDRE_GROUPES.indexOf(groupeDe(d, cle)) * 1_000_000;
  if (cle === 'objectif') return groupe + 1;
  const [k = '', id, prop = ''] = cle.split(':');
  if (!id) return groupe;
  const iResultat = d.resultats.findIndex((r) => r.id === id);
  if (iResultat >= 0) return groupe + (iResultat + 1) * 10 + (ORDRE_PROPRIETES[prop] ?? 0);
  const iBloc = d.chemin.findIndex(
    (x) => x.id === id || (x.kind === 'prompt' && x.fichiers.some((f) => f.id === id)),
  );
  const champ = k === 'o' ? 1.5 : k === 'm' ? 5 : k === 'r' ? 4 : (ORDRE_PROPRIETES[prop] ?? 3);
  return groupe + (iBloc + 1) * 10 + champ;
}

/** Erreurs qui empêchent la publication, par champ de l'éditeur, dans l'ordre de la page.
    `erreursApi` : erreurs renvoyées par l'API (clés de l'API), affichées tant que la saisie n'a pas changé. */
export function controler(
  d: Brouillon,
  refs: Referentiels,
  contexte: ContexteControle,
  erreursApi: Record<string, string> = {},
): Map<string, ErreurChamp> {
  const gs = groupes(d, true);
  const type = typeStructure(d);
  const projet = type === 'PROJET';
  /* Correspondance des clés de l'API (chemins de champs) vers celles de l'éditeur ; null : sans objet
     dans l'éditeur (étape implicite). */
  const cles = new Map<string, string | null>([
    ['titre', 'titre'],
    ['objectif', 'objectif'],
    ['resultat', 'resultats'],
    ['images', 'resultats'],
    ['liens', 'resultats'],
    ['etapes', 'chemin'],
    ['type', 'chemin'],
    ['categorieId', 'categorie'],
    ['formatResultat', 'formatResultat'],
    ['aAdapter', 'aAdapter'],
    ['limites', 'limites'],
  ]);
  const imagesResultat = d.resultats.filter((r) => r.kind === 'fichier');
  imagesResultat.forEach((f, i) => cles.set(`images.${i}.texteAlternatif`, `r:${f.id}:alt`));

  const aControler: CreationAControler = {
    type,
    titre: d.titre,
    objectif: d.objectif,
    categorieId: d.categorieId,
    resultat: (() => {
      const textuel = resultatTextuel(d);
      return textuel ? { texte: textuel.texte } : null;
    })(),
    images: imagesResultat.map((f) => ({ texteAlternatif: f.alt })),
    liens: d.resultats
      .filter((r) => r.kind === 'lien' && lienValide(r.url))
      .map((r) => ({ type: r.type || typeLien(r.url) || 'AUTRE' })),
    etapes: gs.map((g, e) => {
      const chemin = `etapes.${e}`;
      const premier = g.prompts[0];
      cles.set(`${chemin}.titre`, g.bloc ? `b:${g.bloc.id}:titre` : null);
      cles.set(`${chemin}.recit`, g.bloc ? `b:${g.bloc.id}:texte` : null);
      cles.set(`${chemin}.echanges`, 'chemin');
      cles.set(`${chemin}.configurations`, premier ? `o:${premier.id}` : 'chemin');
      const configurations = configurationsDe(g, indexOutils(refs));
      const ordre = configurations.map((c) => c.outilId);
      g.prompts.forEach((p, x) => {
        cles.set(`${chemin}.echanges.${x}.prompt`, `b:${p.id}:prompt`);
        cles.set(`${chemin}.echanges.${x}.configuration`, `o:${p.id}`);
        p.fichiers.forEach((f, i) =>
          cles.set(`${chemin}.echanges.${x}.images.${i}.texteAlternatif`, `r:${f.id}:alt`),
        );
      });
      const moments = momentsDe(d, g, e);
      moments.forEach(({ porteur }, m) =>
        cles.set(`${chemin}.moments.${m}.explication`, porteur ? `m:${porteur.id}` : 'chemin'),
      );
      return {
        titre: g.bloc?.titre ?? null,
        recit: g.bloc?.texte ?? null,
        configurations: configurations.map((c) => ({ outilId: c.outilId })),
        echanges: g.prompts.map((p) => ({
          prompt: p.prompt,
          reponse: p.reponse,
          configuration: p.outilId === null ? null : ordre.indexOf(p.outilId),
          images: p.fichiers.map((f) => ({ texteAlternatif: f.alt })),
        })),
        moments: moments.map(({ moment, echange }) => ({ explication: moment.texte, echange })),
      };
    }),
  };

  const erreurs = new Map<string, ErreurChamp>();
  const ajouter = (cle: string | null | undefined, message: string) => {
    if (!cle || erreurs.has(cle)) return;
    erreurs.set(cle, { groupe: groupeDe(d, cle), message });
  };
  /** Clé de l'éditeur pour une clé de l'API : la plus proche connue (« etapes.0.echanges.1 » → …). */
  const traduire = (cleApi: string): string | null => {
    let cle = cleApi;
    while (cle) {
      if (cles.has(cle)) return cles.get(cle) ?? null;
      cle = cle.includes('.') ? cle.slice(0, cle.lastIndexOf('.')) : '';
    }
    return 'chemin';
  };

  // Ce que l'éditeur vérifie à la saisie (nouvelle-creation.js : valider) et que l'API ne voit pas.
  const avant = typeDe(d);
  if (d.typeVerrouille && avant && avant !== d.typeVerrouille)
    ajouter('chemin', MESSAGES_TYPE[d.typeVerrouille]);
  if (projet && d.chemin[0]?.kind === 'prompt')
    ajouter(
      'chemin',
      etapesChemin(d).length
        ? 'Dans un projet, chaque prompt suit l’étape à laquelle il appartient : ajoutez une étape avant le prompt 1.'
        : 'Avec plusieurs outils, la création devient un projet : ajoutez au moins deux étapes et placez chaque prompt sous la sienne.',
    );
  for (const r of d.resultats) {
    if ((r.kind === 'texte' || r.kind === 'code') && !longueur(r.texte))
      ajouter(
        `r:${r.id}:texte`,
        r.kind === 'code'
          ? 'Collez le code obtenu, ou retirez ce bloc.'
          : 'Collez le texte obtenu, ou retirez ce bloc.',
      );
    if (r.kind === 'fichier' && r.envoi) ajouter(`r:${r.id}:alt`, ENVOI_EN_COURS);
    if (r.kind === 'lien') {
      if (!longueur(r.url)) ajouter(`r:${r.id}:url`, 'Saisissez l’adresse du lien, ou retirez-le.');
      else if (!lienValide(r.url))
        ajouter(`r:${r.id}:url`, 'L’adresse doit commencer par https://.');
    }
  }
  prompts(d).forEach((p, i) => {
    if (p.outilId === null) ajouter(`o:${p.id}`, `Choisissez l’outil du prompt ${i + 1}.`);
    for (const f of p.fichiers) if (f.envoi) ajouter(`r:${f.id}:alt`, ENVOI_EN_COURS);
  });
  const points = pointsAAdapter(d);
  if (points.length > LIMITES.pointsAAdapter)
    ajouter('aAdapter', `Gardez ${LIMITES.pointsAAdapter} points à adapter au plus.`);
  else if (points.some((point) => point.length > LONGUEURS.pointAAdapter.max))
    ajouter(
      'aAdapter',
      `Chaque point à adapter compte ${LONGUEURS.pointAAdapter.max} caractères au plus.`,
    );

  // Règles de publication de l'API (RG-10 à RG-16, règle du résultat).
  for (const [cle, message] of Object.entries(
    controlerPublication(aControler, { liensMaximum: contexte.liensMaximum }),
  ))
    ajouter(traduire(cle), message);
  for (const [cle, message] of Object.entries(erreursApi)) {
    if (cle === 'confirmationDonnees') continue;
    ajouter(traduire(cle), message);
  }

  return new Map([...erreurs].toSorted(([a], [b]) => rangDe(d, a) - rangDe(d, b)));
}

/* Depuis l'API ---------------------------------------------------------------------------- */

/** Outils d'une création absents du catalogue (retirés depuis) : gardés pour l'affichage. */
export function outilsDeLaFiche(fiche: CreationFicheApi, refs: Referentiels): OutilEditeur[] {
  const connus = indexOutils(refs);
  const ajoutes: OutilEditeur[] = [];
  for (const etape of fiche.etapes)
    for (const c of etape.configurations)
      if (c.outil && !connus.has(c.outil.id) && !ajoutes.some((o) => o.id === c.outil?.id))
        ajoutes.push({
          id: c.outil.id,
          nom: c.outil.nom,
          logo: c.outil.logo,
          logoMonochrome: c.outil.logoMonochrome,
          famille: null,
          alias: [],
          estAgent: false,
          modeles: [],
        });
  return ajoutes;
}

const portrait = (media: Pick<MediaApi, 'largeur' | 'hauteur'>) =>
  media.hauteur > media.largeur * 1.15;

function imageDe(b: Brouillon, media: MediaApi): Resultat {
  return nouveauResultat(b, 'fichier', {
    mediaId: media.id,
    src: media.declinaisons[0]?.url ?? media.url,
    largeur: media.largeur,
    hauteur: media.hauteur,
    alt: media.texteAlternatif,
    altEnregistre: media.texteAlternatif,
    portrait: portrait(media),
  });
}

const momentDe = (m: {
  type: TypeMomentCle;
  titre: string | null;
  explication: string | null;
}) => ({
  type: m.type,
  titre: m.titre ?? '',
  texte: m.explication ?? '',
});

/** Brouillon de l'éditeur à partir de la fiche d'une création de l'auteur (GET /api/v1/creations/:id). */
export function depuisFiche(fiche: CreationFicheApi, refs: Referentiels): Brouillon {
  const b = nouveauBrouillon();
  b.chemin = [];
  Object.assign(b, {
    creationId: fiche.id,
    statut: fiche.statut === 'PUBLIEE' ? 'publiee' : 'brouillon',
    typeVerrouille: fiche.datePublication ? fiche.type : null,
    titre: fiche.titre ?? '',
    objectif: fiche.objectif ?? '',
    limites: fiche.limites ?? '',
    formatResultat: fiche.formatResultat ?? '',
    aAdapter: fiche.aAdapter.join('\n'),
    categorieId: fiche.categorie?.id ?? null,
    etiquettes: fiche.etiquettes.map((e) => e.libelle),
    licenceId: refs.licences.find((l) => l.code === fiche.licence.code)?.id ?? null,
    agent: fiche.avertissementAgent === 'AUTEUR',
    agentModeration: fiche.avertissementAgent === 'MODERATION',
    publieLe: fiche.datePublication,
    modifieLe: fiche.dateModification ?? fiche.dateCreation,
  } satisfies Partial<Brouillon>);

  // Le résultat : images, texte ou code, liens.
  b.resultats.push(...fiche.images.map((media) => imageDe(b, media)));
  if (fiche.resultat)
    b.resultats.push(
      nouveauResultat(b, fiche.resultat.nature === 'CODE' ? 'code' : 'texte', {
        texte: fiche.resultat.texte,
        nom: fiche.resultat.nom ?? '',
      }),
    );
  for (const lien of fiche.liens)
    b.resultats.push(
      nouveauResultat(b, 'lien', {
        url: lien.url,
        libelle: lien.libelle ?? '',
        type: lien.type,
        typeChoisi: true,
      }),
    );

  // Le chemin : étapes (projet) et prompts, avec leur configuration et leurs moments clés.
  const projet = fiche.type === 'PROJET';
  fiche.etapes.forEach((etape, rang) => {
    const momentsEtape = etape.moments.filter((m) => m.echangeId === null).map(momentDe);
    const implicite =
      !projet ||
      (rang === 0 && etape.titre === null && etape.recit === null && !momentsEtape.length);
    if (implicite && rang === 0) b.etapeImpliciteId = etape.id;
    const promptsEtape: BlocPrompt[] = [];
    let blocEtape: BlocEtape | null = null;
    if (!implicite) {
      const [premier, ...autres] = momentsEtape;
      blocEtape = nouvelleEtape(b, {
        etapeId: etape.id,
        titre: etape.titre ?? '',
        texte: etape.recit ?? '',
        moment: premier ?? null,
        autresMoments: autres,
      });
      b.chemin.push(blocEtape);
    } else if (rang > 0) return;
    for (const echange of etape.echanges) {
      const configuration =
        etape.configurations.find((c) => c.id === echange.configurationId) ??
        (etape.configurations.length === 1 ? etape.configurations[0] : undefined);
      const moment = etape.moments.find((m) => m.echangeId === echange.id);
      const p = nouveauPrompt(b, {
        echangeId: echange.id,
        titre: echange.titre ?? '',
        nbEssais: echange.nbEssais,
        modeSelection: echange.modeSelection,
        outilId: configuration?.outil?.id ?? null,
        modele: configuration?.modele?.nomCourt ?? configuration?.modeleNonReference ?? '',
        reglages: configuration?.parametres ?? '',
        contexte: configuration?.contexteCache ?? '',
        prompt: echange.prompt ?? '',
        reponse: echange.reponse ?? '',
        fichiers: echange.images.map((media) => imageDe(b, media)),
        moment: moment ? momentDe(moment) : null,
        ouvert: { reponse: Boolean(echange.reponse) },
      });
      promptsEtape.push(p);
      b.chemin.push(p);
    }
    // Étape implicite : ses moments sans prompt vont aux derniers prompts qui n'en ont pas.
    if (implicite) {
      const libres = promptsEtape.filter((p) => !p.moment).toReversed();
      for (const moment of momentsEtape) {
        const p = libres.shift();
        if (p) p.moment = moment;
        else b.autresMoments.push(moment);
      }
    }
  });
  if (!b.chemin.length) b.chemin.push(nouveauPrompt(b));
  return b;
}
