import { Inject, Injectable } from '@nestjs/common';
import {
  etatDefi,
  MESSAGES_PARTICIPATION,
  participationsOuvertes,
  type CreationPalmaresApi,
  type DefiApi,
  type DefisApi,
  type DefiTermineApi,
  type EtatDefi,
  type OutilResumeApi,
  type ParticipationDefiApi,
  type TypeCreation,
} from '@vysora/shared';
import { inArray, sql } from 'drizzle-orm';
import { conflit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { outil } from '../../db/schema/index.js';
import { reglesDuDefi } from '../accueil/periodes.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { PARTICIPATIONS_VISIBLES } from './participation.js';

const TERMINES = 6;

type LigneDefi = {
  id: string;
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string | null;
  definition: string | null;
  cases: DefiApi['cases'];
  criteres: DefiApi['criteres'];
  criteres_communs: string[];
  pause_depuis: Date | string | null;
  date_debut: Date | string;
  date_fin: Date | string;
  statut: 'BROUILLON' | 'PUBLIE' | 'CLOTURE' | 'ANNULE';
  participations: number;
};

type LigneParticipation = {
  id: string;
  defi_id: string;
  auteur_id: string;
  nature: 'CREATION' | 'PARTICIPATION';
  slug: string;
  titre: string;
  type_creation: TypeCreation;
  date_publication: Date | string;
  utiles: number;
  rang: number | null;
  mon_vote: boolean;
  idee: string | null;
  modele: string | null;
  prompts: string[] | null;
  essais: number | null;
  moment: string | null;
  a_jeu: boolean | null;
  jeu_nom: string | null;
  outil_id: string | null;
};

const iso = (d: Date | string) => new Date(d).toISOString();

const etatDe = (l: LigneDefi, maintenant: Date): EtatDefi =>
  etatDefi(l.statut, l.date_debut, l.date_fin, maintenant);

/** Défis présentés au public : publiés, clôturés ou annulés (jamais un brouillon, F-63). */
const DEFIS_PUBLICS = sql`
  select d.id, d.slug, d.titre, d.enonce, d.contraintes, d.definition, d.cases, d.criteres,
    d.criteres_communs, d.pause_depuis, d.date_debut, d.date_fin, d.statut,
    (select count(*) from ${PARTICIPATIONS_VISIBLES} pv where pv.defi_id = d.id)::int as participations
  from defi d where d.statut <> 'BROUILLON'`;

/* Défis (S-07, F-63 à F-65, RG-73 à RG-75) : le défi en cours et ses participations, classées par
   votes « Utile » reçus pendant la période (rang figé une fois clôturé), les défis clôturés et leur
   podium, et la participation d'un membre : une de ses créations publiées pendant le défi. */
@Injectable()
export class DefisService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async defis(
    lecteurId: number | null,
    defiId?: number,
    maintenant = new Date(),
  ): Promise<DefisApi> {
    const { rows } = await this.db.execute<LigneDefi>(
      sql`${DEFIS_PUBLICS} order by d.date_debut desc`,
    );
    const choisi =
      (defiId !== undefined ? rows.find((l) => Number(l.id) === defiId) : undefined) ??
      rows.find((l) => etatDe(l, maintenant) === 'EN_COURS') ??
      rows.findLast((l) => etatDe(l, maintenant) === 'A_VENIR') ??
      rows.find((l) => ['TERMINE', 'CLOTURE'].includes(etatDe(l, maintenant))) ??
      null;
    const clotures = rows.filter((l) => l.statut === 'CLOTURE').slice(0, TERMINES);

    const ids = [...new Set([...(choisi ? [choisi.id] : []), ...clotures.map((l) => l.id)])];
    const participations = ids.length ? await this.participations(ids.map(Number), lecteurId) : [];
    const idsOutils = [
      ...new Set(participations.flatMap((p) => (p.outil_id ? [Number(p.outil_id)] : []))),
    ];
    const [membres, apercus, outilsParId] = await Promise.all([
      resumerMembres(
        this.db,
        this.stockage,
        participations.map((p) => Number(p.auteur_id)),
      ),
      // Aperçu des créations (outils, couverture) ; pour une participation, sa couverture seule.
      apercusDesCreations(
        this.db,
        this.stockage,
        participations.map((p) => ({ id: Number(p.id), type: p.type_creation })),
      ),
      idsOutils.length
        ? this.db
            .select({
              id: outil.id,
              nom: outil.nom,
              slug: outil.slug,
              logo: outil.logo,
              logoMonochrome: outil.logoMonochrome,
            })
            .from(outil)
            .where(inArray(outil.id, idsOutils))
            .then((lignes) => new Map(lignes.map((o) => [o.id, o])))
        : Promise.resolve(new Map<number, OutilResumeApi>()),
    ]);
    const creation = (p: LigneParticipation): CreationPalmaresApi => {
      const o = p.outil_id ? outilsParId.get(Number(p.outil_id)) : undefined;
      return {
        id: Number(p.id),
        slug: p.slug,
        titre: p.titre,
        type: p.type_creation,
        outils:
          p.nature === 'PARTICIPATION'
            ? o
              ? [{ outil: o, modeles: p.modele ? [p.modele] : [] }]
              : []
            : (apercus.get(Number(p.id))?.outils ?? []),
        couverture: apercus.get(Number(p.id))?.couverture ?? null,
      };
    };
    const detail = (p: LigneParticipation): ParticipationDefiApi['detail'] =>
      p.nature === 'PARTICIPATION'
        ? {
            idee: p.idee,
            modele: p.modele,
            prompts: p.prompts ?? [],
            essais: p.essais ?? 1,
            moment: p.moment,
            jeu: Boolean(p.a_jeu),
            jeuNom: p.jeu_nom,
            mienne: lecteurId !== null && Number(p.auteur_id) === lecteurId,
            outilId: p.outil_id ? Number(p.outil_id) : null,
          }
        : null;
    const auteur = (p: LigneParticipation) => {
      const m = membres.get(Number(p.auteur_id));
      if (!m) throw new Error(`Membre introuvable : ${p.auteur_id}`);
      return m;
    };
    const de = (defi: string) => participations.filter((p) => p.defi_id === defi);

    return {
      defi: choisi ? this.presenter(choisi, maintenant) : null,
      participations: choisi
        ? de(choisi.id).map((p): ParticipationDefiApi => ({
            nature: p.nature,
            detail: detail(p),
            creation: creation(p),
            auteur: auteur(p),
            datePublication: iso(p.date_publication),
            utiles: p.utiles,
            rang: p.rang,
            monVote: p.mon_vote,
          }))
        : [],
      termines: clotures.map((l): DefiTermineApi => ({
        id: Number(l.id),
        slug: l.slug,
        titre: l.titre,
        regles: reglesDuDefi(l.contraintes, l.cases ?? []),
        dateDebut: iso(l.date_debut),
        dateFin: iso(l.date_fin),
        participations: l.participations,
        podium: de(l.id)
          .slice(0, 3)
          .map((p, i) => ({
            rang: p.rang ?? i + 1,
            creation: creation(p),
            auteur: auteur(p),
            utiles: p.utiles,
          })),
      })),
      moi:
        lecteurId === null ? null : await this.moi(lecteurId, choisi, maintenant, participations),
    };
  }

  /** S-17 : une création ne s'inscrit plus à un défi ; on participe depuis la page Défis. */
  participer(): never {
    throw conflit(MESSAGES_PARTICIPATION.pageDefis);
  }

  /** Retirer sa participation tant que le défi est en cours. */
  async retirer(membreId: number, defiId: number): Promise<void> {
    const { rows } = await this.db.execute<LigneDefi>(sql`${DEFIS_PUBLICS} and d.id = ${defiId}`);
    const defi = rows[0];
    if (!defi) throw introuvable(MESSAGES_PARTICIPATION.introuvable);
    if (!participationsOuvertes(defi.statut, defi.date_debut, defi.date_fin))
      throw conflit(MESSAGES_PARTICIPATION.conservee);
    // La participation, pas un brouillon rattaché au défi depuis l'éditeur.
    const { rows: retirees } = await this.db.execute(sql`
      update creation cr set defi_id = null from contenu c
      where c.id = cr.id and cr.defi_id = ${defiId} and c.auteur_id = ${membreId}
        and cr.statut_publication = 'PUBLIEE'
      returning cr.id`);
    if (!retirees.length) throw introuvable('Vous ne participez pas à ce défi.');
  }

  private presenter(l: LigneDefi, maintenant: Date): DefiApi {
    return {
      id: Number(l.id),
      slug: l.slug,
      titre: l.titre,
      enonce: l.enonce,
      regles: reglesDuDefi(l.contraintes, l.cases ?? []),
      definition: l.definition,
      cases: l.cases ?? [],
      criteres: l.criteres ?? [],
      criteresCommuns: l.criteres_communs ?? [],
      enPause: l.pause_depuis !== null && etatDe(l, maintenant) === 'EN_COURS',
      dateDebut: iso(l.date_debut),
      dateFin: iso(l.date_fin),
      etat: etatDe(l, maintenant),
      participations: l.participations,
    };
  }

  /** Participations visibles (S-17 : participations et créations des défis d'avant) : rang figé,
      sinon votes « Utile » de la période puis date (RG-75). */
  private async participations(defiIds: number[], lecteurId: number | null) {
    const { rows } = await this.db.execute<LigneParticipation>(sql`
      select pv.id, pv.defi_id, pv.auteur_id, pv.nature, pv.slug, pv.titre, pv.type_creation,
        pv.date_publication, pv.rang,
        (select count(*) from vote v where v.contenu_id = pv.id and v.type_vote_code = 'UTILE'
          and v.date_vote >= d.date_debut and v.date_vote <= d.date_fin)::int as utiles,
        ${
          lecteurId === null
            ? sql`false`
            : sql`exists (select 1 from vote v where v.contenu_id = pv.id
                and v.type_vote_code = 'UTILE' and v.votant_id = ${lecteurId})`
        } as mon_vote,
        p.idee, p.modele, p.prompts, p.essais, p.moment, p.jeu is not null as a_jeu, p.jeu_nom,
        p.outil_id
      from ${PARTICIPATIONS_VISIBLES} pv
      join defi d on d.id = pv.defi_id
      left join participation p on p.id = pv.id
      where pv.defi_id in (${sql.join(
        defiIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      order by pv.defi_id, pv.rang nulls last, utiles desc, pv.date_publication asc, pv.id asc`);
    return rows.map((r) => ({ ...r, defi_id: String(r.defi_id) }));
  }

  private async moi(
    membreId: number,
    defi: LigneDefi | null,
    maintenant: Date,
    participations: LigneParticipation[],
  ): Promise<DefisApi['moi']> {
    if (!defi) return { participation: null, eligibles: [] };
    // S-17 : plus de création à inscrire ; la participation se publie depuis la page Défis.
    void maintenant;
    const mienne = participations.find(
      (p) => p.defi_id === defi.id && Number(p.auteur_id) === membreId,
    );
    return {
      participation: mienne
        ? { id: Number(mienne.id), titre: mienne.titre, nature: mienne.nature }
        : null,
      eligibles: [],
    };
  }
}
