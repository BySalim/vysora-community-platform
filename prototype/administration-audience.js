'use strict';

/* Audience (LEG-03) : fréquentation du site, problèmes techniques et parcours des visites suivies avec
   l'accord des personnes, sur 7, 30 ou 90 jours (?jours=). Démo de l'écran du site
   (apps/web/src/pages/admin/audience.astro, lib/audience.ts, @vysora/shared audience.ts) : mêmes
   balisage, classes et textes ; mesure simulée dans administration-referentiels-data.js. Les adresses
   affichées sont celles du site ; leurs liens mènent aux pages du prototype.
   États dans le panneau Tweaks : mesure complète, sans problème technique, sans visite suivie,
   ou période sans aucune visite. */

(() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_ADMIN_REFERENTIELS;
  const { $, t, fmt, esc, icon } = V;
  const pluriel = EQ.pluriel;

  /* Libellés et repères (@vysora/shared : audience.ts, assistants-ia.ts, regles.ts) ------------- */

  const PERIODES = [7, 30, 90];
  const DELAIS = { conservationVisiteursJours: 2, conservationAudienceMois: 25, conservationParcoursMois: 3, inactiviteParcoursMinutes: 30 };
  const LIBELLES_APPAREIL = { ORDINATEUR: 'Ordinateur', MOBILE: 'Mobile', TABLETTE: 'Tablette' };
  const LIBELLES_NAVIGATEUR = { CHROME: 'Chrome', SAFARI: 'Safari', FIREFOX: 'Firefox', EDGE: 'Edge', OPERA: 'Opera', SAMSUNG: 'Samsung Internet', AUTRE: 'Autres navigateurs' };
  const LIBELLES_SYSTEME = { WINDOWS: 'Windows', MACOS: 'macOS', IOS: 'iOS et iPadOS', ANDROID: 'Android', LINUX: 'Linux', CHROMEOS: 'ChromeOS', AUTRE: 'Autres systèmes' };
  const LIBELLES_EVENEMENT = {
    INSCRIPTION: 'Inscription', CONNEXION: 'Connexion', CREATION_PUBLIEE: 'Création publiée', SUJET_PUBLIE: 'Sujet ouvert au forum',
    REPONSE_PUBLIEE: 'Réponse au forum', COMMENTAIRE_PUBLIE: 'Commentaire', ESSAI_DECLARE: 'Essai déclaré', VOTE: 'Vote',
    MESSAGE_CONTACT: 'Message à l’équipe', RECHERCHE: 'Recherche'
  };
  const libelleProvenance = valeur => (valeur === '(direct)' ? 'Accès direct' : valeur === '(site)' ? 'Déjà sur le site' : valeur);

  /* Dates et durées (lib/texte.ts) ------------------------------------------------------------ */

  const jour = iso => new Date(`${iso}T12:00:00`);
  const dateLongue = iso => EQ.dateLongue(jour(iso));
  const dateCourte = iso => { const d = jour(iso); const texte = EQ.dateCourte(d); return /\d{4}$/.test(texte) ? texte : `${texte} ${d.getFullYear()}`; };
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  /** « lundi 16 novembre à 14 h 05 ». */
  const jourEtHeure = valeur => { const d = new Date(valeur); return `${formatJour.format(d).replace(/ 1 /, ' 1er ')} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };
  const part = (n, total) => {
    if (!total) return '–';
    const pourcent = Math.round((n / total) * 100);
    return n > 0 && pourcent === 0 ? '< 1 %' : `${pourcent} %`;
  };
  const duree = secondes => {
    if (secondes < 60) return `${secondes} s`;
    const minutes = Math.floor(secondes / 60);
    if (minutes < 60) return `${minutes} min ${String(secondes % 60).padStart(2, '0')} s`;
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  };
  const lien = chemin => `<a class="ad-lien" href="${esc(D.versPrototype(chemin))}"><code>${esc(chemin)}</code></a>`;

  /* Mesure de la période, selon l'état choisi ------------------------------------------------- */

  function mesureDe(jours, etat) {
    const m = D.audience(jours);
    const sansProbleme = () => {
      m.problemes = { introuvables: [], erreursPages: [], erreursApi: [], erreursNavigateur: [] };
      m.chiffres.problemes = 0;
      m.parcours.avecErreur = [];
    };
    if (etat === 'sans-probleme') sansProbleme();
    if (etat === 'sans-parcours') m.parcours = { ...m.parcours, visites: 0, entrees: [], sorties: [], enchainements: [], evenements: [], avecErreur: [] };
    if (etat === 'vide') {
      sansProbleme();
      m.chiffres = { visiteurs: 0, visites: 0, pagesVues: 0, problemes: 0 };
      m.parJour = m.parJour.map(p => ({ ...p, visiteurs: 0, pagesVues: 0 }));
      Object.assign(m, { pages: [], provenances: [], appareils: [], navigateurs: [], systemes: [] });
      m.parcours = { ...m.parcours, visites: 0, entrees: [], sorties: [], enchainements: [], evenements: [], avecErreur: [] };
    }
    return m;
  }

  /* Rendu (pages/admin/audience.astro) --------------------------------------------------------- */

  function rendre(reglages) {
    const demandee = Number(new URLSearchParams(location.search).get('jours'));
    const jours = PERIODES.includes(demandee) ? demandee : 30;
    const mesure = mesureDe(jours, reglages.mesure);
    const parcours = mesure.parcours;
    const CHIFFRES = [
      { valeur: mesure.chiffres.visiteurs, nom: 'Visiteurs', aide: 'Personnes différentes chaque jour, additionnées : qui revient trois jours compte trois fois.' },
      { valeur: mesure.chiffres.visites, nom: 'Arrivées', aide: 'Visites venues d’un autre site, d’un lien direct ou d’une campagne.' },
      { valeur: mesure.chiffres.pagesVues, nom: 'Pages vues', aide: 'Pages servies aux personnes, hors robots et pages de l’équipe.' },
      { valeur: mesure.chiffres.problemes, nom: 'Problèmes', aide: 'Pages introuvables ou en erreur, erreurs de l’API et des scripts.' }
    ];
    const maxVisiteurs = Math.max(1, ...mesure.parJour.map(p => p.visiteurs));
    const repartitions = [
      { titre: 'Appareils', lignes: mesure.appareils.map(a => ({ nom: LIBELLES_APPAREIL[a.code], nombre: a.nombre })) },
      { titre: 'Navigateurs', lignes: mesure.navigateurs.map(a => ({ nom: LIBELLES_NAVIGATEUR[a.code], nombre: a.nombre })) },
      { titre: 'Systèmes', lignes: mesure.systemes.map(a => ({ nom: LIBELLES_SYSTEME[a.code], nombre: a.nombre })) }
    ];
    const problemes = [
      { titre: 'Pages introuvables', lignes: mesure.problemes.introuvables },
      { titre: 'Pages en erreur', lignes: mesure.problemes.erreursPages },
      { titre: 'Erreurs de l’API', lignes: mesure.problemes.erreursApi }
    ];
    const aucunProbleme = problemes.every(p => !p.lignes.length) && !mesure.problemes.erreursNavigateur.length;
    const etape = e => (e.nature === 'PAGE' ? { nature: 'Page', texte: e.valeur, detail: '' }
      : e.nature === 'EVENEMENT' ? { nature: 'Action', texte: LIBELLES_EVENEMENT[e.valeur] || e.valeur, detail: '' }
        : { nature: 'Erreur', texte: e.valeur, detail: e.detail === '404' ? 'Page introuvable (404)' : e.detail === '500' ? 'Erreur du serveur (500)' : e.detail });
    const tableau = (entetes, lignes, classe = 'ad-table ad-mesure') => `<table class="${classe}">
        <thead><tr>${entetes.map(e => `<th scope="col">${t(e)}</th>`).join('')}</tr></thead>
        <tbody>${lignes.join('')}</tbody>
      </table>`;

    $('[data-eq-page]').innerHTML = `<div class="container md-tete">
        <p class="md-rubrique">${icon('shield')}Administration</p>
        <h1>Audience</h1>
        <p class="md-statut">
          <span class="is-fort">${mesure.chiffres.visiteurs ? pluriel(mesure.chiffres.visiteurs, 'visiteur', 'visiteurs') : 'Aucun visiteur'}${t(` du ${dateLongue(mesure.du)} au ${dateLongue(mesure.au)}`)}</span>
          <span>${t('Fréquentation du site, problèmes techniques et parcours des visites suivies avec l’accord des personnes.')}</span>
        </p>
        ${EQ.ongletsAdministration('audience')}
      </div>
      <div class="container md-file">
        <nav class="ad-sous-onglets" aria-label="Période">${PERIODES.map(n => `<a href="administration-audience.html?jours=${n}"${n === jours ? ' aria-current="page"' : ''}>${n} derniers jours</a>`).join('')}</nav>

        <ul class="ad-chiffres">${CHIFFRES.map(({ valeur, nom, aide }) => `<li class="ad-chiffre"><b>${fmt(valeur)}</b><span class="ad-chiffre-nom">${nom}</span><span class="ad-chiffre-aide">${t(aide)}</span></li>`).join('')}</ul>

        <section class="ad-famille" aria-labelledby="ad-jours-titre">
          <h2 id="ad-jours-titre">Visiteurs par jour</h2>
          <ol class="ad-courbe" style="--n: ${mesure.parJour.length}">${mesure.parJour.map(point => `<li class="ad-courbe-jour" tabindex="0" data-info="${esc(V.typo(`${dateCourte(point.jour)} · ${pluriel(point.visiteurs, 'visiteur', 'visiteurs')} · ${pluriel(point.pagesVues, 'page vue', 'pages vues')}`))}">
              <span class="ad-courbe-barre" style="--h: ${(point.visiteurs / maxVisiteurs) * 100}%" aria-hidden="true"></span>
              <span class="sr-only">${t(`${dateLongue(point.jour)} : ${pluriel(point.visiteurs, 'visiteur', 'visiteurs')}, ${pluriel(point.pagesVues, 'page vue', 'pages vues')}`)}</span>
            </li>`).join('')}</ol>
          <p class="ad-courbe-axe" aria-hidden="true"><span>${dateCourte(mesure.du)}</span><span>${t(`Au plus ${pluriel(maxVisiteurs, 'visiteur', 'visiteurs')} par jour`)}</span><span>${dateCourte(mesure.au)}</span></p>
        </section>

        ${mesure.pages.length ? `<section class="ad-famille" aria-labelledby="ad-pages-titre">
            <h2 id="ad-pages-titre">Pages les plus vues<span class="ad-famille-nb">${fmt(mesure.pages.length)}</span></h2>
            ${tableau(['Page', 'Pages vues', 'Part'], mesure.pages.map(p => `<tr><td>${lien(p.valeur)}</td><td data-libelle="Pages vues">${fmt(p.nombre)}</td><td data-libelle="Part">${t(part(p.nombre, mesure.chiffres.pagesVues))}</td></tr>`))}
          </section>

          <div class="ad-colonnes">
            <section class="ad-famille" aria-labelledby="ad-provenances-titre">
              <h2 id="ad-provenances-titre">Provenance des arrivées</h2>
              ${tableau(['Provenance', 'Arrivées', 'Part'], mesure.provenances.map(p => `<tr><td>${t(libelleProvenance(p.valeur))}</td><td data-libelle="Arrivées">${fmt(p.nombre)}</td><td data-libelle="Part">${t(part(p.nombre, mesure.chiffres.visites))}</td></tr>`))}
            </section>
            <section class="ad-famille" aria-labelledby="ad-appareils-titre">
              <h2 id="ad-appareils-titre">Appareils des visiteurs</h2>
              ${repartitions.map(r => {
                const total = r.lignes.reduce((s, l) => s + l.nombre, 0);
                return tableau([r.titre, 'Visiteurs', 'Part'], r.lignes.map(l => `<tr><td>${t(l.nom)}</td><td data-libelle="Visiteurs">${fmt(l.nombre)}</td><td data-libelle="Part">${t(part(l.nombre, total))}</td></tr>`), 'ad-table ad-mesure ad-repartition');
              }).join('')}
            </section>
          </div>` : `<p class="md-rien ad-vide">${t('Aucune page vue pendant cette période.')}</p>`}

        <section class="ad-famille" aria-labelledby="ad-problemes-titre">
          <h2 id="ad-problemes-titre">Problèmes techniques<span class="ad-famille-nb">${fmt(mesure.chiffres.problemes)}</span></h2>
          ${aucunProbleme ? `<p class="md-rien ad-vide">${t('Aucun problème relevé pendant cette période.')}</p>` : `<div class="ad-colonnes">
            ${problemes.filter(p => p.lignes.length).map(p => tableau([p.titre, 'Nombre'], p.lignes.map(l => `<tr><td><code>${esc(l.valeur)}</code></td><td data-libelle="Nombre">${fmt(l.nombre)}</td></tr>`))).join('')}
            ${mesure.problemes.erreursNavigateur.length ? tableau(['Erreurs des scripts', 'Nombre'], mesure.problemes.erreursNavigateur.map(e => `<tr><td><code>${esc(e.page)}</code><span class="ad-message">${esc(e.message)}</span></td><td data-libelle="Nombre">${fmt(e.nombre)}</td></tr>`), 'ad-table ad-mesure ad-colonne-large') : ''}
          </div>`}
        </section>

        <section class="ad-famille" aria-labelledby="ad-parcours-titre">
          <h2 id="ad-parcours-titre">Parcours des visites suivies<span class="ad-famille-nb">${fmt(parcours.visites)}</span></h2>
          <p class="ad-famille-aide">${t('Seulement les visites des personnes qui ont accepté le suivi des parcours : un échantillon, jamais relié à un compte.')}</p>
          ${parcours.visites ? `<ul class="ad-chiffres">
              <li class="ad-chiffre"><b>${fmt(parcours.visites)}</b><span class="ad-chiffre-nom">Visites suivies</span><span class="ad-chiffre-aide">${t(`${part(parcours.visites, mesure.chiffres.visites)} des arrivées de la période.`)}</span></li>
              <li class="ad-chiffre"><b>${fmt(parcours.pagesParVisite)}</b><span class="ad-chiffre-nom">Pages par visite</span><span class="ad-chiffre-aide">En moyenne.</span></li>
              <li class="ad-chiffre"><b>${t(duree(parcours.dureeMedianeSecondes))}</b><span class="ad-chiffre-nom">Durée médiane</span><span class="ad-chiffre-aide">${t('De la première à la dernière étape d’une visite.')}</span></li>
              <li class="ad-chiffre"><b>${fmt(parcours.inscription.visitesInscrites)} / ${fmt(parcours.inscription.visitesPageInscription)}</b><span class="ad-chiffre-nom">Inscriptions</span><span class="ad-chiffre-aide">${t('Visites avec une inscription, sur les visites passées par la page Inscription.')}</span></li>
            </ul>
            <div class="ad-colonnes">
              ${[{ titre: 'Pages d’entrée', lignes: parcours.entrees }, { titre: 'Pages de sortie', lignes: parcours.sorties }].map(l => tableau([l.titre, 'Visites'], l.lignes.map(x => `<tr><td><code>${esc(x.valeur)}</code></td><td data-libelle="Visites">${fmt(x.nombre)}</td></tr>`))).join('')}
              ${parcours.enchainements.length ? tableau(['Enchaînements fréquents', 'Fois'], parcours.enchainements.map(s => `<tr><td><code>${esc(s.de)}</code><span class="ad-fleche" aria-label="puis">→</span><code>${esc(s.vers)}</code></td><td data-libelle="Fois">${fmt(s.nombre)}</td></tr>`)) : ''}
              ${parcours.evenements.length ? tableau(['Actions', 'Visites'], parcours.evenements.map(e => `<tr><td>${t(LIBELLES_EVENEMENT[e.code])}</td><td data-libelle="Visites">${fmt(e.visites)}</td></tr>`)) : ''}
            </div>
            <h3 class="ad-sous-titre">Dernières visites avec une erreur</h3>
            ${parcours.avecErreur.length ? `<ol class="ad-visites">${parcours.avecErreur.map(visite => `<li class="ad-visite">
                <p class="ad-visite-tete"><b>${t(jourEtHeure(visite.debut))}</b><span>${t(`${libelleProvenance(visite.provenance)} · ${LIBELLES_APPAREIL[visite.appareil]}, ${LIBELLES_NAVIGATEUR[visite.navigateur]}, ${LIBELLES_SYSTEME[visite.systeme]}`)}</span></p>
                <ol class="ad-etapes">${visite.etapes.map(e => {
                  const vue = etape(e);
                  return `<li class="ad-etape${e.nature === 'ERREUR' ? ' is-erreur' : ''}"><span class="ad-etape-temps">${t(duree(e.secondes))}</span><span class="ad-etape-nature">${vue.nature}</span><span class="ad-etape-texte">${e.nature === 'EVENEMENT' ? t(vue.texte) : `<code>${esc(vue.texte)}</code>`}${vue.detail ? `<span class="ad-message">${esc(vue.detail)}</span>` : ''}</span></li>`;
                }).join('')}</ol>
              </li>`).join('')}</ol>` : `<p class="md-rien ad-vide">${t('Aucune visite suivie n’a rencontré d’erreur pendant cette période.')}</p>`}`
            : `<p class="md-rien ad-vide">${t('Aucune visite suivie pendant cette période.')}</p>`}
        </section>

        <p class="ad-mesure-note">${t(`Mesure faite par les serveurs de Vysora, sans outil d’un tiers. Les visiteurs ne sont reconnus que le temps d’une journée, par une empreinte effacée au bout de ${DELAIS.conservationVisiteursJours} jours ; les compteurs sont gardés ${DELAIS.conservationAudienceMois} mois. Les personnes qui refusent la mesure ne sont pas comptées. Les parcours, suivis seulement avec l’accord des personnes et jamais reliés à un compte, sont effacés au bout de ${DELAIS.conservationParcoursMois} mois ; une visite s’arrête après ${DELAIS.inactiviteParcoursMinutes} minutes sans activité.`)}</p>
      </div>`;
  }

  /* Montage ---------------------------------------------------------------------------------- */

  let reglages = {};
  V.initHeader();
  reglages = V.initTweaks({
    key: 'vysora-admin-audience-reglages',
    etats: [{ name: 'mesure', legend: 'Mesure', options: [['complete', 'Complète'], ['sans-probleme', 'Aucun problème technique'], ['sans-parcours', 'Aucune visite suivie'], ['vide', 'Aucune visite sur la période']] }],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: { mesure: 'complete' },
    onChange: (change, valeurs) => { reglages = valeurs; if (change !== 'init') majPage(); }
  }) || {};
  const majPage = EQ.monter({ action: 'administrer', quoi: 'consulter la mesure d’audience', titre: 'Audience · Vysora', rendre: () => rendre(reglages) });
  document.body.classList.add('is-ready');
})();
