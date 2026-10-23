# Sécurité

> Socle en place et liste de contrôle à compléter au fil des tâches. Référence : OWASP Top 10 (édition en vigueur) et ASVS niveau 2 pour l'authentification, ENF-05 à ENF-09 du document 03.
> Chaque fonctionnalité qui touche un point ci-dessous le coche ou le met à jour.

## 1. Déjà en place

| Mesure | Où |
|---|---|
| Validation de toute entrée par un schéma (types, longueurs, formats) | `ValidationZod` + schémas de `@vysora/shared` |
| Erreurs sans fuite d'information (aucune pile, aucun message technique) | `FiltreErreurs` (RFC 9457) |
| Protection CSRF : origine vérifiée pour toute méthode qui modifie | `OrigineGuard` (complète le cookie `SameSite=Lax` à venir) |
| Limitation de débit globale (120 requêtes/min/IP) et par route (contact : 5 par quart d'heure) | `@nestjs/throttler` |
| En-têtes de sécurité de l'API | `helmet` |
| CSP stricte du site : scripts hachés, aucun script externe, `object-src 'none'`, `frame` interdit | `astro.config.mjs` (`security.csp`), `middleware.ts` |
| En-têtes du site : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production | `apps/web/src/middleware.ts` |
| Configuration validée au démarrage ; secrets de développement refusés en production | `apps/api/src/config/env.ts` |
| Aucune adresse IP en clair : empreinte HMAC salée | `empreinteSalee` |
| Journaux sans cookie, en-tête d'autorisation, IP ni corps de requête | `app.module.ts` (sérialiseurs pino) |
| Intégrité en base (contraintes CHECK, unicités, décisions de modération immuables) | migrations |
| Champ piège anti-robot sur le formulaire public | page Contact |
| Requêtes SQL paramétrées uniquement | Drizzle |
| Mots de passe en Argon2id (19 Mio, 2 passes), 12 à 128 caractères, refus des mots de passe courants, personnels (pseudo, e-mail) et présents dans des fuites connues (Have I Been Pwned, k-anonymat : 5 caractères de l'empreinte SHA-1 envoyés ; service en panne = contrôle local seul) | `MotsDePasseService`, `evaluerMotDePasse` (RG-04) |
| Vérification du mot de passe même sans compte (empreinte factice) : la durée de réponse ne révèle pas les adresses inscrites | `MotsDePasseService.verifier` |
| Sessions : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` et préfixe `__Host-` en production ; seule l'empreinte SHA-256 en base ; expiration glissante de 30 jours ; session de l'appareil fermée et rouverte à la connexion (fixation) ; cookie périmé effacé | `SessionsService`, `ChargementSession`, ADR-0005 |
| Connexion : message unique (« Adresse e-mail ou mot de passe incorrect. ») ; temporisation après 5 échecs consécutifs (30 s, doublée à chaque échec, 15 min au plus), comptée sur l'empreinte de l'adresse saisie, que le compte existe ou non ; compte banni refusé après vérification du mot de passe ; 20 essais par minute et par IP | `ConnexionService`, `TemporisationService` (F-03) |
| Inscription limitée à 10 par quart d'heure et par IP ; vérifications de disponibilité limitées (adresse : 20 par quart d'heure, pseudo : 60 par minute) | `ComptesController` |
| Droits contrôlés par l'API : `@Exige(action)` + `DroitsGuard` appliquent `raisonRefus` (session, e-mail vérifié, conditions acceptées, suspension, niveau, rôle) ; refus 401/403 avec la raison | `modules/auth/droits.ts` (AUTH-06) |
| État du visiteur inséré dans la page en JSON avec `<` échappé (aucune valeur ne peut fermer la balise `<script>`) | `layouts/Base.astro` |

## 2. À mettre en place (par ordre d'arrivée)

**Authentification et sessions (AUTH-01)**
- [x] Mots de passe : Argon2id (`@node-rs/argon2`), 12 caractères minimum, 128 maximum, refus des mots de passe compromis (Have I Been Pwned, k-anonymat) — RG-04.
- [x] Session : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, préfixe `__Host-` en production ; seule l'empreinte SHA-256 est en base ; expiration glissante (30 jours) ; renouvellement du jeton à la connexion. Reste la révocation d'un appareil depuis les paramètres (PARAM-01 ; `SessionsService.fermer` existe).
- [x] Temporisation après 5 échecs consécutifs (F-03), message identique que le compte existe ou non (énumération). Limite connue : la vérification de disponibilité de l'adresse (première étape de l'inscription, comme dans le prototype) dit si une adresse est inscrite ; elle est limitée en débit, comme l'inscription elle-même qui le révèle aussi (F-01).
- [ ] Liens par e-mail à usage unique, durée limitée (24 h vérification, 1 h réinitialisation), empreinte seule en base ; toutes les sessions fermées après un changement de mot de passe.
- [ ] Double authentification TOTP obligatoire pour modérateurs et administrateurs (ENF-05), secret chiffré (AES-256-GCM, `CLE_CHIFFREMENT`), codes de secours hachés.
- [~] Contrôle des droits côté API sur chaque route réservée (rôle, état du compte, propriété du contenu) ; tests de refus. La garde `@Exige` est en place (AUTH-06) ; la propriété des contenus se contrôle dans chaque module qui les modifie ; la double authentification s'ajoutera à la garde pour « moderer » et « administrer » (SEC-02).

**Contenus des membres**
- [ ] Markdown rendu côté serveur sans HTML brut, assaini (liste blanche), liens `rel="ugc nofollow noopener"` (ENF-06) ; code affiché comme texte, jamais exécuté.
- [ ] Images : type vérifié par signature (pas par l'extension), 5 Mo, ré-encodage (suppression des métadonnées EXIF), noms de fichiers aléatoires, servies avec `Content-Type` exact et `nosniff`.
- [ ] Détection de données sensibles avant publication (RG-22) : clés d'API, jetons, e-mails, téléphones.
- [ ] Limites par niveau (RG-85) et masquage automatique (RG-101).

**Exploitation**
- [ ] HTTPS partout (Caddy, certificats automatiques), HSTS.
- [ ] Secrets hors du dépôt (variables d'environnement du serveur), rotation documentée.
- [ ] Sauvegardes quotidiennes chiffrées, conservées 30 jours, restauration testée chaque trimestre (ENF-08).
- [ ] Mises à jour des dépendances (Renovate ou Dependabot) et audit (`pnpm audit`) en CI.
- [ ] Journal d'audit des actions d'administration conservé 1 an (ENF-09).
- [ ] Supervision : disponibilité, erreurs 5xx, alertes.

**Données personnelles (C-05, ENF-07)**
- [ ] Registre des traitements, durées de conservation (messages de contact : 1 an après réponse), cookies strictement nécessaires uniquement.
- [ ] Export (F-07) et suppression (F-08, D-09) complets, testés.
- [ ] Hébergement dans l'Union européenne (ou conforme à la loi du pays d'établissement).

## 3. Signaler une faille

Avant l'ouverture publique : ajouter `/.well-known/security.txt` (contact et politique de divulgation).
