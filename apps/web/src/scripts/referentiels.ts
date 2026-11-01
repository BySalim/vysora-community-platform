/* Référentiels de l'administration (ADM-02, EC-22, F-95, RG-110) : outils et modèles d'IA, éditeurs,
   catégories, licences et leur ordre d'affichage, étiquettes et badges. Chaque archivage, chaque
   nouveau nom d'éditeur et chaque nouvel ordre se confirme ; après un changement, la page se
   recharge sur l'élément concerné. L'API reste seule juge : un refus (nom déjà pris, licence par
   défaut, éditeur archivé) s'affiche tel qu'elle le formule. */

import {
  erreursParChamp,
  schemaCategorie,
  schemaLicence,
  schemaModele,
  schemaModificationLicence,
  schemaNomEditeur,
  schemaOutil,
  type OutilAdministreApi,
} from '@vysora/shared';
import {
  afficherErreurs,
  allerALElementVise,
  confirmer,
  erreursDuRefus,
  rechargerSur,
  signalerRefus,
} from './commun/administration';
import { api } from './commun/api';
import { $, $$, typo } from './commun/outils';

allerALElementVise();

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

/* Éditeurs -------------------------------------------------------------------------------- */

for (const form of $$<HTMLFormElement>('[data-ad-editeur-form]')) {
  form.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const id = form.dataset.adEditeurForm ?? '';
    const avant = form.dataset.nom ?? '';
    const resultat = schemaNomEditeur.safeParse(Object.fromEntries(new FormData(form)));
    if (!resultat.success) return afficherErreurs(form, erreursParChamp(resultat.error));
    const { nom } = resultat.data;
    if (nom === avant) return afficherErreurs(form, { nom: 'Saisissez le nouveau nom.' });
    afficherErreurs(form, {});
    confirmer(
      `Renommer « ${avant} » en « ${nom} » ?`,
      'Le nouveau nom s’affiche partout où l’éditeur apparaît : dans les saisies, sur les contenus qui citent ses outils et dans l’administration.',
      'Renommer',
      async () => {
        const editeur = await envoyer(
          form,
          'PUT',
          `/api/v1/admin/editeurs/${id}`,
          { nom },
          ECHEC_MODIFICATION,
        );
        if (editeur) rechargerSur(`editeur-${id}`, `« ${avant} » s’appelle désormais « ${nom} ».`);
      },
    );
  });
}

/** Ce que l'archivage retire des saisies : « ses 2 outils proposés sont archivés et son modèle
    proposé est retiré ». */
function retraitEditeur(outils: number, modeles: number): string {
  const parties = [
    outils === 1
      ? 'son outil proposé est archivé'
      : outils > 1
        ? `ses ${outils} outils proposés sont archivés`
        : '',
    modeles === 1
      ? 'son modèle proposé est retiré'
      : modeles > 1
        ? `ses ${modeles} modèles proposés sont retirés, y compris avec les outils d’autres éditeurs`
        : '',
  ].filter(Boolean);
  if (!parties.length) return '';
  const phrase = parties.join(' et ');
  return ` ${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} ; les contenus qui les citent les affichent toujours. Le proposer de nouveau ne les rétablit pas : chacun se propose de nouveau à part.`;
}

for (const bouton of $$<HTMLButtonElement>('[data-ad-editeur-statut]')) {
  bouton.addEventListener('click', () => {
    const id = bouton.dataset.adEditeurStatut ?? '';
    const nom = bouton.dataset.nom ?? '';
    const actif = bouton.dataset.actif === 'true';
    confirmer(
      actif ? `Proposer de nouveau « ${nom} » ?` : `Archiver « ${nom} » ?`,
      actif
        ? 'Il est de nouveau proposé pour un nouvel outil. Ses outils et ses modèles restent archivés ou retirés : proposez de nouveau ceux qui doivent l’être, dans l’onglet Outils et modèles.'
        : `Il n’est plus proposé pour un nouvel outil.${retraitEditeur(
            Number(bouton.dataset.outils) || 0,
            Number(bouton.dataset.modeles) || 0,
          )}`,
      actif ? 'Proposer de nouveau' : 'Archiver',
      async () => {
        bouton.disabled = true;
        const reponse = await api('PATCH', `/api/v1/admin/editeurs/${id}`, { actif });
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        rechargerSur(
          `editeur-${id}`,
          actif ? `${nom} est de nouveau proposé.` : `${nom} est archivé.`,
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

/* Ordre d'affichage des catégories et des licences ------------------------------------------- */

const ORDRES = {
  categories: [
    'Les domaines s’affichent dans cet ordre dans Explorer et sur l’accueil, et les catégories sont proposées aux auteurs dans cet ordre.',
    'Ordre des catégories enregistré.',
  ],
  licences: [
    'Les licences sont proposées dans cet ordre à la publication d’une création.',
    'Ordre des licences enregistré.',
  ],
} as const;

for (const bloc of $$<HTMLElement>('[data-ad-ordre]')) {
  const referentiel = bloc.dataset.adOrdre as keyof typeof ORDRES;
  const liste = $<HTMLOListElement>('[data-ad-ordre-liste]', bloc)!;
  const enregistrer = $<HTMLButtonElement>('[data-ad-ordre-enregistrer]', bloc)!;
  const retablir = $<HTMLButtonElement>('[data-ad-ordre-annuler]', bloc)!;
  const etat = $('[data-ad-ordre-etat]', bloc)!;
  const annonce = $('[data-ad-ordre-annonce]', bloc)!;
  const elements = () => $$<HTMLLIElement>(':scope > li', liste);
  const ids = () => elements().map((li) => Number(li.dataset.id));
  const enregistre = ids();
  const consigne = etat.textContent ?? '';

  /** Rangs, bouts de liste et boutons d'enregistrement d'après l'ordre affiché. */
  const actualiser = () => {
    const lignes = elements();
    lignes.forEach((li, rang) => {
      $('.ad-ordre-rang', li)!.textContent = String(rang + 1);
      $<HTMLButtonElement>('[data-ad-monter]', li)!.disabled = rang === 0;
      $<HTMLButtonElement>('[data-ad-descendre]', li)!.disabled = rang === lignes.length - 1;
    });
    const modifie = ids().some((id, rang) => id !== enregistre[rang]);
    enregistrer.disabled = !modifie;
    retablir.disabled = !modifie;
    etat.textContent = modifie ? 'Nouvel ordre à enregistrer.' : consigne;
  };

  liste.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLButtonElement>(
      '[data-ad-monter], [data-ad-descendre]',
    );
    const li = bouton?.closest('li');
    if (!bouton || !li) return;
    const monter = bouton.hasAttribute('data-ad-monter');
    const voisin = monter ? li.previousElementSibling : li.nextElementSibling;
    if (!voisin) return;
    if (monter) voisin.before(li);
    else voisin.after(li);
    actualiser();
    // Le focus suit l'élément déplacé ; arrivé au bout de la liste, il passe sur l'autre bouton.
    const meme = $<HTMLButtonElement>(monter ? '[data-ad-monter]' : '[data-ad-descendre]', li)!;
    const autre = $<HTMLButtonElement>(monter ? '[data-ad-descendre]' : '[data-ad-monter]', li)!;
    (meme.disabled ? autre : meme).focus();
    annonce.textContent = typo(
      `« ${li.dataset.nom ?? ''} » en position ${elements().indexOf(li) + 1} sur ${elements().length}.`,
    );
  });

  retablir.addEventListener('click', () => {
    const parId = new Map(elements().map((li) => [Number(li.dataset.id), li]));
    liste.replaceChildren(...enregistre.flatMap((id) => parId.get(id) ?? []));
    actualiser();
    annonce.textContent = 'Ordre enregistré rétabli.';
  });

  enregistrer.addEventListener('click', () => {
    const [texte, message] = ORDRES[referentiel];
    confirmer('Enregistrer le nouvel ordre ?', texte, 'Enregistrer l’ordre', async () => {
      enregistrer.disabled = true;
      const reponse = await api('PUT', `/api/v1/admin/${referentiel}/ordre`, { ids: ids() });
      if (!reponse.ok) {
        enregistrer.disabled = false;
        return signalerRefus(reponse.probleme);
      }
      rechargerSur(`ordre-${referentiel}`, message);
    });
  });
}
