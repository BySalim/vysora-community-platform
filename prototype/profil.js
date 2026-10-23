'use strict';

/* Page Profil (EC-14) : profil public d'un membre ; pour son propriétaire connecté,
   progression privée (réputation, apprentissage, limites), badges à débloquer,
   modification du profil et aperçu public. Données : profil-data.js. Les créations
   publiées, repassées en brouillon ou supprimées dans Mes contenus (vysora-mes-contenus)
   s'y reflètent. */

(() => {
  const V = window.Vysora;
  const P = window.VYSORA_PROFIL;
  const PUB = window.VYSORA_PUBLIER;
  const E = V.etats;
  const { $, $$, t, esc, icon, fmt, typo } = V;
  const root = document.documentElement;
  const CLE = 'vysora-profil';
  const CLE_MC = 'vysora-mes-contenus';
  const MOTIF_PSEUDO = /^[a-z0-9][a-z0-9-]{2,29}$/;
  const pseudoDemande = (new URLSearchParams(location.search).get('pseudo') || '').trim().toLowerCase();
  const ORDRE_NIVEAUX = ['curieux', 'apprenti', 'artisan', 'expert', 'maitre'];
  const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const COULEURS = ['#2563EB', '#EB6834', '#1BAF7A', '#EDA100'];
  const RESULTATS = { reussi: ['Réussi', 'check-circle'], partiel: ['Partiel', 'half-circle'], echec: ['Échec', 'x-circle'] };
  const CATEGORIES = { 'Image et illustration': 'image', 'Code et scripts': 'code', 'Application web': 'browser', 'Texte et rédaction': 'pen', 'Automatisation': 'flow', 'Analyse de données': 'chart' };
  const MOMENTS = Object.fromEntries((PUB.moments || []).map(m => [m.id, m.label]));

  let settings = {};
  let edits = lireEdits();
  const ui = { typeCreations: 'toutes', triCreations: 'recentes', creationsCompletes: false, filtreActivite: 'tout', activiteComplete: false, compteurs: new WeakSet(), vueOrigine: null };
  const CREATIONS_VISIBLES = 6;

  /* Profil enregistré sur cet appareil ------------------------------------ */

  function lireEdits() {
    const saved = V.store.get(CLE, {}) || {};
    const propre = {};
    if (typeof saved.bio === 'string') propre.bio = saved.bio.slice(0, 500);
    if (typeof saved.lien === 'string') propre.lien = saved.lien;
    if (typeof saved.photo === 'string' && saved.photo.startsWith('data:image/')) propre.photo = saved.photo;
    if (saved.guideMasque === true) propre.guideMasque = true;
    return propre;
  }
  const ecrireEdits = () => V.store.set(CLE, edits);

  /* Actions faites dans Mes contenus : statut (brouillon, publiee, supprimee) et dates de chaque création modifiée. */
  const lireMesContenus = () => {
    const e = V.store.get(CLE_MC, {}) || {};
    return { statuts: e.statuts && typeof e.statuts === 'object' ? e.statuts : {}, dates: e.dates && typeof e.dates === 'object' ? e.dates : {} };
  };
  let mc = lireMesContenus();

  /* Contexte : qui consulte quel profil ----------------------------------- */

  function contexte() {
    const membre = E.membre();
    const autrePseudo = pseudoDemande && pseudoDemande !== E.MOI.pseudo;
    const introuvable = settings.profil === 'introuvable' || (!membre && autrePseudo);
    const proprio = membre && !introuvable;
    const apercu = proprio && settings.vue === 'public';
    const pseudo = proprio && autrePseudo && MOTIF_PSEUDO.test(pseudoDemande) ? pseudoDemande : E.MOI.pseudo;
    return { membre, introuvable, proprio, apercu, prive: proprio && !apercu, vide: settings.contenu === 'vide', pseudo };
  }
  let C = contexte();

  const cleNiveau = () => (ORDRE_NIVEAUX.includes(E.get().niveau) ? E.get().niveau : 'apprenti');
  const N = () => P.niveaux[cleNiveau()];
  const niv = () => E.NIVEAUX[cleNiveau()];
  const prenom = () => E.MOI.nom.split(' ')[0];
  const bio = () => (typeof edits.bio === 'string' ? edits.bio : (N().bio ?? P.identite.bio));
  const lien = () => (typeof edits.lien === 'string' ? edits.lien : (N().lien ?? P.identite.lien));
  const photo = () => edits.photo || '';
  const lienAffiche = url => url.replace(/^https:\/\//, '').replace(/\/$/, '');
  const moisAnnee = iso => { const d = new Date(`${iso}T12:00:00`); return `${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`; };
  const dateLongue = iso => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  const total = () => niv().points;
  const jour = iso => String(iso).slice(0, 10);

  /* Créations : exemples de la page Publier, statistiques du niveau. */
  function typeDe(chemin) {
    const ps = chemin.filter(x => x.kind === 'prompt');
    const es = chemin.filter(x => x.kind === 'etape');
    if (!es.length && !ps.some(p => String(p.prompt || '').trim())) return null;
    if (es.length || new Set(ps.map(p => p.outil).filter(Boolean)).size > 1) return 'projet';
    return ps.length >= 2 ? 'iteration' : 'prompt';
  }
  function outilsDe(chemin) {
    const liste = [];
    chemin.filter(x => x.outil).forEach(x => {
      const deja = liste.find(o => o.outil === x.outil);
      if (!deja) liste.push({ outil: x.outil, modeles: x.modele ? [x.modele] : [] });
      else if (x.modele && !deja.modeles.includes(x.modele)) deja.modeles.push(x.modele);
    });
    return liste;
  }
  /* Un brouillon publié depuis Mes contenus n'a pas d'image : sa vignette reprend le début de son premier prompt. */
  function creation(c) {
    const ex = PUB.exemples[c.id];
    const s = (!c.brouillon && N().creations[c.id]) || [0, 0, 0, 0];
    const outils = outilsDe(ex.chemin);
    const config = outils.map(o => `${o.outil}${o.modeles.length ? ` · ${o.modeles.join(', ')}` : ''}`).join(' et ');
    const premier = ex.chemin.find(x => x.kind === 'prompt' && String(x.prompt || '').trim()) || {};
    const media = c.media || { kind: 'texte', outil: premier.outil || '', texte: premier.prompt || (ex.chemin.find(x => x.kind === 'etape') || {}).texte || ex.objectif };
    return { ...c, media, type: typeDe(ex.chemin), titre: ex.titre, objectif: ex.objectif, limites: ex.limites, licence: ex.licence, categorie: ex.categorie || c.categorie || '',
      publie: c.publie || ex.publie, chemin: ex.chemin, etiquettes: ex.etiquettes,
      utile: s[0], essais: s[1], reussis: s[2], vues: s[3], moments: ex.chemin.filter(x => x.moment).length, outils, config };
  }
  /* Créations du niveau (les plus récentes de P.creations) et brouillons en cours, comme dans Mes contenus. */
  const creationsDuNiveau = () => P.creations.slice(0, N().stats.creations).filter(c => PUB.exemples[c.id]);
  const brouillonsDuNiveau = () => (PUB.brouillons || []).filter(id => PUB.exemples[id] && PUB.exemples[id].modifie.slice(0, 10) >= N().depuis);
  const retiree = id => !!mc.statuts[id] && mc.statuts[id] !== 'publiee';
  function creationsPubliees() {
    if (C.vide) return [];
    const nouvelles = brouillonsDuNiveau().filter(id => mc.statuts[id] === 'publiee')
      .map(id => ({ id, brouillon: true, publie: (mc.dates[id] && mc.dates[id].publie) || V.D.today }));
    return [...nouvelles, ...creationsDuNiveau().filter(c => !retiree(c.id))].map(creation);
  }
  /* Statistiques publiques : celles du niveau, moins les créations repassées en brouillon ou supprimées. */
  function stats() {
    if (C.vide) return { creations: 0, utiles: 0, essais: 0, reussis: 0, reponses: 0, vues: 0 };
    const s = N().stats;
    const retirees = creationsDuNiveau().filter(c => retiree(c.id)).map(c => N().creations[c.id] || [0, 0, 0, 0]);
    const moins = k => retirees.reduce((a, x) => a + x[k], 0);
    return { ...s, creations: creationsPubliees().length, utiles: s.utiles - moins(0), essais: s.essais - moins(1), reussis: s.reussis - moins(2), vues: s.vues - moins(3) };
  }
  /* Brouillons en cours, du plus récemment modifié au plus ancien, créations repassées en brouillon comprises. */
  function brouillonsEnCours() {
    if (C.vide) return [];
    const ids = [...brouillonsDuNiveau().filter(id => !mc.statuts[id] || mc.statuts[id] === 'brouillon'), ...creationsDuNiveau().filter(c => mc.statuts[c.id] === 'brouillon').map(c => c.id)];
    const modifie = id => (mc.dates[id] && mc.dates[id].modifie) || PUB.exemples[id].modifie;
    return ids.map(id => ({ id, titre: PUB.exemples[id].titre, modifie: modifie(id) })).sort((a, b) => b.modifie.localeCompare(a.modifie));
  }
  const contributions = () => {
    if (C.vide) return [];
    const publiees = creationsPubliees();
    const ids = new Set(publiees.map(c => c.id));
    const liste = cleNiveau() === 'curieux' ? P.contributionsCurieux : P.contributions;
    const nouvelles = publiees.filter(c => c.brouillon).map(c => ({ kind: 'creation', at: jour(c.publie), creation: c.id }));
    return [...nouvelles, ...liste.filter(x => x.kind !== 'creation' || ids.has(x.creation))].sort((a, b) => b.at.localeCompare(a.at));
  };
  const badgesObtenus = () => (C.vide ? [] : N().badges);

  /* Fragments partagés ------------------------------------------------------ */

  const hexagone = (cls = '') => `<svg class="pf-hex ${cls}" viewBox="0 0 56 60" aria-hidden="true"><path d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/></svg>`;
  const emblem = (nom, cls = '') => {
    const b = P.badges[nom];
    return `<span class="emblem ${cls}" data-tone="${b.tone}" aria-hidden="true"><svg class="emblem-shape" viewBox="0 0 56 60"><path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/></svg>${icon(b.icon, '')}</span>`;
  };
  const photoHTML = (taille, cls = '') => (photo()
    ? `<img class="pf-photo ${cls}" src="${photo()}" alt="${C.prive ? 'Votre photo de profil' : t(`Photo de ${E.MOI.nom}`)}" width="${taille}" height="${taille}">`
    : `<span class="pf-photo pf-photo-defaut ${cls}" role="img" aria-label="${C.prive ? 'Aucune photo de profil' : t(`Profil de ${E.MOI.nom}`)}">${icon('user', '')}</span>`);
  const outilHTML = (outil, modele) => `<span class="pf-outil">${V.logo(outil)}${t(outil)}${modele ? `<span class="pf-modele"> · ${t(modele)}</span>` : ''}</span>`;
  const enTete = (id, kicker, kickerIcone, titre, compte = '', droite = '') => `<div class="pf-tete">
      <div><p class="kicker">${icon(kickerIcone)}${t(kicker)}</p><h2 id="${id}">${t(titre)}${compte !== '' ? ` <span class="pf-nb">${t(compte)}</span>` : ''}</h2></div>
      ${droite ? `<div class="pf-tete-droite">${droite}</div>` : ''}
    </div>`;
  const etatVide = (titre, texte, action = '') => `<div class="pf-vide"><p class="pf-vide-titre">${t(titre)}</p>${texte ? `<p>${t(texte)}</p>` : ''}${action}</div>`;

  /* Étapes pour compléter un profil récent (propriétaire). */
  function etapesGuide() {
    const n = N();
    return [
      { id: 'photo', fait: !!photo(), titre: 'Ajouter une photo', texte: 'Les membres reconnaissent plus vite vos réponses.', action: 'photo' },
      { id: 'bio', fait: !!bio(), titre: 'Écrire votre biographie', texte: 'Ce que vous créez avec l’IA, en quelques lignes.', action: 'bio' },
      { id: 'lien', fait: !!lien(), titre: 'Ajouter un lien personnel', texte: 'Portfolio, site ou dépôt de code.', action: 'lien' },
      { id: 'essai', fait: n.apprentissage.essais > 0 && !C.vide, titre: 'Déclarer un premier essai', texte: 'Reproduisez une création et partagez votre résultat.', lien: 'explorer.html' },
      { id: 'creation', fait: stats().creations > 0, titre: 'Publier une première création', texte: 'Le résultat obtenu, et le chemin parcouru pour y arriver.', lien: 'nouvelle-creation.html' }
    ];
  }

  /* En-tête du profil ------------------------------------------------------- */

  function renderHero() {
    const n = niv();
    const role = E.get().role;
    const suivant = ORDRE_NIVEAUX.map(k => E.NIVEAUX[k]).find(l => l.seuil > total());
    const b = bio();
    const l = lien();
    const etapes = etapesGuide();
    const restantes = etapes.filter(e => !e.fait);
    const montrerGuide = C.prive && restantes.length >= 2 && !edits.guideMasque;

    const actions = C.prive
      ? `<button class="btn btn-secondary" type="button" data-pf-modifier>${icon('pen')}Modifier le profil</button>
         <button class="btn btn-quiet" type="button" data-pf-apercu-on>${icon('eye')}Aperçu public</button>
         <button class="icon-btn" type="button" data-pf-partager aria-label="Partager le profil">${icon('share', '')}</button>`
      : `<button class="btn btn-primary" type="button" data-pf-suivre${C.apercu ? ' disabled aria-describedby="pf-suivre-note"' : ''}>${icon('plus')}Suivre</button>
         <button class="btn btn-quiet" type="button" data-pf-partager>${icon('share')}Partager le profil</button>
         ${C.apercu ? '' : `<button class="icon-btn" type="button" data-pf-signaler aria-label="${t(`Signaler le profil de ${E.MOI.nom}`)}">${icon('flag', '')}</button>`}
         ${C.apercu ? '<p class="pf-suivre-note" id="pf-suivre-note">Les autres membres peuvent vous suivre depuis ce bouton.</p>' : ''}`;

    $('[data-pf-hero]').innerHTML = `
      <div class="pf-bandeau" aria-hidden="true"></div>
      <div class="container pf-hero-in">
        <div class="pf-photo-zone pf-entree" style="--i:0">
          ${photoHTML(148, 'pf-photo-hero')}
          ${C.prive ? `<button class="pf-photo-btn" type="button" data-pf-modifier="photo" aria-label="${photo() ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}">${icon('camera', '')}</button>` : ''}
        </div>
        <div class="pf-identite">
          ${C.prive ? `<p class="kicker pf-entree" style="--i:1">${icon('user')}Mon profil</p>` : ''}
          <h1 id="pf-nom" class="pf-entree" style="--i:1">${t(E.MOI.nom)}</h1>
          <p class="pf-pseudo pf-entree" style="--i:2">@${esc(C.pseudo)}</p>
          <p class="pf-niveau pf-entree" style="--i:2">
            <span class="pf-niveau-nom">${hexagone()}<b>${t(n.nom)}</b></span>
            <span class="pf-sep" aria-hidden="true">·</span><span>${t(`${fmt(total())} points`)}</span>
            ${role !== 'membre' && E.membre() ? `<span class="pf-sep" aria-hidden="true">·</span><span class="pf-role">${icon('shield', 'icon-sm')}${role === 'admin' ? 'Administration' : 'Modération'}</span>` : ''}
            ${C.prive && suivant ? `<a class="pf-prochain" href="#progression">${t(`${fmt(suivant.seuil - total())} points avant ${suivant.nom}`)}</a>` : ''}
          </p>
          ${b ? `<p class="pf-bio pf-entree" style="--i:3" data-pf-zone="bio">${t(b)}</p>` : C.prive ? `<p class="pf-bio pf-bio-vide pf-entree" style="--i:3"><button class="link-btn" type="button" data-pf-modifier="bio">${icon('plus', 'icon-sm')}Ajouter une biographie</button></p>` : ''}
          <ul class="pf-meta pf-entree" style="--i:4">
            <li>${icon('calendar', 'icon-sm')}Membre depuis ${moisAnnee(N().depuis)}</li>
            ${l ? `<li data-pf-zone="lien">${icon('link', 'icon-sm')}<a href="${esc(l)}" rel="noopener nofollow ugc" target="_blank">${t(lienAffiche(l))}<span class="sr-only"> (nouvel onglet)</span></a></li>` : C.prive ? `<li><button class="link-btn" type="button" data-pf-modifier="lien">${icon('plus', 'icon-sm')}Ajouter un lien</button></li>` : ''}
          </ul>
        </div>
        <div class="pf-actions pf-entree" style="--i:3">${actions}</div>
      </div>
      ${montrerGuide ? `<div class="container"><div class="pf-guide" aria-labelledby="pf-t-guide">
        <div class="pf-guide-tete">
          <div><h2 id="pf-t-guide">Complétez votre profil</h2><p>${t(`${etapes.length - restantes.length} ${etapes.length - restantes.length > 1 ? 'étapes terminées' : 'étape terminée'} sur ${etapes.length}`)}</p></div>
          <span class="pf-guide-jauge" role="img" aria-label="${t(`${etapes.length - restantes.length} étapes terminées sur ${etapes.length}`)}"><i style="--v:${(etapes.length - restantes.length) / etapes.length}"></i></span>
          <button class="icon-btn" type="button" data-pf-guide-masquer aria-label="Masquer ces étapes">${icon('close', '')}</button>
        </div>
        <ol class="pf-guide-liste">${etapes.map(e => `<li class="${e.fait ? 'is-fait' : ''}">
          <span class="pf-guide-coche" aria-hidden="true">${icon(e.fait ? 'check' : 'plus', '')}</span>
          <span class="pf-guide-texte"><b>${t(e.titre)}</b><span>${t(e.texte)}</span></span>
          ${e.fait ? '<span class="sr-only">Terminé</span>' : e.action ? `<button class="link-btn" type="button" data-pf-modifier="${e.action}">Ajouter<span class="sr-only"> : ${t(e.titre)}</span></button>` : `<a class="link-btn" href="${e.lien}">Commencer<span class="sr-only"> : ${t(e.titre)}</span></a>`}
        </li>`).join('')}</ol>
      </div></div>` : ''}`;
  }

  /* Statistiques publiques -------------------------------------------------- */

  function renderChiffres() {
    const s = stats();
    const items = [
      ['Créations publiées', s.creations],
      ['Votes « Utile » reçus', s.utiles],
      ['Reproductions reçues', s.essais, s.essais >= 3 ? `${pct(s.reussis, s.essais)} % de succès` : ''],
      ['Réponses acceptées', s.reponses],
      ['Vues cumulées', s.vues]
    ];
    $('[data-pf-chiffres]').innerHTML = `<div class="container"><dl class="pf-chiffres-in">${items.map(([label, valeur, sous], i) => `<div class="pf-chiffre" style="--i:${i}">
      <dt>${t(label)}</dt><dd><span class="pf-valeur" data-pf-compter="${valeur}">${fmt(valeur)}</span>${sous ? `<small>${t(sous)}</small>` : ''}</dd>
    </div>`).join('')}</dl></div>`;
  }

  /* Barre de navigation du profil ------------------------------------------ */

  function renderNav() {
    const s = stats();
    const nbBadges = badgesObtenus().length;
    const liens = [
      ...(C.prive ? [['progression', `${icon('lock', 'icon-xs')}Progression`]] : []),
      ['creations', `Créations<span class="pf-nav-nb">${fmt(s.creations)}</span>`],
      ['contributions', 'Contributions'],
      ['badges', `Badges<span class="pf-nav-nb">${fmt(nbBadges)}</span>`]
    ];
    $('[data-pf-ancres]').innerHTML = liens.map(([id, label], i) => `<a href="#${id}"${i === 0 ? ' aria-current="location"' : ''}>${label}</a>`).join('');
    $('[data-pf-mini]').innerHTML = `${photoHTML(32, 'pf-photo-mini')}<b>${t(E.MOI.nom)}</b>`;
    $('[data-pf-nav-actions]').innerHTML = C.apercu
      ? `<button class="btn btn-sm btn-secondary" type="button" data-pf-apercu-off>${icon('close', 'icon-sm')}Quitter l’aperçu</button>`
      : C.prive ? `<button class="btn btn-sm btn-quiet" type="button" data-pf-modifier>${icon('pen', 'icon-sm')}Modifier</button>` : `<button class="btn btn-sm btn-primary" type="button" data-pf-suivre>${icon('plus', 'icon-sm')}Suivre</button>`;
  }

  /* Progression privée ------------------------------------------------------ */

  function renderProgression() {
    const el = $('[data-pf-progression]');
    el.hidden = !C.prive;
    if (!C.prive) { el.innerHTML = ''; return; }
    const n = N();
    const k = cleNiveau();
    const pts = total();
    const niveaux = ORDRE_NIVEAUX.map(cle => ({ cle, ...E.NIVEAUX[cle] }));
    const i = ORDRE_NIVEAUX.indexOf(k);
    const suivant = niveaux[i + 1];
    const avance = suivant ? (pts - niveaux[i].seuil) / (suivant.seuil - niveaux[i].seuil) : 1;
    const position = suivant ? (i + Math.min(1, Math.max(0, avance))) / (niveaux.length - 1) : 1;
    const derniere = n.gains[n.gains.length - 1];
    const detail = n.detail;
    const parSource = P.sources.map((nom, s) => ({ nom, s, pts: detail.filter(d => d.source === s).reduce((a, d) => a + d.n * d.pts, 0) }));
    const somme = parSource.reduce((a, x) => a + x.pts, 0) || 1;
    const role = E.get().role;
    const sansLimite = role !== 'membre' || ['expert', 'maitre'].includes(k);
    const utilise = P.utilise[k] || [0, 0, 0];
    const limites = [['Créations', utilise[0], E.limite('creations')], ['Sujets', utilise[1], E.limite('sujets')], ['Réponses et commentaires', utilise[2], E.limite('reponses')]];
    const a = n.apprentissage;
    const deverrouille = {
      curieux: 'Au niveau Apprenti, vous publiez jusqu’à 10 créations et 10 sujets par jour, et vos signalements comptent pour le masquage automatique.',
      apprenti: `Au niveau Expert, à ${fmt(E.NIVEAUX.expert.seuil)} points, vous publiez sans limite et vous pouvez proposer des cas Bon réflexe.`,
      artisan: `Au niveau Expert, à ${fmt(E.NIVEAUX.expert.seuil)} points, vous publiez sans limite et vous pouvez proposer des cas Bon réflexe.`,
      expert: 'Vous publiez sans limite et vous pouvez proposer des cas Bon réflexe. Le niveau Maître est le plus élevé de Vysora.',
      maitre: 'Vous avez atteint le niveau le plus élevé de Vysora.'
    }[k];

    el.innerHTML = `<div class="pf-prive">
      ${enTete('pf-t-progression', 'Visible par vous uniquement', 'lock', 'Votre progression', '', `<a class="link-arrow" href="classements.html">Voir les classements${icon('arrow', 'icon-sm')}</a>`)}
      <div class="pf-prog-grille">
        <div class="pf-prog-main">
          <div class="pf-rep">
            <p class="pf-rep-total"><span class="pf-rep-valeur" data-pf-compter="${pts}">${fmt(pts)}</span><span>points de réputation</span></p>
            <p class="pf-rep-semaine">${icon('trend-up', 'icon-sm')}<b>${t(`+${fmt(derniere)}`)}</b> cette semaine</p>
          </div>
          <div class="pf-courbe" data-pf-courbe tabindex="0" role="group" aria-roledescription="graphique" aria-label="${t(`Réputation par semaine, ${n.gains.length} dernières semaines. Utilisez les flèches pour parcourir les semaines.`)}" aria-describedby="pf-courbe-table">
            <svg class="pf-courbe-svg" data-pf-svg aria-hidden="true"></svg>
            <div class="pf-bulle" data-pf-bulle hidden></div>
          </div>
          <p class="sr-only" aria-live="polite" data-pf-courbe-annonce></p>
          <table class="sr-only" id="pf-courbe-table"><caption>Réputation à la fin de chaque semaine</caption><thead><tr><th scope="col">Semaine du</th><th scope="col">Points</th><th scope="col">Gagnés</th></tr></thead><tbody>${serie().map(p => `<tr><th scope="row">${t(V.dateLabel(p.semaine))}</th><td>${fmt(p.valeur)}</td><td>+${fmt(p.gain)}</td></tr>`).join('')}</tbody></table>

          <div class="pf-sources">
            <h3>D’où viennent vos points</h3>
            <div class="pf-barre" aria-hidden="true">${parSource.filter(x => x.pts > 0).map(x => `<i style="--w:${x.pts / somme};--c:${COULEURS[x.s]}" data-pf-source="${x.s}"></i>`).join('')}</div>
            <ul class="pf-legende">${parSource.map(x => `<li data-pf-source="${x.s}"><span class="pf-puce" style="--c:${COULEURS[x.s]}" aria-hidden="true"></span><span>${t(x.nom)}</span><b>${fmt(x.pts)}</b><small>${pct(x.pts, somme)} %</small></li>`).join('')}</ul>
            <details class="pf-detail">
              <summary>${icon('chevron-down', 'icon-sm')}Détail des points</summary>
              <ul>${detail.map(d => `<li><span class="pf-puce" style="--c:${COULEURS[d.source]}" aria-hidden="true"></span><span>${t(d.motif)}${d.n > 1 ? ` <small>× ${fmt(d.n)}</small>` : ''}</span><b>+${fmt(d.n * d.pts)}</b></li>`).join('')}</ul>
            </details>
          </div>
        </div>

        <div class="pf-prog-cote">
          <div class="pf-bloc">
            <h3>Niveau</h3>
            <ol class="pf-paliers" style="--p:${position}" aria-label="Niveaux de réputation">
              ${niveaux.map((l, j) => `<li class="${j < i ? 'is-passe' : j === i ? 'is-actuel' : ''}"${j === i ? ' aria-current="step"' : ''}>${hexagone()}<b>${t(l.nom)}</b><small>${fmt(l.seuil)}</small></li>`).join('')}
            </ol>
            <p class="pf-palier-texte">${suivant ? `<b>${t(`${fmt(suivant.seuil - pts)} points avant ${suivant.nom}`)}</b>` : `<b>${t(`${niv().nom}, niveau le plus élevé`)}</b>`}<span>${t(deverrouille)}</span></p>
          </div>
          <div class="pf-bloc">
            <h3>Apprentissage</h3>
            <dl class="pf-appr">
              <div><dt>Cas Bon réflexe répondus</dt><dd>${fmt(a.repondus)}</dd></div>
              <div><dt>Cas réussis</dt><dd>${fmt(a.reussis)} <small>${pct(a.reussis, a.repondus)} %</small></dd></div>
              <div><dt>Reproductions déclarées</dt><dd>${fmt(a.essais)}</dd></div>
            </dl>
            <a class="link-arrow" href="apprendre.html?rubrique=bon-reflexe">Répondre à un cas${icon('arrow', 'icon-sm')}</a>
          </div>
          <div class="pf-bloc">
            <h3>Publication sur 24 heures</h3>
            ${sansLimite
              ? `<p class="pf-sans-limite">${icon('check-circle', 'icon-sm')}${role === 'admin' ? 'Aucune limite pour l’administration.' : role === 'moderateur' ? 'Aucune limite pour la modération.' : 'Aucune limite à votre niveau.'}</p>`
              : `<ul class="pf-limites">${limites.map(([label, u, max]) => `<li><span>${t(label)}</span><b>${t(`${fmt(u)} sur ${fmt(max)}`)}</b><span class="pf-jauge" role="img" aria-label="${t(`${label} : ${u} sur ${max}`)}"><i style="--v:${u / max}"></i></span></li>`).join('')}</ul>`}
          </div>
        </div>
      </div>
    </div>`;
    dessinerCourbe(false);
  }

  /* Courbe de réputation : fin de chaque semaine, semaine en cours en pointillé. */
  function serie() {
    const n = N();
    const gains = n.gains;
    const semaines = P.semaines.slice(-gains.length);
    let cumul = total() - gains.reduce((a, g) => a + g, 0);
    return gains.map((g, i) => { cumul += g; return { semaine: semaines[i], valeur: cumul, gain: g, i }; });
  }
  const arrondiHaut = v => { const pas = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000]; const brut = v / 4; const p = pas.find(x => x >= brut) || 5000; return { max: Math.ceil(v / p) * p, pas: p }; };
  let courbeEtat = null;

  function dessinerCourbe(animer) {
    const zone = $('[data-pf-courbe]');
    if (!zone) return;
    const svg = $('[data-pf-svg]', zone);
    const pts = serie();
    const largeur = Math.max(280, zone.clientWidth);
    const hauteur = largeur < 520 ? 200 : 232;
    const m = { g: 46, d: 18, h: 26, b: 30 };
    const niveaux = ORDRE_NIVEAUX.map(k => E.NIVEAUX[k]);
    const suivant = niveaux.find(l => l.seuil > total());
    const plafond = Math.max(...pts.map(p => p.valeur), suivant ? suivant.seuil : 0) * 1.06;
    const { max, pas } = arrondiHaut(plafond);
    const lw = largeur - m.g - m.d;
    const lh = hauteur - m.h - m.b;
    const x = i => m.g + (pts.length === 1 ? lw / 2 : (i * lw) / (pts.length - 1));
    const y = v => m.h + lh - (v / max) * lh;
    const graduations = [];
    for (let v = 0; v <= max; v += pas) graduations.push(v);
    const compact = v => (v >= 1000 ? `${fmt(Math.round(v / 100) / 10).replace(/,0$/, '')} k` : fmt(v));
    const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valeur).toFixed(1)}`).join(' ');
    const pleine = pts.length > 1 ? pts.slice(0, -1).map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valeur).toFixed(1)}`).join(' ') : '';
    const cours = pts.length > 1 ? `M${x(pts.length - 2).toFixed(1)} ${y(pts[pts.length - 2].valeur).toFixed(1)} L${x(pts.length - 1).toFixed(1)} ${y(pts[pts.length - 1].valeur).toFixed(1)}` : '';
    const aire = pts.length > 1 ? `${ligne} L${x(pts.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : '';
    const passages = [];
    let avant = pts.length ? pts[0].valeur - pts[0].gain : 0;
    pts.forEach((p, i) => { niveaux.forEach(l => { if (l.seuil > 0 && avant < l.seuil && p.valeur >= l.seuil) passages.push({ i, nom: l.nom }); }); avant = p.valeur; });
    /* Dates de l'axe : en partant de la semaine en cours, une étiquette n'est gardée que si elle ne touche pas la précédente. */
    const libelleX = (p, i) => (i === pts.length - 1 ? 'Cette semaine' : V.dateLabel(p.semaine, false));
    const ancreX = i => (pts.length > 1 && i === 0 ? 'start' : pts.length > 1 && i === pts.length - 1 ? 'end' : 'middle');
    const gardees = new Set();
    let bordGauche = Infinity;
    for (let i = pts.length - 1; i >= 0; i -= 1) {
      const w = libelleX(pts[i], i).length * 6.4;
      const debut = ancreX(i) === 'end' ? x(i) - w : ancreX(i) === 'start' ? x(i) : x(i) - w / 2;
      if (debut + w + 14 <= bordGauche) { gardees.add(i); bordGauche = debut; }
    }

    svg.setAttribute('viewBox', `0 0 ${largeur} ${hauteur}`);
    svg.setAttribute('width', largeur);
    svg.setAttribute('height', hauteur);
    svg.innerHTML = `
      <g class="pf-c-grille">${graduations.map(v => `<line x1="${m.g}" x2="${largeur - m.d}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.g - 10}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`).join('')}</g>
      ${suivant ? `<g class="pf-c-seuil"><line x1="${m.g}" x2="${largeur - m.d}" y1="${y(suivant.seuil)}" y2="${y(suivant.seuil)}"/><text x="${largeur - m.d}" y="${y(suivant.seuil) - 7}" text-anchor="end">${esc(`${suivant.nom} · ${fmt(suivant.seuil)} points`)}</text></g>` : ''}
      <g class="pf-c-x">${pts.map((p, i) => (gardees.has(i) ? `<text x="${x(i)}" y="${hauteur - 8}" text-anchor="${ancreX(i)}">${esc(libelleX(p, i))}</text>` : '')).join('')}</g>
      ${aire ? `<path class="pf-c-aire" d="${aire}"/>` : ''}
      ${pleine ? `<path class="pf-c-ligne" d="${pleine}" pathLength="1"/>` : ''}
      ${cours ? `<path class="pf-c-cours" d="${cours}"/>` : ''}
      <g class="pf-c-points">${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.valeur)}" r="${i === pts.length - 1 ? 5 : 3.5}" style="--i:${i}"/>`).join('')}</g>
      <g class="pf-c-passages">${passages.map(p => `<g style="--i:${p.i}"><circle cx="${x(p.i)}" cy="${y(pts[p.i].valeur)}" r="7"/><text x="${x(p.i)}" y="${y(pts[p.i].valeur) - 14}" text-anchor="${p.i === 0 ? 'start' : 'middle'}">${esc(p.nom)}</text></g>`).join('')}</g>
      <line class="pf-c-reticule" data-pf-reticule x1="0" x2="0" y1="${m.h - 6}" y2="${m.h + lh}" visibility="hidden"/>
      <circle class="pf-c-focus" data-pf-focus r="6" cx="0" cy="0" visibility="hidden"/>`;
    courbeEtat = { pts, x, y, largeur, actif: null };
    if (animer && V.motion.full()) {
      zone.classList.add('is-anime');
      zone.classList.remove('is-trace');
      requestAnimationFrame(() => requestAnimationFrame(() => zone.classList.add('is-trace')));
    } else {
      zone.classList.remove('is-anime');
      zone.classList.add('is-trace');
    }
  }

  function montrerPoint(i, annoncer = false) {
    const zone = $('[data-pf-courbe]');
    if (!zone || !courbeEtat) return;
    const { pts, x, y, largeur } = courbeEtat;
    const p = pts[i];
    if (!p) return;
    courbeEtat.actif = i;
    const reticule = $('[data-pf-reticule]', zone);
    const focus = $('[data-pf-focus]', zone);
    reticule.setAttribute('x1', x(i)); reticule.setAttribute('x2', x(i)); reticule.setAttribute('visibility', 'visible');
    focus.setAttribute('cx', x(i)); focus.setAttribute('cy', y(p.valeur)); focus.setAttribute('visibility', 'visible');
    const bulle = $('[data-pf-bulle]', zone);
    const enCours = i === pts.length - 1;
    bulle.innerHTML = `<b>${t(`${fmt(p.valeur)} points`)}</b><span>${t(`+${fmt(p.gain)} ${enCours ? 'cette semaine, en cours' : 'cette semaine-là'}`)}</span><small>${t(`Semaine du ${V.dateLabel(p.semaine)}`)}</small>`;
    bulle.hidden = false;
    const ratio = zone.clientWidth / largeur;
    const gauche = x(i) * ratio;
    const w = bulle.offsetWidth;
    bulle.style.left = `${Math.min(Math.max(gauche - w / 2, 0), zone.clientWidth - w)}px`;
    bulle.style.top = `${Math.max(0, y(p.valeur) * ratio - bulle.offsetHeight - 16)}px`;
    if (annoncer) $('[data-pf-courbe-annonce]').textContent = typo(`Semaine du ${V.dateLabel(p.semaine)} : ${fmt(p.valeur)} points, +${fmt(p.gain)}.`);
  }
  function cacherPoint() {
    const zone = $('[data-pf-courbe]');
    if (!zone) return;
    $('[data-pf-reticule]', zone)?.setAttribute('visibility', 'hidden');
    $('[data-pf-focus]', zone)?.setAttribute('visibility', 'hidden');
    $('[data-pf-bulle]', zone).hidden = true;
  }

  /* Créations --------------------------------------------------------------- */

  /* La vignette textuelle reprend un prompt affiché en entier dans le chemin parcouru : elle reste décorative. */
  const texteHTML = (c, longueur) => `<div class="pf-tv" aria-hidden="true">
      ${c.media.outil ? `<p class="pf-tv-outil">${V.logo(c.media.outil, 18)}${t(c.media.outil)}</p>` : ''}
      <p class="pf-tv-texte">${t(extrait(c.media.texte, longueur))}</p>
    </div>`;
  function mediaHTML(c) {
    if (c.media.kind === 'image') return `<img src="assets/images/${c.media.name}-720.webp" alt="" width="720" height="${c.media.portrait ? 1080 : 540}" loading="lazy" decoding="async"${c.media.portrait ? ' class="is-portrait"' : ''}>`;
    if (c.media.kind === 'texte') return texteHTML(c, 220);
    return `<div class="mock" aria-hidden="true">${V.mockHTML(c.media.mock)}</div>`;
  }
  const statsCreation = c => `<ul class="pf-c-stats">
      <li title="Votes « Utile »">${icon('utile', 'icon-sm')}${fmt(c.utile)}<span class="sr-only"> votes « Utile »</span></li>
      ${c.type !== 'projet' ? `<li title="Reproductions">${icon('repeat', 'icon-sm')}${fmt(c.essais)}<span class="sr-only"> reproductions</span></li>` : ''}
      ${c.type !== 'projet' && c.essais >= 3 ? `<li class="pf-succes">${t(`${pct(c.reussis, c.essais)} % de succès`)}</li>` : ''}
      <li title="Moments clés">${icon('moment', 'icon-sm')}${fmt(c.moments)}<span class="sr-only"> moments clés</span></li>
    </ul>`;

  function renderCreations() {
    const el = $('[data-pf-creations]');
    const toutes = creationsPubliees();
    const s = stats();
    const types = [...new Set(toutes.map(c => c.type))];
    if (!types.includes(ui.typeCreations)) ui.typeCreations = 'toutes';
    let liste = toutes.filter(c => ui.typeCreations === 'toutes' || c.type === ui.typeCreations);
    liste = liste.slice().sort(ui.triCreations === 'utiles' ? (a, b) => b.utile - a.utile || b.publie.localeCompare(a.publie) : (a, b) => b.publie.localeCompare(a.publie));
    const visibles = ui.creationsCompletes ? liste : liste.slice(0, CREATIONS_VISIBLES);
    const controles = toutes.length > 1 ? `<div class="pf-filtres" role="group" aria-label="Filtrer par type">${[['toutes', 'Toutes'], ...types.map(ty => [ty, V.TYPE_LABEL[ty]])].map(([v, l]) => `<button type="button" data-pf-type="${v}" aria-pressed="${ui.typeCreations === v}">${v === 'toutes' ? '' : icon(`type-${v}`, 'icon-sm')}${t(l)}</button>`).join('')}</div>
      <label class="pf-tri"><span class="sr-only">Trier les créations</span><select data-pf-tri><option value="recentes"${ui.triCreations === 'recentes' ? ' selected' : ''}>Les plus récentes</option><option value="utiles"${ui.triCreations === 'utiles' ? ' selected' : ''}>Les plus utiles</option></select>${icon('chevron-down', 'icon-sm')}</label>` : '';
    const enCours = C.prive ? brouillonsEnCours() : [];
    const dernier = enCours[0];
    const brouillon = dernier ? `<a class="pf-brouillon" href="nouvelle-creation.html?brouillon=${encodeURIComponent(dernier.id)}">${icon('pen')}<span><b>${enCours.length > 1 ? t(`${fmt(enCours.length)} brouillons vous attendent`) : 'Un brouillon vous attend'}</b><span>${dernier.titre ? t(`Reprenez « ${dernier.titre} » là où vous l’avez laissé.`) : 'Reprenez-le là où vous l’avez laissé.'}</span></span><span class="pf-brouillon-cta">Reprendre${icon('arrow', 'icon-sm')}</span></a>` : '';
    const plus = liste.length > CREATIONS_VISIBLES
      ? `<div class="pf-plus"><button class="btn btn-quiet btn-sm pf-voir-plus" type="button" data-pf-creations-plus aria-expanded="${ui.creationsCompletes}">${ui.creationsCompletes ? 'Afficher moins' : t(`Afficher ${fmt(liste.length - CREATIONS_VISIBLES)} de plus`)}${icon('chevron-down', 'icon-sm')}</button></div>` : '';
    const vide = C.prive
      ? etatVide('Aucune création publiée pour le moment', 'Publiez le résultat obtenu avec l’IA et le chemin parcouru pour y arriver.', '<a class="btn btn-primary" href="nouvelle-creation.html">Publier une création</a>')
      : etatVide(`${prenom()} n’a pas encore publié de création`, '');
    const gerer = C.prive && !C.vide ? `<a class="link-arrow" href="mes-contenus.html?onglet=publies">Gérer vos créations${icon('arrow', 'icon-sm')}</a>` : '';

    el.innerHTML = `${enTete('pf-t-creations', 'Créations', 'layers', 'Créations publiées', toutes.length ? fmt(s.creations) : '', gerer)}
      ${toutes.length ? `<div class="pf-outils-barre">${controles}</div>` : ''}
      ${brouillon}
      ${toutes.length ? `<div class="pf-galerie" data-pf-galerie>${visibles.map(c => `<article class="pf-carte" data-pf-carte="${c.id}">
        <div class="pf-carte-media${c.media.portrait ? ' is-affiche' : ''}${c.media.kind === 'texte' ? ' is-texte' : ''}">${mediaHTML(c)}</div>
        <div class="pf-carte-corps">
          <p class="pf-carte-type">${c.type ? V.typeTag(c.type) : ''}${c.type && c.categorie ? '<span class="pf-sep" aria-hidden="true">·</span>' : ''}${c.categorie ? `<span>${t(c.categorie)}</span>` : ''}</p>
          <h3><button type="button" class="pf-carte-lien" data-pf-ouvrir="${c.id}">${t(c.titre)}</button></h3>
          <p class="pf-carte-outils">${c.outils.map(o => outilHTML(o.outil, o.modeles.join(', '))).join('<span class="pf-sep" aria-hidden="true">+</span>')}</p>
          ${statsCreation(c)}
          <p class="pf-carte-date">Publiée ${t(V.relativeDay(jour(c.publie)))}</p>
        </div>
      </article>`).join('')}</div>${plus}` : vide}`;
  }

  /* Aperçu d'une création ---------------------------------------------------- */

  const extrait = (s, n) => { const v = String(s || '').replace(/\s+/g, ' ').trim(); return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v; };
  function ouvrirCreation(id, origine) {
    const c = creationsPubliees().find(x => x.id === id);
    if (!c) return;
    const dlg = $('[data-pf-vue]');
    ui.vueOrigine = origine || document.activeElement;
    const premierPrompt = c.chemin.find(x => x.kind === 'prompt');
    const etapes = c.chemin.map((x, i) => {
      const moment = x.moment ? `<p class="pf-v-moment">${icon('moment', 'icon-sm')}<b>${t(MOMENTS[x.moment.type] || 'Moment clé')}</b><span>${t(extrait(x.moment.texte, 220))}</span></p>` : '';
      if (x.kind === 'etape') return `<li class="pf-v-etape"><p class="pf-v-etape-titre">${t(x.titre)}</p>${x.texte ? `<p>${t(extrait(x.texte, 180))}</p>` : ''}${moment}</li>`;
      return `<li class="pf-v-prompt"><p class="pf-v-outil">${outilHTML(x.outilAgent || x.outil, x.modele)}</p><p class="pf-v-texte">${t(extrait(x.prompt, 240))}</p>${moment}</li>`;
    }).join('');
    dlg.innerHTML = `<div class="pf-v-barre"><span>${V.typeTag(c.type)}</span><button class="icon-btn" type="button" data-pf-vue-fermer aria-label="Fermer l’aperçu">${icon('close', '')}</button></div>
      <div class="pf-v-corps">
        <div class="pf-v-media${c.media.portrait ? ' is-affiche' : ''}${c.media.kind === 'texte' ? ' is-texte' : ''}">${c.media.kind === 'image' ? `<img src="assets/images/${c.media.name}-1280.webp" alt="${t(c.media.alt)}" width="1280" height="${c.media.portrait ? 1920 : 960}">` : c.media.kind === 'texte' ? texteHTML(c, 480) : `<div class="mock" role="img" aria-label="${t(c.media.alt)}">${V.mockHTML(c.media.mock)}</div>`}</div>
        <div class="pf-v-texte-zone">
          <h2 id="pf-vue-titre">${t(c.titre)}</h2>
          <p class="pf-v-meta">${t([`Publiée le ${V.dateLabel(jour(c.publie))}`, c.categorie, c.licence].filter(Boolean).join(' · '))}</p>
          <p class="pf-v-objectif">${t(c.objectif)}</p>
          ${statsCreation(c)}
          <h3>Le chemin parcouru</h3>
          <ol class="pf-v-chemin">${etapes}</ol>
          ${c.limites ? `<h3>Limites constatées</h3><p class="pf-v-limites">${t(c.limites)}</p>` : ''}
        </div>
      </div>
      <div class="pf-v-pied">
        ${C.prive ? `<a class="btn btn-secondary" href="nouvelle-creation.html?modifier=${encodeURIComponent(c.id)}">${icon('pen')}Modifier la création</a>` : premierPrompt ? `<button class="btn btn-secondary" type="button" data-pf-copier-prompt="${c.id}">${icon('copy')}Copier le prompt</button>` : ''}
        <button class="btn btn-primary" type="button" data-pf-vue-fermer>Fermer</button>
      </div>`;
    dlg.showModal();
    $('.pf-v-corps', dlg).scrollTop = 0;
    $('[data-pf-vue-fermer]', dlg).focus();
  }

  /* Contributions ----------------------------------------------------------- */

  function contributionHTML(x) {
    const date = `<time datetime="${x.at}">${t(V.dateLabel(x.at))}</time>`;
    if (x.kind === 'creation') {
      const c = creationsPubliees().find(y => y.id === x.creation);
      return `<li class="pf-act" data-kind="creation"><span class="pf-act-icone" aria-hidden="true">${icon(`type-${c.type}`)}</span>
        <div class="pf-act-corps"><p class="pf-act-quoi">Création publiée</p>
        <button type="button" class="pf-act-titre" data-pf-ouvrir="${c.id}">${t(c.titre)}</button>
        <p class="pf-act-meta"><span>${t(V.TYPE_LABEL[c.type])}</span><span class="pf-sep" aria-hidden="true">·</span>${outilHTML(c.outils[0].outil)}<span class="pf-sep" aria-hidden="true">·</span>${date}</p></div></li>`;
    }
    if (x.kind === 'reponse') {
      return `<li class="pf-act" data-kind="reponse"><span class="pf-act-icone" aria-hidden="true">${icon(x.acceptee ? 'check-circle' : 'message')}</span>
        <div class="pf-act-corps"><p class="pf-act-quoi">${x.acceptee ? 'Réponse acceptée' : 'Réponse publiée'}</p>
        <a class="pf-act-titre" href="forum.html?sujet=${encodeURIComponent(x.sujet)}">${t(x.titre)}</a>
        <p class="pf-act-meta"><span class="pf-qui">${V.avatar(x.auteur, 20)}Question de ${t(x.auteur)}</span><span class="pf-sep" aria-hidden="true">·</span>${outilHTML(x.outil)}<span class="pf-sep" aria-hidden="true">·</span>${date}</p></div></li>`;
    }
    const [label, ic] = RESULTATS[x.resultat];
    return `<li class="pf-act" data-kind="essai"><span class="pf-act-icone" aria-hidden="true">${icon('repeat')}</span>
      <div class="pf-act-corps"><p class="pf-act-quoi">Reproduction déclarée <span class="pf-resultat" data-resultat="${x.resultat}">${icon(ic, 'icon-sm')}${label}</span></p>
      <a class="pf-act-titre" href="fiche-creation.html?id=${encodeURIComponent(x.fiche)}">${t(x.titre)}</a>
      <p class="pf-act-meta"><span class="pf-qui">${V.avatar(x.auteur, 20)}Création de ${t(x.auteur)}</span><span class="pf-sep" aria-hidden="true">·</span>${outilHTML(x.outil, x.modele)}<span class="pf-sep" aria-hidden="true">·</span>${date}</p></div></li>`;
  }

  function renderContributions() {
    const el = $('[data-pf-contributions]');
    const toutes = contributions();
    const kinds = [['tout', 'Tout'], ['creation', 'Créations'], ['reponse', 'Réponses'], ['essai', 'Reproductions']].filter(([k]) => k === 'tout' || toutes.some(x => x.kind === k));
    if (!kinds.some(([k]) => k === ui.filtreActivite)) ui.filtreActivite = 'tout';
    const liste = toutes.filter(x => ui.filtreActivite === 'tout' || x.kind === ui.filtreActivite);
    const visibles = ui.activiteComplete ? liste : liste.slice(0, 6);
    const vide = C.prive
      ? etatVide('Vos contributions apparaîtront ici', 'Répondez à une question du forum ou reproduisez une création pour commencer.', '<div class="pf-vide-actions"><a class="btn btn-secondary" href="forum.html">Parcourir le forum</a><a class="btn btn-quiet" href="explorer.html">Explorer les créations</a></div>')
      : etatVide('Aucune contribution publique pour le moment', '');
    el.innerHTML = `${enTete('pf-t-contributions', 'Activité', 'history', 'Contributions récentes')}
      ${toutes.length ? `${kinds.length > 2 ? `<div class="pf-filtres" role="group" aria-label="Filtrer les contributions">${kinds.map(([k, l]) => `<button type="button" data-pf-activite="${k}" aria-pressed="${ui.filtreActivite === k}">${t(l)}</button>`).join('')}</div>` : ''}
      <ol class="pf-activite">${visibles.map(contributionHTML).join('')}</ol>
      ${liste.length > 6 ? `<button class="btn btn-quiet btn-sm pf-voir-plus" type="button" data-pf-plus aria-expanded="${ui.activiteComplete}">${ui.activiteComplete ? 'Afficher moins' : t(`Afficher ${liste.length - 6} de plus`)}${icon('chevron-down', 'icon-sm')}</button>` : ''}` : vide}`;
  }

  /* À propos ---------------------------------------------------------------- */

  function renderApropos() {
    const el = $('[data-pf-apropos]');
    const creations = creationsPubliees();
    const outils = [];
    const ajouter = (outil, modele) => { const o = outils.find(x => x.outil === outil); if (!o) outils.push({ outil, modeles: modele ? [modele] : [] }); else if (modele && !o.modeles.includes(modele)) o.modeles.push(modele); };
    creations.forEach(c => c.outils.forEach(o => (o.modeles.length ? o.modeles.forEach(md => ajouter(o.outil, md)) : ajouter(o.outil))));
    contributions().filter(x => x.kind === 'essai').forEach(x => ajouter(x.outil, x.modele));
    const domaines = [...new Set(creations.map(c => c.categorie))];
    el.innerHTML = `<h2 id="pf-t-apropos">À propos</h2>
      <dl class="pf-apropos-liste">
        ${outils.length ? `<div><dt>Outils utilisés</dt><dd><ul class="pf-outils">${outils.map(o => `<li>${V.logo(o.outil, 22)}<span><b>${t(o.outil)}</b>${o.modeles.length ? `<small>${t(o.modeles.join(', '))}</small>` : ''}</span></li>`).join('')}</ul></dd></div>` : ''}
        ${domaines.length ? `<div><dt>Domaines</dt><dd><ul class="pf-domaines">${domaines.map(d => `<li>${icon(CATEGORIES[d] || 'layers', 'icon-sm')}${t(d)}</li>`).join('')}</ul></dd></div>` : ''}
        <div><dt>Membre depuis</dt><dd>${t(dateLongue(N().depuis))}</dd></div>
      </dl>
      ${C.prive ? `<p class="pf-confidentiel">${icon('lock', 'icon-sm')}<span>Votre adresse e-mail et vos statistiques d’apprentissage ne sont jamais visibles des autres membres. <a href="parametres.html">Gérer votre compte</a></span></p>` : ''}`;
  }

  /* Badges ------------------------------------------------------------------ */

  function renderBadges() {
    const el = $('[data-pf-badges]');
    const obtenus = badgesObtenus();
    const avancement = C.prive && !C.vide ? N().avancement : [];
    const vide = C.prive
      ? etatVide('Aucun badge pour le moment', 'Votre premier badge arrive avec une première reproduction déclarée.', '<a class="btn btn-secondary" href="explorer.html">Choisir une création à reproduire</a>')
      : etatVide('Aucun badge pour le moment', '');
    el.innerHTML = `${enTete('pf-t-badges', 'Reconnaissance', 'award', 'Badges', obtenus.length ? fmt(obtenus.length) : '', `<a class="link-arrow" href="classements.html#regles">Comment obtenir un badge${icon('arrow', 'icon-sm')}</a>`)}
      ${obtenus.length ? `<ul class="pf-badges">${obtenus.map(([nom, date], i) => `<li class="pf-badge" tabindex="0" aria-describedby="pf-badge-${i}" style="--i:${i}">${emblem(nom)}<b>${t(nom)}</b><small>${t(`Obtenu le ${V.dateLabel(date, date.slice(0, 4) !== V.D.today.slice(0, 4))}`)}</small><span class="pf-badge-regle" role="tooltip" id="pf-badge-${i}">${t(P.badges[nom].rule)}</span></li>`).join('')}</ul>` : vide}
      ${avancement.length ? `<div class="pf-prochains">
        <h3>${icon('lock', 'icon-sm')}Prochains badges <span>Visible par vous uniquement</span></h3>
        <ul>${avancement.map(([nom, fait, but, unite]) => `<li>${emblem(nom, 'is-verrouille')}<div><b>${t(nom)}</b><p>${t(P.badges[nom].rule)}</p><span class="pf-jauge" role="img" aria-label="${t(`${fait} sur ${but} ${unite}`)}"><i style="--v:${Math.min(1, fait / but)}"></i></span><small>${t(`${fmt(fait)} sur ${fmt(but)} ${unite}`)}</small></div></li>`).join('')}</ul>
      </div>` : ''}`;
  }

  /* Aperçu public ----------------------------------------------------------- */

  function renderApercu() {
    const el = $('[data-pf-apercu-bandeau]');
    el.hidden = !C.apercu;
    el.innerHTML = C.apercu ? `<div class="container pf-apercu-in">${icon('eye')}<p><b>Aperçu public.</b> Voici votre profil tel que les autres membres le voient.</p><button class="btn btn-sm btn-inverse" type="button" data-pf-apercu-off>Revenir à mon profil</button></div>` : '';
  }

  /* Rendu complet ------------------------------------------------------------ */

  function render(options = {}) {
    mc = lireMesContenus();
    C = contexte();
    root.toggleAttribute('data-pf-proprio', C.prive);
    $('[data-pf-introuvable]').hidden = !C.introuvable;
    ['[data-pf-hero]', '[data-pf-chiffres]', '[data-pf-nav]', '[data-pf-corps]'].forEach(s => { $(s).hidden = C.introuvable; });
    document.title = C.introuvable ? 'Profil introuvable · Vysora' : C.prive ? 'Mon profil · Vysora' : `${E.MOI.nom} · Vysora`;
    if (C.introuvable) { $('[data-pf-apercu-bandeau]').hidden = true; return; }
    renderApercu();
    renderHero();
    renderChiffres();
    renderNav();
    placerProgression();
    renderProgression();
    renderCreations();
    renderContributions();
    renderApropos();
    renderBadges();
    V.fixTypography($('main'));
    if (!options.animer) $$('[data-pf-compter]').forEach(el => ui.compteurs.add(el));
    else if (V.motion.full()) $$('[data-pf-compter]').forEach(el => { el.textContent = '0'; });
    observer();
  }
  function placerProgression() {
    const corps = $('[data-pf-corps]');
    const prog = $('[data-pf-progression]');
    if (settings.prive === 'bas') corps.appendChild(prog);
    else if (corps.firstElementChild !== prog) corps.prepend(prog);
    const ancres = $('[data-pf-ancres]');
    const lienProg = $('a[href="#progression"]', ancres);
    if (lienProg && settings.prive === 'bas') ancres.appendChild(lienProg);
  }

  /* Animations : apparitions, compteurs, défilement --------------------------- */

  let io;
  function observer() {
    if (!('IntersectionObserver' in window)) { $$('.pf-reveal').forEach(el => el.classList.add('is-in')); $$('[data-pf-compter]').forEach(compter); return; }
    io?.disconnect();
    io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      $$('[data-pf-compter]', entry.target).forEach(compter);
      if (entry.target.matches('[data-pf-progression]') && !entry.target.dataset.trace) { entry.target.dataset.trace = '1'; dessinerCourbe(true); }
      io.unobserve(entry.target);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('.pf-reveal:not(.is-in), [data-pf-chiffres]').forEach(el => io.observe(el));
  }
  function compter(el) {
    if (ui.compteurs.has(el)) return;
    ui.compteurs.add(el);
    const fin = Number(el.dataset.pfCompter) || 0;
    if (!V.motion.full() || fin < 2) { el.textContent = fmt(fin); return; }
    const debut = performance.now();
    const duree = 900 + Math.min(500, fin / 40);
    const pas = now => {
      const k = Math.min(1, (now - debut) / duree);
      el.textContent = fmt(Math.round(fin * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(pas);
    };
    el.textContent = '0';
    requestAnimationFrame(pas);
  }

  let espion, heros;
  function suivreSections() {
    if (!('IntersectionObserver' in window) || C.introuvable) return;
    espion?.disconnect();
    heros?.disconnect();
    espion = new IntersectionObserver(entries => {
      const actif = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!actif) return;
      $$('[data-pf-ancres] a').forEach(a => { if (a.hash === `#${actif.target.id}`) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-20% 0px -60% 0px' });
    $$('#progression, #creations, #contributions, #badges').forEach(el => { if (!el.hidden) espion.observe(el); });
    heros = new IntersectionObserver(([e]) => $('[data-pf-nav]').classList.toggle('has-qui', !e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: `-${parseInt(getComputedStyle(root).getPropertyValue('--header-h'), 10) || 72}px 0px 0px 0px` });
    heros.observe($('[data-pf-hero] h1') || $('[data-pf-hero]'));
  }

  /* Modification du profil ----------------------------------------------------- */

  const tiroir = $('[data-pf-tiroir]');
  const form = $('[data-pf-form]');
  const champBio = $('[data-pf-bio]');
  const champLien = $('[data-pf-lien]');
  const fichier = $('[data-pf-fichier]');
  let brouillon = null;
  let origine = null;
  let origineCle = '';

  const etatForm = () => ({ photo: brouillon.photo, bio: champBio.value.trim(), lien: champLien.value.trim() });
  const modifie = () => { const f = etatForm(); return f.photo !== photo() || f.bio !== bio() || normaliserLien(f.lien) !== lien(); };
  function apercuPhoto() {
    $('[data-pf-photo-apercu]').innerHTML = brouillon.photo ? `<img src="${brouillon.photo}" alt="Nouvelle photo de profil" width="88" height="88">` : `<span class="pf-photo pf-photo-defaut" aria-hidden="true">${icon('user', '')}</span>`;
    $('[data-pf-retirer]').hidden = !brouillon.photo;
    $('[data-pf-fichier-libelle]').textContent = brouillon.photo ? 'Changer de photo' : 'Importer une photo';
  }
  const majCompte = () => { $('[data-pf-compte]').textContent = typo(`${fmt(champBio.value.length)} sur 500`); $('[data-pf-compte]').classList.toggle('is-proche', champBio.value.length > 450); };
  function erreur(cible, message) {
    const el = cible === 'photo' ? $('[data-pf-erreur-photo]') : $('[data-pf-erreur-lien]');
    el.textContent = message ? typo(message) : '';
    el.hidden = !message;
    if (cible === 'lien') champLien.setAttribute('aria-invalid', String(!!message));
  }
  function normaliserLien(v) {
    const s = v.trim();
    if (!s) return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  }
  function verifierLien() {
    const v = normaliserLien(champLien.value);
    if (!v) { erreur('lien', ''); return true; }
    let url;
    try { url = new URL(v); } catch { url = null; }
    if (!url || !url.hostname.includes('.')) { erreur('lien', 'Cette adresse est incomplète. Exemple : https://monsite.fr'); return false; }
    if (url.protocol !== 'https:') { erreur('lien', 'Utilisez une adresse sécurisée, en https.'); return false; }
    erreur('lien', '');
    return true;
  }

  function ouvrirEdition(cible = '') {
    if (!C.prive) return;
    if (!V.exiger('contribuer', 'modifier votre profil')) return;
    origine = document.activeElement;
    origineCle = origine?.dataset?.pfModifier ?? '';
    brouillon = { photo: photo() };
    champBio.value = bio();
    champLien.value = lien();
    $('[data-pf-pseudo-fixe]').textContent = `@${C.pseudo}`;
    erreur('photo', ''); erreur('lien', '');
    $('[data-pf-abandon]').hidden = true;
    $('[data-pf-pied-actions]').hidden = false;
    apercuPhoto();
    majCompte();
    tiroir.showModal();
    const focus = { photo: fichier, bio: champBio, lien: champLien }[cible] || champBio;
    focus.focus();
    if (focus === champBio) champBio.setSelectionRange(champBio.value.length, champBio.value.length);
  }
  function fermerEdition() {
    tiroir.close();
    const cible = origine && document.contains(origine) ? origine : $(`[data-pf-modifier="${origineCle}"]`) || $('[data-pf-modifier=""]');
    cible?.focus();
  }
  function demanderFermeture() {
    if (!modifie()) { fermerEdition(); return; }
    $('[data-pf-abandon]').hidden = false;
    $('[data-pf-pied-actions]').hidden = true;
    $('[data-pf-continuer]').focus();
  }

  fichier.addEventListener('change', () => {
    const f = fichier.files[0];
    fichier.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { erreur('photo', 'Ce format n’est pas pris en charge. Choisissez une image JPG, PNG ou WebP.'); return; }
    if (f.size > 5 * 1024 * 1024) { erreur('photo', 'Cette image dépasse 5 Mo. Choisissez une image plus légère.'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const cote = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 320;
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - cote) / 2, (img.naturalHeight - cote) / 2, cote, cote, 0, 0, 320, 320);
      let data = canvas.toDataURL('image/webp', 0.86);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.88);
      URL.revokeObjectURL(url);
      brouillon.photo = data;
      erreur('photo', '');
      apercuPhoto();
      $('[data-pf-photo-apercu]').classList.remove('is-nouveau');
      void $('[data-pf-photo-apercu]').offsetWidth;
      $('[data-pf-photo-apercu]').classList.add('is-nouveau');
    };
    img.onerror = () => { URL.revokeObjectURL(url); erreur('photo', 'Cette image ne peut pas être lue. Essayez avec un autre fichier.'); };
    img.src = url;
  });
  $('[data-pf-retirer]').addEventListener('click', () => { brouillon.photo = ''; apercuPhoto(); fichier.focus(); });
  champBio.addEventListener('input', majCompte);
  champLien.addEventListener('blur', () => { if (champLien.value.trim()) { champLien.value = normaliserLien(champLien.value); verifierLien(); } });
  champLien.addEventListener('input', () => { if (champLien.getAttribute('aria-invalid') === 'true') verifierLien(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!verifierLien()) { champLien.focus(); return; }
    const f = etatForm();
    const avant = { photo: photo(), bio: bio(), lien: lien() };
    edits = { ...edits, bio: f.bio.replace(/\n{3,}/g, '\n\n'), lien: normaliserLien(f.lien) };
    if (f.photo) edits.photo = f.photo; else delete edits.photo;
    ecrireEdits();
    fermerEdition();
    render();
    V.rendreCompte();
    suivreSections();
    const change = [avant.photo !== photo() && 'photo', avant.bio !== bio() && 'bio', avant.lien !== lien() && 'lien'].filter(Boolean);
    V.toast(change.length ? 'Profil mis à jour.' : 'Aucune modification à enregistrer.', change.length ? 'check' : 'pen');
    if (V.motion.level() !== 'none') {
      const zones = change.map(z => (z === 'photo' ? $('.pf-photo-hero') : $(`[data-pf-zone="${z}"]`))).filter(Boolean);
      zones.forEach(z => { z.classList.remove('pf-flash'); void z.offsetWidth; z.classList.add('pf-flash'); });
    }
    ($(`[data-pf-modifier="${origineCle}"]`) || $('[data-pf-modifier=""]'))?.focus();
  });
  $$('[data-pf-annuler]', tiroir).forEach(b => b.addEventListener('click', demanderFermeture));
  $('[data-pf-continuer]').addEventListener('click', () => { $('[data-pf-abandon]').hidden = true; $('[data-pf-pied-actions]').hidden = false; champBio.focus(); });
  $('[data-pf-abandonner]').addEventListener('click', fermerEdition);
  tiroir.addEventListener('cancel', event => { event.preventDefault(); demanderFermeture(); });
  tiroir.addEventListener('click', event => { if (event.target === tiroir) demanderFermeture(); });

  /* Partage et copie --------------------------------------------------------- */

  async function copier(texte, message) {
    try { await navigator.clipboard.writeText(texte); }
    catch {
      const zone = document.createElement('textarea');
      zone.value = texte; zone.setAttribute('readonly', ''); zone.style.position = 'fixed'; zone.style.opacity = '0';
      document.body.appendChild(zone); zone.select();
      try { document.execCommand('copy'); } catch { /* copie indisponible */ }
      zone.remove();
    }
    V.toast(message, 'copy');
  }
  async function partager() {
    const url = `${location.origin}${location.pathname}?pseudo=${encodeURIComponent(C.pseudo)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: `${E.MOI.nom} sur Vysora`, url }); return; } catch { /* partage annulé : copie du lien */ }
    }
    copier(url, 'Lien du profil copié.');
  }

  /* Événements ---------------------------------------------------------------- */

  document.addEventListener('click', event => {
    const cible = event.target.closest('[data-pf-modifier], [data-pf-apercu-on], [data-pf-apercu-off], [data-pf-partager], [data-pf-suivre], [data-pf-signaler], [data-pf-type], [data-pf-activite], [data-pf-plus], [data-pf-creations-plus], [data-pf-ouvrir], [data-pf-vue-fermer], [data-pf-copier-prompt], [data-pf-guide-masquer]');
    if (!cible) return;
    const d = cible.dataset;
    if ('pfModifier' in d) { ouvrirEdition(d.pfModifier); return; }
    if ('pfApercuOn' in d) { V.regler('vue', 'public'); window.scrollTo({ top: 0, behavior: V.motion.full() ? 'smooth' : 'auto' }); $('[data-pf-apercu-off]')?.focus(); return; }
    if ('pfApercuOff' in d) { V.regler('vue', 'proprietaire'); $('[data-pf-apercu-on]')?.focus(); return; }
    if ('pfPartager' in d) { partager(); return; }
    if ('pfSuivre' in d) { if (C.apercu) return; if (V.exiger('contribuer', `suivre ${E.MOI.nom}`)) V.toast(`Vous suivez ${E.MOI.nom}.`); return; }
    if ('pfSignaler' in d) { if (V.exiger('contribuer', 'signaler ce profil')) V.toast('Signalement envoyé à la modération.', 'flag'); return; }
    if ('pfCreationsPlus' in d) {
      ui.creationsCompletes = !ui.creationsCompletes;
      renderCreations(); V.fixTypography($('[data-pf-creations]'));
      if (ui.creationsCompletes) animerGalerie(CREATIONS_VISIBLES);
      $('[data-pf-creations-plus]')?.focus();
      return;
    }
    if ('pfType' in d) { ui.typeCreations = d.pfType; ui.creationsCompletes = false; renderCreations(); V.fixTypography($('[data-pf-creations]')); animerGalerie(); $(`[data-pf-type="${d.pfType}"]`)?.focus(); return; }
    if ('pfActivite' in d) { ui.filtreActivite = d.pfActivite; ui.activiteComplete = false; renderContributions(); V.fixTypography($('[data-pf-contributions]')); $(`[data-pf-activite="${d.pfActivite}"]`)?.focus(); return; }
    if ('pfPlus' in d) { ui.activiteComplete = !ui.activiteComplete; renderContributions(); V.fixTypography($('[data-pf-contributions]')); $('[data-pf-plus]')?.focus(); return; }
    if ('pfOuvrir' in d) { ouvrirCreation(d.pfOuvrir, cible); return; }
    if ('pfVueFermer' in d) { $('[data-pf-vue]').close(); return; }
    if ('pfCopierPrompt' in d) { const c = creationsPubliees().find(x => x.id === d.pfCopierPrompt); const p = c?.chemin.find(x => x.kind === 'prompt'); if (p) copier(p.prompt, 'Prompt copié.'); return; }
    if ('pfGuideMasquer' in d) { edits.guideMasque = true; ecrireEdits(); renderHero(); V.fixTypography($('[data-pf-hero]')); $('[data-pf-modifier=""]')?.focus(); V.toast('Étapes masquées.'); }
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-pf-tri]')) return;
    ui.triCreations = event.target.value;
    renderCreations(); V.fixTypography($('[data-pf-creations]')); animerGalerie();
    $('[data-pf-tri]')?.focus();
  });
  function animerGalerie(depuis = 0) {
    if (!V.motion.full()) return;
    $$('.pf-carte').slice(depuis).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: Math.min(i, 8) * 50, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)', fill: 'backwards' }));
  }
  const vue = $('[data-pf-vue]');
  vue.addEventListener('click', event => { if (event.target === vue) vue.close(); });
  vue.addEventListener('close', () => { const o = ui.vueOrigine; if (o && document.contains(o)) o.focus(); });

  /* Courbe : réticule au survol, flèches au clavier. */
  document.addEventListener('pointermove', event => {
    const zone = event.target.closest?.('[data-pf-courbe]');
    if (!zone || !courbeEtat) return;
    const rect = zone.getBoundingClientRect();
    const xSvg = ((event.clientX - rect.left) / rect.width) * courbeEtat.largeur;
    let proche = 0;
    courbeEtat.pts.forEach((p, i) => { if (Math.abs(courbeEtat.x(i) - xSvg) < Math.abs(courbeEtat.x(proche) - xSvg)) proche = i; });
    montrerPoint(proche);
  });
  document.addEventListener('pointerout', event => {
    const zone = event.target.closest?.('[data-pf-courbe]');
    if (zone && !zone.contains(event.relatedTarget) && document.activeElement !== zone) cacherPoint();
  });
  document.addEventListener('focusin', event => { if (event.target.matches?.('[data-pf-courbe]') && courbeEtat) montrerPoint(courbeEtat.actif ?? courbeEtat.pts.length - 1, true); });
  document.addEventListener('focusout', event => { if (event.target.matches?.('[data-pf-courbe]')) cacherPoint(); });
  document.addEventListener('keydown', event => {
    if (!event.target.matches?.('[data-pf-courbe]') || !courbeEtat) return;
    const n = courbeEtat.pts.length;
    const i = courbeEtat.actif ?? n - 1;
    const suivant = { ArrowLeft: Math.max(0, i - 1), ArrowRight: Math.min(n - 1, i + 1), Home: 0, End: n - 1 }[event.key];
    if (suivant === undefined) return;
    event.preventDefault();
    montrerPoint(suivant, true);
  });
  document.addEventListener('pointerover', event => {
    const s = event.target.closest?.('[data-pf-source]');
    $$('.pf-sources [data-pf-source]').forEach(el => el.classList.toggle('is-attenue', !!s && el.dataset.pfSource !== s.dataset.pfSource));
  });

  let largeurCourbe = 0;
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      const zone = $('[data-pf-courbe]');
      if (!zone || zone.clientWidth === largeurCourbe) return;
      largeurCourbe = zone.clientWidth;
      dessinerCourbe(false);
    }).observe($('[data-pf-corps]'));
  }

  /* Réglages ------------------------------------------------------------------ */

  const estMembre = e => e.session === 'membre';
  V.initTweaks({
    key: 'vysora-profil-reglages',
    etats: [
      { name: 'vue', legend: 'Point de vue', options: [['proprietaire', 'Vous'], ['public', 'Aperçu public']], si: estMembre },
      { name: 'contenu', legend: 'Contenus publics', options: [['publies', 'Publiés'], ['vide', 'Aucun pour l’instant']] },
      { name: 'profil', legend: 'Profil', options: [['disponible', 'Disponible'], ['introuvable', 'Introuvable']] }
    ],
    apparence: [
      { name: 'entete', legend: 'En-tête du profil', options: [['aligne', 'Aligné'], ['centre', 'Centré'], ['bandeau', 'Bandeau']] },
      { name: 'chiffres', legend: 'Statistiques', options: [['bande', 'Bande'], ['filets', 'Filets']] },
      { name: 'galerie', legend: 'Créations', options: [['mosaique', 'Mosaïque'], ['liste', 'Liste']] },
      { name: 'prive', legend: 'Progression privée', options: [['haut', 'En premier'], ['bas', 'En dernier']] },
      { name: 'eyebrow', legend: 'Intertitres', options: [['icon', 'Icône'], ['rule', 'Filet']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { vue: 'proprietaire', contenu: 'publies', profil: 'disponible', entete: 'aligne', chiffres: 'bande', galerie: 'mosaique', prive: 'haut', eyebrow: 'icon' },
    onChange: (changed, next) => {
      settings = next;
      if (changed === 'init') return;
      /* « Revenir à l'état initial » (onglet États) efface aussi le profil modifié sur cet appareil
         et les publications, dépublications et suppressions faites dans Mes contenus. */
      if (changed === 'reset' && $('[data-tw-tab="etats"]')?.getAttribute('aria-selected') !== 'false') { edits = {}; ecrireEdits(); V.store.set(CLE_MC, { statuts: {}, dates: {}, publiees: 0 }); V.rendreCompte(); }
      if (['entete', 'chiffres', 'galerie', 'eyebrow', 'accent', 'density', 'radius', 'effects', 'motion'].includes(changed)) { dessinerCourbe(false); return; }
      render();
      suivreSections();
    }
  });
  E.on(() => { render(); suivreSections(); });
  /* Mes contenus modifié dans un autre onglet, ou page rouverte depuis l'historique après un passage par Mes contenus. */
  window.addEventListener('storage', event => { if (event.key === CLE_MC || event.key === null) { render(); suivreSections(); } });
  window.addEventListener('pageshow', event => { if (event.persisted) { render(); suivreSections(); } });

  V.initHeader();
  render({ animer: true });
  suivreSections();
  /* Lien direct vers une création (profil.html?pseudo=…&creation=…), par exemple depuis une notification. */
  const creationDemandee = new URLSearchParams(location.search).get('creation');
  if (creationDemandee) requestAnimationFrame(() => ouvrirCreation(creationDemandee));
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  root.classList.add('pf-pret');
})();
