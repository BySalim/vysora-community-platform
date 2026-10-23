# Vysora — Définition des cibles et de leurs objectifs

| Élément | Valeur |
|---|---|
| Projet | Vysora |
| Document | 02 — Cibles et objectifs |
| Version | 1.0 |
| Date | 11/10/2026 |
| Statut | Version de travail soumise à validation du porteur de projet |
| Classification | Confidentiel — diffusion restreinte à l'équipe projet |

---

## Sommaire

1. [Méthode et statut des personas](#1-méthode-et-statut-des-personas)
2. [Segmentation](#2-segmentation)
3. [Personas principaux](#3-personas-principaux)
4. [Personas internes](#4-personas-internes)
5. [Objectifs par cible](#5-objectifs-par-cible)
6. [Proposition de valeur par cible](#6-proposition-de-valeur-par-cible)
7. [Dynamique de la communauté et stratégie d'amorçage](#7-dynamique-de-la-communauté-et-stratégie-damorçage)
8. [Rôles sur la plateforme](#8-rôles-sur-la-plateforme)
9. [Anti-cibles et usages interdits](#9-anti-cibles-et-usages-interdits)
10. [Hypothèses sur les cibles et plan de validation](#10-hypothèses-sur-les-cibles-et-plan-de-validation)

---

## 1. Méthode et statut des personas

Les personas de ce document sont des **proto-personas** : ils formalisent des hypothèses issues de l'analyse du problème (document 01, section 2) et non d'une recherche utilisateur. Ils doivent être confirmés ou corrigés par des entretiens avant le développement (section 10).

Chaque cible est décrite par :

- son **profil** et son contexte d'usage ;
- ses **objectifs** (ce qu'elle cherche à accomplir) ;
- ses **tâches à accomplir** au format « Quand…, je veux…, afin de… » ;
- ses **frustrations** actuelles ;
- ce qui la ferait **adopter** Vysora, ou la **quitter** ;
- ses **critères de succès** et les fonctionnalités qui y répondent (identifiants F-xx du document 03).

---

## 2. Segmentation

| ID | Segment | Description | Rôle dans la communauté | Priorité MVP |
|---|---|---|---|---|
| S1 | **Apprenants débutants** | Personnes qui créent avec l'IA sans maîtriser le domaine technique : étudiants, autodidactes, entrepreneurs non techniques, personnes en reconversion, « vibe coders ». | Demande principale : viennent apprendre. | **P1** |
| S2 | **Praticiens intermédiaires** | Professionnels qui utilisent l'IA au quotidien (développeurs, designers, rédacteurs, marketeurs, analystes) et veulent être plus efficaces. | Demande et offre : consomment, testent, partagent des astuces. | **P2** |
| S3 | **Experts** | Développeurs confirmés, spécialistes du prompting, créateurs de contenu IA, consultants. | Offre principale : publient des parcours, répondent, créent des cas d'apprentissage. | **P1** |
| S4 | Formateurs et écoles | Enseignants, bootcamps, organismes de formation. | Prescripteurs. | P3 (V3) |
| S5 | Recruteurs | Entreprises qui évaluent la manière dont un candidat travaille avec l'IA. | Utilisateurs des profils publics. | P3 (V2 et après) |
| S6 | Éditeurs d'outils d'IA | Entreprises qui développent les outils et modèles. | Observateurs, partenaires potentiels de défis, dans le respect de la neutralité (PR-03). | P3 (après MVP) |

**Justification des priorités.** Vysora est une plateforme à deux faces : sans experts (S3), pas de contenus de qualité ; sans apprenants (S1), pas d'audience ni de raison de publier. S1 et S3 sont donc prioritaires ensemble. S2 constitue le volume naturel de la communauté et passe progressivement de lecteur à contributeur. Les segments S4 à S6 seront servis après la validation du modèle de base.

---

## 3. Personas principaux

### P-01 — Inès, la débutante qui crée avec l'IA (S1)

| Rubrique | Description |
|---|---|
| **Profil** | 24 ans, en reconversion vers le numérique. Elle crée le site de réservation de son activité de coaching avec un générateur d'applications et un assistant conversationnel. |
| **Niveau IA** | Utilise l'IA tous les jours depuis quelques mois. Ne lit pas le code produit. |
| **Contexte d'usage** | Le soir et le week-end, sur ordinateur portable ; consulte aussi sur mobile. |
| **Objectifs** | Réussir son projet ; comprendre ce que l'IA produit ; éviter les erreurs graves (sécurité, perte de données) ; savoir quoi demander et comment ; progresser. |
| **Tâches à accomplir** | Quand l'IA me propose une solution que je ne comprends pas, je veux savoir si c'est une bonne idée, afin de ne pas mettre en ligne quelque chose de dangereux. · Quand mon prompt ne donne pas le résultat voulu, je veux qu'on m'aide à le reformuler, afin d'avancer sans y passer des heures. · Quand je démarre une fonctionnalité, je veux voir comment d'autres l'ont faite avec l'IA, afin de suivre une méthode qui marche. |
| **Frustrations** | Ne sait pas si le code est sûr ; bloque sans comprendre pourquoi ; les tutoriels sont théoriques ou périmés ; se sent jugée sur les forums généralistes ; les créations impressionnantes des réseaux sociaux ne montrent jamais comment elles ont été faites. |
| **Ce qui la fait adopter Vysora** | Des exemples concrets classés par objectif ; une aide bienveillante sur ses propres prompts ; des cas d'entraînement courts ; une progression visible. |
| **Ce qui la ferait partir** | Jargon et contenus réservés aux experts ; réponses méprisantes ; questions sans réponse ; contenus qui ne marchent pas avec ses outils. |
| **Critères de succès** | Trouve en moins de 5 minutes une création proche de son objectif ; obtient une réponse à sa clinique en moins de 48 h ; réussit de plus en plus de cas Bon réflexe. |
| **Fonctionnalités clés** | F-21, F-22, F-23, F-24, F-32, F-34, F-50, F-52, F-62, F-71, F-74 |
| **Citation** | « Je veux bien que l'IA code pour moi, mais je veux savoir si ce qu'elle fait est bien. » |

### P-02 — Yacine, le praticien pressé (S2)

| Rubrique | Description |
|---|---|
| **Profil** | 31 ans, développeur web dans une agence. Utilise un assistant conversationnel et un éditeur de code assisté par l'IA. |
| **Niveau IA** | Intermédiaire : sait formuler une demande, relit le code, mais suit mal l'évolution rapide des outils. |
| **Contexte d'usage** | Pendant le travail, par courtes sessions ciblées, souvent depuis une recherche. |
| **Objectifs** | Gagner du temps ; choisir le bon outil et le bon modèle pour une tâche ; savoir ce qui fonctionne encore avec la dernière version d'un modèle ; partager ses astuces et être reconnu. |
| **Tâches à accomplir** | Quand un nouveau modèle sort, je veux savoir quelles techniques marchent encore, afin de ne pas perdre de temps. · Quand je trouve une astuce efficace, je veux la partager avec un exemple, afin d'aider les autres et d'être reconnu. · Quand je cherche comment faire une tâche précise, je veux filtrer par outil et par modèle, afin de trouver une solution directement applicable. |
| **Frustrations** | La veille est chronophage ; les astuces sont souvent périmées ; les résultats publiés sont rarement reproductibles ; trop de bruit sur les réseaux sociaux. |
| **Ce qui le fait adopter Vysora** | Filtres par outil et par modèle ; indicateurs de preuve (reproductions) et de fraîcheur ; astuces avec exemple avant/après. |
| **Ce qui le ferait partir** | Contenus non vérifiés ou anciens ; recherche peu pertinente ; lenteur. |
| **Critères de succès** | Trouve une solution testée par d'autres pour son outil et son modèle ; ses astuces reçoivent des votes « Testé, ça marche ». |
| **Fonctionnalités clés** | F-22, F-23, F-24, F-31, F-32, F-33, F-34, F-35, F-50, F-53 |
| **Citation** | « Je ne veux pas une astuce de plus. Je veux celle qui marche encore aujourd'hui avec mon outil. » |

### P-03 — Claire, l'experte reconnue (S3)

| Rubrique | Description |
|---|---|
| **Profil** | 38 ans, développeuse senior devenue consultante en IA. Publie régulièrement ses réalisations sur LinkedIn et X. |
| **Niveau IA** | Experte : enchaîne plusieurs outils et modèles, sait quand refuser une proposition de l'IA. |
| **Contexte d'usage** | Publie après un projet ; répond aux questions par moments ; partage ses publications sur ses réseaux. |
| **Objectifs** | Être visible et crédible ; disposer d'un portfolio vérifiable ; transmettre ; trouver des missions ; être créditée quand son travail est repris. |
| **Tâches à accomplir** | Quand je termine un projet ambitieux avec l'IA, je veux montrer comment je l'ai fait, afin d'asseoir ma crédibilité. · Quand on me pose plusieurs fois la même question, je veux renvoyer vers une ressource de référence, afin de gagner du temps. · Quand quelqu'un réutilise mon travail, je veux être créditée, afin que ma contribution soit reconnue. |
| **Frustrations** | Ses publications disparaissent dans le flux des réseaux ; son travail est copié sans crédit ; aucun format ne permet de montrer un parcours complet ; questions répétitives. |
| **Ce qui la fait adopter Vysora** | Un format qui valorise sa méthode (étapes, moments clés) ; un profil qui prouve son savoir-faire (niveau, reproductions, réponses acceptées) ; un lien partageable qui renvoie à sa création ; le crédit automatique des variantes. |
| **Ce qui la ferait partir** | Publication trop longue ; pas d'audience ; contenus médiocres autour des siens ; travail repris sans crédit. |
| **Critères de succès** | Publie un projet complet en moins de 30 minutes ; ses créations sont reproduites et enregistrées ; elle atteint le niveau Expert. |
| **Fonctionnalités clés** | F-05, F-12, F-13, F-14, F-15, F-20, F-26, F-51, F-60, F-73, F-74 |
| **Citation** | « Le résultat, tout le monde le voit. Ce qui a de la valeur, c'est comment j'y suis arrivée. » |

---

## 4. Personas internes

### P-04 — Thomas, modérateur bénévole

| Rubrique | Description |
|---|---|
| **Profil** | Membre actif de niveau Expert, nommé modérateur par l'administration (décision D-08). |
| **Objectifs** | Traiter les signalements vite et équitablement ; disposer d'outils clairs ; pouvoir justifier chaque décision. |
| **Tâches à accomplir** | Quand un contenu est signalé, je veux voir le contenu, les motifs et l'historique de l'auteur, afin de décider rapidement et de façon juste. · Quand un expert propose un cas Bon réflexe, je veux vérifier son exactitude, afin que les débutants n'apprennent pas une erreur. |
| **Frustrations potentielles** | File de signalements ingérable ; absence de traçabilité ; contestations sans historique. |
| **Critères de succès** | 100 % des signalements traités sous 72 h (O-07). |
| **Fonctionnalités clés** | F-61, F-90, F-91, F-92, F-93 |

### P-05 — L'administrateur Vysora

| Rubrique | Description |
|---|---|
| **Profil** | Membre de l'équipe projet. |
| **Objectifs** | Tenir à jour les référentiels (outils, modèles, catégories, licences, badges, niveaux, documents légaux) ; nommer les modérateurs ; organiser les défis ; piloter les indicateurs. |
| **Tâches à accomplir** | Quand un nouveau modèle sort, je veux l'ajouter au référentiel, afin que les membres puissent le sélectionner. · Chaque semaine, je veux consulter les indicateurs, afin de vérifier que les objectifs du MVP sont en bonne voie. |
| **Fonctionnalités clés** | F-63, F-65, F-95, F-96, F-97 |

---

## 5. Objectifs par cible

| Cible | Objectifs de la cible | Ce qu'Vysora doit obtenir de cette cible | Indicateurs (doc. 01) |
|---|---|---|---|
| S1 Apprenants débutants | Comprendre, éviter les erreurs, être aidés, progresser | Qu'ils reviennent, posent leurs questions, reproduisent et s'entraînent | O-04, O-05, O-03 |
| S2 Praticiens | Gagner du temps, trouver ce qui marche encore, partager | Qu'ils testent, votent « Testé, ça marche », signalent l'obsolescence et publient des astuces | O-02, O-06 |
| S3 Experts | Visibilité, crédibilité, transmission, opportunités | Qu'ils publient des parcours complets, répondent et créent des cas Bon réflexe | O-01, O-03, H-01 |
| Modérateurs | Modérer vite et équitablement | Un espace sûr et des contenus fiables | O-07, H-06 |
| Administrateurs | Piloter et maintenir la plateforme | Référentiels à jour, coûts maîtrisés, objectifs suivis | O-08 |

---

## 6. Proposition de valeur par cible

### S1 — Apprenants débutants

| Besoin ou douleur | Réponse d'Vysora | Fonctionnalités |
|---|---|---|
| Ne sait pas si ce que l'IA produit est bon | Cas Bon réflexe : décider, puis découvrir l'analyse d'un expert | F-60, F-61, F-62 |
| Bloque sur un prompt | Clinique du prompt : la communauté aide à reformuler | F-50, F-51, F-52 |
| Ne sait pas comment s'y prendre | Créations avec parcours et moments clés, classées par catégorie | F-12, F-14, F-22, F-23 |
| Peur d'être jugée | Pas de vote négatif ; charte appliquée par la modération | D-02, F-04, F-91 |
| Ne voit pas ses progrès | Réputation, niveaux, badges qui récompensent aussi l'apprentissage | F-70, F-71, F-74 |

### S2 — Praticiens intermédiaires

| Besoin ou douleur | Réponse d'Vysora | Fonctionnalités |
|---|---|---|
| Astuces périmées | Modèle et date sur chaque contenu ; signalement d'obsolescence | F-33, F-35 |
| Résultats non reproductibles | Reproductions déclarées et taux de réussite affiché | F-32, F-33 |
| Veille chronophage | Recherche et filtres par outil, modèle, catégorie et étiquette | F-22, F-25 |
| Envie de partager | Astuces avec exemple avant/après et vote « Testé, ça marche » | F-31, F-53 |

### S3 — Experts

| Besoin ou douleur | Réponse d'Vysora | Fonctionnalités |
|---|---|---|
| Visibilité éphémère sur les réseaux | Créations durables, indexables et partageables | F-23, F-26 |
| Pas de format pour montrer une méthode | Projet en étapes, configurations IA, moments clés | F-12, F-13, F-14 |
| Travail repris sans crédit | Variantes qui créditent la source ; licence explicite | F-17, F-20 |
| Besoin de crédibilité | Profil avec niveau, badges et statistiques vérifiables | F-05, F-73, F-74 |
| Questions répétitives | Renvoi vers une création ou une astuce de référence | F-51, F-54 |

---

## 7. Dynamique de la communauté et stratégie d'amorçage

### 7.1 Cycle vertueux

1. Les **experts** publient des parcours et créent des cas d'apprentissage.
2. Les **apprenants** et les **praticiens** les consultent, les reproduisent, votent et posent des questions.
3. Les votes, reproductions et réponses acceptées augmentent la **réputation** des experts et leur visibilité.
4. Les apprenants progressent, montent de niveau, puis **contribuent** à leur tour.

### 7.2 Stratégie d'amorçage

| Étape | Cible | Action | Résultat attendu |
|---|---|---|---|
| 1 | S3 Experts | Invitation personnelle en bêta fermée ; badge « Pionnier » ; accompagnement à la première publication | ≥ 100 créations publiées par ≥ 20 experts |
| 2 | S1 et S2 | Ouverture de la bêta à un panel ; premiers défis ; premiers cas Bon réflexe | Premières reproductions, cliniques et réponses ; mesure de la rétention |
| 3 | Tous | Ouverture publique ; partage externe des créations par leurs auteurs | Croissance par le partage des experts et par les moteurs de recherche |

---

## 8. Rôles sur la plateforme

| Rôle | Qui | Description | Personas |
|---|---|---|---|
| **Visiteur** | Toute personne non connectée | Consulte et recherche les contenus publiés, voit les profils publics, partage des liens. Ne peut pas interagir. | Toutes cibles avant inscription, S5 |
| **Membre** | Toute personne inscrite ; elle contribue une fois son e-mail vérifié | Publie, vote, reproduit, commente, participe au forum, aux cas Bon réflexe et aux défis. Ses droits évoluent avec son niveau (F-72). | P-01, P-02, P-03 |
| **Modérateur** | Membre nommé par un administrateur | Traite les signalements, prend les décisions de modération, valide les cas Bon réflexe. | P-04 |
| **Administrateur** | Équipe Vysora | Gère les référentiels, les rôles, les défis et les documents légaux ; consulte les indicateurs. | P-05 |

Les niveaux de membre (Curieux, Apprenti, Artisan, Expert, Maître) et les droits associés sont définis dans le document 03 (F-71, F-72).

---

## 9. Anti-cibles et usages interdits

Vysora ne cherche pas à servir ces publics ; ses règles les découragent.

| Anti-cible ou usage | Pourquoi | Parade |
|---|---|---|
| Vendeurs de prompts cherchant à monétiser leurs contenus | Contraire à la gratuité et à la mission | Pas de vente ; liens promotionnels limités ; modération |
| Recherche de contournement des protections des IA (« jailbreak ») ou de contenus malveillants | Risque légal et réputationnel | Interdiction dans la charte ; motif de signalement dédié ; suppression |
| Spam et autopromotion | Dégrade la qualité | Limites pour les nouveaux comptes (F-72) ; signalement ; sanctions |
| Personnes qui veulent générer du contenu sur la plateforme | Vysora n'est pas un outil de génération (D-05) | Positionnement clair dès l'accueil |
| Publication de contenus de tiers sans leur accord | Contraire au consentement (PR-02) et au droit d'auteur | Charte ; motif de signalement « Plagiat » |

---

## 10. Hypothèses sur les cibles et plan de validation

### 10.1 Hypothèses

| ID | Hypothèse | Lien avec le document 01 |
|---|---|---|
| HC-01 | Les débutants cherchent avant tout à savoir si ce que l'IA produit est fiable, plus qu'à collectionner des prompts. | H-02 |
| HC-02 | Les experts publient pour la visibilité et la crédibilité, plus que pour l'altruisme seul. | H-01 |
| HC-03 | Les praticiens privilégient les contenus récents et reproduits par d'autres. | H-04 |
| HC-04 | Une publication de projet doit pouvoir se faire en moins de 30 minutes pour que les experts l'acceptent. | H-05 |
| HC-05 | L'absence de vote négatif ne nuit pas à la perception de qualité. | D-02 |

### 10.2 Plan de validation

| Action | Cible | Volume | Moment | Livrable |
|---|---|---|---|---|
| Entretiens individuels semi-directifs | S1, S2, S3 | 8 à 12 par segment prioritaire, jusqu'à ce que les réponses ne fassent plus émerger d'élément nouveau | Avant le développement | Personas confirmés ou corrigés ; mise à jour de ce document |
| Tests utilisateurs sur maquettes (publication d'un projet, recherche, cas Bon réflexe) | S1, S3 | 5 participants par cycle de test | Avant le développement, puis à chaque itération | Liste des problèmes d'ergonomie priorisés |
| Mesures en bêta fermée | S1, S2, S3 | Tous les membres de la bêta | Bêta fermée | Validation des hypothèses H-01 à H-06 du document 01 |

**Thèmes du guide d'entretien :**

1. Comment la personne utilise l'IA aujourd'hui (outils, fréquence, projets).
2. Le dernier moment où elle a été bloquée ou trompée par l'IA, et ce qu'elle a fait.
3. Où elle cherche de l'aide et des exemples, et ce qui lui manque.
4. Ce qui la pousserait à publier, ou l'en empêcherait.
5. Sa réaction à un prototype de création avec parcours et moments clés.
