/* Nouveau sujet du forum (FORUM-02), repris de prototype/forum.js (renderAsk, syncKind, renderHelp,
   renderSimilar, saveDraft, publishTopic) : champs selon le type, touches A à E, aide du champ
   actif, sujets semblables pendant la saisie, brouillon gardé par le navigateur, envoi à l'API. */

import type { ListeSujetsApi, SujetApi, TypeSujet } from '@vysora/shared';
import { ROUTES } from '../lib/navigation';
import { aideHTML, champDeLErreur, TOUCHES } from '../lib/forum/nouveau';
import { decouper, surligner } from '../lib/explorer/recherche';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import { lireMesOutils } from './commun/mes-outils';
import { $, $$, esc, fmt, messageApresChargement, pluriel, t, toast } from './commun/outils';

interface DonneesNouveau {
  outils: { id: number; slug: string; modeles: { id: number; nom: string; nomCourt: string }[] }[];
  outilDemande: boolean;
}

const CLE_BROUILLON = 'vysora-forum-brouillon';
const source = document.getElementById('qa-nouveau')?.textContent;
const donnees = source ? (JSON.parse(source) as DonneesNouveau) : null;
const formulaire = $<HTMLFormElement>('[data-compose-form]');

if (donnees && formulaire) {
  const champ = <E extends HTMLElement = HTMLInputElement>(id: string) =>
    $<E>(`#${id}`, formulaire);
  const valeur = (id: string) =>
    (champ<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.value ?? '').trim();
  const typeChoisi = (): TypeSujet =>
    ($<HTMLInputElement>('[data-types] input:checked', formulaire)?.value as TypeSujet) ??
    'QUESTION';

  /* Champs selon le type (prototype : syncKind) */
  const accorder = () => {
    const type = typeChoisi();
    for (const groupe of $$<HTMLElement>('.qa-n-kind', formulaire))
      groupe.hidden = !(groupe.dataset.for ?? '').split(' ').includes(type);
    // Ajuste l'adresse sans recharger : ?type=clinique se partage.
    const cle = $<HTMLInputElement>(`[data-types] input[value="${type}"]`, formulaire);
    if (cle) {
      const adresse = new URL(location.href);
      const cles: Record<TypeSujet, string> = {
        QUESTION: 'question',
        CLINIQUE: 'clinique',
        ASTUCE: 'astuce',
        RETOUR_EXPERIENCE: 'retour',
        DISCUSSION: 'discussion',
      };
      if (type === 'QUESTION') adresse.searchParams.delete('type');
      else adresse.searchParams.set('type', cles[type]);
      history.replaceState(null, '', adresse);
    }
  };

  /* Brouillon (prototype : saveDraft), gardé par ce navigateur */
  const statut = $('[data-draft-status]');
  const ids = () =>
    $$<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input[id^="qa-n-"], textarea[id^="qa-n-"], select[id^="qa-n-"]',
      formulaire,
    );
  let minuterieBrouillon: ReturnType<typeof setTimeout> | undefined;
  const enregistrerBrouillon = () => {
    clearTimeout(minuterieBrouillon);
    minuterieBrouillon = setTimeout(() => {
      const brouillon: Record<string, string> = { type: typeChoisi() };
      for (const element of ids()) brouillon[element.id] = element.value;
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify(brouillon));
        if (statut) statut.textContent = 'Brouillon enregistré';
      } catch {
        // Stockage indisponible : le brouillon dure le temps de la page.
      }
    }, 400);
  };
  const lireBrouillon = (): Record<string, string> | null => {
    try {
      const lu: unknown = JSON.parse(localStorage.getItem(CLE_BROUILLON) ?? 'null');
      return lu && typeof lu === 'object' ? (lu as Record<string, string>) : null;
    } catch {
      return null;
    }
  };
  const effacerBrouillon = () => {
    try {
      localStorage.removeItem(CLE_BROUILLON);
    } catch {
      // Rien à effacer.
    }
  };

  // Reprise du brouillon ; un titre ou un type demandés par l'adresse l'emportent.
  const brouillon = lireBrouillon();
  const parametres = new URLSearchParams(location.search);
  if (brouillon) {
    for (const element of ids()) {
      const lu = brouillon[element.id];
      if (typeof lu !== 'string' || !lu) continue;
      if (element.id === 'qa-n-title' && parametres.get('titre')) continue;
      if (element.id === 'qa-n-tool' && donnees.outilDemande) continue;
      element.value = lu;
    }
    if (!parametres.get('type') && !parametres.get('nouveau') && brouillon.type) {
      const radio = $<HTMLInputElement>(
        `[data-types] input[value="${brouillon.type}"]`,
        formulaire,
      );
      if (radio) radio.checked = true;
    }
    if (statut) statut.textContent = 'Brouillon repris';
  } else if (!donnees.outilDemande) {
    // Sans brouillon : le premier outil suivi, comme le prototype.
    const [premier] = lireMesOutils(donnees.outils.map((o) => o.slug));
    const option = premier
      ? $<HTMLOptionElement>(`#qa-n-tool option[data-slug="${premier}"]`, formulaire)
      : null;
    if (option) option.selected = true;
  }
  accorder();

  $('[data-discard]', formulaire)?.addEventListener('click', () => {
    effacerBrouillon();
    formulaire.reset();
    accorder();
    if (statut) statut.textContent = '';
    toast('Brouillon abandonné.');
    champ('qa-n-title')?.focus();
  });

  /* Aide du champ actif (prototype : renderHelp) */
  const aide = $('[data-help]');
  formulaire.addEventListener('focusin', (evenement) => {
    const id = (evenement.target as HTMLElement).id;
    if (aide && id.startsWith('qa-n-'))
      aide.innerHTML = aideHTML(id === 'qa-n-model' ? 'qa-n-tool' : id);
  });

  /* Sujets semblables (prototype : renderSimilar), cherchés par l'API pendant la saisie */
  const semblables = $('[data-similar]', formulaire);
  let minuterieRecherche: ReturnType<typeof setTimeout> | undefined;
  let demande = 0;
  const chercherSemblables = () => {
    clearTimeout(minuterieRecherche);
    minuterieRecherche = setTimeout(async () => {
      const texte = valeur('qa-n-title');
      if (!semblables) return;
      if (texte.length < 8) {
        semblables.hidden = true;
        return;
      }
      const numero = ++demande;
      const resultat = await api<ListeSujetsApi>(
        'GET',
        `/api/v1/sujets?q=${encodeURIComponent(texte)}&tri=utiles`,
      );
      if (numero !== demande || !resultat.ok) return;
      const sujets = resultat.donnees.elements.slice(0, 4);
      semblables.hidden = !sujets.length;
      const jetons = decouper(texte);
      semblables.innerHTML = sujets.length
        ? `<p class="qa-similar-head">Ces sujets ont peut-être déjà votre réponse</p><ul class="qa-hot">${sujets
            .map(
              (s) =>
                `<li><span class="qa-hot-votes${s.etat === 'RESOLU' ? ' is-accepted' : ''}">${fmt(s.utiles)}</span><a href="${esc(ROUTES.sujet(s.id, s.slug))}">${surligner(s.titre, jetons)}<small>${t(pluriel(s.reponses, 'réponse', 'réponses'))}${s.solution ? ` · solution de ${t(s.solution.auteur.nom.split(' ')[0] ?? '')}` : ''}</small></a></li>`,
            )
            .join('')}</ul>`
        : '';
    }, 350);
  };
  champ('qa-n-title')?.addEventListener('input', chercherSemblables);
  chercherSemblables();

  formulaire.addEventListener('input', (evenement) => {
    const cible = evenement.target as HTMLElement;
    if (cible.id.startsWith('qa-n-')) erreur(cible.id, '');
    enregistrerBrouillon();
  });
  formulaire.addEventListener('change', (evenement) => {
    if ((evenement.target as Element).closest('[data-types]')) accorder();
    enregistrerBrouillon();
  });

  /* Touches A à E dans le choix du type (prototype : keydown sur [data-types]) */
  $('[data-types]', formulaire)?.addEventListener('keydown', (evenement) => {
    const touche = evenement.key.toUpperCase();
    const type = (Object.entries(TOUCHES) as [TypeSujet, string][]).find(
      ([, l]) => l === touche,
    )?.[0];
    if (!type || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
    evenement.preventDefault();
    const radio = $<HTMLInputElement>(`[data-types] input[value="${type}"]`, formulaire);
    if (!radio) return;
    radio.checked = true;
    radio.focus();
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* Erreurs sous les champs (prototype : setError) */
  function erreur(id: string, message: string): void {
    const element = champ<HTMLElement>(id);
    const sortie = document.getElementById(`${id}-error`);
    if (!element || !sortie) return;
    sortie.hidden = !message;
    sortie.textContent = message;
    if (message) element.setAttribute('aria-invalid', 'true');
    else element.removeAttribute('aria-invalid');
  }

  /* Contrôles du prototype (publishTopic), avant l'envoi ; l'API contrôle de nouveau. */
  function controler(type: TypeSujet, etiquettes: string[]): [string, string][] {
    const court = (id: string, n: number) => valeur(id).length < n;
    const corps = type === 'QUESTION' || type === 'RETOUR_EXPERIENCE' || type === 'DISCUSSION';
    const messages: Record<TypeSujet, string> = {
      QUESTION: 'Votre question doit compter au moins 30 caractères.',
      RETOUR_EXPERIENCE: 'Votre retour doit compter au moins 30 caractères.',
      DISCUSSION: 'Votre sujet doit compter au moins 30 caractères.',
      CLINIQUE: '',
      ASTUCE: 'Présentez votre astuce en 30 caractères au moins.',
    };
    const verifications: [string, string][] = [
      [
        'qa-n-title',
        court('qa-n-title', 15) ? 'Le titre doit compter au moins 15 caractères.' : '',
      ],
      [
        'qa-n-prompt',
        type === 'CLINIQUE' && court('qa-n-prompt', 10)
          ? 'Collez le prompt que vous avez utilisé.'
          : '',
      ],
      [
        'qa-n-got',
        type === 'CLINIQUE' && court('qa-n-got', 10) ? 'Décrivez le résultat obtenu.' : '',
      ],
      [
        'qa-n-expected',
        type === 'CLINIQUE' && court('qa-n-expected', 10) ? 'Décrivez le résultat attendu.' : '',
      ],
      [
        'qa-n-before',
        type === 'ASTUCE' && court('qa-n-before', 20)
          ? 'Le prompt avant doit compter au moins 20 caractères.'
          : '',
      ],
      [
        'qa-n-after',
        type === 'ASTUCE' && court('qa-n-after', 20)
          ? 'Le prompt après doit compter au moins 20 caractères.'
          : '',
      ],
      [
        'qa-n-presentation',
        type === 'ASTUCE' && court('qa-n-presentation', 30) ? messages.ASTUCE : '',
      ],
      ['qa-n-body', corps && court('qa-n-body', 30) ? messages[type] : ''],
      [
        'qa-n-tags',
        !etiquettes.length
          ? 'Ajoutez au moins une étiquette.'
          : etiquettes.length > 5
            ? 'Gardez au plus cinq étiquettes.'
            : '',
      ],
    ];
    return verifications;
  }

  /* Modèle saisi : celui du référentiel s'il correspond, sinon en texte libre (RG-14). */
  function modele(outilId: number): { modeleId: number | null; modeleNonReference: string | null } {
    const saisi = valeur('qa-n-model');
    if (!saisi) return { modeleId: null, modeleNonReference: null };
    const bas = saisi.toLowerCase();
    const connu = donnees!.outils
      .find((o) => o.id === outilId)
      ?.modeles.find((m) => m.nomCourt.toLowerCase() === bas || m.nom.toLowerCase() === bas);
    return connu
      ? { modeleId: connu.id, modeleNonReference: null }
      : { modeleId: null, modeleNonReference: saisi };
  }

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!exiger('contribuer', 'publier une question')) return;
    const type = typeChoisi();
    const etiquettes = valeur('qa-n-tags')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const verifications = controler(type, etiquettes);
    for (const [id, message] of verifications) erreur(id, message);
    const premiere = verifications.find(([, message]) => message);
    if (premiere) {
      champ<HTMLElement>(premiere[0])?.focus();
      return;
    }
    const outilId = Number(valeur('qa-n-tool')) || null;
    const corps =
      type === 'CLINIQUE'
        ? valeur('qa-n-context')
        : type === 'ASTUCE'
          ? valeur('qa-n-presentation')
          : valeur('qa-n-body');
    const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
    if (bouton) bouton.disabled = true;
    const resultat = await api<SujetApi>('POST', '/api/v1/sujets', {
      type,
      titre: valeur('qa-n-title'),
      corps,
      clinique:
        type === 'CLINIQUE'
          ? {
              prompt: valeur('qa-n-prompt'),
              obtenu: valeur('qa-n-got'),
              attendu: valeur('qa-n-expected'),
            }
          : null,
      exempleAvant: type === 'ASTUCE' ? valeur('qa-n-before') : null,
      exempleApres: type === 'ASTUCE' ? valeur('qa-n-after') : null,
      outilId,
      ...(outilId ? modele(outilId) : { modeleId: null, modeleNonReference: null }),
      etiquettes,
      creationId: Number(valeur('qa-n-creation')) || null,
    });
    if (bouton) bouton.disabled = false;
    if (!resultat.ok) {
      const { probleme } = resultat;
      let premierChamp: string | null = null;
      for (const [chemin, message] of Object.entries(probleme.erreurs ?? {})) {
        const id = champDeLErreur(chemin, type);
        if (!id) continue;
        erreur(id, message);
        premierChamp ??= id;
      }
      if (premierChamp) champ<HTMLElement>(premierChamp)?.focus();
      else toast(probleme.detail ?? probleme.title, 'alert');
      return;
    }
    effacerBrouillon();
    messageApresChargement('Question publiée. Vous serez prévenu à chaque réponse.');
    location.assign(ROUTES.sujet(resultat.donnees.id, resultat.donnees.slug));
  });
}
