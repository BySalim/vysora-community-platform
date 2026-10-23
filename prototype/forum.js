'use strict';

/* Forum de questions et réponses : liste, question, poser une question, étiquettes, membres. */

(() => {
  const V = window.Vysora;
  const X = window.VYSORA_EXPLORER;
  const F = window.VYSORA_FORUM;
  const M = window.VysoraGuides;
  const { D, $, $$, fmt, esc, t, typo, plural, icon, store, logo, avatar, toast, dateLabel, mediaHTML } = V;
  const { tokenize, hits, highlight, fold, guides, byId, fullModel, isMine } = M;

  const KINDS = {
    question: { label: 'Question', plural: 'Questions', icon: 'help', letter: 'A', asked: 'a posé', posted: 'Posée', hint: 'Vous cherchez comment obtenir un résultat ou utiliser un outil.' },
    clinique: { label: 'Clinique du prompt', plural: 'Cliniques du prompt', icon: 'scan', letter: 'B', asked: 'a soumis', posted: 'Soumise', hint: 'Un prompt ne donne pas le résultat attendu : faites-le examiner.' },
    astuce: { label: 'Astuce', plural: 'Astuces', icon: 'bulb', letter: 'C', asked: 'a partagé', posted: 'Partagée', hint: 'Une méthode qui fonctionne, preuve avant et après à l’appui.' },
    retour: { label: 'Retour d’expérience', plural: 'Retours d’expérience', icon: 'route', letter: 'D', asked: 'a publié', posted: 'Publié', hint: 'Ce que vous avez ajusté au fil d’un projet, et pourquoi.' },
    discussion: { label: 'Discussion', plural: 'Discussions', icon: 'users', letter: 'E', asked: 'a lancé', posted: 'Lancée', hint: 'Une question ouverte, sans réponse unique.' }
  };
  const ORDER = ['question', 'clinique', 'astuce', 'retour', 'discussion'];
  const SOLVABLE = new Set(['question', 'clinique']);
  const TABS = [['recentes', 'Récentes'], ['actives', 'Actives'], ['sans-reponse', 'Sans réponse'], ['utiles', 'Plus utiles']];
  const PER_PAGE = 10;
  const YOU = 'Vous';
  const NOW = new Date(F.now);
  const LAST_VISIT = store.get('vysora-forum-visite', '2026-10-13T09:00') || '2026-10-13T09:00';
  const E = V.etats;
  const membre = () => E.membre();
  /* Les contributions du membre connecté restent publiques : un visiteur les voit sous son pseudo.
     Ce qui lui est propre (votes, suivis, enregistrements) n'apparaît que s'il est connecté. */
  const LEVEL = name => (name === YOU ? E.niveau().nom : X.levels[name] || 'Membre');
  const first = name => (name === YOU ? (membre() ? 'Vous' : E.MOI.nom.split(' ')[0]) : name.split(' ')[0]);
  const shown = name => (name === YOU && !membre() ? E.MOI.nom : name);
  const has = (set, id) => membre() && set.has(id);
  let page = { vue: 'lecteur' };
  const HELP = {
    'qa-n-title': ['Écrire un bon titre', 'Votre titre résume le problème en une phrase, comme si vous le posiez à un collègue.', ['Mentionnez le résultat obtenu, pas seulement l’outil.', 'Évitez « Aide » ou « Problème » seuls : ils ne disent rien du sujet.']],
    'qa-n-tool': ['L’outil et sa version', 'Une solution peut dépendre de la version du modèle. Les membres qui utilisent le même outil verront votre question en premier.', []],
    'qa-n-context': ['Le contexte', 'Une ou deux phrases sur votre projet aident les membres à proposer une correction adaptée.', ['Par exemple : une série de portraits pour un album illustré.']],
    'qa-n-prompt': ['Le prompt utilisé', 'Collez le prompt exact, tel que vous l’avez envoyé. Un résumé fait perdre les détails qui expliquent souvent le problème.', []],
    'qa-n-got': ['Le résultat obtenu', 'Décrivez ce que l’IA a produit, avec un exemple précis si possible.', []],
    'qa-n-expected': ['Le résultat attendu', 'Décrivez ce que vous vouliez obtenir. L’écart entre les deux guide les réponses.', []],
    'qa-n-before': ['Le prompt avant', 'Le prompt d’origine, avant votre changement.', []],
    'qa-n-after': ['Le prompt après', 'Le prompt corrigé : les différences seront surlignées pour les lecteurs.', []],
    'qa-n-body': ['Le détail de votre question', 'Dites ce que vous avez déjà essayé, ce qui s’est passé, et ce que vous attendiez.', ['Une seule question par sujet.', 'Les exemples concrets reçoivent des réponses plus précises.']],
    'qa-n-tags': ['Les étiquettes', 'De une à cinq étiquettes décrivent le thème. Les membres suivent les étiquettes qui les concernent.', ['Exemples : logo, script, traduction.']]
  };

  /* ------------------------------------------------------------------ */
  /* Dates                                                                */
  /* ------------------------------------------------------------------ */

  const parse = iso => new Date(iso.length === 10 ? `${iso}T12:00` : iso);
  const minutes = iso => Math.max(0, Math.round((NOW - parse(iso)) / 60000));
  const calendarDays = iso => Math.round((parse(F.now.slice(0, 10)) - parse(iso.slice(0, 10))) / 86400000);
  function ago(iso) {
    const m = minutes(iso);
    if (m < 1) return 'à l’instant';
    if (m < 60) return `il y a ${m} min`;
    if (calendarDays(iso) === 0) return `il y a ${Math.floor(m / 60)} h`;
    const days = calendarDays(iso);
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} jours`;
    return `le ${dateLabel(iso.slice(0, 10), false)}`;
  }
  function waited(iso) {
    const m = minutes(iso);
    if (m < 60) return `${Math.max(1, m)} min`;
    if (m < 60 * 24) return `${Math.floor(m / 60)} h`;
    return plural(Math.floor(m / 1440), 'jour', 'jours');
  }

  /* ------------------------------------------------------------------ */
  /* Contributions du visiteur                                            */
  /* ------------------------------------------------------------------ */

  const setOf = key => new Set((store.get(key, []) || []).filter(v => typeof v === 'string'));
  const own = {
    topics: (store.get('vysora-forum-sujets', []) || []).filter(s => s && s.id && KINDS[s.kind]),
    replies: store.get('vysora-forum-reponses', {}) || {},
    accepts: store.get('vysora-forum-solutions', {}) || {},
    useful: setOf('vysora-forum-utiles'),
    tested: setOf('vysora-forum-testes'),
    follows: setOf('vysora-forum-suivis'),
    saved: setOf('vysora-forum-enregistres'),
    read: setOf('vysora-forum-lus'),
    statuts: store.get('vysora-forum-statuts', {}) || {}
  };
  const persist = () => {
    store.set('vysora-forum-sujets', own.topics);
    store.set('vysora-forum-reponses', own.replies);
    store.set('vysora-forum-solutions', own.accepts);
    store.set('vysora-forum-utiles', [...own.useful]);
    store.set('vysora-forum-testes', [...own.tested]);
    store.set('vysora-forum-suivis', [...own.follows]);
    store.set('vysora-forum-enregistres', [...own.saved]);
    store.set('vysora-forum-lus', [...own.read]);
    store.set('vysora-forum-statuts', own.statuts);
  };

  /* ------------------------------------------------------------------ */
  /* Modèle                                                               */
  /* ------------------------------------------------------------------ */

  const PITS = new Map();
  guides.forEach(g => g.pitfalls.forEach((p, k) => { if (p.topic) PITS.set(p.topic, { guide: g, pit: p, rank: k }); }));
  const tagKey = tag => fold(tag).trim().replace(/\s+/g, '-');

  function enrich(s, mine = false) {
    const acceptId = own.accepts[s.id];
    const replies = [...(s.replies || []), ...(own.replies[s.id] || [])].map(r => (acceptId === r.id ? { ...r, accepted: true, acceptedAt: own.accepts[`${s.id}@at`] || F.now } : r));
    const accepted = replies.find(r => r.accepted) || null;
    return {
      ...s, mine, replies, accepted,
      status: own.statuts[s.id] || s.status,
      closedBy: own.statuts[s.id] === 'closed' ? YOU : s.closedBy,
      tagKeys: s.tags.map(tagKey),
      last: [s.at, ...replies.map(r => r.at)].sort().pop(),
      lastActor: replies.length ? replies[replies.length - 1].author : s.author,
      people: [...new Set([s.author, ...replies.map(r => r.author)])],
      link: PITS.get(s.id) || null,
      href: `forum.html?sujet=${encodeURIComponent(s.id)}`,
      text: ` ${fold([s.title, s.body, s.tags.join(' '), s.tool, s.model, s.domain, s.clinic ? Object.values(s.clinic).join(' ') : '', s.tip ? `${s.tip.before} ${s.tip.after}` : '', ...replies.map(r => r.text)].join(' '))}`,
      titleText: ` ${fold(`${s.title} ${s.tags.join(' ')}`)}`
    };
  }
  let topics = [];
  const rebuild = () => { topics = [...own.topics.map(s => enrich(s, true)), ...F.topics.map(s => enrich(s))]; };
  rebuild();
  const topicById = id => {
    const s = topics.find(o => o.id === id);
    return s && membre() && page.vue === 'auteur' && state.view === 'question' && id === state.topic && !s.mine ? { ...s, mine: true, author: YOU } : s;
  };
  const canClose = s => membre() && (s.mine || E.get().role !== 'membre');

  function stateOf(s) {
    if (s.status === 'closed') return 'closed';
    const others = s.replies.filter(r => r.author !== s.author).length;
    if (SOLVABLE.has(s.kind)) return s.accepted ? 'resolved' : others ? 'answered' : 'waiting';
    return others ? 'open' : 'waiting';
  }
  const readKey = s => `${s.id}@${s.last}`;
  const isNew = s => s.last > LAST_VISIT && !own.read.has(readKey(s)) && s.author !== YOU;
  const votes = s => s.useful + (own.useful.has(s.id) ? 1 : 0);
  const replyVotes = r => (r.useful || 0) + (own.useful.has(r.id) ? 1 : 0);
  const testedCount = (id, base = 0) => base + (own.tested.has(id) ? 1 : 0);
  const reproductions = s => (s.accepted && s.accepted.tested ? testedCount(s.accepted.id, s.accepted.tested) : s.tip ? testedCount(s.id, s.tip.tested) : 0);
  const toolLabel = s => (s.tool ? fullModel([s.tool, s.model]) : 'Outil non précisé');
  const pairHTML = pair => `<span class="qa-tool">${logo(pair[0], 16)}${t(fullModel(pair))}</span>`;
  const firstSentence = text => { const m = typo(text).match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : typo(text); };
  const who = (name, size = 28) => (name === YOU ? `<span class="avatar qa-you" style="width:${size}px;height:${size}px" aria-hidden="true">${icon('user', '')}</span>` : avatar(name, size));
  const rich = text => t(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

  /* Membres : réputation calculée à partir des contributions */
  const BASE = { Apprenti: 60, Curieux: 30, Artisan: 420, Expert: 1240, Maître: 2680, Membre: 1 };
  function memberStats() {
    const map = new Map();
    const get = name => { if (!map.has(name)) map.set(name, { name, questions: 0, answers: 0, accepted: 0, useful: 0, tools: new Map() }); return map.get(name); };
    topics.forEach(s => {
      const a = get(s.author);
      a.questions += 1;
      a.useful += votes(s);
      if (s.tool) a.tools.set(s.tool, (a.tools.get(s.tool) || 0) + 1);
      s.replies.forEach(r => {
        const m = get(r.author);
        m.answers += 1;
        m.useful += replyVotes(r);
        if (r.accepted) m.accepted += 1;
        if (s.tool) m.tools.set(s.tool, (m.tools.get(s.tool) || 0) + 1);
      });
    });
    F.helpers.forEach(h => { const m = get(h.name); m.accepted = Math.max(m.accepted, h.accepted); m.answers = Math.max(m.answers, h.answers); h.tools.forEach(tool => m.tools.set(tool, (m.tools.get(tool) || 0) + 2)); });
    map.forEach(m => { m.level = LEVEL(m.name); m.rep = (BASE[m.level] || 1) + m.useful * 5 + m.accepted * 15 + m.answers * 2; m.topTools = [...m.tools.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tool]) => tool); });
    map.delete(YOU);
    return [...map.values()];
  }
  let MEMBERS = new Map(memberStats().map(m => [m.name, m]));
  const repOf = name => (MEMBERS.get(name) ? MEMBERS.get(name).rep : 1);

  /* Différences entre deux prompts, mot à mot */
  const norm = word => fold(word).trim();
  function diffWords(a, b) {
    const A = String(a).split(/\s+/).filter(Boolean);
    const B = String(b).split(/\s+/).filter(Boolean);
    const n = A.length;
    const m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    const push = (type, word, before = word) => { const last = out[out.length - 1]; if (last && last.type === type) { last.words.push(word); last.before.push(before); } else out.push({ type, words: [word], before: [before] }); };
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (norm(A[i]) === norm(B[j])) { push('same', B[j], A[i]); i += 1; j += 1; }
      else if (L[i + 1][j] >= L[i][j + 1]) { push('del', A[i]); i += 1; }
      else { push('add', B[j]); j += 1; }
    }
    while (i < n) { push('del', A[i]); i += 1; }
    while (j < m) { push('add', B[j]); j += 1; }
    return out;
  }
  function diffHTML(a, b, show = { add: true, del: true }) {
    return diffWords(a, b).map(seg => {
      if (seg.type === 'same') return show.add ? t(seg.words.join(' ')) : t(seg.before.join(' '));
      const text = t(seg.words.join(' '));
      if (seg.type === 'add') return show.add ? `<ins><span class="sr-only">Ajouté : </span>${text}</ins>` : '';
      return show.del ? `<del><span class="sr-only">Retiré : </span>${text}</del>` : '';
    }).filter(Boolean).join(' ');
  }
  const diffLegend = '<p class="qa-legend" aria-hidden="true"><span><ins>ajouté</ins></span><span><del>retiré</del></span></p>';

  /* ------------------------------------------------------------------ */
  /* État et adresse                                                      */
  /* ------------------------------------------------------------------ */

  const blankFilter = () => ({ noAnswer: false, noAccepted: false, withFix: false, kinds: [], mine: false, sort: '' });
  const state = { view: 'questions', tab: 'recentes', q: '', tag: '', tool: '', author: '', page: 1, topic: null, answerSort: 'utiles', quote: null, composeKind: 'question', filter: blankFilter(), filterOpen: false, tagQuery: '', tagSort: 'populaires', memberSort: 'reputation', typing: {} };

  function readURL() {
    const p = new URLSearchParams(location.search);
    const hash = decodeURIComponent(location.hash.slice(1));
    state.topic = p.get('sujet') || (/^(sujet|v)-/.test(hash) ? hash : null);
    const view = p.get('vue');
    state.view = state.topic ? 'question' : p.has('nouveau') ? 'poser' : ['etiquettes', 'membres'].includes(view) ? view : 'questions';
    state.tab = TABS.some(([k]) => k === p.get('onglet')) ? p.get('onglet') : view === 'sans-reponse' ? 'sans-reponse' : 'recentes';
    state.q = (p.get('q') || '').trim();
    state.tag = p.get('etiquette') || '';
    state.tool = p.get('outil') && V.TOOL_BY_NAME[p.get('outil')] ? p.get('outil') : '';
    state.author = p.get('membre') || '';
    state.page = Math.max(1, Number(p.get('page')) || 1);
    const kind = p.get('type') || p.get('salon');
    state.filter = blankFilter();
    if (KINDS[kind]) state.filter.kinds = [kind];
    if (state.view === 'poser') state.composeKind = KINDS[p.get('nouveau')] ? p.get('nouveau') : 'question';
  }
  function writeURL(push = true) {
    const p = new URLSearchParams();
    if (state.view === 'question') p.set('sujet', state.topic);
    else if (state.view === 'poser') p.set('nouveau', state.composeKind);
    else if (state.view === 'etiquettes' || state.view === 'membres') p.set('vue', state.view);
    else {
      if (state.tab !== 'recentes') p.set('onglet', state.tab);
      if (state.q) p.set('q', state.q);
      if (state.tag) p.set('etiquette', state.tag);
      if (state.tool) p.set('outil', state.tool);
      if (state.author) p.set('membre', state.author);
      if (state.filter.kinds.length === 1) p.set('type', state.filter.kinds[0]);
      if (state.page > 1) p.set('page', String(state.page));
    }
    const url = `${location.pathname}${p.size ? `?${p}` : ''}`;
    if (url !== `${location.pathname}${location.search}` || location.hash) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  /* ------------------------------------------------------------------ */
  /* Menu                                                                 */
  /* ------------------------------------------------------------------ */

  function renderMenu() {
    const waiting = topics.filter(s => stateOf(s) === 'waiting').length;
    const mine = topics.filter(s => s.mine || s.replies.some(r => r.author === YOU)).length;
    const item = (key, label, ic, count = null, active = false) => `<li><a href="${key === 'questions' ? 'forum.html' : key === 'sans-reponse' ? 'forum.html?onglet=sans-reponse' : `forum.html?vue=${key}`}" data-menu-go="${key}"${active ? ' aria-current="page"' : ''}>${icon(ic)}<span>${t(label)}</span>${count !== null ? `<small>${fmt(count)}</small>` : ''}</a></li>`;
    const onList = state.view === 'questions' || state.view === 'question' || state.view === 'poser';
    $('[data-qa-menu]').innerHTML = `
      <ul>
        ${item('questions', 'Questions', 'message', null, onList && state.tab !== 'sans-reponse')}
        ${item('sans-reponse', 'Sans réponse', 'clock', waiting, state.view === 'questions' && state.tab === 'sans-reponse')}
        ${item('etiquettes', 'Étiquettes', 'hash', null, state.view === 'etiquettes')}
        ${item('membres', 'Membres', 'users', null, state.view === 'membres')}
      </ul>
      ${membre() && (mine || own.saved.size) ? `<p class="qa-menu-label">Pour vous</p><ul>
        ${mine ? `<li><a href="forum.html" data-menu-mine>${icon('user')}<span>Vos sujets</span><small>${fmt(mine)}</small></a></li>` : ''}
        ${own.saved.size ? `<li><a href="forum.html" data-menu-saved>${icon('bookmark')}<span>Enregistrés</span><small>${fmt(own.saved.size)}</small></a></li>` : ''}
      </ul>` : ''}
      <a class="qa-menu-guide" href="explorer.html">${icon('route')}<span><b>Les guides d’Explorer</b>La méthode qui ressort des parcours, piège par piège.</span></a>`;
  }

  /* ------------------------------------------------------------------ */
  /* Liste des questions                                                  */
  /* ------------------------------------------------------------------ */

  function parseQuery(q) {
    const tags = [...q.matchAll(/\[([^\]]+)\]/g)].map(m => tagKey(m[1]));
    return { tags, text: q.replace(/\[[^\]]+\]/g, ' ').trim() };
  }
  function listed() {
    const { tags, text } = parseQuery(state.q);
    const tk = tokenize(text);
    const f = state.filter;
    let list = topics.filter(s => (!tk.length || tk.every(v => hits(s.text, v)))
      && tags.every(tag => s.tagKeys.includes(tag) || tagKey(s.tool) === tag)
      && (!state.tag || s.tagKeys.includes(state.tag))
      && (!state.tool || s.tool === state.tool)
      && (!state.author || s.people.includes(state.author))
      && (!f.kinds.length || f.kinds.includes(s.kind))
      && (!f.noAnswer || !s.replies.filter(r => r.author !== s.author).length)
      && (!f.noAccepted || (SOLVABLE.has(s.kind) && !s.accepted))
      && (!f.withFix || s.replies.some(r => r.prompt) || s.tip)
      && (!f.mine || isMine(s.tool))
      && (state.tab !== 'sans-reponse' || stateOf(s) === 'waiting'));
    const sort = f.sort || state.tab;
    const sorters = {
      recentes: (a, b) => b.at.localeCompare(a.at),
      actives: (a, b) => b.last.localeCompare(a.last),
      'sans-reponse': (a, b) => a.at.localeCompare(b.at),
      utiles: (a, b) => votes(b) - votes(a),
      reproduites: (a, b) => reproductions(b) - reproductions(a) || votes(b) - votes(a)
    };
    list = list.sort(sorters[sort] || sorters.recentes);
    return { list, tk, tags };
  }

  function tagsHTML(s, max = 5) {
    return `<ul class="qa-tags" aria-label="Étiquettes">${s.tool ? `<li><a class="qa-tag is-tool" href="forum.html?outil=${encodeURIComponent(s.tool)}" data-tool="${esc(s.tool)}">${logo(s.tool, 14)}${t(toolLabel(s))}</a></li>` : ''}${s.tags.slice(0, max).map(tag => `<li><a class="qa-tag" href="forum.html?etiquette=${encodeURIComponent(tagKey(tag))}" data-tag="${esc(tagKey(tag))}">${t(tag.toLowerCase())}</a></li>`).join('')}</ul>`;
  }

  function summaryHTML(s, tk) {
    const st = stateOf(s);
    const n = s.replies.length;
    const rep = reproductions(s);
    const actor = s.lastActor;
    const action = n && s.last !== s.at ? `${actor === YOU && membre() ? 'avez répondu' : 'a répondu'}` : (s.author === YOU && membre() ? KINDS[s.kind].asked.replace(/^a /, 'avez ') : KINDS[s.kind].asked);
    const actorName = n && s.last !== s.at ? actor : s.author;
    return `<li class="qa-summary${isNew(s) ? ' is-new' : ''}">
      <div class="qa-stats">
        <span class="qa-stat"><b>${fmt(votes(s))}</b> ${votes(s) > 1 ? 'votes' : 'vote'}</span>
        <span class="qa-stat is-answers${st === 'resolved' ? ' is-accepted' : n ? ' has-answers' : ''}">${st === 'resolved' ? icon('accept') : ''}<b>${fmt(n)}</b> ${n > 1 ? 'réponses' : 'réponse'}</span>
        ${rep ? `<span class="qa-stat is-tested"><b>${fmt(rep)}</b> ${rep > 1 ? 'reproductions' : 'reproduction'}</span>` : ''}
      </div>
      <div class="qa-sum-main">
        <h3 class="qa-sum-title">${isNew(s) ? '<span class="qa-new" aria-hidden="true"></span>' : ''}<a href="${s.href}" data-open="${esc(s.id)}">${highlight(s.title, tk)}</a>${isNew(s) ? '<span class="sr-only"> (nouvelle activité)</span>' : ''}</h3>
        <p class="qa-sum-excerpt">${t(firstSentence(s.body || (s.clinic ? s.clinic.got : '')))}${s.accepted ? ` <span class="qa-sum-solution">${icon('accept')}Solution de ${t(first(s.accepted.author))}</span>` : ''}</p>
        <div class="qa-sum-foot">
          <span class="qa-kind">${icon(KINDS[s.kind].icon)}${t(KINDS[s.kind].label)}</span>${st === 'closed' ? `<span class="qa-kind is-closed">${icon('lock')}Fermé</span>` : ''}
          ${tagsHTML(s, 3)}
          <p class="qa-sum-user">${who(actorName, 18)}<a href="forum.html?membre=${encodeURIComponent(actorName)}" data-author="${esc(actorName)}">${t(shown(actorName))}</a><span class="qa-rep" title="Réputation">${actorName === YOU ? '' : fmt(repOf(actorName))}</span><span class="qa-sum-when">${t(action)} ${t(ago(n && s.last !== s.at ? s.last : s.at))}</span></p>
        </div>
      </div>
    </li>`;
  }

  function filterPanelHTML() {
    const f = state.filter;
    const check = (key, label) => `<label class="ex-check"><input type="checkbox" data-f="${key}"${f[key] ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icon('check', '')}</span><span>${t(label)}</span></label>`;
    const hasTools = M.myTools().size > 0;
    return `<form class="qa-filter" data-filter-form aria-label="Filtrer les sujets">
      <fieldset><legend>Afficher</legend>${check('noAnswer', 'Sans réponse')}${check('noAccepted', 'Sans réponse acceptée')}${check('withFix', 'Avec un prompt corrigé')}${hasTools ? check('mine', 'Sur mes outils') : ''}</fieldset>
      <fieldset><legend>Type de sujet</legend>${ORDER.map(k => `<label class="ex-check"><input type="checkbox" data-f-kind="${k}"${f.kinds.includes(k) ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icon('check', '')}</span><span>${t(KINDS[k].plural)}</span></label>`).join('')}</fieldset>
      <fieldset><legend>Trier par</legend>${[['', 'Selon l’onglet'], ['recentes', 'Les plus récents'], ['actives', 'Activité récente'], ['utiles', 'Les plus utiles'], ['reproduites', 'Les plus reproduits']].map(([key, label]) => `<label class="qa-radio"><input type="radio" name="qa-sort" value="${key}"${f.sort === key ? ' checked' : ''}><span>${t(label)}</span></label>`).join('')}</fieldset>
      <div class="qa-filter-actions"><button class="btn btn-primary btn-sm" type="submit">Appliquer le filtre</button><button class="link-btn" type="button" data-filter-cancel>Annuler</button>${hasTools ? '' : `<button class="link-btn" type="button" data-open-tools>${icon('wrench')}Indiquer mes outils</button>`}</div>
    </form>`;
  }

  function activeFilters() {
    const out = [];
    if (state.tag) out.push(['tag', `[${state.tag}]`]);
    if (state.tool) out.push(['tool', state.tool]);
    if (state.author) out.push(['author', `Membre : ${state.author}`]);
    const f = state.filter;
    if (f.noAnswer) out.push(['noAnswer', 'Sans réponse']);
    if (f.noAccepted) out.push(['noAccepted', 'Sans réponse acceptée']);
    if (f.withFix) out.push(['withFix', 'Avec un prompt corrigé']);
    if (f.mine) out.push(['mine', 'Sur mes outils']);
    f.kinds.forEach(k => out.push([`kind:${k}`, KINDS[k].plural]));
    return out;
  }

  function renderQuestions() {
    const { list, tk } = listed();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const shown = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    const filters = activeFilters();
    const heading = state.q ? 'Résultats de recherche' : state.tag ? `Sujets étiquetés [${state.tag}]` : state.tool ? `Sujets sur ${state.tool}` : state.author ? `Sujets de ${state.author}` : state.filter.kinds.length === 1 ? KINDS[state.filter.kinds[0]].plural : state.tab === 'sans-reponse' ? 'Sujets sans réponse' : 'Tous les sujets';
    document.title = `${heading} · Forum · Vysora`;
    const pager = pages > 1 ? `<nav class="qa-pager" aria-label="Pagination">${state.page > 1 ? `<button type="button" data-page="${state.page - 1}">Précédente</button>` : ''}${Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i + 1}"${i + 1 === state.page ? ' aria-current="page"' : ''}>${i + 1}</button>`).join('')}${state.page < pages ? `<button type="button" data-page="${state.page + 1}">Suivante</button>` : ''}</nav>` : '';
    $('[data-qa-page]').innerHTML = `
      <div class="qa-main">
        <header class="qa-list-head">
          <div class="qa-list-title"><h1 id="qa-title" tabindex="-1">${t(heading)}</h1><a class="btn btn-primary" href="forum.html?nouveau=question" data-ask>${icon('plus')}Poser une question</a></div>
          ${state.tag || state.tool ? `<p class="qa-tag-intro">${state.tool ? `${logo(state.tool, 18)}Les questions et astuces sur ${t(state.tool)}, toutes versions confondues. ${isMine(state.tool) ? 'Vous suivez cet outil.' : `<button class="link-btn" type="button" data-open-tools>Suivre cet outil</button>`}` : 'Les sujets qui portent cette étiquette, du plus récent au plus ancien.'}</p>` : ''}
          <form class="qa-search" role="search" data-search>
            <label class="sr-only" for="qa-q">Rechercher dans le forum</label>
            ${icon('search', '')}
            <input id="qa-q" type="search" autocomplete="off" spellcheck="false" value="${esc(state.q)}" placeholder="Rechercher un sujet, ou [étiquette]" aria-describedby="qa-q-help">
            <kbd aria-hidden="true">/</kbd>
          </form>
          <p class="sr-only" id="qa-q-help">Entourez un mot de crochets pour chercher une étiquette.</p>
          <div class="qa-bar">
            <p class="qa-count" role="status" aria-live="polite">${plural(list.length, 'sujet', 'sujets')}</p>
            <div class="qa-tabs" role="group" aria-label="Classer les sujets">${TABS.map(([key, label]) => `<button type="button" data-tab="${key}" aria-pressed="${state.tab === key}">${t(label)}</button>`).join('')}</div>
            <button class="qa-filter-btn" type="button" data-filter-toggle aria-expanded="${state.filterOpen}">${icon('filter')}<span>Filtrer</span>${filters.length ? `<small>${fmt(filters.length)}</small>` : ''}</button>
          </div>
          ${state.filterOpen ? filterPanelHTML() : ''}
          ${filters.length ? `<div class="qa-active">${filters.map(([key, label]) => `<span class="qa-chip">${t(label)}<button type="button" data-unfilter="${esc(key)}" aria-label="Retirer le filtre ${esc(label)}">${icon('close')}</button></span>`).join('')}<button class="link-btn" type="button" data-reset>Tout effacer</button></div>` : ''}
        </header>
        ${shown.length ? `<ol class="qa-list">${shown.map(s => summaryHTML(s, tk)).join('')}</ol>` : `<div class="qa-empty"><p><b>Aucun sujet ne correspond.</b> ${state.q ? `Personne n’a encore écrit sur « ${t(state.q)} ».` : 'Élargissez les filtres.'} Posez la question : les membres qui utilisent le même outil la verront.</p><div><button class="btn btn-secondary btn-sm" type="button" data-reset>${icon('replay')}Voir tous les sujets</button><a class="btn btn-primary btn-sm" href="forum.html?nouveau=question" data-ask data-prefill>${icon('plus')}Poser une question</a></div></div>`}
        ${pager}
      </div>
      <aside class="qa-side" aria-label="Autour des questions">${sideHTML()}</aside>`;
    V.fixTypography($('[data-qa-page]'));
  }

  function sideHTML() {
    const hot = [...topics].filter(s => calendarDays(s.last) < 7).sort((a, b) => votes(b) + b.replies.length * 3 - votes(a) - a.replies.length * 3).slice(0, 5);
    const helpers = [...MEMBERS.values()].sort((a, b) => b.accepted - a.accepted || b.rep - a.rep).slice(0, 5);
    const mine = [...M.myTools()];
    const learned = topics.filter(s => s.link).sort((a, b) => b.last.localeCompare(a.last)).slice(0, 3);
    return `
      <section class="qa-box is-guide" aria-labelledby="qa-good-title">
        <h2 id="qa-good-title">${icon('scan')}Bien poser sa question</h2>
        <ol class="qa-steps-mini"><li>Copiez le prompt exact.</li><li>Décrivez le résultat obtenu et le résultat attendu.</li><li>Indiquez l’outil et la version du modèle.</li><li>Ajoutez une à cinq étiquettes.</li></ol>
        <a class="link-arrow" href="forum.html?nouveau=clinique" data-ask="clinique">Ouvrir une clinique du prompt${icon('arrow')}</a>
      </section>
      <section class="qa-box" aria-labelledby="qa-watch-title">
        <h2 id="qa-watch-title">${icon('wrench')}Vos outils suivis</h2>
        ${mine.length ? `<ul class="qa-tags is-wrap">${mine.map(tool => `<li><a class="qa-tag is-tool" href="forum.html?outil=${encodeURIComponent(tool)}" data-tool="${esc(tool)}">${logo(tool, 14)}${t(tool)}</a></li>`).join('')}</ul><button class="link-btn" type="button" data-open-tools>Modifier</button>` : `<p>Suivez vos outils : les questions qui les concernent apparaîtront ici.</p><button class="btn btn-secondary btn-sm" type="button" data-open-tools>${icon('plus')}Suivre des outils</button>`}
      </section>
      <section class="qa-box" aria-labelledby="qa-hot-title">
        <h2 id="qa-hot-title">${icon('trend-up')}Les plus suivis cette semaine</h2>
        <ul class="qa-hot">${hot.map(s => `<li><span class="qa-hot-votes${s.accepted ? ' is-accepted' : ''}">${fmt(votes(s))}</span><a href="${s.href}" data-open="${esc(s.id)}">${t(s.title)}</a></li>`).join('')}</ul>
      </section>
      <section class="qa-box" aria-labelledby="qa-helpers-title">
        <h2 id="qa-helpers-title">${icon('award')}Ils répondent le plus</h2>
        <ol class="qa-people">${helpers.map(m => `<li>${who(m.name, 32)}<span><a href="forum.html?membre=${encodeURIComponent(m.name)}" data-author="${esc(m.name)}">${t(m.name)}</a><small>${fmt(m.rep)} de réputation · ${plural(m.accepted, 'solution', 'solutions')}</small></span></li>`).join('')}</ol>
      </section>
      <section class="qa-box" aria-labelledby="qa-learned-title">
        <h2 id="qa-learned-title">${icon('route')}Du forum aux guides</h2>
        <ul class="qa-hot">${learned.map(s => `<li><span class="ex-ring" aria-hidden="true"></span><a href="${s.link.guide.href}#piege-${s.link.rank + 1}">${t(s.link.pit.title)}<small>Guide « ${t(s.link.guide.short)} »</small></a></li>`).join('')}</ul>
      </section>`;
  }

  /* ------------------------------------------------------------------ */
  /* Page d'une question                                                  */
  /* ------------------------------------------------------------------ */

  const PROMPTS = new Map();
  const promptBlock = (text, id, label) => { PROMPTS.set(id, text); return `<div class="qa-prompt"><pre><code>${t(text)}</code></pre><button class="qa-copy" type="button" data-copy="${esc(id)}">${icon('copy')}<span>Copier<span class="sr-only"> ${t(label)}</span></span></button></div>`; };

  function opBlockHTML(s) {
    if (s.clinic) {
      return `<div class="qa-diag">
        <p class="qa-label">Prompt utilisé</p>
        ${promptBlock(s.clinic.prompt, `${s.id}-prompt`, 'le prompt utilisé')}
        <div class="qa-gap">
          <div class="is-got"><p class="qa-label">${icon('x')}Résultat obtenu</p><p>${rich(s.clinic.got)}</p></div>
          <div class="is-expected"><p class="qa-label">${icon('check')}Résultat attendu</p><p>${rich(s.clinic.expected)}</p></div>
        </div>
      </div>`;
    }
    if (s.tip) {
      PROMPTS.set(`${s.id}-after`, s.tip.after);
      return `<div class="qa-tip">
        <div class="qa-tip-grid">
          <div class="is-before"><p class="qa-label">Avant</p><p class="qa-diff">${diffHTML(s.tip.before, s.tip.after, { add: false, del: true })}</p><p class="qa-tip-result">${icon('x')}${t(s.tip.beforeResult)}</p></div>
          <div class="is-after"><p class="qa-label">Après</p><p class="qa-diff">${diffHTML(s.tip.before, s.tip.after, { add: true, del: false })}</p><p class="qa-tip-result">${icon('check')}${t(s.tip.afterResult)}</p></div>
        </div>
        ${diffLegend}
        ${s.tip.testedWith.length ? `<p class="qa-tested">${icon('repeat')}<span>Vérifiée par <b>${plural(testedCount(s.id, s.tip.tested), 'membre', 'membres')}</b> avec ${s.tip.testedWith.map(pairHTML).join(', ')} · dernier test ${t(ago(s.tip.lastTest))}</span></p>` : ''}
      </div>`;
    }
    if (s.steps) return `<ol class="qa-steps">${s.steps.map((step, i) => `<li><span class="qa-step-node" aria-hidden="true">${i + 1}</span><p>${rich(step)}</p></li>`).join('')}</ol>`;
    return '';
  }

  function fixHTML(s, r) {
    if (!s.clinic) return `<div class="qa-fix"><p class="qa-label">Prompt proposé</p>${promptBlock(r.prompt, `${r.id}-prompt`, 'le prompt proposé')}</div>`;
    PROMPTS.set(`${r.id}-prompt`, r.prompt);
    return `<div class="qa-fix">
      <div class="qa-fix-head"><p class="qa-label">Prompt corrigé</p><button class="qa-copy" type="button" data-copy="${esc(r.id)}-prompt">${icon('copy')}<span>Copier<span class="sr-only"> le prompt corrigé</span></span></button></div>
      <p class="qa-diff qa-fix-diff">${diffHTML(s.clinic.prompt, r.prompt)}</p>
      <div class="qa-fix-cote">
        <div><p class="qa-label">Avant</p><p class="qa-diff">${diffHTML(s.clinic.prompt, r.prompt, { add: false, del: true })}</p></div>
        <div><p class="qa-label">Après</p><p class="qa-diff">${diffHTML(s.clinic.prompt, r.prompt, { add: true, del: false })}</p></div>
      </div>
      ${diffLegend}
    </div>`;
  }

  function usercard(name, verb, at, asker = false) {
    return `<div class="qa-usercard${asker ? ' is-asker' : ''}"><p class="qa-usercard-when">${t(verb)} ${t(ago(at))}</p><div class="qa-usercard-who">${who(name, 36)}<span><a href="forum.html?membre=${encodeURIComponent(name)}" data-author="${esc(name)}">${t(shown(name))}</a><small>${t(LEVEL(name))}${name === YOU ? '' : ` · ${fmt(repOf(name))}`}</small></span></div></div>`;
  }

  function voteColumn(id, count, { accepted = false, canAccept = false, op = false, s = null } = {}) {
    const on = has(own.useful, id);
    return `<div class="qa-vote">
      <button class="qa-vote-btn" type="button" data-useful="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Retirer votre vote utile' : 'Voter utile'}">${icon('vote', '')}</button>
      <span class="qa-vote-count" aria-label="${plural(count, 'vote utile', 'votes utiles')}">${fmt(count)}</span>
      ${accepted && !canAccept ? `<span class="qa-accepted-mark" title="Réponse acceptée par l’auteur du sujet">${icon('accept', '')}<span class="sr-only">Réponse acceptée</span></span>` : ''}
      ${canAccept ? `<button class="qa-accept-btn" type="button" data-accept="${esc(id)}" aria-label="Accepter cette réponse comme solution" title="Accepter cette réponse">${icon('accept', '')}</button>` : ''}
      ${op ? `<button class="qa-side-btn" type="button" data-save="${esc(s.id)}" aria-pressed="${has(own.saved, s.id)}" aria-label="${has(own.saved, s.id) ? 'Retirer des enregistrements' : 'Enregistrer ce sujet'}">${icon('bookmark', '')}</button>` : ''}
    </div>`;
  }

  function answerHTML(s, r) {
    const canAccept = membre() && s.mine && SOLVABLE.has(s.kind) && !s.accepted && r.author !== YOU && s.status !== 'closed';
    return `<li class="qa-answer${r.accepted ? ' is-accepted' : ''}${r.author === YOU && membre() ? ' is-you' : ''}" id="reponse-${esc(r.id)}" tabindex="-1">
      ${voteColumn(r.id, replyVotes(r), { accepted: r.accepted, canAccept })}
      <div class="qa-post-cell">
        ${r.accepted ? `<p class="qa-accepted-note">${icon('accept')}Réponse acceptée par ${t(s.author === YOU && membre() ? 'vous' : first(s.author))}</p>` : ''}
        <div class="qa-body"><p>${rich(r.text)}</p>${r.prompt ? fixHTML(s, r) : ''}</div>
        ${r.accepted && r.tested ? `<p class="qa-tested">${icon('repeat')}<span>Reproduite par <b>${plural(testedCount(r.id, r.tested), 'membre', 'membres')}</b> avec ${r.testedWith.map(pairHTML).join(', ')} · dernier test ${t(ago(r.lastTest))}</span><button class="qa-test" type="button" data-tested="${esc(r.id)}" aria-pressed="${has(own.tested, r.id)}">${icon(has(own.tested, r.id) ? 'check' : 'repeat')}${has(own.tested, r.id) ? 'Testé' : 'Testé, ça marche'}</button></p>` : ''}
        <div class="qa-post-foot">
          <div class="qa-post-links"><button type="button" data-copy-answer="${esc(r.id)}">Partager</button>${s.status !== 'closed' ? `<button type="button" data-quote="${esc(r.id)}">Citer</button>` : ''}</div>
          ${usercard(r.author, 'Publiée', r.at, r.author === s.author)}
        </div>
      </div>
    </li>`;
  }

  function composerHTML(s) {
    if (s.status === 'closed') return `<p class="qa-closed">${icon('lock')}Ce sujet a été fermé par ${t(s.closedBy === YOU && membre() ? 'vous' : shown(s.closedBy || s.author))} : il reste lisible, les réponses sont désactivées.</p>`;
    const gate = V.invitation('contribuer', 'répondre');
    if (gate) return `<h2 class="qa-h2" id="qa-reply-title">Votre réponse</h2><p class="qa-gate">${gate}</p>`;
    const quoted = state.quote && s.replies.find(r => r.id === state.quote);
    return `<form class="qa-composer" data-reply-form="${esc(s.id)}" novalidate>
      <h2 class="qa-h2" id="qa-reply-title">Votre réponse</h2>
      ${quoted ? `<p class="qa-quote">${icon('quote')}<span>En réponse à <b>${t(quoted.author)}</b> : « ${t(firstSentence(quoted.text))} »</span><button type="button" data-unquote aria-label="Retirer la citation">${icon('close')}</button></p>` : ''}
      <div class="qa-editor">
        <div class="qa-editor-bar" role="toolbar" aria-label="Mise en forme">
          <button type="button" data-format="bold" aria-label="Gras">${icon('bold', '')}</button>
          <button type="button" data-format="code" aria-label="Code">${icon('code', '')}</button>
          ${s.clinic ? `<span class="qa-editor-sep" aria-hidden="true"></span><label class="qa-editor-fix"><input type="checkbox" data-reply-fix><span>Joindre un prompt corrigé</span></label>` : ''}
        </div>
        <label class="sr-only" for="qa-reply">Votre réponse</label>
        <textarea id="qa-reply" rows="7" placeholder="${s.mine ? 'Ajoutez une précision, ou le résultat de vos essais' : 'Ce qui a fonctionné pour vous, avec quel outil et quelle version'}" aria-describedby="qa-reply-error"></textarea>
      </div>
      <p class="ex-error" id="qa-reply-error" hidden>Écrivez au moins 20 caractères pour que votre réponse soit utile.</p>
      ${s.clinic ? `<div class="qa-reply-fix" data-reply-fix-field hidden>
        <label class="ex-label" for="qa-reply-prompt">Prompt corrigé</label>
        <textarea id="qa-reply-prompt" rows="3" spellcheck="false">${esc(s.clinic.prompt)}</textarea>
        <p class="qa-label">Aperçu des différences</p>
        <p class="qa-diff qa-preview" data-diff-preview>${t(s.clinic.prompt)}</p>
      </div>` : ''}
      <div class="qa-live" data-live-preview hidden><p class="qa-label">Aperçu</p><div class="qa-body" data-live-body></div></div>
      <div class="qa-composer-foot"><button class="btn btn-primary" type="submit">Publier votre réponse</button><p><kbd>Ctrl</kbd> + <kbd>Entrée</kbd> pour publier</p></div>
    </form>`;
  }

  function relatedTopics(s) {
    const { list } = similar(`${s.title} ${s.tags.join(' ')}`, { tool: s.tool });
    const found = list.filter(o => o.id !== s.id);
    const same = topics.filter(o => o.id !== s.id && o.domain === s.domain && !found.includes(o));
    return [...found, ...same].slice(0, 5);
  }

  function renderQuestion({ focus = true } = {}) {
    const s = topicById(state.topic);
    const page = $('[data-qa-page]');
    if (!s) {
      document.title = 'Sujet introuvable · Forum · Vysora';
      page.innerHTML = `<div class="qa-main"><h1 id="qa-title" tabindex="-1">Ce sujet n’est plus disponible</h1><p class="qa-lead">Il a peut-être été retiré par son auteur.</p><a class="btn btn-primary" href="forum.html" data-menu-go="questions">Voir tous les sujets</a></div>`;
      return;
    }
    PROMPTS.clear();
    if (!own.read.has(readKey(s))) { own.read.add(readKey(s)); persist(); }
    document.title = `${s.title} · Forum · Vysora`;
    const st = stateOf(s);
    const sorters = {
      utiles: (a, b) => (b.accepted ? 1 : 0) - (a.accepted ? 1 : 0) || replyVotes(b) - replyVotes(a),
      recentes: (a, b) => b.at.localeCompare(a.at),
      anciennes: (a, b) => a.at.localeCompare(b.at)
    };
    const answers = [...s.replies].sort(sorters[state.answerSort]);
    const creation = s.creation && byId[s.creation];
    const related = relatedTopics(s);
    const followers = s.follows + (own.follows.has(s.id) ? 1 : 0);
    page.innerHTML = `
      <div class="qa-main">
        <header class="qa-q-head">
          <div class="qa-list-title"><h1 id="qa-title" tabindex="-1">${t(s.title)}</h1><a class="btn btn-primary" href="forum.html?nouveau=question" data-ask>${icon('plus')}Poser une question</a></div>
          <p class="qa-q-meta"><span>${t(KINDS[s.kind].posted)} <b>${t(ago(s.at))}</b></span><span>Activité <b>${t(ago(s.last))}</b></span><span>Suivi par <b>${plural(followers, 'membre', 'membres')}</b></span><span class="qa-kind">${icon(KINDS[s.kind].icon)}${t(KINDS[s.kind].label)}</span></p>
        </header>
        <div class="qa-question">
          ${voteColumn(s.id, votes(s), { op: true, s })}
          <div class="qa-post-cell">
            <div class="qa-body">${s.body ? `<p>${rich(s.body)}</p>` : ''}${opBlockHTML(s)}</div>
            ${tagsHTML(s, 5)}
            ${s.tip ? `<p class="qa-tip-test"><button class="qa-test" type="button" data-tested="${esc(s.id)}" aria-pressed="${has(own.tested, s.id)}">${icon(has(own.tested, s.id) ? 'check' : 'repeat')}${has(own.tested, s.id) ? 'Testé' : 'Testé, ça marche'}</button></p>` : ''}
            <div class="qa-post-foot">
              <div class="qa-post-links"><button type="button" data-copy-link>Partager</button><button type="button" data-follow="${esc(s.id)}"${s.mine && membre() ? ' disabled' : ''}>${has(own.follows, s.id) || (s.mine && membre()) ? 'Suivi' : 'Suivre'}</button>${canClose(s) ? `<button type="button" data-close-topic>${s.status === 'closed' ? 'Rouvrir le sujet' : 'Fermer le sujet'}</button>` : ''}</div>
              ${usercard(s.author, KINDS[s.kind].posted, s.at, true)}
            </div>
          </div>
        </div>
        ${st === 'waiting' && s.link ? `<aside class="qa-hint" aria-label="Piste du guide">${icon('route')}<div><p class="qa-hint-title">En attendant une réponse, le guide « ${t(s.link.guide.short)} » documente ce piège</p><p><b>${t(s.link.pit.title)}.</b> ${t(s.link.pit.fix)}</p><a class="link-arrow" href="${s.link.guide.href}#piege-${s.link.rank + 1}">Lire la méthode du guide${icon('arrow')}</a></div></aside>` : ''}
        <section class="qa-answers" aria-labelledby="qa-answers-title">
          <div class="qa-answers-head"><h2 class="qa-h2" id="qa-answers-title">${s.replies.length ? plural(s.replies.length, 'réponse', 'réponses') : 'Aucune réponse pour l’instant'}</h2>
          ${s.replies.length > 1 ? `<label class="qa-select"><span>Trier par</span><select data-answer-sort><option value="utiles"${state.answerSort === 'utiles' ? ' selected' : ''}>Les plus utiles</option><option value="recentes"${state.answerSort === 'recentes' ? ' selected' : ''}>Les plus récentes</option><option value="anciennes"${state.answerSort === 'anciennes' ? ' selected' : ''}>Les plus anciennes</option></select>${icon('chevron-down')}</label>` : ''}</div>
          ${answers.length ? `<ol class="qa-answer-list">${answers.map(r => answerHTML(s, r)).join('')}</ol>` : ''}
          ${state.typing[s.id] ? `<p class="qa-typing-note">${who(state.typing[s.id], 28)}<span><b>${t(state.typing[s.id])}</b> rédige une réponse</span><span class="qa-typing" aria-hidden="true"><i></i><i></i><i></i></span></p>` : ''}
        </section>
        <section class="qa-reply" id="repondre" aria-labelledby="qa-reply-title">${composerHTML(s)}</section>
        <p class="qa-not-it">Ce n’est pas la réponse que vous cherchez ? Parcourez les sujets étiquetés ${s.tool ? `<a class="qa-tag is-tool" href="forum.html?outil=${encodeURIComponent(s.tool)}" data-tool="${esc(s.tool)}">${logo(s.tool, 14)}${t(s.tool)}</a> ` : ''}${s.tags.slice(0, 2).map(tag => `<a class="qa-tag" href="forum.html?etiquette=${encodeURIComponent(tagKey(tag))}" data-tag="${esc(tagKey(tag))}">${t(tag.toLowerCase())}</a>`).join(' ')} ou <a href="forum.html?nouveau=question" data-ask>posez votre propre question</a>.</p>
      </div>
      <aside class="qa-side" aria-label="Autour de ce sujet">
        ${s.link && st !== 'waiting' ? `<section class="qa-box is-guide" aria-labelledby="qa-pit-title"><h2 id="qa-pit-title">${icon('route')}Dans le guide</h2><p class="qa-pit"><span class="ex-ring" aria-hidden="true"></span><b>${t(s.link.pit.title)}</b></p><p>${t(s.link.pit.fix)}</p><a class="link-arrow" href="${s.link.guide.href}#piege-${s.link.rank + 1}">Guide « ${t(s.link.guide.short)} »${icon('arrow')}</a></section>` : ''}
        ${creation ? `<section class="qa-box" aria-labelledby="qa-crea-title"><h2 id="qa-crea-title">${icon('layers')}Création liée</h2><a class="qa-creation" href="${creation.href}"><span class="qa-creation-media">${mediaHTML(creation.media, '300px')}</span><span class="qa-creation-title">${t(creation.title)}</span><span class="qa-creation-who">${who(creation.author, 20)}${t(creation.author)}</span></a></section>` : ''}
        ${related.length ? `<section class="qa-box" aria-labelledby="qa-related-title"><h2 id="qa-related-title">${icon('message')}Sujets liés</h2><ul class="qa-hot">${related.map(o => `<li><span class="qa-hot-votes${o.accepted ? ' is-accepted' : ''}">${fmt(votes(o))}</span><a href="${o.href}" data-open="${esc(o.id)}">${t(o.title)}</a></li>`).join('')}</ul></section>` : ''}
      </aside>`;
    V.fixTypography(page);
    if (focus) $('#qa-title')?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* Poser une question                                                   */
  /* ------------------------------------------------------------------ */

  const FAMILY_LABEL = Object.fromEntries(D.toolFamilies.map(f => [f.id, f.label]));
  const FAMILY_DOMAIN = { assistant: 'Texte et rédaction', image: 'Image et illustration', video: 'Vidéo', audio: 'Musique et son', code: 'Code et scripts', automation: 'Automatisation' };
  let draftTimer;
  let prefill = null;

  function renderAsk() {
    document.title = 'Poser une question · Forum · Vysora';
    const bloc = V.accesBloc('contribuer', 'publier une question', 'h1');
    if (bloc) { $('[data-qa-page]').innerHTML = `<div class="qa-main qa-ask-gate">${bloc}</div>`; return; }
    const draft = store.get('vysora-forum-brouillon', null);
    const data = { ...(draft || {}), ...(prefill || {}) };
    const kind = state.composeKind;
    const field = (id, label, desc, control, optional = false) => `<div class="qa-field" data-field="${id}">
      <label class="qa-field-label" for="${id}">${t(label)}${optional ? ' <span>Facultatif</span>' : ''}</label>
      ${desc ? `<p class="qa-field-desc" id="${id}-help">${t(desc)}</p>` : ''}
      ${control}
      <p class="ex-error" id="${id}-error" hidden></p>
    </div>`;
    const area = (id, rows, placeholder = '') => `<textarea id="${id}" rows="${rows}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} aria-describedby="${id}-help ${id}-error">${esc(data[id] || '')}</textarea>`;
    const preferred = data['qa-n-tool'] || state.tool || [...M.myTools()][0] || 'ChatGPT';
    const toolOptions = D.toolFamilies.filter(f => f.id !== 'all').map(f => `<optgroup label="${esc(FAMILY_LABEL[f.id])}">${D.tools.filter(tool => tool.family === f.id).map(tool => `<option value="${esc(tool.name)}"${preferred === tool.name ? ' selected' : ''}>${esc(tool.name)}</option>`).join('')}</optgroup>`).join('');
    const creations = [...M.creations].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    $('[data-qa-page]').innerHTML = `
      <div class="qa-main qa-ask">
        <h1 id="qa-title" tabindex="-1">Poser une question</h1>
        <section class="qa-box is-guide qa-ask-intro" aria-labelledby="qa-ask-intro-title">
          <h2 id="qa-ask-intro-title">Rédiger une question qui reçoit une réponse</h2>
          <p>Les membres répondent plus vite à une question précise. Avant de publier :</p>
          <ol class="qa-steps-mini"><li>Résumez le problème dans le titre.</li><li>Collez le prompt exact et décrivez l’écart entre le résultat obtenu et le résultat attendu.</li><li>Indiquez l’outil, la version du modèle et une à cinq étiquettes.</li><li>Vérifiez les sujets semblables : votre réponse existe peut-être déjà.</li></ol>
        </section>
        <form class="qa-ask-form" data-compose-form novalidate>
          <fieldset class="qa-kinds" data-types>
            <legend>Type de sujet <span>Touches A à E</span></legend>
            ${ORDER.map(key => `<label class="qa-kind-opt"><input type="radio" name="kind" value="${key}"${key === kind ? ' checked' : ''}><kbd aria-hidden="true">${KINDS[key].letter}</kbd><span><b>${icon(KINDS[key].icon)}${t(KINDS[key].label)}</b><span>${t(KINDS[key].hint)}</span></span></label>`).join('')}
          </fieldset>
          ${field('qa-n-title', 'Titre', 'Soyez précis et imaginez que vous posez la question à quelqu’un.', `<input id="qa-n-title" type="text" maxlength="150" autocomplete="off" value="${esc(data['qa-n-title'] || '')}" placeholder="Par exemple : le visage de mon personnage change d’une image à l’autre" aria-describedby="qa-n-title-help qa-n-title-error">`)}
          <section class="qa-similar" aria-live="polite" data-similar hidden></section>
          <div class="qa-n-row">
            ${field('qa-n-tool', 'Outil', '', `<div class="ex-select"><select id="qa-n-tool">${toolOptions}</select>${icon('chevron-down')}</div>`)}
            ${field('qa-n-model', 'Version du modèle', '', `<input id="qa-n-model" type="text" autocomplete="off" value="${esc(data['qa-n-model'] || '')}" placeholder="Par exemple : v7, GPT-5, Sonnet 4.5">`, true)}
          </div>
          <div class="qa-n-kind" data-for="clinique">
            ${field('qa-n-context', 'Contexte', 'Ce que vous cherchez à produire, en une ou deux phrases.', area('qa-n-context', 2), true)}
            ${field('qa-n-prompt', 'Prompt utilisé', 'Le prompt exact, tel que vous l’avez envoyé.', area('qa-n-prompt', 3))}
            <div class="qa-n-row">
              ${field('qa-n-got', 'Résultat obtenu', 'Ce que l’IA a produit.', area('qa-n-got', 3))}
              ${field('qa-n-expected', 'Résultat attendu', 'Ce que vous vouliez obtenir.', area('qa-n-expected', 3))}
            </div>
          </div>
          <div class="qa-n-kind" data-for="astuce">
            <div class="qa-n-row">
              ${field('qa-n-before', 'Prompt avant', 'Au moins 20 caractères.', area('qa-n-before', 4))}
              ${field('qa-n-after', 'Prompt après', 'Au moins 20 caractères.', area('qa-n-after', 4))}
            </div>
            ${field('qa-n-result', 'Ce que le changement a produit', '', area('qa-n-result', 2), true)}
          </div>
          <div class="qa-n-kind" data-for="question retour discussion">
            ${field('qa-n-body', 'Détail de votre question', 'Au moins 30 caractères : ce que vous avez essayé, ce qui s’est passé, ce que vous attendiez.', area('qa-n-body', 7))}
          </div>
          ${field('qa-n-tags', 'Étiquettes', 'De une à cinq, séparées par des virgules.', `<input id="qa-n-tags" type="text" autocomplete="off" value="${esc(data['qa-n-tags'] || '')}" placeholder="Par exemple : logo, typographie" aria-describedby="qa-n-tags-help qa-n-tags-error">`)}
          ${field('qa-n-creation', 'Création liée', 'Reliez votre question à une création publiée sur Vysora.', `<div class="ex-select"><select id="qa-n-creation"><option value="">Aucune</option>${creations.map(c => `<option value="${esc(c.id)}"${data['qa-n-creation'] === c.id ? ' selected' : ''}>${esc(typo(c.title))}</option>`).join('')}</select>${icon('chevron-down')}</div>`, true)}
          <div class="qa-ask-actions">
            <button class="btn btn-primary" type="submit">Publier votre question</button>
            <button class="link-btn" type="button" data-discard>Abandonner le brouillon</button>
            <span class="qa-draft" data-draft-status aria-live="polite">${draft ? 'Brouillon repris' : ''}</span>
          </div>
        </form>
      </div>
      <aside class="qa-side" aria-label="Aide à la rédaction"><section class="qa-box qa-help" aria-live="polite" data-help></section></aside>`;
    syncKind();
    renderSimilar();
    renderHelp('qa-n-title');
    V.fixTypography($('[data-qa-page]'));
  }

  function syncKind() { $$('.qa-n-kind').forEach(group => { group.hidden = !group.dataset.for.split(' ').includes(state.composeKind); }); }
  function renderHelp(id) {
    const box = $('[data-help]');
    if (!box) return;
    const [title, text, lines] = HELP[id] || HELP['qa-n-title'];
    box.innerHTML = `<h2>${icon('bulb')}${t(title)}</h2><p>${t(text)}</p>${lines.length ? `<ul class="qa-help-list">${lines.map(line => `<li>${icon('check')}<span>${t(line)}</span></li>`).join('')}</ul>` : ''}`;
  }

  function similar(text, { tool = '' } = {}) {
    const tk = tokenize(text);
    if (!tk.length) return { tk, list: [] };
    const list = topics.map(s => {
      let content = 0;
      let matched = 0;
      tk.forEach(v => { if (hits(s.titleText, v)) { content += 3; matched += 1; } else if (hits(s.text, v)) { content += 1; matched += 1; } });
      return { s, content, matched, rank: content + (tool && s.tool === tool ? 1 : 0) + (stateOf(s) === 'resolved' || s.tip ? 0.5 : 0) };
    }).filter(r => r.content >= Math.min(3, tk.length + 1) && r.matched >= Math.min(2, tk.length)).sort((a, b) => b.rank - a.rank || b.s.useful - a.s.useful).map(r => r.s);
    return { tk, list };
  }

  function renderSimilar() {
    const box = $('[data-similar]');
    if (!box) return;
    const text = `${$('#qa-n-title').value} ${($('#qa-n-got')?.value || $('#qa-n-body')?.value || '')}`.trim();
    const { tk, list } = similar(text, { tool: $('#qa-n-tool').value });
    const top = list.slice(0, 4);
    box.hidden = !top.length;
    box.innerHTML = top.length ? `<p class="qa-similar-head">Ces sujets ont peut-être déjà votre réponse</p><ul class="qa-hot">${top.map(s => `<li><span class="qa-hot-votes${s.accepted ? ' is-accepted' : ''}">${fmt(votes(s))}</span><a href="${s.href}" data-open="${esc(s.id)}">${highlight(s.title, tk)}<small>${plural(s.replies.length, 'réponse', 'réponses')}${s.accepted ? ` · solution de ${t(first(s.accepted.author))}` : ''}</small></a></li>`).join('')}</ul>` : '';
  }

  function saveDraft() {
    const form = $('[data-compose-form]');
    if (!form) return;
    const data = { kind: state.composeKind };
    $$('input[id^="qa-n-"], textarea[id^="qa-n-"], select[id^="qa-n-"]', form).forEach(el => { data[el.id] = el.value; });
    store.set('vysora-forum-brouillon', data);
    const status = $('[data-draft-status]');
    if (status) status.textContent = 'Brouillon enregistré';
  }

  function setError(id, message) {
    const input = $(`#${id}`);
    const error = $(`#${id}-error`);
    if (!input || !error) return;
    error.hidden = !message;
    error.textContent = message || '';
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function publishTopic() {
    const kind = state.composeKind;
    const value = id => ($(`#${id}`)?.value || '').trim();
    const tags = value('qa-n-tags').split(',').map(tag => tag.trim()).filter(Boolean);
    const checks = [
      ['qa-n-title', value('qa-n-title').length < 15 ? 'Le titre doit compter au moins 15 caractères.' : ''],
      ['qa-n-prompt', kind === 'clinique' && value('qa-n-prompt').length < 10 ? 'Collez le prompt que vous avez utilisé.' : ''],
      ['qa-n-got', kind === 'clinique' && value('qa-n-got').length < 10 ? 'Décrivez le résultat obtenu.' : ''],
      ['qa-n-expected', kind === 'clinique' && value('qa-n-expected').length < 10 ? 'Décrivez le résultat attendu.' : ''],
      ['qa-n-before', kind === 'astuce' && value('qa-n-before').length < 20 ? 'Le prompt avant doit compter au moins 20 caractères.' : ''],
      ['qa-n-after', kind === 'astuce' && value('qa-n-after').length < 20 ? 'Le prompt après doit compter au moins 20 caractères.' : ''],
      ['qa-n-body', ['question', 'retour', 'discussion'].includes(kind) && value('qa-n-body').length < 30 ? 'Votre question doit compter au moins 30 caractères.' : ''],
      ['qa-n-tags', !tags.length ? 'Ajoutez au moins une étiquette.' : tags.length > 5 ? 'Gardez au plus cinq étiquettes.' : '']
    ];
    checks.forEach(([id, message]) => setError(id, message));
    const failed = checks.find(([, message]) => message);
    if (failed) { $(`#${failed[0]}`).focus(); return; }
    const tool = value('qa-n-tool');
    const model = value('qa-n-model');
    const entry = V.TOOL_BY_NAME[tool];
    const topic = {
      id: `v-${Date.now().toString(36)}`, kind, status: 'open',
      title: value('qa-n-title'), author: YOU, tool: entry ? tool : '', model,
      domain: (entry && FAMILY_DOMAIN[entry.family]) || 'Texte et rédaction',
      at: F.now, useful: 0, follows: 0, creation: value('qa-n-creation') || undefined,
      tags: tags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)),
      body: kind === 'clinique' ? value('qa-n-context') : kind === 'astuce' ? (value('qa-n-result') || 'Une méthode vérifiée, avec le prompt avant et après.') : value('qa-n-body'),
      replies: []
    };
    if (kind === 'clinique') topic.clinic = { prompt: value('qa-n-prompt'), got: value('qa-n-got'), expected: value('qa-n-expected') };
    if (kind === 'astuce') topic.tip = { before: value('qa-n-before'), beforeResult: 'Résultat avant le changement.', after: value('qa-n-after'), afterResult: value('qa-n-result') || 'Résultat après le changement.', tested: 0, testedWith: entry ? [[tool, model]] : [], lastTest: F.now.slice(0, 10) };
    own.topics.unshift(topic);
    own.follows.add(topic.id);
    persist();
    store.set('vysora-forum-brouillon', null);
    prefill = null;
    rebuild();
    go('question', { topic: topic.id });
    toast('Question publiée. Vous serez prévenu à chaque réponse.');
    scheduleHelper(topic.id);
  }

  /* Un membre répond au sujet que vous venez de publier */
  function scheduleHelper(id) {
    const s = topicById(id);
    if (!s) return;
    const helper = F.helpers.find(h => h.tools.includes(s.tool)) || F.helpers[0];
    const tool = s.tool ? toolLabel(s) : 'votre outil';
    const texts = {
      clinique: `Avec ${tool}, isolez d’abord la consigne qui pose problème : gardez-la seule dans un nouvel essai, vérifiez le résultat, puis réintroduisez les autres une à une. Je vous propose aussi une version qui annonce le résultat attendu dès le début ; dites-moi si l’écart persiste.`,
      question: `Avec ${tool}, je procède en deux temps : je demande d’abord la liste des étapes, je la relis, puis je demande la réalisation. Si vous indiquez ce que vous avez déjà essayé, je pourrai préciser.`,
      astuce: `Testé avec ${tool} : même résultat de mon côté. L’exemple avant et après rend la méthode facile à reprendre.`,
      retour: 'Merci pour ce retour. De mon côté, ce qui a le plus changé les résultats, c’est de relire chaque sortie avant de passer à l’étape suivante.',
      discussion: 'Ce qui fonctionne le mieux pour moi : donner un exemple de ce que j’attends, puis demander de reprendre sa longueur et son vocabulaire.'
    };
    const refresh = () => { if (state.view === 'question' && state.topic === id) refreshQuestion(); else if (state.view === 'questions') renderQuestions(); };
    setTimeout(() => {
      state.typing[id] = helper.name;
      refresh();
      setTimeout(() => {
        delete state.typing[id];
        const reply = { id: `v-r${Date.now().toString(36)}`, author: helper.name, at: F.now, useful: 0, text: texts[s.kind] };
        if (s.clinic) reply.prompt = `${s.clinic.prompt.replace(/[.\s]+$/, '')}. Résultat attendu : ${s.clinic.expected.replace(/[.\s]+$/, '')}.`;
        own.replies[id] = [...(own.replies[id] || []), reply];
        persist();
        rebuild();
        refresh();
        toast(`${helper.name} a répondu à votre question.`, 'reply');
      }, 3600);
    }, 4200);
  }

  /* ------------------------------------------------------------------ */
  /* Étiquettes et membres                                                */
  /* ------------------------------------------------------------------ */

  function renderTags() {
    document.title = 'Étiquettes · Forum · Vysora';
    const tags = new Map();
    topics.forEach(s => s.tags.forEach(tag => {
      const key = tagKey(tag);
      if (!tags.has(key)) tags.set(key, { key, label: tag.toLowerCase(), count: 0, week: 0, last: '' });
      const e = tags.get(key);
      e.count += 1;
      if (calendarDays(s.at) < 7) e.week += 1;
      if (s.last > e.last) e.last = s.last;
    }));
    const tools = new Map();
    topics.forEach(s => { if (!s.tool) return; if (!tools.has(s.tool)) tools.set(s.tool, { tool: s.tool, count: 0, waiting: 0 }); const e = tools.get(s.tool); e.count += 1; if (stateOf(s) === 'waiting') e.waiting += 1; });
    const q = fold(state.tagQuery).trim();
    const sorters = { populaires: (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'), nom: (a, b) => a.label.localeCompare(b.label, 'fr'), recentes: (a, b) => b.last.localeCompare(a.last) };
    const list = [...tags.values()].filter(e => !q || fold(e.label).includes(q)).sort(sorters[state.tagSort]);
    const toolList = [...tools.values()].filter(e => !q || fold(e.tool).includes(q)).sort((a, b) => b.count - a.count);
    $('[data-qa-page]').innerHTML = `
      <div class="qa-main qa-wide">
        <header class="qa-list-head"><div class="qa-list-title"><h1 id="qa-title" tabindex="-1">Étiquettes</h1></div>
          <p class="qa-lead">Une étiquette regroupe les sujets d’un même thème. Chaque outil est aussi une étiquette : suivez les vôtres pour voir d’abord les questions qui vous concernent.</p>
          <div class="qa-bar"><label class="qa-search is-small"><span class="sr-only">Filtrer les étiquettes</span>${icon('search', '')}<input type="search" data-tag-filter value="${esc(state.tagQuery)}" placeholder="Filtrer par nom"></label>
          <div class="qa-tabs" role="group" aria-label="Classer les étiquettes">${[['populaires', 'Populaires'], ['nom', 'Nom'], ['recentes', 'Récentes']].map(([key, label]) => `<button type="button" data-tag-sort="${key}" aria-pressed="${state.tagSort === key}">${t(label)}</button>`).join('')}</div></div>
        </header>
        ${toolList.length ? `<section class="qa-tag-section" aria-labelledby="qa-tools-title"><h2 class="qa-h2" id="qa-tools-title">Outils</h2><ul class="qa-tag-grid">${toolList.map(e => `<li><a class="qa-tag is-tool" href="forum.html?outil=${encodeURIComponent(e.tool)}" data-tool="${esc(e.tool)}">${logo(e.tool, 14)}${t(e.tool)}</a><p>${plural(e.count, 'sujet', 'sujets')}${e.waiting ? ` · <span class="is-waiting">${fmt(e.waiting)} sans réponse</span>` : ''}</p>${isMine(e.tool) ? '<p class="qa-followed">Vous suivez cet outil</p>' : ''}</li>`).join('')}</ul></section>` : ''}
        <section class="qa-tag-section" aria-labelledby="qa-themes-title"><h2 class="qa-h2" id="qa-themes-title">Thèmes</h2>
          ${list.length ? `<ul class="qa-tag-grid">${list.map(e => `<li><a class="qa-tag" href="forum.html?etiquette=${encodeURIComponent(e.key)}" data-tag="${esc(e.key)}">${t(e.label)}</a><p>${plural(e.count, 'sujet', 'sujets')}${e.week ? ` · ${fmt(e.week)} cette semaine` : ''}</p></li>`).join('')}</ul>` : `<p class="qa-lead">Aucune étiquette ne correspond à « ${t(state.tagQuery)} ».</p>`}
        </section>
      </div>`;
    V.fixTypography($('[data-qa-page]'));
  }

  function renderMembers() {
    document.title = 'Membres · Forum · Vysora';
    MEMBERS = new Map(memberStats().map(m => [m.name, m]));
    const sorters = { reputation: (a, b) => b.rep - a.rep, solutions: (a, b) => b.accepted - a.accepted || b.rep - a.rep, reponses: (a, b) => b.answers - a.answers || b.rep - a.rep };
    const list = [...MEMBERS.values()].sort(sorters[state.memberSort]);
    $('[data-qa-page]').innerHTML = `
      <div class="qa-main qa-wide">
        <header class="qa-list-head"><div class="qa-list-title"><h1 id="qa-title" tabindex="-1">Membres</h1></div>
          <p class="qa-lead">La réputation grandit avec les votes utiles et les réponses acceptées. Elle montre qui connaît bien un outil, pas qui publie le plus.</p>
          <div class="qa-bar"><p class="qa-count">${plural(list.length, 'membre', 'membres')} ont participé</p><div class="qa-tabs" role="group" aria-label="Classer les membres">${[['reputation', 'Réputation'], ['solutions', 'Solutions'], ['reponses', 'Réponses']].map(([key, label]) => `<button type="button" data-member-sort="${key}" aria-pressed="${state.memberSort === key}">${t(label)}</button>`).join('')}</div></div>
        </header>
        <ul class="qa-member-grid">${list.map(m => `<li>${who(m.name, 48)}<div><a href="forum.html?membre=${encodeURIComponent(m.name)}" data-author="${esc(m.name)}">${t(m.name)}</a><p>${t(m.level)} · ${fmt(m.rep)} de réputation</p><p class="qa-member-stats"><span>${plural(m.answers, 'réponse', 'réponses')}</span>${m.accepted ? `<span>${plural(m.accepted, 'solution', 'solutions')}</span>` : ''}${m.questions ? `<span>${plural(m.questions, 'sujet', 'sujets')}</span>` : ''}</p>${m.topTools.length ? `<p class="qa-member-tools">${m.topTools.map(tool => `<span class="qa-tool">${logo(tool, 14)}${t(tool)}</span>`).join('')}</p>` : ''}</div></li>`).join('')}</ul>
      </div>`;
    V.fixTypography($('[data-qa-page]'));
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                           */
  /* ------------------------------------------------------------------ */

  function show({ focus = true } = {}) {
    MEMBERS = new Map(memberStats().map(m => [m.name, m]));
    renderMenu();
    if (state.view === 'question') renderQuestion({ focus });
    else if (state.view === 'poser') renderAsk();
    else if (state.view === 'etiquettes') renderTags();
    else if (state.view === 'membres') renderMembers();
    else renderQuestions();
    const page = $('[data-qa-page]');
    if (V.motion.full()) { page.classList.remove('is-entering'); void page.offsetWidth; page.classList.add('is-entering'); }
    if (focus) { window.scrollTo({ top: 0 }); if (state.view !== 'question') $('#qa-title')?.focus({ preventScroll: true }); }
  }
  function go(view, changes = {}, opts = {}) {
    Object.assign(state, { view, quote: null }, changes);
    writeURL(true);
    show(opts);
  }
  function refreshList() { writeURL(false); renderMenu(); renderQuestions(); }
  function refreshQuestion(selector) {
    const y = window.scrollY;
    rebuild();
    MEMBERS = new Map(memberStats().map(m => [m.name, m]));
    renderMenu();
    renderQuestion({ focus: false });
    window.scrollTo({ top: y });
    if (selector) $(selector)?.focus({ preventScroll: true });
  }
  const resetList = () => Object.assign(state, { tab: 'recentes', q: '', tag: '', tool: '', author: '', page: 1, filter: blankFilter(), filterOpen: false });

  /* ------------------------------------------------------------------ */
  /* Interactions                                                         */
  /* ------------------------------------------------------------------ */

  const openTools = M.initToolsDialog(() => { show({ focus: false }); });
  async function copyText(text, message) {
    try { await navigator.clipboard.writeText(text); toast(message); } catch { toast('Copie impossible : sélectionnez le texte pour le copier.', 'alert'); }
  }
  const toggle = (set, id) => { if (set.has(id)) { set.delete(id); return false; } set.add(id); return true; };
  function wrapSelection(area, before, after = before) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const inner = value.slice(a, b) || (before === '`' ? 'code' : 'texte');
    area.value = `${value.slice(0, a)}${before}${inner}${after}${value.slice(b)}`;
    area.focus();
    area.setSelectionRange(a + before.length, a + before.length + inner.length);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  }

  document.addEventListener('click', event => {
    const plain = !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0;
    const open = event.target.closest('[data-open]');
    if (open && plain) { event.preventDefault(); if (state.view === 'poser') saveDraft(); state.answerSort = 'utiles'; go('question', { topic: open.dataset.open }); return; }
    const menu = event.target.closest('[data-menu-go]');
    if (menu && plain) {
      event.preventDefault();
      const key = menu.dataset.menuGo;
      if (key === 'questions') { resetList(); go('questions'); } else if (key === 'sans-reponse') { resetList(); state.tab = 'sans-reponse'; go('questions'); } else go(key);
      return;
    }
    if (event.target.closest('[data-menu-mine]') && plain) { event.preventDefault(); resetList(); state.author = YOU; go('questions'); return; }
    if (event.target.closest('[data-menu-saved]') && plain) { event.preventDefault(); resetList(); go('questions'); state.q = ''; return; }
    const ask = event.target.closest('[data-ask]');
    if (ask && plain) {
      event.preventDefault();
      prefill = ask.hasAttribute('data-prefill') && state.q ? { 'qa-n-title': state.q.charAt(0).toUpperCase() + state.q.slice(1) } : null;
      go('poser', { composeKind: ask.dataset.ask || (state.filter.kinds.length === 1 ? state.filter.kinds[0] : 'question') });
      return;
    }
    const tag = event.target.closest('[data-tag]');
    if (tag && plain) { event.preventDefault(); resetList(); state.tag = tag.dataset.tag; go('questions'); return; }
    const tool = event.target.closest('[data-tool]');
    if (tool && plain && tool.tagName === 'A') { event.preventDefault(); resetList(); state.tool = tool.dataset.tool; go('questions'); return; }
    const author = event.target.closest('[data-author]');
    if (author && plain) { event.preventDefault(); resetList(); state.author = author.dataset.author; go('questions'); return; }
    const tab = event.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; state.page = 1; state.filter.sort = ''; refreshList(); $(`[data-tab="${tab.dataset.tab}"]`)?.focus(); return; }
    if (event.target.closest('[data-filter-toggle]')) { state.filterOpen = !state.filterOpen; renderQuestions(); (state.filterOpen ? $('[data-filter-form] input') : $('[data-filter-toggle]'))?.focus(); return; }
    if (event.target.closest('[data-filter-cancel]')) { state.filterOpen = false; renderQuestions(); $('[data-filter-toggle]')?.focus(); return; }
    const un = event.target.closest('[data-unfilter]');
    if (un) {
      const key = un.dataset.unfilter;
      if (key === 'tag') state.tag = ''; else if (key === 'tool') state.tool = ''; else if (key === 'author') state.author = '';
      else if (key.startsWith('kind:')) state.filter.kinds = state.filter.kinds.filter(k => k !== key.slice(5));
      else state.filter[key] = false;
      state.page = 1; refreshList(); $('#qa-q')?.focus(); return;
    }
    if (event.target.closest('[data-reset]')) { resetList(); refreshList(); $('#qa-q')?.focus(); return; }
    const pageBtn = event.target.closest('[data-page]');
    if (pageBtn) { state.page = Number(pageBtn.dataset.page); refreshList(); window.scrollTo({ top: 0, behavior: V.motion.full() ? 'smooth' : 'auto' }); $('#qa-title')?.focus({ preventScroll: true }); return; }
    if (event.target.closest('[data-open-tools]')) { openTools(); return; }
    const tagSort = event.target.closest('[data-tag-sort]');
    if (tagSort) { state.tagSort = tagSort.dataset.tagSort; renderTags(); $(`[data-tag-sort="${state.tagSort}"]`)?.focus(); return; }
    const memberSort = event.target.closest('[data-member-sort]');
    if (memberSort) { state.memberSort = memberSort.dataset.memberSort; renderMembers(); $(`[data-member-sort="${state.memberSort}"]`)?.focus(); return; }
    if (event.target.closest('[data-discard]')) { store.set('vysora-forum-brouillon', null); prefill = null; renderAsk(); toast('Brouillon abandonné.'); $('#qa-n-title')?.focus(); return; }

    const useful = event.target.closest('[data-useful]');
    if (useful) { if (!V.exiger('contribuer', 'voter « Utile »')) return; toggle(own.useful, useful.dataset.useful); persist(); refreshQuestion(`[data-useful="${CSS.escape(useful.dataset.useful)}"]`); return; }
    const tested = event.target.closest('[data-tested]');
    if (tested) { if (!V.exiger('contribuer', 'indiquer que l’astuce fonctionne')) return; if (toggle(own.tested, tested.dataset.tested)) toast('Merci : votre test est compté.'); persist(); refreshQuestion(`[data-tested="${CSS.escape(tested.dataset.tested)}"]`); return; }
    const follow = event.target.closest('[data-follow]');
    if (follow) { if (!V.exiger('contribuer', 'suivre ce sujet')) return; const on = toggle(own.follows, follow.dataset.follow); persist(); toast(on ? 'Vous serez prévenu à chaque nouvelle réponse.' : 'Vous ne suivez plus ce sujet.'); refreshQuestion(`.qa-post-links [data-follow="${CSS.escape(follow.dataset.follow)}"]`); renderMenu(); return; }
    const save = event.target.closest('[data-save]');
    if (save) { if (!V.exiger('contribuer', 'enregistrer ce sujet')) return; const on = toggle(own.saved, save.dataset.save); persist(); toast(on ? 'Sujet enregistré.' : 'Sujet retiré de vos enregistrements.'); refreshQuestion(`[data-save="${CSS.escape(save.dataset.save)}"]`); renderMenu(); return; }
    if (event.target.closest('[data-copy-link]')) { copyText(`${location.origin}${location.pathname}?sujet=${encodeURIComponent(state.topic)}`, 'Lien du sujet copié.'); return; }
    const copyAnswer = event.target.closest('[data-copy-answer]');
    if (copyAnswer) { copyText(`${location.origin}${location.pathname}?sujet=${encodeURIComponent(state.topic)}#reponse-${copyAnswer.dataset.copyAnswer}`, 'Lien de la réponse copié.'); return; }
    const copy = event.target.closest('[data-copy]');
    if (copy) { const text = PROMPTS.get(copy.dataset.copy); if (text) copyText(text, 'Prompt copié.'); return; }
    const quote = event.target.closest('[data-quote]');
    if (quote) { if (!V.exiger('contribuer', 'répondre')) return; state.quote = quote.dataset.quote; $('#repondre').innerHTML = composerHTML(topicById(state.topic)); V.fixTypography($('#repondre')); $('#repondre').scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' }); $('#qa-reply').focus({ preventScroll: true }); return; }
    if (event.target.closest('[data-unquote]')) { state.quote = null; $('#repondre').innerHTML = composerHTML(topicById(state.topic)); $('#qa-reply').focus(); return; }
    const format = event.target.closest('[data-format]');
    if (format) { const area = $('#qa-reply'); if (format.dataset.format === 'bold') wrapSelection(area, '**'); else wrapSelection(area, '`'); return; }
    if (event.target.closest('[data-close-topic]')) {
      const s = topicById(state.topic);
      if (!V.exiger('contribuer', s.status === 'closed' ? 'rouvrir ce sujet' : 'fermer ce sujet')) return;
      own.statuts[s.id] = s.status === 'closed' ? 'open' : 'closed';
      persist(); rebuild(); refreshQuestion('[data-close-topic]');
      toast(own.statuts[s.id] === 'closed' ? 'Sujet fermé : il reste lisible, les réponses sont désactivées.' : 'Sujet rouvert aux réponses.');
      return;
    }
    const accept = event.target.closest('[data-accept]');
    if (accept) {
      if (!V.exiger('contribuer', 'accepter une réponse')) return;
      own.accepts[state.topic] = accept.dataset.accept;
      own.accepts[`${state.topic}@at`] = F.now;
      persist();
      refreshQuestion();
      const target = document.getElementById(`reponse-${accept.dataset.accept}`);
      target?.scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' });
      target?.focus({ preventScroll: true });
      toast('Réponse acceptée : le sujet est marqué comme résolu.');
    }
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-answer-sort]')) { state.answerSort = target.value; refreshQuestion('[data-answer-sort]'); return; }
    if (target.matches('[data-reply-fix]')) { $('[data-reply-fix-field]').hidden = !target.checked; if (target.checked) $('#qa-reply-prompt').focus(); return; }
    if (target.matches('[data-types] input')) { state.composeKind = target.value; writeURL(false); syncKind(); saveDraft(); return; }
    if (target.closest('[data-compose-form]')) { if (target.id === 'qa-n-tool') renderSimilar(); saveDraft(); }
  });

  document.addEventListener('focusin', event => { if (event.target.closest?.('[data-compose-form]') && HELP[event.target.id]) renderHelp(event.target.id); });

  let searchTimer;
  let similarTimer;
  document.addEventListener('input', event => {
    const target = event.target;
    if (target.id === 'qa-q') { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = target.value.trim(); state.page = 1; writeURL(false); const pos = target.selectionStart; renderQuestions(); const field = $('#qa-q'); field.focus(); field.setSelectionRange(pos, pos); }, 220); return; }
    if (target.matches('[data-tag-filter]')) { state.tagQuery = target.value; const pos = target.selectionStart; renderTags(); const field = $('[data-tag-filter]'); field.focus(); field.setSelectionRange(pos, pos); return; }
    if (target.id === 'qa-reply-prompt') { const s = topicById(state.topic); $('[data-diff-preview]').innerHTML = diffHTML(s.clinic.prompt, target.value); return; }
    if (target.id === 'qa-reply') {
      const live = $('[data-live-preview]');
      live.hidden = !target.value.trim();
      $('[data-live-body]').innerHTML = `<p>${rich(target.value)}</p>`;
      if (target.value.trim().length >= 20) { $('#qa-reply-error').hidden = true; target.removeAttribute('aria-invalid'); }
      return;
    }
    if (target.closest('[data-compose-form]')) {
      if (target.getAttribute('aria-invalid') === 'true' && target.value.trim().length >= 10) setError(target.id, '');
      clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 400);
      if (['qa-n-title', 'qa-n-got', 'qa-n-body'].includes(target.id)) { clearTimeout(similarTimer); similarTimer = setTimeout(renderSimilar, 180); }
    }
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.matches('[data-search]')) { event.preventDefault(); clearTimeout(searchTimer); state.q = $('#qa-q').value.trim(); state.page = 1; refreshList(); $('.qa-sum-title a')?.focus(); return; }
    if (form.matches('[data-filter-form]')) {
      event.preventDefault();
      const f = state.filter;
      ['noAnswer', 'noAccepted', 'withFix', 'mine'].forEach(key => { const box = $(`[data-f="${key}"]`, form); f[key] = Boolean(box && box.checked); });
      f.kinds = $$('[data-f-kind]', form).filter(box => box.checked).map(box => box.dataset.fKind);
      f.sort = ($('input[name="qa-sort"]:checked', form) || {}).value || '';
      state.filterOpen = false;
      state.page = 1;
      refreshList();
      $('[data-filter-toggle]')?.focus();
      return;
    }
    if (form.matches('[data-compose-form]')) { event.preventDefault(); if (V.exiger('contribuer', 'publier une question')) publishTopic(); return; }
    if (form.matches('[data-reply-form]')) {
      event.preventDefault();
      if (!V.exiger('contribuer', 'répondre')) return;
      const s = topicById(form.dataset.replyForm);
      const text = $('#qa-reply').value.trim();
      const fixOn = $('[data-reply-fix]')?.checked;
      const fix = fixOn ? $('#qa-reply-prompt').value.trim() : '';
      const fixChanged = Boolean(fix && s.clinic && fix !== s.clinic.prompt);
      if (text.length < 20 && !fixChanged) { $('#qa-reply-error').hidden = false; $('#qa-reply').setAttribute('aria-invalid', 'true'); $('#qa-reply').focus(); return; }
      const quoted = state.quote && s.replies.find(r => r.id === state.quote);
      const reply = { id: `v-${Date.now().toString(36)}`, author: YOU, at: F.now, useful: 0, text: `${quoted ? `En réponse à ${first(quoted.author)} : ` : ''}${text || 'Voici une version corrigée du prompt.'}`, ...(fixChanged ? { prompt: fix } : {}) };
      own.replies[s.id] = [...(own.replies[s.id] || []), reply];
      own.follows.add(s.id);
      persist();
      state.quote = null;
      state.answerSort = 'recentes';
      refreshQuestion();
      const added = document.getElementById(`reponse-${reply.id}`);
      added?.scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'center' });
      added?.focus({ preventScroll: true });
      toast('Réponse publiée.');
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      const form = event.target.closest?.('[data-reply-form], [data-compose-form]');
      if (form) { event.preventDefault(); form.requestSubmit(); }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const types = event.target.closest?.('[data-types]');
    if (types) {
      const key = ORDER.find(k => KINDS[k].letter.toLowerCase() === event.key.toLowerCase());
      if (key) { event.preventDefault(); const input = $(`[data-types] input[value="${key}"]`); input.checked = true; input.focus(); input.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    if (document.querySelector('dialog[open]') || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === '/' && state.view === 'questions') { event.preventDefault(); $('#qa-q').focus(); $('#qa-q').select(); }
  });

  window.addEventListener('popstate', () => { readURL(); show({ focus: false }); });

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */

  V.initHeader();
  V.initTweaks({
    key: 'vysora-forum-reglages-v5',
    apparence: [
      { name: 'resume', legend: 'Questions de la liste', options: [['complet', 'Avec extrait'], ['compact', 'Titres seuls']] },
      { name: 'compteurs', legend: 'Compteurs', options: [['colonne', 'En colonne'], ['ligne', 'Sur une ligne']] },
      { name: 'menu', legend: 'Menu du forum', options: [['gauche', 'À gauche'], ['haut', 'En haut']] },
      { name: 'solution', legend: 'Prompt corrigé', options: [['diff', 'Différences surlignées'], ['cote', 'Avant et après']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    etats: [
      { name: 'vue', legend: 'Sujet affiché', options: [['lecteur', 'Vu par un lecteur'], ['auteur', 'Vu par son auteur']], si: e => e.session === 'membre' }
    ],
    defaults: { vue: 'lecteur', resume: 'complet', compteurs: 'colonne', menu: 'gauche', solution: 'diff' },
    onChange: (changed, settings) => {
      page = { vue: settings.vue };
      if (changed === 'vue' || changed === 'reset') show({ focus: false });
    }
  });
  V.etats.on(() => { renderMenu(); show({ focus: false }); });
  readURL();
  if (location.hash && state.view === 'question') writeURL(false);
  show({ focus: false });
  if (state.view === 'question' && location.hash.startsWith('#reponse-')) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
})();
