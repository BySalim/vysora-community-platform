/* Éditeur d'une création (CREA-02, EC-05), porté de prototype/nouvelle-creation.js : une seule page,
   trois blocs (le résultat, le chemin parcouru, à savoir) et le panneau de publication. Le type de
   création se déduit du chemin parcouru. Le brouillon s'enregistre dans l'API au fil de la saisie
   (POST /api/v1/creations, puis PUT) ; une création publiée n'est modifiée qu'à « Publier les
   modifications » (RG-18). Les images partent dès qu'elles sont déposées (POST /api/v1/medias). Les
   contrôles sont ceux de l'API (lib/publier/modele.ts) : l'éditeur les annonce avant l'envoi. */

import {
  LIMITES,
  LONGUEURS,
  MESSAGES_PARTICIPATION,
  schemaContenuCreation,
  slugifier,
  TYPES_LIEN_EXTERNE,
  type CreationFicheApi,
  type MediaApi,
  type ProblemeApi,
  type TypeLienExterne,
  type TypeMomentCle,
} from '@vysora/shared';
import { adresseCreation, LIBELLES_LIEN, MOMENTS } from '../lib/creations';
import { ROUTES } from '../lib/navigation';
import {
  FAMILLES,
  MOMENTS_SAISIE,
  SORTES,
  TYPES,
  type SorteResultat,
} from '../lib/publier/donnees';
import { creerImport, type ConversationImportee } from '../lib/publier/import';
import {
  aDuContenu,
  agentActif,
  agentRepere,
  categorieProposee,
  contexteDefi,
  controler,
  depuisFiche,
  ecrireChamp,
  etapesChemin,
  indexOutils,
  lireChamp,
  longueur,
  nouveauBrouillon,
  nouveauPrompt,
  nouveauResultat,
  nouvelleEtape,
  outilAgentPresent,
  prompts,
  reporterIdentifiants,
  sensibles,
  sensiblesATraiter,
  tousFichiers,
  trouver,
  typeDe,
  typeLien,
  versContenu,
  vide,
  type Bloc,
  type BlocPrompt,
  type Brouillon,
  type DefiEditeur,
  type ErreurChamp,
  type GroupeErreur,
  type Moment,
  type OutilEditeur,
  type Referentiels,
  type Resultat,
} from '../lib/publier/modele';
import { jourEtHeure, normaliser } from '../lib/texte';
import { exiger } from './commun/acces';
import { api, type ReponseApi } from './commun/api';
import {
  $,
  $$,
  animations,
  corrigerTypographie,
  esc,
  icon,
  messageApresChargement,
  pluriel,
  t,
  toast,
} from './commun/outils';

interface DonneesPage {
  referentiels: Referentiels;
  creation: CreationFicheApi | null;
  liensMaximum: number;
  /** Défi en cours (F-64) et création de l'auteur qui y participe déjà. */
  defi: DefiEditeur | null;
  participation: { id: number; titre: string } | null;
}

const source = document.getElementById('publier-donnees');
if (source?.textContent && $('[data-pub-editor]')) editeur(JSON.parse(source.textContent));

function editeur(donnees: DonneesPage): void {
  const refs = donnees.referentiels;
  const outils = indexOutils(refs);
  const importeur = creerImport(refs.outils.filter((o) => o.famille !== null));
  const licenceParDefaut = refs.licences.find((l) => l.estParDefaut)?.id ?? null;
  const MOMENT = new Map(MOMENTS_SAISIE.map((m) => [m.id, m]));
  const FICHIERS_MAX = LIMITES.imagesParCreation;
  const TAILLE_MAX = LIMITES.tailleImageOctets;
  const FORMATS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const MOIS = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  /** « 12 octobre 2026 », à l'heure de l'appareil. */
  const jour = (iso: string, annee = true) => {
    const date = new Date(iso);
    const j = date.getDate();
    return `${j === 1 ? '1er' : j} ${MOIS[date.getMonth()]}${annee ? ` ${date.getFullYear()}` : ''}`;
  };
  const heure = (date: Date) =>
    `${date.getHours()} h ${String(date.getMinutes()).padStart(2, '0')}`;
  const extrait = (texte: string, n = 96) => {
    const s = texte.replace(/\s+/g, ' ').trim();
    return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
  };
  const idDe = (cle: string) => `f-${cle.replace(/[^\w-]/g, '-')}`;
  const poids = (o: number) =>
    o < 1024 * 1024
      ? `${Math.max(1, Math.round(o / 1024))} Ko`
      : `${(o / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  const logo = (outil: OutilEditeur | undefined, taille = 16) =>
    outil?.logo
      ? `<img class="tool-logo${outil.logoMonochrome ? ' is-mono' : ''}" src="/assets/logos-ia/${esc(outil.logo)}.svg" alt="" width="${taille}" height="${taille}" decoding="async">`
      : '';
  const outilDe = (x: BlocPrompt) => (x.outilId === null ? undefined : outils.get(x.outilId));

  /* Brouillon ----------------------------------------------------------------------------- */

  let d: Brouillon = donnees.creation
    ? depuisFiche(donnees.creation, refs)
    : nouveauBrouillon(licenceParDefaut);
  /* Ouverture depuis la page d'un défi (?defi=, prototype) : la case « Participer au défi » est
     cochée, sauf si l'auteur y participe déjà avec une autre création. */
  const defiDemande = Number(new URLSearchParams(location.search).get('defi'));
  if (!donnees.creation && donnees.defi?.id === defiDemande && !donnees.participation)
    d.defiId = defiDemande;

  /* Passages sensibles conservés en connaissance de cause (F-18) : retenus sur l'appareil, par création. */
  const cleDecisions = (id: number) => `vysora-decisions-${id}`;
  function memoriserDecisions(): void {
    if (d.creationId === null) return;
    try {
      localStorage.setItem(cleDecisions(d.creationId), JSON.stringify(d.decisions));
    } catch {
      // Stockage indisponible : les alertes reviendront au prochain chargement.
    }
  }
  if (d.creationId !== null) {
    try {
      const memoire: unknown = JSON.parse(localStorage.getItem(cleDecisions(d.creationId)) ?? '{}');
      if (memoire && typeof memoire === 'object')
        for (const id of Object.keys(memoire)) d.decisions[id] = 1;
    } catch {
      // Mémoire illisible : ignorée.
    }
  }
  let ficheCourante: CreationFicheApi | null = donnees.creation;

  const el = {
    fin: $('[data-pub-done]') as HTMLElement,
    editeur: $('[data-pub-editor]') as HTMLElement,
    entete: $('[data-pub-entete]') as HTMLElement,
    form: $<HTMLFormElement>('[data-pub-form]') as HTMLFormElement,
    cote: $('[data-pub-cote]') as HTMLElement,
    barre: $('[data-pub-barre]') as HTMLElement,
    pop: $('[data-pub-pop]') as HTMLElement,
    import: $<HTMLDialogElement>('[data-pub-import]') as HTMLDialogElement,
    apercu: $<HTMLDialogElement>('[data-pub-apercu]') as HTMLDialogElement,
    confirm: $<HTMLDialogElement>('[data-pub-confirm]') as HTMLDialogElement,
    fichier: $<HTMLInputElement>('[data-pub-fichier]') as HTMLInputElement,
  };

  let reprise =
    d.statut === 'brouillon' && Boolean(donnees.creation) && Boolean(d.modifieLe) && aDuContenu(d);
  let vueFin = false;
  let tentative = false;
  let consentement = false;
  let erreurConsentement = false;
  let publication = false;
  let supprimee = false;
  /** Message de l'API quand la limite de publications par 24 heures est atteinte (RG-85). */
  let limiteAtteinte: string | null = null;
  /** Erreurs renvoyées par l'API (clés de l'API), affichées jusqu'à la saisie suivante. */
  let erreursApi: Record<string, string> = {};
  /** Fichiers refusés au dernier dépôt dans le résultat (RG-16). */
  let refusFichiers: string[] = [];
  const touches = new Set<string>();
  const momentsMemo: Record<string, Moment> = {};
  const tailleAuto = !CSS.supports?.('field-sizing', 'content');
  const ajuster = (zone: ParentNode) => {
    if (!tailleAuto) return;
    for (const ta of $$<HTMLTextAreaElement>('textarea.pub-input', zone)) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight + 2}px`;
    }
  };
  const defile = (): ScrollBehavior => (animations.completes() ? 'smooth' : 'auto');
  const annoncer = (texte: string) => {
    const zone = $('[data-pub-annonce]');
    if (!zone) return;
    zone.textContent = '';
    requestAnimationFrame(() => {
      zone.textContent = texte;
    });
  };
  /** Défi proposé par la case « Participer au défi » (F-64), d'après la dernière version enregistrée. */
  const contexteCourant = () => contexteDefi(d, ficheCourante, donnees.defi, donnees.participation);
  const valider = () =>
    controler(d, refs, { liensMaximum: donnees.liensMaximum, defi: contexteCourant() }, erreursApi);

  /* Enregistrement dans l'API ---------------------------------------------------------------- */

  let etatSauvegarde: 'charge' | 'cours' | 'ok' | 'erreur' = 'charge';
  let heureSauvegarde = '';
  let messageSauvegarde = '';
  let modifsNonPubliees = false;
  let aEnregistrer = false;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let reprendre: ReturnType<typeof setTimeout> | undefined;
  let enCours: Promise<boolean> | null = null;
  let encore = false;

  /** Une modification de la saisie : enregistrée peu après (brouillon), ou à publier (création publiée). */
  function modifie(): void {
    d.modifieLe = new Date().toISOString();
    if (Object.keys(erreursApi).length) erreursApi = {};
    if (d.statut === 'publiee') {
      modifsNonPubliees = true;
      rendreStatut();
      return;
    }
    aEnregistrer = true;
    etatSauvegarde = 'cours';
    rendreStatut();
    clearTimeout(minuteur);
    minuteur = setTimeout(() => void sauver(), 1200);
  }
  const modifieMaintenant = () => {
    modifie();
    if (d.statut !== 'publiee') void sauver();
  };

  type Envoi = { ok: true; fiche: CreationFicheApi } | { ok: false; probleme: ProblemeApi };
  const problemeLocal = (detail: string): ProblemeApi => ({
    type: 'about:blank',
    title: detail,
    detail,
    status: 400,
    code: 'VALIDATION',
  });

  /** Envoie le contenu complet : descriptions des images, puis création ou mise à jour. */
  async function envoyerContenu(confirmation: boolean): Promise<Envoi> {
    aEnregistrer = false;
    const envoi = versContenu(d, refs, confirmation);
    const verification = schemaContenuCreation.safeParse(envoi.contenu);
    if (!verification.success) {
      aEnregistrer = true;
      return {
        ok: false,
        probleme: problemeLocal(verification.error.issues[0]?.message ?? 'Saisie à corriger.'),
      };
    }
    for (const f of envoi.descriptions) {
      const alt = f.alt.trim();
      const r = await api<MediaApi>('PATCH', `/api/v1/medias/${f.mediaId}`, {
        texteAlternatif: alt,
      });
      if (!r.ok) {
        aEnregistrer = true;
        return { ok: false, probleme: r.probleme };
      }
      f.altEnregistre = alt;
    }
    const nouvelle = d.creationId === null;
    const r: ReponseApi<CreationFicheApi> = nouvelle
      ? await api<CreationFicheApi>('POST', '/api/v1/creations', envoi.contenu)
      : await api<CreationFicheApi>('PUT', `/api/v1/creations/${d.creationId}`, envoi.contenu);
    if (!r.ok) {
      aEnregistrer = true;
      return { ok: false, probleme: r.probleme };
    }
    d.creationId = r.donnees.id;
    reporterIdentifiants(d, envoi.groupes, r.donnees);
    ficheCourante = r.donnees;
    if (nouvelle) {
      history.replaceState(history.state, '', ROUTES.modifierCreation(r.donnees.id));
      memoriserDecisions();
    }
    return { ok: true, fiche: r.donnees };
  }

  /** Message d'un enregistrement refusé : l'erreur du premier champ, sinon celle de l'API. */
  const messageEchec = (probleme: ProblemeApi) =>
    Object.values(probleme.erreurs ?? {})[0] ?? probleme.detail ?? probleme.title;

  /** Enregistre le brouillon ; vrai s'il l'est (ou s'il n'y a rien à enregistrer). */
  async function sauver(): Promise<boolean> {
    clearTimeout(minuteur);
    clearTimeout(reprendre);
    if (supprimee || d.statut === 'publiee') return true;
    if (d.creationId === null && !aDuContenu(d)) {
      aEnregistrer = false;
      etatSauvegarde = 'charge';
      rendreStatut();
      return true;
    }
    if (enCours) {
      encore = true;
      return enCours;
    }
    enCours = (async () => {
      let resultat: Envoi;
      // Une saisie arrivée pendant l'envoi est enregistrée aussitôt après.
      for (;;) {
        encore = false;
        resultat = await envoyerContenu(false);
        const suite = encore || aEnregistrer;
        if (!resultat.ok || !suite || supprimee || d.statut === 'publiee') break;
      }
      if (resultat.ok) {
        etatSauvegarde = 'ok';
        heureSauvegarde = heure(new Date());
      } else {
        etatSauvegarde = 'erreur';
        const { probleme } = resultat;
        if (probleme.erreurs) erreursApi = probleme.erreurs;
        const reseau = probleme.status === 0 || probleme.status >= 500;
        messageSauvegarde = reseau
          ? 'Enregistrement impossible pour le moment'
          : `Enregistrement impossible. ${messageEchec(probleme)}`;
        // Panne passagère : nouvel essai dans quinze secondes.
        if (reseau) reprendre = setTimeout(() => void sauver(), 15_000);
        if (Object.keys(erreursApi).length) majPanneau();
      }
      rendreStatut();
      return resultat.ok;
    })();
    try {
      return await enCours;
    } finally {
      enCours = null;
    }
  }

  /** En quittant la page : dernier enregistrement du brouillon, envoyé même si la page se ferme. */
  function sauverAvantDepart(): void {
    if (!aEnregistrer || supprimee || d.creationId === null || d.statut === 'publiee') return;
    const { contenu } = versContenu(d, refs);
    if (!schemaContenuCreation.safeParse(contenu).success) return;
    const corps = JSON.stringify(contenu);
    if (corps.length > 60_000) return;
    void fetch(`/api/v1/creations/${d.creationId}`, {
      method: 'PUT',
      keepalive: true,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: corps,
    });
  }
  addEventListener('pagehide', sauverAvantDepart);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && aEnregistrer) void sauver();
  });
  addEventListener('beforeunload', (e) => {
    const perdues =
      !supprimee &&
      ((d.statut === 'publiee' && modifsNonPubliees) ||
        (aEnregistrer && d.creationId === null && aDuContenu(d)));
    if (perdues) e.preventDefault();
  });

  /* Gabarits ------------------------------------------------------------------------------ */

  const erreurVisible = (err: Map<string, ErreurChamp>, cle: string) => {
    const e = err.get(cle);
    return e && (tentative || touches.has(cle)) ? e.message : '';
  };
  const erreurHTML = (id: string, message: string) =>
    message
      ? `<p class="pub-erreur" id="${id}-err">${icon('alert')}<span>${t(message)}</span></p>`
      : '';
  const facultatif = () => '<span class="pub-facultatif">facultatif</span>';
  const decrit = (...ids: string[]) => {
    const v = ids.filter(Boolean).join(' ');
    return v ? ` aria-describedby="${v}"` : '';
  };

  /** Alerte de données sensibles, sous le champ qui les contient. */
  function alertesHTML(cle: string): string {
    return sensibles(d, cle)
      .filter((s) => !d.decisions[s.id])
      .map(
        (s) =>
          `<div class="pub-alerte" data-sensible="${esc(s.id)}">${icon('key')}<p><b>${t(s.type)}</b> : « ${esc(extrait(s.valeur, 48))} ». Elle sera visible de tous.</p><div><button class="pub-lien-btn" type="button" data-action="masquer" data-id="${esc(s.id)}" data-k="masquer:${esc(s.id)}">Masquer</button><button class="pub-lien-btn is-discret" type="button" data-action="conserver" data-id="${esc(s.id)}">Conserver</button></div></div>`,
      )
      .join('');
  }

  interface OptionsChamp {
    cle: string;
    label?: string;
    labelPar?: string;
    aide?: string;
    requis?: boolean;
    rows?: number;
    max?: number;
    type?: string;
    mono?: boolean;
    inputmode?: string;
    liste?: string;
    placeholder?: string;
  }

  /** Un champ : libellé visible (ou porté par un titre), erreur dessous, alertes ensuite. */
  function champ(err: Map<string, ErreurChamp>, o: OptionsChamp): string {
    const { cle, label = '', labelPar = '', aide = '', requis = true, rows = 0, max = 0 } = o;
    const { type = 'text', mono = false, inputmode = '', liste = '', placeholder = '' } = o;
    const id = idDe(cle);
    const message = erreurVisible(err, cle);
    const valeur = lireChamp(d, cle);
    const attrs = `id="${id}" class="pub-input${mono ? ' is-mono' : ''}" data-f="${esc(cle)}" data-k="${esc(cle)}"${max ? ` maxlength="${max}"` : ''}${requis ? ' aria-required="true"' : ''}${message ? ' aria-invalid="true"' : ''}${labelPar ? ` aria-labelledby="${labelPar}"` : ''}${decrit(aide ? `${id}-aide` : '', message ? `${id}-err` : '')}${inputmode ? ` inputmode="${inputmode}"` : ''}${liste ? ` list="${liste}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${mono ? ' spellcheck="false"' : ''}`;
    const controle = rows
      ? `<textarea ${attrs} rows="${rows}">${esc(valeur)}</textarea>`
      : `<input ${attrs} type="${type}" value="${esc(valeur)}" autocomplete="off">`;
    return `<div class="pub-champ${message ? ' is-erreur' : ''}" data-champ="${esc(cle)}">
      ${label ? `<label class="pub-label" for="${id}">${t(label)}${requis ? '' : facultatif()}</label>` : ''}
      ${aide ? `<p class="pub-aide" id="${id}-aide">${t(aide)}</p>` : ''}
      ${controle}
      <div class="pub-sous" data-sous="${esc(cle)}">${erreurHTML(id, message)}</div>
      <div class="pub-alertes" data-alertes="${esc(cle)}">${alertesHTML(cle)}</div>
    </div>`;
  }
  const erreurBloc = (err: Map<string, ErreurChamp>, cle: string) => {
    const m = erreurVisible(err, cle);
    return m
      ? `<p class="pub-erreur pub-erreur-bloc" id="${idDe(cle)}" data-k="${esc(cle)}" tabindex="-1">${icon('alert')}<span>${t(m)}</span></p>`
      : '';
  };

  /* Le résultat ------------------------------------------------------------------------------ */

  function fichierHTML(err: Map<string, ErreurChamp>, f: Resultat, titreId: string): string {
    const mesure = f.envoi
      ? 'Envoi en cours'
      : f.taille
        ? poids(f.taille)
        : f.largeur
          ? `${f.largeur} × ${f.hauteur} px`
          : '';
    return `<div class="pub-fichier">
      ${f.src ? `<img src="${esc(f.src)}" alt="" decoding="async"${f.portrait ? ' class="is-portrait"' : ''}>` : `<span class="pub-fichier-icone">${icon('image')}</span>`}
      <div class="pub-fichier-champs">
        <p class="pub-fichier-nom" id="${titreId}"><b>${esc(f.nom || 'Image')}</b>${mesure ? `<span>${t(mesure)}</span>` : ''}</p>
        ${champ(err, { cle: `r:${f.id}:alt`, label: 'Description', rows: 2, max: LONGUEURS.texteAlternatif.max, aide: 'Ce qu’on y voit, pour les personnes qui ne le voient pas.' })}
      </div>
    </div>`;
  }

  function resultatHTML(err: Map<string, ErreurChamp>, r: Resultat): string {
    const s = SORTES[r.kind];
    const tid = `rt-${r.id}`;
    let corps = '';
    if (r.kind === 'texte')
      corps = champ(err, {
        cle: `r:${r.id}:texte`,
        labelPar: tid,
        rows: 5,
        max: LONGUEURS.resultatTexte.max,
      });
    if (r.kind === 'code')
      corps = `${champ(err, { cle: `r:${r.id}:nom`, label: 'Nom du fichier', requis: false, max: LONGUEURS.resultatNom.max })}${champ(err, { cle: `r:${r.id}:texte`, labelPar: tid, rows: 8, max: LONGUEURS.resultatTexte.max, mono: true })}`;
    if (r.kind === 'fichier') corps = fichierHTML(err, r, `${tid}-nom`);
    if (r.kind === 'lien') {
      const type = r.type || typeLien(r.url);
      const idType = idDe(`r:${r.id}:type`);
      corps = `<div class="pub-grille">
        ${champ(err, { cle: `r:${r.id}:url`, label: 'Adresse', type: 'url', inputmode: 'url', max: LONGUEURS.url.max, placeholder: 'https://' })}
        <div class="pub-champ"><label class="pub-label" for="${idType}">Type</label><div class="pub-select"><select class="pub-input" id="${idType}" data-lien-type="${r.id}" data-k="r:${r.id}:type">${TYPES_LIEN_EXTERNE.map((v) => `<option value="${v}"${(type || 'DEMO') === v ? ' selected' : ''}>${esc(LIBELLES_LIEN[v])}</option>`).join('')}</select>${icon('chevron-down')}</div></div>
      </div>
      ${champ(err, { cle: `r:${r.id}:libelle`, label: 'Libellé', requis: false, max: LONGUEURS.lienLibelle.max })}`;
    }
    return `<li class="pub-res" data-res="${r.id}">
      <div class="pub-res-tete"><h3 id="${tid}">${icon(s.icone)}${t(s.label)}</h3><button class="icon-btn pub-mini is-danger" type="button" data-action="retirer-resultat" data-id="${r.id}" data-k="retirer:${r.id}" aria-label="${esc(s.retirer)}" title="Retirer">${icon('trash', '')}</button></div>
      ${corps}
    </li>`;
  }

  /** Bouton d'ajout au résultat, désactivé quand la limite est atteinte (un seul texte ou code : RG-12). */
  function ajoutPermis(sorte: SorteResultat): boolean {
    if (sorte === 'fichier') return tousFichiers(d).length < FICHIERS_MAX;
    if (sorte === 'lien')
      return d.resultats.filter((r) => r.kind === 'lien').length < LIMITES.liensParCreation;
    return !d.resultats.some((r) => r.kind === 'texte' || r.kind === 'code');
  }

  function sectionResultat(err: Map<string, ErreurChamp>): string {
    return `<section class="pub-section" aria-labelledby="sec-resultat" data-depot>
      <h2 id="sec-resultat">${icon('box')}Le résultat</h2>
      <p class="pub-indication">Ce que l’IA vous a permis d’obtenir, quelle que soit sa forme : texte, code, image, vidéo, son, application…</p>
      ${erreurBloc(err, 'resultats')}
      ${d.resultats.length ? `<ul class="pub-resultats">${d.resultats.map((r) => resultatHTML(err, r)).join('')}</ul>` : ''}
      <div class="pub-ajouts" role="group" aria-label="Ajouter au résultat">
        ${(Object.entries(SORTES) as [SorteResultat, (typeof SORTES)[SorteResultat]][]).map(([k, s]) => `<button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-resultat" data-sorte="${k}" data-k="ajouter-resultat:${k}"${ajoutPermis(k) ? '' : ' disabled'}>${icon(s.icone)}${t(s.label)}</button>`).join('')}
      </div>
      <p class="pub-indication pub-depot-txt">Vous pouvez aussi déposer ou coller des images ici, 5 Mo au plus chacune. Une vidéo, un son ou un document se partagent par un lien.</p>
      <p class="pub-erreur pub-erreur-bloc" data-erreur-fichiers role="alert"${refusFichiers.length ? '' : ' hidden'}>${refusFichiers.length ? `${icon('alert')}<span>${t(refusFichiers.join(' '))}</span>` : ''}</p>
      ${champ(err, { cle: 'formatResultat', label: 'Format', requis: false, max: LONGUEURS.formatResultat.max, aide: 'Par exemple « Paysage · 4:3 » ou « Interface de réservation ».' })}
    </section>`;
  }

  /* Le chemin parcouru ------------------------------------------------------------------------ */

  function outilBouton(err: Map<string, ErreurChamp>, x: BlocPrompt): string {
    const cle = `o:${x.id}`;
    const message = erreurVisible(err, cle);
    const outil = outilDe(x);
    return `<button class="pub-outil${message ? ' is-erreur' : ''}" type="button" id="${idDe(cle)}" data-action="outil" data-id="${x.id}" data-k="${cle}" aria-haspopup="listbox" aria-expanded="false" aria-label="Outil : ${esc(outil?.nom ?? 'à choisir')}"${message ? ` aria-invalid="true" aria-describedby="${idDe(cle)}-err"` : ''}>${outil ? `${logo(outil, 18)}<span>${esc(outil.nom)}</span>` : `<span class="pub-vide-txt">Choisir l’outil</span>`}${icon('chevron-down')}</button>`;
  }

  function momentHTML(err: Map<string, ErreurChamp>, x: Bloc): string {
    if (!x.moment) return '';
    const type = MOMENT.get(x.moment.type) ?? MOMENTS_SAISIE[0];
    if (!type) return '';
    const idType = idDe(`mt:${x.id}`);
    return `<div class="pub-moment">
      <div class="pub-grille">
        <div class="pub-champ pub-moment-type"><label class="pub-label" for="${idType}">${icon('moment')}Moment clé</label><div class="pub-select"><select class="pub-input" id="${idType}" data-mtype="${x.id}" data-k="mt:${x.id}">${MOMENTS_SAISIE.map((m) => `<option value="${m.id}"${m.id === type.id ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select>${icon('chevron-down')}</div></div>
        ${champ(err, { cle: `mn:${x.id}`, label: 'Titre', requis: false, max: LONGUEURS.momentCleTitre.max, placeholder: MOMENTS[type.id].titre })}
      </div>
      ${champ(err, { cle: `m:${x.id}`, label: 'Ce qui s’est passé', rows: 3, max: LONGUEURS.momentCleExplication.max, aide: type.aide })}
    </div>`;
  }

  function blocHTML(
    err: Map<string, ErreurChamp>,
    x: Bloc,
    rang: { i: number; prompt: number; etape: number },
    n: number,
  ): string {
    const tid = `bt-${x.id}`;
    const actions = `<div class="pub-bloc-actions">
        <button class="icon-btn pub-mini" type="button" data-action="monter" data-id="${x.id}" data-k="monter:${x.id}" aria-label="Monter" title="Monter"${rang.i === 0 ? ' disabled' : ''}>${icon('up', '')}</button>
        <button class="icon-btn pub-mini" type="button" data-action="descendre" data-id="${x.id}" data-k="descendre:${x.id}" aria-label="Descendre" title="Descendre"${rang.i === n - 1 ? ' disabled' : ''}>${icon('down', '')}</button>
        <button class="icon-btn pub-mini is-danger" type="button" data-action="supprimer-bloc" data-id="${x.id}" data-k="supprimer:${x.id}" aria-label="Supprimer" title="Supprimer"${n === 1 ? ' disabled' : ''}>${icon('trash', '')}</button>
      </div>`;
    const momentBtn = `<button class="pub-option${x.moment ? ' is-actif' : ''}" type="button" data-action="moment" data-id="${x.id}" data-k="moment:${x.id}" aria-pressed="${Boolean(x.moment)}">${icon('moment')}Moment clé</button>`;
    if (x.kind === 'etape') {
      return `<li class="pub-bloc is-etape" data-bloc="${x.id}">
        <div class="pub-bloc-tete"><h3 class="pub-bloc-nom" id="${tid}">Étape ${rang.etape}</h3>${actions}</div>
        ${champ(err, { cle: `b:${x.id}:titre`, label: 'Titre de l’étape', max: LONGUEURS.etapeTitre.max })}
        ${champ(err, { cle: `b:${x.id}:texte`, label: 'Ce que vous avez fait', rows: 2, max: LONGUEURS.etapeRecit.max })}
        <div class="pub-options">${momentBtn}</div>
        ${momentHTML(err, x)}
      </li>`;
    }
    const message = erreurVisible(err, `o:${x.id}`);
    const ouvertReponse = Boolean(x.ouvert.reponse);
    const ouvertReglages = Boolean(x.ouvert.reglages);
    const rempliReponse = longueur(x.reponse) > 0 || x.fichiers.length > 0;
    const rempliReglages = longueur(x.modele) > 0 || longueur(x.reglages) > 0;
    const modeles = outilDe(x)?.modeles ?? [];
    const reste = FICHIERS_MAX - tousFichiers(d).length;
    return `<li class="pub-bloc" data-bloc="${x.id}">
      <div class="pub-bloc-tete"><h3 class="pub-bloc-nom" id="${tid}">Prompt ${rang.prompt}</h3>${outilBouton(err, x)}${actions}</div>
      ${message ? `<div class="pub-sous">${erreurHTML(idDe(`o:${x.id}`), message)}</div>` : ''}
      ${champ(err, { cle: `b:${x.id}:prompt`, labelPar: tid, rows: 3, max: LONGUEURS.prompt.max })}
      <div class="pub-options">
        <button class="pub-option${rempliReponse ? ' is-rempli' : ''}" type="button" data-action="ouvrir" data-quoi="reponse" data-id="${x.id}" data-k="ouvrir-reponse:${x.id}" aria-expanded="${ouvertReponse}"${ouvertReponse ? ` aria-controls="rep-${x.id}"` : ''}>${icon('message')}Réponse de l’IA${rempliReponse ? `${icon('check')}<span class="sr-only"> : renseignée</span>` : ''}</button>
        <button class="pub-option${rempliReglages ? ' is-rempli' : ''}" type="button" data-action="ouvrir" data-quoi="reglages" data-id="${x.id}" data-k="ouvrir-reglages:${x.id}" aria-expanded="${ouvertReglages}"${ouvertReglages ? ` aria-controls="reg-${x.id}"` : ''}>${icon('sliders')}${rempliReglages && x.modele ? esc(x.modele) : 'Modèle et réglages'}${rempliReglages ? `${icon('check')}<span class="sr-only"> : renseignés</span>` : ''}</button>
        ${momentBtn}
      </div>
      ${
        ouvertReponse
          ? `<div class="pub-detail" id="rep-${x.id}">
        ${champ(err, { cle: `b:${x.id}:reponse`, label: 'Réponse de l’IA', requis: false, rows: 3, max: LONGUEURS.reponseIa.max })}
        ${x.fichiers.length ? `<ul class="pub-fichiers">${x.fichiers.map((f) => `<li data-res="${f.id}">${fichierHTML(err, f, `ft-${f.id}`)}<button class="pub-lien-btn is-danger" type="button" data-action="retirer-fichier" data-id="${f.id}" data-k="retirer:${f.id}">${icon('trash')}Retirer</button></li>`).join('')}</ul>` : ''}
        ${reste > 0 ? `<button class="pub-lien-btn" type="button" data-action="joindre" data-id="${x.id}" data-k="joindre:${x.id}">${icon('paperclip')}Joindre ce que l’IA a produit</button>` : ''}
      </div>`
          : ''
      }
      ${
        ouvertReglages
          ? `<div class="pub-detail pub-grille" id="reg-${x.id}">
        ${champ(err, { cle: `b:${x.id}:modele`, label: 'Modèle', requis: false, max: 100, liste: `ml-${x.id}` })}
        <datalist id="ml-${x.id}">${modeles.map((m) => `<option value="${esc(m.nomCourt)}"></option>`).join('')}</datalist>
        ${champ(err, { cle: `b:${x.id}:reglages`, label: 'Réglages', requis: false, max: LONGUEURS.configurationParametres.max })}
      </div>`
          : ''
      }
      ${momentHTML(err, x)}
    </li>`;
  }

  function sectionChemin(err: Map<string, ErreurChamp>): string {
    let np = 0;
    let ne = 0;
    const blocs = d.chemin
      .map((x, i) => {
        if (x.kind === 'prompt') np += 1;
        else ne += 1;
        return blocHTML(err, x, { i, prompt: np, etape: ne }, d.chemin.length);
      })
      .join('');
    const promptPermis = prompts(d).length < LIMITES.echangesParEtape;
    const etapePermise = etapesChemin(d).length < LIMITES.etapesParCreation;
    return `<section class="pub-section" aria-labelledby="sec-chemin">
      <h2 id="sec-chemin">${icon('route')}Le chemin parcouru</h2>
      <p class="pub-indication">Vos prompts dans l’ordre, avec l’outil utilisé. Marquez les moments clés : là où vous avez corrigé, refusé ou vérifié le travail de l’IA.</p>
      ${erreurBloc(err, 'chemin')}
      <ol class="pub-chemin">${blocs}</ol>
      <div class="pub-ajouts" role="group" aria-label="Ajouter au chemin parcouru">
        <button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-prompt" data-k="ajouter-prompt"${promptPermis ? '' : ' disabled'}>${icon('plus')}Prompt</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-etape" data-k="ajouter-etape" aria-describedby="aide-etape"${etapePermise ? '' : ' disabled'}>${icon('layers')}Étape</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="importer" data-k="importer"${promptPermis ? '' : ' disabled'}>${icon('clipboard')}Coller une conversation</button>
      </div>
      <p class="pub-indication" id="aide-etape">Une étape regroupe les prompts d’une même phase d’un projet, ou décrit ce que vous avez fait vous-même.</p>
    </section>`;
  }

  function sectionSavoir(err: Map<string, ErreurChamp>): string {
    return `<section class="pub-section" aria-labelledby="sec-savoir">
      <h2 id="sec-savoir">${icon('help')}À savoir${facultatif()}</h2>
      <p class="pub-indication" id="sec-savoir-aide">Les limites du résultat et vos conseils pour le refaire.</p>
      ${champ(err, { cle: 'limites', labelPar: 'sec-savoir', requis: false, rows: 3, max: LONGUEURS.creationLimites.max })}
      ${champ(err, { cle: 'aAdapter', label: 'À adapter', requis: false, rows: 3, max: LIMITES.pointsAAdapter * (LONGUEURS.pointAAdapter.max + 1), aide: 'Ce qu’il faut changer pour réutiliser la création : un point par ligne, cinq au plus.' })}
    </section>`;
  }

  function formHTML(err: Map<string, ErreurChamp>): string {
    return `<div class="pub-presentation">
        ${champ(err, { cle: 'titre', label: 'Titre', max: LONGUEURS.creationTitre.max })}
        ${champ(err, { cle: 'objectif', label: 'Ce que vous vouliez obtenir', rows: 2, max: LONGUEURS.creationObjectif.max })}
      </div>
      ${sectionResultat(err)}
      ${sectionChemin(err)}
      ${sectionSavoir(err)}`;
  }

  /* Panneau de publication -------------------------------------------------------------------- */

  const LISTE: { id: GroupeErreur; label: string; cible: string }[] = [
    { id: 'presentation', label: 'Le titre et l’objectif', cible: 'titre' },
    { id: 'resultat', label: 'Le résultat', cible: 'ajouter-resultat:texte' },
    { id: 'chemin', label: 'Le chemin parcouru', cible: 'ajouter-prompt' },
    { id: 'categorie', label: 'La catégorie', cible: 'categorie' },
  ];
  const momentNote = (x: Bloc) => Boolean(x.moment && longueur(x.moment.texte) >= 20);

  function listeHTML(err: Map<string, ErreurChamp>): string {
    const items = LISTE.map((it) => {
      const fautes = [...err.entries()].filter(([, e]) => e.groupe === it.id);
      const premiere = fautes[0];
      const signale = premiere && tentative;
      return `<li class="${!premiere ? 'is-ok' : signale ? 'is-erreur' : ''}"><button type="button" data-action="aller" data-cible="${esc(premiere ? premiere[0] : it.cible)}" data-k="liste-${it.id}">${icon(premiere ? 'circle' : 'check-circle')}<span>${t(it.label)}${!premiere ? '<span class="sr-only"> : complet</span>' : signale ? `<small>${t(premiere[1].message)}</small>` : ''}</span></button></li>`;
    });
    const notes = d.chemin.filter(momentNote).length;
    const dernier = prompts(d).at(-1) ?? d.chemin[0];
    items.push(
      `<li class="${notes ? 'is-ok' : 'is-conseil'}"><button type="button" data-action="aller" data-cible="${notes ? 'sec-chemin' : `moment:${dernier?.id ?? ''}`}" data-k="liste-moment">${icon(notes ? 'check-circle' : 'moment')}<span>${notes ? pluriel(notes, 'moment clé', 'moments clés') : 'Un moment clé'}${notes ? '' : '<small>Conseillé : c’est ce qui fait apprendre.</small>'}</span></button></li>`,
    );
    const sens = sensiblesATraiter(d);
    const premierSensible = sens[0];
    if (premierSensible)
      items.push(
        `<li class="is-erreur"><button type="button" data-action="aller" data-cible="masquer:${esc(premierSensible.id)}" data-k="liste-sensibles">${icon('key')}<span>${pluriel(sens.length, 'passage sensible', 'passages sensibles')}<small>À masquer ou à conserver.</small></span></button></li>`,
      );
    return `<ul class="pub-liste">${items.join('')}</ul>`;
  }

  function typeHTML(): string {
    const type = typeDe(d) ?? d.typeVerrouille;
    return type
      ? `${icon(TYPES[type].icone)}<span><b>${t(TYPES[type].label)}</b> : ${t(TYPES[type].sens)}</span>`
      : `${icon('route')}<span>Le type de création se déduit de votre chemin parcouru.</span>`;
  }

  /** Case « Participer au défi » (F-64, RG-74) : le défi en cours, ou celui de la création. */
  function defiHTML(err: Map<string, ErreurChamp>): string {
    const contexte = contexteCourant();
    if (!contexte) return '';
    const { defi, participe, autre } = contexte;
    const coche = d.defiId === defi.id;
    const message = erreurVisible(err, 'defi');
    // Défi terminé : la participation reste ; une seule création par personne.
    const conservee = participe && !defi.ouvert;
    const bloquee = conservee || (!coche && (Boolean(autre) || !defi.ouvert));
    const aide = conservee
      ? MESSAGES_PARTICIPATION.conservee
      : !defi.ouvert
        ? coche
          ? 'Décochez la case pour publier votre création.'
          : MESSAGES_PARTICIPATION.fermees
        : autre && !coche
          ? MESSAGES_PARTICIPATION.unique(autre.titre)
          : `Jusqu’au ${jourEtHeure(defi.dateFin)}, heure UTC.`;
    return `<div class="pub-champ${message ? ' is-erreur' : ''}" data-champ="defi">
          <div class="pub-case"><input type="checkbox" id="f-defi" data-defi-choix data-k="defi"${coche ? ' checked' : ''}${bloquee ? ' disabled' : ''}${message ? ' aria-invalid="true"' : ''}${decrit('f-defi-aide', message ? 'f-defi-err' : '')}><label for="f-defi">Participer au défi « ${t(defi.titre)} »</label></div>
          <p class="pub-aide pub-aide-case" id="f-defi-aide">${t(aide)} <a href="${esc(ROUTES.defi(defi.id, defi.slug))}">Voir les règles</a></p>
          <div class="pub-sous">${erreurHTML('f-defi', message)}</div>
        </div>`;
  }

  function coteHTML(err: Map<string, ErreurChamp>): string {
    const publiee = d.statut === 'publiee';
    const msgCat = erreurVisible(err, 'categorie');
    const proposee = d.categorieId === null ? categorieProposee(d, refs) : null;
    const licence = refs.licences.find((l) => l.id === d.licenceId) ?? refs.licences[0];
    return `<div class="pub-cote-in">
      <p class="pub-statut" data-pub-save></p>
      <h2 class="pub-cote-titre">Avant de publier</h2>
      ${listeHTML(err)}
      <p class="pub-type">${typeHTML()}</p>

      <div class="pub-reglages">
        <div class="pub-champ${msgCat ? ' is-erreur' : ''}" data-champ="categorie">
          <label class="pub-label" for="f-categorie">Catégorie</label>
          <div class="pub-select"><select class="pub-input" id="f-categorie" data-categorie data-k="categorie"${msgCat ? ' aria-invalid="true" aria-describedby="f-categorie-err"' : ''}>
            <option value=""${d.categorieId === null ? ' selected' : ''}>Choisir</option>
            ${refs.categories.map((c) => `<option value="${c.id}"${d.categorieId === c.id ? ' selected' : ''}>${esc(c.libelle)}</option>`).join('')}
          </select>${icon('chevron-down')}</div>
          ${proposee ? `<button class="pub-lien-btn" type="button" data-action="proposer-categorie" data-k="proposer-categorie">Choisir « ${t(proposee.libelle)} »</button>` : ''}
          <div class="pub-sous">${erreurHTML('f-categorie', msgCat)}</div>
        </div>
        <div class="pub-champ" data-champ="etiquettes">
          <label class="pub-label" for="f-etiquette">Étiquettes${facultatif()}</label>
          <div class="pub-etiquettes">
            ${d.etiquettes.map((e) => `<span class="pub-etiquette">${t(e)}<button type="button" data-action="retirer-etiquette" data-v="${esc(e)}" data-k="etiquette:${esc(e)}" aria-label="Retirer l’étiquette ${esc(e)}">${icon('close', '')}</button></span>`).join('')}
            <input id="f-etiquette" type="text" maxlength="${LONGUEURS.etiquette.max}" data-etiquette data-k="etiquette-saisie" aria-describedby="f-etiquette-aide"${d.etiquettes.length >= LIMITES.etiquettesParContenu ? ' disabled' : ''} autocomplete="off">
          </div>
          <p class="pub-aide" id="f-etiquette-aide">Entrée pour valider, cinq au plus.</p>
        </div>
        <div class="pub-champ">
          <label class="pub-label" for="f-licence">Licence</label>
          <div class="pub-select"><select class="pub-input" id="f-licence" data-licence data-k="licence" aria-describedby="f-licence-aide">${refs.licences.map((l) => `<option value="${l.id}"${licence?.id === l.id ? ' selected' : ''}>${esc(l.libelle)}</option>`).join('')}</select>${icon('chevron-down')}</div>
          <p class="pub-aide" id="f-licence-aide">${licence?.resume ? `${t(licence.resume)}.` : ''}</p>
        </div>
        ${defiHTML(err)}
        ${
          outilAgentPresent(d, outils) || d.agentModeration
            ? `<div class="pub-champ">
          <div class="pub-case"><input type="checkbox" id="f-agent" data-agent-flag data-k="agent"${agentActif(d, outils) ? ' checked' : ''}${d.agentModeration ? ' disabled' : ''} aria-describedby="f-agent-aide"><label for="f-agent">Signaler des instructions pour un agent</label></div>
          <p class="pub-aide pub-aide-case" id="f-agent-aide">${d.agentModeration ? 'L’équipe de modération a ajouté cet avertissement. ' : agentRepere(d, outils) ? 'Un de vos prompts confie des actions à un agent. ' : ''}La fiche affichera un avertissement.</p>
        </div>`
            : ''
        }
      </div>

      ${limiteAtteinte ? `<p class="pub-limite" id="pub-limite" tabindex="-1">${icon('clock')}<span>${t(limiteAtteinte)}</span></p>` : ''}
      <div class="pub-champ pub-consentement${erreurConsentement ? ' is-erreur' : ''}" data-champ="consentement">
        <div class="pub-case"><input type="checkbox" id="f-consentement" data-consentement data-k="consentement"${consentement ? ' checked' : ''}${erreurConsentement ? ' aria-invalid="true" aria-describedby="f-consentement-err"' : ''}><label for="f-consentement">Je ne publie aucune donnée personnelle d’un tiers ni aucun secret.</label></div>
        <div class="pub-sous">${erreurHTML('f-consentement', erreurConsentement ? 'Cochez cette case pour publier.' : '')}</div>
      </div>
      <button class="btn btn-primary pub-publier" type="button" data-action="publier" data-k="publier"${publication ? ' aria-busy="true"' : ''}>${publiee ? 'Publier les modifications' : 'Publier'}</button>
      <button class="btn btn-secondary pub-apercu-btn" type="button" data-action="apercu" data-k="apercu">${icon('eye')}Aperçu de la fiche</button>
      <p class="sr-only" role="status" data-pub-annonce></p>
      <div class="pub-cote-liens">
        ${publiee && ficheCourante ? `<a class="pub-lien-btn" href="${esc(adresseCreation(ficheCourante))}">${icon('external')}Voir la fiche</a><button class="pub-lien-btn" type="button" data-action="depublier" data-k="depublier">Dépublier</button>` : ''}
        <button class="pub-lien-btn is-danger" type="button" data-action="supprimer" data-k="supprimer-tout">${publiee ? 'Supprimer la création' : 'Supprimer le brouillon'}</button>
      </div>
    </div>`;
  }

  function barreHTML(err: Map<string, ErreurChamp>): string {
    const n =
      new Set([...err.values()].map((e) => e.groupe)).size + (sensiblesATraiter(d).length ? 1 : 0);
    return `<div class="pub-barre-in">
      <button class="pub-barre-etat" type="button" data-action="voir-liste" data-k="barre-liste">${n ? `${icon('circle')}${pluriel(n, 'point', 'points')} à compléter` : `${icon('check-circle')}Prête à publier`}</button>
      <button class="btn btn-primary btn-sm" type="button" data-action="publier" data-k="barre-publier">${d.statut === 'publiee' ? 'Publier les modifications' : 'Publier'}</button>
    </div>`;
  }

  /* Rendu --------------------------------------------------------------------------------------- */

  function rendreStatut(): void {
    const zone = $('[data-pub-save]');
    if (!zone) return;
    const publiee = d.statut === 'publiee';
    let etat: string;
    if (etatSauvegarde === 'cours') etat = 'Enregistrement…';
    else if (etatSauvegarde === 'erreur') etat = messageSauvegarde;
    else if (publiee)
      etat = modifsNonPubliees
        ? 'Modifications à publier'
        : `Publiée le ${jour(d.publieLe ?? new Date().toISOString())}`;
    else if (heureSauvegarde) etat = `Enregistré à ${heureSauvegarde}`;
    else etat = 'Visible de vous seul';
    zone.dataset.etat = etatSauvegarde;
    zone.innerHTML = `${icon(publiee ? 'check-circle' : 'lock')}<span><b>${publiee ? 'Création publiée' : 'Brouillon privé'}</b> · ${t(etat)}</span>`;
  }

  function rendreEntete(): void {
    const publiee = d.statut === 'publiee';
    el.entete.innerHTML = `<h1>${publiee ? 'Modifier la création' : 'Publier une création'}</h1>
      <p class="pub-intro">Montrez ce que vous avez obtenu et comment : d’autres pourront le refaire et apprendre de vos choix.</p>
      ${reprise && !publiee && d.modifieLe ? `<div class="pub-bandeau" role="status">${icon('clock')}<p>Vous reprenez votre brouillon du ${jour(d.modifieLe, false)} à ${heure(new Date(d.modifieLe))}.</p><button class="icon-btn pub-mini" type="button" data-action="fermer-reprise" aria-label="Masquer ce message">${icon('close', '')}</button></div>` : ''}`;
    corrigerTypographie(el.entete);
  }

  /** Rend une zone en gardant le focus sur l'élément équivalent. */
  function avecFocus(zone: HTMLElement, rendu: () => void, cleFocus?: string): void {
    const actif = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-k]');
    const cle = cleFocus ?? (actif && zone.contains(actif) ? actif.dataset.k : undefined);
    const champActif =
      actif instanceof HTMLInputElement || actif instanceof HTMLTextAreaElement ? actif : null;
    const pos =
      champActif && !cleFocus ? [champActif.selectionStart, champActif.selectionEnd] : null;
    rendu();
    if (!cle) return;
    const cible = $(`[data-k="${CSS.escape(cle)}"]`, zone);
    if (!cible) return;
    cible.focus({ preventScroll: !cleFocus });
    if (
      pos &&
      (cible instanceof HTMLInputElement || cible instanceof HTMLTextAreaElement) &&
      pos[0] !== null &&
      pos[1] !== null
    ) {
      try {
        cible.setSelectionRange(pos[0], pos[1]);
      } catch {
        // Type de champ sans sélection (url…) : le curseur reste à la fin.
      }
    }
  }
  function rendreForm(cleFocus?: string): void {
    avecFocus(
      el.form,
      () => {
        el.form.innerHTML = formHTML(valider());
        ajuster(el.form);
        corrigerTypographie(el.form);
      },
      cleFocus,
    );
  }
  function rendreCote(cleFocus?: string): void {
    const err = valider();
    avecFocus(
      el.cote,
      () => {
        el.cote.innerHTML = coteHTML(err);
        rendreStatut();
        corrigerTypographie(el.cote);
      },
      cleFocus,
    );
    el.barre.innerHTML = barreHTML(err);
  }
  function rendreTout(cleFocus?: string): void {
    rendreEntete();
    rendreForm(cleFocus);
    rendreCote(
      cleFocus && el.cote.querySelector(`[data-k="${CSS.escape(cleFocus)}"]`)
        ? cleFocus
        : undefined,
    );
    document.title = `${d.statut === 'publiee' ? 'Modifier la création' : 'Publier une création'} · Vysora`;
  }
  /** Après un changement de structure : formulaire et panneau. */
  function rendre(cleFocus?: string): void {
    rendreForm(cleFocus);
    rendreCote();
    if (cleFocus && !el.form.querySelector(`[data-k="${CSS.escape(cleFocus)}"]`))
      $(`[data-k="${CSS.escape(cleFocus)}"]`, el.cote)?.focus();
  }

  /** Met à jour l'erreur d'un champ sans redessiner le formulaire. */
  function majChamp(cle: string, err = valider()): void {
    const zone = $(`[data-sous="${CSS.escape(cle)}"]`, el.form);
    const champEl = zone?.closest('.pub-champ');
    if (!zone || !champEl) return;
    const message = erreurVisible(err, cle);
    const controle = $('[data-f]', champEl);
    const id = controle ? controle.id : idDe(cle);
    champEl.classList.toggle('is-erreur', Boolean(message));
    zone.innerHTML = erreurHTML(id, message);
    if (!controle) return;
    if (message) controle.setAttribute('aria-invalid', 'true');
    else controle.removeAttribute('aria-invalid');
    const ids = new Set(
      (controle.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean),
    );
    if (message) ids.add(`${id}-err`);
    else ids.delete(`${id}-err`);
    if (ids.size) controle.setAttribute('aria-describedby', [...ids].join(' '));
    else controle.removeAttribute('aria-describedby');
  }
  function majAlertes(cle: string): void {
    const zone = $(`[data-alertes="${CSS.escape(cle)}"]`, el.form);
    if (!zone) return;
    zone.innerHTML = alertesHTML(cle);
    corrigerTypographie(zone);
  }
  function majPanneau(): Map<string, ErreurChamp> {
    const err = valider();
    const liste = $('.pub-liste', el.cote);
    if (liste) {
      liste.outerHTML = listeHTML(err);
      const nouvelle = $('.pub-liste', el.cote);
      if (nouvelle) corrigerTypographie(nouvelle);
    }
    const type = $('.pub-type', el.cote);
    if (type) type.innerHTML = typeHTML();
    el.barre.innerHTML = barreHTML(err);
    return err;
  }

  function finHTML(): string {
    const fiche = ficheCourante ? adresseCreation(ficheCourante) : ROUTES.mesContenus;
    // Guide d'Explorer que la création a rejoint (DEC-01) et défi auquel elle participe (F-64) ; les
    // badges sont attribués ensuite par la tâche planifiée (S-09) et annoncés par une notification.
    const guide = ficheCourante?.guide;
    const defi = ficheCourante?.defi;
    const suites: [string, string, string, string][] = [];
    if (guide)
      suites.push([
        icon('compass'),
        `Votre création rejoint le guide « ${t(guide.titre)} »`,
        'Ses moments clés enrichissent les étapes et les pièges du guide.',
        `<a class="link-arrow" href="${esc(ROUTES.guide(guide.slug))}">Voir le guide${icon('arrow')}</a>`,
      ]);
    if (defi)
      suites.push([
        icon('trophy'),
        `Participation au défi « ${t(defi.titre)} »`,
        `Classement selon les votes « Utile » reçus jusqu’au ${jourEtHeure(defi.dateFin)}, heure UTC.`,
        `<a class="link-arrow" href="${esc(ROUTES.defi(defi.id, defi.slug))}">Voir le défi${icon('arrow')}</a>`,
      ]);
    return `<div class="container pub-fin-in">
      <span class="pub-fin-icone" aria-hidden="true">${icon('check', '')}</span>
      <h1 tabindex="-1" data-fin-titre>Votre création est publiée</h1>
      <p class="pub-intro">« ${t(d.titre)} » est visible de tous. Chaque vote « Utile » et chaque reproduction réussie vous rapporteront des points.</p>
      <div class="pub-porte-actions"><a class="btn btn-primary" href="${esc(fiche)}">Voir la fiche${icon('arrow')}</a><button class="btn btn-secondary" type="button" data-action="copier-lien">${icon('copy')}Copier le lien</button><button class="btn btn-quiet" type="button" data-action="continuer-modifier">Modifier la création</button></div>
      ${suites.length ? `<ul class="pub-fin-suite">${suites.map(([ic, titre, texte, lien]) => `<li>${ic}<p><b>${titre}</b><span>${t(texte)}</span></p>${lien}</li>`).join('')}</ul>` : ''}
    </div>`;
  }

  function appliquerEtat(): void {
    el.editeur.hidden = vueFin;
    el.barre.hidden = vueFin;
    el.fin.hidden = !vueFin;
    document.body.toggleAttribute('data-pub-ferme', vueFin);
    if (vueFin) fermerFenetres();
    else rendreTout();
  }
  function fermerFenetres(): void {
    fermerPop();
    for (const dlg of [el.import, el.apercu, el.confirm]) if (dlg.open) dlg.close();
  }

  /** Va au champ d'une erreur ou d'un élément de la liste. */
  function aller(cle: string): void {
    let cible = $(`[data-k="${CSS.escape(cle)}"]`) ?? document.getElementById(cle);
    if (!cible) {
      const [k, id = '', prop] = cle.split(':');
      const p =
        k === 'r'
          ? prompts(d).find((x) => x.fichiers.some((f) => f.id === id))
          : k === 'b'
            ? trouver(d, id)
            : null;
      if (p && 'kind' in p && p.kind === 'prompt') {
        if (k === 'r' || prop === 'reponse') p.ouvert.reponse = true;
        if (prop === 'modele' || prop === 'reglages') p.ouvert.reglages = true;
        rendreForm();
        cible = $(`[data-k="${CSS.escape(cle)}"]`);
      }
    }
    if (!cible) return;
    cible.scrollIntoView({ block: 'center', behavior: defile() });
    if (!cible.matches('button, input, select, textarea, a, [tabindex]'))
      cible.setAttribute('tabindex', '-1');
    cible.focus({ preventScroll: true });
  }

  /* Actions ----------------------------------------------------------------------------------- */

  function deplacer(liste: Bloc[], element: Bloc, sens: number): boolean {
    const i = liste.indexOf(element);
    const j = i + sens;
    const autre = liste[j];
    if (i < 0 || !autre) return false;
    liste[j] = element;
    liste[i] = autre;
    return true;
  }

  function signalerEchec(probleme: ProblemeApi, defaut: string): void {
    if (probleme.status === 401 || probleme.status === 403 || probleme.status === 404)
      toast(probleme.detail ?? probleme.title, 'alert');
    else toast(defaut, 'alert');
  }

  function reinitialiserVue(): void {
    vueFin = false;
    modifsNonPubliees = false;
    consentement = false;
    erreurConsentement = false;
    tentative = false;
    reprise = false;
    limiteAtteinte = null;
    erreursApi = {};
    touches.clear();
    for (const k of Object.keys(momentsMemo)) delete momentsMemo[k];
    etatSauvegarde = 'charge';
    heureSauvegarde = '';
  }

  async function supprimerTout(): Promise<void> {
    const publiee = d.statut === 'publiee';
    const ok = await confirmer({
      titre: publiee ? 'Supprimer cette création ?' : 'Supprimer ce brouillon ?',
      texte: publiee
        ? 'Elle disparaîtra de Vysora, avec ses commentaires et les essais déclarés.'
        : 'Tout ce que vous avez saisi sera effacé.',
      action: publiee ? 'Supprimer la création' : 'Supprimer le brouillon',
      danger: true,
    });
    if (!ok) return;
    const message = publiee ? 'Création supprimée.' : 'Brouillon supprimé.';
    clearTimeout(minuteur);
    if (d.creationId === null) {
      d = nouveauBrouillon(licenceParDefaut);
      reinitialiserVue();
      aEnregistrer = false;
      appliquerEtat();
      toast(message, 'trash');
      $('#f-titre')?.focus();
      return;
    }
    supprimee = true;
    await enCours;
    const r = await api('DELETE', `/api/v1/creations/${d.creationId}`);
    if (!r.ok) {
      supprimee = false;
      signalerEchec(r.probleme, 'La suppression n’a pas abouti. Réessayez dans un instant.');
      return;
    }
    messageApresChargement(message);
    location.assign(ROUTES.publier);
  }

  async function depublier(): Promise<void> {
    const ok = await confirmer({
      titre: 'Dépublier cette création ?',
      texte: 'Elle redevient un brouillon visible de vous seul.',
      action: 'Dépublier',
    });
    if (!ok || d.creationId === null) return;
    const r = await api<CreationFicheApi>(
      'DELETE',
      `/api/v1/creations/${d.creationId}/publication`,
    );
    if (!r.ok) {
      signalerEchec(r.probleme, 'La dépublication n’a pas abouti. Réessayez dans un instant.');
      return;
    }
    ficheCourante = r.donnees;
    d.statut = 'brouillon';
    const avaitDesModifications = modifsNonPubliees;
    modifsNonPubliees = false;
    rendreTout();
    // Les modifications non publiées restent dans le brouillon.
    if (avaitDesModifications) modifieMaintenant();
    toast('Création dépubliée : elle est de nouveau un brouillon.');
  }

  /* Images ------------------------------------------------------------------------------------ */

  const chargerImage = (src: string) => {
    const im = new Image();
    im.src = src;
    return im.decode().then(() => im);
  };

  /** Ajoute des images au résultat ou à la réponse d'un prompt, puis les envoie une à une (RG-16). */
  async function ajouterFichiers(fichiers: File[], cible: string): Promise<void> {
    const erreurs: string[] = [];
    const ajoutes: Resultat[] = [];
    const bloc = cible === 'resultat' ? null : trouver(d, cible);
    const p = bloc && 'kind' in bloc && bloc.kind === 'prompt' ? (bloc as BlocPrompt) : null;
    const envois: [Resultat, File][] = [];
    for (const f of fichiers) {
      if (tousFichiers(d).length + ajoutes.length >= FICHIERS_MAX) {
        erreurs.push(`Une création compte ${FICHIERS_MAX} images au plus.`);
        break;
      }
      if (!FORMATS.includes(f.type)) {
        erreurs.push(
          `${f.name} n’est pas une image PNG, JPEG, WebP ou GIF. Vysora n’héberge que des images : ajoutez plutôt un lien vers ce fichier.`,
        );
        continue;
      }
      if (f.size > TAILLE_MAX) {
        erreurs.push(
          `${f.name} dépasse 5 Mo. Réduisez l’image, ou ajoutez plutôt un lien vers ce fichier.`,
        );
        continue;
      }
      const src = URL.createObjectURL(f);
      let portrait = false;
      try {
        const im = await chargerImage(src);
        portrait = im.naturalHeight > im.naturalWidth * 1.15;
      } catch {
        // Aperçu illisible : l'API dira si l'image l'est aussi.
      }
      const item = nouveauResultat(d, 'fichier', {
        src,
        nom: f.name,
        taille: f.size,
        portrait,
        envoi: true,
      });
      ajoutes.push(item);
      envois.push([item, f]);
    }
    if (!p) afficherErreursFichiers([], false);
    if (ajoutes.length) {
      if (p) {
        p.fichiers.push(...ajoutes);
        p.ouvert.reponse = true;
      } else d.resultats.push(...ajoutes);
      rendre(`r:${ajoutes[0]?.id ?? ''}:alt`);
    }
    if (erreurs.length) afficherErreursFichiers(erreurs, Boolean(p));
    const refus: string[] = [...erreurs];
    let echecs = 0;
    for (const [item, f] of envois) {
      const corps = new FormData();
      corps.append('fichier', f);
      const r = await api<MediaApi>('POST', '/api/v1/medias', corps);
      URL.revokeObjectURL(item.src);
      if (!r.ok) {
        echecs += 1;
        refus.push(
          r.probleme.erreurs?.fichier ?? r.probleme.detail ?? `${f.name} n’a pas pu être envoyée.`,
        );
        const liste = p ? p.fichiers : d.resultats;
        const i = liste.indexOf(item);
        if (i >= 0) liste.splice(i, 1);
        continue;
      }
      Object.assign(item, {
        mediaId: r.donnees.id,
        src: r.donnees.declinaisons[0]?.url ?? r.donnees.url,
        largeur: r.donnees.largeur,
        hauteur: r.donnees.hauteur,
        portrait: r.donnees.hauteur > r.donnees.largeur * 1.15,
        altEnregistre: r.donnees.texteAlternatif,
        envoi: false,
      } satisfies Partial<Resultat>);
    }
    if (envois.length) {
      modifieMaintenant();
      rendre();
      if (envois.length > echecs)
        toast(
          `${cap(pluriel(envois.length - echecs, 'image ajoutée', 'images ajoutées'))}.`,
          'image',
        );
    }
    if (echecs) afficherErreursFichiers(refus, Boolean(p));
  }
  /** Fichiers refusés (RG-16) : sous le résultat, jusqu'au prochain dépôt ; un toast pour un prompt. */
  function afficherErreursFichiers(erreurs: string[], dansUnPrompt: boolean): void {
    if (dansUnPrompt) {
      if (erreurs[0]) toast(erreurs[0], 'alert');
      return;
    }
    refusFichiers = erreurs;
    const zone = $('[data-erreur-fichiers]');
    if (!zone) return;
    zone.hidden = !erreurs.length;
    zone.innerHTML = erreurs.length ? `${icon('alert')}<span>${t(erreurs.join(' '))}</span>` : '';
  }
  let cibleFichiers = 'resultat';
  function choisirFichiers(cible: string): void {
    cibleFichiers = cible;
    el.fichier.value = '';
    el.fichier.click();
  }

  /* Fenêtres : confirmation, import, outil, aperçu ------------------------------------------- */

  let reponseConfirmation: ((valeur: boolean) => void) | null = null;
  el.confirm.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    const b = cible.closest<HTMLElement>('[data-reponse]');
    if (b) reponseConfirmation?.(b.dataset.reponse === 'oui');
    else if (cible === el.confirm) reponseConfirmation?.(false);
  });
  function confirmer(o: {
    titre: string;
    texte: string;
    action: string;
    danger?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const dlg = el.confirm;
      dlg.innerHTML = `<h2 id="confirm-titre">${t(o.titre)}</h2><p>${t(o.texte)}</p><div class="pub-dialogue-actions"><button class="btn btn-secondary" type="button" data-reponse="non">Annuler</button><button class="btn btn-primary${o.danger ? ' is-danger' : ''}" type="button" data-reponse="oui">${t(o.action)}</button></div>`;
      let fini = false;
      const fin = (valeur: boolean) => {
        if (fini) return;
        fini = true;
        if (dlg.open) dlg.close();
        resolve(valeur);
      };
      reponseConfirmation = fin;
      dlg.addEventListener('close', () => fin(false), { once: true });
      dlg.showModal();
      $('[data-reponse="non"]', dlg)?.focus();
    });
  }

  /* Import : la conversation collée est découpée en prompts, l'auteur relit puis ajoute. */
  let importResultat: ConversationImportee | null = null;
  function rendreImport(texte = ''): void {
    const r = importResultat;
    const nom = (id: number | null) => (id === null ? '' : (outils.get(id)?.nom ?? ''));
    el.import.innerHTML = `<div class="pub-dialogue-tete"><h2 id="import-titre">Coller une conversation</h2><button class="icon-btn" type="button" data-fermer aria-label="Fermer">${icon('close', '')}</button></div>
      <div class="pub-dialogue-corps">
        <div class="pub-champ">
          <label class="pub-label" for="import-texte">Conversation</label>
          <p class="pub-aide" id="import-aide">Copiez la conversation dans votre outil et collez-la ici. Chaque message est repéré par la mention placée en début de ligne : « Vous : », « ChatGPT a dit : », « User : »…</p>
          <textarea class="pub-input" id="import-texte" rows="8" data-import-texte aria-describedby="import-aide">${esc(texte)}</textarea>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-import-analyser>Repérer les prompts</button>
        ${
          r
            ? r.echanges.length
              ? `<div class="pub-import-resultat" role="status">
            <p><b>${pluriel(r.echanges.length, 'prompt repéré', 'prompts repérés')}</b>${r.outilId !== null ? ` · ${esc(nom(r.outilId))}${r.modele ? `, ${esc(r.modele)}` : ''}` : ''}</p>
            <ol>${r.echanges.map((e, i) => `<li><b>Prompt ${i + 1}</b><span>${esc(extrait(e.prompt, 140)) || '<i>Vide</i>'}</span></li>`).join('')}</ol>
          </div>`
              : '<p class="pub-erreur pub-erreur-bloc" role="alert">Aucun prompt repéré dans ce texte.</p>'
            : ''
        }
      </div>
      <div class="pub-dialogue-actions"><button class="btn btn-secondary" type="button" data-fermer>Annuler</button><button class="btn btn-primary" type="button" data-import-ajouter${r?.echanges.length ? '' : ' disabled'}>${r?.echanges.length ? `Ajouter ${pluriel(r.echanges.length, 'prompt', 'prompts')}` : 'Ajouter'}</button></div>`;
    corrigerTypographie(el.import);
  }
  function ouvrirImport(): void {
    importResultat = null;
    rendreImport();
    el.import.showModal();
    $('[data-import-texte]', el.import)?.focus();
  }
  el.import.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    if (cible === el.import || cible.closest('[data-fermer]')) {
      el.import.close();
      return;
    }
    if (cible.closest('[data-import-analyser]')) {
      const texte = $<HTMLTextAreaElement>('[data-import-texte]', el.import)?.value ?? '';
      importResultat = texte.trim()
        ? importeur.decouper(texte)
        : { echanges: [], sansMarqueur: false, reglages: '', outilId: null, modele: '' };
      rendreImport(texte);
      (
        $('[data-import-ajouter]:not([disabled])', el.import) ?? $('[data-import-texte]', el.import)
      )?.focus();
      return;
    }
    if (cible.closest('[data-import-ajouter]') && importResultat) {
      const r = importResultat;
      const place = LIMITES.echangesParEtape - prompts(d).filter((x) => !vide(x)).length;
      const precedent = prompts(d)
        .map((p) => p.outilId)
        .filter((o) => o !== null)
        .pop();
      d.chemin = d.chemin.filter((x) => !vide(x));
      const ajoutes = r.echanges.slice(0, Math.max(0, place)).map((ex, i) => {
        const outilId = ex.outilId ?? r.outilId ?? precedent ?? null;
        return nouveauPrompt(d, {
          outilId,
          modele: r.modele && outilId === r.outilId ? r.modele : '',
          reglages: i === 0 ? r.reglages : '',
          prompt: ex.prompt,
          reponse: ex.reponse,
          ouvert: {
            reponse: Boolean(ex.reponse),
            reglages: Boolean(r.modele || (i === 0 && r.reglages)),
          },
        });
      });
      d.chemin.push(...ajoutes);
      if (!d.chemin.length) d.chemin.push(nouveauPrompt(d));
      el.import.close();
      modifieMaintenant();
      rendre(ajoutes[0] ? `b:${ajoutes[0].id}:prompt` : undefined);
      toast(
        `${pluriel(ajoutes.length, 'prompt ajouté', 'prompts ajoutés')}. Relisez-les et retirez ceux qui n’apportent rien.`,
        'clipboard',
      );
    }
  });

  /* Choix de l'outil dans le catalogue, avec son logo. */
  let popBloc: BlocPrompt | null = null;
  let popBouton: HTMLElement | null = null;
  let popActif = 0;
  function optionsOutils(q: string) {
    const f = normaliser(q.trim());
    return FAMILLES.map((fam) => ({
      fam,
      outils: refs.outils.filter(
        (o) => o.famille === fam.id && (!f || normaliser(o.nom).includes(f)),
      ),
    })).filter((g) => g.outils.length);
  }
  function rendrePop(q = ''): void {
    const groupes = optionsOutils(q);
    const plats = groupes.flatMap((g) => g.outils);
    popActif = Math.min(popActif, Math.max(0, plats.length - 1));
    const liste = $('[data-pop-liste]', el.pop);
    const champRecherche = $('[data-pop-q]', el.pop);
    if (!liste || !champRecherche) return;
    liste.innerHTML = plats.length
      ? groupes
          .map(
            (g) =>
              `<div role="group" aria-labelledby="pf-${g.fam.id}"><p class="pub-pop-fam" id="pf-${g.fam.id}">${t(g.fam.label)}</p>${g.outils
                .map((o) => {
                  const i = plats.indexOf(o);
                  const choisi = popBloc?.outilId === o.id;
                  return `<div class="pub-pop-opt${i === popActif ? ' is-actif' : ''}" role="option" id="po-${i}" aria-selected="${choisi}" data-outil="${o.id}">${logo(o, 20)}<span>${esc(o.nom)}</span>${choisi ? icon('check') : ''}</div>`;
                })
                .join('')}</div>`,
          )
          .join('')
      : `<p class="pub-pop-vide">Aucun outil ne correspond à « ${esc(q)} ».</p>`;
    if (plats.length) champRecherche.setAttribute('aria-activedescendant', `po-${popActif}`);
    else champRecherche.removeAttribute('aria-activedescendant');
    const opt = $(`#po-${popActif}`, el.pop);
    if (opt) {
      if (opt.offsetTop < liste.scrollTop) liste.scrollTop = opt.offsetTop - 8;
      else if (opt.offsetTop + opt.offsetHeight > liste.scrollTop + liste.clientHeight)
        liste.scrollTop = opt.offsetTop + opt.offsetHeight - liste.clientHeight + 8;
    }
  }
  function placerPop(): void {
    if (!popBouton?.isConnected) {
      fermerPop();
      return;
    }
    const r = popBouton.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) {
      fermerPop();
      return;
    }
    const largeur = Math.min(300, innerWidth - 24);
    el.pop.style.width = `${largeur}px`;
    el.pop.style.left = `${Math.max(12, Math.min(r.left, innerWidth - largeur - 12))}px`;
    const bas = innerHeight - r.bottom;
    if (bas < 320 && r.top > bas) {
      el.pop.style.top = '';
      el.pop.style.bottom = `${innerHeight - r.top + 6}px`;
    } else {
      el.pop.style.bottom = '';
      el.pop.style.top = `${r.bottom + 6}px`;
    }
  }
  function ouvrirPop(bouton: HTMLElement, bloc: BlocPrompt): void {
    popBloc = bloc;
    popBouton = bouton;
    popActif = 0;
    el.pop.innerHTML = `<div class="pub-pop-tete">${icon('search')}<label class="sr-only" for="pub-pop-q">Rechercher un outil</label><input id="pub-pop-q" type="text" role="combobox" aria-expanded="true" aria-controls="pub-pop-liste" aria-autocomplete="list" placeholder="Rechercher un outil" autocomplete="off" data-pop-q></div><div class="pub-pop-liste" id="pub-pop-liste" role="listbox" aria-label="Outils d’IA" data-pop-liste></div>`;
    el.pop.hidden = false;
    placerPop();
    bouton.setAttribute('aria-expanded', 'true');
    rendrePop();
    $('[data-pop-q]', el.pop)?.focus();
  }
  function fermerPop(rendreFocus = false): void {
    if (el.pop.hidden) return;
    el.pop.hidden = true;
    if (popBouton) {
      popBouton.setAttribute('aria-expanded', 'false');
      if (rendreFocus && popBouton.isConnected) popBouton.focus();
    }
    popBloc = null;
  }
  function choisirOutil(id: number): void {
    const x = popBloc;
    if (!x) return;
    const ancien = outilDe(x)?.modeles ?? [];
    if (x.outilId !== id && ancien.some((m) => m.nomCourt === x.modele)) x.modele = '';
    x.outilId = id;
    touches.add(`o:${x.id}`);
    fermerPop();
    modifieMaintenant();
    rendre(`o:${x.id}`);
  }
  addEventListener('resize', () => {
    if (el.apercu.open) placerApercu();
    if (!el.pop.hidden) fermerPop();
  });
  addEventListener(
    'scroll',
    () => {
      if (!el.pop.hidden) placerPop();
    },
    { passive: true },
  );

  /* Aperçu : la fiche de création elle-même, telle que les lecteurs la verront. */
  let ecran: 'ordinateur' | 'mobile' | null = null;
  function placerApercu(): void {
    const scene = $('[data-scene]', el.apercu);
    const cadre = $('iframe', el.apercu);
    if (!scene || !cadre) return;
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    const largeur = ecran === 'mobile' ? 390 : 1280;
    const k = ecran === 'mobile' ? Math.min(1, (h - 32) / 760) : Math.min(1, (w - 32) / 1280);
    Object.assign(cadre.style, {
      width: `${largeur}px`,
      height: `${(h - 32) / k}px`,
      transform: `scale(${k})`,
      left: `${(w - largeur * k) / 2}px`,
      top: '16px',
    });
  }
  el.apercu.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    if (cible.closest('[data-fermer]') || cible === el.apercu) el.apercu.close();
    const b = cible.closest<HTMLElement>('[data-ecran]');
    if (b) {
      ecran = b.dataset.ecran === 'mobile' ? 'mobile' : 'ordinateur';
      for (const k of $$('[data-ecran]', el.apercu))
        k.setAttribute('aria-pressed', String(k === b));
      placerApercu();
    }
  });
  async function ouvrirApercu(): Promise<void> {
    if (d.statut !== 'publiee') {
      if (d.creationId === null && !aDuContenu(d)) {
        toast('Commencez par donner un titre ou un prompt : l’aperçu montrera la fiche.', 'eye');
        $('#f-titre')?.focus();
        return;
      }
      if (aEnregistrer || d.creationId === null || enCours) {
        const ok = await sauver();
        if (!ok) {
          toast(
            'L’aperçu attend l’enregistrement du brouillon. Réessayez dans un instant.',
            'alert',
          );
          return;
        }
      }
    }
    if (!ficheCourante) return;
    ecran = ecran ?? (innerWidth < 760 ? 'mobile' : 'ordinateur');
    const note =
      d.statut === 'publiee'
        ? modifsNonPubliees
          ? 'Version publiée : vos modifications n’y figurent pas encore'
          : 'Version publiée'
        : 'Visible de vous seul jusqu’à la publication';
    el.apercu.innerHTML = `<div class="pub-apercu-tete">
        <h2 id="apercu-titre">Aperçu de la fiche</h2>
        <div class="pub-seg" role="group" aria-label="Taille d’écran">
          <button type="button" data-ecran="ordinateur" aria-pressed="${ecran === 'ordinateur'}">${icon('monitor')}Ordinateur</button>
          <button type="button" data-ecran="mobile" aria-pressed="${ecran === 'mobile'}">${icon('phone')}Mobile</button>
        </div>
        <p class="pub-apercu-note">${icon('lock')}${t(note)}</p>
        <button class="icon-btn" type="button" data-fermer aria-label="Fermer l’aperçu">${icon('close', '')}</button>
      </div>
      <div class="pub-apercu-scene" data-scene><iframe title="Aperçu de la fiche « ${esc(d.titre || 'Création sans titre')} »" src="${esc(adresseCreation(ficheCourante))}?apercu=1"></iframe></div>`;
    el.apercu.showModal();
    requestAnimationFrame(placerApercu);
    $('[data-fermer]', el.apercu)?.focus();
  }

  /* Publication ----------------------------------------------------------------------------- */

  function premiereErreur(): void {
    const err = valider();
    const n = new Set([...err.values()].map((e) => e.groupe)).size;
    rendreTout();
    annoncer(`${pluriel(n, 'point', 'points')} à compléter avant de publier.`);
    const premiere = [...err.keys()][0];
    if (premiere) aller(premiere);
  }

  function echecPublication(probleme: ProblemeApi): void {
    if (probleme.code === 'LIMITE_ATTEINTE') {
      limiteAtteinte = probleme.detail ?? probleme.title;
      rendreCote();
      toast('Limite de publications atteinte : votre brouillon reste enregistré.', 'clock');
      aller('pub-limite');
      return;
    }
    const erreurs = probleme.erreurs ?? {};
    const autres = Object.keys(erreurs).filter((cle) => cle !== 'confirmationDonnees');
    if (autres.length) {
      erreursApi = erreurs;
      tentative = true;
      premiereErreur();
      return;
    }
    if (erreurs.confirmationDonnees) {
      consentement = false;
      erreurConsentement = true;
      rendreCote('consentement');
      return;
    }
    signalerEchec(probleme, 'La publication n’a pas abouti. Réessayez dans un instant.');
  }

  async function publier(): Promise<void> {
    if (!exiger('contribuer', 'publier une création')) return;
    if (publication) return;
    tentative = true;
    const err = valider();
    const sens = sensiblesATraiter(d);
    if (err.size) {
      premiereErreur();
      return;
    }
    const premierSensible = sens[0];
    if (premierSensible) {
      rendreTout();
      annoncer('Des passages sensibles sont à vérifier.');
      aller(`masquer:${premierSensible.id}`);
      return;
    }
    if (!consentement) {
      erreurConsentement = true;
      rendreCote('consentement');
      return;
    }
    publication = true;
    rendreCote('publier');
    const etaitPubliee = d.statut === 'publiee';
    try {
      let reponse: Envoi;
      if (etaitPubliee) reponse = await envoyerContenu(true);
      else {
        const ok = await sauver();
        if (!ok || d.creationId === null) {
          toast(
            'La publication attend l’enregistrement du brouillon. Réessayez dans un instant.',
            'alert',
          );
          return;
        }
        const r = await api<CreationFicheApi>(
          'POST',
          `/api/v1/creations/${d.creationId}/publication`,
          { confirmationDonnees: true },
        );
        reponse = r.ok ? { ok: true, fiche: r.donnees } : { ok: false, probleme: r.probleme };
      }
      if (!reponse.ok) {
        echecPublication(reponse.probleme);
        return;
      }
      ficheCourante = reponse.fiche;
      d.statut = 'publiee';
      d.publieLe = reponse.fiche.datePublication;
      d.typeVerrouille = reponse.fiche.type;
      modifsNonPubliees = false;
      aEnregistrer = false;
      consentement = false;
      tentative = false;
      limiteAtteinte = null;
      erreursApi = {};
      etatSauvegarde = 'ok';
      if (etaitPubliee) {
        rendreTout();
        toast('Modifications publiées.');
        return;
      }
      vueFin = true;
      el.fin.innerHTML = finHTML();
      corrigerTypographie(el.fin);
      appliquerEtat();
      scrollTo({ top: 0, behavior: 'auto' });
      $('[data-fin-titre]')?.focus({ preventScroll: true });
    } finally {
      publication = false;
      if (!vueFin) rendreCote();
    }
  }

  function ajouterEtiquette(valeur: string): void {
    const v = cap(valeur.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()).slice(
      0,
      LONGUEURS.etiquette.max,
    );
    if (!v || d.etiquettes.length >= LIMITES.etiquettesParContenu) return;
    if (!slugifier(v)) {
      toast('Utilisez des lettres ou des chiffres dans chaque étiquette.', 'tag');
      return;
    }
    if (d.etiquettes.some((e) => e.toLowerCase() === v.toLowerCase())) {
      toast(`« ${v} » figure déjà dans vos étiquettes.`, 'tag');
      return;
    }
    d.etiquettes.push(v);
    modifie();
    rendreCote(
      d.etiquettes.length >= LIMITES.etiquettesParContenu ? `etiquette:${v}` : 'etiquette-saisie',
    );
  }

  const blocDe = (b: HTMLElement): Bloc | null => {
    const x = trouver(d, b.dataset.id ?? '');
    return x && (x.kind === 'prompt' || x.kind === 'etape') ? (x as Bloc) : null;
  };

  const ACTIONS: Record<string, (b: HTMLElement) => void | Promise<void>> = {
    publier,
    apercu: ouvrirApercu,
    supprimer: supprimerTout,
    depublier,
    importer: ouvrirImport,
    aller: (b) => aller(b.dataset.cible ?? ''),
    'voir-liste': () => aller('liste-presentation'),
    'fermer-reprise': () => {
      reprise = false;
      rendreEntete();
      $('#f-titre')?.focus();
    },
    'ajouter-resultat': (b) => {
      const sorte = (b.dataset.sorte ?? 'texte') as SorteResultat;
      if (sorte === 'fichier') {
        choisirFichiers('resultat');
        return;
      }
      const r = nouveauResultat(d, sorte);
      d.resultats.push(r);
      modifieMaintenant();
      rendre(sorte === 'lien' ? `r:${r.id}:url` : `r:${r.id}:texte`);
    },
    'retirer-resultat': async (b) => {
      const r = d.resultats.find((x) => x.id === b.dataset.id);
      if (!r) return;
      const rempli = longueur(r.texte) || longueur(r.url) || r.src;
      if (
        rempli &&
        !(await confirmer({
          titre: 'Retirer cet élément du résultat ?',
          texte: 'Son contenu sera effacé du brouillon.',
          action: 'Retirer',
          danger: true,
        }))
      )
        return;
      const i = d.resultats.indexOf(r);
      d.resultats.splice(i, 1);
      modifieMaintenant();
      const voisin = d.resultats[Math.min(i, d.resultats.length - 1)];
      rendre(voisin ? `retirer:${voisin.id}` : `ajouter-resultat:${r.kind}`);
    },
    outil: (b) => {
      const x = blocDe(b);
      if (!x || x.kind !== 'prompt') return;
      if (!el.pop.hidden && popBouton === b) {
        fermerPop(true);
        return;
      }
      ouvrirPop(b, x);
    },
    ouvrir: (b) => {
      const x = blocDe(b);
      if (!x || x.kind !== 'prompt') return;
      const quoi = b.dataset.quoi === 'reglages' ? 'reglages' : 'reponse';
      x.ouvert[quoi] = !x.ouvert[quoi];
      rendre(
        x.ouvert[quoi]
          ? quoi === 'reponse'
            ? `b:${x.id}:reponse`
            : `b:${x.id}:modele`
          : b.dataset.k,
      );
    },
    moment: (b) => {
      const x = blocDe(b);
      if (!x) return;
      if (x.moment) {
        if (longueur(x.moment.texte)) {
          aller(`m:${x.id}`);
          return;
        }
        momentsMemo[x.id] = x.moment;
        x.moment = null;
        modifieMaintenant();
        rendre(b.dataset.k);
        return;
      }
      x.moment = momentsMemo[x.id] ?? { type: 'CORRECTION', texte: '', titre: '' };
      modifieMaintenant();
      rendre(`mt:${x.id}`);
    },
    monter: (b) => {
      const x = blocDe(b);
      if (x && deplacer(d.chemin, x, -1)) {
        modifie();
        rendre(d.chemin.indexOf(x) === 0 ? `descendre:${x.id}` : `monter:${x.id}`);
      }
    },
    descendre: (b) => {
      const x = blocDe(b);
      if (x && deplacer(d.chemin, x, 1)) {
        modifie();
        rendre(
          d.chemin.indexOf(x) === d.chemin.length - 1 ? `monter:${x.id}` : `descendre:${x.id}`,
        );
      }
    },
    'supprimer-bloc': async (b) => {
      const x = blocDe(b);
      if (!x || d.chemin.length === 1) return;
      const nom = x.kind === 'prompt' ? 'ce prompt' : 'cette étape';
      if (
        !vide(x) &&
        !(await confirmer({
          titre: `Supprimer ${nom} ?`,
          texte:
            x.kind === 'prompt'
              ? 'Son texte, la réponse, les images jointes et le moment clé seront effacés.'
              : 'Son titre, son texte et son moment clé seront effacés.',
          action: 'Supprimer',
          danger: true,
        }))
      )
        return;
      const i = d.chemin.indexOf(x);
      d.chemin.splice(i, 1);
      modifieMaintenant();
      const voisin = d.chemin[Math.min(i, d.chemin.length - 1)];
      if (voisin)
        rendre(voisin.kind === 'prompt' ? `b:${voisin.id}:prompt` : `b:${voisin.id}:titre`);
      toast(x.kind === 'prompt' ? 'Prompt supprimé.' : 'Étape supprimée.', 'trash');
    },
    'ajouter-prompt': () => {
      const precedent = prompts(d)
        .map((p) => p.outilId)
        .filter((o) => o !== null)
        .pop();
      const x = nouveauPrompt(d, { outilId: precedent ?? null });
      d.chemin.push(x);
      modifieMaintenant();
      rendre(`b:${x.id}:prompt`);
    },
    'ajouter-etape': () => {
      const x = nouvelleEtape(d);
      d.chemin.push(x);
      modifieMaintenant();
      rendre(`b:${x.id}:titre`);
    },
    joindre: (b) => choisirFichiers(b.dataset.id ?? 'resultat'),
    'retirer-fichier': (b) => {
      const id = b.dataset.id;
      const x = prompts(d).find((p) => p.fichiers.some((f) => f.id === id));
      if (x) x.fichiers = x.fichiers.filter((f) => f.id !== id);
      modifieMaintenant();
      rendre(x ? `joindre:${x.id}` : undefined);
    },
    masquer: (b) => {
      const s = sensibles(d).find((k) => k.id === b.dataset.id);
      if (!s) return;
      ecrireChamp(d, s.cle, lireChamp(d, s.cle).split(s.valeur).join(s.masque));
      modifieMaintenant();
      rendre(s.cle);
      toast(`${s.type} remplacée par « ${s.masque} ».`, 'eye-off');
    },
    conserver: (b) => {
      const id = b.dataset.id ?? '';
      const s = sensibles(d).find((k) => k.id === id);
      d.decisions[id] = 1;
      memoriserDecisions();
      rendre(s?.cle);
    },
    'proposer-categorie': () => {
      d.categorieId = categorieProposee(d, refs)?.id ?? null;
      modifie();
      rendreCote('categorie');
    },
    'retirer-etiquette': (b) => {
      d.etiquettes = d.etiquettes.filter((e) => e !== b.dataset.v);
      modifie();
      rendreCote('etiquette-saisie');
    },
    'copier-lien': async () => {
      const url = new URL(ficheCourante ? adresseCreation(ficheCourante) : '/', location.href).href;
      try {
        await navigator.clipboard.writeText(url);
        toast('Lien de la fiche copié.', 'copy');
      } catch {
        toast(`Copie indisponible. Lien : ${url}`, 'copy');
      }
    },
    'continuer-modifier': () => {
      vueFin = false;
      appliquerEtat();
      scrollTo({ top: 0, behavior: 'auto' });
      $('#f-titre')?.focus({ preventScroll: true });
    },
  };

  /* Événements -------------------------------------------------------------------------------- */

  document.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    if (!el.pop.hidden && !el.pop.contains(cible) && !cible.closest('[data-action="outil"]'))
      fermerPop();
    const b = cible.closest<HTMLButtonElement>('[data-action]');
    if (!b || b.disabled) return;
    const action = ACTIONS[b.dataset.action ?? ''];
    if (!action) return;
    e.preventDefault();
    void action(b);
  });

  document.addEventListener('input', (e) => {
    const cible = e.target as HTMLElement;
    const champEl = cible.closest<HTMLInputElement | HTMLTextAreaElement>('[data-f]');
    if (champEl && el.editeur.contains(champEl)) {
      const cle = champEl.dataset.f ?? '';
      ecrireChamp(d, cle, champEl.value);
      if (cle.endsWith(':url')) {
        const r = d.resultats.find((x) => x.id === cle.split(':')[1]);
        if (r && !r.typeChoisi) {
          r.type = typeLien(r.url);
          const sel = $<HTMLSelectElement>(`[data-lien-type="${r.id}"]`);
          if (sel) sel.value = r.type || 'DEMO';
        }
      }
      if (champEl instanceof HTMLTextAreaElement && tailleAuto) {
        champEl.style.height = 'auto';
        champEl.style.height = `${champEl.scrollHeight + 2}px`;
      }
      modifie();
      const err = majPanneau();
      if (touches.has(cle) || tentative) majChamp(cle, err);
      return;
    }
    if (cible.matches('[data-pop-q]')) {
      popActif = 0;
      rendrePop((cible as HTMLInputElement).value);
    }
  });

  /* En quittant un champ rempli : erreur éventuelle et données sensibles. */
  document.addEventListener('focusout', (e) => {
    const champEl = (e.target as HTMLElement).closest?.<HTMLInputElement>('[data-f]');
    if (!champEl || !el.editeur.contains(champEl)) return;
    const cle = champEl.dataset.f ?? '';
    if (longueur(champEl.value) || touches.has(cle)) {
      touches.add(cle);
      majChamp(cle);
    }
    majAlertes(cle);
    majPanneau();
  });

  document.addEventListener('change', (e) => {
    const c = e.target as HTMLInputElement;
    if (!el.editeur.contains(c)) return;
    if (c.matches('[data-categorie]')) {
      d.categorieId = c.value ? Number(c.value) : null;
      touches.add('categorie');
      modifie();
      rendreCote('categorie');
      return;
    }
    if (c.matches('[data-licence]')) {
      d.licenceId = Number(c.value);
      modifie();
      rendreCote('licence');
      return;
    }
    if (c.matches('[data-mtype]')) {
      const x = trouver(d, c.dataset.mtype ?? '');
      if (x && 'moment' in x && x.moment) x.moment.type = c.value as TypeMomentCle;
      modifie();
      rendre(`mt:${c.dataset.mtype}`);
      return;
    }
    if (c.matches('[data-lien-type]')) {
      const r = d.resultats.find((x) => x.id === c.dataset.lienType);
      if (r) {
        r.type = c.value as TypeLienExterne;
        r.typeChoisi = true;
      }
      modifie();
      majPanneau();
      return;
    }
    if (c.matches('[data-agent-flag]')) {
      d.agent = c.checked;
      modifie();
      return;
    }
    if (c.matches('[data-defi-choix]')) {
      d.defiId = c.checked ? (contexteCourant()?.defi.id ?? null) : null;
      touches.add('defi');
      modifie();
      rendreCote('defi');
      return;
    }
    if (c.matches('[data-consentement]')) {
      consentement = c.checked;
      if (erreurConsentement && consentement) {
        erreurConsentement = false;
        rendreCote('consentement');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    const cible = e.target as HTMLInputElement;
    if (cible.matches('[data-etiquette]') && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault();
      ajouterEtiquette(cible.value);
      return;
    }
    if (
      cible.matches('[data-etiquette]') &&
      e.key === 'Backspace' &&
      !cible.value &&
      d.etiquettes.length
    ) {
      d.etiquettes.pop();
      modifie();
      rendreCote('etiquette-saisie');
      return;
    }
    if (
      e.key === 'Enter' &&
      cible.matches('.pub-form input[type="text"], .pub-form input[type="url"]')
    ) {
      e.preventDefault();
      return;
    }
    if (cible.matches('[data-pop-q]')) {
      const plats = optionsOutils(cible.value).flatMap((g) => g.outils);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        popActif =
          (popActif + (e.key === 'ArrowDown' ? 1 : -1) + plats.length) % Math.max(1, plats.length);
        rendrePop(cible.value);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        popActif = e.key === 'Home' ? 0 : plats.length - 1;
        rendrePop(cible.value);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const choix = plats[popActif];
        if (choix) choisirOutil(choix.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fermerPop(true);
        return;
      }
      if (e.key === 'Tab') fermerPop();
    }
  });

  el.form.addEventListener('submit', (e) => e.preventDefault());

  /* Images déposées ou collées dans le résultat, ou dans la réponse d'un prompt. */
  document.addEventListener('paste', (e) => {
    const fichiers = [...(e.clipboardData?.files ?? [])];
    if (!fichiers.length || el.editeur.hidden) return;
    const actif = document.activeElement;
    const bloc = actif?.closest<HTMLElement>('[data-bloc]');
    const depot = actif?.closest('[data-depot]');
    if (!bloc && !depot) return;
    e.preventDefault();
    const x = bloc ? trouver(d, bloc.dataset.bloc ?? '') : null;
    void ajouterFichiers(
      fichiers,
      x && 'kind' in x && x.kind === 'prompt' && bloc
        ? (bloc.dataset.bloc ?? 'resultat')
        : 'resultat',
    );
  });
  for (const type of ['dragover', 'dragenter'])
    document.addEventListener(type, (e) => {
      const evenement = e as DragEvent;
      const zone = (e.target as HTMLElement).closest?.('[data-depot]');
      if (!zone || !evenement.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      zone.classList.add('is-survol');
    });
  document.addEventListener('dragleave', (e) => {
    const zone = (e.target as HTMLElement).closest?.('[data-depot]');
    if (zone && !zone.contains(e.relatedTarget as Node | null)) zone.classList.remove('is-survol');
  });
  document.addEventListener('drop', (e) => {
    const zone = (e.target as HTMLElement).closest?.('[data-depot]');
    if (!zone || !e.dataTransfer?.files.length) return;
    e.preventDefault();
    zone.classList.remove('is-survol');
    void ajouterFichiers([...e.dataTransfer.files], 'resultat');
  });
  el.fichier.addEventListener('change', () => {
    if (el.fichier.files?.length) void ajouterFichiers([...el.fichier.files], cibleFichiers);
  });
  el.pop.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('[data-outil]')) e.preventDefault();
  });
  el.pop.addEventListener('click', (e) => {
    const o = (e.target as HTMLElement).closest<HTMLElement>('[data-outil]');
    if (o) choisirOutil(Number(o.dataset.outil));
  });

  appliquerEtat();
}
