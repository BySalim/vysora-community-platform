import { describe, expect, it } from 'vitest';
import { erreurLien, normaliserLien, schemaProfilPublic } from './profil';

describe('Profil public (PROF-01, F-05)', () => {
  it('complète une adresse saisie sans protocole', () => {
    expect(normaliserLien(' clarisse.sn ')).toBe('https://clarisse.sn');
    expect(normaliserLien('https://clarisse.sn/portfolio')).toBe('https://clarisse.sn/portfolio');
    expect(normaliserLien('')).toBe('');
  });

  it('refuse un lien incomplet ou non sécurisé, avec les messages du prototype', () => {
    expect(erreurLien('clarisse')).toBe(
      'Cette adresse est incomplète. Exemple : https://monsite.fr',
    );
    expect(erreurLien('http://clarisse.sn')).toBe('Utilisez une adresse sécurisée, en https.');
    expect(erreurLien('javascript:alert(1)')).not.toBeNull();
    expect(erreurLien('ftp://clarisse.sn')).toBe('Utilisez une adresse sécurisée, en https.');
    expect(erreurLien('')).toBeNull();
  });

  it('nettoie la biographie et retire ce qui est vide', () => {
    const saisie = schemaProfilPublic.parse({
      biographie: '  Je publie\u200b mes outils.\r\n\r\n\r\nErreurs comprises.  ',
      lien: '',
    });
    expect(saisie).toEqual({
      biographie: 'Je publie mes outils.\n\nErreurs comprises.',
      lien: null,
    });
    expect(schemaProfilPublic.safeParse({ biographie: 'x'.repeat(501) }).success).toBe(false);
    expect(schemaProfilPublic.parse({})).toEqual({});
  });
});
