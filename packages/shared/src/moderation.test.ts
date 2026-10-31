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
  actionsAdministrateurPossibles,
  actionsPossibles,
  issueDesSignalements,
} from './moderation';
import { erreursParChamp } from './schemas/commun';
import {
  schemaDecisionAdministrateur,
  schemaDecisionModeration,
  schemaSignalement,
} from './schemas/moderation';

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

describe('schemaDecisionAdministrateur (RG-102, CI-24)', () => {
  const lire = (valeur: object) => {
    const resultat = schemaDecisionAdministrateur.safeParse({ motif: 'Votes croisés.', ...valeur });
    return resultat.success ? resultat.data : erreursParChamp(resultat.error);
  };

  it('bannit avec un motif seulement', () => {
    expect(lire({ action: 'BANNIR' })).toEqual({
      action: 'BANNIR',
      motif: 'Votes croisés.',
      points: null,
      badge: null,
    });
    expect(lire({ action: 'BANNIR', motif: ' ' })).toEqual({
      motif: 'Rédigez le motif communiqué à ce membre.',
    });
    expect(lire({ action: 'MASQUER' })).toEqual({ action: 'Choisissez la décision.' });
  });

  it('ajuste la réputation de −5 000 à 5 000 points, jamais de 0', () => {
    const erreur = 'Indiquez un nombre de points de −5 000 à 5 000, autre que 0.';
    expect(lire({ action: 'AJUSTER_REPUTATION' })).toEqual({ points: erreur });
    expect(lire({ action: 'AJUSTER_REPUTATION', points: 0 })).toEqual({ points: erreur });
    expect(lire({ action: 'AJUSTER_REPUTATION', points: -5001 })).toEqual({ points: erreur });
    expect(lire({ action: 'AJUSTER_REPUTATION', points: 2.5 })).toEqual({ points: erreur });
    expect(lire({ action: 'AJUSTER_REPUTATION', points: -120 })).toMatchObject({ points: -120 });
    expect(lire({ action: 'BANNIR', points: 10 })).toEqual({
      points: 'Des points ne s’indiquent que pour un ajustement de la réputation.',
    });
  });

  it('retire un badge désigné par son code', () => {
    expect(lire({ action: 'RETIRER_BADGE' })).toEqual({ badge: 'Choisissez le badge à retirer.' });
    expect(lire({ action: 'RETIRER_BADGE', badge: 'PODIUM' })).toMatchObject({ badge: 'PODIUM' });
    expect(lire({ action: 'AJUSTER_REPUTATION', points: 5, badge: 'PODIUM' })).toEqual({
      badge: 'Un badge ne s’indique que pour un retrait de badge.',
    });
  });
});

describe('actionsAdministrateurPossibles (RG-102, RG-103, RG-104)', () => {
  const membre = { soi: false, statutCompte: 'ACTIF', badges: 2 } as const;

  it('bannit un compte actif, ajuste sa réputation, retire un badge obtenu', () => {
    expect(actionsAdministrateurPossibles(membre)).toEqual([
      'BANNIR',
      'AJUSTER_REPUTATION',
      'RETIRER_BADGE',
    ]);
    expect(actionsAdministrateurPossibles({ ...membre, badges: 0 })).toEqual([
      'BANNIR',
      'AJUSTER_REPUTATION',
    ]);
    expect(actionsAdministrateurPossibles({ ...membre, statutCompte: 'EN_SUPPRESSION' })).toEqual([
      'AJUSTER_REPUTATION',
      'RETIRER_BADGE',
    ]);
  });

  it('ne décide rien sur son propre compte ni sur un compte fermé', () => {
    expect(actionsAdministrateurPossibles({ ...membre, soi: true })).toEqual([]);
    expect(actionsAdministrateurPossibles({ ...membre, statutCompte: 'BANNI' })).toEqual([]);
    expect(actionsAdministrateurPossibles({ ...membre, statutCompte: 'SUPPRIME' })).toEqual([]);
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

describe('actionsPossibles (RG-102, RG-23)', () => {
  const creation = { type: 'CREATION', avertissementAgent: 'AUCUN' } as const;

  it('masque un contenu visible, rétablit un contenu masqué', () => {
    expect(actionsPossibles({ ...creation, statut: 'VISIBLE' })).toEqual([
      'AUCUNE',
      'MASQUER',
      'SUPPRIMER',
      'AVERTIR',
      'SUSPENDRE',
      'AJOUTER_AVERTISSEMENT_AGENT',
    ]);
    expect(actionsPossibles({ ...creation, statut: 'MASQUE' })).toEqual([
      'AUCUNE',
      'RETABLIR',
      'SUPPRIMER',
      'AVERTIR',
      'SUSPENDRE',
      'AJOUTER_AVERTISSEMENT_AGENT',
    ]);
  });

  it('retire l’avertissement posé, n’ajoute pas celui que la modération a déjà posé', () => {
    const avec = (avertissementAgent: 'AUTEUR' | 'MODERATION') =>
      actionsPossibles({ ...creation, statut: 'VISIBLE', avertissementAgent }).filter((a) =>
        a.endsWith('AVERTISSEMENT_AGENT'),
      );
    expect(avec('AUTEUR')).toEqual(['AJOUTER_AVERTISSEMENT_AGENT', 'RETIRER_AVERTISSEMENT_AGENT']);
    expect(avec('MODERATION')).toEqual(['RETIRER_AVERTISSEMENT_AGENT']);
  });

  it('réserve l’avertissement aux créations et ne décide plus rien sur un contenu supprimé', () => {
    expect(
      actionsPossibles({ type: 'COMMENTAIRE', statut: 'VISIBLE', avertissementAgent: null }),
    ).toEqual(['AUCUNE', 'MASQUER', 'SUPPRIMER', 'AVERTIR', 'SUSPENDRE']);
    expect(actionsPossibles({ ...creation, statut: 'SUPPRIME' })).toEqual([]);
  });
});

describe('libellés', () => {
  it('nomment chaque motif et chaque action', () => {
    expect(Object.keys(LIBELLES_MOTIF_SIGNALEMENT)).toEqual([...MOTIFS_SIGNALEMENT]);
    expect(Object.keys(LIBELLES_ACTION_DECISION)).toEqual([...ACTIONS_DECISION]);
  });
});
