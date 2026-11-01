import { Inject, Injectable } from '@nestjs/common';
import {
  slugifier,
  type EditeurAdministreApi,
  type OutilAdministreApi,
  type SaisieModele,
  type SaisieOutil,
} from '@vysora/shared';
import { and, eq, ne, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { editeur, modele, outil, outilModele } from '../../db/schema/index.js';
import { auditer } from './journal-audit.js';

const NOM_PRIS_EDITEUR = 'Un éditeur porte déjà ce nom.';
const editeurArchive = (nom: string) =>
  `L’éditeur « ${nom} » est archivé : proposez-le de nouveau d’abord, depuis l’onglet Éditeurs.`;

/* Référentiel des éditeurs, outils et modèles d'IA (ADM-02, EC-22, F-95, RG-110) : un élément
   utilisé n'est jamais supprimé ; archivé (éditeur, outil) ou retiré (modèle), il reste affiché sur
   les contenus existants et n'est plus proposé dans les nouvelles saisies. Archiver un éditeur
   archive ses outils et retire ses modèles du même coup ; le proposer de nouveau ne les rétablit pas
   (chacun se propose de nouveau à part), et aucun ne l'est tant que l'éditeur est archivé. Chaque
   changement est inscrit au journal d'audit (ENF-09). */
@Injectable()
export class ReferentielsAdminService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async outils(): Promise<OutilAdministreApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      nom: string;
      slug: string;
      editeur_id: string;
      editeur: string;
      editeur_actif: boolean;
      type: OutilAdministreApi['type'];
      famille: OutilAdministreApi['famille'];
      logo: string | null;
      logo_monochrome: boolean;
      statut: OutilAdministreApi['statut'];
      utilisations: number;
      modeles: OutilAdministreApi['modeles'] | null;
    }>(sql`
      select o.id, o.nom, o.slug, o.editeur_id, e.nom as editeur, e.est_actif as editeur_actif,
        o.type, o.famille, o.logo, o.logo_monochrome, o.statut,
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
      editeurId: Number(r.editeur_id),
      editeur: r.editeur,
      editeurActif: r.editeur_actif,
      type: r.type,
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
        await auditer(tx, adminId, 'OUTIL_CREE', 'outil', cree!.id, { nom: saisie.nom });
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
      const [o] = await tx
        .select({ editeurId: outil.editeurId, editeur: editeur.nom, actif: editeur.estActif })
        .from(outil)
        .innerJoin(editeur, eq(editeur.id, outil.editeurId))
        .where(eq(outil.id, outilId))
        .for('share', { of: editeur });
      if (!o) throw introuvable('Cet outil est introuvable.');
      if (!o.actif) throw conflit(editeurArchive(o.editeur));
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
      await auditer(tx, adminId, 'MODELE_AJOUTE', 'modele', modeleId, { outilId });
    });
    return this.un(outilId);
  }

  async statutOutil(
    adminId: number,
    id: number,
    statut: OutilAdministreApi['statut'],
  ): Promise<OutilAdministreApi> {
    await this.db.transaction(async (tx) => {
      // Verrou partagé de l'éditeur : son archivage, au même instant, passe avant ou après.
      const [o] = await tx
        .select({ editeur: editeur.nom, actif: editeur.estActif })
        .from(outil)
        .innerJoin(editeur, eq(editeur.id, outil.editeurId))
        .where(eq(outil.id, id))
        .for('share', { of: editeur });
      if (!o) throw introuvable('Cet outil est introuvable.');
      if (statut === 'ACTIF' && !o.actif) throw conflit(editeurArchive(o.editeur));
      await tx.update(outil).set({ statut }).where(eq(outil.id, id));
      await auditer(tx, adminId, `OUTIL_${statut}`, 'outil', id);
    });
    return this.un(id);
  }

  async statutModele(
    adminId: number,
    id: number,
    statut: OutilAdministreApi['modeles'][number]['statut'],
  ): Promise<{ id: number; statut: typeof statut }> {
    await this.db.transaction(async (tx) => {
      const [m] = await tx
        .select({ editeur: editeur.nom, actif: editeur.estActif })
        .from(modele)
        .innerJoin(editeur, eq(editeur.id, modele.editeurId))
        .where(eq(modele.id, id))
        .for('share', { of: editeur });
      if (!m) throw introuvable('Ce modèle est introuvable.');
      if (statut === 'DISPONIBLE' && !m.actif) throw conflit(editeurArchive(m.editeur));
      await tx.update(modele).set({ statut }).where(eq(modele.id, id));
      await auditer(tx, adminId, `MODELE_${statut}`, 'modele', id);
    });
    return { id, statut };
  }

  /* Éditeurs ---------------------------------------------------------------------- */

  /** Par ordre alphabétique, archivés compris. */
  async editeurs(id?: number): Promise<EditeurAdministreApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      nom: string;
      est_actif: boolean;
      outils: EditeurAdministreApi['outils'] | null;
      modeles: number;
      modeles_proposes: number;
    }>(sql`
      select e.id, e.nom, e.est_actif,
        (select json_agg(json_build_object('id', o.id, 'nom', o.nom, 'statut', o.statut)
            order by o.statut, o.nom)
          from outil o where o.editeur_id = e.id) as outils,
        (select count(*) from modele m where m.editeur_id = e.id)::int as modeles,
        (select count(*) from modele m where m.editeur_id = e.id and m.statut = 'DISPONIBLE')::int
          as modeles_proposes
      from editeur e
      ${id === undefined ? sql`` : sql`where e.id = ${id}`}
      order by lower(e.nom), e.id`);
    return rows.map((r) => ({
      id: Number(r.id),
      nom: r.nom,
      actif: r.est_actif,
      outils: (r.outils ?? []).map((o) => ({ ...o, id: Number(o.id) })),
      modeles: r.modeles,
      modelesProposes: r.modeles_proposes,
    }));
  }

  /** Le nouveau nom s'affiche partout où l'éditeur apparaît ; sa clé ne change pas. */
  async renommerEditeur(adminId: number, id: number, nom: string): Promise<EditeurAdministreApi> {
    await this.db.transaction(async (tx) => {
      const [e] = await tx.select().from(editeur).where(eq(editeur.id, id)).for('update');
      if (!e) throw introuvable('Cet éditeur est introuvable.');
      if (e.nom === nom) return;
      const [homonyme] = await tx
        .select({ id: editeur.id })
        .from(editeur)
        .where(and(ne(editeur.id, id), sql`lower(${editeur.nom}) = lower(${nom})`));
      if (homonyme) throw conflit(NOM_PRIS_EDITEUR, { nom: NOM_PRIS_EDITEUR });
      try {
        await tx.update(editeur).set({ nom }).where(eq(editeur.id, id));
      } catch (erreur) {
        if (estViolationUnicite(erreur)) throw conflit(NOM_PRIS_EDITEUR, { nom: NOM_PRIS_EDITEUR });
        throw erreur;
      }
      await auditer(tx, adminId, 'EDITEUR_RENOMME', 'editeur', id, { avant: e.nom, apres: nom });
    });
    return this.unEditeur(id);
  }

  /** RG-110 : archivé, l'éditeur n'est plus proposé ; ses outils proposés sont archivés et ses
      modèles disponibles retirés, y compris ceux proposés avec les outils d'autres éditeurs. Proposé
      de nouveau, il retrouve sa place dans les saisies ; ses outils et modèles restent archivés ou
      retirés jusqu'à ce que l'administration les propose de nouveau, un par un. */
  async activerEditeur(adminId: number, id: number, actif: boolean): Promise<EditeurAdministreApi> {
    await this.db.transaction(async (tx) => {
      const [e] = await tx.select().from(editeur).where(eq(editeur.id, id)).for('update');
      if (!e) throw introuvable('Cet éditeur est introuvable.');
      if (e.estActif === actif) return;
      await tx.update(editeur).set({ estActif: actif }).where(eq(editeur.id, id));
      if (actif) {
        await auditer(tx, adminId, 'EDITEUR_REACTIVE', 'editeur', id);
        return;
      }
      const outils = await tx
        .update(outil)
        .set({ statut: 'ARCHIVE' })
        .where(and(eq(outil.editeurId, id), eq(outil.statut, 'ACTIF')))
        .returning({ nom: outil.nom });
      const modeles = await tx
        .update(modele)
        .set({ statut: 'RETIRE' })
        .where(and(eq(modele.editeurId, id), eq(modele.statut, 'DISPONIBLE')))
        .returning({ nom: modele.nom });
      const noms = (lignes: { nom: string }[]) =>
        lignes.map((l) => l.nom).toSorted((x, y) => x.localeCompare(y, 'fr'));
      await auditer(tx, adminId, 'EDITEUR_ARCHIVE', 'editeur', id, {
        outils: noms(outils),
        modeles: noms(modeles),
      });
    });
    return this.unEditeur(id);
  }

  private async unEditeur(id: number): Promise<EditeurAdministreApi> {
    const [trouve] = await this.editeurs(id);
    if (!trouve) throw introuvable('Cet éditeur est introuvable.');
    return trouve;
  }

  /** Éditeur d'un nouvel outil : connu par son nom ou par sa clé (un ancien nom, une autre graphie :
      « Mistral-AI » désigne « Mistral AI »), sinon créé. Un éditeur archivé n'est pas proposé. */
  private async editeur(tx: Executeur, nom: string): Promise<number> {
    const slug = slugifier(nom, 100) || 'editeur';
    const [existant] = await tx
      .select({ id: editeur.id, nom: editeur.nom, actif: editeur.estActif })
      .from(editeur)
      .where(sql`lower(${editeur.nom}) = lower(${nom}) or ${editeur.slug} = ${slug}`)
      .orderBy(sql`lower(${editeur.nom}) = lower(${nom}) desc`)
      .limit(1)
      .for('share');
    if (existant && !existant.actif) {
      const message = editeurArchive(existant.nom);
      throw conflit(message, { editeur: message });
    }
    if (existant) return existant.id;
    const [cree] = await tx.insert(editeur).values({ nom, slug }).returning({ id: editeur.id });
    return cree!.id;
  }

  private async un(id: number): Promise<OutilAdministreApi> {
    const trouve = (await this.outils()).find((o) => o.id === id);
    if (!trouve) throw introuvable('Cet outil est introuvable.');
    return trouve;
  }
}
