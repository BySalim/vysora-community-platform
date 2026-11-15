import type { MasquageApi } from '@vysora/shared';
import { and, asc, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { contenu, decisionModeration, signalement } from '../../db/schema/index.js';

/** F-93 : le contenu est masqué par l'outil automatisé et aucune décision ne l'a examiné depuis
    (masquage provisoire, en tête de la file). S'emploie dans une requête sur la table `contenu`. */
export const masquageProvisoire = sql<boolean>`(contenu.statut = 'MASQUE'
  and contenu.date_masquage_automatique is not null
  and not exists (select 1 from decision_moderation dm
    where dm.contenu_id = contenu.id and dm.date >= contenu.date_masquage_automatique))`;

/** Date du masquage provisoire (F-93), null si le contenu n'est pas dans ce cas. */
export const dateDuMasquageProvisoire = sql`case when ${masquageProvisoire}
  then contenu.date_masquage_automatique end`.mapWith(contenu.dateMasquageAutomatique);

/** Dernière décision « masquer » de chacun de ces contenus. */
export async function derniersMasquages(db: Executeur, ids: number[]) {
  if (!ids.length) return [];
  return db
    .selectDistinctOn([decisionModeration.contenuId], {
      id: decisionModeration.id,
      contenuId: decisionModeration.contenuId,
      date: decisionModeration.date,
      motif: decisionModeration.motif,
    })
    .from(decisionModeration)
    .where(
      and(eq(decisionModeration.action, 'MASQUER'), inArray(decisionModeration.contenuId, ids)),
    )
    .orderBy(
      asc(decisionModeration.contenuId),
      desc(decisionModeration.date),
      desc(decisionModeration.id),
    );
}

/** RG-82 : dates des masquages encore en cours d'un contenu, auxquelles ses points ont été annulés :
    la dernière décision « masquer » et le masquage automatique (F-93), s'ils suivent le dernier
    rétablissement. Les deux s'ajoutent quand une décision confirme un masquage automatique. */
export async function datesDuMasquageEnCours(db: Executeur, contenuId: number): Promise<Date[]> {
  const [[decisions], [ligne]] = await Promise.all([
    db
      .select({
        masque: max(sql`case when ${decisionModeration.action} = 'MASQUER'
          then ${decisionModeration.date} end`).mapWith(decisionModeration.date),
        retabli: max(sql`case when ${decisionModeration.action} = 'RETABLIR'
          then ${decisionModeration.date} end`).mapWith(decisionModeration.date),
      })
      .from(decisionModeration)
      .where(eq(decisionModeration.contenuId, contenuId)),
    db
      .select({ automatique: contenu.dateMasquageAutomatique })
      .from(contenu)
      .where(eq(contenu.id, contenuId)),
  ]);
  const retabli = decisions?.retabli ?? null;
  return [decisions?.masque ?? null, ligne?.automatique ?? null].filter(
    (date): date is Date => date !== null && (retabli === null || date > retabli),
  );
}

/** RG-30 : masquage de ces contenus masqués, tel que leur auteur et la modération le voient (date et
    motif de la dernière décision « masquer »). Le nombre de signalements que la décision a clos n'est
    donné qu'à la modération. Un masquage automatique qui attend l'examen d'un modérateur (F-93) a
    la date du masquage, sans motif ; la modération y lit le nombre de signalements ouverts. */
export async function lireMasquages(
  db: BaseDeDonnees,
  ids: number[],
  pourLaModeration: boolean,
): Promise<Map<number, MasquageApi>> {
  if (!ids.length) return new Map();
  const [decisions, automatiques] = await Promise.all([
    derniersMasquages(db, ids),
    db
      .select({
        id: contenu.id,
        date: contenu.dateMasquageAutomatique,
        provisoire: masquageProvisoire,
      })
      .from(contenu)
      .where(inArray(contenu.id, ids)),
  ]);
  const provisoires = automatiques.filter((a) => a.provisoire).map((a) => a.id);
  const [clos, ouverts] = await Promise.all([
    pourLaModeration && decisions.length
      ? db
          .select({ id: signalement.decisionId, n: count() })
          .from(signalement)
          .where(
            inArray(
              signalement.decisionId,
              decisions.map((d) => d.id),
            ),
          )
          .groupBy(signalement.decisionId)
      : [],
    pourLaModeration && provisoires.length
      ? db
          .select({ id: signalement.contenuId, n: count() })
          .from(signalement)
          .where(and(eq(signalement.statut, 'OUVERT'), inArray(signalement.contenuId, provisoires)))
          .groupBy(signalement.contenuId)
      : [],
  ]);
  const closParDecision = new Map(clos.map((l) => [l.id, l.n]));
  const ouvertsParContenu = new Map(ouverts.map((l) => [l.id, l.n]));
  const parContenu = new Map(decisions.map((d) => [d.contenuId, d]));
  return new Map(
    automatiques.map(({ id, date, provisoire }): [number, MasquageApi] => {
      if (provisoire)
        return [
          id,
          {
            date: date?.toISOString() ?? null,
            motif: null,
            signalements: pourLaModeration ? (ouvertsParContenu.get(id) ?? 0) : null,
            automatique: true,
          },
        ];
      const decision = parContenu.get(id);
      return [
        id,
        {
          date: (decision?.date ?? date)?.toISOString() ?? null,
          motif: decision?.motif ?? null,
          signalements: pourLaModeration
            ? decision
              ? (closParDecision.get(decision.id) ?? 0)
              : 0
            : null,
          automatique: false,
        },
      ];
    }),
  );
}
