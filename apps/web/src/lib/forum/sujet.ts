import {
  accepteUneReponse,
  type MembreResumeApi,
  type MessageApi,
  type SujetApi,
  type TypeSujet,
} from '@vysora/shared';
import { avatar, icone, image, logo, prenom } from '../explorer/elements';
import { plier } from '../explorer/recherche';
import { rendreMarkdown, rendreMarkdownEnLigne } from '../markdown';
import { adresseCreation } from '../creations';
import { ROUTES } from '../navigation';
import { esc, fmt, pluriel, t } from '../texte';
import { ilYA } from './dates';
import { ecrireAdresse, etatVide, libelleType, TYPES } from './donnees';
import { etiquettesHTML, premierePhrase } from './liste';

/* Page d'un sujet du forum, reprise de prototype/forum.js (renderQuestion, opBlockHTML, fixHTML,
   answerHTML, voteColumn, usercard, composerHTML, diffWords). Le serveur la rend ; le script
   réagit aux votes, à l'acceptation, à la fermeture et au formulaire de réponse. */

/** Participe de publication par type (prototype : KINDS.posted). */
export const PUBLIE: Record<TypeSujet, string> = {
  QUESTION: 'Posée',
  CLINIQUE: 'Soumise',
  ASTUCE: 'Partagée',
  RETOUR_EXPERIENCE: 'Publié',
  DISCUSSION: 'Lancée',
};

/* Différences entre deux prompts, mot à mot (prototype : diffWords, diffHTML). */

interface Segment {
  type: 'same' | 'add' | 'del';
  mots: string[];
  avant: string[];
}

const normal = (mot: string): string => plier(mot).trim();

export function differences(a: string, b: string): Segment[] {
  const A = a.split(/\s+/).filter(Boolean);
  const B = b.split(/\s+/).filter(Boolean);
  const n = A.length;
  const m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = m - 1; j >= 0; j -= 1)
      L[i]![j] =
        normal(A[i]!) === normal(B[j]!)
          ? L[i + 1]![j + 1]! + 1
          : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const sortie: Segment[] = [];
  const pousser = (type: Segment['type'], mot: string, avant = mot) => {
    const dernier = sortie.at(-1);
    if (dernier?.type === type) {
      dernier.mots.push(mot);
      dernier.avant.push(avant);
    } else sortie.push({ type, mots: [mot], avant: [avant] });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (normal(A[i]!) === normal(B[j]!)) {
      pousser('same', B[j]!, A[i]!);
      i += 1;
      j += 1;
    } else if (L[i + 1]![j]! >= L[i]![j + 1]!) {
      pousser('del', A[i]!);
      i += 1;
    } else {
      pousser('add', B[j]!);
      j += 1;
    }
  }
  while (i < n) pousser('del', A[i++]!);
  while (j < m) pousser('add', B[j++]!);
  return sortie;
}

export function differencesHTML(
  a: string,
  b: string,
  montrer: { ajouts: boolean; retraits: boolean } = { ajouts: true, retraits: true },
): string {
  return differences(a, b)
    .map((s) => {
      if (s.type === 'same') return t((montrer.ajouts ? s.mots : s.avant).join(' '));
      const texte = t(s.mots.join(' '));
      if (s.type === 'add')
        return montrer.ajouts ? `<ins><span class="sr-only">Ajouté : </span>${texte}</ins>` : '';
      return montrer.retraits ? `<del><span class="sr-only">Retiré : </span>${texte}</del>` : '';
    })
    .filter(Boolean)
    .join(' ');
}

const LEGENDE =
  '<p class="qa-legend" aria-hidden="true"><span><ins>ajouté</ins></span><span><del>retiré</del></span></p>';

/** Bloc d'un prompt cité tel quel, avec « Copier » (prototype : promptBlock). */
export const blocPrompt = (texte: string, libelle: string): string =>
  `<div class="qa-prompt"><pre><code>${esc(texte)}</code></pre><button class="qa-copy" type="button" data-copy>${icone('copy')}<span>Copier<span class="sr-only"> ${t(libelle)}</span></span></button></div>`;

export interface ContexteSujet {
  sujet: SujetApi;
  maintenant: Date;
  /** Membre connecté. */
  moi: { id: number } | null;
  /** Invitation à se connecter (ou raison du refus) à la place du formulaire de réponse, ou vide. */
  invitationRepondre: string;
}

const lienMembre = (membre: Pick<MembreResumeApi, 'pseudo'>): string =>
  ecrireAdresse({ ...etatVide(), membre: membre.pseudo });

/** Carte de l'auteur (prototype : usercard). */
export function carteMembre(
  membre: MembreResumeApi,
  verbe: string,
  date: string,
  maintenant: Date,
  demandeur = false,
): string {
  return `<div class="qa-usercard${demandeur ? ' is-asker' : ''}"><p class="qa-usercard-when">${t(verbe)} ${t(ilYA(date, maintenant))}</p><div class="qa-usercard-who">${avatar(membre, 36)}<span><a href="${esc(lienMembre(membre))}">${t(membre.nom)}</a><small>${t(membre.niveau.libelle)} · ${fmt(membre.reputation)}</small></span></div></div>`;
}

/** Colonne des votes d'un message (prototype : voteColumn). */
function colonneVote(
  id: number,
  utiles: number,
  utile: boolean,
  options: { acceptee?: boolean; peutAccepter?: boolean; enregistre?: boolean | null } = {},
): string {
  const { acceptee = false, peutAccepter = false, enregistre = null } = options;
  return `<div class="qa-vote">
      <button class="qa-vote-btn" type="button" data-useful="${id}" aria-pressed="${utile}" aria-label="${utile ? 'Retirer votre vote utile' : 'Voter utile'}">${icone('vote', '')}</button>
      <span class="qa-vote-count" data-useful-count="${id}" aria-label="${esc(pluriel(utiles, 'vote utile', 'votes utiles'))}">${fmt(utiles)}</span>
      ${acceptee && !peutAccepter ? `<span class="qa-accepted-mark" title="Réponse acceptée par l’auteur du sujet">${icone('accept', '')}<span class="sr-only">Réponse acceptée</span></span>` : ''}
      ${peutAccepter ? `<button class="qa-accept-btn" type="button" data-accept="${id}" aria-label="Accepter cette réponse comme solution" title="Accepter cette réponse">${icone('accept', '')}</button>` : ''}
      ${enregistre !== null ? `<button class="qa-side-btn" type="button" data-save aria-pressed="${enregistre}" aria-label="${enregistre ? 'Retirer des enregistrements' : 'Enregistrer ce sujet'}">${icone('bookmark', '')}</button>` : ''}
    </div>`;
}

/** Contenu propre au type (prototype : opBlockHTML) : rubriques d'une clinique, exemples d'une astuce. */
function blocType(sujet: SujetApi): string {
  if (sujet.clinique) {
    return `<div class="qa-diag">
        <p class="qa-label">Prompt utilisé</p>
        ${blocPrompt(sujet.clinique.prompt, 'le prompt utilisé')}
        <div class="qa-gap">
          <div class="is-got"><p class="qa-label">${icone('x')}Résultat obtenu</p><p>${rendreMarkdownEnLigne(sujet.clinique.obtenu)}</p></div>
          <div class="is-expected"><p class="qa-label">${icone('check')}Résultat attendu</p><p>${rendreMarkdownEnLigne(sujet.clinique.attendu)}</p></div>
        </div>
      </div>`;
  }
  if (sujet.astuce) {
    const { avant, apres } = sujet.astuce;
    const verifiee = sujet.testes
      ? `<p class="qa-tested">${icone('repeat')}<span>Vérifiée par <b>${t(pluriel(sujet.testes, 'membre', 'membres'))}</b>.</span></p>`
      : '';
    return `<div class="qa-tip">
        <div class="qa-tip-grid">
          <div class="is-before"><p class="qa-label">Avant</p><p class="qa-diff">${differencesHTML(avant, apres, { ajouts: false, retraits: true })}</p></div>
          <div class="is-after"><p class="qa-label">Après</p><p class="qa-diff">${differencesHTML(avant, apres, { ajouts: true, retraits: false })}</p></div>
        </div>
        ${LEGENDE}
        ${verifiee}
      </div>`;
  }
  return '';
}

/** Prompt proposé par une réponse (prototype : fixHTML) : différences avec le prompt d'une clinique. */
function blocCorrection(sujet: SujetApi, prompt: string): string {
  if (!sujet.clinique)
    return `<div class="qa-fix"><p class="qa-label">Prompt proposé</p>${blocPrompt(prompt, 'le prompt proposé')}</div>`;
  const origine = sujet.clinique.prompt;
  return `<div class="qa-fix">
      <div class="qa-fix-head"><p class="qa-label">Prompt corrigé</p><button class="qa-copy" type="button" data-copy-text="${esc(prompt)}">${icone('copy')}<span>Copier<span class="sr-only"> le prompt corrigé</span></span></button></div>
      <p class="qa-diff qa-fix-diff">${differencesHTML(origine, prompt)}</p>
      <div class="qa-fix-cote">
        <div><p class="qa-label">Avant</p><p class="qa-diff">${differencesHTML(origine, prompt, { ajouts: false, retraits: true })}</p></div>
        <div><p class="qa-label">Après</p><p class="qa-diff">${differencesHTML(origine, prompt, { ajouts: true, retraits: false })}</p></div>
      </div>
      ${LEGENDE}
    </div>`;
}

/** Réponses dans l'ordre choisi (prototype : sorters) ; « utiles » met la réponse acceptée en tête. */
export function trierReponses(
  reponses: MessageApi[],
  tri: 'utiles' | 'recentes' | 'anciennes',
): MessageApi[] {
  const copie = [...reponses];
  if (tri === 'recentes') return copie.sort((a, b) => b.date.localeCompare(a.date));
  if (tri === 'anciennes') return copie.sort((a, b) => a.date.localeCompare(b.date));
  return copie.sort((a, b) => (b.acceptee ? 1 : 0) - (a.acceptee ? 1 : 0) || b.utiles - a.utiles);
}

function reponseHTML(r: MessageApi, c: ContexteSujet): string {
  const { sujet } = c;
  const ferme = sujet.etat === 'FERME';
  const dejaAcceptee = sujet.reponses.elements.some((m) => m.acceptee);
  const peutAccepter =
    Boolean(sujet.moi?.auteur) &&
    accepteUneReponse(sujet.type) &&
    !dejaAcceptee &&
    !r.moi?.auteur &&
    r.auteur.id !== sujet.auteur.id &&
    !ferme;
  const parQui = sujet.moi?.auteur ? 'vous' : prenom(sujet.auteur.nom);
  const masquee = r.masquee
    ? `<p class="qa-closed">${icone('lock')}Masquée par la modération : vous seul et l’équipe de modération la voyez.</p>`
    : '';
  return `<li class="qa-answer${r.acceptee ? ' is-accepted' : ''}${r.moi?.auteur ? ' is-you' : ''}" id="reponse-${r.id}" tabindex="-1" data-reponse="${r.id}" data-utiles="${r.utiles}" data-date="${esc(r.date)}"${r.acceptee ? ' data-acceptee' : ''}>
      ${colonneVote(r.id, r.utiles, Boolean(r.moi?.utile), { acceptee: Boolean(r.acceptee), peutAccepter })}
      <div class="qa-post-cell">
        ${masquee}
        ${r.acceptee ? `<p class="qa-accepted-note">${icone('accept')}Réponse acceptée par ${t(parQui)}</p>` : ''}
        <div class="qa-body">${rendreMarkdown(r.corps)}${r.prompt ? blocCorrection(sujet, r.prompt) : ''}</div>
        <div class="qa-post-foot">
          <div class="qa-post-links"><button type="button" data-copy-answer="${r.id}">Partager</button>${ferme ? '' : `<button type="button" data-quote="${r.id}" data-quote-author="${esc(prenom(r.auteur.nom))}" data-quote-text="${esc(premierePhrase(r.corps))}">Citer</button>`}</div>
          ${carteMembre(r.auteur, 'Publiée', r.date, c.maintenant, r.auteur.id === sujet.auteur.id)}
        </div>
      </div>
    </li>`;
}

/** Formulaire de réponse (prototype : composerHTML). */
export function formulaireReponseHTML(c: ContexteSujet): string {
  const { sujet } = c;
  if (sujet.etat === 'FERME') {
    const par = sujet.fermeture?.par;
    const qui = par && c.moi?.id === par.id ? 'vous' : (par?.nom ?? 'la modération');
    return `<p class="qa-closed">${icone('lock')}Ce sujet a été fermé par ${t(qui)} : il reste lisible, les réponses sont désactivées.</p>`;
  }
  if (c.invitationRepondre)
    return `<h2 class="qa-h2" id="qa-reply-title">Votre réponse</h2><p class="qa-gate">${c.invitationRepondre}</p>`;
  const clinique = sujet.clinique;
  return `<form class="qa-composer" data-reply-form novalidate>
      <h2 class="qa-h2" id="qa-reply-title">Votre réponse</h2>
      <div data-quote-zone></div>
      <div class="qa-editor">
        <div class="qa-editor-bar" role="toolbar" aria-label="Mise en forme">
          <button type="button" data-format="bold" aria-label="Gras">${icone('bold', '')}</button>
          <button type="button" data-format="code" aria-label="Code">${icone('code', '')}</button>
          ${clinique ? `<span class="qa-editor-sep" aria-hidden="true"></span><label class="qa-editor-fix"><input type="checkbox" data-reply-fix><span>Joindre un prompt corrigé</span></label>` : ''}
        </div>
        <label class="sr-only" for="qa-reply">Votre réponse</label>
        <textarea id="qa-reply" rows="7" placeholder="${sujet.moi?.auteur ? 'Ajoutez une précision, ou le résultat de vos essais' : 'Ce qui a fonctionné pour vous, avec quel outil et quelle version'}" aria-describedby="qa-reply-error"></textarea>
      </div>
      <p class="ex-error" id="qa-reply-error" hidden>Écrivez au moins 20 caractères pour que votre réponse soit utile.</p>
      ${
        clinique
          ? `<div class="qa-reply-fix" data-reply-fix-field hidden>
        <label class="ex-label" for="qa-reply-prompt">Prompt corrigé</label>
        <textarea id="qa-reply-prompt" rows="3" spellcheck="false">${esc(clinique.prompt)}</textarea>
        <p class="qa-label">Aperçu des différences</p>
        <p class="qa-diff qa-preview" data-diff-preview>${t(clinique.prompt)}</p>
      </div>`
          : ''
      }
      <div class="qa-live" data-live-preview hidden><p class="qa-label">Aperçu</p><div class="qa-body" data-live-body></div></div>
      <div class="qa-composer-foot"><button class="btn btn-primary" type="submit">Publier votre réponse</button><p><kbd>Ctrl</kbd> + <kbd>Entrée</kbd> pour publier</p></div>
    </form>`;
}

/** Modèle d'un sujet, au nom court (« v7 » : l'outil le précède) ; à défaut, celui saisi en texte libre. */
export const modeleDuSujet = (sujet: Pick<SujetApi, 'modele' | 'modeleNonReference'>) =>
  sujet.modele?.nomCourt ?? sujet.modeleNonReference ?? null;

/** Partie principale de la page (prototype : renderQuestion, sans la colonne). */
export function sujetHTML(c: ContexteSujet): string {
  const { sujet, maintenant } = c;
  const etiquetes = {
    outil: sujet.outil,
    modele: modeleDuSujet(sujet),
    etiquettes: sujet.etiquettes,
  };
  const reponses = trierReponses(sujet.reponses.elements, 'utiles');
  const n = sujet.reponses.elements.length;
  const ferme = sujet.etat === 'FERME';
  const masquage = sujet.masquee
    ? `<p class="qa-closed">${icone('lock')}Ce sujet est masqué par la modération : seuls vous et l’équipe de modération le voyez.</p>`
    : '';
  const peutFermer = sujet.moi?.peutFermer && !ferme;
  const peutRouvrir = sujet.moi?.peutRouvrir && ferme;
  const fermeture =
    peutFermer || peutRouvrir
      ? `<button type="button" data-close-topic="${ferme ? 'rouvrir' : 'fermer'}">${ferme ? 'Rouvrir le sujet' : 'Fermer le sujet'}</button>`
      : '';
  const tri =
    n > 1
      ? `<label class="qa-select"><span>Trier par</span><select data-answer-sort><option value="utiles" selected>Les plus utiles</option><option value="recentes">Les plus récentes</option><option value="anciennes">Les plus anciennes</option></select>${icone('chevron-down')}</label>`
      : '';
  const autres = [
    sujet.outil
      ? `<a class="qa-tag is-tool" href="${esc(ecrireAdresse({ ...etatVide(), outil: sujet.outil.slug }))}">${logo(sujet.outil, 14)}${t(sujet.outil.nom)}</a> `
      : '',
    sujet.etiquettes
      .slice(0, 2)
      .map(
        (e) =>
          `<a class="qa-tag" href="${esc(ecrireAdresse({ ...etatVide(), etiquette: e.slug }))}">${t(e.libelle.toLowerCase())}</a>`,
      )
      .join(' '),
  ].join('');
  return `
      <div class="qa-main">
        <header class="qa-q-head">
          <div class="qa-list-title"><h1 id="qa-title" tabindex="-1">${t(sujet.titre)}</h1><a class="btn btn-primary" href="${ROUTES.nouveauSujet}">${icone('plus')}Poser une question</a></div>
          <p class="qa-q-meta"><span>${t(PUBLIE[sujet.type])} <b>${t(ilYA(sujet.dateCreation, maintenant))}</b></span><span>Activité <b>${t(ilYA(sujet.derniereActivite, maintenant))}</b></span><span class="qa-kind">${icone(TYPES[sujet.type].icone)}${t(libelleType(sujet.type))}</span></p>
        </header>
        ${masquage}
        <div class="qa-question">
          ${colonneVote(sujet.id, sujet.utiles, Boolean(sujet.moi?.utile), { enregistre: Boolean(sujet.moi?.enregistre) })}
          <div class="qa-post-cell">
            <div class="qa-body">${rendreMarkdown(sujet.corps)}${blocType(sujet)}</div>
            ${etiquettesHTML(etiquetes, 5)}
            ${sujet.astuce ? `<p class="qa-tip-test"><button class="qa-test" type="button" data-tested aria-pressed="${Boolean(sujet.moi?.teste)}">${icone(sujet.moi?.teste ? 'check' : 'repeat')}<span>${sujet.moi?.teste ? 'Testé' : 'Testé, ça marche'}</span></button></p>` : ''}
            <div class="qa-post-foot">
              <div class="qa-post-links"><button type="button" data-copy-link>Partager</button>${fermeture}</div>
              ${carteMembre(sujet.auteur, PUBLIE[sujet.type], sujet.dateCreation, maintenant, true)}
            </div>
          </div>
        </div>
        <section class="qa-answers" aria-labelledby="qa-answers-title">
          <div class="qa-answers-head"><h2 class="qa-h2" id="qa-answers-title">${n ? t(pluriel(n, 'réponse', 'réponses')) : 'Aucune réponse pour l’instant'}</h2>${tri}</div>
          ${n ? `<ol class="qa-answer-list" data-answer-list>${reponses.map((r) => reponseHTML(r, c)).join('')}</ol>` : ''}
        </section>
        <section class="qa-reply" id="repondre" aria-labelledby="qa-reply-title">${formulaireReponseHTML(c)}</section>
        <p class="qa-not-it">Ce n’est pas la réponse que vous cherchez ? Parcourez les sujets étiquetés ${autres} ou <a href="${ROUTES.nouveauSujet}">posez votre propre question</a>.</p>
      </div>`;
}

/** Colonne de la page (prototype : aside de renderQuestion). « Dans le guide » et « Sujets liés »
    attendent leur API (FORUM-03). */
export function colonneSujetHTML(sujet: SujetApi): string {
  const creation = sujet.creation;
  if (!creation) return '';
  return `<section class="qa-box" aria-labelledby="qa-crea-title"><h2 id="qa-crea-title">${icone('layers')}Création liée</h2><a class="qa-creation" href="${esc(adresseCreation(creation))}"><span class="qa-creation-media">${image(creation.couverture, '300px')}</span><span class="qa-creation-title">${t(creation.titre)}</span><span class="qa-creation-who">${avatar(creation.auteur, 20)}${t(creation.auteur.nom)}</span></a></section>`;
}
