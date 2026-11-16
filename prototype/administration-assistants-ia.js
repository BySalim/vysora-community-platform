'use strict';

/* Assistants d'IA (REF-03) : ce que ChatGPT, Claude, Perplexity et les autres lisent de Vysora, et les
   visites qu'ils envoient, sur 7, 30 ou 90 jours (?jours=). Démo de l'écran du site
   (apps/web/src/pages/admin/assistants-ia.astro, lib/assistants-ia.ts, @vysora/shared
   assistants-ia.ts) : mêmes balisage, classes et textes ; mesure simulée dans
   administration-referentiels-data.js. Les adresses affichées sont celles du site ; leurs liens
   mènent aux pages du prototype. États dans le panneau Tweaks : passages relevés ou aucun. */

(() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_ADMIN_REFERENTIELS;
  const { $, t, fmt, esc, icon } = V;
  const pluriel = EQ.pluriel;

  const PERIODES = [7, 30, 90];
  const CONSERVATION_MOIS = 13;
  const LIBELLES_NATURE = {
    VISITE: 'Visites envoyées', LECTURE: 'Pages lues pour une personne',
    EXPLORATION: 'Pages explorées pour leur index', ENTRAINEMENT: 'Demandes des robots d’entraînement'
  };
  const CHIFFRES = [
    { nature: 'VISITE', aide: 'Personnes arrivées sur Vysora depuis un lien cité dans une réponse.' },
    { nature: 'LECTURE', aide: 'Pages qu’un assistant a ouvertes pour répondre à une question.' },
    { nature: 'EXPLORATION', aide: 'Pages parcourues par les robots de recherche des assistants.' },
    { nature: 'ENTRAINEMENT', aide: 'Collecte pour entraîner des modèles, que robots.txt refuse.' }
  ];
  const dateLongue = iso => EQ.dateLongue(new Date(`${iso}T12:00:00`));
  const nombre = n => (n ? fmt(n) : '–');

  function rendre(reglages) {
    const demandee = Number(new URLSearchParams(location.search).get('jours'));
    const jours = PERIODES.includes(demandee) ? demandee : 30;
    const mesure = D.assistants(jours);
    if (reglages.passages === 'aucun') Object.assign(mesure, { totaux: { VISITE: 0, LECTURE: 0, EXPLORATION: 0, ENTRAINEMENT: 0 }, assistants: [], pages: [] });
    const total = Object.values(mesure.totaux).reduce((s, n) => s + n, 0);

    $('[data-eq-page]').innerHTML = `<div class="container md-tete">
        <p class="md-rubrique">${icon('shield')}Administration</p>
        <h1>Assistants d’IA</h1>
        <p class="md-statut">
          <span class="is-fort">${total ? pluriel(total, 'passage', 'passages') : 'Aucun passage'}${t(` du ${dateLongue(mesure.du)} au ${dateLongue(mesure.au)}`)}</span>
          <span>${t('ChatGPT, Claude, Perplexity et les autres assistants : ce qu’ils lisent de Vysora et les visites qu’ils envoient.')}</span>
        </p>
        ${EQ.ongletsAdministration('assistants')}
      </div>
      <div class="container md-file">
        <nav class="ad-sous-onglets" aria-label="Période">${PERIODES.map(n => `<a href="administration-assistants-ia.html?jours=${n}"${n === jours ? ' aria-current="page"' : ''}>${n} derniers jours</a>`).join('')}</nav>

        <ul class="ad-chiffres">${CHIFFRES.map(({ nature, aide }) => `<li class="ad-chiffre${nature === 'ENTRAINEMENT' ? ' is-discret' : ''}"><b>${fmt(mesure.totaux[nature])}</b><span class="ad-chiffre-nom">${t(LIBELLES_NATURE[nature])}</span><span class="ad-chiffre-aide">${t(aide)}</span></li>`).join('')}</ul>

        ${mesure.assistants.length ? `<section class="ad-famille" aria-labelledby="ad-assistants-titre">
            <h2 id="ad-assistants-titre">Par assistant<span class="ad-famille-nb">${fmt(mesure.assistants.length)}</span></h2>
            <table class="ad-table ad-mesure">
              <thead><tr><th scope="col">Assistant</th><th scope="col">Visites envoyées</th><th scope="col">Pages lues</th><th scope="col">Pages explorées</th><th scope="col">Entraînement</th></tr></thead>
              <tbody>${mesure.assistants.map(a => `<tr>
                  <td><b>${t(a.nom)}</b></td>
                  <td data-libelle="Visites envoyées">${nombre(a.VISITE)}</td>
                  <td data-libelle="Pages lues">${nombre(a.LECTURE)}</td>
                  <td data-libelle="Pages explorées">${nombre(a.EXPLORATION)}</td>
                  <td data-libelle="Entraînement">${nombre(a.ENTRAINEMENT)}</td>
                </tr>`).join('')}</tbody>
            </table>
          </section>
          ${mesure.pages.length ? `<section class="ad-famille" aria-labelledby="ad-pages-titre">
            <h2 id="ad-pages-titre">Pages les plus consultées<span class="ad-famille-nb">${fmt(mesure.pages.length)}</span></h2>
            <table class="ad-table ad-mesure">
              <thead><tr><th scope="col">Page</th><th scope="col">Visites envoyées</th><th scope="col">Pages lues</th><th scope="col">Pages explorées</th></tr></thead>
              <tbody>${mesure.pages.map(p => `<tr>
                  <td><a class="ad-lien" href="${esc(D.versPrototype(p.chemin))}"><code>${esc(p.chemin)}</code></a></td>
                  <td data-libelle="Visites envoyées">${nombre(p.VISITE)}</td>
                  <td data-libelle="Pages lues">${nombre(p.LECTURE)}</td>
                  <td data-libelle="Pages explorées">${nombre(p.EXPLORATION)}</td>
                </tr>`).join('')}</tbody>
            </table>
          </section>` : ''}`
          : `<p class="md-rien ad-vide">${t('Aucun assistant d’IA n’est passé sur Vysora pendant cette période.')}</p>`}

        <p class="ad-mesure-note">${t(`Les assistants se reconnaissent au nom de leurs robots et à l’adresse d’où viennent les visites ; un programme peut imiter ce nom : ces chiffres donnent un ordre de grandeur. Vysora ne garde qu’un compteur par jour et par page, sans rien sur les personnes ni sur les appareils, pendant ${CONSERVATION_MOIS} mois.`)}</p>
      </div>`;
  }

  let reglages = {};
  V.initHeader();
  reglages = V.initTweaks({
    key: 'vysora-admin-assistants-reglages',
    etats: [{ name: 'passages', legend: 'Passages', options: [['releves', 'Passages relevés'], ['aucun', 'Aucun passage sur la période']] }],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: { passages: 'releves' },
    onChange: (change, valeurs) => { reglages = valeurs; if (change !== 'init') majPage(); }
  }) || {};
  const majPage = EQ.monter({ action: 'administrer', quoi: 'consulter la mesure des assistants d’IA', titre: 'Assistants d’IA · Vysora', rendre: () => rendre(reglages) });
  document.body.classList.add('is-ready');
})();
