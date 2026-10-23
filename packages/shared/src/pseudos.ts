import { LONGUEURS } from './regles';

/* RG-01 : pseudos. Un pseudo est proposé à la création du compte (un nom, une couleur, un nombre),
   que le membre garde ou modifie (prototype/inscription.js). La disponibilité est vérifiée par l'API. */

/** Pseudos qui ne peuvent appartenir à aucun membre : rôles, marque, pages du site. */
export const PSEUDOS_RESERVES: ReadonlySet<string> = new Set([
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
  'systeme',
  'root',
  'anonyme',
  'membre',
  'membres',
  'connexion',
  'inscription',
  'parametres',
  'notifications',
]);

/** RG-05 : préfixe des pseudos anonymes donnés aux comptes supprimés. */
export const PREFIXE_PSEUDO_SUPPRIME = 'membre-supprime';

export function estPseudoReserve(pseudo: string): boolean {
  const bas = pseudo.toLowerCase();
  return PSEUDOS_RESERVES.has(bas) || bas.startsWith(PREFIXE_PSEUDO_SUPPRIME);
}

export const PSEUDO_NOMS = [
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
] as const;

export const PSEUDO_COULEURS = [
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
] as const;

const auHasard = <T>(liste: readonly T[], aleatoire: () => number): T =>
  liste[Math.floor(aleatoire() * liste.length)] as T;

/** Pseudo proposé à la création du compte, par exemple « prisme-azur-42 ». */
export function tirerPseudo(aleatoire: () => number = Math.random): string {
  const nombre = 10 + Math.floor(aleatoire() * 90);
  return `${auHasard(PSEUDO_NOMS, aleatoire)}-${auHasard(PSEUDO_COULEURS, aleatoire)}-${nombre}`;
}

/** Variantes proposées quand un pseudo est pris ; l'API retire celles qui le sont aussi. */
export function variantesPseudo(base: string, annee = new Date().getFullYear()): string[] {
  const racine =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, LONGUEURS.pseudo.max - 6) || 'createur';
  const candidats = [
    `${racine}-ia`,
    racine.includes('-') ? racine.replace(/-/g, '_') : `${racine}_cree`,
    `${racine}-${String(annee).slice(-2)}`,
  ];
  return [...new Set(candidats)].filter(
    (candidat) =>
      candidat.length >= LONGUEURS.pseudo.min &&
      candidat.length <= LONGUEURS.pseudo.max &&
      !estPseudoReserve(candidat),
  );
}
