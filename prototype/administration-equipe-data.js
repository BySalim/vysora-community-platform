'use strict';

/* Données simulées des écrans d'administration « équipe et journaux » : rôles de l'équipe et membres
   trouvés (ADM-01, ADM-03), codes d'invitation (INV-01, ADM-02), dossiers des membres (ADM-02),
   journal des décisions de modération (EC-21) et journal d'audit (ENF-09).
   Chargé après moderation-data.js : ses membres (noms, photos, niveaux) et ses décisions sont repris
   tels quels, pour que le dossier d'un membre et le journal des décisions disent la même chose que
   le dossier de modération. Les dates sont relatives au moment de la visite (heures écoulées). */

window.VYSORA_ADMINISTRATION_EQUIPE = (() => {
  const MOD = window.VYSORA_MODERATION || { M: {}, contenus: [] };
  const J = 24;

  /* Badges (RG-86, référentiel du site : code, libellé, critère, icône, ton). */
  const BADGES = {
    PIONNIER: ['Pionnier', 'Être inscrit pendant la bêta fermée', 'flag', 'ENCRE'],
    PREMIERE_CREATION: ['Première création', 'Publier sa première création', 'layers', 'BLEU'],
    PARCOURS_COMPLET: ['Parcours complet', 'Publier un projet d’au moins 3 étapes avec un moment clé', 'route', 'BLEU'],
    REPRODUCTIBLE: ['Reproductible', 'Être reproduit avec succès par 5 membres', 'repeat', 'VERT'],
    ASTUCIEUX: ['Astucieux', 'Recevoir 10 votes « Testé, ça marche » sur une astuce', 'utile', 'VERT'],
    PREMIER_ESSAI: ['Premier essai', 'Déclarer sa première reproduction', 'check-circle', 'BLEU'],
    BON_REFLEXE: ['Bon réflexe', 'Réussir 10 cas Bon réflexe', 'bulb', 'AMBRE'],
    ASSIDU: ['Assidu', 'Répondre à 50 cas Bon réflexe', 'history', 'AMBRE'],
    PREMIER_COUP_DE_MAIN: ['Premier coup de main', 'Obtenir sa première réponse acceptée', 'reply', 'VERT'],
    MENTOR: ['Mentor', 'Obtenir 10 réponses acceptées', 'message', 'ENCRE'],
    VIGILANT: ['Vigilant', 'Avoir 5 signalements jugés fondés', 'shield', 'ENCRE'],
    PARTICIPANT: ['Participant', 'Participer à un défi clôturé', 'calendar', 'BLEU'],
    PODIUM: ['Podium', 'Terminer dans les 3 premiers d’un défi', 'trophy', 'AMBRE']
  };
  /** Badges obtenus : [code, il y a n jours]. */
  const badges = (...liste) => liste.map(([code, jours]) => ({ code, libelle: BADGES[code][0], critere: BADGES[code][1], icone: BADGES[code][2], ton: BADGES[code][3], ilYa: jours * J }));

  /* Membres. `inscrit` en jours ; `reputation` : somme des mouvements, sans plancher (RG-83) ;
     `photo: false` : sans photo (compte de l'équipe pas encore activé, compte fermé). */
  const membre = (id, pseudo, nom, options = {}) => ({
    id, pseudo, nom,
    avatar: options.photo === false ? null : `assets/avatars/${pseudo}.webp`,
    email: `${pseudo.replace(/-/g, '.')}@example.test`,
    role: 'MEMBRE', statutCompte: 'ACTIF', deuxFacteurs: 'absente', activationEnAttente: false,
    inscrit: 30, reputation: 0, badges: [],
    ...options
  });
  const pionnier = jours => ['PIONNIER', jours];

  const membres = [
    /* Équipe. Clarisse Mendy est le membre simulé du prototype : son rôle, son niveau et ses points
       viennent des états communs (panneau Tweaks). */
    membre(1, 'clarisse-mendy', 'Clarisse Mendy', { moi: true, photo: false, role: 'ADMINISTRATEUR', deuxFacteurs: 'active', inscrit: 33, badges: badges(pionnier(33), ['PREMIERE_CREATION', 31], ['PREMIER_ESSAI', 27]) }),
    membre(2, 'sophie-laurent', 'Sophie Laurent', { role: 'ADMINISTRATEUR', deuxFacteurs: 'active', inscrit: 33, reputation: 1720, badges: badges(pionnier(33), ['PREMIERE_CREATION', 32], ['PARCOURS_COMPLET', 24], ['MENTOR', 9]) }),
    membre(61, 'malick-diouf', 'Malick Diouf', { photo: false, role: 'ADMINISTRATEUR', activationEnAttente: true, inscrit: 0.8 }),
    membre(7, 'ibrahima-sow', 'Ibrahima Sow', { role: 'MODERATEUR', deuxFacteurs: 'active', inscrit: 33, reputation: 2140, badges: badges(pionnier(33), ['PREMIERE_CREATION', 33], ['REPRODUCTIBLE', 21], ['MENTOR', 15], ['VIGILANT', 12], ['PODIUM', 14]) }),
    membre(8, 'ndeye-fall', 'Ndèye Fall', { role: 'MODERATEUR', deuxFacteurs: 'active', inscrit: 33, reputation: 1980, badges: badges(pionnier(33), ['PREMIERE_CREATION', 32], ['PARCOURS_COMPLET', 26], ['VIGILANT', 17]) }),
    membre(14, 'julien-moreau', 'Julien Moreau', { role: 'MODERATEUR', deuxFacteurs: 'en-attente', inscrit: 33, reputation: 860, badges: badges(pionnier(33), ['PREMIERE_CREATION', 29], ['PREMIER_ESSAI', 22]) }),
    membre(62, 'fanta-camara', 'Fanta Camara', { photo: false, role: 'MODERATEUR', activationEnAttente: true, inscrit: 3 }),

    /* Membres des dossiers de modération (moderation-data.js). */
    membre(21, 'hugo-girard', 'Hugo Girard', { inscrit: 25, reputation: 142, badges: badges(pionnier(25), ['PREMIERE_CREATION', 18], ['PREMIER_ESSAI', 12]) }),
    membre(22, 'thomas-lefevre', 'Thomas Lefèvre', { inscrit: 25, reputation: 18, badges: badges(pionnier(25)) }),
    membre(23, 'karim-mansouri', 'Karim Mansouri', { inscrit: 25, reputation: 455, badges: badges(pionnier(25), ['PREMIERE_CREATION', 24], ['PARCOURS_COMPLET', 14], ['PREMIER_COUP_DE_MAIN', 8]) }),
    membre(24, 'camille-bernard', 'Camille Bernard', { inscrit: 25, reputation: 96, badges: badges(pionnier(25), ['PREMIER_ESSAI', 6]) }),
    membre(25, 'nicolas-fontaine', 'Nicolas Fontaine', { inscrit: 25, reputation: 31, badges: badges(pionnier(25), ['PREMIER_ESSAI', 20]) }),
    membre(26, 'sebastien-roy', 'Sébastien Roy', { inscrit: 25, reputation: 380, badges: badges(pionnier(25), ['PREMIERE_CREATION', 22], ['PREMIER_COUP_DE_MAIN', 11]) }),
    membre(27, 'yacine-benali', 'Yacine Benali', { inscrit: 33, reputation: 1610, badges: badges(pionnier(33), ['PREMIERE_CREATION', 30], ['BON_REFLEXE', 19], ['ASSIDU', 4]) }),
    membre(28, 'mariam-diop', 'Mariam Diop', { inscrit: 32, reputation: 720, badges: badges(pionnier(32), ['PREMIERE_CREATION', 31], ['PARTICIPANT', 14], ['PODIUM', 14]) }),
    membre(29, 'lea-martin', 'Léa Martin', { inscrit: 32, reputation: 2010, badges: badges(pionnier(32), ['PREMIERE_CREATION', 32], ['PARCOURS_COMPLET', 28], ['ASTUCIEUX', 10]) }),
    membre(30, 'kofi-mensah', 'Kofi Mensah', { inscrit: 32, reputation: 540, badges: badges(pionnier(32), ['PREMIERE_CREATION', 25], ['VIGILANT', 6]) }),
    membre(31, 'aissatou-ndiaye', 'Aïssatou Ndiaye', { inscrit: 33, reputation: 5420, badges: badges(pionnier(33), ['PREMIERE_CREATION', 33], ['PARCOURS_COMPLET', 31], ['REPRODUCTIBLE', 24], ['MENTOR', 13], ['BON_REFLEXE', 11]) }),
    membre(32, 'awa-sarr', 'Awa Sarr', { inscrit: 25, reputation: 74, badges: badges(pionnier(25), ['PREMIER_ESSAI', 17]) }),
    membre(33, 'moussa-diallo', 'Moussa Diallo', { inscrit: 25, reputation: 61, badges: badges(pionnier(25)) }),
    membre(34, 'rokia-keita', 'Rokia Keïta', { inscrit: 25, reputation: 330, badges: badges(pionnier(25), ['PREMIERE_CREATION', 23], ['PARTICIPANT', 14]) }),

    /* Autres comptes : réputation ajustée et badge retiré, suspension en cours, suppression demandée,
       compte fermé, création trompeuse, défi gagné. */
    membre(40, 'yasmine-cherif', 'Yasmine Cherif', { inscrit: 25, reputation: -35, badges: badges(pionnier(25), ['PREMIERE_CREATION', 21]) }),
    membre(41, 'cheikh-gueye', 'Cheikh Gueye', { inscrit: 25, reputation: 210, badges: badges(pionnier(25), ['PREMIERE_CREATION', 19]) }),
    membre(42, 'helene-garnier', 'Hélène Garnier', { statutCompte: 'EN_SUPPRESSION', inscrit: 25, reputation: 265, badges: badges(pionnier(25), ['PREMIERE_CREATION', 20]) }),
    membre(43, 'promo-ia-express', 'Promo IA Express', { photo: false, statutCompte: 'BANNI', inscrit: 24, reputation: 0 }),
    membre(44, 'serge-kouame', 'Serge Kouamé', { inscrit: 18, reputation: 515, badges: badges(['PIONNIER', 18], ['PREMIERE_CREATION', 15], ['REPRODUCTIBLE', 6]) }),
    membre(45, 'bernard-lemoine', 'Bernard Lemoine', { inscrit: 25, reputation: 58, badges: badges(pionnier(25)) }),
    membre(46, 'fatoumata-coulibaly', 'Fatoumata Coulibaly', { inscrit: 34, reputation: 1240, badges: badges(['PIONNIER', 34], ['PREMIERE_CREATION', 33], ['PARTICIPANT', 14], ['PODIUM', 14]) })
  ];

  /* Décisions de modération. Celles de moderation-data.js d'abord (dossiers et historiques des
     auteurs), complétées du nombre de signalements qu'elles ont clos ; puis les autres, du plus
     ancien au plus récent. `ilYa` et `finDans` en heures ; `auteur` : auteur du contenu visé ;
     `vise` : membre sanctionné (avertissement, suspension, décisions des administrateurs). */
  const CLOS = { 812: 2, 871: 2, 905: 1 };
  const depuisModeration = [];
  MOD.contenus.forEach(c => {
    c.decisions.forEach(d => depuisModeration.push({ ...d, contenuId: c.id, intituleContenu: c.intitule, auteur: c.auteur.pseudo }));
    c.historique.forEach(d => depuisModeration.push({ ...d, signalementsClos: CLOS[d.id] || 0, auteur: c.auteur.pseudo }));
  });
  const decision = (id, action, decideur, ilYa, motif, autres = {}) => ({ id, action, decideur, ilYa, motif, contenuId: null, intituleContenu: null, auteur: null, vise: null, signalementsClos: 0, points: null, badge: null, finDans: null, ...autres });
  const sur = (contenuId, intituleContenu, auteur, signalementsClos = 0) => ({ contenuId, intituleContenu, auteur, signalementsClos });

  const decisions = [
    ...depuisModeration.map(d => decision(d.id, d.action, d.decideur.pseudo, d.ilYa, d.motif, {
      contenuId: d.contenuId ?? null, intituleContenu: d.intituleContenu ?? null, auteur: d.auteur,
      vise: ['AVERTIR', 'SUSPENDRE'].includes(d.action) ? d.auteur : null, signalementsClos: d.signalementsClos || 0
    })),
    decision(990, 'MASQUER', 'ibrahima-sow', 18 * J, 'Le parcours sert à rédiger de faux avis clients : contenu trompeur', sur(3044, 'Générateur d’avis clients pour une boutique en ligne', 'bernard-lemoine', 2)),
    decision(991, 'AVERTIR', 'ibrahima-sow', 18 * J - 0.1, 'Les créations qui servent à tromper des tiers ne sont pas acceptées', { ...sur(3044, 'Générateur d’avis clients pour une boutique en ligne', 'bernard-lemoine'), vise: 'bernard-lemoine' }),
    decision(1000, 'AUCUNE', 'ndeye-fall', 15 * J, 'Question utile à la communauté, sans rapport avec le motif « Hors sujet »', sur(3266, 'Quel modèle pour transcrire des cours en wolof ?', 'moussa-diallo', 1)),
    decision(981, 'SUPPRIMER', 'ndeye-fall', 14 * J + 2, 'Publicité pour un service payant, sans rapport avec la création commentée', sur(3302, 'Générez 100 visuels par jour avec notre pack de prompts, offre limitée…', 'promo-ia-express', 2)),
    decision(982, 'AVERTIR', 'ndeye-fall', 14 * J + 1.9, 'La publicité n’a pas sa place dans les commentaires. Une récidive entraînera la fermeture du compte', { ...sur(3302, 'Générez 100 visuels par jour avec notre pack de prompts, offre limitée…', 'promo-ia-express'), vise: 'promo-ia-express' }),
    decision(958, 'MASQUER', 'ndeye-fall', 12 * J, 'Moqueries sur le travail d’une membre débutante', sur(3720, 'Réponse à « Vos avis sur ma première affiche ? »', 'cheikh-gueye', 1)),
    decision(959, 'AVERTIR', 'ndeye-fall', 12 * J - 0.1, 'Critiquez le travail, jamais la personne : la charte communautaire s’applique aussi aux retours', { ...sur(3720, 'Réponse à « Vos avis sur ma première affiche ? »', 'cheikh-gueye'), vise: 'cheikh-gueye' }),
    decision(1006, 'SUPPRIMER', 'ibrahima-sow', 11 * J + 5, 'Vente de prompts avec un lien de paiement, après un avertissement', sur(3391, 'Pack de 500 prompts « prêts à vendre », lien de paiement en description', 'promo-ia-express', 4)),
    decision(1007, 'BANNIR', 'sophie-laurent', 11 * J + 3, 'Compte ouvert pour publier de la publicité en série, malgré un avertissement et deux contenus supprimés', { vise: 'promo-ia-express' }),
    decision(1020, 'AJUSTER_REPUTATION', 'sophie-laurent', 6 * J + 12, 'Votes « Utile » échangés avec un second compte pour gonfler votre réputation : les points obtenus ainsi sont retirés', { vise: 'yasmine-cherif', points: -120 }),
    decision(1021, 'RETIRER_BADGE', 'sophie-laurent', 6 * J + 11.9, 'Le badge reposait sur des essais déclarés par votre second compte', { vise: 'yasmine-cherif', badge: { code: 'REPRODUCTIBLE', libelle: 'Reproductible' } }),
    decision(1024, 'AJUSTER_REPUTATION', 'clarisse-mendy', 5 * J + 1, 'Points de votes retirés à tort lors du nettoyage d’un compte frauduleux : ils vous sont rendus', { vise: 'serge-kouame', points: 90 }),
    decision(1012, 'MASQUER', 'ibrahima-sow', 4 * J + 1, 'Propos humiliants envers une membre', sur(4391, 'Réponse à « Mon premier parcours avec Claude »', 'cheikh-gueye', 2)),
    decision(1013, 'SUSPENDRE', 'ibrahima-sow', 4 * J + 0.9, 'Nouveaux propos humiliants envers une membre, après un avertissement', { ...sur(4391, 'Réponse à « Mon premier parcours avec Claude »', 'cheikh-gueye'), vise: 'cheikh-gueye', finDans: 3 * J - 0.9 }),
    decision(1030, 'AUCUNE', 'ibrahima-sow', 3 * J + 6, 'Comparaison argumentée et sourcée, sans rapport avec le motif « Plagiat »', sur(4512, 'Midjourney ou Flux pour des portraits réalistes ?', 'mariam-diop', 1)),
    decision(1031, 'RETABLIR', 'ndeye-fall', 2 * J + 8, 'Signalements groupés sans fondement : la création est originale et son parcours le montre', sur(4466, 'Monogramme d’une teinturerie de bazin', 'fatoumata-coulibaly', 3)),
    decision(1032, 'AJOUTER_AVERTISSEMENT_AGENT', 'ibrahima-sow', 2 * J + 2, 'Le parcours donne des instructions qu’un agent exécute sans contrôle : l’avertissement prévient les lecteurs', sur(4540, 'Un agent qui trie vos e-mails et répond à votre place', 'lea-martin', 1)),
    decision(1033, 'RETIRER_AVERTISSEMENT_AGENT', 'ndeye-fall', J + 3, 'Les étapes demandent désormais une confirmation avant chaque action', sur(4290, 'Sauvegarde quotidienne de vos documents avec n8n', 'kofi-mensah')),
    decision(1034, 'SUPPRIMER', 'ibrahima-sow', 20, 'Le retour donnait l’adresse et le téléphone d’une personne', sur(4655, 'Essai réussi, j’ai mis l’adresse de ma voisine pour tester le faire-part…', 'moussa-diallo', 1)),
    decision(1035, 'MASQUER', 'ndeye-fall', 9, 'L’image reprend une photographie protégée ; publiez votre propre visuel', sur(4690, 'Affiche « Dakar la nuit » à partir d’une photographie trouvée en ligne', 'rokia-keita', 2)),
    decision(1036, 'AVERTIR', 'ndeye-fall', 8.9, 'N’utilisez que des images que vous avez le droit de reprendre, et citez-en la source', { ...sur(4690, 'Affiche « Dakar la nuit » à partir d’une photographie trouvée en ligne', 'rokia-keita'), vise: 'rokia-keita' })
  ];

  /* Codes d'invitation (INV-01), par lots : il y a n jours, validité (null : sans limite), créateur
     (null : commande sur le serveur), puis chaque code : u (utilisé, par qui ; null : compte supprimé
     depuis), l (libre, ou expiré si sa validité est passée), d (désactivé). Codes tirés comme ceux de
     l'API (« VYS-K7M2-Q9 », sans 0, O, 1 ni I), toujours les mêmes. */
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let graine = 20261116;
  const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  const tirer = n => Array.from({ length: n }, () => ALPHABET[Math.floor(hasard() * ALPHABET.length)]).join('');
  const u = nom => ['u', nom];
  const lots = [
    { jours: 34, validite: 7, createur: 'Claire Dubois', codes: [u('Fatoumata Coulibaly'), u('Ousmane Sy'), 'l', u('Amine Bouzid'), u('Khadija Benjelloun'), 'l', u('Pierre Durand'), 'l'] },
    { jours: 33, validite: null, createur: 'Claire Dubois', codes: [u('Clarisse Mendy'), u('Sophie Laurent'), u('Ibrahima Sow'), u('Ndèye Fall'), u('Aïssatou Ndiaye'), u('Yacine Benali'), u('Léa Martin'), u('Julien Moreau'), u('Mariam Diop'), u('Kofi Mensah')] },
    { jours: 26, validite: 30, createur: null, codes: [u('Karim Mansouri'), u('Hugo Girard'), u('Camille Bernard'), u('Rokia Keïta'), u('Sébastien Roy'), u('Awa Sarr'), u('Moussa Diallo'), 'l', u('Yasmine Cherif'), u('Cheikh Gueye'), u('Hélène Garnier'), u('Bernard Lemoine'), u('Thomas Lefèvre'), ['d', 6], u('Nicolas Fontaine'), u(null), u('Lamine Ndour'), u('Promo IA Express'), 'l', u('Binta Ba')] },
    { jours: 18, validite: 14, createur: 'Sophie Laurent', codes: [u('Hawa Cissé'), 'l', u('Idrissa Ouattara'), u('Grace Mbemba'), u('Samuel Owusu'), 'l', u('Mai Nguyen'), u('Djeneba Konaté'), 'l', u('Emmanuel Adjovi')] },
    { jours: 9, validite: 30, createur: 'Clarisse Mendy', codes: [u('Adjoa Asante'), 'l', u('Boubacar Camara'), ['d', 1], u('Esther Kouassi'), u('Koffi Amoussou'), 'l', u('Salimata Ouedraogo'), u('Marie Faye'), 'l'] },
    { jours: 2, validite: 30, createur: 'Sophie Laurent', codes: ['l', 'l', u('Aminata Traoré'), 'l', 'l', 'l', 'l', 'l'] }
  ];
  const invitations = [];
  lots.forEach(lot => {
    const creeIlYa = lot.jours * J + 3;
    lot.codes.forEach((etat, i) => {
      const code = `VYS-${tirer(4)}-${tirer(2)}`;
      const entree = { code, creeIlYa: creeIlYa - i / 60, validite: lot.validite, createur: lot.createur, utilise: null, desactiveIlYa: null };
      // Une personne invitée s'inscrit dans les jours qui suivent l'envoi du code.
      if (etat[0] === 'u') entree.utilise = { ilYa: creeIlYa - (1 + hasard() * Math.min(lot.validite || 5, 5, lot.jours * 0.9) * J), nom: etat[1] };
      if (etat[0] === 'd') entree.desactiveIlYa = creeIlYa - etat[1] * J;
      invitations.push(entree);
    });
  });
  const desactivee = jours => invitations.find(i => i.desactiveIlYa !== null && Math.round(i.creeIlYa / J) === jours);
  const [desactivee26, desactivee9] = [desactivee(26), desactivee(9)];

  /* Journal d'audit (ENF-09). `acteur` : pseudo, ou null avec `origine: 'serveur'` (commande sur le
     serveur) ; `cible` : { membre: pseudo } ou { type, nom } ; `details` comme l'API les inscrit. */
  const entree = (ilYa, action, acteur, cible = null, details = null) => ({ ilYa, action, acteur, cible, details });
  const audit = [
    entree(33 * J + 6, 'ROLE_MODIFIE', null, { membre: 'clarisse-mendy' }, { avant: 'MEMBRE', apres: 'ADMINISTRATEUR', origine: 'serveur' }),
    entree(30 * J + 2, 'ROLE_MODIFIE', 'clarisse-mendy', { membre: 'sophie-laurent' }, { avant: 'MEMBRE', apres: 'ADMINISTRATEUR' }),
    entree(25 * J + 4, 'ROLE_MODIFIE', 'clarisse-mendy', { membre: 'ndeye-fall' }, { avant: 'MEMBRE', apres: 'MODERATEUR' }),
    entree(25 * J + 3, 'ROLE_MODIFIE', 'clarisse-mendy', { membre: 'ibrahima-sow' }, { avant: 'MEMBRE', apres: 'MODERATEUR' }),
    entree(22 * J + 5, 'DOCUMENT_LEGAL_PUBLIE', 'clarisse-mendy', { type: 'document_legal' }, { type: 'CONFIDENTIALITE', version: '2026-11-01' }),
    entree(20 * J + 7, 'DEFI_CREE', 'sophie-laurent', { type: 'defi', nom: 'Une affiche touristique en trois échanges' }),
    entree(desactivee26.desactiveIlYa, 'INVITATION_DESACTIVEE', 'clarisse-mendy', { type: 'invitation', nom: desactivee26.code }, { code: desactivee26.code }),
    entree(18 * J + 3, 'INVITATIONS_CREEES', 'sophie-laurent', null, { nombre: 10, joursValidite: 14 }),
    entree(16 * J + 2, 'EDITEUR_ARCHIVE', 'clarisse-mendy', { type: 'editeur', nom: 'Inflection AI' }, { outils: ['Pi'], modeles: ['Inflection 3.0', 'Inflection 2.5'] }),
    entree(15 * J + 4, 'CATEGORIE_MODIFIEE', 'clarisse-mendy', { type: 'categorie', nom: 'Identité visuelle' }, { libelle: 'Identité visuelle' }),
    entree(14 * J + 6, 'DEFI_CLOTURE', 'sophie-laurent', { type: 'defi', nom: 'Un logo lisible en petit format' }, { participants: 64 }),
    entree(13 * J + 2, 'GUIDE_PUBLIE', 'sophie-laurent', { type: 'guide', nom: 'Créer une affiche de voyage' }, { nom: 'Créer une affiche de voyage' }),
    entree(12 * J + 5, 'ETIQUETTE_ARCHIVEE', 'clarisse-mendy', { type: 'etiquette', nom: 'argent-facile' }),
    entree(11 * J + 2, 'SAVOIR_ILLUSTRATION_AJOUTEE', 'sophie-laurent', { type: 'creation', nom: 'Saint-Louis, les pirogues de Guet Ndar' }, { savoir: 'outil-ou-modele' }),
    entree(10 * J + 4, 'PIEGE_RETENU', 'sophie-laurent', { type: 'proposition_piege', nom: 'Une demande envoyée sans accusé de réception' }, { guide: 'Créer un formulaire de contact' }),
    entree(9 * J + 3, 'INVITATIONS_CREEES', 'clarisse-mendy', null, { nombre: 10, joursValidite: 30 }),
    entree(desactivee9.desactiveIlYa, 'INVITATION_DESACTIVEE', 'clarisse-mendy', { type: 'invitation', nom: desactivee9.code }, { code: desactivee9.code }),
    entree(8 * J + 1, 'CATEGORIES_ORDONNEES', 'sophie-laurent', null, { ordre: ['Image et illustration', 'Application web', 'Code et scripts', 'Texte et rédaction', 'Éducation', 'Analyse de données', 'Automatisation', 'Identité visuelle', 'Vidéo', 'Musique et son'] }),
    entree(7 * J + 4, 'OUTIL_CREE', 'clarisse-mendy', { type: 'outil', nom: 'Kling' }, { nom: 'Kling' }),
    entree(7 * J + 3.9, 'MODELE_AJOUTE', 'clarisse-mendy', { type: 'modele', nom: 'Kling 2.1' }, { outilId: 58 }),
    entree(7 * J + 1, 'EDITEUR_RENOMME', 'clarisse-mendy', { type: 'editeur', nom: 'Mistral AI' }, { avant: 'Mistral', apres: 'Mistral AI' }),
    entree(6 * J + 6, 'LICENCE_PAR_DEFAUT', 'sophie-laurent', { type: 'licence', nom: 'Creative Commons Attribution 4.0' }, { avant: 'Tous droits réservés' }),
    entree(5 * J + 9, 'DEUX_FACTEURS_REINITIALISEE', 'sophie-laurent', { membre: 'ibrahima-sow' }),
    entree(5 * J + 2, 'ROLE_MODIFIE', 'clarisse-mendy', { membre: 'julien-moreau' }, { avant: 'MEMBRE', apres: 'MODERATEUR' }),
    entree(4 * J + 7, 'DOCUMENT_LEGAL_PUBLIE', 'clarisse-mendy', { type: 'document_legal' }, { type: 'CGU', version: '2026-12-01' }),
    entree(3 * J + 5, 'DEFI_PUBLIE', 'sophie-laurent', { type: 'defi', nom: 'Une affiche touristique en trois échanges' }),
    entree(3 * J + 1, 'MEMBRE_EQUIPE_AJOUTE', 'sophie-laurent', { membre: 'fanta-camara' }, { role: 'MODERATEUR' }),
    entree(2 * J + 3, 'INVITATIONS_CREEES', 'sophie-laurent', null, { nombre: 8, joursValidite: 30 }),
    entree(J + 2, 'ACTIVATION_RENVOYEE', 'clarisse-mendy', { membre: 'fanta-camara' }, { role: 'MODERATEUR' }),
    entree(20, 'MEMBRE_EQUIPE_AJOUTE', 'clarisse-mendy', { membre: 'malick-diouf' }, { role: 'ADMINISTRATEUR' }),
    entree(6, 'GUIDE_CONTENU_AJOUTE', 'sophie-laurent', { type: 'guide', nom: 'Créer une affiche de voyage' }, { type: 'parcours', titre: 'Ziguinchor, au fil des bolongs' })
  ];

  /* Savoirs d'Apprendre cités par le journal (APP-03), nommés par leur titre. */
  const savoirs = { 'outil-ou-modele': 'Un outil, un modèle : la différence qui compte' };

  return { membres, decisions, invitations, audit, savoirs, BADGES };
})();
