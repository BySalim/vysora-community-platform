import type { TypeSujet } from './enums';

/* Forum (F-50 à F-55) : types de sujet, état d'un sujet (CV-03), droits de fermer et de rouvrir
   (RG-65), forme du corps d'une clinique (RG-62) et d'une réponse qui propose un prompt. L'API
   compose et relit ces corps ; le site s'en sert pour annoncer les mêmes règles. */

/** Libellés du prototype (forum.js, KINDS). */
export const LIBELLES_TYPE_SUJET: Record<TypeSujet, string> = {
  QUESTION: 'Question',
  CLINIQUE: 'Clinique du prompt',
  ASTUCE: 'Astuce',
  RETOUR_EXPERIENCE: 'Retour d’expérience',
  DISCUSSION: 'Discussion',
};

/** RG-63 : seuls ces sujets ont une réponse acceptée. */
export const TYPES_SUJET_RESOLUBLES: readonly TypeSujet[] = ['QUESTION', 'CLINIQUE'];
export const accepteUneReponse = (type: TypeSujet): boolean =>
  TYPES_SUJET_RESOLUBLES.includes(type);

export const ETATS_SUJET = ['OUVERT', 'RESOLU', 'FERME'] as const;
export type EtatSujet = (typeof ETATS_SUJET)[number];

/** CV-03 : « Fermé » s'il a une fermeture, sinon « Résolu » s'il a une réponse acceptée, sinon « Ouvert ». */
export function etatSujet(sujet: { ferme: boolean; accepte: boolean }): EtatSujet {
  if (sujet.ferme) return 'FERME';
  return sujet.accepte ? 'RESOLU' : 'OUVERT';
}

/** CI-22 : l'auteur du sujet ou un membre de l'équipe de modération le ferme. */
export const peutFermerSujet = (personne: { auteur: boolean; moderation: boolean }): boolean =>
  personne.auteur || personne.moderation;

/** RG-65 : l'auteur rouvre un sujet qu'il a fermé lui-même ; la modération rouvre tout sujet. */
export const peutRouvrirSujet = (personne: {
  auteur: boolean;
  moderation: boolean;
  fermeParLAuteur: boolean;
}): boolean => personne.moderation || (personne.auteur && personne.fermeParLAuteur);

/* Corps composés ------------------------------------------------------------------------------- */

/** RG-62 : rubriques d'une clinique du prompt, dans l'ordre du corps (titres de niveau 3). */
export const RUBRIQUES_CLINIQUE = {
  prompt: 'Prompt utilisé',
  obtenu: 'Résultat obtenu',
  attendu: 'Résultat attendu',
  outil: 'Outil et modèle',
} as const;
const ORDRE_RUBRIQUES = [
  RUBRIQUES_CLINIQUE.prompt,
  RUBRIQUES_CLINIQUE.obtenu,
  RUBRIQUES_CLINIQUE.attendu,
  RUBRIQUES_CLINIQUE.outil,
];

export interface RubriquesClinique {
  prompt: string;
  obtenu: string;
  attendu: string;
}

const OUVERTURE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/;

/** Prompt cité tel quel : bloc de code dont la clôture est plus longue que toute suite d'accents
    graves du texte, pour qu'il ne puisse pas la refermer. */
export function blocDeCode(texte: string, langage = 'text'): string {
  const plusLongue = Math.max(0, ...[...texte.matchAll(/`+/g)].map((m) => m[0].length));
  const cloture = '`'.repeat(Math.max(3, plusLongue + 1));
  return `${cloture}${langage}\n${texte}\n${cloture}`;
}

interface Bloc {
  debut: number;
  fin: number;
  langage: string;
}

/** Blocs de code clos d'un texte Markdown (lignes de début et de fin). */
function blocsDeCode(lignes: string[]): Bloc[] {
  const blocs: Bloc[] = [];
  let ouvert: (Bloc & { cloture: string }) | null = null;
  lignes.forEach((ligne, i) => {
    if (ouvert) {
      const fermeture = ligne.trim();
      if (
        fermeture.startsWith(ouvert.cloture) &&
        /^(`+|~+)$/.test(fermeture) &&
        fermeture[0] === ouvert.cloture[0]
      ) {
        blocs.push({ debut: ouvert.debut, fin: i, langage: ouvert.langage });
        ouvert = null;
      }
      return;
    }
    const ouverture = OUVERTURE.exec(ligne);
    if (ouverture?.[1])
      ouvert = { debut: i, fin: i, langage: ouverture[2] ?? '', cloture: ouverture[1] };
  });
  return blocs;
}

/** Contenu d'un bloc de code qui occupe tout le texte, ou le texte lui-même. */
function sansCloture(texte: string): string {
  const lignes = texte.trim().split('\n');
  const [bloc] = blocsDeCode(lignes);
  return bloc && bloc.debut === 0 && bloc.fin === lignes.length - 1
    ? lignes.slice(1, -1).join('\n')
    : texte.trim();
}

/** RG-62 : corps d'une clinique, avec ses quatre rubriques après le contexte (facultatif). Le prompt
    est cité dans un bloc de code ; la rubrique « Outil et modèle » reprend ceux du sujet. */
export function composerClinique(
  contexte: string,
  rubriques: RubriquesClinique,
  outilEtModele: string,
): string {
  return [
    contexte.trim(),
    `### ${RUBRIQUES_CLINIQUE.prompt}`,
    blocDeCode(rubriques.prompt),
    `### ${RUBRIQUES_CLINIQUE.obtenu}`,
    rubriques.obtenu.trim(),
    `### ${RUBRIQUES_CLINIQUE.attendu}`,
    rubriques.attendu.trim(),
    `### ${RUBRIQUES_CLINIQUE.outil}`,
    outilEtModele.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Relit le corps d'une clinique : contexte et rubriques, ou null si les rubriques n'y sont pas
    toutes dans l'ordre (un titre placé dans un bloc de code ne compte pas). */
export function lireClinique(corps: string): (RubriquesClinique & { contexte: string }) | null {
  const lignes = corps.replace(/\r\n?/g, '\n').split('\n');
  const blocs = blocsDeCode(lignes);
  const dansUnBloc = (i: number) => blocs.some((b) => i >= b.debut && i <= b.fin);
  const titres: number[] = [];
  lignes.forEach((ligne, i) => {
    const attendu = ORDRE_RUBRIQUES[titres.length];
    if (attendu && ligne.trim() === `### ${attendu}` && !dansUnBloc(i)) titres.push(i);
  });
  const [prompt, obtenu, attendu, outil] = titres;
  if (prompt === undefined || obtenu === undefined || attendu === undefined || outil === undefined)
    return null;
  const section = (de: number, a: number) =>
    lignes
      .slice(de + 1, a)
      .join('\n')
      .trim();
  return {
    contexte: lignes.slice(0, prompt).join('\n').trim(),
    prompt: sansCloture(section(prompt, obtenu)),
    obtenu: section(obtenu, attendu),
    attendu: section(attendu, outil),
  };
}

/** Réponse du forum qui propose un prompt (prototype : « Prompt proposé », « Prompt corrigé ») : le
    prompt suit le texte, dans un bloc de code « text ». */
export function composerMessage(texte: string, prompt: string | null): string {
  return prompt ? `${texte.trim()}\n\n${blocDeCode(prompt)}` : texte.trim();
}

/** Relit une réponse : texte, et prompt proposé si elle se termine par un bloc de code « text ». */
export function lireMessage(corps: string): { texte: string; prompt: string | null } {
  const lignes = corps.replace(/\r\n?/g, '\n').trimEnd().split('\n');
  const dernier = blocsDeCode(lignes).at(-1);
  if (!dernier || dernier.fin !== lignes.length - 1 || dernier.langage !== 'text')
    return { texte: corps.trim(), prompt: null };
  return {
    texte: lignes.slice(0, dernier.debut).join('\n').trim(),
    prompt: lignes.slice(dernier.debut + 1, dernier.fin).join('\n'),
  };
}
