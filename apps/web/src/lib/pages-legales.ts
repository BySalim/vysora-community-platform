/* Pages des informations légales (prototype/documents-legaux.js) : conditions générales, politique de
   confidentialité, cookies, charte communautaire et mentions légales. Le texte est écrit dans chaque
   page ; la version, la date d'effet, le résumé des changements et ce qu'il reste à accepter viennent
   de l'API (GET /api/v1/documents-legaux). Le serveur rend ce que le prototype construisait dans le
   navigateur : sommaire, « L'essentiel », liens de section, typographie. */

import type { DocumentLegalApi, TypeDocumentLegal } from '@vysora/shared';
import { CLE_DOCUMENT, RESUMES_DOCUMENTS, type CleDocument } from './documents-legaux';
import { ROUTES } from './navigation';
import { dateLongue, t, typo } from './texte';

export type CleDocumentLegal = CleDocument | 'cookies' | 'mentions';

interface PageLegale {
  route: string;
  titre: string;
  onglet: string;
  /** Points de « L'essentiel » (ceux de la fenêtre des documents à l'inscription). */
  points?: string[];
  /** Pages sans version en base : date de la dernière mise à jour (AAAA-MM-JJ). */
  miseAJour?: string;
}

/** Ordre des onglets « Documents légaux ». */
export const ORDRE_PAGES_LEGALES: CleDocumentLegal[] = [
  'cgu',
  'confidentialite',
  'cookies',
  'charte',
  'mentions',
];

export const PAGES_LEGALES: Record<CleDocumentLegal, PageLegale> = {
  cgu: { route: ROUTES.cgu, ...RESUMES_DOCUMENTS.cgu },
  confidentialite: { route: ROUTES.confidentialite, ...RESUMES_DOCUMENTS.confidentialite },
  charte: { route: ROUTES.charte, ...RESUMES_DOCUMENTS.charte },
  cookies: {
    route: ROUTES.cookies,
    titre: 'Politique relative aux cookies',
    onglet: 'Cookies',
    miseAJour: '2026-10-19',
    points: [
      'Seuls des cookies strictement nécessaires sont déposés : ils ne demandent pas votre accord.',
      'La fréquentation est mesurée sans cookie, et vous pouvez refuser d’y être compté.',
      'Vysora ne dépose aucun cookie publicitaire et n’intègre aucun outil de mesure d’un tiers.',
    ],
  },
  mentions: {
    route: ROUTES.mentionsLegales,
    titre: 'Mentions légales',
    onglet: 'Mentions légales',
    miseAJour: '2026-10-19',
  },
};

/** Seules les conditions et la charte s'acceptent ; la politique de confidentialité informe. */
export const DOCUMENTS_ACCEPTES: CleDocumentLegal[] = ['cgu', 'charte'];
export const DES: Partial<Record<CleDocumentLegal, string>> = {
  cgu: 'des conditions générales d’utilisation',
  charte: 'de la charte communautaire',
};
export const LIRE: Partial<Record<CleDocumentLegal, string>> = {
  cgu: 'Lire les conditions générales d’utilisation',
  charte: 'Lire la charte communautaire',
};

/** Un document tel que la page le présente. */
export interface EtatDocument {
  cle: CleDocumentLegal;
  /** Date affichée (AAAA-MM-JJ) : « Version du … » ou « Mise à jour le … » ; null si inconnue. */
  date: string | null;
  miseAJour: boolean;
  /** Date d'effet de la version en vigueur. */
  dateEffet: string | null;
  /** La version en vigueur apporte des changements à accepter (conditions, charte). */
  modifie: boolean;
  changement: string | null;
  /** Le membre connecté doit encore accepter cette version (RG-03). */
  aAccepter: boolean;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** État de chaque page légale d'après les versions en vigueur (vide si l'API n'a pas répondu). */
export function etatDocuments(
  documents: DocumentLegalApi[],
): Record<CleDocumentLegal, EtatDocument> {
  const parType = new Map<TypeDocumentLegal, DocumentLegalApi>(
    documents.map((document) => [document.type, document]),
  );
  const etat = (cle: CleDocumentLegal): EtatDocument => {
    const page = PAGES_LEGALES[cle];
    if (page.miseAJour)
      return {
        cle,
        date: page.miseAJour,
        miseAJour: true,
        dateEffet: null,
        modifie: false,
        changement: null,
        aAccepter: false,
      };
    const type = (Object.keys(CLE_DOCUMENT) as TypeDocumentLegal[]).find(
      (candidat) => CLE_DOCUMENT[candidat] === cle,
    );
    const document = type ? parType.get(type) : undefined;
    const changement = document?.resumeChangements ?? null;
    return {
      cle,
      // La version porte la date de sa rédaction ; sinon, la date d'effet en tient lieu.
      date: document ? (DATE.test(document.version) ? document.version : document.dateEffet) : null,
      miseAJour: false,
      dateEffet: document?.dateEffet ?? null,
      modifie: DOCUMENTS_ACCEPTES.includes(cle) && Boolean(changement),
      changement,
      aAccepter: document?.aAccepter ?? false,
    };
  };
  return Object.fromEntries(ORDRE_PAGES_LEGALES.map((cle) => [cle, etat(cle)])) as Record<
    CleDocumentLegal,
    EtatDocument
  >;
}

/** « 1<sup>er</sup> septembre 2026 » : date longue, à insérer en HTML. */
export const dateHtml = (date: string): string =>
  t(dateLongue(date)).replace(/\b1er\b/, '1<sup>er</sup>');

/* Texte du document --------------------------------------------------------------------------- */

export interface ArticleLegal {
  id: string;
  /** « 3 » pour « Article 3 » ou « 3. Titre » ; sinon le rang de la section. */
  num: string;
  titre: string;
  /** Intertitre « Article n » (conditions générales). */
  article: boolean;
  numerote: boolean;
}

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  nbsp: ' ',
  rsquo: '’',
};

/** Texte lisible d'un fragment HTML : balises retirées, entités décodées. */
export function texteBrut(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entite, nom: string) => {
      if (nom.startsWith('#x') || nom.startsWith('#X'))
        return String.fromCodePoint(Number.parseInt(nom.slice(2), 16));
      if (nom.startsWith('#')) return String.fromCodePoint(Number(nom.slice(1)));
      return ENTITES[nom.toLowerCase()] ?? entite;
    })
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

const SECTION = /(<section class="lg-article" id="([^"]+)"[^>]*>\s*)(<h2>([\s\S]*?)<\/h2>)/g;
const NUMERO = /<span class="lg-num">([\s\S]*?)<\/span>/;

/** Sections du document (section.lg-article et leur premier intertitre), dans l'ordre. */
export function articlesDuTexte(html: string): ArticleLegal[] {
  return [...html.matchAll(SECTION)].map((m, index) => {
    const titreHtml = m[4] ?? '';
    const libelle = texteBrut(NUMERO.exec(titreHtml)?.[1] ?? '');
    const brut = texteBrut(titreHtml.replace(NUMERO, ''));
    const numero = /^(\d+)\.\s*/.exec(brut);
    return {
      id: m[2] ?? '',
      num: libelle.replace(/\D+/g, '') || (numero ? (numero[1] ?? '') : String(index + 1)),
      titre: numero ? brut.slice(numero[0].length) : brut,
      article: Boolean(libelle),
      numerote: Boolean(libelle || numero),
    };
  });
}

/** « l’article 3 » ou « « Publier honnêtement » » : renvoi vers une section dans une phrase. */
export const renvoi = (a: ArticleLegal): string =>
  a.article ? `l’article ${a.num}` : `« ${a.titre} »`;

/** Libellé court du lien de « L'essentiel » vers une section. */
export const libelleSection = (a: ArticleLegal): string =>
  a.article ? `Article ${a.num}` : a.numerote ? `Section ${a.num}` : a.titre;

/** Typographie des documents : celle de tout le site, plus des espaces insécables entre un nombre
    et le mot qui suit (« 24 heures », « 15 octobre ») et dans les noms de licences. */
export const typographie = (texte: string): string =>
  typo(texte)
    .replace(/(\d) (?=[a-zà-ÿ])/g, '$1 ')
    .replace(/\b(CC) (BY(?:-[A-Z]{2})?) (\d\.\d)/g, '$1 $2 $3')
    .replace(/\b(CC0) (\d\.\d)/g, '$1 $2');

const SANS_TYPOGRAPHIE = /^<(\/?)(pre|code|script|style|textarea)\b/i;

/** Typographie française sur le texte d'un fragment HTML, hors balises, attributs et code. */
export function typographieHtml(html: string): string {
  let protege = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((morceau) => {
      if (morceau.startsWith('<')) {
        const balise = SANS_TYPOGRAPHIE.exec(morceau);
        if (balise && !morceau.endsWith('/>')) protege += balise[1] ? -1 : 1;
        return morceau;
      }
      return protege > 0 ? morceau : typographie(morceau);
    })
    .join('');
}

/** Texte du document prêt à afficher : intertitres munis du bouton « Copier le lien », typographie. */
export function preparerTexte(html: string, articles: ArticleLegal[]): string {
  const parId = new Map(articles.map((a) => [a.id, a]));
  const avecAncres = html.replace(SECTION, (tout, debut: string, id: string, h2: string) => {
    const article = parId.get(id);
    if (!article) return tout;
    return `${debut}<div class="lg-h">${h2}<button class="lg-ancre" type="button" aria-label="${t(`Copier le lien vers ${renvoi(article)}`)}" data-lg-ancre="${id}"><svg class="icon" aria-hidden="true"><use href="#i-link"/></svg></button></div>`;
  });
  return typographieHtml(avecAncres);
}
