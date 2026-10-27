/* Fonds animés de l'accueil (prototype/app.js : initConstellation, initTrame). Réglages retenus :
   constellation de parcours dans le héros, trame claire dans la section Outils, effets standard. */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const hasard = (min: number, max: number) => min + Math.random() * (max - min);
const choisir = <T>(liste: T[]): T | undefined => liste[Math.floor(Math.random() * liste.length)];

export interface Animations {
  complete: () => boolean;
  visible: (el: Element) => boolean;
  surveiller: (el: Element, rappel: (visible: boolean) => void) => void;
}

interface Noeud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  moment: boolean;
  phase: number;
}

/** Fond du héros : des points reliés, dont un parcours qui se trace de temps en temps. */
export function initialiserConstellation(toile: HTMLCanvasElement, a: Animations): void {
  const ctx = toile.getContext('2d');
  if (!ctx) return;
  let largeur = 0;
  let hauteur = 0;
  let dpr = 1;
  let noeuds: Noeud[] = [];
  let image = 0;
  let dernier = 0;
  let enCours = false;
  let pointeur: { x: number; y: number } | null = null;
  let trace: { chemin: Noeud[]; debut: number } | null = null;
  let prochaineTrace = 0;
  let accent = '#2563EB';

  function semer(): void {
    const boite = toile.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    largeur = boite.width;
    hauteur = boite.height;
    toile.width = Math.round(largeur * dpr);
    toile.height = Math.round(hauteur * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const nombre = Math.round(clamp((largeur * hauteur) / 16000, 18, 84));
    noeuds = Array.from({ length: nombre }, () => ({
      x: Math.random() * largeur,
      y: Math.random() * hauteur,
      vx: hasard(-0.085, 0.085),
      vy: hasard(-0.072, 0.072),
      moment: Math.random() < 0.16,
      phase: Math.random() * Math.PI * 2,
    }));
    accent =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2563EB';
  }

  function commencerTrace(maintenant: number): void {
    const depart = choisir(noeuds);
    if (!depart) return;
    const chemin = [depart];
    let courant = depart;
    for (let i = 0; i < 4; i += 1) {
      const suivant = noeuds
        .filter((n) => !chemin.includes(n))
        .map((n) => ({ n, d: Math.hypot(n.x - courant.x, n.y - courant.y) }))
        .filter((item) => item.d < 190)
        .toSorted((x, y) => x.d - y.d)[0];
      if (!suivant) break;
      chemin.push(suivant.n);
      courant = suivant.n;
    }
    trace = chemin.length > 2 ? { chemin, debut: maintenant } : null;
    prochaineTrace = maintenant + hasard(1800, 3000);
  }

  function dessiner(maintenant: number, bouger = true): void {
    const c = ctx!;
    c.clearRect(0, 0, largeur, hauteur);
    const distanceMax = 150;
    if (bouger)
      for (const n of noeuds) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = largeur + 20;
        else if (n.x > largeur + 20) n.x = -20;
        if (n.y < -20) n.y = hauteur + 20;
        else if (n.y > hauteur + 20) n.y = -20;
      }
    for (let i = 0; i < noeuds.length; i += 1) {
      const p = noeuds[i]!;
      for (let j = i + 1; j < noeuds.length; j += 1) {
        const q = noeuds[j]!;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d > distanceMax) continue;
        c.strokeStyle = `rgba(115, 115, 115, ${((1 - d / distanceMax) * 0.36).toFixed(3)})`;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(q.x, q.y);
        c.stroke();
      }
      if (pointeur) {
        const d = Math.hypot(p.x - pointeur.x, p.y - pointeur.y);
        if (d < 170) {
          c.strokeStyle = accent;
          c.globalAlpha = (1 - d / 170) * 0.55;
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(pointeur.x, pointeur.y);
          c.stroke();
          c.globalAlpha = 1;
        }
      }
    }
    if (trace) {
      const duree = 2400;
      const avance = (maintenant - trace.debut) / duree;
      if (avance >= 1.4) trace = null;
      else {
        const segments = trace.chemin.length - 1;
        const dessine = clamp(avance, 0, 1) * segments;
        c.strokeStyle = accent;
        c.lineWidth = 2;
        c.globalAlpha = avance > 1 ? clamp(1 - (avance - 1) / 0.4, 0, 1) : 0.85;
        c.beginPath();
        c.moveTo(trace.chemin[0]!.x, trace.chemin[0]!.y);
        for (let s = 0; s < segments; s += 1) {
          const de = trace.chemin[s]!;
          const vers = trace.chemin[s + 1]!;
          const k = clamp(dessine - s, 0, 1);
          if (k <= 0) break;
          c.lineTo(de.x + (vers.x - de.x) * k, de.y + (vers.y - de.y) * k);
        }
        c.stroke();
        c.globalAlpha = 1;
      }
    } else if (bouger && maintenant > prochaineTrace) commencerTrace(maintenant);

    for (const n of noeuds) {
      if (n.moment) {
        const pulsation = 1 + Math.sin(maintenant / 900 + n.phase) * 0.18;
        c.globalAlpha = 0.9;
        c.strokeStyle = accent;
        c.lineWidth = 1.8;
        c.beginPath();
        c.arc(n.x, n.y, 3.8 * pulsation, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = accent;
        c.beginPath();
        c.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      } else {
        c.fillStyle = 'rgba(82, 82, 82, 0.66)';
        c.beginPath();
        c.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    if (trace)
      for (const n of trace.chemin) {
        c.fillStyle = accent;
        c.beginPath();
        c.arc(n.x, n.y, 3, 0, Math.PI * 2);
        c.fill();
      }
  }

  function boucle(maintenant: number): void {
    if (!enCours) return;
    image = requestAnimationFrame(boucle);
    if (maintenant - dernier < 15) return;
    dernier = maintenant;
    dessiner(maintenant);
  }

  function actualiser(): void {
    const lancer = a.complete() && a.visible(toile) && !document.hidden;
    if (lancer && !enCours) {
      enCours = true;
      dernier = 0;
      image = requestAnimationFrame(boucle);
    }
    if (!lancer && enCours) {
      enCours = false;
      cancelAnimationFrame(image);
    }
    if (!lancer) dessiner(performance.now(), false);
  }

  semer();
  dessiner(0, false);
  a.surveiller(toile, actualiser);
  document.addEventListener('visibilitychange', actualiser);
  window.addEventListener('resize', () => {
    semer();
    actualiser();
  });
  const hero = toile.parentElement;
  hero?.addEventListener('pointermove', (evenement) => {
    if (evenement.pointerType !== 'mouse') return;
    const boite = toile.getBoundingClientRect();
    pointeur = { x: evenement.clientX - boite.left, y: evenement.clientY - boite.top };
  });
  hero?.addEventListener('pointerleave', () => {
    pointeur = null;
  });
}

/* Points en quinconce, dans une seule couleur de la charte. Leur taille est nulle en haut et en bas
   (la section se fond dans ses voisines), plus forte côté sphère, et grossit doucement sous le
   pointeur. */
export function initialiserTrame(section: HTMLElement, a: Animations): void {
  const toile = section.querySelector<HTMLCanvasElement>('[data-tools-trame]');
  const ctx = toile?.getContext('2d');
  if (!toile || !ctx) return;
  const PAS = 15;
  const TAU = Math.PI * 2;
  const loupe = { x: 0, y: 0, force: 0, cible: 0 };
  let W = 0;
  let H = 0;
  let couleur = '#BFDBFE';
  let image = 0;
  let halo = { x: 0, y: 0, s: 1 };
  const doux = (a0: number, b0: number, x: number) => {
    const v = clamp((x - a0) / (b0 - a0), 0, 1);
    return v * v * (3 - 2 * v);
  };

  function mesurer(): void {
    W = section.clientWidth;
    H = section.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    toile!.width = Math.round(W * dpr);
    toile!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    couleur = getComputedStyle(section).getPropertyValue('--trame').trim() || '#BFDBFE';
    const boite = section.getBoundingClientRect();
    const sphere = section.querySelector('[data-sphere]')?.getBoundingClientRect();
    halo = sphere
      ? {
          x: sphere.left - boite.left + sphere.width / 2,
          y: sphere.top - boite.top + sphere.height / 2,
          s: Math.max(sphere.width, sphere.height) * 0.62,
        }
      : { x: W * 0.7, y: H / 2, s: W * 0.4 };
  }

  function dessiner(): void {
    const c = ctx!;
    c.clearRect(0, 0, W, H);
    const bande = Math.min(240, H * 0.28);
    const rayonMax = 2.5;
    const etendue = 2 * halo.s * halo.s;
    c.fillStyle = couleur;
    c.beginPath();
    for (let rang = 0, y = PAS / 2; y < H + PAS; rang += 1, y += PAS * 0.866) {
      const fy = Math.min(doux(0, bande, y), doux(0, bande, H - y));
      if (fy <= 0) continue;
      for (let x = rang % 2 ? PAS / 2 : 0; x < W + PAS; x += PAS) {
        let r = rayonMax * fy;
        const hx = x - halo.x;
        const hy = y - halo.y;
        r *= 0.18 + 0.82 * Math.exp(-(hx * hx + hy * hy) / etendue);
        if (loupe.force > 0.01) {
          const dx = x - loupe.x;
          const dy = y - loupe.y;
          r *= 1 + loupe.force * 1.6 * Math.exp(-(dx * dx + dy * dy) / 24200);
        }
        if (r < 0.3) continue;
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, TAU);
      }
    }
    c.fill();
  }

  function animer(): void {
    image = 0;
    loupe.force += (loupe.cible - loupe.force) * 0.12;
    if (Math.abs(loupe.cible - loupe.force) < 0.005) loupe.force = loupe.cible;
    dessiner();
    if (loupe.force !== loupe.cible) image = requestAnimationFrame(animer);
  }
  const planifier = () => {
    if (!image) image = requestAnimationFrame(animer);
  };
  section.addEventListener('pointermove', (evenement) => {
    if (evenement.pointerType !== 'mouse' || !a.complete()) return;
    const boite = section.getBoundingClientRect();
    loupe.x = evenement.clientX - boite.left;
    loupe.y = evenement.clientY - boite.top;
    loupe.cible = 1;
    planifier();
  });
  section.addEventListener('pointerleave', () => {
    loupe.cible = 0;
    planifier();
  });
  const rafraichir = () => {
    mesurer();
    dessiner();
  };
  new ResizeObserver(rafraichir).observe(section);
  rafraichir();
}
