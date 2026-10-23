'use strict';

/* Rend consultable sur la fiche la création préparée dans la page Publier.
   fiche-creation.html?id=ma-creation&apercu=1 : aperçu du brouillon ouvert dans l'éditeur.
   fiche-creation.html?id=ma-creation : création publiée, enregistrée sur cet appareil. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('id') !== 'ma-creation') return;
  const D = window.VYSORA_DATA;
  const details = window.VYSORA_CREATION_DETAILS;
  if (!D || !details) return;
  const apercu = params.has('apercu');

  let source = null;
  if (apercu) {
    try {
      const editeur = window.parent !== window ? window.parent.VysoraPublier : null;
      if (editeur) source = { brouillon: JSON.parse(JSON.stringify(editeur.brouillon())), auteur: editeur.auteur() };
    } catch { source = null; }
  }
  if (!source) { try { source = JSON.parse(localStorage.getItem('vysora-publier-fiche')); } catch { source = null; } }
  if (!source || !source.brouillon) return;

  const b = source.brouillon;
  const auteur = source.auteur || { nom: 'Vous', niveau: '' };
  const MOMENTS = { correction: 'Correction', refus: 'Refus', echec: 'Échec', outil: 'Changement d’outil', verification: 'Vérification', decouverte: 'Découverte' };
  const TITRES = {
    correction: 'Corriger la demande', refus: 'Refuser une proposition de l’IA', echec: 'Comprendre un échec',
    outil: 'Changer d’outil en cours de route', verification: 'Vérifier le résultat avant de continuer', decouverte: 'Une découverte en cours de route'
  };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const court = iso => { const [, m, j] = iso.slice(0, 10).split('-').map(Number); return `${j} ${MOIS[m - 1]}`; };
  const extrait = (s, n) => { const v = String(s || '').replace(/\s+/g, ' ').trim(); return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v; };

  const etapes = b.type === 'projet' ? b.etapes : b.etapes.slice(0, 1);
  const visibles = s => (b.type === 'prompt' ? s.echanges.slice(0, 1) : s.echanges).filter(x => x.garde);
  const echanges = etapes.flatMap(visibles);
  const configs = etapes.flatMap(s => s.configs).filter(c => c.outil);
  const outils = [];
  configs.forEach(c => { if (!outils.some(o => o[0] === c.outil)) outils.push([c.outil, c.modele]); });

  const moments = [];
  etapes.forEach((s, si) => {
    if (b.type === 'projet' && s.moment) moments.push({ m: s.moment, ou: `Étape ${si + 1}` });
    visibles(s).forEach((x, xi) => { if (x.moment) moments.push({ m: x.moment, ou: b.type === 'projet' ? `Étape ${si + 1}, échange ${xi + 1}` : b.type === 'prompt' ? 'Le prompt' : `Échange ${xi + 1}` }); });
  });

  let couverture = b.medias[0];
  if (!couverture) for (let i = echanges.length - 1; i >= 0 && !couverture; i -= 1) couverture = echanges[i].images[echanges[i].images.length - 1];
  const demo = b.liens.find(l => ['demo', 'depot', 'video'].includes(l.type) && /^https:\/\//.test(l.url));
  /* Sans image : le texte, le code ou le fichier obtenu, sinon la démo. */
  const texte = !couverture && b.resultatTexte;
  const media = couverture
    ? { kind: 'image', src: couverture.grand || couverture.src, alt: couverture.alt || b.titre, portrait: !!couverture.portrait }
    : texte
      ? { kind: 'mock', mock: `${texte.kind}-auteur`, texte: texte.texte, nom: texte.nom, alt: b.titre }
      : { kind: 'mock', mock: demo ? 'lien' : 'vide', url: demo ? demo.url : '', alt: b.titre };

  const premier = echanges[0];
  const etapesFiche = b.type === 'projet'
    ? etapes.map(s => { const x = visibles(s)[0]; return [s.titre || 'Étape sans titre', x ? x.prompt : '', s.recit]; })
    : b.type === 'iteration'
      ? echanges.map((x, i) => [`Échange ${i + 1}`, x.prompt, x.reponse || (x.images.length ? 'Résultat présenté en image.' : '')])
      : undefined;
  const essai = b.type === 'prompt' && premier && premier.essais > 1 && premier.selection === 'meilleur' ? `Résultat retenu parmi ${premier.essais} essais` : 'Résultat obtenu';
  const contexte = configs.find(c => c.contexte);

  D.creations.push({
    id: 'ma-creation', title: b.titre || 'Création sans titre', type: b.type, category: b.categorie || 'Création',
    author: auteur.nom, level: auteur.niveau, config: outils.map(([o, m]) => (m ? `${o} · ${m}` : o)).join(' et ') || 'Outil à préciser',
    media, steps: b.type === 'projet' ? etapes.map(s => (s.moment || visibles(s).some(x => x.moment) ? 1 : 0)) : (b.type === 'iteration' ? echanges.map(x => (x.moment ? 1 : 0)) : [moments.length ? 1 : 0]),
    useful: 0, week: 0, repro: 0, success: null, published: court(b.publieLe || `${D.today}T12:00`),
    own: true, apercu, statut: b.statut, agent: !!b.agent, licence: b.licence, limites: b.limites, reglages: (configs[0] && configs[0].reglages) || '', moments
  });
  const premierMoment = moments[0];
  details['ma-creation'] = {
    intent: b.objectif || b.titre,
    prompt: premier ? premier.prompt : '',
    kind: premierMoment ? MOMENTS[premierMoment.m.type] : 'Moment clé',
    moment: premierMoment ? TITRES[premierMoment.m.type] : 'Aucun moment clé noté',
    note: premierMoment ? premierMoment.m.texte : 'L’auteur n’a pas encore noté de moment clé.',
    moments: moments.map(({ m, ou }) => ({ kind: MOMENTS[m.type], titre: TITRES[m.type], note: m.texte, ou })),
    adapt: [],
    format: essai,
    steps: etapesFiche,
    context: contexte ? extrait(contexte.contexte, 90) : b.type === 'projet' ? 'Plusieurs outils, une étape après l’autre' : b.type === 'iteration' ? 'Même conversation pour tous les échanges' : 'Une seule demande'
  };

  if (apercu) {
    document.documentElement.setAttribute('data-apercu', '');
    document.head.insertAdjacentHTML('beforeend', '<style>html[data-apercu] .site-header, html[data-apercu] .site-footer, html[data-apercu] .skip-link, html[data-apercu] .tweaks-trigger, html[data-apercu] .tweaks, html[data-apercu] .toast, html[data-apercu] .etat-bandeau, html[data-apercu] .creation-status, html[data-apercu] .creation-bottom { display: none !important; } html[data-apercu] .creation-shell { padding-top: 28px; }</style>');
  }
})();
