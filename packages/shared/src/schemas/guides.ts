import { z } from 'zod';
import { LONGUEURS } from '../regles';

/* Explorer (DEC-01) : signaler un piège, cocher sa liste de contrôle, chercher un parcours.
   Messages du prototype (explorer.html, explorer.js). */

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
