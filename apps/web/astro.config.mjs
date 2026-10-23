// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// Site rendu côté serveur (SSR) : chaque page est un document complet, comme dans le prototype.
// Le navigateur appelle l'API sur la même origine (/api) : src/pages/api/[...chemin].ts relaie
// la requête ; en production, le serveur frontal peut envoyer /api directement à l'API.
export default defineConfig({
  output: 'server',
  // Corps de requête plafonné : le relais /api le lit en entier (images de 5 Mo au plus, JSON de 2 Mo).
  adapter: node({ mode: 'standalone', bodySizeLimit: 10 * 1024 * 1024 }),
  server: { port: 4321, host: true },
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  trailingSlash: 'never',
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Les pages du prototype règlent leurs animations par des attributs style (--i, --h…).
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  devToolbar: { enabled: false },
  // Le Markdown des membres est rendu par l'application (assaini) ; Shiki, incompatible avec la CSP, n'est pas utilisé.
  markdown: { syntaxHighlight: false },
  vite: {
    envDir: '../../',
  },
});
