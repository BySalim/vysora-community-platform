/* Le compte suit les changements faits ailleurs, sans recharger la page à la main :
   - dans le même navigateur, l'onglet qui confirme l'adresse (lien reçu par e-mail) ou accepte les
     conditions prévient aussitôt les autres onglets de Vysora (événement « storage », émis dans
     chaque autre onglet de la même origine quand une clé change ; la clé ne porte qu'une date) ;
   - sur un autre appareil (lien ouvert sur le téléphone), la page vérifie l'état du compte quand
     on revient sur son onglet, tant que le compte est en lecture seule.
   La règle (mise à jour sur place, ou nouvelle page) est dans lib/suivi-compte. */

import type { SessionApi } from '@vysora/shared';
import { effetChangement } from '../../lib/suivi-compte';
import { api } from './api';
import { etats } from './etats';
import { $$, messageApresChargement, toast } from './outils';

const CLE_ANNONCE = 'vysora:compte-change';
const ecouteurs = new Set<() => void>();
const INTERVALLE_MINIMAL_MS = 5_000;
let enCours = false;
let derniereLecture = 0;

/** Prévient les autres onglets que le compte vient de changer (adresse confirmée, conditions). */
export function annoncerChangementCompte(): void {
  try {
    localStorage.setItem(CLE_ANNONCE, String(Date.now()));
  } catch {
    // Stockage indisponible (navigation privée stricte) : les autres onglets suivront à leur retour.
  }
}

/** Appelé quand un autre onglet annonce un changement (pages qui gèrent leur propre état). */
export function surChangementCompte(ecouteur: () => void): void {
  ecouteurs.add(ecouteur);
}

/** Relit la session et met la page à jour. Sans `force`, seulement pour un compte en lecture
    seule (adresse à confirmer, conditions à accepter), et pas plus d'une fois toutes les 5 s. */
async function suivre(force = false): Promise<void> {
  if (enCours || document.hidden || !etats.membre()) return;
  const compte = etats.get().compte;
  if (!force && compte !== 'email' && compte !== 'conditions') return;
  if (!force && Date.now() - derniereLecture < INTERVALLE_MINIMAL_MS) return;
  enCours = true;
  derniereLecture = Date.now();
  try {
    const reponse = await api<SessionApi>('GET', '/api/v1/session');
    if (!reponse.ok) return;
    const effet = effetChangement(etats.get(), reponse.donnees.etat);
    if (!effet) return;
    // Un bloc d'accès rendu par le serveur remplace du contenu : seule une nouvelle page le montre.
    if (effet.recharger || $$('[data-acces-bloc]').length) {
      if (effet.message) messageApresChargement(effet.message);
      location.reload();
      return;
    }
    const motifs = new Set(['email', 'conditions', 'suspendu']);
    motifs.delete(reponse.donnees.etat.compte);
    for (const bandeau of $$('[data-etat-bandeau]'))
      if (motifs.has(bandeau.dataset.motif ?? '')) bandeau.remove();
    etats.appliquer(reponse.donnees);
    if (effet.message) toast(effet.message);
  } finally {
    enCours = false;
  }
}

window.addEventListener('storage', (evenement) => {
  if (evenement.key !== CLE_ANNONCE) return;
  for (const ecouteur of ecouteurs) ecouteur();
  void suivre(true);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void suivre();
});
window.addEventListener('focus', () => void suivre());
