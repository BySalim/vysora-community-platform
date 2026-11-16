# ADR-0010 — Une démo dans le prototype avant toute évolution d'une vue

Statut : Acceptée · Date : 2026-11-16

## Contexte

Le prototype (`prototype/`) a été copié du dépôt `vysora` au commit `39408ff` (19 octobre 2026), en lecture seule : il devait évoluer dans son dépôt, puis être recopié ici. Depuis, le porteur du projet ne le modifie plus, et le développement l'a dépassé : écrans de modération et d'administration conçus directement dans le site puis validés après coup, fenêtre de consentement aux cookies, barre de défilement, écrans de la double authentification, corrections d'interface. Le prototype ne montre plus le produit, et chaque nouvel écran se découvre une fois codé, avec l'API et la base.

## Décision

- Le prototype vit et évolue désormais **dans ce dépôt**. Le dépôt `vysora` n'en est plus la source ; ses documents et ses skills restent des références.
- **Démo d'abord** : toute évolution d'une vue (page, écran, composant visible, état, interaction, texte affiché) commence par une démonstration dans `prototype/`, faite avec les règles du prototype (HTML, CSS et JavaScript natifs, données et états simulés, panneau Tweaks pour les états ; voir [`prototype/README.md`](../../prototype/README.md)). Elle est proposée au porteur du projet ; elle n'est implémentée dans `apps/web` (et `apps/api` au besoin) **qu'après sa validation**, notée dans le registre.
- Échappent à la démo : le portage d'un comportement que le prototype montre déjà, un changement sans effet visible, une correction urgente (sécurité, page cassée), reportée dans le prototype aussitôt après.
- Le prototype est remis à niveau du site réel (inventaire des écarts, PROTO-01 du registre), pour redevenir la référence complète.

## Conséquences

- Le porteur du projet valide sur une démo qui se modifie en quelques minutes, sans base ni API ; les sessions suivantes trouvent dans le prototype tout ce que le site montre.
- Deux rendus à tenir : une démo validée qui modifie une feuille de style reprise par le site se recopie à l'identique dans `apps/web/src/styles/` (la règle « fichiers identiques » de [`conventions.md`](../conventions.md) demeure) ; une feuille propre au site (`*-complements.css`, `moderation.css`…) se recopie de même dans le prototype.
- Un écart volontaire entre la démo validée et le site (donnée qui n'existe pas, règle de l'API) se note dans « Écarts au prototype » du registre, comme pour le portage.
