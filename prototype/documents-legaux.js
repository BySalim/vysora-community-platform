'use strict';

/* Pages des informations légales : conditions générales d'utilisation,
   politique de confidentialité, charte communautaire et mentions légales.
   Le texte est écrit dans chaque page ; les versions, les résumés affichés à
   l'inscription et les changements viennent de auth-data.js, la date du
   changement de etats.js. Le script ajoute le sommaire qui suit la lecture,
   les liens de section, l'impression et, pour les documents à accepter
   (conditions et charte), l'acceptation selon l'état du compte. */

(() => {
  const V = window.Vysora;
  const E = V.etats;
  const A = window.VYSORA_AUTH;
  const { $, $$, t, icon } = V;
  const cle = document.body.dataset.document;
  const DOCS = {
    ...A.documents,
    cookies: {
      titre: 'Politique relative aux cookies', onglet: 'Cookies', version: '19 octobre 2026', miseAJour: true,
      points: [
        'Seuls des cookies strictement nécessaires sont déposés : ils ne demandent pas votre accord.',
        'La fréquentation est mesurée sans cookie, et vous pouvez refuser d’y être compté.',
        'Vysora ne dépose aucun cookie publicitaire et n’intègre aucun outil de mesure d’un tiers.'
      ]
    },
    mentions: { titre: 'Mentions légales', onglet: 'Mentions légales', version: '19 octobre 2026', miseAJour: true }
  };
  const doc = DOCS[cle];
  const ORDRE = ['cgu', 'confidentialite', 'cookies', 'charte', 'mentions'];
  const PAGES = { cgu: 'cgu.html', confidentialite: 'confidentialite.html', cookies: 'cookies.html', charte: 'charte-communautaire.html', mentions: 'mentions-legales.html' };
  /* Seules les conditions et la charte s'acceptent ; la politique de confidentialité informe. */
  const ACCEPTES = ['cgu', 'charte'];
  const DES = { cgu: 'des conditions générales d’utilisation', charte: 'de la charte communautaire' };
  const LIRE = { cgu: 'Lire les conditions générales d’utilisation', charte: 'Lire la charte communautaire' };

  /* Les documents qui portent un changement sont ceux modifiés le E.DATES.conditions. */
  const modifie = c => ACCEPTES.includes(c) && Boolean(DOCS[c].changement);
  const aAccepter = c => E.membre() && E.get().compte === 'conditions' && modifie(c);
  const date = valeur => t(valeur).replace(/\b1er\b/, '1<sup>er</sup>');
  const changes = ACCEPTES.filter(modifie);
  const desChanges = changes.map(c => DES[c]).join(' et ');

  /* Espaces insécables : nombre et unité (« 24 heures »), noms de licences. */
  function insecables(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fixed = node.nodeValue
        .replace(/(\d) (?=[a-zà-ÿ])/g, '$1 ')
        .replace(/\b(CC) (BY(?:-[A-Z]{2})?) (\d\.\d)/g, '$1 $2 $3')
        .replace(/\b(CC0) (\d\.\d)/g, '$1 $2');
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    });
  }
  const typographie = scope => { V.fixTypography(scope); insecables(scope); };

  const articles = $$('.lg-article');
  /* Numéro : « Article n » des conditions, « n. » des sections numérotées, sinon l'ordre. */
  const infos = articles.map((section, index) => {
    const h2 = $('h2', section);
    const libelle = $('.lg-num', h2)?.textContent.trim() || '';
    const brut = [...h2.childNodes].filter(n => !(n.nodeType === 1 && n.classList.contains('lg-num'))).map(n => n.textContent).join('').trim();
    const numero = brut.match(/^(\d+)\.\s*/);
    const num = libelle.replace(/\D+/g, '') || (numero ? numero[1] : String(index + 1));
    const titre = numero ? brut.slice(numero[0].length) : brut;
    return { section, id: section.id, num, titre, article: Boolean(libelle), numerote: Boolean(libelle || numero) };
  });
  const infoDe = id => infos.find(i => i.id === id);
  const renvoi = i => (i.article ? `l’article ${i.num}` : `« ${i.titre} »`);

  /* En-tête : version, changement, onglets ------------------------------- */

  function rendreMeta() {
    if (doc.miseAJour) { $('[data-lg-meta]').innerHTML = `<li>${icon('calendar')}<span>Mise à jour le <b>${date(doc.version)}</b></span></li>`; return; }
    const items = [`<li>${icon('calendar')}<span>Version du <b>${date(doc.version)}</b></span></li>`];
    if (modifie(cle)) items.push(`<li>${icon('check-circle')}<span>${E.DATES.conditions === doc.version ? 'En vigueur depuis cette date' : `En vigueur depuis le ${date(E.DATES.conditions)}`}</span></li>`);
    else items.push(`<li>${icon('check-circle')}<span>Version en vigueur</span></li>`);
    $('[data-lg-meta]').innerHTML = items.join('');
  }

  function rendreChangement() {
    const zone = $('[data-lg-changement]');
    if (!zone) return;
    if (!modifie(cle)) { zone.hidden = true; return; }
    const cible = infoDe(zone.dataset.lgChangement);
    const lien = cible ? ` <a href="#${cible.id}">Lire ${t(renvoi(cible))}</a>` : '';
    const lecture = aAccepter(cle) ? `<span class="lg-lecture-seule">Votre compte est en lecture seule jusqu’à l’acceptation de cette version. <a href="#acceptation">Accepter cette version</a></span>` : '';
    zone.innerHTML = `<span class="lg-changement-icone" aria-hidden="true">${icon('history', '')}</span><p><b>Ce qui change dans cette version.</b> ${t(doc.changement)}${lien}${lecture}</p>`;
  }

  function rendreDocuments() {
    $('[data-lg-documents]').innerHTML = `<ul>${ORDRE.map(c => {
      const d = DOCS[c];
      const statut = aAccepter(c) ? '<span class="lg-doc-version is-a-accepter">À accepter</span>' : `<span class="lg-doc-version"><span class="lg-doc-prefixe">${d.miseAJour ? 'Mise à jour le ' : 'Version du '}</span>${date(d.version)}</span>`;
      return `<li><a href="${PAGES[c]}"${c === cle ? ' aria-current="page"' : ''}><span class="lg-doc-nom">${t(d.onglet)}</span>${statut}</a></li>`;
    }).join('')}</ul>`;
  }

  /* L'essentiel : les points affichés à l'inscription, reliés aux articles. */
  function rendreEssentiel() {
    const zone = $('[data-lg-essentiel]');
    if (!zone || !doc.points) return;
    const renvois = (zone.dataset.renvois || '').split(/\s+/);
    zone.innerHTML = `<h2 id="lg-essentiel-titre">L’essentiel</h2>
      <ul>${doc.points.map((point, i) => {
        const art = infoDe(renvois[i]);
        const texte = art ? (art.article ? `Article ${art.num}` : art.numerote ? `Section ${art.num}` : art.titre) : '';
        return `<li>${icon('check')}<p>${t(point)}</p>${art ? `<a href="#${art.id}" aria-label="${t(`Lire ${renvoi(art)}`)}">${texte}</a>` : ''}</li>`;
      }).join('')}</ul>`;
  }

  /* Sommaire -------------------------------------------------------------- */

  const lienSommaire = i => `<li><a href="#${i.id}" data-lg-vers="${i.id}"><span>${i.num}.</span><span>${t(i.titre)}</span></a></li>`;
  function rendreSommaire() {
    $('[data-lg-sommaire]').innerHTML = `<p class="lg-rail-titre" id="lg-sommaire-titre">Sommaire</p>
      <ol class="lg-sommaire">${infos.map(lienSommaire).join('')}<span class="lg-repere" aria-hidden="true" data-lg-repere></span></ol>
      <p class="lg-rail-fin"><a href="#contenu">${icon('up')}Haut de page</a></p>`;
    const tete = document.createElement('details');
    tete.className = 'lg-sommaire-tete';
    tete.innerHTML = `<summary>Sommaire<svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><nav aria-label="Sommaire du document"><ol>${infos.map(lienSommaire).join('')}</ol></nav>`;
    ($('[data-lg-essentiel]') || articles[0]).before(tete);
  }

  let actif = null;
  function placerRepere() {
    const repere = $('[data-lg-repere]');
    const lien = actif && $(`.lg-sommaire [data-lg-vers="${actif}"]`);
    if (!repere) return;
    if (!lien || !lien.offsetParent) { repere.classList.remove('is-visible'); return; }
    repere.style.setProperty('--y', `${lien.offsetTop}px`);
    repere.style.setProperty('--h', `${lien.offsetHeight}px`);
    repere.classList.add('is-visible');
  }
  function activer(id) {
    if (id === actif) return;
    actif = id;
    $$('[data-lg-vers]').forEach(a => {
      if (a.dataset.lgVers === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    placerRepere();
    const lien = $(`.lg-sommaire [data-lg-vers="${id}"]`);
    const rail = $('.lg-rail');
    if (lien && rail && rail.scrollHeight > rail.clientHeight) {
      const haut = lien.offsetTop - rail.clientHeight / 2;
      rail.scrollTo({ top: Math.max(0, haut), behavior: 'instant' });
    }
  }
  function suivreLecture() {
    let enAttente = false;
    const calculer = () => {
      enAttente = false;
      const ligne = window.innerHeight * 0.28;
      let courant = null;
      infos.forEach(i => { if (i.section.getBoundingClientRect().top - ligne <= 0) courant = i.id; });
      const fin = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (fin && infos.length) {
        const dernier = infos[infos.length - 1];
        if (dernier.section.getBoundingClientRect().top < window.innerHeight) courant = dernier.id;
      }
      activer(courant);
    };
    const demander = () => { if (!enAttente) { enAttente = true; requestAnimationFrame(calculer); } };
    window.addEventListener('scroll', demander, { passive: true });
    window.addEventListener('resize', () => { demander(); placerRepere(); });
    calculer();
  }

  /* Liens d'articles, cible, impression ----------------------------------- */

  const adresse = id => `${location.href.split('#')[0]}${id ? `#${id}` : ''}`;
  async function copier(texte, message) {
    try {
      await navigator.clipboard.writeText(texte);
      V.toast(message, 'link');
    } catch {
      window.prompt('Copiez ce lien :', texte);
    }
  }
  function ajouterAncres() {
    infos.forEach(i => {
      const h2 = $('h2', i.section);
      const tete = document.createElement('div');
      tete.className = 'lg-h';
      h2.before(tete);
      tete.append(h2);
      tete.insertAdjacentHTML('beforeend', `<button class="lg-ancre" type="button" aria-label="${t(`Copier le lien vers ${renvoi(i)}`)}" data-lg-ancre="${i.id}">${icon('link', '')}</button>`);
    });
    document.addEventListener('click', event => {
      const bouton = event.target.closest('[data-lg-ancre]');
      if (!bouton) return;
      const id = bouton.dataset.lgAncre;
      history.replaceState(null, '', `#${id}`);
      copier(adresse(id), 'Lien copié.');
    });
    $('[data-lg-lien]').addEventListener('click', () => copier(adresse(), 'Lien du document copié.'));
    $('[data-lg-imprimer]').addEventListener('click', () => window.print());
  }

  let cibleTimer;
  function marquerCible() {
    const id = decodeURIComponent(location.hash.slice(1));
    const section = id && infoDe(id)?.section;
    $$('.lg-article.is-cible').forEach(el => el.classList.remove('is-cible'));
    clearTimeout(cibleTimer);
    if (!section) return;
    void section.offsetWidth;
    section.classList.add('is-cible');
    cibleTimer = setTimeout(() => section.classList.remove('is-cible'), 2800);
  }

  /* Acceptation selon l'état du compte ------------------------------------ */

  function rendreAcceptation() {
    const zone = $('[data-lg-acceptation]');
    if (!zone) return;
    const e = E.get();
    let html = '<h2 id="acceptation-titre" tabindex="-1">Acceptation</h2>';
    if (!E.membre()) {
      html += `<p>L’inscription demande d’accepter les conditions générales d’utilisation et la charte communautaire, dans leur version en vigueur. Chaque acceptation est enregistrée avec sa date.</p>
        <div class="lg-boutons"><a class="btn btn-primary" href="inscription.html">Créer un compte</a><a class="btn btn-secondary" href="connexion.html">Se connecter</a></div>`;
    } else if (aAccepter(cle)) {
      html += `<form class="lg-accord" novalidate data-lg-accord>
        <p>${t(`Ces documents ont changé le ${E.DATES.conditions}. Votre compte reste en lecture seule jusqu’à l’acceptation de leurs nouvelles versions.`)}</p>
        <ul class="lg-a-accepter">${changes.map(c => `<li><b>${t(A.documents[c].titre)}</b><span>${t(A.documents[c].changement)}</span>${c === cle ? '' : `<a href="${PAGES[c]}">${t(LIRE[c])}</a>`}</li>`).join('')}</ul>
        <div class="lg-case"><input type="checkbox" id="lg-accord" name="accord" aria-describedby="lg-accord-erreur"><label for="lg-accord">J’accepte les nouvelles versions de ces documents.</label></div>
        <p class="lg-erreur" id="lg-accord-erreur" hidden></p>
        <button class="btn btn-primary" type="submit">Accepter les nouvelles versions</button>
      </form>`;
    } else {
      html += `<div class="lg-statut">${icon('check-circle', '')}<p><b>Vous avez accepté cette version.</b></p></div>`;
      if (e.compte === 'conditions' && changes.length) {
        html += `<p class="lg-autres">${t(`Les nouvelles versions ${desChanges} sont à accepter pour continuer à publier et à participer.`)}</p>
          <div class="lg-boutons">${changes.map(c => `<a class="btn btn-secondary" href="${PAGES[c]}#acceptation">${t(LIRE[c])}</a>`).join('')}</div>`;
      }
    }
    zone.innerHTML = html;
    typographie(zone);

    const form = $('[data-lg-accord]', zone);
    if (!form) return;
    const caseAccord = $('#lg-accord', form);
    const erreur = $('#lg-accord-erreur', form);
    const effacer = () => { erreur.hidden = true; caseAccord.removeAttribute('aria-invalid'); };
    caseAccord.addEventListener('change', effacer);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!caseAccord.checked) {
        erreur.innerHTML = `${icon('alert', '')}<span>Cochez la case pour accepter les nouvelles versions.</span>`;
        erreur.hidden = false;
        caseAccord.setAttribute('aria-invalid', 'true');
        caseAccord.focus();
        return;
      }
      E.set({ compte: 'actif' });
      V.toast('Nouvelles versions acceptées.');
      $('#acceptation-titre')?.focus({ preventScroll: true });
    });
  }

  /* Mesure d'audience : opposition enregistrée sur l'appareil (page Cookies). */

  const CLE_AUDIENCE = 'vysora-mesure-audience';
  function monterChoixAudience() {
    const zone = $('[data-lg-audience]');
    if (!zone) return;
    const rendreChoix = () => {
      const comptee = V.store.get(CLE_AUDIENCE, 'comptee') !== 'refusee';
      zone.innerHTML = `<div class="lg-choix-texte">
          <p class="lg-choix-titre" id="lg-audience-titre">Compter mes visites dans la mesure d’audience</p>
          <p class="lg-choix-etat" id="lg-audience-etat">${comptee ? 'Vos visites sont comptées, de façon anonyme.' : 'Vos visites ne sont plus comptées sur cet appareil.'}</p>
        </div>
        <button class="lg-interrupteur" type="button" role="switch" aria-checked="${comptee}" aria-labelledby="lg-audience-titre" aria-describedby="lg-audience-etat" data-lg-audience-bouton><span aria-hidden="true"></span></button>`;
      typographie(zone);
    };
    zone.addEventListener('click', event => {
      if (!event.target.closest('[data-lg-audience-bouton]')) return;
      const refuser = V.store.get(CLE_AUDIENCE, 'comptee') !== 'refusee';
      V.store.set(CLE_AUDIENCE, refuser ? 'refusee' : 'comptee');
      rendreChoix();
      $('[data-lg-audience-bouton]', zone).focus();
      V.toast(refuser ? 'Vos visites ne sont plus comptées.' : 'Vos visites sont de nouveau comptées.');
    });
    rendreChoix();
  }

  /* Rendu et réglages ------------------------------------------------------ */

  function rendre() {
    rendreMeta();
    rendreChangement();
    rendreDocuments();
    rendreAcceptation();
    typographie($('.lg-tete'));
  }

  /* Tableaux empilés sur mobile : chaque cellule reprend l'intitulé de sa colonne. */
  $$('.lg-tableau-empile').forEach(table => {
    const entetes = $$('thead th', table).map(th => th.textContent.trim());
    $$('tbody tr', table).forEach(tr => [...tr.children].forEach((cellule, i) => { if (cellule.tagName === 'TD' && entetes[i]) cellule.dataset.label = entetes[i]; }));
  });

  rendreEssentiel();
  monterChoixAudience();
  rendreSommaire();
  ajouterAncres();
  rendre();
  typographie($('main'));

  V.initTweaks({
    key: 'vysora-documents-legaux-reglages-v1',
    etats: [],
    apparence: [
      'accent',
      { name: 'lecture', legend: 'Largeur du texte', options: [['etroite', 'Étroite'], ['standard', 'Standard'], ['large', 'Large']] },
      { name: 'texte', legend: 'Taille du texte', options: [['standard', 'Standard'], ['grande', 'Grande']] },
      { name: 'sommaire', legend: 'Sommaire', options: [['colonne', 'En colonne'], ['tete', 'En tête du texte']] },
      { name: 'eyebrow', legend: 'Intertitres des articles', options: [['icon', 'Icône'], ['rule', 'Filet']] },
      'density',
      'motion'
    ],
    defaults: { lecture: 'standard', texte: 'standard', sommaire: 'colonne', eyebrow: 'icon' },
    onChange: changed => { if (changed !== 'init') requestAnimationFrame(placerRepere); }
  });

  E.on(() => { rendre(); placerRepere(); });
  window.addEventListener('hashchange', marquerCible);
  V.initHeader();
  suivreLecture();
  marquerCible();
  document.fonts?.ready.then(placerRepere);
})();
