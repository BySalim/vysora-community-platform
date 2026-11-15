import type { CreationFicheApi, GuideResumeApi, SujetApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { APPRENDRE } from './apprendre/contenus';
import { donneesCreation, donneesSavoir, donneesSujet } from './donnees-structurees';
import { entreesPlan, texteLlms } from './plan-du-site';
import {
  directiveRobots,
  jsonLd,
  modeIndexation,
  planDuSite,
  ROBOTS_ENTRAINEMENT,
  texteBrut,
  texteRobots,
} from './referencement';

const site = new URL('https://vysora.site');
const auteur = {
  id: 7,
  pseudo: 'claire-dubois',
  nom: 'Claire Dubois',
  avatar: '/api/v1/fichiers/7-256.webp',
  niveau: { code: 'CONFIRME', libelle: 'Confirmé' },
  reputation: 120,
} as unknown as CreationFicheApi['auteur'];

describe('mode d’indexation', () => {
  it('lit la variable du serveur, et n’indexe rien par défaut', () => {
    expect(modeIndexation('pages')).toBe('pages');
    expect(modeIndexation(' Complete ')).toBe('complete');
    expect(modeIndexation(undefined)).toBe('aucune');
    expect(modeIndexation('oui')).toBe('aucune');
  });

  it('écarte les contenus des membres tant que la démonstration est en ligne', () => {
    expect(directiveRobots({}, 'pages')).toBe('max-image-preview:large');
    expect(directiveRobots({ contenuDeMembre: true }, 'pages')).toBe('noindex, follow');
    expect(directiveRobots({ contenuDeMembre: true }, 'complete')).toBe('max-image-preview:large');
    expect(directiveRobots({ nonIndexee: true, contenuDeMembre: true }, 'complete')).toBe(
      'noindex, nofollow',
    );
    expect(directiveRobots({}, 'aucune')).toBe('noindex, nofollow');
  });
});

describe('robots.txt', () => {
  it('refuse les robots d’entraînement et admet les autres hors des espaces personnels', () => {
    const texte = texteRobots(site, 'pages');
    const groupes = texte.split('\n\n');
    expect(groupes[0]).toContain('User-agent: *');
    expect(groupes[0]).toContain('Disallow: /parametres');
    expect(groupes[0]).toContain('Allow: /api/v1/fichiers/');
    for (const robot of ROBOTS_ENTRAINEMENT) expect(groupes[1]).toContain(`User-agent: ${robot}`);
    expect(groupes[1]).toMatch(/Disallow: \/\n?$/);
    expect(texte).toContain('Sitemap: https://vysora.site/sitemap.xml');
    // Les robots qui citent leurs sources suivent la règle commune.
    expect(texte).not.toMatch(/User-agent: (OAI-SearchBot|Claude-User|PerplexityBot)/);
  });

  it('ne révèle pas les zones de l’équipe (ADM-04)', () => {
    expect(texteRobots(site, 'complete')).not.toMatch(/admin|moderation/);
  });

  it('ferme tout le site quand rien n’est indexé', () => {
    expect(texteRobots(site, 'aucune')).toContain('User-agent: *\nDisallow: /');
    expect(texteRobots(site, 'aucune')).not.toContain('Sitemap');
  });
});

describe('plan du site', () => {
  it('écrit chaque adresse une fois, avec sa date, en XML échappé', () => {
    const xml = planDuSite(
      [
        { chemin: '/' },
        { chemin: '/explorer?guide=a&b', modification: '2026-11-02T10:00:00Z' },
        { chemin: '/' },
        { chemin: '/cgu', modification: 'pas une date' },
      ],
      site,
    );
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain(
      '<loc>https://vysora.site/explorer?guide=a&amp;b</loc><lastmod>2026-11-02</lastmod>',
    );
    expect(xml).toContain('<loc>https://vysora.site/cgu</loc></url>');
  });

  it('présente les pages de l’équipe, guides et savoirs compris', () => {
    const guide = {
      slug: 'rendez-vous',
      titre: 'Mettre en place la prise de rendez-vous en ligne',
      miseAJour: '2026-11-01T08:00:00Z',
      parcours: 4,
      domaine: {
        id: 1,
        libelle: 'Application web',
        slug: 'application-web',
        icone: null,
        description: null,
      },
    } as GuideResumeApi;
    const chemins = entreesPlan({ guides: [guide], domaines: [guide.domaine] }).map(
      (e) => e.chemin,
    );
    expect(chemins.slice(0, 2)).toEqual(['/', '/explorer']);
    expect(chemins).toContain('/explorer?guide=rendez-vous');
    expect(chemins).toContain('/categories/application-web');
    expect(chemins).toContain(`/apprendre?savoir=${APPRENDRE.savoirs[0]?.id}`);
    expect(chemins).toContain('/mentions-legales');
    expect(chemins.some((c) => c.startsWith('/creations/') || c.startsWith('/membres/'))).toBe(
      false,
    );

    const llms = texteLlms({ guides: [guide], domaines: [] }, site, 'pages');
    expect(llms.startsWith('# Vysora\n\n> ')).toBe(true);
    expect(llms).toContain(
      '- [Mettre en place la prise de rendez-vous en ligne](https://vysora.site/explorer?guide=rendez-vous) : Application web, 4 parcours publiés.',
    );
    expect(llms).toContain('exemples de démonstration');
    expect(texteLlms({ guides: [], domaines: [] }, site, 'complete')).not.toContain(
      'démonstration',
    );
  });
});

describe('données structurées', () => {
  it('ne laisse aucun contenu fermer la balise <script>', () => {
    const texte = jsonLd({ '@type': 'Thing', name: '</script><script>alert(1)</script>' });
    expect(texte).not.toContain('<');
    expect(JSON.parse(texte)).toMatchObject({
      '@context': 'https://schema.org',
      name: '</script><script>alert(1)</script>',
    });
    expect(JSON.parse(jsonLd([{ '@type': 'A' }, { '@type': 'B' }]))['@graph']).toHaveLength(2);
  });

  it('résume un Markdown de membre en texte brut', () => {
    expect(texteBrut('**Gras** et [lien](https://x.example)\n\n```js\ncode\n```\n> cité')).toBe(
      'Gras et lien cité',
    );
    expect(texteBrut('a'.repeat(20), 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it('décrit une création : auteur, licence, outils, fil d’Ariane', () => {
    const fiche = {
      id: 12,
      slug: 'cite-imaginaire',
      titre: 'Cité imaginaire',
      objectif: 'Une **cité** dessinée',
      dateCreation: '2026-10-01T10:00:00Z',
      datePublication: '2026-10-02T10:00:00Z',
      dateModification: null,
      auteur,
      categorie: { id: 1, libelle: 'Image', slug: 'image', icone: null },
      licence: {
        code: 'CC-BY-4.0',
        libelle: 'CC BY 4.0',
        url: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
        autoriseVariantes: true,
      },
      etiquettes: [{ libelle: 'Architecture', slug: 'architecture' }],
      guide: null,
      images: [],
      etapes: [
        {
          configurations: [
            {
              outil: {
                id: 3,
                nom: 'Midjourney',
                slug: 'midjourney',
                logo: null,
                logoMonochrome: false,
              },
              modele: null,
              modeleNonReference: null,
            },
          ],
        },
      ],
      preuve: { utiles: 5 },
      commentaires: { total: 2, elements: [] },
    } as unknown as CreationFicheApi;
    const [oeuvre, ariane] = donneesCreation(fiche, site);
    expect(oeuvre).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://vysora.site/creations/12-cite-imaginaire',
      description: 'Une cité dessinée',
      license: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
      dateModified: '2026-10-02T10:00:00Z',
      author: {
        '@type': 'Person',
        name: 'Claire Dubois',
        url: 'https://vysora.site/membres/claire-dubois',
      },
      mentions: [{ '@type': 'SoftwareApplication', name: 'Midjourney' }],
    });
    expect(oeuvre).not.toHaveProperty('image');
    expect(ariane).toMatchObject({ '@type': 'BreadcrumbList' });
    expect(ariane?.itemListElement).toHaveLength(4);
  });

  it('décrit un sujet du forum sans ses réponses masquées', () => {
    const reponse = (id: number, masquee: boolean) => ({
      id,
      auteur,
      date: '2026-10-03T10:00:00Z',
      dateModification: null,
      corps: `Réponse ${id}`,
      prompt: null,
      utiles: 1,
      acceptee: null,
      masquee,
      masquage: null,
      moi: null,
    });
    const sujet = {
      id: 4,
      slug: 'verifier-un-script',
      type: 'QUESTION',
      titre: 'Vérifier un script',
      corps: 'Comment **vérifier** ?',
      clinique: null,
      astuce: null,
      outil: null,
      etiquettes: [],
      auteur,
      dateCreation: '2026-10-02T10:00:00Z',
      dateModification: null,
      utiles: 3,
      reponses: { total: 2, elements: [reponse(1, false), reponse(2, true)] },
    } as unknown as SujetApi;
    const [discussion] = donneesSujet(sujet, site);
    expect(discussion).toMatchObject({
      '@type': 'DiscussionForumPosting',
      headline: 'Vérifier un script',
      text: 'Comment vérifier ?',
      genre: 'Question',
    });
    expect(discussion?.comment).toHaveLength(1);
  });

  it('décrit un savoir d’Apprendre comme un article de l’équipe', () => {
    const savoir = APPRENDRE.savoirs[0];
    if (!savoir) throw new Error('Aucun savoir');
    const [article] = donneesSavoir(savoir, site);
    expect(article).toMatchObject({
      '@type': 'Article',
      headline: savoir.title,
      author: { '@id': 'https://vysora.site/#organisation' },
      timeRequired: `PT${savoir.minutes}M`,
    });
  });
});
