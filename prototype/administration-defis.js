'use strict';

/* Gestion des défis (S-07, EC-24, F-63, F-65) : démo de l'écran du site
   (apps/web/src/pages/admin/defis.astro, scripts/administration.ts), mêmes balisage, classes
   (moderation.css, moderation-complements.css) et textes. Nouveau défi en brouillon (dates en UTC,
   contrôlées comme schemaDefi), puis la liste des défis avec les actions possibles dans leur état
   (RG-73 : publier, annuler, clôturer une fois la fin passée). Les changements simulés sont gardés
   pour la session du navigateur ; la page se recharge comme celle du site.
   États dans le panneau Tweaks : défis à gérer, aucun défi. */

(() => {
  const AC = window.AdminContenus;
  const { D, $, $$, t, esc, fmt, icon } = AC;

  const STATUTS = { BROUILLON: 'Brouillon', PUBLIE: 'Publié', CLOTURE: 'Clôturé', ANNULE: 'Annulé' };
  const ACTIONS = { publier: 'Publier', annuler: 'Annuler', cloturer: 'Clôturer' };
  const MS_JOUR = 86400000;
  const DUREE = { min: 1, max: 30 };
  const heure = iso => `${AC.dateCourte(iso)}, ${iso.slice(11, 16)} UTC`;

  /* Dates : la semaine en cours va du lundi 0 h au dimanche 23 h 59, en temps universel. */
  const lundi = (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.getTime(); })();
  const periode = semaine => {
    const debut = lundi + semaine * 7 * MS_JOUR;
    return { dateDebut: new Date(debut).toISOString(), dateFin: new Date(debut + 7 * MS_JOUR - 60000).toISOString() };
  };

  /** RG-73 : BROUILLON → PUBLIE → CLOTURE ; BROUILLON ou PUBLIE → ANNULE. La clôture attend la fin. */
  function actionsDe(d) {
    if (d.statut === 'BROUILLON') return ['publier', 'annuler'];
    if (d.statut === 'PUBLIE') return new Date(d.dateFin) <= new Date() ? ['cloturer', 'annuler'] : ['annuler'];
    return [];
  }
  const lienDefi = d => (d.statut === 'PUBLIE' ? 'defis.html' : 'defis.html#termines');

  /* Défis simulés : ceux des données, puis ceux créés dans la session -------------------------------- */

  const etat = () => AC.etat('defis', () => ({ crees: [], statuts: {} }));
  function defis(reglages) {
    const { crees, statuts } = etat();
    const base = reglages.defis === 'vide' ? [] : D.defis.map(d => ({ ...d, ...periode(d.semaine) }));
    return [...base, ...crees]
      .map(d => ({ ...d, statut: statuts[d.id] || d.statut }))
      .map(d => ({ ...d, actions: actionsDe(d) }))
      .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut) || b.id - a.id);
  }

  /* Rendu ----------------------------------------------------------------------------------------- */

  function rendre(reglages) {
    const page = $('[data-eq-page]');
    const liste = defis(reglages);
    // Valeurs proposées : la semaine prochaine, du lundi 0 h au dimanche 23 h 59 (UTC).
    const prochain = new Date();
    prochain.setUTCDate(prochain.getUTCDate() + ((8 - prochain.getUTCDay()) % 7 || 7));
    const debutParDefaut = `${prochain.toISOString().slice(0, 10)}T00:00`;
    const finParDefaut = `${new Date(prochain.getTime() + 6 * MS_JOUR).toISOString().slice(0, 10)}T23:59`;

    const ligne = d => `<tr>
        <td>${d.statut === 'BROUILLON' ? `<b>${t(d.titre)}</b>` : `<a href="${lienDefi(d)}">${t(d.titre)}</a>`}</td>
        <td>${heure(d.dateDebut)} — ${heure(d.dateFin)}</td>
        <td><span class="ad-etat${d.statut === 'PUBLIE' ? ' is-libre' : ''}">${STATUTS[d.statut]}</span></td>
        <td>${fmt(d.participations)}</td>
        <td><div class="ad-actions-defi">${d.actions.map(a => `<button class="btn btn-sm ${a === 'cloturer' ? 'btn-primary' : 'btn-secondary'}" type="button" data-ad-defi-action="${a}" data-ad-defi="${d.id}" data-titre="${esc(d.titre)}">${ACTIONS[a]}</button>`).join('')}</div></td>
      </tr>`;

    page.innerHTML = `${AC.tete({
      titre: 'Défis',
      onglet: 'defis',
      statut: `<p class="md-statut"><span class="is-fort">${AC.pluriel(liste.length, 'défi', 'défis')}</span><span>${t('Un défi dure de 1 à 30 jours. Les dates sont en temps universel (UTC).')}</span></p>`
    })}
      <div class="container md-file">
        <form class="ad-defi" novalidate data-ad-defi-form>
          <h2>Nouveau défi</h2>
          <div class="ad-champ is-large">
            <label for="ad-defi-titre">Titre</label>
            <input id="ad-defi-titre" name="titre" maxlength="150" required>
            <p class="md-erreur" data-ad-erreur="titre" hidden></p>
          </div>
          <div class="ad-champ is-large">
            <label for="ad-defi-enonce">Énoncé</label>
            <textarea id="ad-defi-enonce" name="enonce" rows="3" maxlength="2000" required></textarea>
            <p class="md-erreur" data-ad-erreur="enonce" hidden></p>
          </div>
          <div class="ad-champ is-large">
            <label for="ad-defi-contraintes">Contraintes, une par ligne</label>
            <textarea id="ad-defi-contraintes" name="contraintes" rows="3" maxlength="2000"></textarea>
            <p class="md-erreur" data-ad-erreur="contraintes" hidden></p>
          </div>
          <div class="ad-outils">
            <div class="ad-champ">
              <label for="ad-defi-debut">Début (UTC)</label>
              <input id="ad-defi-debut" name="dateDebut" type="datetime-local" value="${debutParDefaut}" required>
              <p class="md-erreur" data-ad-erreur="dateDebut" hidden></p>
            </div>
            <div class="ad-champ">
              <label for="ad-defi-fin">Fin (UTC)</label>
              <input id="ad-defi-fin" name="dateFin" type="datetime-local" value="${finParDefaut}" required>
              <p class="md-erreur" data-ad-erreur="dateFin" hidden></p>
            </div>
            <button class="btn btn-primary" type="submit">${icon('plus')}Créer le brouillon</button>
          </div>
          <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
        </form>
        ${liste.length ? `<table class="ad-table">
          <thead><tr><th scope="col">Défi</th><th scope="col">Période</th><th scope="col">État</th><th scope="col">Participations</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${liste.map(ligne).join('')}</tbody>
        </table>` : `<p class="md-rien ad-vide">${t('Aucun défi pour l’instant : créez le premier ci-dessus.')}</p>`}
      </div>`;
  }

  /* Actions (scripts/administration.ts : QUESTIONS_DEFI, MESSAGES_DEFI) --------------------------- */

  const QUESTIONS = {
    publier: ['Publier ce défi ?', 'il apparaît sur la page Défis et, pendant sa période, sur l’accueil.', 'Publier'],
    annuler: ['Annuler ce défi ?', 'les participations sont fermées et le défi ne sera pas classé. Cette action est définitive.', 'Annuler le défi'],
    cloturer: ['Clôturer ce défi ?', 'le classement est figé, les points de participation et du podium sont crédités et chaque participant est prévenu. Cette action est définitive.', 'Clôturer']
  };
  const MESSAGES = { publier: 'Défi publié.', annuler: 'Défi annulé.', cloturer: 'Défi clôturé : le classement est publié.' };
  const NOUVEAUX_STATUTS = { publier: 'PUBLIE', annuler: 'ANNULE', cloturer: 'CLOTURE' };

  document.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('[data-ad-defi-action]');
    if (!bouton) return;
    const quoi = bouton.dataset.adDefiAction;
    const [titre, texte, libelle] = QUESTIONS[quoi];
    AC.confirmer(titre, `« ${bouton.dataset.titre || ''} » : ${texte}`, libelle, () => {
      const id = Number(bouton.dataset.adDefi);
      const e = etat();
      const statut = e.statuts[id] || [...D.defis, ...e.crees].find(d => d.id === id)?.statut;
      // L'API reste seule juge (RG-73).
      if (quoi === 'publier' && statut !== 'BROUILLON') return AC.signalerRefus('Seul un défi en brouillon se publie.');
      e.statuts[id] = NOUVEAUX_STATUTS[quoi];
      AC.garder('defis', e);
      AC.messageApresChargement(MESSAGES[quoi]);
      window.location.reload();
    });
  });

  /* Nouveau défi (schemaDefi : mêmes contrôles et messages) ------------------------------------------ */

  const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
  const instant = valeur => new Date(/Z|[+-]\d{2}:\d{2}$/.test(valeur) ? valeur : `${valeur}Z`);
  function controler(s) {
    const erreurs = {};
    if (s.titre.length < 5) erreurs.titre = 'Le titre compte au moins 5 caractères.';
    else if (s.titre.length > 150) erreurs.titre = 'Le titre compte 150 caractères au plus.';
    if (s.enonce.length < 20) erreurs.enonce = 'L’énoncé compte au moins 20 caractères.';
    else if (s.enonce.length > 2000) erreurs.enonce = 'L’énoncé compte 2 000 caractères au plus.';
    if (s.contraintes && s.contraintes.length > 2000) erreurs.contraintes = 'Les contraintes comptent 2 000 caractères au plus.';
    const debutValide = FORMAT_DATE.test(s.dateDebut) && !Number.isNaN(instant(s.dateDebut).getTime());
    const finValide = FORMAT_DATE.test(s.dateFin) && !Number.isNaN(instant(s.dateFin).getTime());
    if (!debutValide) erreurs.dateDebut = 'Indiquez la date de début.';
    if (!finValide) erreurs.dateFin = 'Indiquez la date de fin.';
    if (debutValide && finValide) {
      const jours = (instant(s.dateFin) - instant(s.dateDebut)) / MS_JOUR;
      if (jours < DUREE.min || jours > DUREE.max) erreurs.dateFin = `Un défi dure de ${DUREE.min} à ${DUREE.max} jours.`;
    }
    return erreurs;
  }

  document.addEventListener('submit', evenement => {
    const form = evenement.target.closest('[data-ad-defi-form]');
    if (!form) return;
    evenement.preventDefault();
    const valeur = nom => $(`[name="${nom}"]`, form)?.value.trim() ?? '';
    const saisie = { titre: valeur('titre'), enonce: valeur('enonce'), contraintes: valeur('contraintes') || null, dateDebut: valeur('dateDebut'), dateFin: valeur('dateFin') };
    const erreurs = controler(saisie);
    AC.afficherErreurs(form, erreurs);
    if (Object.keys(erreurs).length) return;
    const e = etat();
    const id = Math.max(...D.defis.map(d => d.id), ...e.crees.map(d => d.id)) + 1;
    e.crees.push({ id, slug: AC.slugifier(saisie.titre) || 'defi', titre: saisie.titre, enonce: saisie.enonce, contraintes: saisie.contraintes,
      dateDebut: instant(saisie.dateDebut).toISOString(), dateFin: instant(saisie.dateFin).toISOString(), statut: 'BROUILLON', participations: 0 });
    AC.garder('defis', e);
    AC.messageApresChargement('Brouillon du défi créé. Publiez-le quand il est prêt.');
    window.location.reload();
  });

  /* Montage --------------------------------------------------------------------------------------- */

  AC.monter({
    cle: 'vysora-administration-defis-reglages',
    etats: [{ name: 'defis', legend: 'Défis', options: [['liste', 'Défis à gérer'], ['vide', 'Aucun défi']] }],
    defaults: { defis: 'liste' },
    quoi: 'gérer les défis',
    titre: 'Défis · Administration · Vysora',
    rendre
  });
})();
