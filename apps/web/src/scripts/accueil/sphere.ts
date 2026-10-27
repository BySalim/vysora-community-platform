import type { DonneesAccueil } from '../../lib/accueil/donnees';
import { logo } from '../../lib/explorer/elements';
import { esc } from '../../lib/texte';
import type { Animations } from './fonds';

/* Sphère des outils (prototype/app.js : initSphere) : trente outils du référentiel posés sur une
   sphère qui tourne ; ceux qui passent derrière cèdent la place aux suivants. Elle se fait tourner
   au pointeur ; deux orbites inclinées passent devant et derrière elle. */

type Outil = DonneesAccueil['outils'][number];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const sortie = (x: number) => 1 - Math.pow(1 - x, 3);
const TAU = Math.PI * 2;
const PLACES = 30;
const VITESSE = TAU / 42000;

/** Deux orbites inclinées : leur moitié arrière passe derrière la sphère, l'autre devant. */
const ORBITES = [
  { k: 1.16, inclinaison: -0.32, aplati: 0.25, vitesse: 0.00011, points: [0.4, 3.6], tirets: [] },
  { k: 1.36, inclinaison: 0.2, aplati: 0.17, vitesse: -0.00007, points: [2.2], tirets: [2, 7] },
];

/** Outils mêlés par famille, pour que la sphère en montre de toutes sortes (prototype : mixed). */
function meles(liste: Outil[]): Outil[] {
  const groupes = new Map<string, Outil[]>();
  for (const o of liste) groupes.set(o.famille, [...(groupes.get(o.famille) ?? []), o]);
  const voies = [...groupes.values()];
  const resultat: Outil[] = [];
  for (let i = 0; resultat.length < liste.length; i += 1)
    for (const voie of voies) if (voie[i]) resultat.push(voie[i]!);
  return resultat;
}

function fibonacci(nombre: number): [number, number, number][] {
  const or = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: nombre }, (_, i) => {
    const y = 1 - ((i + 0.5) * 2) / nombre;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(i * or) * r, y, Math.sin(i * or) * r];
  });
}

const elementHTML = (o: Outil) => `${logo(o, 22)}<b>${esc(o.nom)}</b>`;

export function initialiserSphere(scene: HTMLElement, outils: Outil[], a: Animations): void {
  const toile = scene.querySelector<HTMLCanvasElement>('[data-sphere-canvas]');
  const boite = scene.querySelector<HTMLElement>('[data-sphere-items]');
  const ctx = toile?.getContext('2d');
  if (!toile || !boite || !ctx || !outils.length) return;

  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let lacet = 0.6;
  let tangage = -0.32;
  let tangageCible = -0.32;
  let direction = 0;
  let elan = 0;
  let glisse: { x: number; lacet: number; t: number; v: number } | null = null;
  let enCours = false;
  let image = 0;
  let dernier = 0;
  let debutEntree: number | null = null;
  let file: Outil[] = [];
  let curseur = 0;
  let places: {
    v: [number, number, number];
    el: HTMLSpanElement;
    outil: Outil;
    derriere: boolean;
    montre: boolean | null;
  }[] = [];
  let couleurLigne = 'rgba(23,23,23,.1)';
  let couleurFond = 'rgba(255,255,255,.8)';
  let couleurOrbite = 'rgba(37,99,235,.28)';
  let pointOrbite = '#2563EB';

  function construire(): void {
    file = meles(outils);
    const nombre = Math.min(PLACES, file.length);
    boite!.textContent = '';
    places = fibonacci(nombre).map((v, i) => {
      const el = document.createElement('span');
      el.className = 'sphere-item';
      const outil = file[i]!;
      el.innerHTML = elementHTML(outil);
      boite!.appendChild(el);
      return { v, el, outil, derriere: false, montre: null };
    });
    curseur = nombre % file.length;
  }

  function suivant(): Outil | null {
    const presents = new Set(places.map((p) => p.outil));
    for (let k = 0; k < file.length; k += 1) {
      const outil = file[(curseur + k) % file.length]!;
      if (!presents.has(outil)) {
        curseur = (curseur + k + 1) % file.length;
        return outil;
      }
    }
    return null;
  }

  function disposer(): void {
    const r = scene.getBoundingClientRect();
    W = r.width;
    H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    toile!.width = Math.round(W * dpr);
    toile!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H / 2;
    R = Math.min(W * 0.4, H * 0.42);
    const style = getComputedStyle(scene);
    couleurLigne = style.getPropertyValue('--sphere-line').trim() || 'rgba(23,23,23,.1)';
    couleurFond = style.getPropertyValue('--sphere-fill').trim() || 'rgba(255,255,255,.8)';
    couleurOrbite = style.getPropertyValue('--orbite').trim() || 'rgba(37,99,235,.28)';
    pointOrbite =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2563EB';
  }

  const entree = (delai: number, maintenant: number) =>
    debutEntree === null || !a.complete()
      ? 1
      : sortie(clamp((maintenant - debutEntree - delai) / 900, 0, 1));

  type Rotation = { cw: number; sw: number; cp: number; sp: number };
  const tourner = (v: [number, number, number], m: Rotation): [number, number, number] => {
    const x = v[0] * m.cw + v[2] * m.sw;
    const z1 = -v[0] * m.sw + v[2] * m.cw;
    return [x, v[1] * m.cp - z1 * m.sp, v[1] * m.sp + z1 * m.cp];
  };

  function orbites(r: number, maintenant: number, moitie: 'avant' | 'arriere', g: number): void {
    const c = ctx!;
    for (const o of ORBITES) {
      // Avant la mise en page (styles encore absents), la scène peut ne pas avoir de largeur.
      const rx = Math.max(0, Math.min(r * o.k, W / 2 - 8));
      const ry = rx * o.aplati;
      c.globalAlpha = g * (moitie === 'arriere' ? 0.55 : 1);
      c.setLineDash(o.tirets);
      c.beginPath();
      c.ellipse(
        cx,
        cy,
        rx,
        ry,
        o.inclinaison,
        moitie === 'arriere' ? Math.PI : 0,
        moitie === 'arriere' ? TAU : Math.PI,
      );
      c.strokeStyle = couleurOrbite;
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);
      for (const depart of o.points) {
        const angle = depart + maintenant * o.vitesse;
        const devant = Math.sin(angle) >= 0;
        if (devant !== (moitie === 'avant')) continue;
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        const x = cx + ex * Math.cos(o.inclinaison) - ey * Math.sin(o.inclinaison);
        const y = cy + ex * Math.sin(o.inclinaison) + ey * Math.cos(o.inclinaison);
        c.beginPath();
        c.arc(x, y, devant ? 3.2 : 2.4, 0, TAU);
        c.fillStyle = pointOrbite;
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function dessiner(maintenant: number): void {
    const c = ctx!;
    const m = {
      cw: Math.cos(lacet),
      sw: Math.sin(lacet),
      cp: Math.cos(tangage),
      sp: Math.sin(tangage),
    };
    const g = entree(0, maintenant);
    const r = R * (0.92 + 0.08 * g);
    const tempsOrbites = a.complete() ? maintenant : 0;
    c.clearRect(0, 0, W, H);
    orbites(r, tempsOrbites, 'arriere', g);
    c.globalAlpha = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.fillStyle = couleurFond;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = couleurLigne;
    c.stroke();

    const devant = new Path2D();
    const derriere = new Path2D();
    const cercle = (f: (t: number) => [number, number, number]) => {
      let precedent: [number, number, number] | null = null;
      for (let i = 0; i <= 72; i += 1) {
        const p = tourner(f((i / 72) * TAU), m);
        const point: [number, number, number] = [cx + p[0] * r, cy - p[1] * r, p[2]];
        if (precedent) {
          const chemin = (precedent[2] + point[2]) / 2 >= 0 ? devant : derriere;
          chemin.moveTo(precedent[0], precedent[1]);
          chemin.lineTo(point[0], point[1]);
        }
        precedent = point;
      }
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const la = (lat * Math.PI) / 180;
      cercle((t) => [Math.cos(la) * Math.cos(t), Math.sin(la), Math.cos(la) * Math.sin(t)]);
    }
    for (let k = 0; k < 6; k += 1) {
      const lo = (k / 6) * Math.PI;
      cercle((t) => [Math.cos(t) * Math.cos(lo), Math.sin(t), Math.cos(t) * Math.sin(lo)]);
    }
    c.strokeStyle = couleurLigne;
    c.globalAlpha = 0.45 * g;
    c.stroke(derriere);
    c.globalAlpha = g;
    c.stroke(devant);
    c.globalAlpha = 1;
    orbites(r, tempsOrbites, 'avant', g);

    places.forEach((place, i) => {
      const p = tourner(place.v, m);
      const profondeur = p[2];
      if (profondeur < -0.35 && !place.derriere) {
        place.derriere = true;
        if (file.length > places.length) {
          const outil = suivant();
          if (outil) {
            place.outil = outil;
            place.el.innerHTML = elementHTML(outil);
          }
        }
      } else if (profondeur > 0) place.derriere = false;
      const alpha = clamp((profondeur + 0.08) / 0.4, 0, 1) * entree(120 + i * 30, maintenant);
      const visible = alpha > 0.01;
      if (visible !== place.montre) {
        place.montre = visible;
        place.el.style.visibility = visible ? 'visible' : 'hidden';
      }
      if (!visible) return;
      const echelle = 0.74 + 0.3 * ((profondeur + 1) / 2);
      place.el.style.transform = `translate3d(${(cx + p[0] * r * 1.06).toFixed(1)}px, ${(cy - p[1] * r * 1.06).toFixed(1)}px, 0) translate(-50%, -50%) scale(${echelle.toFixed(3)})`;
      place.el.style.opacity = alpha.toFixed(3);
      place.el.style.zIndex = String(Math.round(profondeur * 100) + 100);
    });
  }

  function boucle(maintenant: number): void {
    if (!enCours) return;
    image = requestAnimationFrame(boucle);
    const dt = dernier ? Math.min(48, maintenant - dernier) : 16;
    dernier = maintenant;
    if (!glisse) {
      lacet += dt * (VITESSE + direction) + elan;
      elan *= 0.94;
    }
    tangage += (tangageCible - tangage) * 0.05;
    dessiner(maintenant);
  }

  function actualiser(): void {
    const lancer = a.complete() && a.visible(scene) && !document.hidden;
    if (lancer && debutEntree === null) debutEntree = performance.now();
    if (lancer && !enCours) {
      enCours = true;
      dernier = 0;
      image = requestAnimationFrame(boucle);
    }
    if (!lancer && enCours) {
      enCours = false;
      cancelAnimationFrame(image);
    }
    if (!lancer) dessiner(performance.now());
  }

  scene.addEventListener('pointermove', (evenement) => {
    const r = scene.getBoundingClientRect();
    if (evenement.pointerType === 'mouse' && !glisse) {
      direction = clamp((evenement.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * VITESSE * 2.4;
      tangageCible = -0.32 + clamp((evenement.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 0.5;
    }
    if (!glisse) return;
    const maintenant = performance.now();
    const prochain = glisse.lacet + (evenement.clientX - glisse.x) * 0.006;
    glisse.v = ((prochain - lacet) / Math.max(16, maintenant - glisse.t)) * 16;
    glisse.t = maintenant;
    lacet = prochain;
    if (!enCours) dessiner(maintenant);
  });
  scene.addEventListener('pointerleave', () => {
    direction = 0;
    tangageCible = -0.32;
  });
  scene.addEventListener('pointerdown', (evenement) => {
    if (evenement.button !== 0) return;
    glisse = { x: evenement.clientX, lacet, t: performance.now(), v: 0 };
    scene.setPointerCapture(evenement.pointerId);
    scene.classList.add('is-dragging');
  });
  const lacher = () => {
    if (!glisse) return;
    elan = clamp(glisse.v, -0.06, 0.06);
    glisse = null;
    scene.classList.remove('is-dragging');
  };
  scene.addEventListener('pointerup', lacher);
  scene.addEventListener('pointercancel', lacher);

  construire();
  disposer();
  dessiner(performance.now());
  a.surveiller(scene, actualiser);
  document.addEventListener('visibilitychange', actualiser);
  let attente: ReturnType<typeof setTimeout> | undefined;
  // La scène suit sa propre taille (fenêtre, mise en page achevée après le premier dessin).
  new ResizeObserver(() => {
    clearTimeout(attente);
    attente = setTimeout(() => {
      disposer();
      dessiner(performance.now());
    }, 120);
  }).observe(scene);
}
