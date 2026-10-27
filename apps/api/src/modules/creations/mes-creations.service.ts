import { Inject, Injectable } from '@nestjs/common';
import {
  conditionsPublication,
  liensMaximum,
  type EtatVisiteur,
  type MaCreationApi,
  type MesCreationsApi,
} from '@vysora/shared';
import { and, count, desc, eq, inArray, min, ne, sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  categorie,
  commentaire,
  contenu,
  creation,
  defi,
  modele,
  mouvementReputation,
  reproduction,
  signalementObsolescence,
  vote,
} from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { lireMasquages } from '../moderation/masquages.js';
import { apercusDesCreations } from './apercus.js';
import { lireAControlerPlusieurs } from './contenu-creation.js';
import { limitePublication } from './limite-publication.js';

/** Membre connecté qui consulte ses créations ; son état décide des liens permis (RG-85, RG-16). */
export interface Proprietaire {
  id: number;
  etat: EtatVisiteur;
}

/* CREA-04 : créations du membre pour « Mes contenus » (EC-15, F-16) : brouillons et créations
   publiées, masquées comprises (RG-30), jamais les supprimées (RG-19). Un brouillon porte ses
   conditions de publication (controlerPublication, RG-10 à RG-16) ; tous portent leurs indicateurs
   (F-33), calculés comme sur la fiche. */
@Injectable()
export class MesCreationsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async lister(membre: Proprietaire, maintenant = new Date()): Promise<MesCreationsApi> {
    const lignes = await this.db
      .select({
        id: creation.id,
        slug: creation.slug,
        type: creation.typeCreation,
        statut: creation.statutPublication,
        statutContenu: contenu.statut,
        titre: creation.titre,
        categorie: { libelle: categorie.libelle, slug: categorie.slug },
        dateCreation: contenu.dateCreation,
        dateModification: contenu.dateModification,
        datePublication: creation.datePublication,
        vues: contenu.nbVues,
        defi: { titre: defi.titre, dateFin: defi.dateFin },
      })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .leftJoin(categorie, eq(categorie.id, creation.categorieId))
      .leftJoin(defi, eq(defi.id, creation.defiId))
      .where(and(eq(contenu.auteurId, membre.id), ne(contenu.statut, 'SUPPRIME')))
      .orderBy(
        desc(sql`coalesce(${contenu.dateModification}, ${contenu.dateCreation})`),
        desc(creation.id),
      );
    const ids = lignes.map((l) => l.id);
    if (!ids.length)
      return { elements: [], publication: await limitePublication(this.db, membre, maintenant) };
    const brouillons = lignes.filter((l) => l.statut === 'BROUILLON').map((l) => l.id);
    const masquees = lignes.filter((l) => l.statutContenu === 'MASQUE').map((l) => l.id);

    const [
      apercus,
      aControler,
      utiles,
      reproductions,
      commentaires,
      obsolescence,
      points,
      limite,
      masquages,
    ] = await Promise.all([
      apercusDesCreations(this.db, this.stockage, lignes),
      lireAControlerPlusieurs(this.db, brouillons),
      this.compter(
        this.db
          .select({ id: vote.contenuId, n: count() })
          .from(vote)
          .where(and(inArray(vote.contenuId, ids), eq(vote.typeVoteCode, 'UTILE')))
          .groupBy(vote.contenuId),
      ),
      this.db
        .select({
          id: reproduction.creationId,
          n: count(),
          reussies:
            sql<number>`count(*) filter (where ${reproduction.resultat} = 'SUCCES')`.mapWith(
              Number,
            ),
        })
        .from(reproduction)
        .innerJoin(contenu, eq(contenu.id, reproduction.id))
        .where(and(inArray(reproduction.creationId, ids), eq(contenu.statut, 'VISIBLE')))
        .groupBy(reproduction.creationId),
      this.compter(
        this.db
          .select({ id: commentaire.creationId, n: count() })
          .from(commentaire)
          .innerJoin(contenu, eq(contenu.id, commentaire.id))
          .where(and(inArray(commentaire.creationId, ids), eq(contenu.statut, 'VISIBLE')))
          .groupBy(commentaire.creationId),
      ),
      this.db
        .select({
          id: signalementObsolescence.contenuId,
          modele: modele.nomCourt,
          membres: count(),
          depuis: min(signalementObsolescence.date),
        })
        .from(signalementObsolescence)
        .innerJoin(modele, eq(modele.id, signalementObsolescence.modeleId))
        .where(inArray(signalementObsolescence.contenuId, ids))
        .groupBy(signalementObsolescence.contenuId, modele.id)
        .orderBy(desc(count()), modele.nomCourt),
      this.pointsLies(membre.id, ids),
      limitePublication(this.db, membre, maintenant),
      lireMasquages(this.db, masquees, false),
    ]);

    const contexte = { liensMaximum: liensMaximum(membre.etat) };
    const elements = lignes.map((l): MaCreationApi => {
      const apercu = apercus.get(l.id);
      const lu = aControler.get(l.id);
      const essais = reproductions.find((r) => r.id === l.id);
      const signale = obsolescence.find((o) => o.id === l.id);
      return {
        id: l.id,
        slug: l.slug,
        type: l.type,
        typeDefini: apercu?.typeDefini ?? false,
        statut: l.statut,
        masquee: l.statutContenu === 'MASQUE',
        masquage: masquages.get(l.id) ?? null,
        titre: l.titre,
        categorie: l.categorie,
        dateCreation: l.dateCreation.toISOString(),
        dateModification: (l.dateModification ?? l.dateCreation).toISOString(),
        datePublication: l.datePublication?.toISOString() ?? null,
        couverture: apercu?.couverture ?? null,
        resultat: apercu?.resultat ?? null,
        apercu: apercu?.apercu ?? null,
        outils: apercu?.outils ?? [],
        defi: l.defi && { titre: l.defi.titre, dateFin: l.defi.dateFin.toISOString() },
        conditions: lu ? conditionsPublication(lu, contexte) : [],
        indicateurs: {
          utiles: utiles.get(l.id) ?? 0,
          reproductions: essais?.n ?? 0,
          reussies: essais?.reussies ?? 0,
          vues: l.vues,
          commentaires: commentaires.get(l.id) ?? 0,
        },
        points: points.get(l.id) ?? 0,
        obsolescence: signale
          ? {
              modele: signale.modele,
              membres: signale.membres,
              depuis: (signale.depuis ?? l.dateCreation).toISOString(),
            }
          : null,
      };
    });
    return { elements, publication: limite };
  }

  private async compter(
    requete: Promise<{ id: number; n: number }[]>,
  ): Promise<Map<number, number>> {
    return new Map((await requete).map((l) => [l.id, l.n]));
  }

  /** RG-19, RG-82 : points reçus par l'auteur pour la création, ses commentaires et ses
      reproductions (annulations déduites) : ceux que sa suppression lui retirerait. */
  private async pointsLies(auteurId: number, ids: number[]): Promise<Map<number, number>> {
    const points = new Map<number, number>();
    const somme = sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int`;
    const duMembre = eq(mouvementReputation.beneficiaireId, auteurId);
    const [directs, parCommentaire, parReproduction] = await Promise.all([
      this.db
        .select({ id: mouvementReputation.contenuId, points: somme })
        .from(mouvementReputation)
        .where(and(duMembre, inArray(mouvementReputation.contenuId, ids)))
        .groupBy(mouvementReputation.contenuId),
      this.db
        .select({ id: commentaire.creationId, points: somme })
        .from(mouvementReputation)
        .innerJoin(commentaire, eq(commentaire.id, mouvementReputation.contenuId))
        .where(and(duMembre, inArray(commentaire.creationId, ids)))
        .groupBy(commentaire.creationId),
      this.db
        .select({ id: reproduction.creationId, points: somme })
        .from(mouvementReputation)
        .innerJoin(reproduction, eq(reproduction.id, mouvementReputation.contenuId))
        .where(and(duMembre, inArray(reproduction.creationId, ids)))
        .groupBy(reproduction.creationId),
    ]);
    for (const ligne of [...directs, ...parCommentaire, ...parReproduction])
      if (ligne.id !== null) points.set(ligne.id, (points.get(ligne.id) ?? 0) + ligne.points);
    for (const [id, total] of points) if (total <= 0) points.delete(id);
    return points;
  }
}
