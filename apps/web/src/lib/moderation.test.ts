import { ACTIONS_DECISION_ADMINISTRATEUR, ACTIONS_DECISION_MODERATEUR } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  EFFETS_ACTION,
  EFFETS_ACTION_ADMINISTRATEUR,
  GROUPES_ACTIONS,
  QUESTIONS_ACTION,
  QUESTIONS_ACTION_ADMINISTRATEUR,
  adresseDuContenu,
  anciennete,
  confirmationDecision,
  confirmationDecisionMembre,
  finSuspension,
  issueAnnoncee,
  precisionDecision,
} from './moderation';

describe('confirmationDecision (RG-102, F-92)', () => {
  it('annonce la fin d’une suspension, l’issue des signalements et l’e-mail à l’auteur', () => {
    const fin = finSuspension(7, new Date('2026-10-25T12:00:00Z'));
    expect(confirmationDecision('SUSPENDRE', 2, fin)).toBe(
      'Le compte de l’auteur sera suspendu jusqu’au 1er novembre 2026. Les 2 signalements ouverts seront clos comme fondés. L’auteur en est informé par e-mail, avec votre motif. La décision ne pourra plus être modifiée.',
    );
  });

  it('ne promet pas d’e-mail pour « Aucune mesure »', () => {
    expect(confirmationDecision('AUCUNE', 0, null)).toBe(
      'La décision ne pourra plus être modifiée.',
    );
    expect(Object.keys(QUESTIONS_ACTION).toSorted()).toEqual(
      [...ACTIONS_DECISION_MODERATEUR].toSorted(),
    );
  });
});

describe('adresseDuContenu', () => {
  it('mène à la fiche, à l’ancre du commentaire ou des essais', () => {
    expect(adresseDuContenu({ genre: 'CREATION', id: 12, slug: 'cite', ancre: null })).toBe(
      '/creations/12-cite',
    );
    expect(
      adresseDuContenu({ genre: 'CREATION', id: 12, slug: 'cite', ancre: 'commentaire-40' }),
    ).toBe('/creations/12-cite#commentaire-40');
  });

  it('ne mène pas aux pages pas encore portées', () => {
    expect(adresseDuContenu({ genre: 'SUJET', id: 3, slug: 'sujet', ancre: null })).toBeNull();
    expect(adresseDuContenu(null)).toBeNull();
  });
});

describe('anciennete', () => {
  const maintenant = new Date('2026-10-25T12:00:00Z');
  const il = (minutes: number) => new Date(maintenant.getTime() - minutes * 60_000).toISOString();

  it('compte en minutes, en heures jusqu’à 48 heures, puis en jours', () => {
    expect(anciennete(il(0), maintenant)).toBe('1 min');
    expect(anciennete(il(59), maintenant)).toBe('59 min');
    expect(anciennete(il(60 * 47 + 59), maintenant)).toBe('47 h');
    expect(anciennete(il(60 * 48), maintenant)).toBe('2 jours');
    expect(anciennete(il(60 * 24 * 30 + 5), maintenant)).toBe('30 jours');
  });
});

describe('issueAnnoncee (RG-102)', () => {
  it('annonce la clôture des signalements ouverts, au singulier comme au pluriel', () => {
    expect(issueAnnoncee('MASQUER', 3)).toBe(
      'Les 3 signalements ouverts seront clos comme fondés.',
    );
    expect(issueAnnoncee('RETABLIR', 1)).toBe('Le signalement ouvert sera clos comme non fondé.');
    expect(issueAnnoncee('AUCUNE', 0)).toBe('');
  });
});

describe('décisions du formulaire', () => {
  it('décrivent et rangent chaque action des modérateurs une seule fois', () => {
    expect(Object.keys(EFFETS_ACTION).toSorted()).toEqual(
      [...ACTIONS_DECISION_MODERATEUR].toSorted(),
    );
    expect(GROUPES_ACTIONS.flatMap((g) => g.actions).toSorted()).toEqual(
      [...ACTIONS_DECISION_MODERATEUR].toSorted(),
    );
  });
});

describe('décisions des administrateurs (ADM-02, RG-102)', () => {
  it('décrivent chaque action réservée aux administrateurs', () => {
    expect(Object.keys(EFFETS_ACTION_ADMINISTRATEUR).toSorted()).toEqual(
      [...ACTIONS_DECISION_ADMINISTRATEUR].toSorted(),
    );
    expect(Object.keys(QUESTIONS_ACTION_ADMINISTRATEUR).toSorted()).toEqual(
      [...ACTIONS_DECISION_ADMINISTRATEUR].toSorted(),
    );
  });

  it('confirment ce que la décision change, sans notification pour un compte fermé', () => {
    expect(confirmationDecisionMembre('BANNIR')).toBe(
      'Le compte sera fermé, ses sessions aussi. Le membre en est informé par e-mail, avec votre motif. La décision ne pourra plus être modifiée.',
    );
    expect(
      confirmationDecisionMembre('AJUSTER_REPUTATION', { points: -30, reputation: 20 }),
    ).toMatch(
      /^30 points seront retirés de sa réputation, qui passera à 0 point\. Le membre en est informé par e-mail et dans ses notifications/,
    );
    expect(confirmationDecisionMembre('AJUSTER_REPUTATION', { points: 1, reputation: 20 })).toMatch(
      /^1 point sera ajouté à sa réputation, qui passera à 21 points\./,
    );
    expect(confirmationDecisionMembre('RETIRER_BADGE', { badge: 'Podium' })).toMatch(
      /^Le badge « Podium » sera retiré de son profil et ne lui sera plus attribué\./,
    );
  });

  it('précisent les points d’un ajustement et le badge retiré', () => {
    expect(precisionDecision({ points: -1200, badge: null })).toBe('−1\u202f200 points');
    expect(precisionDecision({ points: 1, badge: null })).toBe('+1 point');
    expect(precisionDecision({ points: null, badge: { code: 'PODIUM', libelle: 'Podium' } })).toBe(
      'Badge « Podium »',
    );
    expect(precisionDecision({ points: null, badge: null })).toBe('');
  });
});
