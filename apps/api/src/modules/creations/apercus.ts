import type { MediaApi, OutilEtModelesApi, ResultatApercuApi, TypeCreation } from '@vysora/shared';
import { and, asc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { Executeur } from '../../db/client.js';
import {
  configurationIa,
  creation,
  echange,
  etape,
  media,
  modele,
  outil,
} from '../../db/schema/index.js';
import { presenterMedia } from '../medias/medias.service.js';
import type { Stockage } from '../medias/stockage.js';

/** Ce qu'une liste montre d'une création sans ouvrir sa fiche (« Mes contenus », CREA-04). */
export interface ApercuCreation {
  /** Outils du parcours, chacun une fois, avec les modèles employés (prototype : outilsDe). */
  outils: OutilEtModelesApi[];
  /** Première image du résultat, à défaut la dernière jointe aux échanges présentés (comme la fiche). */
  couverture: MediaApi | null;
  /** Début du texte ou du code obtenu (résultat sans image). */
  resultat: ResultatApercuApi | null;
  /** Début du premier prompt écrit, à défaut du premier récit d'étape. */
  apercu: string | null;
  /** Faux tant que le parcours est vide : ni prompt écrit, ni étape de projet racontée. */
  typeDefini: boolean;
}

const LONGUEUR_APERCU = 240;
const LONGUEUR_RESULTAT = 600;
const rempli = (texte: string | null): texte is string => Boolean(texte?.trim());
const extrait = (texte: string) => {
  const valeur = texte.replace(/\s+/g, ' ').trim();
  return valeur.length > LONGUEUR_APERCU
    ? `${valeur.slice(0, LONGUEUR_APERCU - 1).trimEnd()}…`
    : valeur;
};

/** Aperçus de plusieurs créations en quelques requêtes. */
export async function apercusDesCreations(
  db: Executeur,
  stockage: Stockage,
  creations: { id: number; type: TypeCreation }[],
): Promise<Map<number, ApercuCreation>> {
  const resultat = new Map<number, ApercuCreation>();
  const ids = creations.map((c) => c.id);
  if (!ids.length) return resultat;
  const resultats = await db
    .select({
      id: creation.id,
      nature: creation.resultatNature,
      nom: creation.resultatNom,
      extrait: sql<string | null>`left(${creation.resultatTexte}, ${LONGUEUR_RESULTAT})`,
    })
    .from(creation)
    .where(inArray(creation.id, ids));
  const etapes = await db
    .select({ id: etape.id, creationId: etape.creationId, titre: etape.titre, recit: etape.recit })
    .from(etape)
    .where(inArray(etape.creationId, ids))
    .orderBy(asc(etape.ordre));
  const idsEtapes = etapes.map((e) => e.id);
  const [configurations, echanges] = idsEtapes.length
    ? await Promise.all([
        db
          .select({
            etapeId: configurationIa.etapeId,
            outil: {
              id: outil.id,
              nom: outil.nom,
              slug: outil.slug,
              logo: outil.logo,
              logoMonochrome: outil.logoMonochrome,
            },
            modele: modele.nomCourt,
            modeleNonReference: configurationIa.modeleNonReference,
          })
          .from(configurationIa)
          .innerJoin(outil, eq(outil.id, configurationIa.outilId))
          .leftJoin(modele, eq(modele.id, configurationIa.modeleId))
          .where(inArray(configurationIa.etapeId, idsEtapes))
          .orderBy(asc(configurationIa.ordre), asc(configurationIa.id)),
        db
          .select({ id: echange.id, etapeId: echange.etapeId, prompt: echange.prompt })
          .from(echange)
          .where(inArray(echange.etapeId, idsEtapes))
          .orderBy(asc(echange.ordre)),
      ])
    : [[], []];
  const images = await db
    .select()
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

  for (const { id, type } of creations) {
    const sesEtapes = etapes.filter((e) => e.creationId === id);
    const echangesDe = (etapeId: number) => echanges.filter((x) => x.etapeId === etapeId);
    const tous = sesEtapes.flatMap((e) => echangesDe(e.id));
    // Échanges présentés par la fiche : un seul pour un « 1 prompt » (RG-11), la première étape
    // pour une itération, tout le parcours pour un projet.
    const premiere = sesEtapes[0] ? echangesDe(sesEtapes[0].id) : [];
    const presentes =
      type === 'PROJET' ? tous : type === 'ITERATION' ? premiere : premiere.slice(0, 1);
    let couverture = images.find((i) => i.contenuId === id) ?? null;
    for (let i = presentes.length - 1; !couverture && i >= 0; i -= 1)
      couverture = images.findLast((image) => image.echangeId === presentes[i]?.id) ?? null;

    const outils: OutilEtModelesApi[] = [];
    for (const e of sesEtapes)
      for (const c of configurations.filter((x) => x.etapeId === e.id)) {
        const nom = c.modele ?? c.modeleNonReference;
        const deja = outils.find((o) => o.outil.id === c.outil.id);
        if (!deja) outils.push({ outil: c.outil, modeles: nom ? [nom] : [] });
        else if (nom && !deja.modeles.includes(nom)) deja.modeles.push(nom);
      }

    const obtenu = resultats.find((r) => r.id === id);
    const prompt = tous.find((x) => rempli(x.prompt))?.prompt ?? null;
    const recit = sesEtapes.find((e) => rempli(e.recit))?.recit ?? null;
    resultat.set(id, {
      outils,
      couverture: couverture && presenterMedia(stockage, couverture),
      resultat:
        obtenu?.nature && obtenu.extrait
          ? { nature: obtenu.nature, extrait: obtenu.extrait, nom: obtenu.nom }
          : null,
      apercu: prompt ? extrait(prompt) : recit ? extrait(recit) : null,
      typeDefini:
        prompt !== null ||
        (type === 'PROJET' && sesEtapes.some((e) => rempli(e.titre) || rempli(e.recit))),
    });
  }
  return resultat;
}
