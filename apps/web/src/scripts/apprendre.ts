/* Apprendre (APP-02), porté de prototype/apprendre.js : vue d'ensemble, rubriques (bases, notions,
   règles, astuces, Bon réflexe), page d'un savoir, page d'un cas, progression, recherche locale.
   Les savoirs sont les contenus éditoriaux de lib/apprendre/contenus.ts ; les cas Bon réflexe et
   leurs réponses passent par l'API (APP-01). La progression sur les savoirs reste dans le
   navigateur, comme dans le prototype ; celle des cas est enregistrée dans le compte du membre. */

import type { CasApi, CorrectionCasApi, CasResumeApi, ReponseCasApi } from '@vysora/shared';
import { APPRENDRE as A } from '../lib/apprendre/contenus';
import type { DonneesPageApprendre, IdRubrique, Savoir } from '../lib/apprendre/types';
import { decouper, contient, plier, surligner } from '../lib/explorer/recherche';
import { boutonMesOutils } from '../lib/explorer/index-guides';
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
  fmt,
  icon,
  pluriel,
  t,
  toast,
} from './commun/outils';

const source = document.getElementById('ap-donnees')?.textContent;
const D = source ? (JSON.parse(source) as DonneesPageApprendre) : null;
const vue = $('[data-ap-view]');

/* Cas du prototype (« cas-3 ») et cas de démonstration, désignés par leur adresse. */
const CAS_DU_PROTOTYPE: Record<string, string> = {
  'cas-1': 'des-ventes-en-hausse',
  'cas-2': 'une-reference-qui-semble-serieuse',
  'cas-3': 'un-script-pret-a-lancer',
  'cas-4': 'l-agent-propose-de-vider-le-dossier-du-projet-pour-repartir-proprement',
  'cas-5': 'l-ia-affirme-qu-une-image-generee-est-libre-de-droits',
  'cas-6': 'une-case-je-ne-suis-pas-un-robot-suffit-elle-a-bloquer-les-robots',
  'cas-7': 'le-resume-ajoute-une-conclusion-absente-du-document',
  'cas-8': 'le-modele-dit-avoir-teste-son-code',
};
const NIVEAUX: Record<string, number> = { DEBUTANT: 1, INTERMEDIAIRE: 2, AVANCE: 3 };
const LIBELLES_NIVEAU: Record<number, string> = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };
const LETTRES = 'ABCDE';
const BASE_LABEL = [
  'Outil et modèle',
  'Une demande claire',
  'Deux réponses différentes',
  'Ce que l’IA ignore',
  'Une chose à la fois',
  'Bien écrit, pas forcément juste',
  'Garder la main',
  'Les moments clés',
];

interface CasVue {
  id: string;
  api: CasResumeApi;
  n: number;
  title: string;
  context: string;
  level: number;
  domain: string;
  minutes: number | null;
  rate: number;
  answers: number;
  useful: number;
  date: string;
  href: string;
  regle?: string;
  /** Après chargement du cas complet (GET /api/v1/cas/:id). */
  detail?: CasApi;
  correction?: CorrectionCasApi;
}

interface Progression {
  acquis: Record<string, string>;
  cas: Record<string, { choice: number; right: boolean; date: string }>;
  checks: Record<string, { choice: number; right: boolean; date: string }>;
}

if (D && vue) {
  const MOIS = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];
  const dateLabel = (iso: string, annee = true) => {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}${annee ? ` ${d.getUTCFullYear()}` : ''}`;
  };
  const shortDate = (iso: string) => dateLabel(iso, false);
  const fullDate = (iso: string) => dateLabel(iso, true);
  const today = D.aujourdhui;

  /* Modèle ---------------------------------------------------------------------- */

  const RUB = Object.fromEntries(A.rubriques.map((r) => [r.id, r])) as Record<
    IdRubrique,
    (typeof A.rubriques)[number]
  >;
  const THEMES = Object.fromEntries(A.themes.map((th) => [th.id, th]));
  type SavoirVue = Savoir & { href: string; kindLabel: string };
  const savoirs: SavoirVue[] = A.savoirs.map((s) => ({
    ...s,
    href: `${ROUTES.apprendre}?savoir=${encodeURIComponent(s.id)}`,
    kindLabel: RUB[s.kind].one,
  }));
  const byId: Record<string, SavoirVue> = Object.fromEntries(savoirs.map((s) => [s.id, s]));
  const bases = savoirs
    .filter((s) => s.kind === 'bases')
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const notions = savoirs
    .filter((s) => s.kind === 'notions')
    .toSorted((a, b) => a.title.localeCompare(b.title, 'fr'));
  const regles = savoirs.filter((s) => s.kind === 'regles');
  const astuces = savoirs.filter((s) => s.kind === 'astuces' && !s.replacedBy);
  const remplacees = savoirs.filter((s) => s.replacedBy);
  const actifs = savoirs.filter((s) => !s.replacedBy);
  const LIST: Record<Exclude<IdRubrique, 'bon-reflexe'>, SavoirVue[]> = {
    bases,
    notions,
    regles,
    astuces,
  };

  const regleParSlug = new Map(
    Object.entries(CAS_DU_PROTOTYPE).map(([proto, slug]) => [slug, A.cases[proto]?.regle]),
  );
  const cases: CasVue[] = D.cas.map((c, i) => ({
    id: String(c.id),
    api: c,
    n: i + 1,
    title: c.titre,
    context: c.contexte,
    level: NIVEAUX[c.difficulte] ?? 1,
    domain: c.domaine?.libelle ?? '',
    minutes: c.dureeMinutes,
    rate: c.reussite,
    answers: c.reponses,
    useful: c.utiles,
    date: c.date,
    href: ROUTES.casBonReflexe(c.id, c.slug),
    regle: regleParSlug.get(c.slug),
  }));
  const caseById: Record<string, CasVue> = Object.fromEntries(cases.map((c) => [c.id, c]));
  const caseBySlug = new Map(cases.map((c) => [c.api.slug, c]));
  const casDuPrototype = (proto?: string) =>
    proto ? caseBySlug.get(CAS_DU_PROTOTYPE[proto] ?? '') : undefined;
  const casDuJour = casDuPrototype(A.caseOfDay) ?? cases[0];

  const outilsParNom = new Map(D.outils.map((o) => [o.nom, o]));
  const outilsParSlug = new Map(D.outils.map((o) => [o.slug, o]));
  const iconeDomaine = (nom: string) =>
    D.domaines.find((d) => d.libelle === nom)?.icone ?? 'compass';
  const logo = (nom: string, taille = 18) => {
    const o = outilsParNom.get(nom);
    return o?.logo
      ? `<img class="tool-logo${o.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(o.logo)}.svg" alt="" width="${taille}" height="${taille}" decoding="async">`
      : '';
  };
  // Nom de l'outil et du modèle, comme le prototype (fullModel) : « Claude Sonnet 4.5 », « GPT-5 ».
  const toolLabel = (tool: string, model?: string | null) =>
    !model ? tool : /^(GPT|DALL)/.test(model) || tool === 'Le Chat' ? model : `${tool} ${model}`;
  const kindOf = (s: SavoirVue) => RUB[s.kind];

  /* Progression : savoirs dans ce navigateur ; cas dans le compte (RG-72) ------------ */

  const CLE = 'vysora-apprendre-progres';
  const lirePlat = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  let progress: Progression = (() => {
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
  const enCompte = () => etats.peut('contribuer');
  // Les réponses du membre viennent de son compte (« Réussi », « À revoir »).
  if (enCompte()) {
    progress.cas = {};
    for (const c of cases)
      if (c.api.maReponse)
        progress.cas[c.id] = { choice: -1, right: c.api.maReponse.correcte, date: today };
  }
  const saveProgress = () => {
    try {
      const garde = enCompte() ? { ...progress, cas: {} } : progress;
      localStorage.setItem(CLE, JSON.stringify(garde));
    } catch {
      // Stockage indisponible : la progression dure le temps de la page.
    }
  };
  const lieu = () =>
    enCompte()
      ? 'Votre progression est enregistrée dans votre compte, sur tous vos appareils.'
      : `Votre progression est enregistrée dans ce navigateur. ${invitation('contribuer', 'la retrouver sur tous vos appareils')}`;
  const isAcquired = (id: string) => Boolean(progress.acquis[id]);
  function setAcquired(id: string, on: boolean) {
    if (on) progress.acquis[id] = progress.acquis[id] || today;
    else delete progress.acquis[id];
    saveProgress();
    renderProgressLink();
  }
  const revisedSince = (s: SavoirVue) =>
    isAcquired(s.id) && s.updated > (progress.acquis[s.id] ?? '');
  function rubCount(id: IdRubrique) {
    if (id === 'bon-reflexe')
      return { done: cases.filter((c) => progress.cas[c.id]?.right).length, total: cases.length };
    const list = LIST[id];
    return { done: list.filter((s) => isAcquired(s.id)).length, total: list.length };
  }
  function overall() {
    const done = actifs.filter((s) => isAcquired(s.id)).length + rubCount('bon-reflexe').done;
    return { done, total: actifs.length + cases.length };
  }
  const nextBase = () => bases.find((s) => !isAcquired(s.id)) ?? null;

  /* État et adresse ------------------------------------------------------------- */

  const state: {
    view: 'accueil' | 'rubrique' | 'savoir' | 'cas' | 'progression';
    rubrique: IdRubrique | null;
    id: string | null;
    stop: number | null;
    family: string;
    level: number;
    notionQuery: string;
  } = {
    view: 'accueil',
    rubrique: null,
    id: null,
    stop: null,
    family: 'all',
    level: 0,
    notionQuery: '',
  };

  function readURL() {
    const p = new URLSearchParams(location.search);
    const savoir = p.get('savoir');
    const rubrique = p.get('rubrique') as IdRubrique | null;
    state.rubrique = null;
    state.id = null;
    if (D!.casOuvert && caseById[String(D!.casOuvert)]) {
      state.view = 'cas';
      state.id = String(D!.casOuvert);
      state.rubrique = 'bon-reflexe';
    } else if (savoir && byId[savoir]) {
      state.view = 'savoir';
      state.id = savoir;
      state.rubrique = byId[savoir]!.kind;
    } else if (rubrique && RUB[rubrique]) {
      state.view = 'rubrique';
      state.rubrique = rubrique;
    } else if (p.get('vue') === 'progression') state.view = 'progression';
    else state.view = 'accueil';
  }

  /* Composants ------------------------------------------------------------------ */

  const kicker = (name: string, label: string) =>
    `<p class="kicker">${icon(name, '')}${t(label)}</p>`;
  const doneTag = (id: string) =>
    isAcquired(id) ? `<span class="ap-done">${icon('check')}Acquis</span>` : '';
  const levelTag = (level: number) =>
    `<span class="level" data-level="${level}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${t(LIBELLES_NIVEAU[level] ?? '')}</span>`;
  const toolRef = (tool: string, model: string | null | undefined, size = 18) =>
    `<span class="ap-tool">${logo(tool, size)}${t(toolLabel(tool, model))}</span>`;

  function segHTML(done: number, total: number, label: string) {
    return `<span class="ap-seg" role="img" aria-label="${esc(label)}">${Array.from({ length: total }, (_, i) => `<i${i < done ? ' class="on"' : ''}></i>`).join('')}</span>`;
  }
  function ringHTML(done: number, total: number) {
    const pct = total ? done / total : 0;
    const r = 9;
    const c = 2 * Math.PI * r;
    return `<svg class="ap-ring" viewBox="0 0 24 24" aria-hidden="true"><circle class="ap-ring-bg" cx="12" cy="12" r="${r}"/><circle class="ap-ring-fg" cx="12" cy="12" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"/></svg>`;
  }

  // Prompt avant/après : les passages annotés sont numérotés dans le prompt et dans la légende.
  function annotate(text: string, notes: [string, string][]) {
    let parts: { s: string; n?: number; label?: string }[] = [{ s: text }];
    notes.forEach(([fragment, label], n) => {
      parts = parts.flatMap((part) => {
        if (part.n !== undefined) return [part];
        const at = part.s.indexOf(fragment);
        if (at < 0) return [part];
        return [
          { s: part.s.slice(0, at) },
          { s: fragment, n, label },
          { s: part.s.slice(at + fragment.length) },
        ].filter((x) => x.s);
      });
    });
    return parts
      .map((p) =>
        p.n === undefined
          ? t(p.s)
          : `<mark class="ap-mark" data-n="${p.n + 1}">${t(p.s)}<span class="sr-only"> (${t(p.label)})</span></mark>`,
      )
      .join('');
  }
  function promptHTML(s: SavoirVue) {
    const p = s.prompt!;
    return `<figure class="ap-ba" aria-label="Prompt avant et après">
      <div class="ap-ba-side ap-ba-before"><p class="ap-ba-label">Avant</p><p class="ap-ba-text">${t(p.before)}</p></div>
      <span class="ap-ba-arrow" aria-hidden="true">${icon('arrow')}</span>
      <div class="ap-ba-side ap-ba-after"><p class="ap-ba-label">Après<button class="ap-copy" type="button" data-ap-copy="${esc(s.id)}">${icon('copy')}<span>Copier</span></button></p><p class="ap-ba-text">${annotate(p.after, p.notes)}</p></div>
      <figcaption><ol class="ap-ba-notes">${p.notes.map(([, label], i) => `<li><span class="ap-ba-n" aria-hidden="true">${i + 1}</span>${t(label)}</li>`).join('')}</ol></figcaption>
    </figure>`;
  }
  function bodyHTML(s: SavoirVue) {
    return (s.body ?? [])
      .map(
        (block) => `<section class="ap-prose">
      ${block.h ? `<h2>${t(block.h)}</h2>` : ''}
      ${(block.p ?? []).map((text) => `<p>${t(text)}</p>`).join('')}
      ${block.steps ? `<ol class="ap-steps">${block.steps.map((text) => `<li>${t(text)}</li>`).join('')}</ol>` : ''}
    </section>`,
      )
      .join('');
  }

  /* Questions et cas : choix au clavier ------------------------------------------ */

  function choicesHTML(name: string, choices: string[]) {
    return `<div class="ap-choices">${choices.map((choice, i) => `<label class="ap-choice"><input type="radio" name="${name}" value="${i}"><kbd aria-hidden="true">${LETTRES[i]}</kbd><span class="ap-choice-text">${t(choice)}</span><span class="ap-choice-mark" aria-hidden="true"></span></label>`).join('')}</div>`;
  }
  function quizHTML(key: string, legend: string, choices: string[]) {
    const keys = choices.map((_, i) => LETTRES[i]);
    return `<form class="ap-quiz" data-ap-quiz="${esc(key)}" novalidate>
      <fieldset><legend>${t(legend)}</legend>${choicesHTML(`ap-q-${key.replace(/[^a-z0-9-]/gi, '-')}`, choices)}</fieldset>
      <p class="ap-quiz-error" role="alert" data-ap-error hidden>${icon('alert')}Choisissez une réponse avant de valider.</p>
      <div class="ap-quiz-actions"><button class="btn btn-primary btn-sm" type="submit">Valider ma réponse</button><span class="ap-keys">Touches ${keys.slice(0, -1).join(', ')} ou ${keys.at(-1)}, puis Entrée</span></div>
    </form>`;
  }
  function checkHTML(s: SavoirVue) {
    if (!s.check) return '';
    return `<section class="ap-block ap-test" aria-labelledby="ap-test-title">
      <h2 id="ap-test-title" class="ap-block-title">Testez-vous</h2>
      <div class="ap-test-body" data-ap-test="check:${esc(s.id)}">${quizHTML(`check:${s.id}`, s.check.q, s.check.choices)}<div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div></div>
    </section>`;
  }

  function transcriptHTML(c: CasVue) {
    const d = c.detail!;
    const tool = d.outil?.nom ?? 'L’IA';
    const model = d.modele?.nomCourt ?? d.modeleNonReference;
    return `<div class="ap-transcript">
      <div class="ap-turn ap-turn-you"><span class="ap-turn-avatar" aria-hidden="true">${icon('user')}</span><p class="ap-turn-who">Votre demande</p><p class="ap-turn-text">${t(d.demandeIa || c.context)}</p></div>
      <div class="ap-turn ap-turn-ai"><span class="ap-turn-avatar" aria-hidden="true">${logo(tool, 18)}</span><p class="ap-turn-who">Réponse de ${t(toolLabel(tool, model))}</p><p class="ap-turn-text">${t(`« ${d.reponseIa} »`)}</p></div>
    </div>`;
  }
  /** Lecteur d'un cas : le cas complet est chargé à l'affichage (ses options, sa correction). */
  function casePlayerHTML(c: CasVue, { compact = false } = {}) {
    if (!c.detail)
      return `<div class="ap-case${compact ? ' is-compact' : ''}" data-ap-case-load="${esc(c.id)}"${compact ? ' data-compact' : ''}>${compact ? `<p class="ap-case-context">${t(c.context)}</p>` : ''}</div>`;
    return `<div class="ap-case${compact ? ' is-compact' : ''}" data-ap-test="cas:${esc(c.id)}">
      ${compact ? `<p class="ap-case-context">${t(c.context)}</p>` : ''}
      ${transcriptHTML(c)}
      ${quizHTML(
        `cas:${c.id}`,
        c.detail.question || 'Que faites-vous ?',
        c.detail.options.map((o) => o.libelle),
      )}
      <div class="ap-feedback" tabindex="-1" data-ap-feedback hidden></div>
    </div>`;
  }
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
      if (right && c.regle) progress.acquis[c.regle] = progress.acquis[c.regle] || today;
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
    liste.innerHTML = A.rubriques
      .map((r) => {
        const count = r.id === 'bon-reflexe' ? cases.length : LIST[r.id].length;
        const current = state.rubrique === r.id;
        return `<li><a href="${ROUTES.apprendre}?rubrique=${r.id}" data-ap-nav${current ? ` aria-current="${state.view === 'rubrique' ? 'page' : 'true'}"` : ''}>${t(r.label)}<span class="ap-tab-count">${count}</span></a></li>`;
      })
      .join('');
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
    const { done, total } = overall();
    const link = $('[data-ap-progress-link]');
    if (!link) return;
    link.innerHTML = `${ringHTML(done, total)}<span class="ap-progress-text"><span class="ap-progress-label">Ma progression</span><span class="ap-progress-num">${done}<span class="sr-only"> savoirs acquis</span> / ${total}</span></span>`;
    if (state.view === 'progression') link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

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
    const sel = state.stop ?? Math.max(0, bases.indexOf(nextBase() ?? bases[0]!));
    state.stop = sel;
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
    const record = c ? progress.cas[c.id] : progress.checks[s.id];
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
          today
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
    const mine = new Set(
      [...lireMesOutils(D!.outils.map((o) => o.slug))].map(
        (slug) => outilsParSlug.get(slug)?.nom ?? '',
      ),
    );
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
    boutonMesOutils(
      [...lireMesOutils(D!.outils.map((o) => o.slug))],
      new Map(D!.outils.map((o) => [o.slug, o])),
      true,
    );
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
        String(D!.chiffres.sujets),
        'Les questions du forum',
        'Une question qui revient chaque semaine signale un savoir qui manque ou qui n’est plus clair.',
      ],
      [
        String(D!.chiffres.outils),
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
  const renderAccueil = () =>
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
    const tokens = decouper(state.notionQuery);
    const list = notions.filter(
      (s) =>
        !tokens.length ||
        tokens.every((variants) => contient(` ${plier(`${s.title} ${s.short}`)}`, variants)),
    );
    if (!list.length)
      return `<p class="ap-empty">${t(`Aucune notion ne correspond à « ${state.notionQuery} ».`)} <button class="link-btn" type="button" data-ap-notion-clear>Afficher toutes les notions</button></p>`;
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
        <label class="ap-filter">${icon('search')}<span class="sr-only">Filtrer les notions</span><input type="search" placeholder="Filtrer les notions" value="${esc(state.notionQuery)}" autocomplete="off" data-ap-notion-filter></label>
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
        state.family === 'all' || (state.family === 'mine' ? g.mine : g.family === state.family),
    );
    const chip = (id: string, label: string, count: number) =>
      `<button class="ap-chip" type="button" aria-pressed="${state.family === id}" data-ap-family="${id}">${t(label)}<span>${count}</span></button>`;
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
    const record = progress.cas[c.id];
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
    const list = cases.filter((c) => !state.level || c.level === state.level);
    return `${rubHeadHTML(RUB['bon-reflexe'])}<div class="container ap-rub">
      <div class="ap-chips" role="group" aria-label="Filtrer par niveau">${levels.map((l) => `<button class="ap-chip" type="button" aria-pressed="${state.level === l}" data-ap-level="${l}">${l ? t(LIBELLES_NIVEAU[l]) : 'Tous les niveaux'}<span>${l ? cases.filter((c) => c.level === l).length : cases.length}</span></button>`).join('')}</div>
      ${list.length ? `<ul class="ap-caselist">${list.map(caseRowHTML).join('')}</ul>` : `<p class="ap-empty">Aucun cas pour ce niveau pour l’instant.</p>`}
    </div>`;
  }

  /* Savoir ---------------------------------------------------------------------- */

  const crumbsHTML = (r: (typeof A.rubriques)[number], current: string) =>
    `<nav class="ap-crumbs" aria-label="Fil d’Ariane"><ol><li><a href="${ROUTES.apprendre}">Apprendre</a></li><li><a href="${ROUTES.apprendre}?rubrique=${r.id}">${t(r.label)}</a></li><li><span aria-current="page">${t(current)}</span></li></ol></nav>`;
  function acquireHTML(s: SavoirVue) {
    const on = isAcquired(s.id);
    return `<button class="ap-acquire" type="button" aria-pressed="${on}" data-ap-acquire="${esc(s.id)}"><span class="ap-acquire-box" aria-hidden="true">${icon('check')}</span><span class="ap-acquire-text">${on ? t(`Acquis le ${shortDate(progress.acquis[s.id] ?? today)}`) : 'Marquer comme acquis'}</span></button>`;
  }
  function syncAcquireButton() {
    const button = $('[data-ap-acquire]');
    const s = button ? byId[button.dataset.apAcquire ?? ''] : undefined;
    if (button && s) button.outerHTML = acquireHTML(s);
  }
  function linksHTML(s: SavoirVue) {
    const items: string[] = [];
    const l = s.links ?? {};
    const g = l.guide ? D!.guides.find((x) => x.slug === l.guide) : undefined;
    if (g)
      items.push(
        `<li><a href="${ROUTES.explorer}?guide=${encodeURIComponent(g.slug)}">${icon('compass')}<span><small>Guide dans Explorer</small>${t(g.titreCourt || g.titre)}</span></a></li>`,
      );
    const domaine = l.domain ? D!.domaines.find((d) => d.libelle === l.domain) : undefined;
    if (domaine)
      items.push(
        `<li><a href="${ROUTES.explorer}?domaine=${encodeURIComponent(domaine.slug)}">${icon(domaine.icone ?? 'compass')}<span><small>Domaine</small>${t(domaine.libelle)}</span></a></li>`,
      );
    if (l.publish)
      items.push(
        `<li><a href="${ROUTES.publier}">${icon('plus')}<span><small>Sur Vysora</small>Publier une création et ses moments clés</span></a></li>`,
      );
    items.push(
      `<li><a href="${ROUTES.nouveauSujet}">${icon('help')}<span><small>Une question sur ce sujet ?</small>La poser au forum</span></a></li>`,
    );
    return `<section class="ap-aside-block" aria-labelledby="ap-more-title"><h2 id="ap-more-title">Pour aller plus loin</h2><ul class="ap-links">${items.join('')}</ul></section>`;
  }
  function relatedHTML(s: SavoirVue) {
    const list = (s.related ?? []).map((id) => byId[id]).filter((r): r is SavoirVue => Boolean(r));
    if (!list.length) return '';
    return `<section class="ap-aside-block" aria-labelledby="ap-rel-title"><h2 id="ap-rel-title">À lire aussi</h2><ul class="ap-related">${list.map((r) => `<li><a href="${r.href}"><span class="ap-related-kind">${icon(kindOf(r).icon)}${t(r.kindLabel)}</span>${t(r.title)}</a></li>`).join('')}</ul></section>`;
  }
  const historyHTML = (s: SavoirVue) =>
    `<section class="ap-aside-block" aria-labelledby="ap-hist-title"><h2 id="ap-hist-title">Historique</h2><ol class="ap-history">${s.history
      .toReversed()
      .map(
        ([date, text]) =>
          `<li><time datetime="${date}">${t(fullDate(date))}</time><span>${t(text)}</span></li>`,
      )
      .join('')}</ol></section>`;
  function pagerHTML(s: SavoirVue) {
    const list = s.replacedBy ? [] : LIST[s.kind];
    const i = list.indexOf(s);
    if (i < 0) return '';
    const prev = list[i - 1];
    const next = list[i + 1];
    const unit = kindOf(s).one.toLowerCase();
    return `<nav class="ap-pager" aria-label="${t(`${kindOf(s).label} voisines`)}">
      ${prev ? `<a class="ap-pager-prev" href="${prev.href}" rel="prev"><small>${icon('chevron-left')}Précédente</small><span>${t(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="ap-pager-next" href="${next.href}" rel="next"><small>${t(`${unit.charAt(0).toUpperCase()}${unit.slice(1)} suivante`)}${icon('chevron-right')}</small><span>${t(next.title)}</span></a>` : `<a class="ap-pager-next" href="${ROUTES.apprendre}?rubrique=${s.kind}"><small>${t(`Toutes les ${kindOf(s).label.toLowerCase()}`)}${icon('chevron-right')}</small><span>${t(`${i + 1} sur ${list.length}, vous êtes à la fin`)}</span></a>`}
    </nav>`;
  }
  const byline = (texte: string) =>
    `<section class="ap-aside-block ap-byline"><img src="/assets/logos/vysora%20logo%20bleu.png" alt="" width="36" height="36"><p><b>Rédigé par l’équipe Vysora</b><span>${t(texte)}</span></p></section>`;
  function renderSavoir() {
    const s = byId[state.id ?? '']!;
    const r = kindOf(s);
    const c = casDuPrototype(s.situation);
    const metaBits = [
      `${icon(r.icon)}${t(r.one)}`,
      s.kind === 'bases' ? t(`${s.order} sur ${bases.length}`) : '',
      s.theme ? t(THEMES[s.theme]?.label ?? '') : '',
      `${s.minutes} min de lecture`,
    ].filter(Boolean);
    const successor = s.replacedBy ? byId[s.replacedBy] : undefined;
    const toolLine =
      s.kind === 'astuces'
        ? `<p class="ap-verified">${logo(s.tool ?? '', 22)}<span>${t(toolLabel(s.tool ?? '', s.model))}</span><span class="ap-verified-date">${successor ? t(`Valable jusqu’à la version ${s.model}`) : `${icon('check-circle')}${t(`Vérifiée le ${fullDate(s.verified ?? s.updated)}`)}`}</span></p>`
        : '';
    const tools = (s.tools ?? []).filter((name) => outilsParNom.has(name));
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
            ${revisedSince(s) ? `<p class="ap-notice is-info">${icon('replay')}<span>${t(`Revu le ${fullDate(s.updated)}, après votre lecture du ${fullDate(progress.acquis[s.id] ?? today)}.`)} <a href="#ap-hist-title">Voir ce qui a changé</a></span></p>` : ''}
          </header>
          ${s.prompt ? promptHTML(s) : ''}
          ${bodyHTML(s)}
          ${tools.length ? `<p class="ap-tools-line"><span>Outils concernés :</span>${tools.map((name) => toolRef(name, '', 18)).join('')}</p>` : ''}
          ${
            c
              ? `<section class="ap-block ap-test" aria-labelledby="ap-test-title">
              <h2 id="ap-test-title" class="ap-block-title">Testez-vous</h2>
              <p class="ap-block-intro">${icon(RUB['bon-reflexe'].icon)}Cas Bon réflexe · <a href="${c.href}">${t(c.title)}</a></p>
              <p class="ap-case-context">${t(c.context)}</p>
              ${casePlayerHTML(c)}
            </section>`
              : checkHTML(s)
          }
          <footer class="ap-article-foot">${successor ? '' : acquireHTML(s)}${pagerHTML(s)}</footer>
        </article>
        <aside class="ap-aside" aria-label="À propos de ce savoir">
          ${byline(`Revu le ${fullDate(s.updated)}`)}
          ${historyHTML(s)}
          ${linksHTML(s)}
          ${relatedHTML(s)}
        </aside>
      </div>
    </div>`;
  }

  /* Cas Bon réflexe ---------------------------------------------------------------- */

  function renderCas() {
    const c = caseById[state.id ?? '']!;
    const rule = c.regle ? byId[c.regle] : undefined;
    const i = cases.indexOf(c);
    const next = cases[(i + 1) % cases.length]!;
    const outil = c.api.outil?.nom;
    return `<div class="container ap-page">
      ${crumbsHTML(RUB['bon-reflexe'], c.title)}
      <div class="ap-page-grid">
        <article class="ap-article ap-case-page" aria-labelledby="ap-h1">
          <header class="ap-article-head">
            <p class="ap-meta">${levelTag(c.level)}${c.domain ? `<span aria-hidden="true">·</span><span>${icon(iconeDomaine(c.domain))}${t(c.domain)}</span>` : ''}${c.minutes ? `<span aria-hidden="true">·</span>${c.minutes} min` : ''}<span aria-hidden="true">·</span>${t(`Cas ${c.n} sur ${cases.length}`)}</p>
            <h1 id="ap-h1" tabindex="-1" data-ap-h1>${t(c.title)}</h1>
            <p class="ap-essentiel">${t(c.context)}</p>
          </header>
          ${casePlayerHTML(c)}
          <footer class="ap-article-foot ap-case-foot">
            <a class="link-arrow" href="${ROUTES.apprendre}?rubrique=bon-reflexe">${icon('chevron-left')}Tous les cas</a>
            ${next !== c ? `<a class="btn btn-secondary btn-sm" href="${next.href}">Cas suivant : ${t(next.title)}${icon('arrow')}</a>` : ''}
          </footer>
        </article>
        <aside class="ap-aside" aria-label="À propos de ce cas">
          ${rule ? `<section class="ap-aside-block ap-aside-rule" aria-labelledby="ap-rule-title"><h2 id="ap-rule-title">La règle à retenir</h2><p class="ap-aside-rule-title"><a href="${rule.href}">${t(rule.title)}</a></p><p>${t(rule.short)}</p></section>` : ''}
          <section class="ap-aside-block" aria-labelledby="ap-stats-title"><h2 id="ap-stats-title">Ce cas en chiffres</h2>
            <dl class="ap-stats"><div><dt>Réponses</dt><dd>${fmt(c.answers)}</dd></div><div><dt>Bonnes réponses</dt><dd>${c.rate} %</dd></div><div><dt>Votes « Utile »</dt><dd>${fmt(c.useful)}</dd></div></dl>
          </section>
          <section class="ap-aside-block ap-byline">${c.api.auteur.avatar ? `<img class="avatar" src="${esc(c.api.auteur.avatar)}" alt="" width="36" height="36">` : `<img src="/assets/logos/vysora%20logo%20bleu.png" alt="" width="36" height="36">`}<p><b>${t(`Proposé par ${c.api.auteur.nom}`)}</b><span>${t(outil ? `D’après une réponse de ${toolLabel(outil, c.api.modele)}, validé le ${fullDate(c.date)}` : `Validé le ${fullDate(c.date)}`)}</span></p></section>
          ${rule ? linksHTML(rule) : ''}
        </aside>
      </div>
    </div>`;
  }

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
  const RUB_RENDER: Record<IdRubrique, () => string> = {
    bases: rubBases,
    notions: rubNotions,
    regles: rubRegles,
    astuces: rubAstuces,
    'bon-reflexe': rubCas,
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

  function show({ focus = true, hash = '' } = {}) {
    const zone = vue!;
    zone.dataset.apScreen = state.view;
    if (state.view !== 'accueil') state.stop = null;
    zone.innerHTML =
      state.view === 'accueil'
        ? renderAccueil()
        : state.view === 'rubrique'
          ? RUB_RENDER[state.rubrique!]()
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
    if (animations.niveau() !== 'none') {
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
    state.stop = Math.max(0, Math.min(bases.length - 1, i));
    $$<HTMLButtonElement>('[data-ap-stop]', frise).forEach((button, n) => {
      const on = n === state.stop;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    const panel = $('[data-ap-frise-panel]', frise);
    if (!panel) return;
    panel.setAttribute('aria-labelledby', `ap-stop-${state.stop}`);
    panel.innerHTML = frisePanelHTML(state.stop);
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
      return void selectStop((state.stop ?? 0) + 1, { focus: true });
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
      state.family = family.dataset.apFamily ?? 'all';
      const y = window.scrollY;
      show({ focus: false });
      window.scrollTo({ top: y });
      $<HTMLButtonElement>(`[data-ap-family="${state.family}"]`)?.focus();
      return;
    }
    const level = target.closest<HTMLElement>('[data-ap-level]');
    if (level) {
      state.level = Number(level.dataset.apLevel);
      const y = window.scrollY;
      show({ focus: false });
      window.scrollTo({ top: y });
      $<HTMLButtonElement>(`[data-ap-level="${state.level}"]`)?.focus();
      return;
    }
    if (target.closest('[data-ap-notion-clear]')) {
      state.notionQuery = '';
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
      state.notionQuery = cible.value;
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
  show({ focus: false, hash: location.hash });
}
