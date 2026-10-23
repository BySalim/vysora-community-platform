'use strict';

/* Données propres à la page Profil (EC-14, F-05, F-73, F-74) : profil de Clarisse Mendy,
   le membre simulé par etats.js (MOI). Sa réputation, ses statistiques et ses badges
   suivent le niveau réglé dans le panneau Tweaks ; les totaux de points sont exacts.
   Ses créations sont les exemples de la page Publier (nouvelle-creation-data.js). */

window.VYSORA_PROFIL = (() => {
  /* Semaines affichées sur la courbe de réputation, de la plus ancienne à la semaine en cours. */
  const semaines = ['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'];

  /* Sources de points (RG-80), dans l'ordre des couleurs de données de la charte. */
  const sources = ['Créations', 'Entraide', 'Apprentissage', 'Défis'];

  /* Badges (RG-86) : ceux de data.js et ceux propres aux classements. */
  const badges = {
    'Pionnier': { icon: 'flag', tone: 'ink', rule: 'Être inscrit pendant la bêta fermée' },
    'Première création': { icon: 'layers', tone: 'blue', rule: 'Publier sa première création' },
    'Parcours complet': { icon: 'route', tone: 'blue', rule: 'Publier un projet d’au moins 3 étapes avec un moment clé' },
    'Reproductible': { icon: 'repeat', tone: 'green', rule: 'Être reproduit avec succès par 5 membres' },
    'Astucieux': { icon: 'utile', tone: 'green', rule: 'Recevoir 10 votes « Testé, ça marche » sur une astuce' },
    'Premier essai': { icon: 'check-circle', tone: 'blue', rule: 'Déclarer sa première reproduction' },
    'Bon réflexe': { icon: 'bulb', tone: 'amber', rule: 'Réussir 10 cas Bon réflexe' },
    'Assidu': { icon: 'history', tone: 'amber', rule: 'Répondre à 50 cas Bon réflexe' },
    'Premier coup de main': { icon: 'reply', tone: 'green', rule: 'Obtenir sa première réponse acceptée' },
    'Mentor': { icon: 'message', tone: 'ink', rule: 'Obtenir 10 réponses acceptées' },
    'Vigilant': { icon: 'shield', tone: 'ink', rule: 'Avoir 5 signalements jugés fondés' },
    'Participant': { icon: 'calendar', tone: 'blue', rule: 'Participer à un défi clôturé' },
    'Podium': { icon: 'trophy', tone: 'amber', rule: 'Terminer dans les 3 premiers d’un défi' }
  };

  /* Détail des points : [motif, nombre, points par événement, source]. */
  const D_ = (motif, n, pts, source) => ({ motif, n, pts, source });

  /* Profil de Clarisse à chaque niveau.
     stats : statistiques publiques (F-73) ; stats.creations : nombre de créations publiées, les plus récentes de la liste
     ci-dessous ; utilesReponses : part des votes « Utile » reçue sur des réponses du forum.
     apprentissage : statistiques privées (RG-88).
     creations : votes « Utile », essais, essais réussis et vues des trois créations récentes ; ceux des plus anciennes
     sont calculés plus bas.
     avancement : progression vers les prochains badges, visible du seul propriétaire. */
  const niveaux = {
    curieux: {
      depuis: '2026-10-09', bio: '', lien: '',
      gains: [12, 22],
      detail: [D_('Cas Bon réflexe réussis', 24, 1, 2), D_('Reproductions déclarées', 3, 2, 2), D_('Réponses acceptées à vos questions', 2, 2, 1)],
      stats: { creations: 0, utiles: 0, essais: 0, reussis: 0, reponses: 0, vues: 0 }, utilesReponses: 0,
      apprentissage: { repondus: 31, reussis: 24, essais: 3 },
      creations: {},
      badges: [['Bon réflexe', '2026-10-12'], ['Premier essai', '2026-10-10']],
      avancement: [['Assidu', 31, 50, 'cas répondus'], ['Première création', 0, 1, 'création publiée'], ['Premier coup de main', 0, 1, 'réponse acceptée']]
    },
    apprenti: {
      depuis: '2026-09-15',
      gains: [12, 28, 38, 63, 41],
      detail: [D_('Votes « Utile » reçus sur vos créations', 7, 10, 0), D_('Reproductions réussies de vos créations', 3, 5, 0), D_('Réponses acceptées', 2, 15, 1), D_('Vote « Utile » reçu sur une réponse', 1, 5, 1), D_('Réponse acceptée à votre question', 1, 2, 1), D_('Cas Bon réflexe réussis', 42, 1, 2), D_('Reproductions déclarées', 9, 2, 2)],
      stats: { creations: 3, utiles: 8, essais: 4, reussis: 3, reponses: 2, vues: 1284 }, utilesReponses: 1,
      apprentissage: { repondus: 58, reussis: 42, essais: 9 },
      creations: { iteration: [2, 1, 1, 286], prompt: [1, 3, 2, 412], projet: [4, 0, 0, 586] },
      badges: [['Assidu', '2026-10-09'], ['Premier coup de main', '2026-10-06'], ['Première création', '2026-10-03'], ['Parcours complet', '2026-10-03'], ['Bon réflexe', '2026-09-27'], ['Premier essai', '2026-09-18']],
      avancement: [['Reproductible', 3, 5, 'membres'], ['Mentor', 2, 10, 'réponses acceptées'], ['Participant', 0, 1, 'défi clôturé']]
    },
    artisan: {
      depuis: '2026-08-10',
      gains: [18, 34, 41, 52, 47, 66, 71, 88, 124, 99],
      detail: [D_('Votes « Utile » reçus sur vos créations', 24, 10, 0), D_('Reproductions réussies de vos créations', 15, 5, 0), D_('Réponses acceptées', 8, 15, 1), D_('Votes « Utile » reçus sur vos réponses', 5, 5, 1), D_('Réponses acceptées à vos questions', 5, 2, 1), D_('Cas Bon réflexe réussis', 96, 1, 2), D_('Reproductions déclarées', 22, 2, 2), D_('Participations à un défi', 2, 5, 3), D_('Troisième place d’un défi', 1, 20, 3)],
      stats: { creations: 6, utiles: 29, essais: 19, reussis: 15, reponses: 8, vues: 6412 }, utilesReponses: 5,
      apprentissage: { repondus: 128, reussis: 96, essais: 22 },
      creations: { iteration: [6, 5, 4, 612], prompt: [5, 9, 7, 903], projet: [9, 0, 0, 1188] },
      badges: [['Podium', '2026-10-11'], ['Participant', '2026-10-04'], ['Reproductible', '2026-09-30'], ['Assidu', '2026-09-12'], ['Parcours complet', '2026-09-02'], ['Premier coup de main', '2026-08-27'], ['Première création', '2026-08-21'], ['Bon réflexe', '2026-08-19'], ['Premier essai', '2026-08-13']],
      avancement: [['Mentor', 8, 10, 'réponses acceptées'], ['Vigilant', 1, 5, 'signalements fondés'], ['Astucieux', 0, 10, 'votes « Testé, ça marche »']]
    },
    expert: {
      depuis: '2026-06-20',
      gains: [96, 104, 88, 131, 117, 142, 126, 158, 149, 171, 204, 112],
      detail: [D_('Votes « Utile » reçus sur vos créations', 82, 10, 0), D_('Reproductions réussies de vos créations', 45, 5, 0), D_('Réponses acceptées', 19, 15, 1), D_('Votes « Utile » reçus sur vos réponses', 22, 5, 1), D_('Réponses acceptées à vos questions', 12, 2, 1), D_('Cas Bon réflexe validés', 2, 10, 1), D_('Cas Bon réflexe réussis', 214, 1, 2), D_('Reproductions déclarées', 41, 2, 2), D_('Participations à un défi', 4, 5, 3), D_('Première place d’un défi', 1, 50, 3), D_('Troisième place d’un défi', 1, 20, 3)],
      stats: { creations: 10, utiles: 104, essais: 58, reussis: 45, reponses: 19, vues: 24870 }, utilesReponses: 22,
      apprentissage: { repondus: 287, reussis: 214, essais: 41 },
      creations: { iteration: [14, 9, 7, 1404], prompt: [11, 15, 12, 2210], projet: [21, 0, 0, 2876] },
      badges: [['Mentor', '2026-10-01'], ['Podium', '2026-09-20'], ['Participant', '2026-08-23'], ['Reproductible', '2026-08-14'], ['Assidu', '2026-07-30'], ['Parcours complet', '2026-07-22'], ['Premier coup de main', '2026-07-09'], ['Première création', '2026-07-01'], ['Bon réflexe', '2026-06-28'], ['Premier essai', '2026-06-23'], ['Pionnier', '2026-06-20']],
      avancement: [['Astucieux', 6, 10, 'votes « Testé, ça marche »'], ['Vigilant', 2, 5, 'signalements fondés']]
    },
    maitre: {
      depuis: '2026-06-05',
      gains: [318, 342, 296, 371, 405, 388, 362, 431, 417, 466, 512, 284],
      detail: [D_('Votes « Utile » reçus sur vos créations', 241, 10, 0), D_('Reproductions réussies de vos créations', 138, 5, 0), D_('Réponses acceptées', 52, 15, 1), D_('Votes « Utile » reçus sur vos réponses', 61, 5, 1), D_('Réponses acceptées à vos questions', 20, 2, 1), D_('Cas Bon réflexe validés', 9, 10, 1), D_('Cas Bon réflexe réussis', 532, 1, 2), D_('Reproductions déclarées', 94, 2, 2), D_('Participations à un défi', 9, 5, 3), D_('Premières places d’un défi', 3, 50, 3), D_('Deuxièmes places d’un défi', 2, 30, 3), D_('Troisième place d’un défi', 1, 20, 3)],
      stats: { creations: 16, utiles: 302, essais: 171, reussis: 138, reponses: 52, vues: 96340 }, utilesReponses: 61,
      apprentissage: { repondus: 694, reussis: 532, essais: 94 },
      creations: { iteration: [31, 18, 15, 3820], prompt: [24, 29, 24, 5145], projet: [46, 0, 0, 6930] },
      badges: [['Astucieux', '2026-09-26'], ['Mentor', '2026-08-18'], ['Podium', '2026-08-09'], ['Participant', '2026-07-12'], ['Reproductible', '2026-07-03'], ['Assidu', '2026-06-29'], ['Parcours complet', '2026-06-24'], ['Premier coup de main', '2026-06-17'], ['Première création', '2026-06-12'], ['Bon réflexe', '2026-06-10'], ['Premier essai', '2026-06-07'], ['Pionnier', '2026-06-05']],
      avancement: [['Vigilant', 4, 5, 'signalements fondés']]
    }
  };

  /* Biographie et lien de Clarisse dès qu'elle a pris ses marques (niveau Apprenti et au-delà). */
  const identite = {
    bio: 'Développeuse indépendante à Ziguinchor. Je construis avec l’IA des outils simples pour les campements, les salons et les boutiques de Casamance, et je publie le chemin parcouru, erreurs comprises.',
    lien: 'https://clarissemendy.sn'
  };

  /* Créations de Clarisse, de la plus récente à la plus ancienne ; le détail vient de la page Publier.
     Chaque niveau publie les stats.creations premières, toutes postérieures à son inscription (depuis) ; la plus ancienne
     d'un niveau et son premier projet en plusieurs étapes datent des badges Première création et Parcours complet.
     poids : popularité relative d'une création ancienne ; projet : création non reproductible. */
  const mock = (nom, alt) => ({ kind: 'mock', mock: nom, alt });
  const creations = [
    { id: 'iteration', categorie: 'Image et illustration', media: { kind: 'image', name: 'affiche-ziguinchor', portrait: true, alt: 'Affiche en sérigraphie : pirogue sur la Casamance au lever du soleil, fromager à gauche et titre « Ziguinchor ».' } },
    { id: 'prompt', categorie: 'Code et scripts', media: { kind: 'mock', mock: 'code', alt: 'Extrait du script renommer_photos.py en mode simulation : 248 photos, aucun fichier modifié.' } },
    { id: 'projet', categorie: 'Application web', media: { kind: 'image', name: 'bolongs-reservation', alt: 'Écran de réservation du campement : départ de 15 h, 3 places restantes sur 7, heure de Dakar indiquée.' } },
    { id: 'traduction', poids: 1, media: mock('glossaire', 'Page traduite côte à côte : le mot « bolongs » est gardé en français et expliqué en anglais.') },
    { id: 'devis', poids: 1.3, projet: true, media: mock('devis-atelier', 'Site de l’atelier Sagna, menuiserie à Ziguinchor, avec le bouton « Estimer mon meuble ».') },
    { id: 'sauvegarde', poids: 0.65, media: mock('sauvegarde', 'Extrait du script sauvegarde.sh : archive datée, copie sur Google Drive et conservation des 30 dernières archives.') },
    { id: 'paiements', poids: 1.2, media: mock('rapprochement', 'Paiements Wave rapprochés des commandes : trois rapprochés, un montant différent.') },
    { id: 'securite', poids: 0.9, media: mock('fiche-pirogue', 'Fiche « Avant chaque départ » : gilets comptés, téléphone chargé et heure de pleine mer.') },
    { id: 'menu', poids: 1.5, projet: true, media: mock('menu-whatsapp', 'Scénario en trois étapes : plats du jour, rédaction du message, diffusion sur WhatsApp.') },
    { id: 'carte', poids: 0.7, media: mock('carte-relue', 'Carte corrigée : « poison » devient « poisson » et « poulé » devient « poulet », prix inchangés.') },
    { id: 'compression', poids: 1.15, media: mock('compression', 'Simulation du script compresser.py : 412 photos passent de 1,8 Go à 196 Mo.') },
    { id: 'batik', poids: 0.8, media: mock('inscription-batik', 'Formulaire d’inscription à l’atelier batik : le numéro de téléphone incomplet est signalé sous le champ.') },
    { id: 'faq', poids: 1.6, projet: true, media: mock('faq-whatsapp', 'Question d’un voyageur sur WhatsApp et réponse automatique avec l’heure de pleine mer.') },
    { id: 'numeros', poids: 1.05, media: mock('regex-mobile', 'Extrait de numero.js : expression régulière et exemples de numéros acceptés ou refusés.') },
    { id: 'nuitees', poids: 0.85, media: mock('nuitees', 'Tableur des nuitées de septembre : nuitées et taxe de séjour par case.') },
    { id: 'accueil', poids: 0.55, media: mock('message-accueil', 'Message d’accueil : accès depuis l’aéroport et arrivée possible à partir de 14 h.') }
  ];

  /* Créations anciennes d'un niveau : votes, reproductions et vues répartis selon leur poids (les vues, aussi selon
     leur ancienneté), pour que la somme de toutes ses créations égale ses statistiques publiques. */
  const repartir = (total, poids) => {
    const somme = poids.reduce((a, p) => a + p, 0);
    if (!somme || total <= 0) return poids.map(() => 0);
    const brut = poids.map(p => (total * p) / somme);
    const parts = brut.map(Math.floor);
    let reste = total - parts.reduce((a, p) => a + p, 0);
    brut.map((v, i) => [v - parts[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (reste > 0) { parts[i] += 1; reste -= 1; } });
    return parts;
  };
  Object.values(niveaux).forEach(n => {
    const anciennes = creations.slice(3, n.stats.creations);
    if (!anciennes.length) return;
    const recentes = Object.values(n.creations);
    const reste = (total, k) => total - recentes.reduce((a, s) => a + s[k], 0);
    const utile = repartir(reste(n.stats.utiles - n.utilesReponses, 0), anciennes.map(c => c.poids));
    const essais = repartir(reste(n.stats.essais, 1), anciennes.map(c => (c.projet ? 0 : c.poids)));
    const reussis = repartir(reste(n.stats.reussis, 2), essais);
    const vues = repartir(reste(n.stats.vues, 3), anciennes.map((c, i) => c.poids * (1 + i * 0.06)));
    anciennes.forEach((c, i) => { n.creations[c.id] = [utile[i], essais[i], reussis[i], vues[i]]; });
  });

  /* Contributions publiques récentes (F-05). kind : creation, reponse, essai, question.
     Les essais renvoient aux fiches des créations reproduites ; les réponses, aux sujets du forum. */
  const contributions = [
    { kind: 'creation', at: '2026-10-12', creation: 'iteration' },
    { kind: 'reponse', at: '2026-10-11', sujet: 'sujet-2', titre: 'Comment vérifier qu’un script ne supprime rien par erreur ?', auteur: 'Mariam Diop', outil: 'ChatGPT', acceptee: true },
    { kind: 'essai', at: '2026-10-10', fiche: 'portrait-gouache', titre: 'Portrait éditorial en gouache numérique', auteur: 'Kofi Mensah', outil: 'Midjourney', modele: 'v7', resultat: 'reussi' },
    { kind: 'creation', at: '2026-10-08', creation: 'prompt' },
    { kind: 'essai', at: '2026-10-07', fiche: 'lettre-motivation', titre: 'Lettre de motivation sans formules toutes faites', auteur: 'Yacine Benali', outil: 'Le Chat', modele: 'Mistral Large 2', resultat: 'partiel' },
    { kind: 'reponse', at: '2026-10-06', sujet: 'sujet-7', titre: 'Comment éviter deux réservations sur le même créneau ?', auteur: 'Aïssatou Ndiaye', outil: 'Claude', acceptee: true },
    { kind: 'essai', at: '2026-10-05', fiche: 'cite-ciel-mer', titre: 'Cité imaginaire entre ciel et mer', auteur: 'Léa Martin', outil: 'ChatGPT', modele: 'GPT Image 1', resultat: 'reussi' },
    { kind: 'creation', at: '2026-10-03', creation: 'projet' },
    { kind: 'essai', at: '2026-09-29', fiche: 'keur-awa', titre: 'Prise de rendez-vous pour un salon de coiffure', auteur: 'Aïssatou Ndiaye', outil: 'Claude', modele: 'Sonnet 4.5', resultat: 'reussi' },
    { kind: 'reponse', at: '2026-09-24', sujet: 'sujet-11', titre: 'Faire relire une traduction avec un glossaire métier', auteur: 'Awa Sarr', outil: 'ChatGPT', acceptee: false },
    { kind: 'creation', at: '2026-09-24', creation: 'traduction' }
  ];
  /* Un membre Curieux n'a encore déclaré que des essais. */
  const contributionsCurieux = [
    { kind: 'essai', at: '2026-10-12', fiche: 'cite-ciel-mer', titre: 'Cité imaginaire entre ciel et mer', auteur: 'Léa Martin', outil: 'ChatGPT', modele: 'GPT Image 1', resultat: 'reussi' },
    { kind: 'essai', at: '2026-10-11', fiche: 'lettre-motivation', titre: 'Lettre de motivation sans formules toutes faites', auteur: 'Yacine Benali', outil: 'Le Chat', modele: 'Mistral Large 2', resultat: 'partiel' },
    { kind: 'essai', at: '2026-10-10', fiche: 'portrait-gouache', titre: 'Portrait éditorial en gouache numérique', auteur: 'Kofi Mensah', outil: 'Midjourney', modele: 'v7', resultat: 'reussi' }
  ];

  /* Limites de publication des dernières 24 heures (RG-85) : [créations, sujets, réponses et commentaires]. */
  const utilise = { curieux: [1, 0, 6], apprenti: [4, 1, 12], artisan: [2, 0, 9] };

  return { semaines, sources, badges, niveaux, identite, creations, contributions, contributionsCurieux, utilise };
})();
