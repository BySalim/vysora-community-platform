import { describe, expect, it } from 'vitest';
import { MESSAGES_MOT_DE_PASSE, evaluerMotDePasse } from './mots-de-passe';

describe('evaluerMotDePasse (RG-04)', () => {
  it('compte les caractères manquants sous 12 caractères', () => {
    expect(evaluerMotDePasse('')).toMatchObject({ etat: 'vide', progression: 0 });
    expect(evaluerMotDePasse('lagune-ocre')).toMatchObject({ etat: 'court', reste: 1 });
  });

  it('refuse les mots de passe répandus et les répétitions d’un même caractère', () => {
    expect(evaluerMotDePasse('Azerty123456')).toMatchObject({
      etat: 'compromis',
      message: MESSAGES_MOT_DE_PASSE.compromis,
    });
    expect(evaluerMotDePasse('aaaaaaaaaaaaaa').etat).toBe('compromis');
  });

  it('refuse un mot de passe qui contient le pseudo ou le début de l’adresse e-mail', () => {
    const identite = { pseudo: 'prisme-azur-42', email: 'awa.sarr@example.com' };
    expect(evaluerMotDePasse('mon-awa.sarr-secret', identite).etat).toBe('personnel');
    expect(evaluerMotDePasse('PRISME-AZUR-42!x', identite).etat).toBe('personnel');
  });

  it('juge solide un mot de passe de 16 caractères, sans règle de composition', () => {
    expect(evaluerMotDePasse('lagune ocre baobab').etat).toBe('solide');
    expect(evaluerMotDePasse('lagune ocre b').etat).toBe('valide');
  });

  it('compte un emoji pour un caractère', () => {
    expect(evaluerMotDePasse('🌍'.repeat(11))).toMatchObject({ etat: 'court', reste: 1 });
    expect(evaluerMotDePasse('🌍'.repeat(12)).etat).toBe('compromis');
  });
});
