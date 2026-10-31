import { z } from 'zod';
import {
  MODES_SELECTION,
  NATURES_RESULTAT,
  TYPES_CREATION,
  TYPES_LIEN_EXTERNE,
  TYPES_MOMENT_CLE,
} from '../enums';
import { LIMITES, LONGUEURS } from '../regles';
import { slugifier } from '../texte';

/* Enregistrement d'une création (CREA-05, F-10 à F-17). Un brouillon peut être incomplet : ce schéma
   ne contrôle que les longueurs et quantités maximales (RG-10, RG-15, RG-16), le format des liens
   (HTTPS) et la cohérence des renvois internes. Les règles de publication (RG-10 à RG-16, résultat
   décidé le 24 octobre) sont dans `controlerPublication` (publication.ts).
   Le contenu est envoyé en entier à chaque enregistrement. Une étape ou un échange déjà enregistré
   garde son identifiant (`id`) : il est mis à jour plutôt que recréé, ce qui conserve les images de
   l'échange et les commentaires qui s'y rattachent. Configurations, moments clés, liens et
   étiquettes sont réécrits. Dans une étape, un échange désigne sa configuration et un moment clé
   son échange par leur rang (à partir de 0). */

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

/** Texte facultatif : espaces retirés aux extrémités ; vide, il devient null. */
const texte = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .max(max, { error: message })
    .nullish()
    .transform((valeur) => valeur || null);

const identifiant = z.number({ error: 'Cet élément est introuvable.' }).int().positive();
const facultatif = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((valeur) => valeur ?? null);
const rang = z.number({ error: 'Ce renvoi est invalide.' }).int().min(0);

export const schemaConfigurationSaisie = z
  .object({
    outilId: facultatif(identifiant),
    modeleId: facultatif(identifiant),
    modeleNonReference: texte(100, 'Le nom du modèle compte 100 caractères au plus.'),
    parametres: texte(
      LONGUEURS.configurationParametres.max,
      `Les réglages comptent ${nombre(LONGUEURS.configurationParametres.max)} caractères au plus.`,
    ),
    contexteCache: texte(
      LONGUEURS.configurationContexteCache.max,
      `Le contexte compte ${nombre(LONGUEURS.configurationContexteCache.max)} caractères au plus.`,
    ),
  })
  .superRefine((configuration, ctx) => {
    // RG-14 : un modèle du référentiel, ou en texte libre s'il en est absent, jamais les deux.
    if (configuration.modeleId && configuration.modeleNonReference)
      ctx.addIssue({
        code: 'custom',
        path: ['modeleNonReference'],
        message: 'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      });
  });

export const schemaEchangeSaisi = z
  .object({
    id: identifiant.optional(),
    titre: texte(
      LONGUEURS.echangeTitre.max,
      `Le titre du prompt compte ${LONGUEURS.echangeTitre.max} caractères au plus.`,
    ),
    prompt: texte(LONGUEURS.prompt.max, 'Ce prompt est trop long.'),
    reponse: texte(LONGUEURS.reponseIa.max, 'Cette réponse est trop longue.'),
    nbEssais: z
      .number({ error: 'Indiquez le nombre d’essais.' })
      .int({ error: 'Indiquez le nombre d’essais.' })
      .min(1, { error: 'Indiquez au moins un essai.' })
      .max(LIMITES.essaisParEchange, {
        error: `Indiquez ${nombre(LIMITES.essaisParEchange)} essais au plus.`,
      })
      .default(1),
    modeSelection: z.enum(MODES_SELECTION).default('PREMIER_ESSAI'),
    configuration: facultatif(rang),
    /** Images jointes à l'échange (JOINDRE), dans l'ordre. */
    images: z.array(identifiant).default([]),
  })
  // RG-11 : un seul essai, c'est forcément le premier.
  .transform((echange) => ({
    ...echange,
    modeSelection: echange.nbEssais > 1 ? echange.modeSelection : ('PREMIER_ESSAI' as const),
  }));

export const schemaMomentSaisi = z.object({
  type: z.enum(TYPES_MOMENT_CLE, { error: 'Choisissez le type du moment clé.' }),
  titre: texte(
    LONGUEURS.momentCleTitre.max,
    `Le titre du moment clé compte ${LONGUEURS.momentCleTitre.max} caractères au plus.`,
  ),
  explication: texte(
    LONGUEURS.momentCleExplication.max,
    `L’explication compte ${nombre(LONGUEURS.momentCleExplication.max)} caractères au plus.`,
  ),
  /** Échange marqué, par son rang dans l'étape ; null : le moment porte sur l'étape. */
  echange: facultatif(rang),
});

export const schemaEtapeSaisie = z
  .object({
    id: identifiant.optional(),
    titre: texte(
      LONGUEURS.etapeTitre.max,
      `Le titre de l’étape compte ${LONGUEURS.etapeTitre.max} caractères au plus.`,
    ),
    recit: texte(
      LONGUEURS.etapeRecit.max,
      `Le récit de l’étape compte ${nombre(LONGUEURS.etapeRecit.max)} caractères au plus.`,
    ),
    configurations: z
      .array(schemaConfigurationSaisie)
      .max(LIMITES.configurationsParEtape, {
        error: `Gardez ${LIMITES.configurationsParEtape} outils au plus par étape.`,
      })
      .default([]),
    echanges: z
      .array(schemaEchangeSaisi)
      .max(LIMITES.echangesParEtape, {
        error: `Gardez ${LIMITES.echangesParEtape} prompts au plus par étape.`,
      })
      .default([]),
    moments: z
      .array(schemaMomentSaisi)
      .max(LIMITES.momentsParEtape, {
        error: `Gardez ${LIMITES.momentsParEtape} moments clés au plus par étape.`,
      })
      .default([]),
  })
  .superRefine((etape, ctx) => {
    etape.echanges.forEach((echange, i) => {
      if (echange.configuration !== null && echange.configuration >= etape.configurations.length)
        ctx.addIssue({
          code: 'custom',
          path: ['echanges', i, 'configuration'],
          message: 'Choisissez un des outils de cette étape.',
        });
    });
    // RG-15 : le moment clé vise un échange de la même étape, et un échange en porte un au plus.
    const marques = new Set<number>();
    etape.moments.forEach((moment, i) => {
      if (moment.echange === null) return;
      if (moment.echange >= etape.echanges.length)
        ctx.addIssue({
          code: 'custom',
          path: ['moments', i, 'echange'],
          message: 'Ce moment clé vise un prompt absent de l’étape.',
        });
      else if (marques.has(moment.echange))
        ctx.addIssue({
          code: 'custom',
          path: ['moments', i, 'echange'],
          message: 'Un prompt porte un seul moment clé.',
        });
      marques.add(moment.echange);
    });
  });

export const schemaLienSaisi = z.object({
  type: z.enum(TYPES_LIEN_EXTERNE, { error: 'Choisissez le type du lien.' }),
  url: z
    .string({ error: 'Saisissez l’adresse du lien, ou retirez-le.' })
    .trim()
    .min(1, { error: 'Saisissez l’adresse du lien, ou retirez-le.' })
    .max(LONGUEURS.url.max, { error: 'Cette adresse est trop longue.' })
    // RG-16 : HTTPS seulement (prototype : lienValide).
    .regex(/^https:\/\/[^\s/$.?#]\S*$/, { error: 'L’adresse doit commencer par https://.' }),
  libelle: texte(
    LONGUEURS.lienLibelle.max,
    `Le libellé du lien compte ${LONGUEURS.lienLibelle.max} caractères au plus.`,
  ),
});

/** Résultat en texte ou en code, au niveau de la création (décision du 24 octobre). Le texte garde
    ses retraits (code) ; un texte vide retire le résultat. */
export const schemaResultatSaisi = z
  .object({
    nature: z.enum(NATURES_RESULTAT, { error: 'Choisissez entre texte et code.' }),
    texte: z
      .string({ error: 'Collez le texte obtenu, ou retirez ce bloc.' })
      .max(LONGUEURS.resultatTexte.max, { error: 'Ce résultat est trop long.' })
      .transform((valeur) => valeur.replace(/^\s*\n/, '').trimEnd()),
    nom: texte(
      LONGUEURS.resultatNom.max,
      `Le nom du fichier compte ${LONGUEURS.resultatNom.max} caractères au plus.`,
    ),
  })
  .nullish()
  .transform((resultat) => (resultat?.texte ? resultat : null));

export const champEtiquettes = z
  .array(
    z
      .string({ error: 'Saisissez une étiquette.' })
      .trim()
      .min(1, { error: 'Saisissez une étiquette.' })
      .max(LONGUEURS.etiquette.max, {
        error: `Une étiquette compte ${LONGUEURS.etiquette.max} caractères au plus.`,
      })
      .refine((libelle) => slugifier(libelle) !== '', {
        error: 'Utilisez des lettres ou des chiffres dans chaque étiquette.',
      })
      .transform((libelle) => libelle.replace(/\s+/g, ' ')),
  )
  .default([])
  // Une même étiquette saisie deux fois (à la casse près) ne compte qu'une fois.
  .transform((libelles) =>
    libelles.filter(
      (libelle, i) =>
        libelles.findIndex((autre) => autre.toLowerCase() === libelle.toLowerCase()) === i,
    ),
  )
  .pipe(
    z.array(z.string()).max(LIMITES.etiquettesParContenu, {
      error: `Gardez ${LIMITES.etiquettesParContenu} étiquettes au plus.`,
    }),
  );

/** Corps de POST /api/v1/creations et de PUT /api/v1/creations/:id. */
export const schemaContenuCreation = z
  .object({
    /** RG-18 : ne change plus une fois la création publiée. */
    type: z.enum(TYPES_CREATION, { error: 'Choisissez le type de la création.' }),
    titre: texte(
      LONGUEURS.creationTitre.max,
      `Le titre compte ${LONGUEURS.creationTitre.max} caractères au plus.`,
    ),
    objectif: texte(
      LONGUEURS.creationObjectif.max,
      `L’objectif compte ${nombre(LONGUEURS.creationObjectif.max)} caractères au plus.`,
    ),
    limites: texte(
      LONGUEURS.creationLimites.max,
      `Les limites constatées comptent ${nombre(LONGUEURS.creationLimites.max)} caractères au plus.`,
    ),
    formatResultat: texte(
      LONGUEURS.formatResultat.max,
      `Le format compte ${LONGUEURS.formatResultat.max} caractères au plus.`,
    ),
    aAdapter: z
      .array(
        z
          .string({ error: 'Décrivez ce qu’il faut adapter.' })
          .trim()
          .max(LONGUEURS.pointAAdapter.max, {
            error: `Chaque point à adapter compte ${LONGUEURS.pointAAdapter.max} caractères au plus.`,
          }),
      )
      .max(LIMITES.pointsAAdapter, {
        error: `Gardez ${LIMITES.pointsAAdapter} points à adapter au plus.`,
      })
      .default([])
      .transform((points) => points.filter(Boolean)),
    categorieId: facultatif(identifiant),
    /** Licence choisie ; à défaut, la licence par défaut (F-17). */
    licenceId: facultatif(identifiant),
    /** Libellés ; une étiquette absente du référentiel y est ajoutée (CI-04). */
    etiquettes: champEtiquettes,
    /** RG-23 : avertissement « instructions pour agent » posé par l'auteur. */
    instructionsAgent: z.boolean().default(false),
    resultat: schemaResultatSaisi,
    /** Images du résultat (ILLUSTRER), dans l'ordre, déjà téléversées (POST /api/v1/medias). */
    images: z.array(identifiant).default([]),
    liens: z
      .array(schemaLienSaisi)
      .max(LIMITES.liensParCreation, { error: `Gardez ${LIMITES.liensParCreation} liens au plus.` })
      .default([]),
    etapes: z
      .array(schemaEtapeSaisie)
      .max(LIMITES.etapesParCreation, {
        error: `Gardez ${LIMITES.etapesParCreation} étapes au plus.`,
      })
      .default([]),
    /** RG-17 : case cochée pour publier les modifications d'une création publiée. */
    confirmationDonnees: z.boolean().default(false),
  })
  .superRefine((contenu, ctx) => {
    // RG-16 : 20 images par création, celles de ses échanges comprises ; une image sert une fois.
    const toutes = [
      ...contenu.images,
      ...contenu.etapes.flatMap((etape) => etape.echanges.flatMap((echange) => echange.images)),
    ];
    if (toutes.length > LIMITES.imagesParCreation)
      ctx.addIssue({
        code: 'custom',
        path: ['images'],
        message: `Gardez ${LIMITES.imagesParCreation} images au plus pour une création.`,
      });
    if (new Set(toutes).size !== toutes.length)
      ctx.addIssue({
        code: 'custom',
        path: ['images'],
        message: 'Une même image ne peut servir qu’une fois.',
      });
  });
export type ContenuCreationSaisi = z.input<typeof schemaContenuCreation>;
export type ContenuCreation = z.output<typeof schemaContenuCreation>;

/** Corps de POST /api/v1/creations/:id/publication. */
export const schemaPublicationCreation = z.object({
  confirmationDonnees: z.boolean().default(false),
});
export type PublicationCreation = z.output<typeof schemaPublicationCreation>;

/** PUT /api/v1/defis/:id/participation (F-64, RG-74) : la création inscrite au défi. */
export const schemaParticipationDefi = z.object({
  creationId: z.coerce
    .number({ error: 'Choisissez une création.' })
    .int({ error: 'Choisissez une création.' })
    .positive({ error: 'Choisissez une création.' }),
});
export type ParticipationDefi = z.output<typeof schemaParticipationDefi>;
