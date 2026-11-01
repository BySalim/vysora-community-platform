import { describe, expect, it } from 'vitest';
import { adresseContenuGuide, etatContenuGuide, numeroDeContenu } from './guides-admin';

describe('Administration des guides (DEC-02)', () => {
  it('lit le numéro d’un contenu dans son adresse ou tel quel', () => {
    expect(numeroDeContenu('https://vysora.app/creations/12-cite-imaginaire')).toBe(12);
    expect(numeroDeContenu('/forum/4-comment-eviter-les-doublons?onglet=reponses')).toBe(4);
    expect(numeroDeContenu('localhost:4321/bon-reflexe/7-le-creneau')).toBe(7);
    expect(numeroDeContenu(' 388 ')).toBe(388);
    expect(numeroDeContenu('n° 42')).toBe(42);
    expect(numeroDeContenu('/membres/12-awa')).toBeNull();
    expect(numeroDeContenu('/creations/nouvelle')).toBeNull();
    expect(numeroDeContenu('douze')).toBeNull();
    expect(numeroDeContenu('0')).toBeNull();
  });

  it('mène à la page publique de chaque contenu', () => {
    expect(adresseContenuGuide({ id: 3, type: 'CREATION', slug: 'cite' })).toBe(
      '/creations/3-cite',
    );
    expect(adresseContenuGuide({ id: 4, type: 'SUJET', slug: 'question' })).toBe(
      '/forum/4-question',
    );
    expect(adresseContenuGuide({ id: 5, type: 'CAS_BON_REFLEXE', slug: 'creneau' })).toBe(
      '/bon-reflexe/5-creneau',
    );
  });

  it('dit pourquoi Explorer ne présente pas un contenu', () => {
    expect(etatContenuGuide({ type: 'CREATION', etat: null })).toBeNull();
    expect(etatContenuGuide({ type: 'CREATION', etat: 'NON_PUBLIE' })).toBe('Repassé en brouillon');
    expect(etatContenuGuide({ type: 'CAS_BON_REFLEXE', etat: 'NON_PUBLIE' })).toBe(
      'En cours de réexamen',
    );
    expect(etatContenuGuide({ type: 'SUJET', etat: 'MASQUE' })).toBe('Masqué par la modération');
  });
});
