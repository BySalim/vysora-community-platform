import { Inject, Injectable } from '@nestjs/common';
import {
  SEUILS,
  type CommentaireApi,
  type ConfigurationIaApi,
  type CreationFicheApi,
  type EssaisParConfigurationApi,
  type MediaApi,
  type MembreResumeApi,
  type OutilResumeApi,
  type Role,
} from '@vysora/shared';
import { and, asc, count, desc, eq, min, or } from 'drizzle-orm';
import { introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  categorie,
  commentaire,
  configurationIa,
  contenu,
  contenuEtiquette,
  creation,
  defi,
  echange,
  enregistrement,
  etape,
  etiquette,
  licence,
  lienExterne,
  media,
  modele,
  momentCle,
  outil,
  reproduction,
  signalementObsolescence,
  vote,
} from '../../db/schema/index.js';
import { presenterMedia } from '../medias/medias.service.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/** Personne qui consulte une fiche : membre connecté, ou visiteur (null). */
export interface Lecteur {
  id: number;
  role: Role;
}

interface CommentaireLu {
  id: number;
  parentId: number | null;
  corps: string | null;
  auteurId: number | null;
  date: Date;
  dateModification: Date | null;
  supprime: boolean;
}

/** Commentaires renvoyés avec la fiche ; la pagination viendra avec INT-03. */
const COMMENTAIRES_MAXIMUM = 200;
const RETOURS_MAXIMUM = 6;

const colonnesOutil = {
  id: outil.id,
  nom: outil.nom,
  slug: outil.slug,
  logo: outil.logo,
  logoMonochrome: outil.logoMonochrome,
};
const colonnesModele = { id: modele.id, nom: modele.nom, nomCourt: modele.nomCourt };

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

/* CREA-01 : lecture d'une création, telle que la fiche l'affiche (F-23).
   RG-30 : une création publiée et visible se lit par tous ; un brouillon, seulement par son auteur ;
   une création masquée par la modération, par son auteur (avec une mention) et par la modération.
   Une création supprimée n'existe plus pour personne. RG-17 : les commentaires et les reproductions
   d'une création qui n'est pas publiée ne sont pas présentés. */
@Injectable()
export class CreationsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async fiche(id: number, lecteur: Lecteur | null): Promise<CreationFicheApi> {
    const [ligne] = await this.db
      .select({
        creation,
        auteurId: contenu.auteurId,
        statutContenu: contenu.statut,
        dateCreation: contenu.dateCreation,
        dateModification: contenu.dateModification,
        vues: contenu.nbVues,
        categorie: {
          id: categorie.id,
          libelle: categorie.libelle,
          slug: categorie.slug,
          icone: categorie.icone,
        },
        licence: {
          code: licence.code,
          libelle: licence.libelle,
          url: licence.url,
          autoriseVariantes: licence.autoriseVariantes,
        },
        defi: { id: defi.id, slug: defi.slug, titre: defi.titre },
      })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .innerJoin(licence, eq(licence.id, creation.licenceId))
      .leftJoin(categorie, eq(categorie.id, creation.categorieId))
      .leftJoin(defi, eq(defi.id, creation.defiId))
      .where(eq(creation.id, id));

    const auteur = lecteur !== null && ligne?.auteurId === lecteur.id;
    const moderation = lecteur !== null && lecteur.role !== 'MEMBRE';
    const visible =
      ligne &&
      ligne.statutContenu !== 'SUPPRIME' &&
      (ligne.creation.statutPublication === 'PUBLIEE' || auteur) &&
      (ligne.statutContenu === 'VISIBLE' || auteur || moderation);
    // Ce qu'une personne ne peut pas voir n'existe pas pour elle : même réponse qu'une création inconnue.
    if (!ligne || !visible) throw introuvable('Cette création est introuvable.');

    const publiee = ligne.creation.statutPublication === 'PUBLIEE';
    const [
      etiquettes,
      etapes,
      configurations,
      echanges,
      moments,
      liens,
      images,
      [utiles],
      reproductions,
      obsolescence,
      commentaires,
      moi,
    ] = await Promise.all([
      this.db
        .select({ libelle: etiquette.libelle, slug: etiquette.slug })
        .from(contenuEtiquette)
        .innerJoin(etiquette, eq(etiquette.id, contenuEtiquette.etiquetteId))
        .where(eq(contenuEtiquette.contenuId, id))
        .orderBy(asc(etiquette.libelle)),
      this.db.select().from(etape).where(eq(etape.creationId, id)).orderBy(asc(etape.ordre)),
      this.db
        .select({ configuration: configurationIa, outil: colonnesOutil, modele: colonnesModele })
        .from(configurationIa)
        .innerJoin(etape, eq(etape.id, configurationIa.etapeId))
        .leftJoin(outil, eq(outil.id, configurationIa.outilId))
        .leftJoin(modele, eq(modele.id, configurationIa.modeleId))
        .where(eq(etape.creationId, id))
        .orderBy(asc(configurationIa.ordre), asc(configurationIa.id)),
      this.db
        .select({ echange })
        .from(echange)
        .innerJoin(etape, eq(etape.id, echange.etapeId))
        .where(eq(etape.creationId, id))
        .orderBy(asc(echange.ordre)),
      this.db
        .select({ moment: momentCle })
        .from(momentCle)
        .innerJoin(etape, eq(etape.id, momentCle.etapeId))
        .where(eq(etape.creationId, id))
        .orderBy(asc(momentCle.id)),
      this.db
        .select({ type: lienExterne.type, url: lienExterne.url, libelle: lienExterne.libelle })
        .from(lienExterne)
        .where(eq(lienExterne.creationId, id))
        .orderBy(asc(lienExterne.ordre), asc(lienExterne.id)),
      this.db
        .select({ media })
        .from(media)
        .leftJoin(echange, eq(echange.id, media.echangeId))
        .leftJoin(etape, eq(etape.id, echange.etapeId))
        .where(or(eq(media.contenuId, id), eq(etape.creationId, id)))
        .orderBy(asc(media.ordre), asc(media.id)),
      this.db
        .select({ n: count() })
        .from(vote)
        .where(and(eq(vote.contenuId, id), eq(vote.typeVoteCode, 'UTILE'))),
      publiee ? this.reproductions(id) : Promise.resolve([]),
      this.db
        .select({
          modele: colonnesModele,
          membres: count(),
          depuis: min(signalementObsolescence.date),
        })
        .from(signalementObsolescence)
        .innerJoin(modele, eq(modele.id, signalementObsolescence.modeleId))
        .where(eq(signalementObsolescence.contenuId, id))
        .groupBy(modele.id)
        .orderBy(desc(count())),
      publiee ? this.commentaires(id) : Promise.resolve([]),
      lecteur ? this.relationDuLecteur(id, lecteur.id) : Promise.resolve(null),
    ]);

    const membres = await resumerMembres(this.db, this.stockage, [
      ligne.auteurId,
      ...reproductions.map((r) => r.auteurId),
      ...commentaires.flatMap((c) => (c.auteurId === null ? [] : [c.auteurId])),
    ]);
    const membre = (membreId: number): MembreResumeApi => {
      const resume = membres.get(membreId);
      if (!resume) throw new Error(`Membre introuvable : ${membreId}`);
      return resume;
    };

    const imagesParEchange = new Map<number, MediaApi[]>();
    const imagesDeLaCreation: MediaApi[] = [];
    for (const { media: image } of images) {
      const presentee = presenterMedia(this.stockage, image);
      if (image.echangeId === null) imagesDeLaCreation.push(presentee);
      else
        imagesParEchange.set(image.echangeId, [
          ...(imagesParEchange.get(image.echangeId) ?? []),
          presentee,
        ]);
    }

    const reussies = reproductions.filter((r) => r.resultat === 'SUCCES');
    const c = ligne.creation;
    return {
      id: c.id,
      slug: c.slug,
      type: c.typeCreation,
      statut: c.statutPublication,
      masquee: ligne.statutContenu === 'MASQUE',
      titre: c.titre,
      objectif: c.objectif,
      limites: c.limites,
      dateCreation: ligne.dateCreation.toISOString(),
      datePublication: iso(c.datePublication),
      dateModification: iso(ligne.dateModification),
      auteur: membre(ligne.auteurId),
      categorie: ligne.categorie,
      licence: ligne.licence,
      etiquettes,
      avertissementAgent: c.avertissementAgent,
      defi: ligne.defi,
      images: imagesDeLaCreation,
      resultat:
        c.resultatTexte && c.resultatNature
          ? { nature: c.resultatNature, texte: c.resultatTexte, nom: c.resultatNom }
          : null,
      liens,
      etapes: etapes.map((e) => ({
        id: e.id,
        ordre: e.ordre,
        titre: e.titre,
        recit: e.recit,
        configurations: configurations
          .filter((l) => l.configuration.etapeId === e.id)
          .map((l): ConfigurationIaApi => ({
            id: l.configuration.id,
            outil: l.outil,
            modele: l.modele,
            modeleNonReference: l.configuration.modeleNonReference,
            parametres: l.configuration.parametres,
            contexteCache: l.configuration.contexteCache,
          })),
        echanges: echanges
          .filter((l) => l.echange.etapeId === e.id)
          .map(({ echange: x }) => ({
            id: x.id,
            ordre: x.ordre,
            prompt: x.prompt,
            reponse: x.reponse,
            nbEssais: x.nbEssais,
            modeSelection: x.modeSelection,
            configurationId: x.configurationId,
            images: imagesParEchange.get(x.id) ?? [],
          })),
        moments: moments
          .filter((l) => l.moment.etapeId === e.id)
          .map(({ moment: m }) => ({
            id: m.id,
            type: m.type,
            explication: m.explication,
            echangeId: m.echangeId,
          })),
      })),
      preuve: {
        utiles: utiles?.n ?? 0,
        vues: ligne.vues,
        reproductions: {
          total: reproductions.length,
          reussies: reussies.length,
          // RG-43 : taux affiché à partir de 3 reproductions visibles.
          tauxSucces:
            reproductions.length >= SEUILS.reproductionsPourTauxDeSucces
              ? Math.round((reussies.length / reproductions.length) * 100)
              : null,
          derniere: iso(reproductions[0]?.date ?? null),
          modelesReussis: [
            ...new Set(reussies.flatMap((r) => (r.modele === null ? [] : [r.modele]))),
          ],
          parConfiguration: essaisParConfiguration(reproductions),
        },
        obsolescence: obsolescence.map((o) => ({
          ...o,
          depuis: (o.depuis ?? ligne.dateCreation).toISOString(),
        })),
      },
      retours: reproductions
        .filter((r) => r.retour)
        .slice(0, RETOURS_MAXIMUM)
        .map((r) => ({
          id: r.id,
          auteur: membre(r.auteurId),
          date: r.date.toISOString(),
          resultat: r.resultat,
          outil: r.outil,
          modele: r.modele,
          retour: r.retour,
        })),
      commentaires: {
        total: commentaires.filter((x) => !x.supprime).length,
        elements: commentaires.slice(0, COMMENTAIRES_MAXIMUM).map((x): CommentaireApi => ({
          id: x.id,
          parentId: x.parentId,
          auteur: x.auteurId === null ? null : membre(x.auteurId),
          date: x.date.toISOString(),
          dateModification: iso(x.dateModification),
          corps: x.corps,
          supprime: x.supprime,
        })),
      },
      moi: moi && { auteur, ...moi },
    };
  }

  /** Reproductions visibles, de la plus récente à la plus ancienne. */
  private async reproductions(creationId: number) {
    const lignes = await this.db
      .select({
        id: reproduction.id,
        auteurId: contenu.auteurId,
        date: contenu.dateCreation,
        resultat: reproduction.resultat,
        retour: reproduction.retour,
        outil: colonnesOutil,
        modeleId: reproduction.modeleId,
        modele: modele.nomCourt,
        modeleNonReference: reproduction.modeleNonReference,
      })
      .from(reproduction)
      .innerJoin(contenu, eq(contenu.id, reproduction.id))
      .innerJoin(outil, eq(outil.id, reproduction.outilId))
      .leftJoin(modele, eq(modele.id, reproduction.modeleId))
      .where(and(eq(reproduction.creationId, creationId), eq(contenu.statut, 'VISIBLE')))
      .orderBy(desc(contenu.dateCreation), desc(reproduction.id));
    return lignes.map(({ modeleNonReference, ...r }) => ({
      ...r,
      modele: r.modele ?? modeleNonReference,
    }));
  }

  /** RG-51 : un commentaire retiré (supprimé ou masqué) ne reste, sans texte, que s'il a des réponses. */
  private async commentaires(creationId: number): Promise<CommentaireLu[]> {
    const lignes = await this.db
      .select({
        id: commentaire.id,
        parentId: commentaire.parentId,
        corps: commentaire.corps,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        date: contenu.dateCreation,
        dateModification: contenu.dateModification,
      })
      .from(commentaire)
      .innerJoin(contenu, eq(contenu.id, commentaire.id))
      .where(eq(commentaire.creationId, creationId))
      .orderBy(asc(contenu.dateCreation), asc(commentaire.id));
    const visibles = lignes.filter((l) => l.statut === 'VISIBLE');
    const parents = new Set(visibles.map((l) => l.parentId));
    return lignes.flatMap(({ statut, ...l }): CommentaireLu[] => {
      if (statut === 'VISIBLE') return [{ ...l, supprime: false }];
      if (!parents.has(l.id)) return [];
      return [{ ...l, corps: null, auteurId: null, dateModification: null, supprime: true }];
    });
  }

  private async relationDuLecteur(
    contenuId: number,
    membreId: number,
  ): Promise<{ utile: boolean; enregistree: boolean }> {
    const [utile, enregistree] = await Promise.all([
      this.db.$count(
        vote,
        and(
          eq(vote.contenuId, contenuId),
          eq(vote.votantId, membreId),
          eq(vote.typeVoteCode, 'UTILE'),
        ),
      ),
      this.db.$count(
        enregistrement,
        and(eq(enregistrement.contenuId, contenuId), eq(enregistrement.utilisateurId, membreId)),
      ),
    ]);
    return { utile: utile > 0, enregistree: enregistree > 0 };
  }
}

/** Essais et réussites par outil et modèle, du plus essayé au moins essayé. */
function essaisParConfiguration(
  reproductions: {
    outil: OutilResumeApi;
    modeleId: number | null;
    modele: string | null;
    resultat: string;
  }[],
): EssaisParConfigurationApi[] {
  const groupes = new Map<string, EssaisParConfigurationApi>();
  for (const r of reproductions) {
    const cle = `${r.outil.id}\u0000${r.modeleId ?? ''}\u0000${r.modele ?? ''}`;
    const groupe = groupes.get(cle) ?? {
      outil: r.outil,
      modeleId: r.modeleId,
      modele: r.modele,
      essais: 0,
      reussis: 0,
    };
    groupe.essais += 1;
    if (r.resultat === 'SUCCES') groupe.reussis += 1;
    groupes.set(cle, groupe);
  }
  return [...groupes.values()].toSorted((a, b) => b.essais - a.essais || b.reussis - a.reussis);
}
