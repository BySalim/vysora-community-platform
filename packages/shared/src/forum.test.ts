import { describe, expect, it } from 'vitest';
import {
  accepteUneReponse,
  blocDeCode,
  composerClinique,
  composerMessage,
  etatSujet,
  lireClinique,
  lireMessage,
  peutFermerSujet,
  peutRouvrirSujet,
} from './forum';
import { erreursParChamp } from './schemas/commun';
import { schemaFiltresSujets, schemaMessage, schemaSujet } from './schemas/forum';

const erreurs = (resultat: { success: boolean; error?: unknown }) =>
  resultat.success ? {} : erreursParChamp(resultat.error as never);

const question = {
  type: 'QUESTION',
  titre: 'Comment vérifier qu’un script ne supprime rien ?',
  corps: 'Avant de lancer le script de tri, comment voir les fichiers concernés ?',
  etiquettes: ['Script', 'Fichiers'],
};

const clinique = {
  type: 'CLINIQUE',
  titre: 'Mon personnage change de visage à chaque image',
  corps: '',
  clinique: {
    prompt: 'Portrait d’un jeune homme, manteau bleu, gouache.',
    obtenu: 'Six visages différents d’une scène à l’autre.',
    attendu: 'Le même personnage, reconnaissable partout.',
  },
  outilId: 3,
  etiquettes: ['Portrait'],
};

describe('état d’un sujet (CV-03)', () => {
  it('fermé avant résolu, résolu avant ouvert', () => {
    expect(etatSujet({ ferme: true, accepte: true })).toBe('FERME');
    expect(etatSujet({ ferme: false, accepte: true })).toBe('RESOLU');
    expect(etatSujet({ ferme: false, accepte: false })).toBe('OUVERT');
  });

  it('seules les questions et les cliniques ont une réponse acceptée (RG-63)', () => {
    expect(accepteUneReponse('QUESTION')).toBe(true);
    expect(accepteUneReponse('CLINIQUE')).toBe(true);
    expect(accepteUneReponse('ASTUCE')).toBe(false);
    expect(accepteUneReponse('DISCUSSION')).toBe(false);
  });
});

describe('fermer et rouvrir (RG-65, CI-22)', () => {
  it('l’auteur ou la modération ferment', () => {
    expect(peutFermerSujet({ auteur: true, moderation: false })).toBe(true);
    expect(peutFermerSujet({ auteur: false, moderation: true })).toBe(true);
    expect(peutFermerSujet({ auteur: false, moderation: false })).toBe(false);
  });

  it('l’auteur ne rouvre que ce qu’il a fermé ; la modération rouvre tout', () => {
    expect(peutRouvrirSujet({ auteur: true, moderation: false, fermeParLAuteur: true })).toBe(true);
    expect(peutRouvrirSujet({ auteur: true, moderation: false, fermeParLAuteur: false })).toBe(
      false,
    );
    expect(peutRouvrirSujet({ auteur: false, moderation: true, fermeParLAuteur: false })).toBe(
      true,
    );
  });
});

describe('corps d’une clinique (RG-62)', () => {
  const rubriques = {
    prompt: 'Logo « KARITÉ DORÉ »\n### Résultat obtenu\n```js\nalert(1)\n```',
    obtenu: 'Une lettre change d’un essai à l’autre.',
    attendu: 'Le nom exact à chaque essai.',
  };

  it('compose les quatre rubriques et les relit, même si le prompt contient un titre ou du code', () => {
    const corps = composerClinique('Un logo pour une marque.', rubriques, 'Ideogram · 3.0');
    expect(corps).toContain('### Outil et modèle\n\nIdeogram · 3.0');
    expect(lireClinique(corps)).toEqual({ contexte: 'Un logo pour une marque.', ...rubriques });
  });

  it('accepte un contexte vide et un prompt sans bloc de code (données de démonstration)', () => {
    const corps =
      '### Prompt utilisé\n\nPortrait d’un jeune homme.\n\n### Résultat obtenu\n\nSix visages.\n\n### Résultat attendu\n\nUn seul visage.\n\n### Outil et modèle\n\nMidjourney · v7';
    expect(lireClinique(corps)).toEqual({
      contexte: '',
      prompt: 'Portrait d’un jeune homme.',
      obtenu: 'Six visages.',
      attendu: 'Un seul visage.',
    });
  });

  it('renvoie null quand une rubrique manque', () => {
    expect(lireClinique('### Prompt utilisé\n\nTexte\n\n### Résultat attendu\n\nTexte')).toBeNull();
  });
});

describe('réponse qui propose un prompt', () => {
  it('cite le prompt dans un bloc que son contenu ne peut pas refermer', () => {
    expect(blocDeCode('a ``` b')).toBe('````text\na ``` b\n````');
    const corps = composerMessage('Ajoutez une exécution à blanc.', 'Ajoute ```--essai```.');
    expect(lireMessage(corps)).toEqual({
      texte: 'Ajoutez une exécution à blanc.',
      prompt: 'Ajoute ```--essai```.',
    });
  });

  it('laisse le texte entier quand il ne finit pas par un bloc « text »', () => {
    const corps = 'Voici le script :\n\n```python\nprint(1)\n```';
    expect(lireMessage(corps)).toEqual({ texte: corps, prompt: null });
    expect(lireMessage('Juste une réponse.')).toEqual({
      texte: 'Juste une réponse.',
      prompt: null,
    });
  });
});

describe('schéma d’un sujet', () => {
  it('accepte une question complète et retire ce qui ne concerne pas son type', () => {
    const resultat = schemaSujet.safeParse({ ...question, exempleAvant: 'Ignoré par le type.' });
    expect(resultat.success).toBe(true);
    expect(resultat.data?.exempleAvant).toBeNull();
    expect(resultat.data?.clinique).toBeNull();
  });

  it('applique RG-60 : titre, texte et une à cinq étiquettes', () => {
    expect(
      erreurs(
        schemaSujet.safeParse({ ...question, titre: 'Trop court', corps: 'Court', etiquettes: [] }),
      ),
    ).toEqual({
      titre: 'Le titre doit compter au moins 15 caractères.',
      corps: 'Votre question doit compter au moins 30 caractères.',
      etiquettes: 'Ajoutez au moins une étiquette.',
    });
    expect(
      erreurs(schemaSujet.safeParse({ ...question, etiquettes: ['a', 'b', 'c', 'd', 'e', 'f'] })),
    ).toEqual({ etiquettes: 'Gardez 5 étiquettes au plus.' });
  });

  it('applique RG-62 : rubriques de la clinique et outil obligatoires', () => {
    expect(schemaSujet.safeParse(clinique).success).toBe(true);
    expect(
      erreurs(
        schemaSujet.safeParse({
          ...clinique,
          clinique: { prompt: '', obtenu: 'Court', attendu: '   ' },
          outilId: null,
        }),
      ),
    ).toEqual({
      'clinique.prompt': 'Collez le prompt que vous avez utilisé.',
      'clinique.obtenu': 'Décrivez le résultat obtenu.',
      'clinique.attendu': 'Décrivez le résultat attendu.',
      outilId: 'Indiquez l’outil utilisé.',
    });
  });

  it('applique RG-61 : exemples avant et après d’une astuce', () => {
    const astuce = {
      ...question,
      type: 'ASTUCE',
      exempleAvant: 'Logo pour Karité Doré.',
      exempleApres: 'Court',
    };
    expect(erreurs(schemaSujet.safeParse(astuce))).toEqual({
      exempleApres: 'Le prompt après doit compter au moins 20 caractères.',
    });
  });

  it('refuse un modèle sans outil, ou deux modèles à la fois', () => {
    expect(
      erreurs(schemaSujet.safeParse({ ...question, modeleId: 2, modeleNonReference: 'v7' })),
    ).toEqual({
      modeleNonReference: 'Choisissez un modèle de la liste ou saisissez-en un, pas les deux.',
      outilId: 'Indiquez l’outil de ce modèle.',
    });
  });
});

describe('schéma d’une réponse (RG-64)', () => {
  it('demande 20 caractères de texte, prompt facultatif', () => {
    expect(erreurs(schemaMessage.safeParse({ corps: 'Trop court.' }))).toEqual({
      corps: 'Écrivez au moins 20 caractères pour que votre réponse soit utile.',
    });
    expect(
      schemaMessage.safeParse({ corps: 'Ajoutez une exécution à blanc.', prompt: '  ' }).data,
    ).toEqual({ corps: 'Ajoutez une exécution à blanc.', prompt: null });
  });

  it('compte le prompt dans les 20 000 caractères', () => {
    expect(
      erreurs(schemaMessage.safeParse({ corps: 'x'.repeat(19_990), prompt: 'Un prompt cité.' })),
    ).toEqual({
      prompt: 'Votre réponse et son prompt comptent 20 000 caractères au plus.',
    });
  });
});

describe('filtres de la liste', () => {
  it('lit les paramètres d’une adresse', () => {
    expect(
      schemaFiltresSujets.parse({
        type: 'QUESTION,CLINIQUE',
        outil: 'midjourney',
        sansReponse: 'true',
        page: '2',
      }),
    ).toEqual({
      q: null,
      type: ['QUESTION', 'CLINIQUE'],
      etiquette: null,
      outil: ['midjourney'],
      membre: null,
      sansReponse: true,
      sansReponseAcceptee: false,
      avecPrompt: false,
      enAttente: false,
      tri: 'recents',
      page: 2,
    });
  });

  it('refuse un type, un tri ou une page inconnus', () => {
    expect(
      erreurs(schemaFiltresSujets.safeParse({ type: 'SONDAGE', tri: 'hasard', page: '0' })),
    ).toEqual({
      'type.0': 'Ce type de sujet n’existe pas.',
      tri: 'Ce tri n’existe pas.',
      page: 'Cette page n’existe pas.',
    });
  });
});
