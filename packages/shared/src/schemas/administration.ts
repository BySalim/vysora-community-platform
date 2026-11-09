import { z } from 'zod';
import { DOMAINES_AUDIT } from '../audit';
import {
  ACTIONS_DECISION,
  FAMILLES_OUTIL,
  ROLES,
  TYPES_DOCUMENT_LEGAL,
  TYPES_OUTIL,
} from '../enums';
import { DELAIS, LONGUEURS } from '../regles';
import { MOTIF_EMAIL } from './commun';

/** PUT /api/v1/admin/membres/:id/role (F-96, RG-111). */
export const schemaChangementRole = z.object({
  role: z.enum(ROLES, { error: 'Choisissez un rôle.' }),
});
export type ChangementRole = z.output<typeof schemaChangementRole>;

/** POST /api/v1/admin/equipe (ADM-03) : compte de l'équipe créé par un administrateur, activé par la
    personne elle-même depuis le lien reçu à son adresse. */
export const schemaAjoutEquipe = z.object({
  email: z
    .string({ error: 'Indiquez l’adresse e-mail de la personne.' })
    .trim()
    .min(1, { error: 'Indiquez l’adresse e-mail de la personne.' })
    .max(LONGUEURS.email.max, { error: 'Cette adresse e-mail est trop longue.' })
    .regex(MOTIF_EMAIL, { error: 'Cette adresse e-mail est incomplète. Vérifiez-la.' }),
  nom: z
    .string({ error: 'Indiquez le nom de la personne.' })
    .trim()
    .min(1, { error: 'Indiquez le nom de la personne.' })
    .max(LONGUEURS.nomAffiche.max, {
      error: `Le nom compte ${LONGUEURS.nomAffiche.max} caractères au plus.`,
    })
    .regex(/^[^\p{Cc}\p{Cf}]*$/u, { error: 'Retirez les caractères invisibles du nom.' })
    .transform((nom) => nom.replace(/\s+/g, ' ')),
  role: z.enum(['MODERATEUR', 'ADMINISTRATEUR'], { error: 'Choisissez un rôle.' }),
});
export type AjoutEquipe = z.output<typeof schemaAjoutEquipe>;

/** POST /api/v1/admin/invitations (INV-01) : nombre de codes et durée de validité. */
export const schemaCreationInvitations = z.object({
  nombre: z.coerce
    .number({ error: 'Indiquez un nombre de codes.' })
    .int({ error: 'Indiquez un nombre entier.' })
    .min(1, { error: 'Créez au moins un code.' })
    .max(50, { error: 'Créez 50 codes au plus à la fois.' }),
  joursValidite: z.coerce
    .number({ error: 'Indiquez une durée en jours.' })
    .int({ error: 'Indiquez un nombre entier de jours.' })
    .min(1, { error: 'Un code reste valable au moins un jour.' })
    .max(365, { error: 'Un code reste valable un an au plus.' })
    .nullish()
    .transform((jours) => jours ?? null),
});
export type CreationInvitations = z.output<typeof schemaCreationInvitations>;

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez une date au format AAAA-MM-JJ.' })
  .optional()
  .or(z.literal('').transform(() => undefined));
const pseudo = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((valeur) => valeur || undefined);

/** Filtres du journal des décisions (EC-21, F-92) : modérateur, membre, action et période. */
export const schemaFiltresDecisions = z.object({
  moderateur: pseudo,
  membre: pseudo,
  action: z
    .enum(ACTIONS_DECISION)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  du: date,
  au: date,
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});
export type FiltresDecisions = z.output<typeof schemaFiltresDecisions>;

/** Filtres du journal d'audit (ENF-09) : domaine de l'administration, auteur et période. */
export const schemaFiltresAudit = z.object({
  domaine: z
    .enum(DOMAINES_AUDIT)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  acteur: pseudo,
  du: date,
  au: date,
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});
export type FiltresAudit = z.output<typeof schemaFiltresAudit>;

const MS_JOUR = 86_400_000;
const dateHeure = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/, {
      error: message,
    })
    .transform((valeur) => new Date(/Z|[+-]\d{2}:\d{2}$/.test(valeur) ? valeur : `${valeur}Z`));

/** POST /api/v1/admin/defis (F-63, RG-73) : un défi en brouillon ; dates en UTC. */
export const schemaDefi = z
  .object({
    titre: z
      .string({ error: 'Donnez un titre au défi.' })
      .trim()
      .min(5, { error: 'Le titre compte au moins 5 caractères.' })
      .max(150, { error: 'Le titre compte 150 caractères au plus.' }),
    enonce: z
      .string({ error: 'Rédigez l’énoncé du défi.' })
      .trim()
      .min(20, { error: 'L’énoncé compte au moins 20 caractères.' })
      .max(2000, { error: 'L’énoncé compte 2 000 caractères au plus.' }),
    /** Une contrainte par ligne. */
    contraintes: z
      .string()
      .trim()
      .max(2000, { error: 'Les contraintes comptent 2 000 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
    dateDebut: dateHeure('Indiquez la date de début.'),
    dateFin: dateHeure('Indiquez la date de fin.'),
  })
  .superRefine((d, ctx) => {
    const jours = (d.dateFin.getTime() - d.dateDebut.getTime()) / MS_JOUR;
    if (jours < DELAIS.defiJours.min || jours > DELAIS.defiJours.max)
      ctx.addIssue({
        code: 'custom',
        path: ['dateFin'],
        message: `Un défi dure de ${DELAIS.defiJours.min} à ${DELAIS.defiJours.max} jours.`,
      });
  });
export type SaisieDefi = z.output<typeof schemaDefi>;

/** POST /api/v1/admin/outils (F-95) : un outil, et son éditeur s'il est nouveau. */
export const schemaOutil = z.object({
  nom: z
    .string({ error: 'Indiquez le nom de l’outil.' })
    .trim()
    .min(2, { error: 'Le nom compte au moins 2 caractères.' })
    .max(100, { error: 'Le nom compte 100 caractères au plus.' }),
  editeur: z
    .string({ error: 'Indiquez l’éditeur de l’outil.' })
    .trim()
    .min(2, { error: 'L’éditeur compte au moins 2 caractères.' })
    .max(100, { error: 'L’éditeur compte 100 caractères au plus.' }),
  type: z.enum(TYPES_OUTIL, { error: 'Choisissez le type de l’outil.' }),
  famille: z.enum(FAMILLES_OUTIL, { error: 'Choisissez la famille de l’outil.' }),
});
export type SaisieOutil = z.output<typeof schemaOutil>;

/** POST /api/v1/admin/outils/:id/modeles (F-95) : un modèle proposé avec cet outil. */
export const schemaModele = z.object({
  nom: z
    .string({ error: 'Indiquez le nom complet du modèle.' })
    .trim()
    .min(2, { error: 'Le nom compte au moins 2 caractères.' })
    .max(100, { error: 'Le nom compte 100 caractères au plus.' }),
  nomCourt: z
    .string({ error: 'Indiquez le nom court du modèle.' })
    .trim()
    .min(1, { error: 'Indiquez le nom court du modèle.' })
    .max(60, { error: 'Le nom court compte 60 caractères au plus.' }),
  dateSortie: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez une date au format AAAA-MM-JJ.' })
    .nullish()
    .or(z.literal('').transform(() => null))
    .transform((valeur) => valeur || null),
});
export type SaisieModele = z.output<typeof schemaModele>;

/** PUT /api/v1/admin/editeurs/:id (F-95) : le nouveau nom s'affiche partout où l'éditeur apparaît. */
export const schemaNomEditeur = z.object({
  nom: z
    .string({ error: 'Indiquez le nom de l’éditeur.' })
    .trim()
    .min(1, { error: 'Indiquez le nom de l’éditeur.' })
    .min(2, { error: 'Le nom compte au moins 2 caractères.' })
    .max(100, { error: 'Le nom compte 100 caractères au plus.' }),
});
export type NomEditeur = z.output<typeof schemaNomEditeur>;

/** PUT /api/v1/admin/categories/ordre et /licences/ordre : tous les éléments du référentiel,
    archivés compris, dans le nouvel ordre d'affichage. */
export const schemaOrdreReferentiel = z.object({
  ids: z
    .array(z.number().int().positive(), { error: 'Indiquez l’ordre des éléments.' })
    .min(1, { error: 'Indiquez l’ordre des éléments.' })
    .max(200, { error: 'Le référentiel compte 200 éléments au plus.' })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: 'Chaque élément figure une seule fois.',
    }),
});
export type OrdreReferentiel = z.output<typeof schemaOrdreReferentiel>;

/** PATCH d'un outil ou d'un modèle (RG-110) : archivé ou retiré, il reste affiché sur les contenus. */
export const schemaStatutOutil = z.object({
  statut: z.enum(['ACTIF', 'ARCHIVE'], { error: 'Choisissez un statut.' }),
});
export const schemaStatutModele = z.object({
  statut: z.enum(['DISPONIBLE', 'RETIRE'], { error: 'Choisissez un statut.' }),
});

/** PATCH d'un éditeur, d'une catégorie, d'une licence, d'une étiquette ou d'un badge (RG-110) :
    archivé, l'élément reste affiché sur les contenus qui le citent et n'est plus proposé (un badge
    n'est plus attribué). */
export const schemaEtatReferentiel = z.object({
  actif: z.boolean({ error: 'Indiquez si l’élément est proposé.' }),
});
export type EtatReferentiel = z.output<typeof schemaEtatReferentiel>;

/** Icônes du sprite proposées pour une catégorie (charte 13.2) : celles du prototype et d'autres
    pictogrammes de domaine. */
export const ICONES_CATEGORIE = [
  'browser',
  'image',
  'pen',
  'code',
  'flow',
  'chart',
  'film',
  'music',
  'school',
  'shapes',
  'book',
  'box',
  'camera',
  'compass',
  'doc',
  'globe',
  'grid',
  'heart',
  'layers',
  'mail',
  'message',
  'monitor',
  'phone',
  'scale',
  'sparkle',
  'tableur',
  'terminal',
  'users',
  'wrench',
] as const;
export type IconeCategorie = (typeof ICONES_CATEGORIE)[number];

/** POST et PUT /api/v1/admin/categories (F-95) : l'adresse de la page du domaine se tire du premier
    libellé et ne change plus ensuite. */
export const schemaCategorie = z.object({
  libelle: z
    .string({ error: 'Indiquez le libellé de la catégorie.' })
    .trim()
    .min(1, { error: 'Indiquez le libellé de la catégorie.' })
    .min(2, { error: 'Le libellé compte au moins 2 caractères.' })
    .max(60, { error: 'Le libellé compte 60 caractères au plus.' }),
  icone: z.enum(ICONES_CATEGORIE, { error: 'Choisissez une icône.' }),
  description: z
    .string({ error: 'Rédigez la présentation du domaine.' })
    .trim()
    .min(1, { error: 'Rédigez la présentation du domaine.' })
    .min(20, { error: 'La présentation compte au moins 20 caractères.' })
    .max(300, { error: 'La présentation compte 300 caractères au plus.' }),
});
export type SaisieCategorie = z.output<typeof schemaCategorie>;

const libelleLicence = z
  .string({ error: 'Indiquez le libellé de la licence.' })
  .trim()
  .min(1, { error: 'Indiquez le libellé de la licence.' })
  .min(2, { error: 'Le libellé compte au moins 2 caractères.' })
  .max(100, { error: 'Le libellé compte 100 caractères au plus.' });
const resumeLicence = z
  .string({ error: 'Résumez ce que la licence permet.' })
  .trim()
  .min(1, { error: 'Résumez ce que la licence permet.' })
  .min(10, { error: 'Le résumé compte au moins 10 caractères.' })
  .max(200, { error: 'Le résumé compte 200 caractères au plus.' });
/** Texte de la licence : une adresse https, ou une page du site (« /cgu#licences »). */
const adresseLicence = z
  .string({ error: 'Indiquez l’adresse du texte de la licence.' })
  .trim()
  .min(1, { error: 'Indiquez l’adresse du texte de la licence.' })
  .max(2048, { error: 'L’adresse compte 2 048 caractères au plus.' })
  .superRefine((valeur, ctx) => {
    if (/^\/(?!\/)\S*$/.test(valeur)) return;
    let url: URL | null;
    try {
      url = new URL(valeur);
    } catch {
      url = null;
    }
    if (!url || !url.hostname.includes('.') || /\s/.test(valeur))
      ctx.addIssue({
        code: 'custom',
        message: 'Indiquez une adresse complète (https://…) ou une page du site (/cgu#licences).',
      });
    else if (url.protocol !== 'https:')
      ctx.addIssue({ code: 'custom', message: 'Utilisez une adresse sécurisée, en https.' });
  });

/** PUT /api/v1/admin/licences/:id : le code et les variantes permises définissent la licence et
    ne changent plus (les créations publiées sous cette licence restent sous ses conditions). */
export const schemaModificationLicence = z.object({
  libelle: libelleLicence,
  resume: resumeLicence,
  url: adresseLicence,
});
export type ModificationLicence = z.output<typeof schemaModificationLicence>;

/** POST /api/v1/admin/licences (F-17, F-95). */
export const schemaLicence = schemaModificationLicence.extend({
  code: z
    .string({ error: 'Indiquez le code de la licence.' })
    .trim()
    .min(1, { error: 'Indiquez le code de la licence.' })
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9.-]{1,29}$/, {
      error: 'Le code compte 2 à 30 lettres, chiffres, points ou tirets (CC-BY-4.0).',
    }),
  autoriseVariantes: z.boolean({ error: 'Indiquez si la licence permet les variantes.' }),
});
export type SaisieLicence = z.output<typeof schemaLicence>;

/** GET /api/v1/admin/etiquettes?q=&etat=&page= */
export const schemaFiltresEtiquettes = z.object({
  q: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((valeur) => valeur || undefined),
  etat: z
    .enum(['proposees', 'archivees'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});
export type FiltresEtiquettes = z.output<typeof schemaFiltresEtiquettes>;

/** POST /api/v1/admin/documents-legaux (EC-25, RG-112) : nouvelle version d'un document, nommée par
    sa date d'effet. Les conditions et la charte s'acceptent : leur résumé des changements est montré
    aux membres qui acceptent la nouvelle version (RG-03). */
export const schemaVersionDocumentLegal = z
  .object({
    type: z.enum(TYPES_DOCUMENT_LEGAL, { error: 'Choisissez le document.' }),
    dateEffet: z
      .string({ error: 'Indiquez la date d’effet.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Indiquez la date d’effet.' }),
    resumeChangements: z
      .string()
      .trim()
      .max(500, { error: 'Le résumé compte 500 caractères au plus.' })
      .nullish()
      .transform((valeur) => valeur || null),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'CONFIDENTIALITE' && (v.resumeChangements?.length ?? 0) < 10)
      ctx.addIssue({
        code: 'custom',
        path: ['resumeChangements'],
        message:
          'Résumez ce qui change : les membres le lisent avant d’accepter la nouvelle version.',
      });
  });
export type SaisieVersionDocumentLegal = z.output<typeof schemaVersionDocumentLegal>;
