/* Recherche d'un objectif (prototype explorer-modele.js : STOP, synonyms) : mots qui ne disent rien
   de l'objectif (« je veux mettre en place… ») et mots que la communauté emploie pour la même chose.
   Le site s'en sert pour chercher parmi les guides pendant la saisie, l'API pour la recherche plein
   texte des parcours (RG-31). */

/** Mots vides d'une recherche d'objectif, repliés (sans accents). */
// prettier-ignore
export const MOTS_VIDES_RECHERCHE: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'pour', 'avec', 'et', 'en', 'a', 'au', 'aux',
  'd', 'l', 'sur', 'par', 'qui', 'que', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'dans', 'comment',
  'faire', 'je', 'veux', 'creer', 'mettre', 'place', 'ligne', 'avoir', 'vos', 'votre',
]);

/** Mot replié, et ce qu'il désigne (prototype : synonyms). */
export const SYNONYMES_RECHERCHE: Readonly<Record<string, string>> = {
  rdv: 'rendez-vous',
  appli: 'application',
  app: 'application',
  site: 'application web',
  photo: 'image',
  visuel: 'image',
  illustration: 'image',
  dessin: 'illustration',
  musique: 'son',
  audio: 'son',
  voix: 'voix off',
  video: 'vidéo',
  donnees: 'données',
  tableur: 'tableur',
  excel: 'tableur',
  mail: 'e-mail',
  email: 'e-mail',
  courriel: 'e-mail',
  automatiser: 'automatisation',
  resume: 'résumé',
  cv: 'lettre',
  quiz: 'quiz',
  marque: 'charte graphique',
};

const plierCaractere = (caractere: string): string => {
  const base = caractere.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return base.length === 1 && /[a-z0-9]/.test(base) ? base : ' ';
};

/** Texte replié : un caractère par caractère d'origine, lettres sans accents, le reste en espaces. */
export const plierRecherche = (texte: unknown): string =>
  Array.from(String(texte ?? ''), plierCaractere).join('');

/** Mots utiles d'une recherche, repliés, chacun avec son synonyme s'il en a un. */
export function motsRecherche(requete: string): { mot: string; synonyme: string | null }[] {
  return plierRecherche(requete)
    .split(' ')
    .filter((mot) => mot && !MOTS_VIDES_RECHERCHE.has(mot))
    .map((mot) => ({ mot, synonyme: SYNONYMES_RECHERCHE[mot] ?? null }));
}

/** Pluriel simple ramené au singulier (prototype : stem). */
const racine = (mot: string): string => (mot.length > 3 ? mot.replace(/(s|x)$/, '') : mot);

/** Mots d'une recherche, chacun avec ses variantes : sa racine et celles de son synonyme
    (prototype : tokenize). */
export function jetonsRecherche(requete: string): string[][] {
  return motsRecherche(requete).map(({ mot, synonyme }) => {
    const variantes = new Set([racine(mot)]);
    if (synonyme)
      for (const partie of plierRecherche(synonyme).split(' ').filter(Boolean))
        variantes.add(racine(partie));
    return [...variantes];
  });
}

/** Texte replié précédé d'une espace, où chercher un jeton. */
export const champRecherche = (...parties: unknown[]): string =>
  ` ${plierRecherche(parties.join(' '))}`;

/** Un jeton commence un mot du texte replié (prototype : hits). */
export const contientJeton = (textePlie: string, variantes: string[]): boolean =>
  variantes.some((v) => textePlie.includes(` ${v}`));
