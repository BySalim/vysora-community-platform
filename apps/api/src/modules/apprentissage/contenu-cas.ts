import {
  controlerOptionsFigees,
  repartirReponses,
  slugifier,
  type CorrectionCasApi,
  type SaisieCas,
} from '@vysora/shared';
import { asc, count, eq, inArray, sql } from 'drizzle-orm';
import { erreurValidation } from '../../commun/erreurs.js';
import type { Executeur, Transaction } from '../../db/client.js';
import { casBonReflexe, categorie, choixOption, optionReponse } from '../../db/schema/index.js';

/* Contenu d'un cas Bon réflexe (APP-01) : options et leurs réponses, correction (F-62), écriture des
   options (RG-70, CI-16, RG-72), document de recherche (RG-31). */

/** Option d'un cas, avec les réponses enregistrées pour elle. */
export interface OptionComptee {
  id: number;
  libelle: string;
  explication: string;
  correcte: boolean;
  reponses: number;
}

export interface DomaineDuCas {
  domaine: { libelle: string; slug: string } | null;
  dureeMinutes: number | null;
}

/** Domaine (catégorie) et durée estimée de plusieurs cas (« Code et scripts · 5 min »). */
export async function domainesDes(
  db: Executeur,
  ids: number[],
): Promise<Map<number, DomaineDuCas>> {
  if (!ids.length) return new Map();
  const lignes = await db
    .select({
      id: casBonReflexe.id,
      libelle: categorie.libelle,
      slug: categorie.slug,
      dureeMinutes: casBonReflexe.dureeMinutes,
    })
    .from(casBonReflexe)
    .leftJoin(categorie, eq(categorie.id, casBonReflexe.categorieId))
    .where(inArray(casBonReflexe.id, ids));
  return new Map(
    lignes.map((l) => [
      l.id,
      {
        domaine: l.libelle && l.slug ? { libelle: l.libelle, slug: l.slug } : null,
        dureeMinutes: l.dureeMinutes,
      },
    ]),
  );
}

/** Options de plusieurs cas, dans l'ordre d'affichage, avec leurs réponses. */
export async function optionsDes(
  db: Executeur,
  casIds: number[],
): Promise<Map<number, OptionComptee[]>> {
  const resultat = new Map<number, OptionComptee[]>(casIds.map((id) => [id, []]));
  if (!casIds.length) return resultat;
  const lignes = await db
    .select({
      casId: optionReponse.casId,
      id: optionReponse.id,
      libelle: optionReponse.libelle,
      explication: optionReponse.explication,
      correcte: optionReponse.estCorrecte,
      reponses: count(choixOption.optionId),
    })
    .from(optionReponse)
    .leftJoin(choixOption, eq(choixOption.optionId, optionReponse.id))
    .where(inArray(optionReponse.casId, casIds))
    .groupBy(optionReponse.id)
    .orderBy(asc(optionReponse.casId), asc(optionReponse.ordre));
  for (const { casId, ...option } of lignes) resultat.get(casId)?.push(option);
  return resultat;
}

/** F-62 : bonne option, explications et répartition des réponses de la communauté. La part des
    bonnes réponses est celle de la bonne option dans la répartition (les parts totalisent 100). */
export function corriger(explication: string, options: OptionComptee[]): CorrectionCasApi {
  const parts = repartirReponses(options.map((o) => o.reponses));
  const rang = options.findIndex((o) => o.correcte);
  const correcte = options[rang];
  if (!correcte) throw new Error('Cas sans bonne réponse');
  return {
    optionCorrecteId: correcte.id,
    explication,
    options: options.map((o, i) => ({
      id: o.id,
      explication: o.explication,
      correcte: o.correcte,
      reponses: o.reponses,
      part: parts[i] ?? 0,
    })),
    reponses: options.reduce((total, o) => total + o.reponses, 0),
    reussite: parts[rang] ?? 0,
  };
}

/** Colonnes du cas tirées de la saisie (statut et examen à part). */
export function colonnesCas(saisie: SaisieCas) {
  return {
    titre: saisie.titre,
    slug: slugifier(saisie.titre) || 'cas',
    contexte: saisie.contexte,
    demandeIa: saisie.demandeIa,
    reponseIa: saisie.reponseIa,
    question: saisie.question,
    explication: saisie.explication,
    difficulte: saisie.difficulte,
    categorieId: saisie.categorieId,
    dureeMinutes: saisie.dureeMinutes,
    outilId: saisie.outilId,
    modeleId: saisie.modeleId,
    modeleNonReference: saisie.modeleNonReference,
  };
}

/** RG-70, CI-16 : options du cas, gardées par identifiant (avec leurs réponses), les manquantes
    retirées, les nouvelles ajoutées. RG-72 : un cas qui a déjà reçu des réponses garde ses options,
    leur ordre et sa bonne réponse ; seuls leurs textes se corrigent. */
export async function ecrireOptions(
  tx: Transaction,
  casId: number,
  options: SaisieCas['options'],
): Promise<void> {
  const enregistrees = await tx
    .select({ id: optionReponse.id, correcte: optionReponse.estCorrecte })
    .from(optionReponse)
    .where(eq(optionReponse.casId, casId))
    .orderBy(asc(optionReponse.ordre));
  const connues = new Set(enregistrees.map((o) => o.id));
  const erreurs: Record<string, string> = {};
  options.forEach((option, rang) => {
    if (option.id !== null && !connues.has(option.id))
      erreurs[`options.${rang}.id`] = 'Cette option n’appartient pas à ce cas.';
  });
  if (Object.keys(erreurs).length) throw erreurValidation(erreurs);
  if (enregistrees.length && (await tx.$count(choixOption, eq(choixOption.casId, casId)))) {
    const message = controlerOptionsFigees(enregistrees, options);
    if (message) throw erreurValidation({ options: message });
  }

  const gardees = new Set(options.flatMap((o) => (o.id === null ? [] : [o.id])));
  const retirees = enregistrees.filter((o) => !gardees.has(o.id)).map((o) => o.id);
  if (retirees.length) await tx.delete(optionReponse).where(inArray(optionReponse.id, retirees));
  // L'unicité de l'ordre est différée, pas celle de la bonne réponse : on la retire d'abord.
  if (enregistrees.length)
    await tx
      .update(optionReponse)
      .set({ estCorrecte: false })
      .where(eq(optionReponse.casId, casId));
  for (const [rang, option] of options.entries()) {
    const valeurs = {
      ordre: rang + 1,
      libelle: option.libelle,
      explication: option.explication,
      estCorrecte: option.correcte,
    };
    if (option.id === null) await tx.insert(optionReponse).values({ casId, ...valeurs });
    else await tx.update(optionReponse).set(valeurs).where(eq(optionReponse.id, option.id));
  }
}

/** RG-31 : document de recherche d'un cas validé et visible de tous (titre, puis étiquettes, outil
    et modèle, puis situation, demande, réponse de l'IA, question et explication générale), en
    configuration « vysora_fr » ; retiré sinon. */
export async function indexerCas(tx: Transaction, id: number): Promise<void> {
  await tx.execute(sql`delete from recherche_document where contenu_id = ${id}`);
  await tx.execute(sql`
    insert into recherche_document (contenu_id, vecteur, date_mise_a_jour)
    select cb.id,
      setweight(to_tsvector('vysora_fr', cb.titre), 'A') ||
      setweight(to_tsvector('vysora_fr', concat_ws(' ',
        (select string_agg(et.libelle, ' ') from contenu_etiquette ce
          join etiquette et on et.id = ce.etiquette_id where ce.contenu_id = cb.id),
        (select o.nom from outil o where o.id = cb.outil_id),
        (select m.nom from modele m where m.id = cb.modele_id),
        cb.modele_non_reference)), 'B') ||
      setweight(to_tsvector('vysora_fr', concat_ws(' ', cb.contexte, cb.demande_ia, cb.reponse_ia,
        cb.question, cb.explication)), 'C'),
      now()
    from cas_bon_reflexe cb
    join contenu c on c.id = cb.id
    where cb.id = ${id} and cb.statut_validation = 'VALIDE' and c.statut = 'VISIBLE'`);
}
