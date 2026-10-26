/* Page Notifications (NOTIF-01, EC-16, F-81), portée de prototype/notifications.js : boîte de
   réception du membre connecté. À gauche, la liste compacte ; à droite, le volet de lecture qui
   montre la notification dans son contexte (fil de discussion, résultat d'un essai, badge…) et
   permet de répondre sur place. Sans sélection, le volet présente ce qui s'est passé depuis la
   dernière visite. Sous 1 100 px, la notification se déplie sous sa ligne.
   Lire une notification la marque comme lue dans l'API ; le nombre de non lues de l'en-tête suit.
   Réglages du prototype retenus : lecture en volet, regroupement par date, pastille des non lues,
   extraits affichés, pas d'arrivée simulée pendant la visite. */

import {
  BAREME_REPUTATION,
  LONGUEURS,
  NIVEAUX,
  niveauPourReputation,
  type CommentaireApi,
  type LectureNotificationsApi,
  type MembreResumeApi,
  type MessageNotificationApi,
  type NotificationApi,
  type NotificationsApi,
  type PreferencesNotificationsApi,
} from '@vysora/shared';
import { LIBELLES_TYPE } from '../lib/creations';
import { ROUTES } from '../lib/navigation';
import {
  CATEGORIES,
  CLES,
  GENRES,
  GROUPES,
  RESULTATS,
  VUES,
  aTraiter,
  categorieDe,
  courte,
  dateLongue,
  deNom,
  ecart,
  epinglee,
  finSuspension,
  lundi,
  majuscule,
  motSujet,
  quand,
  resume,
  texteNiveau,
  titreCible,
  titreDetail,
  type Vue,
} from '../lib/notifications';
import { dateCourte } from '../lib/texte';
import { exiger, invitation } from './commun/acces';
import { api } from './commun/api';
import { afficherNonLues } from './commun/compte';
import { etats } from './commun/etats';
import { $, $$, animations, esc, fmt, icon, pluriel, t, toast, typo } from './commun/outils';

interface DonneesPage {
  notifications: NotificationsApi | null;
  maintenant: string;
}

function lireDonnees(): DonneesPage | null {
  const source = document.getElementById('nt-donnees')?.textContent;
  if (!source) return null;
  try {
    return JSON.parse(source) as DonneesPage;
  } catch {
    return null;
  }
}

const donnees = lireDonnees();
// Heure du serveur au rendu : les dates relatives ne dépendent pas de l'horloge de l'appareil.
const decalage = donnees ? new Date(donnees.maintenant).getTime() - Date.now() : 0;
const maintenant = () => new Date(Date.now() + decalage);

const PAGE = 16;
const large = window.matchMedia('(min-width: 1100px)');
const params = new URLSearchParams(location.search);
const vueDemandee = params.get('vue');
const typeDemande = params.get('type');
const notificationDemandee = Number(params.get('notification')) || null;

let page: NotificationsApi | null = donnees?.notifications ?? null;
let liste: NotificationApi[] = page?.elements ?? [];
let suivant = page?.suivant ?? null;
let nonLuesTotal = page?.nonLues ?? etats.nonLues();
let etatDonnees: 'remplies' | 'chargement' | 'erreur' = page ? 'remplies' : 'erreur';

const ui = {
  vue: (VUES.some(([id]) => id === vueDemandee) ? vueDemandee : 'toutes') as Vue,
  type: CATEGORIES.some((c) => c.id === typeDemande) ? (typeDemande as string) : 'tout',
  selection: notificationDemandee as number | null,
  focusId: null as number | null,
  limite: PAGE,
  brouillons: new Map<number, string>(),
  animer: true,
  annulation: null as { ids: number[] } | null,
  minuteurFait: undefined as ReturnType<typeof setTimeout> | undefined,
  jaugeVue: false,
  chargementPlus: false,
};

const parId = (id: number | null) => liste.find((n) => n.id === id);
const nonLue = (n: NotificationApi) => !n.lue;
const lecture = (): 'volet' | 'deplie' => (large.matches ? 'volet' : 'deplie');
const moi = () => etats.moi();

/* Contenu concerné ------------------------------------------------------------------------------ */

const EST_ECHANGE = ['COMMENTAIRE_RECU', 'REPONSE_COMMENTAIRE'];

/** Adresse du contenu concerné et libellé du lien (prototype : cible). */
function lien(n: NotificationApi): { href: string | null; ouvrir: string } {
  const pseudo = moi()?.pseudo ?? '';
  if (n.type === 'BADGE_OBTENU')
    return { href: `${ROUTES.profil(pseudo)}#pf-t-badges`, ouvrir: 'Voir mes badges' };
  if (n.type === 'NIVEAU_ATTEINT')
    return { href: `${ROUTES.classements}#regles`, ouvrir: 'Voir les niveaux' };
  const c = n.cible;
  if (!c) return { href: null, ouvrir: '' };
  switch (c.nature) {
    case 'CREATION': {
      const fiche = ROUTES.creation(c.id, c.slug);
      const ouvrir = c.aMoi ? 'Ouvrir la création' : 'Voir la conversation';
      if (EST_ECHANGE.includes(n.type) && n.repondreA)
        return { href: `${fiche}#commentaire-${n.repondreA.commentaireId}`, ouvrir };
      return { href: fiche, ouvrir };
    }
    case 'SUJET':
      return { href: ROUTES.sujet(c.id, c.slug), ouvrir: 'Ouvrir le sujet' };
    case 'CAS_BON_REFLEXE':
      return { href: ROUTES.bonReflexe, ouvrir: 'Voir Bon réflexe' };
    case 'DEFI':
      return { href: ROUTES.defis, ouvrir: 'Voir les défis' };
  }
}

/* Visuels --------------------------------------------------------------------------------------- */

const TYPE_TAG: Record<string, string> = {
  UN_PROMPT: 'prompt',
  ITERATION: 'iteration',
  PROJET: 'projet',
};
const typeTag = (type: keyof typeof LIBELLES_TYPE) =>
  `<span class="type-tag" data-type="${TYPE_TAG[type]}">${icon(`type-${TYPE_TAG[type]}`)}${t(LIBELLES_TYPE[type])}</span>`;

/** Photo d'un membre, ou la silhouette par défaut. */
function photo(m: Pick<MembreResumeApi, 'avatar'> | null, classe = ''): string {
  const classes = `nt-photo${classe ? ` ${classe}` : ''}`;
  return m?.avatar
    ? `<img class="${classes}" src="${esc(m.avatar)}" alt="" width="56" height="56" loading="lazy" decoding="async">`
    : `<span class="avatar compte-avatar ${classes}" aria-hidden="true">${icon('user', '')}</span>`;
}
const puce = (nom: string, ton = 'accent') =>
  `<span class="nt-puce" data-ton="${ton}">${icon(nom, '')}</span>`;
const rond = (nom: string, ton: string) =>
  `<span class="nt-rond" data-ton="${ton}">${icon(nom, '')}</span>`;
const TONS: Record<string, string> = { BLEU: 'blue', VERT: 'green', AMBRE: 'amber', ENCRE: 'ink' };
const HEX =
  '<path class="emblem-bg" d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/><path class="emblem-ring" d="M28 10.5 44.4 20v20L28 49.5 11.6 40V20z"/>';
function embleme(n: NotificationApi, classe = ''): string {
  const ton = TONS[n.badge?.ton ?? 'BLEU'] ?? 'blue';
  return `<span class="emblem nt-embleme${classe ? ` ${classe}` : ''}" data-tone="${ton}"><svg class="emblem-shape" viewBox="0 0 56 60">${HEX}</svg>${icon(n.badge?.icone ?? 'award', '')}</span>`;
}

function visuel(n: NotificationApi): string {
  switch (n.type) {
    case 'VOTES_UTILE_RECUS': {
      const deux = n.votants.slice(0, 2);
      return `<span class="nt-pile${deux.length > 1 ? ' is-double' : ''}">${(deux.length ? deux : [n.par]).map((m) => photo(m)).join('')}</span>${puce('utile')}`;
    }
    case 'COMMENTAIRE_RECU':
      return photo(n.par) + puce('message');
    case 'REPONSE_COMMENTAIRE':
    case 'REPONSE_SUJET':
      return photo(n.par) + puce('reply');
    case 'REPONSE_ACCEPTEE':
      return photo(n.par) + puce('check', 'succes');
    case 'REPRODUCTION_RECUE': {
      const r = n.reproduction?.resultat;
      return (
        photo(n.par) +
        puce('repeat', r === 'SUCCES' ? 'succes' : r === 'PARTIEL' ? 'attention' : 'neutre')
      );
    }
    case 'VARIANTE_PUBLIEE':
      return photo(n.par) + puce('branche');
    case 'BADGE_OBTENU':
      return embleme(n);
    case 'NIVEAU_ATTEINT':
      return rond('palier', 'accent');
    case 'CAS_VALIDE':
      return rond('shield', 'accent');
    case 'CAS_REFUSE':
      return rond('shield-x', 'attention');
    case 'RESULTAT_DEFI':
      return rond('trophy', 'attention');
    case 'OBSOLESCENCE_SIGNALEE':
      return rond('alert', 'attention');
    case 'CONTENU_MASQUE':
      return rond('eye-off', 'encre');
    case 'CONTENU_RETABLI':
      return rond('eye', 'succes');
    case 'DECISION_MODERATION':
      return rond(n.decision?.action === 'SUSPENDRE' ? 'lock' : 'shield', 'encre');
  }
}

const logoOutil = (logo: string | null, monochrome: boolean) =>
  logo
    ? `<img class="tool-logo${monochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(logo)}.svg" alt="" width="18" height="18" decoding="async">`
    : '';
function outilHTML(n: NotificationApi['reproduction'] | NotificationApi['variante']): string {
  if (!n?.outil) return '';
  return `<span class="nt-outil">${logoOutil(n.outil.logo, n.outil.logoMonochrome)}${t(n.outil.nom)}${n.modele ? ` · ${t(n.modele)}` : ''}</span>`;
}

/* Textes de la liste ---------------------------------------------------------------------------- */

const qui = (nom: string) => `<b class="nt-qui">${t(nom)}</b>`;
const rang = (r: number) => `${r}<sup>${r === 1 ? 're' : 'e'}</sup>`;
const nomPar = (n: NotificationApi) => n.par?.nom ?? 'Un membre';

function votantsHTML(n: NotificationApi): string {
  const noms = n.votants.map((m) => m.nom);
  const [a = nomPar(n), b] = noms;
  if (n.nombre <= 1 || !b) return `${qui(a)} a voté`;
  if (n.nombre === 2) return `${qui(a)} et ${qui(b)} ont voté`;
  return `${qui(a)}, ${qui(b)} et ${t(pluriel(n.nombre - 2, 'autre membre', 'autres membres'))} ont voté`;
}

/** Ligne de la liste : qui fait quoi, sur quel contenu, et un extrait (prototype : entete). */
function entete(n: NotificationApi): { quoi: string; titre: string; extrait: string } {
  const extrait = (s: string | null) =>
    s ? `<span class="nt-guillemets">${t(`« ${s.replace(/\s+/g, ' ').trim()} »`)}</span>` : '';
  const points = (p: number | null) =>
    p ? `<span class="nt-points">${t(`+${p} points`)}</span>` : '';
  const titre = titreCible(n);
  switch (n.type) {
    case 'COMMENTAIRE_RECU':
      return { quoi: `${qui(nomPar(n))} a commenté`, titre, extrait: extrait(n.texte) };
    case 'REPONSE_COMMENTAIRE':
      return {
        quoi: `${qui(nomPar(n))} a répondu à votre commentaire`,
        titre,
        extrait: extrait(n.texte),
      };
    case 'REPONSE_SUJET':
      return {
        quoi: `${qui(nomPar(n))} a répondu à votre ${t(motSujet(n))}`,
        titre,
        extrait: extrait(n.texte),
      };
    case 'REPONSE_ACCEPTEE':
      return {
        quoi: `${qui(nomPar(n))} a accepté votre réponse`,
        titre,
        extrait: points(n.points),
      };
    case 'REPRODUCTION_RECUE': {
      const r = n.reproduction;
      if (!r) return { quoi: `${qui(nomPar(n))} a essayé`, titre, extrait: '' };
      const [ic, libelle, cle] = RESULTATS[r.resultat];
      return {
        quoi: `${qui(nomPar(n))} a essayé`,
        titre,
        extrait: `<span class="nt-res" data-resultat="${cle}">${icon(ic, 'icon-xs')}${t(libelle)}</span><span class="nt-sep" aria-hidden="true">·</span>${t([r.outil.nom, r.modele].filter(Boolean).join(' · '))}`,
      };
    }
    case 'VARIANTE_PUBLIEE':
      return {
        quoi: `${qui(nomPar(n))} a publié une variante`,
        titre: n.variante?.titre ?? titre,
        extrait: n.cible ? t(`de « ${n.cible.titre} »`) : '',
      };
    case 'VOTES_UTILE_RECUS':
      return {
        quoi: `${votantsHTML(n)} ${t('« Utile »')}`,
        titre: n.surReponse && n.cible ? `Votre réponse à « ${n.cible.titre} »` : titre,
        extrait: points(n.points),
      };
    case 'OBSOLESCENCE_SIGNALEE':
      return {
        quoi: 'Signalée comme ne fonctionnant plus',
        titre,
        extrait: n.obsolescence
          ? t(`Avec ${n.obsolescence.modele} · ${n.obsolescence.membres} membres`)
          : '',
      };
    case 'CONTENU_MASQUE':
      return { quoi: 'Masquée par la modération', titre, extrait: t(n.motif ?? '') };
    case 'CONTENU_RETABLI':
      return { quoi: 'De nouveau visible', titre, extrait: t(n.motif ?? '') };
    case 'BADGE_OBTENU':
      return {
        quoi: 'Badge obtenu',
        titre: `« ${n.badge?.libelle ?? ''} »`,
        extrait: t(n.badge?.critere ?? ''),
      };
    case 'NIVEAU_ATTEINT':
      return {
        quoi: 'Niveau atteint',
        titre: n.niveau?.libelle ?? '',
        extrait: t(`${fmt(n.niveau?.seuilPoints ?? 0)} points et plus`),
      };
    case 'CAS_VALIDE':
      return { quoi: 'Cas Bon réflexe validé', titre, extrait: points(n.points) };
    case 'CAS_REFUSE':
      return { quoi: 'Cas Bon réflexe à corriger', titre, extrait: t(n.motif ?? '') };
    case 'RESULTAT_DEFI':
      return {
        quoi: `Défi clos${t(' :')} ${rang(n.defi?.rang ?? 0)} sur ${fmt(n.defi?.participants ?? 0)}`,
        titre,
        extrait: points(n.points),
      };
    case 'DECISION_MODERATION':
      return {
        quoi: 'Décision de la modération',
        titre:
          n.decision?.action === 'SUSPENDRE'
            ? `Compte suspendu jusqu’au ${finSuspension(n)}`
            : 'Avertissement',
        extrait: t(n.motif ?? ''),
      };
  }
}

/* Liste ----------------------------------------------------------------------------------------- */

const dansType = (n: NotificationApi, type = ui.type) =>
  type === 'tout' || categorieDe(n.type) === type;
const dansVue = (n: NotificationApi, vue: Vue = ui.vue) =>
  vue === 'toutes' || (vue === 'non-lues' ? nonLue(n) : aTraiter(n));
const visibles = () => liste.filter((n) => dansType(n) && dansVue(n));
const libelleType = () => CATEGORIES.find((c) => c.id === ui.type)?.libelle ?? '';

/** Ordre d'affichage : décisions épinglées, puis la liste par date. */
function ordre(): NotificationApi[] {
  const items = visibles();
  return [...items.filter(epinglee), ...items.filter((n) => !epinglee(n))];
}

function item(n: NotificationApi, i: number): string {
  const e = entete(n);
  const nl = nonLue(n);
  const choisie = ui.selection === n.id;
  const mode = lecture();
  const etiquette = majuscule(resume(n));
  const controle =
    mode === 'volet'
      ? `aria-controls="nt-volet" aria-current="${choisie}"`
      : `aria-expanded="${choisie}" aria-controls="nt-d-${n.id}"`;
  return `<li class="nt-item${nl ? ' is-nonlue' : ''}${choisie ? ' is-choisie' : ''}${epinglee(n) ? ' is-epinglee' : ''}${ui.animer ? ' is-entree' : ''}" style="--i:${Math.min(i, 10)}" data-nt-id="${n.id}" data-nt-type="${CLES[n.type]}">
      <button class="nt-pastille" type="button" tabindex="-1" data-nt-basculer="${n.id}" aria-label="${esc(typo(`${nl ? 'Marquer comme lue' : 'Marquer comme non lue'} : ${etiquette}`))}"><span aria-hidden="true"></span></button>
      <button class="nt-ouvrir" type="button" id="nt-o-${n.id}" data-nt-choisir="${n.id}" data-nt-nav ${controle} tabindex="${ui.focusId === n.id ? 0 : -1}">
        <span class="nt-visuel" aria-hidden="true">${visuel(n)}</span>
        <span class="nt-item-corps">
          <span class="nt-item-haut"><span class="nt-item-quoi">${nl ? '<span class="sr-only">Non lue : </span>' : ''}${e.quoi}</span><time datetime="${n.date}">${t(courte(n.date, maintenant()))}</time></span>
          <span class="nt-item-titre">${t(e.titre)}</span>
          ${e.extrait ? `<span class="nt-item-extrait">${e.extrait}</span>` : ''}
          ${aTraiter(n) ? `<span class="nt-item-marque">${icon('circle-dot', 'icon-xs')}À traiter</span>` : ''}
        </span>
      </button>
      ${mode === 'deplie' && choisie ? `<div class="nt-deplie" id="nt-d-${n.id}" role="region" aria-labelledby="nt-o-${n.id}">${detail(n, true)}</div>` : ''}
    </li>`;
}

function parDate(items: NotificationApi[], depart: number): string {
  const groupes: { id: string; titre: string; items: NotificationApi[] }[] = [];
  for (const n of items) {
    const jours = ecart(n.date, maintenant());
    const g = GROUPES.find(([, , test]) => test(jours)) ?? GROUPES[GROUPES.length - 1];
    if (!g) continue;
    let groupe = groupes.find((x) => x.id === g[0]);
    if (!groupe) {
      groupe = { id: g[0], titre: g[1], items: [] };
      groupes.push(groupe);
    }
    groupe.items.push(n);
  }
  let i = depart;
  return groupes
    .map(
      (g) => `<section class="nt-groupe" aria-labelledby="nt-g-${g.id}">
      <h3 class="nt-groupe-titre" id="nt-g-${g.id}">${t(g.titre)}</h3>
      <ul class="nt-liste" aria-describedby="nt-aide-clavier">${g.items.map((n) => item(n, i++)).join('')}</ul>
    </section>`,
    )
    .join('');
}

function videFiltre(): string {
  const type = ui.type !== 'tout' ? ` dans « ${libelleType()} »` : '';
  if (ui.vue === 'a-traiter')
    return `<div class="nt-vide-filtre">${icon('check-circle', '')}<p><b>${t(`Rien à traiter${type}.`)}</b>${t('Les questions qui vous sont posées et les alertes sur vos créations apparaîtront ici.')}</p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher toutes les notifications</button></div>`;
  if (ui.vue === 'non-lues')
    return `<div class="nt-vide-filtre">${icon('check-circle', '')}<p><b>${t(`Aucune notification non lue${type}.`)}</b>${t('Vous avez tout lu.')}</p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher toutes les notifications</button></div>`;
  return `<div class="nt-vide-filtre">${icon('inbox', '')}<p><b>${t(`Aucune notification${type} pour le moment.`)}</b></p><button class="btn btn-secondary btn-sm" type="button" data-nt-tout-voir>Afficher tous les types</button></div>`;
}

function rendreListe(): void {
  const zone = $('[data-nt-liste]');
  if (!zone) return;
  if (!liste.length && !suivant) {
    rendreEtatDonnees('vide');
    return;
  }
  const items = visibles();
  if (!items.length && !suivant) {
    zone.innerHTML = videFiltre();
    return;
  }
  if (!items.some((n) => n.id === ui.focusId))
    ui.focusId = (items.find((n) => n.id === ui.selection) ?? items[0])?.id ?? null;
  const epinglees = items.filter(epinglee);
  const reste = items.filter((n) => !epinglee(n));
  const montre = reste.slice(0, ui.limite);
  const cache = reste.length - montre.length;
  const tout = ui.type === 'tout' && ui.vue === 'toutes';
  const fin = page?.dateInscription
    ? `<p class="nt-debut">${icon('flag')}${t(`Vous avez rejoint Vysora le ${dateLongue(page.dateInscription)}.`)}</p>`
    : '';
  const plus =
    cache > 0
      ? `<div class="nt-plus"><button class="btn btn-secondary btn-sm" type="button" data-nt-plus>${icon('chevron-down')}${t(`Afficher les plus anciennes (${cache})`)}</button></div>`
      : suivant
        ? `<div class="nt-plus"><button class="btn btn-secondary btn-sm" type="button" data-nt-plus${ui.chargementPlus ? ' disabled aria-busy="true"' : ''}>${icon('chevron-down')}Afficher les plus anciennes</button></div>`
        : tout
          ? fin
          : '';
  zone.innerHTML = `${
    epinglees.length
      ? `<section class="nt-groupe is-epingle" aria-labelledby="nt-g-epingle"><h3 class="nt-groupe-titre" id="nt-g-epingle">${icon('lock')}À lire en priorité</h3><ul class="nt-liste" aria-describedby="nt-aide-clavier">${epinglees.map((n, i) => item(n, i)).join('')}</ul></section>`
      : ''
  }
      ${montre.length ? parDate(montre, epinglees.length) : items.length ? '' : videFiltre()}
      ${plus}`;
}

/* Volet de lecture ------------------------------------------------------------------------------ */

function avatarMoi(): string {
  return photo(moi() ? { avatar: moi()?.avatar ?? null } : null, 'nt-msg-photo');
}

function bulle(
  texte: string,
  options: { de?: MembreResumeApi | null; quand?: string; vous?: boolean; note?: string } = {},
): string {
  const vous = options.vous ?? false;
  return `<li class="nt-msg${vous ? ' is-vous' : ''}">
      ${vous ? avatarMoi() : photo(options.de ?? null, 'nt-msg-photo')}
      <div class="nt-bulle"><p class="nt-msg-qui"><b>${t(vous ? 'Vous' : (options.de?.nom ?? 'Un membre'))}</b>${options.quand ? `<span>${t(options.quand)}</span>` : ''}</p><p>${t(texte)}</p>${options.note ? `<p class="nt-msg-note">${options.note}</p>` : ''}</div>
    </li>`;
}
const bulleDe = (m: MessageNotificationApi, q: string) =>
  m.moi ? bulle(m.texte, { vous: true, quand: q }) : bulle(m.texte, { de: m.auteur, quand: q });

function composeur(n: NotificationApi): string {
  if (n.reponse || !n.repondreA) return '';
  const porte = invitation('contribuer', 'répondre');
  if (porte) return `<p class="nt-invitation">${icon('lock')}<span>${porte}</span></p>`;
  return `<form class="nt-repondre" data-nt-form="${n.id}" novalidate>
      <label class="nt-repondre-label" for="nt-rep-${n.id}">${t(`Répondre à ${nomPar(n)}`)}</label>
      <textarea id="nt-rep-${n.id}" rows="3" maxlength="${LONGUEURS.commentaire.max}" aria-describedby="nt-rep-aide-${n.id}" data-nt-saisie="${n.id}" placeholder="${esc(typo('Votre réponse…'))}">${esc(ui.brouillons.get(n.id) ?? '')}</textarea>
      <p class="nt-erreur" id="nt-rep-err-${n.id}" hidden></p>
      <div class="nt-repondre-pied">
        <p class="nt-repondre-aide" id="nt-rep-aide-${n.id}">${t('Publiée sous le commentaire. Ctrl + Entrée pour publier.')}</p>
        <button class="btn btn-primary btn-sm" type="submit">${icon('send')}Publier la réponse</button>
      </div>
    </form>`;
}

/** Réponse du forum : acceptée, ou sujet déjà résolu (accepter une réponse viendra avec le forum). */
function acceptation(n: NotificationApi): string {
  if (n.type !== 'REPONSE_SUJET') return '';
  if (n.acceptee)
    return `<p class="nt-fait-note">${icon('check-circle')}<span>${t('Vous avez accepté cette réponse : elle est épinglée en tête du sujet, désormais résolu.')}</span></p>`;
  if (n.sujetResolu)
    return `<p class="nt-fait-note is-neutre">${icon('check-circle')}<span>${t('Vous avez déjà accepté une autre réponse à cette question.')}</span></p>`;
  return '';
}

const periode = (debut: string, fin: string): string => {
  const d = new Date(debut);
  const f = new Date(fin);
  const memeMois = d.getUTCMonth() === f.getUTCMonth();
  const jour = (x: Date) => (x.getUTCDate() === 1 ? '1er' : String(x.getUTCDate()));
  return memeMois
    ? `du ${jour(d)} au ${dateLongue(fin).replace(/ \d{4}$/, '')}`
    : `du ${dateLongue(debut).replace(/ \d{4}$/, '')} au ${dateLongue(fin).replace(/ \d{4}$/, '')}`;
};

function corps(n: NotificationApi): string {
  if (!n.disponible)
    return `<p class="nt-texte-detail">${t('Le contenu concerné n’est plus disponible : il a été retiré par son auteur ou par la modération.')}</p>`;
  switch (n.type) {
    case 'COMMENTAIRE_RECU':
    case 'REPONSE_COMMENTAIRE':
    case 'REPONSE_SUJET': {
      const auteur = n.par?.niveau.libelle ?? '';
      return `<ol class="nt-fil">
          ${n.origine ? bulleDe(n.origine, quand(n.origine.date, maintenant())) : ''}
          ${bulle(n.texte ?? '', { de: n.par, quand: n.origine ? quand(n.date, maintenant()) : auteur })}
          ${n.reponse ? bulle(n.reponse.texte, { vous: true, quand: quand(n.reponse.date, maintenant()) }) : ''}
        </ol>${acceptation(n)}${composeur(n)}`;
    }
    case 'REPONSE_ACCEPTEE':
      return `<ol class="nt-fil">${bulle(n.texte ?? '', { vous: true, note: `${icon('check-circle', 'icon-xs')}${t(`Acceptée par ${nomPar(n)}`)}` })}</ol>
          ${n.points ? `<p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points pour vous. La réponse est épinglée en tête du sujet.`)}</span></p>` : ''}`;
    case 'REPRODUCTION_RECUE': {
      const r = n.reproduction;
      if (!r) return '';
      const [ic, libelle, cle] = RESULTATS[r.resultat];
      const conseil =
        r.resultat === 'SUCCES'
          ? `${n.points ? `+${n.points} points. ` : ''}Chaque essai réussi renforce la preuve affichée sur votre création.`
          : 'Ce retour décrit un cas que votre création ne couvre pas encore. Ajoutez-le à ses limites constatées pour guider les prochains essais.';
      return `<div class="nt-essai" data-resultat="${cle}">
            <span class="nt-essai-icone">${icon(ic, '')}</span>
            <div><p class="nt-essai-res">${t(libelle)}</p><p class="nt-essai-outil">${outilHTML(r)}</p></div>
          </div>
          <ol class="nt-fil">${bulle(n.texte ?? '', { de: n.par, quand: n.par?.niveau.libelle ?? '' })}</ol>
          <p class="nt-conseil">${icon(r.resultat === 'SUCCES' ? 'trend-up' : 'bulb')}<span>${t(conseil)}</span></p>`;
    }
    case 'VARIANTE_PUBLIEE': {
      const c = n.cible;
      const v = n.variante;
      if (!c || !v) return '';
      return `<div class="nt-duo">
          <a class="nt-duo-bloc" href="${esc(ROUTES.creation(c.id, c.slug))}"><span class="nt-duo-qui">Votre création</span>${c.typeCreation ? typeTag(c.typeCreation) : ''}<b>${t(c.titre)}</b></a>
          <span class="nt-duo-fleche" aria-hidden="true">${icon('arrow')}</span>
          <a class="nt-duo-bloc is-variante" href="${esc(ROUTES.creation(v.id, v.slug))}"><span class="nt-duo-qui">${photo(n.par, 'nt-duo-photo')}${t(`Variante ${deNom(nomPar(n))}`)}</span>${v.typeCreation ? typeTag(v.typeCreation) : ''}<b>${t(v.titre)}</b>${outilHTML(v)}</a>
        </div>
        <p class="nt-conseil">${icon('branche')}<span>${t('La variante crédite votre création et renvoie vers elle.')}</span></p>`;
    }
    case 'VOTES_UTILE_RECUS': {
      const bareme =
        n.cible?.nature === 'CREATION' && !n.surReponse
          ? `${BAREME_REPUTATION.voteUtileSurCreation} par vote sur une création`
          : n.surReponse
            ? `${BAREME_REPUTATION.voteUtileSurAutreContenu} par vote sur une réponse du forum`
            : n.cible?.nature === 'SUJET'
              ? `${BAREME_REPUTATION.voteUtileSurAutreContenu} par vote sur un sujet du forum`
              : `${BAREME_REPUTATION.voteUtileSurAutreContenu} par vote sur un cas Bon réflexe`;
      return `<ul class="nt-votants">${n.votants.map((m) => `<li>${photo(m, 'nt-votant-photo')}<span><b>${t(m.nom)}</b><small>${t(m.niveau.libelle)}</small></span>${icon('utile')}</li>`).join('')}</ul>
          ${n.points ? `<p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points, ${bareme}.`)}</span></p>` : ''}`;
    }
    case 'BADGE_OBTENU':
      return `<div class="nt-badge-grand">${embleme(n, 'is-grand')}<div><p class="nt-badge-nom">${t(n.badge?.libelle ?? '')}</p><p>${t(n.badge?.critere ?? '')}</p><p class="nt-badge-date">${t(`Obtenu le ${dateLongue(n.date)}, affiché sur votre profil`)}</p></div></div>`;
    case 'NIVEAU_ATTEINT': {
      const k = NIVEAUX.findIndex((x) => x.code === n.niveau?.code);
      return `<ol class="nt-paliers" aria-label="Niveaux de réputation">${NIVEAUX.map((x, i) => `<li class="${i < k ? 'is-passe' : i === k ? 'is-actuel' : ''}"${i === k ? ' aria-current="step"' : ''}><svg viewBox="0 0 56 60" aria-hidden="true"><path d="M28 4 50 16.75v26.5L28 56 6 43.25v-26.5z"/></svg><b>${t(x.libelle)}</b><small>${t(`${fmt(x.seuilPoints)} pts`)}</small></li>`).join('')}</ol>
          <p class="nt-texte-detail">${t(texteNiveau(n.niveau?.code ?? ''))}</p>`;
    }
    case 'RESULTAT_DEFI': {
      const d = n.defi;
      if (!d) return '';
      const participation = BAREME_REPUTATION.participationDefi;
      return `<div class="nt-rang"><p class="nt-rang-nb">${rang(d.rang)}</p><div><p><b>${t(`sur ${fmt(d.participants)} participants`)}</b></p><p>${t(`Défi clos le ${dateLongue(d.dateFin).replace(/ \d{4}$/, '')}, classement figé par votes « Utile » reçus ${periode(d.dateDebut, d.dateFin)}.`)}</p></div></div>
          <ul class="nt-decompte">${d.rang <= 3 && n.points ? `<li><span>${t(`${['Première', 'Deuxième', 'Troisième'][d.rang - 1]} place`)}</span><b>${t(`+${n.points - participation} points`)}</b></li>` : ''}<li><span>Participation</span><b>${t(`+${participation} points`)}</b></li></ul>`;
    }
    case 'CAS_VALIDE':
      return `<p class="nt-texte-detail">${t('Un modérateur a vérifié votre cas. Il est publié dans Bon réflexe, où les membres peuvent s’y entraîner.')}</p>${n.points ? `<p class="nt-gain-ligne">${icon('trend-up')}<span>${t(`+${n.points} points`)}</span></p>` : ''}`;
    case 'CAS_REFUSE':
      return `<div class="nt-motif"><p><b>Motif</b>${t(n.motif ?? '')}</p></div><p class="nt-texte-detail">${t('Corrigez le cas puis soumettez-le de nouveau : un autre modérateur l’examinera.')}</p>`;
    case 'OBSOLESCENCE_SIGNALEE':
      return `<div class="nt-essai" data-resultat="partiel"><span class="nt-essai-icone">${icon('alert', '')}</span><div><p class="nt-essai-res">${t(`${n.obsolescence?.membres ?? 0} membres, un même modèle`)}</p><p class="nt-essai-outil"><span class="nt-outil">${t(n.obsolescence?.modele ?? '')}</span></p></div></div>
          <p class="nt-texte-detail">${t('Le seuil de trois signalements est atteint : un bandeau prévient désormais les lecteurs. Refaites l’essai avec ce modèle, puis mettez à jour la création ou ses limites constatées.')}</p>`;
    case 'CONTENU_MASQUE':
      return `${n.motif ? `<div class="nt-motif"><p><b>Motif</b>${t(n.motif)}</p></div>` : ''}
          <ul class="nt-effets"><li>${icon('eye-off')}<span>${t('La création n’est plus visible des autres membres ; ses votes et ses commentaires sont suspendus.')}</span></li><li>${icon('pen')}<span>${t('Modifiez-la : la modération l’examinera de nouveau.')}</span></li></ul>`;
    case 'CONTENU_RETABLI':
      return `<p class="nt-texte-detail">${t(n.motif ?? 'Les votes, les commentaires et les points liés sont rétablis.')}</p>`;
    case 'DECISION_MODERATION':
      return `${n.motif ? `<div class="nt-motif"><p><b>Motif</b>${t(n.motif)}</p></div>` : ''}
          ${
            n.decision?.action === 'SUSPENDRE'
              ? `<ul class="nt-effets"><li>${icon('check-circle')}<span>${t('Vous pouvez lire les contenus et gérer vos paramètres.')}</span></li><li>${icon('lock')}<span>${t(`Publier, voter, commenter et répondre redeviendront possibles le ${finSuspension(n)}.`)}</span></li><li>${icon('mail')}<span>${t('Cette décision vous a aussi été envoyée par e-mail.')}</span></li></ul>`
              : `<ul class="nt-effets"><li>${icon('alert')}<span>${t('Un nouvel écart peut entraîner la suspension du compte.')}</span></li><li>${icon('mail')}<span>${t('Cette décision vous a aussi été envoyée par e-mail.')}</span></li></ul>`
          }`;
  }
}

function contexte(n: NotificationApi): string {
  const c = n.cible;
  const { href, ouvrir } = lien(n);
  if (
    !c ||
    !href ||
    ['BADGE_OBTENU', 'NIVEAU_ATTEINT', 'DECISION_MODERATION', 'VARIANTE_PUBLIEE'].includes(n.type)
  )
    return '';
  let genre = '';
  let meta = '';
  let visu = '';
  let affiche = false;
  if (c.nature === 'CREATION') {
    genre = c.typeCreation ? typeTag(c.typeCreation) : '';
    meta = c.aMoi
      ? [c.categorie, c.datePublication ? `publiée le ${dateCourte(c.datePublication)}` : '']
          .filter(Boolean)
          .join(' · ')
      : [c.auteur ? `par ${c.auteur.nom}` : '', c.categorie].filter(Boolean).join(' · ');
    if (c.image) {
      affiche = c.image.hauteur > c.image.largeur;
      const source = c.image.declinaisons[0]?.url ?? c.image.url;
      visu = `<img src="${esc(source)}" alt="" width="240" height="180" loading="lazy" decoding="async"${affiche ? ' class="is-affiche"' : ''}>`;
    } else
      visu = `<span class="nt-cx-icone">${icon(`type-${TYPE_TAG[c.typeCreation ?? 'UN_PROMPT']}`, '')}</span>`;
  } else if (c.nature === 'SUJET') {
    genre = `<span class="nt-cx-genre">${icon('message')}${t(`Forum · ${majuscule(motSujet(n))}`)}</span>`;
    visu = `<span class="nt-cx-icone">${icon('message', '')}</span>`;
  } else if (c.nature === 'DEFI') {
    genre = `<span class="nt-cx-genre">${icon('trophy')}Défi</span>`;
    meta = n.defi
      ? `${periode(n.defi.dateDebut, n.defi.dateFin)} · ${fmt(n.defi.participants)} participants`
      : '';
    visu = `<span class="nt-cx-icone">${icon('trophy', '')}</span>`;
  } else {
    genre = `<span class="nt-cx-genre">${icon('shield')}Cas Bon réflexe</span>`;
    visu = `<span class="nt-cx-icone">${icon('shield', '')}</span>`;
  }
  return `<a class="nt-contexte" href="${esc(href)}" data-nt-lien="${n.id}">
      <span class="nt-cx-media${affiche ? ' is-affiche' : ''}">${visu}</span>
      <span class="nt-cx-texte">${genre}<span class="nt-cx-titre">${t(c.titre)}</span>${meta ? `<span class="nt-cx-meta">${t(meta)}</span>` : ''}</span>
      <span class="nt-cx-aller">${t(ouvrir)}${icon('arrow')}</span>
    </a>`;
}

function actionsDetail(n: NotificationApi, inline: boolean): string {
  const sorties: string[] = [];
  const c = n.cible;
  const modifier = c?.nature === 'CREATION' && c.aMoi ? ROUTES.modifierCreation(c.id) : null;
  if (n.disponible && modifier) {
    if (n.type === 'OBSOLESCENCE_SIGNALEE')
      sorties.push(
        `<a class="btn btn-primary btn-sm" href="${modifier}" data-exige="contribuer" data-exige-quoi="mettre à jour cette création" data-nt-lien="${n.id}">${icon('pen')}Mettre à jour la création</a>`,
      );
    if (n.type === 'CONTENU_MASQUE')
      sorties.push(
        `<a class="btn btn-primary btn-sm" href="${modifier}" data-exige="contribuer" data-exige-quoi="modifier cette création" data-nt-lien="${n.id}">${icon('pen')}Modifier la création</a>`,
      );
    if (n.type === 'REPRODUCTION_RECUE' && n.reproduction && n.reproduction.resultat !== 'SUCCES')
      sorties.push(
        `<a class="btn btn-primary btn-sm" href="${modifier}" data-exige="contribuer" data-exige-quoi="compléter cette création" data-nt-lien="${n.id}">${icon('pen')}Compléter les limites constatées</a>`,
      );
  }
  if (n.type === 'CAS_REFUSE')
    sorties.push(
      `<a class="btn btn-primary btn-sm" href="${ROUTES.bonReflexe}" data-exige="proposer-cas" data-exige-quoi="corriger ce cas" data-nt-lien="${n.id}">${icon('pen')}Corriger le cas</a>`,
    );
  if (n.type === 'NIVEAU_ATTEINT' && n.niveau?.code === 'expert')
    sorties.push(
      `<a class="btn btn-primary btn-sm" href="${ROUTES.bonReflexe}" data-exige="proposer-cas" data-exige-quoi="proposer un cas" data-nt-lien="${n.id}">${icon('shield')}Proposer un cas Bon réflexe</a>`,
    );
  if (n.type === 'BADGE_OBTENU' || n.type === 'NIVEAU_ATTEINT') {
    const { href, ouvrir } = lien(n);
    if (href)
      sorties.push(
        `<a class="btn btn-secondary btn-sm" href="${esc(href)}" data-nt-lien="${n.id}">${t(ouvrir)}${icon('arrow')}</a>`,
      );
  }
  if (n.type === 'VARIANTE_PUBLIEE' && n.variante)
    sorties.push(
      `<a class="btn btn-primary btn-sm" href="${esc(ROUTES.creation(n.variante.id, n.variante.slug))}" data-nt-lien="${n.id}">Voir la variante${icon('arrow')}</a>`,
    );
  if (inline)
    sorties.push(
      `<button class="btn btn-quiet btn-sm" type="button" data-nt-lu-volet="${n.id}">${icon(nonLue(n) ? 'check' : 'circle-dot')}${nonLue(n) ? 'Marquer comme lue' : 'Marquer comme non lue'}</button>`,
    );
  return sorties.length ? `<div class="nt-d-actions">${sorties.join('')}</div>` : '';
}

function detail(n: NotificationApi, inline: boolean): string {
  const balise = inline ? 'h3' : 'h2';
  const visu = n.type === 'BADGE_OBTENU' ? rond('award', 'accent') : visuel(n);
  return `<div class="nt-detail${inline ? ' is-inline' : ''}" data-nt-detail="${n.id}">
      <header class="nt-d-tete">
        <span class="nt-visuel nt-d-visuel" aria-hidden="true">${visu}</span>
        <div class="nt-d-intro">
          <p class="nt-d-qui"><span class="nt-d-genre">${t(GENRES[n.type])}</span></p>
          <${balise} class="nt-d-titre" id="${inline ? `nt-dt-${n.id}` : 'nt-volet-titre'}" tabindex="-1">${t(titreDetail(n))}</${balise}>
          <p class="nt-d-quand"><time datetime="${n.date}">${t(majuscule(quand(n.date, maintenant())))}</time>${aTraiter(n) ? `<span class="nt-item-marque">${icon('circle-dot', 'icon-xs')}À traiter</span>` : ''}</p>
        </div>
      </header>
      ${n.disponible ? contexte(n) : ''}
      <div class="nt-d-corps">${corps(n)}</div>
      ${actionsDetail(n, inline)}
    </div>`;
}

function barreVolet(n: NotificationApi): string {
  const items = ordre();
  const i = items.findIndex((x) => x.id === n.id);
  const nl = nonLue(n);
  return `<div class="nt-v-barre">
      <button class="btn btn-quiet btn-sm nt-v-retour" type="button" data-nt-apercu id="nt-v-retour">${icon('chevron-left')}Vue d’ensemble</button>
      <div class="nt-v-outils">
        <button class="btn btn-quiet btn-sm" type="button" data-nt-lu-volet="${n.id}" id="nt-v-lu">${icon(nl ? 'check' : 'circle-dot')}${nl ? 'Marquer comme lue' : 'Marquer comme non lue'}</button>
        <span class="nt-v-sep" aria-hidden="true"></span>
        <button class="icon-btn" type="button" data-nt-voisin="-1" id="nt-v-prec" aria-label="Notification précédente"${i <= 0 ? ' disabled' : ''}>${icon('chevron-up', '')}</button>
        <button class="icon-btn" type="button" data-nt-voisin="1" id="nt-v-suiv" aria-label="Notification suivante"${i < 0 || i >= items.length - 1 ? ' disabled' : ''}>${icon('chevron-down', '')}</button>
      </div>
    </div>`;
}

/* Vue d'ensemble : depuis la dernière visite, la semaine, la préférence d'e-mail. -------------- */

function semaineHTML(): string {
  const points = page?.points ?? moi()?.points ?? 0;
  const gain = page?.pointsSemaine ?? 0;
  const actuel = niveauPourReputation(points);
  const suivantNiveau = NIVEAUX.find((x) => x.rang === actuel.rang + 1) ?? null;
  const debut = lundi(maintenant());
  const semaine = liste.filter((n) => new Date(n.date) >= debut);
  const compter = (type: NotificationApi['type']) => semaine.filter((n) => n.type === type);
  const votes = compter('VOTES_UTILE_RECUS').reduce((s, n) => s + n.nombre, 0);
  const essais = compter('REPRODUCTION_RECUE');
  const reussis = essais.filter((n) => n.reproduction?.resultat === 'SUCCES').length;
  const echanges =
    compter('COMMENTAIRE_RECU').length +
    compter('REPONSE_SUJET').length +
    compter('REPONSE_COMMENTAIRE').length;
  const chiffres: [number, string, string][] = [
    [votes, 'vote « Utile »', 'votes « Utile »'],
    [
      essais.length,
      reussis ? 'essai réussi' : 'essai',
      `essais, dont ${reussis} réussi${reussis > 1 ? 's' : ''}`,
    ],
    [echanges, 'commentaire ou réponse', 'commentaires et réponses'],
    [compter('VARIANTE_PUBLIEE').length, 'variante', 'variantes'],
  ];
  const avant = Math.max(actuel.seuilPoints, points - gain);
  const etendue = suivantNiveau ? suivantNiveau.seuilPoints - actuel.seuilPoints : 1;
  const pAvant = suivantNiveau ? ((avant - actuel.seuilPoints) / etendue) * 100 : 100;
  const pApres = suivantNiveau ? ((points - actuel.seuilPoints) / etendue) * 100 : 100;
  const animer = !ui.jaugeVue && animations.completes();
  return `<section class="nt-ov-bloc" aria-labelledby="nt-semaine-titre">
      <h3 class="nt-ov-sous" id="nt-semaine-titre">${icon('trend-up')}Cette semaine</h3>
      <p class="nt-gain"><span class="nt-gain-nb">${t(gain ? `+${fmt(gain)}` : '0')}</span><span class="nt-gain-unite">points</span></p>
      <div class="nt-jauge" role="img" aria-label="${esc(typo(suivantNiveau ? `${fmt(points)} points sur les ${fmt(suivantNiveau.seuilPoints)} du niveau ${suivantNiveau.libelle}, dont ${fmt(gain)} gagnés cette semaine` : `${fmt(points)} points, niveau le plus élevé`))}">
        <span class="nt-jauge-gain" style="--p:${animer ? 0 : pApres.toFixed(2)}" data-p="${pApres.toFixed(2)}"></span>
        <span class="nt-jauge-avant" style="--p:${animer ? 0 : pAvant.toFixed(2)}" data-p="${pAvant.toFixed(2)}"></span>
      </div>
      <p class="nt-jauge-legende"><span><b>${t(actuel.libelle)}</b>${t(` · ${fmt(points)} points`)}</span><span>${t(suivantNiveau ? `${suivantNiveau.libelle} à ${fmt(suivantNiveau.seuilPoints)}` : 'Plus haut niveau')}</span></p>
      ${semaine.length ? `<dl class="nt-chiffres">${chiffres.map(([nb, un, plusieurs]) => `<div${nb ? '' : ' class="is-zero"'}><dt>${t(nb > 1 ? plusieurs : un)}</dt><dd>${fmt(nb)}</dd></div>`).join('')}</dl>` : `<p class="nt-ov-vide">${t('Pas encore d’activité autour de vos contributions cette semaine.')}</p>`}
    </section>`;
}

function emailHTML(): string {
  const aVerifier = etats.get().compte === 'email';
  const email = page?.email ?? true;
  return `<section class="nt-ov-bloc" aria-labelledby="nt-email-titre">
      <h3 class="nt-ov-sous" id="nt-email-sous">${icon('mail')}Par e-mail</h3>
      <div class="nt-switch-ligne">
        <p id="nt-email-titre">Réponses à vos sujets et réponses acceptées</p>
        <button class="nt-switch" type="button" role="switch" aria-checked="${email}" aria-labelledby="nt-email-titre" aria-describedby="nt-email-aide" data-nt-email-switch id="nt-email-switch"><span aria-hidden="true"></span></button>
      </div>
      <p class="nt-email-aide" id="nt-email-aide">${t(aVerifier ? 'Confirmez votre adresse e-mail pour les recevoir aussi par e-mail.' : email ? 'Vous les recevez aussi à l’adresse de votre compte. Les décisions de modération vous sont toujours envoyées.' : 'Vous les retrouvez uniquement ici. Les décisions de modération vous sont toujours envoyées par e-mail.')}</p>
      <p class="nt-email-lien"><a href="${ROUTES.parametres}#notifications">${t('Tous les réglages d’e-mail')}</a></p>
    </section>`;
}

function apercuHTML(): string {
  const nl = liste.filter(nonLue).toSorted((a, b) => Number(epinglee(b)) - Number(epinglee(a)));
  const traiter = liste.filter(aTraiter).length;
  let tete = '<h2 class="sr-only" id="nt-volet-titre">Votre semaine et vos préférences</h2>';
  if (lecture() === 'volet' && etatDonnees === 'remplies') {
    if (nl.length) {
      const visages = [
        ...new Map(
          nl
            .flatMap((n) => (n.votants.length ? n.votants : n.par ? [n.par] : []))
            .map((m) => [m.id, m]),
        ).values(),
      ].slice(0, 4);
      const points = nl.reduce((s, n) => s + (n.points ?? 0), 0);
      tete = `<div class="nt-ov-tete">
          ${visages.length ? `<span class="nt-visages" aria-hidden="true">${visages.map((m) => photo(m)).join('')}</span>` : ''}
          <h2 class="nt-ov-titre" id="nt-volet-titre" tabindex="-1">Depuis votre dernière visite</h2>
          <p class="nt-ov-resume">${t(`${pluriel(nl.length, 'nouvelle notification', 'nouvelles notifications')}${points ? ` et ${points} points gagnés` : ''}.${traiter ? ` ${pluriel(traiter, 'notification attend', 'notifications attendent')} une suite de votre part.` : ''}`)}</p>
        </div>
        <ul class="nt-ov-liste">${nl
          .slice(0, 5)
          .map((n) => {
            const membre = n.votants[0] ?? n.par;
            const figure = membre
              ? photo(membre)
              : `<span class="nt-ov-icone">${icon(n.type === 'BADGE_OBTENU' ? 'award' : n.type === 'DECISION_MODERATION' ? 'lock' : 'bell')}</span>`;
            return `<li><button type="button" data-nt-choisir="${n.id}" id="nt-ov-${n.id}">${figure}<span>${t(majuscule(resume(n)))}</span><time datetime="${n.date}">${t(courte(n.date, maintenant()))}</time>${icon('arrow')}</button></li>`;
          })
          .join('')}</ul>`;
    } else {
      const derniere = liste[0];
      tete = `<div class="nt-ov-tete is-a-jour">
          <span class="nt-ok" aria-hidden="true">${icon('check', '')}</span>
          <h2 class="nt-ov-titre" id="nt-volet-titre" tabindex="-1">Vous êtes à jour</h2>
          <p class="nt-ov-resume">${t(derniere ? `Toutes vos notifications sont lues. Dernière notification ${quand(derniere.date, maintenant())}.` : 'Rien de nouveau pour le moment.')}${traiter ? t(` ${pluriel(traiter, 'notification attend', 'notifications attendent')} encore une suite de votre part.`) : ''}</p>
          ${traiter ? `<button class="btn btn-secondary btn-sm" type="button" data-nt-vue-directe="a-traiter">${icon('circle-dot')}Voir ce qui reste à traiter</button>` : ''}
        </div>`;
    }
  }
  return `<div class="nt-apercu-volet">${tete}${semaineHTML()}${emailHTML()}</div>`;
}

function rendreVolet({ changement = false } = {}): void {
  const volet = $('[data-nt-volet]');
  if (!volet) return;
  const n = lecture() === 'volet' && ui.selection ? parId(ui.selection) : undefined;
  volet.classList.toggle('is-detail', Boolean(n));
  volet.innerHTML = n ? `${barreVolet(n)}${detail(n, false)}` : apercuHTML();
  if (changement && animations.completes()) {
    volet.classList.remove('is-change');
    void volet.offsetWidth;
    volet.classList.add('is-change');
  }
  animerJauge(volet);
}

function animerJauge(zone: HTMLElement): void {
  if (ui.jaugeVue || !animations.completes() || !$('.nt-jauge', zone)) return;
  ui.jaugeVue = true;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const barre of $$('.nt-jauge [data-p]', zone))
        barre.style.setProperty('--p', barre.dataset.p ?? '0');
    }),
  );
}

/* Tête de page, barre d'outils ------------------------------------------------------------------- */

function rendreStatut(): void {
  const zone = $('[data-nt-statut]');
  if (!zone) return;
  if (!liste.length) {
    zone.innerHTML = '';
    return;
  }
  const traiter = liste.filter(aTraiter).length;
  zone.innerHTML =
    nonLuesTotal || traiter
      ? [
          nonLuesTotal
            ? `<span class="is-nonlues"><i aria-hidden="true"></i>${t(pluriel(nonLuesTotal, 'non lue', 'non lues'))}</span>`
            : '<span>Tout est lu</span>',
          traiter
            ? `<span>${icon('circle-dot', 'icon-xs')}${t(pluriel(traiter, 'à traiter', 'à traiter'))}</span>`
            : '',
        ]
          .filter(Boolean)
          .join('')
      : `<span>${icon('check-circle', 'icon-xs')}Vous êtes à jour</span>`;
}

function rendreTout(): void {
  const zone = $('[data-nt-tout]');
  if (!zone) return;
  if (ui.annulation) {
    const n = ui.annulation.ids.length;
    zone.innerHTML = `<p class="nt-fait">${icon('check-double')}<span>${t(`${pluriel(n, 'notification marquée', 'notifications marquées')} comme lue${n > 1 ? 's' : ''}`)}</span><button class="link-btn" type="button" data-nt-annuler-tout id="nt-annuler-tout">Annuler</button></p>`;
    return;
  }
  zone.innerHTML =
    nonLuesTotal && etatDonnees === 'remplies'
      ? `<button class="btn btn-secondary btn-sm nt-tout-btn" type="button" data-nt-tout-lire id="nt-tout-lire">${icon('check-double')}Tout marquer comme lu</button>`
      : '';
}

function rendreBarre(): void {
  const vues = $('[data-nt-vues]');
  if (vues)
    vues.innerHTML = VUES.map(([id, libelle]) => {
      const nb = liste.filter((n) => dansType(n) && dansVue(n, id)).length;
      return `<button type="button" aria-pressed="${ui.vue === id}" data-nt-vue="${id}" id="nt-vue-${id}">${t(libelle)}${id !== 'toutes' && nb ? `<span class="nt-vue-nb${id === 'non-lues' ? ' is-accent' : ''}">${fmt(nb)}</span>` : ''}</button>`;
    }).join('');
  const select = $<HTMLSelectElement>('[data-nt-type]');
  if (select)
    select.innerHTML = CATEGORIES.filter(
      (c) => c.id === 'tout' || c.id === ui.type || liste.some((n) => dansType(n, c.id)),
    )
      .map((c) => {
        const nb = liste.filter((n) => dansType(n, c.id) && dansVue(n)).length;
        return `<option value="${c.id}"${ui.type === c.id ? ' selected' : ''}>${t(c.id === 'tout' ? c.libelle : `${c.libelle} (${nb})`)}</option>`;
      })
      .join('');
}

/* Liste vide, chargement, erreur ----------------------------------------------------------------- */

const squelette = () =>
  `<div class="nt-squelette" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<div class="nt-sq-ligne" style="--i:${i}"><span class="nt-sq-rond"></span><span class="nt-sq-corps"><i style="width:${[78, 64, 84, 58, 72, 66, 80][i]}%"></i><i style="width:${[54, 42, 60, 38, 50, 44, 58][i]}%"></i><i style="width:${[70, 76, 48, 66, 58, 74, 52][i]}%"></i></span></div>`).join('')}</div>`;

function rendreEtatDonnees(etat: 'vide' | 'chargement' | 'erreur'): void {
  const zone = $('[data-nt-liste]');
  if (!zone) return;
  zone.removeAttribute('aria-busy');
  if (etat === 'chargement') {
    zone.setAttribute('aria-busy', 'true');
    zone.innerHTML = squelette();
    annoncer('Chargement des notifications…');
    return;
  }
  if (etat === 'erreur') {
    zone.innerHTML = `<div class="nt-etat is-erreur" role="alert">${icon('wifi-off', '')}<h3>Impossible d’afficher vos notifications</h3><p>${t('La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.')}</p><button class="btn btn-primary btn-sm" type="button" data-nt-reessayer>${icon('replay')}Réessayer</button></div>`;
    return;
  }
  zone.innerHTML = `<div class="nt-etat is-vide"><span class="nt-etat-icone">${icon('bell', '')}</span><h3>Aucune notification pour le moment</h3><p>${t('Quand un membre commentera, essaiera ou votera pour vos contributions, vous le verrez ici.')}</p><div class="nt-etat-actions"><a class="btn btn-primary btn-sm" href="${ROUTES.publier}">${icon('plus')}Publier une création</a><a class="btn btn-secondary btn-sm" href="${ROUTES.forumSansReponse}">Répondre à une question</a></div></div>`;
}

/* Rendu -------------------------------------------------------------------------------------------- */

let minuterieAnnonce: ReturnType<typeof setTimeout> | undefined;
function annoncer(message: string): void {
  const zone = $('[data-nt-annonce]');
  if (!zone) return;
  clearTimeout(minuterieAnnonce);
  zone.textContent = '';
  minuterieAnnonce = setTimeout(() => {
    zone.textContent = typo(message);
  }, 60);
}

/** Garde le focus sur le même élément quand une zone est reconstruite. */
function garderFocus(fn: () => void): void {
  const id = document.activeElement?.id;
  fn();
  if (id && document.activeElement !== document.getElementById(id))
    document.getElementById(id)?.focus({ preventScroll: true });
}

function render(): void {
  const boite = $('[data-nt-boite]');
  if (!boite) return;
  boite.dataset.ntMode = lecture();
  boite.dataset.ntDonnees = etatDonnees;
  if (ui.selection !== null && !parId(ui.selection)) ui.selection = null;
  garderFocus(() => {
    rendreVolet();
    const barre = $('[data-nt-barre]');
    if (etatDonnees !== 'remplies') {
      if (barre) barre.hidden = true;
      const statut = $('[data-nt-statut]');
      if (statut) statut.innerHTML = etatDonnees === 'chargement' ? '<span>Chargement…</span>' : '';
      const tout = $('[data-nt-tout]');
      if (tout) tout.innerHTML = '';
      rendreEtatDonnees(etatDonnees);
      return;
    }
    $('[data-nt-liste]')?.removeAttribute('aria-busy');
    if (barre) barre.hidden = !liste.length;
    rendreStatut();
    rendreTout();
    rendreBarre();
    rendreListe();
  });
  ui.animer = false;
}

/** Après une lecture : compteurs, liste et volet, sans rejouer les entrées ni perdre le focus. */
function rafraichir({ volet = true } = {}): void {
  garderFocus(() => {
    rendreStatut();
    rendreTout();
    rendreBarre();
    rendreListe();
    if (volet) rendreVolet();
  });
}

/* Lecture : l'API garde l'état lu ou non lu ; l'en-tête suit. ----------------------------------- */

function echec(message = 'L’action n’a pas abouti. Réessayez dans un instant.'): void {
  toast(message, 'alert');
}

/** Marque des notifications chargées, aussitôt à l'écran, puis dans l'API (rétabli en cas d'échec). */
async function marquer(ids: number[], lue: boolean): Promise<boolean> {
  const cibles = liste.filter((n) => ids.includes(n.id) && n.lue !== lue);
  if (!cibles.length) return true;
  for (const n of cibles) n.lue = lue;
  nonLuesTotal = Math.max(0, nonLuesTotal + (lue ? -cibles.length : cibles.length));
  afficherNonLues(nonLuesTotal);
  const reponse = await api<LectureNotificationsApi>('PATCH', '/api/v1/notifications', {
    ids: cibles.map((n) => n.id),
    lue,
  });
  if (reponse.ok) {
    nonLuesTotal = reponse.donnees.nonLues;
    afficherNonLues(nonLuesTotal);
    rendreStatut();
    rendreTout();
    return true;
  }
  for (const n of cibles) n.lue = !lue;
  nonLuesTotal = Math.max(0, nonLuesTotal + (lue ? cibles.length : -cibles.length));
  afficherNonLues(nonLuesTotal);
  rafraichir();
  echec();
  return false;
}

function choisir(id: number): void {
  const n = parId(id);
  if (!n) return;
  const mode = lecture();
  if (mode === 'deplie' && ui.selection === id) {
    ui.selection = null;
    ecrireAdresse();
    rafraichir({ volet: false });
    document.getElementById(`nt-o-${id}`)?.focus({ preventScroll: true });
    return;
  }
  const etaitNonLue = nonLue(n);
  ui.selection = id;
  if (dansType(n) && dansVue(n)) ui.focusId = id;
  if (etaitNonLue) void marquer([id], true);
  ecrireAdresse();
  garderFocus(() => {
    rendreStatut();
    rendreTout();
    rendreBarre();
    rendreListe();
    rendreVolet({ changement: true });
  });
  if (mode === 'deplie') {
    $(`[data-nt-id="${id}"]`)?.scrollIntoView({
      block: 'nearest',
      behavior: animations.completes() ? 'smooth' : 'auto',
    });
  } else {
    const volet = $('[data-nt-volet]');
    if (volet?.scrollTop) volet.scrollTop = 0;
  }
  annoncer(
    `${majuscule(resume(n))}.${etaitNonLue ? ' Marquée comme lue.' : ''}${mode === 'volet' ? ' Affichée dans le volet de lecture.' : ''}`,
  );
}

function apercu(): void {
  const id = ui.selection;
  ui.selection = null;
  ecrireAdresse();
  garderFocus(() => {
    rendreListe();
    rendreVolet({ changement: true });
  });
  if (id !== null) document.getElementById(`nt-o-${id}`)?.focus({ preventScroll: true });
}

function voisin(delta: number): void {
  const items = ordre();
  const i = items.findIndex((n) => n.id === ui.selection);
  const cible = items[i + delta];
  if (!cible) return;
  choisir(cible.id);
  $(delta < 0 ? '#nt-v-prec' : '#nt-v-suiv')?.focus({ preventScroll: true });
  const actif = document.activeElement as HTMLButtonElement | null;
  if (!actif || actif === document.body || actif.disabled)
    $('#nt-volet-titre')?.focus({ preventScroll: true });
}

async function toutLire(): Promise<void> {
  const nl = liste.filter(nonLue);
  if (!nonLuesTotal) return;
  for (const [j, li] of $$('.nt-item.is-nonlue').entries())
    li.style.setProperty('--j', String(Math.min(j, 8)));
  for (const n of nl) n.lue = true;
  const avant = nonLuesTotal;
  nonLuesTotal = 0;
  afficherNonLues(0);
  rafraichir();
  const reponse = await api<LectureNotificationsApi>('POST', '/api/v1/notifications/lecture');
  if (!reponse.ok) {
    for (const n of nl) n.lue = false;
    nonLuesTotal = avant;
    afficherNonLues(avant);
    rafraichir();
    echec();
    return;
  }
  ui.annulation = { ids: reponse.donnees.ids };
  rendreTout();
  const n = reponse.donnees.ids.length;
  annoncer(
    `${pluriel(n, 'notification marquée', 'notifications marquées')} comme lue${n > 1 ? 's' : ''}.`,
  );
  $('#nt-annuler-tout')?.focus();
  clearTimeout(ui.minuteurFait);
  ui.minuteurFait = setTimeout(finAnnulation, 8000);
}

function finAnnulation(): void {
  clearTimeout(ui.minuteurFait);
  if (!ui.annulation) return;
  // Le message reste tant que le pointeur ou le focus s'y trouve.
  if ($('[data-nt-tout]')?.matches(':hover, :focus-within')) {
    ui.minuteurFait = setTimeout(finAnnulation, 4000);
    return;
  }
  ui.annulation = null;
  rendreTout();
}

async function annulerTout(): Promise<void> {
  if (!ui.annulation) return;
  const { ids } = ui.annulation;
  ui.annulation = null;
  clearTimeout(ui.minuteurFait);
  const reponse = await api<LectureNotificationsApi>('PATCH', '/api/v1/notifications', {
    ids,
    lue: false,
  });
  if (!reponse.ok) {
    rendreTout();
    echec();
    return;
  }
  for (const n of liste) if (ids.includes(n.id)) n.lue = false;
  nonLuesTotal = reponse.donnees.nonLues;
  afficherNonLues(nonLuesTotal);
  rafraichir();
  annoncer('Notifications de nouveau non lues.');
  $('#nt-tout-lire')?.focus();
}

/** « Afficher les plus anciennes » : celles déjà chargées, puis la page suivante de l'API. */
async function afficherPlus(): Promise<void> {
  const avant = $$('.nt-ouvrir').length;
  if (
    ui.limite !== Number.POSITIVE_INFINITY &&
    liste.filter((n) => !epinglee(n)).length > ui.limite
  ) {
    ui.limite = Number.POSITIVE_INFINITY;
  } else if (suivant && !ui.chargementPlus) {
    ui.chargementPlus = true;
    rendreListe();
    const reponse = await api<NotificationsApi>(
      'GET',
      `/api/v1/notifications?avant=${encodeURIComponent(suivant)}`,
    );
    ui.chargementPlus = false;
    if (!reponse.ok) {
      rendreListe();
      echec('Les notifications plus anciennes n’ont pas pu être chargées. Réessayez.');
      return;
    }
    const connues = new Set(liste.map((n) => n.id));
    liste = [...liste, ...reponse.donnees.elements.filter((n) => !connues.has(n.id))];
    suivant = reponse.donnees.suivant;
    ui.limite = Number.POSITIVE_INFINITY;
  }
  rendreBarre();
  rendreListe();
  const boutons = $$<HTMLButtonElement>('.nt-ouvrir');
  const prochain = boutons[avant];
  if (prochain) {
    ui.focusId = Number(prochain.dataset.ntChoisir);
    for (const b of boutons) b.tabIndex = b === prochain ? 0 : -1;
    prochain.focus();
  }
}

/* Répondre à un commentaire depuis la notification (F-42, INT-03) --------------------------------- */

async function publierReponse(formulaire: HTMLFormElement): Promise<void> {
  const id = Number(formulaire.dataset.ntForm);
  const n = parId(id);
  const champ = $<HTMLTextAreaElement>('textarea', formulaire);
  const erreur = $('.nt-erreur', formulaire);
  const bouton = $<HTMLButtonElement>('button[type="submit"]', formulaire);
  if (!n?.repondreA || !champ || !erreur) return;
  const texte = champ.value.trim();
  const montrer = (message: string) => {
    erreur.textContent = typo(message);
    erreur.hidden = false;
    champ.setAttribute('aria-invalid', 'true');
    champ.setAttribute('aria-describedby', `nt-rep-err-${id} nt-rep-aide-${id}`);
    champ.focus();
  };
  if (!texte) {
    montrer('Écrivez votre réponse avant de la publier.');
    return;
  }
  if (!exiger('contribuer', 'répondre')) return;
  if (bouton) bouton.disabled = true;
  const reponse = await api<CommentaireApi>(
    'POST',
    `/api/v1/creations/${n.repondreA.creationId}/commentaires`,
    { corps: texte, parentId: n.repondreA.commentaireId },
  );
  if (bouton) bouton.disabled = false;
  if (!reponse.ok) {
    const { probleme } = reponse;
    const parChamp = probleme.erreurs?.corps ?? probleme.erreurs?.parentId;
    if (parChamp) montrer(parChamp);
    else if (probleme.status === 404) montrer('Ce commentaire n’est plus disponible.');
    else if ([401, 403, 422, 429].includes(probleme.status))
      montrer(probleme.detail ?? probleme.title);
    else montrer('Votre réponse n’a pas pu être publiée. Réessayez dans un instant.');
    return;
  }
  n.reponse = {
    auteur: null,
    moi: true,
    texte: reponse.donnees.corps ?? texte,
    date: reponse.donnees.date,
  };
  ui.brouillons.delete(id);
  rafraichir();
  const titre =
    lecture() === 'volet' ? $('#nt-volet-titre') : document.getElementById(`nt-dt-${id}`);
  titre?.focus({ preventScroll: true });
  toast('Réponse publiée.', 'message');
  annoncer(`Réponse publiée pour ${nomPar(n)}.`);
}

/* Préférence d'e-mail (F-81) ----------------------------------------------------------------------- */

async function basculerEmail(): Promise<void> {
  if (!page || !exiger('parametres', 'modifier vos préférences')) return;
  const voulu = !page.email;
  page.email = voulu;
  garderFocus(() => rendreVolet());
  const reponse = await api<PreferencesNotificationsApi>(
    'PUT',
    '/api/v1/moi/preferences-notifications',
    { email: voulu },
  );
  if (!reponse.ok) {
    page.email = !voulu;
    garderFocus(() => rendreVolet());
    echec();
    return;
  }
  toast(
    voulu
      ? 'Vous recevrez aussi ces notifications par e-mail.'
      : 'Ces notifications ne vous seront plus envoyées par e-mail.',
    'mail',
  );
}

async function recharger(): Promise<void> {
  etatDonnees = 'chargement';
  render();
  const zone = $('[data-nt-liste]');
  zone?.setAttribute('tabindex', '-1');
  zone?.focus({ preventScroll: true });
  const reponse = await api<NotificationsApi>('GET', '/api/v1/notifications');
  if (!reponse.ok) {
    etatDonnees = 'erreur';
    render();
    return;
  }
  page = reponse.donnees;
  liste = page.elements;
  suivant = page.suivant;
  nonLuesTotal = page.nonLues;
  afficherNonLues(nonLuesTotal);
  etatDonnees = 'remplies';
  ui.animer = true;
  render();
  annoncer('Notifications chargées.');
  ($('.nt-ouvrir[tabindex="0"]') ?? zone)?.focus({ preventScroll: true });
}

function ecrireAdresse(): void {
  const url = new URL(location.href);
  for (const cle of ['vue', 'type', 'notification']) url.searchParams.delete(cle);
  if (ui.vue !== 'toutes') url.searchParams.set('vue', ui.vue);
  if (ui.type !== 'tout') url.searchParams.set('type', ui.type);
  if (ui.selection !== null) url.searchParams.set('notification', String(ui.selection));
  history.replaceState(null, '', url);
}

/* Événements ------------------------------------------------------------------------------------- */

function brancher(main: HTMLElement): void {
  main.addEventListener('click', (evenement) => {
    const el = (evenement.target as Element).closest<HTMLElement>(
      '[data-nt-basculer], [data-nt-choisir], [data-nt-vue], [data-nt-vue-directe], [data-nt-tout-lire], [data-nt-annuler-tout], [data-nt-plus], [data-nt-tout-voir], [data-nt-email-switch], [data-nt-reessayer], [data-nt-apercu], [data-nt-lu-volet], [data-nt-voisin], [data-nt-lien]',
    );
    if (!el) return;
    const d = el.dataset;
    if (d.ntBasculer !== undefined) {
      const n = parId(Number(d.ntBasculer));
      if (!n) return;
      const lue = nonLue(n);
      void marquer([n.id], lue);
      rafraichir();
      annoncer(
        lue
          ? `Notification marquée comme lue. ${pluriel(nonLuesTotal, 'non lue', 'non lues')}.`
          : 'Notification marquée comme non lue.',
      );
      return;
    }
    if (d.ntChoisir !== undefined) {
      choisir(Number(d.ntChoisir));
      return;
    }
    if (d.ntLuVolet !== undefined) {
      const n = parId(Number(d.ntLuVolet));
      if (!n) return;
      const lue = nonLue(n);
      void marquer([n.id], lue);
      rafraichir();
      annoncer(lue ? 'Notification marquée comme lue.' : 'Notification marquée comme non lue.');
      return;
    }
    if (d.ntApercu !== undefined) {
      apercu();
      return;
    }
    if (d.ntVoisin !== undefined) {
      voisin(Number(d.ntVoisin));
      return;
    }
    if (d.ntVue !== undefined || d.ntVueDirecte !== undefined) {
      const vue = (d.ntVue ?? d.ntVueDirecte) as Vue;
      if (ui.vue === vue) return;
      ui.vue = vue;
      ui.limite = PAGE;
      ui.animer = true;
      ecrireAdresse();
      garderFocus(() => {
        rendreBarre();
        rendreListe();
      });
      ui.animer = false;
      if (d.ntVueDirecte !== undefined) document.getElementById(`nt-vue-${vue}`)?.focus();
      annoncer(
        `${pluriel(visibles().length, 'notification affichée', 'notifications affichées')}.`,
      );
      return;
    }
    if (d.ntToutLire !== undefined) {
      void toutLire();
      return;
    }
    if (d.ntAnnulerTout !== undefined) {
      void annulerTout();
      return;
    }
    if (d.ntPlus !== undefined) {
      void afficherPlus();
      return;
    }
    if (d.ntToutVoir !== undefined) {
      ui.vue = 'toutes';
      ui.type = 'tout';
      ui.animer = true;
      ecrireAdresse();
      rendreBarre();
      rendreListe();
      ui.animer = false;
      $('#nt-vue-toutes')?.focus();
      return;
    }
    if (d.ntEmailSwitch !== undefined) {
      void basculerEmail();
      return;
    }
    if (d.ntReessayer !== undefined) {
      void recharger();
      return;
    }
    if (d.ntLien !== undefined) {
      // Suivre le lien d'une notification non lue la marque d'abord comme lue.
      const n = parId(Number(d.ntLien));
      const href = el.getAttribute('href');
      if (!n || !nonLue(n) || !href || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.shiftKey || evenement.button !== 0) {
        void marquer([n.id], true);
        return;
      }
      evenement.preventDefault();
      void marquer([n.id], true).finally(() => location.assign(href));
    }
  });

  main.addEventListener('change', (evenement) => {
    const select = evenement.target as HTMLSelectElement;
    if (!select.matches('[data-nt-type]')) return;
    ui.type = select.value;
    ui.limite = PAGE;
    ui.animer = true;
    ecrireAdresse();
    garderFocus(() => {
      rendreBarre();
      rendreListe();
    });
    ui.animer = false;
    annoncer(`${libelleType()} : ${pluriel(visibles().length, 'notification', 'notifications')}.`);
  });

  main.addEventListener('submit', (evenement) => {
    const formulaire = (evenement.target as Element).closest<HTMLFormElement>('[data-nt-form]');
    if (!formulaire) return;
    evenement.preventDefault();
    void publierReponse(formulaire);
  });

  main.addEventListener('input', (evenement) => {
    const champ = (evenement.target as Element).closest<HTMLTextAreaElement>('[data-nt-saisie]');
    if (!champ) return;
    const id = Number(champ.dataset.ntSaisie);
    ui.brouillons.set(id, champ.value);
    if (champ.getAttribute('aria-invalid') === 'true' && champ.value.trim()) {
      champ.removeAttribute('aria-invalid');
      champ.setAttribute('aria-describedby', `nt-rep-aide-${id}`);
      const erreur = document.getElementById(`nt-rep-err-${id}`);
      if (erreur) erreur.hidden = true;
    }
  });

  main.addEventListener('keydown', (evenement) => {
    const cible = evenement.target as Element;
    const champ = cible.closest<HTMLTextAreaElement>('[data-nt-saisie]');
    if (champ) {
      if (evenement.key === 'Enter' && (evenement.ctrlKey || evenement.metaKey)) {
        evenement.preventDefault();
        const formulaire = champ.closest<HTMLFormElement>('form');
        if (formulaire) void publierReponse(formulaire);
      }
      return;
    }
    // Dans le volet : Échap ramène à la notification dans la liste.
    if (evenement.key === 'Escape' && cible.closest('[data-nt-volet]') && ui.selection !== null) {
      evenement.preventDefault();
      document.getElementById(`nt-o-${ui.selection}`)?.focus();
      return;
    }
    const courant = cible.closest<HTMLButtonElement>('[data-nt-nav]');
    if (!courant || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evenement.key)) return;
    const boutons = $$<HTMLButtonElement>('[data-nt-nav]');
    const i = boutons.indexOf(courant);
    const j =
      evenement.key === 'Home'
        ? 0
        : evenement.key === 'End'
          ? boutons.length - 1
          : i + (evenement.key === 'ArrowDown' ? 1 : -1);
    const prochain = boutons[j];
    if (!prochain) return;
    evenement.preventDefault();
    for (const [k, b] of boutons.entries()) b.tabIndex = k === j ? 0 : -1;
    ui.focusId = Number(prochain.dataset.ntChoisir);
    prochain.focus();
  });

  // Barre d'outils collante : sa hauteur place les intitulés des groupes juste dessous.
  const barre = $('[data-nt-barre]');
  if (barre && 'ResizeObserver' in window)
    new ResizeObserver(([entree]) => {
      if (entree)
        document.documentElement.style.setProperty(
          '--nt-barre-h',
          `${Math.round(entree.target.getBoundingClientRect().height)}px`,
        );
    }).observe(barre);
  large.addEventListener('change', () => {
    ui.animer = false;
    render();
  });
}

/* Au départ ---------------------------------------------------------------------------------------- */

const main = $('main');
if (main && etats.membre() && donnees) {
  brancher(main);
  // Arrivée depuis le bandeau « Voir la décision » : la décision non lue est ouverte.
  const decision = liste.find((n) => epinglee(n) && nonLue(n));
  if (ui.selection === null && decision) ui.selection = decision.id;
  const demandee = parId(ui.selection);
  if (demandee) {
    ui.focusId = demandee.id;
    if (nonLue(demandee)) void marquer([demandee.id], true);
  } else ui.selection = null;
  afficherNonLues(nonLuesTotal);
  render();
  if (demandee && lecture() === 'deplie')
    $(`[data-nt-id="${demandee.id}"]`)?.scrollIntoView({ block: 'center' });
}
document.documentElement.classList.add('nt-pret');
