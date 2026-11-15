# Référencement

Ce que les moteurs de recherche et les assistants d'IA peuvent lire de Vysora, et comment ils le comprennent (ENF-04, F-26). Le code est dans `apps/web/src/lib/referencement.ts`, `plan-du-site.ts` et `donnees-structurees.ts`.

## Ce qui est indexé : la variable `INDEXATION`

Le serveur du site lit `INDEXATION` à chaque requête :

| Valeur | Effet | Où |
|---|---|---|
| `aucune` | Rien n'est indexé : `noindex` sur toutes les pages, `robots.txt` ferme le site, plan du site vide | Valeur par défaut hors production (développement, essais) |
| `pages` | Pages de l'équipe indexées ; contenus des membres en `noindex, follow` | Préproduction tant que la démonstration est en ligne (DEMO-04), valeur par défaut de `infra/production/compose.yml` |
| `complete` | Tout ce qui est public est indexé | Ouverture publique |

**Pages de l'équipe** : accueil, Explorer et ses guides (`/explorer?guide=…`), domaines (`/categories/…`), Apprendre, ses rubriques et ses savoirs, Forum (liste), Défis (liste), Classements, Contact, pages légales.

**Contenus des membres** (`contenuDeMembre` dans `Base.astro`) : fiche d'une création, sujet du forum, cas Bon réflexe, profil, page d'un défi. Avec `pages`, ils restent lisibles et leurs liens sont suivis, mais les membres et créations de démonstration n'entrent pas dans les résultats.

Une page privée, un brouillon, un contenu masqué, un aperçu, un profil vu par son propriétaire ou une liste filtrée du forum restent en `noindex, nofollow` quel que soit le mode (`nonIndexee`).

## Robots

`/robots.txt` (choix du porteur du projet, 2026-11-15) :

- **Moteurs de recherche et assistants qui citent leurs sources** : admis. Googlebot, Bingbot, OAI-SearchBot et ChatGPT-User (OpenAI), Claude-SearchBot et Claude-User (Anthropic), PerplexityBot et Perplexity-User, DuckAssistBot, MistralAI-User suivent la règle commune.
- **Collecte pour entraîner des modèles** : refusée à GPTBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, CCBot, Meta-ExternalAgent, FacebookBot, Bytespider, cohere-training-data-crawler, AI2Bot (`ROBOTS_ENTRAINEMENT`). Google-Extended couvre aussi les réponses de Gemini ; les aperçus IA de la recherche Google, eux, passent par Googlebot.
- **Chemins exclus** : `/api/` (sauf les images, `/api/v1/fichiers/`), connexion, inscription, notifications, paramètres, « Mes contenus », éditeurs et formulaires de publication. `/admin` et `/moderation` n'y figurent pas : ce fichier est public, et ces zones sont introuvables pour qui n'en a pas le rôle (ADM-04).

Les liens que les membres publient portent `rel="ugc nofollow"` (ENF-06).

## Plan du site et llms.txt

- `/sitemap.xml` : pages de l'équipe, avec la date de mise à jour des guides et des savoirs. Les contenus des membres s'y ajouteront avec REF-02, avant de passer à `complete`.
- `/llms.txt` (format [llmstxt.org](https://llmstxt.org)) : présentation de Vysora pour les assistants d'IA, ses rubriques, ses guides, ses domaines, ses savoirs, la façon de citer un contenu (licence de chaque création, CC BY 4.0 pour le reste). Tant que l'indexation n'est pas `complete`, il précise que les membres et créations présentés sont des exemples de démonstration.

Les trois réponses sont mises en cache une heure.

## Balises de chaque page

`Base.astro` pose : titre, description, adresse canonique, directive `robots`, Open Graph (`og:type`, `og:image` et son texte alternatif), `twitter:card`. Sans image propre à la page, l'aperçu montre la carte de Vysora (`public/assets/partage/vysora-1200x630.png`, 1200 × 630, à refaire si le slogan ou le logo changent).

## Données structurées (schema.org, JSON-LD)

| Page | Types |
|---|---|
| Accueil | `Organization`, `WebSite` |
| Création publiée | `CreativeWork` (auteur, licence, dates, catégorie, étiquettes, image, outils et modèles du parcours, votes « Utile », commentaires), `BreadcrumbList` |
| Sujet du forum | `DiscussionForumPosting` (texte, auteur, outil, réponses visibles en `Comment`), `BreadcrumbList` |
| Profil | `ProfilePage` et sa `Person` |
| Savoir d'Apprendre | `Article` (écrit par l'équipe, durée de lecture), `BreadcrumbList` |

Le JSON est échappé (`<`, U+2028, U+2029) : un contenu de membre ne peut pas fermer la balise. Une page non indexée n'en reçoit pas. Vérifier un rendu : [test des résultats enrichis](https://search.google.com/test/rich-results) et [validateur schema.org](https://validator.schema.org).

## Mesure : ce que lisent les assistants d'IA (REF-03)

Écran « Assistants d'IA » de l'administration (`/admin/assistants-ia`), sur 7, 30 ou 90 jours :

| Nature | Ce qui est compté | Comment on le reconnaît |
|---|---|---|
| Visites envoyées | Une personne arrive depuis un lien cité par un assistant | Provenance (`Referer`) : `chatgpt.com`, `claude.ai`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `chat.mistral.ai`, `chat.deepseek.com`, `duck.ai`, `meta.ai` ; ou `utm_source` (ChatGPT ajoute `utm_source=chatgpt.com`) |
| Pages lues pour une personne | L'assistant ouvre une page pour répondre à une question | `ChatGPT-User`, `Claude-User`, `Perplexity-User`, `MistralAI-User` |
| Pages explorées pour leur index | Le robot de recherche de l'assistant parcourt le site | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `DuckAssistBot` |
| Robots d'entraînement | Robots que `robots.txt` refuse ; ils ne devraient lire que `/robots.txt` | `GPTBot`, `ClaudeBot`, `CCBot`, `Meta-ExternalAgent`, `Bytespider`… |

La liste est dans `packages/shared/src/assistants-ia.ts` (`ASSISTANTS_IA`) : un nouvel assistant s'y ajoute, avec une migration pour la contrainte de la table `passage_assistant`. Le middleware du site (`apps/web/src/middleware.ts`) signale à l'API (`POST /api/v1/assistants-ia/passages`) les seules pages servies à un assistant ou à une personne venue de l'un d'eux, sans attendre sa réponse ; l'API reconnaît de nouveau le passage et ajoute 1 au compteur du jour. Rien d'autre n'est gardé : ni adresse IP, ni navigateur, ni parcours d'une personne.

Un nom de robot s'imite : ces chiffres sont des ordres de grandeur. Les citations dans les aperçus IA de Google et dans Copilot se lisent dans la Search Console (rapport « Performances », mêlées aux résultats classiques) et dans Bing Webmaster Tools (« AI Performance »).

## À faire par le porteur du projet

1. **Google Search Console** : ajouter la propriété de domaine `vysora.site` (enregistrement TXT dans la zone DNS), puis envoyer `https://vysora.site/sitemap.xml`.
2. **Bing Webmaster Tools** : importer le site depuis la Search Console. L'index de Bing alimente aussi Copilot et une partie des recherches des assistants d'IA.
3. À l'ouverture publique : REF-02, puis `INDEXATION=complete` dans le `.env` du serveur et `up -d`.
