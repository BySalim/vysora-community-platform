import type { EtatDefi } from './contrats/defis';
import type { StatutDefi } from './enums';

/* Défis (S-07, F-63 à F-65, RG-73 à RG-75) : état présenté et messages de la participation, partagés
   par l'API (page des défis, écriture des créations) et l'éditeur, qui les annonce avant l'envoi. */

/** RG-73 : état d'un défi à un instant donné. Un défi publié est à venir, en cours ou terminé selon
    sa période ; « terminé » attend la clôture, qui fige le classement. */
export function etatDefi(
  statut: StatutDefi,
  debut: Date | string,
  fin: Date | string,
  maintenant = new Date(),
): EtatDefi {
  if (statut === 'CLOTURE') return 'CLOTURE';
  if (statut === 'ANNULE') return 'ANNULE';
  if (new Date(debut) > maintenant) return 'A_VENIR';
  return new Date(fin) > maintenant ? 'EN_COURS' : 'TERMINE';
}

/** F-64, RG-74, CI-15 : participations ouvertes (défi publié et en cours). */
export const participationsOuvertes = (
  statut: StatutDefi,
  debut: Date | string,
  fin: Date | string,
  maintenant = new Date(),
): boolean => statut === 'PUBLIE' && etatDefi(statut, debut, fin, maintenant) === 'EN_COURS';

/** Refus d'une participation (RG-74), dans la page des défis comme dans l'éditeur. */
export const MESSAGES_PARTICIPATION = {
  introuvable: 'Ce défi est introuvable.',
  fermees: 'Les participations à ce défi sont fermées.',
  periode: 'La création doit être publiée pendant la période du défi.',
  unique: (titre: string | null) =>
    titre
      ? `Vous participez déjà à ce défi avec « ${titre} » : une création par personne.`
      : 'Vous participez déjà à ce défi : une création par personne.',
  conservee: 'Le défi n’est plus en cours : la participation est conservée.',
} as const;
