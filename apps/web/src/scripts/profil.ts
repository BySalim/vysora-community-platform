/* Profil (PROF-01), porté de prototype/profil.js : apparitions et compteurs, barre des sections,
   filtres et tri des créations, contributions, courbe de réputation (réticule au survol, flèches au
   clavier), aperçu d'une création (sa fiche lue dans l'API), partage du lien, « Complétez votre
   profil » et modification du profil (photo ou avatar, nom, biographie, lien) envoyée à l'API. Le
   prototype gardait le profil modifié sur l'appareil ; ici, c'est le compte. */

import {
  AVATARS,
  adresseAvatar,
  erreurLien,
  estAdresseAvatar,
  estAvatarChoisi,
  LONGUEURS,
  normaliserLien,
  tirerAvatar,
  type AvatarApi,
  type AvatarChoisi,
  type CreationFicheApi,
  type ProfilPublicApi,
  type SessionApi,
} from '@vysora/shared';
import { vueHTML } from '../lib/profil/apercu';
import type { DonneesProfil } from '../lib/profil/donnees';
import { dateLabel, type ContexteProfil } from '../lib/profil/elements';
import { bulleSemaine, courbe, type PointCourbe } from '../lib/profil/progression';
import {
  aproposHTML,
  contributionsHTML,
  creationsHTML,
  heroHTML,
  navHTML,
  type EtatCreations,
  type FiltreContributions,
} from '../lib/profil/sections';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { etats } from './commun/etats';
import { $, $$, animations, esc, fmt, icon, toast, typo } from './commun/outils';

const racine = document.documentElement;

function lire(): DonneesProfil | null {
  try {
    return JSON.parse($('#pf-donnees')?.textContent ?? 'null') as DonneesProfil | null;
  } catch {
    return null;
  }
}
const donnees = lire();

/* Apparitions et compteurs ------------------------------------------------------------------------ */

const compteurs = new WeakSet<Element>();
function compter(el: HTMLElement): void {
  if (compteurs.has(el)) return;
  compteurs.add(el);
  const fin = Number(el.dataset.pfCompter) || 0;
  if (!animations.completes() || fin < 2) {
    el.textContent = typo(fmt(fin));
    return;
  }
  const debut = performance.now();
  const duree = 900 + Math.min(500, fin / 40);
  const pas = (instant: number) => {
    const k = Math.min(1, (instant - debut) / duree);
    el.textContent = typo(fmt(Math.round(fin * (1 - Math.pow(1 - k, 3)))));
    if (k < 1) requestAnimationFrame(pas);
  };
  el.textContent = '0';
  requestAnimationFrame(pas);
}

let observateur: IntersectionObserver | undefined;
function observer(): void {
  observateur?.disconnect();
  observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        entree.target.classList.add('is-in');
        for (const el of $$('[data-pf-compter]', entree.target)) compter(el);
        const cible = entree.target as HTMLElement;
        if (cible.matches('[data-pf-progression]') && !cible.dataset.trace) {
          cible.dataset.trace = '1';
          dessinerCourbe(true);
        }
        observateur?.unobserve(entree.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  for (const el of $$('.pf-reveal:not(.is-in), [data-pf-chiffres]')) observateur.observe(el);
}

/* Barre des sections : section courante, identité réduite une fois l'en-tête passé. */
function suivreSections(): void {
  const espion = new IntersectionObserver(
    (entrees) => {
      const actif = entrees
        .filter((e) => e.isIntersecting)
        .toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!actif) return;
      for (const a of $$<HTMLAnchorElement>('[data-pf-ancres] a'))
        if (a.hash === `#${actif.target.id}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
    },
    { rootMargin: '-20% 0px -60% 0px' },
  );
  for (const el of $$('#progression, #creations, #contributions, #badges')) espion.observe(el);
  const barre = $('[data-pf-nav]');
  const titre = $('[data-pf-hero] h1') ?? $('[data-pf-hero]');
  if (!barre || !titre) return;
  const hauteurEntete = parseInt(getComputedStyle(racine).getPropertyValue('--header-h'), 10) || 72;
  new IntersectionObserver(
    ([e]) =>
      barre.classList.toggle('has-qui', !!e && !e.isIntersecting && e.boundingClientRect.top < 0),
    { rootMargin: `-${hauteurEntete}px 0px 0px 0px` },
  ).observe(titre);
}

/* Courbe de réputation -------------------------------------------------------------------------- */

let etatCourbe: {
  points: PointCourbe[];
  x: (i: number) => number;
  y: (v: number) => number;
  largeur: number;
  actif: number | null;
} | null = null;

function dessinerCourbe(animer: boolean): void {
  const zone = $('[data-pf-courbe]');
  const svg = $<SVGSVGElement>('[data-pf-svg]', zone ?? document);
  const prive = donnees?.profil.prive;
  if (!zone || !svg || !prive) return;
  const points = prive.reputation.parSemaine;
  const c = courbe(points, zone.clientWidth, prive.reputation.total);
  svg.setAttribute('viewBox', `0 0 ${c.largeur} ${c.hauteur}`);
  svg.setAttribute('width', String(c.largeur));
  svg.setAttribute('height', String(c.hauteur));
  svg.innerHTML = c.svg;
  etatCourbe = { points, x: c.x, y: c.y, largeur: c.largeur, actif: null };
  if (animer && animations.completes()) {
    zone.classList.add('is-anime');
    zone.classList.remove('is-trace');
    requestAnimationFrame(() => requestAnimationFrame(() => zone.classList.add('is-trace')));
  } else {
    zone.classList.remove('is-anime');
    zone.classList.add('is-trace');
  }
}

function montrerPoint(i: number, annoncer = false): void {
  const zone = $('[data-pf-courbe]');
  if (!zone || !etatCourbe) return;
  const { points, x, y, largeur } = etatCourbe;
  const p = points[i];
  if (!p) return;
  etatCourbe.actif = i;
  const reticule = $('[data-pf-reticule]', zone);
  const focus = $('[data-pf-focus]', zone);
  reticule?.setAttribute('x1', String(x(i)));
  reticule?.setAttribute('x2', String(x(i)));
  reticule?.setAttribute('visibility', 'visible');
  focus?.setAttribute('cx', String(x(i)));
  focus?.setAttribute('cy', String(y(p.valeur)));
  focus?.setAttribute('visibility', 'visible');
  const bulle = $('[data-pf-bulle]', zone);
  if (!bulle) return;
  bulle.innerHTML = bulleSemaine(p, i === points.length - 1);
  bulle.hidden = false;
  const ratio = zone.clientWidth / largeur;
  const w = bulle.offsetWidth;
  bulle.style.left = `${Math.min(Math.max(x(i) * ratio - w / 2, 0), zone.clientWidth - w)}px`;
  bulle.style.top = `${Math.max(0, y(p.valeur) * ratio - bulle.offsetHeight - 16)}px`;
  const annonce = $('[data-pf-courbe-annonce]');
  if (annoncer && annonce)
    annonce.textContent = typo(
      `Semaine du ${dateLabel(p.semaine)} : ${fmt(p.valeur)} points, ${p.gain >= 0 ? '+' : ''}${fmt(p.gain)}.`,
    );
}
function cacherPoint(): void {
  const zone = $('[data-pf-courbe]');
  if (!zone) return;
  $('[data-pf-reticule]', zone)?.setAttribute('visibility', 'hidden');
  $('[data-pf-focus]', zone)?.setAttribute('visibility', 'hidden');
  const bulle = $('[data-pf-bulle]', zone);
  if (bulle) bulle.hidden = true;
}

function initialiserCourbe(): void {
  const zone = $('[data-pf-courbe]');
  if (!zone) return;
  dessinerCourbe(false);
  zone.addEventListener('pointermove', (evenement) => {
    if (!etatCourbe) return;
    const r = zone.getBoundingClientRect();
    const xSvg = ((evenement.clientX - r.left) / r.width) * etatCourbe.largeur;
    let proche = 0;
    etatCourbe.points.forEach((_, i) => {
      if (Math.abs(etatCourbe!.x(i) - xSvg) < Math.abs(etatCourbe!.x(proche) - xSvg)) proche = i;
    });
    montrerPoint(proche);
  });
  zone.addEventListener('pointerleave', () => {
    if (document.activeElement !== zone) cacherPoint();
  });
  zone.addEventListener('focus', () => {
    if (etatCourbe) montrerPoint(etatCourbe.actif ?? etatCourbe.points.length - 1, true);
  });
  zone.addEventListener('blur', cacherPoint);
  zone.addEventListener('keydown', (evenement) => {
    if (!etatCourbe) return;
    const n = etatCourbe.points.length;
    const i = etatCourbe.actif ?? n - 1;
    const suivant = {
      ArrowLeft: Math.max(0, i - 1),
      ArrowRight: Math.min(n - 1, i + 1),
      Home: 0,
      End: n - 1,
    }[evenement.key];
    if (suivant === undefined) return;
    evenement.preventDefault();
    montrerPoint(suivant, true);
  });
  let largeur = zone.clientWidth;
  new ResizeObserver(() => {
    if (zone.clientWidth === largeur) return;
    largeur = zone.clientWidth;
    dessinerCourbe(false);
  }).observe(zone);
  // Sources des points : survoler l'une atténue les autres.
  document.addEventListener('pointerover', (evenement) => {
    const s = (evenement.target as Element).closest?.<HTMLElement>('[data-pf-source]');
    for (const el of $$('.pf-sources [data-pf-source]'))
      el.classList.toggle('is-attenue', !!s && el.dataset.pfSource !== s.dataset.pfSource);
  });
}

/* Créations, contributions, aperçu d'une création ------------------------------------------------- */

const ui: EtatCreations & { filtre: FiltreContributions; activiteComplete: boolean } = {
  type: 'toutes',
  tri: 'recentes',
  completes: false,
  filtre: 'tout',
  activiteComplete: false,
};
const contexte = (): ContexteProfil => ({
  prive: donnees?.prive ?? false,
  apercu: donnees?.apercu ?? false,
  maintenant: new Date(),
});

function animerGalerie(depuis = 0): void {
  if (!animations.completes()) return;
  $$('.pf-carte')
    .slice(depuis)
    .forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 380,
          delay: Math.min(i, 8) * 50,
          easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
          fill: 'backwards',
        },
      ),
    );
}

function afficherCreations(): void {
  const zone = $('[data-pf-creations]');
  if (zone && donnees) zone.innerHTML = creationsHTML(donnees.profil, contexte(), ui);
}
function afficherContributions(): void {
  const zone = $('[data-pf-contributions]');
  if (zone && donnees)
    zone.innerHTML = contributionsHTML(donnees.profil, contexte(), ui.filtre, ui.activiteComplete);
}

let origineVue: HTMLElement | null = null;
let ficheOuverte: CreationFicheApi | null = null;
async function ouvrirCreation(id: number, origine: HTMLElement): Promise<void> {
  const vue = $<HTMLDialogElement>('[data-pf-vue]');
  const carte = donnees?.profil.creations.find((c) => c.id === id);
  if (!vue || !carte) return;
  origine.setAttribute('aria-busy', 'true');
  const reponse = await api<CreationFicheApi>('GET', `/api/v1/creations/${id}`);
  origine.removeAttribute('aria-busy');
  if (!reponse.ok) {
    toast(
      reponse.probleme.status === 404
        ? 'Cette création n’est plus disponible.'
        : 'L’aperçu ne s’ouvre pas pour le moment. Réessayez dans un instant.',
      'alert',
    );
    return;
  }
  ficheOuverte = reponse.donnees;
  origineVue = origine;
  vue.innerHTML = vueHTML(reponse.donnees, carte, contexte().prive);
  vue.showModal();
  const corps = $('.pf-v-corps', vue);
  if (corps) corps.scrollTop = 0;
  $<HTMLElement>('[data-pf-vue-fermer]', vue)?.focus();
}

async function copier(texte: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texte);
    toast(message, 'copy');
  } catch {
    toast('Copie indisponible. Sélectionnez le texte pour le copier.', 'alert');
  }
}

async function partager(): Promise<void> {
  const profil = donnees?.profil;
  if (!profil) return;
  const adresse = `${location.origin}/membres/${encodeURIComponent(profil.membre.pseudo)}`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: `${profil.membre.nom} sur Vysora`, url: adresse });
      return;
    } catch (erreur) {
      // Feuille de partage fermée : rien à faire. Copier ensuite échouerait sur iPhone (le geste
      // est consommé) et copierait sans qu'on le demande ailleurs. Partage impossible : on copie.
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return;
    }
  }
  await copier(adresse, 'Lien du profil copié.');
}

/* « Complétez votre profil » : fermé une fois, il ne revient pas sur cet appareil. */
const cleGuide = () => `vysora-profil-guide:${donnees?.profil.membre.id ?? ''}`;
function guideMasque(): boolean {
  try {
    return localStorage.getItem(cleGuide()) === '1';
  } catch {
    return false;
  }
}
function montrerGuide(): void {
  const guide = $('[data-pf-guide]');
  if (guide) guide.hidden = guideMasque();
}

/* Modification du profil ------------------------------------------------------------------------- */

function rendreEntete(changees: string[] = []): void {
  if (!donnees) return;
  const hero = $('[data-pf-hero]');
  if (hero) hero.innerHTML = heroHTML(donnees.profil, contexte());
  const nav = navHTML(donnees.profil, contexte());
  const mini = $('[data-pf-mini]');
  if (mini) mini.innerHTML = nav.mini;
  const apropos = $('[data-pf-apropos]');
  if (apropos) apropos.innerHTML = aproposHTML(donnees.profil, contexte());
  montrerGuide();
  if (animations.niveau() === 'none') return;
  for (const z of changees) {
    const el =
      z === 'photo' ? $('.pf-photo-hero') : z === 'nom' ? $('#pf-nom') : $(`[data-pf-zone="${z}"]`);
    if (!el) continue;
    el.classList.remove('pf-flash');
    void el.offsetWidth;
    el.classList.add('pf-flash');
  }
}

/** Image et nom de l'en-tête du site (menu du compte), mis à jour sans rechargement. */
function rendreCompte(adresse: string | null, nom: string): void {
  for (const ancienne of $$('.compte .compte-avatar')) {
    const taille =
      ancienne.getAttribute('width') ?? (ancienne.style.width.replace('px', '') || '34');
    ancienne.outerHTML = adresse
      ? `<img class="avatar compte-avatar" src="${esc(adresse)}" alt="" width="${taille}" height="${taille}" style="width:${taille}px;height:${taille}px" decoding="async">`
      : `<span class="avatar compte-avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', 'icon')}</span>`;
  }
  for (const b of $$('.compte .compte-qui b')) b.textContent = nom;
}

/** Avatars montrés avant de déplier la liste (prototype : VISIBLES). */
const AVATARS_VISIBLES = 5;
const nomPropre = (valeur: string): string =>
  valeur.replace(/\s+/g, ' ').trim().slice(0, LONGUEURS.nomAffiche.max);

function initialiserModification(): void {
  const tiroir = $<HTMLDialogElement>('[data-pf-tiroir]');
  const formulaire = $<HTMLFormElement>('[data-pf-form]');
  const champBio = $<HTMLTextAreaElement>('[data-pf-bio]');
  const champLien = $<HTMLInputElement>('[data-pf-lien]');
  const fichier = $<HTMLInputElement>('[data-pf-fichier]');
  const zoneAvatars = $('[data-pf-avatars]');
  const nomBtn = $<HTMLButtonElement>('[data-pf-nom-modifier]');
  const nomSaisie = $<HTMLInputElement>('[data-pf-nom]');
  const membre = donnees?.profil.membre;
  if (
    !tiroir ||
    !formulaire ||
    !champBio ||
    !champLien ||
    !fichier ||
    !zoneAvatars ||
    !nomBtn ||
    !nomSaisie ||
    !membre
  )
    return;

  /* RG-07 : l'image de profil est la photo importée, à défaut l'avatar choisi. Le compte garde
     les deux : retirer la photo fait revenir l'avatar. */
  let avatarCompte: AvatarChoisi | null = etats.moi()?.avatarChoisi ?? null;
  const aUnePhoto = () => Boolean(membre.avatar) && !estAdresseAvatar(membre.avatar);
  /** Nom affiché enregistré ; vide quand le pseudo s'affiche à sa place. */
  const nomCompte = () => (membre.nom === membre.pseudo ? '' : membre.nom);

  /** Photo : nouvelle (fichier), retirée (null) ou inchangée (undefined). */
  let photo: { fichier: File; apercu: string } | null | undefined;
  let avatar: AvatarChoisi | null = avatarCompte;
  let nom = '';
  let tousVisibles = false;
  let origineCle = '';
  let envoi = false;

  /** Photo montrée dans le volet : la nouvelle, celle du compte, ou aucune. */
  const photoAffichee = (): string | null =>
    photo === undefined ? (aUnePhoto() ? membre.avatar : null) : (photo?.apercu ?? null);
  const oublierPhoto = () => {
    if (photo?.apercu) URL.revokeObjectURL(photo.apercu);
    photo = aUnePhoto() ? null : undefined;
  };

  const majAvatars = () => {
    const labels = $$('.pf-avatar', zoneAvatars);
    const choisi = photoAffichee() ? -1 : AVATARS.findIndex((a) => a.id === avatar);
    labels.forEach((label, i) => {
      const radio = $<HTMLInputElement>('input', label);
      if (radio) radio.checked = i === choisi;
      label.hidden = !tousVisibles && i >= AVATARS_VISIBLES && i !== choisi;
    });
    // Repliée, la rangée garde cinq avatars : celui choisi parmi les autres prend la dernière place.
    const cinquieme = labels[AVATARS_VISIBLES - 1];
    if (!tousVisibles && choisi >= AVATARS_VISIBLES && cinquieme) cinquieme.hidden = true;
    zoneAvatars.classList.toggle('is-ouvert', tousVisibles);
    const tous = $('[data-pf-avatars-tous]', zoneAvatars);
    if (!tous) return;
    const libelle = tousVisibles ? 'Afficher moins d’avatars' : 'Afficher tous les avatars';
    tous.setAttribute('aria-expanded', String(tousVisibles));
    tous.setAttribute('aria-label', libelle);
    tous.title = libelle;
  };
  const apercuImage = ({ anime = false } = {}) => {
    const zone = $('[data-pf-photo-apercu]');
    const adresse = photoAffichee() ?? (avatar ? adresseAvatar(avatar) : null);
    if (zone) {
      zone.innerHTML = adresse
        ? `<img src="${esc(adresse)}" alt="" width="96" height="96">`
        : `<span class="pf-photo pf-photo-defaut" aria-hidden="true">${icon('user', '')}</span>`;
      if (anime) {
        zone.classList.remove('is-nouveau');
        void zone.offsetWidth;
        zone.classList.add('is-nouveau');
      }
    }
    const retirer = $<HTMLButtonElement>('[data-pf-retirer]');
    if (retirer) retirer.hidden = !photoAffichee();
    majAvatars();
  };
  const majCompte = () => {
    const compte = $('[data-pf-compte]');
    if (!compte) return;
    compte.textContent = typo(`${fmt(champBio.value.length)} sur ${LONGUEURS.biographie.max}`);
    compte.classList.toggle('is-proche', champBio.value.length > LONGUEURS.biographie.max - 50);
  };
  const erreur = (cible: 'photo' | 'nom' | 'lien' | 'bio', message: string) => {
    const el = $(`[data-pf-erreur-${cible}]`);
    if (el) {
      el.textContent = message ? typo(message) : '';
      el.hidden = !message;
    }
    if (cible === 'lien') champLien.setAttribute('aria-invalid', String(Boolean(message)));
    if (cible === 'bio') champBio.setAttribute('aria-invalid', String(Boolean(message)));
    if (cible === 'nom') nomSaisie.setAttribute('aria-invalid', String(Boolean(message)));
  };
  const verifierLien = () => {
    const message = erreurLien(champLien.value) ?? '';
    erreur('lien', message);
    return !message;
  };

  /* Nom : affiché à côté de l'image, il se modifie sur place (clic sur le nom ou le crayon).
     Entrée ou un clic ailleurs le garde, Échap l'annule ; vide, c'est le pseudo qui s'affiche. */
  const afficherNom = () => {
    const valeur = $('[data-pf-nom-valeur]', nomBtn);
    if (valeur) valeur.textContent = nom || 'Votre nom';
    nomBtn.classList.toggle('is-vide', !nom);
  };
  const editerNom = () => {
    nomSaisie.value = nom;
    nomBtn.hidden = true;
    nomSaisie.hidden = false;
    nomSaisie.focus();
    nomSaisie.select();
  };
  const finirNom = (garder: boolean) => {
    if (nomSaisie.hidden) return;
    if (garder) nom = nomPropre(nomSaisie.value);
    nomSaisie.hidden = true;
    nomBtn.hidden = false;
    afficherNom();
  };
  nomBtn.addEventListener('click', editerNom);
  nomSaisie.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Enter' && evenement.key !== 'Escape') return;
    // Échap ferme la saisie, pas le volet ; Entrée garde le nom sans enregistrer le profil.
    evenement.preventDefault();
    evenement.stopPropagation();
    finirNom(evenement.key === 'Enter');
    nomBtn.focus();
  });
  nomSaisie.addEventListener('blur', () => finirNom(true));
  nomSaisie.addEventListener('input', () => {
    if (nomSaisie.getAttribute('aria-invalid') === 'true') erreur('nom', '');
  });

  const modifie = () =>
    photo !== undefined ||
    avatar !== avatarCompte ||
    nom !== nomCompte() ||
    champBio.value.trim() !== (membre.biographie ?? '') ||
    normaliserLien(champLien.value) !== (membre.lien ?? '');

  const ouvrir = (cible = '') => {
    if (!exiger('contribuer', 'modifier votre profil')) return;
    origineCle = cible;
    photo = undefined;
    avatar = avatarCompte;
    nom = nomCompte();
    tousVisibles = false;
    nomSaisie.hidden = true;
    nomBtn.hidden = false;
    afficherNom();
    champBio.value = membre.biographie ?? '';
    champLien.value = membre.lien ?? '';
    for (const c of ['photo', 'nom', 'lien', 'bio'] as const) erreur(c, '');
    const abandon = $('[data-pf-abandon]');
    const actions = $('[data-pf-pied-actions]');
    if (abandon) abandon.hidden = true;
    if (actions) actions.hidden = false;
    apercuImage();
    majCompte();
    tiroir.showModal();
    const focus = { photo: fichier, bio: champBio, lien: champLien }[cible] ?? champBio;
    focus.focus();
    if (focus === champBio)
      champBio.setSelectionRange(champBio.value.length, champBio.value.length);
  };
  const fermer = () => {
    tiroir.close();
    ($(`[data-pf-modifier="${origineCle}"]`) ?? $('[data-pf-modifier=""]'))?.focus();
  };
  const demanderFermeture = () => {
    finirNom(true);
    if (!modifie()) {
      fermer();
      return;
    }
    const abandon = $('[data-pf-abandon]');
    const actions = $('[data-pf-pied-actions]');
    if (abandon) abandon.hidden = false;
    if (actions) actions.hidden = true;
    $<HTMLButtonElement>('[data-pf-continuer]')?.focus();
  };

  const choisirAvatar = (id: AvatarChoisi) => {
    avatar = id;
    if (photoAffichee()) oublierPhoto();
    erreur('photo', '');
    apercuImage({ anime: true });
  };
  zoneAvatars.addEventListener('change', (evenement) => {
    const radio = (evenement.target as Element).closest<HTMLInputElement>(
      'input[name="pf-avatar"]',
    );
    if (radio && estAvatarChoisi(radio.value)) choisirAvatar(radio.value);
  });
  zoneAvatars.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const hasard = cible.closest<HTMLElement>('[data-pf-avatar-hasard]');
    if (hasard) {
      // Avec une photo à l'écran, l'avatar actuel compte aussi comme un changement.
      choisirAvatar(tirerAvatar(photoAffichee() ? null : avatar));
      hasard.classList.toggle('is-tire');
      return;
    }
    if (cible.closest('[data-pf-avatars-tous]')) {
      tousVisibles = !tousVisibles;
      majAvatars();
    }
  });

  fichier.addEventListener('change', () => {
    const f = fichier.files?.[0];
    fichier.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      erreur('photo', 'Ce format n’est pas pris en charge. Choisissez une image JPG, PNG ou WebP.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      erreur('photo', 'Cette image dépasse 5 Mo. Choisissez une image plus légère.');
      return;
    }
    if (photo?.apercu) URL.revokeObjectURL(photo.apercu);
    photo = { fichier: f, apercu: URL.createObjectURL(f) };
    erreur('photo', '');
    apercuImage({ anime: true });
  });
  $('[data-pf-retirer]')?.addEventListener('click', () => {
    oublierPhoto();
    apercuImage({ anime: true });
    fichier.focus();
  });
  champBio.addEventListener('input', majCompte);
  champLien.addEventListener('blur', () => {
    if (!champLien.value.trim()) return;
    champLien.value = normaliserLien(champLien.value);
    verifierLien();
  });
  champLien.addEventListener('input', () => {
    if (champLien.getAttribute('aria-invalid') === 'true') verifierLien();
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (envoi) return;
    finirNom(true);
    if (!verifierLien()) {
      champLien.focus();
      return;
    }
    envoi = true;
    const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
    bouton?.setAttribute('aria-busy', 'true');
    const avant = { image: membre.avatar, nom: membre.nom };
    try {
      // La photo d'abord : une image refusée laisse le reste du formulaire ouvert.
      if (photo !== undefined) {
        const corps = new FormData();
        if (photo) corps.append('fichier', photo.fichier);
        const reponse = photo
          ? await api<AvatarApi>('PUT', '/api/v1/moi/avatar', corps)
          : await api<AvatarApi>('DELETE', '/api/v1/moi/avatar');
        if (!reponse.ok) {
          erreur('photo', reponse.probleme.detail ?? reponse.probleme.title);
          return;
        }
        membre.avatar = reponse.donnees.avatar;
        photo = undefined;
      }
      // Nom et avatar (RG-07) : informations du compte, enregistrées comme dans les paramètres.
      const compte = {
        ...(nom !== nomCompte() ? { nomAffiche: nom } : {}),
        ...(avatar && avatar !== avatarCompte ? { avatarChoisi: avatar } : {}),
      };
      if (Object.keys(compte).length) {
        const reponse = await api<SessionApi>('PATCH', '/api/v1/moi', compte);
        if (!reponse.ok) {
          const message = reponse.probleme.erreurs?.nomAffiche;
          if (message) {
            erreur('nom', message);
            editerNom();
          } else
            toast(
              reponse.probleme.detail ??
                'L’enregistrement n’a pas abouti. Réessayez dans un instant.',
              'alert',
            );
          return;
        }
        etats.appliquer(reponse.donnees);
        const connecte = reponse.donnees.membre;
        if (connecte) {
          membre.nom = connecte.nom;
          membre.avatar = connecte.avatar;
          avatarCompte = connecte.avatarChoisi;
        }
      }
      const reponse = await api<ProfilPublicApi>('PATCH', '/api/v1/moi/profil', {
        biographie: champBio.value,
        lien: champLien.value,
      });
      if (!reponse.ok) {
        const erreurs = (reponse.probleme as { erreurs?: Record<string, string> }).erreurs ?? {};
        if (erreurs.lien) erreur('lien', erreurs.lien);
        if (erreurs.biographie) erreur('bio', erreurs.biographie);
        if (!erreurs.lien && !erreurs.biographie)
          toast(
            reponse.probleme.detail ??
              'L’enregistrement n’a pas abouti. Réessayez dans un instant.',
            'alert',
          );
        return;
      }
      const changees: string[] = [];
      if (membre.avatar !== avant.image) changees.push('photo');
      if (membre.nom !== avant.nom) changees.push('nom');
      if (reponse.donnees.biographie !== membre.biographie) changees.push('bio');
      if (reponse.donnees.lien !== membre.lien) changees.push('lien');
      membre.biographie = reponse.donnees.biographie;
      membre.lien = reponse.donnees.lien;
      if (changees.includes('photo') || changees.includes('nom'))
        rendreCompte(membre.avatar, membre.nom);
      tiroir.close();
      rendreEntete(changees);
      toast(
        changees.length ? 'Profil mis à jour.' : 'Aucune modification à enregistrer.',
        changees.length ? 'check' : 'pen',
      );
      ($(`[data-pf-modifier="${origineCle}"]`) ?? $('[data-pf-modifier=""]'))?.focus();
    } finally {
      envoi = false;
      bouton?.removeAttribute('aria-busy');
    }
  });
  for (const b of $$('[data-pf-annuler]', tiroir)) b.addEventListener('click', demanderFermeture);
  $('[data-pf-continuer]')?.addEventListener('click', () => {
    const abandon = $('[data-pf-abandon]');
    const actions = $('[data-pf-pied-actions]');
    if (abandon) abandon.hidden = true;
    if (actions) actions.hidden = false;
    champBio.focus();
  });
  $('[data-pf-abandonner]')?.addEventListener('click', fermer);
  tiroir.addEventListener('cancel', (evenement) => {
    evenement.preventDefault();
    demanderFermeture();
  });
  tiroir.addEventListener('click', (evenement) => {
    if (evenement.target === tiroir) demanderFermeture();
  });

  document.addEventListener('click', (evenement) => {
    const cible = (evenement.target as Element).closest<HTMLElement>('[data-pf-modifier]');
    if (cible) ouvrir(cible.dataset.pfModifier ?? '');
  });
}

/* Événements ------------------------------------------------------------------------------------- */

document.addEventListener('click', (evenement) => {
  const cible = (evenement.target as Element).closest<HTMLElement>(
    '[data-pf-partager], [data-pf-type], [data-pf-activite], [data-pf-plus], [data-pf-creations-plus], [data-pf-ouvrir], [data-pf-vue-fermer], [data-pf-copier-prompt], [data-pf-guide-masquer]',
  );
  if (!cible) return;
  const d = cible.dataset;
  if ('pfPartager' in d) void partager();
  else if ('pfCreationsPlus' in d) {
    ui.completes = !ui.completes;
    afficherCreations();
    if (ui.completes) animerGalerie(6);
    $<HTMLElement>('[data-pf-creations-plus]')?.focus();
  } else if ('pfType' in d) {
    ui.type = (d.pfType as EtatCreations['type']) ?? 'toutes';
    ui.completes = false;
    afficherCreations();
    animerGalerie();
    $<HTMLElement>(`[data-pf-type="${d.pfType}"]`)?.focus();
  } else if ('pfActivite' in d) {
    ui.filtre = (d.pfActivite as FiltreContributions) ?? 'tout';
    ui.activiteComplete = false;
    afficherContributions();
    $<HTMLElement>(`[data-pf-activite="${d.pfActivite}"]`)?.focus();
  } else if ('pfPlus' in d) {
    ui.activiteComplete = !ui.activiteComplete;
    afficherContributions();
    $<HTMLElement>('[data-pf-plus]')?.focus();
  } else if ('pfOuvrir' in d) void ouvrirCreation(Number(d.pfOuvrir), cible);
  else if ('pfVueFermer' in d) $<HTMLDialogElement>('[data-pf-vue]')?.close();
  else if ('pfCopierPrompt' in d) {
    const id = Number(d.pfCopierPrompt);
    const prompt = ficheOuverte?.etapes.flatMap((e) => e.echanges).find((x) => x.id === id)?.prompt;
    if (prompt) void copier(prompt, 'Prompt copié.');
  } else if ('pfGuideMasquer' in d) {
    try {
      localStorage.setItem(cleGuide(), '1');
    } catch {
      // Stockage indisponible : les étapes reviendront à la prochaine visite.
    }
    montrerGuide();
    $<HTMLElement>('[data-pf-modifier=""]')?.focus();
    toast('Étapes masquées.');
  }
});
document.addEventListener('change', (evenement) => {
  const select = evenement.target as HTMLSelectElement;
  if (!select.matches('[data-pf-tri]')) return;
  ui.tri = select.value === 'utiles' ? 'utiles' : 'recentes';
  afficherCreations();
  animerGalerie();
  $<HTMLElement>('[data-pf-tri]')?.focus();
});
const vue = $<HTMLDialogElement>('[data-pf-vue]');
vue?.addEventListener('click', (evenement) => {
  if (evenement.target === vue) vue.close();
});
vue?.addEventListener('close', () => {
  if (origineVue && document.contains(origineVue)) origineVue.focus();
});

/* Démarrage -------------------------------------------------------------------------------------- */

if (donnees) {
  montrerGuide();
  initialiserCourbe();
  initialiserModification();
  // Compteurs : partent de zéro quand ils apparaissent.
  if (animations.completes()) for (const el of $$('[data-pf-compter]')) el.textContent = '0';
  observer();
  suivreSections();
  // Lien direct vers une création (« Voir sur mon profil » de Mes contenus, prototype : ?creation=).
  const demandee = Number(new URLSearchParams(location.search).get('creation'));
  // Une création au-delà des six premières n'a pas de carte : la section sert d'origine.
  const bouton = demandee
    ? ($<HTMLElement>(`[data-pf-ouvrir="${demandee}"]`) ?? $('#creations'))
    : null;
  if (bouton) void ouvrirCreation(demandee, bouton);
}
racine.classList.add('pf-pret');
const pret = () => document.body.classList.add('is-ready');
requestAnimationFrame(pret);
// Un onglet en arrière-plan ne dessine pas d'image : l'en-tête apparaît quand même.
setTimeout(pret, 250);
