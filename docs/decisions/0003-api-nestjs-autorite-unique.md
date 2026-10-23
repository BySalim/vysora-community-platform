# ADR-0003 — API NestJS séparée, seule autorité sur les règles

Statut : Acceptée · Date : 2026-10-23

## Contexte

Les règles de gestion sont nombreuses (plus de 60 RG, 31 contraintes d'intégrité) et touchent la réputation, la modération et les données personnelles. Carnéo (V2) devra envoyer des parcours depuis l'extérieur. Le projet doit rester sûr même si une page oublie un contrôle.

## Décision

Une API REST séparée (`apps/api`), en NestJS 12 (ESM) : un module par domaine, contrôleurs minces, services porteurs des règles, accès aux données par Drizzle, gardes globales (origine, débit), filtre d'erreurs RFC 9457, validation par les schémas partagés. Le site n'accède jamais à la base : il appelle l'API.

## Conséquences

- Un seul endroit où vérifier les droits et les règles ; testable de bout en bout sans navigateur.
- Le site peut changer (ou être complété par une application mobile, Carnéo) sans toucher aux règles.
- Un saut réseau de plus pour le rendu serveur (local, négligeable).
- La structure NestJS (modules, injection, gardes) donne à chaque session un cadre connu.
