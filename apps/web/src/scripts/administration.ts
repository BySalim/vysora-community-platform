/* Administration (ADM-01, ADM-02) : changement de rôle et réinitialisation de la double
   authentification après confirmation (F-96, RG-111, SEC-02), création de codes d'invitation
   (INV-01), défis (EC-24), versions des documents légaux (EC-25, RG-112). Référentiels :
   scripts/referentiels.ts. */

import {
  erreursParChamp,
  schemaCreationInvitations,
  schemaDefi,
  schemaVersionDocumentLegal,
  type MembreAdministreApi,
  type Role,
} from '@vysora/shared';
import { LIBELLES_ROLE } from '../lib/administration';
import {
  afficherErreurs,
  confirmer,
  dialogue,
  erreursDuRefus,
  signalerRefus,
} from './commun/administration';
import { api } from './commun/api';
import { dateCourte, dateLongue } from '../lib/texte';
import { $, $$, esc, messageApresChargement, t, toast, typo } from './commun/outils';

dialogue?.addEventListener('close', () => {
  // Annulé : les listes reprennent le rôle actuel.
  for (const liste of $$<HTMLSelectElement>('[data-ad-role]'))
    liste.value = liste.dataset.actuel ?? liste.value;
});

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

/* Documents légaux (EC-25, RG-112) ---------------------------------------------------------- */

const formDocument = $<HTMLFormElement>('[data-ad-document-form]');
formDocument?.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  const resultat = schemaVersionDocumentLegal.safeParse(
    Object.fromEntries(new FormData(formDocument)),
  );
  if (!resultat.success) return afficherErreurs(formDocument, erreursParChamp(resultat.error));
  afficherErreurs(formDocument, {});
  const choix = $<HTMLSelectElement>('[name="type"]', formDocument)?.selectedOptions[0];
  const nom = choix?.textContent?.trim() ?? '';
  const date = dateLongue(resultat.data.dateEffet);
  confirmer(
    `Publier la version du ${date} ?`,
    choix?.dataset.acceptation === 'true'
      ? `${nom} : à compter du ${date}, chaque membre accepte la nouvelle version avant de pouvoir de nouveau publier, commenter ou voter. Les membres en sont prévenus par e-mail ce jour-là.`
      : `${nom} : à compter du ${date}, la nouvelle version remplace la précédente. Les membres en sont prévenus par e-mail ce jour-là.`,
    'Publier la version',
    async () => {
      const envoyer = $<HTMLButtonElement>('button[type="submit"]', formDocument);
      if (envoyer) envoyer.disabled = true;
      const reponse = await api('POST', '/api/v1/admin/documents-legaux', resultat.data);
      if (envoyer) envoyer.disabled = false;
      if (!reponse.ok)
        return afficherErreurs(
          formDocument,
          erreursDuRefus(
            reponse.probleme,
            'La version n’a pas été publiée. Réessayez dans un instant.',
          ),
        );
      messageApresChargement(`Version du ${date} publiée.`);
      window.location.reload();
    },
  );
});

for (const bouton of $$<HTMLButtonElement>('[data-ad-document-retirer]')) {
  bouton.addEventListener('click', () => {
    const nom = bouton.dataset.nom ?? '';
    confirmer(
      'Retirer cette version ?',
      `${nom} : elle n’a pas encore pris effet et disparaît de l’historique. La version en vigueur reste appliquée.`,
      'Retirer la version',
      async () => {
        bouton.disabled = true;
        const reponse = await api(
          'DELETE',
          `/api/v1/admin/documents-legaux/${bouton.dataset.adDocumentRetirer}`,
        );
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        messageApresChargement('Version retirée.');
        window.location.reload();
      },
    );
  });
}
