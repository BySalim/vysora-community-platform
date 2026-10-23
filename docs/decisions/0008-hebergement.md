# ADR-0008 — Hébergement : un serveur en Europe, Docker Compose

Statut : Proposée, à valider par le porteur du projet · Date : 2026-10-23

## Contexte

Coûts minimaux (C-03, ENF-10), données personnelles protégées (C-05 : RGPD si des résidents de l'UE utilisent le service, loi du pays d'établissement), disponibilité cible de 99,5 % (ENF-08), équipe réduite.

## Décision proposée

- Un serveur virtuel chez un hébergeur européen (Hetzner, Scaleway ou OVHcloud), 4 Go de mémoire pour commencer.
- Docker Compose : Caddy (HTTPS automatique, `/api` → API, le reste → site), site, API, PostgreSQL, sauvegardes chiffrées quotidiennes vers un stockage objet.
- E-mails par un service transactionnel européen (Brevo, Scaleway TEM, Mailjet) ; images sur disque puis stockage objet.
- Une préproduction identique, plus petite, pour la bêta et les vérifications.

## Conséquences

- Coût de l'ordre de 10 à 25 € par mois au démarrage.
- Exploitation à documenter (procédure de déploiement, restauration testée, supervision).
- Passage à une base gérée ou à plusieurs serveurs possible sans changer le code.
