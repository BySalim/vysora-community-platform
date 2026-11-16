'use strict';

/* Modération (MOD-02, EC-19, F-91, S-13) : file des contenus signalés (moderation.html) et dossier
   d'un contenu avec sa décision (moderation-dossier.html?id=…). Démo des écrans du site
   (apps/web/src/pages/moderation/signalements/), mêmes balisage, classes (moderation.css,
   moderation-complements.css) et textes ; données simulées dans moderation-data.js.
   Une décision simulée est gardée pour la session du navigateur : le contenu quitte la file, son
   dossier la montre. États dans le panneau Tweaks : file remplie ou vide ; dossier ouvert,
   introuvable ou propre au modérateur (RG-104). */

(() => {
  const V = window.Vysora;
  const EQ = window.Equipe;
  const D = window.VYSORA_MODERATION;
  const { $, $$, t, fmt, icon } = V;
  const vue = document.body.dataset.mdVue;

  /* Libellés (lib/moderation.ts, @vysora/shared) ------------------------------------------------- */

  const TYPES = {
    CREATION: ['Création', 'layers'], COMMENTAIRE: ['Commentaire', 'message'], REPRODUCTION: ['Essai', 'repeat'],
    SUJET: ['Sujet du forum', 'help'], MESSAGE: ['Réponse du forum', 'reply'], CAS_BON_REFLEXE: ['Cas Bon réflexe', 'bulb']
  };
  const TITRES_DOSSIER = { COMMENTAIRE: 'Commentaire sur une création', REPRODUCTION: 'Essai déclaré sur une création', MESSAGE: 'Réponse dans le forum' };
  const TITRES_TEXTE = { COMMENTAIRE: 'Texte du commentaire', REPRODUCTION: 'Retour de l’essai', SUJET: 'Texte du sujet', MESSAGE: 'Texte de la réponse' };
  const MOTIFS = { SPAM: 'Spam', ILLICITE: 'Contenu illicite', DANGEREUX: 'Contenu dangereux', DONNEES_PERSONNELLES: 'Données personnelles', PLAGIAT: 'Plagiat', HARCELEMENT: 'Harcèlement', HORS_SUJET: 'Hors sujet', AUTRE: 'Autre' };
  const ACTIONS = {
    AUCUNE: 'Aucune mesure', MASQUER: 'Masquer le contenu', RETABLIR: 'Rétablir le contenu', SUPPRIMER: 'Supprimer le contenu',
    AVERTIR: 'Avertir l’auteur', SUSPENDRE: 'Suspendre l’auteur',
    AJOUTER_AVERTISSEMENT_AGENT: 'Ajouter l’avertissement « instructions pour agent »',
    RETIRER_AVERTISSEMENT_AGENT: 'Retirer l’avertissement « instructions pour agent »',
    BANNIR: 'Bannir le compte', AJUSTER_REPUTATION: 'Ajuster la réputation', RETIRER_BADGE: 'Retirer un badge'
  };
  const EFFETS = {
    AUCUNE: 'Le contenu reste tel quel ; l’auteur n’est pas prévenu.',
    MASQUER: 'Seuls l’auteur et la modération le voient encore et ses points sont retirés. L’auteur peut le corriger pour demander un nouvel examen.',
    RETABLIR: 'Le contenu redevient visible de tous et ses points sont rendus.',
    SUPPRIMER: 'Le contenu disparaît du site, ses images sont effacées et ses points retirés. Cette mesure est définitive.',
    AVERTIR: 'L’auteur reçoit un avertissement ; le contenu reste tel quel.',
    SUSPENDRE: 'L’auteur garde la lecture et ses paramètres, mais ne peut plus publier ni interagir pendant la durée choisie.',
    AJOUTER_AVERTISSEMENT_AGENT: 'La fiche avertit que le contenu donne des instructions à un agent ; seule la modération pourra retirer l’avertissement.',
    RETIRER_AVERTISSEMENT_AGENT: 'La fiche n’affiche plus l’avertissement.'
  };
  const QUESTIONS = {
    AUCUNE: 'Ne prendre aucune mesure ?', MASQUER: 'Masquer ce contenu ?', RETABLIR: 'Rétablir ce contenu ?', SUPPRIMER: 'Supprimer ce contenu ?',
    AVERTIR: 'Avertir l’auteur ?', SUSPENDRE: 'Suspendre l’auteur ?', AJOUTER_AVERTISSEMENT_AGENT: 'Ajouter l’avertissement ?', RETIRER_AVERTISSEMENT_AGENT: 'Retirer l’avertissement ?'
  };
  const CONFIRMER_MASQUAGE = {
    libelle: 'Confirmer le masquage', question: 'Confirmer le masquage ?',
    effet: 'Le contenu reste masqué et les signalements sont jugés fondés. L’auteur reçoit la décision et peut corriger le contenu pour demander un nouvel examen.'
  };
  const GROUPES = [
    { titre: 'Le contenu', actions: ['AUCUNE', 'MASQUER', 'RETABLIR', 'SUPPRIMER', 'AJOUTER_AVERTISSEMENT_AGENT', 'RETIRER_AVERTISSEMENT_AGENT'] },
    { titre: 'Son auteur', actions: ['AVERTIR', 'SUSPENDRE'] }
  ];
  const STATUTS = { VISIBLE: 'Visible', MASQUE: 'Masqué', SUPPRIME: 'Supprimé' };
  const STATUTS_SIGNALEMENT = { OUVERT: ['Ouvert', 'circle-dot'], FONDE: ['Fondé', 'check-circle'], NON_FONDE: ['Non fondé', 'x-circle'] };
  const DELAI_CIBLE = '72 heures';
  const SUSPENSION = { min: 1, max: 90 };
  const MOTIF_MAX = 2000;

  /** RG-102, RG-23, F-93 : décisions possibles sur un contenu dans son état (actionsPossibles). */
  function actionsPossibles(c) {
    if (c.statut === 'SUPPRIME') return [];
    if (c.statut === 'MASQUE' && c.masquageAuto) return ['MASQUER', 'RETABLIR', 'SUPPRIMER'];
    const creation = c.type === 'CREATION';
    const avertissement = c.avertissementAgent || 'AUCUN';
    return ['AUCUNE', c.statut === 'MASQUE' ? 'RETABLIR' : 'MASQUER', 'SUPPRIMER', 'AVERTIR', 'SUSPENDRE',
      ...(creation && avertissement !== 'MODERATION' ? ['AJOUTER_AVERTISSEMENT_AGENT'] : []),
      ...(creation && avertissement !== 'AUCUN' ? ['RETIRER_AVERTISSEMENT_AGENT'] : [])];
  }
  const issue = action => (action === 'AUCUNE' || action === 'RETABLIR' ? 'NON_FONDE' : 'FONDE');
  function issueAnnoncee(action, ouverts) {
    if (!ouverts) return '';
    const mot = issue(action) === 'FONDE' ? 'fondé' : 'non fondé';
    return ouverts > 1 ? `Les ${fmt(ouverts)} signalements ouverts seront clos comme ${mot}s.` : `Le signalement ouvert sera clos comme ${mot}.`;
  }
  const finSuspension = jours => new Date(Date.now() + jours * 86400000);
  const enPhrase = texte => (/[.!?…»]$/.test(texte.trim()) ? texte.trim() : `${texte.trim()}.`);
  const date = heures => EQ.ilYa(heures);

  /* Décisions simulées, gardées pour la session du navigateur ------------------------------------- */

  const CLE = 'vysora-moderation-decisions';
  const lireDecisions = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || '{}') || {}; } catch { return {}; } };
  const garderDecision = (id, decision) => {
    const toutes = lireDecisions();
    (toutes[id] = toutes[id] || []).push(decision);
    try { sessionStorage.setItem(CLE, JSON.stringify(toutes)); } catch { /* stockage indisponible */ }
  };
  /** Contenu avec les décisions simulées de la session appliquées. */
  function etatDuContenu(source) {
    const c = JSON.parse(JSON.stringify(source));
    c.decisions = c.decisions.map(d => ({ ...d, date: date(d.ilYa) }));
    c.signalements = c.signalements.map(s => ({ ...s, date: date(s.ilYa) }));
    c.historique = c.historique.map(d => ({ ...d, date: date(d.ilYa) }));
    (lireDecisions()[c.id] || []).forEach(d => {
      const ouverts = c.signalements.filter(s => s.statut === 'OUVERT');
      ouverts.forEach(s => { s.statut = issue(d.action); });
      c.decisions.push({ ...d, signalementsClos: ouverts.length });
      c.nouvelExamen = false;
      if (d.action === 'MASQUER') { c.statut = 'MASQUE'; c.masquageAuto = null; }
      if (d.action === 'RETABLIR') { c.statut = 'VISIBLE'; c.masquageAuto = null; }
      if (d.action === 'SUPPRIMER') { c.statut = 'SUPPRIME'; c.masquageAuto = null; }
      if (d.action === 'AJOUTER_AVERTISSEMENT_AGENT') c.avertissementAgent = 'MODERATION';
      if (d.action === 'RETIRER_AVERTISSEMENT_AGENT') c.avertissementAgent = 'AUCUN';
      if (d.action === 'SUSPENDRE') c.suspensionFin = d.finSuspension;
    });
    return c;
  }
  const contenus = () => D.contenus.map(etatDuContenu);
  /** Cas Bon réflexe pas encore examinés dans la session (onglet « Cas à valider »). */
  const casAExaminer = () => { let faits = {}; try { faits = JSON.parse(sessionStorage.getItem('vysora-moderation-examens') || '{}') || {}; } catch { /* stockage indisponible */ } return (D.cas || []).filter(c => !faits[c.id]).length; };

  const avatar = (m, taille, classe = '') => (m.avatar
    ? `<img${classe ? ` class="${classe}"` : ''} src="${m.avatar}" alt="" width="${taille}" height="${taille}" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar${classe ? ` ${classe}` : ''}" style="width:${taille}px;height:${taille}px" aria-hidden="true">${icon('user', 'icon')}</span>`);
  const dossierHref = id => `moderation-dossier.html?id=${id}`;

  /* File ------------------------------------------------------------------------------------------- */

  function rendreFile(reglages) {
    const page = $('[data-eq-page]');
    const elements = reglages.file === 'vide' ? [] : contenus()
      .filter(c => c.signalements.some(s => s.statut === 'OUVERT') || c.nouvelExamen)
      .map(c => ({ c, ouverts: c.signalements.filter(s => s.statut === 'OUVERT'), enRetard: c.depuis > 72 }))
      .sort((a, b) => (Boolean(b.c.masquageAuto) - Boolean(a.c.masquageAuto)) || (b.c.depuis - a.c.depuis));
    const enRetard = elements.filter(e => e.enRetard).length;
    const auto = elements.some(e => e.c.masquageAuto);

    const ligne = ({ c, ouverts, enRetard: retard }) => {
      const motifs = {};
      ouverts.forEach(s => { motifs[s.motif] = (motifs[s.motif] || 0) + 1; });
      const derniere = c.historique[0];
      const marques = [
        c.masquageAuto ? `<span class="md-marque is-accent">${icon('eye-off', 'icon icon-xs')}${t(`Masqué automatiquement le ${EQ.dateCourte(date(c.masquageAuto))} : à examiner en priorité`)}</span>` : '',
        c.nouvelExamen ? `<span class="md-marque is-accent">${icon('pen', 'icon icon-xs')}${t('Modifié après le masquage : nouvel examen')}</span>`
          : (c.statut === 'MASQUE' && !c.masquageAuto ? `<span class="md-marque">${icon('eye-off', 'icon icon-xs')}Masqué</span>` : ''),
        derniere ? `<span class="md-marque">${icon('history', 'icon icon-xs')}${t(`${EQ.pluriel(c.historique.length, 'décision antérieure', 'décisions antérieures')} contre l’auteur · la dernière : ${ACTIONS[derniere.action]}, ${EQ.dateCourte(derniere.date)}`)}</span>` : ''
      ].join('');
      return `<li class="md-item${retard ? ' is-retard' : ''}">
        <a class="md-ouvrir" href="${dossierHref(c.id)}">
          ${avatar(c.auteur, 40, 'md-visuel')}
          <span class="md-item-corps">
            <span class="md-item-haut"><span class="md-genre">${icon(TYPES[c.type][1], 'icon icon-xs')}${TYPES[c.type][0]}</span><span class="md-sep" aria-hidden="true">·</span><span class="md-qui">${t(c.auteur.nom)}</span></span>
            <span class="md-item-titre">${t(c.intitule)}</span>
            <span class="md-item-motifs">${ouverts.length ? Object.entries(motifs).map(([m, n]) => `${MOTIFS[m]}${n > 1 ? ` (${fmt(n)})` : ''}`).join(', ') : 'Aucun signalement ouvert'}</span>
            ${marques ? `<span class="md-item-marques">${marques}</span>` : ''}
          </span>
          <span class="md-item-nb"><strong>${fmt(ouverts.length)}</strong><span>${ouverts.length > 1 ? 'signalements' : 'signalement'}</span></span>
          <span class="md-item-attente"><time datetime="${date(c.depuis)}">${EQ.anciennete(date(c.depuis))}</time><span>${retard ? `${icon('clock', 'icon icon-xs')}Au-delà du délai` : 'd’attente'}</span></span>
          ${icon('chevron-right', 'icon icon-sm md-fleche')}
        </a>
      </li>`;
    };

    page.innerHTML = `<div class="container md-tete">
        <p class="md-rubrique">${icon('shield', 'icon icon-sm')}Modération</p>
        <h1>File de modération</h1>
        ${elements.length ? `<p class="md-statut"><span class="is-fort">${EQ.pluriel(elements.length, 'contenu', 'contenus')} à examiner</span>${enRetard ? `<span class="is-retard">${icon('clock', 'icon icon-sm')}${fmt(enRetard)} en attente depuis plus de ${DELAI_CIBLE}</span>` : ''}</p>` : ''}
        ${EQ.ongletsModeration('signalements', { signalements: elements.length, cas: casAExaminer() })}
      </div>
      ${elements.length ? `<div class="container md-file">
        <p class="md-regle">${t(`${auto ? 'Les contenus masqués automatiquement en tête, puis du plus ancien au plus récent.' : 'Du plus ancien au plus récent.'} Délai cible de traitement : ${DELAI_CIBLE}.`)}</p>
        <ol class="md-liste">${elements.map(ligne).join('')}</ol>
      </div>` : `<div class="container md-file"><div class="md-vide">
        <span class="md-vide-icone" aria-hidden="true">${icon('check-circle')}</span>
        <h2>La file est vide</h2>
        <p>${t('Les contenus signalés, et ceux que leur auteur a corrigés après un masquage, s’affichent ici du plus ancien au plus récent.')}</p>
      </div></div>`}`;
  }

  /* Dossier ---------------------------------------------------------------------------------------- */

  const precision = d => (d.points != null ? `${d.points > 0 ? '+' : '−'}${EQ.pluriel(Math.abs(d.points), 'point', 'points')}` : d.badge ? `Badge « ${d.badge} »` : '');
  const resume = d => [precision(d), `Par ${d.decideur.nom}, le ${EQ.dateCourte(d.date)}`, d.finSuspension ? `jusqu’au ${EQ.dateLongue(d.finSuspension)}` : '',
    d.signalementsClos ? `${fmt(d.signalementsClos)} ${d.signalementsClos > 1 ? 'signalements clos' : 'signalement clos'}` : ''].filter(Boolean).map(V.typo).join(' · ');

  function rendreDossier(reglages) {
    const page = $('[data-eq-page]');
    const id = Number(new URLSearchParams(location.search).get('id')) || D.contenus[0].id;
    const source = D.contenus.find(c => c.id === id);
    const ariane = `<nav class="md-ariane" aria-label="Fil d’Ariane"><ol><li><a href="moderation.html">File de modération</a></li><li><span aria-current="page">Dossier n° ${id}</span></li></ol></nav>`;
    const refus = !source || reglages.dossier === 'introuvable'
      ? { titre: 'Ce contenu est introuvable', texte: 'L’adresse ne correspond à aucun contenu : il a pu être supprimé par son auteur.' }
      : reglages.dossier === 'soi' ? { titre: 'Ce dossier ne vous revient pas', texte: 'Vous êtes l’auteur de ce contenu : un autre membre de l’équipe de modération examine ce dossier.' } : null;
    if (refus) {
      document.title = 'Dossier de modération · Vysora';
      page.innerHTML = `<div class="container md-tete">${ariane}<h1>Dossier de modération</h1></div>
        <div class="container md-file"><div class="md-vide"><span class="md-vide-icone" aria-hidden="true">${icon('flag')}</span><h2>${refus.titre}</h2><p>${t(refus.texte)}</p><a class="btn btn-secondary" href="moderation.html">Revenir à la file</a></div></div>`;
      return;
    }
    const c = etatDuContenu(source);
    const administrateur = V.etats.peut('administrer');
    const titre = (c.texte && TITRES_DOSSIER[c.type]) || c.intitule;
    document.title = `Dossier : ${V.typo(titre)} · Vysora`;
    const ouverts = c.signalements.filter(s => s.statut === 'OUVERT').length;
    const clos = c.signalements.length - ouverts;
    const possibles = actionsPossibles(c);
    const groupes = GROUPES.map(g => ({ ...g, actions: g.actions.filter(a => possibles.includes(a)) })).filter(g => g.actions.length);
    const alertes = [
      c.masquageAuto ? `<p class="md-alerte">${icon('flag')}<span><b>Masqué automatiquement le ${EQ.dateLongue(date(c.masquageAuto))}.</b>${t(' Le masquage est provisoire : le contenu a atteint le seuil de 3 signalements de membres de niveau Apprenti ou plus. Confirmez le masquage, rétablissez ou supprimez le contenu ; les autres mesures viennent ensuite.')}</span></p>` : '',
      c.nouvelExamen ? `<p class="md-alerte">${icon('pen')}<span><b>Nouvel examen demandé.</b> L’auteur a modifié ce contenu le ${EQ.dateLongue(date(c.modifieIlYa))}, après son masquage.</span></p>` : '',
      c.suspensionFin ? `<p class="md-alerte">${icon('lock')}<span><b>Compte de l’auteur suspendu jusqu’au ${EQ.dateLongue(c.suspensionFin)}.</b>${t(' Une nouvelle suspension court à partir d’aujourd’hui ; la fin la plus tardive s’applique.')}</span></p>` : '',
      c.avertissementAgent && c.avertissementAgent !== 'AUCUN' ? `<p class="md-alerte">${icon('info')}<span><b>${t('Avertissement « instructions pour agent »')}</b> ${c.avertissementAgent === 'AUTEUR' ? 'posé par l’auteur' : 'posé par la modération'}.</span></p>` : ''
    ].join('');
    const lien = c.page && c.statut !== 'SUPPRIME' ? `<a class="btn btn-secondary btn-sm" href="${c.page}">${c.type === 'CREATION' ? 'Voir la création' : 'Voir sur la fiche de la création'}${icon('arrow-up-right', 'icon icon-sm')}</a>` : '';
    const ligneSignalement = s => `<li class="md-ligne${s.statut === 'OUVERT' ? ' is-ouvert' : ''}">${avatar(s.signaleur, 32)}<div class="md-ligne-corps">
        <p class="md-ligne-haut"><b>${MOTIFS[s.motif]}</b><span>${t(`${s.signaleur.nom} · ${EQ.dateCourte(s.date)}`)}</span><span class="md-statut-signalement is-${s.statut.toLowerCase()}">${icon(STATUTS_SIGNALEMENT[s.statut][1], 'icon icon-xs')}${STATUTS_SIGNALEMENT[s.statut][0]}</span></p>
        ${s.precision ? `<p class="md-ligne-texte">${t(s.precision)}</p>` : ''}
      </div></li>`;
    const ligneDecision = d => `<li class="md-ligne">${avatar(d.decideur, 32)}<div class="md-ligne-corps">
        <p class="md-ligne-haut"><b>${t(ACTIONS[d.action])}</b><span>${resume(d)}</span><span class="md-ref">Décision n° ${d.id}</span></p>
        <p class="md-ligne-texte">${t(enPhrase(d.motif))}</p>
      </div></li>`;
    const ligneHistorique = d => `<li class="md-ligne"><span class="md-ligne-icone" aria-hidden="true">${icon('history', 'icon icon-sm')}</span><div class="md-ligne-corps">
        <p class="md-ligne-haut"><b>${t(ACTIONS[d.action])}</b><span>${resume(d)}</span></p>
        ${d.intituleContenu ? `<p class="md-ligne-sur">Sur <a href="${dossierHref(d.contenuId)}">${t(d.intituleContenu)}</a></p>` : ''}
        <p class="md-ligne-texte">${t(enPhrase(d.motif))}</p>
      </div></li>`;
    const choix = action => {
      const confirme = action === 'MASQUER' && c.masquageAuto;
      return `<label class="md-choix"><input type="radio" name="action" value="${action}" required><span><b>${t(confirme ? CONFIRMER_MASQUAGE.libelle : ACTIONS[action])}</b><span>${t(confirme ? CONFIRMER_MASQUAGE.effet : EFFETS[action])}</span></span></label>`;
    };

    page.innerHTML = `<div class="container md-tete">
        ${ariane}
        <p class="md-rubrique">${icon(TYPES[c.type][1], 'icon icon-sm')}${TYPES[c.type][0]}<span class="md-sep" aria-hidden="true">·</span><span class="md-etat is-${c.statut.toLowerCase()}">${STATUTS[c.statut]}</span></p>
        <h1 class="md-titre-dossier">${t(titre)}</h1>
        <div class="md-meta">
          <div class="md-auteur">${avatar(c.auteur, 44)}<div><strong>${t(c.auteur.nom)}</strong><span>${t(`@${c.auteur.pseudo} · ${c.auteur.niveau} · créé le ${EQ.dateCourte(date(c.creeIlYa))}`)}</span></div></div>
          <div class="md-meta-actions">${lien}${groupes.length ? '<a class="btn btn-primary btn-sm md-aller" href="#md-decision">Prendre une décision</a>' : ''}</div>
        </div>
        ${alertes}
      </div>
      <div class="container md-dossier">
        <div class="md-principal">
          ${c.texte ? `<section class="md-section" aria-labelledby="md-texte-titre"><h2 id="md-texte-titre">${TITRES_TEXTE[c.type] || 'Texte'}</h2><p class="md-texte">${t(c.texte)}</p></section>` : ''}
          <section class="md-section" aria-labelledby="md-signalements-titre">
            <div class="md-section-tete"><h2 id="md-signalements-titre">Signalements</h2><p>${c.signalements.length ? [ouverts ? `${fmt(ouverts)} ${ouverts > 1 ? 'ouverts' : 'ouvert'}` : '', clos ? `${fmt(clos)} clos` : ''].filter(Boolean).join(' · ') : ''}</p></div>
            ${c.signalements.length ? `<ol class="md-fil">${c.signalements.map(ligneSignalement).join('')}</ol>` : `<p class="md-rien">${t('Aucun signalement : ce contenu est examiné à la demande de la modération ou de son auteur.')}</p>`}
          </section>
          <section class="md-section" aria-labelledby="md-decisions-titre">
            <div class="md-section-tete"><h2 id="md-decisions-titre">Décisions sur ce contenu</h2></div>
            ${c.decisions.length ? `<ol class="md-fil">${c.decisions.map(ligneDecision).join('')}</ol>` : '<p class="md-rien">Aucune décision n’a encore été prise sur ce contenu.</p>'}
          </section>
          <section class="md-section" aria-labelledby="md-historique-titre">
            <div class="md-section-tete"><h2 id="md-historique-titre">Historique de l’auteur</h2><p>Décisions qui ont visé l’auteur ou ses autres contenus</p>
              ${administrateur ? `<a class="ad-lien" href="administration-membre.html?pseudo=${c.auteur.pseudo}">Dossier du membre${icon('arrow-up-right', 'icon icon-sm')}</a>` : ''}</div>
            ${c.historique.length ? `<ol class="md-fil">${c.historique.map(ligneHistorique).join('')}</ol>` : '<p class="md-rien">Aucune décision n’a visé cet auteur jusqu’ici.</p>'}
          </section>
        </div>
        <aside class="md-decision" id="md-decision" aria-labelledby="md-decision-titre">
          <h2 id="md-decision-titre">Prendre une décision</h2>
          ${groupes.length ? `<form class="md-form" novalidate autocomplete="off" data-md-form>
            <fieldset class="md-actions"><legend class="sr-only">Décision</legend>
              ${groupes.map(g => `<div class="md-groupe" role="group" aria-label="${g.titre}"><p class="md-groupe-titre" aria-hidden="true">${g.titre}</p>${g.actions.map(choix).join('')}</div>`).join('')}
            </fieldset>
            <p class="md-erreur" id="md-action-erreur" data-md-erreur="action" hidden></p>
            <div class="md-champ" data-md-duree hidden>
              <label for="md-duree">Durée de la suspension</label>
              <div class="md-duree"><input id="md-duree" name="dureeJours" type="number" inputmode="numeric" min="${SUSPENSION.min}" max="${SUSPENSION.max}" step="1" aria-describedby="md-duree-aide md-duree-erreur"><span>jours</span></div>
              <p class="md-aide" id="md-duree-aide" data-md-fin>De ${SUSPENSION.min} à ${SUSPENSION.max} jours.</p>
              <p class="md-erreur" id="md-duree-erreur" data-md-erreur="dureeJours" hidden></p>
            </div>
            <div class="md-champ">
              <label for="md-motif">Motif communiqué à l’auteur</label>
              <textarea id="md-motif" name="motif" rows="5" maxlength="${MOTIF_MAX}" required aria-describedby="md-motif-aide md-motif-erreur"></textarea>
              <p class="md-aide" id="md-motif-aide"><span>${t('Envoyé à l’auteur par e-mail, sauf pour « Aucune mesure », et conservé avec la décision.')}</span><span class="md-compteur" data-md-compteur>0 / ${fmt(MOTIF_MAX)}</span></p>
              <p class="md-erreur" id="md-motif-erreur" data-md-erreur="motif" hidden></p>
            </div>
            <p class="md-issue" data-md-issue hidden></p>
            <button class="btn btn-primary md-envoyer" type="submit">Enregistrer la décision</button>
            <p class="md-note">${t('Une décision ne se modifie plus : une erreur se corrige par une nouvelle décision.')}</p>
          </form>` : `<p class="md-rien">${t('Ce contenu a été supprimé : plus aucune décision n’est possible. Son dossier reste consultable.')}</p>`}
        </aside>
      </div>`;
    if (groupes.length) brancherFormulaire(c, ouverts);
  }

  /* Formulaire de décision (scripts/moderation.ts) ------------------------------------------------- */

  function brancherFormulaire(c, ouverts) {
    const form = $('[data-md-form]');
    const champDuree = $('#md-duree', form);
    const aideDuree = $('[data-md-fin]', form);
    const aideInitiale = aideDuree.textContent;
    const motif = $('#md-motif', form);
    const action = () => $('input[name="action"]:checked', form)?.value || null;
    const duree = () => (champDuree.value.trim() ? Number(champDuree.value) : null);
    const CHAMPS = { action: $('input[name="action"]', form), dureeJours: champDuree, motif };
    const erreur = (champ, message = '') => {
      const zone = $(`[data-md-erreur="${champ}"]`, form);
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      if (champ !== 'action' && CHAMPS[champ]) CHAMPS[champ].setAttribute('aria-invalid', String(Boolean(message)));
    };
    const effacer = () => ['action', 'dureeJours', 'motif'].forEach(champ => erreur(champ));

    $$('input[name="action"]', form).forEach(radio => radio.addEventListener('change', () => {
      const choisie = action();
      const suspension = choisie === 'SUSPENDRE';
      $('[data-md-duree]', form).hidden = !suspension;
      champDuree.required = suspension;
      if (!suspension) { champDuree.value = ''; aideDuree.textContent = aideInitiale; erreur('dureeJours'); }
      const message = choisie ? issueAnnoncee(choisie, ouverts) : '';
      const zone = $('[data-md-issue]', form);
      zone.textContent = V.typo(message);
      zone.hidden = !message;
      erreur('action');
    }));
    champDuree.addEventListener('input', () => {
      const jours = duree();
      aideDuree.textContent = jours !== null && Number.isInteger(jours) && jours >= SUSPENSION.min && jours <= SUSPENSION.max
        ? V.typo(`Jusqu’au ${EQ.dateLongue(finSuspension(jours))}.`) : aideInitiale;
      erreur('dureeJours');
    });
    motif.addEventListener('input', () => { $('[data-md-compteur]', form).textContent = `${fmt(motif.value.length)} / ${fmt(MOTIF_MAX)}`; erreur('motif'); });

    /** schemaDecisionModeration : mêmes contrôles et messages. */
    function controler() {
      const erreurs = {};
      const choisie = action();
      const jours = duree();
      if (!choisie) erreurs.action = 'Choisissez la décision.';
      if (!motif.value.trim()) erreurs.motif = 'Rédigez le motif communiqué à l’auteur.';
      const message = `Indiquez une durée de ${SUSPENSION.min} à ${SUSPENSION.max} jours.`;
      if (choisie === 'SUSPENDRE' && jours === null) erreurs.dureeJours = `Indiquez la durée de la suspension : de ${SUSPENSION.min} à ${SUSPENSION.max} jours.`;
      else if (jours !== null && (!Number.isInteger(jours) || jours < SUSPENSION.min || jours > SUSPENSION.max)) erreurs.dureeJours = message;
      return erreurs;
    }

    form.addEventListener('submit', evenement => {
      evenement.preventDefault();
      effacer();
      const erreurs = controler();
      if (Object.keys(erreurs).length) {
        Object.entries(erreurs).forEach(([champ, message]) => erreur(champ, message));
        CHAMPS[Object.keys(erreurs)[0]]?.focus();
        return;
      }
      const choisie = action();
      const jours = duree();
      const confirme = choisie === 'MASQUER' && c.masquageAuto;
      const fin = choisie === 'SUSPENDRE' ? finSuspension(jours) : null;
      const texte = [fin ? `Le compte de l’auteur sera suspendu jusqu’au ${EQ.dateLongue(fin)}.` : '', issueAnnoncee(choisie, ouverts),
        choisie === 'AUCUNE' ? '' : 'L’auteur en est informé par e-mail, avec votre motif.', 'La décision ne pourra plus être modifiée.'].filter(Boolean).join(' ');
      EQ.confirmer({
        titre: confirme ? CONFIRMER_MASQUAGE.question : QUESTIONS[choisie],
        texte,
        libelle: confirme ? CONFIRMER_MASQUAGE.libelle : ACTIONS[choisie],
        action: () => {
          garderDecision(c.id, { id: 1000 + Math.floor(Math.random() * 9000), action: choisie, decideur: D.moi, date: new Date().toISOString(), motif: motif.value.trim(), finSuspension: fin ? fin.toISOString() : null });
          rendre();
          window.scrollTo({ top: 0 });
          V.toast(choisie === 'AUCUNE' ? 'Décision enregistrée.' : 'Décision enregistrée. L’auteur en est informé par e-mail.');
        }
      });
      const bouton = $('[data-eq-confirmer]');
      if (bouton) bouton.classList.toggle('is-danger', choisie === 'SUPPRIMER');
    });
  }

  /* Montage ---------------------------------------------------------------------------------------- */

  let reglages = {};
  const rendre = () => (vue === 'dossier' ? rendreDossier(reglages) : rendreFile(reglages));
  V.initHeader();
  reglages = V.initTweaks({
    key: vue === 'dossier' ? 'vysora-moderation-dossier-reglages' : 'vysora-moderation-reglages',
    etats: vue === 'dossier'
      ? [{ name: 'dossier', legend: 'Dossier', options: [['ouvert', 'Ouvert'], ['introuvable', 'Contenu introuvable'], ['soi', 'Votre propre contenu']] }]
      : [{ name: 'file', legend: 'File', options: [['remplie', 'Contenus à examiner'], ['vide', 'File vide']] }],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: vue === 'dossier' ? { dossier: 'ouvert' } : { file: 'remplie' },
    onChange: (change, suivant) => { reglages = suivant; if (change !== 'init') majPage(); }
  }) || {};
  const majPage = EQ.monter({
    action: 'moderer',
    quoi: 'accéder à la file de modération',
    titre: vue === 'dossier' ? 'Dossier de modération · Vysora' : 'File de modération · Vysora',
    rendre
  });
  document.body.classList.add('is-ready');
})();
