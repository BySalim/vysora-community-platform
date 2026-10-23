'use strict';

/* Apprendre : bases, notions, règles, astuces et cas Bon réflexe.
   Vues : vue d'ensemble, rubrique (?rubrique=), savoir (?savoir=), cas (?cas=), progression (?vue=progression). */

(() => {
  const V = window.Vysora;
  const M = window.VysoraGuides;
  const A = window.VYSORA_APPRENDRE;
  const X = window.VYSORA_EXPLORER;
  if (!V || !M || !A || !X) return;
  const { D, $, $$, esc, t, plural, icon, store, logo, avatar, mediaHTML, dateLabel, toast } = V;

  /* ------------------------------------------------------------------ */
  /* Modèle                                                               */
  /* ------------------------------------------------------------------ */

  const RUB = Object.fromEntries(A.rubriques.map(r => [r.id, r]));
  const THEMES = Object.fromEntries(A.themes.map(th => [th.id, th]));
  const LETTERS = 'ABCDE';
  const savoirs = A.savoirs.map(s => ({ ...s, href: `apprendre.html?savoir=${encodeURIComponent(s.id)}`, kindLabel: RUB[s.kind].one }));
  const byId = Object.fromEntries(savoirs.map(s => [s.id, s]));
  const bases = savoirs.filter(s => s.kind === 'bases').sort((a, b) => a.order - b.order);
  const notions = savoirs.filter(s => s.kind === 'notions').sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const regles = savoirs.filter(s => s.kind === 'regles');
  const astuces = savoirs.filter(s => s.kind === 'astuces' && !s.replacedBy);
  const replaced = savoirs.filter(s => s.replacedBy);
  const active = savoirs.filter(s => !s.replacedBy);
  const LIST = { bases, notions, regles, astuces };
  const BASE_LABEL = ['Outil et modèle', 'Une demande claire', 'Deux réponses différentes', 'Ce que l’IA ignore', 'Une chose à la fois', 'Bien écrit, pas forcément juste', 'Garder la main', 'Les moments clés'];

  const cases = X.cases.map((c, i) => ({ ...c, ...(A.cases[c.id] || {}), n: i + 1, rate: c.distribution[c.correct], href: `apprendre.html?cas=${encodeURIComponent(c.id)}` }));
  const caseById = Object.fromEntries(cases.map(c => [c.id, c]));

  const FICHES = new Set(D.creations.map(c => c.id));
  const guideOfCreation = id => M.guides.find(g => g.parcours.includes(id));
  function creationHref(id) {
    if (FICHES.has(id)) return `fiche-creation.html?id=${encodeURIComponent(id)}`;
    const g = guideOfCreation(id);
    return g ? g.href : 'explorer.html';
  }
  const momentsTotal = M.creations.reduce((sum, c) => sum + c.moments.length, 0);

  const toolLabel = ([tool, model]) => (model ? `${tool} ${model}` : tool);
  const kindOf = s => RUB[s.kind];
  const shortDate = iso => dateLabel(iso, false);
  const fullDate = iso => dateLabel(iso, true);

  /* ------------------------------------------------------------------ */
  /* Progression (privée, dans ce navigateur)                             */
  /* ------------------------------------------------------------------ */

  const PKEY = 'vysora-apprendre-progres';
  const plain = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
  let progress = (() => { const p = store.get(PKEY, {}); return { acquis: plain(p && p.acquis), cas: plain(p && p.cas), checks: plain(p && p.checks) }; })();
  const saveProgress = () => store.set(PKEY, progress);
  /* Un membre connecté garde sa progression dans son compte et sa première réponse
     à un cas Bon réflexe est définitive (RG-72) ; un visiteur la garde dans ce navigateur. */
  const enCompte = () => V.etats.peut('contribuer');
  const lieu = () => (enCompte() ? 'Votre progression est enregistrée dans votre compte, sur tous vos appareils.' : `Votre progression est enregistrée dans ce navigateur. ${V.invitation('contribuer', 'la retrouver sur tous vos appareils')}`);
  const isAcquired = id => Boolean(progress.acquis[id]);
  function setAcquired(id, on) {
    if (on) progress.acquis[id] = progress.acquis[id] || D.today;
    else delete progress.acquis[id];
    saveProgress();
    renderProgressLink();
  }
  const revisedSince = s => isAcquired(s.id) && s.updated > progress.acquis[s.id];
  function rubCount(id) {
    if (id === 'bon-reflexe') return { done: cases.filter(c => progress.cas[c.id] && progress.cas[c.id].right).length, total: cases.length };
    const list = LIST[id];
    return { done: list.filter(s => isAcquired(s.id)).length, total: list.length };
  }
  function overall() {
    const done = active.filter(s => isAcquired(s.id)).length + rubCount('bon-reflexe').done;
    return { done, total: active.length + cases.length };
  }
  const nextBase = () => bases.find(s => !isAcquired(s.id)) || null;

  /* ------------------------------------------------------------------ */
  /* État et adresse                                                      */
  /* ------------------------------------------------------------------ */

  const state = { view: 'accueil', rubrique: null, id: null, stop: null, family: 'all', level: 0, notionQuery: '' };
  function readURL() {
    const p = new URLSearchParams(location.search);
    const savoir = p.get('savoir');
    const cas = p.get('cas');
    const rubrique = p.get('rubrique');
    state.rubrique = null;
    state.id = null;
    if (savoir && byId[savoir]) { state.view = 'savoir'; state.id = savoir; state.rubrique = byId[savoir].kind; }
    else if (cas && caseById[cas]) { state.view = 'cas'; state.id = cas; state.rubrique = 'bon-reflexe'; }
    else if (rubrique && RUB[rubrique]) { state.view = 'rubrique'; state.rubrique = rubrique; }
    else if (p.get('vue') === 'progression') state.view = 'progression';
    else state.view = 'accueil';
  }

  /* ------------------------------------------------------------------ */
  /* Composants                                                           */
  /* ------------------------------------------------------------------ */

  const kicker = (name, label) => `<p class="kicker">${icon(name, '')}${t(label)}</p>`;
  const kindTag = s => `<span class="ap-kind">${icon(kindOf(s).icon)}${t(s.kindLabel)}</span>`;
  const doneTag = id => (isAcquired(id) ? `<span class="ap-done">${icon('check')}Acquis</span>` : '');
  const levelTag = level => `<span class="level" data-level="${level}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${t(M.LEVELS[level])}</span>`;
  const toolRef = (tool, model, size = 18) => `<span class="ap-tool">${logo(tool, size)}${t(model ? `${tool} ${model}` : tool)}</span>`;

  function segHTML(done, total, label) {
    return `<span class="ap-seg" role="img" aria-label="${esc(label)}">${Array.from({ length: total }, (_, i) => `<i${i < done ? ' class="on"' : ''}></i>`).join('')}</span>`;
  }

  function ringHTML(done, total) {
    const pct = total ? done / total : 0;
    const r = 9;
    const c = 2 * Math.PI * r;
    return `<svg class="ap-ring" viewBox="0 0 24 24" aria-hidden="true"><circle class="ap-ring-bg" cx="12" cy="12" r="${r}"/><circle class="ap-ring-fg" cx="12" cy="12" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"/></svg>`;
  }

  // Prompt avant/après : les passages annotés sont numérotés dans le prompt et dans la légende.
  function annotate(text, notes) {
    let parts = [{ s: text }];
    notes.forEach(([fragment, label], n) => {
      parts = parts.flatMap(part => {
        if (part.n !== undefined) return [part];
        const at = part.s.indexOf(fragment);
        if (at < 0) return [part];
        return [{ s: part.s.slice(0, at) }, { s: fragment, n, label }, { s: part.s.slice(at + fragment.length) }].filter(x => x.s);
      });
    });
    return parts.map(p => (p.n === undefined ? t(p.s) : `<mark class="ap-mark" data-n="${p.n + 1}">${t(p.s)}<span class="sr-only"> (${t(p.label)})</span></mark>`)).join('');
  }
  function promptHTML(s) {
    const p = s.prompt;
    return `<figure class="ap-ba" aria-label="Prompt avant et après">
      <div class="ap-ba-side ap-ba-before"><p class="ap-ba-label">Avant</p><p class="ap-ba-text">${t(p.before)}</p></div>
      <span class="ap-ba-arrow" aria-hidden="true">${icon('arrow')}</span>
      <div class="ap-ba-side ap-ba-after"><p class="ap-ba-label">Après<button class="ap-copy" type="button" data-ap-copy="${esc(s.id)}">${icon('copy')}<span>Copier</span></button></p><p class="ap-ba-text">${annotate(p.after, p.notes)}</p></div>
      <figcaption><ol class="ap-ba-notes">${p.notes.map(([, label], i) => `<li><span class="ap-ba-n" aria-hidden="true">${i + 1}</span>${t(label)}</li>`).join('')}</ol></figcaption>
    </figure>`;
  }

  function bodyHTML(s) {
    return (s.body || []).map(block => `<section class="ap-prose">
      ${block.h ? `<h2>${t(block.h)}</h2>` : ''}
      ${(block.p || []).map(text => `<p>${t(text)}</p>`).join('')}
      ${block.steps ? `<ol class="ap-steps">${block.steps.map(text => `<li>${t(text)}</li>`).join('')}</ol>` : ''}
    </section>`).join('');
  }

  function momentHTML([id, ref]) {
    const c = M.byId[id];
    if (!c) return '';
    const moment = typeof ref === 'number' ? c.moments[ref] : null;
    const text = moment ? moment.text : ref;
    const href = creationHref(id);
    const [tool, model] = c.tools[0];
    return `<li class="ap-moment">
      <a class="ap-moment-media" href="${href}" tabindex="-1" aria-hidden="true">${mediaHTML(c.media, '132px')}</a>
      <div class="ap-moment-body">
        <p class="ap-moment-type">${moment ? `${icon('moment')}${t(moment.type)}` : `${icon('type-' + c.type)}${t(V.TYPE_LABEL[c.type])}`}<span aria-hidden="true">·</span><a href="${href}">${t(c.title)}</a></p>
        <p class="ap-moment-text">${t(text)}</p>
        <p class="ap-moment-by">${avatar(c.author, 22)}<span>${t(c.author)}</span><span aria-hidden="true">·</span>${toolRef(tool, model, 16)}</p>
      </div>
    </li>`;
  }
  function examplesHTML(s) {
    if (!s.examples || !s.examples.length) return '';
    return `<section class="ap-block" aria-labelledby="ap-ex-title">
      <h2 id="ap-ex-title" class="ap-block-title">Vu dans la communauté</h2>
      <p class="ap-block-intro">${s.examples.length > 1 ? 'Des moments clés publiés par les membres, choisis par l’équipe pour illustrer ce savoir.' : 'Un moment clé publié par un membre, choisi par l’équipe pour illustrer ce savoir.'}</p>
      <ul class="ap-moments">${s.examples.map(momentHTML).join('')}</ul>
    </section>`;
  }

  /* Questions et cas : choix au clavier ------------------------------- */

  function choicesHTML(name, choices) {
    return `<div class="ap-choices">${choices.map((choice, i) => `<label class="ap-choice"><input type="radio" name="${name}" value="${i}"><kbd aria-hidden="true">${LETTERS[i]}</kbd><span class="ap-choice-text">${t(choice)}</span><span class="ap-choice-mark" aria-hidden="true"></span></label>`).join('')}</div>`;
  }
  function quizHTML(key, legend, choices) {
    const keys = choices.map((_, i) => LETTERS[i]);
    return `<form class="ap-quiz" data-ap-quiz="${esc(key)}" novalidate>
      <fieldset><legend>${t(legend)}</legend>${choicesHTML(`ap-q-${key.replace(/[^a-z0-9-]/gi, '-')}`, choices)}</fieldset>
      <p class="ap-quiz-error" role="alert" data-ap-error hidden>${icon('alert')}Choisissez une réponse avant de valider.</p>
      <div class="ap-quiz-actions"><button class="btn btn-primary btn-sm" type="submit">Valider ma réponse</button><span class="ap-keys">Touches ${keys.slice(0, -1).join(', ')} ou ${keys[keys.length - 1]}, puis Entrée</span></div>
    </form>`;
  }

  function checkHTML(s) {
    if (!s.check) return '';
    return `<section class="ap-block ap-test" aria-labelledby="ap-test-title">
      <h2 id="ap-test-title" class="ap-block-title">Testez-vous</h2>
      <div class="ap-test-body" data-ap-test="check:${esc(s.id)}">${quizHTML(`check:${s.id}`, s.check.q, s.check.choices)}<div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div></div>
    </section>`;
  }

  function transcriptHTML(c) {
    const [tool, model] = c.tool || ['ChatGPT'];
    return `<div class="ap-transcript">
      <div class="ap-turn ap-turn-you"><span class="ap-turn-avatar" aria-hidden="true">${icon('user')}</span><p class="ap-turn-who">Votre demande</p><p class="ap-turn-text">${t(c.ask || c.context)}</p></div>
      <div class="ap-turn ap-turn-ai"><span class="ap-turn-avatar" aria-hidden="true">${logo(tool, 18)}</span><p class="ap-turn-who">Réponse de ${t(toolLabel([tool, model]))}</p><p class="ap-turn-text">${t(`« ${c.response} »`)}</p></div>
    </div>`;
  }
  function casePlayerHTML(c, { compact = false } = {}) {
    return `<div class="ap-case${compact ? ' is-compact' : ''}" data-ap-test="cas:${esc(c.id)}">
      ${compact ? `<p class="ap-case-context">${t(c.context)}</p>` : ''}
      ${transcriptHTML(c)}
      ${quizHTML(`cas:${c.id}`, 'Que faites-vous ?', c.choices)}
      <div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div>
    </div>`;
  }

  function feedbackHTML(key, choice) {
    const [type, id] = key.split(':');
    if (type === 'check') {
      const s = byId[id];
      const right = choice === s.check.correct;
      return `<p class="ap-feedback-title${right ? '' : ' is-wrong'}">${icon(right ? 'check-circle' : 'bulb')}${right ? 'Bonne réponse.' : 'Pas tout à fait.'}</p>
        ${right ? '' : `<p class="ap-feedback-answer"><span>Bonne réponse, ${LETTERS[s.check.correct]} :</span> ${t(s.check.choices[s.check.correct])}</p>`}
        <p>${t(s.check.why)}</p>
        ${right ? `<p class="ap-feedback-note">${icon('check')}${t(`${s.kindLabel} marquée comme acquise.`)}</p>` : ''}
        <button class="link-btn" type="button" data-ap-retry="${esc(key)}">${icon('replay')}Recommencer</button>`;
    }
    const c = caseById[id];
    const right = choice === c.correct;
    const rule = c.regle && byId[c.regle];
    const total = c.answers;
    return `<p class="ap-feedback-title${right ? '' : ' is-wrong'}">${icon(right ? 'check-circle' : 'bulb')}${right ? 'Vous avez le bon réflexe.' : `Le bon réflexe : ${t(c.choices[c.correct].replace(/^./, ch => ch.toLowerCase()))}.`}</p>
      <p>${t(c.explanation)}</p>
      <h3 class="ap-feedback-sub">Chaque option, et ce qu’a répondu la communauté</h3>
      <ul class="ap-poll">${c.choices.map((label, i) => `<li class="${i === c.correct ? 'is-correct' : ''}${i === choice ? ' is-yours' : ''}">
        <p class="ap-poll-head"><kbd aria-hidden="true">${LETTERS[i]}</kbd><span class="ap-poll-label">${t(label)}</span><b>${c.distribution[i]} %</b></p>
        <span class="ap-poll-bar" aria-hidden="true"><i style="--w:${c.distribution[i]}%"></i></span>
        <p class="ap-poll-why">${i === c.correct ? `<span class="ap-poll-tag">${icon('check')}Bonne réponse</span>` : ''}${i === choice ? `<span class="ap-poll-tag is-yours">Votre choix</span>` : ''}${t(c.reasons[i])}</p>
      </li>`).join('')}</ul>
      <p class="ap-feedback-meta">${t(plural(total, 'réponse', 'réponses'))} de la communauté. ${enCompte() ? t(right ? 'Réponse enregistrée dans votre progression : +1 point de réputation.' : 'Réponse enregistrée dans votre progression.') : lieu()}</p>
      <div class="ap-feedback-actions">
        ${rule && state.view !== 'savoir' ? `<a class="ap-rule-link" href="${rule.href}">${icon(RUB.regles.icon)}<span>${t(`La règle à retenir : ${rule.title.charAt(0).toLowerCase()}${rule.title.slice(1)}`)}</span></a>` : ''}
        ${enCompte() ? '' : `<button class="link-btn" type="button" data-ap-retry="${esc(key)}">${icon('replay')}Recommencer</button>`}
      </div>`;
  }

  function lockQuiz(scope, key, choice, { focus = true } = {}) {
    const form = $('[data-ap-quiz]', scope);
    const [type, id] = key.split(':');
    const correct = type === 'check' ? byId[id].check.correct : caseById[id].correct;
    $$('.ap-choice', form).forEach((label, i) => {
      const input = $('input', label);
      input.checked = i === choice;
      input.disabled = true;
      label.classList.toggle('is-correct', i === correct);
      label.classList.toggle('is-wrong', i === choice && i !== correct);
      $('.ap-choice-mark', label).innerHTML = i === correct ? icon('check') : i === choice ? icon('x') : '';
    });
    form.classList.add('is-locked');
    $('.ap-quiz-actions', form).hidden = true;
    $('[data-ap-error]', form).hidden = true;
    const box = $('[data-ap-feedback]', scope);
    box.innerHTML = feedbackHTML(key, choice);
    box.hidden = false;
    if (V.motion.level() !== 'none') requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-shown')));
    else box.classList.add('is-shown');
    if (focus) box.focus({ preventScroll: false });
  }
  function resetQuiz(scope, key) {
    const [type, id] = key.split(':');
    if (type === 'check') delete progress.checks[id];
    else delete progress.cas[id];
    saveProgress();
    renderProgressLink();
    const holder = scope;
    const c = type === 'cas' ? caseById[id] : null;
    holder.outerHTML = type === 'check'
      ? `<div class="ap-test-body" data-ap-test="${esc(key)}">${quizHTML(key, byId[id].check.q, byId[id].check.choices)}<div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div></div>`
      : casePlayerHTML(c, { compact: holder.classList.contains('is-compact') });
    const fresh = $(`[data-ap-test="${CSS.escape(key)}"]`);
    $('input', fresh)?.focus();
  }
  function restoreQuizzes(scope = document) {
    $$('[data-ap-test]', scope).forEach(holder => {
      const key = holder.dataset.apTest;
      const [type, id] = key.split(':');
      const record = type === 'check' ? progress.checks[id] : progress.cas[id];
      if (record && Number.isInteger(record.choice)) lockQuiz(holder, key, record.choice, { focus: false });
    });
  }
  function answer(form) {
    const key = form.dataset.apQuiz;
    const holder = form.closest('[data-ap-test]');
    const checked = $('input:checked', form);
    if (!checked) {
      $('[data-ap-error]', form).hidden = false;
      $('input', form).focus();
      return;
    }
    const choice = Number(checked.value);
    const [type, id] = key.split(':');
    if (type === 'check') {
      const s = byId[id];
      const right = choice === s.check.correct;
      progress.checks[id] = { choice, right, date: D.today };
      if (right) progress.acquis[id] = progress.acquis[id] || D.today;
    } else {
      const c = caseById[id];
      const right = choice === c.correct;
      progress.cas[id] = { choice, right, date: D.today };
      if (right && c.regle) progress.acquis[c.regle] = progress.acquis[c.regle] || D.today;
    }
    saveProgress();
    renderProgressLink();
    lockQuiz(holder, key, choice);
    syncAcquireButton();
  }

  /* ------------------------------------------------------------------ */
  /* Navigation locale                                                    */
  /* ------------------------------------------------------------------ */

  function renderTabs() {
    $('[data-ap-tabs]').innerHTML = A.rubriques.map(r => {
      const count = r.id === 'bon-reflexe' ? cases.length : LIST[r.id].length;
      const current = state.rubrique === r.id;
      return `<li><a href="apprendre.html?rubrique=${r.id}" data-ap-nav${current ? ` aria-current="${state.view === 'rubrique' ? 'page' : 'true'}"` : ''}>${t(r.label)}<span class="ap-tab-count">${count}</span></a></li>`;
    }).join('');
    const title = $('.ap-local-title');
    if (state.view === 'accueil') title.setAttribute('aria-current', 'page'); else title.removeAttribute('aria-current');
    // Sur mobile, l'onglet actif reste visible dans la barre défilante.
    const list = $('[data-ap-tabs]');
    const current = $('[aria-current]', list);
    if (current && list.scrollWidth > list.clientWidth) {
      const offset = current.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
      list.scrollLeft = Math.max(0, offset - (list.clientWidth - current.offsetWidth) / 2);
    }
  }
  function renderProgressLink() {
    const { done, total } = overall();
    const link = $('[data-ap-progress-link]');
    link.innerHTML = `${ringHTML(done, total)}<span class="ap-progress-text"><span class="ap-progress-label">Ma progression</span><span class="ap-progress-num">${done}<span class="sr-only"> savoirs acquis</span> / ${total}</span></span>`;
    if (state.view === 'progression') link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }

  /* ------------------------------------------------------------------ */
  /* Vue d'ensemble                                                       */
  /* ------------------------------------------------------------------ */

  const JOURNAL_KIND = {
    nouveau: { icon: 'plus', label: s => `Nouvelle ${s.kindLabel.toLowerCase()}` },
    revu: { icon: 'replay', label: s => `${s.kindLabel} revue` },
    remplace: { icon: 'swap', label: s => `${s.kindLabel} remplacée` }
  };
  function journalEntryHTML(entry, { why = true, source = false } = {}) {
    const s = byId[entry.savoir];
    const kind = JOURNAL_KIND[entry.kind];
    return `<p class="ap-jkind" data-jkind="${entry.kind}">${icon(kind.icon)}${t(kind.label(s))}</p>
      <a class="ap-jtitle" href="${s.href}">${t(s.title)}</a>
      ${why ? `<p class="ap-jwhy">${t(entry.why)}</p>` : ''}
      ${source ? `<p class="ap-jsource">${t(A.sources[entry.source])}</p>` : ''}`;
  }

  function heroHTML() {
    const next = nextBase();
    const started = bases.some(s => isAcquired(s.id));
    const cta = next
      ? `<a class="btn btn-primary btn-lg" href="${next.href}">${started ? `Reprendre : ${t(BASE_LABEL[next.order - 1].replace(/^./, ch => ch.toLowerCase()))}` : 'Commencer par les bases'}${icon('arrow')}</a>`
      : `<a class="btn btn-primary btn-lg" href="apprendre.html?rubrique=regles">Passer aux règles${icon('arrow')}</a>`;
    const today = caseById[A.caseOfDay];
    const recent = A.journal.slice(0, 4);
    return `<section class="ap-hero" aria-labelledby="ap-h1">
      <div class="container ap-hero-grid">
        <div class="ap-hero-text">
          <h1 id="ap-h1" tabindex="-1" data-ap-h1>Apprendre à créer avec l’IA</h1>
          <p class="ap-lead">Les bases pour démarrer, les notions à connaître, les règles qui évitent les erreurs coûteuses et les astuces de chaque outil. L’équipe Vysora les rédige à partir de ce que la communauté découvre en créant, et les revoit dès qu’un outil évolue.</p>
          <div class="ap-hero-actions">${cta}<a class="btn btn-secondary btn-lg" href="${today.href}">${icon(RUB['bon-reflexe'].icon)}Le cas du jour</a></div>
          <ul class="ap-hero-count" aria-label="Contenu d’Apprendre">${A.rubriques.map(r => {
            const n = r.id === 'bon-reflexe' ? cases.length : LIST[r.id].length;
            const word = { bases: ['base', 'bases'], notions: ['notion', 'notions'], regles: ['règle', 'règles'], astuces: ['astuce', 'astuces'], 'bon-reflexe': ['cas Bon réflexe', 'cas Bon réflexe'] }[r.id];
            return `<li><a href="apprendre.html?rubrique=${r.id}"><b>${n}</b> ${t(n > 1 ? word[1] : word[0])}</a></li>`;
          }).join('')}</ul>
        </div>
        <aside class="ap-week" aria-labelledby="ap-week-title">
          <div class="ap-week-head"><h2 id="ap-week-title">${icon('history')}Revu cette semaine</h2><p>Mis à jour le ${t(fullDate(A.updated))}</p></div>
          <ol class="ap-week-list">${recent.map(entry => `<li><time datetime="${entry.date}">${t(shortDate(entry.date))}</time><div>${journalEntryHTML(entry, { why: false })}</div></li>`).join('')}</ol>
          <a class="link-arrow" href="#journal">Tout le journal${icon('arrow-down', 'icon-sm')}</a>
        </aside>
      </div>
    </section>`;
  }

  function frisePanelHTML(i) {
    const s = bases[i];
    return `<p class="ap-meta">Base ${i + 1} sur ${bases.length}<span aria-hidden="true">·</span>${s.minutes} min de lecture${isAcquired(s.id) ? `<span aria-hidden="true">·</span>${doneTag(s.id)}` : ''}</p>
      <h3><a href="${s.href}">${t(s.title)}</a></h3>
      <p>${t(s.short)}</p>
      <div class="ap-frise-actions"><a class="btn btn-primary btn-sm" href="${s.href}">${isAcquired(s.id) ? 'Relire cette base' : 'Lire cette base'}${icon('arrow')}</a>${i < bases.length - 1 ? `<button class="link-btn" type="button" data-ap-stop-next>Base suivante${icon('chevron-right')}</button>` : ''}</div>`;
  }
  function basesSectionHTML() {
    const { done, total } = rubCount('bases');
    const sel = state.stop ?? Math.max(0, bases.indexOf(nextBase() || bases[0]));
    state.stop = sel;
    return `<section class="container ap-sec ap-reveal" id="bases" aria-labelledby="ap-bases-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.bases.icon, 'Les bases')}<h2 id="ap-bases-title">Huit essentiels, dans l’ordre</h2><p class="ap-sec-lead">Une vingtaine de minutes pour poser les fondations. ${done ? t(`${done} sur ${total} acquises.`) : 'Commencez par la première, les suivantes s’appuient dessus.'}</p></div>
        <a class="link-arrow" href="apprendre.html?rubrique=bases">Toutes les bases${icon('arrow')}</a>
      </div>
      <div class="ap-frise" data-ap-frise>
        <div class="ap-frise-rail">
          <span class="ap-frise-track" aria-hidden="true"><i style="--done:${total ? done / total : 0}"></i></span>
          <div class="ap-frise-stops" role="tablist" aria-label="Les huit bases">${bases.map((s, i) => `<button class="ap-stop${isAcquired(s.id) ? ' is-done' : ''}" type="button" role="tab" id="ap-stop-${i}" aria-selected="${i === sel}" aria-controls="ap-frise-panel" tabindex="${i === sel ? 0 : -1}" data-ap-stop="${i}"><span class="ap-stop-dot">${isAcquired(s.id) ? `${icon('check')}<span class="sr-only">Acquise : </span>` : ''}<span class="ap-stop-n">${i + 1}</span></span><span class="ap-stop-label">${t(BASE_LABEL[i])}</span></button>`).join('')}</div>
        </div>
        <div class="ap-frise-panel" id="ap-frise-panel" role="tabpanel" aria-labelledby="ap-stop-${sel}" data-ap-frise-panel>${frisePanelHTML(sel)}</div>
      </div>
      <ol class="ap-baselist ap-baselist-home">${bases.map(baseRowHTML).join('')}</ol>
    </section>`;
  }
  function baseRowHTML(s) {
    return `<li class="ap-baserow${isAcquired(s.id) ? ' is-done' : ''}">
      <span class="ap-baserow-n" aria-hidden="true">${s.order}</span>
      <div class="ap-baserow-main"><h3><a href="${s.href}">${t(s.title)}</a></h3><p class="ap-sum">${t(s.short)}</p></div>
      <p class="ap-baserow-meta">${s.minutes} min${isAcquired(s.id) ? doneTag(s.id) : ''}</p>
    </li>`;
  }

  function ruleRowHTML(s) {
    const c = s.situation && caseById[s.situation];
    const record = c ? progress.cas[c.id] : progress.checks[s.id];
    const status = record ? (record.right ? `<span class="ap-done">${icon('check')}${c ? 'Cas réussi' : 'Question réussie'}</span>` : `<span class="ap-todo">${icon('replay')}À revoir</span>`) : `<span class="ap-test-link">${icon(c ? RUB['bon-reflexe'].icon : 'help')}${c ? 'Cas Bon réflexe' : 'Question'}</span>`;
    return `<li class="ap-rulerow">
      <div class="ap-rulerow-main"><h3><a href="${s.href}">${t(s.title)}</a></h3><p class="ap-sum">${t(s.short)}</p></div>
      <p class="ap-rulerow-meta">${status}</p>
    </li>`;
  }
  function rulesSectionHTML() {
    const today = caseById[A.caseOfDay];
    return `<section class="container ap-sec ap-reveal" id="regles" aria-labelledby="ap-rules-title">
      <div class="ap-split">
        <div class="ap-split-main">
          <div class="ap-sec-head">
            <div>${kicker(RUB.regles.icon, 'Les règles')}<h2 id="ap-rules-title">Les règles qui évitent les erreurs coûteuses</h2><p class="ap-sec-lead">Tirées des corrections qui reviennent le plus souvent dans les créations de la communauté.</p></div>
          </div>
          ${A.themes.map(theme => {
            const list = regles.filter(s => s.theme === theme.id).slice(0, 2);
            return `<div class="ap-theme"><h3 class="ap-theme-title">${t(theme.label)}</h3><ul class="ap-rulelist">${list.map(ruleRowHTML).join('')}</ul></div>`;
          }).join('')}
          <a class="link-arrow" href="apprendre.html?rubrique=regles">Les ${regles.length} règles${icon('arrow')}</a>
        </div>
        <aside class="ap-today" aria-labelledby="ap-today-title">
          <p class="ap-today-label">${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe du jour<span aria-hidden="true">·</span>${levelTag(today.level)}</p>
          <h3 id="ap-today-title"><a href="${today.href}">${t(today.title)}</a></h3>
          ${casePlayerHTML(today, { compact: true })}
          <p class="ap-today-foot"><a class="link-arrow" href="apprendre.html?rubrique=bon-reflexe">Tous les cas${icon('arrow')}</a></p>
        </aside>
      </div>
    </section>`;
  }

  function sortedTools() {
    const mine = M.myTools();
    const groups = new Map();
    astuces.forEach(s => {
      if (!groups.has(s.tool)) groups.set(s.tool, []);
      groups.get(s.tool).push(s);
    });
    return [...groups.entries()]
      .map(([tool, list]) => ({ tool, list: list.sort((a, b) => b.verified.localeCompare(a.verified)), mine: mine.has(tool), family: (V.TOOL_BY_NAME[tool] || {}).family, latest: list.map(s => s.verified).sort().pop() }))
      .sort((a, b) => (b.mine - a.mine) || b.latest.localeCompare(a.latest));
  }
  function astuceItemHTML(s) {
    return `<li class="ap-tip${isAcquired(s.id) ? ' is-done' : ''}"><a href="${s.href}">${t(s.title)}</a><p class="ap-sum">${t(s.short)}</p><p class="ap-tip-meta">${s.model ? t(`Vérifiée avec la version ${s.model}, le ${shortDate(s.verified)}`) : t(`Vérifiée le ${shortDate(s.verified)}`)}${doneTag(s.id)}</p></li>`;
  }
  function toolGroupHTML(g, max = 3) {
    const more = g.list.length - max;
    return `<section class="ap-toolgroup${g.mine ? ' is-mine' : ''}" aria-labelledby="ap-tool-${esc(g.tool.replace(/\W+/g, '-'))}">
      <h3 class="ap-toolgroup-title" id="ap-tool-${esc(g.tool.replace(/\W+/g, '-'))}">${logo(g.tool, 26)}<span>${t(g.tool)}</span>${g.mine ? '<span class="ap-mine">Votre outil</span>' : ''}</h3>
      <ul class="ap-tips">${g.list.slice(0, max).map(astuceItemHTML).join('')}</ul>
      ${more > 0 ? `<a class="ap-more" href="apprendre.html?rubrique=astuces">${t(plural(more, 'autre astuce', 'autres astuces'))}</a>` : ''}
    </section>`;
  }
  function astucesSectionHTML() {
    const groups = sortedTools().slice(0, 6);
    return `<section class="container ap-sec ap-reveal" id="astuces" aria-labelledby="ap-tips-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.astuces.icon, 'Les astuces')}<h2 id="ap-tips-title">Ce qui fonctionne, outil par outil</h2><p class="ap-sec-lead">Chaque astuce est datée et vérifiée avec une version précise. Quand un outil change, l’équipe la revoit.</p></div>
        <div class="ap-sec-tools">${M.myToolsHTML(true)}<a class="link-arrow" href="apprendre.html?rubrique=astuces">Les ${astuces.length} astuces${icon('arrow')}</a></div>
      </div>
      <div class="ap-toolgrid">${groups.map(g => toolGroupHTML(g, 2)).join('')}</div>
    </section>`;
  }

  function letterOf(s) { return M.fold(s.title).trim().charAt(0).toUpperCase(); }
  function alphabetHTML(base = '') {
    const present = new Set(notions.map(letterOf));
    return `<nav class="ap-alpha" aria-label="Notions par lettre"><ul>${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => present.has(letter)
      ? `<li><a href="${base}#lettre-${letter.toLowerCase()}">${letter}</a></li>`
      : `<li><span aria-hidden="true">${letter}</span></li>`).join('')}</ul></nav>`;
  }
  function notionsSectionHTML() {
    const picks = ['contexte', 'hallucination', 'graine', 'agent', 'image-reference', 'fenetre-contexte'].map(id => byId[id]);
    return `<section class="container ap-sec ap-reveal" id="notions" aria-labelledby="ap-notions-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.notions.icon, 'Les notions')}<h2 id="ap-notions-title">Les mots à connaître</h2><p class="ap-sec-lead">Définis simplement, avec un exemple tiré des créations publiées.</p></div>
        <a class="link-arrow" href="apprendre.html?rubrique=notions">Les ${notions.length} notions${icon('arrow')}</a>
      </div>
      ${alphabetHTML('apprendre.html?rubrique=notions')}
      <dl class="ap-glossary ap-glossary-home">${picks.map(s => `<div class="ap-term"><dt><a href="${s.href}">${t(s.title)}</a></dt><dd>${t(s.short)}</dd></div>`).join('')}</dl>
    </section>`;
  }

  function originHTML() {
    const steps = [
      [String(momentsTotal), 'Les moments clés publiés', `Corrections, refus et découvertes notés dans ${M.creations.length} créations. Quand la même correction revient, elle devient une règle ou une astuce.`],
      [String(X.topics.length), 'Les questions du forum', 'Une question qui revient chaque semaine signale un savoir qui manque ou qui n’est plus clair.'],
      [String(D.tools.length), 'L’actualité des outils', 'Chaque nouvelle version peut confirmer une astuce, ou la rendre caduque.'],
      [String(active.length + cases.length), 'L’équipe Vysora rédige et date', 'Le système signale ce qui change ; l’équipe vérifie, écrit, puis note chaque modification dans le journal.']
    ];
    const unit = ['moments clés', 'sujets', 'outils suivis', 'savoirs publiés'];
    return `<section class="ap-band ap-reveal" aria-labelledby="ap-origin-title">
      <div class="container">
        <div class="ap-band-head">
          <h2 id="ap-origin-title">D’où viennent ces savoirs</h2>
          <p>Chaque savoir part de ce que les membres vivent en créant. Seule l’équipe Vysora les rédige et les publie : chaque page reste exacte, datée et à jour.</p>
        </div>
        <ol class="ap-origin">${steps.map(([n, title, text], i) => `<li class="${i === 3 ? 'is-team' : ''}"><span class="ap-origin-node" aria-hidden="true"></span><p class="ap-origin-n"><b>${n}</b> ${t(unit[i])}</p><h3>${t(title)}</h3><p>${t(text)}</p></li>`).join('')}</ol>
        <p class="ap-band-links"><a href="explorer.html">Les guides par objectif, dans Explorer${icon('arrow')}</a><a href="forum.html?nouveau=question">Poser une question au forum${icon('arrow')}</a></p>
      </div>
    </section>`;
  }

  function journalSectionHTML() {
    const days = [];
    A.journal.forEach(entry => {
      const last = days[days.length - 1];
      if (last && last.date === entry.date) last.entries.push(entry); else days.push({ date: entry.date, entries: [entry] });
    });
    return `<section class="container ap-sec ap-reveal" id="journal" aria-labelledby="ap-journal-title">
      <div class="ap-sec-head">
        <div>${kicker('history', 'Journal')}<h2 id="ap-journal-title">Ce qui a changé</h2><p class="ap-sec-lead">Chaque modification est datée et expliquée. Un savoir revu après votre lecture est signalé dans votre progression.</p></div>
      </div>
      <ol class="ap-journal">${days.map(day => `<li class="ap-jday"><time datetime="${day.date}">${t(fullDate(day.date))}</time><ul>${day.entries.map(entry => `<li class="ap-jentry">${journalEntryHTML(entry, { source: true })}</li>`).join('')}</ul></li>`).join('')}</ol>
    </section>`;
  }

  function renderAccueil() {
    return `${heroHTML()}${basesSectionHTML()}${rulesSectionHTML()}${astucesSectionHTML()}${notionsSectionHTML()}${originHTML()}${journalSectionHTML()}`;
  }

  /* ------------------------------------------------------------------ */
  /* Rubriques                                                            */
  /* ------------------------------------------------------------------ */

  function rubHeadHTML(r, extra = '') {
    const { done, total } = rubCount(r.id);
    const unit = r.id === 'bon-reflexe' ? 'réussis' : (r.id === 'bases' || r.id === 'notions' || r.id === 'regles' || r.id === 'astuces') ? 'acquises' : 'acquis';
    return `<header class="container ap-head">
      ${kicker(r.icon, r.label)}
      <h1 id="ap-h1" tabindex="-1" data-ap-h1>${t(r.title)}</h1>
      <p class="ap-lead">${t(r.lead)}</p>
      <div class="ap-head-foot"><p class="ap-head-progress">${segHTML(done, total, `${done} sur ${total} ${unit}`)}<span><b>${done}</b> sur ${total} ${t(unit)}</span></p>${extra}</div>
    </header>`;
  }

  function rubBases() {
    const next = nextBase();
    const extra = next ? `<a class="btn btn-primary btn-sm" href="${next.href}">${bases.some(s => isAcquired(s.id)) ? `Reprendre à la base ${next.order}` : 'Commencer par la première'}${icon('arrow')}</a>` : '';
    return `${rubHeadHTML(RUB.bases, extra)}<div class="container ap-rub"><ol class="ap-baselist">${bases.map(baseRowHTML).join('')}</ol></div>`;
  }

  function notionGroupsHTML() {
    const tokens = M.tokenize(state.notionQuery);
    const list = notions.filter(s => !tokens.length || tokens.every(variants => M.hits(` ${M.fold(`${s.title} ${s.short}`)}`, variants)));
    if (!list.length) return `<p class="ap-empty">${t(`Aucune notion ne correspond à « ${state.notionQuery} ».`)} <button class="link-btn" type="button" data-ap-notion-clear>Afficher toutes les notions</button></p>`;
    const groups = new Map();
    list.forEach(s => { const l = letterOf(s); if (!groups.has(l)) groups.set(l, []); groups.get(l).push(s); });
    return [...groups.entries()].map(([letter, items]) => `<section class="ap-letter" id="lettre-${letter.toLowerCase()}" aria-labelledby="ap-l-${letter}">
      <h2 class="ap-letter-title" id="ap-l-${letter}">${letter}</h2>
      <dl class="ap-glossary">${items.map(s => `<div class="ap-term${isAcquired(s.id) ? ' is-done' : ''}"><dt><a href="${s.href}">${M.highlight(s.title, tokens)}</a>${doneTag(s.id)}</dt><dd>${M.highlight(s.short, tokens)}</dd></div>`).join('')}</dl>
    </section>`).join('');
  }
  function rubNotions() {
    return `${rubHeadHTML(RUB.notions)}<div class="container ap-rub">
      <div class="ap-notions-bar">
        <label class="ap-filter">${icon('search')}<span class="sr-only">Filtrer les notions</span><input type="search" placeholder="Filtrer les notions" value="${esc(state.notionQuery)}" autocomplete="off" data-ap-notion-filter></label>
        ${alphabetHTML()}
      </div>
      <div data-ap-notion-groups>${notionGroupsHTML()}</div>
    </div>`;
  }

  function rubRegles() {
    return `${rubHeadHTML(RUB.regles)}<div class="container ap-rub">${A.themes.map(theme => `<section class="ap-theme" aria-labelledby="ap-th-${theme.id}">
      <h2 class="ap-theme-title" id="ap-th-${theme.id}">${t(theme.label)}</h2>
      <ul class="ap-rulelist">${regles.filter(s => s.theme === theme.id).map(ruleRowHTML).join('')}</ul>
    </section>`).join('')}</div>`;
  }

  function rubAstuces() {
    const groups = sortedTools();
    const families = D.toolFamilies.filter(f => f.id !== 'all' && groups.some(g => g.family === f.id));
    const shown = groups.filter(g => state.family === 'all' || (state.family === 'mine' ? g.mine : g.family === state.family));
    const chip = (id, label, count) => `<button class="ap-chip" type="button" aria-pressed="${state.family === id}" data-ap-family="${id}">${t(label)}<span>${count}</span></button>`;
    const mineCount = groups.filter(g => g.mine).reduce((n, g) => n + g.list.length, 0);
    return `${rubHeadHTML(RUB.astuces, M.myToolsHTML(true))}<div class="container ap-rub">
      <div class="ap-chips" role="group" aria-label="Filtrer les astuces">${chip('all', 'Toutes', astuces.length)}${mineCount ? chip('mine', 'Mes outils', mineCount) : ''}${families.map(f => chip(f.id, f.label, groups.filter(g => g.family === f.id).reduce((n, g) => n + g.list.length, 0))).join('')}</div>
      <div class="ap-toolgrid ap-toolgrid-full">${shown.map(g => toolGroupHTML(g, 99)).join('')}</div>
      ${replaced.length ? `<details class="ap-replaced"><summary>${icon('swap')}${t(plural(replaced.length, 'astuce remplacée', 'astuces remplacées'))}</summary><ul class="ap-tips">${replaced.map(s => `<li class="ap-tip is-replaced"><a href="${s.href}">${t(s.title)}</a><p class="ap-sum">${t(s.short)}</p><p class="ap-tip-meta">${toolRef(s.tool, s.model, 16)}<span aria-hidden="true">·</span>Remplacée le ${t(shortDate(s.updated))}</p></li>`).join('')}</ul></details>` : ''}
    </div>`;
  }

  function caseRowHTML(c) {
    const record = progress.cas[c.id];
    const status = record ? (record.right ? `<span class="ap-done">${icon('check')}Réussi</span>` : `<span class="ap-todo">${icon('replay')}À revoir</span>`) : '';
    return `<li class="ap-caserow">
      <p class="ap-caserow-meta">${levelTag(c.level)}<span>${icon(M.DOMAIN_ICON[c.domain] || 'compass')}${t(c.domain)}</span><span>${icon('clock')}${c.minutes} min</span></p>
      <h3><a href="${c.href}">${t(c.title)}</a></h3>
      <p class="ap-sum">${t(c.context)}</p>
      <p class="ap-caserow-side"><span class="ap-rate"><b>${c.rate} %</b> de bonnes réponses</span>${status}</p>
    </li>`;
  }
  function rubCas() {
    const levels = [0, 1, 2, 3];
    const list = cases.filter(c => !state.level || c.level === state.level);
    return `${rubHeadHTML(RUB['bon-reflexe'])}<div class="container ap-rub">
      <div class="ap-chips" role="group" aria-label="Filtrer par niveau">${levels.map(l => `<button class="ap-chip" type="button" aria-pressed="${state.level === l}" data-ap-level="${l}">${l ? t(M.LEVELS[l]) : 'Tous les niveaux'}<span>${l ? cases.filter(c => c.level === l).length : cases.length}</span></button>`).join('')}</div>
      <ul class="ap-caselist">${list.map(caseRowHTML).join('')}</ul>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Savoir                                                               */
  /* ------------------------------------------------------------------ */

  function crumbsHTML(r, current) {
    return `<nav class="ap-crumbs" aria-label="Fil d’Ariane"><ol><li><a href="apprendre.html">Apprendre</a></li><li><a href="apprendre.html?rubrique=${r.id}">${t(r.label)}</a></li><li><span aria-current="page">${t(current)}</span></li></ol></nav>`;
  }
  function acquireHTML(s) {
    const on = isAcquired(s.id);
    return `<button class="ap-acquire" type="button" aria-pressed="${on}" data-ap-acquire="${esc(s.id)}"><span class="ap-acquire-box" aria-hidden="true">${icon('check')}</span><span class="ap-acquire-text">${on ? t(`Acquis le ${shortDate(progress.acquis[s.id])}`) : 'Marquer comme acquis'}</span></button>`;
  }
  function syncAcquireButton() {
    const button = $('[data-ap-acquire]');
    if (!button) return;
    button.outerHTML = acquireHTML(byId[button.dataset.apAcquire]);
  }
  function linksHTML(s) {
    const items = [];
    const l = s.links || {};
    const g = l.guide && M.guideById[l.guide];
    if (g) items.push(`<li><a href="${g.href}">${icon('compass')}<span><small>Guide dans Explorer</small>${t(g.short || g.title)}</span></a></li>`);
    if (l.domain && M.DOMAIN_BY_NAME[l.domain]) items.push(`<li><a href="${M.domainHref(l.domain)}">${icon(M.DOMAIN_ICON[l.domain] || 'compass')}<span><small>Domaine</small>${t(l.domain)}</span></a></li>`);
    const topic = l.topic && M.topicsById[l.topic];
    if (topic) items.push(`<li><a href="forum.html?sujet=${encodeURIComponent(topic.id)}">${icon('message')}<span><small>${t(`Au forum · ${M.KINDS[topic.kind].label}${topic.status === 'resolved' ? ', résolue' : ''}`)}</small>${t(topic.title)}</span></a></li>`);
    if (l.publish) items.push(`<li><a href="nouvelle-creation.html">${icon('plus')}<span><small>Sur Vysora</small>Publier une création et ses moments clés</span></a></li>`);
    items.push(`<li><a href="forum.html?nouveau=question">${icon('help')}<span><small>Une question sur ce sujet ?</small>La poser au forum</span></a></li>`);
    return `<section class="ap-aside-block" aria-labelledby="ap-more-title"><h2 id="ap-more-title">Pour aller plus loin</h2><ul class="ap-links">${items.join('')}</ul></section>`;
  }
  function relatedHTML(s) {
    const list = (s.related || []).map(id => byId[id]).filter(Boolean);
    if (!list.length) return '';
    return `<section class="ap-aside-block" aria-labelledby="ap-rel-title"><h2 id="ap-rel-title">À lire aussi</h2><ul class="ap-related">${list.map(r => `<li><a href="${r.href}"><span class="ap-related-kind">${icon(kindOf(r).icon)}${t(r.kindLabel)}</span>${t(r.title)}</a></li>`).join('')}</ul></section>`;
  }
  function historyHTML(s) {
    return `<section class="ap-aside-block" aria-labelledby="ap-hist-title"><h2 id="ap-hist-title">Historique</h2><ol class="ap-history">${[...s.history].reverse().map(([date, text]) => `<li><time datetime="${date}">${t(fullDate(date))}</time><span>${t(text)}</span></li>`).join('')}</ol></section>`;
  }
  function pagerHTML(s) {
    const list = s.replacedBy ? [] : LIST[s.kind];
    const i = list.indexOf(s);
    if (i < 0) return '';
    const prev = list[i - 1];
    const next = list[i + 1];
    const unit = kindOf(s).one.toLowerCase();
    return `<nav class="ap-pager" aria-label="${t(`${kindOf(s).label} voisines`)}">
      ${prev ? `<a class="ap-pager-prev" href="${prev.href}" rel="prev"><small>${icon('chevron-left')}Précédente</small><span>${t(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="ap-pager-next" href="${next.href}" rel="next"><small>${t(`${unit.charAt(0).toUpperCase()}${unit.slice(1)} suivante`)}${icon('chevron-right')}</small><span>${t(next.title)}</span></a>` : `<a class="ap-pager-next" href="apprendre.html?rubrique=${s.kind}"><small>${t(`Toutes les ${kindOf(s).label.toLowerCase()}`)}${icon('chevron-right')}</small><span>${t(`${i + 1} sur ${list.length}, vous êtes à la fin`)}</span></a>`}
    </nav>`;
  }

  function renderSavoir() {
    const s = byId[state.id];
    const r = kindOf(s);
    const c = s.situation && caseById[s.situation];
    const metaBits = [
      `${icon(r.icon)}${t(r.one)}`,
      s.kind === 'bases' ? t(`${s.order} sur ${bases.length}`) : '',
      s.theme ? t(THEMES[s.theme].label) : '',
      `${s.minutes} min de lecture`
    ].filter(Boolean);
    const successor = s.replacedBy && byId[s.replacedBy];
    const toolLine = s.kind === 'astuces' ? `<p class="ap-verified">${logo(s.tool, 22)}<span>${t(s.model ? `${s.tool} ${s.model}` : s.tool)}</span><span class="ap-verified-date">${successor ? t(`Valable jusqu’à la version ${s.model}`) : `${icon('check-circle')}${t(`Vérifiée le ${fullDate(s.verified)}`)}`}</span></p>` : '';
    const tools = (s.tools || []).filter(name => V.TOOL_BY_NAME[name]);
    return `<div class="container ap-page">
      ${crumbsHTML(r, s.title)}
      <div class="ap-page-grid">
        <article class="ap-article" aria-labelledby="ap-h1">
          <header class="ap-article-head">
            <p class="ap-meta">${metaBits.join('<span aria-hidden="true">·</span>')}</p>
            <h1 id="ap-h1" tabindex="-1" data-ap-h1>${t(s.title)}</h1>
            <p class="ap-essentiel">${t(s.short)}</p>
            ${toolLine}
            ${successor ? `<p class="ap-notice">${icon('swap')}<span>${t(`Astuce remplacée le ${fullDate(s.updated)}.`)} <a href="${successor.href}">${t(`Lire « ${successor.title} »`)}</a></span></p>` : ''}
            ${revisedSince(s) ? `<p class="ap-notice is-info">${icon('replay')}<span>${t(`Revu le ${fullDate(s.updated)}, après votre lecture du ${fullDate(progress.acquis[s.id])}.`)} <a href="#ap-hist-title">Voir ce qui a changé</a></span></p>` : ''}
          </header>
          ${s.prompt ? promptHTML(s) : ''}
          ${bodyHTML(s)}
          ${tools.length ? `<p class="ap-tools-line"><span>Outils concernés :</span>${tools.map(name => toolRef(name, '', 18)).join('')}</p>` : ''}
          ${examplesHTML(s)}
          ${c ? `<section class="ap-block ap-test" aria-labelledby="ap-test-title">
              <h2 id="ap-test-title" class="ap-block-title">Testez-vous</h2>
              <p class="ap-block-intro">${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe · <a href="${c.href}">${t(c.title)}</a></p>
              <p class="ap-case-context">${t(c.context)}</p>
              ${casePlayerHTML(c)}
            </section>` : checkHTML(s)}
          <footer class="ap-article-foot">${successor ? '' : acquireHTML(s)}${pagerHTML(s)}</footer>
        </article>
        <aside class="ap-aside" aria-label="À propos de ce savoir">
          <section class="ap-aside-block ap-byline"><img src="assets/logos/vysora%20logo%20bleu.png" alt="" width="36" height="36"><p><b>Rédigé par l’équipe Vysora</b><span>${t(`Revu le ${fullDate(s.updated)}`)}</span></p></section>
          ${historyHTML(s)}
          ${linksHTML(s)}
          ${relatedHTML(s)}
        </aside>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Cas Bon réflexe                                                      */
  /* ------------------------------------------------------------------ */

  function renderCas() {
    const c = caseById[state.id];
    const rule = c.regle && byId[c.regle];
    const i = cases.indexOf(c);
    const next = cases[(i + 1) % cases.length];
    const [tool, model] = c.tool || [];
    return `<div class="container ap-page">
      ${crumbsHTML(RUB['bon-reflexe'], c.title)}
      <div class="ap-page-grid">
        <article class="ap-article ap-case-page" aria-labelledby="ap-h1">
          <header class="ap-article-head">
            <p class="ap-meta">${levelTag(c.level)}<span aria-hidden="true">·</span><span>${icon(M.DOMAIN_ICON[c.domain] || 'compass')}${t(c.domain)}</span><span aria-hidden="true">·</span>${c.minutes} min<span aria-hidden="true">·</span>${t(`Cas ${c.n} sur ${cases.length}`)}</p>
            <h1 id="ap-h1" tabindex="-1" data-ap-h1>${t(c.title)}</h1>
            <p class="ap-essentiel">${t(c.context)}</p>
          </header>
          ${casePlayerHTML(c)}
          <footer class="ap-article-foot ap-case-foot">
            <a class="link-arrow" href="apprendre.html?rubrique=bon-reflexe">${icon('chevron-left')}Tous les cas</a>
            <a class="btn btn-secondary btn-sm" href="${next.href}">Cas suivant : ${t(next.title)}${icon('arrow')}</a>
          </footer>
        </article>
        <aside class="ap-aside" aria-label="À propos de ce cas">
          ${rule ? `<section class="ap-aside-block ap-aside-rule" aria-labelledby="ap-rule-title"><h2 id="ap-rule-title">La règle à retenir</h2><p class="ap-aside-rule-title"><a href="${rule.href}">${t(rule.title)}</a></p><p>${t(rule.short)}</p></section>` : ''}
          <section class="ap-aside-block" aria-labelledby="ap-stats-title"><h2 id="ap-stats-title">Ce cas en chiffres</h2>
            <dl class="ap-stats"><div><dt>Réponses</dt><dd>${V.fmt(c.answers)}</dd></div><div><dt>Bonnes réponses</dt><dd>${c.rate} %</dd></div><div><dt>Votes « Utile »</dt><dd>${V.fmt(c.useful)}</dd></div></dl>
          </section>
          <section class="ap-aside-block ap-byline"><img src="assets/logos/vysora%20logo%20bleu.png" alt="" width="36" height="36"><p><b>Rédigé par l’équipe Vysora</b><span>${t(`D’après une réponse de ${toolLabel([tool, model])}, le ${fullDate(c.date)}`)}</span></p></section>
          ${rule ? linksHTML(rule) : ''}
        </aside>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Progression                                                          */
  /* ------------------------------------------------------------------ */

  function renderProgression() {
    const { done, total } = overall();
    const items = A.rubriques.map(r => ({ r, ...rubCount(r.id) }));
    const acquired = Object.entries(progress.acquis).filter(([id]) => byId[id]).sort((a, b) => b[1].localeCompare(a[1]) || 0).slice(0, 8);
    const toReview = [
      ...cases.filter(c => progress.cas[c.id] && !progress.cas[c.id].right).map(c => ({ href: c.href, kind: `${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe`, title: c.title, why: 'Réponse à revoir' })),
      ...active.filter(s => progress.checks[s.id] && !progress.checks[s.id].right).map(s => ({ href: s.href, kind: `${icon(kindOf(s).icon)}${t(s.kindLabel)}`, title: s.title, why: 'Question à refaire' })),
      ...active.filter(revisedSince).map(s => ({ href: s.href, kind: `${icon(kindOf(s).icon)}${t(s.kindLabel)}`, title: s.title, why: `Revu le ${shortDate(s.updated)}, après votre lecture` }))
    ];
    const next = nextBase();
    const nextRule = regles.find(s => !isAcquired(s.id));
    const suggestion = next || nextRule;
    return `<header class="container ap-head">
      ${kicker('trend-up', 'Votre progression')}
      <h1 id="ap-h1" tabindex="-1" data-ap-h1>Ce que vous avez appris</h1>
      <p class="ap-lead">Visible de vous seul. ${lieu()}</p>
      <div class="ap-head-foot"><p class="ap-head-progress">${ringHTML(done, total)}<span><b>${done}</b> ${t(`sur ${total} savoirs et cas`)}</span></p>${suggestion ? `<a class="btn btn-primary btn-sm" href="${suggestion.href}">${next ? `Continuer avec la base ${next.order}` : 'Continuer avec les règles'}${icon('arrow')}</a>` : ''}</div>
    </header>
    <div class="container ap-rub ap-prog">
      <ul class="ap-prog-grid">${items.map(({ r, done: d, total: n }) => `<li><a class="ap-prog-item" href="apprendre.html?rubrique=${r.id}">
        <span class="ap-prog-name">${icon(r.icon)}${t(r.label)}</span>
        <span class="ap-prog-count"><b>${d}</b> sur ${n}</span>
        ${segHTML(d, n, `${d} sur ${n}`)}
      </a></li>`).join('')}</ul>
      <div class="ap-prog-cols">
        <section aria-labelledby="ap-recent-title"><h2 id="ap-recent-title" class="ap-block-title">Acquis récemment</h2>
          ${acquired.length ? `<ul class="ap-plain">${acquired.map(([id, date]) => { const s = byId[id]; return `<li><a href="${s.href}"><span class="ap-related-kind">${icon(kindOf(s).icon)}${t(s.kindLabel)}</span>${t(s.title)}</a><time datetime="${date}">${t(shortDate(date))}</time></li>`; }).join('')}</ul>` : `<p class="ap-empty">Rien pour l’instant. Marquez un savoir comme acquis, ou réussissez sa question : il apparaîtra ici.${next ? ` <a href="${next.href}">${t(`Commencer par « ${next.title} »`)}</a>` : ''}</p>`}
        </section>
        <section aria-labelledby="ap-review-title"><h2 id="ap-review-title" class="ap-block-title">À revoir</h2>
          ${toReview.length ? `<ul class="ap-plain">${toReview.map(item => `<li><a href="${item.href}"><span class="ap-related-kind">${item.kind}</span>${t(item.title)}</a><span class="ap-why">${t(item.why)}</span></li>`).join('')}</ul>` : '<p class="ap-empty">Rien à revoir. Les cas manqués et les savoirs revus après votre lecture s’afficheront ici.</p>'}
        </section>
      </div>
      <div class="ap-reset" data-ap-reset-zone>${done || Object.keys(progress.cas).length || Object.keys(progress.checks).length ? '<button class="link-btn ap-reset-btn" type="button" data-ap-reset>Effacer ma progression</button>' : ''}</div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Affichage                                                            */
  /* ------------------------------------------------------------------ */

  const TITLES = {
    accueil: () => 'Apprendre · Vysora',
    rubrique: () => `${RUB[state.rubrique].label} · Apprendre · Vysora`,
    savoir: () => `${byId[state.id].title} · Apprendre · Vysora`,
    cas: () => `${caseById[state.id].title} · Bon réflexe · Vysora`,
    progression: () => 'Votre progression · Apprendre · Vysora'
  };
  const RUB_RENDER = { bases: rubBases, notions: rubNotions, regles: rubRegles, astuces: rubAstuces, 'bon-reflexe': rubCas };

  let revealObserver = null;
  function observeReveal(view) {
    if (revealObserver) revealObserver.disconnect();
    const items = $$('.ap-reveal', view);
    if (!('IntersectionObserver' in window) || !V.motion.full()) { items.forEach(el => el.classList.add('is-in')); return; }
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); revealObserver.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    items.forEach(el => revealObserver.observe(el));
  }

  function show({ focus = true, hash = '' } = {}) {
    const view = $('[data-ap-view]');
    view.dataset.apScreen = state.view;
    if (state.view !== 'accueil') state.stop = null;
    view.innerHTML = state.view === 'accueil' ? renderAccueil()
      : state.view === 'rubrique' ? RUB_RENDER[state.rubrique]()
        : state.view === 'savoir' ? renderSavoir()
          : state.view === 'cas' ? renderCas()
            : renderProgression();
    document.title = TITLES[state.view]();
    renderTabs();
    renderProgressLink();
    restoreQuizzes(view);
    observeReveal(view);
    closeSearch(false);
    if (V.motion.level() !== 'none') { view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering'); }
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) {
      requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash.slice(1))).scrollIntoView({ block: 'start' }));
    } else if (focus) {
      window.scrollTo({ top: 0 });
    }
    if (focus) $('[data-ap-h1]', view)?.focus({ preventScroll: true });
  }
  function navigate(url, { replace = false } = {}) {
    const target = new URL(url, location.href);
    const path = `${target.pathname.split('/').pop()}${target.search}${target.hash}`;
    history[replace ? 'replaceState' : 'pushState'](null, '', path);
    readURL();
    show({ focus: true, hash: target.hash });
  }

  /* Frise des bases ---------------------------------------------------- */

  function selectStop(i, { focus = false } = {}) {
    const frise = $('[data-ap-frise]');
    if (!frise) return;
    state.stop = Math.max(0, Math.min(bases.length - 1, i));
    $$('[data-ap-stop]', frise).forEach((button, n) => {
      const on = n === state.stop;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    const panel = $('[data-ap-frise-panel]', frise);
    panel.setAttribute('aria-labelledby', `ap-stop-${state.stop}`);
    panel.innerHTML = frisePanelHTML(state.stop);
    if (V.motion.level() !== 'none') { panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping'); }
  }

  /* Recherche ---------------------------------------------------------- */

  const index = [
    ...active.map(s => ({ href: s.href, kind: s.kindLabel, kindIcon: kindOf(s).icon, title: s.title, sub: s.kind === 'astuces' ? `${s.tool}${s.model ? ` ${s.model}` : ''}` : '', text: ` ${M.fold(`${s.title} ${s.short} ${s.tool || ''} ${(s.tools || []).join(' ')} ${s.kindLabel}`)}`, titleText: ` ${M.fold(s.title)}` })),
    ...cases.map(c => ({ href: c.href, kind: 'Cas Bon réflexe', kindIcon: RUB['bon-reflexe'].icon, title: c.title, sub: c.domain, text: ` ${M.fold(`${c.title} ${c.context} ${c.domain} bon reflexe cas`)}`, titleText: ` ${M.fold(c.title)}` }))
  ];
  function searchResults(query) {
    const tokens = M.tokenize(query);
    if (!tokens.length) return { tokens, list: [] };
    const list = index
      .filter(item => tokens.every(variants => M.hits(item.text, variants)))
      .map(item => ({ item, score: tokens.filter(variants => M.hits(item.titleText, variants)).length }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(r => r.item);
    return { tokens, list };
  }
  function renderSearch() {
    const input = $('[data-ap-search-input]');
    const query = input.value.trim();
    const { tokens, list } = searchResults(query);
    const box = $('[data-ap-search-results]');
    const status = $('[data-ap-search-status]');
    if (!query) {
      box.innerHTML = `<li class="ap-search-hint">Exemples : ${['graine', 'agent', 'traduction', 'Midjourney', 'script'].map(word => `<button class="link-btn" type="button" data-ap-search-try="${word}">${word}</button>`).join('')}</li>`;
      status.textContent = '';
      return;
    }
    box.innerHTML = list.length
      ? list.map(item => `<li><a class="ap-search-item" href="${item.href}"><span class="ap-related-kind">${icon(item.kindIcon)}${t(item.kind)}${item.sub ? ` · ${t(item.sub)}` : ''}</span><span class="ap-search-title">${M.highlight(item.title, tokens)}</span></a></li>`).join('')
      : `<li class="ap-search-hint">${t(`Aucun savoir ne correspond à « ${query} ».`)} <a href="forum.html?nouveau=question">Poser la question au forum</a></li>`;
    status.textContent = list.length ? `${plural(list.length, 'résultat', 'résultats')}.` : 'Aucun résultat.';
  }
  function openSearch() {
    const panel = $('[data-ap-search]');
    panel.hidden = false;
    $$('[data-ap-search-open]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    renderSearch();
    $('[data-ap-search-input]').focus();
  }
  function closeSearch(restore = true) {
    const panel = $('[data-ap-search]');
    if (panel.hidden) return;
    panel.hidden = true;
    $$('[data-ap-search-open]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (restore) $('.ap-search-btn').focus();
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                         */
  /* ------------------------------------------------------------------ */

  const openTools = M.initToolsDialog(() => { const y = window.scrollY; show({ focus: false }); window.scrollTo({ top: y }); });

  async function copyPrompt(id, button) {
    const s = byId[id];
    try {
      await navigator.clipboard.writeText(s.prompt.after);
      toast('Prompt copié.');
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), 1600);
    } catch {
      toast('Copie indisponible : sélectionnez le texte pour le copier.', 'alert');
    }
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (target.closest('[data-ap-search-open]')) { event.preventDefault(); const panel = $('[data-ap-search]'); if (panel.hidden) openSearch(); else closeSearch(); return; }
    if (target.closest('[data-ap-search-close]')) { closeSearch(); return; }
    const tryWord = target.closest('[data-ap-search-try]');
    if (tryWord) { const input = $('[data-ap-search-input]'); input.value = tryWord.dataset.apSearchTry; renderSearch(); input.focus(); return; }
    if (target.closest('[data-open-tools]')) { openTools(); return; }

    const stop = target.closest('[data-ap-stop]');
    if (stop) { selectStop(Number(stop.dataset.apStop)); return; }
    if (target.closest('[data-ap-stop-next]')) { selectStop(state.stop + 1, { focus: true }); return; }

    const copy = target.closest('[data-ap-copy]');
    if (copy) { copyPrompt(copy.dataset.apCopy, copy); return; }

    const retry = target.closest('[data-ap-retry]');
    if (retry) { resetQuiz(retry.closest('[data-ap-test]'), retry.dataset.apRetry); syncAcquireButton(); return; }

    const acquire = target.closest('[data-ap-acquire]');
    if (acquire) {
      const s = byId[acquire.dataset.apAcquire];
      const on = !isAcquired(s.id);
      setAcquired(s.id, on);
      syncAcquireButton();
      $('[data-ap-acquire]').focus();
      toast(on ? `${s.kindLabel} marquée comme acquise.` : `${s.kindLabel} retirée de vos acquis.`, on ? 'check' : 'replay');
      return;
    }

    const family = target.closest('[data-ap-family]');
    if (family) { state.family = family.dataset.apFamily; const y = window.scrollY; show({ focus: false }); window.scrollTo({ top: y }); $(`[data-ap-family="${state.family}"]`)?.focus(); return; }
    const level = target.closest('[data-ap-level]');
    if (level) { state.level = Number(level.dataset.apLevel); const y = window.scrollY; show({ focus: false }); window.scrollTo({ top: y }); $(`[data-ap-level="${state.level}"]`)?.focus(); return; }
    if (target.closest('[data-ap-notion-clear]')) { state.notionQuery = ''; const input = $('[data-ap-notion-filter]'); input.value = ''; $('[data-ap-notion-groups]').innerHTML = notionGroupsHTML(); input.focus(); return; }

    if (target.closest('[data-ap-reset]')) {
      const zone = $('[data-ap-reset-zone]');
      zone.innerHTML = `<p class="ap-reset-confirm" role="group" aria-label="Confirmer l’effacement"><span>${enCompte() ? 'Effacer vos acquis et vos réponses aux questions de vérification ? Vos réponses aux cas Bon réflexe restent enregistrées.' : 'Effacer vos acquis et vos réponses dans ce navigateur ?'}</span><button class="btn btn-secondary btn-sm" type="button" data-ap-reset-yes>Effacer</button><button class="link-btn" type="button" data-ap-reset-no>Annuler</button></p>`;
      $('[data-ap-reset-no]').focus();
      return;
    }
    if (target.closest('[data-ap-reset-no]')) { $('[data-ap-reset-zone]').innerHTML = '<button class="link-btn ap-reset-btn" type="button" data-ap-reset>Effacer ma progression</button>'; $('[data-ap-reset]').focus(); return; }
    if (target.closest('[data-ap-reset-yes]')) {
      progress = { acquis: {}, cas: enCompte() ? progress.cas : {}, checks: {} };
      saveProgress();
      show({ focus: true });
      toast('Votre progression a été effacée.', 'replay');
      return;
    }

    // Liens internes : changement de vue sans recharger la page.
    const link = target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    if (url.search === location.search && url.hash) return;
    event.preventDefault();
    navigate(url.href);
  });

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-ap-quiz]');
    if (!form) return;
    event.preventDefault();
    answer(form);
  });
  document.addEventListener('change', event => {
    const form = event.target.closest('[data-ap-quiz]');
    if (form) $('[data-ap-error]', form).hidden = true;
  });
  document.addEventListener('input', event => {
    if (event.target.matches('[data-ap-search-input]')) renderSearch();
    if (event.target.matches('[data-ap-notion-filter]')) { state.notionQuery = event.target.value; $('[data-ap-notion-groups]').innerHTML = notionGroupsHTML(); }
  });

  document.addEventListener('keydown', event => {
    const { key } = event;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Recherche : Échap ferme, flèches parcourent les résultats.
    if (event.target.closest?.('[data-ap-search]')) {
      if (key === 'Escape') { event.preventDefault(); closeSearch(); return; }
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const items = $$('.ap-search-item');
        if (!items.length) return;
        event.preventDefault();
        const at = items.indexOf(document.activeElement);
        const next = key === 'ArrowDown' ? Math.min(items.length - 1, at + 1) : at - 1;
        if (next < 0) $('[data-ap-search-input]').focus(); else items[next].focus();
      }
      return;
    }

    // Frise des bases : onglets parcourus aux flèches.
    const stop = event.target.closest?.('[data-ap-stop]');
    if (stop) {
      const i = Number(stop.dataset.apStop);
      const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: bases.length - 1 };
      if (key in moves) { event.preventDefault(); selectStop(moves[key], { focus: true }); }
      return;
    }

    // Questions et cas : A, B, C pour choisir, Entrée pour valider.
    const quiz = event.target.closest?.('[data-ap-quiz]') || (state.view === 'cas' && !event.target.closest?.('input, textarea, select, [contenteditable="true"], dialog, .tweaks') ? $('[data-ap-view] [data-ap-quiz]') : null);
    if (quiz && !quiz.classList.contains('is-locked')) {
      const letter = LETTERS.indexOf(key.toUpperCase());
      const inputs = $$('input[type="radio"]', quiz);
      if (letter >= 0 && letter < inputs.length && key.length === 1) {
        event.preventDefault();
        inputs[letter].checked = true;
        inputs[letter].focus();
        $('[data-ap-error]', quiz).hidden = true;
        return;
      }
      if (key === 'Enter' && event.target.matches?.('input[type="radio"]')) { event.preventDefault(); answer(quiz); return; }
    }

    if (document.querySelector('dialog[open]') || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (key === '/') { event.preventDefault(); openSearch(); }
  });

  window.addEventListener('popstate', () => { readURL(); show({ focus: true, hash: location.hash }); });

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */

  V.initHeader();
  V.initTweaks({
    key: 'vysora-apprendre-reglages',
    apparence: [
      { name: 'bases', legend: 'Bases sur la vue d’ensemble', options: [['frise', 'Frise'], ['liste', 'Liste']] },
      { name: 'resumes', legend: 'Résumés dans les listes', options: [['oui', 'Visibles'], ['non', 'Titres seuls']] },
      { name: 'bande', legend: 'Section « D’où viennent ces savoirs »', options: [['sombre', 'Sombre', '#0A0A0A'], ['bleue', 'Bleue', '#1D4ED8'], ['claire', 'Claire', '#F5F5F5']] },
      { name: 'avantapres', legend: 'Prompts avant et après', options: [['cote', 'Côte à côte'], ['pile', 'L’un sous l’autre']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { bases: 'frise', resumes: 'oui', bande: 'sombre', avantapres: 'cote' },
    onChange: changed => { if (changed === 'motion') observeReveal($('[data-ap-view]')); }
  });
  V.etats.on(() => show({ focus: false }));
  V.fixTypography(document.querySelector('.site-footer'));
  readURL();
  show({ focus: false, hash: location.hash });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 900))]).then(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
})();
