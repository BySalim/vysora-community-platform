/* Gestion des défis (S-17, démo validée le 2026-11-16, prototype/administration-defis.js) : liste
   par état (filtres, « À faire »), fiche d'un défi (#defi-<id>) en trois onglets (contenu avec
   aperçu de la page Défis, participations, clôture), actions de l'API d'administration. L'API reste
   juge de chaque action (RG-73, S-17) ; la page n'affiche que celles qu'elle propose. */

import {
  BAREME_REPUTATION,
  erreursParChamp,
  ICONES_CRITERES_DEFI,
  schemaDefi,
  type DefiAdministreApi,
  type DefisApi,
  type ParticipationDefiApi,
} from '@vysora/shared';
import { adresseParticipation, semaineIso } from '../lib/defis';
import { avatar, esc, fmt, icone, logo, pluriel, t } from '../lib/explorer/elements';
import { ROUTES } from '../lib/navigation';
import { afficherErreurs, confirmer, signalerRefus } from './commun/administration';
import { api } from './commun/api';
import { $, $$, toast, typo } from './commun/outils';

type Defi = DefiAdministreApi;
type Regle = Defi['cases'][number];
type Critere = Defi['criteres'][number];
/** Défi en cours d'édition : un défi existant, ou un nouveau (id null). */
type Edition = Omit<
  Defi,
  'id' | 'slug' | 'statut' | 'participations' | 'actions' | 'pauseDepuis'
> & {
  id: number | null;
};
type Phase = 'brouillon' | 'a_venir' | 'en_cours' | 'a_cloturer' | 'cloture' | 'annule';

const page = $('[data-adf-page]');
const teteListe = $('[data-adf-tete-liste]');
let defis: Defi[] = JSON.parse($('#adf-donnees')?.textContent ?? '[]') as Defi[];
const participationsDe = new Map<number, ParticipationDefiApi[]>();
const vue: {
  id: number | 'nouveau' | null;
  onglet: 'contenu' | 'participations' | 'cloture';
  filtre: string;
  edition: Edition | null;
  modifie: boolean;
} = { id: null, onglet: 'contenu', filtre: 'tous', edition: null, modifie: false };

const ic = (nom: string) => icone(nom, '');
const nb = ' ';
const LIMITES = { cases: 4, criteres: 4, communs: 6 };
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
const MOIS_LONGS = [
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
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const numero = (d: Date) => (d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate()));
const jour = (iso: string) => {
  const d = new Date(iso);
  return `${numero(d)}${nb}${MOIS[d.getUTCMonth()]}`;
};
const jourLong = (iso: string) => {
  const d = new Date(iso);
  return `${JOURS[d.getUTCDay()]} ${numero(d)} ${MOIS_LONGS[d.getUTCMonth()]}`;
};
const jourHeure = (iso: string) => {
  const d = new Date(iso);
  return `${jourLong(iso)} à ${d.getUTCHours()}${nb}h${nb}${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const periode = (d: { dateDebut: string; dateFin: string }) =>
  `${jour(d.dateDebut)} – ${jour(d.dateFin)}`;
const versSaisie = (iso: string) => iso.slice(0, 16);
const LIBELLES_ICONES: Record<string, string> = {
  user: 'Personnage',
  keyboard: 'Contrôles',
  smile: 'Humour',
  'trend-up': 'Progression',
  image: 'Image',
  pen: 'Texte',
  globe: 'Lieu',
  grid: 'Composition',
  route: 'Chemin',
  shield: 'Sûreté',
  'check-circle': 'Exactitude',
  code: 'Code',
  repeat: 'Reproductible',
  award: 'Qualité',
  bulb: 'Idée',
  play: 'Jeu',
};

/* Phase d'un défi, comme l'API la voit (RG-73, S-17) ------------------------------------------- */
function phase(d: Pick<Defi, 'statut' | 'dateDebut' | 'dateFin'>): Phase {
  if (d.statut === 'BROUILLON') return 'brouillon';
  if (d.statut === 'ANNULE') return 'annule';
  if (d.statut === 'CLOTURE') return 'cloture';
  const n = Date.now();
  if (new Date(d.dateDebut).getTime() > n) return 'a_venir';
  return new Date(d.dateFin).getTime() > n ? 'en_cours' : 'a_cloturer';
}
const PHASES: Record<Phase, string> = {
  brouillon: 'Brouillon',
  a_venir: 'Programmé',
  en_cours: 'En cours',
  a_cloturer: 'À clôturer',
  cloture: 'Clôturé',
  annule: 'Annulé',
};
const enPause = (d: Defi) => phase(d) === 'en_cours' && Boolean(d.pauseDepuis);
const termine = (d: Defi) => ['cloture', 'annule'].includes(phase(d));
const chip = (d: Defi) =>
  enPause(d)
    ? '<span class="adf-chip is-en_pause">En pause</span>'
    : `<span class="adf-chip is-${phase(d)}">${PHASES[phase(d)]}</span>`;
const manques = (d: Defi) => [
  ...(d.cases.length ? [] : ['règles']),
  ...(d.criteres.length ? [] : ['principes jugés']),
];
const trouver = (id: number) => defis.find((d) => d.id === id) ?? null;

/* Liste -------------------------------------------------------------------------------------------- */
function rendreListe(): string {
  const compte = (cle: string) =>
    defis.filter((d) => cle === 'tous' || (cle === 'termines' ? termine(d) : phase(d) === cle))
      .length;
  const filtres = [
    ['tous', 'Tous'],
    ['en_cours', 'En cours'],
    ['a_venir', 'Programmés'],
    ['brouillon', 'Brouillons'],
    ['a_cloturer', 'À clôturer'],
    ['termines', 'Terminés'],
  ];
  const filtres_ = defis.filter(
    (d) =>
      vue.filtre === 'tous' || (vue.filtre === 'termines' ? termine(d) : phase(d) === vue.filtre),
  );
  const todo: [Defi, string, string, string, string][] = [];
  for (const d of defis) {
    const p = phase(d);
    if (p === 'a_cloturer')
      todo.push([
        d,
        'podium',
        `« ${d.titre} » est terminé depuis le ${jour(d.dateFin)} : clôturez-le pour figer le classement.`,
        'Clôturer',
        'cloture',
      ]);
    if (enPause(d) && d.pauseDepuis)
      todo.push([
        d,
        'pause',
        `« ${d.titre} » : participations en pause depuis le ${jourHeure(d.pauseDepuis)}.`,
        'Reprendre',
        'contenu',
      ]);
    if (p === 'brouillon' && manques(d).length)
      todo.push([
        d,
        'pen',
        `« ${d.titre} » : brouillon à compléter (${manques(d).join(', ')}).`,
        'Compléter',
        'contenu',
      ]);
  }
  const statut = $('[data-adf-statut]');
  if (statut)
    statut.innerHTML = `<span class="is-fort">${pluriel(defis.length, 'défi', 'défis')}</span><span>${t(`${compte('en_cours')} en cours · ${compte('a_venir')} programmé${compte('a_venir') > 1 ? 's' : ''} · ${compte('brouillon')} brouillon${compte('brouillon') > 1 ? 's' : ''}`)}</span>`;
  const ligne = (d: Defi) => `<li class="adf-row">
      <span class="adf-week"><b>S${semaineIso(d.dateDebut)}</b><small>${periode(d)}</small></span>
      <span class="adf-row-main"><button class="adf-row-title" type="button" data-adf-aller="#defi-${d.id}">${t(d.titre)}</button><span class="adf-row-meta"><span>${pluriel(d.cases.length, 'règle', 'règles')}</span><span>${pluriel(d.criteres.length, 'principe jugé', 'principes jugés')}</span></span></span>
      ${chip(d)}
      <span class="adf-row-count"><b>${fmt(d.participations)}</b><small>participation${d.participations > 1 ? 's' : ''}</small></span>
      <span class="adf-row-actions"><a class="btn btn-secondary btn-sm" href="#defi-${d.id}">Gérer${ic('chevron-right')}</a></span>
    </li>`;
  return `<div class="container md-file adf">
      <div class="adf-bar"><div class="adf-filters" role="group" aria-label="Filtrer les défis">${filtres.map(([cle, nom]) => `<button type="button" data-adf-filtre="${cle}" aria-pressed="${vue.filtre === cle}">${nom}<span>${compte(cle ?? '')}</span></button>`).join('')}</div><a class="btn btn-primary" href="#defi-nouveau">${ic('plus')}Nouveau défi</a></div>
      ${todo.length ? `<section class="adf-todo" aria-labelledby="adf-todo-titre"><h2 id="adf-todo-titre">À faire</h2><ul>${todo.map(([d, i, texte, action, onglet]) => `<li>${ic(i)}<span>${t(texte)}</span><a class="btn btn-secondary btn-sm" href="#defi-${d.id}/${onglet}">${action}</a></li>`).join('')}</ul></section>` : ''}
      ${filtres_.length ? `<ol class="adf-list">${filtres_.map(ligne).join('')}</ol>` : `<p class="md-rien ad-vide">${defis.length ? 'Aucun défi dans cet état.' : 'Aucun défi pour l’instant : créez le premier.'}</p>`}
    </div>`;
}

/** Contraintes en texte, une par ligne (comme reglesDuDefi de l'API). */
const contraintesEnLignes = (texte: string | null) =>
  (texte ?? '')
    .split('\n')
    .map((ligne) => ligne.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/* Aperçu de la page publique -------------------------------------------------------------------- */
function apercu(e: Edition, d: Defi | null): string {
  const p = d ? phase(d) : 'brouillon';
  const pause = d ? enPause(d) : false;
  const statut = {
    brouillon: 'Brouillon',
    a_venir: 'Bientôt ouvert',
    en_cours: pause ? 'En pause' : 'En cours',
    a_cloturer: 'Participations closes',
    cloture: 'Clôturé',
    annule: 'Annulé',
  }[p];
  return `<div class="df adf-apercu-page">
      ${pause ? `<p class="df-notice is-pause">${ic('pause')}<span><b>Participations en pause.</b> ${t('L’équipe de Vysora a suspendu les nouvelles participations ; elles reprendront dès que possible.')}</span></p>` : ''}
      <div class="df-top-head"><p class="kicker">${ic('trophy')}Défi de la semaine ${semaineIso(e.dateDebut)}</p></div>
      <h1 class="df-title">${t(e.titre || 'Titre du défi')}</h1>
      <p class="df-dates"><span class="df-status is-${pause ? 'pause' : p === 'en_cours' ? 'en_cours' : p === 'a_venir' ? 'a_venir' : 'autre'}">${statut}</span><span>${t(`jusqu’au ${jourLong(e.dateFin)}`)}</span></p>
      ${e.definition ? `<p class="df-definition">${ic('bulb')}<span>${t(e.definition)}</span></p>` : ''}
      <p class="df-lead${e.enonce ? '' : ' adf-vide'}">${t(e.enonce || 'L’énoncé du défi apparaîtra ici.')}</p>
      <div class="df-brief">
        <section class="df-brief-block"><h2 class="df-brief-label">${ic('check-circle')}Les règles</h2><ul class="df-rule-cards">${
          e.cases.length
            ? e.cases
                .map(
                  (r) =>
                    `<li><b class="df-rule-n">${t(r.chiffre || '–')}</b><span class="df-rule-name">${t(r.intitule || 'Intitulé')}</span><small>${t(r.precision ?? '')}</small></li>`,
                )
                .join('')
            : contraintesEnLignes(e.contraintes).length
              ? contraintesEnLignes(e.contraintes)
                  .map((x) => `<li class="is-texte"><span class="df-rule-name">${t(x)}</span></li>`)
                  .join('')
              : '<li class="adf-vide-case">Aucune règle</li>'
        }</ul></section>
        <section class="df-brief-block"><h2 class="df-brief-label">${ic('award')}Le plus jugé</h2><ul class="df-judged">${e.criteres.length ? e.criteres.map((c) => `<li>${ic(c.icone)}<span>${t(c.libelle || 'Principe')}</span></li>`).join('') : '<li class="adf-vide-case">Aucun principe</li>'}</ul>${e.criteresCommuns.length ? `<p class="df-judged-more"><span>Aussi</span>${e.criteresCommuns.map((x) => `<span class="df-chip">${t(x)}</span>`).join('')}</p>` : ''}</section>
      </div>
    </div>`;
}

/* Fiche : formulaire --------------------------------------------------------------------------- */
const champ = (id: string, label: string, html: string, aide = '') =>
  `<div class="ad-champ adf-champ"><label for="adf-${id}">${label}</label>${html}${aide ? `<p class="adf-aide">${t(aide)}</p>` : ''}<p class="md-erreur" data-ad-erreur="${id}" hidden></p></div>`;

function formulaire(e: Edition, d: Defi | null): string {
  const p = d ? phase(d) : 'brouillon';
  const ro = p === 'cloture' || p === 'annule';
  const dis = ro ? ' disabled' : '';
  const outils = (liste: 'cases' | 'criteres', i: number, nom: string) =>
    ro
      ? ''
      : `<span class="adf-row-tools"><button class="ad-bouton-icone" type="button" data-adf-monter="${liste}" data-i="${i}" aria-label="Monter ${nom} ${i + 1}"${i === 0 ? ' disabled' : ''}>${ic('chevron-right')}</button><button class="ad-bouton-icone" type="button" data-adf-retirer="${liste}" data-i="${i}" aria-label="Retirer ${nom} ${i + 1}">${ic('close')}</button></span>`;
  const regle = (r: Regle, i: number) =>
    `<li class="adf-rule-row" data-adf-regle="${i}"><input aria-label="Chiffre de la règle ${i + 1}" maxlength="4" value="${esc(r.chiffre)}" data-k="chiffre"${dis}><input aria-label="Intitulé de la règle ${i + 1}" maxlength="30" value="${esc(r.intitule)}" placeholder="seul prompt" data-k="intitule"${dis}><input aria-label="Précision de la règle ${i + 1}" maxlength="40" value="${esc(r.precision ?? '')}" placeholder="Sans retouche du résultat" data-k="precision"${dis}>${outils('cases', i, 'la règle')}</li>`;
  const critere = (c: Critere, i: number) =>
    `<li class="adf-crit-row" data-adf-critere="${i}"><span class="adf-crit-icon">${ic(c.icone)}</span><select aria-label="Icône du principe ${i + 1}" data-k="icone"${dis}>${ICONES_CRITERES_DEFI.map((v) => `<option value="${v}"${v === c.icone ? ' selected' : ''}>${LIBELLES_ICONES[v] ?? v}</option>`).join('')}</select><input aria-label="Principe ${i + 1}" maxlength="30" value="${esc(c.libelle)}" placeholder="Animation du personnage" data-k="libelle"${dis}>${outils('criteres', i, 'le principe')}</li>`;
  const notice =
    p === 'annule'
      ? `<p class="adf-notice">${ic('lock')}<span>${t('Défi annulé : il n’est plus visible. Rétablissez-le pour le modifier.')}</span>${d?.actions.includes('retablir') ? '<button class="btn btn-secondary btn-sm" type="button" data-adf-action="retablir">Rétablir le défi</button>' : ''}</p>`
      : p === 'cloture'
        ? `<p class="adf-notice">${ic('lock')}<span>${t('Défi clôturé : le classement est figé, le défi ne se modifie plus.')}</span></p>`
        : d && enPause(d) && d.pauseDepuis
          ? `<p class="adf-notice is-action">${ic('pause')}<span>${t(`Participations en pause depuis le ${jourHeure(d.pauseDepuis)} : la page Défis l’affiche, personne ne peut publier ni inscrire de participation. Les votes et le compte à rebours continuent.`)}</span><button class="btn btn-primary btn-sm" type="button" data-adf-action="reprendre">Reprendre</button></p>`
          : p === 'en_cours'
            ? `<p class="adf-notice is-info">${ic('info')}<span>${t('Défi en cours : chaque modification est visible aussitôt. Repousser la fin prolonge le défi, l’avancer le raccourcit. Les participations déjà publiées restent en ligne si les règles changent.')}</span></p>`
            : p === 'a_cloturer'
              ? `<p class="adf-notice is-action">${ic('clock')}<span>${t('Le défi est terminé. Repoussez la fin pour rouvrir les participations, ou clôturez-le depuis l’onglet Clôture.')}</span></p>`
              : '';
  return `<form class="adf-form" novalidate data-adf-form>
      ${notice}
      <fieldset class="adf-fs"><legend>Le défi</legend>
        ${champ('titre', 'Titre', `<input id="adf-titre" maxlength="150" value="${esc(e.titre)}" data-k="titre"${dis}>`)}
        <div class="adf-row2">
          ${champ('dateDebut', 'Début (UTC)', `<input id="adf-dateDebut" type="datetime-local" value="${versSaisie(e.dateDebut)}" data-k="dateDebut"${dis}>`)}
          ${champ('dateFin', 'Fin (UTC)', `<input id="adf-dateFin" type="datetime-local" value="${versSaisie(e.dateFin)}" data-k="dateFin"${dis}>`, p === 'en_cours' || p === 'a_cloturer' ? 'De 1 à 30 jours. Repoussez-la pour prolonger le défi.' : 'De 1 à 30 jours.')}
        </div>
        ${champ('definition', 'Le thème expliqué <span>(facultatif)</span>', `<textarea id="adf-definition" rows="2" maxlength="300" data-k="definition"${dis}>${esc(e.definition ?? '')}</textarea>`, 'Une phrase pour comprendre le thème, en encadré sous le titre.')}
        ${champ('enonce', 'Énoncé', `<textarea id="adf-enonce" rows="3" maxlength="2000" data-k="enonce"${dis}>${esc(e.enonce)}</textarea>`, 'Ce qui est attendu, sans tout dicter : laissez de la place à l’invention.')}
      </fieldset>
      <fieldset class="adf-fs"><legend>Les règles <span>${e.cases.length}/${LIMITES.cases}</span></legend>
        <p class="adf-aide">${t('Un chiffre, un intitulé court, une précision de quelques mots.')}</p>
        <ol class="adf-rules">${e.cases.map(regle).join('')}</ol>
        ${ro || e.cases.length >= LIMITES.cases ? '' : `<button class="adf-add" type="button" data-adf-ajouter="cases">${ic('plus')}Ajouter une règle</button>`}
        <p class="md-erreur" data-ad-erreur="cases" hidden></p>
        ${champ('contraintes', 'Autres contraintes, une par ligne <span>(facultatif)</span>', `<textarea id="adf-contraintes" rows="2" maxlength="2000" data-k="contraintes"${dis}>${esc(e.contraintes ?? '')}</textarea>`)}
      </fieldset>
      <fieldset class="adf-fs"><legend>Le plus jugé <span>${e.criteres.length}/${LIMITES.criteres}</span></legend>
        <ol class="adf-crits">${e.criteres.map(critere).join('')}</ol>
        ${ro || e.criteres.length >= LIMITES.criteres ? '' : `<button class="adf-add" type="button" data-adf-ajouter="criteres">${ic('plus')}Ajouter un principe</button>`}
        <p class="md-erreur" data-ad-erreur="criteres" hidden></p>
        <div class="ad-champ adf-champ"><label for="adf-commun">Aussi jugés <span>(facultatif)</span></label><div class="adf-chips">${e.criteresCommuns.map((x, i) => `<span class="adf-chip-edit">${t(x)}${ro ? '' : `<button type="button" data-adf-retirer="criteresCommuns" data-i="${i}" aria-label="Retirer ${esc(x)}">${ic('close')}</button>`}</span>`).join('')}${ro || e.criteresCommuns.length >= LIMITES.communs ? '' : '<input id="adf-commun" maxlength="30" placeholder="Ajouter, puis Entrée" data-adf-commun>'}</div><p class="md-erreur" data-ad-erreur="criteresCommuns" hidden></p></div>
      </fieldset>
      <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
      ${ro ? '' : `<div class="adf-form-foot"><p class="adf-save-state${vue.modifie ? ' is-sale' : ''}" data-adf-etat-saisie>${vue.modifie ? `${ic('pen')}Modifications non enregistrées` : `${ic('check-circle')}${e.id ? 'Enregistré' : 'Nouveau brouillon'}`}</p><div>${p === 'brouillon' ? '<button class="btn btn-secondary" type="submit" data-adf-enregistrer>Enregistrer le brouillon</button><button class="btn btn-primary" type="button" data-adf-publier>Publier</button>' : '<button class="btn btn-primary" type="submit" data-adf-enregistrer>Enregistrer</button>'}</div></div>`}
    </form>`;
}

/* Fiche : participations et clôture ----------------------------------------------------------------- */
function participations(d: Defi): string {
  const p = phase(d);
  const liste = participationsDe.get(d.id);
  if (!liste) return '<p class="md-rien ad-vide">Chargement des participations…</p>';
  if (!liste.length)
    return `<p class="md-rien ad-vide">${t(p === 'brouillon' || p === 'a_venir' ? 'Les participations apparaîtront ici dès l’ouverture du défi.' : p === 'annule' ? 'Défi annulé : ses participations ne sont plus visibles.' : 'Aucune participation pour l’instant.')}</p>`;
  return `<table class="ad-table adf-table">
      <thead><tr><th scope="col">Participation</th><th scope="col">Outil</th><th scope="col">Votes</th><th scope="col">Rang</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${liste
        .map((x, i) => {
          const o = x.creation.outils[0];
          const lien = adresseParticipation(x, d);
          return `<tr>
        <td><div class="adf-part">${x.creation.couverture ? `<img src="${esc(x.creation.couverture.url)}" alt="" width="96" height="54">` : `<span class="adf-part-vide">${ic('image')}</span>`}<span><b>${t(x.creation.titre)}</b><small>${avatar(x.auteur, 18)}${t(x.auteur.nom)} · ${jour(x.datePublication)}</small></span></div></td>
        <td><span class="adf-outil">${o ? `${logo(o.outil, 18)}${t(o.outil.nom)}${o.modeles.length ? t(` · ${o.modeles.join(', ')}`) : ''}` : '—'}</span></td>
        <td class="adf-votes"><b>${fmt(x.utiles)}</b></td>
        <td><span class="adf-etat is-ok">${x.rang ?? i + 1}${x.rang ? '' : ' (provisoire)'}</span></td>
        <td class="ad-cellule-action"><div class="adf-part-actions"><a class="btn btn-secondary btn-sm" href="${esc(lien)}">Voir</a></div></td>
      </tr>`;
        })
        .join('')}</tbody></table>`;
}

function cloture(d: Defi): string {
  const p = phase(d);
  if (p === 'annule')
    return '<p class="md-rien ad-vide">Défi annulé : aucun classement ni point.</p>';
  if (p === 'brouillon' || p === 'a_venir')
    return `<p class="md-rien ad-vide">${t(`La clôture viendra une fois le défi commencé, à partir du ${jourLong(d.dateDebut)}.`)}</p>`;
  const liste = participationsDe.get(d.id);
  if (!liste) return '<p class="md-rien ad-vide">Chargement du classement…</p>';
  const parPodium = BAREME_REPUTATION.podiumDefi;
  const parParticipation = BAREME_REPUTATION.participationDefi;
  const podium = liste
    .slice(0, 3)
    .map(
      (x, i) =>
        `<li><span class="adf-pod-rank">${i + 1}</span>${avatar(x.auteur, 32)}<span><b>${t(x.creation.titre)}</b><small>${t(x.auteur.nom)} · ${fmt(x.utiles)}${nb}vote${x.utiles > 1 ? 's' : ''}</small></span><span class="adf-pod-pts">+${(parPodium[i] ?? 0) + parParticipation}${nb}pts</span></li>`,
    )
    .join('');
  const points =
    liste.length * parParticipation + parPodium.slice(0, liste.length).reduce((s, x) => s + x, 0);
  const corps = liste.length
    ? `<ol class="adf-podium">${podium}</ol><dl class="adf-points"><div><dt>Participations classées</dt><dd>${fmt(liste.length)}</dd></div><div><dt>Points crédités</dt><dd>${fmt(points)}</dd></div><div><dt>Badges</dt><dd class="is-texte">Participant pour tous, Podium pour les trois premiers</dd></div></dl>`
    : '<p class="md-rien">Aucune participation à classer.</p>';
  const bouton = (libelle: string) =>
    `<div class="adf-form-foot"><span></span><div><button class="btn btn-primary" type="button" data-adf-action="cloturer">${libelle}</button></div></div>`;
  if (p === 'en_cours')
    return `<p class="adf-notice">${ic('clock')}<span>${t(`Le défi se termine le ${jourLong(d.dateFin)}. Vous pouvez le clôturer dès maintenant : les participations ferment aussitôt. Classement provisoire :`)}</span></p>${corps}${bouton('Clôturer maintenant')}`;
  if (p === 'a_cloturer')
    return `<p class="adf-notice is-action">${ic('podium')}<span>${t(`Le défi est terminé. Clôturer fige le classement, crédite les points (${parPodium.join(', ')} pour le podium, ${parParticipation} par participation), attribue les badges et prévient chaque participant.`)}</span></p>${corps}${bouton('Clôturer le défi')}`;
  return `<p class="adf-notice">${ic('lock')}<span>${t('Défi clôturé : classement définitif.')}</span></p>${corps}`;
}

function rendreFiche(d: Defi | null, e: Edition): string {
  const p = d ? phase(d) : 'brouillon';
  const a = d?.actions ?? [];
  const actions = [
    d && p === 'brouillon'
      ? `<button class="btn btn-quiet btn-sm adf-danger" type="button" data-adf-action="supprimer">${ic('close')}Supprimer</button>`
      : '',
    a.includes('annuler') && p !== 'brouillon'
      ? '<button class="btn btn-quiet btn-sm adf-danger" type="button" data-adf-action="annuler">Annuler le défi</button>'
      : '',
    a.includes('retablir')
      ? '<button class="btn btn-secondary btn-sm" type="button" data-adf-action="retablir">Rétablir</button>'
      : '',
    d
      ? '<button class="btn btn-secondary btn-sm" type="button" data-adf-action="dupliquer">Dupliquer</button>'
      : '',
    d && p !== 'brouillon'
      ? `<a class="btn btn-secondary btn-sm" href="${esc(ROUTES.defi(d.id, d.slug))}">Voir sur le site${ic('arrow-up-right')}</a>`
      : '',
    a.includes('ouvrir')
      ? '<button class="btn btn-primary btn-sm" type="button" data-adf-action="ouvrir">Ouvrir maintenant</button>'
      : '',
    a.includes('reprendre')
      ? `<button class="btn btn-primary btn-sm" type="button" data-adf-action="reprendre">${ic('play')}Reprendre les participations</button>`
      : '',
    a.includes('pause')
      ? `<button class="btn btn-secondary btn-sm" type="button" data-adf-action="pause">${ic('pause')}Mettre en pause</button>`
      : '',
    a.includes('cloturer')
      ? `<button class="btn btn-primary btn-sm" type="button" data-adf-action="cloturer">${p === 'en_cours' ? 'Clôturer maintenant' : 'Clôturer'}</button>`
      : '',
  ].join('');
  const onglets: [typeof vue.onglet, string][] = d
    ? [
        ['contenu', 'Contenu'],
        [
          'participations',
          `Participations${d.participations ? ` <span>${fmt(d.participations)}</span>` : ''}`,
        ],
        ['cloture', 'Clôture'],
      ]
    : [['contenu', 'Contenu']];
  return `<div class="container md-tete adf-tete">
      <button class="adf-retour" type="button" data-adf-aller="">${ic('chevron-right')}Tous les défis</button>
      <p class="md-rubrique">${ic('shield')}Administration · Défi de la semaine ${semaineIso(e.dateDebut)}</p>
      <div class="adf-tete-main"><div><h1>${t(e.titre.trim() || 'Nouveau défi')}</h1><p class="adf-tete-meta">${d ? chip(d) : '<span class="adf-chip is-brouillon">Brouillon</span>'}<span>${t(`Du ${jourLong(e.dateDebut)} au ${jourLong(e.dateFin)}, UTC`)}</span></p></div><div class="adf-tete-actions">${actions}</div></div>
      <div class="adf-tabs" role="tablist">${onglets.map(([cle, nom]) => `<button type="button" role="tab" aria-selected="${vue.onglet === cle}" data-adf-aller="#defi-${d ? d.id : 'nouveau'}${cle === 'contenu' ? '' : `/${cle}`}">${nom}</button>`).join('')}</div>
    </div>
    <div class="container md-file adf">
      ${vue.onglet === 'contenu' || !d ? `<div class="adf-edit"><div>${formulaire(e, d)}</div><aside class="adf-apercu" aria-label="Aperçu de la page Défis"><p class="adf-apercu-label">${ic('eye')}Aperçu sur la page Défis</p><div class="adf-apercu-cadre" data-adf-apercu>${apercu(e, d)}</div></aside></div>` : vue.onglet === 'participations' ? participations(d) : cloture(d)}
    </div>`;
}

/* Montage ------------------------------------------------------------------------------------------- */
function editionDe(d: Defi): Edition {
  return {
    id: d.id,
    titre: d.titre,
    enonce: d.enonce,
    contraintes: d.contraintes,
    definition: d.definition,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin,
    cases: d.cases.map((x) => ({ ...x })),
    criteres: d.criteres.map((x) => ({ ...x })),
    criteresCommuns: [...d.criteresCommuns],
  };
}
function nouvelleEdition(base: Defi | null): Edition {
  const debut = new Date();
  debut.setUTCDate(debut.getUTCDate() + ((8 - debut.getUTCDay()) % 7 || 7));
  debut.setUTCHours(0, 0, 0, 0);
  const fin = new Date(debut.getTime() + 7 * 86_400_000 - 60_000);
  return {
    id: null,
    titre: base ? `${base.titre} (copie)`.slice(0, 150) : '',
    enonce: base?.enonce ?? '',
    contraintes: base?.contraintes ?? null,
    definition: base?.definition ?? null,
    dateDebut: debut.toISOString(),
    dateFin: fin.toISOString(),
    cases: base
      ? base.cases.map((x) => ({ ...x }))
      : [{ chiffre: '1', intitule: 'participation', precision: 'Par personne' }],
    criteres: base ? base.criteres.map((x) => ({ ...x })) : [],
    criteresCommuns: base ? [...base.criteresCommuns] : [],
  };
}

async function chargerParticipations(d: Defi): Promise<void> {
  if (participationsDe.has(d.id) || d.statut === 'BROUILLON') {
    if (d.statut === 'BROUILLON') participationsDe.set(d.id, []);
    return;
  }
  const reponse = await api<DefisApi>('GET', `/api/v1/defis?defi=${d.id}`);
  participationsDe.set(
    d.id,
    reponse.ok && reponse.donnees.defi?.id === d.id ? reponse.donnees.participations : [],
  );
  if (vue.id === d.id && vue.onglet !== 'contenu') rendre();
}

function rendre(focus?: string): void {
  if (!page) return;
  const d = typeof vue.id === 'number' ? trouver(vue.id) : null;
  const fiche = vue.id === 'nouveau' || d;
  if (teteListe) teteListe.hidden = Boolean(fiche);
  if (fiche) {
    if (!vue.edition) vue.edition = d ? editionDe(d) : nouvelleEdition(null);
    page.innerHTML = rendreFiche(d, vue.edition);
    if (d && vue.onglet !== 'contenu') void chargerParticipations(d);
  } else page.innerHTML = rendreListe();
  if (focus) $<HTMLElement>(focus, page)?.focus({ preventScroll: true });
}

/** Adresse : #defi-<id>[/participations|/cloture], #defi-nouveau ; rien : la liste. */
function suivreAdresse(): void {
  const m = /^#defi-(\d+|nouveau)(?:\/(participations|cloture|contenu))?$/.exec(location.hash);
  const id = m ? (m[1] === 'nouveau' ? 'nouveau' : Number(m[1])) : null;
  if (id !== vue.id) {
    vue.edition = vue.id === 'nouveau' && id === 'nouveau' ? vue.edition : null;
    vue.modifie = false;
  }
  vue.id = id;
  vue.onglet = (m?.[2] as typeof vue.onglet | undefined) ?? 'contenu';
  rendre(id ? 'h1' : undefined);
  if (id) scrollTo({ top: 0 });
}

/** Le formulaire relu dans l'édition (sans enregistrer). */
function lire(): void {
  const f = $<HTMLFormElement>('[data-adf-form]');
  const e = vue.edition;
  if (!f || !e) return;
  const val = (k: string) =>
    $<HTMLInputElement | HTMLTextAreaElement>(`[data-k="${k}"]`, f)?.value ?? '';
  e.titre = val('titre');
  e.enonce = val('enonce');
  e.definition = val('definition') || null;
  e.contraintes = val('contraintes') || null;
  if (val('dateDebut')) e.dateDebut = new Date(`${val('dateDebut')}:00Z`).toISOString();
  if (val('dateFin')) e.dateFin = new Date(`${val('dateFin')}:00Z`).toISOString();
  e.cases = $$<HTMLLIElement>('[data-adf-regle]', f).map((li) => ({
    chiffre: $<HTMLInputElement>('[data-k="chiffre"]', li)?.value ?? '',
    intitule: $<HTMLInputElement>('[data-k="intitule"]', li)?.value ?? '',
    precision: $<HTMLInputElement>('[data-k="precision"]', li)?.value || null,
  }));
  e.criteres = $$<HTMLLIElement>('[data-adf-critere]', f).map((li) => ({
    icone: $<HTMLSelectElement>('[data-k="icone"]', li)?.value ?? 'award',
    libelle: $<HTMLInputElement>('[data-k="libelle"]', li)?.value ?? '',
  }));
}
function majApercu(): void {
  const e = vue.edition;
  if (!e) return;
  lire();
  vue.modifie = true;
  const d = typeof vue.id === 'number' ? trouver(vue.id) : null;
  const cadre = $('[data-adf-apercu]');
  if (cadre) cadre.innerHTML = apercu(e, d);
  for (const [i, li] of $$<HTMLLIElement>('[data-adf-critere]').entries()) {
    const zone = $('.adf-crit-icon', li);
    if (zone && e.criteres[i]) zone.innerHTML = ic(e.criteres[i].icone);
  }
  const etat = $('[data-adf-etat-saisie]');
  if (etat) {
    etat.innerHTML = `${ic('pen')}Modifications non enregistrées`;
    etat.classList.add('is-sale');
  }
}

/** Saisie envoyée à l'API (schemaDefi) : lignes vides écartées, dates en UTC. */
function saisie() {
  const e = vue.edition!;
  return {
    titre: e.titre,
    enonce: e.enonce,
    contraintes: e.contraintes,
    definition: e.definition,
    dateDebut: e.dateDebut,
    dateFin: e.dateFin,
    cases: e.cases.filter((r) => r.chiffre.trim() || r.intitule.trim() || r.precision?.trim()),
    criteres: e.criteres.filter((c) => c.libelle.trim()),
    criteresCommuns: e.criteresCommuns,
  };
}
const regrouper = (erreurs: Record<string, string>) => {
  const parChamp: Record<string, string> = {};
  for (const [cle, message] of Object.entries(erreurs)) {
    const champ_ = cle.split('.')[0] ?? cle;
    if (!(champ_ in parChamp)) parChamp[champ_] = message;
  }
  return parChamp;
};

async function rechargerDefis(): Promise<void> {
  const reponse = await api<Defi[]>('GET', '/api/v1/admin/defis');
  if (reponse.ok) defis = reponse.donnees;
}

async function enregistrer(publier: boolean): Promise<void> {
  const f = $<HTMLFormElement>('[data-adf-form]');
  if (!f || !vue.edition) return;
  lire();
  const s = saisie();
  const controle = schemaDefi.safeParse(s);
  if (!controle.success) {
    afficherErreurs(f, regrouper(erreursParChamp(controle.error)));
    $<HTMLElement>('[aria-invalid="true"]', f)?.focus();
    toast(
      publier ? 'Le défi n’est pas encore prêt à être publié.' : 'Vérifiez les champs signalés.',
      'alert',
    );
    return;
  }
  afficherErreurs(f, {});
  const envoi = async () => {
    const id = vue.edition?.id;
    const reponse = id
      ? await api<Defi>('PATCH', `/api/v1/admin/defis/${id}`, s)
      : await api<Defi>('POST', '/api/v1/admin/defis', s);
    if (!reponse.ok) {
      afficherErreurs(
        f,
        regrouper(
          reponse.probleme.erreurs ?? {
            general: reponse.probleme.detail ?? reponse.probleme.title,
          },
        ),
      );
      return;
    }
    let defi = reponse.donnees;
    if (publier) {
      const publication = await api<Defi>('POST', `/api/v1/admin/defis/${defi.id}/publication`, {});
      if (!publication.ok) return signalerRefus(publication.probleme);
      defi = publication.donnees;
    }
    await rechargerDefis();
    vue.edition = null;
    vue.modifie = false;
    toast(
      publier
        ? new Date(defi.dateDebut) > new Date()
          ? 'Défi publié et programmé.'
          : 'Défi publié.'
        : id
          ? 'Défi enregistré.'
          : 'Brouillon créé : complétez-le, puis publiez-le.',
    );
    if (`#defi-${defi.id}` === location.hash) rendre('h1');
    else location.hash = `#defi-${defi.id}`;
  };
  if (!publier) return envoi();
  const aVenir = new Date(s.dateDebut) > new Date();
  confirmer(
    'Publier ce défi ?',
    aVenir
      ? `« ${s.titre} » sera visible dès maintenant et ouvrira le ${jourLong(s.dateDebut)}.`
      : `« ${s.titre} » ouvre tout de suite aux participations.`,
    'Publier',
    envoi,
  );
}

const ACTIONS: Record<string, [string, string, string, 'POST' | 'DELETE', string, string]> = {
  pause: [
    'Mettre ce défi en pause ?',
    'plus personne ne peut publier ni inscrire de participation ; la page Défis l’indique. Les participations publiées restent visibles, les votes et le compte à rebours continuent.',
    'Mettre en pause',
    'POST',
    'pause',
    'Défi en pause : les participations sont fermées.',
  ],
  reprendre: [
    'Reprendre les participations ?',
    'le défi accepte de nouveau les participations jusqu’à sa date de fin.',
    'Reprendre',
    'DELETE',
    'pause',
    'Participations rouvertes.',
  ],
  ouvrir: [
    'Ouvrir ce défi maintenant ?',
    'les participations sont acceptées dès maintenant ; sa date de fin ne change pas.',
    'Ouvrir',
    'POST',
    'ouverture',
    'Défi ouvert aux participations.',
  ],
  retablir: [
    'Rétablir ce défi ?',
    'il redevient visible ; selon ses dates, il est à venir, en cours ou terminé.',
    'Rétablir',
    'POST',
    'retablissement',
    'Défi rétabli.',
  ],
  annuler: [
    'Annuler ce défi ?',
    'les participations sont fermées et le défi ne sera pas classé.',
    'Annuler le défi',
    'POST',
    'annulation',
    'Défi annulé.',
  ],
  cloturer: [
    'Clôturer ce défi ?',
    'les participations ferment aussitôt, même avant la date de fin ; le classement est figé, les points de participation et du podium sont crédités et chaque participant est prévenu. Cette action est définitive.',
    'Clôturer',
    'POST',
    'cloture',
    'Défi clôturé : le classement est publié.',
  ],
};

async function action(quoi: string): Promise<void> {
  const d = typeof vue.id === 'number' ? trouver(vue.id) : null;
  if (!d) return;
  if (quoi === 'dupliquer') {
    vue.edition = nouvelleEdition(d);
    vue.modifie = true;
    location.hash = '#defi-nouveau';
    toast('Copie prête : ajustez-la, puis enregistrez-la en brouillon.');
    return;
  }
  if (quoi === 'supprimer') {
    confirmer(
      'Supprimer ce brouillon ?',
      `« ${d.titre} » disparaît définitivement.`,
      'Supprimer',
      async () => {
        const reponse = await api('DELETE', `/api/v1/admin/defis/${d.id}`);
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        await rechargerDefis();
        toast('Brouillon supprimé.');
        location.hash = '';
      },
    );
    return;
  }
  const a = ACTIONS[quoi];
  if (!a) return;
  const [titre, texte, libelle, methode, chemin, message] = a;
  confirmer(titre, `« ${d.titre} » : ${texte}`, libelle, async () => {
    const reponse = await api<Defi>(methode, `/api/v1/admin/defis/${d.id}/${chemin}`, {});
    if (!reponse.ok) return signalerRefus(reponse.probleme);
    await rechargerDefis();
    participationsDe.delete(d.id);
    vue.edition = null;
    vue.modifie = false;
    toast(message);
    rendre('h1');
  });
}

/* Événements ------------------------------------------------------------------------------------ */
page?.addEventListener('click', (evenement) => {
  const b = (evenement.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.adfAller !== undefined) {
    if (b.dataset.adfAller === '') history.pushState(null, '', location.pathname);
    else location.hash = b.dataset.adfAller;
    if (b.dataset.adfAller === '') suivreAdresse();
    return;
  }
  if (b.dataset.adfFiltre) {
    vue.filtre = b.dataset.adfFiltre;
    rendre(`[data-adf-filtre="${vue.filtre}"]`);
    return;
  }
  if (b.hasAttribute('data-adf-publier')) return void enregistrer(true);
  if (b.dataset.adfAction) return void action(b.dataset.adfAction);
  const e = vue.edition;
  if (!e) return;
  const liste = (b.dataset.adfAjouter ?? b.dataset.adfRetirer ?? b.dataset.adfMonter) as
    'cases' | 'criteres' | 'criteresCommuns' | undefined;
  if (!liste) return;
  lire();
  const i = Number(b.dataset.i);
  if (b.dataset.adfAjouter === 'cases')
    e.cases.push({ chiffre: '', intitule: '', precision: null });
  else if (b.dataset.adfAjouter === 'criteres') e.criteres.push({ icone: 'award', libelle: '' });
  else if (b.dataset.adfRetirer) (e[liste] as unknown[]).splice(i, 1);
  else if (b.dataset.adfMonter && i > 0) {
    const l = e[liste] as unknown[];
    [l[i - 1], l[i]] = [l[i], l[i - 1]];
  }
  vue.modifie = true;
  rendre();
  if (b.dataset.adfAjouter) {
    const champs = $$<HTMLInputElement>(
      b.dataset.adfAjouter === 'cases' ? '[data-adf-regle] input' : '[data-adf-critere] input',
    );
    (b.dataset.adfAjouter === 'cases'
      ? champs[champs.length - 3]
      : champs[champs.length - 1]
    )?.focus();
  }
});
page?.addEventListener('submit', (evenement) => {
  if (!(evenement.target as Element).closest('[data-adf-form]')) return;
  evenement.preventDefault();
  void enregistrer(false);
});
page?.addEventListener('input', (evenement) => {
  const cible = evenement.target as Element;
  if (cible.closest('[data-adf-form]') && !cible.matches('[data-adf-commun]')) majApercu();
});
page?.addEventListener('change', (evenement) => {
  if ((evenement.target as Element).closest('[data-adf-form]')) majApercu();
});
page?.addEventListener('keydown', (evenement) => {
  const cible = evenement.target as HTMLInputElement;
  if (!cible.matches('[data-adf-commun]') || evenement.key !== 'Enter') return;
  evenement.preventDefault();
  const valeur = cible.value.trim();
  const e = vue.edition;
  if (!valeur || !e) return;
  lire();
  if (!e.criteresCommuns.includes(valeur) && e.criteresCommuns.length < LIMITES.communs)
    e.criteresCommuns.push(valeur);
  vue.modifie = true;
  rendre('[data-adf-commun]');
  majApercu();
});
window.addEventListener('hashchange', suivreAdresse);
window.addEventListener('beforeunload', (evenement) => {
  if (vue.modifie && vue.edition) evenement.preventDefault();
});

suivreAdresse();
if (!page) typo('');
