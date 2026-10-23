import type { DocumentLegalApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  preparerArticles,
  rendreAcceptation,
  rendreChangement,
  rendreDocuments,
  rendreEssentiel,
  rendreMeta,
  type ContextePageLegale,
} from './pages-legales';

const DOCUMENTS: DocumentLegalApi[] = [
  {
    type: 'CGU',
    version: '2026-10-15',
    dateEffet: '2026-10-15',
    url: '/cgu',
    acceptationRequise: true,
    resumeChangements:
      'Le nombre de publications autorisées par 24 heures dépend désormais de votre niveau.',
  },
  {
    type: 'CONFIDENTIALITE',
    version: '2026-09-01',
    dateEffet: '2026-09-01',
    url: '/confidentialite',
    acceptationRequise: false,
    resumeChangements: null,
  },
  {
    type: 'CHARTE',
    version: '2026-10-15',
    dateEffet: '2026-10-15',
    url: '/charte-communautaire',
    acceptationRequise: true,
    resumeChangements: 'Un prompt qui contient une clé d’API est masqué jusqu’à sa correction.',
  },
];

const contexte = (valeurs: Partial<ContextePageLegale> = {}): ContextePageLegale => ({
  cle: 'cgu',
  documents: DOCUMENTS,
  membre: false,
  aAccepter: [],
  conditionsDepuis: null,
  retour: '%2Fcgu',
  ...valeurs,
});

const ARTICLES = `
  <section class="lg-article" id="objet">
    <h2>
      <span class="lg-num"><svg class="icon" aria-hidden="true"><use href="#i-compass"></use></svg> Article 1 </span>
      Objet et acceptation
    </h2>
    <p>Texte.</p>
  </section>
  <section class="lg-article" id="traitements"><h2>2. Données, usages et durées</h2></section>
  <section class="lg-article" id="esprit"><h2>L’esprit de Vysora</h2></section>`;

describe('preparerArticles (prototype/documents-legaux.js, infos et ajouterAncres)', () => {
  it('lit le numéro « Article n », « n. » ou le rang, et le titre de chaque article', () => {
    expect(preparerArticles(ARTICLES).infos).toEqual([
      { id: 'objet', num: '1', titre: 'Objet et acceptation', article: true, numerote: true },
      {
        id: 'traitements',
        num: '2',
        titre: 'Données, usages et durées',
        article: false,
        numerote: true,
      },
      { id: 'esprit', num: '3', titre: 'L’esprit de Vysora', article: false, numerote: false },
    ]);
  });

  it('place chaque titre dans div.lg-h avec son bouton « Copier le lien »', () => {
    const { html } = preparerArticles(ARTICLES);
    expect(html).toContain(
      '<section class="lg-article" id="esprit"><div class="lg-h"><h2>L’esprit de Vysora</h2><button class="lg-ancre" type="button" aria-label="Copier le lien vers « L’esprit de Vysora »" data-lg-ancre="esprit">',
    );
    expect(html).toContain('aria-label="Copier le lien vers l’article 1" data-lg-ancre="objet"');
    expect(html.match(/class="lg-h"/g)).toHaveLength(3);
  });

  it('laisse les autres sections telles quelles', () => {
    const autre = '<section class="lg-essentiel" id="x"><h2>L’essentiel</h2></section>';
    expect(preparerArticles(autre)).toEqual({ html: autre, infos: [] });
  });
});

describe('en-tête du document', () => {
  it('donne la version et sa date d’effet (RG-112)', () => {
    expect(rendreMeta(contexte())).toBe(
      '<li><svg class="icon icon-sm" aria-hidden="true"><use href="#i-calendar"/></svg><span>Version du <b>15 octobre 2026</b></span></li>' +
        '<li><svg class="icon icon-sm" aria-hidden="true"><use href="#i-check-circle"/></svg><span>En vigueur depuis cette date</span></li>',
    );
    expect(rendreMeta(contexte({ cle: 'confidentialite' }))).toContain(
      'Version du <b>1<sup>er</sup> septembre 2026</b>',
    );
    expect(rendreMeta(contexte({ cle: 'confidentialite' }))).toContain('Version en vigueur');
  });

  it('distingue la date de la version de sa date d’effet', () => {
    const annoncee = DOCUMENTS.map((d) =>
      d.type === 'CGU' ? { ...d, version: '2026-09-15', dateEffet: '2026-10-15' } : d,
    );
    const meta = rendreMeta(contexte({ documents: annoncee }));
    expect(meta).toContain('Version du <b>15 septembre 2026</b>');
    expect(meta).toContain('En vigueur depuis le 15 octobre 2026');
  });

  it('date la mise à jour des pages sans version en base', () => {
    expect(rendreMeta(contexte({ cle: 'cookies' }))).toContain(
      'Mise à jour le <b>19 octobre 2026</b>',
    );
  });

  it('reste vide sans réponse de l’API', () => {
    expect(rendreMeta(contexte({ documents: [] }))).toBe('');
  });

  it('montre les changements de la version, et la lecture seule si elle reste à accepter', () => {
    const cible = { id: 'usage', num: '4', titre: 'Règles d’usage', article: true, numerote: true };
    const visiteur = rendreChangement(contexte(), cible);
    expect(visiteur).toContain(
      '<b>Ce qui change dans cette version.</b> Le nombre de publications',
    );
    expect(visiteur).toContain('<a href="#usage">Lire l’article 4</a>');
    expect(visiteur).not.toContain('lg-lecture-seule');
    expect(
      rendreChangement(contexte({ membre: true, aAccepter: ['CGU', 'CHARTE'] }), cible),
    ).toContain('<a href="#acceptation">Accepter cette version</a>');
    expect(rendreChangement(contexte({ cle: 'confidentialite' }), undefined)).toBe('');
  });

  it('signale dans les onglets les documents à accepter (RG-03)', () => {
    const onglets = rendreDocuments(contexte({ membre: true, aAccepter: ['CHARTE'] }));
    expect(onglets).toContain(
      '<a href="/cgu" aria-current="page"><span class="lg-doc-nom">Conditions d’utilisation</span><span class="lg-doc-version"><span class="lg-doc-prefixe">Version du </span>15 octobre 2026</span></a>',
    );
    expect(onglets).toContain(
      '<a href="/charte-communautaire"><span class="lg-doc-nom">Charte communautaire</span><span class="lg-doc-version is-a-accepter">À accepter</span></a>',
    );
    expect(onglets).toContain('<span class="lg-doc-prefixe">Mise à jour le </span>19 octobre 2026');
    expect(onglets.match(/<li>/g)).toHaveLength(5);
  });
});

describe('L’essentiel', () => {
  it('relie chaque point à son article', () => {
    const { infos } = preparerArticles(ARTICLES);
    const html = rendreEssentiel('cgu', infos, ['objet', 'traitements', 'esprit']);
    expect(html).toContain('<a href="#objet" aria-label="Lire l’article 1">Article 1</a>');
    expect(html).toContain(
      '<a href="#traitements" aria-label="Lire « Données, usages et durées »">Section 2</a>',
    );
    expect(html).toContain(
      '<a href="#esprit" aria-label="Lire « L’esprit de Vysora »">L’esprit de Vysora</a>',
    );
    expect(html.match(/<li>/g)).toHaveLength(5);
  });
});

describe('acceptation selon l’état du compte (RG-03)', () => {
  it('invite une visiteuse à s’inscrire, avec retour à la page', () => {
    const html = rendreAcceptation(contexte());
    expect(html).toContain('href="/inscription?retour=%2Fcgu">Créer un compte');
    expect(html).toContain('href="/connexion?retour=%2Fcgu">Se connecter');
  });

  it('confirme l’acceptation d’un membre à jour', () => {
    const html = rendreAcceptation(contexte({ membre: true }));
    expect(html).toContain('<b>Vous avez accepté cette version.</b>');
    expect(html).not.toContain('<form');
  });

  it('fait accepter les nouvelles versions, en citant les autres documents', () => {
    const html = rendreAcceptation(
      contexte({ membre: true, aAccepter: ['CGU', 'CHARTE'], conditionsDepuis: '2026-10-15' }),
    );
    expect(html).toContain('Ces documents ont changé le 15 octobre 2026.');
    expect(html).toContain('<a href="/charte-communautaire">Lire la charte communautaire</a>');
    expect(html).not.toContain('Lire les conditions générales');
    expect(html).toContain('J’accepte les nouvelles versions de ces documents.');
  });

  it('accorde le texte quand un seul document a changé', () => {
    const html = rendreAcceptation(
      contexte({ membre: true, aAccepter: ['CGU'], conditionsDepuis: '2026-10-15' }),
    );
    expect(html).toContain('Ce document a changé le 15 octobre 2026.');
    expect(html).toContain('Accepter la nouvelle version');
  });

  it('renvoie vers le document qui reste à accepter quand celui-ci l’est déjà', () => {
    const html = rendreAcceptation(contexte({ membre: true, aAccepter: ['CHARTE'] }));
    expect(html).toContain('<b>Vous avez accepté cette version.</b>');
    expect(html).toContain(
      'La nouvelle version de la charte communautaire est à accepter pour continuer à publier et à participer.',
    );
    expect(html).toContain(
      'href="/charte-communautaire#acceptation">Lire la charte communautaire</a>',
    );
  });
});
