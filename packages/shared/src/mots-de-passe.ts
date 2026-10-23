import { LONGUEURS } from './regles';

/* RG-04 : qualité d'un mot de passe, jugée de la même façon par la jauge de l'inscription
   (prototype/auth.js, `evaluer`) et par l'API. Aucune règle de composition arbitraire :
   une longueur minimale, le refus des mots de passe connus et des informations personnelles.
   L'API complète ce contrôle par la base des fuites connues (Have I Been Pwned). */

export type EtatMotDePasse = 'vide' | 'court' | 'compromis' | 'personnel' | 'valide' | 'solide';

export interface EvaluationMotDePasse {
  etat: EtatMotDePasse;
  /** Avancement de 0 à 1 vers la longueur minimale (jauge). */
  progression: number;
  /** Caractères manquants pour atteindre la longueur minimale. */
  reste?: number;
  /** Raison du refus, affichable telle quelle. */
  message?: string;
}

export const MESSAGES_MOT_DE_PASSE = {
  compromis: 'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.',
  personnel: 'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.',
} as const;

/** À partir de cette longueur, le mot de passe est jugé solide (quatrième segment de la jauge). */
export const LONGUEUR_MOT_DE_PASSE_SOLIDE = 16;

/** Mots de passe très répandus, refusés sans interroger la base des fuites (repris de prototype/auth-data.js). */
export const MOTS_DE_PASSE_COURANTS: ReadonlySet<string> = new Set([
  'motdepasse123',
  'motdepasse1234',
  'azertyuiop12',
  'azertyuiop123',
  'azerty123456',
  'qwertyuiop12',
  'qwerty123456',
  '123456789012',
  '1234567890123',
  'password1234',
  'password12345',
  'iloveyou1234',
  'bonjour12345',
  'soleil123456',
  'abcdefghijkl',
  'abc123456789',
  'vysora123456',
  'jetaime12345',
  'football1234',
  'marseille123',
]);

/** Longueur en caractères visibles (un emoji compte pour un). */
export const longueurMotDePasse = (valeur: string): number => [...valeur].length;

export function evaluerMotDePasse(
  valeur: string,
  identite: { pseudo?: string; email?: string } = {},
): EvaluationMotDePasse {
  const longueur = longueurMotDePasse(valeur);
  const minimum = LONGUEURS.motDePasse.min;
  if (!longueur) return { etat: 'vide', progression: 0 };
  if (longueur < minimum)
    return { etat: 'court', progression: longueur / minimum, reste: minimum - longueur };

  const bas = valeur.toLowerCase();
  if (MOTS_DE_PASSE_COURANTS.has(bas) || /^(.)\1+$/u.test(valeur))
    return { etat: 'compromis', progression: 1, message: MESSAGES_MOT_DE_PASSE.compromis };

  const personnel = [identite.pseudo, identite.email?.split('@')[0]]
    .map((partie) => (partie ?? '').toLowerCase())
    .filter((partie) => partie.length >= 4);
  if (personnel.some((partie) => bas.includes(partie)))
    return { etat: 'personnel', progression: 1, message: MESSAGES_MOT_DE_PASSE.personnel };

  return { etat: longueur >= LONGUEUR_MOT_DE_PASSE_SOLIDE ? 'solide' : 'valide', progression: 1 };
}
