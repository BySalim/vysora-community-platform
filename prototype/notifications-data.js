'use strict';

/* Données propres à la page Notifications (EC-16, F-81, RG-91) : notifications de Clarisse Mendy,
   le membre simulé par etats.js (MOI). Elles suivent le niveau réglé dans le panneau Tweaks :
   créations publiées, badges, réputation et date d'inscription viennent de profil-data.js,
   titres des créations de nouvelle-creation-data.js. Au départ, les trois plus récentes sont
   non lues, comme l'indique l'en-tête (etats.js, MOI.nonLues).

   type : commentaire, reponse-commentaire, reponse-sujet, reponse-acceptee, reproduction, variante,
   obsolescence, votes, badge, niveau, cas-valide, cas-refuse, defi, masque, retabli, decision.
   Cible : creation (création de Clarisse), fiche (création d'un autre membre, data.js),
   sujet (forum), cas, defi. niveaux : niveaux auxquels la notification existe (tous si absent).
   reponse : réponse déjà publiée par Clarisse ; origine : son commentaire auquel on a répondu ;
   acceptee : réponse à sa question qu'elle a déjà acceptée (F-52). */

window.VYSORA_NOTIFICATIONS = (() => {
  const PUBLIENT = ['apprenti', 'artisan', 'expert', 'maitre'];
  const ARTISAN_PLUS = ['artisan', 'expert', 'maitre'];
  const EXPERT_PLUS = ['expert', 'maitre'];

  /* Sujets du forum cités (forum-data.js). */
  const sujets = {
    'sujet-2': { titre: 'Comment vérifier qu’un script ne supprime rien par erreur ?', kind: 'question' },
    'sujet-7': { titre: 'Comment éviter deux réservations sur le même créneau ?', kind: 'question' },
    'sujet-10': { titre: 'Structurer un tableau à partir de notes de réunion', kind: 'question' },
    'sujet-11': { titre: 'Faire relire une traduction avec un glossaire métier', kind: 'astuce' }
  };

  const defiLogo = { titre: 'Un logo lisible en petit format', participants: 64, periode: 'du 5 au 11 octobre' };

  /* Niveau des membres cités (explorer-data.js, levels). */
  const membres = {
    'Claire Dubois': 'Maître', 'Kofi Mensah': 'Expert', 'Moussa Diallo': 'Expert', 'Ibrahima Sow': 'Expert', 'Ousmane Sy': 'Expert',
    'Aïssatou Ndiaye': 'Artisan', 'Yacine Benali': 'Artisan', 'Julien Moreau': 'Artisan', 'Fatoumata Coulibaly': 'Artisan', 'Hugo Girard': 'Artisan',
    'Mariam Diop': 'Artisan', 'Léa Martin': 'Apprenti', 'Ndeye Fall': 'Apprenti', 'Awa Sarr': 'Apprenti', 'Thomas Lefèvre': 'Apprenti',
    'Koffi Amoussou': 'Apprenti', 'Mamadou Ba': 'Apprenti'
  };

  const liste = [
    /* Membres qui publient (Apprenti et au-delà) : créations iteration, prompt et projet. */
    { id: 'n-kofi', type: 'commentaire', at: '2026-10-13T10:05', niveaux: PUBLIENT, nonLue: true, par: 'Kofi Mensah', creation: 'iteration',
      texte: 'Le fromager à gauche équilibre très bien la pirogue. Vous avez imposé la police du titre dès le premier prompt, ou seulement au troisième ?' },
    { id: 'n-variante', type: 'variante', at: '2026-10-13T09:48', niveaux: PUBLIENT, nonLue: true, par: 'Julien Moreau', creation: 'prompt',
      variante: { fiche: 'renommer-photos', titre: 'Script Python qui renomme des photos selon leur date' } },
    { id: 'n-yacine', type: 'reproduction', at: '2026-10-13T08:40', niveaux: PUBLIENT, nonLue: true, par: 'Yacine Benali', creation: 'prompt',
      outil: 'ChatGPT', modele: 'GPT-5', resultat: 'partiel',
      texte: 'La simulation fonctionne, mais les photos reçues par WhatsApp n’ont pas de date de prise de vue : le script les laisse toutes de côté.' },
    { id: 'n-ibrahima', type: 'commentaire', at: '2026-10-12T20:15', niveaux: PUBLIENT, par: 'Ibrahima Sow', creation: 'iteration',
      texte: 'Le titre reste lisible même en vignette. Vous la proposez au défi de la semaine ?' },
    { id: 'n-fatoumata', type: 'reproduction', at: '2026-10-12T19:20', niveaux: PUBLIENT, par: 'Fatoumata Coulibaly', creation: 'iteration',
      outil: 'ChatGPT', modele: 'GPT Image 1', resultat: 'reussi', points: 5,
      texte: 'Même rendu pour Ségou, en trois échanges. J’ai seulement remplacé le fromager par un baobab.' },
    { id: 'n-votes-affiche', type: 'votes', at: '2026-10-12T18:40', niveaux: PUBLIENT, pars: ['Léa Martin', 'Awa Sarr'], creation: 'iteration', points: 20 },
    { id: 'n-mariam', type: 'reponse-acceptee', at: '2026-10-11T17:32', niveaux: PUBLIENT, par: 'Mariam Diop', sujet: 'sujet-2', points: 15,
      texte: 'Ajoutez une simulation activée par défaut : le script affiche chaque fichier concerné et ne touche à rien tant que vous n’avez pas relu la liste.' },
    { id: 'n-hugo', type: 'commentaire', at: '2026-10-11T11:20', niveaux: PUBLIENT, par: 'Hugo Girard', creation: 'prompt',
      texte: 'Le suffixe en cas de doublon m’a évité une belle erreur : 40 photos prises en rafale pendant un mariage.' },
    { id: 'n-aissatou-essai', type: 'reproduction', at: '2026-10-10T21:05', niveaux: PUBLIENT, par: 'Aïssatou Ndiaye', creation: 'prompt',
      outil: 'Claude', modele: 'Sonnet 4.5', resultat: 'reussi', points: 5,
      texte: 'Testé sur 312 photos du salon : aucun fichier écrasé, et la simulation rassure avant de lancer pour de vrai.' },
    { id: 'n-moussa', type: 'commentaire', at: '2026-10-10T09:40', niveaux: PUBLIENT, par: 'Moussa Diallo', creation: 'projet',
      texte: 'Comment avez-vous envoyé les deux réservations à la même seconde ? Avec deux téléphones en main ?',
      reponse: { texte: 'Oui, deux téléphones et le même départ, envoyés au même moment. La seconde réservation a bien été refusée.', at: '2026-10-10T12:15' } },
    { id: 'n-koffi', type: 'commentaire', at: '2026-10-09T17:50', niveaux: PUBLIENT, par: 'Koffi Amoussou', creation: 'prompt',
      texte: 'Précisez peut-être qu’il faut installer Pillow avant le premier lancement : j’ai cherché un moment.' },
    { id: 'n-mamadou', type: 'reproduction', at: '2026-10-09T14:30', niveaux: PUBLIENT, par: 'Mamadou Ba', creation: 'prompt',
      outil: 'ChatGPT', modele: 'GPT-5', resultat: 'reussi', points: 5,
      texte: 'Fonctionne aussi sous Windows en lançant le script depuis PowerShell.' },
    { id: 'n-votes-script', type: 'votes', at: '2026-10-09T12:05', niveaux: PUBLIENT, pars: ['Julien Moreau'], creation: 'prompt', points: 10 },
    { id: 'n-ousmane', type: 'commentaire', at: '2026-10-08T19:45', niveaux: PUBLIENT, par: 'Ousmane Sy', creation: 'projet',
      texte: 'Bonne idée d’écrire les règles avant de générer. Vous pourriez joindre la liste obtenue à la première étape ?',
      reponse: { texte: 'Bonne idée, je l’ajoute à la première étape ce week-end.', at: '2026-10-08T21:02' } },
    { id: 'n-votes-projet-2', type: 'votes', at: '2026-10-08T10:12', niveaux: PUBLIENT, pars: ['Claire Dubois'], creation: 'projet', points: 10 },
    { id: 'n-aissatou-reponse', type: 'reponse-commentaire', at: '2026-10-07T18:22', niveaux: PUBLIENT, par: 'Aïssatou Ndiaye', fiche: 'keur-awa',
      texte: 'Oui, le créneau est vérifié par le serveur au moment de confirmer : c’est le troisième échange du parcours.',
      origine: { texte: 'Le créneau est-il aussi vérifié par le serveur, ou seulement grisé dans la page ?', at: '2026-10-07T17:05' } },
    { id: 'n-aissatou-acceptee', type: 'reponse-acceptee', at: '2026-10-06T20:48', niveaux: PUBLIENT, par: 'Aïssatou Ndiaye', sujet: 'sujet-7', points: 15,
      texte: 'Demandez que le créneau soit vérifié par le serveur au moment de confirmer, et pas seulement grisé dans la page.' },
    { id: 'n-awa', type: 'commentaire', at: '2026-10-06T10:15', niveaux: PUBLIENT, par: 'Awa Sarr', creation: 'projet',
      texte: 'Le gérant reçoit-il un message quand une sortie est complète ?',
      reponse: { texte: 'Oui, un message lui part dès que la dernière place est réservée.', at: '2026-10-06T12:40' } },
    { id: 'n-votes-projet', type: 'votes', at: '2026-10-05T21:30', niveaux: PUBLIENT, pars: ['Moussa Diallo', 'Kofi Mensah', 'Léa Martin'], creation: 'projet', points: 30 },
    { id: 'n-lea', type: 'commentaire', at: '2026-10-05T16:10', niveaux: PUBLIENT, par: 'Léa Martin', creation: 'projet',
      texte: 'Le passage à l’heure de Dakar m’a fait revoir mes propres réservations. Merci pour ce détail.' },
    { id: 'n-claire-commentaire', type: 'commentaire', at: '2026-10-04T11:00', niveaux: PUBLIENT, par: 'Claire Dubois', creation: 'projet',
      texte: 'Très clair. Ajoutez la capture de l’erreur de fuseau horaire : le moment clé se comprendrait d’un coup d’œil.' },
    { id: 'n-claire-reponse', type: 'reponse-sujet', at: '2026-10-03T15:20', niveaux: ['apprenti'], par: 'Claire Dubois', sujet: 'sujet-10',
      texte: 'Demandez-lui de laisser la case vide quand l’échéance n’apparaît pas dans les notes, puis de lister à part les tâches sans date.', acceptee: true },
    { id: 'n-votes-reponse', type: 'votes', at: '2026-09-25T09:30', niveaux: ['apprenti'], pars: ['Yacine Benali'], sujet: 'sujet-11', reponse: true, points: 5 },

    /* Artisan et au-delà. */
    { id: 'n-defi', type: 'defi', at: '2026-10-11T22:00', niveaux: ['artisan'], defi: defiLogo, rang: 3, points: 25 },
    { id: 'n-defi-expert', type: 'defi', at: '2026-10-11T22:00', niveaux: ['expert'], defi: defiLogo, rang: 9, points: 5 },
    { id: 'n-defi-maitre', type: 'defi', at: '2026-10-11T22:00', niveaux: ['maitre'], defi: defiLogo, rang: 6, points: 5 },
    { id: 'n-awa-essai', type: 'reproduction', at: '2026-09-28T19:40', niveaux: ARTISAN_PLUS, par: 'Awa Sarr', creation: 'traduction',
      outil: 'ChatGPT', modele: 'GPT-5', resultat: 'reussi', points: 5,
      texte: 'Appliqué à la fiche d’un gîte de Saint-Louis : les termes du glossaire sont tous respectés.' },
    { id: 'n-ndeye', type: 'commentaire', at: '2026-09-26T08:50', niveaux: ARTISAN_PLUS, par: 'Ndeye Fall', creation: 'traduction',
      texte: 'Garder « bolong » en français avec une explication, c’est exactement ce que je cherchais pour mes fiches.' },

    /* Expert et Maître : cas Bon réflexe proposés. */
    { id: 'n-cas-valide', type: 'cas-valide', at: '2026-10-10T16:20', niveaux: EXPERT_PLUS, points: 10,
      cas: { titre: 'L’agent propose de vider la table des réservations pour supprimer un doublon' } },
    { id: 'n-cas-refuse', type: 'cas-refuse', at: '2026-10-07T11:30', niveaux: EXPERT_PLUS,
      cas: { titre: 'Une clé d’API collée dans le code d’une page publique' },
      motif: 'Deux options sont défendables en l’état. Précisez que la page est déjà en ligne pour qu’une seule réponse soit juste.' },
    { id: 'n-cas-valide-2', type: 'cas-valide', at: '2026-09-30T10:05', niveaux: ['maitre'], points: 10,
      cas: { titre: 'Un script de sauvegarde qui écrase l’archive de la veille' } },

    /* Curieux : pas encore de création publiée ; une question posée au forum et des essais. */
    { id: 'k-lea', type: 'reponse-commentaire', at: '2026-10-13T08:15', niveaux: ['curieux'], nonLue: true, par: 'Léa Martin', fiche: 'cite-ciel-mer',
      texte: 'Merci pour votre essai ! Pour garder les tours au centre, laissez « tours élancées au centre » en tête du prompt.',
      origine: { texte: 'Mon essai a placé les tours sur les côtés plutôt qu’au centre. Une idée de ce qui a changé ?', at: '2026-10-12T21:30' } },
    { id: 'k-ibrahima', type: 'reponse-sujet', at: '2026-10-12T08:45', niveaux: ['curieux'], nonLue: true, par: 'Ibrahima Sow', sujet: 'sujet-2', ancre: 'r2-3',
      texte: 'Remplacez toute suppression par un déplacement vers une corbeille dédiée : vous pourrez revenir en arrière si le tri se trompe.' },
    { id: 'k-thomas', type: 'reponse-sujet', at: '2026-10-11T18:30', niveaux: ['curieux'], par: 'Thomas Lefèvre', sujet: 'sujet-2', ancre: 'r2-2',
      texte: 'Je copie aussi le dossier dans un dossier de test avant le premier vrai lancement. Cela m’a évité de perdre des factures.' },
    { id: 'k-ousmane', type: 'reponse-sujet', at: '2026-10-11T15:02', niveaux: ['curieux'], par: 'Ousmane Sy', sujet: 'sujet-2', ancre: 'r2-1',
      texte: 'Demandez une exécution à blanc : le script affiche chaque opération prévue sans rien modifier. Relisez la liste, puis relancez avec une option explicite.' }
  ];

  /* Badges : date d'obtention dans profil-data.js ; heure de la notification. */
  const heuresBadges = { 'Bon réflexe': '22:05', 'Premier essai': '18:30', 'Assidu': '20:10', 'Premier coup de main': '20:48', 'Première création': '18:05', 'Parcours complet': '18:06', 'Podium': '22:00', 'Participant': '21:15', 'Reproductible': '19:10', 'Mentor': '12:40', 'Astucieux': '09:55', 'Pionnier': '10:00' };
  /* Notifications des 30 derniers jours, à partir de cette date. */
  const depuis = '2026-09-14';
  /* Le badge Bon réflexe du niveau Curieux est la troisième notification non lue. */
  const badgesNonLus = { curieux: ['Bon réflexe'] };

  /* Niveau atteint (RG-84) et ce qu'il change (RG-85). */
  const niveaux = {
    apprenti: { at: '2026-09-26T21:15', texte: 'Vous pouvez publier 10 créations et 10 sujets par jour, et vos signalements comptent désormais pour le masquage automatique.' },
    artisan: { at: '2026-09-21T18:40', texte: 'Vos créations, vos réponses et vos cas réussis vous font passer le cap des 300 points. Prochain palier : Expert, à 1 500 points.' },
    expert: { at: '2026-10-02T20:05', texte: 'Vous pouvez désormais proposer des cas Bon réflexe, et vos publications ne sont plus limitées par jour.', action: 'proposer' },
    maitre: { at: '2026-10-09T19:50', texte: 'Maître est le plus haut niveau de Vysora. Vos cas Bon réflexe et vos réponses servent de référence aux autres membres.' }
  };

  /* Alertes réglables dans le panneau Tweaks, comme sur la page Mes contenus (mes-contenus-data.js). */
  const alertes = {
    obsolescence: { id: 'a-obsolescence', type: 'obsolescence', at: '2026-10-13T07:50', creation: 'iteration', modele: 'GPT Image 1', membres: 3 },
    masque: { id: 'a-masque', type: 'masque', at: '2026-10-12T23:10', creation: 'projet', motif: 'Données personnelles : une capture d’écran laisse lire le numéro de téléphone d’une cliente.' },
    retabli: { id: 'a-retabli', type: 'retabli', at: '2026-10-13T09:20', creation: 'projet', texte: 'La capture a été remplacée. Les votes, les commentaires et les points liés sont rétablis.' }
  };

  /* Décisions de modération qui concernent le compte, quand il est suspendu (etats.js, DATES.suspension). */
  const compte = {
    avertissement: { id: 'd-avertissement', type: 'decision', at: '2026-10-09T10:00', action: 'avertir',
      motif: 'Autopromotion : trois commentaires renvoyaient vers votre site sans rapport avec la création commentée.' },
    suspension: { id: 'd-suspension', type: 'decision', at: '2026-10-13T08:05', action: 'suspendre',
      motif: 'Spam : le même lien vers votre site a été publié dans six commentaires en deux jours, après l’avertissement du 9 octobre.' }
  };

  /* Notification qui arrive pendant la visite (réglage « Pendant la visite »). */
  const arrivees = {
    membre: { id: 'x-awa', type: 'commentaire', par: 'Awa Sarr', creation: 'iteration',
      texte: 'Les quatre teintes de la sérigraphie rendent très bien. Vous les avez imposées dans le prompt ou corrigées après ?' },
    curieux: { id: 'x-claire', type: 'reponse-sujet', par: 'Claire Dubois', sujet: 'sujet-2',
      texte: 'Testez aussi le script sur un dossier vide : certains plantent avant même d’afficher la simulation.' }
  };

  /* Heure de la consultation simulée (data.js, today). */
  const maintenant = '2026-10-13T10:30';

  return { membres, sujets, liste, heuresBadges, depuis, badgesNonLus, niveaux, alertes, compte, arrivees, maintenant };
})();
