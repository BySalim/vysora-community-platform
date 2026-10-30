/* Sujet du forum (FORUM-02), repris de prototype/forum.js (vue « question ») : votes « Utile » et
   « Testé, ça marche », enregistrement, copie des prompts et des liens, tri des réponses, citation,
   mise en forme, prompt corrigé avec ses différences, réponse, acceptation et fermeture. La page est
   rendue par le serveur ; une écriture réussie la recharge, avec un message. */

import { differencesHTML } from '../lib/forum/sujet';
import { rendreMarkdownEnLigne } from '../lib/markdown';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import {
  $,
  $$,
  animations,
  esc,
  fmt,
  icon,
  messageApresChargement,
  pluriel,
  t,
  toast,
} from './commun/outils';

interface DonneesSujet {
  id: number;
  auteur: boolean;
  prompt: string | null;
  ferme: boolean;
}

const source = document.getElementById('qa-sujet')?.textContent;
const sujet = source ? (JSON.parse(source) as DonneesSujet | null) : null;

const defilement = (): ScrollBehavior => (animations.completes() ? 'smooth' : 'auto');

async function copier(texte: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texte);
    toast(message);
  } catch {
    toast('Copie impossible : sélectionnez le texte pour le copier.', 'alert');
  }
}

/** Recharge la page (à une ancre) et affiche le message une fois chargée. */
function recharger(message: string, ancre = ''): void {
  messageApresChargement(message);
  if (ancre) location.hash = ancre;
  location.reload();
}

if (sujet) {
  // F-23 : une vue par visiteur et par jour, jamais l'auteur (INT-04).
  if (!sujet.auteur) void api('POST', `/api/v1/contenus/${sujet.id}/vues`);

  const adresse = `${location.origin}${location.pathname}`;

  /* Votes « Utile » d'un sujet ou d'une réponse (F-30, RG-40) */
  async function voterUtile(bouton: HTMLButtonElement): Promise<void> {
    if (!exiger('contribuer', 'voter « Utile »')) return;
    const id = bouton.dataset.useful;
    const actif = bouton.getAttribute('aria-pressed') === 'true';
    bouton.disabled = true;
    const resultat = await api(actif ? 'DELETE' : 'PUT', `/api/v1/contenus/${id}/votes/UTILE`);
    bouton.disabled = false;
    if (!resultat.ok) {
      toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
      return;
    }
    const compteur = $(`[data-useful-count="${id}"]`);
    const n = Number(compteur?.textContent?.replace(/\D/g, '') || 0) + (actif ? -1 : 1);
    if (compteur) {
      compteur.textContent = fmt(n);
      compteur.setAttribute('aria-label', pluriel(n, 'vote utile', 'votes utiles'));
    }
    bouton.setAttribute('aria-pressed', String(!actif));
    bouton.setAttribute('aria-label', actif ? 'Voter utile' : 'Retirer votre vote utile');
    bouton.closest<HTMLElement>('[data-reponse]')?.setAttribute('data-utiles', String(n));
  }

  /* « Testé, ça marche » d'une astuce (RG-41) */
  async function voterTeste(bouton: HTMLButtonElement): Promise<void> {
    if (!exiger('contribuer', 'indiquer que l’astuce fonctionne')) return;
    const actif = bouton.getAttribute('aria-pressed') === 'true';
    bouton.disabled = true;
    const resultat = await api(
      actif ? 'DELETE' : 'PUT',
      `/api/v1/contenus/${sujet!.id}/votes/TESTE_OK`,
    );
    bouton.disabled = false;
    if (!resultat.ok) {
      toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
      return;
    }
    bouton.setAttribute('aria-pressed', String(!actif));
    bouton.innerHTML = `${icon(actif ? 'repeat' : 'check')}<span>${actif ? 'Testé, ça marche' : 'Testé'}</span>`;
    if (!actif) toast('Merci : votre test est compté.');
  }

  /* Enregistrer le sujet (F-34) */
  async function enregistrer(bouton: HTMLButtonElement): Promise<void> {
    if (!exiger('contribuer', 'enregistrer ce sujet')) return;
    const actif = bouton.getAttribute('aria-pressed') === 'true';
    bouton.disabled = true;
    const resultat = await api(
      actif ? 'DELETE' : 'PUT',
      `/api/v1/contenus/${sujet!.id}/enregistrement`,
    );
    bouton.disabled = false;
    if (!resultat.ok) {
      toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
      return;
    }
    bouton.setAttribute('aria-pressed', String(!actif));
    bouton.setAttribute(
      'aria-label',
      actif ? 'Enregistrer ce sujet' : 'Retirer des enregistrements',
    );
    toast(actif ? 'Sujet retiré de vos enregistrements.' : 'Sujet enregistré.');
  }

  /* Accepter une réponse (RG-63) et fermer ou rouvrir le sujet (RG-65) */
  async function accepter(bouton: HTMLButtonElement): Promise<void> {
    if (!exiger('contribuer', 'accepter une réponse')) return;
    bouton.disabled = true;
    const resultat = await api('PUT', `/api/v1/messages/${bouton.dataset.accept}/acceptation`);
    if (!resultat.ok) {
      bouton.disabled = false;
      toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
      return;
    }
    recharger(
      'Réponse acceptée : le sujet est marqué comme résolu.',
      `reponse-${bouton.dataset.accept}`,
    );
  }

  async function fermer(bouton: HTMLButtonElement): Promise<void> {
    const rouvrir = bouton.dataset.closeTopic === 'rouvrir';
    if (!exiger('contribuer', rouvrir ? 'rouvrir ce sujet' : 'fermer ce sujet')) return;
    bouton.disabled = true;
    const resultat = await api(rouvrir ? 'DELETE' : 'PUT', `/api/v1/sujets/${sujet!.id}/fermeture`);
    if (!resultat.ok) {
      bouton.disabled = false;
      toast(resultat.probleme.detail ?? resultat.probleme.title, 'alert');
      return;
    }
    recharger(
      rouvrir
        ? 'Sujet rouvert aux réponses.'
        : 'Sujet fermé : il reste lisible, les réponses sont désactivées.',
    );
  }

  /* Tri des réponses (prototype : sorters), sans recharger */
  $<HTMLSelectElement>('[data-answer-sort]')?.addEventListener('change', (evenement) => {
    const tri = (evenement.target as HTMLSelectElement).value;
    const liste = $('[data-answer-list]');
    if (!liste) return;
    const reponses = $$<HTMLElement>('[data-reponse]', liste);
    const date = (r: HTMLElement) => r.dataset.date ?? '';
    reponses.sort((a, b) => {
      if (tri === 'recentes') return date(b).localeCompare(date(a));
      if (tri === 'anciennes') return date(a).localeCompare(date(b));
      return (
        Number(b.hasAttribute('data-acceptee')) - Number(a.hasAttribute('data-acceptee')) ||
        Number(b.dataset.utiles) - Number(a.dataset.utiles)
      );
    });
    liste.append(...reponses);
  });

  /* Formulaire de réponse */
  const zoneReponse = $<HTMLTextAreaElement>('#qa-reply');
  const erreurReponse = $('#qa-reply-error');
  let citation: { auteur: string } | null = null;

  function entourer(zone: HTMLTextAreaElement, marque: string): void {
    const { selectionStart: debut, selectionEnd: fin, value } = zone;
    const choisi = value.slice(debut, fin) || (marque === '`' ? 'code' : 'texte');
    zone.setRangeText(`${marque}${choisi}${marque}`, debut, fin, 'select');
    zone.setSelectionRange(debut + marque.length, debut + marque.length + choisi.length);
    zone.focus();
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function citer(bouton: HTMLElement): void {
    if (!exiger('contribuer', 'répondre')) return;
    const zone = $('[data-quote-zone]');
    if (!zone || !zoneReponse) return;
    citation = { auteur: bouton.dataset.quoteAuthor ?? '' };
    zone.innerHTML = `<p class="qa-quote">${icon('quote')}<span>En réponse à <b>${t(citation.auteur)}</b> : « ${esc(bouton.dataset.quoteText ?? '')} »</span><button type="button" data-unquote aria-label="Retirer la citation">${icon('close')}</button></p>`;
    $('#repondre')?.scrollIntoView({ behavior: defilement(), block: 'start' });
    zoneReponse.focus({ preventScroll: true });
  }

  zoneReponse?.addEventListener('input', () => {
    erreurReponse?.setAttribute('hidden', '');
    zoneReponse.removeAttribute('aria-invalid');
    const apercu = $('[data-live-preview]');
    const corps = $('[data-live-body]');
    const texte = zoneReponse.value.trim();
    if (apercu) apercu.hidden = !/\*\*|`/.test(texte);
    if (corps) corps.innerHTML = `<p>${rendreMarkdownEnLigne(texte)}</p>`;
  });
  $<HTMLInputElement>('[data-reply-fix]')?.addEventListener('change', (evenement) => {
    const coche = (evenement.target as HTMLInputElement).checked;
    const champ = $('[data-reply-fix-field]');
    if (champ) champ.hidden = !coche;
    if (coche) $<HTMLTextAreaElement>('#qa-reply-prompt')?.focus();
  });
  $<HTMLTextAreaElement>('#qa-reply-prompt')?.addEventListener('input', (evenement) => {
    const apercu = $('[data-diff-preview]');
    if (apercu && sujet.prompt)
      apercu.innerHTML = differencesHTML(
        sujet.prompt,
        (evenement.target as HTMLTextAreaElement).value,
      );
  });

  const formulaire = $<HTMLFormElement>('[data-reply-form]');
  formulaire?.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (!exiger('contribuer', 'répondre') || !zoneReponse) return;
    const texte = zoneReponse.value.trim();
    const corrige = $<HTMLInputElement>('[data-reply-fix]')?.checked
      ? ($<HTMLTextAreaElement>('#qa-reply-prompt')?.value.trim() ?? '')
      : '';
    const promptChange = Boolean(corrige && sujet.prompt && corrige !== sujet.prompt);
    const signaler = (message: string) => {
      if (erreurReponse) {
        erreurReponse.textContent = message;
        erreurReponse.hidden = false;
      }
      zoneReponse.setAttribute('aria-invalid', 'true');
      zoneReponse.focus();
    };
    // Un prompt corrigé suffit (prototype) : il est présenté avec une phrase d'introduction.
    if (texte.length < 20 && !promptChange) {
      signaler('Écrivez au moins 20 caractères pour que votre réponse soit utile.');
      return;
    }
    const corps = `${citation ? `En réponse à ${citation.auteur} : ` : ''}${texte || 'Voici une version corrigée du prompt.'}`;
    const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
    if (bouton) bouton.disabled = true;
    const resultat = await api<{ id: number }>('POST', `/api/v1/sujets/${sujet.id}/messages`, {
      corps,
      prompt: promptChange ? corrige : null,
    });
    if (bouton) bouton.disabled = false;
    if (!resultat.ok) {
      const { probleme } = resultat;
      signaler(
        probleme.erreurs?.corps ?? probleme.erreurs?.prompt ?? probleme.detail ?? probleme.title,
      );
      return;
    }
    recharger('Réponse publiée.', `reponse-${resultat.donnees.id}`);
  });

  document.addEventListener('keydown', (evenement) => {
    if ((evenement.ctrlKey || evenement.metaKey) && evenement.key === 'Enter') {
      const form = (evenement.target as Element).closest?.('[data-reply-form]');
      if (form) {
        evenement.preventDefault();
        (form as HTMLFormElement).requestSubmit();
      }
    }
  });

  document.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    const utile = cible.closest<HTMLButtonElement>('[data-useful]');
    if (utile) return void voterUtile(utile);
    const teste = cible.closest<HTMLButtonElement>('[data-tested]');
    if (teste) return void voterTeste(teste);
    const enregistrement = cible.closest<HTMLButtonElement>('[data-save]');
    if (enregistrement) return void enregistrer(enregistrement);
    const acceptation = cible.closest<HTMLButtonElement>('[data-accept]');
    if (acceptation) return void accepter(acceptation);
    const fermeture = cible.closest<HTMLButtonElement>('[data-close-topic]');
    if (fermeture) return void fermer(fermeture);
    if (cible.closest('[data-copy-link]')) return void copier(adresse, 'Lien du sujet copié.');
    const reponse = cible.closest<HTMLElement>('[data-copy-answer]');
    if (reponse)
      return void copier(
        `${adresse}#reponse-${reponse.dataset.copyAnswer}`,
        'Lien de la réponse copié.',
      );
    const blocCopie = cible.closest<HTMLElement>('[data-copy]');
    if (blocCopie) {
      const texte = blocCopie.closest('.qa-prompt')?.querySelector('code')?.textContent ?? '';
      return void copier(texte, 'Prompt copié.');
    }
    const texteCopie = cible.closest<HTMLElement>('[data-copy-text]');
    if (texteCopie) return void copier(texteCopie.dataset.copyText ?? '', 'Prompt copié.');
    const quote = cible.closest<HTMLElement>('[data-quote]');
    if (quote) return citer(quote);
    if (cible.closest('[data-unquote]')) {
      citation = null;
      const zone = $('[data-quote-zone]');
      if (zone) zone.innerHTML = '';
      zoneReponse?.focus();
      return;
    }
    const format = cible.closest<HTMLElement>('[data-format]');
    if (format && zoneReponse) entourer(zoneReponse, format.dataset.format === 'bold' ? '**' : '`');
  });

  // Arrivée sur une réponse précise (lien partagé, réponse publiée) : elle reçoit le focus.
  const ancre = location.hash.slice(1);
  if (/^reponse-\d+$/.test(ancre)) document.getElementById(ancre)?.focus({ preventScroll: true });
}
