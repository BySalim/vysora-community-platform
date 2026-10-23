'use strict';

(() => {
  const V = window.Vysora;
  const X = window.VYSORA_EXPLORER;
  const { D, root, $, $$, fmt, esc, t, typo, plural, normalize, icon, store, logo, avatar, typeTag, mediaHTML, toast, relativeDay, dateLabel } = V;
  const M = window.VysoraGuides;
  const { STOP, fold, stem, tokenize, hits, highlight, DOMAIN_ICON, KINDS, LEVELS, fullModel, firstName, toolsLine, creations, byId, topicsById, casesById, guides, guideById, totals, srOnly, kicker, shareHTML, isMine, compatOf, myToolsHTML, miniRouteHTML, guideRowHTML, traceHTML, runShape, proofHTML } = M;

  /* ------------------------------------------------------------------ */
  /* État, adresse et préférences                                         */
  /* ------------------------------------------------------------------ */

  const state = { guide: null, q: '', domain: '', sort: 'actifs', runSort: 'reproduits', caseIndex: 0, frise: 0 };
  const compare = new Set();
  const caseState = {};
  const reponses = store.get('vysora-cas-reponses', {}) || {};
  const caseOf = id => (V.etats.peut('contribuer') && reponses[id]) || caseState[id] || {};

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.guide = guideById[p.get('guide')] ? p.get('guide') : null;
    state.q = (p.get('q') || '').trim();
    state.domain = M.findDomain(p.get('categorie') || p.get('domaine') || '')?.name || '';
    state.sort = ['actifs', 'fiables', 'recents'].includes(p.get('tri')) ? p.get('tri') : 'actifs';
    if (state.guide && p.get('cas')) state.caseIndex = Math.max(0, guideById[state.guide].cases.indexOf(p.get('cas')));
  }
  function writeURL(push = true) {
    const p = new URLSearchParams();
    if (state.guide) p.set('guide', state.guide);
    else {
      if (state.q) p.set('q', state.q);
      if (state.domain) p.set('categorie', state.domain);
      if (state.sort !== 'actifs') p.set('tri', state.sort);
    }
    const url = `${location.pathname}${p.size ? `?${p}` : ''}`;
    if (url !== `${location.pathname}${location.search}`) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  /* ------------------------------------------------------------------ */
  /* Éléments communs                                                     */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Index des guides                                                     */
  /* ------------------------------------------------------------------ */

  const els = {
    viewIndex: $('[data-view="index"]'),
    viewGuide: $('[data-view="guide"]'),
    input: $('#ex-q'),
    guides: $('[data-guides]'),
    domains: $('[data-domains]'),
    sub: $('[data-index-sub]'),
    none: $('[data-none]'),
    matches: $('[data-matches]'),
    matchesList: $('[data-matches-list]'),
    guide: $('[data-guide]'),
    guideNav: $('[data-guide-nav]')
  };

  function scoreGuide(g, tokens) {
    if (!tokens.length) return 1;
    let score = 0;
    for (const variants of tokens) {
      if (hits(g.titleText, variants)) score += 3;
      else if (hits(g.searchText, variants)) score += 1;
      else return 0;
    }
    return score;
  }

  function renderIndex() {
    const tokens = tokenize(state.q);
    const inDomain = g => !state.domain || g.domain === state.domain || g.items.some(c => c.domain === state.domain);
    const scored = guides.map(g => ({ g, score: scoreGuide(g, tokens) })).filter(row => row.score > 0);
    const visible = scored.filter(row => inDomain(row.g));
    const sorters = {
      actifs: (a, b) => b.g.week - a.g.week,
      fiables: (a, b) => (b.g.rate ?? -1) - (a.g.rate ?? -1) || b.g.repro - a.g.repro,
      recents: (a, b) => b.g.recent.localeCompare(a.g.recent)
    };
    visible.sort((a, b) => (tokens.length ? b.score - a.score : 0) || sorters[state.sort](a, b) || (M.myTools().size ? (compatOf(b.g)?.length || 0) - (compatOf(a.g)?.length || 0) : 0));

    const counts = new Map();
    scored.forEach(({ g }) => {
      const domains = new Set([g.domain, ...g.items.map(c => c.domain)]);
      domains.forEach(d => counts.set(d, (counts.get(d) || 0) + 1));
    });
    const keep = document.activeElement?.closest('[data-domains]') ? document.activeElement.dataset.domain : null;
    els.domains.innerHTML = `<li><button type="button" data-domain="" aria-pressed="${!state.domain}">Tous<small>${fmt(scored.length)}</small></button></li>` +
      X.domains.filter(d => counts.get(d.name) || state.domain === d.name).map(d => `<li><button type="button" data-domain="${esc(d.name)}" aria-pressed="${state.domain === d.name}">${icon(d.icon)}${t(d.name)}<small>${fmt(counts.get(d.name) || 0)}</small></button></li>`).join('');
    if (keep !== null) $(`[data-domain="${CSS.escape(keep)}"]`, els.domains)?.focus();

    const domain = state.domain && M.DOMAIN_BY_NAME[state.domain];
    const banner = $('[data-domain-banner]');
    banner.hidden = !domain;
    banner.innerHTML = domain ? `<span class="ex-db-icon" aria-hidden="true">${icon(domain.icon, '')}</span><span class="ex-db-text"><b>${t(domain.name)}</b>${t(domain.description)}</span><a class="link-arrow" href="${M.domainHref(domain.name)}">Ouvrir la page du domaine${icon('arrow')}</a>` : '';
    els.guides.innerHTML = visible.map((row, i) => guideRowHTML(row.g, tokens, i)).join('');
    els.sub.textContent = state.q
      ? (visible.length ? `${plural(visible.length, 'guide correspond', 'guides correspondent')} à « ${state.q} »` : `Aucun guide pour « ${state.q} »`)
      : `${plural(visible.length, 'guide', 'guides')} · ${plural(totals.parcours, 'parcours documenté', 'parcours documentés')} · ${plural(totals.repro, 'reproduction déclarée', 'reproductions déclarées')}`;
    $('[data-mytools]').innerHTML = myToolsHTML(true);
    $('[data-index-sort]').value = state.sort;

    const runs = tokens.length ? creations.filter(c => tokens.every(variants => hits(` ${fold(`${c.title} ${c.tags.join(' ')} ${c.objective}`)}`, variants))).slice(0, 6) : [];
    els.matches.hidden = !runs.length;
    els.matchesList.innerHTML = runs.map(c => `<li><a href="${c.href}">${typeTag(c.type)}<span>${highlight(c.title, tokens)}</span></a><span class="ex-match-guide">dans le guide <a href="${guideById[c.goal].href}" data-guide-link="${c.goal}">${t(guideById[c.goal].short)}</a></span></li>`).join('');

    els.none.hidden = visible.length > 0;
    $('.ex-legend').hidden = !visible.length;
    if (!visible.length) {
      const near = guides.map(g => ({ g, n: tokens.reduce((sum, v) => sum + (hits(g.searchText, v) ? 1 : 0), 0) })).filter(r => r.n).sort((a, b) => b.n - a.n).slice(0, 3);
      els.none.innerHTML = `<div class="ex-none-inner">
        ${icon('flag', '')}
        <h3>${state.q ? `Personne n’a encore documenté « ${t(state.q)} »` : 'Aucun guide dans ce domaine pour l’instant'}</h3>
        <p>Publiez le premier parcours : il ouvrira le guide de cet objectif. Vous pouvez aussi poser la question à la communauté.</p>
        <div class="ex-none-actions"><a class="btn btn-primary" href="nouvelle-creation.html">Publier le premier parcours</a><a class="btn btn-secondary" href="forum.html?nouveau=question">Poser la question</a></div>
        ${near.length ? `<p class="ex-none-near"><span>Guides proches :</span>${near.map(r => `<a href="${r.g.href}" data-guide-link="${r.g.id}">${t(r.g.short)}</a>`).join('')}</p>` : ''}
      </div>`;
    }
    V.fixTypography(els.guides);
    if (heroMode() === 'recherche') showHero(heroTarget());
  }

  const agreement = g => g.path.reduce((sum, step) => sum + step.sources.length / g.items.length, 0) / g.path.length;
  const heroGuides = [...guides].filter(o => o.items.length >= 3).sort((a, b) => agreement(b) - agreement(a) || b.week - a.week).slice(0, 3);
  const hero = { index: 0, paused: false, timer: null, hover: false, current: null };
  const heroMode = () => root.getAttribute('data-apercu') || 'recherche';
  function heroAuto() { return heroMode() === 'defilant' && V.motion.full() && !hero.paused; }
  function scheduleHero() {
    clearTimeout(hero.timer);
    if (!heroAuto()) return;
    hero.timer = setTimeout(() => {
      if (!hero.hover && !document.hidden && !state.guide) { hero.index = (hero.index + 1) % heroGuides.length; showHero(heroGuides[hero.index].id); }
      scheduleHero();
    }, 7000);
  }
  function heroBodyHTML(g) {
    const pit = g.pitfalls[0];
    return `<div class="ex-hc-body" data-hc="${g.id}">
      <p class="ex-hc-head"><a href="${g.href}" data-guide-link="${g.id}">${t(g.short)}</a></p>
      <p class="ex-hc-caption">La méthode qui ressort de ${plural(g.items.length, 'parcours', 'parcours')}</p>
      <ol class="ex-hc-steps">${g.path.map((step, i) => `<li style="--i:${i}"${pit && pit.step === i ? ' class="has-pit"' : ''}><span class="ex-hc-node" aria-hidden="true">${i + 1}</span><span class="ex-hc-text">${t(step.title)}<small>${step.sources.length} sur ${g.items.length}</small></span>${pit && pit.step === i ? `<span class="ex-hc-pit"><span class="ex-ring" aria-hidden="true"></span><span>Piège fréquent : ${t(pit.title.charAt(0).toLowerCase() + pit.title.slice(1))}</span></span>` : ''}</li>`).join('')}</ol>
      <div class="ex-hc-foot"><span class="ex-avatars" aria-hidden="true">${g.authors.slice(0, 4).map(name => avatar(name, 24)).join('')}</span><span>${plural(g.repro, 'reproduction', 'reproductions')}${g.rate !== null ? ` · ${g.rate} % réussies` : ''}</span><span class="ex-hc-go"><kbd class="ex-hc-enter" aria-hidden="true">Entrée</kbd><a class="link-arrow" href="${g.href}" data-guide-link="${g.id}">Ouvrir le guide${icon('arrow')}</a></span></div>
    </div>`;
  }
  function heroNoneHTML() {
    return `<div class="ex-hc-body ex-hc-none" data-hc="none">
      <span class="ex-hc-none-icon" aria-hidden="true">${icon('flag', '')}</span>
      <p class="ex-hc-head" data-hc-query></p>
      <p class="ex-hc-caption">Aucun guide ne couvre encore cet objectif. Le premier parcours publié ouvrira son guide, et les guides proches restent visibles dans la liste.</p>
      <p class="ex-hc-near" data-hc-near hidden></p>
      <div class="ex-hc-foot"><a class="link-arrow" href="nouvelle-creation.html">Publier le premier parcours${icon('arrow')}</a></div>
    </div>`;
  }
  const pauseLabel = () => (hero.paused ? 'Reprendre le défilement des aperçus' : 'Mettre en pause le défilement des aperçus');
  function renderHeroCard() {
    const mode = heroMode();
    const card = $('[data-hero-card]');
    clearTimeout(hero.timer);
    hero.current = null;
    if (mode === 'aucun') { card.innerHTML = ''; return; }
    // Tous les aperçus sont empilés dans la même cellule : la carte garde la hauteur du plus long.
    const pool = mode === 'defilant' ? heroGuides : [...heroGuides, ...guides.filter(g => !heroGuides.includes(g))];
    card.innerHTML = `
      <div class="ex-hc-top">
        <span class="ex-hc-kicker" data-hc-kicker>Aperçu d’un guide</span>
        ${mode === 'defilant' ? `<div class="ex-hc-nav">
          <div class="ex-hc-dots" role="group" aria-label="Choisir l’aperçu">${heroGuides.map((o, i) => `<button type="button" data-hero="${i}" aria-pressed="${i === hero.index}" aria-label="${esc(o.short)}"></button>`).join('')}</div>
          ${V.motion.full() ? `<button class="ex-hc-pause" type="button" data-hero-pause aria-label="${pauseLabel()}">${icon(hero.paused ? 'play' : 'pause')}</button>` : ''}
        </div>` : ''}
      </div>
      <div class="ex-hc-stack">${pool.map(heroBodyHTML).join('')}${mode === 'recherche' ? heroNoneHTML() : ''}</div>`;
    V.fixTypography(card);
    showHero(heroTarget(), false);
  }
  function heroTarget() {
    if (heroMode() === 'defilant') return heroGuides[hero.index].id;
    if (!state.q) return heroGuides[0].id;
    const first = $('[data-guide-link]', els.guides);
    return first ? first.dataset.guideLink : 'none';
  }
  function showHero(id, animate = true) {
    const card = $('[data-hero-card]');
    if (!card.firstElementChild) return;
    const matching = heroMode() === 'recherche' && !!state.q;
    $$('[data-hc]', card).forEach(body => {
      const on = body.dataset.hc === id;
      body.classList.toggle('is-active', on);
      body.inert = !on;
      if (on) body.removeAttribute('aria-hidden'); else body.setAttribute('aria-hidden', 'true');
      if (on && animate && id !== hero.current && V.motion.full()) { body.classList.remove('is-switching'); void body.offsetWidth; body.classList.add('is-switching'); }
    });
    if (id === 'none') {
      $('[data-hc-query]', card).textContent = `« ${typo(state.q)} »`;
      const tokens = tokenize(state.q);
      const near = guides.map(g => ({ g, n: tokens.reduce((sum, v) => sum + (hits(g.searchText, v) ? 1 : 0), 0) })).filter(r => r.n).sort((a, b) => b.n - a.n).slice(0, 3);
      const box = $('[data-hc-near]', card);
      box.hidden = !near.length;
      box.innerHTML = near.length ? `<span>Guides proches</span>${near.map(r => `<a href="${r.g.href}" data-guide-link="${r.g.id}">${t(r.g.short)}</a>`).join('')}` : '';
    }
    $('[data-hc-kicker]', card).textContent = matching ? (id === 'none' ? 'Pas encore de guide' : 'Le guide qui correspond') : 'Aperçu d’un guide';
    card.classList.toggle('is-matching', matching && id !== 'none');
    $$('[data-hero]', card).forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === hero.index)));
    hero.current = id;
  }

  const wanted = new Set((store.get('vysora-demandes', []) || []).filter(q => typeof q === 'string'));
  function renderRequests() {
    const mine = query => V.etats.membre() && wanted.has(query);
    const list = X.requests.map(r => ({ ...r, total: r.count + (mine(r.query) ? 1 : 0) })).sort((a, b) => b.total - a.total);
    $('[data-requests]').innerHTML = list.map(r => {
      const domain = M.DOMAIN_BY_NAME[r.domain];
      const on = mine(r.query);
      return `<li>
        <div class="ex-req-text"><span class="ex-req-domain">${domain ? icon(domain.icon) : ''}${t(r.domain)}</span><span class="ex-req-query">${t(r.query)}</span><span class="ex-req-count">${plural(r.total, 'personne le cherche', 'personnes le cherchent')} ce mois-ci</span></div>
        <div class="ex-req-actions"><button class="ex-want" type="button" aria-pressed="${on}" data-want="${esc(r.query)}">${icon(on ? 'check' : 'plus')}<span>${on ? 'Vous le cherchez aussi' : 'Je le cherche aussi'}</span></button><a class="link-arrow" href="nouvelle-creation.html">Documenter<span class="sr-only"> : ${t(r.query)}</span>${icon('arrow')}</a></div>
      </li>`;
    }).join('');
    V.fixTypography($('[data-requests]'));
  }

  const EXAMPLES = ['prendre des rendez-vous en ligne', 'un logo lisible en petit format', 'trier mes factures automatiquement', 'une série d’illustrations au même style', 'un script qui range mes fichiers', 'répondre aux avis de mes clients'];
  const placeholder = { index: 0, timer: null };
  function rotatePlaceholder() {
    if (!V.motion.full() || state.guide || document.activeElement === els.input || els.input.value || document.hidden) return;
    placeholder.index = (placeholder.index + 1) % EXAMPLES.length;
    const prefix = 'Par exemple : ';
    const text = `${prefix}${EXAMPLES[placeholder.index]}`;
    let n = prefix.length;
    clearTimeout(placeholder.timer);
    const step = () => { n += 1; els.input.placeholder = typo(text.slice(0, n)); if (n < text.length) placeholder.timer = setTimeout(step, 26); };
    step();
  }

  /* ------------------------------------------------------------------ */
  /* Guide d'un objectif                                                  */
  /* ------------------------------------------------------------------ */

  const SECTIONS = {
    methode: { label: 'Méthode', icon: 'route' },
    pieges: { label: 'Pièges', icon: 'moment' },
    outils: { label: 'Outils', icon: 'wrench' },
    parcours: { label: 'Parcours', icon: 'layers' },
    pratique: { label: 'S’entraîner', icon: 'bulb' },
    manque: { label: 'À compléter', icon: 'flag' }
  };
  const ORDERS = {
    methode: ['methode', 'pieges', 'outils', 'parcours', 'pratique', 'manque'],
    pieges: ['pieges', 'methode', 'outils', 'parcours', 'pratique', 'manque'],
    parcours: ['parcours', 'methode', 'pieges', 'outils', 'pratique', 'manque']
  };

  function quoteOf(step) {
    if (!step.quote) return null;
    const c = byId[step.quote];
    const text = step.quoteText || c.prompt;
    return text ? { c, text } : null;
  }

  function stepDetailHTML(g, step, i) {
    const quote = quoteOf(step);
    const pits = g.pitfalls.map((p, k) => ({ p, k })).filter(({ p }) => p.step === i);
    return `<p class="ex-step-how">${t(step.how)}</p>
      ${quote ? `<details class="ex-quote"><summary>${avatar(quote.c.author, 22)}Voir comment ${t(firstName(quote.c.author))} l’a demandé</summary>
        <figure><blockquote>${t(quote.text)}</blockquote><figcaption>${toolsLine(quote.c.tools)}<span>· ${t(quote.c.title)}</span></figcaption></figure>
        <div class="ex-quote-actions"><button class="ex-copy" type="button" data-copy="${esc(step.quote)}" data-copy-step="${i}">${icon('copy')}<span>Copier le prompt</span></button><a class="link-arrow" href="${quote.c.href}">Ouvrir le parcours${icon('arrow')}</a></div>
      </details>` : ''}
      ${pits.map(({ p, k }) => `<a class="ex-step-pit" href="#piege-${k + 1}" data-jump="piege-${k + 1}"><span class="ex-ring" aria-hidden="true"></span><span><b>Piège à cette étape :</b> ${t(p.title)}</span>${icon('arrow-down')}</a>`).join('')}`;
  }

  const checks = store.get('vysora-listes', {}) || {};
  const checkedOf = g => new Set(Array.isArray(checks[g.id]) ? checks[g.id] : []);
  function checklistHTML(g) {
    const done = checkedOf(g);
    const items = [...g.path.map((step, i) => [`s${i}`, step.title]), ...g.pitfalls.map((p, k) => [`p${k}`, p.title])];
    const count = items.filter(([key]) => done.has(key)).length;
    const row = ([key, label]) => `<li><label class="ex-check"><input type="checkbox" data-check="${key}"${done.has(key) ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icon('check', '')}</span><span>${t(label)}</span></label></li>`;
    return `<aside class="ex-checklist" aria-labelledby="ex-check-title">
      <h3 id="ex-check-title">Ma liste de contrôle</h3>
      <p class="ex-check-intro">Cochez au fur et à mesure, pendant que vous travaillez avec votre outil.</p>
      <p class="ex-check-progress" data-check-progress><span>${count} sur ${items.length}</span><span class="ex-check-bar" aria-hidden="true"><i style="--p:${(count / items.length * 100).toFixed(1)}%"></i></span></p>
      <p class="ex-check-group">Étapes</p>
      <ul>${items.filter(([key]) => key.startsWith('s')).map(row).join('')}</ul>
      <p class="ex-check-group">Pièges évités</p>
      <ul>${items.filter(([key]) => key.startsWith('p')).map(row).join('')}</ul>
      <div class="ex-check-actions"><button class="ex-copy" type="button" data-check-copy>${icon('copy')}<span>Copier la liste</span></button>${count ? '<button class="link-btn" type="button" data-check-reset>Tout décocher</button>' : ''}</div>
      <p class="ex-check-note">${V.etats.membre() ? 'Votre liste est enregistrée dans votre compte.' : 'Votre liste reste enregistrée dans ce navigateur.'}</p>
    </aside>`;
  }
  function checklistText(g) {
    const done = checkedOf(g);
    const line = (key, label) => `[${done.has(key) ? 'x' : ' '}] ${label}`;
    return [
      `${g.title} : liste de contrôle Vysora`,
      '',
      'Étapes',
      ...g.path.map((step, i) => line(`s${i}`, step.title)),
      '',
      'Pièges à éviter',
      ...g.pitfalls.map((p, k) => line(`p${k}`, `${p.title}. ${p.fix}`)),
      '',
      `Guide : ${location.origin}${location.pathname}?guide=${g.id}`
    ].join('\n');
  }

  function methodHTML(g) {
    return `<div class="ex-method"><div class="ex-method-main">${methodTraceHTML(g)}</div>${checklistHTML(g)}</div>`;
  }

  function methodTraceHTML(g) {
    if (root.dataset.trace === 'frise') {
      const current = Math.min(state.frise, g.path.length - 1);
      return `<div class="ex-frise" role="tablist" aria-label="Étapes de la méthode">${g.path.map((step, i) => `<button type="button" role="tab" id="frise-tab-${i}" aria-controls="frise-panel" aria-selected="${i === current}" tabindex="${i === current ? 0 : -1}" data-frise="${i}" class="${g.pitfalls.some(p => p.step === i) ? 'has-pit' : ''}"><span class="ex-frise-node">${i + 1}</span><span class="ex-frise-title">${t(step.title)}</span><span class="ex-frise-share">${step.sources.length} sur ${g.items.length}</span></button>`).join('')}</div>
        <div class="ex-frise-panel" id="frise-panel" role="tabpanel" aria-labelledby="frise-tab-${current}"><h3>${t(g.path[current].title)}</h3>${shareHTML(g.path[current].sources.length, g.items.length)}${stepDetailHTML(g, g.path[current], current)}</div>`;
    }
    const done = checkedOf(g);
    return `<ol class="ex-path" data-path>${g.path.map((step, i) => `<li class="ex-step${g.pitfalls.some(p => p.step === i) ? ' has-pit' : ''}${done.has(`s${i}`) ? ' is-done' : ''}" data-step="${i}">
        <span class="ex-step-node" aria-hidden="true">${i + 1}</span>
        <div class="ex-step-body"><h3>${srOnly(`Étape ${i + 1} : `)}${t(step.title)}</h3>${shareHTML(step.sources.length, g.items.length)}${stepDetailHTML(g, step, i)}</div>
      </li>`).join('')}</ol>`;
  }

  const proposals = store.get('vysora-pieges-proposes', {}) || {};
  const proposalsOf = g => (Array.isArray(proposals[g.id]) ? proposals[g.id] : []);
  function pitfallsHTML(g) {
    const pending = (V.etats.membre() ? proposalsOf(g) : []).map(p => `<li class="ex-pit is-pending">
        <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.title)}</h3><span class="ex-pending">En relecture</span></div>
        ${p.fix ? `<p class="ex-fix"><b>Ce qui a fonctionné :</b> ${t(p.fix)}</p>` : ''}
        <p class="ex-pit-src"><span>Signalé par vous ${t(relativeDay(p.date))}${p.step !== '' && g.path[p.step] ? `, à l’étape « ${t(g.path[p.step].title)} »` : ''}${p.tool ? ` avec ${t(p.tool)}` : ''}</span></p>
      </li>`).join('');
    return `${pitfallsListHTML(g, pending)}<div class="ex-pit-propose"><p><b>Vous avez rencontré un autre piège ?</b> Signalez-le : il rejoindra ce guide après relecture.</p><button class="btn btn-secondary btn-sm" type="button" data-propose>${icon('plus')}Signaler un piège</button></div>`;
  }

  function pitfallsListHTML(g, pending) {
    return `<ol class="ex-pits">${pending}${g.pitfalls.map((p, k) => {
      const sources = p.sources.map(id => byId[id]);
      const topic = p.topic && topicsById[p.topic];
      return `<li class="ex-pit" id="piege-${k + 1}">
        <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.title)}</h3></div>
        ${shareHTML(p.sources.length, g.items.length)}
        <p class="ex-fix"><b>Ce qui a fonctionné :</b> ${t(p.fix)}</p>
        <p class="ex-pit-src"><span>Signalé dans</span>${sources.map(c => `<a href="${c.href}">${avatar(c.author, 22)}${t(c.title)}</a>`).join('')}</p>
        ${p.case || topic ? `<p class="ex-pit-more">${p.case ? `<button class="link-btn" type="button" data-train="${p.case}">${icon('bulb')}S’entraîner sur ce piège</button>` : ''}${topic ? `<a class="link-btn" href="forum.html?sujet=${topic.id}">${icon('message')}Lire la discussion</a>` : ''}</p>` : ''}
      </li>`;
    }).join('')}</ol>`;
  }

  function toolsHTML(g) {
    const rows = [...g.models].sort((a, b) => b.tested.size - a.tested.size || b.used.size - a.used.size || a.key.localeCompare(b.key, 'fr'));
    const absent = [...M.myTools()].filter(tool => !g.models.some(m => m.tool === tool));
    const cell = (m, c) => {
      const used = m.used.has(c.id);
      const ok = m.tested.has(c.id);
      const label = used && ok ? 'Outil de l’auteur, reproduit avec succès' : used ? 'Outil de l’auteur' : ok ? 'Reproduit avec succès' : 'Pas de donnée';
      return `<td><span class="ex-mx${used ? ' is-used' : ''}${ok ? ' is-ok' : ''}" title="${esc(label)}">${ok ? icon('check', '') : ''}<span class="sr-only">${t(label)}</span></span></td>`;
    };
    return `<div class="ex-tools-bar">${myToolsHTML()}<p>${M.myTools().size ? 'Vos outils sont mis en évidence.' : 'Indiquez vos outils pour les repérer dans le tableau.'}</p></div>
      <div class="ex-table-wrap"><table class="ex-matrix">
        <caption class="sr-only">Outils et modèles, parcours par parcours : outil de l’auteur et reproductions réussies</caption>
        <thead><tr><th scope="col" class="ex-mx-first">Outil et modèle</th>${g.items.map((c, i) => `<th scope="col" class="ex-mx-head"><a href="${c.href}" title="${esc(c.title)}">${avatar(c.author, 28)}<span>${t(firstName(c.author))}</span><span class="sr-only"> : ${t(c.title)}</span></a></th>`).join('')}<th scope="col" class="ex-mx-last">Dernière réussite</th></tr></thead>
        <tbody>${rows.map(m => `<tr class="${isMine(m.tool) ? 'is-mine' : ''}">
          <th scope="row"><span class="ex-model">${logo(m.tool, 20)}${t(m.key)}${isMine(m.tool) ? '<small>Vos outils</small>' : ''}</span></th>
          ${g.items.map(c => cell(m, c)).join('')}
          <td class="ex-mx-last">${m.last ? t(relativeDay(m.last)) : '<span class="ex-muted">—</span>'}</td>
        </tr>`).join('')}
        ${absent.map(tool => `<tr class="is-mine is-absent"><th scope="row"><span class="ex-model">${logo(tool, 20)}${t(tool)}<small>Vos outils</small></span></th><td colspan="${g.items.length + 1}"><span class="ex-muted">Aucun parcours de ce guide avec cet outil.</span> <a href="nouvelle-creation.html">Soyez le premier</a></td></tr>`).join('')}
        </tbody>
      </table></div>
      <p class="ex-mx-legend" aria-hidden="true"><span><i class="ex-mx is-used"></i>Outil choisi par l’auteur</span><span><i class="ex-mx is-ok">${icon('check', '')}</i>Reproduit avec succès par un membre</span><span><i class="ex-mx is-used is-ok">${icon('check', '')}</i>Les deux</span></p>`;
  }

  function runsHTML(g) {
    const sorters = {
      reproduits: (a, b) => b.successCount - a.successCount || b.useful - a.useful,
      recents: (a, b) => b.date.localeCompare(a.date),
      utiles: (a, b) => b.useful - a.useful
    };
    const items = [...g.items].sort(sorters[state.runSort]);
    return `<div class="ex-runs-bar"><label class="ex-sort"><span>Trier par</span><select data-run-sort>
        <option value="reproduits"${state.runSort === 'reproduits' ? ' selected' : ''}>Les plus reproduits</option>
        <option value="utiles"${state.runSort === 'utiles' ? ' selected' : ''}>Les plus utiles</option>
        <option value="recents"${state.runSort === 'recents' ? ' selected' : ''}>Les plus récents</option>
      </select>${icon('chevron-down')}</label><p>Cochez deux ou trois parcours pour les comparer.</p></div>
      <ul class="ex-runs">${items.map(c => `<li class="ex-run" id="parcours-${c.id}">
        <a class="ex-run-media" href="${c.href}" tabindex="-1" aria-hidden="true">${mediaHTML(c.media, '120px')}</a>
        <div class="ex-run-main">
          <p class="ex-run-meta">${typeTag(c.type)}<span aria-hidden="true">·</span><span>${t(c.category)}</span></p>
          <h3><a href="${c.href}">${t(c.title)}</a></h3>
          <p class="ex-run-who">${avatar(c.author, 22)}<span>${t(c.author)}${c.level ? ` <small>· ${t(c.level)}</small>` : ''}</span></p>
          <p class="ex-run-tools">${toolsLine(c.tools)}</p>
        </div>
        <div class="ex-run-side"><div class="ex-run-shape">${traceHTML(c)}<span>${t(runShape(c))}</span></div>
        <div class="ex-run-proof">${proofHTML(c)}${c.last ? `<span class="ex-fresh">${icon('clock')}Dernier succès ${t(relativeDay(c.last.date))}</span>` : `<span class="ex-fresh">${icon('calendar')}Publié ${t(relativeDay(c.date))}</span>`}${c.obsolete ? `<span class="ex-warn">${icon('alert')}Signalé comme ne fonctionnant plus avec ${t(c.obsolete.model)} par ${fmt(c.obsolete.count)} membres</span>` : ''}</div></div>
        <label class="ex-pick"><input type="checkbox" data-compare-id="${c.id}"${compare.has(c.id) ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icon('check', '')}</span><span>Comparer<span class="sr-only"> « ${t(c.title)} »</span></span></label>
      </li>`).join('')}</ul>`;
  }

  function caseHTML(c) {
    const cs = caseOf(c.id);
    const saved = V.etats.peut('contribuer');
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const right = cs.locked && cs.choice === c.correct;
    return `<div class="ex-case" data-case-id="${c.id}">
      <p class="ex-case-meta"><span class="level" data-level="${c.level}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${LEVELS[c.level]}</span><span>${icon('clock')}${c.minutes} min</span><span>${c.rate} % de bonnes réponses</span></p>
      <h3>${t(c.title)}</h3>
      <p class="ex-case-context">${t(c.context)}</p>
      <figure class="ex-ai"><figcaption>${icon('message')}Réponse de l’IA</figcaption><blockquote>« ${t(c.response)} »</blockquote></figure>
      <form class="ex-case-form" data-case-form="${c.id}">
        <fieldset class="ex-choices"><legend>Que faites-vous ?</legend>${c.choices.map((choice, k) => {
          const cls = cs.locked ? (k === c.correct ? ' is-correct' : k === cs.choice ? ' is-wrong' : '') : '';
          return `<label class="ex-choice${cls}${cs.locked ? ' is-locked' : ''}"><input type="radio" name="choix-${c.id}" value="${k}"${cs.choice === k ? ' checked' : ''}${cs.locked ? ' disabled' : ''}><kbd>${letters[k]}</kbd><span>${t(choice)}${cs.locked && cs.choice === k ? '<span class="ex-yours">Votre réponse</span>' : ''}${cs.locked ? `<span class="ex-dist"><i style="--v:${c.distribution[k]}%"></i>${c.distribution[k]} % des réponses</span><span class="ex-reason">${t(c.reasons[k])}</span>` : ''}</span></label>`;
        }).join('')}</fieldset>
        ${cs.locked
          ? `<div class="ex-feedback" tabindex="-1" data-feedback><p class="ex-feedback-title${right ? '' : ' is-wrong'}">${icon(right ? 'check-circle' : 'bulb')}${right ? 'Vous avez le bon réflexe.' : `Le bon réflexe : ${t(c.choices[c.correct].charAt(0).toLowerCase() + c.choices[c.correct].slice(1))}.`}</p><p>${t(c.explanation)}</p>${saved ? `<p class="ex-visitor">${right ? 'Réponse enregistrée dans votre progression : +1 point de réputation.' : 'Réponse enregistrée dans votre progression.'}</p></div>` : `<p class="ex-visitor">Votre réponse n’est pas enregistrée. ${V.invitation('contribuer', 'suivre votre progression')}</p><button class="link-btn" type="button" data-case-retry="${c.id}">${icon('replay')}Recommencer</button></div>`}`
          : `<p class="ex-case-error" data-case-error hidden>Choisissez une réponse avant de valider.</p><div class="ex-case-actions"><button class="btn btn-primary btn-sm" type="submit">Valider ma réponse</button><span class="ex-keys">Touches A, B ou C</span></div>`}
      </form>
      <p class="ex-case-by"><img src="assets/logos/vysora%20logo%20bleu.png" alt="" width="22" height="22">Cas rédigé par l’équipe Vysora · <a href="apprendre.html?rubrique=bon-reflexe">Tous les cas Bon réflexe</a></p>
    </div>`;
  }

  function practiceHTML(g) {
    const list = g.cases.map(id => casesById[id]).filter(Boolean);
    const topics = g.topics.map(id => topicsById[id]).filter(Boolean);
    const current = list[Math.min(state.caseIndex, list.length - 1)];
    return `<div class="ex-practice">
      <div class="ex-practice-case">
        ${list.length > 1 ? `<div class="ex-case-switch" role="group" aria-label="Cas pratiques">${list.map((c, i) => `<button type="button" data-case-pick="${i}" aria-pressed="${c === current}">Cas ${i + 1}</button>`).join('')}</div>` : ''}
        ${current ? caseHTML(current) : `<p class="ex-empty-note">Aucun cas Bon réflexe sur ce sujet pour l’instant. <a href="apprendre.html?rubrique=bon-reflexe">Voir tous les cas</a></p>`}
      </div>
      <div class="ex-practice-topics">
        <h3>Questions de la communauté</h3>
        ${topics.length ? `<ul>${topics.map(s => `<li><p class="ex-topic-kind">${icon(KINDS[s.kind].icon)}${t(KINDS[s.kind].label)}${s.status === 'resolved' ? `<span class="ex-resolved">${icon('check-circle')}Résolu</span>` : s.replies === 0 ? '<span class="ex-open">Sans réponse</span>' : ''}</p><a href="forum.html?sujet=${s.id}">${t(s.title)}</a><p class="ex-topic-meta">${avatar(s.author, 20)}${t(s.author)} · ${plural(s.replies, 'réponse', 'réponses')}</p></li>`).join('')}</ul>` : '<p class="ex-empty-note">Aucune question sur ce sujet pour l’instant.</p>'}
        <a class="btn btn-secondary btn-sm" href="forum.html?nouveau=question">Poser une question</a>
      </div>
    </div>`;
  }

  function gapsHTML(g) {
    const gaps = g.gaps.length ? g.gaps : ['Ce guide couvre les cas courants. Un parcours avec un autre outil ou un autre contexte l’enrichirait encore.'];
    const related = M.relatedGuides(g);
    return `<ul class="ex-gaps">${gaps.map(text => `<li>${icon('flag')}<span>${t(text)}</span></li>`).join('')}</ul>
      <div class="ex-gaps-actions"><a class="btn btn-primary" href="nouvelle-creation.html">Publier mon parcours</a><p>Votre parcours rejoint ce guide dès sa publication. Les pièges que vous signalez enrichissent la synthèse.</p></div>
      <div class="ex-related"><h3>Guides proches</h3><ul>${related.map(o => `<li><a href="${o.href}" data-guide-link="${o.id}"><span class="ex-related-domain">${icon(DOMAIN_ICON[o.domain] || 'compass')}${t(o.domain)}</span><span class="ex-related-title">${t(o.title)}</span><span class="ex-related-meta">${plural(o.items.length, 'parcours', 'parcours')} · ${plural(o.pitfalls.length, 'piège', 'pièges')}</span>${icon('arrow')}</a></li>`).join('')}</ul></div>`;
  }

  const SECTION_TITLES = {
    methode: (g) => ['La méthode qui ressort', `Les étapes communes aux ${plural(g.items.length, 'parcours', 'parcours')}, dans l’ordre où les auteurs les ont suivies.`],
    pieges: () => ['Les pièges à anticiper', 'Les moments clés signalés par les auteurs, regroupés par problème, avec ce qui a permis de les résoudre.'],
    outils: () => ['Ce qui a été testé, outil par outil', 'Les modèles employés par les auteurs et ceux avec lesquels d’autres membres ont reproduit les parcours.'],
    parcours: (g) => [`Les ${plural(g.items.length, 'parcours', 'parcours')} de ce guide`, 'Chaque parcours garde ses prompts, ses étapes et ses moments clés sur sa fiche.'],
    pratique: () => ['Exercez votre jugement', 'Un cas tiré de situations réelles, et les questions encore ouvertes sur ce sujet.'],
    manque: () => ['Ce que ce guide ne couvre pas encore', '']
  };
  const SECTION_BODY = { methode: methodHTML, pieges: pitfallsHTML, outils: toolsHTML, parcours: runsHTML, pratique: practiceHTML, manque: gapsHTML };

  function sectionHTML(key, g) {
    const [title, intro] = SECTION_TITLES[key](g);
    return `<section class="ex-section" id="${key}" aria-labelledby="titre-${key}" data-section="${key}">
      ${kicker(SECTIONS[key].icon, SECTIONS[key].label)}
      <h2 id="titre-${key}">${t(title)}</h2>
      ${intro ? `<p class="ex-section-intro">${t(intro)}</p>` : ''}
      <div class="ex-section-body" data-body="${key}">${SECTION_BODY[key](g)}</div>
    </section>`;
  }

  function essentialsHTML(g) {
    const first = g.path[0];
    const pit = g.pitfalls[0];
    const best = [...g.models].sort((a, b) => b.tested.size - a.tested.size || b.used.size - a.used.size)[0];
    return `<section class="ex-essentials" aria-labelledby="ex-essentials-title">
      <h2 id="ex-essentials-title" class="ex-ess-title">L’essentiel</h2>
      <div class="ex-ess">
        <div><p class="ex-ess-label">${icon('route')}Par où commencer</p><p class="ex-ess-value">${t(first.title)}</p><p class="ex-ess-note">${t(first.how)}</p></div>
        ${pit ? `<div><p class="ex-ess-label">${icon('moment')}Le piège n° 1</p><p class="ex-ess-value">${t(pit.title)}</p><p class="ex-ess-note">${t(pit.fix)}</p></div>` : ''}
        ${best ? `<div><p class="ex-ess-label">${icon('check-circle')}Le plus éprouvé</p><p class="ex-ess-value"><span class="ex-model">${logo(best.tool, 20)}${t(best.key)}</span></p><p class="ex-ess-note">${best.tested.size ? `Reproduit avec succès dans ${plural(best.tested.size, 'parcours', 'parcours')} de ce guide.` : `Employé dans ${plural(best.used.size, 'parcours', 'parcours')} de ce guide.`}</p></div>` : ''}
      </div>
    </section>`;
  }

  function renderGuide() {
    const g = guideById[state.guide];
    if (!g) return;
    const order = ORDERS[root.dataset.order] || ORDERS.methode;
    els.guideNav.innerHTML = guides.map(o => `<li><a href="${o.href}" data-guide-link="${o.id}"${o.id === g.id ? ' aria-current="page"' : ''}>${icon(DOMAIN_ICON[o.domain] || 'compass')}<span>${t(o.short)}</span><small>${o.items.length}</small></a></li>`).join('');
    const figures = [
      [fmt(g.items.length), g.items.length > 1 ? 'parcours documentés' : 'parcours documenté'],
      [fmt(g.repro), g.repro > 1 ? 'reproductions déclarées' : 'reproduction déclarée'],
      g.rate !== null ? [`${g.rate} %`, 'de reproductions réussies'] : null,
      [fmt(g.pitfalls.length), g.pitfalls.length > 1 ? 'pièges identifiés' : 'piège identifié']
    ].filter(Boolean);
    els.guide.innerHTML = `
      <header class="ex-guide-head">
        <nav class="ex-crumbs" aria-label="Fil d’Ariane"><a href="explorer.html" data-back>Explorer</a><span aria-hidden="true">/</span><a href="${M.domainHref(g.domain)}">${t(g.domain)}</a></nav>
        <label class="ex-guide-switch"><span class="sr-only">Changer de guide</span><select data-guide-select>${guides.map(o => `<option value="${o.id}"${o.id === g.id ? ' selected' : ''}>${t(o.short)}</option>`).join('')}</select>${icon('chevron-down')}</label>
        <h1 id="ex-guide-title" tabindex="-1">${t(g.title)}</h1>
        <p class="ex-guide-lead">Synthèse de ${plural(g.items.length, 'parcours documenté', 'parcours documentés')} par ${plural(g.authors.length, 'membre', 'membres')}${g.repro ? `, reproduits ${plural(g.repro, 'fois', 'fois')} par la communauté` : ''}.${g.last ? ` Dernière reproduction réussie ${t(relativeDay(g.last.date))} avec ${t(fullModel([g.last.tool, g.last.model]))}.` : ''}</p>
        ${g.obsolete.length ? `<p class="ex-guide-warn">${icon('alert')}<span>${g.obsolete.map(c => `« ${t(c.title)} » est signalé comme ne fonctionnant plus avec ${t(c.obsolete.model)} par ${fmt(c.obsolete.count)} membres.`).join(' ')} Vérifiez la version de votre modèle avant de suivre ce parcours. <a href="#parcours-${g.obsolete[0].id}" data-jump="parcours-${g.obsolete[0].id}">Voir le parcours</a></span></p>` : ''}
        <dl class="ex-figures">${figures.map(([value, label]) => `<div><dt>${t(label)}</dt><dd>${t(value)}</dd></div>`).join('')}</dl>
        <div class="ex-guide-actions">
          <a class="btn btn-primary" href="nouvelle-creation.html">Publier mon parcours</a>
          <button class="btn btn-secondary" type="button" data-copy-link>${icon('external')}Copier le lien du guide</button>
          <p class="ex-authors"><span class="ex-avatars" aria-hidden="true">${g.authors.map(name => avatar(name, 28)).join('')}</span>${t(g.authors.length > 2 ? `${g.authors.slice(0, 2).map(firstName).join(', ')} et ${g.authors.length - 2} autres membres` : g.authors.map(firstName).join(' et '))}</p>
        </div>
        ${essentialsHTML(g)}
      </header>
      <nav class="ex-sections" aria-label="Sections du guide"><ul>${order.map(key => `<li><a href="#${key}" data-jump="${key}">${t(SECTIONS[key].label)}</a></li>`).join('')}</ul><span class="ex-read" aria-hidden="true"><i data-read></i></span></nav>
      ${order.map(key => sectionHTML(key, g)).join('')}`;
    V.fixTypography(els.guide);
    document.title = `${g.short} · Explorer · Vysora`;
    updateCompareBar();
    observeGuide();
  }

  /* ------------------------------------------------------------------ */
  /* Navigation entre l'index et les guides                               */
  /* ------------------------------------------------------------------ */

  function showView({ focus = false } = {}) {
    const guide = !!state.guide;
    els.viewIndex.hidden = guide;
    els.viewGuide.hidden = !guide;
    if (guide) {
      renderGuide();
      if (focus) { window.scrollTo({ top: 0 }); $('#ex-guide-title')?.focus({ preventScroll: true }); }
    } else {
      document.title = 'Explorer · Vysora';
      els.input.value = state.q;
      $('[data-clear-query]').hidden = !state.q;
      renderIndex();
      compare.clear();
      updateCompareBar();
      if (focus) window.scrollTo({ top: 0 });
    }
    const active = guide ? els.viewGuide : els.viewIndex;
    if (V.motion.full()) { active.classList.remove('is-entering'); void active.offsetWidth; active.classList.add('is-entering'); }
  }
  function openGuide(id) {
    if (state.guide !== id) { compare.clear(); state.caseIndex = 0; state.frise = 0; }
    state.guide = id;
    writeURL(true);
    showView({ focus: true });
  }
  function backToIndex(changes = {}) {
    state.guide = null;
    Object.assign(state, changes);
    writeURL(true);
    showView({ focus: true });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-guide-link]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); openGuide(link.dataset.guideLink); return; }
    const back = event.target.closest('[data-back]');
    if (back && !event.ctrlKey && !event.metaKey) { event.preventDefault(); backToIndex(); return; }
    const domainLink = event.target.closest('[data-domain-link]');
    if (domainLink && !event.ctrlKey && !event.metaKey) { event.preventDefault(); backToIndex({ domain: domainLink.dataset.domainLink, q: '' }); return; }
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      const target = document.getElementById(jump.dataset.jump);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' });
        history.replaceState(null, '', `${location.pathname}${location.search}#${jump.dataset.jump}`);
        const focusable = target.matches('section') ? $('h2', target) : $('h3', target);
        if (focusable) { focusable.setAttribute('tabindex', '-1'); focusable.focus({ preventScroll: true }); }
      }
      return;
    }
    if (event.target.closest('[data-open-tools]')) { openTools(); return; }
    const copy = event.target.closest('[data-copy]');
    if (copy) { const quote = quoteOf(guideById[state.guide].path[Number(copy.dataset.copyStep)]); copyText(quote ? quote.text : byId[copy.dataset.copy].prompt, copy); return; }
    if (event.target.closest('[data-copy-link]')) { copyLink(); return; }
    const train = event.target.closest('[data-train]');
    if (train) { const g = guideById[state.guide]; state.caseIndex = Math.max(0, g.cases.indexOf(train.dataset.train)); rerenderSection('pratique'); $('#pratique').scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto' }); $('#pratique .ex-case h3')?.setAttribute('tabindex', '-1'); $('#pratique .ex-case h3')?.focus({ preventScroll: true }); return; }
    const pick = event.target.closest('[data-case-pick]');
    if (pick) { state.caseIndex = Number(pick.dataset.casePick); rerenderSection('pratique'); $(`[data-case-pick="${state.caseIndex}"]`)?.focus(); return; }
    const retry = event.target.closest('[data-case-retry]');
    if (retry) { caseState[retry.dataset.caseRetry] = {}; rerenderSection('pratique'); $('#pratique input[type="radio"]')?.focus(); return; }
    const frise = event.target.closest('[data-frise]');
    if (frise) { state.frise = Number(frise.dataset.frise); rerenderSection('methode'); $(`[data-frise="${state.frise}"]`)?.focus(); return; }
    const domain = event.target.closest('[data-domain]');
    if (domain && domain.closest('[data-domains]')) { state.domain = domain.dataset.domain === state.domain ? '' : domain.dataset.domain; writeURL(true); renderIndex(); return; }
    const term = event.target.closest('[data-term]');
    if (term) { event.preventDefault(); state.q = term.dataset.term; els.input.value = state.q; writeURL(true); renderIndex(); $('[data-clear-query]').hidden = false; $('#ex-index-title').scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto' }); return; }
    if (event.target.closest('[data-compare-open]')) { openCompare(); return; }
    if (event.target.closest('[data-compare-clear]')) { compare.clear(); $$('[data-compare-id]').forEach(box => { box.checked = false; box.disabled = false; }); updateCompareBar(); return; }
    if (event.target.closest('[data-close-dialog]')) event.target.closest('dialog').close();
  });

  function rerenderSection(key) {
    const body = $(`[data-body="${key}"]`);
    if (!body) return;
    body.innerHTML = SECTION_BODY[key](guideById[state.guide]);
    V.fixTypography(body);
    if (key === 'methode') observeGuide();
  }

  document.addEventListener('change', event => {
    const select = event.target.closest('[data-guide-select]');
    if (select) { openGuide(select.value); return; }
    const sort = event.target.closest('[data-index-sort]');
    if (sort) { state.sort = sort.value; writeURL(true); renderIndex(); return; }
    const runSort = event.target.closest('[data-run-sort]');
    if (runSort) { state.runSort = runSort.value; rerenderSection('parcours'); $('[data-run-sort]').focus(); return; }
    const box = event.target.closest('[data-compare-id]');
    if (box) {
      if (box.checked) compare.add(box.dataset.compareId); else compare.delete(box.dataset.compareId);
      updateCompareBar();
      return;
    }
    const radio = event.target.closest('.ex-case-form input[type="radio"]');
    if (radio) {
      const form = radio.closest('[data-case-form]');
      caseState[form.dataset.caseForm] = { ...(caseState[form.dataset.caseForm] || {}), choice: Number(radio.value) };
      const error = $('[data-case-error]', form);
      if (error) error.hidden = true;
    }
  });

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-case-form]');
    if (!form) return;
    event.preventDefault();
    const picked = $('input[type="radio"]:checked', form);
    if (!picked) { $('[data-case-error]', form).hidden = false; $('input[type="radio"]', form).focus(); return; }
    const answer = { choice: Number(picked.value), locked: true };
    if (V.etats.peut('contribuer')) { reponses[form.dataset.caseForm] = answer; store.set('vysora-cas-reponses', reponses); delete caseState[form.dataset.caseForm]; }
    else caseState[form.dataset.caseForm] = answer;
    rerenderSection('pratique');
    $('#pratique [data-feedback]')?.focus();
  });

  document.addEventListener('keydown', event => {
    const caseBox = event.target.closest?.('.ex-case');
    if (caseBox && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const k = ['a', 'b', 'c', 'd', 'e'].indexOf(event.key.toLowerCase());
      const radios = $$('input[type="radio"]:not(:disabled)', caseBox);
      if (k >= 0 && radios[k] && !event.target.matches('input[type="search"], textarea')) {
        event.preventDefault();
        radios[k].checked = true;
        radios[k].focus();
        radios[k].dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
    const tab = event.target.closest?.('[data-frise]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const count = guideById[state.guide].path.length;
      const i = Number(tab.dataset.frise);
      state.frise = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
      rerenderSection('methode');
      $(`[data-frise="${state.frise}"]`)?.focus();
      return;
    }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable="true"]')) {
      event.preventDefault();
      if (state.guide) backToIndex();
      els.input.focus();
      els.input.select();
    }
  });

  window.addEventListener('popstate', () => { readURL(); showView({ focus: false }); });

  /* ------------------------------------------------------------------ */
  /* Recherche d'objectif                                                 */
  /* ------------------------------------------------------------------ */

  let typingTimer;
  els.input.addEventListener('input', () => {
    $('[data-clear-query]').hidden = !els.input.value;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { state.q = els.input.value.trim(); writeURL(false); renderIndex(); }, 120);
  });
  $('[data-search]').addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(typingTimer);
    state.q = els.input.value.trim();
    renderIndex();
    const first = $('[data-guide-link]', els.guides);
    writeURL(false);
    if (state.q && first) openGuide(first.dataset.guideLink);
    else { writeURL(true); $('#ex-index-title').scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto' }); }
  });
  $('[data-clear-query]').addEventListener('click', () => { els.input.value = ''; state.q = ''; $('[data-clear-query]').hidden = true; writeURL(true); renderIndex(); els.input.focus(); });
  $('[data-often]').innerHTML = X.frequent.map(term => `<a href="explorer.html?q=${encodeURIComponent(term)}" data-term="${esc(term)}">${t(term)}</a>`).join('');

  /* ------------------------------------------------------------------ */
  /* Copier                                                               */
  /* ------------------------------------------------------------------ */

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const label = $('span', button);
      const before = label.textContent;
      label.textContent = 'Prompt copié';
      button.classList.add('is-done');
      toast('Prompt copié.');
      setTimeout(() => { label.textContent = before; button.classList.remove('is-done'); }, 2400);
    } catch {
      toast('Copie impossible : sélectionnez le texte du prompt pour le copier.', 'alert');
    }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href.split('#')[0]); toast('Lien du guide copié.'); } catch { toast('Copie impossible : copiez l’adresse depuis la barre du navigateur.', 'alert'); }
  }

  /* ------------------------------------------------------------------ */
  /* Comparaison de parcours                                              */
  /* ------------------------------------------------------------------ */

  const compareBar = $('[data-compare-bar]');
  function updateCompareBar() {
    const n = compare.size;
    compareBar.hidden = n === 0 || !state.guide;
    $('[data-compare-text]').textContent = n ? `${plural(n, 'parcours sélectionné', 'parcours sélectionnés')}${n < 2 ? ' : choisissez-en un autre' : ''}` : '';
    $('[data-compare-open]').disabled = n < 2;
    $$('[data-compare-id]').forEach(box => { box.disabled = !box.checked && n >= 3; });
  }
  function openCompare() {
    const items = [...compare].map(id => byId[id]);
    const rows = [
      ['Type', c => `${typeTag(c.type)}`],
      ['Auteur', c => `<span class="ex-cmp-who">${avatar(c.author, 24)}${t(c.author)}${c.level ? ` <small>· ${t(c.level)}</small>` : ''}</span>`],
      ['Outils', c => toolsLine(c.tools)],
      ['Objectif de l’auteur', c => t(c.objective)],
      ['Déroulé', c => c.type === 'projet' ? `<ol>${c.steps.map(s => `<li>${t(s)}</li>`).join('')}</ol>` : `<p>${t(runShape(c))}</p>${c.prompt ? `<blockquote>${t(c.prompt)}</blockquote>` : ''}`],
      ['Moments clés', c => c.moments.length ? `<ul>${c.moments.map(m => `<li><b>${t(m.type)} :</b> ${t(m.text)}</li>`).join('')}</ul>` : '<span class="ex-muted">Aucun</span>'],
      ['Preuve', c => `${proofHTML(c)}${c.last ? `<span class="ex-fresh">Dernier succès ${t(relativeDay(c.last.date))} avec ${t(fullModel([c.last.tool, c.last.model]))}</span>` : ''}`],
      ['Votes « Utile »', c => fmt(c.useful)]
    ];
    $('[data-compare-body]').innerHTML = `<div class="ex-table-wrap"><table class="ex-cmp"><caption class="sr-only">Comparaison de ${items.length} parcours</caption>
      <thead><tr><td></td>${items.map(c => `<th scope="col"><span class="ex-cmp-media">${mediaHTML(c.media, '200px')}</span><a href="${c.href}">${t(c.title)}</a></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, cell]) => `<tr><th scope="row">${t(label)}</th>${items.map(c => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    V.fixTypography($('[data-compare-body]'));
    $('[data-compare-dialog]').showModal();
  }
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(''); }));

  /* ------------------------------------------------------------------ */
  /* Mes outils                                                           */
  /* ------------------------------------------------------------------ */

  const openTools = M.initToolsDialog(() => { if (state.guide) rerenderSection('outils'); else renderIndex(); });

  /* ------------------------------------------------------------------ */
  /* Défilement : chemin et sections                                      */
  /* ------------------------------------------------------------------ */

  let stepObserver;
  let sectionObserver;
  function observeGuide() {
    stepObserver?.disconnect();
    sectionObserver?.disconnect();
    const path = $('[data-path]');
    if (path) {
      const steps = $$('.ex-step', path);
      const update = () => {
        const reached = steps.filter(step => step.classList.contains('is-reached')).length;
        path.style.setProperty('--fill', steps.length > 1 ? Math.max(0, (reached - 1) / (steps.length - 1)).toFixed(3) : '1');
      };
      if (!V.motion.full() || !('IntersectionObserver' in window)) steps.forEach(step => step.classList.add('is-reached'));
      else {
        stepObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-reached'); });
          update();
        }, { rootMargin: '0px 0px -45% 0px' });
        steps.forEach(step => stepObserver.observe(step));
      }
      update();
    }
    const links = $$('.ex-sections a');
    sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => { if (link.dataset.jump === entry.target.id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('[data-section]').forEach(section => sectionObserver.observe(section));
  }

  /* ------------------------------------------------------------------ */
  /* Réglages et démarrage                                                */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Aperçus défilants, demandes, liste de contrôle, signalements         */
  /* ------------------------------------------------------------------ */

  const heroCard = $('[data-hero-card]');
  heroCard.addEventListener('mouseenter', () => { hero.hover = true; });
  heroCard.addEventListener('mouseleave', () => { hero.hover = false; });
  heroCard.addEventListener('focusin', () => { hero.hover = true; });
  heroCard.addEventListener('focusout', event => { if (!heroCard.contains(event.relatedTarget)) hero.hover = false; });

  document.addEventListener('click', event => {
    const dot = event.target.closest('[data-hero]');
    if (dot) { hero.index = Number(dot.dataset.hero); showHero(heroGuides[hero.index].id); scheduleHero(); return; }
    const pause = event.target.closest('[data-hero-pause]');
    if (pause) { hero.paused = !hero.paused; pause.setAttribute('aria-label', pauseLabel()); pause.innerHTML = icon(hero.paused ? 'play' : 'pause'); scheduleHero(); return; }
    const want = event.target.closest('[data-want]');
    if (want) {
      if (!V.exiger('contribuer', 'indiquer que vous cherchez ce parcours')) return;
      const query = want.dataset.want;
      if (wanted.has(query)) wanted.delete(query); else { wanted.add(query); toast('Votre intérêt est compté : les auteurs voient ce que la communauté attend.'); }
      store.set('vysora-demandes', [...wanted]);
      renderRequests();
      $(`[data-want="${CSS.escape(query)}"]`)?.focus();
      return;
    }
    if (event.target.closest('[data-check-copy]')) {
      const button = event.target.closest('[data-check-copy]');
      navigator.clipboard.writeText(checklistText(guideById[state.guide])).then(() => {
        $('span', button).textContent = 'Liste copiée';
        toast('Liste de contrôle copiée.');
        setTimeout(() => { $('span', button).textContent = 'Copier la liste'; }, 2400);
      }).catch(() => toast('Copie impossible depuis ce navigateur.', 'alert'));
      return;
    }
    if (event.target.closest('[data-check-reset]')) { checks[state.guide] = []; store.set('vysora-listes', checks); rerenderSection('methode'); $('[data-check]')?.focus(); return; }
    if (event.target.closest('[data-propose]') && V.exiger('contribuer', 'signaler un piège')) openPropose();
  });

  document.addEventListener('change', event => {
    const box = event.target.closest('[data-check]');
    if (!box) return;
    const g = guideById[state.guide];
    const done = checkedOf(g);
    if (box.checked) done.add(box.dataset.check); else done.delete(box.dataset.check);
    checks[g.id] = [...done];
    store.set('vysora-listes', checks);
    const key = box.dataset.check;
    const aside = box.closest('.ex-checklist');
    aside.outerHTML = checklistHTML(g);
    V.fixTypography($('.ex-checklist'));
    $(`[data-check="${key}"]`)?.focus();
    if (key.startsWith('s')) $(`.ex-step[data-step="${key.slice(1)}"]`)?.classList.toggle('is-done', done.has(key));
  });

  const proposeDialog = $('[data-propose-dialog]');
  const proposeForm = $('[data-propose-form]');
  function openPropose() {
    const g = guideById[state.guide];
    proposeForm.reset();
    $$('.ex-error', proposeForm).forEach(el => { el.hidden = true; });
    $$('[aria-invalid]', proposeForm).forEach(el => el.removeAttribute('aria-invalid'));
    $('[data-propose-steps]').innerHTML = `<option value="">Plusieurs étapes ou je ne sais pas</option>${g.path.map((step, i) => `<option value="${i}">${i + 1}. ${t(step.title)}</option>`).join('')}`;
    $('[data-propose-guide]').textContent = g.short;
    proposeDialog.showModal();
    $('#pp-title').focus();
  }
  proposeForm.addEventListener('submit', event => {
    event.preventDefault();
    const title = proposeForm.elements.title.value.trim();
    const error = $('#pp-title-error');
    if (title.length < 15) {
      error.hidden = false;
      proposeForm.elements.title.setAttribute('aria-invalid', 'true');
      proposeForm.elements.title.focus();
      return;
    }
    const g = guideById[state.guide];
    const entry = { title: title.replace(/[.\s]+$/, ''), fix: proposeForm.elements.fix.value.trim(), tool: proposeForm.elements.tool.value.trim(), step: proposeForm.elements.step.value === '' ? '' : Number(proposeForm.elements.step.value), date: D.today };
    proposals[g.id] = [entry, ...proposalsOf(g)];
    store.set('vysora-pieges-proposes', proposals);
    proposeDialog.close();
    rerenderSection('pieges');
    toast('Merci : votre signalement sera relu avant d’apparaître dans le guide.');
    $('#pieges .ex-pit.is-pending h3')?.setAttribute('tabindex', '-1');
    $('#pieges .ex-pit.is-pending h3')?.focus();
  });
  proposeForm.elements.title.addEventListener('input', () => {
    if (proposeForm.elements.title.value.trim().length >= 15) { $('#pp-title-error').hidden = true; proposeForm.elements.title.removeAttribute('aria-invalid'); }
  });

  let readTicking = false;
  const updateRead = () => {
    readTicking = false;
    const bar = $('[data-read]');
    if (!bar || !state.guide) return;
    const rect = els.guide.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    bar.style.setProperty('--p', `${Math.max(0, Math.min(1, -rect.top / (total || 1))) * 100}%`);
  };
  window.addEventListener('scroll', () => { if (!readTicking) { readTicking = true; requestAnimationFrame(updateRead); } }, { passive: true });

  V.initHeader();
  V.initTweaks({
    key: 'vysora-explorer-reglages-v2',
    apparence: [
      { name: 'apercu', legend: 'Aperçu du héros', options: [['recherche', 'Suit la recherche'], ['defilant', 'Défilant'], ['aucun', 'Masqué']] },
      { name: 'index', legend: 'Index des guides', options: [['detail', 'Détaillé'], ['compact', 'Compact']] },
      { name: 'trace', legend: 'Méthode du guide', options: [['chemin', 'Chemin'], ['frise', 'Frise']] },
      { name: 'order', legend: 'Ordre du guide', options: [['methode', 'Méthode d’abord'], ['pieges', 'Pièges d’abord'], ['parcours', 'Parcours d’abord']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { apercu: 'recherche', index: 'detail', trace: 'chemin', order: 'methode' },
    onChange: changed => {
      if (changed === 'init') return;
      if (state.guide && ['trace', 'order', 'reset', 'motion'].includes(changed)) renderGuide();
      if (['motion', 'reset', 'apercu'].includes(changed)) { renderHeroCard(); scheduleHero(); }
    }
  });
  V.fixTypography($('.ex-hero'));
  V.fixTypography($('.ex-requests'));
  renderRequests();
  V.etats.on(() => {
    renderRequests();
    if (state.guide) ['pratique', 'pieges', 'methode'].forEach(rerenderSection);
  });
  renderHeroCard();
  scheduleHero();
  setInterval(rotatePlaceholder, 4200);
  readURL();
  showView();
  if (state.guide && location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
})();
