import {
  ACTIONS_AUDIT,
  LIBELLES_ACTION_AUDIT,
  type BadgeAdministreApi,
  type EntreeAuditApi,
  type OutilAdministreApi,
} from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  badgesParCategorie,
  cibleAudit,
  editeurs,
  libelleAudit,
  parFamille,
  precisionAudit,
} from './administration';

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

describe('journal d’audit (ADM-02, ENF-09)', () => {
  const entree = (e: Partial<EntreeAuditApi> & Pick<EntreeAuditApi, 'action'>): EntreeAuditApi => ({
    id: 1,
    date: '2026-10-31T10:00:00Z',
    acteur: null,
    cible: null,
    details: null,
    ...e,
  });

  it('nomme chaque action inscrite, une seule fois', () => {
    const actions = Object.values(ACTIONS_AUDIT).flat();
    expect(new Set(actions).size).toBe(actions.length);
    expect(Object.keys(LIBELLES_ACTION_AUDIT).toSorted()).toEqual(actions.toSorted());
    expect(libelleAudit('ROLE_MODIFIE')).toBe('Rôle modifié');
    expect(libelleAudit('ACTION_INCONNUE')).toBe('ACTION_INCONNUE');
  });

  it('dit en clair ce que l’action a changé', () => {
    expect(
      precisionAudit(
        entree({ action: 'ROLE_MODIFIE', details: { avant: 'MEMBRE', apres: 'MODERATEUR' } }),
      ),
    ).toBe('Membre → Modérateur');
    expect(
      precisionAudit(
        entree({ action: 'INVITATIONS_CREEES', details: { nombre: 3, joursValidite: 30 } }),
      ),
    ).toBe('3 codes, valables 30 jours');
    expect(
      precisionAudit(
        entree({ action: 'INVITATIONS_CREEES', details: { nombre: 1, joursValidite: null } }),
      ),
    ).toBe('1 code, sans limite de validité');
    expect(precisionAudit(entree({ action: 'DEFI_CLOTURE', details: { participants: 1 } }))).toBe(
      '1 participant',
    );
    expect(precisionAudit(entree({ action: 'OUTIL_ARCHIVE' }))).toBe('');
    // Guides d'Explorer (DEC-02).
    expect(
      precisionAudit(
        entree({
          action: 'GUIDE_CONTENU_RETIRE',
          details: { nom: 'Photos réalistes', type: 'parcours', titre: 'Portrait au marché' },
        }),
      ),
    ).toBe('Parcours « Portrait au marché »');
    expect(
      precisionAudit(entree({ action: 'PIEGE_ECARTE', details: { guide: 'Photos réalistes' } })),
    ).toBe('Guide « Photos réalistes »');
  });

  it('nomme l’élément visé, une version de document légal par ses détails', () => {
    expect(
      cibleAudit(
        entree({
          action: 'DOCUMENT_LEGAL_RETIRE',
          cible: { type: 'document_legal', id: 9, nom: null, membre: null },
          details: { type: 'CGU', version: '2026-11-15' },
        }),
      ),
    ).toBe('Conditions générales d’utilisation, version du 15 novembre 2026');
    expect(
      cibleAudit(
        entree({
          action: 'BADGE_ARRETE',
          cible: { type: 'badge', id: 4, nom: 'Podium', membre: null },
        }),
      ),
    ).toBe('Podium');
    expect(
      cibleAudit(
        entree({
          action: 'CATEGORIE_CREEE',
          cible: { type: 'categorie', id: 41, nom: null, membre: null },
          details: { libelle: 'Domaine d’essai' },
        }),
      ),
    ).toBe('Domaine d’essai');
    expect(
      cibleAudit(
        entree({
          action: 'LICENCE_ARCHIVEE',
          cible: { type: 'licence', id: 21, nom: null, membre: null },
        }),
      ),
    ).toBe('Élément supprimé depuis');
    expect(
      cibleAudit(
        entree({
          action: 'ROLE_MODIFIE',
          cible: { type: 'utilisateur', id: 4, nom: null, membre: null },
        }),
      ),
    ).toBeNull();
  });
});
