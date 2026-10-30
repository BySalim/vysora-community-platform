/* Règles des comptes partagées par l'API et le site : pseudos réservés et proposés (RG-01),
   contrôles locaux du mot de passe (RG-04). Repris de prototype/auth-data.js et auth.js. */

import { MOTIF_PSEUDO } from './schemas/commun';
import { LONGUEURS } from './regles';

/** RG-01 : noms réservés à la plateforme, refusés comme un pseudo déjà pris (comparaison sans casse). */
export const PSEUDOS_RESERVES = [
  'admin',
  'administrateur',
  'administration',
  'moderation',
  'moderateur',
  'vysora',
  'carneo',
  'support',
  'aide',
  'contact',
  'equipe',
  'securite',
  'officiel',
  'systeme',
  'api',
] as const;

/** Les comptes supprimés prennent le pseudo « membre-supprime-xxxx » (RG-05). */
const PREFIXE_COMPTE_SUPPRIME = 'membre-supprime';

export const estPseudoReserve = (pseudo: string): boolean => {
  const bas = pseudo.trim().toLowerCase();
  return (
    (PSEUDOS_RESERVES as readonly string[]).includes(bas) || bas.startsWith(PREFIXE_COMPTE_SUPPRIME)
  );
};

/** Pseudo proposé à la création du compte : un nom, une couleur et un nombre (« baobab-indigo-42 »). */
export const PSEUDOS_PROPOSES = {
  noms: [
    'baobab',
    'comete',
    'lagune',
    'prisme',
    'atlas',
    'aurore',
    'boussole',
    'origami',
    'mosaique',
    'zephyr',
    'savane',
    'pixel',
    'encre',
    'kora',
    'sahel',
    'delta',
    'orbite',
    'ressac',
    'cauri',
    'meridien',
  ],
  couleurs: [
    'indigo',
    'azur',
    'corail',
    'ocre',
    'jade',
    'safran',
    'cobalt',
    'ivoire',
    'sepia',
    'cyan',
  ],
} as const;

/** Tire un pseudo au hasard ; `hasard` renvoie un nombre dans [0, 1[ (Math.random par défaut). */
export function tirerPseudo(hasard: () => number = Math.random): string {
  const choisir = <T>(liste: readonly T[]): T => liste[Math.floor(hasard() * liste.length)] as T;
  const nombre = 10 + Math.floor(hasard() * 90);
  return `${choisir(PSEUDOS_PROPOSES.noms)}-${choisir(PSEUDOS_PROPOSES.couleurs)}-${nombre}`;
}

/** Variantes proposées quand un pseudo est pris ; l'API ne garde que celles qui sont libres. */
export function variantesPseudo(base: string): string[] {
  const racine =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, LONGUEURS.pseudo.max - 6) || 'createur';
  const candidats = [
    `${racine}-ia`,
    racine.includes('-') ? racine.replace(/-/g, '_') : `${racine}_cree`,
    `${racine}-26`,
  ];
  return candidats.filter(
    (pseudo) =>
      pseudo.length >= LONGUEURS.pseudo.min &&
      MOTIF_PSEUDO.test(pseudo) &&
      !estPseudoReserve(pseudo) &&
      pseudo !== base.toLowerCase(),
  );
}

/** RG-04 : échantillon de mots de passe présents dans des fuites connues, contrôlé sans appel extérieur.
    L'API complète ce contrôle par la base Have I Been Pwned (k-anonymat). */
export const MOTS_DE_PASSE_COURANTS = [
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
] as const;

export type ProblemeMotDePasse = 'compromis' | 'personnel';

export const MESSAGES_MOT_DE_PASSE: Record<ProblemeMotDePasse, string> = {
  compromis: 'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.',
  personnel: 'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.',
};

/** RG-04 : contrôles locaux, identiques dans le formulaire et dans l'API (la longueur est vérifiée par le schéma). */
export function problemeMotDePasse(
  valeur: string,
  { pseudo = '', email = '' }: { pseudo?: string; email?: string } = {},
): ProblemeMotDePasse | null {
  const bas = valeur.toLowerCase();
  if ((MOTS_DE_PASSE_COURANTS as readonly string[]).includes(bas) || /^(.)\1+$/u.test(valeur))
    return 'compromis';
  const personnel = [pseudo, email.split('@')[0] ?? '']
    .map((texte) => texte.toLowerCase())
    .filter((texte) => texte.length >= 4);
  if (personnel.some((texte) => bas.includes(texte))) return 'personnel';
  return null;
}
