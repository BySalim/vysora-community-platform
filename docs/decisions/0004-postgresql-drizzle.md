# ADR-0004 — PostgreSQL et Drizzle ; MLD fidèle au MCD

Statut : Acceptée · Date : 2026-10-23

## Contexte

Le MCD (document 05) compte 32 entités, une généralisation, des associations ternaires et de nombreuses contraintes. Il faut une base qui les exprime, une recherche plein texte en français, et un schéma lisible par chaque session.

## Décision

- PostgreSQL 18 (contraintes CHECK, index partiels et d'expression, contraintes différées, déclencheurs, JSONB, recherche plein texte avec une configuration française sans accents).
- Drizzle ORM : schéma en TypeScript (le MLD vivant), requêtes typées proches du SQL, migrations générées puis relues ; ce que Drizzle ne décrit pas passe par une migration manuelle.
- Règles de passage : [`../mld.md`](../mld.md) (clés numériques, énumérations en texte contrôlé, sous-types à clé `(id, type_contenu)`, brouillons tolérants, données calculées non stockées au départ).

## Conséquences

- Une partie des contraintes d'intégrité est garantie par la base, le reste par l'API avec des tests.
- Les migrations sont versionnées et rejouées à l'identique en test, en CI et en production.
- Drizzle 1.0 (en version candidate à cette date) pourra être adopté plus tard ; le passage demandera une relecture des migrations.
