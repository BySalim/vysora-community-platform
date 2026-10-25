import type { MasquageApi } from '@vysora/shared';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { contenu, decisionModeration, signalement } from '../../db/schema/index.js';

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

/** RG-30 : masquage de ces contenus masqués, tel que leur auteur et la modération le voient (date et
    motif de la dernière décision « masquer »). Le nombre de signalements que la décision a clos n'est
    donné qu'à la modération. Sans décision, la date est celle du masquage automatique (F-93). */
export async function lireMasquages(
  db: BaseDeDonnees,
  ids: number[],
  pourLaModeration: boolean,
): Promise<Map<number, MasquageApi>> {
  if (!ids.length) return new Map();
  const [decisions, automatiques] = await Promise.all([
    derniersMasquages(db, ids),
    db
      .select({ id: contenu.id, date: contenu.dateMasquageAutomatique })
      .from(contenu)
      .where(inArray(contenu.id, ids)),
  ]);
  const clos = new Map(
    pourLaModeration && decisions.length
      ? (
          await db
            .select({ decisionId: signalement.decisionId, n: count() })
            .from(signalement)
            .where(
              inArray(
                signalement.decisionId,
                decisions.map((d) => d.id),
              ),
            )
            .groupBy(signalement.decisionId)
        ).map((l) => [l.decisionId, l.n])
      : [],
  );
  const parContenu = new Map(decisions.map((d) => [d.contenuId, d]));
  return new Map(
    automatiques.map(({ id, date }) => {
      const decision = parContenu.get(id);
      return [
        id,
        {
          date: (decision?.date ?? date)?.toISOString() ?? null,
          motif: decision?.motif ?? null,
          signalements: pourLaModeration ? (decision ? (clos.get(decision.id) ?? 0) : 0) : null,
        },
      ];
    }),
  );
}
