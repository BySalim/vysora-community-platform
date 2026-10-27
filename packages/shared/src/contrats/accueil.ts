import type { ResultatReproduction, TypeCreation, TypeSujet } from '../enums';
import type { CasApi } from './bon-reflexe';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { OutilEtModelesApi, ResultatApercuApi } from './mes-contenus';

/* Contrat de GET /api/v1/accueil (ACC-01, F-21, EC-01) : ce que l'accueil du prototype tirait de
   data.js, calculé sur les contenus visibles de tous (RG-30). Les textes et les illustrations de la
   page (constat, méthode, engagements, questions fréquentes) restent dans la page. Les semaines et
   les jours se comptent en temps universel, comme le classement (RG-87). */

/** Création telle qu'une carte de l'accueil la présente (prototype : cardHTML). */
export interface CarteCreationApi {
  id: number;
  slug: string;
  type: TypeCreation;
  titre: string;
  categorie: { libelle: string; slug: string } | null;
  auteur: MembreResumeApi;
  /** Outils du parcours et modèles employés (« Claude · Sonnet 4.5 »). */
  outils: OutilEtModelesApi[];
  /** Première image du résultat, comme la fiche ; à défaut, le texte ou le code obtenu. */
  couverture: MediaApi | null;
  resultat: ResultatApercuApi | null;
  /** Échanges (1 prompt, itération) ou étapes (projet), dans l'ordre : vrai s'il y a un moment clé. */
  trace: boolean[];
  /** Moments clés du parcours. */
  moments: number;
  reproductions: number;
  /** RG-43 : à partir de 3 reproductions ; null en dessous. */
  tauxReussite: number | null;
  datePublication: string;
  /** RG-32 : votes « Utile » des 7 derniers jours glissants. */
  utilesSemaine: number;
  /** Reproductions réussies des 30 derniers jours. */
  reussitesMois: number;
}

export interface CreationsAccueilApi {
  /** RG-32 : votes « Utile » des 7 derniers jours, puis votes en tout (six au plus). */
  utiles: CarteCreationApi[];
  /** Dernières publiées. */
  recentes: CarteCreationApi[];
  /** Reproductions réussies des 30 derniers jours, puis en tout ; créations reproductibles qui en
      ont au moins une. */
  reproduites: CarteCreationApi[];
  /** Exemple de chaque type, pour « Du prompt au projet » : la plus utile de son type. */
  exemples: Partial<Record<TypeCreation, { id: number; slug: string; titre: string }>>;
}

/** Domaine de « Parcourir par domaine », avec ses créations publiées et visibles. */
export interface DomaineAccueilApi {
  libelle: string;
  slug: string;
  icone: string | null;
  creations: number;
}

/** La communauté en chiffres. */
export interface ChiffresAccueilApi {
  /** Créations publiées et visibles. */
  creations: number;
  /** Reproductions visibles de créations visibles. */
  reproductions: number;
  /** Questions et cliniques visibles qui ont une réponse acceptée. */
  questionsResolues: number;
}

/** Ligne de « Dernières contributions » : seules des actions déjà publiques (publication, essai,
    réponse acceptée, sujet, badge, participation à un défi), jamais un vote ni une réponse à un cas
    (RG-88). */
export interface ActiviteAccueilApi {
  /** Identifiant stable de l'événement (« repro:12 ») : le fil ajoute ce qu'il n'a pas encore. */
  cle: string;
  genre: 'publication' | 'participation' | 'reproduction' | 'reponse-acceptee' | 'sujet' | 'badge';
  date: string;
  membre: MembreResumeApi;
  /** Contenu visé et son adresse (création, sujet). */
  cible: { titre: string; href: string } | null;
  /** Publication : type de la création ; sujet : son type. */
  typeCreation?: TypeCreation;
  typeSujet?: TypeSujet;
  /** Reproduction : résultat déclaré, outil et modèle. */
  resultat?: ResultatReproduction;
  outil?: OutilResumeApi;
  modele?: string | null;
  /** Réponse acceptée : points reçus. */
  points?: number;
  /** Badge obtenu. */
  badge?: string;
}

/** « Interactions d'apprentissage » : votes « Utile » et « Testé, ça marche », reproductions déclarées,
    cas Bon réflexe réussis et réponses acceptées, par jour. */
export interface ApprentissageAccueilApi {
  /** Premier jour de la courbe (AAAA-MM-JJ), un lundi : trois semaines avant la semaine en cours. */
  debut: string;
  /** Une valeur par jour, du premier jour à aujourd'hui (journée en cours comprise). */
  parJour: number[];
  /** Depuis lundi : répartition dans l'ordre votes, reproductions, cas réussis, réponses acceptées. */
  semaine: { votes: number; reproductions: number; casReussis: number; reponsesAcceptees: number };
}

/** « Ces questions attendent votre aide » : questions et cliniques ouvertes, sans réponse d'un autre
    membre (`enAttente` du forum), des plus récentes aux plus anciennes. */
export interface SujetEnAttenteApi {
  id: number;
  slug: string;
  type: TypeSujet;
  titre: string;
  auteur: MembreResumeApi;
  date: string;
  outil: OutilResumeApi | null;
  modele: string | null;
}

/** « Astuce de la semaine » : la plus testée ces 7 derniers jours, à défaut en tout. */
export interface AstuceAccueilApi {
  id: number;
  slug: string;
  titre: string;
  exempleAvant: string;
  exempleApres: string;
  auteur: MembreResumeApi;
  outil: OutilResumeApi | null;
  modele: string | null;
  /** Votes « Testé, ça marche ». */
  testes: number;
}

/** RG-87 : points gagnés depuis lundi 00:00 (UTC), membres actifs seulement. */
export interface ClassementSemaineApi {
  membre: MembreResumeApi;
  points: number;
}

/** « Clinique du prompt » : une clinique résolue récemment, avec le prompt de départ et celui de la
    réponse acceptée. */
export interface CliniqueAccueilApi {
  id: number;
  slug: string;
  titre: string;
  auteur: MembreResumeApi;
  outil: OutilResumeApi | null;
  modele: string | null;
  /** Délai entre la question et l'acceptation, en minutes. */
  resolueEnMinutes: number;
  promptInitial: string;
  /** Prompt proposé par la réponse acceptée (null si elle n'en propose pas). */
  promptPropose: string | null;
  /** Texte de la réponse acceptée, en Markdown brut. */
  explication: string;
  reponseAcceptee: { auteur: MembreResumeApi };
  /** Réponses visibles au sujet. */
  reponses: number;
}

/** Défi publié dont la période est en cours (F-21). */
export interface DefiAccueilApi {
  id: number;
  slug: string;
  titre: string;
  /** Contraintes, une par ligne. */
  regles: string[];
  dateFin: string;
  participations: number;
  /** Cinq participants au plus, des plus récents aux plus anciens. */
  participants: MembreResumeApi[];
  /** Image de la participation la plus utile, à défaut aucune. */
  image: MediaApi | null;
}

export interface AccueilApi {
  creations: CreationsAccueilApi;
  domaines: DomaineAccueilApi[];
  chiffres: ChiffresAccueilApi;
  activite: ActiviteAccueilApi[];
  apprentissage: ApprentissageAccueilApi;
  enAttente: SujetEnAttenteApi[];
  astuce: AstuceAccueilApi | null;
  classement: ClassementSemaineApi[];
  /** Bon réflexe : un cas validé (pour un membre, un cas auquel il n'a pas répondu s'il en reste,
      F-21), présenté comme sa page (correction selon la personne). */
  bonReflexe: {
    cas: CasApi | null;
    /** Réponses enregistrées ces 7 derniers jours. */
    reponsesSemaine: number;
  };
  clinique: {
    exemple: CliniqueAccueilApi | null;
    /** Délai moyen de résolution des cliniques, en minutes ; null sans clinique résolue. */
    resolutionMoyenneMinutes: number | null;
  };
  defi: DefiAccueilApi | null;
  /** Heure de calcul (dates relatives et compte à rebours). */
  maintenant: string;
}

/** GET /api/v1/accueil/activite : le fil, relu pendant que la page reste ouverte. */
export interface ActiviteRecenteApi {
  elements: ActiviteAccueilApi[];
}
