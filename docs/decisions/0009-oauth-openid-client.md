# ADR-0009 — Connexion avec GitHub et Google par `openid-client`

Statut : Acceptée · Date : 2026-11-05 · Remplace la mention d'`arctic` dans ADR-0005

## Contexte

ADR-0005 prévoyait la bibliothèque `arctic` pour la connexion avec GitHub et Google (F-02). Au moment de la réaliser (S-10, novembre 2026), `arctic` et ses dépendances `@oslojs/*` sont marquées « plus maintenues » sur npm. Une bibliothèque d'authentification qui ne reçoit plus de correctifs n'a pas sa place dans un projet sécurisé dès le départ. De plus, `arctic` ne proposait pas PKCE pour GitHub, qui l'accepte désormais.

## Décision

- **`openid-client`** (v6, certifiée OpenID, maintenue ; dépendances `oauth4webapi` et `jose`, du même auteur), version de septembre 2026 plutôt que la plus récente, publiée trois jours plus tôt.
- **Google** : OpenID Connect par découverte (`accounts.google.com`), portée `openid email` (rien de plus, minimisation), `state`, `nonce` et PKCE S256 ; le jeton d'identité est contrôlé (émetteur, audience, expiration, `nonce`) et l'adresse n'est retenue que si `email_verified` est vrai.
- **GitHub** : OAuth 2 (GitHub n'est pas un fournisseur OpenID), métadonnées déclarées dans le code, portée `user:email` seule (l'identité publique se lit sans portée), `state` et PKCE S256 ; l'identité et l'adresse principale vérifiée sont lues dans l'API REST de GitHub. Le jeton d'accès sert à cette lecture puis est oublié : il n'est jamais enregistré.
- Les secrets de l'aller-retour (`state`, vérificateur PKCE, `nonce`) et l'intention (connexion, inscription, liaison, code d'invitation, page de retour) voyagent dans un cookie chiffré et authentifié (AES-256-GCM, `CLE_CHIFFREMENT`), `HttpOnly`, `SameSite=Lax`, limité à `/api/v1/auth`, valable 10 minutes. Aucun état n'est gardé côté serveur.
- L'adresse de retour déclarée chez le service est celle du site (même origine, ADR-0007) : `<SITE_URL>/api/v1/auth/<service>/retour`.
- Les échanges avec les services sont isolés dans `FournisseursOAuth`, que les tests remplacent par un double ; les règles (inscription, connexion, liaison, aucune fusion automatique) vivent dans `ServicesExternesService`.

## Conséquences

- Les deux services suivent le même parcours ; ajouter un service OpenID (Microsoft, Apple) demande surtout une configuration.
- La découverte de Google se fait au premier usage, puis reste en mémoire ; un échec de découverte est retenté à la demande suivante.
- Le cookie de l'aller-retour suppose que le retour arrive dans le même navigateur que le départ dans les 10 minutes ; sinon la personne recommence, et rien n'est fait.
