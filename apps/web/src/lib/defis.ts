import type { DefiApi, ParticipationDefiApi } from '@vysora/shared';
import { avatar, esc, etiquetteType, fmt, icone, image, logo, t } from './explorer/elements';
import { ROUTES } from './navigation';
import { normaliser, typo } from './texte';

/* Page Défis (S-17, démo validée le 2026-11-16, prototype/defis.*) : fragments partagés par le
   rendu du serveur (DefisApp.astro) et le script de la page (vue en grille ou en liste, suite). */

/** Icônes de la page Défis (sprite du gabarit). */
export const ICONES_DEFIS = [
  'arrow',
  'arrow-down',
  'arrow-up-right',
  'trophy',
  'calendar',
  'users',
  'clock',
  'plus',
  'grid',
  'rows',
  'search',
  'history',
  'utile',
  'close',
  'check-circle',
  'chevron-down',
  'globe',
  'share',
  'crown',
  'pause',
  'bulb',
  'award',
  'eye',
  'type-iteration',
  'type-prompt',
  'type-projet',
  // Icônes des principes jugés (ICONES_CRITERES_DEFI).
  'user',
  'keyboard',
  'smile',
  'trend-up',
  'image',
  'pen',
  'route',
  'shield',
  'code',
  'repeat',
  'play',
  // Lecteur et formulaire de participation.
  'chevron-left',
  'expand',
  'gamepad',
  'file-code',
  'upload',
  'copy',
  'link',
  'moment',
  'alert',
  'x',
  'lock',
];

/** Nombre de participations montrées avant « Afficher la suite ». */
export const PAS_PARTICIPATIONS = 6;

const outilPrincipal = (p: ParticipationDefiApi) => p.creation.outils[0];
/** Création inscrite à un défi d'avant : sa page ; une participation (S-17) s'ouvre dans le lecteur. */
export const lienParticipation = (p: ParticipationDefiApi): string =>
  ROUTES.creation(p.creation.id, p.creation.slug);
export const estParticipation = (p: ParticipationDefiApi): boolean => p.nature === 'PARTICIPATION';
/** Adresse d'une participation hors de la page Défis (classements, administration) : le lecteur
    de la page du défi pour une participation, la fiche pour une création des défis d'avant. */
export const adresseParticipation = (
  p: Pick<ParticipationDefiApi, 'nature' | 'creation'>,
  defi: { id: number; slug: string },
): string =>
  p.nature === 'PARTICIPATION'
    ? `${ROUTES.defi(defi.id, defi.slug)}?participation=${p.creation.id}`
    : ROUTES.creation(p.creation.id, p.creation.slug);
/** Verbe de la carte : jouer à un jeu, voir une image. */
const verbe = (p: ParticipationDefiApi) => (p.detail?.jeu ? 'Jouer à' : 'Voir');
/** Le chemin : nombre d'échanges, ou le prompt unique et ses essais (prototype). */
export function chemin(p: ParticipationDefiApi): string {
  const d = p.detail;
  if (!d) return '';
  return d.prompts.length > 1
    ? `${d.prompts.length} échanges`
    : `1 prompt · ${d.essais > 1 ? `meilleur de ${d.essais} essais` : 'premier essai'}`;
}
const iconeChemin = (p: ParticipationDefiApi) =>
  icone((p.detail?.prompts.length ?? 1) > 1 ? 'type-iteration' : 'type-prompt');
/** Ouverture d'une participation : bouton du lecteur, sinon lien vers la création. */
function ouvrir(p: ParticipationDefiApi, classe: string, label: string, contenu: string): string {
  return estParticipation(p)
    ? `<button class="${classe}" type="button" data-play="${p.creation.id}" aria-label="${esc(typo(label))}">${contenu}</button>`
    : `<a class="${classe}" href="${esc(lienParticipation(p))}" aria-label="${esc(typo(label))}">${contenu}</a>`;
}
function titre(p: ParticipationDefiApi): string {
  return estParticipation(p)
    ? `<button class="df-title-button" type="button" data-play="${p.creation.id}">${t(p.creation.titre)}</button>`
    : `<a class="df-title-button" href="${esc(lienParticipation(p))}">${t(p.creation.titre)}</a>`;
}
const place = (rang: number) => `${rang === 1 ? '1re' : `${rang}e`} place`;

/** Visuel d'une participation : sa couverture, sinon son titre en grand. */
function visuel(p: ParticipationDefiApi, defiTitre: string, tailles: string): string {
  return p.creation.couverture
    ? image(p.creation.couverture, tailles, false)
    : `<span class="df-cover-type" aria-hidden="true"><small>${t(defiTitre)}</small><b>${t(p.creation.titre)}</b></span>`;
}

/** Rang : le premier en or avec la couronne, tous les suivants en bleu. */
const medaille = (rang: number, classe: 'df-medal' | 'df-game-rank') =>
  `<span class="${classe}${rang === 1 ? ' is-1' : ''}" aria-hidden="true">${rang === 1 ? icone('crown') : ''}${rang}</span>`;

const outilHTML = (p: ParticipationDefiApi) => {
  const o = outilPrincipal(p);
  return o
    ? `<span class="df-tool">${logo(o.outil, 16)}${t(o.outil.nom)}${o.modeles.length ? t(` · ${o.modeles.join(', ')}`) : ''}</span>`
    : '';
};

export const boutonVote = (p: ParticipationDefiApi, ouvert: boolean, grand = false): string =>
  `<button class="df-vote${grand ? ' is-big' : ''}" type="button" data-vote="${p.creation.id}" aria-pressed="${p.monVote}" aria-label="${esc(typo(`${p.monVote ? 'Retirer mon vote Utile pour' : 'Voter Utile pour'} ${p.creation.titre}`))}"${ouvert && !p.detail?.mienne ? '' : ' disabled'}>${icone('utile')}<span>${fmt(p.utiles)} Utile</span></button>`;

export interface ContexteCarte {
  defiTitre: string;
  /** Votes ouverts (défi en cours, en pause compris). */
  votes: boolean;
  /** Rang montré : toujours pour les trois premiers, pour tous quand le tri suit les votes. */
  rangs: boolean;
}

/** Carte d'une participation, en grille (prototype : card). */
export function carteGrille(p: ParticipationDefiApi, rang: number, c: ContexteCarte): string {
  const montrer = c.rangs || rang <= 3;
  const mienne = Boolean(p.detail?.mienne);
  const jeu = Boolean(p.detail?.jeu);
  const contenu = `${visuel(p, c.defiTitre, '(min-width: 1100px) 380px, (min-width: 768px) 46vw, 92vw')}${montrer ? medaille(rang, 'df-game-rank') : ''}${mienne ? '<span class="df-game-tag is-mine" aria-hidden="true">Votre participation</span>' : ''}<span class="df-game-play" aria-hidden="true">${icone(jeu ? 'play' : 'eye')}${jeu ? 'Jouer' : 'Voir'}</span>`;
  return `<article class="df-game${mienne ? ' is-mine' : ''}${rang === 1 ? ' is-top-1' : ''}" data-entry="${p.creation.id}">
      ${ouvrir(p, 'df-game-cover is-image', `${verbe(p)} ${p.creation.titre}${montrer ? `, ${place(rang)}` : ''}`, contenu)}
      <div class="df-game-copy">
        <h3>${titre(p)}</h3>
        ${p.detail?.idee ? `<p class="df-game-idea">${t(p.detail.idee)}</p>` : ''}
        <div class="df-game-meta">${avatar(p.auteur, 24)}<span class="df-game-author">${t(p.auteur.nom)}</span>${outilHTML(p)}</div>
        <div class="df-game-foot">${boutonVote(p, c.votes)}<span class="df-game-tries">${p.detail ? `${iconeChemin(p)}${t(chemin(p))}` : etiquetteType(p.creation.type)}</span></div>
      </div></article>`;
}

/** Ligne d'une participation, en liste. */
export function ligneListe(p: ParticipationDefiApi, rang: number, c: ContexteCarte): string {
  const montrer = c.rangs || rang <= 3;
  const mienne = Boolean(p.detail?.mienne);
  const m = montrer ? medaille(rang, 'df-medal') : '';
  return `<article class="df-row${mienne ? ' is-mine' : ''}" data-entry="${p.creation.id}">
      <span class="df-row-rank" aria-hidden="true">${m}</span>
      ${ouvrir(p, 'df-row-media is-image', `${verbe(p)} ${p.creation.titre}${montrer ? `, ${place(rang)}` : ''}`, `${visuel(p, c.defiTitre, '136px')}${m ? `<span class="df-row-medal">${m}</span>` : ''}`)}
      <div class="df-row-copy"><h3>${titre(p)}${mienne ? ' <span class="df-row-tag">Votre participation</span>' : ''}</h3>${p.detail?.idee ? `<p>${t(p.detail.idee)}</p>` : ''}
        <div class="df-row-meta">${avatar(p.auteur, 20)}<b>${t(p.auteur.nom)}</b>${outilHTML(p)}<span class="df-row-path">${p.detail ? `${iconeChemin(p)}${t(chemin(p))}` : etiquetteType(p.creation.type)}</span></div></div>
      ${boutonVote(p, c.votes)}
    </article>`;
}

/** Le premier du classement, réduit à l'essentiel (image, couronne, titre, auteur, votes). */
export function premier(p: ParticipationDefiApi, defi: DefiApi): string {
  const fige = defi.etat === 'CLOTURE';
  return ouvrir(
    p,
    `df-first${p.detail?.mienne ? ' is-mine' : ''}`,
    `${verbe(p)} ${p.creation.titre}, ${fige ? '1re place' : 'en tête du classement'}, ${p.utiles} votes « Utile »`,
    `<span class="df-first-media" aria-hidden="true">${visuel(p, defi.titre, '(min-width: 1100px) 360px, 92vw')}</span>
      <span class="df-first-badge" aria-hidden="true">${icone('crown')}${fige ? '1re place' : 'En tête'}</span>
      <span class="df-first-foot" aria-hidden="true"><span class="df-first-text"><b>${t(p.creation.titre)}</b><small>${t(p.detail?.mienne ? 'Vous' : p.auteur.nom)}</small></span><span class="df-first-votes">${icone('utile')}${fmt(p.utiles)}</span></span>`,
  );
}

/** Texte de recherche d'une participation (titre, auteur, outil). */
export const texteRecherche = (p: ParticipationDefiApi): string =>
  normaliser(
    `${p.creation.titre} ${p.auteur.nom} ${outilPrincipal(p)?.outil.nom ?? ''} ${p.detail?.idee ?? ''}`,
  );

/** Semaine ISO d'une date (« Défi de la semaine 47 »). */
export function semaineIso(iso: string): number {
  const d = new Date(iso);
  const jeudi = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  jeudi.setUTCDate(jeudi.getUTCDate() + 3 - ((jeudi.getUTCDay() + 6) % 7));
  const premierJeudi = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((jeudi.getTime() - premierJeudi.getTime()) / 86_400_000 -
        3 +
        ((premierJeudi.getUTCDay() + 6) % 7)) /
        7,
    )
  );
}
