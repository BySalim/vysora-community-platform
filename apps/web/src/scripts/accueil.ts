/* Accueil (ACC-01), porté de prototype/app.js et accueil-hero.js : apparitions, compteurs, comparaison,
   méthode en cinq couches, cartes « À explorer » et leur parcours, laboratoire (cas Bon réflexe
   envoyé à l'API, clinique, défi et son compte à rebours), fil d'activité relu tant que la page reste
   ouverte, courbe des interactions, classement, profils, fonds animés. Les réglages du panneau
   Tweaks sont figés sur leurs valeurs par défaut. Rien n'est simulé : le prototype faisait monter
   les chiffres, le fil et le classement au hasard ; ici, seul le fil change, avec ce que l'API
   renvoie. */

import type {
  ActiviteRecenteApi,
  ApprentissageAccueilApi,
  CasApi,
  CorrectionCasApi,
  ReponseCasApi,
} from '@vysora/shared';
import { LEGENDES, listeHTML, type ListeAccueil } from '../lib/accueil/cartes';
import { courbeHTML, geometrie, libelleJour } from '../lib/accueil/courbe';
import type { DonneesAccueil } from '../lib/accueil/donnees';
import { ilYa } from '../lib/accueil/elements';
import { activiteHTML } from '../lib/accueil/fil';
import { correctionHTML, resteAvant, type NoteCas } from '../lib/accueil/laboratoire';
import { invitation } from './commun/acces';
import { api } from './commun/api';
import { etats } from './commun/etats';
import { $, $$, fmt, icon, t, toast, typo } from './commun/outils';
import { initialiserConstellation, initialiserTrame, type Animations } from './accueil/fonds';
import { initialiserSphere } from './accueil/sphere';
import { initialiserVagues } from './accueil/vagues';

const racine = document.documentElement;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const entreeSortie = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sortie = (x: number) => 1 - Math.pow(1 - x, 3);

function lireDonnees(): DonneesAccueil | null {
  try {
    return JSON.parse($('#accueil-donnees')?.textContent ?? 'null') as DonneesAccueil | null;
  } catch {
    return null;
  }
}
const donnees = lireDonnees();
const accueil = donnees?.accueil ?? null;
/** Décalage entre l'horloge de l'appareil et celle de l'API (dates relatives, compte à rebours). */
const decalage = donnees ? new Date(donnees.maintenant).getTime() - Date.now() : 0;
const maintenant = () => new Date(Date.now() + decalage);

/* Animations ------------------------------------------------------------------------------------ */

const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');
const niveauAnimations = (): 'full' | 'reduced' | 'none' => (reduire.matches ? 'reduced' : 'full');
const completes = () => niveauAnimations() === 'full';
const ambiance = () => !document.hidden && niveauAnimations() !== 'none';

const visibilite = new Map<Element, boolean>();
const rappels = new Map<Element, (visible: boolean) => void>();
const observateurVisibilite = new IntersectionObserver(
  (entrees) => {
    for (const entree of entrees) {
      visibilite.set(entree.target, entree.isIntersecting);
      rappels.get(entree.target)?.(entree.isIntersecting);
    }
  },
  { threshold: 0.05 },
);
const surveiller = (el: Element | null, rappel: (visible: boolean) => void = () => {}) => {
  if (!el) return;
  rappels.set(el, rappel);
  observateurVisibilite.observe(el);
};
const estVisible = (el: Element | null) => (el ? visibilite.get(el) === true : false);
const animations: Animations = { complete: completes, visible: estVisible, surveiller };

/* Compteurs : ils montent de zéro quand ils apparaissent. */
function animerNombre(el: HTMLElement, de: number, a: number, duree = 1400): void {
  if (!completes() || de === a) {
    el.textContent = typo(fmt(a));
    return;
  }
  const debut = performance.now();
  const etape = (instant: number) => {
    const p = Math.min(1, (instant - debut) / duree);
    el.textContent = typo(fmt(Math.round(de + (a - de) * sortie(p))));
    if (p < 1) requestAnimationFrame(etape);
  };
  requestAnimationFrame(etape);
}
const observateurCompteurs = new IntersectionObserver(
  (entrees) => {
    for (const entree of entrees) {
      if (!entree.isIntersecting) continue;
      observateurCompteurs.unobserve(entree.target);
      const el = entree.target as HTMLElement;
      animerNombre(el, 0, Number(el.dataset.count), 1600);
    }
  },
  { threshold: 0.6 },
);

/* Apparitions. */
const aLApparition = new Map<Element, () => void>();
const observateurApparitions = new IntersectionObserver(
  (entrees) => {
    for (const entree of entrees) {
      if (!entree.isIntersecting) continue;
      entree.target.classList.add('is-in');
      observateurApparitions.unobserve(entree.target);
      aLApparition.get(entree.target)?.();
    }
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0 },
);
const observerApparitions = (zone: ParentNode = document) => {
  for (const el of $$('[data-reveal]:not(.is-in), [data-levels]:not(.is-in)', zone))
    observateurApparitions.observe(el);
};
const quandIlApparait = (el: Element | null | undefined, rappel: () => void) => {
  if (el) aLApparition.set(el, rappel);
};

/* Défilement : profondeur des cartes et des sections (--p), couche de la méthode à hauteur de
   lecture. L'en-tête est suivi par scripts/commun/entete.ts. */
let elementsProfondeur: HTMLElement[] = [];
const rafraichirProfondeur = () => {
  elementsProfondeur = $$('.card, .profiles-section, .tools');
};

const anatomie = $('[data-anatomie]');
const couches = anatomie ? [1, 2, 3, 4, 5].map((n) => $$(`[data-couche="${n}"]`, anatomie)) : [];
let coucheActive = 0;
let coucheSurvolee = 0;
function activerCouche(n: number): void {
  if (n === coucheActive) return;
  coucheActive = n;
  couches.forEach((elements, i) => {
    for (const el of elements) el.classList.toggle('is-actif', i + 1 === n);
  });
}
/* Au défilement, la couche qui passe à hauteur de lecture est mise en avant, ou celle que survole
   le pointeur. Rien n'est épinglé : la page défile normalement. */
function suivreCouche(hauteur: number): void {
  if (!anatomie) return;
  if (coucheSurvolee) {
    activerCouche(coucheSurvolee);
    return;
  }
  const boite = anatomie.getBoundingClientRect();
  if (boite.bottom < 0 || boite.top > hauteur) return;
  const lecture = hauteur * 0.48;
  let proche = 0;
  let ecart = Infinity;
  couches.forEach((elements, i) => {
    const couche = elements.find((el) => el.classList.contains('anat-couche'));
    if (!couche) return;
    const r = couche.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - lecture);
    if (d < ecart) {
      ecart = d;
      proche = i + 1;
    }
  });
  activerCouche(proche);
}
function initialiserAnatomie(): void {
  if (!anatomie) return;
  const fiche = $('.anat-fiche', anatomie);
  const observateur = new IntersectionObserver(
    (entrees) => {
      const visibles = entrees
        .filter((e) => e.isIntersecting)
        .toSorted(
          (a, b) =>
            Number((a.target as HTMLElement).dataset.couche) -
            Number((b.target as HTMLElement).dataset.couche),
        );
      const depart = fiche?.classList.contains('is-vu') ? 0 : 160;
      fiche?.classList.add('is-vu');
      visibles.forEach((entree, rang) => {
        const n = Number((entree.target as HTMLElement).dataset.couche);
        for (const el of couches[n - 1] ?? []) {
          el.style.setProperty('--attente', `${depart + rang * 150}ms`);
          el.classList.add('is-vu');
        }
        observateur.unobserve(entree.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const el of $$('.anat-couche', anatomie)) observateur.observe(el);
  anatomie.addEventListener('pointerover', (evenement) => {
    const el = (evenement.target as Element).closest<HTMLElement>('[data-couche]');
    if (!el || evenement.pointerType === 'touch') return;
    coucheSurvolee = Number(el.dataset.couche);
    activerCouche(coucheSurvolee);
  });
  anatomie.addEventListener('pointerleave', () => {
    coucheSurvolee = 0;
    suivreCouche(window.innerHeight);
  });
}

let enAttenteImage = false;
function imageDefilement(): void {
  enAttenteImage = false;
  const hauteur = window.innerHeight;
  if (completes())
    for (const el of elementsProfondeur) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > hauteur + 100) continue;
      el.style.setProperty('--p', clamp((hauteur - r.top) / (hauteur + r.height), 0, 1).toFixed(3));
    }
  suivreCouche(hauteur);
}
const demanderImage = () => {
  if (enAttenteImage) return;
  enAttenteImage = true;
  requestAnimationFrame(imageDefilement);
};
window.addEventListener('scroll', demanderImage, { passive: true });
window.addEventListener('resize', demanderImage);

/* Onglets (prototype : initTabs) ------------------------------------------------------------------ */

function initialiserOnglets(
  liste: HTMLElement | null,
  choisir: (onglet: HTMLElement, rang: number) => void,
): void {
  if (!liste) return;
  const onglets = $$('[role="tab"]', liste);
  const selectionner = (onglet: HTMLElement, focus = false) => {
    for (const autre of onglets) {
      const actif = autre === onglet;
      autre.setAttribute('aria-selected', String(actif));
      autre.tabIndex = actif ? 0 : -1;
    }
    if (focus) onglet.focus();
    choisir(onglet, onglets.indexOf(onglet));
  };
  onglets.forEach((onglet, i) => {
    onglet.addEventListener('click', () => {
      if (onglet.getAttribute('aria-selected') !== 'true') selectionner(onglet);
    });
    onglet.addEventListener('keydown', (evenement) => {
      const vertical = liste.getAttribute('aria-orientation') === 'vertical';
      const deplacements: Record<string, number | 'premier' | 'dernier'> = vertical
        ? {
            ArrowDown: 1,
            ArrowUp: -1,
            ArrowRight: 1,
            ArrowLeft: -1,
            Home: 'premier',
            End: 'dernier',
          }
        : { ArrowRight: 1, ArrowLeft: -1, Home: 'premier', End: 'dernier' };
      const deplacement = deplacements[evenement.key];
      if (deplacement === undefined) return;
      evenement.preventDefault();
      const suivant =
        deplacement === 'premier'
          ? 0
          : deplacement === 'dernier'
            ? onglets.length - 1
            : (i + deplacement + onglets.length) % onglets.length;
      const cible = onglets[suivant];
      if (cible) selectionner(cible, true);
    });
  });
}

/* À explorer : cartes et parcours qui les relie (modèle « Parcours ») ------------------------------ */

const listeCartes = $('[data-cards-list]');
const scene = $('[data-cards-stage]');
const traceParcours = $<SVGSVGElement>('[data-cards-path]');
const noeudsParcours = $('[data-cards-nodes]');
const DUREE_TRACE = 2000;
/** Onglets du prototype (data-list) et listes de l'API. */
const ONGLETS: Record<string, ListeAccueil> = {
  useful: 'utiles',
  recent: 'recentes',
  reproduced: 'reproduites',
};
let listeCourante: ListeAccueil = 'utiles';

const decalageDans = (el: HTMLElement | null, ancetre: HTMLElement) => {
  let x = 0;
  let y = 0;
  let courant: HTMLElement | null = el;
  while (courant && courant !== ancetre) {
    x += courant.offsetLeft;
    y += courant.offsetTop;
    courant = courant.offsetParent as HTMLElement | null;
  }
  return { x, y };
};
const r1 = (v: number) => Math.round(v * 10) / 10;

interface Boite {
  i: number;
  left: number;
  right: number;
  top: number;
  y: number;
}

/** Géométrie du parcours (prototype : pathGeometry) : il serpente d'une rangée à l'autre. */
function geometrieParcours() {
  if (!listeCartes || !scene) return null;
  const boites: Boite[] = $$(':scope > li', listeCartes).flatMap((li, i) => {
    const carte = li.firstElementChild as HTMLElement | null;
    const media = carte?.querySelector<HTMLElement>('.card-media');
    if (!carte || !media) return [];
    const o = decalageDans(carte, scene);
    return [
      {
        i,
        left: o.x,
        right: o.x + carte.offsetWidth,
        top: o.y,
        y: o.y + media.offsetTop + media.offsetHeight / 2,
      },
    ];
  });
  if (!boites.length) return null;
  const fin = listeCartes.offsetTop + listeCartes.offsetHeight + 34;
  const rangees: {
    top: number;
    items: Boite[];
    dir: number;
    y: number;
    xIn: number;
    xOut: number;
  }[] = [];
  for (const b of boites) {
    const rangee = rangees.find((r) => Math.abs(r.top - b.top) < 12);
    if (rangee) rangee.items.push(b);
    else rangees.push({ top: b.top, items: [b], dir: 1, y: 0, xIn: 0, xOut: 0 });
  }
  rangees.sort((a, b) => a.top - b.top);
  const noeuds: { n: number; x: number; y: number }[] = [];

  if (rangees.every((r) => r.items.length === 1)) {
    const x = r1(Math.max(12, Math.min(...boites.map((b) => b.left)) / 2));
    for (const b of boites) noeuds.push({ n: b.i + 1, x, y: r1(b.y) });
    const haut = r1(Math.max(4, (boites[0]?.y ?? 0) - 56));
    return { d: `M${x},${haut} V${fin}`, debut: { x, y: haut }, tete: { x, y: fin }, noeuds };
  }

  const rect = scene.getBoundingClientRect();
  const cote = Math.min(rect.left, document.documentElement.clientWidth - rect.right);
  const bombe = clamp(cote - 14, 16, 64);
  const c = bombe / 0.75;
  rangees.forEach((rangee, k) => {
    rangee.dir = k % 2 === 0 ? 1 : -1;
    rangee.y = rangee.items.reduce((s, it) => s + it.y, 0) / rangee.items.length;
    const gauches = rangee.items.map((it) => it.left);
    const droites = rangee.items.map((it) => it.right);
    rangee.xIn = rangee.dir === 1 ? Math.min(...gauches) : Math.max(...droites);
    rangee.xOut = rangee.dir === 1 ? Math.max(...droites) : Math.min(...gauches);
    for (const it of rangee.items)
      noeuds.push({ n: it.i + 1, x: r1(rangee.dir === 1 ? it.left : it.right), y: r1(rangee.y) });
  });
  const premiere = rangees[0]!;
  const sx = premiere.xIn - premiere.dir * bombe;
  const sy = Math.min(premiere.top + 6, premiere.y - bombe);
  let d = `M${r1(sx)},${r1(sy)} V${r1(premiere.y - bombe)} Q${r1(sx)},${r1(premiere.y)} ${r1(premiere.xIn)},${r1(premiere.y)}`;
  rangees.forEach((rangee, k) => {
    d += ` L${r1(rangee.xOut)},${r1(rangee.y)}`;
    const suivante = rangees[k + 1];
    if (!suivante) return;
    const bord =
      rangee.dir === 1 ? Math.max(rangee.xOut, suivante.xIn) : Math.min(rangee.xOut, suivante.xIn);
    d += ` C${r1(bord + rangee.dir * c)},${r1(rangee.y)} ${r1(bord + rangee.dir * c)},${r1(suivante.y)} ${r1(suivante.xIn)},${r1(suivante.y)}`;
  });
  const derniere = rangees[rangees.length - 1]!;
  const ex = derniere.xOut + derniere.dir * bombe;
  d += ` Q${r1(ex)},${r1(derniere.y)} ${r1(ex)},${r1(derniere.y + bombe)} V${fin}`;
  return { d, debut: { x: r1(sx), y: r1(sy) }, tete: { x: r1(ex), y: fin }, noeuds };
}

let minuterieTrace: ReturnType<typeof setTimeout> | undefined;
function tracerParcours(): void {
  if (!scene) return;
  clearTimeout(minuterieTrace);
  scene.classList.remove('is-drawn', 'is-settled');
  void scene.offsetWidth;
  scene.classList.add('is-drawn');
  minuterieTrace = setTimeout(() => scene.classList.add('is-settled'), DUREE_TRACE + 700);
}

function disposerParcours({ retracer = false } = {}): void {
  if (!scene || !traceParcours || !noeudsParcours) return;
  scene.classList.add('has-path');
  const geo = geometrieParcours();
  if (!geo) {
    traceParcours.textContent = '';
    noeudsParcours.textContent = '';
    return;
  }
  const W = scene.clientWidth;
  const H = geo.tete.y + 12;
  traceParcours.setAttribute('viewBox', `0 0 ${W} ${H}`);
  traceParcours.setAttribute('width', String(W));
  traceParcours.setAttribute('height', String(H));
  traceParcours.innerHTML = `
      <path class="cp-line" d="${geo.d}"/>
      <path class="cp-flow" d="${geo.d}" pathLength="1"/>
      <circle class="cp-start" cx="${geo.debut.x}" cy="${geo.debut.y}" r="5"/>
      <path class="cp-head" d="M${geo.tete.x - 7},${geo.tete.y - 9} L${geo.tete.x},${geo.tete.y} L${geo.tete.x + 7},${geo.tete.y - 9}"/>`;
  const ligne = traceParcours.querySelector<SVGPathElement>('.cp-line');
  if (!ligne) return;
  const total = ligne.getTotalLength();
  ligne.style.setProperty('--len', total.toFixed(1));
  const echantillons: DOMPoint[] = [];
  for (let s = 0; s <= 240; s += 1) echantillons.push(ligne.getPointAtLength((total * s) / 240));
  noeudsParcours.innerHTML = geo.noeuds
    .map((noeud) => {
      let meilleur = 0;
      let distance = Infinity;
      echantillons.forEach((p, s) => {
        const d = (p.x - noeud.x) ** 2 + (p.y - noeud.y) ** 2;
        if (d < distance) {
          distance = d;
          meilleur = s;
        }
      });
      return `<span class="cp-node${noeud.n === 1 ? ' is-first' : ''}" data-n="${noeud.n}" style="left:${noeud.x}px;top:${noeud.y}px;--d:${Math.round((meilleur / 240) * DUREE_TRACE)}ms">${noeud.n}</span>`;
    })
    .join('');
  if (retracer || !scene.classList.contains('is-drawn')) {
    if (!completes()) scene.classList.add('is-drawn', 'is-settled');
    else if (estVisible(scene)) tracerParcours();
    else scene.classList.remove('is-drawn', 'is-settled');
  }
}

function afficherCartes({ animer = false } = {}): void {
  if (!listeCartes || !accueil) return;
  const html = listeHTML(accueil.creations[listeCourante], listeCourante, maintenant());
  const legende = $('[data-explore-caption]');
  const terminer = () => {
    listeCartes.innerHTML = html;
    if (legende) legende.textContent = typo(LEGENDES[listeCourante]);
    listeCartes.classList.remove('is-switching');
    disposerParcours({ retracer: true });
    rafraichirProfondeur();
    demanderImage();
    const elements = $$(':scope > li', listeCartes);
    if (animer && completes())
      elements.forEach((li, i) =>
        li.animate(
          [
            { opacity: 0, transform: 'translateY(22px) scale(0.98)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 620,
            delay: i * 70,
            easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
            fill: 'backwards',
          },
        ),
      );
    else if (!animer) {
      elements.forEach((li, i) => {
        li.setAttribute('data-reveal', '');
        li.style.setProperty('--stagger', String(i));
      });
      observerApparitions(listeCartes);
    }
  };
  if (animer && completes() && listeCartes.children.length) {
    listeCartes.classList.add('is-switching');
    setTimeout(terminer, 230);
  } else terminer();
}

function initialiserCartes(): void {
  if (!listeCartes || !scene) return;
  // Les cartes de « Plus utiles » sont rendues par le serveur : elles apparaissent comme les autres.
  $$(':scope > li', listeCartes).forEach((li, i) => {
    li.setAttribute('data-reveal', '');
    li.style.setProperty('--stagger', String(i));
  });
  disposerParcours({ retracer: true });
  initialiserOnglets($('[data-tabs="explore"]'), (onglet) => {
    listeCourante = ONGLETS[onglet.dataset.list ?? ''] ?? 'utiles';
    $('#explore-panel')?.setAttribute('aria-labelledby', onglet.id);
    afficherCartes({ animer: true });
  });
  let image = 0;
  const planifier = () => {
    cancelAnimationFrame(image);
    image = requestAnimationFrame(() => disposerParcours());
  };
  new ResizeObserver(planifier).observe(listeCartes);
  window.addEventListener('resize', planifier);
  surveiller(scene, (visible) => {
    if (visible && !scene.classList.contains('is-drawn')) tracerParcours();
  });
  const noeudChaud = (evenement: Event, actif: boolean) => {
    const li = (evenement.target as Element).closest('[data-cards-list] > li');
    if (!li) return;
    const relie = (evenement as PointerEvent | FocusEvent).relatedTarget as Node | null;
    if (!actif && relie && li.contains(relie)) return;
    const rang = $$(':scope > li', listeCartes).indexOf(li as HTMLElement) + 1;
    $(`.cp-node[data-n="${rang}"]`, noeudsParcours ?? document)?.classList.toggle('is-hot', actif);
  };
  listeCartes.addEventListener('pointerover', (e) => noeudChaud(e, true));
  listeCartes.addEventListener('pointerout', (e) => noeudChaud(e, false));
  listeCartes.addEventListener('focusin', (e) => noeudChaud(e, true));
  listeCartes.addEventListener('focusout', (e) => noeudChaud(e, false));
}

/* Apprendre : Bon réflexe, clinique, défi --------------------------------------------------------- */

/** Note sous la correction, selon que la réponse est gardée (prototype : reflexNote, RG-72). */
function noteDuCas(cas: CasApi, enregistree: boolean, juste: boolean): NoteCas {
  if (cas.moi?.auteur) return { sorte: 'auteur' };
  if (enregistree) return { sorte: 'enregistree', juste };
  return {
    sorte: 'libre',
    invitation: etats.membre()
      ? invitation('contribuer', 'enregistrer vos réponses')
      : t('Créez un compte pour enregistrer vos réponses.'),
  };
}

function initialiserBonReflexe(): void {
  const boite = $('[data-reflex]');
  const cas = accueil?.bonReflexe.cas;
  if (!boite || !cas) return;
  const verdict = $('[data-verdict]', boite);
  const resultat = $('[data-reflex-result]', boite);
  const boutons = $$<HTMLButtonElement>('[data-choice]', boite);
  if (!verdict || !resultat) return;
  let envoi = false;

  const reinitialiser = () => {
    verdict.classList.remove('is-answered');
    for (const b of boutons) {
      b.removeAttribute('aria-disabled');
      b.removeAttribute('aria-pressed');
      b.removeAttribute('data-correct');
      b.removeAttribute('data-share');
      b.classList.remove('is-chosen');
      const touche = $('kbd', b);
      if (touche) touche.textContent = b.dataset.key ?? '';
    }
    resultat.hidden = true;
    resultat.textContent = '';
    boutons[0]?.focus();
  };

  const montrer = (
    correction: CorrectionCasApi,
    choix: number | null,
    note: NoteCas,
    focus: boolean,
  ) => {
    verdict.classList.add('is-answered');
    for (const b of boutons) {
      const id = Number(b.dataset.choice);
      b.setAttribute('aria-disabled', 'true');
      b.setAttribute('aria-pressed', String(id === choix));
      b.classList.toggle('is-chosen', id === choix);
      // Couleur de la bonne option et part des réponses (styles du prototype : data-correct, data-share).
      b.toggleAttribute('data-correct', id === correction.optionCorrecteId);
      b.dataset.share = String(correction.options.find((o) => o.id === id)?.part ?? 0);
      const touche = $('kbd', b);
      if (!touche) continue;
      if (id === correction.optionCorrecteId) touche.innerHTML = icon('check', 'icon-xs');
      else if (id === choix) touche.innerHTML = icon('x', 'icon-xs');
    }
    resultat.innerHTML = correctionHTML(cas, correction, choix, note);
    resultat.hidden = false;
    if (focus) resultat.focus({ preventScroll: true });
    $('[data-reflex-reset]', resultat)?.addEventListener('click', reinitialiser);
  };

  const choisir = async (bouton: HTMLButtonElement) => {
    if (verdict.classList.contains('is-answered') || envoi) return;
    const optionId = Number(bouton.dataset.choice);
    envoi = true;
    bouton.setAttribute('aria-busy', 'true');
    const reponse = await api<ReponseCasApi>('POST', `/api/v1/cas/${cas.id}/reponses`, {
      optionId,
    });
    bouton.removeAttribute('aria-busy');
    envoi = false;
    if (!reponse.ok) {
      toast(
        reponse.probleme.status === 404
          ? 'Ce cas n’est plus disponible.'
          : (reponse.probleme.detail ??
              'La réponse n’a pas été envoyée. Réessayez dans un instant.'),
        'alert',
      );
      return;
    }
    const r = reponse.donnees;
    montrer(r.correction, r.optionId, noteDuCas(cas, r.enregistree, r.correcte), true);
  };

  for (const b of boutons) b.addEventListener('click', () => void choisir(b));
  boite.addEventListener('keydown', (evenement) => {
    if (
      evenement.ctrlKey ||
      evenement.metaKey ||
      evenement.altKey ||
      verdict.classList.contains('is-answered')
    )
      return;
    const k = 'abcde'.indexOf(evenement.key.toLowerCase());
    const bouton = boutons[k];
    if (k < 0 || !bouton) return;
    evenement.preventDefault();
    bouton.focus();
    void choisir(bouton);
  });

  // Cas déjà répondu (RG-72), ou rédigé par la personne : la correction est là d'emblée.
  if (cas.correction && (cas.moi?.reponse || cas.moi?.auteur))
    montrer(
      cas.correction,
      cas.moi.reponse?.optionId ?? null,
      noteDuCas(cas, Boolean(cas.moi.reponse), cas.moi.reponse?.correcte ?? false),
      false,
    );
}

function initialiserLaboratoire(): void {
  const labo = $('[data-lab]');
  if (!labo) return;
  const panneaux = $$('.lab-panel', labo);
  const clinique = $('[data-clinic]', labo);
  const jouerClinique = () => {
    if (!clinique) return;
    clinique.classList.remove('is-play');
    void clinique.offsetWidth;
    clinique.classList.add('is-play');
  };
  const etage = $('.lab-stage', labo);
  const ajuster = () => {
    if (!etage) return;
    etage.style.minHeight = '';
    if (window.innerWidth < 768) return;
    let plusHaut = 0;
    for (const panneau of panneaux) {
      const cache = panneau.hidden;
      panneau.hidden = false;
      plusHaut = Math.max(plusHaut, panneau.offsetHeight);
      panneau.hidden = cache;
    }
    etage.style.minHeight = `${plusHaut}px`;
  };
  ajuster();
  let attente: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(attente);
    attente = setTimeout(ajuster, 150);
  });
  void document.fonts?.ready.then(ajuster);
  initialiserOnglets($('[data-tabs="lab"]', labo), (onglet) => {
    for (const panneau of panneaux) {
      const actif = panneau.id === onglet.getAttribute('aria-controls');
      panneau.hidden = !actif;
      panneau.classList.toggle('is-active', actif);
      if (actif && panneau === clinique) jouerClinique();
    }
  });
  const ouvrirDepuisAncre = () => {
    if (location.hash === '#defis') $<HTMLButtonElement>('#lab-tab-challenge')?.click();
  };
  ouvrirDepuisAncre();
  window.addEventListener('hashchange', ouvrirDepuisAncre);
}

function initialiserCompteARebours(): void {
  const boite = $('[data-countdown]');
  const fin = boite?.dataset.fin;
  if (!boite || !fin) return;
  const parties = {
    d: $('[data-cd="d"]', boite),
    h: $('[data-cd="h"]', boite),
    m: $('[data-cd="m"]', boite),
    s: $('[data-cd="s"]', boite),
  };
  const afficher = () => {
    const valeurs = resteAvant(fin, maintenant().getTime());
    for (const cle of ['d', 'h', 'm', 's'] as const) {
      const el = parties[cle];
      if (!el || el.textContent === valeurs[cle]) continue;
      el.textContent = valeurs[cle];
      if (completes()) {
        el.classList.remove('is-tick');
        void el.offsetWidth;
        el.classList.add('is-tick');
      }
    }
  };
  afficher();
  setInterval(() => {
    if (!document.hidden) afficher();
  }, 1000);
}

/* La communauté : fil, courbe, répartition --------------------------------------------------------- */

const fil = $('[data-feed]');
let filEnPause = false;
const TAILLE_FIL = 8;

function ajouterAuFil(html: string, cle: string, animer: boolean): void {
  if (!fil) return;
  $('.feed-vide', fil)?.remove();
  const li = document.createElement('li');
  li.className = 'feed-item';
  li.dataset.cle = cle;
  li.innerHTML = html;
  fil.prepend(li);
  if (animer && completes()) {
    li.classList.add('is-entering', 'is-fresh');
    requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('is-entering')));
    setTimeout(() => li.classList.remove('is-fresh'), 2600);
  }
  const lignes = $$('.feed-item:not(.is-leaving)', fil);
  for (const ancienne of lignes.slice(TAILLE_FIL)) {
    if (animer && completes()) {
      ancienne.classList.add('is-leaving');
      setTimeout(() => ancienne.remove(), 520);
    } else ancienne.remove();
  }
}

/** Relit le fil et ajoute ce qui est nouveau, du plus ancien au plus récent. */
async function relireFil(): Promise<void> {
  if (!fil) return;
  const reponse = await api<ActiviteRecenteApi>('GET', '/api/v1/accueil/activite');
  if (!reponse.ok) return;
  const presentes = new Set($$('.feed-item', fil).map((li) => li.dataset.cle));
  const nouvelles = reponse.donnees.elements.filter((a) => !presentes.has(a.cle));
  for (const a of nouvelles.toReversed()) ajouterAuFil(activiteHTML(a, maintenant()), a.cle, true);
}

function initialiserFil(): void {
  if (!fil) return;
  setInterval(() => {
    for (const heure of $$<HTMLTimeElement>('time[data-created]', fil))
      heure.textContent = typo(ilYa(heure.dataset.created ?? '', maintenant()));
  }, 15_000);
  surveiller(fil);
  // Relu toutes les 30 secondes tant que le fil est à l'écran et n'est pas en pause.
  setInterval(() => {
    if (filEnPause || !ambiance() || !estVisible(fil)) return;
    void relireFil();
  }, 30_000);

  const bouton = $<HTMLButtonElement>('[data-feed-toggle]');
  if (!bouton) return;
  const afficher = () => {
    bouton.innerHTML = icon(filEnPause ? 'play' : 'pause');
    const libelle = filEnPause
      ? 'Reprendre le fil d’activité'
      : 'Mettre en pause le fil d’activité';
    bouton.setAttribute('aria-label', libelle);
    bouton.title = libelle;
  };
  bouton.addEventListener('click', () => {
    filEnPause = !filEnPause;
    afficher();
    if (!filEnPause) void relireFil();
  });
  afficher();
}

let courbeApparue = false;
function dessinerCourbe(a: ApprentissageAccueilApi): void {
  const boite = $('[data-chart]');
  if (!boite) return;
  const g = geometrie(a.parJour, boite.clientWidth);
  boite.innerHTML = courbeHTML(a, g.largeur);
  boite.dataset.width = String(g.largeur);
  boite.classList.toggle('is-drawn', courbeApparue || !completes());
  const svg = $<SVGSVGElement>('svg', boite);
  if (!svg) return;
  const croix = svg.querySelector('.ch-cross');
  const ligne = svg.querySelector('.ch-hair');
  const marque = svg.querySelector('.ch-mark');
  const zone = svg.querySelector<SVGRectElement>('.ch-hit');
  const n = a.parJour.length;
  const largeurTrace = g.largeur - g.marges.l - g.marges.r;
  let bulle: HTMLDivElement | null = null;
  let rang = n - 1;
  const montrer = (i: number) => {
    rang = clamp(i, 0, n - 1);
    const px = g.x(rang);
    const py = g.y(a.parJour[rang] ?? 0);
    croix?.removeAttribute('hidden');
    ligne?.setAttribute('x1', String(px));
    ligne?.setAttribute('x2', String(px));
    marque?.setAttribute('cx', String(px));
    marque?.setAttribute('cy', String(py));
    if (!bulle) {
      bulle = document.createElement('div');
      bulle.className = 'chart-tip';
      bulle.setAttribute('aria-hidden', 'true');
      boite.appendChild(bulle);
    }
    bulle.innerHTML = `<b>${t(`${libelleJour(a.debut, rang)}${rang === n - 1 ? ' · en cours' : ''}`)}</b><span>Interactions<strong>${typo(fmt(a.parJour[rang] ?? 0))}</strong></span>`;
    const echelle = svg.getBoundingClientRect().width / g.largeur;
    bulle.style.left = `${clamp(px * echelle, 70, boite.clientWidth - 70)}px`;
    bulle.style.top = `${py * echelle}px`;
    bulle.hidden = false;
  };
  const cacher = () => {
    croix?.setAttribute('hidden', '');
    if (bulle) bulle.hidden = true;
  };
  zone?.addEventListener('pointermove', (evenement) => {
    const r = svg.getBoundingClientRect();
    const local = ((evenement.clientX - r.left) / r.width) * g.largeur;
    montrer(Math.round(((local - g.marges.l) / largeurTrace) * (n - 1)));
  });
  zone?.addEventListener('pointerleave', cacher);
  zone?.addEventListener('focus', () => montrer(rang));
  zone?.addEventListener('blur', cacher);
  zone?.addEventListener('keydown', (evenement) => {
    const deplacements: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: -n,
      End: n,
    };
    const d = deplacements[evenement.key];
    if (d === undefined) return;
    evenement.preventDefault();
    montrer(rang + d);
  });
}

function initialiserCourbe(): void {
  const a = accueil?.apprentissage;
  const boite = $('[data-chart]');
  if (!a || !boite) return;
  dessinerCourbe(a);
  quandIlApparait($('.pulse-card'), () => {
    courbeApparue = true;
    requestAnimationFrame(() => boite.classList.add('is-drawn'));
  });
  let attente: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(attente);
    attente = setTimeout(() => {
      if (Math.abs((Number(boite.dataset.width) || 0) - boite.clientWidth) > 8) dessinerCourbe(a);
    }, 160);
  });
  // Répartition : survoler une part atténue les autres.
  const repartition = $('[data-breakdown]');
  if (!repartition) return;
  const mettreEnAvant = (i: number | null) => {
    for (const el of $$('[data-mix]', repartition))
      el.classList.toggle('is-dim', i !== null && Number(el.dataset.mix) !== i);
  };
  for (const el of $$('[data-mix]', repartition)) {
    el.addEventListener('pointerenter', () => mettreEnAvant(Number(el.dataset.mix)));
    el.addEventListener('pointerleave', () => mettreEnAvant(null));
  }
}

/* Progresser : barres du classement à l'apparition ------------------------------------------------- */

function initialiserClassement(): void {
  const tableau = $('[data-board]');
  quandIlApparait(tableau?.closest('[data-reveal]'), () => {
    if (!completes() || !tableau) return;
    for (const barre of $$('.board-bar span', tableau))
      barre.animate(
        [
          { transform: 'scaleX(0)' },
          { transform: `scaleX(${barre.style.getPropertyValue('--v') || '1'})` },
        ],
        { duration: 1000, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
      );
  });
}

/* Le constat : la comparaison glisse une fois à l'apparition --------------------------------------- */

function initialiserComparaison(): void {
  const boite = $('[data-compare]');
  const curseur = $<HTMLInputElement>('[data-compare-range]', boite ?? document);
  if (!boite || !curseur) return;
  let touche = false;
  const regler = (valeur: string | number) => boite.style.setProperty('--pos', `${valeur}%`);
  curseur.addEventListener('input', () => {
    touche = true;
    regler(curseur.value);
  });
  curseur.addEventListener('pointerdown', () => {
    touche = true;
  });
  quandIlApparait(boite, () => {
    if (!completes() || touche) return;
    const cles = [
      [0, 50],
      [700, 30],
      [1500, 70],
      [2300, 50],
    ] as const;
    const debut = performance.now() + 500;
    const etape = (instant: number) => {
      if (touche) return;
      const ecoule = instant - debut;
      if (ecoule < 0) {
        requestAnimationFrame(etape);
        return;
      }
      let valeur = 50;
      for (let i = 0; i < cles.length - 1; i += 1) {
        const [t0, v0] = cles[i]!;
        const [t1, v1] = cles[i + 1]!;
        if (ecoule >= t0 && ecoule <= t1)
          valeur = v0 + (v1 - v0) * entreeSortie((ecoule - t0) / (t1 - t0));
      }
      regler(valeur.toFixed(2));
      curseur.value = String(Math.round(valeur));
      if (ecoule < cles[cles.length - 1]![0]) requestAnimationFrame(etape);
    };
    requestAnimationFrame(etape);
  });
}

/* Héros : intention et hauteur visible ------------------------------------------------------------- */

function initialiserIntention(): void {
  const champ = $<HTMLInputElement>('[data-intent]');
  if (!champ) return;
  const phrases = [
    'un site de réservation',
    'un logo pour mon association',
    'une analyse de mes ventes',
    'une illustration de couverture',
    'un script pour trier mes fichiers',
    'une lettre de motivation',
  ];
  let phrase = 0;
  let lettres = phrases[0]!.length;
  let efface = true;
  let attente = 2200;
  const battement = () => {
    setTimeout(battement, efface ? 32 : 58);
    if (!completes() || document.activeElement === champ || champ.value) {
      champ.placeholder = phrases[phrase]!;
      return;
    }
    if (attente > 0) {
      attente -= efface ? 32 : 58;
      return;
    }
    const cible = phrases[phrase]!;
    if (efface) {
      lettres -= 1;
      if (lettres <= 0) {
        efface = false;
        phrase = (phrase + 1) % phrases.length;
        lettres = 0;
        attente = 250;
      }
    } else {
      lettres += 1;
      if (lettres >= phrases[phrase]!.length) {
        efface = true;
        attente = 2200;
      }
    }
    champ.placeholder = (efface ? cible : phrases[phrase]!).slice(0, Math.max(lettres, 0)) || ' ';
  };
  setTimeout(battement, 1800);
}

/** Plein écran : le héros prend la hauteur visible sous ce qui le précède (bandeau du compte). */
function mesurerHero(): void {
  const hero = $('[data-hero-section]');
  if (!hero) return;
  const haut = hero.getBoundingClientRect().top + window.scrollY;
  racine.style.setProperty('--hero-avant', `${Math.max(0, Math.round(haut))}px`);
}

/* Survol : boutons magnétiques (effets standard). */
function initialiserSurvols(): void {
  const fin = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener(
    'pointermove',
    (evenement) => {
      if (evenement.pointerType !== 'mouse' || !fin.matches || !completes()) return;
      const aimant = (evenement.target as Element).closest<HTMLElement>('[data-magnetic]');
      if (!aimant) return;
      const r = aimant.getBoundingClientRect();
      const dx = evenement.clientX - (r.left + r.width / 2);
      const dy = evenement.clientY - (r.top + r.height / 2);
      aimant.style.setProperty('--mx', `${clamp(dx * 0.22, -10, 10).toFixed(1)}px`);
      aimant.style.setProperty('--my', `${clamp(dy * 0.32, -8, 8).toFixed(1)}px`);
    },
    { passive: true },
  );
  document.addEventListener('pointerout', (evenement) => {
    const aimant = (evenement.target as Element).closest<HTMLElement>('[data-magnetic]');
    if (aimant && !aimant.contains(evenement.relatedTarget as Node | null)) {
      aimant.style.removeProperty('--mx');
      aimant.style.removeProperty('--my');
    }
  });
}

/* Profils : onglets ------------------------------------------------------------------------------- */

function initialiserProfils(): void {
  const panneaux = $$('.profile-panel');
  initialiserOnglets($('[data-tabs="profiles"]'), (_, rang) => {
    panneaux.forEach((panneau, i) => {
      panneau.hidden = i !== rang;
      panneau.classList.toggle('is-active', i === rang);
    });
  });
}

/* Démarrage ---------------------------------------------------------------------------------------- */

const hero = $('[data-hero-section]');
const vagues = hero ? initialiserVagues(hero, niveauAnimations) : null;
mesurerHero();
window.addEventListener('resize', mesurerHero);
etats.on(() => requestAnimationFrame(mesurerHero));

initialiserCartes();
initialiserCourbe();
initialiserFil();
initialiserClassement();
initialiserProfils();
initialiserBonReflexe();
initialiserLaboratoire();
initialiserCompteARebours();
initialiserComparaison();
initialiserIntention();
initialiserSurvols();

const constellation = $<HTMLCanvasElement>('[data-constellation]');
if (constellation) initialiserConstellation(constellation, animations);
const sphere = $('[data-sphere]');
if (sphere) initialiserSphere(sphere, donnees?.outils ?? [], animations);
const outils = $('[data-outils]');
if (outils) initialiserTrame(outils, animations);
initialiserAnatomie();
rafraichirProfondeur();
observerApparitions();
for (const el of $$('[data-count]')) observateurCompteurs.observe(el);
demanderImage();

let pret = false;
const demarrer = () => {
  if (pret) return;
  pret = true;
  document.body.classList.add('is-ready');
  if (vagues) setTimeout(vagues.remesurer, 1300);
};
const polices = document.fonts?.ready ?? Promise.resolve();
void Promise.race([polices, new Promise((resolve) => setTimeout(resolve, 900))]).then(() => {
  requestAnimationFrame(demarrer);
  setTimeout(demarrer, 250);
});
