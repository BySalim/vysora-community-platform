import type { APIRoute } from 'astro';
import { entreesPlan } from '../lib/plan-du-site';
import { chargerDonneesPlan } from '../lib/plan-du-site-api';
import { modeIndexation, planDuSite } from '../lib/referencement';

/* /sitemap.xml : pages de l'équipe (lib/plan-du-site.ts) ; vide quand le site n'est pas indexé. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const entrees = modeIndexation() === 'aucune' ? [] : entreesPlan(await chargerDonneesPlan());
  return new Response(planDuSite(entrees, base), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
