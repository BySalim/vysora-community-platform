'use strict';

/* Page Mes contenus (EC-15) : brouillons, créations publiées et contenus enregistrés du membre connecté.
   Les brouillons s'ouvrent dans l'éditeur (nouvelle-creation.html?brouillon=…), les créations publiées
   aussi (?modifier=…). Les enregistrements sont partagés avec la fiche création (vysora-<id>)
   et le forum (vysora-forum-enregistres). */

(() => {
  const V = window.Vysora;
  const D = V.D;
  const E = V.etats;
  const PUB = window.VYSORA_PUBLIER;
  const PRO = window.VYSORA_PROFIL;
  const X = window.VYSORA_EXPLORER;
  const MC = window.VYSORA_MES_CONTENUS;
  const { $, $$, t, esc, icon, fmt, typo } = V;
  const root = document.documentElement;
  const CLE = 'vysora-mes-contenus';
  const CLE_ENR = 'vysora-mes-enregistres';
  const ONGLETS = ['brouillons', 'publies', 'enregistres'];
  const NIVEAUX = ['curieux', 'apprenti', 'artisan', 'expert', 'maitre'];
  const SUJETS = {
    question: ['Question', 'help'], clinique: ['Clinique du prompt', 'scan'], astuce: ['Astuce', 'bulb'],
    retour: ['Retour d’expérience', 'route'], discussion: ['Discussion', 'users']
  };
  const len = s => String(s || '').trim().length;

  let settings = {};
  const ui = {
    onglet: ONGLETS.includes(new URLSearchParams(location.search).get('onglet')) ? new URLSearchParams(location.search).get('onglet') : 'brouillons',
    recherche: { brouillons: '', publies: '', enregistres: '' },
    filtre: { brouillons: 'tous', publies: 'tous', enregistres: 'tout' },
    tri: { brouillons: 'recents', publies: 'date', enregistres: 'recents' },
    sens: 'desc',
    ouverts: new Set(),
    retire: null,
    nouveau: null,
    animer: true,
    comptes: {}
  };

  /* État enregistré sur l'appareil ----------------------------------------------
     statuts : brouillon, publiee ou supprimee pour chaque création modifiée ici ;
     dates : date de publication ou de dépublication ; publiees : publications du jour. */
  const lireEtat = () => {
    const e = V.store.get(CLE, {}) || {};
    return { statuts: e.statuts && typeof e.statuts === 'object' ? e.statuts : {}, dates: e.dates && typeof e.dates === 'object' ? e.dates : {}, publiees: Number(e.publiees) || 0 };
  };
  let etat = lireEtat();
  const ecrireEtat = () => V.store.set(CLE, etat);

  /* Niveau et quotas ------------------------------------------------------------ */

  const cleNiveau = () => (NIVEAUX.includes(E.get().niveau) ? E.get().niveau : 'apprenti');
  const profil = () => PRO.niveaux[cleNiveau()];
  const depuis = () => profil().depuis;
  const limite = () => E.limite('creations');
  const utilisees = () => (settings.quota === 'atteint' ? limite() : ((PUB.quota.utilisees || {})[cleNiveau()] || 0) + etat.publiees);
  const quotaAtteint = () => Number.isFinite(limite()) && utilisees() >= limite();

  /* Dates ----------------------------------------------------------------------- */

  const heure = iso => { const [h, m] = iso.slice(11, 16).split(':').map(Number); return `${h} h ${String(m).padStart(2, '0')}`; };
  function quand(iso) {
    const n = V.daysAgo(iso.slice(0, 10));
    const h = iso.length > 10 ? ` à ${heure(iso)}` : '';
    if (n <= 0) return `aujourd’hui${h}`;
    if (n === 1) return `hier${h}`;
    if (n < 7) return `il y a ${n} jours`;
    return `le ${V.dateLabel(iso.slice(0, 10), false)}`;
  }
  const joursAvant = iso => Math.max(0, Math.round((new Date(`${iso}T12:00:00`) - new Date(`${D.today}T12:00:00`)) / 86400000));

  /* Créations du membre : brouillons et publiées ---------------------------------- */

  function typeDe(chemin) {
    const ps = chemin.filter(x => x.kind === 'prompt');
    const es = chemin.filter(x => x.kind === 'etape');
    if (!es.length && !ps.some(p => len(p.prompt))) return null;
    const outils = new Set(ps.map(p => p.outil).filter(Boolean));
    if (es.length || outils.size > 1) return 'projet';
    return ps.length >= 2 ? 'iteration' : 'prompt';
  }

  /* Conditions de publication (RG-10 à RG-13), dans l'ordre où l'éditeur les présente. */
  function verifier(ex) {
    const type = typeDe(ex.chemin);
    const ps = ex.chemin.filter(x => x.kind === 'prompt');
    const es = ex.chemin.filter(x => x.kind === 'etape');
    const resultat = (ex.resultats || []).some(r => r.kind === 'lien' || r.kind === 'fichier' || r.kind === 'code');
    const repondu = p => !!p && (len(p.reponse) > 0 || (p.fichiers || []).length > 0);
    const conditions = [
      ['Un titre de 10 caractères au moins', len(ex.titre) >= 10 && len(ex.titre) <= 120],
      ['L’objectif de la création', len(ex.objectif) >= 20],
      ['Une catégorie', !!ex.categorie],
      ['L’outil d’IA utilisé', ps.some(p => p.outil)]
    ];
    if (type === 'iteration') {
      conditions.push(['Au moins deux échanges', ps.length >= 2 && ps.every(p => len(p.prompt))]);
      conditions.push(['La réponse ou l’image du dernier échange', repondu(ps[ps.length - 1])]);
    } else if (type === 'projet') {
      conditions.push(['Deux étapes avec un titre et un récit', es.filter(e => len(e.titre) >= 5 && len(e.texte) >= 50).length >= 2]);
      conditions.push(['Un résultat final : un lien ou une image', resultat]);
    } else {
      conditions.push(['Le prompt et la réponse ou l’image obtenue', ps.length === 1 && len(ps[0].prompt) > 0 && (repondu(ps[0]) || resultat)]);
    }
    return conditions.map(([label, ok]) => ({ label, ok }));
  }

  function outilsDe(chemin) {
    const liste = [];
    chemin.filter(x => x.kind === 'prompt' && x.outil).forEach(x => {
      const o = liste.find(y => y.outil === x.outil);
      if (!o) liste.push({ outil: x.outil, modeles: x.modele ? [x.modele] : [] });
      else if (x.modele && !o.modeles.includes(x.modele)) o.modeles.push(x.modele);
    });
    return liste;
  }

  /* Créations publiées au départ (celles du profil, selon le niveau) et brouillons en cours (éditeur). */
  const publieesDeBase = () => PRO.creations.slice(0, profil().stats.creations).map(c => c.id).filter(id => PUB.exemples[id]);
  const brouillonsDeBase = () => PUB.brouillons.filter(id => PUB.exemples[id] && PUB.exemples[id].modifie.slice(0, 10) >= depuis());

  function creation(id, statutBase) {
    const ex = PUB.exemples[id];
    const statut = etat.statuts[id] || statutBase;
    const conditions = verifier(ex);
    const pro = PRO.creations.find(c => c.id === id);
    const s = statutBase === 'publiee' ? (profil().creations[id] || [0, 0, 0, 0]) : [0, 0, 0, 0];
    const type = typeDe(ex.chemin);
    return {
      id, ex, statut, statutBase, type,
      titre: len(ex.titre) ? typo(ex.titre) : '',
      categorie: ex.categorie || '',
      outils: outilsDe(ex.chemin),
      media: pro ? pro.media : null,
      conditions, faites: conditions.filter(c => c.ok).length, pret: conditions.every(c => c.ok),
      modifie: (etat.dates[id] && etat.dates[id].modifie) || ex.modifie,
      publie: (etat.dates[id] && etat.dates[id].publie) || (statutBase === 'publiee' ? ex.publie : null),
      depubliee: statutBase === 'publiee' && statut === 'brouillon',
      defi: !!ex.defi,
      apercu: (ex.chemin.find(x => x.kind === 'prompt' && len(x.prompt)) || ex.chemin.find(x => x.kind === 'etape') || {}).prompt || (ex.chemin.find(x => x.kind === 'etape') || {}).texte || '',
      utile: s[0], essais: s[1], reussis: s[2], vues: s[3],
      commentaires: statutBase === 'publiee' ? (MC.commentaires[id] || 0) : 0
    };
  }
  function creations() {
    if (settings.contenu === 'vide') return [];
    return [...brouillonsDeBase().map(id => creation(id, 'brouillon')), ...publieesDeBase().map(id => creation(id, 'publiee'))].filter(c => c.statut !== 'supprimee');
  }
  const brouillons = () => creations().filter(c => c.statut === 'brouillon');
  const publiees = () => creations().filter(c => c.statut === 'publiee');
  const parId = id => creations().find(c => c.id === id);

  /* Contenus enregistrés, partagés avec la fiche création et le forum --------------- */

  const creationExplorer = id => { const dc = D.creations.find(c => c.id === id); const xc = X.creations.find(c => c.id === id); return dc ? { ...dc, category: (xc && xc.category) || dc.category } : null; };
  const trouver = x => (x.kind === 'creation' ? creationExplorer(x.id) : x.kind === 'sujet' ? X.topics.find(s => s.id === x.id) : x.kind === 'cas' ? X.cases.find(c => c.id === x.id) : null) || null;
  const lireFiche = id => { try { return JSON.parse(localStorage.getItem(`vysora-${id}`)); } catch { return null; } };
  function ecrireFiche(id, enregistre) {
    const st = lireFiche(id);
    const base = st && Array.isArray(st.comments) && Array.isArray(st.trials) ? st : { saved: false, useful: false, comments: [], trials: [] };
    try { localStorage.setItem(`vysora-${id}`, JSON.stringify({ ...base, saved: enregistre })); } catch { /* stockage indisponible */ }
  }
  const lireForum = () => { const f = V.store.get('vysora-forum-enregistres', null); return Array.isArray(f) ? f.filter(v => typeof v === 'string') : null; };
  const ecrireForum = ids => V.store.set('vysora-forum-enregistres', ids);

  function lireEnregistres() {
    let liste = V.store.get(CLE_ENR, null);
    if (!Array.isArray(liste)) liste = MC.enregistres.map(x => ({ ...x }));
    liste = liste.filter(x => x && ['creation', 'sujet', 'cas'].includes(x.kind) && trouver(x));
    const a = (kind, id) => liste.some(x => x.kind === kind && x.id === id);
    D.creations.forEach(c => {
      const st = lireFiche(c.id);
      if (st && st.saved === true && !a('creation', c.id)) liste.unshift({ kind: 'creation', id: c.id, at: D.today });
      else if (st && st.saved === false && a('creation', c.id)) liste = liste.filter(x => !(x.kind === 'creation' && x.id === c.id));
      else if (!st && a('creation', c.id)) ecrireFiche(c.id, true);
    });
    const forum = lireForum();
    if (forum) {
      forum.forEach(id => { if (!a('sujet', id) && X.topics.some(s => s.id === id)) liste.unshift({ kind: 'sujet', id, at: D.today }); });
      liste = liste.filter(x => x.kind !== 'sujet' || forum.includes(x.id));
    } else {
      ecrireForum(liste.filter(x => x.kind === 'sujet').map(x => x.id));
    }
    V.store.set(CLE_ENR, liste);
    return liste;
  }
  let enregistres = lireEnregistres();
  function majEnregistre(x, present) {
    if (present) { if (!enregistres.some(y => y.kind === x.kind && y.id === x.id)) enregistres.push(x); }
    else enregistres = enregistres.filter(y => !(y.kind === x.kind && y.id === x.id));
    V.store.set(CLE_ENR, enregistres);
    if (x.kind === 'creation') ecrireFiche(x.id, present);
    if (x.kind === 'sujet') ecrireForum([...new Set([...(lireForum() || []).filter(id => id !== x.id), ...(present ? [x.id] : [])])]);
  }
  const enregistresVisibles = () => (settings.contenu === 'vide' ? [] : enregistres.filter(x => x.at >= depuis()).map(x => ({ ...x, cle: `${x.kind}:${x.id}`, contenu: trouver(x) })));

  /* Fragments partagés --------------------------------------------------------------- */

  const outilHTML = (outil, modele) => `<span class="mc-outil">${V.logo(outil)}${t(outil)}${modele ? `<span class="mc-sep">&nbsp;·&nbsp;</span>${t(modele)}` : ''}</span>`;
  const outilsHTML = liste => liste.map(o => outilHTML(o.outil, o.modeles.join(', '))).join('<span class="mc-sep" aria-hidden="true">+</span>');
  function vignette(media, type, apercu = '') {
    if (!media) return `<span class="mc-vignette is-vide${apercu ? ' is-texte' : ''}" aria-hidden="true">${icon(type ? `type-${type}` : 'type-vide', '')}${apercu ? `<span class="mc-apercu">${t(apercu)}</span>` : ''}</span>`;
    if (media.kind === 'image') return `<span class="mc-vignette${media.portrait ? ' is-affiche' : ''}" aria-hidden="true"><img src="assets/images/${media.name}-720.webp" alt="" width="720" height="${media.portrait ? 1080 : 540}" loading="lazy" decoding="async"${media.portrait ? ' class="is-portrait"' : ''}></span>`;
    return `<span class="mc-vignette" aria-hidden="true"><span class="mock">${V.mockHTML(media.mock)}</span></span>`;
  }
  const typeLigne = c => `<p class="mc-ligne-type">${c.type ? V.typeTag(c.type) : '<span class="mc-genre">Type à définir</span>'}<span class="mc-sep" aria-hidden="true">·</span><span>${c.categorie ? t(c.categorie) : 'Sans catégorie'}</span></p>`;
  const titreCreation = (c, href) => `<h3 class="mc-ligne-titre"><a href="${href}">${c.titre ? t(c.titre) : '<span class="is-sans-titre">Sans titre</span>'}</a></h3>`;
  const nomCreation = c => (c.titre ? `« ${c.titre} »` : 'ce brouillon sans titre');
  const etatVide = (icone, titre, texte, actions = '') => `<div class="mc-vide"><span class="mc-vide-icone" aria-hidden="true">${icon(icone, '')}</span><h3>${t(titre)}</h3><p>${t(texte)}</p>${actions ? `<div class="mc-vide-actions">${actions}</div>` : ''}</div>`;
  const aucunResultat = (onglet, quoi) => `<div class="mc-aucun"><p>${quoi}</p><button class="btn btn-secondary btn-sm" type="button" data-mc-action="reinitialiser" data-mc-onglet-cible="${onglet}">${icon('replay', 'icon-sm')}Effacer la recherche et les filtres</button></div>`;
  const plusieurs = (n, un, des) => `${fmt(n)} ${n > 1 ? des : un}`;
  const lienProfil = () => `profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}#creations`;

  function outils(onglet, types) {
    const r = ui.recherche[onglet];
    const tris = {
      brouillons: [['recents', 'Modifiés récemment'], ['avances', 'Les plus avancés'], ['titre', 'Titre, de A à Z']],
      publies: [['date', 'Les plus récentes'], ['utile', 'Les plus utiles'], ['essais', 'Les plus reproduites'], ['vues', 'Les plus vues']],
      enregistres: [['recents', 'Enregistrés récemment'], ['anciens', 'Enregistrés en premier']]
    }[onglet];
    const etiquettes = { brouillons: 'Rechercher un brouillon', publies: 'Rechercher une création', enregistres: 'Rechercher dans vos enregistrés' };
    return `<div class="mc-outils">
      <div class="mc-recherche" role="search">
        ${icon('search', 'icon-sm')}
        <label class="sr-only" for="mc-q-${onglet}">${etiquettes[onglet]}</label>
        <input type="search" id="mc-q-${onglet}" value="${esc(r)}" placeholder="${etiquettes[onglet]}…" autocomplete="off" spellcheck="false" data-mc-recherche="${onglet}">
        <button class="mc-effacer" type="button" aria-label="Effacer la recherche" data-mc-action="effacer" data-mc-onglet-cible="${onglet}"${r ? '' : ' hidden'}>${icon('close', 'icon-sm')}</button>
      </div>
      ${types.length > 2 ? `<div class="mc-filtres" role="group" aria-label="${onglet === 'enregistres' ? 'Filtrer par genre' : 'Filtrer par type'}">${types.map(([v, l, ic, n]) => `<button type="button" data-mc-filtre="${v}" aria-pressed="${ui.filtre[onglet] === v}">${ic ? icon(ic, 'icon-sm') : ''}${t(l)}${n !== undefined ? ` <small>${fmt(n)}</small>` : ''}</button>`).join('')}</div>` : ''}
      <label class="mc-tri${onglet === 'publies' ? ' mc-tri-mobile' : ''}"><span class="sr-only">Trier</span><select data-mc-tri="${onglet}">${tris.map(([v, l]) => `<option value="${v}"${ui.tri[onglet] === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>${icon('chevron-down', 'icon-sm')}</label>
    </div>`;
  }
  const correspond = (texte, onglet) => V.normalize(texte).includes(V.normalize(ui.recherche[onglet]).trim());

  /* Brouillons ------------------------------------------------------------------------ */

  function ligneBrouillon(c, i) {
    const href = `nouvelle-creation.html?brouillon=${encodeURIComponent(c.id)}`;
    const manque = c.conditions.length - c.faites;
    const ouvert = ui.ouverts.has(c.id);
    const fin = joursAvant(PUB.defi.fin);
    return `<li class="mc-ligne${ui.animer ? ' is-entree' : ''}${ui.nouveau === c.id ? ' is-nouveau' : ''}" style="--i:${Math.min(i, 8)}" data-mc-id="${c.id}">
      ${vignette(c.depubliee ? c.media : null, c.type, c.apercu)}
      <div class="mc-ligne-corps">
        ${typeLigne(c)}
        ${titreCreation(c, href)}
        <p class="mc-ligne-meta"><span>${icon('clock')}Modifié ${t(quand(c.modifie))}</span>${c.outils.length ? `<span class="mc-outils-liste">${outilsHTML(c.outils)}</span>` : ''}</p>
        ${c.defi ? `<p class="mc-ligne-meta"><span class="mc-defi">${icon('trophy')}${t(`Défi « ${PUB.defi.titre} » · ${fin > 1 ? `clôture dans ${fin} jours` : fin === 1 ? 'clôture demain' : 'clôture ce soir'}`)}</span></p>` : ''}
        ${c.depubliee ? `<p class="mc-ligne-meta"><span class="mc-reprise">${icon('eye-off')}${t(`Dépubliée ${quand(etat.dates[c.id] && etat.dates[c.id].depubliee || D.today)} : ses commentaires et reproductions sont masqués`)}</span></p>` : ''}
      </div>
      <div class="mc-etat${c.pret ? ' is-pret' : ''}">
        <span class="mc-segments" role="img" aria-label="${t(`${c.faites} conditions de publication remplies sur ${c.conditions.length}`)}">${c.conditions.map((k, s) => `<i class="${k.ok ? 'is-fait' : ''}" style="--s:${s}"></i>`).join('')}</span>
        ${c.pret
          ? `<p class="mc-pret">${icon('check-circle', 'icon-sm')}Prêt à publier</p>`
          : `<button class="mc-a-completer" type="button" aria-expanded="${ouvert}" aria-controls="mc-manques-${c.id}" data-mc-action="manques">${t(manque > 1 ? `${manque} éléments à compléter` : '1 élément à compléter')}${icon('chevron-down', 'icon-sm')}</button>`}
      </div>
      <div class="mc-actions">
        ${c.pret ? `<button class="btn btn-primary btn-sm" type="button" data-mc-action="publier"${quotaAtteint() ? ' disabled aria-describedby="mc-quota"' : ''}>${icon('send', 'icon-sm')}Publier</button>` : ''}
        <a class="btn btn-secondary btn-sm" href="${href}">${c.pret ? 'Modifier' : 'Continuer'}</a>
        <button class="mc-plus" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${t(`Plus d’actions pour ${c.titre ? `« ${c.titre} »` : 'le brouillon sans titre'}`)}" data-mc-menu-pour="${c.id}">${icon('more', '')}</button>
      </div>
      ${c.pret ? '' : `<div class="mc-manques${ouvert ? ' is-ouvert' : ''}" id="mc-manques-${c.id}"${ouvert ? '' : ' aria-hidden="true" inert'}><div><ul>${c.conditions.map(k => `<li class="${k.ok ? 'is-fait' : ''}">${icon(k.ok ? 'check-circle' : 'circle', '')}<span>${t(k.label)}${k.ok ? '<span class="sr-only"> : rempli</span>' : '<span class="sr-only"> : à compléter</span>'}</span></li>`).join('')}</ul></div></div>`}
    </li>`;
  }

  function contenuBrouillons() {
    const tous = brouillons();
    const o = 'brouillons';
    let liste = tous.filter(c => (ui.filtre[o] === 'tous' || c.type === ui.filtre[o]) && correspond(`${c.titre} ${c.categorie} ${c.outils.map(x => x.outil).join(' ')}`, o));
    const tri = { recents: (a, b) => b.modifie.localeCompare(a.modifie), avances: (a, b) => (b.faites / b.conditions.length) - (a.faites / a.conditions.length) || b.modifie.localeCompare(a.modifie), titre: (a, b) => (a.titre || '￿').localeCompare(b.titre || '￿', 'fr') }[ui.tri[o]];
    liste = liste.slice().sort(tri);
    if (!tous.length) return etatVide('pen', 'Aucun brouillon en cours', 'Une création commence toujours en brouillon, visible de vous uniquement. Vous la publiez quand elle est prête.', '<a class="btn btn-primary" href="nouvelle-creation.html">Commencer une création</a>');
    if (!liste.length) return aucunResultat(o, ui.recherche[o] ? `Aucun brouillon ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.` : 'Aucun brouillon de ce type.');
    return `<ul class="mc-liste" aria-label="Brouillons">${liste.map(ligneBrouillon).join('')}</ul>`;
  }

  function panneauBrouillons() {
    const tous = brouillons();
    const prets = tous.filter(c => c.pret).length;
    const types = [['tous', 'Tous'], ...['prompt', 'iteration', 'projet'].filter(ty => tous.some(c => c.type === ty)).map(ty => [ty, V.TYPE_LABEL[ty], `type-${ty}`])];
    const n = limite();
    return `<div class="mc-entete"><h2>Brouillons</h2>${tous.length ? `<p class="mc-resume">${t(plusieurs(tous.length, 'brouillon', 'brouillons'))}${prets ? ` · <b>${t(plusieurs(prets, 'prêt à publier', 'prêts à publier'))}</b>` : ''}</p>` : ''}</div>
      ${quotaAtteint() && tous.length ? `<p class="mc-note" id="mc-quota">${icon('alert', 'icon-sm')}<span><b>${t(`Vous avez publié ${plusieurs(n, 'création', 'créations')} ces dernières 24 heures`)}</b>, la limite du niveau ${t(E.niveau().nom)}. ${t(`Prochaine publication possible ${PUB.quota.prochaine}.`)}</span></p>` : ''}
      ${tous.length ? outils('brouillons', types) : ''}
      <div data-mc-zone-liste="brouillons">${contenuBrouillons()}</div>`;
  }

  /* Créations publiées ------------------------------------------------------------------ */

  function alerteDe(c) {
    const a = MC.alertes[settings.alerte];
    if (!a || a.creation !== c.id) return '';
    if (settings.alerte === 'obsolescence') return `<p class="mc-alerte is-obsolete">${icon('alert')}<span><b>Obsolescence signalée.</b> ${t(`${plusieurs(a.membres, 'membre indique', 'membres indiquent')} que le rendu a changé avec ${a.modele} depuis le ${V.dateLabel(a.depuis, false)}`.replace(/\.?$/, '.'))} <a href="nouvelle-creation.html?modifier=${c.id}">Mettre à jour</a></span></p>`;
    return `<p class="mc-alerte is-masquee">${icon('eye-off')}<span><b>${t(`Masquée par la modération le ${V.dateLabel(a.le, false)}`.replace(/\.?$/, '.'))}</b> ${t(a.motif)} Elle reste visible de vous et de la modération. <a href="notifications.html">Voir la décision</a></span></p>`;
  }
  function lignePubliee(c, i) {
    const href = `nouvelle-creation.html?modifier=${encodeURIComponent(c.id)}`;
    const masquee = settings.alerte === 'masquee' && MC.alertes.masquee.creation === c.id;
    const reproductible = c.type !== 'projet';
    const modifiee = c.modifie && c.publie && c.modifie.slice(0, 10) > c.publie.slice(0, 10);
    return `<tr class="${ui.animer ? 'is-entree' : ''}${ui.nouveau === c.id ? ' is-nouveau' : ''}${masquee ? ' is-masquee' : ''}" style="--i:${Math.min(i, 8)}" data-mc-id="${c.id}">
      <td class="is-creation"><div class="mc-cellule">
        ${vignette(c.media, c.type, c.media ? '' : c.apercu)}
        <div class="mc-ligne-corps">
          ${typeLigne(c)}
          ${titreCreation(c, href)}
          <p class="mc-ligne-meta"><span>${t(`Publiée ${quand(c.publie)}`)}</span>${modifiee ? `<span>${t(`Modifiée ${quand(c.modifie)}`)}</span>` : ''}<span class="mc-outils-liste">${outilsHTML(c.outils)}</span></p>
          ${alerteDe(c)}
        </div>
      </div></td>
      <td class="is-num" data-label="Votes « Utile »"><span class="mc-chiffre">${fmt(c.utile)}</span></td>
      <td class="is-num" data-label="Reproductions">${reproductible ? `<span class="mc-chiffre">${fmt(c.essais)}</span><span class="mc-chiffre-sous">${c.essais >= 3 ? t(`${Math.round((c.reussis / c.essais) * 100)} % de succès`) : c.essais ? t(plusieurs(c.reussis, 'réussie', 'réussies')) : 'Aucune pour l’instant'}</span>` : '<span class="mc-chiffre" aria-hidden="true">–</span><span class="mc-chiffre-sous">Projet, non reproductible</span>'}</td>
      <td class="is-num" data-label="Vues"><span class="mc-chiffre">${fmt(c.vues)}</span><span class="mc-chiffre-sous">${t(plusieurs(c.commentaires, 'commentaire', 'commentaires'))}</span></td>
      <td class="is-actions"><div class="mc-actions">
        <a class="btn btn-secondary btn-sm" href="${href}">${icon('pen', 'icon-sm')}Modifier</a>
        <button class="mc-plus" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${t(`Plus d’actions pour « ${c.titre} »`)}" data-mc-menu-pour="${c.id}">${icon('more', '')}</button>
      </div></td>
    </tr>`;
  }

  function contenuPubliees() {
    const toutes = publiees();
    const o = 'publies';
    let liste = toutes.filter(c => (ui.filtre[o] === 'tous' || c.type === ui.filtre[o]) && correspond(`${c.titre} ${c.categorie} ${c.outils.map(x => x.outil).join(' ')}`, o));
    const cle = { date: c => c.publie || '', utile: c => c.utile, essais: c => c.essais, vues: c => c.vues }[ui.tri[o]];
    const sens = ui.sens === 'asc' ? 1 : -1;
    liste = liste.slice().sort((a, b) => { const x = cle(a); const y = cle(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sens || (b.publie || '').localeCompare(a.publie || ''); });
    if (!toutes.length) return etatVide('layers', 'Aucune création publiée pour le moment', 'Publiez le résultat obtenu avec l’IA et le chemin parcouru pour y arriver : les autres membres pourront le reproduire.', `<a class="btn btn-primary" href="nouvelle-creation.html">Publier une création</a>${brouillons().some(c => c.pret) ? '<button class="btn btn-secondary" type="button" data-mc-action="aller" data-mc-onglet-cible="brouillons">Voir les brouillons prêts</button>' : ''}`);
    if (!liste.length) return aucunResultat(o, ui.recherche[o] ? `Aucune création ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.` : 'Aucune création de ce type.');
    const th = (cleTri, label) => `<th scope="col" class="is-num"${ui.tri[o] === cleTri ? ` aria-sort="${ui.sens === 'asc' ? 'ascending' : 'descending'}"` : ''}><button class="mc-trier" type="button" data-mc-trier="${cleTri}">${t(label)}${icon('chevron-up-down', 'icon-sm')}</button></th>`;
    return `<table class="mc-table"><caption class="sr-only">Vos créations publiées, avec leurs votes, reproductions et vues</caption>
      <thead><tr><th scope="col"${ui.tri[o] === 'date' ? ` aria-sort="${ui.sens === 'asc' ? 'ascending' : 'descending'}"` : ''}><button class="mc-trier" type="button" data-mc-trier="date">Création${icon('chevron-up-down', 'icon-sm')}</button></th>${th('utile', 'Votes « Utile »')}${th('essais', 'Reproductions')}${th('vues', 'Vues')}<th scope="col" class="is-actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${liste.map(lignePubliee).join('')}</tbody></table>`;
  }

  function panneauPubliees() {
    const toutes = publiees();
    const somme = k => toutes.reduce((a, c) => a + c[k], 0);
    const types = [['tous', 'Toutes'], ...['prompt', 'iteration', 'projet'].filter(ty => toutes.some(c => c.type === ty)).map(ty => [ty, V.TYPE_LABEL[ty], `type-${ty}`])];
    return `<div class="mc-entete"><h2>Créations publiées</h2>${toutes.length ? `<p class="mc-resume">${t(`Au total : `)}<b>${t(plusieurs(somme('utile'), 'vote « Utile »', 'votes « Utile »'))}</b>, <b>${t(plusieurs(somme('essais'), 'reproduction', 'reproductions'))}</b> et <b>${t(plusieurs(somme('vues'), 'vue', 'vues'))}</b></p>` : ''}</div>
      ${toutes.length ? outils('publies', types) : ''}
      <div data-mc-zone-liste="publies">${contenuPubliees()}</div>`;
  }

  /* Enregistrés --------------------------------------------------------------------------- */

  function ligneEnregistre(x, i) {
    const c = x.contenu;
    const date = `<span>${icon('bookmark')}${t(`Enregistré ${quand(x.at)}`)}</span>`;
    let vig, typ, href, meta;
    if (x.kind === 'creation') {
      vig = vignette(c.media, c.type);
      typ = `${V.typeTag(c.type)}<span class="mc-sep" aria-hidden="true">·</span><span>${t(c.category)}</span>`;
      href = `fiche-creation.html?id=${encodeURIComponent(c.id)}`;
      meta = `<span class="mc-qui">${V.avatar(c.author, 20)}${t(c.author)}</span><span>${V.withLogos(c.config)}</span>${date}`;
    } else if (x.kind === 'sujet') {
      const [label, ic] = SUJETS[c.kind] || ['Sujet', 'message'];
      vig = `<span class="mc-vignette is-sujet" aria-hidden="true">${icon(ic, '')}</span>`;
      typ = `<span class="mc-genre">${icon(ic)}${t(label)}</span><span class="mc-sep" aria-hidden="true">·</span><span>${t(plusieurs(c.replies, 'réponse', 'réponses'))}</span>${c.status === 'resolved' ? '<span class="mc-sep" aria-hidden="true">·</span><span>Résolu</span>' : c.status === 'closed' ? '<span class="mc-sep" aria-hidden="true">·</span><span>Fermé</span>' : ''}`;
      href = `forum.html?sujet=${encodeURIComponent(c.id)}`;
      meta = `<span class="mc-qui">${V.avatar(c.author, 20)}${t(c.author)}</span><span>${outilHTML(c.tool, c.model)}</span>${date}`;
    } else {
      vig = `<span class="mc-vignette is-cas" aria-hidden="true">${icon('shield', '')}</span>`;
      typ = `<span class="mc-genre">${icon('shield')}Cas Bon réflexe</span><span class="mc-sep" aria-hidden="true">·</span><span>${t(c.domain)}</span><span class="mc-sep" aria-hidden="true">·</span><span>${t(`${c.minutes} min`)}</span>`;
      href = `apprendre.html?cas=${encodeURIComponent(c.id)}`;
      meta = `<span class="mc-qui">${V.avatar(c.author, 20)}${t(`Proposé par ${c.author}`)}</span>${date}`;
    }
    return `<li class="mc-ligne is-enregistre${ui.animer ? ' is-entree' : ''}" style="--i:${Math.min(i, 8)}" data-mc-cle="${x.cle}">
      ${vig}
      <div class="mc-ligne-corps">
        <p class="mc-ligne-type">${typ}</p>
        <h3 class="mc-ligne-titre"><a href="${href}">${t(c.title)}</a></h3>
        <p class="mc-ligne-meta">${meta}</p>
      </div>
      <div class="mc-actions"><button class="btn btn-quiet btn-sm mc-retirer" type="button" data-mc-action="retirer" aria-label="${t(`Retirer « ${c.title} » de vos enregistrés`)}">${icon('bookmark-x', 'icon-sm')}<span>Retirer</span></button></div>
    </li>`;
  }
  function ligneRetiree(x) {
    return `<li class="mc-ligne is-retire" data-mc-cle="${x.cle}"><p>${icon('bookmark-x', 'icon-sm')}<span>${t(`« ${x.contenu.title} » est retiré de vos enregistrés.`)}</span></p><div class="mc-actions"><button class="btn btn-secondary btn-sm" type="button" data-mc-action="annuler-retrait">${icon('undo', 'icon-sm')}Annuler</button></div></li>`;
  }

  function contenuEnregistres() {
    const o = 'enregistres';
    const tous = enregistresVisibles();
    const retire = ui.retire && ui.retire.at >= depuis() ? { ...ui.retire, contenu: trouver(ui.retire) } : null;
    let liste = tous.filter(x => (ui.filtre[o] === 'tout' || x.kind === ui.filtre[o]) && correspond(`${x.contenu.title} ${x.contenu.author} ${x.contenu.config || x.contenu.tool || ''} ${x.contenu.domain || x.contenu.category || ''}`, o));
    if (retire && (ui.filtre[o] === 'tout' || retire.kind === ui.filtre[o])) liste.push(retire);
    liste = liste.sort((a, b) => (ui.tri[o] === 'anciens' ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)) || a.cle.localeCompare(b.cle));
    if (!tous.length && !retire) return etatVide('bookmark', 'Rien d’enregistré pour le moment', 'Enregistrez une création, un sujet du forum ou un cas Bon réflexe pour le retrouver ici. Cette liste n’est visible que de vous.', '<a class="btn btn-primary" href="explorer.html">Explorer les créations</a><a class="btn btn-secondary" href="forum.html">Parcourir le forum</a>');
    if (!liste.length) return aucunResultat(o, ui.recherche[o] ? `Aucun contenu enregistré ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.` : 'Aucun contenu enregistré de ce genre.');
    return `<ul class="mc-liste" aria-label="Contenus enregistrés">${liste.map((x, i) => (retire && x.cle === retire.cle ? ligneRetiree(x) : ligneEnregistre(x, i))).join('')}</ul>`;
  }

  function panneauEnregistres() {
    const tous = enregistresVisibles();
    const n = k => tous.filter(x => x.kind === k).length;
    const morceaux = [[n('creation'), 'création', 'créations'], [n('sujet'), 'sujet', 'sujets'], [n('cas'), 'cas', 'cas']].filter(([k]) => k).map(([k, a, b]) => plusieurs(k, a, b));
    const resume = morceaux.length > 1 ? `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}` : morceaux[0] || '';
    const genres = [['tout', 'Tout', '', tous.length], ...[['creation', 'Créations', 'layers'], ['sujet', 'Sujets', 'message'], ['cas', 'Cas', 'shield']].filter(([k]) => n(k)).map(([k, l, ic]) => [k, l, ic, n(k)])];
    return `<div class="mc-entete"><h2>Contenus enregistrés</h2>${tous.length ? `<p class="mc-resume">${t(resume)}<span class="mc-sep" aria-hidden="true">·</span><span class="mc-prive">${icon('lock', 'icon-xs')}Visibles de vous uniquement</span></p>` : ''}</div>
      ${tous.length || ui.retire ? outils('enregistres', genres) : ''}
      <div data-mc-zone-liste="enregistres">${contenuEnregistres()}</div>`;
  }

  /* Onglets ------------------------------------------------------------------------------- */

  const PANNEAUX = { brouillons: panneauBrouillons, publies: panneauPubliees, enregistres: panneauEnregistres };
  const CONTENUS = { brouillons: contenuBrouillons, publies: contenuPubliees, enregistres: contenuEnregistres };

  function compter() {
    const n = { brouillons: brouillons().length, publies: publiees().length, enregistres: enregistresVisibles().length };
    ONGLETS.forEach(o => {
      const el = $(`[data-mc-nb="${o}"]`);
      const avant = ui.comptes[o];
      el.textContent = fmt(n[o]);
      $(`[data-mc-onglet="${o}"]`).setAttribute('aria-label', `${{ brouillons: 'Brouillons', publies: 'Publiées', enregistres: 'Enregistrés' }[o]}, ${n[o]}`);
      if (avant !== undefined && avant !== n[o] && V.motion.full()) { el.classList.remove('is-bond'); void el.offsetWidth; el.classList.add('is-bond'); }
    });
    ui.comptes = n;
  }

  function placerIndicateur() {
    const tab = $(`[data-mc-onglet="${ui.onglet}"]`);
    const ind = $('[data-mc-indicateur]');
    if (!tab || !ind) return;
    ind.style.setProperty('--x', `${tab.offsetLeft}px`);
    ind.style.setProperty('--w', `${tab.offsetWidth}px`);
  }

  function rendrePanneau(o, options = {}) {
    const el = $(`[data-mc-panneau="${o}"]`);
    el.innerHTML = PANNEAUX[o]();
    V.fixTypography(el);
    if (options.entree && V.motion.full()) { el.classList.remove('is-entree'); void el.offsetWidth; el.classList.add('is-entree'); }
  }
  function rendreListe(o, animer = false) {
    const zone = $(`[data-mc-zone-liste="${o}"]`);
    if (!zone) { rendrePanneau(o); return; }
    ui.animer = animer;
    zone.innerHTML = CONTENUS[o]();
    ui.animer = false;
    V.fixTypography(zone);
  }

  function choisir(o, { focus = false, entree = true } = {}) {
    if (o !== 'enregistres') ui.retire = null;
    ui.onglet = o;
    $$('[data-mc-onglet]').forEach(tab => {
      const actif = tab.dataset.mcOnglet === o;
      tab.setAttribute('aria-selected', String(actif));
      tab.tabIndex = actif ? 0 : -1;
      if (actif && focus) tab.focus();
    });
    $$('[data-mc-panneau]').forEach(p => { p.hidden = p.dataset.mcPanneau !== o; });
    ui.animer = entree;
    rendrePanneau(o, { entree });
    ui.animer = false;
    placerIndicateur();
    const url = new URL(location.href);
    url.searchParams.set('onglet', o);
    history.replaceState(null, '', url);
  }

  function render(entree = false) {
    const membre = E.membre();
    $('[data-mc-acces]').hidden = membre;
    $('[data-mc-zone]').hidden = !membre;
    $('[data-mc-corps]').hidden = !membre;
    $$('[data-mc-ariane], [data-mc-chapo]').forEach(el => { el.hidden = !membre; });
    $('[data-mc-lien-profil]').href = `profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}`;
    if (!membre) {
      $('[data-mc-acces]').innerHTML = V.accesBloc('contribuer', 'retrouver vos brouillons et vos créations', 'h2');
      V.fixTypography($('[data-mc-acces]'));
      return;
    }
    compter();
    choisir(ui.onglet, { entree });
  }

  /* Menu d'actions d'une ligne ------------------------------------------------------------- */

  const menu = $('[data-mc-menu]');
  let menuBouton = null;
  function entreesMenu(c) {
    if (c.statut === 'brouillon') {
      return [
        ['lien', 'pen', c.pret ? 'Modifier dans l’éditeur' : 'Continuer la rédaction', `nouvelle-creation.html?brouillon=${encodeURIComponent(c.id)}`],
        ...(c.pret ? [['action', 'send', 'Publier la création', 'publier']] : []),
        ['sep'],
        ['action', 'trash', 'Supprimer le brouillon', 'supprimer', true]
      ];
    }
    return [
      ['lien', 'eye', 'Voir sur mon profil', lienProfil()],
      ['lien', 'pen', 'Modifier', `nouvelle-creation.html?modifier=${encodeURIComponent(c.id)}`],
      ['action', 'eye-off', 'Repasser en brouillon', 'depublier'],
      ['sep'],
      ['action', 'trash', 'Supprimer la création', 'supprimer', true]
    ];
  }
  function ouvrirMenu(bouton) {
    fermerMenu(false);
    const c = parId(bouton.dataset.mcMenuPour);
    if (!c) return;
    menuBouton = bouton;
    menu.dataset.mcId = c.id;
    menu.setAttribute('aria-label', typo(`Actions pour ${c.titre ? `« ${c.titre} »` : 'le brouillon sans titre'}`));
    menu.innerHTML = `<p class="mc-menu-titre" aria-hidden="true">${c.titre ? t(c.titre) : 'Brouillon sans titre'}</p>${entreesMenu(c).map(([genre, ic, label, cible, danger]) => (genre === 'sep' ? '<hr aria-hidden="true">'
      : genre === 'lien' ? `<a class="mc-menu-item" role="menuitem" tabindex="-1" href="${cible}">${icon(ic)}${t(label)}</a>`
      : `<button class="mc-menu-item${danger ? ' is-danger' : ''}" role="menuitem" tabindex="-1" type="button" data-mc-action="${cible}"${cible === 'publier' && quotaAtteint() ? ' disabled' : ''}>${icon(ic)}${t(label)}</button>`)).join('')}`;
    menu.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    const r = bouton.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const bas = r.bottom + 6 + h > window.innerHeight - 8;
    menu.style.left = `${Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))}px`;
    menu.style.top = `${bas ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    menu.style.transformOrigin = bas ? 'bottom right' : 'top right';
    $$('[role="menuitem"]:not([disabled])', menu)[0]?.focus();
  }
  function fermerMenu(rendreFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    menuBouton?.setAttribute('aria-expanded', 'false');
    if (rendreFocus) menuBouton?.focus();
    menuBouton = null;
  }
  menu.addEventListener('keydown', event => {
    const items = $$('[role="menuitem"]:not([disabled])', menu);
    const i = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); fermerMenu(); return; }
    if (event.key === 'Tab') { fermerMenu(false); return; }
    const suivant = { ArrowDown: (i + 1) % items.length, ArrowUp: (i - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[event.key];
    if (suivant === undefined) return;
    event.preventDefault();
    items[suivant].focus();
  });
  document.addEventListener('pointerdown', event => { if (!menu.hidden && !menu.contains(event.target) && !event.target.closest('[data-mc-menu-pour]')) fermerMenu(false); });
  window.addEventListener('resize', () => { fermerMenu(false); placerIndicateur(); });
  window.addEventListener('scroll', () => { if (!menu.hidden && window.innerWidth > 720) fermerMenu(false); }, { passive: true });

  /* Dialogue de confirmation ------------------------------------------------------------------ */

  const dialogue = $('[data-mc-dialogue]');
  const confirmer = $('[data-mc-dialogue-confirmer]');
  let surConfirmation = null;
  let retourFocus = null;
  function demander({ icone, titre, texte, plus = '', bouton, danger = false, consentement = false, action }) {
    retourFocus = document.activeElement;
    dialogue.returnValue = '';
    dialogue.classList.toggle('is-danger', danger);
    $('[data-mc-dialogue-icone]').innerHTML = icon(icone, '');
    $('[data-mc-dialogue-titre]').textContent = typo(titre);
    $('[data-mc-dialogue-texte]').textContent = typo(texte);
    $('[data-mc-dialogue-plus]').innerHTML = plus;
    confirmer.textContent = typo(bouton);
    confirmer.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    confirmer.disabled = consentement;
    surConfirmation = action;
    dialogue.showModal();
    const coche = $('[data-mc-consentement]', dialogue);
    (coche || (danger ? $('[data-mc-dialogue-annuler]') : confirmer)).focus();
  }
  dialogue.addEventListener('change', event => { if (event.target.matches('[data-mc-consentement]')) confirmer.disabled = !event.target.checked; });
  $('[data-mc-dialogue-annuler]').addEventListener('click', () => dialogue.close('annuler'));
  dialogue.addEventListener('click', event => { if (event.target === dialogue) dialogue.close('annuler'); });
  $('[data-mc-dialogue-form]').addEventListener('submit', event => {
    event.preventDefault();
    if (confirmer.disabled) return;
    const action = surConfirmation;
    dialogue.close('confirmer');
    action?.();
  });
  dialogue.addEventListener('close', () => {
    if (dialogue.returnValue !== 'confirmer' && retourFocus && document.contains(retourFocus)) retourFocus.focus();
    surConfirmation = null;
  });

  /* Actions ------------------------------------------------------------------------------------ */

  async function sortir(el) {
    if (!el || !V.motion.full()) return;
    await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-14px)' }], { duration: 200, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' }).finished.catch(() => {});
    if (el.tagName !== 'TR') {
      const s = getComputedStyle(el);
      await el.animate([{ height: `${el.offsetHeight}px`, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom }, { height: '0px', paddingTop: '0px', paddingBottom: '0px' }], { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }).finished.catch(() => {});
    }
  }
  /* Après une sortie de liste, le focus va à la ligne suivante, sinon à l'en-tête du panneau. */
  function focusApres(o, index) {
    const titres = $$(`[data-mc-panneau="${o}"] .mc-ligne-titre a`);
    (titres[Math.min(index, titres.length - 1)] || $(`[data-mc-panneau="${o}"]`)).focus();
  }
  const indexLigne = (o, id) => $$(`[data-mc-panneau="${o}"] [data-mc-id]`).findIndex(el => el.dataset.mcId === id);
  const ligne = (o, id) => $(`[data-mc-panneau="${o}"] [data-mc-id="${CSS.escape(id)}"]`);
  const annoncer = message => { const el = $('[data-mc-annonce]'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = typo(message); }); };

  function publier(c) {
    if (!V.exiger('contribuer', 'publier une création')) return;
    if (quotaAtteint()) return;
    const defi = c.defi ? `<p class="mc-defi" style="margin-bottom:14px">${icon('trophy')}${t(`Elle participera au défi « ${PUB.defi.titre} ».`)}</p>` : '';
    demander({
      icone: 'send', titre: `Publier ${nomCreation(c)} ?`, bouton: 'Publier la création', consentement: true,
      texte: 'Elle sera visible de tous les membres et des visiteurs, sur votre profil et dans Explorer. Vous pourrez la modifier ou la repasser en brouillon à tout moment.',
      plus: `${defi}<label class="mc-consentement"><input type="checkbox" data-mc-consentement><span>${t('Je confirme ne publier aucune donnée personnelle de tiers ni aucun secret.')}</span></label>`,
      action: async () => {
        const i = indexLigne('brouillons', c.id);
        await sortir(ligne('brouillons', c.id));
        etat.statuts[c.id] = 'publiee';
        etat.dates[c.id] = { ...(etat.dates[c.id] || {}), publie: c.publie && c.depubliee ? c.publie : `${D.today}T${new Date().toTimeString().slice(0, 5)}`, modifie: c.modifie };
        etat.publiees += 1;
        ecrireEtat();
        ui.nouveau = c.id;
        compter();
        rendrePanneau('brouillons');
        ui.nouveau = null;
        focusApres('brouillons', i);
        V.toast('Création publiée.');
        annoncer(`${c.titre} est publiée. Retrouvez-la dans l’onglet Publiées.`);
      }
    });
  }

  function depublier(c) {
    if (!V.exiger('contribuer', 'repasser une création en brouillon')) return;
    demander({
      icone: 'eye-off', titre: `Repasser « ${c.titre} » en brouillon ?`, bouton: 'Repasser en brouillon',
      texte: 'Elle ne sera plus visible sur Vysora. Ses commentaires et ses reproductions seront masqués jusqu’à sa republication ; ses votes sont conservés.',
      action: async () => {
        const i = indexLigne('publies', c.id);
        await sortir(ligne('publies', c.id));
        etat.statuts[c.id] = 'brouillon';
        etat.dates[c.id] = { ...(etat.dates[c.id] || {}), depubliee: D.today, publie: c.publie };
        ecrireEtat();
        ui.nouveau = c.id;
        compter();
        rendrePanneau('publies');
        ui.nouveau = null;
        focusApres('publies', i);
        V.toast('Création repassée en brouillon.', 'eye-off');
        annoncer(`${c.titre} est repassée en brouillon.`);
      }
    });
  }

  function supprimer(c) {
    const publiee = c.statut === 'publiee';
    if (publiee && !V.exiger('contribuer', 'supprimer une création publiée')) return;
    const points = c.utile * 10 + c.reussis * 5;
    const consequences = publiee ? [
      ...(c.commentaires || c.essais ? [['message', `${plusieurs(c.commentaires, 'commentaire', 'commentaires')} et ${plusieurs(c.essais, 'reproduction', 'reproductions')} ne seront plus visibles`]] : []),
      ...(points ? [['alert', `${fmt(points)} points de réputation liés à cette création vous seront retirés`]] : []),
      ['layers', 'Les variantes indiqueront « Création source supprimée »']
    ] : [];
    demander({
      icone: 'trash', danger: true,
      titre: publiee ? `Supprimer « ${c.titre} » ?` : 'Supprimer ce brouillon ?',
      texte: publiee ? 'La création disparaîtra pour tous les membres. Cette suppression est définitive.' : `${c.titre ? `« ${c.titre} »` : 'Ce brouillon sans titre'} sera supprimé définitivement, avec le chemin parcouru déjà saisi.`,
      plus: consequences.length ? `<ul class="mc-dialogue-liste">${consequences.map(([ic, txt]) => `<li>${icon(ic)}${t(txt)}</li>`).join('')}</ul>` : '',
      bouton: publiee ? 'Supprimer la création' : 'Supprimer le brouillon',
      action: async () => {
        const o = publiee ? 'publies' : 'brouillons';
        const i = indexLigne(o, c.id);
        await sortir(ligne(o, c.id));
        etat.statuts[c.id] = 'supprimee';
        ecrireEtat();
        compter();
        rendrePanneau(o);
        focusApres(o, i);
        V.toast(publiee ? 'Création supprimée.' : 'Brouillon supprimé.', 'trash');
      }
    });
  }

  async function retirer(cle) {
    const x = enregistres.find(y => `${y.kind}:${y.id}` === cle);
    if (!x) return;
    if (ui.retire) ui.retire = null;
    majEnregistre(x, false);
    ui.retire = { ...x, cle };
    compter();
    rendreListe('enregistres');
    $(`[data-mc-cle="${CSS.escape(cle)}"] [data-mc-action="annuler-retrait"]`)?.focus();
    annoncer(`${trouver(x).title} est retiré de vos enregistrés. Bouton Annuler disponible.`);
  }
  function annulerRetrait() {
    if (!ui.retire) return;
    const { cle, ...x } = ui.retire;
    majEnregistre({ kind: x.kind, id: x.id, at: x.at }, true);
    ui.retire = null;
    compter();
    rendreListe('enregistres');
    $(`[data-mc-cle="${CSS.escape(cle)}"] .mc-ligne-titre a`)?.focus();
    V.toast('Remis dans vos enregistrés.', 'bookmark');
  }

  function basculerManques(bouton) {
    const id = bouton.closest('[data-mc-id]').dataset.mcId;
    const zone = $(`#mc-manques-${CSS.escape(id)}`);
    const ouvert = !ui.ouverts.has(id);
    if (ouvert) ui.ouverts.add(id); else ui.ouverts.delete(id);
    bouton.setAttribute('aria-expanded', String(ouvert));
    zone.classList.toggle('is-ouvert', ouvert);
    zone.toggleAttribute('inert', !ouvert);
    if (ouvert) zone.removeAttribute('aria-hidden'); else zone.setAttribute('aria-hidden', 'true');
  }

  /* Événements ----------------------------------------------------------------------------------- */

  document.addEventListener('click', event => {
    const cible = event.target.closest('[data-mc-onglet], [data-mc-menu-pour], [data-mc-action], [data-mc-filtre], [data-mc-trier]');
    if (!cible) return;
    const d = cible.dataset;
    if (d.mcOnglet && cible.getAttribute('role') === 'tab') { if (d.mcOnglet !== ui.onglet) choisir(d.mcOnglet); return; }
    if (d.mcMenuPour) { if (menuBouton === cible) fermerMenu(); else ouvrirMenu(cible); return; }
    if (d.mcFiltre) {
      ui.filtre[ui.onglet] = d.mcFiltre;
      $$(`[data-mc-panneau="${ui.onglet}"] [data-mc-filtre]`).forEach(b => b.setAttribute('aria-pressed', String(b === cible)));
      rendreListe(ui.onglet, true);
      return;
    }
    if (d.mcTrier) {
      if (ui.tri.publies === d.mcTrier) ui.sens = ui.sens === 'desc' ? 'asc' : 'desc';
      else { ui.tri.publies = d.mcTrier; ui.sens = 'desc'; }
      const select = $('[data-mc-tri="publies"]');
      if (select) select.value = d.mcTrier;
      rendreListe('publies', true);
      $(`[data-mc-trier="${d.mcTrier}"]`)?.focus();
      annoncer(`Tri par ${cible.textContent.trim().toLowerCase()}, ordre ${ui.sens === 'asc' ? 'croissant' : 'décroissant'}.`);
      return;
    }
    const action = d.mcAction;
    const id = menu.contains(cible) ? menu.dataset.mcId : cible.closest('[data-mc-id]')?.dataset.mcId;
    const c = id ? parId(id) : null;
    if (menu.contains(cible)) fermerMenu(true);
    if (action === 'manques') basculerManques(cible);
    else if (action === 'publier' && c) publier(c);
    else if (action === 'depublier' && c) depublier(c);
    else if (action === 'supprimer' && c) supprimer(c);
    else if (action === 'retirer') retirer(cible.closest('[data-mc-cle]').dataset.mcCle);
    else if (action === 'annuler-retrait') annulerRetrait();
    else if (action === 'aller') choisir(d.mcOngletCible, { focus: true });
    else if (action === 'effacer') {
      const o = d.mcOngletCible;
      ui.recherche[o] = '';
      const champ = $(`[data-mc-recherche="${o}"]`);
      champ.value = '';
      cible.hidden = true;
      rendreListe(o);
      champ.focus();
    } else if (action === 'reinitialiser') {
      const o = d.mcOngletCible;
      ui.recherche[o] = '';
      ui.filtre[o] = o === 'enregistres' ? 'tout' : 'tous';
      rendrePanneau(o);
      $(`[data-mc-recherche="${o}"]`)?.focus();
    }
  });

  let attente;
  document.addEventListener('input', event => {
    const champ = event.target.closest('[data-mc-recherche]');
    if (!champ) return;
    const o = champ.dataset.mcRecherche;
    ui.recherche[o] = champ.value;
    $(`[data-mc-panneau="${o}"] [data-mc-action="effacer"]`).hidden = !champ.value;
    clearTimeout(attente);
    attente = setTimeout(() => {
      rendreListe(o);
      const n = $$(`[data-mc-zone-liste="${o}"] [data-mc-id], [data-mc-zone-liste="${o}"] [data-mc-cle]`).length;
      annoncer(champ.value ? `${n} résultat${n > 1 ? 's' : ''}.` : '');
    }, 140);
  });
  document.addEventListener('change', event => {
    const select = event.target.closest('[data-mc-tri]');
    if (!select) return;
    const o = select.dataset.mcTri;
    ui.tri[o] = select.value;
    if (o === 'publies') ui.sens = 'desc';
    rendreListe(o, true);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && event.target.closest('[data-mc-recherche]') && event.target.value) {
      event.preventDefault();
      $(`[data-mc-panneau="${event.target.dataset.mcRecherche}"] [data-mc-action="effacer"]`)?.click();
      return;
    }
    const tab = event.target.closest('[data-mc-onglets] [role="tab"]');
    if (!tab) return;
    const i = ONGLETS.indexOf(tab.dataset.mcOnglet);
    const suivant = { ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2 }[event.key];
    if (suivant === undefined) return;
    event.preventDefault();
    choisir(ONGLETS[suivant], { focus: true });
  });
  /* Un autre onglet du navigateur a modifié les enregistrements (fiche création, forum). */
  window.addEventListener('storage', event => {
    if (!event.key || !(event.key === 'vysora-forum-enregistres' || /^vysora-[a-z0-9-]+$/.test(event.key))) return;
    if (event.key === CLE || event.key === 'vysora-etats') return;
    enregistres = lireEnregistres();
    compter();
    if (ui.onglet === 'enregistres') rendreListe('enregistres');
  });
  if ('ResizeObserver' in window) new ResizeObserver(placerIndicateur).observe($('[data-mc-onglets]'));
  document.fonts?.ready.then(placerIndicateur);

  /* Réglages --------------------------------------------------------------------------------------- */

  const membre = e => e.session === 'membre';
  V.initTweaks({
    key: 'vysora-mes-contenus-reglages',
    etats: [
      { name: 'contenu', legend: 'Contenus', options: [['remplis', 'Existants'], ['vide', 'Aucun pour l’instant']], si: membre },
      { name: 'alerte', legend: 'Alerte sur une création publiée', options: [['aucune', 'Aucune'], ['obsolescence', 'Obsolescence signalée'], ['masquee', 'Masquée par la modération']], si: membre },
      { name: 'quota', legend: 'Publications des dernières 24 heures', options: [['disponible', 'Sous la limite'], ['atteint', 'Limite atteinte']], si: e => membre(e) && Number.isFinite(E.limite('creations', e)) }
    ],
    apparence: [
      { name: 'onglets', legend: 'Onglets', options: [['rail', 'Soulignés'], ['segments', 'Segments']] },
      { name: 'publiees', legend: 'Créations publiées', options: [['tableau', 'Tableau'], ['liste', 'Liste']] },
      { name: 'vignettes', legend: 'Vignettes', options: [['affichees', 'Affichées'], ['masquees', 'Masquées']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { contenu: 'remplis', alerte: 'aucune', quota: 'disponible', onglets: 'rail', publiees: 'tableau', vignettes: 'affichees' },
    onChange: (changed, next) => {
      settings = next;
      if (changed === 'init') return;
      /* « Revenir à l'état initial » (onglet États) annule aussi les publications, dépublications et suppressions faites ici. */
      if (changed === 'reset' && $('[data-tw-tab="etats"]')?.getAttribute('aria-selected') !== 'false') { etat = { statuts: {}, dates: {}, publiees: 0 }; ecrireEtat(); ui.retire = null; }
      if (['onglets', 'publiees', 'vignettes', 'accent', 'density', 'radius', 'effects', 'motion'].includes(changed)) { requestAnimationFrame(placerIndicateur); return; }
      render();
    }
  });
  E.on(() => { fermerMenu(false); render(); });

  V.initHeader();
  root.classList.add('mc-demarre');
  render(true);
  requestAnimationFrame(placerIndicateur);
})();
