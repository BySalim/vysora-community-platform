import { joursDeLaCourbe, lundiUtc, reglesDuDefi } from './periodes.js';

describe('Périodes de l’accueil (ACC-01)', () => {
  it('ramène une date au lundi 00:00 UTC de sa semaine (RG-87)', () => {
    expect(lundiUtc(new Date('2026-10-27T15:00:00Z')).toISOString()).toBe(
      '2026-10-26T00:00:00.000Z',
    );
    // Dimanche soir : encore la semaine commencée six jours plus tôt.
    expect(lundiUtc(new Date('2026-11-01T23:59:00Z')).toISOString()).toBe(
      '2026-10-26T00:00:00.000Z',
    );
    expect(lundiUtc(new Date('2026-10-26T00:00:00Z')).toISOString()).toBe(
      '2026-10-26T00:00:00.000Z',
    );
  });

  it('trace trois semaines entières puis la semaine en cours jusqu’à aujourd’hui', () => {
    // Comme le prototype : du lundi 21 septembre au mardi 13 octobre, 23 jours.
    const jours = joursDeLaCourbe(new Date('2026-10-13T16:20:00Z'));
    expect(jours).toHaveLength(23);
    expect(jours[0]).toBe('2026-09-21');
    expect(jours.at(-1)).toBe('2026-10-13');
    expect(joursDeLaCourbe(new Date('2026-10-19T08:00:00Z'))).toHaveLength(22);
  });

  it('lit les contraintes d’un défi, une par ligne, sans leur puce', () => {
    expect(
      reglesDuDefi('- Trois échanges au maximum\n* Un texte sans faute\n\n2. Un lieu réel'),
    ).toEqual(['Trois échanges au maximum', 'Un texte sans faute', 'Un lieu réel']);
    expect(reglesDuDefi(null)).toEqual([]);
  });
});
