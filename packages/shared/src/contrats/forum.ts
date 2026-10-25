import type { TypeSujet } from '../enums';
import type { EtatSujet, RubriquesClinique } from '../forum';
import type { MembreResumeApi, ModeleResumeApi, OutilResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { MasquageApi } from './moderation';

/* Contrats du forum (FORUM-01, F-50 à F-55) : GET /api/v1/sujets (liste), GET /api/v1/sujets/:id
   (sujet et réponses), écritures du sujet et des réponses, acceptation, fermeture. Textes rédigés en
   Markdown brut (rendu assaini par le site, SEC-01) ; prompts en texte exact, à copier tel quel. */

export interface EtiquetteApi {
  libelle: string;
  slug: string;
}

/** Sujet tel que la liste le présente (prototype : summaryHTML). */
export interface SujetResumeApi {
  id: number;
  /** Partie lisible de l'adresse (/forum/[id]-[slug]). */
  slug: string;
  type: TypeSujet;
  titre: string;
  /** Début du texte (contexte d'une clinique, à défaut son résultat obtenu), Markdown brut. */
  extrait: string;
  etat: EtatSujet;
  /** Ouvert, et aucun autre membre que l'auteur n'y a répondu (onglet « Sans réponse »). */
  enAttente: boolean;
  auteur: MembreResumeApi;
  date: string;
  /** Dernière réponse visible, à défaut la publication du sujet. */
  derniereActivite: { date: string; membre: MembreResumeApi };
  /** Réponses visibles. */
  reponses: number;
  /** Votes « Utile » (F-30). */
  utiles: number;
  /** Votes « Testé, ça marche » d'une astuce (RG-41). */
  testes: number;
  /** RG-63 : auteur de la réponse acceptée (« Solution de Claire »). */
  solution: { auteur: MembreResumeApi } | null;
  outil: OutilResumeApi | null;
  /** Modèle du référentiel ou saisi en texte libre. */
  modele: string | null;
  etiquettes: EtiquetteApi[];
}

export interface ListeSujetsApi {
  /** Dix sujets par page, comme le prototype. */
  elements: SujetResumeApi[];
  /** Sujets qui répondent aux filtres. */
  total: number;
  page: number;
  pages: number;
  /** Sujets en attente d'une réponse, tous filtres confondus (menu « Sans réponse »). */
  enAttente: number;
}

/** Réponse d'un sujet (MESSAGE). Une réponse masquée n'est présentée qu'à son auteur et à la
    modération (RG-30). */
export interface MessageApi {
  id: number;
  auteur: MembreResumeApi;
  date: string;
  dateModification: string | null;
  /** Texte de la réponse, Markdown brut. */
  corps: string;
  /** Prompt proposé ou corrigé, cité après le texte. */
  prompt: string | null;
  utiles: number;
  /** RG-63 : date de l'acceptation, si c'est la réponse acceptée. */
  acceptee: string | null;
  masquee: boolean;
  masquage: MasquageApi | null;
  moi: { auteur: boolean; utile: boolean; signalementOuvert: boolean } | null;
}

export interface SujetApi {
  id: number;
  slug: string;
  type: TypeSujet;
  titre: string;
  /** Markdown brut ; pour une clinique, le contexte (éventuellement vide), les rubriques à part. */
  corps: string;
  /** RG-62 : rubriques d'une clinique. */
  clinique: RubriquesClinique | null;
  /** RG-61 : exemples d'une astuce. */
  astuce: { avant: string; apres: string } | null;
  outil: OutilResumeApi | null;
  modele: ModeleResumeApi | null;
  modeleNonReference: string | null;
  etiquettes: EtiquetteApi[];
  etat: EtatSujet;
  /** RG-65 : qui a fermé le sujet et quand (null si le compte n'existe plus). */
  fermeture: { date: string; par: MembreResumeApi | null } | null;
  /** RG-66 : création publiée dont parle le sujet (null si elle n'est plus visible). */
  creation: {
    id: number;
    slug: string;
    titre: string;
    auteur: MembreResumeApi;
    couverture: MediaApi | null;
  } | null;
  auteur: MembreResumeApi;
  dateCreation: string;
  /** Date de dernière modification par l'auteur. */
  dateModification: string | null;
  derniereActivite: string;
  utiles: number;
  testes: number;
  /** RG-30 : masqué par la modération (présenté à son auteur et à la modération seulement). */
  masquee: boolean;
  masquage: MasquageApi | null;
  /** Du plus ancien au plus récent ; la réponse acceptée y figure avec sa date d'acceptation. */
  reponses: { total: number; elements: MessageApi[] };
  /** Ce qui concerne la personne connectée ; null pour un visiteur. */
  moi: {
    auteur: boolean;
    utile: boolean;
    /** « Testé, ça marche » (astuce). */
    teste: boolean;
    enregistre: boolean;
    signalementOuvert: boolean;
    /** RG-65, CI-22 */
    peutFermer: boolean;
    peutRouvrir: boolean;
  } | null;
}
