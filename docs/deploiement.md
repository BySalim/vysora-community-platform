# Déploiement

> Mise en ligne d'une préproduction ou de la production (OPS-01, ADR-0008) : un serveur virtuel,
> Docker Compose, Caddy pour le HTTPS. Tout ce qu'il faut est dans le dépôt : `Dockerfile`,
> `infra/production/compose.yml`, `infra/production/Caddyfile`, `infra/production/.env.example`.

## Ce qui tourne

| Service | Rôle |
|---|---|
| `caddy` | Seul service exposé (ports 80 et 443). Obtient et renouvelle le certificat HTTPS, envoie `/api/*` à l'API et le reste au site. |
| `web` | Site Astro (rendu serveur, CSP appliquée). Appelle l'API par le réseau interne (`API_URL_INTERNE=http://api:3000`). |
| `api` | API NestJS. Exécute aussi la file des tâches (e-mails, badges, nettoyage des images) : aucun cron à prévoir. Images téléversées dans le volume `stockage`. |
| `migration` | Lancé avant chaque démarrage de l'API : migrations puis référentiels (`db:seed`), tous deux idempotents. |
| `postgres` | PostgreSQL 18, données dans le volume `postgres-donnees`, jamais exposé. |

Préproduction et production utilisent les mêmes fichiers ; seule la variable `ENVIRONNEMENT` change (`preproduction` autorise les données de démonstration, `production` les refuse).

## Première mise en ligne

1. **Serveur** : Debian ou Ubuntu récent, 4 Go de mémoire, chez un hébergeur européen (ADR-0008). Installer Docker Engine et le plugin Compose, ouvrir les ports 22, 80 et 443 (pare-feu).
2. **Domaine** : faire pointer le nom choisi (enregistrements A et AAAA) vers l'adresse du serveur, avant le premier démarrage, pour que Caddy obtienne le certificat.
3. **Code** : cloner le dépôt sur le serveur (`git clone`, branche `main`).
4. **Secrets** : `cp infra/production/.env.example infra/production/.env`, puis remplacer chaque valeur. Générer `POSTGRES_MOT_DE_PASSE`, `SEL_EMPREINTES` et `CLE_CHIFFREMENT` avec la commande indiquée dans le fichier ; l'API refuse de démarrer avec les secrets de développement. `chmod 600 infra/production/.env`.
5. **E-mails** : renseigner `SMTP_URL` avec les accès d'un service transactionnel (Brevo, Scaleway TEM, Mailjet) et déclarer le domaine d'envoi chez lui (SPF, DKIM).
6. **Démarrage** :
   ```bash
   docker compose -f infra/production/compose.yml --env-file infra/production/.env up -d --build
   ```
7. **Vérification** : `https://<domaine>/api/health` répond `{"statut":"ok","baseDeDonnees":"ok"}`, la page d'accueil s'affiche, un e-mail de contact arrive.
8. **Données de démonstration** (préproduction seulement) : renseigner d'abord `MOT_DE_PASSE_DEMO` (16 caractères au moins, propre au serveur). Le mot de passe écrit dans le dépôt est public : la commande le refuse en préproduction, car il ouvrirait les comptes de modération et d'administration de la démonstration.
   ```bash
   docker compose -f infra/production/compose.yml --env-file infra/production/.env run --rm api node dist/db/demo/index.js
   ```
   Les comptes sont `<pseudo>@example.test` (par exemple `clarisse-mendy@example.test`) avec ce mot de passe.
9. **Premier administrateur** : s'inscrire sur le site (avec un code d'invitation pendant la bêta, voir ci-dessous), puis donner le rôle dans la base :
   ```bash
   docker compose -f infra/production/compose.yml --env-file infra/production/.env exec postgres \
     psql -U vysora -d vysora -c "update utilisateur set role = 'ADMINISTRATEUR' where pseudo = 'votre-pseudo'"
   ```
   L'administration (`/admin/roles`) donne ensuite les autres rôles. La double authentification est demandée à la première connexion.

## Bêta fermée : codes d'invitation

Avec `INSCRIPTION_SUR_INVITATION=true`, l'inscription demande un code. Les administrateurs les créent dans `/admin/invitations` ; le tout premier se crée en ligne de commande :

```bash
docker compose -f infra/production/compose.yml --env-file infra/production/.env run --rm api node dist/db/invitations.js 5
```

## Mise à jour

```bash
git pull
docker compose -f infra/production/compose.yml --env-file infra/production/.env up -d --build
```

Les migrations passent avant le redémarrage de l'API ; une migration qui échoue laisse l'ancienne API arrêtée et la nouvelle non démarrée (`docker compose … logs migration`).

## Exploitation

- Journaux : `docker compose … logs -f api` (JSON, niveau `LOG_LEVEL`), `logs -f caddy` pour les accès.
- Sauvegardes : à mettre en place avec OPS-02 (base **et** volume `stockage`). En attendant, `docker compose … exec postgres pg_dump -U vysora vysora > sauvegarde.sql`.
- Supervision : OPS-03.
