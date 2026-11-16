import { describe, expect, it } from 'vitest';
import {
  AVATARS,
  IDS_AVATARS,
  adresseAvatar,
  estAdresseAvatar,
  estAvatarChoisi,
  imageDeProfil,
  nomAvatar,
  tirerAvatar,
} from './avatars';
import { schemaModificationMembre } from './schemas/auth';

describe('avatars proposés (F-05, RG-07)', () => {
  it('propose quinze avatars aux identifiants uniques et courts', () => {
    expect(AVATARS).toHaveLength(15);
    expect(new Set(IDS_AVATARS).size).toBe(15);
    for (const id of IDS_AVATARS) expect(id).toMatch(/^[a-z-]{2,30}$/);
    expect(nomAvatar('raton-laveur')).toBe('Raton laveur');
  });

  it('reconnaît les avatars de la liste et seulement eux', () => {
    expect(estAvatarChoisi('renard')).toBe(true);
    expect(estAvatarChoisi('licorne')).toBe(false);
    expect(estAvatarChoisi(null)).toBe(false);
  });

  it('tire un avatar de la liste, différent de celui à éviter', () => {
    for (let i = 0; i < 50; i += 1) {
      const tire = tirerAvatar('renard');
      expect(estAvatarChoisi(tire)).toBe(true);
      expect(tire).not.toBe('renard');
    }
    expect(tirerAvatar(null, () => 0)).toBe('renard');
    expect(tirerAvatar('renard', () => 0)).toBe('hibou');
    expect(tirerAvatar(null, () => 0.9999)).toBe('lion');
  });

  it('montre la photo importée d’abord, puis l’avatar choisi (RG-07)', () => {
    expect(imageDeProfil('/api/v1/fichiers/ab/photo.webp', 'renard')).toBe(
      '/api/v1/fichiers/ab/photo.webp',
    );
    expect(imageDeProfil(null, 'renard')).toBe('/assets/avatars/choix/renard.webp');
    expect(imageDeProfil(null, 'licorne')).toBeNull();
    expect(imageDeProfil(null, null)).toBeNull();
    expect(estAdresseAvatar(adresseAvatar('lion'))).toBe(true);
    expect(estAdresseAvatar('/api/v1/fichiers/ab/photo.webp')).toBe(false);
  });

  it('n’accepte qu’un avatar de la liste dans la modification du membre', () => {
    expect(schemaModificationMembre.parse({ avatarChoisi: 'koala' })).toEqual({
      avatarChoisi: 'koala',
    });
    expect(schemaModificationMembre.safeParse({ avatarChoisi: 'licorne' }).success).toBe(false);
    expect(schemaModificationMembre.safeParse({ avatarChoisi: null }).success).toBe(false);
  });
});
