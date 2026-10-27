import { Inject, Injectable } from '@nestjs/common';
import {
  DELAIS,
  actionsPossibles,
  type ActionDecision,
  type DecisionApi,
  type DossierModerationApi,
  type ElementFileModerationApi,
  type FileModerationApi,
  type MotifSignalement,
} from '@vysora/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  max,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { contenu, decisionModeration, signalement } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { detailsDuContenu, presenterContenus } from './contenus-moderes.js';

const PAR_PAGE = 20;
const HISTORIQUE_MAXIMUM = 20;
/** Actions qui ne retiennent rien contre l'auteur (RG-102 : signalements non fondés). */
const SANS_SUITE: ActionDecision[] = ['AUCUNE', 'RETABLIR'];

type LigneDecision = typeof decisionModeration.$inferSelect;

/** Curseur de la file : date de rangement et identifiant du dernier contenu de la page. */
const ecrireCurseur = (depuis: Date, id: number) =>
  Buffer.from(`${depuis.toISOString()}|${id}`).toString('base64url');
function lireCurseur(curseur: string | undefined): { depuis: Date; id: number } | null {
  if (!curseur) return null;
  const [date, id] = Buffer.from(curseur, 'base64url').toString().split('|');
  const depuis = new Date(date ?? '');
  const identifiant = Number(id);
  if (Number.isNaN(depuis.getTime()) || !Number.isSafeInteger(identifiant) || identifiant < 1)
    throw erreurValidation({ apres: 'Cette page de la file n’existe pas.' });
  return { depuis, id: identifiant };
}

/* F-91 : ce que la modération examine. La file range les contenus du plus ancien au plus récent :
   date du premier signalement ouvert, ou date à laquelle l'auteur a modifié un contenu masqué depuis
   la dernière décision (nouvel examen demandé). Les contenus supprimés n'y figurent plus. RG-104 : un
   modérateur ne voit dans la file ni ne consulte le dossier de ses propres contenus, que traite un
   autre membre de l'équipe (il n'y apprend pas qui l'a signalé). */
@Injectable()
export class DossiersService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async file(
    moderateurId: number,
    apres?: string,
    maintenant = new Date(),
  ): Promise<FileModerationApi> {
    const curseur = lireCurseur(apres);
    // RG-105 : délai cible de 72 heures.
    const limite = new Date(maintenant.getTime() - DELAIS.traitementSignalementHeures * 3_600_000);
    const file = sql`
        with ouverts as (
          select contenu_id, min(date) as premier from signalement
          where statut = 'OUVERT' group by contenu_id
        ), dernieres as (
          select contenu_id, max(date) as date from decision_moderation
          where contenu_id is not null group by contenu_id
        ), file as (
          select c.id,
            coalesce(c.statut = 'MASQUE' and c.date_modification > d.date, false) as nouvel_examen,
            least(o.premier, case when c.statut = 'MASQUE' and c.date_modification > d.date
              then c.date_modification end) as depuis
          from contenu c
          left join ouverts o on o.contenu_id = c.id
          left join dernieres d on d.contenu_id = c.id
          where c.statut <> 'SUPPRIME' and c.auteur_id <> ${moderateurId}
        )
        select id, depuis, nouvel_examen from file where depuis is not null`;
    const [resultat, comptes] = await Promise.all([
      this.db.execute<{ id: string; depuis: Date | string; nouvel_examen: boolean }>(sql`
        select * from (${file}) f
        where ${curseur?.depuis.toISOString() ?? null}::timestamptz is null
          or (depuis, id) > (${curseur?.depuis.toISOString() ?? null}::timestamptz, ${curseur?.id ?? 0}::bigint)
        order by depuis, id
        limit ${PAR_PAGE + 1}
      `),
      this.db.execute<{ total: number; en_retard: number }>(sql`
        select count(*)::int as total,
          (count(*) filter (where depuis < ${limite.toISOString()}::timestamptz))::int as en_retard
        from (${file}) f
      `),
    ]);
    const lignes = resultat.rows.map((l) => ({
      ...l,
      id: Number(l.id),
      depuis: new Date(l.depuis),
    }));
    const page = lignes.slice(0, PAR_PAGE);
    const ids = page.map((l) => l.id);
    const totaux = {
      total: comptes.rows[0]?.total ?? 0,
      enRetard: comptes.rows[0]?.en_retard ?? 0,
    };
    if (!ids.length) return { elements: [], suivant: null, ...totaux };

    const [contenus, motifs] = await Promise.all([
      presenterContenus(this.db, this.stockage, ids),
      this.db
        .select({ contenuId: signalement.contenuId, motif: signalement.motif, n: count() })
        .from(signalement)
        .where(and(eq(signalement.statut, 'OUVERT'), inArray(signalement.contenuId, ids)))
        .groupBy(signalement.contenuId, signalement.motif),
    ]);
    const historiques = await this.historiques([
      ...new Set([...contenus.values()].map((c) => c.auteur.id)),
    ]);
    const elements = page.map((l): ElementFileModerationApi => {
      const presente = contenus.get(l.id);
      if (!presente) throw new Error(`Contenu introuvable : ${l.id}`);
      const siens = motifs
        .filter((m) => m.contenuId === l.id)
        .map((m) => ({ motif: m.motif as MotifSignalement, nombre: m.n }))
        .toSorted((a, b) => b.nombre - a.nombre);
      const historique = historiques.get(presente.auteur.id) ?? [];
      const derniere = historique[0];
      return {
        contenu: presente,
        depuis: l.depuis.toISOString(),
        enRetard: l.depuis < limite,
        signalements: { nombre: siens.reduce((n, m) => n + m.nombre, 0), motifs: siens },
        nouvelExamen: l.nouvel_examen,
        historiqueAuteur: {
          decisions: historique.length,
          derniere: derniere
            ? { action: derniere.action, date: derniere.date.toISOString() }
            : null,
        },
      };
    });
    const dernier = page.at(-1);
    return {
      elements,
      suivant:
        lignes.length > PAR_PAGE && dernier ? ecrireCurseur(dernier.depuis, dernier.id) : null,
      ...totaux,
    };
  }

  async dossier(
    moderateurId: number,
    contenuId: number,
    maintenant = new Date(),
  ): Promise<DossierModerationApi> {
    const presente = (await presenterContenus(this.db, this.stockage, [contenuId])).get(contenuId);
    if (!presente) throw introuvable('Ce contenu est introuvable.');
    if (presente.auteur.id === moderateurId)
      throw interdit(
        'Ce contenu est le vôtre : un autre membre de l’équipe de modération examine son dossier.',
      );
    const auteurId = presente.auteur.id;

    const [details, signalements, surLeContenu, historique, [suspension]] = await Promise.all([
      detailsDuContenu(this.db, contenuId),
      this.db
        .select()
        .from(signalement)
        .where(eq(signalement.contenuId, contenuId))
        .orderBy(asc(signalement.date), asc(signalement.id)),
      this.db
        .select()
        .from(decisionModeration)
        .where(eq(decisionModeration.contenuId, contenuId))
        .orderBy(desc(decisionModeration.date), desc(decisionModeration.id)),
      this.db
        .select({ decision: decisionModeration })
        .from(decisionModeration)
        .leftJoin(contenu, eq(contenu.id, decisionModeration.contenuId))
        .where(
          and(
            or(eq(decisionModeration.membreViseId, auteurId), eq(contenu.auteurId, auteurId)),
            or(isNull(decisionModeration.contenuId), ne(decisionModeration.contenuId, contenuId)),
          ),
        )
        .orderBy(desc(decisionModeration.date), desc(decisionModeration.id))
        .limit(HISTORIQUE_MAXIMUM),
      this.db
        .select({ fin: max(decisionModeration.dateFinSuspension) })
        .from(decisionModeration)
        .where(
          and(
            eq(decisionModeration.membreViseId, auteurId),
            eq(decisionModeration.action, 'SUSPENDRE'),
            gt(decisionModeration.dateFinSuspension, maintenant),
          ),
        ),
    ]);
    const signaleurs = await resumerMembres(
      this.db,
      this.stockage,
      signalements.map((s) => s.signaleurId),
    );
    const [decisions, historiqueAuteur] = await Promise.all([
      this.presenter(surLeContenu),
      this.presenter(historique.map((l) => l.decision)),
    ]);
    const derniere = surLeContenu[0];
    return {
      contenu: presente,
      texte: details.texte,
      avertissementAgent: details.avertissementAgent,
      actions: actionsPossibles({ ...presente, avertissementAgent: details.avertissementAgent }),
      signalements: signalements.map((s) => {
        const signaleur = signaleurs.get(s.signaleurId);
        if (!signaleur) throw new Error(`Membre introuvable : ${s.signaleurId}`);
        return {
          id: s.id,
          motif: s.motif,
          precision: s.precision,
          date: s.date.toISOString(),
          statut: s.statut,
          signaleur,
          decisionId: s.decisionId,
        };
      }),
      decisions,
      historiqueAuteur,
      suspensionJusqua: suspension?.fin?.toISOString() ?? null,
      nouvelExamen:
        presente.statut === 'MASQUE' &&
        presente.dateModification !== null &&
        derniere !== undefined &&
        new Date(presente.dateModification) > derniere.date,
    };
  }

  /** Décisions présentées dans l'ordre reçu. */
  async presenter(lignes: LigneDecision[]): Promise<DecisionApi[]> {
    if (!lignes.length) return [];
    const [membres, clos, contenus] = await Promise.all([
      resumerMembres(
        this.db,
        this.stockage,
        lignes.flatMap((d) => [d.decideurId, ...(d.membreViseId === null ? [] : [d.membreViseId])]),
      ),
      this.db
        .select({ decisionId: signalement.decisionId, n: count() })
        .from(signalement)
        .where(
          inArray(
            signalement.decisionId,
            lignes.map((d) => d.id),
          ),
        )
        .groupBy(signalement.decisionId),
      presenterContenus(this.db, this.stockage, [
        ...new Set(lignes.flatMap((d) => (d.contenuId === null ? [] : [d.contenuId]))),
      ]),
    ]);
    const membre = (id: number) => {
      const resume = membres.get(id);
      if (!resume) throw new Error(`Membre introuvable : ${id}`);
      return resume;
    };
    const closParDecision = new Map(clos.map((c) => [c.decisionId, c.n]));
    return lignes.map((d) => ({
      id: d.id,
      action: d.action,
      motif: d.motif,
      date: d.date.toISOString(),
      finSuspension: d.dateFinSuspension?.toISOString() ?? null,
      decideur: membre(d.decideurId),
      contenuId: d.contenuId,
      intituleContenu: d.contenuId === null ? null : (contenus.get(d.contenuId)?.intitule ?? null),
      membreVise: d.membreViseId === null ? null : membre(d.membreViseId),
      signalementsClos: closParDecision.get(d.id) ?? 0,
    }));
  }

  /** Décisions qui retiennent quelque chose contre chacun de ces membres (sanction, ou mesure sur
      l'un de ses contenus), des plus récentes aux plus anciennes. */
  private async historiques(membreIds: number[]) {
    if (!membreIds.length) return new Map<number, { action: ActionDecision; date: Date }[]>();
    const lignes = await this.db
      .select({
        action: decisionModeration.action,
        date: decisionModeration.date,
        membreViseId: decisionModeration.membreViseId,
        auteurId: contenu.auteurId,
      })
      .from(decisionModeration)
      .leftJoin(contenu, eq(contenu.id, decisionModeration.contenuId))
      .where(
        and(
          notInArray(decisionModeration.action, SANS_SUITE),
          or(
            inArray(decisionModeration.membreViseId, membreIds),
            inArray(contenu.auteurId, membreIds),
          ),
        ),
      )
      .orderBy(desc(decisionModeration.date), desc(decisionModeration.id));
    const parMembre = new Map<number, { action: ActionDecision; date: Date }[]>();
    for (const l of lignes) {
      const membreId = l.membreViseId ?? l.auteurId;
      if (membreId === null) continue;
      parMembre.set(membreId, [...(parMembre.get(membreId) ?? []), l]);
    }
    return parMembre;
  }
}
