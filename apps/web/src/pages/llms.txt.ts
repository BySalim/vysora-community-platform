import type { APIRoute } from 'astro';
import { texteLlms } from '../lib/plan-du-site';
import { chargerDonneesPlan } from '../lib/plan-du-site-api';
import { modeIndexation } from '../lib/referencement';

/* /llms.txt : présentation de Vysora pour les assistants d'IA (format llmstxt.org). */
export const GET: APIRoute = async ({ site }) =>
  new Response(
    texteLlms(
      await chargerDonneesPlan(),
      site ?? new URL('http://localhost:4321'),
      modeIndexation(),
    ),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
