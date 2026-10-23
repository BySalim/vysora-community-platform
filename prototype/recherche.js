'use strict';

/* Recherche sur tout le site ----------------------------------------------
   Ouverte par la loupe de l'en-tête ([data-recherche-ouvrir]) ou par Ctrl K (⌘ K),
   chargée à la demande par commun.js. Elle porte sur les créations, les guides et
   les domaines d'Explorer, les sujets du forum, les savoirs et les cas Bon réflexe,
   les membres, les outils et les pages du site ; les données des autres pages sont
   chargées à la première intention. Clavier : ↑ ↓ pour choisir, Entrée pour ouvrir,
   Échap pour fermer, Suppr pour oublier une recherche récente. Styles : recherche.css. */

window.VysoraRecherche = (() => {
  const V = window.Vysora;
  const E = V.etats;
  const { D, $, $$, esc, t, typo, fmt, plural, store, clamp, dateLabel } = V;
  const root = document.documentElement;
  const ici = location.pathname.split('/').pop() || 'index.html';
  const CLE_RECENTES = 'vysora-recherches-recentes';
  const EMPH = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
  const DOUX = 'cubic-bezier(0.2, 0, 0, 1)';
  const SORTIE = 'cubic-bezier(0.3, 0, 0.8, 0.15)';

  /* Icônes ------------------------------------------------------------------ */

  const TRACES = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    'search-x': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8.6 8.6l4.8 4.8M13.4 8.6l-4.8 4.8"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    entree: '<path d="M20 5v6a4 4 0 0 1-4 4H5"/><path d="m9 10-5 5 5 5"/>',
    haut: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    bas: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    'type-prompt': '<circle cx="5.5" cy="12" r="2.5"/><path d="M8 12h5"/><rect x="14" y="7.5" width="8" height="9" rx="2"/>',
    'type-iteration': '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3.5V8h-4.5"/><circle cx="12" cy="12" r="1.6"/>',
    'type-projet': '<circle cx="5" cy="18" r="2.4"/><circle cx="12" cy="6.5" r="2.4"/><rect x="16.6" y="13.6" width="5" height="5" rx="1.2"/><path d="m6.4 15.9 4.3-7.3M13.5 8.6l3.6 5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/>',
    pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14 6l4 4"/>',
    code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    flow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    school: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
    shapes: '<circle cx="7" cy="7" r="4"/><path d="M14 3h7v7h-7zM7.5 14l4 7h-8z"/><circle cx="17.5" cy="17.5" r="3.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.4-2.6 4"/><path d="M12 17.4h.01"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.4 2.5"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    layers: '<path d="m12 2.5 9.5 5L12 12.5 2.5 7.5z"/><path d="m2.5 12 9.5 5 9.5-5M2.5 16.5l9.5 5 9.5-5"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    scale: '<path d="M12 3v18M5 21h14M6 7h12"/><path d="m6 7-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    'user-plus': '<circle cx="10" cy="8" r="4"/><path d="M17 21a7 7 0 0 0-14 0M19 8v6M16 11h6"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    flag: '<path d="M5 22V4"/><path d="M5 15s1.2-1 4-1 5 2 8 2 3-1 3-1V4s-.5 1-3 1-5-2-8-2-4 1-4 1"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    login: '<path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="m10 17 5-5-5-5M15 12H3"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'
  };
  const ic = (nom, cls = '') => `<svg class="icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRACES[nom] || TRACES.layers}</svg>`;
  const touche = contenu => `<kbd>${contenu}</kbd>`;

  /* Texte : pliage, mots, fautes de frappe --------------------------------- */

  const plierCar = char => {
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return base.length === 1 && /[a-z0-9]/.test(base) ? base : ' ';
  };
  const plier = texte => Array.from(String(texte || ''), plierCar).join('');
  const champ = (...parts) => ` ${plier(parts.flat(Infinity).filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim()} `;
  const textes = (valeur, sortie = []) => {
    if (typeof valeur === 'string') sortie.push(valeur);
    else if (Array.isArray(valeur)) valeur.forEach(v => textes(v, sortie));
    else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach(v => textes(v, sortie));
    return sortie;
  };
  const MOTS_VIDES = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'en', 'au', 'aux', 'pour', 'avec', 'sur', 'par', 'dans', 'qui', 'que', 'quoi', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'est', 'sont', 'comment', 'faire', 'creer', 'veux', 'voudrais', 'besoin']);
  const racine = mot => (mot.length > 3 ? mot.replace(/(s|x)$/, '') : mot);
  function mots(requete) {
    const tous = plier(requete).split(' ').filter(m => m.length > 1 || /\d/.test(m));
    const utiles = tous.filter(m => !MOTS_VIDES.has(m));
    return utiles.length ? utiles : tous;
  }
  function variantes(mot) {
    const liste = new Set([racine(mot)]);
    const synonyme = window.VYSORA_EXPLORER?.synonyms?.[mot];
    /* Un synonyme de plusieurs mots se cherche comme une expression (« rdv » : « rendez vous »). */
    if (synonyme) liste.add(plier(synonyme).replace(/\s+/g, ' ').trim().split(' ').map(racine).join(' '));
    return [...liste];
  }
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let avant = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i += 1) {
      const ligne = [i];
      let min = i;
      for (let j = 1; j <= b.length; j += 1) {
        ligne[j] = Math.min(avant[j] + 1, ligne[j - 1] + 1, avant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (ligne[j] < min) min = ligne[j];
      }
      if (min > max) return max + 1;
      avant = ligne;
    }
    return avant[b.length];
  }
  /* Surligne le début des mots trouvés, sans toucher aux espaces typographiques. */
  function surligner(texte, racines) {
    const brut = typo(texte);
    const chars = Array.from(brut);
    const plie = chars.map(plierCar).join('');
    const marques = new Array(chars.length).fill(false);
    racines.forEach(r => {
      let de = 0;
      while (r && (de = plie.indexOf(r, de)) >= 0) {
        if (de === 0 || plie[de - 1] === ' ') for (let i = de; i < de + r.length; i += 1) marques[i] = true;
        de += 1;
      }
    });
    let html = '';
    let ouvert = false;
    chars.forEach((char, i) => {
      if (marques[i] && !ouvert) { html += '<mark>'; ouvert = true; }
      if (!marques[i] && ouvert) { html += '</mark>'; ouvert = false; }
      html += esc(char);
    });
    return ouvert ? `${html}</mark>` : html;
  }

  /* Données ------------------------------------------------------------------ */

  const SOURCES = [['VYSORA_EXPLORER', 'explorer-data.js'], ['VYSORA_FORUM', 'forum-data.js'], ['VYSORA_APPRENDRE', 'apprendre-data.js'], ['VYSORA_CLASSEMENTS', 'classements-data.js']];
  const script = src => new Promise(resolve => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = el.onerror = () => resolve();
    document.head.append(el);
  });
  let donnees = null;
  let pret = false;
  let index = [];
  let vocabulaire = [];
  const prechauffer = () => {
    if (!donnees) donnees = Promise.all(SOURCES.filter(([nom]) => !window[nom]).map(([, src]) => script(src))).then(() => { construire(); pret = true; });
    return donnees;
  };

  const GROUPES = [
    { id: 'creations', label: 'Créations', max: 4, plus: n => `Voir les ${n} créations` },
    { id: 'guides', label: 'Guides et domaines', court: 'Guides', max: 2, plus: n => `Voir les ${n} guides et domaines` },
    { id: 'forum', label: 'Forum', max: 3, plus: n => `Voir les ${n} sujets` },
    { id: 'apprendre', label: 'Apprendre', max: 3, plus: n => `Voir les ${n} savoirs et cas` },
    { id: 'membres', label: 'Membres', max: 3, plus: n => `Voir les ${n} membres` },
    { id: 'outils', label: 'Outils', max: 3, plus: n => `Voir les ${n} outils` },
    { id: 'pages', label: 'Pages', max: 3, plus: n => `Voir les ${n} pages` }
  ];
  const GROUPE = Object.fromEntries(GROUPES.map(g => [g.id, g]));
  const TYPES = { prompt: ['type-prompt', '1 prompt'], iteration: ['type-iteration', 'Itération'], projet: ['type-projet', 'Projet'] };
  const SUJETS = { question: ['help', 'Question'], clinique: ['scan', 'Clinique du prompt'], astuce: ['bulb', 'Astuce avant/après'], retour: ['route', 'Retour d’expérience'], discussion: ['users', 'Discussion'] };
  const NIVEAUX_CAS = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };
  const MOCKS_DE_BASE = ['booking', 'dashboard', 'flow', 'letter', 'code', 'cards', 'logo'];
  const quiAffiche = nom => (E.membre() && nom === E.MOI.nom ? 'Vous' : nom);
  const niveauDe = points => Object.values(E.NIVEAUX).filter(n => points >= n.seuil).pop()?.nom || 'Curieux';
  const initiales = nom => nom.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const avatar = (nom, taille) => (D.avatars[nom] ? V.avatar(nom, taille) : `<span class="avatar" style="width:${taille}px;height:${taille}px" aria-hidden="true">${esc(initiales(nom))}</span>`);
  const outilLigne = ([outil, modele]) => `<span>${V.logo(outil, 15)}${t(modele ? `${outil} · ${modele}` : outil)}</span>`;
  const infos = lignes => `<dl class="rch-ap-infos">${lignes.filter(([, valeur]) => valeur).map(([libelle, valeur]) => `<div><dt>${t(libelle)}</dt><dd>${valeur}</dd></div>`).join('')}</dl>`;
  const tuile = contenu => `<div class="rch-ap-media"><div class="rch-ap-tuile">${contenu}</div></div>`;
  const image = (nom, alt = '') => `<img src="assets/images/${nom}-720.webp" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const avecCommun = () => Boolean(document.querySelector('link[href*="commun.css"]'));

  function mediaCreation(c, icone) {
    if (c.media.kind === 'image') return `<div class="rch-ap-media">${image(c.media.name)}</div>`;
    if (c.media.mock && (MOCKS_DE_BASE.includes(c.media.mock) || avecCommun())) return `<div class="rch-ap-media"><div class="mock" aria-hidden="true">${V.mockHTML(c.media.mock)}</div></div>`;
    return tuile(ic(icone));
  }
  const apercuBase = ({ media = '', sur, titre, texte = '', details = '', action }) => `${media}<p class="rch-ap-sur">${sur}</p><h3 class="rch-ap-titre">${t(titre)}</h3>${texte ? `<p class="rch-ap-texte">${t(texte)}</p>` : ''}${details}<p class="rch-ap-action">${touche(ic('entree'))}${t(action)}</p>`;

  function construire() {
    const X = window.VYSORA_EXPLORER || {};
    const F = window.VYSORA_FORUM || {};
    const A = window.VYSORA_APPRENDRE || {};
    const C = window.VYSORA_CLASSEMENTS || {};
    const domaineIcone = Object.fromEntries((X.domains || []).map(d => [d.name, d.icon]));
    const nbParDomaine = Object.fromEntries((D.categories || []).map(c => [c.name, c.count]));
    const creations = X.creations || [];
    const ajout = [];
    const max = (liste, f) => Math.max(1, ...liste.map(f));

    const maxUtile = max(creations, c => c.useful || 0);
    creations.forEach(c => {
      const [icone, type] = TYPES[c.type] || TYPES.prompt;
      const outil = c.tools[0];
      ajout.push({
        cle: `creation:${c.id}`, groupe: 'creations', titre: c.title, href: `fiche-creation.html?id=${encodeURIComponent(c.id)}`,
        f0: champ(c.title), f1: champ(c.tags, c.tools, c.author, c.domain, c.category, type), f2: champ(c.objective, c.prompt, (c.moments || []).map(m => m.text)),
        pop: (c.useful || 0) / maxUtile,
        vignette: () => (c.media.kind === 'image' ? image(c.media.name) : ic(domaineIcone[c.domain] || 'layers')),
        meta: () => [`${ic(icone)}${type}`, t(c.domain), outil ? `${V.logo(outil[0], 14)}${t(outil[0])}` : '', t(quiAffiche(c.author))],
        apercu: () => apercuBase({
          media: mediaCreation(c, domaineIcone[c.domain] || 'layers'), sur: `${ic(icone)}${type}`, titre: c.title, texte: c.objective,
          details: infos([
            [c.tools.length > 1 ? 'Outils' : 'Outil', c.tools.map(outilLigne).join('')],
            ['Auteur', `<span>${avatar(c.author, 20)}${t(quiAffiche(c.author))}</span>`],
            ['Reproductions', c.type !== 'projet' && c.repro ? t(`${fmt(c.repro)}, avec ${c.success} % de succès`) : ''],
            ['Votes « Utile »', c.type === 'projet' && c.useful ? fmt(c.useful) : '']
          ]),
          action: 'Ouvrir la fiche'
        })
      });
    });

    (X.objectives || []).forEach(o => ajout.push({
      cle: `guide:${o.id}`, groupe: 'guides', titre: o.title, href: `explorer.html?guide=${encodeURIComponent(o.id)}`,
      f0: champ(o.title, o.short), f1: champ(o.keywords, o.domain, 'guide'), f2: champ((o.path || []).map(p => [p.title, p.how])),
      pop: 0.7, vcls: 'est-accent',
      vignette: () => ic('compass'),
      meta: () => ['Guide', t(o.domain), plural((o.path || []).length, 'étape', 'étapes')],
      apercu: () => apercuBase({
        media: tuile(ic(domaineIcone[o.domain] || 'compass')), sur: `${ic('compass')}Guide · ${t(o.domain)}`, titre: o.title,
        details: `<ol class="rch-ap-liste">${(o.path || []).slice(0, 4).map(p => `<li>${ic('check')}${t(p.title)}</li>`).join('')}</ol>`,
        action: 'Ouvrir le guide'
      })
    }));

    (X.domains || []).forEach(d => {
      const exemples = creations.filter(c => c.domain === d.name).sort((a, b) => b.useful - a.useful).slice(0, 3);
      ajout.push({
        cle: `domaine:${d.slug}`, groupe: 'guides', titre: d.name, href: `categorie.html?domaine=${encodeURIComponent(d.slug)}`,
        f0: champ(d.name), f1: champ('domaine catégorie'), f2: champ(d.description),
        pop: 0.6,
        vignette: () => ic(d.icon),
        meta: () => ['Domaine', nbParDomaine[d.name] ? plural(nbParDomaine[d.name], 'création', 'créations') : ''],
        apercu: () => apercuBase({
          media: tuile(ic(d.icon)), sur: `${ic('layers')}Domaine`, titre: d.name, texte: d.description,
          details: exemples.length ? `<ul class="rch-ap-liste">${exemples.map(c => `<li>${ic(TYPES[c.type][0])}${t(c.title)}</li>`).join('')}</ul>` : '',
          action: 'Parcourir le domaine'
        })
      });
    });

    const publies = (store.get('vysora-forum-sujets', []) || []).filter(s => s && s.id && s.title && SUJETS[s.kind]);
    const sujets = [...publies, ...(F.topics || X.topics || []).filter(s => !publies.some(p => p.id === s.id))];
    const maxSujet = max(sujets, s => s.useful || 0);
    sujets.forEach(s => {
      const [icone, genre] = SUJETS[s.kind] || SUJETS.question;
      const reponses = Number.isFinite(s.replies) ? s.replies : (s.answers || []).length;
      const statut = s.status === 'resolved' ? `<span class="est-resolu">${ic('check-circle')}Résolu</span>` : s.status === 'closed' ? `${ic('lock')}Fermé` : '';
      ajout.push({
        cle: `sujet:${s.id}`, groupe: 'forum', titre: s.title, href: `forum.html?sujet=${encodeURIComponent(s.id)}`,
        f0: champ(s.title), f1: champ(s.tags, s.tool, s.model, s.author, s.domain, genre), f2: champ(s.body, s.clinic ? textes(s.clinic) : ''),
        pop: (s.useful || 0) / maxSujet,
        vignette: () => ic(icone),
        meta: () => [genre, statut, reponses ? plural(reponses, 'réponse', 'réponses') : 'Sans réponse', s.tool ? `${V.logo(s.tool, 14)}${t(s.tool)}` : ''],
        apercu: () => apercuBase({
          sur: `${ic(icone)}${t(genre)}`, titre: s.title, texte: s.body,
          details: infos([
            ['Auteur', `<span>${avatar(s.author, 20)}${t(quiAffiche(s.author))}</span>`],
            ['Outil', s.tool ? outilLigne([s.tool, s.model]) : ''],
            ['Statut', s.status === 'resolved' ? 'Résolu' : s.status === 'closed' ? 'Fermé' : 'Ouvert'],
            ['Réponses', fmt(reponses)]
          ]),
          action: 'Lire le sujet'
        })
      });
    });

    const rubriques = Object.fromEntries((A.rubriques || []).map(r => [r.id, r]));
    (A.savoirs || []).forEach(s => {
      const r = rubriques[s.kind] || { one: 'Savoir', icon: 'book' };
      ajout.push({
        cle: `savoir:${s.id}`, groupe: 'apprendre', titre: s.title, href: `apprendre.html?savoir=${encodeURIComponent(s.id)}`,
        f0: champ(s.title), f1: champ(r.one, r.label, s.short), f2: champ(textes(s.body)),
        pop: 0.5,
        vignette: () => ic(r.icon),
        meta: () => [t(r.one), `${s.minutes} min de lecture`],
        apercu: () => apercuBase({
          sur: `${ic(r.icon)}${t(r.one)}`, titre: s.title, texte: s.short,
          details: infos([['Lecture', t(`${s.minutes} min`)], ['Mise à jour', s.updated ? t(dateLabel(s.updated)) : '']]),
          action: 'Lire'
        })
      });
    });
    (X.cases || []).forEach(c => ajout.push({
      cle: `cas:${c.id}`, groupe: 'apprendre', titre: c.title, href: `apprendre.html?cas=${encodeURIComponent(c.id)}`,
      f0: champ(c.title), f1: champ('bon réflexe cas', c.domain, NIVEAUX_CAS[c.level]), f2: champ(c.context, c.response),
      pop: 0.55,
      vignette: () => ic('scale'),
      meta: () => ['Cas Bon réflexe', NIVEAUX_CAS[c.level] || '', t(`${c.minutes} min`)],
      apercu: () => apercuBase({
        sur: `${ic('scale')}Cas Bon réflexe`, titre: c.title, texte: c.context,
        details: infos([['Niveau', NIVEAUX_CAS[c.level] || ''], ['Domaine', t(c.domain)], ['Durée', t(`${c.minutes} min`)], ['Réponses', fmt(c.answers || 0)]]),
        action: 'Répondre au cas'
      })
    }));

    const membres = Object.entries(C.members || {}).filter(([nom]) => nom !== E.MOI.nom);
    const maxPoints = max(membres, ([, m]) => m.total);
    membres.forEach(([nom, m]) => {
      const niveau = niveauDe(m.total);
      ajout.push({
        cle: `membre:${nom}`, groupe: 'membres', titre: nom, href: `classements.html?classement=general&membre=${encodeURIComponent(nom)}`,
        f0: champ(nom), f1: champ(niveau, m.tools, 'membre'), f2: ' ',
        pop: m.total / maxPoints, vcls: 'est-avatar',
        vignette: () => avatar(nom, 42),
        meta: () => [t(niveau), t(`${fmt(m.total)} points`), (m.tools || []).slice(0, 2).map(o => V.logo(o, 14)).join('')],
        apercu: () => apercuBase({
          media: tuile(avatar(nom, 84)), sur: `${ic('user')}Membre`, titre: nom,
          details: infos([['Niveau', t(niveau)], ['Points', fmt(m.total)], ['Membre depuis', m.since ? t(dateLabel(m.since)) : ''], ['Outils préférés', (m.tools || []).map(o => `<span>${V.logo(o, 15)}${t(o)}</span>`).join('')]]),
          action: 'Voir son classement'
        })
      });
    });

    const familles = Object.fromEntries((D.toolFamilies || []).map(f => [f.id, f.label]));
    const alias = Object.entries(D.toolAliases || {});
    const usages = Object.fromEntries((D.tools || []).map(o => [o.name, creations.filter(c => c.tools.some(([nom]) => nom === o.name))]));
    const maxUsage = max(D.tools || [], o => usages[o.name].length);
    (D.tools || []).forEach(o => {
      const liste = usages[o.name];
      const modeles = [...new Set(liste.flatMap(c => c.tools.filter(([nom]) => nom === o.name).map(([, modele]) => modele)).filter(Boolean))];
      ajout.push({
        cle: `outil:${o.name}`, groupe: 'outils', titre: o.name, href: `explorer.html?q=${encodeURIComponent(o.name)}`,
        f0: champ(o.name), f1: champ(familles[o.family], alias.filter(([, nom]) => nom === o.name).map(([a]) => a), modeles, 'outil'), f2: ' ',
        pop: liste.length / maxUsage, vcls: 'est-outil',
        vignette: () => V.logo(o, 22),
        meta: () => ['Outil', t(familles[o.family] || ''), liste.length ? plural(liste.length, 'création', 'créations') : ''],
        apercu: () => apercuBase({
          media: tuile(V.logo(o, 52)), sur: `${ic('layers')}Outil · ${t(familles[o.family] || '')}`, titre: o.name,
          details: liste.length
            ? `${infos([['Modèles utilisés', modeles.slice(0, 3).map(m => t(m)).join(', ')]])}<ul class="rch-ap-liste">${liste.slice().sort((a, b) => b.useful - a.useful).slice(0, 3).map(c => `<li>${ic(TYPES[c.type][0])}${t(c.title)}</li>`).join('')}</ul>`
            : '',
          action: 'Voir dans Explorer'
        })
      });
    });

    index = ajout;
    const ensemble = new Set();
    index.forEach(e => `${e.f0} ${e.f1}`.split(' ').forEach(m => { if (m.length > 2) ensemble.add(m); }));
    vocabulaire = [...ensemble];
  }

  /* Pages du site : elles suivent la session (visiteur ou membre). */
  function nonLues() {
    if (!E.membre() || E.get().notifications !== 'nouvelles') return 0;
    const n = store.get('vysora-notifications-nonlues', null);
    return Number.isInteger(n) && n > 0 ? n : E.MOI.nonLues;
  }
  function pages() {
    const membre = E.membre();
    const retour = ['connexion.html', 'inscription.html'].includes(ici) ? '' : `?retour=${encodeURIComponent(`${ici}${location.search}${location.hash}`)}`;
    const n = nonLues();
    const liste = [
      ['accueil', 'Accueil', 'index.html', 'home', 'La communauté qui publie le chemin parcouru avec l’IA', 'accueil vysora presentation', 0.4],
      ['explorer', 'Explorer les créations', 'explorer.html', 'compass', 'Guides, domaines et créations de la communauté', 'explorer catalogue parcourir creations guides', 0.8],
      ['forum', 'Forum', 'forum.html', 'message', 'Questions, cliniques du prompt et discussions', 'forum entraide aide questions discussions communaute', 0.8],
      ['poser', 'Poser une question', 'forum.html?nouveau=question', 'help', 'Demander de l’aide à la communauté', 'poser question demander aide bloque nouveau sujet', 0.7],
      ['clinique', 'Clinique du prompt', 'forum.html?type=clinique', 'scan', 'Faire reformuler un prompt qui résiste', 'clinique prompt reformuler corriger ameliorer', 0.6],
      ['apprendre', 'Apprendre', 'apprendre.html', 'bulb', 'Bases, notions, règles et astuces', 'apprendre savoirs bases notions regles astuces cours debuter tutoriel', 0.8],
      ['bon-reflexe', 'Bon réflexe', 'apprendre.html?rubrique=bon-reflexe', 'scale', 'Juger une vraie réponse d’IA, puis comparer avec l’analyse', 'bon reflexe cas entrainement exercice juger', 0.7],
      ['classements', 'Classements', 'classements.html', 'trophy', 'Palmarès de la semaine et classement des membres', 'classements palmares points reputation niveaux badges', 0.7],
      ['defis', 'Défi de la semaine', 'defis.html', 'flag', 'Une affiche touristique en trois échanges', 'defi defis concours participer affiche semaine', 0.7],
      ['publier', 'Publier une création', 'nouvelle-creation.html', 'plus', 'Partager un résultat et le chemin parcouru', 'publier partager nouvelle creation poster ajouter', 0.8],
      ...(membre ? [
        ['profil', 'Mon profil', `profil.html?pseudo=${E.MOI.pseudo}`, 'user', 'Votre réputation, vos créations et vos badges', 'profil moi compte reputation badges', 0.6],
        ['mes-contenus', 'Mes contenus', 'mes-contenus.html', 'folder', 'Brouillons, créations publiées et enregistrées', 'mes contenus brouillons enregistres publies creations', 0.7],
        ['notifications', 'Notifications', 'notifications.html', 'bell', n ? plural(n, 'notification non lue', 'notifications non lues') : 'Réponses, votes et décisions de modération', 'notifications alertes reponses', 0.6],
        ['parametres', 'Paramètres', 'parametres.html', 'settings', 'Compte, sécurité, notifications et données', 'parametres reglages compte mot passe mail securite confidentialite supprimer donnees', 0.6]
      ] : [
        ['connexion', 'Se connecter', `connexion.html${retour}`, 'login', 'Retrouver vos votes, vos essais et vos brouillons', 'connexion connecter identifier compte mot passe oublie', 0.6],
        ['inscription', 'Créer un compte', `inscription.html${retour}`, 'user-plus', 'Explorer, publier et apprendre gratuitement', 'inscription inscrire creer compte rejoindre', 0.6]
      ]),
      ['charte', 'Charte communautaire', 'charte-communautaire.html', 'heart', 'Les règles qui font vivre la communauté', 'charte regles communaute moderation bienveillance', 0.3],
      ['cgu', 'Conditions générales d’utilisation', 'cgu.html', 'doc', 'Les règles d’utilisation du service', 'cgu conditions generales utilisation licence', 0.2],
      ['confidentialite', 'Politique de confidentialité', 'confidentialite.html', 'lock', 'Vos données personnelles et vos droits', 'confidentialite donnees personnelles rgpd vie privee', 0.2],
      ['cookies', 'Cookies', 'cookies.html', 'doc', 'Traceurs et mesure d’audience', 'cookies traceurs mesure audience consentement', 0.2],
      ['mentions', 'Mentions légales', 'mentions-legales.html', 'doc', 'Éditeur et hébergement du site', 'mentions legales editeur hebergeur', 0.2],
      ['contact', 'Contact', 'contact.html', 'mail', 'Écrire à l’équipe Vysora', 'contact ecrire equipe aide support signaler', 0.4]
    ];
    return liste.map(([id, titre, href, icone, texte, motsCles, pop]) => ({
      cle: `page:${id}`, id, groupe: 'pages', titre, href, icone, texte,
      f0: champ(titre), f1: champ(motsCles), f2: champ(texte), pop,
      vignette: () => ic(icone),
      meta: () => [t(texte)],
      apercu: () => apercuBase({
        media: id === 'defis' ? `<div class="rch-ap-media">${image('goree', 'Maisons colorées et palmiers au bord de l’eau, sur l’île de Gorée')}</div>` : tuile(ic(icone)),
        sur: `${ic(icone)}Page`, titre, texte, action: 'Ouvrir la page'
      })
    }));
  }

  /* Recherche ---------------------------------------------------------------- */

  function noter(entree, groupes) {
    let total = 0;
    for (const vars of groupes) {
      const dans = f => vars.some(v => f.includes(` ${v}`));
      const poids = dans(entree.f0) ? 10 : dans(entree.f1) ? 5 : dans(entree.f2) ? 2 : 0;
      if (!poids) return 0;
      total += poids;
      if (vars.some(v => entree.f0.includes(` ${v} `))) total += 2;
    }
    return total;
  }
  function trouver(liste, groupes, phrase) {
    const debut = ` ${plier(phrase).replace(/\s+/g, ' ').trim()}`;
    return liste.map(e => {
      let score = noter(e, groupes);
      if (!score) return null;
      if (e.f0.startsWith(debut)) score += 8;
      if (e.f0.trim() === debut.trim()) score += 12;
      return { e, score: score + (e.pop || 0) * 3 };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.e.titre.localeCompare(b.e.titre, 'fr'));
  }
  function corriger(liste) {
    return liste.map(mot => {
      if (mot.length < 4 || /\d/.test(mot) || window.VYSORA_EXPLORER?.synonyms?.[mot]) return mot;
      const r = racine(mot);
      if (vocabulaire.some(m => m.startsWith(r))) return mot;
      const seuil = mot.length >= 7 ? 2 : 1;
      let meilleur = null;
      let ecart = seuil + 1;
      vocabulaire.forEach(m => {
        let d = distance(mot, m, seuil);
        if (mot.length >= 5 && m.length > mot.length) d = Math.min(d, distance(mot, m.slice(0, mot.length), seuil));
        if (d < ecart || (d === ecart && meilleur && m.length < meilleur.length)) { ecart = d; meilleur = m; }
      });
      return meilleur && ecart <= seuil ? meilleur : mot;
    });
  }
  /* Tous les mots d'abord ; sinon les mots corrigés ; sinon les seuls mots connus. */
  function chercher(q) {
    const liste = [...index, ...pages()];
    const tous = mots(q);
    if (!tous.length) return { resultats: [], racines: [] };
    const essai = m => ({ resultats: trouver(liste, m.map(variantes), m.join(' ')), racines: m.map(racine) });
    let r = essai(tous);
    if (r.resultats.length || etat.exact) return r;
    const corriges = corriger(tous);
    if (corriges.join(' ') !== tous.join(' ')) {
      const r2 = essai(corriges);
      if (r2.resultats.length) return { ...r2, correction: corriges.join(' ') };
    }
    const connus = corriges.filter(m => liste.some(e => noter(e, [variantes(m)])));
    if (connus.length && connus.length < corriges.length) {
      const r3 = essai(connus);
      if (r3.resultats.length) return { ...r3, correction: connus.join(' ') };
    }
    return r;
  }

  /* Rendu ---------------------------------------------------------------------- */

  const etat = { q: '', portee: 'tout', exact: false };
  let dialogue, voile, feuille, champEl, loupe, saisie, effacer, fermerBtn, filtres, zone, colonne, avant, liste, apercu, pied, total, annonce;
  let curseur = null;
  let options = [];
  let elements = [];
  let actif = -1;
  let cleApercu = null;
  let dejaVues = new Set();
  let source = null;
  let fermeture = null;
  let annonceMinuteur = 0;

  const groupeHTML = (id, label, contenu, { compte = null, colonne: col = 0 } = {}) => `<div class="rch-groupe" role="group" aria-labelledby="rch-g-${id}"${col ? ` data-colonne="${col}"` : ''}><p class="rch-groupe-tete" id="rch-g-${id}" role="presentation">${t(label)}${compte !== null ? `<small>${fmt(compte)}</small>` : ''}</p>${contenu}</div>`;
  function optionHTML(o) {
    const i = options.push(o) - 1;
    const nouvelle = !dejaVues.has(o.cle || `${o.kind}:${o.titre}`);
    const balise = o.href ? 'a' : 'div';
    const attributs = `id="rch-o-${i}" role="option" aria-selected="false" class="rch-option${o.cls ? ` ${o.cls}` : ''}${nouvelle ? ' est-nouvelle' : ''}" data-i="${i}" style="--i:${Math.min(i, 12)}"${o.href ? ` href="${esc(o.href)}" tabindex="-1"` : ''}`;
    const meta = (o.meta || []).filter(Boolean);
    return `<${balise} ${attributs}><span class="rch-vignette${o.vcls ? ` ${o.vcls}` : ''}" aria-hidden="true">${o.vignette || ''}</span><span class="rch-texte">${o.sur ? `<span class="rch-sur">${t(o.sur)}</span>` : ''}<span class="rch-titre">${o.titre}</span>${meta.length ? `<span class="rch-meta">${meta.map(m => `<span>${m}</span>`).join('')}</span>` : ''}</span><span class="rch-fin">${o.fin ?? ic('arrow')}</span></${balise}>`;
  }
  const depuisEntree = (e, racines) => ({ cle: e.cle, href: e.href, titre: surligner(e.titre, racines), meta: e.meta(), vignette: e.vignette(), vcls: e.vcls, apercu: e.apercu });

  function accueilHTML() {
    const recentes = (store.get(CLE_RECENTES, []) || []).filter(r => typeof r === 'string').slice(0, 5);
    const frequentes = (window.VYSORA_EXPLORER?.frequent || ['réservation', 'logo', 'script', 'factures', 'illustration', 'traduction']).filter(f => !recentes.some(r => plier(r).trim() === plier(f).trim()));
    let html = '';
    if (recentes.length) {
      html += groupeHTML('recentes', 'Recherches récentes', [
        ...recentes.map(r => optionHTML({ kind: 'terme', terme: r, cle: `recente:${r}`, cls: 'est-compacte', vignette: ic('clock'), titre: esc(typo(r)), fin: `<span class="rch-oublier" data-rch-oublier="${esc(r)}" title="Retirer de l’historique" aria-hidden="true">${ic('close')}</span>` })),
        optionHTML({ kind: 'effacer', cle: 'effacer', cls: 'est-compacte est-discrete', titre: 'Effacer l’historique', fin: '' })
      ].join(''));
    }
    html += groupeHTML('frequentes', 'Recherches fréquentes', frequentes.slice(0, 6).map(f => optionHTML({ kind: 'terme', terme: f, cle: `frequente:${f}`, cls: 'est-compacte', vignette: ic('trend'), titre: esc(typo(f)) })).join(''));

    const parId = Object.fromEntries(pages().map(p => [p.id, p]));
    const rapides = E.membre() ? ['mes-contenus', 'notifications', 'poser', 'publier'] : ['poser', 'bon-reflexe', 'publier', 'inscription'];
    html += groupeHTML('rapides', 'Accès rapide', [
      optionHTML({ cle: 'rapide:defi', href: 'defis.html', cls: 'est-defi', vignette: image('goree'), sur: 'Défi de la semaine', titre: t('Une affiche touristique en trois échanges'), meta: ['87 participations'] }),
      ...rapides.map(id => parId[id]).filter(Boolean).map(p => optionHTML({ cle: `rapide:${p.id}`, href: p.href, vignette: ic(p.icone), titre: t(p.titre), meta: [t(p.texte)] }))
    ].join(''), { colonne: 2 });
    return html;
  }

  function resultatsHTML(q) {
    const { resultats, racines, correction } = chercher(q);
    const parGroupe = Object.fromEntries(GROUPES.map(g => [g.id, []]));
    resultats.forEach(r => parGroupe[r.e.groupe].push(r));
    const presents = GROUPES.filter(g => parGroupe[g.id].length);
    if (etat.portee !== 'tout' && !parGroupe[etat.portee]?.length) etat.portee = 'tout';

    filtres.innerHTML = [['tout', 'Tout', resultats.length], ...presents.map(g => [g.id, g.court || g.label, parGroupe[g.id].length])]
      .map(([id, label, n]) => `<button type="button" aria-pressed="${etat.portee === id}" data-rch-portee="${id}">${t(label)}<small>${fmt(n)}</small></button>`).join('');
    filtres.hidden = !resultats.length;
    total.textContent = resultats.length ? typo(plural(resultats.length, 'résultat', 'résultats')) : '';
    annoncer(resultats.length ? plural(resultats.length, 'résultat', 'résultats') : 'Aucun résultat');

    const continuer = [
      ...(ici === 'forum.html' ? [{ cle: 'continuer:forum', href: `forum.html?q=${encodeURIComponent(q)}`, vignette: ic('message'), titre: t(`Rechercher « ${q} » dans le forum`), meta: ['Questions, cliniques et discussions'] }] : []),
      { cle: 'continuer:explorer', href: `explorer.html?q=${encodeURIComponent(q)}`, vignette: ic('compass'), titre: t(`Rechercher « ${q} » dans Explorer`), meta: ['Guides et parcours documentés'] }
    ];

    if (!resultats.length) {
      avant.innerHTML = `<div class="rch-rien"><span class="rch-rien-icone" aria-hidden="true">${ic('search-x')}</span><h2>${t(`Aucun résultat pour « ${q} »`)}</h2><p>${t('Vérifiez l’orthographe, ou essayez un terme plus général : un objectif, un outil ou un domaine.')}</p></div>`;
      return groupeHTML('suite', 'Pour aller plus loin', [
        optionHTML({ cle: 'rien:poser', href: 'forum.html?nouveau=question', vignette: ic('help'), titre: 'Poser la question sur le forum', meta: ['La communauté vous répond'] }),
        optionHTML({ cle: 'rien:explorer', href: 'explorer.html', vignette: ic('compass'), titre: 'Explorer toutes les créations', meta: ['Guides, domaines et créations'] })
      ].join(''));
    }

    avant.innerHTML = correction ? `<p class="rch-correction">${t('Résultats pour')} <b>${esc(correction)}</b>. <button type="button" data-rch-exact>${t(`Rechercher plutôt « ${q} »`)}</button></p>` : '';
    const affiches = etat.portee === 'tout'
      ? presents.slice().sort((a, b) => parGroupe[b.id][0].score - parGroupe[a.id][0].score)
      : [GROUPE[etat.portee]];
    let html = affiches.map(g => {
      const lignes = parGroupe[g.id];
      const montrees = etat.portee === 'tout' ? lignes.slice(0, g.max) : lignes.slice(0, 40);
      const plus = etat.portee === 'tout' && lignes.length > g.max
        ? optionHTML({ kind: 'portee', portee: g.id, cle: `plus:${g.id}`, cls: 'est-plus', titre: t(g.plus(lignes.length)), fin: '' })
        : '';
      return groupeHTML(g.id, g.label, montrees.map(r => optionHTML(depuisEntree(r.e, racines))).join('') + plus, { compte: lignes.length });
    }).join('');
    html += groupeHTML('continuer', 'Continuer la recherche', continuer.map(optionHTML).join(''));
    return html;
  }

  const SQUELETTES = Array.from({ length: 5 }, () => '<div class="rch-squelette" aria-hidden="true"><i></i><span><i></i><i></i></span></div>').join('');

  function rendre({ neuf = false } = {}) {
    const brut = saisie.value;
    const q = brut.trim().replace(/\s+/g, ' ');
    etat.q = q;
    if (!q) etat.portee = 'tout';
    champEl.classList.toggle('a-texte', Boolean(brut));
    effacer.hidden = !brut;
    dialogue.classList.toggle('is-vide', !q);
    dialogue.classList.toggle('is-chargement', Boolean(q) && !pret);
    if (neuf) dejaVues = new Set();
    options = [];
    avant.innerHTML = '';
    let html = '';
    if (!q) {
      filtres.hidden = true;
      total.textContent = '';
      html = accueilHTML();
    } else if (!pret) {
      filtres.hidden = true;
      avant.innerHTML = SQUELETTES;
    } else {
      html = resultatsHTML(q);
    }
    colonne.classList.toggle('est-rien', Boolean(q) && pret && !options.some(o => o.apercu));
    zone.classList.toggle('sans-apercu', !q || !pret || !options.some(o => o.apercu));
    liste.setAttribute('aria-label', q ? 'Résultats' : 'Suggestions');
    liste.innerHTML = `<span class="rch-curseur" aria-hidden="true"></span>${html}`;
    curseur = liste.firstElementChild;
    elements = $$('[role="option"]', liste);
    dejaVues = new Set(options.map(o => o.cle || `${o.kind}:${o.titre}`));
    liste.scrollTop = 0;
    cleApercu = null;
    actif = -1;
    saisie.removeAttribute('aria-activedescendant');
    if (q && pret && elements.length) activer(0, { glisser: false });
    else if (!q || !pret) apercu.innerHTML = '';
  }

  function positionDans(el) {
    let x = 0;
    let y = 0;
    for (let n = el; n && n !== liste; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  }
  function activer(i, { defiler = false, glisser = true } = {}) {
    if (!elements.length) return;
    actif = (i + elements.length) % elements.length;
    elements.forEach((el, k) => el.setAttribute('aria-selected', String(k === actif)));
    const el = elements[actif];
    saisie.setAttribute('aria-activedescendant', el.id);
    const { x, y } = positionDans(el);
    if (!glisser || !curseur.classList.contains('is-visible')) curseur.classList.add('sans-transition');
    curseur.style.transform = `translate(${x}px, ${y}px)`;
    curseur.style.width = `${el.offsetWidth}px`;
    curseur.style.height = `${el.offsetHeight}px`;
    curseur.classList.add('is-visible');
    curseur.getBoundingClientRect();
    curseur.classList.remove('sans-transition');
    if (defiler) {
      const haut = liste.scrollTop;
      const bas = haut + liste.clientHeight;
      const tete = el.closest('.rch-groupe')?.firstElementChild;
      const cible = el === tete?.nextElementSibling ? y - (tete.offsetHeight + 4) : y - 8;
      if (cible < haut) liste.scrollTo({ top: Math.max(0, cible), behavior: V.motion.full() ? 'smooth' : 'auto' });
      else if (y + el.offsetHeight + 8 > bas) liste.scrollTo({ top: y + el.offsetHeight + 8 - liste.clientHeight, behavior: V.motion.full() ? 'smooth' : 'auto' });
    }
    const o = options[actif];
    if (o && o.apercu && o.cle !== cleApercu) {
      cleApercu = o.cle;
      apercu.innerHTML = `<div class="rch-ap is-entree">${o.apercu()}</div>`;
    }
  }

  function annoncer(texte) {
    clearTimeout(annonceMinuteur);
    annonceMinuteur = setTimeout(() => { annonce.textContent = typo(texte); }, 650);
  }
  function memoriser(q) {
    const terme = q.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (terme.length < 2) return;
    const avantes = (store.get(CLE_RECENTES, []) || []).filter(r => typeof r === 'string' && plier(r).trim() !== plier(terme).trim());
    store.set(CLE_RECENTES, [terme, ...avantes].slice(0, 6));
  }
  function oublier(terme) {
    const reste = (store.get(CLE_RECENTES, []) || []).filter(r => r !== terme);
    store.set(CLE_RECENTES, reste);
    const garde = actif;
    rendre();
    if (garde >= 0 && elements.length) activer(Math.min(garde, elements.length - 1), { glisser: false });
    annoncer(`« ${terme} » retiré de l’historique.`);
  }
  function executer(o) {
    if (o.kind === 'terme') {
      saisie.value = o.terme;
      etat.exact = false;
      rendre({ neuf: true });
      saisie.focus();
      saisie.setSelectionRange(saisie.value.length, saisie.value.length);
    } else if (o.kind === 'portee') {
      etat.portee = o.portee;
      rendre({ neuf: true });
      saisie.focus();
    } else if (o.kind === 'effacer') {
      store.set(CLE_RECENTES, []);
      rendre();
      saisie.focus();
      annoncer('Historique de recherche effacé.');
    }
  }

  /* Ouverture et fermeture ----------------------------------------------------- */

  const anime = (el, images, reglages) => (el && el.animate ? el.animate(images, reglages) : null);
  /* Seules les animations lancées ici : celles des feuilles de style (fil de chargement, apparitions) continuent. */
  const animationsScript = () => dialogue.getAnimations({ subtree: true }).filter(a => !(window.CSSAnimation && a instanceof CSSAnimation) && !(window.CSSTransition && a instanceof CSSTransition));
  const fini = animations => Promise.all(animations.filter(Boolean).map(a => a.finished.catch(() => {})));
  const centre = r => [r.left + r.width / 2, r.top + r.height / 2];
  const hauteurEnTete = () => parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 72;
  const rayon = () => parseFloat(getComputedStyle(dialogue).getPropertyValue('--rch-rayon')) || 0;
  function rectSource() {
    if (!source || !source.isConnected) return null;
    const r = source.getBoundingClientRect();
    return r.width && r.bottom > 0 && r.top < window.innerHeight ? r : null;
  }
  /* Découpe du champ ramenée à la place de la loupe de l'en-tête. */
  function insetDepuis(r, c) {
    const w = Math.min(r.width, c.width);
    const h = Math.min(r.height, c.height);
    const gauche = clamp(r.left - c.left, 0, c.width - w);
    const haut = clamp(r.top - c.top, 0, c.height - h);
    return `inset(${haut}px ${c.width - gauche - w}px ${c.height - haut - h}px ${gauche}px round ${h / 2}px)`;
  }
  function insetCentre(c) {
    const m = Math.max(0, c.width / 2 - c.height / 2);
    return `inset(0px ${m}px 0px ${m}px round ${c.height / 2}px)`;
  }

  function animerOuverture() {
    const niveau = V.motion.level();
    if (niveau === 'none') return;
    if (niveau === 'reduced') { anime(dialogue, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }); return; }
    const h = hauteurEnTete();
    const R = rayon();
    const r = rectSource();
    const c = champEl.getBoundingClientRect();
    anime(voile, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: DOUX });
    anime(feuille, [{ clipPath: `inset(0px 0px calc(100% - ${h}px) 0px round 0px)` }, { clipPath: `inset(0px 0px 0px 0px round 0px 0px ${R}px ${R}px)` }], { duration: 640, easing: EMPH });
    anime(feuille, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    anime(champEl, [{ clipPath: r ? insetDepuis(r, c) : insetCentre(c) }, { clipPath: `inset(0px 0px 0px 0px round ${c.height / 2}px)` }], { duration: 580, easing: EMPH });
    if (r) {
      const [x1, y1] = centre(r);
      const [x2, y2] = centre(loupe.getBoundingClientRect());
      anime(loupe, [{ transform: `translate(${x1 - x2}px, ${y1 - y2}px)` }, { transform: 'none' }], { duration: 580, easing: EMPH });
    }
    anime(saisie, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 170, easing: EMPH, fill: 'backwards' });
    anime(fermerBtn, [{ opacity: 0, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 140, easing: EMPH, fill: 'backwards' });
    anime(pied, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 300, easing: DOUX, fill: 'backwards' });
  }

  function animerFermeture() {
    const niveau = V.motion.level();
    if (niveau === 'none') return Promise.resolve();
    const reglage = (duration, extra = {}) => ({ duration, easing: SORTIE, fill: 'forwards', ...extra });
    if (niveau === 'reduced') return fini([anime(dialogue, [{ opacity: 1 }, { opacity: 0 }], reglage(140, { easing: 'linear' }))]);
    const h = hauteurEnTete();
    const R = rayon();
    const r = rectSource();
    const c = champEl.getBoundingClientRect();
    const a = [];
    [filtres, zone, pied].forEach(el => a.push(anime(el, [{ opacity: 1 }, { opacity: 0 }], reglage(140, { easing: 'linear' }))));
    [saisie, effacer, fermerBtn].forEach(el => a.push(anime(el, [{ opacity: 1 }, { opacity: 0 }], reglage(120, { easing: 'linear' }))));
    a.push(anime(champEl, [{ clipPath: `inset(0px 0px 0px 0px round ${c.height / 2}px)` }, { clipPath: r ? insetDepuis(r, c) : insetCentre(c) }], reglage(340, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })));
    if (r) {
      const [x1, y1] = centre(r);
      const [x2, y2] = centre(loupe.getBoundingClientRect());
      a.push(anime(loupe, [{ transform: 'none' }, { transform: `translate(${x1 - x2}px, ${y1 - y2}px)` }], reglage(340, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })));
    }
    a.push(anime(feuille, [{ clipPath: `inset(0px 0px 0px 0px round 0px 0px ${R}px ${R}px)` }, { clipPath: `inset(0px 0px calc(100% - ${h}px) 0px round 0px)` }], reglage(380)));
    a.push(anime(feuille, [{ opacity: 1 }, { opacity: 0 }], reglage(150, { delay: 300, easing: 'linear' })));
    a.push(anime(voile, [{ opacity: 1 }, { opacity: 0 }], reglage(420, { easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })));
    return fini(a);
  }

  const declencheurs = ouvert => $$('[data-recherche-ouvrir]').forEach(el => el.setAttribute('aria-expanded', String(ouvert)));

  function ouvrir(declencheur) {
    monter();
    if (dialogue.open && !fermeture) { saisie.focus(); saisie.select(); return; }
    if (fermeture) return;
    if (!pret) prechauffer().then(() => { if (dialogue.open && (etat.q || actif < 0)) rendre(); });
    source = declencheur && declencheur.isConnected ? declencheur : $('[data-recherche-ouvrir]');
    saisie.placeholder = typo(window.innerWidth < 560 ? 'Rechercher sur Vysora' : 'Rechercher une création, un sujet, un outil…');
    saisie.value = '';
    etat.portee = 'tout';
    etat.exact = false;
    root.classList.add('rch-ouverte');
    root.classList.toggle('rch-gouttiere', window.innerWidth > root.clientWidth);
    dialogue.classList.add('is-ouverture');
    dialogue.showModal();
    saisie.focus({ preventScroll: true });
    declencheurs(true);
    rendre({ neuf: true });
    animerOuverture();
    setTimeout(() => dialogue.classList.remove('is-ouverture'), 900);
  }

  function fermer({ instant = false } = {}) {
    if (!dialogue || !dialogue.open || fermeture) return;
    root.classList.remove('rch-ouverte');
    const fin = () => {
      dialogue.close();
      animationsScript().forEach(a => a.cancel());
      root.classList.remove('rch-gouttiere');
      declencheurs(false);
      fermeture = null;
    };
    if (instant) { animationsScript().forEach(a => a.cancel()); fin(); return; }
    animationsScript().forEach(a => a.finish());
    fermeture = animerFermeture().then(fin);
  }

  function monter() {
    if (dialogue) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="recherche" aria-label="Recherche sur Vysora" data-recherche>
  <div class="rch-voile" data-rch-fermer></div>
  <div class="rch-feuille">
    <div class="rch-grille">
      <a class="rch-logo" href="index.html" aria-label="Vysora, accueil"><img src="assets/logos/vysora%20Bleu-Black.png" alt="" width="337" height="122"></a>
      <div class="rch-champ">
        ${ic('search', 'rch-loupe')}
        <input class="rch-saisie" type="search" role="combobox" aria-expanded="true" aria-controls="rch-liste" aria-autocomplete="list" aria-label="Rechercher sur Vysora" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" maxlength="120">
        <button class="rch-effacer" type="button" aria-label="Effacer la recherche" hidden>${ic('close')}</button>
        <span class="rch-fil" aria-hidden="true"></span>
      </div>
      <button class="rch-fermer" type="button" data-rch-fermer><span class="rch-fermer-ordi">Fermer</span><span class="rch-fermer-mobile">Annuler</span><kbd aria-hidden="true">Échap</kbd></button>
      <div class="rch-filtres" role="group" aria-label="Type de résultat" hidden></div>
      <div class="rch-zone">
        <div class="rch-col">
          <div class="rch-avant"></div>
          <div class="rch-liste" id="rch-liste" role="listbox" aria-label="Suggestions"></div>
        </div>
        <div class="rch-apercu" aria-hidden="true"></div>
      </div>
      <div class="rch-pied" aria-hidden="true"><div class="rch-pied-in"><span>${touche(ic('haut'))}${touche(ic('bas'))}pour choisir</span><span>${touche(ic('entree'))}pour ouvrir</span><span>${touche('Échap')}pour fermer</span><span class="rch-total"></span></div></div>
    </div>
    <p class="sr-only" role="status" aria-live="polite"></p>
  </div>
</dialog>`);
    dialogue = $('[data-recherche]');
    voile = $('.rch-voile', dialogue);
    feuille = $('.rch-feuille', dialogue);
    champEl = $('.rch-champ', dialogue);
    loupe = $('.rch-loupe', dialogue);
    saisie = $('.rch-saisie', dialogue);
    effacer = $('.rch-effacer', dialogue);
    fermerBtn = $('.rch-fermer', dialogue);
    filtres = $('.rch-filtres', dialogue);
    zone = $('.rch-zone', dialogue);
    colonne = $('.rch-col', dialogue);
    avant = $('.rch-avant', dialogue);
    liste = $('.rch-liste', dialogue);
    apercu = $('.rch-apercu', dialogue);
    pied = $('.rch-pied', dialogue);
    total = $('.rch-total', dialogue);
    annonce = $('[role="status"]', dialogue);

    saisie.addEventListener('input', () => { etat.exact = false; rendre(); });
    saisie.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!elements.length) return;
        const pas = event.key === 'ArrowDown' ? 1 : -1;
        activer(actif < 0 ? (pas > 0 ? 0 : elements.length - 1) : actif + pas, { defiler: true });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (event.isComposing) return;
        if (elements[actif]) elements[actif].click();
        else if (etat.q && pret) { memoriser(etat.q); location.href = `explorer.html?q=${encodeURIComponent(etat.q)}`; }
      } else if ((event.key === 'Delete' || (event.key === 'Backspace' && !saisie.value)) && options[actif]?.kind === 'terme' && options[actif].cle.startsWith('recente:')) {
        event.preventDefault();
        oublier(options[actif].terme);
      }
    });
    effacer.addEventListener('click', () => { saisie.value = ''; rendre({ neuf: true }); saisie.focus(); });
    dialogue.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); fermer(); }
    });
    dialogue.addEventListener('cancel', event => { event.preventDefault(); fermer(); });
    dialogue.addEventListener('click', event => {
      if (event.target.closest('[data-rch-fermer]')) { fermer(); return; }
      const exact = event.target.closest('[data-rch-exact]');
      if (exact) { etat.exact = true; rendre({ neuf: true }); saisie.focus(); }
    });
    filtres.addEventListener('click', event => {
      const bouton = event.target.closest('[data-rch-portee]');
      if (!bouton) return;
      etat.portee = bouton.dataset.rchPortee;
      rendre({ neuf: true });
      if (event.detail) saisie.focus();
      else $(`[data-rch-portee="${etat.portee}"]`, filtres)?.focus();
    });
    filtres.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const boutons = $$('button', filtres);
      const i = boutons.indexOf(document.activeElement);
      if (i < 0) return;
      event.preventDefault();
      boutons[(i + (event.key === 'ArrowRight' ? 1 : -1) + boutons.length) % boutons.length].focus();
    });
    liste.addEventListener('pointermove', event => {
      const el = event.target.closest('[role="option"]');
      if (el && Number(el.dataset.i) !== actif) activer(Number(el.dataset.i));
    });
    liste.addEventListener('click', event => {
      const oubli = event.target.closest('[data-rch-oublier]');
      if (oubli) { event.preventDefault(); event.stopPropagation(); oublier(oubli.dataset.rchOublier); return; }
      const el = event.target.closest('[role="option"]');
      if (!el) return;
      const o = options[Number(el.dataset.i)];
      if (!o) return;
      if (o.href) {
        if (etat.q) memoriser(etat.q);
        const nouvelOnglet = event.ctrlKey || event.metaKey || event.shiftKey;
        if (!nouvelOnglet && new URL(o.href, location.href).pathname === location.pathname) fermer({ instant: true });
        return;
      }
      event.preventDefault();
      executer(o);
    });
    window.addEventListener('pageshow', event => { if (event.persisted && dialogue.open) fermer({ instant: true }); });
    window.addEventListener('resize', () => { if (dialogue.open && elements[actif]) activer(actif, { glisser: false }); });
    E.on(() => { if (dialogue.open) rendre(); });
  }

  return { ouvrir, fermer, prechauffer };
})();
