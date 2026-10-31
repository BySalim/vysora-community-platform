import { Inject, Injectable } from '@nestjs/common';
import {
  limiteQuotidienne,
  type BadgeObtenuApi,
  type ContributionProfilApi,
  type CreationProfilApi,
  type DetailReputationApi,
  type EtatVisiteur,
  type MotifMouvementReputation,
  type ProfilApi,
  type ProfilPriveApi,
  type ProfilPublicApi,
  type ProfilPublicSaisi,
  type ResultatReproduction,
  type Role,
  type TonBadge,
  type TypeContenu,
  type TypeCreation,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { utilisateur } from '../../db/schema/index.js';
import { CasService } from '../apprentissage/cas.service.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { limitePublication } from '../creations/limite-publication.js';
import { tauxDeReussite } from '../decouverte/chiffres-guides.js';
import { Stockage } from '../medias/stockage.js';
import { BadgesService } from '../progression/badges.service.js';
import { resumerMembres } from './resumes.js';

const JOUR_MS = 86_400_000;
const SEMAINES = 12;
const CONTRIBUTIONS = 30;

type LigneOutil = {
  outil_id: string | null;
  outil_nom: string | null;
  outil_slug: string | null;
  outil_logo: string | null;
  outil_mono: boolean | null;
};
const outilDe = (l: LigneOutil) =>
  l.outil_id && l.outil_nom && l.outil_slug
    ? {
        id: Number(l.outil_id),
        nom: l.outil_nom,
        slug: l.outil_slug,
        logo: l.outil_logo,
        logoMonochrome: l.outil_mono ?? false,
      }
    : null;

/** Lundi 00:00 (UTC) de la semaine de `date` (RG-87). */
const lundi = (date: Date): Date => {
  const minuit = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(minuit - ((new Date(minuit).getUTCDay() + 6) % 7) * JOUR_MS);
};

/** Contenus d'un auteur visibles de tous (RG-30), alias « c » : création publiée, sujet, réponse dans
    un sujet visible, cas validé. */
const CONTENU_PUBLIC = sql`c.statut = 'VISIBLE' and (
  (c.type_contenu = 'CREATION' and exists (select 1 from creation cr where cr.id = c.id and cr.statut_publication = 'PUBLIEE'))
  or c.type_contenu = 'SUJET'
  or (c.type_contenu = 'MESSAGE' and exists (select 1 from message m join contenu sc on sc.id = m.sujet_id where m.id = c.id and sc.statut = 'VISIBLE'))
  or (c.type_contenu = 'CAS_BON_REFLEXE' and exists (select 1 from cas_bon_reflexe cb where cb.id = c.id and cb.statut_validation = 'VALIDE'))
)`;

/* PROF-01 : profil public d'un membre (F-05, F-73, F-74, EC-14). Tout ce que chacun y voit vient de
   ses contenus visibles de tous (RG-30) ; un compte banni, supprimé ou en cours de suppression n'a
   plus de profil. Son propriétaire voit en plus sa progression (RG-88), qu'aucun autre membre ne
   reçoit, même la modération. */
@Injectable()
export class ProfilService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly cas: CasService,
    private readonly badgesService: BadgesService,
  ) {}

  async profil(
    pseudo: string,
    lecteur: { id: number; etat: EtatVisiteur } | null,
    maintenant = new Date(),
  ): Promise<ProfilApi> {
    const [ligne] = await this.db
      .select({
        id: utilisateur.id,
        role: utilisateur.role,
        statut: utilisateur.statutCompte,
        biographie: utilisateur.biographie,
        lien: utilisateur.urlSite,
        dateInscription: utilisateur.dateInscription,
      })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.pseudo}) = lower(${pseudo})`);
    if (!ligne || ligne.statut !== 'ACTIF') throw introuvable('Ce profil est introuvable.');
    const id = ligne.id;
    const proprietaire = lecteur?.id === id;

    const [resumes, statistiques, creations, contributions, badges, prive] = await Promise.all([
      resumerMembres(this.db, this.stockage, [id]),
      this.statistiques(id),
      this.creations(id),
      this.contributions(id),
      this.badges(id),
      proprietaire && lecteur ? this.prive(id, lecteur.etat, maintenant) : null,
    ]);
    const resume = resumes.get(id);
    if (!resume) throw introuvable('Ce profil est introuvable.');
    return {
      membre: {
        ...resume,
        role: ligne.role as Role,
        biographie: ligne.biographie,
        lien: ligne.lien,
        dateInscription: ligne.dateInscription.toISOString(),
      },
      statistiques,
      creations,
      contributions,
      badges,
      prive,
    };
  }

  /** F-05 : biographie et lien personnel (vide : retirés). */
  async modifier(membreId: number, saisie: ProfilPublicSaisi): Promise<ProfilPublicApi> {
    const changements: Partial<typeof utilisateur.$inferInsert> = {};
    if (saisie.biographie !== undefined) changements.biographie = saisie.biographie;
    if (saisie.lien !== undefined) changements.urlSite = saisie.lien;
    const [ligne] = Object.keys(changements).length
      ? await this.db
          .update(utilisateur)
          .set(changements)
          .where(eq(utilisateur.id, membreId))
          .returning({ biographie: utilisateur.biographie, lien: utilisateur.urlSite })
      : await this.db
          .select({ biographie: utilisateur.biographie, lien: utilisateur.urlSite })
          .from(utilisateur)
          .where(eq(utilisateur.id, membreId));
    return { biographie: ligne?.biographie ?? null, lien: ligne?.lien ?? null };
  }

  /** F-73, RG-88 : statistiques publiques. */
  private async statistiques(id: number): Promise<ProfilApi['statistiques']> {
    const { rows } = await this.db.execute<{
      creations: number;
      utiles: number;
      reproductions: number;
      reussies: number;
      acceptees: number;
      vues: number;
    }>(sql`
      select
        (select count(*) from contenu c join creation cr on cr.id = c.id
          where c.auteur_id = ${id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE')::int
          as creations,
        (select count(*) from vote v join contenu c on c.id = v.contenu_id
          where c.auteur_id = ${id} and v.type_vote_code = 'UTILE' and ${CONTENU_PUBLIC})::int as utiles,
        (select count(*) from reproduction r
          join contenu rc on rc.id = r.id
          join contenu c on c.id = r.creation_id
          join creation cr on cr.id = r.creation_id
          where c.auteur_id = ${id} and rc.statut = 'VISIBLE' and c.statut = 'VISIBLE'
            and cr.statut_publication = 'PUBLIEE' and cr.type_creation <> 'PROJET')::int as reproductions,
        (select count(*) from reproduction r
          join contenu rc on rc.id = r.id
          join contenu c on c.id = r.creation_id
          join creation cr on cr.id = r.creation_id
          where c.auteur_id = ${id} and rc.statut = 'VISIBLE' and c.statut = 'VISIBLE'
            and cr.statut_publication = 'PUBLIEE' and cr.type_creation <> 'PROJET'
            and r.resultat = 'SUCCES')::int as reussies,
        (select count(*) from sujet s
          join contenu sc on sc.id = s.id
          join contenu c on c.id = s.message_accepte_id
          where c.auteur_id = ${id} and c.statut = 'VISIBLE' and sc.statut = 'VISIBLE')::int as acceptees,
        (select coalesce(sum(c.nb_vues), 0) from contenu c where c.auteur_id = ${id}
          and ${CONTENU_PUBLIC})::int as vues`);
    const s = rows[0] ?? {
      creations: 0,
      utiles: 0,
      reproductions: 0,
      reussies: 0,
      acceptees: 0,
      vues: 0,
    };
    return {
      creations: s.creations,
      utiles: s.utiles,
      reproductions: s.reproductions,
      reussies: s.reussies,
      tauxReussite: tauxDeReussite(s.reproductions, s.reussies),
      reponsesAcceptees: s.acceptees,
      vues: s.vues,
    };
  }

  /** Créations publiées et visibles, des plus récentes aux plus anciennes. */
  private async creations(id: number): Promise<CreationProfilApi[]> {
    const { rows } = await this.db.execute<{
      id: string;
      slug: string;
      type: TypeCreation;
      titre: string;
      date: Date | string;
      categorie: string | null;
      categorie_slug: string | null;
      categorie_icone: string | null;
      utiles: number;
      reproductions: number;
      reussies: number;
      moments: number;
    }>(sql`
      select c.id, cr.slug, cr.type_creation as type, cr.titre, cr.date_publication as date,
        cat.libelle as categorie, cat.slug as categorie_slug, cat.icone as categorie_icone,
        (select count(*) from vote v where v.contenu_id = c.id and v.type_vote_code = 'UTILE')::int
          as utiles,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE')::int as reproductions,
        (select count(*) from reproduction r join contenu rc on rc.id = r.id
          where r.creation_id = c.id and rc.statut = 'VISIBLE' and r.resultat = 'SUCCES')::int
          as reussies,
        (select count(*) from moment_cle mk join etape e on e.id = mk.etape_id
          where e.creation_id = c.id)::int as moments
      from creation cr
      join contenu c on c.id = cr.id
      left join categorie cat on cat.id = cr.categorie_id
      where c.auteur_id = ${id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
      order by cr.date_publication desc, c.id desc`);
    const apercus = await apercusDesCreations(
      this.db,
      this.stockage,
      rows.map((r) => ({ id: Number(r.id), type: r.type })),
    );
    return rows.map((r) => {
      const apercu = apercus.get(Number(r.id));
      const reproductible = r.type !== 'PROJET';
      return {
        id: Number(r.id),
        slug: r.slug,
        type: r.type,
        titre: r.titre,
        categorie:
          r.categorie && r.categorie_slug
            ? { libelle: r.categorie, slug: r.categorie_slug, icone: r.categorie_icone }
            : null,
        couverture: apercu?.couverture ?? null,
        resultat: apercu?.resultat ?? null,
        apercu: apercu?.apercu ?? null,
        outils: apercu?.outils ?? [],
        utiles: r.utiles,
        reproductions: reproductible ? r.reproductions : 0,
        reussies: reproductible ? r.reussies : 0,
        tauxReussite: reproductible ? tauxDeReussite(r.reproductions, r.reussies) : null,
        moments: r.moments,
        datePublication: new Date(r.date).toISOString(),
      };
    });
  }

  /** Contributions publiques récentes : créations publiées, réponses du forum, essais déclarés. */
  private async contributions(id: number): Promise<ContributionProfilApi[]> {
    const { rows } = await this.db.execute<
      LigneOutil & {
        genre: ContributionProfilApi['genre'];
        date: Date | string;
        cible_id: string;
        slug: string;
        titre: string;
        type_creation: TypeCreation | null;
        acceptee: boolean | null;
        auteur_id: string | null;
        resultat: ResultatReproduction | null;
        modele: string | null;
      }
    >(sql`
      select * from (
        select 'creation' as genre, cr.date_publication as date, c.id as cible_id, cr.slug, cr.titre,
          cr.type_creation, null::boolean as acceptee, null::bigint as auteur_id, null as resultat,
          o.id as outil_id, o.nom as outil_nom, o.slug as outil_slug, o.logo as outil_logo,
          o.logo_monochrome as outil_mono, null as modele
        from creation cr
        join contenu c on c.id = cr.id
        left join lateral (select ci.outil_id from configuration_ia ci join etape e on e.id = ci.etape_id
          where e.creation_id = cr.id and ci.outil_id is not null
          order by e.ordre, ci.ordre, ci.id limit 1) premiere on true
        left join outil o on o.id = premiere.outil_id
        where c.auteur_id = ${id} and c.statut = 'VISIBLE' and cr.statut_publication = 'PUBLIEE'
        union all
        select 'reponse', mc.date_creation, s.id, s.slug, s.titre, null, s.message_accepte_id = m.id,
          sc.auteur_id, null, o.id, o.nom, o.slug, o.logo, o.logo_monochrome, null
        from message m
        join contenu mc on mc.id = m.id
        join sujet s on s.id = m.sujet_id
        join contenu sc on sc.id = s.id
        left join outil o on o.id = s.outil_id
        where mc.auteur_id = ${id} and mc.statut = 'VISIBLE' and sc.statut = 'VISIBLE'
          and sc.auteur_id <> ${id}
        union all
        select 'essai', rc.date_creation, c.id, cr.slug, cr.titre, null, null, c.auteur_id,
          r.resultat, o.id, o.nom, o.slug, o.logo, o.logo_monochrome,
          coalesce(md.nom_court, r.modele_non_reference)
        from reproduction r
        join contenu rc on rc.id = r.id
        join creation cr on cr.id = r.creation_id
        join contenu c on c.id = cr.id
        join outil o on o.id = r.outil_id
        left join modele md on md.id = r.modele_id
        where rc.auteur_id = ${id} and rc.statut = 'VISIBLE' and c.statut = 'VISIBLE'
          and cr.statut_publication = 'PUBLIEE'
      ) a
      order by a.date desc, a.cible_id desc
      limit ${CONTRIBUTIONS}`);
    const auteurs = await resumerMembres(
      this.db,
      this.stockage,
      rows.flatMap((r) => (r.auteur_id ? [Number(r.auteur_id)] : [])),
    );
    return rows.flatMap((r): ContributionProfilApi[] => {
      const date = new Date(r.date).toISOString();
      const cible = { id: Number(r.cible_id), slug: r.slug, titre: r.titre };
      const outil = outilDe(r);
      const auteur = r.auteur_id ? auteurs.get(Number(r.auteur_id)) : undefined;
      if (r.genre === 'creation' && r.type_creation)
        return [{ genre: 'creation', date, creation: { ...cible, type: r.type_creation }, outil }];
      if (r.genre === 'reponse' && auteur)
        return [
          { genre: 'reponse', date, acceptee: Boolean(r.acceptee), sujet: cible, auteur, outil },
        ];
      if (r.genre === 'essai' && auteur && outil && r.resultat)
        return [
          {
            genre: 'essai',
            date,
            resultat: r.resultat,
            creation: cible,
            auteur,
            outil,
            modele: r.modele,
          },
        ];
      return [];
    });
  }

  /** F-74 : badges obtenus, du plus récent au plus ancien ; un badge arrêté (ADM-02) reste affiché. */
  private async badges(id: number): Promise<BadgeObtenuApi[]> {
    const { rows } = await this.db.execute<{
      code: string;
      libelle: string;
      critere: string;
      icone: string;
      ton: TonBadge;
      date: Date | string;
    }>(sql`
      select b.code, b.libelle, b.critere, b.icone, b.ton, ob.date_obtention as date
      from obtention_badge ob join badge b on b.id = ob.badge_id
      where ob.utilisateur_id = ${id}
      order by ob.date_obtention desc, b.id desc`);
    return rows.map((r) => ({ ...r, date: new Date(r.date).toISOString() }));
  }

  /** RG-88 : progression du propriétaire. */
  private async prive(id: number, etat: EtatVisiteur, maintenant: Date): Promise<ProfilPriveApi> {
    const [reputation, apprentissage, reproductions, limites, brouillons, prochainsBadges] =
      await Promise.all([
        this.reputation(id, maintenant),
        this.cas.apprentissage(id),
        this.db.execute<{ n: number }>(sql`
        select count(*)::int as n from reproduction r join contenu rc on rc.id = r.id
        where rc.auteur_id = ${id} and rc.statut = 'VISIBLE'`),
        this.limites(id, etat, maintenant),
        this.db.execute<{
          nombre: number;
          id: string | null;
          titre: string | null;
          date: Date | null;
        }>(sql`
        select count(*) over ()::int as nombre, c.id, cr.titre,
          coalesce(c.date_modification, c.date_creation) as date
        from creation cr join contenu c on c.id = cr.id
        where c.auteur_id = ${id} and c.statut <> 'SUPPRIME' and cr.statut_publication = 'BROUILLON'
        order by coalesce(c.date_modification, c.date_creation) desc, c.id desc
        limit 1`),
        this.badgesService.prochains(id),
      ]);
    const dernier = brouillons.rows[0];
    return {
      reputation,
      apprentissage: {
        casRepondus: apprentissage.cas.repondus,
        casReussis: apprentissage.cas.reussis,
        reproductionsDeclarees: reproductions.rows[0]?.n ?? 0,
      },
      limites,
      brouillons: {
        nombre: dernier?.nombre ?? 0,
        dernier:
          dernier?.id && dernier.date
            ? {
                id: Number(dernier.id),
                titre: dernier.titre,
                date: new Date(dernier.date).toISOString(),
              }
            : null,
      },
      prochainsBadges,
    };
  }

  /** Réputation (RG-80 à RG-83) : total, gain de la semaine, fin de chaque semaine, détail par motif
      (une annulation se déduit du motif qu'elle annule, RG-82). */
  private async reputation(id: number, maintenant: Date): Promise<ProfilPriveApi['reputation']> {
    const [{ rows: mouvements }, [membre]] = await Promise.all([
      this.db.execute<{
        motif: MotifMouvementReputation;
        origine: MotifMouvementReputation | null;
        type_contenu: TypeContenu | null;
        points_origine: number | null;
        points: number;
        date: Date | string;
        annule: boolean;
      }>(sql`
        select mr.motif, o.motif as origine, coalesce(c.type_contenu, oc.type_contenu) as type_contenu,
          o.points as points_origine, mr.points, mr.date,
          exists (select 1 from mouvement_reputation a where a.mouvement_annule_id = mr.id) as annule
        from mouvement_reputation mr
        left join mouvement_reputation o on o.id = mr.mouvement_annule_id
        left join contenu c on c.id = mr.contenu_id
        left join contenu oc on oc.id = o.contenu_id
        where mr.beneficiaire_id = ${id}
        order by mr.date`),
      this.db
        .select({ inscription: utilisateur.dateInscription })
        .from(utilisateur)
        .where(eq(utilisateur.id, id)),
    ]);

    // Détail par motif.
    const details = new Map<string, DetailReputationApi>();
    for (const m of mouvements) {
      const motif = m.motif === 'ANNULATION' ? m.origine : m.motif;
      if (!motif || motif === 'ANNULATION') continue;
      const typeContenu = motif === 'VOTE_UTILE_RECU' ? m.type_contenu : null;
      const unitaires =
        motif === 'PODIUM_DEFI' ? (m.motif === 'ANNULATION' ? m.points_origine : m.points) : null;
      const cle = `${motif}:${typeContenu ?? ''}:${unitaires ?? ''}`;
      const d = details.get(cle) ?? {
        motif,
        typeContenu,
        pointsUnitaires: unitaires,
        nombre: 0,
        points: 0,
      };
      d.points += m.points;
      if (m.motif !== 'ANNULATION' && !m.annule) d.nombre += 1;
      details.set(cle, d);
    }

    // Fin de chaque semaine, depuis l'inscription, douze au plus.
    const debutSemaine = lundi(maintenant);
    const premiere = new Date(
      Math.max(
        debutSemaine.getTime() - (SEMAINES - 1) * 7 * JOUR_MS,
        lundi(membre?.inscription ?? maintenant).getTime(),
      ),
    );
    const parSemaine: ProfilPriveApi['reputation']['parSemaine'] = [];
    let cumul = mouvements
      .filter((m) => new Date(m.date) < premiere)
      .reduce((n, m) => n + m.points, 0);
    for (let s = premiere.getTime(); s <= debutSemaine.getTime(); s += 7 * JOUR_MS) {
      const fin = s + 7 * JOUR_MS;
      const gain = mouvements
        .filter((m) => {
          const t = new Date(m.date).getTime();
          return t >= s && t < fin;
        })
        .reduce((n, m) => n + m.points, 0);
      cumul += gain;
      // RG-83 : la réputation ne descend pas sous zéro.
      parSemaine.push({
        semaine: new Date(s).toISOString().slice(0, 10),
        valeur: Math.max(0, cumul),
        gain,
      });
    }
    const total = Math.max(
      0,
      mouvements.reduce((n, m) => n + m.points, 0),
    );
    return {
      total,
      semaine: parSemaine.at(-1)?.gain ?? 0,
      parSemaine,
      details: [...details.values()].filter((d) => d.nombre > 0 || d.points !== 0),
    };
  }

  /** RG-85 : publications des 24 dernières heures et limites du niveau ; null sans limite. */
  private async limites(
    id: number,
    etat: EtatVisiteur,
    maintenant: Date,
  ): Promise<ProfilPriveApi['limites']> {
    const creations = await limitePublication(this.db, { id, etat }, maintenant);
    const sujets = limiteQuotidienne('sujets', etat);
    const reponses = limiteQuotidienne('reponses', etat);
    if (!creations || !Number.isFinite(sujets) || !Number.isFinite(reponses)) return null;
    const { rows } = await this.db.execute<{ sujets: number; reponses: number }>(sql`
      select
        count(*) filter (where type_contenu = 'SUJET')::int as sujets,
        count(*) filter (where type_contenu in ('MESSAGE', 'COMMENTAIRE'))::int as reponses
      from contenu
      where auteur_id = ${id} and date_creation > ${new Date(maintenant.getTime() - JOUR_MS)}`);
    return {
      creations: { utilisees: creations.utilisees, limite: creations.limite },
      sujets: { utilisees: rows[0]?.sujets ?? 0, limite: sujets },
      reponses: { utilisees: rows[0]?.reponses ?? 0, limite: reponses },
    };
  }
}
