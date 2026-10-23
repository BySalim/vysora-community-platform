import type { CategorieBadge, CodeTypeVote, FamilleOutil, TonBadge, TypeOutil } from '../enums';

/* Contrat de GET /api/v1/referentiels : référentiels publics utiles à toutes les pages
   (catalogue d'outils, catégories, licences, niveaux, badges, types de vote). */

export interface ModeleProposeApi {
  id: number;
  nom: string;
  nomCourt: string;
}

export interface OutilApi {
  id: number;
  nom: string;
  slug: string;
  famille: FamilleOutil;
  type: TypeOutil;
  editeur: string;
  logo: string | null;
  logoMonochrome: boolean;
  alias: string[];
  estAgent: boolean;
  modeles: ModeleProposeApi[];
}

export interface CategorieApi {
  id: number;
  libelle: string;
  slug: string;
  icone: string | null;
}

export interface LicenceApi {
  id: number;
  code: string;
  libelle: string;
  resume: string | null;
  url: string;
  autoriseVariantes: boolean;
  estParDefaut: boolean;
}

export interface NiveauApi {
  rang: number;
  code: string;
  libelle: string;
  seuilPoints: number;
}

export interface BadgeApi {
  code: string;
  libelle: string;
  critere: string;
  categorie: CategorieBadge;
  icone: string;
  ton: TonBadge;
}

export interface TypeVoteApi {
  code: CodeTypeVote;
  libelle: string;
}

export interface ReferentielsApi {
  outils: OutilApi[];
  categories: CategorieApi[];
  licences: LicenceApi[];
  niveaux: NiveauApi[];
  badges: BadgeApi[];
  typesVote: TypeVoteApi[];
}
