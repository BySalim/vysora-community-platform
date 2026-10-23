/* Connexion (portée de prototype/connexion.js) : adresse e-mail et mot de passe sur un seul écran,
   nouvelles conditions, mot de passe oublié, nouveau mot de passe, puis retour à la page d'origine.
   Chaque action appelle l'API ; un même message d'erreur, que l'adresse possède un compte ou non. */

import type { ConnexionReussie, SessionApi } from '@vysora/shared';
import { dateLongue } from '../lib/texte';
import { api } from './commun/api';
import { $, corrigerTypographie, icon, t, toast, typo } from './commun/outils';
import {
  aide,
  alerte,
  boutonMessagerie,
  cacherMotsDePasse,
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
  servicesBientot,
  surveillerEmail,
  vues as creerVues,
} from './auth/commun';
import { fond as creerFond } from './auth/fond';

const ORDRE = [
  'identifiants',
  'deux-facteurs',
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
  servicesBientot(alerteEl);
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
  $('[data-autre-compte]')?.addEventListener('click', async () => {
    const reponse = await api('DELETE', '/api/v1/session');
    if (!reponse.ok && reponse.probleme.status !== 401) {
      toast('La déconnexion n’a pas abouti. Réessayez dans un instant.', 'alert');
      return;
    }
    passerEnVisiteur();
    toast('Session fermée sur cet appareil.');
    void vues.afficher('identifiants', { focus: 'champ' });
  });

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

  /* Démarrage --------------------------------------------------------------------- */

  // Le jeton du lien ne reste pas dans la barre d'adresse (historique, partage d'écran).
  if (new URLSearchParams(location.search).has('jeton')) {
    const adresse = new URL(location.href);
    adresse.searchParams.delete('jeton');
    history.replaceState(null, '', adresse.pathname + adresse.search + adresse.hash);
  }
  if (location.hash === '#oubli' && vues.actuelle() === 'identifiants') aller('oubli');
  corrigerTypographie(document.body);
  demarrer();
}
