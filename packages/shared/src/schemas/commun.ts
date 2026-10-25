import { z } from 'zod';
import { LONGUEURS } from '../regles';

/* Briques de validation réutilisées par les formulaires et l'API.
   Les messages sont ceux affichés à l'utilisateur (vouvoiement, typographie appliquée au rendu). */

/** Contrôle volontairement souple, identique à celui du prototype ; la vérification réelle passe par l'e-mail. */
export const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const champEmail = z
  .string({ error: 'Indiquez votre adresse e-mail.' })
  .trim()
  .min(1, { error: 'Indiquez votre adresse e-mail.' })
  .max(LONGUEURS.email.max, { error: 'Cette adresse e-mail est trop longue.' })
  .regex(MOTIF_EMAIL, { error: 'Cette adresse e-mail est incomplète. Vérifiez-la.' });

/** RG-01 : 3 à 30 caractères, lettres, chiffres, tiret et tiret bas. */
export const MOTIF_PSEUDO = /^[A-Za-z0-9_-]+$/;
export const champPseudo = z
  .string({ error: 'Choisissez un pseudo.' })
  .trim()
  .min(LONGUEURS.pseudo.min, {
    error: `Votre pseudo compte ${LONGUEURS.pseudo.min} caractères au moins.`,
  })
  .max(LONGUEURS.pseudo.max, {
    error: `Votre pseudo compte ${LONGUEURS.pseudo.max} caractères au plus.`,
  })
  .regex(MOTIF_PSEUDO, {
    error: 'Utilisez seulement des lettres, des chiffres, le tiret et le tiret bas.',
  });

/** Nom affiché à côté des contenus (« Claire Dubois »), en plus du pseudo qui sert d'adresse.
    Vide, il est retiré : le pseudo s'affiche à sa place. */
export const champNomAffiche = z
  .string({ error: 'Indiquez le nom à afficher.' })
  .trim()
  .max(LONGUEURS.nomAffiche.max, {
    error: `Votre nom compte ${LONGUEURS.nomAffiche.max} caractères au plus.`,
  })
  .regex(/^[^\p{Cc}\p{Cf}]*$/u, { error: 'Retirez les caractères invisibles de votre nom.' })
  .transform((nom) => nom.replace(/\s+/g, ' ') || null);

/** RG-04 : longueur minimale, sans règle de composition arbitraire (la liste des mots de passe compromis est contrôlée à part). */
export const champMotDePasse = z
  .string({ error: 'Choisissez un mot de passe.' })
  .min(LONGUEURS.motDePasse.min, {
    error: `Votre mot de passe compte ${LONGUEURS.motDePasse.min} caractères au moins.`,
  })
  .max(LONGUEURS.motDePasse.max, {
    error: `Votre mot de passe compte ${LONGUEURS.motDePasse.max} caractères au plus.`,
  });

/** RG-16 : liens externes en HTTPS uniquement. */
export const champUrlHttps = z
  .string()
  .trim()
  .max(LONGUEURS.url.max, { error: 'Cette adresse est trop longue.' })
  .regex(/^https:\/\/\S+$/, { error: 'Indiquez une adresse qui commence par https://.' });

/** Premier message d'erreur de chaque champ, pour l'afficher sous le champ concerné. */
export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const champs: Record<string, string> = {};
  for (const probleme of erreur.issues) {
    const champ = probleme.path.map(String).join('.') || '_';
    if (!(champ in champs)) champs[champ] = probleme.message;
  }
  return champs;
}

/* Paramètres d'adresse des listes (forum, Bon réflexe). */

/** Paramètre booléen d'une adresse (« true » ou « 1 »). */
export const parametreBooleen = z
  .enum(['true', 'false', '1', '0'], { error: 'Ce filtre est invalide.' })
  .optional()
  .transform((valeur) => valeur === 'true' || valeur === '1');

/** Liste séparée par des virgules (« ?type=QUESTION,CLINIQUE »). */
export const parametreListe = (message: string) =>
  z
    .string({ error: message })
    .max(1000, { error: message })
    .optional()
    .transform((valeur) =>
      (valeur ?? '')
        .split(',')
        .map((element) => element.trim())
        .filter(Boolean),
    );

/** Numéro de page d'une liste paginée par numéros (1 par défaut). */
export const parametrePage = z.coerce
  .number({ error: 'Cette page n’existe pas.' })
  .int({ error: 'Cette page n’existe pas.' })
  .min(1, { error: 'Cette page n’existe pas.' })
  .max(100_000, { error: 'Cette page n’existe pas.' })
  .default(1);
