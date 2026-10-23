import { NotFoundException } from '@nestjs/common';
import { ErreurApplication, erreurValidation } from '../erreurs.js';
import { FiltreErreurs } from './filtre-erreurs.js';

describe('FiltreErreurs', () => {
  const filtre = new FiltreErreurs();

  it('traduit une erreur applicative en « problem details » avec les erreurs par champ', () => {
    expect(filtre.convertir(erreurValidation({ email: 'Indiquez votre adresse e-mail.' }))).toEqual(
      {
        type: 'urn:vysora:probleme:validation',
        title: 'Certaines informations sont à corriger.',
        status: 400,
        code: 'VALIDATION',
        erreurs: { email: 'Indiquez votre adresse e-mail.' },
      },
    );
  });

  it('garde le détail d’une erreur métier', () => {
    const probleme = filtre.convertir(
      new ErreurApplication('LIMITE_ATTEINTE', 'Vous pourrez publier à 14 h 20.'),
    );
    expect(probleme).toMatchObject({
      status: 429,
      code: 'LIMITE_ATTEINTE',
      detail: 'Vous pourrez publier à 14 h 20.',
    });
  });

  it('reprend le statut des exceptions du framework', () => {
    expect(filtre.convertir(new NotFoundException())).toMatchObject({
      status: 404,
      code: 'INTROUVABLE',
    });
  });

  it('ne laisse rien filtrer d’une erreur inattendue', () => {
    const probleme = filtre.convertir(new Error('connexion refusée par 10.0.0.12'));
    expect(probleme).toEqual({
      type: 'urn:vysora:probleme:erreur_interne',
      title: 'Une erreur est survenue de notre côté. Réessayez dans un instant.',
      status: 500,
      code: 'ERREUR_INTERNE',
    });
  });
});
