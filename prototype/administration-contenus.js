'use strict';

/* Outils communs aux écrans d'administration des contenus (défis, guides d'Explorer, savoirs
   d'Apprendre), chargés après equipe.js. Dans le site : scripts/commun/administration.ts (fenêtre de
   confirmation, erreurs sous chaque champ, rechargement sur l'élément modifié), lib/texte.ts (dates
   en temps universel), lib/guides-admin.ts (numéro d'un contenu, état d'un contenu du guide).
   - AC.monter({ cle, etats, defaults, quoi, titre, rendre }) : en-tête, panneau Tweaks (états de la
     page), accès réservé aux administrateurs (« Page introuvable » sinon), message laissé par la page
     précédente et élément visé par l'adresse.
   - AC.etat(domaine) / AC.garder(domaine, valeur) : changements simulés, gardés pour la session du
     navigateur (sessionStorage) ; AC.rechargerSur(ancre, message) recharge la page comme le site.
   - AC.confirmer(titre, texte, libelle, action, danger) : fenêtre de confirmation du site (« Revenir »).
   - Guides : AC.guides() (état simulé : guides, pièges relus, objectifs cherchés), AC.contenu(id),
     AC.adresseContenu(c), AC.etatContenu(c), AC.aRelire(guideId), AC.numeroDeContenu(saisie). */

window.AdminContenus = (() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_ADMIN_CONTENUS;
  const { $, $$, t, esc, fmt, icon } = V;

  /* Dates et nombres (lib/texte.ts) : en temps universel, année comprise ------------------------- */

  const FORMAT_COURT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const FORMAT_LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  /** « 12 oct. 2026 », « 1er nov. 2026 ». */
  const dateCourte = valeur => FORMAT_COURT.format(new Date(valeur)).replace(/^1 /, '1er ');
  /** « 23 octobre 2026 ». */
  const dateLongue = valeur => FORMAT_LONG.format(new Date(valeur)).replace(/^1 /, '1er ');
  const pluriel = (n, un, plusieurs) => `${fmt(n)} ${n > 1 ? plusieurs : un}`;
  const ilYa = heures => new Date(Date.now() - heures * 3600000).toISOString();

  /** Adresse d'un guide, proposée d'après son nom court (@vysora/shared : slugifier). */
  const slugifier = (texte, longueurMax = 80) => String(texte)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, longueurMax).replace(/-+$/g, '');

  /** Numéro d'un contenu tiré de son adresse (/creations/12-titre, /forum/4-titre,
      /bon-reflexe/7-titre, avec ou sans le nom du site) ou saisi tel quel ; null sinon. */
  function numeroDeContenu(saisie) {
    const texte = String(saisie).trim();
    const adresse = /\/(?:creations|forum|bon-reflexe)\/(\d{1,15})(?:[-/?#]|$)/.exec(texte);
    const numero = adresse?.[1] ?? /^(?:n°\s*|#)?(\d{1,15})$/i.exec(texte)?.[1];
    const valeur = numero ? Number(numero) : Number.NaN;
    return Number.isSafeInteger(valeur) && valeur > 0 ? valeur : null;
  }

  /** Texte exigé et borné (schémas de @vysora/shared : « L’objectif compte au moins 10 caractères. »). */
  function requis(valeur, { min = 1, max }, vide, quoi) {
    const v = String(valeur ?? '').trim();
    if (!v) return vide;
    if (v.length < min) return `${quoi} compte au moins ${min} caractères.`;
    if (v.length > max) return `${quoi} compte ${fmt(max)} caractères au plus.`;
    return null;
  }

  /** Photo d'un membre (AvatarMembre.astro) ; sans photo, la silhouette par défaut. */
  const avatar = (m, taille, classe = '') => (m.avatar
    ? `<img${classe ? ` class="${classe}"` : ''} src="${esc(m.avatar)}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar${classe ? ` ${classe}` : ''}" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', '')}</span>`);

  /* État simulé, gardé pour la session du navigateur ---------------------------------------------- */

  const CLE = 'vysora-admin-contenus';
  const tout = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || '{}') || {}; } catch { return {}; } };
  /** Copie de travail d'un domaine (« defis », « guides », « savoirs »), initialisée depuis les données. */
  function etat(domaine, initial) {
    const garde = tout()[domaine];
    return garde ? garde : JSON.parse(JSON.stringify(initial()));
  }
  function garder(domaine, valeur) {
    const toutes = tout();
    toutes[domaine] = valeur;
    try { sessionStorage.setItem(CLE, JSON.stringify(toutes)); } catch { /* stockage indisponible */ }
  }

  /* Message après chargement et rechargement sur l'élément modifié ------------------------------- */

  const CLE_MESSAGE = 'vysora-admin-contenus-message';
  function messageApresChargement(message, iconeToast = 'check') {
    try { sessionStorage.setItem(CLE_MESSAGE, JSON.stringify([message, iconeToast])); } catch { /* le message est perdu */ }
  }
  function lireMessage() {
    try {
      const brut = sessionStorage.getItem(CLE_MESSAGE);
      if (brut) sessionStorage.removeItem(CLE_MESSAGE);
      return brut ? JSON.parse(brut) : null;
    } catch { return null; }
  }
  /** Après un changement, la page se recharge sur l'élément concerné (ouvert s'il se déplie). */
  function rechargerSur(ancre, message) {
    messageApresChargement(message);
    history.replaceState(null, '', `${location.pathname}${location.search}${ancre ? `#${ancre}` : ''}`);
    history.scrollRestoration = 'manual';
    window.location.reload();
  }
  /** Au chargement, l'élément désigné par l'adresse est ouvert et amené en haut de l'écran. */
  function allerALElementVise() {
    if (!/^#[a-z][\w-]*$/.test(location.hash)) return;
    const vise = document.getElementById(location.hash.slice(1));
    if (!vise) return;
    if (vise instanceof HTMLDetailsElement) vise.open = true;
    setTimeout(() => vise.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
  }

  /* Fenêtre de confirmation (dialog des écrans d'administration du site) --------------------------- */

  let suite = null;
  function dialogue() {
    let d = $('[data-ad-dialogue]');
    if (d) return d;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="md-dialogue" aria-labelledby="ad-dialogue-titre" aria-describedby="ad-dialogue-texte" data-ad-dialogue>
        <form method="dialog">
          <h2 id="ad-dialogue-titre" data-ad-dialogue-titre></h2>
          <p id="ad-dialogue-texte" data-ad-dialogue-texte></p>
          <div class="md-dialogue-actions">
            <button class="btn btn-secondary" type="submit" value="annuler">Revenir</button>
            <button class="btn btn-primary" type="button" data-ad-confirmer>Confirmer</button>
          </div>
        </form>
      </dialog>`);
    d = $('[data-ad-dialogue]');
    $('[data-ad-confirmer]', d).addEventListener('click', () => {
      d.close();
      const action = suite;
      suite = null;
      if (action) action();
    });
    return d;
  }
  /** Fenêtre de confirmation ; « Confirmer » (ou le libellé donné) lance l'action. Le bouton rouge
      signale une action définitive. */
  function confirmer(titre, texte, libelle, action, danger = false) {
    const d = dialogue();
    $('[data-ad-dialogue-titre]', d).textContent = V.typo(titre);
    $('[data-ad-dialogue-texte]', d).textContent = V.typo(texte);
    const bouton = $('[data-ad-confirmer]', d);
    bouton.textContent = V.typo(libelle);
    bouton.classList.toggle('is-danger', danger);
    suite = action;
    d.showModal();
  }

  /* Erreurs des formulaires --------------------------------------------------------------------- */

  /** Erreurs d'un formulaire, chacune sous son champ (`data-ad-erreur`), « general » en dernier. */
  function afficherErreurs(formulaire, erreurs) {
    $$('[data-ad-erreur]', formulaire).forEach(zone => {
      const message = erreurs[zone.dataset.adErreur || ''] || '';
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      zone.closest('.ad-champ')?.querySelector('input, select, textarea')?.setAttribute('aria-invalid', String(Boolean(message)));
    });
  }
  /** Refus d'une action sans formulaire (réponse 409 ou 404 de l'API). */
  const signalerRefus = message => V.toast(message, 'alert');

  /* Guides d'Explorer : état simulé et contenus ----------------------------------------------------- */

  const CONTENUS = new Map(D.contenus.map(c => [c.id, c]));
  const contenu = id => CONTENUS.get(Number(id)) || null;
  /** Guides, pièges signalés relus et objectifs cherchés, avec les changements de la session. */
  const guides = () => etat('guides', () => ({ guides: D.guides, relues: [], demandes: D.demandes, prochains: { guide: 14, etape: 900, piege: 900, demande: 60 } }));
  const garderGuides = valeur => garder('guides', valeur);
  /** Page publique d'un contenu du guide (lib/guides-admin.ts : adresseContenuGuide). */
  function adresseContenu(c) {
    if (c.type === 'CREATION') return `fiche-creation.html?id=${encodeURIComponent(c.cle)}`;
    if (c.type === 'SUJET') return `forum.html?sujet=${encodeURIComponent(c.cle)}`;
    return `apprendre.html?cas=${encodeURIComponent(c.cle)}`;
  }
  /** Pourquoi Explorer ne présente pas un contenu du guide (RG-30), ou null. */
  function etatContenu(c) {
    switch (c.etat) {
      case 'MASQUE': return 'Masqué par la modération';
      case 'SUPPRIME': return 'Supprimé';
      case 'NON_PUBLIE': return c.type === 'CAS_BON_REFLEXE' ? 'En cours de réexamen' : 'Repassé en brouillon';
      default: return null;
    }
  }
  /** Pièges signalés en attente de relecture (ceux de la deuxième page comptent s'ils sont montrés). */
  function propositions(avecEnPlus = false) {
    const { relues } = guides();
    return [...D.propositions, ...(avecEnPlus ? D.propositionsEnPlus : [])]
      .filter(p => !relues.includes(p.id))
      .sort((a, b) => b.ilYa - a.ilYa || a.id - b.id);
  }
  const aRelire = guideId => propositions().filter(p => guideId === undefined || p.guideId === guideId).length;

  /* Montage d'une page -------------------------------------------------------------------------------- */

  function monter({ cle, etats = [], defaults = {}, quoi, titre, rendre }) {
    let reglages = {};
    V.initHeader();
    reglages = V.initTweaks({
      key: cle,
      etats,
      apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
      defaults,
      onChange: (change, suivant) => { reglages = suivant; if (change !== 'init') majPage(); }
    }) || {};
    const majPage = EQ.monter({ action: 'administrer', quoi, titre, rendre: () => rendre(reglages) });
    const message = lireMessage();
    if (message && !$('[data-eq-page]').hidden) V.toast(...message);
    allerALElementVise();
    document.body.classList.add('is-ready');
    return majPage;
  }

  /** Tête commune : « Administration », titre, statut et onglets. */
  const tete = ({ titre, statut = '', onglet, suite: apres = '' }) => `<div class="container md-tete">
      <p class="md-rubrique">${icon('shield')}Administration</p>
      <h1>${t(titre)}</h1>
      ${statut}
      ${EQ.ongletsAdministration(onglet)}
      ${apres}
    </div>`;

  return {
    D, $, $$, t, esc, fmt, icon,
    dateCourte, dateLongue, pluriel, ilYa, slugifier, numeroDeContenu, requis, avatar,
    etat, garder, messageApresChargement, rechargerSur, allerALElementVise,
    confirmer, afficherErreurs, signalerRefus,
    contenu, guides, garderGuides, adresseContenu, etatContenu, propositions, aRelire,
    monter, tete
  };
})();
