/* Inscription (portée de prototype/inscription.js) : adresse e-mail, puis mot de passe ; le compte
   reçoit un pseudo tiré au hasard, que le membre garde ou modifie ; confirmation de l'adresse.
   Chaque étape appelle l'API : disponibilité de l'adresse et du pseudo, création du compte, renvoi
   du lien. Bêta fermée : code d'invitation (INV-01). Google et GitHub (S-10) : le compte est créé
   au retour du service, l'écran du pseudo montre l'identité fournie, puis « Bienvenue ». */

import {
  MOTIF_PSEUDO,
  NOMS_SERVICES,
  estResultatService,
  estServiceExterne,
  tirerPseudo,
  type DisponibiliteEmail,
  type DisponibilitePseudo,
  type LienEnvoye,
  type ResultatService,
  type ServiceExterne,
  type SessionApi,
} from '@vysora/shared';
import { ROUTES } from '../lib/navigation';
import { api } from './commun/api';
import { $, animations, corrigerTypographie, esc, icon, t, toast, typo } from './commun/outils';
import {
  aide,
  alerte,
  attendre,
  boutonMessagerie,
  cacherMotsDePasse,
  compte,
  demarrer,
  erreur,
  jauge,
  logos,
  messageEmail,
  messageMotDePasse,
  motDePasse,
  adresseDepart,
  identiteService,
  occupe,
  partirVers,
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
import { annoncerChangementCompte, surChangementCompte } from './commun/suivi-compte';

const ORDRE = [
  'compte',
  'mot-de-passe',
  'pseudo',
  'verification',
  'lien',
  'pret',
  'lien-expire',
  'deja',
];

const conteneur = $('[data-vues]');
const carte = $('[data-carte]');

if (conteneur && carte) {
  const form = $<HTMLFormElement>('#form-compte')!;
  const formMdp = $<HTMLFormElement>('#form-mdp')!;
  const formPseudo = $<HTMLFormElement>('#form-pseudo')!;
  const email = $<HTMLInputElement>('#in-email')!;
  const mdp = $<HTMLInputElement>('#in-mdp')!;
  const confirmation = $<HTMLInputElement>('#in-mdp-confirmation')!;
  const pseudoInput = $<HTMLInputElement>('#in-pseudo')!;
  const champCode = $<HTMLInputElement>('#in-code')!;
  const blocCode = $('[data-champ-code]');
  const versConnexion = $<HTMLAnchorElement>('[data-auth-lien="connexion"]')?.href ?? '/connexion';

  /** Compte créé pendant cette visite : son pseudo tiré, son adresse et, avec Google ou GitHub,
      le service et le compte utilisé (rendus par le serveur au retour du service). */
  let compteCree: {
    pseudo: string;
    email: string;
    service?: ServiceExterne;
    compte?: string;
  } | null = estServiceExterne(carte.dataset.serviceCree)
    ? {
        pseudo: carte.dataset.pseudoCree ?? '',
        email: carte.dataset.emailCree ?? '',
        service: carte.dataset.serviceCree,
        compte: carte.dataset.compteCree ?? '',
      }
    : null;
  let arreterRenvoi: (() => void) | null = null;

  const fond = creerFond();
  const vues = creerVues(conteneur, {
    ordre: ORDRE,
    surAffichage: (nom) => {
      if (['lien', 'pret'].includes(nom)) fond.reussir();
      else fond.annuler();
    },
  });
  if (['lien', 'pret'].includes(vues.actuelle() ?? '')) fond.reussir();

  const indisponible = (texte: string, suite = 'Réessayez dans quelques instants.') =>
    `<p><b>${t(texte)}</b> ${t(suite)}</p>`;
  const dejaInscrit = () =>
    `<p><b>${t('Vous avez peut-être déjà un compte.')}</b> ${t('Connectez-vous avec cette adresse, ou utilisez-en une autre.')}</p><a class="action action-secondaire" href="${esc(versConnexion)}">${t('Se connecter')}</a>`;

  /* Pseudo : tiré au hasard, format (RG-01), disponibilité et propositions ------------- */

  function champPseudo(input: HTMLInputElement) {
    const champ = input.closest<HTMLElement>('[data-champ-pseudo]')!;
    const aideEl = $('[data-pseudo-aide]', champ)!;
    const etatIcone = $('[data-pseudo-etat]', champ)!;
    const zone = $('[data-propositions]', champ)!;
    const annonce = $('[data-pseudo-annonce]', champ)!;
    const INDICE = aideEl.textContent ?? '';
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let etat = 'vide';
    let demande = 0;

    function afficherEtat(e: string): void {
      etatIcone.dataset.etat = e;
      etatIcone.innerHTML =
        e === 'libre' ? icon('check') : ['pris', 'invalide'].includes(e) ? icon('alert') : '';
    }
    function afficherPropositions(liste: string[]): void {
      zone.hidden = !liste.length;
      zone.innerHTML = liste.length
        ? `<span>Disponibles :</span>${liste.map((s) => `<button class="proposition" type="button" data-pseudo="${esc(s)}">${t(s)}</button>`).join('')}`
        : '';
    }
    /* L'indice n'apparaît que pendant la saisie d'un pseudo encore incomplet. */
    function indice(): void {
      aideEl.className = 'message indice';
      aideEl.textContent = INDICE;
      aideEl.hidden = !(document.activeElement === input && ['vide', 'court'].includes(etat));
    }
    function refuser(message: string, propositions: string[] = []): void {
      etat = 'pris';
      afficherEtat('pris');
      aideEl.hidden = true;
      erreur(input, message);
      afficherPropositions(propositions);
      annonce.textContent = propositions.length
        ? `${message} Des pseudos disponibles sont proposés.`
        : message;
    }

    /** Disponibilité demandée à l'API (RG-01 : unicité sans distinction de casse, pseudos réservés). */
    async function conclure(valeur: string): Promise<string> {
      const moi = ++demande;
      const reponse = await api<DisponibilitePseudo>(
        'GET',
        `/api/v1/pseudos/${encodeURIComponent(valeur)}/disponibilite`,
      );
      if (moi !== demande || input.value !== valeur) return etat;
      if (!reponse.ok) {
        etat = 'inconnu';
        afficherEtat('');
        return etat;
      }
      const { disponible, motif, propositions } = reponse.donnees;
      if (disponible) {
        etat = 'libre';
        afficherEtat('libre');
        aideEl.hidden = false;
        aideEl.className = 'message is-ok';
        aideEl.innerHTML = `${icon('check')}<span>Disponible</span>`;
        annonce.textContent = `${valeur} est disponible.`;
      } else if (motif === 'reserve') {
        refuser('Ce pseudo est réservé. Choisissez-en un autre.', propositions);
      } else if (motif === 'pris') {
        refuser('Ce pseudo est déjà pris.', propositions);
      } else {
        etat = 'invalide';
        afficherEtat('invalide');
        erreur(input, 'Utilisez uniquement des lettres, des chiffres et des tirets.');
      }
      return etat;
    }

    async function verifier({ immediat = false } = {}): Promise<string> {
      clearTimeout(minuterie);
      demande += 1;
      const v = input.value;
      const n = [...v].length;
      afficherPropositions([]);
      if (!v) {
        etat = 'vide';
        erreur(input);
        afficherEtat('');
        indice();
        return etat;
      }
      if (!/^[A-Za-z0-9_-]*$/.test(v)) {
        etat = 'invalide';
        afficherEtat('invalide');
        aideEl.hidden = true;
        erreur(input, 'Utilisez uniquement des lettres, des chiffres et des tirets.');
        return etat;
      }
      if (n < 3) {
        etat = 'court';
        afficherEtat('');
        if (immediat) {
          aideEl.hidden = true;
          erreur(input, 'Utilisez au moins 3 caractères.');
        } else {
          erreur(input);
          indice();
        }
        return etat;
      }
      erreur(input);
      if (!MOTIF_PSEUDO.test(v)) return etat;
      etat = 'verification';
      afficherEtat('verification');
      aideEl.hidden = true;
      if (immediat) return conclure(v);
      minuterie = setTimeout(() => void conclure(v), 450);
      return etat;
    }

    input.addEventListener('input', () => {
      const position = input.selectionStart;
      // Les espaces deviennent des tirets, les lettres accentuées perdent leur accent (RG-01).
      const propre = input.value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '-');
      if (propre !== input.value) {
        input.value = propre;
        input.setSelectionRange(position, position);
      }
      void verifier();
    });
    input.addEventListener('focus', () => {
      if (['vide', 'court'].includes(etat)) indice();
    });
    input.addEventListener('blur', () => {
      if (etat === 'court') void verifier({ immediat: true });
      else if (etat === 'vide') aideEl.hidden = true;
    });
    zone.addEventListener('click', (evenement) => {
      const bouton = (evenement.target as Element).closest<HTMLElement>('[data-pseudo]');
      if (!bouton) return;
      input.value = bouton.dataset.pseudo ?? '';
      void verifier({ immediat: true });
      input.focus();
    });

    return {
      async valider(): Promise<boolean> {
        const resultat = await verifier({ immediat: true });
        if (resultat === 'vide') {
          aideEl.hidden = true;
          erreur(input, 'Choisissez votre pseudo.');
        }
        return resultat === 'libre' || resultat === 'inconnu';
      },
      refuser,
      verifier,
    };
  }
  const pseudo = champPseudo(pseudoInput);

  const de = $<HTMLButtonElement>('[data-autre-pseudo]')!;
  de.addEventListener('click', () => {
    let tire = tirerPseudo();
    while (tire === pseudoInput.value) tire = tirerPseudo();
    pseudoInput.value = tire;
    void pseudo.verifier({ immediat: true });
    de.classList.toggle('is-tire');
    if (animations.completes())
      pseudoInput.animate(
        [
          { opacity: 0.2, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
      );
  });

  /* Étape 1 : l'adresse e-mail (F-01). Le compte n'est créé qu'avec le mot de passe. */

  logos();
  const requete = carte.dataset.requete ?? '';
  const ouverts = servicesOuverts(carte);
  motDePasse(conteneur);
  surveillerEmail(email, () => alerte($('[data-alerte]', form)));
  const jaugeMdp = jauge(mdp, () => ({ email: email.value }));

  /* Code d'invitation de la bêta fermée (INV-01, prototype : codeValide) : saisi, ou repris du lien. */
  let codeDuLien = $('[data-invitation]')?.dataset.code ?? '';
  const codeInvitation = () => codeDuLien || (blocCode && !blocCode.hidden ? champCode.value : '');
  champCode.addEventListener('input', () => {
    const brut = champCode.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 9);
    champCode.value = [brut.slice(0, 3), brut.slice(3, 7), brut.slice(7)].filter(Boolean).join('-');
    erreur(champCode);
  });
  function codeValide(): boolean {
    if (!blocCode || blocCode.hidden) return true;
    const ok = /^VYS-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(champCode.value);
    erreur(
      champCode,
      !champCode.value
        ? 'Saisissez votre code d’invitation.'
        : ok
          ? ''
          : 'Ce code est incomplet. Format : VYS-K7M2-Q9.',
    );
    if (!ok) champCode.focus();
    return ok;
  }

  /* Google et GitHub (F-02) : le code d'invitation se vérifie avant de partir vers le service. */
  const departService = (): Record<string, string> | null => {
    if (!codeValide()) return null;
    const code = codeInvitation();
    return code ? { invitation: code } : {};
  };
  services($('[data-alerte]', form), {
    ouverts,
    intention: 'inscription',
    requete,
    avant: departService,
  });

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const bouton = $<HTMLButtonElement>('.action-principale', form)!;
    const alerteEl = $('[data-alerte]', form);
    if (bouton.disabled) return;
    alerte(alerteEl);
    if (!codeValide()) return;
    erreur(email, messageEmail(email.value));
    if (premierInvalide(form)) return;
    occupe(bouton, true, 'Vérification…');
    const reponse = await api<DisponibiliteEmail>('POST', '/api/v1/comptes/disponibilite', {
      email: email.value.trim(),
    });
    occupe(bouton, false);
    if (reponse.ok && !reponse.donnees.disponible) {
      erreur(email, 'Cette adresse est déjà associée à un compte Vysora.');
      alerte(alerteEl, dejaInscrit(), 'info');
      email.focus();
      return;
    }
    if (!reponse.ok && reponse.probleme.code === 'TROP_DE_REQUETES') {
      alerte(alerteEl, indisponible('Trop de tentatives.', 'Réessayez dans quelques minutes.'));
      return;
    }
    // Service indisponible : l'adresse sera de nouveau contrôlée à la création du compte.
    aller('mot-de-passe');
  });

  /* Étape 2 : le mot de passe et sa confirmation (RG-04). */

  const confirmationEtat = $('[data-confirmation-etat]')!;
  const confirmationAnnonce = $('[data-confirmation-annonce]')!;
  function verifierConfirmation({ strict = false } = {}): boolean {
    const valeur = confirmation.value;
    const identique = Boolean(valeur) && valeur === mdp.value;
    confirmationEtat.dataset.etat = identique ? 'libre' : '';
    confirmationEtat.innerHTML = identique ? icon('check') : '';
    if (identique && confirmationAnnonce.textContent !== 'Les mots de passe correspondent.')
      confirmationAnnonce.textContent = 'Les mots de passe correspondent.';
    if (!identique) confirmationAnnonce.textContent = '';
    if (!valeur) erreur(confirmation, strict ? 'Confirmez votre mot de passe.' : '');
    else if (identique) erreur(confirmation);
    else
      erreur(
        confirmation,
        strict || [...valeur].length >= [...mdp.value].length
          ? 'Les mots de passe ne correspondent pas.'
          : '',
      );
    return identique;
  }
  confirmation.addEventListener('input', () => verifierConfirmation());
  confirmation.addEventListener('blur', () => {
    if (confirmation.value) verifierConfirmation({ strict: true });
  });
  mdp.addEventListener('input', () => {
    if (confirmation.value) verifierConfirmation();
  });

  formMdp.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const bouton = $<HTMLButtonElement>('.action-principale', formMdp)!;
    const alerteEl = $('[data-alerte]', formMdp);
    if (bouton.disabled) return;
    alerte(alerteEl);
    erreur(mdp, messageMotDePasse(jaugeMdp.resultat()));
    if (mdp.getAttribute('aria-invalid') !== 'true') verifierConfirmation({ strict: true });
    else erreur(confirmation);
    if (premierInvalide(formMdp)) return;
    occupe(bouton, true, 'Création du compte…');
    const reponse = await api<SessionApi>('POST', '/api/v1/comptes', {
      email: email.value.trim(),
      motDePasse: mdp.value,
      accepteConditions: true,
      ...(codeInvitation() ? { codeInvitation: codeInvitation() } : {}),
    });
    occupe(bouton, false);
    if (!reponse.ok) {
      const { probleme } = reponse;
      if (probleme.erreurs?.codeInvitation) {
        await vues.afficher('compte', { focus: false });
        if (blocCode?.hidden) {
          // Code du lien déjà utilisé : le champ apparaît pour en saisir un autre.
          codeDuLien = '';
          blocCode.hidden = false;
          $('[data-invitation]')?.setAttribute('hidden', '');
        }
        erreur(champCode, probleme.erreurs.codeInvitation);
        champCode.focus();
      } else if (probleme.erreurs?.email) {
        await vues.afficher('compte', { focus: false });
        erreur(email, probleme.erreurs.email);
        alerte($('[data-alerte]', form), dejaInscrit(), 'info');
        email.focus();
      } else if (probleme.erreurs?.motDePasse) {
        erreur(mdp, probleme.erreurs.motDePasse);
        premierInvalide(formMdp);
      } else if (probleme.code === 'TROP_DE_REQUETES') {
        alerte(alerteEl, indisponible('Trop de tentatives.', 'Réessayez dans quelques minutes.'));
      } else {
        alerte(
          alerteEl,
          indisponible(
            'La création du compte est momentanément indisponible.',
            'Vos informations sont conservées : réessayez dans quelques instants.',
          ),
        );
      }
      return;
    }
    reussi(bouton, 'Compte créé');
    await attendre(animations.niveau() === 'none' ? 0 : 520);
    retablir(bouton);
    creer(reponse.donnees);
  });

  function creer(session: SessionApi): void {
    compteCree = { pseudo: session.membre?.pseudo ?? '', email: email.value.trim() };
    mdp.value = '';
    confirmation.value = '';
    jaugeMdp.maj();
    verifierConfirmation();
    cacherMotsDePasse(conteneur!);
    aller('pseudo');
  }

  /* Pseudo du nouveau compte --------------------------------------------------------- */

  function rendrePseudo(): void {
    const identite = $('[data-identite]')!;
    const service = compteCree?.service;
    identite.hidden = !service;
    identite.innerHTML = service
      ? identiteService(service, compteCree?.email ?? '', compteCree?.compte ?? '')
      : '';
    $('[data-repere-cree]')!.hidden = Boolean(service);
    pseudoInput.value = compteCree?.pseudo ?? '';
    alerte($('[data-alerte]', formPseudo));
    void pseudo.verifier({ immediat: true });
  }

  formPseudo.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const bouton = $<HTMLButtonElement>('.action-principale', formPseudo)!;
    const alerteEl = $('[data-alerte]', formPseudo);
    if (bouton.disabled) return;
    alerte(alerteEl);
    occupe(bouton, true, 'Enregistrement…');
    const valide = await pseudo.valider();
    if (!valide) {
      occupe(bouton, false);
      premierInvalide(formPseudo);
      return;
    }
    const choisi = pseudoInput.value.trim();
    if (choisi !== compteCree?.pseudo) {
      const reponse = await api<SessionApi>('PATCH', '/api/v1/moi', { pseudo: choisi });
      if (!reponse.ok) {
        occupe(bouton, false);
        const message = reponse.probleme.erreurs?.pseudo;
        if (message) {
          pseudo.refuser(
            message === 'Ce pseudo est déjà pris.'
              ? 'Ce pseudo vient d’être pris. Choisissez-en un autre.'
              : message,
          );
          premierInvalide(formPseudo);
        } else
          alerte(
            alerteEl,
            indisponible('L’enregistrement du pseudo est momentanément indisponible.'),
          );
        return;
      }
      if (compteCree) compteCree.pseudo = choisi;
    }
    occupe(bouton, false);
    // L'adresse fournie par Google ou GitHub est déjà vérifiée : le compte est prêt.
    aller(compteCree?.service ? 'pret' : 'verification');
  });

  /* Compte prêt (Google et GitHub) ----------------------------------------------------- */

  function rendrePret(): void {
    const pseudoChoisi = compteCree?.pseudo ?? '';
    $('[data-pret-titre]')!.textContent = typo(`Bienvenue, ${pseudoChoisi}`);
    $<HTMLAnchorElement>('[data-profil-lien]')!.href = ROUTES.profil(pseudoChoisi);
  }

  /* Confirmation de l'adresse ------------------------------------------------------- */

  function rendreVerification(): void {
    const adresse = compteCree?.email ?? '';
    $('[data-email-envoye]')!.textContent = adresse;
    const messagerie = boutonMessagerie(adresse);
    $('[data-messagerie]')!.innerHTML = messagerie;
    const plusTard = $('[data-plus-tard]')!;
    plusTard.classList.toggle('action-principale', !messagerie);
    plusTard.classList.toggle('action-secondaire', Boolean(messagerie));
    $('#form-modifier')!.hidden = true;
  }
  function delaiRenvoi(): void {
    const lien = $<HTMLButtonElement>('[data-renvoyer]')!;
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
  $('[data-renvoyer]')?.addEventListener('click', async () => {
    const reponse = await api<LienEnvoye>('POST', '/api/v1/comptes/verification/renvoi', {});
    if (reponse.ok) {
      toast('Nouveau lien envoyé.', 'mail');
      delaiRenvoi();
    } else if (reponse.probleme.status === 409) aller('lien');
    else toast('L’envoi n’a pas abouti. Réessayez dans un instant.', 'alert');
  });

  const formModifier = $<HTMLFormElement>('#form-modifier')!;
  const emailModif = $<HTMLInputElement>('#in-email-modif')!;
  surveillerEmail(emailModif);
  $('[data-modifier-email]')?.addEventListener('click', () => {
    formModifier.hidden = false;
    emailModif.value = compteCree?.email ?? '';
    emailModif.focus();
    emailModif.select();
  });
  $('[data-annuler-modif]')?.addEventListener('click', () => {
    formModifier.hidden = true;
    $('[data-modifier-email]')?.focus();
  });
  formModifier.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const bouton = $<HTMLButtonElement>('.action-principale', formModifier);
    erreur(emailModif, messageEmail(emailModif.value));
    if (premierInvalide(formModifier)) return;
    occupe(bouton, true, 'Envoi…');
    const reponse = await api<SessionApi>('PATCH', '/api/v1/moi', {
      email: emailModif.value.trim(),
    });
    occupe(bouton, false);
    if (!reponse.ok) {
      const { probleme } = reponse;
      erreur(
        emailModif,
        probleme.erreurs?.email ??
          probleme.detail ??
          'L’envoi est momentanément indisponible. Réessayez dans un instant.',
      );
      premierInvalide(formModifier);
      return;
    }
    if (compteCree) compteCree.email = emailModif.value.trim();
    rendreVerification();
    toast('Lien envoyé à la nouvelle adresse.', 'mail');
    delaiRenvoi();
  });

  /* L'adresse confirmée dans un autre onglet : l'écran suit au retour sur celui-ci. */
  async function verifierConfirmationAdresse(): Promise<void> {
    if (vues.actuelle() !== 'verification' || document.hidden) return;
    const reponse = await api<SessionApi>('GET', '/api/v1/session');
    if (
      reponse.ok &&
      reponse.donnees.etat.session === 'membre' &&
      reponse.donnees.etat.compte !== 'email'
    )
      aller('lien');
  }
  document.addEventListener('visibilitychange', () => void verifierConfirmationAdresse());
  window.addEventListener('focus', () => void verifierConfirmationAdresse());
  // Confirmée dans un autre onglet de ce navigateur : l'écran suit aussitôt, sans attendre le retour.
  surChangementCompte(() => void verifierConfirmationAdresse());
  // Cet onglet vient de confirmer l'adresse (lien reçu par e-mail) : les autres onglets suivent.
  if (vues.actuelle() === 'lien') annoncerChangementCompte();

  /* Lien expiré : un nouveau lien part à l'adresse du compte. */
  $('[data-nouveau-lien]')?.addEventListener('click', async () => {
    const bouton = $<HTMLButtonElement>('[data-nouveau-lien]');
    const vue = $('[data-vue="lien-expire"]')!;
    const alerteEl = $('[data-alerte]', vue);
    alerte(alerteEl);
    occupe(bouton, true, 'Envoi…');
    const jeton = $<HTMLInputElement>('[data-jeton-verification]')?.value || undefined;
    const reponse = await api<LienEnvoye>('POST', '/api/v1/comptes/verification/renvoi', { jeton });
    occupe(bouton, false);
    if (reponse.ok) {
      compteCree = { pseudo: compteCree?.pseudo ?? '', email: reponse.donnees.email };
      toast('Nouveau lien envoyé.', 'mail');
      aller('verification');
      return;
    }
    if (reponse.probleme.status === 409) {
      aller('lien');
      return;
    }
    if (reponse.probleme.status === 401) {
      alerte(
        alerteEl,
        `<p><b>${t('Connectez-vous pour recevoir un nouveau lien.')}</b></p><a class="action action-secondaire" href="${esc(versConnexion)}">${t('Se connecter')}</a>`,
        'info',
      );
      return;
    }
    alerte(alerteEl, indisponible('L’envoi est momentanément indisponible.'));
  });

  /* Session déjà ouverte : « Créer un autre compte » ferme la session de cet appareil. */
  $('[data-autre-compte]')?.addEventListener('click', async () => {
    const reponse = await api('DELETE', '/api/v1/session');
    if (!reponse.ok && reponse.probleme.status !== 401) {
      toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'alert');
      return;
    }
    passerEnVisiteur();
    toast('Session fermée sur cet appareil.');
    aller('compte');
  });

  /* Navigation ------------------------------------------------------------------------ */

  function aller(nom: string): void {
    if (nom === 'mot-de-passe') {
      $('[data-email-rappel]')!.textContent = email.value.trim();
      $<HTMLInputElement>('[data-email-cache]')!.value = email.value.trim();
      alerte($('[data-alerte]', formMdp));
      void vues.afficher(nom, { focus: 'champ' });
      return;
    }
    if (nom === 'compte') {
      void vues.afficher(nom, { focus: 'champ' });
      return;
    }
    if (nom === 'pseudo') rendrePseudo();
    if (nom === 'pret') rendrePret();
    if (nom === 'verification') {
      rendreVerification();
      delaiRenvoi();
    }
    void vues.afficher(nom);
  }
  conteneur.addEventListener('click', (evenement) => {
    const cible = (evenement.target as Element).closest<HTMLElement>('[data-aller]');
    if (!cible) return;
    evenement.preventDefault();
    aller(cible.dataset.aller ?? 'compte');
  });

  /* Aide -------------------------------------------------------------------------------- */

  $('[data-aide]')?.addEventListener('click', () => {
    aide(
      [
        [
          'Pseudo',
          'Un pseudo est proposé à la création du compte. Vous pouvez le garder, en tirer un autre ou le modifier : 3 à 30 caractères, lettres, chiffres et tirets.',
        ],
        [
          'Mot de passe',
          'Il se choisit après l’adresse e-mail et se saisit deux fois. 12 caractères minimum, sans autre règle ; les mots de passe présents dans des fuites de données connues sont refusés.',
        ],
        [
          'Confirmation de l’adresse',
          'Le lien reste valable 24 heures. Avant la confirmation, vous pouvez tout consulter ; publier, voter et répondre deviennent possibles ensuite.',
        ],
        [
          'Google et GitHub',
          'L’adresse fournie par le service est déjà vérifiée. Si elle appartient à un compte existant, rien n’est fusionné sans vous.',
        ],
      ],
      `<a class="action action-secondaire" href="${esc(versConnexion)}">${t('J’ai déjà un compte')}</a>`,
    );
  });

  /* Retour de Google ou GitHub (S-10) --------------------------------------------------- */

  /** Pourquoi l'inscription par le service n'a pas abouti (prototype/inscription.js). */
  function messageService(service: ServiceExterne, resultat: ResultatService): void {
    const alerteEl = $('[data-alerte]', form);
    const nom = NOMS_SERVICES[service];
    if (resultat === 'invitation') {
      // Code du lien déjà utilisé, ou code saisi qui n'est plus valable : le champ le dit.
      if (blocCode?.hidden) {
        codeDuLien = '';
        blocCode.hidden = false;
        $('[data-invitation]')?.setAttribute('hidden', '');
      }
      erreur(
        champCode,
        'Ce code n’est pas valable. Vérifiez-le, ou demandez une nouvelle invitation.',
      );
      champCode.focus();
      return;
    }
    if (resultat === 'email-pris') {
      alerte(
        alerteEl,
        `<p><b>${t(`L’adresse de votre compte ${nom} appartient déjà à un compte Vysora.`)}</b> ${t(`Connectez-vous, puis liez ${nom} depuis vos paramètres.`)}</p><a class="action action-secondaire" href="${esc(versConnexion)}">${t('Se connecter')}</a>`,
        'info',
      );
      return;
    }
    if (resultat === 'email-non-verifie') {
      alerte(
        alerteEl,
        `<p><b>${t(`Votre compte ${nom} ne fournit aucune adresse e-mail vérifiée.`)}</b> ${t(`Vérifiez votre adresse chez ${nom}, ou utilisez votre adresse e-mail.`)}</p>`,
      );
      return;
    }
    alerte(
      alerteEl,
      `<p><b>${t(`L’inscription avec ${nom} n’a pas abouti.`)}</b> ${t('Réessayez, ou utilisez votre adresse e-mail.')}</p>`,
    );
  }

  const parametresRetour = new URLSearchParams(location.search);
  const serviceRetour = parametresRetour.get('service');
  if (estServiceExterne(serviceRetour)) {
    const resultat = parametresRetour.get('resultat');
    if (vues.actuelle() === 'pseudo' && compteCree) rendrePseudo();
    else if (vues.actuelle() === 'compte') {
      if (estResultatService(resultat)) messageService(serviceRetour, resultat);
      // « Créer un compte avec GitHub » depuis la connexion : départ direct, sauf si le code
      // d'invitation reste à saisir.
      else if (ouverts.includes(serviceRetour) && !parametresRetour.has('etape')) {
        if (blocCode && !blocCode.hidden) champCode.focus();
        else {
          const complement = departService();
          if (complement)
            partirVers(
              serviceRetour,
              adresseDepart(serviceRetour, 'inscription', complement, requete),
            );
        }
      }
    }
    // L'issue ne reste pas dans la barre d'adresse : recharger la page ne la rejoue pas.
    const adresse = new URL(location.href);
    for (const cle of ['service', 'resultat', 'etape']) adresse.searchParams.delete(cle);
    history.replaceState(null, '', adresse.pathname + adresse.search + adresse.hash);
  }

  /* Démarrage ----------------------------------------------------------------------------- */

  // Le jeton du lien ne reste pas dans la barre d'adresse (historique, partage d'écran).
  if (new URLSearchParams(location.search).has('verifier')) {
    const adresse = new URL(location.href);
    adresse.searchParams.delete('verifier');
    history.replaceState(null, '', adresse.pathname + adresse.search + adresse.hash);
  }
  corrigerTypographie(document.body);
  demarrer();
}
