/* Page Explorer (DEC-01, EC-02), portée de prototype/explorer.js : recherche d'un objectif pendant la
   saisie, domaines et tri, « Mes outils », ce que la communauté cherche encore, puis le guide d'un
   objectif sans recharger la page (adresse ?guide=). Les données viennent de l'API ; la page rendue
   par le serveur sert de point de départ et les mêmes fonctions (lib/explorer) la mettent à jour.
   Ce qui est propre à la personne : « Mes outils » reste dans ce navigateur (comme le prototype), la
   liste de contrôle est enregistrée dans le compte d'un membre, dans ce navigateur sinon. */

import {
  erreursParChamp,
  schemaPropositionPiege,
  type DemandeGuideApi,
  type GuideApi,
  type ListeControleApi,
  type ProblemeApi,
  type PropositionPiegeApi,
  type RechercheCreationsApi,
  type ReponseCasApi,
  type SoutienDemandeApi,
} from '@vysora/shared';
import {
  ecrireAdresse,
  lireAdresse,
  type AdresseExplorer,
  type DonneesExplorer,
  type OutilExplorer,
} from '../lib/explorer/donnees';
import {
  CORPS_SECTIONS,
  comparaison,
  etatInitialCas,
  listeDeControle,
  navigationGuides,
  texteListe,
  TRIS_PARCOURS,
  vueGuide,
  type CleSection,
  type EtatCas,
  type EtatGuide,
  type TriParcours,
} from '../lib/explorer/guide';
import {
  apercuActif,
  boutonMesOutils,
  correspondances,
  demandesHTML,
  guidesEnApercu,
  indexer,
  TRIS,
  vueIndex,
  type GuideIndexe,
  type Tri,
} from '../lib/explorer/index-guides';
import { plier } from '../lib/explorer/recherche';
import { ROUTES } from '../lib/navigation';
import { FAMILLES } from '../lib/publier/donnees';
import { exiger, invitation } from './commun/acces';
import { api } from './commun/api';
import { etats } from './commun/etats';
import { $, $$, animations, esc, icon, pluriel, t, toast, typo } from './commun/outils';

/* Données, état et adresse --------------------------------------------------- */

const lues = (() => {
  try {
    return JSON.parse($('#ex-donnees')?.textContent ?? 'null') as DonneesExplorer | null;
  } catch {
    return null;
  }
})();
const donnees: DonneesExplorer = lues ?? {
  index: null,
  guide: null,
  outils: [],
  recherche: [],
  maintenant: new Date().toISOString(),
};
const maintenant = new Date(donnees.maintenant);
const outils = new Map<string, OutilExplorer>(donnees.outils.map((o) => [o.slug, o]));
const index = donnees.index;
const domaines = index?.domaines ?? [];
const guides: GuideIndexe[] = (index?.elements ?? []).map(indexer);
const enApercu = guidesEnApercu(guides);
let demandes: DemandeGuideApi[] = index?.demandes ?? [];
const guidesLus = new Map<string, GuideApi>();
if (donnees.guide) guidesLus.set(donnees.guide.guide.slug, donnees.guide);

const etat: AdresseExplorer = lireAdresse(new URLSearchParams(location.search), domaines);
if (etat.guide && !guidesLus.has(etat.guide)) etat.guide = null;

/** Préférences gardées dans ce navigateur ; un stockage indisponible ne bloque rien. */
const memoire = {
  lire<T>(cle: string, defaut: T): T {
    try {
      const brut = localStorage.getItem(cle);
      return brut === null ? defaut : (JSON.parse(brut) as T);
    } catch {
      return defaut;
    }
  },
  ecrire(cle: string, valeur: unknown): void {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
    } catch {
      // Stockage indisponible (navigation privée stricte) : la préférence dure le temps de la page.
    }
  },
};
const CLE_OUTILS = 'vysora-mes-outils';
const CLE_LISTES = 'vysora-listes';
const lusOutils = memoire.lire<unknown>(CLE_OUTILS, []);
let mesOutils = new Set(
  (Array.isArray(lusOutils) ? lusOutils : []).filter(
    (slug): slug is string => typeof slug === 'string' && outils.has(slug),
  ),
);

function ecrireAdresseCourante(pousser: boolean): void {
  const adresse = `${location.pathname}${ecrireAdresse(etat)}`;
  if (adresse !== `${location.pathname}${location.search}`)
    history[pousser ? 'pushState' : 'replaceState'](null, '', adresse);
}

const els = {
  vueIndex: $('[data-view="index"]'),
  vueGuide: $('[data-view="guide"]'),
  champ: $<HTMLInputElement>('#ex-q'),
  effacer: $('[data-clear-query]'),
  guides: $('[data-guides]'),
  domaines: $('[data-domains]'),
  banniere: $('[data-domain-banner]'),
  sousTitre: $('[data-index-sub]'),
  aucun: $('[data-none]'),
  legende: $('.ex-legend'),
  correspondances: $('[data-matches]'),
  listeCorrespondances: $('[data-matches-list]'),
  carte: $('[data-hero-card]'),
  mesOutils: $('[data-mytools]'),
  tri: $<HTMLSelectElement>('[data-index-sort]'),
  demandes: $('[data-requests]'),
  guide: $('[data-guide]'),
  navigationGuides: $('[data-guide-nav]'),
  barreComparaison: $('[data-compare-bar]'),
};

/* Index des guides ------------------------------------------------------------- */

let derniereRecherche = 0;
/** « Parcours qui correspondent » : recherche plein texte de l'API (RG-31), la plus récente gagne. */
async function chercherParcours(q: string, jetons: string[][]): Promise<void> {
  const numero = ++derniereRecherche;
  if (!jetons.length || !els.correspondances || !els.listeCorrespondances) {
    if (els.correspondances) els.correspondances.hidden = true;
    return;
  }
  const reponse = await api<RechercheCreationsApi>(
    'GET',
    `/api/v1/recherche/creations?q=${encodeURIComponent(q)}`,
  );
  if (numero !== derniereRecherche) return;
  const resultats = reponse.ok ? reponse.donnees.elements : [];
  els.correspondances.hidden = !resultats.length;
  els.listeCorrespondances.innerHTML = correspondances(resultats, jetons);
}

function rendreIndex(rechercher = true): void {
  if (!index) return;
  const vue = vueIndex({
    guides,
    domaines,
    totaux: index.totaux,
    q: etat.q,
    domaine: etat.domaine,
    tri: etat.tri,
    mesOutils,
    maintenant,
  });
  const focusDomaine = (document.activeElement as HTMLElement | null)?.closest('[data-domains]')
    ? ((document.activeElement as HTMLElement).dataset.domain ?? null)
    : null;
  if (els.domaines) els.domaines.innerHTML = vue.puces;
  if (focusDomaine !== null)
    $<HTMLElement>(
      `[data-domain="${CSS.escape(focusDomaine)}"]`,
      els.domaines ?? document,
    )?.focus();
  if (els.banniere) {
    els.banniere.hidden = !vue.banniere;
    els.banniere.innerHTML = vue.banniere;
  }
  if (els.guides) els.guides.innerHTML = vue.lignes;
  if (els.sousTitre) els.sousTitre.textContent = typo(vue.sousTitre);
  if (els.mesOutils) els.mesOutils.innerHTML = boutonMesOutils([...mesOutils], outils, true);
  if (els.tri) els.tri.value = etat.tri;
  if (els.aucun) {
    els.aucun.hidden = vue.visibles.length > 0;
    els.aucun.innerHTML = vue.aucun;
  }
  if (els.legende) els.legende.hidden = !vue.visibles.length;
  montrerApercu(apercuActif(etat.q, vue.visibles, enApercu, guides), vue.voisins);
  if (rechercher) void chercherParcours(etat.q, vue.jetons);
}

/** Aperçu du héros qui suit la recherche (prototype : showHero, réglage « Suit la recherche »).
    Celui que le serveur a rendu ne s'anime pas une seconde fois au chargement. */
let apercuCourant = $('.ex-hc-body.is-active', els.carte ?? document)?.dataset.hc ?? '';
function montrerApercu(slug: string, voisins: GuideIndexe[]): void {
  const carte = els.carte;
  if (!carte?.firstElementChild) return;
  const recherche = Boolean(etat.q);
  for (const corps of $$('[data-hc]', carte)) {
    const actif = corps.dataset.hc === slug;
    corps.classList.toggle('is-active', actif);
    corps.inert = !actif;
    if (actif) corps.removeAttribute('aria-hidden');
    else corps.setAttribute('aria-hidden', 'true');
    if (actif && slug !== apercuCourant && animations.completes()) {
      corps.classList.remove('is-switching');
      void corps.offsetWidth;
      corps.classList.add('is-switching');
    }
  }
  if (slug === 'none') {
    const requete = $('[data-hc-query]', carte);
    if (requete) requete.textContent = typo(`« ${etat.q} »`);
    const proches = $('[data-hc-near]', carte);
    if (proches) {
      proches.hidden = !voisins.length;
      proches.innerHTML = voisins.length
        ? `<span>Guides proches</span>${voisins.map((g) => `<a href="${esc(ROUTES.guide(g.slug))}" data-guide-link="${esc(g.slug)}">${t(g.titreCourt)}</a>`).join('')}`
        : '';
    }
  }
  const surtitre = $('[data-hc-kicker]', carte);
  if (surtitre)
    surtitre.textContent = recherche
      ? slug === 'none'
        ? 'Pas encore de guide'
        : 'Le guide qui correspond'
      : 'Aperçu d’un guide';
  carte.classList.toggle('is-matching', recherche && slug !== 'none');
  apercuCourant = slug;
}

function rendreDemandes(): void {
  if (els.demandes) els.demandes.innerHTML = demandesHTML(demandes);
}

/** « Je le cherche aussi » (prototype : data-want) : compté par l'API, 30 jours. */
async function soutenir(bouton: HTMLButtonElement): Promise<void> {
  if (!exiger('contribuer', 'indiquer que vous cherchez ce parcours')) return;
  const id = Number(bouton.dataset.want);
  const demande = demandes.find((d) => d.id === id);
  if (!demande) return;
  bouton.disabled = true;
  const reponse = await api<SoutienDemandeApi>(
    demande.soutenue ? 'DELETE' : 'PUT',
    `/api/v1/demandes/${id}/soutien`,
  );
  if (!reponse.ok) {
    bouton.disabled = false;
    signalerEchec(
      reponse.probleme,
      'Votre demande n’a pas pu être enregistrée. Réessayez dans un instant.',
    );
    return;
  }
  const { soutiens, soutenue } = reponse.donnees;
  demandes = demandes
    .map((d) => (d.id === id ? { ...d, soutiens, soutenue } : d))
    .toSorted((a, b) => b.soutiens - a.soutiens || a.libelle.localeCompare(b.libelle, 'fr'));
  rendreDemandes();
  if (soutenue) toast('Votre intérêt est compté : les auteurs voient ce que la communauté attend.');
  $<HTMLElement>(`[data-want="${id}"]`)?.focus();
}

/* Recherche d'un objectif ----------------------------------------------------- */

let minuterieSaisie: ReturnType<typeof setTimeout> | undefined;
els.champ?.addEventListener('input', () => {
  if (els.effacer) els.effacer.hidden = !els.champ?.value;
  clearTimeout(minuterieSaisie);
  minuterieSaisie = setTimeout(() => {
    etat.q = (els.champ?.value ?? '').trim().slice(0, 200);
    ecrireAdresseCourante(false);
    rendreIndex();
  }, 120);
});

$('[data-search]')?.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  clearTimeout(minuterieSaisie);
  etat.q = (els.champ?.value ?? '').trim().slice(0, 200);
  rendreIndex();
  const premier = $<HTMLElement>('[data-guide-link]', els.guides ?? document);
  ecrireAdresseCourante(false);
  if (etat.q && premier?.dataset.guideLink) void ouvrirGuide(premier.dataset.guideLink);
  else {
    ecrireAdresseCourante(true);
    $('#ex-index-title')?.scrollIntoView({ behavior: animations.completes() ? 'smooth' : 'auto' });
  }
});

els.effacer?.addEventListener('click', () => {
  if (els.champ) els.champ.value = '';
  etat.q = '';
  if (els.effacer) els.effacer.hidden = true;
  ecrireAdresseCourante(true);
  rendreIndex();
  els.champ?.focus();
});

/** Exemples qui défilent dans le champ vide (prototype : rotatePlaceholder). */
const EXEMPLES = [
  'prendre des rendez-vous en ligne',
  'un logo lisible en petit format',
  'trier mes factures automatiquement',
  'une série d’illustrations au même style',
  'un script qui range mes fichiers',
  'répondre aux avis de mes clients',
];
let exemple = 0;
let minuterieExemple: ReturnType<typeof setTimeout> | undefined;
function exempleSuivant(): void {
  const champ = els.champ;
  if (!champ || !animations.completes() || etat.guide || document.activeElement === champ) return;
  if (champ.value || document.hidden) return;
  exemple = (exemple + 1) % EXEMPLES.length;
  const prefixe = 'Par exemple : ';
  const texte = `${prefixe}${EXEMPLES[exemple]}`;
  let n = prefixe.length;
  clearTimeout(minuterieExemple);
  const taper = () => {
    n += 1;
    champ.placeholder = typo(texte.slice(0, n));
    if (n < texte.length) minuterieExemple = setTimeout(taper, 26);
  };
  taper();
}

/* Guide d'un objectif ---------------------------------------------------------- */

let vue: EtatGuide | null = null;
let triParcours: TriParcours = 'reproduits';
const comparaisonChoisie = new Set<number>();
let casIndex = 0;
const reponsesCas = new Map<number, EtatCas>();

function cochesDe(g: GuideApi): Set<string> {
  if (g.moi)
    return new Set([
      ...g.moi.liste.etapes.map((id) => `e${id}`),
      ...g.moi.liste.pieges.map((id) => `p${id}`),
    ]);
  const listes = memoire.lire<Record<string, unknown>>(CLE_LISTES, {});
  const liste = listes[g.guide.slug];
  return new Set(
    Array.isArray(liste) ? liste.filter((c): c is string => typeof c === 'string') : [],
  );
}

function etatDuGuide(g: GuideApi): EtatGuide {
  return {
    guide: g,
    maintenant,
    mesOutils,
    outils,
    coches: vue?.guide === g ? vue.coches : cochesDe(g),
    membre: etats.membre(),
    propositions: vue?.guide === g ? vue.propositions : (g.moi?.propositions ?? []),
    triParcours,
    comparaison: comparaisonChoisie,
    casIndex,
    cas: reponsesCas,
    invitation: invitation('contribuer', 'suivre votre progression'),
  };
}

async function chargerGuide(slug: string): Promise<GuideApi | null> {
  const connu = guidesLus.get(slug);
  if (connu) return connu;
  const reponse = await api<GuideApi>('GET', `/api/v1/guides/${encodeURIComponent(slug)}`);
  if (!reponse.ok) return null;
  guidesLus.set(slug, reponse.donnees);
  return reponse.donnees;
}

function rendreGuide(): void {
  const g = etat.guide ? guidesLus.get(etat.guide) : undefined;
  if (!g || !els.guide) return;
  for (const c of g.cas) if (!reponsesCas.has(c.id)) reponsesCas.set(c.id, etatInitialCas(c));
  vue = etatDuGuide(g);
  if (els.navigationGuides) els.navigationGuides.innerHTML = navigationGuides(g);
  els.guide.innerHTML = vueGuide(vue);
  document.title = `${g.guide.titreCourt} · Explorer · Vysora`;
  majBarreComparaison();
  observerGuide();
}

function rendreSection(cle: CleSection): void {
  if (!vue) return;
  const g = vue.guide;
  vue = etatDuGuide(g);
  const corps = $(`[data-body="${cle}"]`);
  if (!corps) return;
  corps.innerHTML = CORPS_SECTIONS[cle](vue);
  if (cle === 'methode') observerGuide();
}

function afficherVue({ focus = false, rechercher = true } = {}): void {
  const surGuide = Boolean(etat.guide);
  if (els.vueIndex) els.vueIndex.hidden = surGuide;
  if (els.vueGuide) els.vueGuide.hidden = !surGuide;
  if (surGuide) {
    rendreGuide();
    if (focus) {
      window.scrollTo({ top: 0 });
      $('#ex-guide-title')?.focus({ preventScroll: true });
    }
  } else {
    document.title = 'Explorer · Vysora';
    if (els.champ) els.champ.value = etat.q;
    if (els.effacer) els.effacer.hidden = !etat.q;
    rendreIndex(rechercher);
    comparaisonChoisie.clear();
    majBarreComparaison();
    if (focus) window.scrollTo({ top: 0 });
  }
  const active = surGuide ? els.vueGuide : els.vueIndex;
  if (active && animations.completes()) {
    active.classList.remove('is-entering');
    void active.offsetWidth;
    active.classList.add('is-entering');
  }
}

async function ouvrirGuide(slug: string): Promise<void> {
  const g = await chargerGuide(slug);
  // Guide indisponible : la page du guide, rendue par le serveur, dira pourquoi.
  if (!g) {
    location.href = ROUTES.guide(slug);
    return;
  }
  if (etat.guide !== slug) {
    comparaisonChoisie.clear();
    casIndex = 0;
    triParcours = 'reproduits';
    vue = null;
  }
  etat.guide = slug;
  ecrireAdresseCourante(true);
  afficherVue({ focus: true });
}

function retourIndex(changements: Partial<AdresseExplorer> = {}): void {
  etat.guide = null;
  Object.assign(etat, changements);
  vue = null;
  ecrireAdresseCourante(true);
  afficherVue({ focus: true });
}

/* Liste de contrôle ------------------------------------------------------------ */

let enregistrementListe: ReturnType<typeof setTimeout> | undefined;
/** Membre : enregistrée dans son compte ; visiteur : dans ce navigateur (prototype : vysora-listes). */
function enregistrerListe(): void {
  if (!vue) return;
  const { guide: g, coches } = vue;
  if (!g.moi) {
    const listes = memoire.lire<Record<string, string[]>>(CLE_LISTES, {});
    listes[g.guide.slug] = [...coches];
    memoire.ecrire(CLE_LISTES, listes);
    return;
  }
  const liste: ListeControleApi = {
    etapes: g.methode.filter((s) => coches.has(`e${s.id}`)).map((s) => s.id),
    pieges: g.pieges.filter((p) => coches.has(`p${p.id}`)).map((p) => p.id),
  };
  g.moi.liste = liste;
  clearTimeout(enregistrementListe);
  enregistrementListe = setTimeout(async () => {
    const reponse = await api<ListeControleApi>(
      'PUT',
      `/api/v1/guides/${encodeURIComponent(g.guide.slug)}/liste`,
      liste,
    );
    if (!reponse.ok)
      signalerEchec(
        reponse.probleme,
        'Votre liste n’a pas pu être enregistrée. Réessayez dans un instant.',
      );
  }, 400);
}

function rendreListe(cle?: string): void {
  if (!vue) return;
  const aside = $('.ex-checklist');
  if (aside) aside.outerHTML = listeDeControle(vue);
  if (cle) $<HTMLElement>(`[data-check="${cle}"]`)?.focus();
  for (const etape of $$('.ex-step[data-step]'))
    etape.classList.toggle('is-done', vue.coches.has(etape.dataset.step ?? ''));
}

/* Cas pratiques ------------------------------------------------------------------ */

async function repondre(formulaire: HTMLFormElement): Promise<void> {
  const id = Number(formulaire.dataset.caseForm);
  const choisie = $<HTMLInputElement>('input[type="radio"]:checked', formulaire);
  if (!choisie) {
    const erreur = $('[data-case-error]', formulaire);
    if (erreur) erreur.hidden = false;
    $<HTMLInputElement>('input[type="radio"]', formulaire)?.focus();
    return;
  }
  const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
  if (bouton) bouton.disabled = true;
  const reponse = await api<ReponseCasApi>('POST', `/api/v1/cas/${id}/reponses`, {
    optionId: Number(choisie.value),
  });
  if (!reponse.ok) {
    if (bouton) bouton.disabled = false;
    signalerEchec(
      reponse.probleme,
      'Votre réponse n’a pas pu être envoyée. Réessayez dans un instant.',
    );
    return;
  }
  const r = reponse.donnees;
  reponsesCas.set(id, {
    choix: r.optionId,
    verrouille: true,
    correction: r.correction,
    enregistree: r.enregistree,
  });
  rendreSection('pratique');
  $<HTMLElement>('#pratique [data-feedback]')?.focus();
}

/* Signaler un piège --------------------------------------------------------------- */

const dialogueProposition = $<HTMLDialogElement>('[data-propose-dialog]');
const formulaireProposition = $<HTMLFormElement>('[data-propose-form]');
const CHAMPS_PROPOSITION: Record<string, string> = {
  titre: 'pp-title',
  solution: 'pp-fix',
  outil: 'pp-tool',
  etapeId: 'pp-step',
};

function afficherErreursProposition(erreurs: Record<string, string>): void {
  if (!formulaireProposition) return;
  for (const [champ, id] of Object.entries(CHAMPS_PROPOSITION)) {
    const saisie = $<HTMLElement>(`#${id}`, formulaireProposition);
    const message = $<HTMLElement>(`#${id}-error`, formulaireProposition);
    const texte = erreurs[champ];
    if (texte) saisie?.setAttribute('aria-invalid', 'true');
    else saisie?.removeAttribute('aria-invalid');
    if (message) {
      message.hidden = !texte;
      message.textContent = texte ? typo(texte) : '';
    }
  }
  const premier = Object.keys(CHAMPS_PROPOSITION).find((champ) => erreurs[champ]);
  if (premier) $<HTMLElement>(`#${CHAMPS_PROPOSITION[premier]}`, formulaireProposition)?.focus();
}

function ouvrirProposition(): void {
  if (!vue || !dialogueProposition || !formulaireProposition) return;
  formulaireProposition.reset();
  afficherErreursProposition({});
  const etapes = $<HTMLSelectElement>('[data-propose-steps]', formulaireProposition);
  if (etapes)
    etapes.innerHTML = `<option value="">Plusieurs étapes ou je ne sais pas</option>${vue.guide.methode.map((s, i) => `<option value="${s.id}">${i + 1}. ${t(s.titre)}</option>`).join('')}`;
  const nom = $('[data-propose-guide]', dialogueProposition);
  if (nom) nom.textContent = typo(vue.guide.guide.titreCourt);
  dialogueProposition.showModal();
  $<HTMLElement>('#pp-title', formulaireProposition)?.focus();
}

formulaireProposition?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  if (!vue || !formulaireProposition) return;
  const champs = formulaireProposition.elements as unknown as Record<string, HTMLInputElement>;
  const saisie = {
    titre: champs.titre?.value ?? '',
    solution: champs.solution?.value ?? '',
    outil: champs.outil?.value ?? '',
    etapeId: champs.etapeId?.value ? Number(champs.etapeId.value) : null,
  };
  const controle = schemaPropositionPiege.safeParse(saisie);
  if (!controle.success) {
    afficherErreursProposition(erreursParChamp(controle.error));
    return;
  }
  const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaireProposition);
  if (bouton) bouton.disabled = true;
  const slug = vue.guide.guide.slug;
  const reponse = await api<PropositionPiegeApi>(
    'POST',
    `/api/v1/guides/${encodeURIComponent(slug)}/propositions`,
    saisie,
  );
  if (bouton) bouton.disabled = false;
  if (!reponse.ok) {
    if (reponse.probleme.erreurs) afficherErreursProposition(reponse.probleme.erreurs);
    else
      signalerEchec(
        reponse.probleme,
        'Votre signalement n’a pas pu être envoyé. Réessayez dans un instant.',
      );
    return;
  }
  const g = vue.guide;
  if (g.moi) g.moi.propositions = [reponse.donnees, ...g.moi.propositions];
  vue.propositions = [reponse.donnees, ...vue.propositions];
  dialogueProposition?.close();
  rendreSection('pieges');
  toast('Merci : votre signalement sera relu avant d’apparaître dans le guide.');
  const enRelecture = $<HTMLElement>('#pieges .ex-pit.is-pending h3');
  enRelecture?.setAttribute('tabindex', '-1');
  enRelecture?.focus();
});

formulaireProposition?.addEventListener('input', (evenement) => {
  const cible = evenement.target as HTMLElement;
  if (cible.getAttribute('aria-invalid') !== 'true') return;
  cible.removeAttribute('aria-invalid');
  const message = $<HTMLElement>(`#${cible.id}-error`);
  if (message) message.hidden = true;
});

/* Comparaison des parcours --------------------------------------------------------- */

function majBarreComparaison(): void {
  const barre = els.barreComparaison;
  if (!barre) return;
  const n = comparaisonChoisie.size;
  barre.hidden = n === 0 || !etat.guide;
  const texte = $('[data-compare-text]', barre);
  if (texte)
    texte.textContent = n
      ? `${pluriel(n, 'parcours sélectionné', 'parcours sélectionnés')}${n < 2 ? typo(' : choisissez-en un autre') : ''}`
      : '';
  const ouvrir = $<HTMLButtonElement>('[data-compare-open]', barre);
  if (ouvrir) ouvrir.disabled = n < 2;
  for (const boite of $$<HTMLInputElement>('[data-compare-id]'))
    boite.disabled = !boite.checked && n >= 3;
}

function ouvrirComparaison(): void {
  if (!vue) return;
  const corps = $('[data-compare-body]');
  if (corps) corps.innerHTML = comparaison(etatDuGuide(vue.guide));
  $<HTMLDialogElement>('[data-compare-dialog]')?.showModal();
}

/* Mes outils (prototype : initToolsDialog) ------------------------------------------- */

const dialogueOutils = $<HTMLDialogElement>('[data-tools-dialog]');
const listeOutils = $('[data-tools-list]', dialogueOutils ?? document);
const filtreOutils = $<HTMLInputElement>('[data-tools-filter]', dialogueOutils ?? document);
let brouillonOutils = new Set<string>();

function libelleEnregistrer(): void {
  const bouton = $('[data-tools-save]', dialogueOutils ?? document);
  if (bouton)
    bouton.textContent = brouillonOutils.size
      ? `Enregistrer ${pluriel(brouillonOutils.size, 'outil', 'outils')}`
      : 'Enregistrer';
}

function rendreOutils(): void {
  if (!listeOutils || !filtreOutils) return;
  const requete = plier(filtreOutils.value).trim();
  const groupes = FAMILLES.map(
    (f) =>
      [
        f,
        donnees.outils.filter(
          (o) => o.famille === f.id && (!requete || plier(o.nom).includes(requete)),
        ),
      ] as const,
  ).filter(([, liste]) => liste.length);
  listeOutils.innerHTML = groupes.length
    ? groupes
        .map(
          ([f, liste]) =>
            `<section class="ex-tools-fam"><h3>${t(f.label)}</h3><div class="ex-tools-grid">${liste
              .map(
                (o) =>
                  `<button class="ex-tool-opt" type="button" aria-pressed="${brouillonOutils.has(o.slug)}" data-tool="${esc(o.slug)}">${o.logo ? `<img class="tool-logo${o.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(o.logo)}.svg" alt="" width="18" height="18" decoding="async">` : ''}<span>${t(o.nom)}</span>${icon('check')}</button>`,
              )
              .join('')}</div></section>`,
        )
        .join('')
    : `<p class="ex-empty-note">${t(`Aucun outil ne correspond à « ${filtreOutils.value} ».`)}</p>`;
  libelleEnregistrer();
}

function ouvrirOutils(): void {
  if (!dialogueOutils || !filtreOutils) return;
  brouillonOutils = new Set(mesOutils);
  dialogueOutils.returnValue = '';
  filtreOutils.value = '';
  rendreOutils();
  dialogueOutils.showModal();
  filtreOutils.focus();
}

listeOutils?.addEventListener('click', (evenement) => {
  const bouton = (evenement.target as Element).closest<HTMLElement>('[data-tool]');
  const slug = bouton?.dataset.tool;
  if (!bouton || !slug) return;
  if (brouillonOutils.has(slug)) brouillonOutils.delete(slug);
  else brouillonOutils.add(slug);
  bouton.setAttribute('aria-pressed', String(brouillonOutils.has(slug)));
  libelleEnregistrer();
});
filtreOutils?.addEventListener('input', rendreOutils);
$('[data-tools-reset]', dialogueOutils ?? document)?.addEventListener('click', () => {
  brouillonOutils.clear();
  rendreOutils();
});
$('[data-close-tools]', dialogueOutils ?? document)?.addEventListener('click', () =>
  dialogueOutils?.close(''),
);
// « Enregistrer » soumet le formulaire de la fenêtre : la sélection s'applique aussitôt, sans attendre
// l'événement « close » (que le navigateur peut différer) ; Échap ou « Fermer » ne changent rien.
dialogueOutils?.querySelector('form')?.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  dialogueOutils?.close('save');
  mesOutils = new Set(brouillonOutils);
  memoire.ecrire(CLE_OUTILS, [...mesOutils]);
  if (etat.guide) rendreSection('outils');
  else rendreIndex(false);
  toast(
    mesOutils.size
      ? `${pluriel(mesOutils.size, 'outil enregistré', 'outils enregistrés')}.`
      : 'Sélection d’outils effacée.',
  );
  $<HTMLElement>('[data-open-tools]')?.focus();
});

/* Copier ------------------------------------------------------------------------- */

async function copier(texte: string, bouton: HTMLElement | null, fait: string, message: string) {
  try {
    await navigator.clipboard.writeText(texte);
    const libelle = bouton ? $('span', bouton) : null;
    const avant = libelle?.textContent ?? '';
    if (libelle) libelle.textContent = fait;
    bouton?.classList.add('is-done');
    toast(message);
    setTimeout(() => {
      if (libelle) libelle.textContent = avant;
      bouton?.classList.remove('is-done');
    }, 2400);
  } catch {
    toast('Copie impossible : sélectionnez le texte pour le copier.', 'alert');
  }
}

/* Erreurs ------------------------------------------------------------------------- */

function signalerEchec(probleme: ProblemeApi, defaut: string): void {
  // Session expirée ou droits changés : la page rendue de nouveau présente le bon état.
  if (probleme.status === 401 || probleme.status === 403) {
    if (probleme.raison) exiger('contribuer');
    else toast(probleme.detail ?? defaut, 'alert');
    return;
  }
  toast(
    probleme.status === 429 || probleme.status === 400 ? (probleme.detail ?? defaut) : defaut,
    'alert',
  );
}

/* Événements --------------------------------------------------------------------- */

const sansModificateur = (e: MouseEvent) =>
  !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0;

document.addEventListener('click', (evenement) => {
  const cible = evenement.target as Element;
  const lien = cible.closest<HTMLElement>('[data-guide-link]');
  if (lien?.dataset.guideLink && sansModificateur(evenement)) {
    evenement.preventDefault();
    void ouvrirGuide(lien.dataset.guideLink);
    return;
  }
  if (cible.closest('[data-back]') && sansModificateur(evenement)) {
    evenement.preventDefault();
    retourIndex();
    return;
  }
  const domaineLien = cible.closest<HTMLElement>('[data-domain-link]');
  if (domaineLien && sansModificateur(evenement)) {
    evenement.preventDefault();
    retourIndex({ domaine: domaineLien.dataset.domainLink ?? '', q: '' });
    return;
  }
  const saut = cible.closest<HTMLElement>('[data-jump]');
  if (saut?.dataset.jump) {
    const destination = document.getElementById(saut.dataset.jump);
    if (destination) {
      evenement.preventDefault();
      destination.scrollIntoView({
        behavior: animations.completes() ? 'smooth' : 'auto',
        block: 'start',
      });
      history.replaceState(null, '', `${location.pathname}${location.search}#${saut.dataset.jump}`);
      const titre = destination.matches('section') ? $('h2', destination) : $('h3', destination);
      titre?.setAttribute('tabindex', '-1');
      titre?.focus({ preventScroll: true });
    }
    return;
  }
  if (cible.closest('[data-open-tools]')) {
    ouvrirOutils();
    return;
  }
  const copie = cible.closest<HTMLElement>('[data-copy-step]');
  if (copie && vue) {
    const texte = vue.guide.methode[Number(copie.dataset.copyStep)]?.citation?.texte;
    if (texte) void copier(texte, copie, 'Prompt copié', 'Prompt copié.');
    return;
  }
  if (cible.closest('[data-copy-link]')) {
    void navigator.clipboard
      .writeText(location.href.split('#')[0] ?? location.href)
      .then(() => toast('Lien du guide copié.'))
      .catch(() =>
        toast('Copie impossible : copiez l’adresse depuis la barre du navigateur.', 'alert'),
      );
    return;
  }
  const entrainement = cible.closest<HTMLElement>('[data-train]');
  if (entrainement && vue) {
    casIndex = Math.max(
      0,
      vue.guide.cas.findIndex((c) => c.id === Number(entrainement.dataset.train)),
    );
    rendreSection('pratique');
    $('#pratique')?.scrollIntoView({ behavior: animations.completes() ? 'smooth' : 'auto' });
    const titre = $<HTMLElement>('#pratique .ex-case h3');
    titre?.setAttribute('tabindex', '-1');
    titre?.focus({ preventScroll: true });
    return;
  }
  const choixCas = cible.closest<HTMLElement>('[data-case-pick]');
  if (choixCas) {
    casIndex = Number(choixCas.dataset.casePick);
    rendreSection('pratique');
    $<HTMLElement>(`[data-case-pick="${casIndex}"]`)?.focus();
    return;
  }
  const recommencer = cible.closest<HTMLElement>('[data-case-retry]');
  if (recommencer) {
    reponsesCas.set(Number(recommencer.dataset.caseRetry), {
      choix: null,
      verrouille: false,
      correction: null,
      enregistree: false,
    });
    rendreSection('pratique');
    $<HTMLElement>('#pratique input[type="radio"]')?.focus();
    return;
  }
  const domaine = cible.closest<HTMLElement>('[data-domain]');
  if (domaine?.closest('[data-domains]')) {
    const choisi = domaine.dataset.domain ?? '';
    etat.domaine = choisi === etat.domaine ? '' : choisi;
    ecrireAdresseCourante(true);
    rendreIndex(false);
    return;
  }
  const terme = cible.closest<HTMLElement>('[data-term]');
  if (terme && sansModificateur(evenement as MouseEvent)) {
    evenement.preventDefault();
    etat.q = terme.dataset.term ?? '';
    if (els.champ) els.champ.value = etat.q;
    if (els.effacer) els.effacer.hidden = false;
    ecrireAdresseCourante(true);
    rendreIndex();
    $('#ex-index-title')?.scrollIntoView({ behavior: animations.completes() ? 'smooth' : 'auto' });
    return;
  }
  const soutien = cible.closest<HTMLButtonElement>('[data-want]');
  if (soutien) {
    void soutenir(soutien);
    return;
  }
  const copieListe = cible.closest<HTMLElement>('[data-check-copy]');
  if (copieListe && vue) {
    void copier(
      texteListe(vue, `${location.origin}${ROUTES.guide(vue.guide.guide.slug)}`),
      copieListe,
      'Liste copiée',
      'Liste de contrôle copiée.',
    );
    return;
  }
  if (cible.closest('[data-check-reset]') && vue) {
    vue.coches.clear();
    enregistrerListe();
    rendreListe();
    $<HTMLElement>('[data-check]')?.focus();
    return;
  }
  if (cible.closest('[data-propose]')) {
    if (exiger('contribuer', 'signaler un piège')) ouvrirProposition();
    return;
  }
  if (cible.closest('[data-compare-open]')) {
    ouvrirComparaison();
    return;
  }
  if (cible.closest('[data-compare-clear]')) {
    comparaisonChoisie.clear();
    for (const boite of $$<HTMLInputElement>('[data-compare-id]')) {
      boite.checked = false;
      boite.disabled = false;
    }
    majBarreComparaison();
    return;
  }
  if (cible.closest('[data-close-dialog]')) cible.closest('dialog')?.close();
});

for (const dialogue of $$<HTMLDialogElement>('dialog.ex-dialog'))
  dialogue.addEventListener('click', (evenement) => {
    if (evenement.target === dialogue) dialogue.close('');
  });

document.addEventListener('change', (evenement) => {
  const cible = evenement.target as HTMLElement;
  const choixGuide = cible.closest<HTMLSelectElement>('[data-guide-select]');
  if (choixGuide) {
    void ouvrirGuide(choixGuide.value);
    return;
  }
  const tri = cible.closest<HTMLSelectElement>('[data-index-sort]');
  if (tri) {
    etat.tri = TRIS.includes(tri.value as Tri) ? (tri.value as Tri) : 'actifs';
    ecrireAdresseCourante(true);
    rendreIndex(false);
    return;
  }
  const triRuns = cible.closest<HTMLSelectElement>('[data-run-sort]');
  if (triRuns) {
    triParcours = TRIS_PARCOURS.includes(triRuns.value as TriParcours)
      ? (triRuns.value as TriParcours)
      : 'reproduits';
    rendreSection('parcours');
    $<HTMLElement>('[data-run-sort]')?.focus();
    return;
  }
  const comparer = cible.closest<HTMLInputElement>('[data-compare-id]');
  if (comparer) {
    const id = Number(comparer.dataset.compareId);
    if (comparer.checked) comparaisonChoisie.add(id);
    else comparaisonChoisie.delete(id);
    majBarreComparaison();
    return;
  }
  const coche = cible.closest<HTMLInputElement>('[data-check]');
  if (coche && vue) {
    const cle = coche.dataset.check ?? '';
    if (coche.checked) vue.coches.add(cle);
    else vue.coches.delete(cle);
    enregistrerListe();
    rendreListe(cle);
    return;
  }
  const option = cible.closest<HTMLInputElement>('.ex-case-form input[type="radio"]');
  if (option) {
    const formulaire = option.closest<HTMLFormElement>('[data-case-form]');
    const id = Number(formulaire?.dataset.caseForm);
    const actuel = reponsesCas.get(id);
    if (actuel) reponsesCas.set(id, { ...actuel, choix: Number(option.value) });
    const erreur = formulaire ? $('[data-case-error]', formulaire) : null;
    if (erreur) erreur.hidden = true;
  }
});

document.addEventListener('submit', (evenement) => {
  const formulaire = (evenement.target as Element).closest<HTMLFormElement>('[data-case-form]');
  if (!formulaire) return;
  evenement.preventDefault();
  void repondre(formulaire);
});

document.addEventListener('keydown', (evenement) => {
  const cible = evenement.target as Element;
  const cas = cible.closest?.('.ex-case');
  if (cas && !evenement.ctrlKey && !evenement.metaKey && !evenement.altKey) {
    const rang = ['a', 'b', 'c', 'd', 'e'].indexOf(evenement.key.toLowerCase());
    const options = $$<HTMLInputElement>('input[type="radio"]:not(:disabled)', cas);
    const option = options[rang];
    if (rang >= 0 && option && !cible.matches('input[type="search"], textarea')) {
      evenement.preventDefault();
      option.checked = true;
      option.focus();
      option.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }
  if (
    evenement.key === '/' &&
    !evenement.ctrlKey &&
    !evenement.metaKey &&
    !evenement.altKey &&
    !cible.closest('input, textarea, select, [contenteditable="true"], dialog[open]')
  ) {
    evenement.preventDefault();
    if (etat.guide) retourIndex();
    els.champ?.focus();
    els.champ?.select();
  }
});

window.addEventListener('popstate', () => {
  const lue = lireAdresse(new URLSearchParams(location.search), domaines);
  Object.assign(etat, lue);
  if (etat.guide && !guidesLus.has(etat.guide)) {
    const slug = etat.guide;
    etat.guide = null;
    void chargerGuide(slug).then((g) => {
      if (!g) return;
      etat.guide = slug;
      afficherVue();
    });
  }
  vue = null;
  afficherVue();
});

/* Défilement : chemin parcouru, section courante, progression de lecture -------------- */

let observateurEtapes: IntersectionObserver | undefined;
let observateurSections: IntersectionObserver | undefined;
function observerGuide(): void {
  observateurEtapes?.disconnect();
  observateurSections?.disconnect();
  const chemin = $('[data-path]');
  if (chemin) {
    const etapes = $$('.ex-step', chemin);
    const remplir = () => {
      const atteintes = etapes.filter((e) => e.classList.contains('is-reached')).length;
      chemin.style.setProperty(
        '--fill',
        etapes.length > 1 ? Math.max(0, (atteintes - 1) / (etapes.length - 1)).toFixed(3) : '1',
      );
    };
    if (!animations.completes() || !('IntersectionObserver' in window))
      for (const e of etapes) e.classList.add('is-reached');
    else {
      observateurEtapes = new IntersectionObserver(
        (entrees) => {
          for (const entree of entrees)
            if (entree.isIntersecting) entree.target.classList.add('is-reached');
          remplir();
        },
        { rootMargin: '0px 0px -45% 0px' },
      );
      for (const e of etapes) observateurEtapes.observe(e);
    }
    remplir();
  }
  if (!('IntersectionObserver' in window)) return;
  const liens = $$<HTMLAnchorElement>('.ex-sections a');
  observateurSections = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        for (const lien of liens)
          if (lien.dataset.jump === entree.target.id) lien.setAttribute('aria-current', 'true');
          else lien.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-35% 0px -60% 0px' },
  );
  for (const s of $$('[data-section]')) observateurSections.observe(s);
}

let lectureEnAttente = false;
window.addEventListener(
  'scroll',
  () => {
    if (lectureEnAttente) return;
    lectureEnAttente = true;
    requestAnimationFrame(() => {
      lectureEnAttente = false;
      const barre = $('[data-read]');
      if (!barre || !etat.guide || !els.guide) return;
      const cadre = els.guide.getBoundingClientRect();
      const total = cadre.height - window.innerHeight;
      barre.style.setProperty(
        '--p',
        `${Math.max(0, Math.min(1, -cadre.top / (total || 1))) * 100}%`,
      );
    });
  },
  { passive: true },
);

/* Démarrage ------------------------------------------------------------------------ */

etats.on(() => {
  rendreDemandes();
  if (etat.guide) for (const cle of ['pratique', 'pieges', 'methode'] as const) rendreSection(cle);
});
setInterval(exempleSuivant, 4200);
// La page rendue par le serveur est complétée par ce qui ne se sait que dans le navigateur
// (« Mes outils », liste de contrôle d'un visiteur) ; les parcours cherchés sont déjà là.
afficherVue({ rechercher: false });
if (etat.guide && location.hash.length > 1) {
  const destination = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (destination) requestAnimationFrame(() => destination.scrollIntoView({ block: 'start' }));
}
const policesPretes = document.fonts?.ready ?? Promise.resolve();
void Promise.race([policesPretes, new Promise((fin) => setTimeout(fin, 900))]).then(() =>
  requestAnimationFrame(() => document.body.classList.add('is-ready')),
);
