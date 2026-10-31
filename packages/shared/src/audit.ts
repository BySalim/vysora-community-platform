/* ENF-09 : journal d'audit des actions d'administration (les décisions de modération ont leur propre
   journal, EC-21). Chaque action inscrite appartient à un domaine de l'administration, qui sert de
   filtre à sa consultation (ADM-02). */

export const ACTIONS_AUDIT = {
  equipe: ['ROLE_MODIFIE', 'DEUX_FACTEURS_REINITIALISEE'],
  invitations: ['INVITATIONS_CREEES'],
  referentiels: [
    'OUTIL_CREE',
    'OUTIL_ACTIF',
    'OUTIL_ARCHIVE',
    'MODELE_AJOUTE',
    'MODELE_DISPONIBLE',
    'MODELE_RETIRE',
    'CATEGORIE_CREEE',
    'CATEGORIE_MODIFIEE',
    'CATEGORIE_REACTIVEE',
    'CATEGORIE_ARCHIVEE',
    'LICENCE_CREEE',
    'LICENCE_MODIFIEE',
    'LICENCE_REACTIVEE',
    'LICENCE_ARCHIVEE',
    'LICENCE_PAR_DEFAUT',
    'ETIQUETTE_REACTIVEE',
    'ETIQUETTE_ARCHIVEE',
    'BADGE_REPRIS',
    'BADGE_ARRETE',
  ],
  documents: ['DOCUMENT_LEGAL_PUBLIE', 'DOCUMENT_LEGAL_RETIRE'],
  defis: ['DEFI_CREE', 'DEFI_PUBLIE', 'DEFI_ANNULE', 'DEFI_CLOTURE'],
} as const;

export type DomaineAudit = keyof typeof ACTIONS_AUDIT;
export type ActionAudit = (typeof ACTIONS_AUDIT)[DomaineAudit][number];

export const DOMAINES_AUDIT = Object.keys(ACTIONS_AUDIT) as DomaineAudit[];

export const LIBELLES_DOMAINE_AUDIT: Record<DomaineAudit, string> = {
  equipe: 'Équipe',
  invitations: 'Invitations',
  referentiels: 'Référentiels',
  documents: 'Documents légaux',
  defis: 'Défis',
};

export const LIBELLES_ACTION_AUDIT: Record<ActionAudit, string> = {
  ROLE_MODIFIE: 'Rôle modifié',
  DEUX_FACTEURS_REINITIALISEE: 'Vérification en deux étapes réinitialisée',
  INVITATIONS_CREEES: 'Codes d’invitation créés',
  OUTIL_CREE: 'Outil ajouté',
  OUTIL_ACTIF: 'Outil réactivé',
  OUTIL_ARCHIVE: 'Outil archivé',
  MODELE_AJOUTE: 'Modèle ajouté',
  MODELE_DISPONIBLE: 'Modèle proposé de nouveau',
  MODELE_RETIRE: 'Modèle retiré',
  CATEGORIE_CREEE: 'Catégorie ajoutée',
  CATEGORIE_MODIFIEE: 'Catégorie modifiée',
  CATEGORIE_REACTIVEE: 'Catégorie réactivée',
  CATEGORIE_ARCHIVEE: 'Catégorie archivée',
  LICENCE_CREEE: 'Licence ajoutée',
  LICENCE_MODIFIEE: 'Licence modifiée',
  LICENCE_REACTIVEE: 'Licence réactivée',
  LICENCE_ARCHIVEE: 'Licence archivée',
  LICENCE_PAR_DEFAUT: 'Licence par défaut changée',
  ETIQUETTE_REACTIVEE: 'Étiquette réactivée',
  ETIQUETTE_ARCHIVEE: 'Étiquette archivée',
  BADGE_REPRIS: 'Attribution du badge reprise',
  BADGE_ARRETE: 'Attribution du badge arrêtée',
  DOCUMENT_LEGAL_PUBLIE: 'Version d’un document légal publiée',
  DOCUMENT_LEGAL_RETIRE: 'Version d’un document légal retirée',
  DEFI_CREE: 'Défi créé',
  DEFI_PUBLIE: 'Défi publié',
  DEFI_ANNULE: 'Défi annulé',
  DEFI_CLOTURE: 'Défi clôturé',
};
