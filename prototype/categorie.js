'use strict';

/* Page Domaine : les guides, les pièges récurrents, les outils et tous les parcours d'un domaine. */

(() => {
  const V = window.Vysora;
  const X = window.VYSORA_EXPLORER;
  const M = window.VysoraGuides;
  const { $, $$, fmt, esc, t, plural, icon, store, logo, avatar, typeTag, mediaHTML, toast, relativeDay } = V;
  const { DOMAIN_ICON, KINDS, LEVELS, fullModel, firstName, toolsLine, creations, casesById, topicsById, guides, guideById, isMine, myToolsHTML, guideRowHTML, traceHTML, runShape, proofHTML, shareHTML } = M;

  const DEFAULT = 'image-et-illustration';
  const PAGE = 9;
  const state = { slug: DEFAULT, type: 'tous', sort: 'reproduits', mine: false, shown: PAGE, pits: false };
  let settings = {};

  function readURL() {
    const p = new URLSearchParams(location.search);
    const found = M.findDomain(p.get('domaine') || p.get('categorie') || '');
    state.slug = found ? found.slug : DEFAULT;
  }

  /* ------------------------------------------------------------------ */
  /* Données du domaine                                                   */
  /* ------------------------------------------------------------------ */

  function modelsOf(items) {
    const map = new Map();
    const touch = (pair, c, kind) => {
      const key = fullModel(pair);
      if (!map.has(key)) map.set(key, { key, tool: pair[0], used: new Set(), tested: new Set(), last: '' });
      map.get(key)[kind].add(c.id);
    };
    items.forEach(c => {
      c.tools.forEach(pair => touch(pair, c, 'used'));
      (c.tested || []).forEach(pair => touch(pair, c, 'tested'));
      if (c.last) {
        const entry = map.get(fullModel([c.last.tool, c.last.model]));
        if (entry && c.last.date > entry.last) entry.last = c.last.date;
      }
    });
    return [...map.values()]
      .map(m => ({ ...m, reach: new Set([...m.used, ...m.tested]).size }))
      .sort((a, b) => b.reach - a.reach || b.tested.size - a.tested.size || b.last.localeCompare(a.last));
  }

  function domainData(slug) {
    const d = M.DOMAIN_BY_SLUG[slug];
    const own = guides.filter(g => g.domain === d.name);
    const linked = guides.filter(g => g.domain !== d.name && g.items.some(c => c.domain === d.name));
    const all = [...own, ...linked];
    const items = creations.filter(c => c.domain === d.name);
    const reproducible = items.filter(c => c.type !== 'projet');
    const repro = reproducible.reduce((sum, c) => sum + (c.repro || 0), 0);
    const succ = reproducible.reduce((sum, c) => sum + c.successCount, 0);
    const pits = all.flatMap(g => g.pitfalls.map((p, k) => ({ ...p, guide: g, rank: k, share: p.sources.length / g.items.length })))
      .sort((a, b) => b.share - a.share || b.sources.length - a.sources.length);
    const caseIds = new Set(all.flatMap(g => g.cases));
    const cases = X.cases.filter(c => c.domain === d.name || caseIds.has(c.id)).map(c => casesById[c.id]);
    const topicIds = new Set(all.flatMap(g => g.topics));
    const topics = X.topics.filter(s => s.domain === d.name || topicIds.has(s.id)).sort((a, b) => b.date.localeCompare(a.date));
    return {
      d, own, linked, all, items, repro, pits, cases, topics,
      rate: repro >= 3 ? Math.round(succ / repro * 100) : null,
      authors: [...new Set(items.map(c => c.author))],
      models: modelsOf(items),
      requests: X.requests.filter(r => r.domain === d.name),
      gaps: own.flatMap(g => g.gaps.map(text => ({ text, guide: g })))
    };
  }
  let data = domainData(DEFAULT);

  const guideOfCase = id => guides.find(g => g.cases.includes(id));
  const wanted = new Set((store.get('vysora-demandes', []) || []).filter(q => typeof q === 'string'));

  /* ------------------------------------------------------------------ */
  /* Navigation entre domaines                                            */
  /* ------------------------------------------------------------------ */

  const countOf = d => creations.filter(c => c.domain === d.name).length;
  function renderNav() {
    const item = d => `<a href="categorie.html?domaine=${d.slug}" data-domain="${d.slug}"${d.slug === state.slug ? ' aria-current="page"' : ''}>${icon(d.icon)}<span>${t(d.name)}</span><small>${countOf(d)}</small></a>`;
    $('[data-dm-nav]').innerHTML = X.domains.map(d => `<li>${item(d)}</li>`).join('');
    $('[data-dm-rail]').innerHTML = X.domains.map(d => `<li>${item(d)}</li>`).join('');
    const current = $('[data-dm-rail] [aria-current="page"]');
    if (current) current.parentElement.parentElement.scrollLeft = current.parentElement.offsetLeft - 16;
  }

  /* ------------------------------------------------------------------ */
  /* En-tête                                                              */
  /* ------------------------------------------------------------------ */

  function renderHead() {
    const { d, all, items, repro, rate, authors } = data;
    document.title = `${d.name} · Explorer · Vysora`;
    $('[data-dm-crumb]').textContent = t(d.name);
    $('[data-dm-kicker]').innerHTML = `${icon(d.icon, '')}Domaine`;
    $('[data-dm-title]').textContent = t(d.name);
    $('[data-dm-lead]').textContent = t(d.description);
    const figures = [
      [all.length, all.length > 1 ? 'guides par objectif' : 'guide par objectif'],
      [items.length, items.length > 1 ? 'parcours documentés' : 'parcours documenté'],
      [repro, repro > 1 ? 'reproductions déclarées' : 'reproduction déclarée'],
      rate !== null ? [`${rate} %`, 'de reproductions réussies'] : [authors.length, authors.length > 1 ? 'membres contributeurs' : 'membre contributeur']
    ];
    $('[data-dm-figures]').innerHTML = figures.map(([value, label]) => `<div><dt>${t(label)}</dt><dd>${typeof value === 'number' ? fmt(value) : t(value)}</dd></div>`).join('');
    $('[data-mytools]').innerHTML = myToolsHTML(true);

    const picks = [...items].sort((a, b) => (b.media.kind === 'image') - (a.media.kind === 'image') || b.useful - a.useful).slice(0, 4);
    const mosaic = $('[data-dm-mosaic]');
    mosaic.dataset.count = picks.length;
    mosaic.innerHTML = picks.length ? `<ul>${picks.map((c, i) => `<li style="--i:${i}"><a class="dm-tile" href="${c.href}"><span class="dm-tile-media">${mediaHTML(c.media, i === 0 ? '(min-width: 1180px) 420px, 60vw' : '(min-width: 1180px) 220px, 32vw', i < 2)}</span><span class="dm-tile-cap"><b>${t(c.title)}</b><span>${t(firstName(c.author))} · ${t(fullModel(c.tools[0]))}</span></span></a></li>`).join('')}</ul>` : '';
  }

  /* ------------------------------------------------------------------ */
  /* Sections                                                             */
  /* ------------------------------------------------------------------ */

  const SECTIONS = {
    guides: { label: 'Guides', kicker: ['route', 'Guides'] },
    pieges: { label: 'Pièges', kicker: ['moment', 'Pièges'] },
    outils: { label: 'Outils', kicker: ['wrench', 'Outils'] },
    parcours: { label: 'Parcours', kicker: ['layers', 'Parcours'] },
    pratique: { label: 'S’entraîner', kicker: ['bulb', 'S’entraîner'] },
    manque: { label: 'À documenter', kicker: ['flag', 'À documenter'] }
  };
  const ORDERS = {
    guides: ['guides', 'pieges', 'outils', 'parcours', 'pratique', 'manque'],
    parcours: ['parcours', 'guides', 'pieges', 'outils', 'pratique', 'manque'],
    outils: ['outils', 'guides', 'pieges', 'parcours', 'pratique', 'manque']
  };
  const order = () => ORDERS[settings.order] || ORDERS.guides;

  function guidesHTML() {
    const { d, own, linked } = data;
    const rows = list => `<ol class="ex-guides">${list.map((g, i) => guideRowHTML(g, [], i)).join('')}</ol>`;
    return `<h2 tabindex="-1">${own.length ? 'Les guides de ce domaine' : 'Les guides qui abordent ce domaine'}</h2>
      <p class="ex-section-intro">Chaque guide rassemble les parcours d’un même objectif : la méthode qui ressort, les pièges à anticiper et les outils déjà testés.</p>
      <div class="ex-section-body">
        ${own.length ? rows(own) : ''}
        ${linked.length ? `${own.length ? `<h3 class="dm-sub">Ce domaine compte aussi dans ${linked.length > 1 ? 'ces guides' : 'ce guide'}</h3>` : ''}${rows(linked)}` : ''}
        ${!own.length && !linked.length ? `<p class="ex-empty-note">Aucun guide pour ${t(d.name.toLowerCase())} pour l’instant. Le premier parcours publié ouvre le guide.</p>` : ''}
      </div>`;
  }

  function pitsHTML() {
    const { pits } = data;
    if (!pits.length) return `<h2 tabindex="-1">Ce qui revient dans tout le domaine</h2><div class="ex-section-body"><p class="ex-empty-note">Aucun piège signalé pour l’instant.</p></div>`;
    const visible = state.pits ? pits : pits.slice(0, 4);
    return `<h2 tabindex="-1">Ce qui revient dans tout le domaine</h2>
      <p class="ex-section-intro">Les pièges signalés dans les guides du domaine, du plus fréquent au plus rare, avec ce qui a permis de les dépasser.</p>
      <div class="ex-section-body">
        <ol class="ex-pits dm-pits">${visible.map((p, i) => {
          const topic = p.topic && topicsById[p.topic];
          return `<li class="ex-pit${i >= 4 ? ' xp-enter' : ''}" style="--i:${i - 4}">
            <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.title)}</h3></div>
            ${shareHTML(p.sources.length, p.guide.items.length)}
            <p class="ex-fix"><b>Ce qui a fonctionné :</b> ${t(p.fix)}</p>
            <p class="ex-pit-more"><a class="link-btn" href="${p.guide.href}#piege-${p.rank + 1}">${icon('route')}Guide « ${t(p.guide.short)} »</a>${topic ? `<a class="link-btn" href="forum.html?sujet=${topic.id}">${icon('message')}Lire la discussion</a>` : ''}</p>
          </li>`;
        }).join('')}</ol>
        ${pits.length > 4 ? `<button class="btn btn-secondary btn-sm dm-more" type="button" data-more-pits aria-expanded="${state.pits}">${state.pits ? 'Afficher les pièges les plus fréquents' : `Afficher ${plural(pits.length - 4, 'autre piège', 'autres pièges')}`}</button>` : ''}
      </div>`;
  }

  function toolsSectionHTML() {
    const { models, items } = data;
    const max = Math.max(1, ...models.map(m => m.reach));
    return `<h2 tabindex="-1">Les outils qui ont fait leurs preuves</h2>
      <p class="ex-section-intro">Pour chaque outil : les parcours du domaine qui l’emploient et ceux que d’autres membres ont reproduits avec succès grâce à lui.</p>
      <div class="ex-section-body">
        <ol class="dm-tools">${models.map((m, i) => {
          const mine = isMine(m.tool);
          const usedW = (m.used.size / max * 100).toFixed(1);
          const testedOnly = [...m.tested].filter(id => !m.used.has(id)).length;
          const testedW = (testedOnly / max * 100).toFixed(1);
          return `<li class="dm-tool${mine ? ' is-mine' : ''}">
            <span class="dm-tool-rank" aria-hidden="true">${i + 1}</span>
            <span class="dm-tool-name">${logo(m.tool, 22)}<span>${t(m.key)}</span>${mine ? '<small>Votre outil</small>' : ''}</span>
            <span class="dm-tool-bar" aria-hidden="true"><i class="is-used" style="--w:${usedW}%"></i><i class="is-tested" style="--w:${testedW}%"></i></span>
            <span class="dm-tool-stats">${m.used.size ? `<span>Choisi dans ${plural(m.used.size, 'parcours', 'parcours')}</span>` : ''}${m.tested.size ? `<span>Reproduit avec succès sur ${plural(m.tested.size, 'parcours', 'parcours')}</span>` : ''}${m.last ? `<small>Dernière réussite ${t(relativeDay(m.last))}</small>` : ''}</span>
          </li>`;
        }).join('')}</ol>
        <p class="dm-tools-legend" aria-hidden="true"><span><i class="is-used"></i>Choisi par l’auteur du parcours</span><span><i class="is-tested"></i>Reproduit avec succès par un autre membre</span></p>
        ${items.length ? '' : '<p class="ex-empty-note">Aucun outil documenté pour l’instant.</p>'}
      </div>`;
  }

  const SORTS = {
    reproduits: (a, b) => b.successCount - a.successCount || b.useful - a.useful,
    utiles: (a, b) => b.useful - a.useful,
    recents: (a, b) => b.date.localeCompare(a.date)
  };
  function filteredItems() {
    return data.items
      .filter(c => state.type === 'tous' || c.type === state.type)
      .filter(c => !state.mine || c.tools.some(([tool]) => isMine(tool)) || (c.tested || []).some(([tool]) => isMine(tool)))
      .sort(SORTS[state.sort]);
  }
  function cardHTML(c, i) {
    const g = guideById[c.goal];
    return `<li class="dm-card xp-enter" style="--i:${Math.min(i % PAGE, 8)}">
      <a class="dm-card-media" href="${c.href}" tabindex="-1" aria-hidden="true">${mediaHTML(c.media, '(min-width: 1180px) 300px, (min-width: 760px) 45vw, 92vw')}</a>
      <div class="dm-card-body">
        <p class="ex-run-meta dm-card-meta">${typeTag(c.type)}${g ? `<a href="${g.href}">${t(g.short)}</a>` : ''}</p>
        <h3><a href="${c.href}">${t(c.title)}</a></h3>
        <p class="ex-run-who">${avatar(c.author, 22)}<span>${t(c.author)}${c.level ? ` <small>· ${t(c.level)}</small>` : ''}</span></p>
        <p class="ex-run-tools">${toolsLine(c.tools)}</p>
        <div class="dm-card-foot"><span class="dm-card-shape">${traceHTML(c)}<span>${t(runShape(c))}</span></span>${proofHTML(c)}</div>
        ${c.obsolete ? `<p class="ex-warn">${icon('alert')}Signalé comme ne fonctionnant plus avec ${t(c.obsolete.model)}</p>` : ''}
      </div>
    </li>`;
  }
  function parcoursHTML() {
    const { items } = data;
    const counts = { tous: items.length };
    ['prompt', 'iteration', 'projet'].forEach(type => { counts[type] = items.filter(c => c.type === type).length; });
    const types = [['tous', 'Tous'], ['prompt', '1 prompt'], ['iteration', 'Itération'], ['projet', 'Projet']].filter(([key]) => key === 'tous' || counts[key]);
    const list = filteredItems();
    const hasTools = M.myTools().size > 0;
    return `<h2 tabindex="-1">Tous les parcours du domaine</h2>
      <p class="ex-section-intro">Les créations documentées pas à pas, avec leurs prompts, leurs moments clés et leurs reproductions.</p>
      <div class="ex-section-body">
        <div class="dm-filters">
          <div class="dm-types" role="group" aria-label="Type de parcours">${types.map(([key, label]) => `<button type="button" data-type="${key}" aria-pressed="${state.type === key}">${t(label)}<small>${counts[key]}</small></button>`).join('')}</div>
          <button class="dm-mine" type="button" data-mine aria-pressed="${state.mine && hasTools}">${icon(state.mine && hasTools ? 'check' : 'wrench')}<span>${hasTools ? 'Avec mes outils' : 'Indiquer mes outils'}</span></button>
          <label class="ex-sort"><span>Trier par</span><select data-sort>
            <option value="reproduits"${state.sort === 'reproduits' ? ' selected' : ''}>Les plus reproduits</option>
            <option value="utiles"${state.sort === 'utiles' ? ' selected' : ''}>Les plus utiles</option>
            <option value="recents"${state.sort === 'recents' ? ' selected' : ''}>Les plus récents</option>
          </select>${icon('chevron-down')}</label>
        </div>
        <p class="dm-count" role="status" aria-live="polite">${list.length ? `${plural(list.length, 'parcours affiché', 'parcours affichés')}` : ''}</p>
        ${list.length ? `<ul class="dm-cards">${list.slice(0, state.shown).map(cardHTML).join('')}</ul>` : `<div class="dm-none"><p>Aucun parcours ne correspond à ces critères.</p><button class="link-btn" type="button" data-reset-filters>${icon('replay')}Afficher tous les parcours</button></div>`}
        ${list.length > state.shown ? `<div class="dm-load"><button class="btn btn-secondary" type="button" data-load-more>Afficher ${plural(Math.min(PAGE, list.length - state.shown), 'autre parcours', 'autres parcours')}</button><span>${state.shown} sur ${list.length}</span></div>` : ''}
      </div>`;
  }

  function practiceSectionHTML() {
    const { cases, topics, d } = data;
    return `<h2 tabindex="-1">S’entraîner dans ce domaine</h2>
      <p class="ex-section-intro">Des cas Bon réflexe tirés de situations réelles, et les questions que se pose la communauté.</p>
      <div class="ex-section-body dm-practice">
        <div>
          <h3 class="dm-sub">Cas Bon réflexe</h3>
          ${cases.length ? `<ul class="dm-cases">${cases.map(c => {
            const g = guideOfCase(c.id);
            const href = g ? `${g.href}&cas=${encodeURIComponent(c.id)}#pratique` : `apprendre.html?cas=${encodeURIComponent(c.id)}`;
            return `<li class="dm-case">
              <p class="ex-case-meta"><span class="level" data-level="${c.level}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${LEVELS[c.level]}</span><span>${icon('clock')}${c.minutes} min</span><span>${c.rate} % de bonnes réponses</span></p>
              <h4><a href="${href}">${t(c.title)}</a></h4>
              <p class="dm-case-context">${t(c.context)}</p>
              <span class="dm-case-go" aria-hidden="true">Faire le cas${icon('arrow')}</span>
            </li>`;
          }).join('')}</ul>` : `<p class="ex-empty-note">Aucun cas pour ${t(d.name.toLowerCase())} pour l’instant. <a href="apprendre.html?rubrique=bon-reflexe">Voir tous les cas</a></p>`}
        </div>
        <div class="ex-practice-topics">
          <h3 class="dm-sub">Questions de la communauté</h3>
          ${topics.length ? `<ul>${topics.slice(0, 5).map(s => `<li><p class="ex-topic-kind">${icon(KINDS[s.kind].icon)}${t(KINDS[s.kind].label)}${s.status === 'resolved' ? `<span class="ex-resolved">${icon('check-circle')}Résolu</span>` : s.replies === 0 ? '<span class="ex-open">Sans réponse</span>' : ''}</p><a href="forum.html?sujet=${s.id}">${t(s.title)}</a><p class="ex-topic-meta">${avatar(s.author, 20)}${t(s.author)} · ${plural(s.replies, 'réponse', 'réponses')}</p></li>`).join('')}</ul>` : '<p class="ex-empty-note">Aucune question sur ce domaine pour l’instant.</p>'}
          <a class="btn btn-secondary btn-sm" href="forum.html?nouveau=question">Poser une question</a>
        </div>
      </div>`;
  }

  function missingHTML() {
    const { requests, gaps } = data;
    const mine = query => V.etats.membre() && wanted.has(query);
    const list = requests.map(r => ({ ...r, total: r.count + (mine(r.query) ? 1 : 0) })).sort((a, b) => b.total - a.total);
    return `<h2 tabindex="-1">Ce qui manque encore</h2>
      <p class="ex-section-intro">Les objectifs que la communauté cherche dans ce domaine et les situations que les guides ne couvrent pas encore. Un parcours publié sur l’un d’eux comble le manque.</p>
      <div class="ex-section-body dm-missing">
        <div>
          <h3 class="dm-sub">Objectifs recherchés</h3>
          ${list.length ? `<ol class="ex-requests-list">${list.map(r => {
            const on = mine(r.query);
            return `<li>
              <div class="ex-req-text"><span class="ex-req-query">${t(r.query)}</span><span class="ex-req-count">${plural(r.total, 'personne le cherche', 'personnes le cherchent')} ce mois-ci</span></div>
              <div class="ex-req-actions"><button class="ex-want" type="button" aria-pressed="${on}" data-want="${esc(r.query)}">${icon(on ? 'check' : 'plus')}<span>${on ? 'Vous le cherchez aussi' : 'Je le cherche aussi'}</span></button></div>
            </li>`;
          }).join('')}</ol>` : '<p class="ex-empty-note">Aucun objectif en attente dans ce domaine : chaque demande a déjà son guide.</p>'}
        </div>
        <div>
          <h3 class="dm-sub">À compléter dans les guides</h3>
          ${gaps.length ? `<ul class="dm-gaps">${gaps.map(({ text, guide }) => `<li>${icon('flag')}<span>${t(text)}<a href="${guide.href}#manque">${t(guide.short)}</a></span></li>`).join('')}</ul>` : '<p class="ex-empty-note">Les guides de ce domaine couvrent les cas courants. Un parcours avec un autre outil ou un autre contexte les enrichirait encore.</p>'}
          <a class="btn btn-primary" href="nouvelle-creation.html">Publier un parcours${icon('arrow')}</a>
        </div>
      </div>`;
  }

  function neighboursHTML() {
    const { d } = data;
    const near = M.nearDomains(d.name).map(name => M.DOMAIN_BY_NAME[name]).filter(Boolean);
    const others = X.domains.filter(o => o.name !== d.name && !near.includes(o)).sort((a, b) => countOf(b) - countOf(a));
    const list = [...near, ...others].slice(0, 3);
    return `<div class="ex-related dm-neighbours"><h3>Domaines voisins</h3><ul>${list.map(o => `<li><a href="categorie.html?domaine=${o.slug}" data-domain="${o.slug}"><span class="ex-related-domain">${icon(o.icon)}${plural(countOf(o), 'parcours', 'parcours')}</span><span class="ex-related-title">${t(o.name)}</span><span class="ex-related-meta">${t(o.description)}</span>${icon('arrow')}</a></li>`).join('')}</ul></div>`;
  }

  const RENDER = { guides: guidesHTML, pieges: pitsHTML, outils: toolsSectionHTML, parcours: parcoursHTML, pratique: practiceSectionHTML, manque: missingHTML };
  function sectionHTML(key) {
    const [name, label] = SECTIONS[key].kicker;
    return `<section class="ex-section" id="${key}" data-section="${key}">${M.kicker(name, label)}${RENDER[key]()}</section>`;
  }
  function rerender(key) {
    const section = $(`[data-section="${key}"]`);
    if (!section) return;
    const [name, label] = SECTIONS[key].kicker;
    section.innerHTML = `${M.kicker(name, label)}${RENDER[key]()}`;
    V.fixTypography(section);
  }

  function render() {
    data = domainData(state.slug);
    renderNav();
    renderHead();
    $('[data-dm-toc]').innerHTML = order().map(key => `<li><a href="#${key}" data-jump="${key}">${t(SECTIONS[key].label)}</a></li>`).join('');
    $('[data-dm-sections]').innerHTML = order().map(sectionHTML).join('') + neighboursHTML();
    V.fixTypography($('.dm-page'));
    observeSections();
  }

  /* ------------------------------------------------------------------ */
  /* Sections actives                                                     */
  /* ------------------------------------------------------------------ */

  let observer;
  function observeSections() {
    observer?.disconnect();
    const links = $$('[data-dm-toc] a');
    const setActive = key => links.forEach(a => (a.dataset.jump === key ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('[data-section]').forEach(section => observer.observe(section));
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                         */
  /* ------------------------------------------------------------------ */

  function goDomain(slug) {
    if (slug === state.slug) return;
    state.slug = slug;
    Object.assign(state, { type: 'tous', mine: false, shown: PAGE, pits: false });
    history.pushState(null, '', `categorie.html?domaine=${slug}`);
    render();
    window.scrollTo({ top: 0 });
    $('[data-dm-title]').focus({ preventScroll: true });
    const page = $('.dm-page');
    if (V.motion.full()) { page.classList.remove('is-entering'); void page.offsetWidth; page.classList.add('is-entering'); }
  }

  const openTools = M.initToolsDialog(() => {
    $('[data-mytools]').innerHTML = myToolsHTML(true);
    if (!M.myTools().size) state.mine = false;
    ['guides', 'outils', 'parcours'].forEach(rerender);
  });

  document.addEventListener('click', event => {
    const domainLink = event.target.closest('[data-domain]');
    if (domainLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      goDomain(domainLink.dataset.domain);
      return;
    }
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      const target = document.getElementById(jump.dataset.jump);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' });
        $('h2', target)?.focus({ preventScroll: true });
        history.replaceState(null, '', `#${jump.dataset.jump}`);
      }
      return;
    }
    if (event.target.closest('[data-open-tools]')) { openTools(); return; }
    const type = event.target.closest('[data-type]');
    if (type) { state.type = type.dataset.type; state.shown = PAGE; rerender('parcours'); $(`[data-type="${type.dataset.type}"]`)?.focus(); return; }
    if (event.target.closest('[data-mine]')) {
      if (!M.myTools().size) { openTools(); return; }
      state.mine = !state.mine; state.shown = PAGE; rerender('parcours'); $('[data-mine]')?.focus(); return;
    }
    if (event.target.closest('[data-reset-filters]')) { Object.assign(state, { type: 'tous', mine: false, shown: PAGE }); rerender('parcours'); $('[data-type="tous"]')?.focus(); return; }
    if (event.target.closest('[data-load-more]')) {
      const before = state.shown;
      state.shown += PAGE;
      rerender('parcours');
      $$('.dm-card h3 a')[before]?.focus();
      return;
    }
    if (event.target.closest('[data-more-pits]')) {
      state.pits = !state.pits;
      rerender('pieges');
      $('[data-more-pits]')?.focus();
      return;
    }
    const want = event.target.closest('[data-want]');
    if (want) {
      if (!V.exiger('contribuer', 'indiquer que vous cherchez ce parcours')) return;
      const query = want.dataset.want;
      if (wanted.has(query)) wanted.delete(query); else { wanted.add(query); toast('Votre intérêt est compté : les auteurs voient ce que la communauté attend.'); }
      store.set('vysora-demandes', [...wanted]);
      rerender('manque');
      $(`[data-want="${CSS.escape(query)}"]`)?.focus();
    }
  });

  document.addEventListener('change', event => {
    if (event.target.matches('[data-sort]')) { state.sort = event.target.value; state.shown = PAGE; rerender('parcours'); $('[data-sort]').focus(); }
  });

  window.addEventListener('popstate', () => { readURL(); render(); });

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */

  V.initHeader();
  readURL();
  settings = V.initTweaks({
    key: 'vysora-domaine-reglages',
    apparence: [
      { name: 'gallery', legend: 'Parcours du domaine', options: [['grille', 'Grille'], ['liste', 'Liste']] },
      { name: 'mosaic', legend: 'En-tête', options: [['images', 'Avec créations'], ['sobre', 'Sobre']] },
      { name: 'order', legend: 'Ordre des sections', options: [['guides', 'Guides d’abord'], ['parcours', 'Parcours d’abord'], ['outils', 'Outils d’abord']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { gallery: 'grille', mosaic: 'images', order: 'guides' },
    onChange: changed => { if (changed === 'order' || changed === 'reset') render(); }
  });
  render();
  V.etats.on(() => rerender('manque'));
  if (location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
})();
