import { defineMiddleware } from 'astro:middleware';
import { chargerSession } from './lib/session';

/* Pour chaque page : personne qui consulte (Astro.locals) et en-têtes de sécurité.
   La politique de sécurité du contenu (CSP) est produite par Astro (astro.config.mjs, security.csp). */
export const onRequest = defineMiddleware(async (contexte, suite) => {
  // Le relais /api transmet la requête telle quelle : pas de session à charger pour lui.
  if (contexte.url.pathname.startsWith('/api/')) return suite();

  const session = await chargerSession(contexte.request);
  contexte.locals.etat = session.etat;
  contexte.locals.nonLues = session.nonLues;
  contexte.locals.membre = session.membre;

  const reponse = await suite();
  const entetes = reponse.headers;
  // Session prolongée (ou effacée) par l'API : le navigateur reçoit le cookie à jour.
  for (const cookie of session.cookies) entetes.append('Set-Cookie', cookie);
  // Une page rendue pour un membre est personnelle : aucun cache partagé ne doit la garder.
  if (session.membre) entetes.set('Cache-Control', 'private, no-store');
  entetes.set('X-Content-Type-Options', 'nosniff');
  entetes.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  entetes.set('X-Frame-Options', 'DENY');
  entetes.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (import.meta.env.PROD)
    entetes.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return reponse;
});
