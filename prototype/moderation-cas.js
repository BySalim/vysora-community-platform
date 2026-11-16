'use strict';

/* Cas Bon réflexe à valider (MOD-03, EC-20, F-61, RG-71) : liste (moderation-cas.html) et examen
   d'un cas (moderation-cas-examen.html?id=…). Démo des écrans du site
   (apps/web/src/pages/moderation/cas/), mêmes balisage, classes et textes ; données dans
   moderation-data.js. Un examen simulé est gardé pour la session du navigateur : le cas quitte la
   liste. États dans le panneau Tweaks : liste remplie ou vide ; cas introuvable, validé, refusé ou
   masqué. */

(() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_MODERATION;
  const { $, $$, t, fmt, icon } = V;
  const vue = document.body.dataset.mdVue;
  const DIFFICULTES = { DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé' };
  const MOTIF_MAX = 1000;
  const POINTS_CAS_VALIDE = 10;

  const CLE = 'vysora-moderation-examens';
  const examens = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || '{}') || {}; } catch { return {}; } };
  const garderExamen = (id, examen) => {
    const tous = examens();
    tous[id] = examen;
    try { sessionStorage.setItem(CLE, JSON.stringify(tous)); } catch { /* stockage indisponible */ }
  };
  const aExaminer = () => D.cas.filter(c => !examens()[c.id]);
  const avatar = (m, taille, classe = '') => (m.avatar
    ? `<img${classe ? ` class="${classe}"` : ''} src="${m.avatar}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar${classe ? ` ${classe}` : ''}" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', 'icon')}</span>`);
  const onglets = nb => EQ.ongletsModeration('cas', {
    signalements: D.contenus.filter(c => c.signalements.some(s => s.statut === 'OUVERT') || c.nouvelExamen).length,
    cas: nb
  });

  /* Liste ------------------------------------------------------------------------------------------ */

  function rendreListe(reglages) {
    const liste = reglages.liste === 'vide' ? [] : aExaminer().sort((a, b) => b.soumisIlYa - a.soumisIlYa);
    const ligne = c => `<li class="md-item"><a class="md-ouvrir" href="moderation-cas-examen.html?id=${c.id}">
        ${avatar(c.auteur, 40, 'md-visuel')}
        <span class="md-item-corps">
          <span class="md-item-haut"><span class="md-genre">${icon('bulb', 'icon icon-xs')}Cas · ${DIFFICULTES[c.difficulte]}</span><span class="md-sep" aria-hidden="true">·</span><span class="md-qui">${t(c.auteur.nom)}</span></span>
          <span class="md-item-titre">${t(c.titre)}</span>
          ${c.nouvelleSoumission || c.mien ? `<span class="md-item-marques">
            ${c.nouvelleSoumission ? `<span class="md-marque is-accent">${icon('pen', 'icon icon-xs')}${t('Modifié par l’auteur : nouvelle soumission')}</span>` : ''}
            ${c.mien ? `<span class="md-marque">${icon('user', 'icon icon-xs')}${t('Votre cas : un autre membre de l’équipe l’examine')}</span>` : ''}
          </span>` : ''}
        </span>
        <span class="md-item-attente"><time datetime="${EQ.ilYa(c.soumisIlYa)}">${EQ.anciennete(EQ.ilYa(c.soumisIlYa))}</time><span>d’attente</span></span>
        ${icon('chevron-right', 'icon icon-sm md-fleche')}
      </a></li>`;
    $('[data-eq-page]').innerHTML = `<div class="container md-tete">
        <p class="md-rubrique">${icon('shield', 'icon icon-sm')}Modération</p>
        <h1>Cas à valider</h1>
        ${liste.length ? `<p class="md-statut"><span class="is-fort">${EQ.pluriel(liste.length, 'cas proposé', 'cas proposés')}</span></p>` : ''}
        ${onglets(liste.length)}
      </div>
      ${liste.length ? `<div class="container md-file">
        <p class="md-regle">${t('Du plus ancien au plus récent. Un cas validé est publié dans Bon réflexe ; un refus est toujours motivé.')}</p>
        <ol class="md-liste">${liste.map(ligne).join('')}</ol>
      </div>` : `<div class="container md-file"><div class="md-vide">
        <span class="md-vide-icone" aria-hidden="true">${icon('check-circle')}</span>
        <h2>Aucun cas à valider</h2>
        <p>${t('Les cas proposés par les membres, et ceux que leur auteur a modifiés, s’affichent ici du plus ancien au plus récent.')}</p>
      </div></div>`}`;
  }

  /* Examen ----------------------------------------------------------------------------------------- */

  function rendreExamen(reglages) {
    const id = Number(new URLSearchParams(location.search).get('id')) || D.cas[0].id;
    const c = D.cas.find(x => x.id === id);
    const ariane = `<nav class="md-ariane" aria-label="Fil d’Ariane"><ol><li><a href="moderation-cas.html">Cas à valider</a></li><li><span aria-current="page">Cas n° ${id}</span></li></ol></nav>`;
    const page = $('[data-eq-page]');
    if (!c || reglages.cas === 'introuvable') {
      document.title = 'Examen d’un cas · Vysora';
      page.innerHTML = `<div class="container md-tete">${ariane}<h1>Examen d’un cas</h1></div>
        <div class="container md-file"><div class="md-vide"><span class="md-vide-icone" aria-hidden="true">${icon('bulb')}</span><h2>Ce cas est introuvable</h2><p>${t('L’adresse ne correspond à aucun cas : il a pu être supprimé par son auteur.')}</p><a class="btn btn-secondary" href="moderation-cas.html">Revenir aux cas à valider</a></div></div>`;
      return;
    }
    const examen = examens()[c.id];
    const statut = reglages.cas === 'valide' || examen?.decision === 'VALIDE' ? 'VALIDE' : reglages.cas === 'refuse' || examen?.decision === 'REFUSE' ? 'REFUSE' : 'PROPOSE';
    const masquee = reglages.cas === 'masque';
    const nonExaminable = c.mien ? 'C’est votre cas : un autre membre de l’équipe de modération l’examinera.'
      : masquee ? 'Ce cas est masqué par la modération : rétablissez-le avant de l’examiner.'
        : statut === 'VALIDE' ? 'Ce cas est validé et publié dans Bon réflexe.'
          : statut === 'REFUSE' ? 'Ce cas a été refusé. Il reviendra dans la liste si son auteur le modifie.' : null;
    document.title = `Examen : ${V.typo(c.titre)} · Vysora`;
    const outil = [c.outil, c.modele].filter(Boolean).join(' · ');
    page.innerHTML = `<div class="container md-tete">
        ${ariane}
        <p class="md-rubrique">${icon('bulb', 'icon icon-sm')}Cas Bon réflexe<span class="md-sep" aria-hidden="true">·</span><span class="md-etat">${masquee ? 'Masqué' : { PROPOSE: 'Proposé', VALIDE: 'Validé', REFUSE: 'Refusé' }[statut]}</span></p>
        <h1 class="md-titre-dossier">${t(c.titre)}</h1>
        <div class="md-meta">
          <div class="md-auteur">${avatar(c.auteur, 44)}<div><strong>${t(c.auteur.nom)}</strong><span>${t(`@${c.auteur.pseudo} · ${c.auteur.niveau} · proposé le ${EQ.dateCourte(EQ.ilYa(c.proposeIlYa))}`)}</span></div></div>
          <div class="md-meta-actions">
            ${statut === 'VALIDE' && !masquee ? `<a class="btn btn-secondary btn-sm" href="bon-reflexe.html">Voir le cas${icon('arrow-up-right', 'icon icon-sm')}</a>` : ''}
            ${!nonExaminable ? '<a class="btn btn-primary btn-sm md-aller" href="#md-decision">Examiner le cas</a>' : ''}
          </div>
        </div>
        <ul class="md-cas-faits">
          <li>${icon('layers', 'icon icon-sm')}${t(c.domaine || 'Domaine non précisé')}</li>
          <li>${DIFFICULTES[c.difficulte]}</li>
          ${c.duree ? `<li>${icon('clock', 'icon icon-sm')}${fmt(c.duree)} min</li>` : ''}
          ${outil ? `<li>${t(outil)}</li>` : ''}
        </ul>
        ${c.etiquettes.length ? `<ul class="md-cas-etiquettes" aria-label="Étiquettes">${c.etiquettes.map(e => `<li>${t(e)}</li>`).join('')}</ul>` : ''}
        ${c.examen && statut === 'PROPOSE' ? `<p class="md-alerte">${icon('pen')}<span><b>Nouvelle soumission.</b>${t(` L’auteur a modifié ce cas le ${EQ.dateLongue(EQ.ilYa(c.soumisIlYa))}, après l’examen du ${EQ.dateLongue(EQ.ilYa(c.examen.ilYa))} : « ${c.examen.motif} »`)}</span></p>` : ''}
      </div>
      <div class="container md-dossier">
        <div class="md-principal">
          <section class="md-section" aria-labelledby="md-situation-titre"><h2 id="md-situation-titre">Situation</h2><p class="md-texte">${t(c.contexte)}</p></section>
          <section class="md-section" aria-labelledby="md-echange-titre"><h2 id="md-echange-titre">Échange avec l’IA</h2>
            <div class="md-cas-echange"><h3>Demande</h3><p class="md-texte">${V.esc(c.demande)}</p><h3>Réponse de l’IA</h3><p class="md-texte">${V.esc(c.reponse)}</p></div>
          </section>
          <section class="md-section" aria-labelledby="md-question-titre"><h2 id="md-question-titre">Question et options</h2>
            <p class="md-cas-question">${t(c.question)}</p>
            <ol class="md-options">${c.options.map(o => `<li class="md-option${o.correcte ? ' is-correcte' : ''}"><div class="md-option-corps">
                <p class="md-option-texte">${t(o.libelle)}</p>
                ${o.correcte ? `<span class="md-option-bonne">${icon('check', 'icon icon-xs')}Bonne réponse</span>` : ''}
                ${o.explication ? `<p class="md-option-pourquoi">${t(o.explication)}</p>` : ''}
              </div></li>`).join('')}</ol>
          </section>
          ${c.explication ? `<section class="md-section" aria-labelledby="md-explication-titre"><h2 id="md-explication-titre">Explication générale</h2><p class="md-texte">${t(c.explication)}</p></section>` : ''}
        </div>
        <aside class="md-decision" id="md-decision" aria-labelledby="md-decision-titre">
          <h2 id="md-decision-titre">Examen</h2>
          ${nonExaminable ? `<p class="md-rien">${t(nonExaminable)}</p>` : `<form class="md-form" novalidate autocomplete="off" data-md-cas-form>
            <ul class="md-cas-regles">
              <li>${t('La situation est réaliste et l’échange avec l’IA, exact.')}</li>
              <li>${t('Une seule option est juste, et chaque explication dit pourquoi.')}</li>
              <li>${t('Le cas ne contient ni donnée personnelle ni contenu interdit par la charte.')}</li>
            </ul>
            <fieldset class="md-actions"><legend class="sr-only">Décision</legend>
              <label class="md-choix"><input type="radio" name="decision" value="VALIDE" required><span><b>Valider</b><span>${t(`Le cas est publié dans Bon réflexe ; son auteur reçoit ${POINTS_CAS_VALIDE} points à la première validation.`)}</span></span></label>
              <label class="md-choix"><input type="radio" name="decision" value="REFUSE" required><span><b>Refuser</b><span>${t('Le cas reste visible de son seul auteur, qui reçoit le motif et peut le corriger.')}</span></span></label>
            </fieldset>
            <p class="md-erreur" data-md-erreur="decision" hidden></p>
            <div class="md-champ" data-md-motif hidden>
              <label for="md-motif">Motif communiqué à l’auteur</label>
              <textarea id="md-motif" name="motif" rows="5" maxlength="${MOTIF_MAX}" aria-describedby="md-motif-aide md-motif-erreur"></textarea>
              <p class="md-aide" id="md-motif-aide"><span>${t('Dites ce qu’il faut corriger : l’auteur pourra soumettre de nouveau son cas.')}</span><span class="md-compteur" data-md-compteur>0 / ${fmt(MOTIF_MAX)}</span></p>
              <p class="md-erreur" id="md-motif-erreur" data-md-erreur="motif" hidden></p>
            </div>
            <button class="btn btn-primary md-envoyer" type="submit">Enregistrer l’examen</button>
          </form>`}
        </aside>
      </div>`;
    if (!nonExaminable) brancherExamen(c);
  }

  function brancherExamen(c) {
    const form = $('[data-md-cas-form]');
    const motif = $('#md-motif', form);
    const decision = () => $('input[name="decision"]:checked', form)?.value || null;
    const CHAMPS = { decision: $('input[name="decision"]', form), motif };
    const erreur = (champ, message = '') => {
      const zone = $(`[data-md-erreur="${champ}"]`, form);
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      CHAMPS[champ]?.setAttribute('aria-invalid', String(Boolean(message)));
    };
    $$('input[name="decision"]', form).forEach(radio => radio.addEventListener('change', () => {
      erreur('decision');
      $('[data-md-motif]', form).hidden = decision() !== 'REFUSE';
      if (decision() === 'REFUSE') motif.focus();
    }));
    motif.addEventListener('input', () => { erreur('motif'); $('[data-md-compteur]', form).textContent = `${fmt(motif.value.length)} / ${fmt(MOTIF_MAX)}`; });
    form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const choisie = decision();
      const erreurs = {};
      if (!choisie) erreurs.decision = 'Choisissez de valider ou de refuser le cas.';
      else if (choisie === 'REFUSE' && !motif.value.trim()) erreurs.motif = 'Rédigez le motif du refus, communiqué à l’auteur.';
      ['decision', 'motif'].forEach(champ => erreur(champ, erreurs[champ] || ''));
      const premier = ['decision', 'motif'].find(champ => erreurs[champ]);
      if (premier) { CHAMPS[premier].focus(); return; }
      garderExamen(c.id, { decision: choisie, motif: choisie === 'REFUSE' ? motif.value.trim() : null });
      // Le site rouvre la liste avec un message (messageApresChargement) ; ici, même message.
      try { sessionStorage.setItem('vysora-moderation-message', choisie === 'VALIDE' ? 'Cas validé : il est publié dans Bon réflexe.' : 'Cas refusé : son auteur reçoit le motif.'); } catch { /* stockage indisponible */ }
      location.href = 'moderation-cas.html';
    });
  }

  /* Montage ---------------------------------------------------------------------------------------- */

  let reglages = {};
  const rendre = () => (vue === 'examen' ? rendreExamen(reglages) : rendreListe(reglages));
  V.initHeader();
  reglages = V.initTweaks({
    key: vue === 'examen' ? 'vysora-moderation-examen-reglages' : 'vysora-moderation-cas-reglages',
    etats: vue === 'examen'
      ? [{ name: 'cas', legend: 'Cas', options: [['propose', 'À examiner'], ['valide', 'Déjà validé'], ['refuse', 'Déjà refusé'], ['masque', 'Masqué'], ['introuvable', 'Introuvable']] }]
      : [{ name: 'liste', legend: 'Cas proposés', options: [['remplie', 'À examiner'], ['vide', 'Aucun cas']] }],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: vue === 'examen' ? { cas: 'propose' } : { liste: 'remplie' },
    onChange: (change, suivant) => { reglages = suivant; if (change !== 'init') majPage(); }
  }) || {};
  const majPage = EQ.monter({
    action: 'moderer',
    quoi: 'examiner les cas proposés',
    titre: vue === 'examen' ? 'Examen d’un cas · Vysora' : 'Cas à valider · Vysora',
    rendre
  });
  try {
    const message = sessionStorage.getItem('vysora-moderation-message');
    if (message) { sessionStorage.removeItem('vysora-moderation-message'); setTimeout(() => V.toast(message), 300); }
  } catch { /* stockage indisponible */ }
  document.body.classList.add('is-ready');
})();
