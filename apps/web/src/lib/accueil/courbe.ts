import type { ApprentissageAccueilApi } from '@vysora/shared';
import { fmt, t, typo } from '../texte';

/* « Interactions d'apprentissage » (prototype/app.js : renderChart, chartPaths, renderBreakdown,
   updateTrend), avec les jours de l'API en temps universel. */

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
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOUR_MS = 86_400_000;

/** Couleurs de la répartition (prototype : MIX_COLORS). */
const COULEURS = ['#2563EB', '#EB6834', '#1BAF7A', '#EDA100'];
export const PARTS = [
  ['votes', 'Votes « Utile » et « Testé, ça marche »'],
  ['reproductions', 'Reproductions déclarées'],
  ['casReussis', 'Cas Bon réflexe réussis'],
  ['reponsesAcceptees', 'Réponses acceptées'],
] as const;

/** Jour de rang `i` de la courbe. */
const jour = (debut: string, i: number): Date =>
  new Date(new Date(`${debut}T12:00:00Z`).getTime() + i * JOUR_MS);

/** « lun. 6 oct. » ou « 6 oct. » (prototype : dateLabel). */
export function libelleJour(debut: string, i: number, avecJour = true): string {
  const d = jour(debut, i);
  return `${avecJour ? `${JOURS[d.getUTCDay()]} ` : ''}${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

export interface Geometrie {
  largeur: number;
  hauteur: number;
  marges: { l: number; r: number; t: number; b: number };
  max: number;
  base: number;
  x: (i: number) => number;
  y: (v: number) => number;
}

/** Dimensions de la courbe pour une largeur donnée (prototype : renderChart). */
export function geometrie(valeurs: number[], largeurBoite: number): Geometrie {
  const largeur = Math.max(300, Math.round(largeurBoite) || 640);
  const hauteur = largeur < 480 ? 210 : 236;
  const marges = { l: 42, r: 18, t: 18, b: 30 };
  const n = valeurs.length;
  // Graduations de 500 comme le prototype ; plus fines quand l'activité est faible.
  const pas = graduation(Math.max(0, ...valeurs));
  const max = Math.max(pas, Math.ceil((Math.max(0, ...valeurs) * 1.15) / pas) * pas);
  const largeurTrace = largeur - marges.l - marges.r;
  const hauteurTrace = hauteur - marges.t - marges.b;
  return {
    largeur,
    hauteur,
    marges,
    max,
    base: marges.t + hauteurTrace,
    x: (i) => marges.l + (n > 1 ? (i / (n - 1)) * largeurTrace : 0),
    y: (v) => marges.t + hauteurTrace - (v / max) * hauteurTrace,
  };
}

/** Pas des graduations : 500 au-delà de 1 500 interactions par jour, sinon un pas plus fin. */
export function graduation(max: number): number {
  for (const pas of [5, 10, 25, 50, 100, 250]) if (max * 1.15 <= pas * 4) return pas;
  return 500;
}

/** Tracés de la courbe, de l'aire, du dernier segment (journée en cours) et du point du jour. */
export function traces(valeurs: number[], g: Geometrie) {
  const dernier = valeurs.length - 1;
  const points = valeurs.map((v, i) => [g.x(i), g.y(v)] as const);
  const p = (pt: readonly [number, number] | undefined) =>
    pt ? `${pt[0].toFixed(1)},${pt[1].toFixed(1)}` : '0,0';
  const ligne = points
    .slice(0, dernier)
    .map((pt, i) => `${i ? 'L' : 'M'}${p(pt)}`)
    .join(' ');
  const aire = `${points.map((pt, i) => `${i ? 'L' : 'M'}${p(pt)}`).join(' ')} L${(points[dernier]?.[0] ?? 0).toFixed(1)},${g.base} L${(points[0]?.[0] ?? 0).toFixed(1)},${g.base} Z`;
  const enCours =
    dernier > 0 ? `M${p(points[dernier - 1])} L${p(points[dernier])}` : `M${p(points[0])}`;
  return { ligne, aire, enCours, aujourdhui: p(points[dernier]).replace(',', ' ') };
}

/** Courbe complète (prototype : renderChart) ; le script la redessine à la largeur de la carte. */
export function courbeHTML(a: ApprentissageAccueilApi, largeurBoite = 640): string {
  const valeurs = a.parJour;
  const n = valeurs.length;
  const g = geometrie(valeurs, largeurBoite);
  const pas = graduation(Math.max(0, ...valeurs));
  const tr = traces(valeurs, g);
  let grille = '';
  for (let v = 0; v <= g.max; v += pas)
    grille += `<line class="grid-line" x1="${g.marges.l}" x2="${g.largeur - g.marges.r}" y1="${g.y(v)}" y2="${g.y(v)}"/><text class="axis-label" x="${g.marges.l - 10}" y="${g.y(v) + 4}" text-anchor="end">${typo(fmt(v))}</text>`;
  let reperes = '';
  for (let i = 0; i < n; i += 7)
    reperes += `<text class="axis-label" x="${g.x(i)}" y="${g.hauteur - 8}" text-anchor="${i === 0 ? 'start' : 'middle'}">${typo(libelleJour(a.debut, i, false))}</text>`;
  const largeurTrace = g.largeur - g.marges.l - g.marges.r;
  const hauteurTrace = g.base - g.marges.t;
  return `
      <svg viewBox="0 0 ${g.largeur} ${g.hauteur}" role="img" aria-labelledby="chart-title">
        <title id="chart-title">${t(`Interactions d’apprentissage par jour, du ${libelleJour(a.debut, 0, false)} à aujourd’hui`)}</title>
        ${grille}${reperes}
        <path class="ch-area" d="${tr.aire}"/>
        <path class="ch-line" pathLength="1" d="${tr.ligne}"/>
        <path class="ch-live" d="${tr.enCours}"/>
        <g class="ch-today" transform="translate(${tr.aujourdhui})"><circle class="ch-pulse" r="4"/><circle class="ch-dot" r="4"/></g>
        <g class="ch-cross" hidden><line class="ch-hair" y1="${g.marges.t}" y2="${g.base}"/><circle class="ch-mark" r="4.5"/></g>
        <rect class="ch-hit" x="${g.marges.l}" y="${g.marges.t}" width="${largeurTrace}" height="${hauteurTrace}" tabindex="0" aria-label="Parcourir les valeurs jour par jour avec les flèches"/>
      </svg>
      <p class="ch-note"><span class="ch-key"><i></i>Interactions par jour</span><span class="ch-key ch-key-live"><i></i>${t('Aujourd’hui, journée en cours')}</span></p>
      <table class="sr-only"><caption>${t('Interactions d’apprentissage par jour')}</caption><thead><tr><th scope="col">Jour</th><th scope="col">Interactions</th></tr></thead><tbody>
        ${valeurs.map((v, i) => `<tr><th scope="row">${typo(libelleJour(a.debut, i))}</th><td data-cell="${i}">${typo(fmt(v))}${i === n - 1 ? ' (en cours)' : ''}</td></tr>`).join('')}
      </tbody></table>`;
}

/** Interactions depuis lundi (prototype : pulseTotal). */
export const totalSemaine = (a: ApprentissageAccueilApi): number =>
  PARTS.reduce((n, [cle]) => n + a.semaine[cle], 0);

/** « Répartition de la semaine » (prototype : renderBreakdown). */
export function repartitionHTML(a: ApprentissageAccueilApi): string {
  const total = totalSemaine(a);
  const part = (v: number) => (total ? (v / total) * 100 : 0);
  return `
      <p class="mix-title">Répartition de la semaine</p>
      <div class="mix-bar" aria-hidden="true">${PARTS.map(([cle], i) => `<span data-mix="${i}" style="--w:${part(a.semaine[cle]).toFixed(2)}%;--c:${COULEURS[i]}"></span>`).join('')}</div>
      <ul class="mix-legend">${PARTS.map(([cle, libelle], i) => `<li data-mix="${i}"><i style="--c:${COULEURS[i]}" aria-hidden="true"></i><span>${t(libelle)}</span><b data-bd="${i}">${typo(fmt(a.semaine[cle]))}</b><small data-bp="${i}">${typo(`${Math.round(part(a.semaine[cle]))} %`)}</small></li>`).join('')}</ul>`;
}

/** Évolution d'hier par rapport au même jour de la semaine précédente (prototype : updateTrend) ;
    le lundi, la journée en cours. Null sans point de comparaison. */
export function tendance(a: ApprentissageAccueilApi): { texte: string; hausse: boolean } | null {
  const n = a.parJour.length;
  // La semaine en cours commence 21 jours après le premier jour de la courbe.
  const rangDuJour = n - 1 - 21;
  const k = rangDuJour > 0 ? rangDuJour - 1 : 0;
  const maintenant = a.parJour[21 + k];
  const avant = a.parJour[14 + k];
  if (maintenant === undefined || !avant) return null;
  const ecart = Math.round(((maintenant - avant) / avant) * 100);
  const nom = JOURS_LONGS[k] ?? '';
  return {
    texte: typo(`${ecart >= 0 ? '+' : ''}${ecart} % ${nom}, par rapport à ${nom} dernier`),
    hausse: ecart >= 0,
  };
}
