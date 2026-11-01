import { Inject, Injectable } from '@nestjs/common';
import {
  peutExaminerCas,
  type ApprentissageApi,
  type CasApi,
  type MembreResumeApi,
  type MesCasApi,
} from '@vysora/shared';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  casBonReflexe,
  choixOption,
  contenu,
  enregistrement,
  modele,
  optionReponse,
  outil,
  signalement,
  vote,
} from '../../db/schema/index.js';
import type { Lecteur } from '../creations/creations.service.js';
import { etiquettesDes } from '../forum/contenu-sujet.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { lireMasquages } from '../moderation/masquages.js';
import { corriger, domainesDes, optionsDes } from './contenu-cas.js';

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

/** Condition SQL d'un cas visible de tous (alias « cb » et « c »). */
export const CAS_PUBLIC = sql`c.statut = 'VISIBLE' and cb.statut_validation = 'VALIDE'`;

/* APP-01 : lecture d'un cas Bon réflexe (EC-10, F-62), cas de leur auteur et statistiques de
   l'apprenant (RG-88).
   RG-30 : un cas validé et visible se lit par tous ; proposé, refusé ou masqué, par son auteur et par
   la modération ; supprimé, par personne. La correction (bonne option, explications, répartition)
   n'est donnée qu'après la réponse de la personne, et toujours à l'auteur et à la modération. */
@Injectable()
export class CasService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async cas(id: number, lecteur: Lecteur | null): Promise<CasApi> {
    const [ligne] = await this.db
      .select({
        cas: casBonReflexe,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        dateCreation: contenu.dateCreation,
        dateModification: contenu.dateModification,
        outil: {
          id: outil.id,
          nom: outil.nom,
          slug: outil.slug,
          logo: outil.logo,
          logoMonochrome: outil.logoMonochrome,
        },
        modele: { id: modele.id, nom: modele.nom, nomCourt: modele.nomCourt },
      })
      .from(casBonReflexe)
      .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
      .leftJoin(outil, eq(outil.id, casBonReflexe.outilId))
      .leftJoin(modele, eq(modele.id, casBonReflexe.modeleId))
      .where(eq(casBonReflexe.id, id));
    const auteur = lecteur !== null && ligne?.auteurId === lecteur.id;
    const moderation = lecteur !== null && lecteur.role !== 'MEMBRE';
    const visible = ligne?.statut === 'VISIBLE' && ligne.cas.statutValidation === 'VALIDE';
    // Ce qu'une personne ne peut pas voir n'existe pas pour elle : même réponse qu'un cas inconnu.
    if (!ligne || ligne.statut === 'SUPPRIME' || (!visible && !auteur && !moderation))
      throw introuvable('Ce cas est introuvable.');

    const masquee = ligne.statut === 'MASQUE';
    const [domaines, [options, etiquettes, utiles, moi, masquages, position, membres]] =
      await Promise.all([
        domainesDes(this.db, [id]),
        Promise.all([
          optionsDes(this.db, [id]).then((parCas) => parCas.get(id) ?? []),
          etiquettesDes(this.db, [id]),
          this.db.$count(vote, and(eq(vote.contenuId, id), eq(vote.typeVoteCode, 'UTILE'))),
          lecteur ? this.relation(lecteur.id, id) : null,
          lireMasquages(this.db, masquee ? [id] : [], moderation),
          visible ? this.position(id) : null,
          resumerMembres(this.db, this.stockage, [
            ligne.auteurId,
            ...(moderation && ligne.cas.examinateurId ? [ligne.cas.examinateurId] : []),
          ]),
        ]),
      ]);
    const membre = (membreId: number): MembreResumeApi => {
      const resume = membres.get(membreId);
      if (!resume) throw new Error(`Membre introuvable : ${membreId}`);
      return resume;
    };
    const reponse = moi?.reponse ?? null;
    const { cas } = ligne;

    return {
      id,
      slug: cas.slug,
      titre: cas.titre,
      contexte: cas.contexte,
      demandeIa: cas.demandeIa,
      reponseIa: cas.reponseIa,
      question: cas.question,
      difficulte: cas.difficulte,
      domaine: domaines.get(id)?.domaine ?? null,
      dureeMinutes: domaines.get(id)?.dureeMinutes ?? null,
      outil: ligne.outil,
      modele: ligne.modele,
      modeleNonReference: cas.modeleNonReference,
      etiquettes: etiquettes.get(id) ?? [],
      auteur: membre(ligne.auteurId),
      dateCreation: ligne.dateCreation.toISOString(),
      dateModification: iso(ligne.dateModification),
      statut: cas.statutValidation,
      dateValidation: cas.statutValidation === 'VALIDE' ? iso(cas.dateExamen) : null,
      // L'auteur apprend la décision et son motif, pas qui l'a prise.
      examen:
        (auteur || moderation) && cas.dateExamen
          ? {
              date: cas.dateExamen.toISOString(),
              par: moderation && cas.examinateurId ? membre(cas.examinateurId) : null,
              motif: cas.motifRefus,
            }
          : null,
      options: options.map((o) => ({ id: o.id, libelle: o.libelle })),
      correction: reponse || auteur || moderation ? corriger(cas.explication, options) : null,
      utiles,
      position,
      masquee,
      masquage: masquages.get(id) ?? null,
      moi: moi && {
        auteur,
        reponse: reponse && {
          optionId: reponse.optionId,
          correcte: options.find((o) => o.id === reponse.optionId)?.correcte ?? false,
          date: reponse.date.toISOString(),
        },
        utile: moi.utile,
        enregistre: moi.enregistre,
        signalementOuvert: moi.signalementOuvert,
        peutExaminer:
          cas.statutValidation === 'PROPOSE' && !masquee && peutExaminerCas({ auteur, moderation }),
      },
    };
  }

  /** Cas de l'auteur, quel que soit leur statut (supprimés exclus), du plus récemment modifié au
      plus ancien ; motif d'un refus (EC-11). */
  async mesCas(auteurId: number): Promise<MesCasApi> {
    const lignes = await this.db
      .select({
        id: casBonReflexe.id,
        slug: casBonReflexe.slug,
        titre: casBonReflexe.titre,
        difficulte: casBonReflexe.difficulte,
        statut: casBonReflexe.statutValidation,
        dateExamen: casBonReflexe.dateExamen,
        motifRefus: casBonReflexe.motifRefus,
        statutContenu: contenu.statut,
        dateCreation: contenu.dateCreation,
        dateModification: contenu.dateModification,
        reponses: sql<number>`(select count(*) from choix_option ch where ch.cas_id = ${casBonReflexe.id})::int`,
        utiles: sql<number>`(select count(*) from vote v where v.contenu_id = ${casBonReflexe.id} and v.type_vote_code = 'UTILE')::int`,
      })
      .from(casBonReflexe)
      .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
      .where(and(eq(contenu.auteurId, auteurId), ne(contenu.statut, 'SUPPRIME')))
      .orderBy(
        desc(sql`coalesce(${contenu.dateModification}, ${contenu.dateCreation})`),
        desc(casBonReflexe.id),
      );
    const [masquages, domaines] = await Promise.all([
      lireMasquages(
        this.db,
        lignes.filter((l) => l.statutContenu === 'MASQUE').map((l) => l.id),
        false,
      ),
      domainesDes(
        this.db,
        lignes.map((l) => l.id),
      ),
    ]);
    return {
      elements: lignes.map((l) => ({
        id: l.id,
        slug: l.slug,
        titre: l.titre,
        difficulte: l.difficulte,
        domaine: domaines.get(l.id)?.domaine ?? null,
        dureeMinutes: domaines.get(l.id)?.dureeMinutes ?? null,
        statut: l.statut,
        dateCreation: l.dateCreation.toISOString(),
        dateModification: iso(l.dateModification),
        examen: l.dateExamen ? { date: l.dateExamen.toISOString(), motif: l.motifRefus } : null,
        reponses: l.reponses,
        utiles: l.utiles,
        masquee: l.statutContenu === 'MASQUE',
        masquage: masquages.get(l.id) ?? null,
      })),
    };
  }

  /** RG-72, RG-88 : cas répondus et réussis, comptés sur les cas visibles de tous ; cas manqués. */
  async apprentissage(membreId: number): Promise<ApprentissageApi> {
    const [reponses, [disponibles]] = await Promise.all([
      this.db
        .select({
          id: casBonReflexe.id,
          slug: casBonReflexe.slug,
          titre: casBonReflexe.titre,
          difficulte: casBonReflexe.difficulte,
          correcte: optionReponse.estCorrecte,
          date: choixOption.dateChoix,
        })
        .from(choixOption)
        .innerJoin(optionReponse, eq(optionReponse.id, choixOption.optionId))
        .innerJoin(casBonReflexe, eq(casBonReflexe.id, choixOption.casId))
        .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
        .where(
          and(
            eq(choixOption.utilisateurId, membreId),
            eq(contenu.statut, 'VISIBLE'),
            eq(casBonReflexe.statutValidation, 'VALIDE'),
          ),
        )
        .orderBy(desc(choixOption.dateChoix), desc(casBonReflexe.id)),
      this.db
        .execute<{ total: number }>(
          sql`
        select count(*)::int as total from cas_bon_reflexe cb join contenu c on c.id = cb.id
        where ${CAS_PUBLIC} and c.auteur_id <> ${membreId}`,
        )
        .then((r) => r.rows),
    ]);
    return {
      cas: {
        repondus: reponses.length,
        reussis: reponses.filter((r) => r.correcte).length,
        total: disponibles?.total ?? 0,
      },
      aRevoir: reponses
        .filter((r) => !r.correcte)
        .map(({ correcte: _correcte, date, ...r }) => ({ ...r, date: date.toISOString() })),
    };
  }

  /** « Cas 3 sur 8 » : rang parmi les cas visibles de tous, du plus récemment validé au plus ancien,
      et cas suivant (le premier après le dernier, comme le prototype). */
  private async position(id: number): Promise<CasApi['position']> {
    const { rows } = await this.db.execute<{
      rang: number;
      total: number;
      suivant_id: string | null;
      suivant_slug: string | null;
      suivant_titre: string | null;
    }>(sql`
      with liste as (
        select cb.id, cb.slug, cb.titre,
          row_number() over (order by cb.date_examen desc, cb.id desc) as rang,
          count(*) over () as total
        from cas_bon_reflexe cb join contenu c on c.id = cb.id
        where ${CAS_PUBLIC}
      )
      select l.rang::int, l.total::int,
        s.id as suivant_id, s.slug as suivant_slug, s.titre as suivant_titre
      from liste l
      left join liste s on s.id <> l.id
        and s.rang = case when l.rang = l.total then 1 else l.rang + 1 end
      where l.id = ${id}`);
    const [ligne] = rows;
    if (!ligne) return null;
    return {
      rang: ligne.rang,
      total: ligne.total,
      suivant:
        ligne.suivant_id && ligne.suivant_slug !== null && ligne.suivant_titre !== null
          ? { id: Number(ligne.suivant_id), slug: ligne.suivant_slug, titre: ligne.suivant_titre }
          : null,
    };
  }

  /** Réponse, vote, enregistrement et signalement ouvert de la personne connectée. */
  private async relation(membreId: number, casId: number) {
    const [[reponse], utile, enregistre, signale] = await Promise.all([
      this.db
        .select({ optionId: choixOption.optionId, date: choixOption.dateChoix })
        .from(choixOption)
        .where(and(eq(choixOption.utilisateurId, membreId), eq(choixOption.casId, casId))),
      this.db.$count(
        vote,
        and(eq(vote.votantId, membreId), eq(vote.contenuId, casId), eq(vote.typeVoteCode, 'UTILE')),
      ),
      this.db.$count(
        enregistrement,
        and(eq(enregistrement.utilisateurId, membreId), eq(enregistrement.contenuId, casId)),
      ),
      this.db.$count(
        signalement,
        and(
          eq(signalement.signaleurId, membreId),
          eq(signalement.contenuId, casId),
          eq(signalement.statut, 'OUVERT'),
        ),
      ),
    ]);
    return {
      reponse: reponse ?? null,
      utile: utile > 0,
      enregistre: enregistre > 0,
      signalementOuvert: signale > 0,
    };
  }
}
