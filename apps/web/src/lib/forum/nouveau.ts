import type { FamilleOutil, TypeSujet } from '@vysora/shared';
import { icone } from '../explorer/elements';
import { FAMILLES } from '../publier/donnees';
import { esc, t } from '../texte';
import { ORDRE_TYPES, TYPES, libelleType } from './donnees';

/* Nouveau sujet du forum, repris de prototype/forum.js (renderAsk, HELP, publishTopic). Écart retenu
   (registre, « Texte d'une astuce ») : une astuce se présente en 30 caractères au moins (RG-60),
   à la place de « Ce que le changement a produit », qui n'a pas encore de colonne. */

/** Touche de chaque type (prototype : KINDS.letter). */
export const TOUCHES: Record<TypeSujet, string> = {
  QUESTION: 'A',
  CLINIQUE: 'B',
  ASTUCE: 'C',
  RETOUR_EXPERIENCE: 'D',
  DISCUSSION: 'E',
};

/** Aide de chaque champ (prototype : HELP). */
export const AIDES: Record<string, [titre: string, texte: string, conseils: string[]]> = {
  'qa-n-title': [
    'Écrire un bon titre',
    'Votre titre résume le problème en une phrase, comme si vous le posiez à un collègue.',
    [
      'Mentionnez le résultat obtenu, pas seulement l’outil.',
      'Évitez « Aide » ou « Problème » seuls : ils ne disent rien du sujet.',
    ],
  ],
  'qa-n-tool': [
    'L’outil et sa version',
    'Une solution peut dépendre de la version du modèle. Les membres qui utilisent le même outil verront votre question en premier.',
    [],
  ],
  'qa-n-context': [
    'Le contexte',
    'Une ou deux phrases sur votre projet aident les membres à proposer une correction adaptée.',
    ['Par exemple : une série de portraits pour un album illustré.'],
  ],
  'qa-n-prompt': [
    'Le prompt utilisé',
    'Collez le prompt exact, tel que vous l’avez envoyé. Un résumé fait perdre les détails qui expliquent souvent le problème.',
    [],
  ],
  'qa-n-got': [
    'Le résultat obtenu',
    'Décrivez ce que l’IA a produit, avec un exemple précis si possible.',
    [],
  ],
  'qa-n-expected': [
    'Le résultat attendu',
    'Décrivez ce que vous vouliez obtenir. L’écart entre les deux guide les réponses.',
    [],
  ],
  'qa-n-before': ['Le prompt avant', 'Le prompt d’origine, avant votre changement.', []],
  'qa-n-after': [
    'Le prompt après',
    'Le prompt corrigé : les différences seront surlignées pour les lecteurs.',
    [],
  ],
  'qa-n-presentation': [
    'Présenter votre astuce',
    'Dites en quelques phrases ce que l’astuce change et dans quel cas elle sert.',
    ['Par exemple : le texte d’un logo reste exact quand il est isolé entre guillemets.'],
  ],
  'qa-n-body': [
    'Le détail de votre question',
    'Dites ce que vous avez déjà essayé, ce qui s’est passé, et ce que vous attendiez.',
    [
      'Une seule question par sujet.',
      'Les exemples concrets reçoivent des réponses plus précises.',
    ],
  ],
  'qa-n-tags': [
    'Les étiquettes',
    'De une à cinq étiquettes décrivent le thème. Les membres suivent les étiquettes qui les concernent.',
    ['Exemples : logo, script, traduction.'],
  ],
};

export function aideHTML(id: string): string {
  const [titre, texte, conseils] = AIDES[id] ?? AIDES['qa-n-title']!;
  const liste = conseils.length
    ? `<ul class="qa-help-list">${conseils.map((c) => `<li>${icone('check')}<span>${t(c)}</span></li>`).join('')}</ul>`
    : '';
  return `<h2>${icone('bulb')}${t(titre)}</h2><p>${t(texte)}</p>${liste}`;
}

export interface OutilFormulaire {
  id: number;
  nom: string;
  slug: string;
  famille: FamilleOutil;
}

export interface ContexteNouveau {
  type: TypeSujet;
  titre: string;
  /** Outil choisi d'avance (filtre de la liste, outils suivis). */
  outil: string;
  outils: OutilFormulaire[];
  creations: { id: number; titre: string }[];
  creation: number | null;
}

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

const zone = (id: string, lignes: number, indication = '') =>
  `<textarea id="${id}" name="${id}" rows="${lignes}"${indication ? ` placeholder="${esc(indication)}"` : ''} aria-describedby="${id}-help ${id}-error"></textarea>`;

/** Formulaire complet (prototype : renderAsk). Le script reprend le brouillon et l'aide. */
export function formulaireHTML(c: ContexteNouveau): string {
  const options = FAMILLES.map((f) => {
    const outils = c.outils.filter((o) => o.famille === f.id);
    if (!outils.length) return '';
    return `<optgroup label="${esc(f.label)}">${outils.map((o) => `<option value="${o.id}" data-slug="${esc(o.slug)}"${o.slug === c.outil ? ' selected' : ''}>${esc(o.nom)}</option>`).join('')}</optgroup>`;
  }).join('');
  const creations = c.creations
    .map(
      (cr) =>
        `<option value="${cr.id}"${cr.id === c.creation ? ' selected' : ''}>${t(cr.titre)}</option>`,
    )
    .join('');
  return `
      <div class="qa-main qa-ask">
        <h1 id="qa-title" tabindex="-1">Poser une question</h1>
        <section class="qa-box is-guide qa-ask-intro" aria-labelledby="qa-ask-intro-title">
          <h2 id="qa-ask-intro-title">Rédiger une question qui reçoit une réponse</h2>
          <p>Les membres répondent plus vite à une question précise. Avant de publier :</p>
          <ol class="qa-steps-mini"><li>Résumez le problème dans le titre.</li><li>Collez le prompt exact et décrivez l’écart entre le résultat obtenu et le résultat attendu.</li><li>Indiquez l’outil, la version du modèle et une à cinq étiquettes.</li><li>Vérifiez les sujets semblables : votre réponse existe peut-être déjà.</li></ol>
        </section>
        <form class="qa-ask-form" data-compose-form novalidate>
          <fieldset class="qa-kinds" data-types>
            <legend>Type de sujet <span>Touches A à E</span></legend>
            ${ORDRE_TYPES.map((type) => `<label class="qa-kind-opt"><input type="radio" name="type" value="${type}"${type === c.type ? ' checked' : ''}><kbd aria-hidden="true">${TOUCHES[type]}</kbd><span><b>${icone(TYPES[type].icone)}${t(libelleType(type))}</b><span>${t(TYPES[type].aide)}</span></span></label>`).join('')}
          </fieldset>
          ${champ('qa-n-title', 'Titre', 'Soyez précis et imaginez que vous posez la question à quelqu’un.', `<input id="qa-n-title" name="qa-n-title" type="text" maxlength="150" autocomplete="off" value="${esc(c.titre)}" placeholder="Par exemple : le visage de mon personnage change d’une image à l’autre" aria-describedby="qa-n-title-help qa-n-title-error">`)}
          <section class="qa-similar" aria-live="polite" data-similar hidden></section>
          <div class="qa-n-row">
            ${champ('qa-n-tool', 'Outil', '', `<div class="ex-select"><select id="qa-n-tool" name="qa-n-tool" aria-describedby="qa-n-tool-error">${options}</select>${icone('chevron-down')}</div>`)}
            ${champ('qa-n-model', 'Version du modèle', '', `<input id="qa-n-model" name="qa-n-model" type="text" autocomplete="off" placeholder="Par exemple : v7, GPT-5, Sonnet 4.5" aria-describedby="qa-n-model-error">`, true)}
          </div>
          <div class="qa-n-kind" data-for="CLINIQUE">
            ${champ('qa-n-context', 'Contexte', 'Ce que vous cherchez à produire, en une ou deux phrases.', zone('qa-n-context', 2), true)}
            ${champ('qa-n-prompt', 'Prompt utilisé', 'Le prompt exact, tel que vous l’avez envoyé.', zone('qa-n-prompt', 3))}
            <div class="qa-n-row">
              ${champ('qa-n-got', 'Résultat obtenu', 'Ce que l’IA a produit.', zone('qa-n-got', 3))}
              ${champ('qa-n-expected', 'Résultat attendu', 'Ce que vous vouliez obtenir.', zone('qa-n-expected', 3))}
            </div>
          </div>
          <div class="qa-n-kind" data-for="ASTUCE">
            <div class="qa-n-row">
              ${champ('qa-n-before', 'Prompt avant', 'Au moins 20 caractères.', zone('qa-n-before', 4))}
              ${champ('qa-n-after', 'Prompt après', 'Au moins 20 caractères.', zone('qa-n-after', 4))}
            </div>
            ${champ('qa-n-presentation', 'Présentez votre astuce', 'Au moins 30 caractères : ce que le changement a produit, et quand s’en servir.', zone('qa-n-presentation', 3))}
          </div>
          <div class="qa-n-kind" data-for="QUESTION RETOUR_EXPERIENCE DISCUSSION">
            ${champ('qa-n-body', 'Détail de votre question', 'Au moins 30 caractères : ce que vous avez essayé, ce qui s’est passé, ce que vous attendiez.', zone('qa-n-body', 7))}
          </div>
          ${champ('qa-n-tags', 'Étiquettes', 'De une à cinq, séparées par des virgules.', `<input id="qa-n-tags" name="qa-n-tags" type="text" autocomplete="off" placeholder="Par exemple : logo, typographie" aria-describedby="qa-n-tags-help qa-n-tags-error">`)}
          ${champ('qa-n-creation', 'Création liée', 'Reliez votre question à l’une de vos créations publiées sur Vysora.', `<div class="ex-select"><select id="qa-n-creation" name="qa-n-creation"><option value="">Aucune</option>${creations}</select>${icone('chevron-down')}</div>`, true)}
          <div class="qa-ask-actions">
            <button class="btn btn-primary" type="submit">Publier votre question</button>
            <button class="link-btn" type="button" data-discard>Abandonner le brouillon</button>
            <span class="qa-draft" data-draft-status aria-live="polite"></span>
          </div>
        </form>
      </div>`;
}

/** Champ du formulaire qui reçoit l'erreur d'un chemin de l'API (schemaSujet). */
export function champDeLErreur(chemin: string, type: TypeSujet): string | null {
  const racine = chemin.split('.')[0] ?? '';
  if (chemin === 'clinique.prompt') return 'qa-n-prompt';
  if (chemin === 'clinique.obtenu') return 'qa-n-got';
  if (chemin === 'clinique.attendu') return 'qa-n-expected';
  const champs: Record<string, string> = {
    titre: 'qa-n-title',
    exempleAvant: 'qa-n-before',
    exempleApres: 'qa-n-after',
    outilId: 'qa-n-tool',
    modeleId: 'qa-n-model',
    modeleNonReference: 'qa-n-model',
    etiquettes: 'qa-n-tags',
    creationId: 'qa-n-creation',
  };
  if (racine === 'corps')
    return type === 'CLINIQUE'
      ? 'qa-n-context'
      : type === 'ASTUCE'
        ? 'qa-n-presentation'
        : 'qa-n-body';
  return champs[racine] ?? null;
}
