import { describe, expect, it } from 'vitest';
import { esc, fmt, t, typo } from './texte';

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
