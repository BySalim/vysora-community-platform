/* Défis (S-17, démo validée le 2026-11-16, prototype/defis.js) : participations filtrées par outil,
   recherchées, triées, montrées en grille ou en liste, six puis la suite ; rang du premier en or
   avec la couronne, des suivants en bleu ; vote « Utile » (PUT ou DELETE
   /api/v1/contenus/:id/votes/UTILE, ouvert pendant une pause) ; partage du défi ; compte à
   rebours ; barre d'action sur téléphone.
   Une participation s'ouvre dans le lecteur plein écran : son jeu ne s'exécute jamais dans la
   page, mais dans un cadre isolé servi par l'API (sandbox sans allow-same-origin, aucun accès au
   réseau, ADR-0011). On participe depuis cette page seulement : formulaire (outil, modèle, prompts,
   fichier HTML contrôlé puis essayé ici, titre, idée, couverture), POST, PUT ou DELETE
   /api/v1/defis/:id/participations. */

import {
  controlerJeu,
  TAILLE_MAX_JEU,
  type EtatDefi,
  type LigneControleJeu,
  type MediaApi,
  type ParticipationDefiApi,
} from '@vysora/shared';
import {
  boutonVote,
  carteGrille,
  chemin,
  ligneListe,
  PAS_PARTICIPATIONS,
  type ContexteCarte,
} from '../lib/defis';
import { avatar, logo } from '../lib/explorer/elements';
import { ROUTES } from '../lib/navigation';
import { normaliser } from '../lib/texte';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import {
  $,
  $$,
  corrigerTypographie,
  esc,
  icon,
  messageApresChargement,
  t,
  toast,
  typo,
} from './commun/outils';

type Participation = ParticipationDefiApi & { texte: string };
interface OutilFormulaire {
  id: number;
  nom: string;
  modeles: string[];
}
const donnees = JSON.parse($('#df-donnees')?.textContent ?? '{}') as {
  defi: number | null;
  titre: string;
  enonce: string;
  etat: EtatDefi | null;
  enPause: boolean;
  cible: string | null;
  connecte: boolean;
  /** Fin du défi (« vendredi 21 novembre »). */
  fin: string;
  mienne: { id: number; nature: 'PARTICIPATION' | 'CREATION' } | null;
  outils: OutilFormulaire[];
  participations: Participation[];
};
const CLE_VUE = 'vysora-defis-vue';
const lireVue = (): 'grille' | 'liste' => {
  try {
    return localStorage.getItem(CLE_VUE) === 'liste' ? 'liste' : 'grille';
  } catch {
    return 'grille';
  }
};
const etat = {
  outil: '',
  recherche: '',
  tri: 'utiles' as 'utiles' | 'recentes',
  vue: lireVue(),
  limite: PAS_PARTICIPATIONS,
};
const grille = $('[data-entries]');
const plus = $('[data-more]');
const votesOuverts = donnees.etat === 'EN_COURS';
/** Participations ouvertes : défi en cours, hors pause. */
const ouvert = votesOuverts && !donnees.enPause;
const contexte = (): ContexteCarte => ({
  defiTitre: donnees.titre,
  votes: votesOuverts,
  rangs: etat.tri === 'utiles',
});
const trouver = (id: number) => donnees.participations.find((p) => p.creation.id === id);
const place = (rang: number) => `${rang === 1 ? '1re' : `${rang}e`} place`;
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const dateHeure = (iso: string) => {
  const d = new Date(iso);
  return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} à ${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** Rang : figé à la clôture, sinon votes « Utile » de la période puis date de publication (RG-75). */
function rangs(): Map<number, number> {
  const ordre = donnees.participations.toSorted((a, b) =>
    donnees.etat === 'CLOTURE' && a.rang && b.rang
      ? a.rang - b.rang
      : b.utiles - a.utiles || a.datePublication.localeCompare(b.datePublication),
  );
  return new Map(ordre.map((p, i) => [p.creation.id, i + 1]));
}

function rendre(): void {
  if (!grille) return;
  const q = normaliser(etat.recherche.trim());
  const rang = rangs();
  const liste = donnees.participations
    .filter(
      (p) =>
        (!etat.outil || p.creation.outils[0]?.outil.slug === etat.outil) &&
        (!q || p.texte.includes(q)),
    )
    .toSorted((a, b) =>
      etat.tri === 'recentes'
        ? b.datePublication.localeCompare(a.datePublication)
        : (rang.get(a.creation.id) ?? 0) - (rang.get(b.creation.id) ?? 0),
    );
  const montrees = liste.slice(0, Math.max(PAS_PARTICIPATIONS, etat.limite));
  const c = contexte();
  grille.className = `df-grid is-image${etat.vue === 'liste' ? ' is-list' : ''}`;
  grille.innerHTML = montrees
    .map((p) =>
      etat.vue === 'liste'
        ? ligneListe(p, rang.get(p.creation.id) ?? 0, c)
        : carteGrille(p, rang.get(p.creation.id) ?? 0, c),
    )
    .join('');
  const total = donnees.participations.length;
  const aucune = $('[data-aucune]');
  if (aucune) aucune.hidden = liste.length > 0 || total === 0;
  const selection = $('[data-selection]');
  if (selection && total) {
    const votes = donnees.participations.reduce((s, p) => s + p.utiles, 0);
    selection.textContent =
      liste.length === total
        ? typo(
            `${total} participation${total > 1 ? 's' : ''} · ${votes} vote${votes > 1 ? 's' : ''}`,
          )
        : typo(`${liste.length} sur ${total}`);
  }
  const statut = $('[data-results-status]');
  if (statut)
    statut.textContent = `${montrees.length} participations affichées sur ${liste.length}.`;
  for (const b of $$<HTMLButtonElement>('[data-tool]'))
    b.setAttribute('aria-pressed', String((b.dataset.tool ?? '') === etat.outil));
  for (const b of $$<HTMLButtonElement>('[data-view]'))
    b.setAttribute('aria-pressed', String(b.dataset.view === etat.vue));
  if (plus) {
    const reste = liste.length - montrees.length;
    plus.hidden = liste.length <= PAS_PARTICIPATIONS;
    plus.innerHTML =
      liste.length <= PAS_PARTICIPATIONS
        ? ''
        : `<p>${montrees.length} sur ${liste.length}</p><div class="df-more-actions">${
            reste > 0
              ? `<button class="btn btn-secondary" type="button" data-more-next>${
                  reste > PAS_PARTICIPATIONS
                    ? `Afficher ${PAS_PARTICIPATIONS} de plus`
                    : reste > 1
                      ? `Afficher les ${reste} dernières`
                      : 'Afficher la dernière'
                }<svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron-down"/></svg></button>`
              : ''
          }${
            montrees.length > PAS_PARTICIPATIONS
              ? '<button class="btn btn-quiet" type="button" data-more-less>Réduire<svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron-down"/></svg></button>'
              : ''
          }</div>`;
  }
}

async function copier(texte: string, ok: string, bouton?: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    const libelle = bouton?.isConnected ? $('span', bouton) : null;
    if (libelle) libelle.textContent = 'Copié';
    toast(ok);
    return true;
  } catch {
    toast('La copie automatique est indisponible sur cet appareil.', 'alert');
    return false;
  }
}
const lien = (id: number) => `${location.origin}${location.pathname}?participation=${id}`;

async function partager(bouton: HTMLButtonElement): Promise<void> {
  const url = `${location.origin}${location.pathname}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${donnees.titre} · Défi Vysora`,
        text: `Défi de la semaine sur Vysora : « ${donnees.titre} ». ${donnees.enonce}`,
        url,
      });
      return;
    } catch (erreur) {
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return;
    }
  }
  await copier(url, 'Lien du défi copié.', bouton);
}

/* Lecteur d'une participation (plein écran) ------------------------------------------------- */
const lecteur = $<HTMLDialogElement>('[data-player]');
const formDialogue = $<HTMLDialogElement>('[data-form-dialog]');
const confirmation = $<HTMLDialogElement>('[data-confirm]');
const lecture = { id: 0, origine: null as HTMLElement | null };

/** Cadre isolé : scripts permis, origine opaque (ni cookie, ni stockage, ni accès à la page). */
function cadre(src: string, titre: string): HTMLIFrameElement {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.setAttribute('allow', 'fullscreen');
  f.title = titre;
  f.src = src;
  f.addEventListener(
    'load',
    () => {
      if (f.isConnected) f.focus();
    },
    { once: true },
  );
  return f;
}

/** Couverture du lecteur : l'image, sinon le titre en grand. */
function couvertureGrande(p: ParticipationDefiApi): string {
  const c = p.creation.couverture;
  return c
    ? `<img class="df-media-img" src="${esc(c.url)}" alt="" width="${c.largeur}" height="${c.hauteur}" decoding="async">`
    : `<span class="df-cover-type" aria-hidden="true"><small>${t(donnees.titre)}</small><b>${t(p.creation.titre)}</b></span>`;
}

function scene(p: ParticipationDefiApi): string {
  const plein = document.fullscreenEnabled
    ? `<button class="df-stage-btn" type="button" data-fullscreen>${icon('expand')}Plein écran</button>`
    : '';
  if (p.detail?.jeu)
    return `<div class="df-stage" data-stage><button class="df-stage-launch" type="button" data-launch="${p.creation.id}">${couvertureGrande(p)}<span class="df-stage-cta"><span class="df-stage-play" aria-hidden="true">${icon('play', 'icon')}</span><span>Lancer la partie</span></span></button></div>
      <div class="df-stage-tools">${plein}<p class="df-isolation">${icon('shield')}<span>Jeu isolé du site, sans accès à Internet</span></p></div>`;
  const c = p.creation.couverture;
  return `<div class="df-stage df-stage-image" data-stage>${c ? `<img src="${esc(c.url)}" alt="${t(c.texteAlternatif || p.creation.titre)}" decoding="async">` : couvertureGrande(p)}</div>
      <div class="df-stage-tools">${plein}</div>`;
}

function rendreLecteur(): void {
  const p = trouver(lecture.id);
  const corps = $('[data-player-body]');
  if (!p || !lecteur || !corps) return;
  const d = p.detail;
  const nom = $('[data-player-name]');
  if (nom) nom.textContent = donnees.titre;
  lecteur.className = `df-viewer is-${d?.jeu ? 'jeu' : 'image'}`;
  const r = rangs().get(p.creation.id) ?? 0;
  const eyebrow =
    donnees.etat === 'CLOTURE'
      ? place(r)
      : donnees.etat === 'TERMINE'
        ? `${place(r)}, avant la clôture`
        : votesOuverts
          ? `${place(r)} pour l’instant`
          : 'Participation';
  const mienne = Boolean(d?.mienne);
  const actions =
    mienne && votesOuverts
      ? `${ouvert ? `<button class="btn btn-secondary btn-sm" type="button" data-modifier>${icon('pen')}Modifier</button>` : ''}<button class="btn btn-quiet btn-sm df-danger-text" type="button" data-supprimer>${icon('x')}Supprimer</button>`
      : '';
  const o = p.creation.outils[0];
  const prompts = d?.prompts ?? [];
  corps.innerHTML = `
      <div class="df-viewer-stage">${scene(p)}</div>
      <div class="df-viewer-info">
        <p class="df-player-eyebrow">${mienne ? `Votre participation · ${eyebrow}` : eyebrow}</p>
        <h2 id="df-player-title">${t(p.creation.titre)}</h2>
        <div class="df-author-line">${avatar(p.auteur, 36)}<div><strong>${t(mienne ? `${p.auteur.nom} (vous)` : p.auteur.nom)}</strong><span>${t(`Publiée le ${dateHeure(p.datePublication)}`)}</span></div></div>
        <div class="df-viewer-actions">${mienne ? `<span class="df-vote-stat">${icon('utile')}<b>${p.utiles}</b> vote${p.utiles > 1 ? 's' : ''} « Utile »</span>` : boutonVote(p, votesOuverts, true)}<button class="btn btn-secondary btn-sm" type="button" data-share="${p.creation.id}">${icon('link')}<span>Copier le lien</span></button>${actions}</div>
        ${!mienne && !votesOuverts ? '<p class="df-vote-note">Les votes du défi sont clos.</p>' : ''}
        ${d?.idee ? `<p class="df-player-idea">${t(d.idee)}</p>` : ''}
        <dl class="df-player-facts">${o ? `<div><dt>Outil</dt><dd><span class="df-tool">${logo(o.outil, 16)}${t(o.outil.nom)}${o.modeles.length ? t(` · ${o.modeles.join(', ')}`) : ''}</span></dd></div>` : ''}<div><dt>Le chemin</dt><dd>${icon(prompts.length > 1 ? 'type-iteration' : 'type-prompt')}${t(chemin(p))}</dd></div></dl>
        ${
          prompts.length
            ? `<section class="df-prompt" aria-labelledby="df-prompt-title"><h3 id="df-prompt-title">${prompts.length > 1 ? 'Les prompts, dans l’ordre' : 'Le prompt'}</h3>
          <ol class="df-path">${prompts
            .map(
              (x, k) =>
                `<li><div class="df-path-head">${prompts.length > 1 ? `<span class="df-path-n">${k + 1}</span>` : '<span class="df-path-label">Envoyé tel quel à l’IA</span>'}<button class="df-copy-button" type="button" data-copy="${p.creation.id}" data-index="${k}" aria-label="Copier le prompt ${k + 1}">${icon('copy')}<span>Copier</span></button></div><blockquote>${t(x)}</blockquote>${k === prompts.length - 1 && d?.moment ? `<p class="df-moment">${icon('moment')}<span><b>Moment clé</b>${t(d.moment)}</span></p>` : ''}</li>`,
            )
            .join('')}</ol>
          <p class="df-copy-status sr-only" role="status" data-copy-status></p></section>`
            : ''
        }
      </div>`;
  corrigerTypographie(corps);
  const info = $('.df-viewer-info', lecteur);
  if (info) info.scrollTop = 0;
}

function ouvrirLecteur(id: number, origine?: HTMLElement | null): void {
  const p = trouver(id);
  if (!p || !lecteur) return;
  if (p.nature !== 'PARTICIPATION') {
    window.location.assign(ROUTES.creation(p.creation.id, p.creation.slug));
    return;
  }
  if (!lecteur.open) lecture.origine = origine ?? (document.activeElement as HTMLElement | null);
  lecture.id = id;
  rendreLecteur();
  if (!lecteur.open) lecteur.showModal();
  (
    $<HTMLButtonElement>('[data-launch]', lecteur) ??
    $<HTMLButtonElement>('[data-vote]', lecteur) ??
    $<HTMLButtonElement>('[data-close]', lecteur)
  )?.focus({ preventScroll: true });
}

function lancer(): void {
  const p = trouver(lecture.id);
  const stage = lecteur ? $('[data-stage]', lecteur) : null;
  if (!p || !stage) return;
  stage.replaceChildren(
    cadre(`/api/v1/participations/${p.creation.id}/jeu`, `Jeu : ${p.creation.titre}`),
  );
}

/* Formulaire de participation ------------------------------------------------------------- */
interface Fichier {
  nom: string;
  code: string;
  lignes: LigneControleJeu[];
  bloque: boolean;
}
const saisie = {
  modifier: false,
  fichier: null as Fichier | null,
  couverture: null as { id: number; url: string } | null,
  moment: null as string | null,
  envoi: false,
  publiee: false,
  origine: null as HTMLElement | null,
};
const MAX_PROMPTS = 10;
const zone = (selecteur: string) => (formDialogue ? $(selecteur, formDialogue) : null);

const champ = (o: {
  id: string;
  label: string;
  aide?: string;
  facultatif?: boolean;
  html: string;
  pour?: string;
}) =>
  `<div class="df-field" data-field="${o.id}"><label class="df-label" for="${o.pour ?? `df-${o.id}`}">${o.label}${o.facultatif ? ' <span>(facultatif)</span>' : ''}</label>${o.html}${o.aide ? `<p class="df-help" id="df-${o.id}-aide">${o.aide}</p>` : ''}<p class="df-error" id="df-${o.id}-erreur" hidden></p></div>`;
const promptHTML = (k: number, valeur = '') =>
  `<li class="df-prompt-field" data-prompt-item><div class="df-prompt-field-head"><label class="df-label" for="df-prompt-${k}">Prompt ${k + 1}</label>${k > 0 ? `<button class="df-link-btn" type="button" data-prompt-remove aria-label="Retirer le prompt ${k + 1}">${icon('x')}Retirer</button>` : ''}</div><textarea id="df-prompt-${k}" name="prompt" rows="4" maxlength="20000">${esc(valeur)}</textarea></li>`;

function formHTML(): string {
  return `<form class="df-form" novalidate data-form>
      <header class="df-form-head"><h2 id="df-form-title">${saisie.modifier ? 'Modifier votre participation' : 'Votre participation'}</h2>${saisie.modifier ? '<p>Les votes reçus sont conservés.</p>' : ''}</header>
      <div class="df-form-alert" role="alert" data-form-alert hidden></div>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">1</span>Vos prompts</legend>
        <div class="df-row2">
          ${champ({ id: 'outil', label: 'Outil d’IA', html: `<div class="df-select"><select id="df-outil" name="outil"><option value="">Choisir l’outil</option>${donnees.outils.map((o) => `<option value="${o.id}">${t(o.nom)}</option>`).join('')}</select>${icon('chevron-down')}</div>` })}
          ${champ({ id: 'modele', label: 'Modèle', facultatif: true, aide: 'Dans la liste, ou tel que l’outil l’affiche.', html: '<input type="text" id="df-modele" name="modele" list="df-modeles" maxlength="100" autocomplete="off" spellcheck="false" aria-describedby="df-modele-aide" placeholder="Choisissez d’abord l’outil"><datalist id="df-modeles"></datalist>' })}
        </div>
        <div class="df-field" data-field="prompt"><ol class="df-prompts" data-prompts>${promptHTML(0)}</ol>
          <p class="df-help" id="df-prompt-aide">${typo(`Dans l’ordre, tels que vous les avez envoyés : ${MAX_PROMPTS} prompts au plus.`)}</p>
          <button class="df-add" type="button" data-prompt-add>${icon('plus')}Ajouter le prompt suivant</button>
          <p class="df-error" id="df-prompt-erreur" hidden></p></div>
        <div class="df-field" role="radiogroup" aria-labelledby="df-essais-label" data-field="essais" data-essais-zone><p class="df-label" id="df-essais-label">Le résultat publié est</p>
          <div class="df-choices"><label class="df-choice"><input type="radio" name="essais" value="1" checked><span>Le premier que l’IA a livré</span></label><label class="df-choice"><input type="radio" name="essais" value="plusieurs"><span>Le meilleur de plusieurs essais</span></label></div>
          <div class="df-tries" data-tries hidden><label for="df-nombre">Nombre d’essais</label><input type="number" id="df-nombre" name="nombre" min="2" max="50" value="3" inputmode="numeric"></div></div>
      </fieldset>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">2</span>Votre jeu</legend><div data-file-zone></div></fieldset>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">3</span>Sa présentation</legend>
        ${champ({ id: 'titre', pour: 'df-titre-part', label: 'Titre', aide: 'De 5 à 100 caractères.', html: '<input type="text" id="df-titre-part" name="titre" maxlength="100" autocomplete="off" aria-describedby="df-titre-aide">' })}
        ${champ({ id: 'idee', label: 'Votre idée en une phrase', aide: 'De 20 à 300 caractères.', html: '<textarea id="df-idee" name="idee" rows="3" maxlength="300" aria-describedby="df-idee-aide"></textarea>' })}
        <div class="df-field" data-field="couverture"><p class="df-label" id="df-couverture-label">Image de couverture <span>(facultatif)</span></p><div data-cover-zone></div><p class="df-error" id="df-couverture-erreur" hidden></p></div>
      </fieldset>
      <footer class="df-form-foot"><p>${icon('check-circle')}<span>En publiant, vous confirmez que votre participation respecte les règles du défi.</span></p><div class="df-form-actions"><button type="button" class="btn btn-secondary" data-close>Annuler</button><button type="submit" class="btn btn-primary">${saisie.modifier ? 'Enregistrer les modifications' : 'Publier ma participation'}</button></div></footer>
    </form>`;
}

function majPrompts(): void {
  const items = formDialogue ? $$('[data-prompt-item]', formDialogue) : [];
  items.forEach((li, k) => {
    const label = $<HTMLLabelElement>('label', li);
    const zoneTexte = $<HTMLTextAreaElement>('textarea', li);
    if (label) label.textContent = `Prompt ${k + 1}`;
    if (label && zoneTexte) label.htmlFor = zoneTexte.id = `df-prompt-${k}`;
    $('[data-prompt-remove]', li)?.setAttribute('aria-label', `Retirer le prompt ${k + 1}`);
  });
  const ajouter = zone('[data-prompt-add]');
  if (ajouter) ajouter.hidden = items.length >= MAX_PROMPTS;
  // Les essais ne concernent qu'un prompt unique.
  const essais = zone('[data-essais-zone]');
  if (essais) essais.hidden = items.length > 1;
}

const ko = (octets: number) => `${Math.max(1, Math.round(octets / 1024))} Ko`;
const ICONES_CONTROLE = { ok: 'check-circle', attention: 'alert', non: 'x' } as const;

function rendreFichier(): void {
  const z = zone('[data-file-zone]');
  if (!z) return;
  const f = saisie.fichier;
  z.innerHTML = f
    ? `<div class="df-file"><span class="df-file-icon">${icon('file-code', 'icon')}</span><div class="df-file-name"><b>${t(f.nom)}</b><span>${ko(new Blob([f.code]).size)} · page HTML</span></div><div class="df-file-actions"><label class="df-link-btn">Remplacer<input type="file" accept=".html,.htm,text/html" class="sr-only" data-file-input></label><button class="df-link-btn" type="button" data-file-remove>Retirer</button></div></div>
        <div class="df-check${f.bloque ? ' is-blocked' : ''}" role="group" aria-label="Contrôle du fichier"><p class="df-check-head">${icon('shield')}<b>Contrôle du fichier</b><span>${f.bloque ? 'Refusé' : f.lignes.some((l) => l.etat === 'attention') ? 'Accepté, avec des points d’attention' : 'Accepté'}</span></p><ul>${f.lignes.map((l) => `<li class="is-${l.etat}">${icon(ICONES_CONTROLE[l.etat])}<span><b>${t(l.libelle)}</b>${l.detail ? `<small>${t(l.detail)}</small>` : ''}</span></li>`).join('')}</ul></div>
        ${f.bloque ? '' : `<div class="df-test" data-test><button class="df-test-launch" type="button" data-test-launch>${icon('play')}Essayer le jeu ici</button></div>`}
        <p class="df-error" id="df-fichier-erreur" hidden></p>`
    : `<div class="df-drop" data-drop><span class="df-drop-icon">${icon('upload', 'icon')}</span><p><b>Déposez le fichier HTML du jeu</b><span>ou</span></p><label class="btn btn-secondary btn-sm">Choisir un fichier<input type="file" accept=".html,.htm,text/html" class="sr-only" data-file-input aria-describedby="df-fichier-aide df-fichier-erreur"></label><p class="df-help" id="df-fichier-aide">Un seul fichier .html, 200 000 caractères au plus. Il est contrôlé avant publication.</p></div>
        <p class="df-error" id="df-fichier-erreur" hidden></p>
        <details class="df-paste"><summary>Coller le code à la place</summary><textarea class="df-code" rows="7" spellcheck="false" aria-label="Code HTML du jeu" placeholder="&lt;!doctype html&gt;…" data-paste></textarea><button class="btn btn-secondary btn-sm" type="button" data-paste-use>Utiliser ce code</button></details>`;
  corrigerTypographie(z);
}

function rendreCouverture(): void {
  const z = zone('[data-cover-zone]');
  if (!z) return;
  z.innerHTML = saisie.couverture
    ? `<div class="df-cover-pick"><img src="${esc(saisie.couverture.url)}" alt="Couverture choisie"><button class="df-link-btn" type="button" data-cover-remove>Retirer l’image</button></div>`
    : `<div class="df-cover-pick"><label class="btn btn-secondary btn-sm">${icon('image')}Ajouter une image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" data-cover-input aria-labelledby="df-couverture-label"></label><p class="df-help">${typo('Une capture du jeu, de préférence en 16:9. Sans image, sa carte affiche son titre.')}</p></div>`;
}

function erreurChamp(id: string, message: string): void {
  if (!formDialogue) return;
  const el = $(`#df-${id}-erreur`, formDialogue);
  const bloc = $(`[data-field="${id}"]`, formDialogue);
  if (el) {
    el.hidden = !message;
    el.innerHTML = message ? `${icon('alert')}<span>${t(message)}</span>` : '';
  }
  bloc?.classList.toggle('is-invalid', Boolean(message));
  const champs =
    id === 'titre'
      ? [$('#df-titre-part', formDialogue)]
      : id === 'prompt'
        ? $$('[data-prompt-item] textarea', formDialogue)
        : [$(`#df-${id}`, formDialogue)];
  for (const c of champs) c?.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function chargerFichier(nom: string, code: string): void {
  const { lignes, bloquants } = controlerJeu(nom, code);
  saisie.fichier = { nom, code, lignes, bloque: bloquants.length > 0 };
  rendreFichier();
}

function lireFichier(fichier: File | undefined): void {
  if (!fichier) return;
  if (fichier.size > TAILLE_MAX_JEU * 4) {
    saisie.fichier = null;
    rendreFichier();
    erreurChamp(
      'fichier',
      'Ce fichier dépasse 200 000 caractères : le jeu doit tenir dans un fichier plus léger.',
    );
    return;
  }
  const lecteurFichier = new FileReader();
  lecteurFichier.onload = () => {
    chargerFichier(fichier.name, String(lecteurFichier.result));
    (zone('[data-test-launch]') ?? zone('[data-file-remove]'))?.focus();
  };
  lecteurFichier.onerror = () => toast('Ce fichier n’a pas pu être lu. Réessayez.', 'alert');
  lecteurFichier.readAsText(fichier);
}

async function envoyerCouverture(fichier: File | undefined): Promise<void> {
  if (!fichier) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(fichier.type)) {
    erreurChamp('couverture', 'Choisissez une image PNG, JPEG, WebP ou GIF.');
    return;
  }
  if (fichier.size > 5 * 1024 * 1024) {
    erreurChamp('couverture', 'Cette image dépasse 5 Mo.');
    return;
  }
  erreurChamp('couverture', '');
  const corps = new FormData();
  corps.append('fichier', fichier);
  const r = await api<MediaApi>('POST', '/api/v1/medias', corps);
  if (!r.ok) {
    erreurChamp(
      'couverture',
      r.probleme.erreurs?.fichier ?? r.probleme.detail ?? 'L’image n’a pas pu être envoyée.',
    );
    return;
  }
  saisie.couverture = {
    id: r.donnees.id,
    url: r.donnees.declinaisons[0]?.url ?? r.donnees.url,
  };
  rendreCouverture();
  zone('[data-cover-remove]')?.focus();
}

/** Modèle : suggestions du référentiel pour l'outil choisi ; un modèle absent s'écrit librement
    (RG-14). La saisie en cours est gardée quand on change d'outil. */
function majModeles(valeur?: string): void {
  const saisieModele = zone('#df-modele') as HTMLInputElement | null;
  const liste = zone('#df-modeles');
  const choix = (zone('#df-outil') as HTMLSelectElement | null)?.value ?? '';
  if (!saisieModele || !liste) return;
  const modeles = donnees.outils.find((o) => String(o.id) === choix)?.modeles ?? [];
  liste.innerHTML = modeles.map((m) => `<option value="${esc(m)}"></option>`).join('');
  if (valeur !== undefined) saisieModele.value = valeur;
  saisieModele.placeholder = !choix
    ? 'Choisissez d’abord l’outil'
    : modeles[0]
      ? `Par exemple : ${modeles[0]}`
      : 'Nom du modèle, s’il y en a un';
}

async function ouvrirFormulaire(origine: HTMLElement | null, modifier: boolean): Promise<void> {
  const corps = $('[data-form-body]');
  if (!formDialogue || !corps) return;
  if (!formDialogue.open) saisie.origine = origine;
  saisie.modifier = modifier;
  saisie.fichier = null;
  saisie.couverture = null;
  saisie.moment = null;
  saisie.publiee = false;
  const nom = $('[data-form-name]');
  if (nom) nom.textContent = donnees.titre;
  corps.innerHTML = formHTML();
  rendreFichier();
  rendreCouverture();
  majPrompts();
  corrigerTypographie(corps);
  if (!formDialogue.open) formDialogue.showModal();
  formDialogue.scrollTop = 0;
  const p = modifier && donnees.mienne ? trouver(donnees.mienne.id) : undefined;
  if (p) await remplir(p);
  (zone(p ? 'button[type="submit"]' : '#df-outil') as HTMLElement | null)?.focus();
}

async function remplir(p: ParticipationDefiApi): Promise<void> {
  const f = zone('[data-form]') as HTMLFormElement | null;
  const d = p.detail;
  if (!f || !d) return;
  const valeur = (nom: string, v: string) => {
    const el = f.elements.namedItem(nom) as HTMLInputElement | HTMLSelectElement | null;
    if (el && 'value' in el) el.value = v;
  };
  valeur('outil', d.outilId ? String(d.outilId) : '');
  majModeles(d.modele ?? '');
  d.prompts.forEach((texte, k) => {
    if (k > 0) zone('[data-prompts]')?.insertAdjacentHTML('beforeend', promptHTML(k));
    const zoneTexte = zone(`#df-prompt-${k}`) as HTMLTextAreaElement | null;
    if (zoneTexte) zoneTexte.value = texte;
  });
  majPrompts();
  valeur('titre', p.creation.titre);
  valeur('idee', d.idee ?? '');
  saisie.moment = d.moment;
  if (d.essais > 1) {
    const plusieurs = zone('input[name="essais"][value="plusieurs"]') as HTMLInputElement | null;
    if (plusieurs) plusieurs.checked = true;
    const essais = zone('[data-tries]');
    if (essais) essais.hidden = false;
    valeur('nombre', String(d.essais));
  }
  if (p.creation.couverture)
    saisie.couverture = { id: p.creation.couverture.id, url: p.creation.couverture.url };
  rendreCouverture();
  if (d.jeu && donnees.defi !== null) {
    const r = await api<{ jeu: { nom: string; html: string } | null }>(
      'GET',
      `/api/v1/defis/${donnees.defi}/participations/${p.creation.id}/jeu`,
    );
    if (r.ok && r.donnees.jeu) chargerFichier(r.donnees.jeu.nom, r.donnees.jeu.html);
  }
}

/** Champs d'erreur de l'API → champs du formulaire. */
const CHAMPS_API: Record<string, string> = {
  outilId: 'outil',
  modele: 'modele',
  titre: 'titre',
  idee: 'idee',
  jeu: 'fichier',
  couvertureId: 'couverture',
  essais: 'essais',
};

function annoncer(erreurs: string[]): void {
  const alerte = zone('[data-form-alert]');
  if (!alerte) return;
  alerte.hidden = !erreurs.length;
  alerte.innerHTML = erreurs.length
    ? `${icon('alert')}<span>${erreurs.length === 1 ? 'Un point reste à compléter avant de publier.' : `${erreurs.length} points restent à compléter avant de publier.`}</span>`
    : '';
}

function focaliser(id: string): void {
  const f = zone('[data-form]') as HTMLFormElement | null;
  if (!f) return;
  const cible =
    id === 'fichier'
      ? (zone('[data-file-input]') ?? zone('[data-file-remove]'))
      : id === 'titre'
        ? zone('#df-titre-part')
        : id === 'essais'
          ? zone('#df-nombre')
          : id === 'prompt'
            ? ($$<HTMLTextAreaElement>('[data-prompt-item] textarea', f).find(
                (x) => !x.value.trim(),
              ) ?? zone('#df-prompt-0'))
            : id === 'couverture'
              ? zone('[data-cover-input]')
              : zone(`#df-${id}`);
  (cible as HTMLElement | null)?.focus();
}

function valider() {
  const f = zone('[data-form]') as HTMLFormElement | null;
  if (!f) return null;
  const lire = (nom: string) =>
    ((f.elements.namedItem(nom) as HTMLInputElement | null)?.value ?? '').trim();
  const erreurs: string[] = [];
  const verifier = (id: string, message: string) => {
    erreurChamp(id, message);
    if (message) erreurs.push(id);
  };
  const outilId = Number(lire('outil'));
  verifier('outil', outilId ? '' : 'Choisissez l’outil d’IA utilisé.');
  const prompts = $$<HTMLTextAreaElement>('[data-prompt-item] textarea', f).map((x) =>
    x.value.trim(),
  );
  verifier(
    'prompt',
    prompts.every(Boolean)
      ? ''
      : prompts.length > 1
        ? 'Complétez chaque prompt, ou retirez ceux qui sont vides.'
        : 'Collez le prompt envoyé à l’IA.',
  );
  verifier(
    'fichier',
    !saisie.fichier && !saisie.couverture
      ? 'Ajoutez le fichier HTML du jeu.'
      : saisie.fichier?.bloque
        ? 'Ce fichier ne peut pas être publié : voyez le contrôle ci-dessus.'
        : '',
  );
  const titre = lire('titre');
  verifier(
    'titre',
    titre.length < 5 || titre.length > 100 ? 'Le titre compte de 5 à 100 caractères.' : '',
  );
  const idee = lire('idee');
  verifier('idee', idee.length < 20 ? 'Décrivez votre idée en 20 caractères au moins.' : '');
  const plusieurs =
    prompts.length === 1 &&
    (zone('input[name="essais"]:checked') as HTMLInputElement | null)?.value === 'plusieurs';
  const nombre = Number(lire('nombre'));
  if (plusieurs && !(nombre >= 2 && nombre <= 50)) erreurs.push('essais');
  annoncer(erreurs);
  if (erreurs[0]) {
    focaliser(erreurs[0]);
    return null;
  }
  return {
    titre,
    idee,
    outilId,
    modele: lire('modele') || null,
    prompts,
    essais: plusieurs ? nombre : 1,
    moment: saisie.moment,
    jeu: saisie.fichier ? { nom: saisie.fichier.nom, html: saisie.fichier.code } : null,
    couvertureId: saisie.couverture?.id ?? null,
  };
}

async function publier(): Promise<void> {
  const v = valider();
  if (!v || donnees.defi === null || saisie.envoi) return;
  const modifier = saisie.modifier && donnees.mienne;
  const envoyer = zone('button[type="submit"]') as HTMLButtonElement | null;
  saisie.envoi = true;
  if (envoyer) envoyer.disabled = true;
  const r = modifier
    ? await api('PUT', `/api/v1/defis/${donnees.defi}/participations/${donnees.mienne?.id}`, v)
    : await api<{ id: number }>('POST', `/api/v1/defis/${donnees.defi}/participations`, v);
  saisie.envoi = false;
  if (envoyer) envoyer.disabled = false;
  if (!r.ok) {
    const parChamp = Object.entries(r.probleme.erreurs ?? {});
    const ids: string[] = [];
    for (const [cle, message] of parChamp) {
      const id = cle.startsWith('prompts') ? 'prompt' : (CHAMPS_API[cle] ?? '');
      if (!id || ids.includes(id)) continue;
      ids.push(id);
      erreurChamp(id, message);
    }
    annoncer(ids);
    if (ids[0]) focaliser(ids[0]);
    else
      toast(
        r.probleme.detail ??
          'Votre participation n’a pas été enregistrée. Réessayez dans un instant.',
        'alert',
      );
    return;
  }
  const id = modifier ? (donnees.mienne?.id ?? 0) : ((r.donnees as { id: number }).id ?? 0);
  saisie.publiee = true;
  const corps = $('[data-form-body]');
  if (corps) {
    corps.innerHTML = `<div class="df-done"><span class="df-done-icon">${icon('check-circle', 'icon')}</span><h2 id="df-form-title" tabindex="-1">${modifier ? 'Votre participation est à jour' : 'Votre participation est en ligne'}</h2><p>${
      modifier
        ? t(`« ${v.titre} » remplace la version précédente. Les votes reçus sont conservés.`)
        : t(
            `« ${v.titre} » rejoint le défi. La communauté peut la découvrir et voter jusqu’au ${donnees.fin}.`,
          )
    }</p><div class="df-done-actions"><a class="btn btn-primary" href="${esc(`${location.pathname}?participation=${id}`)}">${icon(v.jeu ? 'play' : 'eye')}Voir ma participation</a><button class="btn btn-secondary" type="button" data-share="${id}">${icon('link')}<span>Copier le lien</span></button></div></div>`;
    corrigerTypographie(corps);
  }
  (zone('#df-form-title') as HTMLElement | null)?.focus();
  toast(modifier ? 'Vos modifications sont enregistrées.' : 'Votre participation est en ligne.');
}

/* Essai du jeu avant publication : page d'essai isolée servie par l'API, qui reçoit le code par
   message (le jeu n'est pas enregistré). */
let cadreEssai: HTMLIFrameElement | null = null;
function essayer(): void {
  const z = zone('[data-test]');
  const f = saisie.fichier;
  if (!z || !f || f.bloque) return;
  z.innerHTML = `<div class="df-test-stage"></div><div class="df-test-tools"><button class="df-link-btn" type="button" data-test-stop>Arrêter l’essai</button><span>${icon('shield')}Isolé du site, sans accès à Internet</span></div>`;
  cadreEssai = cadre('/api/v1/participations/essai', `Essai : ${f.nom}`);
  $('.df-test-stage', z)?.replaceChildren(cadreEssai);
}
window.addEventListener('message', (evenement) => {
  if (
    !cadreEssai ||
    evenement.source !== cadreEssai.contentWindow ||
    evenement.data !== 'vysora-essai-pret' ||
    !saisie.fichier
  )
    return;
  // Origine opaque du cadre isolé : « * » est la seule adresse possible ; le code est celui que
  // la personne vient de choisir.
  cadreEssai.contentWindow?.postMessage(saisie.fichier.code, '*');
});

/* Suppression -------------------------------------------------------------------------------- */
async function supprimer(): Promise<void> {
  const m = donnees.mienne;
  if (!m || donnees.defi === null) return;
  const bouton = confirmation ? $<HTMLButtonElement>('[data-supprimer-ok]', confirmation) : null;
  if (bouton) bouton.disabled = true;
  const r =
    m.nature === 'PARTICIPATION'
      ? await api('DELETE', `/api/v1/defis/${donnees.defi}/participations/${m.id}`)
      : await api('DELETE', `/api/v1/defis/${donnees.defi}/participation`);
  if (bouton) bouton.disabled = false;
  if (!r.ok) {
    toast(
      r.probleme.detail ?? 'La suppression n’a pas abouti. Réessayez dans un instant.',
      'alert',
    );
    return;
  }
  messageApresChargement('Votre participation est supprimée.');
  window.location.assign(location.pathname);
}

/* Événements --------------------------------------------------------------------------------- */
async function voter(b: HTMLButtonElement): Promise<void> {
  if (!exiger('contribuer', 'voter « Utile »')) return;
  const id = Number(b.dataset.vote);
  const p = trouver(id);
  if (!p) return;
  const vote = p.monVote;
  b.disabled = true;
  const reponse = await api(vote ? 'DELETE' : 'PUT', `/api/v1/contenus/${id}/votes/UTILE`);
  b.disabled = false;
  if (!reponse.ok) {
    toast(
      reponse.probleme.detail ?? 'Le vote n’a pas été enregistré. Réessayez dans un instant.',
      'alert',
    );
    return;
  }
  p.monVote = !vote;
  p.utiles += vote ? -1 : 1;
  rendre();
  if (lecteur?.open) {
    for (const x of $$('[data-vote]', lecteur)) x.outerHTML = boutonVote(p, votesOuverts, true);
    $<HTMLButtonElement>('[data-vote]', lecteur)?.focus({ preventScroll: true });
  } else $<HTMLButtonElement>(`[data-vote="${id}"]`)?.focus({ preventScroll: true });
  toast(vote ? 'Votre vote a été retiré.' : 'Votre vote Utile a été ajouté.');
}

function participer(b: HTMLButtonElement): void {
  if (donnees.mienne) {
    ouvrirLecteur(donnees.mienne.id, b);
    return;
  }
  if (donnees.enPause) {
    toast('Les participations à ce défi sont en pause.', 'alert');
    return;
  }
  if (!ouvert) return;
  if (!exiger('contribuer', 'participer au défi')) return;
  void ouvrirFormulaire(b, false);
}

document.addEventListener('click', async (evenement) => {
  const b = (evenement.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.hasAttribute('data-participer')) return participer(b);
  if (b.dataset.play) return ouvrirLecteur(Number(b.dataset.play), b);
  if (b.dataset.launch) return lancer();
  if (b.hasAttribute('data-fullscreen')) {
    const stage = lecteur ? $('[data-stage]', lecteur) : null;
    stage
      ?.requestFullscreen?.()
      .then(() => $('iframe', stage)?.focus())
      .catch(() => toast('Le plein écran est indisponible sur cet appareil.', 'alert'));
    return;
  }
  if (b.hasAttribute('data-modifier')) {
    const origine = lecteur?.open ? $<HTMLElement>('.df-top-action [data-modifier]') : b;
    if (lecteur?.open) lecteur.close();
    return ouvrirFormulaire(origine, true);
  }
  if (b.hasAttribute('data-supprimer')) {
    confirmation?.showModal();
    $<HTMLButtonElement>('[data-close]', confirmation ?? document)?.focus();
    return;
  }
  if (b.hasAttribute('data-supprimer-ok')) return supprimer();
  if (b.hasAttribute('data-close')) {
    b.closest('dialog')?.close();
    return;
  }
  if (b.hasAttribute('data-share-defi')) return partager(b);
  if (b.dataset.share)
    return void copier(lien(Number(b.dataset.share)), 'Lien de la participation copié.', b);
  if (b.dataset.copy) {
    const p = trouver(Number(b.dataset.copy));
    const texte = p?.detail?.prompts[Number(b.dataset.index) || 0];
    if (!texte) return;
    const ok = await copier(texte, 'Prompt copié.', b);
    const statut = lecteur ? $('[data-copy-status]', lecteur) : null;
    if (statut) {
      statut.classList.toggle('sr-only', ok);
      statut.textContent = ok
        ? 'Prompt copié dans le presse-papiers.'
        : 'La copie automatique est indisponible. Sélectionnez le prompt pour le copier.';
    }
    return;
  }
  if (b.dataset.vote) return voter(b);
  // Formulaire
  if (b.hasAttribute('data-prompt-add')) {
    const n = formDialogue ? $$('[data-prompt-item]', formDialogue).length : 0;
    if (n >= MAX_PROMPTS) return;
    zone('[data-prompts]')?.insertAdjacentHTML('beforeend', promptHTML(n));
    majPrompts();
    (zone(`#df-prompt-${n}`) as HTMLElement | null)?.focus();
    return;
  }
  if (b.hasAttribute('data-prompt-remove')) {
    const li = b.closest('[data-prompt-item]');
    const k =
      formDialogue && li ? $$('[data-prompt-item]', formDialogue).indexOf(li as HTMLElement) : 0;
    li?.remove();
    majPrompts();
    (zone(`#df-prompt-${Math.max(0, k - 1)}`) as HTMLElement | null)?.focus();
    return;
  }
  if (b.hasAttribute('data-file-remove')) {
    saisie.fichier = null;
    cadreEssai = null;
    rendreFichier();
    (zone('[data-file-input]') as HTMLElement | null)?.focus();
    return;
  }
  if (b.hasAttribute('data-paste-use')) {
    const code = (zone('[data-paste]') as HTMLTextAreaElement | null)?.value ?? '';
    if (!code.trim()) {
      erreurChamp('fichier', 'Collez le code HTML du jeu.');
      return;
    }
    chargerFichier('jeu.html', code);
    (zone('[data-test-launch]') ?? zone('[data-file-remove]'))?.focus();
    return;
  }
  if (b.hasAttribute('data-test-launch')) return essayer();
  if (b.hasAttribute('data-test-stop')) {
    cadreEssai = null;
    rendreFichier();
    (zone('[data-test-launch]') as HTMLElement | null)?.focus();
    return;
  }
  if (b.hasAttribute('data-cover-remove')) {
    saisie.couverture = null;
    rendreCouverture();
    (zone('[data-cover-input]') as HTMLElement | null)?.focus();
    return;
  }
  // Liste
  if (b.dataset.tool !== undefined) {
    etat.outil = b.dataset.tool;
    etat.limite = PAS_PARTICIPATIONS;
    rendre();
  }
  if (b.dataset.view) {
    etat.vue = b.dataset.view === 'liste' ? 'liste' : 'grille';
    try {
      localStorage.setItem(CLE_VUE, etat.vue);
    } catch {
      /* stockage indisponible */
    }
    rendre();
    $<HTMLButtonElement>(`[data-view="${etat.vue}"]`)?.focus();
  }
  if (b.hasAttribute('data-more-next')) {
    const avant = Math.max(PAS_PARTICIPATIONS, etat.limite);
    etat.limite = avant + PAS_PARTICIPATIONS;
    rendre();
    const suivante = $$('[data-entry]')[avant];
    if (suivante)
      ($<HTMLElement>('[data-play], a', suivante) as HTMLElement | null)?.focus({
        preventScroll: true,
      });
    return;
  }
  if (b.hasAttribute('data-more-less')) {
    etat.limite = PAS_PARTICIPATIONS;
    rendre();
    $('#participations')?.scrollIntoView({ block: 'start' });
    $<HTMLButtonElement>('[data-more] button')?.focus({ preventScroll: true });
    return;
  }
  if (b.hasAttribute('data-clear')) {
    etat.outil = '';
    etat.recherche = '';
    etat.limite = PAS_PARTICIPATIONS;
    const recherche = $<HTMLInputElement>('[data-search]');
    if (recherche) recherche.value = '';
    rendre();
  }
});

document.addEventListener('change', (evenement) => {
  const el = evenement.target as HTMLInputElement;
  if (!el.closest?.('[data-form-dialog]')) return;
  if (el.matches('[data-file-input]')) lireFichier(el.files?.[0]);
  if (el.matches('[data-cover-input]')) void envoyerCouverture(el.files?.[0]);
  if (el.matches('#df-outil')) {
    majModeles();
    erreurChamp('outil', '');
  }
  if (el.matches('input[name="essais"]')) {
    const essais = zone('[data-tries]');
    if (essais) essais.hidden = el.value !== 'plusieurs';
    if (essais && !essais.hidden) (zone('#df-nombre') as HTMLElement | null)?.focus();
  }
});
document.addEventListener('input', (evenement) => {
  const el = evenement.target as HTMLInputElement;
  if (!el.closest?.('[data-form]') || el.getAttribute('aria-invalid') !== 'true') return;
  erreurChamp(
    el.id === 'df-titre-part'
      ? 'titre'
      : el.name === 'prompt'
        ? 'prompt'
        : el.id.replace('df-', ''),
    '',
  );
});
formDialogue?.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  void publier();
});
formDialogue?.addEventListener('dragover', (evenement) => {
  const d = (evenement.target as Element).closest?.('[data-drop]');
  if (!d) return;
  evenement.preventDefault();
  d.classList.add('is-over');
});
formDialogue?.addEventListener('dragleave', (evenement) => {
  (evenement.target as Element).closest?.('[data-drop]')?.classList.remove('is-over');
});
formDialogue?.addEventListener('drop', (evenement) => {
  const d = (evenement.target as Element).closest?.('[data-drop]');
  if (!d) return;
  evenement.preventDefault();
  d.classList.remove('is-over');
  lireFichier(evenement.dataTransfer?.files[0]);
});

for (const d of [lecteur, formDialogue, confirmation]) {
  if (!d) continue;
  d.addEventListener('click', (evenement) => {
    if (evenement.target !== d || d === lecteur) return;
    const boite = d.getBoundingClientRect();
    const { clientX: x, clientY: y } = evenement;
    if (x < boite.left || x > boite.right || y < boite.top || y > boite.bottom) d.close();
  });
  d.addEventListener('close', () => {
    if (d === lecteur) {
      $('[data-player-body]')?.replaceChildren();
      lecture.id = 0;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      if (new URLSearchParams(location.search).has('participation'))
        history.replaceState(null, '', location.pathname + location.hash);
      if (lecture.origine?.isConnected) lecture.origine.focus({ preventScroll: true });
    }
    if (d === formDialogue) {
      cadreEssai = null;
      $('[data-form-body]')?.replaceChildren();
      // Publiée ou modifiée : la page se recharge pour la montrer à sa place.
      if (saisie.publiee) {
        window.location.reload();
        return;
      }
      if (saisie.origine?.isConnected) saisie.origine.focus({ preventScroll: true });
    }
  });
}

$('[data-search]')?.addEventListener('input', (evenement) => {
  etat.recherche = (evenement.target as HTMLInputElement).value;
  etat.limite = PAS_PARTICIPATIONS;
  rendre();
});
$('[data-sort]')?.addEventListener('change', (evenement) => {
  etat.tri = (evenement.target as HTMLSelectElement).value === 'recentes' ? 'recentes' : 'utiles';
  etat.limite = PAS_PARTICIPATIONS;
  rendre();
});

/* Compte à rebours (« encore 4 j 7 h »), à la minute. */
function battre(): void {
  if (!donnees.cible) return;
  const s = Math.max(0, Math.floor((new Date(donnees.cible).getTime() - Date.now()) / 1000));
  const j = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const texte = j > 0 ? `${j} j ${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
  for (const el of $$('[data-countdown-court]')) el.textContent = texte;
}
battre();
setInterval(battre, 30_000);

/* Barre d'action sur téléphone : visible une fois la colonne d'action dépassée. */
const barre = $('[data-mobile-bar]');
const colonne = $('.df-top-action');
if (barre && colonne && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    if (e) barre.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(colonne);
}

/* Lien actif de la barre « Sur cette page ». */
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver(
    (entrees) => {
      const active = entrees
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!active) return;
      for (const a of $$<HTMLAnchorElement>('.df-anchors a'))
        if (a.hash === `#${active.target.id}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
    },
    { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
  );
  for (const el of $$('#defi, #participations, #precedents')) observateur.observe(el);
}

rendre();

/* Lien partagé vers une participation (?participation=<id>) : le lecteur s'ouvre. */
const demandee = Number(new URLSearchParams(location.search).get('participation'));
if (demandee && trouver(demandee)) ouvrirLecteur(demandee, $('.df-nav [data-participer]'));
