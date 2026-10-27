/* Bandeau bleu du héros (prototype/accueil-hero.js) : une animation en dessine le bord inférieur.
   Réglages retenus : houle (quatre strates qui avancent dans le même sens, les plus lointaines plus
   lentement), bord sous le texte, bleu foncé. Sous le bord, la page reste blanche et la
   constellation reste visible. Animations réduites ou désactivées : une image fixe. */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sortie = (x: number) => 1 - Math.pow(1 - x, 3);
/** Bleu foncé (heroblue=deep). */
const BLEU = [29, 78, 216];
const melange = (c: number[], k: number) =>
  `rgb(${c.map((v) => Math.round(v + (255 - v) * k)).join(', ')})`;
/** Bord sous le texte (herolimit=text). */
const LIMITE = 'text';
/** Intensité des effets « standard ». */
const INTENSITE = 1;

export interface Vagues {
  remesurer: () => void;
}

export function initialiserVagues(
  hero: HTMLElement,
  niveauAnimations: () => 'full' | 'reduced' | 'none',
): Vagues | null {
  const trouvee = hero.querySelector<HTMLCanvasElement>('[data-hero-vagues]');
  const contexte = trouvee?.getContext('2d');
  if (!trouvee || !contexte) return null;
  const toile: HTMLCanvasElement = trouvee;
  const ctx: CanvasRenderingContext2D = contexte;
  const pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)');
  const PAS = 6;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let bord = 0;
  let echelle = 1;
  let image = 0;
  let dernier = 0;
  let visible = true;
  let entreeDepuis = -1;
  const depart = performance.now();
  const pointeur = { x: 0, y: 0, lx: 0, ly: 0, force: 0, cible: 0 };

  const vivant = () => niveauAnimations() === 'full' && visible && !document.hidden;
  const etroit = () => W < 640;
  const points = () => Math.ceil(W / PAS) + 3;
  const xA = (i: number) => i * PAS - PAS;

  /* Le bord passe au milieu de l'espace qui sépare deux éléments du héros. */
  function mesurer(): void {
    const boite = hero.getBoundingClientRect();
    W = hero.clientWidth;
    H = hero.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const largeur = Math.round(W * dpr);
    const hauteur = Math.round(H * dpr);
    if (toile.width !== largeur || toile.height !== hauteur) {
      toile.width = largeur;
      toile.height = hauteur;
    }
    const place = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const transformation = getComputedStyle(el).transform;
      const dy =
        transformation && transformation !== 'none' ? new DOMMatrixReadOnly(transformation).m42 : 0;
      return { haut: r.top - boite.top - dy, bas: r.bottom - boite.top - dy };
    };
    const avant = place(hero.querySelector(`[data-vague-apres="${LIMITE}"]`));
    const apres =
      place(hero.querySelector(`[data-vague-avant="${LIMITE}"]`)) ??
      (avant ? { haut: H, bas: H } : null);
    bord = avant && apres ? (avant.bas + apres.haut) / 2 : H * 0.55;
    echelle = clamp((avant && apres ? apres.haut - avant.bas : 170) / 190, 0.5, 1.2);
    hero.style.setProperty('--bande-y', `${Math.round(bord)}px`);
  }

  /* Houle de base : deux ondes qui avancent dans le même sens ; k éloigne la strate (plus lente). */
  function houleY(x: number, t: number, k = 0): number {
    const v = 1 - k * 0.2;
    return (
      0.62 * Math.sin(x * (0.0041 + k * 0.0004) - t * 0.22 * v + k * 1.9) +
      0.38 * Math.sin(x * (0.0069 - k * 0.0003) - t * 0.33 * v + k * 3.7)
    );
  }

  function soulevement(x: number): number {
    if (pointeur.force < 0.01) return 0;
    const dx = x - pointeur.lx;
    return pointeur.force * 14 * INTENSITE * Math.exp(-(dx * dx) / (2 * 170 * 170));
  }

  function courbe(t: number, k: number, decalage: number, amp: number, montee: number) {
    const ys = new Float32Array(points());
    for (let i = 0; i < ys.length; i += 1) {
      const x = xA(i);
      ys[i] = bord + decalage + montee + amp * houleY(x, t, k) - soulevement(x) * (1 - k * 0.18);
    }
    return ys;
  }

  function chemin(ys: Float32Array): void {
    ctx.moveTo(-PAS, ys[0] ?? 0);
    for (let i = 0; i < ys.length; i += 1) ctx.lineTo(xA(i), ys[i] ?? 0);
  }

  function remplirSous(ys: Float32Array, couleur: string): void {
    ctx.fillStyle = couleur;
    ctx.beginPath();
    chemin(ys);
    ctx.lineTo(W + PAS, H);
    ctx.lineTo(-PAS, H);
    ctx.closePath();
    ctx.fill();
  }

  function bandeau(jusqua: number): void {
    ctx.fillStyle = `rgb(${BLEU.join(', ')})`;
    ctx.fillRect(0, 0, W, Math.min(H, jusqua));
  }

  function houle(t: number, montee: number): Float32Array {
    const amp = (etroit() ? 14 : 24) * INTENSITE * echelle;
    const ecart = (etroit() ? 14 : 21) * echelle;
    const strates = [3, 2, 1, 0].map((k) => ({
      k,
      ys: courbe(t, k, ecart * (1.4 - k), amp * (1 - k * 0.1), montee),
    }));
    bandeau(bord + amp * 2 + ecart * 2 + montee + 4);
    const teintes: Record<number, number> = { 3: 0.09, 2: 0.2, 1: 0.36 };
    for (const { k, ys } of strates) {
      if (k === 0) continue;
      remplirSous(ys, melange(BLEU, teintes[k] ?? 0));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      chemin(ys);
      ctx.stroke();
    }
    return strates[3]?.ys ?? new Float32Array(points());
  }

  function dessiner(maintenant: number): void {
    const anime = vivant();
    const dt = anime ? Math.min(0.05, Math.max(0.001, (maintenant - dernier) / 1000 || 0.016)) : 0;
    dernier = maintenant;
    const suivre = (vitesse: number) => (anime ? 1 - Math.exp(-dt * vitesse) : 1);
    pointeur.lx = lerp(pointeur.lx, pointeur.x, suivre(5));
    pointeur.ly = lerp(pointeur.ly, pointeur.y, suivre(5));
    pointeur.force = lerp(pointeur.force, anime ? pointeur.cible : 0, suivre(2.5));
    const t = anime ? (maintenant - depart) / 1000 : 7;
    const entree =
      anime && entreeDepuis >= 0 ? sortie(clamp((maintenant - entreeDepuis) / 1600, 0, 1)) : 1;
    const montee = (1 - entree) * 70;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const devant = houle(t, montee);
    /* Sous le bord, la toile s'efface : la page et la constellation apparaissent. */
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    remplirSous(devant, '#000');
    ctx.globalCompositeOperation = 'source-over';
  }

  function boucle(maintenant: number): void {
    image = 0;
    dessiner(maintenant);
    if (vivant()) image = requestAnimationFrame(boucle);
  }
  const relancer = () => {
    if (!image) image = requestAnimationFrame(boucle);
  };

  hero.addEventListener(
    'pointermove',
    (evenement) => {
      if (evenement.pointerType !== 'mouse' || !pointeurFin.matches) return;
      const boite = hero.getBoundingClientRect();
      const x = evenement.clientX - boite.left;
      const y = evenement.clientY - boite.top;
      pointeur.x = x;
      pointeur.y = y;
      /* Les vagues se soulèvent quand le pointeur approche du bord. */
      pointeur.cible = clamp(1 - Math.abs(y - bord) / 220, 0, 1);
      if (pointeur.force < 0.01) {
        pointeur.lx = x;
        pointeur.ly = y;
      }
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => {
    pointeur.cible = 0;
  });

  new IntersectionObserver(
    (entrees) => {
      visible = entrees[0]?.isIntersecting ?? true;
      relancer();
    },
    { threshold: 0 },
  ).observe(hero);
  document.addEventListener('visibilitychange', relancer);
  let attente: ReturnType<typeof setTimeout> | undefined;
  const remesurer = () => {
    clearTimeout(attente);
    attente = setTimeout(() => {
      mesurer();
      relancer();
    }, 80);
  };
  new ResizeObserver(remesurer).observe(hero);
  void document.fonts?.ready.then(remesurer);

  mesurer();
  entreeDepuis = performance.now() + 120;
  relancer();
  return { remesurer };
}
