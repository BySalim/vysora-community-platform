import {
  slugifier,
  type AvertissementAgent,
  type ContenuCreation,
  type CreationAControler,
} from '@vysora/shared';
import { and, asc, eq, inArray, isNotNull, notInArray, or, sql } from 'drizzle-orm';
import { erreurValidation } from '../../commun/erreurs.js';
import type { Executeur, Transaction } from '../../db/client.js';
import {
  categorie,
  configurationIa,
  contenu,
  contenuEtiquette,
  creation,
  echange,
  etape,
  etiquette,
  licence,
  lienExterne,
  media,
  modele,
  momentCle,
  outil,
} from '../../db/schema/index.js';

/* Écriture du contenu d'une création (CREA-05), dans la transaction de l'enregistrement.
   Le contenu reçu remplace l'ancien : les étapes et les échanges désignés par leur identifiant sont
   mis à jour (leurs commentaires ancrés et les images des échanges restent), les autres sont créés ;
   ce qui n'est plus dans la saisie est supprimé. Configurations, moments clés, liens et étiquettes
   sont réécrits. Une image retirée perd son rattachement : le nettoyage quotidien la supprime (MEDIA-01). */

/** Création telle qu'elle est en base avant l'enregistrement. */
export interface CreationExistante {
  id: number;
  auteurId: number;
  avertissementAgent: AvertissementAgent;
}

const uniques = <T>(valeurs: (T | null)[]): T[] => [
  ...new Set(valeurs.filter((v): v is T => v !== null)),
];

/** Licence choisie et proposée, ou licence par défaut (F-17) ; refus sinon. */
export async function licenceDe(tx: Transaction, licenceId: number | null): Promise<number> {
  const [ligne] = await tx
    .select({ id: licence.id })
    .from(licence)
    .where(
      and(
        eq(licence.estActive, true),
        licenceId === null ? eq(licence.estParDefaut, true) : eq(licence.id, licenceId),
      ),
    )
    .limit(1);
  if (!ligne) throw erreurValidation({ licenceId: 'Choisissez une licence de la liste.' });
  return ligne.id;
}

export async function ecrireContenu(
  tx: Transaction,
  existante: CreationExistante,
  saisie: ContenuCreation,
  maintenant: Date,
): Promise<void> {
  const id = existante.id;
  const avant = await lireStructure(tx, id);
  await verifierReferences(tx, existante, saisie, avant);
  const licenceId = await licenceDe(tx, saisie.licenceId);
  const etiquettes = await resoudreEtiquettes(tx, saisie.etiquettes);

  // Les images sont détachées, puis rattachées selon la saisie : une suppression d'échange
  // n'emporte pas une image que la saisie déplace ailleurs.
  await tx
    .update(media)
    .set({ contenuId: null, echangeId: null })
    .where(
      or(
        eq(media.contenuId, id),
        avant.echanges.length ? inArray(media.echangeId, avant.echanges) : undefined,
      ),
    );

  await tx
    .update(creation)
    .set({
      typeCreation: saisie.type,
      titre: saisie.titre,
      slug: saisie.titre ? slugifier(saisie.titre) || null : null,
      objectif: saisie.objectif,
      limites: saisie.limites,
      formatResultat: saisie.formatResultat,
      aAdapter: saisie.aAdapter,
      resultatTexte: saisie.resultat?.texte ?? null,
      resultatNature: saisie.resultat?.nature ?? null,
      resultatNom: saisie.resultat?.nom ?? null,
      categorieId: saisie.categorieId,
      licenceId,
      // RG-23 : l'avertissement posé par la modération ne se retire que par la modération.
      avertissementAgent:
        existante.avertissementAgent === 'MODERATION'
          ? 'MODERATION'
          : saisie.instructionsAgent
            ? 'AUTEUR'
            : 'AUCUN',
    })
    .where(eq(creation.id, id));
  // RG-18 : date de dernière modification.
  await tx.update(contenu).set({ dateModification: maintenant }).where(eq(contenu.id, id));

  // Étapes, dans l'ordre de la saisie (unicité de l'ordre différée à la fin de la transaction).
  const etapes: number[] = [];
  for (const [rang, e] of saisie.etapes.entries()) {
    const valeurs = { creationId: id, ordre: rang + 1, titre: e.titre, recit: e.recit };
    if (e.id !== undefined) {
      await tx.update(etape).set(valeurs).where(eq(etape.id, e.id));
      etapes.push(e.id);
    } else {
      const [ligne] = await tx.insert(etape).values(valeurs).returning({ id: etape.id });
      if (!ligne) throw new Error('Étape non enregistrée');
      etapes.push(ligne.id);
    }
  }
  if (avant.etapes.length) {
    await tx.delete(momentCle).where(inArray(momentCle.etapeId, avant.etapes));
    await tx.delete(configurationIa).where(inArray(configurationIa.etapeId, avant.etapes));
  }

  const echanges: number[][] = [];
  for (const [rang, e] of saisie.etapes.entries()) {
    const etapeId = etapes[rang] as number;
    const configurations: number[] = [];
    for (const [ordre, c] of e.configurations.entries()) {
      const [ligne] = await tx
        .insert(configurationIa)
        .values({ etapeId, ordre, ...c })
        .returning({ id: configurationIa.id });
      if (!ligne) throw new Error('Configuration non enregistrée');
      configurations.push(ligne.id);
    }
    const ids: number[] = [];
    for (const [ordre, x] of e.echanges.entries()) {
      const valeurs = {
        etapeId,
        ordre: ordre + 1,
        titre: x.titre,
        prompt: x.prompt,
        reponse: x.reponse,
        nbEssais: x.nbEssais,
        modeSelection: x.modeSelection,
        // Une étape à une seule configuration : chaque échange l'utilise (RG-14).
        configurationId:
          x.configuration !== null
            ? (configurations[x.configuration] ?? null)
            : configurations.length === 1
              ? (configurations[0] ?? null)
              : null,
      };
      if (x.id !== undefined) {
        await tx.update(echange).set(valeurs).where(eq(echange.id, x.id));
        ids.push(x.id);
      } else {
        const [ligne] = await tx.insert(echange).values(valeurs).returning({ id: echange.id });
        if (!ligne) throw new Error('Échange non enregistré');
        ids.push(ligne.id);
      }
    }
    echanges.push(ids);
    if (e.moments.length)
      await tx.insert(momentCle).values(
        e.moments.map((m) => ({
          etapeId,
          type: m.type,
          titre: m.titre,
          explication: m.explication,
          echangeId: m.echange === null ? null : (ids[m.echange] ?? null),
        })),
      );
  }

  // Ce que la saisie ne contient plus.
  const echangesGardes = echanges.flat();
  if (avant.echanges.length)
    await tx
      .delete(echange)
      .where(
        and(
          inArray(echange.id, avant.echanges),
          echangesGardes.length ? notInArray(echange.id, echangesGardes) : undefined,
        ),
      );
  await tx
    .delete(etape)
    .where(and(eq(etape.creationId, id), etapes.length ? notInArray(etape.id, etapes) : undefined));

  await tx.delete(lienExterne).where(eq(lienExterne.creationId, id));
  if (saisie.liens.length)
    await tx
      .insert(lienExterne)
      .values(saisie.liens.map((lien, ordre) => ({ creationId: id, ordre, ...lien })));

  await tx.delete(contenuEtiquette).where(eq(contenuEtiquette.contenuId, id));
  if (etiquettes.length)
    await tx
      .insert(contenuEtiquette)
      .values(etiquettes.map((etiquetteId) => ({ contenuId: id, etiquetteId })));

  // CI-02 : une image est rattachée à la création (ILLUSTRER) ou à un échange (JOINDRE).
  for (const [ordre, imageId] of saisie.images.entries())
    await tx
      .update(media)
      .set({ contenuId: id, echangeId: null, ordre })
      .where(eq(media.id, imageId));
  for (const [rang, e] of saisie.etapes.entries())
    for (const [x, ech] of e.echanges.entries())
      for (const [ordre, imageId] of ech.images.entries())
        await tx
          .update(media)
          .set({ contenuId: null, echangeId: echanges[rang]?.[x] ?? null, ordre })
          .where(eq(media.id, imageId));
}

interface Structure {
  etapes: number[];
  echanges: number[];
  outils: Set<number>;
  modeles: Set<number>;
  etiquettes: Set<number>;
}

/** Étapes, échanges, outils, modèles et étiquettes déjà enregistrés. */
async function lireStructure(tx: Transaction, id: number): Promise<Structure> {
  const etapes = await tx.select({ id: etape.id }).from(etape).where(eq(etape.creationId, id));
  const ids = etapes.map((e) => e.id);
  const [echanges, configurations, etiquettes] = ids.length
    ? [
        await tx.select({ id: echange.id }).from(echange).where(inArray(echange.etapeId, ids)),
        await tx
          .select({ outilId: configurationIa.outilId, modeleId: configurationIa.modeleId })
          .from(configurationIa)
          .where(inArray(configurationIa.etapeId, ids)),
        await etiquettesDe(tx, id),
      ]
    : [[], [], await etiquettesDe(tx, id)];
  return {
    etapes: ids,
    echanges: echanges.map((e) => e.id),
    outils: new Set(uniques(configurations.map((c) => c.outilId))),
    modeles: new Set(uniques(configurations.map((c) => c.modeleId))),
    etiquettes: new Set(etiquettes),
  };
}

async function etiquettesDe(tx: Transaction, id: number): Promise<number[]> {
  const lignes = await tx
    .select({ id: contenuEtiquette.etiquetteId })
    .from(contenuEtiquette)
    .where(eq(contenuEtiquette.contenuId, id));
  return lignes.map((l) => l.id);
}

/** Catégorie, outils, modèles, images, étapes et échanges désignés : existants et permis. */
async function verifierReferences(
  tx: Transaction,
  existante: CreationExistante,
  saisie: ContenuCreation,
  avant: Structure,
): Promise<void> {
  const erreurs: Record<string, string> = {};
  const ajouter = (cle: string, message: string) => {
    if (!(cle in erreurs)) erreurs[cle] = message;
  };

  if (saisie.categorieId !== null) {
    const [ligne] = await tx
      .select({ id: categorie.id })
      .from(categorie)
      .where(and(eq(categorie.id, saisie.categorieId), eq(categorie.estActive, true)));
    if (!ligne) ajouter('categorieId', 'Choisissez une catégorie de la liste.');
  }

  // RG-14 : outils et modèles du référentiel, encore proposés (sauf s'ils figuraient déjà dans la création).
  const configurations = saisie.etapes.flatMap((e, rang) =>
    e.configurations.map((c, ordre) => ({ ...c, cle: `etapes.${rang}.configurations.${ordre}` })),
  );
  const outilsDemandes = uniques(configurations.map((c) => c.outilId));
  const modelesDemandes = uniques(configurations.map((c) => c.modeleId));
  const outilsPermis = new Set(
    outilsDemandes.length
      ? (
          await tx
            .select({ id: outil.id, statut: outil.statut })
            .from(outil)
            .where(inArray(outil.id, outilsDemandes))
        )
          .filter((o) => o.statut === 'ACTIF' || avant.outils.has(o.id))
          .map((o) => o.id)
      : [],
  );
  const modelesPermis = new Set(
    modelesDemandes.length
      ? (
          await tx
            .select({ id: modele.id, statut: modele.statut })
            .from(modele)
            .where(inArray(modele.id, modelesDemandes))
        )
          .filter((m) => m.statut === 'DISPONIBLE' || avant.modeles.has(m.id))
          .map((m) => m.id)
      : [],
  );
  for (const c of configurations) {
    if (c.outilId !== null && !outilsPermis.has(c.outilId))
      ajouter(`${c.cle}.outilId`, 'Choisissez un outil de la liste.');
    if (c.modeleId !== null && !modelesPermis.has(c.modeleId))
      ajouter(`${c.cle}.modeleId`, 'Choisissez un modèle de la liste, ou saisissez son nom.');
  }

  // Images : téléversées par l'auteur, libres ou déjà rattachées à cette création.
  const demandees = [
    ...saisie.images.map((imageId, i) => ({ imageId, cle: `images.${i}` })),
    ...saisie.etapes.flatMap((e, rang) =>
      e.echanges.flatMap((x, n) =>
        x.images.map((imageId, i) => ({
          imageId,
          cle: `etapes.${rang}.echanges.${n}.images.${i}`,
        })),
      ),
    ),
  ];
  if (demandees.length) {
    const lignes = await tx
      .select({
        id: media.id,
        televerseurId: media.televerseurId,
        contenuId: media.contenuId,
        echangeId: media.echangeId,
      })
      .from(media)
      .where(
        inArray(
          media.id,
          demandees.map((d) => d.imageId),
        ),
      );
    const echangesDeLaCreation = new Set(avant.echanges);
    const permises = new Set(
      lignes
        .filter(
          (l) =>
            l.televerseurId === existante.auteurId &&
            (l.contenuId === existante.id ||
              (l.echangeId !== null && echangesDeLaCreation.has(l.echangeId)) ||
              (l.contenuId === null && l.echangeId === null)),
        )
        .map((l) => l.id),
    );
    for (const d of demandees)
      if (!permises.has(d.imageId)) ajouter(d.cle, 'Cette image est introuvable.');
  }

  // Étapes et échanges désignés : de cette création, une fois chacun.
  const etapesConnues = new Set(avant.etapes);
  const echangesConnus = new Set(avant.echanges);
  const vus = new Set<number>();
  saisie.etapes.forEach((e, rang) => {
    if (e.id !== undefined && (!etapesConnues.has(e.id) || vus.has(e.id)))
      ajouter(`etapes.${rang}.id`, 'Cette étape est introuvable.');
    if (e.id !== undefined) vus.add(e.id);
  });
  vus.clear();
  saisie.etapes.forEach((e, rang) =>
    e.echanges.forEach((x, n) => {
      if (x.id !== undefined && (!echangesConnus.has(x.id) || vus.has(x.id)))
        ajouter(`etapes.${rang}.echanges.${n}.id`, 'Ce prompt est introuvable.');
      if (x.id !== undefined) vus.add(x.id);
    }),
  );

  // CI-04 : une étiquette retirée du référentiel n'est plus proposée, sauf à qui l'avait déjà.
  if (saisie.etiquettes.length) {
    const archivees = await tx
      .select({ id: etiquette.id, libelle: etiquette.libelle, slug: etiquette.slug })
      .from(etiquette)
      .where(
        and(
          eq(etiquette.estActive, false),
          inArray(
            etiquette.slug,
            saisie.etiquettes.map((l) => slugifier(l, 60)),
          ),
        ),
      );
    saisie.etiquettes.forEach((libelle, i) => {
      const archivee = archivees.find((a) => a.slug === slugifier(libelle, 60));
      if (archivee && !avant.etiquettes.has(archivee.id))
        ajouter(`etiquettes.${i}`, `L’étiquette « ${libelle} » n’est plus proposée.`);
    });
  }

  if (Object.keys(erreurs).length) throw erreurValidation(erreurs);
}

/** Étiquettes du référentiel ; une étiquette absente est ajoutée (CI-04), repérée par son adresse. */
async function resoudreEtiquettes(tx: Transaction, libelles: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const libelle of libelles) {
    const slug = slugifier(libelle, 60);
    await tx.insert(etiquette).values({ libelle, slug }).onConflictDoNothing();
    const [ligne] = await tx
      .select({ id: etiquette.id })
      .from(etiquette)
      .where(or(eq(etiquette.slug, slug), sql`lower(${etiquette.libelle}) = lower(${libelle})`))
      .limit(1);
    if (!ligne) throw new Error(`Étiquette non enregistrée : ${libelle}`);
    if (!ids.includes(ligne.id)) ids.push(ligne.id);
  }
  return ids;
}

/** Ce qui est enregistré, sous la forme que contrôle la publication (controlerPublication). */
export async function lireAControler(db: Executeur, id: number): Promise<CreationAControler> {
  const lue = (await lireAControlerPlusieurs(db, [id])).get(id);
  if (!lue) throw new Error(`Création introuvable : ${id}`);
  return lue;
}

/** Même lecture pour plusieurs créations à la fois (« Mes contenus », CREA-04). */
export async function lireAControlerPlusieurs(
  db: Executeur,
  ids: number[],
): Promise<Map<number, CreationAControler>> {
  const resultat = new Map<number, CreationAControler>();
  if (!ids.length) return resultat;
  const lignes = await db
    .select({
      id: creation.id,
      type: creation.typeCreation,
      titre: creation.titre,
      objectif: creation.objectif,
      categorieId: creation.categorieId,
      resultatTexte: creation.resultatTexte,
    })
    .from(creation)
    .where(inArray(creation.id, ids));
  const etapes = await db
    .select({ id: etape.id, creationId: etape.creationId, titre: etape.titre, recit: etape.recit })
    .from(etape)
    .where(inArray(etape.creationId, ids))
    .orderBy(asc(etape.ordre));
  const idsEtapes = etapes.map((e) => e.id);
  const [configurations, echanges, moments] = idsEtapes.length
    ? [
        await db
          .select({
            id: configurationIa.id,
            etapeId: configurationIa.etapeId,
            outilId: configurationIa.outilId,
          })
          .from(configurationIa)
          .where(inArray(configurationIa.etapeId, idsEtapes))
          .orderBy(asc(configurationIa.ordre), asc(configurationIa.id)),
        await db
          .select({
            id: echange.id,
            etapeId: echange.etapeId,
            prompt: echange.prompt,
            reponse: echange.reponse,
            configurationId: echange.configurationId,
          })
          .from(echange)
          .where(inArray(echange.etapeId, idsEtapes))
          .orderBy(asc(echange.ordre)),
        await db
          .select({
            etapeId: momentCle.etapeId,
            explication: momentCle.explication,
            echangeId: momentCle.echangeId,
          })
          .from(momentCle)
          .where(inArray(momentCle.etapeId, idsEtapes))
          .orderBy(asc(momentCle.id)),
      ]
    : [[], [], []];
  const images = await db
    .select({
      contenuId: media.contenuId,
      echangeId: media.echangeId,
      texteAlternatif: media.texteAlternatif,
    })
    .from(media)
    .where(
      or(
        inArray(media.contenuId, ids),
        echanges.length
          ? and(
              isNotNull(media.echangeId),
              inArray(
                media.echangeId,
                echanges.map((x) => x.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(media.ordre), asc(media.id));
  const liens = await db
    .select({ creationId: lienExterne.creationId, type: lienExterne.type })
    .from(lienExterne)
    .where(inArray(lienExterne.creationId, ids));

  for (const ligne of lignes)
    resultat.set(ligne.id, {
      type: ligne.type,
      titre: ligne.titre,
      objectif: ligne.objectif,
      categorieId: ligne.categorieId,
      resultat: ligne.resultatTexte ? { texte: ligne.resultatTexte } : null,
      images: images
        .filter((i) => i.contenuId === ligne.id)
        .map(({ texteAlternatif }) => ({ texteAlternatif })),
      liens: liens.filter((l) => l.creationId === ligne.id).map(({ type }) => ({ type })),
      etapes: etapes
        .filter((e) => e.creationId === ligne.id)
        .map((e) => {
          const confs = configurations.filter((c) => c.etapeId === e.id);
          const sesEchanges = echanges.filter((x) => x.etapeId === e.id);
          return {
            titre: e.titre,
            recit: e.recit,
            configurations: confs.map(({ outilId }) => ({ outilId })),
            echanges: sesEchanges.map((x) => {
              const rang = confs.findIndex((c) => c.id === x.configurationId);
              return {
                prompt: x.prompt,
                reponse: x.reponse,
                configuration: rang < 0 ? null : rang,
                images: images
                  .filter((i) => i.echangeId === x.id)
                  .map(({ texteAlternatif }) => ({ texteAlternatif })),
              };
            }),
            moments: moments
              .filter((m) => m.etapeId === e.id)
              .map((m) => {
                const rang = sesEchanges.findIndex((x) => x.id === m.echangeId);
                return { explication: m.explication, echange: rang < 0 ? null : rang };
              }),
          };
        }),
    });
  return resultat;
}

/** RG-31 : document de recherche d'une création publiée (titre, puis objectif, étiquettes et
    outils, puis récits, titres et prompts), en configuration « vysora_fr ». */
export async function indexer(tx: Transaction, id: number): Promise<void> {
  await tx.execute(sql`
    insert into recherche_document (contenu_id, vecteur, date_mise_a_jour)
    select c.id,
      setweight(to_tsvector('vysora_fr', coalesce(c.titre, '')), 'A') ||
      setweight(to_tsvector('vysora_fr', left(concat_ws(' ', c.objectif,
        (select string_agg(et.libelle, ' ') from contenu_etiquette ce
          join etiquette et on et.id = ce.etiquette_id where ce.contenu_id = c.id),
        (select string_agg(o.nom, ' ') from configuration_ia ci join etape e on e.id = ci.etape_id
          join outil o on o.id = ci.outil_id where e.creation_id = c.id)), 20000)), 'B') ||
      setweight(to_tsvector('vysora_fr', left(concat_ws(' ', c.limites, c.format_resultat,
        (select string_agg(concat_ws(' ', e.titre, left(e.recit, 5000)), ' ') from etape e
          where e.creation_id = c.id),
        (select string_agg(concat_ws(' ', x.titre, left(x.prompt, 2000)), ' ') from echange x
          join etape e on e.id = x.etape_id where e.creation_id = c.id)), 200000)), 'C'),
      now()
    from creation c where c.id = ${id}
    on conflict (contenu_id) do update
      set vecteur = excluded.vecteur, date_mise_a_jour = excluded.date_mise_a_jour`);
}

/** Une création qui n'est plus publiée sort de la recherche. */
export async function retirerDeLaRecherche(tx: Transaction, id: number): Promise<void> {
  await tx.execute(sql`delete from recherche_document where contenu_id = ${id}`);
}
