import type {
  DifficulteCas,
  NatureResultat,
  StatutPublication,
  TypeCreation,
  TypeSujet,
} from '../enums';
import type { ConditionPublication } from '../publication';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { MasquageApi } from './moderation';

/* Contrats de la page « Mes contenus » (CREA-04, EC-15, F-16, F-34) :
   GET /api/v1/moi/creations (brouillons et créations publiées du membre connecté) et
   GET /api/v1/moi/enregistrements (sa liste « Enregistrés », RG-45). Les listes sont complètes :
   la page cherche, filtre et trie dans le navigateur, comme le prototype. */

/** Outil utilisé dans le parcours, avec les modèles employés (prototype : mes-contenus.js, outilsDe). */
export interface OutilEtModelesApi {
  outil: OutilResumeApi;
  modeles: string[];
}

/** Début du texte ou du code obtenu, montré à la place d'une image (comme sur la fiche). */
export interface ResultatApercuApi {
  nature: NatureResultat;
  extrait: string;
  /** Nom du fichier, pour du code. */
  nom: string | null;
}

export interface MaCreationApi {
  id: number;
  /** Partie lisible de l'adresse ; null pour un brouillon sans titre. */
  slug: string | null;
  type: TypeCreation;
  /** Faux tant que le parcours est vide (aucun prompt écrit, aucune étape) : « Type à définir ». */
  typeDefini: boolean;
  statut: StatutPublication;
  /** RG-30 : masquée par la modération, visible de son auteur et de la modération seulement. */
  masquee: boolean;
  /** Date et motif du masquage (MOD-01) ; null si la création n’est pas masquée. */
  masquage: MasquageApi | null;
  titre: string | null;
  categorie: { libelle: string; slug: string } | null;
  dateCreation: string;
  /** Dernier enregistrement (RG-18) ; à défaut, la date de création. */
  dateModification: string;
  /** Première publication ; gardée après une dépublication (RG-17). */
  datePublication: string | null;
  /** Première image du résultat, à défaut la dernière jointe à un échange présenté. */
  couverture: MediaApi | null;
  resultat: ResultatApercuApi | null;
  /** Début du premier prompt, à défaut du récit de la première étape (vignette sans image). */
  apercu: string | null;
  outils: OutilEtModelesApi[];
  defi: { titre: string; dateFin: string } | null;
  /** Brouillon : conditions de publication dans l'ordre de l'éditeur ; vide pour une création publiée. */
  conditions: ConditionPublication[];
  /** F-33 : indicateurs de la création publiée (votes « Utile », reproductions et commentaires
      visibles, vues) ; ceux d'un brouillon restent ceux de sa dernière publication. */
  indicateurs: {
    utiles: number;
    reproductions: number;
    reussies: number;
    vues: number;
    commentaires: number;
  };
  /** RG-19, RG-82 : points de réputation que sa suppression retirerait à son auteur. */
  points: number;
  /** F-35 : modèle le plus signalé comme obsolète, membres qui le signalent et premier signalement. */
  obsolescence: { modele: string; membres: number; depuis: string } | null;
}

export interface MesCreationsApi {
  /** Brouillons et créations publiées, du plus récemment modifié au plus ancien. */
  elements: MaCreationApi[];
  /** RG-85 : créations publiées sur 24 heures glissantes et limite du niveau ; null sans limite. */
  publication: {
    limite: number;
    utilisees: number;
    /** Secondes avant qu'une publication redevienne possible ; null si elle l'est déjà. */
    reessayerDans: number | null;
  } | null;
}

interface EnregistrementCommunApi {
  /** Identifiant du contenu enregistré. */
  id: number;
  /** Date de l'enregistrement. */
  date: string;
  titre: string;
  slug: string;
  auteur: MembreResumeApi;
}

export type EnregistrementListeApi =
  | (EnregistrementCommunApi & {
      genre: 'CREATION';
      type: TypeCreation;
      categorie: { libelle: string; slug: string } | null;
      couverture: MediaApi | null;
      resultat: ResultatApercuApi | null;
      outils: OutilEtModelesApi[];
    })
  | (EnregistrementCommunApi & {
      genre: 'SUJET';
      typeSujet: TypeSujet;
      /** Réponses visibles. */
      reponses: number;
      /** RG-63, RG-65 : réponse acceptée (résolu), fermé par l'auteur ou la modération. */
      etat: 'OUVERT' | 'RESOLU' | 'FERME';
      outil: OutilResumeApi | null;
      modele: string | null;
    })
  | (EnregistrementCommunApi & {
      genre: 'CAS';
      difficulte: DifficulteCas;
    });

export interface MesEnregistrementsApi {
  /** Contenus visibles de tous, du plus récemment enregistré au plus ancien. */
  elements: EnregistrementListeApi[];
}
