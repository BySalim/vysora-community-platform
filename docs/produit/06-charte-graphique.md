# CHARTE GRAPHIQUE — VYSORA

> **Statut :** document de référence visuelle  
> **Version :** 1.1 — ajout des règles d'interface validées sur la page d'accueil  
> **Objectif :** définir les règles graphiques communes à l’écosystème VYSORA et à ses supports numériques.

---

## 1. Identité visuelle

VYSORA adopte une identité visuelle **moderne, claire, cohérente et professionnelle**. Elle doit inspirer la confiance, faciliter la lecture et donner une impression de simplicité, de collaboration et d’innovation.

La charte graphique reste celle définie pour VYSORA, même si le concept du produit évolue. Les nouvelles fonctionnalités et les nouveaux supports doivent donc s’y conformer plutôt que créer une identité visuelle indépendante.

### Principes directeurs

- **Clarté :** l’information doit être immédiatement compréhensible.
- **Sobriété :** éviter les effets décoratifs qui n’apportent pas de valeur.
- **Cohérence :** réutiliser les mêmes couleurs, typographies, espacements et composants.
- **Modernité :** privilégier une interface numérique actuelle et fonctionnelle.
- **Accessibilité :** assurer une bonne lisibilité et des contrastes suffisants.
- **Confiance :** présenter les contenus et les actions de manière prévisible.

---

## 2. Palette de couleurs

La palette principale repose sur trois couleurs : **blanc, bleu et noir**. Les teintes secondaires servent uniquement à structurer l’interface et à distinguer les états fonctionnels.

### Couleurs principales

| Rôle | Couleur | Code HEX | Utilisation |
|---|---|---|---|
| Fond principal | Blanc | `#FFFFFF` | Fond des pages et des surfaces principales |
| Bleu principal | Bleu | `#2563EB` | Boutons principaux, liens, éléments actifs et accents |
| Bleu interactif | Bleu foncé | `#1D4ED8` | Survol et état actif des éléments bleus |
| Bleu pâle | Bleu très clair | `#EFF6FF` | Fonds légers, sélections et mises en évidence |
| Texte principal | Noir | `#000000` | Titres et textes qui doivent ressortir fortement |
| Texte courant | Noir doux | `#171717` | Paragraphes, descriptions et contenu de l’interface |

### Couleurs neutres complémentaires

| Rôle | Code HEX | Utilisation |
|---|---|---|
| Fond secondaire | `#F5F5F5` | Sections secondaires et zones de regroupement |
| Bordure | `#E5E5E5` | Séparateurs, contours de champs et de cartes |
| Texte secondaire | `#737373` | Métadonnées, aides et informations moins prioritaires |

### Règles d’utilisation

- Le **blanc** est le fond dominant de l’interface.
- Le **bleu** attire l’attention sur les actions importantes et les éléments interactifs.
- Le **noir** assure la hiérarchie et la lisibilité des textes.
- Les fonds bleus pâles sont réservés aux mises en évidence discrètes.
- Ne pas introduire de dégradés, de couleurs néon ou de nouvelles couleurs décoratives. Seuls les voiles de lisibilité posés sur une photo sont admis (voir section 13.11).
- Les couleurs d’état (succès, avertissement, erreur) peuvent être utilisées avec parcimonie lorsqu’elles sont nécessaires à la compréhension d’une action.
- Vérifier le contraste entre le texte et son arrière-plan, en particulier pour les petits textes et les boutons.

---

## 3. Typographie

La charte utilise deux familles typographiques complémentaires.

| Famille | Rôle |
|---|---|
| **Montserrat Alternates** | Identité de marque, nom VYSORA et titres importants |
| **Montserrat** | Texte courant, navigation, formulaires, boutons, tableaux et composants d’interface |

### Hiérarchie recommandée

| Élément | Recommandation |
|---|---|
| Titre principal de page | Montserrat Alternates, graisse forte |
| Titres de section | Montserrat Alternates, semi-gras ou gras |
| Sous-titres | Montserrat, semi-gras |
| Texte courant | Montserrat, régulier |
| Boutons et navigation | Montserrat, moyen ou semi-gras |
| Métadonnées et aides | Montserrat, taille réduite mais lisible |

**Solution de remplacement :** si Montserrat Alternates n’est pas disponible dans l’environnement utilisé, employer Montserrat pour les titres et le texte courant afin de conserver une apparence cohérente.

Ne pas multiplier les familles typographiques. Utiliser la graisse et la taille pour créer la hiérarchie, plutôt que d’ajouter de nouvelles polices.

---

## 4. Mise en page et espacements

- Privilégier une mise en page aérée, avec des zones de contenu clairement séparées.
- Utiliser une grille cohérente et des alignements réguliers.
- Conserver des marges et des espacements constants entre les composants.
- Éviter les pages surchargées et les longues zones de texte sans hiérarchie.
- Limiter la largeur des paragraphes pour préserver le confort de lecture.
- Prévoir une mise en page responsive adaptée aux ordinateurs, tablettes et téléphones.
- Utiliser les espaces blancs pour guider le regard, sans ajouter de décoration inutile.

### Conteneurs et cartes

- Les cartes doivent organiser des informations liées, et non décorer la page.
- Délimiter un bloc par un fond teinté, une ombre douce ou une bordure fine, sur un seul niveau (voir section 13.1).
- Employer des rayons de bordure cohérents sur l’ensemble du produit.
- Réserver les ombres aux cas où elles clarifient réellement la superposition des éléments.
- Garder les fonds principalement blancs ou neutres.

---

## 5. Boutons et éléments interactifs

### Bouton principal

- Fond bleu `#2563EB`.
- Texte blanc.
- Libellé court, précis et orienté vers l’action.
- État de survol ou actif en bleu foncé `#1D4ED8`.

### Bouton secondaire

- Fond blanc ou neutre.
- Texte noir ou bleu selon l’importance de l’action.
- Bordure discrète lorsque cela facilite l’identification du bouton.

### Liens

- Utiliser le bleu principal pour les liens.
- Prévoir un état de survol visible.
- Ne pas utiliser le bleu uniquement comme décoration si l’élément n’est pas interactif.

### États d’interface

Tous les éléments interactifs doivent présenter des états cohérents : repos, survol, focus clavier, actif, chargement, désactivé et erreur, selon le contexte. Le focus clavier doit rester visible.

---

## 6. Formulaires et saisie

- Utiliser des libellés explicites au-dessus des champs lorsque possible.
- Ne pas s’appuyer uniquement sur un texte indicatif à l’intérieur du champ pour expliquer son rôle.
- Présenter les erreurs près du champ concerné, avec une explication claire.
- Distinguer visuellement les champs obligatoires et facultatifs.
- Garder les formulaires simples et divisés en étapes uniquement si cela facilite réellement la tâche.
- Préserver les valeurs saisies en cas d’erreur lorsque c’est possible.

---

## 7. Iconographie et illustrations

- Utiliser un style d’icônes homogène, simple et lisible.
- Préférer des icônes fonctionnelles plutôt que décoratives.
- Conserver une taille et une épaisseur de trait cohérentes.
- Accompagner les icônes peu évidentes d’un libellé ou d’une aide.
- Éviter de mélanger plusieurs styles d’illustration dans une même interface.
- Ne pas employer une illustration si elle ne contribue pas à expliquer le contenu ou l’action.

---

## 8. Logo et nom de marque

- Respecter le logo VYSORA dans sa version de référence lorsqu’il est disponible.
- Ne pas déformer le logo, modifier ses proportions ou lui appliquer des effets non prévus.
- Conserver une zone de respiration autour du logo.
- Utiliser la palette officielle pour les déclinaisons.
- Ne pas créer de nouveau logo ou de symbole alternatif sans décision explicite sur l’identité de marque.
- Le nom **VYSORA** doit être écrit de manière cohérente sur tous les supports.

*Le fichier source du logo, ses variantes officielles et ses règles exactes de zone de protection ne sont pas définis dans ce document ; ils devront être ajoutés lorsqu’ils seront disponibles.*

---

## 9. Ton visuel et contenu

L’interface doit paraître accueillante, sérieuse et accessible. Elle doit privilégier des messages clairs et compréhensibles.

- Employer des titres descriptifs.
- Utiliser des libellés d’action explicites.
- Éviter les effets visuels qui détournent l’attention du contenu.
- Mettre en évidence une action principale par zone lorsque cela est pertinent.
- Ne pas faire passer une fonctionnalité future pour une fonctionnalité déjà disponible.
- Maintenir une présentation cohérente entre les pages publiques, les espaces connectés et les outils d’administration.

---

## 10. Responsive et accessibilité

- Concevoir d’abord une structure claire, puis l’adapter aux différentes tailles d’écran.
- Sur mobile, privilégier une navigation simple, des boutons suffisamment grands et des contenus lisibles.
- Ne pas transmettre une information uniquement par la couleur.
- Prévoir des contrastes suffisants, des libellés explicites et un focus clavier visible.
- Utiliser une structure de titres logique.
- Ajouter des textes alternatifs pertinents aux images informatives.
- Respecter les préférences de réduction des animations si des animations sont introduites.

---

## 11. Cohérence entre les supports

Cette charte s’applique notamment :

- au site vitrine ;
- à l’application web ;
- aux tableaux de bord ;
- aux pages de connexion et d’inscription ;
- aux formulaires et aux espaces de profil ;
- aux notifications et aux messages d’interface ;
- aux pages d’administration ;
- aux présentations, maquettes et supports de communication numériques.

Toute nouvelle interface doit réutiliser les mêmes tokens visuels et composants autant que possible.

---

## 12. Tokens de référence

Ces valeurs peuvent servir de base à un système de design ou à des variables CSS.

```css
:root {
  /* Couleurs principales */
  --color-background: #FFFFFF;
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-soft: #EFF6FF;
  --color-text: #000000;
  --color-text-body: #171717;

  /* Neutres */
  --color-surface-secondary: #F5F5F5;
  --color-border: #E5E5E5;
  --color-text-muted: #737373;

  /* Sections sombres */
  --color-night: #0A0A0A;
  --color-night-surface: #131313;
  --color-night-surface-2: #1C1C1C;
  --color-night-panel: #141414;
  --color-night-border: #2A2A2A;

  /* Panneaux clairs */
  --color-panel: #F4F5F7;

  /* États */
  --color-success: #15803D;
  --color-success-soft: #F0FDF4;
  --color-warning: #B45309;
  --color-warning-soft: #FFFBEB;
  --color-error: #B91C1C;

  /* Visualisation de données : catégories, dans cet ordre */
  --color-data-1: #2563EB;
  --color-data-2: #EB6834;
  --color-data-3: #1BAF7A;
  --color-data-4: #EDA100;

  /* Typographie */
  --font-heading: "Montserrat Alternates", "Montserrat", sans-serif;
  --font-body: "Montserrat", sans-serif;

  /* Formes — valeurs de départ à harmoniser dans le système de design */
  --radius-control: 8px;
  --radius-card: 12px;
}
```

Dans `prototype/styles.css`, ces valeurs portent les noms `--night`, `--night-2`, `--night-3`, `--night-border`, `--panel`, `--green-700`, `--green-50`, `--amber-700`, `--amber-50` et `--red-700`. Les couleurs de données sont définies dans `prototype/app.js` (`MIX_COLORS`).

---

## 13. Règles d'interface validées

Ces règles ont été établies lors de la conception de la page d'accueil du prototype (`prototype/index.html`). Elles s'appliquent à toutes les pages et complètent les sections précédentes.

### 13.1 Délimitation des blocs

- Un seul niveau de délimitation : un bloc encadré ne contient jamais d'éléments eux-mêmes encadrés.
- Préférer un fond teinté ou une ombre douce à un contour. Séparer les lignes d'une liste par des filets fins.
- Varier les formes selon le contenu : listes à filets, grilles, texte précédé d'une icône, bulles de conversation, photo pleine largeur. Ne pas tout présenter en cartes à bord arrondi.
- Reprendre les formes des vrais produits : historique de conversation, choix au clavier, vue avant/après annotée, courbe avec réticule, tableau de compatibilité, onglets en rail.

### 13.2 Étiquettes et pastilles

- Les types de création (« 1 prompt », « Itération », « Projet ») et les catégories s'affichent en texte simple, précédé d'une icône dédiée.
- Icônes de type, dans le sprite SVG de `prototype/index.html` : `i-type-prompt`, `i-type-iteration`, `i-type-projet`.
- Les pastilles (fond ou contour arrondi autour d'un libellé) sont réservées aux filtres actifs et aux contrôles.
- Dans un catalogue d'outils, les noms s'affichent sans pastille ni nombre de créations.

### 13.3 Motifs à éviter

Ces motifs donnent l'impression d'une interface générée automatiquement :

- intertitres numérotés en capitales (« 01 LE CONSTAT ») ;
- petits libellés en capitales espacées (« RÉPONSE DE L'IA ») ;
- encadrés avec une barre colorée à gauche ;
- cartes « icône dans un carré, titre, paragraphe » répétées ;
- statuts présentés en blocs teintés vert ou ambre ;
- histogrammes génériques ;
- icône en losange ;
- étincelles décoratives.

### 13.4 Intertitres de section

- Au-dessus du titre de section : une icône liée au sujet, suivie d'un libellé court en casse normale, dans la couleur d'accent.
- Variante « Filet », disponible dans le panneau Tweaks : filet fin au-dessus du libellé, petit anneau d'accent à la place de l'icône.

### 13.5 Personnes

- Une personne est toujours représentée par une photo de profil ronde, jamais par des initiales.
- Portraits dans `prototype/assets/avatars` (Unsplash, crédits dans `credits.json`), associés aux noms dans `prototype/data.js` (`avatars`).

### 13.6 Outils d'IA

- Chaque mention d'un outil affiche son logo officiel à côté de son nom : cartes, fil d'activité, configurations, questions du forum.
- Logos SVG Lobe Icons (licence MIT) dans `prototype/assets/logos-ia`, sources dans `credits.json`. Sur les sections sombres ou bleues, les logos monochromes passent en blanc.
- Catalogue de référence dans `prototype/data.js` (`tools`, `toolFamilies`) : 64 outils en 6 familles.

| Famille | Outils |
|---|---|
| Assistants | 22 |
| Image | 11 |
| Vidéo | 9 |
| Audio | 4 |
| Code | 13 |
| Automatisation | 5 |

Tout nouvel outil est ajouté à ce catalogue avec son logo.

### 13.7 Icône « moment clé »

- Un moment clé est représenté par un point de bascule sur un trajet (symbole `i-moment`), qui remplace l'icône en losange.
- Tracé SVG, grille de 24 × 24 :

```svg
<path d="M2.5 17.5h4.6"/><circle cx="10" cy="17.5" r="2.9"/><path d="m12.2 15.3 8-8"/><path d="M14.8 7.3h5.4v5.4"/>
```

- Dans les schémas de parcours, un moment clé est un anneau : cercle blanc, contour bleu `#2563EB` épais (4 px).

### 13.8 Badges de réputation

- Les badges sont des emblèmes hexagonaux, jamais des tuiles ni des pastilles.
- Le critère d'obtention s'affiche au survol et au focus clavier.

| Ton | Fond | Anneau | Icône |
|---|---|---|---|
| Bleu | `#DBEAFE` | `#60A5FA` | `#1D4ED8` |
| Vert | `#DCFCE7` | `#4ADE80` | `#15803D` |
| Ambre | `#FEF3C7` | `#F59E0B` | `#B45309` |
| Encre | `#E5E5E5` | `#737373` | `#171717` |

### 13.9 Couleurs complémentaires

Ces couleurs complètent la palette de la section 2. Elles ne servent pas de décoration.

| Rôle | Code HEX | Utilisation |
|---|---|---|
| Fond sombre | `#0A0A0A` | Sections contrastées et pied de page |
| Surfaces sombres | `#131313`, `#1C1C1C` | Blocs posés sur une section sombre |
| Panneau sombre | `#141414` | Panneaux des sections sombres |
| Filet sombre | `#2A2A2A` | Séparateurs sur fond sombre |
| Texte sur fond sombre | `#FFFFFF`, `#E5E5E5`, `#A3A3A3` | Titres, texte courant, texte secondaire |
| Accent sur fond sombre | `#93C5FD`, `#60A5FA` | Liens et focus, mots mis en valeur dans les titres |
| Panneau clair | `#F4F5F7` | Panneaux, schémas et zones de regroupement sur fond blanc |
| Succès | `#15803D` sur `#F0FDF4` | Confirmation d'une action, reproduction réussie |
| Avertissement | `#B45309` sur `#FFFBEB` | Information à vérifier, obsolescence |
| Erreur | `#B91C1C` | Message d'erreur, échec |

Le panneau clair `#F4F5F7` se distingue du fond secondaire `#F5F5F5` de la section 2 : il est réservé aux panneaux posés sur un fond blanc.

Les sections contrastées existent aussi en bleu (`#1D4ED8`) et en clair (`#F5F5F5`), à comparer dans le panneau Tweaks.

### 13.10 Visualisation de données

- Catégories : `#2563EB`, `#EB6834`, `#1BAF7A`, `#EDA100`, dans cet ordre. Cette suite a été vérifiée pour les principales formes de daltonisme.
- Sur les panneaux clairs, trois de ces couleurs restent sous un contraste de 3:1. Chaque série porte donc un libellé visible avec sa valeur, et un tableau accessible aux lecteurs d'écran reprend les données.
- Tendance : courbe dans la couleur d'accent, aire très légère, journée en cours en pointillé ; réticule et info-bulle au survol, valeurs parcourues au clavier avec les flèches.

### 13.11 Photos et voiles

- Grandes photos de fond : traitement bichrome bleu appliqué au fichier (ombres `#050B1C`, tons moyens `#1D4ED8`, hautes lumières `#8DB4FF`, mélange à 82 %).
- Un voile de lisibilité, clair ou sombre, est admis sur une photo lorsqu'un texte y est posé. Aucun dégradé décoratif.
- Images libres de droits (Unsplash, Pexels) placées dans `prototype/assets`, crédits dans le `credits.json` du dossier.
