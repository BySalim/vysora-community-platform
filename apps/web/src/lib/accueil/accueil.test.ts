import type {
  ActiviteAccueilApi,
  ApprentissageAccueilApi,
  CarteCreationApi,
  DefiAccueilApi,
  MembreResumeApi,
} from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { avecLogos } from '../outils-texte';
import { carteHTML, listeHTML, traceSVG } from './cartes';
import { graduation, tendance, totalSemaine } from './courbe';
import { duree, ilYa } from './elements';
import { activiteHTML } from './fil';
import { defiHTML, phrases, resteAvant } from './laboratoire';

const NBSP = ' ';
const NNBSP = ' ';
const maintenant = new Date('2026-10-27T15:00:00Z');

const membre: MembreResumeApi = {
  id: 1,
  pseudo: 'aissatou-ndiaye',
  nom: 'Aïssatou Ndiaye',
  avatar: null,
  niveau: { code: 'artisan', libelle: 'Artisan' },
  reputation: 341,
};
const claude = {
  id: 2,
  nom: 'Claude',
  slug: 'claude',
  logo: 'claude-color',
  logoMonochrome: false,
};

const carte = (valeurs: Partial<CarteCreationApi> = {}): CarteCreationApi => ({
  id: 1,
  slug: 'prise-de-rendez-vous',
  type: 'ITERATION',
  titre: 'Prise de rendez-vous pour un salon de coiffure',
  categorie: { libelle: 'Application web', slug: 'application-web' },
  auteur: membre,
  outils: [{ outil: claude, modeles: ['Sonnet 4.5'] }],
  couverture: null,
  resultat: null,
  trace: [false, true, true],
  moments: 2,
  reproductions: 31,
  tauxReussite: 84,
  datePublication: '2026-10-27T14:51:00Z',
  utilesSemaine: 148,
  reussitesMois: 26,
  ...valeurs,
});

describe('Cartes « À explorer » (ACC-01)', () => {
  it('trace un point par échange, plus grand pour un moment clé (prototype : traceSVG)', () => {
    const svg = traceSVG([false, true, true]);
    expect(svg.match(/<circle/g)).toHaveLength(3);
    expect(svg.match(/class="is-moment"/g)).toHaveLength(2);
    expect(svg).toContain('x1="7"');
    expect(svg).toContain('x2="85"');
    expect(traceSVG([true])).toContain('cx="46"');
  });

  it('présente la preuve, le rang et l’auteur comme le prototype', () => {
    const html = carteHTML(carte(), 0, 'utiles', maintenant);
    expect(html).toContain('href="/creations/1-prise-de-rendez-vous"');
    expect(html).toContain(`148 cette semaine`);
    expect(html).toContain(`31 reproductions · 84${NBSP}%`);
    expect(html).toContain('2 moments clés');
    expect(html).toContain(`3 échanges · 2 moments clés`);
    expect(html).toContain('<span class="tool-ref"><img class="tool-logo"');
    expect(html).toContain('Claude</span> · Sonnet 4.5');
    expect(html).toContain('Aïssatou Ndiaye<small>Artisan</small>');
    // Sans image ni texte obtenu : un cadre neutre, avec le titre pour les lecteurs d'écran.
    expect(html).toContain(
      'role="img" aria-label="Prise de rendez-vous pour un salon de coiffure"',
    );

    expect(carteHTML(carte(), 1, 'recentes', maintenant)).toContain(`il y a 9${NBSP}min`);
    expect(carteHTML(carte(), 2, 'reproduites', maintenant)).toContain('<b>3</b>');
    expect(carteHTML(carte(), 2, 'reproduites', maintenant)).toContain('26 reproductions');
  });

  it('dit d’un projet ses étapes, d’une création sans essai qu’elle attend d’être reproduite', () => {
    const projet = carteHTML(
      carte({ type: 'PROJET', trace: [true, false, true, false], tauxReussite: null }),
      0,
      'utiles',
      maintenant,
    );
    expect(projet).toContain('4 étapes');
    expect(projet).not.toContain('reproductions ·');
    expect(
      carteHTML(carte({ reproductions: 0, tauxReussite: null }), 0, 'utiles', maintenant),
    ).toContain('Prête à être reproduite');
    // Taux de réussite à partir de 3 reproductions seulement (RG-43).
    expect(
      carteHTML(carte({ reproductions: 2, tauxReussite: null }), 0, 'utiles', maintenant),
    ).toContain('2 reproductions</li>');
  });

  it('montre le code obtenu à la place d’une image, échappé', () => {
    const html = carteHTML(
      carte({
        resultat: { nature: 'CODE', extrait: 'for f in <dossier>:\n  print(f)', nom: 'tri.py' },
      }),
      0,
      'utiles',
      maintenant,
    );
    expect(html).toContain('<div class="mock-code">');
    expect(html).toContain('<span>tri.py</span>');
    expect(html).toContain('&lt;dossier&gt;');
  });

  it('annonce une liste vide', () => {
    expect(listeHTML([], 'reproduites', maintenant)).toContain(
      'Aucune création reproduite avec succès pour l’instant.',
    );
  });
});

describe('Dates et durées', () => {
  it('donne l’ancienneté comme le fil du prototype', () => {
    expect(ilYa('2026-10-27T14:59:40Z', maintenant)).toBe('à l’instant');
    expect(ilYa('2026-10-27T14:35:00Z', maintenant)).toBe('il y a 25 min');
    expect(ilYa('2026-10-27T12:00:00Z', maintenant)).toBe('il y a 3 h');
    expect(ilYa('2026-10-26T10:00:00Z', maintenant)).toBe('hier');
    expect(ilYa('2026-10-12T10:00:00Z', maintenant)).toBe('le 12 oct.');
  });

  it('écrit une durée de résolution', () => {
    expect(duree(40)).toBe('40 min');
    expect(duree(125)).toBe('2 h');
    expect(duree(60 * 72)).toBe('3 jours');
  });

  it('compte à rebours jusqu’à la fin d’un défi', () => {
    expect(resteAvant('2026-10-29T16:01:05Z', maintenant.getTime())).toEqual({
      d: '2',
      h: '01',
      m: '01',
      s: '05',
    });
    expect(resteAvant('2026-10-01T00:00:00Z', maintenant.getTime())).toEqual({
      d: '0',
      h: '00',
      m: '00',
      s: '00',
    });
  });
});

describe('Fil d’activité (prototype : feedHTML)', () => {
  const activite = (valeurs: Partial<ActiviteAccueilApi>): ActiviteAccueilApi => ({
    cle: 'reproduction:1',
    genre: 'reproduction',
    date: '2026-10-27T14:50:00Z',
    membre,
    cible: { titre: 'Lettre de motivation', href: '/creations/2-lettre' },
    ...valeurs,
  });

  it('écrit chaque action avec son étiquette et sa typographie', () => {
    const essai = activiteHTML(
      activite({ resultat: 'PARTIEL', outil: claude, modele: 'Sonnet 4.5' }),
      maintenant,
    );
    expect(essai).toContain(`a reproduit «${NBSP}Lettre de motivation${NBSP}» avec`);
    expect(essai).toContain('Claude</span> Sonnet 4.5');
    expect(essai).toContain('data-tone="warn"');
    expect(essai).toContain('Partiel');
    expect(essai).toContain(`il y a 10${NBSP}min`);

    const clinique = activiteHTML(
      activite({
        genre: 'sujet',
        typeSujet: 'CLINIQUE',
        cible: { titre: 'Mon résumé', href: '/forum/3-r' },
      }),
      maintenant,
    );
    expect(clinique).toContain(`a ouvert une clinique${NBSP}: «${NBSP}Mon résumé${NBSP}»`);
    expect(clinique).toContain('Clinique');

    const acceptee = activiteHTML(activite({ genre: 'reponse-acceptee', points: 15 }), maintenant);
    expect(acceptee).toContain(`+15${NBSP}points`);
    expect(acceptee).toContain('data-tone="success"');
  });

  it('échappe les titres des membres', () => {
    const html = activiteHTML(
      activite({
        genre: 'publication',
        typeCreation: 'UN_PROMPT',
        cible: { titre: '<img src=x>', href: '/c' },
      }),
      maintenant,
    );
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('1 prompt');
  });
});

describe('Interactions d’apprentissage', () => {
  const apprentissage = (parJour: number[]): ApprentissageAccueilApi => ({
    debut: '2026-09-21',
    parJour,
    semaine: { votes: 1291, reproductions: 822, casReussis: 806, reponsesAcceptees: 187 },
  });

  it('compare hier au même jour de la semaine précédente (prototype : updateTrend)', () => {
    // Données du prototype : du lundi 21 septembre au mardi 13 octobre.
    const valeurs = [
      1180, 1265, 1302, 1288, 1215, 930, 902, 1290, 1350, 1388, 1361, 1302, 1004, 968, 1488, 1610,
      1702, 1655, 1590, 1206, 1173, 1764, 1342,
    ];
    expect(tendance(apprentissage(valeurs))).toEqual({
      texte: `+19${NBSP}% lundi, par rapport à lundi dernier`,
      hausse: true,
    });
    expect(totalSemaine(apprentissage(valeurs))).toBe(3106);
    // Sans activité la semaine précédente, aucune comparaison.
    expect(tendance(apprentissage(Array.from({ length: 23 }, () => 0)))).toBeNull();
  });

  it('gradue l’axe de 500 en 500 comme le prototype, plus finement quand l’activité est faible', () => {
    expect(graduation(1764)).toBe(500);
    expect(graduation(543)).toBe(250);
    expect(graduation(12)).toBe(5);
  });
});

describe('Laboratoire', () => {
  it('découpe l’explication d’une réponse acceptée en trois notes au plus', () => {
    expect(
      phrases(
        'Le texte seul ne suffit pas. Générez une planche de référence. Décrivez le visage. Ne changez que le décor.',
      ),
    ).toEqual([
      'Le texte seul ne suffit pas.',
      'Générez une planche de référence.',
      'Décrivez le visage. Ne changez que le décor.',
    ]);
  });

  it('nomme deux participants d’un défi (prototype : « 87 participations, dont Ibrahima et Léa »)', () => {
    const defi: DefiAccueilApi = {
      id: 1,
      slug: 'une-affiche',
      titre: 'Une affiche touristique en trois échanges',
      regles: ['Trois échanges au maximum avec l’IA'],
      dateFin: '2026-10-19T23:59:00Z',
      participations: 87,
      participants: [
        { ...membre, nom: 'Ibrahima Sow' },
        { ...membre, nom: 'Léa Martin' },
      ],
      image: null,
    };
    const html = defiHTML(defi);
    expect(html).toContain('87 participations, dont Ibrahima et Léa');
    expect(html).toContain(`Le défi se termine le 19 octobre 2026 à 23${NBSP}h 59 (UTC).`);
    expect(html).toContain('data-fin="2026-10-19T23:59:00Z"');
    expect(html).toContain('href="/defis/1-une-affiche"');
    expect(
      defiHTML({ ...defi, participations: 1, participants: [defi.participants[1]!] }),
    ).toContain('1 participation, celle de Léa');
  });
});

describe('Logos des outils dans un texte (prototype : withLogos)', () => {
  const logos = avecLogos([
    { nom: 'ChatGPT', logo: 'openai', logoMonochrome: true, alias: ['GPT-5', 'GPT Image'] },
    { nom: 'Claude', logo: 'claude-color', logoMonochrome: false, alias: ['Sonnet'] },
    { nom: 'Claude Code', logo: 'claudecode-color', logoMonochrome: false, alias: [] },
  ]);

  it('donne son logo à la première mention de chaque outil, alias compris', () => {
    const html = logos('Dernière le 11 oct. · Claude, GPT-5, Gemini');
    expect(html.match(/tool-ref/g)).toHaveLength(2);
    expect(html).toContain('claude-color.svg');
    expect(html).toContain('openai.svg');
    expect(logos('Claude Sonnet 4.5').match(/tool-ref/g)).toHaveLength(1);
    // Le nom le plus long l'emporte, et un nom inclus dans un mot ne compte pas.
    expect(logos('Claude Code')).toContain('claudecode-color.svg');
    expect(logos('Claudette')).not.toContain('tool-ref');
  });

  it('applique la typographie et échappe le texte', () => {
    expect(logos('Avec ceux que vous préférez : ChatGPT <b>')).toContain(`préférez${NBSP}:`);
    expect(logos('<b>')).toBe('&lt;b&gt;');
    expect(logos('1 500 points')).toBe(`1${NNBSP}500${NBSP}points`);
  });
});
