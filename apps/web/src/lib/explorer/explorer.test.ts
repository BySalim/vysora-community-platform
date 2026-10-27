import type { DomaineApi, GuideResumeApi, MembreResumeApi, ParcoursGuideApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { ecrireAdresse, lireAdresse } from './donnees';
import { jourRelatif } from './elements';
import { forme, preuve, trace } from './guide';
import {
  apercuActif,
  compatibilite,
  guidesEnApercu,
  guidesRetenus,
  indexer,
  sousTitre,
} from './index-guides';
import { decouper, score, surligner } from './recherche';

const DOMAINES: DomaineApi[] = [
  {
    id: 1,
    libelle: 'Application web',
    slug: 'application-web',
    icone: 'browser',
    description: null,
  },
  {
    id: 2,
    libelle: 'Image et illustration',
    slug: 'image-et-illustration',
    icone: 'image',
    description: null,
  },
];

const auteur: MembreResumeApi = {
  id: 1,
  pseudo: 'aissatou-ndiaye',
  nom: 'Aïssatou Ndiaye',
  avatar: null,
  niveau: { code: 'artisan', libelle: 'Artisan' },
  reputation: 0,
};

const guide = (valeurs: Partial<GuideResumeApi> = {}): GuideResumeApi => ({
  id: 1,
  slug: 'rendez-vous',
  titre: 'Mettre en place la prise de rendez-vous en ligne',
  titreCourt: 'Prise de rendez-vous en ligne',
  motsCles: ['réservation', 'créneau'],
  domaine: DOMAINES[0] as DomaineApi,
  domaines: ['application-web'],
  parcours: 4,
  reproductions: 43,
  tauxReussite: 81,
  activite: 10,
  recent: '2026-10-20T09:00:00Z',
  miseAJour: '2026-10-25T09:00:00Z',
  derniereReussite: null,
  auteurs: [auteur],
  etapes: [
    { id: 1, titre: 'Décrire les prestations', suivie: 4, piege: false },
    { id: 2, titre: 'Refuser un créneau déjà pris', suivie: 2, piege: true },
  ],
  piegePrincipal: { titre: 'Deux personnes réservent le même créneau', signale: 3, etapeId: 2 },
  pieges: 4,
  obsolescence: null,
  modeles: [{ cle: 'Claude Sonnet 4.5', outil: 'claude' }],
  vignettes: [],
  texteRecherche: 'Mettre en place la prise de rendez-vous en ligne Formulaire Sécurité Claude',
  ...valeurs,
});

const parcours = (valeurs: Partial<ParcoursGuideApi> = {}): ParcoursGuideApi => ({
  id: 7,
  slug: 'keur-awa',
  type: 'ITERATION',
  titre: 'Prise de rendez-vous pour un salon de coiffure',
  objectif: 'Éviter les doubles réservations.',
  categorie: 'Application web',
  auteur,
  outils: [],
  couverture: null,
  etapes: [],
  echanges: 3,
  essais: 1,
  moments: [
    { type: 'VERIFICATION', texte: 'Deux réservations passaient sur le même créneau.' },
    { type: 'REFUS', texte: 'Les numéros de téléphone étaient stockés dans le navigateur.' },
  ],
  prompt: null,
  datePublication: '2026-10-02T09:12:00Z',
  utiles: 12,
  reproductions: { total: 4, reussies: 3, tauxReussite: 75 },
  derniereReussite: null,
  obsolescence: null,
  ...valeurs,
});

describe('Recherche d’un objectif (prototype : explorer-modele.js)', () => {
  it('écarte les mots vides, ramène les pluriels et ajoute les synonymes', () => {
    expect(decouper('Je veux mettre en place des rdv')).toEqual([['rdv', 'rendez', 'vou']]);
    expect(decouper('Mes Factures')).toEqual([['facture']]);
    expect(decouper('')).toEqual([]);
  });

  it('compte 3 par mot du titre, 1 ailleurs, 0 si un mot manque', () => {
    const g = indexer(guide());
    expect(score(g.titrePlie, g.textePlie, decouper('réservation'))).toBe(3);
    expect(score(g.titrePlie, g.textePlie, decouper('formulaire'))).toBe(1);
    expect(score(g.titrePlie, g.textePlie, decouper('formulaire logo'))).toBe(0);
    expect(score(g.titrePlie, g.textePlie, [])).toBe(1);
  });

  it('surligne les mots trouvés, texte échappé et typographie appliquée', () => {
    expect(surligner('Prise de rendez-vous : <en ligne>', decouper('rdv'))).toBe(
      'Prise de <mark>rendez</mark>-<mark>vous</mark> : &lt;en ligne&gt;',
    );
  });
});

describe('Index des guides', () => {
  it('filtre par domaine, trie par activité et compte les outils de la personne', () => {
    const a = indexer(guide({ id: 1, slug: 'a', activite: 2 }));
    const b = indexer(guide({ id: 2, slug: 'b', activite: 9 }));
    const c = indexer(
      guide({
        id: 3,
        slug: 'c',
        activite: 5,
        domaine: DOMAINES[1] as DomaineApi,
        domaines: ['image-et-illustration'],
      }),
    );
    const tous = guidesRetenus([a, b, c], [], '', 'actifs', new Set());
    expect(tous.visibles.map((g) => g.slug)).toEqual(['b', 'c', 'a']);
    const images = guidesRetenus([a, b, c], [], 'image-et-illustration', 'actifs', new Set());
    expect([images.trouves.length, images.visibles.map((g) => g.slug)]).toEqual([3, ['c']]);
    expect(compatibilite(a, new Set())).toBeNull();
    expect(compatibilite(a, new Set(['claude', 'midjourney']))).toEqual(['Claude Sonnet 4.5']);
    expect(compatibilite(a, new Set(['midjourney']))).toEqual([]);
  });

  it('montre dans le héros le guide qui correspond, sinon un aperçu de trois parcours au moins', () => {
    const petit = guide({ slug: 'petit', parcours: 2 });
    const grand = guide({ slug: 'grand', parcours: 4 });
    const apercus = guidesEnApercu([petit, grand]);
    expect(apercus.map((g) => g.slug)).toEqual(['grand']);
    expect(apercuActif('', [], apercus, [petit, grand])).toBe('grand');
    expect(apercuActif('logo', [], apercus, [petit, grand])).toBe('none');
    expect(apercuActif('rdv', [petit], apercus, [petit, grand])).toBe('petit');
  });

  it('résume l’index comme le prototype', () => {
    expect(sousTitre('', 11, { parcours: 36, reproductions: 303 })).toBe(
      '11 guides · 36 parcours documentés · 303 reproductions déclarées',
    );
    expect(sousTitre('rdv', 1, { parcours: 36, reproductions: 303 })).toBe(
      '1 guide correspond à « rdv »',
    );
    expect(sousTitre('podcast', 0, { parcours: 36, reproductions: 303 })).toBe(
      'Aucun guide pour « podcast »',
    );
  });
});

describe('Adresse d’Explorer', () => {
  it('lit le domaine par son adresse ou son libellé, et ignore un tri inconnu', () => {
    const lue = lireAdresse(
      new URLSearchParams('categorie=Image%20et%20illustration&tri=inconnu'),
      DOMAINES,
    );
    expect(lue).toEqual({ guide: null, q: '', domaine: 'image-et-illustration', tri: 'actifs' });
    expect(
      lireAdresse(new URLSearchParams('categorie=application-web&tri=fiables'), DOMAINES),
    ).toMatchObject({
      domaine: 'application-web',
      tri: 'fiables',
    });
  });

  it('écrit l’adresse d’un guide seule, sinon la recherche, le domaine et le tri', () => {
    expect(
      ecrireAdresse({ guide: 'rendez-vous', q: 'rdv', domaine: 'video', tri: 'recents' }),
    ).toBe('?guide=rendez-vous');
    expect(ecrireAdresse({ guide: null, q: 'logo', domaine: '', tri: 'actifs' })).toBe('?q=logo');
    expect(ecrireAdresse({ guide: null, q: '', domaine: '', tri: 'actifs' })).toBe('');
  });
});

describe('Parcours d’un guide', () => {
  it('décrit la forme du parcours et ses moments clés (prototype : runShape, traceHTML)', () => {
    expect(forme(parcours())).toBe('3 échanges · 2 moments clés');
    expect(forme(parcours({ type: 'UN_PROMPT', essais: 4, moments: [] }))).toBe(
      '1 prompt, 4 essais · sans moment clé',
    );
    expect(forme(parcours({ type: 'PROJET', etapes: ['Lister', 'Classer'], moments: [] }))).toBe(
      '2 étapes · sans moment clé',
    );
    expect(trace(parcours())).toBe(
      '<span class="ex-trace" aria-hidden="true"><i class=""></i><i class="is-moment"></i><i class="is-moment"></i></span>',
    );
  });

  it('présente la preuve selon RG-43 : taux à partir de 3 reproductions', () => {
    expect(preuve(parcours())).toContain('<b>75 %</b> sur 4 reproductions');
    expect(
      preuve(parcours({ reproductions: { total: 2, reussies: 2, tauxReussite: null } })),
    ).toContain('2 reproductions');
    expect(
      preuve(parcours({ reproductions: { total: 0, reussies: 0, tauxReussite: null } })),
    ).toContain('Pas encore reproduit');
    expect(preuve(parcours({ type: 'PROJET' }))).toContain('ne se reproduit pas');
  });

  it('date les événements comme le prototype (relativeDay)', () => {
    const maintenant = new Date('2026-10-27T10:00:00Z');
    expect(jourRelatif('2026-10-27T08:00:00Z', maintenant)).toBe('aujourd’hui');
    expect(jourRelatif('2026-10-26T23:00:00Z', maintenant)).toBe('hier');
    expect(jourRelatif('2026-10-24T08:00:00Z', maintenant)).toBe('il y a 3 jours');
    expect(jourRelatif('2026-10-02T08:00:00Z', maintenant)).toBe('le 2 oct.');
  });
});
