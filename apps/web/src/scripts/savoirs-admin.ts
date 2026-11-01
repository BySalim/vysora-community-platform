/* Savoirs d'Apprendre dans l'administration (APP-03) : moments clés qui illustrent un savoir et sujet
   du forum lié. La création se désigne par son adresse ou son numéro, puis l'on choisit l'un de ses
   moments clés (ou la création seule, avec une note). Chaque changement se confirme ; l'API reste
   seule juge et ses refus s'affichent tels qu'elle les formule. */

import {
  erreursParChamp,
  schemaIllustrationSavoir,
  schemaSujetSavoir,
  type MomentsCreationApi,
} from '@vysora/shared';
import { MOMENTS } from '../lib/creations';
import { numeroDeContenu } from '../lib/guides-admin';
import {
  afficherErreurs,
  allerALElementVise,
  confirmer,
  erreursDuRefus,
  rechargerSur,
  signalerRefus,
} from './commun/administration';
import { api } from './commun/api';
import { $, $$, t } from './commun/outils';

allerALElementVise();

const titreDu = (element: Element) =>
  element.closest<HTMLElement>('[data-titre]')?.dataset.titre ?? '';
const extrait = (texte: string) => (texte.length > 90 ? `${texte.slice(0, 89)}…` : texte);

/* Moments clés ------------------------------------------------------------------------------- */

for (const form of $$<HTMLFormElement>('[data-ad-illustration]')) {
  const savoir = form.dataset.adIllustration ?? '';
  const champCreation = $<HTMLInputElement>('[data-ad-creation]', form)!;
  const zoneMoments = $('[data-ad-moments]', form)!;
  const liste = $<HTMLSelectElement>('select', zoneMoments)!;
  let lue: number | null = null;

  /** Les moments clés de la création désignée, proposés au choix. */
  async function chargerMoments(): Promise<boolean> {
    const numero = numeroDeContenu(champCreation.value);
    if (numero === null) {
      afficherErreurs(form, { creationId: 'Indiquez l’adresse ou le numéro de la création.' });
      return false;
    }
    if (numero === lue) return true;
    const reponse = await api<MomentsCreationApi>(
      'GET',
      `/api/v1/admin/creations/${numero}/moments`,
    );
    if (!reponse.ok) {
      lue = null;
      zoneMoments.hidden = true;
      afficherErreurs(form, { creationId: reponse.probleme.detail ?? reponse.probleme.title });
      return false;
    }
    lue = numero;
    afficherErreurs(form, {});
    const { moments } = reponse.donnees;
    liste.innerHTML = [
      ...moments.map(
        (m) =>
          `<option value="${m.id}">${t(`${MOMENTS[m.type].nature} : ${extrait(m.titre ?? m.texte)}`)}</option>`,
      ),
      `<option value="">${moments.length ? 'Aucun moment : la création seule, avec la note' : 'Cette création n’a pas de moment clé : la création seule, avec la note'}</option>`,
    ].join('');
    zoneMoments.hidden = false;
    return true;
  }
  champCreation.addEventListener('change', () => void chargerMoments());

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!(await chargerMoments())) return;
    const resultat = schemaIllustrationSavoir.safeParse({
      creationId: lue,
      momentId: liste.value ? Number(liste.value) : null,
      note: $<HTMLInputElement>('[name="note"]', form)?.value,
    });
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    const choix = liste.selectedOptions[0]?.textContent ?? '';
    confirmer(
      `Illustrer « ${titreDu(form)} » ?`,
      resultat.data.momentId
        ? `${choix}. Le moment clé apparaît dans « Vu dans la communauté », tant que la création reste publiée et visible.`
        : 'La création apparaît dans « Vu dans la communauté » avec votre note, tant qu’elle reste publiée et visible.',
      'Ajouter',
      async () => {
        const bouton = $<HTMLButtonElement>('button[type="submit"]', form);
        if (bouton) bouton.disabled = true;
        const reponse = await api(
          'POST',
          `/api/v1/admin/savoirs/${encodeURIComponent(savoir)}/illustrations`,
          resultat.data,
        );
        if (bouton) bouton.disabled = false;
        if (!reponse.ok) return afficherErreurs(form, erreursDuRefus(reponse.probleme));
        rechargerSur(`savoir-${savoir}`, 'Moment clé ajouté au savoir.');
      },
    );
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-illustration-retirer]')) {
  bouton.addEventListener('click', () => {
    const savoir = bouton.dataset.savoir ?? '';
    confirmer(
      `Retirer « ${bouton.dataset.nom ?? ''} » ?`,
      `Il n’illustre plus « ${titreDu(bouton)} ». La création elle-même ne change pas.`,
      'Retirer',
      async () => {
        bouton.disabled = true;
        const reponse = await api(
          'DELETE',
          `/api/v1/admin/illustrations-savoirs/${bouton.dataset.adIllustrationRetirer}`,
        );
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSur(`savoir-${savoir}`, 'Moment clé retiré du savoir.');
      },
    );
  });
}

/* Sujet du forum ----------------------------------------------------------------------------- */

for (const form of $$<HTMLFormElement>('[data-ad-sujet]')) {
  const savoir = form.dataset.adSujet ?? '';
  form.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const champ = $<HTMLInputElement>('[name="sujet"]', form)!;
    const resultat = schemaSujetSavoir.safeParse({ sujetId: numeroDeContenu(champ.value) ?? 0 });
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    afficherErreurs(form, {});
    confirmer(
      `Lier ce sujet à « ${titreDu(form)} » ?`,
      'Il apparaît dans « Pour aller plus loin », tant qu’il reste visible de tous. Un sujet déjà lié est remplacé.',
      'Lier le sujet',
      async () => {
        const bouton = $<HTMLButtonElement>('button[type="submit"]', form);
        if (bouton) bouton.disabled = true;
        const reponse = await api(
          'PUT',
          `/api/v1/admin/savoirs/${encodeURIComponent(savoir)}/sujet`,
          resultat.data,
        );
        if (bouton) bouton.disabled = false;
        if (!reponse.ok) return afficherErreurs(form, erreursDuRefus(reponse.probleme));
        rechargerSur(`savoir-${savoir}`, 'Sujet du forum lié au savoir.');
      },
    );
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-sujet-retirer]')) {
  bouton.addEventListener('click', () => {
    const savoir = bouton.dataset.adSujetRetirer ?? '';
    confirmer(
      `Retirer « ${bouton.dataset.nom ?? ''} » ?`,
      `« ${titreDu(bouton)} » ne propose plus de sujet du forum. Le sujet lui-même ne change pas.`,
      'Retirer le sujet',
      async () => {
        bouton.disabled = true;
        const reponse = await api(
          'DELETE',
          `/api/v1/admin/savoirs/${encodeURIComponent(savoir)}/sujet`,
        );
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSur(`savoir-${savoir}`, 'Sujet du forum retiré du savoir.');
      },
    );
  });
}
