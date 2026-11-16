'use strict';

/* Documents légaux (ADM-02, EC-25, F-04, RG-112) : nouvelle version d'un document et sa date d'effet,
   puis les versions de chaque document, de la plus récente à la plus ancienne, avec leur état, leur
   annonce et leurs acceptations ; retrait d'une version à venir. Démo de l'écran du site
   (apps/web/src/pages/admin/documents-legaux.astro, scripts/administration.ts) : mêmes balisage,
   classes et textes ; données simulées dans administration-referentiels-data.js, outils communs dans
   administration-referentiels.js. Une version publiée ou retirée est gardée pour la session du
   navigateur. États dans le panneau Tweaks : une version à venir ou aucune ; réponse du serveur. */

(() => {
  const V = window.Vysora;
  const AR = window.AdminReferentiels;
  const { $, $$, t, esc, icon } = V;
  const { dateLongue, dateCourte, pluriel } = AR;

  const TITRES = { CGU: 'Conditions générales d’utilisation', CONFIDENTIALITE: 'Politique de confidentialité', CHARTE: 'Charte communautaire' };
  const ETATS = { 'a-venir': ['À venir', 'is-avenir'], 'en-vigueur': ['En vigueur', 'is-libre'], remplacee: ['Remplacée', 'is-expire'] };
  const ECHEC = 'La version n’a pas été publiée. Réessayez dans un instant.';

  /** DocumentLegalAdministreApi : état de chaque version d'après le jour, la plus récente d'abord.
      « Aucune version à venir » (Tweaks) écarte la version à venir des données simulées. */
  function documents(reglages) {
    const jour = AR.aujourdhui();
    return AR.etat.documents.map(d => {
      const versions = d.versions
        .filter(v => reglages.versions !== 'sans-avenir' || !v.aVenir)
        .sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : a.dateEffet > b.dateEffet ? -1 : 0));
      const enVigueur = versions.find(v => v.dateEffet <= jour);
      return {
        ...d,
        versions: versions.map(v => {
          const etat = v.dateEffet > jour ? 'a-venir' : v === enVigueur ? 'en-vigueur' : 'remplacee';
          return { ...v, etat, retirable: etat === 'a-venir' && !v.dateAnnonce && !v.acceptations };
        })
      };
    });
  }

  const acceptations = (d, v) => (!d.acceptationRequise ? 'Sans acceptation'
    : v.etat === 'a-venir' ? 'À sa prise d’effet'
      : v.acceptations ? pluriel(v.acceptations, 'membre', 'membres') : 'Aucun membre');
  /** RG-90 : la première version d'un document n'est jamais annoncée (EMAIL-01). */
  const annonce = (v, premiere) => (premiere ? 'Aucune, première version'
    : v.dateAnnonce ? `Envoyée le ${dateCourte(v.dateAnnonce)}`
      : v.etat === 'a-venir' ? 'Le jour de sa prise d’effet' : 'Aucune');

  function rendre(reglages) {
    const liste = documents(reglages);
    const aVenir = liste.flatMap(d => d.versions).filter(v => v.etat === 'a-venir').length;
    const ligne = (d, v, i) => `<tr id="version-${v.id}">
        <td><b>${dateLongue(v.dateEffet)}</b></td>
        <td><span class="ad-etat ${ETATS[v.etat][1]}">${ETATS[v.etat][0]}</span></td>
        <td data-libelle="Ce qui change">${v.resumeChangements ? t(v.resumeChangements) : 'Non précisé'}</td>
        <td data-libelle="Annonce">${t(annonce(v, i === d.versions.length - 1))}</td>
        <td data-libelle="Acceptations">${t(acceptations(d, v))}</td>
        <td>${v.retirable ? `<div class="ad-actions-defi"><button class="btn btn-secondary btn-sm" type="button" data-ad-document-retirer="${v.id}" data-type="${d.type}" data-nom="${esc(`${TITRES[d.type]} du ${dateLongue(v.dateEffet)}`)}">Retirer</button></div>` : ''}</td>
      </tr>`;

    $('[data-eq-page]').innerHTML = `<div class="container md-tete">
        <p class="md-rubrique">${icon('shield')}Administration</p>
        <h1>Documents légaux</h1>
        <p class="md-statut">
          <span class="is-fort">${aVenir ? pluriel(aVenir, 'version à venir', 'versions à venir') : 'Aucune version à venir'}</span>
          <span>${t('Une nouvelle version prend effet à sa date : son acceptation est alors demandée aux membres, prévenus par e-mail. Les versions précédentes et leurs acceptations sont conservées.')}</span>
        </p>
        ${window.Equipe.ongletsAdministration('documents')}
      </div>
      <div class="container md-file">
        <form class="ad-defi" novalidate data-ad-document-form>
          <h2>Nouvelle version</h2>
          <div class="ad-outils">
            <div class="ad-champ">
              <label for="ad-document-type">Document</label>
              <select id="ad-document-type" class="is-large" name="type" required>${liste.map(d => `<option value="${d.type}" data-acceptation="${String(d.acceptationRequise)}">${t(TITRES[d.type])}</option>`).join('')}</select>
              <p class="md-erreur" data-ad-erreur="type" hidden></p>
            </div>
            <div class="ad-champ">
              <label for="ad-document-date">Date d’effet</label>
              <input id="ad-document-date" name="dateEffet" type="date" min="${AR.aujourdhui()}" required>
              <p class="md-erreur" data-ad-erreur="dateEffet" hidden></p>
            </div>
          </div>
          <div class="ad-champ">
            <label for="ad-document-resume">Ce qui change</label>
            <textarea id="ad-document-resume" name="resumeChangements" rows="3" maxlength="500"></textarea>
            <p class="md-erreur" data-ad-erreur="resumeChangements" hidden></p>
          </div>
          <div class="ad-actions-defi is-debut"><button class="btn btn-primary" type="submit">${icon('plus')}Publier la version</button></div>
          <p class="md-rien">${t('Le résumé est montré aux membres qui acceptent la nouvelle version. Le texte du document est celui de sa page sur le site : mettez-le en ligne avant la date d’effet. La politique de confidentialité informe les membres sans demander leur acceptation.')}</p>
          <p class="md-erreur" data-ad-erreur="general" role="alert" hidden></p>
        </form>
        ${liste.map(d => `<section class="ad-famille" aria-labelledby="ad-document-${d.type}">
          <h2 id="ad-document-${d.type}">${t(TITRES[d.type])}</h2>
          <p class="ad-document-lien"><a class="ad-lien" href="${d.url}">Lire la page du document${icon('arrow-up-right')}</a></p>
          <table class="ad-table ad-versions">
            <caption class="sr-only">${t(`Versions : ${TITRES[d.type]}`)}</caption>
            <thead><tr><th scope="col">Version</th><th scope="col">État</th><th scope="col">Ce qui change</th><th scope="col">Annonce</th><th scope="col">Acceptations</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>${d.versions.map((v, i) => ligne(d, v, i)).join('')}</tbody>
          </table>
        </section>`).join('')}
      </div>`;
    brancher(liste);
  }

  /** schemaVersionDocumentLegal : mêmes contrôles et messages. */
  function controler(v) {
    const erreurs = {};
    const resumeChangements = (v.resumeChangements || '').trim() || null;
    if (!TITRES[v.type]) erreurs.type = 'Choisissez le document.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dateEffet || '')) erreurs.dateEffet = 'Indiquez la date d’effet.';
    if (resumeChangements && resumeChangements.length > 500) erreurs.resumeChangements = 'Le résumé compte 500 caractères au plus.';
    else if (v.type !== 'CONFIDENTIALITE' && (resumeChangements?.length ?? 0) < 10)
      erreurs.resumeChangements = 'Résumez ce qui change : les membres le lisent avant d’accepter la nouvelle version.';
    return [erreurs, { type: v.type, dateEffet: v.dateEffet, resumeChangements }];
  }

  function brancher(liste) {
    const form = $('[data-ad-document-form]');
    form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      const [erreurs, saisie] = controler(Object.fromEntries(new FormData(form)));
      if (Object.keys(erreurs).length) return AR.afficherErreurs(form, erreurs);
      AR.afficherErreurs(form, {});
      const choix = $('[name="type"]', form).selectedOptions[0];
      const nom = choix.textContent.trim();
      const date = dateLongue(saisie.dateEffet);
      AR.confirmer(
        `Publier la version du ${date} ?`,
        choix.dataset.acceptation === 'true'
          ? `${nom} : à compter du ${date}, chaque membre accepte la nouvelle version avant de pouvoir de nouveau publier, commenter ou voter. Les membres en sont prévenus par e-mail ce jour-là.`
          : `${nom} : à compter du ${date}, la nouvelle version remplace la précédente. Les membres en sont prévenus par e-mail ce jour-là.`,
        'Publier la version',
        async () => {
          // L'API : aujourd'hui au plus tôt, et après la dernière version du document.
          const version = await AR.envoyer(form, () => {
            if (saisie.dateEffet < AR.aujourdhui()) return { erreurs: { dateEffet: 'Choisissez aujourd’hui ou une date à venir : une version ne s’applique pas au passé.' } };
            const affiche = liste.find(d => d.type === saisie.type);
            const derniere = affiche.versions[0];
            if (derniere && saisie.dateEffet <= derniere.dateEffet) return { erreurs: { dateEffet: `La dernière version prend effet le ${dateLongue(derniere.dateEffet)} : choisissez une date postérieure.` } };
            const document = AR.etat.documents.find(d => d.type === saisie.type);
            const creee = { id: AR.suivant(AR.etat.documents.flatMap(d => d.versions)), dateEffet: saisie.dateEffet, resumeChangements: saisie.resumeChangements, dateAnnonce: null, acceptations: 0 };
            document.versions.push(creee);
            return creee;
          }, ECHEC);
          if (!version) return;
          AR.rendreAJour();
          V.toast(`Version du ${date} publiée.`);
        }
      );
    });

    $$('[data-ad-document-retirer]').forEach(bouton => bouton.addEventListener('click', () => {
      const id = Number(bouton.dataset.adDocumentRetirer);
      AR.confirmer(
        'Retirer cette version ?',
        `${bouton.dataset.nom} : elle n’a pas encore pris effet et disparaît de l’historique. La version en vigueur reste appliquée.`,
        'Retirer la version',
        async () => {
          const fait = await AR.changer(bouton, () => {
            const document = AR.etat.documents.find(d => d.type === bouton.dataset.type);
            document.versions = document.versions.filter(v => v.id !== id);
            return null;
          });
          if (!fait) return;
          AR.rendreAJour();
          V.toast('Version retirée.');
        }
      );
    }));
  }

  AR.monter({
    cle: 'vysora-admin-documents-reglages',
    quoi: 'gérer les documents légaux',
    titre: 'Documents légaux · Administration · Vysora',
    etats: [{ name: 'versions', legend: 'Versions', options: [['avec-avenir', 'Une version à venir'], ['sans-avenir', 'Aucune version à venir']] }],
    defauts: { versions: 'avec-avenir' },
    rendre
  });
})();
