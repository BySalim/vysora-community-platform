import { z } from 'zod';
import { LONGUEURS } from '../regles';
import { evaluerMotDePasse } from '../mots-de-passe';
import { IDS_FUSEAUX } from '../parametres';
import { champEmail, champMotDePasse, champNomAffiche, champPseudo } from './commun';

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

/** Une adresse seule : disponibilité (première étape de l'inscription), mot de passe oublié (F-03). */
export const schemaAdresseEmail = z.object({ email: champEmail });
export const schemaDisponibiliteEmail = schemaAdresseEmail;

/** Jeton reçu dans un lien envoyé par e-mail (vérification de l'adresse, réinitialisation). */
const champJeton = z
  .string({ error: 'Ce lien est incomplet.' })
  .trim()
  .min(1, { error: 'Ce lien est incomplet.' })
  .max(200, { error: 'Ce lien est incomplet.' });

export const schemaJeton = z.object({ jeton: champJeton });

/** Renvoi du lien de vérification : par la session, ou par le jeton d'un lien expiré. */
export const schemaRenvoiVerification = z.object({ jeton: champJeton.optional() });

/** F-03 : nouveau mot de passe choisi depuis le lien reçu (RG-04 ; l'API vérifie le reste). */
export const schemaReinitialisation = z.object({
  jeton: champJeton,
  motDePasse: champMotDePasse,
});

export type Reinitialisation = z.output<typeof schemaReinitialisation>;

/** F-04, WF-03 : acceptation des nouvelles versions des documents légaux. */
export const schemaAcceptationDocuments = z.object({
  accepte: z.literal(true, { error: 'Cochez la case pour accepter les nouvelles versions.' }),
});

/** Modification par le membre de ses propres informations (pseudo, nom, fuseau, puis profil).
    L'adresse ne se modifie ici que tant qu'elle n'est pas vérifiée (inscription) ; ensuite, par
    `POST /api/v1/moi/email` (PARAM-01). */
export const schemaModificationMembre = z.object({
  pseudo: champPseudo.optional(),
  /** null ou vide : retire le nom affiché (le pseudo s'affiche). */
  nomAffiche: champNomAffiche.nullable().optional(),
  email: champEmail.optional(),
  /** Horaires des défis et des notifications (PARAM-01). */
  fuseauHoraire: z.enum(IDS_FUSEAUX, { error: 'Choisissez un fuseau de la liste.' }).optional(),
});

export type ModificationMembre = z.output<typeof schemaModificationMembre>;
