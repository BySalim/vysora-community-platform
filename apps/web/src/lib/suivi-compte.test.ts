import type { EtatVisiteur } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { effetChangement } from './suivi-compte';

const membre = (
  compte: EtatVisiteur['compte'],
  autres: Partial<EtatVisiteur> = {},
): EtatVisiteur => ({
  session: 'membre',
  role: 'membre',
  niveau: 'curieux',
  compte,
  ...autres,
});

describe('effetChangement (compte changé dans un autre onglet)', () => {
  it('ne fait rien quand rien n’a changé', () => {
    expect(effetChangement(membre('email'), membre('email'))).toBeNull();
  });

  it('met la page à jour sur place quand l’adresse est confirmée ou les conditions acceptées', () => {
    expect(effetChangement(membre('email'), membre('actif'))).toEqual({
      recharger: false,
      message: 'Votre adresse e-mail est confirmée.',
    });
    expect(effetChangement(membre('conditions'), membre('actif'))).toEqual({
      recharger: false,
      message: 'Conditions acceptées.',
    });
  });

  it('suit un niveau gagné sans message ni nouvelle page', () => {
    expect(effetChangement(membre('actif'), membre('actif', { niveau: 'apprenti' }))).toEqual({
      recharger: false,
      message: null,
    });
  });

  it('rend une nouvelle page pour une connexion, une déconnexion, un rôle ou une suspension', () => {
    const visiteur: EtatVisiteur = { ...membre('actif'), session: 'visiteur' };
    expect(effetChangement(membre('actif'), visiteur)?.recharger).toBe(true);
    expect(effetChangement(visiteur, membre('actif'))?.recharger).toBe(true);
    expect(
      effetChangement(membre('actif'), membre('actif', { role: 'moderateur' }))?.recharger,
    ).toBe(true);
    expect(effetChangement(membre('actif'), membre('suspendu'))?.recharger).toBe(true);
    expect(effetChangement(membre('email'), membre('conditions'))?.recharger).toBe(true);
  });
});
