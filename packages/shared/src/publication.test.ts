import { describe, expect, it } from 'vitest';
import { liensMaximum, ETAT_VISITEUR } from './permissions';
import {
  conditionsPublication,
  controlerPublication,
  type CreationAControler,
} from './publication';
import { erreursParChamp } from './schemas/commun';
import { dansLeDelai } from './texte';
import { schemaContenuCreation } from './schemas/creations';

const contexte = { liensMaximum: 10 };
const decrite = { texteAlternatif: 'Affiche bleue' };

/** « 1 prompt » complet : publiable tel quel. */
const unPrompt = (): CreationAControler => ({
  type: 'UN_PROMPT',
  titre: 'Affiche typographique de Gorée',
  objectif: 'Une affiche lisible, construite autour du nom du lieu.',
  categorieId: 1,
  resultat: null,
  images: [],
  liens: [],
  etapes: [
    {
      titre: null,
      recit: null,
      configurations: [{ outilId: 1 }],
      echanges: [
        {
          prompt: 'Affiche de Gorée',
          reponse: 'Voici l’affiche.',
          configuration: null,
          images: [],
        },
      ],
      moments: [],
    },
  ],
});

const etapeDeProjet = (titre: string) => ({
  titre,
  recit: 'Ce que j’ai fait à cette étape, et pourquoi, en cinquante caractères au moins.',
  configurations: [{ outilId: 2 }],
  echanges: [{ prompt: 'Un prompt', reponse: null, configuration: null, images: [] }],
  moments: [],
});

describe('controlerPublication (CREA-05)', () => {
  it('accepte une création complète', () => {
    expect(controlerPublication(unPrompt(), contexte)).toEqual({});
  });

  it('RG-10 : titre, objectif, catégorie et outil, avec les messages de l’éditeur', () => {
    const creation = { ...unPrompt(), titre: 'Court', objectif: null, categorieId: null };
    creation.etapes[0]!.configurations = [{ outilId: null }];
    expect(controlerPublication(creation, contexte)).toEqual({
      titre: 'Le titre doit compter au moins 10 caractères (5 pour l’instant).',
      objectif: 'Dites ce que vous vouliez obtenir.',
      etapes: 'Ajoutez au moins un prompt, avec l’outil utilisé.',
      'etapes.0.configurations.0.outilId': 'Choisissez l’outil du prompt 1.',
      categorieId: 'Choisissez une catégorie.',
    });
  });

  it('décision du 24 octobre : le résultat est exigé, à la création ou dans le dernier échange', () => {
    const sansResultat = unPrompt();
    sansResultat.etapes[0]!.echanges[0]!.reponse = null;
    expect(controlerPublication(sansResultat, contexte)).toEqual({
      resultat: 'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.',
    });
    for (const complement of [
      { images: [decrite] },
      { resultat: { texte: 'print("ok")' } },
      { liens: [{ type: 'DEPOT_CODE' as const }] },
    ])
      expect(controlerPublication({ ...sansResultat, ...complement }, contexte)).toEqual({});
    // Un lien de preuve ou d'article ne montre pas le résultat.
    expect(
      controlerPublication({ ...sansResultat, liens: [{ type: 'PREUVE' }] }, contexte),
    ).toHaveProperty('resultat');
    // Pour un projet, la réponse d'un échange ne suffit pas (RG-13).
    const projet: CreationAControler = {
      ...unPrompt(),
      type: 'PROJET',
      etapes: [etapeDeProjet('Préparer'), etapeDeProjet('Construire')],
    };
    projet.etapes[1]!.echanges[0]!.reponse = 'Réponse';
    expect(controlerPublication(projet, contexte)).toHaveProperty('resultat');
  });

  it('ENF-01 : chaque image est décrite', () => {
    const creation = { ...unPrompt(), images: [{ texteAlternatif: ' ' }, decrite] };
    creation.etapes[0]!.echanges[0]!.images = [{ texteAlternatif: null }];
    expect(controlerPublication(creation, contexte)).toEqual({
      'images.0.texteAlternatif':
        'Décrivez l’image 1 du résultat pour les personnes qui ne la voient pas.',
      'etapes.0.echanges.0.images.0.texteAlternatif': 'Décrivez l’image jointe au prompt 1.',
    });
  });

  it('RG-16 et RG-85 : liens selon le niveau', () => {
    const creation = {
      ...unPrompt(),
      liens: [{ type: 'DEMO' as const }, { type: 'VIDEO' as const }, { type: 'AUTRE' as const }],
    };
    const curieux = liensMaximum({ ...ETAT_VISITEUR, session: 'membre' });
    expect(curieux).toBe(2);
    expect(liensMaximum({ ...ETAT_VISITEUR, session: 'membre', niveau: 'apprenti' })).toBe(10);
    expect(liensMaximum({ ...ETAT_VISITEUR, session: 'membre', role: 'moderateur' })).toBe(10);
    expect(controlerPublication(creation, { liensMaximum: curieux })).toEqual({
      liens: 'Gardez 2 liens au plus à votre niveau.',
    });
  });

  it('RG-11 et RG-12 : un seul prompt, ou au moins deux en une étape', () => {
    const deux = unPrompt();
    deux.etapes[0]!.echanges.push({
      prompt: 'Encore',
      reponse: 'La version retenue.',
      configuration: null,
      images: [],
    });
    expect(controlerPublication(deux, contexte)).toEqual({
      etapes: 'Une création « 1 prompt » compte un seul prompt.',
    });
    expect(controlerPublication({ ...deux, type: 'ITERATION' }, contexte)).toEqual({});
    expect(controlerPublication({ ...unPrompt(), type: 'ITERATION' }, contexte)).toEqual({
      'etapes.0.echanges': 'Une itération compte au moins deux prompts.',
    });
    const sansPrompt = unPrompt();
    sansPrompt.etapes[0]!.echanges[0]!.prompt = '  ';
    expect(controlerPublication(sansPrompt, contexte)).toEqual({
      'etapes.0.echanges.0.prompt': 'Collez le texte du prompt 1, ou retirez-le.',
    });
  });

  it('RG-13 et RG-14 : étapes d’un projet, titre, récit et outil de chaque prompt', () => {
    const projet: CreationAControler = {
      ...unPrompt(),
      type: 'PROJET',
      liens: [{ type: 'DEMO' }],
      etapes: [etapeDeProjet('Préparer'), etapeDeProjet('Bâtir')],
    };
    expect(controlerPublication(projet, contexte)).toEqual({});
    const etape = projet.etapes[1]!;
    etape.titre = 'Bâti';
    etape.recit = 'Trop court.';
    etape.configurations.push({ outilId: 3 });
    etape.echanges[0]!.configuration = null;
    expect(controlerPublication(projet, contexte)).toEqual({
      'etapes.1.titre': 'Le titre de l’étape 2 doit compter au moins 5 caractères.',
      'etapes.1.recit': 'Racontez l’étape 2 en 50 caractères au moins (11 pour l’instant).',
      'etapes.1.echanges.0.configuration': 'Choisissez l’outil du prompt 2.',
    });
    expect(
      controlerPublication({ ...projet, etapes: [etapeDeProjet('Préparer')] }, contexte),
    ).toEqual({
      etapes: 'Un projet compte au moins deux étapes.',
    });
  });

  it('RG-15 : un moment clé s’explique en 20 caractères au moins', () => {
    const creation = unPrompt();
    creation.etapes[0]!.moments = [{ explication: 'Trop court', echange: 0 }];
    expect(controlerPublication(creation, contexte)).toEqual({
      'etapes.0.moments.0.explication':
        'Prompt 1 : expliquez le moment clé en 20 caractères au moins.',
    });
    creation.etapes[0]!.moments = [{ explication: null, echange: null }];
    expect(controlerPublication(creation, contexte)).toEqual({
      'etapes.0.moments.0.explication': 'Expliquez le moment clé.',
    });
  });
});

describe('schemaContenuCreation (CREA-05)', () => {
  const lire = (saisie: unknown) => schemaContenuCreation.safeParse(saisie);

  it('accepte un brouillon presque vide et normalise la saisie', () => {
    const resultat = lire({
      type: 'UN_PROMPT',
      titre: '  ',
      etiquettes: ['Affiche', 'affiche', ' Voyage  au  Sénégal '],
      etapes: [{ echanges: [{ prompt: 'Bonjour', nbEssais: 1, modeSelection: 'MEILLEUR_ESSAI' }] }],
      resultat: { nature: 'CODE', texte: '\n  print("ok")\n\n' },
    });
    expect(resultat.success).toBe(true);
    expect(resultat.data).toMatchObject({
      titre: null,
      etiquettes: ['Affiche', 'Voyage au Sénégal'],
      resultat: { nature: 'CODE', texte: '  print("ok")', nom: null },
      liens: [],
      images: [],
    });
    // RG-11 : un seul essai, c'est le premier.
    expect(resultat.data?.etapes[0]?.echanges[0]?.modeSelection).toBe('PREMIER_ESSAI');
  });

  it('refuse ce qu’aucun brouillon ne peut contenir (RG-10, RG-15, RG-16)', () => {
    const resultat = lire({
      type: 'ITERATION',
      titre: 'x'.repeat(121),
      etiquettes: ['un', 'deux', 'trois', 'quatre', 'cinq', 'six'],
      liens: [{ type: 'DEMO', url: 'http://exemple.test' }],
      etapes: [
        {
          configurations: [{ outilId: 1, modeleId: 2, modeleNonReference: 'Autre' }],
          echanges: [{ prompt: 'Un', configuration: 3 }],
          moments: [
            { type: 'DECOUVERTE', echange: 0 },
            { type: 'REFUS', echange: 0 },
          ],
        },
      ],
    });
    expect(resultat.success).toBe(false);
    expect(erreursParChamp(resultat.error!)).toEqual({
      titre: 'Le titre compte 120 caractères au plus.',
      etiquettes: 'Gardez 5 étiquettes au plus.',
      'liens.0.url': 'L’adresse doit commencer par https://.',
      'etapes.0.configurations.0.modeleNonReference':
        'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      'etapes.0.echanges.0.configuration': 'Choisissez un des outils de cette étape.',
      'etapes.0.moments.1.echange': 'Un prompt porte un seul moment clé.',
    });
  });

  it('RG-16 : 20 images au plus, échanges compris, chacune une seule fois', () => {
    const images = (resultat: ReturnType<typeof lire>) =>
      resultat.success ? null : erreursParChamp(resultat.error).images;
    expect(
      images(
        lire({
          type: 'ITERATION',
          images: Array.from({ length: 15 }, (_, i) => i + 1),
          etapes: [{ echanges: [{ images: [16, 17, 18, 19, 20, 21] }] }],
        }),
      ),
    ).toBe('Gardez 20 images au plus pour une création.');
    expect(
      images(lire({ type: 'ITERATION', images: [1], etapes: [{ echanges: [{ images: [1] }] }] })),
    ).toBe('Une même image ne peut servir qu’une fois.');
  });
});

describe('conditionsPublication (CREA-04)', () => {
  const libelles = (creation: CreationAControler) =>
    conditionsPublication(creation, contexte).map((c) => `${c.remplie ? '✓' : '○'} ${c.libelle}`);
  const toutesRemplies = (creation: CreationAControler) =>
    conditionsPublication(creation, contexte).every((c) => c.remplie);

  it('reprend les conditions du prototype, toutes remplies pour une création publiable', () => {
    expect(libelles(unPrompt())).toEqual([
      '✓ Un titre de 10 caractères au moins',
      '✓ L’objectif de la création',
      '✓ Une catégorie',
      '✓ L’outil d’IA utilisé',
      '✓ Le prompt et la réponse ou l’image obtenue',
    ]);
  });

  it('un brouillon vide : rien n’est rempli', () => {
    const vide: CreationAControler = {
      ...unPrompt(),
      titre: null,
      objectif: null,
      categorieId: null,
      etapes: [],
    };
    expect(libelles(vide)).toEqual([
      '○ Un titre de 10 caractères au moins',
      '○ L’objectif de la création',
      '○ Une catégorie',
      '○ L’outil d’IA utilisé',
      '○ Le prompt et la réponse ou l’image obtenue',
    ]);
  });

  it('itération et projet ont leurs propres conditions (RG-12, RG-13)', () => {
    const iteration: CreationAControler = { ...unPrompt(), type: 'ITERATION' };
    expect(libelles(iteration).slice(4)).toEqual([
      '○ Au moins deux échanges',
      '✓ La réponse ou l’image du dernier échange',
    ]);
    const projet: CreationAControler = {
      ...unPrompt(),
      type: 'PROJET',
      etapes: [etapeDeProjet('Préparer')],
    };
    expect(libelles(projet).slice(4)).toEqual([
      '○ Deux étapes avec un titre et un récit',
      '○ Un résultat final : un lien ou une image',
    ]);
    // Sans outil, le message du chemin couvre aussi le nombre d'étapes : il se vérifie directement.
    projet.etapes[0]!.configurations = [];
    expect(libelles(projet)[3]).toBe('○ L’outil d’IA utilisé');
    expect(libelles(projet)[4]).toBe('○ Deux étapes avec un titre et un récit');
  });

  it('images à décrire, moments à expliquer et liens en trop ont leur condition', () => {
    const creation = { ...unPrompt(), images: [{ texteAlternatif: null }] };
    creation.etapes[0]!.moments = [{ explication: 'Trop court', echange: 0 }];
    expect(libelles(creation).slice(5)).toEqual([
      '○ Une description pour chaque image',
      '○ Une explication pour chaque moment clé',
    ]);
    const liens = {
      ...unPrompt(),
      liens: [{ type: 'DEMO' as const }, { type: 'ARTICLE' as const }, { type: 'VIDEO' as const }],
    };
    expect(conditionsPublication(liens, { liensMaximum: 2 }).at(-1)).toEqual({
      libelle: '2 liens au plus à votre niveau',
      remplie: false,
    });
  });

  it('toutes remplies si et seulement si la publication est possible (RG-10 à RG-16)', () => {
    const cas: CreationAControler[] = [unPrompt()];
    const deuxPrompts = unPrompt();
    deuxPrompts.etapes[0]!.echanges.push({ ...deuxPrompts.etapes[0]!.echanges[0]! });
    cas.push(deuxPrompts, { ...deuxPrompts, type: 'ITERATION' });
    cas.push({
      ...unPrompt(),
      type: 'PROJET',
      etapes: [etapeDeProjet('Un'), etapeDeProjet('Deux')],
    });
    cas.push({
      ...unPrompt(),
      type: 'PROJET',
      images: [decrite],
      etapes: [etapeDeProjet('Préparer'), etapeDeProjet('Construire')],
    });
    const sansOutil = unPrompt();
    sansOutil.etapes[0]!.configurations = [];
    cas.push(sansOutil, { ...unPrompt(), images: [{ texteAlternatif: '' }] });
    for (const creation of cas)
      expect(toutesRemplies(creation)).toBe(
        Object.keys(controlerPublication(creation, contexte)).length === 0,
      );
  });
});

describe('dansLeDelai (RG-85)', () => {
  it('donne une durée, sans heure ni fuseau', () => {
    expect(dansLeDelai(30)).toBe('dans moins d’une minute');
    expect(dansLeDelai(40 * 60)).toBe('dans 40 min');
    expect(dansLeDelai(2 * 3600)).toBe('dans 2 h');
    expect(dansLeDelai(5 * 3600 + 12 * 60 - 5)).toBe('dans 5 h 12 min');
  });
});
