import type { BadgeAdministreApi, OutilAdministreApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { badgesParCategorie, editeurs, parFamille } from './administration';

const outil = (o: Partial<OutilAdministreApi> & Pick<OutilAdministreApi, 'nom'>) =>
  ({
    id: 1,
    slug: o.nom.toLowerCase(),
    editeur: 'OpenAI',
    type: 'ASSISTANT_CONVERSATIONNEL',
    famille: 'ASSISTANT',
    logo: null,
    logoMonochrome: false,
    statut: 'ACTIF',
    utilisations: 0,
    modeles: [],
    ...o,
  }) satisfies OutilAdministreApi;

describe('référentiel des outils (ADM-02, RG-110)', () => {
  it('range les outils par famille dans l’ordre du catalogue, les archivés après les autres', () => {
    const familles = parFamille([
      outil({ nom: 'Suno', famille: 'AUDIO' }),
      outil({ nom: 'Bard', statut: 'ARCHIVE', editeur: 'Google' }),
      outil({ nom: 'Mistral', editeur: 'Mistral AI' }),
      outil({ nom: 'ChatGPT' }),
    ]);
    expect(familles.map((f) => [f.libelle, f.outils.map((o) => o.nom), f.archives])).toEqual([
      ['Assistants', ['ChatGPT', 'Mistral', 'Bard'], 1],
      ['Audio', ['Suno'], 0],
    ]);
  });

  it('propose chaque éditeur connu une seule fois, par ordre alphabétique', () => {
    expect(
      editeurs([
        outil({ nom: 'ChatGPT' }),
        outil({ nom: 'Sora', editeur: 'OpenAI' }),
        outil({ nom: 'Gemini', editeur: 'Google' }),
      ]),
    ).toEqual(['Google', 'OpenAI']);
  });
});

describe('badges de l’administration (ADM-02, RG-86)', () => {
  const badge = (b: Pick<BadgeAdministreApi, 'id' | 'categorie'>): BadgeAdministreApi => ({
    code: `B${b.id}`,
    libelle: `Badge ${b.id}`,
    critere: 'Publier sa première création',
    icone: 'layers',
    ton: 'BLEU',
    actif: true,
    obtentions: 0,
    ...b,
  });

  it('range les badges par catégorie, sans les catégories vides', () => {
    const groupes = badgesParCategorie([
      badge({ id: 1, categorie: 'COMMUNAUTE' }),
      badge({ id: 2, categorie: 'CONTRIBUTION' }),
      badge({ id: 3, categorie: 'COMMUNAUTE' }),
    ]);
    expect(groupes.map((g) => [g.libelle, g.badges.map((b) => b.id)])).toEqual([
      ['Contribution', [2]],
      ['Communauté', [1, 3]],
    ]);
  });
});
