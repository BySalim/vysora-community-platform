/* Données structurées (schema.org) des pages de contenu : ce qu'un moteur ou un assistant d'IA
   comprend d'une création, d'un sujet du forum, d'un profil ou d'un savoir sans avoir à deviner la
   mise en page. Seuls les contenus visibles de tous en reçoivent ; le gabarit les écarte d'une page
   non indexée (brouillon, masquée, aperçu). */

import {
  LIBELLES_TYPE_SUJET,
  type CreationFicheApi,
  type ProfilApi,
  type SujetApi,
} from '@vysora/shared';
import type { Savoir } from './apprendre/types';
import { adresseCreation, outilsUtilises } from './creations';
import { ROUTES } from './navigation';
import { compteur, filAriane, personne, texteBrut, type DonneeStructuree } from './referencement';

const absolue = (chemin: string, site: URL): string => new URL(chemin, site).href;
/** Retire les propriétés vides : un moteur lit mieux une donnée absente qu'une donnée nulle. */
const sansVides = (objet: DonneeStructuree): DonneeStructuree =>
  Object.fromEntries(
    Object.entries(objet).filter(
      ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  );
const relieAuSite = (site: URL) => ({
  isPartOf: { '@id': absolue('/#site', site) },
  publisher: { '@id': absolue('/#organisation', site) },
  inLanguage: 'fr-FR',
});

/** Création publiée : l'œuvre, son auteur, sa licence, les outils du parcours. */
export function donneesCreation(fiche: CreationFicheApi, site: URL): DonneeStructuree[] {
  const adresse = absolue(adresseCreation(fiche), site);
  const image = fiche.images[0];
  const outils = outilsUtilises(fiche);
  const oeuvre = sansVides({
    '@type': 'CreativeWork',
    '@id': `${adresse}#creation`,
    url: adresse,
    name: fiche.titre,
    headline: fiche.titre,
    description: fiche.objectif ? texteBrut(fiche.objectif, 300) : null,
    author: personne(fiche.auteur, site),
    dateCreated: fiche.dateCreation,
    datePublished: fiche.datePublication,
    dateModified: fiche.dateModification ?? fiche.datePublication,
    license: fiche.licence.url,
    genre: fiche.categorie?.libelle,
    keywords: fiche.etiquettes.map((e) => e.libelle).join(', '),
    image: image ? absolue(image.url, site) : null,
    // Outils et modèles du parcours : ce que la page enseigne à reproduire.
    mentions: outils.map(({ outil, modele }) =>
      sansVides({
        '@type': 'SoftwareApplication',
        name: outil.nom,
        softwareVersion: modele,
      }),
    ),
    interactionStatistic: [
      compteur('LikeAction', fiche.preuve.utiles),
      compteur('CommentAction', fiche.commentaires.total),
    ],
    ...relieAuSite(site),
  });
  const niveaux: { nom: string; chemin: string }[] = [{ nom: 'Explorer', chemin: ROUTES.explorer }];
  if (fiche.categorie)
    niveaux.push({ nom: fiche.categorie.libelle, chemin: ROUTES.domaine(fiche.categorie.slug) });
  niveaux.push({ nom: fiche.titre ?? 'Création', chemin: adresseCreation(fiche) });
  return [oeuvre, filAriane(niveaux, site)];
}

/** Sujet du forum : une discussion, ses réponses visibles, la réponse acceptée en tête. */
export function donneesSujet(sujet: SujetApi, site: URL): DonneeStructuree[] {
  const adresse = absolue(ROUTES.sujet(sujet.id, sujet.slug), site);
  const reponses = sujet.reponses.elements.filter((r) => !r.masquee && r.corps.trim());
  const corps = [sujet.corps, sujet.clinique?.prompt, sujet.astuce?.avant, sujet.astuce?.apres]
    .filter((t): t is string => Boolean(t?.trim()))
    .join('\n\n');
  const discussion = sansVides({
    '@type': 'DiscussionForumPosting',
    '@id': `${adresse}#sujet`,
    url: adresse,
    headline: sujet.titre,
    genre: LIBELLES_TYPE_SUJET[sujet.type],
    text: texteBrut(corps, 1500),
    author: personne(sujet.auteur, site),
    datePublished: sujet.dateCreation,
    dateModified: sujet.dateModification,
    keywords: sujet.etiquettes.map((e) => e.libelle).join(', '),
    about: sujet.outil ? { '@type': 'SoftwareApplication', name: sujet.outil.nom } : null,
    interactionStatistic: [
      compteur('LikeAction', sujet.utiles),
      compteur('CommentAction', sujet.reponses.total),
    ],
    comment: reponses.slice(0, 20).map((r) =>
      sansVides({
        '@type': 'Comment',
        text: texteBrut(r.corps, 1000),
        author: personne(r.auteur, site),
        datePublished: r.date,
        upvoteCount: r.utiles,
      }),
    ),
    ...relieAuSite(site),
  });
  return [
    discussion,
    filAriane(
      [
        { nom: 'Forum', chemin: ROUTES.forum },
        { nom: sujet.titre, chemin: ROUTES.sujet(sujet.id, sujet.slug) },
      ],
      site,
    ),
  ];
}

/** Profil public d'un membre. */
export function donneesProfil(profil: ProfilApi, site: URL): DonneeStructuree {
  const { membre, statistiques } = profil;
  return sansVides({
    '@type': 'ProfilePage',
    url: absolue(ROUTES.profil(membre.pseudo), site),
    dateCreated: membre.dateInscription,
    mainEntity: sansVides({
      ...personne(membre, site),
      description: membre.biographie ? texteBrut(membre.biographie, 300) : null,
      sameAs: membre.lien ? [membre.lien] : null,
      interactionStatistic: [compteur('WriteAction', statistiques.creations)],
    }),
    ...relieAuSite(site),
  });
}

/** Savoir d'Apprendre : un article de l'équipe. */
export function donneesSavoir(savoir: Savoir, site: URL): DonneeStructuree[] {
  const chemin = `${ROUTES.apprendre}?savoir=${encodeURIComponent(savoir.id)}`;
  const texte = (savoir.body ?? [])
    .flatMap((b) => [b.h, ...(b.p ?? []), ...(b.steps ?? [])])
    .filter(Boolean)
    .join(' ');
  return [
    sansVides({
      '@type': 'Article',
      url: absolue(chemin, site),
      headline: savoir.title,
      description: savoir.short,
      articleBody: texte ? texteBrut(texte, 3000) : null,
      dateModified: savoir.updated,
      timeRequired: `PT${savoir.minutes}M`,
      author: { '@id': absolue('/#organisation', site) },
      ...relieAuSite(site),
    }),
    filAriane(
      [
        { nom: 'Apprendre', chemin: ROUTES.apprendre },
        { nom: savoir.title, chemin },
      ],
      site,
    ),
  ];
}
