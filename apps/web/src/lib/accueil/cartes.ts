import type { CarteCreationApi, DomaineAccueilApi } from '@vysora/shared';
import { etiquetteType, icone, image } from '../explorer/elements';
import { ROUTES } from '../navigation';
import { esc, fmt, pluriel, t } from '../texte';
import { avatar, ilYa, outilsDuParcours } from './elements';

/* « À explorer » de l'accueil (prototype/app.js : cardHTML, rankHTML, traceSVG, renderDomains). */

export type ListeAccueil = 'utiles' | 'recentes' | 'reproduites';

/** Légende de chaque onglet (prototype : LIST_CAPTION ; « Nouveautés » ne promet pas « ces dernières
    heures », que la communauté ne garantit pas). */
export const LEGENDES: Record<ListeAccueil, string> = {
  utiles: 'Classées selon les votes « Utile » reçus ces 7 derniers jours.',
  recentes: 'Les dernières créations publiées par la communauté.',
  reproduites: 'Les créations les plus souvent reproduites avec succès ce mois-ci.',
};

/** Liste vide (aucune création publiée, aucune reproduction réussie ce mois-ci). */
export const LISTES_VIDES: Record<ListeAccueil, string> = {
  utiles: 'Aucune création publiée pour l’instant.',
  recentes: 'Aucune création publiée pour l’instant.',
  reproduites: 'Aucune création reproduite avec succès pour l’instant.',
};

const TAILLES = '(min-width: 1024px) 400px, (min-width: 768px) 46vw, 92vw';

/** Trace du parcours sous l'image (prototype : traceSVG) : un point par échange ou par étape, plus
    grand s'il porte un moment clé. */
export function traceSVG(etapes: boolean[]): string {
  const n = etapes.length;
  const xs = etapes.map((_, i) => (n === 1 ? 46 : 7 + (i * 78) / (n - 1)));
  const formes = etapes
    .map((moment, i) =>
      moment
        ? `<circle class="is-moment" cx="${xs[i]}" cy="7" r="4.4" style="--i:${i}"/>`
        : `<circle cx="${xs[i]}" cy="7" r="4" style="--i:${i}"/>`,
    )
    .join('');
  return `<svg class="trace-svg" viewBox="0 0 92 14" aria-hidden="true"><line x1="${xs[0]}" y1="7" x2="${xs[n - 1]}" y2="7" pathLength="100"/>${formes}</svg>`;
}

/** Vignette : l'image du résultat ; à défaut, le texte ou le code obtenu (comme la fiche) ; à
    défaut, un cadre neutre. Aussi pour les moments clés d'un savoir d'Apprendre (APP-03). */
export function vignette(
  c: Pick<CarteCreationApi, 'couverture' | 'resultat' | 'titre'>,
  tailles = TAILLES,
): string {
  if (c.couverture) return image(c.couverture, tailles);
  const ouverture = `<div class="mock" role="img" aria-label="${t(c.titre)}">`;
  if (c.resultat?.nature === 'CODE') {
    const lignes = c.resultat.extrait.split('\n').slice(0, 9).join('\n');
    return `${ouverture}<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>${esc(c.resultat.nom ?? 'Code')}</span></div><pre>${esc(lignes)}</pre></div></div>`;
  }
  if (c.resultat?.nature === 'TEXTE') {
    const paragraphes = c.resultat.extrait
      .slice(0, 320)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 3);
    return `${ouverture}<div class="mock-paper">${paragraphes.map((p) => `<p>${t(p)}</p>`).join('')}</div></div>`;
  }
  return `${ouverture}<div class="mock-window"><div class="mock-bar"><i></i>Résultat</div><div class="mock-pad"><p class="mock-label">${t(c.titre)}</p></div></div></div>`;
}

/** Pastille de rang de la vignette (prototype : rankHTML). */
function rang(c: CarteCreationApi, i: number, liste: ListeAccueil, maintenant: Date): string {
  if (liste === 'utiles')
    return `<span class="card-rank"><b><span class="sr-only">Rang </span>${i + 1}</b>${icone('utile', 'icon-xs')}${t(`${fmt(c.utilesSemaine)} cette semaine`)}</span>`;
  if (liste === 'recentes')
    return `<span class="card-rank card-rank-plain">${icone('clock', 'icon-xs')}${t(ilYa(c.datePublication, maintenant))}</span>`;
  return `<span class="card-rank"><b>${i + 1}</b>${icone('repeat', 'icon-xs')}${t(pluriel(c.reussitesMois, 'reproduction', 'reproductions'))}</span>`;
}

/** Carte d'une création (prototype : cardHTML, modèle « Parcours »). */
export function carteHTML(
  c: CarteCreationApi,
  i: number,
  liste: ListeAccueil,
  maintenant: Date,
): string {
  const unite: [string, string] =
    c.type === 'PROJET' ? ['étape', 'étapes'] : ['échange', 'échanges'];
  const stats: string[] = [];
  if (c.type === 'PROJET')
    stats.push(
      `<li>${icone('layers', 'icon-xs')}${t(pluriel(c.trace.length, 'étape', 'étapes'))}</li>`,
    );
  else if (c.reproductions)
    stats.push(
      `<li>${icone('repeat', 'icon-xs')}${t(pluriel(c.reproductions, 'reproduction', 'reproductions') + (c.tauxReussite !== null ? ` · ${c.tauxReussite} %` : ''))}</li>`,
    );
  else stats.push(`<li>${icone('repeat', 'icon-xs')}Prête à être reproduite</li>`);
  stats.push(
    `<li class="is-moment">${icone('moment', 'icon-xs')}${t(pluriel(c.moments, 'moment clé', 'moments clés'))}</li>`,
  );
  return `
      <article class="card">
        <div class="card-media">
          ${vignette(c)}
          ${rang(c, i, liste, maintenant)}
          <span class="card-trace" aria-hidden="true">${traceSVG(c.trace)}<span class="trace-label">${t(`${pluriel(c.trace.length, ...unite)} · ${pluriel(c.moments, 'moment clé', 'moments clés')}`)}</span></span>
        </div>
        <div class="card-body">
          <p class="card-kicker">${etiquetteType(c.type)}<span>${t(c.categorie?.libelle ?? '')}</span></p>
          <h3 class="card-title"><a href="${esc(ROUTES.creation(c.id, c.slug))}">${t(c.titre)}</a></h3>
          <p class="card-tools">${outilsDuParcours(c.outils)}</p>
          <p class="card-author">${avatar(c.auteur, 28)}${t(c.auteur.nom)}<small>${t(c.auteur.niveau.libelle)}</small></p>
          <ul class="card-stats">${stats.join('')}</ul>
        </div>
      </article>`;
}

/** Éléments de la liste d'un onglet (prototype : renderCards) ; un message si elle est vide. */
export function listeHTML(
  cartes: CarteCreationApi[],
  liste: ListeAccueil,
  maintenant: Date,
): string {
  if (!cartes.length) return `<li class="cards-vide"><p>${t(LISTES_VIDES[liste])}</p></li>`;
  return cartes
    .map((c, i) => `<li data-id="${c.id}">${carteHTML(c, i, liste, maintenant)}</li>`)
    .join('');
}

/** « Parcourir par domaine » (prototype : renderDomains) : vers Explorer, filtré par domaine. */
export const domainesHTML = (domaines: DomaineAccueilApi[]): string =>
  domaines
    .map(
      (d) => `
      <li><a href="${esc(ROUTES.domaine(d.slug))}">
        <span class="domain-icon" aria-hidden="true">${icone(d.icone ?? 'layers', '')}</span>
        <span class="domain-text">${t(d.libelle)}<small>${t(pluriel(d.creations, 'création', 'créations'))}</small></span>
      </a></li>`,
    )
    .join('');
