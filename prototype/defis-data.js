'use strict';
/* Défis : défi de la semaine et défis terminés. La démo montre la même page pour trois formats de
   participation (Tweaks « Format du défi ») : un jeu jouable dans la page (PAGE_HTML), une image
   (IMAGE) et du code (CODE). Les champs suivent le modèle proposé : format de participation,
   nombre de prompts admis, contraintes et critères en lignes. Les participations portent leur
   chemin (prompts dans l'ordre, moment clé éventuel) et leur résultat. */
window.VYSORA_DEFIS = (() => {
  const weeks = window.VYSORA_CLASSEMENTS.weeks;
  const periode = {
    debut: '2026-11-17T00:00:00Z', fin: '2026-11-23T23:59:00Z',
    periode: 'Du mardi 17 au lundi 23 novembre', ouverture: 'mardi 17 novembre', cloture: 'lundi 23 novembre à 23 h 59',
    semaine: 47
  };
  /* « Maintenant » simulé selon le statut choisi dans Tweaks (le compte à rebours avance ensuite). */
  const maintenant = { a_venir: '2026-11-16T14:20:00Z', en_cours: '2026-11-19T16:20:00Z', termine: '2026-11-24T09:10:00Z', cloture: '2026-11-25T10:00:00Z' };

  /* ---- Jeu jouable dans la page --------------------------------------------------------- */
  const jeu = {
    ...periode, id: 'deploy-friday', titre: 'Deploy Friday', format: 'PAGE_HTML', nbPromptsMax: 1, semaineRemplacee: null,
    definition: '« Deploy Friday » : mettre un site en production le vendredi soir, juste avant le week-end. La hantise des développeurs.',
    enonce: 'Faites-en un jeu de plateforme ou un runner, jouable dans le navigateur, en un seul prompt. Un héros qui a du caractère, un niveau qui monte en tension, une fin qui se mérite.',
    contraintes: ['Un seul prompt : le jeu est publié tel que l’IA l’a livré, sans retouche.', 'Un fichier HTML autonome, jouable dans le navigateur.', 'Ni bibliothèque ni image chargée depuis Internet.'],
    regles: [
      { chiffre: '1', intitule: 'seul prompt', precision: 'Sans retouche du jeu obtenu' },
      { chiffre: '1', intitule: 'fichier HTML', precision: 'Jouable dans le navigateur' },
      { chiffre: '0', intitule: 'ressource en ligne', precision: 'Ni bibliothèque ni image' },
      { chiffre: '1', intitule: 'participation', precision: 'Par personne' }
    ],
    criteres: [
      { libelle: 'Animation du personnage', icone: 'user' },
      { libelle: 'Fluidité des contrôles', icone: 'keyboard' },
      { libelle: 'Humour', icone: 'smile' },
      { libelle: 'Progression du niveau', icone: 'trend-up' }
    ],
    criteresCommuns: ['Rendu visuel', 'Sensations de jeu', 'Rejouabilité', 'Marche du premier coup'],
    participations: [
      {
        id: 'hotfix-hero', titre: 'Hotfix Hero', m: 'Awa Sarr', outil: 'Claude', modele: 'Sonnet 4.5', n: 14, date: '2026-11-17T21:14:00Z', essais: 1,
        idee: 'Un runner en pixel art où l’horloge sert de niveau : chaque quart d’heure avant 18 h accélère la course.',
        resultat: { type: 'jeu', fichier: 'assets/jeux/hotfix-hero.html', couverture: 'assets/jeux/hotfix-hero.webp' },
        chemin: [{ prompt: 'Écris un jeu complet dans un seul fichier HTML (canvas, JavaScript sans bibliothèque, aucune ressource externe). Genre : runner horizontal en pixel art, 960 × 540, mis à l’échelle sans flou. Héroïne : une développeuse à capuche, son ordinateur portable sous le bras ; animation de course en 6 images, saut, glissade, chute. Contrôles : Espace ou flèche haut pour sauter (plus haut si l’on maintient), flèche bas pour glisser ; sur téléphone, toucher la moitié droite de l’écran pour sauter, la moitié gauche pour glisser. Le décor défile en trois plans (open space, fenêtres sur la ville au coucher du soleil, néons du plafond). Obstacles : des bugs qui rampent, des invitations « Réunion rapide (1 h) » qui volent à hauteur de tête, des chaises à roulettes qui glissent vers elle. Les cafés remplissent une jauge ; pleine, elle donne un double saut pendant 5 secondes. Une horloge en haut passe de 17 h 30 à 18 h 00 : c’est la progression du niveau, la vitesse augmente chaque quart d’heure. À 18 h 00, combat final contre « La Prod » : un serveur en feu qui lance des erreurs 500 ; il faut esquiver trois vagues puis sauter sur le bouton « Déployer ». Écran titre, écran de fin avec un message drôle selon la cause de la défaite, meilleur score de la session, touche R pour rejouer. Sons synthétisés avec Web Audio, touche M pour couper.',
          moment: 'Décrire l’horloge comme la progression du niveau a donné un rythme au jeu sans écrire de niveaux à la main.' }]
      },
      {
        id: 'ascenseur-en-panne', titre: 'L’ascenseur est en panne', m: 'Kofi Mensah', outil: 'ChatGPT', modele: 'GPT-5', n: 11, date: '2026-11-18T12:40:00Z', essais: 3,
        idee: 'Douze étages à gravir en rebondissant de bureau en bureau, avec une blague de développeur à chaque palier.',
        resultat: { type: 'jeu', fichier: 'assets/jeux/ascenseur-en-panne.html', couverture: 'assets/jeux/ascenseur-en-panne.webp' },
        chemin: [{ prompt: 'Crée un jeu HTML jouable dans le navigateur, tout dans un seul fichier, sans images externes. C’est vendredi, 17 h 45, l’ascenseur est en panne et la salle des serveurs est au 12e étage : mon personnage, un développeur en sweat bleu, doit monter en sautant de bureau en bureau. Il rebondit tout seul ; on le dirige à gauche et à droite avec les flèches, ou en touchant les côtés de l’écran sur téléphone. Chaque étage a ses pièges : des tickets qui tombent du plafond, des collègues qui veulent « juste deux minutes » et le retiennent, des plantes vertes glissantes. Les tasses de café donnent un super saut. Affiche l’étage, l’heure qui avance, et à chaque nouvel étage un panneau avec une blague de développeur. Au 12e, le patron arrive : « Finalement, on déploie lundi ? » ; il faut l’esquiver trois fois pour atteindre la console de déploiement. Style dessin plat, couleurs douces, animations souples (il s’étire et s’écrase au rebond). Écran de victoire avec le temps total.',
          moment: 'Sur trois essais, le premier ne gérait pas le toucher et le deuxième plantait au 12e étage : j’ai gardé le troisième, sans y toucher.' }]
      },
      {
        id: 'git-push-vendredi', titre: 'git push vendredi', m: 'Moussa Diallo', outil: 'Gemini', modele: '2.5 Pro', n: 9, date: '2026-11-18T19:05:00Z', essais: 1,
        idee: 'Un jeu à un seul bouton, tout en caractères : le pipeline de déploiement devient le niveau.',
        resultat: { type: 'jeu', fichier: 'assets/jeux/pipeline.html', couverture: 'assets/jeux/pipeline.webp' },
        chemin: [{ prompt: 'Un seul fichier HTML. Jeu à un bouton dans l’esthétique d’un terminal : fond noir, texte vert et ambre, police monospace, tout est dessiné avec des caractères. Le joueur est un curseur ▌ qui court sur la ligne de commande d’un pipeline de déploiement : build → tests → staging → prod. Chaque étape est un niveau plus rapide que le précédent. Appui court : petit saut ; appui long : grand saut (Espace, clic ou toucher). Obstacles : BUG, TODO, MEETING 15:30, npm WARN. Ramasser ☕ donne un bouclier qui absorbe un choc. En prod, boss final : un bloc HTTP 500 qui tire des lignes de log rouges ; survivre 20 secondes pour afficher « Deployed. Bon week-end. » Barre de progression du pipeline en haut, scanlines discrètes, sons de clavier.' }]
      }
    ],
    mienne: {
      id: 'premier-deploiement', titre: 'Premier déploiement', outil: 'Le Chat', modele: 'Mistral Medium 3', n: 2, date: '2026-11-19T15:52:00Z', essais: 2,
      idee: 'Un runner à un seul bouton : chaque bug évité ajoute un fichier au déploiement, cent fichiers et c’est en ligne.',
      resultat: { type: 'jeu', fichier: 'assets/jeux/premier-deploiement.html', couverture: null, nom: 'premier-deploiement.html' },
      chemin: [{ prompt: 'Fais-moi un petit jeu de course dans une seule page HTML, sans aucune ressource externe. Un ordinateur portable sur pattes court vers la mise en production du vendredi soir. Un seul bouton pour sauter (Espace, clic ou toucher). Il saute par-dessus des bugs et attrape des cafés qui donnent un saut plus long. Chaque bug évité ajoute un fichier au déploiement : à 100 fichiers, la mise en production réussit et un écran « En ligne ! » s’affiche avec le temps. Style plat, bleu et blanc, animations douces.' }]
    }
  };

  /* ---- Image ------------------------------------------------------------------------------ */
  const image = {
    ...periode, id: 'affiche-touristique', titre: 'Une affiche touristique en trois échanges', format: 'IMAGE', nbPromptsMax: 3, semaineRemplacee: 42,
    enonce: 'Faites découvrir un lieu que vous aimez avec une affiche créée par l’IA, en trois échanges au plus.',
    definition: null,
    contraintes: ['Trois échanges au maximum avec l’IA.', 'Un texte lisible et sans faute sur l’affiche.', 'Un lieu réel, photographié ou décrit.'],
    regles: [
      { chiffre: '3', intitule: 'échanges au plus', precision: 'Du premier prompt à l’affiche' },
      { chiffre: '1', intitule: 'texte sans faute', precision: 'Lisible sur l’affiche' },
      { chiffre: '1', intitule: 'lieu réel', precision: 'Photographié ou décrit' },
      { chiffre: '1', intitule: 'participation', precision: 'Par personne' }
    ],
    criteres: [
      { libelle: 'Lisibilité du titre', icone: 'pen' },
      { libelle: 'Fidélité au lieu', icone: 'globe' },
      { libelle: 'Composition', icone: 'grid' },
      { libelle: 'Économie d’échanges', icone: 'route' }
    ],
    criteresCommuns: [],
    participations: [
      { id: 'affiche-saint-louis', titre: 'Saint-Louis, les pirogues de Guet Ndar', m: 'Ibrahima Sow', outil: 'Midjourney', modele: 'v7', n: 7, date: '2026-11-17T10:12:00Z', essais: 1,
        idee: 'Des pirogues peintes au premier plan qui guident le regard jusqu’au titre.',
        resultat: { type: 'image', image: 'assets/images/affiche-saint-louis-720.webp', alt: 'Affiche de Saint-Louis : pirogues peintes amarrées devant les façades coloniales, titre « Saint-Louis ».', portrait: true },
        chemin: [
          { prompt: 'Une affiche touristique de Saint-Louis au Sénégal. Pirogues peintes au premier plan, façades coloniales en arrière-plan. Composition verticale, lumière de fin de journée. Texte exact : « Saint-Louis ».' },
          { prompt: 'Garde la composition, mais deux pirogues seulement, pour dégager le haut de l’affiche où se trouve le titre.' },
          { prompt: 'Le « t » de « Saint-Louis » est déformé. Écris exactement « Saint-Louis », plus grand, sans rien changer d’autre.', moment: 'Les pirogues guident le regard vers le titre : en retirer deux a suffi à le rendre lisible en petit format.' }
        ] },
      { id: 'affiche-goree', titre: 'Gorée, la maison aux volets bleus', m: 'Mariam Diop', outil: 'Flux', modele: '1.1 Pro', n: 6, date: '2026-11-17T18:40:00Z', essais: 2,
        idee: 'Une seule façade suffit à évoquer l’île : ocre, volets bleus et beaucoup de ciel.',
        resultat: { type: 'image', image: 'assets/images/goree-720.webp', alt: 'Façade ocre aux volets bleus sur l’île de Gorée, sous un ciel clair.', portrait: false },
        chemin: [
          { prompt: 'Affiche de voyage pour Gorée, Sénégal. Une façade ocre et des volets bleus, lumière douce, composition épurée. Réserver le haut de l’image au titre exact « Gorée ».' },
          { prompt: 'Retire les passants et le bateau à droite : on ne doit voir que la façade et le ciel.', moment: 'Une seule façade suffit à évoquer le lieu ; tout le reste détournait l’attention.' }
        ] },
      { id: 'affiche-chefchaouen', titre: 'Chefchaouen, la ville bleue', m: 'Léa Martin', outil: 'ChatGPT', modele: 'GPT Image 1', n: 5, date: '2026-11-18T09:05:00Z', essais: 1,
        idee: 'Une ruelle bleue réchauffée par un oranger, pour que le bleu ne soit pas monotone.',
        resultat: { type: 'image', image: 'assets/images/affiche-chefchaouen-720.webp', alt: 'Ruelle bleue de Chefchaouen, un escalier et un oranger, titre « Chefchaouen ».', portrait: true },
        chemin: [
          { prompt: 'Une affiche touristique de Chefchaouen au Maroc. Ruelle aux murs bleus, escalier et oranger. Illustration lumineuse. Titre exact : « Chefchaouen ».' },
          { prompt: 'L’oranger est trop petit : place-le au premier plan à gauche pour équilibrer les bleus.', moment: 'L’oranger apporte le contraste qui manquait.' },
          { prompt: 'Agrandis le titre et retire les petits textes sous l’image.' }
        ] },
      { id: 'affiche-cape-coast', titre: 'Cape Coast au lever du jour', m: 'Samuel Owusu', outil: 'Ideogram', modele: '3.0', n: 3, date: '2026-11-18T14:22:00Z', essais: 1,
        idee: 'Une affiche typographique : le nom du lieu devient toute la composition.',
        resultat: { type: 'image', affiche: { lieu: 'Cape Coast', ligne: 'Ghana · Au lever du jour' }, alt: 'Affiche typographique bleue : « Cape Coast », sous-titre « Au lever du jour ».', portrait: true },
        chemin: [
          { prompt: 'Affiche typographique pour Cape Coast au Ghana. Nom du lieu très lisible, bleu profond et blanc. Sous-titre exact : « Au lever du jour ».' },
          { prompt: 'Augmente l’espace entre les lettres du titre et vérifie chaque lettre.', moment: 'Le nom du lieu devient le centre de la composition.' }
        ] },
      { id: 'affiche-grand-bassam', titre: 'Grand-Bassam, la plage du phare', m: 'Esther Kouassi', outil: 'Midjourney', modele: 'v7', n: 3, date: '2026-11-19T08:30:00Z', essais: 3,
        idee: 'Du bleu, du blanc et de grands espaces, comme sur la plage au pied du phare.',
        resultat: { type: 'image', affiche: { lieu: 'Grand-Bassam', ligne: 'Côte d’Ivoire · La plage du phare' }, alt: 'Affiche typographique : « Grand-Bassam », sous-titre « La plage du phare ».', portrait: true },
        chemin: [
          { prompt: 'Affiche typographique touristique : « Grand-Bassam ». Sous-titre : « La plage du phare ». Bleu et blanc, composition verticale et grands espaces.' },
          { prompt: 'Supprime les vagues dessinées et les mouettes : garde seulement le texte et un aplat bleu.' },
          { prompt: 'Le sous-titre déborde à droite. Mets-le sur deux lignes, aligné sur le titre.', moment: 'La composition réserve enfin une vraie place au texte.' }
        ] }
    ],
    mienne: {
      id: 'affiche-ziguinchor', titre: 'Affiche touristique de Ziguinchor en trois prompts', outil: 'ChatGPT', modele: 'GPT Image 1', n: 2, date: '2026-11-18T21:10:00Z', essais: 1,
      idee: 'Une affiche de voyage pour Ziguinchor, lisible de loin, qui donne envie de prendre la pirogue sur la Casamance.',
      resultat: { type: 'image', image: 'assets/images/affiche-ziguinchor-720.webp', alt: 'Affiche en sérigraphie : pirogue sur la Casamance au lever du soleil, fromager à gauche, titre « ZIGUINCHOR ».', portrait: true, nom: 'affiche-ziguinchor.webp' },
      chemin: [
        { prompt: 'Crée une affiche touristique de Ziguinchor, au Sénégal. Une pirogue glisse sur le fleuve Casamance au lever du soleil, des palétuviers sur les rives, un grand fromager à gauche. En haut, le titre « ZIGUINCHOR » ; en bas, « Casamance · Sénégal ». Format portrait 2:3.' },
        { prompt: 'Le rendu est trop photographique, on dirait une photo retouchée. Je veux une affiche de voyage en sérigraphie : des aplats, cinq couleurs au maximum, aucun dégradé. Garde la même composition.', moment: 'Nommer la technique, la sérigraphie, et limiter la palette à cinq aplats a suffi pour obtenir une vraie affiche.' },
        { prompt: 'Le titre est mal écrit : « ZINGUICHOR ». Écris exactement « ZIGUINCHOR », sans rien changer d’autre à l’image.' }
      ]
    }
  };

  /* ---- Code ------------------------------------------------------------------------------- */
  const code = {
    ...periode, id: 'script-sans-suppression', titre: 'Un script qui ne supprime rien', format: 'CODE', nbPromptsMax: null, semaineRemplacee: 40,
    enonce: 'Rangez, renommez ou nettoyez des fichiers avec un script écrit par l’IA, sans jamais rien perdre.',
    definition: null,
    contraintes: ['Un mode simulation avant toute action.', 'Aucune suppression définitive.', 'Le prompt complet publié avec le script.'],
    regles: [
      { chiffre: '1', intitule: 'mode simulation', precision: 'Avant toute action' },
      { chiffre: '0', intitule: 'suppression définitive', precision: 'Rien ne disparaît' },
      { chiffre: '1', intitule: 'prompt complet', precision: 'Publié avec le script' },
      { chiffre: '1', intitule: 'participation', precision: 'Par personne' }
    ],
    criteres: [
      { libelle: 'Sûreté des fichiers', icone: 'shield' },
      { libelle: 'Simulation fidèle', icone: 'check-circle' },
      { libelle: 'Clarté du script', icone: 'code' },
      { libelle: 'Prompt réutilisable', icone: 'repeat' }
    ],
    criteresCommuns: [],
    participations: [
      { id: 'ranger-telechargements', titre: 'Ranger ses téléchargements en mode simulation', m: 'Mariam Diop', outil: 'Claude', modele: 'Sonnet 4.5', n: 18, date: '2026-11-17T12:30:00Z', essais: 1,
        idee: 'Les fichiers rangés par type dans des sous-dossiers, avec un aperçu complet avant le moindre déplacement.',
        resultat: { type: 'code', nom: 'ranger_telechargements.py', langage: 'Python', code: 'from pathlib import Path\nimport shutil\nimport sys\n\nFAMILLES = {\n    "Images": {".jpg", ".jpeg", ".png", ".webp", ".gif"},\n    "Documents": {".pdf", ".docx", ".xlsx", ".txt"},\n    "Archives": {".zip", ".rar", ".7z"},\n    "Installateurs": {".exe", ".msi", ".dmg"},\n}\n\n\ndef famille(fichier):\n    for nom, extensions in FAMILLES.items():\n        if fichier.suffix.lower() in extensions:\n            return nom\n    return "Divers"\n\n\ndef ranger(dossier, simulation=True):\n    for fichier in sorted(Path(dossier).iterdir()):\n        if not fichier.is_file():\n            continue\n        cible = fichier.parent / famille(fichier) / fichier.name\n        n = 2\n        while cible.exists():\n            cible = cible.with_name(f"{fichier.stem} ({n}){fichier.suffix}")\n            n += 1\n        print(f"{fichier.name} → {cible.parent.name}/{cible.name}")\n        if not simulation:\n            cible.parent.mkdir(exist_ok=True)\n            shutil.move(fichier, cible)\n\n\nif __name__ == "__main__":\n    ranger(sys.argv[1], simulation="--ranger" not in sys.argv)\n' },
        chemin: [
          { prompt: 'Écris un script Python qui range les fichiers de mon dossier Téléchargements dans des sous-dossiers par type (Images, Documents, Archives, Installateurs, Divers). Mode simulation par défaut : il affiche chaque déplacement prévu sans rien faire. Les vrais déplacements seulement avec l’option --ranger. Ne supprime jamais rien et n’écrase jamais un fichier existant : ajoute (2), (3) au nom si besoin.', moment: 'J’ai lancé la simulation deux fois sur une copie du dossier avant de ranger le vrai : aucune ligne ne différait.' }
        ] },
      { id: 'renommer-doublons', titre: 'Renommer des photos sans écraser les doublons', m: 'Julien Moreau', outil: 'ChatGPT', modele: 'GPT-5', n: 15, date: '2026-11-17T20:05:00Z', essais: 1,
        idee: 'Un script PowerShell qui numérote les photos d’un album, avec l’aperçu natif -WhatIf.',
        resultat: { type: 'code', nom: 'Renommer-Photos.ps1', langage: 'PowerShell', code: '[CmdletBinding(SupportsShouldProcess)]\nparam(\n    [Parameter(Mandatory)] [string] $Dossier,\n    [string] $Prefixe = "photo"\n)\n\n$photos = Get-ChildItem -Path $Dossier -File -Include *.jpg, *.jpeg, *.png |\n    Sort-Object LastWriteTime\n$numero = 1\nforeach ($photo in $photos) {\n    do {\n        $nom = "{0}-{1:D4}{2}" -f $Prefixe, $numero, $photo.Extension.ToLower()\n        $numero++\n    } while (Test-Path (Join-Path $Dossier $nom))\n    if ($PSCmdlet.ShouldProcess($photo.Name, "Renommer en $nom")) {\n        Rename-Item -LiteralPath $photo.FullName -NewName $nom\n    }\n}\n' },
        chemin: [
          { prompt: 'Écris un script PowerShell qui renomme les photos d’un dossier en photo-0001.jpg, photo-0002.jpg… dans l’ordre de leur date. Il doit accepter -WhatIf pour voir les changements sans rien renommer, et ne jamais écraser un fichier qui porte déjà le nom prévu.' },
          { prompt: 'Le script plante si un fichier s’appelle déjà photo-0003.jpg. Saute ce numéro au lieu d’écraser le fichier.', moment: 'J’ai testé avec un dossier qui contenait déjà photo-0003.jpg : la première version l’aurait écrasé.' }
        ] },
      { id: 'droits-extension', titre: 'Limiter les droits d’une extension avant de nettoyer', m: 'Ousmane Sy', outil: 'Cursor', modele: '', n: 12, date: '2026-11-18T11:48:00Z', essais: 1,
        idee: 'Avant de nettoyer, l’extension ne demande plus que les droits dont elle a vraiment besoin.',
        resultat: { type: 'code', nom: 'manifest.json', langage: 'JSON', code: '{\n  "manifest_version": 3,\n  "name": "Nettoyeur d’onglets",\n  "version": "1.2.0",\n  "description": "Regroupe les onglets inactifs sans jamais les fermer.",\n  "permissions": ["tabs", "tabGroups", "storage"],\n  "optional_permissions": ["history"],\n  "background": { "service_worker": "service-worker.js" },\n  "action": { "default_title": "Regrouper les onglets inactifs" },\n  "options_page": "options.html"\n}\n' },
        chemin: [
          { prompt: 'Voici le manifest de mon extension de nettoyage d’onglets. Retire toutes les permissions dont elle n’a pas besoin pour regrouper les onglets inactifs, sans jamais en fermer. Explique chaque permission retirée.' },
          { prompt: 'L’historique ne sert qu’à une option. Passe-le en permission facultative, demandée seulement si la personne active l’option.', moment: '« <all_urls> » et « history » ont disparu des droits demandés à l’installation.' }
        ] },
      { id: 'archiver-factures', titre: 'Archiver les factures de l’année par client', m: 'Abdoulaye Kane', outil: 'DeepSeek', modele: 'V3.2', n: 7, date: '2026-11-18T17:30:00Z', essais: 1,
        idee: 'Une copie rangée par client, l’original intact : rien ne bouge tant que l’on n’a pas relu la liste.',
        resultat: { type: 'code', nom: 'archiver-factures.sh', langage: 'Bash', code: '#!/usr/bin/env bash\n# Copie les factures de l’année dans archives/<client>/ sans toucher aux originaux.\nset -euo pipefail\n\nsource_dir="${1:?Dossier des factures}"\nannee="${2:-$(date +%Y)}"\nsimulation=true\n[[ "${3:-}" == "--copier" ]] && simulation=false\n\nfor facture in "$source_dir"/facture-"$annee"-*.pdf; do\n  [[ -e "$facture" ]] || continue\n  client=$(basename "$facture" .pdf | cut -d- -f4-)\n  cible="archives/$client/$(basename "$facture")"\n  if [[ -e "$cible" ]]; then\n    echo "Déjà archivée : $cible"\n    continue\n  fi\n  echo "$facture → $cible"\n  if ! $simulation; then\n    mkdir -p "archives/$client"\n    cp -n "$facture" "$cible"\n  fi\ndone\n' },
        chemin: [
          { prompt: 'Écris un script bash qui copie les factures de l’année (facture-2026-XXX-client.pdf) dans archives/<client>/. Ne déplace rien et ne supprime rien : les originaux restent en place. Par défaut, affiche seulement ce qui serait copié ; copie vraiment avec --copier. Si une facture est déjà archivée, ne la recopie pas.' }
        ] },
      { id: 'dedoublonner', titre: 'Dédoublonner une photothèque avec une corbeille', m: 'Pierre Durand', outil: 'ChatGPT', modele: 'GPT-5', n: 5, date: '2026-11-19T09:15:00Z', essais: 2,
        idee: 'Les doublons partent dans une corbeille locale que l’on vide soi-même, jamais à la poubelle.',
        resultat: { type: 'code', nom: 'dedoublonner.py', langage: 'Python', code: 'from hashlib import sha256\nfrom pathlib import Path\nimport shutil\nimport sys\n\n\ndef empreinte(fichier):\n    return sha256(fichier.read_bytes()).hexdigest()\n\n\ndef dedoublonner(dossier, simulation=True):\n    racine = Path(dossier)\n    corbeille = racine / "_corbeille"\n    vues = {}\n    for photo in sorted(racine.rglob("*")):\n        if not photo.is_file() or corbeille in photo.parents:\n            continue\n        cle = empreinte(photo)\n        if cle not in vues:\n            vues[cle] = photo\n            continue\n        print(f"Doublon de {vues[cle].name} : {photo.relative_to(racine)}")\n        if not simulation:\n            cible = corbeille / photo.relative_to(racine)\n            cible.parent.mkdir(parents=True, exist_ok=True)\n            shutil.move(photo, cible)\n\n\nif __name__ == "__main__":\n    dedoublonner(sys.argv[1], simulation="--deplacer" not in sys.argv)\n' },
        chemin: [
          { prompt: 'Écris un script Python qui trouve les photos en double dans un dossier et ses sous-dossiers, en comparant leur contenu. Les doublons vont dans un dossier _corbeille en gardant leur chemin, jamais à la poubelle. Mode simulation par défaut ; déplacement réel avec --deplacer.' },
          { prompt: 'Au deuxième passage, il traite les photos déjà dans _corbeille. Ignore ce dossier.', moment: 'Sans cette correction, un second passage aurait déplacé la corbeille dans elle-même.' }
        ] }
    ],
    mienne: {
      id: 'renommer-photos-exif', titre: 'Renommer des photos d’après leur date de prise de vue', outil: 'ChatGPT', modele: 'GPT-5', n: 3, date: '2026-11-18T08:45:00Z', essais: 1,
      idee: 'Un script qui renomme plusieurs centaines de photos d’après leur date de prise de vue, sans jamais écraser un fichier.',
      resultat: { type: 'code', nom: 'renommer_photos.py', langage: 'Python', code: 'from pathlib import Path\nfrom PIL import Image\nimport sys\n\nDATE_EXIF = 36867  # DateTimeOriginal\n\n\ndef lire_date(photo):\n    with Image.open(photo) as image:\n        valeur = image.getexif().get_ifd(0x8769).get(DATE_EXIF)\n    if not valeur:\n        return None\n    return valeur.replace(":", "-", 2).replace(" ", "_").replace(":", "")\n\n\ndef renommer(dossier, simulation=True):\n    pris = set()\n    for photo in sorted(Path(dossier).glob("*.jpg")):\n        date = lire_date(photo)\n        if not date:\n            print("Sans date :", photo.name)\n            continue\n        nom, n = f"{date}.jpg", 2\n        while nom in pris or (photo.with_name(nom).exists() and photo.name != nom):\n            nom, n = f"{date}-{n}.jpg", n + 1\n        pris.add(nom)\n        print(photo.name, "→", nom)\n        if not simulation:\n            photo.rename(photo.with_name(nom))\n\n\nif __name__ == "__main__":\n    renommer(sys.argv[1], simulation="--renommer" not in sys.argv)\n' },
      chemin: [{ prompt: 'Écris un script Python qui renomme toutes les photos JPEG d’un dossier d’après leur date de prise de vue (EXIF), au format AAAA-MM-JJ_HHMMSS.jpg. Si deux photos ont la même date, ajoute un suffixe -2, -3. Ajoute un mode simulation, actif par défaut, qui affiche les changements sans rien renommer. N’utilise que Pillow.',
        moment: 'J’ai lancé la simulation sur une copie de 30 photos, dont deux prises en rafale à la même seconde : aucune photo n’était écrasée.' }]
    }
  };

  /* Outils et modèles proposés dans le formulaire de participation : ceux du référentiel que
     l'administration tient à jour (Administration › Référentiels › Outils et modèles d'IA), avec le nom
     court des modèles. Un modèle absent de la liste s'écrit en texte libre (RG-14) et remonte à
     l'administration, qui l'ajoute au référentiel ou l'ignore. */
  const outils = {
    'ChatGPT': ['GPT-5.1', 'GPT-5', 'GPT-5 mini', 'GPT Image 1', 'GPT-4o', 'o3'],
    'Claude': ['Opus 4.5', 'Sonnet 4.5', 'Opus 4.1', 'Haiku 4.5'],
    'Gemini': ['3 Pro', '2.5 Pro', '2.5 Flash'],
    'Le Chat': ['Mistral Medium 3', 'Magistral Medium'],
    'Copilot': ['GPT-5'],
    'Perplexity': ['Sonar Pro'],
    'DeepSeek': ['V3.2', 'R1'],
    'Grok': ['Grok 4', 'Grok 4 Fast'],
    'Qwen': ['Qwen3', 'Qwen3-Coder'],
    'Kimi': ['Kimi K2'],
    'Llama': ['Llama 4 Maverick'],
    'Google AI Studio': [],
    'OpenRouter': [],
    'Ollama': [],
    'LM Studio': [],
    'Cursor': ['Sonnet 4.5', 'Opus 4.5', 'GPT-5', 'GPT-5.1'],
    'GitHub Copilot': ['GPT-5', 'Sonnet 4.5'],
    'Windsurf': ['SWE-1'],
    'Claude Code': ['Sonnet 4.5', 'Opus 4.5', 'Opus 4.1'],
    'Gemini CLI': ['3 Pro', '2.5 Pro'],
    'Codex': ['GPT-5-Codex'],
    'Cline': ['Sonnet 4.5'],
    'Trae': [],
    'Devin': [],
    'v0': [],
    'Lovable': [],
    'Replit': [],
    'Midjourney': ['v7', 'v6.1', 'Niji 6'],
    'Flux': ['1.1 Pro', 'Kontext Pro', 'Kontext Max'],
    'Ideogram': ['3.0'],
    'Stable Diffusion': ['SDXL', 'SD 3.5 Large'],
    'Adobe Firefly': ['Image 4'],
    'Recraft': ['V3'],
    'Krea': [],
    'ComfyUI': []
  };
  const licences = [
    ['CC BY 4.0', 'Réutilisation libre, avec mention de votre nom'],
    ['CC BY-SA 4.0', 'Réutilisation avec mention, sous la même licence'],
    ['CC BY-NC 4.0', 'Réutilisation avec mention, sans usage commercial'],
    ['CC0 1.0', 'Réutilisation sans aucune condition'],
    ['Tous droits réservés', 'Réutilisation et variantes soumises à votre accord']
  ];

  /* Volume d'un défi qui prend (Tweaks « Participations : nombreuses ») : de quoi éprouver la limite
     d'affichage et « Afficher la suite ». Chaque participation reprend le résultat et le chemin de
     l'une des trois premières ; celles d'un jeu n'ont pas de couverture (vignette de titre). */
  const membres = ['Léa Martin', 'Claire Dubois', 'Ousmane Sy', 'Aïssatou Ndiaye', 'Julien Moreau', 'Ndeye Fall', 'Ibrahima Sow', 'Mariam Diop', 'Hugo Girard', 'Fatoumata Coulibaly', 'Koffi Amoussou', 'Sébastien Roy', 'Yacine Benali', 'Thomas Lefèvre'];
  const modeles = [['Claude', 'Sonnet 4.5'], ['ChatGPT', 'GPT-5'], ['Gemini', '2.5 Pro'], ['Le Chat', 'Mistral Medium 3'], ['DeepSeek', 'V3.2'], ['Claude', 'Opus 4.1']];
  const suite = (v, titres) => titres.map(([titre, idee = ''], k) => {
    const base = v.participations[k % v.participations.length];
    const [outil, modele] = modeles[k % modeles.length];
    return {
      id: `${v.id}-suite-${k + 1}`, titre, m: membres[k % membres.length], outil, modele, n: Math.max(0, 8 - Math.floor(k / 2.6)),
      date: new Date(Date.parse(v.debut) + (k + 1) * 2.1 * 3600000).toISOString(), essais: k % 3 === 2 ? 2 : 1, idee,
      resultat: base.resultat.type === 'jeu' ? { type: 'jeu', fichier: base.resultat.fichier } : base.resultat, chemin: base.chemin
    };
  });
  jeu.supplementaires = suite(jeu, [
    ['Rollback Rush', 'Un runner à rebours : chaque obstacle franchi annule un commit de trop.'],
    ['Merge à 17 h 58', 'Deux branches à fusionner avant la fermeture, des conflits en forme de murs.'],
    ['Le pager de garde', 'Le pager sonne : de toit en toit jusqu’au serveur fautif.'],
    ['DNS, toujours le DNS', 'Un labyrinthe qui change d’adresse dès qu’on croit l’avoir trouvé.'],
    ['Feature flag', 'Allumer et éteindre les plateformes pour traverser le niveau.'],
    ['Le café de 18 h', 'Une tasse à porter sans la renverser jusqu’à la salle des serveurs.'],
    ['Build vert', 'Chaque test réussi repeint une plateforme en vert.'],
    ['Cache invalide', 'Les plateformes d’hier réapparaissent au mauvais moment.'],
    ['Le bug du vendredi', 'Un insecte à rattraper avant qu’il n’atteigne la production.'],
    ['Week-end sauvé', 'Un compte à rebours jusqu’à 19 h et un héros qui refuse d’abandonner.'],
    ['Monitoring rouge', 'Les alertes tombent du plafond ; on les évite en courant.'],
    ['La revue de code', 'Chaque commentaire de relecture devient une plateforme.'],
    ['Pipeline en feu', 'Un tapis de tâches qui accélère à chaque étape.'],
    ['Ctrl+Z', 'Un saut raté se rembobine, trois fois par partie.'],
    ['La migration', 'Des données à escorter de l’ancien serveur au nouveau.'],
    ['Ticket urgent', 'Un ticket qui grossit à chaque seconde passée sans le traiter.'],
    ['Le stagiaire et la prod', 'Un accès administrateur, et un niveau qui s’effondre derrière soi.'],
    ['Release candidate', 'Trois versions candidates, une seule arrive au bout.'],
    ['Hors ligne', 'Le réseau tombe : on court dans le noir, guidé par les voyants.'],
    ['Dernière itération', 'Le sprint se termine, le niveau rétrécit à chaque minute.'],
    ['Lundi matin', 'Revivre le vendredi soir depuis les journaux du lundi.']
  ]);
  image.supplementaires = suite(image, ['Saint-Louis au crépuscule', 'Le lac Rose', 'Ségou sur le fleuve', 'Essaouira, les remparts', 'Lomé, le grand marché', 'Grand-Bassam', 'Ziguinchor', 'Kribi, les chutes', 'Ouidah', 'Joal-Fadiouth', 'Dakar, la corniche', 'Fès, les tanneries', 'Agadez', 'Bamako la nuit', 'Cotonou'].map(x => [x]));
  code.supplementaires = suite(code, ['Archiver sans écraser', 'Trier les factures par mois', 'Dédoublonner les photos', 'Renommer les captures d’écran', 'Ranger le bureau', 'Classer les PDF par auteur', 'Vider la corbeille avec prudence', 'Copier sans écraser', 'Nettoyer les fichiers temporaires', 'Regrouper les exports', 'Sauvegarder avant de trier', 'Ranger les musiques', 'Trier les téléchargements par type', 'Archiver les vieux projets', 'Séparer photos et vidéos'].map(x => [x]));

  return {
    maintenant, variantes: { jeu, image, code }, outils, licences,
    archives: weeks.map(w => ({ ...w.defi, id: String(w.id), semaine: w.id }))
  };
})();
