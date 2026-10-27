import { ACTIONS_DECISION_MODERATEUR } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  EFFETS_ACTION,
  GROUPES_ACTIONS,
  QUESTIONS_ACTION,
  adresseDuContenu,
  anciennete,
  confirmationDecision,
  finSuspension,
  issueAnnoncee,
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
