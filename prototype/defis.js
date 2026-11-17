'use strict';
/* Page Défis : le défi de la semaine (thème expliqué, échéance, chiffres, participations en tête),
   ses règles, la manière de participer, les participations, les défis précédents. Les
   participations d'un défi sont distinctes des créations d'Explorer : une par personne,
   modifiable ou supprimable jusqu'à la clôture. La page suit le format de participation du défi
   (jeu jouable, image, code) ; les états se règlent dans Tweaks. */
(() => {
  const V = window.Vysora, D = window.VYSORA_DEFIS;
  const { $, $$, t, esc, icon } = V;
  const root = document.documentElement;
  const player = $('[data-player]'), formDialog = $('[data-form-dialog]'), archiveDialog = $('[data-archive-dialog]'), confirmDialog = $('[data-confirm]');
  const PAS = 6;
  const state = { tool: 'Tous', q: '', sort: 'useful', limite: PAS, playing: null, origin: null, ordre: [], fichier: null, image: null, couverture: null, zoom: false, modifier: false };
  const chargement = Date.now();
  const nb = ' ';
  let settings = {}, sectionObserver, barObserver, publiee = null, garderDialogues = false;
  let vue = V.store.get('vysora-defis-vue', 'grille') === 'liste' ? 'liste' : 'grille';
  const storedVotes = V.store.get('vysora-defis-votes-v2', []);
  const votes = new Set(Array.isArray(storedVotes) ? storedVotes : []);
  const bump = new Set();

  /* Défi courant et format ---------------------------------------------- */
  const C = () => D.variantes[settings.format] || D.variantes.jeu;
  const FORMATS = {
    PAGE_HTML: { cle: 'jeu', action: 'Jouer', icone: 'play', lancer: 'Jouer à', icKicker: 'gamepad', un: 'jeu', des: 'jeux', resultat: 'Votre jeu', etape2: ['Déposez le fichier obtenu', 'Contrôlé, puis essayé ici avant publication.'] },
    IMAGE: { cle: 'image', action: 'Voir', icone: 'expand', lancer: 'Voir', icKicker: 'image', un: 'image', des: 'images', resultat: 'Votre image', etape2: ['Ajoutez l’image obtenue', 'Avec une courte description.'] },
    CODE: { cle: 'code', action: 'Lire le code', icone: 'code', lancer: 'Lire le code de', icKicker: 'code', un: 'script', des: 'scripts', resultat: 'Votre code', etape2: ['Collez le code obtenu', 'Avec le nom du fichier.'] }
  };
  const F = () => FORMATS[C().format];
  const maxPrompts = () => C().nbPromptsMax;

  /* États ------------------------------------------------------------- */
  const statut = () => settings.statut;
  const ouvert = () => statut() === 'en_cours';
  /* En pause : le défi continue (jeux, votes, compte à rebours) mais n'accepte plus de participation. */
  const enPause = () => statut() === 'pause';
  const actif = () => ouvert() || enPause();
  const aVenir = () => statut() === 'a_venir';
  const fige = () => statut() === 'cloture';
  const termine = () => statut() === 'termine' || fige();
  const prive = () => statut() === 'introuvable' || (statut() === 'brouillon' && !V.etats.peut('administrer'));
  const indisponible = () => ['annule', 'brouillon', 'introuvable'].includes(statut());
  const mine = () => V.etats.membre() && settings.participation === 'publiee';
  const maParticipation = () => (mine() ? (publiee && publiee.defi === C().id ? publiee : { ...C().mienne, m: V.nomMoi(), moi: true }) : null);
  const participations = () => {
    if (indisponible() || aVenir() || settings.donnees === 'vide') return [];
    const m = maParticipation();
    const base = settings.donnees === 'nombreuses' ? [...C().participations, ...(C().supplementaires || [])] : C().participations.slice();
    return m ? [...base, m] : base;
  };
  const trouver = id => participations().find(e => e.id === id);
  const voted = e => V.etats.membre() && votes.has(e.id);
  const useful = e => e.n + (voted(e) ? 1 : 0);
  const parRang = (a, b) => useful(b) - useful(a) || a.date.localeCompare(b.date);
  const classement = () => participations().sort(parRang);
  const rang = e => classement().findIndex(x => x.id === e.id) + 1;
  const place = n => `${n}${n === 1 ? 're' : 'e'}${nb}place`;

  /* Dates et compte à rebours (« maintenant » simulé, qui avance) ----- */
  const maintenant = () => new Date(new Date(D.maintenant[statut()] || D.maintenant.en_cours).getTime() + (Date.now() - chargement));
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dateHeure = iso => {
    const d = new Date(iso);
    return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} à ${d.getUTCHours()}${nb}h${nb}${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };
  const jourMois = iso => { const d = new Date(iso); return `${d.getUTCDate()}${nb}${MOIS[d.getUTCMonth()]}`; };
  const restant = () => Math.max(0, new Date(aVenir() ? C().debut : C().fin).getTime() - maintenant().getTime());
  const avancement = () => {
    const debut = new Date(C().debut).getTime(), fin = new Date(C().fin).getTime();
    return Math.min(1, Math.max(0, (maintenant().getTime() - debut) / (fin - debut)));
  };
  const nouveau = e => maintenant().getTime() - new Date(e.date).getTime() < 24 * 3600 * 1000 && !termine();
  const decompte = ms => {
    const s = Math.floor(ms / 1000), j = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    if (j > 0) return `${j}${nb}j ${h}${nb}h ${String(m).padStart(2, '0')}${nb}min`;
    if (h > 0) return `${h}${nb}h ${String(m).padStart(2, '0')}${nb}min ${String(sec).padStart(2, '0')}${nb}s`;
    return `${m}${nb}min ${String(sec).padStart(2, '0')}${nb}s`;
  };
  const decompteCourt = ms => { const s = Math.floor(ms / 1000), j = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return j > 0 ? `${j}${nb}j ${h}${nb}h` : `${h}${nb}h ${String(m).padStart(2, '0')}`; };
  function battre() {
    const ms = restant();
    $$('[data-countdown]').forEach(el => { el.textContent = decompte(ms); });
    $$('[data-countdown-court]').forEach(el => { el.textContent = decompteCourt(ms); });
    $$('[data-progress]').forEach(el => { el.style.setProperty('--avance', `${(avancement() * 100).toFixed(2)}%`); });
  }

  /* Fragments --------------------------------------------------------- */
  const avatarDe = (e, size) => (e.moi ? V.avatarMoi(size) : V.avatar(e.m, size));
  const outil = e => `<span class="df-tool">${V.logo(e.outil)}${t(e.outil)}${e.modele ? ` · ${t(e.modele)}` : ''}</span>`;
  const chemin = e => (e.chemin.length > 1 ? `${e.chemin.length}${nb}échanges` : `1 prompt · ${e.essais > 1 ? `meilleur de ${e.essais}${nb}essais` : 'premier essai'}`);
  const affiche = (r, cls = '') => `<span class="df-poster${cls}" role="img" aria-label="${t(r.alt)}"><small>${t(r.affiche.ligne)}</small><b>${t(r.affiche.lieu)}</b><i aria-hidden="true">↗</i></span>`;
  const extrait = (r, lignes = 9) => r.code.split('\n').slice(0, lignes).map(l => `<span>${esc(l) || ' '}</span>`).join('');
  const couvertureType = e => `<span class="df-cover-type" aria-hidden="true"><small>${t(C().titre)}</small><b>${t(e.titre)}</b></span>`;
  function visuel(e, { tot = false, lignes = 9 } = {}) {
    const r = e.resultat;
    if (r.type === 'jeu') return r.couverture ? `<img class="df-media-img" src="${esc(r.couverture)}" alt="" width="960" height="540"${tot ? '' : ' loading="lazy"'} decoding="async" data-cover="${esc(e.id)}">` : couvertureType(e);
    if (r.type === 'image') return `<span class="df-media-poster${r.portrait ? ' is-portrait' : ''}">${r.affiche ? affiche(r) : `<img src="${esc(r.image)}" alt="${t(r.alt)}"${tot ? '' : ' loading="lazy"'} decoding="async">`}</span>`;
    return `<span class="df-media-code" aria-hidden="true"><span class="df-code-bar"><i></i><i></i><i></i><b>${t(r.nom)}</b></span><code>${extrait(r, lignes)}</code></span>`;
  }
  const voteButton = (e, grand = false) => {
    const off = !actif() || e.moi;
    return `<button class="df-vote${grand ? ' is-big' : ''}${bump.has(e.id) ? ' is-bump' : ''}" type="button" data-vote="${esc(e.id)}" aria-pressed="${voted(e)}" aria-label="${voted(e) ? 'Retirer mon vote Utile pour' : 'Voter Utile pour'} ${t(e.titre)}"${off ? ' disabled' : ''}>${icon('utile')}<span>${useful(e)} Utile</span></button>`;
  };
  const notice = (title, body, extra = '') => `<div class="df-empty"><h3>${t(title)}</h3><p>${t(body)}</p>${extra}</div>`;

  /* Le défi : en-tête --------------------------------------------------- */
  const statutLabel = () => ({ a_venir: 'Bientôt ouvert', en_cours: 'En cours', pause: 'En pause', termine: 'Participations closes', cloture: 'Clôturé', annule: 'Annulé', brouillon: 'Brouillon' }[statut()] || '');
  /* Règles en cases et principes les plus jugés, dans le bloc du défi. */
  function brief() {
    const c = C();
    return `<div class="df-brief">
      <section class="df-brief-block" aria-labelledby="df-regles-titre"><h2 id="df-regles-titre" class="df-brief-label">${icon('check-circle')}Les règles</h2><ul class="df-rule-cards">${c.regles.map(r => `<li><b class="df-rule-n">${t(r.chiffre)}</b><span class="df-rule-name">${t(r.intitule)}</span><small>${t(r.precision)}</small></li>`).join('')}</ul><p class="df-judged-foot">${icon('utile')}Classement par votes « Utile ».</p></section>
      <section class="df-brief-block" aria-labelledby="df-juge-titre"><h2 id="df-juge-titre" class="df-brief-label">${icon('award')}Le plus jugé</h2><ul class="df-judged">${c.criteres.map(x => `<li>${icon(x.icone, 'icon')}<span>${t(x.libelle)}</span></li>`).join('')}</ul>${c.criteresCommuns.length ? `<p class="df-judged-more"><span>Aussi</span>${c.criteresCommuns.map(x => `<span class="df-chip">${t(x)}</span>`).join('')}</p>` : ''}</section>
    </div>`;
  }
  /* Colonne d'action : le premier du classement, réduit à l'essentiel, puis participer et voir les
     participations. */
  function podium(liste) {
    if (aVenir() || indisponible()) return '';
    if (!liste.length) return `<div class="df-first is-empty"><p>${icon(F().icKicker)}<span>Aucune participation pour l’instant.</span></p></div>`;
    const e = liste[0], rangTexte = fige() ? '1re place' : 'En tête';
    return `<button class="df-first is-${e.resultat.type}${e.moi ? ' is-mine' : ''}" type="button" data-play="${esc(e.id)}" aria-label="${F().lancer} ${t(e.titre)}, ${fige() ? '1re place' : 'en tête du classement'}, ${useful(e)} votes « Utile »">
      <span class="df-first-media" aria-hidden="true">${visuel(e, { tot: true, lignes: 7 })}</span>
      <span class="df-first-badge" aria-hidden="true">${icon('crown')}${rangTexte}</span>
      <span class="df-first-foot" aria-hidden="true"><span class="df-first-text"><b>${t(e.titre)}</b><small>${t(e.moi ? 'Vous' : e.m)}</small></span><span class="df-first-votes">${icon('utile')}${useful(e)}</span></span>
    </button>`;
  }
  function action(liste) {
    const e = maParticipation(), n = liste.length;
    const voir = n ? `<a class="btn btn-secondary df-cta" href="#participations">Voir les participations${icon('arrow-down')}</a>` : '';
    if (e && (actif() || termine())) {
      const r = rang(e);
      return `${podium(liste)}<div class="df-mine"><p class="df-mine-kicker">${icon('check-circle')}Votre participation · ${place(r)}</p><div class="df-mine-actions"><button class="btn btn-secondary btn-sm" type="button" data-play="${esc(e.id)}">${icon(F().icone)}Voir</button>${ouvert() ? `<button class="btn btn-secondary btn-sm" type="button" data-modifier>${icon('pen')}Modifier</button>` : ''}${actif() ? `<button class="btn btn-quiet btn-sm df-danger-text" type="button" data-supprimer>${icon('x')}Supprimer</button>` : ''}</div></div>${voir}`;
    }
    if (ouvert()) return `${podium(liste)}<button class="btn btn-primary btn-lg df-cta" type="button" data-participer>Participer au défi${icon('arrow')}</button>${voir}`;
    if (enPause()) return `${podium(liste)}<div class="df-paused">${icon('pause')}<p><b>Participations en pause</b><span>Elles reprendront dès que possible.</span></p></div>${voir}`;
    if (aVenir()) return `<button class="btn btn-primary btn-lg df-cta" type="button" data-participer disabled>Ouverture le ${jourMois(C().debut)}</button>`;
    if (termine()) return `${podium(liste)}${voir}`;
    return '';
  }
  function renderTop() {
    const box = $('[data-current]');
    const c = C(), liste = classement(), n = liste.length;
    $$('.df-nav [data-participer]').forEach(b => {
      b.disabled = !ouvert();
      b.innerHTML = `${aVenir() ? `Ouverture le ${jourMois(c.debut)}` : fige() ? 'Défi clôturé' : termine() ? 'Participations closes' : enPause() ? 'Participations en pause' : !ouvert() ? 'Participations fermées' : mine() ? 'Ma participation' : 'Participer au défi'}${ouvert() ? icon('arrow') : ''}`;
    });
    $('[data-total]').textContent = indisponible() || aVenir() ? '' : n;
    if (prive()) { box.innerHTML = `<div class="df-top-head"><p class="kicker">${icon('trophy')}Défis</p></div>${notice('Ce défi est introuvable', 'Retrouvez les défis précédents et leurs résultats plus bas.')}`; return; }
    /* Une seule mention de l'échéance : la fin du défi et le temps qui reste. */
    const echeance = aVenir() ? `<span>ouvre le ${t(jourMois(c.debut))}</span><span>dans <b data-countdown-court>${decompteCourt(restant())}</b></span>`
      : actif() ? `<span>jusqu’au ${t(c.cloture.replace(/ à .*/, ''))}</span><span>encore <b data-countdown-court>${decompteCourt(restant())}</b></span>`
      : fige() ? `<span>clos le ${t(jourMois(c.fin))}</span>` : termine() ? `<span>terminé le ${t(jourMois(c.fin))}</span>` : '';
    box.innerHTML = `${statut() === 'brouillon' ? '<p class="df-notice">Brouillon · Ce défi est visible uniquement par l’administration.</p>' : statut() === 'annule' ? '<p class="df-notice">Ce défi a été annulé. Les participations sont fermées.</p>' : enPause() ? `<p class="df-notice is-pause" role="status">${icon('pause')}<span><b>Participations en pause.</b> L’équipe de Vysora a suspendu les nouvelles participations ; elles reprendront dès que possible. Vous pouvez toujours jouer et voter.</span></p>` : ''}
      <div class="df-top-head"><p class="kicker">${icon('trophy')}Défi de la semaine ${c.semaine}</p><div class="df-top-links">${statut() === 'brouillon' ? '' : `<button class="df-prev-link df-share-btn" type="button" data-share-defi>${icon('share')}<span>Partager</span></button>`}<a class="df-prev-link" href="#precedents">${icon('history')}Défis précédents</a></div></div>
      <div class="df-top-main">
        <div class="df-top-copy">
          <h1 id="df-titre" class="df-title">${t(c.titre)}</h1>
          <p class="df-dates"><span class="df-status is-${statut()}">${statutLabel()}</span>${echeance}</p>
          ${c.definition ? `<p class="df-definition">${icon('bulb')}<span>${t(c.definition)}</span></p>` : ''}
          <p class="df-lead">${t(c.enonce)}</p>
        </div>
        <div class="df-top-action">${action(liste)}</div>
      </div>
      ${brief()}`;
  }

  /* Participer en trois étapes ---------------------------------------- */
  function renderRules() {
    const el = $('[data-rules]');
    const show = !prive() && (actif() || aVenir());
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    const c = C(), f = F(), max = maxPrompts();
    const premiere = max === 1 ? ['Écrivez votre prompt', 'Un seul, dans l’outil d’IA de votre choix.'] : max ? ['Échangez avec l’IA', `${max}${nb}prompts au plus.`] : ['Échangez avec l’IA', 'Gardez vos prompts dans l’ordre.'];
    el.innerHTML = `<div class="df-howto"><div class="df-howto-head"><h2 id="df-etapes-titre">Participer en trois étapes</h2>${enPause() ? `<p class="df-howto-note">${icon('pause')}Participations en pause</p>` : ouvert() && !mine() ? `<button class="btn btn-primary" type="button" data-participer>Participer au défi${icon('arrow')}</button>` : ouvert() ? `<button class="btn btn-inverse" type="button" data-participer>Voir ma participation${icon('arrow')}</button>` : `<p class="df-howto-note">${icon('calendar')}Ouverture le ${t(c.ouverture)}</p>`}</div><ol class="df-steps">${[premiere, f.etape2, ['Faites voter la communauté', 'Les votes « Utile » font le classement.']].map(([titre, texte], i) => `<li><span class="df-step-n" aria-hidden="true">${i + 1}</span><div><b>${titre}</b><p>${t(texte)}</p></div></li>`).join('')}</ol></div>`;
  }

  /* Participations ---------------------------------------------------- */
  function renderHead() {
    $('[data-entries-icon]').innerHTML = icon(F().icKicker, 'icon');
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === vue)));
  }
  function renderFilters() {
    const outils = ['Tous', ...new Set(participations().map(e => e.outil))];
    if (!outils.includes(state.tool)) state.tool = 'Tous';
    $('[data-filters]').innerHTML = outils.map(name => `<button type="button" data-tool="${esc(name)}" aria-pressed="${state.tool === name}">${name === 'Tous' ? '' : V.logo(name)}${t(name)}</button>`).join('');
  }
  function liste() {
    if (settings.donnees === 'aucun') return [];
    const l = participations().filter(e => (state.tool === 'Tous' || e.outil === state.tool) && V.normalize(`${e.titre} ${e.m} ${e.outil} ${e.idee}`).includes(V.normalize(state.q)));
    return l.sort(state.sort === 'recent' ? (a, b) => b.date.localeCompare(a.date) : state.sort === 'court' ? (a, b) => a.chemin.length - b.chemin.length || a.essais - b.essais || parRang(a, b) : parRang);
  }
  function card(e) {
    const r = rang(e), f = F();
    const classe = actif() || termine();
    const top = classe && r <= 3;
    const showRank = classe && (top || state.sort === 'useful');
    const label = `${f.lancer} ${t(e.titre)}${showRank ? `, ${place(r)}` : ''}`;
    const medaille = showRank ? `<span class="df-medal${r === 1 ? ' is-1' : ''}" aria-hidden="true">${r === 1 ? icon('crown') : ''}${r}</span>` : '';
    if (vue === 'liste') {
      return `<article class="df-row${e.moi ? ' is-mine' : ''}${top ? ` is-top is-top-${r}` : ''}" data-entry="${esc(e.id)}">
        <span class="df-row-rank" aria-hidden="true">${medaille}</span>
        <button class="df-row-media is-${e.resultat.type}" type="button" data-play="${esc(e.id)}" aria-label="${label}">${visuel(e, { lignes: 5 })}${medaille ? `<span class="df-row-medal">${medaille}</span>` : ''}</button>
        <div class="df-row-copy"><h3><button class="df-title-button" type="button" data-play="${esc(e.id)}">${t(e.titre)}</button>${e.moi ? ' <span class="df-row-tag">Votre participation</span>' : nouveau(e) ? ' <span class="df-row-tag is-new">Nouveau</span>' : ''}</h3><p>${t(e.idee)}</p>
          <div class="df-row-meta">${avatarDe(e, 20)}<b>${t(e.m)}</b>${outil(e)}<span class="df-row-path">${icon(e.chemin.length > 1 ? 'type-iteration' : 'type-prompt')}${chemin(e)}</span></div></div>
        ${voteButton(e)}
      </article>`;
    }
    return `<article class="df-game${e.moi ? ' is-mine' : ''}${top ? ` is-top is-top-${r}` : ''}" data-entry="${esc(e.id)}">
      <button class="df-game-cover is-${e.resultat.type}" type="button" data-play="${esc(e.id)}" aria-label="${label}">${visuel(e)}${showRank ? `<span class="df-game-rank${r === 1 ? ' is-1' : ''}" aria-hidden="true">${r === 1 ? icon('crown') : ''}${r}</span>` : ''}${e.moi ? '<span class="df-game-tag is-mine" aria-hidden="true">Votre participation</span>' : nouveau(e) ? '<span class="df-game-tag" aria-hidden="true">Nouveau</span>' : ''}<span class="df-game-play" aria-hidden="true">${icon(f.icone)}${f.action}</span></button>
      <div class="df-game-copy">
        <h3><button class="df-title-button" type="button" data-play="${esc(e.id)}">${t(e.titre)}</button></h3>
        <p class="df-game-idea">${t(e.idee)}</p>
        <div class="df-game-meta">${avatarDe(e, 24)}<span class="df-game-author">${t(e.m)}</span>${outil(e)}</div>
        <div class="df-game-foot">${voteButton(e)}<span class="df-game-tries">${icon(e.chemin.length > 1 ? 'type-iteration' : 'type-prompt')}${chemin(e)}</span></div>
      </div></article>`;
  }
  function renderEntries(animate = false) {
    const previous = new Map($$('[data-entry]').map(el => [el.dataset.entry, el.getBoundingClientRect()]));
    const l = liste(), f = F();
    state.ordre = l.map(e => e.id);
    const total = participations().length;
    const sel = $('[data-selection]');
    const hideTools = indisponible() || aVenir() || settings.donnees === 'vide' || prive();
    $('.df-toolbar').hidden = hideTools;
    if (prive() || indisponible()) sel.textContent = 'Les participations ne sont pas disponibles.';
    else if (aVenir()) sel.textContent = `Elles apparaîtront ici dès le ${C().ouverture}.`;
    else if (!total) sel.textContent = 'Aucune participation pour l’instant.';
    else sel.textContent = l.length === total ? `${total} ${total > 1 ? f.des : f.un}` : `${l.length} sur ${total}`;
    const grid = $('[data-entries]');
    grid.className = `df-grid is-${f.cle}${vue === 'liste' ? ' is-list' : ''}`;
    const montrees = l.slice(0, Math.max(PAS, state.limite));
    grid.innerHTML = l.length ? montrees.map(card).join('')
      : prive() || indisponible() ? notice('Participations indisponibles', 'Consultez les défis précédents et leurs résultats.')
      : aVenir() ? notice('Les participations ouvrent bientôt', `Rendez-vous le ${C().ouverture} : chaque participation s’affichera ici avec son prompt.`)
      : !total ? notice('La première participation sera peut-être la vôtre', 'Lisez les règles, écrivez votre prompt et publiez le résultat en quelques minutes.', ouvert() ? `<button class="btn btn-primary" type="button" data-participer>Participer au défi${icon('arrow')}</button>` : '')
      : `<div class="df-empty"><h3>Aucune participation trouvée</h3><p>Essayez un autre outil ou élargissez votre recherche.</p><button class="btn btn-secondary" type="button" data-clear>Réinitialiser les filtres</button></div>`;
    $('[data-results-status]').textContent = `${montrees.length} participations affichées sur ${l.length}.`;
    const plus = $('[data-more]'), reste = l.length - montrees.length;
    plus.hidden = l.length <= PAS;
    plus.innerHTML = l.length <= PAS ? '' : `<p>${montrees.length}${nb}sur ${l.length}</p><div class="df-more-actions">${reste > 0 ? `<button class="btn btn-secondary" type="button" data-more-next>${reste > PAS ? `Afficher ${PAS} de plus` : `Afficher ${reste > 1 ? `les ${reste} dernières` : 'la dernière'}`}${icon('chevron-down')}</button>` : ''}${montrees.length > PAS ? `<button class="btn btn-quiet" type="button" data-more-less>Réduire${icon('chevron-down')}</button>` : ''}</div>`;
    $('.df-list-foot').hidden = !total || prive() || indisponible();
    bump.clear();
    if (animate && V.motion.full()) $$('[data-entry]').forEach((el, i) => {
      const old = previous.get(el.dataset.entry), now = el.getBoundingClientRect();
      el.animate(old ? [{ transform: `translate(${old.x - now.x}px, ${old.y - now.y}px)` }, { transform: 'none' }] : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: old ? 0 : i * 35, easing: 'cubic-bezier(0.2,0,0,1)' });
    });
  }

  /* Défis précédents -------------------------------------------------- */
  function renderArchives() {
    const passes = D.archives.filter(d => d.semaine !== C().semaineRemplacee);
    $('[data-archives]').innerHTML = `<ol class="df-cal">${passes.map(d => `<li class="df-cal-item"><div class="df-cal-when"><b>Semaine ${d.semaine}</b><span>Du ${V.dateLabel(d.start, false)} au ${V.dateLabel(d.end)}</span></div><div class="df-cal-copy"><h3>${t(d.title)}</h3><p class="df-person">${icon('trophy')}${V.avatar(d.entries[0].m, 22)}<span>1re${nb}place · ${t(d.entries[0].m)} · ${d.count}${nb}participations</span></p></div><button class="df-text-btn" type="button" data-archive="${esc(d.id)}">Voir les résultats${icon('arrow')}</button></li>`).join('')}</ol>`;
  }
  function openArchive(id, origin) {
    const d = D.archives.find(item => item.id === id);
    if (!d) return;
    state.origin = origin;
    $('[data-dialog-body]', archiveDialog).innerHTML = `<header class="df-archive-heading"><p class="df-modal-eyebrow">Semaine ${d.semaine} · du ${V.dateLabel(d.start, false)} au ${V.dateLabel(d.end)}</p><h2 id="df-dialog-title">${t(d.title)}</h2><div class="df-archive-summary"><span>${icon('users')}<strong>${d.count}</strong> participations</span><span>${icon('lock')}Classement définitif</span></div></header>
      <div class="df-palmares-layout"><section class="df-palmares" aria-labelledby="df-palmares-title"><div class="df-modal-section-head"><h3 id="df-palmares-title">Le palmarès</h3><span>Les ${d.entries.length} premières places</span></div><ol class="df-results">${d.entries.map((e, i) => `<li><span class="df-rank" aria-label="${place(i + 1)}">${String(i + 1).padStart(2, '0')}</span><div class="df-result-copy"><h4>${t(e.title)}</h4><div class="df-result-author">${V.avatar(e.m, 24)}<span>${t(e.m)}</span></div><span class="df-tool">${V.logo(e.tool)}${t(e.tool)}${e.model ? ` · ${t(e.model)}` : ''}</span></div><span class="df-result-score"><b>${e.n}</b><span>Utile</span></span></li>`).join('')}</ol></section>
      <aside class="df-archive-brief"><p class="kicker">${icon('check-circle')}Les règles</p><h3>${t(d.theme)}</h3><ul>${d.rules.map(r => `<li>${icon('check')}${t(r)}</li>`).join('')}</ul></aside></div>`;
    V.fixTypography(archiveDialog);
    archiveDialog.showModal();
    archiveDialog.scrollTop = 0;
    $('[data-close]', archiveDialog).focus();
  }

  /* Vue d'une participation (plein écran) ------------------------------- */
  /* Le jeu d'un membre ne s'exécute jamais dans la page : cadre sandbox sans allow-same-origin
     (origine opaque : ni cookies, ni stockage, ni accès à la page), politique de sécurité qui coupe
     tout accès au réseau, mémoire de session à la place du stockage du navigateur. */
  const CSP_JEU = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; worker-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  const MEMOIRE = "(function(){function M(){var d=Object.create(null);return{getItem:function(k){k=String(k);return k in d?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d=Object.create(null)},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:M(),configurable:true})}catch(_){}}})})();";
  const ENTETE = `<meta http-equiv="Content-Security-Policy" content="${CSP_JEU}"><script>${MEMOIRE}<\/script>`;
  function isoler(html) {
    const head = /<head(\s[^>]*)?>/i, html_ = /<html(\s[^>]*)?>/i, doctype = /^\s*<!doctype[^>]*>/i;
    if (head.test(html)) return html.replace(head, m => m + ENTETE);
    if (html_.test(html)) return html.replace(html_, m => `${m}<head>${ENTETE}</head>`);
    const d = html.match(doctype);
    return d ? d[0] + ENTETE + html.slice(d[0].length) : ENTETE + html;
  }
  function cadre(html, titre) {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
    f.setAttribute('referrerpolicy', 'no-referrer');
    f.title = titre;
    f.srcdoc = isoler(html);
    f.addEventListener('load', () => { if (f.isConnected) f.focus(); }, { once: true });
    return f;
  }
  const codes = new Map();
  async function codeDe(e) {
    if (e.resultat.html) return e.resultat.html;
    if (codes.has(e.id)) return codes.get(e.id);
    const reponse = await fetch(e.resultat.fichier);
    if (!reponse.ok) throw new Error('jeu');
    const html = await reponse.text();
    codes.set(e.id, html);
    return html;
  }
  function openPlayer(id, origin) {
    if (!trouver(id)) return;
    if (!player.open) state.origin = origin || document.activeElement;
    state.playing = id;
    state.zoom = false;
    renderPlayer();
    if (!player.open) player.showModal();
    ($('[data-launch]', player) || $('[data-vote]', player) || $('[data-close]', player))?.focus({ preventScroll: true });
  }
  function scene(e) {
    const r = e.resultat;
    if (r.type === 'jeu') return `<div class="df-stage" data-stage><button class="df-stage-launch" type="button" data-launch="${esc(e.id)}">${visuel(e, { tot: true })}<span class="df-stage-cta"><span class="df-stage-play" aria-hidden="true">${icon('play', 'icon')}</span><span>Lancer la partie</span></span></button></div>
      <div class="df-stage-tools">${document.fullscreenEnabled ? `<button class="df-stage-btn" type="button" data-fullscreen>${icon('expand')}Plein écran</button>` : ''}<p class="df-isolation">${icon('shield')}<span>Jeu isolé du site, sans accès à Internet</span></p></div>`;
    if (r.type === 'image') return `<div class="df-stage df-stage-image${state.zoom ? ' is-zoomed' : ''}" data-stage>${r.affiche ? affiche(r, ' is-large') : `<img src="${esc(r.image)}" alt="${t(r.alt)}" decoding="async">`}</div>
      <div class="df-stage-tools">${r.affiche ? '' : `<button class="df-stage-btn" type="button" data-zoom aria-pressed="${state.zoom}">${icon(state.zoom ? 'minus' : 'expand')}${state.zoom ? 'Ajuster à l’écran' : 'Taille réelle'}</button>`}${document.fullscreenEnabled ? `<button class="df-stage-btn" type="button" data-fullscreen>${icon('scan')}Plein écran</button>` : ''}<p class="df-isolation">${icon('image')}<span>${t(r.alt)}</span></p></div>`;
    const lignes = r.code.replace(/\n$/, '').split('\n');
    return `<div class="df-stage df-stage-code" data-stage><div class="df-code-head"><span>${icon('file-code')}<b>${t(r.nom)}</b><small>${t(r.langage)} · ${lignes.length}${nb}lignes</small></span><button class="df-stage-btn" type="button" data-copy-code="${esc(e.id)}" aria-label="Copier le code de ${t(r.nom)}">${icon('copy')}<span>Copier</span></button></div><pre tabindex="0" aria-label="Code de ${t(r.nom)}"><code>${lignes.map(l => `<span>${esc(l) || ' '}</span>`).join('')}</code></pre></div>
      <div class="df-stage-tools"><p class="df-isolation">${icon('shield')}<span>Lisez le code avant de l’exécuter, de préférence sur une copie de vos fichiers.</span></p></div>`;
  }
  function renderPlayer() {
    const e = trouver(state.playing);
    if (!e) return;
    $('[data-player-name]').textContent = C().titre;
    player.className = `df-viewer is-${e.resultat.type}`;
    const r = rang(e);
    const eyebrow = fige() ? place(r) : termine() ? `${place(r)}, avant la clôture` : actif() ? `${place(r)} pour l’instant` : 'Participation';
    const actions = e.moi && actif() ? `${ouvert() ? `<button class="btn btn-secondary btn-sm" type="button" data-modifier>${icon('pen')}Modifier</button>` : ''}<button class="btn btn-quiet btn-sm df-danger-text" type="button" data-supprimer>${icon('x')}Supprimer</button>` : '';
    $('[data-player-body]').innerHTML = `
      <div class="df-viewer-stage">${scene(e)}</div>
      <div class="df-viewer-info">
        <p class="df-player-eyebrow">${e.moi ? `Votre participation · ${eyebrow}` : eyebrow}</p>
        <h2 id="df-player-title">${t(e.titre)}</h2>
        <div class="df-author-line">${avatarDe(e, 36)}<div><strong>${t(e.moi ? `${e.m} (vous)` : e.m)}</strong><span>Publiée le ${dateHeure(e.date)}${e.modifiee ? ' · modifiée' : ''}</span></div></div>
        <div class="df-viewer-actions">${e.moi ? `<span class="df-vote-stat">${icon('utile')}<b>${useful(e)}</b> vote${useful(e) > 1 ? 's' : ''} « Utile »</span>` : voteButton(e, true)}<button class="btn btn-secondary btn-sm" type="button" data-share="${esc(e.id)}">${icon('link')}<span>Copier le lien</span></button>${actions}</div>
${!e.moi && !actif() ? '        <p class="df-vote-note">Les votes du défi sont clos.</p>\n' : ''}        <p class="df-player-idea">${t(e.idee)}</p>
        <dl class="df-player-facts"><div><dt>Outil</dt><dd>${outil(e)}</dd></div><div><dt>Le chemin</dt><dd>${icon(e.chemin.length > 1 ? 'type-iteration' : 'type-prompt')}${chemin(e)}</dd></div></dl>
        <section class="df-prompt" aria-labelledby="df-prompt-title"><h3 id="df-prompt-title">${e.chemin.length > 1 ? 'Les prompts, dans l’ordre' : 'Le prompt'}</h3>
          <ol class="df-path">${e.chemin.map((x, k) => `<li><div class="df-path-head">${e.chemin.length > 1 ? `<span class="df-path-n">${k + 1}</span>` : '<span class="df-path-label">Envoyé tel quel à l’IA</span>'}<button class="df-copy-button" type="button" data-copy="${esc(e.id)}" data-index="${k}" aria-label="Copier le prompt ${k + 1}">${icon('copy')}<span>Copier</span></button></div><blockquote>${t(x.prompt)}</blockquote>${x.moment ? `<p class="df-moment">${icon('moment')}<span><b>Moment clé</b>${t(x.moment)}</span></p>` : ''}</li>`).join('')}</ol>
          <p class="df-copy-status sr-only" role="status" data-copy-status></p></section>
      </div>`;
    V.fixTypography($('[data-player-body]'));
    $('.df-viewer-info', player).scrollTop = 0;
  }
  async function lancer() {
    const e = trouver(state.playing);
    const stage = $('[data-stage]', player);
    if (!e || !stage) return;
    stage.innerHTML = `<p class="df-stage-msg">${icon('gamepad')}Chargement du jeu…</p>`;
    try {
      const html = await codeDe(e);
      if (!stage.isConnected || state.playing !== e.id) return;
      stage.replaceChildren(cadre(html, `Jeu : ${e.titre}`));
    } catch {
      stage.innerHTML = `<div class="df-stage-msg"><p>${icon('alert')}Ce jeu n’a pas pu être chargé.</p><button class="btn btn-inverse btn-sm" type="button" data-launch="${esc(e.id)}">Réessayer</button></div>`;
    }
  }
  const lien = id => `${location.origin}${location.pathname}?participation=${encodeURIComponent(id)}`;
  async function partagerDefi(bouton) {
    const c = C(), url = `${location.origin}${location.pathname}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${c.titre} · Défi Vysora`, text: `Défi de la semaine sur Vysora : « ${c.titre} ». ${c.enonce}`, url }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    copier(url, 'Lien du défi copié.', bouton);
  }
  async function copier(texte, ok, bouton) {
    try {
      await navigator.clipboard.writeText(texte);
      if (bouton?.isConnected) { const s = $('span', bouton); if (s) s.textContent = 'Copié'; }
      V.toast(ok);
      return true;
    } catch {
      V.toast('La copie automatique est indisponible sur cet appareil.', 'alert');
      return false;
    }
  }

  /* Participer, modifier, supprimer -------------------------------------- */
  function participate(origin) {
    if (aVenir()) { V.toast(`Les participations ouvrent le ${C().ouverture}.`, 'calendar'); return; }
    if (!ouvert()) { V.toast(enPause() ? 'Les participations sont en pause pour ce défi.' : 'Les participations sont fermées pour ce défi.', 'lock'); return; }
    if (!V.exiger('contribuer', 'participer au défi')) return;
    if (mine()) { openPlayer(maParticipation().id, origin); return; }
    if (settings.quota === 'atteint' && Number.isFinite(V.etats.limite('creations'))) { V.toast(`Votre limite de ${V.etats.limite('creations')} publications par 24${nb}h est atteinte. Réessayez demain.`, 'clock'); return; }
    openForm(origin, false);
  }
  function supprimer(origin) {
    state.origineConfirm = origin;
    confirmDialog.showModal();
    $('[data-close]', confirmDialog).focus();
  }
  function confirmerSuppression() {
    publiee = null;
    confirmDialog.close();
    if (player.open) player.close();
    V.regler('participation', 'aucune');
    V.toast('Votre participation est supprimée.');
    $('.df-top-action [data-participer]')?.focus({ preventScroll: true });
  }

  const champ = ({ id, label, aide = '', facultatif = false, html }) => `<div class="df-field" data-field="${id}"><label class="df-label" for="df-${id}">${label}${facultatif ? ' <span>(facultatif)</span>' : ''}</label>${html}${aide ? `<p class="df-help" id="df-${id}-aide">${aide}</p>` : ''}<p class="df-error" id="df-${id}-erreur" hidden></p></div>`;
  const promptHTML = (k, valeur = '') => `<li class="df-prompt-field" data-prompt-item><div class="df-prompt-field-head"><label class="df-label" for="df-prompt-${k}">${maxPrompts() === 1 ? 'Le prompt envoyé' : `Prompt ${k + 1}`}</label>${k > 0 ? `<button class="df-link-btn" type="button" data-prompt-remove aria-label="Retirer le prompt ${k + 1}">${icon('x')}Retirer</button>` : ''}</div><textarea id="df-prompt-${k}" name="prompt" rows="${maxPrompts() === 1 ? 6 : 4}" maxlength="100000">${esc(valeur)}</textarea></li>`;
  function formHTML() {
    const c = C(), f = F(), max = maxPrompts();
    const outils = Object.keys(D.outils);
    const resultat = f.cle === 'jeu' ? '<div data-file-zone></div>'
      : f.cle === 'image' ? `<div data-image-zone></div>${champ({ id: 'alt', label: 'Description de l’image', aide: 'Ce que montre l’image, pour les personnes qui ne la voient pas.', html: '<textarea id="df-alt" name="alt" rows="2" maxlength="500"></textarea>' })}`
      : `<div class="df-row2 is-code">${champ({ id: 'nom', label: 'Nom du fichier', html: '<input type="text" id="df-nom" name="nom" maxlength="120" autocomplete="off" spellcheck="false" placeholder="ranger.py">' })}</div>${champ({ id: 'code', label: 'Le code obtenu', aide: 'Tel que l’IA l’a écrit. 200 000 caractères au plus.', html: '<textarea id="df-code" class="df-code" name="code" rows="10" maxlength="200000" spellcheck="false"></textarea>' })}`;
    return `<form class="df-form" novalidate data-form>
      <header class="df-form-head"><h2 id="df-form-title">${state.modifier ? 'Modifier votre participation' : 'Votre participation'}</h2>${state.modifier ? '<p>Les votes reçus sont conservés.</p>' : ''}</header>
      <div class="df-form-alert" role="alert" data-form-alert hidden></div>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">1</span>${max === 1 ? 'Votre prompt' : 'Vos prompts'}</legend>
        <div class="df-row2">
          ${champ({ id: 'outil', label: 'Outil d’IA', html: `<div class="df-select"><select id="df-outil" name="outil"><option value="">Choisir l’outil</option>${outils.map(o => `<option>${esc(o)}</option>`).join('')}</select>${icon('chevron-down')}</div>` })}
          ${champ({ id: 'modele', label: 'Modèle', facultatif: true, aide: 'Dans la liste, ou tel que l’outil l’affiche.', html: '<input type="text" id="df-modele" name="modele" list="df-modeles" maxlength="100" autocomplete="off" spellcheck="false" aria-describedby="df-modele-aide" placeholder="Choisissez d’abord l’outil"><datalist id="df-modeles"></datalist>' })}
        </div>
        <div class="df-field" data-field="prompt"><ol class="df-prompts" data-prompts>${promptHTML(0)}</ol>
          <p class="df-help" id="df-prompt-aide">${max === 1 ? 'Le message exact, en entier. Un seul prompt est admis pour ce défi.' : `Dans l’ordre, tels que vous les avez envoyés${max ? ` : ${max}${nb}prompts au plus pour ce défi` : ''}.`}</p>
          ${max === 1 ? '' : `<button class="df-add" type="button" data-prompt-add>${icon('plus')}Ajouter le prompt suivant</button>`}
          <p class="df-error" id="df-prompt-erreur" hidden></p></div>
        ${max === 1 ? `<div class="df-field" role="radiogroup" aria-labelledby="df-essais-label" data-field="essais"><p class="df-label" id="df-essais-label">Le résultat publié est</p>
          <div class="df-choices"><label class="df-choice"><input type="radio" name="essais" value="1" checked><span>Le premier que l’IA a livré</span></label><label class="df-choice"><input type="radio" name="essais" value="plusieurs"><span>Le meilleur de plusieurs essais</span></label></div>
          <div class="df-tries" data-tries hidden><label for="df-nombre">Nombre d’essais</label><input type="number" id="df-nombre" name="nombre" min="2" max="20" value="3" inputmode="numeric"></div></div>` : ''}
      </fieldset>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">2</span>${f.resultat}</legend>${resultat}</fieldset>
      <fieldset class="df-fs"><legend><span class="df-fs-n" aria-hidden="true">3</span>Sa présentation</legend>
        ${champ({ id: 'titre', label: 'Titre', aide: 'De 10 à 120 caractères.', html: '<input type="text" id="df-titre-part" name="titre" maxlength="120" autocomplete="off">' }).replace('for="df-titre"', 'for="df-titre-part"')}
        ${champ({ id: 'idee', label: 'Votre idée en une phrase', html: '<textarea id="df-idee" name="idee" rows="3" maxlength="1000"></textarea>' })}
        ${f.cle === 'jeu' ? '<div class="df-field" data-field="couverture"><p class="df-label" id="df-couverture-label">Image de couverture <span>(facultatif)</span></p><div data-cover-zone></div><p class="df-error" id="df-couverture-erreur" hidden></p></div>' : ''}
      </fieldset>
      <footer class="df-form-foot"><p>${icon('check-circle')}<span>En publiant, vous confirmez que votre participation respecte les règles du défi.</span></p><div class="df-form-actions"><button type="button" class="btn btn-secondary" data-close>Annuler</button><button type="submit" class="btn btn-primary">${state.modifier ? 'Enregistrer les modifications' : 'Publier ma participation'}</button></div></footer>
    </form>`;
  }
  function majPrompts() {
    const items = $$('[data-prompt-item]', formDialog), max = maxPrompts();
    items.forEach((li, k) => {
      $('label', li).textContent = max === 1 ? 'Le prompt envoyé' : `Prompt ${k + 1}`;
      $('label', li).htmlFor = $('textarea', li).id = `df-prompt-${k}`;
      $('[data-prompt-remove]', li)?.setAttribute('aria-label', `Retirer le prompt ${k + 1}`);
    });
    const add = $('[data-prompt-add]', formDialog);
    if (add) add.hidden = Boolean(max && items.length >= max);
  }
  const ko = octets => `${Math.max(1, Math.round(octets / 1024))}${nb}Ko`;
  /* Contrôle d'un jeu avant publication. L'API refait les mêmes contrôles ; les points bloquants
     refusent le fichier, les autres préviennent (le cadre isolé les neutralise de toute façon). */
  function controler(nom, code) {
    const motif = /(?:\b(?:src|href|action|poster|data)\s*=\s*["']?\s*|url\(\s*["']?|@import\s+(?:url\(\s*)?["']?|\b(?:fetch|import)\s*\(\s*["'`]|\bfrom\s+["'`]|new\s+(?:WebSocket|EventSource)\s*\(\s*["'`])((?:https?:|wss?:)?\/\/[^\s"'`)<>]+)/gi;
    const hotes = new Set();
    for (const m of code.matchAll(motif)) { try { hotes.add(new URL(m[1], 'https://exemple.invalid').host); } catch { /* adresse illisible */ } }
    const html = /\.html?$/i.test(nom) && /<(html|head|body|script|canvas|svg|div|main)\b/i.test(code) && code.length <= 200000 && code.trim().length > 0;
    const motDePasse = /<input[^>]*type\s*=\s*["']?password|autocomplete\s*=\s*["']?(current|new)-password/i.test(code);
    const minage = /coinhive|coin-hive|cryptonight|cryptoloot|webminer|stratum\+tcp|minero\.cc/i.test(code);
    const fenetres = /\bwindow\.open\s*\(|\b(top|parent)\.location|\blocation\.(href|assign|replace)\s*(=|\()\s*["'`]https?:/i.test(code);
    const masque = /\b(eval|Function)\s*\(\s*(atob|unescape|decodeURIComponent|String\.fromCharCode)\s*\(/i.test(code) || /["'`](?![^"'`]{0,40}data:)[A-Za-z0-9+/=]{4000,}["'`]/.test(code);
    const lignes = [
      { etat: html ? 'ok' : 'non', libelle: 'Une page HTML de 200 000 caractères au plus', detail: html ? '' : 'Choisissez un fichier .html qui contient la page du jeu.' },
      { etat: motDePasse ? 'non' : 'ok', libelle: 'Aucun champ de mot de passe', detail: motDePasse ? 'Un jeu ne peut pas demander de mot de passe : ce fichier est refusé.' : '' },
      { etat: minage ? 'non' : 'ok', libelle: 'Aucun code de minage de cryptomonnaie', detail: minage ? 'Ce fichier contient du code de minage : il est refusé.' : '' },
      { etat: hotes.size ? 'attention' : 'ok', libelle: 'Aucun appel à Internet', detail: hotes.size ? `Appels vers ${[...hotes].slice(0, 3).join(', ')}${hotes.size > 3 ? '…' : ''} : ils seront bloqués, vérifiez que le jeu marche sans eux.` : '' },
      { etat: fenetres ? 'attention' : 'ok', libelle: 'Aucune ouverture de fenêtre ni redirection', detail: fenetres ? 'Elles seront bloquées sur Vysora.' : '' },
      { etat: masque ? 'attention' : 'ok', libelle: 'Un code lisible', detail: masque ? 'Une partie du code est masquée : la modération pourra la vérifier avant de la laisser jouer.' : '' }
    ];
    return { nom, code, taille: new Blob([code]).size, lignes, bloque: lignes.some(l => l.etat === 'non') };
  }
  function renderFileZone() {
    const zone = $('[data-file-zone]', formDialog);
    if (!zone) return;
    const f = state.fichier;
    const ICONES = { ok: 'check-circle', attention: 'alert', non: 'x' };
    zone.innerHTML = f ? `<div class="df-file"><span class="df-file-icon">${icon('file-code', 'icon')}</span><div class="df-file-name"><b>${t(f.nom)}</b><span>${ko(f.taille)} · page HTML</span></div><div class="df-file-actions"><label class="df-link-btn">Remplacer<input type="file" accept=".html,.htm,text/html" class="sr-only" data-file-input></label><button class="df-link-btn" type="button" data-file-remove>Retirer</button></div></div>
        <div class="df-check${f.bloque ? ' is-blocked' : ''}" role="group" aria-label="Contrôle du fichier"><p class="df-check-head">${icon('shield')}<b>Contrôle du fichier</b><span>${f.bloque ? 'Refusé' : f.lignes.some(l => l.etat === 'attention') ? 'Accepté, avec des points d’attention' : 'Accepté'}</span></p><ul>${f.lignes.map(l => `<li class="is-${l.etat}">${icon(ICONES[l.etat])}<span><b>${t(l.libelle)}</b>${l.detail ? `<small>${t(l.detail)}</small>` : ''}</span></li>`).join('')}</ul></div>
        ${f.bloque ? '' : `<div class="df-test" data-test><button class="df-test-launch" type="button" data-test-launch>${icon('play')}Essayer le jeu ici</button></div>`}`
      : `<div class="df-drop" data-drop data-drop-kind="html"><span class="df-drop-icon">${icon('upload', 'icon')}</span><p><b>Déposez le fichier HTML du jeu</b><span>ou</span></p><label class="btn btn-secondary btn-sm">Choisir un fichier<input type="file" accept=".html,.htm,text/html" class="sr-only" data-file-input aria-describedby="df-fichier-aide df-fichier-erreur"></label><p class="df-help" id="df-fichier-aide">Un seul fichier .html, 200 000 caractères au plus. Il est contrôlé avant publication.</p></div>
        <p class="df-error" id="df-fichier-erreur" hidden></p>
        <details class="df-paste"><summary>Coller le code à la place</summary><textarea class="df-code" rows="7" spellcheck="false" aria-label="Code HTML du jeu" placeholder="&lt;!doctype html&gt;…" data-paste></textarea><button class="btn btn-secondary btn-sm" type="button" data-paste-use>Utiliser ce code</button></details>`;
  }
  function renderImageZone() {
    const zone = $('[data-image-zone]', formDialog);
    if (!zone) return;
    const im = state.image;
    zone.innerHTML = im ? `<div class="df-file is-image"><img class="df-file-thumb" src="${im.src}" alt=""><div class="df-file-name"><b>${t(im.nom)}</b><span>${im.taille ? `${ko(im.taille)} · ` : ''}image</span></div><div class="df-file-actions"><label class="df-link-btn">Remplacer<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" data-image-input></label><button class="df-link-btn" type="button" data-image-remove>Retirer</button></div></div>`
      : `<div class="df-drop" data-drop data-drop-kind="image"><span class="df-drop-icon">${icon('image', 'icon')}</span><p><b>Déposez l’image obtenue</b><span>ou</span></p><label class="btn btn-secondary btn-sm">Choisir une image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" data-image-input aria-describedby="df-image-aide df-image-erreur"></label><p class="df-help" id="df-image-aide">PNG, JPEG, WebP ou GIF, 5 Mo au plus.</p></div><p class="df-error" id="df-image-erreur" hidden></p>`;
  }
  function renderCoverZone() {
    const zone = $('[data-cover-zone]', formDialog);
    if (!zone) return;
    zone.innerHTML = state.couverture
      ? `<div class="df-cover-pick"><img src="${state.couverture}" alt="Couverture choisie"><button class="df-link-btn" type="button" data-cover-remove>Retirer l’image</button></div>`
      : `<div class="df-cover-pick"><label class="btn btn-secondary btn-sm">${icon('image')}Ajouter une image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" data-cover-input aria-labelledby="df-couverture-label"></label><p class="df-help">Une capture du jeu, de préférence en 16:9. Sans image, sa carte affiche son titre.</p></div>`;
  }
  function erreurChamp(id, message) {
    const el = $(`#df-${id}-erreur`, formDialog);
    const field = $(`[data-field="${id}"]`, formDialog);
    if (el) { el.hidden = !message; el.innerHTML = message ? `${icon('alert')}<span>${t(message)}</span>` : ''; }
    field?.classList.toggle('is-invalid', Boolean(message));
    const inputs = id === 'titre' ? [$('#df-titre-part', formDialog)] : id === 'prompt' ? $$('[data-prompt-item] textarea', formDialog) : [$(`#df-${id}`, formDialog)];
    inputs.forEach(input => input?.setAttribute('aria-invalid', message ? 'true' : 'false'));
  }
  function chargerFichier(nom, code) {
    state.fichier = controler(nom, code);
    renderFileZone();
    erreurChamp('fichier', '');
    return !state.fichier.bloque;
  }
  function lire(file, comme, suite) {
    const reader = new FileReader();
    reader.onload = () => suite(String(reader.result));
    reader.onerror = () => V.toast('Ce fichier n’a pas pu être lu. Réessayez.', 'alert');
    reader[comme](file);
  }
  function lireFichier(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) { state.fichier = null; renderFileZone(); erreurChamp('fichier', 'Ce fichier dépasse 200 000 caractères : le jeu doit tenir dans un fichier plus léger.'); return; }
    lire(file, 'readAsText', code => { chargerFichier(file.name, code); ($('[data-test-launch]', formDialog) || $('[data-file-remove]', formDialog))?.focus(); });
  }
  function lireImage(file, cible) {
    if (!file) return;
    const id = cible === 'couverture' ? 'couverture' : 'image';
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { erreurChamp(id, 'Choisissez une image PNG, JPEG, WebP ou GIF.'); return; }
    if (file.size > 5 * 1024 * 1024) { erreurChamp(id, 'Cette image dépasse 5 Mo.'); return; }
    lire(file, 'readAsDataURL', src => {
      if (cible === 'couverture') { state.couverture = src; renderCoverZone(); } else { state.image = { src, nom: file.name, taille: file.size }; renderImageZone(); $('#df-alt', formDialog)?.focus(); }
      erreurChamp(id, '');
    });
  }
  /* Modèle : suggestions du référentiel pour l'outil choisi ; un modèle absent s'écrit librement
     (RG-14). La saisie en cours est gardée quand on change d'outil. */
  function majModeles(valeur) {
    const champ = $('#df-modele', formDialog), liste = $('#df-modeles', formDialog), o = $('#df-outil', formDialog).value;
    const modeles = D.outils[o] || [];
    liste.innerHTML = modeles.map(m => `<option value="${esc(m)}"></option>`).join('');
    if (valeur !== undefined) champ.value = valeur;
    champ.placeholder = !o ? 'Choisissez d’abord l’outil' : modeles.length ? `Par exemple : ${modeles[0]}` : 'Nom du modèle, s’il y en a un';
  }
  async function openForm(origin, modifier) {
    if (!formDialog.open) state.origin = origin || document.activeElement;
    state.modifier = modifier;
    state.fichier = null; state.image = null; state.couverture = null;
    $('[data-form-name]').textContent = C().titre;
    $('[data-form-body]').innerHTML = formHTML();
    renderFileZone(); renderImageZone(); renderCoverZone(); majPrompts();
    V.fixTypography($('[data-form-body]'));
    if (!formDialog.open) formDialog.showModal();
    formDialog.scrollTop = 0;
    const source = modifier ? maParticipation() : settings.formulaire !== 'vide' ? C().mienne : null;
    if (source) await remplir(source, modifier ? null : settings.formulaire);
    $(source ? 'button[type="submit"]' : '#df-outil', formDialog)?.focus();
  }
  async function remplir(m, variante) {
    const f = $('[data-form]', formDialog), r = m.resultat;
    f.outil.value = m.outil; majModeles(m.modele);
    m.chemin.forEach((x, k) => {
      if (k > 0) $('[data-prompts]', formDialog).insertAdjacentHTML('beforeend', promptHTML(k));
      $(`#df-prompt-${k}`, formDialog).value = x.prompt;
    });
    majPrompts();
    f.titre.value = m.titre;
    f.idee.value = m.idee;
    if (maxPrompts() === 1 && m.essais > 1) { f.essais.value = 'plusieurs'; $('[data-tries]', formDialog).hidden = false; f.nombre.value = m.essais; }
    if (r.type === 'image') { state.image = { src: r.image, nom: r.nom || 'image.webp' }; renderImageZone(); f.alt.value = r.alt; }
    if (r.type === 'code') { f.nom.value = r.nom; f.code.value = r.code; }
    if (r.type === 'jeu') {
      if (r.couverture?.startsWith('data:')) { state.couverture = r.couverture; renderCoverZone(); }
      try {
        let html = await codeDe(m);
        if (variante === 'externe') html = html.replace(/<head(\s[^>]*)?>/i, h => `${h}\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P">\n<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"><\/script>`);
        if (variante === 'suspect') html = html.replace(/<body(\s[^>]*)?>/i, b => `${b}\n<form id="session"><p>Votre session a expiré.</p><input type="email" placeholder="Adresse e-mail"><input type="password" placeholder="Mot de passe"><button>Reprendre la partie</button></form>`);
        chargerFichier(r.nom || 'jeu.html', html);
      } catch { /* exemple indisponible : le formulaire reste à compléter */ }
    }
  }
  function valider() {
    const f = $('[data-form]', formDialog), fmt = F().cle;
    const erreurs = [];
    const verifier = (id, message) => { erreurChamp(id, message); if (message) erreurs.push(id); };
    verifier('outil', f.outil.value ? '' : 'Choisissez l’outil d’IA utilisé.');
    const prompts = $$('[data-prompt-item] textarea', formDialog).map(x => x.value.trim());
    verifier('prompt', prompts.every(Boolean) ? '' : prompts.length > 1 ? 'Complétez chaque prompt, ou retirez ceux qui sont vides.' : 'Collez le prompt envoyé à l’IA.');
    if (fmt === 'jeu') verifier('fichier', !state.fichier ? 'Ajoutez le fichier HTML du jeu.' : state.fichier.bloque ? 'Ce fichier ne peut pas être publié : voyez le contrôle ci-dessus.' : '');
    if (fmt === 'image') {
      if (!state.image) verifier('image', 'Ajoutez l’image obtenue.');
      verifier('alt', f.alt.value.trim().length < 10 ? 'Décrivez l’image en quelques mots (10 caractères au moins).' : '');
    }
    if (fmt === 'code') {
      verifier('nom', /^[\w.\-() ]+\.[a-z0-9]{1,8}$/i.test(f.nom.value.trim()) ? '' : 'Indiquez le nom du fichier avec son extension, par exemple ranger.py.');
      verifier('code', f.code.value.trim() ? '' : 'Collez le code obtenu.');
    }
    const titre = f.titre.value.trim();
    verifier('titre', titre.length < 10 || titre.length > 120 ? 'Le titre compte de 10 à 120 caractères.' : '');
    const idee = f.idee.value.trim();
    verifier('idee', idee.length < 20 ? 'Décrivez votre idée en 20 caractères au moins.' : '');
    const nombre = Number(f.nombre?.value);
    if (f.essais?.value === 'plusieurs' && !(nombre >= 2 && nombre <= 20)) erreurs.push('essais');
    const alerte = $('[data-form-alert]', formDialog);
    alerte.hidden = !erreurs.length;
    alerte.innerHTML = erreurs.length ? `${icon('alert')}<span>${erreurs.length === 1 ? 'Un point reste à compléter avant de publier.' : `${erreurs.length} points restent à compléter avant de publier.`}</span>` : '';
    if (erreurs.length) {
      const p = erreurs[0];
      const cible = p === 'fichier' ? $('[data-file-input]', formDialog) || $('[data-file-remove]', formDialog) : p === 'image' ? $('[data-image-input]', formDialog) : p === 'titre' ? f.titre : p === 'essais' ? f.nombre : p === 'prompt' ? $$('[data-prompt-item] textarea', formDialog).find(x => !x.value.trim()) : f[p];
      cible?.focus();
      return null;
    }
    const resultat = fmt === 'jeu' ? { type: 'jeu', html: state.fichier.code, couverture: state.couverture, nom: state.fichier.nom }
      : fmt === 'image' ? { type: 'image', image: state.image.src, alt: f.alt.value.trim(), portrait: true, nom: state.image.nom }
      : { type: 'code', nom: f.nom.value.trim(), langage: langage(f.nom.value), code: f.code.value };
    return { outil: f.outil.value, modele: f.modele.value.trim(), chemin: prompts.map(prompt => ({ prompt })), titre, idee, essais: f.essais?.value === 'plusieurs' ? nombre : 1, resultat };
  }
  const langage = nom => ({ py: 'Python', ps1: 'PowerShell', sh: 'Bash', js: 'JavaScript', ts: 'TypeScript', json: 'JSON', html: 'HTML', css: 'CSS', sql: 'SQL', rb: 'Ruby', php: 'PHP' }[String(nom).split('.').pop().toLowerCase()] || 'Texte');
  function publier() {
    const v = valider();
    if (!v) return;
    const avant = state.modifier ? maParticipation() : null;
    publiee = avant ? { ...avant, ...v, defi: C().id, modifiee: maintenant().toISOString() } : { ...v, id: 'ma-participation', defi: C().id, m: V.nomMoi(), moi: true, n: 0, date: maintenant().toISOString() };
    codes.delete(publiee.id);
    garderDialogues = true;
    if (avant) refresh(); else V.regler('participation', 'publiee');
    garderDialogues = false;
    $('[data-form-body]').innerHTML = `<div class="df-done"><span class="df-done-icon">${icon('check-circle', 'icon')}</span><h2 id="df-form-title" tabindex="-1">${avant ? 'Votre participation est à jour' : 'Votre participation est en ligne'}</h2><p>${avant ? `« ${t(v.titre)} » remplace la version précédente. Les votes reçus sont conservés.` : `« ${t(v.titre)} » rejoint le défi. La communauté peut la découvrir et voter jusqu’au ${t(C().cloture)}.`}</p><div class="df-done-actions"><button class="btn btn-primary" type="button" data-play-mine>${icon(F().icone)}Voir ma participation</button><button class="btn btn-secondary" type="button" data-share="${esc(publiee.id)}">${icon('link')}<span>Copier le lien</span></button></div></div>`;
    V.fixTypography($('[data-form-body]'));
    $('#df-form-title', formDialog).focus();
    V.toast(avant ? 'Vos modifications sont enregistrées.' : 'Votre participation est en ligne.');
  }
  function essayer() {
    const zone = $('[data-test]', formDialog);
    if (!zone || !state.fichier || state.fichier.bloque) return;
    zone.innerHTML = `<div class="df-test-stage"></div><div class="df-test-tools"><button class="df-link-btn" type="button" data-test-stop>Arrêter l’essai</button><span>${icon('shield')}Isolé du site, sans accès à Internet</span></div>`;
    $('.df-test-stage', zone).replaceChildren(cadre(state.fichier.code, `Essai : ${state.fichier.nom}`));
  }

  /* Barre d'action sur téléphone ---------------------------------------- */
  function renderBar() {
    const bar = $('[data-mobile-bar]');
    const show = !prive() && (actif() || aVenir());
    bar.hidden = !show;
    if (!show) return;
    bar.innerHTML = `<div class="df-bar-copy"><b>${t(C().titre)}</b><span>${aVenir() ? 'Ouverture dans' : 'Clôture dans'} <span data-countdown>${decompte(restant())}</span></span></div>${enPause() ? `<span class="df-bar-pause">${icon('pause')}En pause</span>` : ouvert() ? `<button class="btn btn-primary btn-sm" type="button" data-participer>${mine() ? 'Ma participation' : 'Participer'}</button>` : '<a class="btn btn-secondary btn-sm" href="#regles">Les règles</a>'}`;
    barObserver?.disconnect();
    const cible = $('.df-top-action') || $('#defi');
    if (!cible || !('IntersectionObserver' in window)) { bar.classList.add('is-visible'); return; }
    barObserver = new IntersectionObserver(([e]) => bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    barObserver.observe(cible);
  }

  /* Rafraîchissement ---------------------------------------------------- */
  function refresh() {
    renderTop(); renderRules(); renderHead(); renderFilters(); renderEntries(); renderArchives(); renderBar();
    V.fixTypography($('main'));
    if (player.open && !trouver(state.playing)) player.close();
    else if (player.open) renderPlayer();
    if (!garderDialogues) [archiveDialog, formDialog, confirmDialog].forEach(d => { if (d.open) d.close(); });
  }
  function apresVote(id) {
    renderTop(); renderEntries(true);
    V.fixTypography($('main'));
    if (player.open) { const e = trouver(id); if (e) { $$('[data-vote]', player).forEach(x => { x.outerHTML = voteButton(e, true); }); $('[data-vote]', player)?.focus({ preventScroll: true }); } }
    else $(`[data-entry="${CSS.escape(id)}"] [data-vote]`)?.focus({ preventScroll: true });
  }

  /* Événements -------------------------------------------------------- */
  document.addEventListener('click', async event => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-participer')) return participate(b);
    if (b.hasAttribute('data-play-first')) { const l = liste(); return openPlayer((l[0] || classement()[0])?.id, b); }
    if (b.dataset.play) return openPlayer(b.dataset.play, b);
    if (b.hasAttribute('data-play-mine')) { formDialog.close(); return openPlayer(maParticipation().id, $('.df-top-action button') || $('.df-nav [data-participer]')); }
    if (b.dataset.launch) return lancer();
    if (b.hasAttribute('data-fullscreen')) { const s = $('[data-stage]', player); s?.requestFullscreen?.().then(() => $('iframe', s)?.focus()).catch(() => V.toast('Le plein écran est indisponible sur cet appareil.', 'alert')); return; }
    if (b.hasAttribute('data-zoom')) { state.zoom = !state.zoom; $('.df-viewer-stage', player).innerHTML = scene(trouver(state.playing)); $('[data-zoom]', player)?.focus(); return; }
    if (b.dataset.archive) return openArchive(b.dataset.archive, b);
    if (b.hasAttribute('data-modifier')) { const origine = player.open ? $('.df-top-action [data-modifier]') : b; if (player.open) player.close(); return openForm(origine, true); }
    if (b.hasAttribute('data-supprimer')) return supprimer(b);
    if (b.hasAttribute('data-supprimer-ok')) return confirmerSuppression();
    if (b.hasAttribute('data-close')) { b.closest('dialog')?.close(); return; }
    if (b.dataset.view) { vue = b.dataset.view; V.store.set('vysora-defis-vue', vue); renderHead(); renderEntries(true); V.fixTypography($('[data-entries]')); $(`[data-view="${vue}"]`).focus(); return; }
    if (b.dataset.tool) { state.tool = b.dataset.tool; state.limite = PAS; renderFilters(); renderEntries(true); $(`[data-tool="${CSS.escape(state.tool)}"]`).focus({ preventScroll: true }); return; }
    if (b.hasAttribute('data-clear')) { state.q = ''; state.tool = 'Tous'; state.limite = PAS; $('#df-search').value = ''; if (settings.donnees === 'aucun') V.regler('donnees', 'remplies'); renderFilters(); renderEntries(true); $('#df-search').focus({ preventScroll: true }); return; }
    if (b.dataset.share) return copier(lien(b.dataset.share), 'Lien de la participation copié.', b);
    if (b.hasAttribute('data-share-defi')) return partagerDefi(b);
    if (b.hasAttribute('data-more-next')) {
      const avant = Math.max(PAS, state.limite);
      state.limite = avant + PAS; renderEntries(); V.fixTypography($('[data-entries]'));
      const suivante = $$('[data-entry]')[avant];
      if (suivante) { $('[data-play]', suivante)?.focus({ preventScroll: true }); if (V.motion.full()) $$('[data-entry]').slice(avant).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 40, easing: 'cubic-bezier(0.2,0,0,1)', fill: 'backwards' })); }
      return;
    }
    if (b.hasAttribute('data-more-less')) { state.limite = PAS; renderEntries(); V.fixTypography($('[data-entries]')); $('#participations').scrollIntoView({ behavior: V.motion.full() ? 'smooth' : 'auto', block: 'start' }); $('[data-more] button')?.focus({ preventScroll: true }); return; }
    if (b.hasAttribute('data-prompt-add')) { const n = $$('[data-prompt-item]', formDialog).length; if (maxPrompts() && n >= maxPrompts()) return; $('[data-prompts]', formDialog).insertAdjacentHTML('beforeend', promptHTML(n)); majPrompts(); $(`#df-prompt-${n}`, formDialog).focus(); return; }
    if (b.hasAttribute('data-prompt-remove')) { const li = b.closest('[data-prompt-item]'); const k = $$('[data-prompt-item]', formDialog).indexOf(li); li.remove(); majPrompts(); $(`#df-prompt-${Math.max(0, k - 1)}`, formDialog)?.focus(); return; }
    if (b.hasAttribute('data-file-remove')) { state.fichier = null; renderFileZone(); $('[data-file-input]', formDialog)?.focus(); return; }
    if (b.hasAttribute('data-image-remove')) { state.image = null; renderImageZone(); $('[data-image-input]', formDialog)?.focus(); return; }
    if (b.hasAttribute('data-paste-use')) { const code = $('[data-paste]', formDialog).value; if (!code.trim()) { erreurChamp('fichier', 'Collez le code HTML du jeu.'); return; } chargerFichier('jeu.html', code); ($('[data-test-launch]', formDialog) || $('[data-file-remove]', formDialog))?.focus(); return; }
    if (b.hasAttribute('data-test-launch')) return essayer();
    if (b.hasAttribute('data-test-stop')) { renderFileZone(); $('[data-test-launch]', formDialog)?.focus(); return; }
    if (b.hasAttribute('data-cover-remove')) { state.couverture = null; renderCoverZone(); $('[data-cover-input]', formDialog)?.focus(); return; }
    if (b.dataset.vote) {
      if (!actif() || !V.exiger('contribuer', 'voter « Utile »')) return;
      const id = b.dataset.vote;
      votes.has(id) ? votes.delete(id) : votes.add(id);
      V.store.set('vysora-defis-votes-v2', [...votes]);
      if (V.motion.full()) bump.add(id);
      apresVote(id);
      V.toast(votes.has(id) ? 'Votre vote Utile a été ajouté.' : 'Votre vote a été retiré.');
      return;
    }
    if (b.dataset.copyCode) { const e = trouver(b.dataset.copyCode); return copier(e.resultat.code, 'Code copié.', b); }
    if (b.dataset.copy) {
      const e = trouver(b.dataset.copy), x = e?.chemin[Number(b.dataset.index) || 0];
      if (!x) return;
      const ok = await copier(x.prompt, 'Prompt copié.', b);
      const status = $('[data-copy-status]', player);
      if (status) { status.classList.toggle('sr-only', ok); status.textContent = ok ? 'Prompt copié dans le presse-papiers.' : 'La copie automatique est indisponible. Sélectionnez le prompt pour le copier.'; }
    }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-file-input]')) lireFichier(el.files[0]);
    if (el.matches('[data-image-input]')) lireImage(el.files[0], 'image');
    if (el.matches('[data-cover-input]')) lireImage(el.files[0], 'couverture');
    if (el.matches('#df-outil')) { majModeles(); erreurChamp('outil', ''); }
    if (el.matches('input[name="essais"]')) { const n = $('[data-tries]', formDialog); n.hidden = el.value !== 'plusieurs'; if (!n.hidden) $('#df-nombre', formDialog).focus(); }
  });
  document.addEventListener('input', event => {
    const el = event.target;
    if (!el.closest('[data-form]') || el.getAttribute('aria-invalid') !== 'true') return;
    erreurChamp(el.id === 'df-titre-part' ? 'titre' : el.name === 'prompt' ? 'prompt' : el.id.replace('df-', ''), '');
  });
  formDialog.addEventListener('submit', event => { event.preventDefault(); publier(); });
  formDialog.addEventListener('dragover', event => { const d = event.target.closest?.('[data-drop]'); if (d) { event.preventDefault(); d.classList.add('is-over'); } });
  formDialog.addEventListener('dragleave', event => { event.target.closest?.('[data-drop]')?.classList.remove('is-over'); });
  formDialog.addEventListener('drop', event => {
    const d = event.target.closest?.('[data-drop]'); if (!d) return;
    event.preventDefault(); d.classList.remove('is-over');
    const file = event.dataTransfer.files[0];
    d.dataset.dropKind === 'image' ? lireImage(file, 'image') : lireFichier(file);
  });
  $('#df-search').addEventListener('input', e => { state.q = e.target.value; state.limite = PAS; renderEntries(); V.fixTypography($('[data-entries]')); });
  $('#df-sort').addEventListener('change', e => { state.sort = e.target.value; state.limite = PAS; renderEntries(true); V.fixTypography($('[data-entries]')); });
  document.addEventListener('error', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.dataset.cover) { const entry = trouver(img.dataset.cover); if (entry) img.outerHTML = couvertureType(entry); }
  }, true);
  [player, formDialog, archiveDialog, confirmDialog].forEach(d => {
    d.addEventListener('click', e => { if (e.target === d && d !== player) { const box = d.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close(); } });
    d.addEventListener('close', () => {
      if (d.open) return;
      if (d === player) { $('[data-player-body]').replaceChildren(); state.playing = null; state.zoom = false; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
      if (d === formDialog) { state.fichier = null; state.image = null; state.couverture = null; $('[data-form-body]').replaceChildren(); }
      if (d === archiveDialog) $('[data-dialog-body]', archiveDialog).replaceChildren();
      if (d === confirmDialog) { if (state.origineConfirm?.isConnected) state.origineConfirm.focus({ preventScroll: true }); return; }
      if (!garderDialogues && state.origin?.isConnected) state.origin.focus({ preventScroll: true });
    });
  });

  V.initHeader();
  V.initTweaks({ key: 'vysora-defis-reglages-v5',
    etats: [
      { name: 'statut', legend: 'Statut du défi', options: [['a_venir', 'À venir'], ['en_cours', 'En cours'], ['pause', 'En pause'], ['termine', 'Terminé, avant clôture'], ['cloture', 'Clôturé'], ['annule', 'Annulé'], ['brouillon', 'Brouillon'], ['introuvable', 'Introuvable']] },
      { name: 'format', legend: 'Format du défi', options: [['jeu', 'Jeu jouable · Deploy Friday'], ['image', 'Image · Affiche touristique'], ['code', 'Code · Script sans suppression']] },
      { name: 'participation', legend: 'Votre participation', options: [['aucune', 'Pas encore'], ['publiee', 'Publiée']], si: e => e.session === 'membre' },
      { name: 'formulaire', legend: 'Formulaire de participation', options: [['vide', 'Vide'], ['prerempli', 'Prérempli'], ['externe', 'Jeu qui appelle Internet'], ['suspect', 'Jeu qui demande un mot de passe']], si: e => e.session === 'membre' },
      { name: 'donnees', legend: 'Participations', options: [['remplies', 'Quelques-unes'], ['nombreuses', 'Nombreuses'], ['vide', 'Aucune'], ['aucun', 'Aucun résultat']] },
      { name: 'quota', legend: 'Limite de publication', options: [['disponible', 'Disponible'], ['atteint', 'Atteinte']], si: e => e.session === 'membre' }
    ],
    apparence: ['accent', 'density', 'radius', 'effects', 'motion'],
    defaults: { statut: 'en_cours', format: 'jeu', participation: 'aucune', formulaire: 'vide', donnees: 'remplies', quota: 'disponible' },
    onChange: (changed, next) => {
      settings = next;
      if (changed === 'participation' && next.participation === 'aucune') publiee = null;
      if (changed === 'format') { publiee = null; state.tool = 'Tous'; }
      if (changed === 'format' || changed === 'donnees') state.limite = PAS;
      if (changed !== 'init') refresh();
    }
  });
  V.etats.on(refresh);
  refresh();
  setInterval(battre, 1000);
  root.classList.add('df-ready');
  if ('IntersectionObserver' in window) {
    sectionObserver = new IntersectionObserver(entries => {
      const active = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (active) $$('.df-anchors a').forEach(a => { if (a.hash === '#' + active.target.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    $$('#defi, #participations, #precedents').forEach(el => sectionObserver.observe(el));
  }
  const params = new URLSearchParams(location.search);
  const cible = params.get('participation') || params.get('jeu');
  if (cible && trouver(cible)) openPlayer(cible, $('.df-nav [data-participer]'));
  document.body.classList.add('is-ready');
})();
