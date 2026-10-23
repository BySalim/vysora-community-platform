# ADR-0006 — Vocabulaire du domaine en français dans le code

Statut : Acceptée · Date : 2026-10-23

## Contexte

Toute la documentation produit (vision, fonctionnalités, MCD, règles RG-xx, plan du site), le prototype et les adresses du site sont en français. Traduire chaque notion en anglais dans le code ajouterait une table de correspondance permanente et des erreurs de traduction.

## Décision

Le code reprend le vocabulaire du domaine en français, sans accents dans les identifiants : tables, colonnes, énumérations, services, méthodes métier (`publier`, `signalerObsolescence`). Les termes techniques du framework restent en anglais (`module`, `controller`, `middleware`). Commentaires et documentation en français.

## Conséquences

- Une règle se retrouve du document au code par son nom et son identifiant (`RG-42`).
- Mélange assumé de français (domaine) et d'anglais (technique) ; les conventions précisent la frontière.
