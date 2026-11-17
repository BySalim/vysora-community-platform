'use strict';

/* Référentiels de l'administration (ADM-02, EC-22, F-95, RG-110) : outils et modèles d'IA, éditeurs,
   catégories et licences avec leur ordre d'affichage, étiquettes et badges. Démo des écrans du site
   (apps/web/src/pages/admin/referentiels/, components/ReferentielsAdmin.astro, OrdreReferentiel.astro,
   ChampsCategorie.astro, scripts/referentiels.ts, scripts/commun/administration.ts) : mêmes balisage,
   classes (moderation.css, moderation-complements.css) et textes ; données simulées dans
   administration-referentiels-data.js. Les contrôles des saisies sont ceux des schémas du paquet
   partagé, avec leurs messages ; les refus de l'API (nom déjà pris, éditeur archivé…) sont simulés.
   Chaque changement se confirme, puis la page se « recharge » sur l'élément concerné ; il est gardé
   pour la session du navigateur (« Revenir à l'état initial » du panneau Tweaks l'efface).
   États dans le panneau Tweaks : réponse du serveur (changements enregistrés ou échec de l'envoi) ;
   étiquettes : liste remplie ou vide.
   Expose window.AdminReferentiels, repris par administration-documents-legaux.js. */

window.AdminReferentiels = (() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_ADMIN_REFERENTIELS;
  const { $, $$, t, fmt, esc, icon } = V;
  const vue = document.body.dataset.adVue;

  /* État simulé, gardé pour la session du navigateur ---------------------------------------------- */

  const CLE = 'vysora-admin-referentiels';
  const depart = () => JSON.parse(JSON.stringify({
    version: D.version, editeurs: D.editeurs, outils: D.outils, modeles: D.modeles, categories: D.categories,
    licences: D.licences, etiquettes: D.etiquettes, badges: D.badges, documents: D.documents, saisies: D.saisiesLibres || []
  }));
  function lire() {
    try {
      const garde = JSON.parse(sessionStorage.getItem(CLE));
      if (garde && garde.version === D.version) return garde;
    } catch { /* stockage indisponible */ }
    return depart();
  }
  let etat = lire();
  const garder = () => { try { sessionStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible */ } };
  const oublier = () => { try { sessionStorage.removeItem(CLE); } catch { /* stockage indisponible */ } etat = depart(); };
  const suivant = liste => Math.max(0, ...liste.map(e => e.id)) + 1;

  /* Textes et dates (lib/texte.ts) ----------------------------------------------------------------- */

  const pluriel = EQ.pluriel;
  const jour = valeur => (/^\d{4}-\d{2}-\d{2}$/.test(valeur) ? new Date(`${valeur}T12:00:00`) : new Date(valeur));
  /** « 12 novembre 2026 ». */
  const dateLongue = valeur => EQ.dateLongue(jour(valeur));
  /** « 12 nov. 2026 » : le site donne toujours l'année. */
  const dateCourte = valeur => { const d = jour(valeur); const texte = EQ.dateCourte(d); return /\d{4}$/.test(texte) ? texte : `${texte} ${d.getFullYear()}`; };
  const aujourdhui = () => D.jourIso(new Date());
  /** @vysora/shared, slugifier. */
  const slugifier = (texte, max = 80) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
  const parNom = (a, b) => a.localeCompare(b, 'fr');
  const texte = valeur => (typeof valeur === 'string' ? valeur.trim() : '');

  /* Outils communs (scripts/commun/administration.ts) ---------------------------------------------- */

  let reglages = {};
  let majPage = null;
  const ECHEC_AJOUT = 'L’ajout n’a pas abouti. Réessayez dans un instant.';
  const ECHEC_MODIFICATION = 'La modification n’a pas abouti. Réessayez dans un instant.';
  /** Réponse simulée de l'API, après un court délai. */
  const attendre = () => new Promise(fin => setTimeout(fin, 250));
  const enEchec = () => reglages.envoi === 'echec';

  /** Fenêtre de confirmation des écrans d'administration (« Revenir » ou le libellé de l'action). */
  function confirmer(titre, texteFenetre, libelle, action) {
    EQ.confirmer({ titre, texte: texteFenetre, libelle, annuler: 'Revenir', action });
  }

  /** Erreurs d'un formulaire, chacune sous son champ (`data-ad-erreur`), « general » en dernier. */
  function afficherErreurs(formulaire, erreurs) {
    $$('[data-ad-erreur]', formulaire).forEach(zone => {
      const message = erreurs[zone.dataset.adErreur] || '';
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      const champ = zone.closest('.ad-champ')?.querySelector('input, select, textarea');
      if (champ) champ.setAttribute('aria-invalid', String(Boolean(message)));
    });
  }

  /** Envoi d'un formulaire validé : `traiter()` rend l'élément enregistré, ou `{ erreurs }` pour un
      refus de l'API (sous les champs qu'elle désigne, sinon sous le formulaire). */
  async function envoyer(formulaire, traiter, echec = ECHEC_AJOUT) {
    afficherErreurs(formulaire, {});
    const bouton = $('button[type="submit"]', formulaire);
    if (bouton) bouton.disabled = true;
    await attendre();
    if (bouton) bouton.disabled = false;
    if (enEchec()) { afficherErreurs(formulaire, { general: echec }); return null; }
    const resultat = traiter();
    if (resultat && resultat.erreurs) { afficherErreurs(formulaire, resultat.erreurs); return null; }
    garder();
    return resultat;
  }

  /** Changement par un bouton : `traiter()` rend un message de refus (409) ou rien. */
  async function changer(bouton, traiter) {
    bouton.disabled = true;
    await attendre();
    bouton.disabled = false;
    if (enEchec()) { V.toast(ECHEC_MODIFICATION, 'alert'); return false; }
    const refus = traiter();
    if (typeof refus === 'string') { V.toast(refus, 'alert'); return false; }
    garder();
    return true;
  }

  /** Au chargement, l'élément désigné par l'adresse (« #outil-12 », « #ordre-categories ») est ouvert
      et amené en haut de l'écran. */
  function allerALElementVise() {
    const vise = /^#[a-z]+-[\w-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    if (!vise) return;
    if (vise instanceof HTMLDetailsElement) vise.open = true;
    setTimeout(() => vise.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
  }

  /** Après un changement, la page se « recharge » sur l'élément concerné (ouvert s'il se déplie). */
  function rechargerSur(ancre, message) {
    history.replaceState(null, '', `${location.search}#${ancre}`);
    if (majPage) majPage();
    allerALElementVise();
    V.toast(message);
  }

  const ENVOI = { name: 'envoi', legend: 'Réponse du serveur', options: [['abouti', 'Changements enregistrés'], ['echec', 'Échec de l’envoi']] };

  /** Monte une page de l'administration : panneau Tweaks, accès réservé, rendu. */
  function monter({ cle, quoi, titre, etats = [], defauts = {}, rendre }) {
    V.initHeader();
    reglages = V.initTweaks({
      key: cle,
      etats: [...etats, ENVOI],
      apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
      defaults: { ...defauts, envoi: 'abouti' },
      onChange: (change, valeurs) => {
        reglages = valeurs;
        // « Revenir à l'état initial » (onglet États) efface aussi les changements simulés.
        if (change === 'reset' && V.store.get('vysora-tweaks-onglet', 'etats') === 'etats') oublier();
        if (change !== 'init' && majPage) majPage();
      }
    }) || {};
    majPage = EQ.monter({ action: 'administrer', quoi, titre, rendre: () => rendre(reglages) });
    allerALElementVise();
    document.body.classList.add('is-ready');
  }

  /* Libellés (lib/administration.ts, lib/publier/donnees.ts, @vysora/shared) ----------------------- */

  const TYPES_OUTIL = [
    ['ASSISTANT_CONVERSATIONNEL', 'Assistant conversationnel'], ['EDITEUR_CODE', 'Éditeur de code'], ['AGENT_CODE', 'Agent de code'],
    ['CONSTRUCTEUR_APPLICATION', 'Constructeur d’applications'], ['GENERATEUR_IMAGE', 'Générateur d’images'],
    ['GENERATEUR_VIDEO', 'Générateur de vidéos'], ['GENERATEUR_AUDIO', 'Générateur audio'], ['AUTRE', 'Autre']
  ];
  const LIBELLE_TYPE = Object.fromEntries(TYPES_OUTIL);
  const FAMILLES = [['ASSISTANT', 'Assistants'], ['IMAGE', 'Image'], ['VIDEO', 'Vidéo'], ['AUDIO', 'Audio'], ['CODE', 'Code'], ['AUTOMATISATION', 'Automatisation']];
  const ICONES_CATEGORIE = [
    ['browser', 'Navigateur'], ['image', 'Image'], ['pen', 'Stylo'], ['code', 'Code'], ['flow', 'Enchaînement'], ['chart', 'Graphique'],
    ['film', 'Film'], ['music', 'Musique'], ['school', 'École'], ['shapes', 'Formes'], ['book', 'Livre'], ['box', 'Boîte'],
    ['camera', 'Appareil photo'], ['compass', 'Boussole'], ['doc', 'Document'], ['globe', 'Globe'], ['grid', 'Grille'], ['heart', 'Cœur'],
    ['layers', 'Calques'], ['mail', 'Enveloppe'], ['message', 'Bulle de dialogue'], ['monitor', 'Écran'], ['phone', 'Téléphone'],
    ['scale', 'Balance'], ['sparkle', 'Étincelle'], ['tableur', 'Tableur'], ['terminal', 'Terminal'], ['users', 'Personnes'], ['wrench', 'Clé à molette']
  ];
  const CATEGORIES_BADGE = [['CONTRIBUTION', 'Contribution'], ['APPRENTISSAGE', 'Apprentissage'], ['COMMUNAUTE', 'Communauté']];

  /* Gabarit des référentiels (ReferentielsAdmin.astro) --------------------------------------------- */

  const SOUS_ONGLETS = [
    ['outils', 'Outils et modèles', 'administration-referentiels.html'],
    ['editeurs', 'Éditeurs', 'administration-editeurs.html'],
    ['categories', 'Catégories', 'administration-categories.html'],
    ['licences', 'Licences', 'administration-licences.html'],
    ['etiquettes', 'Étiquettes', 'administration-etiquettes.html'],
    ['badges', 'Badges', 'administration-badges.html']
  ];
  const gabarit = (actif, statut, corps) => `<div class="container md-tete">
      <p class="md-rubrique">${icon('shield')}Administration</p>
      <h1>Référentiels</h1>
      ${statut}
      ${EQ.ongletsAdministration('referentiels')}
      <nav class="ad-sous-onglets" aria-label="Référentiels">${SOUS_ONGLETS.map(([cle, libelle, href]) => `<a href="${href}"${cle === actif ? ' aria-current="page"' : ''}>${libelle}</a>`).join('')}</nav>
    </div>
    <div class="container md-file">${corps}</div>`;
  const statutHTML = parties => `<p class="md-statut">${parties.filter(Boolean).join('')}</p>`;
  const erreurHTML = champ => `<p class="md-erreur" data-ad-erreur="${champ}"${champ === 'general' ? ' role="alert"' : ''} hidden></p>`;
  const chevron = icon('chevron-down', 'icon-sm ad-ref-chevron');
  const plus = icon('plus');
  const page = () => $('[data-eq-page]');

  /* Outils et modèles d'IA ------------------------------------------------------------------------ */

  const editeurDe = id => etat.editeurs.find(e => e.id === id);
  /** OutilAdministreApi : l'outil, son éditeur et ses modèles. */
  const outilAdministre = o => {
    const e = editeurDe(o.editeurId);
    return { ...o, editeur: e.nom, editeurActif: e.actif, modeles: o.modeles.map(id => etat.modeles.find(m => m.id === id)) };
  };
  /** Outils par famille, les familles vides omises ; dans une famille, les outils proposés d'abord,
      puis les archivés, chacun par ordre alphabétique (parFamille). */
  const parFamille = outils => FAMILLES.map(([id, libelle]) => ({
    id, libelle,
    outils: outils.filter(o => o.famille === id).sort((a, b) => (a.statut === 'ACTIF' ? 0 : 1) - (b.statut === 'ACTIF' ? 0 : 1) || parNom(a.nom, b.nom))
  })).filter(f => f.outils.length);
  const SAISIES = 'les nouvelles créations, les sujets du forum, les cas et les essais';
  const editeurArchive = nom => `L’éditeur « ${nom} » est archivé : proposez-le de nouveau d’abord, depuis l’onglet Éditeurs.`;

  function rendreOutils() {
    const outils = etat.outils.map(outilAdministre);
    const archives = outils.filter(o => o.statut === 'ARCHIVE').length;
    const citations = n => (n ? `Cité dans ${pluriel(n, 'contenu', 'contenus')}` : 'Cité dans aucun contenu');
    const proposes = o => { const n = o.modeles.filter(m => m.statut === 'DISPONIBLE').length; return n ? pluriel(n, 'modèle proposé', 'modèles proposés') : 'Aucun modèle proposé'; };
    const connus = [...new Set(outils.filter(o => o.editeurActif).map(o => o.editeur))].sort(parNom);
    const logo = o => (o.logo
      ? `<img class="ad-ref-logo${o.logoMonochrome ? ' is-mono' : ''}" src="assets/logos-ia/${o.logo}.svg" alt="" width="28" height="28">`
      : `<span class="ad-ref-logo is-vide" aria-hidden="true">${esc(o.nom.slice(0, 1))}</span>`);
    const modeleLigne = (o, m) => `<tr>
        <td><b>${t(m.nom)}</b></td>
        <td data-libelle="Nom court">${t(m.nomCourt)}</td>
        <td data-libelle="Sortie">${m.dateSortie ? dateCourte(m.dateSortie) : 'Non précisée'}</td>
        <td><span class="ad-etat ${m.statut === 'DISPONIBLE' ? 'is-libre' : 'is-expire'}">${m.statut === 'DISPONIBLE' ? 'Proposé' : 'Retiré'}</span></td>
        <td><div class="ad-actions-defi"${o.editeurActif ? '' : ' hidden'}><button class="btn btn-secondary btn-sm" type="button" data-ad-modele="${m.id}" data-ad-outil="${o.id}" data-statut="${m.statut === 'DISPONIBLE' ? 'RETIRE' : 'DISPONIBLE'}" data-nom="${esc(m.nom)}">${m.statut === 'DISPONIBLE' ? 'Retirer' : 'Proposer de nouveau'}</button></div></td>
      </tr>`;
    const outilItem = o => `<li>
        <details class="ad-ref${o.statut === 'ARCHIVE' ? ' is-archive' : ''}" id="outil-${o.id}">
          <summary>
            ${logo(o)}
            <span class="ad-membre-corps">
              <span class="ad-membre-nom">${t(o.nom)}</span>
              <span class="ad-membre-meta"><span>${t(o.editeurActif ? o.editeur : `${o.editeur} (éditeur archivé)`)}</span><span>${proposes(o)}</span><span>${citations(o.utilisations)}</span></span>
            </span>
            ${o.statut === 'ARCHIVE' ? '<span class="ad-etat is-expire">Archivé</span>' : ''}
            ${chevron}
          </summary>
          <div class="ad-ref-corps">
            ${o.modeles.length ? `<table class="ad-table">
              <caption class="sr-only">${t(`Modèles de ${o.nom}`)}</caption>
              <thead><tr><th scope="col">Modèle</th><th scope="col">Nom court</th><th scope="col">Sortie</th><th scope="col">État</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>${o.modeles.map(m => modeleLigne(o, m)).join('')}</tbody>
            </table>` : `<p class="md-rien">${t('Aucun modèle n’est encore proposé avec cet outil.')}</p>`}
            <form class="ad-outils ad-modele" novalidate data-ad-modele-form="${o.id}"${o.editeurActif ? '' : ' hidden'}>
              <div class="ad-champ is-large">
                <label for="ad-modele-nom-${o.id}">Nouveau modèle, nom complet</label>
                <input id="ad-modele-nom-${o.id}" name="nom" maxlength="100" required>
                ${erreurHTML('nom')}
              </div>
              <div class="ad-champ">
                <label for="ad-modele-court-${o.id}">Nom court</label>
                <input id="ad-modele-court-${o.id}" name="nomCourt" maxlength="60" required>
                ${erreurHTML('nomCourt')}
              </div>
              <div class="ad-champ">
                <label for="ad-modele-sortie-${o.id}">Sortie (facultatif)</label>
                <input id="ad-modele-sortie-${o.id}" name="dateSortie" type="date">
                ${erreurHTML('dateSortie')}
              </div>
              <button class="btn btn-secondary" type="submit">${plus}Ajouter le modèle</button>
              ${erreurHTML('general')}
            </form>
            <div class="ad-ref-pied">
              <p>${t(`Type : ${LIBELLE_TYPE[o.type]}`)}</p>
              ${o.editeurActif
                ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-outil-statut="${o.id}" data-statut="${o.statut === 'ACTIF' ? 'ARCHIVE' : 'ACTIF'}" data-nom="${esc(o.nom)}" data-utilisations="${o.utilisations}">${o.statut === 'ACTIF' ? 'Archiver l’outil' : 'Proposer de nouveau l’outil'}</button>`
                : `<a class="ad-lien" href="administration-editeurs.html#editeur-${o.editeurId}">${t(`Éditeur archivé : proposez de nouveau ${o.editeur} d’abord`)}</a>`}
            </div>
          </div>
        </details>
      </li>`;

    /* Modèles écrits en texte libre par les membres (RG-14) : on les ajoute à leur outil pour les
       proposer à tous, ou on ignore une faute de frappe. */
    const saisies = (etat.saisies || []).slice().sort((a, b) => b.contenus - a.contenus);
    const saisiesHTML = saisies.length ? `<section class="ad-famille ad-saisies" id="saisies" aria-labelledby="ad-saisies-titre">
        <h2 id="ad-saisies-titre">Modèles saisis par les membres<span class="ad-famille-nb">${fmt(saisies.length)}</span></h2>
        <p class="ad-famille-aide">${t('Absents du référentiel, ils ont été écrits en texte libre. Ajoutez un modèle à son outil pour le proposer à tous, ou ignorez une faute de frappe : les contenus l’affichent toujours tel qu’il a été saisi.')}</p>
        <table class="ad-table">
          <caption class="sr-only">Modèles saisis par les membres</caption>
          <thead><tr><th scope="col">Saisie</th><th scope="col">Outil</th><th scope="col">Contenus</th><th scope="col">Dernière saisie</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${saisies.map(x => `<tr id="saisie-${x.id}">
            <td><b>${t(`« ${x.texte} »`)}</b></td>
            <td data-libelle="Outil">${t(x.outil)}</td>
            <td data-libelle="Contenus">${fmt(x.contenus)}</td>
            <td data-libelle="Dernière saisie">${dateCourte(x.derniere)}</td>
            <td class="ad-cellule-action"><div class="ad-actions-defi"><button class="btn btn-secondary btn-sm" type="button" data-ad-saisie-ajouter="${x.id}">${plus}Ajouter à ${t(x.outil)}</button><button class="btn btn-quiet btn-sm" type="button" data-ad-saisie-ignorer="${x.id}" data-nom="${esc(x.texte)}">Ignorer</button></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>` : '';
    page().innerHTML = gabarit('outils', statutHTML([
      `<span class="is-fort">${pluriel(outils.length - archives, 'outil proposé', 'outils proposés')}</span>`,
      archives ? `<span>${pluriel(archives, 'outil archivé', 'outils archivés')}</span>` : '',
      saisies.length ? `<a class="ad-lien" href="#saisies">${t(pluriel(saisies.length, 'modèle saisi par les membres', 'modèles saisis par les membres'))}</a>` : '',
      `<span>${t('Un outil ou un modèle déjà cité ne se supprime pas : archivé ou retiré, il reste affiché sur les contenus existants.')}</span>`
    ]), `${saisiesHTML}<form class="ad-defi" novalidate data-ad-outil-form>
        <h2>Nouvel outil</h2>
        <div class="ad-outils">
          <div class="ad-champ is-large">
            <label for="ad-outil-nom">Nom</label>
            <input id="ad-outil-nom" name="nom" maxlength="100" required>
            ${erreurHTML('nom')}
          </div>
          <div class="ad-champ is-large">
            <label for="ad-outil-editeur">Éditeur</label>
            <input id="ad-outil-editeur" name="editeur" maxlength="100" list="ad-editeurs" autocomplete="off" required>
            <datalist id="ad-editeurs">${connus.map(e => `<option value="${esc(e)}"></option>`).join('')}</datalist>
            ${erreurHTML('editeur')}
          </div>
        </div>
        <div class="ad-outils">
          <div class="ad-champ">
            <label for="ad-outil-type">Type</label>
            <select id="ad-outil-type" name="type" required>${TYPES_OUTIL.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select>
            ${erreurHTML('type')}
          </div>
          <div class="ad-champ">
            <label for="ad-outil-famille">Famille du catalogue</label>
            <select id="ad-outil-famille" name="famille" required>${FAMILLES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
            ${erreurHTML('famille')}
          </div>
          <button class="btn btn-primary" type="submit">${plus}Ajouter l’outil</button>
        </div>
        <p class="md-rien">${t('Un éditeur inconnu est ajouté avec l’outil. L’outil s’affiche sans logo tant que son fichier n’a pas été ajouté au site.')}</p>
        ${erreurHTML('general')}
      </form>
      ${parFamille(outils).map(f => `<section class="ad-famille" aria-labelledby="ad-famille-${f.id}">
        <h2 id="ad-famille-${f.id}">${f.libelle}<span class="ad-famille-nb">${fmt(f.outils.length)}</span></h2>
        <ul class="ad-refs">${f.outils.map(outilItem).join('')}</ul>
      </section>`).join('')}`);
    brancherOutils();
  }

  /** schemaOutil, schemaModele : mêmes contrôles et messages. */
  function controlerOutil(v) {
    const erreurs = {};
    const nom = texte(v.nom);
    const editeur = texte(v.editeur);
    if (nom.length < 2) erreurs.nom = 'Le nom compte au moins 2 caractères.';
    else if (nom.length > 100) erreurs.nom = 'Le nom compte 100 caractères au plus.';
    if (editeur.length < 2) erreurs.editeur = 'L’éditeur compte au moins 2 caractères.';
    else if (editeur.length > 100) erreurs.editeur = 'L’éditeur compte 100 caractères au plus.';
    if (!LIBELLE_TYPE[v.type]) erreurs.type = 'Choisissez le type de l’outil.';
    if (!FAMILLES.some(([id]) => id === v.famille)) erreurs.famille = 'Choisissez la famille de l’outil.';
    return [erreurs, { nom, editeur, type: v.type, famille: v.famille }];
  }
  function controlerModele(v) {
    const erreurs = {};
    const nom = texte(v.nom);
    const nomCourt = texte(v.nomCourt);
    const dateSortie = v.dateSortie || null;
    if (nom.length < 2) erreurs.nom = 'Le nom compte au moins 2 caractères.';
    else if (nom.length > 100) erreurs.nom = 'Le nom compte 100 caractères au plus.';
    if (!nomCourt) erreurs.nomCourt = 'Indiquez le nom court du modèle.';
    else if (nomCourt.length > 60) erreurs.nomCourt = 'Le nom court compte 60 caractères au plus.';
    if (dateSortie && !/^\d{4}-\d{2}-\d{2}$/.test(dateSortie)) erreurs.dateSortie = 'Indiquez une date au format AAAA-MM-JJ.';
    return [erreurs, { nom, nomCourt, dateSortie }];
  }

  function brancherOutils() {
    const formOutil = $('[data-ad-outil-form]');
    formOutil.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      const [erreurs, saisie] = controlerOutil(Object.fromEntries(new FormData(formOutil)));
      if (Object.keys(erreurs).length) return afficherErreurs(formOutil, erreurs);
      const outil = await envoyer(formOutil, () => {
        // Un éditeur se retrouve par son nom ou par son adresse ; inconnu, il est créé avec l'outil.
        const slug = slugifier(saisie.editeur, 100);
        let editeur = etat.editeurs.find(e => e.nom.toLowerCase() === saisie.editeur.toLowerCase()) || etat.editeurs.find(e => slugifier(e.nom, 100) === slug);
        if (editeur && !editeur.actif) { const message = editeurArchive(editeur.nom); return { erreurs: { editeur: message } }; }
        if (etat.outils.some(o => slugifier(o.nom) === slugifier(saisie.nom))) return { erreurs: { nom: 'Un outil porte déjà ce nom.' } };
        if (!editeur) { editeur = { id: suivant(etat.editeurs), nom: saisie.editeur, actif: true }; etat.editeurs.push(editeur); }
        const cree = { id: suivant(etat.outils), nom: saisie.nom, editeurId: editeur.id, famille: saisie.famille, type: saisie.type, logo: null, logoMonochrome: false, statut: 'ACTIF', utilisations: 0, modeles: [] };
        etat.outils.push(cree);
        return cree;
      });
      if (outil) rechargerSur(`outil-${outil.id}`, `Outil « ${outil.nom} » ajouté : ajoutez-lui ses modèles.`);
    });

    $$('[data-ad-modele-form]').forEach(form => form.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      const outilId = Number(form.dataset.adModeleForm);
      const [erreurs, saisie] = controlerModele(Object.fromEntries(new FormData(form)));
      if (Object.keys(erreurs).length) return afficherErreurs(form, erreurs);
      const outil = await envoyer(form, () => {
        const o = etat.outils.find(x => x.id === outilId);
        const e = editeurDe(o.editeurId);
        if (!e.actif) return { erreurs: { general: editeurArchive(e.nom) } };
        // Modèle existant de l'éditeur rattaché à l'outil, sinon nouveau modèle.
        let m = etat.modeles.find(x => x.editeurId === o.editeurId && x.nom === saisie.nom);
        if (m && o.modeles.includes(m.id)) return { erreurs: { general: 'Ce modèle est déjà proposé avec cet outil.' } };
        if (!m) { m = { id: suivant(etat.modeles), editeurId: o.editeurId, ...saisie, statut: 'DISPONIBLE' }; etat.modeles.push(m); }
        o.modeles.push(m.id);
        // La saisie libre d'origine, et toute saisie identique pour cet outil, quittent la liste.
        const memes = [saisie.nom, saisie.nomCourt].map(n => n.toLowerCase());
        etat.saisies = (etat.saisies || []).filter(x => String(x.id) !== form.dataset.saisie && !(x.outil === o.nom && memes.includes(x.texte.toLowerCase())));
        return o;
      });
      if (outil) rechargerSur(`outil-${outilId}`, `Modèle « ${saisie.nom} » ajouté à ${outil.nom}.`);
    }));

    /* Ajouter une saisie libre : le formulaire du modèle s'ouvre dans son outil, prérempli. */
    $$('[data-ad-saisie-ajouter]').forEach(bouton => bouton.addEventListener('click', () => {
      const x = etat.saisies.find(y => y.id === Number(bouton.dataset.adSaisieAjouter));
      const o = etat.outils.find(y => y.nom === x.outil);
      const form = o && $(`[data-ad-modele-form="${o.id}"]`);
      if (!o || !form || form.hidden) { V.toast(`L’outil « ${x.outil} » est archivé : proposez-le de nouveau d’abord.`, 'alert'); return; }
      const details = document.getElementById(`outil-${o.id}`);
      details.open = true;
      form.dataset.saisie = String(x.id);
      // Nom court proposé : la saisie sans le nom de l'outil (« Gemini 3 Flash » → « 3 Flash »).
      const court = x.texte.toLowerCase().startsWith(`${o.nom.toLowerCase()} `) ? x.texte.slice(o.nom.length + 1) : x.texte;
      $(`#ad-modele-nom-${o.id}`).value = x.texte;
      $(`#ad-modele-court-${o.id}`).value = court;
      form.scrollIntoView({ block: 'center', behavior: V.motion.full() ? 'smooth' : 'auto' });
      $(`#ad-modele-nom-${o.id}`).focus({ preventScroll: true });
      V.toast('Vérifiez le nom complet et le nom court, puis ajoutez le modèle.');
    }));
    $$('[data-ad-saisie-ignorer]').forEach(bouton => bouton.addEventListener('click', () => {
      const nom = bouton.dataset.nom;
      confirmer(`Ignorer « ${nom} » ?`, 'La saisie quitte cette liste. Les contenus qui la citent l’affichent toujours telle qu’elle a été écrite.', 'Ignorer', async () => {
        const fait = await changer(bouton, () => { etat.saisies = etat.saisies.filter(y => y.id !== Number(bouton.dataset.adSaisieIgnorer)); return null; });
        if (fait) rechargerSur(etat.saisies.length ? 'saisies' : 'outils', `« ${nom} » est ignoré.`);
      });
    }));

    $$('[data-ad-outil-statut]').forEach(bouton => bouton.addEventListener('click', () => {
      const outilId = Number(bouton.dataset.adOutilStatut);
      const nom = bouton.dataset.nom;
      const archiver = bouton.dataset.statut === 'ARCHIVE';
      const utilisations = Number(bouton.dataset.utilisations) || 0;
      const garde = utilisations ? ` Les ${utilisations > 1 ? `${utilisations} contenus qui le citent l’affichent` : 'contenu qui le cite l’affiche'} toujours.` : '';
      confirmer(
        archiver ? `Archiver « ${nom} » ?` : `Proposer de nouveau « ${nom} » ?`,
        archiver ? `Il n’est plus proposé pour ${SAISIES}.${garde}` : `Il est de nouveau proposé pour ${SAISIES}.`,
        archiver ? 'Archiver' : 'Proposer de nouveau',
        async () => {
          const fait = await changer(bouton, () => {
            const o = etat.outils.find(x => x.id === outilId);
            const e = editeurDe(o.editeurId);
            if (!archiver && !e.actif) return editeurArchive(e.nom);
            o.statut = archiver ? 'ARCHIVE' : 'ACTIF';
            return null;
          });
          if (fait) rechargerSur(`outil-${outilId}`, archiver ? `${nom} est archivé.` : `${nom} est de nouveau proposé.`);
        }
      );
    }));

    $$('[data-ad-modele]').forEach(bouton => bouton.addEventListener('click', () => {
      const nom = bouton.dataset.nom;
      const retirer = bouton.dataset.statut === 'RETIRE';
      confirmer(
        retirer ? `Retirer « ${nom} » ?` : `Proposer de nouveau « ${nom} » ?`,
        retirer
          ? `Il n’est plus proposé pour ${SAISIES}, avec aucun des outils qui le comptent. Les contenus qui le citent l’affichent toujours.`
          : `Il est de nouveau proposé pour ${SAISIES}, avec les outils qui le comptent.`,
        retirer ? 'Retirer' : 'Proposer de nouveau',
        async () => {
          const fait = await changer(bouton, () => {
            const m = etat.modeles.find(x => x.id === Number(bouton.dataset.adModele));
            const e = editeurDe(m.editeurId);
            if (!retirer && !e.actif) return editeurArchive(e.nom);
            m.statut = retirer ? 'RETIRE' : 'DISPONIBLE';
            return null;
          });
          if (fait) rechargerSur(`outil-${bouton.dataset.adOutil}`, retirer ? `${nom} est retiré.` : `${nom} est de nouveau proposé.`);
        }
      );
    }));
  }

  /* Éditeurs ------------------------------------------------------------------------------------- */

  /** EditeurAdministreApi, par ordre alphabétique, archivés compris. */
  const editeursAdministres = () => etat.editeurs
    .map(e => {
      const sesModeles = etat.modeles.filter(m => m.editeurId === e.id);
      return {
        ...e,
        outils: etat.outils.filter(o => o.editeurId === e.id).sort((a, b) => (a.statut === 'ACTIF' ? 0 : 1) - (b.statut === 'ACTIF' ? 0 : 1) || parNom(a.nom, b.nom)),
        modeles: sesModeles.length,
        modelesProposes: sesModeles.filter(m => m.statut === 'DISPONIBLE').length
      };
    })
    .sort((a, b) => parNom(a.nom.toLowerCase(), b.nom.toLowerCase()) || a.id - b.id);

  function rendreEditeurs() {
    const editeurs = editeursAdministres();
    const archives = editeurs.filter(e => !e.actif).length;
    const proposes = e => e.outils.filter(o => o.statut === 'ACTIF').length;
    const outils = e => { if (!e.outils.length) return 'Aucun outil'; const n = proposes(e); return n ? pluriel(n, 'outil proposé', 'outils proposés') : 'Aucun outil proposé'; };
    const modeles = e => (e.modeles ? (e.modelesProposes ? pluriel(e.modelesProposes, 'modèle proposé', 'modèles proposés') : 'Aucun modèle proposé') : 'Aucun modèle');
    const item = e => `<li>
        <details class="ad-ref${e.actif ? '' : ' is-archive'}" id="editeur-${e.id}">
          <summary>
            <span class="ad-ref-logo is-vide" aria-hidden="true">${esc(e.nom.slice(0, 1))}</span>
            <span class="ad-membre-corps">
              <span class="ad-membre-nom">${t(e.nom)}</span>
              <span class="ad-membre-meta"><span>${outils(e)}</span><span>${modeles(e)}</span></span>
            </span>
            ${e.actif ? '' : '<span class="ad-etat is-expire">Archivé</span>'}
            ${chevron}
          </summary>
          <div class="ad-ref-corps">
            <form class="ad-outils ad-modele" novalidate data-ad-editeur-form="${e.id}" data-nom="${esc(e.nom)}">
              <div class="ad-champ is-large">
                <label for="ad-editeur-nom-${e.id}">Nom</label>
                <input id="ad-editeur-nom-${e.id}" name="nom" maxlength="100" value="${esc(e.nom)}" autocomplete="off" required>
                ${erreurHTML('nom')}
              </div>
              <button class="btn btn-secondary" type="submit">Renommer</button>
              ${erreurHTML('general')}
            </form>
            ${e.outils.length ? `<h3>Outils</h3>
            <ul class="ad-ref-outils">${e.outils.map(o => `<li><a class="ad-lien" href="administration-referentiels.html#outil-${o.id}">${t(o.nom)}</a>${o.statut === 'ARCHIVE' ? '<span class="ad-etat is-expire">Archivé</span>' : ''}</li>`).join('')}</ul>`
              : `<p class="md-rien">${t(e.modeles ? 'Aucun outil : ses modèles sont proposés avec les outils d’autres éditeurs.' : 'Aucun outil ni modèle pour l’instant.')}</p>`}
            <div class="ad-ref-pied">
              <p>${t(e.actif ? 'Proposé à la saisie d’un nouvel outil.' : 'Ni proposé pour un nouvel outil, ni ses outils et ses modèles dans les saisies.')}</p>
              <button class="btn btn-secondary btn-sm" type="button" data-ad-editeur-statut="${e.id}" data-actif="${String(!e.actif)}" data-nom="${esc(e.nom)}" data-outils="${proposes(e)}" data-modeles="${e.modelesProposes}">${e.actif ? 'Archiver l’éditeur' : 'Proposer de nouveau l’éditeur'}</button>
            </div>
          </div>
        </details>
      </li>`;
    page().innerHTML = gabarit('editeurs', statutHTML([
      `<span class="is-fort">${pluriel(editeurs.length - archives, 'éditeur proposé', 'éditeurs proposés')}</span>`,
      archives ? `<span>${pluriel(archives, 'éditeur archivé', 'éditeurs archivés')}</span>` : '',
      `<span>${t('Un éditeur s’ajoute avec son premier outil. Archivé, il n’est plus proposé, ni ses outils et ses modèles ; les contenus qui les citent les affichent toujours.')}</span>`
    ]), `<ul class="ad-refs">${editeurs.map(item).join('')}</ul>`);
    brancherEditeurs();
  }

  /** Ce que l'archivage retire des saisies : « ses 2 outils proposés sont archivés et son modèle
      proposé est retiré ». */
  function retraitEditeur(outils, modeles) {
    const parties = [
      outils === 1 ? 'son outil proposé est archivé' : outils > 1 ? `ses ${outils} outils proposés sont archivés` : '',
      modeles === 1 ? 'son modèle proposé est retiré' : modeles > 1 ? `ses ${modeles} modèles proposés sont retirés, y compris avec les outils d’autres éditeurs` : ''
    ].filter(Boolean);
    if (!parties.length) return '';
    const phrase = parties.join(' et ');
    return ` ${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} ; les contenus qui les citent les affichent toujours. Le proposer de nouveau ne les rétablit pas : chacun se propose de nouveau à part.`;
  }

  function brancherEditeurs() {
    $$('[data-ad-editeur-form]').forEach(form => form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const id = Number(form.dataset.adEditeurForm);
      const avant = form.dataset.nom;
      const nom = texte(new FormData(form).get('nom'));
      // schemaNomEditeur
      const message = !nom ? 'Indiquez le nom de l’éditeur.' : nom.length < 2 ? 'Le nom compte au moins 2 caractères.' : nom.length > 100 ? 'Le nom compte 100 caractères au plus.' : nom === avant ? 'Saisissez le nouveau nom.' : '';
      if (message) return afficherErreurs(form, { nom: message });
      afficherErreurs(form, {});
      confirmer(
        `Renommer « ${avant} » en « ${nom} » ?`,
        'Le nouveau nom s’affiche partout où l’éditeur apparaît : dans les saisies, sur les contenus qui citent ses outils et dans l’administration.',
        'Renommer',
        async () => {
          const editeur = await envoyer(form, () => {
            if (etat.editeurs.some(e => e.id !== id && e.nom.toLowerCase() === nom.toLowerCase())) return { erreurs: { nom: 'Un éditeur porte déjà ce nom.' } };
            const e = editeurDe(id);
            e.nom = nom;
            return e;
          }, ECHEC_MODIFICATION);
          if (editeur) rechargerSur(`editeur-${id}`, `« ${avant} » s’appelle désormais « ${nom} ».`);
        }
      );
    }));

    $$('[data-ad-editeur-statut]').forEach(bouton => bouton.addEventListener('click', () => {
      const id = Number(bouton.dataset.adEditeurStatut);
      const nom = bouton.dataset.nom;
      const actif = bouton.dataset.actif === 'true';
      confirmer(
        actif ? `Proposer de nouveau « ${nom} » ?` : `Archiver « ${nom} » ?`,
        actif
          ? 'Il est de nouveau proposé pour un nouvel outil. Ses outils et ses modèles restent archivés ou retirés : proposez de nouveau ceux qui doivent l’être, dans l’onglet Outils et modèles.'
          : `Il n’est plus proposé pour un nouvel outil.${retraitEditeur(Number(bouton.dataset.outils) || 0, Number(bouton.dataset.modeles) || 0)}`,
        actif ? 'Proposer de nouveau' : 'Archiver',
        async () => {
          const fait = await changer(bouton, () => {
            const e = editeurDe(id);
            e.actif = actif;
            if (!actif) {
              etat.outils.filter(o => o.editeurId === id && o.statut === 'ACTIF').forEach(o => { o.statut = 'ARCHIVE'; });
              etat.modeles.filter(m => m.editeurId === id && m.statut === 'DISPONIBLE').forEach(m => { m.statut = 'RETIRE'; });
            }
            return null;
          });
          if (fait) rechargerSur(`editeur-${id}`, actif ? `${nom} est de nouveau proposé.` : `${nom} est archivé.`);
        }
      );
    }));
  }

  /* Ordre d'affichage (OrdreReferentiel.astro) ------------------------------------------------------ */

  function ordreHTML(referentiel, elements, usage, archive) {
    const dernier = elements.length - 1;
    return `<div class="ad-refs ad-ordre">
      <details class="ad-ref" id="ordre-${referentiel}" data-ad-ordre="${referentiel}">
        <summary>
          <span class="ad-ref-logo is-vide" aria-hidden="true">${icon('chevron-up-down')}</span>
          <span class="ad-membre-corps">
            <span class="ad-membre-nom">Ordre d’affichage</span>
            <span class="ad-membre-meta"><span>${t(usage)}</span></span>
          </span>
          ${chevron}
        </summary>
        <div class="ad-ref-corps">
          <ol class="ad-ordre-liste" data-ad-ordre-liste>${elements.map((e, rang) => `<li data-id="${e.id}" data-nom="${esc(e.libelle)}">
              <span class="ad-ordre-rang" aria-hidden="true">${rang + 1}</span>
              <span class="ad-ordre-nom">${t(e.libelle)}${e.active ? '' : `<span class="ad-etat is-expire">${archive}</span>`}</span>
              <span class="ad-ordre-boutons">
                <button class="icon-btn" type="button" data-ad-monter aria-label="${esc(`Monter « ${e.libelle} »`)}"${rang === 0 ? ' disabled' : ''}>${icon('arrow-up')}</button>
                <button class="icon-btn" type="button" data-ad-descendre aria-label="${esc(`Descendre « ${e.libelle} »`)}"${rang === dernier ? ' disabled' : ''}>${icon('arrow-down')}</button>
              </span>
            </li>`).join('')}</ol>
          <p class="sr-only" aria-live="polite" data-ad-ordre-annonce></p>
          <div class="ad-ref-pied">
            <p data-ad-ordre-etat>${t('Déplacez les éléments, puis enregistrez le nouvel ordre.')}</p>
            <div class="ad-actions-defi">
              <button class="btn btn-secondary btn-sm" type="button" data-ad-ordre-annuler disabled>Rétablir l’ordre enregistré</button>
              <button class="btn btn-primary btn-sm" type="button" data-ad-ordre-enregistrer disabled>Enregistrer l’ordre</button>
            </div>
          </div>
        </div>
      </details>
    </div>`;
  }

  const ORDRES = {
    categories: ['Les domaines s’affichent dans cet ordre dans Explorer et sur l’accueil, et les catégories sont proposées aux auteurs dans cet ordre.', 'Ordre des catégories enregistré.'],
    licences: ['Les licences sont proposées dans cet ordre à la publication d’une création.', 'Ordre des licences enregistré.']
  };

  function brancherOrdre() {
    $$('[data-ad-ordre]').forEach(bloc => {
      const referentiel = bloc.dataset.adOrdre;
      const liste = $('[data-ad-ordre-liste]', bloc);
      const enregistrer = $('[data-ad-ordre-enregistrer]', bloc);
      const retablir = $('[data-ad-ordre-annuler]', bloc);
      const etatOrdre = $('[data-ad-ordre-etat]', bloc);
      const annonce = $('[data-ad-ordre-annonce]', bloc);
      const elements = () => $$(':scope > li', liste);
      const ids = () => elements().map(li => Number(li.dataset.id));
      const enregistre = ids();
      const consigne = etatOrdre.textContent;

      /** Rangs, bouts de liste et boutons d'enregistrement d'après l'ordre affiché. */
      const actualiser = () => {
        const lignes = elements();
        lignes.forEach((li, rang) => {
          $('.ad-ordre-rang', li).textContent = String(rang + 1);
          $('[data-ad-monter]', li).disabled = rang === 0;
          $('[data-ad-descendre]', li).disabled = rang === lignes.length - 1;
        });
        const modifie = ids().some((id, rang) => id !== enregistre[rang]);
        enregistrer.disabled = !modifie;
        retablir.disabled = !modifie;
        etatOrdre.textContent = modifie ? 'Nouvel ordre à enregistrer.' : consigne;
      };

      liste.addEventListener('click', evenement => {
        const bouton = evenement.target.closest('[data-ad-monter], [data-ad-descendre]');
        const li = bouton?.closest('li');
        if (!bouton || !li) return;
        const monter = bouton.hasAttribute('data-ad-monter');
        const voisin = monter ? li.previousElementSibling : li.nextElementSibling;
        if (!voisin) return;
        if (monter) voisin.before(li); else voisin.after(li);
        actualiser();
        // Le focus suit l'élément déplacé ; arrivé au bout de la liste, il passe sur l'autre bouton.
        const meme = $(monter ? '[data-ad-monter]' : '[data-ad-descendre]', li);
        const autre = $(monter ? '[data-ad-descendre]' : '[data-ad-monter]', li);
        (meme.disabled ? autre : meme).focus();
        annonce.textContent = V.typo(`« ${li.dataset.nom} » en position ${elements().indexOf(li) + 1} sur ${elements().length}.`);
      });

      retablir.addEventListener('click', () => {
        const parId = new Map(elements().map(li => [Number(li.dataset.id), li]));
        liste.replaceChildren(...enregistre.map(id => parId.get(id)).filter(Boolean));
        actualiser();
        annonce.textContent = 'Ordre enregistré rétabli.';
      });

      enregistrer.addEventListener('click', () => {
        const [explication, message] = ORDRES[referentiel];
        confirmer('Enregistrer le nouvel ordre ?', explication, 'Enregistrer l’ordre', async () => {
          const nouvelOrdre = ids();
          const fait = await changer(enregistrer, () => {
            const parId = new Map(etat[referentiel].map(e => [e.id, e]));
            etat[referentiel] = nouvelOrdre.map(id => parId.get(id)).filter(Boolean);
            return null;
          });
          if (fait) rechargerSur(`ordre-${referentiel}`, message);
        });
      });
    });
  }

  /* Archiver ou proposer de nouveau : catégories, licences, étiquettes ; badges --------------------- */

  /** Titre, explication, libellé du bouton et message après le changement. */
  function questions(referentiel, activer, nom, n) {
    const plusieurs = n > 1;
    if (referentiel === 'badges')
      return activer
        ? [`Reprendre l’attribution de « ${nom} » ?`, 'Les membres qui remplissent son critère l’obtiennent de nouveau, dans les cinq minutes.', 'Reprendre l’attribution', `Attribution de « ${nom} » reprise.`]
        : [`Arrêter l’attribution de « ${nom} » ?`, `Plus aucun membre ne l’obtient, et il disparaît des prochains badges du profil.${n ? ` ${plusieurs ? `Les ${n} membres qui l’ont obtenu le gardent` : 'Le membre qui l’a obtenu le garde'}.` : ''}`, 'Arrêter l’attribution', `Attribution de « ${nom} » arrêtée.`];
    const proposee = {
      categories: `aux auteurs ${activer ? 'et' : 'ni'} présentée dans Explorer`,
      licences: 'à la publication d’une création',
      etiquettes: 'aux membres'
    }[referentiel];
    const garde = !n ? '' : {
      categories: plusieurs ? ` Les ${n} contenus qui la citent l’affichent toujours.` : ' Le contenu qui la cite l’affiche toujours.',
      licences: plusieurs ? ` Les ${n} créations qui l’ont choisie la gardent.` : ' La création qui l’a choisie la garde.',
      etiquettes: plusieurs ? ` Les ${n} contenus qui la portent la gardent.` : ' Le contenu qui la porte la garde.'
    }[referentiel];
    return activer
      ? [`Proposer de nouveau « ${nom} » ?`, `Elle est de nouveau proposée ${proposee}.`, 'Proposer de nouveau', `« ${nom} » est de nouveau proposée.`]
      : [`Archiver « ${nom} » ?`, `Elle n’est plus proposée ${proposee}.${garde}`, 'Archiver', `« ${nom} » est archivée.`];
  }
  const ANCRES = { categories: 'categorie', licences: 'licence', etiquettes: 'etiquette', badges: 'badge' };

  function brancherActivation() {
    $$('[data-ad-activer]').forEach(bouton => bouton.addEventListener('click', () => {
      const referentiel = bouton.dataset.adActiver;
      const id = Number(bouton.dataset.adId);
      const actif = bouton.dataset.actif === 'true';
      const [titre, explication, libelle, message] = questions(referentiel, actif, bouton.dataset.nom, Number(bouton.dataset.utilisations) || 0);
      confirmer(titre, explication, libelle, async () => {
        const fait = await changer(bouton, () => {
          const element = etat[referentiel].find(e => e.id === id);
          if (referentiel === 'licences' && !actif && element.parDefaut) return 'La licence par défaut reste proposée : choisissez d’abord une autre licence par défaut.';
          if (referentiel === 'badges') element.actif = actif; else element.active = actif;
          return null;
        });
        if (fait) rechargerSur(`${ANCRES[referentiel]}-${id}`, message);
      });
    }));
  }

  /* Catégories (ChampsCategorie.astro) -------------------------------------------------------------- */

  function champsCategorie(c) {
    const prefixe = `ad-categorie-${c ? c.id : 'nouvelle'}`;
    return `<div class="ad-outils">
        <div class="ad-champ is-large">
          <label for="${prefixe}-libelle">Libellé</label>
          <input id="${prefixe}-libelle" name="libelle" maxlength="60"${c ? ` value="${esc(c.libelle)}"` : ''} required>
          ${erreurHTML('libelle')}
        </div>
      </div>
      <fieldset class="ad-champ ad-icones">
        <legend>Icône</legend>
        <div class="ad-icones-liste">${ICONES_CATEGORIE.map(([nom, libelle]) => `<label class="ad-icone" title="${libelle}"><input type="radio" name="icone" value="${nom}"${c && c.icone === nom ? ' checked' : ''} required>${icon(nom, '')}<span class="sr-only">${libelle}</span></label>`).join('')}</div>
        ${erreurHTML('icone')}
      </fieldset>
      <div class="ad-champ">
        <label for="${prefixe}-description">Présentation du domaine</label>
        <textarea id="${prefixe}-description" name="description" rows="3" maxlength="300" required>${c ? esc(c.description || '') : ''}</textarea>
        ${erreurHTML('description')}
      </div>`;
  }

  /** schemaCategorie : mêmes contrôles et messages. */
  function controlerCategorie(v) {
    const erreurs = {};
    const libelle = texte(v.libelle);
    const description = texte(v.description);
    if (!libelle) erreurs.libelle = 'Indiquez le libellé de la catégorie.';
    else if (libelle.length < 2) erreurs.libelle = 'Le libellé compte au moins 2 caractères.';
    else if (libelle.length > 60) erreurs.libelle = 'Le libellé compte 60 caractères au plus.';
    if (!ICONES_CATEGORIE.some(([nom]) => nom === v.icone)) erreurs.icone = 'Choisissez une icône.';
    if (!description) erreurs.description = 'Rédigez la présentation du domaine.';
    else if (description.length < 20) erreurs.description = 'La présentation compte au moins 20 caractères.';
    else if (description.length > 300) erreurs.description = 'La présentation compte 300 caractères au plus.';
    return [erreurs, { libelle, icone: v.icone, description }];
  }

  function rendreCategories() {
    const categories = etat.categories;
    const archivees = categories.filter(c => !c.active).length;
    const citations = n => (n ? `Citée dans ${pluriel(n, 'contenu', 'contenus')}` : 'Citée dans aucun contenu');
    const item = c => `<li>
        <details class="ad-ref${c.active ? '' : ' is-archive'}" id="categorie-${c.id}">
          <summary>
            <span class="ad-ref-logo is-vide" aria-hidden="true">${icon(c.icone || 'compass')}</span>
            <span class="ad-membre-corps">
              <span class="ad-membre-nom">${t(c.libelle)}</span>
              <span class="ad-membre-meta"><span>/categories/${esc(c.slug)}</span><span>${citations(c.utilisations)}</span></span>
            </span>
            ${c.active ? '' : '<span class="ad-etat is-expire">Archivée</span>'}
            ${chevron}
          </summary>
          <div class="ad-ref-corps">
            <form class="ad-modification" novalidate data-ad-categorie-form="${c.id}">
              ${champsCategorie(c)}
              <div class="ad-actions-defi is-debut"><button class="btn btn-secondary" type="submit">Enregistrer les modifications</button></div>
              ${erreurHTML('general')}
            </form>
            <div class="ad-ref-pied">
              ${c.active ? `<a class="ad-lien" href="categorie.html?domaine=${esc(c.slug)}">Voir la page du domaine${icon('arrow-up-right')}</a>` : `<p>${t('Ni proposée aux auteurs ni présentée dans Explorer.')}</p>`}
              <button class="btn btn-secondary btn-sm" type="button" data-ad-activer="categories" data-ad-id="${c.id}" data-actif="${String(!c.active)}" data-nom="${esc(c.libelle)}" data-utilisations="${c.utilisations}">${c.active ? 'Archiver la catégorie' : 'Proposer de nouveau la catégorie'}</button>
            </div>
          </div>
        </details>
      </li>`;
    page().innerHTML = gabarit('categories', statutHTML([
      `<span class="is-fort">${pluriel(categories.length - archivees, 'catégorie proposée', 'catégories proposées')}</span>`,
      archivees ? `<span>${pluriel(archivees, 'catégorie archivée', 'catégories archivées')}</span>` : '',
      `<span>${t('Les catégories sont les domaines d’Explorer. Archivée, une catégorie reste affichée sur les contenus qui la citent.')}</span>`
    ]), `<form class="ad-defi" novalidate data-ad-categorie-form>
        <h2>Nouvelle catégorie</h2>
        ${champsCategorie(null)}
        <div class="ad-actions-defi is-debut"><button class="btn btn-primary" type="submit">${plus}Ajouter la catégorie</button></div>
        <p class="md-rien">${t('Son adresse, tirée du libellé, ne change plus ensuite : les liens vers la page du domaine restent valables.')}</p>
        ${erreurHTML('general')}
      </form>
      ${categories.length > 1 ? ordreHTML('categories', categories, 'L’ordre des domaines dans Explorer, sur l’accueil et dans les saisies', 'Archivée') : ''}
      <ul class="ad-refs">${categories.map(item).join('')}</ul>`);

    $$('[data-ad-categorie-form]').forEach(form => form.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      const id = Number(form.dataset.adCategorieForm) || null;
      const [erreurs, saisie] = controlerCategorie(Object.fromEntries(new FormData(form)));
      if (Object.keys(erreurs).length) return afficherErreurs(form, erreurs);
      const pris = { erreurs: { libelle: 'Une catégorie porte déjà ce nom.' } };
      const categorie = await envoyer(form, () => {
        if (id) {
          if (etat.categories.some(c => c.id !== id && c.libelle.toLowerCase() === saisie.libelle.toLowerCase())) return pris;
          return Object.assign(etat.categories.find(c => c.id === id), saisie);
        }
        const slug = slugifier(saisie.libelle) || 'domaine';
        if (etat.categories.some(c => c.slug === slug || c.libelle.toLowerCase() === saisie.libelle.toLowerCase())) return pris;
        const creee = { id: suivant(etat.categories), ...saisie, slug, active: true, utilisations: 0 };
        etat.categories.push(creee);
        return creee;
      }, id ? ECHEC_MODIFICATION : ECHEC_AJOUT);
      if (categorie) rechargerSur(`categorie-${categorie.id}`, id ? `Catégorie « ${saisie.libelle} » modifiée.` : `Catégorie « ${saisie.libelle} » ajoutée.`);
    }));
    brancherOrdre();
    brancherActivation();
  }

  /* Licences ------------------------------------------------------------------------------------- */

  /** schemaModificationLicence et schemaLicence : mêmes contrôles et messages. */
  function controlerLicence(v, creation) {
    const erreurs = {};
    const libelle = texte(v.libelle);
    const resume = texte(v.resume);
    const url = texte(v.url);
    if (!libelle) erreurs.libelle = 'Indiquez le libellé de la licence.';
    else if (libelle.length < 2) erreurs.libelle = 'Le libellé compte au moins 2 caractères.';
    else if (libelle.length > 100) erreurs.libelle = 'Le libellé compte 100 caractères au plus.';
    if (!resume) erreurs.resume = 'Résumez ce que la licence permet.';
    else if (resume.length < 10) erreurs.resume = 'Le résumé compte au moins 10 caractères.';
    else if (resume.length > 200) erreurs.resume = 'Le résumé compte 200 caractères au plus.';
    if (!url) erreurs.url = 'Indiquez l’adresse du texte de la licence.';
    else if (url.length > 2048) erreurs.url = 'L’adresse compte 2 048 caractères au plus.';
    else if (!/^\/(?!\/)\S*$/.test(url)) {
      let adresse = null;
      try { adresse = new URL(url); } catch { adresse = null; }
      if (!adresse || !adresse.hostname.includes('.') || /\s/.test(url)) erreurs.url = 'Indiquez une adresse complète (https://…) ou une page du site (/cgu#licences).';
      else if (adresse.protocol !== 'https:') erreurs.url = 'Utilisez une adresse sécurisée, en https.';
    }
    const saisie = { libelle, resume, url };
    if (creation) {
      const code = texte(v.code).toUpperCase();
      if (!code) erreurs.code = 'Indiquez le code de la licence.';
      else if (!/^[A-Z0-9][A-Z0-9.-]{1,29}$/.test(code)) erreurs.code = 'Le code compte 2 à 30 lettres, chiffres, points ou tirets (CC-BY-4.0).';
      Object.assign(saisie, { code, autoriseVariantes: v.autoriseVariantes });
    }
    return [erreurs, saisie];
  }

  function rendreLicences() {
    const licences = etat.licences;
    const archivees = licences.filter(l => !l.active).length;
    const parDefaut = licences.find(l => l.parDefaut);
    const choisie = n => (n ? `Choisie pour ${pluriel(n, 'création', 'créations')}` : 'Choisie pour aucune création');
    const lien = l => (l.url.startsWith('/') ? `${l.url.slice(1).replace(/^([\w-]+)/, '$1.html')}` : l.url);
    const item = l => `<li>
        <details class="ad-ref${l.active ? '' : ' is-archive'}" id="licence-${l.id}">
          <summary>
            <span class="ad-ref-logo is-vide" aria-hidden="true">${icon('doc')}</span>
            <span class="ad-membre-corps">
              <span class="ad-membre-nom">${t(l.libelle)}</span>
              <span class="ad-membre-meta"><span>${esc(l.code)}</span><span>${l.autoriseVariantes ? 'Variantes permises' : 'Sans variantes'}</span><span>${choisie(l.utilisations)}</span></span>
            </span>
            ${l.parDefaut ? '<span class="ad-etat is-libre">Par défaut</span>' : ''}
            ${l.active ? '' : '<span class="ad-etat is-expire">Archivée</span>'}
            ${chevron}
          </summary>
          <div class="ad-ref-corps">
            <form class="ad-modification" novalidate data-ad-licence-form="${l.id}">
              <div class="ad-outils">
                <div class="ad-champ is-large">
                  <label for="ad-licence-libelle-${l.id}">Libellé</label>
                  <input id="ad-licence-libelle-${l.id}" name="libelle" maxlength="100" value="${esc(l.libelle)}" required>
                  ${erreurHTML('libelle')}
                </div>
                <div class="ad-champ is-large">
                  <label for="ad-licence-resume-${l.id}">Ce que la licence permet, en une phrase</label>
                  <input id="ad-licence-resume-${l.id}" name="resume" maxlength="200" value="${esc(l.resume || '')}" required>
                  ${erreurHTML('resume')}
                </div>
              </div>
              <div class="ad-outils">
                <div class="ad-champ is-large">
                  <label for="ad-licence-url-${l.id}">Adresse du texte de la licence</label>
                  <input id="ad-licence-url-${l.id}" name="url" maxlength="2048" inputmode="url" value="${esc(l.url)}" required>
                  ${erreurHTML('url')}
                </div>
                <button class="btn btn-secondary" type="submit">Enregistrer les modifications</button>
              </div>
              ${erreurHTML('general')}
            </form>
            <div class="ad-ref-pied">
              <a class="ad-lien" href="${esc(lien(l))}" rel="noopener noreferrer" target="_blank">Lire le texte de la licence${icon('arrow-up-right')}</a>
              <div class="ad-actions-defi">
                ${l.active && !l.parDefaut ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-licence-defaut="${l.id}" data-nom="${esc(l.libelle)}">En faire la licence par défaut</button>` : ''}
                ${l.parDefaut ? `<p>${t('La licence par défaut reste toujours proposée.')}</p>`
                  : `<button class="btn btn-secondary btn-sm" type="button" data-ad-activer="licences" data-ad-id="${l.id}" data-actif="${String(!l.active)}" data-nom="${esc(l.libelle)}" data-utilisations="${l.utilisations}">${l.active ? 'Archiver la licence' : 'Proposer de nouveau la licence'}</button>`}
              </div>
            </div>
          </div>
        </details>
      </li>`;
    page().innerHTML = gabarit('licences', statutHTML([
      `<span class="is-fort">${pluriel(licences.length - archivees, 'licence proposée', 'licences proposées')}</span>`,
      archivees ? `<span>${pluriel(archivees, 'licence archivée', 'licences archivées')}</span>` : '',
      parDefaut ? `<span>${t(`Licence par défaut : ${parDefaut.libelle}`)}</span>` : ''
    ]), `<form class="ad-defi" novalidate data-ad-licence-form>
        <h2>Nouvelle licence</h2>
        <div class="ad-outils">
          <div class="ad-champ">
            <label for="ad-licence-code">Code</label>
            <input id="ad-licence-code" name="code" maxlength="30" placeholder="CC-BY-ND-4.0" autocomplete="off" required>
            ${erreurHTML('code')}
          </div>
          <div class="ad-champ is-large">
            <label for="ad-licence-libelle">Libellé</label>
            <input id="ad-licence-libelle" name="libelle" maxlength="100" required>
            ${erreurHTML('libelle')}
          </div>
        </div>
        <div class="ad-outils">
          <div class="ad-champ is-large">
            <label for="ad-licence-resume">Ce que la licence permet, en une phrase</label>
            <input id="ad-licence-resume" name="resume" maxlength="200" required>
            ${erreurHTML('resume')}
          </div>
          <div class="ad-champ is-large">
            <label for="ad-licence-url">Adresse du texte de la licence</label>
            <input id="ad-licence-url" name="url" maxlength="2048" inputmode="url" placeholder="https://" required>
            ${erreurHTML('url')}
          </div>
        </div>
        <label class="ad-case"><input type="checkbox" name="autoriseVariantes" checked>${t('Elle permet aux membres de publier des variantes d’une création')}</label>
        <div class="ad-actions-defi is-debut"><button class="btn btn-primary" type="submit">${plus}Ajouter la licence</button></div>
        <p class="md-rien">${t('Le code et les variantes permises ne changent plus ensuite : les créations publiées sous cette licence en gardent les conditions.')}</p>
        ${erreurHTML('general')}
      </form>
      ${licences.length > 1 ? ordreHTML('licences', licences, 'L’ordre des licences proposées à la publication d’une création', 'Archivée') : ''}
      <ul class="ad-refs">${licences.map(item).join('')}</ul>`);

    $$('[data-ad-licence-form]').forEach(form => form.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      const id = Number(form.dataset.adLicenceForm) || null;
      const donnees = new FormData(form);
      const [erreurs, saisie] = controlerLicence({ ...Object.fromEntries(donnees), autoriseVariantes: donnees.has('autoriseVariantes') }, !id);
      if (Object.keys(erreurs).length) return afficherErreurs(form, erreurs);
      if (id) {
        const licence = await envoyer(form, () => Object.assign(etat.licences.find(l => l.id === id), saisie), ECHEC_MODIFICATION);
        if (licence) rechargerSur(`licence-${id}`, `Licence « ${saisie.libelle} » modifiée.`);
        return;
      }
      const licence = await envoyer(form, () => {
        if (etat.licences.some(l => l.code === saisie.code)) return { erreurs: { code: 'Une licence porte déjà ce code.' } };
        const creee = { id: suivant(etat.licences), ...saisie, parDefaut: false, active: true, utilisations: 0 };
        etat.licences.push(creee);
        return creee;
      });
      if (licence) rechargerSur(`licence-${licence.id}`, `Licence « ${saisie.libelle} » ajoutée.`);
    }));

    $$('[data-ad-licence-defaut]').forEach(bouton => bouton.addEventListener('click', () => {
      const id = Number(bouton.dataset.adLicenceDefaut);
      const nom = bouton.dataset.nom;
      confirmer(
        `Faire de « ${nom} » la licence par défaut ?`,
        'Elle est proposée aux auteurs qui ne choisissent pas de licence. Les créations déjà publiées gardent la leur.',
        'En faire la licence par défaut',
        async () => {
          const fait = await changer(bouton, () => {
            const choisie = etat.licences.find(l => l.id === id);
            if (!choisie.active) return 'Proposez de nouveau cette licence avant d’en faire la licence par défaut.';
            etat.licences.forEach(l => { l.parDefaut = l.id === id; });
            return null;
          });
          if (fait) rechargerSur(`licence-${id}`, `${nom} est la licence par défaut.`);
        }
      );
    }));
    brancherOrdre();
    brancherActivation();
  }

  /* Étiquettes ----------------------------------------------------------------------------------- */

  const ETIQUETTES_PAR_PAGE = 50;

  function rendreEtiquettes(r) {
    const parametres = new URLSearchParams(location.search);
    const filtres = {
      q: (parametres.get('q') || '').trim().slice(0, 40),
      etat: ['proposees', 'archivees'].includes(parametres.get('etat')) ? parametres.get('etat') : ''
    };
    const numero = Math.max(1, Math.min(1000, Number(parametres.get('page')) || 1));
    const requete = n => {
      const p = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v));
      if (n > 1) p.set('page', String(n));
      return p.toString();
    };
    // GET /api/v1/admin/etiquettes : les plus utilisées d'abord, cinquante par page.
    const toutes = r.etiquettes === 'vide' ? [] : etat.etiquettes.map(e => ({ ...e, slug: slugifier(e.libelle, 60) }));
    const recherche = filtres.q ? slugifier(filtres.q, 60) : '';
    const trouvees = toutes
      .filter(e => (!recherche || e.slug.includes(recherche)) && (filtres.etat !== 'proposees' || e.active) && (filtres.etat !== 'archivees' || !e.active))
      .sort((a, b) => b.utilisations - a.utilisations || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    const pages = Math.max(1, Math.ceil(trouvees.length / ETIQUETTES_PAR_PAGE));
    const elements = trouvees.slice((numero - 1) * ETIQUETTES_PAR_PAGE, numero * ETIQUETTES_PAR_PAGE);
    const proposees = toutes.filter(e => e.active).length;
    const archivees = toutes.length - proposees;
    const filtre = Boolean(filtres.q || filtres.etat);
    const ligne = e => `<tr id="etiquette-${e.id}">
        <td><b>${t(e.libelle)}</b></td>
        <td data-libelle="Contenus">${fmt(e.utilisations)}</td>
        <td><span class="ad-etat ${e.active ? 'is-libre' : 'is-expire'}">${e.active ? 'Proposée' : 'Archivée'}</span></td>
        <td><div class="ad-actions-defi"><button class="btn btn-secondary btn-sm" type="button" data-ad-activer="etiquettes" data-ad-id="${e.id}" data-actif="${String(!e.active)}" data-nom="${esc(e.libelle)}" data-utilisations="${e.utilisations}">${e.active ? 'Archiver' : 'Proposer de nouveau'}</button></div></td>
      </tr>`;
    page().innerHTML = gabarit('etiquettes', statutHTML([
      `<span class="is-fort">${pluriel(proposees, 'étiquette proposée', 'étiquettes proposées')}</span>`,
      archivees ? `<span>${pluriel(archivees, 'étiquette archivée', 'étiquettes archivées')}</span>` : '',
      `<span>${t('Les membres créent les étiquettes en les saisissant. Archivée, une étiquette reste sur les contenus qui la portent et n’est plus proposée ailleurs.')}</span>`
    ]), `<form class="ad-outils" method="get" role="search">
        <div class="ad-champ is-large">
          <label for="ad-etiquette-q">Chercher une étiquette</label>
          <input id="ad-etiquette-q" name="q" type="search" value="${esc(filtres.q)}" maxlength="40" autocomplete="off">
        </div>
        <div class="ad-champ">
          <label for="ad-etiquette-etat">État</label>
          <select id="ad-etiquette-etat" name="etat">
            <option value=""${filtres.etat ? '' : ' selected'}>Toutes</option>
            <option value="proposees"${filtres.etat === 'proposees' ? ' selected' : ''}>Proposées</option>
            <option value="archivees"${filtres.etat === 'archivees' ? ' selected' : ''}>Archivées</option>
          </select>
        </div>
        <button class="btn btn-secondary" type="submit">${icon('search')}Chercher</button>
      </form>
      ${elements.length ? `<table class="ad-table ad-etiquettes">
        <caption class="sr-only">${filtre ? `Étiquettes trouvées, page ${numero} sur ${pages}` : `Étiquettes, des plus utilisées aux moins utilisées, page ${numero} sur ${pages}`}</caption>
        <thead><tr><th scope="col">Étiquette</th><th scope="col">Contenus</th><th scope="col">État</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${elements.map(ligne).join('')}</tbody>
      </table>` : `<p class="md-rien ad-vide">${t(filtre ? 'Aucune étiquette ne correspond à cette recherche.' : 'Aucune étiquette pour l’instant.')}</p>`}
      ${pages > 1 ? `<nav class="md-pages" aria-label="Pages des étiquettes">
        ${numero > 1 ? `<a class="btn btn-secondary" href="?${requete(numero - 1)}">Page précédente</a>` : ''}
        ${numero < pages ? `<a class="btn btn-secondary" href="?${requete(numero + 1)}">Page suivante</a>` : ''}
      </nav>` : ''}`);
    brancherActivation();
  }

  /* Badges --------------------------------------------------------------------------------------- */

  /** Emblème hexagonal d'un badge (lib/accueil/elements.ts, embleme). */
  const embleme = b => `<span class="emblem" data-tone="${b.ton}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icon(b.icone, '')}</span>`;

  function rendreBadges() {
    const badges = etat.badges;
    const arretes = badges.filter(b => !b.actif).length;
    const obtenu = n => (n ? `Obtenu par ${pluriel(n, 'membre', 'membres')}` : 'Obtenu par aucun membre');
    const groupes = CATEGORIES_BADGE.map(([categorie, libelle]) => ({ categorie, libelle, badges: badges.filter(b => b.categorie === categorie) })).filter(g => g.badges.length);
    page().innerHTML = gabarit('badges', statutHTML([
      `<span class="is-fort">${pluriel(badges.length - arretes, 'badge attribué', 'badges attribués')}</span>`,
      arretes ? `<span>${pluriel(arretes, 'badge arrêté', 'badges arrêtés')}</span>` : '',
      `<span>${t('Les critères des badges sont des règles de la plateforme. Arrêté, un badge n’est plus attribué ; les membres qui l’ont obtenu le gardent.')}</span>`
    ]), groupes.map(g => `<section class="ad-famille" aria-labelledby="ad-badges-${g.categorie}">
        <h2 id="ad-badges-${g.categorie}">${g.libelle}<span class="ad-famille-nb">${fmt(g.badges.length)}</span></h2>
        <ul class="ad-refs">${g.badges.map(b => `<li class="ad-badge${b.actif ? '' : ' is-archive'}" id="badge-${b.id}">
            ${embleme(b)}
            <span class="ad-membre-corps">
              <span class="ad-membre-nom">${t(b.libelle)}</span>
              <span class="ad-membre-meta"><span>${t(b.critere)}</span><span>${obtenu(b.obtentions)}</span></span>
            </span>
            ${b.actif ? '' : '<span class="ad-etat is-expire">Arrêté</span>'}
            <button class="btn btn-secondary btn-sm" type="button" data-ad-activer="badges" data-ad-id="${b.id}" data-actif="${String(!b.actif)}" data-nom="${esc(b.libelle)}" data-utilisations="${b.obtentions}">${b.actif ? 'Arrêter l’attribution' : 'Reprendre l’attribution'}</button>
          </li>`).join('')}</ul>
      </section>`).join(''));
    brancherActivation();
  }

  /* Montage -------------------------------------------------------------------------------------- */

  const VUES = {
    outils: { titre: 'Outils et modèles', rendre: rendreOutils },
    editeurs: { titre: 'Éditeurs', rendre: rendreEditeurs },
    categories: { titre: 'Catégories', rendre: rendreCategories },
    licences: { titre: 'Licences', rendre: rendreLicences },
    etiquettes: {
      titre: 'Étiquettes', rendre: rendreEtiquettes,
      etats: [{ name: 'etiquettes', legend: 'Étiquettes', options: [['remplie', 'Saisies par les membres'], ['vide', 'Aucune étiquette']] }],
      defauts: { etiquettes: 'remplie' }
    },
    badges: { titre: 'Badges', rendre: rendreBadges }
  };
  if (VUES[vue]) {
    const { titre, rendre, etats, defauts } = VUES[vue];
    monter({ cle: `vysora-admin-${vue}-reglages`, quoi: 'gérer les référentiels', titre: `${titre} · Référentiels · Administration · Vysora`, etats, defauts, rendre });
  }

  return {
    get etat() { return etat; },
    garder, suivant, afficherErreurs, envoyer, changer, confirmer, monter, rechargerSur,
    dateLongue, dateCourte, aujourdhui, pluriel, ECHEC_MODIFICATION,
    rendreAJour: () => { if (majPage) majPage(); }
  };
})();
