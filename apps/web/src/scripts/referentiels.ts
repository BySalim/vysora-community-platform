/* Référentiels de l'administration (ADM-02, EC-22, F-95, RG-110) : outils et modèles d'IA,
   catégories, licences, étiquettes et badges. Chaque archivage se confirme ; après un changement, la
   page se recharge sur l'élément concerné. L'API reste seule juge : un refus (nom déjà pris, licence
   par défaut) s'affiche tel qu'elle le formule. */

import {
  erreursParChamp,
  schemaCategorie,
  schemaLicence,
  schemaModele,
  schemaModificationLicence,
  schemaOutil,
  type OutilAdministreApi,
} from '@vysora/shared';
import { afficherErreurs, confirmer, erreursDuRefus, signalerRefus } from './commun/administration';
import { api } from './commun/api';
import { $, $$, messageApresChargement } from './commun/outils';

/** Après un changement, la page se recharge sur l'élément concerné (ouvert s'il se déplie). */
function rechargerSur(ancre: string, message: string): void {
  messageApresChargement(message);
  history.replaceState(null, '', `${location.search}#${ancre}`);
  // Sinon le navigateur rend la position de défilement d'avant le rechargement.
  history.scrollRestoration = 'manual';
  window.location.reload();
}
const vise = /^#[a-z]+-\d+$/.test(location.hash) ? $<HTMLElement>(location.hash) : null;
if (vise) {
  if (vise instanceof HTMLDetailsElement) vise.open = true;
  setTimeout(() => vise.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);
}

/** Envoi d'un formulaire validé par son schéma ; les erreurs s'affichent sous chaque champ. */
async function envoyer<T>(
  formulaire: HTMLFormElement,
  methode: 'POST' | 'PUT',
  chemin: string,
  donnees: unknown,
  echec?: string,
): Promise<T | null> {
  afficherErreurs(formulaire, {});
  const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
  if (bouton) bouton.disabled = true;
  const reponse = await api<T>(methode, chemin, donnees);
  if (bouton) bouton.disabled = false;
  if (reponse.ok) return reponse.donnees;
  afficherErreurs(formulaire, erreursDuRefus(reponse.probleme, echec));
  return null;
}
const ECHEC_MODIFICATION = 'La modification n’a pas abouti. Réessayez dans un instant.';

/* Outils et modèles d'IA ----------------------------------------------------------------- */

const SAISIES = 'les nouvelles créations, les sujets du forum, les cas et les essais';

const formOutil = $<HTMLFormElement>('[data-ad-outil-form]');
formOutil?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const resultat = schemaOutil.safeParse(Object.fromEntries(new FormData(formOutil)));
  if (!resultat.success) return afficherErreurs(formOutil, erreursParChamp(resultat.error));
  const outil = await envoyer<OutilAdministreApi>(
    formOutil,
    'POST',
    '/api/v1/admin/outils',
    resultat.data,
  );
  if (outil)
    rechargerSur(`outil-${outil.id}`, `Outil « ${outil.nom} » ajouté : ajoutez-lui ses modèles.`);
});

for (const form of $$<HTMLFormElement>('[data-ad-modele-form]')) {
  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const outilId = form.dataset.adModeleForm ?? '';
    const resultat = schemaModele.safeParse(Object.fromEntries(new FormData(form)));
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    const outil = await envoyer<OutilAdministreApi>(
      form,
      'POST',
      `/api/v1/admin/outils/${outilId}/modeles`,
      resultat.data,
    );
    if (outil)
      rechargerSur(`outil-${outilId}`, `Modèle « ${resultat.data.nom} » ajouté à ${outil.nom}.`);
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
        rechargerSur(
          `outil-${outilId}`,
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
        rechargerSur(
          `outil-${bouton.dataset.adOutil ?? ''}`,
          retirer ? `${nom} est retiré.` : `${nom} est de nouveau proposé.`,
        );
      },
    );
  });
}

/* Catégories ------------------------------------------------------------------------------ */

for (const form of $$<HTMLFormElement>('[data-ad-categorie-form]')) {
  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const id = form.dataset.adCategorieForm;
    const resultat = schemaCategorie.safeParse(Object.fromEntries(new FormData(form)));
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    const categorie = id
      ? await envoyer<{ id: number }>(
          form,
          'PUT',
          `/api/v1/admin/categories/${id}`,
          resultat.data,
          ECHEC_MODIFICATION,
        )
      : await envoyer<{ id: number }>(form, 'POST', '/api/v1/admin/categories', resultat.data);
    if (categorie)
      rechargerSur(
        `categorie-${categorie.id}`,
        id
          ? `Catégorie « ${resultat.data.libelle} » modifiée.`
          : `Catégorie « ${resultat.data.libelle} » ajoutée.`,
      );
  });
}

/* Licences -------------------------------------------------------------------------------- */

for (const form of $$<HTMLFormElement>('[data-ad-licence-form]')) {
  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const id = form.dataset.adLicenceForm;
    const donnees = new FormData(form);
    const saisie = {
      ...Object.fromEntries(donnees),
      autoriseVariantes: donnees.has('autoriseVariantes'),
    };
    if (id) {
      const resultat = schemaModificationLicence.safeParse(saisie);
      if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
      const licence = await envoyer(
        form,
        'PUT',
        `/api/v1/admin/licences/${id}`,
        resultat.data,
        ECHEC_MODIFICATION,
      );
      if (licence) rechargerSur(`licence-${id}`, `Licence « ${resultat.data.libelle} » modifiée.`);
      return;
    }
    const resultat = schemaLicence.safeParse(saisie);
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    const licence = await envoyer<{ id: number }>(
      form,
      'POST',
      '/api/v1/admin/licences',
      resultat.data,
    );
    if (licence)
      rechargerSur(`licence-${licence.id}`, `Licence « ${resultat.data.libelle} » ajoutée.`);
  });
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-licence-defaut]')) {
  bouton.addEventListener('click', () => {
    const id = bouton.dataset.adLicenceDefaut ?? '';
    const nom = bouton.dataset.nom ?? '';
    confirmer(
      `Faire de « ${nom} » la licence par défaut ?`,
      'Elle est proposée aux auteurs qui ne choisissent pas de licence. Les créations déjà publiées gardent la leur.',
      'En faire la licence par défaut',
      async () => {
        bouton.disabled = true;
        const reponse = await api('POST', `/api/v1/admin/licences/${id}/defaut`, {});
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSur(`licence-${id}`, `${nom} est la licence par défaut.`);
      },
    );
  });
}

/* Archiver ou proposer de nouveau : catégories, licences, étiquettes ; badges ---------------- */

type Referentiel = 'categories' | 'licences' | 'etiquettes' | 'badges';

/** Titre, explication, libellé du bouton et message après le changement. */
function questions(
  referentiel: Referentiel,
  activer: boolean,
  nom: string,
  n: number,
): [string, string, string, string] {
  const plusieurs = n > 1;
  if (referentiel === 'badges')
    return activer
      ? [
          `Reprendre l’attribution de « ${nom} » ?`,
          'Les membres qui remplissent son critère l’obtiennent de nouveau, dans les cinq minutes.',
          'Reprendre l’attribution',
          `Attribution de « ${nom} » reprise.`,
        ]
      : [
          `Arrêter l’attribution de « ${nom} » ?`,
          `Plus aucun membre ne l’obtient, et il disparaît des prochains badges du profil.${n ? ` ${plusieurs ? `Les ${n} membres qui l’ont obtenu le gardent` : 'Le membre qui l’a obtenu le garde'}.` : ''}`,
          'Arrêter l’attribution',
          `Attribution de « ${nom} » arrêtée.`,
        ];
  const proposee = {
    categories: `aux auteurs ${activer ? 'et' : 'ni'} présentée dans Explorer`,
    licences: 'à la publication d’une création',
    etiquettes: 'aux membres',
  }[referentiel];
  const garde = !n
    ? ''
    : {
        categories: plusieurs
          ? ` Les ${n} contenus qui la citent l’affichent toujours.`
          : ' Le contenu qui la cite l’affiche toujours.',
        licences: plusieurs
          ? ` Les ${n} créations qui l’ont choisie la gardent.`
          : ' La création qui l’a choisie la garde.',
        etiquettes: plusieurs
          ? ` Les ${n} contenus qui la portent la gardent.`
          : ' Le contenu qui la porte la garde.',
      }[referentiel];
  return activer
    ? [
        `Proposer de nouveau « ${nom} » ?`,
        `Elle est de nouveau proposée ${proposee}.`,
        'Proposer de nouveau',
        `« ${nom} » est de nouveau proposée.`,
      ]
    : [
        `Archiver « ${nom} » ?`,
        `Elle n’est plus proposée ${proposee}.${garde}`,
        'Archiver',
        `« ${nom} » est archivée.`,
      ];
}

const ANCRES: Record<Referentiel, string> = {
  categories: 'categorie',
  licences: 'licence',
  etiquettes: 'etiquette',
  badges: 'badge',
};

for (const bouton of $$<HTMLButtonElement>('[data-ad-activer]')) {
  bouton.addEventListener('click', () => {
    const referentiel = bouton.dataset.adActiver as Referentiel;
    const id = bouton.dataset.adId ?? '';
    const actif = bouton.dataset.actif === 'true';
    const [titre, texte, libelle, message] = questions(
      referentiel,
      actif,
      bouton.dataset.nom ?? '',
      Number(bouton.dataset.utilisations) || 0,
    );
    confirmer(titre, texte, libelle, async () => {
      bouton.disabled = true;
      const reponse = await api('PATCH', `/api/v1/admin/${referentiel}/${id}`, { actif });
      bouton.disabled = false;
      if (!reponse.ok) return signalerRefus(reponse.probleme);
      rechargerSur(`${ANCRES[referentiel]}-${id}`, message);
    });
  });
}
