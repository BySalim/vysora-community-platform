import type { Executeur } from '../../db/client.js';
import { journalAudit } from '../../db/schema/index.js';

/** Inscrit un changement des référentiels au journal d'audit (ENF-09). */
export async function auditer(
  db: Executeur,
  acteurId: number,
  action: string,
  cibleType: string,
  cibleId: number,
  details?: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(journalAudit)
    .values({ acteurId, action, cibleType, cibleId, details: details ?? null });
}
