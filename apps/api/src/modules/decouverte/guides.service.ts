import { Inject, Injectable } from '@nestjs/common';
import {
  MOTIF_SLUG_GUIDE,
  type CasGuideApi,
  type GuideApi,
  type GuideResumeApi,
  type GuidesApi,
  type MembreResumeApi,
  type ParcoursGuideApi,
} from '@vysora/shared';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { ErreurApplication, introuvable } from '../../commun/erreurs.js';
import { CasService } from '../apprentissage/cas.service.js';
import { corriger, optionsDes } from '../apprentissage/contenu-cas.js';
import type { Lecteur } from '../creations/creations.service.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import {
  chiffresDu,
  derniereReussite,
  guidesProches,
  souventCherches,
  tauxDeReussite,
  texteRecherche,
  type ChiffresGuide,
  type GuideLu,
  type ParcoursLu,
} from './chiffres-guides.js';
import {
  lireDemandes,
  lireDeroulements,
  lireDomaines,
  lireGuides,
  lireListe,
  lireParcours,
  lirePropositions,
  lireSujets,
  type DeroulementLu,
} from './donnees-guides.js';

const iso = (date: Date | null) => date?.toISOString() ?? null;

interface Ensemble {
  guides: GuideLu[];
  chiffres: Map<number, ChiffresGuide>;
  membres: Map<number, MembreResumeApi>;
}

/* DEC-01 : guides d'Explorer (prototype explorer.html, explorer-modele.js). L'index présente les
   guides publiés avec leurs chiffres, les domaines, ce que la communauté cherche encore ; un guide
   présente en plus sa méthode, ses pièges, ses modèles, ses parcours, ses cas et ses questions. */
@Injectable()
export class GuidesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly lectureCas: CasService,
  ) {}

  /** GET /api/v1/guides */
  async index(membreId: number | null, maintenant = new Date()): Promise<GuidesApi> {
    const [ensemble, domaines, demandes] = await Promise.all([
      this.charger(maintenant),
      lireDomaines(this.db),
      lireDemandes(this.db, membreId, maintenant),
    ]);
    const { guides, chiffres } = ensemble;
    const elements = guides
      .map((g) => this.resumer(g, ensemble))
      .toSorted((a, b) => b.activite - a.activite || a.titre.localeCompare(b.titre, 'fr'));
    const parcours = new Map<number, ParcoursLu>();
    for (const c of chiffres.values()) for (const p of c.parcours) parcours.set(p.id, p);
    return {
      elements,
      domaines,
      totaux: {
        parcours: parcours.size,
        reproductions: [...parcours.values()]
          .filter((p) => p.type !== 'PROJET')
          .reduce((n, p) => n + p.reproductions.length, 0),
      },
      souventCherches: souventCherches(
        guides.map((g) => ({ motsCles: g.motsCles, activite: chiffres.get(g.id)?.activite ?? 0 })),
      ),
      demandes,
    };
  }

  /** GET /api/v1/guides/:slug */
  async guide(slug: string, lecteur: Lecteur | null, maintenant = new Date()): Promise<GuideApi> {
    if (!MOTIF_SLUG_GUIDE.test(slug)) throw introuvable('Ce guide est introuvable.');
    const ensemble = await this.charger(maintenant);
    const g = ensemble.guides.find((x) => x.slug === slug);
    if (!g) throw introuvable('Ce guide est introuvable.');
    const c = this.chiffresDe(g, ensemble);
    const visibles = new Set(c.parcours.map((p) => p.id));

    const sujetsDesPieges = c.pieges.flatMap((p) => (p.sujetId === null ? [] : [p.sujetId]));
    const [deroulements, sujets, discussions, cas, moi] = await Promise.all([
      lireDeroulements(
        this.db,
        c.parcours.map((p) => p.id),
      ),
      lireSujets(this.db, g.sujets),
      lireSujets(this.db, sujetsDesPieges),
      this.cas(g.cas, lecteur),
      lecteur
        ? Promise.all([
            lireListe(this.db, lecteur.id, g),
            lirePropositions(this.db, lecteur.id, g.id),
          ])
        : null,
    ]);
    const auteursSujets = await resumerMembres(
      this.db,
      this.stockage,
      sujets.map((s) => s.auteurId),
    );
    const casVisibles = new Set(cas.map((x) => x.id));
    const outils = (x: ChiffresGuide) => new Set(x.modeles.map((m) => m.outil.slug));
    const proches = guidesProches(
      { id: g.id, domaine: g.domaine.slug, outils: outils(c), activite: c.activite },
      ensemble.guides.map((o) => {
        const co = this.chiffresDe(o, ensemble);
        return { id: o.id, domaine: o.domaine.slug, outils: outils(co), activite: co.activite };
      }),
    );

    return {
      guide: this.resumer(g, ensemble),
      lacunes: g.lacunes,
      methode: g.etapes.map((e) => ({
        id: e.id,
        titre: e.titre,
        conseil: e.conseil,
        sources: e.sources.filter((id) => visibles.has(id)),
        citation:
          e.citation && visibles.has(e.citation.creationId)
            ? { parcoursId: e.citation.creationId, texte: e.citation.texte }
            : null,
      })),
      pieges: c.pieges.map((p) => {
        const discussion = discussions.find((s) => s.id === p.sujetId);
        return {
          id: p.id,
          titre: p.titre,
          solution: p.solution,
          sources: p.sources,
          etapeId: p.etapeId,
          sujet: discussion
            ? { id: discussion.id, slug: discussion.slug, titre: discussion.titre }
            : null,
          casId: p.casId !== null && casVisibles.has(p.casId) ? p.casId : null,
        };
      }),
      modeles: c.modeles,
      parcours: c.parcours.map((p) =>
        this.presenterParcours(p, deroulements.get(p.id), ensemble.membres),
      ),
      cas,
      sujets: sujets.flatMap((s) => {
        const auteur = auteursSujets.get(s.auteurId);
        return auteur
          ? [
              {
                id: s.id,
                slug: s.slug,
                type: s.type,
                titre: s.titre,
                etat: s.etat,
                reponses: s.reponses,
                auteur,
              },
            ]
          : [];
      }),
      voisins: proches.flatMap((o) => {
        const voisin = ensemble.guides.find((x) => x.id === o.id);
        return voisin ? [this.resumer(voisin, ensemble)] : [];
      }),
      autres: ensemble.guides.map((o) => ({
        slug: o.slug,
        titreCourt: o.titreCourt,
        icone: o.domaine.icone,
        parcours: this.chiffresDe(o, ensemble).parcours.length,
      })),
      moi: moi && { liste: moi[0], propositions: moi[1] },
    };
  }

  /** Guides publiés, leurs parcours et leurs chiffres, et les auteurs de ces parcours. */
  private async charger(maintenant: Date): Promise<Ensemble> {
    const guides = await lireGuides(this.db);
    const parcours = await lireParcours(
      this.db,
      this.stockage,
      [...new Set(guides.flatMap((g) => g.parcours))],
      maintenant,
    );
    const chiffres = new Map(guides.map((g) => [g.id, chiffresDu(g, parcours)]));
    const membres = await resumerMembres(
      this.db,
      this.stockage,
      [...chiffres.values()].flatMap((c) => c.auteurs),
    );
    return { guides, chiffres, membres };
  }

  private chiffresDe(g: GuideLu, ensemble: Ensemble): ChiffresGuide {
    const c = ensemble.chiffres.get(g.id);
    if (!c) throw new Error(`Chiffres du guide introuvables : ${g.id}`);
    return c;
  }

  private resumer(g: GuideLu, ensemble: Ensemble): GuideResumeApi {
    const c = this.chiffresDe(g, ensemble);
    const principal = c.pieges[0];
    return {
      id: g.id,
      slug: g.slug,
      titre: g.titre,
      titreCourt: g.titreCourt,
      motsCles: g.motsCles,
      domaine: g.domaine,
      domaines: c.domaines,
      parcours: c.parcours.length,
      reproductions: c.reproductions,
      tauxReussite: c.tauxReussite,
      activite: c.activite,
      recent: iso(c.recent),
      miseAJour: iso(c.miseAJour),
      derniereReussite: c.derniereReussite && {
        date: c.derniereReussite.date.toISOString(),
        modele: c.derniereReussite.modele,
      },
      auteurs: c.auteurs.flatMap((id) => ensemble.membres.get(id) ?? []),
      etapes: c.etapes,
      piegePrincipal: principal
        ? { titre: principal.titre, signale: principal.sources.length, etapeId: principal.etapeId }
        : null,
      pieges: c.pieges.length,
      obsolescence: c.obsolescence,
      modeles: c.modeles.map((m) => ({ cle: m.cle, outil: m.outil.slug })),
      vignettes: c.parcours.flatMap((p) => p.couverture ?? []).slice(0, 3),
      texteRecherche: texteRecherche(g, c),
    };
  }

  private presenterParcours(
    p: ParcoursLu,
    deroulement: DeroulementLu | undefined,
    membres: Map<number, MembreResumeApi>,
  ): ParcoursGuideApi {
    const auteur = membres.get(p.auteurId);
    if (!auteur) throw new Error(`Membre introuvable : ${p.auteurId}`);
    // Chaque couple outil et modèle une fois, dans l'ordre du parcours (prototype : c.tools).
    const outils: ParcoursGuideApi['outils'] = [];
    for (const conf of p.configurations) {
      const modele = conf.modeleCourt ?? conf.modeleTexte;
      if (!outils.some((o) => o.outil.id === conf.outil.id && o.modele === modele))
        outils.push({ outil: conf.outil, modele });
    }
    const reussies = p.reproductions.filter((r) => r.resultat === 'SUCCES').length;
    const derniere = derniereReussite(p);
    return {
      id: p.id,
      slug: p.slug,
      type: p.type,
      titre: p.titre,
      objectif: p.objectif,
      categorie: p.categorie?.libelle ?? null,
      auteur,
      outils,
      couverture: p.couverture,
      etapes: deroulement?.etapes ?? [],
      echanges: deroulement?.echanges ?? 0,
      essais: deroulement?.essais ?? 1,
      moments: deroulement?.moments ?? [],
      prompt: p.prompt,
      datePublication: p.datePublication.toISOString(),
      utiles: p.utiles,
      reproductions: {
        total: p.reproductions.length,
        reussies,
        tauxReussite: tauxDeReussite(p.reproductions.length, reussies),
      },
      derniereReussite: derniere && { date: derniere.date.toISOString(), modele: derniere.modele },
      obsolescence: p.obsolescence,
    };
  }

  /** Cas du guide, validés et visibles, tels que la personne les voit (correction après sa réponse). */
  private async cas(ids: number[], lecteur: Lecteur | null): Promise<CasGuideApi[]> {
    const [lus, options] = await Promise.all([
      Promise.all(
        ids.map((id) =>
          this.lectureCas.cas(id, lecteur).catch((erreur: unknown) => {
            // Masqué ou retiré entre-temps : le cas n'est plus présenté.
            if (erreur instanceof ErreurApplication && erreur.code === 'INTROUVABLE') return null;
            throw erreur;
          }),
        ),
      ),
      optionsDes(this.db, ids),
    ]);
    return lus.flatMap((c) => {
      if (!c) return [];
      // La part des bonnes réponses se montre avant de répondre (prototype : « 74 % de bonnes réponses »).
      const { reponses, reussite } = corriger('', options.get(c.id) ?? []);
      return [{ ...c, reponses, reussite }];
    });
  }
}
