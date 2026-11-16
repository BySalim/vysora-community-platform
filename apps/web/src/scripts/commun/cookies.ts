/* LEG-03 : choix sur les cookies (components/ChoixCookies.astro, FinalitesCookies.astro).
   - Bandeau : « Tout refuser », « Personnaliser » (dialogue), « Tout accepter ».
   - Dialogue « Gérer les cookies » : ouvert aussi par le lien du pied de page ([data-ck-gerer]) ;
     les interrupteurs changent sans rien enregistrer jusqu'au bouton.
   - Page Cookies ([data-ck-choix]) : chaque interrupteur enregistre le choix aussitôt.
   Le choix est retenu 6 mois par le cookie vysora_consentement, sans prolongation ; il remplace
   l'ancien refus de la page Cookies (vysora_audience), effacé au passage. Le serveur du site et
   l'API le relisent à chaque page : le suivi d'une visite commence à la page suivante, et son cookie
   de visite est effacé par le serveur à la première page après un retrait. */

import {
  COOKIE_CONSENTEMENT,
  COOKIE_REFUS_AUDIENCE,
  DELAIS,
  audienceRefusee,
  lireChoixCookies,
  parcoursAccepte,
  valeurChoixCookies,
} from '@vysora/shared';
import { dateLongue } from '../../lib/texte';
import { $, $$, toast } from './outils';

export interface Choix {
  audience: boolean;
  parcours: boolean;
}

/** Événement du document après un choix (detail : Choix). */
export const COOKIES_CHOISIS = 'vysora:cookies-choisis';

const securise = () => (location.protocol === 'https:' ? '; Secure' : '');

/** Choix en vigueur : celui du cookie, sinon la mesure anonyme (sauf ancien refus) sans parcours. */
export const choixActuel = (): Choix => ({
  audience: !audienceRefusee(document.cookie),
  parcours: parcoursAccepte(document.cookie),
});

export function retenirChoix(choix: Choix): void {
  const maintenant = new Date();
  const fin = new Date(maintenant);
  fin.setMonth(fin.getMonth() + DELAIS.choixCookiesMois);
  const valeur = valeurChoixCookies({ ...choix, date: maintenant.toISOString().slice(0, 10) });
  document.cookie = `${COOKIE_CONSENTEMENT.nom}=${valeur}; Expires=${fin.toUTCString()}; Path=/; SameSite=Lax${securise()}`;
  document.cookie = `${COOKIE_REFUS_AUDIENCE.nom}=; Max-Age=0; Path=/; SameSite=Lax${securise()}`;
  document.dispatchEvent(new CustomEvent<Choix>(COOKIES_CHOISIS, { detail: choix }));
}

const interrupteurs = (zone: ParentNode) => $$<HTMLButtonElement>('[data-ck-finalite]', zone);

function poser(zone: ParentNode, choix: Choix): void {
  for (const bouton of interrupteurs(zone)) {
    const cle = bouton.dataset.ckFinalite as keyof Choix;
    bouton.setAttribute('aria-checked', String(choix[cle]));
  }
}

function lire(zone: ParentNode): Choix {
  const choix = choixActuel();
  for (const bouton of interrupteurs(zone))
    choix[bouton.dataset.ckFinalite as keyof Choix] =
      bouton.getAttribute('aria-checked') === 'true';
  return choix;
}

const basculer = (bouton: HTMLButtonElement) =>
  bouton.setAttribute('aria-checked', String(bouton.getAttribute('aria-checked') !== 'true'));

/* Bandeau et dialogue --------------------------------------------------------------------------- */

const dialogue = $<HTMLDialogElement>('[data-ck-dialogue]');

function retirerBandeau(): void {
  const bandeau = $('[data-ck-bandeau]');
  if (!bandeau) return;
  const avaitLeFocus = bandeau.contains(document.activeElement);
  bandeau.remove();
  if (avaitLeFocus) $('#contenu')?.focus({ preventScroll: true });
}

function choisir(choix: Choix): void {
  retenirChoix(choix);
  if (dialogue?.open) dialogue.close();
  retirerBandeau();
  toast('Vos choix sont enregistrés.');
}

export function ouvrirGestionCookies(): void {
  if (!dialogue) return;
  poser(dialogue, choixActuel());
  dialogue.showModal();
}

document.addEventListener('click', (evenement) => {
  const cible = evenement.target as Element;
  const interrupteur = cible.closest<HTMLButtonElement>('[data-ck-dialogue] [data-ck-finalite]');
  if (interrupteur) {
    basculer(interrupteur);
    return;
  }
  if (cible.closest('[data-ck-gerer]')) {
    evenement.preventDefault();
    ouvrirGestionCookies();
    return;
  }
  if (cible.closest('[data-ck-fermer]')) {
    dialogue?.close();
    return;
  }
  const action = cible.closest<HTMLElement>('[data-ck-action]')?.dataset.ckAction;
  if (action === 'refuser') choisir({ audience: false, parcours: false });
  else if (action === 'accepter') choisir({ audience: true, parcours: true });
  else if (action === 'personnaliser') ouvrirGestionCookies();
  else if (action === 'enregistrer' && dialogue) choisir(lire(dialogue));
});

// Clic sur le fond du dialogue : fermé sans rien enregistrer.
dialogue?.addEventListener('click', (evenement) => {
  if (evenement.target === dialogue) dialogue.close();
});

/* Page Cookies : choix enregistré à chaque changement ------------------------------------------ */

function etatDuChoix(): string {
  const choix = lireChoixCookies(document.cookie);
  if (!choix || choix.version < COOKIE_CONSENTEMENT.version)
    return 'Aucun choix enregistré sur cet appareil : la mesure d’audience anonyme s’applique et vos parcours ne sont pas suivis.';
  const fin = new Date(`${choix.date}T12:00:00Z`);
  fin.setUTCMonth(fin.getUTCMonth() + DELAIS.choixCookiesMois);
  return `Choix enregistré sur cet appareil le ${dateLongue(choix.date)}, retenu jusqu’au ${dateLongue(fin)}.`;
}

const zonePage = $('[data-ck-choix]');
if (zonePage) {
  const etat = $('[data-ck-etat]', zonePage);
  const rafraichir = (choix: Choix) => {
    poser(zonePage, choix);
    if (etat) etat.textContent = etatDuChoix();
  };
  zonePage.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLButtonElement>('[data-ck-finalite]');
    if (!bouton) return;
    basculer(bouton);
    const choix = lire(zonePage);
    retenirChoix(choix);
    retirerBandeau();
    const active = bouton.getAttribute('aria-checked') === 'true';
    toast(
      bouton.dataset.ckFinalite === 'audience'
        ? active
          ? 'Vos visites sont de nouveau comptées.'
          : 'Vos visites ne sont plus comptées.'
        : active
          ? 'Le parcours de vos visites sera suivi à partir de la page suivante.'
          : 'Le parcours de vos visites n’est plus suivi.',
    );
  });
  document.addEventListener(COOKIES_CHOISIS, (evenement) =>
    rafraichir((evenement as CustomEvent<Choix>).detail),
  );
  rafraichir(choixActuel());
}
