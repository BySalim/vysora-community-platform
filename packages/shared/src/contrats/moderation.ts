import type {
  ActionDecision,
  ActionDecisionModerateur,
  AvertissementAgent,
  MotifSignalement,
  StatutContenu,
  StatutSignalement,
  TypeContenu,
} from '../enums';
import type { MembreResumeApi } from './creations';

/* Contrats de la modération (MOD-01, F-90 à F-92) :
   POST /api/v1/contenus/:id/signalements (membre), GET /api/v1/moderation/file,
   GET /api/v1/moderation/contenus/:id et POST /api/v1/moderation/contenus/:id/decisions (modération). */

/** Signalement enregistré (F-90). */
export interface SignalementEnregistreApi {
  id: number;
  date: string;
}

/** Page du site où se lit un contenu : la création (un commentaire ou une reproduction y ont leur
    ancre), le sujet (une réponse y a la sienne) ou le cas. */
export interface PageDuContenuApi {
  genre: 'CREATION' | 'SUJET' | 'CAS';
  id: number;
  slug: string | null;
  /** Identifiant de l'élément dans la page (« commentaire-12 ») ; null pour le contenu lui-même. */
  ancre: string | null;
}

/** Contenu tel que la modération le présente. */
export interface ContenuModereApi {
  id: number;
  type: TypeContenu;
  statut: StatutContenu;
  /** Titre (création, sujet, cas) ou début du texte (commentaire, réponse, reproduction). */
  intitule: string;
  page: PageDuContenuApi | null;
  auteur: MembreResumeApi;
  dateCreation: string;
  dateModification: string | null;
}

/** Contenu de la file de modération (F-91). */
export interface ElementFileModerationApi {
  contenu: ContenuModereApi;
  /** Date qui range le contenu dans la file : premier signalement ouvert, ou modification par son
      auteur d'un contenu masqué (nouvel examen). */
  depuis: string;
  /** RG-105 : en attente depuis plus de 72 heures. */
  enRetard: boolean;
  /** Signalements ouverts, motifs du plus au moins fréquent. */
  signalements: { nombre: number; motifs: { motif: MotifSignalement; nombre: number }[] };
  /** Contenu masqué que son auteur a modifié depuis la dernière décision : nouvel examen demandé. */
  nouvelExamen: boolean;
  /** Décisions fondées qui ont déjà visé l'auteur ou ses contenus. */
  historiqueAuteur: {
    decisions: number;
    derniere: { action: ActionDecision; date: string } | null;
  };
}

/** File de modération : du plus ancien au plus récent (F-91). */
export interface FileModerationApi {
  elements: ElementFileModerationApi[];
  suivant: string | null;
  /** Contenus de la file, toutes pages comprises, et ceux qui attendent depuis plus de 72 heures. */
  total: number;
  enRetard: number;
}

export interface SignalementApi {
  id: number;
  motif: MotifSignalement;
  precision: string | null;
  date: string;
  statut: StatutSignalement;
  signaleur: MembreResumeApi;
  /** Décision qui l'a clos (CI-20). */
  decisionId: number | null;
}

/** Décision de modération, immuable (RG-102). */
export interface DecisionApi {
  id: number;
  action: ActionDecision;
  motif: string;
  date: string;
  /** Fin d'une suspension (F-91, RG-103). */
  finSuspension: string | null;
  decideur: MembreResumeApi;
  contenuId: number | null;
  /** Titre ou début du texte du contenu visé (historique de l'auteur). */
  intituleContenu: string | null;
  /** Membre sanctionné (avertissement, suspension). */
  membreVise: MembreResumeApi | null;
  /** Signalements clos par la décision (CI-20). */
  signalementsClos: number;
}

/** Dossier d'un contenu : ce que la modération examine avant de décider (F-91). */
export interface DossierModerationApi {
  contenu: ContenuModereApi;
  /** Texte entier d'un commentaire, d'une réponse, d'un sujet ou du retour d'un essai, qui se lit
      ici même s'il est masqué ; null pour une création ou un cas, qui ont leur page. */
  texte: string | null;
  /** Avertissement « instructions pour agent » d'une création (RG-23) ; null pour un autre contenu. */
  avertissementAgent: AvertissementAgent | null;
  /** Décisions possibles dans l'état du contenu (actionsPossibles) ; aucune s'il est supprimé. */
  actions: ActionDecisionModerateur[];
  /** Tous les signalements du contenu, du plus ancien au plus récent. */
  signalements: SignalementApi[];
  /** Décisions qui portent sur ce contenu, de la plus récente à la plus ancienne. */
  decisions: DecisionApi[];
  /** Décisions qui ont visé l'auteur ou ses autres contenus, des plus récentes aux plus anciennes. */
  historiqueAuteur: DecisionApi[];
  /** Fin de la suspension en cours de l'auteur (RG-103). */
  suspensionJusqua: string | null;
  nouvelExamen: boolean;
}

/** Masquage d'une création, présenté à son auteur et à la modération (RG-30) : date et motif de la
    décision ; nombre de signalements qu'elle a clos, pour la modération seulement. */
export interface MasquageApi {
  /** Null si la date est inconnue (contenu masqué sans décision enregistrée). */
  date: string | null;
  motif: string | null;
  signalements: number | null;
}
