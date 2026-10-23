import type { APIRoute } from 'astro';

/* Relais /api/* → API : le navigateur reste sur la même origine (cookie de session, protection CSRF),
   en développement comme en production. Un serveur frontal (Caddy) peut aussi envoyer /api
   directement à l'API ; ce relais ne sert alors plus. Rien n'est modifié au passage. */

const API_URL = process.env.API_URL_INTERNE ?? 'http://localhost:3000';
const ENTETES_TRANSMIS = [
  'accept',
  'accept-language',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
];
const ENTETES_RETIRES = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

export const ALL: APIRoute = async ({ request, params, url, clientAddress }) => {
  const cible = new URL(`/api/${params.chemin ?? ''}${url.search}`, API_URL);
  const entetes = new Headers();
  for (const nom of ENTETES_TRANSMIS) {
    const valeur = request.headers.get(nom);
    if (valeur) entetes.set(nom, valeur);
  }
  // L'API fait confiance au relais local pour connaître l'adresse du visiteur (limites d'envoi).
  entetes.set('x-forwarded-for', clientAddress);
  entetes.set('x-forwarded-proto', url.protocol.replace(':', ''));

  const avecCorps = request.method !== 'GET' && request.method !== 'HEAD';
  let reponse: Response;
  try {
    reponse = await fetch(cible, {
      method: request.method,
      headers: entetes,
      // Corps lu en entier puis transmis : les envois restent petits (JSON, images de 5 Mo au plus),
      // et un flux relayé tel quel bloque avec le serveur de développement.
      body: avecCorps ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      {
        type: 'urn:vysora:probleme:erreur_interne',
        title: 'Le service est momentanément indisponible.',
        status: 503,
        code: 'ERREUR_INTERNE',
      },
      { status: 503, headers: { 'content-type': 'application/problem+json' } },
    );
  }

  const sortie = new Headers(reponse.headers);
  for (const nom of ENTETES_RETIRES) sortie.delete(nom);
  return new Response(reponse.body, {
    status: reponse.status,
    statusText: reponse.statusText,
    headers: sortie,
  });
};
