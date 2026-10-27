import {
  DELAIS,
  SEUILS,
  etatSujet,
  type DemandeGuideApi,
  type EtatSujet,
  type ListeControleApi,
  type PropositionPiegeApi,
  type TypeMomentCle,
  type TypeSujet,
} from '@vysora/shared';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Executeur } from '../../db/client.js';
import {
  casBonReflexe,
  categorie,
  configurationIa,
  contenu,
  creation,
  demandeGuide,
  echange,
  etape,
  guide,
  guideContenu,
  guideEtape,
  guideEtapeSource,
  guidePiege,
  guidePiegeSource,
  listeControle,
  modele,
  momentCle,
  outil,
  propositionPiege,
  reproduction,
  signalementObsolescence,
  vote,
} from '../../db/schema/index.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { etiquettesDes } from '../forum/contenu-sujet.js';
import type { Stockage } from '../medias/stockage.js';
import type { GuideLu, OutilModeleLu, ParcoursLu } from './chiffres-guides.js';

/* Lecture en base des guides d'Explorer (DEC-01) et de leurs parcours. Seuls les contenus publiés et
   visibles de tous sont lus (RG-30) : une création publiée et visible, un sujet visible, un cas
   validé et visible. */

const JOUR = 24 * 60 * 60 * 1000;

const colonnesOutil = {
  id: outil.id,
  nom: outil.nom,
  slug: outil.slug,
  logo: outil.logo,
  logoMonochrome: outil.logoMonochrome,
};
const colonnesModele = {
  modeleId: modele.id,
  modeleNom: modele.nom,
  modeleCourt: modele.nomCourt,
};

const domaineColonnes = {
  id: categorie.id,
  libelle: categorie.libelle,
  slug: categorie.slug,
  icone: categorie.icone,
  description: categorie.description,
};

/** Domaines actifs, dans l'ordre du référentiel. */
export function lireDomaines(db: Executeur) {
  return db
    .select(domaineColonnes)
    .from(categorie)
    .where(eq(categorie.estActive, true))
    .orderBy(asc(categorie.ordreAffichage), asc(categorie.id));
}

/** Guides publiés, avec leurs contenus visibles, leur méthode et leurs pièges. */
export async function lireGuides(db: Executeur): Promise<GuideLu[]> {
  const guides = await db
    .select({
      id: guide.id,
      slug: guide.slug,
      titre: guide.titre,
      titreCourt: guide.titreCourt,
      motsCles: guide.motsCles,
      lacunes: guide.lacunes,
      domaine: domaineColonnes,
    })
    .from(guide)
    .innerJoin(categorie, eq(categorie.id, guide.categorieId))
    .where(isNotNull(guide.datePublication))
    .orderBy(asc(guide.id));
  const ids = guides.map((g) => g.id);
  if (!ids.length) return [];

  const [contenus, etapes, pieges] = await Promise.all([
    db
      .select({ guideId: guideContenu.guideId, id: contenu.id, type: contenu.typeContenu })
      .from(guideContenu)
      .innerJoin(contenu, eq(contenu.id, guideContenu.contenuId))
      .leftJoin(creation, eq(creation.id, contenu.id))
      .leftJoin(casBonReflexe, eq(casBonReflexe.id, contenu.id))
      .where(
        and(
          inArray(guideContenu.guideId, ids),
          eq(contenu.statut, 'VISIBLE'),
          sql`(${contenu.typeContenu} = 'SUJET'
            or (${contenu.typeContenu} = 'CREATION' and ${creation.statutPublication} = 'PUBLIEE')
            or (${contenu.typeContenu} = 'CAS_BON_REFLEXE' and ${casBonReflexe.statutValidation} = 'VALIDE'))`,
        ),
      )
      .orderBy(asc(guideContenu.ordre), asc(guideContenu.contenuId)),
    db
      .select()
      .from(guideEtape)
      .where(inArray(guideEtape.guideId, ids))
      .orderBy(asc(guideEtape.ordre)),
    db
      .select()
      .from(guidePiege)
      .where(inArray(guidePiege.guideId, ids))
      .orderBy(asc(guidePiege.ordre)),
  ]);
  const [sourcesEtapes, sourcesPieges] = await Promise.all([
    etapes.length
      ? db
          .select()
          .from(guideEtapeSource)
          .where(
            inArray(
              guideEtapeSource.etapeId,
              etapes.map((e) => e.id),
            ),
          )
      : [],
    pieges.length
      ? db
          .select()
          .from(guidePiegeSource)
          .where(
            inArray(
              guidePiegeSource.piegeId,
              pieges.map((p) => p.id),
            ),
          )
      : [],
  ]);

  return guides.map((g) => {
    const siens = contenus.filter((c) => c.guideId === g.id);
    const de = (type: string) => siens.filter((c) => c.type === type).map((c) => c.id);
    return {
      ...g,
      parcours: de('CREATION'),
      sujets: de('SUJET'),
      cas: de('CAS_BON_REFLEXE'),
      etapes: etapes
        .filter((e) => e.guideId === g.id)
        .map((e) => ({
          id: e.id,
          titre: e.titre,
          conseil: e.conseil,
          sources: sourcesEtapes.filter((s) => s.etapeId === e.id).map((s) => s.creationId),
          citation:
            e.citationCreationId !== null && e.citationTexte !== null
              ? { creationId: e.citationCreationId, texte: e.citationTexte }
              : null,
        })),
      pieges: pieges
        .filter((p) => p.guideId === g.id)
        .map((p) => ({
          id: p.id,
          ordre: p.ordre,
          titre: p.titre,
          solution: p.solution,
          etapeId: p.etapeId,
          sujetId: p.sujetId,
          casId: p.casId,
          sources: sourcesPieges.filter((s) => s.piegeId === p.id).map((s) => s.creationId),
        })),
    };
  });
}

/** Parcours (créations publiées et visibles) et ce qui sert à leurs chiffres. */
export async function lireParcours(
  db: Executeur,
  stockage: Stockage,
  ids: number[],
  maintenant: Date,
): Promise<Map<number, ParcoursLu>> {
  const resultat = new Map<number, ParcoursLu>();
  if (!ids.length) return resultat;
  const semaine = new Date(maintenant.getTime() - DELAIS.populariteJours * JOUR);
  const [creations, votes, configurations, reproductions, obsolescences, etiquettes] =
    await Promise.all([
      db
        .select({
          id: creation.id,
          slug: creation.slug,
          type: creation.typeCreation,
          titre: creation.titre,
          objectif: creation.objectif,
          datePublication: creation.datePublication,
          auteurId: contenu.auteurId,
          categorie: { libelle: categorie.libelle, slug: categorie.slug },
        })
        .from(creation)
        .innerJoin(contenu, eq(contenu.id, creation.id))
        .leftJoin(categorie, eq(categorie.id, creation.categorieId))
        .where(inArray(creation.id, ids)),
      db
        .select({
          id: vote.contenuId,
          total: sql<number>`count(*)::int`,
          semaine: sql<number>`(count(*) filter (where ${vote.dateVote} >= ${semaine}))::int`,
        })
        .from(vote)
        .where(and(inArray(vote.contenuId, ids), eq(vote.typeVoteCode, 'UTILE')))
        .groupBy(vote.contenuId),
      db
        .select({
          creationId: etape.creationId,
          outil: colonnesOutil,
          ...colonnesModele,
          modeleTexte: configurationIa.modeleNonReference,
        })
        .from(configurationIa)
        .innerJoin(etape, eq(etape.id, configurationIa.etapeId))
        .innerJoin(outil, eq(outil.id, configurationIa.outilId))
        .leftJoin(modele, eq(modele.id, configurationIa.modeleId))
        .where(inArray(etape.creationId, ids))
        .orderBy(asc(etape.ordre), asc(configurationIa.ordre), asc(configurationIa.id)),
      db
        .select({
          creationId: reproduction.creationId,
          date: contenu.dateCreation,
          resultat: reproduction.resultat,
          outil: colonnesOutil,
          ...colonnesModele,
          modeleTexte: reproduction.modeleNonReference,
        })
        .from(reproduction)
        .innerJoin(contenu, eq(contenu.id, reproduction.id))
        .innerJoin(outil, eq(outil.id, reproduction.outilId))
        .leftJoin(modele, eq(modele.id, reproduction.modeleId))
        .where(and(inArray(reproduction.creationId, ids), eq(contenu.statut, 'VISIBLE')))
        .orderBy(desc(contenu.dateCreation), desc(reproduction.id)),
      // RG-44 : membres distincts qui signalent la création obsolète avec un modèle (F-35).
      db
        .select({
          id: signalementObsolescence.contenuId,
          modele: modele.nom,
          membres: sql<number>`count(*)::int`,
        })
        .from(signalementObsolescence)
        .innerJoin(modele, eq(modele.id, signalementObsolescence.modeleId))
        .where(inArray(signalementObsolescence.contenuId, ids))
        .groupBy(signalementObsolescence.contenuId, modele.id)
        .having(sql`count(*) >= ${SEUILS.signalementsObsolescencePourBanniere}`)
        .orderBy(desc(sql`count(*)`), asc(modele.nom)),
      etiquettesDes(db, ids),
    ]);
  const apercus = await apercusDesCreations(
    db,
    stockage,
    creations.map((c) => ({ id: c.id, type: c.type })),
  );

  const outilModele = (ligne: OutilModeleLu): OutilModeleLu => ({
    outil: ligne.outil,
    modeleId: ligne.modeleId,
    modeleNom: ligne.modeleNom,
    modeleCourt: ligne.modeleCourt,
    modeleTexte: ligne.modeleTexte,
  });
  for (const c of creations) {
    // Une création publiée a un titre, un objectif et une date de publication (contrainte de la table).
    if (!c.titre || !c.objectif || !c.datePublication) continue;
    const v = votes.find((x) => x.id === c.id);
    const obsolete = obsolescences.find((o) => o.id === c.id);
    const apercu = apercus.get(c.id);
    resultat.set(c.id, {
      id: c.id,
      slug: c.slug,
      type: c.type,
      titre: c.titre,
      objectif: c.objectif,
      categorie: c.categorie,
      auteurId: c.auteurId,
      datePublication: c.datePublication,
      utiles: v?.total ?? 0,
      utilesSemaine: v?.semaine ?? 0,
      configurations: configurations.filter((x) => x.creationId === c.id).map(outilModele),
      reproductions: reproductions
        .filter((r) => r.creationId === c.id)
        .map((r) => ({ ...outilModele(r), date: r.date, resultat: r.resultat })),
      obsolescence: obsolete ? { modele: obsolete.modele, membres: obsolete.membres } : null,
      etiquettes: (etiquettes.get(c.id) ?? []).map((e) => e.libelle),
      couverture: apercu?.couverture ?? null,
      prompt: apercu?.apercu ?? null,
    });
  }
  return resultat;
}

/** Ce que la comparaison et la liste des parcours montrent en plus : étapes d'un projet, échanges
    d'une itération, essais d'un « 1 prompt », moments clés. */
export interface DeroulementLu {
  etapes: string[];
  echanges: number;
  essais: number;
  moments: { type: TypeMomentCle; texte: string }[];
}

export async function lireDeroulements(
  db: Executeur,
  ids: number[],
): Promise<Map<number, DeroulementLu>> {
  const resultat = new Map<number, DeroulementLu>(
    ids.map((id) => [id, { etapes: [], echanges: 0, essais: 1, moments: [] }]),
  );
  if (!ids.length) return resultat;
  const [etapes, echanges, moments] = await Promise.all([
    db
      .select({ creationId: etape.creationId, titre: etape.titre })
      .from(etape)
      .where(inArray(etape.creationId, ids))
      .orderBy(asc(etape.ordre)),
    db
      .select({ creationId: etape.creationId, nbEssais: echange.nbEssais })
      .from(echange)
      .innerJoin(etape, eq(etape.id, echange.etapeId))
      .where(inArray(etape.creationId, ids))
      .orderBy(asc(etape.ordre), asc(echange.ordre)),
    db
      .select({
        creationId: etape.creationId,
        type: momentCle.type,
        titre: momentCle.titre,
        explication: momentCle.explication,
      })
      .from(momentCle)
      .innerJoin(etape, eq(etape.id, momentCle.etapeId))
      .where(inArray(etape.creationId, ids))
      .orderBy(asc(etape.ordre), asc(momentCle.id)),
  ]);
  for (const [id, d] of resultat) {
    d.etapes = etapes.flatMap((e) => (e.creationId === id && e.titre ? [e.titre] : []));
    const siens = echanges.filter((x) => x.creationId === id);
    d.echanges = siens.length;
    d.essais = siens[0]?.nbEssais ?? 1;
    d.moments = moments.flatMap((m) =>
      m.creationId === id && (m.explication || m.titre)
        ? [{ type: m.type, texte: (m.explication ?? m.titre) as string }]
        : [],
    );
  }
  return resultat;
}

export interface SujetLu {
  id: number;
  slug: string;
  type: TypeSujet;
  titre: string;
  etat: EtatSujet;
  reponses: number;
  auteurId: number;
}

/** Sujets visibles (questions de la communauté, discussions d'un piège), dans l'ordre demandé. */
export async function lireSujets(db: Executeur, ids: number[]): Promise<SujetLu[]> {
  if (!ids.length) return [];
  const lignes = await db.execute<{
    id: string;
    slug: string;
    type_sujet: TypeSujet;
    titre: string;
    ferme: boolean;
    accepte: boolean;
    reponses: number;
    auteur_id: string;
  }>(sql`
    select s.id, s.slug, s.type_sujet, s.titre, s.date_fermeture is not null as ferme,
      exists (select 1 from contenu am where am.id = s.message_accepte_id and am.statut = 'VISIBLE')
        as accepte,
      (select count(*) from message m join contenu mc on mc.id = m.id
        where m.sujet_id = s.id and mc.statut = 'VISIBLE' and mc.auteur_id <> c.auteur_id)::int
        as reponses,
      c.auteur_id
    from sujet s join contenu c on c.id = s.id
    where c.statut = 'VISIBLE' and s.id in (${sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )})`);
  const parId = new Map(lignes.rows.map((l) => [Number(l.id), l]));
  return ids.flatMap((id) => {
    const l = parId.get(id);
    return l
      ? [
          {
            id,
            slug: l.slug,
            type: l.type_sujet,
            titre: l.titre,
            etat: etatSujet({ ferme: l.ferme, accepte: l.accepte }),
            reponses: l.reponses,
            auteurId: Number(l.auteur_id),
          },
        ]
      : [];
  });
}

/** Demandes ouvertes, comptées sur les 30 derniers jours, des plus demandées aux moins demandées. */
export async function lireDemandes(
  db: Executeur,
  membreId: number | null,
  maintenant: Date,
): Promise<DemandeGuideApi[]> {
  const depuis = new Date(maintenant.getTime() - DELAIS.demandesGuideJours * JOUR);
  const lignes = await db
    .select({
      id: demandeGuide.id,
      libelle: demandeGuide.libelle,
      domaine: { libelle: categorie.libelle, slug: categorie.slug, icone: categorie.icone },
      soutiens: sql<number>`(select count(*) from soutien_demande sd
        where sd.demande_id = ${demandeGuide.id} and sd.date >= ${depuis})::int`,
      soutenue:
        membreId === null
          ? sql<boolean>`false`
          : sql<boolean>`exists (select 1 from soutien_demande sd where sd.demande_id = ${demandeGuide.id}
              and sd.utilisateur_id = ${membreId} and sd.date >= ${depuis})`,
    })
    .from(demandeGuide)
    .leftJoin(categorie, eq(categorie.id, demandeGuide.categorieId))
    .where(isNull(demandeGuide.dateCloture));
  return lignes.toSorted(
    (a, b) => b.soutiens - a.soutiens || a.libelle.localeCompare(b.libelle, 'fr'),
  );
}

/** Liste de contrôle d'un membre, réduite aux étapes et pièges qui existent encore. */
export async function lireListe(
  db: Executeur,
  membreId: number,
  g: Pick<GuideLu, 'id' | 'etapes' | 'pieges'>,
): Promise<ListeControleApi> {
  const [ligne] = await db
    .select({ etapes: listeControle.etapes, pieges: listeControle.pieges })
    .from(listeControle)
    .where(and(eq(listeControle.utilisateurId, membreId), eq(listeControle.guideId, g.id)));
  const etapes = new Set(ligne?.etapes ?? []);
  const pieges = new Set(ligne?.pieges ?? []);
  return {
    etapes: g.etapes.filter((e) => etapes.has(e.id)).map((e) => e.id),
    pieges: g.pieges.filter((p) => pieges.has(p.id)).map((p) => p.id),
  };
}

/** Pièges qu'un membre a proposés pour un guide et que l'équipe n'a pas encore relus. */
export async function lirePropositions(
  db: Executeur,
  membreId: number,
  guideId: number,
): Promise<PropositionPiegeApi[]> {
  const lignes = await db
    .select()
    .from(propositionPiege)
    .where(
      and(
        eq(propositionPiege.auteurId, membreId),
        eq(propositionPiege.guideId, guideId),
        eq(propositionPiege.statut, 'EN_RELECTURE'),
      ),
    )
    .orderBy(desc(propositionPiege.date), desc(propositionPiege.id));
  return lignes.map((p) => ({
    id: p.id,
    titre: p.titre,
    solution: p.solution,
    etapeId: p.etapeId,
    outil: p.outil,
    date: p.date.toISOString(),
    statut: p.statut,
  }));
}
