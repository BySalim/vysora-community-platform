/* Page Mes contenus (CREA-04, EC-15), portée de prototype/mes-contenus.js : brouillons, créations
   publiées et contenus enregistrés du membre connecté. Les données viennent de l'API (posées dans la
   page par le serveur, relues après chaque action) ; publier, repasser en brouillon, supprimer et
   retirer un enregistrement passent par l'API, qui décide (RG-17, RG-19, RG-45, RG-85). */

import {
  dansLeDelai,
  type EnregistrementListeApi,
  type MaCreationApi,
  type MasquageApi,
  type MediaApi,
  type MembreResumeApi,
  type MesCreationsApi,
  type MesEnregistrementsApi,
  type OutilEtModelesApi,
  type OutilResumeApi,
  type ProblemeApi,
  type ResultatApercuApi,
  type TypeCreation,
  type TypeSujet,
} from '@vysora/shared';
import { adresseCreation, estPortrait } from '../lib/creations';
import { ROUTES } from '../lib/navigation';
import { enPhrase, normaliser } from '../lib/texte';
import { exiger } from './commun/acces';
import { api } from './commun/api';
import {
  $,
  $$,
  animations,
  corrigerTypographie,
  esc,
  fmt,
  icon,
  t,
  toast,
  typo,
} from './commun/outils';

type Onglet = 'brouillons' | 'publies' | 'enregistres';
type CleType = 'prompt' | 'iteration' | 'projet';

interface Donnees {
  creations: MesCreationsApi;
  enregistrements: MesEnregistrementsApi;
  /** Libellé du niveau du membre (note de la limite RG-85). */
  niveau: string;
}

/** Création telle que la page la présente (prototype : creation()). */
interface Creation {
  id: number;
  api: MaCreationApi;
  statut: 'brouillon' | 'publiee';
  type: CleType | null;
  titre: string;
  categorie: string;
  outils: OutilEtModelesApi[];
  media: MediaApi | null;
  resultat: ResultatApercuApi | null;
  conditions: { label: string; ok: boolean }[];
  faites: number;
  pret: boolean;
  modifie: string;
  publie: string | null;
  depubliee: boolean;
  defi: { titre: string; dateFin: string } | null;
  apercu: string;
  utile: number;
  essais: number;
  reussis: number;
  vues: number;
  commentaires: number;
}

type Enregistre = EnregistrementListeApi & { cle: string };

const source = document.getElementById('mes-contenus-donnees')?.textContent;
if (source) demarrer(JSON.parse(source) as Donnees);

function demarrer(depart: Donnees): void {
  const root = document.documentElement;
  const ONGLETS: Onglet[] = ['brouillons', 'publies', 'enregistres'];
  const TYPES: Record<TypeCreation, CleType> = {
    UN_PROMPT: 'prompt',
    ITERATION: 'iteration',
    PROJET: 'projet',
  };
  const TYPE_LABEL: Record<CleType, string> = {
    prompt: '1 prompt',
    iteration: 'Itération',
    projet: 'Projet',
  };
  const SUJETS: Record<TypeSujet, [string, string]> = {
    QUESTION: ['Question', 'help'],
    CLINIQUE: ['Clinique du prompt', 'scan'],
    ASTUCE: ['Astuce', 'bulb'],
    RETOUR_EXPERIENCE: ['Retour d’expérience', 'route'],
    DISCUSSION: ['Discussion', 'users'],
  };
  const DIFFICULTES = { DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé' };
  const MOIS = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];

  const parametre = new URLSearchParams(location.search).get('onglet');
  const ui = {
    onglet: (ONGLETS as string[]).includes(parametre ?? '') ? (parametre as Onglet) : 'brouillons',
    recherche: { brouillons: '', publies: '', enregistres: '' } as Record<Onglet, string>,
    filtre: { brouillons: 'tous', publies: 'tous', enregistres: 'tout' } as Record<Onglet, string>,
    tri: { brouillons: 'recents', publies: 'date', enregistres: 'recents' } as Record<
      Onglet,
      string
    >,
    sens: 'desc' as 'asc' | 'desc',
    ouverts: new Set<number>(),
    retire: null as Enregistre | null,
    nouveau: null as number | null,
    animer: true,
    comptes: {} as Partial<Record<Onglet, number>>,
  };

  let creationsApi = depart.creations;
  let enregistres: Enregistre[] = depart.enregistrements.elements.map(avecCle);
  /** RG-85 : instant où une publication redevient possible (null : elle l'est). */
  let finAttente = echeance(creationsApi);

  function avecCle(x: EnregistrementListeApi): Enregistre {
    return { ...x, cle: `${x.genre}:${x.id}` };
  }
  function echeance(donnees: MesCreationsApi): number | null {
    const secondes = donnees.publication?.reessayerDans;
    return secondes ? Date.now() + secondes * 1000 : null;
  }

  /* Limite de publications (RG-85) ---------------------------------------------- */

  const resteAttente = () =>
    finAttente === null ? 0 : Math.ceil((finAttente - Date.now()) / 1000);
  const quotaAtteint = () => resteAttente() > 0;

  /* Dates : instants de l'API lus à l'heure de l'appareil ------------------------- */

  const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const joursDepuis = (iso: string) =>
    Math.round((jour(new Date()) - jour(new Date(iso))) / 86400000);
  const heure = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  };
  function dateLabel(iso: string): string {
    const d = new Date(iso);
    const annee = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`;
    return `${d.getDate()} ${MOIS[d.getMonth()]}${annee}`;
  }
  function quand(iso: string, avecHeure = true): string {
    const n = joursDepuis(iso);
    const h = avecHeure ? ` à ${heure(iso)}` : '';
    if (n <= 0) return `aujourd’hui${h}`;
    if (n === 1) return `hier${h}`;
    if (n < 7) return `il y a ${n} jours`;
    return `le ${dateLabel(iso)}`;
  }
  const joursAvant = (iso: string) =>
    Math.max(0, Math.round((jour(new Date(iso)) - jour(new Date())) / 86400000));

  /* Créations du membre : brouillons et publiées ---------------------------------- */

  function creation(c: MaCreationApi): Creation {
    const conditions = c.conditions.map((k) => ({ label: k.libelle, ok: k.remplie }));
    return {
      id: c.id,
      api: c,
      statut: c.statut === 'PUBLIEE' ? 'publiee' : 'brouillon',
      type: c.typeDefini ? TYPES[c.type] : null,
      titre: c.titre?.trim() ? typo(c.titre) : '',
      categorie: c.categorie?.libelle ?? '',
      outils: c.outils,
      media: c.couverture,
      resultat: c.resultat,
      conditions,
      faites: conditions.filter((k) => k.ok).length,
      pret: conditions.every((k) => k.ok),
      modifie: c.dateModification,
      publie: c.datePublication,
      depubliee: c.statut === 'BROUILLON' && c.datePublication !== null,
      // Un défi clos n'accepte plus de participation : la ligne ne l'annonce plus.
      defi: c.defi && new Date(c.defi.dateFin).getTime() > Date.now() ? c.defi : null,
      apercu: c.apercu ?? '',
      utile: c.indicateurs.utiles,
      essais: c.indicateurs.reproductions,
      reussis: c.indicateurs.reussies,
      vues: c.indicateurs.vues,
      commentaires: c.indicateurs.commentaires,
    };
  }
  let liste: Creation[] = creationsApi.elements.map(creation);
  const brouillons = () => liste.filter((c) => c.statut === 'brouillon');
  const publiees = () => liste.filter((c) => c.statut === 'publiee');
  const parId = (id: number) => liste.find((c) => c.id === id);

  /** Données relues après une action : statuts, conditions, indicateurs et limite à jour. */
  async function recharger(): Promise<void> {
    const reponse = await api<MesCreationsApi>('GET', '/api/v1/moi/creations');
    if (!reponse.ok) return;
    creationsApi = reponse.donnees;
    liste = creationsApi.elements.map(creation);
    finAttente = echeance(creationsApi);
  }

  /* Fragments partagés --------------------------------------------------------------- */

  const logo = (outil: OutilResumeApi) =>
    outil.logo
      ? `<img class="tool-logo${outil.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(outil.logo)}.svg" alt="" width="16" height="16" decoding="async">`
      : '';
  const outilHTML = (outil: OutilResumeApi, modele: string) =>
    `<span class="mc-outil">${logo(outil)}${t(outil.nom)}${modele ? `<span class="mc-sep">&nbsp;·&nbsp;</span>${t(modele)}` : ''}</span>`;
  const outilsHTML = (outils: OutilEtModelesApi[]) =>
    outils
      .map((o) => outilHTML(o.outil, o.modeles.join(', ')))
      .join('<span class="mc-sep" aria-hidden="true">+</span>');
  /** « Claude · Sonnet 4.5 et n8n » avec les logos (prototype : withLogos). */
  const configHTML = (outils: OutilEtModelesApi[]) =>
    outils
      .map(
        (o) =>
          `<span class="tool-ref">${logo(o.outil)}${t(o.outil.nom)}</span>${o.modeles.length ? t(` · ${o.modeles.join(', ')}`) : ''}`,
      )
      .join(' et ');
  const avatar = (membre: MembreResumeApi) =>
    membre.avatar
      ? `<img class="avatar" src="${esc(membre.avatar)}" alt="" width="20" height="20" loading="lazy" decoding="async">`
      : `<span class="avatar compte-avatar" style="width:20px;height:20px" aria-hidden="true">${icon('user', '')}</span>`;
  const typeTag = (type: CleType) =>
    `<span class="type-tag" data-type="${type}">${icon(`type-${type}`)}${TYPE_LABEL[type]}</span>`;
  /** Vignette : l'image du résultat, sinon le texte ou le code obtenu (comme sur la fiche), sinon le
      type et le début du premier prompt (prototype : vignette). */
  function vignette(
    media: MediaApi | null,
    type: CleType | null,
    apercu = '',
    resultat: ResultatApercuApi | null = null,
  ): string {
    if (!media && resultat) {
      const contenu =
        resultat.nature === 'CODE'
          ? `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>${t(resultat.nom ?? 'Code')}</span></div><pre>${esc(resultat.extrait)}</pre></div>`
          : `<div class="mock-paper">${resultat.extrait
              .split(/\n{2,}/)
              .map((paragraphe) => `<p>${t(paragraphe)}</p>`)
              .join('')}</div>`;
      return `<span class="mc-vignette" aria-hidden="true"><span class="mock">${contenu}</span></span>`;
    }
    if (!media)
      return `<span class="mc-vignette is-vide${apercu ? ' is-texte' : ''}" aria-hidden="true">${icon(type ? `type-${type}` : 'type-vide', '')}${apercu ? `<span class="mc-apercu">${t(apercu)}</span>` : ''}</span>`;
    const portrait = estPortrait(media);
    const src = media.declinaisons[0]?.url ?? media.url;
    return `<span class="mc-vignette${portrait ? ' is-affiche' : ''}" aria-hidden="true"><img src="${esc(src)}" alt="" width="${media.largeur}" height="${media.hauteur}" loading="lazy" decoding="async"${portrait ? ' class="is-portrait"' : ''}></span>`;
  }
  const typeLigne = (c: Creation) =>
    `<p class="mc-ligne-type">${c.type ? typeTag(c.type) : '<span class="mc-genre">Type à définir</span>'}<span class="mc-sep" aria-hidden="true">·</span><span>${c.categorie ? t(c.categorie) : 'Sans catégorie'}</span></p>`;
  const titreCreation = (c: Creation, href: string) =>
    `<h3 class="mc-ligne-titre"><a href="${esc(href)}">${c.titre ? t(c.titre) : '<span class="is-sans-titre">Sans titre</span>'}</a></h3>`;
  const nomCreation = (c: Creation) => (c.titre ? `« ${c.titre} »` : 'ce brouillon sans titre');
  const etatVide = (icone: string, titre: string, texte: string, actions = '') =>
    `<div class="mc-vide"><span class="mc-vide-icone" aria-hidden="true">${icon(icone, '')}</span><h3>${t(titre)}</h3><p>${t(texte)}</p>${actions ? `<div class="mc-vide-actions">${actions}</div>` : ''}</div>`;
  const aucunResultat = (onglet: Onglet, quoi: string) =>
    `<div class="mc-aucun"><p>${quoi}</p><button class="btn btn-secondary btn-sm" type="button" data-mc-action="reinitialiser" data-mc-onglet-cible="${onglet}">${icon('replay', 'icon-sm')}Effacer la recherche et les filtres</button></div>`;
  const plusieurs = (n: number, un: string, des: string) => `${fmt(n)} ${n > 1 ? des : un}`;
  const editeur = (c: Creation) => ROUTES.modifierCreation(c.id);

  function barreOutils(onglet: Onglet, types: [string, string, string?, number?][]): string {
    const r = ui.recherche[onglet];
    const tris = {
      brouillons: [
        ['recents', 'Modifiés récemment'],
        ['avances', 'Les plus avancés'],
        ['titre', 'Titre, de A à Z'],
      ],
      publies: [
        ['date', 'Les plus récentes'],
        ['utile', 'Les plus utiles'],
        ['essais', 'Les plus reproduites'],
        ['vues', 'Les plus vues'],
      ],
      enregistres: [
        ['recents', 'Enregistrés récemment'],
        ['anciens', 'Enregistrés en premier'],
      ],
    }[onglet];
    const etiquettes = {
      brouillons: 'Rechercher un brouillon',
      publies: 'Rechercher une création',
      enregistres: 'Rechercher dans vos enregistrés',
    };
    return `<div class="mc-outils">
      <div class="mc-recherche" role="search">
        ${icon('search', 'icon-sm')}
        <label class="sr-only" for="mc-q-${onglet}">${etiquettes[onglet]}</label>
        <input type="search" id="mc-q-${onglet}" value="${esc(r)}" placeholder="${etiquettes[onglet]}…" autocomplete="off" spellcheck="false" data-mc-recherche="${onglet}">
        <button class="mc-effacer" type="button" aria-label="Effacer la recherche" data-mc-action="effacer" data-mc-onglet-cible="${onglet}"${r ? '' : ' hidden'}>${icon('close', 'icon-sm')}</button>
      </div>
      ${types.length > 2 ? `<div class="mc-filtres" role="group" aria-label="${onglet === 'enregistres' ? 'Filtrer par genre' : 'Filtrer par type'}">${types.map(([v, l, ic, n]) => `<button type="button" data-mc-filtre="${v}" aria-pressed="${ui.filtre[onglet] === v}">${ic ? icon(ic, 'icon-sm') : ''}${t(l)}${n !== undefined ? ` <small>${fmt(n)}</small>` : ''}</button>`).join('')}</div>` : ''}
      <label class="mc-tri${onglet === 'publies' ? ' mc-tri-mobile' : ''}"><span class="sr-only">Trier</span><select data-mc-tri="${onglet}">${tris.map(([v, l]) => `<option value="${v}"${ui.tri[onglet] === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>${icon('chevron-down', 'icon-sm')}</label>
    </div>`;
  }
  const correspond = (texte: string, onglet: Onglet) =>
    normaliser(texte).includes(normaliser(ui.recherche[onglet]).trim());

  /* Brouillons ------------------------------------------------------------------------ */

  function ligneBrouillon(c: Creation, i: number): string {
    const href = editeur(c);
    const manque = c.conditions.length - c.faites;
    const ouvert = ui.ouverts.has(c.id);
    const fin = c.defi ? joursAvant(c.defi.dateFin) : 0;
    return `<li class="mc-ligne${ui.animer ? ' is-entree' : ''}${ui.nouveau === c.id ? ' is-nouveau' : ''}" style="--i:${Math.min(i, 8)}" data-mc-id="${c.id}">
      ${vignette(c.depubliee ? c.media : null, c.type, c.apercu, c.depubliee ? c.resultat : null)}
      <div class="mc-ligne-corps">
        ${typeLigne(c)}
        ${titreCreation(c, href)}
        <p class="mc-ligne-meta"><span>${icon('clock')}Modifié ${t(quand(c.modifie))}</span>${c.outils.length ? `<span class="mc-outils-liste">${outilsHTML(c.outils)}</span>` : ''}</p>
        ${c.defi ? `<p class="mc-ligne-meta"><span class="mc-defi">${icon('trophy')}${t(`Défi « ${c.defi.titre} » · ${fin > 1 ? `clôture dans ${fin} jours` : fin === 1 ? 'clôture demain' : 'clôture ce soir'}`)}</span></p>` : ''}
        ${c.depubliee ? `<p class="mc-ligne-meta"><span class="mc-reprise">${icon('eye-off')}${t('Dépubliée : ses commentaires et reproductions sont masqués')}</span></p>` : ''}
      </div>
      <div class="mc-etat${c.pret ? ' is-pret' : ''}">
        <span class="mc-segments" role="img" aria-label="${t(`${c.faites} ${c.faites > 1 ? 'conditions de publication remplies' : 'condition de publication remplie'} sur ${c.conditions.length}`)}">${c.conditions.map((k, s) => `<i class="${k.ok ? 'is-fait' : ''}" style="--s:${s}"></i>`).join('')}</span>
        ${
          c.pret
            ? `<p class="mc-pret">${icon('check-circle', 'icon-sm')}Prêt à publier</p>`
            : `<button class="mc-a-completer" type="button" aria-expanded="${ouvert}" aria-controls="mc-manques-${c.id}" data-mc-action="manques">${t(manque > 1 ? `${manque} éléments à compléter` : '1 élément à compléter')}${icon('chevron-down', 'icon-sm')}</button>`
        }
      </div>
      <div class="mc-actions">
        ${c.pret ? `<button class="btn btn-primary btn-sm" type="button" data-mc-action="publier"${quotaAtteint() ? ' disabled aria-describedby="mc-quota"' : ''}>${icon('send', 'icon-sm')}Publier</button>` : ''}
        <a class="btn btn-secondary btn-sm" href="${esc(href)}">${c.pret ? 'Modifier' : 'Continuer'}</a>
        <button class="mc-plus" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${t(`Plus d’actions pour ${c.titre ? `« ${c.titre} »` : 'le brouillon sans titre'}`)}" data-mc-menu-pour="${c.id}">${icon('more', '')}</button>
      </div>
      ${c.pret ? '' : `<div class="mc-manques${ouvert ? ' is-ouvert' : ''}" id="mc-manques-${c.id}"${ouvert ? '' : ' aria-hidden="true" inert'}><div><ul>${c.conditions.map((k) => `<li class="${k.ok ? 'is-fait' : ''}">${icon(k.ok ? 'check-circle' : 'circle', '')}<span>${t(k.label)}${k.ok ? '<span class="sr-only"> : rempli</span>' : '<span class="sr-only"> : à compléter</span>'}</span></li>`).join('')}</ul></div></div>`}
    </li>`;
  }

  function contenuBrouillons(): string {
    const tous = brouillons();
    const o: Onglet = 'brouillons';
    const tri: Record<string, (a: Creation, b: Creation) => number> = {
      recents: (a, b) => b.modifie.localeCompare(a.modifie),
      avances: (a, b) =>
        b.faites / b.conditions.length - a.faites / a.conditions.length ||
        b.modifie.localeCompare(a.modifie),
      titre: (a, b) => (a.titre || '￿').localeCompare(b.titre || '￿', 'fr'),
    };
    const lignes = tous
      .filter(
        (c) =>
          (ui.filtre[o] === 'tous' || c.type === ui.filtre[o]) &&
          correspond(`${c.titre} ${c.categorie} ${c.outils.map((x) => x.outil.nom).join(' ')}`, o),
      )
      .toSorted(tri[ui.tri[o]]);
    if (!tous.length)
      return etatVide(
        'pen',
        'Aucun brouillon en cours',
        'Une création commence toujours en brouillon, visible de vous uniquement. Vous la publiez quand elle est prête.',
        `<a class="btn btn-primary" href="${ROUTES.publier}">Commencer une création</a>`,
      );
    if (!lignes.length)
      return aucunResultat(
        o,
        ui.recherche[o]
          ? `Aucun brouillon ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.`
          : 'Aucun brouillon de ce type.',
      );
    return `<ul class="mc-liste" aria-label="Brouillons">${lignes.map(ligneBrouillon).join('')}</ul>`;
  }

  function panneauBrouillons(): string {
    const tous = brouillons();
    const prets = tous.filter((c) => c.pret).length;
    const types: [string, string, string?][] = [
      ['tous', 'Tous'],
      ...(['prompt', 'iteration', 'projet'] as const)
        .filter((ty) => tous.some((c) => c.type === ty))
        .map((ty): [string, string, string] => [ty, TYPE_LABEL[ty], `type-${ty}`]),
    ];
    const limite = creationsApi.publication?.limite ?? 0;
    return `<div class="mc-entete"><h2>Brouillons</h2>${tous.length ? `<p class="mc-resume">${t(plusieurs(tous.length, 'brouillon', 'brouillons'))}${prets ? ` · <b>${t(plusieurs(prets, 'prêt à publier', 'prêts à publier'))}</b>` : ''}</p>` : ''}</div>
      ${quotaAtteint() && tous.length ? `<p class="mc-note" id="mc-quota">${icon('alert', 'icon-sm')}<span><b>${t(`Vous avez publié ${plusieurs(limite, 'création', 'créations')} ces dernières 24 heures`)}</b>, la limite du niveau ${t(depart.niveau)}. ${t(`Prochaine publication possible ${dansLeDelai(resteAttente())}.`)}</span></p>` : ''}
      ${tous.length ? barreOutils('brouillons', types) : ''}
      <div data-mc-zone-liste="brouillons">${contenuBrouillons()}</div>`;
  }

  /* Créations publiées ------------------------------------------------------------------ */

  /** Date et motif de la décision (MOD-01) ; « Voir la décision » ouvre les notifications de la
      modération (NOTIF-01). */
  function alerteMasquage(masquage: MasquageApi | null): string {
    const le = masquage?.date ? ` le ${dateLabel(masquage.date)}` : '';
    const motif = masquage?.motif ? ` ${t(enPhrase(masquage.motif))}` : '';
    // Un mois abrégé porte déjà son point (« le 12 oct. »).
    return `<p class="mc-alerte is-masquee">${icon('eye-off')}<span><b>${t(`Masquée par la modération${le}`.replace(/\.?$/, '.'))}</b>${motif} Elle reste visible de vous et de la modération. <a href="${ROUTES.notifications}?type=moderation">Voir la décision</a></span></p>`;
  }
  function alertes(c: Creation): string {
    const o = c.api.obsolescence;
    return [
      c.api.masquee ? alerteMasquage(c.api.masquage) : '',
      o
        ? `<p class="mc-alerte is-obsolete">${icon('alert')}<span><b>Obsolescence signalée.</b> ${t(`${plusieurs(o.membres, 'membre indique', 'membres indiquent')} que le rendu a changé avec ${o.modele} depuis le ${dateLabel(o.depuis)}`.replace(/\.?$/, '.'))} <a href="${esc(editeur(c))}">Mettre à jour</a></span></p>`
        : '',
    ].join('');
  }
  function lignePubliee(c: Creation, i: number): string {
    const href = editeur(c);
    const reproductible = c.type !== 'projet';
    const modifiee = c.publie !== null && jour(new Date(c.modifie)) > jour(new Date(c.publie));
    return `<tr class="${ui.animer ? 'is-entree' : ''}${ui.nouveau === c.id ? ' is-nouveau' : ''}${c.api.masquee ? ' is-masquee' : ''}" style="--i:${Math.min(i, 8)}" data-mc-id="${c.id}">
      <td class="is-creation"><div class="mc-cellule">
        ${vignette(c.media, c.type, c.media || c.resultat ? '' : c.apercu, c.resultat)}
        <div class="mc-ligne-corps">
          ${typeLigne(c)}
          ${titreCreation(c, href)}
          <p class="mc-ligne-meta"><span>${t(`Publiée ${quand(c.publie ?? c.modifie)}`)}</span>${modifiee ? `<span>${t(`Modifiée ${quand(c.modifie)}`)}</span>` : ''}<span class="mc-outils-liste">${outilsHTML(c.outils)}</span></p>
          ${alertes(c)}
        </div>
      </div></td>
      <td class="is-num" data-label="Votes « Utile »"><span class="mc-chiffre">${fmt(c.utile)}</span></td>
      <td class="is-num" data-label="Reproductions">${reproductible ? `<span class="mc-chiffre">${fmt(c.essais)}</span><span class="mc-chiffre-sous">${c.essais >= 3 ? t(`${Math.round((c.reussis / c.essais) * 100)} % de succès`) : c.essais ? t(plusieurs(c.reussis, 'réussie', 'réussies')) : 'Aucune pour l’instant'}</span>` : '<span class="mc-chiffre" aria-hidden="true">–</span><span class="mc-chiffre-sous">Projet, non reproductible</span>'}</td>
      <td class="is-num" data-label="Vues"><span class="mc-chiffre">${fmt(c.vues)}</span><span class="mc-chiffre-sous">${t(plusieurs(c.commentaires, 'commentaire', 'commentaires'))}</span></td>
      <td class="is-actions"><div class="mc-actions">
        <a class="btn btn-secondary btn-sm" href="${esc(href)}">${icon('pen', 'icon-sm')}Modifier</a>
        <button class="mc-plus" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${t(`Plus d’actions pour « ${c.titre} »`)}" data-mc-menu-pour="${c.id}">${icon('more', '')}</button>
      </div></td>
    </tr>`;
  }

  function contenuPubliees(): string {
    const toutes = publiees();
    const o: Onglet = 'publies';
    const cle: Record<string, (c: Creation) => string | number> = {
      date: (c) => c.publie ?? '',
      utile: (c) => c.utile,
      essais: (c) => c.essais,
      vues: (c) => c.vues,
    };
    const valeur = cle[ui.tri[o]] ?? cle.date!;
    const sens = ui.sens === 'asc' ? 1 : -1;
    const lignes = toutes
      .filter(
        (c) =>
          (ui.filtre[o] === 'tous' || c.type === ui.filtre[o]) &&
          correspond(`${c.titre} ${c.categorie} ${c.outils.map((x) => x.outil.nom).join(' ')}`, o),
      )
      .toSorted((a, b) => {
        const x = valeur(a);
        const y = valeur(b);
        return (
          (typeof x === 'string' ? x.localeCompare(String(y)) : x - Number(y)) * sens ||
          (b.publie ?? '').localeCompare(a.publie ?? '')
        );
      });
    if (!toutes.length)
      return etatVide(
        'layers',
        'Aucune création publiée pour le moment',
        'Publiez le résultat obtenu avec l’IA et le chemin parcouru pour y arriver : les autres membres pourront le reproduire.',
        `<a class="btn btn-primary" href="${ROUTES.publier}">Publier une création</a>${brouillons().some((c) => c.pret) ? '<button class="btn btn-secondary" type="button" data-mc-action="aller" data-mc-onglet-cible="brouillons">Voir les brouillons prêts</button>' : ''}`,
      );
    if (!lignes.length)
      return aucunResultat(
        o,
        ui.recherche[o]
          ? `Aucune création ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.`
          : 'Aucune création de ce type.',
      );
    const tri = (cleTri: string) =>
      ui.tri[o] === cleTri ? ` aria-sort="${ui.sens === 'asc' ? 'ascending' : 'descending'}"` : '';
    const th = (cleTri: string, label: string) =>
      `<th scope="col" class="is-num"${tri(cleTri)}><button class="mc-trier" type="button" data-mc-trier="${cleTri}">${t(label)}${icon('chevron-up-down', 'icon-sm')}</button></th>`;
    return `<table class="mc-table"><caption class="sr-only">Vos créations publiées, avec leurs votes, reproductions et vues</caption>
      <thead><tr><th scope="col"${tri('date')}><button class="mc-trier" type="button" data-mc-trier="date">Création${icon('chevron-up-down', 'icon-sm')}</button></th>${th('utile', 'Votes « Utile »')}${th('essais', 'Reproductions')}${th('vues', 'Vues')}<th scope="col" class="is-actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${lignes.map(lignePubliee).join('')}</tbody></table>`;
  }

  function panneauPubliees(): string {
    const toutes = publiees();
    const somme = (k: 'utile' | 'essais' | 'vues') => toutes.reduce((a, c) => a + c[k], 0);
    const types: [string, string, string?][] = [
      ['tous', 'Toutes'],
      ...(['prompt', 'iteration', 'projet'] as const)
        .filter((ty) => toutes.some((c) => c.type === ty))
        .map((ty): [string, string, string] => [ty, TYPE_LABEL[ty], `type-${ty}`]),
    ];
    return `<div class="mc-entete"><h2>Créations publiées</h2>${toutes.length ? `<p class="mc-resume">${t('Au total : ')}<b>${t(plusieurs(somme('utile'), 'vote « Utile »', 'votes « Utile »'))}</b>, <b>${t(plusieurs(somme('essais'), 'reproduction', 'reproductions'))}</b> et <b>${t(plusieurs(somme('vues'), 'vue', 'vues'))}</b></p>` : ''}</div>
      ${toutes.length ? barreOutils('publies', types) : ''}
      <div data-mc-zone-liste="publies">${contenuPubliees()}</div>`;
  }

  /* Enregistrés --------------------------------------------------------------------------- */

  function ligneEnregistre(x: Enregistre, i: number): string {
    const date = `<span>${icon('bookmark')}${t(`Enregistré ${quand(x.date, false)}`)}</span>`;
    let vig: string;
    let typ: string;
    let href: string;
    let meta: string;
    if (x.genre === 'CREATION') {
      const type = TYPES[x.type];
      vig = vignette(x.couverture, type, '', x.resultat);
      typ = `${typeTag(type)}<span class="mc-sep" aria-hidden="true">·</span><span>${t(x.categorie?.libelle ?? 'Sans catégorie')}</span>`;
      href = adresseCreation(x);
      meta = `<span class="mc-qui">${avatar(x.auteur)}${t(x.auteur.nom)}</span>${x.outils.length ? `<span>${configHTML(x.outils)}</span>` : ''}${date}`;
    } else if (x.genre === 'SUJET') {
      const [label, ic] = SUJETS[x.typeSujet] ?? ['Sujet', 'message'];
      vig = `<span class="mc-vignette is-sujet" aria-hidden="true">${icon(ic, '')}</span>`;
      typ = `<span class="mc-genre">${icon(ic)}${t(label)}</span><span class="mc-sep" aria-hidden="true">·</span><span>${t(plusieurs(x.reponses, 'réponse', 'réponses'))}</span>${x.etat === 'RESOLU' ? '<span class="mc-sep" aria-hidden="true">·</span><span>Résolu</span>' : x.etat === 'FERME' ? '<span class="mc-sep" aria-hidden="true">·</span><span>Fermé</span>' : ''}`;
      href = ROUTES.sujet(x.id, x.slug);
      meta = `<span class="mc-qui">${avatar(x.auteur)}${t(x.auteur.nom)}</span>${x.outil ? `<span>${outilHTML(x.outil, x.modele ?? '')}</span>` : ''}${date}`;
    } else {
      vig = `<span class="mc-vignette is-cas" aria-hidden="true">${icon('shield', '')}</span>`;
      typ = `<span class="mc-genre">${icon('shield')}Cas Bon réflexe</span><span class="mc-sep" aria-hidden="true">·</span><span>${t(DIFFICULTES[x.difficulte])}</span>`;
      href = ROUTES.casBonReflexe(x.id, x.slug);
      meta = `<span class="mc-qui">${avatar(x.auteur)}${t(`Proposé par ${x.auteur.nom}`)}</span>${date}`;
    }
    return `<li class="mc-ligne is-enregistre${ui.animer ? ' is-entree' : ''}" style="--i:${Math.min(i, 8)}" data-mc-cle="${x.cle}">
      ${vig}
      <div class="mc-ligne-corps">
        <p class="mc-ligne-type">${typ}</p>
        <h3 class="mc-ligne-titre"><a href="${esc(href)}">${t(x.titre)}</a></h3>
        <p class="mc-ligne-meta">${meta}</p>
      </div>
      <div class="mc-actions"><button class="btn btn-quiet btn-sm mc-retirer" type="button" data-mc-action="retirer" aria-label="${t(`Retirer « ${x.titre} » de vos enregistrés`)}">${icon('bookmark-x', 'icon-sm')}<span>Retirer</span></button></div>
    </li>`;
  }
  const ligneRetiree = (x: Enregistre) =>
    `<li class="mc-ligne is-retire" data-mc-cle="${x.cle}"><p>${icon('bookmark-x', 'icon-sm')}<span>${t(`« ${x.titre} » est retiré de vos enregistrés.`)}</span></p><div class="mc-actions"><button class="btn btn-secondary btn-sm" type="button" data-mc-action="annuler-retrait">${icon('undo', 'icon-sm')}Annuler</button></div></li>`;
  const GENRES = { tout: '', creation: 'CREATION', sujet: 'SUJET', cas: 'CAS' } as Record<
    string,
    string
  >;
  const duGenre = (x: Enregistre) =>
    ui.filtre.enregistres === 'tout' || x.genre === GENRES[ui.filtre.enregistres];

  function contenuEnregistres(): string {
    const o: Onglet = 'enregistres';
    const retire = ui.retire;
    const texte = (x: Enregistre) =>
      `${x.titre} ${x.auteur.nom} ${x.genre === 'CREATION' ? `${x.outils.map((y) => y.outil.nom).join(' ')} ${x.categorie?.libelle ?? ''}` : x.genre === 'SUJET' ? (x.outil?.nom ?? '') : ''}`;
    const lignes = enregistres.filter((x) => duGenre(x) && correspond(texte(x), o));
    if (retire && duGenre(retire)) lignes.push(retire);
    lignes.sort(
      (a, b) =>
        (ui.tri[o] === 'anciens' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) ||
        a.cle.localeCompare(b.cle),
    );
    if (!enregistres.length && !retire)
      return etatVide(
        'bookmark',
        'Rien d’enregistré pour le moment',
        'Enregistrez une création, un sujet du forum ou un cas Bon réflexe pour le retrouver ici. Cette liste n’est visible que de vous.',
        `<a class="btn btn-primary" href="${ROUTES.explorer}">Explorer les créations</a><a class="btn btn-secondary" href="${ROUTES.forum}">Parcourir le forum</a>`,
      );
    if (!lignes.length)
      return aucunResultat(
        o,
        ui.recherche[o]
          ? `Aucun contenu enregistré ne correspond à <b>${t(`« ${ui.recherche[o]} »`)}</b>.`
          : 'Aucun contenu enregistré de ce genre.',
      );
    return `<ul class="mc-liste" aria-label="Contenus enregistrés">${lignes.map((x, i) => (retire && x.cle === retire.cle ? ligneRetiree(x) : ligneEnregistre(x, i))).join('')}</ul>`;
  }

  function panneauEnregistres(): string {
    const n = (genre: string) => enregistres.filter((x) => x.genre === genre).length;
    const morceaux = (
      [
        [n('CREATION'), 'création', 'créations'],
        [n('SUJET'), 'sujet', 'sujets'],
        [n('CAS'), 'cas', 'cas'],
      ] as const
    )
      .filter(([k]) => k)
      .map(([k, a, b]) => plusieurs(k, a, b));
    const resume =
      morceaux.length > 1
        ? `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`
        : (morceaux[0] ?? '');
    const genres: [string, string, string?, number?][] = [
      ['tout', 'Tout', '', enregistres.length],
      ...(
        [
          ['creation', 'Créations', 'layers', 'CREATION'],
          ['sujet', 'Sujets', 'message', 'SUJET'],
          ['cas', 'Cas', 'shield', 'CAS'],
        ] as const
      )
        .filter(([, , , g]) => n(g))
        .map(([k, l, ic, g]): [string, string, string, number] => [k, l, ic, n(g)]),
    ];
    return `<div class="mc-entete"><h2>Contenus enregistrés</h2>${enregistres.length ? `<p class="mc-resume">${t(resume)}<span class="mc-sep" aria-hidden="true">·</span><span class="mc-prive">${icon('lock', 'icon-xs')}Visibles de vous uniquement</span></p>` : ''}</div>
      ${enregistres.length || ui.retire ? barreOutils('enregistres', genres) : ''}
      <div data-mc-zone-liste="enregistres">${contenuEnregistres()}</div>`;
  }

  /* Onglets ------------------------------------------------------------------------------- */

  const PANNEAUX: Record<Onglet, () => string> = {
    brouillons: panneauBrouillons,
    publies: panneauPubliees,
    enregistres: panneauEnregistres,
  };
  const CONTENUS: Record<Onglet, () => string> = {
    brouillons: contenuBrouillons,
    publies: contenuPubliees,
    enregistres: contenuEnregistres,
  };
  const LIBELLES: Record<Onglet, string> = {
    brouillons: 'Brouillons',
    publies: 'Publiées',
    enregistres: 'Enregistrés',
  };

  function compter(): void {
    const n: Record<Onglet, number> = {
      brouillons: brouillons().length,
      publies: publiees().length,
      enregistres: enregistres.length,
    };
    for (const o of ONGLETS) {
      const el = $(`[data-mc-nb="${o}"]`);
      if (!el) continue;
      const avant = ui.comptes[o];
      el.textContent = fmt(n[o]);
      $(`[data-mc-onglet="${o}"]`)?.setAttribute('aria-label', `${LIBELLES[o]}, ${n[o]}`);
      if (avant !== undefined && avant !== n[o] && animations.completes()) {
        el.classList.remove('is-bond');
        void el.offsetWidth;
        el.classList.add('is-bond');
      }
    }
    ui.comptes = n;
  }

  function placerIndicateur(): void {
    const tab = $(`[data-mc-onglet="${ui.onglet}"]`);
    const ind = $('[data-mc-indicateur]');
    if (!tab || !ind) return;
    ind.style.setProperty('--x', `${tab.offsetLeft}px`);
    ind.style.setProperty('--w', `${tab.offsetWidth}px`);
  }

  function rendrePanneau(o: Onglet, options: { entree?: boolean } = {}): void {
    const el = $(`[data-mc-panneau="${o}"]`);
    if (!el) return;
    el.innerHTML = PANNEAUX[o]();
    corrigerTypographie(el);
    if (options.entree && animations.completes()) {
      el.classList.remove('is-entree');
      void el.offsetWidth;
      el.classList.add('is-entree');
    }
  }
  function rendreListe(o: Onglet, animer = false): void {
    const zone = $(`[data-mc-zone-liste="${o}"]`);
    if (!zone) return rendrePanneau(o);
    ui.animer = animer;
    zone.innerHTML = CONTENUS[o]();
    ui.animer = false;
    corrigerTypographie(zone);
  }

  function choisir(o: Onglet, { focus = false, entree = true } = {}): void {
    if (o !== 'enregistres') ui.retire = null;
    ui.onglet = o;
    for (const tab of $$('[data-mc-onglet]')) {
      const actif = tab.dataset.mcOnglet === o;
      tab.setAttribute('aria-selected', String(actif));
      tab.tabIndex = actif ? 0 : -1;
      if (actif && focus) tab.focus();
    }
    for (const p of $$('[data-mc-panneau]')) p.hidden = p.dataset.mcPanneau !== o;
    ui.animer = entree;
    rendrePanneau(o, { entree });
    ui.animer = false;
    placerIndicateur();
    const url = new URL(location.href);
    url.searchParams.set('onglet', o);
    history.replaceState(null, '', url);
  }

  /* Menu d'actions d'une ligne ------------------------------------------------------------- */

  const menu = $('[data-mc-menu]') as HTMLElement;
  let menuBouton: HTMLElement | null = null;
  type Entree =
    ['lien', string, string, string] | ['action', string, string, string, boolean?] | ['sep'];
  function entreesMenu(c: Creation): Entree[] {
    if (c.statut === 'brouillon')
      return [
        ['lien', 'pen', c.pret ? 'Modifier dans l’éditeur' : 'Continuer la rédaction', editeur(c)],
        ...(c.pret ? [['action', 'send', 'Publier la création', 'publier'] as Entree] : []),
        ['sep'],
        ['action', 'trash', 'Supprimer le brouillon', 'supprimer', true],
      ];
    return [
      ['lien', 'eye', 'Voir la fiche', adresseCreation(c.api)],
      ['lien', 'pen', 'Modifier', editeur(c)],
      ['action', 'eye-off', 'Repasser en brouillon', 'depublier'],
      ['sep'],
      ['action', 'trash', 'Supprimer la création', 'supprimer', true],
    ];
  }
  function ouvrirMenu(bouton: HTMLElement): void {
    fermerMenu(false);
    const c = parId(Number(bouton.dataset.mcMenuPour));
    if (!c) return;
    menuBouton = bouton;
    menu.dataset.mcId = String(c.id);
    menu.setAttribute(
      'aria-label',
      typo(`Actions pour ${c.titre ? `« ${c.titre} »` : 'le brouillon sans titre'}`),
    );
    menu.innerHTML = `<p class="mc-menu-titre" aria-hidden="true">${c.titre ? t(c.titre) : 'Brouillon sans titre'}</p>${entreesMenu(
      c,
    )
      .map((e) =>
        e[0] === 'sep'
          ? '<hr aria-hidden="true">'
          : e[0] === 'lien'
            ? `<a class="mc-menu-item" role="menuitem" tabindex="-1" href="${esc(e[3])}">${icon(e[1])}${t(e[2])}</a>`
            : `<button class="mc-menu-item${e[4] ? ' is-danger' : ''}" role="menuitem" tabindex="-1" type="button" data-mc-action="${e[3]}"${e[3] === 'publier' && quotaAtteint() ? ' disabled' : ''}>${icon(e[1])}${t(e[2])}</button>`,
      )
      .join('')}`;
    menu.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    const r = bouton.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const bas = r.bottom + 6 + h > window.innerHeight - 8;
    menu.style.left = `${Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))}px`;
    menu.style.top = `${bas ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    menu.style.transformOrigin = bas ? 'bottom right' : 'top right';
    $$('[role="menuitem"]:not([disabled])', menu)[0]?.focus();
  }
  function fermerMenu(rendreFocus = true): void {
    if (menu.hidden) return;
    menu.hidden = true;
    menuBouton?.setAttribute('aria-expanded', 'false');
    if (rendreFocus) menuBouton?.focus();
    menuBouton = null;
  }
  menu.addEventListener('keydown', (event) => {
    const items = $$('[role="menuitem"]:not([disabled])', menu);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      fermerMenu();
      return;
    }
    if (event.key === 'Tab') {
      fermerMenu(false);
      return;
    }
    const suivant = {
      ArrowDown: (i + 1) % items.length,
      ArrowUp: (i - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (suivant === undefined) return;
    event.preventDefault();
    items[suivant]?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    const cible = event.target as Element;
    if (!menu.hidden && !menu.contains(cible) && !cible.closest('[data-mc-menu-pour]'))
      fermerMenu(false);
  });
  window.addEventListener('resize', () => {
    fermerMenu(false);
    placerIndicateur();
  });
  window.addEventListener(
    'scroll',
    () => {
      if (!menu.hidden && window.innerWidth > 720) fermerMenu(false);
    },
    { passive: true },
  );

  /* Dialogue de confirmation ------------------------------------------------------------------ */

  const dialogue = $('[data-mc-dialogue]') as HTMLDialogElement;
  const confirmer = $('[data-mc-dialogue-confirmer]') as HTMLButtonElement;
  let surConfirmation: (() => void | Promise<void>) | null = null;
  let retourFocus: Element | null = null;
  interface Demande {
    icone: string;
    titre: string;
    texte: string;
    plus?: string;
    bouton: string;
    danger?: boolean;
    consentement?: boolean;
    action: () => void | Promise<void>;
  }
  function demander({
    icone,
    titre,
    texte,
    plus = '',
    bouton,
    danger = false,
    consentement = false,
    action,
  }: Demande): void {
    retourFocus = document.activeElement;
    dialogue.returnValue = '';
    dialogue.classList.toggle('is-danger', danger);
    ($('[data-mc-dialogue-icone]') as HTMLElement).innerHTML = icon(icone, '');
    ($('[data-mc-dialogue-titre]') as HTMLElement).textContent = typo(titre);
    ($('[data-mc-dialogue-texte]') as HTMLElement).textContent = typo(texte);
    ($('[data-mc-dialogue-plus]') as HTMLElement).innerHTML = plus;
    confirmer.textContent = typo(bouton);
    confirmer.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    confirmer.disabled = consentement;
    surConfirmation = action;
    dialogue.showModal();
    const coche = $('[data-mc-consentement]', dialogue);
    (coche ?? (danger ? $('[data-mc-dialogue-annuler]') : confirmer))?.focus();
  }
  dialogue.addEventListener('change', (event) => {
    const cible = event.target as HTMLInputElement;
    if (cible.matches('[data-mc-consentement]')) confirmer.disabled = !cible.checked;
  });
  $('[data-mc-dialogue-annuler]')?.addEventListener('click', () => dialogue.close('annuler'));
  dialogue.addEventListener('click', (event) => {
    if (event.target === dialogue) dialogue.close('annuler');
  });
  $('[data-mc-dialogue-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (confirmer.disabled) return;
    const action = surConfirmation;
    dialogue.close('confirmer');
    void action?.();
  });
  dialogue.addEventListener('close', () => {
    if (
      dialogue.returnValue !== 'confirmer' &&
      retourFocus instanceof HTMLElement &&
      document.contains(retourFocus)
    )
      retourFocus.focus();
    surConfirmation = null;
  });

  /* Actions ------------------------------------------------------------------------------------ */

  async function sortir(el: HTMLElement | null): Promise<void> {
    if (!el || !animations.completes()) return;
    await el
      .animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateX(-14px)' },
        ],
        { duration: 200, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' },
      )
      .finished.catch(() => undefined);
    if (el.tagName !== 'TR') {
      const s = getComputedStyle(el);
      await el
        .animate(
          [
            {
              height: `${el.offsetHeight}px`,
              paddingTop: s.paddingTop,
              paddingBottom: s.paddingBottom,
            },
            { height: '0px', paddingTop: '0px', paddingBottom: '0px' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
        )
        .finished.catch(() => undefined);
    }
  }
  /** Après une sortie de liste, le focus va à la ligne suivante, sinon au panneau. */
  function focusApres(o: Onglet, index: number): void {
    const titres = $$(`[data-mc-panneau="${o}"] .mc-ligne-titre a`);
    (titres[Math.min(index, titres.length - 1)] ?? $(`[data-mc-panneau="${o}"]`))?.focus();
  }
  const indexLigne = (o: Onglet, id: number) =>
    $$(`[data-mc-panneau="${o}"] [data-mc-id]`).findIndex((el) => el.dataset.mcId === String(id));
  const ligne = (o: Onglet, id: number) => $(`[data-mc-panneau="${o}"] [data-mc-id="${id}"]`);
  function annoncer(message: string): void {
    const el = $('[data-mc-annonce]');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = typo(message);
    });
  }
  /** Refus ou panne : la raison de l'API, ou un message d'attente. */
  function signalerEchec(probleme: ProblemeApi): void {
    if (probleme.status === 404) toast('Cette création n’est plus disponible.', 'alert');
    else if (probleme.status && probleme.status < 500)
      toast(probleme.detail ?? probleme.title, 'alert');
    else toast('L’action n’a pas abouti. Réessayez dans un instant.', 'alert');
  }
  /** Sortie de la ligne, données relues, panneau rendu de nouveau. */
  async function apresAction(o: Onglet, c: Creation, nouveau = false): Promise<void> {
    const i = indexLigne(o, c.id);
    await Promise.all([sortir(ligne(o, c.id)), recharger()]);
    ui.nouveau = nouveau ? c.id : null;
    compter();
    rendrePanneau(o);
    ui.nouveau = null;
    focusApres(o, i);
  }

  function publier(c: Creation): void {
    if (!exiger('contribuer', 'publier une création')) return;
    if (quotaAtteint()) return;
    const defi = c.defi
      ? `<p class="mc-defi" style="margin-bottom:14px">${icon('trophy')}${t(`Elle participera au défi « ${c.defi.titre} ».`)}</p>`
      : '';
    demander({
      icone: 'send',
      titre: `Publier ${nomCreation(c)} ?`,
      bouton: 'Publier la création',
      consentement: true,
      texte:
        'Elle sera visible de tous les membres et des visiteurs, sur votre profil et dans Explorer. Vous pourrez la modifier ou la repasser en brouillon à tout moment.',
      plus: `${defi}<label class="mc-consentement"><input type="checkbox" data-mc-consentement><span>${t('Je confirme ne publier aucune donnée personnelle de tiers ni aucun secret.')}</span></label>`,
      action: async () => {
        const reponse = await api('POST', `/api/v1/creations/${c.id}/publication`, {
          confirmationDonnees: true,
        });
        if (!reponse.ok) {
          signalerEchec(reponse.probleme);
          await recharger();
          rendrePanneau('brouillons');
          return;
        }
        await apresAction('brouillons', c, true);
        toast('Création publiée.');
        annoncer(`${c.titre} est publiée. Retrouvez-la dans l’onglet Publiées.`);
      },
    });
  }

  function depublier(c: Creation): void {
    if (!exiger('contribuer', 'repasser une création en brouillon')) return;
    demander({
      icone: 'eye-off',
      titre: `Repasser « ${c.titre} » en brouillon ?`,
      bouton: 'Repasser en brouillon',
      texte:
        'Elle ne sera plus visible sur Vysora. Ses commentaires et ses reproductions seront masqués jusqu’à sa republication ; ses votes sont conservés.',
      action: async () => {
        const reponse = await api('DELETE', `/api/v1/creations/${c.id}/publication`);
        if (!reponse.ok) return signalerEchec(reponse.probleme);
        await apresAction('publies', c, true);
        toast('Création repassée en brouillon.', 'eye-off');
        annoncer(`${c.titre} est repassée en brouillon.`);
      },
    });
  }

  /* RG-19 : la suppression reste permise à un compte en lecture seule (l'API l'accepte). */
  function supprimer(c: Creation): void {
    const publiee = c.statut === 'publiee';
    const consequences: [string, string][] = publiee
      ? [
          ...(c.commentaires || c.essais
            ? [
                [
                  'message',
                  `${plusieurs(c.commentaires, 'commentaire', 'commentaires')} et ${plusieurs(c.essais, 'reproduction', 'reproductions')} ne seront plus visibles`,
                ] as [string, string],
              ]
            : []),
          ...(c.api.points
            ? [
                [
                  'alert',
                  `${fmt(c.api.points)} points de réputation liés à cette création vous seront retirés`,
                ] as [string, string],
              ]
            : []),
        ]
      : [];
    demander({
      icone: 'trash',
      danger: true,
      titre: publiee ? `Supprimer « ${c.titre} » ?` : 'Supprimer ce brouillon ?',
      texte: publiee
        ? 'La création disparaîtra pour tous les membres. Cette suppression est définitive.'
        : `${c.titre ? `« ${c.titre} »` : 'Ce brouillon sans titre'} sera supprimé définitivement, avec le chemin parcouru déjà saisi.`,
      plus: consequences.length
        ? `<ul class="mc-dialogue-liste">${consequences.map(([ic, txt]) => `<li>${icon(ic)}${t(txt)}</li>`).join('')}</ul>`
        : '',
      bouton: publiee ? 'Supprimer la création' : 'Supprimer le brouillon',
      action: async () => {
        const reponse = await api('DELETE', `/api/v1/creations/${c.id}`);
        if (!reponse.ok) return signalerEchec(reponse.probleme);
        await apresAction(publiee ? 'publies' : 'brouillons', c);
        toast(publiee ? 'Création supprimée.' : 'Brouillon supprimé.', 'trash');
      },
    });
  }

  async function retirer(cle: string): Promise<void> {
    const x = enregistres.find((y) => y.cle === cle);
    if (!x || !exiger('contribuer', 'retirer un contenu de vos enregistrés')) return;
    const reponse = await api('DELETE', `/api/v1/contenus/${x.id}/enregistrement`);
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    enregistres = enregistres.filter((y) => y.cle !== cle);
    ui.retire = x;
    compter();
    rendreListe('enregistres');
    $(`[data-mc-cle="${CSS.escape(cle)}"] [data-mc-action="annuler-retrait"]`)?.focus();
    annoncer(`${x.titre} est retiré de vos enregistrés. Bouton Annuler disponible.`);
  }
  async function annulerRetrait(): Promise<void> {
    const x = ui.retire;
    if (!x || !exiger('contribuer', 'enregistrer ce contenu')) return;
    const reponse = await api('PUT', `/api/v1/contenus/${x.id}/enregistrement`);
    if (!reponse.ok) return signalerEchec(reponse.probleme);
    // Enregistré de nouveau : il prend la date d'aujourd'hui (RG-45, une ligne par contenu).
    enregistres.push({ ...x, date: new Date().toISOString() });
    ui.retire = null;
    compter();
    rendreListe('enregistres');
    $(`[data-mc-cle="${CSS.escape(x.cle)}"] .mc-ligne-titre a`)?.focus();
    toast('Remis dans vos enregistrés.', 'bookmark');
  }

  function basculerManques(bouton: HTMLElement): void {
    const id = Number(bouton.closest<HTMLElement>('[data-mc-id]')?.dataset.mcId);
    const zone = $(`#mc-manques-${id}`);
    if (!zone) return;
    const ouvert = !ui.ouverts.has(id);
    if (ouvert) ui.ouverts.add(id);
    else ui.ouverts.delete(id);
    bouton.setAttribute('aria-expanded', String(ouvert));
    zone.classList.toggle('is-ouvert', ouvert);
    zone.toggleAttribute('inert', !ouvert);
    if (ouvert) zone.removeAttribute('aria-hidden');
    else zone.setAttribute('aria-hidden', 'true');
  }

  /* Événements ----------------------------------------------------------------------------------- */

  document.addEventListener('click', (event) => {
    const cible = (event.target as Element).closest<HTMLElement>(
      '[data-mc-onglet], [data-mc-menu-pour], [data-mc-action], [data-mc-filtre], [data-mc-trier]',
    );
    if (!cible) return;
    const d = cible.dataset;
    if (d.mcOnglet && cible.getAttribute('role') === 'tab') {
      if (d.mcOnglet !== ui.onglet) choisir(d.mcOnglet as Onglet);
      return;
    }
    if (d.mcMenuPour) {
      if (menuBouton === cible) fermerMenu();
      else ouvrirMenu(cible);
      return;
    }
    if (d.mcFiltre) {
      ui.filtre[ui.onglet] = d.mcFiltre;
      for (const b of $$(`[data-mc-panneau="${ui.onglet}"] [data-mc-filtre]`))
        b.setAttribute('aria-pressed', String(b === cible));
      rendreListe(ui.onglet, true);
      return;
    }
    if (d.mcTrier) {
      if (ui.tri.publies === d.mcTrier) ui.sens = ui.sens === 'desc' ? 'asc' : 'desc';
      else {
        ui.tri.publies = d.mcTrier;
        ui.sens = 'desc';
      }
      const select = $<HTMLSelectElement>('[data-mc-tri="publies"]');
      if (select) select.value = d.mcTrier;
      rendreListe('publies', true);
      $(`[data-mc-trier="${d.mcTrier}"]`)?.focus();
      annoncer(
        `Tri par ${(cible.textContent ?? '').trim().toLowerCase()}, ordre ${ui.sens === 'asc' ? 'croissant' : 'décroissant'}.`,
      );
      return;
    }
    const action = d.mcAction;
    const id = menu.contains(cible)
      ? menu.dataset.mcId
      : cible.closest<HTMLElement>('[data-mc-id]')?.dataset.mcId;
    const c = id ? parId(Number(id)) : undefined;
    if (menu.contains(cible)) fermerMenu(true);
    if (action === 'manques') basculerManques(cible);
    else if (action === 'publier' && c) publier(c);
    else if (action === 'depublier' && c) depublier(c);
    else if (action === 'supprimer' && c) supprimer(c);
    else if (action === 'retirer')
      void retirer(cible.closest<HTMLElement>('[data-mc-cle]')?.dataset.mcCle ?? '');
    else if (action === 'annuler-retrait') void annulerRetrait();
    else if (action === 'aller') choisir(d.mcOngletCible as Onglet, { focus: true });
    else if (action === 'effacer') {
      const o = d.mcOngletCible as Onglet;
      ui.recherche[o] = '';
      const champ = $<HTMLInputElement>(`[data-mc-recherche="${o}"]`);
      if (champ) champ.value = '';
      cible.hidden = true;
      rendreListe(o);
      champ?.focus();
    } else if (action === 'reinitialiser') {
      const o = d.mcOngletCible as Onglet;
      ui.recherche[o] = '';
      ui.filtre[o] = o === 'enregistres' ? 'tout' : 'tous';
      rendrePanneau(o);
      $(`[data-mc-recherche="${o}"]`)?.focus();
    }
  });

  let attente: ReturnType<typeof setTimeout> | undefined;
  document.addEventListener('input', (event) => {
    const champ = (event.target as Element).closest<HTMLInputElement>('[data-mc-recherche]');
    if (!champ) return;
    const o = champ.dataset.mcRecherche as Onglet;
    ui.recherche[o] = champ.value;
    const effacer = $(`[data-mc-panneau="${o}"] [data-mc-action="effacer"]`);
    if (effacer) effacer.hidden = !champ.value;
    clearTimeout(attente);
    attente = setTimeout(() => {
      rendreListe(o);
      const n = $$(
        `[data-mc-zone-liste="${o}"] [data-mc-id], [data-mc-zone-liste="${o}"] [data-mc-cle]`,
      ).length;
      annoncer(champ.value ? `${n} résultat${n > 1 ? 's' : ''}.` : '');
    }, 140);
  });
  document.addEventListener('change', (event) => {
    const select = (event.target as Element).closest<HTMLSelectElement>('[data-mc-tri]');
    if (!select) return;
    const o = select.dataset.mcTri as Onglet;
    ui.tri[o] = select.value;
    if (o === 'publies') ui.sens = 'desc';
    rendreListe(o, true);
  });
  document.addEventListener('keydown', (event) => {
    const cible = event.target as HTMLElement;
    if (
      event.key === 'Escape' &&
      cible.closest('[data-mc-recherche]') &&
      (cible as HTMLInputElement).value
    ) {
      event.preventDefault();
      $(`[data-mc-panneau="${cible.dataset.mcRecherche}"] [data-mc-action="effacer"]`)?.click();
      return;
    }
    const tab = cible.closest<HTMLElement>('[data-mc-onglets] [role="tab"]');
    if (!tab) return;
    const i = ONGLETS.indexOf(tab.dataset.mcOnglet as Onglet);
    const suivant = { ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2 }[event.key];
    if (suivant === undefined) return;
    event.preventDefault();
    choisir(ONGLETS[suivant] as Onglet, { focus: true });
  });
  if ('ResizeObserver' in window) {
    const onglets = $('[data-mc-onglets]');
    if (onglets) new ResizeObserver(placerIndicateur).observe(onglets);
  }
  void document.fonts?.ready.then(placerIndicateur);

  root.classList.add('mc-demarre');
  compter();
  choisir(ui.onglet, { entree: true });
  requestAnimationFrame(placerIndicateur);
}
