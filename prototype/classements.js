'use strict';

/* Classements : palmarès de la semaine par contribution, classement des membres et fiche membre.
   Adresse : ?semaine=41, ?outil=Claude, ?classement=general, ?niveau=apprentis, ?membre=Nom */

(() => {
  const V = window.Vysora;
  const C = window.VYSORA_CLASSEMENTS;
  const X = window.VYSORA_EXPLORER;
  if (!V || !C || !X) return;
  const { D, $, $$, esc, t, typo, fmt, plural, icon, logo, mediaHTML, mockHTML, typeTag, dateLabel, toast, root } = V;
  const avatar = (name, size = 28) => V.avatar(name, size).replace(/^<(img|span) /, `<$1 style="width:${size}px;height:${size}px" `);

  /* ------------------------------------------------------------------ */
  /* Modèle                                                               */
  /* ------------------------------------------------------------------ */

  const YOU = 'Vous';
  const LEVELS = [
    { name: 'Curieux', plural: 'Curieux', key: 'curieux', min: 0 },
    { name: 'Apprenti', plural: 'Apprentis', key: 'apprentis', min: 50 },
    { name: 'Artisan', plural: 'Artisans', key: 'artisans', min: 300 },
    { name: 'Expert', plural: 'Experts', key: 'experts', min: 1500 },
    { name: 'Maître', plural: 'Maîtres', key: 'maitres', min: 5000 }
  ];
  const levelOf = pts => [...LEVELS].reverse().find(l => pts >= l.min);
  const nextLevel = pts => LEVELS.find(l => l.min > pts);

  const CATS = {
    reussites: { label: 'Méthodes réussies', icon: 'repeat', title: 'Méthodes réussies par d’autres', rule: 'Reproductions réussies déclarées par d’autres membres sur une création « 1 prompt » ou « Itération ». Chaque membre compte une fois par création.', cta: ['explorer.html', 'Reproduire une création'] },
    entraide: { label: 'Entraide', icon: 'reply', title: 'Réponses qui ont débloqué un membre', rule: 'Réponses acceptées par l’auteur de la question dans le Forum, puis votes « Utile » reçus sur ces réponses.', cta: ['forum.html?onglet=sans-reponse', 'Répondre à une question'] },
    utiles: { label: 'Créations utiles', icon: 'utile', title: 'Créations jugées utiles', rule: 'Votes « Utile » reçus sur une création, tous types confondus. Un projet documenté étape par étape y a toute sa place.', cta: ['nouvelle-creation.html', 'Publier une création'] },
    astuces: { label: 'Astuces vérifiées', icon: 'bulb', title: 'Astuces vérifiées par la communauté', rule: 'Votes « Testé, ça marche » reçus sur une astuce du Forum, avec l’outil et le modèle de chaque vérification.', cta: ['forum.html?nouveau=astuce', 'Partager une astuce'] },
    defi: { label: 'Défi', icon: 'podium' },
    progres: { label: 'Progression', icon: 'trend-up' }
  };
  const ORDER = ['reussites', 'entraide', 'utiles', 'astuces'];

  const CREATIONS = Object.fromEntries(X.creations.map(c => [c.id, c]));
  const BADGES = Object.fromEntries([...D.badges, ...C.badges].map(b => [b.name, b]));
  const WEEKS = C.weeks;
  const weekById = id => WEEKS.find(w => w.id === id);
  const MEMBERS = Object.keys(C.members);
  const NOW = new Date(`${C.now}:00Z`);

  const pointsIn = (name, id) => (name === YOU ? C.you.weeks[id]?.pts || 0 : C.members[name].weeks[id] || 0);
  /* Les points du membre connecté suivent son niveau, réglé dans le panneau Tweaks (onglet États). */
  const youTotal = () => V.etats.niveau().points;
  const totalOf = name => (name === YOU ? youTotal() : C.members[name].total);
  /* Réputation à la fin d'une semaine : total actuel moins les semaines suivantes. */
  const totalAtEnd = (name, id) => totalOf(name) - WEEKS.filter(w => w.id > id).reduce((s, w) => s + pointsIn(name, w.id), 0);

  const toolsOfCreation = c => (c ? c.tools.map(([tool]) => tool) : []);
  const pairText = (tool, model) => (model ? `${tool} ${model}` : tool);
  const toolsOfEntry = (key, e) => {
    if (key === 'reussites' || key === 'utiles') return toolsOfCreation(CREATIONS[e.c]);
    if (key === 'entraide') return [e.q.tool];
    if (key === 'astuces') return [...new Set([e.t.tool, ...e.t.with.map(([tool]) => tool)])];
    return [e.tool];
  };
  const MS = (iso, end = false) => new Date(`${iso}T${end ? '23:59:59' : '00:00:00'}Z`);
  const ordinal = n => (n === 1 ? '1<sup>er</sup>' : `${n}<sup>e</sup>`);
  const ordinalText = n => (n === 1 ? '1er' : `${n}e`);

  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const day = iso => new Date(`${iso}T12:00:00`);
  const longRange = (a, b) => {
    const A = day(a); const B = day(b);
    return A.getMonth() === B.getMonth() ? `du ${A.getDate()} au ${B.getDate()} ${MONTHS[B.getMonth()]} ${B.getFullYear()}` : `du ${A.getDate()} ${MONTHS[A.getMonth()]} au ${B.getDate()} ${MONTHS[B.getMonth()]} ${B.getFullYear()}`;
  };
  const shortRange = (a, b) => {
    const A = day(a); const B = day(b);
    return A.getMonth() === B.getMonth() ? `${A.getDate()}–${B.getDate()} ${dateLabel(b, false).split(/\s/)[1]}` : `${dateLabel(a, false)} – ${dateLabel(b, false)}`;
  };
  const longDay = iso => { const d = day(iso); return `${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const monthYear = iso => { const d = day(iso); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const timeOf = iso => iso.slice(11, 16);

  /* Palmarès d'une semaine, éventuellement limité à un outil. */
  function entries(w, key, tool = state.tool) {
    const list = key === 'defi' ? w.defi.entries : w[key];
    return list.filter(e => !tool || toolsOfEntry(key, e).includes(tool));
  }
  function placements(w, name) {
    const out = [];
    ORDER.forEach(key => { const i = w[key].findIndex(e => e.m === name); if (i >= 0) out.push({ key, rank: i + 1, e: w[key][i] }); });
    const d = w.defi.entries.findIndex(e => e.m === name);
    if (d >= 0) out.push({ key: 'defi', rank: d + 1, e: w.defi.entries[d] });
    return out.sort((a, b) => a.rank - b.rank);
  }
  function pointsFrom(key, e, w) {
    if (key === 'reussites') return e.n * 5;
    if (key === 'utiles') return e.n * 10;
    if (key === 'entraide') return e.n * 15 + e.v * 5;
    if (key === 'astuces') return e.n * 5;
    const i = w.defi.entries.indexOf(e);
    return e.n * 10 + (w.defi.closed ? 5 + ([50, 30, 20][i] || 0) : 0);
  }
  function levelUps(w) {
    const names = state.view === 'membre' ? [...MEMBERS, YOU] : MEMBERS;
    return names.map(name => {
      const end = totalAtEnd(name, w.id);
      const start = end - pointsIn(name, w.id);
      const from = levelOf(Math.max(0, start)); const to = levelOf(end);
      return from.name !== to.name ? { name, from, to, end } : null;
    }).filter(Boolean).sort((a, b) => LEVELS.indexOf(b.to) - LEVELS.indexOf(a.to) || b.end - a.end);
  }
  function ranking(id, by = 'semaine') {
    const names = state.view === 'membre' ? [...MEMBERS, YOU] : MEMBERS;
    const value = name => (by === 'semaine' ? pointsIn(name, id) : totalOf(name));
    const sorted = names.map(name => ({ name, pts: value(name), total: totalOf(name) })).filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name, 'fr'));
    let rank = 0;
    sorted.forEach((r, i) => { if (i === 0 || r.pts !== sorted[i - 1].pts) rank = i + 1; r.rank = rank; });
    return sorted;
  }

  /* ------------------------------------------------------------------ */
  /* État et adresse                                                      */
  /* ------------------------------------------------------------------ */

  const state = { week: 42, tool: '', table: 'semaine', level: '', expanded: false, member: null, view: 'membre' };
  const week = () => weekById(state.week);

  function toolOptions(w) {
    const count = new Map();
    [...ORDER, 'defi'].forEach(key => entries(w, key, '').forEach(e => toolsOfEntry(key, e).forEach(tool => count.set(tool, (count.get(tool) || 0) + 1))));
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  }

  function readURL() {
    const p = new URLSearchParams(location.search);
    const id = Number(p.get('semaine'));
    state.week = weekById(id) ? id : WEEKS[0].id;
    const tool = p.get('outil') || '';
    state.tool = toolOptions(week()).some(([name]) => name === tool) ? tool : '';
    state.table = p.get('classement') === 'general' ? 'general' : 'semaine';
    state.level = LEVELS.some(l => l.key === p.get('niveau')) ? p.get('niveau') : '';
    const member = p.get('membre');
    state.member = member && (C.members[member] || member === YOU) ? member : null;
  }
  function writeURL(push = false) {
    const p = new URLSearchParams();
    if (state.week !== WEEKS[0].id) p.set('semaine', state.week);
    if (state.tool) p.set('outil', state.tool);
    if (state.table === 'general') p.set('classement', 'general');
    if (state.level) p.set('niveau', state.level);
    if (state.member) p.set('membre', state.member);
    const url = `${location.pathname}${p.toString() ? `?${p}` : ''}${location.hash}`;
    if (url === `${location.pathname}${location.search}${location.hash}`) return;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  /* ------------------------------------------------------------------ */
  /* Fragments                                                            */
  /* ------------------------------------------------------------------ */

  const youAvatar = size => `<span class="avatar cl-you-avatar" style="width:${size}px;height:${size}px" aria-hidden="true">${icon('user', '')}</span>`;
  const face = (name, size) => (name === YOU ? youAvatar(size) : avatar(name, size));
  const levelName = name => levelOf(totalOf(name)).name;
  const memberBtn = (name, size = 36, extra = '') => name === YOU
    ? `<span class="cl-who is-you">${youAvatar(size)}<span class="cl-who-text"><b>Vous</b><small>${t(levelName(YOU))}</small></span></span>`
    : `<button class="cl-who" type="button" data-cl-open="${esc(name)}" aria-haspopup="dialog">${avatar(name, size)}<span class="cl-who-text"><b>${t(name)}</b><small>${t(levelName(name))}${extra}</small></span></button>`;
  const toolPair = (tool, model) => `<span class="cl-tool-ref">${logo(tool, 16)}${t(tool)}${model ? ` <span class="cl-model">${t(model)}</span>` : ''}</span>`;
  const creationHref = id => `fiche-creation.html?id=${encodeURIComponent(id)}`;
  const sujetHref = id => `forum.html?sujet=${encodeURIComponent(id)}`;
  const metric = (facts, pts) => `<span class="cl-m-f">${facts}</span><span class="cl-m-p">${pts}</span>`;
  const count = (n, cls = '') => `<b class="cl-num${cls ? ` ${cls}` : ''}" data-cl-count="${n}">${fmt(n)}</b>`;
  const ptsText = n => `<b class="cl-num">+${fmt(n)}</b> points`;

  function factsOf(key, e, big = false) {
    if (key === 'reussites') return big ? `${count(e.n)} ${e.n > 1 ? 'membres ont réussi sa méthode' : 'membre a réussi sa méthode'}` : `${plural(e.n, 'réussite', 'réussites')}`;
    if (key === 'utiles') return big ? `${count(e.n)} votes « Utile »` : `${plural(e.n, 'vote', 'votes')} « Utile »`;
    if (key === 'entraide') return big ? `${count(e.n)} ${e.n > 1 ? 'réponses acceptées' : 'réponse acceptée'}` : `${plural(e.n, 'réponse acceptée', 'réponses acceptées')}`;
    if (key === 'astuces') return big ? `Testée par ${count(e.n)} ${e.n > 1 ? 'membres' : 'membre'}` : `${plural(e.n, 'vérification', 'vérifications')}`;
    return big ? `${count(e.n)} votes « Utile »` : `${plural(e.n, 'vote', 'votes')} « Utile »`;
  }
  const metricOf = (key, e, w, big = false) => metric(typo(factsOf(key, e, big)), big ? ptsText(pointsFrom(key, e, w)) : `+${fmt(pointsFrom(key, e, w))} points`);

  function proofOf(key, e) {
    if (key === 'reussites' || key === 'utiles') {
      const c = CREATIONS[e.c];
      return `<a class="cl-proof" href="${creationHref(c.id)}">${icon(`type-${c.type}`)}<span>${t(c.title)}</span></a>`;
    }
    if (key === 'entraide') return e.q.sujet ? `<a class="cl-proof" href="${sujetHref(e.q.sujet)}">${logo(e.q.tool, 16)}<span>${t(e.q.title)}</span></a>` : `<span class="cl-proof">${logo(e.q.tool, 16)}<span>${t(e.q.title)}</span></span>`;
    if (key === 'astuces') return e.t.sujet ? `<a class="cl-proof" href="${sujetHref(e.t.sujet)}">${logo(e.t.tool, 16)}<span>${t(e.t.title)}</span></a>` : `<span class="cl-proof">${logo(e.t.tool, 16)}<span>${t(e.t.title)}</span></span>`;
    return `<span class="cl-proof">${logo(e.tool, 16)}<span>${t(e.title)}</span></span>`;
  }

  const stack = (names, max = 9) => `<ul class="cl-stack" aria-label="${esc(typo(`Réussie par ${names.join(', ')}`))}">${names.slice(0, max).map((name, i) => `<li style="--i:${i}"><button type="button" data-cl-open="${esc(name)}" aria-label="${esc(name)}" title="${esc(name)}">${avatar(name, 34)}</button></li>`).join('')}${names.length > max ? `<li class="cl-stack-more">+${names.length - max}</li>` : ''}</ul>`;

  /* Premier de chaque palmarès ------------------------------------------- */

  function firstHead(key, e, w) {
    return `<div class="cl-first-head"><span class="cl-rank cl-rank-1" aria-label="Premier">1</span>${memberBtn(e.m, 48)}</div><p class="cl-big">${metricOf(key, e, w, true)}</p>`;
  }

  function firstCreation(key, e, w) {
    const c = CREATIONS[e.c];
    const moment = key === 'utiles' && c.moments[0];
    const tools = c.tools.map(([tool, model]) => toolPair(tool, model)).join('<span class="cl-sep" aria-hidden="true">+</span>');
    return `<article class="cl-first cl-first-media" aria-label="${esc(typo(`Premier : ${e.m}`))}">
      <a class="cl-first-visual" href="${creationHref(c.id)}" tabindex="-1" aria-hidden="true">${mediaHTML(c.media, '(min-width: 1100px) 400px, 92vw')}</a>
      <div class="cl-first-copy">
        ${firstHead(key, e, w)}
        <h3 class="cl-first-title"><a href="${creationHref(c.id)}">${t(c.title)}</a></h3>
        <p class="cl-first-meta">${typeTag(c.type)}<span class="cl-dot" aria-hidden="true"></span>${tools}</p>
        ${key === 'reussites' ? `<div class="cl-helped cl-detail"><p class="cl-helped-title">Ils l’ont réussie cette semaine</p>${stack(e.by)}<p class="cl-note">${e.n} réussites sur ${plural(e.d, 'reproduction déclarée', 'reproductions déclarées')}</p></div>` : ''}
        ${moment ? `<div class="cl-moment cl-detail"><p class="cl-moment-type">${icon('moment')}Moment clé · ${t(moment.type)}</p><p class="cl-moment-text">${t(moment.text)}</p></div>` : ''}
      </div>
    </article>`;
  }

  function firstTalk(key, e, w) {
    const q = e.q;
    const link = q.sujet ? `<a href="${sujetHref(q.sujet)}">Lire l’échange</a>` : `<a href="forum.html?membre=${encodeURIComponent(e.m)}">Voir ses réponses</a>`;
    return `<article class="cl-first cl-first-talk" aria-label="${esc(typo(`Premier : ${e.m}`))}">
      <div class="cl-first-copy">${firstHead(key, e, w)}<p class="cl-note cl-m-f">et ${plural(e.v, 'vote « Utile » reçu', 'votes « Utile » reçus')} sur ses réponses</p><h3 class="cl-first-title cl-only-summary">${q.sujet ? `<a href="${sujetHref(q.sujet)}">${t(q.title)}</a>` : t(q.title)}</h3></div>
      <div class="cl-talk">
        <div class="cl-msg cl-msg-q">${face(q.asker, 36)}<div class="cl-msg-body"><p class="cl-msg-meta"><b>${t(q.asker)}</b> a demandé${q.tool ? ` · ${toolPair(q.tool, q.model)}` : ''}</p><p class="cl-msg-text">${t(q.title)}</p></div></div>
        <div class="cl-msg cl-msg-a">${face(e.m, 36)}<div class="cl-msg-body"><p class="cl-msg-meta"><b>${t(e.m)}</b><span class="cl-accepted">${icon('accept')}Réponse acceptée</span>${q.at ? `<span class="cl-when">${t(dateLabel(q.at.slice(0, 10), false))} à ${timeOf(q.at)}</span>` : ''}</p>${q.excerpt ? `<p class="cl-msg-text">${t(q.excerpt)}</p>` : ''}<p class="cl-msg-foot">${q.tested ? `<span>${icon('repeat')}Vérifiée par ${plural(q.tested, 'membre', 'membres')}</span>` : ''}${link}</p></div></div>
      </div>
    </article>`;
  }

  function firstTable(key, e, w) {
    const max = Math.max(...e.t.with.map(r => r[2]));
    const title = e.t.sujet ? `<a href="${sujetHref(e.t.sujet)}">${t(e.t.title)}</a>` : t(e.t.title);
    return `<article class="cl-first cl-first-table" aria-label="${esc(typo(`Premier : ${e.m}`))}">
      <div class="cl-first-copy">${firstHead(key, e, w)}<h3 class="cl-first-title">${title}</h3><p class="cl-first-meta">Astuce pour ${toolPair(e.t.tool, e.t.model)}</p></div>
      <table class="cl-compat cl-detail">
        <caption>Vérifications de la semaine, outil par outil</caption>
        <thead><tr><th scope="col">Outil et modèle</th><th scope="col">Résultat</th><th scope="col"><span class="sr-only">Nombre de vérifications</span></th></tr></thead>
        <tbody>${e.t.with.map(([tool, model, n]) => `<tr><th scope="row">${toolPair(tool, model)}</th><td><span class="cl-ok">${icon('check')}<span class="cl-ok-label">Ça marche</span></span></td><td><span class="cl-tally" style="--n:${n};--max:${max}" aria-hidden="true">${'<i></i>'.repeat(n)}</span><b>${n}</b></td></tr>`).join('')}</tbody>
      </table>
    </article>`;
  }

  const FIRST = { reussites: firstCreation, utiles: firstCreation, entraide: firstTalk, astuces: firstTable };

  function restList(key, list, w) {
    if (!list.length) return '';
    return `<ol class="cl-list" aria-label="${esc(typo(`${CATS[key].label} : places suivantes`))}">${list.map((e, i) => `<li class="cl-row" style="--i:${i}"><span class="cl-rank">${i + 2}</span>${memberBtn(e.m, 32)}<span class="cl-row-proof">${proofOf(key, e)}</span><span class="cl-row-metric">${metricOf(key, e, w)}</span></li>`).join('')}</ol>`;
  }

  function emptyCat(key) {
    const tool = state.tool;
    const msg = { reussites: `Aucune reproduction réussie sur une création ${tool} cette semaine.`, entraide: `Aucune réponse acceptée sur une question ${tool} cette semaine.`, utiles: `Aucune création ${tool} n’a reçu de vote « Utile » cette semaine.`, astuces: `Aucune astuce vérifiée avec ${tool} cette semaine.` }[key];
    return `<div class="cl-empty"><p>${t(msg)}</p><button class="link-btn" type="button" data-cl-clear-tool>Voir tous les outils</button></div>`;
  }

  function catSection(key, w) {
    const cat = CATS[key];
    const list = entries(w, key);
    return `<section class="cl-cat cl-reveal" id="${key}" data-cat="${key}" aria-labelledby="cl-${key}-title">
      <header class="cl-cat-head">
        <h2 class="cl-cat-title" id="cl-${key}-title"><span class="cl-cat-icon">${icon(cat.icon, '')}</span>${t(cat.title)}</h2>
        <p class="cl-cat-rule">${t(cat.rule)}</p>
      </header>
      ${list.length ? `<div class="cl-cat-body">${FIRST[key](key, list[0], w)}${restList(key, list.slice(1, 5), w)}</div>` : emptyCat(key)}
      <p class="cl-cat-foot"><a class="link-arrow" href="${cat.cta[0]}">${t(cat.cta[1])}${icon('arrow')}</a></p>
    </section>`;
  }

  /* Défi ------------------------------------------------------------------ */

  const LOGOS = {
    bazin: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="8" width="48" height="48" rx="10" fill="#1E3A8A"/><path d="M20 22h12a7 7 0 0 1 0 14H20zM20 36h14a7 7 0 0 1 0 14H20z" fill="none" stroke="#F4E3B5" stroke-width="5" stroke-linejoin="round"/><circle cx="46" cy="20" r="4" fill="#F4E3B5"/></svg>',
    panier: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 28h40l-5 22a4 4 0 0 1-4 3H21a4 4 0 0 1-4-3z" fill="#166534"/><path d="M22 28c0-8 4-14 10-14s10 6 10 14" fill="none" stroke="#166534" stroke-width="5" stroke-linecap="round"/><path d="M24 38v8M32 38v8M40 38v8" stroke="#DCFCE7" stroke-width="3.5" stroke-linecap="round"/><circle cx="46" cy="16" r="5" fill="#F59E0B"/></svg>'
  };
  function defiVisual(v, e) {
    if (!v) return '';
    if (v.kind === 'poster') return `<div class="cl-poster"><img src="assets/images/${v.src}-720.webp" width="720" height="960" alt="${esc(typo(v.alt))}" loading="lazy" decoding="async"><p class="cl-poster-text" aria-hidden="true"><b>${t(v.place)}</b><span>${t(v.line)}</span></p></div>`;
    if (v.kind === 'logo') return `<div class="cl-logo-card" role="img" aria-label="${esc(typo(`${e.title} : ${v.name}`))}">${LOGOS[v.mark]}<b>${t(v.name)}</b><small>${t(v.line)}</small></div>`;
    return `<div class="mock cl-pod-mock" role="img" aria-label="${esc(typo(e.title))}">${mockHTML(v.mock)}</div>`;
  }

  function defiSection(w) {
    const d = w.defi;
    const list = entries(w, 'defi');
    const top = list.slice(0, 3);
    const rest = list.slice(3);
    const end = d.closed ? `Clos le ${t(longDay(d.end))} à 23:59 UTC` : `Jusqu’au ${t(longDay(d.end))} à 23:59 UTC`;
    const podium = top.map((e, i) => `<li class="cl-pod" data-place="${i + 1}" style="--i:${i}">
        ${e.c ? `<a class="cl-pod-visual" href="${creationHref(e.c)}" tabindex="-1" aria-hidden="true">${defiVisual(e.visual, e)}</a>` : `<div class="cl-pod-visual">${defiVisual(e.visual, e)}</div>`}
        <div class="cl-pod-base">
          <span class="cl-pod-rank" aria-label="${esc(ordinalText(i + 1))}">${i + 1}</span>
          <div class="cl-pod-copy"><p class="cl-pod-title">${e.c ? `<a href="${creationHref(e.c)}">${t(e.title)}</a>` : t(e.title)}</p>${memberBtn(e.m, 28)}<p class="cl-pod-meta">${toolPair(e.tool, e.model)}<span class="cl-pod-votes">${metricOf('defi', e, w)}</span></p></div>
        </div>
      </li>`).join('');
    return `<section class="cl-defi cl-reveal" id="defi" aria-labelledby="cl-defi-title">
      <div class="container">
        <div class="cl-defi-head">
          <div class="cl-defi-copy">
            <p class="cl-defi-kicker">${icon('podium')}${d.closed ? 'Défi de la semaine · Classement final' : 'Défi de la semaine · Classement provisoire'}</p>
            <h2 id="cl-defi-title">${t(d.title)}</h2>
            <p class="cl-defi-meta"><span>Thème : ${t(d.theme)}</span><span>${t(end)}</span><span>${plural(d.count, 'participation', 'participations')}</span></p>
          </div>
          <ul class="cl-defi-rules" aria-label="Contraintes du défi">${d.rules.map(r => `<li>${icon('check')}${t(r)}</li>`).join('')}</ul>
        </div>
        ${list.length ? `<ol class="cl-podium">${podium}</ol>${rest.length ? `<ol class="cl-defi-rest">${rest.map((e, i) => `<li><span class="cl-rank">${i + 4}</span>${memberBtn(e.m, 28)}<span class="cl-row-proof">${proofOf('defi', e)}</span><span class="cl-row-metric">${metricOf('defi', e, w)}</span></li>`).join('')}</ol>` : ''}` : `<div class="cl-empty"><p>${t(`Aucune participation avec ${state.tool} dans ce défi.`)}</p><button class="link-btn" type="button" data-cl-clear-tool>Voir tous les outils</button></div>`}
        <div class="cl-defi-foot">
          <p>${d.closed ? 'Rangs figés à la clôture, selon les votes « Utile » reçus pendant le défi. Le podium a reçu 50, 30 et 20 points, chaque participation 5 points.' : 'Participations classées par votes « Utile » reçus depuis l’ouverture. Les rangs seront figés à la clôture : 50, 30 et 20 points pour le podium, 5 points par participation.'}</p>
          ${d.closed ? '' : `<a class="btn btn-sm cl-defi-cta" href="nouvelle-creation.html?defi=${encodeURIComponent(d.title)}">Participer au défi${icon('arrow')}</a>`}
        </div>
      </div>
    </section>`;
  }

  /* Progression ------------------------------------------------------------- */

  const emblem = b => `<span class="emblem" data-tone="${b.tone}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icon(b.icon, '')}</span>`;

  function progressSection(w) {
    const ups = levelUps(w);
    const byLevel = LEVELS.slice(1).map(l => ({ l, list: ups.filter(u => u.to === l) }));
    const badges = w.badges.slice().sort((a, b) => b.at.localeCompare(a.at));
    return `<section class="cl-cat cl-progress cl-reveal" id="progres" data-cat="progres" aria-labelledby="cl-progres-title">
      <header class="cl-cat-head">
        <h2 class="cl-cat-title" id="cl-progres-title"><span class="cl-cat-icon">${icon('trend-up', '')}</span>Ils progressent</h2>
        <p class="cl-cat-rule">Les passages de niveau et les badges obtenus pendant la semaine. Les cas Bon réflexe réussis et les reproductions déclarées restent visibles de leur seul auteur.</p>
      </header>
      <div class="cl-progress-body">
        <div class="cl-ladder" role="list" aria-label="Passages de niveau">
          ${byLevel.map(({ l, list }) => `<div class="cl-step${list.length ? ' has-up' : ''}" role="listitem">
            <div class="cl-step-people">${list.length ? list.map(u => `<div class="cl-up">${u.name === YOU ? memberBtn(YOU, 40) : `<button class="cl-up-btn" type="button" data-cl-open="${esc(u.name)}">${avatar(u.name, 40)}<span>${t(u.name)}</span></button>`}<small>depuis ${t(u.from.name)}</small></div>`).join('') : '<p class="cl-step-none">Personne cette semaine</p>'}</div>
            <div class="cl-step-node"><span aria-hidden="true"></span><b>${t(l.name)}</b><small>${t(`${fmt(l.min)} points`)}</small></div>
          </div>`).join('')}
        </div>
        <ul class="cl-badges" aria-label="Badges obtenus">
          ${badges.map((b, i) => { const badge = BADGES[b.b]; return `<li class="cl-badge" style="--i:${i}"><span class="cl-badge-name" tabindex="0" aria-describedby="cl-rule-${w.id}-${i}">${emblem(badge)}<b>${t(badge.name)}</b><span class="cl-badge-rule" role="tooltip" id="cl-rule-${w.id}-${i}">${t(badge.rule)}</span></span><span class="cl-badge-copy"><button type="button" class="cl-badge-who" data-cl-open="${esc(b.m)}">${avatar(b.m, 24)}${t(b.m)}</button><small>${t(dateLabel(b.at, false))}</small></span></li>`; }).join('')}
        </ul>
      </div>
    </section>`;
  }

  /* Classement des membres ------------------------------------------------- */

  function youPanel() {
    const w = week();
    const data = C.you.weeks[w.id];
    const rows = ranking(w.id);
    const me = rows.find(r => r.name === YOU);
    const lvl = levelOf(youTotal());
    const next = nextLevel(youTotal());
    const peers = rows.filter(r => levelOf(r.total) === lvl);
    const peerRank = peers.findIndex(r => r.name === YOU) + 1;
    const pct = next ? Math.round(((youTotal() - lvl.min) / (next.min - lvl.min)) * 100) : 100;
    return `<div class="cl-you">
      <div class="cl-you-head">${youAvatar(44)}<div><p class="cl-you-title">Votre semaine</p><p class="cl-you-sub">${t(lvl.name)} · ${t(`${fmt(youTotal())} points de réputation`)}</p></div></div>
      <dl class="cl-you-figures">
        <div><dt>Points</dt><dd>${fmt(data.pts)}</dd></div>
        <div><dt>Rang</dt><dd>${me ? ordinal(me.rank) : '–'}</dd></div>
        <div><dt>Chez les ${t(lvl.plural)}</dt><dd>${peerRank ? ordinal(peerRank) : '–'}</dd></div>
      </dl>
      ${next ? `<div class="cl-you-next"><p>${t(`${fmt(next.min - youTotal())} points avant ${next.name}`)}</p><span class="cl-bar" style="--v:${pct / 100}" role="img" aria-label="${esc(`${pct} % du niveau ${lvl.name}`)}"><i></i></span></div>` : ''}
      <details class="cl-you-detail"><summary>D’où viennent vos points</summary><ul>${data.detail.map(([label, n, p]) => `<li><span>${t(label)}${n > 1 ? ` × ${n}` : ''}</span><b>+${n * p}</b></li>`).join('')}</ul><p>Ce détail n’est visible que par vous.</p></details>
      ${EARN}
    </div>`;
  }
  const EARN = `<div class="cl-earn"><p class="cl-earn-title">Gagner des points cette semaine</p><ul>
      <li><a href="apprendre.html?rubrique=bon-reflexe">Réussir un cas Bon réflexe</a><b>+1</b></li>
      <li><a href="explorer.html">Reproduire une création et la déclarer</a><b>+2</b></li>
      <li><a href="forum.html?onglet=sans-reponse">Répondre à une question sans réponse</a><b>+15 si acceptée</b></li>
    </ul></div>`;
  const visitorPanel = () => `<div class="cl-you is-visitor"><p class="cl-you-title">Votre place au classement</p><p>Vos premiers points arrivent avec un cas Bon réflexe réussi ou une reproduction déclarée. Les membres que vous aidez font le reste.</p><div class="cl-you-actions"><a class="btn btn-primary btn-sm" href="inscription.html">Créer un compte</a><a class="btn btn-secondary btn-sm" href="connexion.html">Se connecter</a></div>${EARN}</div>`;

  function evolution(name, rank) {
    const prev = weekById(state.week - 1);
    if (!prev || state.table !== 'semaine') return '';
    const before = ranking(prev.id).find(r => r.name === name);
    if (!before) return '<span class="cl-evo is-new">Nouveau</span>';
    const diff = before.rank - rank;
    if (diff > 0) return `<span class="cl-evo is-up">${icon('up', 'icon-xs')}<span class="sr-only">gagne </span>${diff}</span>`;
    if (diff < 0) return `<span class="cl-evo is-down">${icon('down', 'icon-xs')}<span class="sr-only">perd </span>${-diff}</span>`;
    return `<span class="cl-evo">${icon('minus', 'icon-xs')}<span class="sr-only">même rang</span></span>`;
  }

  function recognized(name) {
    const w = week();
    const list = placements(w, name).slice(0, 3);
    if (!list.length) return '';
    return list.map(p => `<span class="cl-rec" data-cat="${p.key}">${icon(CATS[p.key].icon, 'icon-xs')}<span>${ordinal(p.rank)} ${p.key === 'defi' ? 'au défi' : `en ${t(CATS[p.key].label.toLowerCase())}`}</span></span>`).join('');
  }
  function badgeRow(name) {
    if (name === YOU) return '';
    const owned = [...(C.earlier[name] || []), ...WEEKS.flatMap(w => w.badges.filter(b => b.m === name).map(b => b.b))];
    const shown = owned.slice(-4).reverse();
    return `<span class="cl-mini-badges" aria-label="${esc(typo(`${plural(owned.length, 'badge', 'badges')} : ${owned.join(', ')}`))}">${shown.map(n => emblem(BADGES[n])).join('')}${owned.length > 4 ? `<small>+${owned.length - 4}</small>` : ''}</span>`;
  }

  function tableRows() {
    const w = week();
    let rows = ranking(w.id, state.table);
    if (state.level) rows = rows.filter(r => levelOf(r.total).key === state.level);
    const limit = state.level || state.expanded ? 50 : 10;
    const shown = rows.slice(0, limit);
    const me = rows.find(r => r.name === YOU);
    const pinned = me && !shown.includes(me) ? me : null;
    return { rows, shown, pinned };
  }
  function rowHTML(r, pinned = false) {
    return `<tr class="cl-tr${r.name === YOU ? ' is-you' : ''}${pinned ? ' is-pinned' : ''}${r.rank <= 3 ? ` is-top is-top-${r.rank}` : ''}" data-name="${esc(r.name)}">
      <td class="cl-td-rank"><span class="cl-rank">${r.rank}</span>${evolution(r.name, r.rank)}</td>
      <th scope="row" class="cl-td-who">${memberBtn(r.name, 36)}<span class="cl-td-sub">${state.table === 'semaine' ? recognized(r.name) : badgeRow(r.name)}</span></th>
      <td class="cl-td-extra">${state.table === 'semaine' ? recognized(r.name) : badgeRow(r.name)}</td>
      <td class="cl-td-pts"><b>${fmt(r.pts)}</b><small>${state.table === 'semaine' ? 'points' : 'de réputation'}</small></td>
    </tr>`;
  }
  function renderTable(animate = false) {
    const box = $('[data-cl-table]');
    if (!box) return;
    const before = animate && V.motion.full() ? new Map($$('tr[data-name]', box).map(tr => [tr.dataset.name, tr.getBoundingClientRect().top])) : null;
    const { rows, shown, pinned } = tableRows();
    const w = week();
    const head = state.table === 'semaine' ? 'Reconnu pour' : 'Badges récents';
    box.innerHTML = rows.length ? `<table class="cl-table" data-table="${state.table}">
        <caption class="sr-only">${t(state.table === 'semaine' ? `Points gagnés ${longRange(w.start, w.end)}` : 'Réputation totale')}${state.level ? t(` · ${LEVELS.find(l => l.key === state.level).plural}`) : ''}</caption>
        <thead><tr><th scope="col" class="cl-td-rank">Rang</th><th scope="col" class="cl-td-who">Membre</th><th scope="col" class="cl-td-extra">${head}</th><th scope="col" class="cl-td-pts">${state.table === 'semaine' ? 'Points' : 'Réputation'}</th></tr></thead>
        <tbody>${shown.map(r => rowHTML(r)).join('')}${pinned ? `<tr class="cl-gap" aria-hidden="true"><td colspan="4"><span></span></td></tr>${rowHTML(pinned, true)}` : ''}</tbody>
      </table>` : `<div class="cl-empty"><p>Aucun membre de ce niveau n’a gagné de points cette semaine.</p><button class="link-btn" type="button" data-cl-level="">Voir tous les niveaux</button></div>`;
    const more = $('[data-cl-more]');
    const hasMore = !state.level && rows.length > 10;
    more.hidden = !hasMore;
    more.innerHTML = state.expanded ? `Afficher les 10 premiers${icon('up')}` : `Afficher les ${Math.min(50, rows.length)} premiers${icon('chevron-down')}`;
    more.setAttribute('aria-expanded', String(state.expanded));
    $('[data-cl-count-line]').textContent = typo(state.level ? `${plural(rows.length, 'membre', 'membres')} ${LEVELS.find(l => l.key === state.level).plural.toLowerCase()} dans le classement` : `${Math.min(50, rows.length)} premiers sur ${fmt(state.table === 'semaine' ? 1284 : 3912)} membres classés`);
    if (before) {
      $$('tr[data-name]', box).forEach(tr => {
        const old = before.get(tr.dataset.name);
        if (old === undefined) { tr.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' }); return; }
        const dy = old - tr.getBoundingClientRect().top;
        if (Math.abs(dy) > 1) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      });
    }
  }

  function membersSection() {
    const w = week();
    const levelChips = [{ key: '', plural: 'Tous les niveaux' }, ...LEVELS].map(l => `<button type="button" class="cl-chip" data-cl-level="${l.key}" aria-pressed="${state.level === l.key}">${t(l.plural)}</button>`).join('');
    return `<section class="cl-members cl-reveal" id="membres" aria-labelledby="cl-members-title">
      <div class="container">
        <div class="cl-members-grid">
          <div class="cl-members-main">
            <header class="cl-members-head">
              <div><h2 id="cl-members-title"><span class="cl-cat-icon">${icon('users', '')}</span>Classement des membres</h2><p class="cl-cat-rule" data-cl-count-line></p></div>
              <div class="cl-seg" role="tablist" aria-label="Type de classement">
                <button type="button" role="tab" id="cl-tab-semaine" aria-controls="cl-panel" aria-selected="${state.table === 'semaine'}" tabindex="${state.table === 'semaine' ? 0 : -1}" data-cl-table-tab="semaine">${t(state.week === WEEKS[0].id ? 'Cette semaine' : `Semaine du ${shortRange(w.start, w.end)}`)}</button>
                <button type="button" role="tab" id="cl-tab-general" aria-controls="cl-panel" aria-selected="${state.table === 'general'}" tabindex="${state.table === 'general' ? 0 : -1}" data-cl-table-tab="general">Général</button>
              </div>
            </header>
            <div class="cl-levels" role="group" aria-label="Filtrer par niveau">${levelChips}</div>
            <div class="cl-panel" id="cl-panel" role="tabpanel" aria-labelledby="cl-tab-${state.table}" data-cl-table></div>
            <button class="cl-more" type="button" data-cl-more hidden></button>
          </div>
          <aside class="cl-members-side" aria-label="Votre place">${state.view === 'membre' ? youPanel() : visitorPanel()}</aside>
        </div>
      </div>
    </section>`;
  }

  /* Règles ------------------------------------------------------------------ */

  function rulesSection() {
    const groups = [
      ['repeat', 'Méthodes réussies', [['Reproduction réussie de votre création, une fois par membre', '+5']]],
      ['utile', 'Créations utiles', [['Vote « Utile » sur votre création', '+10']]],
      ['reply', 'Entraide', [['Réponse acceptée', '+15'], ['Vote « Utile » sur une réponse ou une question', '+5'], ['Acceptation d’une réponse à votre question', '+2']]],
      ['bulb', 'Astuces vérifiées', [['Vote « Testé, ça marche » sur votre astuce', '+5']]],
      ['podium', 'Défis', [['Participation, à la clôture', '+5'], ['Première, deuxième, troisième place', '+50, +30, +20']]],
      ['school', 'Apprentissage', [['Première reproduction déclarée d’une création', '+2'], ['Cas Bon réflexe réussi', '+1']]]
    ];
    return `<section class="cl-rules cl-reveal" id="regles" aria-labelledby="cl-rules-title">
      <div class="container">
        <header class="cl-rules-head"><p class="kicker">${icon('scale')}Règles du classement</p><h2 id="cl-rules-title">Comment le palmarès est établi</h2></header>
        <div class="cl-rules-grid">
          <div class="cl-scale">
            <h3>Ce qui rapporte des points</h3>
            ${groups.map(([ic, label, rows]) => `<div class="cl-scale-group"><p class="cl-scale-label">${icon(ic, 'icon-sm')}${t(label)}</p><dl>${rows.map(([what, pts]) => `<div><dt>${t(what)}</dt><dd>${t(pts)}</dd></div>`).join('')}</dl></div>`).join('')}
          </div>
          <div class="cl-rules-list">
            <h3>Ce qui garantit un classement juste</h3>
            <ul>
              <li>${icon('calendar')}<span>La semaine court du lundi 00:00 au dimanche 23:59 (UTC). Le palmarès est alors arrêté et ses rangs ne bougent plus.</span></li>
              <li>${icon('users')}<span>Presque tous les points viennent d’un autre membre : celui qui reproduit votre méthode, accepte votre réponse ou vérifie votre astuce.</span></li>
              <li>${icon('clock')}<span>Les points des votes reçus sont plafonnés à 200 par jour et par membre.</span></li>
              <li>${icon('replay')}<span>Un vote retiré, une acceptation annulée ou un contenu retiré annule les points correspondants.</span></li>
              <li>${icon('route')}<span>À égalité, la contribution publiée la première passe devant.</span></li>
              <li>${icon('lock')}<span>Vos cas Bon réflexe réussis et vos reproductions déclarées restent privés : vous seul les voyez.</span></li>
            </ul>
            <div class="cl-levels-scale" aria-label="Niveaux de réputation">${LEVELS.map((l, i) => `<span style="--i:${i}"><b>${t(l.name)}</b><small>${t(l.min ? `${fmt(l.min)} points` : 'dès l’inscription')}</small></span>`).join('')}</div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ------------------------------------------------------------------ */
  /* En-tête : semaines, outils, lauréats                                 */
  /* ------------------------------------------------------------------ */

  function renderHero() {
    const w = week();
    $('[data-cl-weeks]').innerHTML = WEEKS.map(x => `<button type="button" class="cl-week" data-cl-week="${x.id}" aria-pressed="${x.id === w.id}" tabindex="${x.id === w.id ? 0 : -1}"><b>${t(x.status === 'provisoire' ? 'Cette semaine' : shortRange(x.start, x.end))}</b><small>${t(x.status === 'provisoire' ? shortRange(x.start, x.end) : 'Arrêté')}</small></button>`).join('');
    const end = MS(w.end, true);
    const left = Math.max(0, end - NOW);
    const days = Math.floor(left / 86400000); const hours = Math.floor((left % 86400000) / 3600000);
    $('[data-cl-title]').innerHTML = state.tool ? `Palmarès de la semaine <span class="cl-title-tool">${logo(state.tool, 40)}${t(state.tool)}</span>` : 'Palmarès de la semaine';
    $('[data-cl-dates]').innerHTML = w.status === 'provisoire'
      ? `<span class="cl-status is-open">Provisoire</span><span>${t(longRange(w.start, w.end))}</span><span>${t(`arrêté dans ${days} j ${hours} h, ${longDay(w.end)} à 23:59 UTC`)}</span>`
      : `<span class="cl-status">Arrêté</span><span>${t(longRange(w.start, w.end))}</span><span>Les rangs ne changent plus</span>`;
    const f = w.figures;
    $('[data-cl-figures]').innerHTML = [[f.total, 'interactions d’apprentissage', 'is-main'], [f.votes, 'votes « Utile » et « Testé, ça marche »'], [f.repro, 'reproductions déclarées'], [f.cases, 'cas Bon réflexe réussis'], [f.accepted, 'réponses acceptées']]
      .map(([n, label, cls]) => `<div class="${cls || ''}"><dt>${t(label)}</dt><dd>${count(n)}</dd></div>`).join('');
    renderToolPicker();
    renderLaureates();
  }

  function renderLaureates() {
    const w = week();
    const items = ORDER.map(key => { const e = entries(w, key)[0]; return e && { key, name: e.m, text: typo(factsOf(key, e).replace(/<[^>]+>/g, '')) }; });
    const d = entries(w, 'defi')[0];
    items.push(d && { key: 'defi', name: d.m, text: typo(`${w.defi.closed ? '1er' : 'En tête'} · ${plural(d.n, 'vote', 'votes')} « Utile »`) });
    const up = levelUps(w)[0];
    items.push(up ? { key: 'progres', name: up.name, text: typo(`Passe ${up.to.name}`) } : null);
    $('[data-cl-laureates]').innerHTML = items.map((it, i) => {
      const key = it ? it.key : ['reussites', 'entraide', 'utiles', 'astuces', 'defi', 'progres'][i];
      const label = { reussites: 'Méthodes réussies', entraide: 'Entraide', utiles: 'Créations utiles', astuces: 'Astuces vérifiées', defi: 'Défi de la semaine', progres: 'Progression' }[key];
      if (!it) return `<li class="cl-laureate is-empty" data-cat="${key}" style="--i:${i}"><span class="cl-laureate-cat">${icon(CATS[key].icon, 'icon-xs')}${t(label)}</span><span class="cl-laureate-none">Aucun lauréat avec ${t(state.tool)}</span></li>`;
      return `<li class="cl-laureate" data-cat="${key}" style="--i:${i}"><a href="#${key}" class="cl-laureate-link" data-cl-jump="${key}"><span class="cl-laureate-cat">${icon(CATS[key].icon, 'icon-xs')}${t(label)}</span><span class="cl-laureate-face">${face(it.name, 64)}</span><b>${t(it.name === YOU ? 'Vous' : it.name)}</b><small>${t(it.text)}</small></a></li>`;
    }).join('');
  }

  /* Choix de l'outil ------------------------------------------------------ */

  let toolActive = -1;
  function renderToolPicker() {
    const opts = [['', 0], ...toolOptions(week())];
    $('[data-cl-tool-value]').innerHTML = state.tool ? `${logo(state.tool, 16)}${t(state.tool)}` : 'Tous les outils';
    $('[data-cl-tool-btn]').classList.toggle('is-set', !!state.tool);
    $('[data-cl-tool-list]').innerHTML = opts.map(([name, n], i) => `<li role="option" id="cl-tool-opt-${i}" data-cl-tool="${esc(name)}" aria-selected="${name === state.tool}">${name ? `${logo(name, 18)}<span>${t(name)}</span><small>${plural(n, 'contribution', 'contributions')}</small>` : '<span>Tous les outils</span>'}${name === state.tool ? icon('check', 'icon-sm') : ''}</li>`).join('');
  }
  function openTools() {
    const list = $('[data-cl-tool-list]');
    list.hidden = false;
    $('[data-cl-tool-btn]').setAttribute('aria-expanded', 'true');
    const opts = $$('[role="option"]', list);
    toolActive = Math.max(0, opts.findIndex(o => o.getAttribute('aria-selected') === 'true'));
    moveTool(0);
    list.focus();
  }
  function closeTools(focus = true) {
    const list = $('[data-cl-tool-list]');
    if (list.hidden) return;
    list.hidden = true;
    $('[data-cl-tool-btn]').setAttribute('aria-expanded', 'false');
    if (focus) $('[data-cl-tool-btn]').focus();
  }
  function moveTool(delta) {
    const list = $('[data-cl-tool-list]');
    const opts = $$('[role="option"]', list);
    toolActive = Math.min(opts.length - 1, Math.max(0, toolActive + delta));
    opts.forEach((o, i) => o.classList.toggle('is-active', i === toolActive));
    list.setAttribute('aria-activedescendant', opts[toolActive].id);
    opts[toolActive].scrollIntoView({ block: 'nearest' });
  }
  function setTool(tool) {
    if (tool === state.tool) { closeTools(); return; }
    state.tool = tool;
    closeTools();
    writeURL(false);
    renderHero();
    renderView(true);
    announce(tool ? `Palmarès limité à ${tool}.` : 'Palmarès de tous les outils.');
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                                */
  /* ------------------------------------------------------------------ */

  let revealObserver = null;
  function observeReveal(scope) {
    if (revealObserver) revealObserver.disconnect();
    const items = $$('.cl-reveal', scope);
    if (!('IntersectionObserver' in window) || V.motion.level() === 'none') { items.forEach(el => { el.classList.add('is-in'); countUp(el); }); return; }
    revealObserver = new IntersectionObserver(list => list.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      countUp(entry.target);
      revealObserver.unobserve(entry.target);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    items.forEach(el => revealObserver.observe(el));
  }

  function countUp(scope) {
    const nums = $$('[data-cl-count]', scope).filter(el => !el.dataset.counted);
    nums.forEach(el => {
      el.dataset.counted = '1';
      const target = Number(el.dataset.clCount);
      if (!V.motion.full() || target < 4) { el.textContent = fmt(target); return; }
      const start = performance.now();
      const dur = Math.min(1200, 500 + target / 6);
      const step = now => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }

  function renderView(entering = false) {
    const w = week();
    const view = $('[data-cl-view]');
    view.innerHTML = `<div class="container cl-cats">${ORDER.map(key => catSection(key, w)).join('')}</div>${defiSection(w)}<div class="container">${progressSection(w)}</div>${membersSection()}${rulesSection()}`;
    V.fixTypography(view);
    renderTable();
    if (entering && V.motion.level() !== 'none') { view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering'); }
    observeReveal(view);
    countUp($('.cl-hero'));
  }

  function announce(message) { $('[data-cl-status]').textContent = typo(message); }

  /* Fiche membre ------------------------------------------------------------ */

  let opener = null;
  function memberHTML(name) {
    const m = C.members[name];
    const lvl = levelOf(m.total);
    const next = nextLevel(m.total);
    const pct = next ? (m.total - lvl.min) / (next.min - lvl.min) : 1;
    const w = week();
    const row = ranking(w.id).find(r => r.name === name);
    const pts = m.weeks[w.id];
    const places = placements(w, name);
    const parts = places.map(p => ({ key: p.key, pts: pointsFrom(p.key, p.e, w) }));
    const other = Math.max(0, pts - parts.reduce((s, p) => s + p.pts, 0));
    const segs = [...parts, ...(other ? [{ key: 'autres', pts: other }] : [])];
    const owned = [...(C.earlier[name] || []), ...WEEKS.slice().reverse().flatMap(x => x.badges.filter(b => b.m === name).map(b => b.b))];
    const [made, repro, success, accepted] = m.stats;
    const mine = X.creations.filter(c => c.author === name).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    const label = key => (key === 'autres' ? 'Autres contributions et apprentissage' : key === 'defi' ? 'Défi de la semaine' : CATS[key].label);
    return `<header class="cl-member-head">
        ${avatar(name, 72)}
        <div><h2 id="cl-member-name">${t(name)}</h2><p>${t(lvl.name)} · ${t(`${fmt(m.total)} points de réputation`)}</p><p class="cl-member-since">${t(`Membre depuis ${monthYear(m.since)}`)}</p></div>
        <button class="icon-btn cl-member-close" type="button" data-cl-close aria-label="Fermer la fiche">${icon('close', '')}</button>
      </header>
      ${next ? `<div class="cl-member-next"><p><span>${t(lvl.name)}</span><span>${t(`${fmt(next.min - m.total)} points avant ${next.name}`)}</span></p><span class="cl-bar" style="--v:${pct.toFixed(3)}"><i></i></span></div>` : '<p class="cl-member-next"><span>Niveau le plus élevé atteint</span></p>'}
      <section class="cl-member-sec" aria-labelledby="cl-member-week">
        <h3 id="cl-member-week">${t(w.status === 'provisoire' ? 'Cette semaine' : `Semaine ${longRange(w.start, w.end)}`)}</h3>
        <p class="cl-member-week">${pts ? `<b>${fmt(pts)}</b> points${row ? ` · ${ordinal(row.rank)} au classement de la semaine` : ''}` : 'Aucun point cette semaine.'}</p>
        ${pts ? `<span class="cl-split" role="img" aria-label="${esc(typo(segs.map(s => `${label(s.key)} : ${s.pts} points`).join(', ')))}">${segs.map(s => `<i data-cat="${s.key}" style="--w:${(s.pts / pts).toFixed(4)}"></i>`).join('')}</span>
        <ul class="cl-split-legend">${segs.map(s => `<li data-cat="${s.key}"><i aria-hidden="true"></i>${t(label(s.key))}<b>+${fmt(s.pts)}</b></li>`).join('')}</ul>` : ''}
        ${places.length ? `<ul class="cl-member-proofs">${places.map(p => `<li data-cat="${p.key}">${icon(CATS[p.key].icon, 'icon-sm')}<div><p>${ordinal(p.rank)} ${p.key === 'defi' ? 'au défi' : `en ${t(CATS[p.key].label.toLowerCase())}`} · ${typo(factsOf(p.key, p.e))}</p>${proofOf(p.key, p.e)}</div></li>`).join('')}</ul>` : ''}
      </section>
      <section class="cl-member-sec" aria-labelledby="cl-member-badges">
        <h3 id="cl-member-badges">Badges <span>${owned.length}</span></h3>
        ${owned.length ? `<ul class="cl-member-badges">${owned.map((n, i) => { const b = BADGES[n]; return `<li class="cl-badge-mini" tabindex="0" aria-describedby="cl-mrule-${i}">${emblem(b)}<span>${t(b.name)}</span><span class="cl-badge-rule" role="tooltip" id="cl-mrule-${i}">${t(b.rule)}</span></li>`; }).join('')}</ul>` : '<p class="cl-note">Aucun badge pour le moment.</p>'}
      </section>
      <section class="cl-member-sec" aria-labelledby="cl-member-stats">
        <h3 id="cl-member-stats">Statistiques publiques</h3>
        <dl class="cl-member-stats"><div><dt>Créations publiées</dt><dd>${fmt(made)}</dd></div><div><dt>Reproductions reçues</dt><dd>${fmt(repro)}${repro ? `<small>${t(`${success} % de succès`)}</small>` : ''}</dd></div><div><dt>Réponses acceptées</dt><dd>${fmt(accepted)}</dd></div></dl>
        <p class="cl-member-tools">Outils les plus cités ${m.tools.map(tool => `<span class="cl-tool-ref">${logo(tool, 16)}${t(tool)}</span>`).join('')}</p>
      </section>
      ${mine.length ? `<section class="cl-member-sec" aria-labelledby="cl-member-made"><h3 id="cl-member-made">Créations récentes</h3><ul class="cl-member-made">${mine.map(c => `<li><a href="${creationHref(c.id)}">${icon(`type-${c.type}`)}<span>${t(c.title)}</span></a><small>${t(dateLabel(c.date, false))}</small></li>`).join('')}</ul></section>` : ''}
      <footer class="cl-member-foot"><a class="btn btn-secondary btn-sm" href="forum.html?membre=${encodeURIComponent(name)}">${icon('message')}Ses sujets dans le Forum</a></footer>`;
  }
  function openMember(name, from = null, push = true) {
    if (!C.members[name]) return;
    const dlg = $('[data-cl-member]');
    opener = from || document.activeElement;
    $('[data-cl-member-body]').innerHTML = memberHTML(name);
    V.fixTypography($('[data-cl-member-body]'));
    state.member = name;
    if (push) writeURL(true);
    if (!dlg.open) dlg.showModal();
    $('#cl-member-name').setAttribute('tabindex', '-1');
    $('#cl-member-name').focus();
  }
  function closeMember(push = true) {
    const dlg = $('[data-cl-member]');
    if (dlg.open) {
      if (V.motion.level() !== 'none') {
        dlg.classList.add('is-closing');
        setTimeout(() => { dlg.classList.remove('is-closing'); dlg.close(); }, 200);
      } else dlg.close();
    }
    state.member = null;
    if (push) writeURL(false);
    if (opener && document.contains(opener)) opener.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                         */
  /* ------------------------------------------------------------------ */

  function setWeek(id, focus = true) {
    if (id === state.week) return;
    state.week = id;
    if (state.tool && !toolOptions(week()).some(([name]) => name === state.tool)) { toast(`Aucune contribution avec ${state.tool} cette semaine-là : tous les outils sont affichés.`, 'filter'); state.tool = ''; }
    state.expanded = false;
    writeURL(true);
    renderHero();
    renderView(true);
    if (focus) $(`[data-cl-week="${id}"]`).focus();
    const w = week();
    announce(`Palmarès ${longRange(w.start, w.end)}${w.status === 'provisoire' ? ', provisoire' : ', arrêté'}.`);
  }

  document.addEventListener('click', event => {
    const target = event.target;
    const weekBtn = target.closest('[data-cl-week]');
    if (weekBtn) { setWeek(Number(weekBtn.dataset.clWeek)); return; }
    const open = target.closest('[data-cl-open]');
    if (open) { event.preventDefault(); openMember(open.dataset.clOpen, open); return; }
    if (target.closest('[data-cl-close]')) { closeMember(); return; }
    if (target.closest('[data-cl-tool-btn]')) { $('[data-cl-tool-list]').hidden ? openTools() : closeTools(); return; }
    const opt = target.closest('[data-cl-tool]');
    if (opt) { setTool(opt.dataset.clTool); return; }
    if (!target.closest('[data-cl-tool-picker]')) closeTools(false);
    if (target.closest('[data-cl-clear-tool]')) { setTool(''); return; }
    const tab = target.closest('[data-cl-table-tab]');
    if (tab) { selectTable(tab.dataset.clTableTab); return; }
    const lvl = target.closest('[data-cl-level]');
    if (lvl) {
      state.level = lvl.dataset.clLevel;
      writeURL(false);
      $$('.cl-levels [data-cl-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clLevel === state.level)));
      renderTable(true);
      announce(state.level ? `Classement des ${LEVELS.find(l => l.key === state.level).plural.toLowerCase()}.` : 'Classement de tous les niveaux.');
      return;
    }
    const more = target.closest('[data-cl-more]');
    if (more) {
      const before = $$('[data-cl-table] tbody tr.cl-tr:not(.is-pinned)').length;
      state.expanded = !state.expanded;
      renderTable(true);
      if (state.expanded) { const row = $$('[data-cl-table] tbody tr.cl-tr')[before]; row?.querySelector('button')?.focus({ preventScroll: true }); }
      else more.scrollIntoView({ block: 'nearest' });
      return;
    }
    const jump = target.closest('[data-cl-jump]');
    if (jump) {
      event.preventDefault();
      const el = document.getElementById(jump.dataset.clJump);
      if (!el) return;
      el.scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' });
      const title = el.querySelector('h2');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
    }
  });

  function selectTable(kind, focus = false) {
    if (kind === state.table) return;
    state.table = kind;
    writeURL(false);
    $$('[data-cl-table-tab]').forEach(b => { const on = b.dataset.clTableTab === kind; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    $('#cl-panel').setAttribute('aria-labelledby', `cl-tab-${kind}`);
    renderTable(true);
    if (focus) $(`[data-cl-table-tab="${kind}"]`).focus();
  }

  document.addEventListener('keydown', event => {
    const { key, target } = event;
    if (target.closest?.('[data-cl-tool-list]')) {
      if (key === 'ArrowDown') { event.preventDefault(); moveTool(1); }
      else if (key === 'ArrowUp') { event.preventDefault(); moveTool(-1); }
      else if (key === 'Home') { event.preventDefault(); moveTool(-99); }
      else if (key === 'End') { event.preventDefault(); moveTool(99); }
      else if (key === 'Enter' || key === ' ') { event.preventDefault(); const o = $$('[data-cl-tool-list] [role="option"]')[toolActive]; if (o) setTool(o.dataset.clTool); }
      else if (key === 'Escape' || key === 'Tab') { if (key === 'Escape') event.preventDefault(); closeTools(key === 'Escape'); }
      else if (key.length === 1) { const opts = $$('[data-cl-tool-list] [role="option"]'); const i = opts.findIndex((o, n) => n > 0 && o.textContent.trim().toLowerCase().startsWith(key.toLowerCase())); if (i >= 0) { toolActive = i; moveTool(0); } }
      return;
    }
    if (target.closest?.('[data-cl-tool-btn]') && (key === 'ArrowDown' || key === 'ArrowUp')) { event.preventDefault(); openTools(); return; }
    const weekBtn = target.closest?.('[data-cl-week]');
    if (weekBtn && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const btns = $$('[data-cl-week]');
      const i = btns.indexOf(weekBtn);
      const next = key === 'Home' ? 0 : key === 'End' ? btns.length - 1 : (i + (key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
      setWeek(Number(btns[next].dataset.clWeek));
      return;
    }
    const tab = target.closest?.('[data-cl-table-tab]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const kind = key === 'Home' ? 'semaine' : key === 'End' ? 'general' : state.table === 'semaine' ? 'general' : 'semaine';
      selectTable(kind, true);
    }
  });

  const dialog = $('[data-cl-member]');
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMember(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeMember(); });

  window.addEventListener('popstate', () => {
    const before = { week: state.week, tool: state.tool };
    readURL();
    if (before.week !== state.week || before.tool !== state.tool) { renderHero(); renderView(true); }
    else {
      $$('[data-cl-table-tab]').forEach(b => { const on = b.dataset.clTableTab === state.table; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      $$('.cl-levels [data-cl-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clLevel === state.level)));
      renderTable();
    }
    if (state.member) openMember(state.member, null, false);
    else if (dialog.open) closeMember(false);
  });

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */

  V.initHeader();
  V.initTweaks({
    key: 'vysora-classements-reglages-v1',
    apparence: [
      { name: 'palmares', legend: 'Mise en page du palmarès', options: [['rangees', 'Rangées'], ['colonnes', 'Deux colonnes']] },
      { name: 'preuves', legend: 'Preuves du premier', options: [['detaillees', 'Détaillées'], ['resumees', 'Résumées']] },
      { name: 'mesure', legend: 'Mesure affichée', options: [['faits', 'Membres et votes'], ['points', 'Points']] },
      { name: 'teintes', legend: 'Couleurs des contributions', options: [['palette', 'Une par contribution', '#1BAF7A'], ['accent', 'Couleur d’accent', '#2563EB']] },
      { name: 'bande', legend: 'Section du défi', options: [['sombre', 'Sombre', '#0A0A0A'], ['bleue', 'Bleue', '#1D4ED8'], ['claire', 'Claire', '#F5F5F5']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { palmares: 'rangees', preuves: 'detaillees', mesure: 'faits', teintes: 'palette', bande: 'sombre' },
    onChange: changed => {
      if (changed === 'init') return;
      if (changed === 'motion') observeReveal($('[data-cl-view]'));
    }
  });
  state.view = V.etats.membre() ? 'membre' : 'visiteur';
  V.etats.on((etat, changed) => {
    if (!changed.includes('session') && !changed.includes('niveau')) return;
    state.view = V.etats.membre() ? 'membre' : 'visiteur';
    renderHero();
    renderView();
  });
  V.fixTypography(document.querySelector('.site-footer'));
  V.fixTypography(document.querySelector('.cl-hero'));
  readURL();
  renderHero();
  renderView();
  if (state.member) openMember(state.member, null, false);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
})();
