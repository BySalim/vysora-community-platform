# ADR-0007 — Relais /api par le site : une seule origine

Statut : Acceptée · Date : 2026-10-23

## Contexte

Le cookie de session et la protection CSRF sont plus simples et plus sûrs si le navigateur n'appelle qu'une origine. En développement, le relais intégré à Vite ne transmettait pas le corps des requêtes JSON (constaté avec Astro 7) : les envois restaient bloqués.

## Décision

Le site expose `src/pages/api/[...chemin].ts`, qui relaie toute requête `/api/*` vers l'API (méthode, corps, cookie, origine, adresse du visiteur dans `X-Forwarded-For`) et renvoie la réponse telle quelle. En production, le serveur frontal peut envoyer `/api/*` directement à l'API ; le relais reste alors inutilisé.

## Conséquences

- Même comportement en développement et en production ; pas de CORS.
- L'API fait confiance à `X-Forwarded-For` venant d'un relais local ou privé (`trust proxy`) pour les limites de débit.
- Le corps est lu en entier par le relais (envois de quelques Mo au plus).
