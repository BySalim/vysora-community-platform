# ADR-0012 — Licence : PolyForm Strict 1.0.0

Statut : Acceptée · Date : 2026-11-17

## Contexte

Le dépôt est public sur GitHub et n'avait pas de licence. Sans licence, le droit d'auteur réserve déjà tous les droits, mais rien ne le dit : un visiteur peut croire le code libre de réutilisation. Vysora est une idée originale, en préproduction sur vysora.site avant son ouverture publique ; ses auteurs veulent garder la main sur le code, l'interface et le nom, avec un modèle de licence reconnu, rédigé en anglais, plutôt qu'un texte écrit pour l'occasion.

Le choix est asymétrique : on peut ouvrir le code plus tard, à tout moment, mais une version publiée sous licence libre le reste ; ce droit ne se reprend pas. MIT (tout permis, y compris copier, renommer, héberger et vendre) et AGPL-3.0 (open source, code des versions hébergées à publier) ont été écartés pour cette raison ; PolyForm Noncommercial aussi, parce qu'il permet un clone gratuit modifié.

## Décision

- **[PolyForm Strict 1.0.0](https://polyformproject.org/licenses/strict/1.0.0)** dans `LICENSE`, texte officiel inchangé (dépôt `polyformproject/polyform-licenses`, version `1.0.0`), précédé d'une ligne `Required Notice:` au nom de Salim ([@BySalim](https://github.com/BySalim)) et Kine ([@kinnnisss](https://github.com/kinnnisss)), équipe 3kS_ItUs de HaTlaCha, comme les mentions légales du site.
- **Permis** : tout usage non commercial (consulter, étudier, lancer le projet pour l'évaluer, usage par un organisme non lucratif ou public). **Interdit** sans accord : modifier, créer une œuvre dérivée, redistribuer, tout usage commercial. Aucun droit sur le nom ni les logos (« These terms do not imply any other licenses »).
- **Éléments tiers exclus**, chacun sous sa licence, annoncés en tête de `LICENSE` : polices Montserrat (OFL), logos des outils d'IA (Lobe Icons, MIT), photographies (Unsplash), dépendances.
- PolyForm Strict n'a pas d'identifiant SPDX : les `package.json` portent `"license": "SEE LICENSE IN LICENSE"` (`../../LICENSE` dans les paquets de l'espace de travail).

## Conséquences

- La licence et les mentions légales (« Le nom Vysora, son logo et l'interface du site appartiennent à 3kS_ItUs ») vont dans le même sens.
- GitHub ne reconnaît pas ce modèle : la page du dépôt affiche une licence « Other » ; le README la nomme et la résume.
- Une organisation non lucrative pourrait faire tourner une copie non modifiée : c'est un usage permis par le modèle, accepté.
- Ouvrir le code plus tard (AGPL-3.0, MIT…) demande l'accord des deux titulaires, et de toute personne extérieure dont une contribution aurait été intégrée, puis une nouvelle note qui remplace celle-ci.
- La licence protège le code, les textes et le design, pas l'idée. Le nom se protège par un dépôt de marque (OAPI pour le Sénégal), distinct de la licence.
- Un nouvel élément tiers ajoute ses crédits (`credits.json` ou fichier de licence) et, s'il est d'un genre nouveau, la note de tête de `LICENSE` et les crédits des mentions légales.
