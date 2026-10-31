import type {
  MotifMouvementReputation,
  ResultatReproduction,
  Role,
  TonBadge,
  TypeContenu,
  TypeCreation,
} from '../enums';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { OutilEtModelesApi, ResultatApercuApi } from './mes-contenus';

/* Contrat de GET /api/v1/membres/:pseudo (PROF-01, F-05, F-73, F-74, EC-14) : profil public d'un
   membre, calculé sur ses contenus visibles de tous (RG-30), et, pour son propriétaire seulement,
   sa progression (RG-88 : réputation détaillée, apprentissage, limites RG-85, brouillons). */

/** Création publiée telle que la galerie du profil la présente (prototype : renderCreations). */
export interface CreationProfilApi {
  id: number;
  slug: string;
  type: TypeCreation;
  titre: string;
  categorie: { libelle: string; slug: string; icone: string | null } | null;
  /** Image du résultat ; à défaut, le texte ou le code obtenu, à défaut le début du premier prompt. */
  couverture: MediaApi | null;
  resultat: ResultatApercuApi | null;
  apercu: string | null;
  outils: OutilEtModelesApi[];
  utiles: number;
  reproductions: number;
  reussies: number;
  /** RG-43 : à partir de 3 reproductions. */
  tauxReussite: number | null;
  moments: number;
  datePublication: string;
}

/** Contribution publique récente (prototype : contributions) : ce que chacun voit déjà ailleurs. */
export type ContributionProfilApi =
  | {
      genre: 'creation';
      date: string;
      creation: { id: number; slug: string; titre: string; type: TypeCreation };
      outil: OutilResumeApi | null;
    }
  | {
      genre: 'reponse';
      date: string;
      /** Réponse acceptée par l'auteur du sujet (RG-63). */
      acceptee: boolean;
      sujet: { id: number; slug: string; titre: string };
      /** Auteur du sujet (« Question de Mariam Diop »). */
      auteur: MembreResumeApi;
      outil: OutilResumeApi | null;
    }
  | {
      genre: 'essai';
      date: string;
      resultat: ResultatReproduction;
      creation: { id: number; slug: string; titre: string };
      /** Auteur de la création reproduite. */
      auteur: MembreResumeApi;
      outil: OutilResumeApi;
      modele: string | null;
    };

/** Badge obtenu (F-74, RG-86). */
export interface BadgeObtenuApi {
  code: string;
  libelle: string;
  critere: string;
  icone: string;
  ton: TonBadge;
  date: string;
}

/** Badge pas encore obtenu et avancement du membre vers son objectif (PROF-02, RG-86). */
export interface ProchainBadgeApi extends Omit<BadgeObtenuApi, 'date'> {
  /** Où en est le membre : peut atteindre l'objectif avant le passage de l'attribution. */
  valeur: number;
  objectif: number;
  /** « membres », « cas répondus », accordée à l'objectif. */
  unite: string;
}

/** Points d'un même motif (RG-80), annulations comprises (RG-82). */
export interface DetailReputationApi {
  motif: Exclude<MotifMouvementReputation, 'ANNULATION'>;
  /** Vote « Utile » : type du contenu qui l'a reçu (création, réponse, sujet, cas). */
  typeContenu: TypeContenu | null;
  /** Podium d'un défi : points de la place (50, 30, 20). */
  pointsUnitaires: number | null;
  /** Mouvements non annulés. */
  nombre: number;
  /** Somme des points, annulations déduites. */
  points: number;
}

/** RG-88 : ce que seul le propriétaire du profil voit. */
export interface ProfilPriveApi {
  reputation: {
    total: number;
    /** Points gagnés depuis lundi 00:00 (UTC). */
    semaine: number;
    /** Réputation à la fin de chaque semaine depuis l'inscription, douze semaines au plus, la
        semaine en cours en dernier. */
    parSemaine: { semaine: string; valeur: number; gain: number }[];
    details: DetailReputationApi[];
  };
  apprentissage: { casRepondus: number; casReussis: number; reproductionsDeclarees: number };
  /** RG-85 sur 24 heures glissantes ; null sans limite (niveaux Expert et Maître, équipe). */
  limites: Record<
    'creations' | 'sujets' | 'reponses',
    { utilisees: number; limite: number }
  > | null;
  brouillons: {
    nombre: number;
    /** Le plus récemment modifié. */
    dernier: { id: number; titre: string | null; date: string } | null;
  };
  /** Les plus avancés d'abord, trois au plus (`prochainsBadges`). */
  prochainsBadges: ProchainBadgeApi[];
}

export interface ProfilApi {
  membre: {
    id: number;
    pseudo: string;
    nom: string;
    avatar: string | null;
    niveau: MembreResumeApi['niveau'];
    reputation: number;
    role: Role;
    biographie: string | null;
    lien: string | null;
    dateInscription: string;
  };
  /** F-73, RG-88 : statistiques publiques, sur les contenus visibles de tous. */
  statistiques: {
    creations: number;
    /** Votes « Utile » reçus sur tous ses contenus. */
    utiles: number;
    /** Reproductions reçues sur ses créations et part réussie (RG-43). */
    reproductions: number;
    reussies: number;
    tauxReussite: number | null;
    reponsesAcceptees: number;
    /** Vues cumulées de ses contenus publiés (F-23). */
    vues: number;
  };
  /** Créations publiées et visibles, des plus récentes aux plus anciennes. */
  creations: CreationProfilApi[];
  /** Des plus récentes aux plus anciennes, trente au plus. */
  contributions: ContributionProfilApi[];
  /** Du plus récent au plus ancien. */
  badges: BadgeObtenuApi[];
  /** Propriétaire connecté seulement. */
  prive: ProfilPriveApi | null;
}

/** Réponse à PATCH /api/v1/moi/profil. */
export interface ProfilPublicApi {
  biographie: string | null;
  lien: string | null;
}
