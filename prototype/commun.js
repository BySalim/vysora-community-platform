'use strict';

/* Composants et outils partagés par les pages du prototype.
   L'accueil n'utilise que le panneau Tweaks, le compte, l'accès aux actions et la
   recherche ; le reste de son interface vit dans app.js. Les états viennent de etats.js. */

window.Vysora = (() => {
  const D = window.VYSORA_DATA;
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* Texte et nombres --------------------------------------------------- */

  const numberFormat = new Intl.NumberFormat('fr-FR');
  const fmt = value => numberFormat.format(value);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const typo = value => String(value)
    .replace(/ ([:»])/g, ' $1')
    .replace(/ ([;!?])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/(\d) (\d{3})(?!\d)/g, '$1 $2')
    .replace(/(\d) (%|FCFA|min|h|j|s|points|px|Mo)(?![\wÀ-ÿ])/g, '$1 $2');
  const t = value => esc(typo(value));
  const plural = (count, one, many) => `${fmt(count)} ${count > 1 ? many : one}`;
  const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const parseDay = iso => new Date(`${iso}T12:00:00`);
  const dateLabel = (iso, withYear = true) => {
    const d = parseDay(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
  };
  const daysAgo = iso => Math.round((parseDay(D.today) - parseDay(iso)) / 86400000);
  const relativeDay = iso => {
    const n = daysAgo(iso);
    if (n <= 0) return 'aujourd’hui';
    if (n === 1) return 'hier';
    if (n < 7) return `il y a ${n} jours`;
    return `le ${dateLabel(iso, false)}`;
  };

  const icon = (name, cls = 'icon-sm') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } }
  };

  /* Outils d'IA, personnes, types ------------------------------------- */

  const TOOL_BY_NAME = Object.fromEntries(D.tools.map(tool => [tool.name, tool]));
  const TOOL_KEYS = [
    ...D.tools.map(tool => [tool.name, tool]),
    ...Object.entries(D.toolAliases).map(([alias, name]) => [alias, TOOL_BY_NAME[name]])
  ].filter(([, tool]) => tool).sort((a, b) => b[0].length - a[0].length);
  const WORD = /[0-9A-Za-zÀ-ÿ]/;
  const logo = (tool, size = 16, cls = '') => {
    const entry = typeof tool === 'string' ? TOOL_BY_NAME[tool] : tool;
    if (!entry) return '';
    return `<img class="tool-logo${entry.mono ? ' is-mono' : ''}${cls ? ` ${cls}` : ''}" src="assets/logos-ia/${entry.logo}.svg" alt="" width="${size}" height="${size}" decoding="async">`;
  };
  function withLogos(text) {
    const raw = typo(text);
    const used = new Set();
    let html = '';
    let plain = '';
    let i = 0;
    while (i < raw.length) {
      const hit = WORD.test(raw[i - 1] || ' ') ? null : TOOL_KEYS.find(([key]) => raw.startsWith(key, i) && !WORD.test(raw[i + key.length] || ' '));
      if (!hit) { plain += raw[i]; i += 1; continue; }
      const [key, tool] = hit;
      html += esc(plain);
      plain = '';
      if (used.has(tool.name)) html += esc(key);
      else { used.add(tool.name); html += `<span class="tool-ref">${logo(tool)}${esc(key)}</span>`; }
      i += key.length;
    }
    return html + esc(plain);
  }

  const avatar = (name, size = 28, cls = '') => {
    const slug = D.avatars[name];
    const classes = `avatar${cls ? ` ${cls}` : ''}`;
    if (!slug) return `<span class="${classes}" aria-hidden="true"></span>`;
    return `<img class="${classes}" src="assets/avatars/${slug}.webp" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  };

  const TYPE_LABEL = { prompt: '1 prompt', iteration: 'Itération', projet: 'Projet' };
  const typeTag = type => `<span class="type-tag" data-type="${type}">${icon(`type-${type}`)}${TYPE_LABEL[type]}</span>`;

  /* Aperçus des créations --------------------------------------------- */

  const MOCKS = {
    booking: () => `<div class="mock-window"><div class="mock-bar"><i></i>Keur Awa<small>Coiffure</small></div><div class="mock-pad"><p class="mock-label">Samedi 18 octobre</p><div class="mock-slots"><span>09:00</span><span class="off">10:30</span><span class="on">12:00</span><span>14:00</span><span class="off">15:30</span><span>17:00</span></div><div class="mock-btn">Confirmer le rendez-vous</div></div></div>`,
    dashboard: () => `<div class="mock-window"><div class="mock-bar"><i></i>Ventes<small>Juin à septembre</small></div><div class="mock-pad"><div class="mock-kpis"><span>Chiffre d’affaires<b>4,2 M</b></span><span>Commandes<b>1 318</b></span><span>Retours<b>2,4 %</b></span></div><div class="mock-chart">${[38, 52, 46, 61, 57, 72, 66, 88, 79].map((h, i) => `<i${i === 7 ? ' class="hi"' : ''} style="--h:${h}%"></i>`).join('')}</div></div></div>`,
    flow: () => `<div class="mock-flow"><div class="mock-node"><span class="glyph">${icon('mail', '')}</span>Messagerie<small>Libellé Factures</small></div><span class="mock-link"></span><div class="mock-node is-key"><span class="glyph">${icon('scan', '')}</span>Extraction<small>Montant TTC</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph">${icon('folder', '')}</span>Classement<small>Par mois</small></div></div>`,
    letter: () => `<div class="mock-paper"><p>Madame, Monsieur,</p><p><del>Passionné et dynamique, je souhaite</del> <ins>J’ai organisé 14 ateliers de prévention</ins> dans trois quartiers d’Abidjan.</p><div class="mock-lines"><i style="width:94%"></i><i style="width:86%"></i><i style="width:58%"></i></div></div>`,
    code: () => `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>renommer_photos.py</span></div><pre><span class="k">for</span> photo <span class="k">in</span> dossier.glob(<span class="s">"*.jpg"</span>):
    date = <span class="f">lire_date</span>(photo)
    nom = date.strftime(<span class="s">"%Y-%m-%d_%H%M%S"</span>)
    <span class="k">if</span> simulation:
        <span class="f">print</span>(photo.name, <span class="s">"→"</span>, nom)
<span class="c"># 248 photos, aucun fichier modifié</span></pre></div>`,
    cards: () => `<div class="mock-cards"><span></span><span></span><span><em>Photosynthèse</em><b>Quels sont les réactifs de la photosynthèse ?</b><small>Fiche 3 sur 12</small></span></div>`,
    logo: () => `<div class="mock-logo"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 18c9 0 16 8.5 16 19S41 56 32 56 16 47.5 16 37s7-19 16-19Z" fill="#171717"/><path d="M33 19c1.5-8 9-12.5 17-11-1 8-8 12.5-17 11Z" fill="#2563EB"/><path d="M25 33c1.5-4 4.5-6.5 9-7.5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg><b>Karité de Koutiala</b><small>Coopérative</small></div>`,
    site: () => `<div class="mk-site"><div class="mk-site-nav"><b>Saveurs de Ngor</b><span>Menu</span><span>Galerie</span><span class="mk-cta">Demander un devis</span></div><div class="mk-site-hero"><p>Traiteur à Dakar</p><b>Vos réceptions, de 20 à 300 invités</b><span class="mk-cta">Composer mon menu</span></div><div class="mk-site-cols"><i></i><i></i><i></i></div></div>`,
    form: () => `<div class="mock-window mk-form"><div class="mock-bar"><i></i>Inscription<small>Saison 2026-2027</small></div><div class="mock-pad"><label>Nom complet<span class="mk-field">Fatou Ndiaye</span></label><label>Adresse e-mail<span class="mk-field is-error">fatou.ndiaye@</span><em>Cette adresse e-mail est incomplète.</em></label><div class="mock-btn">Envoyer mon inscription</div></div></div>`,
    review: () => `<div class="mk-review"><div class="mk-review-in"><span class="mk-stars" aria-hidden="true">★★★★<i>★</i></span><p>Le thiéboudienne était parfait, mais nous avons attendu 40 minutes.</p><small>Mamadou, il y a 2 jours</small></div><div class="mk-review-out"><small>Réponse du restaurant</small><p>Merci Mamadou ! Ravis que le thiéboudienne vous ait plu. Nous ajoutons un serveur le samedi midi pour réduire l’attente.</p></div></div>`,
    translation: () => `<div class="mk-trans"><div><small>Français</small><p>Beurre de karité <mark>brut</mark>, pressé à froid à Koutiala.</p></div><div><small>Anglais</small><p><mark>Unrefined</mark> shea butter, cold-pressed in Koutiala.</p></div><span class="mk-gloss">Glossaire : brut → unrefined</span></div>`,
    sql: () => `<div class="mock-code mk-sql"><div class="mock-bar"><i></i><i></i><i></i><span>clients_inactifs.sql</span></div><pre><span class="k">SELECT</span> c.nom, <span class="f">MAX</span>(o.date) <span class="k">AS</span> derniere
<span class="k">FROM</span> clients c
<span class="k">LEFT JOIN</span> commandes o <span class="k">ON</span> o.client_id = c.id
<span class="k">GROUP BY</span> c.id
<span class="k">HAVING</span> <span class="f">MAX</span>(o.date) &lt; <span class="f">now</span>() - <span class="s">'90 days'</span>
    <span class="k">OR</span> <span class="f">MAX</span>(o.date) <span class="k">IS NULL</span>;</pre></div>`,
    diff: () => `<div class="mock-code mk-diff"><div class="mock-bar"><i></i><i></i><i></i><span>manifest.json</span></div><pre>  <span class="c">"name": "Pause vidéo",</span>
<span class="del">- "host_permissions": ["&lt;all_urls&gt;"],</span>
<span class="add">+ "permissions": ["activeTab", "storage"],</span>
  <span class="c">"content_scripts": [{</span>
    <span class="c">"js": ["pause.js"]</span>
  <span class="c">}]</span></pre></div>`,
    'flow-devis': () => `<div class="mock-flow mk-flow4"><div class="mock-node"><span class="glyph">${icon('chart', '')}</span>Tableur<small>Devis à J+7</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph">${icon('pen', '')}</span>Relance<small>Rédigée</small></div><span class="mock-link"></span><div class="mock-node is-key"><span class="glyph">${icon('check', '')}</span>Validation<small>Avant envoi</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph">${icon('mail', '')}</span>Envoi<small>Statut mis à jour</small></div></div>`,
    digest: () => `<div class="mock-window mk-digest"><div class="mock-bar"><i></i>Résumé du matin<small>8:00</small></div><div class="mock-pad"><p><b>Décisions</b></p><ul><li>Lancement de la campagne lundi <span>Aminata</span></li><li>Budget visuels validé <span>Karim</span></li></ul><p><b>Questions ouvertes</b></p><ul><li>Date du point client</li></ul></div></div>`,
    table: () => `<div class="mock-window mk-table"><div class="mock-bar"><i></i>contacts.csv<small>4 012 lignes</small></div><table><tr><th>Nom</th><th>E-mail</th><th>Statut</th></tr><tr><td>A. Diallo</td><td>adiallo@…</td><td class="ok">Conservé</td></tr><tr class="dup"><td>Awa Diallo</td><td>adiallo@…</td><td>Fusionné</td></tr><tr class="check"><td>A. Diallo</td><td>aminata.d@…</td><td>À vérifier</td></tr><tr><td>B. Traoré</td><td>btraore@…</td><td class="ok">Conservé</td></tr></table></div>`,
    line: () => `<div class="mock-window mk-line"><div class="mock-bar"><i></i>Précipitations à Bamako<small>2025, en mm</small></div><div class="mock-pad"><svg viewBox="0 0 240 110" aria-hidden="true"><rect class="season" x="104" y="6" width="96" height="86"/><path class="grid" d="M10 92h224M10 64h224M10 36h224"/><path class="area" d="M10 92 L30 91 L50 90 L70 86 L90 70 L110 46 L130 24 L150 14 L170 34 L190 70 L210 88 L230 91 L230 92 Z"/><path class="curve" d="M10 92 L30 91 L50 90 L70 86 L90 70 L110 46 L130 24 L150 14 L170 34 L190 70 L210 88 L230 91"/><circle cx="150" cy="14" r="3.5"/></svg><p class="mk-axis"><span>Janv.</span><span>Saison des pluies</span><span>Déc.</span></p></div></div>`,
    wave: () => `<div class="mk-audio"><div class="mk-audio-head"><span class="mk-play">${icon('play', '')}</span><b>Générique · Le Grand Palabre</b><small>0:10</small></div><div class="mk-wave">${[30, 48, 62, 40, 72, 90, 64, 52, 80, 96, 70, 44, 58, 86, 74, 50, 66, 92, 60, 38, 54, 78, 46, 28].map((h, i) => `<i style="--h:${h}%"${i < 9 ? ' class="on"' : ''}></i>`).join('')}</div></div>`,
    voice: () => `<div class="mk-audio mk-voice"><div class="mk-audio-head"><span class="mk-play">${icon('play', '')}</span><b>Voix off · Tutoriel</b><small>3:04</small></div><div class="mk-wave">${[22, 34, 40, 28, 12, 6, 30, 44, 38, 26, 10, 5, 36, 48, 42, 30, 14, 6, 32, 40, 34, 24, 12, 6].map((h, i) => `<i style="--h:${h}%"${i < 6 ? ' class="on"' : ''}></i>`).join('')}</div><p>« Étape 2. Ouvrez le menu Paramètres… »</p></div>`,
    quiz: () => `<div class="mock-window mk-quiz"><div class="mock-bar"><i></i>Quiz · L’empire du Mali<small>4 sur 10</small></div><div class="mock-pad"><b>Quelle ville était un grand centre d’étude sous Mansa Moussa ?</b><span>Koumbi Saleh</span><span class="on">Tombouctou</span><span>Ségou</span><small>Source : document 2, page 4</small></div></div>`,
    brand: () => `<div class="mk-brand"><div class="mk-swatches"><i style="--c:#E9D8B4"></i><i style="--c:#C7923E"></i><i style="--c:#2B3A67"></i><i style="--c:#16213E"></i><i style="--c:#F7F3EA"></i></div><div class="mk-type"><b>Nafi</b><span>Soins au karité · Aa Bb 123</span></div></div>`,
    video: () => `<div class="mk-video"><div class="mk-frames">${['', 'is-half', 'is-full'].map(state => `<span class="${state}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 6a14 14 0 1 1-9.9 4.1"/></svg></span>`).join('')}</div><div class="mk-timeline"><i></i><span>0:00</span><span>0:06</span></div></div>`,
    calendar: () => `<div class="mock-window mk-cal"><div class="mock-bar"><i></i>Five Ngor<small>Samedi 18 oct.</small></div><div class="mk-cal-grid"><span></span><b>Terrain 1</b><b>Terrain 2</b>${[['17:00', 'off', ''], ['18:00', 'off', 'off'], ['19:00', 'on', ''], ['20:00', '', 'off'], ['21:00', '', '']].map(([hour, a, b]) => `<span class="mk-hour">${hour}</span><i class="${a}"></i><i class="${b}"></i>`).join('')}</div></div>`,
    agenda: () => `<div class="mock-window mk-agenda"><div class="mock-bar"><i></i>Cabinet Kiné Plateau<small>Mardi</small></div><div class="mock-pad">${[['08:30', 'Rééducation du genou', '45 min', 'long'], ['09:15', 'Massage dorsal', '30 min', ''], ['09:45', 'Disponible', '', 'free'], ['10:15', 'Rééducation de l’épaule', '45 min', 'long']].map(([hour, label, length, kind]) => `<p class="${kind}"><time>${hour}</time><span>${label}</span><small>${length}</small></p>`).join('')}</div></div>`,
    waitlist: () => `<div class="mock-window mk-wait"><div class="mock-bar"><i></i>Yoga doux<small>Jeudi 19:00</small></div><div class="mock-pad"><p class="mk-wait-full"><span>12 places sur 12</span><b>Complet</b></p><span class="mk-wait-bar"><i></i></span><p class="mk-wait-title">Liste d’attente</p><ol><li>Fatou K.<small>Prévenue</small></li><li>Mehdi R.</li><li>Inès B.</li></ol></div></div>`,
    files: () => `<div class="mock-code mk-files"><div class="mock-bar"><i></i><i></i><i></i><span>ranger.py --simulation</span></div><pre><span class="c"># Simulation : aucun fichier déplacé</span>
facture_octobre.pdf  <span class="k">→</span> <span class="s">Documents/</span>
photo_0412.jpg       <span class="k">→</span> <span class="s">Images/</span>
maquette_v2.zip      <span class="k">→</span> <span class="s">Archives/</span>
rapport.crdownload   <span class="f">ignoré</span>
<span class="c"># 214 fichiers à ranger, 0 supprimé</span></pre></div>`,
    /* Créations publiées par Clarisse Mendy (profil-data.js). */
    glossaire: () => `<div class="mk-trans"><div><small>Français</small><p>Sortie dans les <mark>bolongs</mark> au départ du campement.</p></div><div><small>Anglais</small><p>A trip through the <mark>bolongs</mark>, the mangrove channels.</p></div><span class="mk-gloss">Glossaire : bolong, gardé en français</span></div>`,
    'devis-atelier': () => `<div class="mk-site"><div class="mk-site-nav"><b>Atelier Sagna</b><span>Réalisations</span><span>Bois</span><span class="mk-cta">Demander un devis</span></div><div class="mk-site-hero"><p>Menuiserie à Ziguinchor</p><b>Meubles en bois de vène, faits sur mesure</b><span class="mk-cta">Estimer mon meuble</span></div><div class="mk-site-cols"><i></i><i></i><i></i></div></div>`,
    sauvegarde: () => `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>sauvegarde.sh</span></div><pre>DATE=$(<span class="f">date</span> +%F)
<span class="f">tar</span> -czf <span class="s">"reservations-$DATE.tar.gz"</span> reservations/
<span class="f">rclone</span> copy <span class="s">"reservations-$DATE.tar.gz"</span> drive:
<span class="c"># Chaque soir à 23 h, 30 archives gardées</span></pre></div>`,
    rapprochement: () => `<div class="mock-window mk-table"><div class="mock-bar"><i></i>Paiements Wave<small>Août</small></div><table><tr><th>Commande</th><th>Montant</th><th>Statut</th></tr><tr><td>C-1042</td><td>6 000 F</td><td class="ok">Rapproché</td></tr><tr><td>C-1043</td><td>4 500 F</td><td class="ok">Rapproché</td></tr><tr class="check"><td>C-1044</td><td>3 000 F</td><td>Montant différent</td></tr><tr><td>C-1045</td><td>7 500 F</td><td class="ok">Rapproché</td></tr></table></div>`,
    'fiche-pirogue': () => `<div class="mock-window mk-digest mk-fiche"><div class="mock-bar"><i></i>Avant chaque départ<small>Pirogue 2</small></div><div class="mock-pad"><ul><li><span class="mk-coche">${icon('check', '')}</span>Gilets comptés<span>8 sur 8</span></li><li><span class="mk-coche">${icon('check', '')}</span>Téléphone chargé<span>Oui</span></li><li><span class="mk-coche">${icon('check', '')}</span>Pleine mer<span>8 h 40</span></li><li><span class="mk-coche is-vide"></span>Ciel vers le large<span>À vérifier</span></li></ul></div></div>`,
    'menu-whatsapp': () => `<div class="mock-flow"><div class="mock-node"><span class="glyph">${icon('tableur', '')}</span>Tableau<small>Plats du jour</small></div><span class="mock-link"></span><div class="mock-node is-key"><span class="glyph">${icon('pen', '')}</span>Rédaction<small>Quatre lignes</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph">${icon('message', '')}</span>Diffusion<small>À 10 h</small></div></div>`,
    'carte-relue': () => `<div class="mock-paper"><p><b>Plats du jour</b></p><p>Thiéboudienne au <del>poison</del> <ins>poisson</ins> · 3 500 F</p><p>Yassa au <del>poulé</del> <ins>poulet</ins> · 3 000 F</p><div class="mock-lines"><i style="width:88%"></i><i style="width:64%"></i></div></div>`,
    compression: () => `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>compresser.py</span></div><pre><span class="c"># Simulation : aucune photo modifiée</span>
case-3.jpg   4 301 Ko <span class="k">→</span> <span class="s">412 Ko</span>
pirogue.jpg  6 972 Ko <span class="k">→</span> <span class="s">618 Ko</span>
bolong.jpg   5 220 Ko <span class="k">→</span> <span class="s">477 Ko</span>
<span class="c"># 412 photos : 1,8 Go → 196 Mo</span></pre></div>`,
    'inscription-batik': () => `<div class="mock-window mk-form"><div class="mock-bar"><i></i>Atelier batik<small>Samedi 4 juillet</small></div><div class="mock-pad"><label>Prénom et nom<span class="mk-field">Mariama Badji</span></label><label>Téléphone<span class="mk-field is-error">77 41</span><em>Ce numéro est incomplet : 9 chiffres attendus.</em></label><div class="mock-btn">Réserver ma place</div></div></div>`,
    'faq-whatsapp': () => `<div class="mk-review mk-chat"><div class="mk-review-in"><p>Bonjour, la sortie de 9 h a-t-elle lieu demain ?</p><small>Message reçu à 7 h 12</small></div><div class="mk-review-out"><small>Réponse automatique</small><p>Oui, le départ de 9 h est maintenu : la pleine mer est à 8 h 40. Arrivez un quart d’heure avant.</p></div></div>`,
    'regex-mobile': () => `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>numero.js</span></div><pre><span class="k">const</span> MOBILE_SN = <span class="s">/^(?:\\+221)?7[05678]\\d{7}$/</span>;
<span class="f">numeroValide</span>(<span class="s">"77 123 45 67"</span>) <span class="c">// true</span>
<span class="f">numeroValide</span>(<span class="s">"761234567"</span>)    <span class="c">// true</span>
<span class="f">numeroValide</span>(<span class="s">"7712345"</span>)      <span class="c">// false</span></pre></div>`,
    nuitees: () => `<div class="mock-window mk-table mk-tableur"><div class="mock-bar"><i></i>Nuitées<small>Septembre</small></div><p class="mk-formule"><b>fx</b>=(D2-C2)*E2*$J$1</p><table><tr><th>Case</th><th>Nuitées</th><th>Taxe</th></tr><tr><td>Case 1</td><td>3</td><td>6 000 F</td></tr><tr class="is-actif"><td>Case 2</td><td>5</td><td>10 000 F</td></tr><tr><td>Case 4</td><td>2</td><td>2 000 F</td></tr><tr class="is-total"><td>Total</td><td>41</td><td>78 000 F</td></tr></table></div>`,
    'message-accueil': () => `<div class="mock-paper"><p>Bonjour,</p><p>Nous vous attendons demain au campement. Depuis l’aéroport, <ins>comptez vingt minutes de piste</ins>. Votre case est prête à partir de 14 h.</p><div class="mock-lines"><i style="width:92%"></i><i style="width:70%"></i></div></div>`,
    'logo-natt': () => `<div class="mock-logo mk-natt"><svg viewBox="0 0 80 64" aria-hidden="true"><circle cx="28" cy="26" r="15" fill="none" stroke="#16213E" stroke-width="6"/><circle cx="52" cy="26" r="15" fill="none" stroke="#C7923E" stroke-width="6"/><circle cx="40" cy="44" r="15" fill="none" stroke="#2563EB" stroke-width="6"/></svg><b>natt</b><small>Tontine entre proches</small></div>`
  };
  const mockHTML = kind => (MOCKS[kind] ? MOCKS[kind]() : '');
  function mediaHTML(media, sizes = '(min-width: 1024px) 380px, 92vw', eager = false) {
    if (media.kind === 'image') {
      const base = `assets/images/${media.name}`;
      return `<img src="${base}-720.webp" srcset="${base}-720.webp 720w, ${base}-1280.webp ${media.large}w" sizes="${sizes}" width="720" height="540" alt="${t(media.alt)}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
    }
    return `<div class="mock" role="img" aria-label="${t(media.alt)}">${mockHTML(media.mock)}</div>`;
  }

  /* Typographie française sur le contenu statique --------------------- */

  function fixTypography(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (node.parentElement && node.parentElement.closest('script, style, pre, code, textarea')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { const fixed = typo(node.nodeValue); if (fixed !== node.nodeValue) node.nodeValue = fixed; });
  }

  /* Notification ------------------------------------------------------- */

  let toastTimer;
  function toast(message, iconName = 'check') {
    const el = $('[data-toast]');
    if (!el) return;
    clearTimeout(toastTimer);
    el.innerHTML = `${icon(iconName)}<span>${t(message)}</span>`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { if (!el.classList.contains('is-visible')) el.textContent = ''; }, 400);
    }, 2600);
  }

  /* Réglages et animations --------------------------------------------- */

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = {
    level: () => root.getAttribute('data-motion-effective') || 'full',
    full: () => (root.getAttribute('data-motion-effective') || 'full') === 'full'
  };

  /* Panneau Tweaks ------------------------------------------------------
     Composant unique pour toutes les pages, construit à partir d'une description :
       V.initTweaks({
         key: 'vysora-page-reglages',          // mémoire des réglages de la page
         etats: [groupe, …],                   // états propres à la page (onglet États)
         apparence: ['accent', groupe, …],     // variantes visuelles (onglet Apparence)
         defaults: { nom: valeur, … },
         onChange: (changed, settings) => {}   // nom du réglage, 'reset' ou 'init'
       });
     Un groupe : { name, legend, options: [[valeur, libellé, couleur?], …], si?: (etat, settings) => bool }.
     Chaque réglage devient un attribut data-<nom> sur <html>. Les états communs
     (session, rôle, niveau, compte, notifications) viennent de etats.js. */

  const E = window.VysoraEtats;
  const APPARENCE = {
    accent: { name: 'accent', legend: 'Couleur d’accent', options: [['blue', 'Bleu', '#2563EB'], ['deep', 'Bleu foncé', '#1D4ED8'], ['ink', 'Noir', '#171717']] },
    density: { name: 'density', legend: 'Densité', options: [['airy', 'Aérée'], ['standard', 'Standard'], ['compact', 'Compacte']] },
    radius: { name: 'radius', legend: 'Arrondis', options: [['sharp', 'Nets'], ['charte', 'Charte'], ['soft', 'Doux']] },
    effects: { name: 'effects', legend: 'Intensité des effets', options: [['subtle', 'Discrète'], ['standard', 'Standard'], ['bold', 'Marquée']] },
    motion: { name: 'motion', legend: 'Animations', options: [['full', 'Complètes'], ['reduced', 'Réduites'], ['none', 'Aucune']] }
  };
  const APPARENCE_INITIALE = { accent: 'blue', density: 'standard', radius: 'charte', effects: 'standard', motion: 'full' };
  const ONGLET_KEY = 'vysora-tweaks-onglet';
  let tweaksMonte = false;

  const groupeHTML = (group, scope) => `<fieldset data-tw-groupe="${group.name}"><legend>${t(group.legend)}</legend><div class="tw-options">${group.options.map(([value, label, swatch]) => `<label><input type="radio" name="${group.name}" value="${esc(value)}"><span>${swatch ? `<i style="--sw:${swatch}"></i>` : ''}${t(label)}</span></label>`).join('')}</div>${group.name === 'motion' && scope === 'apparence' ? '<p class="tw-note" data-motion-note hidden>Votre appareil demande de réduire les animations : cette préférence reste appliquée.</p>' : ''}</fieldset>`;

  function initTweaks({ key = 'vysora-reglages-page', etats = [], apparence = [], defaults = {}, onChange = () => {} } = {}) {
    if (tweaksMonte) return null;
    tweaksMonte = true;
    const visuel = apparence.map(group => (typeof group === 'string' ? APPARENCE[group] : group)).filter(Boolean);
    const groupes = [...etats, ...visuel];
    const initial = { ...Object.fromEntries(visuel.filter(g => g.name in APPARENCE_INITIALE).map(g => [g.name, APPARENCE_INITIALE[g.name]])), ...defaults };
    const allowed = Object.fromEntries(groupes.map(g => [g.name, g.options.map(([value]) => value)]));
    const saved = store.get(key, {}) || {};
    const settings = { ...initial };
    Object.keys(initial).forEach(name => { if (allowed[name] && allowed[name].includes(saved[name])) settings[name] = saved[name]; });

    const onglets = [['etats', 'États'], ...(visuel.length ? [['apparence', 'Apparence']] : [])];
    let onglet = store.get(ONGLET_KEY, 'etats');
    if (!onglets.some(([id]) => id === onglet)) onglet = 'etats';

    if (!$('[data-toast]')) document.body.insertAdjacentHTML('beforeend', '<div class="toast" role="status" aria-live="polite" data-toast></div>');
    $$('.tweaks-trigger, #tweaks').forEach(el => el.remove());
    $('[data-toast]').insertAdjacentHTML('beforebegin', `<button class="tweaks-trigger" type="button" aria-expanded="false" aria-controls="tweaks" data-tweaks-open>${icon('sliders')}Tweaks</button>
  <aside class="tweaks" id="tweaks" aria-labelledby="tweaks-title" hidden>
    <div class="tweaks-head"><h2 id="tweaks-title" tabindex="-1">Tweaks</h2><button class="icon-btn" type="button" data-tweaks-close aria-label="Fermer les réglages">${icon('close', '')}</button></div>
    ${onglets.length > 1 ? `<div class="tw-tabs" role="tablist" aria-label="Réglages">${onglets.map(([id, label]) => `<button type="button" role="tab" id="tw-tab-${id}" aria-controls="tw-${id}" data-tw-tab="${id}">${label}</button>`).join('')}</div>` : ''}
    <form class="tweaks-form" id="tw-etats" data-tw-panel="etats"${onglets.length > 1 ? ' role="tabpanel" aria-labelledby="tw-tab-etats"' : ''}>
      <h3 class="tw-section">Sur tout le site</h3>
      ${E.GROUPES.map(g => groupeHTML(g, 'site')).join('')}
      ${etats.length ? `<h3 class="tw-section">Sur cette page</h3>${etats.map(g => groupeHTML(g, 'etats')).join('')}` : ''}
    </form>
    ${visuel.length ? `<form class="tweaks-form" id="tw-apparence" data-tw-panel="apparence" role="tabpanel" aria-labelledby="tw-tab-apparence">${visuel.map(g => groupeHTML(g, 'apparence')).join('')}</form>` : ''}
    <div class="tweaks-foot"><button class="btn btn-secondary btn-sm" type="button" data-tweaks-reset>${icon('replay')}<span data-tw-reset-label></span></button></div>
  </aside>`);

    const panel = $('#tweaks');
    const trigger = $('[data-tweaks-open]');
    const title = $('#tweaks-title');
    const formSite = $('#tw-etats');
    const formVisuel = $('#tw-apparence');
    const note = $('[data-motion-note]');
    const resetLabel = $('[data-tw-reset-label]');
    const nomsEtatsPage = etats.map(g => g.name);
    const nomsVisuels = visuel.map(g => g.name);

    const effectiveMotion = () => (settings.motion === 'none' ? 'none' : (reduceQuery.matches || settings.motion === 'reduced') ? 'reduced' : 'full');
    const apply = changed => {
      Object.entries(settings).forEach(([name, value]) => root.setAttribute(`data-${name}`, value));
      root.setAttribute('data-motion-effective', effectiveMotion());
      store.set(key, settings);
      onChange(changed, settings);
    };
    const syncForm = () => {
      const etat = E.get();
      E.GROUPES.forEach(g => {
        const field = formSite.elements[g.name];
        if (field) field.value = etat[g.name];
        $(`[data-tw-groupe="${g.name}"]`, formSite).hidden = g.si ? !g.si(etat) : false;
      });
      etats.forEach(g => {
        const field = formSite.elements[g.name];
        if (field) field.value = settings[g.name];
        $(`[data-tw-groupe="${g.name}"]`, formSite).hidden = g.si ? !g.si(etat, settings) : false;
      });
      if (formVisuel) nomsVisuels.forEach(name => { const field = formVisuel.elements[name]; if (field) field.value = settings[name]; });
      if (note) note.hidden = !reduceQuery.matches;
    };
    const choisirOnglet = (id, focus = false) => {
      onglet = id;
      store.set(ONGLET_KEY, id);
      $$('[data-tw-tab]', panel).forEach(tab => {
        const on = tab.dataset.twTab === id;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus();
      });
      $$('[data-tw-panel]', panel).forEach(p => { p.hidden = p.dataset.twPanel !== id; });
      resetLabel.textContent = id === 'etats' ? 'Revenir à l’état initial' : 'Rétablir les réglages initiaux';
    };
    const open = () => { syncForm(); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); title.focus(); };
    const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); };

    trigger.addEventListener('click', () => (panel.hidden ? open() : close()));
    $('[data-tweaks-close]', panel).addEventListener('click', close);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
      const tab = event.target.closest('[data-tw-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const ids = onglets.map(([id]) => id);
      const i = ids.indexOf(tab.dataset.twTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
      choisirOnglet(ids[next], true);
    });
    $$('[data-tw-tab]', panel).forEach(tab => tab.addEventListener('click', () => choisirOnglet(tab.dataset.twTab)));
    panel.addEventListener('change', event => {
      const { name, value } = event.target;
      if (E.GROUPES.some(g => g.name === name)) { E.set({ [name]: value }); return; }
      if (!(name in settings)) return;
      settings[name] = value;
      apply(name);
      syncForm();
    });
    $('[data-tweaks-reset]', panel).addEventListener('click', () => {
      if (onglet === 'etats') {
        nomsEtatsPage.forEach(name => { settings[name] = initial[name]; });
        E.reset();
        apply('reset');
        toast('État initial rétabli.');
      } else {
        nomsVisuels.forEach(name => { settings[name] = initial[name]; });
        apply('reset');
        toast('Réglages initiaux rétablis.');
      }
      syncForm();
    });
    reduceQuery.addEventListener('change', () => { apply('motion'); syncForm(); });
    E.on(syncForm);
    choisirOnglet(onglet);
    syncForm();
    apply('init');
    regler = (name, value) => {
      if (!allowed[name] || !allowed[name].includes(value) || settings[name] === value) return;
      settings[name] = value;
      apply(name);
      syncForm();
    };
    return settings;
  }
  /* Change un réglage de la page depuis l'interface (ex. : l'auteur dépublie sa création). */
  let regler = () => {};

  /* Accès aux actions selon l'état --------------------------------------
     V.exiger('contribuer', 'voter') : vrai si l'action est permise ; sinon
     explique pourquoi (connexion, e-mail, conditions, suspension, niveau, rôle)
     et propose la suite. Actions : contribuer, proposer-cas, moderer, administrer. */

  const retour = () => encodeURIComponent(`${location.pathname.split('/').pop() || 'index.html'}${location.search}${location.hash}`);
  /* Page d'origine et action demandée, transmises à la connexion et à l'inscription. */
  const suite = quoi => `retour=${retour()}${quoi ? `&pour=${encodeURIComponent(quoi)}` : ''}`;
  const accepterConditions = () => { E.set({ compte: 'actif' }); toast('Conditions acceptées.'); };
  const renvoyerEmail = () => toast('E-mail de confirmation renvoyé.', 'mail');
  const BOUTONS = { email: renvoyerEmail, conditions: accepterConditions };
  /* Actions : ['lien', libellé, adresse, style] · ['bouton', libellé, clé de BOUTONS, style] · ['fermer', libellé, null, style]. */
  const MOTIFS = {
    connexion: quoi => (/signal/.test(quoi)
      ? { icone: 'flag', titre: `Connectez-vous pour ${quoi}`, texte: 'Sans compte, vous pouvez aussi nous signaler un contenu illicite depuis le formulaire de contact.', actions: [['lien', 'Se connecter', `connexion.html?${suite(quoi)}`, 'primary'], ['lien', 'Signaler sans compte', `contact.html?motif=signalement&contenu=${encodeURIComponent(location.href)}`, 'secondary']] }
      : { icone: 'user', titre: `Connectez-vous pour ${quoi}`, texte: 'Votre compte garde vos votes, vos essais et vos brouillons, et fait progresser votre réputation.', actions: [['lien', 'Créer un compte', `inscription.html?${suite(quoi)}`, 'primary'], ['lien', 'Se connecter', `connexion.html?${suite(quoi)}`, 'secondary']] }),
    email: quoi => ({ icone: 'mail', titre: `Confirmez votre adresse e-mail pour ${quoi}`, texte: 'Ouvrez le lien reçu à l’inscription : il reste valable 24 heures. Vous pouvez en recevoir un nouveau.', actions: [['bouton', 'Renvoyer l’e-mail', 'email', 'primary'], ['fermer', 'Plus tard', null, 'secondary']] }),
    conditions: quoi => ({ icone: 'doc', titre: `Acceptez les nouvelles conditions pour ${quoi}`, texte: `Les conditions générales et la charte communautaire ont changé le ${E.DATES.conditions}.`, actions: [['bouton', 'Accepter les conditions', 'conditions', 'primary'], ['lien', 'Lire les changements', 'cgu.html#changements', 'secondary']] }),
    suspendu: quoi => ({ icone: 'lock', titre: `Votre compte est suspendu jusqu’au ${E.DATES.suspension}`, texte: `Vous pourrez ${quoi} dès la fin de la suspension. D’ici là, vous gardez l’accès à la lecture et à vos paramètres.`, actions: [['fermer', 'Fermer', null, 'primary'], ['lien', 'Voir la décision', 'notifications.html', 'secondary']] }),
    niveau: quoi => {
      const niv = E.niveau();
      return { icone: 'shield', titre: `Le niveau Expert permet de ${quoi}`, texte: `Vous êtes ${niv.nom} avec ${fmt(niv.points)} points. Le niveau Expert commence à ${fmt(E.NIVEAUX.expert.seuil)} points.`, actions: [['lien', 'Voir comment gagner des points', 'classements.html#niveaux', 'primary'], ['fermer', 'Fermer', null, 'secondary']] };
    },
    role: () => ({ icone: 'shield', titre: 'Cette action est réservée à la modération', texte: 'Les modérateurs et les administrateurs traitent les signalements et valident les cas proposés.', actions: [['fermer', 'Fermer', null, 'primary']] })
  };
  const actionsHTML = (actions, enLigne) => actions.filter(([kind]) => !(enLigne && kind === 'fermer')).map(([kind, label, cible, style]) => kind === 'lien'
    ? `<a class="btn btn-${style}" href="${cible}">${t(label)}</a>`
    : `<button class="btn btn-${style}" type="button" ${kind === 'bouton' ? `data-acces-bouton="${cible}"` : 'data-acces-fermer'}>${t(label)}</button>`).join('');
  document.addEventListener('click', event => {
    const bouton = event.target.closest('[data-acces-bouton]');
    if (!bouton) return;
    bouton.closest('dialog')?.close();
    BOUTONS[bouton.dataset.accesBouton]?.();
  });

  let dialogue;
  function ouvrirAcces(motif, quoi) {
    const m = MOTIFS[motif](quoi);
    if (!dialogue) {
      document.body.insertAdjacentHTML('beforeend', '<dialog class="acces" aria-labelledby="acces-titre" data-acces></dialog>');
      dialogue = $('[data-acces]');
      dialogue.addEventListener('click', event => { if (event.target === dialogue || event.target.closest('[data-acces-fermer]')) dialogue.close(); });
    }
    dialogue.innerHTML = `<button class="icon-btn acces-fermer" type="button" aria-label="Fermer" data-acces-fermer>${icon('close', '')}</button>
      <span class="acces-icone" aria-hidden="true">${icon(m.icone, '')}</span>
      <h2 id="acces-titre">${t(m.titre)}</h2>
      <p>${t(m.texte)}</p>
      <div class="acces-actions">${actionsHTML(m.actions, false)}</div>`;
    if (!dialogue.open) dialogue.showModal();
    $('.acces-actions > *', dialogue)?.focus();
  }
  /* Même message, intégré à la page (ex. : l'éditeur ouvert par un visiteur) ; vide si l'action est permise. */
  function accesBloc(action, quoi, titre = 'h2') {
    const motif = E.raison(action);
    if (!motif) return '';
    const m = MOTIFS[motif](quoi);
    return `<div class="acces-bloc"><span class="acces-icone" aria-hidden="true">${icon(m.icone, '')}</span><${titre}>${t(m.titre)}</${titre}><p>${t(m.texte)}</p><div class="acces-actions">${actionsHTML(m.actions, true)}</div></div>`;
  }
  function exiger(action = 'contribuer', quoi = 'participer') {
    const motif = E.raison(action);
    if (!motif) return true;
    ouvrirAcces(motif, quoi);
    return false;
  }

  /* Phrase d'invitation à placer dans la page quand l'action n'est pas permise
     (« Créez un compte ou connectez-vous pour suivre votre progression. ») ; vide sinon. */
  function invitation(action, quoi) {
    const motif = E.raison(action);
    if (!motif) return '';
    if (motif === 'connexion') return `<a href="inscription.html?${suite(quoi)}">Créez un compte</a> ou <a href="connexion.html?${suite(quoi)}">connectez-vous</a> pour ${t(quoi)}.`;
    if (motif === 'email') return `Confirmez votre adresse e-mail pour ${t(quoi)}.`;
    if (motif === 'conditions') return `Acceptez les nouvelles conditions pour ${t(quoi)}.`;
    if (motif === 'suspendu') return `Vous pourrez ${t(quoi)} à la fin de la suspension, le ${t(E.DATES.suspension)}.`;
    if (motif === 'niveau') return `Le niveau Expert permet de ${t(quoi)}.`;
    return 'Cette action est réservée à la modération.';
  }

  /* Liens qui mènent à une action réservée : publier une création, ouvrir un sujet.
     Ailleurs, data-exige="action" et data-exige-quoi="…" posent la même garde.
     Dans une zone data-sans-garde (connexion, inscription), les liens ramènent
     simplement à la page d'origine : celle-ci explique elle-même ce qui manque. */
  const GARDES = [
    ['a[href^="nouvelle-creation.html"]', 'publier une création'],
    ['a[href^="forum.html?nouveau"]', 'publier une question'],
    ['[data-exige]', 'participer']
  ];
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.target.closest('[data-sans-garde]')) return;
    const garde = GARDES.find(([selector]) => event.target.closest(selector));
    if (!garde) return;
    const el = event.target.closest(garde[0]);
    if (exiger(el.dataset.exige || 'contribuer', el.dataset.exigeQuoi || garde[1])) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  /* Compte dans l'en-tête et bandeau d'état du compte ---------------------
     Montés automatiquement sur toutes les pages qui chargent commun.js.
     Dans le HTML, data-pour="visiteur" | "membre" | "moderation" | "administration"
     réserve un élément à un public (règles dans etats.css). */

  const ICONES = {
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    panel: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 17 5-5-5-5"/><path d="M15 12H4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    tableur: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.5h18M9 4v16"/>',
    flow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>',
    flag: '<path d="M5 22V4"/><path d="M5 15s1.2-1 4-1 5 2 8 2 3-1 3-1V4s-.5 1-3 1-5-2-8-2-4 1-4 1"/>'
  };
  function completerIcones() {
    const manquantes = Object.keys(ICONES).filter(name => !document.getElementById(`i-${name}`));
    if (!manquantes.length) return;
    document.body.insertAdjacentHTML('afterbegin', `<svg class="sprite-commun" aria-hidden="true" focusable="false">${manquantes.map(name => `<symbol id="i-${name}" viewBox="0 0 24 24">${ICONES[name]}</symbol>`).join('')}</svg>`);
  }

  /* Menu principal ---------------------------------------------------------
     Une seule liste pour toutes les pages : chaque page garde le même menu
     (ordinateur et mobile) et la section en cours est marquée. Pour ajouter
     une rubrique, l'ajouter ici. */
  const NAVIGATION = [
    { href: 'explorer.html', label: 'Explorer', pages: ['explorer.html', 'categorie.html', 'fiche-creation.html'] },
    { href: 'forum.html', label: 'Forum', pages: ['forum.html'] },
    { href: 'apprendre.html', label: 'Apprendre', pages: ['apprendre.html', 'bon-reflexe.html'] },
    { href: 'classements.html', label: 'Classements', pages: ['classements.html'] },
    { href: 'defis.html', label: 'Défis', pages: ['defis.html'] }
  ];
  function monterNavigation() {
    const ici = location.pathname.split('/').pop() || 'index.html';
    const lien = ({ href, label, pages = [href] }) => `<li><a href="${href}"${pages.includes(ici) ? ' aria-current="page"' : ''}>${t(label)}</a></li>`;
    $$('.main-nav > ul').forEach(ul => { ul.innerHTML = NAVIGATION.map(lien).join(''); });
    $$('.mobile-links').forEach(ul => { ul.innerHTML = [...NAVIGATION, { href: 'nouvelle-creation.html', label: 'Publier une création' }].map(lien).join(''); });
  }

  /* Pied de page : les informations légales mènent aussi aux cookies, aux mentions légales et au contact. */
  function monterInformations() {
    $$('.footer-nav[aria-label="Informations légales"] ul').forEach(ul => {
      if (!$('a[href="cookies.html"]', ul)) {
        const apres = $('a[href="confidentialite.html"]', ul)?.closest('li');
        const li = `<li><a href="cookies.html">${t('Cookies')}</a></li>`;
        if (apres) apres.insertAdjacentHTML('afterend', li); else ul.insertAdjacentHTML('beforeend', li);
      }
      [['mentions-legales.html', 'Mentions légales'], ['contact.html', 'Contact']].forEach(([href, label]) => {
        if (!$(`a[href="${href}"]`, ul)) ul.insertAdjacentHTML('beforeend', `<li><a href="${href}">${t(label)}</a></li>`);
      });
    });
  }

  /* Photo choisie sur la page Profil (vysora-profil), sinon l'avatar par défaut du compte. */
  const photoMoi = () => { const p = store.get('vysora-profil', {}); return p && typeof p.photo === 'string' && p.photo.startsWith('data:image/') ? p.photo : ''; };
  const avatarMoi = size => {
    const photo = photoMoi();
    return photo
      ? `<img class="avatar compte-avatar" src="${photo}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px" decoding="async">`
      : `<span class="avatar compte-avatar" style="width:${size}px;height:${size}px" aria-hidden="true">${icon('user', '')}</span>`;
  };
  /* Non lues : le nombre gardé par la page Notifications quand le membre y a lu ou reçu des notifications,
     sinon celui du membre simulé. Changer l'état « Notifications » dans les Tweaks efface ce nombre. */
  const CLE_NON_LUES = 'vysora-notifications-nonlues';
  const nonLues = () => {
    if (!E.membre() || E.get().notifications !== 'nouvelles') return 0;
    const n = store.get(CLE_NON_LUES, null);
    return Number.isInteger(n) && n > 0 ? n : E.MOI.nonLues;
  };
  function compteMenuHTML() {
    const e = E.get();
    const niv = E.niveau();
    const n = nonLues();
    return `<div class="compte-qui">${avatarMoi(40)}<p><b>${t(E.MOI.nom)}</b><span>${t(`${niv.nom} · ${fmt(niv.points)} points`)}</span>${e.role !== 'membre' ? `<em>${t(E.ROLES[e.role])}</em>` : ''}</p></div>
      <ul class="compte-liens">
        <li><a href="profil.html?pseudo=${E.MOI.pseudo}">${icon('user')}Mon profil</a></li>
        <li><a href="mes-contenus.html">${icon('folder')}Mes contenus</a></li>
        <li><a href="notifications.html">${icon('bell')}Notifications${n ? `<span class="compte-nb" aria-label="${n} non lues">${n}</span>` : ''}</a></li>
        <li><a href="parametres.html">${icon('settings')}Paramètres</a></li>
      </ul>
      ${e.role !== 'membre' ? `<ul class="compte-liens">
        <li><a href="moderation.html">${icon('shield')}Modération</a></li>
        ${e.role === 'admin' ? `<li><a href="administration.html">${icon('panel')}Administration</a></li>` : ''}
      </ul>` : ''}
      <div class="compte-fin"><button class="compte-sortir" type="button" data-deconnexion>${icon('logout')}Se déconnecter</button></div>`;
  }

  function monterCompte() {
    const ici = location.pathname.split('/').pop() || 'index.html';
    if (!['index.html', 'connexion.html', 'inscription.html'].includes(ici)) $$('a[href="connexion.html"], a[href="inscription.html"]').forEach(a => { a.href = `${a.getAttribute('href')}?retour=${retour()}`; });
    $$('.header-actions').forEach((actions, i) => {
      if ($('.compte', actions)) return;
      $$('a[href^="connexion.html"], a[href^="inscription.html"]', actions).forEach(a => a.setAttribute('data-pour', 'visiteur'));
      const zone = document.createElement('div');
      zone.className = 'compte';
      zone.setAttribute('data-pour', 'membre');
      zone.innerHTML = `<a class="icon-btn compte-notifs" href="notifications.html" data-compte-notifs>${icon('bell', '')}<span class="compte-pastille" data-compte-nb></span></a>
        <button class="compte-btn" type="button" aria-expanded="false" aria-controls="compte-menu-${i}" data-compte-btn>${avatarMoi(34)}<span class="sr-only">Votre compte</span></button>
        <div class="compte-menu" id="compte-menu-${i}" hidden data-compte-menu></div>`;
      actions.insertBefore(zone, $('.menu-toggle', actions));
      const button = $('[data-compte-btn]', zone);
      const menu = $('[data-compte-menu]', zone);
      const setOpen = open => { menu.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
      button.addEventListener('click', () => setOpen(menu.hidden));
      zone.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { event.stopPropagation(); setOpen(false); button.focus(); } });
      zone.addEventListener('focusout', event => { if (!zone.contains(event.relatedTarget)) setOpen(false); });
      document.addEventListener('click', event => { if (!zone.contains(event.target)) setOpen(false); });
      menu.addEventListener('click', event => {
        if (!event.target.closest('[data-deconnexion]')) return;
        setOpen(false);
        E.set({ session: 'visiteur' });
        toast('Vous êtes déconnecté.');
        $('a[href^="connexion.html"]', actions)?.focus();
      });
    });
    $$('.mobile-actions').forEach(el => el.setAttribute('data-pour', 'visiteur'));
    $$('.footer-nav li').forEach(li => {
      if (!$('a[href^="inscription.html"], a[href^="connexion.html"]', li)) return;
      li.setAttribute('data-pour', 'visiteur');
      if (li.nextElementSibling) return;
      li.insertAdjacentHTML('afterend', `<li data-pour="membre"><a href="profil.html?pseudo=${E.MOI.pseudo}">Mon profil</a></li><li data-pour="membre"><a href="mes-contenus.html">Mes contenus</a></li>`);
    });
    rendreCompte();
  }
  function rendreCompte() {
    const n = nonLues();
    $$('.compte').forEach(zone => {
      const link = $('[data-compte-notifs]', zone);
      link.setAttribute('aria-label', n ? `Notifications, ${n} non lues` : 'Notifications');
      $('[data-compte-nb]', zone).textContent = n ? String(n) : '';
      $('[data-compte-btn]', zone).classList.toggle('has-unread', n > 0);
      $('[data-compte-btn] .compte-avatar', zone).outerHTML = avatarMoi(34);
      $('[data-compte-menu]', zone).innerHTML = compteMenuHTML();
    });
  }

  const BANDEAUX = {
    email: () => ({ icone: 'mail', texte: `<b>Confirmez votre adresse e-mail.</b> Vous pourrez ensuite publier, voter et répondre. Le lien reçu à l’inscription reste valable 24 heures.`, actions: '<button class="btn btn-secondary btn-sm" type="button" data-acces-bouton="email">Renvoyer l’e-mail</button>' }),
    conditions: () => ({ icone: 'doc', texte: `<b>Les conditions d’utilisation et la charte communautaire ont changé le ${E.DATES.conditions}.</b> Acceptez-les pour continuer à publier et à participer.`, actions: '<a class="btn btn-quiet btn-sm" href="cgu.html#changements">Lire les changements</a><button class="btn btn-primary btn-sm" type="button" data-acces-bouton="conditions">Accepter</button>' }),
    suspendu: () => ({ icone: 'lock', texte: `<b>Votre compte est suspendu jusqu’au ${E.DATES.suspension}.</b> Vous pouvez lire les contenus et gérer vos paramètres ; publier et participer redeviendront possibles à cette date.`, actions: '<a class="btn btn-secondary btn-sm" href="notifications.html">Voir la décision</a>' })
  };
  function rendreBandeau() {
    const header = $('[data-header]');
    let el = $('[data-etat-bandeau]');
    const motif = E.membre() && E.get().compte !== 'actif' ? E.get().compte : null;
    if (!motif || !header) { el?.remove(); return; }
    if (!el) {
      header.insertAdjacentHTML('afterend', '<div class="etat-bandeau" role="status" data-etat-bandeau></div>');
      el = $('[data-etat-bandeau]');
    }
    const b = BANDEAUX[motif]();
    el.dataset.motif = motif;
    el.innerHTML = `<div class="container etat-bandeau-in"><span class="etat-bandeau-icone" aria-hidden="true">${icon(b.icone, '')}</span><p>${typo(b.texte)}</p><div class="etat-bandeau-actions">${b.actions}</div></div>`;
  }

  /* Recherche sur tout le site --------------------------------------------
     La loupe de l'en-tête ([data-recherche-ouvrir]) et Ctrl K (⌘ K) ouvrent la recherche
     (recherche.js et recherche.css), chargée au premier survol de la loupe ou après
     le chargement de la page, puis gardée pour les ouvertures suivantes. */

  let recherche = null;
  function chargerRecherche() {
    if (!recherche) {
      const fichier = (balise, attributs) => new Promise(resolve => {
        const el = Object.assign(document.createElement(balise), attributs);
        el.onload = el.onerror = () => resolve();
        document.head.append(el);
      });
      recherche = Promise.all([fichier('link', { rel: 'stylesheet', href: 'recherche.css' }), fichier('script', { src: 'recherche.js' })]).then(() => window.VysoraRecherche || null);
    }
    return recherche;
  }
  const ouvrirRecherche = declencheur => chargerRecherche().then(R => R && R.ouvrir(declencheur));
  function monterRecherche() {
    document.addEventListener('click', event => {
      const declencheur = event.target.closest('[data-recherche-ouvrir]');
      if (!declencheur) return;
      event.preventDefault();
      ouvrirRecherche(declencheur);
    });
    const intention = event => { if (event.target.closest?.('[data-recherche-ouvrir]')) chargerRecherche().then(R => R && R.prechauffer()); };
    ['pointerover', 'focusin', 'touchstart'].forEach(type => document.addEventListener(type, intention, { passive: true }));
    document.addEventListener('keydown', event => {
      if (String(event.key || '').toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      ouvrirRecherche($('.site-header [data-recherche-ouvrir]') || $('[data-recherche-ouvrir]'));
    });
    const plusTard = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
    const precharger = () => plusTard(() => chargerRecherche(), { timeout: 4000 });
    if (document.readyState === 'complete') precharger(); else window.addEventListener('load', precharger, { once: true });
  }

  completerIcones();
  monterRecherche();
  monterNavigation();
  monterInformations();
  monterCompte();
  rendreBandeau();
  E.on((etat, changed = []) => {
    if (changed.includes('notifications')) { try { localStorage.removeItem(CLE_NON_LUES); } catch { /* stockage indisponible */ } }
    rendreCompte();
    rendreBandeau();
  });
  document.addEventListener('DOMContentLoaded', () => { if (!tweaksMonte) initTweaks(); });

  /* En-tête : défilement, menu mobile --------------------------------- */

  function initHeader() {
    const header = $('[data-header]');
    if (!header) return;
    const progress = $('[data-scroll-progress]', header);
    const button = $('.menu-toggle', header);
    const panel = $('#mobile-panel');
    let lastY = window.scrollY;
    let ticking = false;
    let menuOpen = false;

    const frame = () => {
      ticking = false;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
      header.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen && !header.contains(document.activeElement)) {
        if (y > lastY + 6 && y > 480) header.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 480) header.classList.remove('is-hidden');
      }
      root.toggleAttribute('data-header-hidden', header.classList.contains('is-hidden'));
      lastY = y;
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    frame();

    if (!button || !panel) return;
    const setMenu = open => {
      menuOpen = open;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      button.innerHTML = icon(open ? 'close' : 'menu', '');
      header.classList.remove('is-hidden');
    };
    button.addEventListener('click', () => setMenu(panel.hidden));
    panel.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuOpen) { setMenu(false); button.focus(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 1023 && menuOpen) setMenu(false); });
  }

  return {
    D, root, $, $$, fmt, esc, typo, t, plural, normalize, clamp,
    dateLabel, daysAgo, relativeDay, icon, store,
    TOOL_BY_NAME, logo, withLogos, avatar, TYPE_LABEL, typeTag,
    mockHTML, mediaHTML, fixTypography, toast, motion, initTweaks, initHeader,
    etats: E, exiger, invitation, accesBloc, avatarMoi, photoMoi, rendreCompte, ouvrirRecherche,
    regler: (name, value) => regler(name, value)
  };
})();
