import type { CreationPalmaresApi } from './classements';
import type { MembreResumeApi } from './creations';

/** État d'un défi tel que la page le présente (RG-73) : à venir, en cours, terminé (période
    passée, en attente de clôture), clôturé (classement figé) ou annulé. */
export type EtatDefi = 'A_VENIR' | 'EN_COURS' | 'TERMINE' | 'CLOTURE' | 'ANNULE';

/** S-17 : règle du défi en case. */
export interface RegleDefiApi {
  chiffre: string;
  intitule: string;
  precision: string | null;
}

/** S-17 : principe jugé, avec son icône (nom du jeu d'icônes du site). */
export interface CritereDefiApi {
  icone: string;
  libelle: string;
}

export interface DefiApi {
  id: number;
  slug: string;
  titre: string;
  enonce: string;
  /** Contraintes, une par ligne (défis d'avant S-17, sans règles en cases). */
  regles: string[];
  /** S-17 : thème expliqué, règles en cases, principes jugés. */
  definition: string | null;
  cases: RegleDefiApi[];
  criteres: CritereDefiApi[];
  criteresCommuns: string[];
  /** S-17 : participations suspendues par l'administration (le défi continue, votes compris). */
  enPause: boolean;
  dateDebut: string;
  dateFin: string;
  etat: EtatDefi;
  participations: number;
}

/** S-17 : détail d'une participation de la page Défis (vue plein écran). */
export interface DetailParticipationApi {
  idee: string | null;
  modele: string | null;
  prompts: string[];
  essais: number;
  moment: string | null;
  /** Un jeu est jouable (GET /api/v1/participations/:id/jeu, dans un cadre isolé). */
  jeu: boolean;
  jeuNom: string | null;
  /** La participation est celle de la personne connectée (modifier, supprimer). */
  mienne: boolean;
  /** L'outil choisi, pour reprendre le formulaire. */
  outilId: number | null;
}

/** Participation (F-64) : une participation publiée depuis la page Défis (S-17), ou, pour les défis
    d'avant, une création d'Explorer inscrite au défi. `creation` porte ce que les cartes montrent
    (id du contenu, titre, outil, couverture) ; `detail` n'existe que pour une participation. */
export interface ParticipationDefiApi {
  nature: 'PARTICIPATION' | 'CREATION';
  detail: DetailParticipationApi | null;
  creation: CreationPalmaresApi;
  auteur: MembreResumeApi;
  datePublication: string;
  /** RG-75 : votes « Utile » reçus pendant la période du défi. */
  utiles: number;
  /** Rang figé à la clôture ; null avant. */
  rang: number | null;
  /** Vote « Utile » de la personne connectée. */
  monVote: boolean;
}

/** Défi clôturé, avec ses trois premières places. */
export interface DefiTermineApi {
  id: number;
  slug: string;
  titre: string;
  regles: string[];
  dateDebut: string;
  dateFin: string;
  participations: number;
  podium: {
    rang: number;
    creation: CreationPalmaresApi;
    auteur: MembreResumeApi;
    utiles: number;
  }[];
}

/** GET /api/v1/defis?defi= (F-63 à F-65). */
export interface DefisApi {
  /** Le défi demandé, à défaut le défi en cours, à venir, ou le dernier clôturé ; null s'il n'y en a aucun. */
  defi: DefiApi | null;
  /** Participations du défi : rang figé, sinon votes « Utile » de la période puis date (RG-75). */
  participations: ParticipationDefiApi[];
  /** Défis clôturés, du plus récent au plus ancien (six au plus). */
  termines: DefiTermineApi[];
  /** La personne connectée : sa participation et ses créations qu'elle peut inscrire (RG-74). */
  moi: {
    participation: { id: number; titre: string; nature: 'PARTICIPATION' | 'CREATION' } | null;
    eligibles: { id: number; titre: string }[];
  } | null;
}
