/* Classements (S-08), portés de prototype/classements.js : en-tête (semaines, dates, choix de
   l'outil, chiffres, lauréats), palmarès par contribution, défi de la semaine, « Ils progressent »,
   classement des membres et règles. Rendus par le serveur à partir de GET /api/v1/classements ;
   scripts/classements.ts ouvre le choix de l'outil, alterne les classements, filtre par niveau et
   affiche les cinquante premiers. */

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
import { embleme } from '../accueil/elements';
import { ROUTES } from '../navigation';
import { jourEtHeure, typo } from '../texte';

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

/** Palmarès vide ; limité à un outil, il propose de revenir à tous (prototype : emptyCat). */
function videHTML(cle: CleCategorie, donnees: ClassementsApi): string {
  const outil = donnees.outil?.nom;
  if (!outil) return `<div class="cl-empty"><p>${t(VIDES[cle])}</p></div>`;
  const message = {
    reussites: `Aucune reproduction réussie sur une création ${outil} cette semaine.`,
    entraide: `Aucune réponse acceptée sur une question ${outil} cette semaine.`,
    utiles: `Aucune création ${outil} n’a reçu de vote « Utile » cette semaine.`,
    astuces: `Aucune astuce vérifiée avec ${outil} cette semaine.`,
  }[cle];
  return `<div class="cl-empty"><p>${t(message)}</p>${tousLesOutils(donnees)}</div>`;
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
      ${tete ? `<div class="cl-cat-body">${premier(cle, tete, moiId, maintenant)}${suivants(cle, reste, moiId)}</div>` : videHTML(cle, donnees)}
      <p class="cl-cat-foot"><a class="link-arrow" href="${esc(cat.cta[0])}">${t(cat.cta[1])}${icone('arrow')}</a></p>
    </section>`;
}

/* En-tête ------------------------------------------------------------------- */

export function semainesHTML(donnees: ClassementsApi): string {
  return donnees.semaines
    .map((s, i) => {
      const actuelle = s.debut === donnees.semaine.debut;
      const href = adresseClassements(i === 0 ? null : s.debut, donnees.outil?.slug ?? null);
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
  const premiers: {
    cle: string;
    label: string;
    icon: string;
    membre?: MembreResumeApi;
    texte: string;
  }[] = ORDRE.map((cle) => {
    const e = donnees.palmares[cle][0] as Entree | undefined;
    const { label, icon } = CATEGORIES[cle];
    return {
      cle,
      label,
      icon,
      membre: e?.membre,
      texte: e ? faits(cle, e).replace(/<[^>]+>/g, '') : '',
    };
  });
  const tete = donnees.defi?.participations[0];
  premiers.push({
    cle: 'defi',
    label: 'Défi de la semaine',
    icon: 'podium',
    membre: tete?.auteur,
    texte: tete
      ? `${donnees.defi?.defi.etat === 'CLOTURE' ? '1er' : 'En tête'} · ${pluriel(tete.utiles, 'vote', 'votes')} « Utile »`
      : '',
  });
  const passage = donnees.progression.niveaux[0];
  premiers.push({
    cle: 'progres',
    label: 'Progression',
    icon: 'trend-up',
    membre: passage?.membre,
    texte: passage ? `Passe ${libelleNiveau(passage.vers)}` : '',
  });
  const aucun = (cle: string) =>
    cle === 'defi' && !donnees.defi
      ? 'Pas de défi cette semaine'
      : donnees.outil && cle !== 'progres'
        ? `Aucun lauréat avec ${donnees.outil.nom}`
        : 'Pas encore de lauréat';
  return premiers
    .map(({ cle, label, icon, membre, texte }, i) =>
      membre
        ? `<li class="cl-laureate" data-cat="${cle}" style="--i:${i}"><a href="#${cle}" class="cl-laureate-link"><span class="cl-laureate-cat">${icone(icon, 'icon-xs')}${t(label)}</span><span class="cl-laureate-face">${avatar(membre, 64)}</span><b>${t(membre.nom)}</b><small>${t(texte)}</small></a></li>`
        : `<li class="cl-laureate is-empty" data-cat="${cle}" style="--i:${i}"><span class="cl-laureate-cat">${icone(icon, 'icon-xs')}${t(label)}</span><span class="cl-laureate-none">${t(aucun(cle))}</span></li>`,
    )
    .join('');
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
  const places: { cle: CleCategorie | 'defi'; rang: number }[] = ORDRE.flatMap((cle) => {
    const i = (donnees.palmares[cle] as Entree[]).findIndex((e) => e.membre.id === membreId);
    return i < 0 ? [] : [{ cle, rang: i + 1 }];
  });
  const auDefi = donnees.defi?.participations.findIndex((p) => p.auteur.id === membreId) ?? -1;
  if (auDefi >= 0)
    places.push({ cle: 'defi', rang: donnees.defi?.participations[auDefi]?.rang ?? auDefi + 1 });
  return places
    .toSorted((a, b) => a.rang - b.rang)
    .slice(0, 3)
    .map((p) =>
      p.cle === 'defi'
        ? `<span class="cl-rec" data-cat="defi">${icone('podium', 'icon-xs')}<span>${ordinal(p.rang)} au défi</span></span>`
        : `<span class="cl-rec" data-cat="${p.cle}">${icone(CATEGORIES[p.cle].icon, 'icon-xs')}<span>${ordinal(p.rang)} en ${t(CATEGORIES[p.cle].label.toLowerCase())}</span></span>`,
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

/* Choix de l'outil ------------------------------------------------------------ */

/** Adresse de la page pour une semaine et un outil (la semaine en cours et tous les outils sont
    l'adresse nue). */
export function adresseClassements(semaine: string | null, outil: string | null): string {
  const p = new URLSearchParams();
  if (semaine) p.set('semaine', semaine);
  if (outil) p.set('outil', outil);
  const requete = p.toString();
  return requete ? `${ROUTES.classements}?${requete}` : ROUTES.classements;
}
const semaineDemandee = (donnees: ClassementsApi) =>
  donnees.semaine.debut === donnees.semaines[0]?.debut ? null : donnees.semaine.debut;
const tousLesOutils = (donnees: ClassementsApi) =>
  `<a class="link-btn" href="${esc(adresseClassements(semaineDemandee(donnees), null))}">Voir tous les outils</a>`;

/** Titre de la page, avec l'outil choisi (prototype : renderHero). */
export const titreHTML = (donnees: ClassementsApi) =>
  donnees.outil
    ? `Palmarès de la semaine <span class="cl-title-tool">${logo(donnees.outil, 40)}${t(donnees.outil.nom)}</span>`
    : 'Palmarès de la semaine';

/** Choix de l'outil (prototype : renderToolPicker) : tous les outils, puis ceux des contributions
    de la semaine, du plus cité au moins cité. Chaque option mène à l'adresse du palmarès limité. */
export function choixOutilHTML(donnees: ClassementsApi): string {
  const choisi = donnees.outil;
  const outils = [...donnees.outils];
  if (choisi && !outils.some((o) => o.id === choisi.id))
    outils.unshift({ ...choisi, contributions: 0 });
  const semaine = semaineDemandee(donnees);
  const options = [
    `<li role="option" id="cl-tool-opt-0" data-cl-tool-href="${esc(adresseClassements(semaine, null))}" aria-selected="${!choisi}"><span>Tous les outils</span>${choisi ? '' : icone('check', 'icon-sm')}</li>`,
    ...outils.map((o, i) => {
      const actif = o.id === choisi?.id;
      const nombre = o.contributions
        ? pluriel(o.contributions, 'contribution', 'contributions')
        : 'Aucune contribution';
      return `<li role="option" id="cl-tool-opt-${i + 1}" data-cl-tool-href="${esc(adresseClassements(semaine, o.slug))}" aria-selected="${actif}">${logo(o, 18)}<span>${t(o.nom)}</span><small>${t(nombre)}</small>${actif ? icone('check', 'icon-sm') : ''}</li>`;
    }),
  ];
  return `<div class="cl-tool" data-cl-tool-picker>
      <span class="cl-tool-label" id="cl-tool-label">Outil</span>
      <button class="cl-tool-btn${choisi ? ' is-set' : ''}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="cl-tool-label cl-tool-value" data-cl-tool-btn><span id="cl-tool-value">${choisi ? `${logo(choisi, 16)}${t(choisi.nom)}` : 'Tous les outils'}</span>${icone('chevron-down', 'icon-sm')}</button>
      <ul class="cl-tool-list" role="listbox" aria-labelledby="cl-tool-label" tabindex="-1" hidden data-cl-tool-list>${options.join('')}</ul>
    </div>`;
}

/* Défi de la semaine (S-07) ------------------------------------------------------ */

type ParticipationDefi = NonNullable<ClassementsApi['defi']>['participations'][number];

/** Points d'une participation : votes « Utile » reçus, puis participation et podium à la clôture. */
function pointsParticipation(p: ParticipationDefi, i: number, cloture: boolean): number {
  const b = BAREME_REPUTATION;
  const rang = p.rang ?? i + 1;
  const cloturee = cloture ? (b.podiumDefi[rang - 1] ?? 0) + b.participationDefi : 0;
  return p.utiles * b.voteUtileSurCreation + cloturee;
}
const metriqueDefi = (p: ParticipationDefi, i: number, cloture: boolean) =>
  metrique(
    typo(`${pluriel(p.utiles, 'vote', 'votes')} « Utile »`),
    `+${fmt(pointsParticipation(p, i, cloture))} points`,
  );
const outilsParticipation = (p: ParticipationDefi) =>
  p.creation.outils.length ? outilsCreation(p.creation) : etiquetteType(p.creation.type);
const iconeType = (type: CreationPalmaresApi['type']) =>
  `type-${{ UN_PROMPT: 'prompt', ITERATION: 'iteration', PROJET: 'projet' }[type]}`;

export function defiHTML(donnees: ClassementsApi, moiId: number | null): string {
  if (!donnees.defi) return '';
  const { defi, participations } = donnees.defi;
  const cloture = defi.etat === 'CLOTURE';
  const lien = ROUTES.defi(defi.id, defi.slug);
  const echeance =
    defi.etat === 'A_VENIR'
      ? `Ouvre le ${jourEtHeure(defi.dateDebut)}, heure UTC`
      : `${cloture || defi.etat === 'TERMINE' ? 'Clos le' : 'Jusqu’au'} ${jourEtHeure(defi.dateFin)}, heure UTC`;
  const kicker = cloture
    ? 'Défi de la semaine · Classement final'
    : defi.etat === 'A_VENIR'
      ? 'Défi de la semaine · À venir'
      : 'Défi de la semaine · Classement provisoire';
  const rang = (p: ParticipationDefi, i: number) => p.rang ?? i + 1;
  const podium = participations
    .slice(0, 3)
    .map((p, i) => {
      const href = esc(ROUTES.creation(p.creation.id, p.creation.slug));
      const visuel = p.creation.couverture
        ? `<div class="cl-poster">${image(p.creation.couverture, '(min-width: 1100px) 360px, 92vw', false)}</div>`
        : `<div class="cl-pod-vide">${icone(iconeType(p.creation.type), '')}</div>`;
      return `<li class="cl-pod" data-place="${i + 1}" style="--i:${i}">
        <a class="cl-pod-visual" href="${href}" tabindex="-1" aria-hidden="true">${visuel}</a>
        <div class="cl-pod-base">
          <span class="cl-pod-rank" aria-label="${esc(rang(p, i) === 1 ? 'Premier' : `${rang(p, i)}e`)}">${rang(p, i)}</span>
          <div class="cl-pod-copy"><p class="cl-pod-title"><a href="${href}">${t(p.creation.titre)}</a></p>${membreHTML(p.auteur, 28, moiId)}<p class="cl-pod-meta">${outilsParticipation(p)}<span class="cl-pod-votes">${metriqueDefi(p, i, cloture)}</span></p></div>
        </div>
      </li>`;
    })
    .join('');
  const reste = participations.slice(3);
  const suite = reste.length
    ? `<ol class="cl-defi-rest">${reste
        .map(
          (p, i) =>
            `<li><span class="cl-rank">${rang(p, i + 3)}</span>${membreHTML(p.auteur, 28, moiId)}<span class="cl-row-proof"><a class="cl-proof" href="${esc(ROUTES.creation(p.creation.id, p.creation.slug))}">${icone(iconeType(p.creation.type))}<span>${t(p.creation.titre)}</span></a></span><span class="cl-row-metric">${metriqueDefi(p, i + 3, cloture)}</span></li>`,
        )
        .join('')}</ol>`
    : '';
  const vide = donnees.outil
    ? `<div class="cl-empty"><p>${t(`Aucune participation avec ${donnees.outil.nom} dans ce défi.`)}</p>${tousLesOutils(donnees)}</div>`
    : `<div class="cl-empty"><p>${t(defi.etat === 'A_VENIR' ? 'Les participations ouvrent avec le défi.' : 'Aucune participation pour l’instant.')}</p></div>`;
  const b = BAREME_REPUTATION;
  const podiumPoints = b.podiumDefi.join(', ').replace(/, (\d+)$/, ' et $1');
  const pied = cloture
    ? `Rangs figés à la clôture, selon les votes « Utile » reçus pendant le défi. Le podium a reçu ${podiumPoints} points, chaque participation ${b.participationDefi} points.`
    : `Participations classées par votes « Utile » reçus depuis l’ouverture. Les rangs seront figés à la clôture : ${podiumPoints} points pour le podium, ${b.participationDefi} points par participation.`;
  const action =
    defi.etat === 'EN_COURS'
      ? `<a class="btn btn-sm cl-defi-cta" href="${esc(`${ROUTES.publier}?defi=${defi.id}`)}">Participer au défi${icone('arrow')}</a>`
      : `<a class="btn btn-sm cl-defi-cta" href="${esc(lien)}">Voir le défi${icone('arrow')}</a>`;
  return `<section class="cl-defi cl-reveal" id="defi" aria-labelledby="cl-defi-title">
      <div class="container">
        <div class="cl-defi-head">
          <div class="cl-defi-copy">
            <p class="cl-defi-kicker">${icone('podium')}${kicker}</p>
            <h2 id="cl-defi-title">${t(defi.titre)}</h2>
            <p class="cl-defi-meta"><span>${t(defi.enonce)}</span><span>${t(echeance)}</span><span>${pluriel(defi.participations, 'participation', 'participations')}</span></p>
          </div>
          ${defi.regles.length ? `<ul class="cl-defi-rules" aria-label="Contraintes du défi">${defi.regles.map((r) => `<li>${icone('check')}${t(r)}</li>`).join('')}</ul>` : ''}
        </div>
        ${participations.length ? `<ol class="cl-podium">${podium}</ol>${suite}` : vide}
        <div class="cl-defi-foot">
          <p>${t(pied)}</p>
          ${action}
        </div>
      </div>
    </section>`;
}

/* Ils progressent (S-09) ------------------------------------------------------- */

const jourMois = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
};

export function progressionHTML(donnees: ClassementsApi): string {
  const { niveaux, badges, badgesObtenus } = donnees.progression;
  const echelle = NIVEAUX.slice(1)
    .map((n) => {
      const passes = niveaux.filter((p) => p.vers === n.code);
      const gens = passes.length
        ? passes
            .map(
              (p) =>
                `<div class="cl-up"><a class="cl-up-btn" href="${esc(ROUTES.profil(p.membre.pseudo))}">${avatar(p.membre, 40)}<span>${t(p.membre.nom)}</span></a><small>${t(`depuis ${libelleNiveau(p.de)}`)}</small></div>`,
            )
            .join('')
        : '<p class="cl-step-none">Personne cette semaine</p>';
      return `<div class="cl-step${passes.length ? ' has-up' : ''}" role="listitem">
            <div class="cl-step-people">${gens}</div>
            <div class="cl-step-node"><span aria-hidden="true"></span><b>${t(n.libelle)}</b><small>${t(`${fmt(n.seuilPoints)} points`)}</small></div>
          </div>`;
    })
    .join('');
  const id = donnees.semaine.debut;
  const liste = badges.length
    ? `<ul class="cl-badges" aria-label="Badges obtenus">${badges
        .map(
          (b, i) =>
            `<li class="cl-badge" style="--i:${i}"><span class="cl-badge-name" tabindex="0" aria-describedby="cl-rule-${id}-${i}">${embleme(b.badge)}<b>${t(b.badge.libelle)}</b><span class="cl-badge-rule" role="tooltip" id="cl-rule-${id}-${i}">${t(b.badge.critere)}</span></span><span class="cl-badge-copy"><a class="cl-badge-who" href="${esc(ROUTES.profil(b.membre.pseudo))}">${avatar(b.membre, 24)}${t(b.membre.nom)}</a><small>${t(jourMois(b.date))}</small></span></li>`,
        )
        .join('')}</ul>`
    : `<div class="cl-empty"><p>${t('Aucun badge obtenu cette semaine pour l’instant.')}</p></div>`;
  const autres = badgesObtenus - badges.length;
  const suite =
    autres > 0
      ? `<p class="cl-badges-suite">${t(`et ${pluriel(autres, 'autre badge obtenu', 'autres badges obtenus')} cette semaine`)}</p>`
      : '';
  return `<section class="cl-cat cl-progress cl-reveal" id="progres" data-cat="progres" aria-labelledby="cl-progres-title">
      <header class="cl-cat-head">
        <h2 class="cl-cat-title" id="cl-progres-title"><span class="cl-cat-icon">${icone('trend-up', '')}</span>Ils progressent</h2>
        <p class="cl-cat-rule">${t('Les passages de niveau et les badges obtenus pendant la semaine. Les cas Bon réflexe réussis et les reproductions déclarées restent visibles de leur seul auteur.')}</p>
      </header>
      <div class="cl-progress-body">
        <div class="cl-ladder" role="list" aria-label="Passages de niveau">${echelle}</div>
        <div>${liste}${suite}</div>
      </div>
    </section>`;
}
