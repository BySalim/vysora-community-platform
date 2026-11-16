/* LEG-03 : relevés du navigateur pour la mesure d'audience. Les erreurs des scripts du site (au plus
   trois par page, chacune une fois) sont comptées par page, de façon anonyme ; une recherche ne
   s'inscrit que dans une visite suivie, sans les mots cherchés. Rien ne part si la personne refuse la
   mesure sans avoir accepté le suivi de ses parcours. */

import { audienceRefusee, cheminMesure, parcoursAccepte } from '@vysora/shared';

type Releve = { type: 'ERREUR'; message: string } | { type: 'RECHERCHE' };

const ERREURS_PAR_PAGE = 3;
const envoyees = new Set<string>();

function envoyer(releve: Releve): void {
  const page = cheminMesure(location.pathname + location.search) ?? location.pathname;
  void fetch('/api/v1/audience/evenements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...releve, page }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Recherche lancée depuis la recherche du site (visite suivie seulement). */
export function signalerRecherche(): void {
  if (parcoursAccepte(document.cookie)) envoyer({ type: 'RECHERCHE' });
}

function signalerErreur(message: string): void {
  const texte = message.trim().slice(0, 1000);
  if (!texte || envoyees.has(texte) || envoyees.size >= ERREURS_PAR_PAGE) return;
  if (audienceRefusee(document.cookie) && !parcoursAccepte(document.cookie)) return;
  envoyees.add(texte);
  envoyer({ type: 'ERREUR', message: texte });
}

window.addEventListener('error', (evenement) => {
  // Seules les erreurs des scripts du site : ni extensions du navigateur, ni ressources manquantes.
  if (!(evenement instanceof ErrorEvent) || !evenement.message) return;
  if (evenement.filename && !evenement.filename.startsWith(location.origin)) return;
  signalerErreur(evenement.message);
});

window.addEventListener('unhandledrejection', (evenement) => {
  const raison: unknown = evenement.reason;
  if (raison instanceof Error) signalerErreur(`${raison.name}: ${raison.message}`);
  else if (typeof raison === 'string') signalerErreur(raison);
});
