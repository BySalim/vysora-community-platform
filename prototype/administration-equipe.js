'use strict';

/* Administration, équipe et journaux : démo des écrans du site (apps/web/src/pages/admin/), mêmes
   balisage, classes (moderation.css, moderation-complements.css) et textes ; données simulées dans
   administration-equipe-data.js (et moderation-data.js, dont les membres et les décisions sont repris).
   - administration.html : rôles de l'équipe (ADM-01, ADM-03, EC-23, F-96, RG-111, SEC-02) ;
   - administration-invitations.html : codes d'invitation (INV-01, ADM-02) ;
   - administration-membre.html?pseudo=… : dossier d'un membre et décisions réservées aux
     administrateurs (ADM-02, RG-102, RG-103, RG-104, CI-24) ;
   - administration-decisions.html : journal des décisions de modération (EC-21, F-92) ;
   - administration-journal-audit.html : journal d'audit (ENF-09).
   Les changements simulés (rôles, double authentification, comptes ajoutés, codes, décisions) sont
   gardés pour la session du navigateur : chaque écran les montre, le journal d'audit les inscrit, et
   le journal des décisions reprend aussi celles prises dans la démo de la modération. « Revenir à
   l'état initial » (panneau Tweaks, onglet États) les efface. */

(() => {
  const V = window.Vysora;
  const E = V.etats;
  const EQ = window.Equipe;
  const D = window.VYSORA_ADMINISTRATION_EQUIPE;
  const MOD = window.VYSORA_MODERATION || { M: {}, contenus: [] };
  const { $, $$, t, esc, fmt, icon } = V;
  const vue = document.body.dataset.adVue;

  /* Libellés et règles (lib/administration.ts, lib/moderation.ts, @vysora/shared) ----------------- */

  const LIBELLES_ROLE = { MEMBRE: 'Membre', MODERATEUR: 'Modérateur', ADMINISTRATEUR: 'Administrateur' };
  const DEUX_FACTEURS = {
    active: ['Vérification en deux étapes activée', 'is-ok'],
    'en-attente': ['Vérification en deux étapes commencée, jamais confirmée', 'is-alerte'],
    absente: ['Vérification en deux étapes à configurer', '']
  };
  const LIBELLES_STATUT_COMPTE = { ACTIF: '', EN_SUPPRESSION: 'Suppression demandée', BANNI: 'Compte banni', SUPPRIME: 'Compte supprimé' };
  const LIBELLES_ACTION_DECISION = {
    AUCUNE: 'Aucune mesure', MASQUER: 'Masquer le contenu', RETABLIR: 'Rétablir le contenu', SUPPRIMER: 'Supprimer le contenu',
    AVERTIR: 'Avertir l’auteur', SUSPENDRE: 'Suspendre l’auteur',
    AJOUTER_AVERTISSEMENT_AGENT: 'Ajouter l’avertissement « instructions pour agent »',
    RETIRER_AVERTISSEMENT_AGENT: 'Retirer l’avertissement « instructions pour agent »',
    BANNIR: 'Bannir le compte', AJUSTER_REPUTATION: 'Ajuster la réputation', RETIRER_BADGE: 'Retirer un badge'
  };
  const ACTIONS_DECISION = Object.keys(LIBELLES_ACTION_DECISION);
  const EFFETS_ACTION_ADMINISTRATEUR = {
    BANNIR: 'Le compte est fermé : le membre est déconnecté et ne peut plus se connecter. Ses contenus restent en place, la modération décide de chacun. Cette mesure est définitive.',
    AJUSTER_REPUTATION: 'En cas de fraude avérée : des points sont ajoutés à sa réputation ou en sont retirés, et son niveau suit.',
    RETIRER_BADGE: 'Le badge disparaît de son profil et ne lui sera plus attribué.'
  };
  const QUESTIONS_ACTION_ADMINISTRATEUR = { BANNIR: 'Fermer ce compte ?', AJUSTER_REPUTATION: 'Ajuster la réputation ?', RETIRER_BADGE: 'Retirer ce badge ?' };
  const ACTIONS_AUDIT = {
    equipe: ['ROLE_MODIFIE', 'DEUX_FACTEURS_REINITIALISEE', 'MEMBRE_EQUIPE_AJOUTE', 'ACTIVATION_RENVOYEE'],
    invitations: ['INVITATIONS_CREEES', 'INVITATION_DESACTIVEE'],
    referentiels: ['EDITEUR_RENOMME', 'EDITEUR_ARCHIVE', 'EDITEUR_REACTIVE', 'OUTIL_CREE', 'OUTIL_ACTIF', 'OUTIL_ARCHIVE', 'MODELE_AJOUTE', 'MODELE_DISPONIBLE', 'MODELE_RETIRE', 'CATEGORIE_CREEE', 'CATEGORIE_MODIFIEE', 'CATEGORIE_REACTIVEE', 'CATEGORIE_ARCHIVEE', 'CATEGORIES_ORDONNEES', 'LICENCE_CREEE', 'LICENCE_MODIFIEE', 'LICENCE_REACTIVEE', 'LICENCE_ARCHIVEE', 'LICENCE_PAR_DEFAUT', 'LICENCES_ORDONNEES', 'ETIQUETTE_REACTIVEE', 'ETIQUETTE_ARCHIVEE', 'BADGE_REPRIS', 'BADGE_ARRETE'],
    documents: ['DOCUMENT_LEGAL_PUBLIE', 'DOCUMENT_LEGAL_RETIRE'],
    defis: ['DEFI_CREE', 'DEFI_PUBLIE', 'DEFI_ANNULE', 'DEFI_CLOTURE'],
    guides: ['GUIDE_CREE', 'GUIDE_MODIFIE', 'GUIDE_PUBLIE', 'GUIDE_EN_PREPARATION', 'GUIDE_SUPPRIME', 'GUIDE_CONTENU_AJOUTE', 'GUIDE_CONTENU_RETIRE', 'PIEGE_RETENU', 'PIEGE_ECARTE', 'DEMANDE_CREEE', 'DEMANDE_CLOSE', 'DEMANDE_ROUVERTE'],
    apprendre: ['SAVOIR_ILLUSTRATION_AJOUTEE', 'SAVOIR_ILLUSTRATION_RETIREE', 'SAVOIR_SUJET_LIE', 'SAVOIR_SUJET_RETIRE']
  };
  const LIBELLES_DOMAINE_AUDIT = { equipe: 'Équipe', invitations: 'Invitations', referentiels: 'Référentiels', documents: 'Documents légaux', defis: 'Défis', guides: 'Guides d’Explorer', apprendre: 'Savoirs d’Apprendre' };
  const LIBELLES_ACTION_AUDIT = {
    ROLE_MODIFIE: 'Rôle modifié', DEUX_FACTEURS_REINITIALISEE: 'Vérification en deux étapes réinitialisée', MEMBRE_EQUIPE_AJOUTE: 'Compte de l’équipe créé', ACTIVATION_RENVOYEE: 'Lien d’activation renvoyé',
    INVITATIONS_CREEES: 'Codes d’invitation créés', INVITATION_DESACTIVEE: 'Code d’invitation désactivé',
    EDITEUR_RENOMME: 'Éditeur renommé', EDITEUR_ARCHIVE: 'Éditeur archivé', EDITEUR_REACTIVE: 'Éditeur proposé de nouveau',
    OUTIL_CREE: 'Outil ajouté', OUTIL_ACTIF: 'Outil réactivé', OUTIL_ARCHIVE: 'Outil archivé',
    MODELE_AJOUTE: 'Modèle ajouté', MODELE_DISPONIBLE: 'Modèle proposé de nouveau', MODELE_RETIRE: 'Modèle retiré',
    CATEGORIE_CREEE: 'Catégorie ajoutée', CATEGORIE_MODIFIEE: 'Catégorie modifiée', CATEGORIE_REACTIVEE: 'Catégorie réactivée', CATEGORIE_ARCHIVEE: 'Catégorie archivée', CATEGORIES_ORDONNEES: 'Ordre des catégories changé',
    LICENCE_CREEE: 'Licence ajoutée', LICENCE_MODIFIEE: 'Licence modifiée', LICENCE_REACTIVEE: 'Licence réactivée', LICENCE_ARCHIVEE: 'Licence archivée', LICENCE_PAR_DEFAUT: 'Licence par défaut changée', LICENCES_ORDONNEES: 'Ordre des licences changé',
    ETIQUETTE_REACTIVEE: 'Étiquette réactivée', ETIQUETTE_ARCHIVEE: 'Étiquette archivée', BADGE_REPRIS: 'Attribution du badge reprise', BADGE_ARRETE: 'Attribution du badge arrêtée',
    DOCUMENT_LEGAL_PUBLIE: 'Version d’un document légal publiée', DOCUMENT_LEGAL_RETIRE: 'Version d’un document légal retirée',
    DEFI_CREE: 'Défi créé', DEFI_PUBLIE: 'Défi publié', DEFI_ANNULE: 'Défi annulé', DEFI_CLOTURE: 'Défi clôturé',
    GUIDE_CREE: 'Guide créé', GUIDE_MODIFIE: 'Guide modifié', GUIDE_PUBLIE: 'Guide publié', GUIDE_EN_PREPARATION: 'Guide repassé en préparation', GUIDE_SUPPRIME: 'Guide supprimé',
    GUIDE_CONTENU_AJOUTE: 'Contenu ajouté à un guide', GUIDE_CONTENU_RETIRE: 'Contenu retiré d’un guide', PIEGE_RETENU: 'Piège signalé retenu', PIEGE_ECARTE: 'Piège signalé écarté',
    DEMANDE_CREEE: 'Objectif cherché ajouté', DEMANDE_CLOSE: 'Objectif cherché clos', DEMANDE_ROUVERTE: 'Objectif cherché rouvert',
    SAVOIR_ILLUSTRATION_AJOUTEE: 'Moment clé ajouté à un savoir', SAVOIR_ILLUSTRATION_RETIREE: 'Moment clé retiré d’un savoir', SAVOIR_SUJET_LIE: 'Sujet du forum lié à un savoir', SAVOIR_SUJET_RETIRE: 'Sujet du forum retiré d’un savoir'
  };
  const TITRES_DOCUMENTS = { CGU: 'Conditions générales d’utilisation', CONFIDENTIALITE: 'Politique de confidentialité', CHARTE: 'Charte communautaire' };
  const MESSAGES_EQUIPE = {
    emailPris: 'Cette adresse est déjà associée à un compte Vysora : recherchez-la dans la liste pour changer son rôle.',
    compteFerme: 'Cette adresse appartient à un compte banni ou en cours de suppression.'
  };
  const NIVEAUX = [[5000, 'Maître'], [1500, 'Expert'], [300, 'Artisan'], [50, 'Apprenti'], [-Infinity, 'Curieux']];
  const TONS = { BLEU: 'blue', VERT: 'green', AMBRE: 'amber', ENCRE: 'ink' };
  const LIEN_ACTIVATION_JOURS = 7;
  const AJUSTEMENT = 5000;
  const MOTIF_MAX = 2000;
  const EMAIL_MAX = 254;
  const NOM_MAX = 60;
  const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MESSAGE_POINTS = `Indiquez un nombre de points de −${fmt(AJUSTEMENT)} à ${fmt(AJUSTEMENT)}, autre que 0.`;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PAR_PAGE = 20;
  const INVITATIONS_PAR_PAGE = 50;

  const pluriel = EQ.pluriel;
  const date = heures => EQ.ilYa(heures);
  const niveauDe = points => NIVEAUX.find(([seuil]) => points >= seuil)[1];
  const enPhrase = texte => (/[.!?…]$/.test(texte.trim()) ? texte.trim() : `${texte.trim()}.`);
  const pointsSignes = points => `${points > 0 ? '+' : '−'}${pluriel(Math.abs(points), 'point', 'points')}`;
  const precisionDecision = d => (d.points !== null && d.points !== undefined ? pointsSignes(d.points) : d.badge ? `Badge « ${d.badge.libelle} »` : '');
  const badge = (code, jours) => {
    const [libelle, critere, icone, ton] = D.BADGES[code];
    return { code, libelle, critere, icone, ton, ilYa: jours * 24 };
  };
  const pseudoDe = valeur => valeur.toLowerCase().replace(/^@/, '');
  const dossierMembre = pseudo => `administration-membre.html?pseudo=${encodeURIComponent(pseudo)}`;
  const dossierModeration = id => `moderation-dossier.html?id=${id}`;
  const parametres = () => new URLSearchParams(location.search);
  const numeroDePage = () => Math.max(1, Math.min(1000, Number(parametres().get('page')) || 1));

  /** Photo d'un membre (AvatarMembre.astro) ; sans photo, la silhouette par défaut. */
  const avatar = (m, taille) => (m && m.avatar
    ? `<img src="${esc(m.avatar)}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', '')}</span>`);
  /** Emblème hexagonal d'un badge (lib/accueil/elements.ts, embleme). */
  const embleme = b => `<span class="emblem" data-tone="${TONS[b.ton]}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icon(b.icone, '')}</span>`;
  const tete = (contenu, actif) => `<div class="container md-tete">
      <p class="md-rubrique">${icon('shield')}Administration</p>
      ${contenu}
      ${EQ.ongletsAdministration(actif)}
    </div>`;

  /* Changements simulés, gardés pour la session du navigateur -------------------------------------- */

  const CLE = 'vysora-administration-equipe';
  const VIDE = () => ({ roles: {}, noms: {}, deuxFacteurs: {}, ajouts: [], decisions: [], audit: [], codes: [], desactives: {} });
  function simulation() {
    let lue = {};
    try { lue = JSON.parse(sessionStorage.getItem(CLE) || '{}') || {}; } catch { lue = {}; }
    return { ...VIDE(), ...lue };
  }
  function modifier(changer) {
    const s = simulation();
    changer(s);
    try { sessionStorage.setItem(CLE, JSON.stringify(s)); } catch { /* stockage indisponible */ }
  }
  const effacerSimulation = () => { try { sessionStorage.removeItem(CLE); } catch { /* stockage indisponible */ } };
  /** Action inscrite au journal d'audit par l'administrateur simulé (ENF-09). */
  const inscrire = (s, action, cible = null, details = null) => s.audit.push({ date: new Date().toISOString(), action, acteur: E.MOI.pseudo, cible, details });

  /* Membres, avec les changements de la session -------------------------------------------------- */

  function appliquer(m, s) {
    if (!m.moi && s.roles[m.pseudo]) m.role = s.roles[m.pseudo];
    if (s.noms[m.pseudo]) m.nom = s.noms[m.pseudo];
    if (s.deuxFacteurs[m.pseudo]) m.deuxFacteurs = s.deuxFacteurs[m.pseudo];
    s.decisions.filter(d => d.pseudo === m.pseudo).forEach(d => {
      if (d.action === 'BANNIR') m.statutCompte = 'BANNI';
      if (d.action === 'AJUSTER_REPUTATION') m.reputation += d.points;
      if (d.action === 'RETIRER_BADGE') m.badges = m.badges.filter(b => b.code !== d.badge.code);
    });
    m.niveau = m.moi ? E.niveau().nom : niveauDe(m.reputation);
    m.badges = m.badges.map(b => ({ ...b, date: b.date || date(b.ilYa) }));
    return m;
  }

  /** Tous les membres simulés ; `equipe: 'seul'` (rôles) : Sophie Laurent n'est pas administratrice. */
  function lesMembres(reglages = {}) {
    const s = simulation();
    const etat = E.get();
    return [...D.membres, ...s.ajouts].map(source => {
      const m = { ...source, badges: [...(source.badges || [])] };
      m.inscritLe = source.inscritLe || date(source.inscrit * 24);
      if (m.moi) {
        m.role = { admin: 'ADMINISTRATEUR', moderateur: 'MODERATEUR' }[etat.role] || 'MEMBRE';
        m.reputation = E.niveau().points;
        m.avatar = V.photoMoi() || null;
      } else if (reglages.equipe === 'seul' && m.pseudo === 'sophie-laurent') m.role = 'MEMBRE';
      return appliquer(m, s);
    });
  }

  /** Membre absent des données : un dossier plausible, tiré de moderation-data.js s'il y figure. */
  function repli(pseudo) {
    const connu = Object.values(MOD.M || {}).find(x => x.pseudo === pseudo);
    const nom = connu ? connu.nom : pseudo.split(/[-_]+/).filter(Boolean).map(mot => mot.charAt(0).toUpperCase() + mot.slice(1)).join(' ');
    const points = { Curieux: 24, Apprenti: 120, Artisan: 410, Expert: 1650, Maître: 5200 }[connu?.niveau] ?? 24;
    return appliquer({
      id: 900 + pseudo.length, pseudo, nom, avatar: connu?.avatar ?? null, email: `${pseudo}@example.test`, role: 'MEMBRE', statutCompte: 'ACTIF',
      deuxFacteurs: 'absente', activationEnAttente: false, inscritLe: date(21 * 24), reputation: points, badges: [badge('PIONNIER', 21)]
    }, simulation());
  }

  /* Décisions de modération : données, démo de la modération et dossiers des membres -------------- */

  /** Décisions prises dans la démo de la modération (moderation.js, même session du navigateur). */
  function decisionsDeLaModeration() {
    let toutes = {};
    try { toutes = JSON.parse(sessionStorage.getItem('vysora-moderation-decisions') || '{}') || {}; } catch { toutes = {}; }
    return Object.entries(toutes).flatMap(([id, liste]) => {
      const c = MOD.contenus.find(x => x.id === Number(id));
      if (!c || !Array.isArray(liste)) return [];
      let ouverts = c.signalements.filter(x => x.statut === 'OUVERT').length;
      return liste.map(d => {
        const clos = ouverts;
        ouverts = 0;
        return {
          id: d.id, action: d.action, decideur: d.decideur?.pseudo || E.MOI.pseudo, date: d.date, motif: d.motif, contenuId: c.id, intituleContenu: c.intitule,
          auteur: c.auteur.pseudo, vise: ['AVERTIR', 'SUSPENDRE'].includes(d.action) ? c.auteur.pseudo : null, signalementsClos: clos, points: null, badge: null, finSuspension: d.finSuspension || null
        };
      });
    });
  }

  /** Journal complet, de la plus récente à la plus ancienne ; décideur et membre visé présentés. */
  function lesDecisions(membres) {
    const s = simulation();
    const parPseudo = Object.fromEntries(membres.map(m => [m.pseudo, m]));
    const qui = pseudo => parPseudo[pseudo] || Object.values(MOD.M || {}).find(x => x.pseudo === pseudo) || { pseudo, nom: pseudo, avatar: null };
    const donnees = D.decisions.map(d => ({ ...d, date: date(d.ilYa), finSuspension: d.finDans !== null && d.finDans !== undefined ? date(-d.finDans) : null }));
    const dossiers = s.decisions.map(d => ({ ...d, decideur: E.MOI.pseudo, contenuId: null, intituleContenu: null, auteur: null, vise: d.pseudo, signalementsClos: 0, finSuspension: null }));
    return [...donnees, ...decisionsDeLaModeration(), ...dossiers]
      .map(d => ({ ...d, decideur: qui(d.decideur), membreVise: d.vise ? qui(d.vise) : null }))
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }

  const ligneDecision = (d, journal) => `<li class="md-ligne">${avatar(d.decideur, 32)}<div class="md-ligne-corps">
      <p class="md-ligne-haut"><b>${t(LIBELLES_ACTION_DECISION[d.action])}</b><span>${[
        precisionDecision(d),
        `Par ${d.decideur.nom}, le ${EQ.dateCourte(d.date)}`,
        d.finSuspension ? `jusqu’au ${EQ.dateLongue(d.finSuspension)}` : '',
        journal && d.signalementsClos ? `${fmt(d.signalementsClos)} ${d.signalementsClos > 1 ? 'signalements clos' : 'signalement clos'}` : ''
      ].filter(Boolean).map(t).join(' · ')}</span><span class="md-ref">Décision n° ${d.id}</span></p>
      ${d.contenuId !== null && d.contenuId !== undefined ? `<p class="md-ligne-sur">Sur <a href="${dossierModeration(d.contenuId)}">${t(d.intituleContenu ?? `le contenu n° ${d.contenuId}`)}</a></p>` : ''}
      ${journal && d.membreVise ? `<p class="md-ligne-sur">Membre visé : <a href="${dossierMembre(d.membreVise.pseudo)}">${t(`${d.membreVise.nom} (@${d.membreVise.pseudo})`)}</a></p>` : ''}
      <p class="md-ligne-texte">${t(enPhrase(d.motif))}</p>
    </div></li>`;

  /* Fenêtre de confirmation (scripts/commun/administration.ts, confirmer) -------------------------- */

  let fenetreSuivie = false;
  function confirmer(titre, texte, libelle, action, { annuler = 'Annuler', danger = false } = {}) {
    EQ.confirmer({ titre, texte, libelle, annuler, action });
    const fenetre = $('[data-eq-dialogue]');
    $('[data-eq-confirmer]', fenetre).classList.toggle('is-danger', danger);
    if (fenetreSuivie) return;
    fenetreSuivie = true;
    // Annulée : les listes reprennent le rôle actuel (scripts/administration.ts). L'événement
    // « close » peut se faire attendre (page en arrière-plan) : « Annuler » et Échap le font aussi.
    const reprendre = () => $$('[data-ad-role]').forEach(liste => { liste.value = liste.dataset.actuel; });
    fenetre.addEventListener('close', reprendre);
    fenetre.addEventListener('cancel', reprendre);
    $('[data-eq-annuler]', fenetre).addEventListener('click', reprendre);
    // Dossier d'un membre : un clic hors de la fenêtre l'annule (scripts/dossier-membre.ts).
    if (vue === 'membre') fenetre.addEventListener('click', evenement => {
      if (evenement.target !== fenetre) return;
      const cadre = fenetre.getBoundingClientRect();
      const { clientX: x, clientY: y } = evenement;
      if (x < cadre.left || x > cadre.right || y < cadre.top || y > cadre.bottom) fenetre.close('annuler');
    });
  }
  /** Refus de l'API (409) : son message, tel qu'elle le formule. */
  const signalerRefus = message => V.toast(message, 'alert');

  /** Erreurs d'un formulaire, chacune sous son champ (`data-ad-erreur`), « general » en dernier. */
  function afficherErreurs(formulaire, erreurs) {
    $$('[data-ad-erreur]', formulaire).forEach(zone => {
      const message = erreurs[zone.dataset.adErreur] || '';
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      zone.closest('.ad-champ')?.querySelector('input, select, textarea')?.setAttribute('aria-invalid', String(Boolean(message)));
    });
  }

  /* Rôles de l'équipe (pages/admin/roles.astro) ---------------------------------------------------- */

  function rendreRoles(reglages) {
    const page = $('[data-eq-page]');
    const q = (parametres().get('q') || '').trim().slice(0, 80);
    const membres = lesMembres(reglages).filter(m => m.statutCompte !== 'SUPPRIME');
    const cherche = q.toLowerCase();
    const rang = m => ({ ADMINISTRATEUR: 0, MODERATEUR: 1 }[m.role] ?? 2);
    const elements = membres
      .filter(m => (q ? m.pseudo.toLowerCase().includes(cherche) || m.nom.toLowerCase().includes(cherche) || m.email.toLowerCase() === cherche : m.role !== 'MEMBRE'))
      .sort((a, b) => rang(a) - rang(b) || (a.pseudo < b.pseudo ? -1 : a.pseudo > b.pseudo ? 1 : 0))
      .slice(0, 20);
    const actifs = membres.filter(m => m.role === 'ADMINISTRATEUR' && m.statutCompte === 'ACTIF' && !m.activationEnAttente).length;

    const ligne = m => {
      const [texte2fa, classe2fa] = DEUX_FACTEURS[m.deuxFacteurs];
      const statut = LIBELLES_STATUT_COMPTE[m.statutCompte];
      return `<li class="ad-membre" data-ad-membre="${m.id}">
        ${avatar(m, 40)}
        <div class="ad-membre-corps">
          <span class="ad-membre-nom">${t(m.nom)}${m.moi ? ' (vous)' : ''}</span>
          <span class="ad-membre-meta">
            <span>${t(`@${m.pseudo} · inscrit le ${EQ.dateCourte(m.inscritLe)}`)}</span>
            ${m.activationEnAttente ? `<span class="is-alerte">${t('Compte pas encore activé')}</span>`
              : (m.role !== 'MEMBRE' || m.deuxFacteurs !== 'absente') ? `<span${classe2fa ? ` class="${classe2fa}"` : ''}>${t(texte2fa)}</span>` : ''}
            ${statut ? `<span class="is-alerte">${statut}</span>` : ''}
          </span>
        </div>
        <div class="ad-membre-actions">
          <a class="btn btn-secondary btn-sm" href="${dossierMembre(m.pseudo)}" aria-label="${esc(`Dossier de ${m.nom}`)}">Dossier</a>
          <label class="sr-only" for="ad-role-${m.id}">${t(`Rôle de ${m.nom}`)}</label>
          <select id="ad-role-${m.id}" data-ad-role data-actuel="${m.role}" data-nom="${esc(m.nom)}">${Object.entries(LIBELLES_ROLE).map(([valeur, libelle]) => `<option value="${valeur}"${valeur === m.role ? ' selected' : ''}>${libelle}</option>`).join('')}</select>
          ${m.activationEnAttente ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-activation data-nom="${esc(m.nom)}">Renvoyer le lien d’activation</button>` : ''}
          ${m.deuxFacteurs !== 'absente' ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-reinitialiser data-nom="${esc(m.nom)}">Réinitialiser la vérification</button>` : ''}
        </div>
      </li>`;
    };

    page.innerHTML = `${tete(`<h1>Rôles de l’équipe</h1>
        <p class="md-statut"><span class="is-fort">${pluriel(actifs, 'administrateur actif', 'administrateurs actifs')}</span><span>${t('La plateforme en compte toujours au moins un.')}</span></p>`, 'roles')}
      <div class="container md-file" data-ad-roles>
        <form class="ad-defi" novalidate data-ad-equipe>
          <h2>Ajouter à l’équipe</h2>
          <p class="md-regle">${t(`La personne reçoit à cette adresse un lien d’activation, valable ${LIEN_ACTIVATION_JOURS} jours. Elle choisit son mot de passe, puis configure la vérification en deux étapes à sa première connexion.`)}</p>
          <div class="ad-outils">
            <div class="ad-champ is-large">
              <label for="ad-equipe-email">Adresse e-mail</label>
              <input id="ad-equipe-email" name="email" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="${EMAIL_MAX}" required>
              <p class="md-erreur" data-ad-erreur="email" hidden></p>
            </div>
            <div class="ad-champ is-large">
              <label for="ad-equipe-nom">Nom</label>
              <input id="ad-equipe-nom" name="nom" autocomplete="off" maxlength="${NOM_MAX}" placeholder="Prénom Nom" required>
              <p class="md-erreur" data-ad-erreur="nom" hidden></p>
            </div>
            <div class="ad-champ">
              <label for="ad-equipe-role">Rôle</label>
              <select id="ad-equipe-role" name="role"><option value="MODERATEUR">${LIBELLES_ROLE.MODERATEUR}</option><option value="ADMINISTRATEUR">${LIBELLES_ROLE.ADMINISTRATEUR}</option></select>
              <p class="md-erreur" data-ad-erreur="role" hidden></p>
            </div>
            <button class="btn btn-primary" type="submit">${icon('plus')}Ajouter</button>
          </div>
          <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
        </form>
        <form class="ad-outils" method="get" role="search">
          <div class="ad-champ is-large">
            <label for="ad-q">Trouver un membre</label>
            <input id="ad-q" name="q" type="search" value="${esc(q)}" maxlength="80" placeholder="Pseudo, nom ou adresse e-mail exacte" autocomplete="off">
          </div>
          <button class="btn btn-secondary" type="submit">${icon('search')}Rechercher</button>
          ${q ? '<a class="btn btn-secondary" href="?">Voir l’équipe</a>' : ''}
        </form>
        <p class="md-regle">${t(q ? `Membres trouvés pour « ${q} » (vingt au plus).` : 'Modération et administration. La vérification en deux étapes est exigée à chaque nouvelle connexion de ces comptes.')}</p>
        ${elements.length ? `<ul class="md-liste">${elements.map(ligne).join('')}</ul>` : `<p class="md-rien ad-vide">${t('Aucun membre ne correspond à cette recherche.')}</p>`}
      </div>`;
    brancherRoles(reglages, membres);
  }

  function brancherRoles(reglages, membres) {
    const page = $('[data-eq-page]');
    const de = element => membres.find(m => String(m.id) === element.closest('[data-ad-membre]')?.dataset.adMembre);

    /* Rôles (F-96, RG-111) : jamais moins d'un administrateur actif ; un compte banni n'en reçoit pas. */
    $$('[data-ad-role]', page).forEach(liste => liste.addEventListener('change', () => {
      const m = de(liste);
      const role = liste.value;
      const nom = liste.dataset.nom;
      const texte = role === 'MEMBRE'
        ? `${nom} perd l’accès à la modération et à l’administration.`
        : `${nom} devra activer la vérification en deux étapes à sa prochaine connexion, puis la confirmer à chaque nouvel appareil.`;
      confirmer(`Donner le rôle « ${LIBELLES_ROLE[role]} » ?`, texte, 'Changer le rôle', () => {
        const actuels = lesMembres(reglages);
        const membre = actuels.find(x => x.id === m.id);
        const refus = role !== 'MEMBRE' && membre.statutCompte === 'BANNI' ? 'Un compte banni ne reçoit pas de rôle.'
          : membre.role === 'ADMINISTRATEUR' && !actuels.some(x => x.id !== membre.id && x.role === 'ADMINISTRATEUR' && x.statutCompte === 'ACTIF' && !x.activationEnAttente)
            ? 'La plateforme compte toujours au moins un administrateur actif : nommez-en un autre avant de retirer ce rôle.' : '';
        if (refus) {
          liste.value = liste.dataset.actuel;
          signalerRefus(refus);
          return;
        }
        modifier(s => {
          if (!membre.moi) s.roles[membre.pseudo] = role;
          inscrire(s, 'ROLE_MODIFIE', { membre: membre.pseudo }, { avant: membre.role, apres: role });
        });
        // Votre propre rôle : les états communs suivent, et la page n'est plus la vôtre.
        if (membre.moi) E.set({ role: role === 'MODERATEUR' ? 'moderateur' : 'membre' });
        rafraichir();
        V.toast(`Rôle de ${nom} : ${LIBELLES_ROLE[role]}.`);
      });
    }));

    /* SEC-02 : appareil perdu. */
    $$('[data-ad-reinitialiser]', page).forEach(bouton => bouton.addEventListener('click', () => {
      const m = de(bouton);
      const nom = bouton.dataset.nom;
      confirmer('Réinitialiser la vérification en deux étapes ?',
        `La clé et les codes de secours de ${nom} sont effacés. À sa prochaine connexion, ${nom} configure une nouvelle clé. À faire seulement après avoir vérifié son identité.`,
        'Réinitialiser', () => {
          modifier(s => {
            s.deuxFacteurs[m.pseudo] = 'absente';
            inscrire(s, 'DEUX_FACTEURS_REINITIALISEE', { membre: m.pseudo });
          });
          rafraichir();
          V.toast(`Vérification en deux étapes de ${nom} réinitialisée.`);
        });
    }));

    /* ADM-03 : nouveau lien d'activation, sans confirmation. */
    $$('[data-ad-activation]', page).forEach(bouton => bouton.addEventListener('click', () => {
      const m = de(bouton);
      modifier(s => inscrire(s, 'ACTIVATION_RENVOYEE', { membre: m.pseudo }, { role: m.role }));
      V.toast(`Nouveau lien d’activation envoyé à ${bouton.dataset.nom}.`, 'mail');
    }));

    /* ADM-03 : compte de l'équipe créé par un administrateur (schemaAjoutEquipe). */
    const formulaire = $('[data-ad-equipe]', page);
    formulaire.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const saisie = Object.fromEntries(new FormData(formulaire));
      const email = String(saisie.email || '').trim();
      const nom = String(saisie.nom || '').trim();
      const role = saisie.role;
      const erreurs = {};
      if (!email) erreurs.email = 'Indiquez l’adresse e-mail de la personne.';
      else if (email.length > EMAIL_MAX) erreurs.email = 'Cette adresse e-mail est trop longue.';
      else if (!MOTIF_EMAIL.test(email)) erreurs.email = 'Cette adresse e-mail est incomplète. Vérifiez-la.';
      if (!nom) erreurs.nom = 'Indiquez le nom de la personne.';
      else if (nom.length > NOM_MAX) erreurs.nom = `Le nom compte ${NOM_MAX} caractères au plus.`;
      else if (/[\p{Cc}\p{Cf}]/u.test(nom)) erreurs.nom = 'Retirez les caractères invisibles du nom.';
      if (!['MODERATEUR', 'ADMINISTRATEUR'].includes(role)) erreurs.role = 'Choisissez un rôle.';
      afficherErreurs(formulaire, erreurs);
      if (Object.keys(erreurs).length) return;
      const propre = nom.replace(/\s+/g, ' ');
      confirmer(`Ajouter ${propre} à l’équipe ?`,
        `Un compte « ${LIBELLES_ROLE[role]} » est créé et un lien d’activation part à ${email}. Vérifiez l’adresse : c’est elle qui donnera accès au compte.`,
        'Ajouter et envoyer le lien', () => ajouterALEquipe({ email, nom: propre, role }, formulaire));
    });
  }

  /** Pseudo tiré du nom (RG-01), comme l'API : « fanta-camara », puis « fanta-camara-2 »… */
  function pseudoLibre(nom, membres) {
    const pris = new Set(membres.map(m => m.pseudo.toLowerCase()));
    const racine = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 27).replace(/-+$/, '');
    const candidats = racine.length >= 3 ? [racine, ...[2, 3, 4, 5, 6, 7, 8, 9].map(n => `${racine}-${n}`)] : [];
    return candidats.find(c => !pris.has(c)) || `membre-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('').toLowerCase()}`;
  }

  function ajouterALEquipe({ email, nom, role }, formulaire) {
    const membres = lesMembres();
    const existant = membres.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (existant && !existant.activationEnAttente) {
      afficherErreurs(formulaire, { email: existant.statutCompte === 'ACTIF' ? MESSAGES_EQUIPE.emailPris : MESSAGES_EQUIPE.compteFerme });
      return;
    }
    modifier(s => {
      if (existant) {
        // Compte jamais activé : rôle et nom mis à jour, nouveau lien.
        s.roles[existant.pseudo] = role;
        s.noms[existant.pseudo] = nom;
        inscrire(s, 'ACTIVATION_RENVOYEE', { membre: existant.pseudo }, { role });
        return;
      }
      const pseudo = pseudoLibre(nom, membres);
      s.ajouts.push({
        id: 100 + s.ajouts.length, pseudo, nom, avatar: null, email, role, statutCompte: 'ACTIF', deuxFacteurs: 'absente',
        activationEnAttente: true, inscritLe: new Date().toISOString(), reputation: 0, badges: []
      });
      inscrire(s, 'MEMBRE_EQUIPE_AJOUTE', { membre: pseudo }, { role });
    });
    rafraichir();
    V.toast(`Lien d’activation envoyé à ${nom}.`);
  }

  /* Invitations (pages/admin/invitations.astro) ------------------------------------------------------ */

  /** Codes, les plus récents d'abord ; ceux créés dans la session en tête. */
  function lesInvitations(reglages) {
    const s = simulation();
    const maintenant = Date.now();
    const jusquA = (creation, jours) => (jours ? new Date(new Date(creation).getTime() + jours * 86400000).toISOString() : null);
    const donnees = reglages.codes === 'aucun' ? [] : D.invitations.map(i => {
      const creation = date(i.creeIlYa);
      return {
        code: i.code, dateCreation: creation, dateExpiration: jusquA(creation, i.validite), createur: i.createur ? { nom: i.createur } : null,
        utilisation: i.utilise ? { date: date(i.utilise.ilYa), membre: i.utilise.nom ? { nom: i.utilise.nom } : null } : null,
        dateDesactivation: i.desactiveIlYa !== null ? date(i.desactiveIlYa) : null
      };
    });
    const creees = s.codes.map(c => ({ code: c.code, dateCreation: c.date, dateExpiration: jusquA(c.date, c.joursValidite), createur: { nom: E.MOI.nom }, utilisation: null, dateDesactivation: null }));
    return [...creees.reverse(), ...donnees]
      .map(i => ({ ...i, dateDesactivation: s.desactives[i.code] || i.dateDesactivation }))
      .map(i => ({ ...i, libre: !i.utilisation && !i.dateDesactivation && (!i.dateExpiration || new Date(i.dateExpiration).getTime() > maintenant) }))
      .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  }

  const ligneCode = (i, maintenant) => {
    const expire = !i.utilisation && i.dateExpiration && new Date(i.dateExpiration) <= maintenant;
    const etat = i.utilisation ? `<span class="ad-etat">${t(`Utilisé le ${EQ.dateCourte(i.utilisation.date)}${i.utilisation.membre ? ` par ${i.utilisation.membre.nom}` : ''}`)}</span>`
      : i.dateDesactivation ? `<span class="ad-etat is-expire">${t(`Désactivé le ${EQ.dateCourte(i.dateDesactivation)}`)}</span>`
        : expire ? '<span class="ad-etat is-expire">Expiré</span>' : '<span class="ad-etat is-libre">Libre</span>';
    return `<tr id="code-${esc(i.code)}"><td><code>${esc(i.code)}</code></td><td>${t(`${EQ.dateCourte(i.dateCreation)}${i.createur ? ` · ${i.createur.nom}` : ''}`)}</td><td>${t(i.dateExpiration ? `Jusqu’au ${EQ.dateCourte(i.dateExpiration)}` : 'Sans limite')}</td><td>${etat}</td><td class="ad-cellule-action">${i.libre ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-desactiver="${esc(i.code)}">Désactiver</button>` : ''}</td></tr>`;
  };

  function rendreInvitations(reglages) {
    const page = $('[data-eq-page]');
    const numero = numeroDePage();
    const toutes = lesInvitations(reglages);
    const pages = Math.ceil(toutes.length / INVITATIONS_PAR_PAGE);
    const elements = toutes.slice((numero - 1) * INVITATIONS_PAR_PAGE, numero * INVITATIONS_PAR_PAGE);
    const maintenant = new Date();
    page.innerHTML = `${tete(`<h1>Invitations</h1>
        <p class="md-statut"><span class="is-fort">${pluriel(toutes.filter(i => i.libre).length, 'code libre', 'codes libres')}</span><span>${fmt(toutes.length)} au total</span></p>`, 'invitations')}
      <div class="container md-file">
        <form class="ad-outils" novalidate data-ad-invitations>
          <div class="ad-champ is-court">
            <label for="ad-nombre">Nombre de codes</label>
            <input id="ad-nombre" name="nombre" type="number" inputmode="numeric" min="1" max="50" value="10" required>
          </div>
          <div class="ad-champ is-court">
            <label for="ad-jours">Valables (jours)</label>
            <input id="ad-jours" name="joursValidite" type="number" inputmode="numeric" min="1" max="365" value="30">
          </div>
          <button class="btn btn-primary" type="submit">${icon('plus')}Créer les codes</button>
          <p class="md-erreur" data-ad-erreur role="alert" hidden></p>
        </form>
        <div class="ad-codes" data-ad-codes hidden>
          <p>${t('Nouveaux codes : transmettez-en un à chaque personne invitée.')}</p>
          <ul data-ad-codes-liste></ul>
          <button class="btn btn-secondary btn-sm" type="button" data-ad-copier>${icon('copy')}Copier les codes</button>
        </div>
        ${elements.length ? `<table class="ad-table ad-invitations">
          <thead><tr><th scope="col">Code</th><th scope="col">Création</th><th scope="col">Validité</th><th scope="col">État</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${elements.map(i => ligneCode(i, maintenant)).join('')}</tbody>
        </table>` : `<p class="md-rien ad-vide">${t('Aucun code pour l’instant : créez les premiers pour inviter des membres.')}</p>`}
        ${pages > 1 ? `<nav class="md-pages" aria-label="Pages des invitations">
          ${numero > 1 ? `<a class="btn btn-secondary" href="?page=${numero - 1}">Codes plus récents</a>` : ''}
          ${numero < pages ? `<a class="btn btn-secondary" href="?page=${numero + 1}">Codes plus anciens</a>` : ''}
        </nav>` : ''}
      </div>`;
    brancherInvitations();
  }

  /** Création des codes (schemaCreationInvitations), comme scripts/administration.ts : les nouveaux
      codes s'affichent au-dessus de la liste et y prennent place en tête. */
  function brancherInvitations() {
    const formulaire = $('[data-ad-invitations]');
    const erreur = $('[data-ad-erreur]', formulaire);
    const nombre = $('#ad-nombre', formulaire);
    const jours = $('#ad-jours', formulaire);
    let codes = [];
    formulaire.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const afficher = (message = '') => { erreur.textContent = V.typo(message); erreur.hidden = !message; };
      const entier = (valeur, messages) => {
        const n = Number(valeur);
        if (Number.isNaN(n)) return messages.type;
        if (!Number.isInteger(n)) return messages.entier;
        if (n < messages.min[0]) return messages.min[1];
        if (n > messages.max[0]) return messages.max[1];
        return '';
      };
      const erreurNombre = entier(nombre.value, { type: 'Indiquez un nombre de codes.', entier: 'Indiquez un nombre entier.', min: [1, 'Créez au moins un code.'], max: [50, 'Créez 50 codes au plus à la fois.'] });
      const erreurJours = jours.value ? entier(jours.value, { type: 'Indiquez une durée en jours.', entier: 'Indiquez un nombre entier de jours.', min: [1, 'Un code reste valable au moins un jour.'], max: [365, 'Un code reste valable un an au plus.'] }) : '';
      nombre.setAttribute('aria-invalid', String(Boolean(erreurNombre)));
      jours.setAttribute('aria-invalid', String(Boolean(erreurJours)));
      if (erreurNombre || erreurJours) { afficher(erreurNombre || erreurJours); return; }
      afficher();
      const n = Number(nombre.value);
      const joursValidite = jours.value ? Number(jours.value) : null;
      const existants = new Set(lesInvitations({}).map(i => i.code));
      codes = [];
      while (codes.length < n) {
        const tirer = k => Array.from({ length: k }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
        const code = `VYS-${tirer(4)}-${tirer(2)}`;
        if (!existants.has(code) && !codes.includes(code)) codes.push(code);
      }
      const maintenant = new Date().toISOString();
      modifier(s => {
        codes.forEach(code => s.codes.push({ code, date: maintenant, joursValidite }));
        inscrire(s, 'INVITATIONS_CREEES', null, { nombre: n, joursValidite });
      });
      const zone = $('[data-ad-codes]');
      $('[data-ad-codes-liste]', zone).innerHTML = codes.map(code => `<li>${code}</li>`).join('');
      zone.hidden = false;
      const corps = $('.ad-table tbody');
      if (corps) {
        const validite = joursValidite ? `Jusqu’au ${EQ.dateCourte(new Date(Date.now() + joursValidite * 86400000))}` : 'Sans limite';
        corps.insertAdjacentHTML('afterbegin', codes.map(code => `<tr id="code-${esc(code)}"><td><code>${esc(code)}</code></td><td>${t(EQ.dateCourte(new Date()))}</td><td>${t(validite)}</td><td><span class="ad-etat is-libre">Libre</span></td><td class="ad-cellule-action"><button class="btn btn-secondary btn-sm" type="button" data-ad-desactiver="${esc(code)}">Désactiver</button></td></tr>`).join(''));
      }
      V.toast(codes.length > 1 ? `${codes.length} codes créés.` : 'Code créé.');
    });
    $('[data-ad-copier]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codes.join('\n'));
        V.toast('Codes copiés.');
      } catch {
        V.toast('La copie n’a pas abouti. Sélectionnez les codes pour les copier.', 'alert');
      }
    });
  }

  /** ADM-02 : un code libre désactivé est refusé à l'inscription ; les codes créés à l'instant aussi. */
  function suivreDesactivations() {
    document.addEventListener('click', evenement => {
      const bouton = evenement.target.closest('[data-ad-desactiver]');
      if (!bouton) return;
      const code = bouton.dataset.adDesactiver;
      confirmer(`Désactiver le code ${code} ?`,
        'Il n’est plus accepté à l’inscription, même par la personne qui l’a reçu. Cette action est définitive : pour inviter cette personne, créez-lui un nouveau code.',
        'Désactiver le code', () => {
          const invitation = lesInvitations({}).find(i => i.code === code);
          if (!invitation || !invitation.libre) {
            signalerRefus(invitation && !invitation.utilisation && !invitation.dateDesactivation ? 'Ce code a expiré : il n’est déjà plus accepté à l’inscription.' : 'Ce code d’invitation est introuvable.');
            return;
          }
          modifier(s => {
            s.desactives[code] = new Date().toISOString();
            inscrire(s, 'INVITATION_DESACTIVEE', { type: 'invitation', nom: code }, { code });
          });
          // Rechargement sur l'élément modifié (rechargerSur).
          history.replaceState(null, '', `${location.search}#code-${code}`);
          rafraichir();
          allerALElementVise();
          V.toast(`Code ${code} désactivé.`);
        }, { annuler: 'Revenir' });
    });
  }

  /** L'élément désigné par l'adresse (« #code-VYS-K7M2-Q9 ») est amené en haut de l'écran. */
  function allerALElementVise() {
    const vise = /^#[a-z]+-[\w-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    if (vise) setTimeout(() => vise.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
  }

  /* Dossier d'un membre (pages/admin/membres/[id].astro, scripts/dossier-membre.ts) ---------------- */

  function rendreMembre(reglages) {
    const page = $('[data-eq-page]');
    const membres = lesMembres();
    const demande = (parametres().get('pseudo') || 'thomas-lefevre').trim().toLowerCase();
    let m = null;
    if (reglages.dossier === 'soi') m = membres.find(x => x.moi);
    else if (reglages.dossier !== 'introuvable') m = membres.find(x => x.pseudo === demande) || (/^[a-z0-9_-]{3,30}$/.test(demande) ? repli(demande) : null);
    const ariane = courant => `<nav class="md-ariane" aria-label="Fil d’Ariane"><ol><li><a href="administration.html">Rôles de l’équipe</a></li><li><span aria-current="page">${t(courant)}</span></li></ol></nav>`;

    if (!m) {
      document.title = 'Dossier d’un membre · Vysora';
      page.innerHTML = `<div class="container md-tete">${ariane('Dossier')}<h1>Dossier d’un membre</h1>${EQ.ongletsAdministration('roles')}</div>
        <div class="container md-file"><div class="md-vide">
          <span class="md-vide-icone" aria-hidden="true">${icon('user', '')}</span>
          <h2>Ce membre est introuvable</h2>
          <p>${t('L’adresse ne correspond à aucun compte de Vysora.')}</p>
          <a class="btn btn-secondary" href="administration.html">Revenir à l’équipe</a>
        </div></div>`;
      return;
    }
    if (reglages.dossier === 'banni') m.statutCompte = 'BANNI';
    if (reglages.dossier === 'suppression') m.statutCompte = 'EN_SUPPRESSION';

    const decisions = lesDecisions(membres).filter(d => d.membreVise?.pseudo === m.pseudo || d.auteur === m.pseudo).slice(0, 50);
    const fins = decisions.filter(d => d.action === 'SUSPENDRE' && d.membreVise?.pseudo === m.pseudo && d.finSuspension && new Date(d.finSuspension) > new Date()).map(d => d.finSuspension);
    if (reglages.dossier === 'suspendu' && !fins.length) fins.push(date(-5 * 24));
    const suspension = fins.sort().pop() || null;
    const soi = Boolean(m.moi);
    const actions = soi || m.statutCompte === 'BANNI' || m.statutCompte === 'SUPPRIME' ? []
      : [...(m.statutCompte === 'ACTIF' ? ['BANNIR'] : []), 'AJUSTER_REPUTATION', ...(m.badges.length ? ['RETIRER_BADGE'] : [])];
    const statut = LIBELLES_STATUT_COMPTE[m.statutCompte];
    const reputation = m.reputation;
    const sansDecision = soi ? 'C’est votre compte : un autre administrateur prend les décisions qui vous concernent.'
      : m.statutCompte === 'BANNI' ? 'Ce compte est fermé : plus aucune décision n’est possible. Son dossier reste consultable.'
        : 'Ce compte a été supprimé : plus aucune décision n’est possible. Son dossier reste consultable.';
    document.title = `Dossier : ${m.nom} · Vysora`;

    page.innerHTML = `<div class="container md-tete">
        ${ariane(`@${m.pseudo}`)}
        <p class="md-rubrique">${icon('user')}Dossier d’un membre${statut ? `<span class="md-sep" aria-hidden="true">·</span><span class="md-etat is-masque">${statut}</span>` : ''}</p>
        <div class="md-meta">
          <div class="md-auteur ad-dossier-membre">
            ${avatar(m, 56)}
            <div><h1 class="md-titre-dossier">${t(m.nom)}</h1><span>${t(`@${m.pseudo} · ${LIBELLES_ROLE[m.role]} · ${m.niveau}`)}</span></div>
          </div>
          <div class="md-meta-actions">
            ${m.statutCompte === 'ACTIF' ? `<a class="btn btn-secondary btn-sm" href="profil.html?pseudo=${encodeURIComponent(m.pseudo)}">Voir le profil${icon('arrow-up-right')}</a>` : ''}
            ${actions.length ? '<a class="btn btn-primary btn-sm md-aller" href="#md-decision">Prendre une décision</a>' : ''}
          </div>
        </div>
        ${suspension ? `<p class="md-alerte">${icon('lock', '')}<span><b>${t(`Compte suspendu jusqu’au ${EQ.dateLongue(suspension)}.`)}</b>${t(' Le membre lit les contenus et gère ses paramètres, sans publier ni interagir.')}</span></p>` : ''}
        ${m.statutCompte === 'EN_SUPPRESSION' ? `<p class="md-alerte">${icon('info', '')}<span><b>Suppression du compte demandée.</b>${t(' Le compte sera supprimé au terme des 30 jours ; s’il se reconnecte, sa demande est annulée.')}</span></p>` : ''}
        ${EQ.ongletsAdministration('roles')}
      </div>
      <div class="container md-dossier">
        <div class="md-principal">
          <section class="md-section" aria-labelledby="ad-compte-titre">
            <h2 id="ad-compte-titre">Compte</h2>
            <ul class="md-cas-faits">
              <li>${icon('calendar')}${t(`Inscrit le ${EQ.dateLongue(m.inscritLe)}`)}</li>
              <li>${icon('trend-up')}${t(`${pluriel(Math.max(0, reputation), 'point', 'points')} de réputation`)}${reputation < 0 ? t(` (${fmt(reputation)} en tout, affichée 0 sur le site)`) : ''}</li>
              <li>${icon('shield')}${t(DEUX_FACTEURS[m.deuxFacteurs][0])}</li>
            </ul>
          </section>
          <section class="md-section" aria-labelledby="ad-badges-titre">
            <div class="md-section-tete"><h2 id="ad-badges-titre">Badges</h2>${m.badges.length ? `<p>${pluriel(m.badges.length, 'badge obtenu', 'badges obtenus')}</p>` : ''}</div>
            ${m.badges.length ? `<ul class="ad-refs">${m.badges.map(b => `<li class="ad-badge">${embleme(b)}<span class="ad-membre-corps"><span class="ad-membre-nom">${t(b.libelle)}</span><span class="ad-membre-meta"><span>${t(b.critere)}</span><span>${t(`Obtenu le ${EQ.dateCourte(b.date)}`)}</span></span></span></li>`).join('')}</ul>`
              : '<p class="md-rien">Aucun badge pour l’instant.</p>'}
          </section>
          <section class="md-section" aria-labelledby="ad-decisions-titre">
            <div class="md-section-tete"><h2 id="ad-decisions-titre">Décisions</h2><p>Décisions qui ont visé ce membre ou ses contenus</p></div>
            ${decisions.length ? `<ol class="md-fil">${decisions.map(d => ligneDecision(d, false)).join('')}</ol>` : '<p class="md-rien">Aucune décision n’a visé ce membre jusqu’ici.</p>'}
          </section>
        </div>
        <aside class="md-decision" id="md-decision" aria-labelledby="md-decision-titre">
          <h2 id="md-decision-titre">Prendre une décision</h2>
          ${actions.length ? `<form class="md-form" novalidate autocomplete="off" data-ad-dossier data-membre="${m.id}" data-reputation="${reputation}">
            <fieldset class="md-actions"><legend class="sr-only">Décision</legend>
              <div class="md-groupe" role="group" aria-label="Réservées aux administrateurs">
                <p class="md-groupe-titre" aria-hidden="true">Réservées aux administrateurs</p>
                ${actions.map(action => `<label class="md-choix"><input type="radio" name="action" value="${action}" required><span><b>${t(LIBELLES_ACTION_DECISION[action])}</b><span>${t(EFFETS_ACTION_ADMINISTRATEUR[action])}</span></span></label>`).join('')}
              </div>
            </fieldset>
            <p class="md-erreur" data-md-erreur="action" hidden></p>
            <div class="md-champ" data-ad-points hidden>
              <label for="ad-points">Points</label>
              <div class="md-duree"><input id="ad-points" name="points" type="number" inputmode="numeric" min="${-AJUSTEMENT}" max="${AJUSTEMENT}" step="1" aria-describedby="ad-points-aide ad-points-erreur"><span>points</span></div>
              <p class="md-aide" id="ad-points-aide" data-ad-points-aide>${t(`Nombre positif pour ajouter des points, négatif pour en retirer. Réputation actuelle : ${pluriel(Math.max(0, reputation), 'point', 'points')}.`)}</p>
              <p class="md-erreur" id="ad-points-erreur" data-md-erreur="points" hidden></p>
            </div>
            ${m.badges.length ? `<div class="md-champ" data-ad-badge hidden>
              <label for="ad-badge">Badge à retirer</label>
              <select id="ad-badge" name="badge" aria-describedby="ad-badge-erreur"><option value="">Choisissez un badge</option>${m.badges.map(b => `<option value="${b.code}">${t(b.libelle)}</option>`).join('')}</select>
              <p class="md-erreur" id="ad-badge-erreur" data-md-erreur="badge" hidden></p>
            </div>` : ''}
            <div class="md-champ">
              <label for="md-motif">Motif communiqué au membre</label>
              <textarea id="md-motif" name="motif" rows="5" maxlength="${MOTIF_MAX}" required aria-describedby="md-motif-aide md-motif-erreur"></textarea>
              <p class="md-aide" id="md-motif-aide"><span>${t('Envoyé au membre par e-mail et conservé avec la décision.')}</span><span class="md-compteur" data-md-compteur>0 / ${fmt(MOTIF_MAX)}</span></p>
              <p class="md-erreur" id="md-motif-erreur" data-md-erreur="motif" hidden></p>
            </div>
            <p class="md-erreur" data-md-erreur="general" role="alert" hidden></p>
            <button class="btn btn-primary md-envoyer" type="submit">Enregistrer la décision</button>
            <p class="md-note">${t('Une décision ne se modifie plus : une erreur se corrige par une nouvelle décision.')}</p>
          </form>` : `<p class="md-rien">${t(sansDecision)}</p>`}
        </aside>
      </div>`;
    if (actions.length) brancherDossier(m, membres);
  }

  /** Décisions réservées aux administrateurs (schemaDecisionAdministrateur, mêmes messages). */
  function brancherDossier(m, membres) {
    const formulaire = $('[data-ad-dossier]');
    const reputation = Number(formulaire.dataset.reputation);
    const zonePoints = $('[data-ad-points]', formulaire);
    const champPoints = $('#ad-points', formulaire);
    const aidePoints = $('[data-ad-points-aide]', formulaire);
    const aideInitiale = aidePoints.textContent;
    const zoneBadge = $('[data-ad-badge]', formulaire);
    const champBadge = $('#ad-badge', formulaire);
    const motif = $('#md-motif', formulaire);
    const compteur = $('[data-md-compteur]', formulaire);
    const action = () => $('input[name="action"]:checked', formulaire)?.value || null;
    const points = () => (champPoints.value.trim() ? Number(champPoints.value) : null);
    const CHAMPS = { action: $('input[name="action"]', formulaire), points: champPoints, badge: champBadge, motif };

    function erreur(champ, message = '') {
      const zone = $(`[data-md-erreur="${champ}"]`, formulaire);
      if (zone) { zone.textContent = V.typo(message); zone.hidden = !message; }
      if (CHAMPS[champ] && champ !== 'action') CHAMPS[champ].setAttribute('aria-invalid', String(Boolean(message)));
    }
    const effacer = () => ['action', 'points', 'badge', 'motif', 'general'].forEach(champ => erreur(champ));
    function afficher(erreurs) {
      Object.entries(erreurs).forEach(([champ, message]) => erreur(champ in CHAMPS ? champ : 'general', message));
      const premier = Object.keys(erreurs).find(champ => champ in CHAMPS);
      if (premier) CHAMPS[premier]?.focus();
    }
    function controler() {
      const erreurs = {};
      const choisie = action();
      const texte = motif.value.trim();
      const valeur = choisie === 'AJUSTER_REPUTATION' ? points() : null;
      const badgeChoisi = choisie === 'RETIRER_BADGE' ? champBadge?.value || null : null;
      if (!choisie) erreurs.action = 'Choisissez la décision.';
      if (!texte) erreurs.motif = 'Rédigez le motif communiqué à ce membre.';
      else if (texte.length > MOTIF_MAX) erreurs.motif = `Le motif compte ${fmt(MOTIF_MAX)} caractères au plus.`;
      if (choisie === 'AJUSTER_REPUTATION' && (valeur === null || !Number.isInteger(valeur) || valeur === 0 || Math.abs(valeur) > AJUSTEMENT)) erreurs.points = MESSAGE_POINTS;
      if (choisie === 'RETIRER_BADGE' && !badgeChoisi) erreurs.badge = 'Choisissez le badge à retirer.';
      return { erreurs, saisie: { action: choisie, motif: texte, points: valeur, badge: badgeChoisi } };
    }
    function suivreChoix() {
      const choisie = action();
      zonePoints.hidden = choisie !== 'AJUSTER_REPUTATION';
      if (zoneBadge) zoneBadge.hidden = choisie !== 'RETIRER_BADGE';
      if (choisie !== 'AJUSTER_REPUTATION') erreur('points');
      if (choisie !== 'RETIRER_BADGE') erreur('badge');
      if (choisie) erreur('action');
    }
    function suivrePoints() {
      const valeur = points();
      aidePoints.textContent = valeur !== null && Number.isInteger(valeur) && valeur !== 0
        ? V.typo(`Réputation après l’ajustement : ${pluriel(Math.max(0, reputation + valeur), 'point', 'points')}.`) : aideInitiale;
      erreur('points');
    }
    const suivreMotif = () => { compteur.textContent = `${fmt(motif.value.length)} / ${fmt(MOTIF_MAX)}`; erreur('motif'); };

    $$('input[name="action"]', formulaire).forEach(choix => choix.addEventListener('change', suivreChoix));
    champPoints.addEventListener('input', suivrePoints);
    champBadge?.addEventListener('change', () => erreur('badge'));
    motif.addEventListener('input', suivreMotif);

    /** confirmationDecisionMembre (lib/moderation.ts). */
    function confirmation(choisie, valeur, libelleBadge) {
      const apres = Math.max(0, reputation + (valeur || 0));
      return [
        choisie === 'BANNIR' ? 'Le compte sera fermé, ses sessions aussi.'
          : choisie === 'AJUSTER_REPUTATION'
            ? `${valeur > 0 ? pluriel(valeur, 'point sera ajouté à', 'points seront ajoutés à') : pluriel(-valeur, 'point sera retiré de', 'points seront retirés de')} sa réputation, qui passera à ${pluriel(apres, 'point', 'points')}.`
            : `Le badge « ${libelleBadge ?? ''} » sera retiré de son profil et ne lui sera plus attribué.`,
        choisie === 'BANNIR' ? 'Le membre en est informé par e-mail, avec votre motif.' : 'Le membre en est informé par e-mail et dans ses notifications, avec votre motif.',
        'La décision ne pourra plus être modifiée.'
      ].join(' ');
    }

    formulaire.addEventListener('submit', evenement => {
      evenement.preventDefault();
      effacer();
      const { erreurs, saisie } = controler();
      if (Object.keys(erreurs).length) { afficher(erreurs); return; }
      const libelleBadge = champBadge?.selectedOptions[0]?.textContent?.trim() ?? null;
      confirmer(QUESTIONS_ACTION_ADMINISTRATEUR[saisie.action], confirmation(saisie.action, saisie.points, libelleBadge), LIBELLES_ACTION_DECISION[saisie.action], () => {
        const { erreurs: encore, saisie: finale } = controler();
        if (Object.keys(encore).length) { afficher(encore); return; }
        // RG-111 : le bannissement ne laisse jamais la plateforme sans administrateur actif.
        if (finale.action === 'BANNIR' && m.role === 'ADMINISTRATEUR' && !lesMembres().some(x => x.pseudo !== m.pseudo && x.role === 'ADMINISTRATEUR' && x.statutCompte === 'ACTIF')) {
          erreur('general', 'La plateforme compte toujours au moins un administrateur actif. Rechargez la page pour voir l’état du compte.');
          return;
        }
        const badgeRetire = finale.badge ? m.badges.find(b => b.code === finale.badge) : null;
        modifier(s => s.decisions.push({
          id: 1100 + Math.floor(Math.random() * 8900), pseudo: m.pseudo, action: finale.action, motif: finale.motif, date: new Date().toISOString(),
          points: finale.points, badge: badgeRetire ? { code: badgeRetire.code, libelle: badgeRetire.libelle } : null
        }));
        rafraichir();
        window.scrollTo({ top: 0 });
        V.toast('Décision enregistrée. Le membre en est informé par e-mail.');
      }, { danger: saisie.action === 'BANNIR' });
    });
    suivreChoix();
    suivreMotif();
  }

  /* Journal des décisions (pages/admin/decisions.astro) --------------------------------------------- */

  const jourValide = valeur => (/^\d{4}-\d{2}-\d{2}$/.test(valeur || '') ? valeur : '');
  const dansLaPeriode = (valeur, du, au) => {
    const instant = new Date(valeur);
    if (du && instant < new Date(`${du}T00:00:00Z`)) return false;
    if (au) { const fin = new Date(`${au}T00:00:00Z`); fin.setUTCDate(fin.getUTCDate() + 1); if (instant >= fin) return false; }
    return true;
  };
  const pagination = (numero, pages, requete, etiquette, recents, anciens) => (pages > 1 ? `<nav class="md-pages" aria-label="${etiquette}">
      ${numero > 1 ? `<a class="btn btn-secondary" href="?${requete(numero - 1)}">${recents}</a>` : ''}
      ${numero < pages ? `<a class="btn btn-secondary" href="?${requete(numero + 1)}">${anciens}</a>` : ''}
    </nav>` : '');
  const requeteDe = filtres => n => {
    const p = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
    if (n > 1) p.set('page', String(n));
    return p.toString();
  };

  function rendreDecisions(reglages) {
    const page = $('[data-eq-page]');
    const p = parametres();
    const filtres = {
      moderateur: (p.get('moderateur') || '').trim().slice(0, 40),
      membre: (p.get('membre') || '').trim().slice(0, 40),
      action: ACTIONS_DECISION.includes(p.get('action')) ? p.get('action') : '',
      du: jourValide(p.get('du')),
      au: jourValide(p.get('au'))
    };
    const filtre = Object.values(filtres).some(Boolean);
    const numero = numeroDePage();
    const requete = requeteDe(filtres);
    const liste = (reglages.journal === 'vide' ? [] : lesDecisions(lesMembres())).filter(d =>
      (!filtres.moderateur || d.decideur.pseudo === pseudoDe(filtres.moderateur))
      && (!filtres.membre || d.membreVise?.pseudo === pseudoDe(filtres.membre) || d.auteur === pseudoDe(filtres.membre))
      && (!filtres.action || d.action === filtres.action)
      && dansLaPeriode(d.date, filtres.du, filtres.au));
    const elements = liste.slice((numero - 1) * PAR_PAGE, numero * PAR_PAGE);

    page.innerHTML = `${tete(`<h1>Journal des décisions</h1>
        <p class="md-statut"><span class="is-fort">${liste.length ? pluriel(liste.length, 'décision', 'décisions') : 'Aucune décision'}${filtre ? ' pour ces filtres' : ''}</span><span>${t('Une décision ne se modifie pas : une erreur se corrige par une nouvelle décision.')}</span></p>`, 'decisions')}
      <div class="container md-file">
        <form class="ad-outils" method="get">
          <div class="ad-champ"><label for="ad-moderateur">Modérateur</label><input id="ad-moderateur" name="moderateur" value="${esc(filtres.moderateur)}" placeholder="Pseudo" maxlength="40" autocomplete="off"></div>
          <div class="ad-champ"><label for="ad-membre">Membre</label><input id="ad-membre" name="membre" value="${esc(filtres.membre)}" placeholder="Pseudo" maxlength="40" autocomplete="off"></div>
          <div class="ad-champ"><label for="ad-action">Action</label><select id="ad-action" name="action"><option value="">Toutes</option>${ACTIONS_DECISION.map(action => `<option value="${action}"${action === filtres.action ? ' selected' : ''}>${t(LIBELLES_ACTION_DECISION[action])}</option>`).join('')}</select></div>
          <div class="ad-champ"><label for="ad-du">Du</label><input id="ad-du" name="du" type="date" value="${filtres.du}"></div>
          <div class="ad-champ"><label for="ad-au">Au</label><input id="ad-au" name="au" type="date" value="${filtres.au}"></div>
          <button class="btn btn-primary" type="submit">Filtrer</button>
          ${filtre ? '<a class="btn btn-secondary" href="administration-decisions.html">Effacer les filtres</a>' : ''}
        </form>
        ${elements.length ? `<ol class="md-fil">${elements.map(d => ligneDecision(d, true)).join('')}</ol>`
          : `<p class="md-rien ad-vide">${t(filtre ? 'Aucune décision ne correspond à ces filtres.' : 'Aucune décision de modération pour l’instant.')}</p>`}
        ${pagination(numero, Math.ceil(liste.length / PAR_PAGE), requete, 'Pages du journal', 'Décisions plus récentes', 'Décisions plus anciennes')}
      </div>`;
  }

  /* Journal d'audit (pages/admin/journal-audit.astro, lib/administration.ts) ----------------------- */

  const texteDe = valeur => (typeof valeur === 'string' ? valeur : null);
  const nombreDe = valeur => (typeof valeur === 'number' ? valeur : null);
  const listeDe = valeur => (Array.isArray(valeur) ? valeur.filter(v => typeof v === 'string') : []);

  /** Nom de l'élément visé ; null pour des codes d'invitation créés ou un membre (présenté à part). */
  function cibleAudit({ cible, details }) {
    if (!cible || cible.type === 'utilisateur') return null;
    if (cible.type === 'document_legal') {
      const type = texteDe(details?.type);
      const version = texteDe(details?.version);
      if (!type || !TITRES_DOCUMENTS[type]) return null;
      return version && /^\d{4}-\d{2}-\d{2}$/.test(version) ? `${TITRES_DOCUMENTS[type]}, version du ${EQ.dateLongue(version)}` : TITRES_DOCUMENTS[type];
    }
    return cible.nom ?? texteDe(details?.libelle) ?? texteDe(details?.nom) ?? texteDe(details?.code) ?? 'Élément supprimé depuis';
  }

  /** Ce que l'action a changé, en clair, ou une chaîne vide. */
  function precisionAudit({ action, details: d }) {
    switch (action) {
      case 'ROLE_MODIFIE': {
        const avant = texteDe(d?.avant);
        const apres = texteDe(d?.apres);
        return avant && apres && LIBELLES_ROLE[avant] && LIBELLES_ROLE[apres] ? `${LIBELLES_ROLE[avant]} → ${LIBELLES_ROLE[apres]}` : '';
      }
      case 'MEMBRE_EQUIPE_AJOUTE':
      case 'ACTIVATION_RENVOYEE': {
        const role = texteDe(d?.role);
        return role && LIBELLES_ROLE[role] ? `Rôle : ${LIBELLES_ROLE[role]}` : '';
      }
      case 'INVITATIONS_CREEES': {
        const nombre = nombreDe(d?.nombre) ?? 0;
        const jours = nombreDe(d?.joursValidite);
        return `${pluriel(nombre, 'code', 'codes')}, ${jours ? `${nombre > 1 ? 'valables' : 'valable'} ${pluriel(jours, 'jour', 'jours')}` : 'sans limite de validité'}`;
      }
      case 'DEFI_CLOTURE': {
        const participants = nombreDe(d?.participants);
        return participants === null ? '' : pluriel(participants, 'participant', 'participants');
      }
      case 'GUIDE_CONTENU_AJOUTE':
      case 'GUIDE_CONTENU_RETIRE': {
        const type = texteDe(d?.type);
        const titre = texteDe(d?.titre);
        return type && titre ? `${type.charAt(0).toUpperCase()}${type.slice(1)} « ${titre} »` : '';
      }
      case 'PIEGE_RETENU':
      case 'PIEGE_ECARTE': {
        const guide = texteDe(d?.guide);
        return guide ? `Guide « ${guide} »` : '';
      }
      case 'LICENCE_PAR_DEFAUT': {
        const avant = texteDe(d?.avant);
        return avant ? `Auparavant : ${avant}` : '';
      }
      case 'EDITEUR_RENOMME': {
        const avant = texteDe(d?.avant);
        const apres = texteDe(d?.apres);
        return avant && apres ? `${avant} → ${apres}` : '';
      }
      case 'EDITEUR_ARCHIVE': {
        const outils = listeDe(d?.outils).length;
        const modeles = listeDe(d?.modeles).length;
        return [outils ? pluriel(outils, 'outil archivé', 'outils archivés') : '', modeles ? pluriel(modeles, 'modèle retiré', 'modèles retirés') : ''].filter(Boolean).join(', ');
      }
      case 'SAVOIR_ILLUSTRATION_AJOUTEE':
      case 'SAVOIR_ILLUSTRATION_RETIREE':
      case 'SAVOIR_SUJET_LIE':
      case 'SAVOIR_SUJET_RETIRE': {
        const id = texteDe(d?.savoir);
        return id ? `Savoir « ${D.savoirs[id] || id} »` : '';
      }
      case 'CATEGORIES_ORDONNEES':
      case 'LICENCES_ORDONNEES': {
        const ordre = listeDe(d?.ordre);
        return `${ordre.slice(0, 5).join(', ')}${ordre.length > 5 ? '…' : ''}`;
      }
      default:
        return '';
    }
  }

  /** « 31 octobre 2026 à 9 h 05 UTC » : les filtres de période se lisent aussi en temps universel. */
  const quand = valeur => {
    const d = new Date(valeur);
    return `${EQ.dateLongue(d)} à ${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  };

  function rendreAudit(reglages) {
    const page = $('[data-eq-page]');
    const p = parametres();
    const filtres = {
      domaine: ACTIONS_AUDIT[p.get('domaine')] ? p.get('domaine') : '',
      acteur: (p.get('acteur') || '').trim().slice(0, 40),
      du: jourValide(p.get('du')),
      au: jourValide(p.get('au'))
    };
    const filtre = Object.values(filtres).some(Boolean);
    const numero = numeroDePage();
    const requete = requeteDe(filtres);
    const membres = lesMembres();
    const parPseudo = Object.fromEntries(membres.map(m => [m.pseudo, m]));
    const qui = pseudo => parPseudo[pseudo] || { pseudo, nom: pseudo, avatar: null };
    const s = simulation();
    const liste = (reglages.journal === 'vide' ? [] : [...D.audit.map(e => ({ ...e, date: date(e.ilYa) })), ...s.audit])
      .map(e => ({ ...e, acteur: e.acteur ? qui(e.acteur) : null, cible: e.cible ? (e.cible.membre ? { type: 'utilisateur', membre: qui(e.cible.membre) } : { type: e.cible.type, nom: e.cible.nom ?? null, membre: null }) : null }))
      .filter(e => (!filtres.domaine || ACTIONS_AUDIT[filtres.domaine].includes(e.action))
        && (!filtres.acteur || e.acteur?.pseudo === pseudoDe(filtres.acteur))
        && dansLaPeriode(e.date, filtres.du, filtres.au))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const elements = liste.slice((numero - 1) * PAR_PAGE, numero * PAR_PAGE);

    const ligne = e => {
      const cible = cibleAudit(e);
      const precision = precisionAudit(e);
      return `<li class="md-ligne">
        ${e.acteur ? avatar(e.acteur, 32) : `<span class="md-ligne-icone" aria-hidden="true">${icon('history')}</span>`}
        <div class="md-ligne-corps">
          <p class="md-ligne-haut"><b>${t(LIBELLES_ACTION_AUDIT[e.action] ?? e.action)}</b><span>${t(`Par ${e.acteur?.nom ?? (e.details?.origine === 'serveur' ? 'une commande sur le serveur' : 'un compte supprimé')}, le ${quand(e.date)}`)}</span></p>
          ${e.cible?.membre ? `<p class="md-ligne-sur">Membre : <a href="${dossierMembre(e.cible.membre.pseudo)}">${t(`${e.cible.membre.nom} (@${e.cible.membre.pseudo})`)}</a></p>` : cible ? `<p class="md-ligne-sur">${t(cible)}</p>` : ''}
          ${precision ? `<p class="md-ligne-texte">${t(precision)}</p>` : ''}
        </div>
      </li>`;
    };

    page.innerHTML = `${tete(`<h1>Journal d’audit</h1>
        <p class="md-statut"><span class="is-fort">${liste.length ? pluriel(liste.length, 'action', 'actions') : 'Aucune action'}${filtre ? ' pour ces filtres' : ''}</span><span>${t('Rôles, invitations, référentiels, documents légaux et défis. Les décisions de modération ont leur propre journal.')}</span></p>`, 'audit')}
      <div class="container md-file">
        <form class="ad-outils" method="get">
          <div class="ad-champ"><label for="ad-domaine">Domaine</label><select id="ad-domaine" name="domaine"><option value="">Tous</option>${Object.keys(ACTIONS_AUDIT).map(domaine => `<option value="${domaine}"${domaine === filtres.domaine ? ' selected' : ''}>${LIBELLES_DOMAINE_AUDIT[domaine]}</option>`).join('')}</select></div>
          <div class="ad-champ"><label for="ad-acteur">Auteur</label><input id="ad-acteur" name="acteur" value="${esc(filtres.acteur)}" placeholder="Pseudo" maxlength="40" autocomplete="off"></div>
          <div class="ad-champ"><label for="ad-du">Du</label><input id="ad-du" name="du" type="date" value="${filtres.du}"></div>
          <div class="ad-champ"><label for="ad-au">Au</label><input id="ad-au" name="au" type="date" value="${filtres.au}"></div>
          <button class="btn btn-primary" type="submit">Filtrer</button>
          ${filtre ? '<a class="btn btn-secondary" href="administration-journal-audit.html">Effacer les filtres</a>' : ''}
        </form>
        ${elements.length ? `<ol class="md-fil">${elements.map(ligne).join('')}</ol>`
          : `<p class="md-rien ad-vide">${t(filtre ? 'Aucune action ne correspond à ces filtres.' : 'Aucune action d’administration pour l’instant.')}</p>`}
        ${pagination(numero, Math.ceil(liste.length / PAR_PAGE), requete, 'Pages du journal', 'Actions plus récentes', 'Actions plus anciennes')}
      </div>`;
  }

  /* Montage ------------------------------------------------------------------------------------------ */

  const VUES = {
    roles: {
      rendre: rendreRoles, titre: 'Rôles de l’équipe · Vysora', quoi: 'gérer les rôles de l’équipe',
      etats: [{ name: 'equipe', legend: 'Administrateurs', options: [['deux', 'Deux administrateurs actifs'], ['seul', 'Un seul administrateur actif']] }],
      defaults: { equipe: 'deux' }
    },
    invitations: {
      rendre: rendreInvitations, titre: 'Invitations · Vysora', quoi: 'gérer les invitations',
      etats: [{ name: 'codes', legend: 'Codes', options: [['crees', 'Codes créés'], ['aucun', 'Aucun code']] }],
      defaults: { codes: 'crees' }
    },
    membre: {
      rendre: rendreMembre, titre: 'Dossier d’un membre · Vysora', quoi: 'consulter le dossier d’un membre',
      etats: [{ name: 'dossier', legend: 'Dossier', options: [['demande', 'Membre demandé'], ['suspendu', 'Compte suspendu'], ['suppression', 'Suppression demandée'], ['banni', 'Compte banni'], ['soi', 'Votre propre compte'], ['introuvable', 'Membre introuvable']] }],
      defaults: { dossier: 'demande' }
    },
    decisions: {
      rendre: rendreDecisions, titre: 'Journal des décisions · Vysora', quoi: 'consulter le journal des décisions',
      etats: [{ name: 'journal', legend: 'Journal', options: [['rempli', 'Décisions enregistrées'], ['vide', 'Aucune décision']] }],
      defaults: { journal: 'rempli' }
    },
    audit: {
      rendre: rendreAudit, titre: 'Journal d’audit · Vysora', quoi: 'consulter le journal d’audit',
      etats: [{ name: 'journal', legend: 'Journal', options: [['rempli', 'Actions enregistrées'], ['vide', 'Aucune action']] }],
      defaults: { journal: 'rempli' }
    }
  };
  const config = VUES[vue];
  let reglages = {};
  let majPage = () => {};
  const rafraichir = () => majPage();
  V.initHeader();
  reglages = V.initTweaks({
    key: `vysora-administration-${vue}-reglages`,
    etats: config.etats,
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: config.defaults,
    onChange: (change, suivant) => {
      reglages = suivant;
      // « Revenir à l'état initial » (onglet États) efface aussi les changements simulés.
      if (change === 'reset' && $('#tw-etats') && !$('#tw-etats').hidden) effacerSimulation();
      // Rôles : l'état choisi l'emporte sur un rôle de Sophie Laurent changé auparavant dans la liste.
      if (change === 'equipe') modifier(s => { delete s.roles['sophie-laurent']; });
      if (change !== 'init') majPage();
    }
  }) || {};
  majPage = EQ.monter({ action: 'administrer', quoi: config.quoi, titre: config.titre, rendre: () => config.rendre(reglages) });
  if (vue === 'invitations') { suivreDesactivations(); allerALElementVise(); }
  document.body.classList.add('is-ready');
})();
