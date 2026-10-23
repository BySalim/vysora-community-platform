# ADR-0001 — Monorepo TypeScript

Statut : Acceptée · Date : 2026-10-23

## Contexte

Le projet est réalisé en « vibe coding » par des sessions successives d'assistants, sous la direction du porteur du projet. Il faut un code que chaque session comprend vite, où une erreur de type se voit avant l'exécution, et où les règles ne sont écrites qu'une fois.

## Décision

Un seul dépôt, un seul langage : TypeScript strict de bout en bout, organisé en espaces de travail pnpm :
`apps/web` (site), `apps/api` (API), `packages/shared` (énumérations, règles, droits, schémas Zod, contrats d'API).

## Conséquences

- Les schémas de validation et leurs messages sont partagés par le navigateur et l'API.
- Un changement de vocabulaire (nouvelle valeur énumérée) se propage par le compilateur.
- `pnpm verifier` contrôle tout le dépôt en une commande.
- Le paquet partagé doit être reconstruit après modification (`pnpm --filter @vysora/shared build`, automatique avec `pnpm dev`).
