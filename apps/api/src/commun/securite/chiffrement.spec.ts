import { randomBytes } from 'node:crypto';
import { chiffrer, dechiffrer } from './chiffrement.js';

describe('Chiffrement des données stockées (AES-256-GCM)', () => {
  const cle = randomBytes(32).toString('base64url');

  it('retrouve le texte d’origine, accents et liens compris', () => {
    const texte = 'Confirmez votre adresse : https://vysora.example/inscription?verifier=abc';
    expect(dechiffrer(cle, chiffrer(cle, texte))).toBe(texte);
  });

  it('ne laisse rien lire du texte et change à chaque chiffrement', () => {
    const premier = chiffrer(cle, 'awa.sarr@example.com');
    expect(premier).not.toContain('awa');
    expect(chiffrer(cle, 'awa.sarr@example.com')).not.toBe(premier);
  });

  it('refuse une valeur modifiée ou chiffrée avec une autre clé', () => {
    const valeur = chiffrer(cle, 'lien à usage unique');
    const octets = Buffer.from(valeur, 'base64url');
    octets[octets.length - 1] = (octets[octets.length - 1] ?? 0) ^ 1;
    expect(() => dechiffrer(cle, octets.toString('base64url'))).toThrow();
    expect(() => dechiffrer(randomBytes(32).toString('base64url'), valeur)).toThrow();
  });
});
