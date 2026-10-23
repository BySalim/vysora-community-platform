# Vysora

**Voir comment l'IA crée. Apprendre à créer avec elle.**

Vysora est une plateforme communautaire et gratuite : les membres publient ce qu'ils créent avec l'IA avec le chemin parcouru (prompts, outils, modèles, moments clés), la communauté évalue, reproduit, discute et apprend.

Ce dépôt contient le produit réel, construit à partir du prototype (`prototype/`) et des documents produit (`docs/produit/`).

## Démarrer

Prérequis : Node.js 24, pnpm 10, Docker.

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm infra:up
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

```bash
pnpm dev
```

- Site : http://localhost:4321 (la page Contact est entièrement fonctionnelle)
- API : http://localhost:3000/api/health
- E-mails capturés (Mailpit) : http://localhost:8025
- Prototype de référence : `pnpm prototype` puis http://localhost:5173

Avant de livrer :

```bash
pnpm verifier
```

## Organisation

| Dossier | Contenu |
|---|---|
| `apps/web` | Site (Astro, rendu serveur) : reproduction fidèle du prototype, alimentée par l'API |
| `apps/api` | API (NestJS, PostgreSQL, Drizzle) : règles de gestion, droits, données |
| `packages/shared` | Énumérations, règles chiffrées, droits, schémas de validation partagés |
| `docs/` | Architecture, MLD, conventions, sécurité, méthode de portage, décisions, **registre des tâches** |
| `prototype/` | Prototype de référence, en lecture seule |

## Pour contribuer

Lire [`AGENTS.md`](AGENTS.md) (guide de travail) puis [`docs/registre.md`](docs/registre.md) (ce qui est fait, ce qui vient ensuite).
