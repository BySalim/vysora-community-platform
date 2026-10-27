import type { TypeDocumentLegal } from '@vysora/shared';
import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';
import type { DocumentLegal } from './documents-legaux.service.js';

/* E-mails transactionnels des comptes (RG-90 : toujours envoyés, quelles que soient les préférences).
   Les liens mènent aux écrans du prototype : /inscription?verifier=… et /connexion?jeton=… */

export function emailVerification(a: string, lien: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Confirmez votre adresse e-mail',
    ...miseEnForme({
      titre: 'Confirmez votre adresse e-mail',
      paragraphes: [
        'Bonjour, confirmez votre adresse pour publier, voter et répondre sur Vysora. Ce lien reste valable 24 heures.',
        'Si vous n’avez pas créé de compte sur Vysora, ignorez cet e-mail : aucun compte ne sera activé.',
      ],
      action: { libelle: 'Confirmer mon adresse', url: lien },
    }),
  };
}

export function emailReinitialisation(a: string, lien: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Choisissez un nouveau mot de passe',
    ...miseEnForme({
      titre: 'Choisissez un nouveau mot de passe',
      paragraphes: [
        'Bonjour, vous avez demandé à changer le mot de passe de votre compte Vysora. Ce lien reste valable une heure.',
        'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.',
      ],
      action: { libelle: 'Choisir un nouveau mot de passe', url: lien },
    }),
  };
}

/** F-06, WF-02 : lien envoyé à la nouvelle adresse ; elle ne remplace l'actuelle qu'une fois confirmée. */
export function emailConfirmationChangement(a: string, lien: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Confirmez votre nouvelle adresse e-mail',
    ...miseEnForme({
      titre: 'Confirmez votre nouvelle adresse e-mail',
      paragraphes: [
        'Bonjour, confirmez cette adresse pour qu’elle devienne celle de votre compte Vysora. Ce lien reste valable 24 heures ; d’ici là, votre adresse actuelle reste active.',
        'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : l’adresse du compte ne changera pas.',
      ],
      action: { libelle: 'Confirmer cette adresse', url: lien },
    }),
  };
}

/** F-06 : alerte envoyée à l'adresse actuelle quand un changement est demandé. */
export function emailAlerteChangement(a: string, nouvelle: string, siteUrl: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Changement d’adresse e-mail demandé',
    ...miseEnForme({
      titre: 'Changement d’adresse e-mail demandé',
      paragraphes: [
        `Bonjour, une demande vient d’être faite pour que ${nouvelle} devienne l’adresse de votre compte Vysora. Votre adresse actuelle reste celle du compte tant que la nouvelle n’est pas confirmée.`,
        'Si vous n’êtes pas à l’origine de cette demande, annulez-la depuis vos paramètres et changez votre mot de passe : quelqu’un d’autre le connaît peut-être.',
      ],
      action: {
        libelle: 'Ouvrir mes paramètres',
        url: new URL('/parametres#compte', siteUrl).href,
      },
    }),
  };
}

/** Nom de chaque document, seul et dans une phrase (« la charte », « de la charte »). */
const NOMS_DOCUMENTS: Record<TypeDocumentLegal, { titre: string; le: string; de: string }> = {
  CGU: {
    titre: 'Conditions générales d’utilisation',
    le: 'les conditions générales d’utilisation',
    de: 'des conditions générales d’utilisation',
  },
  CONFIDENTIALITE: {
    titre: 'Politique de confidentialité',
    le: 'la politique de confidentialité',
    de: 'de la politique de confidentialité',
  },
  CHARTE: {
    titre: 'Charte communautaire',
    le: 'la charte communautaire',
    de: 'de la charte communautaire',
  },
};

/** « 15 octobre 2026 », « 1er novembre 2026 » (date d'effet au format AAAA-MM-JJ). */
export function dateLongue(jour: string): string {
  const texte = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${jour}T00:00:00Z`));
  return texte.replace(/^1 /, '1er ');
}

const enumerer = (mots: string[]): string =>
  mots.length < 2 ? (mots[0] ?? '') : `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}`;

export type VersionAnnoncee = Pick<
  DocumentLegal,
  'type' | 'dateEffet' | 'url' | 'acceptationRequise' | 'resumeChangements'
>;

/** RG-90, WF-03 : nouvelles versions de documents légaux entrées en vigueur, en un seul e-mail. */
export function emailNouvellesVersions(
  a: string,
  versions: VersionAnnoncee[],
  siteUrl: string,
): EmailAEnvoyer {
  const lien = (version: VersionAnnoncee) => new URL(version.url, siteUrl).href;
  const aAccepter = versions.filter((version) => version.acceptationRequise);
  const quoi =
    aAccepter.length === versions.length
      ? versions.length > 1
        ? 'Acceptez-les'
        : 'Acceptez-la'
      : `Acceptez ${enumerer(aAccepter.map((version) => NOMS_DOCUMENTS[version.type].le))}`;
  const suite = aAccepter.length
    ? `${quoi} lors de votre prochaine visite pour continuer à publier, voter et répondre : d’ici là, votre compte reste en lecture seule.`
    : 'Aucune action n’est nécessaire de votre part.';

  const [seule] = versions;
  if (versions.length === 1 && seule) {
    const titre = `Nouvelle version ${NOMS_DOCUMENTS[seule.type].de}`;
    return {
      a,
      sujet: titre,
      ...miseEnForme({
        titre,
        paragraphes: [
          `Bonjour, une nouvelle version ${NOMS_DOCUMENTS[seule.type].de} de Vysora s’applique à compter du ${dateLongue(seule.dateEffet)}.`,
          ...(seule.resumeChangements ? [`Ce qui change : ${seule.resumeChangements}`] : []),
          suite,
        ],
        action: { libelle: 'Lire la nouvelle version', url: lien(seule) },
      }),
    };
  }

  const titre = 'Nouvelles versions des documents de Vysora';
  return {
    a,
    sujet: titre,
    ...miseEnForme({
      titre,
      paragraphes: [
        `Bonjour, de nouvelles versions ${enumerer(versions.map((version) => NOMS_DOCUMENTS[version.type].de))} de Vysora s’appliquent.`,
        suite,
      ],
      details: versions.map((version) => [
        NOMS_DOCUMENTS[version.type].titre,
        [`À compter du ${dateLongue(version.dateEffet)}.`, version.resumeChangements]
          .filter(Boolean)
          .join(' '),
      ]),
      liens: versions.map((version) => ({
        libelle: `Lire ${NOMS_DOCUMENTS[version.type].le}`,
        url: lien(version),
      })),
    }),
  };
}
