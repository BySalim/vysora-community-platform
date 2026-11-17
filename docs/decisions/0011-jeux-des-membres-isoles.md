# ADR-0011 — Les jeux des membres s'exécutent dans un cadre isolé, servi par l'API

Statut : Acceptée · Date : 2026-11-17

## Contexte

Un défi peut demander un jeu jouable dans le navigateur (« Deploy Friday » : un seul fichier HTML obtenu d'une IA). La participation n'est plus une création d'Explorer : c'est un contenu à part (`participation`), publié depuis la page Défis, et son jeu doit se jouer sur Vysora. Le code d'un jeu est écrit par un membre ou par une IA : il ne doit jamais s'exécuter avec les droits du site (cookie de session, stockage, page, appels à l'API), ni joindre Internet, ni se faire passer pour une page de Vysora.

La démo validée (prototype/defis.js) isolait le jeu dans un cadre `srcdoc` avec une politique en `<meta>`. Sur le site, la politique de sécurité de la page s'appliquerait aussi à un cadre `srcdoc` (il en hérite) et y bloquerait les scripts du jeu.

## Décision

- **Le jeu est servi par l'API**, à `GET /api/v1/participations/:id/jeu`, avec la politique `CSP_JEU` : `sandbox allow-scripts allow-pointer-lock` (origine opaque : ni cookie, ni stockage, ni accès à la page qui l'affiche), `default-src 'none'`, `connect-src 'none'` (aucun appel réseau), `form-action 'none'`, `base-uri 'none'`, `frame-ancestors 'self'`, et `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-origin`. La politique `sandbox` vaut aussi si l'adresse est ouverte directement ; l'API la refuse d'ailleurs hors d'un cadre (`Sec-Fetch-Dest` autre que `iframe` : 404, le relais du site transmet cet en-tête).
- **La page l'affiche dans un `<iframe sandbox="allow-scripts allow-pointer-lock">`**, sans `allow-same-origin` : double protection, la page et la réponse imposent chacune l'isolement.
- **Stockage simulé** : un court script placé avant le code du membre remplace `localStorage` et `sessionStorage` (inaccessibles dans une origine opaque) par un stockage en mémoire, pour que les jeux qui gardent un record fonctionnent.
- **Essai avant publication** : `GET /api/v1/participations/essai` sert, avec la même politique, une page vide qui reçoit le code par `postMessage` de sa seule fenêtre parente et l'écrit dans son propre document. Le jeu s'essaie sans être enregistré.
- **Contrôle du fichier** (`controlerJeu`, `@vysora/shared`), le même dans la page et dans l'API : refus d'un fichier qui n'est pas une page HTML de 200 000 caractères au plus, d'un champ de mot de passe, de code de minage ; avertissement pour les appels à Internet, les ouvertures de fenêtre et le code masqué, que l'isolement neutralise.
- Le code d'une participation n'est rendu en texte qu'à son auteur (`GET /api/v1/defis/:id/participations/:participation/jeu`, en JSON), pour qu'il la modifie.

## Conséquences

- Un jeu ne peut ni lire la session, ni appeler l'API au nom de la personne, ni contacter un serveur ; il peut seulement dessiner dans son cadre, lire le clavier, la souris et le toucher.
- Un jeu qui dépend d'une bibliothèque ou d'une police en ligne ne marche pas : la règle du défi (« 0 ressource en ligne ») et l'avertissement du contrôle le disent avant publication.
- Une participation masquée ou supprimée par la modération n'est plus servie (404).
- Si un jour le site sert des contenus de membres plus riches (vidéo, modèles 3D), ils suivront le même principe : réponse de l'API avec sa propre politique `sandbox`, jamais exécutés dans la page.
