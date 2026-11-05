# ADR-0005 — Sessions en base et cookie HttpOnly, sans JWT

Statut : Acceptée, appliquée par AUTH-01 · Date : 2026-10-23

## Contexte

Il faut pouvoir fermer une session à distance (liste des appareils du prototype, suppression de compte, bannissement), exiger la double authentification pour la modération, et rester simple.

## Décision

- À la connexion : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, chemin `/`, nommé `__Host-vysora_session` en production (`vysora_session` en développement).
- En base (`session`) : seulement l'empreinte SHA-256 du jeton, l'utilisateur, l'expiration glissante (30 jours), l'appareil résumé, le lieu approximatif, l'empreinte de l'IP, la double authentification validée.
- Chaque requête : l'API retrouve la session par l'empreinte ; `GET /api/v1/session` renvoie au site l'état à afficher (`EtatVisiteur`, membre, notifications non lues).
- Protection CSRF : `SameSite=Lax` + vérification de l'origine (déjà en place).
- Mots de passe Argon2id ; comptes GitHub et Google par OAuth, sans fusion automatique (F-02). La bibliothèque prévue, `arctic`, n'est plus maintenue : remplacée par `openid-client` (ADR-0009).

## Conséquences

- Révocation immédiate, liste des appareils, déconnexion partout : simples.
- Une lecture en base par requête authentifiée (index sur la clé primaire ; cache possible plus tard).
- Pas de jeton lisible en JavaScript : une faille XSS ne permet pas de voler la session.

## Mise en œuvre (AUTH-01)

- `apps/api/src/modules/auth` : `SessionsService` (ouvrir, retrouver, prolonger, fermer), middleware `ChargementSession` (session attachée à chaque requête, cookie périmé effacé), `EtatCompteService` (état affiché), `DroitsGuard` et `@Exige(action)` (AUTH-06).
- L'échéance glissante n'est réécrite qu'une fois par heure au plus, et le cookie renouvelé en même temps. Quand le site lit la session pour rendre une page, il renvoie au navigateur les cookies posés par l'API (`middleware.ts`).
- La connexion ferme la session déjà présente sur l'appareil au lieu de la reprendre (fixation de session).
- À faire plus tard : purge des sessions expirées (tâche planifiée, EMAIL-01) ; lieu approximatif (aucune base de géolocalisation pour l'instant).
