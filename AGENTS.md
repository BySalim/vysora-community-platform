# Vysora — Guide de travail

> Pour toute session d'assistant et toute personne qui contribue. Ce guide donne la direction et les habitudes ;
> il ne fige rien. Si une meilleure façon de faire apparaît, on l'adopte et on met ce guide à jour.

## Le projet

**Vysora** est une plateforme communautaire où l'on publie ce que l'on crée avec l'IA **avec le chemin parcouru** (prompts, outils, modèles, moments clés), où la communauté évalue, reproduit, discute et apprend. Slogan : « Voir comment l'IA crée. Apprendre à créer avec elle. »

Un **prototype** complet et simulé existe (`prototype/`). Nous réalisons maintenant le produit réel, avec quatre objectifs :

1. **Une représentation exacte et complète du prototype** : mêmes pages, même rendu, mêmes interactions, avec de vraies données.
2. **Un backend professionnel** : l'API porte toutes les règles de gestion.
3. **Un projet sécurisé** dès le départ, renforcé à chaque étape.
4. **Une architecture et des pratiques professionnelles** : tests, conventions, décisions documentées.

On privilégie la **vitesse** pour rendre le produit utilisable au plus tôt, en avançant **en largeur** : chaque fonctionnalité d'abord dans une version de base qui marche de bout en bout, par ordre d'importance ; le complexe et le non urgent viennent ensuite.

## Commencer une session

1. Lire [`docs/registre.md`](docs/registre.md) : prochaines tâches, journal, points à trancher. Vérifier aussi qu'aucune branche distante n'est en avance sur `main` (`git fetch` puis `git branch -r`) : un travail non fusionné ne se refait pas.
2. Lire ce qui concerne la tâche : [`docs/architecture.md`](docs/architecture.md), [`docs/conventions.md`](docs/conventions.md), [`docs/mld.md`](docs/mld.md), [`docs/portage-prototype.md`](docs/portage-prototype.md), [`docs/securite.md`](docs/securite.md), et dans `docs/produit/` les fonctionnalités (F-xx), règles (RG-xx) et écrans (EC-xx) en jeu.
3. Ouvrir la page du prototype concernée (`pnpm prototype`, http://localhost:5173) et lire son code.
4. Dire au porteur du projet, en quelques lignes, ce que la session va livrer et dans quel ordre.

## Pendant la session

- **Le prototype est la référence visuelle.** Une page portée reprend son balisage, ses classes et sa feuille de style d'origine ; on compare côte à côte à plusieurs largeurs. La page Contact est l'exemple complet (site, API, base, e-mails, tests).
- **L'API décide, le site affiche.** Toute règle, tout droit, toute validation vit dans l'API (le site peut anticiper pour l'affichage avec les mêmes fonctions de `@vysora/shared`).
- **Une règle implémentée cite son identifiant** (`RG-42`, `CI-15`) et a son test.
- **Tout est modifiable** : n'importe quel fichier, y compris ce guide, le MLD, les ADR, le registre. Un changement de direction se note (nouvel ADR ou journal du registre) pour que la session suivante comprenne pourquoi.
- **Sécurité** : aucun secret dans le dépôt, contrôles de droits côté API, entrées validées, contenus des membres jamais exécutés. Ce qui touche la sécurité met à jour `docs/securite.md`.
- **Textes affichés** : finis et professionnels, vouvoiement, typographie française ([`docs/produit/08-guide-redaction.md`](docs/produit/08-guide-redaction.md)). Jamais de texte provisoire à l'écran.
- **Un écran sans maquette** (modération, administration) se conçoit dans le style du prototype et de la charte ([`docs/produit/06-charte-graphique.md`](docs/produit/06-charte-graphique.md)), puis se fait valider.
- En cas de doute sur une intention produit, consulter les documents 01 à 07 ; s'ils ne tranchent pas, proposer un choix et l'inscrire dans « Points à trancher ».

## Terminer une session

1. `pnpm verifier` passe (lint, types, tests unitaires et de bout en bout). Sinon, dire précisément ce qui échoue.
2. Le registre est à jour : statuts, tâches découvertes, écarts au prototype, entrée de journal, prochaines tâches.
3. La documentation suit le code (architecture, MLD, conventions, sécurité) si quelque chose a changé.
4. Commits clairs au format `type(portée): résumé` (voir les conventions), sur une branche.
5. La branche est fusionnée dans `main` (après `pnpm verifier`) puis supprimée : aucune branche ne reste en attente avant de passer à la suite. Une session qui ne peut pas supprimer une branche distante le dit au porteur du projet et l'inscrit au journal.
6. Proposer la suite au porteur du projet.

## Commandes

| Commande | Effet |
|---|---|
| `pnpm install` | Dépendances (Node 24, pnpm 10) |
| `pnpm infra:up` / `pnpm infra:down` | PostgreSQL et Mailpit (Docker) |
| `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:reset` | Migrations · référentiels · base remise à zéro (développement) |
| `pnpm db:demo` | Données de démonstration du prototype (membres, créations, forum, cas, défis, votes), après `db:seed` ; idempotent, refusé en production. Comptes `<pseudo>@example.test` (par exemple `clarisse-mendy`, le membre simulé du prototype), mot de passe dans `apps/api/src/db/demo/identifiants.ts` |
| `pnpm db:generate` | Migration SQL depuis le schéma Drizzle (à relire) |
| `pnpm medias:nettoyer` | Supprime les images jamais enregistrées depuis 24 h et les fichiers qu'aucune ligne ne désigne ; l'API le fait chaque jour par la file (EMAIL-01), la commande sert à le lancer à la main |
| `pnpm dev` | Paquet partagé, API (:3000) et site (:4321) en mode développement |
| `pnpm prototype` | Prototype de référence sur :5173 |
| `pnpm verifier` | Lint, types, tests, tests de bout en bout |
| `pnpm build` | Builds de production |

Adresses en développement : site http://localhost:4321 · API http://localhost:3000/api/health · e-mails capturés http://localhost:8025 · prototype http://localhost:5173.

## Où trouver quoi

| Besoin | Endroit |
|---|---|
| Vision, fonctionnalités, parcours, MCD, charte, plan du site, rédaction | `docs/produit/01` à `08` |
| Tâches, priorités, journal | `docs/registre.md` |
| Décisions d'architecture | `docs/decisions/` |
| Schéma de la base | `apps/api/src/db/schema/` (+ `docs/mld.md`) |
| Règles chiffrées, énumérations, droits, schémas de validation | `packages/shared/src/` |
| Modules de l'API | `apps/api/src/modules/<domaine>/` |
| Pages, gabarit, composants, scripts, styles du site | `apps/web/src/` |
| Pages du prototype et leurs données simulées | `prototype/` (lecture seule) |
| Documents remis au jury du hackathon | `hackathon/`, non versionné (son `README.md` d'abord) |

## Pièges connus

- L'API est en ESM (NestJS 12) : imports relatifs avec l'extension `.js`.
- Après une modification de `packages/shared`, le reconstruire (`pnpm --filter @vysora/shared build`) si `pnpm dev` ne tourne pas.
- `drizzle-kit` se lance depuis `apps/api` (`pnpm --filter @vysora/api exec drizzle-kit …`).
- En développement, le navigateur passe par le relais `apps/web/src/pages/api/[...chemin].ts` (ADR-0007) ; le relais de Vite ne transmet pas les corps JSON.
- Les fichiers CSS du prototype (`apps/web/src/styles/`) ne passent pas par Prettier : on les garde identiques à l'original pour pouvoir les comparer.
- La limite de débit de l'API est en mémoire : redémarrer l'API la remet à zéro pendant les essais.
- Les e-mails et les tâches planifiées passent par la file pg-boss, que l'API exécute (schéma `pgboss`, créé à son démarrage) : API arrêtée, rien ne part ; les e-mails attendent dans la file, chiffrés. En test, la file est immédiate : `contexte.emails` est rempli dès la réponse, `contexte.taches.lancer(nom)` joue une tâche planifiée. Une tâche se déclare dans `onModuleInit` avec `FileTaches.declarer` (voir `modules/taches/taches-planifiees.ts`). Les e-mails des notifications ne partent pas avec l'action : la tâche `notifications.emails` les décide selon les préférences (chaque minute) ; en test, `contexte.taches.lancer('notifications.emails')` ou `NotificationsService.envoyerEmailsEnAttente()`.
- `pnpm test:e2e` efface et recrée la base de test : deux sessions qui partagent le même PostgreSQL doivent avoir chacune leur base (`DATABASE_URL_TEST=postgres://…/vysora_test_<sujet>` dans le `.env` du worktree, le nom doit contenir « test »). Un worktree neuf demande `pnpm install` puis `pnpm --filter @vysora/shared build`.
- La CSP du site n'est appliquée qu'en production : un script ou un style en ligne se vérifie avec `astro build` puis `node dist/server/entry.mjs` (variables `PORT`, `API_URL_INTERNE`, `SITE_URL`). Deux `astro dev` ne tournent pas dans le même dossier.
- Les images sont écrites dans `STOCKAGE_DOSSIER`, relatif au dossier de lancement de l'API (`apps/api/stockage/` en développement, ignoré par Git). `pnpm db:demo` y écrit les avatars et images du prototype ; `pnpm db:reset` ne vide pas ce dossier (`pnpm medias:nettoyer` le fera après 24 h).

## Documents du hackathon

Le dossier `hackathon/` réunit les documents remis au jury du hackathon. Son `README.md` en est la référence : objectif de chaque document, frontières entre eux, ce qu'aucun ne contient, versions, chiffres de référence et journal des envois.

- **Le dossier n'est pas versionné** (`.gitignore`) : il n'existe que dans la copie de travail principale du porteur du projet. Une session ouverte dans un worktree ou dans le nuage ne le voit pas ; on ne l'ajoute jamais à un commit.
- Deux agents (`.claude/agents/`, eux versionnés) rédigent et mettent à jour ces documents : `hackathon-presentation` (fiche projet, dossier de présentation, guide de démonstration) et `hackathon-technique` (gestion de projet, note technique, chiffres de référence). Tout travail sur un document passe par l'agent qui le tient ; la session qui les appelle relit leur travail et tient le README du dossier.
- Une session de travail sur le produit ne modifie pas ce dossier. Quand elle change ce que les documents affirment (fonctionnalité visible, architecture, étape franchie), elle le signale au porteur du projet, qui décide de la mise à jour.
- Un changement limité à ce dossier ne passe pas par Git ; un changement des agents ne touche pas au code : `pnpm verifier` n'est pas nécessaire, commit au format `docs(hackathon): …`.
- Un document envoyé ne se modifie plus : tout changement ouvre sa version suivante (voir le README du dossier).
