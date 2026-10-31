/* Classements (S-08), portés de prototype/classements.js : en-tête (semaines, dates, chiffres,
   lauréats), palmarès par contribution, classement des membres et règles. Rendus par le serveur à
   partir de GET /api/v1/classements ; scripts/classements.ts ne fait qu'alterner les classements,
   filtrer par niveau et afficher les cinquante premiers. */

import {
  BAREME_REPUTATION,
  NIVEAUX,
  type ClassementsApi,
  type CodeNiveau,
  type CreationPalmaresApi,
  type EntreeAstuceApi,
  type EntreeCreationApi,
  type EntreeEntraideApi,
  type MembreResumeApi,
  type RangClassementApi,
  type SemaineClassementApi,
  type SujetPalmaresApi,
} from '@vysora/shared';
import {
  avatar,
  esc,
  etiquetteType,
  fmt,
  icone,
  image,
  logo,
  pluriel,
  t,
} from '../explorer/elements';
import { ROUTES } from '../navigation';
import { typo } from '../texte';

export type CleCategorie = 'reussites' | 'entraide' | 'utiles' | 'astuces';
export const ORDRE: CleCategorie[] = ['reussites', 'entraide', 'utiles', 'astuces'];

export const CATEGORIES: Record<
  CleCategorie,
  { label: string; icon: string; title: string; rule: string; cta: [string, string] }
> = {
  reussites: {
    label: 'Méthodes réussies',
    icon: 'repeat',
    title: 'Méthodes réussies par d’autres',
    rule: 'Reproductions réussies déclarées par d’autres membres sur une création « 1 prompt » ou « Itération ». Chaque membre compte une fois par création.',
    cta: [ROUTES.explorer, 'Reproduire une création'],
  },
  entraide: {
    label: 'Entraide',
    icon: 'reply',
    title: 'Réponses qui ont débloqué un membre',
    rule: 'Réponses acceptées par l’auteur de la question dans le Forum, puis votes « Utile » reçus sur ces réponses.',
    cta: [ROUTES.forumSansReponse, 'Répondre à une question'],
  },
  utiles: {
    label: 'Créations utiles',
    icon: 'utile',
    title: 'Créations jugées utiles',
    rule: 'Votes « Utile » reçus sur une création, tous types confondus. Un projet documenté étape par étape y a toute sa place.',
    cta: [ROUTES.publier, 'Publier une création'],
  },
  astuces: {
    label: 'Astuces vérifiées',
    icon: 'bulb',
    title: 'Astuces vérifiées par la communauté',
    rule: 'Votes « Testé, ça marche » reçus sur une astuce du Forum.',
    cta: [`${ROUTES.nouveauSujet}?type=astuce`, 'Partager une astuce'],
  },
};

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
const MOIS_COURTS = [
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
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const jour = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** « du 26 octobre au 1er novembre 2026 » */
export function periodeLongue(s: SemaineClassementApi): string {
  const a = jour(s.debut);
  const b = jour(s.fin);
  const j = (d: Date) => (d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate()));
  return a.getUTCMonth() === b.getUTCMonth()
    ? `du ${j(a)} au ${j(b)} ${MOIS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
    : `du ${j(a)} ${MOIS[a.getUTCMonth()]} au ${j(b)} ${MOIS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

/** « 19–25 oct. », « 26 oct. – 1er nov. » */
export function periodeCourte(s: SemaineClassementApi): string {
  const a = jour(s.debut);
  const b = jour(s.fin);
  const j = (d: Date) => (d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate()));
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${j(a)}–${j(b)} ${MOIS_COURTS[b.getUTCMonth()]}`
    : `${j(a)} ${MOIS_COURTS[a.getUTCMonth()]} – ${j(b)} ${MOIS_COURTS[b.getUTCMonth()]}`;
}

const ordinal = (n: number) => (n === 1 ? '1<sup>er</sup>' : `${n}<sup>e</sup>`);
const libelleNiveau = (code: CodeNiveau) => NIVEAUX.find((n) => n.code === code)?.libelle ?? '';

/** Membre (prototype : memberBtn), lien vers son profil. */
export function membreHTML(m: MembreResumeApi, taille = 36, moiId: number | null = null): string {
  const texte = `<span class="cl-who-text"><b>${t(m.nom)}</b><small>${t(m.niveau.libelle)}</small></span>`;
  return `<a class="cl-who${m.id === moiId ? ' is-me' : ''}" href="${esc(ROUTES.profil(m.pseudo))}">${avatar(m, taille)}${texte}</a>`;
}

const outilsCreation = (c: CreationPalmaresApi) =>
  c.outils
    .map(
      ({ outil, modeles }) =>
        `<span class="cl-tool-ref">${logo(outil, 16)}${t(outil.nom)}${modeles.length ? ` <span class="cl-model">${t(modeles.join(', '))}</span>` : ''}</span>`,
    )
    .join('<span class="cl-sep" aria-hidden="true">+</span>');
const outilSujet = (s: SujetPalmaresApi) =>
  s.outil
    ? `<span class="cl-tool-ref">${logo(s.outil, 16)}${t(s.outil.nom)}${s.modele ? ` <span class="cl-model">${t(s.modele)}</span>` : ''}</span>`
    : '';
const lienCreation = (c: CreationPalmaresApi) => ROUTES.creation(c.id, c.slug);
const lienSujet = (s: SujetPalmaresApi) => ROUTES.sujet(s.id, s.slug);

const compteur = (n: number) => `<b class="cl-num" data-cl-count="${n}">${fmt(n)}</b>`;
const metrique = (texte: string, points: string) =>
  `<span class="cl-m-f">${texte}</span><span class="cl-m-p">${points}</span>`;

type Entree = EntreeCreationApi | EntreeEntraideApi | EntreeAstuceApi;

function faits(cle: CleCategorie, e: Entree, grand = false): string {
  const n = e.nombre;
  if (cle === 'reussites')
    return grand
      ? `${compteur(n)} ${n > 1 ? 'membres ont réussi sa méthode' : 'membre a réussi sa méthode'}`
      : pluriel(n, 'réussite', 'réussites');
  if (cle === 'utiles')
    return grand ? `${compteur(n)} votes « Utile »` : `${pluriel(n, 'vote', 'votes')} « Utile »`;
  if (cle === 'entraide')
    return grand
      ? `${compteur(n)} ${n > 1 ? 'réponses acceptées' : 'réponse acceptée'}`
      : pluriel(n, 'réponse acceptée', 'réponses acceptées');
  return grand
    ? `Testée par ${compteur(n)} ${n > 1 ? 'membres' : 'membre'}`
    : pluriel(n, 'vérification', 'vérifications');
}
const metriqueDe = (cle: CleCategorie, e: Entree, grand = false) =>
  metrique(
    typo(faits(cle, e, grand)),
    grand ? `<b class="cl-num">+${fmt(e.points)}</b> points` : `+${fmt(e.points)} points`,
  );

function preuve(cle: CleCategorie, e: Entree): string {
  if ('creation' in e)
    return `<a class="cl-proof" href="${esc(lienCreation(e.creation))}">${icone(`type-${{ UN_PROMPT: 'prompt', ITERATION: 'iteration', PROJET: 'projet' }[e.creation.type]}`)}<span>${t(e.creation.titre)}</span></a>`;
  const sujet = 'echange' in e ? e.echange.sujet : e.sujet;
  return `<a class="cl-proof" href="${esc(lienSujet(sujet))}">${logo(sujet.outil ?? undefined, 16)}<span>${t(sujet.titre)}</span></a>`;
}

/* Premier de chaque palmarès ------------------------------------------------- */

const tetePremier = (cle: CleCategorie, e: Entree, moiId: number | null) =>
  `<div class="cl-first-head"><span class="cl-rank cl-rank-1" aria-label="Premier">1</span>${membreHTML(e.membre, 48, moiId)}</div><p class="cl-big">${metriqueDe(cle, e, true)}</p>`;

function pile(membres: MembreResumeApi[]): string {
  return `<ul class="cl-stack" aria-label="${esc(typo(`Réussie par ${membres.map((m) => m.nom).join(', ')}`))}">${membres
    .map(
      (m, i) =>
        `<li style="--i:${i}"><a href="${esc(ROUTES.profil(m.pseudo))}" aria-label="${esc(m.nom)}" title="${esc(m.nom)}">${avatar(m, 34)}</a></li>`,
    )
    .join('')}</ul>`;
}

function premiereCreation(cle: CleCategorie, e: EntreeCreationApi, moiId: number | null): string {
  const c = e.creation;
  const aide =
    cle === 'reussites' && e.par?.length
      ? `<div class="cl-helped cl-detail"><p class="cl-helped-title">${t('Ils l’ont réussie cette semaine')}</p>${pile(e.par)}<p class="cl-note">${t(`${e.nombre} ${e.nombre > 1 ? 'réussites' : 'réussite'} sur ${pluriel(e.declarees ?? e.nombre, 'reproduction déclarée', 'reproductions déclarées')}`)}</p></div>`
      : '';
  return `<article class="cl-first cl-first-media" aria-label="${esc(typo(`Premier : ${e.membre.nom}`))}">
      <a class="cl-first-visual" href="${esc(lienCreation(c))}" tabindex="-1" aria-hidden="true">${image(c.couverture, '(min-width: 1100px) 400px, 92vw', false)}</a>
      <div class="cl-first-copy">
        ${tetePremier(cle, e, moiId)}
        <h3 class="cl-first-title"><a href="${esc(lienCreation(c))}">${t(c.titre)}</a></h3>
        <p class="cl-first-meta">${etiquetteType(c.type)}${c.outils.length ? `<span class="cl-dot" aria-hidden="true"></span>${outilsCreation(c)}` : ''}</p>
        ${aide}
      </div>
    </article>`;
}

function premierEchange(e: EntreeEntraideApi, moiId: number | null, maintenant: Date): string {
  const { sujet, demandeur, extrait, date } = e.echange;
  const quand = new Date(date);
  const jourTexte =
    jourIso(quand) === jourIso(maintenant)
      ? 'aujourd’hui'
      : `le ${quand.getUTCDate() === 1 ? '1er' : quand.getUTCDate()} ${MOIS_COURTS[quand.getUTCMonth()]}`;
  return `<article class="cl-first cl-first-talk" aria-label="${esc(typo(`Premier : ${e.membre.nom}`))}">
      <div class="cl-first-copy">${tetePremier('entraide', e, moiId)}${e.utiles ? `<p class="cl-note cl-m-f">${t(`et ${pluriel(e.utiles, 'vote « Utile » reçu', 'votes « Utile » reçus')} sur ses réponses`)}</p>` : ''}<h3 class="cl-first-title cl-only-summary"><a href="${esc(lienSujet(sujet))}">${t(sujet.titre)}</a></h3></div>
      <div class="cl-talk">
        ${demandeur ? `<div class="cl-msg cl-msg-q">${avatar(demandeur, 36)}<div class="cl-msg-body"><p class="cl-msg-meta"><b>${t(demandeur.nom)}</b> a demandé${sujet.outil ? ` · ${outilSujet(sujet)}` : ''}</p><p class="cl-msg-text">${t(sujet.titre)}</p></div></div>` : ''}
        <div class="cl-msg cl-msg-a">${avatar(e.membre, 36)}<div class="cl-msg-body"><p class="cl-msg-meta"><b>${t(e.membre.nom)}</b><span class="cl-accepted">${icone('accept')}Réponse acceptée</span><span class="cl-when">${t(`${jourTexte} à ${quand.toISOString().slice(11, 16)} UTC`)}</span></p>${extrait ? `<p class="cl-msg-text">${t(extrait)}</p>` : ''}<p class="cl-msg-foot"><a href="${esc(lienSujet(sujet))}">${t('Lire l’échange')}</a></p></div></div>
      </div>
    </article>`;
}

const premiereAstuce = (e: EntreeAstuceApi, moiId: number | null) =>
  `<article class="cl-first cl-first-table" aria-label="${esc(typo(`Premier : ${e.membre.nom}`))}">
      <div class="cl-first-copy">${tetePremier('astuces', e, moiId)}<h3 class="cl-first-title"><a href="${esc(lienSujet(e.sujet))}">${t(e.sujet.titre)}</a></h3>${e.sujet.outil ? `<p class="cl-first-meta">Astuce pour ${outilSujet(e.sujet)}</p>` : ''}</div>
    </article>`;

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

function premier(cle: CleCategorie, e: Entree, moiId: number | null, maintenant: Date): string {
  if (cle === 'entraide') return premierEchange(e as EntreeEntraideApi, moiId, maintenant);
  if (cle === 'astuces') return premiereAstuce(e as EntreeAstuceApi, moiId);
  return premiereCreation(cle, e as EntreeCreationApi, moiId);
}

function suivants(cle: CleCategorie, liste: Entree[], moiId: number | null): string {
  if (!liste.length) return '';
  return `<ol class="cl-list" aria-label="${esc(typo(`${CATEGORIES[cle].label} : places suivantes`))}">${liste
    .map(
      (e, i) =>
        `<li class="cl-row" style="--i:${i}"><span class="cl-rank">${i + 2}</span>${membreHTML(e.membre, 32, moiId)}<span class="cl-row-proof">${preuve(cle, e)}</span><span class="cl-row-metric">${metriqueDe(cle, e)}</span></li>`,
    )
    .join('')}</ol>`;
}

const VIDES: Record<CleCategorie, string> = {
  reussites: 'Aucune reproduction réussie déclarée cette semaine.',
  entraide: 'Aucune réponse acceptée cette semaine.',
  utiles: 'Aucune création n’a reçu de vote « Utile » cette semaine.',
  astuces: 'Aucune astuce vérifiée cette semaine.',
};

export function categorieHTML(
  cle: CleCategorie,
  donnees: ClassementsApi,
  moiId: number | null,
  maintenant: Date,
): string {
  const cat = CATEGORIES[cle];
  const liste = donnees.palmares[cle] as Entree[];
  const [tete, ...reste] = liste;
  return `<section class="cl-cat cl-reveal" id="${cle}" data-cat="${cle}" aria-labelledby="cl-${cle}-title">
      <header class="cl-cat-head">
        <h2 class="cl-cat-title" id="cl-${cle}-title"><span class="cl-cat-icon">${icone(cat.icon, '')}</span>${t(cat.title)}</h2>
        <p class="cl-cat-rule">${t(cat.rule)}</p>
      </header>
      ${tete ? `<div class="cl-cat-body">${premier(cle, tete, moiId, maintenant)}${suivants(cle, reste, moiId)}</div>` : `<div class="cl-empty"><p>${t(VIDES[cle])}</p></div>`}
      <p class="cl-cat-foot"><a class="link-arrow" href="${esc(cat.cta[0])}">${t(cat.cta[1])}${icone('arrow')}</a></p>
    </section>`;
}

/* En-tête ------------------------------------------------------------------- */

export function semainesHTML(donnees: ClassementsApi): string {
  return donnees.semaines
    .map((s, i) => {
      const actuelle = s.debut === donnees.semaine.debut;
      const href = i === 0 ? ROUTES.classements : `${ROUTES.classements}?semaine=${s.debut}`;
      return `<a class="cl-week" href="${esc(href)}" aria-pressed="${actuelle}"${actuelle ? ' aria-current="page"' : ''}><b>${t(s.statut === 'provisoire' ? 'Cette semaine' : periodeCourte(s))}</b><small>${t(s.statut === 'provisoire' ? periodeCourte(s) : 'Arrêtée')}</small></a>`;
    })
    .join('');
}

export function datesHTML(s: SemaineClassementApi, maintenant: Date): string {
  if (s.statut !== 'provisoire')
    return `<span class="cl-status">Arrêtée</span><span>${t(periodeLongue(s))}</span><span>${t('Les rangs ne changent plus')}</span>`;
  const fin = new Date(`${s.fin}T23:59:59Z`).getTime();
  const reste = Math.max(0, fin - maintenant.getTime());
  const jours = Math.floor(reste / 86_400_000);
  const heures = Math.floor((reste % 86_400_000) / 3_600_000);
  const d = jour(s.fin);
  return `<span class="cl-status is-open">Provisoire</span><span>${t(periodeLongue(s))}</span><span>${t(`arrêtée dans ${jours} j ${heures} h, ${JOURS[d.getUTCDay()]} ${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]} à 23:59 UTC`)}</span>`;
}

export function chiffresHTML(c: ClassementsApi['chiffres']): string {
  return (
    [
      [c.interactions, 'interactions d’apprentissage', 'is-main'],
      [c.votes, 'votes « Utile » et « Testé, ça marche »', ''],
      [c.reproductions, 'reproductions déclarées', ''],
      [c.casReussis, 'cas Bon réflexe réussis', ''],
      [c.reponsesAcceptees, 'réponses acceptées', ''],
    ] as const
  )
    .map(
      ([n, libelle, classe]) =>
        `<div${classe ? ` class="${classe}"` : ''}><dt>${t(libelle)}</dt><dd>${compteur(n)}</dd></div>`,
    )
    .join('');
}

export function laureatsHTML(donnees: ClassementsApi): string {
  return ORDRE.map((cle, i) => {
    const e = donnees.palmares[cle][0] as Entree | undefined;
    const cat = CATEGORIES[cle];
    if (!e)
      return `<li class="cl-laureate is-empty" data-cat="${cle}" style="--i:${i}"><span class="cl-laureate-cat">${icone(cat.icon, 'icon-xs')}${t(cat.label)}</span><span class="cl-laureate-none">${t('Pas encore de lauréat')}</span></li>`;
    return `<li class="cl-laureate" data-cat="${cle}" style="--i:${i}"><a href="#${cle}" class="cl-laureate-link"><span class="cl-laureate-cat">${icone(cat.icon, 'icon-xs')}${t(cat.label)}</span><span class="cl-laureate-face">${avatar(e.membre, 64)}</span><b>${t(e.membre.nom)}</b><small>${t(faits(cle, e).replace(/<[^>]+>/g, ''))}</small></a></li>`;
  }).join('');
}

/* Classement des membres ------------------------------------------------------- */

function evolutionHTML(evolution: RangClassementApi['evolution']): string {
  if (evolution === null) return '';
  if (evolution === 'nouveau') return '<span class="cl-evo is-new">Nouveau</span>';
  if (evolution > 0)
    return `<span class="cl-evo is-up">${icone('up', 'icon-xs')}<span class="sr-only">gagne </span>${evolution}</span>`;
  if (evolution < 0)
    return `<span class="cl-evo is-down">${icone('down', 'icon-xs')}<span class="sr-only">perd </span>${-evolution}</span>`;
  return `<span class="cl-evo">${icone('minus', 'icon-xs')}<span class="sr-only">même rang</span></span>`;
}

/** Places de la semaine dans les palmarès (prototype : recognized). */
function reconnu(donnees: ClassementsApi, membreId: number): string {
  const places = ORDRE.flatMap((cle) => {
    const i = (donnees.palmares[cle] as Entree[]).findIndex((e) => e.membre.id === membreId);
    return i < 0 ? [] : [{ cle, rang: i + 1 }];
  })
    .toSorted((a, b) => a.rang - b.rang)
    .slice(0, 3);
  return places
    .map(
      (p) =>
        `<span class="cl-rec" data-cat="${p.cle}">${icone(CATEGORIES[p.cle].icon, 'icon-xs')}<span>${ordinal(p.rang)} en ${t(CATEGORIES[p.cle].label.toLowerCase())}</span></span>`,
    )
    .join('');
}

export function lignesHTML(
  rangs: RangClassementApi[],
  quoi: 'semaine' | 'general',
  donnees: ClassementsApi,
  moiId: number | null,
): string {
  return rangs
    .map((r, i) => {
      const extra = quoi === 'semaine' ? reconnu(donnees, r.membre.id) : '';
      const classes = [
        'cl-tr',
        r.membre.id === moiId ? 'is-you' : '',
        r.rang <= 3 ? `is-top is-top-${r.rang}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<tr class="${classes}" data-niveau="${r.niveau}"${i >= 10 ? ' data-cl-suite hidden' : ''}>
      <td class="cl-td-rank"><span class="cl-rank">${r.rang}</span>${evolutionHTML(r.evolution)}</td>
      <th scope="row" class="cl-td-who">${membreHTML(r.membre, 36, moiId)}<span class="cl-td-sub">${extra}</span></th>
      <td class="cl-td-extra">${extra}</td>
      <td class="cl-td-pts"><b>${fmt(r.points)}</b><small>${quoi === 'semaine' ? 'points' : 'de réputation'}</small></td>
    </tr>`;
    })
    .join('');
}

export const NIVEAUX_FILTRE = [
  { code: '', pluriel: 'Tous les niveaux' },
  { code: 'curieux', pluriel: 'Curieux' },
  { code: 'apprenti', pluriel: 'Apprentis' },
  { code: 'artisan', pluriel: 'Artisans' },
  { code: 'expert', pluriel: 'Experts' },
  { code: 'maitre', pluriel: 'Maîtres' },
] as const;

export function panneauMoiHTML(
  donnees: ClassementsApi,
  membre: Pick<MembreResumeApi, 'avatar'> | null,
): string {
  const gagner = `<div class="cl-earn"><p class="cl-earn-title">Gagner des points cette semaine</p><ul>
      <li><a href="${ROUTES.apprendre}?rubrique=bon-reflexe">${t('Réussir un cas Bon réflexe')}</a><b>+${BAREME_REPUTATION.casReussi}</b></li>
      <li><a href="${ROUTES.explorer}">${t('Reproduire une création et la déclarer')}</a><b>+${BAREME_REPUTATION.reproductionDeclaree}</b></li>
      <li><a href="${ROUTES.forumSansReponse}">${t('Répondre à une question sans réponse')}</a><b>${t(`+${BAREME_REPUTATION.reponseAcceptee} si acceptée`)}</b></li>
    </ul></div>`;
  const moi = donnees.moi;
  if (!moi || !membre)
    return `<div class="cl-you is-visitor"><p class="cl-you-title">Votre place au classement</p><p>${t('Vos premiers points arrivent avec un cas Bon réflexe réussi ou une reproduction déclarée. Les membres que vous aidez font le reste.')}</p><div class="cl-you-actions"><a class="btn btn-primary btn-sm" href="${ROUTES.inscription}">Créer un compte</a><a class="btn btn-secondary btn-sm" href="${ROUTES.connexion}">Se connecter</a></div>${gagner}</div>`;
  const niveau = NIVEAUX.find((n) => n.code === moi.niveau);
  const suivant = NIVEAUX.find((n) => n.seuilPoints > moi.reputation);
  const part =
    niveau && suivant
      ? Math.round(
          ((moi.reputation - niveau.seuilPoints) / (suivant.seuilPoints - niveau.seuilPoints)) *
            100,
        )
      : 100;
  return `<div class="cl-you">
      <div class="cl-you-head">${avatar(membre, 44)}<div><p class="cl-you-title">${t(donnees.semaine.statut === 'provisoire' ? 'Votre semaine' : `Votre semaine ${periodeLongue(donnees.semaine)}`)}</p><p class="cl-you-sub">${t(`${libelleNiveau(moi.niveau)} · ${fmt(moi.reputation)} points de réputation`)}</p></div></div>
      <dl class="cl-you-figures">
        <div><dt>Points</dt><dd>${fmt(moi.points)}</dd></div>
        <div><dt>${t('Rang de la semaine')}</dt><dd>${moi.rangSemaine ? ordinal(moi.rangSemaine) : '–'}</dd></div>
        <div><dt>${t('Rang général')}</dt><dd>${moi.rangGeneral ? ordinal(moi.rangGeneral) : '–'}</dd></div>
      </dl>
      ${suivant ? `<div class="cl-you-next"><p>${t(`${fmt(suivant.seuilPoints - moi.reputation)} points avant ${suivant.libelle}`)}</p><span class="cl-bar" style="--v:${part / 100}" role="img" aria-label="${esc(`${part} % du niveau ${niveau?.libelle ?? ''}`)}"><i></i></span></div>` : ''}
      ${gagner}
    </div>`;
}

/* Règles --------------------------------------------------------------------- */

export function reglesHTML(): string {
  const b = BAREME_REPUTATION;
  const groupes: [string, string, [string, string][]][] = [
    [
      'repeat',
      'Méthodes réussies',
      [
        [
          'Reproduction réussie de votre création, une fois par membre',
          `+${b.reproductionReussieRecue}`,
        ],
      ],
    ],
    [
      'utile',
      'Créations utiles',
      [['Vote « Utile » sur votre création', `+${b.voteUtileSurCreation}`]],
    ],
    [
      'reply',
      'Entraide',
      [
        ['Réponse acceptée', `+${b.reponseAcceptee}`],
        ['Vote « Utile » sur une réponse ou une question', `+${b.voteUtileSurAutreContenu}`],
        ['Acceptation d’une réponse à votre question', `+${b.acceptationReponse}`],
      ],
    ],
    [
      'bulb',
      'Astuces vérifiées',
      [['Vote « Testé, ça marche » sur votre astuce', `+${b.voteTesteSurAstuce}`]],
    ],
    [
      'podium',
      'Défis',
      [
        ['Participation, à la clôture', `+${b.participationDefi}`],
        ['Première, deuxième, troisième place', b.podiumDefi.map((p) => `+${p}`).join(', ')],
      ],
    ],
    [
      'school',
      'Apprentissage',
      [
        ['Première reproduction déclarée d’une création', `+${b.reproductionDeclaree}`],
        ['Cas Bon réflexe réussi', `+${b.casReussi}`],
      ],
    ],
  ];
  return `<section class="cl-rules cl-reveal" id="regles" aria-labelledby="cl-rules-title">
      <div class="container">
        <header class="cl-rules-head"><p class="kicker">${icone('scale')}Règles du classement</p><h2 id="cl-rules-title">Comment le palmarès est établi</h2></header>
        <div class="cl-rules-grid">
          <div class="cl-scale">
            <h3>Ce qui rapporte des points</h3>
            ${groupes.map(([ic, libelle, lignes]) => `<div class="cl-scale-group"><p class="cl-scale-label">${icone(ic, 'icon-sm')}${t(libelle)}</p><dl>${lignes.map(([quoi, pts]) => `<div><dt>${t(quoi)}</dt><dd>${t(pts)}</dd></div>`).join('')}</dl></div>`).join('')}
          </div>
          <div class="cl-rules-list">
            <h3>Ce qui garantit un classement juste</h3>
            <ul>
              <li>${icone('calendar')}<span>${t('La semaine court du lundi 00:00 au dimanche 23:59 (UTC). Le palmarès est alors arrêté et ses rangs ne bougent plus.')}</span></li>
              <li>${icone('users')}<span>${t('Presque tous les points viennent d’un autre membre : celui qui reproduit votre méthode, accepte votre réponse ou vérifie votre astuce.')}</span></li>
              <li>${icone('clock')}<span>${t('Les points des votes reçus sont plafonnés à 200 par jour et par membre.')}</span></li>
              <li>${icone('replay')}<span>${t('Un vote retiré, une acceptation annulée ou un contenu retiré annule les points correspondants.')}</span></li>
              <li>${icone('route')}<span>${t('À égalité, la contribution publiée la première passe devant.')}</span></li>
              <li>${icone('lock')}<span>${t('Vos cas Bon réflexe réussis et vos reproductions déclarées restent privés : vous seul les voyez.')}</span></li>
            </ul>
            <div class="cl-levels-scale" aria-label="Niveaux de réputation">${NIVEAUX.map((n, i) => `<span style="--i:${i}"><b>${t(n.libelle)}</b><small>${t(n.seuilPoints ? `${fmt(n.seuilPoints)} points` : 'dès l’inscription')}</small></span>`).join('')}</div>
          </div>
        </div>
      </div>
    </section>`;
}
