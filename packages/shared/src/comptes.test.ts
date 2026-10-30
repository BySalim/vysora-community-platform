import { describe, expect, it } from 'vitest';
import { estPseudoReserve, problemeMotDePasse, tirerPseudo, variantesPseudo } from './comptes';
import { erreursParChamp } from './schemas/commun';
import { schemaConnexion, schemaInscription, schemaPseudo } from './schemas/comptes';

describe('pseudos (RG-01)', () => {
  it('réserve les noms de la plateforme sans distinction de casse', () => {
    expect(estPseudoReserve('Admin')).toBe(true);
    expect(estPseudoReserve('vysora')).toBe(true);
    expect(estPseudoReserve('membre-supprime-4f2a')).toBe(true);
    expect(estPseudoReserve('awa-sarr')).toBe(false);
  });

  it('tire un pseudo valide « nom-couleur-nombre »', () => {
    const pseudo = tirerPseudo(() => 0);
    expect(pseudo).toBe('baobab-indigo-10');
    expect(schemaPseudo.safeParse({ pseudo: tirerPseudo() }).success).toBe(true);
  });

  it('propose des variantes valides d’un pseudo pris', () => {
    expect(variantesPseudo('awa-sarr')).toEqual(['awa-sarr-ia', 'awa_sarr', 'awa-sarr-26']);
    expect(variantesPseudo('Kofi')).toEqual(['kofi-ia', 'kofi_cree', 'kofi-26']);
    for (const pseudo of variantesPseudo('x'.repeat(30)))
      expect(schemaPseudo.safeParse({ pseudo }).success).toBe(true);
  });

  it('refuse un pseudo réservé comme un pseudo déjà pris', () => {
    const resultat = schemaPseudo.safeParse({ pseudo: 'Moderation' });
    expect(resultat.success).toBe(false);
    if (!resultat.success)
      expect(erreursParChamp(resultat.error)).toEqual({ pseudo: 'Ce pseudo est déjà pris.' });
  });
});

describe('mot de passe (RG-04)', () => {
  it('refuse un mot de passe connu comme compromis ou fait d’un seul caractère répété', () => {
    expect(problemeMotDePasse('Azerty123456')).toBe('compromis');
    expect(problemeMotDePasse('aaaaaaaaaaaaaa')).toBe('compromis');
  });

  it('refuse un mot de passe qui contient le pseudo ou l’adresse e-mail', () => {
    expect(problemeMotDePasse('awa.sarr-2026!', { email: 'awa.sarr@example.com' })).toBe(
      'personnel',
    );
    expect(problemeMotDePasse('le-baobab-indigo', { pseudo: 'baobab' })).toBe('personnel');
  });

  it('accepte une phrase de passe sans règle de composition', () => {
    expect(problemeMotDePasse('une lagune au petit matin', { email: 'awa@example.com' })).toBe(
      null,
    );
  });

  it('signale le mot de passe trop court ou compromis à l’inscription', () => {
    const court = schemaInscription.safeParse({ email: 'awa@example.com', motDePasse: 'court' });
    expect(court.success).toBe(false);
    if (!court.success)
      expect(erreursParChamp(court.error)).toEqual({
        motDePasse: 'Votre mot de passe compte 12 caractères au moins.',
      });

    const compromis = schemaInscription.safeParse({
      email: 'awa@example.com',
      motDePasse: 'password1234',
    });
    expect(compromis.success).toBe(false);
    if (!compromis.success)
      expect(erreursParChamp(compromis.error)).toEqual({
        motDePasse:
          'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.',
      });
  });

  it('n’impose aucune longueur minimale à la connexion', () => {
    expect(schemaConnexion.safeParse({ email: 'awa@example.com', motDePasse: 'x' }).success).toBe(
      true,
    );
    const vide = schemaConnexion.safeParse({ email: 'awa@example.com', motDePasse: '' });
    if (!vide.success)
      expect(erreursParChamp(vide.error)).toEqual({ motDePasse: 'Indiquez votre mot de passe.' });
  });
});
