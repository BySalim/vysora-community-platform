/* Proposer ou corriger un cas Bon réflexe (APP-03, F-60, RG-70, RG-71) : options ajoutées ou
   retirées (deux à cinq), saisie contrôlée avec le schéma de l'API, envoi par POST ou PUT
   /api/v1/cas, erreurs placées sous leur champ, puis retour à Apprendre avec un message. */

import { erreursParChamp, schemaCas, type CasApi } from '@vysora/shared';
import { ROUTES } from '../lib/navigation';
import { api } from './commun/api';
import { $, $$, messageApresChargement, typo } from './commun/outils';

const formulaire = $<HTMLFormElement>('[data-cas-form]');

if (formulaire) {
  const casId = Number(formulaire.dataset.cas) || null;
  const liste = $('[data-options]', formulaire)!;
  const valeur = (selecteur: string) =>
    $<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      selecteur,
      formulaire,
    )?.value.trim() ?? '';
  const nombre = (selecteur: string) => (valeur(selecteur) ? Number(valeur(selecteur)) : null);

  /** Renumérote les options (lettres, identifiants, valeurs des boutons radio). */
  function numeroter(): void {
    const options = $$<HTMLFieldSetElement>('[data-option]', liste);
    options.forEach((o, i) => {
      const lettre = String.fromCharCode(65 + i);
      $('legend', o)!.textContent = `Option ${lettre}`;
      $<HTMLInputElement>('input[type="radio"]', o)!.value = String(i);
      for (const [attribut, base] of [
        ['data-option-libelle', 'cs-option'],
        ['data-option-explication', 'cs-explication'],
      ] as const) {
        const zone = $<HTMLTextAreaElement>(`[${attribut}]`, o)!;
        zone.id = `${base}-${i}`;
        zone.setAttribute('aria-describedby', `${base}-${i}-error`);
        const erreur = zone.nextElementSibling as HTMLElement | null;
        if (erreur) erreur.id = `${base}-${i}-error`;
        const etiquette = zone.previousElementSibling as HTMLLabelElement | null;
        if (etiquette) etiquette.htmlFor = zone.id;
      }
      $<HTMLButtonElement>('[data-retirer-option]', o)!.hidden = options.length <= 2;
    });
    $<HTMLButtonElement>('[data-ajouter-option]', formulaire!)!.hidden = options.length >= 5;
  }

  formulaire.addEventListener('click', (evenement) => {
    const cible = evenement.target as Element;
    if (cible.closest('[data-ajouter-option]')) {
      const modele = $<HTMLFieldSetElement>('[data-option]', liste)!;
      const copie = modele.cloneNode(true) as HTMLFieldSetElement;
      for (const zone of $$<HTMLTextAreaElement>('textarea', copie)) zone.value = '';
      $<HTMLInputElement>('input[type="radio"]', copie)!.checked = false;
      for (const erreur of $$<HTMLElement>('.ex-error', copie)) erreur.hidden = true;
      liste.append(copie);
      numeroter();
      $<HTMLTextAreaElement>('textarea', copie)?.focus();
    }
    const retirer = cible.closest('[data-retirer-option]');
    if (retirer) {
      retirer.closest('[data-option]')?.remove();
      numeroter();
    }
  });

  function saisie() {
    const options = $$<HTMLFieldSetElement>('[data-option]', liste).map((o) => ({
      libelle: $<HTMLTextAreaElement>('[data-option-libelle]', o)!.value,
      explication: $<HTMLTextAreaElement>('[data-option-explication]', o)!.value,
      correcte: $<HTMLInputElement>('input[type="radio"]', o)!.checked,
    }));
    return {
      titre: valeur('#cs-titre'),
      contexte: valeur('#cs-contexte'),
      demandeIa: valeur('#cs-demande'),
      reponseIa: valeur('#cs-reponse'),
      question: valeur('#cs-question'),
      explication: valeur('#cs-explication'),
      difficulte: $<HTMLInputElement>('input[name="difficulte"]:checked', formulaire!)?.value,
      categorieId: nombre('#cs-domaine'),
      dureeMinutes: nombre('#cs-duree'),
      outilId: nombre('#cs-outil'),
      modeleNonReference: valeur('#cs-modele') || null,
      etiquettes: valeur('#cs-etiquettes')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
      options,
    };
  }

  const CHAMPS: Record<string, string> = {
    titre: 'cs-titre',
    contexte: 'cs-contexte',
    demandeIa: 'cs-demande',
    reponseIa: 'cs-reponse',
    question: 'cs-question',
    explication: 'cs-explication',
    difficulte: 'cs-difficulte',
    categorieId: 'cs-domaine',
    dureeMinutes: 'cs-duree',
    outilId: 'cs-outil',
    modeleNonReference: 'cs-modele',
    etiquettes: 'cs-etiquettes',
    options: 'cs-options',
  };
  /** Identifiant du champ d'une erreur (« options.1.explication » → cs-explication-1). */
  function champDe(chemin: string): string {
    const [racine, rang, sous] = chemin.split('.');
    if (racine === 'options' && rang !== undefined && sous)
      return `${sous === 'explication' ? 'cs-explication' : 'cs-option'}-${rang}`;
    return CHAMPS[racine ?? ''] ?? '';
  }

  function afficher(erreurs: Record<string, string>): void {
    for (const zone of $$<HTMLElement>('.ex-error', formulaire!)) {
      zone.hidden = true;
      zone.textContent = '';
    }
    for (const champ of $$('[aria-invalid="true"]', formulaire!))
      champ.removeAttribute('aria-invalid');
    let premier: HTMLElement | null = null;
    for (const [chemin, message] of Object.entries(erreurs)) {
      const id = champDe(chemin);
      const zone = id
        ? document.getElementById(`${id}-error`)
        : $('[data-erreur-generale]', formulaire!);
      if (!zone || !zone.hidden) continue;
      zone.textContent = typo(message);
      zone.hidden = false;
      const controle = id ? document.getElementById(id) : null;
      controle?.setAttribute('aria-invalid', 'true');
      premier ??= controle ?? zone;
    }
    premier?.focus();
  }

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const resultat = schemaCas.safeParse(saisie());
    if (!resultat.success) return afficher(erreursParChamp(resultat.error));
    afficher({});
    const envoyer = $<HTMLButtonElement>('button[type="submit"]', formulaire);
    if (envoyer) envoyer.disabled = true;
    const reponse = await api<CasApi>(
      casId ? 'PUT' : 'POST',
      casId ? `/api/v1/cas/${casId}` : '/api/v1/cas',
      resultat.data,
    );
    if (envoyer) envoyer.disabled = false;
    if (reponse.ok) {
      messageApresChargement(
        'Cas soumis à validation. La modération le relit avant sa publication.',
      );
      window.location.assign(ROUTES.bonReflexe);
      return;
    }
    const { erreurs, detail, title, status } = reponse.probleme;
    if (erreurs && Object.keys(erreurs).length) return afficher(erreurs);
    afficher({
      _:
        status === 409 || status === 403
          ? (detail ?? title)
          : 'Le cas n’a pas été envoyé. Réessayez dans un instant.',
    });
  });

  numeroter();
}
