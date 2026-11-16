'use strict';

/* Rédaction d'un guide d'Explorer (DEC-02) : démo de l'écran du site
   (apps/web/src/pages/admin/guides/[id].astro, components/BlocEtapeGuide.astro, BlocPiegeGuide.astro,
   scripts/editeur-guide.ts), mêmes balisage, classes et textes. Objectif, nom court, domaine,
   mots-clés et lacunes ; « La méthode qui ressort » et « Les pièges à anticiper » (ajoutés, déplacés
   et retirés dans la page, étapes proposées aux pièges tenues à jour) ; parcours, questions et cas
   ajoutés par leur adresse ou leur numéro, retirés ou remis ; panneau d'actions (enregistrer,
   publier, repasser en préparation, supprimer). Chaque envoi se confirme ; le guide simulé est gardé
   pour la session du navigateur et la page se recharge comme celle du site.
   Adresse : administration-guide.html?id=… (sans numéro, le premier guide). États dans le panneau
   Tweaks : guide ouvert, guide introuvable. */

(() => {
  const V = window.Vysora;
  const AC = window.AdminContenus;
  const { D, $, $$, t, esc, icon } = AC;

  const LONGUEURS = {
    guideTitre: { min: 10, max: 150 }, guideTitreCourt: { min: 3, max: 80 }, guideMotCle: { max: 40 }, guideLacune: { max: 300 },
    guideEtapeTitre: { min: 3, max: 150 }, guideConseil: { min: 10, max: 1000 }, guideCitation: { max: 5000 },
    guidePiegeTitre: { min: 10, max: 200 }, guideSolution: { min: 10, max: 1000 }
  };
  const LIMITES = { motsCles: 15, lacunes: 10, etapes: 12, pieges: 20 };
  const parametre = new URLSearchParams(location.search).get('id');
  const idDemande = parametre === null ? D.guides[0].id : (/^\d{1,15}$/.test(parametre) ? Number(parametre) : null);

  let modifie = false;
  window.addEventListener('beforeunload', evenement => { if (modifie) evenement.preventDefault(); });

  /* Blocs d'étape et de piège (BlocEtapeGuide.astro, BlocPiegeGuide.astro) ----------------------------- */

  const caseParcours = (p, coches) => `<label class="ad-case"><input type="checkbox" data-champ="sources" value="${p.id}"${coches.has(p.id) ? ' checked' : ''}><span>${t(p.titre)}<span class="ad-case-auteur">${t(` · ${p.auteur.nom}`)}</span></span></label>`;
  const boutonsBloc = quoi => `<div class="ad-bloc-actions">
        <button class="ad-bouton-icone" type="button" data-ad-monter aria-label="Monter ${quoi}">${icon('arrow-up')}</button>
        <button class="ad-bouton-icone" type="button" data-ad-descendre aria-label="Descendre ${quoi}">${icon('arrow-down')}</button>
        <button class="ad-bouton-icone" type="button" data-ad-retirer aria-label="Retirer ${quoi}">${icon('trash')}</button>
      </div>`;

  function blocEtape(etape, rang, parcours) {
    const cle = etape ? `e${etape.id}` : '__cle__';
    const sources = new Set(etape?.sources ?? []);
    return `<li class="ad-bloc" data-ad-etape data-id="${etape?.id ?? ''}" data-cle="${etape ? cle : ''}">
      <div class="ad-bloc-tete"><h3 data-ad-numero>Étape ${rang}</h3>${boutonsBloc('l’étape')}</div>
      <div class="ad-champ is-large">
        <label for="ad-${cle}-titre">Titre</label>
        <input id="ad-${cle}-titre" data-champ="titre" maxlength="${LONGUEURS.guideEtapeTitre.max}" value="${esc(etape?.titre ?? '')}" placeholder="Décrire les créneaux à l’IA">
        <p class="md-erreur" data-ad-erreur-champ="titre" hidden></p>
      </div>
      <div class="ad-champ is-large">
        <label for="ad-${cle}-conseil">Conseil de l’équipe</label>
        <textarea id="ad-${cle}-conseil" data-champ="conseil" rows="3" maxlength="${LONGUEURS.guideConseil.max}" placeholder="Plus la description est précise, moins l’IA invente de créneaux.">${esc(etape?.conseil ?? '')}</textarea>
        <p class="md-erreur" data-ad-erreur-champ="conseil" hidden></p>
      </div>
      <fieldset class="ad-sources">
        <legend>Parcours qui suivent cette étape</legend>
        ${parcours.length ? `<div class="ad-sources-liste">${parcours.map(p => caseParcours(p, sources)).join('')}</div>` : `<p class="md-rien">${t('Ajoutez des parcours au guide pour les relier à sa méthode.')}</p>`}
        <p class="md-erreur" data-ad-erreur-champ="sources" hidden></p>
      </fieldset>
      <div class="ad-champ">
        <label for="ad-${cle}-cite">Prompt cité</label>
        <select id="ad-${cle}-cite" data-champ="citation.parcoursId" class="is-large">
          <option value="">Aucun prompt cité</option>
          ${parcours.map(p => `<option value="${p.id}"${etape?.citation?.parcoursId === p.id ? ' selected' : ''}>${t(`${p.titre} · ${p.auteur.nom}`)}</option>`).join('')}
        </select>
        <p class="md-erreur" data-ad-erreur-champ="citation.parcoursId" hidden></p>
      </div>
      <div class="ad-champ is-large" data-ad-citation${etape?.citation ? '' : ' hidden'}>
        <label for="ad-${cle}-texte">Texte exact du prompt</label>
        <textarea id="ad-${cle}-texte" data-champ="citation.texte" rows="3" maxlength="${LONGUEURS.guideCitation.max}">${esc(etape?.citation?.texte ?? '')}</textarea>
        <p class="md-erreur" data-ad-erreur-champ="citation.texte" hidden></p>
      </div>
    </li>`;
  }

  function blocPiege(piege, rang, etapes, parcours, questions, cas) {
    const cle = piege ? `p${piege.id}` : '__cle__';
    const sources = new Set(piege?.sources ?? []);
    const liste = (champ, libelle, aucun, elements, choisi) => `<div class="ad-champ">
        <label for="ad-${cle}-${champ === 'sujetId' ? 'sujet' : champ === 'casId' ? 'cas' : champ}">${libelle}</label>
        <select id="ad-${cle}-${champ === 'sujetId' ? 'sujet' : champ === 'casId' ? 'cas' : champ}" data-champ="${champ}" class="is-large">
          <option value="">${aucun}</option>
          ${elements.map(([valeur, texte]) => `<option value="${valeur}"${choisi === valeur ? ' selected' : ''}>${t(texte)}</option>`).join('')}
        </select>
        <p class="md-erreur" data-ad-erreur-champ="${champ}" hidden></p>
      </div>`;
    return `<li class="ad-bloc" data-ad-piege data-id="${piege?.id ?? ''}">
      <div class="ad-bloc-tete"><h3 data-ad-numero>Piège ${rang}</h3>${boutonsBloc('le piège')}</div>
      <div class="ad-champ is-large">
        <label for="ad-${cle}-titre">Le piège</label>
        <input id="ad-${cle}-titre" data-champ="titre" maxlength="${LONGUEURS.guidePiegeTitre.max}" value="${esc(piege?.titre ?? '')}" placeholder="Le créneau restait réservable dans un autre onglet">
        <p class="md-erreur" data-ad-erreur-champ="titre" hidden></p>
      </div>
      <div class="ad-champ is-large">
        <label for="ad-${cle}-solution">Ce qui a fonctionné</label>
        <textarea id="ad-${cle}-solution" data-champ="solution" rows="3" maxlength="${LONGUEURS.guideSolution.max}">${esc(piege?.solution ?? '')}</textarea>
        <p class="md-erreur" data-ad-erreur-champ="solution" hidden></p>
      </div>
      <div class="ad-outils ad-bloc-choix">
        ${liste('etape', 'Étape', 'Aucune étape', etapes.map((e, i) => [`e${e.id}`, `${i + 1}. ${e.titre}`]), piege?.etapeId ? `e${piege.etapeId}` : '')}
        ${liste('sujetId', 'Discussion', 'Aucune discussion', questions.map(q => [String(q.id), q.titre]), piege?.sujetId ? String(piege.sujetId) : '')}
        ${liste('casId', 'Cas pour s’entraîner', 'Aucun cas', cas.map(c => [String(c.id), c.titre]), piege?.casId ? String(piege.casId) : '')}
      </div>
      <fieldset class="ad-sources">
        <legend>Parcours où il a été rencontré</legend>
        ${parcours.length ? `<div class="ad-sources-liste">${parcours.map(p => caseParcours(p, sources)).join('')}</div>` : `<p class="md-rien">${t('Ajoutez des parcours au guide pour y relier ses pièges.')}</p>`}
        <p class="md-erreur" data-ad-erreur-champ="sources" hidden></p>
      </fieldset>
    </li>`;
  }

  /* Rendu de la page ------------------------------------------------------------------------------------ */

  const ariane = nom => `<nav class="md-ariane" aria-label="Fil d’Ariane"><ol><li><a href="administration-guides.html">Guides d’Explorer</a></li><li><span aria-current="page">${nom ? t(nom) : 'Guide'}</span></li></ol></nav>`;

  function rendre(reglages) {
    const page = $('[data-eq-page]');
    const e = AC.guides();
    const guide = reglages.guide === 'introuvable' || idDemande === null ? null : e.guides.find(g => g.id === idDemande) || null;
    modifie = false;
    if (!guide) {
      document.title = 'Guides d’Explorer · Administration · Vysora';
      page.innerHTML = `<div class="container md-tete">${ariane(null)}<h1>Guide d’Explorer</h1>${window.Equipe.ongletsAdministration('guides')}</div>
        <div class="container md-file"><div class="md-vide">
          <span class="md-vide-icone" aria-hidden="true">${icon('compass', '')}</span>
          <h2>Ce guide est introuvable</h2>
          <p>${t('L’adresse ne correspond à aucun guide d’Explorer.')}</p>
          <a class="btn btn-secondary" href="administration-guides.html">Revenir aux guides</a>
        </div></div>`;
      return;
    }
    document.title = `${V.typo(guide.titreCourt)} · Guides d’Explorer · Administration · Vysora`;
    const contenus = guide.contenus.map(AC.contenu).filter(Boolean);
    const parcours = contenus.filter(c => c.type === 'CREATION');
    const questions = contenus.filter(c => c.type === 'SUJET');
    const cas = contenus.filter(c => c.type === 'CAS_BON_REFLEXE');
    const groupes = [{ titre: 'Parcours', contenus: parcours }, { titre: 'Questions', contenus: questions }, { titre: 'Cas Bon réflexe', contenus: cas }].filter(g => g.contenus.length);
    const retires = guide.retires.map(AC.contenu).filter(Boolean);
    const domaine = D.domaines.find(d => d.id === guide.categorieId);
    const aRelire = AC.aRelire(guide.id);
    const supprimable = !guide.datePublication && !guide.utilise;

    const ligneContenu = c => {
      const etat = AC.etatContenu(c);
      return `<li class="ad-membre" id="contenu-${c.id}">
          ${AC.avatar(c.auteur, 40)}
          <span class="ad-membre-corps">
            <a class="ad-membre-nom ad-contenu-titre" href="${AC.adresseContenu(c)}">${t(c.titre)}</a>
            <span class="ad-membre-meta"><span>${esc(c.auteur.nom)}</span><span>N° ${c.id}</span>${etat ? `<span class="is-alerte">${etat} : absent d’Explorer</span>` : ''}</span>
          </span>
          <span class="ad-membre-actions"><button class="btn btn-secondary btn-sm" type="button" data-ad-retirer-contenu="${c.id}" data-type="${c.type}" data-titre="${esc(c.titre)}">Retirer</button></span>
        </li>`;
    };

    page.innerHTML = `<div class="container md-tete">
        ${ariane(guide.titreCourt)}
        <p class="md-rubrique">${icon('compass')}Guide d’Explorer<span class="md-sep" aria-hidden="true">·</span>${guide.datePublication ? `<span class="md-etat">Publié le ${AC.dateLongue(guide.datePublication)}</span>` : '<span class="md-etat is-masque">En préparation</span>'}</p>
        <h1 class="md-titre-dossier">${t(guide.titre)}</h1>
        <div class="md-meta">
          <p class="ad-guide-adresse">/explorer?guide=${esc(guide.slug)}${domaine ? `<span> · ${esc(domaine.libelle)}</span>` : ''}</p>
          <div class="md-meta-actions">
            ${guide.datePublication ? `<a class="btn btn-secondary btn-sm" href="explorer.html?guide=${esc(guide.slug)}">Voir dans Explorer${icon('arrow-up-right')}</a>` : ''}
            <a class="btn btn-primary btn-sm md-aller" href="#ad-enregistrer">Enregistrer</a>
          </div>
        </div>
        ${aRelire > 0 ? `<p class="md-alerte">${icon('flag', '')}<span><b>${AC.pluriel(aRelire, 'piège signalé attend votre relecture.', 'pièges signalés attendent votre relecture.')}</b> <a class="ad-lien" href="administration-guides-pieges.html">Les relire</a></span></p>` : ''}
        ${window.Equipe.ongletsAdministration('guides')}
      </div>
      <div class="container md-dossier ad-redaction">
        <div class="md-principal">
          <form id="ad-guide" novalidate autocomplete="off" data-ad-guide="${guide.id}" data-publie="${guide.datePublication ? 'oui' : ''}" data-titre="${esc(guide.titreCourt)}">
            <section class="md-section" aria-labelledby="ad-g-guide">
              <h2 id="ad-g-guide">Le guide</h2>
              <div class="ad-redaction-champs">
                <div class="ad-champ is-large">
                  <label for="ad-g-titre">Objectif</label>
                  <input id="ad-g-titre" name="titre" maxlength="${LONGUEURS.guideTitre.max}" value="${esc(guide.titre)}" required>
                  <p class="md-erreur" data-ad-erreur="titre" hidden></p>
                </div>
                <div class="ad-outils">
                  <div class="ad-champ is-large">
                    <label for="ad-g-court">Nom court</label>
                    <input id="ad-g-court" name="titreCourt" maxlength="${LONGUEURS.guideTitreCourt.max}" value="${esc(guide.titreCourt)}" required>
                    <p class="md-erreur" data-ad-erreur="titreCourt" hidden></p>
                  </div>
                  <div class="ad-champ">
                    <label for="ad-g-domaine">Domaine</label>
                    <select id="ad-g-domaine" name="categorieId" class="is-large" required>
                      ${D.domaines.map(d => `<option value="${d.id}"${d.id === guide.categorieId ? ' selected' : ''}>${esc(d.libelle)}</option>`).join('')}
                    </select>
                    <p class="md-erreur" data-ad-erreur="categorieId" hidden></p>
                  </div>
                </div>
                <div class="ad-champ is-large">
                  <label for="ad-g-mots">Mots-clés</label>
                  <input id="ad-g-mots" name="motsCles" value="${esc(guide.motsCles.join(', '))}" aria-describedby="ad-g-mots-aide">
                  <p class="md-aide" id="ad-g-mots-aide">${t(`Ce qu’une personne peut taper pour trouver l’objectif, séparé par des virgules (${LIMITES.motsCles} au plus) ; le premier compte dans « Souvent cherché ».`)}</p>
                  <p class="md-erreur" data-ad-erreur="motsCles" hidden></p>
                </div>
                <div class="ad-champ is-large">
                  <label for="ad-g-lacunes">Ce que ce guide ne couvre pas encore</label>
                  <textarea id="ad-g-lacunes" name="lacunes" rows="3" aria-describedby="ad-g-lacunes-aide">${esc(guide.lacunes.join('\n'))}</textarea>
                  <p class="md-aide" id="ad-g-lacunes-aide">${t(`Une lacune par ligne (${LIMITES.lacunes} au plus).`)}</p>
                  <p class="md-erreur" data-ad-erreur="lacunes" hidden></p>
                </div>
              </div>
            </section>

            <section class="md-section" aria-labelledby="ad-g-methode">
              <div class="md-section-tete"><h2 id="ad-g-methode">La méthode qui ressort</h2><p>Étapes communes aux parcours, dans l’ordre où ils les suivent</p></div>
              <p class="md-erreur ad-erreur-liste" data-ad-erreur="etapes" hidden></p>
              <ol class="ad-blocs" data-ad-liste="etapes">${guide.etapes.map((x, i) => blocEtape(x, i + 1, parcours)).join('')}</ol>
              <p class="md-rien" data-ad-vide="etapes"${guide.etapes.length ? ' hidden' : ''}>${t('Aucune étape pour l’instant : un guide se publie avec une étape au moins.')}</p>
              <button class="btn btn-secondary btn-sm ad-ajouter" type="button" data-ad-ajouter="etapes" data-max="${LIMITES.etapes}">${icon('plus')}Ajouter une étape</button>
            </section>

            <section class="md-section" aria-labelledby="ad-g-pieges">
              <div class="md-section-tete"><h2 id="ad-g-pieges">Les pièges à anticiper</h2><p>${t('Explorer les présente du plus rencontré au moins rencontré')}</p></div>
              <p class="md-erreur ad-erreur-liste" data-ad-erreur="pieges" hidden></p>
              <ol class="ad-blocs" data-ad-liste="pieges">${guide.pieges.map((x, i) => blocPiege(x, i + 1, guide.etapes, parcours, questions, cas)).join('')}</ol>
              <p class="md-rien" data-ad-vide="pieges"${guide.pieges.length ? ' hidden' : ''}>Aucun piège pour l’instant.</p>
              <button class="btn btn-secondary btn-sm ad-ajouter" type="button" data-ad-ajouter="pieges" data-max="${LIMITES.pieges}">${icon('plus')}Ajouter un piège</button>
            </section>
          </form>

          <section class="md-section" id="contenus" aria-labelledby="ad-g-contenus">
            <div class="md-section-tete"><h2 id="ad-g-contenus">Parcours, questions et cas</h2><p>${[AC.pluriel(parcours.length, 'parcours', 'parcours'), AC.pluriel(questions.length, 'question', 'questions'), AC.pluriel(cas.length, 'cas', 'cas')].join(' · ')}</p></div>
            <form class="ad-outils ad-ajout-contenu" novalidate autocomplete="off" data-ad-contenu>
              <div class="ad-champ is-large">
                <label for="ad-g-contenu">Ajouter une création, une question ou un cas</label>
                <input id="ad-g-contenu" name="adresse" placeholder="Adresse de sa page ou numéro" aria-describedby="ad-g-contenu-aide">
              </div>
              <button class="btn btn-secondary" type="submit">${icon('plus')}Ajouter</button>
              <p class="md-erreur" data-ad-erreur="contenuId" role="alert" hidden></p>
              <p class="md-aide" id="ad-g-contenu-aide">${t('Une création publiée rejoint d’elle-même le guide le plus proche ; ajoutez ici celles que le rapprochement a manquées, et les questions et les cas qui éclairent les pièges.')}</p>
            </form>
            ${groupes.length ? groupes.map(g => `<div class="ad-groupe"><h3 class="ad-groupe-titre">${g.titre}</h3><ul class="ad-refs">${g.contenus.map(ligneContenu).join('')}</ul></div>`).join('')
              : `<p class="md-rien ad-vide">${t('Aucun contenu pour l’instant : ajoutez les parcours qui suivent la méthode.')}</p>`}
            ${retires.length ? `<div class="ad-groupe">
              <h3 class="ad-groupe-titre">Parcours retirés</h3>
              <p class="md-rien">${t('Le rapprochement ne les range plus dans ce guide.')}</p>
              <ul class="ad-refs">${retires.map(c => `<li class="ad-membre is-retire" id="contenu-${c.id}">
                ${AC.avatar(c.auteur, 40)}
                <span class="ad-membre-corps"><a class="ad-membre-nom ad-contenu-titre" href="${AC.adresseContenu(c)}">${t(c.titre)}</a><span class="ad-membre-meta"><span>${esc(c.auteur.nom)}</span><span>N° ${c.id}</span></span></span>
                <span class="ad-membre-actions"><button class="btn btn-secondary btn-sm" type="button" data-ad-remettre="${c.id}" data-titre="${esc(c.titre)}">Remettre</button></span>
              </li>`).join('')}</ul>
            </div>` : ''}
          </section>
        </div>

        <aside class="md-decision ad-guide-actions" id="ad-enregistrer" aria-labelledby="ad-g-actions">
          <h2 id="ad-g-actions">${guide.datePublication ? 'Guide publié' : 'Guide en préparation'}</h2>
          <p class="ad-guide-etat">${t(guide.datePublication ? 'Chaque enregistrement s’applique aussitôt dans Explorer.' : 'Personne ne le voit avant sa publication.')}</p>
          <p class="md-erreur" data-ad-erreur-general role="alert" hidden></p>
          <button class="btn btn-primary md-envoyer" type="submit" form="ad-guide">Enregistrer le guide</button>
          <p class="md-note" data-ad-modifie hidden>Modifications non enregistrées</p>
          <div class="ad-guide-publication">
            ${guide.datePublication
              ? `<button class="btn btn-secondary" type="button" data-ad-publication="retirer">Repasser en préparation</button><p class="md-rien">${t('Le guide disparaît d’Explorer ; les listes de contrôle des membres sont gardées.')}</p>`
              : `<button class="btn btn-secondary" type="button" data-ad-publication="publier">Publier le guide</button><p class="md-rien">${t('Il apparaît dans Explorer, et les créations publiées ensuite peuvent le rejoindre.')}</p>`}
            ${supprimable ? `<button class="ad-supprimer" type="button" data-ad-supprimer>${icon('trash')}Supprimer ce guide</button>` : ''}
          </div>
        </aside>
      </div>
      <template data-ad-modele="etapes">${blocEtape(null, 0, parcours)}</template>
      <template data-ad-modele="pieges">${blocPiege(null, 0, guide.etapes, parcours, questions, cas)}</template>`;
    brancher(guide);
  }

  /* Éditeur (scripts/editeur-guide.ts) ----------------------------------------------------------------- */

  function brancher(guide) {
    const formulaire = $('[data-ad-guide]');
    const guideId = guide.id;
    const publie = formulaire.dataset.publie === 'oui';
    const nom = formulaire.dataset.titre || '';
    const listes = { etapes: $('[data-ad-liste="etapes"]', formulaire), pieges: $('[data-ad-liste="pieges"]', formulaire) };
    const erreurGenerale = $('[data-ad-erreur-general]');
    const marqueModifie = $('[data-ad-modifie]');
    const enregistrer = $('button[form="ad-guide"]');
    let compteur = 0;

    const blocs = liste => $$(':scope > li', listes[liste]);
    const idsDe = liste => blocs(liste).flatMap(li => (li.dataset.id ? [li.dataset.id] : []));
    const initiaux = { etapes: idsDe('etapes'), pieges: idsDe('pieges') };
    const valeur = (racine, champ) => $(`[data-champ="${champ}"]`, racine)?.value.trim() ?? '';
    const nombre = texte => (texte ? Number(texte) : null);
    const element = nomChamp => formulaire.elements.namedItem(nomChamp);

    function signalerModification() {
      modifie = true;
      if (marqueModifie) marqueModifie.hidden = false;
    }
    formulaire.addEventListener('input', signalerModification);
    formulaire.addEventListener('change', signalerModification);

    /** Numéros, déplacements possibles, états vides, et étapes proposées à chaque piège. */
    function actualiser() {
      ['etapes', 'pieges'].forEach(liste => {
        const items = blocs(liste);
        items.forEach((li, i) => {
          const numero = $('[data-ad-numero]', li);
          if (numero) numero.textContent = `${liste === 'etapes' ? 'Étape' : 'Piège'} ${i + 1}`;
          const monter = $('[data-ad-monter]', li);
          const descendre = $('[data-ad-descendre]', li);
          if (monter) monter.disabled = i === 0;
          if (descendre) descendre.disabled = i === items.length - 1;
        });
        const vide = $(`[data-ad-vide="${liste}"]`);
        if (vide) vide.hidden = items.length > 0;
        const ajouter = $(`[data-ad-ajouter="${liste}"]`);
        if (ajouter) ajouter.disabled = items.length >= Number(ajouter.dataset.max);
      });
      const etapes = blocs('etapes').map((li, i) => ({ cle: li.dataset.cle || '', libelle: `${i + 1}. ${valeur(li, 'titre') || 'Étape sans titre'}` }));
      $$('[data-champ="etape"]', listes.pieges).forEach(liste => {
        const choisie = liste.value;
        liste.replaceChildren(new Option('Aucune étape', ''), ...etapes.map(x => new Option(V.typo(x.libelle), x.cle)));
        liste.value = etapes.some(x => x.cle === choisie) ? choisie : '';
      });
    }

    /* Étapes et pièges : ajouter, déplacer, retirer */

    $$('[data-ad-ajouter]').forEach(bouton => bouton.addEventListener('click', () => {
      const liste = bouton.dataset.adAjouter;
      const modele = $(`[data-ad-modele="${liste}"]`);
      const li = modele?.content.firstElementChild?.cloneNode(true);
      if (!li) return;
      const cle = `n${++compteur}`;
      $$('[id]', li).forEach(el => { el.id = el.id.replace('__cle__', cle); });
      $$('label[for]', li).forEach(el => { el.htmlFor = el.htmlFor.replace('__cle__', cle); });
      if (liste === 'etapes') li.dataset.cle = cle;
      listes[liste].append(li);
      actualiser();
      signalerModification();
      $('[data-champ="titre"]', li)?.focus();
    }));

    formulaire.addEventListener('click', evenement => {
      const bouton = evenement.target.closest('[data-ad-monter], [data-ad-descendre], [data-ad-retirer]');
      const li = bouton?.closest('.ad-bloc');
      if (!bouton || !li) return;
      if (bouton.hasAttribute('data-ad-monter')) li.previousElementSibling?.before(li);
      else if (bouton.hasAttribute('data-ad-descendre')) li.nextElementSibling?.after(li);
      else {
        const suivant = li.nextElementSibling ?? li.previousElementSibling;
        const liste = li.parentElement;
        li.remove();
        ($('[data-champ="titre"]', suivant ?? document) ?? liste?.parentElement?.querySelector('[data-ad-ajouter]'))?.focus();
      }
      actualiser();
      signalerModification();
      if (li.isConnected && !bouton.disabled) bouton.focus();
    });

    formulaire.addEventListener('input', evenement => {
      if (evenement.target.matches('[data-ad-etape] [data-champ="titre"]')) actualiser();
    });
    formulaire.addEventListener('change', evenement => {
      const cible = evenement.target;
      if (!cible.matches('[data-champ="citation.parcoursId"]')) return;
      const zone = cible.closest('.ad-bloc')?.querySelector('[data-ad-citation]');
      if (zone) zone.hidden = !cible.value;
    });

    /* Enregistrement */

    function saisie() {
      const cles = blocs('etapes').map(li => li.dataset.cle || '');
      const sources = li => $$('[data-champ="sources"]:checked', li).map(c => Number(c.value));
      return {
        titre: element('titre')?.value ?? '',
        titreCourt: element('titreCourt')?.value ?? '',
        categorieId: element('categorieId')?.value ?? '',
        motsCles: (element('motsCles')?.value ?? '').split(',').map(m => m.trim()).filter(Boolean),
        lacunes: (element('lacunes')?.value ?? '').split('\n').map(l => l.trim()).filter(Boolean),
        etapes: blocs('etapes').map(li => {
          const cite = valeur(li, 'citation.parcoursId');
          return { id: nombre(li.dataset.id), titre: valeur(li, 'titre'), conseil: valeur(li, 'conseil'), sources: sources(li), citation: cite ? { parcoursId: Number(cite), texte: valeur(li, 'citation.texte') } : null };
        }),
        pieges: blocs('pieges').map(li => {
          const rang = cles.indexOf(valeur(li, 'etape'));
          return { id: nombre(li.dataset.id), titre: valeur(li, 'titre'), solution: valeur(li, 'solution'), etape: valeur(li, 'etape') && rang >= 0 ? rang : null,
            sources: sources(li), sujetId: nombre(valeur(li, 'sujetId')), casId: nombre(valeur(li, 'casId')) };
        })
      };
    }

    /** schemaGuide : mêmes contrôles et messages ; null si la saisie est valide. */
    function controler(s) {
      const erreurs = {};
      const poser = (chemin, message) => { if (message && !(chemin in erreurs)) erreurs[chemin] = message; };
      poser('titre', AC.requis(s.titre, LONGUEURS.guideTitre, 'Indiquez l’objectif du guide.', 'L’objectif'));
      poser('titreCourt', AC.requis(s.titreCourt, LONGUEURS.guideTitreCourt, 'Indiquez le nom court du guide.', 'Le nom court'));
      if (!(Number(s.categorieId) > 0)) poser('categorieId', 'Choisissez le domaine du guide.');
      s.motsCles.forEach((m, i) => { if (m.length > LONGUEURS.guideMotCle.max) poser(`motsCles.${i}`, `Un mot-clé compte ${LONGUEURS.guideMotCle.max} caractères au plus.`); });
      if (s.motsCles.length > LIMITES.motsCles) poser('motsCles', `Un guide compte ${LIMITES.motsCles} mots-clés au plus.`);
      s.lacunes.forEach((l, i) => { if (l.length > LONGUEURS.guideLacune.max) poser(`lacunes.${i}`, `Une lacune compte ${LONGUEURS.guideLacune.max} caractères au plus.`); });
      if (s.lacunes.length > LIMITES.lacunes) poser('lacunes', `Un guide compte ${LIMITES.lacunes} lacunes au plus.`);
      s.etapes.forEach((x, i) => {
        poser(`etapes.${i}.titre`, AC.requis(x.titre, LONGUEURS.guideEtapeTitre, 'Donnez un titre à l’étape.', 'Le titre'));
        poser(`etapes.${i}.conseil`, AC.requis(x.conseil, LONGUEURS.guideConseil, 'Rédigez le conseil de l’étape.', 'Le conseil'));
        if (x.citation) poser(`etapes.${i}.citation.texte`, AC.requis(x.citation.texte, LONGUEURS.guideCitation, 'Recopiez le prompt du parcours cité.', 'Le prompt cité'));
      });
      if (s.etapes.length > LIMITES.etapes) poser('etapes', `La méthode compte ${LIMITES.etapes} étapes au plus.`);
      s.pieges.forEach((x, i) => {
        poser(`pieges.${i}.titre`, AC.requis(x.titre, LONGUEURS.guidePiegeTitre, 'Décrivez le piège.', 'Le piège'));
        poser(`pieges.${i}.solution`, AC.requis(x.solution, LONGUEURS.guideSolution, 'Indiquez ce qui a fonctionné.', 'Ce qui a fonctionné'));
        if (x.etape !== null && x.etape >= s.etapes.length) poser(`pieges.${i}.etape`, 'Choisissez une étape de la méthode.');
      });
      if (s.pieges.length > LIMITES.pieges) poser('pieges', `Un guide compte ${LIMITES.pieges} pièges au plus.`);
      return erreurs;
    }

    /** Chaque erreur sous son champ (« etapes.2.titre » : le titre de la troisième étape), à défaut
        sous sa liste, sinon dans le panneau ; la première reçoit le focus. */
    function afficher(erreurs) {
      $$('[data-ad-erreur], [data-ad-erreur-champ]', formulaire).forEach(zone => { zone.textContent = ''; zone.hidden = true; });
      $$('[aria-invalid]', formulaire).forEach(champ => champ.removeAttribute('aria-invalid'));
      erreurGenerale.textContent = '';
      erreurGenerale.hidden = true;
      let premier = null;
      Object.entries(erreurs).forEach(([chemin, message]) => {
        const [racine = '', rang, ...reste] = chemin.split('.');
        const souschamp = reste.join('.');
        let zone = null;
        let champ = null;
        if ((racine === 'etapes' || racine === 'pieges') && rang && /^\d+$/.test(rang)) {
          const li = blocs(racine)[Number(rang)];
          if (li && souschamp) {
            zone = $(`[data-ad-erreur-champ="${souschamp}"]`, li);
            champ = $(`[data-champ="${souschamp}"]`, li);
          }
          zone ??= $(`[data-ad-erreur="${racine}"]`, formulaire);
        } else {
          zone = $(`[data-ad-erreur="${racine}"]`, formulaire);
          champ = element(racine);
        }
        zone ??= erreurGenerale;
        if (!zone.hidden) return;
        zone.textContent = V.typo(message);
        zone.hidden = false;
        if (champ?.matches?.('input, select, textarea')) champ.setAttribute('aria-invalid', 'true');
        premier ??= champ ?? zone;
      });
      if (premier) {
        premier.scrollIntoView({ block: 'center', behavior: 'instant' });
        if (premier.matches('input, select, textarea')) premier.focus({ preventScroll: true });
      }
    }

    /** « 2 étapes et 1 piège retirés disparaissent aussi des listes de contrôle des membres. » */
    function retraits(etapes, pieges) {
      if (!etapes && !pieges) return '';
      const sujet = etapes && pieges
        ? `${AC.pluriel(etapes, 'étape', 'étapes')} et ${AC.pluriel(pieges, 'piège', 'pièges')} retirés`
        : etapes ? AC.pluriel(etapes, 'étape retirée', 'étapes retirées') : AC.pluriel(pieges, 'piège retiré', 'pièges retirés');
      return ` ${sujet} ${etapes + pieges > 1 ? 'disparaissent' : 'disparaît'} aussi des listes de contrôle des membres.`;
    }

    function recharger(message, ancre = '') {
      modifie = false;
      AC.rechargerSur(ancre, message);
    }
    /** Écriture simulée du guide (PUT, POST… de l'API), puis rechargement. */
    function ecrire(modifier, message, ancre) {
      const e = AC.guides();
      const g = e.guides.find(x => x.id === guideId);
      const refus = modifier(g, e);
      if (refus) return refus;
      AC.garderGuides(e);
      recharger(message, ancre);
      return null;
    }
    const confirmerAction = (titre, texte, libelle, action, danger = false) => AC.confirmer(titre, texte, libelle, action, danger);
    const perte = () => (modifie ? ' Vos modifications non enregistrées seront perdues.' : '');

    formulaire.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const s = saisie();
      const erreurs = controler(s);
      if (Object.keys(erreurs).length) return afficher(erreurs);
      afficher({});
      // Mots-clés sans doublon (sans tenir compte des majuscules), la première graphie gardée.
      s.motsCles = s.motsCles.filter((m, i) => s.motsCles.findIndex(autre => autre.toLowerCase() === m.toLowerCase()) === i);
      const gardees = liste => new Set(s[liste].map(x => String(x.id)));
      const retirees = liste => initiaux[liste].filter(id => !gardees(liste).has(id)).length;
      confirmerAction('Enregistrer le guide ?',
        (publie ? 'Les modifications s’appliquent aussitôt dans Explorer.' : 'Le guide reste en préparation : personne ne le voit avant sa publication.') + retraits(retirees('etapes'), retirees('pieges')),
        'Enregistrer',
        () => {
          if (enregistrer) { enregistrer.disabled = true; enregistrer.setAttribute('aria-busy', 'true'); }
          const refus = ecrire((g, e) => {
            // L'API reste seule juge : un guide publié garde au moins une étape.
            if (g.datePublication && !s.etapes.length) return { etapes: 'Un guide publié garde au moins une étape dans sa méthode.' };
            const etapes = s.etapes.map(x => ({ ...x, id: x.id ?? e.prochains.etape++ }));
            Object.assign(g, {
              titre: s.titre.trim(), titreCourt: s.titreCourt.trim(), categorieId: Number(s.categorieId), motsCles: s.motsCles, lacunes: s.lacunes, etapes,
              pieges: s.pieges.map(({ etape, ...x }) => ({ ...x, id: x.id ?? e.prochains.piege++, etapeId: etape === null ? null : etapes[etape].id }))
            });
            return null;
          }, 'Guide enregistré.');
          if (refus) {
            if (enregistrer) { enregistrer.disabled = false; enregistrer.removeAttribute('aria-busy'); }
            afficher(refus);
          }
        });
    });

    /* Actions immédiates : contenus, publication, suppression */

    const formContenu = $('[data-ad-contenu]');
    const champContenu = $('[name="adresse"]', formContenu);
    const zoneContenu = $('[data-ad-erreur="contenuId"]', formContenu);
    const erreurContenu = (message = '') => {
      zoneContenu.textContent = V.typo(message);
      zoneContenu.hidden = !message;
      champContenu.setAttribute('aria-invalid', String(Boolean(message)));
    };
    /** POST /api/v1/admin/guides/:id/contenus : mêmes refus que l'API. */
    const ajouter = contenuId => {
      const refus = ecrire((g, e) => {
        const c = AC.contenu(contenuId);
        if (!c) return 'Indiquez une création, une question du forum ou un cas Bon réflexe.';
        if (c.etat) return c.type === 'CAS_BON_REFLEXE' ? 'Ce cas n’est pas validé ou n’est pas visible : il ne peut pas rejoindre un guide.' : 'Ce contenu n’est pas publié ou n’est pas visible : il ne peut pas rejoindre un guide.';
        if (g.contenus.includes(c.id)) return 'Ce contenu fait déjà partie du guide.';
        const autre = c.type === 'CREATION' ? e.guides.find(x => x.id !== g.id && x.contenus.includes(c.id)) : null;
        if (autre) return `Ce parcours fait partie du guide « ${autre.titreCourt} ». Retirez-le d’abord de ce guide.`;
        g.contenus.push(c.id);
        g.retires = g.retires.filter(id => id !== c.id);
        return null;
      }, 'Contenu ajouté au guide.', `contenu-${contenuId}`);
      if (refus) erreurContenu(refus);
    };
    formContenu.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const contenuId = AC.numeroDeContenu(champContenu.value);
      if (contenuId === null) return erreurContenu('Indiquez l’adresse d’une création, d’une question du forum ou d’un cas Bon réflexe, ou son numéro.');
      erreurContenu();
      if (!modifie) return ajouter(contenuId);
      confirmerAction('Ajouter ce contenu ?', `La page se recharge avec le contenu ajouté.${perte()}`, 'Ajouter', () => ajouter(contenuId));
    });
    $$('[data-ad-remettre]').forEach(remettre => remettre.addEventListener('click', () => {
      const contenuId = Number(remettre.dataset.adRemettre);
      confirmerAction('Remettre ce parcours dans le guide ?', `« ${remettre.dataset.titre || ''} » rejoint de nouveau les parcours du guide.${perte()}`, 'Remettre', () => ajouter(contenuId));
    }));

    const EFFETS_RETRAIT = {
      CREATION: 'ne figure plus dans le guide, ni dans sa méthode et ses pièges ; une nouvelle publication ne l’y rangera plus. Il reste publié sur Vysora.',
      SUJET: 'n’est plus une question du guide, ni la discussion de ses pièges. Elle reste publiée sur le forum.',
      CAS_BON_REFLEXE: 'n’est plus un cas du guide, ni l’entraînement de ses pièges. Il reste dans Bon réflexe.'
    };
    $$('[data-ad-retirer-contenu]').forEach(bouton => bouton.addEventListener('click', () => {
      const contenuId = Number(bouton.dataset.adRetirerContenu);
      const type = bouton.dataset.type || 'CREATION';
      confirmerAction(
        type === 'CREATION' ? 'Retirer ce parcours du guide ?' : type === 'SUJET' ? 'Retirer cette question du guide ?' : 'Retirer ce cas du guide ?',
        `« ${bouton.dataset.titre || ''} » ${EFFETS_RETRAIT[type] || ''}${perte()}`,
        'Retirer',
        () => {
          const refus = ecrire(g => {
            if (!g.contenus.includes(contenuId)) return 'Ce contenu ne fait pas partie du guide.';
            g.contenus = g.contenus.filter(id => id !== contenuId);
            if (type === 'CREATION') {
              // Un parcours retiré quitte la méthode et les pièges ; le rapprochement ne l'y range plus.
              g.retires.push(contenuId);
              g.etapes.forEach(x => { x.sources = x.sources.filter(id => id !== contenuId); if (x.citation?.parcoursId === contenuId) x.citation = null; });
              g.pieges.forEach(x => { x.sources = x.sources.filter(id => id !== contenuId); });
            }
            if (type === 'SUJET') g.pieges.forEach(x => { if (x.sujetId === contenuId) x.sujetId = null; });
            if (type === 'CAS_BON_REFLEXE') g.pieges.forEach(x => { if (x.casId === contenuId) x.casId = null; });
            return null;
          }, 'Contenu retiré du guide.', 'contenus');
          if (refus) AC.signalerRefus(refus);
        }
      );
    }));

    const PUBLICATION = {
      publier: { titre: 'Publier ce guide ?', texte: 'il apparaît dans Explorer avec sa méthode, ses pièges et ses parcours ; les créations publiées ensuite peuvent le rejoindre par le rapprochement.', libelle: 'Publier', message: 'Guide publié : il apparaît dans Explorer.' },
      retirer: { titre: 'Repasser ce guide en préparation ?', texte: 'il disparaît d’Explorer. Les listes de contrôle des membres sont gardées et reviendront avec lui.', libelle: 'Repasser en préparation', message: 'Guide repassé en préparation.' }
    };
    $$('[data-ad-publication]').forEach(bouton => {
      const quoi = bouton.dataset.adPublication;
      const choix = PUBLICATION[quoi];
      bouton.addEventListener('click', () => {
        afficher({});
        confirmerAction(choix.titre, `« ${nom} » : ${choix.texte}${perte()}`, choix.libelle, () => {
          const refus = ecrire(g => {
            if (quoi === 'publier') {
              if (g.datePublication) return 'Ce guide est déjà publié.';
              if (!g.etapes.length) return 'Ajoutez au moins une étape à la méthode avant de publier le guide.';
              g.datePublication = new Date().toISOString();
              return null;
            }
            if (!g.datePublication) return 'Ce guide est déjà en préparation.';
            g.datePublication = null;
            return null;
          }, choix.message);
          if (refus) afficher({ general: refus });
        });
      });
    });

    $('[data-ad-supprimer]')?.addEventListener('click', () => {
      confirmerAction('Supprimer ce guide ?',
        `« ${nom} » n’a servi à aucun membre. Sa méthode, ses pièges et la liste de ses contenus sont effacés ; les contenus eux-mêmes restent publiés. Cette action est définitive.`,
        'Supprimer',
        () => {
          const e = AC.guides();
          e.guides = e.guides.filter(g => g.id !== guideId);
          AC.garderGuides(e);
          modifie = false;
          AC.messageApresChargement(`Guide « ${nom} » supprimé.`);
          window.location.assign('administration-guides.html');
        },
        true);
    });

    actualiser();
  }

  /* Montage ---------------------------------------------------------------------------------------- */

  AC.monter({
    cle: 'vysora-administration-guide-reglages',
    etats: [{ name: 'guide', legend: 'Guide', options: [['ouvert', 'Guide ouvert'], ['introuvable', 'Guide introuvable']] }],
    defaults: { guide: 'ouvert' },
    quoi: 'rédiger un guide d’Explorer',
    titre: 'Guides d’Explorer · Administration · Vysora',
    rendre
  });
})();
