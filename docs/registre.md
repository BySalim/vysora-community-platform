# Registre des tâches

> Le registre dit **ce qui est fait, ce qui est en cours, ce qui vient ensuite et ce qui est reporté**.
> Chaque session le lit en premier et le met à jour en dernier. Toute session peut le réorganiser si les priorités changent : il sert le projet, pas l'inverse.

**Statuts** : ⬜ à faire · 🔄 en cours · ✅ fait · ⏸️ reporté · ❌ abandonné
**Priorités** : **P0** nécessaire pour ouvrir quoi que ce soit · **P1** bêta fermée (Must) · **P2** ouverture publique (Should) · **P3** ensuite (Could, V2)
**Références** : F-xx, RG-xx, EC-xx renvoient à `docs/produit/` ; « proto » à `prototype/`.

**Mode d'emploi en une minute**
1. Lire « Prochaines tâches ». Prendre la première, ou plusieurs petites tâches proches, en avançant **en largeur** : une version de base qui marche de bout en bout avant les raffinements (rangés en « Approfondissements »).
2. Passer la tâche à 🔄 avec la date. Si elle est trop grosse, la découper ici avant de commencer.
3. À la fin : ✅ avec la date, ou ⏸️ avec la raison. Ajouter les tâches découvertes, les écarts au prototype et les décisions à prendre. Écrire quelques lignes dans le **Journal** et remettre « Prochaines tâches » à jour.

---

## Prochaines tâches (ordre conseillé)

1. **SEC-01**, puis **CREA-01** — Markdown assaini, API des créations (lecture d’une fiche d’abord : les données de démonstration sont en base avec leurs images, `pnpm db:demo`). CREA-01 rattache les images téléversées (`media`) aux créations et aux échanges ; trancher avant le point « Résultat d’un 1 prompt ou d’une itération ».
2. **CREA-02** puis **CREA-03** — Éditeur (avec `AccesBloc` pour le visiteur ; dépôt d’images par `POST /api/v1/medias`) et fiche création (images avec `srcsetImage`).
3. **INV-01** — Code d'invitation de la bêta (champ déjà présent, masqué, sur l'inscription).
4. **QA-01** — Tests de navigateur (Playwright) : les comparaisons au prototype faites à la main gagneraient à être automatisées.
5. **PROF-01** — Profil public porté : la photo de profil se change déjà par l’API (`PUT`/`DELETE /api/v1/moi/avatar`).

---

## Lot 0 — Socle ✅

| ID | Tâche | Statut | Notes |
|---|---|---|---|
| SOCLE-01 | Monorepo pnpm (site, API, paquet partagé), TypeScript 6 strict, oxlint, Prettier, `pnpm verifier` | ✅ 2026-10-23 | ADR-0001 |
| SOCLE-02 | Docker Compose : PostgreSQL 18 (+ base `vysora_test`), Mailpit | ✅ 2026-10-23 | `pnpm infra:up` |
| SOCLE-03 | MLD complet en Drizzle (50 tables), migration générée + migration manuelle (recherche `vysora_fr`, ordres différés, décisions immuables) | ✅ 2026-10-23 | `docs/mld.md` |
| SOCLE-04 | Référentiels chargés (64 outils, 54 éditeurs, 41 modèles, catégories, licences, niveaux, badges, types de vote, documents légaux, étiquettes), idempotent | ✅ 2026-10-23 | `pnpm db:seed` |
| SOCLE-05 | API NestJS 12 : configuration validée, journaux, erreurs RFC 9457, validation Zod, garde d'origine (CSRF), limitation de débit, helmet, santé | ✅ 2026-10-23 | ADR-0003 |
| SOCLE-06 | `GET /api/v1/referentiels` | ✅ 2026-10-23 | contrat dans `shared/contrats` |
| SOCLE-07 | Contact de bout en bout : page portée à l'identique, validation partagée, enregistrement, e-mails équipe et accusé de réception, anti-robot | ✅ 2026-10-23 | page exemple du portage |
| SOCLE-08 | Site Astro 7 SSR : gabarit commun, en-tête, pied de page, bandeau d'état, sprite (130 icônes), état du visiteur, CSP, en-têtes, relais `/api`, page 404 | ✅ 2026-10-23 | ADR-0002, ADR-0007 |
| SOCLE-09 | Tests : 13 (shared) + 5 (site) + 4 unitaires et 10 de bout en bout (API) | ✅ 2026-10-23 | |
| SOCLE-10 | Intégration continue GitHub Actions (lint, formatage, types, tests, e2e avec PostgreSQL, build) | ✅ 2026-10-23 | `.github/workflows/ci.yml` ; écrite et rejouée en local, à confirmer au premier envoi sur GitHub |
| SOCLE-11 | Documentation : architecture, MLD, conventions, sécurité, portage, ADR, registre, AGENTS.md | ✅ 2026-10-23 | |

## Lot 1 — Fondations : comptes et pages publiques simples (P0)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| AUTH-01 | Sessions et comptes | P0 | ✅ 2026-10-23 | **Fait** : `POST /api/v1/comptes` (inscription, pseudo tiré si absent, acceptations datées), `POST /api/v1/comptes/disponibilite` (adresse), `GET /api/v1/pseudos/:pseudo/disponibilite` (format, réservés, pris, variantes libres), `GET`·`POST`·`DELETE /api/v1/session`, `PATCH /api/v1/moi` (pseudo) ; WF-23 (reconnexion annule la suppression) ; site : `chargerSession`, cookies renouvelés renvoyés au navigateur, dates du bandeau, déconnexion du menu du compte. Tests ajoutés : 30 de bout en bout et 15 unitaires (API), 14 (paquet partagé), 1 (site) ; 92 au total. **Périmètre initial** : Argon2id, inscription par e-mail (pseudo RG-01, e-mail RG-02, mot de passe RG-04 avec liste de mots de passe compromis), connexion, déconnexion, cookie de session (ADR-0005), temporisation après 5 échecs, `GET /api/v1/session` → `EtatVisiteur` ; `chargerSession` du site branché ; menu du compte et déconnexion dans l'en-tête. F-01, F-03 |
| AUTH-02 | Vérification de l'e-mail | P0 | ✅ 2026-10-23 | **Fait** : lien envoyé à l'inscription (24 h, usage unique, empreinte seule), `POST /api/v1/comptes/verification` (lu par le serveur du site à l'ouverture de `/inscription?verifier=…` ; un lien déjà utilisé confirme encore), `POST /api/v1/comptes/verification/renvoi` (session, ou jeton d'un lien expiré), correction de l'adresse avant vérification (`PATCH /moi { email }`). **Périmètre initial** : Jeton 24 h, renvoi du lien, compte en lecture seule tant que non vérifié (bandeau déjà prêt). F-01, RG-02 |
| AUTH-03 | Mot de passe oublié et réinitialisation | P0 | ✅ 2026-10-23 | **Fait** : `POST /api/v1/mot-de-passe/oubli` (202 dans tous les cas, envoi sans attendre), `POST /api/v1/mot-de-passe/lien`, `PUT /api/v1/mot-de-passe` (RG-04, sessions fermées, adresse vérifiée du même coup, temporisation levée). **Périmètre initial** : Lien 1 h, message identique que l'e-mail existe ou non, sessions fermées après changement. F-03 |
| AUTH-04 | Pages Connexion et Inscription portées | P0 | ✅ 2026-10-23 | **Fait** : `/connexion` et `/inscription` à l’identique (enveloppe « auth » du gabarit, fond WebGL, `auth.css` inchangé), tous les écrans branchés sauf ceux listés dans « Écarts au prototype » ; comparées au prototype à 1280, 820 et 375 px. **Périmètre initial** : proto `connexion.html`, `inscription.html`, `auth.css`, `auth.js`, `auth-data.js` ; retour à la page d'origine (`?retour=`, `?pour=`) ; pseudos réservés ; boutons GitHub et Google présents mais branchés par AUTH-08 |
| AUTH-05 | Acceptation versionnée des documents légaux | P0 | ✅ 2026-10-23 | **Fait** : acceptation datée à l’inscription, `GET /api/v1/documents-legaux`, `POST /api/v1/moi/acceptations`, écran « Nouvelles conditions » de la connexion, bouton « Accepter » du bandeau et du dialogue d’accès (AUTH-07). L’e-mail à la date d’effet d’une nouvelle version (RG-90) demande une tâche planifiée : rattaché à EMAIL-01. **Périmètre initial** : À l'inscription et à chaque nouvelle version (`/accepter-documents`, bandeau « conditions ») ; confidentialité informative (voir Points à trancher). F-04, RG-03, RG-112 |
| AUTH-06 | Garde des droits côté API | P0 | ✅ 2026-10-23 | **Fait** : `@Exige(action)` + `DroitsGuard` (global, après origine et débit) + `@SessionCourante()` ; refus 401/403 avec `raison` ; tests unitaires de chaque refus et e2e sur `PATCH /moi`. Reste : double authentification pour moderer et administrer (SEC-02). **Périmètre initial** : Décorateur ou garde `@Exige('contribuer' | 'moderer' | 'administrer' | 'proposer-cas')` fondé sur `raisonRefus` + état du compte (e-mail, conditions, suspension) ; tests de refus |
| AUTH-07 | Dialogue d'accès côté site | P0 | ✅ 2026-10-23 | **Fait** : `lib/acces.ts` (messages du prototype, échappés), `scripts/commun/acces.ts` (`exiger`, `accesBloc`, `invitation`, gardes des liens vers `/creations/nouvelle` et `/forum/nouveau` et de `data-exige`), `AccesBloc.astro` (bloc rendu par le serveur) ; boutons « Renvoyer l’e-mail » et « Accepter » du bandeau et du dialogue branchés sur l’API, état mis à jour sans rechargement (`etats.appliquer`, `etats.on`) ; 10 tests unitaires. Vérifié dans le navigateur en visiteur, e-mail à confirmer et conditions à accepter. **Périmètre initial** : Porter `exiger`, `accesBloc`, `invitation` et les gardes de liens de `commun.js` (`data-exige`) |
| LEG-01 | Pages légales portées | P0 | ✅ 2026-10-23 | **Fait** : `/cgu`, `/confidentialite`, `/charte-communautaire`, `/cookies`, `/mentions-legales` avec `PageLegale.astro` ; version, date d’effet, résumé des changements et documents à accepter lus dans l’API (`aAccepter` ajouté à `GET /api/v1/documents-legaux`) ; sommaire, « L’essentiel », liens de section et typographie rendus par le serveur ; acceptation depuis la page (formulaire) mise à jour sans rechargement, comme depuis le bandeau ; refus de la mesure d’audience retenu par un cookie. Texte, structure et espaces insécables identiques au prototype sur les cinq pages (comparés élément par élément), mêmes rendus à 1280 et 375 px. 7 tests unitaires, 1 test de bout en bout complété. **Périmètre initial** : `cgu`, `confidentialite`, `charte-communautaire`, `cookies`, `mentions-legales` + `documents-legaux.js` ; version et date affichées depuis `document_legal` |
| INV-01 | Bêta fermée sur invitation | P1 | ⬜ | Code d'invitation à l'inscription (proto : `auth-data.js`, `invitation`), table `invitation`, création des codes par l'administration ; badge PIONNIER |
| DEMO-01 | Données de démonstration | P1 | ✅ 2026-10-23 | **Fait** : `pnpm db:demo` (`apps/api/src/db/demo/`), refusé en production, idempotent (membre repéré par son pseudo, contenu par son auteur et son titre ; rien d’existant n’est modifié), une seule transaction. Charge 53 membres (les 50 des classements, Clarisse Mendy au niveau Apprenti, `moderation-demo` et `administration-demo`) avec badges et documents acceptés ; 50 créations (36 d’Explorer, 6 participations au défi en cours, 3 créations et 5 brouillons de Clarisse) avec étapes, configurations, échanges, moments clés, liens, licence et étiquettes ; 307 reproductions, 2 commentaires, 17 sujets et 39 réponses (réponses acceptées, sujet fermé), 8 cas validés et 235 réponses, 3 défis, ≈ 2 250 votes, 8 enregistrements, 6 signalements d’obsolescence, la réputation du prototype. Données dans `db/demo/donnees/` (converties une fois depuis le prototype, puis modifiées sur place) ; mot de passe commun dans `identifiants.ts`. 9 tests de bout en bout. Images : voir DEMO-02. **Périmètre initial** : Script `pnpm db:demo` (jamais en production) : membres, créations avec parcours, sujets, cas, défis, votes, tirés des `*-data.js` du prototype ; avatars et images de `prototype/assets` servis par le stockage des médias |
| DEMO-02 | Images de démonstration | P1 | ✅ 2026-10-24 | **Fait** : 50 photos de profil (`prototype/assets/avatars`) et 17 images de créations et d’échanges (`assets/images`, fichier -1280, à défaut -720) passées par le traitement des envois (MEDIA-01), avec leur texte alternatif ; ajoutées aux membres et aux créations qui n’en ont aucune, y compris dans une base chargée avant (vérifié sur la base de développement : `pnpm db:demo` a ajouté 17 images et 50 photos). `chargerDemo` reçoit le `Stockage` ; `prototype/assets` est cherché depuis le chargeur. 3 tests de bout en bout de plus |
| DEMO-03 | Données de démonstration, suite | P1 | ⬜ | Captures d’écran pour les résultats « maquette » du prototype (réservation, tableau de bord, extension…) : les 7 projets d’Explorer restent sans résultat final (RG-13) ; images des affiches de Cape Coast et Grand-Bassam (absentes du prototype) ; puis, selon les pages portées : participations des deux défis clos et rangs figés, notifications de Clarisse (`notifications-data.js`), commentaires reçus de « Mes contenus », index de recherche des contenus (avec DEC-01) |

## Lot 2 — Valeur centrale : publier et consulter un parcours (P1)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| MEDIA-01 | Téléversement d'images | P1 | ✅ 2026-10-24 | **Fait** : module `medias` ; `POST /api/v1/medias` (`multipart/form-data` : `fichier`, `texteAlternatif`, `legende`), `PATCH` et `DELETE /api/v1/medias/:id` (image du membre, retrait seulement avant rattachement), `PUT`·`DELETE /api/v1/moi/avatar` (carré de 256 px, l’ancienne supprimée ; adresse renvoyée dans la session), `GET /api/v1/fichiers/:cle` (WebP, cache immuable, sans session ni limite de débit) ; contrôle par signature, 5 Mo, 50 Mpx, ré-encodage WebP 720 et 1280 (`sharp`, jamais d’agrandissement, animations gardées), EXIF supprimé, orientation appliquée ; `Stockage` (interface) et `StockageDisque` ; 40 images non enregistrées au plus par membre ; `pnpm medias:nettoyer` (orphelines de plus de 24 h et fichiers sans ligne). Contrat `MediaApi`, schéma `schemaDescriptionImage`, `srcsetImage` dans `@vysora/shared`. 13 tests unitaires (API), 4 (paquet partagé), 11 de bout en bout. Vérifié dans le navigateur par le relais du site (avatar de l’en-tête, envoi, refus, retrait). Le texte alternatif est exigé à la publication (CREA-01) ; le rattachement aux contenus vient avec CREA-01. **Périmètre initial** : Contrôle par signature, 5 Mo, ré-encodage WebP 720 et 1280 (`sharp`), métadonnées supprimées, texte alternatif obligatoire, stockage local derrière une interface ; nettoyage des orphelines. RG-16 |
| CREA-01 | API des créations | P1 | ⬜ | Brouillon (3 types), enregistrement, publication avec contrôles RG-10 à RG-17 (erreurs par champ), modification (date affichée), dépublication, suppression ; limites RG-85 ; slug ; lecture d'une fiche selon la visibilité RG-30 ; index de recherche mis à jour. F-10 à F-17 |
| CREA-02 | Éditeur porté (Publier) | P1 | ⬜ | proto `nouvelle-creation.*` : trois types, configurations IA (outils et modèles proposés), échanges, étapes, moments clés, liens, images, licence, étiquettes, confirmation avant publication ; `/creations/nouvelle`, `/creations/[id]/modifier`. Îlot React permis si le script devient ingérable (ADR-0002) |
| CREA-03 | Fiche création portée | P1 | ⬜ | proto `fiche-creation.*` : en-tête, résultat, moments clés, parcours dépliable, copie du prompt (F-24), licence, dates ; `/creations/[id]-[slug]` avec redirection si le slug change ; balises de partage (F-26). F-23 |
| CREA-04 | Mes contenus porté | P1 | ⬜ | proto `mes-contenus.*` : brouillons, publiés (enregistrés avec INT-04). F-16, EC-15 |
| PROF-01 | Profil public porté | P1 | ⬜ | proto `profil.*` : identité, niveau, réputation, créations publiées, statistiques publiques (calculées) ; modification de la photo (API prête : `PUT`/`DELETE /api/v1/moi/avatar`), de la biographie et du lien. F-05, F-73 |
| SEC-01 | Rendu Markdown assaini | P1 | ⬜ | Une fonction partagée côté serveur (sans HTML brut, liens `ugc nofollow`, code affiché en texte). ENF-06 |

## Lot 3 — Découverte et preuve (P1)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| DEC-01 | Recherche et Explorer | P1 | ⬜ | proto `explorer.*` : recherche plein texte (`vysora_fr`), onglets créations / sujets / cas, filtres combinables, tris ; adresse partageable. Voir le point à trancher sur les « guides ». F-22, RG-31 |
| ACC-01 | Accueil porté | P1 | ⬜ | proto `index.html`, `styles.css`, `app.js`, `accueil-hero.js` (page verrouillée : rendu identique) ; données réelles : créations utiles de la semaine (RG-32), récentes, plus reproduites, chiffres clés, catalogue d'outils, défi, cas, questions sans réponse ; remplace `pages/index.astro`. F-21 |
| REP-01 | Réputation, niveaux, limites | P1 | ⬜ | Service central : mouvements (RG-80), plafond quotidien (RG-81), annulations (RG-82), réputation et niveau calculés, limites RG-85, notification de niveau atteint |
| INT-01 | Votes « Utile » et « Testé, ça marche » | P1 | ⬜ | Vote, annulation, compteurs, interdiction sur son contenu, mouvements de réputation. F-30, F-31, RG-40, RG-41 |
| INT-02 | Reproductions et indicateurs de preuve | P1 | ⬜ | Déclaration (outil, modèle, résultat, retour), points une fois par membre et création, taux de succès dès 3, dernière date, modèles réussis. F-32, F-33, RG-42, RG-43 |
| INT-03 | Commentaires | P1 | ⬜ | Commenter, modifier, supprimer (« Commentaire supprimé » si réponses). F-40, RG-50, RG-51 |
| INT-04 | Vues | P1 | ⬜ | Une vue par visiteur et par jour (empreinte anonyme, `vue_contenu`). F-23 |

## Lot 4 — Entraide et apprentissage (P1)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| FORUM-01 | API du forum | P1 | ⬜ | Sujets (5 types, clinique à rubriques, astuce avant/après), réponses, acceptation (points transférés), état ouvert/résolu/fermé. F-50 à F-53, RG-60 à RG-64 |
| FORUM-02 | Forum porté | P1 | ⬜ | proto `forum.*` : liste, sujet, nouveau sujet ; `/forum`, `/forum/[id]-[slug]`, `/forum/nouveau` |
| APP-01 | API Bon réflexe | P1 | ⬜ | Cas validés, réponse définitive (visiteur sans enregistrement), répartition des réponses, proposition (Expert et plus), validation et refus motivé. F-60 à F-62, RG-70 à RG-72 |
| APP-02 | Apprendre porté | P1 | ⬜ | proto `apprendre.*` (rubriques) ; écran « Proposer un cas » (EC-11) à reprendre du prototype s'il existe, sinon à concevoir |

## Lot 5 — Gouvernance (P1)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| MOD-01 | Signalements et décisions | P1 | ⬜ | Signaler (motifs, un ouvert par membre et contenu), file du plus ancien au plus récent, décisions immuables, clôture des signalements, suspension 1 à 90 jours, notification et e-mail. F-90 à F-92, RG-100 à RG-105 |
| MOD-02 | Écrans de modération | P1 | ⬜ | Sans maquette : à concevoir dans le style du prototype (EC-19, EC-20), puis à faire valider |
| ADM-01 | Administration | P1 | ⬜ | Référentiels (archiver plutôt que supprimer), rôles (dernier administrateur protégé, journalisé), documents légaux, journal des décisions. F-95, F-96, EC-21 à EC-25 ; écrans à concevoir |
| SEC-02 | Double authentification | P1 | ⬜ | TOTP obligatoire pour modération et administration, codes de secours. ENF-05 |
| NOTIF-01 | Notifications | P1 | ⬜ | Création des notifications (RG-91, votes regroupés par jour), compteur de l'en-tête, page portée (proto `notifications.*`), préférences ; e-mails RG-90. F-80, F-81 |
| PARAM-01 | Paramètres et données personnelles | P1 | ⬜ | proto `parametres.*` : e-mail (vérification et alerte), mot de passe, langue, fuseau, notifications, appareils connectés ; export JSON (F-07) ; suppression avec délai de 30 jours et anonymisation (F-08, D-09) |
| EMAIL-01 | File d'envoi des e-mails | P1 | ⬜ | `pg-boss` : envoi asynchrone avec reprises (aujourd'hui l'envoi est direct, un échec est seulement journalisé) ; tâches planifiées (suppressions à 30 jours, purge des vues, exports, **nettoyage des images chaque jour (`pnpm medias:nettoyer`, MEDIA-01)**, **purge des sessions expirées et des tentatives de connexion de plus de 24 h**, **e-mail aux membres à la date d’effet d’une nouvelle version des documents légaux**, RG-90, reste d’AUTH-05) |

## Lot 6 — Compléments de l'ouverture publique (P2)

| ID | Tâche | Statut | Références |
|---|---|---|---|
| S-01 | Enregistrer un contenu, liste « Enregistrés » | ⬜ | F-34, RG-45 |
| S-02 | Signaler une obsolescence, bannière au-delà de 3 | ⬜ | F-35, RG-44 |
| S-03 | Ancrage des commentaires et réponses | ⬜ | F-41, F-42 |
| S-04 | Variantes | ⬜ | F-20, RG-21 |
| S-05 | Avertissements « données sensibles » et « instructions pour agent » | ⬜ | F-18, F-19, RG-22, RG-23 |
| S-06 | Pages catégorie et étiquette (proto `categorie.*`) | ⬜ | F-25, EC-03 |
| S-07 | Défis : création, participation, clôture, classement figé (proto `defis.*`, admin EC-24) | ⬜ | F-63 à F-65 |
| S-08 | Classements (proto `classements.*`) | ⬜ | F-75, RG-87 |
| S-09 | Badges : attribution automatique et affichage | ⬜ | F-74, RG-86 |
| S-10 | Connexion GitHub et Google (AUTH-08) | ⬜ | F-02 |
| S-11 | Recherche globale (loupe, Ctrl K ; proto `recherche.*`) | ⬜ | |
| S-12 | Lier un sujet à une création ; fermer et rouvrir un sujet | ⬜ | F-54, F-55 |
| S-13 | Masquage automatique au seuil de signalements | ⬜ | F-93, RG-101 |
| S-14 | Tableau de bord des indicateurs (EC-26) | ⬜ | F-97 |
| S-15 | Interface en anglais | ⬜ | D-06, ENF-11 |

## Industrialisation (à mener en parallèle, sans attendre la fin)

| ID | Tâche | Prio | Statut | Notes |
|---|---|---|---|---|
| OPS-01 | Préproduction : serveur, Docker Compose de production, Caddy, déploiement depuis la CI | P1 | ⬜ | ADR-0008 ; à faire dès que le lot 2 est utilisable, pour tester sur de vrais appareils. Le build de l'API embarque `start:migrate`, `start:seed`, `start:demo` et `start:nettoyer-medias` ; `start:demo` a besoin de `prototype/assets` dans l’image (avatars et images de démonstration). `STOCKAGE_DOSSIER` absolu, sur un volume persistant. Caddy envoie `/api/*` directement à l'API (sinon, faire transmettre l'adresse du visiteur au relais du site) et peut garder en cache `/api/v1/fichiers/*` (contenu immuable) |
| OPS-02 | Sauvegardes chiffrées quotidiennes, restauration testée | P1 | ⬜ | ENF-08 ; la base **et le dossier des images** (`STOCKAGE_DOSSIER`) |
| OPS-03 | Supervision (disponibilité, erreurs), alertes | P2 | ⬜ | |
| QA-01 | Tests de navigateur (Playwright) : parcours critiques et comparaison d'images avec le prototype | P1 | ⬜ | |
| QA-02 | Audit d'accessibilité WCAG 2.2 AA par page portée | P2 | ⬜ | ENF-01 |
| PERF-01 | Polices en WOFF2 et préchargées ; `styles.css` scindé (base / accueil) | P2 | ⬜ | ENF-03 ; sans changer le rendu |
| SEC-03 | Revue de sécurité avant l'ouverture (liste `docs/securite.md`), `security.txt`, audit des dépendances en CI | P1 | ⬜ | |
| DOC-01 | Documentation OpenAPI générée depuis les schémas Zod | P2 | ⬜ | utile pour Carnéo |

## Approfondissements reportés (non urgents, plus complexes)

| ID | Sujet | Raison du report |
|---|---|---|
| R-01 | Cache des compteurs (votes, reproductions, réputation) | Les calculs par requête suffisent au démarrage ; à mesurer d'abord |
| R-02 | Moteur de recherche dédié (Meilisearch) | PostgreSQL suffit au volume du MVP |
| R-03 | Stockage objet S3 pour les images | Disque local d'abord, interface prévue |
| R-04 | Limitation de débit partagée entre plusieurs instances | Une seule instance au départ (mémoire) |
| R-05 | Îlots React pour les écrans les plus interactifs | Seulement si un script natif devient ingérable |
| R-06 | Carnéo, revue de méthode, parcours guidés, abonnements… | V2 (document 01) |
| R-08 | Écran « Bienvenue » après Google ou GitHub (`pret`) et vérification en deux étapes à la connexion | Balisage porté et masqué ; à brancher avec S-10 et SEC-02 |
| R-07 | Lieu approximatif des sessions (« Ziguinchor, Sénégal » dans la liste des appareils) | Demande une base de géolocalisation des adresses IP ; la colonne `session.lieu` existe, vide pour l'instant |

## Points à trancher (porteur du projet)

| Sujet | Question | Proposition |
|---|---|---|
| Politique de confidentialité | Le prototype la présente comme une information (pas d'acceptation), RG-03 demande son acceptation. | Suivre le prototype (plus juste juridiquement) : `acceptation_requise = false` déjà en base, à confirmer |
| Route « Apprendre » | Le plan du site prévoit `/bon-reflexe` ; le prototype a une page Apprendre à rubriques. | `/apprendre` pour la page, `/bon-reflexe/[id]-[slug]` pour un cas |
| Explorer : « guides » | Le prototype présente des guides d'intention (méthode qui ressort, pièges, outils qui marchent). Contenu éditorial ou calculé ? | Démarrer éditorial (administré), calcul plus tard |
| Données de démonstration | En préproduction pour la bêta ? | Oui en préproduction, jamais en production. `pnpm db:demo` refuse `NODE_ENV=production` : si la préproduction tourne ainsi (OPS-01), il faudra une variable qui la distingue de la production (par exemple `ENVIRONNEMENT=preproduction`), à décider avec OPS-01 |
| Nom affiché d’un membre | Le prototype affiche « Claire Dubois » ; le MCD n’a que le pseudo (`claire-dubois`), que l’en-tête affiche déjà (AUTH-01). Les noms du prototype sont gardés dans `db/demo/donnees/membres.ts`. | Ajouter `utilisateur.nom_affiche` (facultatif, 60 caractères), modifiable dans les paramètres ; à défaut, le pseudo |
| Titres dans la fiche création | La fiche du prototype titre chaque moment clé (« Vérifier les réservations simultanées ») et chaque échange d’une itération (« Composer la réservation ») ; elle affiche aussi « À adapter » et le format du résultat (« Paysage · 4:3 »). Le MCD n’a rien de tout cela (l’éditeur non plus). Titres gardés dans les données de démonstration, non chargés. | Ajouter `moment_cle.titre` et `echange.titre` (facultatifs) si CREA-03 les garde ; « À adapter » et le format : les remplacer par les limites constatées, comme le fait déjà la fiche du prototype pour les créations du membre |
| Outil et modèle d’un sujet | Chaque sujet du prototype affiche un outil et un modèle (« Midjourney · v7 ») ; le MCD ne les a que dans le corps d’une clinique (4ᵉ rubrique, RG-62). | Ajouter une configuration facultative au sujet (outil, modèle) si FORUM-02 garde l’affichage |
| Astuce : résultats avant et après | Le prototype montre, sous chaque exemple, le résultat obtenu (« Le nom exact sur 9 essais sur 10 ») ; le MCD n’a que les deux exemples (RG-61). Résultats gardés dans les données, non chargés. | Ajouter `resultat_avant` et `resultat_apres` (facultatifs) |
| « Testé, ça marche » hors astuces | Le prototype l’affiche sur les réponses acceptées des cliniques, avec les modèles essayés ; RG-41 le réserve aux astuces et le vote n’a pas de modèle. Non chargé. | Suivre RG-41 ; les modèles essayés d’une astuce viendraient d’un champ « modèle » facultatif sur le vote, à décider avec INT-01 |
| Résultat d’un « 1 prompt » ou d’une itération | RG-11 et RG-12 demandent une réponse ou une image **jointe à l’échange** ; l’éditeur du prototype place le résultat (texte, code, fichier, lien) dans une section « Résultat » de la création, et ses données de démonstration rattachent les images à la création (8 créations publiées dans ce cas). | Pour RG-11 et RG-12, accepter une image jointe à l’échange **ou** à la création (le résultat) ; à décider avec CREA-01 |
| Images des brouillons et des contenus masqués | Une image est servie à qui connaît son adresse : clé aléatoire de 128 bits, jamais listée, mais valable aussi pour une image de brouillon ou d’un contenu masqué par la modération. | Accepter pour la bêta (pratique courante) ; MOD-01 supprime les fichiers d’un contenu retiré ; si la confidentialité des brouillons le demande, servir les images non publiées par une route qui vérifie les droits |
| Fichiers joints autres que des images | L’éditeur du prototype accepte tout fichier (vidéo, son, document) jusqu’à 10 Mo, 20 par création ; RG-16 n’héberge que des images de 5 Mo au plus, le reste par lien. | Suivre RG-16 dans l’éditeur (CREA-02) : refus avec la raison et proposition d’ajouter un lien |
| Hébergeur, domaine, fournisseur d'e-mail | — | ADR-0008 |
| Anglais | Au lancement ou après (D-06) ? | Après l'ouverture (S-15) |
| Licence par défaut et suppression de compte | Avis juridique demandé (D-07, D-09) | En attente |
| Caractères permis dans un pseudo | Le prototype accepte les lettres accentuées (`p{L}`), RG-01 et le schéma partagé se limitent à `A-Z a-z 0-9 - _`. | Garder l'ASCII : pas de pseudos qui se ressemblent à l'œil (homoglyphes), adresses de profil lisibles. Écart au prototype à confirmer |
| Boutons Google et GitHub avant S-10 | Le prototype les montre ; la connexion par ces services n’existe pas encore. | Les garder, avec le message « La connexion avec Google n’est pas encore ouverte. Utilisez votre adresse e-mail. » au clic ; les masquer serait l’autre choix |
| Cookie « Sécurité » de la page Cookies | La liste publiée annonce un cookie « Sécurité » (protection des formulaires, fin de session) ; le site n’en dépose pas : la protection passe par le contrôle de l’origine et `SameSite`. | Retirer la ligne du tableau (et la mention de la politique de confidentialité, section 6) ; la garder seulement si un jeton anti-CSRF en cookie est ajouté un jour |
| Durcissement de la temporisation | Un tiers qui connaît une adresse peut maintenir le compte temporisé (15 min au plus) en échouant exprès. | Accepter pour la bêta ; si cela arrive, ajouter une limite par adresse IP sur les échecs et lever la temporisation après une réinitialisation du mot de passe (AUTH-03) |

## Écarts au prototype (données de démonstration)

- **Compteurs** : chaque vote est celui d’un membre de démonstration (53 comptes). Jusqu’à 40, les nombres du prototype sont repris ; au-delà, ils sont réduits en gardant l’ordre (412 votes « Utile » → 48), avec la même part sur les 7 derniers jours (RG-32). Les reproductions sont exactes (44 au plus, réparties par configuration testée) ; les réponses aux cas valent environ 1/30 de celles du prototype, avec sa répartition par option.
- **Réputation** : totaux, niveaux et points de chaque semaine sont ceux du prototype (le classement de la semaine de l’accueil est identique ; détail par motif pour Clarisse). Le prototype ne suit pas son propre barème (389 votes reçus par une membre qui a 286 points) : les mouvements de démonstration ne sont donc pas rattachés aux votes, essais et réponses chargés. Pour INT-01 et REP-01 : annuler un vote de démonstration ne retire aucun point.
- **Parcours complétés** : 10 itérations et 5 projets que le prototype ne détaille pas (explorer-data.js), les 6 participations au défi et 6 réponses de prompts ont reçu des échanges, récits et réponses rédigés pour respecter RG-11 à RG-14 ; le prompt connu est repris tel quel. Retours génériques pour les essais partiels ou échoués (RG-42).
- **Images** (DEMO-02) : les 17 images et les 50 photos du prototype sont chargées, ré-encodées par le traitement des envois. Les images « résultat » sont rattachées à la création, comme dans l’éditeur du prototype (voir le point à trancher sur RG-11 et RG-12). Restent sans résultat : les affiches de Cape Coast et de Grand-Bassam (aucune image dans le prototype), la voix off (fichier son, non hébergé : RG-16) et 7 projets d’Explorer, illustrés dans le prototype par des maquettes (DEMO-03).
- Licence CC BY 4.0 (celle par défaut) pour les créations d’Explorer : la fiche du prototype affichait « Conditions de réutilisation » faute de licence connue.
- Liens externes et site de Clarisse sur des domaines `.example` (les adresses du prototype ressemblaient à de vrais sites).
- Les participations au défi en cours sont datées avant le « maintenant » du prototype (ses dates dépassaient le 13 octobre) ; toutes les dates sont décalées pour que ce « maintenant » soit l’heure du chargement.
- Le prompt proposé dans une réponse du forum est un bloc de code du corps Markdown ; le prototype l’affiche à part, avec un bouton « Copier » (à reprendre par FORUM-02).
- Clarisse Mendy est au niveau Apprenti affiché par défaut : 3 créations publiées et 5 brouillons ; ses 13 autres exemples (niveaux supérieurs) ne sont pas chargés.
- Quatre cas Bon réflexe ont un auteur sous le niveau Expert (RG-70), comme dans le prototype.

## Écarts au prototype (images)

- Déclinaisons par **largeur** (720 et 1280 px, jamais d’agrandissement) : le prototype nommait « -1280 » certaines images en portrait d’après leur hauteur (l’affiche de Ziguinchor, 853 × 1280, a des déclinaisons de 720 et 853 px).
- Photos de profil carrées de 256 px au plus (128 dans le prototype ; celles de démonstration restent à 128).

## Écarts au prototype (pages légales)

- Sommaire, « L’essentiel », numéros de section, boutons « Copier le lien » et typographie sont rendus par le serveur (le prototype les construisait dans le navigateur) : même résultat, lisible sans script.
- Les documents « À accepter » sont ceux que le membre n’a pas encore acceptés selon l’API, que son compte soit en lecture seule pour ce motif ou non (le prototype les déduisait de l’état « conditions ») ; la mention « lecture seule » n’apparaît que si l’acceptation lève effectivement la lecture seule.
- Le refus de la mesure d’audience est retenu par un cookie (`vysora_audience`, 13 mois), comme l’annonce la liste des cookies, et non dans le stockage local du navigateur.

## Écarts au prototype (connexion et inscription)

- Lettres accentuées du pseudo converties à la saisie (« Essaï » → « Essai ») : RG-01 en ASCII, voir « Points à trancher ».
- Zones d’alerte ajoutées (masquées) aux formulaires « Nouvelles conditions », « Mot de passe oublié », « Nouveau mot de passe » et à l’écran « Lien expiré », pour les erreurs de l’API.
- Le focus va au premier champ visible d’un écran (dans le prototype, il visait le champ masqué du code d’invitation).
- Retour accepté vers toute page interne du site (libellé « Retour à la page précédente » hors de la liste du prototype) ; jamais vers un autre site.
- Après une connexion qui aboutit sur un écran de réussite sans départ (e-mail à confirmer, suspension), l’en-tête reste celui d’une visiteuse jusqu’à la page suivante (le prototype le mettait à jour).
- Le lien de vérification et celui de réinitialisation sont lus par le serveur (pas d’écran intermédiaire) ; le jeton est retiré de la barre d’adresse.

## Journal

### 2026-10-24 — Images : téléversement, stockage, démonstration (MEDIA-01, DEMO-02)
- API, module `medias` : `Stockage` (interface) et `StockageDisque` (sous-dossiers par deux caractères, clés `<128 bits>-<largeur>.webp` de forme stricte, jamais d’écrasement) ; `traitement-images.ts` (signature, 5 Mo, 50 Mpx, ré-encodage WebP 720 et 1280 avec `sharp`, EXIF supprimé, orientation appliquée, animations gardées, photo de profil carrée de 256 px) ; `ReceptionImage` (`multer` en mémoire, lu après les gardes) ; `MediasService` (envoi, description, retrait, photo de profil, nettoyage) ; routes `medias`, `moi/avatar`, `fichiers` ; `IdentifiantPipe` (commun) ; la session renvoie l’adresse de la photo ; `AuthModule` ne lit plus la session pour `/api/v1/fichiers`.
- `src/taches/nettoyer-medias.ts` et `pnpm medias:nettoyer`, en attendant la file de tâches d’EMAIL-01.
- Démonstration (DEMO-02) : `chargerImages` dans `db/demo/charger.ts`, idempotent et capable de compléter une base chargée avant ; `decrireBilan` ne cite que ce qui a été ajouté.
- Tests : 13 unitaires et 11 de bout en bout (médias), 3 de bout en bout (démonstration), 4 (paquet partagé) ; les tests de bout en bout écrivent leurs images dans un dossier temporaire (`vitest.config.e2e.ts`), vidé avant chaque test.
- Vérifié dans le navigateur, par le relais du site : avatar de l’en-tête d’un membre de démonstration, envoi d’une image (201, déclinaisons servies), fichier déguisé et fichier de 6 et 12 Mo refusés avec leur message, retrait (204), aucune erreur de console.
- Constat : les images « résultat » du prototype sont au niveau de la création, RG-11 et RG-12 les veulent sur l’échange (point à trancher, avant CREA-01).
- Poste de travail : `.claude/launch.json` lance les serveurs avec `corepack pnpm` (pnpm n’est pas sur le PATH du lanceur d’aperçu ; corepack est fourni avec Node 24). PostgreSQL temporaire des sessions précédentes relancé avec `pg_ctl`.

### 2026-10-23 — Données de démonstration (DEMO-01)
- `apps/api/src/db/demo/` : `types.ts` (forme des données), `donnees/` (membres, créations, forum, Bon réflexe, défis), `charger.ts` (`chargerDemo`, refus en production, une transaction, tirages déterministes), `index.ts` (`pnpm db:demo`, `start:demo` pour une image construite), `identifiants.ts` (mot de passe commun des comptes). `hacherMotDePasse` exporté par `MotsDePasseService` (même Argon2id que les vrais comptes).
- Données converties une fois depuis `prototype/*-data.js`, `creation-details.js` et `fiche-creation.html` (script de conversion hors dépôt) : le dossier `donnees/` est désormais la source, à modifier sur place. Les références d’images et d’avatars y sont prêtes pour DEMO-02.
- Les 95 étiquettes du prototype absentes du référentiel sont ajoutées comme à la saisie d’un membre ; rien d’autre n’est écrit dans les référentiels.
- Vérifié : `pnpm db:reset && pnpm db:seed && pnpm db:demo` sur `vysora_test`, puis deux fois `pnpm db:demo` sur la base de développement (le second n’ajoute rien). `db:reset` n’a pas été lancé sur la base de développement : elle contient quatre comptes créés à la main (dont une adresse gmail.com), conservés.
- 9 tests de bout en bout : refus en production (fonction et commande), comptes, règles (RG-40 à RG-42, RG-72, CI-16), dates, réputation et classement de la semaine, connexion au niveau du prototype, idempotence.

### 2026-10-23 — Dialogue d’accès et pages légales (AUTH-07, LEG-01, fin d’AUTH-05)
- Site : `lib/acces.ts` et `scripts/commun/acces.ts` (`exiger`, `accesBloc`, `invitation`, gardes des liens « Publier » et `data-exige`), `AccesBloc.astro` ; boutons « Renvoyer l’e-mail » et « Accepter » branchés ; `etats.appliquer` et `etats.on` (état mis à jour sans rechargement) ; `attributsEtat` déplacé dans `lib/etat-html.ts` (utilisable par le navigateur).
- Pages légales : `PageLegale.astro`, `lib/pages-legales.ts`, `scripts/documents-legaux.ts`, cinq pages générées depuis le balisage du prototype (liens convertis vers `ROUTES`).
- API : `GET /api/v1/documents-legaux` indique au membre connecté les versions qu’il lui reste à accepter (`aAccepter`).
- Vérifié dans le navigateur : dialogue en visiteur, e-mail à confirmer et conditions à accepter ; acceptation depuis le dialogue, le bandeau et la page ; focus conservé ; pages légales comparées au prototype (texte rendu, structure, insécables, hauteur de page à 375 px, rendu à 1280 px).
- AUTH-05 est clos ; l’e-mail à la date d’effet d’une nouvelle version (RG-90) rejoint EMAIL-01.

### 2026-10-23 — Connexion et inscription portées, liens par e-mail (AUTH-02 à AUTH-05)
- API : liens à usage unique (`JetonsService`), vérification de l’adresse et renvoi, mot de passe oublié, documents en vigueur et acceptation ; code d’erreur `LIEN_EXPIRE` (410) ; bouton d’action dans les e-mails. 20 tests de bout en bout de plus (50 au total).
- Site : enveloppe « auth » du gabarit, `AuthTete`, `CompteMenu` (extrait de l’en-tête, partagé), `DocumentsDialogue`, `MembreConnecte` ; scripts `auth/commun.ts`, `auth/fond.ts`, `connexion.ts`, `inscription.ts`, `commun/api.ts` ; `lib/retour.ts` (retour sûr) ; `appelerApi` envoie en POST un corps sans méthode (la lecture des liens par le serveur échouait).
- Vérifié dans le navigateur : connexion (erreur, compte à confirmer, renvoi du lien), inscription complète (suggestion d’adresse, jauge, pseudo pris et variantes, pseudo modifié, confirmation, correction de l’adresse, lien ouvert dans un autre onglet), mot de passe oublié jusqu’à la reconnexion, fenêtre des documents ; mêmes rendus que le prototype à 1280, 820 et 375 px.
- Poste de travail : sans Docker, un récepteur SMTP minimal (hors dépôt) a remplacé Mailpit pour lire les liens.

### 2026-10-23 — Authentification : comptes, sessions, droits (AUTH-01, AUTH-06)
- Paquet partagé : `evaluerMotDePasse` (RG-04, même jugement pour la jauge et l'API), pseudos réservés et tirés (« prisme-azur-42 »), schémas d'inscription et de connexion, contrat `SessionApi` ; code d'erreur `IDENTIFIANTS_INCORRECTS` et membres d'extension `raison`, `reessayerDans` (en-tête `Retry-After`).
- API, module `auth` : inscription, connexion, déconnexion, état de session (niveau, rôle, lecture seule : e-mail, conditions, suspension), disponibilités, modification du pseudo, garde des droits. Argon2id (OWASP), Have I Been Pwned en k-anonymat (désactivable : `VERIFIER_FUITES`), temporisation par empreinte de l'adresse (migration `0002`), fixation de session évitée, WF-23.
- Site : session chargée seulement si le cookie est présent ; cookies renouvelés transmis ; dates du bandeau ; déconnexion avec message après rechargement (comme le prototype) ; état JSON de la page échappé.
- Vérifié dans le navigateur : inscription par le relais, en-tête et bandeau de membre, menu du compte, déconnexion ; échéance renouvelée lors du rendu d'une page.
- Poste de travail : Docker n'est plus installé sur cette machine. Les tests ont tourné sur un PostgreSQL 18 temporaire (binaires `@embedded-postgres/windows-x64` hors du dépôt) ; `pnpm` passe par `corepack pnpm`. Rien n'est changé dans le dépôt pour cela.
- Suite : AUTH-04 (pages Connexion et Inscription), puis AUTH-02 et AUTH-03.

### 2026-10-23 — Mise en place du socle
- Analyse du prototype (22 pages, ≈ 37 000 lignes) et des documents 01 à 08 ; choix de la stack (ADR-0001 à 0008).
- Socle livré et vérifié : monorepo, Docker, MLD de 50 tables migré, référentiels chargés, API (santé, référentiels, contact), site Astro avec l'enveloppe commune du prototype, page Contact portée à l'identique et branchée de bout en bout (base, e-mails), 404, CSP ; 32 tests au vert ; CI.
- Constats : le relais de développement de Vite bloque le corps JSON → relais dans le site (ADR-0007) ; Mailpit lent sans `MP_SMTP_DISABLE_RDNS`.
- Suite : AUTH-01, puis AUTH-04 et LEG-01 (voir « Prochaines tâches »).
