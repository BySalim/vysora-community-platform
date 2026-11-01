import type { ActionAudit } from '@vysora/shared';
import type { Executeur } from '../../db/client.js';
import { journalAudit } from '../../db/schema/index.js';

/** Inscrit un changement des référentiels au journal d'audit (ENF-09) ; sans cible, un changement qui
    porte sur tout un référentiel (son ordre d'affichage). */
export async function auditer(
  db: Executeur,
  acteurId: number,
  action: ActionAudit,
  cibleType: string | null,
  cibleId: number | null,
  details?: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(journalAudit)
    .values({ acteurId, action, cibleType, cibleId, details: details ?? null });
}
