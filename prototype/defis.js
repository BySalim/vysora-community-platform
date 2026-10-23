'use strict';
(() => {
  const V = window.Vysora, D = window.VYSORA_DEFIS;
  const { $, $$, t, icon } = V;
  const root = document.documentElement;
  const dialog = $('.df-dialog');
  const state = { tool: 'Tous', q: '', sort: 'useful', detail: null, origin: null };
  let settings = {}, observer, sectionObserver;
  const storedVotes = V.store.get('vysora-defis-votes', []);
  const votes = new Set(Array.isArray(storedVotes) ? storedVotes.filter(id => D.entries.some(e => e.id === id)) : []);
  const closed = () => settings.statut === 'cloture';
  const unavailable = () => ['brouillon', 'annule', 'introuvable'].includes(settings.statut);
  const mine = () => V.etats.membre() && settings.participation === 'publiee';
  const count = () => settings.donnees === 'vide' ? 0 : D.current.count;
  const voted = e => V.etats.membre() && votes.has(e.id);
  const useful = e => e.n + (voted(e) ? 1 : 0);
  const tool = e => `<span class="df-tool">${V.logo(e.tool)}${t(e.tool)}${e.model ? ` · ${t(e.model)}` : ''}</span>`;
  const picture = e => e.image
    ? e.place ? `<div class="df-photo-poster"><img src="assets/images/${e.image}-720.webp" alt="${t(e.title)}" width="540" height="720" loading="lazy"><div><b>${t(e.place)}</b><span>${t(e.line)}</span></div></div>` : `<img src="assets/images/${e.image}-720.webp" alt="${t(e.title)}" width="540" height="720" loading="lazy">`
    : `<div class="df-poster" role="img" aria-label="${t(e.title)}"><span>${t(e.line)}</span><b>${t(e.place)}</b><i aria-hidden="true">↗</i></div>`;
  const voteButton = e => `<button class="df-vote" type="button" data-vote="${e.id}" aria-pressed="${voted(e)}" aria-label="${voted(e) ? 'Retirer mon vote Utile pour' : 'Voter Utile pour'} ${t(e.title)}"${closed() || unavailable() ? ' disabled' : ''}>${icon('utile')}<span>${useful(e)} Utile</span></button>`;
  const notice = (title, body) => `<div class="df-empty"><h3>${t(title)}</h3><p>${t(body)}</p></div>`;

  function renderCurrent() {
    const d = D.current;
    const isPrivate = settings.statut === 'brouillon' && !V.etats.peut('administrer');
    $$('[data-participer]').forEach(b => {
      b.disabled = closed() || unavailable();
      b.innerHTML = `${closed() ? 'Défi clôturé' : mine() ? 'Ma participation' : 'Participer au défi'}${icon('arrow')}`;
    });
    $('[data-total]').textContent = unavailable() ? '' : count();
    $('[data-current]').innerHTML = settings.statut === 'introuvable' || isPrivate
      ? notice('Ce défi est introuvable', 'Retrouvez les défis terminés et leurs méthodes plus bas.')
      : `${settings.statut === 'brouillon' ? '<p class="df-notice">Brouillon · Ce défi est visible uniquement par l’administration.</p>' : settings.statut === 'annule' ? '<p class="df-notice">Ce défi a été annulé. Les participations sont fermées.</p>' : ''}<div class="df-brief"><div class="df-challenge"><div class="df-challenge-top"><p class="kicker">${icon('trophy')}Défi de la semaine</p><span class="df-status">${closed() ? 'Clôturé' : unavailable() ? 'Participations fermées' : 'Ouvert aux participations'}</span></div><h2>Une affiche touristique<span>en trois échanges.</span></h2><p>Faites découvrir un lieu que vous aimez. Créez votre affiche avec l’IA et partagez le chemin parcouru.</p><div class="df-cta">${closed() ? '<a class="btn btn-primary" href="#participations">Voir les participations</a>' : unavailable() ? '' : `<button class="btn btn-primary" type="button" data-participer>${mine() ? 'Voir ma participation' : 'Participer au défi'}${icon('arrow')}</button><a class="df-hero-link" href="#participations">Voir les créations${icon('arrow-down')}</a>`}</div><div class="df-challenge-foot"><span>${icon('calendar')}12 — 19 octobre 2026</span><span>${icon('users')}${count()} participations</span></div></div><aside class="df-rules"><div class="df-rules-heading"><span>Le brief</span>${icon('type-iteration')}</div><h3>Les contraintes</h3><ul>${d.rules.map((rule, i) => `<li>${icon(['type-iteration', 'check-circle', 'globe'][i])}<div><b>${t(rule)}</b></div></li>`).join('')}</ul><p>Une création par personne.<br>Tous les outils sont acceptés.</p><div class="df-deadline">${icon('clock')}<div><strong>${closed() ? 'Défi terminé' : 'Clôture le 19 octobre'}</strong><span>${closed() ? 'Le classement est définitif.' : 'À 23 h 59, heure UTC'}</span></div></div></aside></div>`;
    $('.df-how').hidden = unavailable();
    if (mine()) $('[data-current]').insertAdjacentHTML('afterbegin', '<div class="df-notice">Vous avez déjà participé. Vous pouvez encore explorer les méthodes et voter pour les autres créations.</div>');
  }

  function renderFilters() {
    $('[data-filters]').innerHTML = ['Tous', ...new Set(D.entries.map(e => e.tool))].map(name => `<button type="button" data-tool="${t(name)}" aria-pressed="${state.tool === name}">${name === 'Tous' ? '' : V.logo(name)}${t(name)}</button>`).join('');
  }

  function renderEntries(animate = false) {
    const previous = new Map($$('.df-card').map(el => [el.dataset.entry, el.getBoundingClientRect()]));
    let list = unavailable() || settings.donnees === 'vide' || settings.donnees === 'aucun' ? [] : D.entries.filter(e => (state.tool === 'Tous' || e.tool === state.tool) && V.normalize(`${e.title} ${e.m} ${e.tool}`).includes(V.normalize(state.q)));
    list = list.slice().sort(state.sort === 'recent' ? (a, b) => b.date.localeCompare(a.date) : state.sort === 'exchanges' ? (a, b) => a.exchanges - b.exchanges || a.date.localeCompare(b.date) : (a, b) => useful(b) - useful(a) || a.date.localeCompare(b.date));
    $('[data-selection]').textContent = unavailable() ? 'Les participations ne sont pas disponibles.' : `${list.length} créations affichées sur ${count()} participations`;
    if (settings.donnees === 'vide') $('[data-selection]').textContent = 'Les premières créations restent à imaginer.';
    $('[data-entries]').innerHTML = list.length ? list.map(e => `<article class="df-card" data-entry="${e.id}"><button class="df-preview" type="button" data-detail="${e.id}" aria-label="Voir le parcours : ${t(e.title)}">${picture(e)}</button><div class="df-card-copy"><h3><button class="df-title-button" type="button" data-detail="${e.id}">${t(e.title)}</button></h3><div class="df-card-kind">${V.typeTag(e.type)}<span>· Image</span></div><div class="df-person">${V.avatar(e.m)}${t(e.m)}</div>${tool(e)}<div class="df-card-bottom">${voteButton(e)}<span>${e.exchanges} échanges</span></div></div></article>`).join('')
      : unavailable() ? notice('Participations indisponibles', 'Consultez les méthodes des défis terminés.')
      : settings.donnees === 'vide' ? `${notice('La première participation sera peut-être la vôtre', 'Créez votre affiche et partagez votre méthode.')}<button class="btn btn-primary" type="button" data-participer${closed() ? ' disabled' : ''}>Participer au défi</button>`
      : `<div class="df-empty"><h3>Aucune participation trouvée</h3><p>Essayez un autre lieu ou élargissez votre recherche.</p><button class="btn btn-secondary" type="button" data-clear>Réinitialiser les filtres</button></div>`;
    $('[data-results-status]').textContent = `${list.length} parcours affichés.`;
    $('.df-list-foot').hidden = unavailable() || settings.donnees === 'vide';
    $('.df-list-foot p').textContent = closed() ? 'Le classement de ce défi est figé.' : 'Le classement évolue jusqu’à la clôture du défi.';
    if (animate && V.motion.full()) $$('.df-card').forEach((el, i) => {
      const old = previous.get(el.dataset.entry), now = el.getBoundingClientRect();
      el.animate(old ? [{ transform: `translate(${old.x - now.x}px, ${old.y - now.y}px)` }, { transform: 'none' }] : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: old ? 0 : i * 35, easing: 'cubic-bezier(0.2,0,0,1)' });
    });
  }

  function renderArchives() {
    $('[data-archives]').innerHTML = D.archives.map(d => `<article class="df-archive"><div class="df-archive-visual" aria-hidden="true"><span>${t(new Date(d.start + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }))}</span><b>${t(d.start.slice(-2))}</b></div><div><h3>${t(d.title)}</h3><p>Du ${V.dateLabel(d.start, false)} au ${V.dateLabel(d.end)} · ${d.count} participations</p><div class="df-person">${icon('trophy')}${V.avatar(d.entries[0].m, 24)}<span>1re place · ${t(d.entries[0].m)}</span></div><button class="df-text-btn" type="button" data-archive="${d.id}">Voir les résultats${icon('arrow')}</button></div></article>`).join('');
  }

  function openDialog(html, origin, kind = 'confirmation') {
    state.origin = origin || document.activeElement;
    dialog.dataset.kind = kind;
    $('[data-dialog-context]').innerHTML = `${icon(kind === 'archive' ? 'trophy' : 'type-iteration')}<span>${kind === 'archive' ? 'Défi terminé' : kind === 'creation' ? 'Participation au défi' : 'Votre participation'}</span>`;
    $('[data-dialog-body]').innerHTML = html;
    V.fixTypography($('[data-dialog-body]'));
    if (!dialog.open) { dialog.showModal(); document.body.style.overflow = 'hidden'; }
    dialog.scrollTop = 0;
    $('[data-close]').focus();
  }
  function openDetail(id, origin) {
    if (unavailable() || settings.donnees === 'vide') return;
    const e = D.entries.find(item => item.id === id);
    if (!e) return;
    state.detail = id;
    openDialog(`<div class="df-detail">
      <aside class="df-art-column"><figure class="df-art"><div class="df-art-stage">${picture(e)}</div><figcaption>${icon('image')}<span>Le résultat final</span></figcaption></figure><div class="df-art-caption"><span>${V.typeTag(e.type)}</span><span>${e.exchanges} échanges</span></div><p class="df-art-note">${t(e.note)}</p></aside>
      <div class="df-detail-copy"><header class="df-detail-heading"><p class="df-modal-eyebrow">${closed() ? 'Défi clôturé' : 'Défi en cours'} · Affiche touristique</p><h2 id="df-dialog-title">${t(e.title)}</h2><div class="df-author-line">${V.avatar(e.m, 36)}<div><strong>${t(e.m)}</strong><span>Publié le ${V.dateLabel(e.date)}</span></div></div>${tool(e)}</header>
      <section class="df-prompt-section" aria-labelledby="df-prompt-title"><div class="df-modal-section-head"><h3 id="df-prompt-title">Le prompt de départ</h3><button class="df-copy-button" type="button" data-copy="${e.id}" aria-label="Copier le prompt">${icon('copy')}<span>Copier</span></button></div><blockquote>${t(e.prompt)}</blockquote><p class="df-copy-status sr-only" role="status" data-copy-status></p></section>
      <section class="df-method" aria-labelledby="df-method-title"><h3 id="df-method-title">Le chemin parcouru</h3><ol>${e.steps.map((s, i) => `<li><span class="df-step-index" aria-hidden="true">${i + 1}</span><p>${t(s)}</p></li>`).join('')}</ol></section>
      <footer class="df-detail-actions"><div><strong>Cette méthode vous est utile ?</strong><p>${closed() ? 'Les votes sont clos pour ce défi.' : 'Votre vote compte dans le classement du défi.'}</p></div>${voteButton(e)}</footer></div></div>`, origin, 'creation');
  }
  function openArchive(id, origin) {
    const d = D.archives.find(item => item.id === id);
    if (!d) return;
    state.detail = null;
    openDialog(`<header class="df-archive-heading"><p class="df-modal-eyebrow">Du ${V.dateLabel(d.start, false)} au ${V.dateLabel(d.end)}</p><h2 id="df-dialog-title">${t(d.title)}</h2><div class="df-archive-summary"><span>${icon('users')}<strong>${d.count}</strong> participations</span><span>${icon('lock')}Classement définitif</span></div></header>
      <div class="df-palmares-layout"><section class="df-palmares" aria-labelledby="df-palmares-title"><div class="df-modal-section-head"><h3 id="df-palmares-title">Le palmarès</h3><span>Les ${d.entries.length} premières places</span></div><div class="df-result-labels" aria-hidden="true"><span>Rang / Création</span><span>Votes utiles</span></div><ol class="df-results">${d.entries.map((e, i) => `<li><span class="df-rank" aria-label="${i + 1}${i === 0 ? 're' : 'e'} place">${String(i + 1).padStart(2, '0')}</span><div class="df-result-copy"><h4>${t(e.title)}</h4><div class="df-result-author">${V.avatar(e.m, 24)}<span>${t(e.m)}</span></div>${tool(e)}</div><span class="df-result-score"><b>${e.n}</b><span>Utile</span></span></li>`).join('')}</ol></section>
      <aside class="df-archive-brief"><p class="kicker">${icon('type-iteration')}Le brief</p><h3>${t(d.theme)}</h3><ul>${d.rules.map(r => `<li>${icon('check')}${t(r)}</li>`).join('')}</ul><div class="df-ranking-note">${icon('trophy')}<p>Les votes reçus pendant le défi déterminent les places. En cas d’égalité, la première création publiée passe devant.</p></div></aside></div><footer class="df-archive-foot"><span>${icon('lock')}Les résultats sont figés depuis la clôture.</span><button class="df-text-btn" type="button" data-close>Revenir aux défis${icon('arrow')}</button></footer>`, origin, 'archive');
  }
  function participate() {
    if (closed() || unavailable()) { V.toast('Les participations sont fermées pour ce défi.'); return; }
    if (!V.exiger('contribuer', 'participer au défi')) return;
    if (mine()) { openDialog(`<p class="kicker">${icon('check-circle')}Participation publiée</p><h2 id="df-dialog-title">Votre création est inscrite</h2><p>Vous participez au défi « ${t(D.current.title)} ».</p><p>Une seule création est admise par personne. Les résultats seront disponibles à la clôture.</p><button class="btn btn-primary" type="button" data-close>Revenir au défi</button>`); return; }
    if (settings.quota === 'atteint' && Number.isFinite(V.etats.limite('creations'))) { V.toast(`Votre limite de ${V.etats.limite('creations')} créations par 24 h est atteinte. Réessayez demain.`); return; }
    location.href = `nouvelle-creation.html?defi=${D.id}`;
  }
  function observe() {
    observer?.disconnect();
    const items = $$('.df-reveal');
    if (!V.motion.full() || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); } }), { threshold: .06 });
    items.forEach(el => observer.observe(el));
  }
  function refresh() {
    renderCurrent(); renderFilters(); renderEntries(); renderArchives(); observe();
    if (dialog.open) dialog.close();
  }

  document.addEventListener('click', async event => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-participer')) return participate();
    if (b.hasAttribute('data-tool')) { state.tool = b.dataset.tool; renderFilters(); renderEntries(true); $(`[data-tool="${CSS.escape(state.tool)}"]`).focus({ preventScroll: true }); }
    if (b.hasAttribute('data-clear')) { state.q = ''; state.tool = 'Tous'; $('#df-search').value = ''; if (settings.donnees === 'aucun') V.regler('donnees', 'remplies'); renderFilters(); renderEntries(true); $('#df-search').focus({ preventScroll: true }); }
    if (b.dataset.detail) openDetail(b.dataset.detail, b);
    if (b.dataset.archive) openArchive(b.dataset.archive, b);
    if (b.hasAttribute('data-close')) dialog.close();
    if (b.dataset.vote) {
      if (closed() || unavailable() || !V.exiger('contribuer', 'voter « Utile »')) return;
      const id = b.dataset.vote;
      votes.has(id) ? votes.delete(id) : votes.add(id);
      V.store.set('vysora-defis-votes', [...votes]);
      renderEntries(true);
      if (dialog.open && state.detail) { const e = D.entries.find(e => e.id === id); if (e) b.outerHTML = voteButton(e); dialog.querySelector('[data-vote]')?.focus({ preventScroll: true }); }
      else $(`[data-entry="${id}"] [data-vote]`)?.focus({ preventScroll: true });
      V.toast(votes.has(id) ? 'Votre vote Utile a été ajouté.' : 'Votre vote a été retiré.');
    }
    if (b.dataset.copy) {
      const e = D.entries.find(e => e.id === b.dataset.copy);
      try {
        await navigator.clipboard.writeText(e.prompt);
        if (b.isConnected) b.innerHTML = `${icon('check')}<span>Copié</span>`;
        const status = $('[data-copy-status]');
        if (status) { status.classList.add('sr-only'); status.textContent = 'Prompt copié dans le presse-papiers.'; }
        V.toast('Prompt copié.');
      } catch {
        const status = $('[data-copy-status]');
        if (status) { status.classList.remove('sr-only'); status.textContent = 'La copie automatique est indisponible. Sélectionnez le prompt pour le copier.'; }
        else V.toast('Sélectionnez le prompt pour le copier.');
      }
    }
  });
  $('#df-search').addEventListener('input', e => { state.q = e.target.value; renderEntries(); });
  $('#df-sort').addEventListener('change', e => { state.sort = e.target.value; renderEntries(true); });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const box = dialog.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; const fallback = state.detail ? $(`[data-detail="${state.detail}"]`) : null; (state.origin?.isConnected ? state.origin : fallback)?.focus({ preventScroll: true }); state.detail = null; $('[data-dialog-body]').replaceChildren(); });
  V.initHeader();
  V.initTweaks({ key: 'vysora-defis-reglages-v2',
    etats: [
      { name: 'statut', legend: 'Statut du défi', options: [['publie', 'En cours'], ['cloture', 'Clôturé'], ['annule', 'Annulé'], ['brouillon', 'Brouillon'], ['introuvable', 'Introuvable']] },
      { name: 'participation', legend: 'Votre participation', options: [['aucune', 'Pas encore'], ['publiee', 'Déjà publiée']], si: e => e.session === 'membre' },
      { name: 'donnees', legend: 'Participations', options: [['remplies', 'Disponibles'], ['vide', 'Aucune création'], ['aucun', 'Aucun résultat']] },
      { name: 'quota', legend: 'Limite de publication', options: [['disponible', 'Disponible'], ['atteint', 'Atteinte']], si: e => e.session === 'membre' }
    ],
    apparence: [ { name: 'brief', legend: 'Ambiance du défi', options: [['encre', 'Encre'], ['bleu', 'Bleu'], ['neutre', 'Clair']] }, { name: 'disposition', legend: 'Participations', options: [['grille', 'Grille'], ['liste', 'Liste']] }, 'accent', 'density', 'radius', 'effects', 'motion' ],
    defaults: { statut: 'publie', participation: 'aucune', donnees: 'remplies', quota: 'disponible', brief: 'encre', disposition: 'grille' },
    onChange: (changed, next) => { settings = next; if (changed !== 'init') refresh(); }
  });
  V.etats.on(refresh);
  refresh();
  root.classList.add('df-ready');
  if ('IntersectionObserver' in window) {
    sectionObserver = new IntersectionObserver(entries => {
      const active = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (active) $$('.df-anchors a').forEach(a => { if (a.hash === '#' + active.target.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    $$('#defi, #participations, #termines').forEach(el => sectionObserver.observe(el));
  }
  V.fixTypography($('main'));
  document.body.classList.add('is-ready');
})();

