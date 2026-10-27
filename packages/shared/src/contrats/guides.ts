import type { StatutPropositionPiege, TypeCreation, TypeMomentCle, TypeSujet } from '../enums';
import type { EtatSujet } from '../forum';
import type { CasApi } from './bon-reflexe';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';

/* Contrats d'Explorer (DEC-01, F-22, prototype explorer.html) : guides d'un objectif. La méthode, les
   pièges et les lacunes d'un guide sont rédigés par l'équipe ; ses chiffres sont calculés sur ses
   parcours publiés et visibles (RG-30) : reproductions et réussite (RG-43), activité de la semaine
   (votes « Utile » des 7 derniers jours, RG-32), modèles employés et reproduits, obsolescence (RG-44). */

/** Domaine d'Explorer : une catégorie du référentiel. */
export interface DomaineApi {
  id: number;
  libelle: string;
  slug: string;
  icone: string | null;
  /** Présentation du domaine (bandeau d'Explorer filtré par domaine). */
  description: string | null;
}

/** Étape de la méthode telle que l'index la résume (chemin miniature, aperçu du héros). */
export interface EtapeGuideResumeApi {
  id: number;
  titre: string;
  /** Parcours du guide qui suivent cette étape. */
  suivie: number;
  /** Un piège du guide est rencontré à cette étape. */
  piege: boolean;
}

/** Modèle employé par un auteur ou reproduit avec succès : « Mes outils » le repère. */
export interface ModeleRepereApi {
  /** Nom complet (« Claude Sonnet 4.5 ») ; l'outil seul quand le modèle n'est pas précisé. */
  cle: string;
  /** Adresse de l'outil dans le référentiel. */
  outil: string;
}

export interface GuideResumeApi {
  id: number;
  slug: string;
  /** Objectif (« Mettre en place la prise de rendez-vous en ligne »). */
  titre: string;
  /** Nom court (« Prise de rendez-vous en ligne ») : navigation, aperçus, guides proches. */
  titreCourt: string;
  domaine: DomaineApi;
  /** Domaines de ses parcours, le sien compris (adresses) : filtre et compteurs par domaine. */
  domaines: string[];
  /** Parcours publiés et visibles. */
  parcours: number;
  /** Reproductions déclarées de ses parcours reproductibles (un projet se consulte). */
  reproductions: number;
  /** RG-43 : part des reproductions réussies, à partir de 3 ; null en dessous. */
  tauxReussite: number | null;
  /** RG-32 : votes « Utile » reçus par ses parcours sur les 7 derniers jours (« Les plus actifs »). */
  activite: number;
  /** Publication la plus récente d'un de ses parcours (« Les plus récents »). */
  recent: string | null;
  /** Dernière publication ou reproduction réussie (« mis à jour hier »). */
  miseAJour: string | null;
  /** Dernière reproduction réussie et le nom complet de son modèle. */
  derniereReussite: { date: string; modele: string } | null;
  /** Auteurs de ses parcours, chacun une fois, dans l'ordre des parcours. */
  auteurs: MembreResumeApi[];
  etapes: EtapeGuideResumeApi[];
  /** Le piège rencontré dans le plus de parcours. */
  piegePrincipal: { titre: string; signale: number; etapeId: number | null } | null;
  pieges: number;
  /** F-35, RG-44 : parcours signalés comme ne fonctionnant plus, et le modèle du premier. */
  obsolescence: { parcours: number; modele: string } | null;
  modeles: ModeleRepereApi[];
  /** Images de ses premiers parcours (vignettes de l'index), trois au plus. */
  vignettes: MediaApi[];
  /** Mots-clés, titres des étapes, des pièges et des parcours, étiquettes et outils : comme dans le
      prototype, la recherche d'un objectif se fait dans le navigateur, pendant la saisie. */
  texteRecherche: string;
}

/** « Ce que la communauté cherche encore » : objectif sans guide (prototype : requests). */
export interface DemandeGuideApi {
  id: number;
  libelle: string;
  domaine: Pick<DomaineApi, 'libelle' | 'slug' | 'icone'> | null;
  /** Membres qui le cherchent, sur les 30 derniers jours (« ce mois-ci »). */
  soutiens: number;
  /** La personne connectée le cherche aussi (toujours faux pour un visiteur). */
  soutenue: boolean;
}

/** Réponse de PUT et DELETE /api/v1/demandes/:id/soutien (« Je le cherche aussi »). */
export type SoutienDemandeApi = Pick<DemandeGuideApi, 'id' | 'soutiens' | 'soutenue'>;

/** GET /api/v1/guides : index d'Explorer. */
export interface GuidesApi {
  /** Guides publiés, des plus actifs aux moins actifs. */
  elements: GuideResumeApi[];
  /** Domaines actifs, dans l'ordre du référentiel. */
  domaines: DomaineApi[];
  /** Parcours des guides, chacun une fois, et leurs reproductions déclarées. */
  totaux: { parcours: number; reproductions: number };
  /** « Souvent cherché » : premier mot-clé des guides les plus actifs. */
  souventCherches: string[];
  /** Des plus demandées aux moins demandées. */
  demandes: DemandeGuideApi[];
}

export interface EtapeGuideApi {
  id: number;
  titre: string;
  /** Conseil de l'équipe (« Plus la description est précise, moins l'IA invente de créneaux. »). */
  conseil: string;
  /** Parcours (identifiants de création) qui suivent l'étape. */
  sources: number[];
  /** « Voir comment Aïssatou l'a demandé » : prompt d'un parcours du guide, en texte exact. */
  citation: { parcoursId: number; texte: string } | null;
}

export interface PiegeGuideApi {
  id: number;
  titre: string;
  /** « Ce qui a fonctionné ». */
  solution: string;
  /** Parcours où il a été rencontré. */
  sources: number[];
  etapeId: number | null;
  /** Discussion du forum sur ce piège, si elle est visible. */
  sujet: { id: number; slug: string; titre: string } | null;
  /** Cas Bon réflexe pour s'entraîner sur ce piège, s'il fait partie des cas du guide. */
  casId: number | null;
}

/** Ligne de « Ce qui a été testé, outil par outil ». */
export interface ModeleGuideApi {
  cle: string;
  outil: OutilResumeApi;
  /** Parcours dont l'auteur l'a employé. */
  employe: number[];
  /** Parcours reproduits avec succès avec ce modèle. */
  reproduit: number[];
  /** Dernière reproduction réussie avec ce modèle. */
  derniere: string | null;
}

export interface ParcoursGuideApi {
  id: number;
  slug: string | null;
  type: TypeCreation;
  titre: string;
  /** Objectif de l'auteur (Markdown brut). */
  objectif: string;
  categorie: string | null;
  auteur: MembreResumeApi;
  /** Outils et modèles employés, chaque outil une fois (« Claude · Sonnet 4.5 »). */
  outils: { outil: OutilResumeApi; modele: string | null }[];
  couverture: MediaApi | null;
  /** Titres des étapes d'un projet. */
  etapes: string[];
  /** Échanges du parcours (une itération se mesure ainsi). */
  echanges: number;
  /** Essais du prompt d'un « 1 prompt ». */
  essais: number;
  moments: { type: TypeMomentCle; texte: string }[];
  /** Début du premier prompt écrit. */
  prompt: string | null;
  datePublication: string;
  /** Votes « Utile » (F-30). */
  utiles: number;
  /** Reproductions déclarées ; RG-43 pour le taux. */
  reproductions: { total: number; reussies: number; tauxReussite: number | null };
  derniereReussite: { date: string; modele: string } | null;
  /** RG-44 : le modèle signalé par le plus de membres, à partir de 3. */
  obsolescence: { modele: string; membres: number } | null;
}

/** Question de la communauté sur le sujet du guide. */
export interface SujetGuideApi {
  id: number;
  slug: string;
  type: TypeSujet;
  titre: string;
  etat: EtatSujet;
  /** Réponses visibles d'autres membres que l'auteur. */
  reponses: number;
  auteur: MembreResumeApi;
}

/** Piège proposé par un membre (« Signaler un piège »). */
export interface PropositionPiegeApi {
  id: number;
  titre: string;
  solution: string | null;
  etapeId: number | null;
  /** Outil et modèle, en texte libre (« Claude Sonnet 4.5 »). */
  outil: string | null;
  date: string;
  statut: StatutPropositionPiege;
}

/** « Ma liste de contrôle » : étapes et pièges cochés. */
export interface ListeControleApi {
  etapes: number[];
  pieges: number[];
}

/** GET /api/v1/guides/:slug */
export interface GuideApi {
  guide: GuideResumeApi;
  /** « Ce que ce guide ne couvre pas encore ». */
  lacunes: string[];
  methode: EtapeGuideApi[];
  /** Du piège rencontré dans le plus de parcours au moins fréquent. */
  pieges: PiegeGuideApi[];
  /** Des plus reproduits aux moins reproduits. */
  modeles: ModeleGuideApi[];
  /** Dans l'ordre du guide. */
  parcours: ParcoursGuideApi[];
  /** Cas Bon réflexe du guide, validés et visibles, avec la correction selon la personne (F-62). */
  cas: CasApi[];
  sujets: SujetGuideApi[];
  /** Guides proches : même domaine, domaines voisins, outils communs. */
  voisins: GuideResumeApi[];
  /** Tous les guides publiés (navigation et sélecteur de la page). */
  autres: { slug: string; titreCourt: string; icone: string | null; parcours: number }[];
  /** Ce qui concerne la personne connectée ; null pour un visiteur. */
  moi: {
    liste: ListeControleApi;
    /** Pièges qu'elle a proposés pour ce guide et que l'équipe n'a pas encore relus. */
    propositions: PropositionPiegeApi[];
  } | null;
}

/** GET /api/v1/recherche/creations?q= : parcours qui correspondent à une recherche (RG-31). */
export interface RechercheCreationsApi {
  /** Les plus pertinents d'abord, six au plus. */
  elements: {
    id: number;
    slug: string | null;
    type: TypeCreation;
    titre: string;
    guide: { slug: string; titreCourt: string } | null;
  }[];
}
