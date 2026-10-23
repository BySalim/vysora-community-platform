/* Pages légales (prototype/documents-legaux.js) : sommaire qui suit la lecture, liens de section,
   impression, choix sur la mesure d'audience (page Cookies) et acceptation des nouvelles versions
   (conditions et charte). Le contenu (sommaire, « L'essentiel », versions) est rendu par le serveur. */

import { DOCUMENTS_ACCEPTES, accepterDocuments } from './commun/acces';
import { $, $$, icon, toast } from './commun/outils';

const sections = $$('.lg-article');

/* Sommaire : repère sur la section en cours de lecture ------------------------------------------ */

let actif: string | null = null;

function placerRepere(): void {
  const repere = $('[data-lg-repere]');
  if (!repere) return;
  const lien = actif ? $(`.lg-sommaire [data-lg-vers="${CSS.escape(actif)}"]`) : null;
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
  const lien = id ? $(`.lg-sommaire [data-lg-vers="${CSS.escape(id)}"]`) : null;
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
    for (const section of sections)
      if (section.getBoundingClientRect().top - ligne <= 0) courant = section.id;
    const fin = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const dernier = sections.at(-1);
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

/* Liens de section, lien du document, impression ------------------------------------------------ */

const adresse = (id?: string) => `${location.href.split('#')[0]}${id ? `#${id}` : ''}`;

async function copier(texte: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texte);
    toast(message, 'link');
  } catch {
    window.prompt('Copiez ce lien :', texte);
  }
}

document.addEventListener('click', (evenement) => {
  const bouton = (evenement.target as Element).closest<HTMLElement>('[data-lg-ancre]');
  if (!bouton) return;
  const id = bouton.dataset.lgAncre ?? '';
  history.replaceState(null, '', `#${id}`);
  void copier(adresse(id), 'Lien copié.');
});
$('[data-lg-lien]')?.addEventListener('click', () => {
  void copier(adresse(), 'Lien du document copié.');
});
$('[data-lg-imprimer]')?.addEventListener('click', () => window.print());

/* Section visée par l'adresse : brièvement mise en évidence. */
let minuterieCible: ReturnType<typeof setTimeout> | undefined;
function marquerCible(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  const section = id ? sections.find((s) => s.id === id) : undefined;
  for (const s of $$('.lg-article.is-cible')) s.classList.remove('is-cible');
  clearTimeout(minuterieCible);
  if (!section) return;
  void section.offsetWidth;
  section.classList.add('is-cible');
  minuterieCible = setTimeout(() => section.classList.remove('is-cible'), 2800);
}

/* Tableaux empilés sur mobile : chaque cellule reprend l'intitulé de sa colonne. */
for (const tableau of $$('.lg-tableau-empile')) {
  const entetes = $$('thead th', tableau).map((th) => th.textContent?.trim() ?? '');
  for (const ligne of $$('tbody tr', tableau))
    [...ligne.children].forEach((cellule, i) => {
      const entete = entetes[i];
      if (cellule instanceof HTMLTableCellElement && cellule.tagName === 'TD' && entete)
        cellule.dataset.label = entete;
    });
}

/* Mesure d'audience (page Cookies) : le refus est retenu 13 mois par un cookie, comme l'annonce
   la liste des cookies ; sans refus, aucun cookie n'est déposé. */

const COOKIE_AUDIENCE = 'vysora_audience';
const TREIZE_MOIS = 13 * 30 * 24 * 60 * 60;

const audienceRefusee = () =>
  document.cookie.split('; ').some((c) => c === `${COOKIE_AUDIENCE}=refusee`);

function retenirAudience(refusee: boolean): void {
  const securise = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = refusee
    ? `${COOKIE_AUDIENCE}=refusee; Max-Age=${TREIZE_MOIS}; Path=/; SameSite=Lax${securise}`
    : `${COOKIE_AUDIENCE}=; Max-Age=0; Path=/; SameSite=Lax${securise}`;
}

function monterChoixAudience(): void {
  const zone = $('[data-lg-audience]');
  if (!zone) return;
  const rendre = () => {
    const comptee = !audienceRefusee();
    zone.innerHTML = `<div class="lg-choix-texte">
        <p class="lg-choix-titre" id="lg-audience-titre">Compter mes visites dans la mesure d’audience</p>
        <p class="lg-choix-etat" id="lg-audience-etat">${comptee ? 'Vos visites sont comptées, de façon anonyme.' : 'Vos visites ne sont plus comptées sur cet appareil.'}</p>
      </div>
      <button class="lg-interrupteur" type="button" role="switch" aria-checked="${comptee}" aria-labelledby="lg-audience-titre" aria-describedby="lg-audience-etat" data-lg-audience-bouton><span aria-hidden="true"></span></button>`;
  };
  zone.addEventListener('click', (evenement) => {
    if (!(evenement.target as Element).closest('[data-lg-audience-bouton]')) return;
    const refuser = !audienceRefusee();
    retenirAudience(refuser);
    rendre();
    $<HTMLElement>('[data-lg-audience-bouton]', zone)?.focus();
    toast(refuser ? 'Vos visites ne sont plus comptées.' : 'Vos visites sont de nouveau comptées.');
  });
  rendre();
}

/* Acceptation des nouvelles versions (RG-03) --------------------------------------------------- */

/** Versions acceptées (ici ou depuis le bandeau du compte) : la page montre le nouvel état. */
function apresAcceptation(): void {
  for (const el of $$(
    '[data-lg-a-accepter], .lg-lecture-seule, [data-lg-accord], [data-lg-autres]',
  ))
    el.remove();
  for (const el of $$('[data-lg-accepte], [data-lg-acceptee]')) el.hidden = false;
}
document.addEventListener(DOCUMENTS_ACCEPTES, apresAcceptation);

function monterAcceptation(): void {
  const form = $<HTMLFormElement>('[data-lg-accord]');
  if (!form) return;
  const caseAccord = $<HTMLInputElement>('#lg-accord', form)!;
  const erreur = $('#lg-accord-erreur', form)!;
  const bouton = $<HTMLButtonElement>('button[type="submit"]', form)!;
  const effacer = () => {
    erreur.hidden = true;
    caseAccord.removeAttribute('aria-invalid');
  };
  caseAccord.addEventListener('change', effacer);
  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (bouton.getAttribute('aria-disabled') === 'true') return;
    if (!caseAccord.checked) {
      erreur.innerHTML = `${icon('alert', '')}<span>Cochez la case pour accepter les nouvelles versions.</span>`;
      erreur.hidden = false;
      caseAccord.setAttribute('aria-invalid', 'true');
      caseAccord.focus();
      return;
    }
    bouton.setAttribute('aria-disabled', 'true');
    const acceptee = await accepterDocuments('Nouvelles versions acceptées.');
    bouton.removeAttribute('aria-disabled');
    if (acceptee) $<HTMLElement>('#acceptation-titre')?.focus({ preventScroll: true });
  });
}

monterChoixAudience();
monterAcceptation();
window.addEventListener('hashchange', marquerCible);
suivreLecture();
marquerCible();
void document.fonts?.ready.then(placerRepere);
