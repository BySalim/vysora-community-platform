/* Types des contenus éditoriaux d'Apprendre (prototype/apprendre-data.js) et des données que la page
   reçoit du serveur (cas Bon réflexe de l'API, outils, guides, domaines). */

import type {
  CasApi,
  CasResumeApi,
  ComplementsSavoirsApi,
  ProgressionSavoirsApi,
} from '@vysora/shared';

export type IdRubrique = 'bases' | 'notions' | 'regles' | 'astuces' | 'bon-reflexe';

export interface Rubrique {
  id: IdRubrique;
  label: string;
  one: string;
  icon: string;
  title: string;
  lead: string;
}

export interface Savoir {
  id: string;
  kind: Exclude<IdRubrique, 'bon-reflexe'>;
  order?: number;
  minutes: number;
  updated: string;
  title: string;
  short: string;
  body?: { h?: string; p?: string[]; steps?: string[] }[];
  check?: { q: string; choices: string[]; correct: number; why: string };
  related?: string[];
  history: [string, string][];
  prompt?: { before: string; after: string; notes: [string, string][] };
  /** Le sujet du forum lié et les moments clés de la communauté sont choisis par l'équipe dans
      l'administration (APP-03, ComplementsSavoirsApi). */
  links?: { guide?: string; domain?: string; publish?: boolean };
  tools?: string[];
  theme?: string;
  /** Cas Bon réflexe du prototype qui teste la règle (« cas-3 »). */
  situation?: string;
  tool?: string;
  model?: string;
  verified?: string;
  replacedBy?: string;
}

export interface DonneesApprendre {
  updated: string;
  rubriques: Rubrique[];
  themes: { id: string; label: string }[];
  savoirs: Savoir[];
  /** Compléments des cas du prototype (« cas-1 » : outil, demande, règle à retenir). */
  cases: Record<string, { tool?: string[]; ask?: string; regle?: string }>;
  caseOfDay: string;
  journal: {
    date: string;
    kind: 'nouveau' | 'revu' | 'remplace';
    savoir: string;
    source: string;
    why: string;
  }[];
  sources: Record<string, string>;
}

/** Ce que le serveur pose dans la page (#ap-donnees). */
export interface DonneesPageApprendre {
  cas: CasResumeApi[];
  outils: {
    id: number;
    nom: string;
    slug: string;
    logo: string | null;
    logoMonochrome: boolean;
    famille: string;
  }[];
  guides: { slug: string; titre: string; titreCourt: string }[];
  domaines: { libelle: string; slug: string; icone: string | null }[];
  /** Cas demandé par l'adresse /bon-reflexe/[id]-[slug]. */
  casOuvert: number | null;
  /** Ce cas en entier, lu par le serveur : la page arrive rendue avec ses options (APP-03). */
  casComplet: CasApi | null;
  /** Aujourd'hui (AAAA-MM-JJ), date du serveur. */
  aujourdhui: string;
  /** Chiffres de « D'où viennent ces savoirs » : sujets du forum, outils suivis. */
  chiffres: { sujets: number; outils: number };
  /** APP-03 : progression du membre sur les savoirs, lue dans son compte ; null pour un visiteur. */
  progression: ProgressionSavoirsApi | null;
  /** APP-03 : moments clés et sujets du forum choisis par l'équipe pour chaque savoir. */
  complements: ComplementsSavoirsApi | null;
}
