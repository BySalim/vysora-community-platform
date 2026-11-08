import { destinataireAccepte, domaineAdresse, domaineReserve } from './domaines-reserves.js';

describe('domaines réservés (DEMO-04)', () => {
  it('lit le domaine d’une adresse, nue ou avec un nom', () => {
    expect(domaineAdresse('clarisse-mendy@example.test')).toBe('example.test');
    expect(domaineAdresse('Awa Sarr <Awa.Sarr@Example.TEST>')).toBe('example.test');
    expect(domaineAdresse('kofi@exemple.sn.')).toBe('exemple.sn');
    expect(domaineAdresse('sans-arobase')).toBeNull();
    expect(domaineAdresse('vide@')).toBeNull();
  });

  it('reconnaît les domaines de premier niveau réservés et leurs sous-domaines', () => {
    for (const adresse of [
      'clarisse-mendy@example.test',
      'moderation-demo@EXAMPLE.TEST',
      'a@vysora.example',
      'a@nulle.part.invalid',
      'a@localhost',
      'a@site.localhost',
      'a@test',
    ])
      expect(domaineReserve(adresse), adresse).toBe(true);
  });

  it('reconnaît example.com, example.net, example.org et leurs sous-domaines', () => {
    for (const adresse of [
      'awa.sarr@example.com',
      'a@example.net',
      'a@docs.example.org',
      'Équipe <equipe@Example.Com>',
    ])
      expect(domaineReserve(adresse), adresse).toBe(true);
  });

  it('laisse passer les autres domaines, même proches', () => {
    for (const adresse of [
      'fatou.ndiaye@exemple.sn',
      'a@notexample.com',
      'a@example.com.sn',
      'a@example.co',
      'a@site.testing',
      'a@test.sn',
      'a@vysora.local',
      'sans-arobase',
    ])
      expect(domaineReserve(adresse), adresse).toBe(false);
  });

  it('ne filtre qu’en production', () => {
    expect(destinataireAccepte('production', 'clarisse-mendy@example.test')).toBe(false);
    expect(destinataireAccepte('production', 'a@example.org')).toBe(false);
    expect(destinataireAccepte('production', 'fatou.ndiaye@exemple.sn')).toBe(true);
    expect(destinataireAccepte('development', 'clarisse-mendy@example.test')).toBe(true);
    expect(destinataireAccepte('test', 'clarisse-mendy@example.test')).toBe(true);
  });
});
