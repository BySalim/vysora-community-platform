import { describe, expect, it } from 'vitest';
import { controlerOptionsFigees, peutExaminerCas, repartirReponses } from './bon-reflexe';
import {
  schemaCas,
  schemaExamenCas,
  schemaFiltresCas,
  schemaReponseCas,
} from './schemas/bon-reflexe';
import { erreursParChamp } from './schemas/commun';

const erreurs = (resultat: { success: boolean; error?: unknown }) =>
  resultat.success ? {} : erreursParChamp(resultat.error as never);

const option = (libelle: string, correcte = false) => ({
  libelle,
  correcte,
  explication: 'Une explication qui dit pourquoi cette option convient ou non.',
});

const cas = {
  titre: 'Des ventes en hausse ?',
  contexte: 'Les ventes passent de 120 à 150 commandes. Vous demandez à l’IA la hausse.',
  demandeIa: 'Mes ventes passent de 120 à 150 commandes. Calcule la hausse.',
  reponseIa: 'Les ventes ont augmenté de 30 % : vous avez gagné 30 commandes.',
  question: 'Que faites-vous ?',
  explication:
    'La hausse se rapporte à la valeur de départ : (150 − 120) ÷ 120 = 25 %, et non 30 %.',
  difficulte: 'DEBUTANT',
  options: [
    option('Publier le résultat tel quel'),
    option('Vérifier le calcul à partir de 120', true),
    option('Demander une phrase plus courte'),
  ],
};

describe('proposition d’un cas (RG-70, CI-16)', () => {
  it('accepte un cas complet, sans étiquette ni outil', () => {
    const lu = schemaCas.parse(cas);
    expect(lu.etiquettes).toEqual([]);
    expect(lu.outilId).toBeNull();
    expect(lu.options.map((o) => o.id)).toEqual([null, null, null]);
  });

  it('RG-70 : de 2 à 5 options', () => {
    expect(
      erreurs(schemaCas.safeParse({ ...cas, options: [option('Seule option', true)] })),
    ).toEqual({ options: 'Proposez au moins 2 options.' });
    const six = Array.from({ length: 6 }, (_, i) => option(`Option ${i + 1}`, i === 0));
    expect(erreurs(schemaCas.safeParse({ ...cas, options: six }))).toEqual({
      options: 'Proposez 5 options au plus.',
    });
    expect(
      schemaCas.safeParse({ ...cas, options: [option('Oui', true), option('Non')] }).success,
    ).toBe(true);
  });

  it('CI-16 : exactement une option correcte', () => {
    const aucune = cas.options.map((o) => ({ ...o, correcte: false }));
    expect(erreurs(schemaCas.safeParse({ ...cas, options: aucune }))).toEqual({
      options: 'Indiquez la bonne réponse parmi les options.',
    });
    const deux = cas.options.map((o, i) => ({ ...o, correcte: i < 2 }));
    expect(erreurs(schemaCas.safeParse({ ...cas, options: deux }))).toEqual({
      options: 'Une seule option est la bonne réponse.',
    });
  });

  it('RG-70 : explication générale de 50 caractères, explication de chaque option', () => {
    expect(
      erreurs(
        schemaCas.safeParse({
          ...cas,
          explication: 'Trop court.',
          options: [option('Oui', true), { libelle: 'Non', correcte: false, explication: '' }],
        }),
      ),
    ).toEqual({
      explication: 'Rédigez l’explication générale en 50 caractères au moins.',
      'options.1.explication':
        'Expliquez pourquoi cette option est juste ou fausse, en 20 caractères au moins.',
    });
  });

  it('refuse deux options identiques et une option répétée', () => {
    const resultat = schemaCas.safeParse({
      ...cas,
      options: [
        { ...option('Vérifier', true), id: 4 },
        { ...option('vérifier'), id: 4 },
      ],
    });
    expect(erreurs(resultat)).toEqual({
      'options.1.libelle': 'Deux options ont le même texte.',
      'options.1.id': 'Cette option figure deux fois.',
    });
  });

  it('un modèle avec son outil, du référentiel ou saisi, pas les deux', () => {
    expect(erreurs(schemaCas.safeParse({ ...cas, modeleNonReference: 'GPT-5' }))).toEqual({
      outilId: 'Indiquez l’outil de ce modèle.',
    });
    expect(
      erreurs(
        schemaCas.safeParse({ ...cas, outilId: 2, modeleId: 3, modeleNonReference: 'GPT-5' }),
      ),
    ).toEqual({
      modeleNonReference: 'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
    });
  });

  it('champs obligatoires manquants', () => {
    expect(Object.keys(erreurs(schemaCas.safeParse({})))).toEqual([
      'titre',
      'contexte',
      'demandeIa',
      'reponseIa',
      'question',
      'explication',
      'difficulte',
      'options',
    ]);
  });
});

describe('réponse et examen d’un cas', () => {
  it('F-62 : une option choisie', () => {
    expect(erreurs(schemaReponseCas.safeParse({}))).toEqual({
      optionId: 'Choisissez une réponse avant de valider.',
    });
    expect(schemaReponseCas.parse({ optionId: 12 })).toEqual({ optionId: 12 });
  });

  it('F-61 : un refus est motivé ; une validation n’a pas de motif', () => {
    expect(erreurs(schemaExamenCas.safeParse({ decision: 'REFUSE', motif: '  ' }))).toEqual({
      motif: 'Rédigez le motif du refus, communiqué à l’auteur.',
    });
    expect(schemaExamenCas.parse({ decision: 'VALIDE', motif: 'Très bon cas.' })).toEqual({
      decision: 'VALIDE',
      motif: null,
    });
    expect(erreurs(schemaExamenCas.safeParse({ decision: 'PROPOSE' }))).toEqual({
      decision: 'Choisissez de valider ou de refuser le cas.',
    });
  });

  it('RG-71 : la modération examine les cas des autres', () => {
    expect(peutExaminerCas({ auteur: false, moderation: true })).toBe(true);
    expect(peutExaminerCas({ auteur: true, moderation: true })).toBe(false);
    expect(peutExaminerCas({ auteur: false, moderation: false })).toBe(false);
  });

  it('filtres de la liste', () => {
    expect(schemaFiltresCas.parse({})).toEqual({
      q: null,
      difficulte: [],
      etiquette: null,
      outil: [],
      nonRepondus: false,
      tri: 'recents',
      page: 1,
    });
    expect(
      schemaFiltresCas.parse({ difficulte: 'DEBUTANT,AVANCE', nonRepondus: '1' }),
    ).toMatchObject({ difficulte: ['DEBUTANT', 'AVANCE'], nonRepondus: true });
    expect(erreurs(schemaFiltresCas.safeParse({ difficulte: 'FACILE' }))).toEqual({
      'difficulte.0': 'Cette difficulté n’existe pas.',
    });
  });
});

describe('répartition des réponses (F-62)', () => {
  it('pourcentages entiers qui totalisent 100', () => {
    expect(repartirReponses([18, 74, 8])).toEqual([18, 74, 8]);
    expect(repartirReponses([1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartirReponses([2, 1])).toEqual([67, 33]);
    expect(repartirReponses([5, 0, 0])).toEqual([100, 0, 0]);
  });

  it('sans réponse, toutes les parts à zéro', () => {
    expect(repartirReponses([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('options d’un cas qui a reçu des réponses (RG-72)', () => {
  const enregistrees = [
    { id: 1, correcte: false },
    { id: 2, correcte: true },
  ];

  it('les textes se corrigent, les options restent les mêmes', () => {
    expect(
      controlerOptionsFigees(enregistrees, [
        { id: 1, correcte: false },
        { id: 2, correcte: true },
      ]),
    ).toBeNull();
  });

  it('ni ajout, ni retrait, ni nouvel ordre, ni autre bonne réponse', () => {
    const refus = (saisies: { id: number | null; correcte: boolean }[]) =>
      expect(controlerOptionsFigees(enregistrees, saisies)).toMatch(/ne changent plus/);
    refus([...enregistrees, { id: null, correcte: false }]);
    refus([{ id: 2, correcte: true }]);
    refus([
      { id: 2, correcte: true },
      { id: 1, correcte: false },
    ]);
    refus([
      { id: 1, correcte: true },
      { id: 2, correcte: false },
    ]);
  });
});
