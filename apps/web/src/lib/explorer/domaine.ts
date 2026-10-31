import type { DomainePageApi, TypeCreation } from '@vysora/shared';
import { LIBELLES_TYPE } from '../creations';
import { ROUTES } from '../navigation';
import {
  avatar,
  esc,
  etiquetteType,
  fmt,
  icone,
  image,
  jourRelatif,
  ligneOutils,
  logo,
  part,
  pluriel,
  prenom,
  surtitre,
  t,
} from './elements';
import { forme, GENRES_SUJET, NIVEAUX, preuve, trace } from './guide';
import { ligneGuide } from './index-guides';

/* Page d'un domaine d'Explorer (S-06, prototype categorie.js) : ses guides, les pièges qui reviennent,
   les outils qui ont fait leurs preuves, tous ses parcours, de quoi s'entraîner et ce qui manque.
   Le serveur rend la page avec ces fonctions ; le script les reprend quand un filtre change. */

/** Parcours affichés d'un coup (prototype : PAGE). */
export const PAR_PAGE = 9;

export type TypeFiltre = 'tous' | TypeCreation;
export type TriDomaine = 'reproduits' | 'utiles' | 'recents';
export type CleSectionDomaine = 'guides' | 'pieges' | 'outils' | 'parcours' | 'pratique' | 'manque';

/** Ordre retenu : les guides d'abord (prototype : réglage « order », valeur par défaut). */
export const SECTIONS_DOMAINE: CleSectionDomaine[] = [
  'guides',
  'pieges',
  'outils',
  'parcours',
  'pratique',
  'manque',
];
const SECTIONS: Record<CleSectionDomaine, { libelle: string; surtitre: [string, string] }> = {
  guides: { libelle: 'Guides', surtitre: ['route', 'Guides'] },
  pieges: { libelle: 'Pièges', surtitre: ['moment', 'Pièges'] },
  outils: { libelle: 'Outils', surtitre: ['wrench', 'Outils'] },
  parcours: { libelle: 'Parcours', surtitre: ['layers', 'Parcours'] },
  pratique: { libelle: 'S’entraîner', surtitre: ['bulb', 'S’entraîner'] },
  manque: { libelle: 'À documenter', surtitre: ['flag', 'À documenter'] },
};

/** Ce que la page affiche : données de l'API, filtres des parcours et outils de la personne. */
export interface EtatDomaine {
  page: DomainePageApi;
  maintenant: Date;
  type: TypeFiltre;
  tri: TriDomaine;
  /** « Avec mes outils » : parcours qui emploient ou ont reproduit un de ses outils. */
  avecMesOutils: boolean;
  affiches: number;
  /** Tous les pièges, ou les quatre plus fréquents. */
  tousLesPieges: boolean;
  mesOutils: Set<string>;
}

const adresseDomaine = (slug: string) => `/categories/${encodeURIComponent(slug)}`;
const adresseCreation = (c: { id: number; slug: string | null }) => ROUTES.creation(c.id, c.slug);

/** Navigation entre domaines (barre latérale et rail mobile). */
export function navigationDomaines(page: DomainePageApi): string {
  return page.domaines
    .map(
      (d) =>
        `<li><a href="${esc(adresseDomaine(d.slug))}"${d.slug === page.domaine.slug ? ' aria-current="page"' : ''}>${icone(d.icone ?? 'compass')}<span>${t(d.libelle)}</span><small>${fmt(d.parcours)}</small></a></li>`,
    )
    .join('');
}

/** Chiffres de l'en-tête (prototype : renderHead). */
export function chiffresDomaine(page: DomainePageApi): string {
  const nbGuides = page.guides.length + page.guidesLies.length;
  const nbParcours = page.parcours.length;
  const { reproductions, tauxReussite, auteurs } = page.chiffres;
  const chiffres: [number | string, string][] = [
    [nbGuides, nbGuides > 1 ? 'guides par objectif' : 'guide par objectif'],
    [nbParcours, nbParcours > 1 ? 'parcours documentés' : 'parcours documenté'],
    [reproductions, reproductions > 1 ? 'reproductions déclarées' : 'reproduction déclarée'],
    tauxReussite !== null
      ? [`${tauxReussite} %`, 'de reproductions réussies']
      : [auteurs, auteurs > 1 ? 'membres contributeurs' : 'membre contributeur'],
  ];
  return chiffres
    .map(
      ([valeur, libelle]) =>
        `<div><dt>${t(libelle)}</dt><dd>${typeof valeur === 'number' ? fmt(valeur) : t(valeur)}</dd></div>`,
    )
    .join('');
}

/** Mosaïque de l'en-tête : quatre parcours, ceux qui ont une image d'abord, puis les plus utiles. */
export function mosaique(page: DomainePageApi): { nombre: number; html: string } {
  const choisis = page.parcours
    .toSorted(
      (a, b) =>
        Number(Boolean(b.couverture)) - Number(Boolean(a.couverture)) || b.utiles - a.utiles,
    )
    .filter((c) => c.couverture)
    .slice(0, 4);
  if (!choisis.length) return { nombre: 0, html: '' };
  return {
    nombre: choisis.length,
    html: `<ul>${choisis
      .map((c, i) => {
        const outil = c.outils[0];
        const modele = outil
          ? outil.modele
            ? `${outil.outil.nom} · ${outil.modele}`
            : outil.outil.nom
          : '';
        return `<li style="--i:${i}"><a class="dm-tile" href="${esc(adresseCreation(c))}"><span class="dm-tile-media">${image(c.couverture, i === 0 ? '(min-width: 1180px) 420px, 60vw' : '(min-width: 1180px) 220px, 32vw')}</span><span class="dm-tile-cap"><b>${t(c.titre)}</b><span>${t([prenom(c.auteur.nom), modele].filter(Boolean).join(' · '))}</span></span></a></li>`;
      })
      .join('')}</ul>`,
  };
}

export const sommaireDomaine = (): string =>
  SECTIONS_DOMAINE.map(
    (cle) => `<li><a href="#${cle}" data-jump="${cle}">${t(SECTIONS[cle].libelle)}</a></li>`,
  ).join('');

function guides(e: EtatDomaine): string {
  const { page } = e;
  const lignes = (liste: DomainePageApi['guides']) =>
    `<ol class="ex-guides">${liste.map((g, i) => ligneGuide(g, [], i, e.mesOutils, e.maintenant)).join('')}</ol>`;
  const propres = page.guides;
  const lies = page.guidesLies;
  return `<h2 tabindex="-1">${propres.length ? 'Les guides de ce domaine' : 'Les guides qui abordent ce domaine'}</h2>
      <p class="ex-section-intro">Chaque guide rassemble les parcours d’un même objectif : la méthode qui ressort, les pièges à anticiper et les outils déjà testés.</p>
      <div class="ex-section-body">
        ${propres.length ? lignes(propres) : ''}
        ${lies.length ? `${propres.length ? `<h3 class="dm-sub">Ce domaine compte aussi dans ${lies.length > 1 ? 'ces guides' : 'ce guide'}</h3>` : ''}${lignes(lies)}` : ''}
        ${!propres.length && !lies.length ? `<p class="ex-empty-note">${t(`Aucun guide pour ${page.domaine.libelle.toLowerCase()} pour l’instant. Le premier parcours publié ouvre le guide.`)}</p>` : ''}
      </div>`;
}

function pieges(e: EtatDomaine): string {
  const liste = e.page.pieges;
  if (!liste.length)
    return `<h2 tabindex="-1">Ce qui revient dans tout le domaine</h2><div class="ex-section-body"><p class="ex-empty-note">Aucun piège signalé pour l’instant.</p></div>`;
  const visibles = e.tousLesPieges ? liste : liste.slice(0, 4);
  return `<h2 tabindex="-1">Ce qui revient dans tout le domaine</h2>
      <p class="ex-section-intro">Les pièges signalés dans les guides du domaine, du plus fréquent au plus rare, avec ce qui a permis de les dépasser.</p>
      <div class="ex-section-body">
        <ol class="ex-pits dm-pits">${visibles
          .map(
            (p, i) => `<li class="ex-pit${i >= 4 ? ' xp-enter' : ''}" style="--i:${i - 4}">
            <div class="ex-pit-head"><span class="ex-ring" aria-hidden="true"></span><h3>${t(p.titre)}</h3></div>
            ${part(p.signale, p.total)}
            <p class="ex-fix"><b>Ce qui a fonctionné :</b> ${t(p.solution)}</p>
            <p class="ex-pit-more"><a class="link-btn" href="${esc(ROUTES.guide(p.guide.slug))}#piege-${p.rang + 1}">${icone('route')}${t(`Guide « ${p.guide.titreCourt} »`)}</a>${p.sujet ? `<a class="link-btn" href="${esc(ROUTES.sujet(p.sujet.id, p.sujet.slug))}">${icone('message')}Lire la discussion</a>` : ''}</p>
          </li>`,
          )
          .join('')}</ol>
        ${liste.length > 4 ? `<button class="btn btn-secondary btn-sm dm-more" type="button" data-more-pits aria-expanded="${e.tousLesPieges}">${e.tousLesPieges ? 'Afficher les pièges les plus fréquents' : `Afficher ${pluriel(liste.length - 4, 'autre piège', 'autres pièges')}`}</button>` : ''}
      </div>`;
}

function outils(e: EtatDomaine): string {
  const { modeles } = e.page;
  const max = Math.max(1, ...modeles.map((m) => new Set([...m.employe, ...m.reproduit]).size));
  return `<h2 tabindex="-1">Les outils qui ont fait leurs preuves</h2>
      <p class="ex-section-intro">Pour chaque outil : les parcours du domaine qui l’emploient et ceux que d’autres membres ont reproduits avec succès grâce à lui.</p>
      <div class="ex-section-body">
        <ol class="dm-tools">${modeles
          .map((m, i) => {
            const mien = e.mesOutils.has(m.outil.slug);
            const employeW = ((m.employe.length / max) * 100).toFixed(1);
            const seulementReproduit = m.reproduit.filter((id) => !m.employe.includes(id)).length;
            const reproduitW = ((seulementReproduit / max) * 100).toFixed(1);
            return `<li class="dm-tool${mien ? ' is-mine' : ''}">
            <span class="dm-tool-rank" aria-hidden="true">${i + 1}</span>
            <span class="dm-tool-name">${logo(m.outil, 22)}<span>${t(m.cle)}</span>${mien ? '<small>Votre outil</small>' : ''}</span>
            <span class="dm-tool-bar" aria-hidden="true"><i class="is-used" style="--w:${employeW}%"></i><i class="is-tested" style="--w:${reproduitW}%"></i></span>
            <span class="dm-tool-stats">${m.employe.length ? `<span>Choisi dans ${pluriel(m.employe.length, 'parcours', 'parcours')}</span>` : ''}${m.reproduit.length ? `<span>Reproduit avec succès sur ${pluriel(m.reproduit.length, 'parcours', 'parcours')}</span>` : ''}${m.derniere ? `<small>${t(`Dernière réussite ${jourRelatif(m.derniere, e.maintenant)}`)}</small>` : ''}</span>
          </li>`;
          })
          .join('')}</ol>
        ${modeles.length ? '<p class="dm-tools-legend" aria-hidden="true"><span><i class="is-used"></i>Choisi par l’auteur du parcours</span><span><i class="is-tested"></i>Reproduit avec succès par un autre membre</span></p>' : '<p class="ex-empty-note">Aucun outil documenté pour l’instant.</p>'}
      </div>`;
}

const TRIEURS: Record<
  TriDomaine,
  (a: DomainePageApi['parcours'][number], b: DomainePageApi['parcours'][number]) => number
> = {
  reproduits: (a, b) => b.reproductions.reussies - a.reproductions.reussies || b.utiles - a.utiles,
  utiles: (a, b) => b.utiles - a.utiles,
  recents: (a, b) => b.datePublication.localeCompare(a.datePublication),
};

/** Parcours retenus par les filtres (prototype : filteredItems). */
export function parcoursFiltres(e: EtatDomaine): DomainePageApi['parcours'] {
  const outilsReproduits = new Map(
    e.page.modeles.map((m) => [m.outil.slug, new Set(m.reproduit)] as const),
  );
  return e.page.parcours
    .filter((c) => e.type === 'tous' || c.type === e.type)
    .filter(
      (c) =>
        !e.avecMesOutils ||
        c.outils.some((o) => e.mesOutils.has(o.outil.slug)) ||
        [...e.mesOutils].some((slug) => outilsReproduits.get(slug)?.has(c.id)),
    )
    .toSorted(TRIEURS[e.tri]);
}

function carte(c: DomainePageApi['parcours'][number], i: number, iconeDomaine: string): string {
  return `<li class="dm-card xp-enter" style="--i:${Math.min(i % PAR_PAGE, 8)}">
      <a class="dm-card-media" href="${esc(adresseCreation(c))}" tabindex="-1" aria-hidden="true">${c.couverture ? image(c.couverture, '(min-width: 1180px) 300px, (min-width: 760px) 45vw, 92vw') : `<span class="dm-card-vide">${icone(iconeDomaine, '')}</span>`}</a>
      <div class="dm-card-body">
        <p class="ex-run-meta dm-card-meta">${etiquetteType(c.type)}${c.guide ? `<a href="${esc(ROUTES.guide(c.guide.slug))}">${t(c.guide.titreCourt)}</a>` : ''}</p>
        <h3><a href="${esc(adresseCreation(c))}">${t(c.titre)}</a></h3>
        <p class="ex-run-who">${avatar(c.auteur, 22)}<span>${t(c.auteur.nom)} <small>· ${t(c.auteur.niveau.libelle)}</small></span></p>
        <p class="ex-run-tools">${ligneOutils(c.outils)}</p>
        <div class="dm-card-foot"><span class="dm-card-shape">${trace(c)}<span>${t(forme(c))}</span></span>${preuve(c)}</div>
        ${c.obsolescence ? `<p class="ex-warn">${icone('alert')}${t(`Signalé comme ne fonctionnant plus avec ${c.obsolescence.modele}`)}</p>` : ''}
      </div>
    </li>`;
}

function parcours(e: EtatDomaine): string {
  const tous = e.page.parcours;
  const comptes: Record<TypeFiltre, number> = {
    tous: tous.length,
    UN_PROMPT: tous.filter((c) => c.type === 'UN_PROMPT').length,
    ITERATION: tous.filter((c) => c.type === 'ITERATION').length,
    PROJET: tous.filter((c) => c.type === 'PROJET').length,
  };
  const types = (['tous', 'UN_PROMPT', 'ITERATION', 'PROJET'] as TypeFiltre[]).filter(
    (cle) => cle === 'tous' || comptes[cle],
  );
  const liste = parcoursFiltres(e);
  const aDesOutils = e.mesOutils.size > 0;
  const avecOutils = e.avecMesOutils && aDesOutils;
  return `<h2 tabindex="-1">Tous les parcours du domaine</h2>
      <p class="ex-section-intro">Les créations documentées pas à pas, avec leurs prompts, leurs moments clés et leurs reproductions.</p>
      <div class="ex-section-body">
        <div class="dm-filters">
          <div class="dm-types" role="group" aria-label="Type de parcours">${types.map((cle) => `<button type="button" data-type="${cle}" aria-pressed="${e.type === cle}">${t(cle === 'tous' ? 'Tous' : LIBELLES_TYPE[cle])}<small>${comptes[cle]}</small></button>`).join('')}</div>
          <button class="dm-mine" type="button" data-mine aria-pressed="${avecOutils}">${icone(avecOutils ? 'check' : 'wrench')}<span>${aDesOutils ? 'Avec mes outils' : 'Indiquer mes outils'}</span></button>
          <label class="ex-sort"><span>Trier par</span><select data-sort>
            <option value="reproduits"${e.tri === 'reproduits' ? ' selected' : ''}>Les plus reproduits</option>
            <option value="utiles"${e.tri === 'utiles' ? ' selected' : ''}>Les plus utiles</option>
            <option value="recents"${e.tri === 'recents' ? ' selected' : ''}>Les plus récents</option>
          </select>${icone('chevron-down')}</label>
        </div>
        <p class="dm-count" role="status" aria-live="polite">${liste.length ? pluriel(liste.length, 'parcours affiché', 'parcours affichés') : ''}</p>
        ${
          liste.length
            ? `<ul class="dm-cards">${liste
                .slice(0, e.affiches)
                .map((c, i) => carte(c, i, e.page.domaine.icone ?? 'layers'))
                .join('')}</ul>`
            : `<div class="dm-none"><p>Aucun parcours ne correspond à ces critères.</p><button class="link-btn" type="button" data-reset-filters>${icone('replay')}Afficher tous les parcours</button></div>`
        }
        ${liste.length > e.affiches ? `<div class="dm-load"><button class="btn btn-secondary" type="button" data-load-more>Afficher ${pluriel(Math.min(PAR_PAGE, liste.length - e.affiches), 'autre parcours', 'autres parcours')}</button><span>${e.affiches} sur ${liste.length}</span></div>` : ''}
      </div>`;
}

function pratique(e: EtatDomaine): string {
  const { cas, sujets, domaine } = e.page;
  return `<h2 tabindex="-1">S’entraîner dans ce domaine</h2>
      <p class="ex-section-intro">Des cas Bon réflexe tirés de situations réelles, et les questions que se pose la communauté.</p>
      <div class="ex-section-body dm-practice">
        <div>
          <h3 class="dm-sub">Cas Bon réflexe</h3>
          ${
            cas.length
              ? `<ul class="dm-cases">${cas
                  .map((c) => {
                    const [niveau, libelle] = NIVEAUX[c.difficulte];
                    const adresse = c.guide
                      ? `${ROUTES.guide(c.guide)}&cas=${c.id}#pratique`
                      : ROUTES.casBonReflexe(c.id, c.slug);
                    return `<li class="dm-case">
              <p class="ex-case-meta"><span class="level" data-level="${niveau}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${libelle}</span>${c.dureeMinutes ? `<span>${icone('clock')}${c.dureeMinutes} min</span>` : ''}<span>${t(`${c.reussite} % de bonnes réponses`)}</span></p>
              <h4><a href="${esc(adresse)}">${t(c.titre)}</a></h4>
              <p class="dm-case-context">${t(c.contexte)}</p>
              <span class="dm-case-go" aria-hidden="true">Faire le cas${icone('arrow')}</span>
            </li>`;
                  })
                  .join('')}</ul>`
              : `<p class="ex-empty-note">${t(`Aucun cas pour ${domaine.libelle.toLowerCase()} pour l’instant.`)} <a href="${ROUTES.bonReflexe}">Voir tous les cas</a></p>`
          }
        </div>
        <div class="ex-practice-topics">
          <h3 class="dm-sub">Questions de la communauté</h3>
          ${
            sujets.length
              ? `<ul>${sujets
                  .slice(0, 5)
                  .map((s) => {
                    const genre = GENRES_SUJET[s.type];
                    return `<li><p class="ex-topic-kind">${icone(genre.icone)}${t(genre.libelle)}${s.etat === 'RESOLU' ? `<span class="ex-resolved">${icone('check-circle')}Résolu</span>` : s.reponses === 0 ? '<span class="ex-open">Sans réponse</span>' : ''}</p><a href="${esc(ROUTES.sujet(s.id, s.slug))}">${t(s.titre)}</a><p class="ex-topic-meta">${avatar(s.auteur, 20)}${t(`${s.auteur.nom} · ${pluriel(s.reponses, 'réponse', 'réponses')}`)}</p></li>`;
                  })
                  .join('')}</ul>`
              : '<p class="ex-empty-note">Aucune question sur ce domaine pour l’instant.</p>'
          }
          <a class="btn btn-secondary btn-sm" href="${ROUTES.nouveauSujet}">Poser une question</a>
        </div>
      </div>`;
}

/** « Objectifs recherchés » (prototype : missingHTML), mis à jour après « Je le cherche aussi ». */
export function demandesDomaine(page: DomainePageApi): string {
  return page.demandes.length
    ? `<ol class="ex-requests-list">${page.demandes
        .map(
          (d) => `<li>
              <div class="ex-req-text"><span class="ex-req-query">${t(d.libelle)}</span><span class="ex-req-count">${t(`${pluriel(d.soutiens, 'personne le cherche', 'personnes le cherchent')} ce mois-ci`)}</span></div>
              <div class="ex-req-actions"><button class="ex-want" type="button" aria-pressed="${d.soutenue}" data-want="${d.id}">${icone(d.soutenue ? 'check' : 'plus')}<span>${d.soutenue ? 'Vous le cherchez aussi' : 'Je le cherche aussi'}</span></button></div>
            </li>`,
        )
        .join('')}</ol>`
    : '<p class="ex-empty-note">Aucun objectif en attente dans ce domaine : chaque demande a déjà son guide.</p>';
}

function manque(e: EtatDomaine): string {
  const { lacunes } = e.page;
  return `<h2 tabindex="-1">Ce qui manque encore</h2>
      <p class="ex-section-intro">Les objectifs que la communauté cherche dans ce domaine et les situations que les guides ne couvrent pas encore. Un parcours publié sur l’un d’eux comble le manque.</p>
      <div class="ex-section-body dm-missing">
        <div>
          <h3 class="dm-sub">Objectifs recherchés</h3>
          <div data-dm-demandes>${demandesDomaine(e.page)}</div>
        </div>
        <div>
          <h3 class="dm-sub">À compléter dans les guides</h3>
          ${lacunes.length ? `<ul class="dm-gaps">${lacunes.map(({ texte, guide }) => `<li>${icone('flag')}<span>${t(texte)}<a href="${esc(ROUTES.guide(guide.slug))}#manque">${t(guide.titreCourt)}</a></span></li>`).join('')}</ul>` : '<p class="ex-empty-note">Les guides de ce domaine couvrent les cas courants. Un parcours avec un autre outil ou un autre contexte les enrichirait encore.</p>'}
          <a class="btn btn-primary" href="${ROUTES.publier}">Publier un parcours${icone('arrow')}</a>
        </div>
      </div>`;
}

function voisins(page: DomainePageApi): string {
  const parSlug = new Map(page.domaines.map((d) => [d.slug, d]));
  const liste = page.voisins.flatMap((slug) => parSlug.get(slug) ?? []);
  if (!liste.length) return '';
  return `<div class="ex-related dm-neighbours"><h3>Domaines voisins</h3><ul>${liste
    .map(
      (o) =>
        `<li><a href="${esc(adresseDomaine(o.slug))}"><span class="ex-related-domain">${icone(o.icone ?? 'compass')}${pluriel(o.parcours, 'parcours', 'parcours')}</span><span class="ex-related-title">${t(o.libelle)}</span><span class="ex-related-meta">${t(o.description ?? '')}</span>${icone('arrow')}</a></li>`,
    )
    .join('')}</ul></div>`;
}

const RENDUS: Record<CleSectionDomaine, (e: EtatDomaine) => string> = {
  guides,
  pieges,
  outils,
  parcours,
  pratique,
  manque,
};

/** Contenu d'une section, sans son conteneur (le script la remplace quand un filtre change). */
export function corpsSection(cle: CleSectionDomaine, e: EtatDomaine): string {
  const [nom, libelle] = SECTIONS[cle].surtitre;
  return `${surtitre(nom, libelle)}${RENDUS[cle](e)}`;
}

/** Toutes les sections, puis les domaines voisins. */
export function sectionsDomaine(e: EtatDomaine): string {
  return (
    SECTIONS_DOMAINE.map(
      (cle) =>
        `<section class="ex-section" id="${cle}" data-section="${cle}">${corpsSection(cle, e)}</section>`,
    ).join('') + voisins(e.page)
  );
}
