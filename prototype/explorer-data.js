'use strict';

window.VYSORA_EXPLORER = {
  "domains": [
    {
      "name": "Application web",
      "icon": "browser",
      "slug": "application-web",
      "description": "Réservations, formulaires, sites vitrines : les parcours pour construire une application qui fonctionne vraiment, sécurité comprise."
    },
    {
      "name": "Image et illustration",
      "icon": "image",
      "slug": "image-et-illustration",
      "description": "Illustrations, photos réalistes, séries cohérentes : les méthodes pour obtenir l’image voulue, puis la garder d’une image à l’autre."
    },
    {
      "name": "Texte et rédaction",
      "icon": "pen",
      "slug": "texte-et-redaction",
      "description": "Lettres, réponses aux clients, traductions : des textes précis, au bon ton, sans formules toutes faites."
    },
    {
      "name": "Code et scripts",
      "icon": "code",
      "slug": "code-et-scripts",
      "description": "Scripts, extensions, requêtes : faire écrire du code qui fait ce que l’on attend, et rien de plus."
    },
    {
      "name": "Automatisation",
      "icon": "flow",
      "slug": "automatisation",
      "description": "E-mails, factures, résumés : automatiser les tâches répétitives en gardant la main sur ce qui part."
    },
    {
      "name": "Analyse de données",
      "icon": "chart",
      "slug": "analyse-de-donnees",
      "description": "Nettoyage, calculs, graphiques : des chiffres justes et des comparaisons honnêtes."
    },
    {
      "name": "Vidéo",
      "icon": "film",
      "slug": "video",
      "description": "Teasers, animations, montages courts : rythme, cadrage et cohérence d’un plan à l’autre."
    },
    {
      "name": "Musique et son",
      "icon": "music",
      "slug": "musique-et-son",
      "description": "Génériques, voix off, ambiances : une durée, un rythme et un ton maîtrisés."
    },
    {
      "name": "Éducation",
      "icon": "school",
      "slug": "education",
      "description": "Fiches, quiz, supports de révision : des contenus fidèles au cours, avec leurs sources."
    },
    {
      "name": "Identité visuelle",
      "icon": "shapes",
      "slug": "identite-visuelle",
      "description": "Logos, palettes, typographies : une identité lisible partout, de l’emballage à l’écran."
    }
  ],
  "objectives": [
    {
      "id": "rendez-vous",
      "domain": "Application web",
      "title": "Mettre en place la prise de rendez-vous en ligne",
      "short": "Prise de rendez-vous en ligne",
      "keywords": [
        "réservation",
        "rendez-vous",
        "rdv",
        "créneau",
        "agenda",
        "planning",
        "calendrier",
        "inscription",
        "cours"
      ],
      "path": [
        {
          "title": "Décrire les prestations, leur durée et les horaires",
          "how": "Plus la description est précise (durées, pauses, jours de fermeture), moins l’IA invente de créneaux.",
          "sources": [
            "keur-awa",
            "resa-terrain",
            "agenda-kine",
            "cours-yoga"
          ],
          "quote": "agenda-kine"
        },
        {
          "title": "Générer le parcours de réservation",
          "how": "Une première version réunit le choix de la prestation, la date et la confirmation. Elle sert de base aux corrections.",
          "sources": [
            "keur-awa",
            "resa-terrain",
            "agenda-kine",
            "cours-yoga"
          ],
          "quote": "keur-awa",
          "quoteText": "Crée une page de réservation pour le salon Keur Awa. Affiche les prestations, leur durée et les créneaux disponibles. Les créneaux déjà réservés doivent être désactivés."
        },
        {
          "title": "Refuser un créneau déjà pris au moment de confirmer",
          "how": "Désactiver le créneau à l’écran ne suffit pas : la disponibilité est vérifiée une seconde fois, côté serveur, à la confirmation.",
          "sources": [
            "keur-awa",
            "resa-terrain",
            "cours-yoga"
          ],
          "quote": "keur-awa"
        },
        {
          "title": "Confirmer la réservation au client",
          "how": "Un message reprend la date, l’heure et le moyen d’annuler.",
          "sources": [
            "keur-awa",
            "resa-terrain"
          ]
        },
        {
          "title": "Limiter les données personnelles conservées",
          "how": "Seules les informations utiles au rendez-vous sont demandées, et rien n’est gardé dans le navigateur.",
          "sources": [
            "keur-awa",
            "agenda-kine"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Deux personnes réservent le même créneau",
          "fix": "Vérifiez la disponibilité côté serveur au moment de confirmer, pas seulement à l’affichage.",
          "sources": [
            "keur-awa",
            "resa-terrain",
            "cours-yoga"
          ],
          "step": 2,
          "topic": "sujet-7",
          "case": "cas-6"
        },
        {
          "title": "Des données personnelles conservées sans raison",
          "fix": "Ne demandez que ce qui sert au rendez-vous et refusez tout stockage dans le navigateur.",
          "sources": [
            "keur-awa",
            "agenda-kine"
          ],
          "step": 4
        },
        {
          "title": "Des créneaux décalés d’une heure",
          "fix": "Précisez le fuseau horaire et testez une date située après le changement d’heure.",
          "sources": [
            "resa-terrain"
          ],
          "step": 1
        },
        {
          "title": "Des séances qui se chevauchent",
          "fix": "Calculez les créneaux à partir de la durée de chaque prestation, pas d’une grille fixe.",
          "sources": [
            "agenda-kine"
          ],
          "step": 0
        }
      ],
      "gaps": [
        "Aucun parcours ne gère encore le paiement d’un acompte.",
        "Pas encore de parcours réalisé avec Gemini ou Le Chat."
      ],
      "topics": [
        "sujet-7",
        "sujet-15"
      ],
      "cases": [
        "cas-6"
      ],
      "parcours": [
        "keur-awa",
        "resa-terrain",
        "agenda-kine",
        "cours-yoga"
      ]
    },
    {
      "id": "site-vitrine",
      "domain": "Application web",
      "title": "Lancer un site vitrine qui reçoit des demandes",
      "short": "Site vitrine et formulaires",
      "keywords": [
        "site",
        "vitrine",
        "formulaire",
        "contact",
        "devis",
        "page",
        "landing",
        "inscription",
        "accessibilité"
      ],
      "path": [
        {
          "title": "Rédiger le contenu avant de générer le site",
          "how": "Le texte des pages, les prestations et les photos sont prêts avant la première demande.",
          "sources": [
            "site-traiteur"
          ]
        },
        {
          "title": "Construire le formulaire de demande",
          "how": "Chaque champ a un libellé visible ; seules les informations utiles sont demandées.",
          "sources": [
            "site-traiteur",
            "formulaire-asso"
          ],
          "quote": "formulaire-asso"
        },
        {
          "title": "Rendre les erreurs compréhensibles",
          "how": "Un message sous le champ concerné, et le focus placé sur la première erreur.",
          "sources": [
            "formulaire-asso"
          ]
        },
        {
          "title": "Vérifier l’affichage sur mobile et au clavier",
          "how": "Chaque page est testée sur trois tailles d’écran et parcourue sans souris.",
          "sources": [
            "site-traiteur",
            "formulaire-asso"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Une demande envoyée sans accusé de réception",
          "fix": "Affichez une confirmation et envoyez une copie de la demande à la personne.",
          "sources": [
            "site-traiteur"
          ],
          "step": 1
        },
        {
          "title": "Des erreurs signalées seulement par la couleur",
          "fix": "Écrivez l’erreur sous le champ, reliez-la au champ et placez le focus dessus.",
          "sources": [
            "formulaire-asso"
          ],
          "step": 2,
          "case": "cas-6"
        }
      ],
      "gaps": [
        "Aucun parcours sur le référencement du site.",
        "Seulement deux parcours : ce guide se construit avec vos publications."
      ],
      "topics": [],
      "cases": [
        "cas-6"
      ],
      "parcours": [
        "site-traiteur",
        "formulaire-asso"
      ]
    },
    {
      "id": "identite",
      "domain": "Identité visuelle",
      "title": "Créer un logo et une identité visuelle",
      "short": "Logo et identité visuelle",
      "keywords": [
        "logo",
        "marque",
        "identité",
        "charte",
        "couleurs",
        "palette",
        "typographie",
        "symbole"
      ],
      "path": [
        {
          "title": "Décrire le symbole et le nom séparément",
          "how": "Le symbole est décrit dans une phrase, le nom exact est donné à part, entre guillemets.",
          "sources": [
            "logo-karite",
            "logo-tontine"
          ],
          "quote": "logo-tontine"
        },
        {
          "title": "Limiter la palette à quelques couleurs",
          "how": "Trois à cinq couleurs, avec leurs codes, choisies pour l’écran comme pour l’impression.",
          "sources": [
            "marque-cosmetique",
            "logo-tontine"
          ],
          "quote": "marque-cosmetique"
        },
        {
          "title": "Vérifier la lisibilité en petit format",
          "how": "Le logo est testé à la taille d’une icône d’application avant d’être retenu.",
          "sources": [
            "logo-tontine",
            "logo-karite"
          ]
        },
        {
          "title": "Mesurer le contraste du texte",
          "how": "Chaque couleur destinée au texte est contrôlée sur son fond.",
          "sources": [
            "marque-cosmetique"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Le nom de la marque mal orthographié",
          "fix": "Placez le nom exact entre guillemets et décrivez le symbole dans une phrase à part.",
          "sources": [
            "logo-karite",
            "logo-tontine"
          ],
          "step": 0,
          "topic": "sujet-3"
        },
        {
          "title": "Un contraste insuffisant pour le texte",
          "fix": "Mesurez le contraste avant de valider une couleur pour du texte.",
          "sources": [
            "marque-cosmetique"
          ],
          "step": 3
        },
        {
          "title": "Un symbole illisible à petite taille",
          "fix": "Testez le logo à 32 pixels avant de le retenir.",
          "sources": [
            "logo-tontine"
          ],
          "step": 2
        }
      ],
      "gaps": [
        "Aucun parcours ne vérifie la ressemblance avec des marques existantes."
      ],
      "topics": [
        "sujet-3"
      ],
      "cases": [
        "cas-5"
      ],
      "parcours": [
        "marque-cosmetique",
        "logo-karite",
        "logo-tontine"
      ]
    },
    {
      "id": "serie-images",
      "domain": "Image et illustration",
      "title": "Créer des illustrations au style cohérent",
      "short": "Illustrations au style cohérent",
      "keywords": [
        "illustration",
        "image",
        "style",
        "série",
        "personnage",
        "affiche",
        "portrait",
        "icône",
        "dessin",
        "peinture",
        "visuel"
      ],
      "path": [
        {
          "title": "Nommer la technique et la matière",
          "how": "Gouache, aquarelle, relief mat : la technique nommée évite le rendu photographique par défaut.",
          "sources": [
            "portrait-gouache",
            "cite-ciel-mer",
            "pochette-album"
          ],
          "quote": "portrait-gouache"
        },
        {
          "title": "Placer le sujet dans la composition",
          "how": "Indiquer où se trouve le sujet principal et l’espace à laisser libre.",
          "sources": [
            "cite-ciel-mer",
            "visuel-conference"
          ],
          "quote": "visuel-conference"
        },
        {
          "title": "Fixer une référence de style",
          "how": "Une image de référence ou un code de style garde les couleurs et la matière d’une image à l’autre.",
          "sources": [
            "affiche-alpes",
            "icones-3d"
          ],
          "quote": "affiche-alpes"
        },
        {
          "title": "Générer plusieurs essais et garder le meilleur",
          "how": "L’auteur indique combien d’essais ont été nécessaires.",
          "sources": [
            "cite-ciel-mer",
            "visuel-conference",
            "portrait-gouache"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Le style change d’une image à l’autre",
          "fix": "Gardez la même référence et les mêmes indications de style ; ne changez que le sujet.",
          "sources": [
            "icones-3d",
            "affiche-alpes"
          ],
          "step": 2,
          "topic": "sujet-1"
        },
        {
          "title": "Un rendu trop photographique",
          "fix": "Nommez la technique et la matière du support.",
          "sources": [
            "portrait-gouache"
          ],
          "step": 0,
          "topic": "sujet-9"
        },
        {
          "title": "Un code de style qui ne fonctionne plus après une mise à jour",
          "fix": "Notez la version du modèle avec le code de style et vérifiez-le avant de lancer une série.",
          "sources": [
            "affiche-alpes"
          ],
          "step": 2
        },
        {
          "title": "Une composition trop chargée",
          "fix": "Précisez où placer le sujet principal.",
          "sources": [
            "cite-ciel-mer"
          ],
          "step": 1
        }
      ],
      "gaps": [
        "Peu de parcours avec Adobe Firefly ou Krea."
      ],
      "topics": [
        "sujet-1",
        "sujet-9"
      ],
      "cases": [
        "cas-5"
      ],
      "parcours": [
        "cite-ciel-mer",
        "portrait-gouache",
        "affiche-alpes",
        "icones-3d",
        "visuel-conference",
        "pochette-album"
      ]
    },
    {
      "id": "photo",
      "domain": "Image et illustration",
      "title": "Obtenir une photo réaliste d’un produit ou d’un lieu",
      "short": "Photos réalistes",
      "keywords": [
        "photo",
        "produit",
        "photographie",
        "lieu",
        "voyage",
        "lumière",
        "packshot",
        "e-commerce"
      ],
      "path": [
        {
          "title": "Décrire la lumière et sa direction",
          "how": "D’où vient la lumière, à quel moment de la journée, douce ou dure.",
          "sources": [
            "bissap",
            "facade-goree"
          ],
          "quote": "bissap"
        },
        {
          "title": "Préciser l’objectif et le cadrage",
          "how": "Focale, distance et profondeur de champ rapprochent le résultat d’une vraie photo.",
          "sources": [
            "facade-goree",
            "bissap"
          ],
          "quote": "facade-goree"
        },
        {
          "title": "Simplifier le premier plan",
          "how": "Moins d’éléments au premier plan, moins de formes déformées.",
          "sources": [
            "facade-goree"
          ]
        },
        {
          "title": "Comparer avec le produit réel",
          "how": "Les couleurs et les proportions sont vérifiées avant publication.",
          "sources": [
            "bissap"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Des reflets et une lumière incohérents",
          "fix": "Indiquez la direction et la qualité de la lumière.",
          "sources": [
            "bissap"
          ],
          "step": 0
        },
        {
          "title": "Des objets déformés au premier plan",
          "fix": "Réduisez le nombre d’éléments au premier plan.",
          "sources": [
            "facade-goree"
          ],
          "step": 2
        }
      ],
      "gaps": [
        "Aucun parcours sur la retouche d’une vraie photo de produit."
      ],
      "topics": [],
      "cases": [
        "cas-5"
      ],
      "parcours": [
        "facade-goree",
        "bissap"
      ]
    },
    {
      "id": "automatiser",
      "domain": "Automatisation",
      "title": "Automatiser le traitement des e-mails et des documents",
      "short": "E-mails et documents automatisés",
      "keywords": [
        "automatisation",
        "automatiser",
        "e-mail",
        "mail",
        "facture",
        "devis",
        "relance",
        "résumé",
        "n8n",
        "zapier",
        "make"
      ],
      "path": [
        {
          "title": "Délimiter ce que l’automatisation traite",
          "how": "Quels messages, quels documents, et ce qui reste à faire à la main.",
          "sources": [
            "factures-auto",
            "relance-devis",
            "resume-canal"
          ]
        },
        {
          "title": "Extraire les informations utiles",
          "how": "Montant, fournisseur, décisions : chaque information extraite garde sa source.",
          "sources": [
            "factures-auto",
            "resume-canal"
          ],
          "quote": "resume-canal"
        },
        {
          "title": "Mettre de côté les cas douteux",
          "how": "Un dossier « à vérifier » reçoit tout ce qui est ambigu.",
          "sources": [
            "factures-auto"
          ]
        },
        {
          "title": "Valider avant tout envoi à l’extérieur",
          "how": "Une personne relit chaque message destiné à un client.",
          "sources": [
            "relance-devis"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Des informations attribuées à la mauvaise source",
          "fix": "Faites citer la source de chaque information extraite et isolez les cas ambigus.",
          "sources": [
            "resume-canal",
            "factures-auto"
          ],
          "step": 1,
          "topic": "sujet-5"
        },
        {
          "title": "Des messages envoyés sans relecture",
          "fix": "Ajoutez une étape de validation avant tout message envoyé à un client.",
          "sources": [
            "relance-devis"
          ],
          "step": 3,
          "case": "cas-4"
        },
        {
          "title": "Des documents scannés ignorés",
          "fix": "Prévoyez une reconnaissance de texte ou un dossier « à traiter à la main ».",
          "sources": [
            "factures-auto"
          ],
          "step": 2
        }
      ],
      "gaps": [
        "Aucun parcours avec Dify ou LangChain."
      ],
      "topics": [
        "sujet-5"
      ],
      "cases": [
        "cas-4"
      ],
      "parcours": [
        "factures-auto",
        "relance-devis",
        "resume-canal"
      ]
    },
    {
      "id": "donnees",
      "domain": "Analyse de données",
      "title": "Nettoyer et analyser vos données",
      "short": "Nettoyage et analyse de données",
      "keywords": [
        "données",
        "tableur",
        "excel",
        "csv",
        "analyse",
        "graphique",
        "ventes",
        "sql",
        "contacts",
        "doublons",
        "tableau de bord"
      ],
      "path": [
        {
          "title": "Décrire la structure des données",
          "how": "Colonnes, formats et tables sont décrits avant toute demande.",
          "sources": [
            "requete-sql",
            "doublons-contacts",
            "pluie-bamako"
          ],
          "quote": "requete-sql"
        },
        {
          "title": "Nettoyer avant d’analyser",
          "how": "Doublons, valeurs manquantes et formats incohérents sont traités en premier.",
          "sources": [
            "ventes-boutique",
            "doublons-contacts"
          ],
          "quote": "doublons-contacts"
        },
        {
          "title": "Recalculer les chiffres clés",
          "how": "Chaque pourcentage et chaque total annoncés par l’IA sont recalculés.",
          "sources": [
            "ventes-boutique",
            "pluie-bamako"
          ]
        },
        {
          "title": "Présenter avec les unités et la source",
          "how": "Axes nommés, unités, période et source sous chaque graphique.",
          "sources": [
            "pluie-bamako",
            "ventes-boutique"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Des chiffres faux présentés avec assurance",
          "fix": "Recalculez chaque pourcentage à partir des valeurs de départ.",
          "sources": [
            "ventes-boutique"
          ],
          "step": 2,
          "case": "cas-1",
          "topic": "sujet-4"
        },
        {
          "title": "Des périodes ou un ordre incohérents",
          "fix": "Comparez des périodes de même durée et imposez l’ordre chronologique.",
          "sources": [
            "pluie-bamako",
            "ventes-boutique"
          ],
          "step": 3,
          "topic": "sujet-8"
        },
        {
          "title": "Des fusions abusives entre homonymes",
          "fix": "Ne fusionnez que sur un identifiant fiable et mettez le reste de côté.",
          "sources": [
            "doublons-contacts"
          ],
          "step": 1
        },
        {
          "title": "Des lignes oubliées par une requête",
          "fix": "Testez la requête sur un cas limite, par exemple un client sans aucune commande.",
          "sources": [
            "requete-sql"
          ],
          "step": 0
        }
      ],
      "gaps": [],
      "topics": [
        "sujet-8",
        "sujet-4"
      ],
      "cases": [
        "cas-1"
      ],
      "parcours": [
        "ventes-boutique",
        "doublons-contacts",
        "requete-sql",
        "pluie-bamako"
      ]
    },
    {
      "id": "textes",
      "domain": "Texte et rédaction",
      "title": "Rédiger des textes qui sonnent juste",
      "short": "Textes qui sonnent juste",
      "keywords": [
        "texte",
        "rédaction",
        "lettre",
        "motivation",
        "avis",
        "réponse",
        "ton",
        "traduction",
        "cv",
        "rédiger",
        "écrire"
      ],
      "path": [
        {
          "title": "Donner des faits plutôt que des qualités",
          "how": "Des chiffres, des lieux, des détails concrets remplacent les adjectifs.",
          "sources": [
            "lettre-motivation",
            "avis-restaurant"
          ],
          "quote": "lettre-motivation"
        },
        {
          "title": "Montrer le ton attendu par l’exemple",
          "how": "Deux textes déjà publiés valent mieux qu’une liste d’adjectifs.",
          "sources": [
            "avis-restaurant"
          ],
          "quote": "avis-restaurant"
        },
        {
          "title": "Imposer le vocabulaire du métier",
          "how": "Un glossaire joint à la demande fixe les termes à employer.",
          "sources": [
            "traduction-glossaire"
          ],
          "quote": "traduction-glossaire"
        },
        {
          "title": "Relire phrase par phrase",
          "how": "Chaque phrase est relue pour vérifier qu’elle dit quelque chose de vrai.",
          "sources": [
            "lettre-motivation",
            "traduction-glossaire"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Des formules toutes faites",
          "fix": "Listez les formules à éviter et demandez un détail concret par phrase.",
          "sources": [
            "lettre-motivation",
            "avis-restaurant"
          ],
          "step": 0,
          "topic": "sujet-6"
        },
        {
          "title": "Des termes métier mal traduits",
          "fix": "Joignez un glossaire et faites signaler les termes absents au lieu de les traduire librement.",
          "sources": [
            "traduction-glossaire"
          ],
          "step": 2,
          "topic": "sujet-11"
        }
      ],
      "gaps": [
        "Aucun parcours sur la rédaction de documents administratifs."
      ],
      "topics": [
        "sujet-6",
        "sujet-11"
      ],
      "cases": [
        "cas-7",
        "cas-2"
      ],
      "parcours": [
        "lettre-motivation",
        "avis-restaurant",
        "traduction-glossaire"
      ]
    },
    {
      "id": "scripts",
      "domain": "Code et scripts",
      "title": "Faire écrire un script sans risque pour vos fichiers",
      "short": "Scripts sans risque",
      "keywords": [
        "script",
        "python",
        "code",
        "fichiers",
        "dossier",
        "extension",
        "navigateur",
        "renommer",
        "ranger",
        "programme"
      ],
      "path": [
        {
          "title": "Décrire le résultat et les cas particuliers",
          "how": "Ce que le script doit faire, et ce qu’il ne doit jamais toucher.",
          "sources": [
            "trier-telechargements",
            "extension-navigateur"
          ],
          "quote": "trier-telechargements"
        },
        {
          "title": "Exiger un mode simulation",
          "how": "Le script liste les opérations prévues sans rien modifier.",
          "sources": [
            "renommer-photos",
            "trier-telechargements"
          ],
          "quote": "renommer-photos"
        },
        {
          "title": "Tester sur une copie",
          "how": "Le premier vrai lancement se fait sur une copie du dossier.",
          "sources": [
            "renommer-photos"
          ]
        },
        {
          "title": "Limiter les permissions",
          "how": "Le script ou l’extension ne reçoit que les droits nécessaires.",
          "sources": [
            "extension-navigateur"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Une action destructive lancée sans aperçu",
          "fix": "Demandez un mode simulation qui liste les opérations avant d’agir.",
          "sources": [
            "renommer-photos",
            "trier-telechargements"
          ],
          "step": 1,
          "topic": "sujet-2",
          "case": "cas-3"
        },
        {
          "title": "Des cas particuliers oubliés",
          "fix": "Listez les exceptions dans la demande : fichiers en cours de téléchargement, contenus chargés plus tard…",
          "sources": [
            "trier-telechargements",
            "extension-navigateur"
          ],
          "step": 0
        },
        {
          "title": "Des permissions trop larges",
          "fix": "N’accordez que les droits nécessaires à la tâche.",
          "sources": [
            "extension-navigateur"
          ],
          "step": 3,
          "case": "cas-4",
          "topic": "sujet-14"
        }
      ],
      "gaps": [
        "Aucun parcours pour les scripts PowerShell ou les tâches planifiées."
      ],
      "topics": [
        "sujet-2",
        "sujet-14"
      ],
      "cases": [
        "cas-3",
        "cas-4",
        "cas-8"
      ],
      "parcours": [
        "extension-navigateur",
        "renommer-photos",
        "trier-telechargements"
      ]
    },
    {
      "id": "reviser",
      "domain": "Éducation",
      "title": "Préparer des révisions fidèles au cours",
      "short": "Révisions fidèles au cours",
      "keywords": [
        "révision",
        "réviser",
        "quiz",
        "fiches",
        "cours",
        "élève",
        "étudiant",
        "éducation",
        "examen"
      ],
      "path": [
        {
          "title": "Fournir le cours comme seule source",
          "how": "Les documents du cours sont joints, et l’IA ne doit rien ajouter d’autre.",
          "sources": [
            "fiches-revision",
            "quiz-histoire"
          ],
          "quote": "quiz-histoire"
        },
        {
          "title": "Exiger la source de chaque réponse",
          "how": "Chaque réponse cite la page ou le passage dont elle provient.",
          "sources": [
            "fiches-revision",
            "quiz-histoire"
          ],
          "quote": "fiches-revision"
        },
        {
          "title": "Vérifier les réponses avec le cours",
          "how": "Chaque réponse est comparée à son passage source avant de réviser.",
          "sources": [
            "quiz-histoire"
          ]
        }
      ],
      "pitfalls": [
        {
          "title": "Des réponses absentes du cours",
          "fix": "Faites citer la page ou le passage, et retirez ce qui n’en a pas.",
          "sources": [
            "fiches-revision",
            "quiz-histoire"
          ],
          "step": 1,
          "case": "cas-7",
          "topic": "sujet-17"
        }
      ],
      "gaps": [
        "Aucun parcours pour les matières scientifiques avec formules."
      ],
      "topics": [
        "sujet-17"
      ],
      "cases": [
        "cas-7"
      ],
      "parcours": [
        "quiz-histoire",
        "fiches-revision"
      ]
    },
    {
      "id": "audio-video",
      "domain": "Vidéo",
      "title": "Produire un jingle, une voix off ou une courte vidéo",
      "short": "Jingles, voix off et vidéos courtes",
      "keywords": [
        "vidéo",
        "musique",
        "jingle",
        "podcast",
        "voix",
        "voix off",
        "son",
        "audio",
        "animation",
        "teaser",
        "montage",
        "générique"
      ],
      "path": [
        {
          "title": "Décrire la durée, le rythme et l’ambiance",
          "how": "Durée exacte, tempo, instruments ou ton de voix sont précisés dès la première demande.",
          "sources": [
            "jingle-podcast",
            "teaser-festival",
            "voix-off"
          ],
          "quote": "jingle-podcast"
        },
        {
          "title": "Composer la musique avant le montage",
          "how": "Les plans sont calés sur le tempo de la musique.",
          "sources": [
            "teaser-festival"
          ]
        },
        {
          "title": "Fixer la caméra et le cadre",
          "how": "Un cadre fixe évite les déformations du texte et du logo.",
          "sources": [
            "animation-logo"
          ],
          "quote": "animation-logo"
        },
        {
          "title": "Écrire les pauses dans le script",
          "how": "Les pauses écrites rendent la voix plus naturelle.",
          "sources": [
            "voix-off"
          ],
          "quote": "voix-off"
        }
      ],
      "pitfalls": [
        {
          "title": "Une fin qui s’éteint en fondu",
          "fix": "Demandez une fin franche et une durée exacte.",
          "sources": [
            "jingle-podcast"
          ],
          "step": 0,
          "topic": "sujet-13"
        },
        {
          "title": "Des lettres qui se déforment",
          "fix": "Fixez la caméra et interdisez toute déformation du texte.",
          "sources": [
            "animation-logo"
          ],
          "step": 2
        },
        {
          "title": "Des coupes à contretemps",
          "fix": "Composez la musique d’abord, puis calez les plans sur le tempo.",
          "sources": [
            "teaser-festival"
          ],
          "step": 1
        }
      ],
      "gaps": [
        "Aucun parcours de sous-titrage pour l’instant."
      ],
      "topics": [
        "sujet-12",
        "sujet-13",
        "sujet-16"
      ],
      "cases": [],
      "parcours": [
        "jingle-podcast",
        "voix-off",
        "animation-logo",
        "teaser-festival"
      ]
    }
  ],
  "requests": [
    {
      "query": "Podcast en wolof",
      "count": 23,
      "domain": "Musique et son"
    },
    {
      "query": "Devis pour un artisan du bâtiment",
      "count": 17,
      "domain": "Automatisation"
    },
    {
      "query": "Menu de restaurant en plusieurs langues",
      "count": 12,
      "domain": "Texte et rédaction"
    },
    {
      "query": "Sous-titres d’une vidéo",
      "count": 9,
      "domain": "Vidéo"
    },
    {
      "query": "Portfolio de photographe",
      "count": 7,
      "domain": "Application web"
    },
    {
      "query": "Planning d’équipe en restauration",
      "count": 6,
      "domain": "Application web"
    }
  ],
  "publishers": {
    "ChatGPT": "OpenAI",
    "Claude": "Anthropic",
    "Gemini": "Google",
    "NotebookLM": "Google",
    "Le Chat": "Mistral AI",
    "Midjourney": "Midjourney",
    "Flux": "Black Forest Labs",
    "Stable Diffusion": "Stability AI",
    "Ideogram": "Ideogram",
    "Runway": "Runway",
    "Suno": "Suno",
    "Udio": "Udio",
    "ElevenLabs": "ElevenLabs",
    "Kling": "Kuaishou",
    "Recraft": "Recraft",
    "Lovable": "Lovable",
    "v0": "Vercel",
    "Cursor": "Anysphere",
    "DeepSeek": "DeepSeek",
    "n8n": "n8n",
    "Make": "Make",
    "Zapier": "Zapier"
  },
  "levels": {
    "Claire Dubois": "Maître",
    "Kofi Mensah": "Expert",
    "Moussa Diallo": "Expert",
    "Ibrahima Sow": "Expert",
    "Ousmane Sy": "Expert",
    "Aïssatou Ndiaye": "Artisan",
    "Yacine Benali": "Artisan",
    "Julien Moreau": "Artisan",
    "Fatoumata Coulibaly": "Artisan",
    "Hugo Girard": "Artisan",
    "Mariam Diop": "Artisan",
    "Léa Martin": "Apprenti",
    "Ndeye Fall": "Apprenti",
    "Awa Sarr": "Apprenti",
    "Thomas Lefèvre": "Apprenti",
    "Koffi Amoussou": "Apprenti",
    "Sébastien Roy": "Curieux"
  },
  "frequent": [
    "réservation",
    "logo",
    "script",
    "factures",
    "illustration",
    "traduction"
  ],
  "synonyms": {
    "rdv": "rendez-vous",
    "appli": "application",
    "app": "application",
    "site": "application web",
    "photo": "image",
    "visuel": "image",
    "illustration": "image",
    "dessin": "illustration",
    "musique": "son",
    "audio": "son",
    "voix": "voix off",
    "video": "vidéo",
    "donnees": "données",
    "tableur": "tableur",
    "excel": "tableur",
    "mail": "e-mail",
    "email": "e-mail",
    "courriel": "e-mail",
    "automatiser": "automatisation",
    "resume": "résumé",
    "cv": "lettre",
    "quiz": "quiz",
    "marque": "charte graphique"
  },
  "creations": [
    {
      "id": "keur-awa",
      "title": "Prise de rendez-vous pour un salon de coiffure",
      "type": "iteration",
      "domain": "Application web",
      "category": "Application web",
      "author": "Aïssatou Ndiaye",
      "tools": [
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Permettre aux clientes de choisir un créneau disponible et éviter les doubles réservations.",
      "prompt": "Les créneaux déjà réservés restent sélectionnables. Désactive-les et refuse côté serveur toute réservation sur un créneau pris.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Vérification",
          "text": "Deux réservations passaient sur le même créneau."
        },
        {
          "type": "Refus",
          "text": "Les numéros de téléphone étaient stockés dans le navigateur."
        }
      ],
      "tags": [
        "Réservation",
        "Formulaire",
        "Sécurité"
      ],
      "date": "2026-10-02",
      "useful": 412,
      "week": 148,
      "repro": 31,
      "success": 84,
      "last": {
        "date": "2026-10-12",
        "tool": "ChatGPT",
        "model": "GPT-5"
      },
      "tested": [
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "Gemini",
          "2.5 Pro"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "booking",
        "alt": "Page de réservation avec les créneaux du samedi"
      },
      "goal": "rendez-vous"
    },
    {
      "id": "cite-ciel-mer",
      "title": "Cité imaginaire entre ciel et mer",
      "type": "prompt",
      "domain": "Image et illustration",
      "category": "Image",
      "author": "Léa Martin",
      "tools": [
        [
          "ChatGPT",
          "GPT Image 1"
        ]
      ],
      "objective": "Une cité imaginaire lumineuse, avec des tours au centre et la mer au premier plan.",
      "prompt": "Illustration panoramique d’une cité méditerranéenne imaginaire, tours élancées au centre, île rocheuse, mer bleu cobalt, ciel abricot, texture peinte, sans texte.",
      "attempts": 4,
      "moments": [
        {
          "type": "Découverte",
          "text": "« Tours élancées au centre » a évité les compositions chargées."
        }
      ],
      "tags": [
        "Paysage",
        "Architecture",
        "Peinture numérique"
      ],
      "date": "2026-10-06",
      "useful": 389,
      "week": 156,
      "repro": 44,
      "success": 61,
      "last": {
        "date": "2026-10-11",
        "tool": "ChatGPT",
        "model": "GPT Image 1"
      },
      "tested": [
        [
          "ChatGPT",
          "GPT Image 1"
        ],
        [
          "Midjourney",
          "v7"
        ],
        [
          "Flux",
          "1.1 Pro"
        ]
      ],
      "media": {
        "kind": "image",
        "name": "cite-imaginaire",
        "large": 1280,
        "alt": "Cité de tours élancées sur une île rocheuse au coucher du soleil"
      },
      "goal": "serie-images"
    },
    {
      "id": "portrait-gouache",
      "title": "Portrait éditorial en gouache numérique",
      "type": "iteration",
      "domain": "Image et illustration",
      "category": "Illustration",
      "author": "Kofi Mensah",
      "tools": [
        [
          "Midjourney",
          "v7"
        ]
      ],
      "objective": "Un portrait éditorial avec une matière peinte visible, plutôt qu’un rendu photographique.",
      "prompt": "Portrait éditorial, gouache numérique, touches visibles, papier à grain fin, fond sarcelle uni, lumière chaude de fin d’après-midi --ar 4:3",
      "exchanges": 3,
      "moments": [
        {
          "type": "Correction",
          "text": "Rendu trop photoréaliste : la technique a été nommée."
        },
        {
          "type": "Découverte",
          "text": "La lumière de fin d’après-midi a réchauffé les tons."
        }
      ],
      "tags": [
        "Portrait",
        "Peinture numérique",
        "Éditorial"
      ],
      "date": "2026-10-04",
      "useful": 356,
      "week": 121,
      "repro": 18,
      "success": 72,
      "last": {
        "date": "2026-10-10",
        "tool": "Midjourney",
        "model": "v7"
      },
      "tested": [
        [
          "Midjourney",
          "v7"
        ],
        [
          "Flux",
          "1.1 Pro"
        ]
      ],
      "media": {
        "kind": "image",
        "name": "portrait-indigo",
        "large": 1254,
        "alt": "Portrait peint d’une jeune femme au turban orange et bleu"
      },
      "goal": "serie-images"
    },
    {
      "id": "ventes-boutique",
      "title": "Tableau de bord des ventes d’une boutique en ligne",
      "type": "projet",
      "domain": "Analyse de données",
      "category": "Analyse de données",
      "author": "Claire Dubois",
      "tools": [
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "extra": "Google Sheets",
      "objective": "Suivre le chiffre d’affaires, les commandes et les retours d’une boutique sur quatre mois.",
      "steps": [
        "Préparer les exports de commandes",
        "Nettoyer et fusionner les fichiers",
        "Construire les indicateurs",
        "Mettre en page le tableau de bord"
      ],
      "moments": [
        {
          "type": "Vérification",
          "text": "Les remboursements étaient comptés deux fois dans le chiffre d’affaires."
        },
        {
          "type": "Correction",
          "text": "Les mois incomplets étaient comparés aux mois complets."
        },
        {
          "type": "Refus",
          "text": "La formule proposée masquait les commandes annulées."
        }
      ],
      "tags": [
        "E-commerce",
        "Tableur",
        "Indicateurs"
      ],
      "date": "2026-09-29",
      "useful": 288,
      "week": 97,
      "media": {
        "kind": "mock",
        "mock": "dashboard",
        "alt": "Tableau de bord avec trois indicateurs et un graphique mensuel"
      },
      "goal": "donnees"
    },
    {
      "id": "factures-auto",
      "title": "Tri automatique des factures reçues par e-mail",
      "type": "projet",
      "domain": "Automatisation",
      "category": "Automatisation",
      "author": "Moussa Diallo",
      "tools": [
        [
          "n8n"
        ],
        [
          "Claude",
          "Haiku 4.5"
        ]
      ],
      "objective": "Classer les factures reçues par e-mail et extraire leur montant TTC.",
      "steps": [
        "Filtrer les e-mails avec pièce jointe",
        "Extraire fournisseur et montant",
        "Isoler les montants ambigus",
        "Classer par mois"
      ],
      "moments": [
        {
          "type": "Vérification",
          "text": "Les factures ambiguës restent dans un dossier à vérifier."
        },
        {
          "type": "Échec",
          "text": "Les PDF scannés sans texte n’étaient pas lus."
        }
      ],
      "tags": [
        "Factures",
        "E-mail",
        "Comptabilité"
      ],
      "date": "2026-10-01",
      "useful": 197,
      "week": 74,
      "media": {
        "kind": "mock",
        "mock": "flow",
        "alt": "Schéma reliant la messagerie, l’extraction des montants et le classement"
      },
      "goal": "automatiser"
    },
    {
      "id": "lettre-motivation",
      "title": "Lettre de motivation sans formules toutes faites",
      "type": "iteration",
      "domain": "Texte et rédaction",
      "category": "Texte",
      "author": "Yacine Benali",
      "tools": [
        [
          "Le Chat",
          "Mistral Large 2"
        ]
      ],
      "objective": "Une lettre de motivation qui s’appuie sur des faits précis du parcours.",
      "prompt": "Remplace chaque qualité générale par un fait vérifiable tiré de mon CV. Supprime les formules comme « passionné et dynamique ».",
      "exchanges": 4,
      "moments": [
        {
          "type": "Correction",
          "text": "Les formules toutes faites ont été remplacées par des faits du parcours."
        }
      ],
      "tags": [
        "Emploi",
        "Lettre",
        "Ton"
      ],
      "date": "2026-10-03",
      "useful": 240,
      "week": 69,
      "repro": 27,
      "success": 89,
      "last": {
        "date": "2026-10-12",
        "tool": "Claude",
        "model": "Sonnet 4.5"
      },
      "tested": [
        [
          "Le Chat",
          "Mistral Large 2"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "letter",
        "alt": "Lettre où une formule générique est remplacée par un fait précis"
      },
      "goal": "textes"
    },
    {
      "id": "avis-restaurant",
      "title": "Réponses personnalisées aux avis clients d’un restaurant",
      "type": "prompt",
      "domain": "Texte et rédaction",
      "category": "Texte",
      "author": "Ndeye Fall",
      "tools": [
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Répondre aux avis avec un ton chaleureux, sans que deux réponses se ressemblent.",
      "prompt": "Rédige une réponse à cet avis pour le restaurant Le Baobab. Remercie la personne, reprends un détail précis de son avis et propose une solution si un problème est mentionné. 60 mots maximum, sans formule toute faite.",
      "attempts": 2,
      "moments": [
        {
          "type": "Découverte",
          "text": "Reprendre un détail précis de l’avis évite les réponses identiques."
        }
      ],
      "tags": [
        "Avis clients",
        "Restauration",
        "Ton"
      ],
      "date": "2026-10-10",
      "useful": 205,
      "week": 88,
      "repro": 14,
      "success": 93,
      "last": {
        "date": "2026-10-12",
        "tool": "ChatGPT",
        "model": "GPT-5"
      },
      "tested": [
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "Le Chat",
          "Mistral Large 2"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "review",
        "alt": "Avis d’un client et réponse du restaurant"
      },
      "goal": "textes"
    },
    {
      "id": "doublons-contacts",
      "title": "Dédoublonner 4 000 contacts sans fusionner les homonymes",
      "type": "iteration",
      "domain": "Analyse de données",
      "category": "Analyse de données",
      "author": "Claire Dubois",
      "tools": [
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Nettoyer un fichier de contacts en gardant à part les cas douteux.",
      "prompt": "Repère les doublons en comparant l’e-mail, le téléphone normalisé et le nom. Ne fusionne jamais deux contacts dont seul le nom correspond : liste-les à part pour vérification.",
      "exchanges": 4,
      "moments": [
        {
          "type": "Refus",
          "text": "L’IA fusionnait deux homonymes : la règle de fusion a été restreinte."
        },
        {
          "type": "Vérification",
          "text": "37 cas douteux ont été relus à la main."
        }
      ],
      "tags": [
        "Tableur",
        "Nettoyage",
        "CRM"
      ],
      "date": "2026-09-30",
      "useful": 187,
      "week": 35,
      "repro": 16,
      "success": 81,
      "last": {
        "date": "2026-10-09",
        "tool": "Gemini",
        "model": "2.5 Pro"
      },
      "tested": [
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "Gemini",
          "2.5 Pro"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "table",
        "alt": "Tableau de contacts avec doublons fusionnés et cas à vérifier"
      },
      "goal": "donnees"
    },
    {
      "id": "site-traiteur",
      "title": "Site vitrine d’un traiteur avec demande de devis",
      "type": "projet",
      "domain": "Application web",
      "category": "Application web",
      "author": "Ousmane Sy",
      "tools": [
        [
          "Lovable"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Présenter les menus, la galerie et recevoir des demandes de devis pour des réceptions.",
      "steps": [
        "Rédiger le cahier des charges",
        "Générer la structure du site",
        "Relier le formulaire de devis",
        "Vérifier l’affichage sur mobile"
      ],
      "moments": [
        {
          "type": "Refus",
          "text": "Le formulaire envoyait les devis sans accusé de réception au client."
        },
        {
          "type": "Vérification",
          "text": "Chaque page a été testée sur trois tailles d’écran."
        }
      ],
      "tags": [
        "Site vitrine",
        "Restauration",
        "Formulaire"
      ],
      "date": "2026-10-08",
      "useful": 176,
      "week": 41,
      "media": {
        "kind": "mock",
        "mock": "site",
        "alt": "Page d’accueil du site d’un traiteur avec un bouton de demande de devis"
      },
      "goal": "site-vitrine"
    },
    {
      "id": "relance-devis",
      "title": "Relance automatique des devis restés sans réponse",
      "type": "projet",
      "domain": "Automatisation",
      "category": "Automatisation",
      "author": "Aïssatou Ndiaye",
      "tools": [
        [
          "Make"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Relancer les devis sans réponse après sept jours, avec une validation avant chaque envoi.",
      "steps": [
        "Lire les devis envoyés dans le tableur",
        "Rédiger une relance personnalisée",
        "Faire valider la relance",
        "Mettre à jour le statut du devis"
      ],
      "moments": [
        {
          "type": "Refus",
          "text": "Les relances partaient sans relecture : une étape de validation a été ajoutée."
        }
      ],
      "tags": [
        "Devis",
        "E-mail",
        "Relance"
      ],
      "date": "2026-09-24",
      "useful": 168,
      "week": 22,
      "media": {
        "kind": "mock",
        "mock": "flow-devis",
        "alt": "Scénario reliant le tableur, la rédaction, la validation et l’envoi"
      },
      "goal": "automatiser"
    },
    {
      "id": "marque-cosmetique",
      "title": "Palette et typographie d’une marque de soins au karité",
      "type": "iteration",
      "domain": "Identité visuelle",
      "category": "Identité visuelle",
      "author": "Fatoumata Coulibaly",
      "tools": [
        [
          "Recraft",
          "V3"
        ]
      ],
      "objective": "Une palette et une typographie cohérentes, lisibles sur l’emballage comme à l’écran.",
      "prompt": "Propose une palette de cinq couleurs inspirée du karité et de l’indigo, avec leurs codes hexadécimaux et un contraste suffisant pour le texte. Associe une typographie de titre et une de texte.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Vérification",
          "text": "Le contraste du texte sur la couleur sable était insuffisant."
        }
      ],
      "tags": [
        "Charte graphique",
        "Couleurs",
        "Cosmétique"
      ],
      "date": "2026-09-25",
      "useful": 158,
      "week": 27,
      "repro": 10,
      "success": 70,
      "last": {
        "date": "2026-10-05",
        "tool": "ChatGPT",
        "model": "GPT-5"
      },
      "tested": [
        [
          "Recraft",
          "V3"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "brand",
        "alt": "Cinq nuances de sable, d’ocre et d’indigo avec le nom de la marque"
      },
      "goal": "identite"
    },
    {
      "id": "extension-navigateur",
      "title": "Extension qui met en pause les vidéos en lecture automatique",
      "type": "projet",
      "domain": "Code et scripts",
      "category": "Code",
      "author": "Julien Moreau",
      "tools": [
        [
          "Cursor"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Une extension de navigateur légère, qui ne demande que les permissions nécessaires.",
      "steps": [
        "Décrire le comportement attendu",
        "Générer le manifeste et le script",
        "Tester sur cinq sites",
        "Préparer la publication"
      ],
      "moments": [
        {
          "type": "Refus",
          "text": "L’extension demandait l’accès à tous les sites : la permission a été limitée."
        },
        {
          "type": "Échec",
          "text": "Les vidéos ajoutées après le chargement de la page n’étaient pas détectées."
        }
      ],
      "tags": [
        "Extension",
        "JavaScript",
        "Navigateur"
      ],
      "date": "2026-10-06",
      "useful": 152,
      "week": 44,
      "media": {
        "kind": "mock",
        "mock": "diff",
        "alt": "Manifeste de l’extension où la permission globale est remplacée"
      },
      "goal": "scripts"
    },
    {
      "id": "formulaire-asso",
      "title": "Formulaire d’inscription accessible pour un club sportif",
      "type": "iteration",
      "domain": "Application web",
      "category": "Application web",
      "author": "Hugo Girard",
      "tools": [
        [
          "v0"
        ]
      ],
      "objective": "Un formulaire utilisable au clavier, avec des erreurs claires pour les lecteurs d’écran.",
      "prompt": "Chaque champ doit avoir un libellé visible et un message d’erreur relié par aria-describedby. Après l’envoi, place le focus sur le premier champ en erreur.",
      "exchanges": 4,
      "moments": [
        {
          "type": "Correction",
          "text": "Les erreurs n’étaient signalées que par la couleur rouge."
        },
        {
          "type": "Vérification",
          "text": "Le parcours a été testé avec un lecteur d’écran."
        }
      ],
      "tags": [
        "Accessibilité",
        "Formulaire",
        "Association"
      ],
      "date": "2026-10-09",
      "useful": 143,
      "week": 38,
      "repro": 9,
      "success": 78,
      "last": {
        "date": "2026-10-11",
        "tool": "Claude",
        "model": "Sonnet 4.5"
      },
      "tested": [
        [
          "v0"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "form",
        "alt": "Formulaire d’inscription avec un message d’erreur sous le champ e-mail"
      },
      "goal": "site-vitrine"
    },
    {
      "id": "traduction-glossaire",
      "title": "Traduction de fiches produits avec un glossaire métier",
      "type": "iteration",
      "domain": "Texte et rédaction",
      "category": "Traduction",
      "author": "Awa Sarr",
      "tools": [
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Traduire en anglais sans perdre le vocabulaire précis du métier.",
      "prompt": "Traduis cette fiche en anglais en respectant strictement le glossaire ci-dessous. Signale chaque terme absent du glossaire au lieu de le traduire librement.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Correction",
          "text": "« Beurre de karité brut » devenait « raw butter » : un glossaire a été ajouté."
        }
      ],
      "tags": [
        "Traduction",
        "Glossaire",
        "E-commerce"
      ],
      "date": "2026-10-05",
      "useful": 131,
      "week": 34,
      "repro": 8,
      "success": 75,
      "last": {
        "date": "2026-10-08",
        "tool": "DeepSeek",
        "model": "V3.2"
      },
      "tested": [
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "DeepSeek",
          "V3.2"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "translation",
        "alt": "Fiche produit en français et sa traduction anglaise, avec le terme du glossaire"
      },
      "goal": "textes"
    },
    {
      "id": "resume-canal",
      "title": "Résumé quotidien des décisions d’un canal d’équipe",
      "type": "iteration",
      "domain": "Automatisation",
      "category": "Automatisation",
      "author": "Thomas Lefèvre",
      "tools": [
        [
          "Zapier"
        ],
        [
          "Claude",
          "Haiku 4.5"
        ]
      ],
      "objective": "Recevoir chaque matin les décisions, les questions ouvertes et les tâches de la veille.",
      "prompt": "Résume les messages des dernières 24 heures en trois rubriques : décisions, questions ouvertes, tâches attribuées. Cite l’auteur de chaque décision. Ignore les messages de bienvenue et les réactions.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Correction",
          "text": "Le résumé attribuait des décisions à la mauvaise personne."
        }
      ],
      "tags": [
        "Résumé",
        "Équipe",
        "Messagerie"
      ],
      "date": "2026-10-04",
      "useful": 121,
      "week": 30,
      "repro": 11,
      "success": 73,
      "last": {
        "date": "2026-10-10",
        "tool": "Claude",
        "model": "Haiku 4.5"
      },
      "tested": [
        [
          "Claude",
          "Haiku 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "digest",
        "alt": "Résumé du matin avec les décisions et les questions ouvertes"
      },
      "goal": "automatiser"
    },
    {
      "id": "facade-goree",
      "title": "Façade de Gorée en lumière de fin de journée",
      "type": "prompt",
      "domain": "Image et illustration",
      "category": "Photographie",
      "author": "Mariam Diop",
      "tools": [
        [
          "Flux",
          "1.1 Pro"
        ]
      ],
      "objective": "Une photographie de façade pour illustrer un guide de voyage.",
      "prompt": "Photographie d’une façade ocre rose à Gorée, volets bleu passé, palmiers, pirogue colorée au premier plan, lumière dorée de fin de journée, 35 mm, couleurs naturelles.",
      "attempts": 5,
      "moments": [
        {
          "type": "Correction",
          "text": "Les pirogues étaient déformées : le premier plan a été simplifié."
        }
      ],
      "tags": [
        "Voyage",
        "Photographie",
        "Architecture"
      ],
      "date": "2026-10-07",
      "useful": 118,
      "week": 29,
      "repro": 6,
      "success": 67,
      "last": {
        "date": "2026-10-09",
        "tool": "Midjourney",
        "model": "v7"
      },
      "tested": [
        [
          "Flux",
          "1.1 Pro"
        ],
        [
          "Midjourney",
          "v7"
        ]
      ],
      "media": {
        "kind": "image",
        "name": "goree",
        "large": 1280,
        "alt": "Façade rose bordée de palmiers, avec une barque au premier plan"
      },
      "goal": "photo"
    },
    {
      "id": "jingle-podcast",
      "title": "Générique de 10 secondes pour un podcast",
      "type": "iteration",
      "domain": "Musique et son",
      "category": "Musique",
      "author": "Ibrahima Sow",
      "tools": [
        [
          "Suno",
          "v4.5"
        ]
      ],
      "objective": "Un générique instrumental reconnaissable, avec une fin nette.",
      "prompt": "Générique instrumental de 10 secondes pour un podcast de société, kora et basse douce, tempo 96, motif mélodique simple répété deux fois, fin franche, sans voix.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Correction",
          "text": "Le morceau se terminait en fondu : une fin franche a été demandée."
        }
      ],
      "tags": [
        "Podcast",
        "Générique",
        "Instrumental"
      ],
      "date": "2026-09-27",
      "useful": 109,
      "week": 18,
      "repro": 13,
      "success": 69,
      "last": {
        "date": "2026-10-06",
        "tool": "Udio",
        "model": "v1.5"
      },
      "tested": [
        [
          "Suno",
          "v4.5"
        ],
        [
          "Udio",
          "v1.5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "wave",
        "alt": "Lecteur audio du générique de 10 secondes"
      },
      "goal": "audio-video"
    },
    {
      "id": "requete-sql",
      "title": "Requête SQL des clients inactifs depuis 90 jours",
      "type": "prompt",
      "domain": "Code et scripts",
      "category": "Code",
      "author": "Mariam Diop",
      "tools": [
        [
          "DeepSeek",
          "V3.2"
        ]
      ],
      "objective": "Retrouver les clients sans commande récente pour une campagne de relance.",
      "prompt": "Écris une requête PostgreSQL qui liste les clients sans commande depuis 90 jours, avec la date de leur dernière commande et leur total dépensé. Tables : clients(id, nom, email) et commandes(id, client_id, date, montant).",
      "attempts": 1,
      "moments": [
        {
          "type": "Vérification",
          "text": "Les clients sans aucune commande étaient exclus : la jointure a été corrigée."
        }
      ],
      "tags": [
        "SQL",
        "Base de données",
        "Relance"
      ],
      "date": "2026-10-11",
      "useful": 97,
      "week": 61,
      "repro": 12,
      "success": 92,
      "last": {
        "date": "2026-10-13",
        "tool": "Claude",
        "model": "Sonnet 4.5"
      },
      "tested": [
        [
          "DeepSeek",
          "V3.2"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "sql",
        "alt": "Requête SQL avec une jointure externe sur les commandes"
      },
      "goal": "donnees"
    },
    {
      "id": "quiz-histoire",
      "title": "Quiz de dix questions sur l’empire du Mali",
      "type": "prompt",
      "domain": "Éducation",
      "category": "Éducation",
      "author": "Moussa Diallo",
      "tools": [
        [
          "NotebookLM"
        ]
      ],
      "objective": "Un quiz fidèle aux documents du cours, avec la source de chaque réponse.",
      "prompt": "À partir des trois documents fournis uniquement, crée un quiz de 10 questions à choix multiples sur l’empire du Mali. Donne la bonne réponse et le passage source pour chaque question.",
      "attempts": 1,
      "moments": [
        {
          "type": "Vérification",
          "text": "Chaque réponse a été comparée au passage source."
        }
      ],
      "tags": [
        "Quiz",
        "Histoire",
        "Collège"
      ],
      "date": "2026-10-09",
      "useful": 92,
      "week": 40,
      "repro": 6,
      "success": 100,
      "last": {
        "date": "2026-10-12",
        "tool": "Gemini",
        "model": "2.5 Pro"
      },
      "tested": [
        [
          "NotebookLM"
        ],
        [
          "Gemini",
          "2.5 Pro"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "quiz",
        "alt": "Question de quiz sur Tombouctou avec sa source"
      },
      "goal": "reviser"
    },
    {
      "id": "pluie-bamako",
      "title": "Courbe des précipitations mensuelles à Bamako",
      "type": "prompt",
      "domain": "Analyse de données",
      "category": "Analyse de données",
      "author": "Koffi Amoussou",
      "tools": [
        [
          "Gemini",
          "2.5 Pro"
        ]
      ],
      "objective": "Un graphique lisible, avec ses unités et sa source, à partir d’un fichier CSV.",
      "prompt": "À partir de ce fichier CSV, trace la courbe des précipitations mensuelles à Bamako en 2025. Mets en évidence la saison des pluies, nomme les axes avec leurs unités et ajoute la source sous le graphique.",
      "attempts": 2,
      "moments": [
        {
          "type": "Correction",
          "text": "Les mois étaient triés par ordre alphabétique : l’ordre chronologique a été imposé."
        }
      ],
      "tags": [
        "Graphique",
        "Climat",
        "CSV"
      ],
      "date": "2026-10-02",
      "useful": 84,
      "week": 19,
      "repro": 7,
      "success": 86,
      "last": {
        "date": "2026-10-07",
        "tool": "ChatGPT",
        "model": "GPT-5"
      },
      "tested": [
        [
          "Gemini",
          "2.5 Pro"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "line",
        "alt": "Courbe des précipitations avec la saison des pluies mise en évidence"
      },
      "goal": "donnees"
    },
    {
      "id": "voix-off",
      "title": "Voix off posée pour un tutoriel vidéo",
      "type": "prompt",
      "domain": "Musique et son",
      "category": "Voix",
      "author": "Léa Martin",
      "tools": [
        [
          "ElevenLabs",
          "Multilingual v2"
        ]
      ],
      "objective": "Une voix claire et chaleureuse, avec un rythme adapté aux étapes d’un tutoriel.",
      "prompt": "Voix féminine, français standard, débit posé, ton chaleureux et clair. Marque une courte pause après chaque étape numérotée du script.",
      "attempts": 3,
      "moments": [],
      "tags": [
        "Voix off",
        "Tutoriel",
        "Vidéo"
      ],
      "date": "2026-09-21",
      "useful": 76,
      "week": 9,
      "repro": 5,
      "success": 80,
      "last": {
        "date": "2026-10-01",
        "tool": "ElevenLabs",
        "model": "Multilingual v2"
      },
      "tested": [
        [
          "ElevenLabs",
          "Multilingual v2"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "voice",
        "alt": "Lecteur audio de la voix off avec un extrait du script"
      },
      "goal": "audio-video"
    },
    {
      "id": "affiche-alpes",
      "title": "Affiche de randonnée au lac alpin",
      "type": "iteration",
      "domain": "Image et illustration",
      "category": "Illustration",
      "author": "Sébastien Roy",
      "tools": [
        [
          "Midjourney",
          "v6.1"
        ]
      ],
      "objective": "Une série d’affiches peintes aux couleurs constantes pour un office de tourisme.",
      "prompt": "Lac alpin émeraude entre forêts de sapins et sommets calcaires, petite cabane rouille au bord de l’eau, brume du matin, illustration peinte détaillée --sref 3127845 --ar 2:3",
      "exchanges": 3,
      "moments": [
        {
          "type": "Découverte",
          "text": "Le code de style --sref a stabilisé les couleurs sur toute la série."
        }
      ],
      "tags": [
        "Affiche",
        "Paysage",
        "Tourisme"
      ],
      "date": "2026-09-16",
      "useful": 264,
      "week": 12,
      "repro": 23,
      "success": 52,
      "last": {
        "date": "2026-09-30",
        "tool": "Midjourney",
        "model": "v6.1"
      },
      "tested": [
        [
          "Midjourney",
          "v6.1"
        ]
      ],
      "obsolete": {
        "model": "Midjourney v7",
        "count": 4
      },
      "media": {
        "kind": "image",
        "name": "silence-alpes",
        "large": 1280,
        "alt": "Lac émeraude au pied de montagnes calcaires, avec une cabane rouge"
      },
      "goal": "serie-images"
    },
    {
      "id": "animation-logo",
      "title": "Animation d’un logo en six secondes",
      "type": "iteration",
      "domain": "Vidéo",
      "category": "Vidéo",
      "author": "Kofi Mensah",
      "tools": [
        [
          "Kling",
          "2.1"
        ]
      ],
      "objective": "Faire apparaître un logo sans déformer les lettres, pour l’introduction d’une chaîne.",
      "prompt": "À partir de cette image du logo, fais apparaître le symbole par un tracé lumineux, puis le nom en fondu. Caméra fixe, fond blanc, aucune déformation des lettres.",
      "exchanges": 4,
      "moments": [
        {
          "type": "Correction",
          "text": "Les lettres se déformaient pendant le mouvement : la caméra a été fixée."
        }
      ],
      "tags": [
        "Animation",
        "Logo",
        "Introduction"
      ],
      "date": "2026-10-11",
      "useful": 64,
      "week": 37,
      "repro": 4,
      "success": 50,
      "last": {
        "date": "2026-10-12",
        "tool": "Runway",
        "model": "Gen-4"
      },
      "tested": [
        [
          "Kling",
          "2.1"
        ],
        [
          "Runway",
          "Gen-4"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "video",
        "alt": "Trois images clés de l’animation du logo et sa ligne de temps"
      },
      "goal": "audio-video"
    },
    {
      "id": "bissap",
      "title": "Photo produit pour une infusion de bissap",
      "type": "prompt",
      "domain": "Image et illustration",
      "category": "Image",
      "author": "Ndeye Fall",
      "tools": [
        [
          "Flux",
          "1.1 Pro"
        ]
      ],
      "objective": "Une photo produit lumineuse pour la page d’une infusion artisanale.",
      "prompt": "Photo produit en studio, tasse en céramique blanche remplie d’infusion de bissap rouge rubis, fleurs d’hibiscus séchées autour, lumière naturelle douce venant de gauche, fond lin écru, faible profondeur de champ.",
      "attempts": 3,
      "moments": [],
      "tags": [
        "Photo produit",
        "Alimentation",
        "E-commerce"
      ],
      "date": "2026-10-13",
      "useful": 12,
      "week": 12,
      "repro": 0,
      "media": {
        "kind": "image",
        "name": "bissap",
        "large": 1280,
        "alt": "Tasse d’infusion rouge posée sur des fleurs d’hibiscus séchées"
      },
      "goal": "photo"
    },
    {
      "id": "renommer-photos",
      "title": "Script Python qui renomme des photos selon leur date",
      "type": "prompt",
      "domain": "Code et scripts",
      "category": "Code",
      "author": "Julien Moreau",
      "tools": [
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Renommer 248 photos selon leur date de prise de vue, sans risque de perdre un fichier.",
      "prompt": "Écris un script Python qui renomme les photos JPG d’un dossier selon leur date EXIF, au format AAAA-MM-JJ_HHMMSS. Ajoute un mode simulation qui affiche les changements sans modifier les fichiers.",
      "attempts": 1,
      "moments": [
        {
          "type": "Vérification",
          "text": "Le mode simulation a été exécuté avant tout renommage."
        }
      ],
      "tags": [
        "Python",
        "Fichiers",
        "Photos"
      ],
      "date": "2026-10-13",
      "useful": 9,
      "week": 9,
      "repro": 1,
      "success": 100,
      "last": {
        "date": "2026-10-13",
        "tool": "Claude",
        "model": "Sonnet 4.5"
      },
      "tested": [
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "code",
        "alt": "Extrait d’un script Python qui parcourt un dossier de photos"
      },
      "goal": "scripts"
    },
    {
      "id": "icones-3d",
      "title": "Icônes 3D pour une application de covoiturage",
      "type": "iteration",
      "domain": "Image et illustration",
      "category": "Image",
      "author": "Sébastien Roy",
      "tools": [
        [
          "Midjourney",
          "v7"
        ]
      ],
      "objective": "Une série d’icônes en relief, cohérentes entre elles.",
      "prompt": "Icône 3D d’une voiture compacte, formes arrondies, matière mate, bleu pâle et pêche, éclairage doux, fond uni, même angle de vue que l’image de référence --ar 1:1",
      "exchanges": 2,
      "moments": [
        {
          "type": "Correction",
          "text": "L’angle de vue changeait d’une icône à l’autre : une image de référence a été ajoutée."
        }
      ],
      "tags": [
        "Icônes",
        "3D",
        "Application mobile"
      ],
      "date": "2026-10-13",
      "useful": 6,
      "week": 6,
      "repro": 0,
      "media": {
        "kind": "image",
        "name": "formes-pastel",
        "large": 1200,
        "alt": "Formes arrondies en relief aux tons bleu pâle et pêche"
      },
      "goal": "serie-images"
    },
    {
      "id": "fiches-revision",
      "title": "Fiches de révision sur la photosynthèse",
      "type": "iteration",
      "domain": "Éducation",
      "category": "Éducation",
      "author": "Awa Sarr",
      "tools": [
        [
          "Gemini",
          "2.5 Pro"
        ]
      ],
      "objective": "Douze fiches de révision fidèles au cours de SVT.",
      "prompt": "À partir de mon cours en pièce jointe, crée 12 fiches question-réponse sur la photosynthèse. Chaque réponse doit citer la page du cours dont elle provient.",
      "exchanges": 2,
      "moments": [
        {
          "type": "Vérification",
          "text": "Chaque réponse cite désormais la page du cours."
        }
      ],
      "tags": [
        "Révisions",
        "SVT",
        "Lycée"
      ],
      "date": "2026-10-13",
      "useful": 5,
      "week": 5,
      "repro": 0,
      "media": {
        "kind": "mock",
        "mock": "cards",
        "alt": "Fiches de révision empilées sur la photosynthèse"
      },
      "goal": "reviser"
    },
    {
      "id": "teaser-festival",
      "title": "Teaser de 15 secondes pour un festival de musique",
      "type": "projet",
      "domain": "Vidéo",
      "category": "Vidéo",
      "author": "Ibrahima Sow",
      "tools": [
        [
          "Runway",
          "Gen-4"
        ],
        [
          "Suno",
          "v4.5"
        ]
      ],
      "objective": "Annoncer la programmation d’un festival avec un montage rythmé.",
      "steps": [
        "Écrire le découpage plan par plan",
        "Générer les plans de scène",
        "Composer la musique",
        "Monter sur le tempo"
      ],
      "moments": [
        {
          "type": "Découverte",
          "text": "Composer la musique avant le montage a permis de caler les coupes sur le tempo."
        }
      ],
      "tags": [
        "Teaser",
        "Événement",
        "Montage"
      ],
      "date": "2026-10-13",
      "useful": 4,
      "week": 4,
      "media": {
        "kind": "image",
        "name": "scene-festival",
        "large": 1280,
        "alt": "Faisceaux de lumière bleue traversant une scène dans la brume"
      },
      "goal": "audio-video"
    },
    {
      "id": "logo-karite",
      "title": "Logo pour une coopérative de karité",
      "type": "iteration",
      "domain": "Identité visuelle",
      "category": "Identité visuelle",
      "author": "Fatoumata Coulibaly",
      "tools": [
        [
          "Ideogram",
          "3.0"
        ]
      ],
      "objective": "Un logo lisible en petit format, avec le nom exact de la coopérative.",
      "prompt": "Logo pour « Karité de Koutiala » : une noix de karité stylisée et une feuille bleue, trait épais, nom en dessous, fond blanc, aucun autre texte.",
      "exchanges": 2,
      "moments": [
        {
          "type": "Correction",
          "text": "Le nom était mal orthographié : il a été placé entre guillemets."
        }
      ],
      "tags": [
        "Logo",
        "Coopérative",
        "Agriculture"
      ],
      "date": "2026-10-13",
      "useful": 3,
      "week": 3,
      "repro": 0,
      "media": {
        "kind": "mock",
        "mock": "logo",
        "alt": "Logo avec une noix de karité stylisée et le nom de la coopérative"
      },
      "goal": "identite"
    },
    {
      "id": "visuel-conference",
      "title": "Visuel d’ouverture pour une conférence tech",
      "type": "prompt",
      "domain": "Image et illustration",
      "category": "Image",
      "author": "Thomas Lefèvre",
      "tools": [
        [
          "Midjourney",
          "v7"
        ]
      ],
      "objective": "Un visuel abstrait aux couleurs de la conférence, avec la place pour le titre.",
      "prompt": "Volutes abstraites en relief, bleu nuit et bleu électrique, éclairage studio, composition horizontale avec un espace libre à gauche pour le titre --ar 16:9",
      "attempts": 6,
      "moments": [],
      "tags": [
        "Événement",
        "Abstrait",
        "Présentation"
      ],
      "date": "2026-10-13",
      "useful": 3,
      "week": 3,
      "repro": 0,
      "media": {
        "kind": "image",
        "name": "vagues-3d",
        "large": 1200,
        "alt": "Volutes bleues en relief superposées sur fond bleu nuit"
      },
      "goal": "serie-images"
    },
    {
      "id": "pochette-album",
      "title": "Motif génératif pour une pochette d’album",
      "type": "iteration",
      "domain": "Image et illustration",
      "category": "Image",
      "author": "Hugo Girard",
      "tools": [
        [
          "Stable Diffusion",
          "SDXL"
        ]
      ],
      "objective": "Un motif hypnotique pour la pochette d’un album électronique.",
      "prompt": "Spirale de fines lames métalliques, bleu nuit, reflets turquoise sur les bords, vue de dessus, symétrie radiale, haute définition",
      "exchanges": 3,
      "moments": [],
      "tags": [
        "Pochette",
        "Musique",
        "Motif"
      ],
      "date": "2026-10-13",
      "useful": 2,
      "week": 2,
      "repro": 0,
      "media": {
        "kind": "image",
        "name": "spirale",
        "large": 1280,
        "alt": "Spirale de fines lames bleu nuit aux bords turquoise"
      },
      "goal": "serie-images"
    },
    {
      "id": "resa-terrain",
      "title": "Réservation d’un terrain de foot à cinq",
      "type": "projet",
      "domain": "Application web",
      "category": "Application web",
      "author": "Moussa Diallo",
      "tools": [
        [
          "Lovable"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Laisser les équipes réserver un créneau d’une heure et payer sur place.",
      "steps": [
        "Décrire les terrains et les horaires",
        "Générer le calendrier de réservation",
        "Bloquer le créneau au moment de valider",
        "Envoyer la confirmation par SMS"
      ],
      "moments": [
        {
          "type": "Vérification",
          "text": "Deux équipes réservaient le même créneau en même temps."
        },
        {
          "type": "Correction",
          "text": "Les créneaux du dimanche étaient décalés d’une heure après le changement d’heure."
        }
      ],
      "tags": [
        "Réservation",
        "Sport",
        "Calendrier"
      ],
      "date": "2026-10-07",
      "useful": 233,
      "week": 61,
      "media": {
        "kind": "mock",
        "mock": "calendar",
        "alt": "Calendrier de réservation de deux terrains, avec les créneaux pris et libres"
      },
      "goal": "rendez-vous"
    },
    {
      "id": "agenda-kine",
      "title": "Agenda en ligne d’un cabinet de kinésithérapie",
      "type": "iteration",
      "domain": "Application web",
      "category": "Application web",
      "author": "Hugo Girard",
      "tools": [
        [
          "ChatGPT",
          "GPT-5"
        ]
      ],
      "objective": "Proposer des séances de 30 ou 45 minutes selon le soin, sans chevauchement.",
      "prompt": "Les séances durent 30 ou 45 minutes selon le soin. Calcule les créneaux disponibles à partir des horaires du cabinet et empêche qu’une séance de 45 minutes chevauche la suivante.",
      "exchanges": 4,
      "moments": [
        {
          "type": "Correction",
          "text": "Les séances de 45 minutes chevauchaient le créneau suivant."
        },
        {
          "type": "Refus",
          "text": "L’IA proposait d’enregistrer le motif de consultation sans consentement."
        }
      ],
      "tags": [
        "Santé",
        "Réservation",
        "Agenda"
      ],
      "date": "2026-10-09",
      "useful": 154,
      "week": 52,
      "repro": 12,
      "success": 75,
      "last": {
        "date": "2026-10-11",
        "tool": "Claude",
        "model": "Sonnet 4.5"
      },
      "tested": [
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "agenda",
        "alt": "Agenda de la journée avec des séances de 30 et 45 minutes"
      },
      "goal": "rendez-vous"
    },
    {
      "id": "cours-yoga",
      "title": "Inscriptions aux cours de yoga avec liste d’attente",
      "type": "projet",
      "domain": "Application web",
      "category": "Application web",
      "author": "Koffi Amoussou",
      "tools": [
        [
          "Cursor"
        ],
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Remplir chaque cours sans dépasser le nombre de places, et prévenir la personne suivante en cas d’annulation.",
      "steps": [
        "Modéliser les cours et les places",
        "Générer l’inscription et la liste d’attente",
        "Libérer la place en cas d’annulation",
        "Tester des inscriptions simultanées"
      ],
      "moments": [
        {
          "type": "Vérification",
          "text": "Deux personnes obtenaient la dernière place en même temps."
        }
      ],
      "tags": [
        "Réservation",
        "Sport",
        "Liste d’attente"
      ],
      "date": "2026-09-28",
      "useful": 128,
      "week": 20,
      "media": {
        "kind": "mock",
        "mock": "waitlist",
        "alt": "Cours de yoga complet avec trois personnes en liste d’attente"
      },
      "goal": "rendez-vous"
    },
    {
      "id": "logo-tontine",
      "title": "Logo d’une application de tontine",
      "type": "iteration",
      "domain": "Identité visuelle",
      "category": "Identité visuelle",
      "author": "Ousmane Sy",
      "tools": [
        [
          "Ideogram",
          "3.0"
        ]
      ],
      "objective": "Un logo simple, lisible sur une icône d’application, avec le nom exact.",
      "prompt": "Logo pour « Natt » : trois cercles qui se rejoignent, trait épais, bleu nuit et ocre, le nom en dessous en minuscules, fond blanc, aucun autre texte.",
      "exchanges": 3,
      "moments": [
        {
          "type": "Correction",
          "text": "Le nom apparaissait « Nat » : il a été placé entre guillemets."
        },
        {
          "type": "Vérification",
          "text": "Le symbole reste lisible à 32 pixels."
        }
      ],
      "tags": [
        "Logo",
        "Finance",
        "Application mobile"
      ],
      "date": "2026-10-05",
      "useful": 118,
      "week": 33,
      "repro": 7,
      "success": 71,
      "last": {
        "date": "2026-10-10",
        "tool": "Recraft",
        "model": "V3"
      },
      "tested": [
        [
          "Ideogram",
          "3.0"
        ],
        [
          "Recraft",
          "V3"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "logo-natt",
        "alt": "Logo de trois cercles entrelacés avec le nom Natt"
      },
      "goal": "identite"
    },
    {
      "id": "trier-telechargements",
      "title": "Script qui range le dossier Téléchargements",
      "type": "prompt",
      "domain": "Code et scripts",
      "category": "Code",
      "author": "Mariam Diop",
      "tools": [
        [
          "Claude",
          "Sonnet 4.5"
        ]
      ],
      "objective": "Ranger des centaines de fichiers par type, sans rien supprimer ni déplacer par erreur.",
      "prompt": "Écris un script Python qui range les fichiers du dossier Téléchargements dans des sous-dossiers par type (Images, Documents, Archives). Commence par un mode simulation qui liste les déplacements prévus, ne supprime jamais rien et ignore les fichiers en cours de téléchargement.",
      "attempts": 2,
      "moments": [
        {
          "type": "Vérification",
          "text": "La simulation a montré que les fichiers en cours de téléchargement auraient été déplacés."
        }
      ],
      "tags": [
        "Python",
        "Fichiers",
        "Rangement"
      ],
      "date": "2026-10-10",
      "useful": 136,
      "week": 58,
      "repro": 19,
      "success": 89,
      "last": {
        "date": "2026-10-13",
        "tool": "ChatGPT",
        "model": "GPT-5"
      },
      "tested": [
        [
          "Claude",
          "Sonnet 4.5"
        ],
        [
          "ChatGPT",
          "GPT-5"
        ],
        [
          "DeepSeek",
          "V3.2"
        ]
      ],
      "media": {
        "kind": "mock",
        "mock": "files",
        "alt": "Simulation listant les déplacements prévus vers les dossiers Images, Documents et Archives"
      },
      "goal": "scripts"
    }
  ],
  "topics": [
    {
      "id": "sujet-1",
      "kind": "clinique",
      "title": "Mon personnage change de visage à chaque nouvelle image",
      "author": "Koffi Amoussou",
      "tool": "Midjourney",
      "model": "v7",
      "replies": 5,
      "status": "resolved",
      "domain": "Image et illustration",
      "useful": 41,
      "date": "2026-10-12",
      "body": "Je prépare une série de six portraits pour une histoire illustrée. Même en recopiant la même description, le visage change d’une scène à l’autre : la forme des yeux, la coupe et même l’âge apparent."
    },
    {
      "id": "sujet-2",
      "kind": "question",
      "title": "Comment vérifier qu’un script ne supprime rien par erreur ?",
      "author": "Mariam Diop",
      "tool": "ChatGPT",
      "model": "GPT-5",
      "replies": 3,
      "status": "open",
      "domain": "Code et scripts",
      "useful": 27,
      "date": "2026-10-11",
      "body": "Je veux faire trier mes fichiers dans plusieurs dossiers par un script Python écrit avec ChatGPT. Avant de le lancer, comment voir exactement les fichiers concernés et m’assurer qu’aucun document utile ne sera supprimé ?"
    },
    {
      "id": "sujet-3",
      "kind": "astuce",
      "title": "Isoler le texte exact dans un logo généré",
      "author": "Fatoumata Coulibaly",
      "tool": "Ideogram",
      "model": "3.0",
      "replies": 3,
      "status": "open",
      "domain": "Identité visuelle",
      "useful": 36,
      "date": "2026-10-10",
      "body": "Les noms de marque sortent souvent avec une lettre en trop ou en moins. Mettre le texte exact entre guillemets, en capitales, et le décrire séparément du symbole règle le problème dans la plupart des cas."
    },
    {
      "id": "sujet-4",
      "kind": "clinique",
      "title": "Le résumé de mon rapport invente des chiffres",
      "author": "Julien Moreau",
      "tool": "ChatGPT",
      "model": "GPT-5",
      "replies": 4,
      "status": "resolved",
      "domain": "Texte et rédaction",
      "useful": 38,
      "date": "2026-10-09",
      "body": "Je fais résumer un rapport d’activité de 40 pages. Le résumé est clair, mais deux chiffres n’existent nulle part dans le rapport."
    },
    {
      "id": "sujet-5",
      "kind": "retour",
      "title": "Ce que j’ai ajusté pour automatiser le tri de mes factures",
      "author": "Moussa Diallo",
      "tool": "n8n",
      "model": "",
      "replies": 3,
      "status": "open",
      "domain": "Automatisation",
      "useful": 24,
      "date": "2026-10-08",
      "body": "Trois semaines de tri automatique des factures reçues par e-mail, avec n8n et Claude Haiku 4.5. Voici ce qui a changé entre la première version et celle qui tourne aujourd’hui."
    },
    {
      "id": "sujet-6",
      "kind": "discussion",
      "title": "Comment garder un ton naturel dans les textes générés ?",
      "author": "Yacine Benali",
      "tool": "Le Chat",
      "model": "Mistral Large 2",
      "replies": 4,
      "status": "open",
      "domain": "Texte et rédaction",
      "useful": 33,
      "date": "2026-10-07",
      "body": "Mes réponses aux avis clients se ressemblent toutes : « Nous sommes ravis… », « N’hésitez pas… ». Quelles méthodes employez-vous pour obtenir un ton proche de votre façon d’écrire ?"
    },
    {
      "id": "sujet-7",
      "kind": "question",
      "title": "Comment éviter deux réservations sur le même créneau ?",
      "author": "Aïssatou Ndiaye",
      "tool": "Claude",
      "model": "Sonnet 4.5",
      "replies": 0,
      "status": "open",
      "domain": "Application web",
      "useful": 11,
      "date": "2026-10-06",
      "body": "Mon site de réservation pour un salon de coiffure accepte deux rendez-vous sur le même créneau quand deux clientes réservent en même temps. Que faut-il demander pour que le créneau soit vérifié au moment de confirmer ?"
    },
    {
      "id": "sujet-8",
      "kind": "question",
      "title": "Comparer les ventes sans mélanger les périodes",
      "author": "Claire Dubois",
      "tool": "ChatGPT",
      "model": "GPT-5",
      "replies": 3,
      "status": "open",
      "domain": "Analyse de données",
      "useful": 15,
      "date": "2026-10-05",
      "body": "Je compare les ventes de septembre à celles d’août, mais le tableau généré mélange parfois les semaines à cheval sur deux mois. Comment cadrer la demande ?"
    },
    {
      "id": "sujet-9",
      "kind": "discussion",
      "title": "Garder une texture de gouache sans perdre les détails du portrait",
      "author": "Kofi Mensah",
      "tool": "Midjourney",
      "model": "v7",
      "replies": 3,
      "status": "open",
      "domain": "Image et illustration",
      "useful": 19,
      "date": "2026-10-04",
      "body": "Plus j’insiste sur la texture de gouache, plus les détails du visage se perdent. Comment trouvez-vous l’équilibre ?"
    },
    {
      "id": "sujet-10",
      "kind": "question",
      "title": "Structurer un tableau à partir de notes de réunion",
      "author": "Léa Martin",
      "tool": "Claude",
      "model": "Sonnet 4.5",
      "replies": 0,
      "status": "open",
      "domain": "Texte et rédaction",
      "useful": 6,
      "date": "2026-10-03",
      "body": "J’ai des notes de réunion en vrac : décisions, tâches, questions ouvertes. Je voudrais un tableau avec le responsable et l’échéance de chaque tâche, mais certaines échéances sont inventées. Comment l’éviter ?"
    },
    {
      "id": "sujet-11",
      "kind": "astuce",
      "title": "Faire relire une traduction avec un glossaire métier",
      "author": "Awa Sarr",
      "tool": "ChatGPT",
      "model": "GPT-5",
      "replies": 3,
      "status": "open",
      "domain": "Texte et rédaction",
      "useful": 22,
      "date": "2026-10-02",
      "body": "Pour une traduction technique, je fournis un glossaire de dix à vingt termes et je demande une relecture limitée à ces termes. Les contresens sur le vocabulaire métier disparaissent."
    },
    {
      "id": "sujet-12",
      "kind": "retour",
      "title": "Préparer des sous-titres à partir d’un entretien",
      "author": "Hugo Girard",
      "tool": "Le Chat",
      "model": "Mistral Large 2",
      "replies": 2,
      "status": "closed",
      "domain": "Vidéo",
      "useful": 9,
      "date": "2026-10-01",
      "body": "Retour sur les sous-titres d’un entretien de 25 minutes : transcription, découpage, puis relecture."
    },
    {
      "id": "sujet-13",
      "kind": "clinique",
      "title": "Mon générique de podcast dépasse toujours les 10 secondes",
      "author": "Ndeye Fall",
      "tool": "Suno",
      "model": "v4.5",
      "replies": 1,
      "status": "open",
      "domain": "Musique et son",
      "useful": 4,
      "date": "2026-10-13",
      "body": "Je cherche un générique court pour l’ouverture de mon podcast. Malgré la durée indiquée dans la demande, chaque morceau dure au moins 30 secondes."
    },
    {
      "id": "sujet-14",
      "kind": "question",
      "title": "L’agent modifie des fichiers que je ne lui ai pas demandé de toucher",
      "author": "Thomas Lefèvre",
      "tool": "Cursor",
      "model": "",
      "replies": 0,
      "status": "open",
      "domain": "Code et scripts",
      "useful": 2,
      "date": "2026-10-13",
      "body": "Je demande à l’agent de corriger la couleur d’un bouton, et il modifie aussi trois autres fichiers. Comment limiter son champ d’action ?"
    },
    {
      "id": "sujet-15",
      "kind": "astuce",
      "title": "Faire écrire les tests avant la fonction",
      "author": "Ousmane Sy",
      "tool": "Claude",
      "model": "Sonnet 4.5",
      "replies": 2,
      "status": "open",
      "domain": "Application web",
      "useful": 29,
      "date": "2026-10-12",
      "body": "Avant de demander une fonction, je fais écrire les tests des cas limites. Je relis les tests, puis je demande la fonction qui les fait passer : les oublis apparaissent avant même d’exécuter le code."
    },
    {
      "id": "sujet-16",
      "kind": "question",
      "title": "Les mains se déforment dans mes plans de plus de 5 secondes",
      "author": "Sébastien Roy",
      "tool": "Runway",
      "model": "Gen-4",
      "replies": 0,
      "status": "open",
      "domain": "Vidéo",
      "useful": 5,
      "date": "2026-10-12",
      "body": "Dans un teaser, mes plans de 8 secondes montrent une musicienne qui joue de la guitare. Après 5 secondes environ, ses doigts fusionnent ou se multiplient. Faut-il raccourcir les plans ou décrire le geste autrement ?"
    },
    {
      "id": "sujet-17",
      "kind": "clinique",
      "title": "Les questions de mon quiz sortent du programme",
      "author": "Awa Sarr",
      "tool": "Gemini",
      "model": "2.5 Pro",
      "replies": 3,
      "status": "resolved",
      "domain": "Éducation",
      "useful": 17,
      "date": "2026-10-11",
      "body": "Je prépare un quiz de révision pour mon fils à partir de son cours d’histoire. La moitié des questions portent sur des événements que le cours ne mentionne pas."
    }
  ],
  "cases": [
    {
      "id": "cas-1",
      "title": "Des ventes en hausse ?",
      "domain": "Analyse de données",
      "level": 1,
      "minutes": 3,
      "author": "Claire Dubois",
      "date": "2026-10-12",
      "useful": 58,
      "answers": 846,
      "context": "Les ventes passent de 120 à 150 commandes. Vous demandez à l’IA de calculer la hausse.",
      "response": "Les ventes ont augmenté de 30 % : vous avez gagné 30 commandes.",
      "choices": [
        "Publier le résultat tel quel",
        "Vérifier le calcul à partir de 120",
        "Demander une phrase plus courte"
      ],
      "correct": 1,
      "explanation": "Le gain est de 30 commandes, mais la hausse est de 25 %. On rapporte la différence à la valeur de départ : (150 − 120) ÷ 120 × 100 = 25 %. Une formulation assurée ne garantit pas un calcul juste.",
      "reasons": [
        "Le nombre de commandes supplémentaires est juste, mais le pourcentage est faux.",
        "La valeur de départ est bien la base du calcul : c’est ce qui distingue un écart d’un pourcentage.",
        "Raccourcir la phrase ne corrige pas le calcul."
      ],
      "distribution": [
        18,
        74,
        8
      ]
    },
    {
      "id": "cas-2",
      "title": "Une référence qui semble sérieuse",
      "domain": "Texte et rédaction",
      "theme": "Vérification des sources",
      "level": 1,
      "minutes": 4,
      "author": "Léa Martin",
      "date": "2026-10-11",
      "useful": 51,
      "answers": 1204,
      "context": "Vous préparez un article sur le travail à distance. Vous demandez à l’IA une étude pour étayer votre argument.",
      "response": "Selon l’étude Travail distribué et performance, publiée en 2025 par l’Institut européen des usages numériques, le télétravail améliore la productivité de 42 %.",
      "choices": [
        "Citer l’étude avec son titre et sa date",
        "Demander à l’IA si elle est certaine",
        "Retrouver l’étude et vérifier ses résultats"
      ],
      "correct": 2,
      "explanation": "Une référence précise peut être inventée. Retrouvez la publication originale, vérifiez son auteur, sa méthode et la portée du chiffre. Si vous ne la retrouvez pas, ne présentez pas cette affirmation comme établie.",
      "reasons": [
        "Un titre et une date ne prouvent pas que la publication existe.",
        "L’IA peut confirmer une erreur avec assurance : il faut une source indépendante.",
        "Consulter la source permet de vérifier son existence et ce qu’elle affirme réellement."
      ],
      "distribution": [
        12,
        21,
        67
      ]
    },
    {
      "id": "cas-3",
      "title": "Un script prêt à lancer ?",
      "domain": "Code et scripts",
      "level": 2,
      "minutes": 5,
      "author": "Mariam Diop",
      "date": "2026-10-10",
      "useful": 47,
      "answers": 932,
      "context": "Vous demandez à l’IA un script pour supprimer les fichiers en double. Elle propose une suppression fondée uniquement sur leur nom.",
      "response": "Ce script conserve le premier fichier trouvé et supprime tous ceux qui portent le même nom. Vous pouvez le lancer sur votre dossier Documents.",
      "choices": [
        "Lancer le script sur le dossier Documents",
        "Examiner les actions sur une copie des fichiers",
        "Lancer le script avec les droits administrateur"
      ],
      "correct": 1,
      "explanation": "Deux fichiers qui portent le même nom peuvent avoir des contenus différents. Vérifiez le critère de doublon, demandez un aperçu sans suppression et testez sur une copie avant toute opération sur les originaux.",
      "reasons": [
        "Une suppression fondée sur le nom peut effacer des documents différents.",
        "Un aperçu et une copie permettent de repérer les erreurs avant de toucher aux originaux.",
        "Des droits supplémentaires aggravent les conséquences possibles sans corriger la logique."
      ],
      "distribution": [
        9,
        87,
        4
      ]
    },
    {
      "id": "cas-4",
      "title": "L’agent propose de vider le dossier du projet pour « repartir proprement »",
      "domain": "Code et scripts",
      "level": 3,
      "minutes": 6,
      "author": "Moussa Diallo",
      "date": "2026-10-09",
      "useful": 44,
      "answers": 632,
      "context": "Un agent de code ne parvient pas à corriger une erreur de compilation. Il propose de supprimer le dossier du projet, puis de tout régénérer.",
      "response": "Je vais exécuter rm -rf ./ pour repartir sur une base propre, puis recréer les fichiers nécessaires.",
      "choices": [
        "Accepter : la régénération corrigera l’erreur",
        "Refuser, vérifier le chemin et sauvegarder avant toute suppression",
        "Accepter seulement si l’agent le confirme"
      ],
      "correct": 1,
      "explanation": "Une suppression récursive du dossier courant efface aussi le travail non sauvegardé. Refusez, vérifiez la portée exacte de la commande et assurez-vous qu’une sauvegarde récupérable existe avant toute suppression.",
      "reasons": [
        "Régénérer ne restaure ni l’historique ni les fichiers qui n’ont pas été versionnés.",
        "Contrôler la portée de la commande et disposer d’une sauvegarde rend l’opération réversible.",
        "Une confirmation de l’agent ne change rien à la portée de la commande."
      ],
      "distribution": [
        21,
        42,
        37
      ]
    },
    {
      "id": "cas-5",
      "title": "L’IA affirme qu’une image générée est libre de droits",
      "domain": "Image et illustration",
      "level": 2,
      "minutes": 4,
      "author": "Kofi Mensah",
      "date": "2026-10-08",
      "useful": 39,
      "answers": 957,
      "context": "Vous souhaitez utiliser une image générée pour une campagne commerciale. Vous demandez à l’IA si vous pouvez l’employer librement.",
      "response": "Oui, les images générées sont libres de droits : vous pouvez les utiliser comme vous le souhaitez.",
      "choices": [
        "Utiliser l’image sans autre vérification",
        "Lire les conditions d’utilisation de l’outil et vérifier les éléments protégés",
        "Demander à l’IA une attestation écrite"
      ],
      "correct": 1,
      "explanation": "Les droits dépendent des conditions d’utilisation de l’outil, de votre abonnement et du contenu de l’image : une marque ou un personnage reconnaissable reste protégé. Une affirmation du modèle ne remplace pas cette vérification.",
      "reasons": [
        "L’affirmation du modèle n’engage ni l’éditeur de l’outil ni les titulaires de droits.",
        "Les conditions d’utilisation et le contenu de l’image déterminent ce qui est permis.",
        "Une attestation générée n’a aucune valeur juridique."
      ],
      "distribution": [
        24,
        58,
        18
      ]
    },
    {
      "id": "cas-6",
      "title": "Une case « Je ne suis pas un robot » suffit-elle à bloquer les robots ?",
      "domain": "Application web",
      "level": 2,
      "minutes": 5,
      "author": "Aïssatou Ndiaye",
      "date": "2026-10-07",
      "useful": 42,
      "answers": 1284,
      "context": "L’IA a ajouté à votre formulaire de contact une case à cocher « Je ne suis pas un robot », sans autre contrôle.",
      "response": "Le formulaire est maintenant protégé contre les robots grâce à la case de vérification.",
      "choices": [
        "Mettre le formulaire en ligne",
        "Vérifier que le serveur contrôle réellement les envois",
        "Agrandir la case pour la rendre plus visible"
      ],
      "correct": 1,
      "explanation": "Une case cochée côté navigateur se contourne facilement. Vérifiez que le serveur contrôle effectivement chaque envoi : limitation du nombre de requêtes, jeton de vérification ou service anti-robots.",
      "reasons": [
        "Un robot peut cocher la case ou envoyer la requête directement au serveur.",
        "Seul un contrôle côté serveur bloque réellement les envois automatisés.",
        "La taille de la case n’a aucun effet sur la protection."
      ],
      "distribution": [
        17,
        64,
        19
      ]
    },
    {
      "id": "cas-7",
      "title": "Le résumé ajoute une conclusion absente du document",
      "domain": "Texte et rédaction",
      "level": 1,
      "minutes": 3,
      "author": "Julien Moreau",
      "date": "2026-10-06",
      "useful": 36,
      "answers": 718,
      "context": "Vous demandez le résumé d’un rapport de dix pages. Le résumé se termine par une recommandation que vous ne retrouvez nulle part dans le rapport.",
      "response": "En conclusion, le rapport recommande de doubler le budget de communication dès le prochain trimestre.",
      "choices": [
        "Garder la conclusion, elle paraît logique",
        "Retirer la conclusion et demander les passages sources",
        "Demander une conclusion plus courte"
      ],
      "correct": 1,
      "explanation": "Un résumé doit distinguer ce que dit le document de ce que le modèle en déduit. Demandez le passage source de chaque affirmation et retirez celles qui n’en ont pas.",
      "reasons": [
        "Une conclusion plausible n’est pas une conclusion du document.",
        "Les passages sources permettent de vérifier chaque affirmation du résumé.",
        "Raccourcir la conclusion conserve l’information inventée."
      ],
      "distribution": [
        11,
        81,
        8
      ]
    },
    {
      "id": "cas-8",
      "title": "Le modèle dit avoir testé son code",
      "domain": "Code et scripts",
      "level": 3,
      "minutes": 5,
      "author": "Ousmane Sy",
      "date": "2026-10-04",
      "useful": 31,
      "answers": 488,
      "context": "Dans une conversation sans outil d’exécution, l’IA vous livre une fonction de calcul de TVA et précise qu’elle l’a testée.",
      "response": "J’ai testé cette fonction avec plusieurs montants : elle renvoie toujours le bon résultat.",
      "choices": [
        "Considérer la fonction comme vérifiée",
        "Écrire et lancer vos propres tests, y compris les cas limites",
        "Demander à l’IA la liste des tests effectués"
      ],
      "correct": 1,
      "explanation": "Sans outil d’exécution, le modèle n’a rien pu lancer : il décrit un test qui n’a pas eu lieu. Écrivez vos propres tests, avec les arrondis, les montants nuls et les montants négatifs.",
      "reasons": [
        "L’affirmation ne prouve pas qu’un test a été exécuté.",
        "Vos tests, exécutés par vous, sont la seule preuve que la fonction est correcte.",
        "Une liste de tests peut être inventée aussi facilement que le résultat."
      ],
      "distribution": [
        8,
        46,
        46
      ]
    }
  ]
};
