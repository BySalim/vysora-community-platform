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
| Mots de passe : Argon2id (19 Mio, 2 passes), 12 à 128 caractères, refus des mots de passe compromis (Have I Been Pwned par k-anonymat, liste intégrée en repli) et de ceux qui contiennent le pseudo ou l'adresse — RG-04 | `MotsDePasseService`, `problemeMotDePasse` |
| Session : jeton de 32 octets dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` et `__Host-` en production ; empreinte SHA-256 seule en base ; expiration glissante de 30 jours ; nouveau jeton à chaque connexion ; session d'un compte banni ou supprimé ignorée | `SessionsService` (ADR-0005) |
| Connexion : même message et même durée de calcul que l'adresse existe ou non ; temporisation de 30 s après 5 échecs consécutifs par adresse (empreinte salée), 10 essais par minute et par IP | `ConnexionService` |
| Droits vérifiés par l'API sur chaque route réservée (`@Exige`, mêmes règles que l'interface), avec la raison du refus | `SessionGuard` |
| Pages rendues pour un membre : `Cache-Control: private, no-store`, sans l'adresse e-mail dans le HTML | `middleware.ts`, `Base.astro` |

## 2. À mettre en place (par ordre d'arrivée)

**Authentification et sessions (AUTH-01)**
- [x] Mots de passe : Argon2id (`@node-rs/argon2`), 12 caractères minimum, 128 maximum, refus des mots de passe compromis (Have I Been Pwned, k-anonymat) — RG-04.
- [x] Session : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, préfixe `__Host-` en production ; seule l'empreinte SHA-256 est en base ; expiration glissante (30 jours) ; renouvellement du jeton à la connexion ; fermeture de la session de l'appareil. La liste des appareils et leur révocation à distance viennent avec PARAM-01.
- [x] Temporisation après 5 échecs consécutifs (F-03), message identique que le compte existe ou non (énumération).
- [ ] Purge des tentatives de connexion et des sessions expirées (tâche planifiée, EMAIL-01).
- Choix assumé (F-01) : l'inscription indique qu'une adresse est déjà associée à un compte ; la limite de débit (20 vérifications par minute et par IP) en freine l'exploitation.
- [ ] Liens par e-mail à usage unique, durée limitée (24 h vérification, 1 h réinitialisation), empreinte seule en base ; toutes les sessions fermées après un changement de mot de passe.
- [ ] Double authentification TOTP obligatoire pour modérateurs et administrateurs (ENF-05), secret chiffré (AES-256-GCM, `CLE_CHIFFREMENT`), codes de secours hachés.
- [x] Contrôle des droits côté API sur chaque route réservée (rôle, état du compte) ; tests de refus. La propriété d'un contenu se vérifie dans chaque service concerné.

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
