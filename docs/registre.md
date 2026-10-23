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

1. **AUTH-01** — Socle d'authentification (sessions, inscription, connexion, déconnexion, `GET /api/v1/session`).
2. **AUTH-04** — Pages Connexion et Inscription portées et branchées.
3. **LEG-01** — Pages légales portées (CGU, confidentialité, charte, cookies, mentions légales).
4. **AUTH-02**, **AUTH-03**, **AUTH-05** — Vérification de l'e-mail, mot de passe oublié, acceptation des documents.
5. **DEMO-01** — Données de démonstration tirées du prototype (développement et préproduction).
6. **CREA-01** puis **CREA-02**, **CREA-03** — Créations : API, éditeur, fiche.

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
| AUTH-01 | Sessions et comptes | P0 | ⬜ | Argon2id, inscription par e-mail (pseudo RG-01, e-mail RG-02, mot de passe RG-04 avec liste de mots de passe compromis), connexion, déconnexion, cookie de session (ADR-0005), temporisation après 5 échecs, `GET /api/v1/session` → `EtatVisiteur` ; `chargerSession` du site branché ; menu du compte et déconnexion dans l'en-tête. F-01, F-03 |
| AUTH-02 | Vérification de l'e-mail | P0 | ⬜ | Jeton 24 h, renvoi du lien, compte en lecture seule tant que non vérifié (bandeau déjà prêt). F-01, RG-02 |
| AUTH-03 | Mot de passe oublié et réinitialisation | P0 | ⬜ | Lien 1 h, message identique que l'e-mail existe ou non, sessions fermées après changement. F-03 |
| AUTH-04 | Pages Connexion et Inscription portées | P0 | ⬜ | proto `connexion.html`, `inscription.html`, `auth.css`, `auth.js`, `auth-data.js` ; retour à la page d'origine (`?retour=`, `?pour=`) ; pseudos réservés ; boutons GitHub et Google présents mais branchés par AUTH-08 |
| AUTH-05 | Acceptation versionnée des documents légaux | P0 | ⬜ | À l'inscription et à chaque nouvelle version (`/accepter-documents`, bandeau « conditions ») ; confidentialité informative (voir Points à trancher). F-04, RG-03, RG-112 |
| AUTH-06 | Garde des droits côté API | P0 | ⬜ | Décorateur ou garde `@Exige('contribuer' | 'moderer' | 'administrer' | 'proposer-cas')` fondé sur `raisonRefus` + état du compte (e-mail, conditions, suspension) ; tests de refus |
| AUTH-07 | Dialogue d'accès côté site | P0 | ⬜ | Porter `exiger`, `accesBloc`, `invitation` et les gardes de liens de `commun.js` (`data-exige`) |
| LEG-01 | Pages légales portées | P0 | ⬜ | `cgu`, `confidentialite`, `charte-communautaire`, `cookies`, `mentions-legales` + `documents-legaux.js` ; version et date affichées depuis `document_legal` |
| INV-01 | Bêta fermée sur invitation | P1 | ⬜ | Code d'invitation à l'inscription (proto : `auth-data.js`, `invitation`), table `invitation`, création des codes par l'administration ; badge PIONNIER |
| DEMO-01 | Données de démonstration | P1 | ⬜ | Script `pnpm db:demo` (jamais en production) : membres, créations avec parcours, sujets, cas, défis, votes, tirés des `*-data.js` du prototype ; avatars et images de `prototype/assets` servis par le stockage des médias |

## Lot 2 — Valeur centrale : publier et consulter un parcours (P1)

| ID | Tâche | Prio | Statut | Périmètre de base · références |
|---|---|---|---|---|
| MEDIA-01 | Téléversement d'images | P1 | ⬜ | Contrôle par signature, 5 Mo, ré-encodage WebP 720 et 1280 (`sharp`), métadonnées supprimées, texte alternatif obligatoire, stockage local derrière une interface ; nettoyage des orphelines. RG-16 |
| CREA-01 | API des créations | P1 | ⬜ | Brouillon (3 types), enregistrement, publication avec contrôles RG-10 à RG-17 (erreurs par champ), modification (date affichée), dépublication, suppression ; limites RG-85 ; slug ; lecture d'une fiche selon la visibilité RG-30 ; index de recherche mis à jour. F-10 à F-17 |
| CREA-02 | Éditeur porté (Publier) | P1 | ⬜ | proto `nouvelle-creation.*` : trois types, configurations IA (outils et modèles proposés), échanges, étapes, moments clés, liens, images, licence, étiquettes, confirmation avant publication ; `/creations/nouvelle`, `/creations/[id]/modifier`. Îlot React permis si le script devient ingérable (ADR-0002) |
| CREA-03 | Fiche création portée | P1 | ⬜ | proto `fiche-creation.*` : en-tête, résultat, moments clés, parcours dépliable, copie du prompt (F-24), licence, dates ; `/creations/[id]-[slug]` avec redirection si le slug change ; balises de partage (F-26). F-23 |
| CREA-04 | Mes contenus porté | P1 | ⬜ | proto `mes-contenus.*` : brouillons, publiés (enregistrés avec INT-04). F-16, EC-15 |
| PROF-01 | Profil public porté | P1 | ⬜ | proto `profil.*` : identité, niveau, réputation, créations publiées, statistiques publiques (calculées) ; modification de la photo, de la biographie et du lien. F-05, F-73 |
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
| EMAIL-01 | File d'envoi des e-mails | P1 | ⬜ | `pg-boss` : envoi asynchrone avec reprises (aujourd'hui l'envoi est direct, un échec est seulement journalisé) ; tâches planifiées (suppressions à 30 jours, purge des vues, exports) |

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
| OPS-01 | Préproduction : serveur, Docker Compose de production, Caddy, déploiement depuis la CI | P1 | ⬜ | ADR-0008 ; à faire dès que le lot 2 est utilisable, pour tester sur de vrais appareils. Le build de l'API embarque `start:migrate` et `start:seed` ; Caddy envoie `/api/*` directement à l'API (sinon, faire transmettre l'adresse du visiteur au relais du site) |
| OPS-02 | Sauvegardes chiffrées quotidiennes, restauration testée | P1 | ⬜ | ENF-08 |
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

## Points à trancher (porteur du projet)

| Sujet | Question | Proposition |
|---|---|---|
| Politique de confidentialité | Le prototype la présente comme une information (pas d'acceptation), RG-03 demande son acceptation. | Suivre le prototype (plus juste juridiquement) : `acceptation_requise = false` déjà en base, à confirmer |
| Route « Apprendre » | Le plan du site prévoit `/bon-reflexe` ; le prototype a une page Apprendre à rubriques. | `/apprendre` pour la page, `/bon-reflexe/[id]-[slug]` pour un cas |
| Explorer : « guides » | Le prototype présente des guides d'intention (méthode qui ressort, pièges, outils qui marchent). Contenu éditorial ou calculé ? | Démarrer éditorial (administré), calcul plus tard |
| Données de démonstration | En préproduction pour la bêta ? | Oui en préproduction, jamais en production |
| Hébergeur, domaine, fournisseur d'e-mail | — | ADR-0008 |
| Anglais | Au lancement ou après (D-06) ? | Après l'ouverture (S-15) |
| Licence par défaut et suppression de compte | Avis juridique demandé (D-07, D-09) | En attente |

## Journal

### 2026-10-23 — Mise en place du socle
- Analyse du prototype (22 pages, ≈ 37 000 lignes) et des documents 01 à 08 ; choix de la stack (ADR-0001 à 0008).
- Socle livré et vérifié : monorepo, Docker, MLD de 50 tables migré, référentiels chargés, API (santé, référentiels, contact), site Astro avec l'enveloppe commune du prototype, page Contact portée à l'identique et branchée de bout en bout (base, e-mails), 404, CSP ; 32 tests au vert ; CI.
- Constats : le relais de développement de Vite bloque le corps JSON → relais dans le site (ADR-0007) ; Mailpit lent sans `MP_SMTP_DISABLE_RDNS`.
- Suite : AUTH-01, puis AUTH-04 et LEG-01 (voir « Prochaines tâches »).
