/* Guides d'Explorer dans l'administration (DEC-02) : nouveau guide (adresse proposée d'après le nom
   court tant qu'elle n'a pas été saisie), relecture des pièges signalés (retenu et écrit dans le
   guide, ou écarté) et objectifs que la communauté cherche encore (ajout, clôture, réouverture).
   Chaque changement se confirme ; l'API reste seule juge et ses refus s'affichent tels qu'elle les
   formule. La rédaction d'un guide : scripts/editeur-guide.ts. */

import {
  erreursParChamp,
  schemaDemandeGuide,
  schemaNouveauGuide,
  schemaRelecturePiege,
  slugifier,
  type GuideAdministreApi,
} from '@vysora/shared';
import { ROUTES } from '../lib/navigation';
import { afficherErreurs, confirmer, erreursDuRefus, signalerRefus } from './commun/administration';
import { api } from './commun/api';
import { $, $$, messageApresChargement } from './commun/outils';

/** Après un changement, la page se recharge sur l'élément concerné. */
function rechargerSur(ancre: string | null, message: string): void {
  messageApresChargement(message);
  history.replaceState(null, '', `${location.search}${ancre ? `#${ancre}` : ''}`);
  history.scrollRestoration = 'manual';
  window.location.reload();
}
const vise = /^#[a-z]+-\d+$/.test(location.hash) ? $<HTMLElement>(location.hash) : null;
if (vise) setTimeout(() => vise.scrollIntoView({ block: 'start', behavior: 'instant' }), 0);

/* Nouveau guide ------------------------------------------------------------------------------ */

const formGuide = $<HTMLFormElement>('[data-ad-nouveau-guide]');
if (formGuide) {
  const court = $<HTMLInputElement>('[name="titreCourt"]', formGuide)!;
  const adresse = $<HTMLInputElement>('[name="slug"]', formGuide)!;
  let adresseSaisie = false;
  adresse.addEventListener('input', () => {
    adresseSaisie = adresse.value.trim() !== '';
  });
  court.addEventListener('input', () => {
    if (!adresseSaisie) adresse.value = slugifier(court.value);
  });

  formGuide.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const resultat = schemaNouveauGuide.safeParse(Object.fromEntries(new FormData(formGuide)));
    if (!resultat.success) return afficherErreurs(formGuide, erreursParChamp(resultat.error));
    afficherErreurs(formGuide, {});
    const envoyer = $<HTMLButtonElement>('button[type="submit"]', formGuide);
    if (envoyer) envoyer.disabled = true;
    const reponse = await api<GuideAdministreApi>('POST', '/api/v1/admin/guides', resultat.data);
    if (envoyer) envoyer.disabled = false;
    if (!reponse.ok)
      return afficherErreurs(
        formGuide,
        erreursDuRefus(reponse.probleme, 'Le guide n’a pas été créé. Réessayez dans un instant.'),
      );
    messageApresChargement('Guide créé, en préparation. Rédigez sa méthode avant de le publier.');
    window.location.assign(ROUTES.guideAdmin(reponse.donnees.id));
  });
}

/* Pièges signalés ---------------------------------------------------------------------------- */

for (const formulaire of $$<HTMLFormElement>('[data-ad-relecture]')) {
  const id = Number(formulaire.dataset.adRelecture);
  const guide = formulaire.dataset.guide ?? '';
  const boutons = $$<HTMLButtonElement>('button', formulaire);

  async function relire(saisie: unknown, message: string): Promise<void> {
    boutons.forEach((b) => (b.disabled = true));
    const reponse = await api('POST', `/api/v1/admin/propositions-pieges/${id}/relecture`, saisie);
    boutons.forEach((b) => (b.disabled = false));
    if (!reponse.ok)
      return afficherErreurs(
        formulaire,
        erreursDuRefus(
          reponse.probleme,
          'La relecture n’a pas été enregistrée. Réessayez dans un instant.',
        ),
      );
    rechargerSur(null, message);
  }

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const donnees = Object.fromEntries(new FormData(formulaire));
    const resultat = schemaRelecturePiege.safeParse({
      decision: 'RETENIR',
      ...donnees,
      etapeId: donnees.etapeId ? Number(donnees.etapeId) : null,
    });
    if (!resultat.success) return afficherErreurs(formulaire, erreursParChamp(resultat.error));
    afficherErreurs(formulaire, {});
    confirmer(
      'Retenir ce piège ?',
      `Il rejoint les pièges du guide « ${guide} » avec votre texte et apparaît aussitôt dans Explorer si le guide est publié.`,
      'Retenir',
      () => relire(resultat.data, `Piège écrit dans le guide « ${guide} ».`),
    );
  });

  $('[data-ad-ecarter]', formulaire)?.addEventListener('click', () => {
    afficherErreurs(formulaire, {});
    confirmer(
      'Écarter ce piège ?',
      `Il quitte la relecture sans rejoindre le guide « ${guide} ». Le membre ne le voit plus « en relecture ».`,
      'Écarter',
      () => relire({ decision: 'ECARTER' }, 'Piège écarté.'),
    );
  });
}

/* Ce que la communauté cherche encore -------------------------------------------------------------- */

const formDemande = $<HTMLFormElement>('[data-ad-demande]');
formDemande?.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const resultat = schemaDemandeGuide.safeParse(Object.fromEntries(new FormData(formDemande)));
  if (!resultat.success) return afficherErreurs(formDemande, erreursParChamp(resultat.error));
  afficherErreurs(formDemande, {});
  const envoyer = $<HTMLButtonElement>('button[type="submit"]', formDemande);
  if (envoyer) envoyer.disabled = true;
  const reponse = await api('POST', '/api/v1/admin/demandes', resultat.data);
  if (envoyer) envoyer.disabled = false;
  if (!reponse.ok) return afficherErreurs(formDemande, erreursDuRefus(reponse.probleme));
  rechargerSur(null, `« ${resultat.data.libelle} » ajouté. Explorer le présente aussitôt.`);
});

for (const [attribut, cle, methode] of [
  ['data-ad-demande-clore', 'adDemandeClore', 'POST'],
  ['data-ad-demande-rouvrir', 'adDemandeRouvrir', 'DELETE'],
] as const) {
  for (const bouton of $$<HTMLButtonElement>(`[${attribut}]`)) {
    bouton.addEventListener('click', () => {
      const id = Number(bouton.dataset[cle]);
      const libelle = bouton.dataset.libelle ?? '';
      const clore = methode === 'POST';
      confirmer(
        clore ? 'Clore cet objectif ?' : 'Rouvrir cet objectif ?',
        clore
          ? `« ${libelle} » n’est plus présenté dans Explorer : un guide le couvre désormais.`
          : `« ${libelle} » est de nouveau présenté dans Explorer, avec les membres qui le cherchent.`,
        clore ? 'Clore' : 'Rouvrir',
        async () => {
          bouton.disabled = true;
          const reponse = await api(methode, `/api/v1/admin/demandes/${id}/cloture`);
          bouton.disabled = false;
          if (!reponse.ok) return signalerRefus(reponse.probleme);
          rechargerSur(`demande-${id}`, clore ? 'Objectif clos.' : 'Objectif rouvert.');
        },
      );
    });
  }
}
