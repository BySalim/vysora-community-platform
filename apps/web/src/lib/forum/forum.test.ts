import { describe, expect, it } from 'vitest';
import { attente, ilYA } from './dates';
import { ecrireAdresse, filtresActifs, lireAdresse, requeteApi, sansFiltre } from './donnees';
import { nomComplet, premierePhrase, texteSimple, titreListe } from './liste';

const adresse = (requete: string) => lireAdresse(new URLSearchParams(requete));

describe('adresse de la liste du forum', () => {
  it('relit et réécrit chaque filtre, sans les valeurs par défaut', () => {
    const etat = adresse(
      'onglet=actives&q=logo&etiquette=code&type=astuce&type=question&sansReponse=1&mesOutils=claude,cursor&tri=utiles&page=2',
    );
    expect(etat).toMatchObject({
      onglet: 'actives',
      q: 'logo',
      etiquette: 'code',
      page: 2,
      filtres: {
        types: ['ASTUCE', 'QUESTION'],
        sansReponse: true,
        mesOutils: ['claude', 'cursor'],
        tri: 'utiles',
      },
    });
    expect(lireAdresse(new URL(`http://x${ecrireAdresse(etat)}`).searchParams)).toEqual(etat);
    expect(ecrireAdresse(adresse(''))).toBe('/forum');
  });

  it('écarte les valeurs inconnues ou dangereuses', () => {
    const etat = adresse('onglet=pirate&type=inconnu&outil=../../x&membre=<b>&page=-3&tri=x');
    expect(etat).toMatchObject({ onglet: 'recentes', outil: '', membre: '', page: 1 });
    expect(etat.filtres).toMatchObject({ types: [], tri: '' });
  });

  it('traduit l’onglet, le tri et la recherche en paramètres de l’API', () => {
    expect(requeteApi(adresse('onglet=sans-reponse')).toString()).toBe(
      'enAttente=true&tri=anciens',
    );
    expect(requeteApi(adresse('onglet=utiles&tri=reproduites')).get('tri')).toBe('reproduits');
    const recherche = requeteApi(adresse('q=[Génération image] visages&type=clinique'));
    expect(recherche.get('q')).toBe('visages');
    expect(recherche.get('etiquette')).toBe('generation-image');
    expect(recherche.getAll('type')).toEqual(['CLINIQUE']);
    // Un outil choisi l'emporte sur « Sur mes outils ».
    expect(requeteApi(adresse('outil=suno&mesOutils=claude,cursor')).getAll('outil')).toEqual([
      'suno',
    ]);
  });

  it('nomme les filtres actifs et sait en retirer un', () => {
    const etat = adresse('etiquette=code&type=astuce&avecPrompt=1&page=3');
    expect(filtresActifs(etat, {}).map((f) => f.libelle)).toEqual([
      '[code]',
      'Avec un prompt corrigé',
      'Astuces',
    ]);
    expect(ecrireAdresse(sansFiltre(etat, 'type:astuce'))).toBe(
      '/forum?etiquette=code&avecPrompt=1',
    );
  });

  it('titre la liste comme le prototype', () => {
    expect(titreListe(adresse(''), {})).toBe('Tous les sujets');
    expect(titreListe(adresse('onglet=sans-reponse'), {})).toBe('Sujets sans réponse');
    expect(titreListe(adresse('outil=suno'), { outil: 'Suno' })).toBe('Sujets sur Suno');
    expect(titreListe(adresse('type=clinique'), {})).toBe('Cliniques du prompt');
  });
});

describe('présentation des sujets', () => {
  const maintenant = new Date('2026-10-13T16:20:00Z');

  it('date une action comme le prototype', () => {
    expect(ilYA('2026-10-13T16:19:50Z', maintenant)).toBe('à l’instant');
    expect(ilYA('2026-10-13T15:35:00Z', maintenant)).toBe('il y a 45 min');
    expect(ilYA('2026-10-13T09:00:00Z', maintenant)).toBe('il y a 7 h');
    expect(ilYA('2026-10-12T23:00:00Z', maintenant)).toBe('hier');
    expect(ilYA('2026-10-09T10:00:00Z', maintenant)).toBe('il y a 4 jours');
    expect(ilYA('2026-09-28T10:00:00Z', maintenant)).toBe('le 28 sept.');
    expect(attente('2026-10-11T16:20:00Z', maintenant)).toBe('2 jours');
  });

  it('résume un texte en Markdown à sa première phrase', () => {
    expect(texteSimple('**Gras** et `code`, [lien](https://x.example) !')).toBe(
      'Gras et code, lien !',
    );
    expect(premierePhrase('Mon logo est flou. J’ai tout essayé.')).toBe('Mon logo est flou.');
    expect(premierePhrase('Sans point final')).toBe('Sans point final');
  });

  it('nomme l’outil et le modèle comme le prototype', () => {
    expect(nomComplet('Claude', 'Sonnet 4.5')).toBe('Claude Sonnet 4.5');
    expect(nomComplet('ChatGPT', 'GPT-5')).toBe('GPT-5');
    expect(nomComplet('Cursor', null)).toBe('Cursor');
  });
});
