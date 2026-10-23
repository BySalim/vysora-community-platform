# Décisions d'architecture (ADR)

Une décision structurante = une note courte : contexte, décision, conséquences, statut. Une décision n'est pas gravée : si elle change, on écrit une nouvelle note qui remplace l'ancienne (statut « Remplacée par ADR-00xx »), sans effacer l'historique.

| N° | Décision | Statut |
|---|---|---|
| [0001](0001-monorepo-typescript.md) | Monorepo TypeScript (pnpm) : site, API, paquet partagé | Acceptée |
| [0002](0002-astro-ssr-fidelite-prototype.md) | Astro en rendu serveur pour reproduire le prototype | Acceptée |
| [0003](0003-api-nestjs-autorite-unique.md) | API NestJS séparée, seule autorité sur les règles | Acceptée |
| [0004](0004-postgresql-drizzle.md) | PostgreSQL et Drizzle ; MLD fidèle au MCD | Acceptée |
| [0005](0005-sessions-cookie.md) | Sessions en base et cookie `HttpOnly`, sans JWT | Proposée (AUTH-01) |
| [0006](0006-vocabulaire-francais.md) | Vocabulaire du domaine en français dans le code | Acceptée |
| [0007](0007-relais-api-meme-origine.md) | Relais `/api` par le site : une seule origine | Acceptée |
| [0008](0008-hebergement.md) | Hébergement : un serveur en Europe, Docker Compose | Proposée |

Modèle :

```markdown
# ADR-00xx — Titre
Statut : Proposée | Acceptée | Remplacée par ADR-00yy · Date : AAAA-MM-JJ
## Contexte
## Décision
## Conséquences
```
