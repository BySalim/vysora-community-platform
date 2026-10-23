'use strict';

/* Modèle et composants des guides d'Explorer, partagés avec la page Domaine. */

window.VysoraGuides = (() => {
  const V = window.Vysora;
  const X = window.VYSORA_EXPLORER;
  const { D, esc, t, typo, plural, icon, store, logo, avatar, mediaHTML, relativeDay } = V;

  /* ------------------------------------------------------------------ */
  /* Texte : recherche tolérante et surlignage                           */
  /* ------------------------------------------------------------------ */

  const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'pour', 'avec', 'et', 'en', 'a', 'au', 'aux', 'd', 'l', 'sur', 'par', 'qui', 'que', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'dans', 'comment', 'faire', 'je', 'veux', 'creer', 'mettre', 'place', 'ligne', 'avoir', 'un', 'vos', 'votre']);
  const foldChar = char => {
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return base.length === 1 && /[a-z0-9]/.test(base) ? base : ' ';
  };
  const fold = text => Array.from(String(text || ''), foldChar).join('');
  const stem = word => (word.length > 3 ? word.replace(/(s|x)$/, '') : word);
  function tokenize(query) {
    return fold(query).split(' ').filter(Boolean).filter(word => !STOP.has(word)).map(word => {
      const variants = new Set([stem(word)]);
      const synonym = X.synonyms[word];
      if (synonym) fold(synonym).split(' ').filter(Boolean).forEach(part => variants.add(stem(part)));
      return [...variants];
    });
  }
  const hits = (folded, variants) => variants.some(v => folded.includes(` ${v}`));
  function highlight(text, tokens) {
    const raw = typo(text);
    if (!tokens.length) return esc(raw);
    const folded = Array.from(raw, foldChar).join('');
    const chars = Array.from(raw);
    const marks = new Array(chars.length).fill(false);
    tokens.flat().forEach(variant => {
      let from = 0;
      while (from < folded.length) {
        const at = folded.indexOf(variant, from);
        if (at < 0) break;
        if (at === 0 || folded[at - 1] === ' ') {
          let end = at + variant.length;
          while (end < folded.length && folded[end] !== ' ') end += 1;
          for (let i = at; i < end; i += 1) marks[i] = true;
        }
        from = at + 1;
      }
    });
    let html = '';
    let open = false;
    chars.forEach((char, i) => {
      if (marks[i] && !open) { html += '<mark>'; open = true; }
      if (!marks[i] && open) { html += '</mark>'; open = false; }
      html += esc(char);
    });
    return open ? `${html}</mark>` : html;
  }

  /* ------------------------------------------------------------------ */
  /* Modèle                                                               */
  /* ------------------------------------------------------------------ */

  const DOMAIN_ICON = Object.fromEntries(X.domains.map(d => [d.name, d.icon]));
  const KINDS = {
    question: { label: 'Question', icon: 'help' },
    clinique: { label: 'Clinique du prompt', icon: 'scan' },
    astuce: { label: 'Astuce avant/après', icon: 'bulb' },
    retour: { label: 'Retour d’expérience', icon: 'route' },
    discussion: { label: 'Discussion', icon: 'users' }
  };
  const LEVELS = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };
  const fullModel = ([tool, model]) => {
    if (!model) return tool;
    if (/^(GPT|DALL)/.test(model) || tool === 'Le Chat') return model;
    return `${tool} ${model}`;
  };
  const firstName = name => name.split(' ')[0];
  const toolsLine = tools => tools.map(([tool, model]) => `<span class="tool-ref">${logo(tool)}${t(model ? `${tool} · ${model}` : tool)}</span>`).join('<span class="ex-plus">+</span>');

  const creations = X.creations.map(c => ({
    ...c,
    level: X.levels[c.author] || '',
    toolNames: c.tools.map(([tool]) => tool),
    successCount: c.type !== 'projet' && c.repro ? Math.round(c.repro * c.success / 100) : 0,
    href: `fiche-creation.html?id=${encodeURIComponent(c.id)}`
  }));
  const byId = Object.fromEntries(creations.map(c => [c.id, c]));
  const topicsById = Object.fromEntries(X.topics.map(s => [s.id, s]));
  const casesById = Object.fromEntries(X.cases.map(c => [c.id, { ...c, rate: c.distribution[c.correct] }]));

  const guides = X.objectives.map(o => {
    const items = o.parcours.map(id => byId[id]);
    const reproducible = items.filter(c => c.type !== 'projet');
    const repro = reproducible.reduce((sum, c) => sum + (c.repro || 0), 0);
    const succ = reproducible.reduce((sum, c) => sum + c.successCount, 0);
    const lasts = items.filter(c => c.last).sort((a, b) => b.last.date.localeCompare(a.last.date));
    const authors = [...new Set(items.map(c => c.author))];
    const models = new Map();
    const touch = (pair, id, kind) => {
      const key = fullModel(pair);
      if (!models.has(key)) models.set(key, { key, tool: pair[0], used: new Set(), tested: new Set(), last: '' });
      models.get(key)[kind].add(id);
    };
    items.forEach(c => {
      c.tools.forEach(pair => touch(pair, c.id, 'used'));
      (c.tested || []).forEach(pair => touch(pair, c.id, 'tested'));
      if (c.last) {
        const key = fullModel([c.last.tool, c.last.model]);
        const entry = models.get(key);
        if (entry && (!entry.last || c.last.date > entry.last)) entry.last = c.last.date;
      }
    });
    return {
      ...o,
      pitfalls: [...o.pitfalls].sort((a, b) => b.sources.length - a.sources.length),
      items,
      authors,
      repro,
      rate: repro >= 3 ? Math.round(succ / repro * 100) : null,
      last: lasts[0] ? lasts[0].last : null,
      week: items.reduce((sum, c) => sum + c.week, 0),
      recent: items.map(c => c.date).sort().pop(),
      models: [...models.values()],
      href: `explorer.html?guide=${encodeURIComponent(o.id)}`,
      searchText: ` ${fold([o.title, o.short, o.domain, ...o.keywords, ...o.path.map(s => s.title), ...o.pitfalls.map(p => p.title), ...items.map(c => `${c.title} ${c.tags.join(' ')} ${c.toolNames.join(' ')}`)].join(' '))}`,
      titleText: ` ${fold(`${o.title} ${o.short} ${o.keywords.join(' ')}`)}`
    };
  });
  guides.forEach(g => {
    g.updated = [g.recent, g.last ? g.last.date : ''].sort().pop();
    g.obsolete = g.items.filter(c => c.obsolete);
  });
  const guideById = Object.fromEntries(guides.map(g => [g.id, g]));

  const DOMAIN_BY_NAME = Object.fromEntries(X.domains.map(d => [d.name, d]));
  const DOMAIN_BY_SLUG = Object.fromEntries(X.domains.map(d => [d.slug, d]));
  const domainHref = name => `categorie.html?domaine=${DOMAIN_BY_NAME[name] ? DOMAIN_BY_NAME[name].slug : ''}`;
  const CATEGORY_DOMAIN = Object.fromEntries(creations.map(c => [fold(c.category).trim(), c.domain]));
  function findDomain(value) {
    const folded = fold(value).trim();
    if (!folded) return null;
    return X.domains.find(d => fold(d.name).trim() === folded || d.slug === value) || DOMAIN_BY_NAME[CATEGORY_DOMAIN[folded]] || null;
  }
  const guidesOfDomain = name => guides.filter(g => g.domain === name || g.items.some(c => c.domain === name));

  // Domaines voisins : mêmes savoir-faire, mêmes outils.
  const NEAR = [
    ['Image et illustration', 'Identité visuelle', 'Vidéo'],
    ['Application web', 'Code et scripts', 'Automatisation'],
    ['Automatisation', 'Analyse de données'],
    ['Texte et rédaction', 'Éducation', 'Automatisation'],
    ['Vidéo', 'Musique et son']
  ];
  const near = (a, b) => NEAR.some(group => group.includes(a) && group.includes(b));
  const nearDomains = name => [...new Set(NEAR.filter(group => group.includes(name)).flat())].filter(other => other !== name);
  function relatedGuides(g, count = 3) {
    const tools = o => new Set(o.models.map(x => x.tool));
    const mine = tools(g);
    return guides.filter(o => o.id !== g.id)
      .map(o => ({ o, score: (o.domain === g.domain ? 6 : near(o.domain, g.domain) ? 3 : 0) + Math.min(2, [...tools(o)].filter(tool => mine.has(tool)).length) }))
      .sort((a, b) => b.score - a.score || b.o.week - a.o.week)
      .slice(0, count).map(r => r.o);
  }
  const totals = {
    parcours: creations.length,
    repro: guides.reduce((sum, g) => sum + g.repro, 0)
  };

  /* ------------------------------------------------------------------ */
  /* Mes outils                                                           */
  /* ------------------------------------------------------------------ */

  let myTools = new Set((store.get('vysora-mes-outils', []) || []).filter(name => V.TOOL_BY_NAME[name]));
  const getMyTools = () => myTools;
  const setMyTools = list => { myTools = new Set(list); store.set('vysora-mes-outils', [...myTools]); };

  // Fenêtre de sélection : renvoie la fonction d'ouverture.
  function initToolsDialog(onSave) {
    const { $ } = V;
    const dialog = $('[data-tools-dialog]');
    if (!dialog) return () => {};
    const list = $('[data-tools-list]', dialog);
    const filter = $('[data-tools-filter]', dialog);
    const FAMILY_LABEL = Object.fromEntries(D.toolFamilies.map(f => [f.id, f.label]));
    let draft = new Set();
    const saveLabel = () => { $('[data-tools-save]', dialog).textContent = draft.size ? `Enregistrer ${plural(draft.size, 'outil', 'outils')}` : 'Enregistrer'; };
    function render() {
      const query = fold(filter.value).trim();
      const groups = D.toolFamilies.filter(f => f.id !== 'all').map(f => [f.id, D.tools.filter(tool => tool.family === f.id && (!query || fold(tool.name).includes(query)))]).filter(([, tools]) => tools.length);
      list.innerHTML = groups.length ? groups.map(([family, tools]) => `<section class="ex-tools-fam"><h3>${t(FAMILY_LABEL[family])}</h3><div class="ex-tools-grid">${tools.map(tool => `<button class="ex-tool-opt" type="button" aria-pressed="${draft.has(tool.name)}" data-tool="${esc(tool.name)}">${logo(tool, 18)}<span>${t(tool.name)}</span>${icon('check')}</button>`).join('')}</div></section>`).join('') : `<p class="ex-empty-note">Aucun outil ne correspond à « ${t(filter.value)} ».</p>`;
      saveLabel();
    }
    function open() {
      draft = new Set(myTools);
      dialog.returnValue = '';
      filter.value = '';
      render();
      dialog.showModal();
      filter.focus();
    }
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-tool]');
      if (!button) return;
      const name = button.dataset.tool;
      if (draft.has(name)) draft.delete(name); else draft.add(name);
      button.setAttribute('aria-pressed', String(draft.has(name)));
      saveLabel();
    });
    filter.addEventListener('input', render);
    $('[data-tools-reset]', dialog).addEventListener('click', () => { draft.clear(); render(); });
    $('[data-close-tools]', dialog).addEventListener('click', () => dialog.close(''));
    dialog.addEventListener('close', () => {
      if (dialog.returnValue !== 'save') return;
      setMyTools(draft);
      onSave();
      V.toast(myTools.size ? `${plural(myTools.size, 'outil enregistré', 'outils enregistrés')}.` : 'Sélection d’outils effacée.');
      $('[data-open-tools]')?.focus();
    });
    return open;
  }

  /* ------------------------------------------------------------------ */
  /* Composants                                                           */
  /* ------------------------------------------------------------------ */

  const srOnly = text => `<span class="sr-only">${t(text)}</span>`;
  const kicker = (name, label) => `<p class="kicker">${icon(name, '')}${t(label)}</p>`;
  function shareHTML(sources, total) {
    const dots = Array.from({ length: total }, (_, i) => `<i${i < sources ? ' class="on"' : ''}></i>`).join('');
    return `<span class="ex-share"><span class="ex-dots" aria-hidden="true">${dots}</span>${sources === total ? `dans les ${total} parcours` : `dans ${sources} parcours sur ${total}`}</span>`;
  }
  const isMine = tool => myTools.has(tool);
  function compatOf(g) {
    if (!myTools.size) return null;
    const tested = g.models.filter(m => isMine(m.tool) && (m.tested.size || m.used.size));
    return tested.length ? tested.map(m => m.key) : [];
  }
  function myToolsHTML(compact = false) {
    const list = [...myTools];
    if (!list.length) return `<button class="ex-mytools-btn" type="button" data-open-tools>${icon('wrench')}<span>Indiquer mes outils</span></button>`;
    return `<button class="ex-mytools-btn is-set" type="button" data-open-tools aria-label="Mes outils : ${esc(list.join(', '))}. Modifier">${icon('wrench')}<span>Mes outils</span><span class="ex-stack" aria-hidden="true">${list.slice(0, compact ? 3 : 5).map(name => logo(name, 18)).join('')}</span>${list.length > (compact ? 3 : 5) ? `<small>+${list.length - (compact ? 3 : 5)}</small>` : ''}<span class="ex-mytools-edit">Modifier</span></button>`;
  }

  function miniRouteHTML(g) {
    return `<ol class="ex-mini" aria-hidden="true">${g.path.map((step, i) => {
      const share = step.sources.length / g.items.length;
      const pit = g.pitfalls.some(p => p.step === i);
      return `<li class="${share > 0.5 ? 'is-main' : 'is-some'}${pit ? ' has-pit' : ''}" style="--i:${i}"><span class="ex-mini-node"></span><span class="ex-mini-label">${t(step.title)}</span></li>`;
    }).join('')}</ol>`;
  }

  function guideRowHTML(g, tokens, i) {
    const top = g.pitfalls[0];
    const compat = compatOf(g);
    const thumbs = g.items.slice(0, 3).map(c => `<span class="ex-thumb">${mediaHTML(c.media, '64px')}</span>`).join('');
    const stats = [plural(g.items.length, 'parcours', 'parcours'), g.repro ? plural(g.repro, 'reproduction', 'reproductions') : '', g.rate !== null ? `${g.rate} % de réussite` : '', `mis à jour ${relativeDay(g.updated)}`].filter(Boolean);
    return `<li class="ex-row xp-enter" style="--i:${Math.min(i, 8)}">
      <article class="ex-row-inner">
        <div class="ex-row-main">
          <p class="ex-row-domain">${icon(DOMAIN_ICON[g.domain] || 'compass')}${t(g.domain)}</p>
          <h3 class="ex-row-title"><a href="${g.href}" data-guide-link="${g.id}">${highlight(g.title, tokens)}</a></h3>
          <p class="ex-row-stats">${stats.map(s => `<span>${t(s)}</span>`).join('')}</p>
          <p class="ex-row-people"><span class="ex-avatars" aria-hidden="true">${g.authors.slice(0, 4).map(name => avatar(name, 26)).join('')}</span>${g.authors.length > 1 ? `${t(firstName(g.authors[0]))} et ${plural(g.authors.length - 1, 'autre membre', 'autres membres')}` : t(g.authors[0])}</p>
          ${compat ? (compat.length ? `<p class="ex-row-compat">${icon('check-circle')}Testé avec vos outils : ${t(compat.slice(0, 2).join(', '))}${compat.length > 2 ? '…' : ''}</p>` : `<p class="ex-row-compat is-none">${icon('help')}Pas encore testé avec vos outils</p>`) : ''}
        </div>
        <div class="ex-row-route">
          <p class="ex-row-caption">La méthode qui ressort</p>
          ${miniRouteHTML(g)}
          ${g.obsolete.length ? `<p class="ex-row-warn">${icon('alert')}${plural(g.obsolete.length, 'parcours à revérifier', 'parcours à revérifier')} avec ${t(g.obsolete[0].obsolete.model)}</p>` : ''}
          ${top ? `<p class="ex-row-pit">${icon('moment')}<span><b>Piège le plus fréquent :</b> ${highlight(top.title, tokens)} <small>(${top.sources.length} sur ${g.items.length})</small></span></p>` : ''}
        </div>
        <div class="ex-row-media" aria-hidden="true">${thumbs}</div>
        <span class="ex-row-go" aria-hidden="true">${icon('arrow')}</span>
      </article>
    </li>`;
  }

  function traceHTML(c) {
    const count = c.type === 'projet' ? c.steps.length : c.type === 'iteration' ? c.exchanges : 1;
    const moments = Math.min(c.moments.length, count);
    return `<span class="ex-trace" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<i class="${i >= count - moments ? 'is-moment' : ''}"></i>`).join('')}</span>`;
  }
  function runShape(c) {
    const unit = c.type === 'projet' ? plural(c.steps.length, 'étape', 'étapes') : c.type === 'iteration' ? plural(c.exchanges, 'échange', 'échanges') : (c.attempts > 1 ? `1 prompt, ${c.attempts} essais` : '1 prompt');
    return `${unit} · ${c.moments.length ? plural(c.moments.length, 'moment clé', 'moments clés') : 'sans moment clé'}`;
  }
  function proofHTML(c) {
    if (c.type === 'projet') return `<span class="ex-proof is-muted">${icon('layers')}Projet : se consulte, ne se reproduit pas</span>`;
    if (!c.repro) return `<span class="ex-proof is-muted">${icon('repeat')}Pas encore reproduit</span>`;
    if (c.repro < 3) return `<span class="ex-proof">${icon('repeat')}${plural(c.repro, 'reproduction', 'reproductions')}</span>`;
    return `<span class="ex-proof is-good">${icon('repeat')}<b>${c.success} %</b> sur ${plural(c.repro, 'reproduction', 'reproductions')}</span>`;
  }

  return { nearDomains, initToolsDialog, relatedGuides, DOMAIN_BY_NAME, DOMAIN_BY_SLUG, domainHref, findDomain, guidesOfDomain, STOP, fold, stem, tokenize, hits, highlight, DOMAIN_ICON, KINDS, LEVELS, fullModel, firstName, toolsLine, creations, byId, topicsById, casesById, guides, guideById, totals, srOnly, kicker, shareHTML, isMine, compatOf, myToolsHTML, miniRouteHTML, guideRowHTML, traceHTML, runShape, proofHTML, myTools: getMyTools, setMyTools };
})();
