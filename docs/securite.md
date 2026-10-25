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
| En-têtes du site : `X-Frame-Options` (`DENY` ; `SAMEORIGIN` pour la seule fiche ouverte en aperçu, `?apercu`, que l'éditeur affiche dans un cadre), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production | `apps/web/src/middleware.ts` |
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
| Messages d'accès (dialogue, bloc, invitation) construits avec échappement de chaque texte et de chaque adresse ; retour après la connexion limité aux chemins internes | `lib/acces.ts`, `lib/retour.ts` (AUTH-07) |
| Pages légales : seul le balisage écrit dans le dépôt est transformé (typographie, liens de section) ; les textes venus de l'API (résumés des changements) sont échappés | `lib/pages-legales.ts`, `PageLegale.astro` (LEG-01) |
| Images : type reconnu par la signature du fichier (PNG, JPEG, WebP, GIF ; jamais l'extension ni le type annoncé), 5 Mo au plus (lecture interrompue au-delà), 50 millions de pixels au plus (bombes de décompression), décodage complet puis ré-encodage en WebP (un fichier piégé ne survit pas), métadonnées EXIF et profils non recopiés, orientation appliquée ; clés aléatoires de 128 bits sans rien du nom envoyé ; chemin sur le disque construit seulement à partir d'une clé de forme stricte ; servies en `image/webp`, `nosniff`, `inline` | `modules/medias/traitement-images.ts`, `stockage-disque.ts` (MEDIA-01) |
| Envois d'images : corps lu après les gardes (origine, débit, droits), un seul fichier et quelques champs ; 60 envois par 10 minutes et par IP, 20 changements de photo ; 40 images non enregistrées au plus par membre ; images jamais rattachées supprimées après 24 h, fichiers sans ligne aussi (`pnpm medias:nettoyer`) ; seul le membre qui a téléversé une image la décrit ou la retire (une image d'autrui répond 404) | `MediasController`, `ReceptionImage`, `MediasService` (MEDIA-01) |
| Écriture des créations : seul l'auteur enregistre, publie, dépublie ou supprime (403 sur une création publiée d'autrui, 404 sur un brouillon d'autrui, comme en lecture) ; ligne verrouillée pendant l'enregistrement ; les images rattachées sont celles que l'auteur a téléversées, libres ou déjà dans la création ; étapes et échanges désignés par un identifiant de la même création ; catégorie, outils, modèles et licence du référentiel ; liens HTTPS seulement ; quantités bornées (étapes, échanges, images, liens) et corps JSON de 2 Mo au plus ; limite de publication par 24 heures verrouillée par membre (RG-85) ; 50 brouillons au plus par membre, comptés sous verrou (garde-fou de CREA-02) | `EcritureCreationsService`, `contenu-creation.ts` (CREA-05, CREA-02) |
| Éditeur des créations : les contrôles du navigateur (`controlerPublication`, `schemaContenuCreation`) ne font qu'anticiper ceux de l'API ; référentiels et création insérés dans la page en JSON avec `<` échappé ; chaque texte saisi est échappé avant d'être réinséré dans le formulaire ; seules les images (PNG, JPEG, WebP, GIF, 5 Mo) partent vers l'API ; les passages sensibles conservés (F-18) sont retenus sur l'appareil (`localStorage`), jamais envoyés ; l'aperçu de la fiche est ouvert à l'auteur seul et rendu inerte | `scripts/publier.ts`, `lib/publier/`, `EditeurCreation.astro` (CREA-02) |
| Mes contenus : listes privées lues seulement pour le membre connecté (`@Exige('parametres')`, comme la suppression : un compte en lecture seule retrouve ses contenus), jamais celles d'un autre ; créations supprimées exclues (RG-19) ; enregistrements limités aux contenus visibles de tous (RG-30), si bien qu'une création dépubliée ou masquée n'y montre plus rien ; publier, dépublier, supprimer et retirer passent par les routes existantes, qui décident (le site ne fait qu'anticiper avec `exiger`) ; données insérées dans la page en JSON avec `<` échappé ; chaque texte et chaque adresse échappés avant insertion (`t`, `esc`) | `mes-creations.service.ts`, `enregistrements.service.ts`, `pages/mes-contenus.astro`, `scripts/mes-contenus.ts` (CREA-04) |
| Textes des membres rendus par `rendreMarkdown` (markdown-it, `html: false`) : balises affichées comme du texte, adresses limitées à http(s), mailto et chemins internes (ni `javascript:`, ni `data:`, ni `//hôte`), liens externes en `ugc nofollow noopener noreferrer`, aucune image distante | `apps/web/src/lib/markdown.ts` (SEC-01) |
| Interactions (votes, enregistrements, commentaires, reproductions) : compte actif exigé (`@Exige('contribuer')`), contenu visible seulement (un contenu invisible répond 404, comme s’il n’existait pas), jamais sur son propre contenu pour les votes et les essais ; plafond quotidien des points de votes (RG-81, lignes du bénéficiaire verrouillées) ; limite quotidienne des commentaires (RG-85) ; 20 commentaires ou essais par minute et par IP | `modules/interactions`, `modules/progression` |
| Fichiers servis sans lire la session (aucun cookie renouvelé sur une réponse mise en cache) | `AuthModule` (exclusion de `/api/v1/fichiers`) |
| Données de démonstration refusées en production (la fonction et la commande vérifient `NODE_ENV`) ; comptes en `@example.test` (domaine réservé), mot de passe de développement commun consigné dans le dépôt et haché en Argon2id comme les vrais ; deux comptes d'équipe (modération, administration) qui ne doivent exister que hors production | `db/demo/` (DEMO-01) |

## 2. À mettre en place (par ordre d'arrivée)

**Authentification et sessions (AUTH-01)**
- [x] Mots de passe : Argon2id (`@node-rs/argon2`), 12 caractères minimum, 128 maximum, refus des mots de passe compromis (Have I Been Pwned, k-anonymat) — RG-04.
- [x] Session : jeton aléatoire de 32 octets dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, préfixe `__Host-` en production ; seule l'empreinte SHA-256 est en base ; expiration glissante (30 jours) ; renouvellement du jeton à la connexion. Reste la révocation d'un appareil depuis les paramètres (PARAM-01 ; `SessionsService.fermer` existe).
- [x] Temporisation après 5 échecs consécutifs (F-03), message identique que le compte existe ou non (énumération). Limite connue : la vérification de disponibilité de l'adresse (première étape de l'inscription, comme dans le prototype) dit si une adresse est inscrite ; elle est limitée en débit, comme l'inscription elle-même qui le révèle aussi (F-01).
- [x] Liens par e-mail à usage unique, durée limitée (24 h vérification, 1 h réinitialisation), empreinte seule en base ; toutes les sessions fermées après un changement de mot de passe. Un nouveau lien annule les précédents ; le jeton circule dans le corps des requêtes (jamais dans l’adresse d’une route de l’API) et le site le retire de la barre d’adresse ; « mot de passe oublié » répond pareil que l’adresse existe ou non et envoie l’e-mail sans attendre (durée de réponse comparable).
- [ ] Double authentification TOTP obligatoire pour modérateurs et administrateurs (ENF-05), secret chiffré (AES-256-GCM, `CLE_CHIFFREMENT`), codes de secours hachés.
- [~] Contrôle des droits côté API sur chaque route réservée (rôle, état du compte, propriété du contenu) ; tests de refus. La garde `@Exige` est en place (AUTH-06) ; la propriété des contenus se contrôle dans chaque module qui les modifie ; la double authentification s'ajoutera à la garde pour « moderer » et « administrer » (SEC-02).

**Contenus des membres**
- [x] Markdown rendu côté serveur sans HTML brut, assaini (liste blanche), liens `rel="ugc nofollow noopener"` (ENF-06) ; code affiché comme texte, jamais exécuté (SEC-01, `lib/markdown.ts`, 16 vecteurs d’injection testés). Les commentaires et les retours d’essai sont affichés comme du texte.
- [x] Images : type vérifié par signature (pas par l'extension), 5 Mo, ré-encodage (suppression des métadonnées EXIF), noms de fichiers aléatoires, servies avec `Content-Type` exact et `nosniff` (MEDIA-01). Limite connue : une image est publique pour qui connaît son adresse (clé non devinable), y compris celle d'un brouillon ou d'un contenu masqué ; voir « Points à trancher » du registre. Le nettoyage doit être planifié chaque jour (EMAIL-01) et le dossier des images sauvegardé (OPS-02).
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
- [ ] Registre des traitements, durées de conservation (messages de contact : 1 an après réponse), cookies strictement nécessaires uniquement. Cookies déposés aujourd'hui : la session (`vysora_session`, ADR-0005) et, seulement si le visiteur refuse la mesure d'audience sur la page Cookies, `vysora_audience=refusee` (13 mois, sans donnée personnelle, lisible par le navigateur). La liste publiée sur `/cookies` mentionne aussi un cookie « Sécurité » qui n'existe pas (la protection des formulaires passe par l'origine) : voir les points à trancher du registre.
- [ ] Export (F-07) et suppression (F-08, D-09) complets, testés.
- [ ] Hébergement dans l'Union européenne (ou conforme à la loi du pays d'établissement).

## 3. Signaler une faille

Avant l'ouverture publique : ajouter `/.well-known/security.txt` (contact et politique de divulgation).
