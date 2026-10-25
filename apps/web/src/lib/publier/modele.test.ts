import {
  schemaContenuCreation,
  type CreationFicheApi,
  type EtapeApi,
  type MediaApi,
} from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { creerImport } from './import';
import {
  categorieProposee,
  controler,
  depuisFiche,
  nouveauBrouillon,
  nouveauPrompt,
  nouveauResultat,
  nouvelleEtape,
  reporterIdentifiants,
  sensibles,
  typeDe,
  typeLien,
  versContenu,
  type Brouillon,
  type OutilEditeur,
  type Referentiels,
} from './modele';

const outil = (id: number, nom: string, valeurs: Partial<OutilEditeur> = {}): OutilEditeur => ({
  id,
  nom,
  logo: null,
  logoMonochrome: false,
  famille: 'ASSISTANT',
  alias: [],
  estAgent: false,
  modeles: [],
  ...valeurs,
});

const refs: Referentiels = {
  outils: [
    outil(1, 'ChatGPT', {
      alias: ['GPT-5'],
      modeles: [
        { id: 10, nom: 'GPT-5', nomCourt: 'GPT-5' },
        { id: 11, nom: 'GPT Image 1', nomCourt: 'GPT Image 1' },
      ],
    }),
    outil(2, 'Midjourney', { famille: 'IMAGE', modeles: [{ id: 20, nom: 'v7', nomCourt: 'v7' }] }),
    outil(3, 'Cursor', { famille: 'CODE', estAgent: true }),
  ],
  categories: [
    { id: 1, libelle: 'Texte et rédaction', slug: 'texte', icone: 'pen' },
    { id: 2, libelle: 'Image et illustration', slug: 'image', icone: 'image' },
    { id: 3, libelle: 'Code et scripts', slug: 'code', icone: 'code' },
  ],
  licences: [
    {
      id: 7,
      code: 'CC-BY-4.0',
      libelle: 'CC BY 4.0',
      resume: null,
      url: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
      autoriseVariantes: true,
      estParDefaut: true,
    },
  ],
};
const contexte = { liensMaximum: 10 };

/** Brouillon dont le chemin est donné en prompts (outil, texte) et en étapes (« # titre »). */
function brouillon(chemin: ([number | null, string] | string)[] = []): Brouillon {
  const d = nouveauBrouillon(7);
  d.chemin = chemin.map((x) =>
    typeof x === 'string'
      ? nouvelleEtape(d, { titre: x.slice(2) })
      : nouveauPrompt(d, { outilId: x[0], prompt: x[1] }),
  );
  return d;
}

/** Brouillon publiable : titre, objectif, résultat, catégorie. */
function complet(chemin: ([number | null, string] | string)[]): Brouillon {
  const d = brouillon(chemin);
  Object.assign(d, {
    titre: 'Affiche typographique de Gorée',
    objectif: 'Une affiche lisible, construite autour du nom du lieu.',
    categorieId: 2,
  });
  d.resultats.push(nouveauResultat(d, 'texte', { texte: 'Le texte obtenu.' }));
  return d;
}

describe('type de création déduit du chemin (nouvelle-creation.js : typeDe)', () => {
  it('suit le nombre de prompts, d’outils et d’étapes', () => {
    expect(typeDe(brouillon([[1, '']]))).toBeNull();
    expect(typeDe(brouillon([[1, 'Un prompt']]))).toBe('UN_PROMPT');
    expect(
      typeDe(
        brouillon([
          [1, 'Premier'],
          [1, 'Second'],
        ]),
      ),
    ).toBe('ITERATION');
    expect(
      typeDe(
        brouillon([
          [1, 'Premier'],
          [2, 'Second'],
        ]),
      ),
    ).toBe('PROJET');
    expect(typeDe(brouillon(['# Préparer']))).toBe('PROJET');
  });

  it('reconnaît le type d’un lien d’après son adresse', () => {
    expect(typeLien('https://github.com/vysora/outil')).toBe('DEPOT_CODE');
    expect(typeLien('https://youtu.be/abc')).toBe('VIDEO');
    expect(typeLien('https://chatgpt.com/share/123')).toBe('PREUVE');
    expect(typeLien('https://exemple.example/demo')).toBe('DEMO');
    expect(typeLien('')).toBe('');
  });
});

describe('contenu envoyé à l’API (schemaContenuCreation)', () => {
  it('range une itération en une étape, avec une configuration par outil et les moments rattachés', () => {
    const d = complet([
      [1, 'Premier prompt'],
      [1, 'Second prompt'],
    ]);
    const [p1, p2] = d.chemin as [
      ReturnType<typeof nouveauPrompt>,
      ReturnType<typeof nouveauPrompt>,
    ];
    p1.modele = 'gpt-5';
    p2.reglages = 'Réflexion approfondie';
    p2.moment = { type: 'CORRECTION', titre: '', texte: 'J’ai corrigé la demande initiale.' };
    d.resultats.push(
      nouveauResultat(d, 'lien', { url: 'https://github.com/vysora/outil' }),
      nouveauResultat(d, 'lien', { url: 'htt' }),
    );
    const { contenu } = versContenu(d, refs);
    expect(schemaContenuCreation.safeParse(contenu).success).toBe(true);
    expect(contenu).toMatchObject({
      type: 'ITERATION',
      licenceId: 7,
      resultat: { nature: 'TEXTE', texte: 'Le texte obtenu.' },
      liens: [{ type: 'DEPOT_CODE', url: 'https://github.com/vysora/outil' }],
      etapes: [
        {
          titre: null,
          configurations: [
            {
              outilId: 1,
              modeleId: 10,
              modeleNonReference: null,
              parametres: 'Réflexion approfondie',
            },
          ],
          echanges: [
            { prompt: 'Premier prompt', configuration: 0 },
            { prompt: 'Second prompt', configuration: 0 },
          ],
          moments: [{ type: 'CORRECTION', echange: 1 }],
        },
      ],
    });
  });

  it('garde en texte libre un modèle absent du référentiel (RG-14)', () => {
    const d = complet([[2, 'Une affiche']]);
    (d.chemin[0] as ReturnType<typeof nouveauPrompt>).modele = 'v8 alpha';
    expect(versContenu(d, refs).contenu.etapes?.[0]?.configurations?.[0]).toMatchObject({
      outilId: 2,
      modeleId: null,
      modeleNonReference: 'v8 alpha',
    });
  });

  it('place les prompts d’un projet dans l’étape qui les précède, ceux du début dans une étape implicite', () => {
    const d = complet([
      [1, 'Avant toute étape'],
      '# Concevoir',
      [2, 'Une affiche'],
      '# Coder',
      [3, 'Le site'],
    ]);
    const envoi = versContenu(d, refs);
    expect(envoi.contenu.type).toBe('PROJET');
    expect(envoi.contenu.etapes?.map((e) => [e.titre, e.echanges?.length])).toEqual([
      [null, 1],
      ['Concevoir', 1],
      ['Coder', 1],
    ]);
    // Les identifiants rendus par l'API sont reportés pour les enregistrements suivants.
    reporterIdentifiants(d, envoi.groupes, {
      etapes: [
        { id: 101, echanges: [{ id: 1001 }] },
        { id: 102, echanges: [{ id: 1002 }] },
        { id: 103, echanges: [{ id: 1003 }] },
      ],
    } as unknown as CreationFicheApi);
    const suivant = versContenu(d, refs).contenu;
    expect(suivant.etapes?.map((e) => e.id)).toEqual([101, 102, 103]);
    expect(suivant.etapes?.map((e) => e.echanges?.[0]?.id)).toEqual([1001, 1002, 1003]);
  });

  it('envoie le type de la première publication, que le chemin ne change plus (RG-18)', () => {
    const d = complet([
      [1, 'Premier'],
      [1, 'Second'],
    ]);
    d.typeVerrouille = 'UN_PROMPT';
    expect(versContenu(d, refs).contenu.type).toBe('UN_PROMPT');
  });

  it('attend l’envoi des images et décrit d’abord celles dont la description a changé', () => {
    const d = complet([[1, 'Un prompt']]);
    d.resultats.push(
      nouveauResultat(d, 'fichier', { mediaId: 5, alt: 'Une affiche', altEnregistre: '' }),
      nouveauResultat(d, 'fichier', { envoi: true }),
    );
    const envoi = versContenu(d, refs);
    expect(envoi.contenu.images).toEqual([5]);
    expect(envoi.descriptions.map((f) => f.mediaId)).toEqual([5]);
  });
});

describe('contrôles de publication rapportés aux champs de l’éditeur', () => {
  it('annonce, dans l’ordre de la page, ce qui manque à un brouillon vide', () => {
    const erreurs = controler(brouillon([[null, '']]), refs, contexte);
    expect([...erreurs].map(([cle, e]) => [cle.replace(/p\d+/, 'p'), e.groupe, e.message])).toEqual(
      [
        ['titre', 'presentation', 'Donnez un titre à la création.'],
        ['objectif', 'presentation', 'Dites ce que vous vouliez obtenir.'],
        [
          'resultats',
          'resultat',
          'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.',
        ],
        ['chemin', 'chemin', 'Ajoutez au moins un prompt, avec l’outil utilisé.'],
        ['b:p:prompt', 'chemin', 'Collez le texte du prompt 1, ou retirez-le.'],
        ['o:p', 'chemin', 'Choisissez l’outil du prompt 1.'],
        ['categorie', 'categorie', 'Choisissez une catégorie.'],
      ],
    );
  });

  it('n’annonce rien pour une création complète', () => {
    expect(controler(complet([[1, 'Un prompt']]), refs, contexte).size).toBe(0);
  });

  it('demande le titre et le récit de chaque étape d’un projet, numérotées comme dans l’éditeur (RG-13)', () => {
    const d = complet(['# Concevoir', [2, 'Une affiche'], '# Code', [3, 'Le site']]);
    const [concevoir, , coder] = d.chemin;
    if (concevoir?.kind === 'etape') concevoir.texte = 'Trop court.';
    const erreurs = controler(d, refs, contexte);
    expect(erreurs.get(`b:${concevoir?.id}:texte`)?.message).toBe(
      'Racontez l’étape 1 en 50 caractères au moins (11 pour l’instant).',
    );
    expect(erreurs.get(`b:${coder?.id}:titre`)?.message).toBe(
      'Le titre de l’étape 2 doit compter au moins 5 caractères.',
    );
  });

  it('demande des étapes quand plusieurs outils font un projet', () => {
    const erreurs = controler(
      complet([
        [1, 'Un texte'],
        [2, 'Une image'],
      ]),
      refs,
      contexte,
    );
    expect(erreurs.get('chemin')?.message).toBe(
      'Avec plusieurs outils, la création devient un projet : ajoutez au moins deux étapes et placez chaque prompt sous la sienne.',
    );
    const avant = controler(
      complet([[1, 'Un texte'], '# Illustrer', [2, 'Une image']]),
      refs,
      contexte,
    );
    expect(avant.get('chemin')?.message).toBe(
      'Dans un projet, chaque prompt suit l’étape à laquelle il appartient : ajoutez une étape avant le prompt 1.',
    );
  });

  it('refuse de changer le type d’une création déjà publiée (RG-18)', () => {
    const d = complet([
      [1, 'Premier'],
      [1, 'Second'],
    ]);
    d.typeVerrouille = 'UN_PROMPT';
    expect(controler(d, refs, contexte).get('chemin')?.message).toBe(
      'Cette création a été publiée en « 1 prompt » : son type ne change plus. Gardez un seul prompt, avec un seul outil.',
    );
  });

  it('exige la description des images et une adresse valable pour chaque lien (ENF-01, RG-16)', () => {
    const d = complet([[1, 'Un prompt']]);
    const image = nouveauResultat(d, 'fichier', { mediaId: 5 });
    const lien = nouveauResultat(d, 'lien', { url: 'http://exemple.example' });
    d.resultats.push(image, lien);
    const erreurs = controler(d, refs, contexte);
    expect(erreurs.get(`r:${image.id}:alt`)?.message).toBe(
      'Décrivez l’image du résultat pour les personnes qui ne la voient pas.',
    );
    expect(erreurs.get(`r:${lien.id}:url`)?.message).toBe('L’adresse doit commencer par https://.');
  });

  it('rapporte les erreurs de l’API à leur champ', () => {
    const d = complet([[1, 'Un prompt']]);
    const erreurs = controler(d, refs, contexte, {
      'etapes.0.echanges.0.prompt': 'Ce prompt est trop long.',
    });
    expect(erreurs.get(`b:${d.chemin[0]?.id}:prompt`)?.message).toBe('Ce prompt est trop long.');
  });
});

describe('création de l’auteur ouverte dans l’éditeur', () => {
  const media = (id: number): MediaApi => ({
    id,
    url: `/api/v1/fichiers/${id}-1280.webp`,
    declinaisons: [{ largeur: 720, url: `/api/v1/fichiers/${id}-720.webp` }],
    largeur: 1280,
    hauteur: 960,
    texteAlternatif: 'Affiche',
    legende: null,
  });
  const configuration = (id: number, outilId: number) => ({
    id,
    outil: { id: outilId, nom: 'ChatGPT', slug: 'chatgpt', logo: null, logoMonochrome: false },
    modele: { id: 10, nom: 'GPT-5', nomCourt: 'GPT-5' },
    modeleNonReference: null,
    parametres: null,
    contexteCache: null,
  });
  const etape: EtapeApi = {
    id: 40,
    ordre: 1,
    titre: null,
    recit: null,
    configurations: [configuration(50, 1)],
    echanges: [1, 2].map((id) => ({
      id: 60 + id,
      ordre: id,
      titre: id === 1 ? 'Composer' : null,
      prompt: `Prompt ${id}`,
      reponse: id === 2 ? 'La réponse.' : null,
      nbEssais: 1,
      modeSelection: 'PREMIER_ESSAI' as const,
      configurationId: 50,
      images: id === 2 ? [media(9)] : [],
    })),
    moments: [
      {
        id: 70,
        type: 'VERIFICATION',
        titre: 'Vérifier',
        explication: 'J’ai vérifié la date.',
        echangeId: 62,
      },
    ],
  };
  const fiche = {
    id: 33,
    slug: 'affiche',
    type: 'ITERATION',
    statut: 'PUBLIEE',
    titre: 'Affiche typographique',
    objectif: 'Une affiche lisible.',
    limites: null,
    formatResultat: 'Portrait · 3:4',
    aAdapter: ['Le nom du lieu'],
    dateCreation: '2026-10-01T10:00:00.000Z',
    datePublication: '2026-10-02T10:00:00.000Z',
    dateModification: '2026-10-03T10:00:00.000Z',
    categorie: { id: 2, libelle: 'Image et illustration', slug: 'image', icone: 'image' },
    licence: { code: 'CC-BY-4.0', libelle: 'CC BY 4.0', url: '', autoriseVariantes: true },
    etiquettes: [{ libelle: 'Affiche', slug: 'affiche' }],
    avertissementAgent: 'AUCUN',
    images: [media(8)],
    resultat: null,
    liens: [{ type: 'DEMO', url: 'https://exemple.example', libelle: null }],
    etapes: [etape],
  } as unknown as CreationFicheApi;

  it('retrouve le résultat, le chemin et ce que l’éditeur ne montre pas', () => {
    const d = depuisFiche(fiche, refs);
    expect(d).toMatchObject({
      creationId: 33,
      statut: 'publiee',
      typeVerrouille: 'ITERATION',
      licenceId: 7,
      aAdapter: 'Le nom du lieu',
      etapeImpliciteId: 40,
    });
    expect(d.resultats.map((r) => r.kind)).toEqual(['fichier', 'lien']);
    expect(
      d.chemin.map((x) => (x.kind === 'prompt' ? [x.outilId, x.modele, x.titre] : x.kind)),
    ).toEqual([
      [1, 'GPT-5', 'Composer'],
      [1, 'GPT-5', ''],
    ]);
    // Renvoyée telle quelle, elle garde ses identifiants, ses titres et ses images.
    const { contenu } = versContenu(d, refs, true);
    expect(contenu).toMatchObject({
      type: 'ITERATION',
      images: [8],
      etapes: [
        {
          id: 40,
          configurations: [{ outilId: 1, modeleId: 10 }],
          echanges: [
            { id: 61, titre: 'Composer' },
            { id: 62, images: [9] },
          ],
          moments: [{ type: 'VERIFICATION', titre: 'Vérifier', echange: 1 }],
        },
      ],
      confirmationDonnees: true,
    });
  });
});

describe('repérages de l’éditeur (F-18, F-19, C-02)', () => {
  it('signale les données sensibles sous leur champ', () => {
    const d = brouillon([[1, 'Écris à awa@example.com avec la clé sk-proj-abcdefghijklmnop1234']]);
    expect(sensibles(d).map((s) => [s.type, s.valeur])).toEqual([
      ['Clé d’API', 'sk-proj-abcdefghijklmnop1234'],
      ['Adresse e-mail', 'awa@example.com'],
    ]);
  });

  it('propose une catégorie d’après le résultat et l’outil', () => {
    const d = brouillon([[2, 'Une affiche']]);
    expect(categorieProposee(d, refs)?.libelle).toBe('Image et illustration');
    d.resultats.push(nouveauResultat(d, 'code', { texte: 'print(1)' }));
    expect(categorieProposee(d, refs)?.libelle).toBe('Code et scripts');
  });

  it('découpe une conversation collée en prompts, avec l’outil et le modèle cités', () => {
    const { decouper } = creerImport(refs.outils);
    const r = decouper(
      'Vous avez dit : Écris un slogan.\nChatGPT a dit : Voici trois slogans.\nVous : Plus court, avec GPT-5.\nChatGPT : « Voir, puis créer. »',
    );
    expect(r.echanges).toEqual([
      { prompt: 'Écris un slogan.', reponse: 'Voici trois slogans.', outilId: 1 },
      { prompt: 'Plus court, avec GPT-5.', reponse: '« Voir, puis créer. »', outilId: 1 },
    ]);
    expect([r.outilId, r.modele]).toEqual([1, 'GPT-5']);
    expect(decouper('/imagine prompt: une affiche --ar 3:4 --v 7')).toMatchObject({
      echanges: [{ prompt: 'une affiche --ar 3:4 --v 7', outilId: 2 }],
      reglages: '--ar 3:4 --v 7',
      outilId: 2,
      modele: 'v7',
    });
  });
});
