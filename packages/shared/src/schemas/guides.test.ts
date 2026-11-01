import { describe, expect, it } from 'vitest';
import { erreursParChamp } from './commun';
import { schemaDemandeGuide, schemaGuide, schemaRelecturePiege } from './guides';

const erreurs = (resultat: { success: boolean; error?: unknown }) =>
  resultat.success ? {} : erreursParChamp(resultat.error as never);

const etape = {
  id: null,
  titre: 'Décrire les créneaux',
  conseil: 'Plus la description est précise, moins l’IA invente de créneaux.',
  sources: [],
  citation: null,
};
const piege = {
  id: null,
  titre: 'Le créneau restait réservable',
  solution: 'Bloquer le créneau dès la réservation.',
  etape: 0,
  sources: [],
  sujetId: null,
  casId: null,
};
const guide = {
  version: '2026-11-01T08:00:00.000Z',
  titre: 'Mettre en place la prise de rendez-vous en ligne',
  titreCourt: 'Prise de rendez-vous en ligne',
  categorieId: 1,
  motsCles: ['rdv', 'RDV', 'créneau'],
  lacunes: [],
  etapes: [etape],
  pieges: [piege],
};

describe('Administration des guides (DEC-02)', () => {
  it('retire les mots-clés en double et garde la première graphie', () => {
    const resultat = schemaGuide.safeParse(guide);
    expect(resultat.success && resultat.data.motsCles).toEqual(['rdv', 'créneau']);
  });

  it('désigne l’étape d’un piège par sa place dans la méthode', () => {
    expect(erreurs(schemaGuide.safeParse({ ...guide, pieges: [{ ...piege, etape: 1 }] }))).toEqual({
      'pieges.0.etape': 'Choisissez une étape de la méthode.',
    });
    expect(
      erreurs(
        schemaGuide.safeParse({
          ...guide,
          etapes: [
            { ...etape, id: 4 },
            { ...etape, id: 4 },
          ],
        }),
      ),
    ).toEqual({ etapes: 'Rechargez la page.' });
  });

  it('exige les textes que l’équipe rédige', () => {
    expect(
      erreurs(
        schemaGuide.safeParse({
          ...guide,
          titre: 'Court',
          etapes: [{ ...etape, conseil: ' ', citation: { parcoursId: 3, texte: '' } }],
        }),
      ),
    ).toEqual({
      titre: 'L’objectif compte au moins 10 caractères.',
      'etapes.0.conseil': 'Rédigez le conseil de l’étape.',
      'etapes.0.citation.texte': 'Recopiez le prompt du parcours cité.',
    });
  });

  it('retient un piège avec le texte de l’équipe, ou l’écarte', () => {
    expect(schemaRelecturePiege.safeParse({ decision: 'ECARTER' }).success).toBe(true);
    expect(
      erreurs(schemaRelecturePiege.safeParse({ decision: 'RETENIR', titre: '', solution: '' })),
    ).toEqual({
      titre: 'Décrivez le piège.',
      solution: 'Indiquez ce qui a fonctionné.',
    });
    expect(erreurs(schemaRelecturePiege.safeParse({ decision: 'GARDER' }))).toEqual({
      decision: 'Choisissez de retenir ou d’écarter ce piège.',
    });
  });

  it('accepte une demande sans domaine', () => {
    const resultat = schemaDemandeGuide.safeParse({ libelle: 'Podcast en wolof', categorieId: '' });
    expect(resultat.success && resultat.data).toEqual({
      libelle: 'Podcast en wolof',
      categorieId: null,
    });
  });
});
