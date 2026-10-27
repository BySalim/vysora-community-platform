import {
  LIBELLES_DIFFICULTE,
  srcsetImage,
  type BadgeApi,
  type CasApi,
  type ClassementSemaineApi,
  type CliniqueAccueilApi,
  type CorrectionCasApi,
  type DefiAccueilApi,
  type DifficulteCas,
  type SujetEnAttenteApi,
  type AstuceAccueilApi,
} from '@vysora/shared';
import { icone, prenom } from '../explorer/elements';
import { rendreMarkdownEnLigne } from '../markdown';
import { ROUTES } from '../navigation';
import { dateLongue, esc, fmt, pluriel, t, typo } from '../texte';
import { avatar, duree, embleme, ilYa, outilEtModele } from './elements';

/* « Apprendre », « La communauté » et « Progresser » de l'accueil (prototype/app.js : initReflex,
   lab-clinic, lab-challenge, renderTopics, renderBoard, renderBadges). */

const NIVEAUX: Record<DifficulteCas, number> = { DEBUTANT: 1, INTERMEDIAIRE: 2, AVANCE: 3 };
const LETTRES = ['A', 'B', 'C', 'D', 'E'];
/** Au-delà, les options passent sur une colonne (le prototype n'avait que « J’accepte », « Je refuse »,
    « Je corrige »). */
const LONGUEUR_COURTE = 28;
const enMinuscule = (texte: string) => texte.charAt(0).toLowerCase() + texte.slice(1);

/* Bon réflexe ---------------------------------------------------------------------------------- */

/** Ce que la note sous la correction dit de la réponse (prototype : reflexNote). */
export type NoteCas =
  | { sorte: 'enregistree'; juste: boolean }
  | { sorte: 'auteur' }
  /** Visiteur ou compte en lecture seule : la réponse n'est pas gardée ; on peut recommencer. */
  | { sorte: 'libre'; invitation: string };

/** Cas présenté dans le laboratoire (prototype : lab-reflex). */
export function casHTML(cas: CasApi): string {
  const etiquette = cas.etiquettes[0]?.libelle;
  const ia = cas.outil
    ? `<img src="/assets/logos-ia/${esc(cas.outil.logo ?? '')}.svg" alt="" width="18" height="18">`
    : icone('message', 'icon-sm');
  return `<header class="lab-head"><p>${t(`Cas n° ${cas.id}${etiquette ? ` · ${etiquette}` : ''}`)}</p><span class="level" data-level="${NIVEAUX[cas.difficulte]}"><span class="level-bars" aria-hidden="true"><i></i><i></i><i></i></span>${t(LIBELLES_DIFFICULTE[cas.difficulte])}</span></header>
              <div class="transcript">
                <div class="turn">
                  <span class="turn-avatar" aria-hidden="true">${icone('user', 'icon-sm')}</span>
                  <span class="turn-who">${t('Demande d’un membre')}</span>
                  <p>${esc(cas.demandeIa)}</p>
                </div>
                <div class="turn turn-ai">
                  <span class="turn-avatar" aria-hidden="true">${cas.outil?.logo ? ia : icone('message', 'icon-sm')}</span>
                  <span class="turn-who">${t(cas.outil ? `Réponse de ${cas.outil.nom}` : 'Réponse de l’IA')}</span>
                  <p>${esc(cas.reponseIa)}</p>
                </div>
              </div>
              <fieldset class="verdict" data-verdict>
                <legend>${t(cas.question)}</legend>
                <div class="verdict-options${cas.options.some((o) => o.libelle.length > LONGUEUR_COURTE) ? ' is-long' : ''}">
                  ${cas.options.map((o, i) => `<button type="button" data-choice="${o.id}" data-key="${LETTRES[i] ?? ''}"><kbd>${LETTRES[i] ?? ''}</kbd><span>${t(o.libelle)}</span></button>`).join('')}
                </div>
              </fieldset>
              <div class="verdict-result" data-reflex-result tabindex="-1" hidden></div>
              <footer class="lab-foot"><span>Des cas réels, validés par la modération</span><a class="link-arrow" href="${ROUTES.bonReflexe}">Voir tous les cas${icone('arrow')}</a></footer>`;
}

/** Correction après la réponse (prototype : choose) : répartition, analyse de l'auteur, note. */
export function correctionHTML(
  cas: CasApi,
  correction: CorrectionCasApi,
  choix: number | null,
  note: NoteCas,
): string {
  const juste = choix === correction.optionCorrecteId;
  const bonne = cas.options.find((o) => o.id === correction.optionCorrecteId);
  const verdict = `${juste ? 'Bon réflexe' : 'Le bon réflexe'} : ${enMinuscule(bonne?.libelle ?? '').replace(/\.$/, '')}.`;
  const parts = correction.options;
  const libelle = (id: number) => cas.options.find((o) => o.id === id)?.libelle ?? '';
  let suite: string;
  if (note.sorte === 'enregistree')
    suite = `<span>${t(note.juste ? 'Réponse enregistrée dans votre progression : +1 point de réputation.' : 'Réponse enregistrée dans votre progression.')}</span>`;
  else if (note.sorte === 'auteur')
    suite = `<span>${t('Vous avez rédigé ce cas : vous ne pouvez pas y répondre.')}</span>`;
  else
    suite = `<button class="link-btn" type="button" data-reflex-reset>${icone('replay')}Recommencer</button><span>${note.invitation}</span>`;
  return `
        <p class="verdict-title">Réponses de la communauté</p>
        <div class="verdict-dist" aria-hidden="true">${parts.map((o) => `<span class="${o.correcte ? 'is-correct' : ''}" style="--w:${o.part}%"></span>`).join('')}</div>
        <ul class="verdict-legend">${parts.map((o) => `<li${o.correcte ? ' class="is-correct"' : ''}><b>${typo(`${o.part} %`)}</b>${t(libelle(o.id))}${o.id === choix ? '<span class="mine">Votre choix</span>' : ''}</li>`).join('')}</ul>
        <div class="expert">
          ${avatar(cas.auteur, 40)}
          <div>
            <p class="expert-name"><b>${t(cas.auteur.nom)}</b><span>${t(`${cas.auteur.niveau.libelle} · analyse validée par la modération`)}</span></p>
            <p class="expert-verdict${juste || note.sorte === 'auteur' ? '' : ' is-miss'}">${icone(juste || note.sorte === 'auteur' ? 'check-circle' : 'alert', 'icon-sm')}${t(verdict)}</p>
            <p>${rendreMarkdownEnLigne(correction.explication)}</p>
          </div>
        </div>
        <p class="verdict-actions">${suite}</p>`;
}

/* Clinique du prompt --------------------------------------------------------------------------- */

/** Phrases d'une explication, trois au plus : les notes de la reformulation (prototype : diff-notes). */
export function phrases(texte: string, nombre = 3): string[] {
  const toutes = texte
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ«"(])/u)
    .filter(Boolean);
  return toutes.length <= nombre
    ? toutes
    : [...toutes.slice(0, nombre - 1), toutes.slice(nombre - 1).join(' ')];
}

/** Clinique résolue (prototype : lab-clinic) : la demande, le prompt de départ et celui de la réponse
    acceptée, expliqué phrase par phrase. */
export function cliniqueHTML(c: CliniqueAccueilApi): string {
  const reformule = c.promptPropose
    ? `<div class="diff-row diff-add"><span class="diff-sign" aria-hidden="true">+</span><p><span class="sr-only">Prompt reformulé : </span>${esc(c.promptPropose)}</p></div>`
    : '';
  return `<header class="lab-head"><p class="lab-asker">${avatar(c.auteur, 24, 'avatar-sm')}<span><b>${t(c.auteur.nom)}</b>${c.outil ? ` · <span>${outilEtModele(c.outil, c.modele, ' ')}</span>` : ''}</span></p><span class="lab-state">${icone('check-circle')}${t(`Résolue en ${duree(c.resolueEnMinutes)}`)}</span></header>
              <h3 class="clinic-q">${t(`« ${c.titre} »`)}</h3>
              <div class="diff">
                <div class="diff-row diff-del"><span class="diff-sign" aria-hidden="true">−</span><p><span class="sr-only">Prompt initial : </span>${esc(c.promptInitial)}</p></div>
                ${reformule}
              </div>
              <ol class="diff-notes">
                ${phrases(c.explication)
                  .map(
                    (p, i) =>
                      `<li data-note="${i + 1}"><span>${rendreMarkdownEnLigne(p)}</span></li>`,
                  )
                  .join('')}
              </ol>
              <footer class="lab-foot"><span class="answer-by">${avatar(c.reponseAcceptee.auteur, 24, 'avatar-sm')}<span>Suggestion de <b>${t(c.reponseAcceptee.auteur.nom)}</b>${t(c.reponses > 1 ? `, acceptée parmi ${c.reponses} réponses` : ', acceptée')}</span></span><a class="link-arrow" href="${ROUTES.clinique}">Ouvrir une clinique${icone('arrow')}</a></footer>`;
}

/* Défi de la semaine --------------------------------------------------------------------------- */

const formatHeure = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** « 87 participations, dont Ibrahima et Léa » (prototype : challenge-people). */
function participations(d: DefiAccueilApi): string {
  const noms = d.participants.slice(0, 2).map((p) => prenom(p.nom));
  if (!d.participations) return 'Aucune participation pour l’instant';
  if (d.participations === 1) return `1 participation, celle de ${noms[0] ?? ''}`;
  return `${fmt(d.participations)} participations${noms.length === 2 ? `, dont ${noms[0]} et ${noms[1]}` : ''}`;
}

/** Défi en cours (prototype : lab-challenge). */
export function defiHTML(d: DefiAccueilApi): string {
  const heure = formatHeure.format(new Date(d.dateFin)).replace(':', ' h ');
  const media = d.image
    ? `<div class="challenge-media"><img src="${esc(d.image.url)}" srcset="${esc(srcsetImage(d.image))}" sizes="(min-width: 1024px) 360px, 100vw" width="${d.image.largeur}" height="${d.image.hauteur}" alt="${t(d.image.texteAlternatif)}" loading="lazy" decoding="async"></div>`
    : '';
  return `${media}
              <div class="challenge-body">
                <p class="challenge-theme">${t(`Jusqu’au ${dateLongue(d.dateFin).replace(/ \d{4}$/, '')}`)}</p>
                <h3>${t(d.titre)}</h3>
                <ul class="rules">
                  ${d.regles.map((r) => `<li>${icone('check')}${t(r)}</li>`).join('')}
                </ul>
                <p class="challenge-people"><span class="avatar-stack" aria-hidden="true">${d.participants.map((p) => avatar(p, 28)).join('')}</span><span>${t(participations(d))}</span></p>
                <p class="sr-only">${t(`Le défi se termine le ${dateLongue(d.dateFin)} à ${heure} (UTC).`)}</p>
                <div class="countdown" data-countdown data-fin="${esc(d.dateFin)}" aria-hidden="true">
                  <span><b data-cd="d">0</b>jours</span><span><b data-cd="h">00</b>heures</span><span><b data-cd="m">00</b>min</span><span><b data-cd="s">00</b>s</span>
                </div>
                <a class="btn btn-inverse btn-sm" href="${esc(`${ROUTES.defis}/${d.id}-${d.slug}`)}" data-exige="contribuer" data-exige-quoi="participer au défi">Participer au défi${icone('arrow')}</a>
              </div>`;
}

/** Compte à rebours (prototype : initCountdown). */
export function resteAvant(fin: string, maintenant: number): Record<'d' | 'h' | 'm' | 's', string> {
  const reste = Math.max(0, new Date(fin).getTime() - maintenant);
  const deux = (n: number) => String(n).padStart(2, '0');
  return {
    d: String(Math.floor(reste / 86_400_000)),
    h: deux(Math.floor(reste / 3_600_000) % 24),
    m: deux(Math.floor(reste / 60_000) % 60),
    s: deux(Math.floor(reste / 1000) % 60),
  };
}

/* La communauté et Progresser ------------------------------------------------------------------ */

/** « Ces questions attendent votre aide » (prototype : renderTopics). */
export const sujetsHTML = (sujets: SujetEnAttenteApi[], maintenant: Date): string =>
  sujets
    .map((s) => {
      const clinique = s.type === 'CLINIQUE';
      const libelle = clinique ? 'Clinique du prompt' : 'Question';
      return `
      <li class="topic">
        <span class="topic-type"${clinique ? ' data-clinic' : ''}>${icone(clinique ? 'message' : 'help', 'icon-xs')}${t(libelle)}</span>
        <a href="${esc(ROUTES.sujet(s.id, s.slug))}">${t(s.titre)}</a>
        <p>${avatar(s.auteur, 20, 'avatar-xs')}<span>${t(`${s.auteur.nom} · ${ilYa(s.date, maintenant)}${s.outil ? ' · ' : ''}`)}${outilEtModele(s.outil, s.modele)}</span></p>
      </li>`;
    })
    .join('');

/** « Astuce de la semaine » (prototype : tip-card). */
export function astuceHTML(a: AstuceAccueilApi): string {
  return `<div class="card-head"><h3>Astuce de la semaine</h3><span class="tip-tested">${icone('utile')}${t(`Testée par ${pluriel(a.testes, 'membre', 'membres')}`)}</span></div>
            <p class="tip-title">${t(a.titre)}</p>
            <div class="tip-compare">
              <p><span>Avant</span>${esc(a.exempleAvant)}</p>
              <p><span>Après</span>${esc(a.exempleApres)}</p>
            </div>
            <p class="tip-meta">${avatar(a.auteur, 24, 'avatar-sm')}<span>Proposée par <b>${t(a.auteur.nom)}</b>${a.outil ? `<span class="tip-tools">${outilEtModele(a.outil, a.modele, ' ')}</span>` : ''}</span></p>`;
}

/** Ligne du classement de la semaine (prototype : renderBoard). */
export function ligneClassement(c: ClassementSemaineApi, i: number, max: number): string {
  const nom = c.membre.nom;
  const niveau = c.membre.niveau.libelle;
  return `<li data-name="${esc(c.membre.pseudo)}" aria-label="${t(`${i + 1}. ${nom}, ${niveau}, ${pluriel(c.points, 'point', 'points')} cette semaine`)}"><span class="board-rank">${i + 1}</span>${avatar(c.membre, 36)}<span class="board-name"><b>${t(nom)} <small>${t(niveau)}</small></b><span class="board-bar"><span style="--v:${(max ? c.points / max : 0).toFixed(3)}"></span></span></span><span class="board-points"><span data-pts>${t(`${fmt(c.points)} pts`)}</span><small data-gain></small></span></li>`;
}

/** Badges présentés (prototype : renderBadges). */
export const badgesHTML = (badges: BadgeApi[]): string =>
  badges
    .map(
      (b) => `
      <li class="badge" tabindex="0">${embleme(b)}<span class="badge-name">${t(b.libelle)}</span><span class="badge-rule">${t(b.critere)}</span></li>`,
    )
    .join('');

/** Mini-liste d'emblèmes du profil illustré (prototype : data-emblems). */
export const emblemesHTML = (badges: BadgeApi[]): string =>
  badges.map((b) => `<li>${embleme(b)}<span>${t(b.libelle)}</span></li>`).join('');
