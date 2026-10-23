/* Appels à l'API depuis le navigateur, sur la même origine (/api, relais du site, ADR-0007).
   Le cookie de session part tout seul ; une erreur arrive au format RFC 9457 (ProblemeApi). */

import { estProblemeApi, typeProbleme, type ProblemeApi } from '@vysora/shared';

export type ReponseApi<T> = { ok: true; donnees: T } | { ok: false; probleme: ProblemeApi };

/** Panne du réseau ou réponse illisible : le message reste celui d'un service indisponible. */
const indisponible = (status: number): ProblemeApi => ({
  type: typeProbleme('ERREUR_INTERNE'),
  title: 'Le service est momentanément indisponible.',
  status,
  code: 'ERREUR_INTERNE',
});

export async function api<T = undefined>(
  methode: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  chemin: string,
  corps?: unknown,
): Promise<ReponseApi<T>> {
  try {
    const init: RequestInit = { method: methode, headers: { Accept: 'application/json' } };
    if (corps !== undefined) {
      init.headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      init.body = JSON.stringify(corps);
    }
    const reponse = await fetch(chemin, init);
    const texte = await reponse.text();
    const donnees: unknown = texte ? JSON.parse(texte) : undefined;
    if (reponse.ok) return { ok: true, donnees: donnees as T };
    return {
      ok: false,
      probleme: estProblemeApi(donnees) ? donnees : indisponible(reponse.status),
    };
  } catch {
    return { ok: false, probleme: indisponible(0) };
  }
}
