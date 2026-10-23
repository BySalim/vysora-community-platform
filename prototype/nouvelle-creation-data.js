'use strict';

/* Données propres à la page Publier (EC-05) :
   référentiels de saisie, motifs de repérage appliqués dans le navigateur
   (interlocuteurs, réglages, données sensibles, instructions pour agent),
   défi en cours et brouillons d'exemple de Clarisse Mendy.
   Les outils et leurs logos viennent du catalogue de data.js (tools, toolAliases). */

window.VYSORA_PUBLIER = (() => {
  /* Modèles connus par outil : proposés à la saisie, repérés dans une conversation collée.
     Un modèle absent de la liste reste accepté en texte libre (RG-14). */
  const modeles = {
    'ChatGPT': ['GPT-5', 'GPT-5 mini', 'GPT Image 1', 'GPT-4o', 'o3'],
    'Claude': ['Sonnet 4.5', 'Opus 4.1', 'Haiku 4.5'],
    'Gemini': ['2.5 Pro', '2.5 Flash'],
    'Le Chat': ['Mistral Large 2', 'Mistral Medium 3'],
    'Copilot': ['GPT-5'],
    'Perplexity': ['Sonar Pro'],
    'DeepSeek': ['V3.2', 'R1'],
    'Grok': ['Grok 4'],
    'Qwen': ['Qwen3'],
    'Llama': ['Llama 4 Maverick'],
    'NotebookLM': ['2.5 Flash'],
    'Midjourney': ['v7', 'v6.1', 'Niji 6'],
    'DALL·E': ['DALL·E 3'],
    'Flux': ['1.1 Pro', 'Kontext Pro'],
    'Ideogram': ['3.0'],
    'Stable Diffusion': ['SDXL', 'SD 3.5 Large'],
    'Adobe Firefly': ['Image 4'],
    'Recraft': ['V3'],
    'Runway': ['Gen-4', 'Gen-4 Turbo'],
    'Sora': ['Sora 2'],
    'Kling': ['2.1', '2.0'],
    'Luma': ['Ray2'],
    'Suno': ['v4.5'],
    'Udio': ['v1.5'],
    'ElevenLabs': ['Multilingual v2', 'v3'],
    'Cursor': ['Sonnet 4.5', 'GPT-5'],
    'GitHub Copilot': ['GPT-5', 'Sonnet 4.5'],
    'Claude Code': ['Sonnet 4.5', 'Opus 4.1'],
    'Codex': ['GPT-5-Codex'],
    'Gemini CLI': ['2.5 Pro'],
    'Windsurf': ['SWE-1'],
    'Cline': ['Sonnet 4.5']
  };

  /* Outils qui agissent sur des fichiers, des commandes ou des services (F-19). */
  const outilsAgents = ['Cursor', 'Claude Code', 'Codex', 'Devin', 'Cline', 'Windsurf', 'Gemini CLI', 'Kiro', 'Replit', 'Manus', 'GitHub Copilot', 'Trae'];

  /* Catégorie proposée d'après la famille de l'outil ; quelques outils ont la leur. */
  const categorieParFamille = { assistant: 'Texte et rédaction', image: 'Image et illustration', video: 'Vidéo', audio: 'Musique et son', code: 'Code et scripts', automation: 'Automatisation' };
  const categorieParOutil = { 'Lovable': 'Application web', 'v0': 'Application web', 'Replit': 'Application web', 'Figma': 'Identité visuelle', 'Recraft': 'Identité visuelle', 'NotebookLM': 'Éducation' };

  /* Licences (RG-20, D-07). */
  const licences = [
    { code: 'CC BY 4.0', sens: 'Réutilisation libre, avec mention de votre nom', url: 'https://creativecommons.org/licenses/by/4.0/deed.fr', variantes: true },
    { code: 'CC BY-SA 4.0', sens: 'Réutilisation avec mention, sous la même licence', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr', variantes: true },
    { code: 'CC BY-NC 4.0', sens: 'Réutilisation avec mention, sans usage commercial', url: 'https://creativecommons.org/licenses/by-nc/4.0/deed.fr', variantes: true },
    { code: 'CC0 1.0', sens: 'Réutilisation sans aucune condition', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr', variantes: true },
    { code: 'Tous droits réservés', sens: 'Réutilisation et variantes soumises à votre accord', url: 'cgu.html#licences', variantes: false }
  ];

  /* Liens externes typés (F-15). */
  const liens = [
    ['demo', 'Démo'], ['depot', 'Dépôt de code'], ['video', 'Vidéo'], ['preuve', 'Conversation partagée'], ['article', 'Article'], ['autre', 'Autre lien']
  ];

  /* Types de moment clé (F-14) : libellé et question qui aide à le rédiger. */
  const moments = [
    { id: 'correction', label: 'Correction', aide: 'Qu’avez-vous rectifié, et pourquoi la première réponse ne convenait-elle pas ?' },
    { id: 'refus', label: 'Refus', aide: 'Quelle proposition de l’IA avez-vous écartée, et pour quelle raison ?' },
    { id: 'echec', label: 'Échec', aide: 'Qu’est-ce qui n’a pas fonctionné, et qu’en avez-vous tiré ?' },
    { id: 'outil', label: 'Changement d’outil', aide: 'Pourquoi avez-vous changé d’outil ou de modèle à ce moment-là ?' },
    { id: 'verification', label: 'Vérification', aide: 'Qu’avez-vous contrôlé, comment, et qu’avez-vous trouvé ?' },
    { id: 'decouverte', label: 'Découverte', aide: 'Quel réglage ou quelle formulation a fait la différence ?' }
  ];

  /* Motifs de repérage. Ils s'appliquent dans le navigateur, sans appel à un modèle (C-02, RG-22). */
  const motifs = {
    /* Début de message : « Vous avez dit : », « ChatGPT a dit : », « **User:** », « ## Response: »… */
    utilisateur: /^\s*(?:\*\*|#{1,3}\s*)?(?:vous avez dit|you said|vous|moi|you|user|utilisateur|utilisatrice|humain|human|prompt|demande)\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i,
    assistant: /^\s*(?:\*\*|#{1,3}\s*)?(chatgpt|claude code|claude|gemini cli|gemini|le chat|mistral|copilot|perplexity|deepseek|grok|qwen|lovable|cursor|codex|v0|replit|notebooklm|assistant|réponse|response|ia|ai)(?:\s+(?:a dit|said))?\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i,
    midjourney: /^\s*\/imagine\s+(?:prompt\s*:?)?\s*(.+)$/i,
    image: /^\s*(?:\[(?:image|images|image générée|generated image|capture)[^\]]*\]|!\[[^\]]*\]\([^)]*\))\s*$/i,
    libelles: {
      'chatgpt': 'ChatGPT', 'claude code': 'Claude Code', 'claude': 'Claude', 'gemini cli': 'Gemini CLI', 'gemini': 'Gemini', 'le chat': 'Le Chat', 'mistral': 'Le Chat',
      'copilot': 'Copilot', 'perplexity': 'Perplexity', 'deepseek': 'DeepSeek', 'grok': 'Grok', 'qwen': 'Qwen', 'lovable': 'Lovable', 'cursor': 'Cursor',
      'codex': 'Codex', 'v0': 'v0', 'replit': 'Replit', 'notebooklm': 'NotebookLM'
    },
    /* Réglages recopiés dans la configuration : paramètres Midjourney, Stable Diffusion, modes des assistants. */
    reglages: [
      /--(?:ar|aspect)\s+\d+:\d+/gi, /--(?:stylize|s)\s+\d+/gi, /--(?:chaos|c)\s+\d+/gi, /--(?:weird|w)\s+\d+/gi, /--(?:sref|cref|oref)\s+\S+/gi,
      /--seed\s+\d+/gi, /--tile\b/gi, /--style\s+raw/gi, /--(?:q|quality)\s+[\d.]+/gi, /--(?:v|version)\s+[\d.]+/gi, /--niji\s+\d+/gi,
      /\bSteps:\s*\d+/g, /\bCFG scale:\s*[\d.]+/g, /\bSeed:\s*\d+/g, /\bSampler:\s*[^,\n]+/g, /\bSize:\s*\d+x\d+/g,
      /\btemp[ée]rature\s*[:=]?\s*[\d.,]+/gi, /\bréflexion (?:étendue|approfondie)\b/gi, /\bextended thinking\b/gi, /\brecherche (?:web|sur le web)\b/gi, /\bmode agent\b/gi
    ],
    /* Données sensibles (F-18) : signalées, jamais bloquantes ; l'auteur masque ou confirme. */
    sensibles: [
      { id: 'cle', label: 'Clé d’API', re: /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})/g, masque: '[clé masquée]' },
      { id: 'jeton', label: 'Jeton d’accès', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, masque: '[jeton masqué]' },
      { id: 'secret', label: 'Mot de passe ou secret', re: /\b(?:password|passwd|mot de passe|api[_ -]?key)\s*[:=]\s*["'«]?\s*[^\s"'»]{6,}/gi, masque: '[secret masqué]' },
      { id: 'email', label: 'Adresse e-mail', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, masque: '[adresse e-mail masquée]' },
      { id: 'telephone', label: 'Numéro de téléphone', re: /(?:\+|\b00)\d{2,3}(?:[\s.-]?\d{1,3}){3,5}\b|\b0[1-9](?:[\s.-]?\d{2}){4}\b/g, masque: '[numéro masqué]' }
    ],
    /* Instructions confiées à un agent qui agit (F-19) : à signaler sur la fiche. */
    agent: /(\blance\b|exécute|supprime|efface|pousse|\bpush\b|\bcommit\b|déploie|installe|rm -rf|\bgit\s|\bnpm\s|\bpip\s|\bsudo\b|base de production|modifie (?:les|tous les) fichiers)/i
  };

  /* Défi en cours (même défi que Classements, semaine 42). */
  const defi = {
    id: 'affiche-touristique',
    titre: 'Une affiche touristique en trois échanges',
    theme: 'Un lieu que vous aimez',
    debut: '2026-10-12', fin: '2026-10-19', finLabel: 'lundi 19 octobre à 23 h 59',
    participants: 87,
    maxEchanges: 3,
    regles: ['Trois échanges au maximum avec l’IA', 'Un texte lisible et sans faute sur l’affiche', 'Un lieu réel, photographié ou décrit']
  };

  /* Publications des dernières 24 heures selon le niveau (RG-85) et heure de la prochaine possible. */
  const quota = { utilisees: { curieux: 1, apprenti: 4, artisan: 2 }, prochaine: 'demain à 9 h 40' };

  /* Brouillons de Clarisse Mendy, un par forme de création : un script obtenu en un prompt,
     une affiche obtenue en trois prompts, une application construite en plusieurs étapes.
     sensible / agent : variantes du prompt affichées par les états du panneau Tweaks. */
  const img = (nom, alt, extra = {}) => ({ kind: 'fichier', src: `assets/images/${nom}-720.webp`, grand: `assets/images/${nom}-1280.webp`, nom: `${nom}.webp`, mime: 'image/webp', alt, ...extra });

  const exemples = {
    prompt: {
      titre: 'Renommer des photos d’après leur date de prise de vue',
      objectif: 'Un script qui renomme plusieurs centaines de photos d’après leur date de prise de vue, sans jamais écraser un fichier.',
      categorie: 'Code et scripts',
      etiquettes: ['Python', 'Photos', 'EXIF'],
      licence: 'CC BY 4.0',
      limites: 'Les photos sans date de prise de vue, comme les captures d’écran ou les images reçues par messagerie, gardent leur nom. Le script ne parcourt pas les sous-dossiers.',
      modifie: '2026-10-12T21:40', publie: '2026-10-08',
      resultats: [{
        kind: 'code', nom: 'renommer_photos.py',
        texte: 'from pathlib import Path\nfrom PIL import Image\nimport sys\n\nDATE_EXIF = 36867  # DateTimeOriginal\n\n\ndef lire_date(photo):\n    with Image.open(photo) as image:\n        valeur = image.getexif().get_ifd(0x8769).get(DATE_EXIF)\n    if not valeur:\n        return None\n    return valeur.replace(":", "-", 2).replace(" ", "_").replace(":", "")\n\n\ndef renommer(dossier, simulation=True):\n    pris = set()\n    for photo in sorted(Path(dossier).glob("*.jpg")):\n        date = lire_date(photo)\n        if not date:\n            print("Sans date :", photo.name)\n            continue\n        nom, n = f"{date}.jpg", 2\n        while nom in pris or (photo.with_name(nom).exists() and photo.name != nom):\n            nom, n = f"{date}-{n}.jpg", n + 1\n        pris.add(nom)\n        print(photo.name, "→", nom)\n        if not simulation:\n            photo.rename(photo.with_name(nom))\n\n\nif __name__ == "__main__":\n    renommer(sys.argv[1], simulation="--renommer" not in sys.argv)\n'
      }],
      chemin: [{
        kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
        prompt: 'Écris un script Python qui renomme toutes les photos JPEG d’un dossier d’après leur date de prise de vue (EXIF), au format AAAA-MM-JJ_HHMMSS.jpg. Si deux photos ont la même date, ajoute un suffixe -2, -3. Ajoute un mode simulation, actif par défaut, qui affiche les changements sans rien renommer. N’utilise que Pillow.',
        sensible: 'Écris un script Python qui renomme toutes les photos JPEG du dossier « Mariage Awa Diatta » d’après leur date de prise de vue (EXIF), au format AAAA-MM-JJ_HHMMSS.jpg. Si deux photos ont la même date, ajoute un suffixe -2, -3. Ajoute un mode simulation, actif par défaut. N’utilise que Pillow. Les photos viennent de awa.diatta@gmail.com.',
        reponse: 'Voici le script. Il lit la date de prise de vue avec Pillow, affiche les nouveaux noms en mode simulation et ne renomme qu’avec l’option --renommer.',
        moment: { type: 'verification', texte: 'J’ai lancé la simulation sur une copie de 30 photos, dont deux prises en rafale à la même seconde. Les noms proposés étaient justes et aucune photo n’était écrasée : je n’ai renommé les vraies photos qu’ensuite.' }
      }]
    },

    iteration: {
      titre: 'Affiche touristique de Ziguinchor en trois prompts',
      objectif: 'Une affiche de voyage pour Ziguinchor, lisible de loin, qui donne envie de prendre la pirogue sur la Casamance.',
      categorie: 'Image et illustration',
      etiquettes: ['Affiche', 'Voyage', 'Sérigraphie', 'Casamance'],
      licence: 'CC BY 4.0',
      limites: 'Le fromager change de forme à chaque génération et les palétuviers restent très stylisés. Relisez le titre et le sous-titre lettre par lettre.',
      modifie: '2026-10-12T22:10', publie: '2026-10-12',
      resultats: [img('affiche-ziguinchor', 'Affiche en sérigraphie : pirogue sur la Casamance au lever du soleil, fromager à gauche, titre « ZIGUINCHOR » et sous-titre « Casamance · Sénégal ».', { portrait: true })],
      chemin: [
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1', reglages: 'Format portrait 2:3',
          prompt: 'Crée une affiche touristique de Ziguinchor, au Sénégal. Une pirogue glisse sur le fleuve Casamance au lever du soleil, des palétuviers sur les rives, un grand fromager à gauche. En haut, le titre « ZIGUINCHOR » ; en bas, « Casamance · Sénégal ». Format portrait 2:3.',
          sensible: 'Crée une affiche touristique de Ziguinchor, au Sénégal. Une pirogue glisse sur le fleuve Casamance au lever du soleil, des palétuviers sur les rives, un grand fromager à gauche. En haut, le titre « ZIGUINCHOR » ; en bas, « Casamance · Sénégal » et le contact du campement : reservations@lesbolongs.sn, +221 77 412 58 30. Format portrait 2:3.',
          reponse: 'Voici une affiche de Ziguinchor : une pirogue sur la Casamance au lever du soleil, entre les palétuviers, avec un grand fromager au premier plan.',
          fichiers: [img('ziguinchor-photo', 'Premier essai au rendu photographique : un piroguier sur une eau calme, sous un ciel rose.')] },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1',
          prompt: 'Le rendu est trop photographique, on dirait une photo retouchée. Je veux une affiche de voyage en sérigraphie : des aplats, cinq couleurs au maximum, aucun dégradé. Garde la même composition.',
          reponse: 'J’ai repris la composition en sérigraphie, avec cinq aplats : bleu nuit, ocre, vert mangrove, corail et crème.',
          fichiers: [img('affiche-ziguinchor-essai', 'Deuxième essai en sérigraphie ; le titre est mal orthographié « ZINGUICHOR ».', { portrait: true })],
          moment: { type: 'correction', texte: 'Le premier rendu ressemblait à une photo retouchée. Nommer la technique, la sérigraphie, et limiter la palette à cinq aplats a suffi pour obtenir une vraie affiche, sans toucher à la composition.' } },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1',
          prompt: 'Le titre est mal écrit : « ZINGUICHOR ». Écris exactement « ZIGUINCHOR », sans rien changer d’autre à l’image.',
          reponse: 'C’est corrigé : le titre indique désormais « ZIGUINCHOR ». Le reste de l’affiche est identique.',
          moment: { type: 'verification', texte: 'J’ai relu le titre lettre par lettre : l’IA avait écrit « ZINGUICHOR ». Demander le mot exact entre guillemets, sans autre changement, a corrigé le titre sans perdre le reste de l’image.' } }
      ]
    },

    projet: {
      titre: 'Réservation des sorties en pirogue d’un campement',
      objectif: 'Permettre aux voyageurs de réserver une sortie en pirogue dans les bolongs, sans jamais dépasser les sept places de chaque départ.',
      categorie: 'Application web',
      etiquettes: ['Réservation', 'Sécurité', 'Fuseau horaire', 'Supabase'],
      licence: 'CC BY-NC 4.0',
      limites: 'Les groupes de plus de sept voyageurs doivent encore appeler le campement. Les rappels par SMS la veille du départ restent à faire.',
      modifie: '2026-10-10T23:05', publie: '2026-10-03',
      resultats: [
        { kind: 'lien', url: 'https://reservations.lesbolongs.sn', type: 'demo', libelle: 'Réserver une sortie' },
        img('bolongs-reservation', 'Écran de réservation du campement : départ de 15 h, 3 places restantes sur 7, heure de Dakar indiquée.'),
        { kind: 'lien', url: 'https://github.com/clarisse-mendy/bolongs-reservations', type: 'depot', libelle: '' }
      ],
      chemin: [
        { kind: 'etape', titre: 'Écrire les règles avant de générer', texte: 'Avant de générer quoi que ce soit, j’ai fait reformuler nos règles. La liste obtenue a servi de cahier des charges pour toute la suite.' },
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Voici comment fonctionnent les sorties en pirogue du campement Les Bolongs, à Cap Skirring. Deux départs par jour, à 9 h et à 15 h. Huit places par pirogue, guide compris. Annulation gratuite jusqu’à la veille à 18 h. Reformule ces règles en une liste numérotée, puis signale ce qui reste ambigu.',
          reponse: 'Voici les règles reformulées, et deux points ambigus : un enfant occupe-t-il une place ? Que devient une réservation si la marée décale le départ ?',
          moment: { type: 'decouverte', texte: 'Demander ce qui restait ambigu a fait apparaître deux règles jamais écrites : un enfant occupe une place, et un départ décalé par la marée reste réservé. Sans elles, l’application aurait été fausse dès le départ.' } },
        { kind: 'etape', titre: 'Générer l’application sans compte client', texte: 'Une première version complète en un prompt, dont je n’ai gardé que la réservation.' },
        { kind: 'prompt', outil: 'Lovable',
          prompt: 'Crée une application de réservation pour le campement Les Bolongs à partir de ces règles : choix du départ, nombre de places, nom et téléphone. Affiche les places restantes pour chaque départ.',
          reponse: 'L’application est prête : calendrier des départs, formulaire de réservation, création d’un compte client et tableau de bord des réservations.' },
        { kind: 'prompt', outil: 'Lovable',
          prompt: 'Retire la création de compte. On réserve avec un nom, un numéro de téléphone et le nombre de places, puis on reçoit un lien d’annulation par SMS.',
          moment: { type: 'refus', texte: 'Lovable imposait un compte client pour réserver. Je l’ai refusé : les voyageurs réservent une seule fois, un lien d’annulation suffit et nous conservons moins de données personnelles.' } },
        { kind: 'etape', titre: 'Refuser une place de trop dans la base', texte: 'J’ai testé en envoyant deux réservations à la même seconde depuis deux téléphones.' },
        { kind: 'prompt', outil: 'Lovable',
          prompt: 'Deux familles ont réservé en même temps les deux dernières places du départ de 15 h : la pirogue compte maintenant neuf voyageurs pour sept places. Vérifie le nombre de places au moment d’enregistrer la réservation, dans la base, pas seulement à l’écran.',
          sensible: 'Connecte la base Supabase du projet avec la clé de service eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.k3P9xQm2Lr8vT1nWc4Zy7HdA. Deux familles ont réservé en même temps les deux dernières places du départ de 15 h, dont Awa Diatta (+221 77 412 58 30) : vérifie le nombre de places au moment d’enregistrer la réservation, dans la base.',
          reponse: 'Une contrainte dans la base refuse désormais toute réservation au-delà des places restantes, même lorsque deux demandes arrivent à la même seconde.',
          moment: { type: 'verification', texte: 'En simulant deux réservations simultanées, la pirogue de 15 h est passée à neuf voyageurs pour sept places. Le contrôle à l’écran ne suffisait pas : la base refuse désormais toute réservation au-delà des places restantes.' } },
        { kind: 'etape', titre: 'Afficher les départs à l’heure de Dakar', texte: 'Un voyageur à Paris voyait le départ de 9 h affiché à 11 h.',
          moment: { type: 'outil', texte: 'Lovable ne trouvait pas l’origine du décalage. J’ai changé d’outil pour faire lire le code et comprendre que le problème venait de l’enregistrement des heures, pas de leur affichage.' } },
        { kind: 'prompt', outil: 'Claude', outilAgent: 'Claude Code', modele: 'Sonnet 4.5',
          prompt: 'Un voyageur qui réserve depuis Paris voit le départ de 9 h affiché à 11 h. Pourquoi, et comment le corriger ?',
          agent: 'Un voyageur qui réserve depuis Paris voit le départ de 9 h affiché à 11 h. Ajoute un test qui réserve ce départ avec un navigateur réglé sur l’heure de Paris. Lance toute la suite de tests, corrige ce qui échoue, puis pousse la correction sur la branche main.',
          reponse: 'Les heures sont enregistrées sans fuseau horaire. Enregistrez-les avec le fuseau Africa/Dakar et affichez toujours l’heure du campement.',
          agentReponse: 'Le test échouait : l’heure était enregistrée sans fuseau horaire. Les départs sont maintenant enregistrés avec le fuseau Africa/Dakar. Les 14 tests passent et la correction est poussée sur main.',
          moment: { type: 'correction', texte: 'Les départs étaient enregistrés sans fuseau horaire. Ils le sont désormais avec celui de Dakar, et la page précise « heure de Dakar » à côté de chaque départ.' } },
        { kind: 'etape', titre: 'Mettre en ligne', texte: 'Mise en ligne le 2 octobre sur le site du campement.',
          textePublie: 'Mise en ligne le 2 octobre sur le site du campement. Les vingt premières réservations sont passées sans erreur.' }
      ]
    },

    /* Créations publiées plus tôt par Clarisse, de la plus récente à la plus ancienne. Le profil et Mes contenus
       en affichent davantage à mesure que son niveau monte (profil-data.js) ; ?modifier=… les ouvre dans l'éditeur. */
    traduction: {
      titre: 'Traduire le site d’un campement en anglais avec un glossaire',
      objectif: 'Une version anglaise du site du campement, fidèle aux mots d’ici : les bolongs, les cases et les plats gardent leur nom.',
      categorie: 'Texte et rédaction',
      etiquettes: ['Traduction', 'Anglais', 'Tourisme'],
      licence: 'CC BY 4.0',
      limites: 'Les pages ajoutées depuis restent à traduire. Pour les textes longs, une relecture par un anglophone reste utile.',
      modifie: '2026-09-24T19:30', publie: '2026-09-24',
      resultats: [],
      chemin: [
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
          prompt: 'Traduis en anglais la page « Sorties en pirogue » du site du campement Les Bolongs, ci-dessous. Garde un ton chaleureux et des phrases courtes.',
          reponse: 'Voici la traduction de la page. « Bolong » est traduit par « creek » et « case » par « hut ».' },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
          prompt: 'Garde les mots « bolong », « case » et le nom des plats en français, et explique-les entre parenthèses à leur première apparition. Applique ce glossaire à toute la page, sans rien changer d’autre.',
          reponse: 'C’est fait : « bolong » est conservé et expliqué une fois (« a mangrove channel »), comme « case » et le nom des plats.',
          moment: { type: 'correction', texte: '« Creek » et « hut » effaçaient ce qui fait le charme du lieu. Un glossaire court, appliqué à toute la page, a gardé les mots d’ici sans perdre les voyageurs anglophones.' } }
      ]
    },
    devis: {
      titre: 'Demande de devis en ligne pour un menuisier de Ziguinchor',
      objectif: 'Un formulaire qui aide les clients d’un atelier de menuiserie à décrire leur meuble, avec ses dimensions et une photo, pour recevoir un devis sans se déplacer.',
      categorie: 'Application web',
      etiquettes: ['Devis', 'Formulaire', 'Artisanat'],
      licence: 'CC BY-NC 4.0',
      limites: 'Le prix affiché reste une estimation : l’atelier confirme chaque devis après avoir vu le bois disponible.',
      modifie: '2026-09-04T18:10', publie: '2026-09-02',
      resultats: [{ kind: 'lien', url: 'https://atelier-sagna.sn/devis', type: 'demo', libelle: 'Demander un devis' }],
      chemin: [
        { kind: 'etape', titre: 'Lister ce que l’atelier demande toujours', texte: 'Avec le menuisier, j’ai noté les questions qu’il pose au téléphone avant chaque devis : type de meuble, dimensions, essence de bois et délai.' },
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Voici les questions qu’un menuisier pose avant de chiffrer un meuble. Transforme-les en formulaire en trois étapes, avec des exemples de réponses pour un client qui ne connaît pas le vocabulaire du bois.',
          reponse: 'Voici un formulaire en trois étapes : le meuble, ses dimensions avec un schéma, puis le bois et le délai. Chaque champ propose un exemple.' },
        { kind: 'etape', titre: 'Construire le formulaire', texte: 'J’ai généré l’application à partir de ce plan, avec l’envoi d’une photo de l’endroit où le meuble sera posé.' },
        { kind: 'prompt', outil: 'Lovable',
          prompt: 'Crée un formulaire de demande de devis en trois étapes à partir de ce plan. Le client peut joindre une photo. Les demandes arrivent dans un tableau pour l’atelier.',
          reponse: 'Le formulaire est en ligne : trois étapes, l’envoi d’une photo et un tableau des demandes pour l’atelier.' },
        { kind: 'etape', titre: 'Vérifier les dimensions saisies', texte: 'Certains clients saisissaient 180 pour 1,80 m, d’autres pour 180 cm : les premiers devis étaient faux.',
          moment: { type: 'verification', texte: 'Sur les dix premières demandes, trois mélangeaient mètres et centimètres. Afficher l’unité dans chaque champ et refuser une largeur de plus de 400 cm a supprimé l’erreur.' } },
        { kind: 'prompt', outil: 'Lovable',
          prompt: 'Affiche « cm » dans chaque champ de dimension et refuse une valeur supérieure à 400, avec un message qui explique pourquoi.',
          reponse: 'Chaque champ de dimension indique désormais « cm » et refuse les valeurs supérieures à 400 avec un message clair.' }
      ]
    },
    sauvegarde: {
      titre: 'Sauvegarder chaque soir les réservations d’un campement',
      objectif: 'Un script qui archive chaque soir le dossier des réservations et en garde une copie en ligne, sans intervention.',
      categorie: 'Code et scripts',
      etiquettes: ['Bash', 'Sauvegarde', 'Cron'],
      licence: 'CC BY 4.0',
      limites: 'Le script suppose que rclone est déjà configuré. Il ne vérifie pas encore qu’une archive peut être restaurée.',
      modifie: '2026-08-21T22:15', publie: '2026-08-21',
      resultats: [{
        kind: 'code', nom: 'sauvegarde.sh',
        texte: '#!/bin/bash\n# Archive le dossier des réservations et le copie sur Google Drive.\nset -euo pipefail\n\nDATE=$(date +%F)\nARCHIVE="reservations-$DATE.tar.gz"\n\ntar -czf "$ARCHIVE" reservations/\nrclone copy "$ARCHIVE" drive:sauvegardes\n\n# Ne garde que les 30 dernières archives sur ce disque.\nls -1t reservations-*.tar.gz | tail -n +31 | xargs -r rm --\n\n# Ligne cron : 0 23 * * * /home/campement/sauvegarde.sh\n'
      }],
      chemin: [{
        kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
        prompt: 'Écris un script Bash qui archive chaque soir le dossier reservations/ dans un fichier daté, le copie sur Google Drive avec rclone et ne garde que les 30 dernières archives. Ajoute la ligne cron pour le lancer à 23 h.',
        reponse: 'Voici le script et la ligne cron. Les archives de plus de 30 jours ne sont retirées que du disque local : la copie sur Google Drive reste intacte.',
        moment: { type: 'verification', texte: 'Avant de programmer le script, je l’ai lancé à la main sur une copie du dossier, puis j’ai restauré l’archive obtenue : toutes les réservations y étaient.' }
      }]
    },
    paiements: {
      titre: 'Rapprocher les paiements Wave des commandes d’une boutique',
      objectif: 'Chaque matin, retrouver la commande qui correspond à chaque paiement Wave de la veille et signaler les montants qui ne correspondent pas.',
      categorie: 'Automatisation',
      etiquettes: ['Paiement mobile', 'Tableur', 'Apps Script'],
      licence: 'CC BY 4.0',
      limites: 'Un client qui règle deux commandes en un seul paiement apparaît en « Montant différent » : il faut alors rapprocher à la main.',
      modifie: '2026-08-14T09:20', publie: '2026-08-12',
      resultats: [{
        kind: 'code', nom: 'rapprocher.gs',
        texte: 'function rapprocher() {\n  const classeur = SpreadsheetApp.getActive();\n  const commandes = classeur.getSheetByName(\'Commandes\').getDataRange().getValues().slice(1);\n  const wave = classeur.getSheetByName(\'Wave\');\n  const paiements = wave.getDataRange().getValues().slice(1);\n  const montants = new Map(commandes.map(([numero, , montant]) => [String(numero).replace(/\\D/g, \'\'), montant]));\n\n  const statuts = paiements.map(([, montant, reference]) => {\n    const numero = String(reference).replace(/\\D/g, \'\');\n    if (!montants.has(numero)) return [\'À vérifier\'];\n    return [montants.get(numero) === montant ? \'Rapproché\' : \'Montant différent\'];\n  });\n  wave.getRange(2, 4, statuts.length, 1).setValues(statuts);\n}\n'
      }],
      chemin: [{
        kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
        prompt: 'J’ai deux onglets dans Google Sheets : « Commandes » (numéro, client, montant) et « Wave » (date, montant, référence saisie par le client). Écris un script Apps Script qui, chaque matin, associe chaque paiement à sa commande grâce à la référence, puis indique « Rapproché » ou « Montant différent ».',
        reponse: 'Voici le script, avec un déclencheur quotidien à 7 h. Une colonne « Statut » est ajoutée à l’onglet Wave ; les paiements dont la référence n’est pas reconnue sont marqués « À vérifier ».',
        moment: { type: 'decouverte', texte: 'Les clients écrivent la référence de mille façons : « C1042 », « cmd 1042 », « 1042 ». Ne garder que les chiffres de la référence a suffi à rapprocher 96 % des paiements.' }
      }]
    },
    securite: {
      titre: 'Fiche de sécurité pour les guides de pirogue',
      objectif: 'Une fiche d’une page que chaque guide relit avant le départ : le matériel à compter, la marée à vérifier et la conduite à tenir si le temps tourne.',
      categorie: 'Texte et rédaction',
      etiquettes: ['Sécurité', 'Tourisme', 'Check-list'],
      licence: 'CC BY 4.0',
      limites: 'La fiche ne remplace pas la formation des guides. Les numéros d’urgence sont à adapter à chaque campement.',
      modifie: '2026-07-30T17:45', publie: '2026-07-30',
      resultats: [],
      chemin: [
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Rédige une fiche de sécurité d’une page pour les guides de pirogue d’un campement en Casamance : vérifications avant le départ, pendant la sortie et en cas d’orage. Des phrases courtes, à l’impératif.',
          reponse: 'Voici une fiche en trois parties, avec douze consignes au total.' },
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Les guides ne la liront pas en entier sur la plage. Garde six consignes au maximum, sous forme de cases à cocher, et mets en premier le comptage des gilets.',
          reponse: 'Voici la fiche réduite à six cases à cocher, en commençant par le comptage des gilets.',
          moment: { type: 'refus', texte: 'La première fiche comptait douze consignes : personne ne l’aurait relue avant chaque départ. J’ai écarté cette version complète au profit de six cases à cocher, testées avec deux guides.' } }
      ]
    },
    menu: {
      titre: 'Envoyer chaque matin le menu du jour d’un restaurant',
      objectif: 'Le restaurant note ses plats du jour dans un tableau ; à 10 h, un message court part sur sa liste de diffusion WhatsApp, sans qu’il ait à le rédiger.',
      categorie: 'Automatisation',
      etiquettes: ['WhatsApp', 'Restaurant', 'Make'],
      licence: 'CC BY-NC 4.0',
      limites: 'L’envoi suppose un compte WhatsApp Business. Les jours où aucun plat n’est saisi, aucun message ne part.',
      modifie: '2026-07-24T12:00', publie: '2026-07-22',
      resultats: [{ kind: 'lien', url: 'https://github.com/clarisse-mendy/menu-du-jour', type: 'depot', libelle: '' }],
      chemin: [
        { kind: 'etape', titre: 'Fixer le format du message', texte: 'Avec la gérante, nous avons choisi un message de quatre lignes au plus : les plats, leurs prix et l’heure de fin du service.' },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
          prompt: 'Voici les plats du jour d’un restaurant de Ziguinchor, avec leurs prix. Rédige un message WhatsApp de quatre lignes au plus, chaleureux, sans émoji, qui se termine par l’heure de fin du service.',
          reponse: 'Bonjour ! Aujourd’hui : thiéboudienne au poisson (3 500 F) et yassa au poulet (3 000 F). Service jusqu’à 15 h. À tout à l’heure !' },
        { kind: 'etape', titre: 'Programmer l’envoi', texte: 'Le scénario lit le tableau à 10 h, fait rédiger le message, puis l’envoie sur la liste de diffusion du restaurant.' },
        { kind: 'prompt', outil: 'Make',
          prompt: 'Chaque jour à 10 h, lis la ligne du jour dans le tableau « Menu », envoie les plats à ChatGPT avec le modèle de message validé, puis publie le texte sur la liste de diffusion WhatsApp du restaurant.',
          reponse: 'Le scénario s’exécute chaque jour à 10 h et s’arrête si aucun plat n’est saisi.' },
        { kind: 'etape', titre: 'Ne plus envoyer le menu de la veille', texte: 'Un matin, le message a annoncé les plats de la veille : la gérante n’avait pas encore rempli le tableau.',
          moment: { type: 'echec', texte: 'Le scénario reprenait la dernière ligne remplie, celle de la veille. Il vérifie désormais la date de la ligne et n’envoie rien si le menu du jour manque.' } }
      ]
    },
    carte: {
      titre: 'Corriger la carte d’un restaurant sans toucher aux prix',
      objectif: 'Relire la carte d’un restaurant pour corriger l’orthographe, en laissant les prix et les noms de plats en wolof exactement tels quels.',
      categorie: 'Texte et rédaction',
      etiquettes: ['Relecture', 'Restaurant', 'Orthographe'],
      licence: 'CC BY 4.0',
      limites: 'Les noms de plats en wolof ne sont pas vérifiés : fournissez la liste de ceux qui ne doivent pas changer.',
      modifie: '2026-07-01T16:30', publie: '2026-07-01',
      resultats: [],
      chemin: [{
        kind: 'prompt', outil: 'Le Chat', modele: 'Mistral Large 2',
        prompt: 'Corrige uniquement l’orthographe de cette carte de restaurant. Ne modifie ni les prix, ni les noms de plats suivants : thiéboudienne, yassa, mafé, thiakry. Présente chaque correction sous la forme « avant → après ».',
        reponse: 'Six corrections, dont « poison » → « poisson », « poulé » → « poulet » et « oignions » → « oignons ». Les prix et les noms de plats indiqués sont inchangés.'
      }]
    },
    compression: {
      titre: 'Alléger les photos du site d’un campement sans perte visible',
      objectif: 'Réduire le poids des photos du site pour qu’il s’affiche vite sur une connexion mobile, sans que la différence se voie.',
      categorie: 'Code et scripts',
      etiquettes: ['Python', 'Photos', 'Performance'],
      licence: 'CC BY 4.0',
      limites: 'Les images PNG sont ignorées. Les originaux sont rangés dans un dossier à part : videz-le une fois le site vérifié.',
      modifie: '2026-06-29T21:05', publie: '2026-06-29',
      resultats: [{
        kind: 'code', nom: 'compresser.py',
        texte: 'from pathlib import Path\nfrom PIL import Image\nimport io\nimport shutil\nimport sys\n\nLARGEUR_MAX = 1600\n\n\ndef compresser(dossier, simulation=True):\n    originaux = Path(dossier) / "originaux"\n    avant = apres = 0\n    for photo in sorted(Path(dossier).glob("*.jpg")):\n        taille = photo.stat().st_size\n        tampon = io.BytesIO()\n        with Image.open(photo) as image:\n            image.thumbnail((LARGEUR_MAX, LARGEUR_MAX * 4))\n            image.save(tampon, "JPEG", quality=80, optimize=True)\n        print(f"{photo.name} : {taille // 1024} Ko → {tampon.tell() // 1024} Ko")\n        avant, apres = avant + taille, apres + tampon.tell()\n        if not simulation:\n            originaux.mkdir(exist_ok=True)\n            shutil.move(photo, originaux / photo.name)\n            photo.write_bytes(tampon.getvalue())\n    print(f"Total : {avant // 1048576} Mo → {apres // 1048576} Mo")\n\n\nif __name__ == "__main__":\n    compresser(sys.argv[1], simulation="--compresser" not in sys.argv)\n'
      }],
      chemin: [{
        kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
        prompt: 'Écris un script Python qui réduit chaque photo JPEG d’un dossier à 1 600 pixels de large au plus, en qualité 80, et qui range les originaux dans un dossier « originaux ». Ajoute un mode simulation qui affiche le gain sans rien modifier.',
        reponse: 'Voici le script. En simulation, il affiche le poids de chaque photo avant et après, puis le gain total.',
        moment: { type: 'verification', texte: 'J’ai comparé dix photos avant et après sur un téléphone : aucune différence visible, pour un site dix fois plus léger.' }
      }]
    },
    batik: {
      titre: 'Inscription aux ateliers de batik d’une association',
      objectif: 'Une page où chacun réserve sa place à un atelier de batik, avec le nombre de places restantes et un numéro de téléphone vérifié.',
      categorie: 'Application web',
      etiquettes: ['Inscription', 'Association', 'Formulaire'],
      licence: 'CC BY 4.0',
      limites: 'Les inscriptions ne sont pas encore reliées à un paiement : l’association encaisse sur place.',
      modifie: '2026-06-26T15:40', publie: '2026-06-26',
      resultats: [{ kind: 'lien', url: 'https://batik-ziguinchor.sn/ateliers', type: 'demo', libelle: 'Réserver une place' }],
      chemin: [
        { kind: 'prompt', outil: 'v0',
          prompt: 'Crée une page d’inscription aux ateliers de batik d’une association de Ziguinchor : choix de l’atelier, prénom et nom, téléphone. Affiche les places restantes pour chaque atelier.',
          reponse: 'Voici la page : la liste des prochains ateliers, les places restantes et un formulaire en trois champs.' },
        { kind: 'prompt', outil: 'v0',
          prompt: 'Le champ téléphone accepte n’importe quoi. Vérifie qu’il contient 9 chiffres commençant par 7, avec ou sans +221, et explique l’erreur sous le champ.',
          reponse: 'Le numéro est vérifié pendant la saisie ; un message sous le champ indique le format attendu.',
          moment: { type: 'correction', texte: 'Deux inscrits sur dix avaient laissé un numéro incomplet, impossible à rappeler. Vérifier le format pendant la saisie a réglé le problème avant l’envoi.' } }
      ]
    },
    faq: {
      titre: 'Répondre sur WhatsApp aux questions fréquentes d’un campement',
      objectif: 'Répondre tout de suite, même la nuit, aux questions que les voyageurs posent le plus souvent : horaires des sorties, accès, prix et annulation.',
      categorie: 'Automatisation',
      etiquettes: ['WhatsApp', 'Tourisme', 'Réponses automatiques'],
      licence: 'CC BY-NC 4.0',
      limites: 'Une question hors de la liste reçoit une réponse d’attente et part chez le gérant. Le scénario ne prend aucune réservation.',
      modifie: '2026-06-27T10:15', publie: '2026-06-24',
      resultats: [{ kind: 'lien', url: 'https://github.com/clarisse-mendy/faq-whatsapp', type: 'depot', libelle: '' }],
      chemin: [
        { kind: 'etape', titre: 'Rassembler les vraies questions', texte: 'J’ai relu trois mois de messages du campement et gardé les quinze questions qui revenaient le plus, avec les réponses du gérant.' },
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Voici quinze questions fréquentes de voyageurs et les réponses du gérant du campement. Réécris chaque réponse en deux phrases au plus, en vouvoyant, et signale celles qui dépendent de la marée ou de la saison.',
          reponse: 'Voici les quinze réponses réécrites. Quatre dépendent de la marée : je les ai signalées pour qu’elles reprennent l’horaire du jour.' },
        { kind: 'etape', titre: 'Brancher les réponses sur WhatsApp', texte: 'Le scénario reconnaît la question, envoie la réponse validée et transmet au gérant tout ce qu’il ne reconnaît pas.' },
        { kind: 'prompt', outil: 'Make',
          prompt: 'Quand un message arrive sur le WhatsApp Business du campement, demande à Claude s’il correspond à l’une des quinze questions validées. Si oui, envoie la réponse validée ; sinon, envoie le message d’attente et transfère la question au gérant.',
          reponse: 'Le scénario est actif. Les questions non reconnues arrivent chez le gérant avec le numéro du voyageur.' },
        { kind: 'etape', titre: 'Ne jamais inventer un horaire', texte: 'Pendant les essais, le bot a annoncé un départ à 9 h un jour où la marée l’avait décalé à 11 h.',
          moment: { type: 'verification', texte: 'Pendant une semaine, j’ai posé chaque question à différentes heures. Le bot inventait parfois un horaire : il ne répond plus aux questions d’horaires qu’à partir du tableau des départs du jour.' } }
      ]
    },
    numeros: {
      titre: 'Vérifier un numéro de téléphone sénégalais dans un formulaire',
      objectif: 'Une expression régulière qui accepte les numéros mobiles sénégalais, avec ou sans indicatif, et refuse les numéros incomplets.',
      categorie: 'Code et scripts',
      etiquettes: ['JavaScript', 'Formulaire', 'Expression régulière'],
      licence: 'CC BY 4.0',
      limites: 'Les numéros fixes, qui commencent par 33, sont refusés.',
      modifie: '2026-06-19T18:00', publie: '2026-06-19',
      resultats: [{
        kind: 'code', nom: 'numero.js',
        texte: '// Numéro mobile sénégalais : 9 chiffres commençant par 70, 75, 76, 77 ou 78, avec ou sans +221.\nconst MOBILE_SN = /^(?:\\+221)?7[05678]\\d{7}$/;\n\nexport function numeroValide(saisie) {\n  return MOBILE_SN.test(saisie.replace(/\\s/g, \'\'));\n}\n\n// numeroValide("77 123 45 67")   → true\n// numeroValide("781234567")      → true\n// numeroValide("761234567")      → true\n// numeroValide("7712345")        → false\n// numeroValide("338211234")      → false\n'
      }],
      chemin: [{
        kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
        prompt: 'Écris une expression régulière JavaScript qui valide un numéro mobile sénégalais : 9 chiffres commençant par 70, 75, 76, 77 ou 78, précédés ou non de +221. Ajoute cinq exemples de test, dont deux numéros faux.',
        reponse: 'Voici l’expression régulière et cinq exemples. Retirez les espaces avant la vérification : « 77 123 45 67 » devient « 771234567 ».'
      }]
    },
    nuitees: {
      titre: 'Calculer les nuitées et la taxe de séjour dans un tableur',
      objectif: 'Calculer chaque mois les nuitées du campement et la taxe de séjour due, directement à partir du registre des arrivées.',
      categorie: 'Analyse de données',
      etiquettes: ['Tableur', 'Formules', 'Comptabilité'],
      licence: 'CC BY 4.0',
      limites: 'Le tarif de la taxe est saisi dans une cellule à part : vérifiez celui en vigueur dans votre commune.',
      modifie: '2026-06-16T20:20', publie: '2026-06-16',
      resultats: [],
      chemin: [
        { kind: 'prompt', outil: 'Gemini', modele: '2.5 Pro',
          prompt: 'Mon registre Google Sheets contient une ligne par séjour : case, date d’arrivée, date de départ, nombre d’adultes et d’enfants. Donne-moi les formules qui calculent les nuitées de chaque séjour et la taxe de séjour, due seulement pour les adultes.',
          reponse: 'Nuitées : =D2-C2. Taxe : =(D2-C2)*E2*$J$1, avec en J1 le tarif par nuit et par adulte.' },
        { kind: 'prompt', outil: 'Gemini', modele: '2.5 Pro',
          prompt: 'Un séjour à cheval sur deux mois est compté en entier sur le mois d’arrivée. Répartis les nuitées entre les deux mois et fais le total par mois dans un onglet à part.',
          reponse: 'Voici une formule qui compte les nuits de chaque séjour comprises dans le mois, et un onglet « Par mois » qui fait les totaux.',
          moment: { type: 'correction', texte: 'Les séjours du 30 septembre au 3 octobre étaient comptés entièrement en septembre. Compter les nuits comprises dans chaque mois a rendu les totaux justes pour la déclaration.' } }
      ]
    },
    accueil: {
      titre: 'Message d’accueil envoyé aux voyageurs la veille de leur arrivée',
      objectif: 'Un message court, envoyé la veille, qui donne aux voyageurs l’essentiel : l’accès au campement, l’heure d’arrivée possible et ce qu’il faut emporter.',
      categorie: 'Texte et rédaction',
      etiquettes: ['Accueil', 'Tourisme', 'Message'],
      licence: 'CC BY 4.0',
      limites: 'L’état de la piste change avec la saison des pluies : la phrase sur l’accès est à revoir chaque mois.',
      modifie: '2026-06-12T19:10', publie: '2026-06-12',
      resultats: [],
      chemin: [{
        kind: 'prompt', outil: 'Le Chat', modele: 'Mistral Large 2',
        prompt: 'Rédige le message d’accueil envoyé la veille aux voyageurs d’un campement près de Cap Skirring : comment venir depuis l’aéroport, arrivée possible à partir de 14 h et ce qu’il faut emporter pour les sorties en pirogue. Six lignes au plus, en vouvoyant.',
        reponse: 'Bonjour, nous vous attendons demain au campement ! Depuis l’aéroport de Cap Skirring, comptez vingt minutes de piste. Votre case est prête à partir de 14 h. Pour les sorties en pirogue, prévoyez un chapeau et des sandales qui vont dans l’eau.'
      }]
    },

    /* Brouillons en cours de Clarisse, listés dans Mes contenus et ouverts par nouvelle-creation.html?brouillon=…
       Certains sont incomplets à dessein : la page Mes contenus indique ce qu'il reste à compléter. */
    avis: {
      titre: 'Répondre aux avis des voyageurs d’un campement',
      objectif: 'Une réponse courte et personnelle à chaque avis laissé sur le campement : remercier pour un détail précis et dire ce qui change quand un voyageur signale un problème.',
      categorie: 'Texte et rédaction',
      etiquettes: ['Avis clients', 'Tourisme', 'Ton'],
      licence: 'CC BY 4.0',
      limites: 'Un avis rédigé en anglais reçoit une réponse en français si la langue n’est pas précisée.',
      modifie: '2026-10-13T11:20',
      resultats: [],
      chemin: [{
        kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
        prompt: 'Voici trois avis laissés sur le campement Les Bolongs, à Cap Skirring. Rédige une réponse pour chacun : 60 mots au plus, en vouvoyant, sans formule toute faite. Remercie pour un détail précis de l’avis et, s’il y a un reproche, dis ce que nous changeons.',
        reponse: 'Merci d’avoir remarqué le calme du bolong au lever du soleil : c’est aussi le départ préféré de notre guide. Vous avez attendu votre pirogue vingt minutes ; nous envoyons désormais un message dès que le départ est confirmé.',
        moment: { type: 'correction', texte: 'Les premières réponses commençaient toutes par « Merci pour votre retour ». Demander de remercier pour un détail précis de chaque avis a suffi à les rendre personnelles.' }
      }]
    },
    kafountine: {
      titre: 'Affiche du festival de Kafountine en trois échanges',
      objectif: 'Une affiche pour le festival de musique de Kafountine, lisible de loin, avec la date et le lieu écrits sans faute.',
      categorie: 'Image et illustration',
      etiquettes: ['Affiche', 'Festival', 'Casamance'],
      licence: 'CC BY 4.0',
      limites: '',
      modifie: '2026-10-13T09:05',
      defi: true,
      resultats: [],
      chemin: [
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1', reglages: 'Format portrait 2:3',
          prompt: 'Crée une affiche pour le festival de musique de Kafountine, en Casamance : des djembés et des pirogues sur la plage au coucher du soleil. En haut, « KAFOUNTINE » ; en bas, « Festival · 20 et 21 février ».',
          reponse: 'Voici l’affiche : des pirogues colorées sur la plage, des djembés au premier plan, le titre en haut et les dates en bas.' },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1',
          prompt: 'Les dates sont illisibles de loin. Agrandis la ligne du bas et passe-la en blanc sur un aplat bleu nuit, sans rien changer d’autre.',
          reponse: 'La ligne des dates est maintenant deux fois plus grande, en blanc sur un aplat bleu nuit.' },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT Image 1',
          prompt: 'Vérifie l’orthographe de chaque mot de l’affiche et corrige uniquement ce qui est faux.' }
      ]
    },
    marees: {
      titre: 'Horaires des sorties en pirogue selon les marées',
      objectif: '',
      categorie: '',
      etiquettes: ['Marées', 'Planning'],
      licence: 'CC BY 4.0',
      limites: '',
      modifie: '2026-10-12T22:47',
      resultats: [],
      chemin: [
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
          prompt: 'Voici l’annuaire des marées de Ziguinchor pour novembre. Propose deux horaires de départ par jour pour une sortie de deux heures dans les bolongs, en évitant la marée basse.',
          reponse: 'Voici un tableau des départs conseillés pour chaque jour de novembre, avec l’heure de pleine mer et la marge avant la basse mer.' },
        { kind: 'prompt', outil: 'ChatGPT', modele: 'GPT-5',
          prompt: 'Le 14 novembre, ton départ de 16 h tombe en pleine marée basse. Vérifie chaque ligne avec l’heure de basse mer et signale les journées où aucun départ n’est possible.' }
      ]
    },
    commandes: {
      titre: 'Suivi des commandes de jus de bouye d’une boutique',
      objectif: 'Un tableau partagé où la boutique note chaque commande de jus de bouye, et un message WhatsApp prêt à envoyer quand la commande est prête.',
      categorie: 'Automatisation',
      etiquettes: ['Commandes', 'Tableur', 'WhatsApp'],
      licence: 'CC BY-NC 4.0',
      limites: 'Les commandes passées par téléphone sont encore saisies à la main.',
      modifie: '2026-10-06T19:12',
      resultats: [],
      chemin: [
        { kind: 'etape', titre: 'Décrire la journée de la boutique', texte: 'J’ai noté avec la gérante comment arrivent les commandes, qui les prépare et quand les clients passent les chercher. Ce récit a servi de base à tout le reste.' },
        { kind: 'prompt', outil: 'Claude', modele: 'Sonnet 4.5',
          prompt: 'Voici comment la boutique reçoit et prépare les commandes de jus de bouye. Propose les colonnes d’un tableau de suivi, avec un statut pour chaque étape.',
          reponse: 'Colonnes proposées : client, téléphone, quantité, parfum, date de retrait et statut (reçue, en préparation, prête, retirée).' },
        { kind: 'etape', titre: 'Prévenir le client quand c’est prêt', texte: 'Quand une commande passe au statut « prête », un message est préparé avec le prénom du client et l’heure de fermeture.' },
        { kind: 'prompt', outil: 'Make',
          prompt: 'Quand une ligne passe au statut « prête », prépare un message WhatsApp avec le prénom du client, la quantité et l’heure de fermeture de la boutique. Ne l’envoie pas : je le valide d’abord.',
          reponse: 'Le scénario prépare le message dans WhatsApp Business ; l’envoi reste manuel.' }
      ]
    },
    esquisse: {
      titre: '', objectif: '', categorie: '', etiquettes: [], licence: 'CC BY 4.0', limites: '',
      modifie: '2026-10-02T21:30',
      resultats: [],
      chemin: [{ kind: 'prompt', outil: 'Gemini', modele: '2.5 Flash', prompt: 'Fais-moi un logo pour' }]
    }
  };

  /* Brouillons en cours de Clarisse (clés de exemples ci-dessus). */
  const brouillons = ['avis', 'kafountine', 'marees', 'commandes', 'esquisse'];

  return { modeles, outilsAgents, categorieParFamille, categorieParOutil, licences, liens, moments, motifs, defi, quota, exemples, brouillons };
})();
