import type { OutilAdministreApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { editeurs, parFamille } from './administration';

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
