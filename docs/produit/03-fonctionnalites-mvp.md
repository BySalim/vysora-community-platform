# Vysora — Fonctionnalités du MVP

| Élément | Valeur |
|---|---|
| Projet | Vysora |
| Document | 03 — Fonctionnalités MVP |
| Version | 1.0 |
| Date | 11/10/2026 |
| Statut | Version de travail soumise à validation du porteur de projet |
| Classification | Confidentiel — diffusion restreinte à l'équipe projet |

---

## Sommaire

1. [Conventions](#1-conventions)
2. [Synthèse des fonctionnalités](#2-synthèse-des-fonctionnalités)
3. [Rôles et droits](#3-rôles-et-droits)
4. [Détail des fonctionnalités](#4-détail-des-fonctionnalités)
5. [Règles de gestion transverses](#5-règles-de-gestion-transverses)
6. [Hors périmètre du MVP](#6-hors-périmètre-du-mvp)
7. [Exigences non fonctionnelles](#7-exigences-non-fonctionnelles)
8. [Définition de prêt et de terminé](#8-définition-de-prêt-et-de-terminé)

---

## 1. Conventions

### 1.1 Priorisation MoSCoW

| Priorité | Signification dans ce document |
|---|---|
| **Must** | Indispensable. Le MVP ne peut pas ouvrir, même en bêta fermée, sans elle. |
| **Should** | Importante. Attendue pour l'ouverture publique ; peut manquer en bêta fermée. |
| **Could** | Souhaitable. Réalisée seulement s'il reste de la capacité, sans retarder l'ouverture. |
| **Won't (MVP)** | Explicitement exclue du MVP, avec une version cible ou un motif d'exclusion (section 6). |

### 1.2 Formats

- **Récit utilisateur** : « En tant que [rôle], je veux [action], afin de [bénéfice]. »
- **Critères d'acceptation** : format « Étant donné… lorsque… alors… ». Chaque critère est vérifiable par un test.
- **Règles de gestion** : identifiants RG-xx, définies une seule fois (au plus près de leur fonctionnalité, ou en section 5 lorsqu'elles sont transverses) et référencées ailleurs.
- Les identifiants O-, H-, D-, PR- renvoient au document 01 ; P- et S- au document 02 ; WF- au document 04.

### 1.3 Épopées

| ID | Épopée |
|---|---|
| E1 | Comptes, profils et conformité |
| E2 | Créations et parcours |
| E3 | Découverte |
| E4 | Évaluation et preuve |
| E5 | Commentaires |
| E6 | Forum |
| E7 | Apprentissage |
| E8 | Progression |
| E9 | Notifications |
| E10 | Modération |
| E11 | Administration |

---

## 2. Synthèse des fonctionnalités

| ID | Fonctionnalité | Épopée | Priorité | Personas | Objectifs |
|---|---|---|---|---|---|
| F-01 | Inscription par e-mail et vérification | E1 | Must | Tous | O-04 |
| F-02 | Connexion avec GitHub ou Google | E1 | Should | P-02, P-03 | O-04 |
| F-03 | Connexion, déconnexion, réinitialisation du mot de passe | E1 | Must | Tous | — |
| F-04 | Acceptation versionnée des documents légaux | E1 | Must | Tous | C-05 |
| F-05 | Profil public | E1 | Must | P-03 | O-06 |
| F-06 | Paramètres du compte | E1 | Must | Tous | — |
| F-07 | Export des données personnelles | E1 | Must | Tous | C-05 |
| F-08 | Suppression du compte | E1 | Must | Tous | C-05 |
| F-10 | Création « 1 prompt » | E2 | Must | P-02, P-03 | O-01 |
| F-11 | Création « Itération » | E2 | Must | P-02, P-03 | O-01 |
| F-12 | Création « Projet » | E2 | Must | P-03 | O-01, H-01 |
| F-13 | Configurations IA | E2 | Must | P-02, P-03 | PR-04 |
| F-14 | Moments clés | E2 | Must | P-01, P-03 | H-03 |
| F-15 | Résultats, images et liens externes | E2 | Must | P-03 | O-01 |
| F-16 | Brouillon, publication, modification, suppression | E2 | Must | P-03 | PR-02 |
| F-17 | Licence | E2 | Must | P-03 | R-06 |
| F-18 | Avertissement de données sensibles | E2 | Should | Tous | R-03 |
| F-19 | Avertissement « instructions pour agent » | E2 | Should | P-01 | R-04 |
| F-20 | Variante d'une création | E2 | Should | P-02, P-03 | O-06 |
| F-21 | Page d'accueil | E3 | Must | Tous | O-04 |
| F-22 | Recherche, filtres et tri | E3 | Must | P-01, P-02 | O-04 |
| F-23 | Fiche création | E3 | Must | Tous | O-05 |
| F-24 | Copier un prompt | E3 | Must | P-01, P-02 | O-02 |
| F-25 | Pages catégorie et étiquette | E3 | Should | P-01 | O-04 |
| F-26 | Partage externe | E3 | Should | P-03 | R-01 |
| F-30 | Vote « Utile » | E4 | Must | Tous | North Star |
| F-31 | Vote « Testé, ça marche » | E4 | Must | P-02 | North Star |
| F-32 | Reproduction (« J'ai essayé ») | E4 | Must | P-01, P-02 | O-02 |
| F-33 | Indicateurs de preuve et de fraîcheur | E4 | Must | P-02 | PR-04 |
| F-34 | Enregistrer un contenu | E4 | Should | P-01, P-02 | O-04 |
| F-35 | Signaler une obsolescence | E4 | Should | P-02 | R-05 |
| F-40 | Commenter une création | E5 | Must | Tous | O-05 |
| F-41 | Ancrer un commentaire sur une étape ou un échange | E5 | Should | P-01, P-03 | H-03 |
| F-42 | Répondre à un commentaire | E5 | Should | Tous | O-03 |
| F-50 | Créer un sujet de forum | E6 | Must | Tous | O-03 |
| F-51 | Répondre à un sujet | E6 | Must | P-02, P-03 | O-03 |
| F-52 | Accepter une réponse | E6 | Must | P-01 | O-03 |
| F-53 | Astuce avec exemple avant/après | E6 | Must | P-02 | O-06 |
| F-54 | Lier un sujet à une création | E6 | Should | Tous | O-03 |
| F-55 | Fermer et rouvrir un sujet | E6 | Should | P-04 | — |
| F-60 | Proposer un cas Bon réflexe | E7 | Must | P-03 | O-05 |
| F-61 | Valider un cas Bon réflexe | E7 | Must | P-04 | O-05 |
| F-62 | Répondre à un cas Bon réflexe | E7 | Must | P-01 | O-05, OS-02 |
| F-63 | Créer et publier un défi | E7 | Should | P-05 | R-01, O-04 |
| F-64 | Participer à un défi | E7 | Should | P-02, P-03 | O-01 |
| F-65 | Clôturer un défi et établir le classement | E7 | Should | P-05 | O-04 |
| F-70 | Réputation | E8 | Must | Tous | H-06 |
| F-71 | Niveaux | E8 | Must | Tous | O-04 |
| F-72 | Privilèges et limites par niveau | E8 | Must | P-04 | R-02 |
| F-73 | Statistiques du profil | E8 | Must | P-03 | O-06 |
| F-74 | Badges | E8 | Should | Tous | O-04 |
| F-75 | Classements | E8 | Should | P-02, P-03 | O-06 |
| F-80 | E-mails transactionnels | E9 | Must | Tous | — |
| F-81 | Notifications dans l'application | E9 | Should | Tous | O-03, O-04 |
| F-90 | Signaler un contenu | E10 | Must | Tous | O-07 |
| F-91 | File de modération et décisions | E10 | Must | P-04 | O-07 |
| F-92 | Information de l'auteur et journal des décisions | E10 | Must | P-04 | PR-08 |
| F-93 | Masquage automatique au seuil de signalements | E10 | Should | P-04 | R-08 |
| F-95 | Gestion des référentiels | E11 | Must | P-05 | PR-03 |
| F-96 | Gestion des rôles | E11 | Must | P-05 | — |
| F-97 | Tableau de bord des indicateurs | E11 | Should | P-05 | O-01 à O-08 |

**Total :** 61 fonctionnalités, dont 41 Must et 20 Should. Les fonctionnalités Could et Won't sont en section 6.

---

## 3. Rôles et droits

✅ autorisé · ❌ interdit · 🔸 autorisé sous condition (renvoi à la règle).

| Action | Visiteur | Membre | Modérateur | Administrateur |
|---|---|---|---|---|
| Consulter et rechercher les contenus publiés | ✅ | ✅ | ✅ | ✅ |
| Consulter un profil public | ✅ | ✅ | ✅ | ✅ |
| Publier une création, un sujet, une réponse, un commentaire | ❌ | 🔸 RG-02, RG-85 | ✅ | ✅ |
| Voter, reproduire, enregistrer, signaler une obsolescence | ❌ | 🔸 RG-02, RG-40 | ✅ | ✅ |
| Répondre à un cas Bon réflexe | 🔸 sans enregistrement de la réponse (F-62) | ✅ | ✅ | ✅ |
| Proposer un cas Bon réflexe | ❌ | 🔸 niveau Expert ou plus (RG-70) | ✅ | ✅ |
| Signaler un contenu | ❌ | ✅ | ✅ | ✅ |
| Valider ou refuser un cas Bon réflexe | ❌ | ❌ | 🔸 sauf ses propres cas (RG-71) | ✅ |
| Traiter les signalements et décider (masquer, rétablir, supprimer, avertir, suspendre) | ❌ | ❌ | 🔸 sauf ses propres contenus (RG-104) | ✅ |
| Bannir un compte, ajuster une réputation, retirer un badge | ❌ | ❌ | ❌ | ✅ |
| Créer, publier, annuler un défi | ❌ | ❌ | ❌ | ✅ |
| Gérer les référentiels et les documents légaux | ❌ | ❌ | ❌ | ✅ |
| Nommer et retirer les modérateurs et administrateurs | ❌ | ❌ | ❌ | ✅ |
| Consulter le tableau de bord des indicateurs | ❌ | ❌ | ❌ | ✅ |

Un compte suspendu garde les droits d'un visiteur, plus l'accès à ses paramètres, jusqu'à la fin de la suspension (RG-103).

---

## 4. Détail des fonctionnalités

### E1 — Comptes, profils et conformité

#### F-01 — Inscription par e-mail et vérification · Must

**Récit utilisateur :** En tant que visiteur, je veux créer un compte avec mon e-mail, afin de participer à la communauté.

**Critères d'acceptation**
- Étant donné un visiteur sur le formulaire d'inscription, lorsqu'il saisit un pseudo, un e-mail et un mot de passe valides et accepte les documents légaux en vigueur, alors le compte est créé et un e-mail de vérification lui est envoyé.
- Étant donné un pseudo ou un e-mail déjà utilisé, lorsque le visiteur valide, alors l'inscription est refusée avec un message qui indique le champ concerné.
- Étant donné un membre qui n'a pas vérifié son e-mail, lorsqu'il tente de publier ou d'interagir, alors l'action est bloquée et un lien permet de renvoyer l'e-mail de vérification.
- Étant donné un lien de vérification expiré (plus de 24 h), lorsqu'il est ouvert, alors un nouveau lien est proposé.

**Règles :**
- **RG-01** — Le pseudo est unique (sans distinction de casse), de 3 à 30 caractères : lettres, chiffres, tiret et tiret bas.
- **RG-02** — L'e-mail est unique. Tant qu'il n'est pas vérifié, le compte est en lecture seule.
- **RG-04** — Politique de mot de passe conforme aux recommandations en vigueur, à fixer par le référent sécurité. Minimum proposé : 12 caractères, refus des mots de passe connus comme compromis, sans règle de composition arbitraire.
- RG-03 (section F-04).

#### F-02 — Connexion avec GitHub ou Google · Should

**Récit utilisateur :** En tant que visiteur, je veux m'inscrire et me connecter avec mon compte GitHub ou Google, afin de ne pas créer un mot de passe de plus.

**Critères d'acceptation**
- Étant donné un visiteur qui choisit GitHub ou Google, lorsque l'autorisation aboutit pour la première fois, alors il choisit un pseudo, accepte les documents légaux, et son compte est créé avec l'e-mail vérifié fourni par le service.
- Étant donné un membre existant connecté, lorsqu'il lie un compte GitHub ou Google dans ses paramètres, alors il peut ensuite se connecter par ce moyen.
- Étant donné un e-mail fourni par le service déjà associé à un autre compte, lorsque la connexion est tentée, alors aucun compte n'est fusionné automatiquement et le visiteur est invité à se connecter à son compte existant puis à lier le service.

#### F-03 — Connexion, déconnexion, réinitialisation du mot de passe · Must

**Critères d'acceptation**
- Étant donné des identifiants valides, lorsque le membre se connecte, alors il accède à son espace ; après 5 échecs consécutifs, de nouvelles tentatives sont temporisées.
- Étant donné un membre qui a oublié son mot de passe, lorsqu'il saisit son e-mail, alors un lien de réinitialisation valable 1 h est envoyé. Le message affiché est identique que l'e-mail existe ou non.
- Étant donné un membre connecté, lorsqu'il se déconnecte, alors sa session est fermée sur l'appareil courant.

#### F-04 — Acceptation versionnée des documents légaux · Must

**Récit utilisateur :** En tant qu'administrateur, je veux que chaque membre accepte la version en vigueur des CGU, de la politique de confidentialité et de la charte communautaire, afin de pouvoir le prouver.

**Critères d'acceptation**
- Étant donné une inscription, alors l'acceptation de chaque document est enregistrée avec sa version et sa date.
- Étant donné une nouvelle version d'un document entrée en vigueur, lorsqu'un membre se connecte, alors il doit l'accepter pour continuer à contribuer ; tant qu'il ne l'a pas fait, son compte est en lecture seule.

**Règles :**
- **RG-03** — Trois documents légaux sont requis : CGU, politique de confidentialité, charte communautaire. Le membre accepte la version en vigueur de chacun ; chaque acceptation est conservée avec sa date.

#### F-05 — Profil public · Must

**Récit utilisateur :** En tant que membre, je veux un profil public qui montre mon niveau, mes badges, mes statistiques et mes contributions, afin de faire reconnaître mon savoir-faire.

**Critères d'acceptation**
- Étant donné un profil, alors il affiche : pseudo, avatar, biographie, lien personnel, niveau, réputation, badges, statistiques publiques (F-73), créations publiées et dernières contributions publiques.
- Étant donné un membre, lorsqu'il modifie son avatar, sa biographie (500 caractères max.) ou son lien personnel, alors le profil est mis à jour.
- Étant donné un visiteur, alors il ne voit ni l'e-mail ni les statistiques privées du membre.

#### F-06 — Paramètres du compte · Must

**Critères d'acceptation**
- Étant donné un membre, il peut modifier son e-mail (avec vérification de la nouvelle adresse), son mot de passe, sa langue d'interface et sa préférence de notifications par e-mail.
- Étant donné un changement d'e-mail, alors une alerte est envoyée à l'ancienne adresse.

#### F-07 — Export des données personnelles · Must

**Récit utilisateur :** En tant que membre, je veux télécharger mes données, afin d'exercer mon droit d'accès et de portabilité.

**Critères d'acceptation**
- Étant donné une demande d'export, alors un fichier dans un format lisible par machine (JSON) est mis à disposition dans un délai maximal d'un mois, avec un lien de téléchargement valable 7 jours.
- Le fichier contient : données du compte, acceptations des documents légaux, contributions (créations, sujets, réponses, commentaires, reproductions, cas), votes émis, enregistrements, badges et mouvements de réputation.

#### F-08 — Suppression du compte · Must

**Récit utilisateur :** En tant que membre, je veux supprimer mon compte, afin d'exercer mon droit à l'effacement.

**Critères d'acceptation**
- Étant donné une demande de suppression confirmée par mot de passe ou par e-mail, alors le compte passe au statut « en suppression » : il est inaccessible aux autres et sa reconnexion dans les 30 jours annule la demande.
- Étant donné que 30 jours se sont écoulés, alors les données personnelles sont supprimées et les contributions sont rattachées à un pseudo anonyme « membre-supprimé-xxxx ».
- Étant donné que le membre a choisi, lors de sa demande, de supprimer aussi ses créations, alors ses créations sont supprimées à la même échéance.

**Règles :**
- **RG-05** — Suppression de compte selon D-09 : délai de 30 jours ; données personnelles effacées ; contributions anonymisées, sauf demande expresse de suppression des créations.
- **RG-06** — Les demandes d'exercice des droits sont traitées dans un délai maximal d'un mois.

---

### E2 — Créations et parcours

#### F-10 — Création « 1 prompt » · Must

**Récit utilisateur :** En tant que membre, je veux publier une création obtenue en un seul prompt, avec ses paramètres et son résultat, afin de la partager et de permettre aux autres de la reproduire.

**Critères d'acceptation**
- Étant donné un membre vérifié, lorsqu'il choisit « Nouvelle création » puis « 1 prompt », alors le formulaire propose : titre, objectif, catégorie, configuration IA (F-13), prompt, réponse obtenue, images, nombre d'essais, mode de sélection, limites constatées, liens externes, étiquettes, licence.
- Étant donné un formulaire incomplet au regard de RG-10 et RG-11, lorsque le membre demande la publication, alors elle est refusée et chaque champ manquant est signalé ; l'enregistrement en brouillon reste possible.
- Étant donné un nombre d'essais égal à 1, alors le mode de sélection est fixé à « premier essai ».

**Règles :**
- **RG-10** — Toute création a : un titre (10 à 120 caractères), un objectif (20 à 1 000 caractères), une catégorie, une licence, au moins une configuration IA et de 0 à 5 étiquettes. La description des limites constatées est facultative (2 000 caractères max.).
- **RG-11** — Une création « 1 prompt » a exactement une étape et exactement un échange. Le prompt est obligatoire ; la réponse textuelle ou au moins une image jointe à l'échange est obligatoire. Le nombre d'essais (≥ 1) et le mode de sélection (« premier essai » ou « meilleur parmi plusieurs essais ») sont obligatoires.

#### F-11 — Création « Itération » · Must

**Récit utilisateur :** En tant que membre, je veux publier une création obtenue au fil d'une conversation, échange par échange, afin de montrer comment j'ai guidé l'IA.

**Critères d'acceptation**
- Étant donné le type « Itération », alors le membre ajoute, ordonne et supprime des échanges (prompt et réponse) ; il peut joindre des images à chaque échange.
- Étant donné moins de deux échanges, lorsque la publication est demandée, alors elle est refusée.
- Étant donné un échange, le membre peut le marquer comme moment clé (F-14).

**Règles :**
- **RG-12** — Une création « Itération » a exactement une étape et au moins deux échanges ordonnés. Chaque échange a un prompt ; le dernier a une réponse ou au moins une image.

#### F-12 — Création « Projet » · Must

**Récit utilisateur :** En tant qu'experte, je veux publier un projet complet sous forme d'étapes, avec les prompts clés et les outils de chaque étape, afin de montrer ma méthode de bout en bout.

**Critères d'acceptation**
- Étant donné le type « Projet », alors le membre ajoute, ordonne et supprime des étapes ; chaque étape a un titre, un récit, et éventuellement des configurations IA et des échanges.
- Étant donné un projet sans résultat final (ni lien externe, ni image jointe à la création), lorsque la publication est demandée, alors elle est refusée.
- Étant donné un brouillon de projet, alors l'auteur peut le reprendre à tout moment ; la date de dernière modification est affichée.

**Règles :**
- **RG-13** — Une création « Projet » a au moins deux étapes ordonnées. Chaque étape a un titre (5 à 100 caractères) et un récit (au moins 50 caractères). Les échanges sont facultatifs. Le projet a au moins un résultat final : un lien externe (démo, dépôt de code, vidéo) ou une image jointe à la création.

#### F-13 — Configurations IA · Must

**Récit utilisateur :** En tant que membre, je veux indiquer l'outil, le modèle, les paramètres et le contexte caché de chaque étape, afin que d'autres puissent comprendre et reproduire mon résultat.

**Critères d'acceptation**
- Étant donné une étape, lorsque le membre ajoute une configuration, alors il choisit un outil dans le référentiel (obligatoire), un modèle dans le référentiel ou en texte libre s'il est absent (facultatif), puis saisit les paramètres et le contexte caché (facultatifs).
- Étant donné une étape de projet avec plusieurs configurations et des échanges, alors chaque échange indique la configuration utilisée.

**Règles :**
- **RG-14** — L'étape d'une création « 1 prompt » ou « Itération » a exactement une configuration. Une étape de projet a de 0 à N configurations, et au moins une si elle contient des échanges ; si elle en a plusieurs, chaque échange désigne la sienne. Un modèle absent du référentiel est saisi en texte libre (« modèle non référencé »), et seulement dans ce cas.

#### F-14 — Moments clés · Must

**Récit utilisateur :** En tant que créateur, je veux signaler les moments où j'ai corrigé, refusé ou réorienté l'IA, afin que les autres comprennent les décisions qui ont fait la différence.

**Critères d'acceptation**
- Étant donné une étape ou un échange, lorsque l'auteur ajoute un moment clé, alors il choisit un type (correction, refus, échec, changement d'outil, vérification, découverte) et rédige une explication.
- Étant donné une fiche création, alors les moments clés sont mis en évidence dans le parcours et listés en résumé en tête de fiche.

**Règles :**
- **RG-15** — Un moment clé est rattaché à une étape et, facultativement, à un échange de cette même étape. Type et explication (20 à 1 000 caractères) sont obligatoires. Un échange porte au plus un moment clé.

#### F-15 — Résultats, images et liens externes · Must

**Critères d'acceptation**
- Étant donné une création ou un échange, alors l'auteur peut joindre des images avec un texte alternatif obligatoire et une légende facultative.
- Étant donné une création, alors l'auteur peut ajouter des liens externes typés : démo, dépôt de code, vidéo, preuve (lien de partage de la conversation), article, autre.
- Étant donné un fichier non conforme (format ou taille), lorsque le membre le dépose, alors il est refusé avec la raison.
- Étant donné du code dans une réponse, alors il est affiché comme du texte mis en forme, jamais exécuté.

**Règles :**
- **RG-16** — Seules les images sont hébergées : PNG, JPEG, WebP ou GIF, 5 Mo maximum chacune. Une création compte 20 images maximum (images de la création et de ses échanges confondues). Un sujet, une réponse, une reproduction ou un cas Bon réflexe compte 5 images maximum. Les commentaires n'acceptent pas d'images. Les vidéos, démos et dépôts sont ajoutés par lien externe en HTTPS, 10 liens maximum par création.

#### F-16 — Brouillon, publication, modification, suppression · Must

**Critères d'acceptation**
- Étant donné une nouvelle création, alors elle est enregistrée en brouillon, visible de son seul auteur.
- Étant donné un brouillon complet, lorsque l'auteur demande la publication et coche « Je confirme ne publier aucune donnée personnelle de tiers ni aucun secret », alors la création est publiée et datée.
- Étant donné une création publiée, alors l'auteur peut la modifier (la date de modification est affichée), la dépublier (retour en brouillon) ou la supprimer.
- Étant donné une création publiée, alors son type ne peut plus être modifié.

**Règles :**
- **RG-17** — Statuts de publication : BROUILLON → PUBLIEE par l'auteur, si RG-10 à RG-16 sont respectées et la case de confirmation cochée. PUBLIEE → BROUILLON par l'auteur (dépublication) : la création et les contributions qui s'y rattachent (commentaires, reproductions) cessent d'être visibles jusqu'à republication.
- **RG-18** — Après publication, la modification est permise sauf pour le type ; la date de dernière modification est affichée.
- **RG-19** — La suppression par l'auteur est définitive pour les autres membres : la création, ses commentaires et ses reproductions ne sont plus visibles ; les variantes affichent « Création source supprimée » ; les mouvements de réputation liés sont annulés (RG-82).

#### F-17 — Licence · Must

**Critères d'acceptation**
- Étant donné une nouvelle création, alors la licence proposée par défaut est CC BY 4.0 (D-07) ; l'auteur peut la changer avant publication.
- Étant donné une fiche création, alors la licence est affichée avec un lien vers son texte.

**Règles :**
- **RG-20** — Licences proposées : CC BY 4.0, CC BY-SA 4.0, CC BY-NC 4.0, CC0 1.0, Tous droits réservés.

#### F-18 — Avertissement de données sensibles · Should

**Récit utilisateur :** En tant que membre, je veux être prévenu si mon contenu semble contenir un secret ou une donnée personnelle, afin de ne pas l'exposer par erreur.

**Critères d'acceptation**
- Étant donné une demande de publication, lorsque les champs texte contiennent un motif reconnu (clé d'API, jeton d'accès, adresse e-mail, numéro de téléphone), alors les passages concernés sont listés et la publication exige une confirmation explicite.

**Règles :**
- **RG-22** — La détection repose sur des motifs prédéfinis, sans appel à un modèle d'IA (C-02). Elle alerte mais ne bloque pas.

#### F-19 — Avertissement « instructions pour agent » · Should

**Critères d'acceptation**
- Étant donné une création, lorsque l'auteur ou un modérateur indique qu'elle contient des instructions destinées à un agent ayant accès à des fichiers, des commandes ou des services, alors une bannière d'avertissement est affichée sur la fiche et rappelée au moment de copier un prompt.

**Règles :**
- **RG-23** — L'indicateur « instructions pour agent » peut être positionné par l'auteur ou par un modérateur. Un indicateur positionné par un modérateur ne peut être retiré que par un modérateur. Toute action d'un modérateur sur cet indicateur est une décision de modération (RG-102).

#### F-20 — Variante d'une création · Should

**Récit utilisateur :** En tant que membre, je veux publier une version améliorée d'une création en créditant l'original, afin de faire progresser le travail des autres sans le leur prendre.

**Critères d'acceptation**
- Étant donné une création publiée dont la licence le permet, lorsque le membre choisit « Proposer une variante », alors une nouvelle création en brouillon est préremplie avec le type, la catégorie et la configuration de la source, et liée à elle.
- Étant donné une variante publiée, alors elle affiche « Variante de [titre] par [auteur] », la source affiche le nombre et la liste de ses variantes, et l'auteur de la source est notifié.

**Règles :**
- **RG-21** — Une variante a une seule création source, publiée et sous une licence autre que « Tous droits réservés ». Une création peut avoir plusieurs variantes. On ne peut pas créer de variante de sa propre création.

---

### E3 — Découverte

#### F-21 — Page d'accueil · Must

**Critères d'acceptation**
- Étant donné un visiteur, alors l'accueil présente la proposition de valeur, les créations les plus utiles de la semaine, les dernières créations publiées et un appel à l'inscription.
- Étant donné un membre, alors l'accueil présente aussi : le défi en cours s'il existe, les questions et cliniques sans réponse, un cas Bon réflexe auquel il n'a pas encore répondu.

**Règles :**
- **RG-32** — « Les plus utiles de la semaine » : contenus classés par nombre de votes « Utile » reçus sur les 7 derniers jours glissants.

#### F-22 — Recherche, filtres et tri · Must

**Critères d'acceptation**
- Étant donné une recherche par mots, alors les résultats incluent créations, sujets et cas Bon réflexe publiés et visibles, avec un onglet par type de contenu.
- Étant donné des filtres, alors le membre peut combiner : type de création, catégorie, outil, éditeur, modèle, étiquette, période de publication, « avec moments clés », « reproduite avec succès ».
- Étant donné des résultats, alors ils peuvent être triés par pertinence, date, votes « Utile » ou nombre de reproductions réussies.

**Règles :**
- **RG-30** — Visibilité : les visiteurs et les membres ne voient que les créations publiées et les contenus au statut visible. Un brouillon n'est visible que de son auteur. Un contenu masqué n'est visible que de son auteur (avec une mention) et des modérateurs.
- **RG-31** — La recherche porte sur les titres, objectifs, récits d'étapes, prompts, corps des sujets et des cas, et étiquettes.

#### F-23 — Fiche création · Must

**Critères d'acceptation**
- Étant donné une création publiée, alors la fiche présente dans cet ordre : titre, auteur et niveau, type, catégorie, étiquettes, licence, date de publication et de modification ; le résultat (images, réponse, liens) ; le résumé des moments clés ; le parcours (étapes, configurations, échanges, dépliables) ; les indicateurs de preuve et de fraîcheur (F-33) ; les reproductions ; les variantes ; les commentaires.
- Étant donné un projet de plus de 10 échanges, alors les échanges sont repliés par défaut et le récit des étapes reste visible.
- Étant donné une vue de la fiche, alors le compteur de vues de la création augmente au plus une fois par visiteur et par jour.

#### F-24 — Copier un prompt · Must

**Critères d'acceptation**
- Étant donné un échange, lorsque le membre ou le visiteur clique sur « Copier le prompt », alors le texte exact du prompt est copié dans le presse-papiers et une confirmation s'affiche.
- Étant donné une création marquée « instructions pour agent », alors un rappel d'avertissement s'affiche lors de la copie (RG-23).

#### F-25 — Pages catégorie et étiquette · Should

**Critères d'acceptation**
- Étant donné une catégorie (par exemple « Application web ») ou une étiquette, alors une page liste les créations, sujets et cas associés, les plus utiles en premier, avec les filtres de F-22.

#### F-26 — Partage externe · Should

**Critères d'acceptation**
- Étant donné une création, un sujet ou un profil, lorsque le membre clique sur « Partager », alors il peut copier le lien.
- Étant donné un lien partagé sur un réseau social ou une messagerie, alors l'aperçu affiche le titre, l'auteur et une image représentative.

---

### E4 — Évaluation et preuve

#### F-30 — Vote « Utile » · Must

**Critères d'acceptation**
- Étant donné un membre vérifié sur un contenu qui accepte ce vote (RG-41) et dont il n'est pas l'auteur, lorsqu'il clique sur « Utile », alors le vote est enregistré et le compteur mis à jour ; un second clic annule le vote.
- Étant donné son propre contenu, alors le bouton est inactif.

**Règles :**
- **RG-40** — Un membre émet au plus un vote de chaque type par contenu, peut l'annuler, et ne vote jamais pour ses propres contenus.
- **RG-41** — Le vote « Utile » s'applique aux créations publiées, aux sujets, aux réponses du forum et aux cas Bon réflexe validés. Le vote « Testé, ça marche » s'applique uniquement aux sujets de type Astuce. Il n'existe pas de vote négatif (D-02).

#### F-31 — Vote « Testé, ça marche » · Must

**Critères d'acceptation**
- Étant donné une astuce, lorsque le membre clique sur « Testé, ça marche », alors le vote est enregistré ; l'astuce affiche « Testée par N membres ».
- Les règles RG-40 et RG-41 s'appliquent.

#### F-32 — Reproduction (« J'ai essayé ») · Must

**Récit utilisateur :** En tant que membre, je veux indiquer ce que j'ai obtenu en essayant une création avec mes outils, afin d'aider les autres à savoir si elle fonctionne encore.

**Critères d'acceptation**
- Étant donné une création publiée de type « 1 prompt » ou « Itération » dont il n'est pas l'auteur, lorsque le membre déclare une reproduction, alors il renseigne : outil (obligatoire), modèle, résultat (succès, partiel, échec), retour, réponse obtenue et images facultatives.
- Étant donné un résultat partiel ou un échec, alors le retour est obligatoire.
- Étant donné une reproduction publiée, alors elle apparaît sur la fiche et l'auteur de la création est notifié.

**Règles :**
- **RG-42** — Seules les créations publiées « 1 prompt » et « Itération » peuvent être reproduites, et pas par leur auteur. Le retour est obligatoire (20 caractères minimum) pour un résultat partiel ou un échec. Un membre peut déclarer plusieurs reproductions d'une même création (par exemple avec des modèles différents) ; les points associés ne sont attribués qu'une fois par membre et par création (RG-80).

#### F-33 — Indicateurs de preuve et de fraîcheur · Must

**Critères d'acceptation**
- Étant donné une création reproductible, alors la fiche affiche : nombre de reproductions, taux de succès, date de la dernière reproduction et modèles avec lesquels elle a été reproduite avec succès.
- Étant donné une création ou une astuce, alors la fiche affiche sa date de publication, les modèles utilisés (pour une création) et les signalements d'obsolescence (F-35) au-delà du seuil défini en RG-44.

**Règles :**
- **RG-43** — Taux de succès = reproductions « succès » ÷ total des reproductions visibles. Il est affiché à partir de 3 reproductions ; en dessous, seul le décompte est affiché.

#### F-34 — Enregistrer un contenu · Should

**Critères d'acceptation**
- Étant donné une création, un sujet ou un cas, lorsque le membre clique sur « Enregistrer », alors le contenu est ajouté à sa liste privée « Enregistrés », consultable depuis son profil (visible de lui seul).

**Règles :**
- **RG-45** — Un membre enregistre au plus une fois un contenu ; la liste n'est visible que de lui.

#### F-35 — Signaler une obsolescence · Should

**Récit utilisateur :** En tant que praticien, je veux indiquer qu'un contenu ne fonctionne plus avec un modèle donné, afin d'éviter aux autres de perdre leur temps.

**Critères d'acceptation**
- Étant donné une création publiée ou une astuce, lorsque le membre choisit « Ne fonctionne plus avec… », alors il sélectionne un modèle du référentiel et peut ajouter une remarque.
- Étant donné un nombre de signalements distincts pour un même modèle atteignant le seuil, alors la fiche affiche la bannière « Signalé comme ne fonctionnant plus avec [modèle] par N membres » et l'auteur est notifié.

**Règles :**
- **RG-44** — Un membre signale au plus une fois un contenu pour un modèle donné. La bannière s'affiche à partir de 3 signalements distincts pour le même modèle. L'auteur ne peut pas signaler son propre contenu.

---

### E5 — Commentaires

#### F-40 — Commenter une création · Must

**Critères d'acceptation**
- Étant donné une création publiée, lorsque le membre publie un commentaire, alors il s'affiche avec son auteur et sa date, et l'auteur de la création est notifié.
- Étant donné son propre commentaire, alors le membre peut le modifier (mention « modifié ») ou le supprimer.

**Règles :**
- **RG-50** — Un commentaire compte de 1 à 5 000 caractères et porte sur une création publiée. Il peut être ancré à une étape ou à un échange de cette même création.
- **RG-51** — Un commentaire supprimé qui a des réponses est remplacé par « Commentaire supprimé » ; sinon il disparaît.

#### F-41 — Ancrer un commentaire sur une étape ou un échange · Should

**Critères d'acceptation**
- Étant donné une étape ou un échange d'une création, lorsque le membre clique sur « Commenter ce passage », alors le commentaire est rattaché à ce passage, affiché à côté de lui, et repris dans la liste générale avec un lien vers le passage.

#### F-42 — Répondre à un commentaire · Should

**Critères d'acceptation**
- Étant donné un commentaire, lorsque le membre y répond, alors la réponse s'affiche sous le commentaire et son auteur est notifié.
- Étant donné une réponse, alors on ne peut pas y répondre directement : la nouvelle réponse est rattachée au commentaire d'origine (un seul niveau).

---

### E6 — Forum

#### F-50 — Créer un sujet de forum · Must

**Récit utilisateur :** En tant que membre, je veux poser une question, demander de l'aide sur un prompt ou partager une astuce, afin d'apprendre et d'aider.

**Critères d'acceptation**
- Étant donné un membre vérifié, lorsqu'il crée un sujet, alors il choisit un type : Question, Clinique du prompt, Astuce, Retour d'expérience, Discussion.
- Étant donné le type Clinique du prompt, alors le corps est prérempli de quatre rubriques obligatoires : prompt utilisé, résultat obtenu, résultat attendu, outil et modèle.
- Étant donné un sujet publié, alors il est visible immédiatement et apparaît dans le forum et la recherche.

**Règles :**
- **RG-60** — Un sujet a un type, un titre (15 à 150 caractères), un corps (30 à 20 000 caractères) et de 1 à 5 étiquettes.
- **RG-62** — Le corps d'une Clinique du prompt contient les quatre rubriques obligatoires ; la publication est refusée si l'une est vide.

#### F-51 — Répondre à un sujet · Must

**Critères d'acceptation**
- Étant donné un sujet ouvert, lorsque le membre publie une réponse, alors elle s'affiche et l'auteur du sujet est notifié.
- Étant donné un sujet fermé, alors le bouton « Répondre » est absent.

**Règles :**
- **RG-64** — Une réponse compte de 20 à 20 000 caractères.

#### F-52 — Accepter une réponse · Must

**Critères d'acceptation**
- Étant donné une Question ou une Clinique, lorsque son auteur accepte une réponse d'un autre membre, alors elle est épinglée en tête, le sujet est marqué « Résolu » et l'auteur de la réponse est notifié.
- Étant donné une réponse déjà acceptée, lorsque l'auteur du sujet en accepte une autre, alors la précédente perd son statut et les points sont transférés (RG-82).

**Règles :**
- **RG-63** — Seuls les sujets Question et Clinique du prompt peuvent avoir une réponse acceptée, une seule à la fois, choisie par l'auteur du sujet parmi les réponses des autres membres. L'auteur peut retirer son acceptation. Un sujet est « Résolu » s'il a une réponse acceptée.

#### F-53 — Astuce avec exemple avant/après · Must

**Critères d'acceptation**
- Étant donné le type Astuce, alors les champs « Exemple avant » et « Exemple après » sont obligatoires et affichés côte à côte.
- Étant donné une astuce, alors elle peut recevoir les votes « Utile » et « Testé, ça marche » et des signalements d'obsolescence.

**Règles :**
- **RG-61** — Une astuce a un exemple avant et un exemple après, de 20 caractères minimum chacun.

#### F-54 — Lier un sujet à une création · Should

**Critères d'acceptation**
- Étant donné la création d'un sujet, lorsque le membre sélectionne une création publiée, alors le sujet affiche un lien vers elle et la fiche création liste les sujets qui la concernent.

**Règles :**
- **RG-66** — Un sujet concerne au plus une création, qui doit être publiée.

#### F-55 — Fermer et rouvrir un sujet · Should

**Critères d'acceptation**
- Étant donné un sujet, lorsque son auteur ou un modérateur le ferme, alors plus aucune réponse n'est possible ; le sujet reste lisible.

**Règles :**
- **RG-65** — L'auteur peut rouvrir un sujet qu'il a fermé lui-même ; un modérateur peut rouvrir tout sujet.

---

### E7 — Apprentissage

#### F-60 — Proposer un cas Bon réflexe · Must

**Récit utilisateur :** En tant qu'experte, je veux créer un cas d'entraînement à partir d'une vraie situation, afin d'apprendre aux débutants à juger une réponse de l'IA.

**Critères d'acceptation**
- Étant donné un membre de niveau Expert ou plus, ou un modérateur, lorsqu'il crée un cas, alors il renseigne : titre, contexte, demande faite à l'IA, réponse de l'IA, question posée à l'apprenant, de 2 à 5 options de réponse dont exactement une correcte, explication de chaque option, explication générale, difficulté, étiquettes.
- Étant donné un cas soumis, alors il passe au statut « proposé » et n'est visible que de son auteur et des modérateurs.

**Règles :**
- **RG-70** — Un cas a de 2 à 5 options, dont exactement une correcte, et de 0 à 5 étiquettes. L'explication générale est obligatoire (50 caractères minimum). La difficulté vaut Débutant, Intermédiaire ou Avancé.

#### F-61 — Valider un cas Bon réflexe · Must

**Critères d'acceptation**
- Étant donné un cas proposé, lorsqu'un modérateur autre que l'auteur le valide, alors il est publié et l'auteur est notifié.
- Étant donné un refus, alors un motif est obligatoire ; l'auteur peut modifier le cas et le soumettre à nouveau.

**Règles :**
- **RG-71** — Un cas est validé ou refusé par un modérateur qui n'en est pas l'auteur. Statuts : PROPOSE → VALIDE ou REFUSE ; REFUSE → PROPOSE après modification. Un cas validé et modifié par son auteur repasse au statut PROPOSE.

#### F-62 — Répondre à un cas Bon réflexe · Must

**Récit utilisateur :** En tant que débutante, je veux décider si j'accepte la réponse de l'IA, puis découvrir l'analyse de l'expert, afin d'apprendre à repérer les erreurs.

**Critères d'acceptation**
- Étant donné un cas validé, lorsque le membre choisit une option, alors sa réponse est enregistrée et il voit : la bonne option, l'explication de chaque option, l'explication générale et la répartition des réponses de la communauté.
- Étant donné un cas déjà répondu, alors le membre voit sa réponse d'origine et ne peut pas répondre à nouveau.
- Étant donné un visiteur, alors il voit le cas et peut répondre sans enregistrement ; il est invité à s'inscrire pour suivre ses progrès.

**Règles :**
- **RG-72** — Un membre répond une seule fois à un cas, et sa première réponse est définitive. L'auteur du cas ne peut pas y répondre. Les statistiques d'apprentissage d'un membre (cas répondus, cas réussis) ne sont visibles que de lui (RG-88).

#### F-63 — Créer et publier un défi · Should

**Critères d'acceptation**
- Étant donné un administrateur, lorsqu'il crée un défi, alors il renseigne : titre, énoncé, contraintes, date de début, date de fin ; le défi est en brouillon jusqu'à sa publication.
- Étant donné un défi publié dont la période est en cours, alors il apparaît sur l'accueil (F-21).

**Règles :**
- **RG-73** — Un défi dure de 1 à 30 jours (fin > début). Statuts : BROUILLON → PUBLIE → CLOTURE ; BROUILLON ou PUBLIE → ANNULE. Un défi publié ne peut plus changer de dates une fois commencé.

#### F-64 — Participer à un défi · Should

**Critères d'acceptation**
- Étant donné un défi en cours, lorsque le membre publie une création en la rattachant au défi, alors elle apparaît dans la liste des participations.
- Étant donné un membre qui participe déjà, alors il ne peut pas rattacher une seconde création au même défi.

**Règles :**
- **RG-74** — Une création participe à au plus un défi et doit être publiée pendant la période du défi. Un membre a au plus une participation par défi.

#### F-65 — Clôturer un défi et établir le classement · Should

**Critères d'acceptation**
- Étant donné un défi dont la date de fin est passée, lorsque l'administrateur le clôture, alors le classement est calculé, figé et publié ; les points et badges sont attribués et les participants notifiés.

**Règles :**
- **RG-75** — Le classement ordonne les participations visibles par nombre de votes « Utile » reçus pendant la période du défi. En cas d'égalité, la création publiée la première est classée devant. Les rangs sont figés à la clôture.

---

### E8 — Progression

#### F-70 — Réputation · Must

**Critères d'acceptation**
- Étant donné un événement du barème (RG-80), alors un mouvement de réputation est enregistré pour le bénéficiaire avec son motif et sa date.
- Étant donné un membre, alors sa réputation est la somme de ses mouvements, affichée avec un plancher à 0.

**Règles :** RG-80, RG-81, RG-82, RG-83 (section 5).

#### F-71 — Niveaux · Must

**Critères d'acceptation**
- Étant donné une réputation, alors le niveau affiché est le plus élevé dont le seuil est atteint (RG-84).
- Étant donné un changement de niveau à la hausse, alors le membre est notifié.

#### F-72 — Privilèges et limites par niveau · Must

**Critères d'acceptation**
- Étant donné un membre de niveau Curieux qui a atteint une limite quotidienne, lorsqu'il tente une nouvelle publication, alors elle est refusée avec l'heure à laquelle il pourra publier à nouveau.

**Règles :** RG-85 (section 5).

#### F-73 — Statistiques du profil · Must

**Critères d'acceptation**
- Étant donné un profil public, alors il affiche : créations publiées, reproductions reçues et taux de succès, réponses acceptées, votes « Utile » reçus, vues cumulées des contenus publiés.
- Étant donné son propre profil, alors le membre voit aussi ses statistiques d'apprentissage : cas répondus, cas réussis, reproductions déclarées.

**Règles :** RG-88 (section 5).

#### F-74 — Badges · Should

**Critères d'acceptation**
- Étant donné un critère de badge rempli (RG-86), alors le badge est attribué automatiquement, une seule fois, et le membre est notifié.
- Étant donné un profil, alors les badges sont affichés avec leur date d'obtention et leur critère.

#### F-75 — Classements · Should

**Critères d'acceptation**
- Étant donné la page Classements, alors elle affiche le classement de la semaine et le classement général, limités aux 50 premiers.

**Règles :** RG-87 (section 5).

---

### E9 — Notifications

#### F-80 — E-mails transactionnels · Must

**Critères d'acceptation**
- Étant donné un événement de la liste RG-90, alors un e-mail est envoyé ; ces e-mails ne peuvent pas être désactivés.

**Règles :**
- **RG-90** — E-mails transactionnels : vérification d'adresse, réinitialisation du mot de passe, changement d'adresse, nouvelle version d'un document légal, décision de modération concernant le membre, demande et confirmation de suppression du compte, export des données prêt.

#### F-81 — Notifications dans l'application · Should

**Critères d'acceptation**
- Étant donné un événement de la liste RG-91, alors une notification est créée pour le destinataire ; un compteur de notifications non lues est affiché.
- Étant donné une notification, lorsque le membre la consulte, alors elle passe à « lue » et mène au contenu concerné.
- Étant donné un membre qui a activé la préférence e-mail, alors les notifications « réponse à mon sujet » et « réponse acceptée » sont aussi envoyées par e-mail.

**Règles :**
- **RG-91** — Événements notifiés : commentaire sur ma création ; réponse à mon commentaire ; réponse à mon sujet ; ma réponse acceptée ; reproduction de ma création ; variante de ma création ; obsolescence signalée au-delà du seuil sur mon contenu ; votes « Utile » reçus (regroupés par contenu et par jour) ; badge obtenu ; niveau atteint ; cas Bon réflexe validé ou refusé ; résultat d'un défi auquel j'ai participé ; contenu masqué ou rétabli ; décision de modération me concernant.

---

### E10 — Modération

#### F-90 — Signaler un contenu · Must

**Critères d'acceptation**
- Étant donné un contenu dont il n'est pas l'auteur, lorsque le membre le signale, alors il choisit un motif et peut ajouter une précision ; le signalement entre dans la file de modération.
- Étant donné un signalement déjà ouvert du même membre sur le même contenu, alors un second signalement est refusé.

**Règles :**
- **RG-100** — Motifs : spam, contenu illicite, contenu dangereux, données personnelles, plagiat, harcèlement, hors sujet, autre. La précision est obligatoire pour « autre ». Un membre a au plus un signalement ouvert par contenu et ne signale pas ses propres contenus.

#### F-91 — File de modération et décisions · Must

**Récit utilisateur :** En tant que modérateur, je veux traiter les signalements depuis une file unique, afin de décider vite et de façon équitable.

**Critères d'acceptation**
- Étant donné la file, alors elle liste les contenus signalés, du plus ancien au plus récent, avec le nombre et les motifs de signalements, le contenu, son auteur et l'historique de modération de celui-ci.
- Étant donné un contenu signalé, lorsque le modérateur prend une décision, alors il choisit une action (aucune, masquer, rétablir, supprimer, avertir, suspendre) et rédige un motif ; tous les signalements ouverts de ce contenu sont clos comme fondés ou non fondés.
- Étant donné une suspension, alors le modérateur indique sa durée (1 à 90 jours).
- Étant donné un administrateur, alors il dispose en plus des actions : bannir un compte, ajuster la réputation d'un membre, retirer un badge.

**Règles :**
- **RG-102** — Toute décision a une action et un motif obligatoires ; elle est journalisée et n'est plus modifiable. Une erreur se corrige par une nouvelle décision (par exemple « rétablir »). Actions des modérateurs : aucune, masquer, rétablir, supprimer, avertir, suspendre, ajouter ou retirer l'avertissement « instructions pour agent ». Une décision « aucune » ou « rétablir » clôt les signalements ouverts du contenu comme non fondés ; toute autre action les clôt comme fondés. Actions réservées aux administrateurs : bannir, ajuster la réputation (fraude avérée), retirer un badge.
- **RG-103** — Un compte suspendu peut se connecter, lire et gérer ses paramètres, mais ne peut ni publier ni interagir jusqu'à la date de fin de suspension. Le bannissement, réservé aux administrateurs, ferme définitivement le compte.
- **RG-104** — Un modérateur ne prend aucune décision sur un contenu dont il est l'auteur ni sur son propre compte.
- **RG-105** — Délai cible de traitement d'un signalement : 72 h (O-07).

#### F-92 — Information de l'auteur et journal des décisions · Must

**Critères d'acceptation**
- Étant donné une décision qui concerne un contenu ou un membre, alors l'auteur ou le membre est notifié et reçoit un e-mail indiquant l'action, le motif et le contenu concerné.
- Étant donné un administrateur, alors il peut consulter le journal de toutes les décisions, filtrable par modérateur, membre, action et période.

#### F-93 — Masquage automatique au seuil de signalements · Should

**Critères d'acceptation**
- Étant donné un contenu qui atteint le seuil de RG-101, alors il est masqué en attente de décision, l'auteur est notifié et le contenu remonte en tête de la file de modération.

**Règles :**
- **RG-101** — Un contenu est masqué automatiquement lorsqu'il a 3 signalements ouverts émanant de 3 membres distincts de niveau Apprenti ou plus.

---

### E11 — Administration

#### F-95 — Gestion des référentiels · Must

**Critères d'acceptation**
- Étant donné un administrateur, alors il crée, modifie et archive : éditeurs, outils, modèles, catégories, étiquettes, licences, badges, niveaux, documents légaux, types de vote.
- Étant donné un élément utilisé par au moins un contenu, alors il ne peut pas être supprimé, seulement archivé.

**Règles :**
- **RG-110** — Un outil archivé ou un modèle retiré reste affiché sur les contenus existants mais n'est plus proposé dans les nouvelles saisies.
- **RG-112** — Une nouvelle version d'un document légal a une date d'effet ; à cette date, elle remplace la précédente et son acceptation est exigée (RG-03).

#### F-96 — Gestion des rôles · Must

**Critères d'acceptation**
- Étant donné un administrateur, alors il attribue ou retire les rôles Modérateur et Administrateur à un membre ; chaque changement est journalisé.

**Règles :**
- **RG-111** — Seul un administrateur modifie les rôles. La plateforme compte toujours au moins un administrateur actif. La double authentification est obligatoire pour les modérateurs et les administrateurs (ENF-05).

#### F-97 — Tableau de bord des indicateurs · Should

**Critères d'acceptation**
- Étant donné un administrateur, alors le tableau de bord affiche, par semaine et par mois : l'indicateur North Star et les indicateurs O-01 à O-08 du document 01, avec leur cible.

---

## 5. Règles de gestion transverses

### RG-80 — Barème de réputation

| Événement | Bénéficiaire | Points | Motif enregistré |
|---|---|---|---|
| Vote « Utile » reçu sur une création | Auteur de la création | +10 | VOTE_UTILE_RECU |
| Vote « Utile » reçu sur un sujet, une réponse ou un cas | Auteur du contenu | +5 | VOTE_UTILE_RECU |
| Vote « Testé, ça marche » reçu sur une astuce | Auteur de l'astuce | +5 | VOTE_TESTE_RECU |
| Reproduction « succès » déclarée par un autre membre (une fois par membre et par création) | Auteur de la création | +5 | REPRODUCTION_REUSSIE_RECUE |
| Réponse acceptée | Auteur de la réponse | +15 | REPONSE_ACCEPTEE |
| Acceptation d'une réponse | Auteur du sujet | +2 | ACCEPTATION_REPONSE |
| Première reproduction déclarée d'une création donnée | Membre qui reproduit | +2 | REPRODUCTION_DECLAREE |
| Cas Bon réflexe validé | Auteur du cas | +10 | CAS_VALIDE |
| Bonne réponse à un cas Bon réflexe | Membre qui répond | +1 | CAS_REUSSI |
| Participation à un défi, à la clôture | Participant | +5 | PARTICIPATION_DEFI |
| 1re, 2e, 3e place d'un défi | Participant | +50, +30, +20 | PODIUM_DEFI |
| Annulation d'un vote, d'une acceptation, ou retrait d'un contenu par son auteur ou par la modération | Bénéficiaire initial | Opposé des points accordés | ANNULATION |
| Correction manuelle par un administrateur (fraude avérée) | Membre concerné | Variable, motif obligatoire | AJUSTEMENT_MODERATION |

Les valeurs sont paramétrables et seront ajustées après la bêta fermée.

- **RG-81** — Les points issus des votes reçus (« Utile » et « Testé, ça marche ») sont plafonnés à 200 par jour et par membre. Les autres motifs ne sont pas plafonnés.
- **RG-82** — Toute annulation (vote retiré, réponse « désacceptée », contenu supprimé ou masqué) génère un mouvement opposé au mouvement initial. Un contenu rétabli après masquage génère de nouveau les mouvements annulés.
- **RG-83** — La réputation est la somme des mouvements du membre ; elle est affichée avec un plancher à 0.

### RG-84 — Niveaux

| Rang | Niveau | Seuil de réputation |
|---|---|---|
| 1 | Curieux | 0 |
| 2 | Apprenti | 50 |
| 3 | Artisan | 300 |
| 4 | Expert | 1 500 |
| 5 | Maître | 5 000 |

Le niveau est recalculé en permanence et peut baisser si la réputation baisse. Les seuils sont paramétrables.

### RG-85 — Privilèges et limites par niveau

| Droit ou limite | Curieux | Apprenti | Artisan | Expert | Maître |
|---|---|---|---|---|---|
| Créations publiées par 24 h | 3 | 10 | 10 | Sans limite | Sans limite |
| Sujets publiés par 24 h | 3 | 10 | 10 | Sans limite | Sans limite |
| Réponses et commentaires par 24 h | 20 | 100 | 100 | Sans limite | Sans limite |
| Liens externes par contenu | 2 | RG-16 | RG-16 | RG-16 | RG-16 |
| Signalement pris en compte pour le masquage automatique (RG-101) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Proposer un cas Bon réflexe (RG-70) | ❌ | ❌ | ❌ | ✅ | ✅ |

Les modérateurs et administrateurs ne sont soumis à aucune de ces limites.

### RG-86 — Badges initiaux

| Code | Badge | Critère | Catégorie |
|---|---|---|---|
| PIONNIER | Pionnier | Être inscrit pendant la bêta fermée | Communauté |
| PREMIERE_CREATION | Première création | Publier sa première création | Contribution |
| PARCOURS_COMPLET | Parcours complet | Publier un projet d'au moins 3 étapes et au moins 1 moment clé | Contribution |
| REPRODUCTIBLE | Reproductible | Avoir une création reproduite avec succès par au moins 5 membres distincts | Contribution |
| ASTUCIEUX | Astucieux | Avoir une astuce qui reçoit au moins 10 votes « Testé, ça marche » | Contribution |
| PREMIER_ESSAI | Premier essai | Déclarer sa première reproduction | Apprentissage |
| BON_REFLEXE | Bon réflexe | Réussir 10 cas Bon réflexe | Apprentissage |
| ASSIDU | Assidu | Répondre à 50 cas Bon réflexe | Apprentissage |
| PREMIER_COUP_DE_MAIN | Premier coup de main | Obtenir sa première réponse acceptée | Communauté |
| MENTOR | Mentor | Obtenir 10 réponses acceptées | Communauté |
| VIGILANT | Vigilant | Avoir 5 signalements jugés fondés | Communauté |
| PARTICIPANT | Participant | Participer à un défi clôturé | Communauté |
| PODIUM | Podium | Terminer dans les 3 premiers d'un défi | Communauté |

Un badge est attribué une seule fois et conservé même si le critère cesse d'être rempli, sauf retrait par un administrateur en cas de fraude avérée.

### RG-87 — Classements

- **Classement de la semaine :** réputation gagnée du lundi 00:00 au dimanche 23:59 (UTC).
- **Classement général :** réputation totale.
- Les membres suspendus, bannis ou en cours de suppression sont exclus. Les 50 premiers sont affichés.

### RG-88 — Statistiques du profil

| Statistique | Visibilité |
|---|---|
| Créations publiées | Publique |
| Reproductions reçues et taux de succès (RG-43) | Publique |
| Réponses acceptées | Publique |
| Votes « Utile » reçus | Publique |
| Vues cumulées des contenus publiés | Publique |
| Cas Bon réflexe répondus et réussis | Membre seul |
| Reproductions déclarées | Membre seul |

---

## 6. Hors périmètre du MVP

### 6.1 Could

| ID | Fonctionnalité | Commentaire |
|---|---|---|
| F-27 | Ouvrir le prompt directement dans son outil d'IA | Dépend des possibilités de chaque outil |
| F-98 | Proposer un outil ou un modèle manquant au référentiel | En attendant, saisie en texte libre (RG-14) |
| F-99 | Records (création la plus reproduite par catégorie, outil, modèle) | Calculable à partir des données existantes |

### 6.2 Won't (MVP)

| Fonctionnalité | Version cible ou motif |
|---|---|
| Carnéo | V2 (D-01) |
| Revue de méthode par un expert | V2 |
| Parcours guidés | V2 |
| Profil de méthode | V2 |
| Abonnement à un membre | V2 |
| Types de création « Agent » et « Chaîne d'outils » distincts | V2 (D-04) |
| Historique des versions d'une création | V2 |
| Récapitulatif périodique par e-mail | V2 |
| Vote négatif | À réévaluer après la bêta (D-02) |
| Messagerie privée | À réévaluer |
| Offres écoles et formateurs ; bilans par modèle ; formats ouverts d'import et d'export | V3 |
| Génération ou exécution de prompts sur la plateforme | Exclu durablement (D-05) |
| Marketplace payante | Exclu durablement |
| Publication de contenus de tiers sans leur consentement | Exclu durablement (PR-02) |
| Hébergement de vidéos | Exclu du MVP (C-03) |
| Application mobile native | Exclu du MVP |

---

## 7. Exigences non fonctionnelles

| ID | Domaine | Exigence |
|---|---|---|
| ENF-01 | Accessibilité | Conformité WCAG 2.2 niveau AA. Texte alternatif obligatoire pour les images (RG-16). |
| ENF-02 | Compatibilité | Affichage adapté à partir de 360 px de large ; deux dernières versions majeures de Chrome, Edge, Firefox et Safari. |
| ENF-03 | Performance | Pages publiques au 75e centile : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. |
| ENF-04 | Référencement | Créations publiées, sujets, cas validés et profils indexables ; adresses lisibles ; titre et description propres à chaque page ; aperçus de partage (F-26). Brouillons et contenus masqués non indexés. |
| ENF-05 | Sécurité | HTTPS partout ; traitement des risques de l'OWASP Top 10 (édition en vigueur) ; mots de passe stockés sous forme d'empreinte avec un algorithme adapté ; double authentification obligatoire pour modérateurs et administrateurs ; limitation des tentatives de connexion (F-03). |
| ENF-06 | Sécurité des contenus | Aucun contenu soumis n'est exécuté : mise en forme assainie, code affiché comme texte. Les liens externes publiés par les membres sont signalés aux moteurs de recherche comme contenus d'utilisateurs, non recommandés. |
| ENF-07 | Données personnelles | Registre des traitements ; minimisation des données ; exercice des droits (accès, rectification, effacement, portabilité, opposition) sous un mois (RG-06) ; uniquement des cookies strictement nécessaires sans consentement ; localisation de l'hébergement conforme à C-05. |
| ENF-08 | Disponibilité et sauvegarde | Disponibilité mensuelle cible de 99,5 % hors maintenance annoncée ; sauvegarde quotidienne conservée 30 jours ; perte de données maximale de 24 h ; restauration testée chaque trimestre. |
| ENF-09 | Traçabilité | Décisions de modération, changements de rôle et actions d'administration journalisés et conservés au moins 1 an. |
| ENF-10 | Coût | Aucun appel à un modèle d'IA (C-02) ; limites sur les médias (RG-16) ; suivi mensuel des coûts d'hébergement. |
| ENF-11 | Internationalisation | Textes de l'interface externalisés pour la traduction ; français au lancement (D-06) ; dates et nombres au format de la langue choisie ; contenus acceptés dans toutes les langues. |
| ENF-12 | Mesure | Mesure d'audience respectueuse de la vie privée, permettant de calculer la North Star et les indicateurs O-01 à O-08. |

---

## 8. Définition de prêt et de terminé

**Une fonctionnalité est prête à être développée lorsque :**
- son récit utilisateur et ses critères d'acceptation sont rédigés et validés par le chef de projet ;
- ses règles de gestion sont identifiées ;
- sa maquette est validée (pour les fonctionnalités avec interface) ;
- ses dépendances sont levées.

**Une fonctionnalité est terminée lorsque :**
- tous ses critères d'acceptation passent en test ;
- elle respecte les exigences ENF-01 à ENF-12 qui la concernent ;
- les textes de l'interface sont relus ;
- elle est déployée en préproduction et validée par le chef de projet ;
- la documentation utilisateur est mise à jour si nécessaire.
