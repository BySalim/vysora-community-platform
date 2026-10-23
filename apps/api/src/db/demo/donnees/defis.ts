import type { DefiDemo } from '../types.js';

/* Défis des semaines 40 à 42 (classements-data.js) ; les participations sont des créations (creations.ts). */

export const DEFIS: DefiDemo[] = [
  {
    slug: 'une-affiche-touristique-en-trois-echanges',
    titre: 'Une affiche touristique en trois échanges',
    enonce:
      'Créez l’affiche touristique d’un lieu que vous aimez, en trois échanges au plus avec l’IA. Publiez l’affiche avec les prompts utilisés : la communauté vote pour les méthodes qui lui sont utiles.',
    contraintes:
      '- Trois échanges au maximum avec l’IA\n- Un texte lisible et sans faute sur l’affiche\n- Un lieu réel, photographié ou décrit',
    debut: '2026-10-12T00:00',
    fin: '2026-10-19T23:59',
    statut: 'PUBLIE',
  },
  {
    slug: 'un-logo-lisible-en-petit-format',
    titre: 'Un logo lisible en petit format',
    enonce:
      'Créez le logo d’une entreprise de votre quartier, lisible même en très petit format. Publiez le logo et le chemin parcouru, du premier essai à la version retenue.',
    contraintes:
      '- Lisible à 32 pixels\n- Deux couleurs au maximum\n- Le nom exact de l’entreprise',
    debut: '2026-10-05T00:00',
    fin: '2026-10-11T23:59',
    statut: 'CLOTURE',
  },
  {
    slug: 'un-script-qui-ne-supprime-rien',
    titre: 'Un script qui ne supprime rien',
    enonce:
      'Faites écrire par l’IA un script qui range, renomme ou nettoie des fichiers sans jamais rien supprimer. Publiez le script, le prompt complet et la façon dont vous l’avez vérifié.',
    contraintes:
      '- Un mode simulation avant toute action\n- Aucune suppression définitive\n- Le prompt complet publié avec le script',
    debut: '2026-09-28T00:00',
    fin: '2026-10-04T23:59',
    statut: 'CLOTURE',
  },
];
