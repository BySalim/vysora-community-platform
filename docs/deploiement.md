# Déploiement

> Mise en ligne d'une préproduction ou de la production (OPS-01, ADR-0008) : un serveur virtuel,
> Docker Compose, Caddy pour le HTTPS. Tout ce qu'il faut est dans le dépôt : `Dockerfile`,
> `infra/production/compose.yml`, `infra/production/Caddyfile`, `infra/production/.env.example`,
> `.github/workflows/images.yml`.

## Images construites par GitHub

Le serveur ne compile rien : après chaque vérification réussie de `main` (workflow « Vérification »), le workflow « Images » construit les images de l'API et du site et les publie dans le registre du dépôt, `ghcr.io/bysalim/vysora-api` et `ghcr.io/bysalim/vysora-web` (étiquettes `latest` et l'empreinte du commit). Le serveur les télécharge (`docker compose pull`). Installer les dépendances et compiler demande plus de 2 Go de mémoire ; faire tourner Vysora en demande environ 1,2 Go : un serveur de 2 Go suffit donc pour une démonstration ou une préproduction.

Réglages, une fois :

1. **Variable `DOMAINE` du dépôt** (GitHub, Settings › Secrets and variables › Actions › Variables) : le nom de domaine public sans `https://`, le même que dans le `.env` du serveur. Astro le grave dans l'image du site (liens absolus, adresse canonique) : en changer demande de relancer le workflow (onglet Actions › Images › Run workflow).
2. **Accès du serveur au registre** : les images d'un dépôt privé sont privées. Créer un jeton GitHub (classic) avec la seule permission `read:packages`, puis sur le serveur : `docker login ghcr.io -u <compte-github>` (le jeton sert de mot de passe). Si les images sont rendues publiques (GitHub, Packages › Package settings), cette étape est inutile.

Sans ces réglages, le serveur peut toujours construire lui-même les images (`IMAGE_API` et `IMAGE_WEB` vides, `up -d --build`), avec 4 Go de mémoire ou une mémoire d'échange.

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

1. **Serveur** : Debian ou Ubuntu récent, 2 Go de mémoire avec les images de GitHub (4 Go pour les construire sur le serveur), chez un hébergeur européen (ADR-0008). Installer Docker Engine et le plugin Compose, ouvrir les ports 22, 80 et 443 (pare-feu).
2. **Domaine** : faire pointer le nom choisi (enregistrements A et AAAA) vers l'adresse du serveur, avant le premier démarrage, pour que Caddy obtienne le certificat.
3. **Code** : cloner le dépôt sur le serveur (`git clone`, branche `main`) : seuls `infra/production/` (composition, Caddyfile, `.env`) servent quand les images viennent de GitHub. Se connecter au registre (`docker login ghcr.io`, voir plus haut).
4. **Secrets** : `cp infra/production/.env.example infra/production/.env`, puis remplacer chaque valeur. Générer `POSTGRES_MOT_DE_PASSE`, `SEL_EMPREINTES` et `CLE_CHIFFREMENT` avec la commande indiquée dans le fichier ; l'API refuse de démarrer avec les secrets de développement. `chmod 600 infra/production/.env`.
5. **E-mails** : renseigner `SMTP_URL` avec les accès d'un service transactionnel (Brevo, Scaleway TEM, Mailjet) et déclarer le domaine d'envoi chez lui (SPF, DKIM). Pièges rencontrés (préproduction, novembre 2026) :
   - l'identifiant SMTP de Brevo est une adresse (`1234567@smtp-brevo.com`), pas le nom du serveur ; dans `SMTP_URL`, son `@` s'écrit `%40` (de même `/`, `:` ou `@` dans la clé) : `smtps://1234567%40smtp-brevo.com:<clé>@smtp-relay.brevo.com:465` (port 465 chiffré) ;
   - un domaine n'a qu'**un** enregistrement SPF : on modifie la ligne `v=spf1 …` existante, on n'en ajoute pas ; de même un seul `_dmarc` ;
   - avec un DMARC strict (`p=reject`, `adkim=s`), seuls les envois signés DKIM au nom du domaine arrivent : les CNAME DKIM du service (chez Brevo, `brevo1._domainkey` et `brevo2._domainkey`) sont indispensables ;
   - l'expéditeur (`EMAIL_EXPEDITEUR`) n'a pas besoin d'une boîte réelle ; l'adresse de l'équipe (`EMAIL_EQUIPE`) en demande une, car elle reçoit le formulaire de contact et les réponses ;
   - couper dans le service le suivi des ouvertures et des clics : il réécrirait les liens de confirmation et de réinitialisation, et la politique de confidentialité ne l'annonce pas.
6. **Démarrage** : vérifier que le workflow « Images » a réussi (onglet Actions du dépôt), puis :
   ```bash
   docker compose -f infra/production/compose.yml --env-file infra/production/.env pull
   ```
   ```bash
   docker compose -f infra/production/compose.yml --env-file infra/production/.env up -d
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

## Connexion avec GitHub et Google

Facultative : sans identifiants, le service reste fermé et son bouton le dit. Chaque serveur (développement, préproduction, production) a ses propres applications, car l'adresse de retour change. Les identifiants vont dans le `.env` (racine du dépôt en développement, `infra/production/.env` sur un serveur), puis l'API est relancée (`docker compose … up -d`).

- **GitHub** : Settings › Developer settings › OAuth Apps › New OAuth App. *Homepage URL* : `https://<domaine>` ; *Authorization callback URL* : `https://<domaine>/api/v1/auth/github/retour` (en développement : `http://localhost:4321/api/v1/auth/github/retour`). Puis « Generate a new client secret » : `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET`. Une application GitHub n'accepte qu'une adresse de retour : une par serveur.
- **Google** : Google Cloud Console › API et services. D'abord l'écran de consentement (nom « Vysora », adresse de contact, liens vers `/cgu` et `/confidentialite`, domaine autorisé, portées `openid` et `email` seulement), puis Identifiants › ID client OAuth › Application Web, avec comme URI de redirection autorisé `https://<domaine>/api/v1/auth/google/retour` (un même client peut aussi déclarer celui du développement, `http://localhost:4321/…`). `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`. Tant que Google n'a pas validé l'application, elle reste « en test » : seuls les comptes Gmail ajoutés à la liste des testeurs (100 au plus) peuvent se connecter.
- Vérification : `https://<domaine>/api/v1/services-externes` cite les services ouverts ; le bouton part vers le service et revient sur la page d'inscription (écran du pseudo) ou de connexion.

## Bêta fermée : codes d'invitation

Avec `INSCRIPTION_SUR_INVITATION=true`, l'inscription demande un code, y compris avec GitHub ou Google (il se saisit avant de choisir le service). Les administrateurs les créent dans `/admin/invitations` ; le tout premier se crée en ligne de commande :

```bash
docker compose -f infra/production/compose.yml --env-file infra/production/.env run --rm api node dist/db/invitations.js 5
```

## Mise à jour

Après l'envoi sur `main` et la réussite des workflows « Vérification » puis « Images » :

```bash
git pull
docker compose -f infra/production/compose.yml --env-file infra/production/.env pull
docker compose -f infra/production/compose.yml --env-file infra/production/.env up -d
```

Revenir à une version précédente : remplacer `latest` par l'empreinte du commit voulu dans `IMAGE_API` et `IMAGE_WEB`, puis `up -d` (une migration déjà passée ne se défait pas).

Les migrations passent avant le redémarrage de l'API ; une migration qui échoue laisse l'ancienne API arrêtée et la nouvelle non démarrée (`docker compose … logs migration`).

## Exploitation

- Journaux : `docker compose … logs -f api` (JSON, niveau `LOG_LEVEL`), `logs -f caddy` pour les accès.
- Sauvegardes : à mettre en place avec OPS-02 (base **et** volume `stockage`). En attendant, `docker compose … exec postgres pg_dump -U vysora vysora > sauvegarde.sql`.
- Supervision : OPS-03.
