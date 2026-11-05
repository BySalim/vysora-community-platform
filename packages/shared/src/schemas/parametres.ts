import { z } from 'zod';
import { TYPES_NOTIFICATION } from '../enums';
import { LONGUEURS } from '../regles';
import { champEmail, champMotDePasse } from './commun';

/* Paramètres du compte (PARAM-01, EC-17) : changement d'adresse et de mot de passe, préférences
   d'e-mail, suppression du compte. Messages du prototype (parametres.js). */

export const MESSAGES_PARAMETRES = {
  motDePasseActuel: 'Saisissez votre mot de passe actuel.',
  motDePasseIncorrect: 'Ce mot de passe est incorrect.',
  memeAdresse: 'C’est déjà l’adresse de votre compte.',
  nouveauMotDePasse: 'Choisissez un nouveau mot de passe.',
  memeMotDePasse: 'Choisissez un mot de passe différent de l’actuel.',
  confirmerSuppression: 'Saisissez votre mot de passe pour confirmer.',
} as const;

/** Mot de passe saisi pour confirmer : aucune règle de format, un ancien mot de passe reste valable. */
const motDePasseSaisi = (message: string) =>
  z
    .string({ error: message })
    .min(1, { error: message })
    .max(LONGUEURS.motDePasse.max, { error: MESSAGES_PARAMETRES.motDePasseIncorrect });

/** F-06, WF-02 : la nouvelle adresse est vérifiée par un lien ; le mot de passe actuel est exigé,
    sauf pour un compte créé avec GitHub ou Google qui n'en a pas (l'API en décide). */
export const schemaChangementEmail = z.object({
  email: champEmail,
  motDePasse: motDePasseSaisi(MESSAGES_PARAMETRES.motDePasseActuel).optional(),
});
export type ChangementEmail = z.output<typeof schemaChangementEmail>;

/** F-06, RG-04 : le mot de passe actuel est exigé ; le nouveau a la longueur de l'inscription, et
    l'API l'évalue (ressemblance au pseudo ou à l'adresse, fuites connues). */
export const schemaChangementMotDePasse = z
  .object({
    actuel: motDePasseSaisi(MESSAGES_PARAMETRES.motDePasseActuel),
    nouveau: z
      .string({ error: MESSAGES_PARAMETRES.nouveauMotDePasse })
      .min(1, { error: MESSAGES_PARAMETRES.nouveauMotDePasse })
      .pipe(champMotDePasse),
    /** Ferme les sessions des autres appareils. */
    deconnecterAutres: z.boolean().default(false),
  })
  .refine((saisie) => saisie.nouveau !== saisie.actuel, {
    path: ['nouveau'],
    message: MESSAGES_PARAMETRES.memeMotDePasse,
  });
export type ChangementMotDePasse = z.output<typeof schemaChangementMotDePasse>;

/** S-10 : un compte créé avec GitHub ou Google définit un mot de passe (RG-04, comme à
    l'inscription) pour se connecter aussi avec son adresse e-mail. */
export const schemaDefinitionMotDePasse = z.object({
  nouveau: z
    .string({ error: MESSAGES_PARAMETRES.nouveauMotDePasse })
    .min(1, { error: MESSAGES_PARAMETRES.nouveauMotDePasse })
    .pipe(champMotDePasse),
});
export type DefinitionMotDePasse = z.output<typeof schemaDefinitionMotDePasse>;

/** F-08, RG-05 : demande confirmée par le mot de passe ; les créations sont gardées sous un pseudo
    anonyme, sauf demande expresse de leur suppression. */
export const schemaSuppressionCompte = z.object({
  motDePasse: motDePasseSaisi(MESSAGES_PARAMETRES.confirmerSuppression),
  supprimerCreations: z.boolean().default(false),
});
export type SuppressionCompte = z.output<typeof schemaSuppressionCompte>;

/** F-81 : envoi par e-mail en général, et par événement (WF-25). */
export const schemaPreferencesNotifications = z
  .object({
    email: z.boolean().optional(),
    evenements: z.partialRecord(z.enum(TYPES_NOTIFICATION), z.boolean()).optional(),
  })
  .refine((saisie) => saisie.email !== undefined || saisie.evenements !== undefined, {
    message: 'Indiquez la préférence à modifier.',
  });
export type PreferencesNotifications = z.output<typeof schemaPreferencesNotifications>;
