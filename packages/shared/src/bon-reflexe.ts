import type { DifficulteCas, StatutValidationCas } from './enums';

/* Bon réflexe (F-60 à F-62) : libellés, droit d'examiner un cas (RG-71), répartition des réponses
   de la communauté (F-62) et options d'un cas qui a déjà reçu des réponses. L'API applique ces
   règles ; le site s'en sert pour annoncer les mêmes. */

/** Libellés du prototype (explorer-modele.js, LEVELS). */
export const LIBELLES_DIFFICULTE: Record<DifficulteCas, string> = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
};

/** CV-04, vu par l'auteur du cas. */
export const LIBELLES_STATUT_CAS: Record<StatutValidationCas, string> = {
  PROPOSE: 'En attente de validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};

/** RG-71, CI-18 : un membre de l'équipe de modération examine un cas dont il n'est pas l'auteur. */
export const peutExaminerCas = (personne: { auteur: boolean; moderation: boolean }): boolean =>
  personne.moderation && !personne.auteur;

/** F-62 : part de chaque option dans les réponses, en pourcentages entiers qui totalisent 100
    (méthode des plus forts restes ; à égalité, la première option). Sans réponse, toutes à 0. */
export function repartirReponses(effectifs: readonly number[]): number[] {
  const total = effectifs.reduce((somme, n) => somme + n, 0);
  if (!total) return effectifs.map(() => 0);
  const parts = effectifs.map((n) => (n * 100) / total);
  const resultat = parts.map(Math.floor);
  let reste = 100 - resultat.reduce((somme, n) => somme + n, 0);
  const ordre = parts
    .map((part, rang) => ({ rang, decimales: part - Math.floor(part) }))
    .toSorted((a, b) => b.decimales - a.decimales || a.rang - b.rang);
  for (const { rang } of ordre) {
    if (reste <= 0) break;
    resultat[rang] = (resultat[rang] ?? 0) + 1;
    reste -= 1;
  }
  return resultat;
}

/** RG-72 : les réponses d'un cas sont définitives. Une fois qu'il en a reçu, ses options restent les
    mêmes, dans le même ordre, avec la même bonne réponse ; seuls leurs textes se corrigent. Renvoie
    le message à afficher si la saisie ne le respecte pas, sinon null. */
export function controlerOptionsFigees(
  enregistrees: readonly { id: number; correcte: boolean }[],
  saisies: readonly { id: number | null; correcte: boolean }[],
): string | null {
  const identiques =
    enregistrees.length === saisies.length &&
    enregistrees.every(
      (option, rang) =>
        saisies[rang]?.id === option.id && saisies[rang]?.correcte === option.correcte,
    );
  return identiques
    ? null
    : 'Ce cas a déjà reçu des réponses : ses options, leur ordre et la bonne réponse ne changent plus. Vous pouvez en corriger le texte.';
}
