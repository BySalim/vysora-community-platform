/* Apprendre (APP-02, APP-03) : vue d'ensemble, rubriques (bases, notions, règles, astuces, Bon
   réflexe), barre des rubriques et lien « Ma progression », partagés par le serveur (référencement :
   la page arrive rendue) et par le navigateur (scripts/apprendre.ts). Fonctions pures : ce qui vient
   du navigateur (outils choisis, filtres, droits de la session) leur est passé. Porté de
   prototype/apprendre.js. */

import { APPRENDRE as A } from './contenus';
import { boutonMesOutils } from '../explorer/index-guides';
import { contient, decouper, plier, surligner } from '../explorer/recherche';
import { ROUTES } from '../navigation';
import { esc, pluriel, t } from '../texte';
import {
  icon,
  LIBELLES_NIVEAU,
  type CasVue,
  type ModeleApprendre,
  type Pages,
  type Progression,
  type SavoirVue,
} from './pages';
import type { IdRubrique } from './types';

export const BASE_LABEL = [
  'Outil et modèle',
  'Une demande claire',
  'Deux réponses différentes',
  'Ce que l’IA ignore',
  'Une chose à la fois',
  'Bien écrit, pas forcément juste',
  'Garder la main',
  'Les moments clés',
];

/** Filtres de la vue : base choisie dans la frise, famille d'astuces, niveau des cas, recherche dans
    les notions. Le script les change ; le serveur rend leurs valeurs de départ. */
export interface FiltresApprendre {
  stop: number | null;
  family: string;
  level: number;
  notionQuery: string;
}
export const filtresDeDepart = (): FiltresApprendre => ({
  stop: null,
  family: 'all',
  level: 0,
  notionQuery: '',
});

export function creerVues(
  m: ModeleApprendre,
  pages: Pages,
  filtres: FiltresApprendre,
  etat: {
    progress: () => Progression;
    today: string;
    /** Outils choisis (« Mes outils »), par leur adresse. */
    mesOutils: () => Iterable<string>;
    /** RG-70 : la session peut proposer un cas (lien « Proposer un cas »). */
    peutProposer: () => boolean;
  },
) {
  const { D, RUB, byId, bases, notions, regles, astuces, remplacees, actifs, LIST, cases } = m;
  const { casDuPrototype, casDuJour, outilsParNom, outilsParSlug, iconeDomaine, logo } = m;
  const { shortDate, fullDate } = m;
  const { isAcquired, levelTag, toolRef, casePlayerHTML } = pages;
  const today = etat.today;

  const kicker = (name: string, label: string) =>
    `<p class="kicker">${icon(name, '')}${t(label)}</p>`;
  const doneTag = (id: string) =>
    isAcquired(id) ? `<span class="ap-done">${icon('check')}Acquis</span>` : '';
  function segHTML(done: number, total: number, label: string) {
    return `<span class="ap-seg" role="img" aria-label="${esc(label)}">${Array.from({ length: total }, (_, i) => `<i${i < done ? ' class="on"' : ''}></i>`).join('')}</span>`;
  }
  function ringHTML(done: number, total: number) {
    const pct = total ? done / total : 0;
    const r = 9;
    const c = 2 * Math.PI * r;
    return `<svg class="ap-ring" viewBox="0 0 24 24" aria-hidden="true"><circle class="ap-ring-bg" cx="12" cy="12" r="${r}"/><circle class="ap-ring-fg" cx="12" cy="12" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"/></svg>`;
  }

  function rubCount(id: IdRubrique) {
    if (id === 'bon-reflexe')
      return {
        done: cases.filter((c) => etat.progress().cas[c.id]?.right).length,
        total: cases.length,
      };
    const list = LIST[id];
    return { done: list.filter((s) => isAcquired(s.id)).length, total: list.length };
  }
  function overall() {
    const done = actifs.filter((s) => isAcquired(s.id)).length + rubCount('bon-reflexe').done;
    return { done, total: actifs.length + cases.length };
  }
  const nextBase = () => bases.find((s) => !isAcquired(s.id)) ?? null;

  /* Vue d'ensemble --------------------------------------------------------------- */

  const JOURNAL_KIND = {
    nouveau: { icon: 'plus', label: (s: SavoirVue) => `Nouvelle ${s.kindLabel.toLowerCase()}` },
    revu: { icon: 'replay', label: (s: SavoirVue) => `${s.kindLabel} revue` },
    remplace: { icon: 'swap', label: (s: SavoirVue) => `${s.kindLabel} remplacée` },
  };
  function journalEntryHTML(entry: (typeof A.journal)[number], { why = true, src = false } = {}) {
    const s = byId[entry.savoir]!;
    const kind = JOURNAL_KIND[entry.kind];
    return `<p class="ap-jkind" data-jkind="${entry.kind}">${icon(kind.icon)}${t(kind.label(s))}</p>
      <a class="ap-jtitle" href="${s.href}">${t(s.title)}</a>
      ${why ? `<p class="ap-jwhy">${t(entry.why)}</p>` : ''}
      ${src ? `<p class="ap-jsource">${t(A.sources[entry.source])}</p>` : ''}`;
  }
  function heroHTML() {
    const next = nextBase();
    const started = bases.some((s) => isAcquired(s.id));
    const cta = next
      ? `<a class="btn btn-primary btn-lg" href="${next.href}">${started ? `Reprendre : ${t((BASE_LABEL[(next.order ?? 1) - 1] ?? '').replace(/^./, (ch) => ch.toLowerCase()))}` : 'Commencer par les bases'}${icon('arrow')}</a>`
      : `<a class="btn btn-primary btn-lg" href="${ROUTES.apprendre}?rubrique=regles">Passer aux règles${icon('arrow')}</a>`;
    const recent = A.journal.slice(0, 4);
    const mots: Record<IdRubrique, [string, string]> = {
      bases: ['base', 'bases'],
      notions: ['notion', 'notions'],
      regles: ['règle', 'règles'],
      astuces: ['astuce', 'astuces'],
      'bon-reflexe': ['cas Bon réflexe', 'cas Bon réflexe'],
    };
    return `<section class="ap-hero" aria-labelledby="ap-h1">
      <div class="container ap-hero-grid">
        <div class="ap-hero-text">
          <h1 id="ap-h1" tabindex="-1" data-ap-h1>Apprendre à créer avec l’IA</h1>
          <p class="ap-lead">Les bases pour démarrer, les notions à connaître, les règles qui évitent les erreurs coûteuses et les astuces de chaque outil. L’équipe Vysora les rédige à partir de ce que la communauté découvre en créant, et les revoit dès qu’un outil évolue.</p>
          <div class="ap-hero-actions">${cta}${casDuJour ? `<a class="btn btn-secondary btn-lg" href="${casDuJour.href}">${icon(RUB['bon-reflexe'].icon)}Le cas du jour</a>` : ''}</div>
          <ul class="ap-hero-count" aria-label="Contenu d’Apprendre">${A.rubriques
            .map((r) => {
              const n = r.id === 'bon-reflexe' ? cases.length : LIST[r.id].length;
              const word = mots[r.id];
              return `<li><a href="${ROUTES.apprendre}?rubrique=${r.id}"><b>${n}</b> ${t(n > 1 ? word[1] : word[0])}</a></li>`;
            })
            .join('')}</ul>
        </div>
        <aside class="ap-week" aria-labelledby="ap-week-title">
          <div class="ap-week-head"><h2 id="ap-week-title">${icon('history')}Revu cette semaine</h2><p>Mis à jour le ${t(fullDate(A.updated))}</p></div>
          <ol class="ap-week-list">${recent.map((entry) => `<li><time datetime="${entry.date}">${t(shortDate(entry.date))}</time><div>${journalEntryHTML(entry, { why: false })}</div></li>`).join('')}</ol>
          <a class="link-arrow" href="#journal">Tout le journal${icon('arrow-down', 'icon-sm')}</a>
        </aside>
      </div>
    </section>`;
  }
  function frisePanelHTML(i: number) {
    const s = bases[i]!;
    return `<p class="ap-meta">Base ${i + 1} sur ${bases.length}<span aria-hidden="true">·</span>${s.minutes} min de lecture${isAcquired(s.id) ? `<span aria-hidden="true">·</span>${doneTag(s.id)}` : ''}</p>
      <h3><a href="${s.href}">${t(s.title)}</a></h3>
      <p>${t(s.short)}</p>
      <div class="ap-frise-actions"><a class="btn btn-primary btn-sm" href="${s.href}">${isAcquired(s.id) ? 'Relire cette base' : 'Lire cette base'}${icon('arrow')}</a>${i < bases.length - 1 ? `<button class="link-btn" type="button" data-ap-stop-next>Base suivante${icon('chevron-right')}</button>` : ''}</div>`;
  }
  function baseRowHTML(s: SavoirVue) {
    return `<li class="ap-baserow${isAcquired(s.id) ? ' is-done' : ''}">
      <span class="ap-baserow-n" aria-hidden="true">${s.order}</span>
      <div class="ap-baserow-main"><h3><a href="${s.href}">${t(s.title)}</a></h3><p class="ap-sum">${t(s.short)}</p></div>
      <p class="ap-baserow-meta">${s.minutes} min${isAcquired(s.id) ? doneTag(s.id) : ''}</p>
    </li>`;
  }
  function basesSectionHTML() {
    const { done, total } = rubCount('bases');
    const sel = filtres.stop ?? Math.max(0, bases.indexOf(nextBase() ?? bases[0]!));
    filtres.stop = sel;
    return `<section class="container ap-sec ap-reveal" id="bases" aria-labelledby="ap-bases-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.bases.icon, 'Les bases')}<h2 id="ap-bases-title">Huit essentiels, dans l’ordre</h2><p class="ap-sec-lead">Une vingtaine de minutes pour poser les fondations. ${done ? t(`${done} sur ${total} acquises.`) : 'Commencez par la première, les suivantes s’appuient dessus.'}</p></div>
        <a class="link-arrow" href="${ROUTES.apprendre}?rubrique=bases">Toutes les bases${icon('arrow')}</a>
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
  function ruleRowHTML(s: SavoirVue) {
    const c = casDuPrototype(s.situation);
    const record = c ? etat.progress().cas[c.id] : etat.progress().checks[s.id];
    const status = record
      ? record.right
        ? `<span class="ap-done">${icon('check')}${c ? 'Cas réussi' : 'Question réussie'}</span>`
        : `<span class="ap-todo">${icon('replay')}À revoir</span>`
      : `<span class="ap-test-link">${icon(c ? RUB['bon-reflexe'].icon : 'help')}${c ? 'Cas Bon réflexe' : 'Question'}</span>`;
    return `<li class="ap-rulerow">
      <div class="ap-rulerow-main"><h3><a href="${s.href}">${t(s.title)}</a></h3><p class="ap-sum">${t(s.short)}</p></div>
      <p class="ap-rulerow-meta">${status}</p>
    </li>`;
  }
  function rulesSectionHTML() {
    const duJour = casDuJour;
    return `<section class="container ap-sec ap-reveal" id="regles" aria-labelledby="ap-rules-title">
      <div class="ap-split">
        <div class="ap-split-main">
          <div class="ap-sec-head">
            <div>${kicker(RUB.regles.icon, 'Les règles')}<h2 id="ap-rules-title">Les règles qui évitent les erreurs coûteuses</h2><p class="ap-sec-lead">Tirées des corrections qui reviennent le plus souvent dans les créations de la communauté.</p></div>
          </div>
          ${A.themes
            .map((theme) => {
              const list = regles.filter((s) => s.theme === theme.id).slice(0, 2);
              return `<div class="ap-theme"><h3 class="ap-theme-title">${t(theme.label)}</h3><ul class="ap-rulelist">${list.map(ruleRowHTML).join('')}</ul></div>`;
            })
            .join('')}
          <a class="link-arrow" href="${ROUTES.apprendre}?rubrique=regles">Les ${regles.length} règles${icon('arrow')}</a>
        </div>
        ${
          today && duJour
            ? `<aside class="ap-today" aria-labelledby="ap-today-title">
          <p class="ap-today-label">${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe du jour<span aria-hidden="true">·</span>${levelTag(duJour.level)}</p>
          <h3 id="ap-today-title"><a href="${duJour.href}">${t(duJour.title)}</a></h3>
          ${casePlayerHTML(duJour, { compact: true })}
          <p class="ap-today-foot"><a class="link-arrow" href="${ROUTES.apprendre}?rubrique=bon-reflexe">Tous les cas${icon('arrow')}</a></p>
        </aside>`
            : ''
        }
      </div>
    </section>`;
  }

  type GroupeOutil = {
    tool: string;
    list: SavoirVue[];
    mine: boolean;
    family: string;
    latest: string;
  };
  function sortedTools(): GroupeOutil[] {
    const mine = new Set([...etat.mesOutils()].map((slug) => outilsParSlug.get(slug)?.nom ?? ''));
    const groups = new Map<string, SavoirVue[]>();
    for (const s of astuces) {
      const tool = s.tool ?? '';
      if (!groups.has(tool)) groups.set(tool, []);
      groups.get(tool)!.push(s);
    }
    return [...groups.entries()]
      .map(([tool, list]) => ({
        tool,
        list: list.toSorted((a, b) => (b.verified ?? '').localeCompare(a.verified ?? '')),
        mine: mine.has(tool),
        family: (outilsParNom.get(tool)?.famille ?? '').toLowerCase(),
        latest:
          list
            .map((s) => s.verified ?? '')
            .toSorted()
            .at(-1) ?? '',
      }))
      .toSorted((a, b) => Number(b.mine) - Number(a.mine) || b.latest.localeCompare(a.latest));
  }
  function astuceItemHTML(s: SavoirVue) {
    return `<li class="ap-tip${isAcquired(s.id) ? ' is-done' : ''}"><a href="${s.href}">${t(s.title)}</a><p class="ap-sum">${t(s.short)}</p><p class="ap-tip-meta">${s.model ? t(`Vérifiée avec la version ${s.model}, le ${shortDate(s.verified ?? s.updated)}`) : t(`Vérifiée le ${shortDate(s.verified ?? s.updated)}`)}${doneTag(s.id)}</p></li>`;
  }
  function toolGroupHTML(g: GroupeOutil, max = 3) {
    const more = g.list.length - max;
    const ancre = esc(g.tool.replace(/\W+/g, '-'));
    return `<section class="ap-toolgroup${g.mine ? ' is-mine' : ''}" aria-labelledby="ap-tool-${ancre}">
      <h3 class="ap-toolgroup-title" id="ap-tool-${ancre}">${logo(g.tool, 26)}<span>${t(g.tool)}</span>${g.mine ? '<span class="ap-mine">Votre outil</span>' : ''}</h3>
      <ul class="ap-tips">${g.list.slice(0, max).map(astuceItemHTML).join('')}</ul>
      ${more > 0 ? `<a class="ap-more" href="${ROUTES.apprendre}?rubrique=astuces">${t(pluriel(more, 'autre astuce', 'autres astuces'))}</a>` : ''}
    </section>`;
  }
  const mesOutilsHTML = () =>
    boutonMesOutils([...etat.mesOutils()], new Map(D.outils.map((o) => [o.slug, o])), true);
  function astucesSectionHTML() {
    const groups = sortedTools().slice(0, 6);
    return `<section class="container ap-sec ap-reveal" id="astuces" aria-labelledby="ap-tips-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.astuces.icon, 'Les astuces')}<h2 id="ap-tips-title">Ce qui fonctionne, outil par outil</h2><p class="ap-sec-lead">Chaque astuce est datée et vérifiée avec une version précise. Quand un outil change, l’équipe la revoit.</p></div>
        <div class="ap-sec-tools">${mesOutilsHTML()}<a class="link-arrow" href="${ROUTES.apprendre}?rubrique=astuces">Les ${astuces.length} astuces${icon('arrow')}</a></div>
      </div>
      <div class="ap-toolgrid">${groups.map((g) => toolGroupHTML(g, 2)).join('')}</div>
    </section>`;
  }
  const letterOf = (s: SavoirVue) => plier(s.title).trim().charAt(0).toUpperCase();
  function alphabetHTML(base = '') {
    const present = new Set(notions.map(letterOf));
    return `<nav class="ap-alpha" aria-label="Notions par lettre"><ul>${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .map((letter) =>
        present.has(letter)
          ? `<li><a href="${base}#lettre-${letter.toLowerCase()}">${letter}</a></li>`
          : `<li><span aria-hidden="true">${letter}</span></li>`,
      )
      .join('')}</ul></nav>`;
  }
  function notionsSectionHTML() {
    const picks = [
      'contexte',
      'hallucination',
      'graine',
      'agent',
      'image-reference',
      'fenetre-contexte',
    ]
      .map((id) => byId[id])
      .filter((s): s is SavoirVue => Boolean(s));
    return `<section class="container ap-sec ap-reveal" id="notions" aria-labelledby="ap-notions-title">
      <div class="ap-sec-head">
        <div>${kicker(RUB.notions.icon, 'Les notions')}<h2 id="ap-notions-title">Les mots à connaître</h2><p class="ap-sec-lead">Définis simplement, avec un exemple tiré des créations publiées.</p></div>
        <a class="link-arrow" href="${ROUTES.apprendre}?rubrique=notions">Les ${notions.length} notions${icon('arrow')}</a>
      </div>
      ${alphabetHTML(`${ROUTES.apprendre}?rubrique=notions`)}
      <dl class="ap-glossary ap-glossary-home">${picks.map((s) => `<div class="ap-term"><dt><a href="${s.href}">${t(s.title)}</a></dt><dd>${t(s.short)}</dd></div>`).join('')}</dl>
    </section>`;
  }
  function originHTML() {
    const steps: [string, string, string][] = [
      [
        String(D.chiffres.sujets),
        'Les questions du forum',
        'Une question qui revient chaque semaine signale un savoir qui manque ou qui n’est plus clair.',
      ],
      [
        String(D.chiffres.outils),
        'L’actualité des outils',
        'Chaque nouvelle version peut confirmer une astuce, ou la rendre caduque.',
      ],
      [
        String(actifs.length + cases.length),
        'L’équipe Vysora rédige et date',
        'Le système signale ce qui change ; l’équipe vérifie, écrit, puis note chaque modification dans le journal.',
      ],
    ];
    const unit = ['sujets', 'outils suivis', 'savoirs publiés'];
    return `<section class="ap-band ap-reveal" aria-labelledby="ap-origin-title">
      <div class="container">
        <div class="ap-band-head">
          <h2 id="ap-origin-title">D’où viennent ces savoirs</h2>
          <p>Chaque savoir part de ce que les membres vivent en créant. Seule l’équipe Vysora les rédige et les publie : chaque page reste exacte, datée et à jour.</p>
        </div>
        <ol class="ap-origin">${steps.map(([n, title, text], i) => `<li class="${i === steps.length - 1 ? 'is-team' : ''}"><span class="ap-origin-node" aria-hidden="true"></span><p class="ap-origin-n"><b>${n}</b> ${t(unit[i])}</p><h3>${t(title)}</h3><p>${t(text)}</p></li>`).join('')}</ol>
        <p class="ap-band-links"><a href="${ROUTES.explorer}">Les guides par objectif, dans Explorer${icon('arrow')}</a><a href="${ROUTES.nouveauSujet}">Poser une question au forum${icon('arrow')}</a></p>
      </div>
    </section>`;
  }
  function journalSectionHTML() {
    const days: { date: string; entries: (typeof A.journal)[number][] }[] = [];
    for (const entry of A.journal) {
      const last = days.at(-1);
      if (last && last.date === entry.date) last.entries.push(entry);
      else days.push({ date: entry.date, entries: [entry] });
    }
    return `<section class="container ap-sec ap-reveal" id="journal" aria-labelledby="ap-journal-title">
      <div class="ap-sec-head">
        <div>${kicker('history', 'Journal')}<h2 id="ap-journal-title">Ce qui a changé</h2><p class="ap-sec-lead">Chaque modification est datée et expliquée. Un savoir revu après votre lecture est signalé dans votre progression.</p></div>
      </div>
      <ol class="ap-journal">${days.map((day) => `<li class="ap-jday"><time datetime="${day.date}">${t(fullDate(day.date))}</time><ul>${day.entries.map((entry) => `<li class="ap-jentry">${journalEntryHTML(entry, { src: true })}</li>`).join('')}</ul></li>`).join('')}</ol>
    </section>`;
  }
  const accueilHTML = () =>
    `${heroHTML()}${basesSectionHTML()}${rulesSectionHTML()}${astucesSectionHTML()}${notionsSectionHTML()}${originHTML()}${journalSectionHTML()}`;

  /* Rubriques ------------------------------------------------------------------- */

  function rubHeadHTML(r: (typeof A.rubriques)[number], extra = '') {
    const { done, total } = rubCount(r.id);
    const unit = r.id === 'bon-reflexe' ? 'réussis' : 'acquises';
    return `<header class="container ap-head">
      ${kicker(r.icon, r.label)}
      <h1 id="ap-h1" tabindex="-1" data-ap-h1>${t(r.title)}</h1>
      <p class="ap-lead">${t(r.lead)}</p>
      <div class="ap-head-foot"><p class="ap-head-progress">${segHTML(done, total, `${done} sur ${total} ${unit}`)}<span><b>${done}</b> sur ${total} ${t(unit)}</span></p>${extra}</div>
    </header>`;
  }
  function rubBases() {
    const next = nextBase();
    const extra = next
      ? `<a class="btn btn-primary btn-sm" href="${next.href}">${bases.some((s) => isAcquired(s.id)) ? `Reprendre à la base ${next.order}` : 'Commencer par la première'}${icon('arrow')}</a>`
      : '';
    return `${rubHeadHTML(RUB.bases, extra)}<div class="container ap-rub"><ol class="ap-baselist">${bases.map(baseRowHTML).join('')}</ol></div>`;
  }
  function notionGroupsHTML() {
    const tokens = decouper(filtres.notionQuery);
    const list = notions.filter(
      (s) =>
        !tokens.length ||
        tokens.every((variants) => contient(` ${plier(`${s.title} ${s.short}`)}`, variants)),
    );
    if (!list.length)
      return `<p class="ap-empty">${t(`Aucune notion ne correspond à « ${filtres.notionQuery} ».`)} <button class="link-btn" type="button" data-ap-notion-clear>Afficher toutes les notions</button></p>`;
    const groups = new Map<string, SavoirVue[]>();
    for (const s of list) {
      const l = letterOf(s);
      if (!groups.has(l)) groups.set(l, []);
      groups.get(l)!.push(s);
    }
    return [...groups.entries()]
      .map(
        ([
          letter,
          items,
        ]) => `<section class="ap-letter" id="lettre-${letter.toLowerCase()}" aria-labelledby="ap-l-${letter}">
      <h2 class="ap-letter-title" id="ap-l-${letter}">${letter}</h2>
      <dl class="ap-glossary">${items.map((s) => `<div class="ap-term${isAcquired(s.id) ? ' is-done' : ''}"><dt><a href="${s.href}">${surligner(s.title, tokens)}</a>${doneTag(s.id)}</dt><dd>${surligner(s.short, tokens)}</dd></div>`).join('')}</dl>
    </section>`,
      )
      .join('');
  }
  function rubNotions() {
    return `${rubHeadHTML(RUB.notions)}<div class="container ap-rub">
      <div class="ap-notions-bar">
        <label class="ap-filter">${icon('search')}<span class="sr-only">Filtrer les notions</span><input type="search" placeholder="Filtrer les notions" value="${esc(filtres.notionQuery)}" autocomplete="off" data-ap-notion-filter></label>
        ${alphabetHTML()}
      </div>
      <div data-ap-notion-groups>${notionGroupsHTML()}</div>
    </div>`;
  }
  function rubRegles() {
    return `${rubHeadHTML(RUB.regles)}<div class="container ap-rub">${A.themes
      .map(
        (theme) => `<section class="ap-theme" aria-labelledby="ap-th-${theme.id}">
      <h2 class="ap-theme-title" id="ap-th-${theme.id}">${t(theme.label)}</h2>
      <ul class="ap-rulelist">${regles
        .filter((s) => s.theme === theme.id)
        .map(ruleRowHTML)
        .join('')}</ul>
    </section>`,
      )
      .join('')}</div>`;
  }
  const FAMILLES_ASTUCES: [string, string][] = [
    ['assistant', 'Assistants'],
    ['image', 'Image'],
    ['video', 'Vidéo'],
    ['audio', 'Audio'],
    ['code', 'Code'],
    ['automatisation', 'Automatisation'],
  ];
  function rubAstuces() {
    const groups = sortedTools();
    const families = FAMILLES_ASTUCES.filter(([id]) => groups.some((g) => g.family === id));
    const shown = groups.filter(
      (g) =>
        filtres.family === 'all' ||
        (filtres.family === 'mine' ? g.mine : g.family === filtres.family),
    );
    const chip = (id: string, label: string, count: number) =>
      `<button class="ap-chip" type="button" aria-pressed="${filtres.family === id}" data-ap-family="${id}">${t(label)}<span>${count}</span></button>`;
    const mineCount = groups.filter((g) => g.mine).reduce((n, g) => n + g.list.length, 0);
    return `${rubHeadHTML(RUB.astuces, mesOutilsHTML())}<div class="container ap-rub">
      <div class="ap-chips" role="group" aria-label="Filtrer les astuces">${chip('all', 'Toutes', astuces.length)}${mineCount ? chip('mine', 'Mes outils', mineCount) : ''}${families
        .map(([id, label]) =>
          chip(
            id,
            label,
            groups.filter((g) => g.family === id).reduce((n, g) => n + g.list.length, 0),
          ),
        )
        .join('')}</div>
      <div class="ap-toolgrid ap-toolgrid-full">${shown.map((g) => toolGroupHTML(g, 99)).join('')}</div>
      ${remplacees.length ? `<details class="ap-replaced"><summary>${icon('swap')}${t(pluriel(remplacees.length, 'astuce remplacée', 'astuces remplacées'))}</summary><ul class="ap-tips">${remplacees.map((s) => `<li class="ap-tip is-replaced"><a href="${s.href}">${t(s.title)}</a><p class="ap-sum">${t(s.short)}</p><p class="ap-tip-meta">${toolRef(s.tool ?? '', s.model, 16)}<span aria-hidden="true">·</span>Remplacée le ${t(shortDate(s.updated))}</p></li>`).join('')}</ul></details>` : ''}
    </div>`;
  }
  const metaCas = (c: CasVue) =>
    `${c.domain ? `<span>${icon(iconeDomaine(c.domain))}${t(c.domain)}</span>` : ''}${c.minutes ? `<span>${icon('clock')}${c.minutes} min</span>` : ''}`;
  function caseRowHTML(c: CasVue) {
    const record = etat.progress().cas[c.id];
    const status = record
      ? record.right
        ? `<span class="ap-done">${icon('check')}Réussi</span>`
        : `<span class="ap-todo">${icon('replay')}À revoir</span>`
      : '';
    return `<li class="ap-caserow">
      <p class="ap-caserow-meta">${levelTag(c.level)}${metaCas(c)}</p>
      <h3><a href="${c.href}">${t(c.title)}</a></h3>
      <p class="ap-sum">${t(c.context)}</p>
      <p class="ap-caserow-side"><span class="ap-rate"><b>${c.rate} %</b> de bonnes réponses</span>${status}</p>
    </li>`;
  }
  function rubCas() {
    const levels = [0, 1, 2, 3];
    const list = cases.filter((c) => !filtres.level || c.level === filtres.level);
    // APP-03 : un membre Expert ou plus, ou l'équipe de modération, propose ses cas (RG-70).
    const proposer = etat.peutProposer()
      ? `<a class="btn btn-secondary btn-sm" href="/bon-reflexe/nouveau">${icon('plus')}Proposer un cas</a>`
      : '';
    return `${rubHeadHTML(RUB['bon-reflexe'], proposer)}<div class="container ap-rub">
      <div class="ap-chips" role="group" aria-label="Filtrer par niveau">${levels.map((l) => `<button class="ap-chip" type="button" aria-pressed="${filtres.level === l}" data-ap-level="${l}">${l ? t(LIBELLES_NIVEAU[l]) : 'Tous les niveaux'}<span>${l ? cases.filter((c) => c.level === l).length : cases.length}</span></button>`).join('')}</div>
      ${list.length ? `<ul class="ap-caselist">${list.map(caseRowHTML).join('')}</ul>` : `<p class="ap-empty">Aucun cas pour ce niveau pour l’instant.</p>`}
    </div>`;
  }

  /* Barre des rubriques et lien « Ma progression » ---------------------------------- */

  /** Onglets des rubriques ; la rubrique ouverte est marquée. */
  const onglets = (view: string, rubrique: IdRubrique | null) =>
    A.rubriques
      .map((r) => {
        const count = r.id === 'bon-reflexe' ? cases.length : LIST[r.id].length;
        const current = rubrique === r.id;
        return `<li><a href="${ROUTES.apprendre}?rubrique=${r.id}" data-ap-nav${current ? ` aria-current="${view === 'rubrique' ? 'page' : 'true'}"` : ''}>${t(r.label)}<span class="ap-tab-count">${count}</span></a></li>`;
      })
      .join('');
  const lienProgression = () => {
    const { done, total } = overall();
    return `${ringHTML(done, total)}<span class="ap-progress-text"><span class="ap-progress-label">Ma progression</span><span class="ap-progress-num">${done}<span class="sr-only"> savoirs acquis</span> / ${total}</span></span>`;
  };
  const RUBRIQUES: Record<IdRubrique, () => string> = {
    bases: rubBases,
    notions: rubNotions,
    regles: rubRegles,
    astuces: rubAstuces,
    'bon-reflexe': rubCas,
  };

  return {
    kicker,
    doneTag,
    segHTML,
    ringHTML,
    rubCount,
    overall,
    nextBase,
    journalEntryHTML,
    frisePanelHTML,
    sortedTools,
    notionGroupsHTML,
    accueilHTML,
    RUBRIQUES,
    onglets,
    lienProgression,
  };
}
