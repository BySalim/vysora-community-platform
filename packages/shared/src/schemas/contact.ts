import { z } from 'zod';
import { MOTIFS_CONTACT } from '../enums';
import { LONGUEURS } from '../regles';
import { champEmail } from './commun';

/* Formulaire Contact (prototype/contact.html) : point de contact unique de Vysora,
   ouvert sans compte, y compris pour signaler un contenu illicite. */

export const schemaMessageContact = z
  .object({
    motif: z.enum(MOTIFS_CONTACT, { error: 'Choisissez l’objet de votre message.' }),
    nom: z
      .string({ error: 'Indiquez votre nom.' })
      .trim()
      .min(1, { error: 'Indiquez votre nom.' })
      .max(LONGUEURS.contactNom.max, { error: 'Votre nom est trop long.' }),
    email: champEmail,
    /** Adresse du contenu (signalement) ou référence de la décision (contestation). */
    contenu: z
      .string()
      .trim()
      .max(LONGUEURS.url.max, { error: 'Cette adresse est trop longue.' })
      .optional()
      .transform((valeur) => valeur || undefined),
    message: z
      .string({ error: 'Écrivez votre message.' })
      .trim()
      .min(1, { error: 'Écrivez votre message.' })
      .min(LONGUEURS.contactMessage.min, {
        error: `Précisez votre message : ${LONGUEURS.contactMessage.min} caractères au moins.`,
      })
      .max(LONGUEURS.contactMessage.max, {
        error: `Votre message compte ${LONGUEURS.contactMessage.max} caractères au plus.`,
      }),
    bonneFoi: z.boolean().optional(),
    /** Champ invisible : rempli seulement par les robots. */
    siteWeb: z.string().max(200).optional(),
  })
  .superRefine((valeur, ctx) => {
    if (valeur.motif !== 'SIGNALEMENT') return;
    if (!valeur.contenu) {
      ctx.addIssue({
        code: 'custom',
        path: ['contenu'],
        message: 'Indiquez l’adresse du contenu à signaler.',
      });
    } else if (!/^https?:\/\/\S+$/.test(valeur.contenu)) {
      ctx.addIssue({
        code: 'custom',
        path: ['contenu'],
        message: 'Cette adresse ne semble pas valide. Copiez-la depuis la barre d’adresse.',
      });
    }
    if (valeur.bonneFoi !== true) {
      ctx.addIssue({
        code: 'custom',
        path: ['bonneFoi'],
        message: 'Cochez la déclaration pour envoyer le signalement.',
      });
    }
  });

export type MessageContactSaisi = z.input<typeof schemaMessageContact>;
export type MessageContact = z.output<typeof schemaMessageContact>;

/** Réponse de POST /api/v1/contact. */
export interface MessageContactEnvoye {
  reference: string;
}

/** Ce qui se passe ensuite, selon l'objet du message (écran de confirmation et accusé de réception). */
export const SUITE_CONTACT: Record<MessageContact['motif'], string> = {
  QUESTION: 'Nous vous répondons par e-mail dans les meilleurs délais.',
  DONNEES:
    'Nous vous répondons par e-mail dans un délai d’un mois au plus. Nous pouvons vous demander de justifier de votre identité.',
  SIGNALEMENT:
    'La modération l’examine en visant un délai de 72 heures. Nous vous informerons par e-mail de la suite donnée.',
  CONTESTATION:
    'Un modérateur qui n’a pas pris la décision initiale l’examine. Nous vous répondons par e-mail sous 15 jours.',
  AUTRE: 'Nous vous répondons par e-mail dans les meilleurs délais.',
};
