import { describe, expect, it } from 'vitest';
import { erreursParChamp } from './commun';
import {
  schemaAjoutEquipe,
  schemaCategorie,
  schemaLicence,
  schemaModificationLicence,
  schemaVersionDocumentLegal,
} from './administration';

const erreurs = (resultat: { success: boolean; error?: unknown }) =>
  resultat.success ? {} : erreursParChamp(resultat.error as never);

describe('Référentiels de l’administration (ADM-02, F-95)', () => {
  it('exige une icône du sprite et une présentation pour une catégorie', () => {
    expect(
      schemaCategorie.safeParse({
        libelle: 'Jeux vidéo',
        icone: 'monitor',
        description: 'Concevoir un jeu jouable avec l’IA.',
      }).success,
    ).toBe(true);
    expect(
      erreurs(schemaCategorie.safeParse({ libelle: 'J', icone: 'fusee', description: 'Court' })),
    ).toEqual({
      libelle: 'Le libellé compte au moins 2 caractères.',
      icone: 'Choisissez une icône.',
      description: 'La présentation compte au moins 20 caractères.',
    });
  });

  it('demande chaque champ laissé vide', () => {
    expect(
      erreurs(
        schemaLicence.safeParse({
          code: '',
          libelle: '',
          resume: '',
          url: '',
          autoriseVariantes: true,
        }),
      ),
    ).toEqual({
      code: 'Indiquez le code de la licence.',
      libelle: 'Indiquez le libellé de la licence.',
      resume: 'Résumez ce que la licence permet.',
      url: 'Indiquez l’adresse du texte de la licence.',
    });
  });

  it('accepte une adresse https ou une page du site pour le texte d’une licence', () => {
    const licence = { libelle: 'CC BY-ND 4.0', resume: 'Réutilisation sans modification' };
    expect(schemaModificationLicence.safeParse({ ...licence, url: '/cgu#licences' }).success).toBe(
      true,
    );
    expect(
      schemaModificationLicence.safeParse({
        ...licence,
        url: 'https://creativecommons.org/licenses/by-nd/4.0/',
      }).success,
    ).toBe(true);
    expect(
      erreurs(schemaModificationLicence.safeParse({ ...licence, url: 'http://exemple.fr' })),
    ).toEqual({ url: 'Utilisez une adresse sécurisée, en https.' });
    for (const url of ['//exemple.fr', 'javascript:alert(1)', 'exemple'])
      expect(schemaModificationLicence.safeParse({ ...licence, url }).success).toBe(false);
  });

  it('met le code d’une licence en capitales et refuse les caractères inattendus', () => {
    const saisie = {
      libelle: 'CC BY-ND 4.0',
      resume: 'Réutilisation sans modification',
      url: '/cgu#licences',
      autoriseVariantes: false,
    };
    expect(schemaLicence.parse({ ...saisie, code: 'cc-by-nd-4.0' }).code).toBe('CC-BY-ND-4.0');
    expect(schemaLicence.safeParse({ ...saisie, code: 'CC BY' }).success).toBe(false);
  });
});

describe('Versions des documents légaux (ADM-02, EC-25, RG-112)', () => {
  it('exige un résumé des changements pour un document qui s’accepte', () => {
    expect(
      erreurs(schemaVersionDocumentLegal.safeParse({ type: 'CGU', dateEffet: '2026-12-01' })),
    ).toEqual({
      resumeChangements:
        'Résumez ce qui change : les membres le lisent avant d’accepter la nouvelle version.',
    });
    expect(
      schemaVersionDocumentLegal.parse({
        type: 'CONFIDENTIALITE',
        dateEffet: '2026-12-01',
        resumeChangements: '',
      }),
    ).toEqual({ type: 'CONFIDENTIALITE', dateEffet: '2026-12-01', resumeChangements: null });
  });
});

describe('Comptes de l’équipe (ADM-03)', () => {
  it('demande une adresse, un nom et un rôle de l’équipe', () => {
    const ajout = schemaAjoutEquipe.safeParse({
      email: ' kine.lame@exemple.sn ',
      nom: '  Kiné   Lame ',
      role: 'ADMINISTRATEUR',
    });
    expect(ajout.success && ajout.data).toEqual({
      email: 'kine.lame@exemple.sn',
      nom: 'Kiné Lame',
      role: 'ADMINISTRATEUR',
    });
    expect(
      erreurs(schemaAjoutEquipe.safeParse({ email: 'kine', nom: ' ', role: 'MEMBRE' })),
    ).toEqual({
      email: 'Cette adresse e-mail est incomplète. Vérifiez-la.',
      nom: 'Indiquez le nom de la personne.',
      role: 'Choisissez un rôle.',
    });
    expect(erreurs(schemaAjoutEquipe.safeParse({}))).toEqual({
      email: 'Indiquez l’adresse e-mail de la personne.',
      nom: 'Indiquez le nom de la personne.',
      role: 'Choisissez un rôle.',
    });
  });
});
