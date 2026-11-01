/* Administration : rôles, état d'un compte et de sa double authentification (ADM-01, EC-23) ;
   référentiels (ADM-02, EC-22, F-95, RG-110) : libellés des types d'outil et regroupement par
   famille, dans l'ordre du catalogue du prototype ; icônes des catégories ; badges par catégorie ;
   journal d'audit (ENF-09) : élément visé et changement en clair. */
import {
  CATEGORIES_BADGE,
  LIBELLES_ACTION_AUDIT,
  type BadgeAdministreApi,
  type CategorieBadge,
  type EntreeAuditApi,
  type FamilleOutil,
  type IconeCategorie,
  type MembreAdministreApi,
  type OutilAdministreApi,
  type Role,
  type StatutCompte,
  type TypeDocumentLegal,
  type TypeOutil,
} from '@vysora/shared';
import { CLE_DOCUMENT, RESUMES_DOCUMENTS } from './documents-legaux';
import { FAMILLES } from './publier/donnees';
import { dateLongue, pluriel } from './texte';

export const LIBELLES_ROLE: Record<Role, string> = {
  MEMBRE: 'Membre',
  MODERATEUR: 'Modérateur',
  ADMINISTRATEUR: 'Administrateur',
};

/** SEC-02 : état de la double authentification d'un compte, et sa classe. */
export const DEUX_FACTEURS: Record<MembreAdministreApi['deuxFacteurs'], [string, string]> = {
  active: ['Vérification en deux étapes activée', 'is-ok'],
  'en-attente': ['Vérification en deux étapes commencée, jamais confirmée', 'is-alerte'],
  absente: ['Vérification en deux étapes à configurer', ''],
};

/** État d'un compte qui n'est pas actif (RG-103, RG-05). */
export const LIBELLES_STATUT_COMPTE: Record<StatutCompte, string> = {
  ACTIF: '',
  EN_SUPPRESSION: 'Suppression demandée',
  BANNI: 'Compte banni',
  SUPPRIME: 'Compte supprimé',
};

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

/** Éditeurs connus et proposés, suggérés à la saisie d'un nouvel outil (un éditeur inconnu est créé,
    un éditeur archivé refusé). */
export const editeurs = (outils: OutilAdministreApi[]): string[] =>
  [...new Set(outils.filter((o) => o.editeurActif).map((o) => o.editeur))].toSorted((a, b) =>
    a.localeCompare(b, 'fr'),
  );

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

/* Journal d'audit (ADM-02, ENF-09) ------------------------------------------------------------ */

const texteDe = (valeur: unknown): string | null => (typeof valeur === 'string' ? valeur : null);
const nombreDe = (valeur: unknown): number | null => (typeof valeur === 'number' ? valeur : null);
const listeDe = (valeur: unknown): string[] =>
  Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === 'string') : [];

/** Version d'un document légal nommée par les détails inscrits (elle peut avoir été retirée) :
    « Conditions générales d’utilisation, version du 15 novembre 2026 ». */
function documentAudit(details: Record<string, unknown> | null): string | null {
  const type = texteDe(details?.type);
  const version = texteDe(details?.version);
  if (!type || !(type in CLE_DOCUMENT)) return null;
  const titre = RESUMES_DOCUMENTS[CLE_DOCUMENT[type as TypeDocumentLegal]].titre;
  return version && /^\d{4}-\d{2}-\d{2}$/.test(version)
    ? `${titre}, version du ${dateLongue(version)}`
    : titre;
}

/** Nom de l'élément visé par une action d'administration ; null pour des codes d'invitation ou un
    membre (présenté à part, avec un lien vers son dossier). */
export function cibleAudit(entree: EntreeAuditApi): string | null {
  const { cible, details } = entree;
  if (!cible || cible.type === 'utilisateur') return null;
  if (cible.type === 'document_legal') return documentAudit(details);
  // Un élément retiré depuis garde le nom inscrit à sa création, s'il l'a été.
  return (
    cible.nom ??
    texteDe(details?.libelle) ??
    texteDe(details?.nom) ??
    texteDe(details?.code) ??
    'Élément supprimé depuis'
  );
}

/** Ce que l'action a changé, en clair (rôle avant et après, nombre de codes…), ou une chaîne vide. */
export function precisionAudit(entree: EntreeAuditApi): string {
  const d = entree.details;
  switch (entree.action) {
    case 'ROLE_MODIFIE': {
      const avant = texteDe(d?.avant) as Role | null;
      const apres = texteDe(d?.apres) as Role | null;
      return avant && apres && avant in LIBELLES_ROLE && apres in LIBELLES_ROLE
        ? `${LIBELLES_ROLE[avant]} → ${LIBELLES_ROLE[apres]}`
        : '';
    }
    case 'INVITATIONS_CREEES': {
      const nombre = nombreDe(d?.nombre) ?? 0;
      const jours = nombreDe(d?.joursValidite);
      const valable = nombre > 1 ? 'valables' : 'valable';
      return `${pluriel(nombre, 'code', 'codes')}, ${jours ? `${valable} ${pluriel(jours, 'jour', 'jours')}` : 'sans limite de validité'}`;
    }
    case 'DEFI_CLOTURE': {
      const participants = nombreDe(d?.participants);
      return participants === null ? '' : pluriel(participants, 'participant', 'participants');
    }
    case 'GUIDE_CONTENU_AJOUTE':
    case 'GUIDE_CONTENU_RETIRE': {
      // « parcours », « question » ou « cas », inscrit avec le titre du contenu.
      const type = texteDe(d?.type);
      const titre = texteDe(d?.titre);
      return type && titre ? `${type.charAt(0).toUpperCase()}${type.slice(1)} « ${titre} »` : '';
    }
    case 'PIEGE_RETENU':
    case 'PIEGE_ECARTE': {
      const guide = texteDe(d?.guide);
      return guide ? `Guide « ${guide} »` : '';
    }
    case 'LICENCE_PAR_DEFAUT': {
      const avant = texteDe(d?.avant);
      return avant ? `Auparavant : ${avant}` : '';
    }
    case 'EDITEUR_RENOMME': {
      const avant = texteDe(d?.avant);
      const apres = texteDe(d?.apres);
      return avant && apres ? `${avant} → ${apres}` : '';
    }
    case 'EDITEUR_ARCHIVE': {
      // Outils archivés et modèles retirés avec l'éditeur.
      const outils = listeDe(d?.outils).length;
      const modeles = listeDe(d?.modeles).length;
      return [
        outils ? pluriel(outils, 'outil archivé', 'outils archivés') : '',
        modeles ? pluriel(modeles, 'modèle retiré', 'modèles retirés') : '',
      ]
        .filter(Boolean)
        .join(', ');
    }
    case 'CATEGORIES_ORDONNEES':
    case 'LICENCES_ORDONNEES': {
      // Les cinq premiers du nouvel ordre.
      const ordre = listeDe(d?.ordre);
      return `${ordre.slice(0, 5).join(', ')}${ordre.length > 5 ? '…' : ''}`;
    }
    default:
      return '';
  }
}

/** Libellé d'une action inscrite au journal ; une action inconnue garde son code. */
export const libelleAudit = (action: string): string =>
  (LIBELLES_ACTION_AUDIT as Record<string, string>)[action] ?? action;
