import type { FournisseurExterne } from './enums';

/* Connexion avec GitHub et Google (F-02, S-10). Les adresses du site et de l'API désignent un
   service par son nom en minuscules (/api/v1/auth/github) ; la base garde l'énumération du MCD
   (GITHUB, GOOGLE). */

export const SERVICES_EXTERNES = ['github', 'google'] as const;
export type ServiceExterne = (typeof SERVICES_EXTERNES)[number];

export const NOMS_SERVICES: Record<ServiceExterne, string> = { github: 'GitHub', google: 'Google' };

export const estServiceExterne = (valeur: unknown): valeur is ServiceExterne =>
  typeof valeur === 'string' && (SERVICES_EXTERNES as readonly string[]).includes(valeur);

export const fournisseurDe = (service: ServiceExterne): FournisseurExterne =>
  service === 'github' ? 'GITHUB' : 'GOOGLE';

export const serviceDe = (fournisseur: FournisseurExterne): ServiceExterne =>
  fournisseur === 'GITHUB' ? 'github' : 'google';

/** Ce que la personne venait faire en choisissant le service. */
export const INTENTIONS_SERVICE = ['connexion', 'inscription', 'liaison'] as const;
export type IntentionService = (typeof INTENTIONS_SERVICE)[number];

/** Issue d'un aller-retour vers le service, transmise au site par le paramètre `resultat` de
    l'adresse de retour ; le site l'affiche avec les messages du prototype. Une connexion ou une
    inscription réussie n'en a pas : la session est ouverte. */
export const RESULTATS_SERVICE = [
  /** Connexion : aucun compte Vysora n'est lié à ce compte du service. */
  'inconnu',
  /** L'adresse fournie appartient déjà à un compte Vysora : rien n'est fusionné (F-02). */
  'email-pris',
  /** Le service ne fournit aucune adresse vérifiée. */
  'email-non-verifie',
  /** Bêta fermée (INV-01) : code d'invitation absent, déjà utilisé ou expiré. */
  'invitation',
  /** Compte fermé par la modération. */
  'ferme',
  /** Liaison réussie depuis les paramètres. */
  'lie',
  /** Ce compte du service est déjà lié à un autre compte Vysora. */
  'lie-ailleurs',
  /** Le membre a déjà lié un autre compte de ce service. */
  'deja-lie',
  /** Refus ou annulation chez le service, délai dépassé, service injoignable. */
  'indisponible',
] as const;
export type ResultatService = (typeof RESULTATS_SERVICE)[number];

export const estResultatService = (valeur: unknown): valeur is ResultatService =>
  typeof valeur === 'string' && (RESULTATS_SERVICE as readonly string[]).includes(valeur);
