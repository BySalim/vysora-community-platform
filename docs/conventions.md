# Conventions

> Des habitudes communes pour que chaque session retrouve un code familier. Ce sont des valeurs par défaut :
> quand une meilleure pratique s'impose, on l'adopte, on l'applique au code existant si c'est simple, et on met ce fichier à jour.

## Langue

- **Domaine en français**, avec le vocabulaire du MCD et des règles : `creation`, `etape`, `echange`, `momentCle`, `publier`, `signaler`. Les identifiants n'ont pas d'accents ; les textes affichés, si.
- **Technique en anglais** quand c'est le terme du framework ou de l'usage : `controller`, `module`, `middleware`, `id`, `slug`, `health`.
- Commentaires, documentation, messages d'erreur, journaux lisibles : en français. Un commentaire explique le *pourquoi* (règle, contrainte, piège), pas le *quoi*.
- Textes d'interface : finis, professionnels, vouvoiement, typographie française ([`produit/08-guide-redaction.md`](produit/08-guide-redaction.md)). Jamais de texte provisoire ni de note de développement à l'écran.

## Nommage

| Élément | Forme | Exemple |
|---|---|---|
| Fichiers TypeScript | `kebab-case` | `contact.service.ts`, `filtre-erreurs.ts` |
| Composants Astro | `PascalCase` | `SiteHeader.astro` |
| Pages Astro | chemin de la route | `pages/creations/[id].astro` |
| Classes | `PascalCase` | `ContactService`, `OrigineGuard` |
| Fonctions, variables | `camelCase` | `genererReference`, `raisonRefus` |
| Constantes de référence | `MAJUSCULES` | `TYPES_CREATION`, `LONGUEURS` |
| Valeurs énumérées | `MAJUSCULES_SANS_ACCENT` | `PUBLIEE`, `UN_PROMPT` |
| Tables et colonnes | `snake_case` singulier | `moment_cle.explication` |

## API

- REST sous `/api/v1`, ressources au pluriel en français : `/api/v1/creations`, `/api/v1/creations/:id/reproductions`, `/api/v1/sujets/:id/messages`. `GET /api/health` hors version.
- Actions qui ne sont pas du CRUD : sous-ressource verbale explicite, `POST /api/v1/creations/:id/publication`, `DELETE /api/v1/creations/:id/publication` (dépublier), `PUT /api/v1/contenus/:id/votes/UTILE`.
- JSON en camelCase ; dates en ISO 8601 UTC ; identifiants numériques.
- Listes : `{ "elements": [...], "suivant": "<curseur>" | null }` (pagination par curseur), `total` seulement s'il est utile à l'écran. Exception : une liste privée qu'une page cherche, filtre et trie entière dans le navigateur, comme dans le prototype (« Mes contenus » : `GET /api/v1/moi/creations`, `GET /api/v1/moi/enregistrements`), est renvoyée complète, sans `suivant` ; la pagination viendra si les volumes l'exigent (registre, R-09). Autre exception : une liste publique que le prototype pagine par numéros, avec le nombre de résultats et la page dans l'adresse (forum : `GET /api/v1/sujets?page=3`) répond `{ "elements": [...], "total", "page", "pages" }` ; une page au-delà de la dernière renvoie la dernière. Les cas Bon réflexe suivent le forum (`GET /api/v1/cas?page=2`). Les paramètres d’adresse des listes se valident avec `parametreBooleen`, `parametreListe` et `parametrePage` (`schemas/commun.ts`).
- Erreurs : RFC 9457 (`application/problem+json`) avec `code` stable et `erreurs` par champ ; lever une `ErreurApplication` (ou ses raccourcis `introuvable()`, `interdit()`, `conflit()`, `erreurValidation()`), jamais une réponse construite à la main.
- Validation : `@Body(new ValidationZod(schema))` avec un schéma de `@vysora/shared` ; les messages du schéma sont ceux de l'interface. Identifiant dans l'adresse : `@Param('id', IdentifiantPipe)` (404 si ce n'est pas un entier positif).
- Images : l'envoi passe par `@UseInterceptors(ReceptionImage)` (champ `fichier`, `multipart/form-data`) et `fichierRecu(requete)` ; une image se présente avec `presenterMedia` (contrat `MediaApi`) et s'enregistre avec `enregistrerImage` ; jamais de chemin de fichier construit à la main, toujours le `Stockage` injecté.
- Les types de réponse vivent dans `packages/shared/src/contrats/` pour que le site les réutilise.
- Toute route qui modifie des données passe par la garde d'origine (globale) ; toute route réservée déclare l'action demandée avec `@Exige('contribuer' | 'parametres' | 'proposer-cas' | 'moderer' | 'administrer')` et lit la personne connectée avec `@SessionCourante()` (`modules/auth/droits.ts`). La garde applique `raisonRefus` et répond 401 ou 403 avec la `raison`, que le site présente avec le bon dialogue.

## Code de l'API

- Un dossier par domaine dans `src/modules/` : `x.module.ts`, `x.controller.ts`, `x.service.ts`, éventuellement `x.repository.ts` si les requêtes deviennent nombreuses, et des tests `*.spec.ts` à côté.
- Contrôleur mince : routes, validation, codes HTTP. Règles et transactions dans le service (`db.transaction(async (tx) => …)` dès que plusieurs écritures vont ensemble).
- Accès à la base par le client Drizzle injecté (`@Inject(BASE)`), requêtes typées ; SQL brut seulement si nécessaire, toujours paramétré (`sql\`… ${valeur}\``).
- Configuration par `@Inject(CONFIG)` (variables validées au démarrage) ; jamais `process.env` ailleurs que dans `config/env.ts`.
- Imports relatifs avec l'extension `.js` (ESM, NestJS 12).
- E-mails : toujours `EmailService.envoyer` (mise en file, jamais d'envoi SMTP dans une requête), après la validation de la transaction. Travail différé ou planifié : une tâche déclarée avec `FileTaches.declarer` dans `onModuleInit` (nom `domaine.action`, reprises, durée maximale, conservation, cron UTC s'il y a lieu), rejouable sans effet de bord ; les tâches planifiées sont listées dans `modules/taches/taches-planifiees.ts`.

## Code du site

- Une page = un fichier dans `src/pages/`, qui utilise `layouts/Base.astro` et importe ses feuilles de style du prototype.
- Données : appelées côté serveur dans la page (`appelerApi`) pour un rendu complet et indexable ; côté navigateur seulement pour les interactions (`fetch('/api/v1/…')`).
- Scripts de page dans `src/scripts/<page>.ts`, importés par `<script>` dans la page ; outils communs dans `src/scripts/commun/` (`$`, `icon`, `toast`, `etats`…).
- Styles : les fichiers du prototype restent identiques à l'original dans `src/styles/` ; les ajouts vont dans `socle.css` ou dans un fichier nouveau, jamais en modifiant un fichier repris sans le noter.
- Icônes : `src/lib/icones.ts` et le composant `Sprite` (la page déclare ses icônes).
- Textes rédigés par les membres : `rendreMarkdown(texte)` (`lib/markdown.ts`) dans un `set:html`, jamais un autre rendu ; les prompts s'affichent tels quels (Astro les échappe).
- Actions réservées : dans un script, `if (!exiger('contribuer', 'voter')) return;` avant l'appel à l'API ; dans le HTML, `data-exige` et `data-exige-quoi` sur le bouton ; côté serveur, `<AccesBloc quoi="publier une création">…</AccesBloc>` autour du contenu réservé. Le site anticipe, l'API refuse avec la même `raison`.

## Données partagées

- `packages/shared` ne dépend que de Zod. Après une modification : `pnpm --filter @vysora/shared build` (le mode `pnpm dev` le reconstruit tout seul).
- Une règle chiffrée (longueur, seuil, délai, barème) est déclarée une fois dans `regles.ts` et citée partout.
- Un contrôle que l’interface doit annoncer avant l’envoi vit dans le paquet partagé, avec ses messages : l’API l’applique, le site le reprend (par exemple `controlerPublication` pour une création, `liensMaximum` et `limiteQuotidienne` pour RG-85).

## Tests

| Niveau | Où | Quand |
|---|---|---|
| Unitaire (règles, schémas, utilitaires) | `*.test.ts` (shared, web), `*.spec.ts` (api) | Toute règle de gestion, avec son identifiant dans le titre ou un commentaire |
| Bout en bout API | `apps/api/test/*.e2e-spec.ts` | Chaque route : cas nominal, refus (droits, validation), effets en base. `creerMembre` crée un membre en base, `request.agent` garde le cookie de session, `ipDeTest()` isole les limites de débit par test ; la file y est immédiate : `contexte.emails` reçoit les e-mails dès la réponse, `contexte.taches.lancer(nom)` joue une tâche planifiée |
| Navigateur | à mettre en place (Playwright) | Parcours critiques et comparaison visuelle avec le prototype |

`pnpm verifier` doit passer avant de considérer une tâche comme faite.

## Git

- Branche `main` toujours fonctionnelle ; travail sur des branches courtes (`<type>/<sujet>`).
- Messages de commit en français, au format `type(portée): résumé` : `feat(contact): envoi du formulaire à l'API`, `fix(api): …`, `docs(registre): …`, `chore`, `refactor`, `test`.
- Un commit = un changement cohérent qui passe `pnpm verifier`.
- Jamais de secret dans le dépôt (`.env` est ignoré ; `.env.example` ne contient que des valeurs de développement).

## Définition de « fait »

Une tâche est faite quand : le comportement attendu fonctionne de bout en bout ; l'écran est fidèle au prototype (comparé côte à côte) ; les règles concernées sont testées ; `pnpm verifier` passe ; le registre est à jour (fait, reporté, découvert).
