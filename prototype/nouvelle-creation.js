'use strict';

/* Page Publier (EC-05) : une seule page, trois blocs.
   Le résultat, sous toutes ses formes (texte, code, fichier ou média, lien).
   Le chemin parcouru : les prompts dans l'ordre, avec leur outil, et des étapes pour un projet.
   À savoir : limites et conseils pour refaire la création.
   Le type de création (1 prompt, Itération, Projet) se déduit du chemin parcouru.
   Le panneau latéral liste ce qui reste à faire, porte les réglages de publication
   et le bouton Publier. Le brouillon est privé et s'enregistre sur l'appareil. */

(() => {
  const V = window.Vysora;
  const P = window.VYSORA_PUBLIER;
  if (!V || !P) return;
  const G = window.VysoraGuides || null;
  const E = V.etats;
  const { D, $, $$, esc, t, typo, plural, icon, logo } = V;
  const params = new URLSearchParams(location.search);

  /* Référentiels ------------------------------------------------------- */

  const TYPES = {
    prompt: { label: '1 prompt', sens: 'Un seul prompt a suffi.' },
    iteration: { label: 'Itération', sens: 'Plusieurs prompts dans une même conversation.' },
    projet: { label: 'Projet', sens: 'Plusieurs étapes ou plusieurs outils.' }
  };
  const SORTES = {
    texte: { label: 'Texte', icone: 'doc' },
    code: { label: 'Code', icone: 'code' },
    fichier: { label: 'Fichier ou média', icone: 'paperclip' },
    lien: { label: 'Lien', icone: 'link' }
  };
  const MOMENT = Object.fromEntries(P.moments.map(m => [m.id, m]));
  const FAMILLES = D.toolFamilies.filter(f => f.id !== 'all');
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const FICHE = 'fiche-creation.html?id=ma-creation';
  const CLE_FICHE = 'vysora-publier-fiche';
  const TAILLE_MAX = 10 * 1024 * 1024;
  const FICHIERS_MAX = 20;

  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const jour = (iso, annee = true) => { const [y, m, j] = iso.slice(0, 10).split('-').map(Number); return `${j === 1 ? '1er' : j} ${MOIS[m - 1]}${annee ? ` ${y}` : ''}`; };
  const heure = iso => { const [h, mi] = iso.slice(11, 16).split(':'); return `${Number(h)} h ${mi}`; };
  const maintenant = () => { const n = new Date(); return `${D.today}T${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
  const extrait = (txt, n = 96) => { const s = String(txt || '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
  const reEchap = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const longueur = s => String(s || '').trim().length;
  const idDe = cle => `f-${cle.replace(/[^\w-]/g, '-')}`;
  const poids = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`);
  const genre = mime => (/^image\//.test(mime) ? 'image' : /^video\//.test(mime) ? 'video' : /^audio\//.test(mime) ? 'audio' : 'autre');

  /* Brouillon ------------------------------------------------------------
     resultats : ce que l'IA a permis d'obtenir.
     chemin : prompts (outil, modèle, réglages, réponse, fichiers) et étapes, dans l'ordre.
     Un moment clé se rattache à un prompt ou à une étape. */

  let d = null;
  const nid = (b, p) => `${p}${++b.seq}`;
  const nouveauPrompt = (b, o = {}) => ({ id: nid(b, 'p'), kind: 'prompt', outil: '', modele: '', reglages: '', prompt: '', reponse: '', fichiers: [], moment: null, ouvert: {}, ...o });
  const nouvelleEtape = (b, o = {}) => ({ id: nid(b, 'e'), kind: 'etape', titre: '', texte: '', moment: null, ...o });
  const nouveauResultat = (b, kind, o = {}) => ({ id: nid(b, 'r'), kind, texte: '', nom: '', src: '', mime: '', taille: 0, alt: '', url: '', libelle: '', type: '', portrait: false, ...o });
  function nouveauBrouillon() {
    const b = { v: 3, seq: 0, scenario: '', titre: '', objectif: '', resultats: [], chemin: [], limites: '', categorie: '', etiquettes: [], licence: 'CC BY 4.0', defi: null, agent: null, statut: 'brouillon', publieLe: null, modifieLe: null, decisions: {} };
    b.chemin.push(nouveauPrompt(b));
    return b;
  }

  const prompts = () => d.chemin.filter(x => x.kind === 'prompt');
  const etapesChemin = () => d.chemin.filter(x => x.kind === 'etape');
  const fichiersChemin = () => prompts().flatMap(p => p.fichiers);
  const tousFichiers = () => [...d.resultats.filter(r => r.kind === 'fichier'), ...fichiersChemin()];
  function trouver(id) {
    return d.resultats.find(r => r.id === id) || d.chemin.find(x => x.id === id) || fichiersChemin().find(f => f.id === id) || null;
  }
  function lireChamp(cle) {
    const [k, id, prop] = cle.split(':');
    if (!id) return d[k] ?? '';
    if (k === 'm') return trouver(id)?.moment?.texte ?? '';
    if (k === 'mt') return trouver(id)?.moment?.type ?? '';
    const o = trouver(id);
    return o ? o[prop] ?? '' : '';
  }
  function ecrireChamp(cle, valeur) {
    const [k, id, prop] = cle.split(':');
    if (!id) { d[k] = valeur; return; }
    const o = trouver(id);
    if (!o) return;
    if (k === 'm') { if (o.moment) o.moment.texte = valeur; return; }
    if (k === 'mt') { if (o.moment) o.moment.type = valeur; return; }
    o[prop] = valeur;
  }

  /* Le type se déduit du chemin : un prompt, plusieurs prompts avec le même outil,
     ou des étapes et plusieurs outils. */
  function typeDe(b = d) {
    const ps = b.chemin.filter(x => x.kind === 'prompt');
    const es = b.chemin.filter(x => x.kind === 'etape');
    if (!es.length && !ps.some(p => longueur(p.prompt))) return null;
    const outils = new Set(ps.map(p => p.outil).filter(Boolean));
    if (es.length || outils.size > 1) return 'projet';
    return ps.length >= 2 ? 'iteration' : 'prompt';
  }

  /* Type de lien d'après son adresse. */
  function typeLien(url) {
    const u = String(url).toLowerCase();
    if (/github\.com|gitlab\.com|bitbucket\.org|huggingface\.co/.test(u)) return 'depot';
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(u)) return 'video';
    if (/chatgpt\.com\/share|chat\.openai\.com\/share|claude\.ai\/share|g\.co\/gemini|gemini\.google\.com\/share|midjourney\.com\/jobs|perplexity\.ai\/search/.test(u)) return 'preuve';
    if (/medium\.com|substack\.com|\/blog\//.test(u)) return 'article';
    return u ? 'demo' : '';
  }
  const LIBELLE_LIEN = Object.fromEntries(P.liens);

  /* Import d'une conversation copiée ------------------------------------
     Motifs prédéfinis (nouvelle-creation-data.js), sans appel à un modèle (C-02). */

  const M = P.motifs;
  const MODELES = Object.entries(P.modeles).flatMap(([outil, liste]) => liste.map(modele => ({ outil, modele, re: new RegExp(`(^|[^\\w])${reEchap(modele)}(?!\\w|\\.\\d)`, 'i') })))
    .sort((a, b) => b.modele.length - a.modele.length);
  const ALIAS = Object.entries(D.toolAliases).map(([alias, outil]) => ({ alias, outil, re: new RegExp(`(^|[^\\w])${reEchap(alias)}(?![\\w])`, 'i') }));

  function decouper(texte) {
    const lignes = String(texte).replace(/\r\n?/g, '\n').split('\n');
    const blocs = [];
    let bloc = null;
    let marques = 0;
    const ouvrir = (role, outil, debut) => { bloc = { role, outil, lignes: debut ? [debut] : [] }; blocs.push(bloc); };
    lignes.forEach(ligne => {
      let m = ligne.match(M.midjourney);
      if (m) { marques += 1; ouvrir('user', 'Midjourney', m[1]); return; }
      m = ligne.match(M.utilisateur);
      if (m) { marques += 1; ouvrir('user', null, m[1]); return; }
      m = ligne.match(M.assistant);
      if (m) { marques += 1; ouvrir('ai', M.libelles[m[1].toLowerCase()] || null, m[2]); return; }
      if (M.image.test(ligne)) return;
      if (!bloc) ouvrir('user', null, '');
      bloc.lignes.push(ligne);
    });
    const echanges = [];
    if (!marques) {
      const seul = String(texte).trim();
      if (seul) echanges.push({ prompt: seul, reponse: '', outil: null });
    } else {
      blocs.forEach(b => {
        const contenu = b.lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if (b.role === 'user') { echanges.push({ prompt: contenu, reponse: '', outil: b.outil }); return; }
        if (!echanges.length) echanges.push({ prompt: '', reponse: '', outil: null });
        const dernier = echanges[echanges.length - 1];
        dernier.reponse = dernier.reponse ? `${dernier.reponse}\n\n${contenu}` : contenu;
        if (b.outil) dernier.outil = b.outil;
      });
    }
    const textePrompts = echanges.map(e => e.prompt).join('\n');
    const reglages = [...new Set(M.reglages.flatMap(re => textePrompts.match(new RegExp(re.source, re.flags)) || []).map(s => s.trim()))];
    const rec = reconnaitre(String(texte), echanges.map(e => e.outil).find(Boolean));
    return { echanges, sansMarqueur: !marques && !!echanges.length, reglages: reglages.join(' '), outil: rec.outil, modele: rec.modele };
  }
  /* Outil et modèle cités : libellé de l'interlocuteur, nom du modèle, alias, paramètre Midjourney. */
  function reconnaitre(texte, outilConnu) {
    let outil = outilConnu || null;
    let modele = '';
    const v = texte.match(/--v\s+([\d.]+)/i);
    const niji = texte.match(/--niji\s+(\d+)/i);
    if (outil === 'Midjourney' || v || niji) { outil = outil || 'Midjourney'; if (niji) modele = `Niji ${niji[1]}`; else if (v) modele = `v${v[1]}`; }
    if (!modele) {
      const candidats = MODELES.filter(m => m.re.test(texte));
      const choix = candidats.find(m => m.outil === outil) || (!outil && candidats[0]);
      if (choix) { modele = choix.modele; outil = outil || choix.outil; }
    }
    if (!outil) { const a = ALIAS.find(x => x.re.test(texte)); if (a) outil = a.outil; }
    if (!outil) { const n = D.tools.find(tool => new RegExp(`(^|[^\\w])${reEchap(tool.name)}(?![\\w])`).test(texte)); if (n) outil = n.name; }
    return { outil, modele };
  }

  /* Catégorie proposée d'après le résultat et les outils, tant que l'auteur n'en a pas choisi. */
  function categorieProposee() {
    if (d.resultats.some(r => r.kind === 'code')) return 'Code et scripts';
    const f = d.resultats.find(r => r.kind === 'fichier');
    if (f && genre(f.mime) === 'video') return 'Vidéo';
    if (f && genre(f.mime) === 'audio') return 'Musique et son';
    const outil = prompts().map(p => p.outil).find(Boolean);
    const tool = outil && V.TOOL_BY_NAME[outil];
    const parOutil = tool ? (P.categorieParOutil[outil] || P.categorieParFamille[tool.family] || '') : '';
    if (parOutil) return parOutil;
    if (f && genre(f.mime) === 'image') return 'Image et illustration';
    if (d.resultats.some(r => r.kind === 'texte')) return 'Texte et rédaction';
    return '';
  }

  /* États du panneau Tweaks : nouvelle création, brouillon repris, création publiée.
     Les brouillons d'exemple sont ceux de nouvelle-creation-data.js. */
  const cleScenario = s => (s.contenu === 'vide' ? 'vide' : [s.contenu, s.exemple, s.donnees, s.exemple === 'projet' ? s.agent : 'aucune'].join(':'));
  function construire(s) {
    if (s.contenu === 'vide') { const b = nouveauBrouillon(); b.scenario = cleScenario(s); return b; }
    const ex = P.exemples[s.exemple] || P.exemples.iteration;
    const sensible = s.donnees === 'reperees';
    const agent = s.exemple === 'projet' && s.agent === 'reperees';
    const b = nouveauBrouillon();
    b.chemin = [];
    Object.assign(b, { scenario: cleScenario(s), titre: typo(ex.titre), objectif: typo(ex.objectif), categorie: ex.categorie, etiquettes: [...ex.etiquettes], licence: ex.licence, limites: typo(ex.limites), modifieLe: ex.modifie });
    b.resultats = ex.resultats.map(r => nouveauResultat(b, r.kind, { ...r, texte: r.kind === 'code' ? r.texte : typo(r.texte || ''), alt: typo(r.alt || '') }));
    ex.chemin.forEach(x => {
      if (x.kind === 'etape') {
        b.chemin.push(nouvelleEtape(b, { titre: typo(x.titre), texte: typo((s.contenu === 'publiee' && x.textePublie) || x.texte || ''), moment: x.moment ? { type: x.moment.type, texte: typo(x.moment.texte) } : null }));
        return;
      }
      const prompt = typo((agent && x.agent) || (sensible && x.sensible) || x.prompt);
      const reponse = typo((agent && x.agentReponse) || x.reponse || '');
      b.chemin.push(nouveauPrompt(b, {
        outil: (agent && x.outilAgent) || x.outil, modele: x.modele || '', reglages: x.reglages || '', prompt, reponse,
        fichiers: (x.fichiers || []).map(f => nouveauResultat(b, 'fichier', { ...f, alt: typo(f.alt) })),
        moment: x.moment ? { type: x.moment.type, texte: typo(x.moment.texte) } : null,
        ouvert: {}
      }));
    });
    if (s.contenu === 'publiee') { b.statut = 'publiee'; b.publieLe = ex.publie ? `${ex.publie}T18:20` : ex.modifie; }
    return b;
  }

  /* Modifier une création déjà publiée (lien « Modifier » de la fiche). */
  function depuisCreation(id) {
    if (id === 'ma-creation') {
      const enr = V.store.get(CLE_FICHE, null);
      return enr && enr.page && enr.page.v === 3 ? enr.page : null;
    }
    const X = window.VYSORA_EXPLORER;
    const c = X && X.creations.find(k => k.id === id);
    if (!c) return null;
    const det = (window.VYSORA_CREATION_DETAILS || {})[id] || {};
    const b = nouveauBrouillon();
    b.chemin = [];
    const categorie = D.categories.find(k => k.name === c.category || k.name.startsWith(c.category)) || D.categories.find(k => k.name === c.domain);
    Object.assign(b, { scenario: `id:${id}`, titre: c.title, objectif: c.objective, categorie: categorie ? categorie.name : '', etiquettes: c.tags.slice(0, 5), statut: 'publiee', publieLe: `${c.date}T12:00`, modifieLe: `${c.date}T12:00` });
    const [outil, modele] = c.tools[0] || ['', ''];
    const etapesDet = det.steps || [];
    if (c.type === 'projet') {
      (c.steps || etapesDet.map(st => st[0])).forEach((nom, i) => {
        b.chemin.push(nouvelleEtape(b, { titre: nom, texte: (etapesDet[i] && etapesDet[i][2]) || '' }));
        const p = etapesDet[i] && etapesDet[i][1];
        const outilEtape = c.tools[Math.min(i, c.tools.length - 1)] || [outil, modele];
        if (p) b.chemin.push(nouveauPrompt(b, { outil: outilEtape[0], modele: outilEtape[1] || '', prompt: p }));
      });
    } else {
      const liste = c.type === 'iteration' && etapesDet.length ? etapesDet : [[null, c.prompt || det.prompt || '', det.note || '']];
      liste.forEach(([, prompt, rep]) => b.chemin.push(nouveauPrompt(b, { outil, modele: modele || '', prompt, reponse: rep || '', ouvert: { reponse: !!rep } })));
    }
    const cibles = b.chemin.filter(x => x.kind === 'prompt');
    c.moments.forEach((m, i) => {
      const x = cibles[Math.max(0, Math.min(cibles.length - 1, cibles.length - c.moments.length + i))];
      const type = P.moments.find(k => k.label === m.type);
      if (x && type && !x.moment) x.moment = { type: type.id, texte: m.text };
    });
    if (c.media && c.media.kind === 'image') b.resultats = [nouveauResultat(b, 'fichier', { src: `assets/images/${c.media.name}-720.webp`, grand: `assets/images/${c.media.name}-1280.webp`, nom: `${c.media.name}.webp`, mime: 'image/webp', alt: c.media.alt })];
    if (!b.chemin.length) b.chemin.push(nouveauPrompt(b));
    return b;
  }

  /* Forme attendue par la fiche de création (fiche-brouillon.js) : étapes, configurations, échanges. */
  function versFiche(b = d) {
    const type = typeDe(b) || 'prompt';
    const ech = p => ({ prompt: p.prompt, reponse: p.reponse, images: p.fichiers.filter(f => genre(f.mime) === 'image'), essais: 1, selection: 'premier', garde: true, config: null, moment: p.moment && longueur(p.moment.texte) ? p.moment : null });
    const cfg = p => ({ outil: p.outil, modele: p.modele, reglages: p.reglages, contexte: '' });
    const ps = b.chemin.filter(x => x.kind === 'prompt' && longueur(x.prompt));
    let etapes;
    if (type !== 'projet') {
      etapes = [{ titre: '', recit: '', configs: ps[0] ? [cfg(ps[0])] : [], echanges: ps.map(ech), moment: null }];
    } else {
      etapes = [];
      let courante = null;
      const avecEtapes = b.chemin.some(x => x.kind === 'etape');
      b.chemin.forEach(x => {
        if (x.kind === 'etape') { courante = { titre: x.titre, recit: x.texte, configs: [], echanges: [], moment: x.moment && longueur(x.moment.texte) ? x.moment : null }; etapes.push(courante); return; }
        if (!longueur(x.prompt)) return;
        if (!courante || (!avecEtapes && courante.configs[0] && courante.configs[0].outil !== x.outil)) {
          courante = { titre: avecEtapes ? 'Point de départ' : `Avec ${x.outil || 'un outil'}`, recit: '', configs: [], echanges: [], moment: null };
          etapes.push(courante);
        }
        if (x.outil && !courante.configs.some(c => c.outil === x.outil)) courante.configs.push(cfg(x));
        courante.echanges.push(ech(x));
      });
    }
    const images = b.resultats.filter(r => r.kind === 'fichier' && genre(r.mime) === 'image' && r.src);
    const textuel = b.resultats.find(r => (r.kind === 'texte' || r.kind === 'code') && longueur(r.texte));
    const autre = b.resultats.find(r => r.kind === 'fichier' && genre(r.mime) !== 'image');
    const agentRep = !!agentRepere(b);
    return {
      v: 3, type, titre: b.titre, objectif: b.objectif, categorie: b.categorie, etiquettes: b.etiquettes, licence: b.licence, limites: b.limites,
      agent: b.agent === null ? agentRep : b.agent, defi: b.defi, statut: b.statut, publieLe: b.publieLe, modifieLe: b.modifieLe,
      medias: images.map(r => ({ src: r.src, grand: r.grand, alt: r.alt, nom: r.nom, portrait: r.portrait })),
      liens: b.resultats.filter(r => r.kind === 'lien' && longueur(r.url)).map(r => ({ type: r.type || typeLien(r.url), url: r.url, libelle: r.libelle })),
      resultatTexte: !images.length && textuel ? { kind: textuel.kind, texte: textuel.texte, nom: textuel.nom } : (!images.length && autre ? { kind: 'fichier', texte: '', nom: autre.nom, mime: autre.mime } : null),
      etapes
    };
  }

  /* Vérifications --------------------------------------------------------- */

  let S = {};
  let publieesIci = 0;
  const limiteCreations = () => E.limite('creations');
  const utilisees = () => (S.quota === 'atteint' ? limiteCreations() : (P.quota.utilisees[E.get().niveau] ?? 0));
  const restantes = () => (Number.isFinite(limiteCreations()) ? Math.max(0, limiteCreations() - utilisees() - publieesIci) : Infinity);
  const limiteLiens = () => (E.get().role === 'membre' && E.get().niveau === 'curieux' ? 2 : 10);
  const lienValide = url => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(String(url).trim());
  const momentNote = x => x.moment && longueur(x.moment.texte) >= 20;

  /* Erreurs par champ, dans l'ordre de la page : clé → { groupe, message }. */
  function valider() {
    const err = new Map();
    const add = (groupe, cle, message) => { if (!err.has(cle)) err.set(cle, { groupe, message }); };
    const lt = longueur(d.titre);
    if (lt < 10) add('presentation', 'titre', lt ? `Le titre doit compter au moins 10 caractères (${lt} pour l’instant).` : 'Donnez un titre à la création.');
    const lo = longueur(d.objectif);
    if (lo < 20) add('presentation', 'objectif', lo ? `Décrivez l’objectif en 20 caractères au moins (${lo} pour l’instant).` : 'Dites ce que vous vouliez obtenir.');

    if (!d.resultats.length) add('resultat', 'resultats', 'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.');
    d.resultats.forEach(r => {
      if ((r.kind === 'texte' || r.kind === 'code') && !longueur(r.texte)) add('resultat', `r:${r.id}:texte`, r.kind === 'code' ? 'Collez le code obtenu, ou retirez ce bloc.' : 'Collez le texte obtenu, ou retirez ce bloc.');
      if (r.kind === 'fichier' && ['image', 'video'].includes(genre(r.mime)) && !longueur(r.alt)) add('resultat', `r:${r.id}:alt`, `Décrivez ${genre(r.mime) === 'video' ? 'la vidéo' : 'l’image'} « ${extrait(r.nom, 40)} » pour les personnes qui ne la voient pas.`);
      if (r.kind === 'lien') {
        if (!longueur(r.url)) add('resultat', `r:${r.id}:url`, 'Saisissez l’adresse du lien, ou retirez-le.');
        else if (!lienValide(r.url)) add('resultat', `r:${r.id}:url`, 'L’adresse doit commencer par https://.');
      }
    });
    const nLiens = d.resultats.filter(r => r.kind === 'lien').length;
    if (nLiens > limiteLiens()) add('resultat', 'resultats', `Gardez ${limiteLiens()} liens au plus à votre niveau.`);

    const ps = prompts();
    if (!ps.some(p => longueur(p.prompt) && p.outil)) add('chemin', 'chemin', 'Ajoutez au moins un prompt, avec l’outil utilisé.');
    let n = 0;
    let e = 0;
    d.chemin.forEach(x => {
      if (x.kind === 'prompt') {
        n += 1;
        if (!longueur(x.prompt)) add('chemin', `b:${x.id}:prompt`, `Collez le texte du prompt ${n}, ou retirez-le.`);
        if (!x.outil) add('chemin', `o:${x.id}`, `Choisissez l’outil du prompt ${n}.`);
        x.fichiers.forEach(f => { if (['image', 'video'].includes(genre(f.mime)) && !longueur(f.alt)) add('chemin', `r:${f.id}:alt`, `Décrivez le fichier joint au prompt ${n}.`); });
        if (x.moment && longueur(x.moment.texte) < 20) add('chemin', `m:${x.id}`, longueur(x.moment.texte) ? `Prompt ${n} : expliquez le moment clé en 20 caractères au moins.` : `Prompt ${n} : expliquez le moment clé.`);
      } else {
        e += 1;
        if (longueur(x.titre) < 5) add('chemin', `b:${x.id}:titre`, longueur(x.titre) ? `Le titre de l’étape ${e} doit compter au moins 5 caractères.` : `Donnez un titre à l’étape ${e}.`);
        if (x.moment && longueur(x.moment.texte) < 20) add('chemin', `m:${x.id}`, `Étape ${e} : expliquez le moment clé en 20 caractères au moins.`);
      }
    });

    if (!d.categorie) add('categorie', 'categorie', 'Choisissez une catégorie.');
    if (d.defi === P.defi.id && ps.length > P.defi.maxEchanges) add('defi', 'defi', `Le défi admet ${P.defi.maxEchanges} prompts au plus ; votre chemin en compte ${ps.length}.`);
    return err;
  }

  function champsTexte(b = d) {
    const out = [['titre', b.titre], ['objectif', b.objectif], ['limites', b.limites]];
    b.resultats.forEach(r => { if (r.kind === 'texte' || r.kind === 'code') out.push([`r:${r.id}:texte`, r.texte]); if (r.kind === 'lien') out.push([`r:${r.id}:url`, r.url]); });
    b.chemin.forEach(x => {
      if (x.kind === 'prompt') out.push([`b:${x.id}:prompt`, x.prompt], [`b:${x.id}:reponse`, x.reponse], [`b:${x.id}:reglages`, x.reglages]);
      else out.push([`b:${x.id}:titre`, x.titre], [`b:${x.id}:texte`, x.texte]);
      if (x.moment) out.push([`m:${x.id}`, x.moment.texte]);
    });
    return out.filter(([, v]) => v);
  }
  /* Données sensibles (F-18) : signalées sous le champ concerné ; l'auteur masque ou conserve. */
  function sensibles(cle) {
    const items = [];
    champsTexte().filter(([k]) => !cle || k === cle).forEach(([k, v]) => {
      const pris = [];
      M.sensibles.forEach(motif => {
        const re = new RegExp(motif.re.source, motif.re.flags);
        let m;
        while ((m = re.exec(v))) {
          const a = m.index;
          const b = a + m[0].length;
          if (!m[0] || pris.some(([x, y]) => a < y && b > x)) continue;
          pris.push([a, b]);
          items.push({ id: `${k}|${m[0]}`, cle: k, type: motif.label, valeur: m[0], masque: motif.masque });
        }
      });
    });
    return items;
  }
  const sensiblesATraiter = () => sensibles().filter(s => !d.decisions[s.id]);

  /* Instructions confiées à un agent (F-19) : prompt envoyé à un outil qui agit. */
  function agentRepere(b = d) {
    return b.chemin.find(x => x.kind === 'prompt' && P.outilsAgents.includes(x.outil) && M.agent.test(x.prompt)) || null;
  }
  const outilAgentPresent = () => prompts().some(p => P.outilsAgents.includes(p.outil));
  const agentActif = () => (d.agent === null ? !!agentRepere() : d.agent);

  /* Guide d'Explorer que la création rejoindra (affiché après la publication). */
  const MOTS_VIDES = new Set(['san', 'sans', 'tout', 'tou', 'tous', 'plus', 'tres', 'votre', 'vos', 'notre', 'nos', 'faire', 'fait', 'cette', 'entre', 'chaque', 'comme', 'avoir', 'etre', 'leur', 'leurs', 'deux', 'trois']);
  function guide() {
    if (!G) return null;
    const jetons = texte => { const vus = new Set(); return G.tokenize(texte).filter(v => { const cle = v.join('/'); if (vus.has(cle) || MOTS_VIDES.has(v[0]) || v[0].length < 4) return false; vus.add(cle); return true; }); };
    const forts = jetons(`${d.titre} ${d.objectif} ${d.etiquettes.join(' ')}`);
    if (!forts.length) return null;
    let meilleur = null;
    let score = 0;
    G.guides.forEach(g => {
      const cles = ` ${G.fold([g.title, g.short, ...g.keywords].join(' '))}`;
      const n = forts.reduce((k, v) => k + (G.hits(cles, v) ? 2 : G.hits(g.searchText, v) ? 1 : 0), 0);
      const total = n + (d.categorie && g.domain === d.categorie ? 1 : 0);
      if (n && total > score) { meilleur = g; score = total; }
    });
    return score >= 2 ? meilleur : null;
  }

  /* Enregistrement sur l'appareil ------------------------------------- */

  const CLE_LOCALE = 'vysora-publier-page';
  let base = null;
  const ouverture = new Promise(resolve => {
    try {
      const req = indexedDB.open('vysora-publier', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('brouillons');
      req.onsuccess = () => { base = req.result; resolve(); };
      req.onerror = () => resolve();
    } catch { resolve(); }
  });
  async function lire() {
    await ouverture;
    if (base) {
      return new Promise(resolve => {
        try {
          const r = base.transaction('brouillons').objectStore('brouillons').get('page');
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = () => resolve(null);
        } catch { resolve(null); }
      });
    }
    return V.store.get(CLE_LOCALE, null);
  }
  async function ecrire(valeur) {
    await ouverture;
    if (base) {
      return new Promise((resolve, reject) => {
        const tx = base.transaction('brouillons', 'readwrite');
        tx.objectStore('brouillons').put(valeur, 'page');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
    localStorage.setItem(CLE_LOCALE, JSON.stringify(valeur));
    return undefined;
  }
  let minuteur = null;
  let etatSauvegarde = 'charge';
  let heureSauvegarde = '';
  let modifsNonPubliees = false;
  function modifie() {
    d.modifieLe = maintenant();
    if (d.statut === 'publiee') modifsNonPubliees = true;
    etatSauvegarde = 'cours';
    rendreStatut();
    clearTimeout(minuteur);
    minuteur = setTimeout(sauver, 500);
  }
  async function sauver() {
    clearTimeout(minuteur);
    try {
      await ecrire(JSON.parse(JSON.stringify(d)));
      etatSauvegarde = 'ok';
      const n = new Date();
      heureSauvegarde = `${n.getHours()} h ${String(n.getMinutes()).padStart(2, '0')}`;
    } catch { etatSauvegarde = 'erreur'; }
    rendreStatut();
    return etatSauvegarde === 'ok';
  }
  const modifieMaintenant = () => { modifie(); sauver(); };
  addEventListener('pagehide', () => { if (etatSauvegarde === 'cours') sauver(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && etatSauvegarde === 'cours') sauver(); });
  /* La fiche lit la création publiée pour l'afficher à son auteur et aux lecteurs. */
  function ecrireFiche() {
    const auteur = { nom: E.MOI.nom, niveau: E.niveau().nom };
    try { localStorage.setItem(CLE_FICHE, JSON.stringify({ brouillon: versFiche(), page: d, auteur })); return true; } catch { /* quota */ }
    try {
      const leger = JSON.parse(JSON.stringify(d));
      const allege = f => (String(f.src).startsWith('data:') ? { ...f, src: '' } : f);
      leger.resultats = leger.resultats.map(r => (r.kind === 'fichier' ? allege(r) : r));
      leger.chemin.forEach(x => { if (x.fichiers) x.fichiers = x.fichiers.map(allege); });
      localStorage.setItem(CLE_FICHE, JSON.stringify({ brouillon: versFiche(leger), page: leger, auteur }));
      return true;
    } catch { return false; }
  }
  window.VysoraPublier = { brouillon: () => versFiche(), auteur: () => ({ nom: E.MOI.nom, niveau: E.niveau().nom }) };

  /* Éléments et état de la page --------------------------------------- */

  const el = {
    porte: $('[data-pub-gate]'), fin: $('[data-pub-done]'), editeur: $('[data-pub-editor]'), entete: $('[data-pub-entete]'),
    form: $('[data-pub-form]'), cote: $('[data-pub-cote]'), barre: $('[data-pub-barre]'), pop: $('[data-pub-pop]'),
    import: $('[data-pub-import]'), apercu: $('[data-pub-apercu]'), confirm: $('[data-pub-confirm]'), fichier: $('[data-pub-fichier]')
  };
  let reprise = false;
  let vueFin = false;
  let introuvable = false;
  let tentative = false;
  let consentement = false;
  let erreurConsentement = false;
  const touches = new Set();
  const momentsMemo = {};
  const tailleAuto = !(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'));
  const ajuster = zone => { if (tailleAuto) $$('textarea.pub-input', zone).forEach(ta => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; }); };
  const defile = () => (V.motion.full() ? 'smooth' : 'auto');
  const annoncer = texte => { const z = $('[data-pub-annonce]'); if (z) { z.textContent = ''; requestAnimationFrame(() => { z.textContent = texte; }); } };

  /* Gabarits ----------------------------------------------------------- */

  const erreurVisible = (err, cle) => { const e = err.get(cle); return e && (tentative || touches.has(cle)) ? e.message : ''; };
  const erreurHTML = (id, message) => (message ? `<p class="pub-erreur" id="${id}-err">${icon('alert')}<span>${t(message)}</span></p>` : '');
  const facultatif = () => '<span class="pub-facultatif">facultatif</span>';
  const decrit = (...ids) => { const v = ids.filter(Boolean).join(' '); return v ? ` aria-describedby="${v}"` : ''; };

  /* Alerte de données sensibles, sous le champ qui les contient. */
  function alertesHTML(cle) {
    const items = sensibles(cle).filter(s => !d.decisions[s.id]);
    return items.map(s => `<div class="pub-alerte" data-sensible="${esc(s.id)}">${icon('key')}<p><b>${t(s.type)}</b> : « ${esc(extrait(s.valeur, 48))} ». Elle sera visible de tous.</p><div><button class="pub-lien-btn" type="button" data-action="masquer" data-id="${esc(s.id)}" data-k="masquer:${esc(s.id)}">Masquer</button><button class="pub-lien-btn is-discret" type="button" data-action="conserver" data-id="${esc(s.id)}">Conserver</button></div></div>`).join('');
  }

  /* Un champ : libellé visible (ou porté par un titre), erreur dessous, alertes ensuite. */
  function champ(err, { cle, label, labelPar = '', aide = '', requis = true, rows = 0, max = 0, type = 'text', mono = false, inputmode = '', liste = '', placeholder = '' }) {
    const id = idDe(cle);
    const message = erreurVisible(err, cle);
    const valeur = lireChamp(cle);
    const attrs = `id="${id}" class="pub-input${mono ? ' is-mono' : ''}" data-f="${esc(cle)}" data-k="${esc(cle)}"${max ? ` maxlength="${max}"` : ''}${requis ? ' aria-required="true"' : ''}${message ? ' aria-invalid="true"' : ''}${labelPar ? ` aria-labelledby="${labelPar}"` : ''}${decrit(aide ? `${id}-aide` : '', message ? `${id}-err` : '')}${inputmode ? ` inputmode="${inputmode}"` : ''}${liste ? ` list="${liste}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${mono ? ' spellcheck="false"' : ''}`;
    const controle = rows ? `<textarea ${attrs} rows="${rows}">${esc(valeur)}</textarea>` : `<input ${attrs} type="${type}" value="${esc(valeur)}" autocomplete="off">`;
    return `<div class="pub-champ${message ? ' is-erreur' : ''}" data-champ="${esc(cle)}">
      ${label ? `<label class="pub-label" for="${id}">${t(label)}${requis ? '' : facultatif()}</label>` : ''}
      ${aide ? `<p class="pub-aide" id="${id}-aide">${t(aide)}</p>` : ''}
      ${controle}
      <div class="pub-sous" data-sous="${esc(cle)}">${erreurHTML(id, message)}</div>
      <div class="pub-alertes" data-alertes="${esc(cle)}">${alertesHTML(cle)}</div>
    </div>`;
  }
  const erreurBloc = (err, cle) => { const m = erreurVisible(err, cle); return m ? `<p class="pub-erreur pub-erreur-bloc" id="${idDe(cle)}" data-k="${esc(cle)}" tabindex="-1">${icon('alert')}<span>${t(m)}</span></p>` : ''; };

  /* Le résultat -------------------------------------------------------- */

  function apercuFichier(f) {
    const g = genre(f.mime);
    if (g === 'image' && f.src) return `<img src="${esc(f.src)}" alt="" decoding="async"${f.portrait ? ' class="is-portrait"' : ''}>`;
    if (g === 'video' && f.src) return `<video src="${esc(f.src)}" muted playsinline preload="metadata" aria-hidden="true"></video>`;
    return `<span class="pub-fichier-icone">${icon(g === 'audio' ? 'music' : g === 'video' ? 'film' : 'doc')}</span>`;
  }
  function fichierHTML(err, f, { titreId }) {
    const g = genre(f.mime);
    return `<div class="pub-fichier">
      ${apercuFichier(f)}
      <div class="pub-fichier-champs">
        <p class="pub-fichier-nom" id="${titreId}"><b>${esc(f.nom || 'Fichier')}</b>${f.taille ? `<span>${poids(f.taille)}</span>` : ''}</p>
        ${g === 'audio' && f.src ? `<audio src="${esc(f.src)}" controls preload="none"></audio>` : ''}
        ${champ(err, { cle: `r:${f.id}:alt`, label: 'Description', requis: g === 'image' || g === 'video', rows: 2, max: 250, aide: g === 'image' || g === 'video' ? 'Ce qu’on y voit, pour les personnes qui ne le voient pas.' : '' })}
      </div>
    </div>`;
  }
  function resultatHTML(err, r) {
    const s = SORTES[r.kind];
    const tid = `rt-${r.id}`;
    let corps = '';
    if (r.kind === 'texte') corps = champ(err, { cle: `r:${r.id}:texte`, labelPar: tid, rows: 5, max: 50000 });
    if (r.kind === 'code') corps = `${champ(err, { cle: `r:${r.id}:nom`, label: 'Nom du fichier', requis: false, max: 120 })}${champ(err, { cle: `r:${r.id}:texte`, labelPar: tid, rows: 8, max: 100000, mono: true })}`;
    if (r.kind === 'fichier') corps = fichierHTML(err, r, { titreId: `${tid}-nom` });
    if (r.kind === 'lien') {
      const type = r.type || typeLien(r.url);
      corps = `<div class="pub-grille">
        ${champ(err, { cle: `r:${r.id}:url`, label: 'Adresse', type: 'url', inputmode: 'url', max: 2000, placeholder: 'https://' })}
        <div class="pub-champ"><label class="pub-label" for="${idDe(`r:${r.id}:type`)}">Type</label><div class="pub-select"><select class="pub-input" id="${idDe(`r:${r.id}:type`)}" data-lien-type="${r.id}" data-k="r:${r.id}:type">${P.liens.map(([v, lab]) => `<option value="${v}"${type === v ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>${icon('chevron-down')}</div></div>
      </div>
      ${champ(err, { cle: `r:${r.id}:libelle`, label: 'Libellé', requis: false, max: 100 })}`;
    }
    return `<li class="pub-res" data-res="${r.id}">
      <div class="pub-res-tete"><h3 id="${tid}">${icon(s.icone)}${t(s.label)}</h3><button class="icon-btn pub-mini is-danger" type="button" data-action="retirer-resultat" data-id="${r.id}" data-k="retirer:${r.id}" aria-label="Retirer ce ${s.label.toLowerCase()}" title="Retirer">${icon('trash', '')}</button></div>
      ${corps}
    </li>`;
  }
  function sectionResultat(err) {
    const reste = FICHIERS_MAX - tousFichiers().length;
    return `<section class="pub-section" aria-labelledby="sec-resultat" data-depot>
      <h2 id="sec-resultat">${icon('box')}Le résultat</h2>
      <p class="pub-indication">Ce que l’IA vous a permis d’obtenir, quelle que soit sa forme : texte, code, image, vidéo, son, application…</p>
      ${erreurBloc(err, 'resultats')}
      ${d.resultats.length ? `<ul class="pub-resultats">${d.resultats.map(r => resultatHTML(err, r)).join('')}</ul>` : ''}
      <div class="pub-ajouts" role="group" aria-label="Ajouter au résultat">
        ${Object.entries(SORTES).map(([k, s]) => `<button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-resultat" data-sorte="${k}" data-k="ajouter-resultat:${k}"${k === 'fichier' && reste <= 0 ? ' disabled' : ''}>${icon(s.icone)}${t(s.label)}</button>`).join('')}
      </div>
      <p class="pub-indication pub-depot-txt">Vous pouvez aussi déposer ou coller des fichiers ici, 10 Mo au plus chacun.</p>
      <p class="pub-erreur pub-erreur-bloc" data-erreur-fichiers role="alert" hidden></p>
    </section>`;
  }

  /* Le chemin parcouru ------------------------------------------------- */

  function outilBouton(err, x) {
    const cle = `o:${x.id}`;
    const message = erreurVisible(err, cle);
    return `<button class="pub-outil${message ? ' is-erreur' : ''}" type="button" id="${idDe(cle)}" data-action="outil" data-id="${x.id}" data-k="${cle}" aria-haspopup="listbox" aria-expanded="false" aria-label="Outil : ${esc(x.outil || 'à choisir')}"${message ? ` aria-invalid="true" aria-describedby="${idDe(cle)}-err"` : ''}>${x.outil ? `${logo(x.outil, 18)}<span>${esc(x.outil)}</span>` : `<span class="pub-vide-txt">Choisir l’outil</span>`}${icon('chevron-down')}</button>`;
  }
  function momentHTML(err, x) {
    if (!x.moment) return '';
    const type = MOMENT[x.moment.type] || MOMENT.correction;
    const idType = idDe(`mt:${x.id}`);
    return `<div class="pub-moment">
      <div class="pub-champ pub-moment-type"><label class="pub-label" for="${idType}">${icon('moment')}Moment clé</label><div class="pub-select"><select class="pub-input" id="${idType}" data-mtype="${x.id}" data-k="mt:${x.id}">${P.moments.map(m => `<option value="${m.id}"${m.id === type.id ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select>${icon('chevron-down')}</div></div>
      ${champ(err, { cle: `m:${x.id}`, label: 'Ce qui s’est passé', rows: 3, max: 1000, aide: type.aide })}
    </div>`;
  }
  function blocHTML(err, x, rang, n) {
    const tid = `bt-${x.id}`;
    const actions = `<div class="pub-bloc-actions">
        <button class="icon-btn pub-mini" type="button" data-action="monter" data-id="${x.id}" data-k="monter:${x.id}" aria-label="Monter" title="Monter"${rang.i === 0 ? ' disabled' : ''}>${icon('up', '')}</button>
        <button class="icon-btn pub-mini" type="button" data-action="descendre" data-id="${x.id}" data-k="descendre:${x.id}" aria-label="Descendre" title="Descendre"${rang.i === n - 1 ? ' disabled' : ''}>${icon('down', '')}</button>
        <button class="icon-btn pub-mini is-danger" type="button" data-action="supprimer-bloc" data-id="${x.id}" data-k="supprimer:${x.id}" aria-label="Supprimer" title="Supprimer"${n === 1 ? ' disabled' : ''}>${icon('trash', '')}</button>
      </div>`;
    const momentBtn = `<button class="pub-option${x.moment ? ' is-actif' : ''}" type="button" data-action="moment" data-id="${x.id}" data-k="moment:${x.id}" aria-pressed="${!!x.moment}">${icon('moment')}Moment clé</button>`;
    if (x.kind === 'etape') {
      return `<li class="pub-bloc is-etape" data-bloc="${x.id}">
        <div class="pub-bloc-tete"><h3 class="pub-bloc-nom" id="${tid}">Étape ${rang.etape}</h3>${actions}</div>
        ${champ(err, { cle: `b:${x.id}:titre`, label: 'Titre de l’étape', max: 100 })}
        ${champ(err, { cle: `b:${x.id}:texte`, label: 'Ce que vous avez fait', requis: false, rows: 2, max: 10000 })}
        <div class="pub-options">${momentBtn}</div>
        ${momentHTML(err, x)}
      </li>`;
    }
    const message = erreurVisible(err, `o:${x.id}`);
    const ouvertReponse = !!x.ouvert.reponse;
    const ouvertReglages = !!x.ouvert.reglages;
    const rempliReponse = longueur(x.reponse) || x.fichiers.length;
    const rempliReglages = longueur(x.modele) || longueur(x.reglages);
    const modeles = P.modeles[x.outil] || [];
    return `<li class="pub-bloc" data-bloc="${x.id}">
      <div class="pub-bloc-tete"><h3 class="pub-bloc-nom" id="${tid}">Prompt ${rang.prompt}</h3>${outilBouton(err, x)}${actions}</div>
      ${message ? `<div class="pub-sous">${erreurHTML(idDe(`o:${x.id}`), message)}</div>` : ''}
      ${champ(err, { cle: `b:${x.id}:prompt`, labelPar: tid, rows: 3, max: 100000 })}
      <div class="pub-options">
        <button class="pub-option${rempliReponse ? ' is-rempli' : ''}" type="button" data-action="ouvrir" data-quoi="reponse" data-id="${x.id}" data-k="ouvrir-reponse:${x.id}" aria-expanded="${ouvertReponse}"${ouvertReponse ? ` aria-controls="rep-${x.id}"` : ''}>${icon('message')}Réponse de l’IA${rempliReponse ? `${icon('check')}<span class="sr-only"> : renseignée</span>` : ''}</button>
        <button class="pub-option${rempliReglages ? ' is-rempli' : ''}" type="button" data-action="ouvrir" data-quoi="reglages" data-id="${x.id}" data-k="ouvrir-reglages:${x.id}" aria-expanded="${ouvertReglages}"${ouvertReglages ? ` aria-controls="reg-${x.id}"` : ''}>${icon('sliders')}${rempliReglages && x.modele ? esc(x.modele) : 'Modèle et réglages'}${rempliReglages ? `${icon('check')}<span class="sr-only"> : renseignés</span>` : ''}</button>
        ${momentBtn}
      </div>
      ${ouvertReponse ? `<div class="pub-detail" id="rep-${x.id}">
        ${champ(err, { cle: `b:${x.id}:reponse`, label: 'Réponse de l’IA', requis: false, rows: 3, max: 200000 })}
        ${x.fichiers.length ? `<ul class="pub-fichiers">${x.fichiers.map(f => `<li data-res="${f.id}">${fichierHTML(err, f, { titreId: `ft-${f.id}` })}<button class="pub-lien-btn is-danger" type="button" data-action="retirer-fichier" data-id="${f.id}" data-k="retirer:${f.id}">${icon('trash')}Retirer</button></li>`).join('')}</ul>` : ''}
        <button class="pub-lien-btn" type="button" data-action="joindre" data-id="${x.id}" data-k="joindre:${x.id}">${icon('paperclip')}Joindre ce que l’IA a produit</button>
      </div>` : ''}
      ${ouvertReglages ? `<div class="pub-detail pub-grille" id="reg-${x.id}">
        ${champ(err, { cle: `b:${x.id}:modele`, label: 'Modèle', requis: false, max: 100, liste: `ml-${x.id}` })}
        <datalist id="ml-${x.id}">${modeles.map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist>
        ${champ(err, { cle: `b:${x.id}:reglages`, label: 'Réglages', requis: false, max: 2000 })}
      </div>` : ''}
      ${momentHTML(err, x)}
    </li>`;
  }
  function sectionChemin(err) {
    let np = 0;
    let ne = 0;
    const blocs = d.chemin.map((x, i) => {
      if (x.kind === 'prompt') np += 1; else ne += 1;
      return blocHTML(err, x, { i, prompt: np, etape: ne }, d.chemin.length);
    }).join('');
    return `<section class="pub-section" aria-labelledby="sec-chemin">
      <h2 id="sec-chemin">${icon('route')}Le chemin parcouru</h2>
      <p class="pub-indication">Vos prompts dans l’ordre, avec l’outil utilisé. Marquez les moments clés : là où vous avez corrigé, refusé ou vérifié le travail de l’IA.</p>
      ${erreurBloc(err, 'chemin')}
      <ol class="pub-chemin">${blocs}</ol>
      <div class="pub-ajouts" role="group" aria-label="Ajouter au chemin parcouru">
        <button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-prompt" data-k="ajouter-prompt">${icon('plus')}Prompt</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="ajouter-etape" data-k="ajouter-etape" aria-describedby="aide-etape">${icon('layers')}Étape</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="importer" data-k="importer">${icon('clipboard')}Coller une conversation</button>
      </div>
      <p class="pub-indication" id="aide-etape">Une étape regroupe les prompts d’une même phase d’un projet, ou décrit ce que vous avez fait vous-même.</p>
    </section>`;
  }

  function sectionSavoir(err) {
    return `<section class="pub-section" aria-labelledby="sec-savoir">
      <h2 id="sec-savoir">${icon('help')}À savoir${facultatif()}</h2>
      <p class="pub-indication" id="sec-savoir-aide">Les limites du résultat et vos conseils pour le refaire.</p>
      ${champ(err, { cle: 'limites', labelPar: 'sec-savoir', requis: false, rows: 3, max: 2000 })}
    </section>`;
  }

  function formHTML(err) {
    return `<div class="pub-presentation">
        ${champ(err, { cle: 'titre', label: 'Titre', max: 120 })}
        ${champ(err, { cle: 'objectif', label: 'Ce que vous vouliez obtenir', rows: 2, max: 1000 })}
      </div>
      ${sectionResultat(err)}
      ${sectionChemin(err)}
      ${sectionSavoir(err)}`;
  }

  /* Panneau de publication ---------------------------------------------- */

  const LISTE = [
    { id: 'presentation', label: 'Le titre et l’objectif', cible: 'titre' },
    { id: 'resultat', label: 'Le résultat', cible: 'ajouter-resultat:texte' },
    { id: 'chemin', label: 'Le chemin parcouru', cible: 'ajouter-prompt' },
    { id: 'categorie', label: 'La catégorie', cible: 'categorie' }
  ];
  function listeHTML(err) {
    const items = LISTE.map(it => {
      const fautes = [...err.entries()].filter(([, e]) => e.groupe === it.id);
      const ok = !fautes.length;
      const signale = !ok && tentative;
      return `<li class="${ok ? 'is-ok' : signale ? 'is-erreur' : ''}"><button type="button" data-action="aller" data-cible="${esc(ok ? it.cible : fautes[0][0])}" data-k="liste-${it.id}">${icon(ok ? 'check-circle' : 'circle')}<span>${t(it.label)}${ok ? '<span class="sr-only"> : complet</span>' : signale ? `<small>${t(fautes[0][1].message)}</small>` : ''}</span></button></li>`;
    });
    const notes = prompts().concat(etapesChemin()).filter(momentNote).length;
    items.push(`<li class="${notes ? 'is-ok' : 'is-conseil'}"><button type="button" data-action="aller" data-cible="${notes ? 'sec-chemin' : `moment:${(prompts()[prompts().length - 1] || d.chemin[0]).id}`}" data-k="liste-moment">${icon(notes ? 'check-circle' : 'moment')}<span>${notes ? plural(notes, 'moment clé', 'moments clés') : 'Un moment clé'}${notes ? '' : '<small>Conseillé : c’est ce qui fait apprendre.</small>'}</span></button></li>`);
    const sens = sensiblesATraiter();
    if (sens.length) items.push(`<li class="is-erreur"><button type="button" data-action="aller" data-cible="masquer:${esc(sens[0].id)}" data-k="liste-sensibles">${icon('key')}<span>${plural(sens.length, 'passage sensible', 'passages sensibles')}<small>À masquer ou à conserver.</small></span></button></li>`);
    return `<ul class="pub-liste">${items.join('')}</ul>`;
  }

  function coteHTML(err) {
    const type = typeDe();
    const publiee = d.statut === 'publiee';
    const msgDefi = erreurVisible(err, 'defi');
    const msgCat = erreurVisible(err, 'categorie');
    const proposee = !d.categorie && categorieProposee();
    const lim = limiteCreations();
    const restant = restantes();
    return `<div class="pub-cote-in">
      <p class="pub-statut" data-pub-save></p>
      <h2 class="pub-cote-titre">Avant de publier</h2>
      ${listeHTML(err)}
      <p class="pub-type">${type ? `${icon(`type-${type}`)}<span><b>${t(TYPES[type].label)}</b> : ${t(TYPES[type].sens)}</span>` : `${icon('route')}<span>Le type de création se déduit de votre chemin parcouru.</span>`}</p>

      <div class="pub-reglages">
        <div class="pub-champ${msgCat ? ' is-erreur' : ''}" data-champ="categorie">
          <label class="pub-label" for="f-categorie">Catégorie</label>
          <div class="pub-select"><select class="pub-input" id="f-categorie" data-categorie data-k="categorie"${msgCat ? ' aria-invalid="true" aria-describedby="f-categorie-err"' : ''}>
            <option value=""${d.categorie ? '' : ' selected'}>Choisir</option>
            ${D.categories.map(c => `<option value="${esc(c.name)}"${d.categorie === c.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>${icon('chevron-down')}</div>
          ${proposee ? `<button class="pub-lien-btn" type="button" data-action="proposer-categorie" data-k="proposer-categorie">Choisir « ${t(proposee)} »</button>` : ''}
          <div class="pub-sous">${erreurHTML('f-categorie', msgCat)}</div>
        </div>
        <div class="pub-champ" data-champ="etiquettes">
          <label class="pub-label" for="f-etiquette">Étiquettes${facultatif()}</label>
          <div class="pub-etiquettes">
            ${d.etiquettes.map(e => `<span class="pub-etiquette">${t(e)}<button type="button" data-action="retirer-etiquette" data-v="${esc(e)}" data-k="etiquette:${esc(e)}" aria-label="Retirer l’étiquette ${esc(e)}">${icon('close', '')}</button></span>`).join('')}
            <input id="f-etiquette" type="text" maxlength="30" data-etiquette data-k="etiquette-saisie" aria-describedby="f-etiquette-aide"${d.etiquettes.length >= 5 ? ' disabled' : ''} autocomplete="off">
          </div>
          <p class="pub-aide" id="f-etiquette-aide">Entrée pour valider, cinq au plus.</p>
        </div>
        <div class="pub-champ">
          <label class="pub-label" for="f-licence">Licence</label>
          <div class="pub-select"><select class="pub-input" id="f-licence" data-licence data-k="licence" aria-describedby="f-licence-aide">${P.licences.map(l => `<option value="${esc(l.code)}"${d.licence === l.code ? ' selected' : ''}>${esc(l.code)}</option>`).join('')}</select>${icon('chevron-down')}</div>
          <p class="pub-aide" id="f-licence-aide">${t((P.licences.find(l => l.code === d.licence) || P.licences[0]).sens)}.</p>
        </div>
        <div class="pub-champ${msgDefi ? ' is-erreur' : ''}" data-champ="defi">
          <div class="pub-case"><input type="checkbox" id="f-defi" data-defi-choix data-k="defi"${d.defi === P.defi.id ? ' checked' : ''}${decrit('f-defi-aide', msgDefi ? 'f-defi-err' : '')}><label for="f-defi">Participer au défi « ${t(P.defi.titre)} »</label></div>
          <p class="pub-aide pub-aide-case" id="f-defi-aide">Jusqu’au ${t(P.defi.finLabel)}. <a href="classements.html#defi">Voir les règles</a></p>
          <div class="pub-sous">${erreurHTML('f-defi', msgDefi)}</div>
        </div>
        ${outilAgentPresent() ? `<div class="pub-champ">
          <div class="pub-case"><input type="checkbox" id="f-agent" data-agent-flag data-k="agent"${agentActif() ? ' checked' : ''} aria-describedby="f-agent-aide"><label for="f-agent">Signaler des instructions pour un agent</label></div>
          <p class="pub-aide pub-aide-case" id="f-agent-aide">${agentRepere() ? 'Un de vos prompts confie des actions à un agent. ' : ''}La fiche affichera un avertissement.</p>
        </div>` : ''}
      </div>

      ${Number.isFinite(lim) && restant === 0 ? `<p class="pub-limite" id="pub-limite">${icon('clock')}<span>Limite de ${lim} publications par 24 heures atteinte. Vous pourrez publier ${t(P.quota.prochaine)} ; votre brouillon reste enregistré.</span></p>` : ''}
      <div class="pub-champ pub-consentement${erreurConsentement ? ' is-erreur' : ''}" data-champ="consentement">
        <div class="pub-case"><input type="checkbox" id="f-consentement" data-consentement data-k="consentement"${consentement ? ' checked' : ''}${erreurConsentement ? ' aria-invalid="true" aria-describedby="f-consentement-err"' : ''}><label for="f-consentement">Je ne publie aucune donnée personnelle d’un tiers ni aucun secret.</label></div>
        <div class="pub-sous">${erreurHTML('f-consentement', erreurConsentement ? 'Cochez cette case pour publier.' : '')}</div>
      </div>
      <button class="btn btn-primary pub-publier" type="button" data-action="publier" data-k="publier">${publiee ? 'Publier les modifications' : 'Publier'}</button>
      <button class="btn btn-secondary pub-apercu-btn" type="button" data-action="apercu" data-k="apercu">${icon('eye')}Aperçu de la fiche</button>
      <p class="sr-only" role="status" data-pub-annonce></p>
      <div class="pub-cote-liens">
        ${publiee ? `<a class="pub-lien-btn" href="${FICHE}">${icon('external')}Voir la fiche</a><button class="pub-lien-btn" type="button" data-action="depublier" data-k="depublier">Dépublier</button>` : ''}
        <button class="pub-lien-btn is-danger" type="button" data-action="supprimer" data-k="supprimer-tout">${publiee ? 'Supprimer la création' : 'Supprimer le brouillon'}</button>
      </div>
    </div>`;
  }

  function barreHTML(err) {
    const n = [...new Set([...err.values()].map(e => e.groupe))].length + (sensiblesATraiter().length ? 1 : 0);
    return `<div class="pub-barre-in">
      <button class="pub-barre-etat" type="button" data-action="voir-liste" data-k="barre-liste">${n ? `${icon('circle')}${plural(n, 'point', 'points')} à compléter` : `${icon('check-circle')}Prête à publier`}</button>
      <button class="btn btn-primary btn-sm" type="button" data-action="publier" data-k="barre-publier">${d.statut === 'publiee' ? 'Publier les modifications' : 'Publier'}</button>
    </div>`;
  }

  /* Rendu ---------------------------------------------------------------- */

  function rendreStatut() {
    const zone = $('[data-pub-save]');
    if (!zone || !d) return;
    const publiee = d.statut === 'publiee';
    let etat;
    if (etatSauvegarde === 'cours') etat = 'Enregistrement…';
    else if (etatSauvegarde === 'erreur') etat = 'Enregistrement impossible sur cet appareil';
    else if (publiee) etat = modifsNonPubliees ? 'Modifications à publier' : `Publiée le ${jour(d.publieLe || D.today)}`;
    else if (heureSauvegarde && d.modifieLe) etat = `Enregistré à ${heureSauvegarde}`;
    else etat = 'Visible de vous seul';
    zone.dataset.etat = etatSauvegarde;
    zone.innerHTML = `${icon(publiee ? 'check-circle' : 'lock')}<span><b>${publiee ? 'Création publiée' : 'Brouillon privé'}</b> · ${t(etat)}</span>`;
  }

  function rendreEntete() {
    const publiee = d.statut === 'publiee';
    el.entete.innerHTML = `<h1>${publiee ? 'Modifier la création' : 'Publier une création'}</h1>
      <p class="pub-intro">Montrez ce que vous avez obtenu et comment : d’autres pourront le refaire et apprendre de vos choix.</p>
      ${reprise && !publiee && d.modifieLe ? `<div class="pub-bandeau" role="status">${icon('clock')}<p>Vous reprenez votre brouillon du ${jour(d.modifieLe, false)} à ${heure(d.modifieLe)}.</p><button class="icon-btn pub-mini" type="button" data-action="fermer-reprise" aria-label="Masquer ce message">${icon('close', '')}</button></div>` : ''}`;
    V.fixTypography(el.entete);
  }

  /* Rend une zone en gardant le focus sur l'élément équivalent. */
  function avecFocus(zone, rendu, cleFocus) {
    const actif = document.activeElement && document.activeElement.closest('[data-k]');
    const cle = cleFocus || (actif && zone.contains(actif) ? actif.dataset.k : null);
    const pos = actif && actif.matches('input, textarea') && !cleFocus ? [actif.selectionStart, actif.selectionEnd] : null;
    rendu();
    if (!cle) return;
    const cible = $(`[data-k="${CSS.escape(cle)}"]`, zone);
    if (!cible) return;
    cible.focus({ preventScroll: !cleFocus });
    if (pos && cible.setSelectionRange) { try { cible.setSelectionRange(pos[0], pos[1]); } catch { /* type sans sélection */ } }
  }
  function rendreForm(cleFocus) {
    avecFocus(el.form, () => {
      el.form.innerHTML = formHTML(valider());
      ajuster(el.form);
      V.fixTypography(el.form);
    }, cleFocus);
  }
  function rendreCote(cleFocus) {
    const err = valider();
    avecFocus(el.cote, () => {
      el.cote.innerHTML = coteHTML(err);
      rendreStatut();
      V.fixTypography(el.cote);
    }, cleFocus);
    el.barre.innerHTML = barreHTML(err);
  }
  function rendreTout(cleFocus) {
    if (!d) return;
    rendreEntete();
    rendreForm(cleFocus);
    rendreCote(cleFocus && el.cote.querySelector(`[data-k="${CSS.escape(cleFocus)}"]`) ? cleFocus : undefined);
    document.title = `${d.statut === 'publiee' ? 'Modifier la création' : 'Publier une création'} · Vysora`;
  }
  /* Après un changement de structure : formulaire et panneau. */
  function rendre(cleFocus) {
    rendreForm(cleFocus);
    rendreCote();
    if (cleFocus && !el.form.querySelector(`[data-k="${CSS.escape(cleFocus)}"]`)) { const c = $(`[data-k="${CSS.escape(cleFocus)}"]`, el.cote); if (c) c.focus(); }
  }

  /* Met à jour l'erreur d'un champ sans redessiner le formulaire. */
  function majChamp(cle, err = valider()) {
    const zone = $(`[data-sous="${CSS.escape(cle)}"]`, el.form);
    const champEl = zone && zone.closest('.pub-champ');
    if (!zone || !champEl) return;
    const message = erreurVisible(err, cle);
    const controle = $('[data-f]', champEl);
    const id = controle ? controle.id : idDe(cle);
    champEl.classList.toggle('is-erreur', !!message);
    zone.innerHTML = erreurHTML(id, message);
    if (controle) {
      if (message) controle.setAttribute('aria-invalid', 'true'); else controle.removeAttribute('aria-invalid');
      const ids = new Set((controle.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
      if (message) ids.add(`${id}-err`); else ids.delete(`${id}-err`);
      if (ids.size) controle.setAttribute('aria-describedby', [...ids].join(' ')); else controle.removeAttribute('aria-describedby');
    }
  }
  function majAlertes(cle) {
    const zone = $(`[data-alertes="${CSS.escape(cle)}"]`, el.form);
    if (zone) { zone.innerHTML = alertesHTML(cle); V.fixTypography(zone); }
  }
  function majPanneau() {
    const err = valider();
    const liste = $('.pub-liste', el.cote);
    if (liste) { liste.outerHTML = listeHTML(err); V.fixTypography($('.pub-liste', el.cote)); }
    const type = $('.pub-type', el.cote);
    const t2 = typeDe();
    if (type) type.innerHTML = t2 ? `${icon(`type-${t2}`)}<span><b>${t(TYPES[t2].label)}</b> : ${t(TYPES[t2].sens)}</span>` : `${icon('route')}<span>Le type de création se déduit de votre chemin parcouru.</span>`;
    el.barre.innerHTML = barreHTML(err);
    return err;
  }

  /* Porte d'entrée : visiteur, compte en lecture seule, création introuvable. */
  function porteHTML(motif) {
    if (introuvable) {
      return `<div class="container pub-porte-in"><h1>Cette création est introuvable</h1>
        <p class="pub-intro">Elle a peut-être été supprimée, ou le lien est incomplet.</p>
        <div class="pub-porte-actions"><a class="btn btn-primary" href="nouvelle-creation.html">Publier une création</a><a class="btn btn-secondary" href="explorer.html">Explorer les créations</a></div></div>`;
    }
    const visiteur = motif === 'connexion';
    return `<div class="container pub-porte-in">
      <h1>Publier une création</h1>
      <p class="pub-intro">Montrez ce que vous avez obtenu avec l’IA et comment : vos prompts, vos outils et les moments où vous avez repris la main.</p>
      ${V.accesBloc('contribuer', 'publier une création')}
      ${!visiteur && d && longueur(d.titre) ? `<p class="pub-note">${icon('lock')}<span>Votre brouillon « ${t(d.titre)} » est conservé sur cet appareil.</span></p>` : ''}
      <p class="pub-porte-liens"><a class="link-arrow" href="explorer.html">Voir des créations publiées${icon('arrow')}</a></p>
    </div>`;
  }

  function emblemeHTML(ico) {
    return `<svg class="pub-embleme" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3.5 56.7 17.75v28.5L32 60.5 7.3 46.25v-28.5z" fill="#DBEAFE" stroke="#60A5FA" stroke-width="3"/><use href="#i-${ico}" x="18" y="18" width="28" height="28" class="pub-embleme-ic"/></svg>`;
  }
  function finHTML({ premiere }) {
    const g = guide();
    const defi = d.defi === P.defi.id;
    const complet = typeDe() === 'projet' && etapesChemin().length >= 3 && d.chemin.some(momentNote);
    const suites = [
      g ? [icon('compass'), `Votre création rejoint le guide « ${t(g.title)} »`, 'Ses moments clés enrichissent les étapes et les pièges du guide.', `<a class="link-arrow" href="${g.href}">Voir le guide${icon('arrow')}</a>`] : null,
      defi ? [icon('trophy'), `Participation au défi « ${t(P.defi.titre)} »`, `Classement selon les votes « Utile » reçus jusqu’au ${t(P.defi.finLabel)}.`, `<a class="link-arrow" href="classements.html#defi">Voir le défi${icon('arrow')}</a>`] : null,
      premiere ? [emblemeHTML('pen'), 'Badge « Première création »', 'Il apparaît sur votre profil.', ''] : null,
      complet ? [emblemeHTML('route'), 'Badge « Parcours complet »', 'Un projet d’au moins trois étapes, avec ses moments clés.', ''] : null
    ].filter(Boolean);
    return `<div class="container pub-fin-in">
      <span class="pub-fin-icone" aria-hidden="true">${icon('check', '')}</span>
      <h1 tabindex="-1" data-fin-titre>Votre création est publiée</h1>
      <p class="pub-intro">« ${t(d.titre)} » est visible de tous. Chaque vote « Utile » et chaque reproduction réussie vous rapporteront des points.</p>
      <div class="pub-porte-actions"><a class="btn btn-primary" href="${FICHE}">Voir la fiche${icon('arrow')}</a><button class="btn btn-secondary" type="button" data-action="copier-lien">${icon('copy')}Copier le lien</button><button class="btn btn-quiet" type="button" data-action="continuer-modifier">Modifier la création</button></div>
      ${suites.length ? `<ul class="pub-fin-suite">${suites.map(([ic, titre, texte, lien]) => `<li>${ic}<p><b>${titre}</b><span>${t(texte)}</span></p>${lien}</li>`).join('')}</ul>` : ''}
    </div>`;
  }

  function appliquerEtat() {
    const motif = introuvable ? 'introuvable' : E.raison('contribuer');
    const ferme = !!motif;
    el.porte.hidden = !ferme;
    el.editeur.hidden = ferme || vueFin;
    el.barre.hidden = ferme || vueFin;
    el.fin.hidden = ferme || !vueFin;
    document.body.toggleAttribute('data-pub-ferme', ferme || vueFin);
    if (ferme) { el.porte.innerHTML = porteHTML(motif); V.fixTypography(el.porte); fermerFenetres(); return; }
    if (!vueFin) rendreTout();
  }
  function fermerFenetres() {
    fermerPop();
    [el.import, el.apercu, el.confirm].forEach(dlg => { if (dlg.open) dlg.close(); });
  }

  /* Va au champ d'une erreur ou d'un élément de la liste. */
  function aller(cle) {
    let cible = $(`[data-k="${CSS.escape(cle)}"]`) || document.getElementById(cle);
    if (!cible) {
      const [k, id, prop] = cle.split(':');
      const p = k === 'r' ? prompts().find(x => x.fichiers.some(f => f.id === id)) : k === 'b' ? trouver(id) : null;
      if (p && p.kind === 'prompt') {
        if (k === 'r' || prop === 'reponse') p.ouvert.reponse = true;
        if (prop === 'modele' || prop === 'reglages') p.ouvert.reglages = true;
        rendreForm();
        cible = $(`[data-k="${CSS.escape(cle)}"]`);
      }
    }
    if (!cible) return;
    cible.scrollIntoView({ block: 'center', behavior: defile() });
    if (!cible.matches('button, input, select, textarea, a, [tabindex]')) cible.setAttribute('tabindex', '-1');
    cible.focus({ preventScroll: true });
  }

  /* Actions --------------------------------------------------------------- */

  function deplacer(liste, element, sens) {
    const i = liste.indexOf(element);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return false;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    return true;
  }
  const vide = x => (x.kind === 'prompt' ? !longueur(x.prompt) && !longueur(x.reponse) && !x.fichiers.length && !x.moment : !longueur(x.titre) && !longueur(x.texte) && !x.moment);

  async function supprimerTout() {
    const publiee = d.statut === 'publiee';
    const ok = await confirmer({ titre: publiee ? 'Supprimer cette création ?' : 'Supprimer ce brouillon ?', texte: publiee ? 'Elle disparaîtra de Vysora, avec ses commentaires et les essais déclarés.' : 'Tout ce que vous avez saisi sera effacé de cet appareil.', action: publiee ? 'Supprimer la création' : 'Supprimer le brouillon', danger: true });
    if (!ok) return;
    if (publiee) { try { localStorage.removeItem(CLE_FICHE); } catch { /* stockage indisponible */ } }
    reglerDepuisUI('contenu', 'vide');
    d = construire(S);
    reinitialiserVue();
    await sauver();
    appliquerEtat();
    V.toast(publiee ? 'Création supprimée.' : 'Brouillon supprimé.', 'trash');
    $('#f-titre')?.focus();
  }
  async function depublier() {
    const ok = await confirmer({ titre: 'Dépublier cette création ?', texte: 'Elle redevient un brouillon visible de vous seul.', action: 'Dépublier' });
    if (!ok) return;
    d.statut = 'brouillon';
    modifsNonPubliees = false;
    reglerDepuisUI('contenu', 'brouillon');
    d.scenario = cleScenario(S);
    try { localStorage.removeItem(CLE_FICHE); } catch { /* stockage indisponible */ }
    modifieMaintenant();
    rendreTout();
    V.toast('Création dépubliée : elle est de nouveau un brouillon.');
  }

  /* Fichiers --------------------------------------------------------------- */

  let cibleFichiers = 'resultat';
  const lireFichier = f => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f); });
  const chargerImage = src => new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = src; });
  async function lireMedia(f) {
    const src = await lireFichier(f);
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
      if (!/^image\//.test(f.type)) return { src, portrait: false };
      try { const im = await chargerImage(src); return { src, portrait: im.naturalHeight > im.naturalWidth * 1.15 }; } catch { return { src, portrait: false }; }
    }
    const im = await chargerImage(src);
    const portrait = im.naturalHeight > im.naturalWidth * 1.15;
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    if (k === 1 && f.size < 700000) return { src, portrait };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(im.naturalWidth * k);
    canvas.height = Math.round(im.naturalHeight * k);
    canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
    return { src: canvas.toDataURL('image/webp', 0.86), portrait };
  }
  async function ajouterFichiers(fichiers, cible) {
    const erreurs = [];
    const ajoutes = [];
    const p = cible !== 'resultat' ? trouver(cible) : null;
    for (const f of fichiers) {
      if (tousFichiers().length + ajoutes.length >= FICHIERS_MAX) { erreurs.push(`Une création compte ${FICHIERS_MAX} fichiers au plus.`); break; }
      if (f.size > TAILLE_MAX) { erreurs.push(`${f.name} dépasse 10 Mo. Ajoutez plutôt un lien vers ce fichier.`); continue; }
      try {
        const { src, portrait } = await lireMedia(f);
        ajoutes.push(nouveauResultat(d, 'fichier', { src, nom: f.name, mime: f.type || 'application/octet-stream', taille: f.size, portrait }));
      } catch { erreurs.push(`${f.name} ne peut pas être lu. Choisissez un autre fichier.`); }
    }
    if (ajoutes.length) {
      if (p) { p.fichiers.push(...ajoutes); p.ouvert.reponse = true; } else d.resultats.push(...ajoutes);
      if (!d.categorie) { /* proposée dans le panneau */ }
      modifieMaintenant();
      rendre(`r:${ajoutes[0].id}:alt`);
      V.toast(`${cap(plural(ajoutes.length, 'fichier ajouté', 'fichiers ajoutés'))}.`, 'paperclip');
    }
    if (erreurs.length) {
      const zone = $('[data-erreur-fichiers]');
      if (zone && !p) { zone.hidden = false; zone.innerHTML = `${icon('alert')}<span>${t(erreurs.join(' '))}</span>`; } else V.toast(erreurs[0], 'alert');
    }
  }
  function choisirFichiers(cible) {
    cibleFichiers = cible;
    el.fichier.value = '';
    el.fichier.click();
  }

  /* Fenêtres : confirmation, import, outil, aperçu ---------------------- */

  function confirmer({ titre, texte, action, danger = false }) {
    return new Promise(resolve => {
      const dlg = el.confirm;
      dlg.innerHTML = `<h2 id="confirm-titre">${t(titre)}</h2><p>${t(texte)}</p><div class="pub-dialogue-actions"><button class="btn btn-secondary" type="button" data-reponse="non">Annuler</button><button class="btn btn-primary${danger ? ' is-danger' : ''}" type="button" data-reponse="oui">${t(action)}</button></div>`;
      let fini = false;
      const fin = valeur => { if (fini) return; fini = true; if (dlg.open) dlg.close(); resolve(valeur); };
      dlg.addEventListener('close', () => fin(false), { once: true });
      dlg.onclick = e => { const b = e.target.closest('[data-reponse]'); if (b) fin(b.dataset.reponse === 'oui'); else if (e.target === dlg) fin(false); };
      dlg.showModal();
      $('[data-reponse="non"]', dlg).focus();
    });
  }

  /* Import : la conversation collée est découpée en prompts, l'auteur relit puis ajoute. */
  let importResultat = null;
  function rendreImport(texte = '') {
    const r = importResultat;
    el.import.innerHTML = `<div class="pub-dialogue-tete"><h2 id="import-titre">Coller une conversation</h2><button class="icon-btn" type="button" data-fermer aria-label="Fermer">${icon('close', '')}</button></div>
      <div class="pub-dialogue-corps">
        <div class="pub-champ">
          <label class="pub-label" for="import-texte">Conversation</label>
          <p class="pub-aide" id="import-aide">Copiez la conversation dans votre outil et collez-la ici. Chaque message est repéré par la mention placée en début de ligne : « Vous : », « ChatGPT a dit : », « User : »…</p>
          <textarea class="pub-input" id="import-texte" rows="8" data-import-texte aria-describedby="import-aide">${esc(texte)}</textarea>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-import-analyser>Repérer les prompts</button>
        ${r ? (r.echanges.length ? `<div class="pub-import-resultat" role="status">
            <p><b>${plural(r.echanges.length, 'prompt repéré', 'prompts repérés')}</b>${r.outil ? ` · ${esc(r.outil)}${r.modele ? `, ${esc(r.modele)}` : ''}` : ''}</p>
            <ol>${r.echanges.map((e, i) => `<li><b>Prompt ${i + 1}</b><span>${esc(extrait(e.prompt, 140)) || '<i>Vide</i>'}</span></li>`).join('')}</ol>
          </div>` : '<p class="pub-erreur pub-erreur-bloc" role="alert">Aucun prompt repéré dans ce texte.</p>') : ''}
      </div>
      <div class="pub-dialogue-actions"><button class="btn btn-secondary" type="button" data-fermer>Annuler</button><button class="btn btn-primary" type="button" data-import-ajouter${r && r.echanges.length ? '' : ' disabled'}>${r && r.echanges.length ? `Ajouter ${plural(r.echanges.length, 'prompt', 'prompts')}` : 'Ajouter'}</button></div>`;
    V.fixTypography(el.import);
  }
  function ouvrirImport() {
    importResultat = null;
    rendreImport();
    el.import.showModal();
    $('[data-import-texte]', el.import).focus();
  }
  el.import.addEventListener('click', e => {
    if (e.target === el.import || e.target.closest('[data-fermer]')) { el.import.close(); return; }
    if (e.target.closest('[data-import-analyser]')) {
      const texte = $('[data-import-texte]', el.import).value;
      importResultat = texte.trim() ? decouper(texte) : { echanges: [] };
      rendreImport(texte);
      ($('[data-import-ajouter]:not([disabled])', el.import) || $('[data-import-texte]', el.import)).focus();
      return;
    }
    if (e.target.closest('[data-import-ajouter]') && importResultat) {
      const r = importResultat;
      const precedent = prompts().map(p => p.outil).filter(Boolean).pop() || '';
      d.chemin = d.chemin.filter(x => !vide(x));
      const ajoutes = r.echanges.map((ex, i) => nouveauPrompt(d, {
        outil: ex.outil || r.outil || precedent, modele: r.modele && (ex.outil || r.outil) === r.outil ? r.modele : '',
        reglages: i === 0 ? r.reglages : '', prompt: ex.prompt, reponse: ex.reponse, ouvert: { reponse: !!ex.reponse, reglages: !!(r.modele || (i === 0 && r.reglages)) }
      }));
      d.chemin.push(...ajoutes);
      el.import.close();
      modifieMaintenant();
      rendre(`b:${ajoutes[0].id}:prompt`);
      V.toast(`${plural(ajoutes.length, 'prompt ajouté', 'prompts ajoutés')}. Relisez-les et retirez ceux qui n’apportent rien.`, 'clipboard');
    }
  });

  /* Choix de l'outil dans le catalogue de data.js, avec son logo. */
  let popBloc = null;
  let popBouton = null;
  let popActif = 0;
  function optionsOutils(q) {
    const f = V.normalize(q.trim());
    return FAMILLES.map(fam => ({ fam, outils: D.tools.filter(tool => tool.family === fam.id && (!f || V.normalize(tool.name).includes(f))) })).filter(g => g.outils.length);
  }
  function rendrePop(q = '') {
    const groupes = optionsOutils(q);
    const plats = groupes.flatMap(g => g.outils);
    popActif = Math.min(popActif, Math.max(0, plats.length - 1));
    const liste = $('[data-pop-liste]', el.pop);
    liste.innerHTML = plats.length ? groupes.map(g => `<div role="group" aria-labelledby="pf-${g.fam.id}"><p class="pub-pop-fam" id="pf-${g.fam.id}">${t(g.fam.label)}</p>${g.outils.map(tool => {
      const i = plats.indexOf(tool);
      const choisi = popBloc && popBloc.outil === tool.name;
      return `<div class="pub-pop-opt${i === popActif ? ' is-actif' : ''}" role="option" id="po-${i}" aria-selected="${choisi}" data-outil="${esc(tool.name)}">${logo(tool, 20)}<span>${esc(tool.name)}</span>${choisi ? icon('check') : ''}</div>`;
    }).join('')}</div>`).join('') : `<p class="pub-pop-vide">Aucun outil ne correspond à « ${esc(q)} ».</p>`;
    const champRecherche = $('[data-pop-q]', el.pop);
    if (plats.length) champRecherche.setAttribute('aria-activedescendant', `po-${popActif}`); else champRecherche.removeAttribute('aria-activedescendant');
    const opt = $(`#po-${popActif}`, el.pop);
    if (opt) {
      if (opt.offsetTop < liste.scrollTop) liste.scrollTop = opt.offsetTop - 8;
      else if (opt.offsetTop + opt.offsetHeight > liste.scrollTop + liste.clientHeight) liste.scrollTop = opt.offsetTop + opt.offsetHeight - liste.clientHeight + 8;
    }
  }
  function placerPop() {
    if (!popBouton || !popBouton.isConnected) { fermerPop(); return; }
    const r = popBouton.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) { fermerPop(); return; }
    const largeur = Math.min(300, innerWidth - 24);
    el.pop.style.width = `${largeur}px`;
    el.pop.style.left = `${Math.max(12, Math.min(r.left, innerWidth - largeur - 12))}px`;
    const bas = innerHeight - r.bottom;
    if (bas < 320 && r.top > bas) { el.pop.style.top = ''; el.pop.style.bottom = `${innerHeight - r.top + 6}px`; } else { el.pop.style.bottom = ''; el.pop.style.top = `${r.bottom + 6}px`; }
  }
  function ouvrirPop(bouton, bloc) {
    popBloc = bloc;
    popBouton = bouton;
    popActif = 0;
    el.pop.innerHTML = `<div class="pub-pop-tete">${icon('search')}<label class="sr-only" for="pub-pop-q">Rechercher un outil</label><input id="pub-pop-q" type="text" role="combobox" aria-expanded="true" aria-controls="pub-pop-liste" aria-autocomplete="list" placeholder="Rechercher un outil" autocomplete="off" data-pop-q></div><div class="pub-pop-liste" id="pub-pop-liste" role="listbox" aria-label="Outils d’IA" data-pop-liste></div>`;
    el.pop.hidden = false;
    placerPop();
    bouton.setAttribute('aria-expanded', 'true');
    rendrePop();
    $('[data-pop-q]', el.pop).focus();
  }
  function fermerPop(rendreFocus = false) {
    if (el.pop.hidden) return;
    el.pop.hidden = true;
    if (popBouton) { popBouton.setAttribute('aria-expanded', 'false'); if (rendreFocus && popBouton.isConnected) popBouton.focus(); }
    popBloc = null;
  }
  function choisirOutil(nom) {
    const x = popBloc;
    if (!x) return;
    const ancien = P.modeles[x.outil] || [];
    if (x.outil !== nom && ancien.includes(x.modele)) x.modele = '';
    x.outil = nom;
    touches.add(`o:${x.id}`);
    fermerPop();
    modifieMaintenant();
    rendre(`o:${x.id}`);
  }
  addEventListener('resize', () => { if (el.apercu.open) placerApercu(); if (!el.pop.hidden) fermerPop(); });
  addEventListener('scroll', () => { if (!el.pop.hidden) placerPop(); }, { passive: true });

  /* Aperçu : la fiche de création elle-même, chargée avec le brouillon. */
  let ecran = null;
  function placerApercu() {
    const scene = $('[data-scene]', el.apercu);
    const cadre = $('iframe', el.apercu);
    if (!scene || !cadre) return;
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    const largeur = ecran === 'mobile' ? 390 : 1280;
    const k = ecran === 'mobile' ? Math.min(1, (h - 32) / 760) : Math.min(1, (w - 32) / 1280);
    Object.assign(cadre.style, { width: `${largeur}px`, height: `${(h - 32) / k}px`, transform: `scale(${k})`, left: `${(w - largeur * k) / 2}px`, top: '16px' });
  }
  function ouvrirApercu() {
    ecran = ecran || (innerWidth < 760 ? 'mobile' : 'ordinateur');
    el.apercu.innerHTML = `<div class="pub-apercu-tete">
        <h2 id="apercu-titre">Aperçu de la fiche</h2>
        <div class="pub-seg" role="group" aria-label="Taille d’écran">
          <button type="button" data-ecran="ordinateur" aria-pressed="${ecran === 'ordinateur'}">${icon('monitor')}Ordinateur</button>
          <button type="button" data-ecran="mobile" aria-pressed="${ecran === 'mobile'}">${icon('phone')}Mobile</button>
        </div>
        <p class="pub-apercu-note">${icon('lock')}${d.statut === 'publiee' ? 'Vos modifications, avant publication' : 'Visible de vous seul jusqu’à la publication'}</p>
        <button class="icon-btn" type="button" data-fermer aria-label="Fermer l’aperçu">${icon('close', '')}</button>
      </div>
      <div class="pub-apercu-scene" data-scene><iframe title="Aperçu de la fiche « ${esc(d.titre || 'Création sans titre')} »" src="fiche-creation.html?id=ma-creation&amp;apercu=1"></iframe></div>`;
    el.apercu.onclick = e => {
      if (e.target.closest('[data-fermer]') || e.target === el.apercu) el.apercu.close();
      const b = e.target.closest('[data-ecran]');
      if (b) { ecran = b.dataset.ecran; $$('[data-ecran]', el.apercu).forEach(k => k.setAttribute('aria-pressed', String(k === b))); placerApercu(); }
    };
    el.apercu.showModal();
    requestAnimationFrame(placerApercu);
    $('[data-fermer]', el.apercu).focus();
  }

  /* Publication ---------------------------------------------------------- */

  async function publier() {
    if (!V.exiger('contribuer', 'publier une création')) return;
    tentative = true;
    const err = valider();
    const sens = sensiblesATraiter();
    if (err.size) {
      rendreTout();
      const n = [...new Set([...err.values()].map(e => e.groupe))].length;
      annoncer(`${plural(n, 'point', 'points')} à compléter avant de publier.`);
      aller([...err.keys()][0]);
      return;
    }
    if (sens.length) { rendreTout(); annoncer('Des passages sensibles sont à vérifier.'); aller(`masquer:${sens[0].id}`); return; }
    if (restantes() === 0) { rendreCote(); V.toast(`Limite atteinte : vous pourrez publier ${P.quota.prochaine}.`, 'clock'); aller('pub-limite'); return; }
    if (!consentement) { erreurConsentement = true; rendreCote('consentement'); return; }
    const etaitPubliee = d.statut === 'publiee';
    const premiere = !etaitPubliee && E.get().niveau === 'curieux';
    d.statut = 'publiee';
    if (!etaitPubliee) { d.publieLe = maintenant(); publieesIci += 1; }
    d.modifieLe = maintenant();
    modifsNonPubliees = false;
    reglerDepuisUI('contenu', 'publiee');
    d.scenario = cleScenario(S);
    await sauver();
    ecrireFiche();
    consentement = false;
    tentative = false;
    if (etaitPubliee) { rendreTout(); V.toast('Modifications publiées.'); return; }
    vueFin = true;
    el.fin.innerHTML = finHTML({ premiere });
    V.fixTypography(el.fin);
    appliquerEtat();
    scrollTo({ top: 0, behavior: 'auto' });
    $('[data-fin-titre]').focus({ preventScroll: true });
  }

  function ajouterEtiquette(valeur) {
    const v = cap(String(valeur).replace(/,/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 30);
    if (!v) return;
    if (d.etiquettes.length >= 5) return;
    if (d.etiquettes.some(e => e.toLowerCase() === v.toLowerCase())) { V.toast(`« ${v} » figure déjà dans vos étiquettes.`, 'tag'); return; }
    d.etiquettes.push(v);
    modifie();
    rendreCote(d.etiquettes.length >= 5 ? `etiquette:${v}` : 'etiquette-saisie');
  }

  const ACTIONS = {
    publier,
    apercu: ouvrirApercu,
    supprimer: supprimerTout,
    depublier,
    importer: ouvrirImport,
    aller: b => aller(b.dataset.cible),
    'voir-liste': () => aller('liste-presentation'),
    'fermer-reprise': () => { reprise = false; rendreEntete(); $('#f-titre')?.focus(); },
    'ajouter-resultat': b => {
      const sorte = b.dataset.sorte;
      if (sorte === 'fichier') { choisirFichiers('resultat'); return; }
      const r = nouveauResultat(d, sorte);
      d.resultats.push(r);
      modifieMaintenant();
      rendre(sorte === 'lien' ? `r:${r.id}:url` : sorte === 'code' ? `r:${r.id}:texte` : `r:${r.id}:texte`);
    },
    'retirer-resultat': async b => {
      const r = trouver(b.dataset.id);
      if (!r) return;
      const rempli = longueur(r.texte) || longueur(r.url) || r.src;
      if (rempli && !(await confirmer({ titre: 'Retirer cet élément du résultat ?', texte: 'Son contenu sera effacé du brouillon.', action: 'Retirer', danger: true }))) return;
      const i = d.resultats.indexOf(r);
      d.resultats.splice(i, 1);
      modifieMaintenant();
      const voisin = d.resultats[Math.min(i, d.resultats.length - 1)];
      rendre(voisin ? `retirer:${voisin.id}` : `ajouter-resultat:${r.kind}`);
    },
    outil: b => { const x = trouver(b.dataset.id); if (!x) return; if (!el.pop.hidden && popBouton === b) { fermerPop(true); return; } ouvrirPop(b, x); },
    ouvrir: b => {
      const x = trouver(b.dataset.id);
      const quoi = b.dataset.quoi;
      x.ouvert[quoi] = !x.ouvert[quoi];
      rendre(x.ouvert[quoi] ? (quoi === 'reponse' ? `b:${x.id}:reponse` : `b:${x.id}:modele`) : b.dataset.k);
    },
    moment: b => {
      const x = trouver(b.dataset.id);
      if (x.moment) {
        if (longueur(x.moment.texte)) { aller(`m:${x.id}`); return; }
        momentsMemo[x.id] = x.moment;
        x.moment = null;
        modifieMaintenant();
        rendre(b.dataset.k);
        return;
      }
      x.moment = momentsMemo[x.id] || { type: 'correction', texte: '' };
      modifieMaintenant();
      rendre(`mt:${x.id}`);
    },
    monter: b => { const x = trouver(b.dataset.id); if (deplacer(d.chemin, x, -1)) { modifie(); rendre(d.chemin.indexOf(x) === 0 ? `descendre:${x.id}` : `monter:${x.id}`); } },
    descendre: b => { const x = trouver(b.dataset.id); if (deplacer(d.chemin, x, 1)) { modifie(); rendre(d.chemin.indexOf(x) === d.chemin.length - 1 ? `monter:${x.id}` : `descendre:${x.id}`); } },
    'supprimer-bloc': async b => {
      const x = trouver(b.dataset.id);
      if (!x || d.chemin.length === 1) return;
      const nom = x.kind === 'prompt' ? 'ce prompt' : 'cette étape';
      if (!vide(x) && !(await confirmer({ titre: `Supprimer ${nom} ?`, texte: x.kind === 'prompt' ? 'Son texte, la réponse, les fichiers joints et le moment clé seront effacés.' : 'Son titre, son texte et son moment clé seront effacés.', action: 'Supprimer', danger: true }))) return;
      const i = d.chemin.indexOf(x);
      d.chemin.splice(i, 1);
      modifieMaintenant();
      const voisin = d.chemin[Math.min(i, d.chemin.length - 1)];
      rendre(voisin.kind === 'prompt' ? `b:${voisin.id}:prompt` : `b:${voisin.id}:titre`);
      V.toast(x.kind === 'prompt' ? 'Prompt supprimé.' : 'Étape supprimée.', 'trash');
    },
    'ajouter-prompt': () => {
      const precedent = prompts().map(p => p.outil).filter(Boolean).pop() || '';
      const x = nouveauPrompt(d, { outil: precedent });
      d.chemin.push(x);
      modifieMaintenant();
      rendre(`b:${x.id}:prompt`);
    },
    'ajouter-etape': () => { const x = nouvelleEtape(d); d.chemin.push(x); modifieMaintenant(); rendre(`b:${x.id}:titre`); },
    joindre: b => choisirFichiers(b.dataset.id),
    'retirer-fichier': b => {
      const id = b.dataset.id;
      const x = prompts().find(p => p.fichiers.some(f => f.id === id));
      if (x) x.fichiers = x.fichiers.filter(f => f.id !== id);
      modifieMaintenant();
      rendre(x ? `joindre:${x.id}` : undefined);
    },
    masquer: b => {
      const s = sensibles().find(k => k.id === b.dataset.id);
      if (!s) return;
      ecrireChamp(s.cle, lireChamp(s.cle).split(s.valeur).join(s.masque));
      modifieMaintenant();
      rendre(s.cle);
      V.toast(`${s.type} remplacée par « ${s.masque} ».`, 'eye-off');
    },
    conserver: b => { const s = sensibles().find(k => k.id === b.dataset.id); d.decisions[b.dataset.id] = 1; modifie(); rendre(s ? s.cle : undefined); },
    'proposer-categorie': () => { d.categorie = categorieProposee(); modifie(); rendreCote('categorie'); },
    'retirer-etiquette': b => { d.etiquettes = d.etiquettes.filter(e => e !== b.dataset.v); modifie(); rendreCote('etiquette-saisie'); },
    'copier-lien': async () => { const url = new URL(FICHE, location.href).href; try { await navigator.clipboard.writeText(url); V.toast('Lien de la fiche copié.', 'copy'); } catch { V.toast(`Copie indisponible. Lien : ${url}`, 'copy'); } },
    'continuer-modifier': () => { vueFin = false; appliquerEtat(); scrollTo({ top: 0, behavior: 'auto' }); $('#f-titre')?.focus({ preventScroll: true }); }
  };

  /* Événements --------------------------------------------------------- */

  document.addEventListener('click', e => {
    if (!el.pop.hidden && !el.pop.contains(e.target) && !e.target.closest('[data-action="outil"]')) fermerPop();
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled || b.closest('.tweaks')) return;
    const f = ACTIONS[b.dataset.action];
    if (!f) return;
    e.preventDefault();
    f(b);
  });

  document.addEventListener('input', e => {
    const champEl = e.target.closest('[data-f]');
    if (champEl && el.editeur.contains(champEl)) {
      const cle = champEl.dataset.f;
      ecrireChamp(cle, champEl.value);
      if (cle.endsWith(':url')) { const r = trouver(cle.split(':')[1]); if (r && !r.typeChoisi) { r.type = typeLien(r.url); const sel = $(`[data-lien-type="${r.id}"]`); if (sel) sel.value = r.type || 'demo'; } }
      if (champEl.tagName === 'TEXTAREA' && tailleAuto) { champEl.style.height = 'auto'; champEl.style.height = `${champEl.scrollHeight + 2}px`; }
      modifie();
      const err = majPanneau();
      if (touches.has(cle) || tentative) majChamp(cle, err);
      return;
    }
    if (e.target.matches('[data-pop-q]')) { popActif = 0; rendrePop(e.target.value); }
  });

  /* En quittant un champ rempli : erreur éventuelle et données sensibles. */
  document.addEventListener('focusout', e => {
    const champEl = e.target.closest && e.target.closest('[data-f]');
    if (!champEl || !el.editeur.contains(champEl)) return;
    const cle = champEl.dataset.f;
    if (longueur(champEl.value) || touches.has(cle)) { touches.add(cle); majChamp(cle); }
    majAlertes(cle);
    majPanneau();
  });

  document.addEventListener('change', e => {
    const c = e.target;
    if (!el.editeur.contains(c)) return;
    if (c.matches('[data-categorie]')) { d.categorie = c.value; touches.add('categorie'); modifie(); rendreCote('categorie'); return; }
    if (c.matches('[data-licence]')) { d.licence = c.value; modifie(); rendreCote('licence'); return; }
    if (c.matches('[data-mtype]')) { const x = trouver(c.dataset.mtype); if (x && x.moment) x.moment.type = c.value; modifie(); rendre(`mt:${c.dataset.mtype}`); return; }
    if (c.matches('[data-lien-type]')) { const r = trouver(c.dataset.lienType); if (r) { r.type = c.value; r.typeChoisi = true; } modifie(); return; }
    if (c.matches('[data-defi-choix]')) { d.defi = c.checked ? P.defi.id : null; touches.add('defi'); reglerDepuisUI('defi', c.checked ? 'affiche' : 'sans'); modifie(); rendreCote('defi'); return; }
    if (c.matches('[data-agent-flag]')) { d.agent = c.checked; modifie(); return; }
    if (c.matches('[data-consentement]')) { consentement = c.checked; if (erreurConsentement && consentement) { erreurConsentement = false; rendreCote('consentement'); } }
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('[data-etiquette]') && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); ajouterEtiquette(e.target.value); return; }
    if (e.target.matches('[data-etiquette]') && e.key === 'Backspace' && !e.target.value && d.etiquettes.length) { d.etiquettes.pop(); modifie(); rendreCote('etiquette-saisie'); return; }
    if (e.key === 'Enter' && e.target.matches('.pub-form input[type="text"], .pub-form input[type="url"]')) { e.preventDefault(); return; }
    if (e.target.matches('[data-pop-q]')) {
      const plats = optionsOutils(e.target.value).flatMap(g => g.outils);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); popActif = (popActif + (e.key === 'ArrowDown' ? 1 : -1) + plats.length) % Math.max(1, plats.length); rendrePop(e.target.value); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); popActif = e.key === 'Home' ? 0 : plats.length - 1; rendrePop(e.target.value); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (plats[popActif]) choisirOutil(plats[popActif].name); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerPop(true); return; }
      if (e.key === 'Tab') fermerPop();
    }
  });

  el.form.addEventListener('submit', e => e.preventDefault());

  /* Fichiers déposés ou collés dans le résultat, ou dans la réponse d'un prompt. */
  document.addEventListener('paste', e => {
    const fichiers = [...(e.clipboardData ? e.clipboardData.files : [])];
    if (!fichiers.length || el.editeur.hidden) return;
    const actif = document.activeElement;
    const bloc = actif && actif.closest('[data-bloc]');
    const depot = actif && actif.closest('[data-depot]');
    if (!bloc && !depot) return;
    e.preventDefault();
    ajouterFichiers(fichiers, bloc && trouver(bloc.dataset.bloc)?.kind === 'prompt' ? bloc.dataset.bloc : 'resultat');
  });
  ['dragover', 'dragenter'].forEach(type => document.addEventListener(type, e => {
    const zone = e.target.closest && e.target.closest('[data-depot]');
    if (!zone || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    zone.classList.add('is-survol');
  }));
  document.addEventListener('dragleave', e => { const zone = e.target.closest && e.target.closest('[data-depot]'); if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-survol'); });
  document.addEventListener('drop', e => {
    const zone = e.target.closest && e.target.closest('[data-depot]');
    if (!zone || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    zone.classList.remove('is-survol');
    ajouterFichiers([...e.dataTransfer.files], 'resultat');
  });
  el.fichier.addEventListener('change', () => { if (el.fichier.files.length) ajouterFichiers([...el.fichier.files], cibleFichiers); });
  el.pop.addEventListener('mousedown', e => { if (e.target.closest('[data-outil]')) e.preventDefault(); });
  el.pop.addEventListener('click', e => { const o = e.target.closest('[data-outil]'); if (o) choisirOutil(o.dataset.outil); });

  /* Panneau Tweaks : états propres à la page et variantes d'apparence ---- */

  let depuisUI = false;
  function reglerDepuisUI(nom, valeur) {
    depuisUI = true;
    try { V.regler(nom, valeur); } finally { depuisUI = false; }
    S[nom] = valeur;
  }
  const membre = e => e.session === 'membre';
  const reglages = V.initTweaks({
    key: 'vysora-publier-reglages-v3',
    etats: [
      { name: 'contenu', legend: 'Création', options: [['vide', 'Nouvelle'], ['brouillon', 'Brouillon repris'], ['publiee', 'Publiée']], si: membre },
      { name: 'exemple', legend: 'Brouillon d’exemple', options: [['prompt', 'Script, 1 prompt'], ['iteration', 'Affiche, itération'], ['projet', 'Application, projet']], si: (e, s) => membre(e) && s.contenu !== 'vide' },
      { name: 'donnees', legend: 'Données sensibles', options: [['aucune', 'Aucune'], ['reperees', 'Repérées']], si: (e, s) => membre(e) && s.contenu !== 'vide' },
      { name: 'agent', legend: 'Instructions pour agent', options: [['aucune', 'Aucune'], ['reperees', 'Repérées']], si: (e, s) => membre(e) && s.contenu !== 'vide' && s.exemple === 'projet' },
      { name: 'defi', legend: 'Défi en cours', options: [['sans', 'Sans participation'], ['affiche', 'Participation']], si: membre },
      { name: 'quota', legend: 'Publications des dernières 24 heures', options: [['disponible', 'Sous la limite'], ['atteint', 'Limite atteinte']], si: e => membre(e) && Number.isFinite(E.limite('creations', e)) }
    ],
    apparence: [
      { name: 'indications', legend: 'Indications', options: [['visibles', 'Visibles'], ['discretes', 'Masquées']] },
      { name: 'largeur', legend: 'Largeur du formulaire', options: [['standard', 'Standard'], ['large', 'Large']] },
      'accent', 'density', 'radius', 'effects', 'motion'
    ],
    defaults: { contenu: 'vide', exemple: 'iteration', donnees: 'aucune', agent: 'aucune', defi: 'sans', quota: 'disponible', indications: 'visibles', largeur: 'standard' },
    onChange: (changed, settings) => {
      S = { ...settings };
      if (depuisUI || !d || changed === 'init') return;
      if (['contenu', 'exemple', 'donnees', 'agent', 'reset'].includes(changed)) {
        if (cleScenario(S) === d.scenario) { d.defi = S.defi === 'affiche' ? P.defi.id : null; if (!el.editeur.hidden) rendreTout(); return; }
        chargerScenario();
        return;
      }
      if (changed === 'defi') { d.defi = S.defi === 'affiche' ? P.defi.id : null; modifie(); if (!el.editeur.hidden) rendreCote(); return; }
      if (changed === 'quota' && !el.editeur.hidden) rendreCote();
    }
  });
  S = { ...(reglages || {}) };

  function reinitialiserVue() {
    vueFin = false;
    introuvable = false;
    modifsNonPubliees = false;
    consentement = false;
    erreurConsentement = false;
    tentative = false;
    reprise = false;
    touches.clear();
    Object.keys(momentsMemo).forEach(k => delete momentsMemo[k]);
    etatSauvegarde = 'charge';
    heureSauvegarde = '';
  }
  function chargerScenario() {
    fermerFenetres();
    d = construire(S);
    d.defi = S.defi === 'affiche' ? P.defi.id : null;
    reinitialiserVue();
    reprise = S.contenu === 'brouillon';
    sauver();
    appliquerEtat();
  }

  E.on(() => { if (d) appliquerEtat(); });

  async function demarrer() {
    const idParam = params.get('id');
    const defiParam = params.get('defi');
    /* Ouverture depuis Mes contenus : ?brouillon=… reprend un brouillon, ?modifier=… une création publiée. */
    const exempleParam = params.get('brouillon') || params.get('modifier');
    if (idParam) {
      d = depuisCreation(idParam);
      if (!d) { introuvable = true; d = nouveauBrouillon(); }
    } else if (exempleParam && P.exemples[exempleParam]) {
      const s = { ...S, contenu: params.has('modifier') ? 'publiee' : 'brouillon', exemple: exempleParam };
      const sauve = await lire();
      d = sauve && sauve.v === 3 && sauve.scenario === cleScenario(s) ? sauve : construire(s);
      if (s.contenu === 'brouillon' && P.exemples[exempleParam].defi && !d.defi) d.defi = P.defi.id;
      reprise = s.contenu === 'brouillon';
    } else {
      const sauve = await lire();
      if (sauve && sauve.v === 3 && sauve.scenario === cleScenario(S)) {
        d = sauve;
        reprise = d.statut === 'brouillon' && !!d.modifieLe && (longueur(d.titre) > 0 || d.chemin.some(x => !vide(x)) || d.resultats.length > 0);
      } else {
        d = construire(S);
        reprise = S.contenu === 'brouillon';
      }
      if (defiParam && (defiParam === P.defi.id || defiParam === P.defi.titre)) reglerDepuisUI('defi', 'affiche');
      d.defi = S.defi === 'affiche' ? P.defi.id : null;
    }
    appliquerEtat();
    if (!idParam) sauver();
  }
  demarrer();
})();
