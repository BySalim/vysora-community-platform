import type { TypeCreation } from '../enums';
import type { CodeNiveau } from '../regles';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { OutilEtModelesApi } from './mes-contenus';

/** Semaine du palmarès (RG-87) : du lundi 00:00 au dimanche 23:59 (UTC). */
export interface SemaineClassementApi {
  /** Lundi (AAAA-MM-JJ), identifiant de la semaine (?semaine=). */
  debut: string;
  /** Dimanche (AAAA-MM-JJ). */
  fin: string;
  /** La semaine en cours est provisoire ; les précédentes sont arrêtées. */
  statut: 'provisoire' | 'arretee';
}

/** Création citée dans un palmarès. */
export interface CreationPalmaresApi {
  id: number;
  slug: string;
  titre: string;
  type: TypeCreation;
  outils: OutilEtModelesApi[];
  couverture: MediaApi | null;
}

/** Sujet du forum cité dans un palmarès (question résolue, astuce). */
export interface SujetPalmaresApi {
  id: number;
  slug: string;
  titre: string;
  outil: OutilResumeApi | null;
  modele: string | null;
}

/** « Méthodes réussies » et « Créations utiles » : une création et son auteur. */
export interface EntreeCreationApi {
  membre: MembreResumeApi;
  creation: CreationPalmaresApi;
  /** Réussites (membres distincts) ou votes « Utile » de la semaine. */
  nombre: number;
  /** Méthodes réussies : reproductions déclarées de la semaine, et les membres qui ont réussi. */
  declarees?: number;
  par?: MembreResumeApi[];
  points: number;
}

/** « Entraide » : réponses acceptées d'un membre pendant la semaine. */
export interface EntreeEntraideApi {
  membre: MembreResumeApi;
  nombre: number;
  /** Votes « Utile » reçus pendant la semaine sur ses réponses. */
  utiles: number;
  /** La dernière réponse acceptée : question, qui l'a posée, extrait et date. */
  echange: {
    sujet: SujetPalmaresApi;
    demandeur: MembreResumeApi | null;
    extrait: string;
    date: string;
  };
  points: number;
}

/** « Astuces vérifiées » : votes « Testé, ça marche » reçus par une astuce. */
export interface EntreeAstuceApi {
  membre: MembreResumeApi;
  sujet: SujetPalmaresApi;
  nombre: number;
  points: number;
}

/** Rang d'un membre (RG-87) ; à égalité de points, même rang. */
export interface RangClassementApi {
  rang: number;
  membre: MembreResumeApi;
  niveau: CodeNiveau;
  points: number;
  /** Classement de la semaine : places gagnées (positif) ou perdues depuis la semaine précédente ;
      « nouveau » s'il n'y était pas classé ; null pour le classement général. */
  evolution: number | 'nouveau' | null;
}

/** GET /api/v1/classements?semaine=AAAA-MM-JJ (F-75, RG-87). */
export interface ClassementsApi {
  /** La semaine en cours et les deux précédentes, de la plus récente à la plus ancienne. */
  semaines: SemaineClassementApi[];
  semaine: SemaineClassementApi;
  chiffres: {
    votes: number;
    reproductions: number;
    casReussis: number;
    reponsesAcceptees: number;
    /** Somme des quatre : interactions d'apprentissage de la semaine. */
    interactions: number;
  };
  /** Cinq premiers de chaque palmarès. */
  palmares: {
    reussites: EntreeCreationApi[];
    entraide: EntreeEntraideApi[];
    utiles: EntreeCreationApi[];
    astuces: EntreeAstuceApi[];
  };
  /** Cinquante premiers (RG-87) ; membres actifs seulement. */
  membres: {
    semaine: RangClassementApi[];
    general: RangClassementApi[];
    /** Membres classés (au moins un point). */
    classesSemaine: number;
    classesGeneral: number;
  };
  /** La personne connectée : sa semaine et sa place ; null pour un visiteur. */
  moi: {
    points: number;
    rangSemaine: number | null;
    rangGeneral: number | null;
    reputation: number;
    niveau: CodeNiveau;
  } | null;
}
