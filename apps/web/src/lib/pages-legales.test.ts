import type { DocumentLegalApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  articlesDuTexte,
  dateHtml,
  etatDocuments,
  libelleSection,
  preparerTexte,
  renvoi,
  texteBrut,
  typographieHtml,
} from './pages-legales';

const VERSIONS: DocumentLegalApi[] = [
  {
    type: 'CGU',
    version: '2026-10-15',
    dateEffet: '2026-10-15',
    url: '/cgu',
    acceptationRequise: true,
    resumeChangements: 'Le nombre de publications dépend désormais de votre niveau.',
    aAccepter: false,
  },
  {
    type: 'CONFIDENTIALITE',
    version: '2026-09-01',
    dateEffet: '2026-09-01',
    url: '/confidentialite',
    acceptationRequise: false,
    resumeChangements: null,
    aAccepter: false,
  },
  {
    type: 'CHARTE',
    version: 'v3',
    dateEffet: '2026-11-02',
    url: '/charte-communautaire',
    acceptationRequise: true,
    resumeChangements: 'Nouvelle règle de citation.',
    aAccepter: true,
  },
];

describe('etatDocuments', () => {
  it('reprend version, changements et acceptation de chaque document (RG-03, RG-112)', () => {
    const etat = etatDocuments(VERSIONS);
    expect(etat.cgu).toMatchObject({ date: '2026-10-15', modifie: true, aAccepter: false });
    expect(etat.charte).toMatchObject({
      date: '2026-11-02',
      dateEffet: '2026-11-02',
      modifie: true,
      aAccepter: true,
    });
    // La politique de confidentialité informe : elle ne « change » pas au sens de l'acceptation.
    expect(etat.confidentialite).toMatchObject({ modifie: false, aAccepter: false });
    expect(etat.cookies).toMatchObject({ date: '2026-10-19', miseAJour: true });
  });

  it('affiche les pages sans dates quand l’API n’a pas répondu', () => {
    const etat = etatDocuments([]);
    expect(etat.cgu).toMatchObject({ date: null, modifie: false, aAccepter: false });
    expect(etat.mentions.date).toBe('2026-10-19');
  });
});

const TEXTE = `<section class="lg-article" id="objet">
  <h2><span class="lg-num"><svg class="icon" aria-hidden="true"><use href="#i-compass"></use></svg>Article 1</span>Objet et acceptation</h2>
  <p>Le délai est de 72 heures : voir la licence CC BY 4.0.</p>
</section>
<section class="lg-article" id="traitements"><h2>2. Données, usages et durées</h2><p>« Texte »</p></section>
<section class="lg-article" id="esprit"><h2>L’esprit de Vysora&nbsp;!</h2><pre><code>a : b</code></pre></section>`;

describe('articlesDuTexte', () => {
  it('lit le numéro et le titre de chaque section, comme le sommaire du prototype', () => {
    const articles = articlesDuTexte(TEXTE);
    expect(articles).toEqual([
      { id: 'objet', num: '1', titre: 'Objet et acceptation', article: true, numerote: true },
      {
        id: 'traitements',
        num: '2',
        titre: 'Données, usages et durées',
        article: false,
        numerote: true,
      },
      { id: 'esprit', num: '3', titre: 'L’esprit de Vysora !', article: false, numerote: false },
    ]);
    expect(articles.map(renvoi)).toEqual([
      'l’article 1',
      '« Données, usages et durées »',
      '« L’esprit de Vysora ! »',
    ]);
    expect(articles.map(libelleSection)).toEqual([
      'Article 1',
      'Section 2',
      'L’esprit de Vysora !',
    ]);
  });
});

describe('typographie', () => {
  it('pose les espaces insécables du texte sans toucher aux balises ni au code', () => {
    const html = typographieHtml(
      '<p title="a : b">Délai : 72 heures, licence CC BY 4.0 ; « oui »</p><code>a : b</code>',
    );
    expect(html).toBe(
      '<p title="a : b">Délai : 72 heures, licence CC BY 4.0 ; « oui »</p><code>a : b</code>',
    );
  });

  it('écrit « 1er » en exposant dans une date', () => {
    expect(dateHtml('2026-09-01')).toBe('1<sup>er</sup> septembre 2026');
  });

  it('décode les entités des intertitres', () => {
    expect(texteBrut('<b>R&amp;D</b>&#39;x&nbsp;y')).toBe("R&D'x y");
  });
});

describe('preparerTexte', () => {
  it('ajoute à chaque intertitre le bouton qui copie le lien de la section', () => {
    const html = preparerTexte(TEXTE, articlesDuTexte(TEXTE));
    expect(html).toContain(
      '<div class="lg-h"><h2>2. Données, usages et durées</h2><button class="lg-ancre" type="button" aria-label="Copier le lien vers « Données, usages et durées »" data-lg-ancre="traitements">',
    );
    expect(html).toContain('aria-label="Copier le lien vers l’article 1"');
    expect(html.match(/class="lg-ancre"/g)).toHaveLength(3);
  });
});
