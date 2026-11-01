/* Apprendre (APP-02, APP-03) : modèle de la page (savoirs, rubriques, cas, outils) et rendu d'une page
   de savoir et d'une page de cas, partagés par le serveur (référencement : la page arrive rendue) et
   par le navigateur (scripts/apprendre.ts, qui reprend la main sur le même balisage). Fonctions pures :
   ni document ni stockage. Porté de prototype/apprendre.js. */

import type { CasApi, CasResumeApi, CorrectionCasApi } from '@vysora/shared';
import { ROUTES } from '../navigation';
import { esc, fmt, t, typo } from '../texte';
import { APPRENDRE as A } from './contenus';
import type { DonneesPageApprendre, IdRubrique, Savoir } from './types';

/** Typographie du texte d'un balisage rendu par le serveur, comme corrigerTypographie le fait dans le
    navigateur après chaque rendu (« 3 min » insécable) : seul le texte entre les balises change. Les
    pages d'Apprendre ne portent ni code ni texte préformaté. */
export const typographier = (html: string): string =>
  html.replace(/>([^<]+)</g, (_, texte: string) => `>${typo(texte)}<`);

/** Icône du sprite, comme scripts/commun/outils (même balisage des deux côtés). */
export const icon = (nom: string, classe = 'icon-sm') =>
  `<svg class="icon ${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;

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
export const LIBELLES_NIVEAU: Record<number, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
};
export const LETTRES = 'ABCDE';
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

export type SavoirVue = Savoir & { href: string; kindLabel: string };

export interface CasVue {
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
  /** Après chargement du cas complet (GET /api/v1/cas/:id, ou posé par le serveur). */
  detail?: CasApi;
  correction?: CorrectionCasApi;
}

export interface Progression {
  acquis: Record<string, string>;
  cas: Record<string, { choice: number; right: boolean; date: string }>;
  checks: Record<string, { choice: number; right: boolean; date: string }>;
}

export const progressionVide = (): Progression => ({ acquis: {}, cas: {}, checks: {} });

/* Modèle -------------------------------------------------------------------------- */

export function creerModele(D: DonneesPageApprendre) {
  const dateLabel = (iso: string, annee = true) => {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}${annee ? ` ${d.getUTCFullYear()}` : ''}`;
  };
  const shortDate = (iso: string) => dateLabel(iso, false);
  const fullDate = (iso: string) => dateLabel(iso, true);

  const RUB = Object.fromEntries(A.rubriques.map((r) => [r.id, r])) as Record<
    IdRubrique,
    (typeof A.rubriques)[number]
  >;
  const THEMES = Object.fromEntries(A.themes.map((th) => [th.id, th]));
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
  // Cas complet posé par le serveur (page /bon-reflexe/[id]-[slug]) : rendu sans attendre l'API.
  if (D.casComplet) {
    const ouvert = caseById[String(D.casComplet.id)];
    if (ouvert) {
      ouvert.detail = D.casComplet;
      if (D.casComplet.correction) ouvert.correction = D.casComplet.correction;
    }
  }

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

  return {
    D,
    shortDate,
    fullDate,
    RUB,
    THEMES,
    savoirs,
    byId,
    bases,
    notions,
    regles,
    astuces,
    remplacees,
    actifs,
    LIST,
    cases,
    caseById,
    casDuPrototype,
    casDuJour,
    outilsParNom,
    outilsParSlug,
    iconeDomaine,
    logo,
    toolLabel,
    kindOf,
  };
}
export type ModeleApprendre = ReturnType<typeof creerModele>;

/** Vue demandée par l'adresse : un cas (/bon-reflexe/[id]-[slug]), un savoir, une rubrique, la
    progression, sinon la vue d'ensemble. */
export type VueApprendre =
  | { view: 'cas'; id: string; rubrique: 'bon-reflexe' }
  | { view: 'savoir'; id: string; rubrique: IdRubrique }
  | { view: 'rubrique'; id: null; rubrique: IdRubrique }
  | { view: 'progression' | 'accueil'; id: null; rubrique: null };

export function lireVue(m: ModeleApprendre, parametres: URLSearchParams): VueApprendre {
  const savoir = parametres.get('savoir');
  const rubrique = parametres.get('rubrique') as IdRubrique | null;
  if (m.D.casOuvert && m.caseById[String(m.D.casOuvert)])
    return { view: 'cas', id: String(m.D.casOuvert), rubrique: 'bon-reflexe' };
  if (savoir && m.byId[savoir])
    return { view: 'savoir', id: savoir, rubrique: m.byId[savoir].kind };
  if (rubrique && m.RUB[rubrique]) return { view: 'rubrique', id: null, rubrique };
  if (parametres.get('vue') === 'progression')
    return { view: 'progression', id: null, rubrique: null };
  return { view: 'accueil', id: null, rubrique: null };
}

/** Titre, description et adresse canonique d'une page d'Apprendre, d'après son adresse (le serveur
    les pose avant que le script ne prenne la main ; le script tient le titre ensuite). */
export function entetePage(parametres: URLSearchParams): {
  titre: string;
  description: string;
  canonique: string;
  nonIndexee: boolean;
} {
  const savoir = A.savoirs.find((s) => s.id === parametres.get('savoir'));
  if (savoir)
    return {
      titre: `${savoir.title} · Apprendre`,
      description: savoir.short,
      canonique: `${ROUTES.apprendre}?savoir=${encodeURIComponent(savoir.id)}`,
      nonIndexee: false,
    };
  const rubrique = A.rubriques.find((r) => r.id === parametres.get('rubrique'));
  if (rubrique)
    return {
      titre: `${rubrique.label} · Apprendre`,
      description: rubrique.lead,
      canonique: `${ROUTES.apprendre}?rubrique=${rubrique.id}`,
      nonIndexee: false,
    };
  if (parametres.get('vue') === 'progression')
    return {
      titre: 'Votre progression · Apprendre',
      description: 'Vos savoirs acquis, vos réponses aux questions et aux cas Bon réflexe.',
      canonique: `${ROUTES.apprendre}?vue=progression`,
      nonIndexee: true,
    };
  return {
    titre: 'Apprendre',
    description:
      'Les bases pour démarrer, les notions, les règles qui évitent les erreurs coûteuses, les astuces de chaque outil et les cas Bon réflexe.',
    canonique: ROUTES.apprendre,
    nonIndexee: false,
  };
}

/** Progression connue du serveur : celle du compte d'un membre (savoirs, réponses aux cas) ; vide
    pour un visiteur, dont la progression est dans son navigateur. */
export function progressionDuServeur(m: ModeleApprendre): Progression {
  const p = progressionVide();
  if (!m.D.progression) return p;
  p.acquis = { ...m.D.progression.acquis };
  for (const [id, v] of Object.entries(m.D.progression.verifications))
    p.checks[id] = { choice: v.choix, right: v.correcte, date: v.date };
  for (const c of m.cases)
    if (c.api.maReponse)
      p.cas[c.id] = { choice: -1, right: c.api.maReponse.correcte, date: m.D.aujourdhui };
  return p;
}

/* Pages d'un savoir et d'un cas ----------------------------------------------------- */

export function creerPages(
  m: ModeleApprendre,
  etat: { progress: () => Progression; today: string },
) {
  const { RUB, THEMES, byId, bases, LIST, cases, D, logo, toolLabel, kindOf, fullDate } = m;
  const { shortDate, iconeDomaine, outilsParNom, casDuPrototype } = m;
  const today = etat.today;

  const isAcquired = (id: string) => Boolean(etat.progress().acquis[id]);
  const revisedSince = (s: SavoirVue) =>
    isAcquired(s.id) && s.updated > (etat.progress().acquis[s.id] ?? '');

  const levelTag = (level: number) =>
    `<span class="level" data-level="${level}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${t(LIBELLES_NIVEAU[level] ?? '')}</span>`;
  const toolRef = (tool: string, model: string | null | undefined, size = 18) =>
    `<span class="ap-tool">${logo(tool, size)}${t(toolLabel(tool, model))}</span>`;

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

  /* Savoir ---------------------------------------------------------------------- */

  const crumbsHTML = (r: (typeof A.rubriques)[number], current: string) =>
    `<nav class="ap-crumbs" aria-label="Fil d’Ariane"><ol><li><a href="${ROUTES.apprendre}">Apprendre</a></li><li><a href="${ROUTES.apprendre}?rubrique=${r.id}">${t(r.label)}</a></li><li><span aria-current="page">${t(current)}</span></li></ol></nav>`;
  function acquireHTML(s: SavoirVue) {
    const on = isAcquired(s.id);
    return `<button class="ap-acquire" type="button" aria-pressed="${on}" data-ap-acquire="${esc(s.id)}"><span class="ap-acquire-box" aria-hidden="true">${icon('check')}</span><span class="ap-acquire-text">${on ? t(`Acquis le ${shortDate(etat.progress().acquis[s.id] ?? today)}`) : 'Marquer comme acquis'}</span></button>`;
  }
  function linksHTML(s: SavoirVue) {
    const items: string[] = [];
    const l = s.links ?? {};
    const g = l.guide ? D.guides.find((x) => x.slug === l.guide) : undefined;
    if (g)
      items.push(
        `<li><a href="${ROUTES.explorer}?guide=${encodeURIComponent(g.slug)}">${icon('compass')}<span><small>Guide dans Explorer</small>${t(g.titreCourt || g.titre)}</span></a></li>`,
      );
    const domaine = l.domain ? D.domaines.find((d) => d.libelle === l.domain) : undefined;
    if (domaine)
      items.push(
        `<li><a href="${esc(ROUTES.domaine(domaine.slug))}">${icon(domaine.icone ?? 'compass')}<span><small>Domaine</small>${t(domaine.libelle)}</span></a></li>`,
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

  function savoirHTML(s: SavoirVue) {
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
            ${revisedSince(s) ? `<p class="ap-notice is-info">${icon('replay')}<span>${t(`Revu le ${fullDate(s.updated)}, après votre lecture du ${fullDate(etat.progress().acquis[s.id] ?? today)}.`)} <a href="#ap-hist-title">Voir ce qui a changé</a></span></p>` : ''}
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

  function casHTML(c: CasVue) {
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

  return {
    isAcquired,
    revisedSince,
    levelTag,
    toolRef,
    quizHTML,
    checkHTML,
    casePlayerHTML,
    crumbsHTML,
    acquireHTML,
    savoirHTML,
    casHTML,
  };
}
export type Pages = ReturnType<typeof creerPages>;
