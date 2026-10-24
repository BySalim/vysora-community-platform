import { describe, expect, it } from 'vitest';
import { erreursParChamp } from './commun';
import { schemaConnexion, schemaInscription, schemaModificationMembre } from './auth';

const inscription = {
  email: 'awa.sarr@example.com',
  motDePasse: 'lagune ocre baobab',
  accepteConditions: true,
};

describe('schemaInscription (F-01)', () => {
  it('accepte une inscription sans pseudo : l’API en proposera un', () => {
    expect(schemaInscription.safeParse(inscription).success).toBe(true);
  });

  it('exige l’acceptation des conditions (RG-03)', () => {
    const resultat = schemaInscription.safeParse({ ...inscription, accepteConditions: false });
    expect(resultat.success).toBe(false);
    if (!resultat.success)
      expect(erreursParChamp(resultat.error).accepteConditions).toContain('Acceptez');
  });

  it('applique la politique de mot de passe (RG-04)', () => {
    const court = schemaInscription.safeParse({ ...inscription, motDePasse: 'court' });
    const personnel = schemaInscription.safeParse({ ...inscription, motDePasse: 'awa.sarr-2026!' });
    expect(court.success || erreursParChamp(court.error).motDePasse).toBe(
      'Votre mot de passe compte 12 caractères au moins.',
    );
    expect(personnel.success || erreursParChamp(personnel.error).motDePasse).toBe(
      'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.',
    );
  });

  it('refuse un pseudo hors format (RG-01)', () => {
    const resultat = schemaInscription.safeParse({ ...inscription, pseudo: 'awa sarr' });
    expect(resultat.success || erreursParChamp(resultat.error).pseudo).toBe(
      'Utilisez seulement des lettres, des chiffres, le tiret et le tiret bas.',
    );
  });
});

describe('schemaConnexion (F-03)', () => {
  it('n’impose pas la politique de mot de passe à la connexion', () => {
    expect(schemaConnexion.safeParse({ email: 'awa@example.com', motDePasse: 'x' }).success).toBe(
      true,
    );
  });

  it('demande les deux champs', () => {
    const resultat = schemaConnexion.safeParse({ email: '', motDePasse: '' });
    expect(resultat.success || erreursParChamp(resultat.error)).toEqual({
      email: 'Indiquez votre adresse e-mail.',
      motDePasse: 'Indiquez votre mot de passe.',
    });
  });
});

describe('schemaModificationMembre : nom affiché', () => {
  const nom = (nomAffiche: unknown) => schemaModificationMembre.safeParse({ nomAffiche });

  it('accepte un nom avec accents et espaces, ramenés à un seul', () => {
    const resultat = nom('  Aïssatou   Ndiaye ');
    expect(resultat.success && resultat.data.nomAffiche).toBe('Aïssatou Ndiaye');
  });

  it('retire le nom vide ou nul : le pseudo s’affiche', () => {
    const vide = nom('   ');
    const nul = nom(null);
    expect(vide.success && vide.data.nomAffiche).toBeNull();
    expect(nul.success && nul.data.nomAffiche).toBeNull();
  });

  it('refuse un nom trop long ou des caractères invisibles', () => {
    const long = nom('a'.repeat(61));
    const invisible = nom('Claire​Dubois');
    expect(long.success || erreursParChamp(long.error).nomAffiche).toBe(
      'Votre nom compte 60 caractères au plus.',
    );
    expect(invisible.success || erreursParChamp(invisible.error).nomAffiche).toBe(
      'Retirez les caractères invisibles de votre nom.',
    );
  });
});
