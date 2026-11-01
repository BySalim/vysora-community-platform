import type { CasApi, CasResumeApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  creerModele,
  creerPages,
  entetePage,
  lireVue,
  progressionDuServeur,
  progressionVide,
  typographier,
} from './pages';
import type { DonneesPageApprendre } from './types';

const cas = (valeurs: Partial<CasResumeApi> = {}): CasResumeApi =>
  ({
    id: 418,
    slug: 'un-script-pret-a-lancer',
    titre: 'Un script prêt à lancer ?',
    contexte: 'Un script doit renommer 800 photos.',
    difficulte: 'INTERMEDIAIRE',
    domaine: { libelle: 'Code et scripts', slug: 'code-et-scripts' },
    dureeMinutes: 5,
    reussite: 62,
    reponses: 40,
    utiles: 12,
    date: '2026-10-10T10:00:00Z',
    auteur: { id: 1, pseudo: 'mariam-diop', nom: 'Mariam Diop', avatar: null },
    outil: null,
    modele: null,
    maReponse: null,
    ...valeurs,
  }) as CasResumeApi;

const donnees = (valeurs: Partial<DonneesPageApprendre> = {}): DonneesPageApprendre => ({
  cas: [cas()],
  outils: [],
  guides: [],
  domaines: [{ libelle: 'Code et scripts', slug: 'code-et-scripts', icone: 'code' }],
  casOuvert: null,
  casComplet: null,
  aujourdhui: '2026-11-01',
  chiffres: { sujets: 0, outils: 0 },
  progression: null,
  complements: null,
  ...valeurs,
});

describe('pages d’Apprendre rendues par le serveur (APP-03)', () => {
  it('donne à chaque page son titre, sa description et son adresse canonique', () => {
    expect(entetePage(new URLSearchParams('savoir=demande-claire'))).toMatchObject({
      titre: 'Une demande claire : l’objectif, le contexte, les limites · Apprendre',
      canonique: '/apprendre?savoir=demande-claire',
      nonIndexee: false,
    });
    expect(entetePage(new URLSearchParams('rubrique=regles'))).toMatchObject({
      titre: 'Règles · Apprendre',
      canonique: '/apprendre?rubrique=regles',
    });
    // La progression d'une personne ne s'indexe pas ; un savoir inconnu ramène à Apprendre.
    expect(entetePage(new URLSearchParams('vue=progression')).nonIndexee).toBe(true);
    expect(entetePage(new URLSearchParams('savoir=inconnu'))).toMatchObject({
      titre: 'Apprendre',
      canonique: '/apprendre',
    });
  });

  it('lit la vue demandée par l’adresse, comme le script', () => {
    const m = creerModele(donnees());
    expect(lireVue(m, new URLSearchParams('savoir=agent'))).toEqual({
      view: 'savoir',
      id: 'agent',
      rubrique: 'notions',
    });
    expect(lireVue(creerModele(donnees({ casOuvert: 418 })), new URLSearchParams())).toEqual({
      view: 'cas',
      id: '418',
      rubrique: 'bon-reflexe',
    });
    expect(lireVue(m, new URLSearchParams('rubrique=inconnue')).view).toBe('accueil');
  });

  it('rend une page de savoir et une page de cas complètes', () => {
    const complet = {
      id: 418,
      demandeIa: 'Écris un script qui renomme mes photos.',
      reponseIa: 'Voici le script, prêt à lancer.',
      question: 'Que faites-vous ?',
      options: [
        { id: 1, libelle: 'Le lancer tel quel' },
        { id: 2, libelle: 'Le tester sur une copie' },
      ],
      outil: null,
      modele: null,
      modeleNonReference: null,
      moi: null,
    } as unknown as CasApi;
    const m = creerModele(donnees({ casOuvert: 418, casComplet: complet }));
    const progression = progressionVide();
    const pages = creerPages(m, { progress: () => progression, today: '2026-11-01' });

    const savoir = typographier(pages.savoirHTML(m.byId['demande-claire']!));
    expect(savoir).toContain('data-ap-h1>Une demande claire');
    expect(savoir).toContain('Marquer comme acquis');
    expect(savoir).toContain('3 min de lecture');

    const page = pages.casHTML(m.caseById['418']!);
    // Le cas complet posé par le serveur est rendu avec ses options, sans attendre l'API.
    expect(page).not.toContain('data-ap-case-load');
    expect(page).toContain('data-ap-quiz="cas:418"');
    expect(page).toContain('Le tester sur une copie');
  });

  it('reprend la progression du compte d’un membre, rien pour un visiteur', () => {
    expect(progressionDuServeur(creerModele(donnees()))).toEqual(progressionVide());
    const p = progressionDuServeur(
      creerModele(
        donnees({
          cas: [cas({ maReponse: { correcte: true } } as Partial<CasResumeApi>)],
          progression: {
            acquis: { agent: '2026-10-20' },
            verifications: { agent: { choix: 1, correcte: true, date: '2026-10-20' } },
          },
        }),
      ),
    );
    expect(p).toEqual({
      acquis: { agent: '2026-10-20' },
      checks: { agent: { choice: 1, right: true, date: '2026-10-20' } },
      cas: { '418': { choice: -1, right: true, date: '2026-11-01' } },
    });
  });

  it('montre les moments clés choisis par l’équipe et le sujet du forum lié', () => {
    const m = creerModele(
      donnees({
        complements: {
          illustrations: {
            'demande-claire': [
              {
                id: 1,
                creation: {
                  id: 12,
                  slug: 'lettre-de-motivation',
                  titre: 'Lettre de motivation sans formules toutes faites',
                  type: 'ITERATION',
                  couverture: null,
                  resultat: { nature: 'TEXTE', extrait: 'Madame, Monsieur,', nom: null },
                  auteur: { id: 3, pseudo: 'yacine-benali', nom: 'Yacine Benali', avatar: null },
                  outil: null,
                } as never,
                moment: { id: 7, type: 'CORRECTION', titre: null, texte: 'Des faits précis.' },
                note: null,
              },
            ],
          },
          sujets: {
            'demande-claire': {
              id: 6,
              slug: 'ton-naturel',
              titre: 'Comment garder un ton naturel ?',
              typeSujet: 'DISCUSSION',
              etat: 'RESOLU',
            },
          },
        },
      }),
    );
    const progression = progressionVide();
    const pages = creerPages(m, { progress: () => progression, today: '2026-11-01' });
    const html = pages.savoirHTML(m.byId['demande-claire']!);
    expect(html).toContain('Vu dans la communauté');
    expect(html).toContain('Un moment clé publié par un membre');
    expect(html).toContain(
      'Correction<span aria-hidden="true">·</span><a href="/creations/12-lettre-de-motivation">',
    );
    expect(html).toContain('<div class="mock-paper"><p>Madame, Monsieur,</p></div>');
    expect(html).toContain('href="/forum/6-ton-naturel"');
    expect(html).toContain('Au forum · Discussion, résolue');
    // Un savoir sans complément n'a ni le bloc ni le lien.
    expect(pages.savoirHTML(m.byId.agent!)).not.toContain('Vu dans la communauté');
  });

  it('corrige la typographie du texte sans toucher aux balises', () => {
    expect(typographier('<p title="a : b">Il reste 3 min : vite !</p>')).toBe(
      '<p title="a : b">Il reste 3 min : vite !</p>',
    );
  });
});
