import type { CreationPalmaresApi } from './classements';
import type { MembreResumeApi } from './creations';

/** État d'un défi tel que la page le présente (RG-73) : à venir, en cours, terminé (période
    passée, en attente de clôture), clôturé (classement figé) ou annulé. */
export type EtatDefi = 'A_VENIR' | 'EN_COURS' | 'TERMINE' | 'CLOTURE' | 'ANNULE';

export interface DefiApi {
  id: number;
  slug: string;
  titre: string;
  enonce: string;
  /** Contraintes, une par ligne. */
  regles: string[];
  dateDebut: string;
  dateFin: string;
  etat: EtatDefi;
  participations: number;
}

/** Participation (F-64) : une création publiée pendant le défi. */
export interface ParticipationDefiApi {
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
    participation: { id: number; titre: string } | null;
    eligibles: { id: number; titre: string }[];
  } | null;
}
