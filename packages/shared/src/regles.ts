/* Règles de gestion chiffrées (docs/produit/03-fonctionnalites-mvp.md).
   Les valeurs paramétrables par l'administration (niveaux, barème) sont stockées en base ;
   celles-ci servent de valeurs initiales et de référence pour la validation. */

/** Bornes de longueur, en caractères. */
export const LONGUEURS = {
  pseudo: { min: 3, max: 30 }, // RG-01
  email: { max: 254 },
  motDePasse: { min: 12, max: 128 }, // RG-04 (la borne haute évite un hachage coûteux)
  biographie: { max: 500 }, // F-05
  url: { max: 2048 },
  creationTitre: { min: 10, max: 120 }, // RG-10
  creationObjectif: { min: 20, max: 1000 }, // RG-10
  creationLimites: { max: 2000 }, // RG-10
  etapeTitre: { min: 5, max: 100 }, // RG-13
  etapeRecit: { min: 50, max: 10_000 }, // RG-13
  configurationParametres: { max: 2000 },
  configurationContexteCache: { max: 10_000 },
  prompt: { max: 100_000 },
  reponseIa: { max: 200_000 },
  resultatTexte: { max: 200_000 }, // résultat textuel de la création (texte ou code)
  resultatNom: { max: 120 }, // nom du fichier de code
  momentCleExplication: { min: 20, max: 1000 }, // RG-15
  lienLibelle: { max: 100 },
  texteAlternatif: { max: 250 }, // ENF-01
  legende: { max: 300 },
  commentaire: { min: 1, max: 5000 }, // RG-50
  reproductionRetour: { min: 20, max: 5000 }, // RG-42
  sujetTitre: { min: 15, max: 150 }, // RG-60
  sujetCorps: { min: 30, max: 20_000 }, // RG-60
  astuceExemple: { min: 20, max: 5000 }, // RG-61
  reponseForum: { min: 20, max: 20_000 }, // RG-64
  casExplication: { min: 50, max: 5000 }, // RG-70
  etiquette: { max: 40 },
  motifDecision: { max: 2000 },
  precisionSignalement: { max: 1000 },
  contactNom: { max: 100 },
  contactMessage: { min: 20, max: 5000 },
} as const;

/** Quantités maximales. */
export const LIMITES = {
  imagesParCreation: 20, // RG-16, images de la création et de ses échanges
  imagesParContenu: 5, // RG-16, sujet, réponse, reproduction, cas
  tailleImageOctets: 5 * 1024 * 1024, // RG-16
  liensParCreation: 10, // RG-16
  etiquettesParContenu: 5, // RG-10, RG-60, RG-70
  optionsParCas: { min: 2, max: 5 }, // RG-70
} as const;

/** Seuils d'affichage et de déclenchement. */
export const SEUILS = {
  reproductionsPourTauxDeSucces: 3, // RG-43
  signalementsObsolescencePourBanniere: 3, // RG-44
  signalementsPourMasquageAutomatique: 3, // RG-101
  echangesAvantRepli: 10, // F-23
  taillesClassements: 50, // RG-87
  plafondQuotidienPointsDeVotes: 200, // RG-81
} as const;

/** RG-80 : barème de réputation (valeurs initiales, ajustables après la bêta). */
export const BAREME_REPUTATION = {
  voteUtileSurCreation: 10,
  voteUtileSurAutreContenu: 5,
  voteTesteSurAstuce: 5,
  reproductionReussieRecue: 5,
  reponseAcceptee: 15,
  acceptationReponse: 2,
  reproductionDeclaree: 2,
  casValide: 10,
  casReussi: 1,
  participationDefi: 5,
  podiumDefi: [50, 30, 20],
} as const;

/** Délais. */
export const DELAIS = {
  lienVerificationEmailHeures: 24, // F-01
  lienReinitialisationMinutes: 60, // F-03
  echecsConnexionAvantTemporisation: 5, // F-03
  temporisationConnexionSecondes: { initiale: 30, maximale: 15 * 60 }, // F-03, doublée à chaque nouvel échec
  retractationSuppressionJours: 30, // RG-05
  lienExportJours: 7, // F-07
  traitementDemandeDroitJours: 30, // RG-06
  suspensionJours: { min: 1, max: 90 }, // F-91
  defiJours: { min: 1, max: 30 }, // RG-73
  traitementSignalementHeures: 72, // RG-105
  sessionJours: 30,
} as const;

export const CODES_NIVEAU = ['curieux', 'apprenti', 'artisan', 'expert', 'maitre'] as const;
export type CodeNiveau = (typeof CODES_NIVEAU)[number];

export interface DefinitionNiveau {
  rang: number;
  code: CodeNiveau;
  libelle: string;
  seuilPoints: number;
  /** null : sans limite (RG-85). */
  creationsPar24h: number | null;
  sujetsPar24h: number | null;
  reponsesEtCommentairesPar24h: number | null;
  /** null : la limite générale de RG-16 s'applique. */
  liensParContenu: number | null;
  compteDansMasquageAutomatique: boolean;
  peutProposerUnCas: boolean;
}

/** RG-84 et RG-85 : niveaux et privilèges (valeurs initiales). */
// prettier-ignore
export const NIVEAUX: readonly DefinitionNiveau[] = [
  { rang: 1, code: 'curieux', libelle: 'Curieux', seuilPoints: 0, creationsPar24h: 3, sujetsPar24h: 3, reponsesEtCommentairesPar24h: 20, liensParContenu: 2, compteDansMasquageAutomatique: false, peutProposerUnCas: false },
  { rang: 2, code: 'apprenti', libelle: 'Apprenti', seuilPoints: 50, creationsPar24h: 10, sujetsPar24h: 10, reponsesEtCommentairesPar24h: 100, liensParContenu: null, compteDansMasquageAutomatique: true, peutProposerUnCas: false },
  { rang: 3, code: 'artisan', libelle: 'Artisan', seuilPoints: 300, creationsPar24h: 10, sujetsPar24h: 10, reponsesEtCommentairesPar24h: 100, liensParContenu: null, compteDansMasquageAutomatique: true, peutProposerUnCas: false },
  { rang: 4, code: 'expert', libelle: 'Expert', seuilPoints: 1500, creationsPar24h: null, sujetsPar24h: null, reponsesEtCommentairesPar24h: null, liensParContenu: null, compteDansMasquageAutomatique: true, peutProposerUnCas: true },
  { rang: 5, code: 'maitre', libelle: 'Maître', seuilPoints: 5000, creationsPar24h: null, sujetsPar24h: null, reponsesEtCommentairesPar24h: null, liensParContenu: null, compteDansMasquageAutomatique: true, peutProposerUnCas: true },
];

/** RG-83 et RG-84 : niveau atteint pour une réputation donnée (plancher à 0). */
export function niveauPourReputation(
  points: number,
  niveaux: readonly DefinitionNiveau[] = NIVEAUX,
): DefinitionNiveau {
  const reputation = Math.max(0, points);
  const tries = niveaux.toSorted((a, b) => a.seuilPoints - b.seuilPoints);
  let atteint = tries[0];
  for (const niveau of tries) if (niveau.seuilPoints <= reputation) atteint = niveau;
  if (!atteint) throw new Error('Aucun niveau défini');
  return atteint;
}
