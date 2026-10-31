import type { ParticipationDefiApi } from '@vysora/shared';
import { avatar, esc, etiquetteType, icone, image, logo, t } from './explorer/elements';
import { ROUTES } from './navigation';
import { dateCourte, fmt, normaliser, typo } from './texte';

const outilPrincipal = (p: ParticipationDefiApi) => p.creation.outils[0];

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
  'search',
  'history',
  'utile',
  'close',
  'check-circle',
  'globe',
  'type-iteration',
  'type-prompt',
  'type-projet',
];

const visuel = (p: ParticipationDefiApi) =>
  p.creation.couverture
    ? image(p.creation.couverture, '(min-width: 1100px) 300px, 90vw')
    : `<div class="df-poster" role="img" aria-label="${esc(typo(p.creation.titre))}"><span>${t(p.auteur.nom)}</span><b>${t(p.creation.titre)}</b><i aria-hidden="true">↗</i></div>`;
/** Carte d'une participation (prototype : renderEntries). */
export const carteParticipation = (p: ParticipationDefiApi, ouvert: boolean): string => {
  const o = outilPrincipal(p);
  const lien = ROUTES.creation(p.creation.id, p.creation.slug);
  return `<article class="df-card" data-entry="${p.creation.id}" data-outil="${esc(o?.outil.slug ?? '')}" data-texte="${esc(normaliser(`${p.creation.titre} ${p.auteur.nom} ${o?.outil.nom ?? ''}`))}" data-utiles="${p.utiles}" data-date="${esc(p.datePublication)}">
    <a class="df-preview" href="${esc(lien)}" aria-label="${esc(typo(`Voir le parcours : ${p.creation.titre}`))}">${visuel(p)}</a>
    <div class="df-card-copy"><h3><a class="df-title-button" href="${esc(lien)}">${t(p.creation.titre)}</a></h3>
    <div class="df-card-kind">${etiquetteType(p.creation.type)}${p.rang ? `<span>${t(`· ${p.rang === 1 ? '1re' : `${p.rang}e`} place`)}</span>` : ''}</div>
    <div class="df-person">${avatar(p.auteur, 28)}${t(p.auteur.nom)}</div>
    ${o ? `<span class="df-tool">${logo(o.outil, 16)}${t(o.outil.nom)}${o.modeles.length ? t(` · ${o.modeles.join(', ')}`) : ''}</span>` : ''}
    <div class="df-card-bottom"><button class="df-vote" type="button" data-vote="${p.creation.id}" aria-pressed="${p.monVote}" aria-label="${esc(typo(`${p.monVote ? 'Retirer mon vote Utile pour' : 'Voter Utile pour'} ${p.creation.titre}`))}"${ouvert ? '' : ' disabled'}>${icone('utile')}<span>${fmt(p.utiles)} Utile</span></button><span>${t(dateCourte(p.datePublication))}</span></div></div></article>`;
};
