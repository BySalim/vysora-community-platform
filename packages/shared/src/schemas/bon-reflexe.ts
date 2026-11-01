import { z } from 'zod';
import { DIFFICULTES_CAS, type StatutValidationCas } from '../enums';
import { LIMITES, LONGUEURS } from '../regles';
import { parametreBooleen, parametreListe, parametrePage } from './commun';
import { champEtiquettes } from './creations';

/* Bon réflexe (F-60 à F-62) : proposition d'un cas (RG-70, CI-16), réponse d'un apprenant (RG-72),
   examen par la modération (RG-71), filtres de la liste. Le prototype n'a pas de formulaire
   « Proposer un cas » (EC-11) : les messages suivent ceux du formulaire « Poser une question ». */

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

/** Texte obligatoire, borné ; le premier message vaut pour un champ absent ou trop court. */
const texte = (bornes: { min: number; max: number }, court: string, long: string) =>
  z.string({ error: court }).trim().min(bornes.min, { error: court }).max(bornes.max, {
    error: long,
  });

const identifiant = z.number({ error: 'Cet élément est introuvable.' }).int().positive();
const facultatif = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((valeur) => valeur ?? null);

const { casTitre, casContexte, casDemandeIa, casReponseIa, casQuestion, casExplication } =
  LONGUEURS;
const { optionLibelle, optionExplication } = LONGUEURS;

/** Option de réponse (OPTION_REPONSE), dans l'ordre d'affichage. */
export const schemaOptionCas = z.object({
  /** Option déjà enregistrée, gardée à la modification ; absente pour une nouvelle option. */
  id: facultatif(identifiant),
  libelle: texte(
    optionLibelle,
    'Rédigez le texte de cette option.',
    `Une option compte ${optionLibelle.max} caractères au plus.`,
  ),
  /** Pourquoi cette option est juste ou fausse (F-60). */
  explication: texte(
    optionExplication,
    `Expliquez pourquoi cette option est juste ou fausse, en ${optionExplication.min} caractères au moins.`,
    `L’explication d’une option compte ${nombre(optionExplication.max)} caractères au plus.`,
  ),
  correcte: z.boolean({ error: 'Indiquez si cette option est la bonne réponse.' }).default(false),
});

const { min: optionsMin, max: optionsMax } = LIMITES.optionsParCas;

/** Corps de POST /api/v1/cas et de PUT /api/v1/cas/:id (F-60, RG-70). */
export const schemaCas = z
  .object({
    titre: texte(
      casTitre,
      `Le titre doit compter au moins ${casTitre.min} caractères.`,
      `Le titre compte ${casTitre.max} caractères au plus.`,
    ),
    /** Situation de départ. */
    contexte: texte(
      casContexte,
      `Décrivez la situation en ${casContexte.min} caractères au moins.`,
      `La situation compte ${nombre(casContexte.max)} caractères au plus.`,
    ),
    /** Demande faite à l'IA, telle qu'elle a été écrite. */
    demandeIa: texte(
      casDemandeIa,
      'Collez la demande faite à l’IA.',
      `La demande faite à l’IA compte ${nombre(casDemandeIa.max)} caractères au plus.`,
    ),
    /** Réponse de l'IA à juger. */
    reponseIa: texte(
      casReponseIa,
      'Collez la réponse de l’IA à juger.',
      `La réponse de l’IA compte ${nombre(casReponseIa.max)} caractères au plus.`,
    ),
    /** Question posée à l'apprenant (prototype : « Que faites-vous ? »). */
    question: texte(
      casQuestion,
      'Rédigez la question posée à l’apprenant.',
      `La question compte ${casQuestion.max} caractères au plus.`,
    ),
    /** RG-70 : explication générale, 50 caractères au moins. */
    explication: texte(
      casExplication,
      `Rédigez l’explication générale en ${casExplication.min} caractères au moins.`,
      `L’explication générale compte ${nombre(casExplication.max)} caractères au plus.`,
    ),
    difficulte: z.enum(DIFFICULTES_CAS, { error: 'Choisissez la difficulté du cas.' }),
    /** Domaine du cas (une catégorie) et durée estimée par l'auteur, facultatifs (décision du 2026-10-30). */
    categorieId: facultatif(identifiant),
    dureeMinutes: facultatif(
      z
        .number({ error: 'Indiquez une durée en minutes.' })
        .int({ error: 'Indiquez une durée en minutes.' })
        .min(LIMITES.dureeCasMinutes.min, {
          error: `La durée compte de ${LIMITES.dureeCasMinutes.min} à ${LIMITES.dureeCasMinutes.max} minutes.`,
        })
        .max(LIMITES.dureeCasMinutes.max, {
          error: `La durée compte de ${LIMITES.dureeCasMinutes.min} à ${LIMITES.dureeCasMinutes.max} minutes.`,
        }),
    ),
    /** Outil et modèle qui ont donné la réponse étudiée (facultatifs, comme pour un sujet). */
    outilId: facultatif(identifiant),
    modeleId: facultatif(identifiant),
    modeleNonReference: z
      .string({ error: 'Le nom du modèle compte 100 caractères au plus.' })
      .trim()
      .max(100, { error: 'Le nom du modèle compte 100 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
    /** RG-70 : zéro à cinq étiquettes ; une étiquette absente du référentiel y est ajoutée (CI-04). */
    etiquettes: champEtiquettes,
    /** RG-70, CI-16 : deux à cinq options, dont exactement une correcte. */
    options: z
      .array(schemaOptionCas, { error: `Proposez de ${optionsMin} à ${optionsMax} options.` })
      .min(optionsMin, { error: `Proposez au moins ${optionsMin} options.` })
      .max(optionsMax, { error: `Proposez ${optionsMax} options au plus.` }),
  })
  .superRefine((cas, ctx) => {
    const probleme = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    // CI-16 : exactement une option correcte.
    const correctes = cas.options.filter((option) => option.correcte).length;
    if (cas.options.length >= optionsMin && correctes === 0)
      probleme(['options'], 'Indiquez la bonne réponse parmi les options.');
    if (correctes > 1) probleme(['options'], 'Une seule option est la bonne réponse.');
    const libelles = new Set<string>();
    const ids = new Set<number>();
    cas.options.forEach((option, rang) => {
      const libelle = option.libelle.toLocaleLowerCase('fr');
      if (libelles.has(libelle))
        probleme(['options', rang, 'libelle'], 'Deux options ont le même texte.');
      libelles.add(libelle);
      if (option.id !== null && ids.has(option.id))
        probleme(['options', rang, 'id'], 'Cette option figure deux fois.');
      if (option.id !== null) ids.add(option.id);
    });
    // Comme une configuration (RG-14) : un modèle du référentiel ou en texte libre, avec son outil.
    if (cas.modeleId && cas.modeleNonReference)
      probleme(
        ['modeleNonReference'],
        'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      );
    if ((cas.modeleId || cas.modeleNonReference) && !cas.outilId)
      probleme(['outilId'], 'Indiquez l’outil de ce modèle.');
  });
export type CasSaisi = z.input<typeof schemaCas>;
export type SaisieCas = z.output<typeof schemaCas>;

/** Corps de POST /api/v1/cas/:id/reponses (F-62). */
export const schemaReponseCas = z.object({
  optionId: z
    .number({ error: 'Choisissez une réponse avant de valider.' })
    .int({ error: 'Choisissez une réponse avant de valider.' })
    .positive({ error: 'Choisissez une réponse avant de valider.' }),
});
export type SaisieReponseCas = z.output<typeof schemaReponseCas>;

export const DECISIONS_EXAMEN_CAS = ['VALIDE', 'REFUSE'] as const satisfies readonly Exclude<
  StatutValidationCas,
  'PROPOSE'
>[];

/** Corps de PUT /api/v1/cas/:id/examen (F-61, RG-71) : valider, ou refuser avec un motif. */
export const schemaExamenCas = z
  .object({
    /** Statut que l'examen donne au cas (CV-04). */
    decision: z.enum(DECISIONS_EXAMEN_CAS, {
      error: 'Choisissez de valider ou de refuser le cas.',
    }),
    motif: z
      .string({ error: 'Rédigez le motif du refus, communiqué à l’auteur.' })
      .trim()
      .max(LONGUEURS.motifRefusCas.max, {
        error: `Le motif compte ${nombre(LONGUEURS.motifRefusCas.max)} caractères au plus.`,
      })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((examen, ctx) => {
    // F-61 : un refus est toujours motivé.
    if (examen.decision === 'REFUSE' && !examen.motif)
      ctx.addIssue({
        code: 'custom',
        path: ['motif'],
        message: 'Rédigez le motif du refus, communiqué à l’auteur.',
      });
  })
  // Un cas validé n'a pas de motif (CI-18).
  .transform((examen) => ({
    ...examen,
    motif: examen.decision === 'REFUSE' ? examen.motif : null,
  }));
export type ExamenCasSaisi = z.input<typeof schemaExamenCas>;
export type ExamenCas = z.output<typeof schemaExamenCas>;

/** Tris de la liste : récents d'abord (ordre du prototype), plus anciens, plus répondus, plus utiles. */
export const TRIS_CAS = ['recents', 'anciens', 'repondus', 'utiles'] as const;
export type TriCas = (typeof TRIS_CAS)[number];

/** Paramètres de GET /api/v1/cas. */
export const schemaFiltresCas = z.object({
  /** Recherche plein texte (RG-31). */
  q: z
    .string()
    .trim()
    .max(200, { error: 'Votre recherche compte 200 caractères au plus.' })
    .optional()
    .transform((valeur) => valeur || null),
  /** Prototype : puces « Tous les niveaux », « Débutant »… */
  difficulte: parametreListe('Cette difficulté n’existe pas.').pipe(
    z.array(z.enum(DIFFICULTES_CAS, { error: 'Cette difficulté n’existe pas.' })),
  ),
  /** Adresse (slug) d'une étiquette. */
  etiquette: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((valeur) => valeur || null),
  /** Adresses (slug) des outils qui ont donné la réponse étudiée : l'un d'eux. */
  outil: parametreListe('Cet outil est introuvable.').pipe(
    z.array(z.string().max(80)).max(20, { error: 'Choisissez 20 outils au plus.' }),
  ),
  /** Membre connecté : cas auxquels il n'a pas encore répondu, hors les siens (F-21). */
  nonRepondus: parametreBooleen,
  tri: z.enum(TRIS_CAS, { error: 'Ce tri n’existe pas.' }).default('recents'),
  page: parametrePage,
});
export type FiltresCas = z.output<typeof schemaFiltresCas>;

/* Savoirs d'Apprendre (APP-03) : « Marquer comme acquis » et réponse à la question de vérification
   d'un savoir, enregistrés dans le compte du membre. Les savoirs sont les contenus éditoriaux du
   site, désignés par leur identifiant (« demande-claire »). */

/** Identifiant d'un savoir : lettres minuscules, chiffres et tirets. */
export const MOTIF_SAVOIR = /^[a-z0-9][a-z0-9-]{0,79}$/;

const choixVerification = z
  .number({ error: 'Choisissez une réponse.' })
  .int({ error: 'Choisissez une réponse.' })
  .min(0, { error: 'Choisissez une réponse.' })
  .max(LIMITES.optionsParCas.max - 1, { error: 'Choisissez une réponse.' });
const dateDuJour = z
  .string({ error: 'Indiquez une date au format AAAA-MM-JJ.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez une date au format AAAA-MM-JJ.' });

/** PUT /api/v1/moi/savoirs/:savoir : état d'un savoir pour le membre ; datés du jour par l'API. */
export const schemaEtatSavoir = z.object({
  acquis: z.boolean({ error: 'Indiquez si le savoir est acquis.' }),
  /** Réponse à la question de vérification, ou null pour la recommencer. */
  verification: z
    .object({ choix: choixVerification, correcte: z.boolean() })
    .nullable()
    .default(null),
});
export type EtatSavoir = z.output<typeof schemaEtatSavoir>;

const idSavoir = z.string().regex(MOTIF_SAVOIR, { error: 'Ce savoir est introuvable.' });

/** POST /api/v1/moi/savoirs : progression gardée dans le navigateur avant la connexion, versée au
    compte ; ce que le compte connaît déjà l'emporte, sauf une date d'acquis plus ancienne. */
export const schemaImportSavoirs = z.object({
  acquis: z
    .record(idSavoir, dateDuJour)
    .default({})
    .refine((acquis) => Object.keys(acquis).length <= LIMITES.savoirsSuivis, {
      error: 'Trop de savoirs à reprendre.',
    }),
  verifications: z
    .record(
      idSavoir,
      z.object({ choix: choixVerification, correcte: z.boolean(), date: dateDuJour }),
    )
    .default({})
    .refine((verifications) => Object.keys(verifications).length <= LIMITES.savoirsSuivis, {
      error: 'Trop de savoirs à reprendre.',
    }),
});
export type ImportSavoirs = z.output<typeof schemaImportSavoirs>;
