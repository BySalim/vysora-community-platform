import type { CasResumeApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { creerModele, creerPages, progressionVide, type Progression } from './pages';
import type { DonneesPageApprendre } from './types';
import { creerVues, filtresDeDepart } from './vues';

const donnees: DonneesPageApprendre = {
  cas: [
    {
      id: 416,
      slug: 'des-ventes-en-hausse',
      titre: 'Des ventes en hausse ?',
      contexte: 'Les ventes passent de 120 à 150 commandes.',
      difficulte: 'DEBUTANT',
      domaine: null,
      dureeMinutes: null,
      reussite: 70,
      reponses: 20,
      utiles: 4,
      date: '2026-10-10T10:00:00Z',
      auteur: { id: 1, pseudo: 'mariam-diop', nom: 'Mariam Diop', avatar: null },
      outil: null,
      modele: null,
      maReponse: null,
    } as unknown as CasResumeApi,
  ],
  outils: [
    {
      id: 1,
      nom: 'Midjourney',
      slug: 'midjourney',
      logo: null,
      logoMonochrome: false,
      famille: 'IMAGE',
    },
  ],
  guides: [],
  domaines: [],
  casOuvert: null,
  casComplet: null,
  aujourdhui: '2026-11-01',
  chiffres: { sujets: 17, outils: 64 },
  progression: null,
  complements: null,
};

function vues(
  options: { mesOutils?: string[]; peutProposer?: boolean; progression?: Progression } = {},
) {
  const m = creerModele(donnees);
  const progression = options.progression ?? progressionVide();
  const etat = { progress: () => progression, today: donnees.aujourdhui };
  return creerVues(m, creerPages(m, etat), filtresDeDepart(), {
    ...etat,
    mesOutils: () => options.mesOutils ?? [],
    peutProposer: () => options.peutProposer ?? false,
  });
}

describe('vue d’ensemble et rubriques d’Apprendre rendues par le serveur (APP-03)', () => {
  it('rend la vue d’ensemble : titre, frise des bases, cas du jour, journal', () => {
    const html = vues().accueilHTML();
    expect(html).toContain('data-ap-h1>Apprendre à créer avec l’IA</h1>');
    expect(html).toContain('data-ap-frise');
    expect(html).toContain('Cas Bon réflexe du jour');
    expect(html).toContain('id="journal"');
    expect(html).toContain('<b>17</b> sujets');
  });

  it('marque la rubrique ouverte et compte la progression', () => {
    const v = vues({
      progression: { ...progressionVide(), acquis: { 'demande-claire': '2026-10-20' } },
    });
    expect(v.onglets('rubrique', 'regles')).toContain(
      'href="/apprendre?rubrique=regles" data-ap-nav aria-current="page"',
    );
    expect(v.onglets('savoir', 'regles')).toContain('aria-current="true"');
    expect(v.lienProgression()).toContain('1<span class="sr-only"> savoirs acquis</span>');
  });

  it('propose un cas seulement à qui en a le droit (RG-70)', () => {
    expect(vues().RUBRIQUES['bon-reflexe']()).not.toContain('Proposer un cas');
    expect(vues({ peutProposer: true }).RUBRIQUES['bon-reflexe']()).toContain('Proposer un cas');
  });

  it('place les astuces des outils choisis en premier', () => {
    const astuces = vues({ mesOutils: ['midjourney'] }).RUBRIQUES.astuces();
    const premier = astuces.indexOf('ap-toolgroup is-mine');
    expect(premier).toBeGreaterThan(-1);
    expect(premier).toBeLessThan(astuces.indexOf('class="ap-toolgroup"'));
    expect(astuces).toContain('Votre outil');
  });
});
