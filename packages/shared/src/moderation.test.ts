import { describe, expect, it } from 'vitest';
import {
  ACTIONS_DECISION,
  ACTIONS_DECISION_ADMINISTRATEUR,
  ACTIONS_DECISION_MODERATEUR,
  MOTIFS_SIGNALEMENT,
} from './enums';
import {
  LIBELLES_ACTION_DECISION,
  LIBELLES_MOTIF_SIGNALEMENT,
  issueDesSignalements,
} from './moderation';
import { erreursParChamp } from './schemas/commun';
import { schemaDecisionModeration, schemaSignalement } from './schemas/moderation';

const erreurs = (resultat: ReturnType<typeof schemaSignalement.safeParse>) =>
  resultat.success ? {} : erreursParChamp(resultat.error);

describe('schemaSignalement (RG-100)', () => {
  it('accepte chaque motif de la charte, avec une précision facultative', () => {
    for (const motif of MOTIFS_SIGNALEMENT.filter((m) => m !== 'AUTRE'))
      expect(schemaSignalement.parse({ motif })).toEqual({ motif, precision: null });
    expect(schemaSignalement.parse({ motif: 'SPAM', precision: '  Lien répété.  ' })).toEqual({
      motif: 'SPAM',
      precision: 'Lien répété.',
    });
  });

  it('exige une précision pour « Autre »', () => {
    expect(erreurs(schemaSignalement.safeParse({ motif: 'AUTRE', precision: ' ' }))).toEqual({
      precision: 'Précisez le motif du signalement.',
    });
    expect(
      schemaSignalement.safeParse({ motif: 'AUTRE', precision: 'Recopie un livre.' }).success,
    ).toBe(true);
  });

  it('refuse un motif inconnu et une précision de plus de 1 000 caractères', () => {
    expect(erreurs(schemaSignalement.safeParse({ motif: 'OBSOLETE' }))).toEqual({
      motif: 'Choisissez le motif du signalement.',
    });
    expect(
      erreurs(schemaSignalement.safeParse({ motif: 'SPAM', precision: 'x'.repeat(1001) })),
    ).toEqual({ precision: 'Votre précision compte 1 000 caractères au plus.' });
  });
});

describe('schemaDecisionModeration (RG-102, F-91)', () => {
  it('exige un motif', () => {
    const resultat = schemaDecisionModeration.safeParse({ action: 'MASQUER', motif: '  ' });
    expect(resultat.success ? {} : erreursParChamp(resultat.error)).toEqual({
      motif: 'Rédigez le motif communiqué à l’auteur.',
    });
  });

  it('demande une durée de 1 à 90 jours pour une suspension, et seulement pour elle', () => {
    const lire = (valeur: object) => {
      const resultat = schemaDecisionModeration.safeParse({ motif: 'Spam répété.', ...valeur });
      return resultat.success ? resultat.data : erreursParChamp(resultat.error);
    };
    expect(lire({ action: 'SUSPENDRE' })).toEqual({
      dureeJours: 'Indiquez la durée de la suspension : de 1 à 90 jours.',
    });
    expect(lire({ action: 'SUSPENDRE', dureeJours: 0 })).toEqual({
      dureeJours: 'Indiquez une durée de 1 à 90 jours.',
    });
    expect(lire({ action: 'SUSPENDRE', dureeJours: 91 })).toEqual({
      dureeJours: 'Indiquez une durée de 1 à 90 jours.',
    });
    expect(lire({ action: 'SUSPENDRE', dureeJours: 90 })).toEqual({
      action: 'SUSPENDRE',
      motif: 'Spam répété.',
      dureeJours: 90,
    });
    expect(lire({ action: 'AVERTIR', dureeJours: 3 })).toEqual({
      dureeJours: 'Une durée ne s’indique que pour une suspension.',
    });
  });

  it('laisse aux administrateurs bannir, ajuster une réputation et retirer un badge', () => {
    expect(ACTIONS_DECISION_MODERATEUR.toSorted()).toEqual(
      ACTIONS_DECISION.filter(
        (a) => !(ACTIONS_DECISION_ADMINISTRATEUR as readonly string[]).includes(a),
      ).toSorted(),
    );
    for (const action of ACTIONS_DECISION_ADMINISTRATEUR)
      expect(schemaDecisionModeration.safeParse({ action, motif: 'Fraude.' }).success).toBe(false);
  });
});

describe('issueDesSignalements (RG-102, CV-06)', () => {
  it('clôt comme non fondés après « aucune » ou « rétablir », comme fondés sinon', () => {
    expect(issueDesSignalements('AUCUNE')).toBe('NON_FONDE');
    expect(issueDesSignalements('RETABLIR')).toBe('NON_FONDE');
    for (const action of ACTIONS_DECISION.filter((a) => a !== 'AUCUNE' && a !== 'RETABLIR'))
      expect(issueDesSignalements(action)).toBe('FONDE');
  });
});

describe('libellés', () => {
  it('nomment chaque motif et chaque action', () => {
    expect(Object.keys(LIBELLES_MOTIF_SIGNALEMENT)).toEqual([...MOTIFS_SIGNALEMENT]);
    expect(Object.keys(LIBELLES_ACTION_DECISION)).toEqual([...ACTIONS_DECISION]);
  });
});
