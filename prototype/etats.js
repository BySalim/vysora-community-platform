'use strict';

/* États de la personne qui consulte le site : session, rôle, niveau, compte,
   notifications. Ils valent pour toutes les pages, se règlent dans le panneau
   Tweaks (onglet « États ») et se retrouvent sur <html> en attributs data-*.
   Chargé dans <head> sans defer : la page s'affiche d'emblée dans le bon état.
   Le catalogue des états et les règles à suivre sont dans README.md (« Règles de développement »). */

window.VysoraEtats = (() => {
  const KEY = 'vysora-etats';
  const root = document.documentElement;
  const estMembre = etat => etat.session === 'membre';

  const GROUPES = [
    { name: 'session', legend: 'Session', options: [['visiteur', 'Visiteur'], ['membre', 'Membre connecté']] },
    { name: 'role', legend: 'Rôle', si: estMembre, options: [['membre', 'Membre'], ['moderateur', 'Modérateur'], ['admin', 'Administrateur']] },
    { name: 'niveau', legend: 'Niveau', si: estMembre, options: [['curieux', 'Curieux'], ['apprenti', 'Apprenti'], ['artisan', 'Artisan'], ['expert', 'Expert'], ['maitre', 'Maître']] },
    { name: 'compte', legend: 'Compte', si: estMembre, options: [['actif', 'Actif'], ['email', 'E-mail à vérifier'], ['conditions', 'Conditions à accepter'], ['suspendu', 'Suspendu']] },
    { name: 'notifications', legend: 'Notifications', si: estMembre, options: [['nouvelles', '3 non lues'], ['lues', 'Toutes lues']] },
    { name: 'cookies', legend: 'Cookies', options: [['a-choisir', 'Choix à faire'], ['choisis', 'Choix retenu']] }
  ];
  const INITIAL = { session: 'visiteur', role: 'membre', niveau: 'apprenti', compte: 'actif', notifications: 'nouvelles', cookies: 'a-choisir' };
  const PERMIS = Object.fromEntries(GROUPES.map(g => [g.name, g.options.map(([value]) => value)]));

  /* Niveaux et seuils de réputation (RG-84) ; points du membre simulé à chaque niveau. */
  const NIVEAUX = {
    curieux: { nom: 'Curieux', seuil: 0, points: 34 },
    apprenti: { nom: 'Apprenti', seuil: 50, points: 182 },
    artisan: { nom: 'Artisan', seuil: 300, points: 640 },
    expert: { nom: 'Expert', seuil: 1500, points: 1870 },
    maitre: { nom: 'Maître', seuil: 5000, points: 5310 }
  };
  const ROLES = { membre: 'Membre', moderateur: 'Modérateur', admin: 'Administrateur' };
  const MOI = { nom: 'Clarisse Mendy', pseudo: 'clarisse-mendy', nonLues: 3 };
  const DATES = { suspension: '23 octobre 2026', conditions: '15 octobre 2026' };

  const lire = () => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { saved = {}; }
    const etat = { ...INITIAL };
    Object.keys(INITIAL).forEach(name => { if (PERMIS[name].includes(saved[name])) etat[name] = saved[name]; });
    return etat;
  };
  let etat = lire();
  const abonnes = new Set();

  function appliquer() {
    root.setAttribute('data-session', etat.session);
    ['role', 'niveau', 'compte', 'notifications'].forEach(name => {
      if (estMembre(etat)) root.setAttribute(`data-${name}`, etat[name]);
      else root.removeAttribute(`data-${name}`);
    });
  }
  const enregistrer = () => { try { localStorage.setItem(KEY, JSON.stringify(etat)); } catch { /* stockage indisponible */ } };
  const prevenir = changed => abonnes.forEach(fn => fn(etat, changed));

  function set(patch) {
    const changed = Object.keys(patch).filter(name => PERMIS[name] && PERMIS[name].includes(patch[name]) && etat[name] !== patch[name]);
    if (!changed.length) return;
    changed.forEach(name => { etat[name] = patch[name]; });
    etat = { ...etat };
    enregistrer();
    appliquer();
    prevenir(changed);
  }
  const reset = () => set({ ...INITIAL });

  /* Une autre fenêtre du prototype a changé d'état : on suit. */
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    const next = lire();
    const changed = Object.keys(INITIAL).filter(name => next[name] !== etat[name]);
    if (!changed.length) return;
    etat = next;
    appliquer();
    prevenir(changed);
  });

  /* Droits (doc 03, section 3) : renvoie null si l'action est permise,
     sinon la raison du refus : connexion, email, conditions, suspendu, niveau ou role. */
  function raison(action = 'contribuer', e = etat) {
    if (!estMembre(e)) return 'connexion';
    if (action === 'parametres') return null;
    if (e.compte !== 'actif') return e.compte;
    if (action === 'proposer-cas' && e.role === 'membre' && !['expert', 'maitre'].includes(e.niveau)) return 'niveau';
    if (action === 'moderer' && e.role === 'membre') return 'role';
    if (action === 'administrer' && e.role !== 'admin') return 'role';
    return null;
  }
  const peut = (action, e) => raison(action, e) === null;

  /* Limites de publication par 24 h (RG-85) ; les modérateurs et administrateurs n'en ont pas. */
  function limite(type = 'creations', e = etat) {
    if (!estMembre(e) || e.role !== 'membre') return Infinity;
    const table = { creations: [3, 10, 10], sujets: [3, 10, 10], reponses: [20, 100, 100] }[type];
    return { curieux: table[0], apprenti: table[1], artisan: table[2] }[e.niveau] ?? Infinity;
  }

  appliquer();

  /* Ce que le gabarit du site rend sur toutes les pages, accueil compris : ajouts du socle
     (socle.css : règle d'un badge au doigt, « Mes outils » sur téléphone…), barre de défilement
     superposée sur les écrans à barres classiques (UI-01) et fenêtre des cookies (LEG-03). Les
     barres classiques (Windows, Linux) se repèrent avant le premier affichage, comme dans le
     gabarit du site, sauf en contraste élevé. La classe « js » se pose ici, comme dans le
     gabarit du site : sans elle, cookies.css masque la fenêtre des cookies, qui s'ouvrirait
     pourtant en fenêtre modale et figerait la page (défilement et clics bloqués). */
  (() => {
    root.classList.add('js');
    const sonde = document.createElement('div');
    sonde.style.cssText = 'position:absolute;top:-99px;width:60px;height:60px;overflow:scroll;scrollbar-width:thin';
    root.appendChild(sonde);
    const classiques = sonde.offsetWidth > sonde.clientWidth;
    root.removeChild(sonde);
    if (classiques && !matchMedia('(forced-colors: active)').matches) root.classList.add('barres-classiques');
    const tete = document.head || root;
    ['socle.css', 'defilement.css', 'cookies.css'].forEach(href => {
      const lien = document.createElement('link');
      lien.rel = 'stylesheet';
      lien.href = href;
      tete.appendChild(lien);
    });
    ['defilement.js', 'choix-cookies.js'].forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      tete.appendChild(script);
    });
  })();

  return {
    GROUPES, INITIAL, NIVEAUX, ROLES, MOI, DATES,
    get: () => etat,
    membre: () => estMembre(etat),
    niveau: () => NIVEAUX[etat.niveau],
    set, reset, raison, peut, limite,
    on: fn => { abonnes.add(fn); return () => abonnes.delete(fn); }
  };
})();
