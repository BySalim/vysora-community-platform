import type {
  DifficulteCas,
  MotifMouvementReputation,
  ResultatReproduction,
  Role,
  TypeCreation,
  TypeLienExterne,
  TypeMomentCle,
  TypeSujet,
} from '@vysora/shared';

/* Forme des données de démonstration (dossier donnees/). Les dates sont celles du prototype,
   en UTC (« AAAA-MM-JJ » ou « AAAA-MM-JJTHH:MM ») ; le chargement les décale (voir charger.ts).
   Les membres sont désignés par leur pseudo, les contenus par leur clé (identifiant du prototype).
   Les champs marqués « non chargé » n'ont pas encore de colonne : voir « Points à trancher » du registre. */

/** Image du prototype (prototype/assets/images/<fichier>-1280.webp, à défaut -720.webp). */
export interface ImageDemo {
  fichier: string;
  texteAlternatif: string;
  legende?: string;
}

export interface MembreDemo {
  pseudo: string;
  /** Non chargé : nom affiché par le prototype (« Claire Dubois »). */
  nom: string;
  /** Avatar du prototype (prototype/assets/avatars/<avatar>.webp). */
  avatar?: string;
  inscription: string;
  role?: Role;
  biographie?: string;
  urlSite?: string;
  /** Réputation du prototype : total et points des semaines, de la semaine en cours à la plus ancienne,
      avec leur détail par motif quand le prototype le donne (sinon : votes « Utile » reçus). */
  reputation?: {
    total: number;
    semaines: number[];
    detail?: { motif: MotifMouvementReputation; nombre: number; points: number }[][];
  };
  badges?: { code: string; date: string }[];
}

export interface ConfigurationDemo {
  outil: string;
  /** Nom court affiché après l'outil (« Sonnet 4.5 ») ou nom complet ; à défaut, texte libre (RG-14). */
  modele?: string;
  parametres?: string;
  contexte?: string;
}

export interface EchangeDemo {
  /** Non chargé : titre de l'échange dans la fiche du prototype. */
  titre?: string;
  prompt: string;
  reponse?: string;
  essais?: number;
  /** Rang de la configuration de l'étape utilisée (projet à plusieurs configurations). */
  configuration?: number;
  images?: ImageDemo[];
}

export interface MomentDemo {
  type: TypeMomentCle;
  explication: string;
  /** Non chargé : titre du moment clé dans la fiche du prototype. */
  titre?: string;
  /** Rang de l'échange marqué, dans l'étape. */
  echange?: number;
}

export interface EtapeDemo {
  titre?: string;
  recit?: string;
  configurations: ConfigurationDemo[];
  echanges: EchangeDemo[];
  moments: MomentDemo[];
}

export interface ReproductionsDemo {
  /** Essais déclarés par configuration (le premier est celui de la création). */
  configurations: { outil: string; modele?: string; essais: number; reussis: number }[];
  /** Date et configuration du dernier essai déclaré. */
  dernier?: { date: string; outil: string; modele?: string };
  /** Retours détaillés du prototype, attribués à leurs auteurs. */
  retours?: {
    auteur: string;
    resultat: ResultatReproduction;
    outil: string;
    modele?: string;
    retour: string;
  }[];
}

export interface CreationDemo {
  cle: string;
  auteur: string;
  type: TypeCreation;
  titre: string;
  objectif: string;
  limites?: string;
  categorie: string;
  licence: string;
  etiquettes: string[];
  /** Absente : brouillon. */
  publication?: string;
  /** Création du brouillon, si elle est connue. */
  creation?: string;
  modification?: string;
  defi?: string;
  etapes: EtapeDemo[];
  liens?: { type: TypeLienExterne; url: string; libelle?: string }[];
  images?: ImageDemo[];
  /** Votes « Utile » affichés par le prototype : au total et sur les 7 derniers jours. */
  utiles: number;
  utilesSemaine?: number;
  vues?: number;
  reproductions?: ReproductionsDemo;
  /** Signalements d'obsolescence (RG-44) : nom complet du modèle, nombre de membres, date du premier. */
  obsolescence?: { modele: string; membres: number; depuis: string };
  commentaires?: { auteur: string; date: string; corps: string }[];
}

export interface MessageDemo {
  cle: string;
  auteur: string;
  date: string;
  corps: string;
  utiles: number;
}

export interface SujetDemo {
  cle: string;
  auteur: string;
  type: TypeSujet;
  titre: string;
  corps: string;
  exempleAvant?: string;
  exempleApres?: string;
  /** Non chargé : résultats obtenus avant et après l'astuce. */
  resultatAvant?: string;
  resultatApres?: string;
  /** Non chargé (sauf dans le corps d'une clinique) : outil et modèle affichés sur le sujet. */
  outil?: string;
  modele?: string;
  etiquettes: string[];
  date: string;
  creation?: string;
  utiles: number;
  /** Votes « Testé, ça marche » (astuces, RG-41). */
  testes?: number;
  messages: MessageDemo[];
  reponseAcceptee?: { message: string; date: string };
  fermeture?: { par: string; date: string };
}

export interface CasDemo {
  cle: string;
  auteur: string;
  titre: string;
  contexte: string;
  demandeIa: string;
  reponseIa: string;
  question: string;
  explication: string;
  difficulte: DifficulteCas;
  /** Non chargé : outil et modèle de la réponse étudiée. */
  outil?: string;
  modele?: string;
  options: { libelle: string; correcte: boolean; explication: string }[];
  etiquettes: string[];
  date: string;
  utiles: number;
  /** Réponses affichées par le prototype et leur répartition par option, en pourcentage. */
  reponses: number;
  repartition: number[];
}

export interface DefiDemo {
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string;
  debut: string;
  fin: string;
  statut: 'PUBLIE' | 'CLOTURE';
}

export interface EnregistrementDemo {
  membre: string;
  contenu: { creation: string } | { sujet: string } | { cas: string };
  date: string;
}
