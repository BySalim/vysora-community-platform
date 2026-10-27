import { srcsetImage, type CreationFicheApi, type CreationProfilApi } from '@vysora/shared';
import { MOMENTS, couverture, estPortrait, extrait, nomModele } from '../creations';
import { etiquetteType, logo } from '../explorer/elements';
import { ROUTES } from '../navigation';
import { esc, t } from '../texte';
import { dateLabel, icone, outilHTML } from './elements';
import { statsCreation } from './sections';

/* Aperçu d'une création depuis le profil (prototype/profil.js : ouvrirCreation), à partir de sa
   fiche (GET /api/v1/creations/:id). « Voir la fiche » y mène ; le prototype n'avait pas de fiche
   à ouvrir. */

const momentHTML = (m: CreationFicheApi['etapes'][number]['moments'][number] | undefined) =>
  m
    ? `<p class="pf-v-moment">${icone('moment', 'icon-sm')}<b>${t(MOMENTS[m.type].nature)}</b><span>${t(extrait(m.explication ?? m.titre ?? '', 220))}</span></p>`
    : '';

/** Le chemin parcouru : les étapes d'un projet avec leurs échanges, les échanges d'une itération,
    le prompt d'un « 1 prompt » (comme la fiche). */
function chemin(fiche: CreationFicheApi): string {
  const etapes = fiche.type === 'PROJET' ? fiche.etapes : fiche.etapes.slice(0, 1);
  return etapes
    .map((e) => {
      const echanges = fiche.type === 'UN_PROMPT' ? e.echanges.slice(0, 1) : e.echanges;
      const prompts = echanges
        .filter((x) => x.prompt?.trim())
        .map((x) => {
          const configuration =
            e.configurations.find((c) => c.id === x.configurationId) ?? e.configurations[0];
          const outil = configuration?.outil;
          return `<li class="pf-v-prompt">${outil ? `<p class="pf-v-outil">${outilHTML(outil, configuration ? nomModele(configuration) : null)}</p>` : ''}<p class="pf-v-texte">${t(extrait(x.prompt ?? '', 240))}</p>${momentHTML(e.moments.find((m) => m.echangeId === x.id))}</li>`;
        })
        .join('');
      if (fiche.type !== 'PROJET') return prompts;
      const momentEtape = e.moments.find((m) => m.echangeId === null);
      return `<li class="pf-v-etape"><p class="pf-v-etape-titre">${t(e.titre ?? `Étape ${e.ordre + 1}`)}</p>${e.recit ? `<p>${t(extrait(e.recit, 180))}</p>` : ''}${momentHTML(momentEtape)}</li>${prompts}`;
    })
    .join('');
}

/** Image ou aperçu du résultat, en grand. */
function media(
  fiche: CreationFicheApi,
  carte: CreationProfilApi,
): { html: string; classe: string } {
  const image = couverture(fiche);
  if (image) {
    const portrait = estPortrait(image);
    return {
      html: `<img src="${esc(image.url)}" srcset="${esc(srcsetImage(image))}" sizes="(min-width: 900px) 760px, 92vw" alt="${t(image.texteAlternatif)}" width="${image.largeur}" height="${image.hauteur}">`,
      classe: portrait ? ' is-affiche' : '',
    };
  }
  if (fiche.resultat?.nature === 'CODE')
    return {
      html: `<div class="mock" role="img" aria-label="${t(fiche.titre ?? '')}"><div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>${esc(fiche.resultat.nom ?? 'Code')}</span></div><pre>${esc(fiche.resultat.texte.split('\n').slice(0, 18).join('\n'))}</pre></div></div>`,
      classe: '',
    };
  if (fiche.resultat?.nature === 'TEXTE')
    return {
      html: `<div class="mock" role="img" aria-label="${t(fiche.titre ?? '')}"><div class="mock-paper">${fiche.resultat.texte
        .slice(0, 900)
        .split(/\n{2,}/)
        .filter((x) => x.trim())
        .map((x) => `<p>${t(x.trim())}</p>`)
        .join('')}</div></div>`,
      classe: '',
    };
  const outil = carte.outils[0]?.outil;
  return {
    html: `<div class="pf-tv" aria-hidden="true">${outil ? `<p class="pf-tv-outil">${logo(outil, 18)}${t(outil.nom)}</p>` : ''}<p class="pf-tv-texte">${t(extrait(carte.apercu ?? fiche.objectif ?? '', 480))}</p></div>`,
    classe: ' is-texte',
  };
}

/** Contenu de la fenêtre d'aperçu. */
export function vueHTML(fiche: CreationFicheApi, carte: CreationProfilApi, prive: boolean): string {
  const premierPrompt = fiche.etapes.flatMap((e) => e.echanges).find((x) => x.prompt?.trim());
  const m = media(fiche, carte);
  const meta = [
    fiche.datePublication ? `Publiée le ${dateLabel(fiche.datePublication)}` : '',
    fiche.categorie?.libelle ?? '',
    fiche.licence.libelle,
  ].filter(Boolean);
  return `<div class="pf-v-barre"><span>${etiquetteType(fiche.type)}</span><button class="icon-btn" type="button" data-pf-vue-fermer aria-label="Fermer l’aperçu">${icone('close', '')}</button></div>
      <div class="pf-v-corps">
        <div class="pf-v-media${m.classe}">${m.html}</div>
        <div class="pf-v-texte-zone">
          <h2 id="pf-vue-titre">${t(fiche.titre ?? '')}</h2>
          <p class="pf-v-meta">${t(meta.join(' · '))}</p>
          ${fiche.objectif ? `<p class="pf-v-objectif">${t(fiche.objectif)}</p>` : ''}
          ${statsCreation(carte)}
          <h3>Le chemin parcouru</h3>
          <ol class="pf-v-chemin">${chemin(fiche)}</ol>
          ${fiche.limites ? `<h3>Limites constatées</h3><p class="pf-v-limites">${t(fiche.limites)}</p>` : ''}
        </div>
      </div>
      <div class="pf-v-pied">
        ${prive ? `<a class="btn btn-secondary" href="${ROUTES.modifierCreation(fiche.id)}">${icone('pen')}Modifier la création</a>` : premierPrompt ? `<button class="btn btn-secondary" type="button" data-pf-copier-prompt="${premierPrompt.id}">${icone('copy')}Copier le prompt</button>` : ''}
        <a class="btn btn-primary" href="${esc(ROUTES.creation(fiche.id, fiche.slug))}">Voir la fiche</a>
      </div>`;
}
