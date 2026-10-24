import { describe, expect, it } from 'vitest';
import { srcsetImage } from '../contrats/medias';
import { erreursParChamp } from './commun';
import { schemaDescriptionImage } from './medias';

describe('schemaDescriptionImage (F-15)', () => {
  it('accepte une image pas encore décrite (brouillon)', () => {
    expect(schemaDescriptionImage.parse({})).toEqual({});
  });

  it('nettoie le texte alternatif et ramène une légende vide à null', () => {
    expect(
      schemaDescriptionImage.parse({ texteAlternatif: '  Maisons de Gorée  ', legende: ' ' }),
    ).toEqual({ texteAlternatif: 'Maisons de Gorée', legende: null });
  });

  it('borne la description (250) et la légende (300) avec les messages du formulaire', () => {
    const resultat = schemaDescriptionImage.safeParse({
      texteAlternatif: 'a'.repeat(251),
      legende: 'b'.repeat(301),
    });
    expect(resultat.success).toBe(false);
    if (resultat.success) return;
    expect(erreursParChamp(resultat.error)).toEqual({
      texteAlternatif: 'La description compte 250 caractères au plus.',
      legende: 'La légende compte 300 caractères au plus.',
    });
  });
});

describe('srcsetImage', () => {
  it('liste chaque déclinaison avec sa largeur réelle', () => {
    expect(
      srcsetImage({
        declinaisons: [
          { largeur: 720, url: '/a-720.webp' },
          { largeur: 1000, url: '/a-1000.webp' },
        ],
      }),
    ).toBe('/a-720.webp 720w, /a-1000.webp 1000w');
  });
});
