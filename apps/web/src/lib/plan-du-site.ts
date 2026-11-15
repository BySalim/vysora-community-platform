/* Pages que le site présente aux moteurs (sitemap.xml) et aux assistants d'IA (llms.txt) : celles
   de l'équipe (rubriques, guides d'Explorer, domaines, savoirs d'Apprendre, pages légales). Les
   contenus des membres s'y ajouteront quand INDEXATION vaudra « complete » (REF-02). */

import type { DomaineApi, GuideResumeApi } from '@vysora/shared';
import { APPRENDRE } from './apprendre/contenus';
import { ROUTES } from './navigation';
import { PRESENTATION, SLOGAN, type EntreePlan, type ModeIndexation } from './referencement';

export interface DonneesPlan {
  guides: GuideResumeApi[];
  domaines: DomaineApi[];
}

/** Rubriques principales, dans l'ordre du menu, et ce qu'on y trouve. */
const RUBRIQUES: { chemin: string; nom: string; resume: string }[] = [
  {
    chemin: ROUTES.explorer,
    nom: 'Explorer',
    resume:
      'les guides par objectif, qui rassemblent les étapes et les pièges relevés dans plusieurs parcours, et la recherche des créations par outil et par domaine.',
  },
  {
    chemin: ROUTES.apprendre,
    nom: 'Apprendre',
    resume:
      'les bases pour démarrer, les notions, les règles qui évitent les erreurs coûteuses, les astuces de chaque outil et les cas Bon réflexe.',
  },
  {
    chemin: ROUTES.forum,
    nom: 'Forum',
    resume:
      'les questions des membres, la clinique du prompt, où l’on fait corriger un prompt qui ne donne pas ce qu’on attend, et les astuces testées par la communauté.',
  },
  {
    chemin: ROUTES.defis,
    nom: 'Défis',
    resume: 'un thème par période, les participations et leur classement.',
  },
  {
    chemin: ROUTES.classements,
    nom: 'Classements',
    resume: 'les membres qui aident le plus, par période et par outil.',
  },
];

const LEGALES: { chemin: string; nom: string }[] = [
  { chemin: ROUTES.cgu, nom: 'Conditions générales d’utilisation' },
  { chemin: ROUTES.charte, nom: 'Charte communautaire' },
  { chemin: ROUTES.confidentialite, nom: 'Politique de confidentialité' },
  { chemin: ROUTES.cookies, nom: 'Cookies' },
  { chemin: ROUTES.mentionsLegales, nom: 'Mentions légales' },
];

/** Adresses du plan du site, des plus importantes aux moins importantes. */
export function entreesPlan({ guides, domaines }: DonneesPlan): EntreePlan[] {
  return [
    { chemin: ROUTES.accueil },
    ...RUBRIQUES.map((r) => ({ chemin: r.chemin })),
    ...guides.map((g) => ({ chemin: ROUTES.guide(g.slug), modification: g.miseAJour })),
    ...domaines.map((d) => ({ chemin: ROUTES.domaine(d.slug) })),
    ...APPRENDRE.rubriques.map((r) => ({
      chemin: `${ROUTES.apprendre}?rubrique=${encodeURIComponent(r.id)}`,
    })),
    ...APPRENDRE.savoirs.map((s) => ({
      chemin: `${ROUTES.apprendre}?savoir=${encodeURIComponent(s.id)}`,
      modification: s.updated,
    })),
    { chemin: ROUTES.contact },
    ...LEGALES.map((l) => ({ chemin: l.chemin })),
  ];
}

/** Texte d'une ligne de liste Markdown : sur une ligne, sans crochets qui fermeraient le lien. */
const ligne = (texte: string): string => texte.replace(/\s+/g, ' ').replace(/[[\]]/g, '').trim();
const lien = (nom: string, chemin: string, site: URL, resume?: string | null): string =>
  `- [${ligne(nom)}](${new URL(chemin, site).href})${resume ? ` : ${ligne(resume)}` : ''}`;

/** llms.txt (format llmstxt.org) : ce qu'est Vysora, ses rubriques et ses guides, pour les
    assistants d'IA qui lisent le site à la demande d'une personne. */
export function texteLlms(
  { guides, domaines }: DonneesPlan,
  site: URL,
  mode: ModeIndexation,
): string {
  const parties: string[] = [
    '# Vysora',
    '',
    `> ${PRESENTATION}`,
    '',
    `${SLOGAN} Vysora est en français et gratuit. Chaque création montre son résultat et le parcours qui y a mené : les prompts exacts, l’outil et le modèle employés, les réglages et les moments clés où le travail a changé de direction. Les membres qui la refont déclarent s’ils ont réussi ; à partir de trois essais, la fiche affiche un taux de succès, et elle signale quand un modèle ne donne plus le même résultat.`,
    '',
    'Pour citer Vysora : chaque création est publiée sous la licence que son auteur a choisie (CC BY 4.0 par défaut), indiquée sur sa fiche ; les sujets, réponses, commentaires et cas Bon réflexe sont publiés sous CC BY 4.0. Indiquez le nom de l’auteur et l’adresse de la page.',
  ];
  if (mode !== 'complete')
    parties.push(
      '',
      'Le site est en préproduction : les membres, créations et discussions qu’il présente sont des exemples de démonstration, pas des personnes ni des travaux réels.',
    );
  parties.push(
    '',
    '## Rubriques',
    '',
    lien(
      'Accueil',
      ROUTES.accueil,
      site,
      'présentation de Vysora, créations et questions du moment.',
    ),
    ...RUBRIQUES.map((r) => lien(r.nom, r.chemin, site, r.resume)),
  );
  if (guides.length > 0)
    parties.push(
      '',
      '## Guides d’Explorer',
      '',
      ...guides.map((g) =>
        lien(
          g.titre,
          ROUTES.guide(g.slug),
          site,
          `${g.domaine.libelle}, ${g.parcours} parcours publié${g.parcours > 1 ? 's' : ''}.`,
        ),
      ),
    );
  if (domaines.length > 0)
    parties.push(
      '',
      '## Domaines',
      '',
      ...domaines.map((d) => lien(d.libelle, ROUTES.domaine(d.slug), site, d.description)),
    );
  parties.push(
    '',
    '## Apprendre',
    '',
    ...APPRENDRE.savoirs.map((s) =>
      lien(s.title, `${ROUTES.apprendre}?savoir=${encodeURIComponent(s.id)}`, site, s.short),
    ),
    '',
    '## Conditions et contact',
    '',
    ...LEGALES.map((l) => lien(l.nom, l.chemin, site)),
    lien('Contact', ROUTES.contact, site, 'écrire à l’équipe de Vysora.'),
    '',
  );
  return parties.join('\n');
}
