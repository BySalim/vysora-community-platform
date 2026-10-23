'use strict';

/* Inscription : adresse e-mail et mot de passe, ou compte Google et GitHub ;
   le compte reçoit un pseudo tiré au hasard, que le membre garde ou modifie ;
   invitation à la bêta ; confirmation de l'adresse. */

(() => {
  const V = window.Vysora;
  const Au = window.VysoraAuth;
  const A = Au.A;
  const E = V.etats;
  const { $, $$, t, icon } = V;

  const ECRANS = ['compte', 'mot-de-passe', 'pseudo', 'verification', 'lien', 'pret', 'lien-expire'];
  const ORDRE = ['compte', 'mot-de-passe', 'pseudo', 'verification', 'lien', 'pret', 'lien-expire', 'deja'];
  const MOTIF_PSEUDO = /^[\p{L}\p{N}_-]{3,30}$/u;
  const MOTIF_CODE = /^VYS-[A-Z0-9]{4}-[A-Z0-9]{2}$/;
  const conteneur = $('[data-vues]');
  const form = $('#form-compte');
  const formPseudo = $('#form-pseudo');
  const champCode = $('#in-code');
  const pseudoInput = $('#in-pseudo');
  const email = $('#in-email');
  const mdp = $('#in-mdp');

  let reglages = {};
  let contexteSimule = null;
  let ctx = Au.contexte();
  let interne = false;
  let cree = false;
  let compteCree = { pseudo: '', email: '', service: null };
  let arreterRenvoi = null;

  const params = new URLSearchParams(location.search);
  const invitationLien = (params.get('invitation') || '').toUpperCase();
  const phase = () => (MOTIF_CODE.test(invitationLien) ? 'invitation' : reglages['ins-phase'] || 'publique');
  const changerEtat = patch => { interne = true; E.set(patch); interne = false; };
  const destination = () => ctx.destination || 'index.html';
  const libelleSuite = () => (ctx.actif ? 'Reprendre où vous en étiez' : 'Continuer');

  const fond = Au.fond();
  const vues = Au.vues(conteneur, {
    ordre: ORDRE,
    surAffichage: nom => {
      if (ECRANS.includes(nom) && reglages['ins-ecran'] !== nom) V.regler('ins-ecran', nom);
      if (['lien', 'pret'].includes(nom)) fond.reussir();
      else fond.annuler();
    }
  });

  /* Contexte d'arrivée et invitation ----------------------------------------- */

  function rendreContexte() {
    ctx = Au.contexte(contexteSimule ?? (params.has('retour') ? 'aucun' : reglages['ins-contexte']));
    Au.liens(ctx);
    Au.repere(ctx);
    Au.retour(ctx);
    $$('[data-continuer]').forEach(lien => { lien.href = destination(); Au.libelle(lien, libelleSuite()); });
    $('[data-plus-tard]').href = destination();
  }
  function rendrePhase() {
    const p = phase();
    const bloc = $('[data-invitation]');
    bloc.hidden = p !== 'invitation';
    bloc.innerHTML = p === 'invitation' ? `${V.avatar(A.invitation.par, 28)}<span><b>${t(A.invitation.par)}</b>${t(' vous invite à rejoindre la bêta.')}</span>` : '';
    $('[data-champ-code]').hidden = p !== 'beta';
    $('[data-intro-beta]').hidden = p !== 'beta';
    if (p !== 'beta') Au.erreur(champCode);
  }

  /* Code d'invitation (bêta fermée) ------------------------------------------- */

  champCode.addEventListener('input', () => {
    const brut = champCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
    champCode.value = [brut.slice(0, 3), brut.slice(3, 7), brut.slice(7)].filter(Boolean).join('-');
    Au.erreur(champCode);
  });
  function codeValide() {
    if (phase() !== 'beta') return true;
    const ok = MOTIF_CODE.test(champCode.value);
    Au.erreur(champCode, !champCode.value ? 'Saisissez votre code d’invitation.' : ok ? '' : 'Ce code est incomplet. Format : VYS-K7M2-Q9.');
    if (!ok) { champCode.focus(); Au.secouer(champCode.closest('.saisie')); }
    return ok;
  }

  /* Pseudo : tiré au hasard, format (RG-01), disponibilité et propositions ---- */

  const prisLocal = valeur => A.pseudosPris.includes(valeur.toLowerCase());
  const auHasard = liste => liste[Math.floor(Math.random() * liste.length)];
  function tirerPseudo(different = '') {
    let pseudo = '';
    do pseudo = `${auHasard(A.pseudoNoms)}-${auHasard(A.pseudoCouleurs)}-${10 + Math.floor(Math.random() * 90)}`;
    while (pseudo === different || prisLocal(pseudo));
    return pseudo;
  }
  function propositions(base) {
    const racine = base.toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24) || 'createur';
    return [`${racine}-ia`, racine.includes('-') ? racine.replace(/-/g, '_') : `${racine}_cree`, `${racine}-26`]
      .filter(s => MOTIF_PSEUDO.test(s) && !prisLocal(s)).slice(0, 3);
  }

  function champPseudo(input) {
    const champ = input.closest('[data-champ-pseudo]');
    const aide = $('[data-pseudo-aide]', champ);
    const etatIcone = $('[data-pseudo-etat]', champ);
    const zone = $('[data-propositions]', champ);
    const annonce = $('[data-pseudo-annonce]', champ);
    const INDICE = aide.textContent;
    let minuterie;
    let etat = 'vide';

    function afficherEtat(e) {
      etatIcone.dataset.etat = e;
      etatIcone.innerHTML = e === 'libre' ? icon('check') : ['pris', 'invalide'].includes(e) ? icon('alert') : '';
    }
    function afficherPropositions(liste) {
      zone.hidden = !liste.length;
      zone.innerHTML = liste.length ? `<span>Disponibles :</span>${liste.map(s => `<button class="proposition" type="button" data-pseudo="${V.esc(s)}">${t(s)}</button>`).join('')}` : '';
    }
    /* L'indice n'apparaît que pendant la saisie d'un pseudo encore incomplet. */
    function indice() {
      aide.className = 'message indice';
      aide.textContent = INDICE;
      aide.hidden = !(document.activeElement === input && ['vide', 'court'].includes(etat));
    }
    function verifier({ immediat = false } = {}) {
      clearTimeout(minuterie);
      const v = input.value;
      const n = [...v].length;
      afficherPropositions([]);
      if (!v) { etat = 'vide'; Au.erreur(input); afficherEtat(''); indice(); return etat; }
      if (/[^\p{L}\p{N}_-]/u.test(v)) {
        etat = 'invalide';
        afficherEtat('invalide');
        aide.hidden = true;
        Au.erreur(input, 'Utilisez uniquement des lettres, des chiffres et des tirets.');
        return etat;
      }
      if (n < 3) {
        etat = 'court';
        afficherEtat('');
        if (immediat) { aide.hidden = true; Au.erreur(input, 'Utilisez au moins 3 caractères.'); } else { Au.erreur(input); indice(); }
        return etat;
      }
      Au.erreur(input);
      const conclure = () => {
        if (prisLocal(v)) {
          etat = 'pris';
          afficherEtat('pris');
          aide.hidden = true;
          Au.erreur(input, 'Ce pseudo est déjà pris.');
          afficherPropositions(propositions(v));
          annonce.textContent = 'Ce pseudo est déjà pris. Des pseudos disponibles sont proposés.';
        } else {
          etat = 'libre';
          afficherEtat('libre');
          aide.hidden = false;
          aide.className = 'message is-ok';
          aide.innerHTML = `${icon('check')}<span>Disponible</span>`;
          annonce.textContent = `${v} est disponible.`;
        }
      };
      if (immediat) { conclure(); return etat; }
      etat = 'verification';
      afficherEtat('verification');
      aide.hidden = true;
      minuterie = setTimeout(conclure, 450);
      return etat;
    }
    input.addEventListener('input', () => {
      const position = input.selectionStart;
      const propre = input.value.normalize('NFC').replace(/\s/g, '-');
      if (propre !== input.value) { input.value = propre; input.setSelectionRange(position, position); }
      verifier();
    });
    input.addEventListener('focus', () => { if (['vide', 'court'].includes(etat)) indice(); });
    input.addEventListener('blur', () => {
      if (etat === 'court') verifier({ immediat: true });
      else if (etat === 'vide') aide.hidden = true;
    });
    zone.addEventListener('click', event => {
      const bouton = event.target.closest('[data-pseudo]');
      if (!bouton) return;
      input.value = bouton.dataset.pseudo;
      verifier({ immediat: true });
      input.focus();
    });
    return {
      valider() {
        const resultat = verifier({ immediat: true });
        if (resultat === 'vide') { aide.hidden = true; Au.erreur(input, 'Choisissez votre pseudo.'); }
        return resultat === 'libre';
      },
      refuser() {
        etat = 'pris';
        afficherEtat('pris');
        aide.hidden = true;
        Au.erreur(input, 'Ce pseudo vient d’être pris. Choisissez-en un autre.');
        afficherPropositions(propositions(input.value));
      },
      verifier
    };
  }
  const pseudo = champPseudo(pseudoInput);

  const de = $('[data-autre-pseudo]');
  de.addEventListener('click', () => {
    pseudoInput.value = tirerPseudo(pseudoInput.value);
    pseudo.verifier({ immediat: true });
    de.classList.toggle('is-tire');
    if (V.motion.full()) pseudoInput.animate([{ opacity: 0.2, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' });
  });

  /* Formulaire principal (F-01, F-04) ------------------------------------------ */

  Au.logos();
  Au.motDePasse(conteneur);
  Au.surveillerEmail(email, () => Au.alerte($('[data-alerte]', form)));
  const jauge = Au.jauge(mdp, () => ({ email: email.value }));

  function messageMdp() {
    const r = jauge.resultat();
    if (r.etat === 'vide') return 'Choisissez un mot de passe.';
    if (r.etat === 'court') return `Ajoutez encore ${V.plural(r.reste, 'caractère', 'caractères')} : 12 au minimum.`;
    return r.message || '';
  }

  /* Étape 1 : l'adresse e-mail. Le compte n'est créé qu'avec le mot de passe. */
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const bouton = $('.action-principale', form);
    const alerteEl = $('[data-alerte]', form);
    if (bouton.disabled) return;
    Au.alerte(alerteEl);
    if (!codeValide()) return;
    Au.erreur(email, Au.messageEmail(email.value));
    if (Au.premierInvalide(form)) return;
    Au.occupe(bouton, true, 'Vérification…');
    await Au.attendre(550);
    Au.occupe(bouton, false);
    if (reglages['ins-resultat'] === 'email') {
      Au.erreur(email, 'Cette adresse est déjà associée à un compte Vysora.');
      Au.alerte(alerteEl, `<p><b>${t('Vous avez peut-être déjà un compte.')}</b> ${t('Connectez-vous avec cette adresse, ou utilisez-en une autre.')}</p><a class="action action-secondaire" href="connexion.html${ctx.requete ? `?${ctx.requete}` : ''}">Se connecter</a>`, 'info');
      email.focus();
      return;
    }
    aller('mot-de-passe');
  });

  /* Étape 2 : le mot de passe et sa confirmation (RG-04). */
  const formMdp = $('#form-mdp');
  const confirmation = $('#in-mdp-confirmation');
  const confirmationEtat = $('[data-confirmation-etat]');
  const confirmationAnnonce = $('[data-confirmation-annonce]');
  function verifierConfirmation({ strict = false } = {}) {
    const valeur = confirmation.value;
    const identique = Boolean(valeur) && valeur === mdp.value;
    confirmationEtat.dataset.etat = identique ? 'libre' : '';
    confirmationEtat.innerHTML = identique ? icon('check') : '';
    if (identique && confirmationAnnonce.textContent !== 'Les mots de passe correspondent.') confirmationAnnonce.textContent = 'Les mots de passe correspondent.';
    if (!identique) confirmationAnnonce.textContent = '';
    if (!valeur) Au.erreur(confirmation, strict ? 'Confirmez votre mot de passe.' : '');
    else if (identique) Au.erreur(confirmation);
    else Au.erreur(confirmation, strict || [...valeur].length >= [...mdp.value].length ? 'Les mots de passe ne correspondent pas.' : '');
    return identique;
  }
  confirmation.addEventListener('input', () => verifierConfirmation());
  confirmation.addEventListener('blur', () => { if (confirmation.value) verifierConfirmation({ strict: true }); });
  mdp.addEventListener('input', () => { if (confirmation.value) verifierConfirmation(); });

  formMdp.addEventListener('submit', async event => {
    event.preventDefault();
    const bouton = $('.action-principale', formMdp);
    const alerteEl = $('[data-alerte]', formMdp);
    if (bouton.disabled) return;
    Au.alerte(alerteEl);
    Au.erreur(mdp, messageMdp());
    if (!mdp.getAttribute('aria-invalid') || mdp.getAttribute('aria-invalid') === 'false') verifierConfirmation({ strict: true });
    else Au.erreur(confirmation);
    if (Au.premierInvalide(formMdp)) return;
    Au.occupe(bouton, true, 'Création du compte…');
    await Au.attendre(1000);
    Au.occupe(bouton, false);
    if (reglages['ins-resultat'] === 'indisponible') {
      Au.alerte(alerteEl, `<p><b>${t('La création du compte est momentanément indisponible.')}</b> ${t('Vos informations sont conservées : réessayez dans quelques instants.')}</p>`);
      return;
    }
    Au.reussi(bouton, 'Compte créé');
    await Au.attendre(V.motion.level() === 'none' ? 0 : 520);
    Au.retablir(bouton);
    creer({ email: email.value.trim(), service: null });
  });

  function preparerMotDePasse() {
    if (!Au.emailValide(email.value)) email.value = 'clarisse.mendy@gmail.com';
    $('[data-email-rappel]').textContent = email.value.trim();
    $('[data-email-cache]').value = email.value.trim();
    Au.alerte($('[data-alerte]', formMdp));
  }

  function creer({ email: adresse, service }) {
    cree = true;
    compteCree = { pseudo: tirerPseudo(), email: adresse, service };
    mdp.value = '';
    confirmation.value = '';
    jauge.maj();
    verifierConfirmation();
    Au.cacherMotsDePasse(conteneur);
    changerEtat({ session: 'membre', role: 'membre', niveau: 'curieux', compte: service ? 'actif' : 'email', notifications: 'lues' });
    aller('pseudo');
  }

  /* Google et GitHub (F-02) ----------------------------------------------------- */

  $$('[data-service]').forEach(bouton => bouton.addEventListener('click', async () => {
    const alerteEl = $('[data-alerte]', form);
    Au.alerte(alerteEl);
    if (!codeValide()) return;
    const s = await Au.redirection(bouton.dataset.service);
    const resultat = reglages['ins-resultat'];
    if (resultat === 'email') {
      Au.alerte(alerteEl, `<p><b>${t(`L’adresse de votre compte ${s.nom} appartient déjà à un compte Vysora.`)}</b> ${t(`Connectez-vous, puis liez ${s.nom} depuis vos paramètres.`)}</p><a class="action action-secondaire" href="connexion.html${ctx.requete ? `?${ctx.requete}` : ''}">Se connecter</a>`, 'info');
      return;
    }
    if (resultat === 'indisponible') {
      Au.alerte(alerteEl, `<p><b>${t(`L’inscription avec ${s.nom} n’a pas abouti.`)}</b> ${t('Réessayez, ou utilisez votre adresse e-mail.')}</p>`);
      return;
    }
    creer({ email: s.email, service: bouton.dataset.service });
  }));

  /* Pseudo du nouveau compte ------------------------------------------------- */

  function rendrePseudo() {
    const service = compteCree.service;
    const identite = $('[data-identite]');
    identite.hidden = !service;
    if (service) {
      const s = A.services[service];
      identite.innerHTML = `<span class="identite-logo" aria-hidden="true">${Au.LOGOS[service]}</span><span class="identite-texte"><b>${t(s.email)}</b><span>${t(`Compte ${s.nom} · ${s.compte}`)}</span></span><span class="identite-ok">${icon('check')}Vérifiée</span>`;
    }
    $('[data-repere-cree]').hidden = Boolean(service);
    pseudoInput.value = compteCree.pseudo;
    Au.alerte($('[data-alerte]', formPseudo));
    pseudo.verifier({ immediat: true });
  }

  formPseudo.addEventListener('submit', async event => {
    event.preventDefault();
    const bouton = $('.action-principale', formPseudo);
    const alerteEl = $('[data-alerte]', formPseudo);
    if (bouton.disabled) return;
    Au.alerte(alerteEl);
    pseudo.valider();
    if (Au.premierInvalide(formPseudo)) return;
    Au.occupe(bouton, true, 'Enregistrement…');
    await Au.attendre(650);
    Au.occupe(bouton, false);
    const resultat = reglages['ins-resultat'];
    if (resultat === 'pseudo') { pseudo.refuser(); Au.premierInvalide(formPseudo); return; }
    if (resultat === 'indisponible') {
      Au.alerte(alerteEl, `<p><b>${t('L’enregistrement du pseudo est momentanément indisponible.')}</b> ${t('Réessayez dans quelques instants.')}</p>`);
      return;
    }
    compteCree.pseudo = pseudoInput.value.trim();
    aller(compteCree.service ? 'pret' : 'verification');
  });

  /* Confirmation de l'adresse ------------------------------------------------- */

  function rendreVerification() {
    $('[data-email-envoye]').textContent = compteCree.email;
    const m = A.messageries.find(item => item.motif.test(compteCree.email));
    $('[data-messagerie]').innerHTML = m ? `<a class="action action-principale" href="${m.lien}" target="_blank" rel="noopener"><span class="action-libelle">${t(`Ouvrir ${m.nom}`)}</span>${icon('external')}<span class="sr-only">(nouvel onglet)</span></a>` : '';
    const plusTard = $('[data-plus-tard]');
    plusTard.classList.toggle('action-principale', !m);
    plusTard.classList.toggle('action-secondaire', Boolean(m));
    $('#form-modifier').hidden = true;
  }
  function delaiRenvoi() {
    const lien = $('[data-renvoyer]');
    arreterRenvoi?.();
    lien.disabled = true;
    arreterRenvoi = Au.compte(30, reste => { lien.textContent = `Renvoyer le lien (${reste} s)`; }, () => {
      lien.disabled = false;
      lien.textContent = 'Renvoyer le lien';
    });
  }
  $('[data-renvoyer]').addEventListener('click', () => { V.toast('Nouveau lien envoyé.', 'mail'); delaiRenvoi(); });
  const emailModif = $('#in-email-modif');
  Au.surveillerEmail(emailModif);
  $('[data-modifier-email]').addEventListener('click', () => {
    $('#form-modifier').hidden = false;
    emailModif.value = compteCree.email;
    emailModif.focus();
    emailModif.select();
  });
  $('[data-annuler-modif]').addEventListener('click', () => { $('#form-modifier').hidden = true; $('[data-modifier-email]').focus(); });
  $('#form-modifier').addEventListener('submit', async event => {
    event.preventDefault();
    const bouton = $('.action-principale', event.currentTarget);
    Au.erreur(emailModif, Au.messageEmail(emailModif.value));
    if (Au.premierInvalide(event.currentTarget)) return;
    Au.occupe(bouton, true, 'Envoi…');
    await Au.attendre(700);
    Au.occupe(bouton, false);
    compteCree.email = emailModif.value.trim();
    rendreVerification();
    V.toast('Lien envoyé à la nouvelle adresse.', 'mail');
    delaiRenvoi();
  });
  $('[data-nouveau-lien]').addEventListener('click', () => { V.toast('Nouveau lien envoyé.', 'mail'); aller('verification'); });

  /* Compte prêt -------------------------------------------------------------- */

  function rendrePret() {
    $('[data-pret-titre]').textContent = V.typo(`Bienvenue, ${compteCree.pseudo}`);
    $('[data-profil-lien]').href = `profil.html?pseudo=${encodeURIComponent(compteCree.pseudo)}`;
  }

  /* Session déjà ouverte ------------------------------------------------------ */

  function rendreDeja() {
    const niveau = E.niveau();
    $('[data-qui]').innerHTML = `${V.avatarMoi(44)}<p><b>${t(E.MOI.nom)}</b><span>${t(`${niveau.nom} · ${V.fmt(niveau.points)} points`)}</span></p>`;
  }
  $('[data-autre-compte]').addEventListener('click', () => {
    changerEtat({ session: 'visiteur' });
    V.toast('Session fermée sur cet appareil.');
    aller('compte');
  });

  /* Navigation ---------------------------------------------------------------- */

  function simulerCompte(compte, service = null) {
    if (!cree) {
      cree = true;
      compteCree = { pseudo: tirerPseudo(), email: service ? A.services[service].email : Au.emailValide(email.value) ? email.value.trim() : 'clarisse.mendy@gmail.com', service };
    }
    changerEtat({ session: 'membre', role: 'membre', niveau: 'curieux', compte, notifications: 'lues' });
  }

  function aller(nom, options) {
    if (nom === 'compte' || nom === 'mot-de-passe') {
      if (E.membre() && !cree) { rendreDeja(); vues.afficher('deja', options); return; }
      if (cree) { cree = false; changerEtat({ session: 'visiteur' }); }
      if (nom === 'mot-de-passe') preparerMotDePasse();
      vues.afficher(nom, options || { focus: 'champ' });
      return;
    }
    if (nom === 'pseudo') { if (!cree) simulerCompte('email'); rendrePseudo(); vues.afficher('pseudo', options || { focus: 'titre' }); return; }
    if (nom === 'verification') { if (!cree || E.get().compte !== 'email') simulerCompte('email'); rendreVerification(); delaiRenvoi(); }
    if (nom === 'lien') { if (!cree) simulerCompte('email'); changerEtat({ compte: 'actif' }); }
    if (nom === 'lien-expire' && !cree) simulerCompte('email');
    if (nom === 'pret') { if (!cree) simulerCompte('actif', 'github'); rendrePret(); }
    vues.afficher(nom, options);
  }
  conteneur.addEventListener('click', event => {
    const cible = event.target.closest('[data-aller]');
    if (!cible) return;
    event.preventDefault();
    aller(cible.dataset.aller);
  });

  E.on((etat, changes) => {
    if (interne) return;
    if (changes.includes('session')) {
      if (!E.membre()) { cree = false; vues.afficher('compte', { focus: false }); return; }
      if (!cree && ['compte', 'mot-de-passe'].includes(vues.actuelle())) { rendreDeja(); vues.afficher('deja', { focus: false }); return; }
    }
    if (changes.includes('compte') && etat.compte === 'actif' && vues.actuelle() === 'verification') { aller('lien'); return; }
    if (vues.actuelle() === 'deja') rendreDeja();
  });

  /* Aide -------------------------------------------------------------------- */

  $('[data-aide]').addEventListener('click', () => {
    Au.aide([
      ['Pseudo', 'Un pseudo est proposé à la création du compte. Vous pouvez le garder, en tirer un autre ou le modifier : 3 à 30 caractères, lettres, chiffres et tirets.'],
      ['Mot de passe', 'Il se choisit après l’adresse e-mail et se saisit deux fois. 12 caractères minimum, sans autre règle ; les mots de passe présents dans des fuites de données connues sont refusés.'],
      ['Confirmation de l’adresse', 'Le lien reste valable 24 heures. Avant la confirmation, vous pouvez tout consulter ; publier, voter et répondre deviennent possibles ensuite.'],
      ['Google et GitHub', 'L’adresse fournie par le service est déjà vérifiée. Si elle appartient à un compte existant, rien n’est fusionné sans vous.']
    ], `<a class="action action-secondaire" href="connexion.html${ctx.requete ? `?${ctx.requete}` : ''}">J’ai déjà un compte</a>`);
  });

  /* Réglages ---------------------------------------------------------------- */

  function ecranInitial() {
    if (params.has('verifier')) return params.get('verifier') === 'expire' ? 'lien-expire' : 'lien';
    if (A.services[params.get('service')]) return 'service';
    return 'compte';
  }

  V.initTweaks({
    key: 'vysora-inscription-reglages',
    etats: [
      { name: 'ins-phase', legend: 'Phase', options: [['publique', 'Ouverture publique'], ['invitation', 'Bêta, lien d’invitation'], ['beta', 'Bêta, sans lien']] },
      { name: 'ins-ecran', legend: 'Écran', options: [['compte', 'Adresse e-mail'], ['mot-de-passe', 'Mot de passe'], ['pseudo', 'Pseudo proposé'], ['verification', 'Confirmation de l’e-mail'], ['lien', 'Lien ouvert'], ['pret', 'Compte prêt'], ['lien-expire', 'Lien expiré']] },
      { name: 'ins-resultat', legend: 'Résultat', options: [['succes', 'Réussite'], ['pseudo', 'Pseudo déjà pris'], ['email', 'Adresse déjà utilisée'], ['indisponible', 'Service indisponible']] },
      { name: 'ins-contexte', legend: 'Arrivée depuis', options: [['aucun', 'Sans page d’origine'], ['enregistrer', 'Enregistrer une création'], ['essai', 'Déclarer un essai'], ['bon-reflexe', 'Cas Bon réflexe'], ['defi', 'Défi en cours'], ['sujet', 'Sujet du forum'], ['publier', 'Nouvelle création']] }
    ],
    apparence: Au.APPARENCE,
    defaults: { 'ins-phase': 'publique', 'ins-ecran': 'compte', 'ins-resultat': 'succes', 'ins-contexte': 'aucun', ...Au.APPARENCE_DEFAUTS },
    onChange: (change, valeurs) => {
      reglages = valeurs;
      if (Au.REGLAGES_FOND.includes(change) || change === 'init') fond.maj();
      if (change === 'init') return;
      if (change === 'ins-contexte' || change === 'reset') { contexteSimule = change === 'reset' ? null : valeurs['ins-contexte']; rendreContexte(); }
      if (change === 'ins-phase' || change === 'reset') rendrePhase();
      if (change === 'ins-resultat' || change === 'reset') $$('[data-alerte]', conteneur).forEach(el => Au.alerte(el));
      if (change === 'ins-ecran' && valeurs['ins-ecran'] !== vues.actuelle()) aller(valeurs['ins-ecran']);
      if (change === 'reset') aller('compte');
    }
  });

  V.fixTypography(document.body);
  rendreContexte();
  rendrePhase();
  Au.demarrer();
  const premier = ecranInitial();
  if (premier === 'service') { simulerCompte('actif', params.get('service')); rendrePseudo(); vues.afficher('pseudo', { focus: false }); }
  else if (premier === 'compte' && E.membre()) { rendreDeja(); vues.afficher('deja', { focus: false }); }
  else aller(premier, { focus: false });
  const ecran = premier === 'service' ? 'pseudo' : premier;
  if (ecran !== reglages['ins-ecran']) V.regler('ins-ecran', ecran);
})();
