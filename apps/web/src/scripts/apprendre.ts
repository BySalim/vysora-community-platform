/* Apprendre (APP-02), porté de prototype/apprendre.js : vue d'ensemble, rubriques (bases, notions,
   règles, astuces, Bon réflexe), page d'un savoir, page d'un cas, progression, recherche locale.
   Les savoirs sont les contenus éditoriaux de lib/apprendre/contenus.ts ; les cas Bon réflexe et
   leurs réponses passent par l'API (APP-01). La progression d'un membre (savoirs acquis, réponses
   aux questions de vérification et aux cas) est enregistrée dans son compte (APP-03) ; celle d'un
   visiteur reste dans le navigateur, comme dans le prototype, et rejoint son compte à sa première
   visite connectée. */

import type { CasApi, ProgressionSavoirsApi, ReponseCasApi } from '@vysora/shared';
import { APPRENDRE as A } from '../lib/apprendre/contenus';
import {
  creerModele,
  creerPages,
  lireVue,
  LETTRES,
  type Progression,
} from '../lib/apprendre/pages';
import type { DonneesPageApprendre, IdRubrique } from '../lib/apprendre/types';
import { creerVues, filtresDeDepart } from '../lib/apprendre/vues';
import { decouper, contient, plier, surligner } from '../lib/explorer/recherche';
import { ROUTES } from '../lib/navigation';
import { invitation } from './commun/acces';
import { api } from './commun/api';
import { etats } from './commun/etats';
import { lireMesOutils, monterMesOutils, type OutilChoisissable } from './commun/mes-outils';
import {
  $,
  $$,
  animations,
  corrigerTypographie,
  esc,
  icon,
  pluriel,
  t,
  toast,
} from './commun/outils';

const source = document.getElementById('ap-donnees')?.textContent;
const D = source ? (JSON.parse(source) as DonneesPageApprendre) : null;
const vue = $('[data-ap-view]');

if (D && vue) {
  const today = D.aujourdhui;

  /* Modèle : lib/apprendre/pages.ts, partagé avec le rendu du serveur ------------------ */

  const m = creerModele(D);
  const { RUB, byId, bases, regles, actifs, cases, caseById } = m;
  const { toolLabel, kindOf, shortDate } = m;

  /* Progression : dans le compte du membre (savoirs, APP-03 ; cas, RG-72), sinon dans ce
     navigateur ---------------------------------------------------------------------- */

  const CLE = 'vysora-apprendre-progres';
  const lirePlat = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const locale: Progression = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(CLE) ?? '{}') as Partial<Progression>;
      return {
        acquis: lirePlat(p.acquis),
        cas: lirePlat(p.cas),
        checks: lirePlat(p.checks),
      } as Progression;
    } catch {
      return { acquis: {}, cas: {}, checks: {} };
    }
  })();
  const enCompte = () => etats.peut('contribuer') && D.progression !== null;
  /** Progression du compte, au format du prototype. */
  const duCompte = (p: ProgressionSavoirsApi): Pick<Progression, 'acquis' | 'checks'> => ({
    acquis: { ...p.acquis },
    checks: Object.fromEntries(
      Object.entries(p.verifications).map(([id, v]) => [
        id,
        { choice: v.choix, right: v.correcte, date: v.date },
      ]),
    ),
  });
  let progress: Progression =
    enCompte() && D.progression ? { ...duCompte(D.progression), cas: {} } : locale;
  // Les réponses du membre viennent de son compte (« Réussi », « À revoir »).
  if (enCompte())
    for (const c of cases)
      if (c.api.maReponse)
        progress.cas[c.id] = { choice: -1, right: c.api.maReponse.correcte, date: today };
  // Cas ouvert posé par le serveur : la réponse déjà donnée verrouille la question, comme après son
  // chargement par l'API.
  const reponseDonnee = D.casComplet?.moi?.reponse;
  if (D.casComplet && reponseDonnee)
    progress.cas[String(D.casComplet.id)] = {
      choice: D.casComplet.options.findIndex((o) => o.id === reponseDonnee.optionId),
      right: reponseDonnee.correcte,
      date: reponseDonnee.date.slice(0, 10),
    };
  const pages = creerPages(m, { progress: () => progress, today });
  const { isAcquired, revisedSince, quizHTML } = pages;
  const { casePlayerHTML, acquireHTML } = pages;
  const saveProgress = () => {
    // Un membre retrouve sa progression dans son compte : rien n'est gardé dans le navigateur.
    if (enCompte()) return;
    try {
      localStorage.setItem(CLE, JSON.stringify(progress));
    } catch {
      // Stockage indisponible : la progression dure le temps de la page.
    }
  };
  const ECHEC_PROGRESSION = 'Votre progression n’a pas été enregistrée. Réessayez dans un instant.';
  /** État d'un savoir enregistré dans le compte du membre (APP-03). */
  async function envoyerSavoir(id: string) {
    if (!enCompte()) return;
    const check = progress.checks[id];
    const reponse = await api<ProgressionSavoirsApi>(
      'PUT',
      `/api/v1/moi/savoirs/${encodeURIComponent(id)}`,
      {
        acquis: Boolean(progress.acquis[id]),
        verification: check ? { choix: check.choice, correcte: check.right } : null,
      },
    );
    if (!reponse.ok) toast(ECHEC_PROGRESSION, 'alert');
  }
  // Première visite connectée : la progression gardée dans ce navigateur rejoint le compte.
  const aVerser = Object.keys(locale.acquis).length + Object.keys(locale.checks).length > 0;
  async function verserAuCompte() {
    const reponse = await api<ProgressionSavoirsApi>('POST', '/api/v1/moi/savoirs', {
      acquis: locale.acquis,
      verifications: Object.fromEntries(
        Object.entries(locale.checks).map(([id, c]) => [
          id,
          { choix: c.choice, correcte: c.right, date: c.date },
        ]),
      ),
    });
    if (!reponse.ok) return;
    try {
      localStorage.removeItem(CLE);
    } catch {
      // Stockage indisponible : rien à retirer.
    }
    Object.assign(progress, duCompte(reponse.donnees));
    renderProgressLink();
    show({ focus: false });
  }
  const lieu = () =>
    enCompte()
      ? 'Votre progression est enregistrée dans votre compte, sur tous vos appareils.'
      : `Votre progression est enregistrée dans ce navigateur. ${invitation('contribuer', 'la retrouver sur tous vos appareils')}`;
  function setAcquired(id: string, on: boolean) {
    if (on) progress.acquis[id] = progress.acquis[id] || today;
    else delete progress.acquis[id];
    saveProgress();
    void envoyerSavoir(id);
    renderProgressLink();
  }
  /* État et adresse ------------------------------------------------------------- */

  const filtres = filtresDeDepart();
  const vues = creerVues(m, pages, filtres, {
    progress: () => progress,
    today,
    mesOutils: () => lireMesOutils(D.outils.map((o) => o.slug)),
    peutProposer: () => etats.peut('proposer-cas'),
  });
  const { kicker, segHTML, ringHTML, rubCount, overall, nextBase } = vues;
  const { frisePanelHTML, notionGroupsHTML } = vues;
  const renderAccueil = vues.accueilHTML;

  const state: {
    view: 'accueil' | 'rubrique' | 'savoir' | 'cas' | 'progression';
    rubrique: IdRubrique | null;
    id: string | null;
  } = {
    view: 'accueil',
    rubrique: null,
    id: null,
  };

  function readURL() {
    const lue = lireVue(m, new URLSearchParams(location.search));
    state.view = lue.view;
    state.id = lue.id;
    state.rubrique = lue.rubrique;
  }

  /* Questions et cas ------------------------------------------------------------ */

  async function chargerCas(zone: ParentNode = document) {
    for (const holder of $$<HTMLElement>('[data-ap-case-load]', zone)) {
      const c = caseById[holder.dataset.apCaseLoad ?? ''];
      if (!c) continue;
      if (!c.detail) {
        const resultat = await api<CasApi>('GET', `/api/v1/cas/${c.id}`);
        if (!resultat.ok) {
          holder.insertAdjacentHTML(
            'beforeend',
            `<p class="ap-empty">${t('Ce cas n’a pas pu être chargé. Rechargez la page dans un instant.')}</p>`,
          );
          continue;
        }
        c.detail = resultat.donnees;
        if (resultat.donnees.correction) c.correction = resultat.donnees.correction;
        const reponse = resultat.donnees.moi?.reponse;
        if (reponse) {
          const choice = resultat.donnees.options.findIndex((o) => o.id === reponse.optionId);
          progress.cas[c.id] = { choice, right: reponse.correcte, date: reponse.date.slice(0, 10) };
        }
      }
      const compact = holder.hasAttribute('data-compact');
      holder.outerHTML = casePlayerHTML(c, { compact });
      const fresh = $(`[data-ap-test="cas:${CSS.escape(c.id)}"]`);
      if (fresh) {
        corrigerTypographie(fresh);
        restoreQuizzes(fresh.parentElement ?? document);
      }
    }
  }

  function feedbackHTML(key: string, choice: number) {
    const [type, id = ''] = key.split(':');
    if (type === 'check') {
      const s = byId[id]!;
      const check = s.check!;
      const right = choice === check.correct;
      return `<p class="ap-feedback-title${right ? '' : ' is-wrong'}">${icon(right ? 'check-circle' : 'bulb')}${right ? 'Bonne réponse.' : 'Pas tout à fait.'}</p>
        ${right ? '' : `<p class="ap-feedback-answer"><span>Bonne réponse, ${LETTRES[check.correct]} :</span> ${t(check.choices[check.correct])}</p>`}
        <p>${t(check.why)}</p>
        ${right ? `<p class="ap-feedback-note">${icon('check')}${t(`${s.kindLabel} marquée comme acquise.`)}</p>` : ''}
        <button class="link-btn" type="button" data-ap-retry="${esc(key)}">${icon('replay')}Recommencer</button>`;
    }
    const c = caseById[id]!;
    const correction = c.correction!;
    const options = c.detail!.options;
    const correct = options.findIndex((o) => o.id === correction.optionCorrecteId);
    const right = choice === correct;
    const rule = c.regle ? byId[c.regle] : undefined;
    const libelleCorrect = options[correct]?.libelle ?? '';
    return `<p class="ap-feedback-title${right ? '' : ' is-wrong'}">${icon(right ? 'check-circle' : 'bulb')}${right ? 'Vous avez le bon réflexe.' : `Le bon réflexe : ${t(libelleCorrect.replace(/^./, (ch) => ch.toLowerCase()))}${/[.!?]$/.test(libelleCorrect) ? '' : '.'}`}</p>
      <p>${t(correction.explication)}</p>
      <h3 class="ap-feedback-sub">Chaque option, et ce qu’a répondu la communauté</h3>
      <ul class="ap-poll">${options
        .map((o, i) => {
          const corr = correction.options.find((x) => x.id === o.id);
          return `<li class="${i === correct ? 'is-correct' : ''}${i === choice ? ' is-yours' : ''}">
        <p class="ap-poll-head"><kbd aria-hidden="true">${LETTRES[i]}</kbd><span class="ap-poll-label">${t(o.libelle)}</span><b>${corr?.part ?? 0} %</b></p>
        <span class="ap-poll-bar" aria-hidden="true"><i style="--w:${corr?.part ?? 0}%"></i></span>
        <p class="ap-poll-why">${i === correct ? `<span class="ap-poll-tag">${icon('check')}Bonne réponse</span>` : ''}${i === choice ? `<span class="ap-poll-tag is-yours">Votre choix</span>` : ''}${t(corr?.explication ?? '')}</p>
      </li>`;
        })
        .join('')}</ul>
      <p class="ap-feedback-meta">${t(pluriel(correction.reponses, 'réponse', 'réponses'))} de la communauté. ${enCompte() ? t(right ? 'Réponse enregistrée dans votre progression : +1 point de réputation.' : 'Réponse enregistrée dans votre progression.') : lieu()}</p>
      <div class="ap-feedback-actions">
        ${rule && state.view !== 'savoir' ? `<a class="ap-rule-link" href="${rule.href}">${icon(RUB.regles.icon)}<span>${t(`La règle à retenir : ${rule.title.charAt(0).toLowerCase()}${rule.title.slice(1)}`)}</span></a>` : ''}
        ${enCompte() ? '' : `<button class="link-btn" type="button" data-ap-retry="${esc(key)}">${icon('replay')}Recommencer</button>`}
      </div>`;
  }

  function lockQuiz(scope: Element, key: string, choice: number, { focus = true } = {}) {
    const form = $('[data-ap-quiz]', scope);
    if (!form) return;
    const [type, id = ''] = key.split(':');
    let correct: number;
    if (type === 'check') correct = byId[id]!.check!.correct;
    else {
      const c = caseById[id]!;
      if (!c.correction) return;
      correct = c.detail!.options.findIndex((o) => o.id === c.correction!.optionCorrecteId);
    }
    $$('.ap-choice', form).forEach((label, i) => {
      const input = $<HTMLInputElement>('input', label)!;
      input.checked = i === choice;
      input.disabled = true;
      label.classList.toggle('is-correct', i === correct);
      label.classList.toggle('is-wrong', i === choice && i !== correct);
      const marque = $('.ap-choice-mark', label);
      if (marque) marque.innerHTML = i === correct ? icon('check') : i === choice ? icon('x') : '';
    });
    form.classList.add('is-locked');
    const actions = $('.ap-quiz-actions', form);
    if (actions) actions.hidden = true;
    const erreur = $('[data-ap-error]', form);
    if (erreur) erreur.hidden = true;
    const box = $('[data-ap-feedback]', scope);
    if (!box) return;
    box.innerHTML = feedbackHTML(key, choice);
    corrigerTypographie(box);
    box.hidden = false;
    if (animations.niveau() !== 'none')
      requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-shown')));
    else box.classList.add('is-shown');
    if (focus) box.focus({ preventScroll: false });
  }
  function resetQuiz(scope: HTMLElement, key: string) {
    const [type, id = ''] = key.split(':');
    if (type === 'check') delete progress.checks[id];
    else delete progress.cas[id];
    saveProgress();
    if (type === 'check') void envoyerSavoir(id);
    renderProgressLink();
    const c = type === 'cas' ? caseById[id] : null;
    scope.outerHTML =
      type === 'check'
        ? `<div class="ap-test-body" data-ap-test="${esc(key)}">${quizHTML(key, byId[id]!.check!.q, byId[id]!.check!.choices)}<div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div></div>`
        : casePlayerHTML(c!, { compact: scope.classList.contains('is-compact') });
    $<HTMLInputElement>(`[data-ap-test="${CSS.escape(key)}"] input`)?.focus();
  }
  function restoreQuizzes(scope: ParentNode = document) {
    for (const holder of $$<HTMLElement>('[data-ap-test]', scope)) {
      const key = holder.dataset.apTest ?? '';
      const [type, id = ''] = key.split(':');
      const record = type === 'check' ? progress.checks[id] : progress.cas[id];
      if (record && Number.isInteger(record.choice) && record.choice >= 0)
        lockQuiz(holder, key, record.choice, { focus: false });
    }
  }
  async function answer(form: HTMLFormElement) {
    const key = form.dataset.apQuiz ?? '';
    const holder = form.closest<HTMLElement>('[data-ap-test]');
    const checked = $<HTMLInputElement>('input:checked', form);
    if (!holder) return;
    if (!checked) {
      const erreur = $('[data-ap-error]', form);
      if (erreur) erreur.hidden = false;
      $<HTMLInputElement>('input', form)?.focus();
      return;
    }
    const choice = Number(checked.value);
    const [type, id = ''] = key.split(':');
    if (type === 'check') {
      const s = byId[id]!;
      const right = choice === s.check!.correct;
      progress.checks[id] = { choice, right, date: today };
      if (right) progress.acquis[id] = progress.acquis[id] || today;
      void envoyerSavoir(id);
    } else {
      // F-62, RG-72 : la réponse part à l'API, qui renvoie la correction (et l'enregistre pour un membre).
      const c = caseById[id]!;
      const option = c.detail!.options[choice];
      const bouton = $<HTMLButtonElement>('button[type="submit"]', form);
      if (bouton) bouton.disabled = true;
      const resultat = await api<ReponseCasApi>('POST', `/api/v1/cas/${c.id}/reponses`, {
        optionId: option?.id,
      });
      if (bouton) bouton.disabled = false;
      if (!resultat.ok) {
        toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
        return;
      }
      c.correction = resultat.donnees.correction;
      const right = resultat.donnees.correcte;
      progress.cas[id] = { choice, right, date: today };
      if (right && c.regle && !progress.acquis[c.regle]) {
        progress.acquis[c.regle] = today;
        void envoyerSavoir(c.regle);
      }
    }
    saveProgress();
    renderProgressLink();
    lockQuiz(holder, key, choice);
    syncAcquireButton();
  }

  /* Navigation locale ------------------------------------------------------------ */

  function renderTabs() {
    const liste = $('[data-ap-tabs]');
    if (!liste) return;
    liste.innerHTML = vues.onglets(state.view, state.rubrique);
    const titre = $('.ap-local-title');
    if (state.view === 'accueil') titre?.setAttribute('aria-current', 'page');
    else titre?.removeAttribute('aria-current');
    const current = $('[aria-current]', liste);
    if (current && liste.scrollWidth > liste.clientWidth) {
      const offset =
        current.getBoundingClientRect().left -
        liste.getBoundingClientRect().left +
        liste.scrollLeft;
      liste.scrollLeft = Math.max(0, offset - (liste.clientWidth - current.offsetWidth) / 2);
    }
  }
  function renderProgressLink() {
    const link = $('[data-ap-progress-link]');
    if (!link) return;
    link.innerHTML = vues.lienProgression();
    if (state.view === 'progression') link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  /* Savoir ---------------------------------------------------------------------- */

  function syncAcquireButton() {
    const button = $('[data-ap-acquire]');
    const s = button ? byId[button.dataset.apAcquire ?? ''] : undefined;
    if (button && s) button.outerHTML = acquireHTML(s);
  }
  const renderSavoir = () => pages.savoirHTML(byId[state.id ?? '']!);
  const renderCas = () => pages.casHTML(caseById[state.id ?? '']!);

  /* Progression ------------------------------------------------------------------- */

  function renderProgression() {
    const { done, total } = overall();
    const items = A.rubriques.map((r) => ({ r, ...rubCount(r.id) }));
    const acquired = Object.entries(progress.acquis)
      .filter(([id]) => byId[id])
      .toSorted((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 8);
    const toReview = [
      ...cases
        .filter((c) => progress.cas[c.id] && !progress.cas[c.id]!.right)
        .map((c) => ({
          href: c.href,
          kind: `${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe`,
          title: c.title,
          why: 'Réponse à revoir',
        })),
      ...actifs
        .filter((s) => progress.checks[s.id] && !progress.checks[s.id]!.right)
        .map((s) => ({
          href: s.href,
          kind: `${icon(kindOf(s).icon)}${t(s.kindLabel)}`,
          title: s.title,
          why: 'Question à refaire',
        })),
      ...actifs.filter(revisedSince).map((s) => ({
        href: s.href,
        kind: `${icon(kindOf(s).icon)}${t(s.kindLabel)}`,
        title: s.title,
        why: `Revu le ${shortDate(s.updated)}, après votre lecture`,
      })),
    ];
    const next = nextBase();
    const nextRule = regles.find((s) => !isAcquired(s.id));
    const suggestion = next ?? nextRule;
    return `<header class="container ap-head">
      ${kicker('trend-up', 'Votre progression')}
      <h1 id="ap-h1" tabindex="-1" data-ap-h1>Ce que vous avez appris</h1>
      <p class="ap-lead">Visible de vous seul. ${lieu()}</p>
      <div class="ap-head-foot"><p class="ap-head-progress">${ringHTML(done, total)}<span><b>${done}</b> ${t(`sur ${total} savoirs et cas`)}</span></p>${suggestion ? `<a class="btn btn-primary btn-sm" href="${suggestion.href}">${next ? `Continuer avec la base ${next.order}` : 'Continuer avec les règles'}${icon('arrow')}</a>` : ''}</div>
    </header>
    <div class="container ap-rub ap-prog">
      <ul class="ap-prog-grid">${items
        .map(
          ({
            r,
            done: d,
            total: n,
          }) => `<li><a class="ap-prog-item" href="${ROUTES.apprendre}?rubrique=${r.id}">
        <span class="ap-prog-name">${icon(r.icon)}${t(r.label)}</span>
        <span class="ap-prog-count"><b>${d}</b> sur ${n}</span>
        ${segHTML(d, n, `${d} sur ${n}`)}
      </a></li>`,
        )
        .join('')}</ul>
      <div class="ap-prog-cols">
        <section aria-labelledby="ap-recent-title"><h2 id="ap-recent-title" class="ap-block-title">Acquis récemment</h2>
          ${
            acquired.length
              ? `<ul class="ap-plain">${acquired
                  .map(([id, date]) => {
                    const s = byId[id]!;
                    return `<li><a href="${s.href}"><span class="ap-related-kind">${icon(kindOf(s).icon)}${t(s.kindLabel)}</span>${t(s.title)}</a><time datetime="${date}">${t(shortDate(date))}</time></li>`;
                  })
                  .join('')}</ul>`
              : `<p class="ap-empty">Rien pour l’instant. Marquez un savoir comme acquis, ou réussissez sa question : il apparaîtra ici.${next ? ` <a href="${next.href}">${t(`Commencer par « ${next.title} »`)}</a>` : ''}</p>`
          }
        </section>
        <section aria-labelledby="ap-review-title"><h2 id="ap-review-title" class="ap-block-title">À revoir</h2>
          ${toReview.length ? `<ul class="ap-plain">${toReview.map((item) => `<li><a href="${item.href}"><span class="ap-related-kind">${item.kind}</span>${t(item.title)}</a><span class="ap-why">${t(item.why)}</span></li>`).join('')}</ul>` : '<p class="ap-empty">Rien à revoir. Les cas manqués et les savoirs revus après votre lecture s’afficheront ici.</p>'}
        </section>
      </div>
      <div class="ap-reset" data-ap-reset-zone>${done || Object.keys(progress.checks).length ? '<button class="link-btn ap-reset-btn" type="button" data-ap-reset>Effacer ma progression</button>' : ''}</div>
    </div>`;
  }

  /* Affichage ---------------------------------------------------------------------- */

  const TITLES = {
    accueil: () => 'Apprendre · Vysora',
    rubrique: () => `${RUB[state.rubrique!].label} · Apprendre · Vysora`,
    savoir: () => `${byId[state.id!]!.title} · Apprendre · Vysora`,
    cas: () => `${caseById[state.id!]!.title} · Bon réflexe · Vysora`,
    progression: () => 'Votre progression · Apprendre · Vysora',
  };

  let revealObserver: IntersectionObserver | null = null;
  function observeReveal(zone: HTMLElement) {
    revealObserver?.disconnect();
    const items = $$('.ap-reveal', zone);
    if (!('IntersectionObserver' in window) || !animations.completes()) {
      for (const el of items) el.classList.add('is-in');
      return;
    }
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver?.unobserve(entry.target);
          }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 },
    );
    for (const el of items) revealObserver.observe(el);
  }

  function show({ focus = true, hash = '', animer = true } = {}) {
    const zone = vue!;
    zone.dataset.apScreen = state.view;
    if (state.view !== 'accueil') filtres.stop = null;
    zone.innerHTML =
      state.view === 'accueil'
        ? renderAccueil()
        : state.view === 'rubrique'
          ? vues.RUBRIQUES[state.rubrique!]()
          : state.view === 'savoir'
            ? renderSavoir()
            : state.view === 'cas'
              ? renderCas()
              : renderProgression();
    document.title = TITLES[state.view]();
    corrigerTypographie(zone);
    renderTabs();
    renderProgressLink();
    restoreQuizzes(zone);
    void chargerCas(zone);
    observeReveal(zone);
    closeSearch(false);
    if (animer && animations.niveau() !== 'none') {
      zone.classList.remove('is-entering');
      void zone.offsetWidth;
      zone.classList.add('is-entering');
    }
    const cible = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (cible) requestAnimationFrame(() => cible.scrollIntoView({ block: 'start' }));
    else if (focus) window.scrollTo({ top: 0 });
    if (focus) $('[data-ap-h1]', zone)?.focus({ preventScroll: true });
  }
  function navigate(url: string, { replace = false } = {}) {
    const target = new URL(url, location.href);
    history[replace ? 'replaceState' : 'pushState'](
      null,
      '',
      `${target.pathname}${target.search}${target.hash}`,
    );
    D!.casOuvert = null;
    readURL();
    show({ focus: true, hash: target.hash });
  }

  /* Frise des bases ---------------------------------------------------------------- */

  function selectStop(i: number, { focus = false } = {}) {
    const frise = $('[data-ap-frise]');
    if (!frise) return;
    filtres.stop = Math.max(0, Math.min(bases.length - 1, i));
    $$<HTMLButtonElement>('[data-ap-stop]', frise).forEach((button, n) => {
      const on = n === filtres.stop;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    const panel = $('[data-ap-frise-panel]', frise);
    if (!panel) return;
    panel.setAttribute('aria-labelledby', `ap-stop-${filtres.stop}`);
    panel.innerHTML = frisePanelHTML(filtres.stop);
    corrigerTypographie(panel);
    if (animations.niveau() !== 'none') {
      panel.classList.remove('is-swapping');
      void panel.offsetWidth;
      panel.classList.add('is-swapping');
    }
  }

  /* Recherche ---------------------------------------------------------------------- */

  const index = [
    ...actifs.map((s) => ({
      href: s.href,
      kind: s.kindLabel,
      kindIcon: kindOf(s).icon,
      title: s.title,
      sub: s.kind === 'astuces' ? toolLabel(s.tool ?? '', s.model) : '',
      text: ` ${plier(`${s.title} ${s.short} ${s.tool ?? ''} ${(s.tools ?? []).join(' ')} ${s.kindLabel}`)}`,
      titleText: ` ${plier(s.title)}`,
    })),
    ...cases.map((c) => ({
      href: c.href,
      kind: 'Cas Bon réflexe',
      kindIcon: RUB['bon-reflexe'].icon,
      title: c.title,
      sub: c.domain,
      text: ` ${plier(`${c.title} ${c.context} ${c.domain} bon reflexe cas`)}`,
      titleText: ` ${plier(c.title)}`,
    })),
  ];
  function renderSearch() {
    const input = $<HTMLInputElement>('[data-ap-search-input]');
    const box = $('[data-ap-search-results]');
    const status = $('[data-ap-search-status]');
    if (!input || !box || !status) return;
    const query = input.value.trim();
    const tokens = decouper(query);
    if (!query) {
      box.innerHTML = `<li class="ap-search-hint">Exemples : ${['graine', 'agent', 'traduction', 'Midjourney', 'script'].map((word) => `<button class="link-btn" type="button" data-ap-search-try="${word}">${word}</button>`).join('')}</li>`;
      status.textContent = '';
      return;
    }
    const list = index
      .filter((item) => tokens.every((variants) => contient(item.text, variants)))
      .map((item) => ({
        item,
        score: tokens.filter((variants) => contient(item.titleText, variants)).length,
      }))
      .toSorted((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.item);
    box.innerHTML = list.length
      ? list
          .map(
            (item) =>
              `<li><a class="ap-search-item" href="${item.href}"><span class="ap-related-kind">${icon(item.kindIcon)}${t(item.kind)}${item.sub ? ` · ${t(item.sub)}` : ''}</span><span class="ap-search-title">${surligner(item.title, tokens)}</span></a></li>`,
          )
          .join('')
      : `<li class="ap-search-hint">${t(`Aucun savoir ne correspond à « ${query} ».`)} <a href="${ROUTES.nouveauSujet}">Poser la question au forum</a></li>`;
    status.textContent = list.length
      ? `${pluriel(list.length, 'résultat', 'résultats')}.`
      : 'Aucun résultat.';
  }
  function openSearch() {
    const panel = $('[data-ap-search]');
    if (!panel) return;
    panel.hidden = false;
    for (const b of $$('[data-ap-search-open]')) b.setAttribute('aria-expanded', 'true');
    renderSearch();
    $<HTMLInputElement>('[data-ap-search-input]')?.focus();
  }
  function closeSearch(restore = true) {
    const panel = $('[data-ap-search]');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    for (const b of $$('[data-ap-search-open]')) b.setAttribute('aria-expanded', 'false');
    if (restore) $<HTMLButtonElement>('.ap-search-btn')?.focus();
  }

  /* Interactions ------------------------------------------------------------------- */

  const outilsDialogue: OutilChoisissable[] = D.outils.map((o) => ({
    id: o.id,
    nom: o.nom,
    slug: o.slug,
    logo: o.logo,
    logoMonochrome: o.logoMonochrome,
    famille: o.famille as OutilChoisissable['famille'],
  }));
  const mesOutils = monterMesOutils(outilsDialogue, () => {
    const y = window.scrollY;
    show({ focus: false });
    window.scrollTo({ top: y });
  });

  async function copyPrompt(id: string, button: HTMLElement) {
    const s = byId[id];
    if (!s?.prompt) return;
    try {
      await navigator.clipboard.writeText(s.prompt.after);
      toast('Prompt copié.');
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), 1600);
    } catch {
      toast('Copie indisponible : sélectionnez le texte pour le copier.', 'alert');
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target.closest('[data-ap-search-open]')) {
      event.preventDefault();
      const panel = $('[data-ap-search]');
      if (panel?.hidden) openSearch();
      else closeSearch();
      return;
    }
    if (target.closest('[data-ap-search-close]')) return void closeSearch();
    const tryWord = target.closest<HTMLElement>('[data-ap-search-try]');
    if (tryWord) {
      const input = $<HTMLInputElement>('[data-ap-search-input]');
      if (input) {
        input.value = tryWord.dataset.apSearchTry ?? '';
        renderSearch();
        input.focus();
      }
      return;
    }
    if (target.closest('[data-open-tools]')) return void mesOutils.ouvrir();
    const stop = target.closest<HTMLElement>('[data-ap-stop]');
    if (stop) return void selectStop(Number(stop.dataset.apStop));
    if (target.closest('[data-ap-stop-next]'))
      return void selectStop((filtres.stop ?? 0) + 1, { focus: true });
    const copy = target.closest<HTMLElement>('[data-ap-copy]');
    if (copy) return void copyPrompt(copy.dataset.apCopy ?? '', copy);
    const retry = target.closest<HTMLElement>('[data-ap-retry]');
    if (retry) {
      const holder = retry.closest<HTMLElement>('[data-ap-test]');
      if (holder) resetQuiz(holder, retry.dataset.apRetry ?? '');
      syncAcquireButton();
      return;
    }
    const acquire = target.closest<HTMLElement>('[data-ap-acquire]');
    if (acquire) {
      const s = byId[acquire.dataset.apAcquire ?? ''];
      if (!s) return;
      const on = !isAcquired(s.id);
      setAcquired(s.id, on);
      syncAcquireButton();
      $<HTMLButtonElement>('[data-ap-acquire]')?.focus();
      toast(
        on ? `${s.kindLabel} marquée comme acquise.` : `${s.kindLabel} retirée de vos acquis.`,
        on ? 'check' : 'replay',
      );
      return;
    }
    const family = target.closest<HTMLElement>('[data-ap-family]');
    if (family) {
      filtres.family = family.dataset.apFamily ?? 'all';
      const y = window.scrollY;
      show({ focus: false });
      window.scrollTo({ top: y });
      $<HTMLButtonElement>(`[data-ap-family="${filtres.family}"]`)?.focus();
      return;
    }
    const level = target.closest<HTMLElement>('[data-ap-level]');
    if (level) {
      filtres.level = Number(level.dataset.apLevel);
      const y = window.scrollY;
      show({ focus: false });
      window.scrollTo({ top: y });
      $<HTMLButtonElement>(`[data-ap-level="${filtres.level}"]`)?.focus();
      return;
    }
    if (target.closest('[data-ap-notion-clear]')) {
      filtres.notionQuery = '';
      const input = $<HTMLInputElement>('[data-ap-notion-filter]');
      const groupes = $('[data-ap-notion-groups]');
      if (input) input.value = '';
      if (groupes) groupes.innerHTML = notionGroupsHTML();
      input?.focus();
      return;
    }
    if (target.closest('[data-ap-reset]')) {
      const zone = $('[data-ap-reset-zone]');
      if (zone)
        zone.innerHTML = `<p class="ap-reset-confirm" role="group" aria-label="Confirmer l’effacement"><span>${enCompte() ? 'Effacer vos acquis et vos réponses aux questions de vérification ? Vos réponses aux cas Bon réflexe restent enregistrées.' : 'Effacer vos acquis et vos réponses dans ce navigateur ?'}</span><button class="btn btn-secondary btn-sm" type="button" data-ap-reset-yes>Effacer</button><button class="link-btn" type="button" data-ap-reset-no>Annuler</button></p>`;
      $<HTMLButtonElement>('[data-ap-reset-no]')?.focus();
      return;
    }
    if (target.closest('[data-ap-reset-no]')) {
      const zone = $('[data-ap-reset-zone]');
      if (zone)
        zone.innerHTML =
          '<button class="link-btn ap-reset-btn" type="button" data-ap-reset>Effacer ma progression</button>';
      $<HTMLButtonElement>('[data-ap-reset]')?.focus();
      return;
    }
    if (target.closest('[data-ap-reset-yes]')) {
      if (enCompte()) {
        void api('DELETE', '/api/v1/moi/savoirs').then((reponse) => {
          if (!reponse.ok) toast(ECHEC_PROGRESSION, 'alert');
        });
      }
      progress = { acquis: {}, cas: enCompte() ? progress.cas : {}, checks: {} };
      saveProgress();
      show({ focus: true });
      toast('Votre progression a été effacée.', 'replay');
      return;
    }
    // Liens internes d'Apprendre : changement de vue sans recharger la page.
    const link = target.closest<HTMLAnchorElement>('a[href]');
    const mouse = event as MouseEvent;
    if (
      !link ||
      event.defaultPrevented ||
      mouse.button !== 0 ||
      mouse.metaKey ||
      mouse.ctrlKey ||
      mouse.shiftKey ||
      mouse.altKey ||
      link.target
    )
      return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== ROUTES.apprendre) return;
    if (location.pathname === ROUTES.apprendre && url.search === location.search && url.hash)
      return;
    event.preventDefault();
    navigate(url.href);
  });

  document.addEventListener('submit', (event) => {
    const form = (event.target as Element).closest<HTMLFormElement>('[data-ap-quiz]');
    if (!form) return;
    event.preventDefault();
    void answer(form);
  });
  document.addEventListener('change', (event) => {
    const form = (event.target as Element).closest('[data-ap-quiz]');
    const erreur = form ? $('[data-ap-error]', form) : null;
    if (erreur) erreur.hidden = true;
  });
  document.addEventListener('input', (event) => {
    const cible = event.target as HTMLInputElement;
    if (cible.matches('[data-ap-search-input]')) renderSearch();
    if (cible.matches('[data-ap-notion-filter]')) {
      filtres.notionQuery = cible.value;
      const groupes = $('[data-ap-notion-groups]');
      if (groupes) groupes.innerHTML = notionGroupsHTML();
    }
  });
  document.addEventListener('keydown', (event) => {
    const { key } = event;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const cible = event.target as Element;
    if (cible.closest?.('[data-ap-search]')) {
      if (key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const items = $$<HTMLAnchorElement>('.ap-search-item');
        if (!items.length) return;
        event.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLAnchorElement);
        const next = key === 'ArrowDown' ? Math.min(items.length - 1, at + 1) : at - 1;
        if (next < 0) $<HTMLInputElement>('[data-ap-search-input]')?.focus();
        else items[next]?.focus();
      }
      return;
    }
    const stop = cible.closest?.<HTMLElement>('[data-ap-stop]');
    if (stop) {
      const i = Number(stop.dataset.apStop);
      const moves: Record<string, number> = {
        ArrowRight: i + 1,
        ArrowLeft: i - 1,
        Home: 0,
        End: bases.length - 1,
      };
      if (key in moves) {
        event.preventDefault();
        selectStop(moves[key]!, { focus: true });
      }
      return;
    }
    const quiz =
      cible.closest?.<HTMLFormElement>('[data-ap-quiz]') ??
      (state.view === 'cas' &&
      !cible.closest?.('input, textarea, select, [contenteditable="true"], dialog')
        ? $<HTMLFormElement>('[data-ap-view] [data-ap-quiz]')
        : null);
    if (quiz && !quiz.classList.contains('is-locked')) {
      const letter = LETTRES.indexOf(key.toUpperCase());
      const inputs = $$<HTMLInputElement>('input[type="radio"]', quiz);
      if (letter >= 0 && letter < inputs.length && key.length === 1) {
        event.preventDefault();
        inputs[letter]!.checked = true;
        inputs[letter]!.focus();
        const erreur = $('[data-ap-error]', quiz);
        if (erreur) erreur.hidden = true;
        return;
      }
      if (key === 'Enter' && cible.matches?.('input[type="radio"]')) {
        event.preventDefault();
        void answer(quiz);
        return;
      }
    }
    if (
      document.querySelector('dialog[open]') ||
      cible.closest?.('input, textarea, select, [contenteditable="true"]')
    )
      return;
    if (key === '/') {
      event.preventDefault();
      openSearch();
    }
  });
  window.addEventListener('popstate', () => {
    D.casOuvert = null;
    readURL();
    show({ focus: true, hash: location.hash });
  });

  /* Démarrage ---------------------------------------------------------------------- */

  readURL();
  // Une page rendue par le serveur (savoir, cas) est reprise sans l'animation d'entrée.
  show({ focus: false, hash: location.hash, animer: !vue.hasAttribute('data-ap-rendue') });
  if (enCompte() && aVerser) void verserAuCompte();
}
