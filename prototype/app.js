'use strict';

(() => {
  const D = window.VYSORA_DATA;
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ------------------------------------------------------------------ */
  /* Outils                                                              */
  /* ------------------------------------------------------------------ */

  const numberFormat = new Intl.NumberFormat('fr-FR');
  const fmt = value => numberFormat.format(value);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const typo = value => String(value)
    .replace(/ ([:»])/g, ' $1')
    .replace(/ ([;!?])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1 $2')
    .replace(/(\d) (%|FCFA|min|h|j|s|points|px)(?![\wÀ-ÿ])/g, '$1 $2');
  const t = value => escapeHTML(typo(value));
  const icon = (name, cls = 'icon-sm') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const plural = (count, one, many) => `${fmt(count)} ${count > 1 ? many : one}`;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } }
  };

  const byId = Object.fromEntries(D.creations.map(c => [c.id, c]));
  const TYPE_LABEL = { prompt: '1 prompt', iteration: 'Itération', projet: 'Projet' };
  const TOOL_BY_NAME = Object.fromEntries(D.tools.map(tool => [tool.name, tool]));
  const TOOL_KEYS = [
    ...D.tools.map(tool => [tool.name, tool]),
    ...Object.entries(D.toolAliases).map(([alias, name]) => [alias, TOOL_BY_NAME[name]])
  ].filter(([, tool]) => tool).sort((a, b) => b[0].length - a[0].length);
  const WORD = /[0-9A-Za-zÀ-ÿ]/;
  const logoImg = (tool, size = 16) => `<img class="tool-logo${tool.mono ? ' is-mono' : ''}" src="assets/logos-ia/${tool.logo}.svg" alt="" width="${size}" height="${size}" decoding="async">`;
  function withLogos(text) {
    const raw = typo(text);
    const used = new Set();
    let html = '';
    let plain = '';
    let i = 0;
    while (i < raw.length) {
      const hit = WORD.test(raw[i - 1] || ' ') ? null : TOOL_KEYS.find(([key]) => raw.startsWith(key, i) && !WORD.test(raw[i + key.length] || ' '));
      if (!hit) { plain += raw[i]; i += 1; continue; }
      const [key, tool] = hit;
      html += escapeHTML(plain);
      plain = '';
      if (used.has(tool.name)) html += escapeHTML(key);
      else { used.add(tool.name); html += `<span class="tool-ref">${logoImg(tool)}${escapeHTML(key)}</span>`; }
      i += key.length;
    }
    return html + escapeHTML(plain);
  }
  const decorateTools = (scope = document) => $$('[data-tools]', scope).forEach(el => { el.innerHTML = withLogos(el.textContent); el.removeAttribute('data-tools'); });
  const typeTag = type => `<span class="type-tag" data-type="${type}">${icon(`type-${type}`)}${TYPE_LABEL[type]}</span>`;
  const emblem = badge => `<span class="emblem" data-tone="${badge.tone}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icon(badge.icon, '')}</span>`;
  const avatar = (name, size = 28, cls = '') => {
    const slug = D.avatars[name];
    const classes = `avatar${cls ? ` ${cls}` : ''}`;
    if (!slug) return `<span class="${classes}" aria-hidden="true">${escapeHTML(name.split(' ').map(word => word[0]).join('').slice(0, 2))}</span>`;
    return `<img class="${classes}" src="assets/avatars/${slug}.webp" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  };

  /* ------------------------------------------------------------------ */
  /* Réglages                                                            */
  /* ------------------------------------------------------------------ */

  const DEFAULTS = { herolead: 'court', herowaves: 'houle', herolimit: 'text', heroblue: 'deep', herobg: 'constellation', herosize: 'full', accent: 'blue', band: 'dark', cards: 'path', eyebrow: 'icon', toolsbg: 'trame', methodfocus: 'suivi', density: 'standard', radius: 'charte', effects: 'standard', motion: 'full' };
  const listeners = new Set();
  const onSettings = fn => listeners.add(fn);
  const settings = window.Vysora.initTweaks({
    key: 'vysora-reglages-v2',
    apparence: [
      { name: 'herolead', legend: 'Texte d’introduction', options: [['court', 'Courte'], ['methode', 'Méthode'], ['chemin', 'Chemin parcouru'], ['apprendre', 'Apprendre'], ['communaute', 'Communauté']] },
      { name: 'herowaves', legend: 'Animation du bandeau bleu', options: [['houle', 'Houle'], ['fils', 'Fils'], ['filet', 'Filet'], ['none', 'Aucune']] },
      { name: 'herolimit', legend: 'Hauteur du bandeau bleu', options: [['title', 'Sous le titre'], ['text', 'Sous le texte'], ['search', 'Sous la recherche']] },
      { name: 'heroblue', legend: 'Bleu du bandeau', options: [['blue', 'Bleu', '#2563EB'], ['deep', 'Bleu foncé', '#1D4ED8'], ['navy', 'Profond', '#1E3A8A']] },
      { name: 'herobg', legend: 'Fond du héros', options: [['constellation', 'Constellation'], ['none', 'Aucun']] },
      { name: 'herosize', legend: 'Hauteur du héros', options: [['full', 'Plein écran'], ['compact', 'Compacte']] },
      'accent',
      { name: 'band', legend: 'Sections contrastées', options: [['dark', 'Sombres'], ['blue', 'Bleues'], ['light', 'Claires']] },
      { name: 'toolsbg', legend: 'Fond de la section Outils', options: [['trame', 'Trame claire'], ['nuit', 'Sombre'], ['uni', 'Uni']] },
      { name: 'methodfocus', legend: 'Couche mise en avant dans La méthode', options: [['suivi', 'Au défilement'], ['survol', 'Au survol']] },
      { name: 'cards', legend: 'Cartes des créations', options: [['path', 'Parcours'], ['bento', 'Mosaïque'], ['grid', 'Grille']] },
      { name: 'eyebrow', legend: 'Intertitres des sections', options: [['icon', 'Icône'], ['rule', 'Filet'], ['none', 'Masqués']] },
      'density', 'radius', 'effects', 'motion'
    ],
    defaults: DEFAULTS,
    onChange: changed => listeners.forEach(fn => fn(changed))
  });

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionLevel = () => (settings.motion === 'none' ? 'none' : (reduceQuery.matches || settings.motion === 'reduced') ? 'reduced' : 'full');
  const motionFull = () => motionLevel() === 'full';

  let feedPaused = false;
  const ambientActive = () => !document.hidden && motionLevel() !== 'none';

  /* ------------------------------------------------------------------ */
  /* Typographie française                                               */
  /* ------------------------------------------------------------------ */

  function fixTypography(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (node.parentElement && node.parentElement.closest('script, style, pre, code, textarea')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { const fixed = typo(node.nodeValue); if (fixed !== node.nodeValue) node.nodeValue = fixed; });
  }

  /* ------------------------------------------------------------------ */
  /* Notification                                                        */
  /* ------------------------------------------------------------------ */

  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `${icon('check')}<span>${t(message)}</span>`;
    requestAnimationFrame(() => requestAnimationFrame(() => toastEl.classList.add('is-visible')));
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => { if (!toastEl.classList.contains('is-visible')) toastEl.textContent = ''; }, 400);
    }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Compteurs                                                           */
  /* ------------------------------------------------------------------ */

  function animateNumber(el, from, to, duration = 1400) {
    if (!motionFull() || from === to) { el.textContent = typo(fmt(to)); return; }
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = typo(fmt(Math.round(from + (to - from) * easeOut(p))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      const el = entry.target;
      animateNumber(el, 0, Number(el.dataset.count), 1600);
      el.dataset.value = el.dataset.count;
    });
  }, { threshold: 0.6 });

  /* ------------------------------------------------------------------ */
  /* Apparitions                                                         */
  /* ------------------------------------------------------------------ */

  const revealHandlers = new Map();
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
      const handler = revealHandlers.get(entry.target);
      if (handler) handler();
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  const observeReveals = (scope = document) => $$('[data-reveal]:not(.is-in), [data-levels]:not(.is-in)', scope).forEach(el => revealObserver.observe(el));
  const onReveal = (el, fn) => { if (el) revealHandlers.set(el, fn); };

  const visibility = new Map();
  const visibleObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      visibility.set(entry.target, entry.isIntersecting);
      const cb = entry.target.__onVisible;
      if (cb) cb(entry.isIntersecting);
    });
  }, { threshold: 0.05 });
  function watchVisible(el, cb) {
    if (!el) return;
    el.__onVisible = cb;
    visibleObserver.observe(el);
  }
  const isVisible = el => visibility.get(el) === true;

  /* ------------------------------------------------------------------ */
  /* En-tête et défilement                                               */
  /* ------------------------------------------------------------------ */

  const header = $('[data-header]');
  const progressBar = $('[data-scroll-progress]');
  const anatomie = $('[data-anatomie]');
  let pElements = [];
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const refreshPElements = () => { pElements = $$('.card, .profiles-section, .tools'); };

  /* La méthode : chaque couche apparaît en entrant à l'écran, en cascade avec ses voisines ;
     la couche qui passe à hauteur de lecture est ensuite mise en avant (réglage « Au défilement »),
     ou celle que survole le pointeur. Rien n'est épinglé : la page défile normalement. */
  const couches = anatomie ? [1, 2, 3, 4, 5].map(n => $$(`[data-couche="${n}"]`, anatomie)) : [];
  let coucheActive = 0;
  let coucheSurvol = 0;
  function activerCouche(n) {
    if (n === coucheActive) return;
    coucheActive = n;
    couches.forEach((elements, i) => elements.forEach(el => el.classList.toggle('is-actif', i + 1 === n)));
  }
  function suivreCouche(vh) {
    if (!anatomie) return;
    if (coucheSurvol) { activerCouche(coucheSurvol); return; }
    if (settings.methodfocus !== 'suivi') { activerCouche(0); return; }
    const boite = anatomie.getBoundingClientRect();
    if (boite.bottom < 0 || boite.top > vh) return;
    const lecture = vh * 0.48;
    let proche = 0;
    let ecart = Infinity;
    couches.forEach((elements, i) => {
      const r = elements.find(el => el.classList.contains('anat-couche')).getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - lecture);
      if (d < ecart) { ecart = d; proche = i + 1; }
    });
    activerCouche(proche);
  }
  function initAnatomie() {
    if (!anatomie) return;
    const fiche = $('.anat-fiche', anatomie);
    const observateur = new IntersectionObserver(entries => {
      const entrees = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.target.dataset.couche - b.target.dataset.couche);
      const depart = fiche.classList.contains('is-vu') ? 0 : 160;
      fiche.classList.add('is-vu');
      entrees.forEach((entry, rang) => {
        couches[Number(entry.target.dataset.couche) - 1].forEach(el => {
          el.style.setProperty('--attente', `${depart + rang * 150}ms`);
          el.classList.add('is-vu');
        });
        observateur.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.anat-couche', anatomie).forEach(el => observateur.observe(el));
    anatomie.addEventListener('pointerover', event => {
      const el = event.target.closest('[data-couche]');
      if (!el || event.pointerType === 'touch') return;
      coucheSurvol = Number(el.dataset.couche);
      activerCouche(coucheSurvol);
    });
    anatomie.addEventListener('pointerleave', () => { coucheSurvol = 0; suivreCouche(window.innerHeight); });
  }

  function scrollFrame() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
    header.classList.toggle('is-scrolled', y > 8);
    if (!menuOpen && !header.contains(document.activeElement)) {
      if (y > lastY + 6 && y > 480) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 480) header.classList.remove('is-hidden');
    }
    lastY = y;

    if (motionFull()) {
      pElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        el.style.setProperty('--p', clamp((vh - rect.top) / (vh + rect.height), 0, 1).toFixed(3));
      });
    }

    suivreCouche(vh);
  }
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(scrollFrame); } };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);

  function initMenu() {
    const button = $('.menu-toggle');
    const panel = $('#mobile-panel');
    const setMenu = open => {
      menuOpen = open;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      button.innerHTML = icon(open ? 'close' : 'menu', '');
      header.classList.remove('is-hidden');
    };
    button.addEventListener('click', () => setMenu(panel.hidden));
    panel.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuOpen) { setMenu(false); button.focus(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 1023 && menuOpen) setMenu(false); });
  }

  /* ------------------------------------------------------------------ */
  /* Fond animé du héros : constellation de parcours                     */
  /* ------------------------------------------------------------------ */

  function initConstellation() {
    const canvas = $('[data-constellation]');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let frame = 0;
    let last = 0;
    let running = false;
    let pointer = null;
    let trail = null;
    let nextTrail = 0;
    let colors = {};

    const readColors = () => {
      const style = getComputedStyle(root);
      colors = { accent: style.getPropertyValue('--accent').trim() || '#2563EB' };
    };

    function seed() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ambient = { subtle: 0.55, standard: 1, bold: 1.35 }[settings.effects] || 1;
      const count = Math.round(clamp((width * height) / 16000, 18, 84) * ambient);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: random(-0.085, 0.085),
        vy: random(-0.072, 0.072),
        moment: Math.random() < 0.16,
        phase: Math.random() * Math.PI * 2
      }));
      readColors();
    }

    function startTrail(now) {
      const start = pick(nodes);
      const path = [start];
      let current = start;
      for (let i = 0; i < 4; i += 1) {
        const next = nodes
          .filter(n => !path.includes(n))
          .map(n => ({ n, d: Math.hypot(n.x - current.x, n.y - current.y) }))
          .filter(item => item.d < 190)
          .sort((a, b) => a.d - b.d)[0];
        if (!next) break;
        path.push(next.n);
        current = next.n;
      }
      trail = path.length > 2 ? { path, start: now } : null;
      nextTrail = now + random(1800, 3000);
    }

    function draw(now, move = true) {
      ctx.clearRect(0, 0, width, height);
      const maxDist = 150;
      if (move) {
        nodes.forEach(n => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = width + 20; else if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20; else if (n.y > height + 20) n.y = -20;
        });
      }
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > maxDist) continue;
          ctx.strokeStyle = `rgba(115, 115, 115, ${((1 - d / maxDist) * 0.36).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        if (pointer) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d < 170) {
            ctx.strokeStyle = colors.accent;
            ctx.globalAlpha = (1 - d / 170) * 0.55;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      if (trail) {
        const duration = 2400;
        const p = (now - trail.start) / duration;
        if (p >= 1.4) trail = null;
        else {
          const segments = trail.path.length - 1;
          const drawn = clamp(p, 0, 1) * segments;
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2;
          ctx.globalAlpha = p > 1 ? clamp(1 - (p - 1) / 0.4, 0, 1) : 0.85;
          ctx.beginPath();
          ctx.moveTo(trail.path[0].x, trail.path[0].y);
          for (let s = 0; s < segments; s += 1) {
            const from = trail.path[s];
            const to = trail.path[s + 1];
            const k = clamp(drawn - s, 0, 1);
            if (k <= 0) break;
            ctx.lineTo(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (move && now > nextTrail) startTrail(now);

      nodes.forEach(n => {
        if (n.moment) {
          const pulse = 1 + Math.sin(now / 900 + n.phase) * 0.18;
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.arc(n.x, n.y, 3.8 * pulse, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = colors.accent;
          ctx.beginPath(); ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(82, 82, 82, 0.66)';
          ctx.beginPath(); ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      });
      if (trail) trail.path.forEach(n => {
        ctx.fillStyle = colors.accent;
        ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI * 2); ctx.fill();
      });
    }

    function loop(now) {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (now - last < 15) return;
      last = now;
      draw(now);
    }

    function update() {
      const shouldRun = motionFull() && isVisible(canvas) && !document.hidden && settings.herobg !== 'none';
      if (shouldRun && !running) { running = true; last = 0; frame = requestAnimationFrame(loop); }
      if (!shouldRun && running) { running = false; cancelAnimationFrame(frame); }
      if (!shouldRun) draw(performance.now(), false);
    }

    seed();
    draw(0, false);
    watchVisible(canvas, update);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', () => { seed(); update(); });
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    hero.addEventListener('pointerleave', () => { pointer = null; });
    return { update, reseed: () => { seed(); update(); }, recolor: () => { readColors(); update(); } };
  }

  /* ------------------------------------------------------------------ */
  /* Vignettes                                                           */
  /* ------------------------------------------------------------------ */

  function mockHTML(kind) {
    switch (kind) {
      case 'booking':
        return `<div class="mock-window"><div class="mock-bar"><i></i>Keur Awa<small>Coiffure</small></div><div class="mock-pad"><p class="mock-label">Samedi 18 octobre</p><div class="mock-slots"><span>09:00</span><span class="off">10:30</span><span class="on">12:00</span><span>14:00</span><span class="off">15:30</span><span>17:00</span></div><div class="mock-btn">Confirmer le rendez-vous</div></div></div>`;
      case 'dashboard':
        return `<div class="mock-window"><div class="mock-bar"><i></i>Ventes<small>Juin à septembre</small></div><div class="mock-pad"><div class="mock-kpis"><span>Chiffre d’affaires<b>4,2 M</b></span><span>Commandes<b>1 318</b></span><span>Retours<b>2,4 %</b></span></div><div class="mock-chart">${[38, 52, 46, 61, 57, 72, 66, 88, 79].map((h, i) => `<i${i === 7 ? ' class="hi"' : ''} style="--h:${h}%"></i>`).join('')}</div></div></div>`;
      case 'flow':
        return `<div class="mock-flow"><div class="mock-node"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-mail"/></svg></span>Messagerie<small>Libellé Factures</small></div><span class="mock-link"></span><div class="mock-node is-key"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-scan"/></svg></span>Extraction<small>Montant TTC</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span>Classement<small>Par mois</small></div></div>`;
      case 'letter':
        return `<div class="mock-paper"><p>Madame, Monsieur,</p><p><del>Passionné et dynamique, je souhaite</del> <ins>J’ai organisé 14 ateliers de prévention</ins> dans trois quartiers d’Abidjan.</p><div class="mock-lines"><i style="width:94%"></i><i style="width:86%"></i><i style="width:58%"></i></div></div>`;
      case 'code':
        return `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>renommer_photos.py</span></div><pre><span class="k">for</span> photo <span class="k">in</span> dossier.glob(<span class="s">"*.jpg"</span>):
    date = <span class="f">lire_date</span>(photo)
    nom = date.strftime(<span class="s">"%Y-%m-%d_%H%M%S"</span>)
    <span class="k">if</span> simulation:
        <span class="f">print</span>(photo.name, <span class="s">"→"</span>, nom)
<span class="c"># 248 photos, aucun fichier modifié</span></pre></div>`;
      case 'cards':
        return `<div class="mock-cards"><span></span><span></span><span><em>Photosynthèse</em><b>Quels sont les réactifs de la photosynthèse ?</b><small>Fiche 3 sur 12</small></span></div>`;
      case 'logo':
        return `<div class="mock-logo"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 18c9 0 16 8.5 16 19S41 56 32 56 16 47.5 16 37s7-19 16-19Z" fill="#171717"/><path d="M33 19c1.5-8 9-12.5 17-11-1 8-8 12.5-17 11Z" fill="#2563EB"/><path d="M25 33c1.5-4 4.5-6.5 9-7.5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg><b>Karité de Koutiala</b><small>Coopérative</small></div>`;
      default:
        return '';
    }
  }

  function mediaHTML(media, sizes = '(min-width: 1024px) 420px, 90vw', eager = false) {
    if (media.kind === 'image') {
      const base = `assets/images/${media.name}`;
      return `<img src="${base}-720.webp" srcset="${base}-720.webp 720w, ${base}-1280.webp ${media.large}w" sizes="${sizes}" width="720" height="540" alt="${t(media.alt)}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
    }
    return `<div class="mock" role="img" aria-label="${t(media.alt)}">${mockHTML(media.mock)}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Saisie d'intention                                                  */
  /* ------------------------------------------------------------------ */

  function initIntent() {
    const input = $('[data-intent]');
    if (!input) return;
    const phrases = ['un site de réservation', 'un logo pour mon association', 'une analyse de mes ventes', 'une illustration de couverture', 'un script pour trier mes fichiers', 'une lettre de motivation'];
    let phrase = 0;
    let chars = phrases[0].length;
    let deleting = true;
    let wait = 2200;
    let timer = 0;
    const tickIntent = () => {
      timer = setTimeout(tickIntent, deleting ? 32 : 58);
      if (!motionFull() || document.activeElement === input || input.value) { input.placeholder = phrases[phrase]; return; }
      if (wait > 0) { wait -= deleting ? 32 : 58; return; }
      const target = phrases[phrase];
      if (deleting) {
        chars -= 1;
        if (chars <= 0) { deleting = false; phrase = (phrase + 1) % phrases.length; chars = 0; wait = 250; }
      } else {
        chars += 1;
        if (chars >= phrases[phrase].length) { deleting = true; wait = 2200; }
      }
      input.placeholder = (deleting ? target : phrases[phrase]).slice(0, Math.max(chars, 0)) || ' ';
    };
    timer = setTimeout(tickIntent, 1800);
  }

  /* ------------------------------------------------------------------ */
  /* La communauté en chiffres                                           */
  /* ------------------------------------------------------------------ */

  const liveStats = $$('[data-live]');
  function bumpStat(key, amount) {
    const el = liveStats.find(stat => stat.dataset.live === key);
    if (!el || !el.dataset.value) return;
    const from = Number(el.dataset.value);
    const to = from + amount;
    el.dataset.value = String(to);
    animateNumber(el, from, to, 700);
    el.classList.add('is-bump');
    setTimeout(() => el.classList.remove('is-bump'), 260);
  }
  /* Les chiffres s'animent quand la section apparaît, puis progressent avec l'activité. */
  function startLiveStats() {
    const loop = () => {
      setTimeout(loop, random(5200, 9000));
      if (!ambientActive()) return;
      bumpStat('repro', Math.ceil(random(0, 3)));
      if (Math.random() < 0.35) bumpStat('creations', 1);
      if (Math.random() < 0.3) bumpStat('answers', 1);
    };
    setTimeout(loop, 6000);
  }

  /* ------------------------------------------------------------------ */
  /* Outils                                                              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Sphère des outils                                                   */
  /* ------------------------------------------------------------------ */

  function initSphere() {
    const stage = $('[data-sphere]');
    if (!stage) return null;
    const canvas = $('[data-sphere-canvas]', stage);
    const ctx = canvas.getContext('2d');
    const box = $('[data-sphere-items]', stage);
    const TAU = Math.PI * 2;
    const MAX_SLOTS = 30;
    const BASE_SPEED = TAU / 42000;

    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let yaw = 0.6;
    let pitch = -0.32;
    let pitchTarget = -0.32;
    let steer = 0;
    let spin = 0;
    let drag = null;
    let running = false;
    let frame = 0;
    let last = 0;
    let introStart = null;
    let queue = [];
    let cursor = 0;
    let slots = [];
    let lineColor = 'rgba(23,23,23,.1)';
    let fillColor = 'rgba(255,255,255,.8)';
    let orbitColor = 'rgba(37,99,235,.28)';
    let orbitDot = '#2563EB';
    /* Deux orbites inclinées : leur moitié arrière passe derrière la sphère, l'autre devant. */
    const ORBITS = [
      { k: 1.16, tilt: -0.32, flat: 0.25, speed: 0.00011, dots: [0.4, 3.6], dash: [] },
      { k: 1.36, tilt: 0.2, flat: 0.17, speed: -0.00007, dots: [2.2], dash: [2, 7] }
    ];
    function mixed(list) {
      const groups = {};
      list.forEach(tool => { (groups[tool.family] = groups[tool.family] || []).push(tool); });
      const lanes = Object.values(groups);
      const out = [];
      for (let i = 0; out.length < list.length; i += 1) lanes.forEach(lane => { if (lane[i]) out.push(lane[i]); });
      return out;
    }

    function fibonacci(count) {
      const golden = Math.PI * (3 - Math.sqrt(5));
      return Array.from({ length: count }, (_, i) => {
        const y = 1 - ((i + 0.5) * 2) / count;
        const r = Math.sqrt(1 - y * y);
        return [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r];
      });
    }

    const itemHTML = tool => `${logoImg(tool, 22)}<b>${escapeHTML(tool.name)}</b>`;

    function buildSlots() {
      queue = mixed(D.tools);
      const count = Math.min(MAX_SLOTS, queue.length);
      box.textContent = '';
      slots = fibonacci(count).map((v, i) => {
        const el = document.createElement('span');
        el.className = 'sphere-item';
        const tool = queue[i];
        el.innerHTML = itemHTML(tool);
        box.appendChild(el);
        return { v, el, tool, behind: false, shown: null };
      });
      cursor = count % queue.length;
    }

    function nextTool() {
      const onSphere = new Set(slots.map(slot => slot.tool));
      for (let k = 0; k < queue.length; k += 1) {
        const tool = queue[(cursor + k) % queue.length];
        if (!onSphere.has(tool)) { cursor = (cursor + k + 1) % queue.length; return tool; }
      }
      return null;
    }

    function layout() {
      const rect = stage.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      R = Math.min(W * 0.4, H * 0.42);
      const style = getComputedStyle(stage);
      lineColor = style.getPropertyValue('--sphere-line').trim() || 'rgba(23,23,23,.1)';
      fillColor = style.getPropertyValue('--sphere-fill').trim() || 'rgba(255,255,255,.8)';
      orbitColor = style.getPropertyValue('--orbite').trim() || 'rgba(37,99,235,.28)';
      orbitDot = settings.toolsbg === 'nuit' ? '#93C5FD' : (getComputedStyle(root).getPropertyValue('--accent').trim() || '#2563EB');
    }

    const intro = (delay, now) => (introStart === null || !motionFull() ? 1 : easeOut(clamp((now - introStart - delay) / 900, 0, 1)));

    function rotate(v, m) {
      const x = v[0] * m.cw + v[2] * m.sw;
      const z1 = -v[0] * m.sw + v[2] * m.cw;
      return [x, v[1] * m.cp - z1 * m.sp, v[1] * m.sp + z1 * m.cp];
    }

    function drawOrbits(r, now, half, g) {
      ORBITS.forEach(o => {
        const rx = Math.min(r * o.k, W / 2 - 8);
        const ry = rx * o.flat;
        ctx.globalAlpha = g * (half === 'back' ? 0.55 : 1);
        ctx.setLineDash(o.dash);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, o.tilt, half === 'back' ? Math.PI : 0, half === 'back' ? TAU : Math.PI);
        ctx.strokeStyle = orbitColor; ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);
        o.dots.forEach(start => {
          const a = start + now * o.speed;
          const front = Math.sin(a) >= 0;
          if (front !== (half === 'front')) return;
          const ex = rx * Math.cos(a);
          const ey = ry * Math.sin(a);
          const x = cx + ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt);
          const y = cy + ex * Math.sin(o.tilt) + ey * Math.cos(o.tilt);
          ctx.beginPath(); ctx.arc(x, y, front ? 3.2 : 2.4, 0, TAU);
          ctx.fillStyle = orbitDot; ctx.fill();
        });
      });
      ctx.globalAlpha = 1;
    }

    function drawFrame(now) {
      const m = { cw: Math.cos(yaw), sw: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
      const g = intro(0, now);
      const r = R * (0.92 + 0.08 * g);
      const orbitTime = motionFull() ? now : 0;
      ctx.clearRect(0, 0, W, H);
      drawOrbits(r, orbitTime, 'back', g);
      ctx.globalAlpha = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
      ctx.fillStyle = fillColor; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = lineColor; ctx.stroke();

      const front = new Path2D();
      const back = new Path2D();
      const circle = (fn) => {
        let prev = null;
        for (let i = 0; i <= 72; i += 1) {
          const p = rotate(fn((i / 72) * TAU), m);
          const pt = [cx + p[0] * r, cy - p[1] * r, p[2]];
          if (prev) {
            const path = (prev[2] + pt[2]) / 2 >= 0 ? front : back;
            path.moveTo(prev[0], prev[1]); path.lineTo(pt[0], pt[1]);
          }
          prev = pt;
        }
      };
      [-60, -30, 0, 30, 60].forEach(lat => {
        const la = lat * Math.PI / 180;
        circle(t => [Math.cos(la) * Math.cos(t), Math.sin(la), Math.cos(la) * Math.sin(t)]);
      });
      for (let k = 0; k < 6; k += 1) {
        const lo = (k / 6) * Math.PI;
        circle(t => [Math.cos(t) * Math.cos(lo), Math.sin(t), Math.cos(t) * Math.sin(lo)]);
      }
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.45 * g; ctx.stroke(back);
      ctx.globalAlpha = g; ctx.stroke(front);
      ctx.globalAlpha = 1;
      drawOrbits(r, orbitTime, 'front', g);

      slots.forEach((slot, i) => {
        const p = rotate(slot.v, m);
        const depth = p[2];
        if (depth < -0.35 && !slot.behind) {
          slot.behind = true;
          if (queue.length > slots.length) {
            const tool = nextTool();
            if (tool) { slot.tool = tool; slot.el.innerHTML = itemHTML(tool); }
          }
        } else if (depth > 0) slot.behind = false;
        const alpha = clamp((depth + 0.08) / 0.4, 0, 1) * intro(120 + i * 30, now);
        const visible = alpha > 0.01;
        if (visible !== slot.shown) { slot.shown = visible; slot.el.style.visibility = visible ? 'visible' : 'hidden'; }
        if (!visible) return;
        const scale = 0.74 + 0.3 * ((depth + 1) / 2);
        slot.el.style.transform = `translate3d(${(cx + p[0] * r * 1.06).toFixed(1)}px, ${(cy - p[1] * r * 1.06).toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        slot.el.style.opacity = alpha.toFixed(3);
        slot.el.style.zIndex = String(Math.round(depth * 100) + 100);
      });
    }

    function loop(now) {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const dt = last ? Math.min(48, now - last) : 16;
      last = now;
      if (!drag) {
        yaw += dt * (BASE_SPEED + steer) + spin;
        spin *= 0.94;
      }
      pitch += (pitchTarget - pitch) * 0.05;
      drawFrame(now);
    }

    function update() {
      const shouldRun = motionFull() && isVisible(stage) && !document.hidden;
      if (shouldRun && introStart === null) introStart = performance.now();
      if (shouldRun && !running) { running = true; last = 0; frame = requestAnimationFrame(loop); }
      if (!shouldRun && running) { running = false; cancelAnimationFrame(frame); }
      if (!shouldRun) drawFrame(performance.now());
    }

    stage.addEventListener('pointermove', event => {
      const rect = stage.getBoundingClientRect();
      if (event.pointerType === 'mouse' && !drag) {
        steer = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * BASE_SPEED * 2.4;
        pitchTarget = -0.32 + clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * 0.5;
      }
      if (!drag) return;
      const now = performance.now();
      const next = drag.yaw + (event.clientX - drag.x) * 0.006;
      drag.v = ((next - yaw) / Math.max(16, now - drag.t)) * 16;
      drag.t = now;
      yaw = next;
      if (!running) drawFrame(now);
    });
    stage.addEventListener('pointerleave', () => { steer = 0; pitchTarget = -0.32; });
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { x: event.clientX, yaw, t: performance.now(), v: 0 };
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
    });
    const endDrag = () => {
      if (!drag) return;
      spin = clamp(drag.v, -0.06, 0.06);
      drag = null;
      stage.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    buildSlots();
    layout();
    drawFrame(performance.now());
    watchVisible(stage, update);
    document.addEventListener('visibilitychange', update);
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { layout(); drawFrame(performance.now()); }, 120);
    });
    return { update, recolor: () => { layout(); drawFrame(performance.now()); } };
  }

  /* ------------------------------------------------------------------ */
  /* Trame de la section Outils                                          */
  /* ------------------------------------------------------------------ */

  /* Points en quinconce, dans une seule couleur de la charte. Leur taille est nulle en haut et
     en bas (la section se fond dans ses voisines), plus forte côté sphère, et grossit doucement
     sous le pointeur. Variante sombre : les points grossissent jusqu'à former le fond #0A0A0A. */
  function initTrame() {
    const section = $('[data-outils]');
    const canvas = section && $('[data-tools-trame]', section);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const STEP = 15;
    const TAU = Math.PI * 2;
    const lens = { x: 0, y: 0, force: 0, target: 0 };
    let W = 0;
    let H = 0;
    let color = '#BFDBFE';
    let raf = 0;
    let halo = { x: 0, y: 0, s: 1 };
    const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };

    function measure() {
      W = section.clientWidth;
      H = section.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(section).getPropertyValue('--trame').trim() || '#BFDBFE';
      const box = section.getBoundingClientRect();
      const ball = $('[data-sphere]', section)?.getBoundingClientRect();
      halo = ball ? { x: ball.left - box.left + ball.width / 2, y: ball.top - box.top + ball.height / 2, s: Math.max(ball.width, ball.height) * 0.62 } : { x: W * 0.7, y: H / 2, s: W * 0.4 };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (settings.toolsbg === 'uni') return;
      const dark = settings.toolsbg === 'nuit';
      const band = dark ? Math.min(300, H * 0.26) : Math.min(240, H * 0.28);
      const strength = { subtle: 0.75, standard: 1, bold: 1.3 }[settings.effects] || 1;
      const rMax = dark ? STEP * 0.74 : 2.5 * strength;
      const spread = 2 * halo.s * halo.s;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let row = 0, y = STEP / 2; y < H + STEP; row += 1, y += STEP * 0.866) {
        /* Clair : fondu doux. Sombre : la surface couverte croît régulièrement jusqu'au fond plein. */
        const edge = Math.min(y, H - y) / band;
        const fy = dark ? Math.sqrt(clamp(edge, 0, 1)) : Math.min(smooth(0, band, y), smooth(0, band, H - y));
        if (fy <= 0 || (dark && fy >= 1)) continue;
        for (let x = row % 2 ? STEP / 2 : 0; x < W + STEP; x += STEP) {
          let r = rMax * fy;
          if (!dark) {
            const hx = x - halo.x;
            const hy = y - halo.y;
            r *= 0.18 + 0.82 * Math.exp(-(hx * hx + hy * hy) / spread);
            if (lens.force > 0.01) {
              const dx = x - lens.x;
              const dy = y - lens.y;
              r *= 1 + lens.force * 1.6 * Math.exp(-(dx * dx + dy * dy) / 24200);
            }
          }
          if (r < 0.3) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
      }
      ctx.fill();
      if (dark) ctx.fillRect(0, band - 1, W, H - band * 2 + 2);
    }
    function animate() {
      raf = 0;
      lens.force += (lens.target - lens.force) * 0.12;
      if (Math.abs(lens.target - lens.force) < 0.005) lens.force = lens.target;
      draw();
      if (lens.force !== lens.target) raf = requestAnimationFrame(animate);
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(animate); };
    section.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !motionFull() || settings.toolsbg !== 'trame') return;
      const rect = section.getBoundingClientRect();
      lens.x = event.clientX - rect.left;
      lens.y = event.clientY - rect.top;
      lens.target = 1;
      schedule();
    });
    section.addEventListener('pointerleave', () => { lens.target = 0; schedule(); });
    const refresh = () => { measure(); draw(); };
    if (window.ResizeObserver) new ResizeObserver(refresh).observe(section);
    else window.addEventListener('resize', refresh);
    refresh();
    return { refresh };
  }

  /* ------------------------------------------------------------------ */
  /* Comparaison                                                         */
  /* ------------------------------------------------------------------ */

  function initCompare() {
    const box = $('[data-compare]');
    const range = $('[data-compare-range]', box);
    let touched = false;
    const set = value => box.style.setProperty('--pos', `${value}%`);
    range.addEventListener('input', () => { touched = true; set(range.value); });
    range.addEventListener('pointerdown', () => { touched = true; });
    onReveal(box, () => {
      if (!motionFull() || touched) return;
      const keys = [[0, 50], [700, 30], [1500, 70], [2300, 50]];
      const start = performance.now() + 500;
      const step = now => {
        if (touched) return;
        const tms = now - start;
        if (tms < 0) { requestAnimationFrame(step); return; }
        let value = 50;
        for (let i = 0; i < keys.length - 1; i += 1) {
          const [t0, v0] = keys[i];
          const [t1, v1] = keys[i + 1];
          if (tms >= t0 && tms <= t1) value = v0 + (v1 - v0) * easeInOut((tms - t0) / (t1 - t0));
        }
        set(value.toFixed(2));
        range.value = Math.round(value);
        if (tms < keys[keys.length - 1][0]) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Explorer                                                            */
  /* ------------------------------------------------------------------ */

  const cardsList = $('[data-cards-list]');
  const LIST_CAPTION = {
    useful: 'Classées selon les votes « Utile » reçus ces 7 derniers jours.',
    recent: 'Publiées ces dernières heures par la communauté.',
    reproduced: 'Les créations les plus souvent reproduites avec succès ce mois-ci.'
  };
  let currentList = 'useful';

  function traceSVG(steps) {
    const n = steps.length;
    const xs = steps.map((_, i) => (n === 1 ? 46 : 7 + (i * 78) / (n - 1)));
    const shapes = steps.map((s, i) => (s
      ? `<circle class="is-moment" cx="${xs[i]}" cy="7" r="4.4" style="--i:${i}"/>`
      : `<circle cx="${xs[i]}" cy="7" r="4" style="--i:${i}"/>`)).join('');
    return `<svg class="trace-svg" viewBox="0 0 92 14" aria-hidden="true"><line x1="${xs[0]}" y1="7" x2="${xs[n - 1]}" y2="7" pathLength="100"/>${shapes}</svg>`;
  }

  function rankHTML(c, i) {
    if (currentList === 'useful') return `<span class="card-rank"><b><span class="sr-only">Rang </span>${i + 1}</b>${icon('utile', 'icon-xs')}${fmt(c.week)} cette semaine</span>`;
    if (currentList === 'recent') return `<span class="card-rank card-rank-plain">${icon('clock', 'icon-xs')}${t(c.published)}</span>`;
    return `<span class="card-rank"><b>${i + 1}</b>${icon('repeat', 'icon-xs')}${fmt(c.repro || 0)} reproductions</span>`;
  }

  function cardHTML(c, i) {
    const moments = c.steps.filter(Boolean).length;
    const unit = c.type === 'projet' ? ['étape', 'étapes'] : ['échange', 'échanges'];
    const stats = [];
    if (c.type === 'projet') stats.push(`<li>${icon('layers', 'icon-xs')}${t(plural(c.steps.length, 'étape', 'étapes'))}</li>`);
    else if (c.repro) stats.push(`<li>${icon('repeat', 'icon-xs')}${t(plural(c.repro, 'reproduction', 'reproductions') + (c.repro >= 3 ? ` · ${c.success} %` : ''))}</li>`);
    else stats.push(`<li>${icon('repeat', 'icon-xs')}Prête à être reproduite</li>`);
    stats.push(`<li class="is-moment">${icon('moment', 'icon-xs')}${t(plural(moments, 'moment clé', 'moments clés'))}</li>`);
    const big = i === 0 && settings.cards === 'bento';
    return `
      <article class="card">
        <div class="card-media">
          ${mediaHTML(c.media, big ? '(min-width: 1024px) 820px, 92vw' : '(min-width: 1024px) 400px, (min-width: 768px) 46vw, 92vw')}
          ${rankHTML(c, i)}
          <span class="card-trace" aria-hidden="true">${traceSVG(c.steps)}<span class="trace-label">${t(`${plural(c.steps.length, ...unit)} · ${plural(moments, 'moment clé', 'moments clés')}`)}</span></span>
        </div>
        <div class="card-body">
          <p class="card-kicker">${typeTag(c.type)}<span>${t(c.category)}</span></p>
          <h3 class="card-title"><a href="fiche-creation.html?id=${c.id}">${t(c.title)}</a></h3>
          <p class="card-tools">${withLogos(c.config)}</p>
          <p class="card-author">${avatar(c.author, 28)}${t(c.author)}<small>${t(c.level)}</small></p>
          <ul class="card-stats">${stats.join('')}</ul>
        </div>
      </article>`;
  }

  function renderCards({ animate = false } = {}) {
    const ids = D.lists[currentList];
    const html = ids.map((id, i) => `<li data-id="${id}">${cardHTML(byId[id], i)}</li>`).join('');
    const caption = $('[data-explore-caption]');
    const finish = () => {
      cardsList.innerHTML = html;
      caption.textContent = typo(LIST_CAPTION[currentList]);
      cardsList.classList.remove('is-switching');
      layoutPath({ redraw: true });
      refreshPElements();
      requestFrame();
      if (animate && motionFull()) {
        $$(':scope > li', cardsList).forEach((li, i) => li.animate(
          [{ opacity: 0, transform: 'translateY(22px) scale(0.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 620, delay: i * 70, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)', fill: 'backwards' }
        ));
      } else if (!animate) {
        $$(':scope > li', cardsList).forEach((li, i) => { li.setAttribute('data-reveal', ''); li.style.setProperty('--stagger', String(i)); });
        observeReveals(cardsList);
      }
    };
    if (animate && motionFull() && cardsList.children.length) {
      cardsList.classList.add('is-switching');
      setTimeout(finish, 230);
    } else finish();
  }

  /* ------------------------------------------------------------------ */
  /* Modèle « Parcours » : une flèche relie les créations dans l'ordre   */
  /* ------------------------------------------------------------------ */

  const cardsStage = $('[data-cards-stage]');
  const pathSvg = $('[data-cards-path]');
  const pathNodes = $('[data-cards-nodes]');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DRAW_MS = 2000;

  const offsetIn = (el, ancestor) => {
    let x = 0;
    let y = 0;
    while (el && el !== ancestor) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x, y };
  };
  const r1 = value => Math.round(value * 10) / 10;

  function pathGeometry() {
    const boxes = $$(':scope > li', cardsList).map((li, i) => {
      const card = li.firstElementChild;
      const media = $('.card-media', card);
      const o = offsetIn(card, cardsStage);
      return { i, left: o.x, right: o.x + card.offsetWidth, top: o.y, y: o.y + media.offsetTop + media.offsetHeight / 2 };
    });
    if (!boxes.length) return null;
    const end = cardsList.offsetTop + cardsList.offsetHeight + 34;
    const rows = [];
    boxes.forEach(b => {
      const row = rows.find(r => Math.abs(r.top - b.top) < 12);
      if (row) row.items.push(b); else rows.push({ top: b.top, items: [b] });
    });
    rows.sort((a, b) => a.top - b.top);
    const nodes = [];

    if (rows.every(r => r.items.length === 1)) {
      const x = r1(Math.max(12, Math.min(...boxes.map(b => b.left)) / 2));
      boxes.forEach(b => nodes.push({ n: b.i + 1, x, y: r1(b.y) }));
      const top = r1(Math.max(4, boxes[0].y - 56));
      return { d: `M${x},${top} V${end}`, start: { x, y: top }, head: { x, y: end }, nodes };
    }

    const rect = cardsStage.getBoundingClientRect();
    const side = Math.min(rect.left, document.documentElement.clientWidth - rect.right);
    const bulge = clamp(side - 14, 16, 64);
    const c = bulge / 0.75;
    rows.forEach((row, k) => {
      row.dir = k % 2 === 0 ? 1 : -1;
      row.y = row.items.reduce((sum, it) => sum + it.y, 0) / row.items.length;
      const lefts = row.items.map(it => it.left);
      const rights = row.items.map(it => it.right);
      row.xIn = row.dir === 1 ? Math.min(...lefts) : Math.max(...rights);
      row.xOut = row.dir === 1 ? Math.max(...rights) : Math.min(...lefts);
      row.items.forEach(it => nodes.push({ n: it.i + 1, x: r1(row.dir === 1 ? it.left : it.right), y: r1(row.y) }));
    });
    const first = rows[0];
    const sx = first.xIn - first.dir * bulge;
    const sy = Math.min(first.top + 6, first.y - bulge);
    let d = `M${r1(sx)},${r1(sy)} V${r1(first.y - bulge)} Q${r1(sx)},${r1(first.y)} ${r1(first.xIn)},${r1(first.y)}`;
    rows.forEach((row, k) => {
      d += ` L${r1(row.xOut)},${r1(row.y)}`;
      const next = rows[k + 1];
      if (!next) return;
      const edge = row.dir === 1 ? Math.max(row.xOut, next.xIn) : Math.min(row.xOut, next.xIn);
      d += ` C${r1(edge + row.dir * c)},${r1(row.y)} ${r1(edge + row.dir * c)},${r1(next.y)} ${r1(next.xIn)},${r1(next.y)}`;
    });
    const last = rows[rows.length - 1];
    const ex = last.xOut + last.dir * bulge;
    d += ` Q${r1(ex)},${r1(last.y)} ${r1(ex)},${r1(last.y + bulge)} V${end}`;
    return { d, start: { x: r1(sx), y: r1(sy) }, head: { x: r1(ex), y: end }, nodes };
  }

  let settleTimer = 0;
  function drawPath() {
    clearTimeout(settleTimer);
    cardsStage.classList.remove('is-drawn', 'is-settled');
    void cardsStage.offsetWidth;
    cardsStage.classList.add('is-drawn');
    settleTimer = setTimeout(() => cardsStage.classList.add('is-settled'), DRAW_MS + 700);
  }

  function layoutPath({ redraw = false } = {}) {
    const on = settings.cards === 'path';
    cardsStage.classList.toggle('has-path', on);
    if (!on) {
      pathSvg.textContent = '';
      pathNodes.textContent = '';
      cardsStage.classList.remove('is-drawn', 'is-settled');
      return;
    }
    const geo = pathGeometry();
    if (!geo) return;
    const W = cardsStage.clientWidth;
    const H = geo.head.y + 12;
    pathSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    pathSvg.setAttribute('width', String(W));
    pathSvg.setAttribute('height', String(H));
    pathSvg.innerHTML = `
      <path class="cp-line" d="${geo.d}"/>
      <path class="cp-flow" d="${geo.d}" pathLength="1"/>
      <circle class="cp-start" cx="${geo.start.x}" cy="${geo.start.y}" r="5"/>
      <path class="cp-head" d="M${geo.head.x - 7},${geo.head.y - 9} L${geo.head.x},${geo.head.y} L${geo.head.x + 7},${geo.head.y - 9}"/>`;
    const line = $('.cp-line', pathSvg);
    const total = line.getTotalLength();
    line.style.setProperty('--len', total.toFixed(1));
    const samples = [];
    for (let s = 0; s <= 240; s += 1) samples.push(line.getPointAtLength((total * s) / 240));
    pathNodes.innerHTML = geo.nodes.map(node => {
      let best = 0;
      let bestDist = Infinity;
      samples.forEach((p, s) => {
        const dist = (p.x - node.x) ** 2 + (p.y - node.y) ** 2;
        if (dist < bestDist) { bestDist = dist; best = s; }
      });
      return `<span class="cp-node${node.n === 1 ? ' is-first' : ''}" data-n="${node.n}" style="left:${node.x}px;top:${node.y}px;--d:${Math.round((best / 240) * DRAW_MS)}ms">${node.n}</span>`;
    }).join('');
    if (redraw || !cardsStage.classList.contains('is-drawn')) {
      if (!motionFull()) cardsStage.classList.add('is-drawn', 'is-settled');
      else if (isVisible(cardsStage)) drawPath();
      else cardsStage.classList.remove('is-drawn', 'is-settled');
    }
  }

  let pathTimer = 0;
  const schedulePath = () => { cancelAnimationFrame(pathTimer); pathTimer = requestAnimationFrame(() => layoutPath()); };
  if ('ResizeObserver' in window) new ResizeObserver(schedulePath).observe(cardsList);
  window.addEventListener('resize', schedulePath);
  watchVisible(cardsStage, visible => {
    if (visible && settings.cards === 'path' && !cardsStage.classList.contains('is-drawn')) drawPath();
  });
  const hotNode = (event, on) => {
    const li = event.target.closest('[data-cards-list] > li');
    if (!li || settings.cards !== 'path') return;
    if (!on && li.contains(event.relatedTarget)) return;
    const index = $$(':scope > li', cardsList).indexOf(li) + 1;
    const node = $(`.cp-node[data-n="${index}"]`, pathNodes);
    if (node) node.classList.toggle('is-hot', on);
  };
  cardsList.addEventListener('pointerover', event => hotNode(event, true));
  cardsList.addEventListener('pointerout', event => hotNode(event, false));
  cardsList.addEventListener('focusin', event => hotNode(event, true));
  cardsList.addEventListener('focusout', event => hotNode(event, false));

  function initTabs(tablist, onSelect) {
    const tabs = $$('[role="tab"]', tablist);
    const select = (tab, focus) => {
      tabs.forEach(other => {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      onSelect(tab, tabs.indexOf(tab));
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { if (tab.getAttribute('aria-selected') !== 'true') select(tab); });
      tab.addEventListener('keydown', event => {
        const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
        const moves = vertical ? { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' } : { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' };
        if (!(event.key in moves)) return;
        event.preventDefault();
        const move = moves[event.key];
        const next = move === 'first' ? 0 : move === 'last' ? tabs.length - 1 : (i + move + tabs.length) % tabs.length;
        select(tabs[next], true);
      });
    });
  }

  function renderDomains() {
    $('[data-domains]').innerHTML = D.categories.map(cat => `
      <li><a href="${cat.name === 'Image et illustration' ? 'categorie.html' : 'explorer.html?categorie=' + encodeURIComponent(cat.name.toLowerCase())}">
        <span class="domain-icon" aria-hidden="true">${icon(cat.icon, '')}</span>
        <span class="domain-text">${t(cat.name)}<small>${t(plural(cat.count, 'création', 'créations'))}</small></span>
      </a></li>`).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Apprendre                                                           */
  /* ------------------------------------------------------------------ */

  /* Réponse au cas : enregistrée et définitive pour un membre connecté (RG-72), rejouable pour un visiteur. */
  const reflexNote = () => {
    const V = window.Vysora;
    if (V.etats.peut('contribuer')) return `<span>${t('Réponse enregistrée dans votre progression.')}</span>`;
    const retry = `<button class="link-btn" type="button" data-reflex-reset>${icon('replay')}Recommencer</button>`;
    return `${retry}<span>${V.etats.membre() ? V.invitation('contribuer', 'enregistrer vos réponses') : t('Créez un compte pour enregistrer vos réponses.')}</span>`;
  };

  function initReflex() {
    const box = $('[data-reflex]');
    const verdict = $('[data-verdict]', box);
    const result = $('[data-reflex-result]', box);
    const buttons = $$('[data-choice]', box);
    const labels = { accept: 'J’accepte', refuse: 'Je refuse', fix: 'Je corrige' };
    buttons.forEach((b, i) => { b.dataset.key = 'ABC'[i]; });
    const reset = () => {
      verdict.classList.remove('is-answered');
      buttons.forEach(b => {
        b.removeAttribute('aria-disabled');
        b.removeAttribute('aria-pressed');
        b.classList.remove('is-chosen');
        $('kbd', b).textContent = b.dataset.key;
      });
      result.hidden = true;
      result.textContent = '';
      buttons[0].focus();
    };
    const choose = button => {
      if (verdict.classList.contains('is-answered')) return;
      const ok = button.hasAttribute('data-correct');
      verdict.classList.add('is-answered');
      buttons.forEach(b => {
        b.setAttribute('aria-disabled', 'true');
        b.setAttribute('aria-pressed', String(b === button));
        if (b.hasAttribute('data-correct')) $('kbd', b).innerHTML = icon('check', 'icon-xs');
        else if (b === button) $('kbd', b).innerHTML = icon('x', 'icon-xs');
      });
      button.classList.add('is-chosen');
      result.innerHTML = `
        <p class="verdict-title">Réponses de la communauté</p>
        <div class="verdict-dist" aria-hidden="true">${buttons.map(b => `<span class="${b.hasAttribute('data-correct') ? 'is-correct' : ''}" style="--w:${b.dataset.share}%"></span>`).join('')}</div>
        <ul class="verdict-legend">${buttons.map(b => `<li${b.hasAttribute('data-correct') ? ' class="is-correct"' : ''}><b>${typo(`${b.dataset.share} %`)}</b>${t(labels[b.dataset.choice])}${b === button ? '<span class="mine">Votre choix</span>' : ''}</li>`).join('')}</ul>
        <div class="expert">
          ${avatar('Claire Dubois', 40)}
          <div>
            <p class="expert-name"><b>Claire Dubois</b><span>${t('Maître · analyse validée par la modération')}</span></p>
            <p class="expert-verdict${ok ? '' : ' is-miss'}">${icon(ok ? 'check-circle' : 'alert', 'icon-sm')}${t(ok ? 'Bon réflexe : cette réponse est à refuser.' : 'Le bon réflexe était de refuser cette réponse.')}</p>
            <p>${t('Un robot n’utilise pas la page : il envoie directement la requête au serveur. La case et le script ne l’arrêtent pas. La vérification doit se faire côté serveur.')}</p>
          </div>
        </div>
        <p class="verdict-actions">${reflexNote()}</p>`;
      result.hidden = false;
      result.focus({ preventScroll: true });
      $('[data-reflex-reset]', result)?.addEventListener('click', reset);
    };
    buttons.forEach(b => b.addEventListener('click', () => choose(b)));
    box.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || verdict.classList.contains('is-answered')) return;
      const k = 'abc'.indexOf(event.key.toLowerCase());
      if (k < 0 || !buttons[k]) return;
      event.preventDefault();
      choose(buttons[k]);
      buttons[k].focus();
    });
  }

  function initLab() {
    const lab = $('[data-lab]');
    if (!lab) return null;
    const panels = $$('.lab-panel', lab);
    const clinic = $('[data-clinic]', lab);
    const playClinic = () => {
      clinic.classList.remove('is-play');
      void clinic.offsetWidth;
      clinic.classList.add('is-play');
    };
    const stage = $('.lab-stage', lab);
    const fit = () => {
      stage.style.minHeight = '';
      if (window.innerWidth < 768) return;
      let tallest = 0;
      panels.forEach(panel => {
        const wasHidden = panel.hidden;
        panel.hidden = false;
        tallest = Math.max(tallest, panel.offsetHeight);
        panel.hidden = wasHidden;
      });
      stage.style.minHeight = `${tallest}px`;
    };
    fit();
    let fitTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    initTabs($('[data-tabs="lab"]', lab), tab => {
      panels.forEach(panel => {
        const on = panel.id === tab.getAttribute('aria-controls');
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
        if (on && panel === clinic) playClinic();
      });
    });
    const openFromHash = () => { if (location.hash === '#defis') $('#lab-tab-challenge').click(); };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return { refresh: () => { if (!clinic.hidden) playClinic(); } };
  }

  function initCountdown() {
    const box = $('[data-countdown]');
    const end = new Date(D.challengeEnd).getTime();
    const parts = { d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box), m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box) };
    const pad = n => String(n).padStart(2, '0');
    const render = () => {
      const left = Math.max(0, end - Date.now());
      const values = { d: String(Math.floor(left / 86400000)), h: pad(Math.floor(left / 3600000) % 24), m: pad(Math.floor(left / 60000) % 60), s: pad(Math.floor(left / 1000) % 60) };
      Object.entries(values).forEach(([key, value]) => {
        const el = parts[key];
        if (el.textContent === value) return;
        el.textContent = value;
        if (motionFull()) { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); }
      });
    };
    render();
    setInterval(() => { if (!document.hidden) render(); }, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Communauté : fil, indicateur, questions                             */
  /* ------------------------------------------------------------------ */

  const feedList = $('[data-feed]');
  const TONE = { 'Succès': 'success', '+15 points': 'success', 'Testé, ça marche': 'success', 'Obsolescence': 'warn', 'Partiel': 'warn' };
  const COUNTS = { repeat: 1, 'check-circle': 3, bulb: 2, utile: 0 };
  let feedCursor = 0;

  const timeLabel = createdAt => {
    const minutes = Math.floor((Date.now() - createdAt) / 60000);
    return minutes < 1 ? 'à l’instant' : `il y a ${minutes} min`;
  };

  const tagIcon = tag => {
    if (TONE[tag] === 'success') return icon('check', 'icon-xs');
    if (TONE[tag] === 'warn') return icon('alert', 'icon-xs');
    if (tag === '1 prompt') return icon('type-prompt', 'icon-xs');
    return '';
  };

  function feedHTML(item) {
    return `<div><span class="feed-who" aria-hidden="true">${avatar(item.who, 36)}<span class="feed-badge">${icon(item.icon, 'icon-xs')}</span></span><p class="feed-text"><b>${t(item.who)}</b> ${withLogos(item.text)}<time data-created="${item.createdAt}">${t(timeLabel(item.createdAt))}</time></p><span class="feed-tag"${TONE[item.tag] ? ` data-tone="${TONE[item.tag]}"` : ''}>${tagIcon(item.tag)}${t(item.tag)}</span></div>`;
  }

  function addFeed(item, { animate = true, prepend = true } = {}) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.innerHTML = feedHTML(item);
    if (prepend) feedList.prepend(li); else feedList.append(li);
    if (animate && motionFull()) {
      li.classList.add('is-entering', 'is-fresh');
      requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('is-entering')));
      setTimeout(() => li.classList.remove('is-fresh'), 2600);
    }
    const all = $$('.feed-item:not(.is-leaving)', feedList);
    if (all.length > 8) {
      const old = all[all.length - 1];
      if (animate && motionFull()) { old.classList.add('is-leaving'); setTimeout(() => old.remove(), 520); } else old.remove();
    }
  }

  function initFeed() {
    const now = Date.now();
    const offsets = [0, 45, 70, 130, 190, 260, 330, 410];
    for (let i = 7; i >= 0; i -= 1) {
      const base = D.feed[i];
      addFeed({ ...base, createdAt: now - offsets[i] * 1000 }, { animate: false });
    }
    feedCursor = 8;
    setInterval(() => {
      $$('time[data-created]', feedList).forEach(time => { time.textContent = typo(timeLabel(Number(time.dataset.created))); });
    }, 15000);
    const loop = () => {
      setTimeout(loop, random(3800, 6200));
      if (feedPaused || !ambientActive() || motionLevel() !== 'full' || !isVisible(feedList)) return;
      const base = D.feed[feedCursor % D.feed.length];
      feedCursor += 1;
      addFeed({ ...base, createdAt: Date.now() });
      if (base.icon in COUNTS) pulseIncrement(COUNTS[base.icon]);
      if (base.icon === 'repeat') bumpStat('repro', 1);
    };
    setTimeout(loop, 4200);
    watchVisible(feedList, () => {});
  }

  const week = D.week;
  const todayIndex = (() => { const day = new Date(`${D.today}T12:00:00`).getDay(); return (day + 6) % 7; })();
  const activity = D.activity;
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const dayDate = i => { const d = new Date(`${activity.start}T12:00:00`); d.setDate(d.getDate() + i); return d; };
  const dateLabel = (i, withDay = true) => { const d = dayDate(i); return `${withDay ? `${WEEKDAYS[d.getDay()]} ` : ''}${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const MIX_COLORS = ['#2563EB', '#EB6834', '#1BAF7A', '#EDA100'];
  let chart = null;
  let chartRevealed = false;

  function chartPaths() {
    const { x, y } = chart;
    const vals = activity.values;
    const last = vals.length - 1;
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const line = pts.slice(0, last).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${pts[last][0].toFixed(1)},${chart.base} L${pts[0][0].toFixed(1)},${chart.base} Z`;
    $('.ch-line', chart.svg).setAttribute('d', line);
    $('.ch-area', chart.svg).setAttribute('d', area);
    $('.ch-live', chart.svg).setAttribute('d', `M${pts[last - 1][0].toFixed(1)},${pts[last - 1][1].toFixed(1)} L${pts[last][0].toFixed(1)},${pts[last][1].toFixed(1)}`);
    const dot = $('.ch-today', chart.svg);
    dot.setAttribute('transform', `translate(${pts[last][0].toFixed(1)} ${pts[last][1].toFixed(1)})`);
  }

  function renderChart() {
    const box = $('[data-chart]');
    const W = Math.max(300, Math.round(box.clientWidth) || 640);
    const H = W < 480 ? 210 : 236;
    const pad = { l: 42, r: 18, t: 18, b: 30 };
    const vals = activity.values;
    const n = vals.length;
    const max = Math.ceil((Math.max(...vals) * 1.15) / 500) * 500;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const x = i => pad.l + (i / (n - 1)) * plotW;
    const y = v => pad.t + plotH - (v / max) * plotH;
    let grid = '';
    for (let v = 0; v <= max; v += 500) {
      grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end">${typo(fmt(v))}</text>`;
    }
    let ticks = '';
    for (let i = 0; i < n; i += 7) ticks += `<text class="axis-label" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : 'middle'}">${typo(dateLabel(i, false))}</text>`;
    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chart-title">
        <title id="chart-title">Interactions d’apprentissage par jour, du ${typo(dateLabel(0, false))} à aujourd’hui</title>
        ${grid}${ticks}
        <path class="ch-area"/>
        <path class="ch-line" pathLength="1"/>
        <path class="ch-live"/>
        <g class="ch-today"><circle class="ch-pulse" r="4"/><circle class="ch-dot" r="4"/></g>
        <g class="ch-cross" hidden><line class="ch-hair" y1="${pad.t}" y2="${pad.t + plotH}"/><circle class="ch-mark" r="4.5"/></g>
        <rect class="ch-hit" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" tabindex="0" aria-label="Parcourir les valeurs jour par jour avec les flèches"/>
      </svg>
      <p class="ch-note"><span class="ch-key"><i></i>Interactions par jour</span><span class="ch-key ch-key-live"><i></i>Aujourd’hui, journée en cours</span></p>
      <table class="sr-only"><caption>Interactions d’apprentissage par jour</caption><thead><tr><th scope="col">Jour</th><th scope="col">Interactions</th></tr></thead><tbody>
        ${vals.map((v, i) => `<tr><th scope="row">${typo(dateLabel(i))}</th><td data-cell="${i}">${typo(fmt(v))}${i === n - 1 ? ' (en cours)' : ''}</td></tr>`).join('')}
      </tbody></table>`;
    const svg = $('svg', box);
    chart = { svg, x, y, base: pad.t + plotH, n, box };
    box.dataset.width = String(W);
    chartPaths();
    box.classList.toggle('is-drawn', chartRevealed || !motionFull());

    const cross = $('.ch-cross', svg);
    const hair = $('.ch-hair', svg);
    const mark = $('.ch-mark', svg);
    const hit = $('.ch-hit', svg);
    let tip = null;
    let index = n - 1;
    const show = i => {
      index = clamp(i, 0, n - 1);
      const px = x(index);
      const py = y(activity.values[index]);
      cross.removeAttribute('hidden');
      hair.setAttribute('x1', px); hair.setAttribute('x2', px);
      mark.setAttribute('cx', px); mark.setAttribute('cy', py);
      if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; tip.setAttribute('aria-hidden', 'true'); box.appendChild(tip); }
      tip.innerHTML = `<b>${typo(dateLabel(index))}${index === n - 1 ? ' · en cours' : ''}</b><span>Interactions<strong>${typo(fmt(activity.values[index]))}</strong></span>`;
      const scale = svg.getBoundingClientRect().width / W;
      tip.style.left = `${clamp(px * scale, 70, box.clientWidth - 70)}px`;
      tip.style.top = `${py * scale}px`;
      tip.hidden = false;
    };
    const hide = () => { cross.setAttribute('hidden', ''); if (tip) tip.hidden = true; };
    hit.addEventListener('pointermove', event => {
      const rect = svg.getBoundingClientRect();
      const local = ((event.clientX - rect.left) / rect.width) * W;
      show(Math.round(((local - pad.l) / plotW) * (n - 1)));
    });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('focus', () => show(index));
    hit.addEventListener('blur', hide);
    hit.addEventListener('keydown', event => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n };
      if (!(event.key in moves)) return;
      event.preventDefault();
      show(index + moves[event.key]);
    });
  }

  function renderBreakdown() {
    const parts = week.breakdown;
    const total = parts.reduce((sum, b) => sum + b.value, 0);
    const box = $('[data-breakdown]');
    box.innerHTML = `
      <p class="mix-title">Répartition de la semaine</p>
      <div class="mix-bar" aria-hidden="true">${parts.map((b, i) => `<span data-mix="${i}" style="--w:${((b.value / total) * 100).toFixed(2)}%;--c:${MIX_COLORS[i]}"></span>`).join('')}</div>
      <ul class="mix-legend">${parts.map((b, i) => `<li data-mix="${i}"><i style="--c:${MIX_COLORS[i]}" aria-hidden="true"></i><span>${t(b.label)}</span><b data-bd="${i}">${typo(fmt(b.value))}</b><small data-bp="${i}">${typo(`${Math.round((b.value / total) * 100)} %`)}</small></li>`).join('')}</ul>`;
    const hot = i => $$('[data-mix]', box).forEach(el => el.classList.toggle('is-dim', i !== null && Number(el.dataset.mix) !== i));
    $$('[data-mix]', box).forEach(el => {
      el.addEventListener('pointerenter', () => hot(Number(el.dataset.mix)));
      el.addEventListener('pointerleave', () => hot(null));
    });
  }

  function updateTrend() {
    const el = $('[data-pulse-trend]');
    const i = todayIndex > 0 ? todayIndex - 1 : 0;
    const now = week.values[i];
    const prev = week.previous[i];
    if (!el || now === null) return;
    const diff = Math.round(((now - prev) / prev) * 100);
    const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    el.textContent = typo(`${diff >= 0 ? '+' : ''}${diff} % ${dayNames[i]}, par rapport à ${dayNames[i]} dernier`);
  }

  let pulseTotal = week.values.reduce((sum, v) => sum + (v || 0), 0);
  function pulseIncrement(kind) {
    const totalEl = $('[data-pulse-total]');
    const from = pulseTotal;
    pulseTotal += 1;
    animateNumber(totalEl, from, pulseTotal, 500);
    week.values[todayIndex] += 1;
    activity.values[activity.values.length - 1] += 1;
    week.breakdown[kind].value += 1;
    const total = week.breakdown.reduce((sum, b) => sum + b.value, 0);
    week.breakdown.forEach((b, i) => {
      const seg = $(`.mix-bar [data-mix="${i}"]`);
      if (seg) seg.style.setProperty('--w', `${((b.value / total) * 100).toFixed(2)}%`);
      const pct = $(`[data-bp="${i}"]`);
      if (pct) pct.textContent = typo(`${Math.round((b.value / total) * 100)} %`);
    });
    const bd = $(`[data-bd="${kind}"]`);
    if (bd) bd.textContent = typo(fmt(week.breakdown[kind].value));
    if (chart) {
      chartPaths();
      const cell = $(`[data-cell="${activity.values.length - 1}"]`, chart.box);
      if (cell) cell.textContent = typo(`${fmt(activity.values[activity.values.length - 1])} (en cours)`);
    }
  }

  function renderTopics() {
    $('[data-topics]').innerHTML = D.topics.map(topic => `
      <li class="topic">
        <span class="topic-type"${topic.type.startsWith('Clinique') ? ' data-clinic' : ''}>${icon(topic.type.startsWith('Clinique') ? 'message' : 'help', 'icon-xs')}${t(topic.type)}</span>
        <a href="forum.html?sujet=${encodeURIComponent(topic.id)}">${t(topic.title)}</a>
        <p>${avatar(topic.author, 20, 'avatar-xs')}<span>${t(`${topic.author} · ${topic.time} · `)}${withLogos(topic.config)}</span></p>
      </li>`).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Progression                                                         */
  /* ------------------------------------------------------------------ */

  const board = $('[data-board]');
  const members = D.leaderboard.map(m => ({ ...m }));

  function renderBoard() {
    const sorted = [...members].sort((a, b) => b.points - a.points);
    const max = sorted[0].points;
    const before = new Map($$('li', board).map(li => [li.dataset.name, li.getBoundingClientRect()]));
    const existing = new Map($$('li', board).map(li => [li.dataset.name, li]));
    sorted.forEach((m, i) => {
      let li = existing.get(m.name);
      if (!li) {
        li = document.createElement('li');
        li.dataset.name = m.name;
        li.innerHTML = `<span class="board-rank"></span>${avatar(m.name, 36)}<span class="board-name"><b>${t(m.name)} <small>${t(m.level)}</small></b><span class="board-bar"><span></span></span></span><span class="board-points"><span data-pts></span><small data-gain></small></span>`;
      }
      $('.board-rank', li).textContent = String(i + 1);
      $('.board-bar span', li).style.setProperty('--v', (m.points / max).toFixed(3));
      $('[data-pts]', li).textContent = typo(`${fmt(m.points)} pts`);
      li.setAttribute('aria-label', typo(`${i + 1}. ${m.name}, ${m.level}, ${fmt(m.points)} points cette semaine`));
      board.appendChild(li);
    });
    if (motionFull()) {
      $$('li', board).forEach(li => {
        const old = before.get(li.dataset.name);
        if (!old) return;
        const now = li.getBoundingClientRect();
        const dy = old.top - now.top;
        if (Math.abs(dy) > 1) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      });
    }
  }

  function initBoard() {
    renderBoard();
    const holds = new Set();
    const boardCard = board.closest('.board-card');
    boardCard.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') holds.add('hover'); });
    boardCard.addEventListener('pointerleave', () => holds.delete('hover'));
    boardCard.addEventListener('focusin', () => holds.add('focus'));
    boardCard.addEventListener('focusout', event => { if (!boardCard.contains(event.relatedTarget)) holds.delete('focus'); });
    onReveal(board.closest('[data-reveal]'), () => {
      if (!motionFull()) return;
      $$('.board-bar span', board).forEach(bar => bar.animate([{ transform: 'scaleX(0)' }, { transform: `scaleX(${bar.style.getPropertyValue('--v')})` }], { duration: 1000, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' }));
    });
    const loop = () => {
      setTimeout(loop, random(4200, 7000));
      if (holds.size || !ambientActive() || motionLevel() !== 'full' || !isVisible(board)) return;
      const sorted = [...members].sort((a, b) => b.points - a.points);
      const candidate = sorted[Math.min(sorted.length - 1, Math.floor(Math.pow(Math.random(), 0.6) * sorted.length))];
      const gain = pick([5, 10, 10, 15]);
      candidate.points += gain;
      renderBoard();
      const li = $$('li', board).find(item => item.dataset.name === candidate.name);
      if (li) {
        $('[data-gain]', li).textContent = typo(`+${gain}`);
        li.classList.add('is-up');
        setTimeout(() => li.classList.remove('is-up'), 1800);
      }
    };
    setTimeout(loop, 5000);
    watchVisible(board, () => {});
  }

  function renderBadges() {
    $('[data-badges]').innerHTML = D.badges.map(b => `
      <li class="badge" tabindex="0">${emblem(b)}<span class="badge-name">${t(b.name)}</span><span class="badge-rule">${t(b.rule)}</span></li>`).join('');
    $$('[data-emblems]').forEach(list => {
      list.innerHTML = list.dataset.emblems.split('|').map(name => D.badges.find(b => b.name === name)).filter(Boolean)
        .map(b => `<li>${emblem(b)}<span>${t(b.name)}</span></li>`).join('');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Profils                                                             */
  /* ------------------------------------------------------------------ */

  function initProfiles() {
    const panels = $$('.profile-panel');
    initTabs($('[data-tabs="profiles"]'), (tab, index) => {
      panels.forEach((panel, i) => {
        const on = i === index;
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Survols : boutons magnétiques et inclinaison des cartes             */
  /* ------------------------------------------------------------------ */

  function initHoverEffects() {
    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !motionFull()) return;
      const magnet = event.target.closest('[data-magnetic]');
      if (magnet && settings.effects !== 'subtle') {
        const rect = magnet.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        magnet.style.setProperty('--mx', `${clamp(dx * 0.22, -10, 10).toFixed(1)}px`);
        magnet.style.setProperty('--my', `${clamp(dy * 0.32, -8, 8).toFixed(1)}px`);
      }
      const card = event.target.closest('.card');
      if (card && settings.effects === 'bold') {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      }
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      const magnet = event.target.closest('[data-magnetic]');
      if (magnet && !magnet.contains(event.relatedTarget)) { magnet.style.removeProperty('--mx'); magnet.style.removeProperty('--my'); }
      const card = event.target.closest('.card');
      if (card && !card.contains(event.relatedTarget)) { card.classList.remove('is-tilting'); card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pause du fil d'activité                                             */
  /* ------------------------------------------------------------------ */

  function initFeedToggle() {
    const button = $('[data-feed-toggle]');
    const render = () => {
      button.innerHTML = icon(feedPaused ? 'play' : 'pause');
      button.setAttribute('aria-label', feedPaused ? 'Reprendre le fil d’activité' : 'Mettre en pause le fil d’activité');
      button.title = button.getAttribute('aria-label');
    };
    button.addEventListener('click', () => { feedPaused = !feedPaused; render(); });
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */

  const heroWaves = window.VysoraVagues ? window.VysoraVagues.init({ hero: $('[data-hero-section]'), settings, motionLevel }) : null;

  /* Texte d'introduction du héros, au choix dans Tweaks. */
  const heroLead = $('.hero-lead');
  const applyHeroLead = () => {
    const text = (D.heroLeads || {})[settings.herolead];
    if (heroLead && text && heroLead.textContent !== typo(text)) heroLead.textContent = typo(text);
  };

  /* Plein écran : le héros prend la hauteur visible sous ce qui le précède (bandeau de compte). */
  const heroSection = $('[data-hero-section]');
  const measureHeroOffset = () => {
    if (!heroSection) return;
    const top = heroSection.getBoundingClientRect().top + window.scrollY;
    root.style.setProperty('--hero-avant', `${Math.max(0, Math.round(top))}px`);
  };
  measureHeroOffset();
  window.addEventListener('resize', measureHeroOffset);
  if (window.VysoraEtats) window.VysoraEtats.on(() => requestAnimationFrame(measureHeroOffset));
  renderCards();
  initTabs($('[data-tabs="explore"]'), tab => { currentList = tab.dataset.list; $('#explore-panel').setAttribute('aria-labelledby', tab.id); renderCards({ animate: true }); });
  renderDomains();
  renderChart();
  renderBreakdown();
  updateTrend();
  renderTopics();
  renderBadges();
  initFeed();
  initBoard();
  initProfiles();
  initReflex();
  const lab = initLab();
  initCountdown();
  initCompare();
  initMenu();
  initIntent();
  initFeedToggle();
  initHoverEffects();
  decorateTools();
  fixTypography(document.body);

  const constellation = initConstellation();
  const sphere = initSphere();
  const trame = initTrame();
  initAnatomie();
  refreshPElements();
  observeReveals();
  $$('[data-count]').forEach(el => countObserver.observe(el));

  onReveal($('.pulse-card'), () => { chartRevealed = true; requestAnimationFrame(() => $('[data-chart]').classList.add('is-drawn')); });
  let chartResize = 0;
  window.addEventListener('resize', () => {
    clearTimeout(chartResize);
    chartResize = setTimeout(() => {
      const box = $('[data-chart]');
      if (Math.abs((Number(box.dataset.width) || 0) - box.clientWidth) > 8) renderChart();
    }, 160);
  });

  onSettings(changed => {
    if (changed === 'cards' || changed === 'reset') renderCards({ animate: true });
    else schedulePath();
    if (constellation) {
      if (changed === 'effects' || changed === 'reset' || changed === 'herolimit' || changed === 'herosize') constellation.reseed();
      else if (changed === 'accent') constellation.recolor();
      else constellation.update();
    }
    if (changed === 'herolead' || changed === 'reset' || changed === 'init') applyHeroLead();
    if (heroWaves) heroWaves.refresh(changed);
    if (sphere) { if (['accent', 'toolsbg', 'reset'].includes(changed)) sphere.recolor(); sphere.update(); }
    if (trame && ['init', 'reset', 'accent', 'toolsbg', 'effects', 'density'].includes(changed)) trame.refresh();
    if (!motionFull()) $('[data-chart]').classList.add('is-drawn');
    requestFrame();
  });
  listeners.forEach(fn => fn('init'));
  requestFrame();

  let started = false;
  const ready = () => {
    if (started) return;
    started = true;
    document.body.classList.add('is-ready');
    startLiveStats();
    if (heroWaves) setTimeout(heroWaves.remesurer, 1300);
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => {
    requestAnimationFrame(ready);
    setTimeout(ready, 250);
  });
})();
