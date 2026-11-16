'use strict';

/* Guides d'Explorer dans l'administration (DEC-02) : démo des écrans du site
   (apps/web/src/pages/admin/guides/index.astro, pieges.astro, demandes.astro,
   components/GuidesAdmin.astro, scripts/guides-admin.ts), mêmes balisage, classes et textes.
   - administration-guides.html : guides en préparation puis publiés, nouveau guide (adresse proposée
     d'après le nom court tant qu'elle n'a pas été saisie).
   - administration-guides-pieges.html : pièges signalés par les membres, du plus ancien au plus
     récent, par pages de 20 ; chacun se retient (réécrit et ajouté aux pièges du guide) ou s'écarte.
   - administration-guides-demandes.html : « Ce que la communauté cherche encore » (ajout, clôture,
     réouverture).
   Chaque changement se confirme et se garde pour la session du navigateur ; la page se recharge
   comme celle du site. La rédaction d'un guide : administration-guide.js. États dans le panneau
   Tweaks : liste remplie ou vide (et, pour les pièges, plus de 20 pièges). */

(() => {
  const AC = window.AdminContenus;
  const { D, $, $$, t, esc, fmt, icon } = AC;
  const vue = document.body.dataset.adVue;

  const LONGUEURS = {
    guideTitre: { min: 10, max: 150 }, guideTitreCourt: { min: 3, max: 80 },
    guidePiegeTitre: { min: 10, max: 200 }, guideSolution: { min: 10, max: 1000 }, demandeGuide: { min: 3, max: 120 }
  };
  const MAX_PIEGES = 20;
  const PAR_PAGE = 20;
  const JOURS_DEMANDES = 30;
  const MOTIF_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const domaine = id => D.domaines.find(d => d.id === Number(id)) || null;
  const idsInitiaux = liste => new Set(liste.map(x => x.id));
  const GUIDES_INITIAUX = idsInitiaux(D.guides);
  const DEMANDES_INITIALES = idsInitiaux(D.demandes);

  /* Gabarit commun (GuidesAdmin.astro) -------------------------------------------------------------- */

  const ONGLETS = [
    ['guides', 'Guides', 'administration-guides.html'],
    ['pieges', 'Pièges signalés', 'administration-guides-pieges.html'],
    ['demandes', 'Ce que la communauté cherche', 'administration-guides-demandes.html']
  ];
  const gabarit = (actif, statut, contenu) => `<div class="container md-tete">
      <p class="md-rubrique">${icon('shield')}Administration</p>
      <h1>Guides d’Explorer</h1>
      ${statut}
      ${window.Equipe.ongletsAdministration('guides')}
      <nav class="ad-sous-onglets" aria-label="Guides d’Explorer">${ONGLETS.map(([cle, libelle, href]) => `<a href="${href}"${cle === actif ? ' aria-current="page"' : ''}>${t(libelle)}</a>`).join('')}</nav>
    </div>
    <div class="container md-file">${contenu}</div>`;

  /* Guides ------------------------------------------------------------------------------------------ */

  /** GuideAdministreResumeApi : en préparation d'abord, puis par nom court. */
  function resumes(reglages) {
    const { guides } = AC.guides();
    return guides
      .filter(g => reglages.guides !== 'vide' || !GUIDES_INITIAUX.has(g.id))
      .map(g => ({
        ...g,
        domaine: domaine(g.categorieId),
        parcours: g.contenus.map(AC.contenu).filter(c => c && c.type === 'CREATION' && !c.etat).length,
        aRelire: AC.aRelire(g.id)
      }))
      .sort((a, b) => (a.datePublication === null ? 0 : 1) - (b.datePublication === null ? 0 : 1) || a.titreCourt.localeCompare(b.titreCourt, 'fr'));
  }

  function rendreGuides(reglages) {
    const elements = resumes(reglages);
    const enPreparation = elements.filter(g => g.datePublication === null).length;
    const aRelire = AC.aRelire();
    const statut = `<p class="md-statut"><span class="is-fort">${AC.pluriel(elements.length, 'guide', 'guides')}</span>${enPreparation > 0 ? `<span>${AC.pluriel(enPreparation, 'en préparation', 'en préparation')}</span>` : ''}${aRelire > 0 ? `<a class="ad-lien" href="administration-guides-pieges.html">${AC.pluriel(aRelire, 'piège signalé à relire', 'pièges signalés à relire')}</a>` : ''}</p>`;
    const ligne = g => `<tr id="guide-${g.id}">
        <td><a class="ad-guide-nom" href="administration-guide.html?id=${g.id}">${t(g.titreCourt)}</a><span class="ad-guide-objectif">${t(g.titre)}</span></td>
        <td data-libelle="Domaine">${t(g.domaine ? g.domaine.libelle : '')}</td>
        <td>${g.datePublication ? `<span class="ad-etat is-libre">Publié le ${AC.dateCourte(g.datePublication)}</span>` : '<span class="ad-etat is-avenir">En préparation</span>'}</td>
        <td data-libelle="Parcours">${fmt(g.parcours)}</td>
        <td data-libelle="Méthode">${AC.pluriel(g.etapes.length, 'étape', 'étapes')} · ${AC.pluriel(g.pieges.length, 'piège', 'pièges')}${g.aRelire > 0 ? `<a class="ad-guide-relire" href="administration-guides-pieges.html">${AC.pluriel(g.aRelire, 'signalé à relire', 'signalés à relire')}</a>` : ''}</td>
        <td><div class="ad-actions-defi">${g.datePublication ? `<a class="btn btn-secondary btn-sm" href="explorer.html?guide=${esc(g.slug)}">Voir${icon('arrow-up-right')}</a>` : ''}<a class="btn btn-secondary btn-sm" href="administration-guide.html?id=${g.id}">Rédiger</a></div></td>
      </tr>`;
    return gabarit('guides', statut, `<form class="ad-defi" novalidate autocomplete="off" data-ad-nouveau-guide>
        <h2>Nouveau guide</h2>
        <div class="ad-champ is-large">
          <label for="ad-guide-titre">Objectif</label>
          <input id="ad-guide-titre" name="titre" maxlength="${LONGUEURS.guideTitre.max}" placeholder="Mettre en place la prise de rendez-vous en ligne" required>
          <p class="md-erreur" data-ad-erreur="titre" hidden></p>
        </div>
        <div class="ad-outils">
          <div class="ad-champ is-large">
            <label for="ad-guide-court">Nom court</label>
            <input id="ad-guide-court" name="titreCourt" maxlength="${LONGUEURS.guideTitreCourt.max}" placeholder="Prise de rendez-vous en ligne" required>
            <p class="md-erreur" data-ad-erreur="titreCourt" hidden></p>
          </div>
          <div class="ad-champ is-large">
            <label for="ad-guide-adresse">Adresse</label>
            <input id="ad-guide-adresse" name="slug" maxlength="80" placeholder="rendez-vous" aria-describedby="ad-guide-adresse-aide" required>
            <p class="md-erreur" data-ad-erreur="slug" hidden></p>
          </div>
          <div class="ad-champ">
            <label for="ad-guide-domaine">Domaine</label>
            <select id="ad-guide-domaine" name="categorieId" required>
              <option value="">Choisissez un domaine</option>
              ${D.domaines.map(d => `<option value="${d.id}">${esc(d.libelle)}</option>`).join('')}
            </select>
            <p class="md-erreur" data-ad-erreur="categorieId" hidden></p>
          </div>
          <button class="btn btn-primary" type="submit">${icon('plus')}Créer le guide</button>
        </div>
        <p class="md-rien" id="ad-guide-adresse-aide">${t('Le guide naît en préparation : personne ne le voit avant sa publication. Son adresse (/explorer?guide=…) ne change plus ensuite.')}</p>
        <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
      </form>
      ${elements.length ? `<table class="ad-table ad-guides">
        <thead><tr><th scope="col">Guide</th><th scope="col">Domaine</th><th scope="col">État</th><th scope="col">Parcours</th><th scope="col">Méthode</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${elements.map(ligne).join('')}</tbody>
      </table>` : `<p class="md-rien ad-vide">${t('Aucun guide pour l’instant : créez le premier ci-dessus.')}</p>`}`);
  }

  /** schemaNouveauGuide : mêmes contrôles et messages. */
  function controlerNouveauGuide(s) {
    const erreurs = {};
    const titre = AC.requis(s.titre, LONGUEURS.guideTitre, 'Indiquez l’objectif du guide.', 'L’objectif');
    const court = AC.requis(s.titreCourt, LONGUEURS.guideTitreCourt, 'Indiquez le nom court du guide.', 'Le nom court');
    if (titre) erreurs.titre = titre;
    if (court) erreurs.titreCourt = court;
    const slug = String(s.slug || '').trim();
    if (!slug) erreurs.slug = 'Indiquez l’adresse du guide.';
    else if (slug.length > 80) erreurs.slug = 'L’adresse compte 80 caractères au plus.';
    else if (!MOTIF_SLUG.test(slug)) erreurs.slug = 'L’adresse ne contient que des lettres minuscules sans accent, des chiffres et des tirets.';
    const categorie = Number(s.categorieId);
    if (!Number.isInteger(categorie) || categorie <= 0) erreurs.categorieId = 'Choisissez le domaine du guide.';
    return erreurs;
  }

  function brancherGuides() {
    const form = $('[data-ad-nouveau-guide]');
    if (!form) return;
    const court = $('[name="titreCourt"]', form);
    const adresse = $('[name="slug"]', form);
    let adresseSaisie = false;
    adresse.addEventListener('input', () => { adresseSaisie = adresse.value.trim() !== ''; });
    court.addEventListener('input', () => { if (!adresseSaisie) adresse.value = AC.slugifier(court.value); });
    form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const saisie = Object.fromEntries(new FormData(form));
      const erreurs = controlerNouveauGuide(saisie);
      if (Object.keys(erreurs).length) return AC.afficherErreurs(form, erreurs);
      AC.afficherErreurs(form, {});
      const e = AC.guides();
      // L'API reste seule juge : l'adresse d'un guide est unique.
      if (e.guides.some(g => g.slug === saisie.slug.trim())) return AC.afficherErreurs(form, { slug: 'Cette adresse est déjà celle d’un autre guide.' });
      const id = e.prochains.guide++;
      e.guides.push({ id, slug: saisie.slug.trim(), titre: saisie.titre.trim(), titreCourt: saisie.titreCourt.trim(), categorieId: Number(saisie.categorieId),
        motsCles: [], lacunes: [], datePublication: null, etapes: [], pieges: [], contenus: [], retires: [], utilise: false });
      AC.garderGuides(e);
      AC.messageApresChargement('Guide créé, en préparation. Rédigez sa méthode avant de le publier.');
      window.location.assign(`administration-guide.html?id=${id}`);
    });
  }

  /* Pièges signalés ------------------------------------------------------------------------------------ */

  function rendrePieges(reglages) {
    const toutes = reglages.pieges === 'vide' ? [] : AC.propositions(reglages.pieges === 'nombreux');
    const pages = Math.max(1, Math.ceil(toutes.length / PAR_PAGE));
    const page = Math.min(pages, Math.min(1000, Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1)));
    const elements = toutes.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
    const { guides } = AC.guides();
    const statut = `<p class="md-statut"><span class="is-fort">${toutes.length ? AC.pluriel(toutes.length, 'piège à relire', 'pièges à relire') : 'Aucun piège à relire'}</span><span>Du plus ancien au plus récent</span></p>`;
    if (!elements.length) {
      return gabarit('pieges', statut, `<div class="md-vide ad-vide-guides">
          <span class="md-vide-icone" aria-hidden="true">${icon('flag', '')}</span>
          <h2>Aucun piège à relire</h2>
          <p>${t('Les pièges que les membres signalent depuis un guide d’Explorer apparaîtront ici, du plus ancien au plus récent.')}</p>
        </div>`);
    }
    const proposition = p => {
      const guide = guides.find(g => g.id === p.guideId);
      const etape = guide.etapes.find(e => e.id === p.etapeId);
      return `<li class="ad-proposition" id="proposition-${p.id}">
          <div class="md-ligne">
            ${AC.avatar(p.auteur, 32)}
            <div class="md-ligne-corps">
              <p class="md-ligne-haut"><b>${esc(p.auteur.nom)}</b><span>Le ${AC.dateLongue(AC.ilYa(p.ilYa))} · ${guide.datePublication ? `<a href="explorer.html?guide=${esc(guide.slug)}">${t(guide.titreCourt)}</a>` : t(`${guide.titreCourt} (en préparation)`)}</span><span class="md-ref">Piège signalé n° ${p.id}</span></p>
              <p class="ad-proposition-titre">${t(p.titre)}</p>
              <dl class="ad-proposition-faits">
                <div><dt>Ce qui a fonctionné</dt><dd>${p.solution ? t(p.solution) : 'Non précisé'}</dd></div>
                <div><dt>Étape</dt><dd>${etape ? t(etape.titre) : 'Non précisée'}</dd></div>
                <div><dt>Outil et modèle</dt><dd>${p.outil ? t(p.outil) : 'Non précisés'}</dd></div>
              </dl>
            </div>
          </div>
          <form class="ad-defi ad-relecture" novalidate autocomplete="off" data-ad-relecture="${p.id}" data-guide="${esc(guide.titreCourt)}">
            <h2>Écrire ce piège dans le guide</h2>
            <div class="ad-champ is-large">
              <label for="ad-piege-${p.id}">Piège</label>
              <input id="ad-piege-${p.id}" name="titre" maxlength="${LONGUEURS.guidePiegeTitre.max}" value="${esc(p.titre)}" required>
              <p class="md-erreur" data-ad-erreur="titre" hidden></p>
            </div>
            <div class="ad-champ is-large">
              <label for="ad-solution-${p.id}">Ce qui a fonctionné</label>
              <textarea id="ad-solution-${p.id}" name="solution" rows="3" maxlength="${LONGUEURS.guideSolution.max}" required>${esc(p.solution || '')}</textarea>
              <p class="md-erreur" data-ad-erreur="solution" hidden></p>
            </div>
            <div class="ad-outils">
              <div class="ad-champ">
                <label for="ad-etape-${p.id}">Étape de la méthode</label>
                <select id="ad-etape-${p.id}" name="etapeId" class="is-large">
                  <option value="">Aucune étape</option>
                  ${guide.etapes.map((e, i) => `<option value="${e.id}"${e.id === p.etapeId ? ' selected' : ''}>${t(`${i + 1}. ${e.titre}`)}</option>`).join('')}
                </select>
                <p class="md-erreur" data-ad-erreur="etapeId" hidden></p>
              </div>
              <div class="ad-actions-defi is-debut">
                <button class="btn btn-primary" type="submit">Retenir</button>
                <button class="btn btn-secondary" type="button" data-ad-ecarter>Écarter</button>
              </div>
            </div>
            <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
          </form>
        </li>`;
    };
    return gabarit('pieges', statut, `<p class="md-regle">${t('Retenu, le piège rejoint les pièges du guide avec votre texte ; écarté, il quitte la relecture. Dans les deux cas, le membre ne le voit plus « en relecture ».')}</p>
      <ol class="ad-propositions">${elements.map(proposition).join('')}</ol>
      ${pages > 1 ? `<nav class="md-pages" aria-label="Pages des pièges signalés">${page > 1 ? `<a class="btn btn-secondary" href="?page=${page - 1}">Pièges plus anciens</a>` : ''}${page < pages ? `<a class="btn btn-secondary" href="?page=${page + 1}">Pièges plus récents</a>` : ''}</nav>` : ''}`);
  }

  /** Relecture simulée (POST /api/v1/admin/propositions-pieges/:id/relecture). */
  function relire(id, saisie, formulaire, message) {
    const e = AC.guides();
    const p = [...D.propositions, ...D.propositionsEnPlus].find(x => x.id === id);
    if (!p || e.relues.includes(id)) return AC.afficherErreurs(formulaire, { general: 'Ce piège a déjà été relu.' });
    if (saisie.decision === 'RETENIR') {
      const guide = e.guides.find(g => g.id === p.guideId);
      if (saisie.etapeId !== null && !guide.etapes.some(x => x.id === saisie.etapeId)) return AC.afficherErreurs(formulaire, { etapeId: 'Choisissez une étape de ce guide.' });
      if (guide.pieges.length >= MAX_PIEGES) return AC.afficherErreurs(formulaire, { general: `Ce guide compte déjà ${MAX_PIEGES} pièges. Regroupez-en ou retirez-en un avant d’en retenir un autre.` });
      guide.pieges.push({ id: e.prochains.piege++, titre: saisie.titre, solution: saisie.solution, etapeId: saisie.etapeId, sources: [], sujetId: null, casId: null });
      guide.utilise = true;
    }
    e.relues.push(id);
    AC.garderGuides(e);
    AC.rechargerSur(null, message);
  }

  function brancherPieges() {
    $$('[data-ad-relecture]').forEach(formulaire => {
      const id = Number(formulaire.dataset.adRelecture);
      const guide = formulaire.dataset.guide || '';
      formulaire.addEventListener('submit', evenement => {
        evenement.preventDefault();
        const donnees = Object.fromEntries(new FormData(formulaire));
        // schemaRelecturePiege (décision RETENIR) : mêmes contrôles et messages.
        const erreurs = {};
        const titre = AC.requis(donnees.titre, LONGUEURS.guidePiegeTitre, 'Décrivez le piège.', 'Le piège');
        const solution = AC.requis(donnees.solution, LONGUEURS.guideSolution, 'Indiquez ce qui a fonctionné.', 'Ce qui a fonctionné');
        if (titre) erreurs.titre = titre;
        if (solution) erreurs.solution = solution;
        if (Object.keys(erreurs).length) return AC.afficherErreurs(formulaire, erreurs);
        AC.afficherErreurs(formulaire, {});
        const saisie = { decision: 'RETENIR', titre: donnees.titre.trim(), solution: donnees.solution.trim(), etapeId: donnees.etapeId ? Number(donnees.etapeId) : null };
        AC.confirmer('Retenir ce piège ?', `Il rejoint les pièges du guide « ${guide} » avec votre texte et apparaît aussitôt dans Explorer si le guide est publié.`, 'Retenir',
          () => relire(id, saisie, formulaire, `Piège écrit dans le guide « ${guide} ».`));
      });
      $('[data-ad-ecarter]', formulaire).addEventListener('click', () => {
        AC.afficherErreurs(formulaire, {});
        AC.confirmer('Écarter ce piège ?', `Il quitte la relecture sans rejoindre le guide « ${guide} ». Le membre ne le voit plus « en relecture ».`, 'Écarter',
          () => relire(id, { decision: 'ECARTER' }, formulaire, 'Piège écarté.'));
      });
    });
  }

  /* Ce que la communauté cherche encore ----------------------------------------------------------------- */

  function demandes(reglages) {
    const toutes = AC.guides().demandes.filter(d => reglages.demandes !== 'vide' || !DEMANDES_INITIALES.has(d.id));
    return {
      ouvertes: toutes.filter(d => !d.close).sort((a, b) => b.soutiens - a.soutiens || b.creee.localeCompare(a.creee)),
      closes: toutes.filter(d => d.close).sort((a, b) => b.close.localeCompare(a.close))
    };
  }

  function rendreDemandes(reglages) {
    const { ouvertes, closes } = demandes(reglages);
    const libelleDomaine = d => (d.categorieId ? t(domaine(d.categorieId).libelle) : 'Aucun');
    const statut = `<p class="md-statut"><span class="is-fort">${AC.pluriel(ouvertes.length, 'objectif ouvert', 'objectifs ouverts')}</span><span>${t(`Présentés dans Explorer sous « Ce que la communauté cherche encore », comptés sur ${JOURS_DEMANDES} jours.`)}</span></p>`;
    return gabarit('demandes', statut, `<form class="ad-outils" novalidate autocomplete="off" data-ad-demande>
        <div class="ad-champ is-large">
          <label for="ad-demande-libelle">Nouvel objectif cherché</label>
          <input id="ad-demande-libelle" name="libelle" maxlength="${LONGUEURS.demandeGuide.max}" placeholder="Devis pour un artisan du bâtiment" required>
        </div>
        <div class="ad-champ">
          <label for="ad-demande-domaine">Domaine</label>
          <select id="ad-demande-domaine" name="categorieId">
            <option value="">Aucun domaine</option>
            ${D.domaines.map(d => `<option value="${d.id}">${esc(d.libelle)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" type="submit">${icon('plus')}Ajouter</button>
        <p class="md-erreur" data-ad-erreur="libelle" hidden></p>
        <p class="md-erreur" data-ad-erreur="categorieId" hidden></p>
        <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
      </form>
      ${ouvertes.length ? `<table class="ad-table ad-demandes">
        <thead><tr><th scope="col">Objectif</th><th scope="col">Domaine</th><th scope="col">Le cherchent</th><th scope="col">Depuis</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${ouvertes.map(d => `<tr id="demande-${d.id}">
          <td><b>${t(d.libelle)}</b></td>
          <td data-libelle="Domaine">${libelleDomaine(d)}</td>
          <td data-libelle="Le cherchent">${AC.pluriel(d.soutiens, 'membre', 'membres')}</td>
          <td data-libelle="Depuis">${AC.dateCourte(d.creee)}</td>
          <td><div class="ad-actions-defi"><button class="btn btn-secondary btn-sm" type="button" data-ad-demande-clore="${d.id}" data-libelle="${esc(d.libelle)}">Clore</button></div></td>
        </tr>`).join('')}</tbody>
      </table>` : `<p class="md-rien ad-vide">${t('Aucun objectif ouvert : Explorer n’affiche pas la rubrique.')}</p>`}
      ${closes.length ? `<section class="ad-famille" aria-labelledby="ad-closes-titre">
        <h2 id="ad-closes-titre">Clos<span class="ad-famille-nb">${fmt(closes.length)}</span></h2>
        <table class="ad-table ad-demandes">
          <thead><tr><th scope="col">Objectif</th><th scope="col">Domaine</th><th scope="col">Le cherchaient</th><th scope="col">Clos le</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${closes.map(d => `<tr id="demande-${d.id}">
            <td>${t(d.libelle)}</td>
            <td data-libelle="Domaine">${libelleDomaine(d)}</td>
            <td data-libelle="Le cherchaient">${AC.pluriel(d.soutiens, 'membre', 'membres')}</td>
            <td data-libelle="Clos le">${AC.dateCourte(d.close)}</td>
            <td><div class="ad-actions-defi"><button class="btn btn-secondary btn-sm" type="button" data-ad-demande-rouvrir="${d.id}" data-libelle="${esc(d.libelle)}">Rouvrir</button></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>` : ''}`);
  }

  function brancherDemandes() {
    const form = $('[data-ad-demande]');
    if (!form) return;
    form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const donnees = Object.fromEntries(new FormData(form));
      // schemaDemandeGuide : mêmes contrôles et messages.
      const libelle = AC.requis(donnees.libelle, LONGUEURS.demandeGuide, 'Indiquez l’objectif cherché.', 'L’objectif');
      if (libelle) return AC.afficherErreurs(form, { libelle });
      AC.afficherErreurs(form, {});
      const texte = donnees.libelle.trim();
      const e = AC.guides();
      if (e.demandes.some(d => d.libelle.toLowerCase() === texte.toLowerCase())) return AC.afficherErreurs(form, { libelle: 'Cet objectif figure déjà parmi les demandes.' });
      e.demandes.push({ id: e.prochains.demande++, libelle: texte, categorieId: donnees.categorieId ? Number(donnees.categorieId) : null, soutiens: 0, creee: new Date().toISOString(), close: null });
      AC.garderGuides(e);
      AC.rechargerSur(null, `« ${texte} » ajouté. Explorer le présente aussitôt.`);
    });
    [['data-ad-demande-clore', 'adDemandeClore', true], ['data-ad-demande-rouvrir', 'adDemandeRouvrir', false]].forEach(([attribut, cle, clore]) => {
      $$(`[${attribut}]`).forEach(bouton => bouton.addEventListener('click', () => {
        const id = Number(bouton.dataset[cle]);
        const libelle = bouton.dataset.libelle || '';
        AC.confirmer(
          clore ? 'Clore cet objectif ?' : 'Rouvrir cet objectif ?',
          clore ? `« ${libelle} » n’est plus présenté dans Explorer : un guide le couvre désormais.` : `« ${libelle} » est de nouveau présenté dans Explorer, avec les membres qui le cherchent.`,
          clore ? 'Clore' : 'Rouvrir',
          () => {
            const e = AC.guides();
            const demande = e.demandes.find(d => d.id === id);
            if (!demande) return AC.signalerRefus('Cette demande est introuvable.');
            if (clore === Boolean(demande.close)) return AC.signalerRefus(clore ? 'Cette demande est déjà close.' : 'Cette demande est déjà ouverte.');
            demande.close = clore ? new Date().toISOString() : null;
            AC.garderGuides(e);
            AC.rechargerSur(`demande-${id}`, clore ? 'Objectif clos.' : 'Objectif rouvert.');
          }
        );
      }));
    });
  }

  /* Montage ---------------------------------------------------------------------------------------- */

  const VUES = {
    liste: {
      titre: 'Guides', rendre: rendreGuides, brancher: brancherGuides,
      etats: [{ name: 'guides', legend: 'Guides', options: [['liste', 'Guides à rédiger'], ['vide', 'Aucun guide']] }], defaults: { guides: 'liste' }
    },
    pieges: {
      titre: 'Pièges signalés', rendre: rendrePieges, brancher: brancherPieges,
      etats: [{ name: 'pieges', legend: 'Pièges signalés', options: [['liste', 'Pièges à relire'], ['nombreux', 'Plus de 20 pièges'], ['vide', 'Aucun piège à relire']] }], defaults: { pieges: 'liste' }
    },
    demandes: {
      titre: 'Ce que la communauté cherche', rendre: rendreDemandes, brancher: brancherDemandes,
      etats: [{ name: 'demandes', legend: 'Objectifs cherchés', options: [['liste', 'Objectifs ouverts et clos'], ['vide', 'Aucun objectif']] }], defaults: { demandes: 'liste' }
    }
  };
  const ecran = VUES[vue] || VUES.liste;
  AC.monter({
    cle: `vysora-administration-guides-${vue}-reglages`,
    etats: ecran.etats,
    defaults: ecran.defaults,
    quoi: 'gérer les guides d’Explorer',
    titre: `${ecran.titre} · Guides d’Explorer · Administration · Vysora`,
    rendre: reglages => {
      $('[data-eq-page]').innerHTML = ecran.rendre(reglages);
      ecran.brancher();
    }
  });
})();
