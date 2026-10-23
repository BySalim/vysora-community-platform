import { describe, expect, it } from 'vitest';
import { erreursParChamp } from './commun';
import { schemaMessageContact } from './contact';

const valide = {
  motif: 'QUESTION',
  nom: 'Awa Sarr',
  email: 'awa.sarr@example.com',
  message: 'Comment déclarer une reproduction partielle ?',
};

describe('schemaMessageContact', () => {
  it('accepte un message complet', () => {
    const resultat = schemaMessageContact.safeParse(valide);
    expect(resultat.success).toBe(true);
  });

  it('signale chaque champ manquant avec le message du formulaire', () => {
    const resultat = schemaMessageContact.safeParse({ nom: ' ', email: 'awa@', message: 'court' });
    expect(resultat.success).toBe(false);
    if (resultat.success) return;
    expect(erreursParChamp(resultat.error)).toEqual({
      motif: 'Choisissez l’objet de votre message.',
      nom: 'Indiquez votre nom.',
      email: 'Cette adresse e-mail est incomplète. Vérifiez-la.',
      message: 'Précisez votre message : 20 caractères au moins.',
    });
  });

  it('exige l’adresse du contenu et la déclaration de bonne foi pour un signalement', () => {
    const resultat = schemaMessageContact.safeParse({
      ...valide,
      motif: 'SIGNALEMENT',
      contenu: 'pas une adresse',
    });
    expect(resultat.success).toBe(false);
    if (resultat.success) return;
    expect(erreursParChamp(resultat.error)).toEqual({
      contenu: 'Cette adresse ne semble pas valide. Copiez-la depuis la barre d’adresse.',
      bonneFoi: 'Cochez la déclaration pour envoyer le signalement.',
    });
  });

  it('accepte une contestation sans adresse de contenu', () => {
    expect(
      schemaMessageContact.safeParse({ ...valide, motif: 'CONTESTATION', contenu: '' }).success,
    ).toBe(true);
  });
});
