import {
  chiffresDu,
  cleModele,
  guidesProches,
  modelesDu,
  souventCherches,
  tauxDeReussite,
  type GuideLu,
  type OutilModeleLu,
  type ParcoursLu,
  type ReproductionLue,
} from './chiffres-guides.js';

const outil = (id: number, nom: string) => ({
  id,
  nom,
  slug: nom.toLowerCase(),
  logo: null,
  logoMonochrome: false,
});
const CLAUDE: OutilModeleLu = {
  outil: outil(1, 'Claude'),
  modeleId: 10,
  modeleNom: 'Claude Sonnet 4.5',
  modeleCourt: 'Sonnet 4.5',
  modeleTexte: null,
};
const GPT: OutilModeleLu = {
  outil: outil(2, 'ChatGPT'),
  modeleId: 20,
  modeleNom: 'GPT-5',
  modeleCourt: 'GPT-5',
  modeleTexte: null,
};
const jour = (n: number) => new Date(Date.UTC(2026, 9, n, 12));
const essai = (
  configuration: OutilModeleLu,
  resultat: ReproductionLue['resultat'],
  date: Date,
): ReproductionLue => ({ ...configuration, resultat, date });

const parcours = (id: number, valeurs: Partial<ParcoursLu> = {}): ParcoursLu => ({
  id,
  slug: null,
  type: 'UN_PROMPT',
  titre: `Parcours ${id}`,
  objectif: 'Permettre aux clientes de choisir un créneau.',
  categorie: { libelle: 'Application web', slug: 'application-web' },
  auteurId: id * 100,
  datePublication: jour(id),
  utiles: 0,
  utilesSemaine: 0,
  configurations: [CLAUDE],
  reproductions: [],
  obsolescence: null,
  etiquettes: [],
  couverture: null,
  prompt: null,
  ...valeurs,
});

const guide = (valeurs: Partial<GuideLu> = {}): GuideLu => ({
  id: 1,
  slug: 'rendez-vous',
  titre: 'Mettre en place la prise de rendez-vous en ligne',
  titreCourt: 'Prise de rendez-vous en ligne',
  motsCles: ['réservation'],
  lacunes: [],
  domaine: {
    id: 1,
    libelle: 'Application web',
    slug: 'application-web',
    icone: 'browser',
    description: null,
  },
  parcours: [1, 2, 3],
  sujets: [],
  cas: [],
  etapes: [],
  pieges: [],
  ...valeurs,
});

describe('Chiffres des guides d’Explorer (DEC-01)', () => {
  it('nomme un modèle comme le prototype : référentiel, sinon outil et texte, sinon outil seul', () => {
    expect(cleModele(CLAUDE)).toBe('Claude Sonnet 4.5');
    expect(cleModele({ ...GPT, modeleId: null, modeleNom: null, modeleTexte: 'o4' })).toBe(
      'ChatGPT o4',
    );
    expect(cleModele({ ...GPT, modeleId: null, modeleNom: null, modeleCourt: null })).toBe(
      'ChatGPT',
    );
  });

  it('RG-43 : taux de réussite à partir de 3 reproductions, arrondi', () => {
    expect(tauxDeReussite(2, 2)).toBeNull();
    expect(tauxDeReussite(3, 2)).toBe(67);
    expect(tauxDeReussite(0, 0)).toBeNull();
  });

  it('compte les reproductions des parcours reproductibles et l’activité de la semaine (RG-32)', () => {
    const tous = new Map([
      [
        1,
        parcours(1, {
          utilesSemaine: 4,
          reproductions: [essai(GPT, 'SUCCES', jour(12)), essai(CLAUDE, 'ECHEC', jour(10))],
        }),
      ],
      [2, parcours(2, { utilesSemaine: 1, reproductions: [essai(CLAUDE, 'SUCCES', jour(11))] })],
      // Un projet se consulte : ses reproductions ne comptent pas.
      [3, parcours(3, { type: 'PROJET', reproductions: [essai(CLAUDE, 'SUCCES', jour(13))] })],
    ]);
    const c = chiffresDu(guide(), tous);
    expect([c.reproductions, c.reussies, c.tauxReussite, c.activite]).toEqual([3, 2, 67, 5]);
    expect(c.auteurs).toEqual([100, 200, 300]);
    expect(c.recent).toEqual(jour(3));
    // La dernière réussite et la mise à jour suivent la reproduction la plus récente.
    expect(c.derniereReussite).toEqual({ date: jour(13), modele: 'Claude Sonnet 4.5' });
    expect(c.miseAJour).toEqual(jour(13));
  });

  it('ne garde que les parcours lus, dans l’ordre du guide, et trie les pièges par parcours visibles', () => {
    const tous = new Map([
      [1, parcours(1)],
      [3, parcours(3, { obsolescence: { modele: 'GPT-5', membres: 3 } })],
    ]);
    const c = chiffresDu(
      guide({
        parcours: [3, 2, 1],
        etapes: [{ id: 7, titre: 'Décrire', conseil: '…', sources: [1, 2, 3], citation: null }],
        pieges: [
          {
            id: 1,
            ordre: 0,
            titre: 'Rare',
            solution: '…',
            etapeId: null,
            sujetId: null,
            casId: null,
            sources: [2, 3],
          },
          {
            id: 2,
            ordre: 1,
            titre: 'Fréquent',
            solution: '…',
            etapeId: 7,
            sujetId: null,
            casId: null,
            sources: [1, 3],
          },
        ],
      }),
      tous,
    );
    expect(c.parcours.map((p) => p.id)).toEqual([3, 1]);
    expect(c.pieges.map((p) => [p.titre, p.sources])).toEqual([
      ['Fréquent', [1, 3]],
      ['Rare', [3]],
    ]);
    expect(c.etapes).toEqual([{ id: 7, titre: 'Décrire', suivie: 2, piege: true }]);
    expect(c.obsolescence).toEqual({ parcours: 1, modele: 'GPT-5' });
  });

  it('liste les modèles employés et reproduits, des plus reproduits aux moins reproduits', () => {
    const modeles = modelesDu([
      parcours(1, { reproductions: [essai(GPT, 'SUCCES', jour(5)), essai(GPT, 'ECHEC', jour(6))] }),
      parcours(2, { configurations: [GPT], reproductions: [essai(GPT, 'SUCCES', jour(8))] }),
    ]);
    expect(modeles.map((m) => [m.cle, m.employe, m.reproduit, m.derniere])).toEqual([
      ['GPT-5', [2], [1, 2], jour(8).toISOString()],
      ['Claude Sonnet 4.5', [1], [], null],
    ]);
  });

  it('propose les guides proches : même domaine, domaine voisin, puis outils communs', () => {
    const g = (id: number, domaine: string, outils: string[], activite = 0) => ({
      id,
      domaine,
      outils: new Set(outils),
      activite,
    });
    const actuel = g(1, 'application-web', ['claude', 'chatgpt']);
    const proches = guidesProches(actuel, [
      actuel,
      g(2, 'video', ['claude', 'chatgpt'], 50),
      g(3, 'code-et-scripts', [], 10),
      g(4, 'application-web', [], 1),
      g(5, 'musique-et-son', ['claude'], 90),
    ]);
    expect(proches.map((p) => p.id)).toEqual([4, 3, 2]);
  });

  it('« Souvent cherché » : premier mot-clé des guides les plus actifs, sans doublon', () => {
    expect(
      souventCherches(
        [
          { motsCles: ['logo'], activite: 5 },
          { motsCles: ['réservation', 'rdv'], activite: 9 },
          { motsCles: [], activite: 7 },
          { motsCles: ['logo'], activite: 1 },
        ],
        6,
      ),
    ).toEqual(['réservation', 'logo']);
  });
});
