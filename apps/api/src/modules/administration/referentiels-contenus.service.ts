import { Inject, Injectable } from '@nestjs/common';
import {
  slugifier,
  type BadgeAdministreApi,
  type CategorieAdministreeApi,
  type EtiquetteAdministreeApi,
  type FiltresEtiquettes,
  type LicenceAdministreeApi,
  type ListeEtiquettesAdministreesApi,
  type ModificationLicence,
  type SaisieCategorie,
  type SaisieLicence,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { badge, categorie, etiquette, licence } from '../../db/schema/index.js';
import { auditer } from './journal-audit.js';

const ETIQUETTES_PAR_PAGE = 50;
const NOM_PRIS_CATEGORIE = 'Une catégorie porte déjà ce nom.';
const CODE_PRIS_LICENCE = 'Une licence porte déjà ce code.';

/* Référentiels des contenus (ADM-02, EC-22, F-95, RG-110) : catégories (domaines d'Explorer),
   licences, étiquettes et badges. Un élément cité n'est jamais supprimé : archivé, il reste affiché
   sur les contenus qui le citent et n'est plus proposé dans les nouvelles saisies ; un badge arrêté
   n'est plus attribué et reste affiché chez qui l'a obtenu. Chaque changement est inscrit au journal
   d'audit (ENF-09). Les critères des badges et les paliers des niveaux sont des règles du code
   (RG-84 à RG-86) : ils ne se modifient pas ici. */
@Injectable()
export class ReferentielsContenusService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  /* Catégories ------------------------------------------------------------------- */

  async categories(id?: number): Promise<CategorieAdministreeApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      libelle: string;
      slug: string;
      icone: string | null;
      description: string | null;
      est_active: boolean;
      utilisations: number;
    }>(sql`
      select cat.id, cat.libelle, cat.slug, cat.icone, cat.description, cat.est_active,
        ((select count(*) from creation c where c.categorie_id = cat.id)
          + (select count(*) from guide g where g.categorie_id = cat.id)
          + (select count(*) from cas_bon_reflexe cb where cb.categorie_id = cat.id))::int
          as utilisations
      from categorie cat
      ${id === undefined ? sql`` : sql`where cat.id = ${id}`}
      order by cat.ordre_affichage, cat.id`);
    return rows.map(({ est_active, ...r }) => ({ ...r, id: Number(r.id), active: est_active }));
  }

  /** Nouvelle catégorie, en dernier dans l'ordre d'affichage ; son adresse se tire du libellé. */
  async creerCategorie(adminId: number, saisie: SaisieCategorie): Promise<CategorieAdministreeApi> {
    const id = await this.db.transaction(async (tx) => {
      try {
        const [cree] = await tx
          .insert(categorie)
          .values({
            ...saisie,
            slug: slugifier(saisie.libelle) || 'domaine',
            ordreAffichage: sql`(select coalesce(max(ordre_affichage), -1) + 1 from categorie)`,
          })
          .returning({ id: categorie.id });
        await auditer(tx, adminId, 'CATEGORIE_CREEE', 'categorie', cree!.id, {
          libelle: saisie.libelle,
        });
        return cree!.id;
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw conflit(NOM_PRIS_CATEGORIE, { libelle: NOM_PRIS_CATEGORIE });
        throw erreur;
      }
    });
    return this.categorie(id);
  }

  /** Libellé, icône et présentation ; l'adresse de la page du domaine ne change pas. */
  async modifierCategorie(
    adminId: number,
    id: number,
    saisie: SaisieCategorie,
  ): Promise<CategorieAdministreeApi> {
    await this.db.transaction(async (tx) => {
      try {
        const modifie = await tx
          .update(categorie)
          .set(saisie)
          .where(eq(categorie.id, id))
          .returning({ id: categorie.id });
        if (!modifie.length) throw introuvable('Cette catégorie est introuvable.');
        await auditer(tx, adminId, 'CATEGORIE_MODIFIEE', 'categorie', id, { ...saisie });
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw conflit(NOM_PRIS_CATEGORIE, { libelle: NOM_PRIS_CATEGORIE });
        throw erreur;
      }
    });
    return this.categorie(id);
  }

  async activerCategorie(
    adminId: number,
    id: number,
    actif: boolean,
  ): Promise<CategorieAdministreeApi> {
    const modifie = await this.db
      .update(categorie)
      .set({ estActive: actif })
      .where(eq(categorie.id, id))
      .returning({ id: categorie.id });
    if (!modifie.length) throw introuvable('Cette catégorie est introuvable.');
    await auditer(
      this.db,
      adminId,
      actif ? 'CATEGORIE_REACTIVEE' : 'CATEGORIE_ARCHIVEE',
      'categorie',
      id,
    );
    return this.categorie(id);
  }

  private async categorie(id: number): Promise<CategorieAdministreeApi> {
    const [trouvee] = await this.categories(id);
    if (!trouvee) throw introuvable('Cette catégorie est introuvable.');
    return trouvee;
  }

  /* Licences --------------------------------------------------------------------- */

  async licences(): Promise<LicenceAdministreeApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      code: string;
      libelle: string;
      resume: string | null;
      url: string;
      autorise_variantes: boolean;
      est_par_defaut: boolean;
      est_active: boolean;
      utilisations: number;
    }>(sql`
      select l.id, l.code, l.libelle, l.resume, l.url, l.autorise_variantes, l.est_par_defaut,
        l.est_active,
        (select count(*) from creation c where c.licence_id = l.id)::int
          as utilisations
      from licence l
      order by l.ordre_affichage, l.id`);
    return rows.map((r) => ({
      id: Number(r.id),
      code: r.code,
      libelle: r.libelle,
      resume: r.resume,
      url: r.url,
      autoriseVariantes: r.autorise_variantes,
      parDefaut: r.est_par_defaut,
      active: r.est_active,
      utilisations: r.utilisations,
    }));
  }

  async creerLicence(adminId: number, saisie: SaisieLicence): Promise<LicenceAdministreeApi> {
    const id = await this.db.transaction(async (tx) => {
      try {
        const [creee] = await tx
          .insert(licence)
          .values({
            ...saisie,
            ordreAffichage: sql`(select coalesce(max(ordre_affichage), -1) + 1 from licence)`,
          })
          .returning({ id: licence.id });
        await auditer(tx, adminId, 'LICENCE_CREEE', 'licence', creee!.id, { code: saisie.code });
        return creee!.id;
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw conflit(CODE_PRIS_LICENCE, { code: CODE_PRIS_LICENCE });
        throw erreur;
      }
    });
    return this.licence(id);
  }

  async modifierLicence(
    adminId: number,
    id: number,
    saisie: ModificationLicence,
  ): Promise<LicenceAdministreeApi> {
    await this.db.transaction(async (tx) => {
      const modifie = await tx
        .update(licence)
        .set(saisie)
        .where(eq(licence.id, id))
        .returning({ id: licence.id });
      if (!modifie.length) throw introuvable('Cette licence est introuvable.');
      await auditer(tx, adminId, 'LICENCE_MODIFIEE', 'licence', id, { ...saisie });
    });
    return this.licence(id);
  }

  /** CI-26 : la licence par défaut reste proposée ; on en choisit d'abord une autre. */
  async activerLicence(
    adminId: number,
    id: number,
    actif: boolean,
  ): Promise<LicenceAdministreeApi> {
    await this.db.transaction(async (tx) => {
      const [l] = await tx.select().from(licence).where(eq(licence.id, id)).for('update');
      if (!l) throw introuvable('Cette licence est introuvable.');
      if (!actif && l.estParDefaut)
        throw conflit(
          'La licence par défaut reste proposée : choisissez d’abord une autre licence par défaut.',
        );
      await tx.update(licence).set({ estActive: actif }).where(eq(licence.id, id));
      await auditer(tx, adminId, actif ? 'LICENCE_REACTIVEE' : 'LICENCE_ARCHIVEE', 'licence', id);
    });
    return this.licence(id);
  }

  /** CI-26 : exactement une licence par défaut, proposée aux auteurs qui n'en choisissent pas. */
  async licenceParDefaut(adminId: number, id: number): Promise<LicenceAdministreeApi[]> {
    await this.db.transaction(async (tx) => {
      // Verrou sur tout le référentiel : deux choix simultanés ne laissent pas deux licences par défaut.
      const lignes = await tx.select().from(licence).for('update');
      const choisie = lignes.find((l) => l.id === id);
      if (!choisie) throw introuvable('Cette licence est introuvable.');
      if (!choisie.estActive)
        throw conflit('Proposez de nouveau cette licence avant d’en faire la licence par défaut.');
      if (choisie.estParDefaut) return;
      await tx.update(licence).set({ estParDefaut: false }).where(eq(licence.estParDefaut, true));
      await tx.update(licence).set({ estParDefaut: true }).where(eq(licence.id, id));
      await auditer(tx, adminId, 'LICENCE_PAR_DEFAUT', 'licence', id, {
        avant: lignes.find((l) => l.estParDefaut)?.code ?? null,
      });
    });
    return this.licences();
  }

  private async licence(id: number): Promise<LicenceAdministreeApi> {
    const trouvee = (await this.licences()).find((l) => l.id === id);
    if (!trouvee) throw introuvable('Cette licence est introuvable.');
    return trouvee;
  }

  /* Étiquettes ------------------------------------------------------------------- */

  /** Les plus utilisées d'abord ; la recherche porte sur l'adresse de l'étiquette (sans accents). */
  async etiquettes(filtres: FiltresEtiquettes): Promise<ListeEtiquettesAdministreesApi> {
    const recherche = filtres.q === undefined ? '' : slugifier(filtres.q, 60);
    const conditions = [
      recherche ? sql`e.slug like ${`%${recherche}%`}` : undefined,
      filtres.etat === 'proposees' ? sql`e.est_active` : undefined,
      filtres.etat === 'archivees' ? sql`not e.est_active` : undefined,
    ].filter((c) => c !== undefined);
    const ou = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
    const [{ rows }, { rows: comptes }] = await Promise.all([
      this.db.execute<{
        id: string;
        libelle: string;
        slug: string;
        est_active: boolean;
        utilisations: number;
        total: number;
      }>(sql`
        select e.id, e.libelle, e.slug, e.est_active,
          (select count(*) from contenu_etiquette ce where ce.etiquette_id = e.id)::int as utilisations,
          count(*) over ()::int as total
        from etiquette e ${ou}
        order by utilisations desc, e.slug
        limit ${ETIQUETTES_PAR_PAGE} offset ${(filtres.page - 1) * ETIQUETTES_PAR_PAGE}`),
      this.db.execute<{ proposees: number; archivees: number }>(sql`
        select count(*) filter (where est_active)::int as proposees,
          count(*) filter (where not est_active)::int as archivees
        from etiquette`),
    ]);
    const total = rows[0]?.total ?? 0;
    return {
      elements: rows.map(({ est_active, total: _total, ...r }) => ({
        ...r,
        id: Number(r.id),
        active: est_active,
      })),
      total,
      page: filtres.page,
      pages: Math.max(1, Math.ceil(total / ETIQUETTES_PAR_PAGE)),
      proposees: comptes[0]?.proposees ?? 0,
      archivees: comptes[0]?.archivees ?? 0,
    };
  }

  /** CI-04 : archivée, l'étiquette reste sur les contenus qui la portent, sans être proposée ailleurs. */
  async activerEtiquette(
    adminId: number,
    id: number,
    actif: boolean,
  ): Promise<EtiquetteAdministreeApi> {
    const modifie = await this.db
      .update(etiquette)
      .set({ estActive: actif })
      .where(eq(etiquette.id, id))
      .returning({ id: etiquette.id, libelle: etiquette.libelle, slug: etiquette.slug });
    if (!modifie.length) throw introuvable('Cette étiquette est introuvable.');
    await auditer(
      this.db,
      adminId,
      actif ? 'ETIQUETTE_REACTIVEE' : 'ETIQUETTE_ARCHIVEE',
      'etiquette',
      id,
    );
    const { rows } = await this.db.execute<{ utilisations: number }>(
      sql`select count(*)::int as utilisations from contenu_etiquette where etiquette_id = ${id}`,
    );
    return { ...modifie[0]!, active: actif, utilisations: rows[0]?.utilisations ?? 0 };
  }

  /* Badges ----------------------------------------------------------------------- */

  async badges(): Promise<BadgeAdministreApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      code: string;
      libelle: string;
      critere: string;
      categorie: BadgeAdministreApi['categorie'];
      icone: string;
      ton: BadgeAdministreApi['ton'];
      est_actif: boolean;
      obtentions: number;
    }>(sql`
      select b.id, b.code, b.libelle, b.critere, b.categorie, b.icone, b.ton, b.est_actif,
        (select count(*) from obtention_badge ob where ob.badge_id = b.id)::int as obtentions
      from badge b
      order by b.id`);
    return rows.map(({ est_actif, ...r }) => ({ ...r, id: Number(r.id), actif: est_actif }));
  }

  /** Un badge arrêté n'est plus attribué (ni proposé dans les prochains badges du profil). */
  async activerBadge(adminId: number, id: number, actif: boolean): Promise<BadgeAdministreApi> {
    const modifie = await this.db
      .update(badge)
      .set({ estActif: actif })
      .where(eq(badge.id, id))
      .returning({ id: badge.id });
    if (!modifie.length) throw introuvable('Ce badge est introuvable.');
    await auditer(this.db, adminId, actif ? 'BADGE_REPRIS' : 'BADGE_ARRETE', 'badge', id);
    const trouve = (await this.badges()).find((b) => b.id === id);
    if (!trouve) throw introuvable('Ce badge est introuvable.');
    return trouve;
  }
}
