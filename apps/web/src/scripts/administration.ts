/* Administration (ADM-01, ADM-02) : changement de rôle et réinitialisation de la double
   authentification après confirmation (F-96, RG-111, SEC-02), création de codes d'invitation
   (INV-01), défis (EC-24), outils et modèles d'IA (EC-22, RG-110). L'API reste seule juge : un refus
   (dernier administrateur, compte banni, nom déjà pris) s'affiche tel qu'elle le formule. */

import {
  erreursParChamp,
  schemaCreationInvitations,
  schemaDefi,
  schemaModele,
  schemaOutil,
  type MembreAdministreApi,
  type OutilAdministreApi,
  type Role,
} from '@vysora/shared';
import { api } from './commun/api';
import { dateCourte } from '../lib/texte';
import { $, $$, esc, messageApresChargement, t, toast, typo } from './commun/outils';

const LIBELLES_ROLE: Record<Role, string> = {
  MEMBRE: 'Membre',
  MODERATEUR: 'Modérateur',
  ADMINISTRATEUR: 'Administrateur',
};

const dialogue = $<HTMLDialogElement>('[data-ad-dialogue]');
let action: (() => Promise<void>) | null = null;

/** Fenêtre de confirmation ; « Confirmer » lance l'action. */
function confirmer(
  titre: string,
  texte: string,
  libelle: string,
  surConfirmation: () => Promise<void>,
) {
  if (!dialogue) return;
  $('[data-ad-dialogue-titre]', dialogue)!.textContent = typo(titre);
  $('[data-ad-dialogue-texte]', dialogue)!.textContent = typo(texte);
  $('[data-ad-confirmer]', dialogue)!.textContent = typo(libelle);
  action = surConfirmation;
  dialogue.showModal();
}
$('[data-ad-confirmer]', dialogue ?? document)?.addEventListener('click', () => {
  dialogue?.close();
  void action?.();
  action = null;
});
dialogue?.addEventListener('close', () => {
  // Annulé : les listes reprennent le rôle actuel.
  for (const liste of $$<HTMLSelectElement>('[data-ad-role]'))
    liste.value = liste.dataset.actuel ?? liste.value;
});

function signalerRefus(probleme: { status: number; detail?: string; title: string }): void {
  toast(
    probleme.status === 409 || probleme.status === 404
      ? (probleme.detail ?? probleme.title)
      : 'La modification n’a pas abouti. Réessayez dans un instant.',
    'alert',
  );
}

/** Erreurs d'un formulaire, chacune sous son champ (`data-ad-erreur`), « general » en dernier. */
function afficherErreurs(formulaire: HTMLFormElement, erreurs: Record<string, string>): void {
  for (const zone of $$<HTMLElement>('[data-ad-erreur]', formulaire)) {
    const message = erreurs[zone.dataset.adErreur ?? ''] ?? '';
    zone.textContent = typo(message);
    zone.hidden = !message;
    zone
      .closest('.ad-champ')
      ?.querySelector('input, select, textarea')
      ?.setAttribute('aria-invalid', String(Boolean(message)));
  }
}

/* Rôles ------------------------------------------------------------------------- */

for (const liste of $$<HTMLSelectElement>('[data-ad-role]')) {
  liste.addEventListener('change', () => {
    const membreId = Number(liste.closest<HTMLElement>('[data-ad-membre]')?.dataset.adMembre);
    const role = liste.value as Role;
    const nom = liste.dataset.nom ?? '';
    const texte =
      role === 'MEMBRE'
        ? `${nom} perd l’accès à la modération et à l’administration.`
        : `${nom} devra activer la vérification en deux étapes à sa prochaine connexion, puis la confirmer à chaque nouvel appareil.`;
    confirmer(`Donner le rôle « ${LIBELLES_ROLE[role]} » ?`, texte, 'Changer le rôle', async () => {
      liste.disabled = true;
      const reponse = await api<MembreAdministreApi>(
        'PUT',
        `/api/v1/admin/membres/${membreId}/role`,
        {
          role,
        },
      );
      liste.disabled = false;
      if (!reponse.ok) {
        liste.value = liste.dataset.actuel ?? liste.value;
        signalerRefus(reponse.probleme);
        return;
      }
      messageApresChargement(`Rôle de ${nom} : ${LIBELLES_ROLE[role]}.`);
      window.location.reload();
    });
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-reinitialiser]')) {
  bouton.addEventListener('click', () => {
    const membreId = Number(bouton.closest<HTMLElement>('[data-ad-membre]')?.dataset.adMembre);
    const nom = bouton.dataset.nom ?? '';
    confirmer(
      'Réinitialiser la vérification en deux étapes ?',
      `La clé et les codes de secours de ${nom} sont effacés. À sa prochaine connexion, ${nom} configure une nouvelle clé. À faire seulement après avoir vérifié son identité.`,
      'Réinitialiser',
      async () => {
        bouton.disabled = true;
        const reponse = await api('DELETE', `/api/v1/admin/membres/${membreId}/deux-facteurs`);
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        messageApresChargement(`Vérification en deux étapes de ${nom} réinitialisée.`);
        window.location.reload();
      },
    );
  });
}

/* Invitations ----------------------------------------------------------------------- */

const formInvitations = $<HTMLFormElement>('[data-ad-invitations]');
if (formInvitations) {
  const erreur = $('[data-ad-erreur]', formInvitations)!;
  const nombre = $<HTMLInputElement>('#ad-nombre', formInvitations)!;
  const jours = $<HTMLInputElement>('#ad-jours', formInvitations)!;
  const envoyer = $<HTMLButtonElement>('button[type="submit"]', formInvitations)!;
  let codes: string[] = [];

  formInvitations.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const resultat = schemaCreationInvitations.safeParse({
      nombre: nombre.value,
      joursValidite: jours.value || null,
    });
    const afficher = (message = '') => {
      erreur.textContent = typo(message);
      erreur.hidden = !message;
    };
    if (!resultat.success) {
      const erreurs = erreursParChamp(resultat.error);
      nombre.setAttribute('aria-invalid', String(Boolean(erreurs.nombre)));
      jours.setAttribute('aria-invalid', String(Boolean(erreurs.joursValidite)));
      afficher(erreurs.nombre ?? erreurs.joursValidite ?? '');
      return;
    }
    nombre.setAttribute('aria-invalid', 'false');
    jours.setAttribute('aria-invalid', 'false');
    afficher();
    envoyer.disabled = true;
    const reponse = await api<{ codes: string[] }>(
      'POST',
      '/api/v1/admin/invitations',
      resultat.data,
    );
    envoyer.disabled = false;
    if (!reponse.ok) {
      afficher(
        reponse.probleme.erreurs
          ? (Object.values(reponse.probleme.erreurs)[0] ?? '')
          : 'Les codes n’ont pas été créés. Réessayez dans un instant.',
      );
      return;
    }
    codes = reponse.donnees.codes;
    const zone = $('[data-ad-codes]')!;
    $('[data-ad-codes-liste]', zone)!.innerHTML = codes.map((code) => `<li>${code}</li>`).join('');
    zone.hidden = false;
    // Les nouveaux codes prennent place en tête de la liste.
    const corps = $('.ad-table tbody');
    if (corps) {
      const validiteJours = resultat.data.joursValidite;
      const validite = validiteJours
        ? `Jusqu’au ${dateCourte(new Date(Date.now() + validiteJours * 24 * 60 * 60_000))}`
        : 'Sans limite';
      corps.insertAdjacentHTML(
        'afterbegin',
        codes
          .map(
            (code) =>
              `<tr><td><code>${esc(code)}</code></td><td>${t(dateCourte(new Date()))}</td><td>${t(validite)}</td><td><span class="ad-etat is-libre">Libre</span></td></tr>`,
          )
          .join(''),
      );
    }
    toast(codes.length > 1 ? `${codes.length} codes créés.` : 'Code créé.');
  });

  $('[data-ad-copier]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      toast('Codes copiés.');
    } catch {
      toast('La copie n’a pas abouti. Sélectionnez les codes pour les copier.', 'alert');
    }
  });
}

/* Défis (EC-24) ------------------------------------------------------------------------ */

const QUESTIONS_DEFI = {
  publier: [
    'Publier ce défi ?',
    'Il apparaît sur la page Défis et, pendant sa période, sur l’accueil.',
    'Publier',
  ],
  annuler: [
    'Annuler ce défi ?',
    'Les participations sont fermées et le défi ne sera pas classé. Cette action est définitive.',
    'Annuler le défi',
  ],
  cloturer: [
    'Clôturer ce défi ?',
    'Le classement est figé, les points de participation et du podium sont crédités et chaque participant est prévenu. Cette action est définitive.',
    'Clôturer',
  ],
} as const;
const CHEMINS_DEFI = {
  publier: 'publication',
  annuler: 'annulation',
  cloturer: 'cloture',
} as const;
const MESSAGES_DEFI = {
  publier: 'Défi publié.',
  annuler: 'Défi annulé.',
  cloturer: 'Défi clôturé : le classement est publié.',
} as const;

for (const bouton of $$<HTMLButtonElement>('[data-ad-defi-action]')) {
  bouton.addEventListener('click', () => {
    const quoi = bouton.dataset.adDefiAction as keyof typeof QUESTIONS_DEFI;
    const [titre, texte, libelle] = QUESTIONS_DEFI[quoi];
    confirmer(titre, `« ${bouton.dataset.titre ?? ''} » : ${texte}`, libelle, async () => {
      bouton.disabled = true;
      const reponse = await api(
        'POST',
        `/api/v1/admin/defis/${bouton.dataset.adDefi}/${CHEMINS_DEFI[quoi]}`,
        {},
      );
      bouton.disabled = false;
      if (!reponse.ok) return signalerRefus(reponse.probleme);
      messageApresChargement(MESSAGES_DEFI[quoi]);
      window.location.reload();
    });
  });
}

const formDefi = $<HTMLFormElement>('[data-ad-defi-form]');
formDefi?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const valeur = (nom: string) =>
    $<HTMLInputElement | HTMLTextAreaElement>(`[name="${nom}"]`, formDefi)?.value.trim() ?? '';
  const saisie = {
    titre: valeur('titre'),
    enonce: valeur('enonce'),
    contraintes: valeur('contraintes') || null,
    dateDebut: valeur('dateDebut'),
    dateFin: valeur('dateFin'),
  };
  const afficher = (erreurs: Record<string, string>) => afficherErreurs(formDefi, erreurs);
  const resultat = schemaDefi.safeParse(saisie);
  if (!resultat.success) return afficher(erreursParChamp(resultat.error));
  afficher({});
  const envoyer = $<HTMLButtonElement>('button[type="submit"]', formDefi);
  if (envoyer) envoyer.disabled = true;
  const reponse = await api('POST', '/api/v1/admin/defis', saisie);
  if (envoyer) envoyer.disabled = false;
  if (!reponse.ok)
    return afficher(
      reponse.probleme.erreurs ?? {
        general: 'Le défi n’a pas été créé. Réessayez dans un instant.',
      },
    );
  messageApresChargement('Brouillon du défi créé. Publiez-le quand il est prêt.');
  window.location.reload();
});

/* Référentiels : outils et modèles d'IA (ADM-02, EC-22, F-95, RG-110) -------------------------- */

const SAISIES = 'les nouvelles créations, les sujets du forum, les cas et les essais';

/** Après un changement, la page se recharge sur l'outil concerné, ouvert. */
function rechargerSurOutil(outilId: number | string, message: string): void {
  messageApresChargement(message);
  history.replaceState(null, '', `#outil-${outilId}`);
  // Sinon le navigateur rend la position de défilement d'avant le rechargement.
  history.scrollRestoration = 'manual';
  window.location.reload();
}
const ouvert = /^#outil-\d+$/.test(location.hash) ? $<HTMLDetailsElement>(location.hash) : null;
if (ouvert) {
  ouvert.open = true;
  setTimeout(() => ouvert.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
}

/** Refus d'un ajout : sous les champs que l'API désigne, sinon sous le formulaire. */
const erreursDuRefus = (probleme: {
  status: number;
  detail?: string;
  title: string;
  erreurs?: Record<string, string>;
}): Record<string, string> =>
  probleme.erreurs ?? {
    general:
      probleme.status === 409 || probleme.status === 404
        ? (probleme.detail ?? probleme.title)
        : 'L’ajout n’a pas abouti. Réessayez dans un instant.',
  };

const formOutil = $<HTMLFormElement>('[data-ad-outil-form]');
formOutil?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const donnees = new FormData(formOutil);
  const resultat = schemaOutil.safeParse(Object.fromEntries(donnees));
  if (!resultat.success) return afficherErreurs(formOutil, erreursParChamp(resultat.error));
  afficherErreurs(formOutil, {});
  const envoyer = $<HTMLButtonElement>('button[type="submit"]', formOutil);
  if (envoyer) envoyer.disabled = true;
  const reponse = await api<OutilAdministreApi>('POST', '/api/v1/admin/outils', resultat.data);
  if (envoyer) envoyer.disabled = false;
  if (!reponse.ok) return afficherErreurs(formOutil, erreursDuRefus(reponse.probleme));
  rechargerSurOutil(
    reponse.donnees.id,
    `Outil « ${reponse.donnees.nom} » ajouté : ajoutez-lui ses modèles.`,
  );
});

for (const form of $$<HTMLFormElement>('[data-ad-modele-form]')) {
  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const outilId = form.dataset.adModeleForm ?? '';
    const resultat = schemaModele.safeParse(Object.fromEntries(new FormData(form)));
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    afficherErreurs(form, {});
    const envoyer = $<HTMLButtonElement>('button[type="submit"]', form);
    if (envoyer) envoyer.disabled = true;
    const reponse = await api<OutilAdministreApi>(
      'POST',
      `/api/v1/admin/outils/${outilId}/modeles`,
      resultat.data,
    );
    if (envoyer) envoyer.disabled = false;
    if (!reponse.ok) return afficherErreurs(form, erreursDuRefus(reponse.probleme));
    rechargerSurOutil(outilId, `Modèle « ${resultat.data.nom} » ajouté à ${reponse.donnees.nom}.`);
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-outil-statut]')) {
  bouton.addEventListener('click', () => {
    const outilId = bouton.dataset.adOutilStatut ?? '';
    const nom = bouton.dataset.nom ?? '';
    const archiver = bouton.dataset.statut === 'ARCHIVE';
    const utilisations = Number(bouton.dataset.utilisations) || 0;
    const garde = utilisations
      ? ` Les ${utilisations > 1 ? `${utilisations} contenus qui le citent l’affichent` : 'contenu qui le cite l’affiche'} toujours.`
      : '';
    confirmer(
      archiver ? `Archiver « ${nom} » ?` : `Proposer de nouveau « ${nom} » ?`,
      archiver
        ? `Il n’est plus proposé pour ${SAISIES}.${garde}`
        : `Il est de nouveau proposé pour ${SAISIES}.`,
      archiver ? 'Archiver' : 'Proposer de nouveau',
      async () => {
        bouton.disabled = true;
        const reponse = await api('PATCH', `/api/v1/admin/outils/${outilId}`, {
          statut: bouton.dataset.statut,
        });
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSurOutil(
          outilId,
          archiver ? `${nom} est archivé.` : `${nom} est de nouveau proposé.`,
        );
      },
    );
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-modele]')) {
  bouton.addEventListener('click', () => {
    const nom = bouton.dataset.nom ?? '';
    const retirer = bouton.dataset.statut === 'RETIRE';
    confirmer(
      retirer ? `Retirer « ${nom} » ?` : `Proposer de nouveau « ${nom} » ?`,
      retirer
        ? `Il n’est plus proposé pour ${SAISIES}, avec aucun des outils qui le comptent. Les contenus qui le citent l’affichent toujours.`
        : `Il est de nouveau proposé pour ${SAISIES}, avec les outils qui le comptent.`,
      retirer ? 'Retirer' : 'Proposer de nouveau',
      async () => {
        bouton.disabled = true;
        const reponse = await api('PATCH', `/api/v1/admin/modeles/${bouton.dataset.adModele}`, {
          statut: bouton.dataset.statut,
        });
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSurOutil(
          bouton.dataset.adOutil ?? '',
          retirer ? `${nom} est retiré.` : `${nom} est de nouveau proposé.`,
        );
      },
    );
  });
}
