import { Inject, Injectable } from '@nestjs/common';
import {
  etatSujet,
  niveauPourReputation,
  type CodeNiveau,
  type DifficulteCas,
  type FamilleOutil,
  type IndexRechercheApi,
  type MembreIndexApi,
  type TypeCreation,
  type TypeSujet,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { niveau } from '../../db/schema/index.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { souventCherches, tauxDeReussite } from './chiffres-guides.js';

/** Bornes de l'index : au-delà, la recherche du site passera par l'API (registre, R-02). */
const CREATIONS = 500;
const SUJETS = 300;
const MEMBRES = 200;
const LONGUEUR_EXTRAIT = 280;

type LigneMembre = { pseudo: string; nom_affiche: string | null; avatar: string | null };

const extrait = (texte: string) => {
  const brut = texte
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return brut.length > LONGUEUR_EXTRAIT
    ? `${brut.slice(0, LONGUEUR_EXTRAIT - 1).trimEnd()}…`
    : brut;
};

/* S-11 : recherche de tout le site (loupe de l'en-tête, Ctrl K ; prototype recherche.js). Comme le
   prototype, le navigateur reçoit un index compact et cherche lui-même (texte replié, synonymes,
   fautes de frappe) ; seuls les contenus publiés et visibles de tous y entrent (RG-30), et les
   comptes actifs. */
@Injectable()
export class IndexRechercheService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async index(maintenant = new Date()): Promise<IndexRechercheApi> {
    const [creations, guides, domaines, sujets, cas, outils, defi] = await Promise.all([
      this.creations(),
      this.guides(),
      this.domaines(),
      this.sujets(),
      this.cas(),
      this.outils(),
      this.defi(maintenant),
    ]);
    const membres = await this.membres(creations);
    const parOutil = new Map<string, { creations: number; modeles: Set<string> }>();
    for (const c of creations)
      for (const o of c.outils) {
        const usage = parOutil.get(o.nom) ?? { creations: 0, modeles: new Set<string>() };
        usage.creations += 1;
        for (const m of o.modeles) usage.modeles.add(m);
        parOutil.set(o.nom, usage);
      }
    return {
      creations,
      guides: guides.map(({ parcours: _parcours, ...g }) => g),
      domaines,
      sujets,
      cas,
      membres,
      outils: outils.map((o) => ({
        ...o,
        creations: parOutil.get(o.nom)?.creations ?? 0,
        modeles: [...(parOutil.get(o.nom)?.modeles ?? [])],
      })),
      frequentes: souventCherches(
        guides.map((g) => ({ motsCles: g.motsCles, activite: g.parcours })),
      ),
      defi,
    };
  }

  private membre(ligne: LigneMembre): MembreIndexApi {
    return {
      pseudo: ligne.pseudo,
      nom: ligne.nom_affiche ?? ligne.pseudo,
      avatar: ligne.avatar ? this.stockage.adresse(ligne.avatar) : null,
    };
  }

  private async creations(): Promise<IndexRechercheApi['creations']> {
    const { rows } = await this.db.execute<
      LigneMembre & {
        id: string;
        slug: string;
        type_creation: TypeCreation;
        titre: string;
        objectif: string;
        domaine: string | null;
        etiquettes: string[];
        utiles: number;
        reproductions: number;
        reussites: number;
      }
    >(sql`
      select c.id, cr.slug, cr.type_creation, cr.titre, cr.objectif, cat.libelle as domaine,
        u.pseudo, u.nom_affiche, u.avatar,
        coalesce((select array_agg(e.libelle order by e.libelle) from contenu_etiquette ce
          join etiquette e on e.id = ce.etiquette_id where ce.contenu_id = c.id), '{}') as etiquettes,
        (select count(*) from vote v where v.contenu_id = c.id and v.type_vote_code = 'UTILE')::int
          as utiles,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE')::int as reproductions,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE' and r.resultat = 'SUCCES')::int
          as reussites
      from creation cr
      join contenu c on c.id = cr.id
      join utilisateur u on u.id = c.auteur_id
      left join categorie cat on cat.id = cr.categorie_id
      where c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      order by cr.date_publication desc, c.id desc
      limit ${CREATIONS}`);
    const apercus = await apercusDesCreations(
      this.db,
      this.stockage,
      rows.map((r) => ({ id: Number(r.id), type: r.type_creation })),
    );
    return rows.map((r) => {
      const id = Number(r.id);
      const apercu = apercus.get(id);
      const reproductible = r.type_creation !== 'PROJET';
      return {
        id,
        slug: r.slug,
        type: r.type_creation,
        titre: r.titre,
        objectif: r.objectif,
        domaine: r.domaine,
        etiquettes: r.etiquettes,
        outils: (apercu?.outils ?? []).map((o) => ({ nom: o.outil.nom, modeles: o.modeles })),
        auteur: this.membre(r),
        image: apercu?.couverture ?? null,
        utiles: r.utiles,
        reproductions: reproductible ? r.reproductions : 0,
        tauxReussite: reproductible ? tauxDeReussite(r.reproductions, r.reussites) : null,
      };
    });
  }

  private async guides(): Promise<(IndexRechercheApi['guides'][number] & { parcours: number })[]> {
    const { rows } = await this.db.execute<{
      slug: string;
      titre: string;
      titre_court: string;
      domaine: string;
      mots_cles: string[];
      etapes: string[] | null;
      parcours: number;
    }>(sql`
      select g.slug, g.titre, g.titre_court, cat.libelle as domaine, g.mots_cles,
        (select count(*) from guide_contenu gc where gc.guide_id = g.id)::int as parcours,
        (select array_agg(ge.titre order by ge.ordre) from guide_etape ge where ge.guide_id = g.id)
          as etapes
      from guide g join categorie cat on cat.id = g.categorie_id
      where g.date_publication is not null
      order by g.titre_court`);
    return rows.map((r) => ({
      slug: r.slug,
      titre: r.titre,
      titreCourt: r.titre_court,
      domaine: r.domaine,
      motsCles: r.mots_cles,
      etapes: r.etapes ?? [],
      parcours: r.parcours,
    }));
  }

  private async domaines(): Promise<IndexRechercheApi['domaines']> {
    const { rows } = await this.db.execute<{
      slug: string;
      libelle: string;
      icone: string | null;
      description: string | null;
      creations: number;
    }>(sql`
      select cat.slug, cat.libelle, cat.icone, cat.description,
        (select count(*) from creation cr join contenu c on c.id = cr.id
          where cr.categorie_id = cat.id and c.statut = 'VISIBLE'
          and cr.statut_publication = 'PUBLIEE')::int as creations
      from categorie cat where cat.est_active
      order by cat.ordre_affichage, cat.libelle`);
    return rows;
  }

  private async sujets(): Promise<IndexRechercheApi['sujets']> {
    const { rows } = await this.db.execute<
      LigneMembre & {
        id: string;
        slug: string;
        type: TypeSujet;
        titre: string;
        corps: string;
        ferme: boolean;
        accepte: boolean;
        reponses: number;
        utiles: number;
        outil: string | null;
        modele: string | null;
        etiquettes: string[];
      }
    >(sql`
      select s.id, s.slug, s.type_sujet as type, s.titre, s.corps,
        s.date_fermeture is not null as ferme, s.message_accepte_id is not null as accepte,
        u.pseudo, u.nom_affiche, u.avatar, o.nom as outil,
        coalesce(m.nom_court, s.modele_non_reference) as modele,
        (select count(*) from message mm join contenu mc on mc.id = mm.id
          where mm.sujet_id = s.id and mc.statut = 'VISIBLE')::int as reponses,
        (select count(*) from vote v where v.contenu_id = s.id and v.type_vote_code = 'UTILE')::int
          as utiles,
        coalesce((select array_agg(e.libelle order by e.libelle) from contenu_etiquette ce
          join etiquette e on e.id = ce.etiquette_id where ce.contenu_id = s.id), '{}') as etiquettes
      from sujet s
      join contenu c on c.id = s.id
      join utilisateur u on u.id = c.auteur_id
      left join outil o on o.id = s.outil_id
      left join modele m on m.id = s.modele_id
      where c.statut = 'VISIBLE'
      order by c.date_creation desc, s.id desc
      limit ${SUJETS}`);
    return rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      type: r.type,
      titre: r.titre,
      extrait: extrait(r.corps),
      etat: etatSujet({ ferme: r.ferme, accepte: r.accepte }),
      reponses: r.reponses,
      utiles: r.utiles,
      outil: r.outil,
      modele: r.modele,
      auteur: this.membre(r),
      etiquettes: r.etiquettes,
    }));
  }

  private async cas(): Promise<IndexRechercheApi['cas']> {
    const { rows } = await this.db.execute<{
      id: string;
      slug: string;
      titre: string;
      contexte: string;
      difficulte: DifficulteCas;
      domaine: string | null;
      duree_minutes: number | null;
      reponses: number;
    }>(sql`
      select k.id, k.slug, k.titre, k.contexte, k.difficulte, cat.libelle as domaine,
        k.duree_minutes, (select count(*) from choix_option co where co.cas_id = k.id)::int as reponses
      from cas_bon_reflexe k
      join contenu c on c.id = k.id
      left join categorie cat on cat.id = k.categorie_id
      where c.statut = 'VISIBLE' and k.statut_validation = 'VALIDE'
      order by k.date_examen desc, k.id desc`);
    return rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      titre: r.titre,
      contexte: extrait(r.contexte),
      difficulte: r.difficulte,
      domaine: r.domaine,
      dureeMinutes: r.duree_minutes,
      reponses: r.reponses,
    }));
  }

  /** Membres actifs qui ont publié au moins un contenu visible, les plus réputés d'abord (RG-83). */
  private async membres(
    creations: IndexRechercheApi['creations'],
  ): Promise<IndexRechercheApi['membres']> {
    const [{ rows }, niveaux] = await Promise.all([
      this.db.execute<LigneMembre & { reputation: number; depuis: Date | string }>(sql`
        select u.pseudo, u.nom_affiche, u.avatar, u.date_inscription as depuis,
          greatest(0, coalesce((select sum(mr.points) from mouvement_reputation mr
            where mr.beneficiaire_id = u.id), 0))::int as reputation
        from utilisateur u
        where u.statut_compte = 'ACTIF' and exists (select 1 from contenu c
          where c.auteur_id = u.id and c.statut = 'VISIBLE')
        order by reputation desc, u.pseudo
        limit ${MEMBRES}`),
      this.db.select().from(niveau),
    ]);
    const definitions = niveaux.map((n) => ({ ...n, code: n.code as CodeNiveau }));
    const outilsDe = new Map<string, Map<string, number>>();
    for (const c of creations) {
      const compte = outilsDe.get(c.auteur.pseudo) ?? new Map<string, number>();
      for (const o of c.outils) compte.set(o.nom, (compte.get(o.nom) ?? 0) + 1);
      outilsDe.set(c.auteur.pseudo, compte);
    }
    return rows.map((r) => ({
      ...this.membre(r),
      niveau: niveauPourReputation(r.reputation, definitions).libelle,
      reputation: r.reputation,
      depuis: new Date(r.depuis).toISOString(),
      outils: [...(outilsDe.get(r.pseudo) ?? new Map<string, number>())]
        .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
        .slice(0, 3)
        .map(([nom]) => nom),
    }));
  }

  private async outils() {
    const { rows } = await this.db.execute<{
      nom: string;
      slug: string;
      famille: FamilleOutil;
      logo: string | null;
      logo_monochrome: boolean;
      alias: string[];
    }>(sql`
      select nom, slug, famille, logo, logo_monochrome, alias from outil
      where statut = 'ACTIF' order by nom`);
    return rows.map((r) => ({
      nom: r.nom,
      slug: r.slug,
      famille: r.famille,
      logo: r.logo,
      logoMonochrome: r.logo_monochrome,
      alias: r.alias,
    }));
  }

  private async defi(maintenant: Date): Promise<IndexRechercheApi['defi']> {
    const { rows } = await this.db.execute<{ id: string; slug: string; titre: string }>(sql`
      select id, slug, titre from defi
      where statut = 'PUBLIE' and date_debut <= ${maintenant} and date_fin > ${maintenant}
      order by date_fin asc, id asc
      limit 1`);
    const ligne = rows[0];
    if (!ligne) return null;
    const { rows: participations } = await this.db.execute<{
      id: string;
      type: TypeCreation;
    }>(sql`
      select c.id, cr.type_creation as type
      from creation cr join contenu c on c.id = cr.id
      where cr.defi_id = ${ligne.id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      order by (select count(*) from vote v where v.contenu_id = c.id
        and v.type_vote_code = 'UTILE') desc, c.id desc`);
    const apercus = await apercusDesCreations(
      this.db,
      this.stockage,
      participations.map((p) => ({ id: Number(p.id), type: p.type })),
    );
    return {
      id: Number(ligne.id),
      slug: ligne.slug,
      titre: ligne.titre,
      participations: participations.length,
      image: participations.map((p) => apercus.get(Number(p.id))?.couverture).find(Boolean) ?? null,
    };
  }
}
