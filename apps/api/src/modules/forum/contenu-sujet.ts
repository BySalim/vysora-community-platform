import {
  composerClinique,
  LONGUEURS,
  lireClinique,
  slugifier,
  type EtiquetteApi,
  type SaisieSujet,
  type TypeSujet,
} from '@vysora/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { erreurValidation } from '../../commun/erreurs.js';
import type { Executeur, Transaction } from '../../db/client.js';
import { contenuEtiquette, etiquette, modele, outil, sujet } from '../../db/schema/index.js';
import { resoudreEtiquettes } from '../creations/contenu-creation.js';
import { lireCible } from '../interactions/cibles.js';

/* Écriture du contenu d'un sujet (FORUM-01), dans la transaction de l'enregistrement : références
   contrôlées, corps composé (clinique, RG-62), étiquettes (CI-04), document de recherche (RG-31). */

/** Ce que le sujet désigne déjà : un outil, un modèle, une étiquette ou une création qui ne seraient
    plus proposés restent permis à qui les avait (comme pour une création). */
export interface ReferencesExistantes {
  outilId: number | null;
  modeleId: number | null;
  creationId: number | null;
  etiquettes: Set<number>;
}

export const AUCUNE_REFERENCE: ReferencesExistantes = {
  outilId: null,
  modeleId: null,
  creationId: null,
  etiquettes: new Set(),
};

/** Outil et modèle du référentiel, création publiée (RG-66), étiquettes encore proposées (CI-04).
    Renvoie l'outil et le modèle tels que la rubrique « Outil et modèle » d'une clinique les cite. */
export async function verifierReferences(
  tx: Transaction,
  saisie: SaisieSujet,
  avant: ReferencesExistantes,
): Promise<string> {
  const erreurs: Record<string, string> = {};
  let outilEtModele = '';
  if (saisie.outilId !== null) {
    const [choisi] = await tx
      .select({ id: outil.id, nom: outil.nom, statut: outil.statut })
      .from(outil)
      .where(eq(outil.id, saisie.outilId));
    if (!choisi || (choisi.statut !== 'ACTIF' && choisi.id !== avant.outilId))
      erreurs.outilId = 'Choisissez un outil de la liste.';
    else outilEtModele = choisi.nom;
  }
  if (saisie.modeleId !== null) {
    const [choisi] = await tx
      .select({ id: modele.id, nomCourt: modele.nomCourt, statut: modele.statut })
      .from(modele)
      .where(eq(modele.id, saisie.modeleId));
    if (!choisi || (choisi.statut !== 'DISPONIBLE' && choisi.id !== avant.modeleId))
      erreurs.modeleId = 'Choisissez un modèle de la liste, ou saisissez son nom.';
    else outilEtModele = `${outilEtModele} · ${choisi.nomCourt}`;
  } else if (saisie.modeleNonReference)
    outilEtModele = `${outilEtModele} · ${saisie.modeleNonReference}`;

  // RG-66 : une création publiée et visible ; celle que le sujet évoquait déjà peut rester.
  if (saisie.creationId !== null && saisie.creationId !== avant.creationId) {
    const cible = await lireCible(tx, saisie.creationId);
    if (!cible?.public || cible.type !== 'CREATION')
      erreurs.creationId = 'Choisissez une création publiée.';
  }

  // CI-04 : une étiquette retirée du référentiel n'est plus proposée, sauf à qui l'avait déjà.
  if (saisie.etiquettes.length) {
    const archivees = await tx
      .select({ id: etiquette.id, slug: etiquette.slug })
      .from(etiquette)
      .where(
        and(
          eq(etiquette.estActive, false),
          inArray(
            etiquette.slug,
            saisie.etiquettes.map((libelle) => slugifier(libelle, 60)),
          ),
        ),
      );
    saisie.etiquettes.forEach((libelle, i) => {
      const archivee = archivees.find((a) => a.slug === slugifier(libelle, 60));
      if (archivee && !avant.etiquettes.has(archivee.id))
        erreurs[`etiquettes.${i}`] = `L’étiquette « ${libelle} » n’est plus proposée.`;
    });
  }
  if (Object.keys(erreurs).length) throw erreurValidation(erreurs);
  return outilEtModele;
}

/** Corps enregistré : le texte saisi, ou pour une clinique le contexte suivi des rubriques (RG-62),
    dans la limite de RG-60. */
export function corpsDuSujet(saisie: SaisieSujet, outilEtModele: string): string {
  const corps = saisie.clinique
    ? composerClinique(saisie.corps, saisie.clinique, outilEtModele)
    : saisie.corps;
  if (corps.length > LONGUEURS.sujetCorps.max)
    throw erreurValidation({
      corps: `Votre sujet compte ${new Intl.NumberFormat('fr-FR').format(LONGUEURS.sujetCorps.max)} caractères au plus, rubriques comprises.`,
    });
  return corps;
}

/** Étiquettes réécrites (une à cinq, RG-60) ; une étiquette absente est ajoutée (CI-04). */
export async function ecrireEtiquettes(
  tx: Transaction,
  id: number,
  libelles: string[],
): Promise<void> {
  const ids = await resoudreEtiquettes(tx, libelles);
  await tx.delete(contenuEtiquette).where(eq(contenuEtiquette.contenuId, id));
  await tx
    .insert(contenuEtiquette)
    .values(ids.map((etiquetteId) => ({ contenuId: id, etiquetteId })));
}

/** Étiquettes de plusieurs contenus, par ordre alphabétique (comme la fiche création). */
export async function etiquettesDes(
  db: Executeur,
  ids: number[],
): Promise<Map<number, EtiquetteApi[]>> {
  const resultat = new Map<number, EtiquetteApi[]>(ids.map((id) => [id, []]));
  if (!ids.length) return resultat;
  const lignes = await db
    .select({
      contenuId: contenuEtiquette.contenuId,
      libelle: etiquette.libelle,
      slug: etiquette.slug,
    })
    .from(contenuEtiquette)
    .innerJoin(etiquette, eq(etiquette.id, contenuEtiquette.etiquetteId))
    .where(inArray(contenuEtiquette.contenuId, ids))
    .orderBy(asc(etiquette.libelle));
  for (const { contenuId, ...e } of lignes) resultat.get(contenuId)?.push(e);
  return resultat;
}

/** Texte du sujet tel qu'on le lit : pour une clinique, le contexte, les rubriques à part. */
export function lireCorps(type: TypeSujet, corps: string) {
  const rubriques = type === 'CLINIQUE' ? lireClinique(corps) : null;
  if (!rubriques) return { texte: corps, clinique: null };
  const { contexte, ...clinique } = rubriques;
  return { texte: contexte, clinique };
}

/** RG-63 : la réponse n'est plus la réponse acceptée de son sujet (retirée par son auteur ou par la
    modération, ou acceptation retirée). */
export async function oublierAcceptation(tx: Transaction, messageId: number): Promise<void> {
  await tx
    .update(sujet)
    .set({ messageAccepteId: null, dateAcceptationReponse: null })
    .where(eq(sujet.messageAccepteId, messageId));
}

/** RG-31 : document de recherche d'un sujet visible (titre, puis étiquettes, outil et modèle, puis
    texte et exemples), en configuration « vysora_fr ». Les réponses n'en font pas partie. */
export async function indexerSujet(tx: Transaction, id: number): Promise<void> {
  await tx.execute(sql`
    insert into recherche_document (contenu_id, vecteur, date_mise_a_jour)
    select s.id,
      setweight(to_tsvector('vysora_fr', s.titre), 'A') ||
      setweight(to_tsvector('vysora_fr', concat_ws(' ',
        (select string_agg(et.libelle, ' ') from contenu_etiquette ce
          join etiquette et on et.id = ce.etiquette_id where ce.contenu_id = s.id),
        (select o.nom from outil o where o.id = s.outil_id),
        (select m.nom from modele m where m.id = s.modele_id),
        s.modele_non_reference)), 'B') ||
      setweight(to_tsvector('vysora_fr', concat_ws(' ', s.corps, s.exemple_avant, s.exemple_apres)), 'C'),
      now()
    from sujet s where s.id = ${id}
    on conflict (contenu_id) do update
      set vecteur = excluded.vecteur, date_mise_a_jour = excluded.date_mise_a_jour`);
}
