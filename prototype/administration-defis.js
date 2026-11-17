'use strict';

/* Gestion des défis (F-63 à F-65, RG-73 à RG-75) : démo de la gestion complète.
   - Liste des défis par état, avec ce qui attend l'administration (défi à clôturer, participation à
     vérifier, brouillon incomplet).
   - Fiche d'un défi en trois onglets : le contenu (éditeur et aperçu de la page publique), les
     participations (vérification, masquage, retrait) et la clôture (podium, points, badges).
   - Création, duplication, publication (programmée si le début est à venir), ouverture ou clôture
     anticipée, annulation, rétablissement, réouverture, suppression d'un brouillon. L'administration
     peut tout modifier à tout moment, dates comprises : la page l'avertit des effets au lieu de
     l'en empêcher. Seul un défi clôturé garde ses dates et ses règles, tant qu'il n'est pas rouvert.
   « Maintenant » simulé : jeudi 19 novembre 2026 (même instant que la page Défis). Les changements
   sont gardés pour la session du navigateur. État dans Tweaks : défis à gérer, aucun défi. */

(() => {
  const AC = window.AdminContenus, V = window.Vysora, PUB = window.VYSORA_DEFIS, CL = window.VYSORA_CLASSEMENTS;
  const { $, $$, t, esc, fmt, icon } = AC;
  const nb = ' ';
  const MS_JOUR = 86400000;
  const chargement = Date.now();
  const maintenant = () => new Date(new Date('2026-11-19T16:20:00Z').getTime() + (Date.now() - chargement));

  const FORMATS = { PAGE_HTML: ['Jeu jouable', 'gamepad'], IMAGE: ['Image', 'image'], CODE: ['Code', 'code'], LIBRE: ['Libre', 'pen'] };
  const ICONES = [['user', 'Personnage'], ['keyboard', 'Contrôles'], ['smile', 'Humour'], ['trend-up', 'Progression'], ['image', 'Image'], ['pen', 'Texte'], ['globe', 'Lieu'], ['grid', 'Composition'], ['route', 'Chemin'], ['shield', 'Sûreté'], ['check-circle', 'Exactitude'], ['code', 'Code'], ['repeat', 'Reproductible'], ['award', 'Qualité'], ['bulb', 'Idée'], ['play', 'Jeu']];
  const LIMITES = { regles: 4, criteres: 4, communs: 6 };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jour = iso => { const d = new Date(iso); return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()}${nb}${MOIS[d.getUTCMonth()]}`; };
  const jourLong = iso => { const d = new Date(iso); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]}`; };
  const jourHeure = iso => { const d = new Date(iso); return `${jourLong(iso)} à ${d.getUTCHours()}${nb}h${nb}${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const periode = d => `${jour(d.debut)} – ${jour(d.fin)}`;
  const versSaisie = iso => iso.slice(0, 16);
  const depuisSaisie = v => new Date(/Z$/.test(v) ? v : `${v}:00Z`).toISOString();

  /* Données de départ : les défis de la page Défis, aux mêmes dates ------------------------------ */
  const jeu = PUB.variantes.jeu, image = PUB.variantes.image, code = PUB.variantes.code;
  const podiumDe = semaine => (CL.weeks.find(w => w.id === semaine)?.defi.entries || []).map((e, i) => ({ id: `s${semaine}-${i}`, titre: e.title, m: e.m, outil: e.tool, modele: e.model, n: e.n, date: null, etat: 'visible' }));
  const participationsJeu = [
    ...jeu.participations.map(p => ({ id: p.id, titre: p.titre, m: p.m, outil: p.outil, modele: p.modele, n: p.n, date: p.date, couverture: p.resultat.couverture, etat: 'visible' })),
    { id: 'sprint-final', titre: 'Sprint final avant la prod', m: 'Yacine Benali', outil: 'ChatGPT', modele: 'GPT-5', n: 0, date: '2026-11-19T11:02:00Z', couverture: null, etat: 'a_verifier', motif: 'Une partie du code est masquée : une chaîne encodée de 6 Ko, décodée au lancement.' }
  ];
  const DEPART = [
    { id: 50, semaine: 49, titre: 'Un menu de restaurant en trois langues', debut: '2026-12-01T00:00:00Z', fin: '2026-12-07T23:59:00Z', statut: 'BROUILLON', format: 'LIBRE', nbPromptsMax: null, definition: '', enonce: '',
      regles: [{ chiffre: '3', intitule: 'langues', precision: 'Dont celle d’origine' }], criteres: [], criteresCommuns: [], participations: [] },
    { id: 49, semaine: 48, titre: 'Un jingle de dix secondes pour un podcast', debut: '2026-11-24T00:00:00Z', fin: '2026-11-30T23:59:00Z', statut: 'PUBLIE', format: 'LIBRE', nbPromptsMax: 3, definition: '',
      enonce: 'Composez le générique d’un podcast réel ou imaginaire : dix secondes, et une fin qui tombe juste.',
      regles: [{ chiffre: '10', intitule: 'secondes au plus', precision: 'Fin comprise' }, { chiffre: '3', intitule: 'prompts au plus', precision: 'Du premier essai au son final' }, { chiffre: '0', intitule: 'fondu interminable', precision: 'Une fin franche' }, { chiffre: '1', intitule: 'participation', precision: 'Par personne' }],
      criteres: [{ libelle: 'Rythme', icone: 'trend-up' }, { libelle: 'Identité sonore', icone: 'award' }, { libelle: 'Fin franche', icone: 'check-circle' }, { libelle: 'Économie de prompts', icone: 'route' }], criteresCommuns: [], participations: [] },
    { id: 48, semaine: 47, titre: jeu.titre, debut: jeu.debut, fin: jeu.fin, statut: 'PUBLIE', format: jeu.format, nbPromptsMax: jeu.nbPromptsMax, definition: jeu.definition, enonce: jeu.enonce,
      regles: jeu.regles, criteres: jeu.criteres, criteresCommuns: jeu.criteresCommuns, participations: participationsJeu },
    { id: 47, semaine: 46, titre: 'Un tableau de bord sans chiffre inventé', debut: '2026-11-09T00:00:00Z', fin: '2026-11-15T23:59:00Z', statut: 'PUBLIE', format: 'IMAGE', nbPromptsMax: null, definition: '',
      enonce: 'Construisez un tableau de bord à partir de vos propres données, et montrez comment vous avez vérifié chaque chiffre.',
      regles: [{ chiffre: '0', intitule: 'chiffre inventé', precision: 'Chaque total se recalcule' }, { chiffre: '1', intitule: 'source par chiffre', precision: 'Citée sous le tableau' }, { chiffre: '1', intitule: 'participation', precision: 'Par personne' }],
      criteres: [{ libelle: 'Exactitude', icone: 'check-circle' }, { libelle: 'Lisibilité', icone: 'grid' }, { libelle: 'Vérification montrée', icone: 'shield' }], criteresCommuns: [],
      participations: [
        { id: 'tb-1', titre: 'Les ventes d’une boutique en ligne, vérifiées ligne à ligne', m: 'Claire Dubois', outil: 'Claude', modele: 'Sonnet 4.5', n: 19, date: '2026-11-10T09:12:00Z', etat: 'visible' },
        { id: 'tb-2', titre: 'Budget d’une association sportive', m: 'Aminata Traoré', outil: 'ChatGPT', modele: 'GPT-5', n: 14, date: '2026-11-11T18:40:00Z', etat: 'visible' },
        { id: 'tb-3', titre: 'Fréquentation d’une bibliothèque de quartier', m: 'Hélène Garnier', outil: 'Gemini', modele: '2.5 Pro', n: 11, date: '2026-11-12T07:55:00Z', etat: 'visible' },
        { id: 'tb-4', titre: 'Consommation électrique d’un atelier', m: 'Karim Mansouri', outil: 'DeepSeek', modele: 'V3.2', n: 6, date: '2026-11-13T15:30:00Z', etat: 'visible' }
      ], total: 41 },
    { id: 46, semaine: 44, titre: 'Une carte de vœux animée', debut: '2026-10-26T00:00:00Z', fin: '2026-11-01T23:59:00Z', statut: 'ANNULE', format: 'LIBRE', nbPromptsMax: null, definition: '',
      enonce: 'Animez une carte de vœux de cinq secondes à partir d’une illustration que vous avez générée.',
      regles: [{ chiffre: '5', intitule: 'secondes au plus', precision: 'Animation comprise' }, { chiffre: '1', intitule: 'illustration de départ', precision: 'Générée par vous' }], criteres: [], criteresCommuns: [], participations: [], total: 3 },
    { id: 45, semaine: 42, titre: image.titre, debut: '2026-10-12T00:00:00Z', fin: '2026-10-19T23:59:00Z', statut: 'CLOTURE', format: 'IMAGE', nbPromptsMax: 3, definition: '', enonce: image.enonce,
      regles: image.regles, criteres: image.criteres, criteresCommuns: [], participations: podiumDe(42), total: 87, clotureLe: '2026-10-20T09:00:00Z' },
    { id: 44, semaine: 41, titre: 'Un logo lisible en petit format', debut: '2026-10-05T00:00:00Z', fin: '2026-10-11T23:59:00Z', statut: 'CLOTURE', format: 'IMAGE', nbPromptsMax: null, definition: '',
      enonce: 'Créez le logo d’une entreprise de votre quartier, lisible jusqu’à 32 pixels.',
      regles: [{ chiffre: '32', intitule: 'pixels', precision: 'Toujours lisible' }, { chiffre: '2', intitule: 'couleurs au plus', precision: 'Fond compris' }, { chiffre: '1', intitule: 'nom exact', precision: 'Sans faute' }],
      criteres: [{ libelle: 'Lisibilité', icone: 'grid' }, { libelle: 'Fidélité au nom', icone: 'pen' }], criteresCommuns: [], participations: podiumDe(41), total: 64, clotureLe: '2026-10-12T09:00:00Z' },
    { id: 43, semaine: 40, titre: code.titre, debut: '2026-09-28T00:00:00Z', fin: '2026-10-04T23:59:00Z', statut: 'CLOTURE', format: 'CODE', nbPromptsMax: null, definition: '', enonce: code.enonce,
      regles: code.regles, criteres: code.criteres, criteresCommuns: [], participations: podiumDe(40), total: 52, clotureLe: '2026-10-05T09:00:00Z' }
  ];

  /* État simulé ------------------------------------------------------------------------------------ */
  const etat = () => AC.etat('defis-gestion', () => ({ defis: JSON.parse(JSON.stringify(DEPART)) }));
  const garder = e => AC.garder('defis-gestion', e);
  let reglages = {}, vue = { id: null, onglet: 'contenu', filtre: 'tous', brouillon: null };
  const liste = () => (reglages.defis === 'vide' ? [] : etat().defis.slice().sort((a, b) => b.debut.localeCompare(a.debut)));
  const trouver = id => etat().defis.find(d => d.id === id);

  /* Phase d'un défi : l'API en reste juge (RG-73) ---------------------------------------------------- */
  function phase(d) {
    if (d.statut === 'BROUILLON') return 'brouillon';
    if (d.statut === 'ANNULE') return 'annule';
    if (d.statut === 'CLOTURE') return 'cloture';
    const n = maintenant().getTime();
    if (new Date(d.debut).getTime() > n) return 'a_venir';
    return new Date(d.fin).getTime() > n ? 'en_cours' : 'a_cloturer';
  }
  const PHASES = { brouillon: 'Brouillon', a_venir: 'Programmé', en_cours: 'En cours', a_cloturer: 'À clôturer', cloture: 'Clôturé', annule: 'Annulé' };
  /* Clôturé : classement figé, donc dates, format et règles aussi (on rouvre pour les changer).
     Annulé : lecture seule (on rétablit pour le modifier). */
  const verrouille = d => phase(d) === 'cloture';
  const lectureSeule = d => phase(d) === 'annule';
  const fige = d => ['cloture', 'annule'].includes(phase(d));
  /* En pause : défi en cours qui n'accepte plus de participation (menace, abus, incident). */
  const enPause = d => phase(d) === 'en_cours' && !!d.pause;
  const minute = () => { const m = maintenant(); m.setUTCSeconds(0, 0); return m; };
  const visibles = d => d.participations.filter(p => p.etat === 'visible');
  const aVerifier = d => d.participations.filter(p => p.etat === 'a_verifier');
  const classement = d => visibles(d).slice().sort((a, b) => b.n - a.n || String(a.date).localeCompare(String(b.date)));
  const total = d => d.total ?? visibles(d).length;

  /* Contrôle d'un défi (schemaDefi complété) ----------------------------------------------------------- */
  function manques(d) {
    const m = [];
    if ((d.titre || '').trim().length < 5) m.push(['titre', 'Le titre compte au moins 5 caractères.']);
    if ((d.titre || '').length > 150) m.push(['titre', 'Le titre compte 150 caractères au plus.']);
    if ((d.enonce || '').trim().length < 20) m.push(['enonce', 'L’énoncé compte au moins 20 caractères.']);
    if ((d.enonce || '').length > 600) m.push(['enonce', 'L’énoncé compte 600 caractères au plus.']);
    if ((d.definition || '').length > 300) m.push(['definition', 'Le thème expliqué compte 300 caractères au plus.']);
    const jours = (new Date(d.fin) - new Date(d.debut)) / MS_JOUR;
    if (!(jours >= 1 && jours <= 30)) m.push(['dates', 'Un défi dure de 1 à 30 jours.']);
    if (!d.regles.length) m.push(['regles', 'Ajoutez au moins une règle.']);
    if (d.regles.some(r => !r.chiffre.trim() || !r.intitule.trim())) m.push(['regles', 'Chaque règle a un chiffre et un intitulé.']);
    if (!d.criteres.length) m.push(['criteres', 'Ajoutez au moins un principe jugé.']);
    if (d.criteres.some(c => !c.libelle.trim())) m.push(['criteres', 'Chaque principe jugé a un libellé.']);
    return m;
  }

  /* Rendu : liste ------------------------------------------------------------------------------------ */
  const chip = d => (enPause(d) ? '<span class="adf-chip is-en_pause">En pause</span>' : `<span class="adf-chip is-${phase(d)}">${PHASES[phase(d)]}</span>`);
  const format = d => `<span class="adf-format">${icon(FORMATS[d.format][1])}${FORMATS[d.format][0]}</span>`;
  function aFaire(defis) {
    const items = [];
    defis.forEach(d => {
      const p = phase(d);
      if (p === 'a_cloturer') items.push([d, 'podium', `« ${d.titre} » est terminé depuis le ${jour(d.fin)} : clôturez-le pour figer le classement.`, 'Clôturer', 'cloture']);
      if (enPause(d)) items.push([d, 'pause', `« ${d.titre} » : participations en pause depuis le ${jourHeure(d.pause.depuis)}.`, 'Reprendre', 'contenu']);
      if (aVerifier(d).length) items.push([d, 'shield', `« ${d.titre} » : ${aVerifier(d).length}${nb}participation${aVerifier(d).length > 1 ? 's' : ''} à vérifier avant d’être jouable.`, 'Vérifier', 'participations']);
      if (p === 'brouillon' && manques(d).length) items.push([d, 'pen', `« ${d.titre} » : brouillon à compléter (${[...new Set(manques(d).map(([c]) => ({ titre: 'titre', enonce: 'énoncé', definition: 'thème', dates: 'dates', regles: 'règles', criteres: 'principes jugés' }[c])))].join(', ')}).`, 'Compléter', 'contenu']);
    });
    return items;
  }
  function rendreListe() {
    const defis = liste();
    const compte = cle => defis.filter(d => cle === 'tous' || (cle === 'termines' ? fige(d) : phase(d) === cle)).length;
    const filtres = [['tous', 'Tous'], ['en_cours', 'En cours'], ['a_venir', 'Programmés'], ['brouillon', 'Brouillons'], ['a_cloturer', 'À clôturer'], ['termines', 'Terminés']];
    const filtrés = defis.filter(d => vue.filtre === 'tous' || (vue.filtre === 'termines' ? fige(d) : phase(d) === vue.filtre));
    const todo = aFaire(defis);
    const ligne = d => `<li class="adf-row">
        <span class="adf-week"><b>S${d.semaine}</b><small>${periode(d)}</small></span>
        <span class="adf-row-main"><button class="adf-row-title" type="button" data-adf-ouvrir="${d.id}">${t(d.titre)}</button><span class="adf-row-meta">${format(d)}<span>${d.nbPromptsMax ? `${d.nbPromptsMax}${nb}prompt${d.nbPromptsMax > 1 ? 's' : ''} au plus` : 'Prompts libres'}</span><span>${d.regles.length}${nb}règle${d.regles.length > 1 ? 's' : ''}</span></span></span>
        ${chip(d)}
        <span class="adf-row-count"><b>${fmt(total(d))}</b><small>participation${total(d) > 1 ? 's' : ''}</small></span>
        <span class="adf-row-actions"><button class="btn btn-secondary btn-sm" type="button" data-adf-ouvrir="${d.id}">Gérer${icon('chevron-right')}</button></span>
      </li>`;
    return `${AC.tete({ titre: 'Défis', onglet: 'defis', statut: `<p class="md-statut"><span class="is-fort">${AC.pluriel(defis.length, 'défi', 'défis')}</span><span>${t(`${compte('en_cours')} en cours · ${compte('a_venir')} programmé${compte('a_venir') > 1 ? 's' : ''} · ${compte('brouillon')} brouillon${compte('brouillon') > 1 ? 's' : ''}`)}</span></p>` })}
      <div class="container md-file adf">
        <div class="adf-bar"><div class="adf-filters" role="group" aria-label="Filtrer les défis">${filtres.map(([cle, nom]) => `<button type="button" data-adf-filtre="${cle}" aria-pressed="${vue.filtre === cle}">${nom}<span>${compte(cle)}</span></button>`).join('')}</div><button class="btn btn-primary" type="button" data-adf-nouveau>${icon('plus')}Nouveau défi</button></div>
        ${todo.length ? `<section class="adf-todo" aria-labelledby="adf-todo-titre"><h2 id="adf-todo-titre">À faire</h2><ul>${todo.map(([d, ic, texte, action, onglet]) => `<li>${icon(ic)}<span>${t(texte)}</span><button class="btn btn-secondary btn-sm" type="button" data-adf-ouvrir="${d.id}" data-adf-onglet="${onglet}">${action}</button></li>`).join('')}</ul></section>` : ''}
        ${filtrés.length ? `<ol class="adf-list">${filtrés.map(ligne).join('')}</ol>` : `<p class="md-rien ad-vide">${defis.length ? 'Aucun défi dans cet état.' : 'Aucun défi pour l’instant : créez le premier.'}</p>`}
      </div>`;
  }

  /* Rendu : aperçu de la page publique -------------------------------------------------------------- */
  function apercu(d) {
    const p = phase(d);
    const statut = { brouillon: 'Brouillon', a_venir: 'Bientôt ouvert', en_cours: enPause(d) ? 'En pause' : 'En cours', a_cloturer: 'Participations closes', cloture: 'Clôturé', annule: 'Annulé' }[p];
    return `<div class="df adf-apercu-page">
      ${enPause(d) ? `<p class="df-notice is-pause">${icon('pause')}<span><b>Participations en pause.</b> L’équipe de Vysora a suspendu les nouvelles participations ; elles reprendront dès que possible.</span></p>` : ''}
      <div class="df-top-head"><p class="kicker">${icon('trophy')}Défi de la semaine ${d.semaine}</p></div>
      <h1 class="df-title">${t(d.titre || 'Titre du défi')}</h1>
      <p class="df-dates"><span class="df-status is-${enPause(d) ? 'pause' : p === 'en_cours' ? 'en_cours' : p === 'a_venir' ? 'a_venir' : 'autre'}">${statut}</span><span>jusqu’au ${t(jourLong(d.fin))}</span></p>
      ${d.definition ? `<p class="df-definition">${icon('bulb')}<span>${t(d.definition)}</span></p>` : ''}
      <p class="df-lead${d.enonce ? '' : ' adf-vide'}">${t(d.enonce || 'L’énoncé du défi apparaîtra ici.')}</p>
      <div class="df-brief">
        <section class="df-brief-block"><h2 class="df-brief-label">${icon('check-circle')}Les règles</h2><ul class="df-rule-cards">${d.regles.length ? d.regles.map(r => `<li><b class="df-rule-n">${t(r.chiffre || '–')}</b><span class="df-rule-name">${t(r.intitule || 'Intitulé')}</span><small>${t(r.precision || '')}</small></li>`).join('') : '<li class="adf-vide-case">Aucune règle</li>'}</ul></section>
        <section class="df-brief-block"><h2 class="df-brief-label">${icon('award')}Le plus jugé</h2><ul class="df-judged">${d.criteres.length ? d.criteres.map(c => `<li>${icon(c.icone, 'icon')}<span>${t(c.libelle || 'Principe')}</span></li>`).join('') : '<li class="adf-vide-case">Aucun principe</li>'}</ul>${d.criteresCommuns.length ? `<p class="df-judged-more"><span>Aussi</span>${d.criteresCommuns.map(x => `<span class="df-chip">${t(x)}</span>`).join('')}</p>` : ''}</section>
      </div>
    </div>`;
  }

  /* Rendu : fiche d'un défi -------------------------------------------------------------------------- */
  const champ = (id, label, html, aide = '') => `<div class="ad-champ adf-champ" data-adf-champ="${id}"><label for="adf-${id}">${label}</label>${html}${aide ? `<p class="adf-aide">${aide}</p>` : ''}<p class="md-erreur" data-ad-erreur="${id}" hidden></p></div>`;
  function formulaire(d) {
    const v = verrouille(d), ro = lectureSeule(d), p = phase(d);
    const dis = (bloque = v) => (bloque || ro ? ' disabled' : '');
    const regle = (r, i) => `<li class="adf-rule-row" data-adf-regle="${i}"><input aria-label="Chiffre de la règle ${i + 1}" maxlength="4" value="${esc(r.chiffre)}" data-k="chiffre"${dis()}><input aria-label="Intitulé de la règle ${i + 1}" maxlength="30" value="${esc(r.intitule)}" placeholder="seul prompt" data-k="intitule"${dis()}><input aria-label="Précision de la règle ${i + 1}" maxlength="40" value="${esc(r.precision)}" placeholder="Sans retouche du jeu obtenu" data-k="precision"${dis()}>${v || ro ? '' : `<span class="adf-row-tools"><button class="ad-bouton-icone" type="button" data-adf-monter="regles" data-i="${i}" aria-label="Monter la règle ${i + 1}"${i === 0 ? ' disabled' : ''}>${icon('chevron-right')}</button><button class="ad-bouton-icone" type="button" data-adf-retirer="regles" data-i="${i}" aria-label="Retirer la règle ${i + 1}">${icon('close')}</button></span>`}</li>`;
    const critere = (c, i) => `<li class="adf-crit-row" data-adf-critere="${i}"><span class="adf-crit-icon">${icon(c.icone, 'icon')}</span><select aria-label="Icône du principe ${i + 1}" data-k="icone"${dis()}>${ICONES.map(([val, nom]) => `<option value="${val}"${val === c.icone ? ' selected' : ''}>${nom}</option>`).join('')}</select><input aria-label="Principe ${i + 1}" maxlength="30" value="${esc(c.libelle)}" placeholder="Animation du personnage" data-k="libelle"${dis()}>${v || ro ? '' : `<span class="adf-row-tools"><button class="ad-bouton-icone" type="button" data-adf-monter="criteres" data-i="${i}" aria-label="Monter le principe ${i + 1}"${i === 0 ? ' disabled' : ''}>${icon('chevron-right')}</button><button class="ad-bouton-icone" type="button" data-adf-retirer="criteres" data-i="${i}" aria-label="Retirer le principe ${i + 1}">${icon('close')}</button></span>`}</li>`;
    return `<form class="adf-form" novalidate data-adf-form>
      ${ro ? `<p class="adf-notice">${icon('lock')}<span>Défi annulé : il n’est plus visible. Rétablissez-le pour le modifier.</span><button class="btn btn-secondary btn-sm" type="button" data-adf-action="retablir">Rétablir le défi</button></p>`
        : v ? `<p class="adf-notice">${icon('lock')}<span>Défi clôturé : le classement est figé. Le titre, le thème et l’énoncé restent modifiables ; pour changer les dates ou les règles, rouvrez le défi.</span><button class="btn btn-secondary btn-sm" type="button" data-adf-action="rouvrir">Rouvrir le défi</button></p>`
        : enPause(d) ? `<p class="adf-notice is-action">${icon('pause')}<span>Participations en pause depuis le ${t(jourHeure(d.pause.depuis))} : la page Défis l’affiche, personne ne peut publier ni modifier de participation. Les jeux, les votes et le compte à rebours continuent.</span><button class="btn btn-primary btn-sm" type="button" data-adf-action="reprendre">Reprendre</button></p>`
        : p === 'en_cours' ? `<p class="adf-notice is-info">${icon('info')}<span>Défi en cours : chaque modification est visible aussitôt. Repousser la fin prolonge le défi, l’avancer le raccourcit. Les participations déjà publiées restent en ligne si les règles changent.</span></p>`
        : p === 'a_cloturer' ? `<p class="adf-notice is-action">${icon('clock')}<span>Le défi est terminé. Repoussez la fin pour rouvrir les participations, ou clôturez-le depuis l’onglet Clôture.</span></p>` : ''}
      <fieldset class="adf-fs"><legend>Le défi</legend>
        ${champ('titre', 'Titre', `<input id="adf-titre" maxlength="150" value="${esc(d.titre)}" data-k="titre"${dis(false)}>`)}
        <div class="adf-row2">
          ${champ('debut', 'Début (UTC)', `<input id="adf-debut" type="datetime-local" value="${versSaisie(d.debut)}" data-k="debut"${dis()}>`)}
          ${champ('fin', 'Fin (UTC)', `<input id="adf-fin" type="datetime-local" value="${versSaisie(d.fin)}" data-k="fin"${dis()}>`, p === 'en_cours' || p === 'a_cloturer' ? 'De 1 à 30 jours. Repoussez-la pour prolonger le défi.' : 'De 1 à 30 jours.')}
        </div>
        <p class="md-erreur" data-ad-erreur="dates" hidden></p>
        ${champ('definition', 'Le thème expliqué <span>(facultatif)</span>', `<textarea id="adf-definition" rows="2" maxlength="300" data-k="definition"${dis(false)}>${esc(d.definition)}</textarea>`, 'Une phrase pour comprendre le thème, en encadré sous le titre.')}
        ${champ('enonce', 'Énoncé', `<textarea id="adf-enonce" rows="3" maxlength="600" data-k="enonce"${dis(false)}>${esc(d.enonce)}</textarea>`, 'Ce qui est attendu, sans tout dicter : laissez de la place à l’invention.')}
      </fieldset>
      <fieldset class="adf-fs"><legend>La participation</legend>
        <div class="adf-formats" role="radiogroup" aria-label="Format de participation">${Object.entries(FORMATS).map(([val, [nom, ic]]) => `<label class="adf-format-choice"><input type="radio" name="format" value="${val}"${d.format === val ? ' checked' : ''} data-k="format"${dis()}>${icon(ic, 'icon')}<b>${nom}</b><small>${{ PAGE_HTML: 'Un fichier HTML, joué dans la page', IMAGE: 'Une image et sa description', CODE: 'Du code, lu dans la page', LIBRE: 'Texte, lien ou fichier' }[val]}</small></label>`).join('')}</div>
        ${champ('prompts', 'Prompts admis', `<select id="adf-prompts" data-k="nbPromptsMax"${dis()}>${[[1, 'Un seul prompt'], [2, '2 au plus'], [3, '3 au plus'], [5, '5 au plus'], ['', 'Sans limite']].map(([val, nom]) => `<option value="${val}"${String(d.nbPromptsMax ?? '') === String(val) ? ' selected' : ''}>${nom}</option>`).join('')}</select>`)}
      </fieldset>
      <fieldset class="adf-fs"><legend>Les règles <span>${d.regles.length}/${LIMITES.regles}</span></legend>
        <p class="adf-aide">Un chiffre, un intitulé court, une précision de quelques mots.</p>
        <ol class="adf-rules">${d.regles.map(regle).join('')}</ol>
        ${v || ro || d.regles.length >= LIMITES.regles ? '' : `<button class="adf-add" type="button" data-adf-ajouter="regles">${icon('plus')}Ajouter une règle</button>`}
        <p class="md-erreur" data-ad-erreur="regles" hidden></p>
      </fieldset>
      <fieldset class="adf-fs"><legend>Le plus jugé <span>${d.criteres.length}/${LIMITES.criteres}</span></legend>
        <ol class="adf-crits">${d.criteres.map(critere).join('')}</ol>
        ${v || ro || d.criteres.length >= LIMITES.criteres ? '' : `<button class="adf-add" type="button" data-adf-ajouter="criteres">${icon('plus')}Ajouter un principe</button>`}
        <p class="md-erreur" data-ad-erreur="criteres" hidden></p>
        <div class="ad-champ adf-champ"><label for="adf-commun">Aussi jugés <span>(facultatif)</span></label><div class="adf-chips">${d.criteresCommuns.map((x, i) => `<span class="adf-chip-edit">${t(x)}${v || ro ? '' : `<button type="button" data-adf-retirer="criteresCommuns" data-i="${i}" aria-label="Retirer ${t(x)}">${icon('close')}</button>`}</span>`).join('')}${v || ro || d.criteresCommuns.length >= LIMITES.communs ? '' : `<input id="adf-commun" maxlength="30" placeholder="Ajouter, puis Entrée" data-adf-commun>`}</div></div>
      </fieldset>
      ${ro ? '' : `<div class="adf-form-foot"><p class="adf-save-state" data-adf-etat-saisie>${icon('check-circle')}Enregistré</p><div>${phase(d) === 'brouillon' ? `<button class="btn btn-secondary" type="submit" data-adf-enregistrer>Enregistrer le brouillon</button><button class="btn btn-primary" type="button" data-adf-publier>Publier</button>` : `<button class="btn btn-primary" type="submit" data-adf-enregistrer>Enregistrer</button>`}</div></div>`}
    </form>`;
  }
  function participations(d) {
    if (!d.participations.length) return `<p class="md-rien ad-vide">${phase(d) === 'brouillon' || phase(d) === 'a_venir' ? 'Les participations apparaîtront ici dès l’ouverture du défi.' : phase(d) === 'annule' ? 'Défi annulé : ses participations ne sont plus visibles.' : 'Aucune participation.'}</p>`;
    const liste_ = d.participations.slice().sort((a, b) => (a.etat === 'a_verifier' ? -1 : 0) - (b.etat === 'a_verifier' ? -1 : 0) || b.n - a.n);
    const ETATS = { visible: ['Visible', 'is-ok'], a_verifier: ['À vérifier', 'is-warn'], masquee: ['Masquée', 'is-off'] };
    return `${d.total && d.total > d.participations.length ? `<p class="adf-aide">Les ${d.participations.length} premières sur ${fmt(d.total)}.</p>` : ''}<table class="ad-table adf-table">
      <thead><tr><th scope="col">Participation</th><th scope="col">Outil</th><th scope="col">Votes</th><th scope="col">État</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${liste_.map(p => `<tr class="${p.etat === 'a_verifier' ? 'is-warn' : ''}">
        <td><div class="adf-part">${p.couverture ? `<img src="${esc(p.couverture)}" alt="" width="96" height="54">` : `<span class="adf-part-vide">${icon(FORMATS[d.format][1])}</span>`}<span><b>${t(p.titre)}</b><small>${V.avatar(p.m, 18)}${t(p.m)}${p.date ? ` · ${jour(p.date)}` : ''}</small>${p.motif ? `<em>${icon('alert')}${t(p.motif)}</em>` : ''}</span></div></td>
        <td><span class="adf-outil">${V.logo(p.outil)}${t(p.outil)}${p.modele ? ` · ${t(p.modele)}` : ''}</span></td>
        <td class="adf-votes"><b>${fmt(p.n)}</b></td>
        <td><span class="adf-etat ${ETATS[p.etat][1]}">${ETATS[p.etat][0]}</span></td>
        <td class="ad-cellule-action"><div class="adf-part-actions">${lectureSeule(d) ? '' : p.etat === 'a_verifier' ? `<button class="btn btn-primary btn-sm" type="button" data-adf-part="autoriser" data-p="${esc(p.id)}">Autoriser</button><button class="btn btn-secondary btn-sm" type="button" data-adf-part="refuser" data-p="${esc(p.id)}">Refuser</button>` : p.etat === 'masquee' ? `<button class="btn btn-secondary btn-sm" type="button" data-adf-part="retablir" data-p="${esc(p.id)}">Rétablir</button>` : `${d.id === 48 ? `<a class="btn btn-quiet btn-sm" href="defis.html?participation=${esc(p.id)}">Voir</a>` : ''}<button class="btn btn-secondary btn-sm" type="button" data-adf-part="masquer" data-p="${esc(p.id)}">Masquer</button>`}</div></td>
      </tr>`).join('')}</tbody></table>`;
  }
  function cloture(d) {
    const p = phase(d), top = p === 'cloture' && d.podiumFige ? d.podiumFige : classement(d);
    const points = [50, 30, 20];
    const podium = top.slice(0, 3).map((x, i) => `<li><span class="adf-pod-rank">${i + 1}</span>${V.avatar(x.m, 32)}<span><b>${t(x.titre)}</b><small>${t(x.m)} · ${fmt(x.n)}${nb}votes</small></span><span class="adf-pod-pts">+${points[i] + 5}${nb}pts</span></li>`).join('');
    if (p === 'annule') return `<p class="md-rien ad-vide">Défi annulé : aucun classement ni point.</p>`;
    if (p === 'brouillon' || p === 'a_venir') return `<p class="md-rien ad-vide">La clôture viendra après la fin du défi, le ${t(jourLong(d.fin))}.</p>`;
    const corps = top.length ? `<ol class="adf-podium">${podium}</ol><dl class="adf-points"><div><dt>Participations classées</dt><dd>${fmt(total(d))}</dd></div><div><dt>Points crédités</dt><dd>${fmt(total(d) * 5 + 100)}</dd></div><div><dt>Badges</dt><dd class="is-texte">Participant pour tous, Podium pour les trois premiers</dd></div></dl>` : '<p class="md-rien">Aucune participation à classer.</p>';
    if (p === 'en_cours') return `<p class="adf-notice">${icon('clock')}<span>Le défi se termine le ${t(jourLong(d.fin))}. Vous pouvez le clôturer dès maintenant : les participations ferment aussitôt. Classement provisoire :</span></p>${corps}<div class="adf-form-foot"><span></span><div><button class="btn btn-primary" type="button" data-adf-action="cloturer">Clôturer maintenant</button></div></div>`;
    if (p === 'a_cloturer') return `<p class="adf-notice is-action">${icon('podium')}<span>Le défi est terminé. Clôturer fige le classement, crédite les points (50, 30 et 20 pour le podium, 5 par participation), attribue les badges et prévient chaque participant.</span></p>${corps}<div class="adf-form-foot"><span></span><div><button class="btn btn-primary" type="button" data-adf-action="cloturer">Clôturer le défi</button></div></div>`;
    return `<p class="adf-notice">${icon('lock')}<span>Clôturé le ${t(jourLong(d.clotureLe || d.fin))} : classement définitif. Rouvrir le défi retire les points et les badges de la clôture jusqu’à la prochaine.</span></p>${corps}<div class="adf-form-foot"><span></span><div><button class="btn btn-secondary" type="button" data-adf-action="rouvrir">Rouvrir le défi</button></div></div>`;
  }
  function rendreFiche(d) {
    const p = phase(d);
    const actions = [
      p === 'brouillon' ? `<button class="btn btn-quiet btn-sm adf-danger" type="button" data-adf-action="supprimer">${icon('close')}Supprimer</button>` : '',
      ['a_venir', 'en_cours', 'a_cloturer'].includes(p) ? `<button class="btn btn-quiet btn-sm adf-danger" type="button" data-adf-action="annuler">Annuler le défi</button>` : '',
      p === 'annule' ? `<button class="btn btn-secondary btn-sm" type="button" data-adf-action="retablir">Rétablir</button>` : '',
      p === 'cloture' ? `<button class="btn btn-secondary btn-sm" type="button" data-adf-action="rouvrir">Rouvrir</button>` : '',
      `<button class="btn btn-secondary btn-sm" type="button" data-adf-action="dupliquer">Dupliquer</button>`,
      d.id === 48 ? `<a class="btn btn-secondary btn-sm" href="defis.html">Voir sur le site${icon('arrow-up-right')}</a>` : '',
      p === 'a_venir' ? `<button class="btn btn-primary btn-sm" type="button" data-adf-action="ouvrir">Ouvrir maintenant</button>` : '',
      p === 'en_cours' ? (enPause(d) ? `<button class="btn btn-primary btn-sm" type="button" data-adf-action="reprendre">${icon('play')}Reprendre les participations</button>` : `<button class="btn btn-secondary btn-sm" type="button" data-adf-action="pause">${icon('pause')}Mettre en pause</button>`) : '',
      ['en_cours', 'a_cloturer'].includes(p) ? `<button class="btn btn-primary btn-sm" type="button" data-adf-action="cloturer">${p === 'en_cours' ? 'Clôturer maintenant' : 'Clôturer'}</button>` : ''
    ].join('');
    const onglets = [['contenu', 'Contenu'], ['participations', `Participations${d.participations.length ? ` <span>${fmt(total(d))}</span>` : ''}${aVerifier(d).length ? ' <i class="adf-dot" aria-label="à vérifier"></i>' : ''}`], ['cloture', 'Clôture']];
    return `<div class="container md-tete adf-tete">
        <button class="adf-retour" type="button" data-adf-liste>${icon('chevron-right')}Tous les défis</button>
        <p class="md-rubrique">${icon('shield')}Administration · Défi de la semaine ${d.semaine}</p>
        <div class="adf-tete-main"><div><h1>${t(d.titre.trim() || 'Nouveau défi')}</h1><p class="adf-tete-meta">${chip(d)}${format(d)}<span>${t(`Du ${jourLong(d.debut)} au ${jourLong(d.fin)}, UTC`)}</span></p></div><div class="adf-tete-actions">${actions}</div></div>
        <div class="adf-tabs" role="tablist">${onglets.map(([cle, nom]) => `<button type="button" role="tab" aria-selected="${vue.onglet === cle}" data-adf-onglet-btn="${cle}">${nom}</button>`).join('')}</div>
      </div>
      <div class="container md-file adf">
        ${vue.onglet === 'contenu' ? `<div class="adf-edit"><div>${formulaire(d)}</div><aside class="adf-apercu" aria-label="Aperçu de la page Défis"><p class="adf-apercu-label">${icon('eye')}Aperçu sur la page Défis</p><div class="adf-apercu-cadre" data-adf-apercu>${apercu(d)}</div></aside></div>`
        : vue.onglet === 'participations' ? participations(d) : cloture(d)}
      </div>`;
  }

  /* Montage et rafraîchissement ------------------------------------------------------------------- */
  function rendre(r) {
    reglages = r;
    const page = $('[data-eq-page]');
    const d = vue.id === 'nouveau' ? vue.brouillon : vue.id ? trouver(vue.id) : null;
    if (vue.id && !d) vue.id = null;
    page.innerHTML = vue.id ? rendreFiche(d) : rendreListe();
    V.fixTypography(page);
  }
  const rafraichir = (focus) => { rendre(reglages); if (focus) $(focus)?.focus({ preventScroll: true }); };
  function ouvrir(id, onglet = 'contenu') {
    vue = { ...vue, id, onglet, brouillon: null };
    history.replaceState(null, '', `#defi-${id}`);
    rafraichir('h1');
    scrollTo({ top: 0 });
  }
  function nouveau(base) {
    const e = etat();
    const fin = Math.max(...e.defis.map(x => new Date(x.fin).getTime()), new Date('2026-12-07T23:59:00Z').getTime());
    const debut = new Date(fin + 60000);
    debut.setUTCHours(0, 0, 0, 0);
    const semaine = Math.max(...e.defis.map(x => x.semaine), 49) + 1;
    const id = Math.max(...e.defis.map(x => x.id), 50) + 1;
    const d = { id, semaine, titre: base ? `${base.titre} (copie)` : '', debut: debut.toISOString(), fin: new Date(debut.getTime() + 7 * MS_JOUR - 60000).toISOString(), statut: 'BROUILLON', format: base?.format || 'PAGE_HTML', nbPromptsMax: base ? base.nbPromptsMax : 1, definition: base?.definition || '', enonce: base?.enonce || '',
      regles: base ? JSON.parse(JSON.stringify(base.regles)) : [{ chiffre: '1', intitule: 'participation', precision: 'Par personne' }], criteres: base ? JSON.parse(JSON.stringify(base.criteres)) : [], criteresCommuns: base ? [...base.criteresCommuns] : [], participations: [] };
    e.defis.push(d);
    garder(e);
    V.toast(base ? 'Défi dupliqué en brouillon.' : 'Brouillon créé : complétez-le, puis publiez-le.');
    ouvrir(id);
    $('#adf-titre')?.focus();
  }
  /* Lit le formulaire dans le défi (sans enregistrer). */
  function lire(d) {
    const f = $('[data-adf-form]');
    if (!f) return d;
    const val = k => $(`[data-k="${k}"]`, f);
    if (!val('titre').disabled) d.titre = val('titre').value;
    if (!val('definition').disabled) d.definition = val('definition').value.trim();
    if (!val('enonce').disabled) d.enonce = val('enonce').value.trim();
    if (!val('debut').disabled) { const v = val('debut').value; if (v) d.debut = depuisSaisie(v); }
    if (!val('fin').disabled) { const v = val('fin').value; if (v) d.fin = depuisSaisie(v); }
    const fmtChoisi = $('input[name="format"]:checked', f);
    if (fmtChoisi && !fmtChoisi.disabled) d.format = fmtChoisi.value;
    if (!val('nbPromptsMax').disabled) d.nbPromptsMax = val('nbPromptsMax').value ? Number(val('nbPromptsMax').value) : null;
    $$('[data-adf-regle]', f).forEach((li, i) => { if (!$('input', li).disabled) d.regles[i] = { chiffre: $('[data-k="chiffre"]', li).value.trim(), intitule: $('[data-k="intitule"]', li).value.trim(), precision: $('[data-k="precision"]', li).value.trim() }; });
    $$('[data-adf-critere]', f).forEach((li, i) => { if (!$('input', li).disabled) d.criteres[i] = { icone: $('[data-k="icone"]', li).value, libelle: $('[data-k="libelle"]', li).value.trim() }; });
    return d;
  }
  function majApercu() {
    const d = vue.id ? trouver(vue.id) : null;
    if (!d) return;
    const copie = lire(JSON.parse(JSON.stringify(d)));
    $('[data-adf-apercu]').innerHTML = apercu(copie);
    $$('[data-adf-critere]').forEach((li, i) => { const ic = $('.adf-crit-icon', li); if (ic && copie.criteres[i]) ic.innerHTML = icon(copie.criteres[i].icone, 'icon'); });
    V.fixTypography($('[data-adf-apercu]'));
    const etatSaisie = $('[data-adf-etat-saisie]');
    if (etatSaisie) { etatSaisie.innerHTML = `${icon('pen')}Modifications non enregistrées`; etatSaisie.classList.add('is-sale'); }
  }
  /* Un seul défi à la fois : la page Défis montre le défi de la semaine (règle proposée, à valider). */
  const chevauche = d => etat().defis.find(x => x.id !== d.id && ['PUBLIE', 'CLOTURE'].includes(x.statut) && new Date(x.debut) < new Date(d.fin) && new Date(d.debut) < new Date(x.fin));
  function erreurs(d, publication = false) {
    const f = $('[data-adf-form]');
    const m = manques(d);
    const autre = publication ? chevauche(d) : null;
    if (autre) m.push(['dates', `Ces dates chevauchent « ${autre.titre} » (${periode(autre)}) : un seul défi à la fois.`]);
    if (publication && d.statut === 'PUBLIE' && d.participations.length && new Date(d.debut) > maintenant()) m.push(['debut', 'Des participations sont déjà publiées : le début reste avant aujourd’hui.']);
    const parChamp = {};
    m.forEach(([c, msg]) => { if (!parChamp[c]) parChamp[c] = msg; });
    if (f) AC.afficherErreurs(f, parChamp);
    return m;
  }
  function enregistrer(publier = false) {
    const e = etat();
    const d = e.defis.find(x => x.id === vue.id);
    lire(d);
    const m = publier || d.statut !== 'BROUILLON' ? erreurs(d, true) : erreurs({ ...d, enonce: d.enonce || 'x'.repeat(20), regles: d.regles.length ? d.regles : [{ chiffre: '1', intitule: 'x' }], criteres: d.criteres.length ? d.criteres : [{ libelle: 'x' }] });
    if (m.length) { $('[data-adf-form] [aria-invalid="true"]')?.focus(); V.toast(publier ? 'Le défi n’est pas encore prêt à être publié.' : 'Vérifiez les champs signalés.', 'alert'); return; }
    if (publier) {
      AC.confirmer('Publier ce défi ?', new Date(d.debut) > maintenant() ? `« ${d.titre} » sera visible dès maintenant et ouvrira le ${jourLong(d.debut)}. Ses dates et ses règles ne changeront plus une fois commencé.` : `« ${d.titre} » ouvre tout de suite aux participations.`, 'Publier', () => {
        d.statut = 'PUBLIE';
        garder(e);
        V.toast(new Date(d.debut) > maintenant() ? 'Défi publié et programmé.' : 'Défi publié.');
        rafraichir('h1');
      });
      return;
    }
    garder(e);
    V.toast('Défi enregistré.');
    rafraichir('[data-adf-enregistrer]');
  }
  function action(quoi) {
    const e = etat();
    const d = e.defis.find(x => x.id === vue.id);
    if (!d) return;
    const Q = {
      annuler: ['Annuler ce défi ?', `« ${d.titre} » : les participations sont fermées et le défi ne sera pas classé. Cette action est définitive.`, 'Annuler le défi', () => { d.statut = 'ANNULE'; delete d.pause; }, 'Défi annulé.'],
      supprimer: ['Supprimer ce brouillon ?', `« ${d.titre || 'Sans titre'} » disparaît définitivement.`, 'Supprimer', () => { e.defis = e.defis.filter(x => x.id !== d.id); vue.id = null; history.replaceState(null, '', location.pathname); }, 'Brouillon supprimé.'],
      cloturer: [phase(d) === 'en_cours' ? 'Clôturer ce défi maintenant ?' : 'Clôturer ce défi ?', `${phase(d) === 'en_cours' ? `« ${d.titre} » devait se terminer le ${jourLong(d.fin)}. Les participations ferment dès maintenant ; le` : `« ${d.titre} » : le`} classement est figé, les points et les badges sont crédités, chaque participant reçoit une notification.`, 'Clôturer', () => { delete d.pause; if (phase(d) === 'en_cours') d.fin = minute().toISOString(); d.podiumFige = classement(d).slice(0, 3).map(x => ({ ...x })); d.statut = 'CLOTURE'; d.clotureLe = maintenant().toISOString(); }, 'Défi clôturé : le classement est publié.'],
      pause: ['Mettre ce défi en pause ?', `Plus personne ne peut publier ni modifier de participation pour « ${d.titre} ». La page Défis indique la pause ; les participations publiées restent visibles et les votes continuent. Le compte à rebours continue aussi : prolongez la fin si besoin.`, 'Mettre en pause', () => { d.pause = { depuis: maintenant().toISOString() }; }, 'Défi en pause : les participations sont fermées.'],
      reprendre: ['Reprendre les participations ?', `« ${d.titre} » accepte de nouveau les participations, jusqu’au ${jourLong(d.fin)}.`, 'Reprendre', () => { delete d.pause; }, 'Participations rouvertes.'],
      ouvrir: ['Ouvrir ce défi maintenant ?', `« ${d.titre} » devait ouvrir le ${jourLong(d.debut)}. Les participations sont acceptées dès maintenant, jusqu’au ${jourLong(d.fin)}.`, 'Ouvrir', () => { d.debut = minute().toISOString(); }, 'Défi ouvert aux participations.'],
      rouvrir: ['Rouvrir ce défi ?', `« ${d.titre} » : le classement n’est plus figé, les points et les badges de la clôture sont retirés jusqu’à la prochaine. Repoussez la fin pour accepter de nouvelles participations.`, 'Rouvrir', () => { d.statut = 'PUBLIE'; delete d.podiumFige; delete d.clotureLe; }, 'Défi rouvert : ajustez ses dates si besoin.'],
      retablir: ['Rétablir ce défi ?', `« ${d.titre} » redevient visible ; selon ses dates, il est programmé, en cours ou à clôturer.`, 'Rétablir', () => { d.statut = 'PUBLIE'; }, 'Défi rétabli.']
    };
    if (quoi === 'dupliquer') return nouveau(d);
    if (quoi === 'ouvrir' && (new Date(d.fin) - minute()) / MS_JOUR > 30) { V.toast('Ouvert maintenant, le défi durerait plus de 30 jours : avancez d’abord sa fin.', 'alert'); return; }
    const autre = quoi === 'ouvrir' ? chevauche({ ...d, debut: minute().toISOString() }) : quoi === 'retablir' || quoi === 'rouvrir' ? chevauche(d) : null;
    if (autre) { V.toast(`« ${autre.titre} » occupe déjà ces dates (${periode(autre)}) : un seul défi à la fois.`, 'alert'); return; }
    const [titre, texte, libelle, faire, message] = Q[quoi];
    AC.confirmer(titre, texte, libelle, () => { faire(); garder(e); V.toast(message); if (quoi === 'rouvrir') vue.onglet = 'contenu'; rafraichir('h1'); }, ['annuler', 'supprimer'].includes(quoi));
  }
  function participation(quoi, id) {
    const e = etat();
    const d = e.defis.find(x => x.id === vue.id);
    const p = d?.participations.find(x => x.id === id);
    if (!p) return;
    const Q = {
      autoriser: ['Autoriser cette participation ?', `« ${p.titre} » devient visible et jouable. Le code reste isolé du site.`, 'Autoriser', () => { p.etat = 'visible'; delete p.motif; }, 'Participation autorisée.', false],
      refuser: ['Refuser cette participation ?', `« ${p.titre} » est retirée du défi ; ${p.m} reçoit une notification avec le motif.`, 'Refuser', () => { d.participations = d.participations.filter(x => x.id !== id); if (d.total) d.total -= 1; }, 'Participation refusée.', true],
      masquer: ['Masquer cette participation ?', `« ${p.titre} » n’est plus visible${phase(d) === 'cloture' ? ' ; le classement figé ne change pas' : ' ni classée tant qu’elle est masquée'}. ${p.m} reçoit une notification.`, 'Masquer', () => { if (phase(d) === 'cloture' && !d.podiumFige) d.podiumFige = classement(d).slice(0, 3).map(x => ({ ...x })); p.etat = 'masquee'; }, 'Participation masquée.', true],
      retablir: ['Rétablir cette participation ?', `« ${p.titre} » redevient visible et reprend sa place au classement.`, 'Rétablir', () => { p.etat = 'visible'; }, 'Participation rétablie.', false]
    };
    const [titre, texte, libelle, faire, message, danger] = Q[quoi];
    AC.confirmer(titre, texte, libelle, () => { faire(); garder(e); V.toast(message); rafraichir('[data-adf-onglet-btn="participations"]'); }, danger);
  }

  /* Événements ------------------------------------------------------------------------------------- */
  document.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || !b.closest('[data-eq-page]')) return;
    if (b.dataset.adfFiltre) { vue.filtre = b.dataset.adfFiltre; rafraichir(`[data-adf-filtre="${vue.filtre}"]`); return; }
    if (b.hasAttribute('data-adf-nouveau')) return nouveau(null);
    if (b.dataset.adfOuvrir) return ouvrir(Number(b.dataset.adfOuvrir), b.dataset.adfOnglet || 'contenu');
    if (b.hasAttribute('data-adf-liste')) { vue.id = null; history.replaceState(null, '', location.pathname); rafraichir('h1'); return; }
    if (b.dataset.adfOngletBtn) { if (vue.onglet === 'contenu') { const d = trouver(vue.id); if (d) lire(d); } vue.onglet = b.dataset.adfOngletBtn; rafraichir(`[data-adf-onglet-btn="${vue.onglet}"]`); return; }
    if (b.hasAttribute('data-adf-publier')) return enregistrer(true);
    if (b.dataset.adfAction) return action(b.dataset.adfAction);
    if (b.dataset.adfPart) return participation(b.dataset.adfPart, b.dataset.p);
    const d = vue.id ? trouver(vue.id) : null;
    if (!d) return;
    const e = etat(), dd = e.defis.find(x => x.id === d.id);
    if (b.dataset.adfAjouter) { lire(dd); dd[b.dataset.adfAjouter].push(b.dataset.adfAjouter === 'regles' ? { chiffre: '', intitule: '', precision: '' } : { icone: 'award', libelle: '' }); garder(e); rafraichir(); const rows = $$(b.dataset.adfAjouter === 'regles' ? '[data-adf-regle] input' : '[data-adf-critere] input'); (b.dataset.adfAjouter === 'regles' ? rows[rows.length - 3] : rows[rows.length - 1])?.focus(); return; }
    if (b.dataset.adfRetirer) { lire(dd); dd[b.dataset.adfRetirer].splice(Number(b.dataset.i), 1); garder(e); rafraichir(); return; }
    if (b.dataset.adfMonter) { lire(dd); const l = dd[b.dataset.adfMonter], i = Number(b.dataset.i); [l[i - 1], l[i]] = [l[i], l[i - 1]]; garder(e); rafraichir(); return; }
  });
  document.addEventListener('submit', ev => { if (!ev.target.closest('[data-adf-form]')) return; ev.preventDefault(); enregistrer(false); });
  document.addEventListener('input', ev => { if (ev.target.closest('[data-adf-form]') && !ev.target.matches('[data-adf-commun]')) majApercu(); });
  document.addEventListener('change', ev => { if (ev.target.closest('[data-adf-form]')) majApercu(); });
  document.addEventListener('keydown', ev => {
    if (!ev.target.matches('[data-adf-commun]') || ev.key !== 'Enter') return;
    ev.preventDefault();
    const valeur = ev.target.value.trim();
    if (!valeur) return;
    const e = etat(), d = e.defis.find(x => x.id === vue.id);
    lire(d);
    if (!d.criteresCommuns.includes(valeur)) d.criteresCommuns.push(valeur);
    garder(e);
    rafraichir('[data-adf-commun]');
  });

  /* Adresse : #defi-48 ouvre la fiche. */
  const cible = /^#defi-(\d+)$/.exec(location.hash);
  if (cible) vue.id = Number(cible[1]);

  AC.monter({
    cle: 'vysora-administration-defis-reglages-v2',
    etats: [{ name: 'defis', legend: 'Défis', options: [['liste', 'Défis à gérer'], ['vide', 'Aucun défi']] }],
    defaults: { defis: 'liste' },
    quoi: 'gérer les défis',
    titre: 'Défis · Administration · Vysora',
    rendre
  });
})();
