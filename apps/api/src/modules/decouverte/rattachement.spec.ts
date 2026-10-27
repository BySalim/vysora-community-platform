import { guideLePlusProche, type GuideCandidat } from './rattachement.js';

const GUIDES: GuideCandidat[] = [
  {
    id: 1,
    domaine: 'application-web',
    cles: 'Mettre en place la prise de rendez-vous en ligne Prise de rendez-vous en ligne réservation créneau agenda',
    texte:
      'Application web Refuser un créneau déjà pris Deux personnes réservent le même créneau Formulaire',
  },
  {
    id: 2,
    domaine: 'image-et-illustration',
    cles: 'Créer des illustrations au style cohérent Illustrations au style cohérent illustration personnage',
    texte: 'Image et illustration Fixer le style Le style change d’une image à l’autre Midjourney',
  },
];

describe('Guide qu’une création rejoint à sa publication (DEC-01, prototype : nouvelle-creation.js)', () => {
  it('retient le guide dont le titre ou les mots-clés partagent les mots forts de la création', () => {
    expect(
      guideLePlusProche(
        {
          titre: 'Réservation des terrains de football',
          objectif: 'Que les joueurs choisissent un créneau libre.',
          etiquettes: ['Formulaire'],
          categorie: 'application-web',
        },
        GUIDES,
      ),
    ).toBe(1);
    expect(
      guideLePlusProche(
        {
          titre: 'Série de portraits à la gouache',
          objectif: 'Six illustrations où le personnage reste le même.',
          etiquettes: [],
          categorie: null,
        },
        GUIDES,
      ),
    ).toBe(2);
  });

  it('n’en retient aucun sans mot fort en commun, même dans le même domaine', () => {
    expect(
      guideLePlusProche(
        {
          titre: 'Recette de bissap glacé',
          objectif: 'Une boisson fraîche pour les invités.',
          etiquettes: ['Cuisine'],
          categorie: 'application-web',
        },
        GUIDES,
      ),
    ).toBeNull();
    // Un seul mot trouvé ailleurs que dans le titre ou les mots-clés ne suffit pas (1 < 2).
    expect(
      guideLePlusProche(
        {
          titre: 'Un formulaire simple',
          objectif: 'Tout faire vite.',
          etiquettes: [],
          categorie: null,
        },
        GUIDES,
      ),
    ).toBeNull();
  });
});
