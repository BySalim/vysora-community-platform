import { Inject, Injectable } from '@nestjs/common';
import {
  DELAIS,
  LIMITES,
  type DemandeAdministreeApi,
  type DemandesAdministreesApi,
  type PropositionsPiegeApi,
  type RelecturePiege,
  type RelecturePiegeApi,
  type SaisieDemandeGuide,
} from '@vysora/shared';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import {
  conflit,
  erreurValidation,
  estViolationUnicite,
  introuvable,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  categorie,
  demandeGuide,
  guide,
  guideEtape,
  guidePiege,
  propositionPiege,
} from '../../db/schema/index.js';
import { auditer } from '../administration/journal-audit.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

const PAR_PAGE = 20;
const CLOSES = 50;
const JOUR = 24 * 60 * 60 * 1000;

/* DEC-02 : ce que l'équipe relit dans Explorer. Un piège signalé par un membre (« Signaler un
   piège », DEC-01) est retenu, réécrit par l'équipe dans le guide, ou écarté ; un objectif que la
   communauté cherche encore (« Ce que la communauté cherche encore ») est ajouté, clos quand un
   guide le couvre, ou rouvert. Chaque décision est inscrite au journal d'audit (ENF-09). */
@Injectable()
export class RelectureGuidesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  /** GET /api/v1/admin/propositions-pieges : pièges en relecture, du plus ancien au plus récent. */
  async propositions(page: number): Promise<PropositionsPiegeApi> {
    const enRelecture = eq(propositionPiege.statut, 'EN_RELECTURE');
    const [[totaux], lignes] = await Promise.all([
      this.db.select({ n: count() }).from(propositionPiege).where(enRelecture),
      this.db
        .select({
          proposition: propositionPiege,
          guide: {
            id: guide.id,
            slug: guide.slug,
            titreCourt: guide.titreCourt,
            datePublication: guide.datePublication,
          },
        })
        .from(propositionPiege)
        .innerJoin(guide, eq(guide.id, propositionPiege.guideId))
        .where(enRelecture)
        .orderBy(asc(propositionPiege.date), asc(propositionPiege.id))
        .limit(PAR_PAGE)
        .offset((page - 1) * PAR_PAGE),
    ]);
    const guides = [...new Set(lignes.map((l) => l.guide.id))];
    const [etapes, auteurs] = await Promise.all([
      guides.length
        ? this.db
            .select({ id: guideEtape.id, guideId: guideEtape.guideId, titre: guideEtape.titre })
            .from(guideEtape)
            .where(inArray(guideEtape.guideId, guides))
            .orderBy(asc(guideEtape.ordre))
        : [],
      resumerMembres(
        this.db,
        this.stockage,
        lignes.map((l) => l.proposition.auteurId),
      ),
    ]);
    const total = totaux?.n ?? 0;
    return {
      elements: lignes.flatMap(({ proposition: p, guide: g }) => {
        const auteur = auteurs.get(p.auteurId);
        return auteur
          ? [
              {
                id: p.id,
                titre: p.titre,
                solution: p.solution,
                etapeId: p.etapeId,
                outil: p.outil,
                date: p.date.toISOString(),
                statut: p.statut,
                auteur,
                guide: {
                  id: g.id,
                  slug: g.slug,
                  titreCourt: g.titreCourt,
                  publie: g.datePublication !== null,
                },
                etapes: etapes
                  .filter((e) => e.guideId === g.id)
                  .map((e) => ({ id: e.id, titre: e.titre })),
              },
            ]
          : [];
      }),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
    };
  }

  /** POST /api/v1/admin/propositions-pieges/:id/relecture : retenu, le piège est écrit à la fin
      des pièges du guide avec le texte de l'équipe ; écarté, il quitte la relecture. Le membre ne
      le voit plus « en relecture » dans le guide. */
  async relire(adminId: number, id: number, saisie: RelecturePiege): Promise<RelecturePiegeApi> {
    return this.db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(propositionPiege)
        .where(eq(propositionPiege.id, id))
        .for('update');
      if (!p) throw introuvable('Ce piège signalé est introuvable.');
      if (p.statut !== 'EN_RELECTURE') throw conflit('Ce piège a déjà été relu.');
      const [g] = await tx
        .select({ id: guide.id, titreCourt: guide.titreCourt })
        .from(guide)
        .where(eq(guide.id, p.guideId))
        .for('update');
      if (!g) throw introuvable('Ce guide est introuvable.');

      let piegeId: number | null = null;
      if (saisie.decision === 'RETENIR') {
        if (saisie.etapeId !== null) {
          const [etape] = await tx
            .select({ id: guideEtape.id })
            .from(guideEtape)
            .where(and(eq(guideEtape.id, saisie.etapeId), eq(guideEtape.guideId, g.id)));
          if (!etape) throw erreurValidation({ etapeId: 'Choisissez une étape de ce guide.' });
        }
        const [{ n, dernier } = { n: 0, dernier: 0 }] = await tx
          .select({ n: count(), dernier: sql<number>`coalesce(max(${guidePiege.ordre}), 0)::int` })
          .from(guidePiege)
          .where(eq(guidePiege.guideId, g.id));
        if (n >= LIMITES.guide.pieges)
          throw conflit(
            `Ce guide compte déjà ${LIMITES.guide.pieges} pièges. Regroupez-en ou retirez-en un avant d’en retenir un autre.`,
          );
        const [ecrit] = await tx
          .insert(guidePiege)
          .values({
            guideId: g.id,
            ordre: dernier + 1,
            titre: saisie.titre,
            solution: saisie.solution,
            etapeId: saisie.etapeId,
          })
          .returning({ id: guidePiege.id });
        piegeId = ecrit!.id;
        await tx.update(guide).set({ dateModification: new Date() }).where(eq(guide.id, g.id));
      }
      const statut = saisie.decision === 'RETENIR' ? 'RETENUE' : 'ECARTEE';
      await tx
        .update(propositionPiege)
        .set({ statut, relecteurId: adminId, dateRelecture: new Date() })
        .where(eq(propositionPiege.id, id));
      await auditer(
        tx,
        adminId,
        statut === 'RETENUE' ? 'PIEGE_RETENU' : 'PIEGE_ECARTE',
        'proposition_piege',
        id,
        { guide: g.titreCourt, titre: p.titre },
      );
      return { id, statut, piegeId };
    });
  }

  /** GET /api/v1/admin/demandes */
  async demandes(maintenant = new Date()): Promise<DemandesAdministreesApi> {
    const depuis = new Date(maintenant.getTime() - DELAIS.demandesGuideJours * JOUR);
    const [lignes, domaines] = await Promise.all([
      this.db
        .select({
          id: demandeGuide.id,
          libelle: demandeGuide.libelle,
          categorieId: demandeGuide.categorieId,
          domaine: { libelle: categorie.libelle, slug: categorie.slug, icone: categorie.icone },
          dateCreation: demandeGuide.dateCreation,
          dateCloture: demandeGuide.dateCloture,
          soutiens: sql<number>`(select count(*) from soutien_demande sd
            where sd.demande_id = ${demandeGuide.id} and sd.date >= ${depuis})::int`,
        })
        .from(demandeGuide)
        .leftJoin(categorie, eq(categorie.id, demandeGuide.categorieId)),
      this.db
        .select({ id: categorie.id, libelle: categorie.libelle })
        .from(categorie)
        .where(eq(categorie.estActive, true))
        .orderBy(asc(categorie.ordreAffichage), asc(categorie.id)),
    ]);
    const presenter = (l: (typeof lignes)[number]): DemandeAdministreeApi => ({
      id: l.id,
      libelle: l.libelle,
      domaine: l.categorieId === null ? null : l.domaine,
      soutiens: l.soutiens,
      dateCreation: l.dateCreation.toISOString(),
      dateCloture: l.dateCloture?.toISOString() ?? null,
    });
    return {
      ouvertes: lignes
        .filter((l) => l.dateCloture === null)
        .toSorted((a, b) => b.soutiens - a.soutiens || a.libelle.localeCompare(b.libelle, 'fr'))
        .map(presenter),
      closes: lignes
        .filter((l) => l.dateCloture !== null)
        .toSorted((a, b) => b.dateCloture!.getTime() - a.dateCloture!.getTime())
        .slice(0, CLOSES)
        .map(presenter),
      domaines,
    };
  }

  /** POST /api/v1/admin/demandes */
  async creerDemande(adminId: number, saisie: SaisieDemandeGuide): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (saisie.categorieId !== null) {
        const [cat] = await tx
          .select({ id: categorie.id })
          .from(categorie)
          .where(and(eq(categorie.id, saisie.categorieId), eq(categorie.estActive, true)));
        if (!cat) throw erreurValidation({ categorieId: 'Choisissez un domaine actif.' });
      }
      const [deja] = await tx
        .select({ id: demandeGuide.id })
        .from(demandeGuide)
        .where(sql`lower(${demandeGuide.libelle}) = lower(${saisie.libelle})`);
      if (deja) throw erreurValidation({ libelle: 'Cet objectif figure déjà parmi les demandes.' });
      try {
        const [creee] = await tx
          .insert(demandeGuide)
          .values({ libelle: saisie.libelle, categorieId: saisie.categorieId })
          .returning({ id: demandeGuide.id });
        await auditer(tx, adminId, 'DEMANDE_CREEE', 'demande_guide', creee!.id, {
          libelle: saisie.libelle,
        });
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw erreurValidation({ libelle: 'Cet objectif figure déjà parmi les demandes.' });
        throw erreur;
      }
    });
  }

  /** POST /api/v1/admin/demandes/:id/cloture : un guide couvre l'objectif ; il n'est plus présenté
      dans Explorer. DELETE : la demande est rouverte, avec ses soutiens. */
  async clore(adminId: number, id: number, close: boolean): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [d] = await tx.select().from(demandeGuide).where(eq(demandeGuide.id, id)).for('update');
      if (!d) throw introuvable('Cette demande est introuvable.');
      if (close === (d.dateCloture !== null))
        throw conflit(close ? 'Cette demande est déjà close.' : 'Cette demande est déjà ouverte.');
      await tx
        .update(demandeGuide)
        .set({ dateCloture: close ? new Date() : null })
        .where(eq(demandeGuide.id, id));
      await auditer(
        tx,
        adminId,
        close ? 'DEMANDE_CLOSE' : 'DEMANDE_ROUVERTE',
        'demande_guide',
        id,
        {
          libelle: d.libelle,
        },
      );
    });
  }
}
