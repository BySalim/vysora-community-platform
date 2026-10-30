import { z } from 'zod';
import { estPseudoReserve, MESSAGES_MOT_DE_PASSE, problemeMotDePasse } from '../comptes';
import { LONGUEURS } from '../regles';
import { champEmail, champMotDePasse, champPseudo } from './commun';

/* Inscription, connexion et pseudo (F-01, F-03 ; prototype/inscription.html et connexion.html). */

/** POST /api/v1/comptes : le compte se crée avec l'adresse et le mot de passe ; le pseudo est proposé ensuite. */
export const schemaInscription = z
  .object({ email: champEmail, motDePasse: champMotDePasse })
  .superRefine((valeur, ctx) => {
    const probleme = problemeMotDePasse(valeur.motDePasse, { email: valeur.email });
    if (probleme)
      ctx.addIssue({
        code: 'custom',
        path: ['motDePasse'],
        message: MESSAGES_MOT_DE_PASSE[probleme],
      });
  });
export type Inscription = z.output<typeof schemaInscription>;

/** POST /api/v1/session. Aucune règle de composition ici : un mauvais mot de passe reçoit la réponse habituelle. */
export const schemaConnexion = z.object({
  email: champEmail,
  motDePasse: z
    .string({ error: 'Indiquez votre mot de passe.' })
    .min(1, { error: 'Indiquez votre mot de passe.' })
    .max(LONGUEURS.motDePasse.max, {
      error: `Votre mot de passe compte ${LONGUEURS.motDePasse.max} caractères au plus.`,
    }),
});
export type Connexion = z.output<typeof schemaConnexion>;

/** RG-01 : un pseudo réservé est présenté comme déjà pris. */
export const champPseudoLibre = champPseudo.refine((pseudo) => !estPseudoReserve(pseudo), {
  error: 'Ce pseudo est déjà pris.',
});

/** PUT /api/v1/compte/pseudo */
export const schemaPseudo = z.object({ pseudo: champPseudoLibre });
export type ChangementPseudo = z.output<typeof schemaPseudo>;

/** POST /api/v1/disponibilites/email (l'adresse ne passe pas dans l'URL, donc pas dans les journaux). */
export const schemaEmail = z.object({ email: champEmail });
