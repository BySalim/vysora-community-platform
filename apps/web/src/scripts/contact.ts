/* Page Contact (portée de prototype/contact.js) : le formulaire s'adapte à l'objet du message,
   se valide avec le même schéma que l'API, puis est envoyé à POST /api/v1/contact.
   Le motif et l'adresse du contenu peuvent arriver par ?motif= et ?contenu=. */

import {
  SUITE_CONTACT,
  erreursParChamp,
  estProblemeApi,
  schemaMessageContact,
  type MessageContactEnvoye,
  type MotifContact,
} from '@vysora/shared';
import { etats } from './commun/etats';
import { $, corrigerTypographie, icon, t, toast } from './commun/outils';

interface Motif {
  message: string;
  envoyer: string;
  contenu?: string;
  aideContenu?: string;
  contenuRequis?: boolean;
  bonneFoi?: boolean;
}

const MOTIFS: Record<string, Motif> = {
  question: { message: 'Votre message', envoyer: 'Envoyer le message' },
  donnees: { message: 'Votre demande', envoyer: 'Envoyer la demande' },
  signalement: {
    message: 'Pourquoi ce contenu est-il illicite ?',
    envoyer: 'Envoyer le signalement',
    contenu: 'Adresse du contenu',
    aideContenu: 'Copiez l’adresse de la page où figure le contenu.',
    contenuRequis: true,
    bonneFoi: true,
  },
  contestation: {
    message: 'Pourquoi contestez-vous cette décision ?',
    envoyer: 'Envoyer la contestation',
    contenu: 'Adresse du contenu ou référence de la décision',
    aideContenu: 'Elle figure dans la notification de la décision.',
    contenuRequis: false,
  },
  autre: { message: 'Votre message', envoyer: 'Envoyer le message' },
};

/** Champ du formulaire → identifiant de sa zone d'erreur. */
const ZONES_ERREUR: Record<string, string> = {
  motif: 'ct-motif-erreur',
  nom: 'ct-nom-erreur',
  email: 'ct-email-erreur',
  contenu: 'ct-contenu-erreur',
  message: 'ct-message-erreur',
  bonneFoi: 'ct-bonne-foi-erreur',
};

const parametres = new URLSearchParams(location.search);
const zone = $('[data-ct-zone]');

if (zone) {
  const gabarit = zone.innerHTML;
  let envoi: { motif: string; email: string; reference: string } | null = null;

  type Champs = HTMLFormControlsCollection & Record<string, HTMLInputElement & RadioNodeList>;
  const champs = (form: HTMLFormElement) => form.elements as Champs;
  const motifChoisi = (form: HTMLFormElement) => champs(form).motif.value || '';

  const adapter = (form: HTMLFormElement) => {
    const motif = motifChoisi(form);
    const m = MOTIFS[motif] ?? MOTIFS.question!;
    const champContenu = $('[data-ct-contenu]', form)!;
    champContenu.hidden = !m.contenu;
    if (m.contenu) {
      $('[data-ct-contenu-label]', form)!.textContent = m.contenu;
      $('[data-ct-contenu-aide]', form)!.textContent = m.aideContenu ?? '';
      champs(form).contenu.required = Boolean(m.contenuRequis);
    }
    $('[data-ct-bonne-foi]', form)!.hidden = !m.bonneFoi;
    $('[data-ct-message-label]', form)!.textContent = m.message;
    $('[data-ct-envoyer-label]', form)!.textContent = motif ? m.envoyer : 'Envoyer le message';
    corrigerTypographie(form);
  };

  const erreur = (champ: Element | null, idErreur: string, message: string): boolean => {
    const el = document.getElementById(idErreur);
    if (!el) return true;
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
  };

  /** Affiche les erreurs reçues (validation locale ou réponse de l'API) et place le focus sur la première. */
  const afficherErreurs = (form: HTMLFormElement, messages: Record<string, string>): boolean => {
    const f = champs(form);
    let premier: HTMLElement | null = null;
    for (const [nom, idErreur] of Object.entries(ZONES_ERREUR)) {
      const champ =
        nom === 'motif' ? null : ((f[nom] as unknown as HTMLElement | undefined) ?? null);
      const ok = erreur(champ, idErreur, messages[nom] ?? '');
      if (!ok && !premier) premier = nom === 'motif' ? (f.motif[0] as HTMLElement) : champ;
    }
    premier?.focus();
    return !premier;
  };

  const donnees = (form: HTMLFormElement) => {
    const f = champs(form);
    const motif = motifChoisi(form);
    return {
      motif: motif ? (motif.toUpperCase() as MotifContact) : undefined,
      nom: f.nom.value,
      email: f.email.value,
      contenu: MOTIFS[motif]?.contenu ? f.contenu.value : undefined,
      message: f.message.value,
      bonneFoi: f.bonneFoi.checked,
      siteWeb: f.siteWeb.value || undefined,
    };
  };

  const afficherEnvoi = () => {
    if (!envoi) return;
    const motif = envoi.motif.toUpperCase() as MotifContact;
    const suite = SUITE_CONTACT[motif] ?? SUITE_CONTACT.QUESTION;
    zone.innerHTML = `<div class="ct-envoye" tabindex="-1" data-ct-envoye>
        <span class="ct-envoye-icone" aria-hidden="true">${icon('check', '')}</span>
        <h2>${envoi.motif === 'signalement' ? 'Signalement envoyé' : envoi.motif === 'contestation' ? 'Contestation envoyée' : 'Message envoyé'}</h2>
        <p>Référence <b>${t(envoi.reference)}</b>. ${envoi.email ? `Un accusé de réception vient d’être envoyé à <b>${t(envoi.email)}</b>.` : 'Un accusé de réception vient de vous être envoyé par e-mail.'}</p>
        <p>${t(suite).replace(/(\d) (?=[a-zà-ÿ])/g, '$1 ')}</p>
        <button class="btn btn-secondary" type="button" data-ct-nouveau>Écrire un autre message</button>
      </div>`;
    corrigerTypographie(zone);
    $('[data-ct-envoye]', zone)?.focus();
  };

  const envoyer = async (form: HTMLFormElement) => {
    const saisie = donnees(form);
    const verification = schemaMessageContact.safeParse(saisie);
    if (!verification.success) {
      afficherErreurs(form, erreursParChamp(verification.error));
      return;
    }
    afficherErreurs(form, {});
    const bouton = $<HTMLButtonElement>('[data-ct-envoyer]', form)!;
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    try {
      const reponse = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(saisie),
      });
      const corps: unknown = await reponse.json().catch(() => null);
      if (reponse.ok) {
        envoi = {
          motif: motifChoisi(form),
          email: saisie.email.trim(),
          reference: (corps as MessageContactEnvoye).reference,
        };
        afficherEnvoi();
        return;
      }
      if (estProblemeApi(corps) && corps.erreurs) afficherErreurs(form, corps.erreurs);
      else
        toast(
          estProblemeApi(corps)
            ? corps.title
            : 'Le message n’a pas pu être envoyé. Réessayez dans un instant.',
          'alert',
        );
    } catch {
      toast(
        'Le message n’a pas pu être envoyé. Vérifiez votre connexion, puis réessayez.',
        'alert',
      );
    } finally {
      bouton.disabled = false;
      bouton.removeAttribute('aria-busy');
    }
  };

  const monterFormulaire = (prerempli: { motif?: string | null; contenu?: string | null } = {}) => {
    zone.innerHTML = gabarit;
    const form = $<HTMLFormElement>('[data-ct-form]', zone)!;
    const f = champs(form);
    const motif = prerempli.motif && MOTIFS[prerempli.motif] ? prerempli.motif : '';
    if (motif) f.motif.value = motif;
    if (prerempli.contenu) f.contenu.value = prerempli.contenu;
    const moi = etats.moi();
    if (moi && !f.nom.value) f.nom.value = moi.pseudo;
    adapter(form);
    form.addEventListener('change', (evenement) => {
      const cible = evenement.target as HTMLInputElement;
      if (cible.name === 'motif') {
        adapter(form);
        erreur(null, 'ct-motif-erreur', '');
      }
      if (cible.name === 'bonneFoi' && cible.checked) erreur(cible, 'ct-bonne-foi-erreur', '');
    });
    form.addEventListener('input', (evenement) => {
      const cible = evenement.target as HTMLInputElement;
      const idErreur = ZONES_ERREUR[cible.name];
      if (idErreur && cible.getAttribute('aria-invalid')) erreur(cible, idErreur, '');
    });
    form.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      void envoyer(form);
    });
  };

  zone.addEventListener('click', (evenement) => {
    if (!(evenement.target as Element).closest('[data-ct-nouveau]')) return;
    envoi = null;
    monterFormulaire();
    $<HTMLInputElement>('[data-ct-form] input[name="motif"]')?.focus();
  });

  monterFormulaire({ motif: parametres.get('motif'), contenu: parametres.get('contenu') });
  const principal = $('main');
  if (principal) corrigerTypographie(principal);
}
