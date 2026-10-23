import { Inject, Injectable } from '@nestjs/common';
import type { OutilApi, ReferentielsApi } from '@vysora/shared';
import { asc, eq } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  badge,
  categorie,
  editeur,
  licence,
  modele,
  niveau,
  outil,
  outilModele,
  typeVote,
} from '../../db/schema/index.js';

/* Référentiels publics : seuls les éléments proposés à la saisie (actifs, disponibles) sont renvoyés.
   Les éléments archivés restent lisibles sur les contenus qui les citent (RG-110). */
@Injectable()
export class ReferentielsService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async lister(): Promise<ReferentielsApi> {
    const [outils, propositions, categories, licences, niveaux, badges, typesVote] =
      await Promise.all([
        this.db
          .select({
            id: outil.id,
            nom: outil.nom,
            slug: outil.slug,
            famille: outil.famille,
            type: outil.type,
            editeur: editeur.nom,
            logo: outil.logo,
            logoMonochrome: outil.logoMonochrome,
            alias: outil.alias,
            estAgent: outil.estAgent,
          })
          .from(outil)
          .innerJoin(editeur, eq(editeur.id, outil.editeurId))
          .where(eq(outil.statut, 'ACTIF'))
          .orderBy(asc(outil.id)),
        this.db
          .select({
            outilId: outilModele.outilId,
            id: modele.id,
            nom: modele.nom,
            nomCourt: modele.nomCourt,
          })
          .from(outilModele)
          .innerJoin(modele, eq(modele.id, outilModele.modeleId))
          .where(eq(modele.statut, 'DISPONIBLE'))
          .orderBy(asc(outilModele.outilId), asc(outilModele.ordre)),
        this.db
          .select({
            id: categorie.id,
            libelle: categorie.libelle,
            slug: categorie.slug,
            icone: categorie.icone,
          })
          .from(categorie)
          .where(eq(categorie.estActive, true))
          .orderBy(asc(categorie.ordreAffichage)),
        this.db
          .select({
            id: licence.id,
            code: licence.code,
            libelle: licence.libelle,
            resume: licence.resume,
            url: licence.url,
            autoriseVariantes: licence.autoriseVariantes,
            estParDefaut: licence.estParDefaut,
          })
          .from(licence)
          .where(eq(licence.estActive, true))
          .orderBy(asc(licence.ordreAffichage)),
        this.db
          .select({
            rang: niveau.rang,
            code: niveau.code,
            libelle: niveau.libelle,
            seuilPoints: niveau.seuilPoints,
          })
          .from(niveau)
          .orderBy(asc(niveau.rang)),
        this.db
          .select({
            code: badge.code,
            libelle: badge.libelle,
            critere: badge.critere,
            categorie: badge.categorie,
            icone: badge.icone,
            ton: badge.ton,
          })
          .from(badge)
          .where(eq(badge.estActif, true))
          .orderBy(asc(badge.id)),
        this.db.select({ code: typeVote.code, libelle: typeVote.libelle }).from(typeVote),
      ]);

    const modelesParOutil = new Map<number, OutilApi['modeles']>();
    for (const { outilId, ...m } of propositions) {
      modelesParOutil.set(outilId, [...(modelesParOutil.get(outilId) ?? []), m]);
    }

    return {
      outils: outils.map((o) => ({ ...o, modeles: modelesParOutil.get(o.id) ?? [] })),
      categories,
      licences,
      niveaux,
      badges,
      typesVote: typesVote as ReferentielsApi['typesVote'],
    };
  }
}
