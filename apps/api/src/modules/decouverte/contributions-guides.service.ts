import { Inject, Injectable } from '@nestjs/common';
import {
  DELAIS,
  LIMITES,
  MOTIF_SLUG_GUIDE,
  type ListeControleApi,
  type ListeControleSaisie,
  type PropositionPiegeApi,
  type PropositionPiegeSaisie,
  type SoutienDemandeApi,
} from '@vysora/shared';
import { and, asc, count, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { ErreurApplication, erreurValidation, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  demandeGuide,
  guide,
  guideEtape,
  guidePiege,
  listeControle,
  propositionPiege,
  soutienDemande,
  utilisateur,
} from '../../db/schema/index.js';

const JOUR = 24 * 60 * 60 * 1000;

/* DEC-01 : ce qu'un membre ajoute à Explorer (prototype explorer.js). « Ma liste de contrôle » est
   enregistrée dans son compte ; un piège signalé attend la relecture de l'équipe avant de rejoindre
   le guide ; « Je le cherche aussi » compte pendant 30 jours. */
@Injectable()
export class ContributionsGuidesService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  /** PUT /api/v1/guides/:slug/liste : éléments cochés ; ceux d'un autre guide sont ignorés. */
  async enregistrerListe(
    slug: string,
    membreId: number,
    saisie: ListeControleSaisie,
  ): Promise<ListeControleApi> {
    const g = await this.guidePublie(this.db, slug);
    const [etapes, pieges] = await Promise.all([
      this.db
        .select({ id: guideEtape.id })
        .from(guideEtape)
        .where(eq(guideEtape.guideId, g.id))
        .orderBy(asc(guideEtape.ordre)),
      this.db
        .select({ id: guidePiege.id })
        .from(guidePiege)
        .where(eq(guidePiege.guideId, g.id))
        .orderBy(asc(guidePiege.ordre)),
    ]);
    const liste: ListeControleApi = {
      etapes: etapes.map((e) => e.id).filter((id) => saisie.etapes.includes(id)),
      pieges: pieges.map((p) => p.id).filter((id) => saisie.pieges.includes(id)),
    };
    await this.db
      .insert(listeControle)
      .values({ utilisateurId: membreId, guideId: g.id, ...liste })
      .onConflictDoUpdate({
        target: [listeControle.utilisateurId, listeControle.guideId],
        set: { ...liste, dateModification: sql`now()` },
      });
    return liste;
  }

  /** POST /api/v1/guides/:slug/propositions : « Signaler un piège ». */
  async proposerPiege(
    slug: string,
    membreId: number,
    saisie: PropositionPiegeSaisie,
  ): Promise<PropositionPiegeApi> {
    return this.db.transaction(async (tx) => {
      const g = await this.guidePublie(tx, slug);
      if (saisie.etapeId !== null) {
        const [etape] = await tx
          .select({ id: guideEtape.id })
          .from(guideEtape)
          .where(and(eq(guideEtape.id, saisie.etapeId), eq(guideEtape.guideId, g.id)));
        if (!etape) throw erreurValidation({ etapeId: 'Choisissez une étape de ce guide.' });
      }
      // Garde-fou : les propositions en attente d'un membre restent en nombre raisonnable (le compte
      // verrouillé, deux envois simultanés ne dépassent pas la limite).
      await tx
        .select({ id: utilisateur.id })
        .from(utilisateur)
        .where(eq(utilisateur.id, membreId))
        .for('update');
      const [enAttente] = await tx
        .select({ n: count() })
        .from(propositionPiege)
        .where(
          and(eq(propositionPiege.auteurId, membreId), eq(propositionPiege.statut, 'EN_RELECTURE')),
        );
      if ((enAttente?.n ?? 0) >= LIMITES.propositionsPiegeEnRelecture)
        throw new ErreurApplication(
          'LIMITE_ATTEINTE',
          `Vous avez ${LIMITES.propositionsPiegeEnRelecture} pièges en relecture. Attendez que l’équipe les ait relus pour en signaler d’autres.`,
        );
      const [p] = await tx
        .insert(propositionPiege)
        .values({ guideId: g.id, auteurId: membreId, ...saisie })
        .returning();
      if (!p) throw new Error('Proposition non enregistrée.');
      return {
        id: p.id,
        titre: p.titre,
        solution: p.solution,
        etapeId: p.etapeId,
        outil: p.outil,
        date: p.date.toISOString(),
        statut: p.statut,
      };
    });
  }

  /** PUT /api/v1/demandes/:id/soutien : « Je le cherche aussi » (date renouvelée). */
  async soutenir(demandeId: number, membreId: number): Promise<SoutienDemandeApi> {
    await this.demandeOuverte(demandeId);
    await this.db
      .insert(soutienDemande)
      .values({ demandeId, utilisateurId: membreId })
      .onConflictDoUpdate({
        target: [soutienDemande.demandeId, soutienDemande.utilisateurId],
        set: { date: sql`now()` },
      });
    return this.soutien(demandeId, true);
  }

  /** DELETE /api/v1/demandes/:id/soutien */
  async retirerSoutien(demandeId: number, membreId: number): Promise<SoutienDemandeApi> {
    await this.demandeOuverte(demandeId);
    await this.db
      .delete(soutienDemande)
      .where(
        and(eq(soutienDemande.demandeId, demandeId), eq(soutienDemande.utilisateurId, membreId)),
      );
    return this.soutien(demandeId, false);
  }

  private async soutien(demandeId: number, soutenue: boolean): Promise<SoutienDemandeApi> {
    const depuis = new Date(Date.now() - DELAIS.demandesGuideJours * JOUR);
    const [ligne] = await this.db
      .select({ n: count() })
      .from(soutienDemande)
      .where(and(eq(soutienDemande.demandeId, demandeId), gte(soutienDemande.date, depuis)));
    return { id: demandeId, soutiens: ligne?.n ?? 0, soutenue };
  }

  private async demandeOuverte(id: number): Promise<void> {
    const [demande] = await this.db
      .select({ id: demandeGuide.id })
      .from(demandeGuide)
      .where(and(eq(demandeGuide.id, id), isNull(demandeGuide.dateCloture)));
    if (!demande) throw introuvable('Cette demande est introuvable.');
  }

  private async guidePublie(db: Executeur, slug: string): Promise<{ id: number }> {
    if (!MOTIF_SLUG_GUIDE.test(slug)) throw introuvable('Ce guide est introuvable.');
    const [g] = await db
      .select({ id: guide.id })
      .from(guide)
      .where(and(eq(guide.slug, slug), isNotNull(guide.datePublication)));
    if (!g) throw introuvable('Ce guide est introuvable.');
    return g;
  }
}
