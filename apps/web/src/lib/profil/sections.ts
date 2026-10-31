import {
  NIVEAUX,
  type ContributionProfilApi,
  type CreationProfilApi,
  type OutilResumeApi,
  type ProfilApi,
} from '@vysora/shared';
import { LIBELLES_TYPE } from '../creations';
import { avatar, etiquetteType, image, logo } from '../explorer/elements';
import { ROUTES } from '../navigation';
import { esc, fmt, t } from '../texte';
import {
  dateLabel,
  dateLongue,
  emblemeBadge,
  enTete,
  etatVide,
  hexagone,
  icone,
  jour,
  lienAffiche,
  moisAnnee,
  outilHTML,
  photoHTML,
  prenom,
  type ContexteProfil,
} from './elements';

/* Sections du profil (prototype/profil.js : renderHero, renderChiffres, renderNav, renderCreations,
   renderContributions, renderApropos, renderBadges, renderApercu). */

const CLE_TYPE = { UN_PROMPT: 'prompt', ITERATION: 'iteration', PROJET: 'projet' } as const;
/** Six créations, puis « Afficher N de plus » (prototype : CREATIONS_VISIBLES). */
export const CREATIONS_VISIBLES = 6;
export const CONTRIBUTIONS_VISIBLES = 6;

/** Niveau suivant et points qui y mènent. */
export function niveauSuivant(points: number) {
  return NIVEAUX.find((n) => n.seuilPoints > points) ?? null;
}

/** Étapes pour compléter un profil récent (prototype : etapesGuide). */
export function etapesGuide(p: ProfilApi) {
  return [
    {
      fait: Boolean(p.membre.avatar),
      titre: 'Ajouter une photo',
      texte: 'Les membres reconnaissent plus vite vos réponses.',
      action: 'photo',
    },
    {
      fait: Boolean(p.membre.biographie),
      titre: 'Écrire votre biographie',
      texte: 'Ce que vous créez avec l’IA, en quelques lignes.',
      action: 'bio',
    },
    {
      fait: Boolean(p.membre.lien),
      titre: 'Ajouter un lien personnel',
      texte: 'Portfolio, site ou dépôt de code.',
      action: 'lien',
    },
    {
      fait: (p.prive?.apprentissage.reproductionsDeclarees ?? 0) > 0,
      titre: 'Déclarer un premier essai',
      texte: 'Reproduisez une création et partagez votre résultat.',
      lien: ROUTES.explorer,
    },
    {
      fait: p.statistiques.creations > 0,
      titre: 'Publier une première création',
      texte: 'Le résultat obtenu, et le chemin parcouru pour y arriver.',
      lien: ROUTES.publier,
    },
  ];
}

/** « Complétez votre profil » : rendu masqué, le script le montre s'il n'a pas été fermé sur cet
    appareil. */
function guideHTML(p: ProfilApi): string {
  const etapes = etapesGuide(p);
  const faites = etapes.filter((e) => e.fait).length;
  if (etapes.length - faites < 2) return '';
  return `<div class="container" data-pf-guide hidden><div class="pf-guide" aria-labelledby="pf-t-guide">
        <div class="pf-guide-tete">
          <div><h2 id="pf-t-guide">Complétez votre profil</h2><p>${t(`${faites} ${faites > 1 ? 'étapes terminées' : 'étape terminée'} sur ${etapes.length}`)}</p></div>
          <span class="pf-guide-jauge" role="img" aria-label="${t(`${faites} étapes terminées sur ${etapes.length}`)}"><i style="--v:${faites / etapes.length}"></i></span>
          <button class="icon-btn" type="button" data-pf-guide-masquer aria-label="Masquer ces étapes">${icone('close', '')}</button>
        </div>
        <ol class="pf-guide-liste">${etapes
          .map(
            (e) => `<li class="${e.fait ? 'is-fait' : ''}">
          <span class="pf-guide-coche" aria-hidden="true">${icone(e.fait ? 'check' : 'plus', '')}</span>
          <span class="pf-guide-texte"><b>${t(e.titre)}</b><span>${t(e.texte)}</span></span>
          ${e.fait ? '<span class="sr-only">Terminé</span>' : e.action ? `<button class="link-btn" type="button" data-pf-modifier="${e.action}">Ajouter<span class="sr-only"> : ${t(e.titre)}</span></button>` : `<a class="link-btn" href="${e.lien}">Commencer<span class="sr-only"> : ${t(e.titre)}</span></a>`}
        </li>`,
          )
          .join('')}</ol>
      </div></div>`;
}

/** En-tête du profil (prototype : renderHero). « Suivre » et « Signaler le profil » ne sont pas
    repris : les abonnements viennent en V2, et un signalement vise un contenu (F-90). */
export function heroHTML(p: ProfilApi, c: ContexteProfil): string {
  const m = p.membre;
  const suivant = niveauSuivant(m.reputation);
  const actions = c.prive
    ? `<button class="btn btn-secondary" type="button" data-pf-modifier>${icone('pen')}Modifier le profil</button>
         <a class="btn btn-quiet" href="?vue=public" data-pf-apercu-on>${icone('eye')}Aperçu public</a>
         <button class="icon-btn" type="button" data-pf-partager aria-label="Partager le profil">${icone('share', '')}</button>`
    : `<button class="btn btn-quiet" type="button" data-pf-partager>${icone('share')}Partager le profil</button>`;
  const role =
    m.role === 'MEMBRE'
      ? ''
      : `<span class="pf-sep" aria-hidden="true">·</span><span class="pf-role">${icone('shield', 'icon-sm')}${m.role === 'ADMINISTRATEUR' ? 'Administration' : 'Modération'}</span>`;
  const bio = m.biographie
    ? `<p class="pf-bio pf-entree" style="--i:3" data-pf-zone="bio">${t(m.biographie)}</p>`
    : c.prive
      ? `<p class="pf-bio pf-bio-vide pf-entree" style="--i:3"><button class="link-btn" type="button" data-pf-modifier="bio">${icone('plus', 'icon-sm')}Ajouter une biographie</button></p>`
      : '';
  const lien = m.lien
    ? `<li data-pf-zone="lien">${icone('link', 'icon-sm')}<a href="${esc(m.lien)}" rel="noopener nofollow ugc" target="_blank">${t(lienAffiche(m.lien))}<span class="sr-only"> (nouvel onglet)</span></a></li>`
    : c.prive
      ? `<li><button class="link-btn" type="button" data-pf-modifier="lien">${icone('plus', 'icon-sm')}Ajouter un lien</button></li>`
      : '';
  return `
      <div class="pf-bandeau" aria-hidden="true"></div>
      <div class="container pf-hero-in">
        <div class="pf-photo-zone pf-entree" style="--i:0">
          ${photoHTML(m, 148, 'pf-photo-hero', c.prive)}
          ${c.prive ? `<button class="pf-photo-btn" type="button" data-pf-modifier="photo" aria-label="${m.avatar ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}">${icone('camera', '')}</button>` : ''}
        </div>
        <div class="pf-identite">
          ${c.prive ? `<p class="kicker pf-entree" style="--i:1">${icone('user')}Mon profil</p>` : ''}
          <h1 id="pf-nom" class="pf-entree" style="--i:1">${t(m.nom)}</h1>
          <p class="pf-pseudo pf-entree" style="--i:2">@${esc(m.pseudo)}</p>
          <p class="pf-niveau pf-entree" style="--i:2">
            <span class="pf-niveau-nom">${hexagone()}<b>${t(m.niveau.libelle)}</b></span>
            <span class="pf-sep" aria-hidden="true">·</span><span>${t(`${fmt(m.reputation)} points`)}</span>
            ${role}
            ${c.prive && suivant ? `<a class="pf-prochain" href="#progression">${t(`${fmt(suivant.seuilPoints - m.reputation)} points avant ${suivant.libelle}`)}</a>` : ''}
          </p>
          ${bio}
          <ul class="pf-meta pf-entree" style="--i:4">
            <li>${icone('calendar', 'icon-sm')}${t(`Membre depuis ${moisAnnee(m.dateInscription)}`)}</li>
            ${lien}
          </ul>
        </div>
        <div class="pf-actions pf-entree" style="--i:3">${actions}</div>
      </div>
      ${c.prive ? guideHTML(p) : ''}`;
}

/** Statistiques publiques (prototype : renderChiffres, F-73). */
export function chiffresHTML(p: ProfilApi): string {
  const s = p.statistiques;
  const items: [string, number, string][] = [
    ['Créations publiées', s.creations, ''],
    ['Votes « Utile » reçus', s.utiles, ''],
    [
      'Reproductions reçues',
      s.reproductions,
      s.tauxReussite !== null ? `${s.tauxReussite} % de succès` : '',
    ],
    ['Réponses acceptées', s.reponsesAcceptees, ''],
    ['Vues cumulées', s.vues, ''],
  ];
  return `<div class="container"><dl class="pf-chiffres-in">${items
    .map(
      ([libelle, valeur, sous], i) => `<div class="pf-chiffre" style="--i:${i}">
      <dt>${t(libelle)}</dt><dd><span class="pf-valeur" data-pf-compter="${valeur}">${t(fmt(valeur))}</span>${sous ? `<small>${t(sous)}</small>` : ''}</dd>
    </div>`,
    )
    .join('')}</dl></div>`;
}

/** Barre des sections (prototype : renderNav). */
export function navHTML(p: ProfilApi, c: ContexteProfil) {
  const liens: [string, string][] = [
    ...(c.prive
      ? [['progression', `${icone('lock', 'icon-xs')}Progression`] as [string, string]]
      : []),
    ['creations', `Créations<span class="pf-nav-nb">${fmt(p.statistiques.creations)}</span>`],
    ['contributions', 'Contributions'],
    ['badges', `Badges<span class="pf-nav-nb">${fmt(p.badges.length)}</span>`],
  ];
  return {
    ancres: liens
      .map(
        ([id, libelle], i) =>
          `<a href="#${id}"${i === 0 ? ' aria-current="location"' : ''}>${libelle}</a>`,
      )
      .join(''),
    mini: `${photoHTML(p.membre, 32, 'pf-photo-mini', c.prive)}<b>${t(p.membre.nom)}</b>`,
    actions: c.apercu
      ? `<a class="btn btn-sm btn-secondary" href="?" data-pf-apercu-off>${icone('close', 'icon-sm')}Quitter l’aperçu</a>`
      : c.prive
        ? `<button class="btn btn-sm btn-quiet" type="button" data-pf-modifier>${icone('pen', 'icon-sm')}Modifier</button>`
        : `<button class="btn btn-sm btn-quiet" type="button" data-pf-partager>${icone('share', 'icon-sm')}Partager</button>`,
  };
}

/* Créations ------------------------------------------------------------------------------------- */

export interface EtatCreations {
  type: 'toutes' | CreationProfilApi['type'];
  tri: 'recentes' | 'utiles';
  completes: boolean;
}

/** Vignette (prototype : mediaHTML) : l'image du résultat ; à défaut le code ou le texte obtenu ; à
    défaut le début du premier prompt, décoratif (prototype : texteHTML). */
function vignette(c: CreationProfilApi): { html: string; classe: string } {
  if (c.couverture) {
    const portrait = c.couverture.hauteur > c.couverture.largeur;
    return {
      html: image(
        c.couverture,
        '(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw',
        false,
      ).replace('<img ', `<img${portrait ? ' class="is-portrait"' : ''} `),
      classe: portrait ? ' is-affiche' : '',
    };
  }
  if (c.resultat?.nature === 'CODE')
    return {
      html: `<div class="mock" aria-hidden="true"><div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>${esc(c.resultat.nom ?? 'Code')}</span></div><pre>${esc(c.resultat.extrait.split('\n').slice(0, 9).join('\n'))}</pre></div></div>`,
      classe: '',
    };
  if (c.resultat?.nature === 'TEXTE')
    return {
      html: `<div class="mock" aria-hidden="true"><div class="mock-paper">${c.resultat.extrait
        .slice(0, 320)
        .split(/\n{2,}/)
        .filter((x) => x.trim())
        .slice(0, 3)
        .map((x) => `<p>${t(x.trim())}</p>`)
        .join('')}</div></div>`,
      classe: '',
    };
  const outil = c.outils[0]?.outil;
  return {
    html: `<div class="pf-tv" aria-hidden="true">
      ${outil ? `<p class="pf-tv-outil">${logo(outil, 18)}${t(outil.nom)}</p>` : ''}
      <p class="pf-tv-texte">${t(c.apercu ?? c.titre)}</p>
    </div>`,
    classe: ' is-texte',
  };
}

/** Indicateurs d'une création (prototype : statsCreation). */
export const statsCreation = (
  c: Pick<CreationProfilApi, 'type' | 'utiles' | 'reproductions' | 'tauxReussite' | 'moments'>,
): string => `<ul class="pf-c-stats">
      <li title="Votes « Utile »">${icone('utile', 'icon-sm')}${fmt(c.utiles)}<span class="sr-only"> votes « Utile »</span></li>
      ${c.type !== 'PROJET' ? `<li title="Reproductions">${icone('repeat', 'icon-sm')}${fmt(c.reproductions)}<span class="sr-only"> reproductions</span></li>` : ''}
      ${c.type !== 'PROJET' && c.tauxReussite !== null ? `<li class="pf-succes">${t(`${c.tauxReussite} % de succès`)}</li>` : ''}
      <li title="Moments clés">${icone('moment', 'icon-sm')}${fmt(c.moments)}<span class="sr-only"> moments clés</span></li>
    </ul>`;

/** Créations publiées (prototype : renderCreations). */
export function creationsHTML(p: ProfilApi, c: ContexteProfil, ui: EtatCreations): string {
  const toutes = p.creations;
  const types = [...new Set(toutes.map((x) => x.type))];
  const type = ui.type !== 'toutes' && types.includes(ui.type) ? ui.type : 'toutes';
  const liste = toutes
    .filter((x) => type === 'toutes' || x.type === type)
    .toSorted(
      ui.tri === 'utiles'
        ? (a, b) => b.utiles - a.utiles || b.datePublication.localeCompare(a.datePublication)
        : (a, b) => b.datePublication.localeCompare(a.datePublication),
    );
  const visibles = ui.completes ? liste : liste.slice(0, CREATIONS_VISIBLES);
  const controles =
    toutes.length > 1
      ? `<div class="pf-filtres" role="group" aria-label="Filtrer par type">${[
          ['toutes', 'Toutes'] as const,
          ...types.map((ty) => [ty, LIBELLES_TYPE[ty]] as const),
        ]
          .map(
            ([v, l]) =>
              `<button type="button" data-pf-type="${v}" aria-pressed="${type === v}">${v === 'toutes' ? '' : icone(`type-${CLE_TYPE[v]}`, 'icon-sm')}${t(l)}</button>`,
          )
          .join('')}</div>
      <label class="pf-tri"><span class="sr-only">Trier les créations</span><select data-pf-tri><option value="recentes"${ui.tri === 'recentes' ? ' selected' : ''}>Les plus récentes</option><option value="utiles"${ui.tri === 'utiles' ? ' selected' : ''}>Les plus utiles</option></select>${icone('chevron-down', 'icon-sm')}</label>`
      : '';
  const brouillons = c.prive ? p.prive?.brouillons : undefined;
  const dernier = brouillons?.dernier;
  const brouillon =
    brouillons && dernier
      ? `<a class="pf-brouillon" href="${ROUTES.modifierCreation(dernier.id)}">${icone('pen')}<span><b>${brouillons.nombre > 1 ? t(`${fmt(brouillons.nombre)} brouillons vous attendent`) : 'Un brouillon vous attend'}</b><span>${dernier.titre ? t(`Reprenez « ${dernier.titre} » là où vous l’avez laissé.`) : 'Reprenez-le là où vous l’avez laissé.'}</span></span><span class="pf-brouillon-cta">Reprendre${icone('arrow', 'icon-sm')}</span></a>`
      : '';
  const plus =
    liste.length > CREATIONS_VISIBLES
      ? `<div class="pf-plus"><button class="btn btn-quiet btn-sm pf-voir-plus" type="button" data-pf-creations-plus aria-expanded="${ui.completes}">${ui.completes ? 'Afficher moins' : t(`Afficher ${fmt(liste.length - CREATIONS_VISIBLES)} de plus`)}${icone('chevron-down', 'icon-sm')}</button></div>`
      : '';
  const vide = c.prive
    ? etatVide(
        'Aucune création publiée pour le moment',
        'Publiez le résultat obtenu avec l’IA et le chemin parcouru pour y arriver.',
        `<a class="btn btn-primary" href="${ROUTES.publier}">Publier une création</a>`,
      )
    : etatVide(`${prenom(p.membre.nom)} n’a pas encore publié de création`, '');
  const gerer =
    c.prive && toutes.length
      ? `<a class="link-arrow" href="${ROUTES.mesContenus}?onglet=publies">Gérer vos créations${icone('arrow', 'icon-sm')}</a>`
      : '';
  return `${enTete('pf-t-creations', 'Créations', 'layers', 'Créations publiées', toutes.length ? fmt(p.statistiques.creations) : '', gerer)}
      ${toutes.length ? `<div class="pf-outils-barre">${controles}</div>` : ''}
      ${brouillon}
      ${
        toutes.length
          ? `<div class="pf-galerie" data-pf-galerie>${visibles
              .map((x) => {
                const v = vignette(x);
                return `<article class="pf-carte" data-pf-carte="${x.id}">
        <div class="pf-carte-media${v.classe}">${v.html}</div>
        <div class="pf-carte-corps">
          <p class="pf-carte-type">${etiquetteType(x.type)}${x.categorie ? `<span class="pf-sep" aria-hidden="true">·</span><span>${t(x.categorie.libelle)}</span>` : ''}</p>
          <h3><button type="button" class="pf-carte-lien" data-pf-ouvrir="${x.id}">${t(x.titre)}</button></h3>
          <p class="pf-carte-outils">${x.outils.map((o) => outilHTML(o.outil, o.modeles.join(', '))).join('<span class="pf-sep" aria-hidden="true">+</span>')}</p>
          ${statsCreation(x)}
          <p class="pf-carte-date">${t(`Publiée ${jour(x.datePublication, c.maintenant)}`)}</p>
        </div>
      </article>`;
              })
              .join('')}</div>${plus}`
          : vide
      }`;
}

/* Contributions ---------------------------------------------------------------------------------- */

export type FiltreContributions = 'tout' | ContributionProfilApi['genre'];

const RESULTATS = {
  SUCCES: ['Réussi', 'check-circle', 'reussi'],
  PARTIEL: ['Partiel', 'half-circle', 'partiel'],
  ECHEC: ['Échec', 'x-circle', 'echec'],
} as const;

function contributionHTML(x: ContributionProfilApi): string {
  const date = `<time datetime="${esc(x.date)}">${t(dateLabel(x.date))}</time>`;
  const sep = '<span class="pf-sep" aria-hidden="true">·</span>';
  if (x.genre === 'creation')
    return `<li class="pf-act" data-kind="creation"><span class="pf-act-icone" aria-hidden="true">${icone(`type-${CLE_TYPE[x.creation.type]}`)}</span>
        <div class="pf-act-corps"><p class="pf-act-quoi">Création publiée</p>
        <button type="button" class="pf-act-titre" data-pf-ouvrir="${x.creation.id}">${t(x.creation.titre)}</button>
        <p class="pf-act-meta"><span>${t(LIBELLES_TYPE[x.creation.type])}</span>${x.outil ? `${sep}${outilHTML(x.outil)}` : ''}${sep}${date}</p></div></li>`;
  if (x.genre === 'reponse')
    return `<li class="pf-act" data-kind="reponse"><span class="pf-act-icone" aria-hidden="true">${icone(x.acceptee ? 'check-circle' : 'message')}</span>
        <div class="pf-act-corps"><p class="pf-act-quoi">${x.acceptee ? 'Réponse acceptée' : 'Réponse publiée'}</p>
        <a class="pf-act-titre" href="${esc(ROUTES.sujet(x.sujet.id, x.sujet.slug))}">${t(x.sujet.titre)}</a>
        <p class="pf-act-meta"><span class="pf-qui">${avatar(x.auteur, 20)}${t(`Question de ${x.auteur.nom}`)}</span>${x.outil ? `${sep}${outilHTML(x.outil)}` : ''}${sep}${date}</p></div></li>`;
  const [libelle, ic, cle] = RESULTATS[x.resultat];
  return `<li class="pf-act" data-kind="essai"><span class="pf-act-icone" aria-hidden="true">${icone('repeat')}</span>
      <div class="pf-act-corps"><p class="pf-act-quoi">Reproduction déclarée <span class="pf-resultat" data-resultat="${cle}">${icone(ic, 'icon-sm')}${libelle}</span></p>
      <a class="pf-act-titre" href="${esc(ROUTES.creation(x.creation.id, x.creation.slug))}">${t(x.creation.titre)}</a>
      <p class="pf-act-meta"><span class="pf-qui">${avatar(x.auteur, 20)}${t(`Création de ${x.auteur.nom}`)}</span>${sep}${outilHTML(x.outil, x.modele)}${sep}${date}</p></div></li>`;
}

/** Contributions récentes (prototype : renderContributions). */
export function contributionsHTML(
  p: ProfilApi,
  c: ContexteProfil,
  filtre: FiltreContributions,
  complete: boolean,
): string {
  const toutes = p.contributions;
  const genres = (
    [
      ['tout', 'Tout'],
      ['creation', 'Créations'],
      ['reponse', 'Réponses'],
      ['essai', 'Reproductions'],
    ] as const
  ).filter(([g]) => g === 'tout' || toutes.some((x) => x.genre === g));
  const actif = genres.some(([g]) => g === filtre) ? filtre : 'tout';
  const liste = toutes.filter((x) => actif === 'tout' || x.genre === actif);
  const visibles = complete ? liste : liste.slice(0, CONTRIBUTIONS_VISIBLES);
  const vide = c.prive
    ? etatVide(
        'Vos contributions apparaîtront ici',
        'Répondez à une question du forum ou reproduisez une création pour commencer.',
        `<div class="pf-vide-actions"><a class="btn btn-secondary" href="${ROUTES.forum}">Parcourir le forum</a><a class="btn btn-quiet" href="${ROUTES.explorer}">Explorer les créations</a></div>`,
      )
    : etatVide('Aucune contribution publique pour le moment', '');
  return `${enTete('pf-t-contributions', 'Activité', 'history', 'Contributions récentes')}
      ${
        toutes.length
          ? `${genres.length > 2 ? `<div class="pf-filtres" role="group" aria-label="Filtrer les contributions">${genres.map(([g, l]) => `<button type="button" data-pf-activite="${g}" aria-pressed="${actif === g}">${t(l)}</button>`).join('')}</div>` : ''}
      <ol class="pf-activite">${visibles.map(contributionHTML).join('')}</ol>
      ${liste.length > CONTRIBUTIONS_VISIBLES ? `<button class="btn btn-quiet btn-sm pf-voir-plus" type="button" data-pf-plus aria-expanded="${complete}">${complete ? 'Afficher moins' : t(`Afficher ${liste.length - CONTRIBUTIONS_VISIBLES} de plus`)}${icone('chevron-down', 'icon-sm')}</button>` : ''}`
          : vide
      }`;
}

/* À propos et badges ------------------------------------------------------------------------------ */

/** À propos (prototype : renderApropos) : outils de ses créations et de ses essais, domaines. */
export function aproposHTML(p: ProfilApi, c: ContexteProfil): string {
  const outils: { outil: OutilResumeApi; modeles: string[] }[] = [];
  const ajouter = (outil: OutilResumeApi, modele?: string | null) => {
    const o = outils.find((x) => x.outil.id === outil.id);
    if (!o) outils.push({ outil, modeles: modele ? [modele] : [] });
    else if (modele && !o.modeles.includes(modele)) o.modeles.push(modele);
  };
  for (const x of p.creations)
    for (const o of x.outils)
      if (o.modeles.length) for (const m of o.modeles) ajouter(o.outil, m);
      else ajouter(o.outil);
  for (const x of p.contributions) if (x.genre === 'essai') ajouter(x.outil, x.modele);
  const domaines = [
    ...new Map(
      p.creations.flatMap((x) => (x.categorie ? [[x.categorie.slug, x.categorie] as const] : [])),
    ).values(),
  ];
  return `<h2 id="pf-t-apropos">À propos</h2>
      <dl class="pf-apropos-liste">
        ${outils.length ? `<div><dt>Outils utilisés</dt><dd><ul class="pf-outils">${outils.map((o) => `<li>${logo(o.outil, 22)}<span><b>${t(o.outil.nom)}</b>${o.modeles.length ? `<small>${t(o.modeles.join(', '))}</small>` : ''}</span></li>`).join('')}</ul></dd></div>` : ''}
        ${domaines.length ? `<div><dt>Domaines</dt><dd><ul class="pf-domaines">${domaines.map((d) => `<li>${icone(d.icone ?? 'layers', 'icon-sm')}${t(d.libelle)}</li>`).join('')}</ul></dd></div>` : ''}
        <div><dt>Membre depuis</dt><dd>${t(dateLongue(p.membre.dateInscription))}</dd></div>
      </dl>
      ${c.prive ? `<p class="pf-confidentiel">${icone('lock', 'icon-sm')}<span>Votre adresse e-mail et vos statistiques d’apprentissage ne sont jamais visibles des autres membres. <a href="${ROUTES.parametres}">Gérer votre compte</a></span></p>` : ''}`;
}

/** « Prochains badges » du propriétaire (prototype : renderBadges, avancement). Le prototype n'en
    montre pas à un profil encore vide : rien tant qu'aucun badge n'est obtenu ni entamé. */
function prochainsBadgesHTML(p: ProfilApi, c: ContexteProfil): string {
  const prochains = c.prive ? (p.prive?.prochainsBadges ?? []) : [];
  if (!prochains.length || (!p.badges.length && !prochains.some((b) => b.valeur > 0))) return '';
  return `<div class="pf-prochains">
        <h3>${icone('lock', 'icon-sm')}Prochains badges <span>Visible par vous uniquement</span></h3>
        <ul>${prochains.map((b) => `<li>${emblemeBadge(b, 'is-verrouille')}<div><b>${t(b.libelle)}</b><p>${t(b.critere)}</p><span class="pf-jauge" role="img" aria-label="${t(`${b.valeur} sur ${b.objectif} ${b.unite}`)}"><i style="--v:${Math.min(1, b.valeur / b.objectif)}"></i></span><small>${t(`${fmt(b.valeur)} sur ${fmt(b.objectif)} ${b.unite}`)}</small></div></li>`).join('')}</ul>
      </div>`;
}

/** Badges obtenus et prochains badges (prototype : renderBadges). */
export function badgesSectionHTML(p: ProfilApi, c: ContexteProfil): string {
  const annee = c.maintenant.getUTCFullYear();
  const vide = c.prive
    ? etatVide(
        'Aucun badge pour le moment',
        'Votre premier badge arrive avec une première reproduction déclarée.',
        `<a class="btn btn-secondary" href="${ROUTES.explorer}">Choisir une création à reproduire</a>`,
      )
    : etatVide('Aucun badge pour le moment', '');
  return `${enTete('pf-t-badges', 'Reconnaissance', 'award', 'Badges', p.badges.length ? fmt(p.badges.length) : '', `<a class="link-arrow" href="${ROUTES.classements}#regles">Comment obtenir un badge${icone('arrow', 'icon-sm')}</a>`)}
      ${
        p.badges.length
          ? `<ul class="pf-badges">${p.badges
              .map(
                (b, i) =>
                  `<li class="pf-badge" tabindex="0" aria-describedby="pf-badge-${i}" style="--i:${i}">${emblemeBadge(b)}<b>${t(b.libelle)}</b><small>${t(`Obtenu le ${dateLabel(b.date, new Date(b.date).getUTCFullYear() !== annee)}`)}</small><span class="pf-badge-regle" role="tooltip" id="pf-badge-${i}">${t(b.critere)}</span></li>`,
              )
              .join('')}</ul>`
          : vide
      }
      ${prochainsBadgesHTML(p, c)}`;
}

/** Bandeau de l'aperçu public (prototype : renderApercu). */
export const apercuHTML = (): string =>
  `<div class="container pf-apercu-in">${icone('eye')}<p><b>Aperçu public.</b> ${t('Voici votre profil tel que les autres membres le voient.')}</p><a class="btn btn-sm btn-inverse" href="?" data-pf-apercu-off>Revenir à mon profil</a></div>`;
