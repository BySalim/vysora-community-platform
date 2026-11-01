/* Rédaction d'un guide d'Explorer (DEC-02). Les étapes et les pièges s'ajoutent (modèles <template>),
   se déplacent et se retirent dans la page ; les étapes proposées à chaque piège suivent la méthode
   en cours de rédaction. L'enregistrement envoie tout le guide, contrôlé avec le schéma de l'API,
   après une fenêtre de confirmation qui dit ce qui disparaît. Les contenus du guide, la publication
   et la suppression s'appliquent aussitôt, après confirmation, et la page se recharge. L'API reste
   seule juge : ses refus s'affichent sous le champ qu'elle désigne. */

import { erreursParChamp, schemaGuide, type GuideAdministreApi } from '@vysora/shared';
import { numeroDeContenu } from '../lib/guides-admin';
import { ROUTES } from '../lib/navigation';
import { pluriel } from '../lib/texte';
import { confirmer, signalerRefus } from './commun/administration';
import { api } from './commun/api';
import { $, $$, messageApresChargement, typo } from './commun/outils';

type Liste = 'etapes' | 'pieges';
type Champ = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const formulaire = $<HTMLFormElement>('[data-ad-guide]');

if (formulaire) {
  const guideId = Number(formulaire.dataset.adGuide);
  const publie = formulaire.dataset.publie === 'oui';
  const nom = formulaire.dataset.titre ?? '';
  const listes: Record<Liste, HTMLElement> = {
    etapes: $('[data-ad-liste="etapes"]', formulaire)!,
    pieges: $('[data-ad-liste="pieges"]', formulaire)!,
  };
  const erreurGenerale = $('[data-ad-erreur-general]')!;
  const marqueModifie = $('[data-ad-modifie]');
  const enregistrer = $<HTMLButtonElement>('button[form="ad-guide"]');
  const boutonConfirmer = $<HTMLButtonElement>('[data-ad-confirmer]');
  let modifie = false;
  let compteur = 0;

  const blocs = (liste: Liste) => $$<HTMLLIElement>(':scope > li', listes[liste]);
  const idsDe = (liste: Liste) =>
    blocs(liste).flatMap((li) => (li.dataset.id ? [li.dataset.id] : []));
  const initiaux: Record<Liste, string[]> = { etapes: idsDe('etapes'), pieges: idsDe('pieges') };
  const valeur = (racine: ParentNode, champ: string) =>
    $<Champ>(`[data-champ="${champ}"]`, racine)?.value.trim() ?? '';
  const nombre = (texte: string | undefined) => (texte ? Number(texte) : null);
  const element = (nomChamp: string) => formulaire.elements.namedItem(nomChamp) as Champ | null;

  function signalerModification(): void {
    modifie = true;
    if (marqueModifie) marqueModifie.hidden = false;
  }
  formulaire.addEventListener('input', signalerModification);
  formulaire.addEventListener('change', signalerModification);
  window.addEventListener('beforeunload', (evenement) => {
    if (modifie) evenement.preventDefault();
  });

  /** Numéros, déplacements possibles, états vides, et étapes proposées à chaque piège. */
  function actualiser(): void {
    for (const liste of ['etapes', 'pieges'] as const) {
      const items = blocs(liste);
      items.forEach((li, i) => {
        const numero = $('[data-ad-numero]', li);
        if (numero) numero.textContent = `${liste === 'etapes' ? 'Étape' : 'Piège'} ${i + 1}`;
        const monter = $<HTMLButtonElement>('[data-ad-monter]', li);
        const descendre = $<HTMLButtonElement>('[data-ad-descendre]', li);
        if (monter) monter.disabled = i === 0;
        if (descendre) descendre.disabled = i === items.length - 1;
      });
      const vide = $(`[data-ad-vide="${liste}"]`);
      if (vide) vide.hidden = items.length > 0;
      const ajouter = $<HTMLButtonElement>(`[data-ad-ajouter="${liste}"]`);
      if (ajouter) ajouter.disabled = items.length >= Number(ajouter.dataset.max);
    }
    const etapes = blocs('etapes').map((li, i) => ({
      cle: li.dataset.cle ?? '',
      libelle: `${i + 1}. ${valeur(li, 'titre') || 'Étape sans titre'}`,
    }));
    for (const liste of $$<HTMLSelectElement>('[data-champ="etape"]', listes.pieges)) {
      const choisie = liste.value;
      liste.replaceChildren(
        new Option('Aucune étape', ''),
        ...etapes.map((e) => new Option(typo(e.libelle), e.cle)),
      );
      liste.value = etapes.some((e) => e.cle === choisie) ? choisie : '';
    }
  }

  /* Étapes et pièges : ajouter, déplacer, retirer ------------------------------------------- */

  for (const bouton of $$<HTMLButtonElement>('[data-ad-ajouter]')) {
    bouton.addEventListener('click', () => {
      const liste = bouton.dataset.adAjouter as Liste;
      const modele = $<HTMLTemplateElement>(`[data-ad-modele="${liste}"]`);
      const li = modele?.content.firstElementChild?.cloneNode(true) as HTMLLIElement | undefined;
      if (!li) return;
      const cle = `n${++compteur}`;
      for (const el of $$<HTMLElement>('[id]', li)) el.id = el.id.replace('__cle__', cle);
      for (const el of $$<HTMLLabelElement>('label[for]', li))
        el.htmlFor = el.htmlFor.replace('__cle__', cle);
      if (liste === 'etapes') li.dataset.cle = cle;
      listes[liste].append(li);
      actualiser();
      signalerModification();
      $<HTMLInputElement>('[data-champ="titre"]', li)?.focus();
    });
  }

  formulaire.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLButtonElement>(
      '[data-ad-monter], [data-ad-descendre], [data-ad-retirer]',
    );
    const li = bouton?.closest<HTMLLIElement>('.ad-bloc');
    if (!bouton || !li) return;
    if (bouton.hasAttribute('data-ad-monter')) li.previousElementSibling?.before(li);
    else if (bouton.hasAttribute('data-ad-descendre')) li.nextElementSibling?.after(li);
    else {
      const suivant = li.nextElementSibling ?? li.previousElementSibling;
      const liste = li.parentElement;
      li.remove();
      (
        $<HTMLInputElement>('[data-champ="titre"]', suivant ?? document) ??
        liste?.parentElement?.querySelector<HTMLButtonElement>('[data-ad-ajouter]')
      )?.focus();
    }
    actualiser();
    signalerModification();
    if (li.isConnected && !bouton.disabled) bouton.focus();
  });

  formulaire.addEventListener('input', (evenement) => {
    if ((evenement.target as Element).matches('[data-ad-etape] [data-champ="titre"]')) actualiser();
  });
  formulaire.addEventListener('change', (evenement) => {
    const cible = evenement.target as Element;
    if (!cible.matches('[data-champ="citation.parcoursId"]')) return;
    const zone = cible.closest('.ad-bloc')?.querySelector<HTMLElement>('[data-ad-citation]');
    if (zone) zone.hidden = !(cible as HTMLSelectElement).value;
  });

  /* Enregistrement ----------------------------------------------------------------------------- */

  function saisie() {
    const cles = blocs('etapes').map((li) => li.dataset.cle ?? '');
    const sources = (li: HTMLElement) =>
      $$<HTMLInputElement>('[data-champ="sources"]:checked', li).map((c) => Number(c.value));
    return {
      version: formulaire!.dataset.version ?? '',
      titre: element('titre')?.value ?? '',
      titreCourt: element('titreCourt')?.value ?? '',
      categorieId: element('categorieId')?.value ?? '',
      motsCles: (element('motsCles')?.value ?? '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      lacunes: (element('lacunes')?.value ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      etapes: blocs('etapes').map((li) => {
        const cite = valeur(li, 'citation.parcoursId');
        return {
          id: nombre(li.dataset.id),
          titre: valeur(li, 'titre'),
          conseil: valeur(li, 'conseil'),
          sources: sources(li),
          citation: cite ? { parcoursId: Number(cite), texte: valeur(li, 'citation.texte') } : null,
        };
      }),
      pieges: blocs('pieges').map((li) => {
        const rang = cles.indexOf(valeur(li, 'etape'));
        return {
          id: nombre(li.dataset.id),
          titre: valeur(li, 'titre'),
          solution: valeur(li, 'solution'),
          etape: valeur(li, 'etape') && rang >= 0 ? rang : null,
          sources: sources(li),
          sujetId: nombre(valeur(li, 'sujetId')),
          casId: nombre(valeur(li, 'casId')),
        };
      }),
    };
  }

  /** Chaque erreur sous son champ (« etapes.2.titre » : le titre de la troisième étape), à défaut
      sous sa liste, sinon dans le panneau ; la première reçoit le focus. */
  function afficher(erreurs: Record<string, string>): void {
    for (const zone of $$<HTMLElement>('[data-ad-erreur], [data-ad-erreur-champ]', formulaire!)) {
      zone.textContent = '';
      zone.hidden = true;
    }
    for (const champ of $$<HTMLElement>('[aria-invalid]', formulaire!))
      champ.removeAttribute('aria-invalid');
    erreurGenerale.textContent = '';
    erreurGenerale.hidden = true;
    let premier: HTMLElement | null = null;
    for (const [chemin, message] of Object.entries(erreurs)) {
      const [racine = '', rang, ...reste] = chemin.split('.');
      const souschamp = reste.join('.');
      let zone: HTMLElement | null = null;
      let champ: HTMLElement | null = null;
      if ((racine === 'etapes' || racine === 'pieges') && rang && /^\d+$/.test(rang)) {
        const li = blocs(racine)[Number(rang)];
        if (li && souschamp) {
          zone = $(`[data-ad-erreur-champ="${souschamp}"]`, li);
          champ = $(`[data-champ="${souschamp}"]`, li);
        }
        zone ??= $(`[data-ad-erreur="${racine}"]`, formulaire!);
      } else {
        zone = $(`[data-ad-erreur="${racine}"]`, formulaire!);
        champ = element(racine);
      }
      zone ??= erreurGenerale;
      if (!zone.hidden) continue;
      zone.textContent = typo(message);
      zone.hidden = false;
      if (champ?.matches('input, select, textarea')) champ.setAttribute('aria-invalid', 'true');
      premier ??= champ ?? zone;
    }
    if (premier) {
      premier.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (premier.matches('input, select, textarea')) premier.focus({ preventScroll: true });
    }
  }

  /** « 2 étapes et 1 piège retirés disparaissent aussi des listes de contrôle des membres. » */
  function retraits(etapes: number, pieges: number): string {
    if (!etapes && !pieges) return '';
    const sujet =
      etapes && pieges
        ? `${pluriel(etapes, 'étape', 'étapes')} et ${pluriel(pieges, 'piège', 'pièges')} retirés`
        : etapes
          ? `${pluriel(etapes, 'étape retirée', 'étapes retirées')}`
          : `${pluriel(pieges, 'piège retiré', 'pièges retirés')}`;
    const verbe = etapes + pieges > 1 ? 'disparaissent' : 'disparaît';
    return ` ${sujet} ${verbe} aussi des listes de contrôle des membres.`;
  }

  function recharger(message: string, ancre = ''): void {
    modifie = false;
    messageApresChargement(message);
    // Une adresse qui ne change que par son ancre ne recharge pas la page : rechargement explicite
    // (les formulaires refusent l'autocomplétion, le navigateur n'y remet pas l'ancienne saisie).
    history.replaceState(null, '', `${window.location.pathname}${ancre ? `#${ancre}` : ''}`);
    history.scrollRestoration = 'manual';
    window.location.reload();
  }

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const resultat = schemaGuide.safeParse(saisie());
    if (!resultat.success) return afficher(erreursParChamp(resultat.error));
    afficher({});
    const gardees = (liste: Liste) => new Set(resultat.data[liste].map((x) => String(x.id)));
    const retirees = (liste: Liste) =>
      initiaux[liste].filter((id) => !gardees(liste).has(id)).length;
    confirmerAction(
      'Enregistrer le guide ?',
      (publie
        ? 'Les modifications s’appliquent aussitôt dans Explorer.'
        : 'Le guide reste en préparation : personne ne le voit avant sa publication.') +
        retraits(retirees('etapes'), retirees('pieges')),
      'Enregistrer',
      async () => {
        if (enregistrer) {
          enregistrer.disabled = true;
          enregistrer.setAttribute('aria-busy', 'true');
        }
        const reponse = await api<GuideAdministreApi>(
          'PUT',
          `/api/v1/admin/guides/${guideId}`,
          resultat.data,
        );
        if (reponse.ok) return recharger('Guide enregistré.');
        if (enregistrer) {
          enregistrer.disabled = false;
          enregistrer.removeAttribute('aria-busy');
        }
        const { status, erreurs, detail, title } = reponse.probleme;
        if (erreurs && Object.keys(erreurs).length) return afficher(erreurs);
        afficher({
          general:
            status === 409 || status === 404
              ? (detail ?? title)
              : 'Le guide n’a pas été enregistré. Réessayez dans un instant.',
        });
      },
    );
  });

  /* Actions immédiates : contenus, publication, suppression -------------------------------------- */

  /** Confirmation ; le bouton rouge signale une action définitive. */
  function confirmerAction(
    titre: string,
    texte: string,
    libelle: string,
    action: () => Promise<void>,
    danger = false,
  ): void {
    boutonConfirmer?.classList.toggle('is-danger', danger);
    confirmer(titre, texte, libelle, action);
  }
  const perte = () => (modifie ? ' Vos modifications non enregistrées seront perdues.' : '');

  const formContenu = $<HTMLFormElement>('[data-ad-contenu]');
  if (formContenu) {
    const champ = $<HTMLInputElement>('[name="adresse"]', formContenu)!;
    const zone = $('[data-ad-erreur="contenuId"]', formContenu)!;
    const bouton = $<HTMLButtonElement>('button[type="submit"]', formContenu);
    const erreur = (message = '') => {
      zone.textContent = typo(message);
      zone.hidden = !message;
      champ.setAttribute('aria-invalid', String(Boolean(message)));
    };
    const ajouter = async (contenuId: number) => {
      if (bouton) bouton.disabled = true;
      const reponse = await api('POST', `/api/v1/admin/guides/${guideId}/contenus`, { contenuId });
      if (bouton) bouton.disabled = false;
      if (reponse.ok) return recharger('Contenu ajouté au guide.', `contenu-${contenuId}`);
      const { status, erreurs, detail, title } = reponse.probleme;
      erreur(
        erreurs?.contenuId ??
          (status === 409 || status === 404
            ? (detail ?? title)
            : 'L’ajout n’a pas abouti. Réessayez dans un instant.'),
      );
    };
    formContenu.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      const contenuId = numeroDeContenu(champ.value);
      if (contenuId === null)
        return erreur(
          'Indiquez l’adresse d’une création, d’une question du forum ou d’un cas Bon réflexe, ou son numéro.',
        );
      erreur();
      if (!modifie) return void ajouter(contenuId);
      confirmerAction(
        'Ajouter ce contenu ?',
        `La page se recharge avec le contenu ajouté.${perte()}`,
        'Ajouter',
        () => ajouter(contenuId),
      );
    });

    for (const remettre of $$<HTMLButtonElement>('[data-ad-remettre]')) {
      remettre.addEventListener('click', () => {
        const contenuId = Number(remettre.dataset.adRemettre);
        confirmerAction(
          'Remettre ce parcours dans le guide ?',
          `« ${remettre.dataset.titre ?? ''} » rejoint de nouveau les parcours du guide.${perte()}`,
          'Remettre',
          () => ajouter(contenuId),
        );
      });
    }
  }

  const EFFETS_RETRAIT: Record<string, string> = {
    CREATION:
      'ne figure plus dans le guide, ni dans sa méthode et ses pièges ; une nouvelle publication ne l’y rangera plus. Il reste publié sur Vysora.',
    SUJET:
      'n’est plus une question du guide, ni la discussion de ses pièges. Elle reste publiée sur le forum.',
    CAS_BON_REFLEXE:
      'n’est plus un cas du guide, ni l’entraînement de ses pièges. Il reste dans Bon réflexe.',
  };
  for (const bouton of $$<HTMLButtonElement>('[data-ad-retirer-contenu]')) {
    bouton.addEventListener('click', () => {
      const contenuId = Number(bouton.dataset.adRetirerContenu);
      const type = bouton.dataset.type ?? 'CREATION';
      confirmerAction(
        type === 'CREATION'
          ? 'Retirer ce parcours du guide ?'
          : type === 'SUJET'
            ? 'Retirer cette question du guide ?'
            : 'Retirer ce cas du guide ?',
        `« ${bouton.dataset.titre ?? ''} » ${EFFETS_RETRAIT[type] ?? ''}${perte()}`,
        'Retirer',
        async () => {
          bouton.disabled = true;
          const reponse = await api(
            'DELETE',
            `/api/v1/admin/guides/${guideId}/contenus/${contenuId}`,
          );
          bouton.disabled = false;
          if (!reponse.ok) return signalerRefus(reponse.probleme);
          recharger('Contenu retiré du guide.', 'contenus');
        },
      );
    });
  }

  const PUBLICATION = {
    publier: {
      titre: 'Publier ce guide ?',
      texte:
        'il apparaît dans Explorer avec sa méthode, ses pièges et ses parcours ; les créations publiées ensuite peuvent le rejoindre par le rapprochement.',
      libelle: 'Publier',
      methode: 'POST',
      message: 'Guide publié : il apparaît dans Explorer.',
    },
    retirer: {
      titre: 'Repasser ce guide en préparation ?',
      texte:
        'il disparaît d’Explorer. Les listes de contrôle des membres sont gardées et reviendront avec lui.',
      libelle: 'Repasser en préparation',
      methode: 'DELETE',
      message: 'Guide repassé en préparation.',
    },
  } as const;
  for (const bouton of $$<HTMLButtonElement>('[data-ad-publication]')) {
    const choix = PUBLICATION[bouton.dataset.adPublication as keyof typeof PUBLICATION];
    bouton.addEventListener('click', () => {
      afficher({});
      confirmerAction(
        choix.titre,
        `« ${nom} » : ${choix.texte}${perte()}`,
        choix.libelle,
        async () => {
          bouton.disabled = true;
          const reponse = await api(choix.methode, `/api/v1/admin/guides/${guideId}/publication`);
          bouton.disabled = false;
          if (reponse.ok) return recharger(choix.message);
          const { status, detail, title } = reponse.probleme;
          afficher({
            general:
              status === 409 || status === 404
                ? (detail ?? title)
                : 'La modification n’a pas abouti. Réessayez dans un instant.',
          });
        },
      );
    });
  }

  $<HTMLButtonElement>('[data-ad-supprimer]')?.addEventListener('click', (evenement) => {
    const bouton = evenement.currentTarget as HTMLButtonElement;
    confirmerAction(
      'Supprimer ce guide ?',
      `« ${nom} » n’a servi à aucun membre. Sa méthode, ses pièges et la liste de ses contenus sont effacés ; les contenus eux-mêmes restent publiés. Cette action est définitive.`,
      'Supprimer',
      async () => {
        bouton.disabled = true;
        const reponse = await api('DELETE', `/api/v1/admin/guides/${guideId}`);
        bouton.disabled = false;
        if (!reponse.ok) return signalerRefus(reponse.probleme);
        modifie = false;
        messageApresChargement(`Guide « ${nom} » supprimé.`);
        window.location.assign(ROUTES.guidesAdmin);
      },
      true,
    );
  });

  actualiser();
}
