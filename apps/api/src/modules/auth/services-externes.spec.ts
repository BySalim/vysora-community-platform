import { adresseIssue, requeteArrivee } from './services-externes.service.js';

describe('adresses de retour de GitHub et Google (S-10)', () => {
  it('ne garde qu’une page du site comme retour, avec son motif', () => {
    expect(requeteArrivee('/forum?type=question', 'poser   une\nquestion')).toBe(
      'retour=%2Fforum%3Ftype%3Dquestion&pour=poser+une+question',
    );
    for (const ailleurs of [
      'https://ailleurs.example',
      '//ailleurs.example',
      '/\\ailleurs.example',
      'javascript:alert(1)',
      '/connexion',
      '/api/v1/session',
      ['/forum'],
      undefined,
    ])
      expect(requeteArrivee(ailleurs, 'enregistrer')).toBeUndefined();
  });

  it('renvoie toujours vers la page de l’intention, sur le site', () => {
    expect(adresseIssue('connexion', 'github', { resultat: 'inconnu' })).toBe(
      '/connexion?service=github&resultat=inconnu',
    );
    expect(adresseIssue('inscription', 'google', { etape: 'pseudo' }, 'retour=%2Fforum')).toBe(
      '/inscription?service=google&etape=pseudo&retour=%2Fforum',
    );
    expect(adresseIssue('liaison', 'github', { resultat: 'lie' })).toBe(
      '/parametres?service=github&resultat=lie',
    );
    expect(
      adresseIssue('connexion', 'google', {
        etape: 'connecte',
        suppression: new Date('2026-10-12T08:30:00Z'),
      }),
    ).toBe('/connexion?service=google&etape=connecte&suppression=2026-10-12');
  });
});
