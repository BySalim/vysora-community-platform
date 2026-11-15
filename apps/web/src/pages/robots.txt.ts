import type { APIRoute } from 'astro';
import { modeIndexation, texteRobots } from '../lib/referencement';

/* /robots.txt : consignes aux robots selon INDEXATION (lib/referencement.ts). */
export const GET: APIRoute = ({ site }) =>
  new Response(texteRobots(site ?? new URL('http://localhost:4321'), modeIndexation()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
