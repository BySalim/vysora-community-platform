import type {
  AvertissementAgent,
  ModeSelection,
  NatureResultat,
  ResultatReproduction,
  StatutPublication,
  TypeCreation,
  TypeLienExterne,
  TypeMomentCle,
} from '../enums';
import type { CodeNiveau } from '../regles';
import type { MediaApi } from './medias';
import type { MasquageApi } from './moderation';

/* Contrat de GET /api/v1/creations/:id (CREA-01, F-23) : tout ce que la fiche création affiche,
   dans l'ordre de F-23. Les textes rédigés (objectif, limites, récits, réponses, commentaires) sont
   en Markdown brut : le site les rend avec son rendu assaini (SEC-01). Les prompts sont du texte
   exact, à afficher et copier tel quel (F-24). */

/** Membre tel qu'une page le présente à côté d'un contenu. */
export interface MembreResumeApi {
  id: number;
  pseudo: string;
  /** Nom affiché (« Claire Dubois ») ; à défaut, le pseudo. */
  nom: string;
  avatar: string | null;
  niveau: { code: CodeNiveau; libelle: string };
  /** RG-83 : somme des mouvements, plancher à 0 (prototype : réputation à côté du nom). */
  reputation: number;
}

export interface OutilResumeApi {
  id: number;
  nom: string;
  slug: string;
  logo: string | null;
  logoMonochrome: boolean;
}

export interface ModeleResumeApi {
  id: number;
  nom: string;
  nomCourt: string;
}

/** F-13, RG-14 : modèle du référentiel ou, à défaut, saisi en texte libre. */
export interface ConfigurationIaApi {
  id: number;
  outil: OutilResumeApi | null;
  modele: ModeleResumeApi | null;
  modeleNonReference: string | null;
  parametres: string | null;
  contexteCache: string | null;
}

export interface EchangeApi {
  id: number;
  ordre: number;
  /** Titre de l’échange dans le parcours (« Composer la réservation »), s’il en a un. */
  titre: string | null;
  prompt: string | null;
  reponse: string | null;
  nbEssais: number;
  modeSelection: ModeSelection;
  /** Configuration de l'étape utilisée (projet à plusieurs configurations). */
  configurationId: number | null;
  /** Images jointes à l'échange (JOINDRE). */
  images: MediaApi[];
}

/** RG-15 : rattaché à l'étape et, s'il y a lieu, à l'un de ses échanges. */
export interface MomentCleApi {
  id: number;
  type: TypeMomentCle;
  /** Titre propre (« Vérifier les réservations simultanées ») ; à défaut, la fiche en donne un selon le type. */
  titre: string | null;
  explication: string | null;
  echangeId: number | null;
}

export interface EtapeApi {
  id: number;
  ordre: number;
  titre: string | null;
  recit: string | null;
  configurations: ConfigurationIaApi[];
  echanges: EchangeApi[];
  moments: MomentCleApi[];
}

export interface LienExterneApi {
  type: TypeLienExterne;
  url: string;
  libelle: string | null;
}

/** Essais d'une même configuration (outil et modèle), pour comparer les modèles testés. */
export interface EssaisParConfigurationApi {
  outil: OutilResumeApi;
  /** Modèle du référentiel, null s'il est saisi en texte libre ou non précisé. */
  modeleId: number | null;
  /** Nom du modèle (référentiel ou texte libre), null s'il n'est pas précisé. */
  modele: string | null;
  essais: number;
  reussis: number;
}

/** F-33 : indicateurs de preuve et de fraîcheur. */
export interface PreuveCreationApi {
  /** Votes « Utile » (F-30). */
  utiles: number;
  vues: number;
  reproductions: {
    total: number;
    reussies: number;
    /** RG-43 : pourcentage arrondi, à partir de 3 reproductions ; null en dessous. */
    tauxSucces: number | null;
    /** Date de la dernière reproduction (ISO 8601). */
    derniere: string | null;
    /** Modèles avec lesquels elle a été reproduite avec succès. */
    modelesReussis: string[];
    parConfiguration: EssaisParConfigurationApi[];
  };
  /** F-35 : membres distincts qui la signalent obsolète, par modèle (bannière à partir de RG-44). */
  obsolescence: { modele: ModeleResumeApi; membres: number; depuis: string }[];
}

/** Reproduction déclarée avec un retour écrit (RG-42). */
export interface RetourReproductionApi {
  id: number;
  auteur: MembreResumeApi;
  date: string;
  resultat: ResultatReproduction;
  outil: OutilResumeApi;
  modele: string | null;
  retour: string | null;
}

/** RG-50, RG-51 : un commentaire supprimé qui a des réponses reste, sans auteur ni texte. */
export interface CommentaireApi {
  id: number;
  parentId: number | null;
  auteur: MembreResumeApi | null;
  date: string;
  dateModification: string | null;
  corps: string | null;
  supprime: boolean;
}

export interface CreationFicheApi {
  id: number;
  /** Partie lisible de l'adresse (/creations/[id]-[slug]) ; null pour un brouillon sans titre. */
  slug: string | null;
  type: TypeCreation;
  statut: StatutPublication;
  /** RG-30 : masquée par la modération (visible seulement de son auteur et de la modération). */
  masquee: boolean;
  /** Date et motif du masquage (MOD-01) ; null si la création n’est pas masquée. */
  masquage: MasquageApi | null;
  titre: string | null;
  objectif: string | null;
  limites: string | null;
  /** Format du résultat (« Paysage · 4:3 », « Interface de réservation »), s’il est précisé. */
  formatResultat: string | null;
  /** Ce qu’il faut adapter pour réutiliser la création (liste « À adapter » de la fiche). */
  aAdapter: string[];
  dateCreation: string;
  datePublication: string | null;
  /** RG-18 : date de dernière modification affichée. */
  dateModification: string | null;
  auteur: MembreResumeApi;
  categorie: { id: number; libelle: string; slug: string; icone: string | null } | null;
  licence: { code: string; libelle: string; url: string; autoriseVariantes: boolean };
  etiquettes: { libelle: string; slug: string }[];
  /** RG-23 */
  avertissementAgent: AvertissementAgent;
  defi: { id: number; slug: string; titre: string } | null;
  /** Guide d'Explorer qui présente la création, si elle est publiée et visible (DEC-01). */
  guide: { slug: string; titre: string; titreCourt: string } | null;
  /** Résultat : images de la création (ILLUSTRER), texte ou code obtenu, liens externes. */
  images: MediaApi[];
  resultat: { nature: NatureResultat; texte: string; nom: string | null } | null;
  liens: LienExterneApi[];
  etapes: EtapeApi[];
  preuve: PreuveCreationApi;
  /** Les 6 dernières reproductions avec un retour écrit, des plus récentes aux plus anciennes. */
  retours: RetourReproductionApi[];
  /** Du plus ancien au plus récent, réponses comprises. */
  commentaires: { total: number; elements: CommentaireApi[] };
  /** Ce qui concerne la personne connectée ; null pour un visiteur. `signalementOuvert` : elle a
      signalé la création et la modération ne l’a pas encore examinée (RG-100). */
  moi: {
    auteur: boolean;
    utile: boolean;
    enregistree: boolean;
    signalementOuvert: boolean;
  } | null;
}
