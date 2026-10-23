import { describe, expect, it } from 'vitest';
import { dateLongue, esc, fmt, t, typo } from './texte';

describe('typo (règles de prototype/commun.js)', () => {
  it('place une espace insécable avant les deux-points et dans les guillemets', () => {
    expect(typo('Référence : « VYS »')).toBe('Référence : « VYS »');
  });

  it('place une espace fine insécable avant la ponctuation haute', () => {
    expect(typo('Prêt ? Oui ! Bien ;')).toBe('Prêt ? Oui ! Bien ;');
  });

  it('lie les nombres à leur unité et sépare les milliers', () => {
    expect(typo('1 318 commandes en 15 min')).toBe('1 318 commandes en 15 min');
  });
});

describe('esc et t', () => {
  it('échappe le HTML avant insertion', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    expect(t('a < b : vrai')).toBe('a &lt; b : vrai');
  });
});

describe('fmt', () => {
  it('formate les nombres à la française', () => {
    expect(fmt(4012).replace(/\s/g, ' ')).toBe('4 012');
  });
});

describe('dateLongue', () => {
  it('écrit la date en toutes lettres, avec « 1er » pour le premier du mois', () => {
    expect(dateLongue('2026-10-15')).toBe('15 octobre 2026');
    expect(dateLongue('2026-09-01')).toBe('1er septembre 2026');
    expect(dateLongue('2026-11-02T23:30:00.000Z')).toBe('2 novembre 2026');
  });
});
