import { describe, expect, it } from 'vitest';
import { estPseudoReserve, tirerPseudo, variantesPseudo } from './pseudos';
import { MOTIF_PSEUDO } from './schemas/commun';

describe('pseudos (RG-01)', () => {
  it('réserve les noms de rôle, de la marque et des comptes supprimés, sans distinction de casse', () => {
    expect(estPseudoReserve('Admin')).toBe(true);
    expect(estPseudoReserve('VYSORA')).toBe(true);
    expect(estPseudoReserve('membre-supprime-4f2a')).toBe(true);
    expect(estPseudoReserve('awa-sarr')).toBe(false);
  });

  it('tire un pseudo conforme au format', () => {
    for (let i = 0; i < 50; i += 1) {
      const pseudo = tirerPseudo();
      expect(pseudo).toMatch(MOTIF_PSEUDO);
      expect(pseudo.length).toBeLessThanOrEqual(30);
      expect(pseudo).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    }
    expect(tirerPseudo(() => 0)).toBe('baobab-indigo-10');
  });

  it('propose des variantes valides et non réservées', () => {
    expect(variantesPseudo('Awa Sarr', 2026)).toEqual(['awasarr-ia', 'awasarr_cree', 'awasarr-26']);
    expect(variantesPseudo('lea-martin', 2026)).toEqual([
      'lea-martin-ia',
      'lea_martin',
      'lea-martin-26',
    ]);
    for (const variante of variantesPseudo('x'.repeat(40))) {
      expect(variante.length).toBeLessThanOrEqual(30);
      expect(variante).toMatch(MOTIF_PSEUDO);
    }
  });
});
