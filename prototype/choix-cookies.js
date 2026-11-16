'use strict';

/* Choix sur les cookies (LEG-03), sur le modèle des outils de consentement courants. Chargé sur
   toutes les pages par etats.js, comme le gabarit du site le fait (ChoixCookies.astro,
   scripts/commun/cookies.ts) ; styles dans cookies.css, copie de apps/web/src/styles/cookies.css.
   - Une fenêtre au centre de l'écran, page assombrie et figée derrière, en trois onglets :
     « Consentement », « Détails » (catégories et interrupteurs), « À propos des cookies ».
     « Tout refuser », « Personnaliser » (ouvre « Détails », puis devient « Enregistrer mes choix »)
     et « Tout accepter ». Elle s'ouvre tant qu'aucun choix n'est retenu (état « Cookies » du
     panneau Tweaks), sauf sur les pages Cookies et Confidentialité, vers lesquelles elle renvoie.
   - « Gérer les cookies », ajouté au pied de page, la rouvre sur « Détails », avec une croix.
   - Page Cookies ([data-ck-choix]) : chaque interrupteur enregistre le choix aussitôt.
   Le choix simulé est gardé dans le stockage du navigateur (vysora-cookies). */

(() => {
  const E = window.VysoraEtats;
  const CLE = 'vysora-cookies';
  const DUREE_MOIS = 6;
  const PAGES_LUES = ['cookies.html', 'confidentialite.html'];
  const ici = location.pathname.split('/').pop() || 'index.html';

  const $ = (selecteur, zone = document) => zone.querySelector(selecteur);
  const $$ = (selecteur, zone = document) => [...zone.querySelectorAll(selecteur)];

  /* Icônes de la fenêtre, ajoutées au sprite de la page quand elle ne les a pas. */
  const ICONES = {
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  const icone = (nom, classe = 'icon') => `<svg class="${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
  function completerSprite() {
    const manquantes = Object.keys(ICONES).filter(nom => !document.getElementById(`i-${nom}`));
    if (!manquantes.length) return;
    document.body.insertAdjacentHTML('afterbegin', `<svg class="sprite" aria-hidden="true" focusable="false">${manquantes
      .map(nom => `<symbol id="i-${nom}" viewBox="0 0 24 24">${ICONES[nom]}</symbol>`).join('')}</svg>`);
  }

  /* Choix retenu ---------------------------------------------------------------------------------- */

  const lireChoix = () => {
    try {
      const choix = JSON.parse(localStorage.getItem(CLE) || 'null');
      return choix && typeof choix.date === 'string' ? choix : null;
    } catch { return null; }
  };
  const choixActuel = () => {
    const choix = lireChoix();
    return { audience: choix ? choix.audience !== false : true, parcours: Boolean(choix && choix.parcours) };
  };
  function retenirChoix(choix) {
    const date = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(CLE, JSON.stringify({ ...choix, date })); } catch { /* stockage indisponible */ }
    if (E) E.set({ cookies: 'choisis' });
    document.dispatchEvent(new CustomEvent('vysora:cookies-choisis', { detail: choix }));
  }
  const toast = message => { if (window.Vysora && $('[data-toast]')) window.Vysora.toast(message); };

  /* Finalités (liste partagée avec la page Cookies) ---------------------------------------------- */

  const FINALITES = [
    { cle: 'audience', icone: 'chart', titre: 'Mesure d’audience', aide: 'Nous aident à comprendre la fréquentation du site, de façon anonyme.' },
    { cle: 'parcours', icone: 'route', titre: 'Parcours des visites', aide: 'Nous aident à repérer ce qui vous freine pour améliorer le site.' }
  ];
  const finalitesHTML = (prefixe, choix) => `<ul class="ck-finalites">
      <li class="ck-finalite">
        <span class="ck-finalite-icone" aria-hidden="true">${icone('lock', 'icon icon-sm')}</span>
        <div class="ck-finalite-texte"><p class="ck-finalite-titre">Indispensables</p><p class="ck-finalite-aide">Nécessaires au bon fonctionnement du site.</p></div>
        <span class="ck-toujours">Toujours actifs</span>
      </li>
      ${FINALITES.map(f => `<li class="ck-finalite">
        <span class="ck-finalite-icone" aria-hidden="true">${icone(f.icone, 'icon icon-sm')}</span>
        <div class="ck-finalite-texte"><p class="ck-finalite-titre" id="${prefixe}-${f.cle}">${f.titre}</p><p class="ck-finalite-aide" id="${prefixe}-${f.cle}-aide">${f.aide}</p></div>
        <button class="ck-interrupteur" type="button" role="switch" aria-checked="${choix[f.cle]}" aria-labelledby="${prefixe}-${f.cle}" aria-describedby="${prefixe}-${f.cle}-aide" data-ck-finalite="${f.cle}"><span aria-hidden="true"></span></button>
      </li>`).join('')}
    </ul>`;

  /* Fenêtre ---------------------------------------------------------------------------------------- */

  const ONGLETS = [['consentement', 'Consentement', ''], ['details', 'Détails', ''], ['apropos', 'À propos', ' des cookies']];
  const panneauHTML = () => `<dialog class="ck-panneau" aria-labelledby="ck-titre" data-ck-panneau data-ck-vue="consentement">
    <div class="ck-marque">
      <img class="ck-logo" src="assets/logos/vysora%20Bleu-Black.png" alt="Vysora" width="337" height="122" loading="lazy">
      <button class="icon-btn ck-fermer" type="button" aria-label="Fermer" data-ck-fermer hidden>${icone('close')}</button>
    </div>
    <div class="ck-onglets" role="tablist" aria-label="Choix sur les cookies">
      ${ONGLETS.map(([cle, libelle, complement], i) => `<button type="button" role="tab" id="ck-onglet-${cle}" aria-controls="ck-vue-${cle}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-ck-onglet="${cle}">${libelle}${complement ? `<span class="ck-complement">${complement}</span>` : ''}</button>`).join('')}
    </div>
    <div class="ck-vues">
      <div class="ck-vue ck-vue-message" id="ck-vue-consentement" role="tabpanel" aria-labelledby="ck-onglet-consentement">
        <span class="ck-vue-icone" aria-hidden="true">${icone('shield')}</span>
        <div>
          <h2 class="ck-titre" id="ck-titre">Ce site utilise des cookies</h2>
          <p>Nous utilisons des cookies pour faire fonctionner Vysora, mesurer son audience de façon anonyme et, avec votre accord, comprendre le parcours de vos visites afin d’améliorer le site. Vous pouvez changer d’avis à tout moment avec le lien «&nbsp;Gérer les cookies&nbsp;», en bas de chaque page.</p>
        </div>
      </div>
      <div class="ck-vue" id="ck-vue-details" role="tabpanel" aria-labelledby="ck-onglet-details" hidden>
        ${finalitesHTML('ck-panneau', choixActuel())}
      </div>
      <div class="ck-vue ck-vue-message" id="ck-vue-apropos" role="tabpanel" aria-labelledby="ck-onglet-apropos" hidden>
        <span class="ck-vue-icone" aria-hidden="true">${icone('doc')}</span>
        <div>
          <p>Un cookie est un petit fichier enregistré par votre navigateur. Certains sont indispensables&#8239;: ils gardent votre connexion et retiennent vos choix. Les autres ne sont déposés qu’avec votre accord. Vysora ne dépose aucun cookie publicitaire et ne confie rien à des tiers.</p>
          <p class="ck-liens"><a href="cookies.html">Politique relative aux cookies</a><a href="confidentialite.html">Politique de confidentialité</a></p>
        </div>
      </div>
    </div>
    <div class="ck-panneau-actions">
      <button class="btn btn-secondary" type="button" data-ck-action="refuser">Tout refuser</button>
      <button class="btn btn-secondary ck-personnaliser" type="button" data-ck-action="personnaliser"><span data-ck-libelle>Personnaliser</span>${icone('chevron-right', 'icon icon-sm ck-chevron')}</button>
      <button class="btn btn-primary" type="button" data-ck-action="accepter">Tout accepter</button>
    </div>
  </dialog>`;

  let panneau = null;
  let onglets = [];

  function afficherVue(vue, { focus = false } = {}) {
    panneau.dataset.ckVue = vue;
    onglets.forEach(onglet => {
      const actif = onglet.dataset.ckOnglet === vue;
      onglet.setAttribute('aria-selected', String(actif));
      onglet.tabIndex = actif ? 0 : -1;
      if (actif && focus) onglet.focus();
    });
    $$('[role="tabpanel"]', panneau).forEach(zone => { zone.hidden = zone.id !== `ck-vue-${vue}`; });
    const details = vue === 'details';
    $('.ck-personnaliser', panneau).dataset.ckAction = details ? 'enregistrer' : 'personnaliser';
    $('[data-ck-libelle]', panneau).textContent = details ? 'Enregistrer mes choix' : 'Personnaliser';
  }

  const poser = (zone, choix) => $$('[data-ck-finalite]', zone).forEach(bouton => bouton.setAttribute('aria-checked', String(choix[bouton.dataset.ckFinalite])));
  const lire = zone => {
    const choix = choixActuel();
    $$('[data-ck-finalite]', zone).forEach(bouton => { choix[bouton.dataset.ckFinalite] = bouton.getAttribute('aria-checked') === 'true'; });
    return choix;
  };
  const basculer = bouton => bouton.setAttribute('aria-checked', String(bouton.getAttribute('aria-checked') !== 'true'));
  const premiere = () => $('[data-ck-fermer]', panneau).hidden;

  /** Première ouverture : sur « Consentement », sans croix ; seul un choix la ferme. */
  function ouvrirPremiere() {
    if (!panneau || PAGES_LUES.includes(ici)) return;
    poser(panneau, choixActuel());
    $('[data-ck-fermer]', panneau).hidden = true;
    afficherVue('consentement');
    if (!panneau.open) panneau.showModal();
  }
  /** « Gérer les cookies » : rouverte sur « Détails », avec une croix. */
  function ouvrirGestion() {
    poser(panneau, choixActuel());
    $('[data-ck-fermer]', panneau).hidden = false;
    if (!panneau.open) panneau.showModal();
    afficherVue('details', { focus: true });
  }
  const fermer = () => { if (panneau.open) panneau.close(); };
  function choisir(choix) {
    retenirChoix(choix);
    fermer();
    toast('Vos choix sont enregistrés.');
  }

  /* Pied de page : « Gérer les cookies » après « Cookies » (que commun.js ajoute). */
  function lienPiedDePage() {
    $$('.footer-nav[aria-label="Informations légales"] ul').forEach(ul => {
      if ($('[data-ck-gerer]', ul)) return;
      const li = '<li><a href="cookies.html#choix" data-ck-gerer>Gérer les cookies</a></li>';
      const apres = $('a[href="cookies.html"]', ul)?.closest('li');
      if (apres) apres.insertAdjacentHTML('afterend', li); else ul.insertAdjacentHTML('beforeend', li);
    });
  }

  /* Page Cookies : le choix s'enregistre à chaque changement. */
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dateLongue = date => `${date.getDate() === 1 ? '1er' : date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
  function etatDuChoix() {
    const choix = lireChoix();
    if (!choix || (E && E.get().cookies !== 'choisis')) return 'Aucun choix enregistré sur cet appareil : la mesure d’audience anonyme s’applique et vos parcours ne sont pas suivis.';
    const debut = new Date(`${choix.date}T12:00:00`);
    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + DUREE_MOIS);
    return `Choix enregistré sur cet appareil le ${dateLongue(debut)}, retenu jusqu’au ${dateLongue(fin)}.`;
  }
  function pageCookies() {
    const zone = $('[data-ck-choix]');
    if (!zone) return;
    const etat = $('[data-ck-etat]', zone);
    const rafraichir = choix => { poser(zone, choix); if (etat) etat.textContent = etatDuChoix(); };
    zone.addEventListener('click', evenement => {
      const bouton = evenement.target.closest('[data-ck-finalite]');
      if (!bouton) return;
      basculer(bouton);
      retenirChoix(lire(zone));
      fermer();
      const active = bouton.getAttribute('aria-checked') === 'true';
      toast(bouton.dataset.ckFinalite === 'audience'
        ? (active ? 'Vos visites sont de nouveau comptées.' : 'Vos visites ne sont plus comptées.')
        : (active ? 'Le parcours de vos visites sera suivi à partir de la page suivante.' : 'Le parcours de vos visites n’est plus suivi.'));
    });
    document.addEventListener('vysora:cookies-choisis', evenement => rafraichir(evenement.detail));
    if (E) E.on((_, changes = []) => { if (changes.includes('cookies')) rafraichir(choixActuel()); });
    rafraichir(choixActuel());
  }

  function monter() {
    completerSprite();
    const evitement = $('.skip-link');
    if (evitement) evitement.insertAdjacentHTML('afterend', panneauHTML()); else document.body.insertAdjacentHTML('afterbegin', panneauHTML());
    panneau = $('[data-ck-panneau]');
    onglets = $$('[data-ck-onglet]', panneau);

    panneau.addEventListener('close', () => { if (document.activeElement === document.body) $('#contenu')?.focus({ preventScroll: true }); });
    // Échap ne ferme que la fenêtre rouverte depuis le pied de page : la première attend un choix.
    panneau.addEventListener('keydown', evenement => { if (evenement.key === 'Escape' && premiere()) evenement.preventDefault(); });
    panneau.addEventListener('cancel', evenement => { if (premiere()) evenement.preventDefault(); });
    // Onglets au clavier (flèches, début, fin).
    panneau.addEventListener('keydown', evenement => {
      const actuel = onglets.indexOf(evenement.target);
      if (actuel < 0) return;
      const suivant = { ArrowRight: (actuel + 1) % onglets.length, ArrowLeft: (actuel - 1 + onglets.length) % onglets.length, Home: 0, End: onglets.length - 1 }[evenement.key];
      if (suivant === undefined) return;
      evenement.preventDefault();
      afficherVue(onglets[suivant].dataset.ckOnglet, { focus: true });
    });

    document.addEventListener('click', evenement => {
      const cible = evenement.target;
      const interrupteur = cible.closest('[data-ck-panneau] [data-ck-finalite]');
      if (interrupteur) { basculer(interrupteur); return; }
      const onglet = cible.closest('[data-ck-onglet]');
      if (onglet) { afficherVue(onglet.dataset.ckOnglet); return; }
      if (cible.closest('[data-ck-gerer]')) { evenement.preventDefault(); ouvrirGestion(); return; }
      if (cible.closest('[data-ck-fermer]')) { fermer(); return; }
      const action = cible.closest('[data-ck-action]')?.dataset.ckAction;
      if (action === 'refuser') choisir({ audience: false, parcours: false });
      else if (action === 'accepter') choisir({ audience: true, parcours: true });
      else if (action === 'personnaliser') afficherVue('details', { focus: true });
      else if (action === 'enregistrer') choisir(lire(panneau));
    });

    // État « Cookies » du panneau Tweaks : « Choix à faire » rouvre la première fenêtre.
    if (E) {
      if (E.get().cookies !== 'choisis') ouvrirPremiere();
      E.on((etat, changes = []) => {
        if (!changes.includes('cookies')) return;
        if (etat.cookies === 'choisis') fermer();
        else { try { localStorage.removeItem(CLE); } catch { /* stockage indisponible */ } ouvrirPremiere(); }
      });
    }
    pageCookies();
    // commun.js ajoute « Cookies » au pied de page pendant son propre démarrage : on passe après lui.
    setTimeout(lienPiedDePage, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter);
  else monter();
})();
