import { Inject, Injectable } from '@nestjs/common';
import {
  slugifier,
  type OutilAdministreApi,
  type SaisieModele,
  type SaisieOutil,
} from '@vysora/shared';
import { and, eq, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { editeur, journalAudit, modele, outil, outilModele } from '../../db/schema/index.js';

/* Référentiel des outils et modèles d'IA (ADM-02, EC-22, F-95, RG-110) : un outil ou un modèle
   utilisé n'est jamais supprimé ; archivé (outil) ou retiré (modèle), il reste affiché sur les
   contenus existants et n'est plus proposé dans les nouvelles saisies. Chaque changement est
   inscrit au journal d'audit (ENF-09). */
@Injectable()
export class ReferentielsAdminService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async outils(): Promise<OutilAdministreApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      nom: string;
      slug: string;
      editeur: string;
      famille: string;
      logo: string | null;
      logo_monochrome: boolean;
      statut: OutilAdministreApi['statut'];
      utilisations: number;
      modeles: OutilAdministreApi['modeles'] | null;
    }>(sql`
      select o.id, o.nom, o.slug, e.nom as editeur, o.famille, o.logo, o.logo_monochrome, o.statut,
        ((select count(*) from configuration_ia c where c.outil_id = o.id)
          + (select count(*) from sujet s where s.outil_id = o.id)
          + (select count(*) from cas_bon_reflexe cb where cb.outil_id = o.id)
          + (select count(*) from reproduction r where r.outil_id = o.id))::int as utilisations,
        (select json_agg(json_build_object('id', m.id, 'nom', m.nom, 'nomCourt', m.nom_court,
            'dateSortie', m.date_sortie, 'statut', m.statut) order by om.ordre, m.nom)
          from outil_modele om join modele m on m.id = om.modele_id where om.outil_id = o.id)
          as modeles
      from outil o join editeur e on e.id = o.editeur_id
      order by o.statut, o.famille, o.nom`);
    return rows.map((r) => ({
      id: Number(r.id),
      nom: r.nom,
      slug: r.slug,
      editeur: r.editeur,
      famille: r.famille,
      logo: r.logo,
      logoMonochrome: r.logo_monochrome,
      statut: r.statut,
      utilisations: r.utilisations,
      modeles: (r.modeles ?? []).map((m) => ({ ...m, id: Number(m.id) })),
    }));
  }

  /** Nouvel outil (sans logo : le fichier SVG s'ajoute aux ressources du site). */
  async creerOutil(adminId: number, saisie: SaisieOutil): Promise<OutilAdministreApi> {
    const id = await this.db.transaction(async (tx) => {
      const editeurId = await this.editeur(tx, saisie.editeur);
      try {
        const [cree] = await tx
          .insert(outil)
          .values({
            editeurId,
            nom: saisie.nom,
            slug: slugifier(saisie.nom) || 'outil',
            type: saisie.type,
            famille: saisie.famille,
          })
          .returning({ id: outil.id });
        await this.auditer(tx, adminId, 'OUTIL_CREE', 'outil', cree!.id, { nom: saisie.nom });
        return cree!.id;
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw conflit('Un outil porte déjà ce nom.', { nom: 'Un outil porte déjà ce nom.' });
        throw erreur;
      }
    });
    return this.un(id);
  }

  /** Nouveau modèle proposé avec l'outil (ou modèle existant de l'éditeur, rattaché à l'outil). */
  async ajouterModele(
    adminId: number,
    outilId: number,
    saisie: SaisieModele,
  ): Promise<OutilAdministreApi> {
    await this.db.transaction(async (tx) => {
      const [o] = await tx.select().from(outil).where(eq(outil.id, outilId));
      if (!o) throw introuvable('Cet outil est introuvable.');
      const [existant] = await tx
        .select({ id: modele.id })
        .from(modele)
        .where(and(eq(modele.editeurId, o.editeurId), eq(modele.nom, saisie.nom)));
      const modeleId =
        existant?.id ??
        (
          await tx
            .insert(modele)
            .values({
              editeurId: o.editeurId,
              nom: saisie.nom,
              nomCourt: saisie.nomCourt,
              dateSortie: saisie.dateSortie,
            })
            .returning({ id: modele.id })
        )[0]!.id;
      const { rows } = await tx.execute<{ ordre: number }>(
        sql`select coalesce(max(ordre), -1)::int + 1 as ordre from outil_modele where outil_id = ${outilId}`,
      );
      const lie = await tx
        .insert(outilModele)
        .values({ outilId, modeleId, ordre: rows[0]?.ordre ?? 0 })
        .onConflictDoNothing()
        .returning({ id: outilModele.modeleId });
      if (!lie.length) throw conflit('Ce modèle est déjà proposé avec cet outil.');
      await this.auditer(tx, adminId, 'MODELE_AJOUTE', 'modele', modeleId, { outilId });
    });
    return this.un(outilId);
  }

  async statutOutil(
    adminId: number,
    id: number,
    statut: OutilAdministreApi['statut'],
  ): Promise<OutilAdministreApi> {
    const modifie = await this.db
      .update(outil)
      .set({ statut })
      .where(eq(outil.id, id))
      .returning({ id: outil.id });
    if (!modifie.length) throw introuvable('Cet outil est introuvable.');
    await this.auditer(this.db, adminId, `OUTIL_${statut}`, 'outil', id);
    return this.un(id);
  }

  async statutModele(
    adminId: number,
    id: number,
    statut: OutilAdministreApi['modeles'][number]['statut'],
  ): Promise<{ id: number; statut: typeof statut }> {
    const modifie = await this.db
      .update(modele)
      .set({ statut })
      .where(eq(modele.id, id))
      .returning({ id: modele.id });
    if (!modifie.length) throw introuvable('Ce modèle est introuvable.');
    await this.auditer(this.db, adminId, `MODELE_${statut}`, 'modele', id);
    return { id, statut };
  }

  private async editeur(tx: Executeur, nom: string): Promise<number> {
    const [existant] = await tx
      .select({ id: editeur.id })
      .from(editeur)
      .where(sql`lower(${editeur.nom}) = lower(${nom})`);
    if (existant) return existant.id;
    const [cree] = await tx.insert(editeur).values({ nom }).returning({ id: editeur.id });
    return cree!.id;
  }

  private async un(id: number): Promise<OutilAdministreApi> {
    const trouve = (await this.outils()).find((o) => o.id === id);
    if (!trouve) throw introuvable('Cet outil est introuvable.');
    return trouve;
  }

  private async auditer(
    db: Executeur,
    acteurId: number,
    action: string,
    cibleType: string,
    cibleId: number,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db
      .insert(journalAudit)
      .values({ acteurId, action, cibleType, cibleId, details: details ?? null });
  }
}
