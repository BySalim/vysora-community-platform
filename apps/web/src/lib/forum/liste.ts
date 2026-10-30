import type { ListeSujetsApi, MembreResumeApi, SujetResumeApi } from '@vysora/shared';
import { avatar, icone, logo, prenom } from '../explorer/elements';
import { decouper, surligner } from '../explorer/recherche';
import { ROUTES } from '../navigation';
import { esc, fmt, pluriel, t, typo } from '../texte';
import {
  ONGLETS,
  ORDRE_TYPES,
  TRIS_FILTRE,
  TYPES,
  ecrireAdresse,
  filtresActifs,
  libelleType,
  lireRecherche,
  type EtatListe,
} from './donnees';
import { ilYA } from './dates';

/* Liste des sujets du forum, reprise de prototype/forum.js (renderMenu, summaryHTML, filterPanelHTML,
   activeFilters, renderQuestions, sideHTML). Le serveur rend la page avec ces fonctions. */

export interface ContexteListe {
  etat: EtatListe;
  liste: ListeSujetsApi | null;
  maintenant: Date;
  /** Membre connecté : « avez répondu », menu « Pour vous ». */
  moi: { id: number; pseudo: string } | null;
  /** Noms affichés pour le titre et les puces (outil, membre filtrés). */
  noms: { outil?: string; membre?: string };
  /** Menu « Pour vous » : sujets du membre et sujets enregistrés. */
  pourVous: { mesSujets: number; enregistres: number } | null;
}

/** Texte lisible d'un extrait en Markdown : sans balises de mise en forme. */
export function texteSimple(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Première phrase d'un texte (prototype : firstSentence). */
export function premierePhrase(texte: string): string {
  const propre = typo(texteSimple(texte));
  return propre.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? propre;
}

const lienMembre = (membre: Pick<MembreResumeApi, 'pseudo'>): string =>
  ecrireAdresse({ ...etatSansFiltre(), membre: membre.pseudo });

function etatSansFiltre(): EtatListe {
  return {
    onglet: 'recentes',
    q: '',
    etiquette: '',
    outil: '',
    membre: '',
    page: 1,
    filtres: {
      sansReponse: false,
      sansReponseAcceptee: false,
      avecPrompt: false,
      mesOutils: [],
      types: [],
      tri: '',
    },
  };
}

/** Nom d'un outil et de son modèle (prototype : fullModel) : « Claude Sonnet 4.5 », « GPT-5 ». */
export function nomComplet(outil: string, modele: string | null): string {
  if (!modele) return outil;
  if (/^(GPT|DALL)/.test(modele) || outil === 'Le Chat') return modele;
  return `${outil} ${modele}`;
}

/** Outil et étiquettes d'un sujet (prototype : tagsHTML). */
export function etiquettesHTML(
  sujet: Pick<SujetResumeApi, 'outil' | 'modele' | 'etiquettes'>,
  max = 5,
): string {
  const outil = sujet.outil
    ? `<li><a class="qa-tag is-tool" href="${esc(ecrireAdresse({ ...etatSansFiltre(), outil: sujet.outil.slug }))}">${logo(sujet.outil, 14)}${t(nomComplet(sujet.outil.nom, sujet.modele))}</a></li>`
    : '';
  const etiquettes = sujet.etiquettes
    .slice(0, max)
    .map(
      (e) =>
        `<li><a class="qa-tag" href="${esc(ecrireAdresse({ ...etatSansFiltre(), etiquette: e.slug }))}">${t(e.libelle.toLowerCase())}</a></li>`,
    )
    .join('');
  return `<ul class="qa-tags" aria-label="Étiquettes">${outil}${etiquettes}</ul>`;
}

/** Un sujet de la liste (prototype : summaryHTML). */
export function resumeHTML(
  sujet: SujetResumeApi,
  jetons: string[][],
  c: Pick<ContexteListe, 'maintenant' | 'moi'>,
): string {
  const n = sujet.reponses;
  const votes = sujet.utiles;
  const reproductions = sujet.testes;
  const aRepondu = n > 0 && sujet.derniereActivite.date !== sujet.date;
  const acteur = aRepondu ? sujet.derniereActivite.membre : sujet.auteur;
  const moi = c.moi?.id === acteur.id;
  const action = aRepondu
    ? moi
      ? 'avez répondu'
      : 'a répondu'
    : moi
      ? TYPES[sujet.type].aPose.replace(/^a /, 'avez ')
      : TYPES[sujet.type].aPose;
  const quand = aRepondu ? sujet.derniereActivite.date : sujet.date;
  const resolu = sujet.etat === 'RESOLU';
  const adresse = ROUTES.sujet(sujet.id, sujet.slug);
  return `<li class="qa-summary">
      <div class="qa-stats">
        <span class="qa-stat"><b>${fmt(votes)}</b> ${votes > 1 ? 'votes' : 'vote'}</span>
        <span class="qa-stat is-answers${resolu ? ' is-accepted' : n ? ' has-answers' : ''}">${resolu ? icone('accept') : ''}<b>${fmt(n)}</b> ${n > 1 ? 'réponses' : 'réponse'}</span>
        ${reproductions ? `<span class="qa-stat is-tested"><b>${fmt(reproductions)}</b> ${reproductions > 1 ? 'reproductions' : 'reproduction'}</span>` : ''}
      </div>
      <div class="qa-sum-main">
        <h3 class="qa-sum-title"><a href="${esc(adresse)}">${surligner(sujet.titre, jetons)}</a></h3>
        <p class="qa-sum-excerpt">${esc(premierePhrase(sujet.extrait))}${sujet.solution ? ` <span class="qa-sum-solution">${icone('accept')}Solution de ${t(prenom(sujet.solution.auteur.nom))}</span>` : ''}</p>
        <div class="qa-sum-foot">
          <span class="qa-kind">${icone(TYPES[sujet.type].icone)}${t(libelleType(sujet.type))}</span>${sujet.etat === 'FERME' ? `<span class="qa-kind is-closed">${icone('lock')}Fermé</span>` : ''}
          ${etiquettesHTML(sujet, 3)}
          <p class="qa-sum-user">${avatar(acteur, 18)}<a href="${esc(lienMembre(acteur))}">${t(acteur.nom)}</a><span class="qa-rep" title="Réputation">${moi ? '' : fmt(acteur.reputation)}</span><span class="qa-sum-when">${t(action)} ${t(ilYA(quand, c.maintenant))}</span></p>
        </div>
      </div>
    </li>`;
}

/** Menu du forum (prototype : renderMenu). Les vues « Étiquettes » et « Membres » attendent FORUM-03. */
export function menuHTML(c: Pick<ContexteListe, 'etat' | 'liste' | 'pourVous' | 'moi'>): string {
  const element = (
    href: string,
    libelle: string,
    nomIcone: string,
    nombre: number | null,
    actif: boolean,
  ) =>
    `<li><a href="${esc(href)}"${actif ? ' aria-current="page"' : ''}>${icone(nomIcone)}<span>${t(libelle)}</span>${nombre !== null ? `<small>${fmt(nombre)}</small>` : ''}</a></li>`;
  const sansReponse = c.etat.onglet === 'sans-reponse';
  const pourVous = c.pourVous;
  const lignesPourVous =
    pourVous && c.moi && (pourVous.mesSujets || pourVous.enregistres)
      ? `<p class="qa-menu-label">Pour vous</p><ul>
        ${pourVous.mesSujets ? element(lienMembre(c.moi), 'Vos sujets', 'user', pourVous.mesSujets, false) : ''}
        ${pourVous.enregistres ? element(`${ROUTES.mesContenus}?onglet=enregistres`, 'Enregistrés', 'bookmark', pourVous.enregistres, false) : ''}
      </ul>`
      : '';
  return `
      <ul>
        ${element(ROUTES.forum, 'Questions', 'message', null, !sansReponse)}
        ${element(ROUTES.forumSansReponse, 'Sans réponse', 'clock', c.liste?.enAttente ?? null, sansReponse)}
      </ul>
      ${lignesPourVous}
      <a class="qa-menu-guide" href="${ROUTES.explorer}">${icone('route')}<span><b>Les guides d’Explorer</b>La méthode qui ressort des parcours, piège par piège.</span></a>`;
}

/** Panneau « Filtrer » (prototype : filterPanelHTML), envoyé par le script. */
export function panneauFiltreHTML(etat: EtatListe, aDesOutils: boolean): string {
  const f = etat.filtres;
  const caseACocher = (attribut: string, coche: boolean, libelle: string) =>
    `<label class="ex-check"><input type="checkbox" ${attribut}${coche ? ' checked' : ''}><span class="ex-box" aria-hidden="true">${icone('check', '')}</span><span>${t(libelle)}</span></label>`;
  return `<form class="qa-filter" data-filter-form aria-label="Filtrer les sujets">
      <fieldset><legend>Afficher</legend>${caseACocher('data-f="sansReponse"', f.sansReponse, 'Sans réponse')}${caseACocher('data-f="sansReponseAcceptee"', f.sansReponseAcceptee, 'Sans réponse acceptée')}${caseACocher('data-f="avecPrompt"', f.avecPrompt, 'Avec un prompt corrigé')}${aDesOutils ? caseACocher('data-f="mesOutils"', f.mesOutils.length > 0, 'Sur mes outils') : ''}</fieldset>
      <fieldset><legend>Type de sujet</legend>${ORDRE_TYPES.map((type) => caseACocher(`data-f-type="${TYPES[type].cle}"`, f.types.includes(type), TYPES[type].pluriel)).join('')}</fieldset>
      <fieldset><legend>Trier par</legend>${TRIS_FILTRE.map(([cle, libelle]) => `<label class="qa-radio"><input type="radio" name="qa-sort" value="${cle}"${f.tri === cle ? ' checked' : ''}><span>${t(libelle)}</span></label>`).join('')}</fieldset>
      <div class="qa-filter-actions"><button class="btn btn-primary btn-sm" type="submit">Appliquer le filtre</button><button class="link-btn" type="button" data-filter-cancel>Annuler</button>${aDesOutils ? '' : `<button class="link-btn" type="button" data-open-tools>${icone('wrench')}Indiquer mes outils</button>`}</div>
    </form>`;
}

/** Titre de la liste (prototype : heading de renderQuestions). */
export function titreListe(etat: EtatListe, noms: ContexteListe['noms']): string {
  if (etat.q) return 'Résultats de recherche';
  if (etat.etiquette) return `Sujets étiquetés [${etat.etiquette}]`;
  if (etat.outil) return `Sujets sur ${noms.outil ?? etat.outil}`;
  if (etat.membre) return `Sujets de ${noms.membre ?? etat.membre}`;
  const [seul] = etat.filtres.types;
  if (seul && etat.filtres.types.length === 1) return TYPES[seul].pluriel;
  if (etat.onglet === 'sans-reponse') return 'Sujets sans réponse';
  return 'Tous les sujets';
}

/** Pagination (prototype : pager) : des liens, pour que chaque page ait son adresse. */
export function paginationHTML(etat: EtatListe, pages: number): string {
  if (pages <= 1) return '';
  const lien = (page: number, libelle: string, courant = false) =>
    `<a href="${esc(ecrireAdresse({ ...etat, page }))}"${courant ? ' aria-current="page"' : ''}>${t(libelle)}</a>`;
  const numeros = Array.from({ length: pages }, (_, i) =>
    lien(i + 1, String(i + 1), i + 1 === etat.page),
  );
  return `<nav class="qa-pager" aria-label="Pagination">${etat.page > 1 ? lien(etat.page - 1, 'Précédente') : ''}${numeros.join('')}${etat.page < pages ? lien(etat.page + 1, 'Suivante') : ''}</nav>`;
}

/** Partie principale de la liste (prototype : renderQuestions, sans la colonne). */
export function listeHTML(c: ContexteListe): string {
  const { etat, liste } = c;
  const titre = titreListe(etat, c.noms);
  const filtres = filtresActifs(etat, c.noms);
  const jetons = decouper(lireRecherche(etat.q).texte);
  const total = liste?.total ?? 0;
  const sujets = liste?.elements ?? [];
  const introEtiquette = etat.outil
    ? `<p class="qa-tag-intro">${t(`Les questions et astuces sur ${c.noms.outil ?? etat.outil}, toutes versions confondues.`)} <button class="link-btn" type="button" data-open-tools>Suivre cet outil</button></p>`
    : etat.etiquette
      ? '<p class="qa-tag-intro">Les sujets qui portent cette étiquette, du plus récent au plus ancien.</p>'
      : '';
  const vide = liste
    ? `<div class="qa-empty"><p><b>Aucun sujet ne correspond.</b> ${etat.q ? t(`Personne n’a encore écrit sur « ${etat.q} ».`) : 'Élargissez les filtres.'} Posez la question : les membres qui utilisent le même outil la verront.</p><div><a class="btn btn-secondary btn-sm" href="${ROUTES.forum}">${icone('replay')}Voir tous les sujets</a><a class="btn btn-primary btn-sm" href="${ROUTES.nouveauSujet}" data-prefill>${icone('plus')}Poser une question</a></div></div>`
    : `<div class="qa-empty"><p><b>Le forum est momentanément indisponible.</b> Réessayez dans un instant.</p></div>`;
  return `
      <div class="qa-main">
        <header class="qa-list-head">
          <div class="qa-list-title"><h1 id="qa-title" tabindex="-1">${t(titre)}</h1><a class="btn btn-primary" href="${ROUTES.nouveauSujet}">${icone('plus')}Poser une question</a></div>
          ${introEtiquette}
          <form class="qa-search" role="search" action="${ROUTES.forum}" data-search>
            <label class="sr-only" for="qa-q">Rechercher dans le forum</label>
            ${icone('search', '')}
            <input id="qa-q" name="q" type="search" autocomplete="off" spellcheck="false" value="${esc(etat.q)}" placeholder="Rechercher un sujet, ou [étiquette]" aria-describedby="qa-q-help">
            <kbd aria-hidden="true">/</kbd>
          </form>
          <p class="sr-only" id="qa-q-help">Entourez un mot de crochets pour chercher une étiquette.</p>
          <div class="qa-bar">
            <p class="qa-count" role="status" aria-live="polite">${t(pluriel(total, 'sujet', 'sujets'))}</p>
            <div class="qa-tabs" role="group" aria-label="Classer les sujets">${ONGLETS.map(([cle, libelle]) => `<button type="button" data-tab="${cle}" aria-pressed="${etat.onglet === cle}">${t(libelle)}</button>`).join('')}</div>
            <button class="qa-filter-btn" type="button" data-filter-toggle aria-expanded="false">${icone('filter')}<span>Filtrer</span>${filtres.length ? `<small>${fmt(filtres.length)}</small>` : ''}</button>
          </div>
          ${filtres.length ? `<div class="qa-active">${filtres.map((f) => `<span class="qa-chip">${t(f.libelle)}<button type="button" data-unfilter="${esc(f.cle)}" aria-label="${esc(`Retirer le filtre ${f.libelle}`)}">${icone('close')}</button></span>`).join('')}<a class="link-btn" href="${ROUTES.forum}" data-reset>Tout effacer</a></div>` : ''}
        </header>
        ${sujets.length ? `<ol class="qa-list">${sujets.map((s) => resumeHTML(s, jetons, c)).join('')}</ol>` : vide}
        ${paginationHTML(etat, liste?.pages ?? 1)}
      </div>`;
}

/** Colonne de la liste (prototype : sideHTML). « Les plus suivis », « Ils répondent le plus » et
    « Du forum aux guides » attendent leur API (FORUM-03) ; « Vos outils suivis » est rempli par le
    script, les outils suivis étant gardés par le navigateur. */
export function colonneHTML(): string {
  return `
      <section class="qa-box is-guide" aria-labelledby="qa-good-title">
        <h2 id="qa-good-title">${icone('scan')}Bien poser sa question</h2>
        <ol class="qa-steps-mini"><li>Copiez le prompt exact.</li><li>Décrivez le résultat obtenu et le résultat attendu.</li><li>Indiquez l’outil et la version du modèle.</li><li>Ajoutez une à cinq étiquettes.</li></ol>
        <a class="link-arrow" href="${ROUTES.nouveauSujet}?type=clinique">Ouvrir une clinique du prompt${icone('arrow')}</a>
      </section>
      <section class="qa-box" aria-labelledby="qa-watch-title" data-outils-suivis>
        <h2 id="qa-watch-title">${icone('wrench')}Vos outils suivis</h2>
        <p>Suivez vos outils : les questions qui les concernent apparaîtront ici.</p><button class="btn btn-secondary btn-sm" type="button" data-open-tools>${icone('plus')}Suivre des outils</button>
      </section>`;
}
