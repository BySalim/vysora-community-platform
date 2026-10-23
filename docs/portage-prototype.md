# Porter une page du prototype

> Objectif : une **représentation exacte et complète** du prototype, alimentée par de vraies données.
> Le prototype (`prototype/`, servi par `pnpm prototype` sur http://localhost:5173) est la référence visuelle et fonctionnelle.
> La page Contact (`apps/web/src/pages/contact.astro`, `src/scripts/contact.ts`) est l'exemple complet à suivre.

## 1. Méthode

1. **Lire la page du prototype** : son HTML, sa feuille de style, son script et ses fichiers de données (tableau ci-dessous). Repérer ce qui est simulé (données `*-data.js`, états du panneau Tweaks) et ce qui doit venir de l'API.
2. **Styles** : recopier la feuille de style de la page **sans la modifier** dans `apps/web/src/styles/` et l'importer dans la page après le gabarit (`import Base…` puis `import '../styles/x.css'`). `styles.css`, `commun.css` et `etats.css` sont déjà chargés par le gabarit. Un ajout nécessaire va dans `socle.css` ou un fichier nouveau.
3. **Balisage** : créer la route (tableau ci-dessous) avec `layouts/Base.astro` et y recopier le contenu de `<main>`. Reporter :
   - les classes de `<body>` (`classeCorps`), ses attributs `data-*` (`donneesCorps`), la classe de `<main>` (`classeMain`) ;
   - les attributs `data-*` propres à la page posés sur `<html>` (`reglages`) avec leurs **valeurs par défaut** : ce sont les variantes retenues ; le panneau Tweaks n'est pas repris ;
   - les icônes du sprite de la page (`icones`) ; une icône dessinée autrement que dans `src/lib/icones.ts` passe par `remplacementsIcones` ;
   - les liens : `ROUTES` (`src/lib/navigation.ts`) à la place des fichiers `.html`.
4. **Données** : remplacer les fichiers `*-data.js` par l'API. Ce qui structure la page et compte pour le référencement est rendu côté serveur (composants Astro) ; ce qui réagit aux actions reste dans le script de page. Garder la forme des données du prototype quand c'est possible : le portage du script en est simplifié.
5. **Script** : porter le JavaScript de la page en TypeScript dans `src/scripts/<page>.ts`, avec les outils de `src/scripts/commun/` (`$`, `$$`, `icon`, `t`, `toast`, `corrigerTypographie`, `etats`). Les simulations disparaissent : envoi réel à l'API, erreurs RFC 9457 affichées champ par champ, état du bouton pendant l'envoi.
6. **États** : la personne qui consulte vient du serveur (`Astro.locals.etat`, `data-pour` dans le HTML, `etats.peut()` dans les scripts). Les états propres à la page (brouillon, sujet fermé, liste vide…) se déduisent des données.
7. **Vérifier côte à côte** avec le prototype, à 1280, 820 et 375 px de large, dans les états concernés (visiteur, membre, lecture seule, auteur, modération), clavier et animations réduites compris. Noter tout écart volontaire dans le registre.

## 2. Pages du prototype

Réglages communs à toutes les pages, déjà posés par le gabarit : `accent=blue density=standard radius=charte effects=standard motion=full`.

| Page du prototype | Route proposée (plan du site) | `<body>` | `<main>` | Réglages `<html>` propres à la page | Styles de la page | Scripts et données | État |
|---|---|---|---|---|---|---|---|
| `index.html` | `/` | `accueil` | — | `herolead=court herowaves=houle herolimit=text heroblue=deep herobg=constellation herosize=full band=dark cards=path eyebrow=icon toolsbg=trame methodfocus=suivi` | (dans `styles.css`) | `accueil-hero.js`, `app.js`, `data.js` | À porter |
| `explorer.html` | `/explorer` | `ex` | — | `apercu=recherche index=detail trace=chemin order=methode` | `explorer.css` | `explorer-data.js`, `explorer-modele.js`, `explorer.js` | À porter |
| `categorie.html` | `/categories/[slug]`, `/etiquettes/[slug]` | `ex dm` | — | `gallery=grille mosaic=images order=guides` | `explorer.css`, `categorie.css` | `explorer-data.js`, `explorer-modele.js`, `categorie.js` | À porter |
| `fiche-creation.html` | `/creations/[id]-[slug]` | `creation-page` | `creation-shell` | — | `fiche-creation.css` | `creation-details.js`, `explorer-data.js`, `fiches-explorer.js`, `fiche-brouillon.js`, `creation-page-data.js`, `fiche-creation.js` | À porter |
| `nouvelle-creation.html` | `/creations/nouvelle`, `/creations/[id]/modifier` | `pub-page` | `pub` | états simulés (`contenu`, `exemple`, `donnees`, `agent`, `defi`, `quota`) + `indications=visibles largeur=standard` | `nouvelle-creation.css` | `explorer-data.js`, `creation-details.js`, `nouvelle-creation-data.js`, `explorer-modele.js`, `nouvelle-creation.js` | À porter |
| `forum.html` | `/forum`, `/forum/[id]-[slug]`, `/forum/nouveau` | `ex qa` | — | `resume=complet compteurs=colonne menu=gauche solution=diff` | `explorer.css`, `forum.css` | `explorer-data.js`, `forum-data.js`, `explorer-modele.js`, `forum.js` | À porter |
| `apprendre.html` (`bon-reflexe.html` y renvoie) | `/apprendre` (rubriques), cas : `/bon-reflexe/[id]-[slug]` (à confirmer) | `ex ap` | — | `bases=frise resumes=oui bande=sombre avantapres=cote` | `explorer.css`, `apprendre.css` | `explorer-data.js`, `apprendre-data.js`, `explorer-modele.js`, `apprendre.js` | À porter |
| `defis.html` | `/defis`, `/defis/[id]-[slug]` | `df` | — | — | `defis.css` | `classements-data.js`, `defis-data.js`, `defis.js` | À porter |
| `classements.html` | `/classements` | `ex cl` | — | `palmares=rangees preuves=detaillees mesure=faits teintes=palette bande=sombre` | `explorer.css`, `classements.css` | `explorer-data.js`, `classements-data.js`, `classements.js` | À porter |
| `profil.html` | `/membres/[pseudo]` | `pf` | — | — | `profil.css` | `nouvelle-creation-data.js`, `profil-data.js`, `profil.js` | À porter |
| `mes-contenus.html` | `/mes-contenus` | `mc` | — | — | `mes-contenus.css` | `explorer-data.js`, `nouvelle-creation-data.js`, `profil-data.js`, `mes-contenus-data.js`, `mes-contenus.js` | À porter |
| `notifications.html` | `/notifications` | `nt` | — | — | `notifications.css` | `nouvelle-creation-data.js`, `profil-data.js`, `notifications-data.js`, `notifications.js` | À porter |
| `parametres.html` | `/parametres` (et sous-routes ou onglets) | `pa` | — | — | `parametres.css` | `nouvelle-creation-data.js`, `profil-data.js`, `auth-data.js`, `parametres-data.js`, `auth.js`, `parametres.js` | À porter |
| `connexion.html` | `/connexion` (+ mot de passe oublié, réinitialisation) | `auth`, `data-page="connexion" data-sans-garde` | `auth-scene` | `auth-motif=relief auth-fond=bleu auth-ambiance=profondeur auth-voile=assombri auth-teinte=pale auth-largeur=standard auth-services=avant` | `auth.css` | `auth-data.js`, `auth.js`, `connexion.js` | **Fait** (sauf deux étapes : SEC-02) |
| `inscription.html` | `/inscription` (+ vérification de l'e-mail) | `auth`, `data-page="inscription" data-sans-garde` | `auth-scene` | identiques à la connexion | `auth.css` | `auth-data.js`, `auth.js`, `inscription.js` | **Fait** (sauf invitation : INV-01 ; Google et GitHub : S-10) |
| `contact.html` | `/contact` | `lg ct`, `data-document="contact"` | — | `lecture=standard texte=standard sommaire=colonne eyebrow=icon` | `documents-legaux.css`, `contact.css` | `contact.js` | **Fait** |
| `cgu.html` | `/cgu` | `lg`, `data-document="cgu"` | — | `lecture=standard texte=standard sommaire=colonne eyebrow=icon` | `documents-legaux.css` | `auth-data.js`, `documents-legaux.js` | À porter |
| `confidentialite.html` | `/confidentialite` | `lg`, `data-document="confidentialite"` | — | idem | `documents-legaux.css` | idem | À porter |
| `charte-communautaire.html` | `/charte-communautaire` | `lg`, `data-document="charte"` | — | idem | `documents-legaux.css` | idem | À porter |
| `cookies.html` | `/cookies` | `lg`, `data-document="cookies"` | — | idem | `documents-legaux.css` | idem | À porter |
| `mentions-legales.html` | `/mentions-legales` | `lg`, `data-document="mentions"` | — | idem | `documents-legaux.css` | idem | À porter |
| `recherche.js`, `recherche.css` (composant) | fenêtre de recherche globale (loupe, Ctrl K) | — | — | — | `recherche.css` | `recherche.js` | À porter |

**Écrans sans maquette dans le prototype** (à concevoir dans le même style, puis faire valider) : modération (EC-19, EC-20), administration (EC-21 à EC-26), acceptation des nouveaux documents (`/accepter-documents`), erreurs (403, 500). La page 404 existe (`pages/404.astro`).

## 3. Repères

- Le prototype écrit les adresses des pages (`fiche-creation.html?id=…`) ; le site suit le plan du site (`/creations/12-portrait-editorial`). L'identifiant numérique fait foi, la partie texte sert la lisibilité : une adresse dont le texte ne correspond plus redirige vers la bonne.
- `commun.js` montait l'en-tête, le compte et le pied de page dans le navigateur ; ils sont désormais rendus par le serveur (`SiteHeader.astro`, `SiteFooter.astro`, `EtatBandeau.astro`). Les comportements (défilement, menus) sont dans `scripts/commun/entete.ts`.
- Connexion et inscription : gabarit `Base` avec `enveloppe="auth"` (fond, en-tête réduit, pas de pied de page) ; `auth-data.js` est réparti entre `lib/documents-legaux.ts` (résumés des documents), `lib/retour.ts` (pages de retour, icônes des actions), `@vysora/shared` (pseudos, mots de passe courants) et `scripts/auth/commun.ts` (domaines, messageries).
- Actions réservées (AUTH-07) : `exiger(action, quoi)`, `accesBloc`, `invitation` et `presenterRefus(probleme, quoi)` dans `scripts/commun/acces.ts`, chargé par le gabarit avec les gardes de liens (`/creations/nouvelle`, `/forum/nouveau`, tout élément `data-exige="action"` avec `data-exige-quoi="…"`) et les boutons `data-acces-bouton` du bandeau et du dialogue. Les textes, icônes et liens sont dans `lib/acces.ts`, sans DOM : un composant rendu par le serveur (l'éditeur ouvert par une visiteuse, par exemple) peut s'en servir.
- Reste à porter de `commun.js` quand une page en aura besoin : recherche globale, logos d'outils dans un texte (`withLogos`), avatars, aperçus de créations.
- Les aperçus « mock » du prototype (fausses captures d'applications) illustrent des créations fictives : en production, une création montre ses vraies images. Pour les données de démonstration, voir le registre (DEMO-01).
