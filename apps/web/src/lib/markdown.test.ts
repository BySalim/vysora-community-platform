import { describe, expect, it } from 'vitest';
import { rendreMarkdown, rendreMarkdownEnLigne } from './markdown';
import { typo } from './texte';

/* SEC-01, ENF-06 : aucun contenu d'un membre n'est exécuté. */

describe('rendreMarkdown : mise en forme permise', () => {
  it('rend paragraphes, retours à la ligne, mise en valeur, listes et citations', () => {
    expect(rendreMarkdown('**Gras** et *italique*\nsuite\n\n- un\n- deux\n\n> cité')).toBe(
      '<p><strong>Gras</strong> et <em>italique</em><br>\nsuite</p>\n<ul>\n<li>un</li>\n<li>deux</li>\n</ul>\n<blockquote>\n<p>cité</p>\n</blockquote>\n',
    );
  });

  it('affiche le code comme du texte, sans typographie ni exécution', () => {
    expect(rendreMarkdown('```html\n<script>alert("x")</script>\n```')).toBe(
      '<pre><code class="language-html">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;\n</code></pre>\n',
    );
    expect(rendreMarkdown('Appelez `prix ?` puis `<b>`')).toBe(
      '<p>Appelez <code>prix ?</code> puis <code>&lt;b&gt;</code></p>\n',
    );
  });

  it('applique la typographie française au texte courant', () => {
    const texte = 'Résultat : « parfait » ?';
    expect(typo(texte)).not.toBe(texte);
    expect(rendreMarkdown(texte)).toBe(`<p>${typo(texte)}</p>\n`);
  });

  it('garde les titres sous ceux de la page', () => {
    expect(rendreMarkdown('# Plan\n## Détail\n#### Note')).toBe(
      '<h4>Plan</h4>\n<h5>Détail</h5>\n<h6>Note</h6>\n',
    );
  });

  it('marque les liens externes comme contenus d’utilisateurs, ouverts dans un nouvel onglet', () => {
    expect(rendreMarkdown('[Démo](https://demo.example) et https://depot.example/code')).toBe(
      '<p><a href="https://demo.example" rel="ugc nofollow noopener noreferrer" target="_blank">Démo<span class="sr-only"> (nouvel onglet)</span></a> et <a href="https://depot.example/code" rel="ugc nofollow noopener noreferrer" target="_blank">https://depot.example/code<span class="sr-only"> (nouvel onglet)</span></a></p>\n',
    );
    expect(rendreMarkdown('[La fiche](/creations/12-cite)')).toBe(
      '<p><a href="/creations/12-cite">La fiche</a></p>\n',
    );
  });

  it('ne transforme pas en lien un nom de fichier ou de domaine sans adresse complète', () => {
    expect(rendreMarkdown('Ouvrez app.js sur vysora.fr')).toBe(
      '<p>Ouvrez app.js sur vysora.fr</p>\n',
    );
  });
});

describe('rendreMarkdown : contenus hostiles', () => {
  const BALISES_PERMISES = ['p', 'br', 'a', 'span', 'strong', 'em', 'code', 'pre'];
  const ATTRIBUTS_PERMIS = ['href', 'title', 'rel', 'target', 'class'];
  const ADRESSE_PERMISE = /^(?:https?:\/\/|mailto:|\/(?!\/))/;
  const VECTEURS = [
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)">clic</a>',
    '[clic](javascript:alert(1))',
    '[clic](JaVaScRiPt:alert(1))',
    '[clic](&#106;avascript:alert(1))',
    '[clic](javascript&colon;alert(1))',
    '[clic](vbscript:msgbox(1))',
    '[clic](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    '[clic](file:///etc/passwd)',
    '[clic](//pirate.example/vol)',
    '<javascript:alert(1)>',
    '![suivi](https://pirate.example/pixel.png)',
    '[clic](https://ok.example "titre\\" onmouseover=\\"alert(1)")',
    '<style>body{display:none}</style>',
    '<iframe src="https://pirate.example"></iframe>',
  ];

  /** Vraies balises du rendu (le texte échappé, « &lt;img … &gt; », est inoffensif) et leurs attributs. */
  function balises(html: string): { nom: string; attributs: [string, string][]; reste: string }[] {
    return (html.match(/<[^>]+>/g) ?? []).map((balise) => {
      const [, nom = '', corps = ''] = /^<\/?([a-z0-9]+)(.*?)\/?>$/i.exec(balise) ?? [];
      // Une valeur d'attribut ne contient jamais de guillemet brut : il est échappé en &quot;.
      const motif = /\s([\w-]+)="([^"]*)"/g;
      const attributs = [...corps.matchAll(motif)].map(
        ([, attribut = '', valeur = '']) => [attribut, valeur] as [string, string],
      );
      return { nom: nom.toLowerCase(), attributs, reste: corps.replace(motif, '').trim() };
    });
  }

  it.each(VECTEURS)('n’exécute rien : %s', (vecteur) => {
    for (const { nom, attributs, reste } of balises(rendreMarkdown(vecteur))) {
      expect(BALISES_PERMISES).toContain(nom);
      expect(reste).toBe('');
      for (const [attribut, valeur] of attributs) {
        expect(ATTRIBUTS_PERMIS).toContain(attribut);
        if (attribut === 'href') expect(valeur).toMatch(ADRESSE_PERMISE);
      }
    }
  });

  it('affiche le HTML écrit par un membre comme du texte', () => {
    expect(rendreMarkdown('<b>gras</b>')).toBe('<p>&lt;b&gt;gras&lt;/b&gt;</p>\n');
  });

  it('refuse les adresses dangereuses : le lien reste du texte', () => {
    expect(rendreMarkdown('[clic](javascript:alert(1))')).toBe(
      '<p>[clic](javascript:alert(1))</p>\n',
    );
  });
});

describe('rendreMarkdownEnLigne', () => {
  it('rend la mise en valeur sans paragraphe', () => {
    expect(rendreMarkdownEnLigne('Le **contraste** de `h1`')).toBe(
      'Le <strong>contraste</strong> de <code>h1</code>',
    );
    expect(rendreMarkdownEnLigne(null)).toBe('');
  });
});
