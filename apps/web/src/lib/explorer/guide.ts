import type {
  CasGuideApi,
  CorrectionCasApi,
  DifficulteCas,
  GuideApi,
  OutilResumeApi,
  ParcoursGuideApi,
  PiegeGuideApi,
  PropositionPiegeApi,
  TypeSujet,
} from '@vysora/shared';
import { MOMENTS } from '../creations';
import { rendreMarkdownEnLigne } from '../markdown';
import { ROUTES } from '../navigation';
import {
  avatar,
  esc,
  etiquetteType,
  fmt,
  icone,
  image,
  jourRelatif,
  lecteurEcran,
  ligneOutils,
  logo,
  part,
  pluriel,
  prenom,
  surtitre,
  t,
} from './elements';
import { boutonMesOutils } from './index-guides';

/* Guide d'un objectif (prototype explorer.js : renderGuide et les sections Méthode, Pièges, Outils,
   Parcours, S'entraîner, À compléter ; comparaison des parcours). Réglages retenus du panneau Tweaks :
   méthode en chemin, méthode d'abord. */

export type CleSection = 'methode' | 'pieges' | 'outils' | 'parcours' | 'pratique' | 'manque';
export const ORDRE_SECTIONS: CleSection[] = [
  'methode',
  'pieges',
  'outils',
  'parcours',
  'pratique',
  'manque',
];
const SECTIONS: Record<CleSection, { libelle: string; icone: string }> = {
  methode: { libelle: 'Méthode', icone: 'route' },
  pieges: { libelle: 'Pièges', icone: 'moment' },
  outils: { libelle: 'Outils', icone: 'wrench' },
  parcours: { libelle: 'Parcours', icone: 'layers' },
  pratique: { libelle: 'S’entraîner', icone: 'bulb' },
  manque: { libelle: 'À compléter', icone: 'flag' },
};

export type TriParcours = 'reproduits' | 'utiles' | 'recents';
export const TRIS_PARCOURS: TriParcours[] = ['reproduits', 'utiles', 'recents'];

/** Réponse à un cas pratique : choisie, puis verrouillée avec sa correction (F-62). */
export interface EtatCas {
  choix: number | null;
  verrouille: boolean;
  correction: CorrectionCasApi | null;
  /** RG-72 : gardée dans la progression du membre. */
  enregistree: boolean;
}

/** Ce que la vue d'un guide montre selon la personne et ses actions. */
export interface EtatGuide {
  guide: GuideApi;
  maintenant: Date;
  /** Outils de « Mes outils » (adresses), et le référentiel pour les présenter. */
  mesOutils: Set<string>;
  outils: Map<string, OutilResumeApi>;
  /** Éléments cochés de la liste de contrôle : « e12 » (étape), « p3 » (piège). */
  coches: Set<string>;
  membre: boolean;
  propositions: PropositionPiegeApi[];
  triParcours: TriParcours;
  comparaison: Set<number>;
  casIndex: number;
  cas: Map<number, EtatCas>;
  /** Invitation à se connecter, sous la correction d'un visiteur. */
  invitation: string;
}

/** Réponse d'un cas telle que l'API la donne : celle du membre, ou rien. */
export function etatInitialCas(c: CasGuideApi): EtatCas {
  const reponse = c.moi?.reponse;
  return reponse
    ? { choix: reponse.optionId, verrouille: true, correction: c.correction, enregistree: true }
    : { choix: null, verrouille: false, correction: null, enregistree: false };
}

const adresseParcours = (c: Pick<ParcoursGuideApi, 'id' | 'slug'>) => ROUTES.creation(c.id, c.slug);
const parcoursDe = (g: GuideApi, ids: number[]) =>
  ids.flatMap((id) => g.parcours.find((c) => c.id === id) ?? []);

/* En-tête ------------------------------------------------------------------- */

function essentiel(g: GuideApi): string {
  const [premiere] = g.methode;
  const [premierPiege] = g.pieges;
  const [eprouve] = g.modeles;
  const blocs = [
    premiere
      ? `<div><p class="ex-ess-label">${icone('route')}Par où commencer</p><p class="ex-ess-value">${t(premiere.titre)}</p><p class="ex-ess-note">${t(premiere.conseil)}</p></div>`
      : '',
    premierPiege
      ? `<div><p class="ex-ess-label">${icone('moment')}${t('Le piège n° 1')}</p><p class="ex-ess-value">${t(premierPiege.titre)}</p><p class="ex-ess-note">${t(premierPiege.solution)}</p></div>`
      : '',
    eprouve
      ? `<div><p class="ex-ess-label">${icone('check-circle')}Le plus éprouvé</p><p class="ex-ess-value"><span class="ex-model">${logo(eprouve.outil, 20)}${t(eprouve.cle)}</span></p><p class="ex-ess-note">${t(
          eprouve.reproduit.length
            ? `Reproduit avec succès dans ${pluriel(eprouve.reproduit.length, 'parcours', 'parcours')} de ce guide.`
            : `Employé dans ${pluriel(eprouve.employe.length, 'parcours', 'parcours')} de ce guide.`,
        )}</p></div>`
      : '',
  ].join('');
  return blocs
    ? `<section class="ex-essentials" aria-labelledby="ex-essentials-title"><h2 id="ex-essentials-title" class="ex-ess-title">L’essentiel</h2><div class="ex-ess">${blocs}</div></section>`
    : '';
}

function auteursDuGuide(g: GuideApi): string {
  const noms = g.guide.auteurs.map((a) => prenom(a.nom));
  if (noms.length > 2)
    return `${noms.slice(0, 2).join(', ')} et ${pluriel(noms.length - 2, 'autre membre', 'autres membres')}`;
  return noms.join(' et ');
}

function entete(e: EtatGuide): string {
  const g = e.guide;
  const r = g.guide;
  const chiffres: [string, string][] = [
    [fmt(r.parcours), r.parcours > 1 ? 'parcours documentés' : 'parcours documenté'],
    [
      fmt(r.reproductions),
      r.reproductions > 1 ? 'reproductions déclarées' : 'reproduction déclarée',
    ],
    ...(r.tauxReussite !== null
      ? [[`${r.tauxReussite} %`, 'de reproductions réussies'] as [string, string]]
      : []),
    [fmt(g.pieges.length), g.pieges.length > 1 ? 'pièges identifiés' : 'piège identifié'],
  ];
  const obsoletes = g.parcours.filter((c) => c.obsolescence);
  const derniere = r.derniereReussite;
  const chapeau = `Synthèse de ${pluriel(r.parcours, 'parcours documenté', 'parcours documentés')} par ${pluriel(r.auteurs.length, 'membre', 'membres')}${r.reproductions ? `, reproduits ${pluriel(r.reproductions, 'fois', 'fois')} par la communauté` : ''}.${derniere ? ` Dernière reproduction réussie ${jourRelatif(derniere.date, e.maintenant)} avec ${derniere.modele}.` : ''}`;
  const [premierObsolete] = obsoletes;
  return `<header class="ex-guide-head">
      <nav class="ex-crumbs" aria-label="Fil d’Ariane"><a href="${ROUTES.explorer}" data-back>Explorer</a><span aria-hidden="true">/</span><a href="${ROUTES.explorer}?categorie=${esc(r.domaine.slug)}" data-domain-link="${esc(r.domaine.slug)}">${t(r.domaine.libelle)}</a></nav>
      <label class="ex-guide-switch"><span class="sr-only">Changer de guide</span><select data-guide-select>${g.autres.map((o) => `<option value="${esc(o.slug)}"${o.slug === r.slug ? ' selected' : ''}>${t(o.titreCourt)}</option>`).join('')}</select>${icone('chevron-down')}</label>
      <h1 id="ex-guide-title" tabindex="-1">${t(r.titre)}</h1>
      <p class="ex-guide-lead">${t(chapeau)}</p>
      ${premierObsolete ? `<p class="ex-guide-warn">${icone('alert')}<span>${t(`${obsoletes.map((c) => `« ${c.titre} » est signalé comme ne fonctionnant plus avec ${c.obsolescence?.modele} par ${pluriel(c.obsolescence?.membres ?? 0, 'membre', 'membres')}.`).join(' ')} Vérifiez la version de votre modèle avant de suivre ce parcours.`)} <a href="#parcours-${premierObsolete.id}" data-jump="parcours-${premierObsolete.id}">Voir le parcours</a></span></p>` : ''}
      <dl class="ex-figures">${chiffres.map(([valeur, libelle]) => `<div><dt>${t(libelle)}</dt><dd>${t(valeur)}</dd></div>`).join('')}</dl>
      <div class="ex-guide-actions">
        <a class="btn btn-primary" href="${ROUTES.publier}">Publier mon parcours</a>
        <button class="btn btn-secondary" type="button" data-copy-link>${icone('external')}Copier le lien du guide</button>
        ${r.auteurs.length ? `<p class="ex-authors"><span class="ex-avatars" aria-hidden="true">${r.auteurs.map((a) => avatar(a, 28)).join('')}</span>${t(auteursDuGuide(g))}</p>` : ''}
      </div>
      ${essentiel(g)}
    </header>`;
}

/* Méthode et liste de contrôle ----------------------------------------------- */

function detailEtape(e: EtatGuide, i: number): string {
  const g = e.guide;
  const etape = g.methode[i];
  if (!etape) return '';
  const cite = etape.citation && g.parcours.find((c) => c.id === etape.citation?.parcoursId);
  const aCetteEtape = g.pieges.map((p, k) => ({ p, k })).filter(({ p }) => p.etapeId === etape.id);
  return `<p class="ex-step-how">${t(etape.conseil)}</p>
      ${
        cite && etape.citation
          ? `<details class="ex-quote"><summary>${avatar(cite.auteur, 22)}${t(`Voir comment ${prenom(cite.auteur.nom)} l’a demandé`)}</summary>
        <figure><blockquote>${esc(etape.citation.texte)}</blockquote><figcaption>${ligneOutils(cite.outils)}<span>· ${t(cite.titre)}</span></figcaption></figure>
        <div class="ex-quote-actions"><button class="ex-copy" type="button" data-copy-step="${i}">${icone('copy')}<span>Copier le prompt</span></button><a class="link-arrow" href="${esc(adresseParcours(cite))}">Ouvrir le parcours${icone('arrow')}</a></div>
      </details>`
          : ''
      }
      ${aCetteEtape.map(({ p, k }) => `<a class="ex-step-pit" href="#piege-${k + 1}" data-jump="piege-${k + 1}"><span class="ex-ring" aria-hidden="true"></span><span><b>${t('Piège à cette étape :')}</b> ${t(p.titre)}</span>${icone('arrow-down')}</a>`).join('')}`;
}

/** Éléments de la liste : étapes puis pièges, dans l'ordre du guide. */
const elementsListe = (g: GuideApi): [string, string][] => [
  ...g.methode.map((s): [string, string] => [`e${s.id}`, s.titre]),
  ...g.pieges.map((p): [string, string] => [`p${p.id}`, p.titre]),
];

export function listeDeControle(e: EtatGuide): string {
  const elements = elementsListe(e.guide);
  const coches = elements.filter(([cle]) => e.coches.has(cle)).length;
  const ligne = ([cle, libelle]: [string, string]) =>
    `<li><label class="ex-check"><input type="checkbox" data-check="${cle}"${e.coches.has(cle) ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icone('check', '')}</span><span>${t(libelle)}</span></label></li>`;
  const progression = elements.length ? ((coches / elements.length) * 100).toFixed(1) : '0';
  return `<aside class="ex-checklist" aria-labelledby="ex-check-title">
      <h3 id="ex-check-title">Ma liste de contrôle</h3>
      <p class="ex-check-intro">Cochez au fur et à mesure, pendant que vous travaillez avec votre outil.</p>
      <p class="ex-check-progress" data-check-progress><span>${coches} sur ${elements.length}</span><span class="ex-check-bar" aria-hidden="true"><i style="--p:${progression}%"></i></span></p>
      <p class="ex-check-group">Étapes</p>
      <ul>${elements
        .filter(([cle]) => cle.startsWith('e'))
        .map(ligne)
        .join('')}</ul>
      <p class="ex-check-group">Pièges évités</p>
      <ul>${elements
        .filter(([cle]) => cle.startsWith('p'))
        .map(ligne)
        .join('')}</ul>
      <div class="ex-check-actions"><button class="ex-copy" type="button" data-check-copy>${icone('copy')}<span>Copier la liste</span></button>${coches ? '<button class="link-btn" type="button" data-check-reset>Tout décocher</button>' : ''}</div>
      <p class="ex-check-note">${e.membre ? 'Votre liste est enregistrée dans votre compte.' : 'Votre liste reste enregistrée dans ce navigateur.'}</p>
    </aside>`;
}

/** Liste de contrôle à copier (prototype : checklistText). */
export function texteListe(e: EtatGuide, adresse: string): string {
  const g = e.guide;
  const ligne = (cle: string, libelle: string) => `[${e.coches.has(cle) ? 'x' : ' '}] ${libelle}`;
  return [
    `${g.guide.titre} : liste de contrôle Vysora`,
    '',
    'Étapes',
    ...g.methode.map((s) => ligne(`e${s.id}`, s.titre)),
    '',
    'Pièges à éviter',
    ...g.pieges.map((p) => ligne(`p${p.id}`, `${p.titre}. ${p.solution}`)),
    '',
    `Guide : ${adresse}`,
  ].join('\n');
}

function methode(e: EtatGuide): string {
  const g = e.guide;
  const chemin = `<ol class="ex-path" data-path>${g.methode
    .map(
      (
        s,
        i,
      ) => `<li class="ex-step${g.pieges.some((p) => p.etapeId === s.id) ? ' has-pit' : ''}${e.coches.has(`e${s.id}`) ? ' is-done' : ''}" data-step="e${s.id}">
        <span class="ex-step-node" aria-hidden="true">${i + 1}</span>
        <div class="ex-step-body"><h3>${lecteurEcran(`Étape ${i + 1} : `)}${t(s.titre)}</h3>${part(s.sources.length, g.parcours.length)}${detailEtape(e, i)}</div>
      </li>`,
    )
    .join('')}</ol>`;
  return `<div class="ex-method"><div class="ex-method-main">${chemin}</div>${listeDeControle(e)}</div>`;
}

/* Pièges ---------------------------------------------------------------------- */

function piegesSignales(e: EtatGuide): string {
  const g = e.guide;
  return e.propositions
    .map((p) => {
      const etape = g.methode.find((s) => s.id === p.etapeId);
      return `<li class="ex-pit is-pending">
        <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.titre)}</h3><span class="ex-pending">En relecture</span></div>
        ${p.solution ? `<p class="ex-fix"><b>${t('Ce qui a fonctionné :')}</b> ${t(p.solution)}</p>` : ''}
        <p class="ex-pit-src"><span>${t(`Signalé par vous ${jourRelatif(p.date, e.maintenant)}${etape ? `, à l’étape « ${etape.titre} »` : ''}${p.outil ? ` avec ${p.outil}` : ''}`)}</span></p>
      </li>`;
    })
    .join('');
}

function piege(e: EtatGuide, p: PiegeGuideApi, k: number): string {
  const g = e.guide;
  const sources = parcoursDe(g, p.sources);
  return `<li class="ex-pit" id="piege-${k + 1}">
      <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.titre)}</h3></div>
      ${part(p.sources.length, g.parcours.length)}
      <p class="ex-fix"><b>${t('Ce qui a fonctionné :')}</b> ${t(p.solution)}</p>
      ${sources.length ? `<p class="ex-pit-src"><span>Signalé dans</span>${sources.map((c) => `<a href="${esc(adresseParcours(c))}">${avatar(c.auteur, 22)}${t(c.titre)}</a>`).join('')}</p>` : ''}
      ${p.casId !== null || p.sujet ? `<p class="ex-pit-more">${p.casId !== null ? `<button class="link-btn" type="button" data-train="${p.casId}">${icone('bulb')}S’entraîner sur ce piège</button>` : ''}${p.sujet ? `<a class="link-btn" href="${esc(ROUTES.sujet(p.sujet.id, p.sujet.slug))}">${icone('message')}Lire la discussion</a>` : ''}</p>` : ''}
    </li>`;
}

function pieges(e: EtatGuide): string {
  return `<ol class="ex-pits">${piegesSignales(e)}${e.guide.pieges.map((p, k) => piege(e, p, k)).join('')}</ol>
    <div class="ex-pit-propose"><p><b>Vous avez rencontré un autre piège ?</b> ${t('Signalez-le : il rejoindra ce guide après relecture.')}</p><button class="btn btn-secondary btn-sm" type="button" data-propose>${icone('plus')}Signaler un piège</button></div>`;
}

/* Outils ---------------------------------------------------------------------- */

function outils(e: EtatGuide): string {
  const g = e.guide;
  const absents = [...e.mesOutils]
    .filter((slug) => !g.modeles.some((m) => m.outil.slug === slug))
    .flatMap((slug) => e.outils.get(slug) ?? []);
  const cellule = (m: GuideApi['modeles'][number], c: ParcoursGuideApi) => {
    const employe = m.employe.includes(c.id);
    const reussi = m.reproduit.includes(c.id);
    const libelle =
      employe && reussi
        ? 'Outil de l’auteur, reproduit avec succès'
        : employe
          ? 'Outil de l’auteur'
          : reussi
            ? 'Reproduit avec succès'
            : 'Pas de donnée';
    return `<td><span class="ex-mx${employe ? ' is-used' : ''}${reussi ? ' is-ok' : ''}" title="${esc(libelle)}">${reussi ? icone('check', '') : ''}${lecteurEcran(libelle)}</span></td>`;
  };
  const lignes = g.modeles
    .map((m) => {
      const mien = e.mesOutils.has(m.outil.slug);
      return `<tr class="${mien ? 'is-mine' : ''}">
          <th scope="row"><span class="ex-model">${logo(m.outil, 20)}${t(m.cle)}${mien ? '<small>Vos outils</small>' : ''}</span></th>
          ${g.parcours.map((c) => cellule(m, c)).join('')}
          <td class="ex-mx-last">${m.derniere ? t(jourRelatif(m.derniere, e.maintenant)) : '<span class="ex-muted">—</span>'}</td>
        </tr>`;
    })
    .join('');
  const lignesAbsentes = absents
    .map(
      (o) =>
        `<tr class="is-mine is-absent"><th scope="row"><span class="ex-model">${logo(o, 20)}${t(o.nom)}<small>Vos outils</small></span></th><td colspan="${g.parcours.length + 1}"><span class="ex-muted">Aucun parcours de ce guide avec cet outil.</span> <a href="${ROUTES.publier}">Soyez le premier</a></td></tr>`,
    )
    .join('');
  return `<div class="ex-tools-bar">${boutonMesOutils([...e.mesOutils], e.outils)}<p>${e.mesOutils.size ? 'Vos outils sont mis en évidence.' : 'Indiquez vos outils pour les repérer dans le tableau.'}</p></div>
    <div class="ex-table-wrap"><table class="ex-matrix">
      <caption class="sr-only">${t('Outils et modèles, parcours par parcours : outil de l’auteur et reproductions réussies')}</caption>
      <thead><tr><th scope="col" class="ex-mx-first">Outil et modèle</th>${g.parcours.map((c) => `<th scope="col" class="ex-mx-head"><a href="${esc(adresseParcours(c))}" title="${esc(c.titre)}">${avatar(c.auteur, 28)}<span>${t(prenom(c.auteur.nom))}</span>${lecteurEcran(` : ${c.titre}`)}</a></th>`).join('')}<th scope="col" class="ex-mx-last">Dernière réussite</th></tr></thead>
      <tbody>${lignes}${lignesAbsentes}</tbody>
    </table></div>
    <p class="ex-mx-legend" aria-hidden="true"><span><i class="ex-mx is-used"></i>${t('Outil choisi par l’auteur')}</span><span><i class="ex-mx is-ok">${icone('check', '')}</i>Reproduit avec succès par un membre</span><span><i class="ex-mx is-used is-ok">${icone('check', '')}</i>Les deux</span></p>`;
}

/* Parcours --------------------------------------------------------------------- */

/** Points du parcours, les derniers marqués d'un moment clé (prototype : traceHTML). */
export function trace(c: ParcoursGuideApi): string {
  const nombre =
    c.type === 'PROJET'
      ? Math.max(1, c.etapes.length)
      : c.type === 'ITERATION'
        ? Math.max(1, c.echanges)
        : 1;
  const moments = Math.min(c.moments.length, nombre);
  return `<span class="ex-trace" aria-hidden="true">${Array.from({ length: nombre }, (_, i) => `<i class="${i >= nombre - moments ? 'is-moment' : ''}"></i>`).join('')}</span>`;
}

/** « 3 échanges · 2 moments clés » (prototype : runShape). */
export function forme(c: ParcoursGuideApi): string {
  const unite =
    c.type === 'PROJET'
      ? pluriel(c.etapes.length, 'étape', 'étapes')
      : c.type === 'ITERATION'
        ? pluriel(c.echanges, 'échange', 'échanges')
        : c.essais > 1
          ? `1 prompt, ${c.essais} essais`
          : '1 prompt';
  return `${unite} · ${c.moments.length ? pluriel(c.moments.length, 'moment clé', 'moments clés') : 'sans moment clé'}`;
}

/** Preuve d'un parcours (prototype : proofHTML ; RG-43 pour le taux). */
export function preuve(c: ParcoursGuideApi): string {
  const { total, tauxReussite } = c.reproductions;
  if (c.type === 'PROJET')
    return `<span class="ex-proof is-muted">${icone('layers')}${t('Projet : se consulte, ne se reproduit pas')}</span>`;
  if (!total)
    return `<span class="ex-proof is-muted">${icone('repeat')}Pas encore reproduit</span>`;
  if (tauxReussite === null)
    return `<span class="ex-proof">${icone('repeat')}${pluriel(total, 'reproduction', 'reproductions')}</span>`;
  return `<span class="ex-proof is-good">${icone('repeat')}<b>${t(`${tauxReussite} %`)}</b> sur ${pluriel(total, 'reproduction', 'reproductions')}</span>`;
}

const TRIEURS_PARCOURS: Record<TriParcours, (a: ParcoursGuideApi, b: ParcoursGuideApi) => number> =
  {
    reproduits: (a, b) =>
      b.reproductions.reussies - a.reproductions.reussies || b.utiles - a.utiles,
    utiles: (a, b) => b.utiles - a.utiles,
    recents: (a, b) => b.datePublication.localeCompare(a.datePublication),
  };
const LIBELLES_TRI_PARCOURS: Record<TriParcours, string> = {
  reproduits: 'Les plus reproduits',
  utiles: 'Les plus utiles',
  recents: 'Les plus récents',
};

function parcours(e: EtatGuide): string {
  const liste = e.guide.parcours.toSorted(TRIEURS_PARCOURS[e.triParcours]);
  const plein = e.comparaison.size >= 3;
  return `<div class="ex-runs-bar"><label class="ex-sort"><span>Trier par</span><select data-run-sort>${TRIS_PARCOURS.map((tri) => `<option value="${tri}"${tri === e.triParcours ? ' selected' : ''}>${LIBELLES_TRI_PARCOURS[tri]}</option>`).join('')}</select>${icone('chevron-down')}</label><p>Cochez deux ou trois parcours pour les comparer.</p></div>
    <ul class="ex-runs">${liste
      .map((c) => {
        const coche = e.comparaison.has(c.id);
        return `<li class="ex-run" id="parcours-${c.id}">
        <a class="ex-run-media" href="${esc(adresseParcours(c))}" tabindex="-1" aria-hidden="true">${image(c.couverture, '120px')}</a>
        <div class="ex-run-main">
          <p class="ex-run-meta">${etiquetteType(c.type)}${c.categorie ? `<span aria-hidden="true">·</span><span>${t(c.categorie)}</span>` : ''}</p>
          <h3><a href="${esc(adresseParcours(c))}">${t(c.titre)}</a></h3>
          <p class="ex-run-who">${avatar(c.auteur, 22)}<span>${t(c.auteur.nom)} <small>· ${t(c.auteur.niveau.libelle)}</small></span></p>
          <p class="ex-run-tools">${ligneOutils(c.outils)}</p>
        </div>
        <div class="ex-run-side"><div class="ex-run-shape">${trace(c)}<span>${t(forme(c))}</span></div>
        <div class="ex-run-proof">${preuve(c)}${c.derniereReussite ? `<span class="ex-fresh">${icone('clock')}${t(`Dernier succès ${jourRelatif(c.derniereReussite.date, e.maintenant)}`)}</span>` : `<span class="ex-fresh">${icone('calendar')}${t(`Publié ${jourRelatif(c.datePublication, e.maintenant)}`)}</span>`}${c.obsolescence ? `<span class="ex-warn">${icone('alert')}${t(`Signalé comme ne fonctionnant plus avec ${c.obsolescence.modele} par ${pluriel(c.obsolescence.membres, 'membre', 'membres')}`)}</span>` : ''}</div></div>
        <label class="ex-pick"><input type="checkbox" data-compare-id="${c.id}"${coche ? ' checked' : ''}${plein && !coche ? ' disabled' : ''}><span class="ex-box" aria-hidden="true">${icone('check', '')}</span><span>Comparer${lecteurEcran(` « ${c.titre} »`)}</span></label>
      </li>`;
      })
      .join('')}</ul>`;
}

/** Tableau de comparaison de deux ou trois parcours (prototype : openCompare). */
export function comparaison(e: EtatGuide): string {
  const liste = parcoursDe(e.guide, [...e.comparaison]);
  const lignes: [string, (c: ParcoursGuideApi) => string][] = [
    ['Type', (c) => etiquetteType(c.type)],
    [
      'Auteur',
      (c) =>
        `<span class="ex-cmp-who">${avatar(c.auteur, 24)}${t(c.auteur.nom)} <small>· ${t(c.auteur.niveau.libelle)}</small></span>`,
    ],
    ['Outils', (c) => ligneOutils(c.outils)],
    ['Objectif de l’auteur', (c) => rendreMarkdownEnLigne(c.objectif)],
    [
      'Déroulé',
      (c) =>
        c.type === 'PROJET'
          ? `<ol>${c.etapes.map((s) => `<li>${t(s)}</li>`).join('')}</ol>`
          : `<p>${t(forme(c))}</p>${c.prompt ? `<blockquote>${esc(c.prompt)}</blockquote>` : ''}`,
    ],
    [
      'Moments clés',
      (c) =>
        c.moments.length
          ? `<ul>${c.moments.map((m) => `<li><b>${t(`${MOMENTS[m.type].nature} :`)}</b> ${rendreMarkdownEnLigne(m.texte)}</li>`).join('')}</ul>`
          : '<span class="ex-muted">Aucun</span>',
    ],
    [
      'Preuve',
      (c) =>
        `${preuve(c)}${c.derniereReussite ? `<span class="ex-fresh">${t(`Dernier succès ${jourRelatif(c.derniereReussite.date, e.maintenant)} avec ${c.derniereReussite.modele}`)}</span>` : ''}`,
    ],
    ['Votes « Utile »', (c) => fmt(c.utiles)],
  ];
  return `<div class="ex-table-wrap"><table class="ex-cmp"><caption class="sr-only">Comparaison de ${pluriel(liste.length, 'parcours', 'parcours')}</caption>
      <thead><tr><td></td>${liste.map((c) => `<th scope="col"><span class="ex-cmp-media">${image(c.couverture, '200px')}</span><a href="${esc(adresseParcours(c))}">${t(c.titre)}</a></th>`).join('')}</tr></thead>
      <tbody>${lignes.map(([libelle, cellule]) => `<tr><th scope="row">${t(libelle)}</th>${liste.map((c) => `<td>${cellule(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* S'entraîner ------------------------------------------------------------------ */

const NIVEAUX: Record<DifficulteCas, [number, string]> = {
  DEBUTANT: [1, 'Débutant'],
  INTERMEDIAIRE: [2, 'Intermédiaire'],
  AVANCE: [3, 'Avancé'],
};
const LETTRES = ['A', 'B', 'C', 'D', 'E'];
const GENRES_SUJET: Record<TypeSujet, { libelle: string; icone: string }> = {
  QUESTION: { libelle: 'Question', icone: 'help' },
  CLINIQUE: { libelle: 'Clinique du prompt', icone: 'scan' },
  ASTUCE: { libelle: 'Astuce avant/après', icone: 'bulb' },
  RETOUR_EXPERIENCE: { libelle: 'Retour d’expérience', icone: 'route' },
  DISCUSSION: { libelle: 'Discussion', icone: 'users' },
};

const enMinuscule = (texte: string) => texte.charAt(0).toLowerCase() + texte.slice(1);

/** Touches du clavier qui choisissent une option : « Touches A, B ou C ». */
const touches = (nombre: number) => {
  const lettres = LETTRES.slice(0, nombre);
  return lettres.length > 1
    ? `${lettres.slice(0, -1).join(', ')} ou ${lettres.at(-1)}`
    : lettres.join('');
};

/** Cas pratique et sa correction (prototype : caseHTML ; F-62, RG-72). */
export function casPratique(e: EtatGuide, c: CasGuideApi): string {
  const etat = e.cas.get(c.id) ?? etatInitialCas(c);
  const correction = etat.correction ?? (c.moi?.auteur ? c.correction : null);
  const verrouille = (etat.verrouille || Boolean(c.moi?.auteur)) && correction !== null;
  const bonne = correction
    ? c.options.find((o) => o.id === correction.optionCorrecteId)
    : undefined;
  const juste = verrouille && etat.choix !== null && etat.choix === correction?.optionCorrecteId;
  const [niveau, libelleNiveau] = NIVEAUX[c.difficulte];
  const options = c.options
    .map((o, k) => {
      const corrige = correction?.options.find((x) => x.id === o.id);
      const classe = verrouille
        ? corrige?.correcte
          ? ' is-correct'
          : etat.choix === o.id
            ? ' is-wrong'
            : ''
        : '';
      return `<label class="ex-choice${classe}${verrouille ? ' is-locked' : ''}"><input type="radio" name="choix-${c.id}" value="${o.id}"${etat.choix === o.id ? ' checked' : ''}${verrouille ? ' disabled' : ''}><kbd>${LETTRES[k] ?? ''}</kbd><span>${t(o.libelle)}${verrouille && etat.choix === o.id ? '<span class="ex-yours">Votre réponse</span>' : ''}${verrouille && corrige ? `<span class="ex-dist"><i style="--v:${corrige.part}%"></i>${t(`${corrige.part} % des réponses`)}</span><span class="ex-reason">${rendreMarkdownEnLigne(corrige.explication)}</span>` : ''}</span></label>`;
    })
    .join('');
  let suite: string;
  if (verrouille && correction) {
    const titre = c.moi?.auteur
      ? `Le bon réflexe : ${enMinuscule(bonne?.libelle ?? '').replace(/\.$/, '')}.`
      : juste
        ? 'Vous avez le bon réflexe.'
        : `Le bon réflexe : ${enMinuscule(bonne?.libelle ?? '').replace(/\.$/, '')}.`;
    const note = c.moi?.auteur
      ? `<p class="ex-visitor">${t('Vous avez rédigé ce cas : vous ne pouvez pas y répondre.')}</p>`
      : etat.enregistree
        ? `<p class="ex-visitor">${t(juste ? 'Réponse enregistrée dans votre progression : +1 point de réputation.' : 'Réponse enregistrée dans votre progression.')}</p>`
        : `<p class="ex-visitor">${t('Votre réponse n’est pas enregistrée.')} ${e.invitation}</p><button class="link-btn" type="button" data-case-retry="${c.id}">${icone('replay')}Recommencer</button>`;
    suite = `<div class="ex-feedback" tabindex="-1" data-feedback><p class="ex-feedback-title${juste ? '' : ' is-wrong'}">${icone(juste ? 'check-circle' : 'bulb')}${t(titre)}</p><p>${rendreMarkdownEnLigne(correction.explication)}</p>${note}</div>`;
  } else
    suite = `<p class="ex-case-error" data-case-error hidden>Choisissez une réponse avant de valider.</p><div class="ex-case-actions"><button class="btn btn-primary btn-sm" type="submit">Valider ma réponse</button><span class="ex-keys">${t(`Touches ${touches(c.options.length)}`)}</span></div>`;
  return `<div class="ex-case" data-case-id="${c.id}">
      <p class="ex-case-meta"><span class="level" data-level="${niveau}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${libelleNiveau}</span><span>${t(`${correction?.reussite ?? c.reussite} % de bonnes réponses`)}</span></p>
      <h3>${t(c.titre)}</h3>
      <p class="ex-case-context">${rendreMarkdownEnLigne(c.contexte)}</p>
      <figure class="ex-ai"><figcaption>${icone('message')}${t('Réponse de l’IA')}</figcaption><blockquote>« ${esc(c.reponseIa)} »</blockquote></figure>
      <form class="ex-case-form" data-case-form="${c.id}">
        <fieldset class="ex-choices"><legend>${t(c.question)}</legend>${options}</fieldset>
        ${suite}
      </form>
      <p class="ex-case-by">${avatar(c.auteur, 22)}${t(`Cas rédigé par ${c.auteur.nom}`)} · <a href="${ROUTES.bonReflexe}">Tous les cas Bon réflexe</a></p>
    </div>`;
}

function pratique(e: EtatGuide): string {
  const g = e.guide;
  const actuel = g.cas[Math.min(e.casIndex, g.cas.length - 1)];
  const questions = g.sujets.length
    ? `<ul>${g.sujets
        .map((s) => {
          const genre = GENRES_SUJET[s.type];
          return `<li><p class="ex-topic-kind">${icone(genre.icone)}${t(genre.libelle)}${s.etat === 'RESOLU' ? `<span class="ex-resolved">${icone('check-circle')}Résolu</span>` : s.reponses === 0 ? '<span class="ex-open">Sans réponse</span>' : ''}</p><a href="${esc(ROUTES.sujet(s.id, s.slug))}">${t(s.titre)}</a><p class="ex-topic-meta">${avatar(s.auteur, 20)}${t(`${s.auteur.nom} · ${pluriel(s.reponses, 'réponse', 'réponses')}`)}</p></li>`;
        })
        .join('')}</ul>`
    : `<p class="ex-empty-note">${t('Aucune question sur ce sujet pour l’instant.')}</p>`;
  return `<div class="ex-practice">
      <div class="ex-practice-case">
        ${g.cas.length > 1 ? `<div class="ex-case-switch" role="group" aria-label="Cas pratiques">${g.cas.map((c, i) => `<button type="button" data-case-pick="${i}" aria-pressed="${c === actuel}">Cas ${i + 1}</button>`).join('')}</div>` : ''}
        ${actuel ? casPratique(e, actuel) : `<p class="ex-empty-note">${t('Aucun cas Bon réflexe sur ce sujet pour l’instant.')} <a href="${ROUTES.bonReflexe}">Voir tous les cas</a></p>`}
      </div>
      <div class="ex-practice-topics">
        <h3>Questions de la communauté</h3>
        ${questions}
        <a class="btn btn-secondary btn-sm" href="${ROUTES.nouveauSujet}">Poser une question</a>
      </div>
    </div>`;
}

/* À compléter ------------------------------------------------------------------- */

function manque(e: EtatGuide): string {
  const g = e.guide;
  const lacunes = g.lacunes.length
    ? g.lacunes
    : [
        'Ce guide couvre les cas courants. Un parcours avec un autre outil ou un autre contexte l’enrichirait encore.',
      ];
  return `<ul class="ex-gaps">${lacunes.map((texte) => `<li>${icone('flag')}<span>${t(texte)}</span></li>`).join('')}</ul>
    <div class="ex-gaps-actions"><a class="btn btn-primary" href="${ROUTES.publier}">Publier mon parcours</a><p>${t('Votre parcours rejoint ce guide dès sa publication. Les pièges que vous signalez enrichissent la synthèse.')}</p></div>
    ${g.voisins.length ? `<div class="ex-related"><h3>Guides proches</h3><ul>${g.voisins.map((o) => `<li><a href="${esc(ROUTES.guide(o.slug))}" data-guide-link="${esc(o.slug)}"><span class="ex-related-domain">${icone(o.domaine.icone ?? 'compass')}${t(o.domaine.libelle)}</span><span class="ex-related-title">${t(o.titre)}</span><span class="ex-related-meta">${t(`${pluriel(o.parcours, 'parcours', 'parcours')} · ${pluriel(o.pieges, 'piège', 'pièges')}`)}</span>${icone('arrow')}</a></li>`).join('')}</ul></div>` : ''}`;
}

/* Assemblage --------------------------------------------------------------------- */

const TITRES: Record<CleSection, (g: GuideApi) => [string, string]> = {
  methode: (g) => [
    'La méthode qui ressort',
    `Les étapes communes aux ${pluriel(g.parcours.length, 'parcours', 'parcours')}, dans l’ordre où les auteurs les ont suivies.`,
  ],
  pieges: () => [
    'Les pièges à anticiper',
    'Les moments clés signalés par les auteurs, regroupés par problème, avec ce qui a permis de les résoudre.',
  ],
  outils: () => [
    'Ce qui a été testé, outil par outil',
    'Les modèles employés par les auteurs et ceux avec lesquels d’autres membres ont reproduit les parcours.',
  ],
  parcours: (g) => [
    `Les ${pluriel(g.parcours.length, 'parcours', 'parcours')} de ce guide`,
    'Chaque parcours garde ses prompts, ses étapes et ses moments clés sur sa fiche.',
  ],
  pratique: () => [
    'Exercez votre jugement',
    'Un cas tiré de situations réelles, et les questions encore ouvertes sur ce sujet.',
  ],
  manque: () => ['Ce que ce guide ne couvre pas encore', ''],
};

export const CORPS_SECTIONS: Record<CleSection, (e: EtatGuide) => string> = {
  methode,
  pieges,
  outils,
  parcours,
  pratique,
  manque,
};

function section(cle: CleSection, e: EtatGuide): string {
  const [titre, intro] = TITRES[cle](e.guide);
  return `<section class="ex-section" id="${cle}" aria-labelledby="titre-${cle}" data-section="${cle}">
      ${surtitre(SECTIONS[cle].icone, SECTIONS[cle].libelle)}
      <h2 id="titre-${cle}">${t(titre)}</h2>
      ${intro ? `<p class="ex-section-intro">${t(intro)}</p>` : ''}
      <div class="ex-section-body" data-body="${cle}">${CORPS_SECTIONS[cle](e)}</div>
    </section>`;
}

/** Guide complet : en-tête, sommaire des sections, sections (prototype : renderGuide). */
export function vueGuide(e: EtatGuide): string {
  return `${entete(e)}
    <nav class="ex-sections" aria-label="Sections du guide"><ul>${ORDRE_SECTIONS.map((cle) => `<li><a href="#${cle}" data-jump="${cle}">${t(SECTIONS[cle].libelle)}</a></li>`).join('')}</ul><span class="ex-read" aria-hidden="true"><i data-read></i></span></nav>
    ${ORDRE_SECTIONS.map((cle) => section(cle, e)).join('')}`;
}

/** Navigation entre les guides, colonne de gauche (prototype : els.guideNav). */
export const navigationGuides = (g: GuideApi): string =>
  g.autres
    .map(
      (o) =>
        `<li><a href="${esc(ROUTES.guide(o.slug))}" data-guide-link="${esc(o.slug)}"${o.slug === g.guide.slug ? ' aria-current="page"' : ''}>${icone(o.icone ?? 'compass')}<span>${t(o.titreCourt)}</span><small>${o.parcours}</small></a></li>`,
    )
    .join('');
