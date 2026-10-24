import type { CreationFicheApi, EchangeApi, EtapeApi, MediaApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  adresseCreation,
  apercuSansImage,
  contexteDeTravail,
  couverture,
  estPortrait,
  formatResultat,
  identifiantDeLAdresse,
  longueurParcours,
  outilsUtilises,
  phrases,
  placeDuMoment,
} from './creations';

const image = (id: number, largeur = 1280, hauteur = 960): MediaApi => ({
  id,
  url: `/api/v1/fichiers/${id}-1280.webp`,
  declinaisons: [],
  largeur,
  hauteur,
  texteAlternatif: 'Image',
  legende: null,
});

const echange = (id: number, valeurs: Partial<EchangeApi> = {}): EchangeApi => ({
  id,
  ordre: id,
  prompt: `Prompt ${id}`,
  reponse: null,
  nbEssais: 1,
  modeSelection: 'PREMIER_ESSAI',
  configurationId: null,
  images: [],
  ...valeurs,
});

const outil = (id: number, nom: string) => ({
  id,
  nom,
  slug: nom.toLowerCase(),
  logo: null,
  logoMonochrome: false,
});

const etape = (ordre: number, valeurs: Partial<EtapeApi> = {}): EtapeApi => ({
  id: ordre,
  ordre,
  titre: null,
  recit: null,
  configurations: [],
  echanges: [],
  moments: [],
  ...valeurs,
});

type Fiche = Pick<CreationFicheApi, 'type' | 'etapes' | 'images'>;

describe('adresse d’une fiche', () => {
  it('compose /creations/[id]-[slug] et relit l’identifiant', () => {
    expect(adresseCreation({ id: 12, slug: 'cite-imaginaire' })).toBe(
      '/creations/12-cite-imaginaire',
    );
    expect(adresseCreation({ id: 12, slug: null })).toBe('/creations/12');
    expect(identifiantDeLAdresse('12-cite-imaginaire')).toBe(12);
    expect(identifiantDeLAdresse('12')).toBe(12);
    for (const invalide of [
      'abc',
      '0',
      '012',
      '12.5',
      '12-Cité',
      '-3',
      undefined,
      '99999999999999999',
    ])
      expect(identifiantDeLAdresse(invalide)).toBeNull();
  });
});

describe('résultat présenté', () => {
  it('prend la première image du résultat, sinon la dernière jointe aux échanges', () => {
    const avecResultat: Fiche = { type: 'ITERATION', images: [image(1)], etapes: [] };
    expect(couverture(avecResultat)?.id).toBe(1);
    const sansResultat: Fiche = {
      type: 'ITERATION',
      images: [],
      etapes: [
        etape(1, {
          echanges: [
            echange(1, { images: [image(2)] }),
            echange(2, { images: [image(3), image(4)] }),
          ],
        }),
      ],
    };
    expect(couverture(sansResultat)?.id).toBe(4);
    expect(couverture({ type: 'UN_PROMPT', images: [], etapes: [etape(1)] })).toBeNull();
  });

  it('affiche entière une image en portrait', () => {
    expect(estPortrait(image(1, 853, 1280))).toBe(true);
    expect(estPortrait(image(1, 1280, 960))).toBe(false);
  });

  it('précise le choix parmi plusieurs essais pour un « 1 prompt »', () => {
    const fiche = (nbEssais: number, modeSelection: EchangeApi['modeSelection']): Fiche => ({
      type: 'UN_PROMPT',
      images: [],
      etapes: [etape(1, { echanges: [echange(1, { nbEssais, modeSelection })] })],
    });
    expect(formatResultat(fiche(4, 'MEILLEUR_ESSAI'))).toBe('Résultat retenu parmi 4 essais');
    expect(formatResultat(fiche(1, 'PREMIER_ESSAI'))).toBe('Résultat obtenu');
  });
});

describe('parcours', () => {
  it('situe chaque moment clé selon le type de création', () => {
    const etapes = [etape(1, { echanges: [echange(7), echange(8)] }), etape(2)];
    expect(placeDuMoment({ type: 'PROJET', etapes }, 1, 8)).toBe('Étape 1, échange 2');
    expect(placeDuMoment({ type: 'PROJET', etapes }, 2, null)).toBe('Étape 2');
    expect(placeDuMoment({ type: 'ITERATION', etapes }, 1, 8)).toBe('Échange 2');
    expect(placeDuMoment({ type: 'UN_PROMPT', etapes }, 1, 7)).toBe('Le prompt');
  });

  it('liste chaque outil une fois, avec son modèle', () => {
    const configuration = (id: number, nom: string, modele: string | null) => ({
      id,
      outil: outil(id, nom),
      modele: null,
      modeleNonReference: modele,
      parametres: null,
      contexteCache: null,
    });
    const etapes = [
      etape(1, {
        configurations: [configuration(1, 'ChatGPT', 'GPT-5'), configuration(2, 'Claude', null)],
      }),
      etape(2, { configurations: [configuration(1, 'ChatGPT', 'GPT-5')] }),
    ];
    expect(outilsUtilises({ etapes }).map((o) => [o.outil.nom, o.modele])).toEqual([
      ['ChatGPT', 'GPT-5'],
      ['Claude', null],
    ]);
  });

  it('décrit la longueur du parcours et le contexte de travail', () => {
    const iteration = {
      type: 'ITERATION' as const,
      etapes: [etape(1, { echanges: [echange(1), echange(2)] })],
    };
    expect(longueurParcours(iteration)).toBe('2 échanges');
    expect(longueurParcours({ type: 'PROJET', etapes: [etape(1)] })).toBe('1 étape');
    expect(contexteDeTravail(iteration)).toBe('Même conversation pour tous les échanges');
  });

  it('découpe les limites constatées en phrases', () => {
    expect(phrases('Le titre déborde. Les couleurs varient ! Et alors ?')).toEqual([
      'Le titre déborde.',
      'Les couleurs varient !',
      'Et alors ?',
    ]);
  });
});

describe('aperçu d’un résultat sans image', () => {
  const base = {
    type: 'UN_PROMPT' as const,
    etapes: [etape(1, { echanges: [echange(1, { reponse: 'Voici le texte obtenu.' })] })],
    liens: [] as CreationFicheApi['liens'],
    resultat: null as CreationFicheApi['resultat'],
  };

  it('suit l’ordre du prototype : texte ou code obtenu, puis démo, puis dernière réponse', () => {
    expect(
      apercuSansImage({ ...base, resultat: { nature: 'CODE', texte: 'x = 1', nom: 'a.py' } }),
    ).toEqual({ sorte: 'code-auteur', texte: 'x = 1', nom: 'a.py' });
    expect(
      apercuSansImage({ ...base, resultat: { nature: 'TEXTE', texte: 'Lettre', nom: null } }),
    ).toEqual({
      sorte: 'texte-auteur',
      texte: 'Lettre',
    });
    expect(
      apercuSansImage({
        ...base,
        liens: [{ type: 'DEMO', url: 'https://demo.example', libelle: null }],
      }),
    ).toEqual({ sorte: 'lien', url: 'https://demo.example' });
    expect(apercuSansImage(base)).toEqual({
      sorte: 'texte-auteur',
      texte: 'Voici le texte obtenu.',
    });
    expect(apercuSansImage({ ...base, etapes: [etape(1)] })).toEqual({ sorte: 'vide' });
  });
});
