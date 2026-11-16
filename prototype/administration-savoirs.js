'use strict';

/* Savoirs d'Apprendre (APP-03) : démo de l'écran du site (apps/web/src/pages/admin/savoirs.astro,
   scripts/savoirs-admin.ts), mêmes balisage, classes et textes. Pour chaque savoir, les moments clés
   de la communauté qui l'illustrent (« Vu dans la communauté ») et le sujet du forum de « Pour aller
   plus loin », choisis par l'équipe parmi les contenus publiés. La création se désigne par son
   adresse ou son numéro, puis l'on choisit l'un de ses moments clés (ou la création seule, avec une
   note). Chaque changement se confirme, se garde pour la session du navigateur, et la page se
   recharge sur le savoir modifié, ouvert. États dans le panneau Tweaks : compléments choisis,
   aucun complément. */

(() => {
  const AC = window.AdminContenus;
  const { D, $, $$, t, esc, icon } = AC;

  const LIBELLES_TYPE = { UN_PROMPT: '1 prompt', ITERATION: 'Itération', PROJET: 'Projet' };
  const MOMENTS = {
    CORRECTION: 'Correction', REFUS: 'Refus', ECHEC: 'Échec', CHANGEMENT_OUTIL: 'Changement d’outil', VERIFICATION: 'Vérification', DECOUVERTE: 'Découverte'
  };
  const LIBELLES_TYPE_SUJET = { QUESTION: 'Question', CLINIQUE: 'Clinique du prompt', ASTUCE: 'Astuce', RETOUR_EXPERIENCE: 'Retour d’expérience', DISCUSSION: 'Discussion' };
  const ETATS = {
    CREATION_INVISIBLE: 'Non montrée : la création n’est plus publiée ou visible',
    MOMENT_DISPARU: 'Non montrée : l’auteur a réécrit sa création, choisissez de nouveau le moment'
  };
  const MAX_ILLUSTRATIONS = 6;
  const NOTE_MAX = 300;
  const CREATION_INVISIBLE = 'Seule une création publiée et visible de tous illustre un savoir : vérifiez son adresse.';
  const SUJET_INVISIBLE = 'Seul un sujet visible de tous se lie à un savoir : vérifiez son adresse.';

  const savoir = id => D.savoirs.find(([cle]) => cle === id);
  const titreDe = id => savoir(id)?.[2] ?? '';
  const momentDe = (c, id) => c?.moments?.find(m => m.id === id) || null;
  const extrait = texte => (texte.length > 90 ? `${texte.slice(0, 89)}…` : texte);

  /* Compléments simulés ------------------------------------------------------------------------------ */

  const etat = () => AC.etat('savoirs', () => ({ illustrations: D.illustrations, sujets: D.sujets, prochain: 900 }));
  function donnees(reglages) {
    const e = etat();
    if (reglages.complements !== 'vide') return e;
    // Aucun complément : seuls ceux ajoutés dans la session restent.
    const illustrations = {};
    Object.entries(e.illustrations).forEach(([id, liste]) => {
      const ajoutees = liste.filter(i => i.id >= 900);
      if (ajoutees.length) illustrations[id] = ajoutees;
    });
    const sujets = Object.fromEntries(Object.entries(e.sujets).filter(([id, sujet]) => D.sujets[id] !== sujet));
    return { ...e, illustrations, sujets };
  }

  /* Rendu ----------------------------------------------------------------------------------------- */

  function rendre(reglages) {
    const page = $('[data-eq-page]');
    const d = donnees(reglages);
    const illustrations = id => (d.illustrations[id] || []).map(i => ({ ...i, creation: AC.contenu(i.creationId) }));
    const sujetDe = id => (d.sujets[id] ? AC.contenu(d.sujets[id]) : null);
    const toutes = Object.values(d.illustrations).flat();
    const cachees = toutes.filter(i => i.etat !== 'MONTREE').length;

    const illustration = (i, s) => {
      const moment = i.etat === 'MOMENT_DISPARU' ? null : momentDe(i.creation, i.momentId);
      const texte = moment?.texte || i.note;
      return `<li>
          <p class="ad-illustration-type">${moment ? MOMENTS[moment.type] : LIBELLES_TYPE[i.creation.typeCreation]}<span aria-hidden="true">·</span><a href="${AC.adresseContenu(i.creation)}">${esc(i.creation.titre)}</a><span aria-hidden="true">·</span>${esc(i.creation.auteur.nom)}</p>
          ${texte ? `<p class="ad-illustration-texte">${t(texte)}</p>` : ''}
          ${i.etat !== 'MONTREE' ? `<p class="ad-etat is-expire">${t(ETATS[i.etat])}</p>` : ''}
          <button class="btn btn-secondary btn-sm" type="button" data-ad-illustration-retirer="${i.id}" data-savoir="${s}" data-nom="${esc(i.creation.titre)}">Retirer</button>
        </li>`;
    };

    const elementSavoir = ([id, , titre], r) => {
      const liste = illustrations(id);
      const sujet = sujetDe(id);
      const sujetVisible = sujet ? !sujet.etat : true;
      const aRevoir = liste.some(i => i.etat !== 'MONTREE') || !sujetVisible;
      return `<li>
          <details class="ad-ref" id="savoir-${id}" data-titre="${esc(titre)}">
            <summary>
              <span class="ad-ref-logo is-vide" aria-hidden="true">${icon(r.icon)}</span>
              <span class="ad-membre-corps">
                <span class="ad-membre-nom">${esc(titre)}</span>
                <span class="ad-membre-meta"><span>${liste.length ? AC.pluriel(liste.length, 'moment clé', 'moments clés') : 'Aucun moment clé'}</span><span>${sujet ? 'Sujet du forum lié' : 'Aucun sujet lié'}</span></span>
              </span>
              ${aRevoir ? '<span class="ad-etat is-expire">À revoir</span>' : ''}
              ${icon('chevron-down', 'icon-sm ad-ref-chevron')}
            </summary>
            <div class="ad-ref-corps">
              <h3>Vu dans la communauté</h3>
              ${liste.length ? `<ul class="ad-illustrations">${liste.map(i => illustration(i, id)).join('')}</ul>` : `<p class="md-rien">${t('Aucun moment clé n’illustre encore ce savoir.')}</p>`}
              <form class="ad-outils ad-modele" novalidate autocomplete="off" data-ad-illustration="${id}">
                <div class="ad-champ is-large">
                  <label for="ad-creation-${id}">Création : adresse ou numéro</label>
                  <input id="ad-creation-${id}" name="creation" placeholder="/creations/12-…" data-ad-creation>
                  <p class="md-erreur" data-ad-erreur="creationId" hidden></p>
                </div>
                <div class="ad-champ is-large" data-ad-moments hidden>
                  <label for="ad-moment-${id}">Moment clé</label>
                  <select id="ad-moment-${id}" name="momentId" class="is-large"></select>
                  <p class="md-erreur" data-ad-erreur="momentId" hidden></p>
                </div>
                <div class="ad-champ is-large">
                  <label for="ad-note-${id}">Note de l’équipe (facultative)</label>
                  <input id="ad-note-${id}" name="note" maxlength="${NOTE_MAX}" placeholder="Reproduite avec succès sur trois modèles.">
                  <p class="md-erreur" data-ad-erreur="note" hidden></p>
                </div>
                <button class="btn btn-secondary" type="submit">${icon('plus')}Ajouter</button>
                <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
              </form>

              <h3>Sujet du forum</h3>
              ${sujet ? `<p class="ad-illustration-type">${LIBELLES_TYPE_SUJET[sujet.typeSujet]}${sujet.etatSujet === 'RESOLU' ? ', résolue' : ''}<span aria-hidden="true">·</span><a href="${AC.adresseContenu(sujet)}">${esc(sujet.titre)}</a>${sujetVisible ? '' : '<span class="ad-etat is-expire">Non montré : le sujet n’est plus visible</span>'}</p>`
                : `<p class="md-rien">${t('Aucun sujet du forum n’est lié à ce savoir.')}</p>`}
              <form class="ad-outils ad-modele" novalidate autocomplete="off" data-ad-sujet="${id}">
                <div class="ad-champ is-large">
                  <label for="ad-sujet-${id}">${sujet ? 'Autre sujet : adresse ou numéro' : 'Sujet : adresse ou numéro'}</label>
                  <input id="ad-sujet-${id}" name="sujet" placeholder="/forum/6-…">
                  <p class="md-erreur" data-ad-erreur="sujetId" hidden></p>
                </div>
                <button class="btn btn-secondary" type="submit">${sujet ? 'Remplacer le sujet' : 'Lier le sujet'}</button>
                <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
              </form>

              <div class="ad-ref-pied">
                <a class="ad-lien" href="apprendre.html?savoir=${id}">Voir le savoir${icon('arrow-up-right')}</a>
                ${sujet ? `<button class="btn btn-secondary btn-sm" type="button" data-ad-sujet-retirer="${id}" data-nom="${esc(sujet.titre)}">Retirer le sujet</button>` : ''}
              </div>
            </div>
          </details>
        </li>`;
    };

    page.innerHTML = `${AC.tete({
      titre: 'Savoirs d’Apprendre',
      onglet: 'savoirs',
      statut: `<p class="md-statut"><span class="is-fort">${AC.pluriel(Object.keys(d.illustrations).length, 'savoir illustré', 'savoirs illustrés')}</span><span>${AC.pluriel(Object.keys(d.sujets).length, 'sujet lié', 'sujets liés')}</span>${cachees > 0 ? `<span>${AC.pluriel(cachees, 'illustration à revoir', 'illustrations à revoir')}</span>` : ''}<span>${t('Les moments clés illustrent un savoir dans « Vu dans la communauté » ; le sujet du forum apparaît dans « Pour aller plus loin ». Seuls les contenus visibles de tous sont montrés.')}</span></p>`
    })}
      <div class="container md-file">
        ${D.rubriques.map(r => {
          const savoirs = D.savoirs.filter(([, kind]) => kind === r.id);
          return `<section class="ad-famille" aria-labelledby="ad-rubrique-${r.id}">
            <h2 id="ad-rubrique-${r.id}">${esc(r.label)}<span class="ad-famille-nb">${savoirs.length}</span></h2>
            <ul class="ad-refs">${savoirs.map(s => elementSavoir(s, r)).join('')}</ul>
          </section>`;
        }).join('')}
      </div>`;
    brancher(d);
  }

  /* Actions (scripts/savoirs-admin.ts) ------------------------------------------------------------------ */

  const titreDu = element => element.closest('[data-titre]')?.dataset.titre ?? '';
  /** Écriture simulée, puis rechargement sur le savoir modifié. */
  function ecrire(savoirId, modifier, message) {
    const e = etat();
    const refus = modifier(e);
    if (refus) return refus;
    AC.garder('savoirs', e);
    AC.rechargerSur(`savoir-${savoirId}`, message);
    return null;
  }

  function brancher() {
    $$('[data-ad-illustration]').forEach(form => {
      const savoirId = form.dataset.adIllustration || '';
      const champCreation = $('[data-ad-creation]', form);
      const zoneMoments = $('[data-ad-moments]', form);
      const liste = $('select', zoneMoments);
      let lue = null;

      /** Les moments clés de la création désignée, proposés au choix (GET …/creations/:id/moments). */
      function chargerMoments() {
        const numero = AC.numeroDeContenu(champCreation.value);
        if (numero === null) {
          AC.afficherErreurs(form, { creationId: 'Indiquez l’adresse ou le numéro de la création.' });
          return false;
        }
        if (numero === lue) return true;
        const c = AC.contenu(numero);
        if (!c || c.type !== 'CREATION' || c.etat) {
          lue = null;
          zoneMoments.hidden = true;
          AC.afficherErreurs(form, { creationId: CREATION_INVISIBLE });
          return false;
        }
        lue = numero;
        AC.afficherErreurs(form, {});
        liste.innerHTML = [
          ...c.moments.map(m => `<option value="${m.id}">${t(`${MOMENTS[m.type]} : ${extrait(m.titre ?? m.texte)}`)}</option>`),
          `<option value="">${c.moments.length ? 'Aucun moment : la création seule, avec la note' : 'Cette création n’a pas de moment clé : la création seule, avec la note'}</option>`
        ].join('');
        zoneMoments.hidden = false;
        return true;
      }
      champCreation.addEventListener('change', () => chargerMoments());

      form.addEventListener('submit', evenement => {
        evenement.preventDefault();
        if (!chargerMoments()) return;
        const momentId = liste.value ? Number(liste.value) : null;
        const note = $('[name="note"]', form).value.trim() || null;
        // schemaIllustrationSavoir : mêmes contrôles et messages.
        if (note && note.length > NOTE_MAX) return AC.afficherErreurs(form, { note: `La note compte ${NOTE_MAX} caractères au plus.` });
        if (momentId === null && note === null) return AC.afficherErreurs(form, { note: 'Choisissez un moment clé de la création, ou écrivez une note.' });
        const choix = liste.selectedOptions[0]?.textContent ?? '';
        AC.confirmer(
          `Illustrer « ${titreDu(form)} » ?`,
          momentId
            ? `${choix}${/[.!?…]$/.test(choix) ? '' : '.'} Le moment clé apparaît dans « Vu dans la communauté », tant que la création reste publiée et visible.`
            : 'La création apparaît dans « Vu dans la communauté » avec votre note, tant qu’elle reste publiée et visible.',
          'Ajouter',
          () => {
            const refus = ecrire(savoirId, e => {
              const existantes = e.illustrations[savoirId] || [];
              if (existantes.some(i => i.creationId === lue && i.momentId === momentId)) return { general: momentId === null ? 'Cette création illustre déjà ce savoir.' : 'Ce moment clé illustre déjà ce savoir.' };
              if (existantes.length >= MAX_ILLUSTRATIONS) return { general: `Un savoir compte ${MAX_ILLUSTRATIONS} illustrations au plus : retirez-en une d’abord.` };
              e.illustrations[savoirId] = [...existantes, { id: e.prochain++, creationId: lue, momentId, note, etat: 'MONTREE' }];
              return null;
            }, 'Moment clé ajouté au savoir.');
            if (refus) AC.afficherErreurs(form, refus);
          }
        );
      });
    });

    $$('[data-ad-illustration-retirer]').forEach(bouton => bouton.addEventListener('click', () => {
      const savoirId = bouton.dataset.savoir || '';
      const id = Number(bouton.dataset.adIllustrationRetirer);
      AC.confirmer(`Retirer « ${bouton.dataset.nom || ''} » ?`, `Il n’illustre plus « ${titreDu(bouton)} ». La création elle-même ne change pas.`, 'Retirer', () => {
        const refus = ecrire(savoirId, e => {
          const liste = e.illustrations[savoirId] || [];
          if (!liste.some(i => i.id === id)) return 'Cette illustration est introuvable.';
          const restantes = liste.filter(i => i.id !== id);
          if (restantes.length) e.illustrations[savoirId] = restantes;
          else delete e.illustrations[savoirId];
          return null;
        }, 'Moment clé retiré du savoir.');
        if (refus) AC.signalerRefus(refus);
      });
    }));

    $$('[data-ad-sujet]').forEach(form => {
      const savoirId = form.dataset.adSujet || '';
      form.addEventListener('submit', evenement => {
        evenement.preventDefault();
        const champ = $('[name="sujet"]', form);
        // schemaSujetSavoir : mêmes contrôles et messages.
        const sujetId = AC.numeroDeContenu(champ.value) ?? 0;
        if (!sujetId) return AC.afficherErreurs(form, { sujetId: 'Indiquez l’adresse ou le numéro du sujet.' });
        AC.afficherErreurs(form, {});
        AC.confirmer(
          `Lier ce sujet à « ${titreDu(form)} » ?`,
          'Il apparaît dans « Pour aller plus loin », tant qu’il reste visible de tous. Un sujet déjà lié est remplacé.',
          'Lier le sujet',
          () => {
            const refus = ecrire(savoirId, e => {
              const sujet = AC.contenu(sujetId);
              if (!sujet || sujet.type !== 'SUJET' || sujet.etat) return { sujetId: SUJET_INVISIBLE };
              e.sujets[savoirId] = sujetId;
              return null;
            }, 'Sujet du forum lié au savoir.');
            if (refus) AC.afficherErreurs(form, refus);
          }
        );
      });
    });

    $$('[data-ad-sujet-retirer]').forEach(bouton => bouton.addEventListener('click', () => {
      const savoirId = bouton.dataset.adSujetRetirer || '';
      AC.confirmer(`Retirer « ${bouton.dataset.nom || ''} » ?`, `« ${titreDu(bouton)} » ne propose plus de sujet du forum. Le sujet lui-même ne change pas.`, 'Retirer le sujet', () => {
        const refus = ecrire(savoirId, e => {
          if (!e.sujets[savoirId]) return 'Aucun sujet n’est lié à ce savoir.';
          delete e.sujets[savoirId];
          return null;
        }, 'Sujet du forum retiré du savoir.');
        if (refus) AC.signalerRefus(refus);
      });
    }));
  }

  /* Montage --------------------------------------------------------------------------------------- */

  AC.monter({
    cle: 'vysora-administration-savoirs-reglages',
    etats: [{ name: 'complements', legend: 'Compléments', options: [['choisis', 'Compléments choisis'], ['vide', 'Aucun complément']] }],
    defaults: { complements: 'choisis' },
    quoi: 'gérer les savoirs d’Apprendre',
    titre: 'Savoirs d’Apprendre · Administration · Vysora',
    rendre
  });
})();
