'use strict';

/* Proposer un cas Bon réflexe (APP-03, EC-11, F-60, RG-70, RG-71), dans le style
   de « Poser une question » du forum : situation, échange avec l'IA, question,
   deux à cinq options dont une seule juste, explications, difficulté, domaine,
   durée et étiquettes. « Vos cas proposés » rappelle le statut de chacun et le
   motif d'un refus ; un cas refusé se corrige ici (?cas=…). Réservé au niveau
   Expert et à l'équipe de modération (droit « proposer-cas »). */

(() => {
  const V = window.Vysora;
  const B = window.VYSORA_BON_REFLEXE_NOUVEAU;
  if (!V || !B) return;
  const { D, $, $$, esc, t, typo, icon } = V;
  const L = B.longueurs;
  const LIM = B.limites;
  const RETOUR = 'apprendre.html?rubrique=bon-reflexe';
  const nombreFr = n => new Intl.NumberFormat('fr-FR').format(n);
  const lettre = i => String.fromCharCode(65 + i);
  let reglages = {};

  /* Formulaire (site : lib/bon-reflexe/editeur.ts) ------------------------ */

  function formulaireHTML(cas) {
    const valeurs = {
      titre: cas?.titre ?? '',
      contexte: cas?.contexte ?? '',
      demandeIa: cas?.demandeIa ?? '',
      reponseIa: cas?.reponseIa ?? '',
      question: cas?.question ?? 'Que faites-vous ?',
      explication: cas?.explication ?? '',
      modele: cas?.modele ?? '',
      etiquettes: (cas?.etiquettes ?? []).join(', ')
    };
    const lesOptions = cas ? cas.options : [0, 1, 2].map(i => ({ libelle: '', explication: '', correcte: i === 0 }));
    const champ = (id, libelle, description, controle, facultatif = false) => `<div class="qa-field" data-field="${id}">
        <label class="qa-field-label" for="${id}">${t(libelle)}${facultatif ? ' <span>Facultatif</span>' : ''}</label>
        ${description ? `<p class="qa-field-desc" id="${id}-help">${t(description)}</p>` : ''}
        ${controle}
        <p class="ex-error" id="${id}-error" hidden></p>
      </div>`;
    const zone = (id, lignes, valeur, max, indication = '') => `<textarea id="${id}" name="${id}" rows="${lignes}" maxlength="${max}"${indication ? ` placeholder="${esc(indication)}"` : ''} aria-describedby="${id}-help ${id}-error">${esc(valeur)}</textarea>`;
    const option = (o, i) => `<fieldset class="cs-option" data-option>
        <legend>${t(`Option ${lettre(i)}`)}</legend>
        <label class="cs-juste"><input type="radio" name="cs-correcte" value="${i}"${o.correcte ? ' checked' : ''}><span>Bonne réponse</span></label>
        <label class="sr-only" for="cs-option-${i}">${t(`Texte de l’option ${lettre(i)}`)}</label>
        <textarea id="cs-option-${i}" data-option-libelle rows="2" maxlength="${L.optionLibelle.max}" placeholder="${esc(typo('Ce que fait l’apprenant'))}" aria-describedby="cs-option-${i}-error">${esc(o.libelle)}</textarea>
        <p class="ex-error" id="cs-option-${i}-error" hidden></p>
        <label class="sr-only" for="cs-explication-${i}">${t(`Explication de l’option ${lettre(i)}`)}</label>
        <textarea id="cs-explication-${i}" data-option-explication rows="2" maxlength="${L.optionExplication.max}" placeholder="${esc(typo('Pourquoi ce choix est juste ou ne l’est pas (20 caractères au moins)'))}" aria-describedby="cs-explication-${i}-error">${esc(o.explication)}</textarea>
        <p class="ex-error" id="cs-explication-${i}-error" hidden></p>
        <button class="link-btn" type="button" data-retirer-option>Retirer cette option</button>
      </fieldset>`;
    const outils = D.tools.map((o, i) => `<option value="${i + 1}"${cas?.outil === o.name ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    const domaines = D.categories.map((c, i) => `<option value="${i + 1}"${cas?.domaine === c.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('');

    return `
    <form class="qa-ask-form" data-cas-form data-cas="${cas?.id ?? ''}" novalidate>
      ${champ('cs-titre', 'Titre', 'La situation en une phrase : ce que l’IA a fait, ou ce qu’elle a répondu.', `<input id="cs-titre" name="titre" type="text" maxlength="${L.casTitre.max}" autocomplete="off" value="${esc(valeurs.titre)}" placeholder="${esc(typo('Par exemple : l’IA cite une étude qui n’existe pas'))}" aria-describedby="cs-titre-help cs-titre-error">`)}
      ${champ('cs-contexte', 'Situation', 'Le contexte de départ : qui demande quoi, et pour quel usage.', zone('cs-contexte', 3, valeurs.contexte, L.casContexte.max))}
      <div class="qa-n-row">
        ${champ('cs-demande', 'Demande faite à l’IA', 'Le prompt exact.', zone('cs-demande', 4, valeurs.demandeIa, L.casDemandeIa.max))}
        ${champ('cs-reponse', 'Réponse de l’IA', 'La réponse à juger, telle qu’elle a été donnée.', zone('cs-reponse', 4, valeurs.reponseIa, L.casReponseIa.max))}
      </div>
      <div class="qa-n-row">
        ${champ('cs-outil', 'Outil', '', `<div class="ex-select"><select id="cs-outil" name="outilId" aria-describedby="cs-outil-error"><option value="">Non précisé</option>${outils}</select>${icon('chevron-down')}</div>`, true)}
        ${champ('cs-modele', 'Version du modèle', '', `<input id="cs-modele" name="modele" type="text" maxlength="${L.modele.max}" autocomplete="off" value="${esc(valeurs.modele)}" placeholder="Par exemple : GPT-5, Sonnet 4.5" aria-describedby="cs-modele-error">`, true)}
      </div>
      ${champ('cs-question', 'Question posée à l’apprenant', '', `<input id="cs-question" name="question" type="text" maxlength="${L.casQuestion.max}" value="${esc(valeurs.question)}" aria-describedby="cs-question-error">`)}
      <div class="qa-field" data-field="cs-options">
        <p class="qa-field-label" id="cs-options-titre">Options</p>
        <p class="qa-field-desc">${t('De deux à cinq options, dont une seule est juste. Chacune a son explication, montrée après la réponse.')}</p>
        <div class="cs-options" data-options>${lesOptions.map(option).join('')}</div>
        <p class="ex-error" id="cs-options-error" hidden></p>
        <button class="btn btn-secondary btn-sm" type="button" data-ajouter-option>${icon('plus')}Ajouter une option</button>
      </div>
      ${champ('cs-explication', 'Explication générale', `Le bon réflexe à retenir, en ${L.casExplication.min} caractères au moins.`, zone('cs-explication', 4, valeurs.explication, L.casExplication.max))}
      <div class="qa-n-row cs-trois">
        <div class="qa-field" data-field="cs-difficulte">
          <p class="qa-field-label">Difficulté</p>
          <div class="cs-difficultes" role="radiogroup" aria-label="Difficulté">${B.difficultes.map(([d, libelle]) => `<label class="cs-chip"><input type="radio" name="difficulte" value="${d}"${(cas?.difficulte ?? 'DEBUTANT') === d ? ' checked' : ''}><span>${t(libelle)}</span></label>`).join('')}</div>
          <p class="ex-error" id="cs-difficulte-error" hidden></p>
        </div>
        ${champ('cs-domaine', 'Domaine', '', `<div class="ex-select"><select id="cs-domaine" name="categorieId" aria-describedby="cs-domaine-error"><option value="">Non précisé</option>${domaines}</select>${icon('chevron-down')}</div>`, true)}
        ${champ('cs-duree', 'Durée (minutes)', '', `<input id="cs-duree" name="dureeMinutes" type="number" inputmode="numeric" min="${LIM.dureeCasMinutes.min}" max="${LIM.dureeCasMinutes.max}" value="${cas?.dureeMinutes ?? ''}" aria-describedby="cs-duree-error">`, true)}
      </div>
      ${champ('cs-etiquettes', 'Étiquettes', 'Cinq au plus, séparées par des virgules.', `<input id="cs-etiquettes" name="etiquettes" type="text" autocomplete="off" value="${esc(valeurs.etiquettes)}" placeholder="Par exemple : sources, droits d’auteur" aria-describedby="cs-etiquettes-help cs-etiquettes-error">`, true)}
      <p class="ex-error" data-erreur-generale role="alert" hidden></p>
      <div class="qa-ask-actions">
        <button class="btn btn-primary" type="submit">Soumettre à validation</button>
        <a class="link-btn" href="${RETOUR}">Annuler</a>
      </div>
    </form>`;
  }

  /* Page (site : components/EditeurCas.astro) ----------------------------- */

  function mesCasHTML(cas) {
    const liste = reglages['cs-mes-cas'] === 'aucun' ? [] : B.mesCas;
    const corps = liste.length
      ? `<ul>${liste.map(c => `<li>
                  <b>${t(c.titre)}</b>
                  <span class="cs-statut is-${c.statut.toLowerCase()}">${t(B.statuts[c.statut])}</span>
                  ${c.statut === 'REFUSE' && c.examen?.motif ? `<small>${t(c.examen.motif)}</small>` : ''}
                  ${c.statut === 'VALIDE' ? `<a href="${c.href}">Voir le cas</a>` : c.id !== cas?.id ? `<a href="bon-reflexe-nouveau.html?cas=${c.id}" data-cas-lien="${c.id}">${c.statut === 'REFUSE' ? 'Corriger' : 'Modifier'}</a>` : ''}
                </li>`).join('')}</ul>`
      : `<p>${t('Vos cas apparaîtront ici, avec leur statut et le motif d’un éventuel refus.')}</p>`;
    return `<aside class="qa-side" aria-label="Vos cas proposés">
        <section class="qa-box cs-mes-cas">
          <h2>Vos cas proposés</h2>
          ${corps}
        </section>
      </aside>`;
  }

  function rendre({ focus = false } = {}) {
    const page = $('[data-cs-page]');
    const cas = B.cas[ECRANS[reglages['cs-ecran']]] ?? null;
    document.title = cas ? 'Corriger un cas · Bon réflexe · Vysora' : 'Proposer un cas · Bon réflexe · Vysora';
    const bloc = V.accesBloc('proposer-cas', 'proposer un cas Bon réflexe', 'h1');
    if (bloc) { page.innerHTML = bloc; return; }
    page.innerHTML = `
      <div class="qa-main qa-ask">
        <h1 id="qa-title" tabindex="-1">${cas ? 'Corriger votre cas' : 'Proposer un cas'}</h1>
        ${cas?.examen?.motif ? `<section class="qa-box cs-refus" aria-labelledby="cs-refus-titre">
            <h2 id="cs-refus-titre">${t(`Refusé le ${V.dateLabel(cas.examen.date)}`)}</h2>
            <p>${t(cas.examen.motif)}</p>
          </section>` : ''}
        <section class="qa-box is-guide qa-ask-intro" aria-labelledby="cs-intro-titre">
          <h2 id="cs-intro-titre">Un cas qui apprend le bon réflexe</h2>
          <p>${t('Un cas part d’une situation réelle où l’IA se trompe, invente ou va trop loin :')}</p>
          <ol class="qa-steps-mini">
            <li>${t('Décrivez la situation et collez l’échange exact avec l’IA.')}</li>
            <li>${t('Proposez des options plausibles : une seule est le bon réflexe.')}</li>
            <li>${t('Expliquez chaque option : c’est là que l’apprenant progresse.')}</li>
            <li>${t('La modération relit le cas avant sa publication dans Bon réflexe.')}</li>
          </ol>
        </section>
        ${formulaireHTML(cas)}
      </div>
      ${mesCasHTML(cas)}`;
    numeroter();
    if (focus) $('#qa-title')?.focus({ preventScroll: true });
  }

  /* Options : deux à cinq (site : scripts/editeur-cas.ts) ------------------- */

  const formulaire = () => $('[data-cas-form]');
  function numeroter() {
    const form = formulaire();
    if (!form) return;
    const options = $$('[data-option]', $('[data-options]', form));
    options.forEach((o, i) => {
      $('legend', o).textContent = `Option ${lettre(i)}`;
      $('input[type="radio"]', o).value = String(i);
      [['data-option-libelle', 'cs-option'], ['data-option-explication', 'cs-explication']].forEach(([attribut, base]) => {
        const zone = $(`[${attribut}]`, o);
        zone.id = `${base}-${i}`;
        zone.setAttribute('aria-describedby', `${base}-${i}-error`);
        const erreur = zone.nextElementSibling;
        if (erreur) erreur.id = `${base}-${i}-error`;
        const etiquette = zone.previousElementSibling;
        if (etiquette) { etiquette.htmlFor = zone.id; etiquette.textContent = typo(base === 'cs-option' ? `Texte de l’option ${lettre(i)}` : `Explication de l’option ${lettre(i)}`); }
      });
      $('[data-retirer-option]', o).hidden = options.length <= LIM.optionsParCas.min;
    });
    $('[data-ajouter-option]', form).hidden = options.length >= LIM.optionsParCas.max;
  }

  document.addEventListener('click', event => {
    const form = formulaire();
    if (!form || !form.contains(event.target)) return;
    const liste = $('[data-options]', form);
    if (event.target.closest('[data-ajouter-option]')) {
      const copie = $('[data-option]', liste).cloneNode(true);
      $$('textarea', copie).forEach(zone => { zone.value = ''; zone.removeAttribute('aria-invalid'); });
      $('input[type="radio"]', copie).checked = false;
      $$('.ex-error', copie).forEach(erreur => { erreur.hidden = true; erreur.textContent = ''; });
      liste.append(copie);
      numeroter();
      $('textarea', copie)?.focus();
      return;
    }
    const retirer = event.target.closest('[data-retirer-option]');
    if (retirer) {
      retirer.closest('[data-option]')?.remove();
      numeroter();
    }
  });

  /* Contrôle de la saisie (site : schemaCas, packages/shared) --------------- */

  const valeur = id => ($(`#${id}`)?.value ?? '').trim();
  function controler() {
    const form = formulaire();
    const erreurs = {};
    const ajouter = (chemin, message) => { if (!(chemin in erreurs)) erreurs[chemin] = message; };
    const texte = (chemin, id, bornes, court, long) => {
      const v = valeur(id);
      if (v.length < bornes.min) ajouter(chemin, court);
      else if (v.length > bornes.max) ajouter(chemin, long);
    };
    texte('titre', 'cs-titre', L.casTitre, `Le titre doit compter au moins ${L.casTitre.min} caractères.`, `Le titre compte ${L.casTitre.max} caractères au plus.`);
    texte('contexte', 'cs-contexte', L.casContexte, `Décrivez la situation en ${L.casContexte.min} caractères au moins.`, `La situation compte ${nombreFr(L.casContexte.max)} caractères au plus.`);
    texte('demandeIa', 'cs-demande', L.casDemandeIa, 'Collez la demande faite à l’IA.', `La demande faite à l’IA compte ${nombreFr(L.casDemandeIa.max)} caractères au plus.`);
    texte('reponseIa', 'cs-reponse', L.casReponseIa, 'Collez la réponse de l’IA à juger.', `La réponse de l’IA compte ${nombreFr(L.casReponseIa.max)} caractères au plus.`);
    texte('question', 'cs-question', L.casQuestion, 'Rédigez la question posée à l’apprenant.', `La question compte ${L.casQuestion.max} caractères au plus.`);
    texte('explication', 'cs-explication', L.casExplication, `Rédigez l’explication générale en ${L.casExplication.min} caractères au moins.`, `L’explication générale compte ${nombreFr(L.casExplication.max)} caractères au plus.`);
    if (!$('input[name="difficulte"]:checked', form)) ajouter('difficulte', 'Choisissez la difficulté du cas.');
    const duree = valeur('cs-duree');
    if (duree) {
      const n = Number(duree);
      const { min, max } = LIM.dureeCasMinutes;
      if (!Number.isInteger(n)) ajouter('dureeMinutes', 'Indiquez une durée en minutes.');
      else if (n < min || n > max) ajouter('dureeMinutes', `La durée compte de ${min} à ${max} minutes.`);
    }
    if (valeur('cs-modele').length > L.modele.max) ajouter('modeleNonReference', `Le nom du modèle compte ${L.modele.max} caractères au plus.`);
    const etiquettes = valeur('cs-etiquettes').split(',').map(e => e.trim()).filter(Boolean);
    etiquettes.forEach((e, i) => {
      if (e.length > L.etiquette.max) ajouter(`etiquettes.${i}`, `Une étiquette compte ${L.etiquette.max} caractères au plus.`);
      else if (!/[\p{L}\p{N}]/u.test(e)) ajouter(`etiquettes.${i}`, 'Utilisez des lettres ou des chiffres dans chaque étiquette.');
    });
    const distinctes = etiquettes.filter((e, i) => etiquettes.findIndex(autre => autre.toLowerCase() === e.toLowerCase()) === i);
    if (distinctes.length > LIM.etiquettes) ajouter('etiquettes', `Gardez ${LIM.etiquettes} étiquettes au plus.`);
    const options = $$('[data-option]', form).map(o => ({
      libelle: $('[data-option-libelle]', o).value.trim(),
      explication: $('[data-option-explication]', o).value.trim(),
      correcte: $('input[type="radio"]', o).checked
    }));
    const { min: omin, max: omax } = LIM.optionsParCas;
    if (options.length < omin) ajouter('options', `Proposez au moins ${omin} options.`);
    if (options.length > omax) ajouter('options', `Proposez ${omax} options au plus.`);
    options.forEach((o, i) => {
      if (o.libelle.length < L.optionLibelle.min) ajouter(`options.${i}.libelle`, 'Rédigez le texte de cette option.');
      if (o.explication.length < L.optionExplication.min) ajouter(`options.${i}.explication`, `Expliquez pourquoi cette option est juste ou fausse, en ${L.optionExplication.min} caractères au moins.`);
    });
    // CI-16 : contrôles d'ensemble, une fois chaque champ valable (comme l'API).
    if (!Object.keys(erreurs).length) {
      const correctes = options.filter(o => o.correcte).length;
      if (correctes === 0) ajouter('options', 'Indiquez la bonne réponse parmi les options.');
      if (correctes > 1) ajouter('options', 'Une seule option est la bonne réponse.');
      const vus = new Set();
      options.forEach((o, i) => {
        const cle = o.libelle.toLocaleLowerCase('fr');
        if (vus.has(cle)) ajouter(`options.${i}.libelle`, 'Deux options ont le même texte.');
        vus.add(cle);
      });
    }
    return erreurs;
  }

  const CHAMPS = { titre: 'cs-titre', contexte: 'cs-contexte', demandeIa: 'cs-demande', reponseIa: 'cs-reponse', question: 'cs-question', explication: 'cs-explication', difficulte: 'cs-difficulte', dureeMinutes: 'cs-duree', modeleNonReference: 'cs-modele', etiquettes: 'cs-etiquettes', options: 'cs-options' };
  /* Identifiant du champ d'une erreur (« options.1.explication » → cs-explication-1). */
  function champDe(chemin) {
    const [racine, rang, sous] = chemin.split('.');
    if (racine === 'options' && rang !== undefined && sous) return `${sous === 'explication' ? 'cs-explication' : 'cs-option'}-${rang}`;
    return CHAMPS[racine] ?? '';
  }
  function afficher(erreurs) {
    const form = formulaire();
    $$('.ex-error', form).forEach(zone => { zone.hidden = true; zone.textContent = ''; });
    $$('[aria-invalid="true"]', form).forEach(champ => champ.removeAttribute('aria-invalid'));
    let premier = null;
    Object.entries(erreurs).forEach(([chemin, message]) => {
      const id = champDe(chemin);
      const zone = id ? document.getElementById(`${id}-error`) : $('[data-erreur-generale]', form);
      if (!zone || !zone.hidden) return;
      zone.textContent = typo(message);
      zone.hidden = false;
      const controle = id ? document.getElementById(id) : null;
      controle?.setAttribute('aria-invalid', 'true');
      premier ??= controle ?? zone;
    });
    premier?.focus();
  }

  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-cas-form]');
    if (!form) return;
    event.preventDefault();
    const erreurs = controler();
    if (Object.keys(erreurs).length) { afficher(erreurs); return; }
    afficher({});
    const envoyer = $('button[type="submit"]', form);
    envoyer.disabled = true;
    await new Promise(resolve => setTimeout(resolve, 650));
    envoyer.disabled = false;
    if (reglages['cs-envoi'] === 'erreur') { afficher({ _: 'Le cas n’a pas été envoyé. Réessayez dans un instant.' }); return; }
    try { sessionStorage.setItem('vysora-message-suivant', 'Cas soumis à validation. La modération le relit avant sa publication.'); } catch { /* stockage indisponible */ }
    location.assign(RETOUR);
  });

  /* « Corriger » ou « Modifier » dans « Vos cas proposés » : le cas ouvert à la correction. */
  document.addEventListener('click', event => {
    const lien = event.target.closest('[data-cas-lien]');
    if (!lien || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState(null, '', `bon-reflexe-nouveau.html?cas=${lien.dataset.casLien}`);
    V.regler('cs-ecran', depuisAdresse());
    window.scrollTo({ top: 0 });
  });

  /* Démarrage ----------------------------------------------------------------- */

  /* Écran de la page et cas ouvert (?cas=41 : refusé, ?cas=46 : en attente). */
  const ECRANS = { nouveau: null, correction: 41, modification: 46 };
  const depuisAdresse = () => {
    const id = Number(new URLSearchParams(location.search).get('cas'));
    return Object.keys(ECRANS).find(nom => ECRANS[nom] === id) ?? (new URLSearchParams(location.search).has('cas') ? 'correction' : 'nouveau');
  };
  let pret = false;
  V.initHeader();
  V.initTweaks({
    key: 'vysora-bon-reflexe-nouveau-reglages',
    etats: [
      { name: 'cs-ecran', legend: 'Écran', options: [['nouveau', 'Nouveau cas'], ['correction', 'Correction d’un cas refusé'], ['modification', 'Modification d’un cas en attente']] },
      { name: 'cs-mes-cas', legend: 'Vos cas proposés', options: [['plusieurs', 'Trois cas (en attente, refusé, validé)'], ['aucun', 'Aucun cas']] },
      { name: 'cs-envoi', legend: 'Résultat de l’envoi', options: [['succes', 'Cas soumis'], ['erreur', 'Envoi impossible']] }
    ],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: { 'cs-ecran': 'nouveau', 'cs-mes-cas': 'plusieurs', 'cs-envoi': 'succes' },
    onChange: (change, valeurs) => {
      reglages = valeurs;
      if (change === 'init') return;
      if (change === 'cs-ecran' || change === 'reset') {
        const id = ECRANS[valeurs['cs-ecran']];
        if (depuisAdresse() !== valeurs['cs-ecran']) history.replaceState(null, '', id ? `bon-reflexe-nouveau.html?cas=${id}` : 'bon-reflexe-nouveau.html');
      }
      if (['cs-ecran', 'cs-mes-cas', 'reset'].includes(change)) rendre({ focus: pret && change === 'cs-ecran' });
    }
  });
  window.addEventListener('popstate', () => { if (reglages['cs-ecran'] !== depuisAdresse()) V.regler('cs-ecran', depuisAdresse()); });
  V.etats.on(() => rendre());
  V.fixTypography(document.querySelector('.site-footer'));
  if (reglages['cs-ecran'] !== depuisAdresse()) V.regler('cs-ecran', depuisAdresse());
  else rendre();
  pret = true;
})();
