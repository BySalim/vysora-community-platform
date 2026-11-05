import { describe, expect, it } from 'vitest';
import { cheminInterne, motifArrivee } from './adresses';
import {
  estResultatService,
  estServiceExterne,
  fournisseurDe,
  serviceDe,
} from './services-externes';

describe('services externes (F-02, S-10)', () => {
  it('reconnaît GitHub et Google, et passe des adresses à l’énumération du MCD', () => {
    expect(estServiceExterne('github')).toBe(true);
    expect(estServiceExterne('google')).toBe(true);
    expect(estServiceExterne('GitHub')).toBe(false);
    expect(estServiceExterne('facebook')).toBe(false);
    expect(estServiceExterne(undefined)).toBe(false);
    expect(fournisseurDe('github')).toBe('GITHUB');
    expect(serviceDe('GOOGLE')).toBe('google');
  });

  it('ne reconnaît que les issues prévues', () => {
    expect(estResultatService('email-pris')).toBe(true);
    expect(estResultatService('connecte')).toBe(false);
  });
});

describe('adresses internes', () => {
  it('accepte une page du site et refuse tout le reste', () => {
    expect(cheminInterne('/forum?type=question#reponses')).toBe('/forum?type=question#reponses');
    for (const ailleurs of ['https://a.example', '//a.example', '/\\a.example', 'forum', '/api/v1'])
      expect(cheminInterne(ailleurs)).toBeNull();
  });

  it('réduit le motif d’arrivée à une ligne courte', () => {
    expect(motifArrivee('  poser\n une   question ')).toBe('poser une question');
    expect(motifArrivee('x'.repeat(200))).toHaveLength(90);
    expect(motifArrivee(null)).toBe('');
  });
});
