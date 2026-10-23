'use strict';

/* Connexion : adresse e-mail et mot de passe sur un seul écran, Google et
   GitHub, double authentification des comptes de modération et
   d'administration, nouvelles conditions, mot de passe oublié, puis retour à
   la page d'origine. */

(() => {
  const V = window.Vysora;
  const Au = window.VysoraAuth;
  const A = Au.A;
  const E = V.etats;
  const { $, $$, t, icon } = V;

  const ECRANS = ['identifiants', 'deux-facteurs', 'documents', 'oubli', 'oubli-envoye', 'nouveau-mdp', 'lien-expire', 'succes'];
  const ORDRE = ['identifiants', 'deux-facteurs', 'documents', 'succes', 'deja', 'oubli', 'oubli-envoye', 'lien-expire', 'nouveau-mdp', 'nouveau-ok'];
  const conteneur = $('[data-vues]');
  const form = $('#form-identifiants');
  const formCode = $('#form-code');
  const email = $('#cx-email');
  const mdp = $('#cx-mdp');
  const secours = $('#cx-secours');
  const bouton = $('.action-principale', form);
  const alerteEl = $('[data-alerte]', form);

  let reglages = {};
  let contexteSimule = null;
  let ctx = Au.contexte();
  let interne = false;
  let echecs = 0;
  let arreterAttente = null;
  let arreterRenvoi = null;
  let profilEnCours = null;
  let modeCode = 'appli';
  let depart = null;

  const destination = () => ctx.destination || 'index.html';
  const prenom = () => E.MOI.nom.split(' ')[0];
  const changerEtat = patch => { interne = true; E.set(patch); interne = false; };
  const annulerDepart = () => { clearTimeout(depart); depart = null; };

  const fond = Au.fond();
  const vues = Au.vues(conteneur, {
    ordre: ORDRE,
    surAffichage: nom => {
      if (ECRANS.includes(nom) && reglages['cx-ecran'] !== nom) V.regler('cx-ecran', nom);
      if (nom !== 'succes') { annulerDepart(); fond.annuler(); }
    }
  });

  /* Contexte d'arrivée ------------------------------------------------------- */

  function rendreContexte() {
    ctx = Au.contexte(contexteSimule ?? (new URLSearchParams(location.search).has('retour') ? 'aucun' : reglages['cx-contexte']));
    Au.liens(ctx);
    Au.repere(ctx);
    Au.retour(ctx);
    $('[data-continuer]').href = destination();
  }

  /* Identifiants -------------------------------------------------------------
     Le même message d'erreur, que l'adresse possède un compte ou non. */

  Au.logos();
  Au.motDePasse(conteneur);
  Au.surveillerEmail(email, () => { if (!arreterAttente) Au.alerte(alerteEl); });
  mdp.addEventListener('input', () => {
    Au.erreur(mdp);
    if (!arreterAttente) Au.alerte(alerteEl);
  });

  function bloquer(secondes = 30) {
    arreterAttente?.();
    bouton.disabled = true;
    Au.alerte(alerteEl, `<p><b>${t('Trop de tentatives.')}</b> ${t('La connexion est suspendue quelques instants. Vous pouvez aussi')} <button class="lien" type="button" data-aller="oubli">${t('réinitialiser votre mot de passe')}</button>.</p>`);
    arreterAttente = Au.compte(secondes, reste => Au.libelle(bouton, `Réessayer dans ${Au.duree(reste)}`), () => {
      arreterAttente = null;
      echecs = 0;
      bouton.disabled = false;
      Au.libelle(bouton, 'Se connecter');
      Au.alerte(alerteEl);
    });
  }
  function libererAttente() {
    arreterAttente?.();
    arreterAttente = null;
    echecs = 0;
    Au.retablir(bouton);
    Au.libelle(bouton, 'Se connecter');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (bouton.disabled) return;
    Au.erreur(email, Au.messageEmail(email.value));
    Au.erreur(mdp, mdp.value ? '' : 'Indiquez votre mot de passe.');
    if (Au.premierInvalide(form)) return;
    Au.alerte(alerteEl);
    Au.occupe(bouton, true, 'Connexion…');
    await Au.attendre(850);
    Au.occupe(bouton, false);
    const resultat = reglages['cx-resultat'];
    if (resultat === 'indisponible') {
      Au.alerte(alerteEl, `<p><b>${t('La connexion est momentanément indisponible.')}</b> ${t('Réessayez dans quelques instants.')}</p>`);
      return;
    }
    if (resultat === 'limite') { echecs = 5; bloquer(); return; }
    if (resultat === 'identifiants') {
      echecs += 1;
      if (echecs >= 5) { bloquer(); return; }
      const suite = echecs >= 2
        ? ` ${t('Vous pouvez aussi')} <button class="lien" type="button" data-aller="oubli">${t('réinitialiser votre mot de passe')}</button>.`
        : '';
      Au.alerte(alerteEl, `<p><b>${t('Adresse e-mail ou mot de passe incorrect.')}</b>${suite}</p>`);
      mdp.select();
      mdp.focus();
      return;
    }
    identifier(bouton);
  });

  /* Google et GitHub ------------------------------------------------------- */

  $$('[data-service]').forEach(service => service.addEventListener('click', async () => {
    Au.alerte(alerteEl);
    const s = await Au.redirection(service.dataset.service);
    const resultat = reglages['cx-resultat'];
    if (resultat === 'service-lie') {
      email.value = s.email;
      Au.erreur(email);
      Au.alerte(alerteEl, `<p><b>${t(`L’adresse de votre compte ${s.nom} appartient déjà à un compte Vysora.`)}</b> ${t(`Connectez-vous avec votre mot de passe, puis liez ${s.nom} depuis vos paramètres.`)}</p>`, 'info');
      mdp.focus();
      return;
    }
    if (resultat === 'service-inconnu') {
      const lien = `inscription.html?service=${service.dataset.service}${ctx.requete ? `&${ctx.requete}` : ''}`;
      Au.alerte(alerteEl, `<p><b>${t(`Aucun compte Vysora n’est associé à ce compte ${s.nom}.`)}</b></p><a class="action action-secondaire" href="${lien}">${t(`Créer un compte avec ${s.nom}`)}</a>`, 'info');
      return;
    }
    if (resultat === 'indisponible') {
      Au.alerte(alerteEl, `<p><b>${t(`La connexion avec ${s.nom} n’a pas abouti.`)}</b> ${t('Réessayez, ou utilisez votre adresse e-mail.')}</p>`);
      return;
    }
    identifier(null);
  }));

  /* Après l'identification -------------------------------------------------- */

  function identifier(boutonUtilise) {
    const profil = reglages['cx-compte'];
    if (['moderateur', 'admin'].includes(profil)) {
      profilEnCours = profil;
      preparerCode(profil);
      vues.afficher('deux-facteurs', { focus: 'champ' });
      return;
    }
    terminer(profil, boutonUtilise);
  }

  function terminer(profil, boutonUtilise) {
    const role = ['moderateur', 'admin'].includes(profil) ? profil : 'membre';
    const compte = ['email', 'conditions', 'suspendu'].includes(profil) ? profil : 'actif';
    changerEtat({ session: 'membre', role, compte });
    mdp.value = '';
    Au.cacherMotsDePasse(conteneur);
    if (compte === 'conditions') { Au.retablir(boutonUtilise); vues.afficher('documents'); return; }
    if (profil === 'suppression' || compte !== 'actif') { Au.retablir(boutonUtilise); succes(profil === 'suppression' ? 'suppression' : compte); return; }
    partir(boutonUtilise);
  }

  /* Le moment clé : le bouton confirme, l'anneau se ferme, puis le retour. */
  function partir(boutonUtilise) {
    const niveau = V.motion.level();
    if (boutonUtilise) Au.reussi(boutonUtilise, 'Connecté');
    setTimeout(() => {
      Au.retablir(boutonUtilise);
      succes('depart');
      depart = setTimeout(() => location.assign(destination()), { full: 2300, reduced: 1100, none: 500 }[niveau] ?? 1100);
    }, boutonUtilise && niveau !== 'none' ? 520 : 0);
  }

  function boutonContinuer() {
    return `<a class="action action-principale" href="${destination()}"><span class="action-libelle">${t(ctx.actif ? 'Reprendre où vous en étiez' : 'Continuer')}</span>${icon('arrow')}</a>`;
  }
  function succes(cas) {
    const textes = {
      depart: { titre: `Bon retour, ${prenom()}`, attente: `${Au.libelleRetour(ctx)}…` },
      actif: { titre: `Bon retour, ${prenom()}`, actions: boutonContinuer() },
      email: { titre: `Bon retour, ${prenom()}`, texte: 'Confirmez votre adresse e-mail pour publier, voter et répondre. Le lien reçu à l’inscription reste valable 24 heures.', actions: `${boutonContinuer()}<button class="action action-secondaire" type="button" data-renvoyer-confirmation>Renvoyer le lien</button>` },
      suspendu: { titre: 'Compte suspendu', texte: `Jusqu’au ${E.DATES.suspension}, vous pouvez consulter Vysora et gérer vos paramètres.`, actions: `${boutonContinuer()}<a class="action action-secondaire" href="notifications.html">Voir la décision</a>` },
      conditions: { titre: `Bon retour, ${prenom()}`, texte: 'Votre compte reste en lecture seule jusqu’à l’acceptation des nouvelles conditions.', actions: `<button class="action action-principale" type="button" data-aller="documents">Accepter les conditions</button><a class="action action-secondaire" href="${destination()}">Continuer en lecture seule</a>` },
      suppression: { titre: 'Votre compte est conservé', texte: 'Votre reconnexion annule la demande de suppression du 12 octobre 2026.', actions: `${boutonContinuer()}<a class="action action-secondaire" href="parametres.html">Ouvrir les paramètres</a>` }
    };
    const s = textes[cas] || textes.actif;
    const vue = $('[data-vue="succes"]');
    $('.moment', vue).style.display = cas === 'suspendu' ? 'none' : '';
    $('[data-picto-suspendu]', vue).hidden = cas !== 'suspendu';
    $('[data-succes-titre]').textContent = V.typo(s.titre);
    const texte = $('[data-succes-texte]');
    texte.hidden = !s.texte;
    texte.textContent = s.texte ? V.typo(s.texte) : '';
    const attente = $('[data-succes-attente]');
    attente.hidden = !s.attente;
    attente.textContent = s.attente ? V.typo(s.attente) : '';
    $('[data-succes-actions]').innerHTML = s.actions || '';
    vues.afficher('succes');
    if (cas !== 'suspendu') fond.reussir();
  }

  /* Double authentification (ENF-05) --------------------------------------- */

  const otp = Au.codeSixChiffres($('[data-otp]'), () => formCode.requestSubmit());
  function preparerCode(profil) {
    $('[data-role-libelle]').textContent = V.typo(profil === 'admin' ? 'Compte d’administration' : 'Compte de modération');
    choisirModeCode('appli');
    otp.vider();
    secours.value = '';
    [$('#cx-code'), secours].forEach(input => Au.erreur(input));
  }
  function choisirModeCode(mode) {
    modeCode = mode;
    $$('[data-mode-code]', formCode).forEach(champ => { champ.hidden = champ.dataset.modeCode !== mode; });
    $('[data-basculer-code]').textContent = V.typo(mode === 'appli' ? 'Utiliser un code de secours' : 'Utiliser l’application');
    $('[data-code-intro]').textContent = V.typo(mode === 'appli' ? 'Saisissez le code affiché par votre application d’authentification.' : 'Saisissez l’un de vos codes de secours.');
  }
  $('[data-basculer-code]').addEventListener('click', () => {
    choisirModeCode(modeCode === 'appli' ? 'secours' : 'appli');
    (modeCode === 'appli' ? $('#cx-code') : secours).focus();
  });
  secours.addEventListener('input', () => {
    const brut = secours.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    secours.value = brut.length > 4 ? `${brut.slice(0, 4)}-${brut.slice(4)}` : brut;
    Au.erreur(secours);
  });
  formCode.addEventListener('submit', async event => {
    event.preventDefault();
    const action = $('.action-principale', formCode);
    const code = $('#cx-code');
    if (action.disabled) return;
    if (modeCode === 'appli') Au.erreur(code, code.value.length === 6 ? '' : 'Saisissez les six chiffres du code.');
    else Au.erreur(secours, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(secours.value) ? '' : 'Saisissez un code au format ABCD-EFGH.');
    if (Au.premierInvalide(formCode)) return;
    Au.occupe(action, true, 'Vérification…');
    await Au.attendre(750);
    Au.occupe(action, false);
    if (reglages['cx-resultat'] === 'code') {
      if (modeCode === 'appli') { Au.erreur(code, 'Ce code ne correspond pas. Attendez le suivant, puis réessayez.'); otp.vider(); }
      else { Au.erreur(secours, 'Ce code de secours n’est pas valide ou a déjà servi.'); secours.select(); }
      Au.premierInvalide(formCode);
      return;
    }
    terminer(profilEnCours || reglages['cx-compte'], action);
  });

  /* Nouvelles conditions (F-04, WF-03) ------------------------------------- */

  $('[data-changements]').innerHTML = ['cgu', 'charte'].map(cle => {
    const d = A.documents[cle];
    return `<li><b>${t(d.titre)}</b><span>${t(d.changement)}</span><button class="lien" type="button" data-document="${cle}">Lire le document</button></li>`;
  }).join('');
  const accord = $('#cx-accord');
  accord.addEventListener('change', () => Au.erreur(accord));
  $('#form-documents').addEventListener('submit', async event => {
    event.preventDefault();
    const action = $('.action-principale', event.currentTarget);
    if (!accord.checked) { Au.erreur(accord, 'Cochez la case pour accepter les nouvelles versions.'); Au.premierInvalide(event.currentTarget); return; }
    Au.occupe(action, true, 'Enregistrement…');
    await Au.attendre(600);
    Au.occupe(action, false);
    changerEtat({ compte: 'actif' });
    accord.checked = false;
    partir(action);
  });
  $('[data-plus-tard]').addEventListener('click', () => succes('conditions'));

  /* Mot de passe oublié (F-03) : le même message, que le compte existe ou non. */

  const oubliEmail = $('#cx-oubli-email');
  Au.surveillerEmail(oubliEmail);
  $('#form-oubli').addEventListener('submit', async event => {
    event.preventDefault();
    const action = $('.action-principale', event.currentTarget);
    Au.erreur(oubliEmail, Au.messageEmail(oubliEmail.value));
    if (Au.premierInvalide(event.currentTarget)) return;
    Au.occupe(action, true, 'Envoi…');
    await Au.attendre(700);
    Au.occupe(action, false);
    lienEnvoye(oubliEmail.value.trim());
  });
  function lienEnvoye(adresse) {
    $('[data-email-oubli]').textContent = adresse;
    const m = A.messageries.find(item => item.motif.test(adresse));
    $('[data-messagerie]').innerHTML = m ? `<a class="action action-principale" href="${m.lien}" target="_blank" rel="noopener"><span class="action-libelle">${t(`Ouvrir ${m.nom}`)}</span>${icon('external')}<span class="sr-only">(nouvel onglet)</span></a>` : '';
    vues.afficher('oubli-envoye');
    delaiRenvoi();
  }
  function delaiRenvoi() {
    const lien = $('[data-renvoyer-oubli]');
    arreterRenvoi?.();
    lien.disabled = true;
    arreterRenvoi = Au.compte(30, reste => { lien.textContent = `Renvoyer le lien (${reste} s)`; }, () => {
      lien.disabled = false;
      lien.textContent = 'Renvoyer le lien';
    });
  }
  $('[data-renvoyer-oubli]').addEventListener('click', () => { V.toast('Nouveau lien envoyé.', 'mail'); delaiRenvoi(); });

  /* Nouveau mot de passe (lien valable une heure) -------------------------- */

  const nouveau = $('#cx-nouveau');
  const jauge = Au.jauge(nouveau, () => ({ email: 'clarisse.mendy@gmail.com' }));
  $('#form-nouveau').addEventListener('submit', async event => {
    event.preventDefault();
    const action = $('.action-principale', event.currentTarget);
    const r = jauge.resultat();
    if (r.etat === 'vide') Au.erreur(nouveau, 'Choisissez un nouveau mot de passe.');
    else if (r.etat === 'court') Au.erreur(nouveau, `Ajoutez encore ${V.plural(r.reste, 'caractère', 'caractères')} : 12 au minimum.`);
    else if (r.message) Au.erreur(nouveau, r.message);
    if (Au.premierInvalide(event.currentTarget)) return;
    Au.occupe(action, true, 'Enregistrement…');
    await Au.attendre(700);
    Au.occupe(action, false);
    nouveau.value = '';
    jauge.maj();
    Au.cacherMotsDePasse(conteneur);
    email.value = 'clarisse.mendy@gmail.com';
    vues.afficher('nouveau-ok');
  });

  /* Navigation entre les écrans --------------------------------------------- */

  function aller(nom) {
    if (nom === 'oubli' && email.value && !oubliEmail.value) oubliEmail.value = email.value;
    if (nom === 'identifiants') {
      profilEnCours = null;
      if (E.membre()) { rendreDeja(); vues.afficher('deja'); } else vues.afficher('identifiants', { focus: 'champ' });
      return;
    }
    if (nom === 'deux-facteurs') { profilEnCours = ['moderateur', 'admin'].includes(reglages['cx-compte']) ? reglages['cx-compte'] : 'moderateur'; preparerCode(profilEnCours); }
    if (nom === 'oubli-envoye') { lienEnvoye(oubliEmail.value.trim() || email.value.trim() || 'clarisse.mendy@gmail.com'); return; }
    if (nom === 'succes') { simulerSucces(); return; }
    vues.afficher(nom, { focus: ['oubli', 'nouveau-mdp', 'deux-facteurs'].includes(nom) ? 'champ' : 'titre' });
  }
  function simulerSucces() {
    const profil = reglages['cx-compte'];
    const compte = ['email', 'conditions', 'suspendu'].includes(profil) ? profil : 'actif';
    changerEtat({ session: 'membre', role: ['moderateur', 'admin'].includes(profil) ? profil : 'membre', compte });
    succes(profil === 'suppression' ? 'suppression' : compte);
  }
  conteneur.addEventListener('click', event => {
    const cible = event.target.closest('[data-aller]');
    if (cible) { event.preventDefault(); aller(cible.dataset.aller); return; }
    if (event.target.closest('[data-renvoyer-confirmation]')) V.toast('Lien de confirmation envoyé.', 'mail');
  });

  /* Session déjà ouverte ------------------------------------------------------ */

  function rendreDeja() {
    const niveau = E.niveau();
    const compte = E.get().compte;
    $('[data-qui]').innerHTML = `${V.avatarMoi(44)}<p><b>${t(E.MOI.nom)}</b><span>${t(`${niveau.nom} · ${V.fmt(niveau.points)} points`)}</span></p>`;
    const textes = {
      email: 'Confirmez votre adresse e-mail pour publier, voter et répondre.',
      conditions: 'Acceptez les nouvelles conditions pour publier et participer.',
      suspendu: `Votre compte est suspendu jusqu’au ${E.DATES.suspension}.`
    };
    const texte = $('[data-deja-texte]');
    texte.hidden = !textes[compte];
    texte.textContent = textes[compte] ? V.typo(textes[compte]) : '';
    $('[data-continuer]').href = destination();
    Au.libelle($('[data-continuer]'), ctx.actif ? 'Reprendre où vous en étiez' : 'Continuer');
  }
  $('[data-autre-compte]').addEventListener('click', () => {
    changerEtat({ session: 'visiteur' });
    V.toast('Session fermée sur cet appareil.');
    vues.afficher('identifiants', { focus: 'champ' });
  });

  E.on((etat, changes) => {
    if (interne) return;
    if (changes.includes('session')) {
      if (!E.membre()) { profilEnCours = null; vues.afficher('identifiants', { focus: false }); return; }
      if (['identifiants', 'oubli', 'oubli-envoye'].includes(vues.actuelle())) { rendreDeja(); vues.afficher('deja', { focus: false }); return; }
    }
    if (vues.actuelle() === 'deja') rendreDeja();
  });

  /* Aide -------------------------------------------------------------------- */

  $('[data-aide]').addEventListener('click', () => {
    const fenetre = Au.aide([
      ['Compte créé avec Google ou GitHub', 'Utilisez le même bouton pour vous connecter : aucun mot de passe Vysora n’est nécessaire.'],
      ['Mot de passe oublié', 'Demandez un lien de réinitialisation. Il reste valable une heure.'],
      ['Connexion suspendue', 'Après cinq tentatives infructueuses, la connexion est suspendue quelques instants pour protéger votre compte.'],
      ['Modération et administration', 'La vérification en deux étapes est obligatoire pour ces comptes.']
    ], '<button class="action action-secondaire" type="button" data-aide-oubli>Réinitialiser mon mot de passe</button>');
    $('[data-aide-oubli]', fenetre).addEventListener('click', () => { fenetre.close(); aller('oubli'); });
  });

  /* Réglages ---------------------------------------------------------------- */

  function ecranInitial() {
    const params = new URLSearchParams(location.search);
    if (params.has('jeton')) return params.get('jeton') === 'expire' ? 'lien-expire' : 'nouveau-mdp';
    if (location.hash === '#oubli') return 'oubli';
    return 'identifiants';
  }

  V.initTweaks({
    key: 'vysora-connexion-reglages',
    etats: [
      { name: 'cx-ecran', legend: 'Écran', options: [['identifiants', 'Identifiants'], ['deux-facteurs', 'Double authentification'], ['documents', 'Nouvelles conditions'], ['oubli', 'Mot de passe oublié'], ['oubli-envoye', 'Lien envoyé'], ['nouveau-mdp', 'Nouveau mot de passe'], ['lien-expire', 'Lien expiré'], ['succes', 'Connexion réussie']] },
      { name: 'cx-compte', legend: 'Compte qui se connecte', options: [['membre', 'Membre'], ['moderateur', 'Modérateur'], ['admin', 'Administrateur'], ['email', 'E-mail à vérifier'], ['conditions', 'Conditions à accepter'], ['suspendu', 'Suspendu'], ['suppression', 'Suppression demandée']] },
      { name: 'cx-resultat', legend: 'Résultat', options: [['succes', 'Réussite'], ['identifiants', 'Identifiants incorrects'], ['limite', 'Trop de tentatives'], ['code', 'Code de vérification refusé'], ['service-lie', 'Adresse déjà liée'], ['service-inconnu', 'Aucun compte associé'], ['indisponible', 'Service indisponible']] },
      { name: 'cx-contexte', legend: 'Arrivée depuis', options: [['aucun', 'Sans page d’origine'], ['enregistrer', 'Enregistrer une création'], ['essai', 'Déclarer un essai'], ['bon-reflexe', 'Cas Bon réflexe'], ['defi', 'Défi en cours'], ['sujet', 'Sujet du forum'], ['publier', 'Nouvelle création']] }
    ],
    apparence: Au.APPARENCE,
    defaults: { 'cx-ecran': 'identifiants', 'cx-compte': 'membre', 'cx-resultat': 'succes', 'cx-contexte': 'aucun', ...Au.APPARENCE_DEFAUTS },
    onChange: (change, valeurs) => {
      reglages = valeurs;
      if (Au.REGLAGES_FOND.includes(change) || change === 'init') fond.maj();
      if (change === 'init') return;
      if (change === 'cx-contexte' || change === 'reset') { contexteSimule = change === 'reset' ? null : valeurs['cx-contexte']; rendreContexte(); if (vues.actuelle() === 'deja') rendreDeja(); }
      if (change === 'cx-resultat' || change === 'reset') { libererAttente(); $$('[data-alerte]', conteneur).forEach(el => Au.alerte(el)); }
      if (change === 'cx-ecran' && valeurs['cx-ecran'] !== vues.actuelle()) aller(valeurs['cx-ecran']);
      if (change === 'reset') aller('identifiants');
    }
  });

  V.fixTypography(document.body);
  rendreContexte();
  Au.demarrer();
  const premier = ecranInitial();
  if (premier === 'identifiants' && E.membre()) { rendreDeja(); vues.afficher('deja', { focus: false }); }
  else vues.afficher(premier, { focus: false });
  if (premier !== reglages['cx-ecran']) V.regler('cx-ecran', premier);
})();
