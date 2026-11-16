'use strict';

/* Outils communs aux écrans de l'équipe (modération et administration), chargés après commun.js.
   Dans le site : components/OngletsModeration.astro, OngletsAdministration.astro,
   scripts/commun/administration.ts, lib/moderation.ts et lib/zones-reservees.ts.
   - EQ.monter({ action, quoi, rendre }) : la page n'existe que pour son public. Un visiteur ou un
     membre sans le rôle voit « Page introuvable » (le site répond sa page 404, ADM-04) ; un compte
     de l'équipe en lecture seule (e-mail, conditions, suspension) lit la raison (bloc d'accès) ;
     sinon rendre() dessine la page. Rejoué à chaque changement d'état (panneau Tweaks).
   - EQ.ongletsModeration(actif, nombres) et EQ.ongletsAdministration(actif) : barre d'onglets.
   - EQ.confirmer({ titre, texte, libelle, annuler, action }) : fenêtre de confirmation avant un changement.
   - Dates et durées : EQ.dateCourte, EQ.dateLongue, EQ.dateHeure, EQ.anciennete, EQ.pluriel. */

window.Equipe = (() => {
  const V = window.Vysora;
  const E = window.VysoraEtats;
  const { $, $$, t, fmt, icon } = V;

  /* Dates ---------------------------------------------------------------------------------------- */

  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const versDate = valeur => (valeur instanceof Date ? valeur : new Date(valeur));
  /* Comme lib/texte.ts du site : dates lues en temps universel, année toujours donnée. */
  const jour = d => (d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate()));
  /** « 12 oct. 2026 ». */
  const dateCourte = valeur => { const d = versDate(valeur); return `${jour(d)} ${MOIS_COURTS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  /** « 12 novembre 2026 ». */
  const dateLongue = valeur => { const d = versDate(valeur); return `${jour(d)} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  /** « 12 oct. 2026 à 14 h 05 ». */
  const dateHeure = valeur => { const d = versDate(valeur); return `${dateCourte(d)} à ${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const pluriel = (n, un, plusieurs) => `${fmt(n)} ${n > 1 ? plusieurs : un}`;
  /** Temps écoulé : « 25 min », « 5 h », « 3 jours » (lib/moderation.ts, anciennete). */
  function anciennete(depuis, maintenant = new Date()) {
    const minutes = Math.floor((maintenant - versDate(depuis)) / 60000);
    if (minutes < 60) return `${fmt(Math.max(1, minutes))} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 48) return `${fmt(heures)} h`;
    return pluriel(Math.floor(heures / 24), 'jour', 'jours');
  }
  /** Date d'il y a n heures (données simulées relatives au moment de la visite). */
  const ilYa = (heures = 0, minutes = 0) => new Date(Date.now() - (heures * 60 + minutes) * 60000).toISOString();

  /* Onglets -------------------------------------------------------------------------------------- */

  const ONGLETS_MODERATION = [
    ['signalements', 'Signalements', 'moderation.html'],
    ['cas', 'Cas à valider', 'moderation-cas.html']
  ];
  const ONGLETS_ADMINISTRATION = [
    ['roles', 'Rôles', 'administration.html'],
    ['invitations', 'Invitations', 'administration-invitations.html'],
    ['defis', 'Défis', 'administration-defis.html'],
    ['guides', 'Guides', 'administration-guides.html'],
    ['savoirs', 'Savoirs', 'administration-savoirs.html'],
    ['referentiels', 'Référentiels', 'administration-referentiels.html'],
    ['documents', 'Documents légaux', 'administration-documents-legaux.html'],
    ['decisions', 'Journal des décisions', 'administration-decisions.html'],
    ['audit', 'Journal d’audit', 'administration-journal-audit.html'],
    ['audience', 'Audience', 'administration-audience.html'],
    ['assistants', 'Assistants d’IA', 'administration-assistants-ia.html']
  ];
  const ongletsHTML = (onglets, actif, etiquette, nombres = {}) => `<nav class="md-onglets" aria-label="${etiquette}">${onglets
    .map(([cle, libelle, href]) => `<a href="${href}"${cle === actif ? ' aria-current="page"' : ''}>${t(libelle)}${nombres[cle] !== undefined ? `<span class="md-onglet-nb">${fmt(nombres[cle])}</span>` : ''}</a>`)
    .join('')}</nav>`;
  const ongletsModeration = (actif, nombres) => ongletsHTML(ONGLETS_MODERATION, actif, 'Écrans de modération', nombres);
  const ongletsAdministration = actif => ongletsHTML(ONGLETS_ADMINISTRATION, actif, 'Écrans d’administration');

  /* Accès ---------------------------------------------------------------------------------------- */

  /* Rendu de la page 404 du site, à la place de la page (ADM-04). */
  const introuvableHTML = () => `<div class="container md-tete">
      <p class="md-rubrique">${icon('compass', 'icon icon-sm')}Page introuvable</p>
      <h1>Cette page n’existe pas ou n’est plus disponible</h1>
      <p class="md-statut">${t('L’adresse est peut-être incomplète, ou le contenu a été retiré par son auteur. Les créations, les sujets du forum et les cas Bon réflexe restent accessibles depuis Explorer.')}</p>
      <p style="display:flex; flex-wrap:wrap; gap:10px; margin-top:24px"><a class="btn btn-primary" href="explorer.html">Explorer les créations${icon('arrow')}</a><a class="btn btn-secondary" href="index.html">Retour à l’accueil</a></p>
    </div>`;

  /**
   * Monte une page de l'équipe. `rendre()` dessine le contenu de [data-eq-page] ; `titre` est le
   * titre de l'onglet du navigateur.
   */
  function monter({ action = 'moderer', quoi = 'accéder à cette page', titre = document.title, rendre }) {
    const main = $('main');
    const page = $('[data-eq-page]');
    let zone404 = $('[data-eq-introuvable]');
    if (!zone404) {
      main.insertAdjacentHTML('afterbegin', '<div data-eq-introuvable hidden></div>');
      zone404 = $('[data-eq-introuvable]');
    }
    const appliquer = () => {
      const raison = E.raison(action);
      const introuvable = raison === 'connexion' || raison === 'role';
      zone404.hidden = !introuvable;
      page.hidden = introuvable;
      document.title = introuvable ? 'Page introuvable · Vysora' : titre;
      if (introuvable) { zone404.innerHTML = introuvableHTML(); return; }
      zone404.replaceChildren();
      if (raison) {
        page.innerHTML = `<div class="container md-tete"><p class="md-rubrique">${icon(action === 'administrer' ? 'panel' : 'shield', 'icon icon-sm')}${action === 'administrer' ? 'Administration' : 'Modération'}</p></div><div class="container md-acces">${V.accesBloc(action, quoi)}</div>`;
        return;
      }
      rendre();
      V.fixTypography(page);
    };
    E.on(appliquer);
    appliquer();
    return appliquer;
  }

  /* Fenêtre de confirmation ---------------------------------------------------------------------- */

  let suite = null;
  function dialogue() {
    let d = $('[data-eq-dialogue]');
    if (d) return d;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="md-dialogue" aria-labelledby="eq-dialogue-titre" aria-describedby="eq-dialogue-texte" data-eq-dialogue>
        <form method="dialog" class="md-dialogue-form">
          <h2 id="eq-dialogue-titre" data-eq-dialogue-titre></h2>
          <p id="eq-dialogue-texte" data-eq-dialogue-texte></p>
          <div class="md-dialogue-actions">
            <button class="btn btn-secondary" type="submit" value="annuler" data-eq-annuler>Annuler</button>
            <button class="btn btn-primary" type="button" data-eq-confirmer>Confirmer</button>
          </div>
        </form>
      </dialog>`);
    d = $('[data-eq-dialogue]');
    $('[data-eq-confirmer]', d).addEventListener('click', () => {
      d.close();
      const action = suite;
      suite = null;
      if (action) action();
    });
    return d;
  }
  /** Fenêtre de confirmation ; « Confirmer » (ou le libellé donné) lance l'action. `annuler` :
      libellé du bouton qui referme sans rien faire (« Revenir » dans la plupart des écrans
      d'administration du site, « Annuler » dans la modération, les rôles et le dossier d'un membre). */
  function confirmer({ titre, texte, libelle = 'Confirmer', annuler = 'Annuler', action }) {
    const d = dialogue();
    $('[data-eq-annuler]', d).textContent = annuler;
    $('[data-eq-dialogue-titre]', d).textContent = V.typo(titre);
    $('[data-eq-dialogue-texte]', d).textContent = V.typo(texte);
    $('[data-eq-confirmer]', d).textContent = V.typo(libelle);
    suite = action;
    d.showModal();
  }

  /** Après un changement simulé : message passager et élément visé amené à l'écran. */
  function apres(message, cible) {
    V.toast(message);
    if (cible) requestAnimationFrame(() => cible.scrollIntoView({ block: 'center' }));
  }

  return {
    $, $$, t, fmt, icon,
    dateCourte, dateLongue, dateHeure, anciennete, ilYa, pluriel,
    ongletsModeration, ongletsAdministration, ONGLETS_ADMINISTRATION,
    monter, confirmer, apres
  };
})();
