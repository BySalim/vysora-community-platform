import { Inject, Injectable } from '@nestjs/common';
import type {
  CreationPalmaresApi,
  DefiApi,
  DefisApi,
  DefiTermineApi,
  EtatDefi,
  ParticipationDefiApi,
  TypeCreation,
} from '@vysora/shared';
import { sql } from 'drizzle-orm';
import { conflit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { reglesDuDefi } from '../accueil/periodes.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

const TERMINES = 6;

type LigneDefi = {
  id: string;
  slug: string;
  titre: string;
  enonce: string;
  contraintes: string | null;
  date_debut: Date | string;
  date_fin: Date | string;
  statut: 'BROUILLON' | 'PUBLIE' | 'CLOTURE' | 'ANNULE';
  participations: number;
};

type LigneParticipation = {
  id: string;
  defi_id: string;
  auteur_id: string;
  slug: string;
  titre: string;
  type_creation: TypeCreation;
  date_publication: Date | string;
  utiles: number;
  rang: number | null;
  mon_vote: boolean;
};

const iso = (d: Date | string) => new Date(d).toISOString();

function etatDe(l: LigneDefi, maintenant: Date): EtatDefi {
  if (l.statut === 'CLOTURE') return 'CLOTURE';
  if (l.statut === 'ANNULE') return 'ANNULE';
  if (new Date(l.date_debut) > maintenant) return 'A_VENIR';
  return new Date(l.date_fin) > maintenant ? 'EN_COURS' : 'TERMINE';
}

/** Défis présentés au public : publiés, clôturés ou annulés (jamais un brouillon, F-63). */
const DEFIS_PUBLICS = sql`
  select d.id, d.slug, d.titre, d.enonce, d.contraintes, d.date_debut, d.date_fin, d.statut,
    (select count(*) from creation cr join contenu c on c.id = cr.id
      where cr.defi_id = d.id and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE')::int
      as participations
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
    const [membres, apercus] = await Promise.all([
      resumerMembres(
        this.db,
        this.stockage,
        participations.map((p) => Number(p.auteur_id)),
      ),
      apercusDesCreations(
        this.db,
        this.stockage,
        participations.map((p) => ({ id: Number(p.id), type: p.type_creation })),
      ),
    ]);
    const creation = (p: LigneParticipation): CreationPalmaresApi => ({
      id: Number(p.id),
      slug: p.slug,
      titre: p.titre,
      type: p.type_creation,
      outils: apercus.get(Number(p.id))?.outils ?? [],
      couverture: apercus.get(Number(p.id))?.couverture ?? null,
    });
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
        regles: reglesDuDefi(l.contraintes),
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

  /** F-64, RG-74 : inscrire une de ses créations, publiée pendant le défi en cours. */
  async participer(membreId: number, defiId: number, creationId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const { rows } = await tx.execute<LigneDefi>(
        sql`${DEFIS_PUBLICS} and d.id = ${defiId} for update of d`,
      );
      const defi = rows[0];
      if (!defi) throw introuvable('Ce défi est introuvable.');
      if (defi.statut !== 'PUBLIE' || etatDe(defi, new Date()) !== 'EN_COURS')
        throw conflit('Les participations à ce défi sont fermées.');
      const { rows: creations } = await tx.execute<{
        auteur_id: string;
        defi_id: string | null;
        date_publication: Date | string | null;
        visible: boolean;
      }>(sql`
        select c.auteur_id, cr.defi_id, cr.date_publication, c.statut = 'VISIBLE' as visible
        from creation cr join contenu c on c.id = cr.id
        where cr.id = ${creationId} and cr.statut_publication = 'PUBLIEE'`);
      const c = creations[0];
      if (!c || Number(c.auteur_id) !== membreId || !c.visible)
        throw introuvable('Cette création est introuvable parmi vos créations publiées.');
      if (c.defi_id !== null)
        throw conflit(
          Number(c.defi_id) === defiId
            ? 'Cette création participe déjà au défi.'
            : 'Une création participe à un seul défi.',
        );
      const publication = c.date_publication ? new Date(c.date_publication) : null;
      if (
        !publication ||
        publication < new Date(defi.date_debut) ||
        publication > new Date(defi.date_fin)
      )
        throw conflit('La création doit être publiée pendant la période du défi.');
      const { rows: deja } = await tx.execute(sql`
        select 1 from creation cr join contenu c on c.id = cr.id
        where cr.defi_id = ${defiId} and c.auteur_id = ${membreId} and c.statut <> 'SUPPRIME'`);
      if (deja.length) throw conflit('Vous participez déjà à ce défi : une création par personne.');
      await tx.execute(sql`update creation set defi_id = ${defiId} where id = ${creationId}`);
    });
  }

  /** Retirer sa participation tant que le défi est en cours. */
  async retirer(membreId: number, defiId: number): Promise<void> {
    const { rows } = await this.db.execute<LigneDefi>(sql`${DEFIS_PUBLICS} and d.id = ${defiId}`);
    const defi = rows[0];
    if (!defi) throw introuvable('Ce défi est introuvable.');
    if (defi.statut !== 'PUBLIE' || etatDe(defi, new Date()) !== 'EN_COURS')
      throw conflit('Le défi n’est plus en cours : la participation est conservée.');
    const { rows: retirees } = await this.db.execute(sql`
      update creation cr set defi_id = null from contenu c
      where c.id = cr.id and cr.defi_id = ${defiId} and c.auteur_id = ${membreId}
      returning cr.id`);
    if (!retirees.length) throw introuvable('Vous ne participez pas à ce défi.');
  }

  private presenter(l: LigneDefi, maintenant: Date): DefiApi {
    return {
      id: Number(l.id),
      slug: l.slug,
      titre: l.titre,
      enonce: l.enonce,
      regles: reglesDuDefi(l.contraintes),
      dateDebut: iso(l.date_debut),
      dateFin: iso(l.date_fin),
      etat: etatDe(l, maintenant),
      participations: l.participations,
    };
  }

  /** Participations visibles : rang figé, sinon votes « Utile » de la période puis date (RG-75). */
  private async participations(defiIds: number[], lecteurId: number | null) {
    const { rows } = await this.db.execute<LigneParticipation>(sql`
      select cr.id, cr.defi_id, c.auteur_id, cr.slug, cr.titre, cr.type_creation, cr.date_publication,
        (select count(*) from vote v where v.contenu_id = cr.id and v.type_vote_code = 'UTILE'
          and v.date_vote >= d.date_debut and v.date_vote <= d.date_fin)::int as utiles,
        cr.rang_final_participation as rang,
        ${
          lecteurId === null
            ? sql`false`
            : sql`exists (select 1 from vote v where v.contenu_id = cr.id
                and v.type_vote_code = 'UTILE' and v.votant_id = ${lecteurId})`
        } as mon_vote
      from creation cr
      join contenu c on c.id = cr.id
      join defi d on d.id = cr.defi_id
      where cr.defi_id in (${sql.join(
        defiIds.map((id) => sql`${id}`),
        sql`, `,
      )}) and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      order by cr.defi_id, cr.rang_final_participation nulls last, utiles desc,
        cr.date_publication asc, cr.id asc`);
    return rows.map((r) => ({ ...r, defi_id: String(r.defi_id) }));
  }

  private async moi(
    membreId: number,
    defi: LigneDefi | null,
    maintenant: Date,
    participations: LigneParticipation[],
  ): Promise<DefisApi['moi']> {
    if (!defi) return { participation: null, eligibles: [] };
    const mienne = participations.find(
      (p) => p.defi_id === defi.id && Number(p.auteur_id) === membreId,
    );
    if (mienne || etatDe(defi, maintenant) !== 'EN_COURS' || defi.statut !== 'PUBLIE')
      return {
        participation: mienne ? { id: Number(mienne.id), titre: mienne.titre } : null,
        eligibles: [],
      };
    const { rows } = await this.db.execute<{ id: string; titre: string }>(sql`
      select cr.id, cr.titre from creation cr join contenu c on c.id = cr.id
      where c.auteur_id = ${membreId} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
        and cr.defi_id is null and cr.date_publication >= ${new Date(defi.date_debut)}
        and cr.date_publication <= ${new Date(defi.date_fin)}
      order by cr.date_publication desc`);
    return {
      participation: null,
      eligibles: rows.map((r) => ({ id: Number(r.id), titre: r.titre })),
    };
  }
}
