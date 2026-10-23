import type { TypeDocumentLegal } from '@vysora/shared';
import { ROUTES } from './navigation';

/* Résumé des documents légaux, seule source des points « essentiels » : fenêtre « Documents en vigueur »
   de la connexion et de l'inscription (prototype/auth-data.js, `documents`) et encadré « L'essentiel »
   des pages légales (LEG-01, prototype/documents-legaux.js). Le texte complet est celui des pages ;
   la version et la date d'effet viennent de l'API (GET /api/v1/documents-legaux). */

export type CleDocument = 'cgu' | 'confidentialite' | 'charte';

export interface ResumeDocument {
  type: TypeDocumentLegal;
  titre: string;
  onglet: string;
  points: string[];
}

export const ORDRE_DOCUMENTS: CleDocument[] = ['cgu', 'confidentialite', 'charte'];

export const CLE_DOCUMENT: Record<TypeDocumentLegal, CleDocument> = {
  CGU: 'cgu',
  CONFIDENTIALITE: 'confidentialite',
  CHARTE: 'charte',
};

export const RESUMES_DOCUMENTS: Record<CleDocument, ResumeDocument> = {
  cgu: {
    type: 'CGU',
    titre: 'Conditions générales d’utilisation',
    onglet: 'Conditions d’utilisation',
    points: [
      'Vysora est gratuit. Vous créez dans vos propres outils d’IA, puis vous publiez sur Vysora le résultat et le chemin parcouru.',
      'Chaque création commence en brouillon privé : rien n’est publié sans votre accord.',
      'Vous restez l’auteur de vos créations. Elles sont publiées sous licence CC BY 4.0, ou sous une autre licence que vous choisissez dans la liste proposée.',
      'Vous respectez les conditions d’utilisation des outils d’IA dont vous partagez les résultats.',
      'Le nombre de publications par 24 heures dépend de votre niveau ; il augmente avec votre réputation.',
    ],
  },
  confidentialite: {
    type: 'CONFIDENTIALITE',
    titre: 'Politique de confidentialité',
    onglet: 'Confidentialité',
    points: [
      'Vos données servent uniquement au fonctionnement de Vysora : votre compte, vos contributions, la modération et la sécurité.',
      'Votre adresse e-mail n’apparaît jamais sur votre profil public.',
      'Seuls les cookies strictement nécessaires sont utilisés ; la fréquentation est mesurée sans cookie, et vous pouvez refuser d’y être compté.',
      'Vos données sont hébergées en France ; elles ne sont ni vendues ni utilisées à des fins publicitaires.',
      'Depuis vos paramètres, vous téléchargez vos données ou supprimez votre compte ; toute autre demande reçoit une réponse sous un mois.',
    ],
  },
  charte: {
    type: 'CHARTE',
    titre: 'Charte communautaire',
    onglet: 'Charte communautaire',
    points: [
      'Bienveillance d’abord : Vysora est un espace sûr pour débuter, sans vote négatif.',
      'Créditez les auteurs : une variante cite toujours la création dont elle part.',
      'Ne publiez ni clé d’API, ni mot de passe, ni donnée personnelle dans vos prompts.',
      'Le contournement des protections des outils et les instructions dangereuses sont interdits.',
      'Signalez ce qui pose problème : la modération examine chaque signalement en visant un délai de 72 heures.',
    ],
  },
};

/** Pages des informations légales (LEG-01) : les trois documents versionnés, les cookies et les mentions légales. */
export type ClePageLegale = CleDocument | 'cookies' | 'mentions';

export interface PageLegale {
  titre: string;
  /** Libellé de l'onglet, dans la bande des documents. */
  onglet: string;
  route: string;
  /** Points de « L'essentiel », reliés aux articles de la page. */
  points?: string[];
  /** Document versionné en base, dont l'API donne la version en vigueur. */
  type?: TypeDocumentLegal;
  /** Page sans version en base : date de la dernière mise à jour de son texte (AAAA-MM-JJ). */
  miseAJour?: string;
  /** Complément de « Les nouvelles versions … sont à accepter » (« des conditions générales d'utilisation »). */
  des?: string;
  /** Lien vers le document depuis la section « Acceptation » d'une autre page. */
  lire?: string;
}

/** Ordre des onglets (prototype/documents-legaux.js, ORDRE). */
export const ORDRE_PAGES_LEGALES: ClePageLegale[] = [
  'cgu',
  'confidentialite',
  'cookies',
  'charte',
  'mentions',
];

export const PAGES_LEGALES: Record<ClePageLegale, PageLegale> = {
  cgu: {
    ...RESUMES_DOCUMENTS.cgu,
    route: ROUTES.cgu,
    des: 'des conditions générales d’utilisation',
    lire: 'Lire les conditions générales d’utilisation',
  },
  confidentialite: {
    ...RESUMES_DOCUMENTS.confidentialite,
    route: ROUTES.confidentialite,
    des: 'de la politique de confidentialité',
    lire: 'Lire la politique de confidentialité',
  },
  cookies: {
    titre: 'Politique relative aux cookies',
    onglet: 'Cookies',
    route: ROUTES.cookies,
    miseAJour: '2026-10-19',
    points: [
      'Seuls des cookies strictement nécessaires sont déposés : ils ne demandent pas votre accord.',
      'La fréquentation est mesurée sans cookie, et vous pouvez refuser d’y être compté.',
      'Vysora ne dépose aucun cookie publicitaire et n’intègre aucun outil de mesure d’un tiers.',
    ],
  },
  charte: {
    ...RESUMES_DOCUMENTS.charte,
    route: ROUTES.charte,
    des: 'de la charte communautaire',
    lire: 'Lire la charte communautaire',
  },
  mentions: {
    titre: 'Mentions légales',
    onglet: 'Mentions légales',
    route: ROUTES.mentionsLegales,
    miseAJour: '2026-10-19',
  },
};
