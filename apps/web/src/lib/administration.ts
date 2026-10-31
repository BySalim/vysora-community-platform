/* Référentiels dans l'administration (ADM-02, EC-22, F-95, RG-110) : libellés des types d'outil et
   regroupement par famille, dans l'ordre du catalogue du prototype ; icônes des catégories ; badges
   par catégorie. */
import {
  CATEGORIES_BADGE,
  type BadgeAdministreApi,
  type CategorieBadge,
  type FamilleOutil,
  type IconeCategorie,
  type OutilAdministreApi,
  type TypeOutil,
} from '@vysora/shared';
import { FAMILLES } from './publier/donnees';

export const LIBELLES_TYPE_OUTIL: Record<TypeOutil, string> = {
  ASSISTANT_CONVERSATIONNEL: 'Assistant conversationnel',
  EDITEUR_CODE: 'Éditeur de code',
  AGENT_CODE: 'Agent de code',
  CONSTRUCTEUR_APPLICATION: 'Constructeur d’applications',
  GENERATEUR_IMAGE: 'Générateur d’images',
  GENERATEUR_VIDEO: 'Générateur de vidéos',
  GENERATEUR_AUDIO: 'Générateur audio',
  AUTRE: 'Autre',
};

export interface FamilleAdministree {
  id: FamilleOutil;
  libelle: string;
  outils: OutilAdministreApi[];
  archives: number;
}

/** Outils par famille, les familles vides omises ; dans une famille, les outils proposés d'abord,
    puis les archivés, chacun par ordre alphabétique. */
export function parFamille(outils: OutilAdministreApi[]): FamilleAdministree[] {
  const ordre = (o: OutilAdministreApi) => (o.statut === 'ACTIF' ? 0 : 1);
  return FAMILLES.map(({ id, label }) => {
    const liste = outils
      .filter((o) => o.famille === id)
      .toSorted((a, b) => ordre(a) - ordre(b) || a.nom.localeCompare(b.nom, 'fr'));
    return {
      id,
      libelle: label,
      outils: liste,
      archives: liste.filter((o) => o.statut === 'ARCHIVE').length,
    };
  }).filter((f) => f.outils.length > 0);
}

/** Éditeurs connus, proposés à la saisie d'un nouvel outil (un éditeur inconnu est créé). */
export const editeurs = (outils: OutilAdministreApi[]): string[] =>
  [...new Set(outils.map((o) => o.editeur))].toSorted((a, b) => a.localeCompare(b, 'fr'));

/** Nom de chaque icône proposée pour une catégorie, lu par les lecteurs d'écran (EC-22). */
export const LIBELLES_ICONE_CATEGORIE: Record<IconeCategorie, string> = {
  browser: 'Navigateur',
  image: 'Image',
  pen: 'Stylo',
  code: 'Code',
  flow: 'Enchaînement',
  chart: 'Graphique',
  film: 'Film',
  music: 'Musique',
  school: 'École',
  shapes: 'Formes',
  book: 'Livre',
  box: 'Boîte',
  camera: 'Appareil photo',
  compass: 'Boussole',
  doc: 'Document',
  globe: 'Globe',
  grid: 'Grille',
  heart: 'Cœur',
  layers: 'Calques',
  mail: 'Enveloppe',
  message: 'Bulle de dialogue',
  monitor: 'Écran',
  phone: 'Téléphone',
  scale: 'Balance',
  sparkle: 'Étincelle',
  tableur: 'Tableur',
  terminal: 'Terminal',
  users: 'Personnes',
  wrench: 'Clé à molette',
};

const LIBELLES_CATEGORIE_BADGE: Record<CategorieBadge, string> = {
  CONTRIBUTION: 'Contribution',
  APPRENTISSAGE: 'Apprentissage',
  COMMUNAUTE: 'Communauté',
};

/** Badges par catégorie (RG-86), dans l'ordre du référentiel. */
export const badgesParCategorie = (
  badges: BadgeAdministreApi[],
): { categorie: CategorieBadge; libelle: string; badges: BadgeAdministreApi[] }[] =>
  CATEGORIES_BADGE.map((categorie) => ({
    categorie,
    libelle: LIBELLES_CATEGORIE_BADGE[categorie],
    badges: badges.filter((b) => b.categorie === categorie),
  })).filter((groupe) => groupe.badges.length > 0);
