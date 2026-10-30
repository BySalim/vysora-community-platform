# ADR-0005 — Sessions en base et cookie HttpOnly, sans JWT

Statut : Acceptée, appliquée par AUTH-01 le 2026-10-30 · Date : 2026-10-23

## Contexte

Il faut pouvoir fermer une session à distance (liste des appareils du prototype, suppression de compte, bannissement), exiger la double authentification pour la modération, et rester simple.

## Décision

- À la connexion : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, chemin `/`, nommé `__Host-vysora_session` en production (`vysora_session` en développement).
- En base (`session`) : seulement l'empreinte SHA-256 du jeton, l'utilisateur, l'expiration glissante (30 jours), l'appareil résumé, le lieu approximatif, l'empreinte de l'IP, la double authentification validée.
- Chaque requête : l'API retrouve la session par l'empreinte ; `GET /api/v1/session` renvoie au site l'état à afficher (`EtatVisiteur`, membre, notifications non lues).
- Protection CSRF : `SameSite=Lax` + vérification de l'origine (déjà en place).
- Mots de passe Argon2id ; comptes GitHub et Google par OAuth (bibliothèque `arctic`), sans fusion automatique (F-02).

## Conséquences

- Révocation immédiate, liste des appareils, déconnexion partout : simples.
- Une lecture en base par requête authentifiée (index sur la clé primaire ; cache possible plus tard).
- Pas de jeton lisible en JavaScript : une faille XSS ne permet pas de voler la session.

## Mise en œuvre (AUTH-01)

- `apps/api/src/modules/auth/` : `SessionsService` (ouverture, prolongation au plus une fois par heure, fermeture), `SessionGuard` global (session du cookie, droits `@Exige`), `EtatVisiteurService` (état calculé en une requête).
- Le site lit `GET /api/v1/session` dans son middleware, seulement si le cookie est présent, et renvoie au navigateur le cookie prolongé. Une page rendue pour un membre part avec `Cache-Control: private, no-store` et ne contient jamais son adresse e-mail.
