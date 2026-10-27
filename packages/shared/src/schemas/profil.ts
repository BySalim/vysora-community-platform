import { z } from 'zod';
import { LONGUEURS } from '../regles';

/* Profil public (PROF-01, F-05) : biographie et lien personnel, modifiés depuis le profil
   (« Modifier le profil » du prototype). Messages du prototype (profil.js : verifierLien). */

/** Adresse saisie sans protocole : https:// est ajouté (prototype : normaliserLien). */
export const normaliserLien = (valeur: string): string => {
  const lien = valeur.trim();
  if (!lien) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(lien) ? lien : `https://${lien}`;
};

/** Message d'erreur d'un lien personnel, ou null s'il est valable (vide compris). */
export function erreurLien(valeur: string): string | null {
  const lien = normaliserLien(valeur);
  if (!lien) return null;
  if (lien.length > LONGUEURS.url.max) return 'Cette adresse est trop longue.';
  let url: URL | null;
  try {
    url = new URL(lien);
  } catch {
    url = null;
  }
  if (!url || !url.hostname.includes('.') || /\s/.test(lien))
    return 'Cette adresse est incomplète. Exemple : https://monsite.fr';
  if (url.protocol !== 'https:') return 'Utilisez une adresse sécurisée, en https.';
  return null;
}

export const schemaProfilPublic = z.object({
  /** Vide : la biographie est retirée. */
  biographie: z
    .string({ error: 'La biographie doit être un texte.' })
    .max(LONGUEURS.biographie.max * 2)
    .transform((texte) =>
      texte
        .replace(/\r\n?/g, '\n')
        .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === '\n' ? c : ''))
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .refine((texte) => texte.length <= LONGUEURS.biographie.max, {
      error: `Votre biographie compte ${LONGUEURS.biographie.max} caractères au plus.`,
    })
    .transform((texte) => texte || null)
    .optional(),
  /** Vide : le lien est retiré. */
  lien: z
    .string({ error: 'Indiquez une adresse.' })
    .superRefine((valeur, ctx) => {
      const message = erreurLien(valeur);
      if (message) ctx.addIssue({ code: 'custom', message });
    })
    .transform((valeur) => normaliserLien(valeur) || null)
    .optional(),
});

export type ProfilPublicSaisi = z.output<typeof schemaProfilPublic>;
