'use strict';

/* Page Notifications (EC-16, F-81) : boîte de réception du membre connecté.
   À gauche, la liste compacte ; à droite, le volet de lecture qui montre la notification dans son
   contexte (fil de discussion, résultat d'un essai, badge…) et permet d'agir sur place. Sans
   sélection, le volet présente ce qui s'est passé depuis la dernière visite. Sur tablette et mobile,
   ou avec le réglage « Dépliage dans la liste », la notification se déplie sous sa ligne.
   Lire une notification la marque comme lue. L'état lu ou non lu, les réponses et les réponses
   acceptées sont gardés sur l'appareil (vysora-notifications) ; le nombre de non lues est repris
   par l'en-tête de toutes les pages (vysora-notifications-nonlues, commun.js). */

(() => {
  const V = window.Vysora;
  const D = V.D;
  const E = V.etats;
  const N = window.VYSORA_NOTIFICATIONS;
  const PRO = window.VYSORA_PROFIL;
  const PUB = window.VYSORA_PUBLIER;
  const { $, $$, t, esc, icon, fmt, typo } = V;
  const CLE = 'vysora-notifications';
  const CLE_NB = 'vysora-notifications-nonlues';
  const NIVEAUX = ['curieux', 'apprenti', 'artisan', 'expert', 'maitre'];
  const PAGE = 16;
  const large = window.matchMedia('(min-width: 1100px)');

  const VUES = [['toutes', 'Toutes'], ['non-lues', 'Non lues'], ['a-traiter', 'À traiter']];
  const TYPES = [
    { id: 'tout', label: 'Tous les types' },
    { id: 'echanges', label: 'Échanges', types: ['commentaire', 'reponse-commentaire', 'reponse-sujet', 'reponse-acceptee'] },
    { id: 'preuves', label: 'Essais et votes', types: ['reproduction', 'votes', 'variante', 'obsolescence'] },
    { id: 'progression', label: 'Progression', types: ['badge', 'niveau', 'defi', 'cas-valide', 'cas-refuse'] },
    { id: 'moderation', label: 'Modération', types: ['masque', 'retabli', 'decision'] }
  ];
  const typeDeNotif = type => (TYPES.find(c => c.types && c.types.includes(type)) || TYPES[0]).id;
  const SUJETS = { question: 'question', clinique: 'clinique du prompt', astuce: 'astuce', retour: 'retour d’expérience', discussion: 'discussion' };
  const RESULTATS = { reussi: ['check-circle', 'Réussi'], partiel: ['half-circle', 'Résultat partiel'], echec: ['x-circle', 'Échec'] };
  const COURTS = {
    iteration: ['votre affiche de Ziguinchor', 'f'], prompt: ['votre script de renommage de photos', 'm'], projet: ['votre réservation des sorties en pirogue', 'f'],
    traduction: ['votre traduction avec glossaire', 'f'], devis: ['votre formulaire de devis', 'm'], sauvegarde: ['votre sauvegarde des réservations', 'f']
  };

  const params = new URLSearchParams(location.search);
  let settings = {};
  const ui = {
    vue: VUES.some(([id]) => id === params.get('vue')) ? params.get('vue') : 'toutes',
    type: TYPES.some(c => c.id === params.get('type')) ? params.get('type') : 'tout',
    selection: params.get('notification') || null,
    focusId: null,
    limite: PAGE,
    brouillons: {},
    confirmer: null,
    animer: true,
    interne: false,
    recues: [],
    attente: null,
    minuteur: null,
    annulation: null,
    minuteurFait: null,
    nouvelle: null,
    jaugeVue: false
  };

  /* État gardé sur l'appareil ---------------------------------------------------------------
     lues : { id: true | false } quand il diffère de l'état de départ ; reponses : { id: { texte, at } } ;
     acceptees : { sujet: id de la notification acceptée } ; email : préférence d'envoi (F-06, F-81). */
  const lireEtat = () => {
    const e = V.store.get(CLE, {}) || {};
    const objet = v => (v && typeof v === 'object' ? v : {});
    return { lues: objet(e.lues), reponses: objet(e.reponses), acceptees: objet(e.acceptees), email: typeof e.email === 'boolean' ? e.email : true };
  };
  let etat = lireEtat();
  const ecrireEtat = () => V.store.set(CLE, etat);

  /* Dates ------------------------------------------------------------------------------------ */

  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const jourDe = iso => iso.slice(0, 10);
  const dateDe = iso => new Date(`${jourDe(iso)}T12:00:00`);
  const heure = iso => { const [h, m] = iso.slice(11, 16).split(':').map(Number); return `${h} h ${String(m).padStart(2, '0')}`; };
  const ecart = iso => V.daysAgo(jourDe(iso));
  const minutes = iso => Math.round((new Date(N.maintenant) - new Date(iso)) / 60000);
  function quand(iso) {
    const m = minutes(iso);
    if (m < 1) return 'à l’instant';
    if (m < 60 && ecart(iso) === 0) return `il y a ${m} min`;
    const n = ecart(iso);
    if (n <= 0) return `aujourd’hui à ${heure(iso)}`;
    if (n === 1) return `hier à ${heure(iso)}`;
    const d = dateDe(iso);
    return `le ${d.getDate()} ${MOIS[d.getMonth()]} à ${heure(iso)}`;
  }
  /* Heure courte d'une ligne de la liste. */
  function courte(iso) {
    const m = minutes(iso);
    if (m < 1) return 'à l’instant';
    if (m < 60 && ecart(iso) === 0) return `${m} min`;
    if (ecart(iso) <= 1) return heure(iso);
    const d = dateDe(iso);
    return ecart(iso) <= 6 ? `${JOURS[d.getDay()]} ${d.getDate()}` : `${d.getDate()} ${MOIS[d.getMonth()]}`;
  }
  const dateLongue = iso => { const d = dateDe(iso); return `${d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`; };
  const lundi = () => { const d = new Date(`${D.today}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
  const GROUPES = [['aujourdhui', 'Aujourd’hui', n => n <= 0], ['hier', 'Hier', n => n === 1], ['semaine', 'Les 7 derniers jours', n => n <= 7], ['avant', 'Plus tôt', () => true]];

  /* Niveau, créations et notifications du membre ----------------------------------------------- */

  const cleNiveau = () => (NIVEAUX.includes(E.get().niveau) ? E.get().niveau : 'apprenti');
  const profil = () => PRO.niveaux[cleNiveau()];
  const slug = nom => V.normalize(nom).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const peutContribuer = () => E.peut('contribuer');
  const lecture = () => (settings.lecture !== 'depliage' && large.matches ? 'volet' : 'deplie');

  function typeDe(chemin) {
    const ps = chemin.filter(x => x.kind === 'prompt');
    const es = chemin.filter(x => x.kind === 'etape');
    if (es.length || new Set(ps.map(p => p.outil).filter(Boolean)).size > 1) return 'projet';
    return ps.length >= 2 ? 'iteration' : 'prompt';
  }

  function notifications() {
    const niv = cleNiveau();
    const pro = profil();
    const items = N.liste.filter(n => !n.niveaux || n.niveaux.includes(niv)).map(n => ({ ...n }));
    pro.badges.filter(([, date]) => date >= N.depuis).forEach(([nom, date]) => {
      items.push({ id: `b-${slug(nom)}`, type: 'badge', at: `${date}T${N.heuresBadges[nom] || '19:00'}`, badge: nom, nonLue: (N.badgesNonLus[niv] || []).includes(nom) });
    });
    const palier = N.niveaux[niv];
    if (palier && jourDe(palier.at) >= N.depuis) items.push({ id: `l-${niv}`, type: 'niveau', at: palier.at, niveau: niv, texte: palier.texte, action: palier.action });
    if (niv !== 'curieux') {
      if (settings.alerte === 'obsolescence') items.push({ ...N.alertes.obsolescence, nonLue: true });
      if (settings.alerte === 'masque') items.push({ ...N.alertes.masque, nonLue: true });
      if (settings.alerte === 'retabli') items.push({ ...N.alertes.masque }, { ...N.alertes.retabli, nonLue: true });
    }
    if (E.get().compte === 'suspendu') items.push({ ...N.compte.avertissement }, { ...N.compte.suspension, nonLue: true, epinglee: true });
    ui.recues.forEach(n => items.push({ ...n }));
    return items.filter(n => jourDe(n.at) >= pro.depuis).sort((a, b) => b.at.localeCompare(a.at));
  }
  let liste = [];
  const parId = id => liste.find(n => n.id === id);

  const nonLue = n => (n.id in etat.lues ? !etat.lues[n.id] : !!n.nonLue);
  const nbNonLues = () => liste.filter(nonLue).length + (ui.attente ? 1 : 0);
  const reponseDe = n => etat.reponses[n.id] || n.reponse || null;
  const sujetResolu = sujet => !!etat.acceptees[sujet] || liste.some(x => x.sujet === sujet && x.acceptee);
  const estAcceptee = n => !!n.acceptee || etat.acceptees[n.sujet] === n.id;

  /* À traiter : une question qui vous est posée, une réponse à départager, une alerte sur une création. */
  function aTraiter(n) {
    if (['obsolescence', 'masque', 'cas-refuse'].includes(n.type)) return true;
    if (reponseDe(n)) return false;
    if (n.type === 'commentaire' || n.type === 'reponse-commentaire') return /\?/.test(n.texte);
    if (n.type === 'reponse-sujet') return !sujetResolu(n.sujet);
    return false;
  }

  /* Contenu concerné ---------------------------------------------------------------------------- */

  function cible(n) {
    if (n.creation) {
      const ex = PUB.exemples[n.creation];
      const c = PRO.creations.find(x => x.id === n.creation);
      return { cle: `creation:${n.creation}`, titre: ex.titre, type: typeDe(ex.chemin), categorie: ex.categorie, publie: ex.publie, media: c && c.media, court: COURTS[n.creation], href: `profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}&creation=${encodeURIComponent(n.creation)}`, ouvrir: 'Ouvrir la création' };
    }
    if (n.fiche) {
      const c = D.creations.find(x => x.id === n.fiche);
      return { cle: `fiche:${n.fiche}`, titre: c.title, type: c.type, categorie: c.category, auteur: c.author, media: c.media, config: c.config, href: `fiche-creation.html?id=${encodeURIComponent(n.fiche)}#commentaires`, ouvrir: 'Voir la conversation' };
    }
    if (n.sujet) {
      const s = N.sujets[n.sujet];
      return { cle: `sujet:${n.sujet}`, titre: s.titre, kind: s.kind, href: `forum.html?sujet=${encodeURIComponent(n.sujet)}${n.ancre ? `#reponse-${encodeURIComponent(n.ancre)}` : ''}`, ouvrir: 'Ouvrir le sujet' };
    }
    if (n.cas) return { cle: `cas:${slug(n.cas.titre)}`, titre: n.cas.titre, href: 'apprendre.html?rubrique=bon-reflexe', ouvrir: 'Voir Bon réflexe' };
    if (n.defi) return { cle: `defi:${slug(n.defi.titre)}`, titre: n.defi.titre, href: 'defis.html', ouvrir: 'Voir les défis' };
    if (n.type === 'badge' || n.type === 'niveau') return { cle: 'progression', titre: 'Votre progression', href: n.type === 'badge' ? `profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}#pf-t-badges` : 'classements.html#regles', ouvrir: n.type === 'badge' ? 'Voir mes badges' : 'Voir les niveaux' };
    return { cle: 'compte', titre: 'Votre compte', href: null };
  }

  /* Textes ---------------------------------------------------------------------------------------- */

  const qui = nom => `<b class="nt-qui">${t(nom)}</b>`;
  const rang = r => `${r}<sup>${r === 1 ? 're' : 'e'}</sup>`;
  const motSujet = c => SUJETS[c.kind] || 'sujet';
  const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
  const enumerer = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`);
  const niveauDe = nom => N.membres[nom] || '';
  /* « de » ou « d’ » devant un prénom. */
  const deNom = nom => (/^[aeiouyh]/i.test(V.normalize(nom)) ? `d’${nom}` : `de ${nom}`);
  function votants(pars, html = true) {
    const nom = p => (html ? qui(p) : p);
    if (pars.length === 1) return `${nom(pars[0])} a voté`;
    if (pars.length === 2) return `${nom(pars[0])} et ${nom(pars[1])} ont voté`;
    return `${nom(pars[0])}, ${nom(pars[1])} et ${V.plural(pars.length - 2, 'autre membre', 'autres membres')} ont voté`;
  }

  /* Ligne de la liste : qui fait quoi, sur quel contenu, et un extrait. */
  function entete(n) {
    const c = cible(n);
    const extrait = s => `<span class="nt-guillemets">${t(`« ${s} »`)}</span>`;
    const points = p => `<span class="nt-points">${t(`+${p} points`)}</span>`;
    switch (n.type) {
      case 'commentaire': return { quoi: `${qui(n.par)} a commenté`, titre: c.titre, extrait: extrait(n.texte) };
      case 'reponse-commentaire': return { quoi: `${qui(n.par)} a répondu à votre commentaire`, titre: c.titre, extrait: extrait(n.texte) };
      case 'reponse-sujet': return { quoi: `${qui(n.par)} a répondu à votre ${t(motSujet(c))}`, titre: c.titre, extrait: extrait(n.texte) };
      case 'reponse-acceptee': return { quoi: `${qui(n.par)} a accepté votre réponse`, titre: c.titre, extrait: points(n.points) };
      case 'reproduction': {
        const [ic, label] = RESULTATS[n.resultat];
        return { quoi: `${qui(n.par)} a essayé`, titre: c.titre, extrait: `<span class="nt-res" data-resultat="${n.resultat}">${icon(ic, 'icon-xs')}${t(label)}</span><span class="nt-sep" aria-hidden="true">·</span>${t(`${n.outil} · ${n.modele}`)}` };
      }
      case 'variante': return { quoi: `${qui(n.par)} a publié une variante`, titre: n.variante.titre, extrait: t(`de « ${c.titre} »`) };
      case 'votes': return { quoi: `${votants(n.pars)} ${t('« Utile »')}`, titre: n.reponse ? `Votre réponse à « ${c.titre} »` : c.titre, extrait: points(n.points) };
      case 'obsolescence': return { quoi: 'Signalée comme ne fonctionnant plus', titre: c.titre, extrait: t(`Avec ${n.modele} · ${n.membres} membres`) };
      case 'masque': return { quoi: 'Masquée par la modération', titre: c.titre, extrait: t(n.motif) };
      case 'retabli': return { quoi: 'De nouveau visible', titre: c.titre, extrait: t(n.texte) };
      case 'badge': return { quoi: 'Badge obtenu', titre: `« ${n.badge} »`, extrait: t((PRO.badges[n.badge] || {}).rule || '') };
      case 'niveau': return { quoi: 'Niveau atteint', titre: E.NIVEAUX[n.niveau].nom, extrait: t(`${fmt(E.NIVEAUX[n.niveau].seuil)} points et plus`) };
      case 'cas-valide': return { quoi: 'Cas Bon réflexe validé', titre: c.titre, extrait: points(n.points) };
      case 'cas-refuse': return { quoi: 'Cas Bon réflexe à corriger', titre: c.titre, extrait: t(n.motif) };
      case 'defi': return { quoi: `Défi clos${t(' :')} ${rang(n.rang)} sur ${fmt(n.defi.participants)}`, titre: c.titre, extrait: points(n.points) };
      case 'decision': return { quoi: 'Décision de la modération', titre: n.action === 'suspendre' ? `Compte suspendu jusqu’au ${E.DATES.suspension}` : 'Avertissement', extrait: t(n.motif) };
      default: return { quoi: '', titre: '', extrait: '' };
    }
  }

  /* Genre de la notification, au-dessus du titre du volet. */
  const GENRES = {
    commentaire: 'Commentaire', 'reponse-commentaire': 'Réponse à votre commentaire', 'reponse-sujet': 'Réponse sur le forum', 'reponse-acceptee': 'Réponse acceptée',
    reproduction: 'Essai de votre création', variante: 'Variante', votes: 'Votes « Utile »', obsolescence: 'Obsolescence', masque: 'Modération', retabli: 'Modération',
    badge: 'Badge', niveau: 'Niveau', 'cas-valide': 'Cas Bon réflexe', 'cas-refuse': 'Cas Bon réflexe', defi: 'Défi', decision: 'Modération'
  };

  /* Titre du volet de lecture. */
  function titreDetail(n) {
    const c = cible(n);
    switch (n.type) {
      case 'commentaire': return `${n.par} a commenté votre création`;
      case 'reponse-commentaire': return `${n.par} a répondu à votre commentaire`;
      case 'reponse-sujet': return `${n.par} a répondu à votre ${motSujet(c)}`;
      case 'reponse-acceptee': return `${n.par} a accepté votre réponse`;
      case 'reproduction': return `${n.par} a essayé votre création`;
      case 'variante': return `${n.par} a publié une variante de votre création`;
      case 'votes': return `${votants(n.pars, false)} « Utile »`;
      case 'obsolescence': return `Votre création est signalée comme ne fonctionnant plus avec ${n.modele}`;
      case 'masque': return 'Votre création a été masquée par la modération';
      case 'retabli': return 'Votre création est de nouveau visible';
      case 'badge': return `Vous avez obtenu le badge « ${n.badge} »`;
      case 'niveau': return `Vous avez atteint le niveau ${E.NIVEAUX[n.niveau].nom}`;
      case 'cas-valide': return 'Votre cas Bon réflexe a été validé';
      case 'cas-refuse': return 'Votre cas Bon réflexe n’a pas été validé';
      case 'defi': return `Vous terminez ${n.rang}${n.rang === 1 ? 're' : 'e'} du défi`;
      case 'decision': return n.action === 'suspendre' ? `Votre compte est suspendu jusqu’au ${E.DATES.suspension}` : 'La modération vous adresse un avertissement';
      default: return '';
    }
  }

  /* Résumé en texte simple : vue d'ensemble, libellés accessibles, annonces. */
  function resume(n, precedente) {
    const c = cible(n);
    const nom = c.court ? c.court[0] : `« ${c.titre} »`;
    const meme = precedente && cible(precedente).cle === c.cle && c.court;
    const e = c.court && c.court[1] === 'f' ? 'e' : '';
    switch (n.type) {
      case 'commentaire': return meme ? `${n.par} l’a commenté${e}` : `${n.par} a commenté ${nom}`;
      case 'reponse-commentaire': return `${n.par} a répondu à votre commentaire`;
      case 'reponse-sujet': return `${n.par} a répondu à votre ${motSujet(c)}`;
      case 'reponse-acceptee': return `${n.par} a accepté votre réponse`;
      case 'reproduction': return meme ? `${n.par} l’a essayé${e}` : `${n.par} a essayé ${nom}`;
      case 'variante': return `${n.par} a publié une variante de ${nom}`;
      case 'votes': return `${V.plural(n.pars.length, 'membre a', 'membres ont')} voté « Utile » pour ${n.reponse ? 'votre réponse' : nom}`;
      case 'obsolescence': return `${nom} est signalée comme ne fonctionnant plus avec ${n.modele}`;
      case 'masque': return `${nom} a été masquée par la modération`;
      case 'retabli': return `${nom} est de nouveau visible`;
      case 'badge': return `vous avez obtenu le badge « ${n.badge} »`;
      case 'niveau': return `vous avez atteint le niveau ${E.NIVEAUX[n.niveau].nom}`;
      case 'cas-valide': return `votre cas « ${c.titre} » a été validé`;
      case 'cas-refuse': return `votre cas « ${c.titre} » n’a pas été validé`;
      case 'defi': return `vous terminez ${n.rang}${n.rang === 1 ? 're' : 'e'} du défi « ${c.titre} »`;
      case 'decision': return n.action === 'suspendre' ? `votre compte est suspendu jusqu’au ${E.DATES.suspension}` : 'la modération vous adresse un avertissement';
      default: return '';
    }
  }

  /* Visuels ------------------------------------------------------------------------------------------ */

  const photo = (nom, cls = '') => `<img class="nt-photo${cls ? ` ${cls}` : ''}" src="assets/avatars/${D.avatars[nom] || slug(nom)}.webp" alt="" width="56" height="56" loading="lazy" decoding="async">`;
  const puce = (nom, ton = 'accent') => `<span class="nt-puce" data-ton="${ton}">${icon(nom, '')}</span>`;
  const rond = (nom, ton) => `<span class="nt-rond" data-ton="${ton}">${icon(nom, '')}</span>`;
  const HEX = '<path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/>';
  function embleme(nom, cls = '') {
    const b = PRO.badges[nom] || { icon: 'award', tone: 'blue' };
    return `<span class="emblem nt-embleme${cls ? ` ${cls}` : ''}" data-tone="${b.tone}"><svg class="emblem-shape" viewBox="0 0 56 60">${HEX}</svg>${icon(b.icon, '')}</span>`;
  }
  function visuel(n) {
    switch (n.type) {
      case 'votes': return `<span class="nt-pile${n.pars.length > 1 ? ' is-double' : ''}">${n.pars.slice(0, 2).map(p => photo(p)).join('')}</span>${puce('utile')}`;
      case 'commentaire': return photo(n.par) + puce('message');
      case 'reponse-commentaire': case 'reponse-sujet': return photo(n.par) + puce('reply');
      case 'reponse-acceptee': return photo(n.par) + puce('check', 'succes');
      case 'reproduction': return photo(n.par) + puce('repeat', n.resultat === 'reussi' ? 'succes' : n.resultat === 'partiel' ? 'attention' : 'neutre');
      case 'variante': return photo(n.par) + puce('branche');
      case 'badge': return embleme(n.badge);
      case 'niveau': return rond('palier', 'accent');
      case 'cas-valide': return rond('shield', 'accent');
      case 'cas-refuse': return rond('shield-x', 'attention');
      case 'defi': return rond('trophy', 'attention');
      case 'obsolescence': return rond('alert', 'attention');
      case 'masque': return rond('eye-off', 'encre');
      case 'retabli': return rond('eye', 'succes');
      case 'decision': return rond(n.action === 'suspendre' ? 'lock' : 'shield', 'encre');
      default: return rond('bell', 'accent');
    }
  }
  const outilHTML = (outil, modele) => `<span class="nt-outil">${V.logo(outil, 18)}${t(outil)}${modele ? ` · ${t(modele)}` : ''}</span>`;
  function media(m, portrait) {
    if (!m) return '';
    if (m.kind === 'image') return `<img src="assets/images/${m.name}-720.webp" alt="" width="240" height="180" loading="lazy" decoding="async"${portrait ? ' class="is-affiche"' : ''}>`;
    return `<span class="mock" aria-hidden="true">${V.mockHTML(m.mock)}</span>`;
  }

  /* Liste -------------------------------------------------------------------------------------------- */

  const dansType = (n, type = ui.type) => type === 'tout' || typeDeNotif(n.type) === type;
  const dansVue = (n, vue = ui.vue) => vue === 'toutes' || (vue === 'non-lues' ? nonLue(n) : aTraiter(n));
  const visibles = () => liste.filter(n => dansType(n) && dansVue(n));
  const libelleType = () => (TYPES.find(c => c.id === ui.type) || TYPES[0]).label;
  /* Ordre d'affichage : décisions épinglées, puis la liste par date ou par contenu. */
  function ordre() {
    const items = visibles();
    const reste = items.filter(n => !n.epinglee);
    let suite = reste;
    if (settings.regroupement === 'contenu') {
      const cles = [...new Set(reste.map(n => cible(n).cle))];
      suite = cles.flatMap(cle => reste.filter(n => cible(n).cle === cle));
    }
    return [...items.filter(n => n.epinglee), ...suite];
  }

  function item(n, i, seule) {
    const e = entete(n);
    const nl = nonLue(n);
    const choisie = ui.selection === n.id;
    const mode = lecture();
    const att = aTraiter(n);
    const etiquette = majuscule(resume(n));
    const controle = mode === 'volet' ? `aria-controls="nt-volet" aria-current="${choisie}"` : `aria-expanded="${choisie}" aria-controls="nt-d-${n.id}"`;
    return `<li class="nt-item${nl ? ' is-nonlue' : ''}${choisie ? ' is-choisie' : ''}${n.epinglee ? ' is-epinglee' : ''}${ui.nouvelle === n.id ? ' is-nouvelle' : ''}${ui.animer ? ' is-entree' : ''}" style="--i:${Math.min(i, 10)}" data-nt-id="${n.id}">
      <button class="nt-pastille" type="button" tabindex="-1" data-nt-basculer="${n.id}" aria-label="${esc(typo(`${nl ? 'Marquer comme lue' : 'Marquer comme non lue'} : ${etiquette}`))}"><span aria-hidden="true"></span></button>
      <button class="nt-ouvrir" type="button" id="nt-o-${n.id}" data-nt-choisir="${n.id}" data-nt-nav ${controle} tabindex="${ui.focusId === n.id ? 0 : -1}">
        <span class="nt-visuel" aria-hidden="true">${visuel(n)}</span>
        <span class="nt-item-corps">
          <span class="nt-item-haut"><span class="nt-item-quoi">${nl ? '<span class="sr-only">Non lue : </span>' : ''}${e.quoi}</span><time datetime="${n.at}">${t(courte(n.at))}</time></span>
          ${seule && !['badge', 'niveau', 'variante'].includes(n.type) ? '' : `<span class="nt-item-titre">${t(e.titre)}</span>`}
          ${e.extrait ? `<span class="nt-item-extrait">${e.extrait}</span>` : ''}
          ${att ? `<span class="nt-item-marque">${icon('circle-dot', 'icon-xs')}À traiter</span>` : ''}
        </span>
      </button>
      ${mode === 'deplie' && choisie ? `<div class="nt-deplie" id="nt-d-${n.id}" role="region" aria-labelledby="nt-o-${n.id}">${detail(n, true)}</div>` : ''}
    </li>`;
  }

  function parDate(items) {
    const groupes = [];
    items.forEach(n => {
      const g = GROUPES.find(([, , test]) => test(ecart(n.at)));
      let groupe = groupes.find(x => x.id === g[0]);
      if (!groupe) { groupe = { id: g[0], titre: g[1], items: [] }; groupes.push(groupe); }
      groupe.items.push(n);
    });
    let i = 0;
    return groupes.map(g => `<section class="nt-groupe" aria-labelledby="nt-g-${g.id}">
      <h3 class="nt-groupe-titre" id="nt-g-${g.id}">${t(g.titre)}</h3>
      <ul class="nt-liste" aria-describedby="nt-aide-clavier">${g.items.map(n => item(n, i++, false)).join('')}</ul>
    </section>`).join('');
  }
  function iconeContenu(c) {
    if (c.type) return icon(`type-${c.type}`, '');
    if (c.cle === 'progression') return icon('trend-up', '');
    if (c.cle === 'compte') return icon('shield', '');
    if (c.cle.startsWith('sujet')) return icon('message', '');
    if (c.cle.startsWith('defi')) return icon('trophy', '');
    return icon('shield', '');
  }
  function parContenu(items) {
    const groupes = [];
    items.forEach(n => {
      const c = cible(n);
      let g = groupes.find(x => x.cle === c.cle);
      if (!g) { g = { cle: c.cle, c, items: [] }; groupes.push(g); }
      g.items.push(n);
    });
    let i = 0;
    return groupes.map((g, k) => {
      const m = g.c.media && g.c.media.kind === 'image' ? g.c.media : null;
      return `<section class="nt-groupe is-contenu" aria-labelledby="nt-gc-${k}">
        <h3 class="nt-groupe-tete" id="nt-gc-${k}"><span class="nt-gicone${m ? ' is-image' : ''}" aria-hidden="true">${m ? `<img src="assets/images/${m.name}-720.webp" alt="" width="64" height="64" loading="lazy" decoding="async">` : iconeContenu(g.c)}</span><span>${t(g.c.titre)}</span><small>${t(fmt(g.items.length))}</small></h3>
        <ul class="nt-liste" aria-describedby="nt-aide-clavier">${g.items.map(n => item(n, i++, true)).join('')}</ul>
      </section>`;
    }).join('');
  }

  function videFiltre() {
    const type = ui.type !== 'tout' ? ` dans « ${libelleType()} »` : '';
    if (ui.vue === 'a-traiter') return `<div class="nt-vide-filtre">${icon('check-circle', '')}<p><b>${t(`Rien à traiter${type}.`)}</b>${t('Les questions qui vous sont posées et les alertes sur vos créations apparaîtront ici.')}</p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher toutes les notifications</button></div>`;
    if (ui.vue === 'non-lues') return `<div class="nt-vide-filtre">${icon('check-circle', '')}<p><b>${t(`Aucune notification non lue${type}.`)}</b>${t('Vous avez tout lu.')}</p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher toutes les notifications</button></div>`;
    return `<div class="nt-vide-filtre">${icon('inbox', '')}<p><b>${t(`Aucune notification${type} pour le moment.`)}</b></p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher tous les types</button></div>`;
  }

  function rendreListe() {
    const zone = $('[data-nt-liste]');
    const items = visibles();
    if (!items.length) { zone.innerHTML = videFiltre(); return; }
    if (!items.some(n => n.id === ui.focusId)) ui.focusId = (items.find(n => n.id === ui.selection) || items[0]).id;
    const epinglees = items.filter(n => n.epinglee);
    const reste = items.filter(n => !n.epinglee);
    const parGroupe = settings.regroupement === 'contenu';
    const montre = parGroupe ? reste : reste.slice(0, ui.limite);
    const cache = reste.length - montre.length;
    const pro = profil();
    const debut = !cache && pro.depuis >= N.depuis && ui.type === 'tout' && ui.vue === 'toutes'
      ? `<p class="nt-debut">${icon('flag')}${t(`Vous avez rejoint Vysora le ${dateLongue(pro.depuis)}.`)}</p>` : '';
    zone.innerHTML = `${epinglees.length ? `<section class="nt-groupe is-epingle" aria-labelledby="nt-g-epingle"><h3 class="nt-groupe-titre" id="nt-g-epingle">${icon('lock')}À lire en priorité</h3><ul class="nt-liste" aria-describedby="nt-aide-clavier">${epinglees.map((n, i) => item(n, i, false)).join('')}</ul></section>` : ''}
      ${parGroupe ? parContenu(montre) : parDate(montre)}
      ${cache > 0 ? `<div class="nt-plus"><button class="btn btn-secondary btn-sm" type="button" data-nt-plus>${icon('chevron-down')}${t(`Afficher les plus anciennes (${cache})`)}</button></div>` : debut}`;
  }

  /* Volet de lecture ----------------------------------------------------------------------------------- */

  const bulle = (texte, { de, quand: q, vous = false, note = '' } = {}) => `<li class="nt-msg${vous ? ' is-vous' : ''}">
      ${vous ? V.avatarMoi(32).replace('compte-avatar', 'compte-avatar nt-msg-photo') : photo(de, 'nt-msg-photo')}
      <div class="nt-bulle"><p class="nt-msg-qui"><b>${t(vous ? 'Vous' : de)}</b>${q ? `<span>${t(q)}</span>` : ''}</p><p>${t(texte)}</p>${note ? `<p class="nt-msg-note">${note}</p>` : ''}</div>
    </li>`;

  function composeur(n) {
    if (reponseDe(n)) return '';
    const gate = V.invitation('contribuer', 'répondre');
    if (gate) return `<p class="nt-invitation">${icon('lock')}<span>${gate}</span></p>`;
    const min = n.type === 'reponse-sujet' ? 20 : 1;
    const max = n.type === 'reponse-sujet' ? 20000 : 5000;
    return `<form class="nt-repondre" data-nt-form="${n.id}" data-min="${min}" novalidate>
      <label class="nt-repondre-label" for="nt-rep-${n.id}">${t(`Répondre à ${n.par}`)}</label>
      <textarea id="nt-rep-${n.id}" rows="3" maxlength="${max}" aria-describedby="nt-rep-aide-${n.id}" data-nt-saisie="${n.id}" placeholder="${esc(typo(n.type === 'reponse-sujet' ? 'Votre réponse dans le sujet…' : 'Votre réponse…'))}">${esc(ui.brouillons[n.id] || '')}</textarea>
      <p class="nt-erreur" id="nt-rep-err-${n.id}" hidden></p>
      <div class="nt-repondre-pied">
        <p class="nt-repondre-aide" id="nt-rep-aide-${n.id}">${t(n.type === 'reponse-sujet' ? 'Publiée dans le sujet, 20 caractères au moins. Ctrl + Entrée pour publier.' : 'Publiée sous le commentaire. Ctrl + Entrée pour publier.')}</p>
        <button class="btn btn-primary btn-sm" type="submit">${icon('send')}Publier la réponse</button>
      </div>
    </form>`;
  }

  function accepter(n) {
    if (n.type !== 'reponse-sujet') return '';
    if (estAcceptee(n)) return `<p class="nt-fait-note">${icon('check-circle')}<span>${t('Vous avez accepté cette réponse : elle est épinglée en tête du sujet, désormais résolu.')}</span></p>`;
    if (sujetResolu(n.sujet)) return `<p class="nt-fait-note is-neutre">${icon('check-circle')}<span>${t('Vous avez déjà accepté une autre réponse à cette question.')}</span></p>`;
    if (ui.confirmer === n.id) {
      return `<div class="nt-confirmer" role="group" aria-labelledby="nt-conf-${n.id}">
        <p id="nt-conf-${n.id}"><b>${t(`Accepter la réponse ${deNom(n.par)} ?`)}</b>${t(' Elle sera épinglée en tête du sujet, qui sera marqué résolu. Vous pourrez changer d’avis plus tard.')}</p>
        <div><button class="btn btn-quiet btn-sm" type="button" data-nt-confirmer-non id="nt-conf-non-${n.id}">Annuler</button><button class="btn btn-primary btn-sm" type="button" data-nt-confirmer-oui="${n.id}">${icon('check')}Accepter la réponse</button></div>
      </div>`;
    }
    return `<button class="btn btn-secondary btn-sm nt-accepter" type="button" id="nt-acc-${n.id}" data-nt-accepter="${n.id}">${icon('check-circle')}Accepter cette réponse</button>`;
  }

  function corps(n) {
    const c = cible(n);
    switch (n.type) {
      case 'commentaire': case 'reponse-commentaire': case 'reponse-sujet': {
        const r = reponseDe(n);
        return `<ol class="nt-fil">
          ${n.origine ? bulle(n.origine.texte, { vous: true, quand: quand(n.origine.at) }) : ''}
          ${bulle(n.texte, { de: n.par, quand: n.origine ? quand(n.at) : niveauDe(n.par) })}
          ${r ? bulle(r.texte, { vous: true, quand: quand(r.at) }) : ''}
        </ol>${accepter(n)}${composeur(n)}`;
      }
      case 'reponse-acceptee':
        return `<ol class="nt-fil">${bulle(n.texte, { vous: true, note: `${icon('check-circle', 'icon-xs')}${t(`Acceptée par ${n.par}`)}` })}</ol>
          <p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points pour vous. La réponse est épinglée en tête du sujet.`)}</span></p>`;
      case 'reproduction': {
        const [ic, label] = RESULTATS[n.resultat];
        const conseil = n.resultat === 'reussi'
          ? `+${n.points || 5} points. Chaque essai réussi renforce la preuve affichée sur votre création.`
          : 'Ce retour décrit un cas que votre création ne couvre pas encore. Ajoutez-le à ses limites constatées pour guider les prochains essais.';
        return `<div class="nt-essai" data-resultat="${n.resultat}">
            <span class="nt-essai-icone">${icon(ic, '')}</span>
            <div><p class="nt-essai-res">${t(label)}</p><p class="nt-essai-outil">${outilHTML(n.outil, n.modele)}</p></div>
          </div>
          <ol class="nt-fil">${bulle(n.texte, { de: n.par, quand: niveauDe(n.par) })}</ol>
          <p class="nt-conseil">${icon(n.resultat === 'reussi' ? 'trend-up' : 'bulb')}<span>${t(conseil)}</span></p>`;
      }
      case 'variante': {
        const f = D.creations.find(x => x.id === n.variante.fiche);
        const [outil, modele] = f ? f.config.split(' · ') : [];
        return `<div class="nt-duo">
          <a class="nt-duo-bloc" href="${c.href}"><span class="nt-duo-qui">Votre création</span>${V.typeTag(c.type)}<b>${t(c.titre)}</b></a>
          <span class="nt-duo-fleche" aria-hidden="true">${icon('arrow')}</span>
          <a class="nt-duo-bloc is-variante" href="fiche-creation.html?id=${encodeURIComponent(n.variante.fiche)}"><span class="nt-duo-qui">${photo(n.par, 'nt-duo-photo')}${t(`Variante ${deNom(n.par)}`)}</span>${f ? V.typeTag(f.type) : ''}<b>${t(n.variante.titre)}</b>${f ? outilHTML(outil, modele) : ''}</a>
        </div>
        <p class="nt-conseil">${icon('branche')}<span>${t('La variante crédite votre création et renvoie vers elle (licence CC BY 4.0).')}</span></p>`;
      }
      case 'votes':
        return `<ul class="nt-votants">${n.pars.map(p => `<li>${photo(p, 'nt-votant-photo')}<span><b>${t(p)}</b>${niveauDe(p) ? `<small>${t(niveauDe(p))}</small>` : ''}</span>${icon('utile')}</li>`).join('')}</ul>
          <p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points${n.reponse ? ', 5 par vote sur une réponse du forum.' : ', 10 par vote sur une création.'}`)}</span></p>`;
      case 'badge': {
        const b = PRO.badges[n.badge] || {};
        return `<div class="nt-badge-grand">${embleme(n.badge, 'is-grand')}<div><p class="nt-badge-nom">${t(n.badge)}</p><p>${t(b.rule || '')}</p><p class="nt-badge-date">${t(`Obtenu le ${dateLongue(n.at)}, affiché sur votre profil`)}</p></div></div>`;
      }
      case 'niveau': {
        const k = NIVEAUX.indexOf(n.niveau);
        return `<ol class="nt-paliers" aria-label="Niveaux de réputation">${NIVEAUX.map((cle, i) => `<li class="${i < k ? 'is-passe' : i === k ? 'is-actuel' : ''}"${i === k ? ' aria-current="step"' : ''}><svg viewBox="0 0 56 60" aria-hidden="true"><path d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/></svg><b>${t(E.NIVEAUX[cle].nom)}</b><small>${t(`${fmt(E.NIVEAUX[cle].seuil)} pts`)}</small></li>`).join('')}</ol>
          <p class="nt-texte-detail">${t(n.texte)}</p>`;
      }
      case 'defi':
        return `<div class="nt-rang"><p class="nt-rang-nb">${rang(n.rang)}</p><div><p><b>${t(`sur ${fmt(n.defi.participants)} participants`)}</b></p><p>${t(`Défi clos le 11 octobre, classement figé par votes « Utile » reçus ${n.defi.periode}.`)}</p></div></div>
          <ul class="nt-decompte">${n.rang <= 3 ? `<li><span>${t(`${n.rang === 1 ? 'Première' : n.rang === 2 ? 'Deuxième' : 'Troisième'} place`)}</span><b>${t(`+${n.points - 5} points`)}</b></li>` : ''}<li><span>Participation</span><b>${t('+5 points')}</b></li></ul>`;
      case 'cas-valide':
        return `<p class="nt-texte-detail">${t('Un modérateur a vérifié votre cas. Il est publié dans Bon réflexe, où les membres peuvent s’y entraîner.')}</p><p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points`)}</span></p>`;
      case 'cas-refuse':
        return `<div class="nt-motif"><p><b>Motif</b>${t(n.motif)}</p></div><p class="nt-texte-detail">${t('Corrigez le cas puis soumettez-le de nouveau : un autre modérateur l’examinera.')}</p>`;
      case 'obsolescence':
        return `<div class="nt-essai" data-resultat="partiel"><span class="nt-essai-icone">${icon('alert', '')}</span><div><p class="nt-essai-res">${t(`${n.membres} membres, un même modèle`)}</p><p class="nt-essai-outil">${outilHTML('ChatGPT', n.modele)}</p></div></div>
          <p class="nt-texte-detail">${t('Le seuil de trois signalements est atteint : un bandeau prévient désormais les lecteurs. Refaites l’essai avec ce modèle, puis mettez à jour la création ou ses limites constatées.')}</p>`;
      case 'masque':
        return `<div class="nt-motif"><p><b>Motif</b>${t(n.motif)}</p></div>
          <ul class="nt-effets"><li>${icon('eye-off')}<span>${t('La création n’est plus visible des autres membres ; ses votes et ses commentaires sont suspendus.')}</span></li><li>${icon('pen')}<span>${t('Modifiez-la : la modération l’examinera de nouveau.')}</span></li></ul>`;
      case 'retabli':
        return `<p class="nt-texte-detail">${t(n.texte)}</p>`;
      case 'decision':
        return `<div class="nt-motif"><p><b>Motif</b>${t(n.motif)}</p></div>
          ${n.action === 'suspendre'
            ? `<ul class="nt-effets"><li>${icon('check-circle')}<span>${t('Vous pouvez lire les contenus et gérer vos paramètres.')}</span></li><li>${icon('lock')}<span>${t(`Publier, voter, commenter et répondre redeviendront possibles le ${E.DATES.suspension}.`)}</span></li><li>${icon('mail')}<span>${t('Cette décision vous a aussi été envoyée par e-mail.')}</span></li></ul>`
            : `<ul class="nt-effets"><li>${icon('alert')}<span>${t('Un nouvel écart peut entraîner la suspension du compte.')}</span></li><li>${icon('mail')}<span>${t('Cette décision vous a aussi été envoyée par e-mail.')}</span></li></ul>`}`;
      default: return '';
    }
  }

  function contexte(n, c) {
    if (['badge', 'niveau', 'decision', 'variante'].includes(n.type) || !c.href) return '';
    let genre = '';
    let meta = '';
    let visu = '';
    if (c.cle.startsWith('creation')) {
      genre = V.typeTag(c.type);
      meta = [c.categorie, c.publie ? `publiée le ${V.dateLabel(c.publie, false)}` : ''].filter(Boolean).join(' · ');
      visu = media(c.media, c.media && c.media.portrait);
    } else if (c.cle.startsWith('fiche')) {
      genre = V.typeTag(c.type);
      meta = `par ${c.auteur} · ${c.categorie}`;
      visu = media(c.media, false);
    } else if (c.cle.startsWith('sujet')) {
      genre = `<span class="nt-cx-genre">${icon('message')}${t(`Forum · ${majuscule(motSujet(c))}`)}</span>`;
      visu = `<span class="nt-cx-icone">${icon('message', '')}</span>`;
    } else if (c.cle.startsWith('defi')) {
      genre = `<span class="nt-cx-genre">${icon('trophy')}Défi</span>`;
      meta = `${n.defi.periode} · ${fmt(n.defi.participants)} participants`;
      visu = `<span class="nt-cx-icone">${icon('trophy', '')}</span>`;
    } else {
      genre = `<span class="nt-cx-genre">${icon('shield')}Cas Bon réflexe</span>`;
      visu = `<span class="nt-cx-icone">${icon('shield', '')}</span>`;
    }
    return `<a class="nt-contexte" href="${c.href}" data-nt-lien="${n.id}">
      <span class="nt-cx-media${c.media && c.media.portrait ? ' is-affiche' : ''}">${visu}</span>
      <span class="nt-cx-texte">${genre}<span class="nt-cx-titre">${t(c.titre)}</span>${meta ? `<span class="nt-cx-meta">${t(meta)}</span>` : ''}</span>
      <span class="nt-cx-aller">${t(c.ouvrir)}${icon('arrow')}</span>
    </a>`;
  }

  function actionsDetail(n, c, inline) {
    const out = [];
    if (n.type === 'obsolescence') out.push(`<a class="btn btn-primary btn-sm" href="nouvelle-creation.html?modifier=${encodeURIComponent(n.creation)}" data-exige-quoi="mettre à jour cette création" data-nt-lien="${n.id}">${icon('pen')}Mettre à jour la création</a>`);
    if (n.type === 'masque') out.push(`<a class="btn btn-primary btn-sm" href="nouvelle-creation.html?modifier=${encodeURIComponent(n.creation)}" data-exige-quoi="modifier cette création" data-nt-lien="${n.id}">${icon('pen')}Modifier la création</a>`);
    if (n.type === 'reproduction' && n.resultat !== 'reussi') out.push(`<a class="btn btn-primary btn-sm" href="nouvelle-creation.html?modifier=${encodeURIComponent(n.creation)}" data-exige-quoi="compléter cette création" data-nt-lien="${n.id}">${icon('pen')}Compléter les limites constatées</a>`);
    if (n.type === 'cas-refuse') out.push(`<a class="btn btn-primary btn-sm" href="apprendre.html?rubrique=bon-reflexe" data-exige="proposer-cas" data-exige-quoi="corriger ce cas" data-nt-lien="${n.id}">${icon('pen')}Corriger le cas</a>`);
    if (n.type === 'niveau' && n.action === 'proposer') out.push(`<a class="btn btn-primary btn-sm" href="apprendre.html?rubrique=bon-reflexe" data-exige="proposer-cas" data-exige-quoi="proposer un cas" data-nt-lien="${n.id}">${icon('shield')}Proposer un cas Bon réflexe</a>`);
    if (['badge', 'niveau'].includes(n.type)) out.push(`<a class="btn btn-secondary btn-sm" href="${c.href}" data-nt-lien="${n.id}">${t(c.ouvrir)}${icon('arrow')}</a>`);
    if (n.type === 'variante') out.push(`<a class="btn btn-primary btn-sm" href="fiche-creation.html?id=${encodeURIComponent(n.variante.fiche)}" data-nt-lien="${n.id}">Voir la variante${icon('arrow')}</a>`);
    if (inline) out.push(`<button class="btn btn-quiet btn-sm" type="button" data-nt-lu-volet="${n.id}">${icon(nonLue(n) ? 'check' : 'circle-dot')}${nonLue(n) ? 'Marquer comme lue' : 'Marquer comme non lue'}</button>`);
    return out.length ? `<div class="nt-d-actions">${out.join('')}</div>` : '';
  }

  function detail(n, inline) {
    const c = cible(n);
    const titre = inline ? 'h3' : 'h2';
    const quiLigne = `<span class="nt-d-genre">${t(GENRES[n.type] || '')}</span>`;
    return `<div class="nt-detail${inline ? ' is-inline' : ''}" data-nt-detail="${n.id}">
      <header class="nt-d-tete">
        <span class="nt-visuel nt-d-visuel" aria-hidden="true">${n.type === 'badge' ? rond('award', 'accent') : visuel(n)}</span>
        <div class="nt-d-intro">
          <p class="nt-d-qui">${quiLigne}</p>
          <${titre} class="nt-d-titre" id="${inline ? `nt-dt-${n.id}` : 'nt-volet-titre'}" tabindex="-1">${t(titreDetail(n))}</${titre}>
          <p class="nt-d-quand"><time datetime="${n.at}">${t(majuscule(quand(n.at)))}</time>${aTraiter(n) ? `<span class="nt-item-marque">${icon('circle-dot', 'icon-xs')}À traiter</span>` : ''}</p>
        </div>
      </header>
      ${contexte(n, c)}
      <div class="nt-d-corps">${corps(n)}</div>
      ${actionsDetail(n, c, inline)}
    </div>`;
  }

  function barreVolet(n) {
    const items = ordre();
    const i = items.findIndex(x => x.id === n.id);
    const nl = nonLue(n);
    return `<div class="nt-v-barre">
      <button class="btn btn-quiet btn-sm nt-v-retour" type="button" data-nt-apercu id="nt-v-retour">${icon('chevron-left')}Vue d’ensemble</button>
      <div class="nt-v-outils">
        <button class="btn btn-quiet btn-sm" type="button" data-nt-lu-volet="${n.id}" id="nt-v-lu">${icon(nl ? 'check' : 'circle-dot')}${nl ? 'Marquer comme lue' : 'Marquer comme non lue'}</button>
        <span class="nt-v-sep" aria-hidden="true"></span>
        <button class="icon-btn" type="button" data-nt-voisin="-1" id="nt-v-prec" aria-label="Notification précédente"${i <= 0 ? ' disabled' : ''}>${icon('chevron-up', '')}</button>
        <button class="icon-btn" type="button" data-nt-voisin="1" id="nt-v-suiv" aria-label="Notification suivante"${i < 0 || i >= items.length - 1 ? ' disabled' : ''}>${icon('chevron-down', '')}</button>
      </div>
    </div>`;
  }

  /* Vue d'ensemble : depuis la dernière visite, la semaine, la préférence d'e-mail. */
  function semaineHTML() {
    const niv = cleNiveau();
    const nv = E.niveau();
    const i = NIVEAUX.indexOf(niv);
    const suivant = NIVEAUX[i + 1] ? E.NIVEAUX[NIVEAUX[i + 1]] : null;
    const pro = profil();
    const vide = settings.donnees === 'vide';
    const gain = vide ? 0 : (pro.gains[pro.gains.length - 1] || 0);
    const debut = lundi();
    const semaine = vide ? [] : liste.filter(n => jourDe(n.at) >= debut);
    const compter = type => semaine.filter(n => n.type === type);
    const votes = compter('votes').reduce((s, n) => s + n.pars.length, 0);
    const essais = compter('reproduction');
    const reussis = essais.filter(n => n.resultat === 'reussi').length;
    const echanges = compter('commentaire').length + compter('reponse-sujet').length + compter('reponse-commentaire').length;
    const chiffres = [
      [votes, 'vote « Utile »', 'votes « Utile »'],
      [essais.length, reussis ? 'essai réussi' : 'essai', `essais, dont ${reussis} réussi${reussis > 1 ? 's' : ''}`],
      [echanges, 'commentaire ou réponse', 'commentaires et réponses'],
      [compter('variante').length, 'variante', 'variantes']
    ];
    const avant = Math.max(nv.seuil, nv.points - gain);
    const etendue = suivant ? suivant.seuil - nv.seuil : 1;
    const pAvant = suivant ? ((avant - nv.seuil) / etendue) * 100 : 100;
    const pApres = suivant ? ((nv.points - nv.seuil) / etendue) * 100 : 100;
    const animer = !ui.jaugeVue && V.motion.full();
    return `<section class="nt-ov-bloc" aria-labelledby="nt-semaine-titre">
      <h3 class="nt-ov-sous" id="nt-semaine-titre">${icon('trend-up')}Cette semaine</h3>
      <p class="nt-gain"><span class="nt-gain-nb">${t(gain ? `+${fmt(gain)}` : '0')}</span><span class="nt-gain-unite">points</span></p>
      <div class="nt-jauge" role="img" aria-label="${esc(typo(suivant ? `${fmt(nv.points)} points sur les ${fmt(suivant.seuil)} du niveau ${suivant.nom}, dont ${fmt(gain)} gagnés cette semaine` : `${fmt(nv.points)} points, niveau le plus élevé`))}">
        <span class="nt-jauge-gain" style="--p:${animer ? 0 : pApres.toFixed(2)}" data-p="${pApres.toFixed(2)}"></span>
        <span class="nt-jauge-avant" style="--p:${animer ? 0 : pAvant.toFixed(2)}" data-p="${pAvant.toFixed(2)}"></span>
      </div>
      <p class="nt-jauge-legende"><span><b>${t(nv.nom)}</b>${t(` · ${fmt(nv.points)} points`)}</span><span>${t(suivant ? `${suivant.nom} à ${fmt(suivant.seuil)}` : 'Plus haut niveau')}</span></p>
      ${semaine.length ? `<dl class="nt-chiffres">${chiffres.map(([nb, un, plusieurs]) => `<div${nb ? '' : ' class="is-zero"'}><dt>${t(nb > 1 ? plusieurs : un)}</dt><dd>${fmt(nb)}</dd></div>`).join('')}</dl>` : `<p class="nt-ov-vide">${t('Pas encore d’activité autour de vos contributions cette semaine.')}</p>`}
    </section>`;
  }
  function emailHTML() {
    const aVerifier = E.get().compte === 'email';
    return `<section class="nt-ov-bloc" aria-labelledby="nt-email-titre">
      <h3 class="nt-ov-sous" id="nt-email-sous">${icon('mail')}Par e-mail</h3>
      <div class="nt-switch-ligne">
        <p id="nt-email-titre">Réponses à vos sujets et réponses acceptées</p>
        <button class="nt-switch" type="button" role="switch" aria-checked="${etat.email}" aria-labelledby="nt-email-titre" aria-describedby="nt-email-aide" data-nt-email-switch id="nt-email-switch"><span aria-hidden="true"></span></button>
      </div>
      <p class="nt-email-aide" id="nt-email-aide">${t(aVerifier ? 'Confirmez votre adresse e-mail pour les recevoir aussi par e-mail.' : etat.email ? 'Vous les recevez aussi à l’adresse de votre compte. Les décisions de modération vous sont toujours envoyées.' : 'Vous les retrouvez uniquement ici. Les décisions de modération vous sont toujours envoyées par e-mail.')}</p>
      <p class="nt-email-lien"><a href="parametres.html#notifications">${t('Tous les réglages d’e-mail')}</a></p>
    </section>`;
  }
  function apercuHTML() {
    const nl = liste.filter(nonLue).sort((a, b) => Number(!!b.epinglee) - Number(!!a.epinglee));
    const traiter = liste.filter(aTraiter).length;
    const complet = lecture() === 'volet';
    let tete = '';
    if (complet && settings.donnees === 'remplies') {
      if (nl.length) {
        const visages = [...new Set(nl.flatMap(n => n.pars || (n.par ? [n.par] : [])))].slice(0, 4);
        const points = nl.reduce((s, n) => s + (n.points || 0), 0);
        tete = `<div class="nt-ov-tete">
            ${visages.length ? `<span class="nt-visages" aria-hidden="true">${visages.map(p => photo(p)).join('')}</span>` : ''}
            <h2 class="nt-ov-titre" id="nt-volet-titre" tabindex="-1">Depuis votre dernière visite</h2>
            <p class="nt-ov-resume">${t(`${V.plural(nl.length, 'nouvelle notification', 'nouvelles notifications')}${points ? ` et ${points} points gagnés` : ''}.${traiter ? ` ${V.plural(traiter, 'notification attend', 'notifications attendent')} une suite de votre part.` : ''}`)}</p>
          </div>
          <ul class="nt-ov-liste">${nl.slice(0, 5).map(n => `<li><button type="button" data-nt-choisir="${n.id}" id="nt-ov-${n.id}">${n.par ? photo(n.par) : n.pars ? photo(n.pars[0]) : `<span class="nt-ov-icone">${icon(n.type === 'badge' ? 'award' : n.type === 'decision' ? 'lock' : 'bell')}</span>`}<span>${t(majuscule(resume(n)))}</span><time datetime="${n.at}">${t(courte(n.at))}</time>${icon('arrow')}</button></li>`).join('')}</ul>`;
      } else {
        tete = `<div class="nt-ov-tete is-a-jour">
            <span class="nt-ok" aria-hidden="true">${icon('check', '')}</span>
            <h2 class="nt-ov-titre" id="nt-volet-titre" tabindex="-1">Vous êtes à jour</h2>
            <p class="nt-ov-resume">${t(liste.length ? `Toutes vos notifications sont lues. Dernière notification ${quand(liste[0].at)}.` : 'Rien de nouveau pour le moment.')}${traiter ? t(` ${V.plural(traiter, 'notification attend', 'notifications attendent')} encore une suite de votre part.`) : ''}</p>
            ${traiter ? `<button class="btn btn-secondary btn-sm" type="button" data-nt-vue-directe="a-traiter">${icon('circle-dot')}Voir ce qui reste à traiter</button>` : ''}
          </div>`;
      }
    } else if (!complet) {
      tete = '<h2 class="sr-only" id="nt-volet-titre">Votre semaine et vos préférences</h2>';
    } else {
      tete = '<h2 class="sr-only" id="nt-volet-titre">Votre semaine et vos préférences</h2>';
    }
    return `<div class="nt-apercu-volet">${tete}${semaineHTML()}${emailHTML()}</div>`;
  }

  function rendreVolet({ changement = false } = {}) {
    const volet = $('[data-nt-volet]');
    const n = lecture() === 'volet' && ui.selection ? parId(ui.selection) : null;
    volet.classList.toggle('is-detail', !!n);
    volet.innerHTML = n ? `${barreVolet(n)}${detail(n, false)}` : apercuHTML();
    if (changement && V.motion.full()) { volet.classList.remove('is-change'); void volet.offsetWidth; volet.classList.add('is-change'); }
    animerJauge(volet);
  }
  function animerJauge(scope) {
    if (ui.jaugeVue || !V.motion.full() || !$('.nt-jauge', scope)) return;
    ui.jaugeVue = true;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.nt-jauge [data-p]', scope).forEach(b => b.style.setProperty('--p', b.dataset.p))));
  }

  /* Tête de page, barre d'outils ------------------------------------------------------------------------- */

  function rendreStatut() {
    const nl = liste.filter(nonLue).length;
    const traiter = liste.filter(aTraiter).length;
    const el = $('[data-nt-statut]');
    if (!liste.length) { el.innerHTML = ''; return; }
    el.innerHTML = nl || traiter
      ? [nl ? `<span class="is-nonlues"><i aria-hidden="true"></i>${t(V.plural(nl, 'non lue', 'non lues'))}</span>` : '<span>Tout est lu</span>', traiter ? `<span>${icon('circle-dot', 'icon-xs')}${t(V.plural(traiter, 'à traiter', 'à traiter'))}</span>` : ''].filter(Boolean).join('')
      : `<span>${icon('check-circle', 'icon-xs')}Vous êtes à jour</span>`;
  }
  function rendreTout() {
    const zone = $('[data-nt-tout]');
    if (ui.annulation) {
      zone.innerHTML = `<p class="nt-fait">${icon('check-double')}<span>${t(`${V.plural(ui.annulation.n, 'notification marquée', 'notifications marquées')} comme lue${ui.annulation.n > 1 ? 's' : ''}`)}</span><button class="link-btn" type="button" data-nt-annuler-tout id="nt-annuler-tout">Annuler</button></p>`;
      return;
    }
    const nl = liste.filter(nonLue).length;
    zone.innerHTML = nl ? `<button class="btn btn-secondary btn-sm nt-tout-btn" type="button" data-nt-tout-lire id="nt-tout-lire">${icon('check-double')}Tout marquer comme lu</button>` : '';
  }
  function rendreBarre() {
    $('[data-nt-vues]').innerHTML = VUES.map(([id, label]) => {
      const nb = liste.filter(n => dansType(n) && dansVue(n, id)).length;
      return `<button type="button" aria-pressed="${ui.vue === id}" data-nt-vue="${id}" id="nt-vue-${id}">${t(label)}${id !== 'toutes' && nb ? `<span class="nt-vue-nb${id === 'non-lues' ? ' is-accent' : ''}">${fmt(nb)}</span>` : ''}</button>`;
    }).join('');
    const select = $('[data-nt-type]');
    select.innerHTML = TYPES.filter(c => c.id === 'tout' || c.id === ui.type || liste.some(n => dansType(n, c.id))).map(c => {
      const nb = liste.filter(n => dansType(n, c.id) && dansVue(n)).length;
      return `<option value="${c.id}"${ui.type === c.id ? ' selected' : ''}>${t(c.id === 'tout' ? c.label : `${c.label} (${nb})`)}</option>`;
    }).join('');
  }

  /* Visiteur, liste vide, chargement, erreur ------------------------------------------------------------------- */

  const APERCU = [['Kofi Mensah', 'message', 'accent', true], ['Aïssatou Ndiaye', 'repeat', 'succes', false], ['Léa Martin', 'utile', 'accent', false], ['Mariam Diop', 'check', 'succes', false]];
  const illustration = () => `<div class="nt-illu" aria-hidden="true">
      <div class="nt-illu-liste">${APERCU.map(([nom, ic, ton], i) => `<div class="nt-illu-ligne${i === 0 ? ' is-choisie' : ''}${i < 2 ? ' is-nonlue' : ''}" style="--i:${i}"><span class="nt-illu-point"></span><span class="nt-visuel">${photo(nom)}${puce(ic, ton)}</span><span class="nt-illu-traits"><i style="width:${[76, 64, 70, 58][i]}%"></i><i style="width:${[52, 44, 36, 48][i]}%"></i></span></div>`).join('')}</div>
      <div class="nt-illu-volet"><span class="nt-visuel">${photo('Kofi Mensah')}${puce('message')}</span><i class="is-titre"></i><i class="is-court"></i><span class="nt-illu-bulle"></span><span class="nt-illu-bulle is-vous"></span><span class="nt-illu-champ"></span></div>
    </div>`;

  function rendreVisiteur() {
    const zone = $('[data-nt-acces]');
    zone.innerHTML = `<div class="nt-acces-in">${V.accesBloc('contribuer', 'retrouver vos notifications', 'h2')}${illustration()}</div>`;
    const texte = $('.acces-bloc p', zone);
    if (texte) texte.textContent = typo('Commentaires sur vos créations, essais, votes « Utile » et réponses à vos questions : tout ce qui se passe autour de vos contributions se lit et se traite ici.');
  }

  const squelette = () => `<div class="nt-squelette" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<div class="nt-sq-ligne" style="--i:${i}"><span class="nt-sq-rond"></span><span class="nt-sq-corps"><i style="width:${[78, 64, 84, 58, 72, 66, 80][i]}%"></i><i style="width:${[54, 42, 60, 38, 50, 44, 58][i]}%"></i><i style="width:${[70, 76, 48, 66, 58, 74, 52][i]}%"></i></span></div>`).join('')}</div>`;

  function rendreEtatDonnees(donnees) {
    const zone = $('[data-nt-liste]');
    zone.removeAttribute('aria-busy');
    if (donnees === 'chargement') {
      zone.setAttribute('aria-busy', 'true');
      zone.innerHTML = squelette();
      annoncer('Chargement des notifications…');
      return;
    }
    if (donnees === 'erreur') {
      zone.innerHTML = `<div class="nt-etat is-erreur" role="alert">${icon('wifi-off', '')}<h3>Impossible d’afficher vos notifications</h3><p>${t('La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.')}</p><button class="btn btn-primary btn-sm" type="button" data-nt-reessayer>${icon('replay')}Réessayer</button></div>`;
      return;
    }
    zone.innerHTML = `<div class="nt-etat is-vide"><span class="nt-etat-icone">${icon('bell', '')}</span><h3>Aucune notification pour le moment</h3><p>${t('Quand un membre commentera, essaiera ou votera pour vos contributions, vous le verrez ici.')}</p><div class="nt-etat-actions"><a class="btn btn-primary btn-sm" href="nouvelle-creation.html">${icon('plus')}Publier une création</a><a class="btn btn-secondary btn-sm" href="forum.html?onglet=sans-reponse">Répondre à une question</a></div></div>`;
  }

  /* Rendu --------------------------------------------------------------------------------------------------- */

  let annonceMinuteur;
  function annoncer(message) {
    const el = $('[data-nt-annonce]');
    clearTimeout(annonceMinuteur);
    el.textContent = '';
    annonceMinuteur = setTimeout(() => { el.textContent = typo(message); }, 60);
  }

  /* Garde le focus sur le même élément quand une zone est reconstruite. */
  function garderFocus(fn) {
    const id = document.activeElement && document.activeElement.id;
    fn();
    if (id && document.activeElement !== document.getElementById(id)) document.getElementById(id)?.focus({ preventScroll: true });
  }

  function render() {
    const membre = E.membre();
    $('[data-nt-acces]').hidden = membre;
    $('[data-nt-boite]').hidden = !membre;
    $('[data-nt-ariane]').hidden = !membre;
    $('[data-nt-lien-profil]').href = `profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}`;
    $$('[data-compte-notifs]').forEach(a => a.setAttribute('aria-current', 'page'));
    if (!membre) {
      $('[data-nt-statut]').innerHTML = '';
      $('[data-nt-tout]').innerHTML = '';
      rendreVisiteur();
      return;
    }
    const donnees = settings.donnees || 'remplies';
    const boite = $('[data-nt-boite]');
    boite.dataset.ntMode = lecture();
    boite.dataset.ntDonnees = donnees;
    liste = donnees === 'remplies' ? notifications() : [];
    if (ui.selection && !parId(ui.selection)) ui.selection = null;
    /* Pendant un chargement ou après une erreur, l'en-tête garde son compteur. */
    if (donnees === 'remplies' || donnees === 'vide') synchroniser();
    garderFocus(() => {
      rendreVolet();
      if (donnees !== 'remplies') {
        $('[data-nt-barre]').hidden = true;
        $('[data-nt-statut]').innerHTML = donnees === 'chargement' ? '<span>Chargement…</span>' : '';
        $('[data-nt-tout]').innerHTML = '';
        $('[data-nt-arrivee]').hidden = true;
        rendreEtatDonnees(donnees);
        return;
      }
      $('[data-nt-liste]').removeAttribute('aria-busy');
      $('[data-nt-barre]').hidden = false;
      rendreStatut();
      rendreTout();
      rendreBarre();
      rendreListe();
      rendreArrivee();
    });
    ui.animer = false;
  }

  /* Après une lecture : compteurs, liste et volet, sans rejouer les entrées ni perdre le focus. */
  function rafraichir({ volet = true } = {}) {
    synchroniser();
    garderFocus(() => {
      rendreStatut();
      rendreTout();
      rendreBarre();
      rendreListe();
      if (volet) rendreVolet();
    });
  }

  /* Lecture ---------------------------------------------------------------------------------------------------- */

  function marquer(id, lue) {
    const n = parId(id);
    if (!n) return;
    if (lue === !n.nonLue) delete etat.lues[id]; else etat.lues[id] = lue;
    ecrireEtat();
  }

  /* Nombre de non lues pour l'en-tête, et état « Notifications » commun (etats.js). */
  function synchroniser() {
    if (!E.membre()) return;
    const n = nbNonLues();
    const voulu = n > 0 ? 'nouvelles' : 'lues';
    if (E.get().notifications !== voulu) { ui.interne = true; E.set({ notifications: voulu }); ui.interne = false; }
    V.store.set(CLE_NB, n);
    const avant = Number($('[data-compte-nb]')?.textContent) || 0;
    V.rendreCompte();
    $$('[data-compte-notifs]').forEach(a => a.setAttribute('aria-current', 'page'));
    if (n > avant && V.motion.full()) $$('[data-compte-nb]').forEach(el => { el.classList.remove('nt-bond'); void el.offsetWidth; el.classList.add('nt-bond'); });
  }

  function choisir(id) {
    const n = parId(id);
    if (!n) return;
    const mode = lecture();
    ui.confirmer = null;
    if (mode === 'deplie' && ui.selection === id) {
      ui.selection = null;
      ecrireURL();
      rafraichir({ volet: false });
      document.getElementById(`nt-o-${id}`)?.focus({ preventScroll: true });
      return;
    }
    const etaitNonLue = nonLue(n);
    ui.selection = id;
    ui.focusId = dansType(n) && dansVue(n) ? id : ui.focusId;
    if (etaitNonLue) marquer(id, true);
    ecrireURL();
    synchroniser();
    garderFocus(() => { rendreStatut(); rendreTout(); rendreBarre(); rendreListe(); rendreVolet({ changement: true }); });
    if (mode === 'deplie') {
      const li = $(`[data-nt-id="${CSS.escape(id)}"]`);
      li?.scrollIntoView({ block: 'nearest', behavior: V.motion.full() ? 'smooth' : 'auto' });
    } else {
      const volet = $('[data-nt-volet]');
      if (volet.scrollTop) volet.scrollTop = 0;
    }
    annoncer(`${majuscule(resume(n))}.${etaitNonLue ? ' Marquée comme lue.' : ''}${mode === 'volet' ? ' Affichée dans le volet de lecture.' : ''}`);
  }
  function apercu() {
    const id = ui.selection;
    ui.selection = null;
    ui.confirmer = null;
    ecrireURL();
    garderFocus(() => { rendreListe(); rendreVolet({ changement: true }); });
    document.getElementById(`nt-o-${id}`)?.focus({ preventScroll: true });
  }
  function voisin(delta) {
    const items = ordre();
    const i = items.findIndex(n => n.id === ui.selection);
    const cible = items[i + delta];
    if (!cible) return;
    choisir(cible.id);
    $(delta < 0 ? '#nt-v-prec' : '#nt-v-suiv')?.focus({ preventScroll: true });
    if (document.activeElement?.disabled || document.activeElement === document.body) $('#nt-volet-titre')?.focus({ preventScroll: true });
  }

  function toutLire() {
    const nl = liste.filter(nonLue);
    if (!nl.length) return;
    ui.annulation = { lues: { ...etat.lues }, n: nl.length };
    nl.forEach(n => { etat.lues[n.id] = true; });
    ecrireEtat();
    $$('.nt-item.is-nonlue').forEach((li, j) => li.style.setProperty('--j', String(Math.min(j, 8))));
    rafraichir();
    annoncer(`${V.plural(nl.length, 'notification marquée', 'notifications marquées')} comme lue${nl.length > 1 ? 's' : ''}.`);
    $('#nt-annuler-tout')?.focus();
    clearTimeout(ui.minuteurFait);
    ui.minuteurFait = setTimeout(finAnnulation, 8000);
  }
  function finAnnulation() {
    clearTimeout(ui.minuteurFait);
    if (!ui.annulation) return;
    /* Le message reste tant que le pointeur ou le focus s'y trouve. */
    if ($('[data-nt-tout]').matches(':hover, :focus-within')) { ui.minuteurFait = setTimeout(finAnnulation, 4000); return; }
    ui.annulation = null;
    rendreTout();
  }
  function annulerTout() {
    if (!ui.annulation) return;
    etat.lues = ui.annulation.lues;
    ecrireEtat();
    ui.annulation = null;
    clearTimeout(ui.minuteurFait);
    rafraichir();
    annoncer('Notifications de nouveau non lues.');
    $('#nt-tout-lire')?.focus();
  }

  /* Répondre, accepter une réponse ---------------------------------------------------------------------------------- */

  function publierReponse(form) {
    const id = form.dataset.ntForm;
    const n = parId(id);
    const champ = $('textarea', form);
    const texte = champ.value.trim();
    const min = Number(form.dataset.min) || 1;
    const err = $('.nt-erreur', form);
    const message = !texte ? 'Écrivez votre réponse avant de la publier.' : texte.length < min ? `Votre réponse doit compter au moins ${min} caractères : ajoutez-en ${min - texte.length}.` : '';
    if (message) {
      err.textContent = typo(message);
      err.hidden = false;
      champ.setAttribute('aria-invalid', 'true');
      champ.setAttribute('aria-describedby', `nt-rep-err-${id} nt-rep-aide-${id}`);
      champ.focus();
      return;
    }
    if (!V.exiger('contribuer', 'répondre')) return;
    etat.reponses[id] = { texte, at: N.maintenant };
    ecrireEtat();
    delete ui.brouillons[id];
    rafraichir();
    const titre = lecture() === 'volet' ? $('#nt-volet-titre') : $(`#nt-dt-${CSS.escape(id)}`);
    titre?.focus({ preventScroll: true });
    V.toast('Réponse publiée.');
    annoncer(`Réponse publiée pour ${n.par}.`);
  }
  function confirmerAcceptation(id) {
    const n = parId(id);
    if (!n || !V.exiger('contribuer', 'accepter une réponse')) return;
    etat.acceptees[n.sujet] = id;
    ecrireEtat();
    ui.confirmer = null;
    rafraichir();
    V.toast('Réponse acceptée. Le sujet est marqué résolu.');
    (lecture() === 'volet' ? $('#nt-volet-titre') : $(`#nt-dt-${CSS.escape(id)}`))?.focus({ preventScroll: true });
  }

  /* Notification qui arrive pendant la visite ------------------------------------------------------------------------ */

  function programmerArrivee() {
    clearTimeout(ui.minuteur);
    if (!E.membre() || settings.arrivee !== 'pendant' || settings.donnees !== 'remplies' || ui.attente || ui.recues.length) return;
    ui.minuteur = setTimeout(() => {
      const modele = cleNiveau() === 'curieux' ? N.arrivees.curieux : N.arrivees.membre;
      ui.attente = { ...modele, at: N.maintenant, nonLue: true };
      rendreArrivee();
      synchroniser();
      annoncer(`Nouvelle notification : ${resume(ui.attente)}.`);
    }, 3200);
  }
  function rendreArrivee() {
    const b = $('[data-nt-arrivee]');
    b.hidden = !ui.attente;
    if (ui.attente) b.innerHTML = `${photo(ui.attente.par, 'is-mini')}<span>1 nouvelle notification</span>${icon('arrow-up')}`;
  }
  function afficherArrivee() {
    if (!ui.attente) return;
    const id = ui.attente.id;
    ui.recues.push(ui.attente);
    ui.nouvelle = id;
    ui.attente = null;
    if (ui.vue !== 'toutes' || ui.type !== 'tout') { ui.vue = 'toutes'; ui.type = 'tout'; }
    ui.focusId = id;
    render();
    choisir(id);
    const li = $(`[data-nt-id="${CSS.escape(id)}"]`);
    li?.scrollIntoView({ block: 'center', behavior: V.motion.full() ? 'smooth' : 'auto' });
    document.getElementById(`nt-o-${id}`)?.focus({ preventScroll: true });
    setTimeout(() => { ui.nouvelle = null; li?.classList.remove('is-nouvelle'); }, 2400);
  }

  function ecrireURL() {
    const url = new URL(location.href);
    ['vue', 'type', 'notification'].forEach(k => url.searchParams.delete(k));
    if (ui.vue !== 'toutes') url.searchParams.set('vue', ui.vue);
    if (ui.type !== 'tout') url.searchParams.set('type', ui.type);
    if (ui.selection) url.searchParams.set('notification', ui.selection);
    history.replaceState(null, '', url);
  }

  /* Événements ------------------------------------------------------------------------------------------------------ */

  const main = $('main');
  main.addEventListener('click', event => {
    const el = event.target.closest('[data-nt-basculer], [data-nt-choisir], [data-nt-vue], [data-nt-vue-directe], [data-nt-tout-lire], [data-nt-annuler-tout], [data-nt-plus], [data-nt-tout-voir], [data-nt-email-switch], [data-nt-reessayer], [data-nt-arrivee], [data-nt-apercu], [data-nt-lu-volet], [data-nt-voisin], [data-nt-accepter], [data-nt-confirmer-oui], [data-nt-confirmer-non], [data-nt-lien]');
    if (!el) return;
    const d = el.dataset;
    if ('ntBasculer' in d) {
      const n = parId(d.ntBasculer);
      if (!n) return;
      const lue = nonLue(n);
      marquer(n.id, lue);
      rafraichir();
      annoncer(lue ? `Notification marquée comme lue. ${V.plural(nbNonLues(), 'non lue', 'non lues')}.` : 'Notification marquée comme non lue.');
      return;
    }
    if ('ntChoisir' in d) { choisir(d.ntChoisir); return; }
    if ('ntLuVolet' in d) {
      const n = parId(d.ntLuVolet);
      if (!n) return;
      const lue = nonLue(n);
      marquer(n.id, lue);
      rafraichir();
      annoncer(lue ? 'Notification marquée comme lue.' : 'Notification marquée comme non lue.');
      return;
    }
    if ('ntApercu' in d) { apercu(); return; }
    if ('ntVoisin' in d) { voisin(Number(d.ntVoisin)); return; }
    if ('ntVue' in d || 'ntVueDirecte' in d) {
      const vue = d.ntVue || d.ntVueDirecte;
      if (ui.vue === vue) return;
      ui.vue = vue; ui.limite = PAGE; ui.animer = true;
      ecrireURL();
      garderFocus(() => { rendreBarre(); rendreListe(); });
      ui.animer = false;
      if ('ntVueDirecte' in d) document.getElementById(`nt-vue-${vue}`)?.focus();
      annoncer(`${V.plural(visibles().length, 'notification affichée', 'notifications affichées')}.`);
      return;
    }
    if ('ntToutLire' in d) { toutLire(); return; }
    if ('ntAnnulerTout' in d) { annulerTout(); return; }
    if ('ntPlus' in d) {
      const avant = $$('.nt-ouvrir').length;
      ui.limite = Infinity;
      rendreListe();
      const suivant = $$('.nt-ouvrir')[avant];
      if (suivant) { ui.focusId = suivant.dataset.ntChoisir; $$('.nt-ouvrir').forEach(b => { b.tabIndex = b === suivant ? 0 : -1; }); suivant.focus(); }
      return;
    }
    if ('ntToutVoir' in d) { ui.vue = 'toutes'; ui.type = 'tout'; ui.animer = true; ecrireURL(); rendreBarre(); rendreListe(); ui.animer = false; $('#nt-vue-toutes')?.focus(); return; }
    if ('ntEmailSwitch' in d) {
      if (!V.exiger('parametres', 'modifier vos préférences')) return;
      etat.email = !etat.email;
      ecrireEtat();
      garderFocus(() => rendreVolet());
      V.toast(etat.email ? 'Vous recevrez aussi ces notifications par e-mail.' : 'Ces notifications ne vous seront plus envoyées par e-mail.', 'mail');
      return;
    }
    if ('ntReessayer' in d) {
      V.regler('donnees', 'chargement');
      const zone = $('[data-nt-liste]');
      zone.setAttribute('tabindex', '-1');
      zone.focus({ preventScroll: true });
      setTimeout(() => { V.regler('donnees', 'remplies'); annoncer('Notifications chargées.'); ($('.nt-ouvrir[tabindex="0"]') || zone).focus({ preventScroll: true }); }, 900);
      return;
    }
    if ('ntAccepter' in d) {
      if (!V.exiger('contribuer', 'accepter une réponse')) return;
      ui.confirmer = d.ntAccepter;
      garderFocus(() => rendreDetailCourant());
      $(`#nt-conf-non-${CSS.escape(d.ntAccepter)}`)?.focus();
      return;
    }
    if ('ntConfirmerOui' in d) { confirmerAcceptation(d.ntConfirmerOui); return; }
    if ('ntConfirmerNon' in d) {
      const id = ui.confirmer;
      ui.confirmer = null;
      rendreDetailCourant();
      $(`#nt-acc-${CSS.escape(id)}`)?.focus();
      return;
    }
    if ('ntLien' in d) {
      const n = parId(d.ntLien);
      if (n && nonLue(n)) { marquer(n.id, true); synchroniser(); }
      return;
    }
    if (el.matches('[data-nt-arrivee]')) afficherArrivee();
  });
  function rendreDetailCourant() {
    if (lecture() === 'volet') { rendreVolet(); return; }
    rendreListe();
  }
  main.addEventListener('change', event => {
    if (!event.target.matches('[data-nt-type]')) return;
    ui.type = event.target.value;
    ui.limite = PAGE;
    ui.animer = true;
    ecrireURL();
    garderFocus(() => { rendreBarre(); rendreListe(); });
    ui.animer = false;
    annoncer(`${libelleType()} : ${V.plural(visibles().length, 'notification', 'notifications')}.`);
  });
  main.addEventListener('submit', event => {
    const form = event.target.closest('[data-nt-form]');
    if (!form) return;
    event.preventDefault();
    publierReponse(form);
  });
  main.addEventListener('input', event => {
    const champ = event.target.closest('[data-nt-saisie]');
    if (!champ) return;
    ui.brouillons[champ.dataset.ntSaisie] = champ.value;
    if (champ.getAttribute('aria-invalid') === 'true' && champ.value.trim()) {
      champ.removeAttribute('aria-invalid');
      champ.setAttribute('aria-describedby', `nt-rep-aide-${champ.dataset.ntSaisie}`);
      const err = $(`#nt-rep-err-${CSS.escape(champ.dataset.ntSaisie)}`);
      if (err) err.hidden = true;
    }
  });
  main.addEventListener('keydown', event => {
    const champ = event.target.closest('[data-nt-saisie]');
    if (champ) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); publierReponse(champ.closest('form')); }
      return;
    }
    /* Dans le volet : Échap ramène à la notification dans la liste. */
    if (event.key === 'Escape' && event.target.closest('[data-nt-volet]') && ui.selection) {
      event.preventDefault();
      document.getElementById(`nt-o-${ui.selection}`)?.focus();
      return;
    }
    const cur = event.target.closest('[data-nt-nav]');
    if (!cur || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const navs = $$('[data-nt-nav]');
    const i = navs.indexOf(cur);
    const j = event.key === 'Home' ? 0 : event.key === 'End' ? navs.length - 1 : i + (event.key === 'ArrowDown' ? 1 : -1);
    if (j < 0 || j >= navs.length) return;
    event.preventDefault();
    navs.forEach((b, k) => { b.tabIndex = k === j ? 0 : -1; });
    ui.focusId = navs[j].dataset.ntChoisir;
    navs[j].focus();
  });
  /* Barre d'outils collante : sa hauteur place les intitulés des groupes juste dessous. */
  if ('ResizeObserver' in window) new ResizeObserver(([e]) => document.documentElement.style.setProperty('--nt-barre-h', `${Math.round(e.target.getBoundingClientRect().height)}px`)).observe($('[data-nt-barre]'));
  large.addEventListener('change', () => { ui.animer = false; render(); });

  /* Réglages et états ---------------------------------------------------------------------------------------------------- */

  const membre = e => e.session === 'membre';
  V.initTweaks({
    key: 'vysora-notifications-reglages',
    etats: [
      { name: 'donnees', legend: 'Liste des notifications', options: [['remplies', 'Remplie'], ['vide', 'Vide'], ['chargement', 'En chargement'], ['erreur', 'Erreur de chargement']], si: membre },
      { name: 'alerte', legend: 'Alerte sur une création publiée', options: [['aucune', 'Aucune'], ['obsolescence', 'Obsolescence signalée'], ['masque', 'Masquée par la modération'], ['retabli', 'Rétablie après correction']], si: e => membre(e) && e.niveau !== 'curieux' },
      { name: 'arrivee', legend: 'Nouvelle notification', options: [['aucune', 'Aucune'], ['pendant', 'Pendant la visite']], si: membre }
    ],
    apparence: [
      { name: 'lecture', legend: 'Lecture', options: [['volet', 'Volet de lecture'], ['depliage', 'Dépliage dans la liste']] },
      { name: 'regroupement', legend: 'Regroupement', options: [['date', 'Par date'], ['contenu', 'Par contenu']] },
      { name: 'nonlues', legend: 'Notifications non lues', options: [['pastille', 'Pastille'], ['teinte', 'Fond teinté']] },
      { name: 'extraits', legend: 'Extraits dans la liste', options: [['affiches', 'Affichés'], ['masques', 'Masqués']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { donnees: 'remplies', alerte: 'aucune', arrivee: 'aucune', lecture: 'volet', regroupement: 'date', nonlues: 'pastille', extraits: 'affiches' },
    onChange: (changed, next) => {
      settings = next;
      if (changed === 'init') return;
      if (changed === 'reset' && $('[data-tw-tab="etats"]')?.getAttribute('aria-selected') !== 'false') {
        etat = { lues: {}, reponses: {}, acceptees: {}, email: true };
        ecrireEtat();
        Object.assign(ui, { recues: [], attente: null, selection: null, brouillons: {}, annulation: null, nouvelle: null, confirmer: null });
        clearTimeout(ui.minuteur);
      }
      if (['nonlues', 'extraits', 'accent', 'density', 'radius', 'effects', 'motion'].includes(changed)) return;
      if (changed === 'arrivee' && settings.arrivee === 'aucune') { ui.attente = null; ui.recues = []; clearTimeout(ui.minuteur); }
      ui.animer = changed !== 'lecture';
      render();
      programmerArrivee();
    }
  });

  E.on((e, changed = []) => {
    if (changed.includes('notifications') && !ui.interne) {
      if (e.notifications === 'lues') { liste.forEach(n => { if (n.nonLue) etat.lues[n.id] = true; else delete etat.lues[n.id]; }); ui.attente = null; }
      else etat.lues = {};
      ecrireEtat();
      ui.annulation = null;
    }
    if (changed.includes('notifications') && ui.interne) return;
    if (changed.includes('session')) ui.jaugeVue = false;
    ui.animer = changed.includes('session') || changed.includes('niveau');
    render();
    programmerArrivee();
  });

  /* Au départ : l'en-tête et la page racontent la même chose. « Toutes lues » réglé ailleurs : tout est lu ;
     état commun changé ailleurs (le nombre gardé a été effacé) : on repart des notifications de départ. */
  if (E.membre()) {
    liste = settings.donnees === 'remplies' ? notifications() : [];
    if (E.get().notifications === 'lues') liste.forEach(n => { if (n.nonLue) etat.lues[n.id] = true; else delete etat.lues[n.id]; });
    else if (V.store.get(CLE_NB, null) === null || !liste.some(nonLue)) etat.lues = {};
    /* Arrivée depuis le bandeau « Voir la décision » : la décision est ouverte. */
    const decision = liste.find(n => n.epinglee && nonLue(n));
    if (!ui.selection && decision) ui.selection = decision.id;
    if (ui.selection && parId(ui.selection)) { etat.lues[ui.selection] = true; if (parId(ui.selection).nonLue === false) delete etat.lues[ui.selection]; ui.focusId = ui.selection; }
    ecrireEtat();
  }

  V.initHeader();
  render();
  programmerArrivee();
  document.documentElement.classList.add('nt-pret');
})();
