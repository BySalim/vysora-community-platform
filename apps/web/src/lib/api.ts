import { estProblemeApi, type ProblemeApi } from '@vysora/shared';

/* Appels à l'API depuis le serveur du site (rendu des pages). Le navigateur, lui, appelle /api
   directement (même origine). Le cookie de session du visiteur est transmis tel quel. */

const API_URL = process.env.API_URL_INTERNE ?? 'http://localhost:3000';
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:4321';

export class ErreurApi extends Error {
  constructor(readonly probleme: ProblemeApi) {
    super(probleme.detail ?? probleme.title);
    this.name = 'ErreurApi';
  }
}

export interface OptionsAppel extends Omit<RequestInit, 'body'> {
  /** Requête du visiteur, dont on reprend le cookie et l'adresse IP. */
  requete?: Request;
  adresseClient?: string;
  corps?: unknown;
}

export async function appelerApi<T>(chemin: string, options: OptionsAppel = {}): Promise<T> {
  return (await appelerApiAvecCookies<T>(chemin, options)).donnees;
}

/** Comme appelerApi, avec les cookies posés par l'API (Set-Cookie), à transmettre au navigateur. */
export async function appelerApiAvecCookies<T>(
  chemin: string,
  options: OptionsAppel = {},
): Promise<{ donnees: T; cookies: string[] }> {
  const { requete, adresseClient, corps, headers, ...init } = options;
  const entetes = new Headers(headers);
  entetes.set('Accept', 'application/json');
  const cookie = requete?.headers.get('cookie');
  if (cookie) entetes.set('Cookie', cookie);
  if (adresseClient) entetes.set('X-Forwarded-For', adresseClient);
  if (corps !== undefined) {
    entetes.set('Content-Type', 'application/json');
    // Requête qui modifie des données : l'API vérifie qu'elle vient du site (protection CSRF).
    entetes.set('Origin', new URL(SITE_URL).origin);
  }

  const reponse = await fetch(new URL(chemin, API_URL), {
    ...init,
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });

  const texte = await reponse.text();
  const donnees: unknown = texte ? JSON.parse(texte) : undefined;
  if (!reponse.ok) {
    throw new ErreurApi(
      estProblemeApi(donnees)
        ? donnees
        : {
            type: 'about:blank',
            title: 'Le service est momentanément indisponible.',
            status: reponse.status,
            code: 'ERREUR_INTERNE',
          },
    );
  }
  return { donnees: donnees as T, cookies: reponse.headers.getSetCookie() };
}
