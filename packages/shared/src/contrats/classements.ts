import type { TypeCreation } from '../enums';
import type { CodeNiveau } from '../regles';
import type { MembreResumeApi, OutilResumeApi } from './creations';
import type { DefiApi, ParticipationDefiApi } from './defis';
import type { MediaApi } from './medias';
import type { OutilEtModelesApi } from './mes-contenus';
import type { BadgeObtenuApi } from './profil';

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
/** Outil proposé par le choix de l'outil : contributions de la semaine qui le citent (créations
    reproduites ou jugées utiles, réponses acceptées, astuces vérifiées, participations au défi). */
export interface OutilPalmaresApi extends OutilResumeApi {
  contributions: number;
}

/** Passage de niveau pendant la semaine (RG-84), d'après la réputation au début et à la fin. */
export interface PassageNiveauApi {
  membre: MembreResumeApi;
  de: CodeNiveau;
  vers: CodeNiveau;
  reputation: number;
}

/** Badge obtenu pendant la semaine (RG-86). */
export interface BadgeSemaineApi {
  membre: MembreResumeApi;
  badge: Omit<BadgeObtenuApi, 'date'>;
  date: string;
}

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
  /** Outils des contributions de la semaine, du plus cité au moins cité (choix de l'outil). */
  outils: OutilPalmaresApi[];
  /** Outil choisi (?outil=) : palmarès et défi limités à ses contributions ; null pour tous. */
  outil: OutilResumeApi | null;
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
  /** Défi de la semaine (S-07) : le plus récent des défis publiés ou clôturés dont la période
      touche la semaine, et ses participations classées (RG-75) ; null s'il n'y en a pas. */
  defi: { defi: DefiApi; participations: ParticipationDefiApi[] } | null;
  /** Ils progressent : passages de niveau et badges obtenus pendant la semaine (membres classés) ;
      les huit badges les plus récents, et le nombre de badges de la semaine. */
  progression: { niveaux: PassageNiveauApi[]; badges: BadgeSemaineApi[]; badgesObtenus: number };
  /** La personne connectée : sa semaine et sa place ; null pour un visiteur. */
  moi: {
    points: number;
    rangSemaine: number | null;
    rangGeneral: number | null;
    reputation: number;
    niveau: CodeNiveau;
  } | null;
}
