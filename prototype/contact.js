'use strict';

/* Page Contact : point de contact unique de Vysora (questions, données
   personnelles, signalement d'un contenu illicite par toute personne,
   contestation d'une décision de modération). L'envoi est simulé ; le motif
   et l'adresse du contenu peuvent arriver par ?motif= et ?contenu=. */

(() => {
  const V = window.Vysora;
  const E = V.etats;
  const { $, t, icon } = V;
  const params = new URLSearchParams(location.search);

  const MOTIFS = {
    question: { message: 'Votre message', envoyer: 'Envoyer le message', suite: 'Nous vous répondons par e-mail dans les meilleurs délais.' },
    donnees: { message: 'Votre demande', envoyer: 'Envoyer la demande', suite: 'Nous vous répondons par e-mail dans un délai d’un mois au plus. Nous pouvons vous demander de justifier de votre identité.' },
    signalement: { message: 'Pourquoi ce contenu est-il illicite ?', envoyer: 'Envoyer le signalement', contenu: 'Adresse du contenu', aideContenu: 'Copiez l’adresse de la page où figure le contenu.', contenuRequis: true, bonneFoi: true, suite: 'La modération l’examine en visant un délai de 72 heures. Nous vous informerons par e-mail de la suite donnée.' },
    contestation: { message: 'Pourquoi contestez-vous cette décision ?', envoyer: 'Envoyer la contestation', contenu: 'Adresse du contenu ou référence de la décision', aideContenu: 'Elle figure dans la notification de la décision.', contenuRequis: false, suite: 'Un modérateur qui n’a pas pris la décision initiale l’examine. Nous vous répondons par e-mail sous 15 jours.' },
    autre: { message: 'Votre message', envoyer: 'Envoyer le message', suite: 'Nous vous répondons par e-mail dans les meilleurs délais.' }
  };
  const MIN_MESSAGE = 20;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const zone = $('[data-ct-zone]');
  const gabarit = zone.innerHTML;
  let settings = {};
  let envoi = null;

  const motifChoisi = form => (form.elements.motif.value || '');

  function adapter(form) {
    const m = MOTIFS[motifChoisi(form)] || MOTIFS.question;
    const motif = motifChoisi(form);
    const champContenu = $('[data-ct-contenu]', form);
    champContenu.hidden = !m.contenu;
    if (m.contenu) {
      $('[data-ct-contenu-label]', form).textContent = m.contenu;
      $('[data-ct-contenu-aide]', form).textContent = m.aideContenu;
      form.elements.contenu.required = Boolean(m.contenuRequis);
    }
    $('[data-ct-bonne-foi]', form).hidden = !m.bonneFoi;
    $('[data-ct-message-label]', form).textContent = m.message;
    $('[data-ct-envoyer-label]', form).textContent = motif ? m.envoyer : 'Envoyer le message';
    V.fixTypography(form);
  }

  function erreur(champ, idErreur, message) {
    const el = $(`#${idErreur}`);
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      champ?.removeAttribute('aria-invalid');
      return true;
    }
    el.innerHTML = `${icon('alert', '')}<span>${t(message)}</span>`;
    el.hidden = false;
    champ?.setAttribute('aria-invalid', 'true');
    return false;
  }

  function valider(form) {
    const motif = motifChoisi(form);
    const m = MOTIFS[motif];
    const f = form.elements;
    const resultats = [];
    resultats.push([f.motif[0], erreur(null, 'ct-motif-erreur', motif ? '' : 'Choisissez l’objet de votre message.')]);
    resultats.push([f.nom, erreur(f.nom, 'ct-nom-erreur', f.nom.value.trim() ? '' : 'Indiquez votre nom.')]);
    const email = f.email.value.trim();
    resultats.push([f.email, erreur(f.email, 'ct-email-erreur', !email ? 'Indiquez votre adresse e-mail.' : EMAIL.test(email) ? '' : 'Cette adresse e-mail est incomplète. Vérifiez-la.')]);
    if (m && m.contenu) {
      const url = f.contenu.value.trim();
      let msg = '';
      if (m.contenuRequis && !url) msg = 'Indiquez l’adresse du contenu à signaler.';
      else if (url && motif === 'signalement' && !/^https?:\/\/\S+$/.test(url)) msg = 'Cette adresse ne semble pas valide. Copiez-la depuis la barre d’adresse.';
      resultats.push([f.contenu, erreur(f.contenu, 'ct-contenu-erreur', msg)]);
    }
    const texte = f.message.value.trim();
    resultats.push([f.message, erreur(f.message, 'ct-message-erreur', !texte ? 'Écrivez votre message.' : texte.length < MIN_MESSAGE ? `Précisez votre message : ${MIN_MESSAGE} caractères au moins.` : '')]);
    if (m && m.bonneFoi) resultats.push([f.bonneFoi, erreur(f.bonneFoi, 'ct-bonne-foi-erreur', f.bonneFoi.checked ? '' : 'Cochez la déclaration pour envoyer le signalement.')]);
    const premier = resultats.find(([, ok]) => !ok);
    if (premier) premier[0].focus();
    return !premier;
  }

  const reference = () => `VYS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

  function afficherEnvoi() {
    const m = MOTIFS[envoi.motif] || MOTIFS.question;
    zone.innerHTML = `<div class="ct-envoye" tabindex="-1" data-ct-envoye>
        <span class="ct-envoye-icone" aria-hidden="true">${icon('check', '')}</span>
        <h2>${envoi.motif === 'signalement' ? 'Signalement envoyé' : envoi.motif === 'contestation' ? 'Contestation envoyée' : 'Message envoyé'}</h2>
        <p>Référence <b>${t(envoi.reference)}</b>. ${envoi.email ? `Un accusé de réception vient d’être envoyé à <b>${t(envoi.email)}</b>.` : 'Un accusé de réception vient de vous être envoyé par e-mail.'}</p>
        <p>${t(m.suite).replace(/(\d) (?=[a-zà-ÿ])/g, '$1 ')}</p>
        <button class="btn btn-secondary" type="button" data-ct-nouveau>Écrire un autre message</button>
      </div>`;
    V.fixTypography(zone);
  }

  function monterFormulaire(prerempli = {}) {
    zone.innerHTML = gabarit;
    const form = $('[data-ct-form]', zone);
    const motif = MOTIFS[prerempli.motif] ? prerempli.motif : '';
    if (motif) form.elements.motif.value = motif;
    if (prerempli.contenu) form.elements.contenu.value = prerempli.contenu;
    if (E.membre()) form.elements.nom.value = E.MOI.nom;
    adapter(form);
    form.addEventListener('change', event => {
      if (event.target.name === 'motif') { adapter(form); erreur(null, 'ct-motif-erreur', ''); }
      if (event.target.name === 'bonneFoi' && event.target.checked) erreur(event.target, 'ct-bonne-foi-erreur', '');
    });
    form.addEventListener('input', event => {
      const ids = { nom: 'ct-nom-erreur', email: 'ct-email-erreur', contenu: 'ct-contenu-erreur', message: 'ct-message-erreur' };
      if (ids[event.target.name] && event.target.getAttribute('aria-invalid')) erreur(event.target, ids[event.target.name], '');
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!valider(form)) return;
      envoi = { motif: motifChoisi(form), email: form.elements.email.value.trim(), reference: reference() };
      V.regler('envoi', 'envoye');
      $('[data-ct-envoye]')?.focus();
    });
  }

  zone.addEventListener('click', event => {
    if (!event.target.closest('[data-ct-nouveau]')) return;
    envoi = null;
    V.regler('envoi', 'saisie');
    $('[data-ct-form] input[name="motif"]')?.focus();
  });

  function rendre() {
    if (settings.envoi === 'envoye') {
      if (!envoi) envoi = { motif: MOTIFS[params.get('motif')] ? params.get('motif') : 'question', email: '', reference: reference() };
      afficherEnvoi();
    } else {
      monterFormulaire({ motif: params.get('motif'), contenu: params.get('contenu') });
    }
  }

  V.initTweaks({
    key: 'vysora-contact-reglages-v1',
    etats: [{ name: 'envoi', legend: 'Formulaire', options: [['saisie', 'À remplir'], ['envoye', 'Envoyé']] }],
    apparence: ['accent', 'density', 'motion'],
    defaults: { envoi: 'saisie' },
    onChange: (changed, next) => { settings = next; if (changed !== 'init') rendre(); }
  });
  rendre();
  E.on(() => { if (settings.envoi !== 'envoye') { const nom = $('#ct-nom'); if (nom && !nom.value && E.membre()) nom.value = E.MOI.nom; } });
  V.initHeader();
  V.fixTypography($('main'));
})();
