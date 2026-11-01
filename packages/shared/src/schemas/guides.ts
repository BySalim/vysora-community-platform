import { z } from 'zod';
import { LIMITES, LONGUEURS } from '../regles';

/* Explorer (DEC-01) : signaler un piège, cocher sa liste de contrôle, chercher un parcours.
   Messages du prototype (explorer.html, explorer.js). Administration des guides (DEC-02) en fin de
   fichier. */

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

/** Adresse d'un guide (/explorer?guide=rendez-vous) : lettres minuscules, chiffres et tirets. */
export const MOTIF_SLUG_GUIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TITRE_COURT = 'Décrivez le piège en une phrase d’au moins 15 caractères.';

/** Corps de POST /api/v1/guides/:slug/propositions (« Signaler un piège »). */
export const schemaPropositionPiege = z.object({
  titre: z
    .string({ error: TITRE_COURT })
    .trim()
    // Le prototype retire le point final de la phrase saisie.
    .transform((valeur) => valeur.replace(/[.\s]+$/, ''))
    .pipe(
      z
        .string()
        .min(LONGUEURS.propositionPiegeTitre.min, { error: TITRE_COURT })
        .max(LONGUEURS.propositionPiegeTitre.max, {
          error: `Décrivez le piège en ${nombre(LONGUEURS.propositionPiegeTitre.max)} caractères au plus.`,
        }),
    ),
  solution: texte(
    LONGUEURS.propositionPiegeSolution.max,
    `Ce qui a fonctionné compte ${nombre(LONGUEURS.propositionPiegeSolution.max)} caractères au plus.`,
  ),
  etapeId: identifiant.nullish().transform((valeur) => valeur ?? null),
  outil: texte(
    LONGUEURS.propositionPiegeOutil.max,
    `L’outil et le modèle comptent ${LONGUEURS.propositionPiegeOutil.max} caractères au plus.`,
  ),
});
export type PropositionPiegeSaisie = z.infer<typeof schemaPropositionPiege>;

/** Corps de PUT /api/v1/guides/:slug/liste : éléments cochés de « Ma liste de contrôle ». */
export const schemaListeControle = z.object({
  etapes: z.array(identifiant).max(100),
  pieges: z.array(identifiant).max(100),
});
export type ListeControleSaisie = z.infer<typeof schemaListeControle>;

/** Paramètres de GET /api/v1/recherche/creations. */
export const schemaRechercheCreations = z.object({
  q: z
    .string({ error: 'Indiquez ce que vous cherchez.' })
    .trim()
    .min(1, { error: 'Indiquez ce que vous cherchez.' })
    .max(200, { error: 'Votre recherche compte 200 caractères au plus.' }),
});
export type RechercheCreations = z.infer<typeof schemaRechercheCreations>;

/* Administration des guides (DEC-02) : rédaction d'un guide, relecture des pièges signalés,
   « Ce que la communauté cherche encore ». Réservée aux administrateurs. */

/** Texte exigé, borné (« L’objectif compte au moins 10 caractères. »). */
const requis = (longueur: { min?: number; max: number }, vide: string, quoi: string) =>
  z
    .string({ error: vide })
    .trim()
    .min(1, { error: vide })
    .min(longueur.min ?? 1, { error: `${quoi} compte au moins ${longueur.min} caractères.` })
    .max(longueur.max, { error: `${quoi} compte ${nombre(longueur.max)} caractères au plus.` });

const domaine = z.coerce
  .number({ error: 'Choisissez le domaine du guide.' })
  .int({ error: 'Choisissez le domaine du guide.' })
  .positive({ error: 'Choisissez le domaine du guide.' });

const titreGuide = requis(LONGUEURS.guideTitre, 'Indiquez l’objectif du guide.', 'L’objectif');
const titreCourtGuide = requis(
  LONGUEURS.guideTitreCourt,
  'Indiquez le nom court du guide.',
  'Le nom court',
);

/** POST /api/v1/admin/guides : nouveau guide, en préparation. Son adresse ne change plus ensuite. */
export const schemaNouveauGuide = z.object({
  titre: titreGuide,
  titreCourt: titreCourtGuide,
  slug: z
    .string({ error: 'Indiquez l’adresse du guide.' })
    .trim()
    .min(1, { error: 'Indiquez l’adresse du guide.' })
    .max(80, { error: 'L’adresse compte 80 caractères au plus.' })
    .regex(MOTIF_SLUG_GUIDE, {
      error:
        'L’adresse ne contient que des lettres minuscules sans accent, des chiffres et des tirets.',
    }),
  categorieId: domaine,
});
export type SaisieNouveauGuide = z.output<typeof schemaNouveauGuide>;

const etapeGuide = z.object({
  /** null pour une étape ajoutée. */
  id: identifiant.nullable(),
  titre: requis(LONGUEURS.guideEtapeTitre, 'Donnez un titre à l’étape.', 'Le titre'),
  conseil: requis(LONGUEURS.guideConseil, 'Rédigez le conseil de l’étape.', 'Le conseil'),
  /** Parcours du guide qui suivent l'étape. */
  sources: z.array(identifiant).max(100),
  /** « Voir comment … l'a demandé » : un parcours du guide et son prompt, en texte exact. */
  citation: z
    .object({
      parcoursId: z.number({ error: 'Choisissez le parcours cité.' }).int().positive(),
      texte: requis(
        { max: LONGUEURS.guideCitation.max },
        'Recopiez le prompt du parcours cité.',
        'Le prompt cité',
      ),
    })
    .nullable(),
});

const piegeGuide = z.object({
  id: identifiant.nullable(),
  titre: requis(LONGUEURS.guidePiegeTitre, 'Décrivez le piège.', 'Le piège'),
  solution: requis(LONGUEURS.guideSolution, 'Indiquez ce qui a fonctionné.', 'Ce qui a fonctionné'),
  /** Position, dans `etapes`, de l'étape où le piège se présente (une étape ajoutée n'a pas encore
      d'identifiant). */
  etape: z.number().int().min(0).nullable(),
  /** Parcours du guide où il a été rencontré. */
  sources: z.array(identifiant).max(100),
  /** « Lire la discussion » : une question du guide. */
  sujetId: identifiant.nullable(),
  /** « S'entraîner sur ce piège » : un cas du guide. */
  casId: identifiant.nullable(),
});

/** PUT /api/v1/admin/guides/:id : ce que l'équipe rédige (DEC-02). Les étapes et les pièges sont
    donnés dans leur ordre ; ceux qui manquent sont retirés du guide. */
export const schemaGuide = z
  .object({
    /** Date de la version lue : une modification faite entre-temps par un autre administrateur
        n'est pas écrasée. */
    version: z.string({ error: 'Rechargez la page.' }).min(1, { error: 'Rechargez la page.' }),
    titre: titreGuide,
    titreCourt: titreCourtGuide,
    categorieId: domaine,
    /** Mots qu'une personne peut taper pour trouver l'objectif ; un doublon (sans tenir compte
        des majuscules) est retiré, la première graphie gardée. */
    motsCles: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(LONGUEURS.guideMotCle.max, {
            error: `Un mot-clé compte ${LONGUEURS.guideMotCle.max} caractères au plus.`,
          }),
      )
      .max(LIMITES.guide.motsCles, {
        error: `Un guide compte ${LIMITES.guide.motsCles} mots-clés au plus.`,
      })
      .transform((mots) =>
        mots.filter(
          (m, i) => mots.findIndex((autre) => autre.toLowerCase() === m.toLowerCase()) === i,
        ),
      ),
    /** « Ce que ce guide ne couvre pas encore ». */
    lacunes: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(LONGUEURS.guideLacune.max, {
            error: `Une lacune compte ${LONGUEURS.guideLacune.max} caractères au plus.`,
          }),
      )
      .max(LIMITES.guide.lacunes, {
        error: `Un guide compte ${LIMITES.guide.lacunes} lacunes au plus.`,
      }),
    etapes: z.array(etapeGuide).max(LIMITES.guide.etapes, {
      error: `La méthode compte ${LIMITES.guide.etapes} étapes au plus.`,
    }),
    pieges: z.array(piegeGuide).max(LIMITES.guide.pieges, {
      error: `Un guide compte ${LIMITES.guide.pieges} pièges au plus.`,
    }),
  })
  .superRefine((g, ctx) => {
    g.pieges.forEach((p, i) => {
      if (p.etape !== null && p.etape >= g.etapes.length)
        ctx.addIssue({
          code: 'custom',
          path: ['pieges', i, 'etape'],
          message: 'Choisissez une étape de la méthode.',
        });
    });
    for (const [cle, liste] of [
      ['etapes', g.etapes],
      ['pieges', g.pieges],
    ] as const) {
      const ids = liste.flatMap((x) => (x.id === null ? [] : [x.id]));
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: 'custom', path: [cle], message: 'Rechargez la page.' });
    }
  });
export type SaisieGuide = z.output<typeof schemaGuide>;

/** POST /api/v1/admin/guides/:id/contenus : parcours, question ou cas ajouté au guide. */
export const schemaContenuGuide = z.object({
  contenuId: z
    .number({ error: 'Indiquez l’adresse ou le numéro du contenu.' })
    .int({ error: 'Indiquez l’adresse ou le numéro du contenu.' })
    .positive({ error: 'Indiquez l’adresse ou le numéro du contenu.' }),
});
export type SaisieContenuGuide = z.output<typeof schemaContenuGuide>;

/** POST /api/v1/admin/propositions-pieges/:id/relecture : le piège signalé est retenu et écrit
    dans le guide (titre et solution repris par l'équipe), ou écarté. */
export const schemaRelecturePiege = z.discriminatedUnion(
  'decision',
  [
    z.object({
      decision: z.literal('RETENIR'),
      titre: requis(LONGUEURS.guidePiegeTitre, 'Décrivez le piège.', 'Le piège'),
      solution: requis(
        LONGUEURS.guideSolution,
        'Indiquez ce qui a fonctionné.',
        'Ce qui a fonctionné',
      ),
      etapeId: identifiant.nullish().transform((valeur) => valeur ?? null),
    }),
    z.object({ decision: z.literal('ECARTER') }),
  ],
  { error: 'Choisissez de retenir ou d’écarter ce piège.' },
);
export type RelecturePiege = z.output<typeof schemaRelecturePiege>;

/** Page de GET /api/v1/admin/propositions-pieges. */
export const schemaPagePropositions = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

/** POST /api/v1/admin/demandes : objectif que la communauté cherche encore. */
export const schemaDemandeGuide = z.object({
  libelle: requis(LONGUEURS.demandeGuide, 'Indiquez l’objectif cherché.', 'L’objectif'),
  categorieId: z
    .union([z.literal('').transform(() => null), z.coerce.number().int().positive()], {
      error: 'Choisissez un domaine.',
    })
    .nullish()
    .transform((valeur) => valeur ?? null),
});
export type SaisieDemandeGuide = z.output<typeof schemaDemandeGuide>;
