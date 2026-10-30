import type { DifficulteCas, StatutValidationCas } from '../enums';
import type { MembreResumeApi, ModeleResumeApi, OutilResumeApi } from './creations';
import type { EtiquetteApi } from './forum';
import type { MasquageApi } from './moderation';

/* Contrats de Bon réflexe (APP-01, F-60 à F-62) : GET /api/v1/cas (liste des cas validés),
   GET /api/v1/cas/:id (cas et, selon la personne, sa correction), POST /api/v1/cas/:id/reponses,
   écriture par l'auteur, examen par la modération, listes privées de l'auteur et de l'apprenant.
   Textes rendus comme le prototype : la demande et la réponse de l'IA en texte exact, le reste en
   Markdown brut (rendu assaini par le site, SEC-01). */

/** Cas tel que la liste le présente (prototype : caseRowHTML). */
export interface CasResumeApi {
  id: number;
  /** Partie lisible de l'adresse (/bon-reflexe/[id]-[slug]). */
  slug: string;
  titre: string;
  /** Situation de départ (le prototype l'affiche sous le titre). */
  contexte: string;
  difficulte: DifficulteCas;
  /** Domaine (catégorie) et durée estimée (« Code et scripts · 5 min »), si l'auteur les a indiqués. */
  domaine: { libelle: string; slug: string } | null;
  dureeMinutes: number | null;
  /** Outil et modèle qui ont donné la réponse étudiée. */
  outil: OutilResumeApi | null;
  modele: string | null;
  etiquettes: EtiquetteApi[];
  auteur: MembreResumeApi;
  /** Date de la validation, qui publie le cas. */
  date: string;
  /** Réponses enregistrées. */
  reponses: number;
  /** Part des bonnes réponses, en pourcentage entier (« 74 % de bonnes réponses »). */
  reussite: number;
  /** Votes « Utile » (RG-41). */
  utiles: number;
  /** Réponse de la personne connectée (« Réussi », « À revoir ») ; null sans réponse et pour un visiteur. */
  maReponse: { correcte: boolean } | null;
}

export interface ListeCasApi {
  /** Vingt cas par page. */
  elements: CasResumeApi[];
  /** Cas qui répondent aux filtres. */
  total: number;
  page: number;
  pages: number;
  /** Cas de chaque difficulté, les autres filtres appliqués (puces « Débutant »… du prototype). */
  parDifficulte: Record<DifficulteCas, number>;
}

/** Option telle que l'apprenant la voit avant de répondre : son texte seulement. */
export interface OptionCasApi {
  id: number;
  libelle: string;
}

/** F-62 : la bonne option, l'explication de chaque option, l'explication générale et la répartition
    des réponses de la communauté. */
export interface CorrectionCasApi {
  optionCorrecteId: number;
  /** Explication générale de l'auteur (RG-70). */
  explication: string;
  /** Dans l'ordre des options. */
  options: {
    id: number;
    explication: string;
    correcte: boolean;
    /** Réponses enregistrées pour cette option. */
    reponses: number;
    /** Part des réponses, en pourcentage entier ; les parts totalisent 100 (0 sans réponse). */
    part: number;
  }[];
  reponses: number;
  /** Part des bonnes réponses, en pourcentage entier. */
  reussite: number;
}

export interface CasApi {
  id: number;
  slug: string;
  titre: string;
  contexte: string;
  /** Demande faite à l'IA et sa réponse, en texte exact. */
  demandeIa: string;
  reponseIa: string;
  question: string;
  difficulte: DifficulteCas;
  domaine: { libelle: string; slug: string } | null;
  dureeMinutes: number | null;
  outil: OutilResumeApi | null;
  modele: ModeleResumeApi | null;
  modeleNonReference: string | null;
  etiquettes: EtiquetteApi[];
  auteur: MembreResumeApi;
  dateCreation: string;
  /** Dernière modification par l'auteur. */
  dateModification: string | null;
  /** CV-04 : un cas proposé ou refusé n'est présenté qu'à son auteur et à la modération (RG-30). */
  statut: StatutValidationCas;
  /** Date de la validation d'un cas validé. */
  dateValidation: string | null;
  /** RG-71 : dernier examen (validation ou refus motivé) ; présenté à l'auteur et à la modération
      seulement. `par` est null pour l'auteur, et si le compte n'existe plus. */
  examen: { date: string; par: MembreResumeApi | null; motif: string | null } | null;
  /** Dans l'ordre d'affichage. */
  options: OptionCasApi[];
  /** Après la réponse de la personne connectée ; toujours pour l'auteur et la modération ; null
      sinon (un visiteur la reçoit en répondant : POST /api/v1/cas/:id/reponses). */
  correction: CorrectionCasApi | null;
  utiles: number;
  /** Place parmi les cas validés, du plus récent au plus ancien (« Cas 3 sur 8 », « Cas suivant »,
      qui revient au premier après le dernier) ; null pour un cas qui n'est pas visible de tous. */
  position: {
    rang: number;
    total: number;
    suivant: { id: number; slug: string; titre: string } | null;
  } | null;
  /** RG-30 : masqué par la modération (présenté à son auteur et à la modération seulement). */
  masquee: boolean;
  masquage: MasquageApi | null;
  /** Ce qui concerne la personne connectée ; null pour un visiteur. */
  moi: {
    /** RG-72 : l'auteur ne répond pas à son cas. */
    auteur: boolean;
    /** RG-72 : sa première réponse, définitive. */
    reponse: { optionId: number; correcte: boolean; date: string } | null;
    utile: boolean;
    enregistre: boolean;
    signalementOuvert: boolean;
    /** RG-71 : cas proposé, visible, dont la personne n'est pas l'auteur, et rôle de modération. */
    peutExaminer: boolean;
  } | null;
}

/** Réponse à POST /api/v1/cas/:id/reponses (F-62). */
export interface ReponseCasApi {
  optionId: number;
  correcte: boolean;
  /** RG-72 : enregistrée pour un membre au compte actif ; un visiteur, ou un compte en lecture
      seule, voit la correction sans que sa réponse soit gardée. */
  enregistree: boolean;
  /** Date de la réponse enregistrée. */
  date: string | null;
  correction: CorrectionCasApi;
}

/** Cas proposé, tel que la modération le voit dans la liste des cas à valider (EC-20). */
export interface CasAValiderApi {
  id: number;
  slug: string;
  titre: string;
  difficulte: DifficulteCas;
  auteur: MembreResumeApi;
  /** Dernière soumission : la dernière modification, à défaut la création. */
  dateSoumission: string;
  /** RG-71 : soumis de nouveau après une modification (correction d'un refus, cas validé modifié). */
  nouvelleSoumission: boolean;
  /** RG-71 : cas de la personne qui consulte ; un autre membre de l'équipe l'examinera. */
  mien: boolean;
  masquee: boolean;
}

export interface ListeCasAValiderApi {
  /** Du plus ancien au plus récent, vingt par page. */
  elements: CasAValiderApi[];
  total: number;
  /** Curseur de la page suivante (`?apres=`), null à la fin. */
  suivant: string | null;
}

/** Cas de l'auteur (GET /api/v1/moi/cas), quel que soit son statut. */
export interface MonCasApi {
  id: number;
  slug: string;
  titre: string;
  difficulte: DifficulteCas;
  statut: StatutValidationCas;
  dateCreation: string;
  dateModification: string | null;
  /** RG-71 : date du dernier examen et motif d'un refus. */
  examen: { date: string; motif: string | null } | null;
  reponses: number;
  utiles: number;
  masquee: boolean;
  masquage: MasquageApi | null;
}

export interface MesCasApi {
  /** Du plus récemment modifié au plus ancien. */
  elements: MonCasApi[];
}

/** RG-72, RG-88 : statistiques d'apprentissage, visibles du seul membre (GET /api/v1/moi/apprentissage).
    Comptées sur les cas visibles de tous. */
export interface ApprentissageApi {
  cas: {
    repondus: number;
    reussis: number;
    /** Cas validés auxquels le membre peut répondre ou a répondu (hors les siens). */
    total: number;
  };
  /** Cas manqués, de la réponse la plus récente à la plus ancienne (« Réponse à revoir »). */
  aRevoir: { id: number; slug: string; titre: string; difficulte: DifficulteCas; date: string }[];
}
