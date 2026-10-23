import { describe, expect, it } from 'vitest';
import { cheminInterne, contexteArrivee } from './retour';

describe('cheminInterne', () => {
  it('accepte un chemin du site, avec sa requête et son ancre', () => {
    expect(cheminInterne('/forum?type=question#reponses')).toBe('/forum?type=question#reponses');
  });

  it('refuse tout ce qui mènerait vers un autre site', () => {
    for (const brut of [
      'https://site-malveillant.example',
      '//site-malveillant.example/x',
      '/\\site-malveillant.example',
      'javascript:alert(1)',
      'forum',
      '',
      null,
    ])
      expect(cheminInterne(brut)).toBeNull();
  });

  it('refuse un retour vers la connexion, l’inscription ou l’API', () => {
    expect(cheminInterne('/connexion?retour=/forum')).toBeNull();
    expect(cheminInterne('/inscription')).toBeNull();
    expect(cheminInterne('/api/v1/session')).toBeNull();
  });
});

describe('contexteArrivee', () => {
  it('reprend la page d’origine et l’action demandée', () => {
    const contexte = contexteArrivee(
      new URLSearchParams({ retour: '/creations/12-portrait', pour: 'enregistrer cette création' }),
    );
    expect(contexte).toEqual({
      actif: true,
      pour: 'enregistrer cette création',
      icone: 'bookmark',
      destination: '/creations/12-portrait',
      libelleRetour: 'Retour à la création',
      requete: 'retour=%2Fcreations%2F12-portrait&pour=enregistrer%20cette%20cr%C3%A9ation',
    });
  });

  it('revient à l’accueil sans page d’origine valable', () => {
    const contexte = contexteArrivee(new URLSearchParams({ retour: 'https://ailleurs.example' }));
    expect(contexte).toMatchObject({
      actif: false,
      destination: '/',
      libelleRetour: 'Retour à l’accueil',
      requete: '',
    });
  });

  it('nomme le retour vers une page sans libellé propre', () => {
    expect(contexteArrivee(new URLSearchParams({ retour: '/contact' })).libelleRetour).toBe(
      'Retour à la page précédente',
    );
  });
});
