import { versionsAAnnoncer } from './annonce-documents.service.js';
import { dateLongue, emailNouvellesVersions, type VersionAnnoncee } from './courriels.js';
import type { DocumentLegal } from './documents-legaux.service.js';

const version = (valeurs: Partial<DocumentLegal> & Pick<DocumentLegal, 'type' | 'dateEffet'>) =>
  ({
    id: 1,
    version: valeurs.dateEffet,
    url: '/charte-communautaire',
    acceptationRequise: true,
    resumeChangements: null,
    texte: null,
    dateAnnonce: null,
    ...valeurs,
  }) satisfies DocumentLegal;

describe('Annonce des nouvelles versions des documents légaux (RG-90, WF-03)', () => {
  it('annonce la plus récente version de chaque document, jamais la première', () => {
    const premiere = version({ id: 1, type: 'CGU', dateEffet: '2026-09-01' });
    const intermediaire = version({ id: 2, type: 'CHARTE', dateEffet: '2026-10-01' });
    const derniere = version({ id: 3, type: 'CHARTE', dateEffet: '2026-10-26' });
    const toutes = [premiere, version({ id: 4, type: 'CHARTE', dateEffet: '2026-06-01' })];
    toutes.push(intermediaire, derniere);

    expect(versionsAAnnoncer([premiere, intermediaire, derniere], toutes)).toEqual([derniere]);
  });

  it('écrit les dates à la française', () => {
    expect(dateLongue('2026-10-15')).toBe('15 octobre 2026');
    expect(dateLongue('2026-11-01')).toBe('1er novembre 2026');
  });

  const charte: VersionAnnoncee = {
    type: 'CHARTE',
    dateEffet: '2026-10-26',
    url: '/charte-communautaire',
    acceptationRequise: true,
    resumeChangements: 'Un prompt qui contient une clé d’API est masqué jusqu’à sa correction.',
  };
  const confidentialite: VersionAnnoncee = {
    type: 'CONFIDENTIALITE',
    dateEffet: '2026-10-26',
    url: '/confidentialite',
    acceptationRequise: false,
    resumeChangements: null,
  };

  it('présente une version seule, ses changements, le lien et l’acceptation demandée', () => {
    const email = emailNouvellesVersions(
      'awa.sarr@example.com',
      [charte],
      'https://vysora.example',
    );
    expect(email).toMatchObject({
      a: 'awa.sarr@example.com',
      sujet: 'Nouvelle version de la charte communautaire',
    });
    expect(email.texte).toContain('s’applique à compter du 26 octobre 2026.');
    expect(email.texte).toContain(`Ce qui change : ${charte.resumeChangements}`);
    expect(email.texte).toContain(
      'Lire la nouvelle version : https://vysora.example/charte-communautaire',
    );
    expect(email.texte).toContain('Acceptez-la lors de votre prochaine visite');
    expect(email.html).toContain('href="https://vysora.example/charte-communautaire"');
  });

  it('regroupe plusieurs versions en un e-mail et ne demande d’accepter que ce qui s’accepte', () => {
    const email = emailNouvellesVersions(
      'awa.sarr@example.com',
      [charte, confidentialite],
      'https://vysora.example',
    );
    expect(email.sujet).toBe('Nouvelles versions des documents de Vysora');
    expect(email.texte).toContain(
      'de nouvelles versions de la charte communautaire et de la politique de confidentialité de Vysora s’appliquent.',
    );
    expect(email.texte).toContain(
      'Acceptez la charte communautaire lors de votre prochaine visite',
    );
    expect(email.texte).toContain('Politique de confidentialité : À compter du 26 octobre 2026.');
    expect(email.texte).toContain(
      'Lire la politique de confidentialité : https://vysora.example/confidentialite',
    );
    expect(
      emailNouvellesVersions('awa.sarr@example.com', [confidentialite], 'https://vysora.example')
        .texte,
    ).toContain('Aucune action n’est nécessaire de votre part.');
  });
});
