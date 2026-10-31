import type {
  DemandeGuideApi,
  DomaineApi,
  GuideResumeApi,
  OutilResumeApi,
  RechercheCreationsApi,
} from '@vysora/shared';
import { ROUTES } from '../navigation';
import {
  avatar,
  esc,
  etiquetteType,
  fmt,
  icone,
  image,
  jourRelatif,
  logo,
  pluriel,
  prenom,
  t,
} from './elements';
import { champ, contient, decouper, score, surligner } from './recherche';

/* Index d'Explorer (prototype explorer.js : renderIndex, guideRowHTML, miniRouteHTML, heroBodyHTML,
   renderRequests ; explorer-modele.js : compatOf, myToolsHTML). */

/** Guide de l'index et ses textes repliés pour la recherche. */
export interface GuideIndexe extends GuideResumeApi {
  titrePlie: string;
  textePlie: string;
}

export const indexer = (g: GuideResumeApi): GuideIndexe => ({
  ...g,
  titrePlie: champ(g.titre, g.titreCourt, ...g.motsCles),
  textePlie: champ(g.texteRecherche),
});

export type Tri = 'actifs' | 'fiables' | 'recents';
export const TRIS: Tri[] = ['actifs', 'fiables', 'recents'];

const TRIEURS: Record<Tri, (a: GuideIndexe, b: GuideIndexe) => number> = {
  actifs: (a, b) => b.activite - a.activite,
  fiables: (a, b) =>
    (b.tauxReussite ?? -1) - (a.tauxReussite ?? -1) || b.reproductions - a.reproductions,
  recents: (a, b) => (b.recent ?? '').localeCompare(a.recent ?? ''),
};

/** Modèles déjà essayés avec les outils de la personne (null si elle n'en a indiqué aucun). */
export function compatibilite(g: GuideResumeApi, mesOutils: Set<string>): string[] | null {
  if (!mesOutils.size) return null;
  return g.modeles.filter((m) => mesOutils.has(m.outil)).map((m) => m.cle);
}

/** Guides qui répondent à la recherche, dans le domaine choisi, triés (prototype : renderIndex). */
export function guidesRetenus(
  guides: GuideIndexe[],
  jetons: string[][],
  domaine: string,
  tri: Tri,
  mesOutils: Set<string>,
): { trouves: GuideIndexe[]; visibles: GuideIndexe[] } {
  const notes = guides
    .map((g) => ({ g, note: score(g.titrePlie, g.textePlie, jetons) }))
    .filter((r) => r.note > 0);
  const visibles = notes
    .filter((r) => !domaine || r.g.domaines.includes(domaine))
    .toSorted(
      (a, b) =>
        (jetons.length ? b.note - a.note : 0) ||
        TRIEURS[tri](a.g, b.g) ||
        (mesOutils.size
          ? (compatibilite(b.g, mesOutils)?.length ?? 0) -
            (compatibilite(a.g, mesOutils)?.length ?? 0)
          : 0),
    );
  return { trouves: notes.map((r) => r.g), visibles: visibles.map((r) => r.g) };
}

/** Guides proches d'une recherche sans résultat : ceux qui contiennent le plus de ses mots. */
export function guidesVoisins(guides: GuideIndexe[], jetons: string[][]): GuideIndexe[] {
  return guides
    .map((g) => ({ g, n: jetons.filter((v) => contient(g.textePlie, v)).length }))
    .filter((r) => r.n)
    .toSorted((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((r) => r.g);
}

/** Aperçus du héros : guides d'au moins trois parcours dont les étapes sont les plus partagées. */
export function guidesEnApercu(guides: GuideResumeApi[]): GuideResumeApi[] {
  const accord = (g: GuideResumeApi) =>
    g.etapes.length && g.parcours
      ? g.etapes.reduce((n, e) => n + e.suivie / g.parcours, 0) / g.etapes.length
      : 0;
  return guides
    .filter((g) => g.parcours >= 3)
    .toSorted((a, b) => accord(b) - accord(a) || b.activite - a.activite)
    .slice(0, 3);
}

const lienGuide = (g: Pick<GuideResumeApi, 'slug'>, contenu: string, classe = '') =>
  `<a${classe ? ` class="${classe}"` : ''} href="${esc(ROUTES.guide(g.slug))}" data-guide-link="${esc(g.slug)}">${contenu}</a>`;

/** Chemin miniature de la méthode (prototype : miniRouteHTML). */
export function cheminMini(g: GuideResumeApi): string {
  return `<ol class="ex-mini" aria-hidden="true">${g.etapes
    .map(
      (e, i) =>
        `<li class="${g.parcours && e.suivie / g.parcours > 0.5 ? 'is-main' : 'is-some'}${e.piege ? ' has-pit' : ''}" style="--i:${i}"><span class="ex-mini-node"></span><span class="ex-mini-label">${t(e.titre)}</span></li>`,
    )
    .join('')}</ol>`;
}

/** Auteurs d'un guide : « Aïssatou et 3 autres membres ». */
function auteursEnLigne(g: GuideResumeApi): string {
  const [premier] = g.auteurs;
  if (!premier) return '';
  return g.auteurs.length > 1
    ? `${t(prenom(premier.nom))} et ${pluriel(g.auteurs.length - 1, 'autre membre', 'autres membres')}`
    : t(premier.nom);
}

/** Ligne d'un guide dans l'index (prototype : guideRowHTML). */
export function ligneGuide(
  g: GuideResumeApi,
  jetons: string[][],
  i: number,
  mesOutils: Set<string>,
  maintenant: Date,
): string {
  const principal = g.piegePrincipal;
  const compat = compatibilite(g, mesOutils);
  const vignettes = g.vignettes
    .map((m) => `<span class="ex-thumb">${image(m, '64px')}</span>`)
    .join('');
  const chiffres = [
    pluriel(g.parcours, 'parcours', 'parcours'),
    g.reproductions ? pluriel(g.reproductions, 'reproduction', 'reproductions') : '',
    g.tauxReussite !== null ? `${g.tauxReussite} % de réussite` : '',
    g.miseAJour ? `mis à jour ${jourRelatif(g.miseAJour, maintenant)}` : '',
  ].filter(Boolean);
  const compatHTML = compat
    ? compat.length
      ? `<p class="ex-row-compat">${icone('check-circle')}${t(`Testé avec vos outils : ${compat.slice(0, 2).join(', ')}${compat.length > 2 ? '…' : ''}`)}</p>`
      : `<p class="ex-row-compat is-none">${icone('help')}Pas encore testé avec vos outils</p>`
    : '';
  return `<li class="ex-row xp-enter" style="--i:${Math.min(i, 8)}">
      <article class="ex-row-inner">
        <div class="ex-row-main">
          <p class="ex-row-domain">${icone(g.domaine.icone ?? 'compass')}${t(g.domaine.libelle)}</p>
          <h3 class="ex-row-title">${lienGuide(g, surligner(g.titre, jetons))}</h3>
          <p class="ex-row-stats">${chiffres.map((s) => `<span>${t(s)}</span>`).join('')}</p>
          ${
            g.auteurs.length
              ? `<p class="ex-row-people"><span class="ex-avatars" aria-hidden="true">${g.auteurs
                  .slice(0, 4)
                  .map((a) => avatar(a, 26))
                  .join('')}</span>${auteursEnLigne(g)}</p>`
              : ''
          }
          ${compatHTML}
        </div>
        <div class="ex-row-route">
          <p class="ex-row-caption">La méthode qui ressort</p>
          ${cheminMini(g)}
          ${g.obsolescence ? `<p class="ex-row-warn">${icone('alert')}${t(`${pluriel(g.obsolescence.parcours, 'parcours à revérifier', 'parcours à revérifier')} avec ${g.obsolescence.modele}`)}</p>` : ''}
          ${principal ? `<p class="ex-row-pit">${icone('moment')}<span><b>${t('Piège le plus fréquent :')}</b> ${surligner(principal.titre, jetons)} <small>(${principal.signale} sur ${g.parcours})</small></span></p>` : ''}
        </div>
        <div class="ex-row-media" aria-hidden="true">${vignettes}</div>
        <span class="ex-row-go" aria-hidden="true">${icone('arrow')}</span>
      </article>
    </li>`;
}

/** Puces des domaines, avec le nombre de guides de chacun (prototype : renderIndex). */
export function puceDomaines(
  domaines: DomaineApi[],
  trouves: GuideResumeApi[],
  actif: string,
): string {
  const comptes = new Map<string, number>();
  for (const g of trouves) for (const d of g.domaines) comptes.set(d, (comptes.get(d) ?? 0) + 1);
  return (
    `<li><button type="button" data-domain="" aria-pressed="${!actif}">Tous<small>${fmt(trouves.length)}</small></button></li>` +
    domaines
      .filter((d) => comptes.get(d.slug) || actif === d.slug)
      .map(
        (d) =>
          `<li><button type="button" data-domain="${esc(d.slug)}" aria-pressed="${actif === d.slug}">${icone(d.icone ?? 'compass')}${t(d.libelle)}<small>${fmt(comptes.get(d.slug) ?? 0)}</small></button></li>`,
      )
      .join('')
  );
}

/** Bandeau du domaine choisi, avec le lien vers sa page (S-06). */
export const banniereDomaine = (d: DomaineApi): string =>
  `<span class="ex-db-icon" aria-hidden="true">${icone(d.icone ?? 'compass', '')}</span><span class="ex-db-text"><b>${t(d.libelle)}</b>${d.description ? t(d.description) : ''}</span><a class="link-arrow" href="${esc(ROUTES.domaine(d.slug))}">Ouvrir la page du domaine${icone('arrow')}</a>`;

/** Sous-titre de l'index (prototype : els.sub). */
export function sousTitre(
  q: string,
  visibles: number,
  totaux: { parcours: number; reproductions: number },
): string {
  if (q)
    return visibles
      ? `${pluriel(visibles, 'guide correspond', 'guides correspondent')} à « ${q} »`
      : `Aucun guide pour « ${q} »`;
  return `${pluriel(visibles, 'guide', 'guides')} · ${pluriel(totaux.parcours, 'parcours documenté', 'parcours documentés')} · ${pluriel(totaux.reproductions, 'reproduction déclarée', 'reproductions déclarées')}`;
}

/** Aucun guide ne répond (prototype : els.none). */
export function aucunGuide(q: string, domaine: string, voisins: GuideResumeApi[]): string {
  const titre = q
    ? `Personne n’a encore documenté « ${q} »`
    : domaine
      ? 'Aucun guide dans ce domaine pour l’instant'
      : 'Aucun guide pour l’instant';
  return `<div class="ex-none-inner">
      ${icone('flag', '')}
      <h3>${t(titre)}</h3>
      <p>${t('Publiez le premier parcours : il ouvrira le guide de cet objectif. Vous pouvez aussi poser la question à la communauté.')}</p>
      <div class="ex-none-actions"><a class="btn btn-primary" href="${ROUTES.publier}">Publier le premier parcours</a><a class="btn btn-secondary" href="${ROUTES.nouveauSujet}">Poser la question</a></div>
      ${voisins.length ? `<p class="ex-none-near"><span>${t('Guides proches :')}</span>${voisins.map((g) => lienGuide(g, t(g.titreCourt))).join('')}</p>` : ''}
    </div>`;
}

/** « Parcours qui correspondent » (prototype : els.matchesList). */
export const correspondances = (
  resultats: RechercheCreationsApi['elements'],
  jetons: string[][],
): string =>
  resultats
    .map(
      (c) =>
        `<li><a href="${esc(ROUTES.creation(c.id, c.slug))}">${etiquetteType(c.type)}<span>${surligner(c.titre, jetons)}</span></a>${c.guide ? `<span class="ex-match-guide">dans le guide ${lienGuide(c.guide, t(c.guide.titreCourt))}</span>` : ''}</li>`,
    )
    .join('');

/** Aperçu d'un guide dans le héros (prototype : heroBodyHTML). */
export function apercuGuide(g: GuideResumeApi, actif: boolean): string {
  const piege = g.piegePrincipal;
  const etapes = g.etapes
    .map((e, i) => {
      const ici = piege !== null && piege.etapeId === e.id;
      return `<li style="--i:${i}"${ici ? ' class="has-pit"' : ''}><span class="ex-hc-node" aria-hidden="true">${i + 1}</span><span class="ex-hc-text">${t(e.titre)}<small>${e.suivie} sur ${g.parcours}</small></span>${ici ? `<span class="ex-hc-pit"><span class="ex-ring" aria-hidden="true"></span><span>${t(`Piège fréquent : ${piege.titre.charAt(0).toLowerCase()}${piege.titre.slice(1)}`)}</span></span>` : ''}</li>`;
    })
    .join('');
  return `<div class="ex-hc-body${actif ? ' is-active' : ''}" data-hc="${esc(g.slug)}"${actif ? '' : ' inert aria-hidden="true"'}>
      <p class="ex-hc-head">${lienGuide(g, t(g.titreCourt))}</p>
      <p class="ex-hc-caption">${t(`La méthode qui ressort de ${pluriel(g.parcours, 'parcours', 'parcours')}`)}</p>
      <ol class="ex-hc-steps">${etapes}</ol>
      <div class="ex-hc-foot"><span class="ex-avatars" aria-hidden="true">${g.auteurs
        .slice(0, 4)
        .map((a) => avatar(a, 24))
        .join(
          '',
        )}</span><span>${t(`${pluriel(g.reproductions, 'reproduction', 'reproductions')}${g.tauxReussite !== null ? ` · ${g.tauxReussite} % réussies` : ''}`)}</span><span class="ex-hc-go"><kbd class="ex-hc-enter" aria-hidden="true">Entrée</kbd>${lienGuide(g, `Ouvrir le guide${icone('arrow')}`, 'link-arrow')}</span></div>
    </div>`;
}

/** Aperçu quand aucun guide ne couvre la recherche (prototype : heroNoneHTML). */
export function apercuAucun(actif: boolean, q: string, voisins: GuideResumeApi[]): string {
  return `<div class="ex-hc-body ex-hc-none${actif ? ' is-active' : ''}" data-hc="none"${actif ? '' : ' inert aria-hidden="true"'}>
      <span class="ex-hc-none-icon" aria-hidden="true">${icone('flag', '')}</span>
      <p class="ex-hc-head" data-hc-query>${q ? t(`« ${q} »`) : ''}</p>
      <p class="ex-hc-caption">${t('Aucun guide ne couvre encore cet objectif. Le premier parcours publié ouvrira son guide, et les guides proches restent visibles dans la liste.')}</p>
      <p class="ex-hc-near" data-hc-near${voisins.length ? '' : ' hidden'}>${voisins.length ? `<span>Guides proches</span>${voisins.map((g) => lienGuide(g, t(g.titreCourt))).join('')}` : ''}</p>
      <div class="ex-hc-foot"><a class="link-arrow" href="${ROUTES.publier}">Publier le premier parcours${icone('arrow')}</a></div>
    </div>`;
}

/** Carte du héros : tous les aperçus empilés, la carte garde la hauteur du plus long. */
export function carteHero(
  guides: GuideResumeApi[],
  enApercu: GuideResumeApi[],
  actif: string,
  q: string,
  voisins: GuideResumeApi[],
): string {
  const pile = [...enApercu, ...guides.filter((g) => !enApercu.includes(g))];
  const kicker = q
    ? actif === 'none'
      ? 'Pas encore de guide'
      : 'Le guide qui correspond'
    : 'Aperçu d’un guide';
  return `<div class="ex-hc-top"><span class="ex-hc-kicker" data-hc-kicker>${t(kicker)}</span></div>
    <div class="ex-hc-stack">${pile.map((g) => apercuGuide(g, g.slug === actif)).join('')}${apercuAucun(actif === 'none', q, voisins)}</div>`;
}

/** « Ce que la communauté cherche encore » (prototype : renderRequests). */
export function demandesHTML(demandes: DemandeGuideApi[]): string {
  return demandes
    .map((d) => {
      const on = d.soutenue;
      return `<li>
        <div class="ex-req-text"><span class="ex-req-domain">${d.domaine ? `${icone(d.domaine.icone ?? 'compass')}${t(d.domaine.libelle)}` : ''}</span><span class="ex-req-query">${t(d.libelle)}</span><span class="ex-req-count">${t(`${pluriel(d.soutiens, 'personne le cherche', 'personnes le cherchent')} ce mois-ci`)}</span></div>
        <div class="ex-req-actions"><button class="ex-want" type="button" aria-pressed="${on}" data-want="${d.id}">${icone(on ? 'check' : 'plus')}<span>${on ? 'Vous le cherchez aussi' : 'Je le cherche aussi'}</span></button><a class="link-arrow" href="${ROUTES.publier}">Documenter<span class="sr-only">${t(` : ${d.libelle}`)}</span>${icone('arrow')}</a></div>
      </li>`;
    })
    .join('');
}

/** Ce que l'index montre : recherche, domaine, tri et outils de la personne. */
export interface EtatIndex {
  guides: GuideIndexe[];
  domaines: DomaineApi[];
  totaux: { parcours: number; reproductions: number };
  q: string;
  domaine: string;
  tri: Tri;
  mesOutils: Set<string>;
  maintenant: Date;
}

/** Index d'Explorer (prototype : renderIndex), sauf les parcours qui correspondent, cherchés à part. */
export function vueIndex(e: EtatIndex) {
  const jetons = decouper(e.q);
  const { trouves, visibles } = guidesRetenus(e.guides, jetons, e.domaine, e.tri, e.mesOutils);
  const voisins = visibles.length ? [] : guidesVoisins(e.guides, jetons);
  const domaine = e.domaines.find((d) => d.slug === e.domaine);
  return {
    jetons,
    visibles,
    voisins,
    puces: puceDomaines(e.domaines, trouves, e.domaine),
    banniere: domaine ? banniereDomaine(domaine) : '',
    lignes: visibles.map((g, i) => ligneGuide(g, jetons, i, e.mesOutils, e.maintenant)).join(''),
    sousTitre: sousTitre(e.q, visibles.length, e.totaux),
    aucun: visibles.length ? '' : aucunGuide(e.q, e.domaine, voisins),
  };
}

/** Aperçu à montrer dans le héros : le guide qui correspond à la recherche, sinon le premier aperçu. */
export function apercuActif(
  q: string,
  visibles: GuideResumeApi[],
  enApercu: GuideResumeApi[],
  guides: GuideResumeApi[],
): string {
  if (!q) return enApercu[0]?.slug ?? guides[0]?.slug ?? '';
  return visibles[0]?.slug ?? 'none';
}

/** Outil du référentiel, tel que « Mes outils » le présente. */
export type OutilChoisi = OutilResumeApi;

/** Bouton « Mes outils » (prototype : myToolsHTML). */
export function boutonMesOutils(
  selection: string[],
  outils: Map<string, OutilChoisi>,
  compact = false,
): string {
  const choisis = selection.flatMap((slug) => outils.get(slug) ?? []);
  if (!choisis.length)
    return `<button class="ex-mytools-btn" type="button" data-open-tools>${icone('wrench')}<span>Indiquer mes outils</span></button>`;
  const max = compact ? 3 : 5;
  return `<button class="ex-mytools-btn is-set" type="button" data-open-tools aria-label="${esc(`Mes outils : ${choisis.map((o) => o.nom).join(', ')}. Modifier`)}">${icone('wrench')}<span>Mes outils</span><span class="ex-stack" aria-hidden="true">${choisis
    .slice(0, max)
    .map((o) => logo(o, 18))
    .join(
      '',
    )}</span>${choisis.length > max ? `<small>+${choisis.length - max}</small>` : ''}<span class="ex-mytools-edit">Modifier</span></button>`;
}
