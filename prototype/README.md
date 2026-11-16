# Prototype de référence

Le prototype de Vysora : pages en HTML, CSS et JavaScript natifs, avec des données et des états simulés. C'est la référence visuelle et fonctionnelle du produit, et l'endroit où l'on montre toute évolution d'une vue avant de la réaliser.

- **Origine** : copié du dépôt `vysora` au commit `39408ff` (19 octobre 2026), sans les captures d'écran (`preview/`) ni les images sources non utilisées. Depuis le 16 novembre 2026, il vit et évolue **ici** ([ADR-0010](../docs/decisions/0010-demo-prototype-avant-les-vues.md)) ; le dépôt `vysora` n'en est plus la source (ses documents sont repris dans `docs/produit/`, ses skills de conception restent consultables dans son dossier `skills/`).
- **Le consulter** : `pnpm prototype`, puis http://localhost:5173. Les fichiers sont servis tels quels, sans cache : un rechargement montre la dernière version. Le bouton « Tweaks » de chaque page montre ses états (visiteur, membre, rôles, compte en lecture seule…) et ses variantes visuelles ; le produit garde les valeurs par défaut.
- **Le porter dans le site** : [`../docs/portage-prototype.md`](../docs/portage-prototype.md).

## Démo d'abord

Toute modification d'une vue du site (page, écran, composant visible, état, interaction, texte affiché) commence ici :

1. **Brief** : objectif de la vue, ce qui doit y figurer, ce qui ne doit pas y figurer, manière de le présenter. En cas de doute sur un visuel central, proposer l'interprétation retenue avant de la construire.
2. **Démo** dans `prototype/`, avec les règles ci-dessous : nouvelle page, ou page existante modifiée, avec ses états dans le panneau Tweaks.
3. **Vérification** à 1280, 820 et 375 px de large, dans les états concernés (au moins visiteur, membre, compte en lecture seule ; auteur et modération le cas échéant), au clavier et avec les animations réduites.
4. **Proposition** au porteur du projet : adresse de la page (`http://localhost:5173/<page>.html`), états à essayer dans Tweaks, captures, ce qui change par rapport au site.
5. **Validation** : seulement alors, on implémente dans `apps/web` (et `apps/api` au besoin), et la validation se note dans « Décisions prises » de [`../docs/registre.md`](../docs/registre.md). Une démo refusée se retire ou se reprend ; la démo retenue reste dans le prototype.

Pas de démo pour porter ce que le prototype montre déjà, ni pour un changement sans effet visible. Une correction urgente (sécurité, page cassée) passe d'abord dans le site, puis se reporte ici.

## Règles de développement

- **Technique** : HTML, CSS pur, JavaScript natif. Aucun framework, aucune dépendance, aucune construction, aucun backend : les données, les états et les parcours sont simulés dans le navigateur.
- **Données simulées** : celles d'une page vont dans son propre fichier (`<page>-data.js`), pas dans `data.js`. Elles ressemblent à de vraies données (noms, dates, volumes plausibles) et couvrent les cas difficiles (texte long, liste vide, aucun résultat).
- **États** : chaque page charge `etats.css` puis `etats.js` dans `<head>`, sans `defer`, puis `commun.js` et ses scripts. Les états communs (session, rôle, niveau, compte, notifications) se lisent avec `V.etats` (`membre()`, `get()`, `niveau()`, `peut(action)`) et la page se re-rend dans `V.etats.on(…)` ; jamais de « connecté » écrit en dur. Une action réservée passe par `V.exiger(action, quoi)` (ou `data-exige` et `data-exige-quoi`) ; un élément réservé porte `data-pour="visiteur" | "membre" | "moderation" | "administration"` ; un formulaire réservé laisse place à `V.invitation(…)` ou `V.accesBloc(…)`.
- **Panneau Tweaks** : composant partagé, obtenu par `V.initTweaks({ key, etats, apparence, defaults, onChange })` (`commun.js`), avec un onglet « États » (états propres à la page : point de vue, statut du contenu, liste vide, limite atteinte…) et un onglet « Apparence » (variantes visuelles à comparer). Jamais écrit dans le HTML. Un réglage `nom` devient l'attribut `data-nom` sur `<html>` : ne pas employer `[data-nom]` comme sélecteur d'élément.
- **Composants partagés** : en-tête, compte, notifications, logos d'outils, avatars, types de création et aperçus dans `commun.js` et `commun.css` ; recherche du site dans `recherche.js` et `recherche.css` (loupe `data-recherche-ouvrir`, Ctrl K). Ce qui vaut pour toutes les pages, accueil compris, et que le site rend dans son gabarit (fenêtre des cookies, barre de défilement) est chargé par `etats.js`.
- **Accueil verrouillé** : `index.html`, `styles.css`, `app.js` et `data.js` ne changent que si le rendu de l'accueil reste identique, vérifié par captures avant et après, sauf demande explicite.
- **Conception** : charte graphique ([`../docs/produit/06-charte-graphique.md`](../docs/produit/06-charte-graphique.md), en particulier les règles d'interface de la section 13), pages responsives et accessibles, navigation au clavier, préférence de réduction des animations respectée. Un écran sans maquette (modération, administration) reprend le style des écrans existants.
- **Textes** : finis et professionnels, vouvoiement, typographie française ([`../docs/produit/08-guide-redaction.md`](../docs/produit/08-guide-redaction.md)) ; ni commentaire ni note de développement à l'écran.
- **Feuilles de style partagées avec le site** : une feuille reprise par le site (`apps/web/src/styles/`) reste identique des deux côtés. Une feuille propre au site (`*-complements.css`, `moderation.css`, `cookies.css`, `defilement.css`…) a la même copie ici, chargée par la page de démo concernée ; une démo validée qui modifie l'une ou l'autre se recopie telle quelle dans le site.
- **Le prototype n'est pas une transcription** des documents produit : il propose la meilleure réponse pour le projet, et le porteur du projet valide chaque proposition.

## Fichiers

- `<page>.html`, `<page>.css`, `<page>.js`, `<page>-data.js` : une page, ses styles, son script et ses données simulées.
- `commun.*`, `etats.*`, `recherche.*` : composants et états partagés.
- `assets/` : polices, logos, logos des outils d'IA, avatars, images des créations simulées.
- `src/` : scripts de contrôle employés pendant la conception de certaines pages, sans rôle dans l'affichage.
