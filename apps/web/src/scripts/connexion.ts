/* Connexion (portée de prototype/connexion.js) : adresse e-mail et mot de passe sur un seul écran,
   vérification en deux étapes des comptes de modération et d'administration (SEC-02), nouvelles
   conditions, mot de passe oublié, nouveau mot de passe, puis retour à la page d'origine.
   Chaque action appelle l'API ; un même message d'erreur, que l'adresse possède un compte ou non. */

import {
  NOMS_SERVICES,
  estResultatService,
  estServiceExterne,
  type ActivationDeuxFacteursApi,
  type ConfigurationDeuxFacteursApi,
  type ConnexionReussie,
  type ResultatService,
  type ServiceExterne,
  type SessionApi,
} from '@vysora/shared';
import creerQr from 'qrcode-generator';
import { dateLongue } from '../lib/texte';
import { api } from './commun/api';
import { $, $$, corrigerTypographie, esc, icon, t, toast, typo } from './commun/outils';
import {
  aide,
  alerte,
  boutonMessagerie,
  cacherMotsDePasse,
  codeSixChiffres,
  compte,
  delaiDepart,
  demarrer,
  duree,
  erreur,
  jauge,
  libelle,
  logos,
  messageEmail,
  messageMotDePasse,
  motDePasse,
  occupe,
  passerEnVisiteur,
  premierInvalide,
  retablir,
  reussi,
  services,
  servicesOuverts,
  surveillerEmail,
  vues as creerVues,
} from './auth/commun';
import { fond as creerFond } from './auth/fond';

const ORDRE = [
  'identifiants',
  'deux-facteurs',
  'deux-facteurs-config',
  'deux-facteurs-secours',
  'documents',
  'succes',
  'deja',
  'oubli',
  'oubli-envoye',
  'lien-expire',
  'nouveau-mdp',
  'nouveau-ok',
];

const conteneur = $('[data-vues]');
const carte = $('[data-carte]');

if (conteneur && carte) {
  const form = $<HTMLFormElement>('#form-identifiants')!;
  const email = $<HTMLInputElement>('#cx-email')!;
  const mdp = $<HTMLInputElement>('#cx-mdp')!;
  const bouton = $<HTMLButtonElement>('.action-principale', form)!;
  const alerteEl = $('[data-alerte]', form);

  const destination = carte.dataset.destination ?? '/';
  const contexteActif = carte.dataset.contexteActif === 'oui';
  let echecs = 0;
  let arreterAttente: (() => void) | null = null;
  let arreterRenvoi: (() => void) | null = null;
  let depart: ReturnType<typeof setTimeout> | undefined;
  let session: ConnexionReussie | null = null;

  const fond = creerFond();
  const vues = creerVues(conteneur, {
    ordre: ORDRE,
    surAffichage: (nom) => {
      if (nom !== 'succes') {
        clearTimeout(depart);
        fond.annuler();
      }
    },
  });
  const prenom = () => session?.membre?.nom ?? '';
  const boutonContinuer = () =>
    `<a class="action action-principale" href="${encodeURI(destination)}"><span class="action-libelle">${t(contexteActif ? 'Reprendre où vous en étiez' : 'Continuer')}</span>${icon('arrow')}</a>`;
  const indisponible = (texte = 'La connexion est momentanément indisponible.') =>
    `<p><b>${t(texte)}</b> ${t('Réessayez dans quelques instants.')}</p>`;

  /* Identifiants -------------------------------------------------------------- */

  logos();
  const requete = carte.dataset.requete ?? '';
  services(alerteEl, { ouverts: servicesOuverts(carte), intention: 'connexion', requete });
  motDePasse(conteneur);
  surveillerEmail(email, () => {
    if (!arreterAttente) alerte(alerteEl);
  });
  mdp.addEventListener('input', () => {
    erreur(mdp);
    if (!arreterAttente) alerte(alerteEl);
  });

  /** F-03 : après 5 échecs consécutifs, la connexion attend le délai donné par l'API. */
  function bloquer(secondes: number): void {
    arreterAttente?.();
    bouton.disabled = true;
    alerte(
      alerteEl,
      `<p><b>${t('Trop de tentatives.')}</b> ${t('La connexion est suspendue quelques instants. Vous pouvez aussi')} <button class="lien" type="button" data-aller="oubli">${t('réinitialiser votre mot de passe')}</button>.</p>`,
    );
    arreterAttente = compte(
      secondes,
      (reste) => libelle(bouton, `Réessayer dans ${duree(reste)}`),
      () => {
        arreterAttente = null;
        echecs = 0;
        bouton.disabled = false;
        libelle(bouton, 'Se connecter');
        alerte(alerteEl);
      },
    );
  }

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (bouton.disabled) return;
    erreur(email, messageEmail(email.value));
    erreur(mdp, mdp.value ? '' : 'Indiquez votre mot de passe.');
    if (premierInvalide(form)) return;
    alerte(alerteEl);
    occupe(bouton, true, 'Connexion…');
    const reponse = await api<ConnexionReussie>('POST', '/api/v1/session', {
      email: email.value.trim(),
      motDePasse: mdp.value,
    });
    occupe(bouton, false);

    if (reponse.ok) {
      session = reponse.donnees;
      if (session.deuxFacteurs) {
        retablir(bouton);
        mdp.value = '';
        cacherMotsDePasse(conteneur!);
        deuxFacteurs(session.deuxFacteurs);
        return;
      }
      terminer(bouton);
      return;
    }
    const { probleme } = reponse;
    if (probleme.code === 'TROP_DE_REQUETES') {
      bloquer(probleme.reessayerDans ?? 30);
      return;
    }
    if (probleme.code === 'IDENTIFIANTS_INCORRECTS') {
      echecs += 1;
      const suite =
        echecs >= 2
          ? ` ${t('Vous pouvez aussi')} <button class="lien" type="button" data-aller="oubli">${t('réinitialiser votre mot de passe')}</button>.`
          : '';
      alerte(alerteEl, `<p><b>${t('Adresse e-mail ou mot de passe incorrect.')}</b>${suite}</p>`);
      mdp.select();
      mdp.focus();
      return;
    }
    if (probleme.code === 'VALIDATION' && probleme.erreurs) {
      erreur(email, probleme.erreurs.email ?? '');
      erreur(mdp, probleme.erreurs.motDePasse ?? '');
      premierInvalide(form);
      return;
    }
    if (probleme.code === 'INTERDIT') {
      alerte(alerteEl, `<p><b>${t(probleme.detail ?? probleme.title)}</b></p>`);
      return;
    }
    alerte(alerteEl, indisponible());
  });

  /* Après l'identification ------------------------------------------------------ */

  function terminer(boutonUtilise: HTMLButtonElement | null): void {
    mdp.value = '';
    cacherMotsDePasse(conteneur!);
    const compteAffiche = session?.etat.compte ?? 'actif';
    if (compteAffiche === 'conditions') {
      retablir(boutonUtilise);
      if (session?.conditionsDepuis)
        $('[data-mise-a-jour]')!.textContent = typo(
          `Mises à jour le ${dateLongue(session.conditionsDepuis)}.`,
        );
      void vues.afficher('documents');
      return;
    }
    if (session?.suppressionAnnulee) {
      retablir(boutonUtilise);
      succes('suppression');
      return;
    }
    if (compteAffiche !== 'actif') {
      retablir(boutonUtilise);
      succes(compteAffiche);
      return;
    }
    partir(boutonUtilise);
  }

  /* Le moment clé : le bouton confirme, l'anneau se ferme, puis le retour. */
  function partir(boutonUtilise: HTMLButtonElement | null): void {
    const complet = document.documentElement.dataset.motionEffective !== 'none';
    if (boutonUtilise) reussi(boutonUtilise, 'Connecté');
    setTimeout(
      () => {
        retablir(boutonUtilise);
        succes('depart');
        depart = setTimeout(() => location.assign(destination), delaiDepart());
      },
      boutonUtilise && complet ? 520 : 0,
    );
  }

  function succes(cas: string): void {
    const textes: Record<
      string,
      { titre: string; texte?: string; attente?: string; actions?: string }
    > = {
      depart: {
        titre: `Bon retour, ${prenom()}`,
        attente: `${$('[data-retour] span')?.textContent ?? 'Retour à l’accueil'}…`,
      },
      actif: { titre: `Bon retour, ${prenom()}`, actions: boutonContinuer() },
      email: {
        titre: `Bon retour, ${prenom()}`,
        texte:
          'Confirmez votre adresse e-mail pour publier, voter et répondre. Le lien reçu à l’inscription reste valable 24 heures.',
        actions: `${boutonContinuer()}<button class="action action-secondaire" type="button" data-renvoyer-confirmation>${t('Renvoyer le lien')}</button>`,
      },
      suspendu: {
        titre: 'Compte suspendu',
        texte: session?.suspensionJusqua
          ? `Jusqu’au ${dateLongue(session.suspensionJusqua)}, vous pouvez consulter Vysora et gérer vos paramètres.`
          : 'Vous pouvez consulter Vysora et gérer vos paramètres.',
        actions: `${boutonContinuer()}<a class="action action-secondaire" href="/notifications">${t('Voir la décision')}</a>`,
      },
      conditions: {
        titre: `Bon retour, ${prenom()}`,
        texte:
          'Votre compte reste en lecture seule jusqu’à l’acceptation des nouvelles conditions.',
        actions: `<button class="action action-principale" type="button" data-aller="documents">${t('Accepter les conditions')}</button><a class="action action-secondaire" href="${encodeURI(destination)}">${t('Continuer en lecture seule')}</a>`,
      },
      suppression: {
        titre: 'Votre compte est conservé',
        texte: session?.suppressionAnnulee
          ? `Votre reconnexion annule la demande de suppression du ${dateLongue(session.suppressionAnnulee)}.`
          : 'Votre reconnexion annule la demande de suppression.',
        actions: `${boutonContinuer()}<a class="action action-secondaire" href="/parametres">${t('Ouvrir les paramètres')}</a>`,
      },
    };
    const s = textes[cas] ?? textes.actif!;
    const vue = $('[data-vue="succes"]')!;
    $<SVGElement>('.moment', vue)!.style.display = cas === 'suspendu' ? 'none' : '';
    $('[data-picto-suspendu]', vue)!.hidden = cas !== 'suspendu';
    $('[data-succes-titre]')!.textContent = typo(s.titre);
    const texte = $('[data-succes-texte]')!;
    texte.hidden = !s.texte;
    texte.textContent = s.texte ? typo(s.texte) : '';
    const enAttente = $('[data-succes-attente]')!;
    enAttente.hidden = !s.attente;
    enAttente.textContent = s.attente ? typo(s.attente) : '';
    $('[data-succes-actions]')!.innerHTML = s.actions ?? '';
    void vues.afficher('succes');
    if (cas !== 'suspendu') fond.reussir();
  }

  /* Vérification en deux étapes (ENF-05, SEC-02) ---------------------------------- */

  const formCode = $<HTMLFormElement>('#form-code')!;
  const champCode = $<HTMLInputElement>('#cx-code')!;
  const secours = $<HTMLInputElement>('#cx-secours')!;
  const otp = codeSixChiffres($('[data-otp]', formCode)!, () => formCode.requestSubmit());
  let modeCode: 'appli' | 'secours' = 'appli';

  /** Écran demandé par l'API : saisir un code, ou activer la double authentification. */
  function deuxFacteurs(etat: NonNullable<SessionApi['deuxFacteurs']>): void {
    const libelleRole = etat.role === 'admin' ? 'Compte d’administration' : 'Compte de modération';
    for (const el of $$('[data-role-libelle]')) el.textContent = typo(libelleRole);
    if (etat.etape === 'verifier') {
      preparerCode();
      void vues.afficher('deux-facteurs', { focus: 'champ' });
      return;
    }
    $('[data-config-intro]')!.textContent = typo(
      `Votre compte donne accès ${etat.role === 'admin' ? 'à l’administration' : 'à la modération'}. À chaque connexion, un code de votre application d’authentification vous sera demandé.`,
    );
    void vues.afficher('deux-facteurs-config', { focus: 'titre' });
    void preparerConfiguration();
  }

  function preparerCode(): void {
    choisirModeCode('appli');
    otp.vider();
    secours.value = '';
    erreur(champCode);
    erreur(secours);
  }
  function choisirModeCode(mode: 'appli' | 'secours'): void {
    modeCode = mode;
    for (const champ of $$<HTMLElement>('[data-mode-code]', formCode))
      champ.hidden = champ.dataset.modeCode !== mode;
    $('[data-basculer-code]')!.textContent = typo(
      mode === 'appli' ? 'Utiliser un code de secours' : 'Utiliser l’application',
    );
    $('[data-code-intro]')!.textContent = typo(
      mode === 'appli'
        ? 'Saisissez le code affiché par votre application d’authentification.'
        : 'Saisissez l’un de vos codes de secours.',
    );
  }
  $('[data-basculer-code]')?.addEventListener('click', () => {
    choisirModeCode(modeCode === 'appli' ? 'secours' : 'appli');
    (modeCode === 'appli' ? champCode : secours).focus();
  });
  secours.addEventListener('input', () => {
    const brut = secours.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    secours.value = brut.length > 4 ? `${brut.slice(0, 4)}-${brut.slice(4)}` : brut;
    erreur(secours);
  });

  /** Session vérifiée : la suite habituelle (conditions, compte, départ). */
  function identiteConfirmee(nouvelle: SessionApi, action: HTMLButtonElement | null): void {
    session = { ...nouvelle, suppressionAnnulee: session?.suppressionAnnulee ?? null };
    terminer(action);
  }

  formCode.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const action = $<HTMLButtonElement>('.action-principale', formCode);
    if (action?.disabled) return;
    if (modeCode === 'appli')
      erreur(champCode, champCode.value.length === 6 ? '' : 'Saisissez les six chiffres du code.');
    else
      erreur(
        secours,
        /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(secours.value)
          ? ''
          : 'Saisissez un code au format ABCD-EFGH.',
      );
    if (premierInvalide(formCode)) return;
    occupe(action, true, 'Vérification…');
    const reponse = await api<SessionApi>(
      'POST',
      '/api/v1/session/deux-facteurs',
      modeCode === 'appli' ? { code: champCode.value } : { codeSecours: secours.value },
    );
    occupe(action, false);
    if (reponse.ok) {
      identiteConfirmee(reponse.donnees, action);
      return;
    }
    const { probleme } = reponse;
    if (probleme.code === 'VALIDATION' && probleme.erreurs) {
      if (modeCode === 'appli') {
        erreur(champCode, probleme.erreurs.code ?? 'Saisissez les six chiffres du code.');
        otp.vider();
      } else {
        erreur(secours, probleme.erreurs.codeSecours ?? 'Saisissez un code au format ABCD-EFGH.');
        secours.select();
      }
      premierInvalide(formCode);
      return;
    }
    if (probleme.code === 'TROP_DE_REQUETES') {
      toast('Trop de tentatives. Réessayez dans quelques minutes.', 'alert');
      return;
    }
    if (probleme.status === 401) {
      toast('Votre session a expiré. Connectez-vous de nouveau.', 'alert');
      passerEnVisiteur();
      void vues.afficher('identifiants', { focus: 'champ' });
      return;
    }
    toast('La vérification est momentanément indisponible. Réessayez dans un instant.', 'alert');
  });

  /* Activation : clé (code QR ou saisie à la main), premier code, codes de secours. */

  const formActivation = $<HTMLFormElement>('#form-activation')!;
  const champActivation = $<HTMLInputElement>('#cx-activation')!;
  const alerteActivation = $('[data-alerte]', formActivation);
  const otpActivation = codeSixChiffres($('[data-otp]', formActivation)!, () =>
    formActivation.requestSubmit(),
  );
  let cle = '';
  let codesSecours: string[] = [];

  /** Code QR dessiné en SVG (un tracé par module sombre), sans style en ligne (CSP). */
  function codeQr(adresse: string): string {
    const qr = creerQr(0, 'M');
    qr.addData(adresse);
    qr.make();
    const n = qr.getModuleCount();
    let trace = '';
    for (let ligne = 0; ligne < n; ligne += 1)
      for (let colonne = 0; colonne < n; colonne += 1)
        if (qr.isDark(ligne, colonne)) trace += `M${colonne} ${ligne}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${trace}"/></svg>`;
  }

  async function preparerConfiguration(): Promise<void> {
    otpActivation.vider();
    erreur(champActivation);
    alerte(alerteActivation);
    $('[data-qr]')!.innerHTML = '';
    $('[data-cle]')!.textContent = '';
    const reponse = await api<ConfigurationDeuxFacteursApi>(
      'POST',
      '/api/v1/session/deux-facteurs/configuration',
      {},
    );
    if (!reponse.ok) {
      alerte(
        alerteActivation,
        reponse.probleme.code === 'TROP_DE_REQUETES'
          ? `<p><b>${t('Trop de demandes.')}</b> ${t('Réessayez dans quelques minutes.')}</p>`
          : indisponible('La clé n’a pas pu être créée.'),
      );
      return;
    }
    cle = reponse.donnees.cle;
    $('[data-qr]')!.innerHTML = codeQr(reponse.donnees.adresse);
    $('[data-cle]')!.textContent = cle.replace(/(.{4})(?=.)/g, '$1 ');
  }

  async function copier(texte: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texte);
      toast(message, 'check');
    } catch {
      toast('La copie n’a pas abouti. Sélectionnez le texte pour le copier.', 'alert');
    }
  }
  $('[data-copier-cle]')?.addEventListener('click', () => void copier(cle, 'Clé copiée.'));

  formActivation.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const action = $<HTMLButtonElement>('.action-principale', formActivation);
    if (action?.disabled) return;
    erreur(
      champActivation,
      champActivation.value.length === 6 ? '' : 'Saisissez les six chiffres du code.',
    );
    if (premierInvalide(formActivation)) return;
    alerte(alerteActivation);
    occupe(action, true, 'Activation…');
    const reponse = await api<ActivationDeuxFacteursApi>(
      'PUT',
      '/api/v1/session/deux-facteurs/configuration',
      { code: champActivation.value },
    );
    occupe(action, false);
    if (reponse.ok) {
      codesSecours = reponse.donnees.codesSecours;
      session = {
        ...reponse.donnees.session,
        suppressionAnnulee: session?.suppressionAnnulee ?? null,
      };
      $('[data-codes]')!.innerHTML = codesSecours.map((code) => `<li>${t(code)}</li>`).join('');
      void vues.afficher('deux-facteurs-secours');
      return;
    }
    const { probleme } = reponse;
    if (probleme.code === 'VALIDATION' && probleme.erreurs?.code) {
      erreur(champActivation, probleme.erreurs.code);
      otpActivation.vider();
      premierInvalide(formActivation);
      return;
    }
    alerte(
      alerteActivation,
      probleme.code === 'TROP_DE_REQUETES'
        ? `<p><b>${t('Trop de tentatives.')}</b> ${t('Réessayez dans quelques minutes.')}</p>`
        : indisponible('L’activation est momentanément indisponible.'),
    );
  });

  const texteCodes = () =>
    `Codes de secours Vysora\n\nChaque code permet une connexion, une seule fois.\n\n${codesSecours.join('\n')}\n`;
  $('[data-copier-codes]')?.addEventListener(
    'click',
    () => void copier(codesSecours.join('\n'), 'Codes copiés.'),
  );
  $('[data-telecharger-codes]')?.addEventListener('click', () => {
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([texteCodes()], { type: 'text/plain;charset=utf-8' }));
    lien.download = 'vysora-codes-de-secours.txt';
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  });

  const formCodes = $<HTMLFormElement>('#form-codes')!;
  const gardes = $<HTMLInputElement>('#cx-codes-gardes')!;
  gardes.addEventListener('change', () => erreur(gardes));
  formCodes.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (!gardes.checked) {
      erreur(gardes, 'Cochez la case une fois les codes mis en lieu sûr.');
      premierInvalide(formCodes);
      return;
    }
    codesSecours = [];
    $('[data-codes]')!.innerHTML = '';
    terminer($<HTMLButtonElement>('.action-principale', formCodes));
  });

  /* Nouvelles conditions (F-04, WF-03) -------------------------------------------- */

  const formDocuments = $<HTMLFormElement>('#form-documents')!;
  const accord = $<HTMLInputElement>('#cx-accord')!;
  accord.addEventListener('change', () => erreur(accord));
  formDocuments.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const action = $<HTMLButtonElement>('.action-principale', formDocuments);
    const alerteDocuments = $('[data-alerte]', formDocuments);
    if (!accord.checked) {
      erreur(accord, 'Cochez la case pour accepter les nouvelles versions.');
      premierInvalide(formDocuments);
      return;
    }
    alerte(alerteDocuments);
    occupe(action, true, 'Enregistrement…');
    const reponse = await api<SessionApi>('POST', '/api/v1/moi/acceptations', { accepte: true });
    occupe(action, false);
    if (!reponse.ok) {
      alerte(alerteDocuments, indisponible('L’enregistrement est momentanément indisponible.'));
      return;
    }
    session = { ...reponse.donnees, suppressionAnnulee: null };
    accord.checked = false;
    partir(action);
  });
  $('[data-plus-tard]')?.addEventListener('click', () => succes('conditions'));

  /* Mot de passe oublié (F-03) : le même message, que le compte existe ou non. */

  const formOubli = $<HTMLFormElement>('#form-oubli')!;
  const oubliEmail = $<HTMLInputElement>('#cx-oubli-email')!;
  surveillerEmail(oubliEmail);

  async function demanderLien(adresse: string): Promise<boolean> {
    const reponse = await api('POST', '/api/v1/mot-de-passe/oubli', { email: adresse });
    if (reponse.ok) return true;
    if (reponse.probleme.code === 'TROP_DE_REQUETES')
      toast('Trop de demandes. Réessayez dans quelques minutes.', 'alert');
    else toast('L’envoi est momentanément indisponible. Réessayez dans un instant.', 'alert');
    return false;
  }

  formOubli.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const action = $<HTMLButtonElement>('.action-principale', formOubli);
    erreur(oubliEmail, messageEmail(oubliEmail.value));
    if (premierInvalide(formOubli)) return;
    occupe(action, true, 'Envoi…');
    const envoye = await demanderLien(oubliEmail.value.trim());
    occupe(action, false);
    if (envoye) lienEnvoye(oubliEmail.value.trim());
  });

  function lienEnvoye(adresse: string): void {
    $('[data-email-oubli]')!.textContent = adresse;
    $('[data-messagerie]')!.innerHTML = boutonMessagerie(adresse);
    void vues.afficher('oubli-envoye');
    delaiRenvoi();
  }
  function delaiRenvoi(): void {
    const lien = $<HTMLButtonElement>('[data-renvoyer-oubli]')!;
    arreterRenvoi?.();
    lien.disabled = true;
    arreterRenvoi = compte(
      30,
      (reste) => {
        lien.textContent = `Renvoyer le lien (${reste} s)`;
      },
      () => {
        lien.disabled = false;
        lien.textContent = 'Renvoyer le lien';
      },
    );
  }
  $('[data-renvoyer-oubli]')?.addEventListener('click', async () => {
    if (await demanderLien(oubliEmail.value.trim())) {
      toast('Nouveau lien envoyé.', 'mail');
      delaiRenvoi();
    }
  });

  /* Nouveau mot de passe (lien valable une heure) ------------------------------------ */

  const formNouveau = $<HTMLFormElement>('#form-nouveau')!;
  const nouveau = $<HTMLInputElement>('#cx-nouveau')!;
  const adresseLien = $<HTMLInputElement>('input[name="username"]', formNouveau)?.value ?? '';
  const jaugeNouveau = jauge(nouveau, () => ({ email: adresseLien }));
  formNouveau.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const action = $<HTMLButtonElement>('.action-principale', formNouveau);
    const alerteNouveau = $('[data-alerte]', formNouveau);
    erreur(nouveau, messageMotDePasse(jaugeNouveau.resultat()));
    if (premierInvalide(formNouveau)) return;
    alerte(alerteNouveau);
    occupe(action, true, 'Enregistrement…');
    const reponse = await api('PUT', '/api/v1/mot-de-passe', {
      jeton: $<HTMLInputElement>('input[name="jeton"]', formNouveau)?.value ?? '',
      motDePasse: nouveau.value,
    });
    occupe(action, false);
    if (!reponse.ok) {
      const { probleme } = reponse;
      if (probleme.code === 'LIEN_EXPIRE') void vues.afficher('lien-expire');
      else if (probleme.erreurs?.motDePasse) {
        erreur(nouveau, probleme.erreurs.motDePasse);
        premierInvalide(formNouveau);
      } else
        alerte(alerteNouveau, indisponible('L’enregistrement est momentanément indisponible.'));
      return;
    }
    nouveau.value = '';
    jaugeNouveau.maj();
    cacherMotsDePasse(conteneur);
    if (adresseLien) email.value = adresseLien;
    void vues.afficher('nouveau-ok');
  });

  /* Navigation entre les écrans --------------------------------------------------- */

  function aller(nom: string): void {
    if (nom === 'oubli' && email.value && !oubliEmail.value) oubliEmail.value = email.value;
    if (nom === 'identifiants') {
      void vues.afficher('identifiants', { focus: 'champ' });
      return;
    }
    void vues.afficher(nom, { focus: ['oubli', 'nouveau-mdp'].includes(nom) ? 'champ' : 'titre' });
  }
  conteneur.addEventListener('click', async (evenement) => {
    const cible = (evenement.target as Element).closest<HTMLElement>('[data-aller]');
    if (cible) {
      evenement.preventDefault();
      aller(cible.dataset.aller ?? 'identifiants');
      return;
    }
    const renvoyer = (evenement.target as Element).closest<HTMLButtonElement>(
      '[data-renvoyer-confirmation]',
    );
    if (renvoyer && !renvoyer.disabled) {
      renvoyer.disabled = true;
      const reponse = await api('POST', '/api/v1/comptes/verification/renvoi', {});
      renvoyer.disabled = false;
      toast(
        reponse.ok
          ? 'Lien de confirmation envoyé.'
          : 'L’envoi n’a pas abouti. Réessayez dans un instant.',
        reponse.ok ? 'mail' : 'alert',
      );
    }
  });

  /* Session déjà ouverte : « Changer de compte » ferme la session de cet appareil. */
  async function changerDeCompte(): Promise<void> {
    const reponse = await api('DELETE', '/api/v1/session');
    if (!reponse.ok && reponse.probleme.status !== 401) {
      toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'alert');
      return;
    }
    passerEnVisiteur();
    session = null;
    toast('Session fermée sur cet appareil.');
    void vues.afficher('identifiants', { focus: 'champ' });
  }
  for (const lien of $$('[data-autre-compte]'))
    lien.addEventListener('click', () => void changerDeCompte());

  /* Aide ------------------------------------------------------------------------ */

  $('[data-aide]')?.addEventListener('click', () => {
    const fenetre = aide(
      [
        [
          'Compte créé avec Google ou GitHub',
          'Utilisez le même bouton pour vous connecter : aucun mot de passe Vysora n’est nécessaire.',
        ],
        [
          'Mot de passe oublié',
          'Demandez un lien de réinitialisation. Il reste valable une heure.',
        ],
        [
          'Connexion suspendue',
          'Après cinq tentatives infructueuses, la connexion est suspendue quelques instants pour protéger votre compte.',
        ],
        [
          'Modération et administration',
          'La vérification en deux étapes est obligatoire pour ces comptes.',
        ],
      ],
      `<button class="action action-secondaire" type="button" data-aide-oubli>${t('Réinitialiser mon mot de passe')}</button>`,
    );
    $('[data-aide-oubli]', fenetre)?.addEventListener('click', () => {
      fenetre.close();
      aller('oubli');
    });
  });

  /* Retour de Google ou GitHub (S-10) ------------------------------------------------ */

  /** Pourquoi la connexion par le service n'a pas abouti (prototype/connexion.js). */
  function messageService(service: ServiceExterne, resultat: ResultatService): void {
    const nom = NOMS_SERVICES[service];
    const versInscription = `/inscription?service=${service}${requete ? `&${requete}` : ''}`;
    const messages: Partial<Record<ResultatService, [string, 'erreur' | 'info']>> = {
      'email-pris': [
        `<p><b>${t(`L’adresse de votre compte ${nom} appartient déjà à un compte Vysora.`)}</b> ${t(`Connectez-vous avec votre mot de passe, puis liez ${nom} depuis vos paramètres.`)}</p>`,
        'info',
      ],
      inconnu: [
        `<p><b>${t(`Aucun compte Vysora n’est associé à ce compte ${nom}.`)}</b></p><a class="action action-secondaire" href="${esc(versInscription)}">${t(`Créer un compte avec ${nom}`)}</a>`,
        'info',
      ],
      'email-non-verifie': [
        `<p><b>${t(`Votre compte ${nom} ne fournit aucune adresse e-mail vérifiée.`)}</b> ${t(`Vérifiez votre adresse chez ${nom}, ou utilisez votre adresse e-mail.`)}</p>`,
        'erreur',
      ],
      ferme: [
        `<p><b>${t('Ce compte a été fermé par la modération. Pour contester cette décision, écrivez-nous depuis la page Contact.')}</b></p>`,
        'erreur',
      ],
    };
    const [html, ton] = messages[resultat] ?? [
      `<p><b>${t(`La connexion avec ${nom} n’a pas abouti.`)}</b> ${t('Réessayez, ou utilisez votre adresse e-mail.')}</p>`,
      'erreur',
    ];
    alerte(alerteEl, html, ton);
    if (resultat === 'email-pris') email.focus();
  }

  /** Connexion ouverte par le service : même fin qu'après le mot de passe (conditions à accepter,
      suppression annulée, « Bon retour »). */
  async function terminerService(suppression: string | null): Promise<void> {
    const lue = await api<SessionApi>('GET', '/api/v1/session');
    if (!lue.ok || !lue.donnees.membre) {
      location.assign(destination);
      return;
    }
    session = {
      ...lue.donnees,
      suppressionAnnulee:
        suppression && /^\d{4}-\d{2}-\d{2}$/.test(suppression) ? suppression : null,
    };
    terminer(null);
  }

  const parametresRetour = new URLSearchParams(location.search);
  const serviceRetour = parametresRetour.get('service');
  if (estServiceExterne(serviceRetour)) {
    const resultat = parametresRetour.get('resultat');
    if (parametresRetour.get('etape') === 'connecte' && vues.actuelle() === 'succes')
      void terminerService(parametresRetour.get('suppression'));
    else if (estResultatService(resultat) && vues.actuelle() === 'identifiants')
      messageService(serviceRetour, resultat);
    // L'issue ne reste pas dans la barre d'adresse : recharger la page ne la rejoue pas.
    const adresse = new URL(location.href);
    for (const parametre of ['service', 'resultat', 'etape', 'suppression'])
      adresse.searchParams.delete(parametre);
    history.replaceState(null, '', adresse.pathname + adresse.search + adresse.hash);
  }

  /* Démarrage --------------------------------------------------------------------- */

  // Le jeton du lien ne reste pas dans la barre d'adresse (historique, partage d'écran).
  if (new URLSearchParams(location.search).has('jeton')) {
    const adresse = new URL(location.href);
    adresse.searchParams.delete('jeton');
    history.replaceState(null, '', adresse.pathname + adresse.search + adresse.hash);
  }
  if (location.hash === '#oubli' && vues.actuelle() === 'identifiants') aller('oubli');
  // Session ouverte dont l'identité reste à confirmer (écran choisi par le serveur).
  if (vues.actuelle() === 'deux-facteurs-config') void preparerConfiguration();
  corrigerTypographie(document.body);
  demarrer();
}
