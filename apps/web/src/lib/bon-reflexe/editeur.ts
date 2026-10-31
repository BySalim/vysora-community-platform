/* Formulaire « Proposer un cas » (APP-03, EC-11) : champs dans le style de « Poser une question »
   du forum, valeurs d'un cas à corriger. Rendu par le serveur (components/EditeurCas.astro). */

import {
  DIFFICULTES_CAS,
  LIBELLES_DIFFICULTE,
  LIMITES,
  LONGUEURS,
  type CasApi,
  type ReferentielsApi,
} from '@vysora/shared';
import { esc, icone, t } from '../explorer/elements';
import { ROUTES } from '../navigation';
import { typo } from '../texte';

export function formulaireCas(cas: CasApi | null, referentiels: ReferentielsApi | null): string {
  const L = LONGUEURS;
  const valeurs = {
    titre: cas?.titre ?? '',
    contexte: cas?.contexte ?? '',
    demandeIa: cas?.demandeIa ?? '',
    reponseIa: cas?.reponseIa ?? '',
    question: cas?.question ?? 'Que faites-vous ?',
    explication: cas?.correction?.explication ?? '',
    modele: cas?.modele?.nomCourt ?? cas?.modeleNonReference ?? '',
    etiquettes: (cas?.etiquettes ?? []).map((e) => e.libelle).join(', '),
  };
  const lesOptions = cas
    ? cas.options.map((o) => ({
        libelle: o.libelle,
        explication: cas.correction?.options.find((c) => c.id === o.id)?.explication ?? '',
        correcte: cas.correction?.optionCorrecteId === o.id,
      }))
    : [0, 1, 2].map((i) => ({ libelle: '', explication: '', correcte: i === 0 }));

  const champ = (
    id: string,
    libelle: string,
    description: string,
    controle: string,
    facultatif = false,
  ) => `<div class="qa-field" data-field="${id}">
        <label class="qa-field-label" for="${id}">${t(libelle)}${facultatif ? ' <span>Facultatif</span>' : ''}</label>
        ${description ? `<p class="qa-field-desc" id="${id}-help">${t(description)}</p>` : ''}
        ${controle}
        <p class="ex-error" id="${id}-error" hidden></p>
      </div>`;
  const zone = (id: string, lignes: number, valeur: string, max: number, indication = '') =>
    `<textarea id="${id}" name="${id}" rows="${lignes}" maxlength="${max}"${indication ? ` placeholder="${esc(indication)}"` : ''} aria-describedby="${id}-help ${id}-error">${esc(valeur)}</textarea>`;
  const option = (o: { libelle: string; explication: string; correcte: boolean }, i: number) =>
    `<fieldset class="cs-option" data-option>
        <legend>${t(`Option ${String.fromCharCode(65 + i)}`)}</legend>
        <label class="cs-juste"><input type="radio" name="cs-correcte" value="${i}"${o.correcte ? ' checked' : ''}><span>Bonne réponse</span></label>
        <label class="sr-only" for="cs-option-${i}">${t(`Texte de l’option ${String.fromCharCode(65 + i)}`)}</label>
        <textarea id="cs-option-${i}" data-option-libelle rows="2" maxlength="${L.optionLibelle.max}" placeholder="${esc(typo('Ce que fait l’apprenant'))}" aria-describedby="cs-option-${i}-error">${esc(o.libelle)}</textarea>
        <p class="ex-error" id="cs-option-${i}-error" hidden></p>
        <label class="sr-only" for="cs-explication-${i}">${t(`Explication de l’option ${String.fromCharCode(65 + i)}`)}</label>
        <textarea id="cs-explication-${i}" data-option-explication rows="2" maxlength="${L.optionExplication.max}" placeholder="${esc(typo('Pourquoi ce choix est juste ou ne l’est pas (20 caractères au moins)'))}" aria-describedby="cs-explication-${i}-error">${esc(o.explication)}</textarea>
        <p class="ex-error" id="cs-explication-${i}-error" hidden></p>
        <button class="link-btn" type="button" data-retirer-option>Retirer cette option</button>
      </fieldset>`;
  const outils = (referentiels?.outils ?? [])
    .map(
      (o) =>
        `<option value="${o.id}"${cas?.outil?.id === o.id ? ' selected' : ''}>${esc(o.nom)}</option>`,
    )
    .join('');
  const domaines = (referentiels?.categories ?? [])
    .map(
      (c) =>
        `<option value="${c.id}"${cas?.domaine?.slug === c.slug ? ' selected' : ''}>${esc(c.libelle)}</option>`,
    )
    .join('');

  return `
    <form class="qa-ask-form" data-cas-form data-cas="${cas?.id ?? ''}" novalidate>
      ${champ('cs-titre', 'Titre', 'La situation en une phrase : ce que l’IA a fait, ou ce qu’elle a répondu.', `<input id="cs-titre" name="titre" type="text" maxlength="${L.casTitre.max}" autocomplete="off" value="${esc(valeurs.titre)}" placeholder="${esc(typo('Par exemple : l’IA cite une étude qui n’existe pas'))}" aria-describedby="cs-titre-help cs-titre-error">`)}
      ${champ('cs-contexte', 'Situation', 'Le contexte de départ : qui demande quoi, et pour quel usage.', zone('cs-contexte', 3, valeurs.contexte, L.casContexte.max))}
      <div class="qa-n-row">
        ${champ('cs-demande', 'Demande faite à l’IA', 'Le prompt exact.', zone('cs-demande', 4, valeurs.demandeIa, L.casDemandeIa.max))}
        ${champ('cs-reponse', 'Réponse de l’IA', 'La réponse à juger, telle qu’elle a été donnée.', zone('cs-reponse', 4, valeurs.reponseIa, L.casReponseIa.max))}
      </div>
      <div class="qa-n-row">
        ${champ('cs-outil', 'Outil', '', `<div class="ex-select"><select id="cs-outil" name="outilId" aria-describedby="cs-outil-error"><option value="">Non précisé</option>${outils}</select>${icone('chevron-down')}</div>`, true)}
        ${champ('cs-modele', 'Version du modèle', '', `<input id="cs-modele" name="modele" type="text" maxlength="100" autocomplete="off" value="${esc(valeurs.modele)}" placeholder="Par exemple : GPT-5, Sonnet 4.5" aria-describedby="cs-modele-error">`, true)}
      </div>
      ${champ('cs-question', 'Question posée à l’apprenant', '', `<input id="cs-question" name="question" type="text" maxlength="${L.casQuestion.max}" value="${esc(valeurs.question)}" aria-describedby="cs-question-error">`)}
      <div class="qa-field" data-field="cs-options">
        <p class="qa-field-label" id="cs-options-titre">Options</p>
        <p class="qa-field-desc">${t('De deux à cinq options, dont une seule est juste. Chacune a son explication, montrée après la réponse.')}</p>
        <div class="cs-options" data-options>${lesOptions.map(option).join('')}</div>
        <p class="ex-error" id="cs-options-error" hidden></p>
        <button class="btn btn-secondary btn-sm" type="button" data-ajouter-option>${icone('plus')}Ajouter une option</button>
      </div>
      ${champ('cs-explication', 'Explication générale', `Le bon réflexe à retenir, en ${L.casExplication.min} caractères au moins.`, zone('cs-explication', 4, valeurs.explication, L.casExplication.max))}
      <div class="qa-n-row cs-trois">
        <div class="qa-field" data-field="cs-difficulte">
          <p class="qa-field-label">Difficulté</p>
          <div class="cs-difficultes" role="radiogroup" aria-label="Difficulté">${DIFFICULTES_CAS.map((d) => `<label class="cs-chip"><input type="radio" name="difficulte" value="${d}"${(cas?.difficulte ?? 'DEBUTANT') === d ? ' checked' : ''}><span>${t(LIBELLES_DIFFICULTE[d])}</span></label>`).join('')}</div>
          <p class="ex-error" id="cs-difficulte-error" hidden></p>
        </div>
        ${champ('cs-domaine', 'Domaine', '', `<div class="ex-select"><select id="cs-domaine" name="categorieId" aria-describedby="cs-domaine-error"><option value="">Non précisé</option>${domaines}</select>${icone('chevron-down')}</div>`, true)}
        ${champ('cs-duree', 'Durée (minutes)', '', `<input id="cs-duree" name="dureeMinutes" type="number" inputmode="numeric" min="${LIMITES.dureeCasMinutes.min}" max="${LIMITES.dureeCasMinutes.max}" value="${cas?.dureeMinutes ?? ''}" aria-describedby="cs-duree-error">`, true)}
      </div>
      ${champ('cs-etiquettes', 'Étiquettes', 'Cinq au plus, séparées par des virgules.', `<input id="cs-etiquettes" name="etiquettes" type="text" autocomplete="off" value="${esc(valeurs.etiquettes)}" placeholder="Par exemple : sources, droits d’auteur" aria-describedby="cs-etiquettes-help cs-etiquettes-error">`, true)}
      <p class="ex-error" data-erreur-generale role="alert" hidden></p>
      <div class="qa-ask-actions">
        <button class="btn btn-primary" type="submit">Soumettre à validation</button>
        <a class="link-btn" href="${ROUTES.bonReflexe}">Annuler</a>
      </div>
    </form>`;
}
