/* Pages légales (portage de prototype/documents-legaux.js). Le serveur a rendu la version, les
   changements, les onglets, « L'essentiel », le sommaire et l'acceptation ; ce script ajoute ce qui
   réagit à la lecture : sommaire qui suit le défilement, article visé mis en évidence, liens copiés,
   impression, acceptation des nouvelles versions (POST /api/v1/moi/acceptations) et choix sur la
   mesure d'audience (page Cookies). */

import { schemaAcceptationDocuments, type SessionApi } from '@vysora/shared';
import {
  COOKIE_AUDIENCE,
  DUREE_COOKIE_AUDIENCE,
  pagesAAccepter,
  rendreAcceptation,
  rendreChangement,
  rendreChoixAudience,
  rendreDocuments,
  type ContextePageLegale,
  type InfoArticle,
} from '../lib/pages-legales';
import { api } from './commun/api';
import { $, $$, corrigerTypographie, icon, t, toast } from './commun/outils';

interface DonneesPage {
  contexte: ContextePageLegale;
  cibleChangement: InfoArticle | null;
}

function lireDonnees(): DonneesPage | null {
  try {
    return JSON.parse($('#lg-donnees')?.textContent ?? '') as DonneesPage;
  } catch {
    return null;
  }
}

/** Espaces insécables propres aux textes légaux : nombre et unité (« 24 heures »), noms de licences. */
function insecables(zone: Node): void {
  const parcours = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT);
  const noeuds: Node[] = [];
  while (parcours.nextNode()) noeuds.push(parcours.currentNode);
  for (const noeud of noeuds) {
    const corrige = (noeud.nodeValue ?? '')
      .replace(/(\d) (?=[a-zà-ÿ])/g, '$1 ')
      .replace(/\b(CC) (BY(?:-[A-Z]{2})?) (\d\.\d)/g, '$1 $2 $3')
      .replace(/\b(CC0) (\d\.\d)/g, '$1 $2');
    if (corrige !== noeud.nodeValue) noeud.nodeValue = corrige;
  }
}
const typographie = (zone: Node | null) => {
  if (!zone) return;
  corrigerTypographie(zone);
  insecables(zone);
};

/* Sommaire qui suit la lecture ---------------------------------------------------- */

const articles = $$('.lg-article');
let actif: string | null = null;

function placerRepere(): void {
  const repere = $('[data-lg-repere]');
  const lien = actif ? $(`.lg-sommaire [data-lg-vers="${actif}"]`) : null;
  if (!repere) return;
  if (!lien || !lien.offsetParent) {
    repere.classList.remove('is-visible');
    return;
  }
  repere.style.setProperty('--y', `${lien.offsetTop}px`);
  repere.style.setProperty('--h', `${lien.offsetHeight}px`);
  repere.classList.add('is-visible');
}

function activer(id: string | null): void {
  if (id === actif) return;
  actif = id;
  for (const lien of $$('[data-lg-vers]')) {
    if (lien.dataset.lgVers === id) lien.setAttribute('aria-current', 'true');
    else lien.removeAttribute('aria-current');
  }
  placerRepere();
  const lien = id ? $(`.lg-sommaire [data-lg-vers="${id}"]`) : null;
  const rail = $('.lg-rail');
  if (lien && rail && rail.scrollHeight > rail.clientHeight) {
    const haut = lien.offsetTop - rail.clientHeight / 2;
    rail.scrollTo({ top: Math.max(0, haut), behavior: 'instant' });
  }
}

function suivreLecture(): void {
  let enAttente = false;
  const calculer = () => {
    enAttente = false;
    const ligne = window.innerHeight * 0.28;
    let courant: string | null = null;
    for (const section of articles)
      if (section.getBoundingClientRect().top - ligne <= 0) courant = section.id;
    const fin = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const dernier = articles.at(-1);
    if (fin && dernier && dernier.getBoundingClientRect().top < window.innerHeight)
      courant = dernier.id;
    activer(courant);
  };
  const demander = () => {
    if (!enAttente) {
      enAttente = true;
      requestAnimationFrame(calculer);
    }
  };
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', () => {
    demander();
    placerRepere();
  });
  calculer();
}

/* Liens d'articles, article visé, impression ----------------------------------------- */

const adresse = (id?: string) => `${location.href.split('#')[0]}${id ? `#${id}` : ''}`;

async function copier(texte: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texte);
    toast(message, 'link');
  } catch {
    window.prompt('Copiez ce lien :', texte);
  }
}

function brancherLiens(): void {
  document.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-lg-ancre]');
    const id = bouton?.dataset.lgAncre;
    if (!id) return;
    history.replaceState(null, '', `#${id}`);
    void copier(adresse(id), 'Lien copié.');
  });
  $('[data-lg-lien]')?.addEventListener('click', () => {
    void copier(adresse(), 'Lien du document copié.');
  });
  $('[data-lg-imprimer]')?.addEventListener('click', () => window.print());
}

let minuterieCible: ReturnType<typeof setTimeout> | undefined;
function marquerCible(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  const section = id ? articles.find((article) => article.id === id) : undefined;
  for (const article of $$('.lg-article.is-cible')) article.classList.remove('is-cible');
  clearTimeout(minuterieCible);
  if (!section) return;
  void section.offsetWidth;
  section.classList.add('is-cible');
  minuterieCible = setTimeout(() => section.classList.remove('is-cible'), 2800);
}

/* Acceptation des nouvelles versions (RG-03) ------------------------------------------ */

function brancherAcceptation(donnees: DonneesPage): void {
  const zone = $('[data-lg-acceptation]');
  if (!zone) return;
  const { contexte } = donnees;

  /** Après l'acceptation : en-tête, onglets et acceptation rendus de nouveau, bandeau retiré. */
  const appliquer = (session: SessionApi) => {
    contexte.aAccepter = [];
    contexte.conditionsDepuis = session.conditionsDepuis;
    const changement = $('[data-lg-changement]');
    if (changement && !changement.hidden)
      changement.innerHTML = rendreChangement(contexte, donnees.cibleChangement ?? undefined);
    const onglets = $('[data-lg-documents]');
    if (onglets) onglets.innerHTML = rendreDocuments(contexte);
    zone.innerHTML = rendreAcceptation(contexte);
    typographie($('.lg-tete'));
    typographie(zone);
    document.documentElement.dataset.compte = session.etat.compte;
    if (session.etat.compte !== 'conditions')
      $('[data-etat-bandeau][data-motif="conditions"]')?.remove();
    placerRepere();
  };

  zone.addEventListener('change', (evenement) => {
    const caseAccord = evenement.target as HTMLInputElement;
    if (caseAccord.id !== 'lg-accord') return;
    const erreur = $('#lg-accord-erreur', zone);
    if (erreur) erreur.hidden = true;
    caseAccord.removeAttribute('aria-invalid');
  });

  zone.addEventListener('submit', async (evenement) => {
    const form = (evenement.target as Element).closest<HTMLFormElement>('[data-lg-accord]');
    if (!form) return;
    evenement.preventDefault();
    const caseAccord = $<HTMLInputElement>('#lg-accord', form)!;
    const erreur = $('#lg-accord-erreur', form)!;
    const bouton = $<HTMLButtonElement>('button[type="submit"]', form)!;
    const signaler = (message: string) => {
      erreur.innerHTML = `${icon('alert', '')}<span>${t(message)}</span>`;
      erreur.hidden = false;
      caseAccord.setAttribute('aria-invalid', 'true');
      caseAccord.focus();
    };

    const plusieurs = pagesAAccepter(contexte).length > 1;
    const saisie = { accepte: caseAccord.checked || undefined };
    if (!schemaAcceptationDocuments.safeParse(saisie).success) {
      signaler(
        plusieurs
          ? 'Cochez la case pour accepter les nouvelles versions.'
          : 'Cochez la case pour accepter la nouvelle version.',
      );
      return;
    }
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    const reponse = await api<SessionApi>('POST', '/api/v1/moi/acceptations', saisie);
    bouton.disabled = false;
    bouton.removeAttribute('aria-busy');
    if (!reponse.ok) {
      signaler(reponse.probleme.erreurs?.accepte ?? reponse.probleme.title);
      return;
    }
    appliquer(reponse.donnees);
    toast(plusieurs ? 'Nouvelles versions acceptées.' : 'Nouvelle version acceptée.');
    $('#acceptation-titre')?.focus({ preventScroll: true });
  });
}

/* Mesure d'audience : refus retenu par un cookie sur cet appareil (page Cookies) ------------- */

function retenirChoixAudience(refus: boolean): void {
  const securise = location.protocol === 'https:' ? '; Secure' : '';
  const valeur = refus ? `refusee; Max-Age=${DUREE_COOKIE_AUDIENCE}` : '; Max-Age=0';
  // oxlint-disable-next-line unicorn/no-document-cookie -- cookie strictement nécessaire, sans valeur sensible
  document.cookie = `${COOKIE_AUDIENCE}=${valeur}; Path=/; SameSite=Lax${securise}`;
}

function brancherChoixAudience(): void {
  const zone = $('[data-lg-audience]');
  if (!zone) return;
  zone.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest('[data-lg-audience-bouton]');
    if (!bouton) return;
    const refuser = bouton.getAttribute('aria-checked') === 'true';
    retenirChoixAudience(refuser);
    zone.innerHTML = rendreChoixAudience(!refuser);
    typographie(zone);
    $('[data-lg-audience-bouton]', zone)?.focus();
    toast(refuser ? 'Vos visites ne sont plus comptées.' : 'Vos visites sont de nouveau comptées.');
  });
}

/* Mise en route ------------------------------------------------------------------- */

/* Tableaux empilés sur mobile : chaque cellule reprend l'intitulé de sa colonne. */
for (const table of $$('.lg-tableau-empile')) {
  const entetes = $$('thead th', table).map((th) => th.textContent?.trim() ?? '');
  for (const ligne of $$('tbody tr', table))
    [...ligne.children].forEach((cellule, i) => {
      if (cellule instanceof HTMLTableCellElement && cellule.tagName === 'TD' && entetes[i])
        cellule.dataset.label = entetes[i];
    });
}

const donnees = lireDonnees();
brancherLiens();
if (donnees) brancherAcceptation(donnees);
brancherChoixAudience();
typographie($('main'));
window.addEventListener('hashchange', marquerCible);
suivreLecture();
marquerCible();
void document.fonts?.ready.then(placerRepere);
