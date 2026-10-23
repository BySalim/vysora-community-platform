'use strict';

/* Bandeau bleu du héros : une animation en dessine le bord inférieur.
   Réglage herowaves (Tweaks) :
   - Houle : quatre strates qui avancent dans le même sens, les plus lointaines plus lentement.
   - Fils : un faisceau de lignes fines qui se resserrent et s'écartent au-dessus du bord.
   - Filet : un maillage en perspective qui ondule comme une mer vue de loin.
   herolimit place le bord sous le titre, le texte ou la recherche ; heroblue choisit le bleu.
   Sous le bord, la page reste blanche et la constellation reste visible.
   Animations réduites ou désactivées : une image fixe. */

(() => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sortie = x => 1 - Math.pow(1 - x, 3);
  const BLEUS = { blue: [37, 99, 235], deep: [29, 78, 216], navy: [30, 58, 138] };
  const melange = (c, k) => `rgb(${c.map(v => Math.round(v + (255 - v) * k)).join(', ')})`;
  const STYLES = ['houle', 'fils', 'filet'];

  function init({ hero, settings, motionLevel }) {
    const toile = hero.querySelector('[data-hero-vagues]');
    if (!toile) return null;
    const ctx = toile.getContext('2d');
    const pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)');
    const PAS = 6;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let bord = 0;
    let haut = 0;
    let echelle = 1;
    let image = 0;
    let dernier = 0;
    let visible = true;
    let entreeDepuis = -1;
    const depart = performance.now();
    const pointeur = { x: 0, y: 0, lx: 0, ly: 0, force: 0, cible: 0 };

    const style = () => (STYLES.includes(settings.herowaves) ? settings.herowaves : null);
    const vivant = () => motionLevel() === 'full' && visible && !document.hidden && Boolean(style());
    const intensite = () => ({ subtle: 0.6, standard: 1, bold: 1.4 }[settings.effects] || 1);
    const bleu = () => BLEUS[settings.heroblue] || BLEUS.deep;
    const etroit = () => W < 640;
    const points = () => Math.ceil(W / PAS) + 3;
    const xA = i => i * PAS - PAS;

    /* Le bord passe au milieu de l'espace qui sépare deux éléments du héros. */
    function mesurer() {
      const boite = hero.getBoundingClientRect();
      W = hero.clientWidth;
      H = hero.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const largeur = Math.round(W * dpr);
      const hauteur = Math.round(H * dpr);
      if (toile.width !== largeur || toile.height !== hauteur) { toile.width = largeur; toile.height = hauteur; }
      const limite = settings.herolimit || 'text';
      const place = el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const transformation = getComputedStyle(el).transform;
        const dy = transformation && transformation !== 'none' ? new DOMMatrixReadOnly(transformation).m42 : 0;
        return { haut: r.top - boite.top - dy, bas: r.bottom - boite.top - dy };
      };
      const avant = place(hero.querySelector(`[data-vague-apres="${limite}"]`));
      const apres = place(hero.querySelector(`[data-vague-avant="${limite}"]`)) || (avant ? { haut: H, bas: H } : null);
      bord = avant && apres ? (avant.bas + apres.haut) / 2 : H * 0.55;
      haut = avant ? avant.bas : bord - 120;
      echelle = clamp((avant && apres ? apres.haut - avant.bas : 170) / 190, 0.5, 1.2);
      hero.style.setProperty('--bande-y', `${Math.round(bord)}px`);
    }

    /* Houle de base : deux ondes qui avancent dans le même sens ; k éloigne la strate (plus lente). */
    function houleY(x, t, k = 0) {
      const v = 1 - k * 0.2;
      return 0.62 * Math.sin(x * (0.0041 + k * 0.0004) - t * 0.22 * v + k * 1.9)
        + 0.38 * Math.sin(x * (0.0069 - k * 0.0003) - t * 0.33 * v + k * 3.7);
    }

    function soulevement(x) {
      if (pointeur.force < 0.01) return 0;
      const dx = x - pointeur.lx;
      return pointeur.force * 14 * intensite() * Math.exp(-(dx * dx) / (2 * 170 * 170));
    }

    function courbe(t, k, decalage, amp, montee) {
      const ys = new Float32Array(points());
      for (let i = 0; i < ys.length; i += 1) {
        const x = xA(i);
        ys[i] = bord + decalage + montee + amp * houleY(x, t, k) - soulevement(x) * (1 - k * 0.18);
      }
      return ys;
    }

    function chemin(ys) {
      ctx.moveTo(-PAS, ys[0]);
      for (let i = 0; i < ys.length; i += 1) ctx.lineTo(xA(i), ys[i]);
    }

    function remplirSous(ys, couleur) {
      ctx.fillStyle = couleur;
      ctx.beginPath();
      chemin(ys);
      ctx.lineTo(W + PAS, H);
      ctx.lineTo(-PAS, H);
      ctx.closePath();
      ctx.fill();
    }

    function bandeau(jusqua) {
      ctx.fillStyle = `rgb(${bleu().join(', ')})`;
      ctx.fillRect(0, 0, W, Math.min(H, jusqua));
    }

    /* Houle -------------------------------------------------------------------- */

    function houle(t, montee) {
      const c = bleu();
      const amp = (etroit() ? 14 : 24) * intensite() * echelle;
      const ecart = (etroit() ? 14 : 21) * echelle;
      const strates = [3, 2, 1, 0].map(k => ({ k, ys: courbe(t, k, ecart * (1.4 - k), amp * (1 - k * 0.1), montee) }));
      bandeau(bord + amp * 2 + ecart * 2 + montee + 4);
      const teintes = { 3: 0.09, 2: 0.2, 1: 0.36 };
      strates.forEach(({ k, ys }) => {
        if (k === 0) return;
        remplirSous(ys, melange(c, teintes[k]));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        chemin(ys);
        ctx.stroke();
      });
      return strates[3].ys;
    }

    /* Fils --------------------------------------------------------------------- */

    function fils(t, montee) {
      const amp = (etroit() ? 14 : 24) * intensite() * echelle;
      const bordYs = courbe(t, 0, (etroit() ? 18 : 30) * echelle, amp, montee);
      bandeau(bord + amp * 2 + 40 + montee + 4);
      const nombre = etroit() ? 16 : 24;
      const pas = (etroit() ? 4.5 : 5.4) * Math.min(1, echelle + 0.15);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#FFFFFF';
      for (let j = 1; j <= nombre; j += 1) {
        const u = j / nombre;
        ctx.globalAlpha = 0.06 + 0.34 * Math.pow(1 - u, 1.3);
        ctx.beginPath();
        for (let i = 0; i < bordYs.length; i += 1) {
          const x = xA(i);
          const respiration = 0.55 + 0.45 * Math.sin(x * 0.0037 - t * 0.2 + j * 0.13);
          const torsion = 5 * Math.sin(x * 0.006 - t * 0.26 + j * 0.31) * u;
          const y = bordYs[i] - j * pas * respiration - torsion;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return bordYs;
    }

    /* Filet : un maillage posé sur une mer vue en perspective ; le bord est la rangée la plus proche. */

    function filet(t, montee) {
      const hauteur = clamp(bord - haut - 4, 100, 200);
      const horizon = bord - hauteur + montee;
      const F = hauteur;
      const loin = 7;
      const rangees = etroit() ? 11 : 15;
      const ampMonde = 0.15 * intensite();
      const cx = W / 2;
      let bosse = null;
      if (pointeur.force > 0.01 && pointeur.ly > horizon + 6) {
        const Zp = F / (pointeur.ly - horizon);
        bosse = { X: (pointeur.lx - cx) * Zp / F, Z: Zp };
      }
      const relief = (X, Z) => {
        let h = ampMonde * (0.6 * Math.sin(X * 0.85 - t * 0.48 + Z * 0.55) + 0.4 * Math.sin(X * 0.37 + Z * 1.2 - t * 0.31));
        if (bosse) { const dx = X - bosse.X; const dz = (Z - bosse.Z) * 1.4; h += 0.22 * pointeur.force * Math.exp(-(dx * dx + dz * dz) / 0.4); }
        return h;
      };
      const ecranY = (X, Z) => horizon + (1 - relief(X, Z)) * F / Z;
      bandeau(bord + ampMonde * F * 1.6 + 40 + montee);

      const bordYs = new Float32Array(points());
      for (let i = 0; i < bordYs.length; i += 1) bordYs[i] = ecranY((xA(i) - cx) / F, 1);

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#FFFFFF';
      for (let j = 1; j < rangees; j += 1) {
        const Z = Math.pow(loin, j / (rangees - 1));
        ctx.globalAlpha = 0.03 + 0.3 * Math.pow(1 - j / rangees, 1.4);
        ctx.beginPath();
        const Xmin = (-cx) * Z / F - 0.1;
        const Xmax = (W - cx) * Z / F + 0.1;
        const segments = Math.ceil(W / 10);
        for (let s = 0; s <= segments; s += 1) {
          const X = Xmin + (Xmax - Xmin) * (s / segments);
          const x = cx + X * F / Z;
          const y = ecranY(X, Z);
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* Les lignes de fuite s'effacent vers l'horizon. */
      const fuite = ctx.createLinearGradient(0, horizon, 0, bord + montee);
      fuite.addColorStop(0, 'rgba(255, 255, 255, 0)');
      fuite.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fuite;
      ctx.beginPath();
      const pasX = (etroit() ? 34 : 46) / F;
      const Xbout = (W / 2 + 60) * loin / F;
      for (let X = -Xbout; X <= Xbout; X += pasX) {
        for (let j = 0; j < rangees; j += 1) {
          const Z = Math.pow(loin, j / (rangees - 1));
          const x = cx + X * F / Z;
          const y = ecranY(X, Z);
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      return bordYs;
    }

    const DESSINS = { houle, fils, filet };

    /* Boucle ---------------------------------------------------------------------- */

    function dessiner(maintenant) {
      const anime = vivant();
      const dt = anime ? Math.min(0.05, Math.max(0.001, (maintenant - dernier) / 1000 || 0.016)) : 0;
      dernier = maintenant;
      const suivre = vitesse => (anime ? 1 - Math.exp(-dt * vitesse) : 1);
      pointeur.lx = lerp(pointeur.lx, pointeur.x, suivre(5));
      pointeur.ly = lerp(pointeur.ly, pointeur.y, suivre(5));
      pointeur.force = lerp(pointeur.force, anime ? pointeur.cible : 0, suivre(2.5));
      const t = anime ? (maintenant - depart) / 1000 : 7;
      const entree = anime && entreeDepuis >= 0 ? sortie(clamp((maintenant - entreeDepuis) / 1600, 0, 1)) : 1;
      const montee = (1 - entree) * 70;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const nom = style();
      if (!nom) return;
      const devant = DESSINS[nom](t, montee);
      /* Sous le bord, la toile s'efface : la page et la constellation apparaissent. */
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      remplirSous(devant, '#000');
      ctx.globalCompositeOperation = 'source-over';
    }

    function boucle(maintenant) {
      image = 0;
      dessiner(maintenant);
      if (vivant()) image = requestAnimationFrame(boucle);
    }
    const relancer = () => { if (!image) image = requestAnimationFrame(boucle); };

    hero.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !pointeurFin.matches) return;
      const boite = hero.getBoundingClientRect();
      const x = event.clientX - boite.left;
      const y = event.clientY - boite.top;
      pointeur.x = x;
      pointeur.y = y;
      /* Les vagues se soulèvent quand le pointeur approche du bord. */
      pointeur.cible = clamp(1 - Math.abs(y - bord) / 220, 0, 1);
      if (pointeur.force < 0.01) { pointeur.lx = x; pointeur.ly = y; }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointeur.cible = 0; });

    new IntersectionObserver(entrees => { visible = entrees[0].isIntersecting; relancer(); }, { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', relancer);
    let attente = 0;
    const remesurer = () => { clearTimeout(attente); attente = setTimeout(() => { mesurer(); relancer(); }, 80); };
    if ('ResizeObserver' in window) new ResizeObserver(remesurer).observe(hero);
    else window.addEventListener('resize', remesurer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remesurer);

    mesurer();
    entreeDepuis = performance.now() + 120;
    relancer();

    return {
      refresh(change) {
        if (['herowaves', 'herolimit', 'herosize', 'herolead', 'reset'].includes(change)) {
          mesurer();
          if (change === 'herowaves' || change === 'reset') entreeDepuis = performance.now();
        }
        relancer();
      },
      remesurer
    };
  }

  window.VysoraVagues = { init };
})();
