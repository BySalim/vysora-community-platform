import { z } from 'zod';
import { LONGUEURS } from '../regles';
import { evaluerMotDePasse } from '../mots-de-passe';
import { champEmail, champMotDePasse, champPseudo } from './commun';

/* Comptes et sessions (F-01, F-03) : inscription, connexion, disponibilité, modification du pseudo. */

/** F-01, RG-01 à RG-04. L'API vérifie en plus l'unicité et la base des fuites connues. */
export const schemaInscription = z
  .object({
    email: champEmail,
    motDePasse: champMotDePasse,
    /** Facultatif : sans pseudo, l'API en tire un que le membre peut ensuite modifier. */
    pseudo: champPseudo.optional(),
    /** RG-03 : « En continuant, vous acceptez les conditions d'utilisation et la charte communautaire. » */
    accepteConditions: z.literal(true, {
      error: 'Acceptez les conditions d’utilisation et la charte communautaire pour continuer.',
    }),
  })
  .superRefine((valeur, ctx) => {
    const evaluation = evaluerMotDePasse(valeur.motDePasse, {
      pseudo: valeur.pseudo,
      email: valeur.email,
    });
    if (evaluation.message)
      ctx.addIssue({ code: 'custom', path: ['motDePasse'], message: evaluation.message });
  });

export type InscriptionSaisie = z.input<typeof schemaInscription>;
export type Inscription = z.output<typeof schemaInscription>;

/** F-03. Aucune règle de format sur le mot de passe : un ancien mot de passe reste utilisable. */
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

/** Première étape de l'inscription : l'adresse est-elle déjà associée à un compte ? */
export const schemaDisponibiliteEmail = z.object({ email: champEmail });

/** Modification par le membre de ses propres informations (pseudo, puis profil et paramètres). */
export const schemaModificationMembre = z.object({
  pseudo: champPseudo.optional(),
});

export type ModificationMembre = z.output<typeof schemaModificationMembre>;
