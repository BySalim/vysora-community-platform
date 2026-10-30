import type { APIContext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { ROUTES } from './lib/navigation';
import { chargerSession } from './lib/session';

/* Pour chaque page : personne qui consulte (Astro.locals) et en-têtes de sécurité.
   La politique de sécurité du contenu (CSP) est produite par Astro (astro.config.mjs, security.csp). */
export const onRequest = defineMiddleware(async (contexte, suite) => {
  // Le relais /api transmet la requête telle quelle : pas de session à charger pour lui.
  if (contexte.url.pathname.startsWith('/api/')) return suite();

  const session = await chargerSession(contexte.request, adresseDuClient(contexte));
  contexte.locals.etat = session.etat;
  contexte.locals.nonLues = session.nonLues;
  contexte.locals.membre = session.membre;
  contexte.locals.suspensionJusqua = session.suspensionJusqua;
  contexte.locals.conditionsDepuis = session.conditionsDepuis;
  contexte.locals.deuxFacteurs = session.deuxFacteurs ?? null;

  // SEC-02 : la modération et l'administration attendent la vérification en deux étapes.
  const reservee = /^\/(moderation|administration)(\/|$)/.test(contexte.url.pathname);
  if (reservee && session.deuxFacteurs) {
    const retour = encodeURIComponent(contexte.url.pathname + contexte.url.search);
    const redirection = contexte.redirect(`${ROUTES.connexion}?retour=${retour}`, 302);
    for (const cookie of session.cookies) redirection.headers.append('Set-Cookie', cookie);
    return redirection;
  }

  const reponse = await suite();
  const entetes = reponse.headers;
  // Échéance de la session repoussée ou cookie périmé effacé par l'API : le navigateur en est informé.
  for (const cookie of session.cookies) entetes.append('Set-Cookie', cookie);
  entetes.set('X-Content-Type-Options', 'nosniff');
  entetes.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // L'aperçu de la fiche s'affiche dans un cadre de l'éditeur (CREA-02), sur le même site seulement.
  const apercu =
    contexte.url.pathname.startsWith('/creations/') && contexte.url.searchParams.has('apercu');
  entetes.set('X-Frame-Options', apercu ? 'SAMEORIGIN' : 'DENY');
  entetes.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (import.meta.env.PROD)
    entetes.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return reponse;
});

/** Adresse du visiteur, transmise à l'API pour ses limites de débit (sinon, tous partageraient celle du site). */
function adresseDuClient(contexte: APIContext): string | undefined {
  try {
    return contexte.clientAddress;
  } catch {
    return undefined;
  }
}
