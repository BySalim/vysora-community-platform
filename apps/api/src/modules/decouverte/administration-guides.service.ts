import { Inject, Injectable } from '@nestjs/common';
import {
  type ContenuGuideAdministreApi,
  type DomaineChoixApi,
  type GuideAdministreApi,
  type GuidesAdministresApi,
  type SaisieGuide,
  type SaisieNouveauGuide,
} from '@vysora/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  conflit,
  erreurValidation,
  estViolationUnicite,
  introuvable,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur, Transaction } from '../../db/client.js';
import {
  categorie,
  guide,
  guideContenu,
  guideContenuRetire,
  guideEtape,
  guideEtapeSource,
  guidePiege,
  guidePiegeSource,
} from '../../db/schema/index.js';
import { auditer } from '../administration/journal-audit.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/** Version d'un guide : date de sa dernière modification, à la milliseconde, comme toISOString. */
const VERSION = sql<string>`to_char(date_trunc('milliseconds', coalesce(${guide.dateModification},
  ${guide.dateCreation})) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

const TYPES_GUIDE = ['CREATION', 'SUJET', 'CAS_BON_REFLEXE'] as const;
type TypeContenuGuide = (typeof TYPES_GUIDE)[number];

const NOMS_TYPE: Record<TypeContenuGuide, string> = {
  CREATION: 'parcours',
  SUJET: 'question',
  CAS_BON_REFLEXE: 'cas',
};

type LigneContenu = {
  id: string;
  type: TypeContenuGuide;
  titre: string | null;
  slug: string | null;
  auteur_id: string;
  statut: 'VISIBLE' | 'MASQUE' | 'SUPPRIME';
  publie: boolean;
};

/** Colonnes communes aux contenus d'un guide et aux parcours qui en ont été retirés. */
const colonnesContenu = sql`c.id, c.type_contenu as type,
  coalesce(cr.titre, s.titre, k.titre) as titre, coalesce(cr.slug, s.slug, k.slug) as slug,
  c.auteur_id, c.statut,
  (c.type_contenu = 'SUJET' or cr.statut_publication = 'PUBLIEE'
    or k.statut_validation = 'VALIDE') as publie`;
const jointuresContenu = sql`join contenu c on c.id = x.contenu_id
  left join creation cr on cr.id = c.id
  left join sujet s on s.id = c.id
  left join cas_bon_reflexe k on k.id = c.id`;

/* DEC-02 : rédaction des guides d'Explorer par l'équipe (registre, point « Explorer : guides »).
   Un guide naît en préparation, montré à personne ; l'équipe y écrit son objectif, sa méthode, ses
   pièges et ses lacunes, y range des parcours, des questions et des cas, puis le publie. Un parcours
   retiré n'y revient plus par le rapprochement (rattachement.ts). Chaque changement est inscrit au
   journal d'audit (ENF-09). Les chiffres du guide restent calculés à la lecture (GuidesService). */
@Injectable()
export class AdministrationGuidesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  /** GET /api/v1/admin/guides */
  async liste(): Promise<GuidesAdministresApi> {
    const [{ rows }, domaines, { rows: totaux }] = await Promise.all([
      this.db.execute<{
        id: string;
        slug: string;
        titre: string;
        titre_court: string;
        libelle: string;
        domaine: string;
        icone: string | null;
        date_publication: Date | string | null;
        version: string;
        parcours: number;
        etapes: number;
        pieges: number;
        a_relire: number;
      }>(sql`
        select g.id, g.slug, g.titre, g.titre_court, cat.libelle, cat.slug as domaine, cat.icone,
          g.date_publication, to_char(date_trunc('milliseconds', coalesce(g.date_modification,
            g.date_creation)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as version,
          (select count(*) from guide_contenu gc join contenu c on c.id = gc.contenu_id
            join creation cr on cr.id = c.id
            where gc.guide_id = g.id and c.statut = 'VISIBLE'
              and cr.statut_publication = 'PUBLIEE')::int as parcours,
          (select count(*) from guide_etape e where e.guide_id = g.id)::int as etapes,
          (select count(*) from guide_piege p where p.guide_id = g.id)::int as pieges,
          (select count(*) from proposition_piege pp where pp.guide_id = g.id
            and pp.statut = 'EN_RELECTURE')::int as a_relire
        from guide g join categorie cat on cat.id = g.categorie_id
        order by g.date_publication is not null, g.titre_court`),
      this.domaines(this.db),
      this.db.execute<{ a_relire: number; demandes: number }>(sql`
        select (select count(*) from proposition_piege where statut = 'EN_RELECTURE')::int as a_relire,
          (select count(*) from demande_guide where date_cloture is null)::int as demandes`),
    ]);
    return {
      elements: rows.map((l) => ({
        id: Number(l.id),
        slug: l.slug,
        titre: l.titre,
        titreCourt: l.titre_court,
        domaine: { libelle: l.libelle, slug: l.domaine, icone: l.icone },
        datePublication: l.date_publication ? new Date(l.date_publication).toISOString() : null,
        dateModification: l.version,
        parcours: l.parcours,
        etapes: l.etapes,
        pieges: l.pieges,
        aRelire: l.a_relire,
      })),
      domaines,
      aRelire: totaux[0]?.a_relire ?? 0,
      demandes: totaux[0]?.demandes ?? 0,
    };
  }

  /** POST /api/v1/admin/guides : nouveau guide, en préparation. */
  async creer(adminId: number, saisie: SaisieNouveauGuide): Promise<GuideAdministreApi> {
    const id = await this.db.transaction(async (tx) => {
      await this.controlerDomaine(tx, saisie.categorieId, null);
      const [pris] = await tx
        .select({ id: guide.id })
        .from(guide)
        .where(eq(guide.slug, saisie.slug));
      if (pris) throw erreurValidation({ slug: 'Cette adresse est déjà celle d’un autre guide.' });
      const maintenant = new Date();
      try {
        const [cree] = await tx
          .insert(guide)
          .values({ ...saisie, dateCreation: maintenant, dateModification: maintenant })
          .returning({ id: guide.id });
        await auditer(tx, adminId, 'GUIDE_CREE', 'guide', cree!.id, { nom: saisie.titreCourt });
        return cree!.id;
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw erreurValidation({ slug: 'Cette adresse est déjà celle d’un autre guide.' });
        throw erreur;
      }
    });
    return this.lire(id);
  }

  /** GET /api/v1/admin/guides/:id */
  async lire(id: number): Promise<GuideAdministreApi> {
    const [g] = await this.db
      .select({
        id: guide.id,
        slug: guide.slug,
        titre: guide.titre,
        titreCourt: guide.titreCourt,
        categorieId: guide.categorieId,
        motsCles: guide.motsCles,
        lacunes: guide.lacunes,
        datePublication: guide.datePublication,
        version: VERSION,
      })
      .from(guide)
      .where(eq(guide.id, id));
    if (!g) throw introuvable('Ce guide est introuvable.');

    const [etapes, pieges, contenus, retires, domaines, { rows: usages }] = await Promise.all([
      this.db
        .select()
        .from(guideEtape)
        .where(eq(guideEtape.guideId, id))
        .orderBy(asc(guideEtape.ordre)),
      this.db
        .select()
        .from(guidePiege)
        .where(eq(guidePiege.guideId, id))
        .orderBy(asc(guidePiege.ordre)),
      this.db.execute<LigneContenu>(sql`
        select ${colonnesContenu} from guide_contenu x ${jointuresContenu}
        where x.guide_id = ${id} order by x.ordre, x.contenu_id`),
      this.db.execute<LigneContenu>(sql`
        select ${colonnesContenu} from guide_contenu_retire x ${jointuresContenu}
        where x.guide_id = ${id} order by x.date desc`),
      this.domaines(this.db, g.categorieId),
      this.db.execute<{ a_relire: number; utilise: boolean }>(sql`
        select (select count(*) from proposition_piege where guide_id = ${id}
            and statut = 'EN_RELECTURE')::int as a_relire,
          (exists (select 1 from proposition_piege where guide_id = ${id})
            or exists (select 1 from liste_controle where guide_id = ${id})) as utilise`),
    ]);
    const [sourcesEtapes, sourcesPieges] = await Promise.all([
      etapes.length
        ? this.db
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
        ? this.db
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
    const membres = await resumerMembres(this.db, this.stockage, [
      ...contenus.rows.map((c) => Number(c.auteur_id)),
      ...retires.rows.map((c) => Number(c.auteur_id)),
    ]);
    const presenter = (lignes: LigneContenu[]): ContenuGuideAdministreApi[] =>
      lignes.flatMap((c) => {
        const auteur = membres.get(Number(c.auteur_id));
        if (!auteur) return [];
        const etat =
          c.statut === 'SUPPRIME'
            ? 'SUPPRIME'
            : c.statut === 'MASQUE'
              ? 'MASQUE'
              : c.publie
                ? null
                : 'NON_PUBLIE';
        return [
          {
            id: Number(c.id),
            type: c.type,
            titre: c.titre ?? 'Sans titre',
            slug: c.slug,
            auteur,
            presente: etat === null,
            etat,
          },
        ];
      });
    const usage = usages[0];

    return {
      id: g.id,
      slug: g.slug,
      titre: g.titre,
      titreCourt: g.titreCourt,
      categorieId: g.categorieId,
      motsCles: g.motsCles,
      lacunes: g.lacunes,
      datePublication: g.datePublication?.toISOString() ?? null,
      version: g.version,
      etapes: etapes.map((e) => ({
        id: e.id,
        titre: e.titre,
        conseil: e.conseil,
        sources: sourcesEtapes.filter((s) => s.etapeId === e.id).map((s) => s.creationId),
        citation:
          e.citationCreationId !== null && e.citationTexte !== null
            ? { parcoursId: e.citationCreationId, texte: e.citationTexte }
            : null,
      })),
      pieges: pieges.map((p) => ({
        id: p.id,
        titre: p.titre,
        solution: p.solution,
        etapeId: p.etapeId,
        sources: sourcesPieges.filter((s) => s.piegeId === p.id).map((s) => s.creationId),
        sujetId: p.sujetId,
        casId: p.casId,
      })),
      contenus: presenter(contenus.rows),
      retires: presenter(retires.rows),
      aRelire: usage?.a_relire ?? 0,
      domaines,
      supprimable: g.datePublication === null && !usage?.utilise,
    };
  }

  /** PUT /api/v1/admin/guides/:id : objectif, nom court, domaine, mots-clés, lacunes, méthode et
      pièges, dans leur ordre. Les étapes et les pièges gardent leur identifiant (listes de
      contrôle des membres) ; ceux qui manquent sont retirés. */
  async modifier(adminId: number, id: number, saisie: SaisieGuide): Promise<GuideAdministreApi> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      if (g.version !== saisie.version)
        throw conflit(
          'Ce guide a été modifié entre-temps par un autre administrateur. Rechargez la page pour repartir de sa dernière version.',
        );
      await this.controlerDomaine(tx, saisie.categorieId, g.categorieId);

      const [contenus, etapesActuelles, piegesActuels] = await Promise.all([
        tx
          .execute<{ id: string; type: string }>(
            sql`select c.id, c.type_contenu as type from guide_contenu gc
              join contenu c on c.id = gc.contenu_id where gc.guide_id = ${id}`,
          )
          .then((r) => r.rows),
        tx.select({ id: guideEtape.id }).from(guideEtape).where(eq(guideEtape.guideId, id)),
        tx.select({ id: guidePiege.id }).from(guidePiege).where(eq(guidePiege.guideId, id)),
      ]);
      const du = (type: TypeContenuGuide) =>
        new Set(contenus.filter((c) => c.type === type).map((c) => Number(c.id)));
      const parcours = du('CREATION');
      const sujets = du('SUJET');
      const cas = du('CAS_BON_REFLEXE');
      const erreurs: Record<string, string> = {};
      const etapesConnues = new Set(etapesActuelles.map((e) => e.id));
      const piegesConnus = new Set(piegesActuels.map((p) => p.id));
      if (saisie.etapes.some((e) => e.id !== null && !etapesConnues.has(e.id)))
        erreurs.etapes = 'Une étape a été retirée entre-temps. Rechargez la page.';
      if (saisie.pieges.some((p) => p.id !== null && !piegesConnus.has(p.id)))
        erreurs.pieges = 'Un piège a été retiré entre-temps. Rechargez la page.';
      // DEC-02 : un guide publié garde au moins une étape (Explorer présente sa méthode).
      if (g.datePublication && !saisie.etapes.length)
        erreurs.etapes = 'Un guide publié garde au moins une étape dans sa méthode.';
      saisie.etapes.forEach((e, i) => {
        if (e.sources.some((s) => !parcours.has(s)))
          erreurs[`etapes.${i}.sources`] = 'Choisissez des parcours de ce guide.';
        if (e.citation && !parcours.has(e.citation.parcoursId))
          erreurs[`etapes.${i}.citation.parcoursId`] = 'Choisissez un parcours de ce guide.';
      });
      saisie.pieges.forEach((p, i) => {
        if (p.sources.some((s) => !parcours.has(s)))
          erreurs[`pieges.${i}.sources`] = 'Choisissez des parcours de ce guide.';
        if (p.sujetId !== null && !sujets.has(p.sujetId))
          erreurs[`pieges.${i}.sujetId`] = 'Choisissez une question de ce guide.';
        if (p.casId !== null && !cas.has(p.casId))
          erreurs[`pieges.${i}.casId`] = 'Choisissez un cas de ce guide.';
      });
      if (Object.keys(erreurs).length) throw erreurValidation(erreurs);

      await tx
        .update(guide)
        .set({
          titre: saisie.titre,
          titreCourt: saisie.titreCourt,
          categorieId: saisie.categorieId,
          motsCles: saisie.motsCles,
          lacunes: saisie.lacunes,
          dateModification: new Date(),
        })
        .where(eq(guide.id, id));

      // Méthode : les étapes absentes sont retirées, les autres prennent leur nouvel ordre (décalé
      // d'abord : l'ordre est unique dans un guide).
      const etapesGardees = new Set(saisie.etapes.flatMap((e) => (e.id === null ? [] : [e.id])));
      const etapesRetirees = [...etapesConnues].filter((e) => !etapesGardees.has(e));
      if (etapesRetirees.length)
        await tx.delete(guideEtape).where(inArray(guideEtape.id, etapesRetirees));
      await tx
        .update(guideEtape)
        .set({ ordre: sql`${guideEtape.ordre} + 1000` })
        .where(eq(guideEtape.guideId, id));
      const idsEtapes: number[] = [];
      for (const [i, e] of saisie.etapes.entries()) {
        const valeurs = {
          ordre: i,
          titre: e.titre,
          conseil: e.conseil,
          citationCreationId: e.citation?.parcoursId ?? null,
          citationTexte: e.citation?.texte ?? null,
        };
        if (e.id === null) {
          const [ajoutee] = await tx
            .insert(guideEtape)
            .values({ guideId: id, ...valeurs })
            .returning({ id: guideEtape.id });
          idsEtapes.push(ajoutee!.id);
        } else {
          await tx.update(guideEtape).set(valeurs).where(eq(guideEtape.id, e.id));
          idsEtapes.push(e.id);
        }
      }
      if (idsEtapes.length)
        await tx.delete(guideEtapeSource).where(inArray(guideEtapeSource.etapeId, idsEtapes));
      const sourcesEtapes = saisie.etapes.flatMap((e, i) =>
        [...new Set(e.sources)].map((creationId) => ({ etapeId: idsEtapes[i]!, creationId })),
      );
      if (sourcesEtapes.length) await tx.insert(guideEtapeSource).values(sourcesEtapes);

      // Pièges : même chose ; l'étape d'un piège est désignée par sa place dans la méthode.
      const piegesGardes = new Set(saisie.pieges.flatMap((p) => (p.id === null ? [] : [p.id])));
      const piegesRetires = [...piegesConnus].filter((p) => !piegesGardes.has(p));
      if (piegesRetires.length)
        await tx.delete(guidePiege).where(inArray(guidePiege.id, piegesRetires));
      await tx
        .update(guidePiege)
        .set({ ordre: sql`${guidePiege.ordre} + 1000` })
        .where(eq(guidePiege.guideId, id));
      const idsPieges: number[] = [];
      for (const [i, p] of saisie.pieges.entries()) {
        const valeurs = {
          ordre: i,
          titre: p.titre,
          solution: p.solution,
          etapeId: p.etape === null ? null : (idsEtapes[p.etape] ?? null),
          sujetId: p.sujetId,
          casId: p.casId,
        };
        if (p.id === null) {
          const [ajoute] = await tx
            .insert(guidePiege)
            .values({ guideId: id, ...valeurs })
            .returning({ id: guidePiege.id });
          idsPieges.push(ajoute!.id);
        } else {
          await tx.update(guidePiege).set(valeurs).where(eq(guidePiege.id, p.id));
          idsPieges.push(p.id);
        }
      }
      if (idsPieges.length)
        await tx.delete(guidePiegeSource).where(inArray(guidePiegeSource.piegeId, idsPieges));
      const sourcesPieges = saisie.pieges.flatMap((p, i) =>
        [...new Set(p.sources)].map((creationId) => ({ piegeId: idsPieges[i]!, creationId })),
      );
      if (sourcesPieges.length) await tx.insert(guidePiegeSource).values(sourcesPieges);

      await auditer(tx, adminId, 'GUIDE_MODIFIE', 'guide', id, { nom: saisie.titreCourt });
    });
    return this.lire(id);
  }

  /** POST /api/v1/admin/guides/:id/publication : le guide apparaît dans Explorer. */
  async publier(adminId: number, id: number): Promise<GuideAdministreApi> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      if (g.datePublication) throw conflit('Ce guide est déjà publié.');
      const [etape] = await tx
        .select({ id: guideEtape.id })
        .from(guideEtape)
        .where(eq(guideEtape.guideId, id))
        .limit(1);
      // DEC-02 : Explorer présente la méthode d'un guide ; elle compte au moins une étape.
      if (!etape)
        throw conflit('Ajoutez au moins une étape à la méthode avant de publier le guide.');
      await tx.update(guide).set({ datePublication: new Date() }).where(eq(guide.id, id));
      await auditer(tx, adminId, 'GUIDE_PUBLIE', 'guide', id, { nom: g.titreCourt });
    });
    return this.lire(id);
  }

  /** DELETE /api/v1/admin/guides/:id/publication : le guide n'est plus montré ; les listes de
      contrôle des membres sont gardées. */
  async mettreEnPreparation(adminId: number, id: number): Promise<GuideAdministreApi> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      if (!g.datePublication) throw conflit('Ce guide est déjà en préparation.');
      await tx.update(guide).set({ datePublication: null }).where(eq(guide.id, id));
      await auditer(tx, adminId, 'GUIDE_EN_PREPARATION', 'guide', id, { nom: g.titreCourt });
    });
    return this.lire(id);
  }

  /** DELETE /api/v1/admin/guides/:id : guide en préparation créé par erreur, que personne n'a
      utilisé (une liste de contrôle ou un piège signalé appartient à un membre). */
  async supprimer(adminId: number, id: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      if (g.datePublication)
        throw conflit('Un guide publié ne se supprime pas : repassez-le d’abord en préparation.');
      const { rows } = await tx.execute<{ utilise: boolean }>(sql`
        select exists (select 1 from proposition_piege where guide_id = ${id})
          or exists (select 1 from liste_controle where guide_id = ${id}) as utilise`);
      if (rows[0]?.utilise)
        throw conflit(
          'Des membres ont utilisé ce guide (liste de contrôle, piège signalé) : il ne se supprime plus. Laissez-le en préparation.',
        );
      await tx.delete(guide).where(eq(guide.id, id));
      await auditer(tx, adminId, 'GUIDE_SUPPRIME', 'guide', id, {
        nom: g.titreCourt,
        slug: g.slug,
      });
    });
  }

  /** POST /api/v1/admin/guides/:id/contenus : parcours publié, question ou cas validé, visible. Un
      parcours appartient à un seul guide ; une question ou un cas peut servir à plusieurs. */
  async ajouterContenu(
    adminId: number,
    id: number,
    contenuId: number,
  ): Promise<GuideAdministreApi> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      const { rows } = await tx.execute<LigneContenu>(sql`
        select ${colonnesContenu} from (select ${contenuId}::bigint as contenu_id) x
        ${jointuresContenu}`);
      const c = rows[0];
      if (!c || !(TYPES_GUIDE as readonly string[]).includes(c.type))
        throw erreurValidation({
          contenuId: 'Indiquez une création, une question du forum ou un cas Bon réflexe.',
        });
      if (c.statut !== 'VISIBLE' || !c.publie)
        throw erreurValidation({
          contenuId:
            c.type === 'CAS_BON_REFLEXE'
              ? 'Ce cas n’est pas validé ou n’est pas visible : il ne peut pas rejoindre un guide.'
              : 'Ce contenu n’est pas publié ou n’est pas visible : il ne peut pas rejoindre un guide.',
        });
      const { rows: guides } = await tx.execute<{ id: string; titre_court: string }>(sql`
        select g.id, g.titre_court from guide_contenu gc join guide g on g.id = gc.guide_id
        where gc.contenu_id = ${contenuId}`);
      if (guides.some((x) => Number(x.id) === id))
        throw erreurValidation({ contenuId: 'Ce contenu fait déjà partie du guide.' });
      const autre = c.type === 'CREATION' ? guides[0] : undefined;
      if (autre)
        throw erreurValidation({
          contenuId: `Ce parcours fait partie du guide « ${autre.titre_court} ». Retirez-le d’abord de ce guide.`,
        });
      await tx.insert(guideContenu).values({
        guideId: id,
        contenuId,
        ordre: sql`(select coalesce(max(gc.ordre), 0) + 1 from guide_contenu gc where gc.guide_id = ${id})`,
      });
      await tx
        .delete(guideContenuRetire)
        .where(
          and(eq(guideContenuRetire.guideId, id), eq(guideContenuRetire.contenuId, contenuId)),
        );
      await auditer(tx, adminId, 'GUIDE_CONTENU_AJOUTE', 'guide', id, {
        nom: g.titreCourt,
        type: NOMS_TYPE[c.type],
        titre: c.titre,
      });
    });
    return this.lire(id);
  }

  /** DELETE /api/v1/admin/guides/:id/contenus/:contenuId : un parcours retiré ne figure plus dans
      la méthode ni dans les pièges, et le rapprochement ne le range plus dans ce guide ; une
      question ou un cas retiré n'est plus lié à aucun piège. */
  async retirerContenu(
    adminId: number,
    id: number,
    contenuId: number,
  ): Promise<GuideAdministreApi> {
    await this.db.transaction(async (tx) => {
      const g = await this.verrouiller(tx, id);
      const { rows } = await tx.execute<LigneContenu>(sql`
        select ${colonnesContenu} from guide_contenu x ${jointuresContenu}
        where x.guide_id = ${id} and x.contenu_id = ${contenuId}`);
      const c = rows[0];
      if (!c) throw introuvable('Ce contenu ne fait pas partie du guide.');
      await tx
        .delete(guideContenu)
        .where(and(eq(guideContenu.guideId, id), eq(guideContenu.contenuId, contenuId)));
      if (c.type === 'CREATION') {
        await tx
          .insert(guideContenuRetire)
          .values({ guideId: id, contenuId })
          .onConflictDoNothing();
        await tx.execute(sql`
          delete from guide_etape_source s using guide_etape e
          where e.id = s.etape_id and e.guide_id = ${id} and s.creation_id = ${contenuId}`);
        await tx.execute(sql`
          delete from guide_piege_source s using guide_piege p
          where p.id = s.piege_id and p.guide_id = ${id} and s.creation_id = ${contenuId}`);
        await tx
          .update(guideEtape)
          .set({ citationCreationId: null, citationTexte: null })
          .where(and(eq(guideEtape.guideId, id), eq(guideEtape.citationCreationId, contenuId)));
      } else if (c.type === 'SUJET') {
        await tx
          .update(guidePiege)
          .set({ sujetId: null })
          .where(and(eq(guidePiege.guideId, id), eq(guidePiege.sujetId, contenuId)));
      } else {
        await tx
          .update(guidePiege)
          .set({ casId: null })
          .where(and(eq(guidePiege.guideId, id), eq(guidePiege.casId, contenuId)));
      }
      // La méthode et les pièges ont pu changer : une modification ouverte ailleurs est périmée.
      await tx.update(guide).set({ dateModification: new Date() }).where(eq(guide.id, id));
      await auditer(tx, adminId, 'GUIDE_CONTENU_RETIRE', 'guide', id, {
        nom: g.titreCourt,
        type: NOMS_TYPE[c.type],
        titre: c.titre,
      });
    });
    return this.lire(id);
  }

  private async verrouiller(tx: Transaction, id: number) {
    const [g] = await tx
      .select({
        id: guide.id,
        slug: guide.slug,
        titreCourt: guide.titreCourt,
        categorieId: guide.categorieId,
        datePublication: guide.datePublication,
        version: VERSION,
      })
      .from(guide)
      .where(eq(guide.id, id))
      .for('update');
    if (!g) throw introuvable('Ce guide est introuvable.');
    return g;
  }

  /** Domaine actif, ou celui que le guide a déjà s'il a été archivé depuis. */
  private async controlerDomaine(db: Executeur, categorieId: number, actuel: number | null) {
    const [cat] = await db
      .select({ id: categorie.id, active: categorie.estActive })
      .from(categorie)
      .where(eq(categorie.id, categorieId));
    if (!cat || (!cat.active && cat.id !== actuel))
      throw erreurValidation({ categorieId: 'Choisissez un domaine actif.' });
  }

  /** Domaines actifs dans l'ordre du référentiel, et celui du guide s'il a été archivé. */
  private async domaines(db: Executeur, actuel?: number): Promise<DomaineChoixApi[]> {
    const lignes = await db
      .select({ id: categorie.id, libelle: categorie.libelle, active: categorie.estActive })
      .from(categorie)
      .orderBy(asc(categorie.ordreAffichage), asc(categorie.id));
    return lignes
      .filter((c) => c.active || c.id === actuel)
      .map(({ id, libelle }) => ({ id, libelle }));
  }
}
