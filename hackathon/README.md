# Documents du hackathon

> Fichier interne, jamais envoyé au jury. Il fixe le cadre commun des documents de ce dossier : ce que chacun doit accomplir, qui le tient, comment les versions avancent et ce qui a été envoyé.

## Le hackathon

- Thème : « Construire la plateforme d'échange africaine, pour les devs, par les devs ».
- Le règlement autorise le développement assisté par l'IA.
- Le jury n'a pas accès au code par défaut ; il peut demander à le voir.

## Les documents

| Fichier | Objectif | Quand | Tenu par |
|---|---|---|---|
| `01-fiche-projet.md` | Donner envie d'en savoir plus, en une minute | Maintenant | `hackathon-presentation` |
| `02-dossier-presentation.md` | Permettre au jury d'évaluer le projet sans l'équipe : problème, solution, réponse au thème, viabilité | Maintenant, puis mis à jour | `hackathon-presentation` |
| `03-gestion-de-projet.md` | Montrer comment le projet est mené, ce qui est fait et ce qui vient | Maintenant, puis à chaque étape | `hackathon-technique` |
| `04-note-technique.md` | Prouver la qualité du travail sans ouvrir le dépôt ; un lecteur qui s'arrête à la première page en retient l'essentiel | Maintenant, puis mise à jour | `hackathon-technique` |
| `05-guide-demonstration.md` | Faire réussir au jury son essai de la plateforme | À la fin, préproduction figée | `hackathon-presentation` |

Repères de longueur : une page pour la fiche, six à huit pour le dossier, une à deux pour le guide. Ce sont des repères, pas des limites : un document fait la longueur que son objectif demande, ni plus ni moins.

Hors de ce dossier, le `README.md` du dépôt est à revoir à la fin, pour le cas où le jury demanderait le code.

## Qui dit quoi

Chaque sujet a un seul document de référence ; les autres y renvoient au lieu de le répéter.

| Sujet | Document de référence | Ailleurs |
|---|---|---|
| Vision, problème, solution, réponse au thème | Dossier (02) | Fiche (01) : en quelques lignes |
| Ce que le jury peut voir et essayer | Dossier (02) | Guide (05) : comment y accéder |
| Avancement détaillé, étapes franchies, prochaines étapes datées | Gestion de projet (03) | Dossier (02) : vision et perspectives, sans dates |
| Développement assisté par l'IA | Gestion de projet (03) : organisation du travail · Note technique (04) : garde-fous de qualité | Pas dans la fiche ni le dossier |
| Architecture, sécurité, qualité du code | Note technique (04) | Nulle part ailleurs |
| Équipe | Dossier (02) : qui vous êtes · Gestion de projet (03) : qui fait quoi | Fiche (01) : un nom et un contact |
| Accès et parcours de démonstration | Guide (05) | Nulle part ailleurs |

## Ce qu'aucun document ne contient

- Secret, identifiant, mot de passe, adresse ou détail du serveur, configuration. Les identifiants du jury partent à part, par message privé.
- Faille, chantier de sécurité en cours, point ouvert du registre.
- Donnée personnelle, en dehors du contact choisi par le porteur du projet.
- Passage recopié des documents produit (`docs/produit/`), qui sont confidentiels : on s'en inspire, on ne les reprend pas.
- Un futur présenté au présent : ce qui n'existe pas encore est une perspective, présentée comme telle.
- Les données de démonstration présentées comme réelles : les membres et contenus de la démonstration sont fictifs.
- Un chiffre, une date ou une fonctionnalité non vérifiés.

## Rédaction

- Français soigné, typographie française, vouvoiement du lecteur. Les règles propres à Vysora du guide de rédaction (`docs/produit/08-guide-redaction.md`, section 2) s'appliquent.
- Markdown simple (titres, listes, tableaux, images en chemin relatif) : la mise en forme finale vient à la fin.
- Images (captures, schémas) dans `hackathon/images/`.

## Versions

- Le nom d'un fichier ne change pas ; son historique est dans Git.
- Chaque document commence par un en-tête : version, date, statut (À rédiger, Brouillon, Prêt à envoyer, Envoyé).
- 0.x : brouillon jamais envoyé · 1.0 : premier envoi · 1.1 : correction (coquille, chiffre) · 2.0 : évolution (nouvelle fonctionnalité, thème approfondi, étape franchie).
- Une version envoyée ne se modifie plus : tout changement ouvre la version suivante.
- Un document renvoyé commence par « Nouveautés de cette version », en deux ou trois lignes.
- Le statut « Envoyé » est posé par le porteur du projet au moment de l'envoi, avec une ligne dans le journal ci-dessous et une étiquette Git `hackathon-<numéro>-v<version>` (par exemple `hackathon-02-v1.0`).
- Le fichier mis en forme porte sa version dans son nom : `Vysora-Dossier-de-presentation-v1.1.pdf`.

## Chiffres de référence

Les chiffres cités par plusieurs documents se tiennent ici, datés et sourcés, pour que tous disent la même chose. `hackathon-technique` les vérifie et les met à jour ; les autres documents les reprennent tels quels.

Aucun chiffre consigné pour l'instant.

## Avant un envoi

- En-tête à jour ; « Nouveautés de cette version » s'il s'agit d'un renvoi.
- Chiffres identiques à ceux de ce fichier.
- Document relu contre « Ce qu'aucun document ne contient ».
- Pour le guide : préproduction en ligne, données de démonstration chargées, compte du jury essayé le jour même.
- Journal des envois complété et étiquette Git posée.

## Journal des envois

| Date | Document | Version | Destinataire et canal |
|---|---|---|---|

Aucun envoi pour l'instant.

## Les agents

Deux agents (`.claude/agents/`) rédigent et mettent à jour ces documents ; on les appelle pour tout travail sur l'un d'eux.

- `hackathon-presentation` : fiche projet, dossier de présentation, guide de démonstration.
- `hackathon-technique` : gestion de projet, note technique, chiffres de référence.

Ils ne modifient que leurs propres documents (et `hackathon/images/`), ne committent pas et n'envoient rien. Ce que seul le porteur du projet peut donner, ils le demandent au lieu de l'inventer. Ce fichier est tenu par la session qui les appelle, à l'exception des chiffres de référence.
