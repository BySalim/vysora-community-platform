# ADR-0008 — Hébergement : un serveur en Europe, Docker Compose

Statut : Proposée, à valider par le porteur du projet · Date : 2026-10-23

## Contexte

Coûts minimaux (C-03, ENF-10), données personnelles protégées (C-05 : RGPD si des résidents de l'UE utilisent le service, loi du pays d'établissement), disponibilité cible de 99,5 % (ENF-08), équipe réduite.

## Décision proposée

- Un serveur virtuel chez un hébergeur européen (Hetzner, Scaleway ou OVHcloud), 4 Go de mémoire pour commencer.
- Docker Compose : Caddy (HTTPS automatique, `/api` → API, le reste → site), site, API, PostgreSQL, sauvegardes chiffrées quotidiennes vers un stockage objet.
- E-mails par un service transactionnel européen (Brevo, Scaleway TEM, Mailjet) ; images sur disque puis stockage objet.
- Une préproduction identique, plus petite, pour la bêta et les vérifications.

## Choix réels de la préproduction (constat du 2026-11-09, hébergeur corrigé le 2026-11-15)

- Serveur virtuel loué à **Systalink** (Systalink Sénégal, Dakar), qui gère aussi le DNS du domaine. Le serveur est dans un centre de données de **Francfort** (Allemagne) : son adresse IP appartient au réseau `UPCLOUD-DE-FRA1-NET` du registre RIPE, UpCloud étant le fournisseur de Systalink pour ce centre de données. Hébergeur africain, mais données dans l'Union européenne, comme le visait cette décision.
- E-mails : **Brevo** (France, données dans l'Union européenne), offre gratuite. Boîte de l'équipe : **Zoho Mail**, offre gratuite, sur le centre de données américain de Zoho : seul traitement hors de l'Union, annoncé par la politique de confidentialité (voir le registre, « Points à trancher »).
- Ces prestataires sont nommés dans les mentions légales et la politique de confidentialité : un changement d'hébergeur ou de service d'e-mail demande de mettre ces pages à jour (et une nouvelle version de la politique depuis l'administration).

## Conséquences

- Coût de l'ordre de 10 à 25 € par mois au démarrage.
- Exploitation à documenter (procédure de déploiement, restauration testée, supervision).
- Passage à une base gérée ou à plusieurs serveurs possible sans changer le code.
