import { z } from 'zod';
import { TYPES_SUJET, type TypeSujet } from '../enums';
import { composerMessage } from '../forum';
import { LONGUEURS } from '../regles';
import { parametreBooleen, parametreListe, parametrePage } from './commun';
import { champEtiquettes } from './creations';

/* Forum (F-50 à F-53) : sujet des cinq types, réponse, filtres de la liste. Messages du formulaire
   « Poser une question » du prototype (forum.js, publishTopic). Le corps d'une clinique se saisit
   par rubriques (RG-62) : l'API le compose (composerClinique) ; une réponse peut proposer un prompt,
   cité après son texte (composerMessage). */

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

/** Texte facultatif : espaces retirés aux extrémités ; vide, il devient null. */
const texte = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .max(max, { error: message })
    .nullish()
    .transform((valeur) => valeur || null);

/** Texte saisi dans un champ qu'une règle rend obligatoire selon le type (contrôlé ensuite). */
const champ = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .max(max, { error: message })
    .nullish()
    .transform((valeur) => valeur ?? '');

const identifiant = z.number({ error: 'Cet élément est introuvable.' }).int().positive();
const facultatif = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((valeur) => valeur ?? null);

const TROP_LONG_CORPS = `Votre sujet compte ${nombre(LONGUEURS.sujetCorps.max)} caractères au plus.`;

/** RG-60 : texte du sujet trop court, selon ce que le formulaire demande pour chaque type. */
const CORPS_TROP_COURT: Record<Exclude<TypeSujet, 'CLINIQUE'>, string> = {
  QUESTION: 'Votre question doit compter au moins 30 caractères.',
  ASTUCE: 'Présentez votre astuce en 30 caractères au moins.',
  RETOUR_EXPERIENCE: 'Votre retour doit compter au moins 30 caractères.',
  DISCUSSION: 'Votre sujet doit compter au moins 30 caractères.',
};

/** Rubriques d'une clinique (prototype : 10 caractères au moins, avec ses messages). */
const RUBRIQUE_MINIMUM = 10;

/** Corps de POST /api/v1/sujets et de PUT /api/v1/sujets/:id (le type ne change plus ensuite). */
export const schemaSujet = z
  .object({
    type: z.enum(TYPES_SUJET, { error: 'Choisissez le type de sujet.' }),
    titre: z
      .string({ error: 'Le titre doit compter au moins 15 caractères.' })
      .trim()
      .min(LONGUEURS.sujetTitre.min, { error: 'Le titre doit compter au moins 15 caractères.' })
      .max(LONGUEURS.sujetTitre.max, {
        error: `Le titre compte ${LONGUEURS.sujetTitre.max} caractères au plus.`,
      }),
    /** Markdown. Pour une clinique : le contexte, facultatif ; les rubriques suivent. */
    corps: champ(LONGUEURS.sujetCorps.max, TROP_LONG_CORPS),
    /** RG-62 : rubriques d'une clinique (la quatrième, « Outil et modèle », vient de l'outil). */
    clinique: z
      .object({
        prompt: champ(LONGUEURS.sujetCorps.max, TROP_LONG_CORPS),
        obtenu: champ(LONGUEURS.sujetCorps.max, TROP_LONG_CORPS),
        attendu: champ(LONGUEURS.sujetCorps.max, TROP_LONG_CORPS),
      })
      .nullish()
      .transform((clinique) => clinique ?? { prompt: '', obtenu: '', attendu: '' }),
    /** RG-61 : exemples d'une astuce, avant et après. */
    exempleAvant: champ(
      LONGUEURS.astuceExemple.max,
      `Le prompt avant compte ${nombre(LONGUEURS.astuceExemple.max)} caractères au plus.`,
    ),
    exempleApres: champ(
      LONGUEURS.astuceExemple.max,
      `Le prompt après compte ${nombre(LONGUEURS.astuceExemple.max)} caractères au plus.`,
    ),
    /** Outil et modèle du sujet : obligatoires pour une clinique (outil), facultatifs sinon. */
    outilId: facultatif(identifiant),
    modeleId: facultatif(identifiant),
    modeleNonReference: texte(100, 'Le nom du modèle compte 100 caractères au plus.'),
    /** Libellés ; une étiquette absente du référentiel y est ajoutée (CI-04). */
    etiquettes: champEtiquettes,
    /** RG-66 : création publiée dont parle le sujet. */
    creationId: facultatif(identifiant),
  })
  .superRefine((sujet, ctx) => {
    const probleme = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    // RG-60
    if (sujet.type !== 'CLINIQUE' && sujet.corps.length < LONGUEURS.sujetCorps.min)
      probleme(['corps'], CORPS_TROP_COURT[sujet.type]);
    if (sujet.type === 'CLINIQUE') {
      // RG-62 : aucune rubrique vide.
      if (sujet.clinique.prompt.length < RUBRIQUE_MINIMUM)
        probleme(['clinique', 'prompt'], 'Collez le prompt que vous avez utilisé.');
      if (sujet.clinique.obtenu.length < RUBRIQUE_MINIMUM)
        probleme(['clinique', 'obtenu'], 'Décrivez le résultat obtenu.');
      if (sujet.clinique.attendu.length < RUBRIQUE_MINIMUM)
        probleme(['clinique', 'attendu'], 'Décrivez le résultat attendu.');
      if (!sujet.outilId) probleme(['outilId'], 'Indiquez l’outil utilisé.');
    }
    if (sujet.type === 'ASTUCE') {
      // RG-61
      if (sujet.exempleAvant.length < LONGUEURS.astuceExemple.min)
        probleme(['exempleAvant'], 'Le prompt avant doit compter au moins 20 caractères.');
      if (sujet.exempleApres.length < LONGUEURS.astuceExemple.min)
        probleme(['exempleApres'], 'Le prompt après doit compter au moins 20 caractères.');
    }
    // Comme une configuration (RG-14) : un modèle du référentiel ou en texte libre, avec son outil.
    if (sujet.modeleId && sujet.modeleNonReference)
      probleme(
        ['modeleNonReference'],
        'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      );
    if ((sujet.modeleId || sujet.modeleNonReference) && !sujet.outilId)
      probleme(['outilId'], 'Indiquez l’outil de ce modèle.');
    // RG-60 : une à cinq étiquettes (le maximum est contrôlé par le champ).
    if (!sujet.etiquettes.length) probleme(['etiquettes'], 'Ajoutez au moins une étiquette.');
  })
  .transform((sujet) => ({
    ...sujet,
    clinique: sujet.type === 'CLINIQUE' ? sujet.clinique : null,
    exempleAvant: sujet.type === 'ASTUCE' ? sujet.exempleAvant : null,
    exempleApres: sujet.type === 'ASTUCE' ? sujet.exempleApres : null,
  }));
export type SujetSaisi = z.input<typeof schemaSujet>;
export type SaisieSujet = z.output<typeof schemaSujet>;

/** Corps de POST /api/v1/sujets/:id/messages et de PATCH /api/v1/messages/:id (RG-64). */
export const schemaMessage = z
  .object({
    corps: z
      .string({ error: 'Écrivez au moins 20 caractères pour que votre réponse soit utile.' })
      .trim()
      .min(LONGUEURS.reponseForum.min, {
        error: 'Écrivez au moins 20 caractères pour que votre réponse soit utile.',
      })
      .max(LONGUEURS.reponseForum.max, {
        error: `Votre réponse compte ${nombre(LONGUEURS.reponseForum.max)} caractères au plus.`,
      }),
    /** Prompt proposé ou corrigé, cité après le texte. */
    prompt: texte(LONGUEURS.reponseForum.max, 'Ce prompt est trop long.'),
  })
  .superRefine((saisie, ctx) => {
    if (composerMessage(saisie.corps, saisie.prompt).length > LONGUEURS.reponseForum.max)
      ctx.addIssue({
        code: 'custom',
        path: ['prompt'],
        message: `Votre réponse et son prompt comptent ${nombre(LONGUEURS.reponseForum.max)} caractères au plus.`,
      });
  });
export type SaisieMessage = z.output<typeof schemaMessage>;

/** Tris de la liste (prototype : onglets Récentes, Actives, Sans réponse, Plus utiles, et le tri
    « Les plus reproduits » du filtre). */
export const TRIS_SUJETS = ['recents', 'actifs', 'anciens', 'utiles', 'reproduits'] as const;
export type TriSujets = (typeof TRIS_SUJETS)[number];

/** Paramètres de GET /api/v1/sujets. */
export const schemaFiltresSujets = z.object({
  /** Recherche plein texte (RG-31). */
  q: z
    .string()
    .trim()
    .max(200, { error: 'Votre recherche compte 200 caractères au plus.' })
    .optional()
    .transform((valeur) => valeur || null),
  type: parametreListe('Ce type de sujet n’existe pas.').pipe(
    z.array(z.enum(TYPES_SUJET, { error: 'Ce type de sujet n’existe pas.' })),
  ),
  /** Adresse (slug) d'une étiquette. */
  etiquette: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((valeur) => valeur || null),
  /** Adresses (slug) d'outils : l'un d'eux (« Sur mes outils »). */
  outil: parametreListe('Cet outil est introuvable.').pipe(
    z.array(z.string().max(80)).max(20, { error: 'Choisissez 20 outils au plus.' }),
  ),
  /** Pseudo d'un membre : ses sujets et ceux où il a répondu. */
  membre: z
    .string()
    .trim()
    .max(LONGUEURS.pseudo.max)
    .optional()
    .transform((valeur) => valeur || null),
  /** Sans réponse d'un autre membre que l'auteur. */
  sansReponse: parametreBooleen,
  /** Question ou clinique sans réponse acceptée (RG-63). */
  sansReponseAcceptee: parametreBooleen,
  /** Astuce, ou réponse qui propose un prompt (« Avec un prompt corrigé »). */
  avecPrompt: parametreBooleen,
  /** Onglet « Sans réponse » : ouvert, et personne d'autre que l'auteur n'y a répondu. */
  enAttente: parametreBooleen,
  tri: z.enum(TRIS_SUJETS, { error: 'Ce tri n’existe pas.' }).default('recents'),
  page: parametrePage,
});
export type FiltresSujets = z.output<typeof schemaFiltresSujets>;
