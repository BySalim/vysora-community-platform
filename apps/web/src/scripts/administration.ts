/* Administration (ADM-01) : changement de rôle et réinitialisation de la double authentification
   après confirmation (F-96, RG-111, SEC-02), création de codes d'invitation (INV-01). L'API reste
   seule juge : un refus (dernier administrateur, compte banni) s'affiche tel qu'elle le formule. */

import {
  erreursParChamp,
  schemaCreationInvitations,
  type MembreAdministreApi,
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
