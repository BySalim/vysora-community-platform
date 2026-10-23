import { describe, expect, it } from 'vitest';
import {
  ETAT_VISITEUR,
  compteAffiche,
  limiteQuotidienne,
  peut,
  raisonRefus,
  type EtatVisiteur,
} from './permissions';
import { niveauPourReputation } from './regles';

const membre = (etat: Partial<EtatVisiteur> = {}): EtatVisiteur => ({
  session: 'membre',
  role: 'membre',
  niveau: 'apprenti',
  compte: 'actif',
  ...etat,
});

describe('raisonRefus', () => {
  it('demande la connexion à un visiteur, quelle que soit l’action', () => {
    expect(raisonRefus('contribuer', ETAT_VISITEUR)).toBe('connexion');
    expect(raisonRefus('parametres', ETAT_VISITEUR)).toBe('connexion');
  });

  it('laisse un compte en lecture seule gérer ses paramètres, mais pas contribuer', () => {
    for (const compte of ['email', 'conditions', 'suspendu'] as const) {
      expect(raisonRefus('parametres', membre({ compte }))).toBeNull();
      expect(raisonRefus('contribuer', membre({ compte }))).toBe(compte);
    }
  });

  it('réserve la proposition de cas aux experts, aux maîtres et à la modération (RG-70)', () => {
    expect(raisonRefus('proposer-cas', membre({ niveau: 'artisan' }))).toBe('niveau');
    expect(peut('proposer-cas', membre({ niveau: 'expert' }))).toBe(true);
    expect(peut('proposer-cas', membre({ niveau: 'curieux', role: 'moderateur' }))).toBe(true);
  });

  it('réserve la modération et l’administration aux rôles concernés', () => {
    expect(raisonRefus('moderer', membre())).toBe('role');
    expect(peut('moderer', membre({ role: 'moderateur' }))).toBe(true);
    expect(raisonRefus('administrer', membre({ role: 'moderateur' }))).toBe('role');
    expect(peut('administrer', membre({ role: 'admin' }))).toBe(true);
  });
});

describe('limiteQuotidienne (RG-85)', () => {
  it('applique les limites du niveau aux membres', () => {
    expect(limiteQuotidienne('creations', membre({ niveau: 'curieux' }))).toBe(3);
    expect(limiteQuotidienne('reponses', membre({ niveau: 'artisan' }))).toBe(100);
    expect(limiteQuotidienne('sujets', membre({ niveau: 'expert' }))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('ne limite ni la modération ni l’administration', () => {
    expect(limiteQuotidienne('creations', membre({ niveau: 'curieux', role: 'moderateur' }))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe('niveauPourReputation (RG-83, RG-84)', () => {
  it('retient le niveau le plus élevé dont le seuil est atteint, avec un plancher à 0', () => {
    expect(niveauPourReputation(-20).code).toBe('curieux');
    expect(niveauPourReputation(49).code).toBe('curieux');
    expect(niveauPourReputation(50).code).toBe('apprenti');
    expect(niveauPourReputation(1500).code).toBe('expert');
    expect(niveauPourReputation(9000).code).toBe('maitre');
  });
});

describe('compteAffiche', () => {
  const base = {
    statut: 'ACTIF' as const,
    emailVerifie: true,
    documentsAAccepter: false,
    suspenduJusqua: null,
  };

  it('signale la suspension en cours avant tout le reste', () => {
    const demain = new Date(Date.now() + 86_400_000);
    expect(compteAffiche({ ...base, emailVerifie: false, suspenduJusqua: demain })).toBe(
      'suspendu',
    );
  });

  it('demande la vérification de l’e-mail, puis l’acceptation des documents', () => {
    expect(compteAffiche({ ...base, emailVerifie: false, documentsAAccepter: true })).toBe('email');
    expect(compteAffiche({ ...base, documentsAAccepter: true })).toBe('conditions');
    expect(compteAffiche(base)).toBe('actif');
  });
});
