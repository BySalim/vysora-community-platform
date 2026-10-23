'use strict';

/* Page Paramètres (EC-17 ; F-02, F-06, F-07, F-08) : le compte du membre connecté.
   Cinq rubriques (Compte, Connexion et sécurité, Notifications, Mes données, Supprimer le compte),
   faites de lignes séparées par des filets. Les choix simples (langue, fuseau, e-mails) s'enregistrent
   dès qu'ils changent ; les autres réglages s'ouvrent dans leur ligne, ou dans une fenêtre avec le
   réglage « Modification ». Les valeurs modifiées sont gardées sur l'appareil (vysora-parametres) ;
   la préférence d'e-mail est celle de la page Notifications (vysora-notifications). Une demande de
   suppression déconnecte le membre et laisse la page de départ (vysora-parametres-depart). */

(() => {
  const V = window.Vysora;
  const Au = window.VysoraAuth;
  const A = window.VYSORA_AUTH;
  const P = window.VYSORA_PROFIL;
  const PUB = window.VYSORA_PUBLIER;
  const PA = window.VYSORA_PARAMETRES;
  const D = V.D;
  const E = V.etats;
  const { $, $$, t, esc, icon, fmt, typo } = V;
  const root = document.documentElement;
  const CLE = 'vysora-parametres';
  const CLE_NT = 'vysora-notifications';
  const CLE_DEPART = 'vysora-parametres-depart';
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const ANONYME = 'membre-supprimé-7f3a';
  const PSEUDO_INTERDIT = /[^\p{L}\p{N}_-]/u;

  const RUBRIQUES = [
    { id: 'compte', label: 'Compte', icone: 'user' },
    { id: 'securite', label: 'Connexion et sécurité', icone: 'lock' },
    { id: 'notifications', label: 'Notifications', icone: 'bell' },
    { id: 'donnees', label: 'Mes données', icone: 'download' },
    { id: 'suppression', label: 'Supprimer le compte', icone: 'trash' }
  ];
  const SERVICES = { google: 'Google', github: 'GitHub' };
  const DOCUMENTS = [['cgu', 'cgu.html'], ['confidentialite', 'confidentialite.html'], ['charte', 'charte-communautaire.html']];
  const FREQUENCES = [['immediat', 'Dès l’événement'], ['jour', 'Un résumé par jour, à 18 h'], ['semaine', 'Un résumé le lundi']];

  const params = new URLSearchParams(location.search);
  const demandee = [params.get('rubrique'), location.hash.slice(1)].find(id => RUBRIQUES.some(r => r.id === id));
  let settings = {};
  const ui = {
    rubrique: demandee || 'compte',
    edition: null, sale: false, garde: null, retour: null,
    confirmer: null, flash: null, minuteurFlash: null, minuteurExport: null,
    lienSuppression: false, interne: false, blob: null
  };

  /* Valeurs gardées sur l'appareil --------------------------------------------------------- */

  const evenementsDefaut = () => Object.fromEntries(PA.evenements.flatMap(g => g.items.map(i => [i.id, Boolean(i.email || i.toujours)])));
  const INITIAL = () => ({
    pseudo: E.MOI.pseudo, email: PA.email, nouvelEmail: PA.nouvelEmail, langue: 'fr', fuseau: 'Africa/Dakar',
    mdpLe: null, liaisonGoogle: null, github: null, emailEnvoi: null, appareils: PA.appareils.map(a => a.id),
    evenements: evenementsDefaut(), frequence: 'immediat', signalements: true, exportDemande: null
  });
  function lireEtat() {
    const s = V.store.get(CLE, {}) || {};
    const e = INITIAL();
    const texte = (cle, ok) => { if (typeof s[cle] === 'string' && ok(s[cle])) e[cle] = s[cle]; };
    texte('pseudo', v => !PSEUDO_INTERDIT.test(v) && [...v].length >= 3 && [...v].length <= 30);
    texte('email', Au.emailValide);
    texte('nouvelEmail', Au.emailValide);
    texte('langue', v => PA.langues.some(l => l.id === v));
    texte('fuseau', v => PA.fuseaux.some(f => f.id === v));
    texte('frequence', v => FREQUENCES.some(([id]) => id === v));
    ['mdpLe', 'liaisonGoogle', 'github'].forEach(cle => texte(cle, v => /^\d{4}-\d{2}-\d{2}$/.test(v)));
    if (Array.isArray(s.appareils)) e.appareils = PA.appareils.map(a => a.id).filter(id => id === 'ici' || s.appareils.includes(id));
    if (s.evenements && typeof s.evenements === 'object') Object.keys(e.evenements).forEach(id => { if (typeof s.evenements[id] === 'boolean') e.evenements[id] = s.evenements[id]; });
    if (typeof s.signalements === 'boolean') e.signalements = s.signalements;
    ['exportDemande', 'emailEnvoi'].forEach(cle => { if (s[cle] && /^\d{4}-\d{2}-\d{2}$/.test(s[cle].le) && /^\d{2}:\d{2}$/.test(s[cle].heure)) e[cle] = { le: s[cle].le, heure: s[cle].heure }; });
    PA.evenements.forEach(g => g.items.forEach(i => { if (i.toujours) e.evenements[i.id] = true; }));
    return e;
  }
  let etat = lireEtat();
  const ecrire = () => V.store.set(CLE, etat);

  /* Préférence d'e-mail partagée avec la page Notifications (F-81). */
  const lireNt = () => V.store.get(CLE_NT, {}) || {};
  const emailsActifs = () => lireNt().email !== false;
  const ecrireEmailsActifs = valeur => V.store.set(CLE_NT, { ...lireNt(), email: valeur });

  /* Contexte ----------------------------------------------------------------------------------- */

  const membre = () => E.membre();
  const propositions = () => settings.perimetre !== 'mvp';
  const aMotDePasse = () => settings.connexion !== 'google';
  const lie = service => (service === 'google' ? settings.connexion !== 'mdp' : Boolean(etat.github));
  const profil = () => P.niveaux[E.get().niveau] || P.niveaux.apprenti;
  const inscription = () => profil().depuis;
  const nbCreations = () => profil().stats.creations;
  const langue = () => PA.langues.find(l => l.id === etat.langue) || PA.langues[0];
  const fuseau = () => PA.fuseaux.find(f => f.id === etat.fuseau) || PA.fuseaux[0];

  const attendre = ms => new Promise(resolve => setTimeout(resolve, ms));
  const jour = iso => new Date(`${iso.slice(0, 10)}T12:00:00`);
  const dateLongue = iso => { const d = jour(iso); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const plusJours = (iso, n) => { const d = jour(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const masquer = email => { const [nom, domaine] = email.split('@'); return `${nom.charAt(0)}•••••@${domaine}`; };
  const heureActuelle = () => new Date().toTimeString().slice(0, 5);
  const enTete = () => (root.hasAttribute('data-header-hidden') ? 0 : $('[data-header]')?.offsetHeight || 72);
  /* Hauteur occupée en haut de l'écran : en-tête, et sur mobile la barre des rubriques. */
  const decalageHaut = () => {
    const rail = $('[data-pa-rail]');
    const horizontal = rail && getComputedStyle($('.pa-rail-liste') || rail).display === 'flex';
    return (enTete() || 72) + (horizontal ? rail.offsetHeight : 0) + 20;
  };
  const doux = () => (V.motion.full() ? 'smooth' : 'auto');

  function formatExemple(locale) {
    const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(jour(D.today));
    return `${date} · ${new Intl.NumberFormat(locale).format(1284.5)}`;
  }
  function decalage(zone) {
    try { return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value; } catch { return ''; }
  }
  function heureDans(zone) {
    try { return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch { return ''; }
  }
  const fuseauAppareil = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })();

  /* Éléments communs ---------------------------------------------------------------------------- */

  const statut = (ton, ic, texte) => `<span class="pa-statut" data-ton="${ton}">${icon(ic, 'icon-sm')}${t(texte)}</span>`;
  const interrupteur = (id, on, etiquette, { decrit = '', label = '', inactif = false } = {}) => `<button class="pa-switch" type="button" role="switch" aria-checked="${on}"${etiquette ? ` aria-labelledby="${etiquette}"` : ''}${label ? ` aria-label="${esc(typo(label))}"` : ''}${decrit ? ` aria-describedby="${decrit}"` : ''} data-pa-switch="${id}"${inactif ? ' disabled' : ''}><span aria-hidden="true"></span></button>`;
  const groupeTitre = (id, ic, titre) => `<h3 class="pa-groupe-titre" id="pa-g-${id}" tabindex="-1">${icon(ic)}<span>${t(titre)}</span></h3>`;
  function modifier(cle, label = 'Modifier', objet = '', classe = 'btn-secondary') {
    const fenetre = settings.edition === 'fenetre';
    return `<button class="btn ${classe} btn-sm" type="button" data-pa-modifier="${cle}" aria-expanded="${ui.edition === cle}" ${fenetre ? 'aria-haspopup="dialog"' : `aria-controls="pa-edition-${cle}"`}>${t(label)}${objet ? `<span class="sr-only"> ${t(objet)}</span>` : ''}</button>`;
  }
  function ligne({ cle, titre, valeur = '', aide = '', action = '', niveau = 3, suite = '', classe = '' }) {
    const ouverte = ui.edition === cle && settings.edition !== 'fenetre';
    const h = `h${niveau}`;
    return `<div class="pa-ligne${ouverte ? ' is-ouverte' : ''}${ui.flash === cle ? ' is-flash' : ''}${classe ? ` ${classe}` : ''}" data-pa-ligne="${cle}">
      <${h} class="pa-ligne-titre" id="pa-t-${cle}">${titre}</${h}>
      <div class="pa-ligne-valeur">${valeur}${aide ? `<p class="pa-aide" id="pa-a-${cle}">${aide}</p>` : ''}</div>
      <div class="pa-ligne-action">${ui.flash === cle ? `<span class="pa-fait" data-pa-fait>${icon('check', 'icon-sm')}Enregistré</span>` : ''}${action}</div>
      ${suite}
      ${FORMS[cle] ? `<div class="pa-edition" id="pa-edition-${cle}" data-pa-slot="${cle}"></div>` : ''}
    </div>`;
  }

  /* Tête de page -------------------------------------------------------------------------------- */

  function rendreTete() {
    $('[data-pa-ariane]').innerHTML = membre()
      ? `<ol><li><a href="profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}">Mon profil</a></li><li><span aria-current="page">Paramètres</span></li></ol>`
      : '<ol><li><a href="index.html">Accueil</a></li><li><span aria-current="page">Paramètres</span></li></ol>';
    const qui = $('[data-pa-qui]');
    qui.hidden = !membre();
    if (!membre()) { qui.innerHTML = ''; return; }
    const e = E.get();
    const niv = E.niveau();
    qui.innerHTML = `${V.avatarMoi(48)}<p><b>${t(E.MOI.nom)}</b><span>${t(etat.pseudo)}<i aria-hidden="true">·</i>${t(`${niv.nom}, ${fmt(niv.points)} points`)}${e.role !== 'membre' ? `<i aria-hidden="true">·</i><em>${t(E.ROLES[e.role])}</em>` : ''}</span><span>${t(`Membre depuis le ${dateLongue(inscription())}`)}</span></p>`;
  }

  /* Rail des rubriques ----------------------------------------------------------------------------- */

  function attention(id) {
    const e = E.get();
    if (id === 'compte' && e.compte === 'email') return 'adresse e-mail à confirmer';
    if (id === 'compte' && settings.changement === 'attente') return 'changement d’adresse en attente';
    if (id === 'donnees' && e.compte === 'conditions') return 'conditions à accepter';
    if (id === 'donnees' && settings.export === 'pret') return 'export prêt';
    return '';
  }
  function rendreRail() {
    const onglets = settings.navigation === 'onglets';
    $('[data-pa-rail]').innerHTML = `<ul class="pa-rail-liste">${RUBRIQUES.map(r => {
      const a = attention(r.id);
      return `<li${r.id === 'suppression' ? ' class="is-fin"' : ''}><a href="${onglets ? `?rubrique=${r.id}` : `#${r.id}`}" data-pa-aller="${r.id}">${icon(r.icone)}<span>${t(r.label)}</span>${a ? `<span class="pa-rail-point" aria-hidden="true"></span><span class="sr-only">, ${t(a)}</span>` : ''}</a></li>`;
    }).join('')}<li class="pa-rail-indic" aria-hidden="true" data-pa-indic></li></ul>`;
    majRail(false);
  }
  function majRail(anime = true) {
    const onglets = settings.navigation === 'onglets';
    let actif = null;
    $$('[data-pa-aller]', $('[data-pa-rail]')).forEach(a => {
      const on = a.dataset.paAller === ui.rubrique;
      if (on) { a.setAttribute('aria-current', onglets ? 'page' : 'location'); actif = a; } else a.removeAttribute('aria-current');
    });
    const indic = $('[data-pa-indic]');
    if (!indic || !actif) return;
    indic.classList.toggle('is-fixe', !anime);
    const li = actif.parentElement;
    indic.style.setProperty('--x', `${li.offsetLeft}px`);
    indic.style.setProperty('--y', `${li.offsetTop}px`);
    indic.style.setProperty('--w', `${li.offsetWidth}px`);
    indic.style.setProperty('--h', `${li.offsetHeight}px`);
    indic.classList.toggle('is-danger', ui.rubrique === 'suppression');
    /* Sur mobile, la rubrique active reste visible dans le rail horizontal. */
    const liste = $('.pa-rail-liste');
    if (liste && liste.scrollWidth > liste.clientWidth + 2) {
      const cible = li.offsetLeft - (liste.clientWidth - li.offsetWidth) / 2;
      liste.scrollTo({ left: cible, behavior: anime ? doux() : 'auto' });
    }
  }

  /* Rubrique Compte -------------------------------------------------------------------------------- */

  function compteHTML() {
    const e = E.get();
    const aConfirmer = e.compte === 'email';
    const attente = settings.changement === 'attente';
    const envoi = etat.emailEnvoi || { le: D.today, heure: PA.changement.heure };
    const pseudo = ligne({
      cle: 'pseudo', titre: 'Pseudo',
      valeur: `<p class="pa-valeur">${t(etat.pseudo)}</p>`,
      aide: `Adresse de votre profil : <a href="profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}">/membres/${t(etat.pseudo)}</a>`,
      action: modifier('pseudo', 'Modifier', 'le pseudo')
    });
    const adresse = ligne({
      cle: 'email', titre: 'Adresse e-mail',
      valeur: `<p class="pa-valeur pa-valeur-ligne"><span class="pa-coupe">${t(etat.email)}</span>${aConfirmer ? statut('attention', 'alert', 'À confirmer') : statut('ok', 'check-circle', 'Confirmée')}</p>`
        + (attente ? `<div class="pa-attente"><p class="pa-attente-quoi">${icon('clock', 'icon-sm')}<span><b>${t(etat.nouvelEmail)}</b> en attente de confirmation</span></p><p class="pa-aide">${t(`Lien envoyé le ${dateLongue(envoi.le)} à ${envoi.heure}, valable 24 heures. D’ici là, votre adresse actuelle reste active ; elle a reçu une alerte du changement.`)}</p><div class="pa-attente-actions"><button class="btn btn-quiet btn-sm" type="button" data-pa-email-renvoyer>${icon('replay', 'icon-sm')}Renvoyer le lien</button><button class="btn btn-quiet btn-sm" type="button" data-pa-email-annuler>Annuler le changement</button></div></div>` : ''),
      aide: attente ? '' : aConfirmer ? t('Ouvrez le lien reçu à l’inscription pour publier, voter et répondre.') : t('Jamais visible sur votre profil public.'),
      action: attente ? '' : `${aConfirmer ? '<button class="btn btn-quiet btn-sm" type="button" data-acces-bouton="email">Renvoyer le lien</button>' : ''}${modifier('email', 'Modifier', 'l’adresse e-mail')}`
    });
    const l = langue();
    const langueLigne = ligne({
      cle: 'langue', titre: `<label for="pa-langue">Langue de l’interface</label>`,
      valeur: `<div class="pa-select"><select id="pa-langue" data-pa-langue aria-describedby="pa-a-langue">${PA.langues.map(x => `<option value="${x.id}" lang="${x.id}"${x.id === l.id ? ' selected' : ''}>${t(x.nom)}</option>`).join('')}</select>${icon('chevron-down', 'icon-sm')}</div>`,
      aide: `${t(`Dates et nombres : ${formatExemple(l.locale)}.`)} ${t('Les créations restent dans la langue de leur auteur.')}`
    });
    const f = fuseau();
    const suggestion = fuseauAppareil && fuseauAppareil !== f.id && PA.fuseaux.find(x => x.id === fuseauAppareil);
    const fuseauLigne = propositions() ? ligne({
      cle: 'fuseau', titre: '<label for="pa-fuseau">Fuseau horaire</label>',
      valeur: `<div class="pa-select"><select id="pa-fuseau" data-pa-fuseau aria-describedby="pa-a-fuseau">${PA.fuseaux.map(x => `<option value="${x.id}"${x.id === f.id ? ' selected' : ''}>${t(`${x.ville} (${decalage(x.id)})`)}</option>`).join('')}</select>${icon('chevron-down', 'icon-sm')}</div>`,
      aide: `${t(`Il est ${heureDans(f.id)} à ${f.ville}. Les horaires des défis et des notifications suivent ce fuseau.`)}${suggestion ? ` <button class="lien" type="button" data-pa-fuseau-appareil="${suggestion.id}">${t(`Utiliser ${suggestion.ville}, le fuseau de cet appareil`)}</button>` : ''}`
    }) : '';
    const profilLigne = ligne({
      cle: 'profil', titre: 'Profil public',
      valeur: `<p class="pa-valeur">${t('Photo, biographie et lien personnel')}</p>`,
      aide: t('Ils se modifient depuis votre profil, avec un aperçu de ce que voient les autres membres.'),
      action: `<a class="btn btn-quiet btn-sm" href="profil.html?pseudo=${encodeURIComponent(E.MOI.pseudo)}">Ouvrir mon profil${icon('arrow', 'icon-sm')}</a>`
    });
    return `<div class="pa-lignes">${pseudo}${adresse}${langueLigne}${fuseauLigne}${profilLigne}</div>`;
  }

  /* Rubrique Connexion et sécurité ------------------------------------------------------------------- */

  const logoService = s => `<span class="pa-logo" data-service="${s}">${Au.LOGOS[s]}</span>`;
  function securiteHTML() {
    const methodes = [
      aMotDePasse() && `<li>${icon('mail', 'icon-sm')}${t('Adresse e-mail et mot de passe')}</li>`,
      lie('google') && `<li>${logoService('google')}Google</li>`,
      lie('github') && `<li>${logoService('github')}GitHub</li>`
    ].filter(Boolean);
    const intro = `<div class="pa-methodes"><p>${t(methodes.length > 1 ? 'Vous vous connectez avec :' : 'Vous vous connectez uniquement avec :')}</p><ul>${methodes.join('')}</ul></div>`;
    const mdp = aMotDePasse()
      ? ligne({
        cle: 'mdp', titre: 'Mot de passe',
        valeur: '<p class="pa-valeur pa-secret"><span aria-hidden="true">••••••••••••</span><span class="sr-only">Mot de passe défini</span></p>',
        aide: t(etat.mdpLe ? `Modifié le ${dateLongue(etat.mdpLe)}` : `Défini à l’inscription, le ${dateLongue(inscription())}`),
        action: modifier('mdp', 'Modifier', 'le mot de passe')
      })
      : ligne({
        cle: 'definir', titre: 'Mot de passe',
        valeur: `<p class="pa-valeur is-vide">${t('Aucun mot de passe')}</p>`,
        aide: t('Avec un mot de passe, vous pourrez aussi vous connecter avec votre adresse e-mail.'),
        action: modifier('definir', 'Définir un mot de passe')
      });
    const services = Object.keys(SERVICES).map(serviceHTML).join('');
    return `${intro}<div class="pa-lignes">${mdp}</div>
      <section class="pa-groupe" aria-labelledby="pa-g-services">${groupeTitre('services', 'link', 'Comptes liés')}<div class="pa-lignes">${services}</div></section>
      ${propositions() ? appareilsHTML() : ''}`;
  }
  function serviceHTML(s) {
    const nom = SERVICES[s];
    const info = A.services[s];
    const estLie = lie(s);
    const seul = estLie && !aMotDePasse() && (s === 'google' || !lie('google'));
    const quand = s === 'google' ? (etat.liaisonGoogle || inscription()) : etat.github;
    let suite = '';
    if (ui.confirmer === `delier-${s}`) {
      suite = seul
        ? `<div class="pa-confirmer" role="alertdialog" aria-labelledby="pa-c-${s}" data-pa-confirmer><p id="pa-c-${s}">${t(`${nom} est votre seul moyen de connexion. Définissez d’abord un mot de passe pour pouvoir le délier.`)}</p><div><button class="btn btn-quiet btn-sm" type="button" data-pa-delier-non>Fermer</button><button class="btn btn-secondary btn-sm" type="button" data-pa-modifier="definir">Définir un mot de passe</button></div></div>`
        : `<div class="pa-confirmer" role="alertdialog" aria-labelledby="pa-c-${s}" data-pa-confirmer><p id="pa-c-${s}"><b>${t(`Délier ${nom} ?`)}</b> ${t(`Vous ne pourrez plus vous connecter avec ${nom}. Vous pourrez le lier de nouveau à tout moment.`)}</p><div><button class="btn btn-quiet btn-sm" type="button" data-pa-delier-non>Annuler</button><button class="btn btn-secondary btn-sm" type="button" data-pa-delier-oui="${s}">${t(`Délier ${nom}`)}</button></div></div>`;
    }
    return ligne({
      cle: s, niveau: 4, classe: 'pa-service',
      titre: `${logoService(s)}<span>${t(nom)}</span>`,
      valeur: estLie ? `<p class="pa-valeur">${t(s === 'github' ? info.compte : info.email)}</p>` : `<p class="pa-valeur is-vide">${t('Non lié')}</p>`,
      aide: estLie ? t(`Lié le ${dateLongue(quand)}`) : t(`Connectez-vous en un clic avec votre compte ${nom}.`),
      action: estLie
        ? `<button class="btn btn-quiet btn-sm" type="button" data-pa-delier="${s}" aria-expanded="${ui.confirmer === `delier-${s}`}">Délier<span class="sr-only"> ${t(nom)}</span></button>`
        : `<button class="btn btn-secondary btn-sm" type="button" data-pa-lier="${s}">${t(`Lier ${nom}`)}</button>`,
      suite
    });
  }
  function activite(a) {
    if (a.actuel) return `<span class="pa-actif"><i aria-hidden="true"></i>${t('Actif maintenant')}</span>`;
    const [date, heure] = a.vu.split('T');
    const n = V.daysAgo(date);
    return t(`Dernière activité ${V.relativeDay(date)}${n <= 1 && heure ? ` à ${heure}` : ''}`);
  }
  function appareilsHTML() {
    const liste = PA.appareils.filter(a => etat.appareils.includes(a.id));
    const autres = liste.filter(a => !a.actuel);
    return `<section class="pa-groupe" aria-labelledby="pa-g-appareils">${groupeTitre('appareils', 'monitor', 'Appareils connectés')}
      <ul class="pa-appareils">${liste.map(a => `<li class="pa-appareil" data-pa-appareil="${a.id}">
        <span class="pa-appareil-icone" aria-hidden="true">${icon(a.type === 'telephone' ? 'phone' : 'monitor')}</span>
        <div><p class="pa-appareil-nom">${t(a.nom)}${a.actuel ? `<span class="pa-ici">${t('Cet appareil')}</span>` : ''}</p><p class="pa-aide">${t(a.lieu)}<i aria-hidden="true">·</i>${activite(a)}</p></div>
        ${a.actuel ? '' : `<button class="btn btn-quiet btn-sm" type="button" data-pa-sortir="${a.id}">${t('Déconnecter')}<span class="sr-only"> ${t(a.nom)}</span></button>`}
      </li>`).join('')}</ul>
      ${autres.length > 1 ? `<div class="pa-groupe-pied"><button class="btn btn-secondary btn-sm" type="button" data-pa-sortir-tous>${icon('logout', 'icon-sm')}${t('Déconnecter les autres appareils')}</button></div>` : autres.length ? '' : `<p class="pa-groupe-note">${t('Votre compte n’est ouvert que sur cet appareil.')}</p>`}
    </section>`;
  }

  /* Rubrique Notifications ----------------------------------------------------------------------------- */

  function notificationsHTML() {
    const actif = emailsActifs();
    const aConfirmer = E.get().compte === 'email';
    const intro = `<p class="pa-intro">${t('Vos notifications arrivent toujours dans Vysora. Choisissez celles que vous recevez aussi par e-mail, à')} <b>${t(etat.email)}</b>.</p>`;
    const aide = aConfirmer ? t('Confirmez votre adresse e-mail pour les recevoir.') : '';
    let corps;
    if (!propositions()) {
      corps = `<div class="pa-lignes">${ligne({
        cle: 'emails', titre: 'Réponses à vos sujets et réponses acceptées',
        aide: aide || t(actif ? 'Envoyées aussi par e-mail.' : 'Visibles uniquement dans Vysora.'),
        action: interrupteur('emails', actif, 'pa-t-emails', { decrit: 'pa-a-emails' })
      })}</div>`;
    } else {
      const matrice = `<div class="pa-matrice-zone${actif ? '' : ' is-inactive'}"><table class="pa-matrice">
        <caption class="sr-only">${t('Notifications reçues dans Vysora et par e-mail')}</caption>
        <thead><tr><th scope="col">${t('Événement')}</th><th scope="col">${t('Dans Vysora')}</th><th scope="col">${t('Par e-mail')}</th></tr></thead>
        ${PA.evenements.map(g => `<tbody><tr class="pa-matrice-groupe"><th scope="rowgroup" colspan="3">${icon(g.icone, 'icon-sm')}${t(g.titre)}</th></tr>${g.items.map(i => `<tr${ui.flash === `evt:${i.id}` ? ' class="is-flash"' : ''}>
          <th scope="row">${t(i.label)}</th>
          <td><span class="pa-toujours-app">${icon('check', 'icon-sm')}<span class="sr-only">${t('Toujours')}</span></span></td>
          <td>${i.toujours ? `<span class="pa-toujours">${icon('lock', 'icon-xs')}${t('Toujours')}</span>` : interrupteur(`evt:${i.id}`, actif && etat.evenements[i.id], '', { label: `${i.label}, par e-mail`, inactif: !actif })}</td>
        </tr>`).join('')}</tbody>`).join('')}
      </table></div>`;
      const frequence = `<fieldset class="pa-frequence"${actif ? '' : ' disabled'}><legend>${t('Envoi des e-mails')}</legend><div class="pa-segment">${FREQUENCES.map(([id, label]) => `<label><input type="radio" name="pa-frequence" value="${id}" data-pa-frequence${etat.frequence === id ? ' checked' : ''}><span>${t(label)}</span></label>`).join('')}</div></fieldset>`;
      corps = `<div class="pa-lignes">${ligne({
        cle: 'emails', titre: 'Notifications par e-mail',
        aide: aide || t(actif ? 'Selon vos choix ci-dessous. Les e-mails liés à votre compte sont toujours envoyés.' : 'Désactivées : vos notifications restent visibles dans Vysora.'),
        action: interrupteur('emails', actif, 'pa-t-emails', { decrit: 'pa-a-emails' })
      })}</div>${matrice}${frequence}
      <div class="pa-lignes" data-pour="moderation">${ligne({
        cle: 'signalements', titre: 'Signalements en attente',
        aide: t('Un e-mail par jour quand la file de modération contient des signalements ouverts depuis plus de 48 heures.'),
        action: interrupteur('signalements', etat.signalements, 'pa-t-signalements', { decrit: 'pa-a-signalements' })
      })}</div>`;
    }
    const toujours = `<section class="pa-groupe" aria-labelledby="pa-g-toujours">${groupeTitre('toujours', 'lock', 'Toujours envoyés par e-mail')}
      <p class="pa-groupe-note">${t('Ils concernent la sécurité de votre compte et vos droits.')}</p>
      <ul class="pa-colonnes">${PA.emailsToujours.map(x => `<li>${icon('mail', 'icon-sm')}${t(x)}</li>`).join('')}</ul></section>`;
    return `${intro}${corps}${toujours}<p class="pa-renvoi"><a href="notifications.html">${t('Ouvrir mes notifications')}${icon('arrow', 'icon-sm')}</a></p>`;
  }

  /* Rubrique Mes données ----------------------------------------------------------------------------------- */

  function construireExport() {
    const e = E.get();
    const prof = profil();
    const act = PA.activite[e.niveau] || PA.activite.apprenti;
    const niv = E.niveau();
    const creations = P.creations.slice(0, prof.stats.creations).map(c => {
      const ex = PUB.exemples[c.id] || {};
      return { titre: ex.titre || '', categorie: c.categorie || ex.categorie || '', licence: ex.licence || 'CC BY 4.0', publiee_le: ex.publie || null };
    });
    const jours = n => plusJours(D.today, -n);
    const serie = (n, fabrique) => Array.from({ length: n }, (_, i) => fabrique(i));
    const sortes = ['réponse', 'commentaire', 'réponse', 'sujet'];
    const donnees = {
      compte: {
        pseudo: etat.pseudo, email: etat.email, langue: etat.langue, fuseau_horaire: etat.fuseau,
        inscription: inscription(), niveau: niv.nom, reputation: niv.points, role: E.ROLES[e.role],
        notifications_email: emailsActifs(), comptes_lies: Object.keys(SERVICES).filter(lie).map(s => SERVICES[s])
      },
      documents_acceptes: DOCUMENTS.map(([cle]) => ({ document: A.documents[cle].titre, version: A.documents[cle].version, acceptee: !(e.compte === 'conditions' && A.documents[cle].changement) })),
      creations,
      sujets_reponses_commentaires: serie(act.messages, i => ({ type: sortes[i % sortes.length], date: jours(1 + ((i * 3) % 40)) })),
      essais_declares: serie(prof.apprentissage.essais, i => ({ resultat: i % 4 === 3 ? 'partiel' : 'réussi', date: jours(2 + ((i * 5) % 50)) })),
      cas_bon_reflexe: serie(prof.apprentissage.repondus, i => ({ reussi: i < prof.apprentissage.reussis })),
      votes_emis: serie(act.votes, i => ({ vote: i % 5 === 4 ? 'Testé, ça marche' : 'Utile', date: jours((i * 2) % 60) })),
      enregistrements: serie(act.enregistrements, i => ({ contenu: i % 3 ? 'création' : 'sujet', date: jours((i * 4) % 60) })),
      badges: prof.badges.map(([nom, date]) => ({ badge: nom, obtenu_le: date })),
      mouvements_reputation: prof.detail.flatMap(d => serie(d.n, () => ({ motif: d.motif, points: d.pts })))
    };
    const texte = JSON.stringify(donnees, null, 2);
    const taille = new Blob([texte]).size;
    return { donnees, texte, taille, nom: `vysora-${etat.pseudo}-${D.today}.json` };
  }
  const tailleTexte = octets => (octets < 1024 * 1024 ? `${fmt(Math.max(1, Math.round(octets / 1024)))} Ko` : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(octets / 1048576)} Mo`);

  function donneesHTML() {
    const e = E.get();
    const visibilite = `<section class="pa-groupe" aria-labelledby="pa-g-visibilite">${groupeTitre('visibilite', 'eye', 'Qui voit quoi')}
      <table class="pa-visibilite"><caption class="sr-only">${t('Qui voit vos informations')}</caption>
        <thead><tr><th scope="col">${t('Information')}</th><th scope="col">${icon('users', 'icon-sm')}${t('Tout le monde')}</th><th scope="col">${icon('lock', 'icon-sm')}${t('Vous seul')}</th></tr></thead>
        <tbody>${PA.visibilite.map(v => `<tr><th scope="row">${t(v.label)}</th><td>${v.public ? `${icon('check')}<span class="sr-only">Oui</span>` : '<span class="sr-only">Non</span>'}</td><td>${v.public ? '<span class="sr-only">Non</span>' : `${icon('check')}<span class="sr-only">Oui</span>`}</td></tr>`).join('')}</tbody>
      </table>
      <p class="pa-groupe-note">${t('Seuls les cookies strictement nécessaires au fonctionnement du site sont utilisés.')} <a href="confidentialite.html">${t('Politique de confidentialité')}</a></p>
    </section>`;
    const aAccepter = e.compte === 'conditions';
    const documents = `<section class="pa-groupe" aria-labelledby="pa-g-documents">${groupeTitre('documents', 'doc', 'Documents acceptés')}
      ${aAccepter ? `<div class="pa-accepter"><p>${t(`Les conditions générales et la charte communautaire ont changé le ${E.DATES.conditions}. Acceptez-les pour continuer à publier et à participer.`)}</p><button class="btn btn-primary btn-sm" type="button" data-acces-bouton="conditions">${t('Accepter les nouvelles versions')}</button></div>` : ''}
      <div class="pa-lignes">${DOCUMENTS.map(([cle, href]) => {
        const doc = A.documents[cle];
        const nouveau = aAccepter && doc.changement;
        return ligne({
          cle: `doc-${cle}`, niveau: 4, titre: t(doc.titre),
          valeur: `<p class="pa-valeur pa-valeur-ligne"><span>${t(`Version du ${doc.version}`)}</span>${nouveau ? statut('attention', 'alert', 'Nouvelle version à accepter') : statut('ok', 'check-circle', 'Acceptée')}</p>`,
          aide: nouveau ? t(`Ce qui change : ${doc.changement.charAt(0).toLowerCase()}${doc.changement.slice(1)}`) : '',
          action: `<a class="btn btn-quiet btn-sm" href="${href}">Lire<span class="sr-only"> ${t(doc.titre)}</span></a>`
        });
      }).join('')}</div>
    </section>`;
    return `${visibilite}${documents}${exportHTML()}`;
  }

  function exportHTML() {
    const x = construireExport();
    const d = x.donnees;
    const etape = settings.export;
    const demande = etat.exportDemande || { le: D.today, heure: PA.export.heure };
    const limite = plusJours(demande.le, PA.delais.export);
    const contenu = [
      ['Compte et préférences', null],
      ['Acceptations des documents légaux', d.documents_acceptes.length],
      ['Créations', d.creations.length],
      ['Sujets, réponses et commentaires', d.sujets_reponses_commentaires.length],
      ['Essais déclarés', d.essais_declares.length],
      ['Cas Bon réflexe', d.cas_bon_reflexe.length],
      ['Votes émis', d.votes_emis.length],
      ['Contenus enregistrés', d.enregistrements.length],
      ['Badges', d.badges.length],
      ['Mouvements de réputation', d.mouvements_reputation.length]
    ];
    if (ui.blob) { URL.revokeObjectURL(ui.blob); ui.blob = null; }
    if (etape === 'pret') ui.blob = URL.createObjectURL(new Blob([x.texte], { type: 'application/json' }));
    const arbre = `<div class="pa-fichier${etape === 'pret' ? ' is-pret' : ''}">
      <p class="pa-fichier-tete">${icon('fichier')}<span class="pa-fichier-nom">${t(x.nom)}</span><span class="pa-fichier-taille">${etape === 'pret' ? tailleTexte(x.taille) : 'JSON'}</span></p>
      <ul class="pa-arbre">${contenu.map(([label, n], i) => `<li style="--n:${i}"><span>${t(label)}</span>${n === null ? '' : `<b>${fmt(n)}</b>`}</li>`).join('')}</ul>
    </div>`;
    const etapes = [['Demande envoyée', `${dateLongue(demande.le)} à ${demande.heure}`], ['Préparation', etape === 'preparation' ? 'En cours' : 'Terminée'], etape === 'expire' ? ['Lien expiré', dateLongue(PA.export.expire)] : ['Prêt à télécharger', `Jusqu’au ${dateLongue(limite)}`]];
    const atteinte = { preparation: 1, pret: 2, expire: 2 }[etape] ?? -1;
    if (atteinte < 0) etapes.splice(0, 3, ['Votre demande', 'Un fichier à jour à chaque demande'], ['Préparation', 'Un e-mail vous prévient'], ['Téléchargement', `Lien valable ${PA.delais.export} jours`]);
    const frise = `<ol class="pa-etapes" data-pa-etape="${etape}">${etapes.map(([label, info], i) => `<li class="${i < atteinte ? 'is-fait' : i === atteinte ? 'is-courant' : ''}"${i === atteinte ? ' aria-current="step"' : ''}><span class="pa-etape-point" aria-hidden="true">${i < atteinte || (i === atteinte && etape === 'pret') ? icon('check', 'icon-xs') : ''}</span><b>${t(label)}</b><small>${t(info)}</small></li>`).join('')}</ol>`;
    let action;
    if (etape === 'preparation') {
      action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><div class="pa-progres" aria-hidden="true"><span></span></div><p><b>${t('Préparation de votre fichier…')}</b> ${t(`Nous vous écrivons à ${masquer(etat.email)} dès qu’il est prêt. Une seule demande peut être en cours à la fois.`)}</p></div>`;
    } else if (etape === 'pret') {
      action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><p><b>${t('Votre fichier est prêt.')}</b> ${t(`Le lien reste valable jusqu’au ${dateLongue(limite)}.`)}</p><div class="pa-export-actions"><a class="btn btn-primary" href="${ui.blob}" download="${esc(x.nom)}" data-pa-telecharger>${icon('download', 'icon-sm')}${t(`Télécharger (${tailleTexte(x.taille)})`)}</a><button class="btn btn-quiet btn-sm" type="button" data-pa-export-demander>${t('Demander un nouvel export')}</button></div></div>`;
    } else if (etape === 'expire') {
      action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><p><b>${t(`Le lien de téléchargement a expiré le ${dateLongue(PA.export.expire)}.`)}</b> ${t('Demandez un nouvel export pour obtenir un fichier à jour.')}</p><div class="pa-export-actions"><button class="btn btn-primary" type="button" data-pa-export-demander>${icon('download', 'icon-sm')}${t('Demander un nouvel export')}</button></div></div>`;
    } else {
      action = `<div class="pa-export-etat" tabindex="-1" data-pa-export-etat><div class="pa-export-actions"><button class="btn btn-primary" type="button" data-pa-export-demander>${icon('download', 'icon-sm')}${t('Demander l’export')}</button></div></div>`;
    }
    return `<section class="pa-groupe pa-export" aria-labelledby="pa-g-export" id="export">${groupeTitre('export', 'download', 'Exporter mes données')}
      <p class="pa-groupe-note">${t(`Un fichier JSON avec tout ce que Vysora conserve sur vous, préparé à votre demande. Le lien de téléchargement reste valable ${PA.delais.export} jours.`)}</p>
      <div class="pa-export-grille">${arbre}<div class="pa-export-cote">${frise}${action}</div></div>
    </section>`;
  }

  /* Rubrique Supprimer le compte ------------------------------------------------------------------------------- */

  function friseSuppression(fin, creations = null) {
    const derniere = creations === 'supprimer'
      ? `Vos données personnelles et vos créations sont supprimées. Vos autres contributions sont signées ${ANONYME}.`
      : creations === 'garder'
        ? `Vos données personnelles sont effacées. Vos contributions restent, signées ${ANONYME}.`
        : `Vos données personnelles sont effacées. Vos contributions restent, signées par un pseudo anonyme comme ${ANONYME}, sauf si vous demandez aussi la suppression de vos créations.`;
    return `<ol class="pa-frise">
      <li class="is-maintenant"><span class="pa-frise-point" aria-hidden="true"></span><b>${t('Aujourd’hui')}</b><p>${t('Vous êtes déconnecté et votre profil n’est plus accessible aux autres membres.')}</p></li>
      <li><span class="pa-frise-point" aria-hidden="true"></span><b>${t(`Jusqu’au ${dateLongue(plusJours(fin, -1))}`)}</b><p>${t('Il suffit de vous reconnecter pour annuler la demande : rien n’est perdu.')}</p></li>
      <li class="is-fin"><span class="pa-frise-point" aria-hidden="true"></span><b>${t(`Le ${dateLongue(fin)}`)}</b><p>${t(derniere)}</p></li>
    </ol>`;
  }
  function suppressionHTML() {
    const fin = plusJours(D.today, PA.delais.suppression);
    const avant = ligne({
      cle: 'copie', titre: 'Copie de vos données',
      valeur: `<p class="pa-valeur">${t('Gardez vos créations et votre activité avant de partir.')}</p>`,
      action: `<a class="btn btn-quiet btn-sm" href="#export" data-pa-vers-export>${t('Exporter mes données')}</a>`
    });
    const envoye = ui.lienSuppression && !aMotDePasse();
    const suppr = ligne({
      cle: 'suppression', titre: 'Supprimer mon compte',
      valeur: envoye
        ? `<p class="pa-valeur pa-valeur-ligne">${statut('attention', 'mail', 'Confirmation en attente')}</p>`
        : `<p class="pa-valeur">${t(aMotDePasse() ? 'Vous confirmez avec votre mot de passe.' : 'Vous confirmez avec un lien envoyé par e-mail.')}</p>`,
      aide: envoye ? t(`Ouvrez le lien envoyé à ${masquer(etat.email)} pour confirmer la suppression. Il reste valable 24 heures.`) : '',
      action: envoye ? '<button class="btn btn-quiet btn-sm" type="button" data-pa-suppr-renvoyer>Renvoyer le lien</button>' : modifier('suppression', 'Supprimer mon compte', '', 'btn-danger-contour')
    });
    return `<p class="pa-intro">${t(`Après votre demande, votre compte reste récupérable pendant ${PA.delais.suppression} jours.`)}</p>${friseSuppression(fin)}<div class="pa-lignes">${avant}${suppr}</div>`;
  }

  /* Formulaires ------------------------------------------------------------------------------------------------ */

  const champMdp = (id, label, autocomplete, { jauge = false, oubli = false, voir = 'le mot de passe' } = {}) => `<div class="champ">
      <label for="${id}">${t(label)}</label>
      <div class="saisie a-oeil" data-mdp>
        <input id="${id}" name="${autocomplete}" type="password" autocomplete="${autocomplete}" required aria-describedby="${[jauge && `${id}-aide`, `${id}-maj`, `${id}-erreur`].filter(Boolean).join(' ')}">
        <button class="saisie-oeil" type="button" aria-controls="${id}" aria-pressed="false" aria-label="${esc(`Afficher ${voir}`)}" data-voir></button>
      </div>
      ${jauge ? `<div class="force-ligne"><div class="force" data-force aria-hidden="true"><span></span><span></span><span></span><span></span></div><p class="message force-texte" id="${id}-aide" data-aide-mdp>${t('12 caractères minimum')}</p></div><p class="sr-only" aria-live="polite" data-annonce></p>` : ''}
      <p class="message is-alerte" id="${id}-maj" hidden>${icon('info')}Majuscules verrouillées</p>
      <p class="message is-erreur" id="${id}-erreur" hidden></p>
      ${oubli ? `<button class="lien pa-oubli" type="button" data-pa-oubli>${t('Mot de passe oublié ?')}</button>` : ''}
    </div>`;
  const identifiant = () => `<input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(etat.email)}" tabindex="-1" aria-hidden="true" readonly>`;
  const pied = (cle, envoyer, classe = 'btn-primary') => `<div class="pa-alerte" role="alert" data-pa-alerte hidden></div>
    <div class="pa-garde" role="alertdialog" aria-labelledby="pa-garde-${cle}" data-pa-garde hidden></div>
    <div class="pa-form-pied"><button class="btn btn-quiet" type="button" data-pa-annuler>Annuler</button><button class="btn ${classe}" type="submit">${t(envoyer)}</button></div>`;
  const motDePasseActuel = valeur => (!valeur ? 'Saisissez votre mot de passe actuel.' : [...valeur].length < 12 ? 'Ce mot de passe est incorrect.' : '');
  function messageNouveau(valeur) {
    const r = Au.evaluer(valeur, { pseudo: etat.pseudo, email: etat.email });
    if (r.etat === 'vide') return 'Choisissez un nouveau mot de passe.';
    if (r.etat === 'court') return typo(`Utilisez au moins 12 caractères : encore ${V.plural(r.reste, 'caractère', 'caractères')}.`);
    return r.message || '';
  }

  const pseudoPris = v => A.pseudosPris.includes(v.toLowerCase()) && v.toLowerCase() !== etat.pseudo.toLowerCase();
  function propositionsPseudo(base) {
    const racine = base.toLowerCase().replace(PSEUDO_INTERDIT, '').slice(0, 24) || 'createur';
    return [`${racine}-ia`, racine.includes('-') ? racine.replace(/-/g, '_') : `${racine}_cree`, `${racine}-26`].filter(s => !pseudoPris(s)).slice(0, 3);
  }
  function surveillerPseudo(form) {
    const input = form.elements.pseudo;
    const icone = $('[data-pa-pseudo-etat]', form);
    const aide = $('#pa-pseudo-aide', form);
    const zone = $('[data-pa-propositions]', form);
    const annonce = $('[data-pa-pseudo-annonce]', form);
    const adresse = $('[data-pa-pseudo-url]', form);
    const AIDE = aide.textContent;
    let minuterie;
    const afficher = e => { icone.dataset.etat = e; icone.innerHTML = e === 'libre' ? icon('check') : ['pris', 'invalide'].includes(e) ? icon('alert') : ''; };
    function verifier() {
      clearTimeout(minuterie);
      const v = input.value;
      adresse.textContent = v || etat.pseudo;
      zone.hidden = true;
      zone.innerHTML = '';
      aide.className = 'message';
      aide.textContent = AIDE;
      aide.hidden = false;
      if (!v || v === etat.pseudo || [...v].length < 3) { afficher(''); Au.erreur(input); return; }
      if (PSEUDO_INTERDIT.test(v)) { afficher('invalide'); aide.hidden = true; Au.erreur(input, 'Utilisez uniquement des lettres, des chiffres et des tirets.'); return; }
      Au.erreur(input);
      afficher('verification');
      minuterie = setTimeout(() => {
        if (pseudoPris(v)) {
          afficher('pris');
          aide.hidden = true;
          Au.erreur(input, 'Ce pseudo est déjà pris.');
          const liste = propositionsPseudo(v);
          zone.hidden = !liste.length;
          zone.innerHTML = liste.length ? `<span>Disponibles :</span>${liste.map(s => `<button class="proposition" type="button" data-pa-proposition="${esc(s)}">${t(s)}</button>`).join('')}` : '';
          annonce.textContent = 'Ce pseudo est déjà pris. Des pseudos disponibles sont proposés.';
        } else {
          afficher('libre');
          aide.className = 'message is-ok';
          aide.innerHTML = `${icon('check')}<span>Disponible</span>`;
          annonce.textContent = `${v} est disponible.`;
        }
      }, 450);
    }
    input.addEventListener('input', () => {
      const position = input.selectionStart;
      const propre = input.value.normalize('NFC').replace(/\s/g, '-');
      if (propre !== input.value) { input.value = propre; input.setSelectionRange(position, position); }
      verifier();
    });
    zone.addEventListener('click', event => {
      const bouton = event.target.closest('[data-pa-proposition]');
      if (!bouton) return;
      input.value = bouton.dataset.paProposition;
      ui.sale = true;
      verifier();
      input.focus();
    });
  }

  const FORMS = {
    pseudo: {
      rubrique: 'compte', titre: 'Modifier le pseudo',
      html: () => `<form class="pa-form" data-pa-form="pseudo" novalidate>
        <div class="champ">
          <label for="pa-pseudo">${t('Nouveau pseudo')}</label>
          <div class="saisie a-etat"><input id="pa-pseudo" name="pseudo" value="${esc(etat.pseudo)}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="30" required aria-describedby="pa-pseudo-aide pa-pseudo-erreur"><span class="saisie-etat" data-pa-pseudo-etat aria-hidden="true"></span></div>
          <p class="message" id="pa-pseudo-aide">${t('3 à 30 caractères : lettres, chiffres, tirets.')}</p>
          <p class="message is-erreur" id="pa-pseudo-erreur" hidden></p>
          <div class="propositions" data-pa-propositions hidden></div>
          <p class="sr-only" aria-live="polite" data-pa-pseudo-annonce></p>
        </div>
        <p class="pa-note">${icon('link', 'icon-sm')}<span>${t('Votre profil deviendra')} <b>/membres/<span data-pa-pseudo-url>${t(etat.pseudo)}</span></b>. ${t('Les liens qui utilisent votre pseudo actuel ne fonctionneront plus.')}</span></p>
        ${pied('pseudo', 'Enregistrer le pseudo')}
      </form>`,
      monter: form => { surveillerPseudo(form); const input = form.elements.pseudo; input.select(); },
      async envoyer(form, bouton) {
        const input = form.elements.pseudo;
        const v = input.value.trim();
        const message = !v ? 'Saisissez un pseudo.'
          : PSEUDO_INTERDIT.test(v) ? 'Utilisez uniquement des lettres, des chiffres et des tirets.'
          : [...v].length < 3 ? 'Utilisez au moins 3 caractères.'
          : v === etat.pseudo ? 'C’est déjà votre pseudo. Saisissez-en un autre.'
          : pseudoPris(v) ? 'Ce pseudo est déjà pris.' : '';
        Au.erreur(input, message);
        if (message) { Au.premierInvalide(form); return; }
        if (!(await enregistrer(form, bouton))) return;
        etat.pseudo = v;
        ecrire();
        terminer('pseudo', `Pseudo modifié : ${v}.`);
      }
    },
    email: {
      rubrique: 'compte', titre: 'Modifier l’adresse e-mail',
      html: () => `<form class="pa-form" data-pa-form="email" novalidate>
        <div class="champ">
          <label for="pa-email">${t('Nouvelle adresse e-mail')}</label>
          <div class="saisie"><input id="pa-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required aria-describedby="pa-email-erreur pa-email-suggestion"></div>
          <p class="message is-erreur" id="pa-email-erreur" hidden></p>
          <p class="message" id="pa-email-suggestion" hidden></p>
        </div>
        ${aMotDePasse() ? `${identifiant()}${champMdp('pa-email-mdp', 'Mot de passe actuel', 'current-password', { oubli: true, voir: 'le mot de passe actuel' })}` : ''}
        <p class="pa-note">${icon('info', 'icon-sm')}<span>${t('Un lien de confirmation part vers la nouvelle adresse. Votre adresse actuelle reste active jusqu’à la confirmation, et reçoit une alerte du changement.')}</span></p>
        ${pied('email', 'Envoyer le lien de confirmation')}
      </form>`,
      monter: form => { Au.surveillerEmail(form.elements.email); },
      async envoyer(form, bouton) {
        const input = form.elements.email;
        const mdp = form.elements['current-password'];
        let message = Au.messageEmail(input.value);
        if (!message && input.value.trim().toLowerCase() === etat.email.toLowerCase()) message = 'C’est déjà l’adresse de votre compte.';
        Au.erreur(input, message);
        if (mdp) Au.erreur(mdp, motDePasseActuel(mdp.value));
        if (Au.premierInvalide(form)) return;
        if (!(await enregistrer(form, bouton, 'Envoi…'))) return;
        etat.nouvelEmail = input.value.trim();
        etat.emailEnvoi = { le: D.today, heure: heureActuelle() };
        ecrire();
        regler('changement', 'attente');
        terminer('email', `Lien de confirmation envoyé à ${etat.nouvelEmail}.`, 'mail');
      }
    },
    mdp: {
      rubrique: 'securite', titre: 'Modifier le mot de passe',
      html: () => `<form class="pa-form" data-pa-form="mdp" novalidate>
        ${identifiant()}
        ${champMdp('pa-mdp-actuel', 'Mot de passe actuel', 'current-password', { oubli: true, voir: 'le mot de passe actuel' })}
        ${champMdp('pa-mdp-nouveau', 'Nouveau mot de passe', 'new-password', { jauge: true, voir: 'le nouveau mot de passe' })}
        ${propositions() && etat.appareils.length > 1 ? `<label class="pa-case"><input type="checkbox" name="deconnecter" checked><span>${t('Déconnecter mes autres appareils')}</span></label>` : ''}
        ${pied('mdp', 'Enregistrer le mot de passe')}
      </form>`,
      monter: form => { Au.jauge(form.elements['new-password'], () => ({ pseudo: etat.pseudo, email: etat.email })); },
      async envoyer(form, bouton) {
        const actuel = form.elements['current-password'];
        const nouveau = form.elements['new-password'];
        let message = messageNouveau(nouveau.value);
        if (!message && nouveau.value === actuel.value) message = 'Choisissez un mot de passe différent de l’actuel.';
        Au.erreur(actuel, motDePasseActuel(actuel.value));
        Au.erreur(nouveau, message);
        if (Au.premierInvalide(form)) return;
        if (!(await enregistrer(form, bouton))) return;
        const deconnecter = form.elements.deconnecter?.checked;
        etat.mdpLe = D.today;
        if (deconnecter) etat.appareils = ['ici'];
        ecrire();
        terminer('mdp', deconnecter ? 'Mot de passe modifié. Vos autres appareils sont déconnectés.' : 'Mot de passe modifié.', 'lock');
      }
    },
    definir: {
      rubrique: 'securite', titre: 'Définir un mot de passe',
      html: () => `<form class="pa-form" data-pa-form="definir" novalidate>
        ${identifiant()}
        ${champMdp('pa-mdp-defini', 'Mot de passe', 'new-password', { jauge: true })}
        <p class="pa-note">${icon('info', 'icon-sm')}<span>${t('Vous pourrez vous connecter avec')} <b>${t(etat.email)}</b> ${t('et ce mot de passe, en plus de Google.')}</span></p>
        ${pied('definir', 'Définir le mot de passe')}
      </form>`,
      monter: form => { Au.jauge(form.elements['new-password'], () => ({ pseudo: etat.pseudo, email: etat.email })); },
      async envoyer(form, bouton) {
        const nouveau = form.elements['new-password'];
        Au.erreur(nouveau, messageNouveau(nouveau.value));
        if (Au.premierInvalide(form)) return;
        if (!(await enregistrer(form, bouton))) return;
        etat.mdpLe = D.today;
        ecrire();
        ui.confirmer = null;
        regler('connexion', 'mdp-google');
        terminer('mdp', 'Mot de passe défini. Vous pouvez aussi vous connecter avec votre adresse e-mail.', 'lock');
      }
    },
    suppression: {
      rubrique: 'suppression', titre: 'Supprimer mon compte',
      html: () => {
        const n = nbCreations();
        const choix = n ? `<fieldset class="pa-options">
            <legend>${t(n > 1 ? `Vos ${n} créations publiées` : 'Votre création publiée')}</legend>
            <label class="pa-option"><input type="radio" name="creations" value="garder" checked><span><b>${t(n > 1 ? 'Les conserver sous un pseudo anonyme' : 'La conserver sous un pseudo anonyme')}</b><small>${t(n > 1 ? `Elles restent consultables, signées ${ANONYME}, avec leurs essais et leurs variantes.` : `Elle reste consultable, signée ${ANONYME}, avec ses essais et ses variantes.`)}</small></span></label>
            <label class="pa-option"><input type="radio" name="creations" value="supprimer"><span><b>${t(n > 1 ? 'Les supprimer aussi' : 'La supprimer aussi')}</b><small>${t(n > 1 ? 'Leurs commentaires et leurs essais disparaissent ; les variantes indiquent « Création source supprimée ».' : 'Ses commentaires et ses essais disparaissent ; ses variantes indiquent « Création source supprimée ».')}</small></span></label>
          </fieldset>`
          : `<p class="pa-note">${icon('info', 'icon-sm')}<span>${t(`Vous n’avez publié aucune création. Vos réponses, commentaires et essais seront signés ${ANONYME}.`)}</span></p>`;
        const confirmation = aMotDePasse()
          ? `${identifiant()}${champMdp('pa-suppr-mdp', 'Confirmez avec votre mot de passe', 'current-password', { oubli: true })}`
          : `<p class="pa-note">${icon('mail', 'icon-sm')}<span>${t('Un lien de confirmation part vers')} <b>${t(masquer(etat.email))}</b>. ${t('La demande est prise en compte à son ouverture.')}</span></p>`;
        return `<form class="pa-form is-danger" data-pa-form="suppression" novalidate>
          ${choix}${confirmation}
          ${pied('suppression', aMotDePasse() ? 'Supprimer mon compte' : 'Envoyer le lien de confirmation', 'btn-danger')}
        </form>`;
      },
      monter: () => {},
      async envoyer(form, bouton) {
        const mdp = form.elements['current-password'];
        if (mdp) {
          Au.erreur(mdp, !mdp.value ? 'Saisissez votre mot de passe pour confirmer.' : motDePasseActuel(mdp.value));
          if (Au.premierInvalide(form)) return;
        }
        if (!(await enregistrer(form, bouton, mdp ? 'Suppression…' : 'Envoi…'))) return;
        if (!mdp) {
          ui.lienSuppression = true;
          terminer('suppression', `Lien de confirmation envoyé à ${masquer(etat.email)}.`, 'mail');
          return;
        }
        const creations = form.elements.creations?.value || 'garder';
        V.store.set(CLE_DEPART, { le: D.today, creations, email: etat.email });
        ui.sale = false;
        fermerEdition({ focus: false, rendre: false });
        E.set({ session: 'visiteur' });
        window.scrollTo({ top: 0, behavior: 'auto' });
        $('[data-pa-depart-titre]')?.focus();
      }
    }
  };

  /* Enregistrement simulé : le réglage « Enregistrement » des Tweaks provoque une coupure du réseau. */
  function occupe(bouton, on, texte = '') {
    if (on) {
      bouton.dataset.paLibelle = bouton.innerHTML;
      bouton.style.minWidth = `${bouton.offsetWidth}px`;
      bouton.innerHTML = `<span class="pa-roue" aria-hidden="true"></span>${t(texte)}`;
      bouton.disabled = true;
      bouton.closest('form')?.setAttribute('aria-busy', 'true');
    } else if (bouton.dataset.paLibelle !== undefined) {
      bouton.innerHTML = bouton.dataset.paLibelle;
      delete bouton.dataset.paLibelle;
      bouton.style.minWidth = '';
      bouton.disabled = false;
      bouton.closest('form')?.removeAttribute('aria-busy');
    }
  }
  async function enregistrer(form, bouton, texte = 'Enregistrement…') {
    const alerte = $('[data-pa-alerte]', form);
    Au.alerte(alerte, '');
    occupe(bouton, true, texte);
    await attendre(V.motion.level() === 'none' ? 300 : 800);
    if (!form.isConnected) return false;
    if (settings.enregistrement === 'echec') {
      occupe(bouton, false);
      Au.alerte(alerte, typo('<b>Enregistrement impossible.</b> La connexion a été interrompue. Vos saisies sont conservées : réessayez dans un instant.'));
      bouton.focus();
      return false;
    }
    return true;
  }

  /* Ouverture et fermeture des formulaires ----------------------------------------------------------------- */

  const dialogue = $('[data-pa-dialogue]');
  const formOuvert = () => (ui.edition ? $(`[data-pa-form="${ui.edition}"]`) : null);

  function ouvrirEdition(cle) {
    if (!FORMS[cle] || !membre()) return;
    if (ui.edition === cle) { formOuvert()?.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea')?.focus(); return; }
    if (ui.edition && ui.sale) { demanderAbandon(() => ouvrirEdition(cle)); return; }
    fermerEdition({ focus: false });
    ui.edition = cle;
    ui.sale = false;
    ui.confirmer = null;
    const f = FORMS[cle];
    if (settings.edition === 'fenetre') {
      dialogue.innerHTML = `<div class="pa-dialogue-tete"><h2 id="pa-dialogue-titre">${t(f.titre)}</h2><button class="icon-btn" type="button" data-pa-fermer aria-label="Fermer">${icon('close')}</button></div><div class="pa-dialogue-corps">${f.html()}</div>`;
      dialogue.classList.toggle('is-danger', cle === 'suppression');
      monter(cle);
      dialogue.showModal();
      premierChamp(formOuvert())?.focus();
      rendreRubrique(f.rubrique);
      return;
    }
    rendreRubrique(f.rubrique);
    const slot = $(`[data-pa-slot="${cle}"]`);
    if (!slot) return;
    slot.innerHTML = f.html();
    monter(cle);
    const form = formOuvert();
    form.scrollIntoView({ block: 'nearest', behavior: doux() });
    premierChamp(form)?.focus({ preventScroll: true });
  }
  const premierChamp = form => form && $$('input, select, textarea', form).find(el => el.type !== 'hidden' && el.tabIndex !== -1 && !el.disabled && el.offsetParent !== null);
  function monter(cle) {
    const form = formOuvert();
    if (!form) return;
    Au.motDePasse(form);
    FORMS[cle].monter(form);
  }
  function fermerEdition({ focus = true, rendre = true } = {}) {
    const cle = ui.edition;
    if (!cle) return;
    ui.edition = null;
    ui.sale = false;
    ui.garde = null;
    if (dialogue.open) dialogue.close();
    dialogue.innerHTML = '';
    if (rendre) rendreRubrique(FORMS[cle].rubrique);
    if (focus) $(`[data-pa-modifier="${cle}"]`)?.focus();
  }
  function demanderAbandon(suite) {
    const form = formOuvert();
    if (!form) { suite(); return; }
    ui.garde = suite;
    const zone = $('[data-pa-garde]', form);
    zone.innerHTML = `<p id="${zone.getAttribute('aria-labelledby')}">${t('Abandonner la modification en cours ?')}</p><div><button class="btn btn-quiet btn-sm" type="button" data-pa-garde-non>${t('Continuer la modification')}</button><button class="btn btn-secondary btn-sm" type="button" data-pa-garde-oui>Abandonner</button></div>`;
    zone.hidden = false;
    zone.scrollIntoView({ block: 'nearest', behavior: doux() });
    $('[data-pa-garde-non]', zone).focus();
  }
  /* Après un enregistrement réussi : la ligne se referme, puis montre brièvement « Enregistré ». */
  function terminer(cle, message, ic = 'check') {
    ui.edition = null;
    ui.sale = false;
    if (dialogue.open) dialogue.close();
    dialogue.innerHTML = '';
    eclairer(cle);
    V.toast(message, ic);
  }
  function eclairer(cle) {
    clearTimeout(ui.minuteurFlash);
    ui.flash = cle;
    render();
    const ligneEl = $(`[data-pa-ligne="${cle}"]`);
    if (ligneEl) ($('[data-pa-modifier], .pa-ligne-action button, .pa-ligne-action a', ligneEl) || $('button, a, select', ligneEl))?.focus({ preventScroll: true });
    ui.minuteurFlash = setTimeout(() => {
      ui.flash = null;
      $$('[data-pa-fait]').forEach(el => el.remove());
      $$('.pa-ligne.is-flash').forEach(el => el.classList.remove('is-flash'));
    }, 2600);
  }

  /* Choix enregistrés immédiatement (langue, fuseau, e-mails) : la valeur change tout de suite,
     puis revient en arrière si l'enregistrement échoue. */
  async function enregistrerChoix(appliquer, annuler, message, ic, cle, cible) {
    appliquer();
    rendreRubrique(rubriqueDe(cle));
    focaliser(cible);
    if (settings.enregistrement === 'echec') {
      await attendre(700);
      annuler();
      rendreRubrique(rubriqueDe(cle));
      focaliser(cible);
      V.toast('Modification non enregistrée. Vérifiez votre connexion, puis réessayez.', 'wifi-off');
      return;
    }
    clearTimeout(ui.minuteurFlash);
    ui.flash = cle;
    rendreRubrique(rubriqueDe(cle));
    focaliser(cible);
    ui.minuteurFlash = setTimeout(() => { ui.flash = null; $$('[data-pa-fait]').forEach(el => el.remove()); $$('.pa-ligne.is-flash').forEach(el => el.classList.remove('is-flash')); }, 2600);
    V.toast(message, ic);
  }
  const rubriqueDe = cle => ({ pseudo: 'compte', email: 'compte', langue: 'compte', fuseau: 'compte', mdp: 'securite', definir: 'securite', google: 'securite', github: 'securite', emails: 'notifications', signalements: 'notifications', suppression: 'suppression' }[cle] || (cle.startsWith('evt:') || cle === 'frequence' ? 'notifications' : cle.startsWith('doc-') ? 'donnees' : 'compte'));
  const focaliser = selecteur => { if (selecteur) $(selecteur)?.focus({ preventScroll: true }); };

  /* Réglage d'état de la page depuis l'interface : le panneau Tweaks suit, sans tout refermer. */
  function regler(nom, valeur) {
    ui.interne = true;
    V.regler(nom, valeur);
    ui.interne = false;
  }

  /* Rendu --------------------------------------------------------------------------------------------------- */

  const CONTENUS = { compte: compteHTML, securite: securiteHTML, notifications: notificationsHTML, donnees: donneesHTML, suppression: suppressionHTML };
  function rubriqueHTML(r) {
    return `<section class="pa-rubrique${r.id === 'suppression' ? ' is-danger' : ''}" id="${r.id}" aria-labelledby="pa-h-${r.id}" data-pa-rubrique="${r.id}"${settings.navigation === 'onglets' && r.id !== ui.rubrique ? ' hidden' : ''}>
      <h2 class="pa-rubrique-titre" id="pa-h-${r.id}" tabindex="-1">${t(r.label)}</h2>
      <div class="pa-rubrique-corps" data-pa-corps-rubrique>${CONTENUS[r.id]()}</div>
    </section>`;
  }
  /* Le formulaire ouvert dans une ligne est déplacé tel quel d'un rendu à l'autre : saisies et focus gardés. */
  function garderFormulaire(portee) {
    if (!ui.edition || settings.edition === 'fenetre') return null;
    const form = $(`[data-pa-form="${ui.edition}"]`, portee);
    return form ? { form, actif: form.contains(document.activeElement) ? document.activeElement : null } : null;
  }
  function replacerFormulaire(garde) {
    if (!garde) return;
    const slot = $(`[data-pa-slot="${ui.edition}"]`);
    if (!slot) return;
    slot.replaceChildren(garde.form);
    garde.actif?.focus({ preventScroll: true });
  }
  function rendreRubrique(id) {
    const section = document.getElementById(id);
    if (!section || !membre()) return;
    const garde = garderFormulaire(section);
    $('[data-pa-corps-rubrique]', section).innerHTML = CONTENUS[id]();
    replacerFormulaire(garde);
    rendreRail();
  }
  function render() {
    rendreTete();
    const acces = $('[data-pa-acces]');
    const corps = $('[data-pa-corps]');
    if (!membre()) {
      if (dialogue.open) dialogue.close();
      ui.edition = null;
      ui.sale = false;
      corps.hidden = true;
      acces.hidden = false;
      acces.innerHTML = accesHTML();
      return;
    }
    acces.hidden = true;
    acces.innerHTML = '';
    corps.hidden = false;
    const garde = garderFormulaire($('[data-pa-rubriques]'));
    $('[data-pa-rubriques]').innerHTML = RUBRIQUES.map(rubriqueHTML).join('');
    replacerFormulaire(garde);
    rendreRail();
    $$('.pa-rubrique').forEach((el, i) => el.style.setProperty('--i', String(i + 1)));
    $$('.pa-rail-liste > li').forEach((el, i) => el.style.setProperty('--i', String(i)));
  }

  /* Visiteur et départ ---------------------------------------------------------------------------------------- */

  function illustrationHTML() {
    const lignes = [['', 'is-long'], ['is-switch', ''], ['', 'is-court'], ['is-bouton', '']];
    return `<div class="pa-illu" aria-hidden="true">
      <div class="pa-illu-rail">${RUBRIQUES.map((r, i) => `<span class="${i === 0 ? 'is-actif' : ''}" style="--i:${i}">${icon(r.icone)}<i></i></span>`).join('')}</div>
      <div class="pa-illu-corps"><i class="pa-illu-titre"></i>${lignes.map(([fin, valeur], i) => `<div class="pa-illu-ligne" style="--i:${i + 1}"><i></i><i class="${valeur}"></i><span class="${fin}"></span></div>`).join('')}</div>
    </div>`;
  }
  function accesHTML() {
    const depart = V.store.get(CLE_DEPART, null);
    if (depart && depart.le) {
      const fin = plusJours(depart.le, PA.delais.suppression);
      return `<div class="pa-depart">
        <span class="pa-depart-icone" aria-hidden="true">${icon('clock')}</span>
        <h2 tabindex="-1" data-pa-depart-titre>${t(`Votre compte sera supprimé le ${dateLongue(fin)}`)}</h2>
        <p class="pa-depart-texte">${t(`Un e-mail de confirmation a été envoyé à ${masquer(depart.email || PA.email)}.`)}</p>
        ${friseSuppression(fin, depart.creations)}
        <p class="pa-depart-retour">${t(`Vous changez d’avis ? Reconnectez-vous avant le ${dateLongue(fin)} : votre compte sera conservé tel quel.`)}</p>
        <div class="pa-depart-actions"><a class="btn btn-primary" href="connexion.html?retour=parametres.html">${t('Se reconnecter')}</a><a class="btn btn-secondary" href="index.html">${t('Retour à l’accueil')}</a></div>
      </div>`;
    }
    return `<div class="pa-acces-in"><div>${V.accesBloc('parametres', 'gérer vos paramètres')}</div>${illustrationHTML()}</div>`;
  }

  /* Navigation entre rubriques ----------------------------------------------------------------------------------- */

  function allerA(id, { cible = null } = {}) {
    if (!RUBRIQUES.some(r => r.id === id)) return;
    ui.rubrique = id;
    const section = document.getElementById(id);
    if (settings.navigation === 'onglets') {
      history.replaceState(null, '', `${location.pathname}?rubrique=${id}`);
      $$('[data-pa-rubrique]').forEach(s => { s.hidden = s.dataset.paRubrique !== id; });
      section.classList.remove('is-montre');
      void section.offsetWidth;
      section.classList.add('is-montre');
      majRail();
      const corps = $('[data-pa-corps]');
      if (corps.getBoundingClientRect().top < enTete()) window.scrollTo({ top: corps.getBoundingClientRect().top + window.scrollY - (enTete() || 72) - 16, behavior: doux() });
    } else {
      history.replaceState(null, '', `${location.pathname}#${id}`);
      majRail();
      const el = cible ? document.getElementById(cible) || section : section;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - decalageHaut(), behavior: doux() });
    }
    const titre = cible ? $(`#pa-g-${cible}`) : $(`#pa-h-${id}`);
    titre?.focus({ preventScroll: true });
  }
  let defile = false;
  function suivreDefilement() {
    defile = false;
    if (settings.navigation === 'onglets' || !membre()) return;
    const ligneHaut = decalageHaut() + 120;
    let courant = RUBRIQUES[0].id;
    RUBRIQUES.forEach(r => { const el = document.getElementById(r.id); if (el && el.getBoundingClientRect().top <= ligneHaut) courant = r.id; });
    const derniere = document.getElementById(RUBRIQUES.at(-1).id);
    if (derniere && derniere.getBoundingClientRect().bottom < window.innerHeight - 40) courant = RUBRIQUES.at(-1).id;
    if (courant !== ui.rubrique) { ui.rubrique = courant; majRail(); }
  }
  window.addEventListener('scroll', () => { if (!defile) { defile = true; requestAnimationFrame(suivreDefilement); } }, { passive: true });
  window.addEventListener('resize', () => majRail(false));

  /* Actions --------------------------------------------------------------------------------------------------------- */

  async function lier(s, bouton) {
    occupe(bouton, true, `Connexion à ${SERVICES[s]}…`);
    await attendre(V.motion.level() === 'none' ? 400 : 1100);
    if (!bouton.isConnected) return;
    if (settings.enregistrement === 'echec') {
      occupe(bouton, false);
      bouton.focus();
      V.toast(`Liaison avec ${SERVICES[s]} impossible. Vérifiez votre connexion, puis réessayez.`, 'wifi-off');
      return;
    }
    if (s === 'google') { etat.liaisonGoogle = D.today; ecrire(); regler('connexion', 'mdp-google'); } else { etat.github = D.today; ecrire(); }
    eclairer(s);
    $(`[data-pa-delier="${s}"]`)?.focus({ preventScroll: true });
    V.toast(`Compte ${SERVICES[s]} lié : vous pouvez vous connecter avec ${SERVICES[s]}.`, 'link');
  }
  function delier(s) {
    ui.confirmer = null;
    if (s === 'google') regler('connexion', 'mdp'); else { etat.github = null; ecrire(); }
    rendreRubrique('securite');
    $(`[data-pa-lier="${s}"]`)?.focus({ preventScroll: true });
    V.toast(`Compte ${SERVICES[s]} délié.`, 'link');
  }
  function sortir(ids) {
    const lignes = ids.map(id => $(`[data-pa-appareil="${id}"]`)).filter(Boolean);
    const finir = () => {
      etat.appareils = etat.appareils.filter(id => !ids.includes(id));
      ecrire();
      rendreRubrique('securite');
      ($('[data-pa-sortir]') || $('#pa-g-appareils'))?.focus({ preventScroll: true });
      const noms = PA.appareils.filter(a => ids.includes(a.id));
      V.toast(noms.length > 1 ? `${noms.length} appareils déconnectés.` : `${noms[0].nom} : déconnecté.`, 'logout');
    };
    if (!V.motion.full() || !lignes.length) { finir(); return; }
    const anims = lignes.map(li => li.animate([{ opacity: 1, height: `${li.offsetHeight}px` }, { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px' }], { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }));
    anims[0].finished.then(finir);
  }
  function demanderExport() {
    if (settings.export === 'preparation') return;
    etat.exportDemande = { le: D.today, heure: heureActuelle() };
    ecrire();
    regler('export', 'preparation');
    rendreRubrique('donnees');
    $('[data-pa-export-etat]')?.focus({ preventScroll: true });
    V.toast('Demande envoyée. Nous vous prévenons par e-mail dès que le fichier est prêt.', 'mail');
    clearTimeout(ui.minuteurExport);
    ui.minuteurExport = setTimeout(() => {
      if (settings.export !== 'preparation' || !membre()) return;
      const dedans = $('[data-pa-export-etat]')?.contains(document.activeElement);
      regler('export', 'pret');
      rendreRubrique('donnees');
      if (dedans) $('[data-pa-telecharger]')?.focus({ preventScroll: true });
      V.toast('Vos données sont prêtes à télécharger.', 'download');
    }, 5200);
  }

  document.addEventListener('click', event => {
    const el = event.target.closest('[data-pa-modifier], [data-pa-annuler], [data-pa-aller], [data-pa-switch], [data-pa-lier], [data-pa-delier], [data-pa-delier-oui], [data-pa-delier-non], [data-pa-sortir], [data-pa-sortir-tous], [data-pa-export-demander], [data-pa-telecharger], [data-pa-email-renvoyer], [data-pa-email-annuler], [data-pa-oubli], [data-pa-garde-oui], [data-pa-garde-non], [data-pa-vers-export], [data-pa-fuseau-appareil], [data-pa-suppr-renvoyer], [data-pa-fermer]');
    if (!el) return;
    const d = el.dataset;
    if (d.paModifier !== undefined) { ouvrirEdition(d.paModifier); return; }
    if (d.paAnnuler !== undefined) { fermerEdition(); return; }
    if (d.paFermer !== undefined) { if (ui.sale) demanderAbandon(() => fermerEdition()); else fermerEdition(); return; }
    if (d.paAller !== undefined) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      allerA(d.paAller);
      return;
    }
    if (d.paVersExport !== undefined) { event.preventDefault(); allerA('donnees', { cible: 'export' }); return; }
    if (d.paGardeNon !== undefined) {
      const zone = el.closest('[data-pa-garde]');
      zone.hidden = true;
      ui.garde = null;
      premierChamp(formOuvert())?.focus();
      return;
    }
    if (d.paGardeOui !== undefined) { const suite = ui.garde; ui.sale = false; ui.garde = null; if (suite) suite(); else fermerEdition(); return; }
    if (d.paSwitch !== undefined) { basculer(el); return; }
    if (d.paLier !== undefined) { lier(d.paLier, el); return; }
    if (d.paDelier !== undefined) {
      ui.confirmer = ui.confirmer === `delier-${d.paDelier}` ? null : `delier-${d.paDelier}`;
      rendreRubrique('securite');
      ($(`[data-pa-ligne="${d.paDelier}"] [data-pa-delier-non]`) || $(`[data-pa-delier="${d.paDelier}"]`))?.focus({ preventScroll: true });
      return;
    }
    if (d.paDelierNon !== undefined) {
      const s = el.closest('[data-pa-ligne]').dataset.paLigne;
      ui.confirmer = null;
      rendreRubrique('securite');
      $(`[data-pa-delier="${s}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (d.paDelierOui !== undefined) { delier(d.paDelierOui); return; }
    if (d.paSortir !== undefined) { sortir([d.paSortir]); return; }
    if (d.paSortirTous !== undefined) { sortir(etat.appareils.filter(id => id !== 'ici')); return; }
    if (d.paExportDemander !== undefined) { demanderExport(); return; }
    if (d.paTelecharger !== undefined) { V.toast('Téléchargement de vos données.', 'download'); return; }
    if (d.paEmailRenvoyer !== undefined) { V.toast(`Nouveau lien envoyé à ${etat.nouvelEmail}.`, 'mail'); return; }
    if (d.paEmailAnnuler !== undefined) {
      regler('changement', 'aucun');
      rendreRubrique('compte');
      $('[data-pa-modifier="email"]')?.focus({ preventScroll: true });
      V.toast(`Changement annulé : votre adresse reste ${etat.email}.`, 'mail');
      return;
    }
    if (d.paOubli !== undefined) { V.toast(`Lien de réinitialisation envoyé à ${masquer(etat.email)}.`, 'mail'); return; }
    if (d.paSupprRenvoyer !== undefined) { V.toast(`Nouveau lien envoyé à ${masquer(etat.email)}.`, 'mail'); return; }
    if (d.paFuseauAppareil !== undefined) { choisirFuseau(d.paFuseauAppareil, '#pa-fuseau'); }
  });

  function basculer(bouton) {
    const id = bouton.dataset.paSwitch;
    const valeur = bouton.getAttribute('aria-checked') !== 'true';
    const cible = `[data-pa-switch="${id}"]`;
    if (id === 'emails') {
      enregistrerChoix(() => ecrireEmailsActifs(valeur), () => ecrireEmailsActifs(!valeur),
        valeur ? 'Vous recevrez aussi ces notifications par e-mail.' : 'Vos notifications ne vous seront plus envoyées par e-mail.', 'mail', 'emails', cible);
    } else if (id === 'signalements') {
      enregistrerChoix(() => { etat.signalements = valeur; ecrire(); }, () => { etat.signalements = !valeur; ecrire(); },
        valeur ? 'Vous recevrez un e-mail pour les signalements en attente.' : 'Plus d’e-mail pour les signalements en attente.', 'shield', 'signalements', cible);
    } else if (id.startsWith('evt:')) {
      const evt = id.slice(4);
      const label = PA.evenements.flatMap(g => g.items).find(i => i.id === evt)?.label || '';
      enregistrerChoix(() => { etat.evenements[evt] = valeur; ecrire(); }, () => { etat.evenements[evt] = !valeur; ecrire(); },
        `${label} : ${valeur ? 'envoyés aussi par e-mail' : 'plus d’e-mail'}.`, 'mail', id, cible);
    }
  }
  function choisirFuseau(id, cible) {
    const avant = etat.fuseau;
    const f = PA.fuseaux.find(x => x.id === id);
    if (!f || id === avant) return;
    enregistrerChoix(() => { etat.fuseau = id; ecrire(); }, () => { etat.fuseau = avant; ecrire(); }, `Fuseau horaire : ${f.ville}.`, 'clock', 'fuseau', cible);
  }

  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-pa-langue]')) {
      const avant = etat.langue;
      const l = PA.langues.find(x => x.id === el.value);
      enregistrerChoix(() => { etat.langue = l.id; ecrire(); }, () => { etat.langue = avant; ecrire(); }, l.id === 'fr' ? 'Langue enregistrée : français.' : 'Langue enregistrée : English.', 'globe', 'langue', '#pa-langue');
    } else if (el.matches('[data-pa-fuseau]')) choisirFuseau(el.value, '#pa-fuseau');
    else if (el.matches('[data-pa-frequence]')) {
      const avant = etat.frequence;
      const label = FREQUENCES.find(([id]) => id === el.value)[1];
      enregistrerChoix(() => { etat.frequence = el.value; ecrire(); }, () => { etat.frequence = avant; ecrire(); }, `Envoi des e-mails : ${label.charAt(0).toLowerCase()}${label.slice(1)}.`, 'mail', 'frequence', `[data-pa-frequence][value="${el.value}"]`);
    }
  });

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-pa-form]');
    if (!form) return;
    event.preventDefault();
    const bouton = $('button[type="submit"]', form);
    if (bouton.disabled) return;
    FORMS[form.dataset.paForm].envoyer(form, bouton);
  });
  document.addEventListener('input', event => { if (event.target.closest('[data-pa-form]') && event.target.name !== 'username') ui.sale = true; });

  dialogue.addEventListener('cancel', event => {
    event.preventDefault();
    if (ui.sale) demanderAbandon(() => fermerEdition()); else fermerEdition();
  });
  dialogue.addEventListener('click', event => {
    if (event.target !== dialogue) return;
    if (ui.sale) demanderAbandon(() => fermerEdition()); else fermerEdition();
  });
  window.addEventListener('beforeunload', event => {
    if (!ui.sale) return;
    event.preventDefault();
    event.returnValue = '';
  });

  /* Réglages et états ---------------------------------------------------------------------------------------- */

  const estMembre = e => e.session === 'membre';
  V.initTweaks({
    key: 'vysora-parametres-reglages',
    etats: [
      { name: 'connexion', legend: 'Moyens de connexion', options: [['mdp', 'E-mail et mot de passe'], ['mdp-google', 'Mot de passe et Google'], ['google', 'Google uniquement']], si: estMembre },
      { name: 'changement', legend: 'Changement d’adresse e-mail', options: [['aucun', 'Aucun'], ['attente', 'Nouvelle adresse à confirmer']], si: estMembre },
      { name: 'export', legend: 'Export des données', options: [['aucun', 'Aucune demande'], ['preparation', 'En préparation'], ['pret', 'Prêt à télécharger'], ['expire', 'Lien expiré']], si: estMembre },
      { name: 'enregistrement', legend: 'Enregistrement des modifications', options: [['reussi', 'Réussi'], ['echec', 'Échec du réseau']], si: estMembre }
    ],
    apparence: [
      { name: 'perimetre', legend: 'Contenu', options: [['propositions', 'MVP et propositions'], ['mvp', 'MVP seul']] },
      { name: 'navigation', legend: 'Rubriques', options: [['continue', 'Sur une seule page'], ['onglets', 'Une à la fois']] },
      { name: 'edition', legend: 'Modification', options: [['ligne', 'Dans la ligne'], ['fenetre', 'Dans une fenêtre']] },
      { name: 'intertitres', legend: 'Intertitres', options: [['icone', 'Icône'], ['filet', 'Filet']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { connexion: 'mdp-google', changement: 'aucun', export: 'aucun', enregistrement: 'reussi', perimetre: 'propositions', navigation: 'continue', edition: 'ligne', intertitres: 'icone' },
    onChange: (changed, next) => {
      settings = next;
      if (changed === 'init' || ui.interne) return;
      if (changed === 'reset' && $('[data-tw-tab="etats"]')?.getAttribute('aria-selected') !== 'false') {
        etat = INITIAL();
        ecrire();
        ecrireEmailsActifs(true);
        V.store.set(CLE_DEPART, null);
        ui.lienSuppression = false;
      }
      if (['accent', 'density', 'radius', 'effects', 'motion', 'intertitres', 'enregistrement'].includes(changed)) { if (changed !== 'enregistrement') requestAnimationFrame(() => majRail(false)); return; }
      if (changed === 'export') clearTimeout(ui.minuteurExport);
      if (changed === 'connexion') ui.lienSuppression = false;
      ui.confirmer = null;
      fermerEdition({ focus: false, rendre: false });
      render();
      if (changed === 'navigation') allerA(ui.rubrique);
    }
  });

  E.on((e, changed = []) => {
    if (changed.includes('session') && e.session === 'membre' && V.store.get(CLE_DEPART, null)) {
      V.store.set(CLE_DEPART, null);
      V.toast('Votre reconnexion annule la demande de suppression : votre compte est conservé.');
    }
    ui.confirmer = null;
    fermerEdition({ focus: false, rendre: false });
    render();
  });

  V.initHeader();
  root.classList.add('pa-entree');
  render();
  suivreDefilement();
  if (demandee && membre()) requestAnimationFrame(() => {
    const el = document.getElementById(demandee);
    if (el && settings.navigation !== 'onglets') window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - decalageHaut(), behavior: 'auto' });
  });
  setTimeout(() => root.classList.remove('pa-entree'), 1400);
})();
