import type {
  ConfigurationIaApi,
  CreationFicheApi,
  EchangeApi,
  MediaApi,
  OutilResumeApi,
  ResultatReproduction,
  TypeCreation,
  TypeLienExterne,
  TypeMomentCle,
} from '@vysora/shared';

/* Présentation d'une création sur sa fiche (CREA-03), reprise de prototype/fiche-brouillon.js et
   creation-page-data.js : ce que le prototype calculait dans le navigateur à partir du brouillon
   de l'éditeur, calculé ici à partir de la réponse de l'API. */

export const LIBELLES_TYPE: Record<TypeCreation, string> = {
  UN_PROMPT: '1 prompt',
  ITERATION: 'Itération',
  PROJET: 'Projet',
};

export const ICONES_TYPE: Record<TypeCreation, string> = {
  UN_PROMPT: 'type-prompt',
  ITERATION: 'type-iteration',
  PROJET: 'type-projet',
};

/** Nature du moment clé et titre générique (fiche-brouillon.js : MOMENTS, TITRES). */
export const MOMENTS: Record<TypeMomentCle, { nature: string; titre: string }> = {
  CORRECTION: { nature: 'Correction', titre: 'Corriger la demande' },
  REFUS: { nature: 'Refus', titre: 'Refuser une proposition de l’IA' },
  ECHEC: { nature: 'Échec', titre: 'Comprendre un échec' },
  CHANGEMENT_OUTIL: { nature: 'Changement d’outil', titre: 'Changer d’outil en cours de route' },
  VERIFICATION: { nature: 'Vérification', titre: 'Vérifier le résultat avant de continuer' },
  DECOUVERTE: { nature: 'Découverte', titre: 'Une découverte en cours de route' },
};

/** nouvelle-creation-data.js : types de liens. */
export const LIBELLES_LIEN: Record<TypeLienExterne, string> = {
  DEMO: 'Démo',
  DEPOT_CODE: 'Dépôt de code',
  VIDEO: 'Vidéo',
  PREUVE: 'Conversation partagée',
  ARTICLE: 'Article',
  AUTRE: 'Autre lien',
};

/** fiche-creation.js : issue d'un essai, avec son signe. */
export const ISSUES: Record<ResultatReproduction, string> = {
  SUCCES: '✓ Réussi',
  PARTIEL: '◐ Résultat partiel',
  ECHEC: '○ Non reproduit',
};

/** Outil et modèle d'une configuration ou d'un essai : « ChatGPT · GPT Image 1 ». */
export function nomModele(
  configuration: Pick<ConfigurationIaApi, 'modele' | 'modeleNonReference'>,
) {
  return configuration.modele?.nomCourt ?? configuration.modeleNonReference ?? null;
}

/** Outils utilisés, chacun une fois, dans l'ordre du parcours (fiche-brouillon.js : outils). */
export function outilsUtilises(
  fiche: Pick<CreationFicheApi, 'etapes'>,
): { outil: OutilResumeApi; modele: string | null }[] {
  const outils: { outil: OutilResumeApi; modele: string | null }[] = [];
  for (const etape of fiche.etapes)
    for (const configuration of etape.configurations)
      if (configuration.outil && !outils.some((o) => o.outil.id === configuration.outil?.id))
        outils.push({ outil: configuration.outil, modele: nomModele(configuration) });
  return outils;
}

/** Échanges présentés : un seul pour un « 1 prompt » (RG-11), tous sinon. */
export function echangesPresentes(fiche: Pick<CreationFicheApi, 'type' | 'etapes'>): EchangeApi[] {
  const etapes = fiche.type === 'PROJET' ? fiche.etapes : fiche.etapes.slice(0, 1);
  return etapes.flatMap((e) => (fiche.type === 'UN_PROMPT' ? e.echanges.slice(0, 1) : e.echanges));
}

/** Image de couverture : la première du résultat, à défaut la dernière jointe aux échanges. */
export function couverture(
  fiche: Pick<CreationFicheApi, 'type' | 'etapes' | 'images'>,
): MediaApi | null {
  if (fiche.images[0]) return fiche.images[0];
  const echanges = echangesPresentes(fiche);
  for (let i = echanges.length - 1; i >= 0; i -= 1) {
    const image = echanges[i]?.images.at(-1);
    if (image) return image;
  }
  return null;
}

/** Image plus haute que large : affichée entière plutôt que recadrée (creation-page-data.js : portrait). */
export const estPortrait = (image: Pick<MediaApi, 'largeur' | 'hauteur'>): boolean =>
  image.hauteur > image.largeur * 1.15;

/** Légende du résultat (fiche-brouillon.js : essai). */
export function formatResultat(fiche: Pick<CreationFicheApi, 'type' | 'etapes'>): string {
  const premier = echangesPresentes(fiche)[0];
  return fiche.type === 'UN_PROMPT' &&
    premier &&
    premier.nbEssais > 1 &&
    premier.modeSelection === 'MEILLEUR_ESSAI'
    ? `Résultat retenu parmi ${premier.nbEssais} essais`
    : 'Résultat obtenu';
}

/** Où se situe un moment clé dans le parcours (fiche-brouillon.js : ou). */
export function placeDuMoment(
  fiche: Pick<CreationFicheApi, 'type' | 'etapes'>,
  etapeOrdre: number,
  echangeId: number | null,
): string {
  const etape = fiche.etapes.find((e) => e.ordre === etapeOrdre);
  const rang =
    echangeId === null ? -1 : (etape?.echanges.findIndex((x) => x.id === echangeId) ?? -1);
  if (fiche.type === 'PROJET')
    return rang < 0 ? `Étape ${etapeOrdre}` : `Étape ${etapeOrdre}, échange ${rang + 1}`;
  if (fiche.type === 'UN_PROMPT') return 'Le prompt';
  return rang < 0 ? 'Le parcours' : `Échange ${rang + 1}`;
}

/** Contexte de travail (fiche-brouillon.js : context) : le contexte caché, sinon la façon de travailler. */
export function contexteDeTravail(fiche: Pick<CreationFicheApi, 'type' | 'etapes'>): string {
  const contexte = fiche.etapes
    .flatMap((e) => e.configurations)
    .find((c) => c.contexteCache?.trim())?.contexteCache;
  if (contexte) return extrait(contexte, 90);
  if (fiche.type === 'PROJET') return 'Plusieurs outils, une étape après l’autre';
  if (fiche.type === 'ITERATION') return 'Même conversation pour tous les échanges';
  return 'Une seule demande';
}

/** Longueur du parcours (creation-page-data.js : Parcours). */
export function longueurParcours(fiche: Pick<CreationFicheApi, 'type' | 'etapes'>): string {
  if (fiche.type === 'PROJET')
    return `${fiche.etapes.length} ${fiche.etapes.length > 1 ? 'étapes' : 'étape'}`;
  if (fiche.type === 'ITERATION') {
    const n = echangesPresentes(fiche).length;
    return `${n} ${n > 1 ? 'échanges' : 'échange'}`;
  }
  return '1 prompt';
}

/** Phrases d'un texte, pour une liste (creation-page-data.js : limites constatées). */
export const phrases = (texte: string): string[] =>
  texte
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

export function extrait(texte: string, longueur: number): string {
  const valeur = texte.replace(/\s+/g, ' ').trim();
  return valeur.length > longueur ? `${valeur.slice(0, longueur - 1).trimEnd()}…` : valeur;
}

/** Adresse d'une fiche : /creations/12-cite-imaginaire (l'identifiant fait foi, le texte se lit). */
export const adresseCreation = (fiche: Pick<CreationFicheApi, 'id' | 'slug'>): string =>
  fiche.slug ? `/creations/${fiche.id}-${fiche.slug}` : `/creations/${fiche.id}`;

/** Identifiant lu au début de la partie variable de l'adresse (« 12-cite-imaginaire » → 12). */
export function identifiantDeLAdresse(partie: string | undefined): number | null {
  const correspondance = /^([1-9]\d{0,15})(?:-[a-z0-9-]*)?$/.exec(partie ?? '');
  const id = correspondance ? Number(correspondance[1]) : Number.NaN;
  return Number.isSafeInteger(id) ? id : null;
}

/** Actions de la fiche déjà portées par l'API ; les autres restent masquées jusqu'à leur tâche
    (registre : MOD-01, CREA-05). */
export const ACTIONS_OUVERTES: Record<
  'voter' | 'enregistrer' | 'essayer' | 'commenter' | 'signaler' | 'gerer',
  boolean
> = {
  voter: true,
  enregistrer: true,
  essayer: true,
  commenter: true,
  signaler: false,
  gerer: false,
};

/** Configuration proposée dans « Partager mon essai » (outil et modèle). */
export interface ConfigurationEssai {
  outilId: number;
  modeleId: number | null;
  modeleNonReference: string | null;
  libelle: string;
}

/** Celles de la création, puis celles déjà essayées par d'autres membres, chacune une fois. */
export function configurationsEssayables(
  fiche: Pick<CreationFicheApi, 'etapes' | 'preuve'>,
): ConfigurationEssai[] {
  const resultat: ConfigurationEssai[] = [];
  const ajouter = (c: ConfigurationEssai) => {
    const cle = (x: ConfigurationEssai) =>
      `${x.outilId}|${x.modeleId ?? ''}|${x.modeleNonReference ?? ''}`;
    if (!resultat.some((x) => cle(x) === cle(c))) resultat.push(c);
  };
  for (const configuration of fiche.etapes.flatMap((e) => e.configurations))
    if (configuration.outil) {
      const modele = nomModele(configuration);
      ajouter({
        outilId: configuration.outil.id,
        modeleId: configuration.modele?.id ?? null,
        modeleNonReference: configuration.modele ? null : configuration.modeleNonReference,
        libelle: modele ? `${configuration.outil.nom} · ${modele}` : configuration.outil.nom,
      });
    }
  for (const essai of fiche.preuve.reproductions.parConfiguration)
    ajouter({
      outilId: essai.outil.id,
      modeleId: essai.modeleId,
      modeleNonReference: essai.modeleId ? null : essai.modele,
      libelle: essai.modele ? `${essai.outil.nom} · ${essai.modele}` : essai.outil.nom,
    });
  return resultat;
}

/** « 3 retours détaillés sur les 44 essais déclarés. » */
export const noteEchantillon = (retours: number, total: number): string =>
  `${retours} ${retours > 1 ? 'retours détaillés' : 'retour détaillé'} sur ${total > 1 ? `les ${total} essais déclarés` : '1 essai déclaré'}.`;

export const motReproductions = (total: number): string =>
  total > 1 ? 'reproductions' : 'reproduction';
