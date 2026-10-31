import { describe, expect, it } from 'vitest';
import { OBJECTIFS_BADGES, prochainsBadges } from './regles';

const badge = (code: keyof typeof OBJECTIFS_BADGES, valeur: number) => ({
  code,
  valeur,
  objectif: OBJECTIFS_BADGES[code].objectif,
});

describe('prochainsBadges (PROF-02, RG-86)', () => {
  it('garde les trois badges les plus avancés, comme le profil du prototype', () => {
    // Clarisse au niveau Apprenti (prototype : profil-data.js).
    const restants = [
      badge('REPRODUCTIBLE', 3),
      badge('ASTUCIEUX', 0),
      badge('MENTOR', 2),
      badge('VIGILANT', 0),
      badge('PARTICIPANT', 0),
      badge('PODIUM', 0),
    ];
    expect(prochainsBadges(restants).map((b) => b.code)).toEqual([
      'REPRODUCTIBLE',
      'MENTOR',
      'PARTICIPANT',
    ]);
  });

  it('départage par ce qu’il reste à faire, puis garde l’ordre reçu', () => {
    const restants = [
      badge('ASSIDU', 0),
      badge('VIGILANT', 0),
      badge('PREMIER_ESSAI', 0),
      badge('PARTICIPANT', 0),
    ];
    expect(prochainsBadges(restants, 4).map((b) => b.code)).toEqual([
      'PREMIER_ESSAI',
      'PARTICIPANT',
      'VIGILANT',
      'ASSIDU',
    ]);
  });

  it('place en tête un objectif déjà atteint et ne modifie pas la liste reçue', () => {
    const restants = [badge('ASSIDU', 31), badge('PREMIERE_CREATION', 2)];
    expect(prochainsBadges(restants).map((b) => b.code)).toEqual(['PREMIERE_CREATION', 'ASSIDU']);
    expect(restants.map((b) => b.code)).toEqual(['ASSIDU', 'PREMIERE_CREATION']);
  });
});
