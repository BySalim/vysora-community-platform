import type { DocumentLegalApi, TypeDocumentLegal } from '@vysora/shared';
import {
  ORDRE_PAGES_LEGALES,
  PAGES_LEGALES,
  type ClePageLegale,
  type PageLegale,
} from './documents-legaux';
import { ROUTES } from './navigation';
import { dateLongue, icon, t } from './texte';

/* Pages légales (LEG-01), portées de prototype/documents-legaux.js. Le texte est écrit dans chaque page ;
   ces fonctions produisent le reste du balisage du prototype, à l'identique : version, changements,
   onglets des documents, « L'essentiel », sommaire, liens d'articles, acceptation et choix sur la mesure
   d'audience. Le serveur s'en sert pour le premier rendu (components/DocumentLegal.astro), le script de
   la page pour rendre de nouveau ce qui change après l'acceptation (scripts/documents-legaux.ts). */

/** Ce que la page sait du document et de la personne qui consulte. */
export interface ContextePageLegale {
  cle: ClePageLegale;
  /** Versions en vigueur (GET /api/v1/documents-legaux) ; vide si l'API n'a pas répondu. */
  documents: DocumentLegalApi[];
  membre: boolean;
  /** Documents que le membre doit encore accepter (GET /api/v1/moi/acceptations, RG-03). */
  aAccepter: TypeDocumentLegal[];
  /** Date d'effet des documents à accepter (AAAA-MM-JJ), donnée par la session. */
  conditionsDepuis: string | null;
  /** Adresse de la page, transmise à l'inscription et à la connexion (?retour=, déjà encodée). */
  retour: string;
}

/** Article de la page : section .lg-article et son titre. */
export interface InfoArticle {
  id: string;
  /** « 4 » pour « Article 4 » ou « 4. Titre », sinon le rang de la section. */
  num: string;
  titre: string;
  /** Numéroté « Article n » (conditions d'utilisation). */
  article: boolean;
  /** Numéroté, en « Article n » ou en « n. Titre ». */
  numerote: boolean;
}

/* Versions ------------------------------------------------------------------ */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** « 1<sup>er</sup> septembre 2026 » : date longue prête à insérer. */
export const date = (valeur: string): string =>
  t(dateLongue(valeur)).replace(/\b1er\b/, '1<sup>er</sup>');

const documentDe = (contexte: ContextePageLegale, page: PageLegale) =>
  page.type ? contexte.documents.find((document) => document.type === page.type) : undefined;

/** Date de la version : la version elle-même quand elle est datée (AAAA-MM-JJ), sinon sa date d'effet. */
const dateVersion = (document: DocumentLegalApi): string =>
  ISO.test(document.version) ? document.version : document.dateEffet;

/** Version affichée d'une page : document versionné de l'API, ou date de mise à jour du texte. */
function versionDe(
  contexte: ContextePageLegale,
  cle: ClePageLegale,
): { miseAJour: boolean; date: string } | null {
  const page = PAGES_LEGALES[cle];
  if (page.miseAJour) return { miseAJour: true, date: page.miseAJour };
  const document = documentDe(contexte, page);
  return document ? { miseAJour: false, date: dateVersion(document) } : null;
}

/** Le membre doit accepter la version en vigueur de ce document (bandeau « conditions », RG-03). */
export const estAAccepter = (contexte: ContextePageLegale, cle: ClePageLegale): boolean => {
  const { type } = PAGES_LEGALES[cle];
  return contexte.membre && Boolean(type) && contexte.aAccepter.includes(type!);
};

/** Documents à accepter, dans l'ordre des onglets. */
export const pagesAAccepter = (contexte: ContextePageLegale): ClePageLegale[] =>
  ORDRE_PAGES_LEGALES.filter((cle) => estAAccepter(contexte, cle));

/** Renvoi vers un article dans une phrase : « l'article 4 » ou « « Publier honnêtement » ». */
export const renvoi = (info: InfoArticle): string =>
  info.article ? `l’article ${info.num}` : `« ${info.titre} »`;

/* En-tête : version, changement, onglets ------------------------------------- */

export function rendreMeta(contexte: ContextePageLegale): string {
  const page = PAGES_LEGALES[contexte.cle];
  if (page.miseAJour)
    return `<li>${icon('calendar')}<span>Mise à jour le <b>${date(page.miseAJour)}</b></span></li>`;
  const document = documentDe(contexte, page);
  if (!document) return '';
  const version = dateVersion(document);
  const vigueur = !document.resumeChangements
    ? 'Version en vigueur'
    : document.dateEffet === version
      ? 'En vigueur depuis cette date'
      : `En vigueur depuis le ${date(document.dateEffet)}`;
  return [
    `<li>${icon('calendar')}<span>Version du <b>${date(version)}</b></span></li>`,
    `<li>${icon('check-circle')}<span>${vigueur}</span></li>`,
  ].join('');
}

/** « Ce qui change dans cette version » (#changements) : vide si la version n'a pas de résumé des changements. */
export function rendreChangement(
  contexte: ContextePageLegale,
  cible: InfoArticle | undefined,
): string {
  const document = documentDe(contexte, PAGES_LEGALES[contexte.cle]);
  if (!document?.resumeChangements) return '';
  const lien = cible ? ` <a href="#${cible.id}">Lire ${t(renvoi(cible))}</a>` : '';
  const lecture = estAAccepter(contexte, contexte.cle)
    ? `<span class="lg-lecture-seule">Votre compte est en lecture seule jusqu’à l’acceptation de cette version. <a href="#acceptation">Accepter cette version</a></span>`
    : '';
  return `<span class="lg-changement-icone" aria-hidden="true">${icon('history', '')}</span><p><b>Ce qui change dans cette version.</b> ${t(document.resumeChangements)}${lien}${lecture}</p>`;
}

export function rendreDocuments(contexte: ContextePageLegale): string {
  return `<ul>${ORDRE_PAGES_LEGALES.map((cle) => {
    const page = PAGES_LEGALES[cle];
    const version = versionDe(contexte, cle);
    const statut = estAAccepter(contexte, cle)
      ? '<span class="lg-doc-version is-a-accepter">À accepter</span>'
      : version
        ? `<span class="lg-doc-version"><span class="lg-doc-prefixe">${version.miseAJour ? 'Mise à jour le ' : 'Version du '}</span>${date(version.date)}</span>`
        : '';
    return `<li><a href="${page.route}"${cle === contexte.cle ? ' aria-current="page"' : ''}><span class="lg-doc-nom">${t(page.onglet)}</span>${statut}</a></li>`;
  }).join('')}</ul>`;
}

/* L'essentiel et sommaire ----------------------------------------------------- */

/** Les points de la page, reliés aux articles cités par `renvois` (identifiants, dans l'ordre des points). */
export function rendreEssentiel(
  cle: ClePageLegale,
  infos: InfoArticle[],
  renvois: string[],
): string {
  const points = PAGES_LEGALES[cle].points ?? [];
  return `<h2 id="lg-essentiel-titre">L’essentiel</h2>
      <ul>${points
        .map((point, i) => {
          const art = infos.find((info) => info.id === renvois[i]);
          const texte = art
            ? art.article
              ? `Article ${art.num}`
              : art.numerote
                ? `Section ${art.num}`
                : art.titre
            : '';
          return `<li>${icon('check')}<p>${t(point)}</p>${art ? `<a href="#${art.id}" aria-label="${t(`Lire ${renvoi(art)}`)}">${t(texte)}</a>` : ''}</li>`;
        })
        .join('')}</ul>`;
}

const lienSommaire = (info: InfoArticle) =>
  `<li><a href="#${info.id}" data-lg-vers="${info.id}"><span>${t(info.num)}.</span><span>${t(info.titre)}</span></a></li>`;

/** Sommaire en colonne (ordinateur), qui suit la lecture. */
export function rendreSommaire(infos: InfoArticle[]): string {
  return `<p class="lg-rail-titre" id="lg-sommaire-titre">Sommaire</p>
      <ol class="lg-sommaire">${infos.map(lienSommaire).join('')}<span class="lg-repere" aria-hidden="true" data-lg-repere></span></ol>
      <p class="lg-rail-fin"><a href="#contenu">${icon('up')}Haut de page</a></p>`;
}

/** Contenu du sommaire repliable en tête du texte (tablette et mobile). */
export function rendreSommaireTete(infos: InfoArticle[]): string {
  return `<summary>Sommaire<svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><nav aria-label="Sommaire du document"><ol>${infos.map(lienSommaire).join('')}</ol></nav>`;
}

/* Articles ------------------------------------------------------------------- */

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Texte d'un fragment HTML, comme textContent : balises retirées, entités lues. */
function texteDe(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entite, nom: string) => {
      if (nom.startsWith('#x') || nom.startsWith('#X'))
        return String.fromCodePoint(Number.parseInt(nom.slice(2), 16));
      if (nom.startsWith('#')) return String.fromCodePoint(Number(nom.slice(1)));
      return ENTITES[nom.toLowerCase()] ?? entite;
    })
    .replace(/[ \t\r\n]+/g, ' ');
}

const SECTION_ARTICLE = /(<section\b[^>]*>)(\s*)<h2>([\s\S]*?)<\/h2>/g;
const NUMERO = /<span class="lg-num">([\s\S]*?)<\/span>/;

const attribut = (balise: string, nom: string): string | undefined =>
  new RegExp(`\\s${nom}="([^"]*)"`).exec(balise)?.[1];

/**
 * Articles du texte d'une page (sections .lg-article) : numéro et titre lus comme le faisait le prototype
 * (« Article n » des conditions, « n. » des sections numérotées, sinon l'ordre), et titre habillé de son
 * bouton « Copier le lien » (div.lg-h).
 */
export function preparerArticles(html: string): { html: string; infos: InfoArticle[] } {
  const infos: InfoArticle[] = [];
  const habille = html.replace(
    SECTION_ARTICLE,
    (tout, ouverture: string, espace: string, titreHtml: string) => {
      const classes = (attribut(ouverture, 'class') ?? '').split(/\s+/);
      const id = attribut(ouverture, 'id');
      if (!classes.includes('lg-article') || !id) return tout;
      const libelle = texteDe(NUMERO.exec(titreHtml)?.[1] ?? '').trim();
      const brut = texteDe(titreHtml.replace(NUMERO, '')).trim();
      const numero = /^(\d+)\.\s*/.exec(brut);
      const info: InfoArticle = {
        id,
        num: libelle.replace(/\D+/g, '') || (numero ? numero[1]! : String(infos.length + 1)),
        titre: numero ? brut.slice(numero[0].length) : brut,
        article: Boolean(libelle),
        numerote: Boolean(libelle || numero),
      };
      infos.push(info);
      const bouton = `<button class="lg-ancre" type="button" aria-label="${t(`Copier le lien vers ${renvoi(info)}`)}" data-lg-ancre="${id}">${icon('link', '')}</button>`;
      return `${ouverture}${espace}<div class="lg-h"><h2>${titreHtml}</h2>${bouton}</div>`;
    },
  );
  return { html: habille, infos };
}

/* Acceptation selon l'état du compte ------------------------------------------- */

const liste = (elements: string[]): string =>
  elements.length < 2
    ? (elements[0] ?? '')
    : `${elements.slice(0, -1).join(', ')} et ${elements.at(-1)}`;

export function rendreAcceptation(contexte: ContextePageLegale): string {
  let html = '<h2 id="acceptation-titre" tabindex="-1">Acceptation</h2>';
  const changes = pagesAAccepter(contexte);
  if (!contexte.membre) {
    html += `<p>L’inscription demande d’accepter les conditions générales d’utilisation et la charte communautaire, dans leur version en vigueur. Chaque acceptation est enregistrée avec sa date.</p>
        <div class="lg-boutons"><a class="btn btn-primary" href="${ROUTES.inscription}?retour=${contexte.retour}">Créer un compte</a><a class="btn btn-secondary" href="${ROUTES.connexion}?retour=${contexte.retour}">Se connecter</a></div>`;
  } else if (estAAccepter(contexte, contexte.cle)) {
    const plusieurs = changes.length > 1;
    const depuis =
      contexte.conditionsDepuis ??
      contexte.documents
        .filter((document) => contexte.aAccepter.includes(document.type))
        .map((document) => document.dateEffet)
        .toSorted()
        .at(-1);
    const quand = depuis ? ` le ${dateLongue(depuis)}` : '';
    const intro = plusieurs
      ? `Ces documents ont changé${quand}. Votre compte reste en lecture seule jusqu’à l’acceptation de leurs nouvelles versions.`
      : `Ce document a changé${quand}. Votre compte reste en lecture seule jusqu’à l’acceptation de sa nouvelle version.`;
    const elements = changes.map((cle) => {
      const page = PAGES_LEGALES[cle];
      const resume = documentDe(contexte, page)?.resumeChangements;
      return `<li><b>${t(page.titre)}</b>${resume ? `<span>${t(resume)}</span>` : ''}${cle === contexte.cle ? '' : `<a href="${page.route}">${t(page.lire)}</a>`}</li>`;
    });
    html += `<form class="lg-accord" novalidate data-lg-accord>
        <p>${t(intro)}</p>
        <ul class="lg-a-accepter">${elements.join('')}</ul>
        <div class="lg-case"><input type="checkbox" id="lg-accord" name="accord" aria-describedby="lg-accord-erreur"><label for="lg-accord">${plusieurs ? 'J’accepte les nouvelles versions de ces documents.' : 'J’accepte la nouvelle version de ce document.'}</label></div>
        <p class="lg-erreur" id="lg-accord-erreur" hidden></p>
        <button class="btn btn-primary" type="submit">${plusieurs ? 'Accepter les nouvelles versions' : 'Accepter la nouvelle version'}</button>
      </form>`;
  } else {
    html += `<div class="lg-statut">${icon('check-circle', '')}<p><b>Vous avez accepté cette version.</b></p></div>`;
    if (changes.length) {
      const des = liste(changes.map((cle) => PAGES_LEGALES[cle].des ?? ''));
      const phrase =
        changes.length > 1
          ? `Les nouvelles versions ${des} sont à accepter pour continuer à publier et à participer.`
          : `La nouvelle version ${des} est à accepter pour continuer à publier et à participer.`;
      html += `<p class="lg-autres">${t(phrase)}</p>
          <div class="lg-boutons">${changes.map((cle) => `<a class="btn btn-secondary" href="${PAGES_LEGALES[cle].route}#acceptation">${t(PAGES_LEGALES[cle].lire)}</a>`).join('')}</div>`;
    }
  }
  return html;
}

/* Mesure d'audience (page Cookies) ---------------------------------------------- */

/** Cookie qui retient le refus d'être compté dans la mesure d'audience (politique relative aux cookies). */
export const COOKIE_AUDIENCE = 'vysora_mesure_audience';
/** 13 mois, comme l'annonce la politique relative aux cookies. */
export const DUREE_COOKIE_AUDIENCE = 13 * 30 * 24 * 60 * 60;

export function rendreChoixAudience(comptee: boolean): string {
  return `<div class="lg-choix-texte">
          <p class="lg-choix-titre" id="lg-audience-titre">Compter mes visites dans la mesure d’audience</p>
          <p class="lg-choix-etat" id="lg-audience-etat">${comptee ? 'Vos visites sont comptées, de façon anonyme.' : 'Vos visites ne sont plus comptées sur cet appareil.'}</p>
        </div>
        <button class="lg-interrupteur" type="button" role="switch" aria-checked="${comptee}" aria-labelledby="lg-audience-titre" aria-describedby="lg-audience-etat" data-lg-audience-bouton><span aria-hidden="true"></span></button>`;
}
