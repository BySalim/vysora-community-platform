import type { GuidesApi } from '@vysora/shared';
import { appelerApi } from './api';
import type { DonneesPlan } from './plan-du-site';

/** Guides et domaines publiés, lus dans l'API ; sans réponse de l'API, le plan garde les pages fixes. */
export async function chargerDonneesPlan(): Promise<DonneesPlan> {
  try {
    const index = await appelerApi<GuidesApi>('/api/v1/guides');
    return { guides: index.elements, domaines: index.domaines };
  } catch {
    return { guides: [], domaines: [] };
  }
}
