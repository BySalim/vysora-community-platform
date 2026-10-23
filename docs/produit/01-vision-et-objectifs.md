# Vysora — Vision et objectifs

| Élément | Valeur |
|---|---|
| Projet | Vysora (plateforme) · Carnéo (outil de traçage du parcours, V2) |
| Document | 01 — Vision et objectifs |
| Version | 1.0 |
| Date | 11/10/2026 |
| Statut | Version de travail soumise à validation du porteur de projet |
| Classification | Confidentiel — diffusion restreinte à l'équipe projet |

---

## Sommaire

1. [Résumé](#1-résumé)
2. [Problème](#2-problème)
3. [Vision, mission et positionnement](#3-vision-mission-et-positionnement)
4. [Principes directeurs](#4-principes-directeurs)
5. [Objectifs](#5-objectifs)
6. [Périmètre et feuille de route](#6-périmètre-et-feuille-de-route)
7. [Hypothèses critiques à valider](#7-hypothèses-critiques-à-valider)
8. [Contraintes](#8-contraintes)
9. [Risques](#9-risques)
10. [Paysage concurrentiel](#10-paysage-concurrentiel)
11. [Décisions structurantes](#11-décisions-structurantes)
12. [Glossaire](#12-glossaire)
13. [Sources](#13-sources)

---

## 1. Résumé

**Vysora** est une plateforme communautaire et gratuite de partage et d'apprentissage sur l'IA générative.

Les membres y publient ce qu'ils ont créé avec l'IA, d'une génération en un seul prompt jusqu'à un logiciel complet construit sur plusieurs jours. Ils ne publient pas seulement le résultat, mais **tout le parcours** : prompts, outils, modèles, paramètres, résultats intermédiaires et **moments clés** (les endroits où le créateur a corrigé, refusé ou réorienté l'IA).

La communauté évalue ces créations, les **reproduit** avec ses propres outils, les commente et en discute dans un forum. Des formats d'apprentissage (Bon réflexe, Clinique du prompt, défis) aident les débutants à acquérir le jugement des experts. Statistiques, niveaux, badges et classements rendent la progression visible.

**Carnéo** est l'outil propre à Vysora qui retracera automatiquement le parcours d'un créateur pour lui éviter de tout saisir à la main. Il est prévu en V2 (voir [D-01](#11-décisions-structurantes)).

> **Ambition :** devenir la référence sur le prompting et la création avec l'IA.
>
> **Slogan :** Voir comment l'IA crée. Apprendre à créer avec elle.

---

## 2. Problème

### 2.1 Constat

| # | Constat | Conséquence |
|---|---|---|
| PB-01 | L'IA est massivement utilisée, mais la **méthode** de ceux qui l'utilisent bien reste invisible. Les créations circulent sur les réseaux sociaux sans paramètres, sans contexte et sans parcours. | On admire le résultat sans pouvoir apprendre comment il a été obtenu. |
| PB-02 | Le **fossé entre débutants et experts** se creuse. L'expert sait quand l'IA se trompe et la corrige ; le débutant fait confiance au résultat. | Les débutants avancent vite en apparence mais comprennent peu, et ne savent pas ce qui est bon à faire dans une situation donnée. |
| PB-03 | Le code et les contenus générés comportent des **risques réels** (failles de sécurité, données exposées, actions destructrices d'agents). | Des projets mis en ligne sans vérification exposent leurs auteurs et leurs utilisateurs. |
| PB-04 | Le savoir-faire est **dispersé et périssable** : réseaux sociaux, galeries de prompts, cours, forums généralistes. Les modèles évoluent en continu, et une astuce valable sur une version peut ne plus l'être sur la suivante. | Personne ne sait ce qui fonctionne encore, avec quel outil et quel modèle. |

### 2.2 Données qui étayent le constat

- **Usage et confiance** : selon l'enquête Stack Overflow 2025, 84 % des développeurs utilisent ou prévoient d'utiliser des outils d'IA, mais 46 % se méfient activement de la justesse de leurs réponses, contre 33 % qui leur font confiance. [S1]
- **Apprentissage** : dans un essai contrôlé randomisé mené par Anthropic auprès de 52 développeurs apprenant une nouvelle bibliothèque, le groupe assisté par l'IA a obtenu des scores inférieurs de 17 % à un quiz de compréhension. L'écart dépend fortement de la façon d'utiliser l'IA : de 65 à 86 % de réussite pour ceux qui l'utilisaient pour comprendre, de 24 à 39 % pour ceux qui lui déléguaient le travail. [S2]
- **Débutants** : une étude présentée à ICER 2024 montre que l'IA générative accélère les étudiants à l'aise, mais aggrave les difficultés métacognitives de ceux qui peinent, et en crée de nouvelles. [S3]
- **Sécurité** : Veracode a constaté que le code généré par plus de 100 modèles introduisait des failles de sécurité dans 45 % des cas testés (80 tâches). L'édition 2026 du rapport fait état d'un taux de réussite moyen aux tests de sécurité de 56 %, presque inchangé. [S4][S5]
- **Incidents** : en juillet 2025, l'agent IA de Replit a supprimé la base de production d'un utilisateur malgré un gel du code. Des milliers d'applications « vibe-codées » ont été trouvées exposant des données personnelles ou d'entreprise. [S6][S7]

### 2.3 Énoncé du problème

> Les personnes qui créent avec l'IA, en particulier les débutants, n'ont aucun endroit fiable où **voir comment les créateurs compétents travaillent réellement avec l'IA**, vérifier ce qui fonctionne encore et apprendre à juger les réponses de l'IA. Le savoir-faire reste dispersé, invisible et périssable, ce qui freine l'apprentissage et multiplie les erreurs coûteuses.

---

## 3. Vision, mission et positionnement

### 3.1 Vision

> Un monde où chacun peut voir comment l'IA est réellement utilisée pour créer, et apprendre à créer avec elle de manière efficace, sûre et responsable.

### 3.2 Mission

> Rendre visible, vérifiable et transmissible le savoir-faire de création avec l'IA, grâce à une communauté qui partage ses parcours et s'entraide.

### 3.3 Énoncé de positionnement

| | |
|---|---|
| **Pour** | les personnes qui créent avec l'IA, du débutant à l'expert, |
| **qui** | veulent apprendre ce qui fonctionne vraiment, ou faire reconnaître leur savoir-faire, |
| **Vysora est** | une plateforme communautaire de partage et d'apprentissage |
| **qui** | montre le parcours complet de vraies créations IA et permet à la communauté de les évaluer, de les reproduire et d'en discuter. |
| **Contrairement** | aux galeries de prompts, aux réseaux sociaux et aux cours en ligne, |
| **Vysora** | montre la méthode et pas seulement le résultat, avec des preuves (reproductions) et une date de fraîcheur pour chaque contenu. |

### 3.4 Les quatre piliers

| Pilier | Promesse |
|---|---|
| **Partager** | Publier ses créations avec leur parcours : prompts, outils, modèles, paramètres, résultats, moments clés. |
| **Apprendre** | Décortiquer des cas réels, s'entraîner à juger les réponses de l'IA, se faire aider sur ses propres prompts. |
| **Échanger** | Forum d'astuces, de questions et de retours d'expérience, évalués par la communauté. |
| **Progresser** | Réputation, niveaux, badges, statistiques et classements qui rendent la progression visible. |

---

## 4. Principes directeurs

Ces principes sont non négociables. Toute fonctionnalité qui en contredit un doit être revue.

| ID | Principe | Traduction concrète |
|---|---|---|
| PR-01 | **Le parcours avant le résultat** | Une création montre comment elle a été obtenue, pas seulement ce qu'elle est. Les moments clés sont mis en avant. |
| PR-02 | **Consentement explicite** | Rien n'est publié sans action explicite de l'auteur. Toute création commence en brouillon privé. |
| PR-03 | **Neutralité** | Tous les outils et modèles sont acceptés. Aucun n'est favorisé, et il n'y a aucun placement payant au MVP. |
| PR-04 | **Preuve et fraîcheur** | Chaque contenu indique outil, modèle et date. Les reproductions et les signalements d'obsolescence sont affichés. |
| PR-05 | **Apprendre plutôt que copier** | Les formats font réfléchir : moments clés, Bon réflexe, Clinique du prompt. |
| PR-06 | **Bienveillance** | Vysora est un espace sûr pour les débutants : pas de vote négatif au MVP et une charte communautaire appliquée. |
| PR-07 | **Gratuité et sobriété** | L'accès est gratuit. La plateforme n'appelle et n'exécute aucun modèle d'IA, donc zéro coût de tokens. Les membres reproduisent avec leurs propres outils. |
| PR-08 | **Sécurité et confidentialité dès la conception** | Avertissements avant publication, signalement, modération et respect des droits des personnes. |

---

## 5. Objectifs

### 5.1 Objectifs stratégiques (long terme)

| ID | Objectif stratégique |
|---|---|
| OS-01 | Constituer la plus grande base de **parcours de création IA documentés** et vérifiés par la communauté. |
| OS-02 | **Réduire l'écart entre débutants et experts** de façon mesurable. |
| OS-03 | Devenir la **source de référence** consultée et citée sur le prompting et la création avec l'IA. |
| OS-04 | Bâtir une **communauté autonome** qui produit, évalue et modère elle-même ses contenus. |

### 5.2 Indicateur clé (North Star)

> **Nombre hebdomadaire d'interactions d'apprentissage** : reproductions déclarées, réponses acceptées, votes « Utile » et « Testé, ça marche », réponses aux cas Bon réflexe.

Cet indicateur mesure la valeur échangée entre ceux qui montrent et ceux qui apprennent. Il progresse seulement si les deux côtés de la communauté sont actifs.

### 5.3 Objectifs du MVP

Les cibles chiffrées sont des **valeurs initiales indicatives**. Elles seront recalibrées à l'issue de la bêta fermée, sur la base des premières mesures réelles. L'horizon est de **6 mois après l'ouverture publique**.

| ID | Objectif | Indicateur | Cible indicative | Lien |
|---|---|---|---|---|
| O-01 | Constituer une offre de contenus riche en parcours | Créations publiées ; part des créations de type Itération ou Projet | ≥ 500 créations, dont ≥ 30 % avec parcours | OS-01, H-01 |
| O-02 | Prouver la valeur des contenus | Part des créations « 1 prompt » et « Itération » ayant au moins une reproduction déclarée | ≥ 25 % | OS-01, H-04 |
| O-03 | Garantir l'entraide | Questions et cliniques ayant une réponse sous 48 h ; part avec réponse acceptée | ≥ 70 % ; ≥ 40 % | OS-04 |
| O-04 | Retenir les nouveaux membres | Membres actifs la 4e semaine après leur inscription | ≥ 20 % | H-02 |
| O-05 | Faire apprendre | Membres actifs du mois ayant réalisé au moins une action d'apprentissage (reproduction, cas Bon réflexe, clinique) | ≥ 30 % | OS-02 |
| O-06 | Faire contribuer | Membres actifs du mois ayant publié au moins un contenu (création, astuce, réponse) | ≥ 10 % | OS-04 |
| O-07 | Maintenir la confiance | Signalements traités sous 72 h | 100 % | PR-08 |
| O-08 | Maîtriser les coûts | Dépenses d'appels à des modèles d'IA ; coût d'hébergement | 0 € ; dans le budget validé par le porteur | PR-07 |

**Définition d'un membre actif :** membre connecté ayant réalisé au moins une action parmi : publication, vote, reproduction, commentaire, réponse, cas Bon réflexe.

---

## 6. Périmètre et feuille de route

### 6.1 Feuille de route

| Phase | Contenu | Condition de passage |
|---|---|---|
| **MVP — Bêta fermée** | Toutes les fonctionnalités Must du document 03. Accès sur invitation : d'abord des experts chargés d'amorcer les contenus, puis un panel de débutants et de praticiens pour tester l'apprentissage. | ≥ 100 créations publiées par ≥ 20 experts ; aucun défaut bloquant |
| **MVP — Ouverture publique** | Must et Should du document 03. | Critères de la bêta atteints ; modération opérationnelle |
| **V2** | Carnéo ; revue de méthode ; parcours guidés ; profil de méthode ; records ; abonnement à un membre ; types de création Agent et Chaîne d'outils distincts ; historique des versions d'une création | Hypothèses H-01 à H-05 validées |
| **V3** | Offres pour écoles et formateurs ; bilans par modèle ; formats ouverts d'import et d'export | Décision du porteur selon les résultats de la V2 |

### 6.2 Dans le périmètre du MVP

- Comptes, profils, conformité (documents légaux, export et suppression des données).
- Créations « 1 prompt », « Itération » et « Projet », saisies sur la plateforme, avec configurations IA, résultats, liens et moments clés.
- Découverte : accueil, recherche, filtres, fiches de création.
- Évaluation et preuve : votes, reproductions, enregistrements, signalement d'obsolescence.
- Commentaires, y compris ancrés sur une étape ou un échange.
- Forum : questions, Clinique du prompt, astuces, retours d'expérience, discussions.
- Apprentissage : Bon réflexe et défis.
- Progression : réputation, niveaux, badges, statistiques, classements.
- Notifications, modération et administration des référentiels.

### 6.3 Hors périmètre

| Élément | Statut | Raison |
|---|---|---|
| Carnéo | V2 | Voir [D-01](#11-décisions-structurantes) |
| Génération ou exécution de prompts sur la plateforme | Exclu durablement | Contrainte de coût zéro (PR-07) et risque de sécurité |
| Marketplace payante de prompts | Exclu durablement | Contraire à la mission et à la gratuité |
| Publication de contenus de tiers sans leur consentement (import depuis les réseaux sociaux) | Exclu durablement | Contraire à PR-02 ; données incomplètes et non vérifiables |
| Hébergement de vidéos | Exclu du MVP | Coût ; les vidéos sont ajoutées par lien externe |
| Application mobile native | Exclu du MVP | Le site est responsive |
| Messagerie privée entre membres | Exclu du MVP | Charge de modération ; non essentielle à la proposition de valeur |

---

## 7. Hypothèses critiques à valider

| ID | Hypothèse | Méthode de validation | Critère de validation |
|---|---|---|---|
| H-01 | Les experts acceptent de publier leurs créations avec leur parcours, même en saisie manuelle. | Bêta fermée sur invitation | ≥ 20 experts publient chacun ≥ 3 créations |
| H-02 | Les débutants trouvent de la valeur et reviennent. | Mesure de rétention et entretiens | O-04 atteint |
| H-03 | Une création avec moments clés aide davantage à apprendre qu'un résultat seul. | Comparaison des créations avec et sans moments clés | Taux de votes « Utile » et d'enregistrements par vue au moins 20 % plus élevé pour les créations avec moments clés |
| H-04 | Les membres déclarent leurs reproductions. | Mesure | O-02 atteint |
| H-05 | La saisie manuelle est le principal frein à la publication des projets. | Taux d'abandon des brouillons de projet et entretiens | Si ≥ 40 % des brouillons de projet sont abandonnés ou si ce frein domine les retours, Carnéo devient la priorité n° 1 de la V2 |
| H-06 | La gamification motive sans dégrader la qualité. | Suivi des signalements jugés fondés | < 5 % des contenus publiés font l'objet d'un signalement jugé fondé |

---

## 8. Contraintes

| ID | Contrainte |
|---|---|
| C-01 | Accès gratuit pour tous les utilisateurs. |
| C-02 | La plateforme n'appelle aucun modèle d'IA et n'exécute aucun contenu soumis. Les reproductions sont réalisées par les membres avec leurs propres outils. |
| C-03 | Coûts d'infrastructure minimaux : seules les images sont hébergées, avec une taille limitée ; vidéos, démos et dépôts de code sont ajoutés par lien externe. |
| C-04 | Seuls les contenus volontairement publiés par leur auteur sont visibles des autres. |
| C-05 | Conformité à la législation sur la protection des données personnelles du pays d'établissement, et au RGPD dès lors que des personnes résidant dans l'Union européenne utilisent la plateforme. Respect du droit d'auteur. Les auteurs restent responsables du respect des conditions d'utilisation des outils d'IA dont ils partagent les résultats. |
| C-06 | Accessibilité (WCAG 2.2, niveau AA) et affichage adapté au mobile. |

---

## 9. Risques

Échelle : Faible / Moyen / Élevé.

| ID | Risque | Probabilité | Impact | Parade |
|---|---|---|---|---|
| R-01 | Démarrage à froid : peu de contenus à l'ouverture | Élevé | Élevé | Bêta fermée réservée aux experts invités ; défis ; partage externe valorisant les auteurs |
| R-02 | Contenus de faible qualité ou spam | Élevé | Moyen | Limites pour les nouveaux comptes ; signalement ; modération ; votes de la communauté |
| R-03 | Publication de données sensibles (clés d'API, données personnelles) dans les prompts | Moyen | Élevé | Brouillon par défaut ; avertissement avant publication ; signalement dédié ; retrait rapide |
| R-04 | Contenus dangereux (contournement des protections, instructions malveillantes, prompts d'agent destructeurs) | Moyen | Élevé | Charte ; modération ; avertissement « instructions pour agent » |
| R-05 | Obsolescence rapide des contenus | Élevé | Moyen | Modèle et date affichés ; signalement d'obsolescence ; reproductions récentes visibles |
| R-06 | Litiges de propriété intellectuelle | Moyen | Moyen | Licence explicite par création ; CGU ; signalement pour plagiat |
| R-07 | Extension d'un acteur existant sur le même créneau | Moyen | Moyen | Différenciation : parcours + apprentissage + preuve ; vitesse de constitution de la communauté |
| R-08 | Charge de modération supérieure aux capacités | Moyen | Élevé | Outils de modération ; masquage automatique au seuil de signalements ; recrutement de modérateurs |
| R-09 | Désengagement des experts | Moyen | Élevé | Reconnaissance (niveaux, badges, crédit des variantes, partage externe) |
| R-10 | Croissance des coûts d'hébergement | Moyen | Moyen | Limites sur les médias ; suivi des coûts ; modèle de financement défini avant la V2 |

---

## 10. Paysage concurrentiel

État constaté lors de la veille d'octobre 2026, à tenir à jour.

| Catégorie | Exemples | Ce qu'ils apportent | Ce qui manque par rapport à Vysora |
|---|---|---|---|
| Réseaux sociaux | X, LinkedIn, Reddit | Visibilité, viralité | Pas de structure (outil, modèle, paramètres), pas de parcours, pas de vérification |
| Galeries et marketplaces de prompts | PromptBase, FlowGPT, PromptHero | Volume de prompts, monétisation | Un prompt et un résultat, rarement la méthode ; contrôle de qualité faible |
| Vitrines de créations en un prompt | OneShotWonder (annoncé en 2026, en liste d'attente lors de la vérification) | Classements de créations en un seul prompt | Limité au « 1 prompt » ; pas de parcours multi-étapes ni de dimension d'apprentissage |
| Répertoires de règles et de skills pour agents | cursor.directory, skills.sh | Configurations réutilisables pour les outils de code | Pas de créations, pas de parcours, pas de communauté d'apprentissage |
| Sauvegarde et partage de conversations de code | SpecStory | Historique des conversations avec les agents de code | Outil individuel ; pas de plateforme communautaire d'évaluation et d'apprentissage |
| Arènes de comparaison de modèles | Design Arena, WebDev Arena (LMArena) | Comparaison de modèles sur un même prompt | Évalue les modèles, pas la méthode humaine |
| Cours en ligne | Coursera, Codecademy, DeepLearning.AI | Contenus structurés | Théoriques ; peu de vrais projets décortiqués ; pas de communauté de pratique |

**Espace visé par Vysora :** le parcours complet de vraies créations, pensé pour apprendre, avec preuves et communauté. Aucun des acteurs ci-dessus ne réunit ces quatre éléments.

---

## 11. Décisions structurantes

Les décisions marquées « À valider » requièrent l'arbitrage du porteur de projet, et un avis juridique pour celles qui le précisent.

| ID | Décision | Justification | Statut |
|---|---|---|---|
| D-01 | **Carnéo est livré en V2, pas dans le MVP.** Au MVP, les parcours sont saisis sur la plateforme. | Carnéo est le composant le plus coûteux et le plus risqué (une intégration à maintenir par outil, confiance à établir). Sa valeur dépend d'une audience existante. Le MVP doit d'abord valider que l'on publie et que l'on apprend (H-01, H-02). H-05 mesure si la saisie manuelle est le frein principal. | Proposée |
| D-02 | **Pas de vote négatif au MVP.** La qualité est signalée par les votes positifs, les reproductions, les signalements et l'obsolescence. | Protéger les débutants (PR-06) et limiter les comportements toxiques. | Proposée |
| D-03 | **Un projet est saisi par étapes**, avec ses prompts clés, et non l'intégralité de ses échanges. | Réduit la saisie et produit un récit plus pédagogique ; Carnéo complétera en V2. | Proposée |
| D-04 | **Trois types de création au MVP : « 1 prompt », « Itération », « Projet ».** Un travail d'agent ou une chaîne d'outils se publie comme une itération ou un projet. | Couvre tous les cas sans multiplier les formulaires. | Proposée |
| D-05 | **Aucune génération ni exécution sur la plateforme.** Les démos passent par des liens externes ; seules les images sont hébergées. | PR-07, C-02, C-03 et sécurité. | Proposée |
| D-06 | **Interface en français au lancement**, anglais en Should. Les contenus peuvent être rédigés dans n'importe quelle langue. | L'anglais élargit l'audience mais ajoute de la charge. | À valider |
| D-07 | **Licence par défaut des créations : CC BY 4.0**, modifiable par l'auteur parmi une liste fermée. | Permet la réutilisation avec crédit, cohérente avec l'apprentissage. | À valider (avis juridique) |
| D-08 | **Les modérateurs sont nommés par l'administration** au MVP. | Simplicité et maîtrise de la qualité au démarrage. | Proposée |
| D-09 | **À la suppression d'un compte**, les données personnelles sont supprimées ; les contributions sont anonymisées, sauf si l'auteur demande aussi la suppression de ses créations. | Concilie le droit à l'effacement et la continuité des discussions dont d'autres membres dépendent. | À valider (avis juridique) |
| D-10 | **Toute création naît en brouillon privé.** | PR-02. | Proposée |

---

## 12. Glossaire

| Terme | Définition |
|---|---|
| **Création** | Ce qu'un membre a produit avec l'IA et qu'il publie sur Vysora, avec son parcours. Types : « 1 prompt », « Itération », « Projet ». |
| **1 prompt** | Création obtenue en un seul message envoyé à l'IA. Choisir la meilleure parmi plusieurs régénérations du même message reste un « 1 prompt », à condition de l'indiquer. |
| **Itération** | Création obtenue au fil d'une seule conversation de plusieurs échanges. |
| **Projet** | Création obtenue en plusieurs étapes, pouvant mobiliser plusieurs conversations, outils et modèles. |
| **Parcours** | Ensemble ordonné des étapes et échanges qui ont mené à une création. |
| **Étape** | Segment du parcours, avec un titre et un récit. Une création « 1 prompt » ou « Itération » a une seule étape. |
| **Échange** | Un prompt envoyé à l'IA et la réponse obtenue. |
| **Configuration IA** | Outil, modèle, paramètres et contexte caché utilisés pour une étape. |
| **Contexte caché** | Ce qui influence la réponse sans figurer dans le prompt : instructions personnalisées, mémoire, fichiers de règles, pièces jointes, modes activés. |
| **Moment clé** | Point du parcours signalé par l'auteur comme décisif : correction, refus, échec, changement d'outil, vérification, découverte. |
| **Reproduction** | Déclaration d'un membre qui a essayé une création avec ses propres outils : résultat obtenu (succès, partiel, échec), outil, modèle. |
| **Obsolescence** | Signalement qu'un contenu ne fonctionne plus avec un modèle donné. |
| **Fraîcheur** | Information sur l'actualité d'un contenu : date, modèle utilisé, date de la dernière reproduction, signalements d'obsolescence. |
| **Variante** | Création publiée à partir d'une autre, qui crédite la création source. |
| **Clinique du prompt** | Sujet du forum où un membre soumet son prompt et un résultat décevant pour obtenir de l'aide. |
| **Bon réflexe** | Cas d'entraînement : une demande faite à l'IA et sa réponse ; le membre décide s'il accepte, refuse ou corrige, puis découvre l'analyse d'un expert. |
| **Défi** | Objectif commun proposé pour une période donnée ; les membres y participent avec une création. |
| **Réputation** | Total des points gagnés par un membre grâce aux réactions de la communauté et à ses actions d'apprentissage. |
| **Niveau** | Palier de réputation : Curieux, Apprenti, Artisan, Expert, Maître. |
| **Carnéo** | Outil d'Vysora qui retrace le parcours d'un créateur pendant qu'il travaille avec ses IA (V2). |

---

## 13. Sources

- [S1] Stack Overflow Developer Survey 2025, via TechRepublic : <https://www.techrepublic.com/article/news-developer-trust-in-ai-declines/>
- [S2] Anthropic, *How AI assistance impacts the formation of coding skills* (2026) : <https://www.anthropic.com/research/AI-assistance-coding-skills>
- [S3] Prather et al., *The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers*, ICER 2024 : <https://arxiv.org/abs/2405.17739>
- [S4] Veracode, *2025 GenAI Code Security Report* : <https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/>
- [S5] Veracode, *2026 GenAI Code Security Report*, via SD Times : <https://sdtimes.com/agentic-security/veracode-finds-ai-generated-code-security-has-barely-improved-since-last-year/>
- [S6] The Register, incident Replit (juillet 2025) : <https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/>
- [S7] Security Boulevard, applications vibe-codées exposant des données (mai 2026) : <https://securityboulevard.com/2026/05/thousands-of-vibe-coded-apps-exposing-corporate-personal-data-redaccess/>
