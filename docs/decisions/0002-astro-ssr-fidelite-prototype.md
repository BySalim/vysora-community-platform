# ADR-0002 — Astro en rendu serveur pour reproduire le prototype

Statut : Acceptée · Date : 2026-10-23

## Contexte

Premier objectif : une représentation exacte et complète du prototype, qui est un site multipage en HTML, CSS et JavaScript natif (environ 37 000 lignes, une feuille de style et un script par page). Exigences : pages indexables avec titre, description et aperçus de partage (ENF-04), performances (ENF-03), accessibilité (ENF-01), sécurité (CSP).

Options étudiées : Next.js (React partout, navigation côté client), Astro (HTML d'abord, îlots interactifs), gabarits serveur classiques.

## Décision

Astro 7 en rendu serveur (`@astrojs/node`, mode autonome). Chaque page du prototype devient une page Astro qui reprend son balisage et ses classes, importe sa feuille de style d'origine sans modification, et porte son script en TypeScript. Le HTML est complet côté serveur ; le JavaScript n'ajoute que les interactions. Si un widget devient trop complexe en script natif (éditeur de création, par exemple), un îlot React est permis (`@astrojs/react`), en le notant dans le registre.

## Conséquences

- Fidélité visuelle par construction : mêmes classes, mêmes feuilles de style, même découpage en pages (chaque page charge son CSS, sans fuite d'une page à l'autre).
- Référencement et premier affichage rapides ; peu de JavaScript livré.
- Politique de sécurité du contenu générée par Astro (scripts hachés).
- Le panneau Tweaks du prototype n'est pas repris : ses valeurs par défaut deviennent les attributs `data-*` fixes de chaque page.
- Le rendu de listes dynamiques peut exister à deux endroits (serveur et script) : on privilégie le rendu serveur, et un fragment HTML ou un îlot si la duplication devient gênante.
