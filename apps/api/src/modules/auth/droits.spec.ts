import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ActionReservee, EtatVisiteur, SessionApi } from '@vysora/shared';
import { ErreurApplication } from '../../commun/erreurs.js';
import { DroitsGuard, Exige } from './droits.js';
import type { EtatCompteService } from './etat-compte.service.js';

const membre = (etat: Partial<EtatVisiteur> = {}): EtatVisiteur => ({
  session: 'membre',
  role: 'membre',
  niveau: 'curieux',
  compte: 'actif',
  ...etat,
});

/** Route fictive protégée par @Exige(action), appelée par une personne dans l'état donné. */
async function appeler(action: ActionReservee | null, etat: EtatVisiteur): Promise<unknown> {
  class Route {
    traiter(): void {}
  }
  if (action)
    Exige(action)(Route.prototype, 'traiter', {
      value: Route.prototype.traiter,
    } as PropertyDescriptor);
  const etatCompte = {
    pour: async () => ({ etat }) as SessionApi,
  } as unknown as EtatCompteService;
  const contexte = {
    getHandler: () => Route.prototype.traiter,
    getClass: () => Route,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
  try {
    return await new DroitsGuard(new Reflector(), etatCompte).canActivate(contexte);
  } catch (erreur) {
    return erreur;
  }
}

describe('DroitsGuard (AUTH-06)', () => {
  it('laisse passer une route sans exigence', async () => {
    expect(await appeler(null, membre({ compte: 'suspendu' }))).toBe(true);
  });

  it('répond 401 avec la raison « connexion » à une visiteuse', async () => {
    const refus = await appeler('contribuer', { ...membre(), session: 'visiteur' });
    expect(refus).toBeInstanceOf(ErreurApplication);
    expect(refus).toMatchObject({ code: 'NON_AUTHENTIFIE', extensions: { raison: 'connexion' } });
  });

  it('répond 403 avec la raison à un compte en lecture seule (RG-02, F-04, RG-103)', async () => {
    for (const compte of ['email', 'conditions', 'suspendu'] as const) {
      expect(await appeler('contribuer', membre({ compte }))).toMatchObject({
        code: 'INTERDIT',
        extensions: { raison: compte },
      });
      expect(await appeler('parametres', membre({ compte }))).toBe(true);
    }
  });

  it('réserve la modération et l’administration aux rôles concernés', async () => {
    expect(await appeler('moderer', membre())).toMatchObject({
      code: 'INTERDIT',
      detail: 'Cette action est réservée à la modération.',
      extensions: { raison: 'role' },
    });
    expect(await appeler('moderer', membre({ role: 'moderateur' }))).toBe(true);
    expect(await appeler('administrer', membre({ role: 'moderateur' }))).toMatchObject({
      detail: 'Cette action est réservée à l’administration.',
    });
    expect(await appeler('administrer', membre({ role: 'admin' }))).toBe(true);
  });

  it('réserve la proposition de cas au niveau Expert (RG-85)', async () => {
    expect(await appeler('proposer-cas', membre({ niveau: 'artisan' }))).toMatchObject({
      extensions: { raison: 'niveau' },
    });
    expect(await appeler('proposer-cas', membre({ niveau: 'expert' }))).toBe(true);
  });
});
