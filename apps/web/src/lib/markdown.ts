import MarkdownIt from 'markdown-it';
import { esc, typo } from './texte';

/* SEC-01, ENF-06 : textes rédigés par les membres (récits d'étapes, réponses de l'IA, corps des
   sujets et des réponses, commentaires), rendus en HTML par le serveur du site.
   - Aucun HTML brut : une balise écrite par un membre s'affiche comme du texte.
   - Le code (en ligne ou en bloc) est affiché tel quel, jamais exécuté ni coloré.
   - Liens : seulement http(s), mailto et les adresses du site ; un lien externe est signalé comme
     contenu d'utilisateur non recommandé (rel="ugc nofollow") et s'ouvre dans un nouvel onglet.
   - Pas d'image en Markdown : les images passent par le téléversement (RG-16).
   - Les titres d'un texte restent sous ceux de la page (h4 à h6).
   - Typographie française appliquée au texte courant, jamais au code. */

const md = new MarkdownIt('default', { html: false, linkify: true, breaks: true });
md.disable(['image']);
// Seules les adresses complètes deviennent des liens : « app.js » ou « nom.fr » restent du texte.
md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });

const LIEN_PERMIS = /^(?:https?:\/\/|mailto:|\/(?!\/))/i;
const LIEN_EXTERNE = /^(?:https?:|mailto:)/i;
md.validateLink = (adresse) => LIEN_PERMIS.test(adresse.trim());

md.renderer.rules.text = (jetons, i) => esc(typo(jetons[i]?.content ?? ''));

md.renderer.rules.link_open = (jetons, i, options, _env, rendu) => {
  const jeton = jetons[i];
  if (jeton && LIEN_EXTERNE.test(String(jeton.attrGet('href') ?? ''))) {
    jeton.attrSet('rel', 'ugc nofollow noopener noreferrer');
    jeton.attrSet('target', '_blank');
    jeton.meta = { externe: true };
  }
  return rendu.renderToken(jetons, i, options);
};

md.renderer.rules.link_close = (jetons, i, options, _env, rendu) => {
  // Lien ouvrant correspondant : le dernier link_open avant ce jeton.
  let ouverture = i - 1;
  while (ouverture >= 0 && jetons[ouverture]?.type !== 'link_open') ouverture -= 1;
  const externe = (jetons[ouverture]?.meta as { externe?: boolean } | null)?.externe;
  return `${externe ? '<span class="sr-only"> (nouvel onglet)</span>' : ''}${rendu.renderToken(jetons, i, options)}`;
};

const decalerTitre = (jetons: { tag: string }[], i: number) => {
  const jeton = jetons[i];
  if (jeton) jeton.tag = `h${Math.min(6, Number(jeton.tag.slice(1)) + 3)}`;
};
md.renderer.rules.heading_open = (jetons, i, options, _env, rendu) => {
  decalerTitre(jetons, i);
  return rendu.renderToken(jetons, i, options);
};
md.renderer.rules.heading_close = (jetons, i, options, _env, rendu) => {
  decalerTitre(jetons, i);
  return rendu.renderToken(jetons, i, options);
};

/** HTML sûr d'un texte rédigé en Markdown par un membre (paragraphes, listes, code, liens…). */
export function rendreMarkdown(source: string | null | undefined): string {
  return source ? md.render(source) : '';
}

/** HTML sûr d'un texte court, sans paragraphe : mise en valeur, code et liens seulement. */
export function rendreMarkdownEnLigne(source: string | null | undefined): string {
  return source ? md.renderInline(source) : '';
}
