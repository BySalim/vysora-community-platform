'use strict';

/* Composants partagés par la connexion et l'inscription : fond animé, cadre
   et enchaînement des écrans, champs, mot de passe, code à six chiffres,
   retour des services externes, documents et aide. Les parcours propres à
   chaque page sont dans connexion.js et inscription.js. */

window.VysoraAuth = (() => {
  const V = window.Vysora;
  const A = window.VYSORA_AUTH;
  const D = V.D;
  const { $, $$, t, icon } = V;
  const root = document.documentElement;

  const attendre = ms => new Promise(resolve => setTimeout(resolve, ms));
  const capital = texte => texte.charAt(0).toUpperCase() + texte.slice(1);
  const duree = secondes => `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
  const mouvement = () => V.motion.level();
  const effets = () => root.dataset.effects || 'standard';
  const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
  const EASE_EMPH = 'cubic-bezier(0.05, 0.7, 0.1, 1)';

  const LOGOS = {
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.9a12 12 0 0 1 0-7.8v-5.2H5.8a20 20 0 0 0 0 18.2Z"/><path fill="#EA4335" d="M24 11.7c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.9l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.7.2 2.9.1 3.2.7.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.4c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"/></svg>'
  };
  function logos(scope = document) { $$('[data-logo]', scope).forEach(el => { el.innerHTML = LOGOS[el.dataset.logo] || ''; }); }

  /* Réglages d'apparence communs aux deux pages (panneau Tweaks). */
  const APPARENCE = [
    'accent',
    { name: 'auth-motif', legend: 'Fond animé', options: [['relief', 'Relief de points'], ['lignes', 'Lignes de niveau'], ['flux', 'Flux'], ['uni', 'Uni']] },
    { name: 'auth-fond', legend: 'Bleu du fond', options: [['bleu', 'Bleu', '#1D4ED8'], ['vif', 'Bleu vif', '#2563EB'], ['marine', 'Bleu marine', '#1E40AF'], ['profond', 'Bleu profond', '#1E3A8A'], ['nuit', 'Bleu nuit', '#172554']] },
    { name: 'auth-ambiance', legend: 'Ambiance', options: [['uni', 'Uniforme'], ['profondeur', 'Profondeur'], ['lumiere', 'Lumière derrière le cadre']] },
    { name: 'auth-voile', legend: 'Haut de page', options: [['fondu', 'Fondu'], ['assombri', 'Assombri'], ['eclairci', 'Éclairci'], ['aucun', 'Sans voile']] },
    { name: 'auth-teinte', legend: 'Couleur des motifs', options: [['pale', 'Bleu pâle et blanc', '#C2D9FF'], ['blanc', 'Blanc', '#FFFFFF'], ['ciel', 'Bleu ciel', '#93C5FD']] },
    { name: 'auth-largeur', legend: 'Largeur du cadre', options: [['etroit', 'Étroite'], ['standard', 'Standard'], ['large', 'Large']] },
    { name: 'auth-services', legend: 'Google et GitHub', options: [['avant', 'Avant l’e-mail'], ['apres', 'Après l’e-mail']] },
    'density', 'radius', 'effects', 'motion'
  ];
  const APPARENCE_DEFAUTS = { 'auth-motif': 'relief', 'auth-fond': 'bleu', 'auth-ambiance': 'profondeur', 'auth-voile': 'assombri', 'auth-teinte': 'pale', 'auth-largeur': 'standard', 'auth-services': 'avant' };
  /* Réglages qui changent le comportement du fond. */
  const REGLAGES_FOND = ['auth-motif', 'auth-teinte', 'effects', 'motion', 'reset'];

  /* Contexte d'arrivée ------------------------------------------------------
     commun.js envoie « retour » (page d'origine) et « pour » (l'action réservée). */

  function cibleDe(brut) {
    if (!brut) return null;
    try {
      const url = new URL(brut, location.href);
      const page = url.pathname.split('/').pop() || 'index.html';
      if (url.origin !== location.origin || !A.pages[page]) return null;
      return { page, params: url.searchParams, href: page + url.search + url.hash };
    } catch {
      return null;
    }
  }
  function titreDe(cible) {
    if (!cible) return '';
    const { page, params } = cible;
    if (page === 'fiche-creation.html') return D.creations.find(c => c.id === (params.get('id') || 'cite-ciel-mer'))?.title || '';
    if (page === 'defis.html' || (page === 'nouvelle-creation.html' && params.get('defi'))) return A.defi.titre;
    if (page === 'forum.html') return A.sujets[params.get('sujet')]?.titre || '';
    return '';
  }
  function contexte(simule = 'aucun') {
    const params = new URLSearchParams(location.search);
    let pour = (params.get('pour') || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    let brut = params.get('retour');
    if (A.contextes[simule]) ({ pour, retour: brut } = A.contextes[simule]);
    const cible = cibleDe(brut);
    const action = pour ? A.actions.find(item => item.motif.test(pour)) || { icone: 'arrow' } : null;
    return {
      actif: Boolean(cible && pour),
      pour,
      action,
      cible,
      titre: titreDe(cible),
      destination: cible ? cible.href : null,
      requete: cible ? `retour=${encodeURIComponent(cible.href)}${pour ? `&pour=${encodeURIComponent(pour)}` : ''}` : ''
    };
  }
  function liens(ctx) {
    $$('[data-auth-lien]').forEach(lien => { lien.href = `${lien.dataset.authLien}.html${ctx.requete ? `?${ctx.requete}` : ''}`; });
  }
  function repere(ctx) {
    $$('[data-repere]').forEach(el => {
      el.hidden = !ctx.actif;
      el.innerHTML = ctx.actif ? `${icon(ctx.action.icone)}<span>${t(`Pour ${ctx.pour}`)}</span>` : '';
    });
  }
  function retour(ctx) {
    const lien = $('[data-retour]');
    if (!lien) return;
    lien.href = ctx.cible ? ctx.cible.href : 'index.html';
    $('span', lien).textContent = V.typo(A.pages[ctx.cible?.page] || A.pages['index.html']);
  }
  const libelleRetour = ctx => A.pages[ctx.cible?.page] || A.pages['index.html'];

  /* Fond animé ----------------------------------------------------------------
     Calculé par la carte graphique (WebGL 2), sans aucune image :
     - Relief : un relief de points en perspective, parcouru de houles, qui se
       soulève sous le pointeur ; à la réussite, une onde part sous le cadre.
     - Lignes de niveau : un relief vu de dessus, qui ondule et se resserre
       autour du pointeur ; à la réussite, une onde part du cadre.
     - Flux : des lignes fines qui ondulent comme un tissu et s'écartent du
       pointeur ; à la réussite, elles se redressent et s'éclairent.
     Sans WebGL 2, ou avec le fond uni, le bleu seul reste affiché. */

  /* Bruit simplex 3D (Ian McEwan, Ashima Arts, licence MIT). */
  const GLSL_BRUIT = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

  /* Caméra du relief : inclinaison, focale et hauteur du sol (partagées avec le calcul du pointeur). */
  const CAMERA = { inclinaison: 0.5, focale: 1.6, sol: -1.6 };

  const GLSL_RELIEF_SOMMETS = `#version 300 es
in vec2 a_grille;
uniform float u_temps;
uniform float u_aspect;
uniform float u_intensite;
uniform float u_entree;
uniform float u_onde;
uniform float u_dpr;
uniform float u_force;
uniform vec2 u_pointeur;
out float v_alpha;
out float v_crete;
out float v_flou;
${GLSL_BRUIT}
void main() {
  float Z = 0.9 * pow(15.0, a_grille.y);
  float X = a_grille.x * (1.6 + Z * 1.05);
  /* Houle basse : une grande ondulation et une respiration plus courte. */
  float t = u_temps;
  float h = 0.55 * snoise(vec3(X * 0.12, Z * 0.12 - t * 0.1, t * 0.05))
          + 0.23 * sin(X * 0.38 + t * 0.6) * sin(Z * 0.34 - t * 0.5);
  vec2 d = vec2(X, Z) - u_pointeur;
  float r = length(d);
  h += u_force * 0.55 * exp(-r * r * 0.16) * (0.7 + 0.3 * sin(r * 3.2 - t * 4.0));
  if (u_onde > 0.0) {
    float dr = length(vec2(X, Z - 1.4)) - u_onde * 8.0;
    h += 0.7 * exp(-dr * dr * 1.1) * exp(-u_onde * 0.55);
  }
  h *= u_intensite * smoothstep(0.0, 1.0, u_entree);
  float cy = cos(${CAMERA.inclinaison.toFixed(3)});
  float sy = sin(${CAMERA.inclinaison.toFixed(3)});
  float y = ${CAMERA.sol.toFixed(3)} + h;
  float qy = y * cy + Z * sy;
  float qz = -y * sy + Z * cy;
  float f = ${CAMERA.focale.toFixed(3)};
  gl_Position = vec4(X * f / u_aspect, qy * f, 0.0, qz);
  float crete = clamp(h * 1.8 + 0.42, 0.0, 1.0);
  /* Le point est dessiné plus grand que son cœur : la marge accueille le halo des crêtes. */
  gl_PointSize = clamp(5.4 * u_dpr * 2.2 / qz * (0.8 + 0.6 * crete), 2.0 * u_dpr, 13.0 * u_dpr);
  v_crete = crete;
  v_flou = smoothstep(0.45, 1.0, a_grille.y);
  float brouillard = 1.0 - smoothstep(0.55, 1.0, a_grille.y);
  float apparition = smoothstep(a_grille.y, a_grille.y + 0.18, u_entree * 1.25);
  v_alpha = (0.2 + 0.72 * crete * crete) * brouillard * apparition;
}`;

  const GLSL_RELIEF_POINTS = `#version 300 es
precision mediump float;
in float v_alpha;
in float v_crete;
in float v_flou;
uniform vec3 u_base;
uniform vec3 u_sommet;
out vec4 couleur;
void main() {
  /* Cœur net (plus doux au loin), halo léger sur les crêtes, teinte bleu pâle qui blanchit au sommet. */
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float coeur = 1.0 - smoothstep(0.38 - v_flou * 0.18, 0.6, r);
  float halo = (1.0 - r) * (1.0 - r) * 0.42 * v_crete * v_crete;
  float a = v_alpha * max(coeur, halo);
  vec3 teinte = mix(u_base, u_sommet, v_crete);
  couleur = vec4(teinte * a, a);
}`;

  const GLSL_ECRAN = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  /* En-tête commun aux scènes plein écran ; px est en pixels, origine en haut à gauche. */
  const ENTETE_ECRAN = `#version 300 es
precision highp float;
uniform vec2 u_taille;
uniform float u_temps;
uniform float u_intensite;
uniform float u_entree;
uniform float u_onde;
uniform float u_force;
uniform vec2 u_pointeur;
uniform vec2 u_origine;
uniform vec3 u_base;
uniform vec3 u_sommet;
out vec4 couleur;
${GLSL_BRUIT}
float trait(float v, float epaisseur) {
  float f = fract(v);
  float d = min(f, 1.0 - f);
  float w = fwidth(v);
  return 1.0 - smoothstep(0.0, w * epaisseur, d);
}`;

  const GLSL_LIGNES = `${ENTETE_ECRAN}
void main() {
  vec2 px = vec2(gl_FragCoord.x, u_taille.y - gl_FragCoord.y);
  vec2 p = px / u_taille.y;
  float t = u_temps * 0.045;
  float n = 0.8 * snoise(vec3(p * 1.6, t)) + 0.2 * snoise(vec3(p * 4.0, t * 1.6 + 7.0));
  float d = distance(px, u_pointeur) / u_taille.y;
  n += u_force * 0.42 * exp(-d * d * 28.0);
  if (u_onde > 0.0) {
    float dr = distance(px, u_origine) / u_taille.y - u_onde * 0.85;
    n += 0.32 * exp(-dr * dr * 160.0) * exp(-u_onde * 0.7);
  }
  float v = n * 7.5;
  float majeure = 1.0 - step(0.5, mod(floor(v + 0.5), 4.0));
  float ligne = trait(v, 1.2 + majeure * 0.9);
  float revele = 1.0 - smoothstep(u_entree * 1.6 - 0.25, u_entree * 1.6, distance(p, u_origine / u_taille.y));
  float a = ligne * mix(0.13, 0.36, majeure) * u_intensite * revele;
  couleur = vec4(mix(u_base, u_sommet, majeure) * a, a);
}`;

  const GLSL_FLUX = `${ENTETE_ECRAN}
uniform float u_redresse;
void main() {
  vec2 px = vec2(gl_FragCoord.x, u_taille.y - gl_FragCoord.y);
  vec2 p = px / u_taille.y;
  float t = u_temps;
  float defo = snoise(vec3(p.x * 0.8, p.y * 0.8, t * 0.06));
  vec2 dp = (px - u_pointeur) / u_taille.y;
  float pousse = u_force * dp.y * exp(-dot(dp, dp) * 9.0) * 1.6;
  float y = p.y + (defo * 0.2 + 0.05 * sin(p.x * 2.3 + t * 0.32)) * (1.0 - u_redresse) + pousse * 0.07;
  float v = y * 30.0;
  float ligne = trait(v, 1.3);
  float soie = smoothstep(-0.35, 0.75, snoise(vec3(p.x * 1.1 - t * 0.05, floor(v) * 0.17, t * 0.04)));
  float lueur = smoothstep(0.82, 1.0, sin(p.x * 1.4 - t * 0.5 + floor(v) * 0.21) * 0.5 + 0.5);
  float revele = smoothstep(0.0, 0.12, u_entree * 1.3 - p.x / (u_taille.x / u_taille.y) * 0.9);
  float a = ligne * (0.07 + 0.22 * soie + 0.3 * lueur * soie + 0.25 * u_redresse) * u_intensite * revele;
  couleur = vec4(mix(u_base, u_sommet, clamp(lueur + u_redresse, 0.0, 1.0)) * a, a);
}`;

  const SCENES = {
    relief: { sommets: GLSL_RELIEF_SOMMETS, pixels: GLSL_RELIEF_POINTS, points: true, finesse: 2 },
    lignes: { sommets: GLSL_ECRAN, pixels: GLSL_LIGNES, finesse: 1.5 },
    flux: { sommets: GLSL_ECRAN, pixels: GLSL_FLUX, finesse: 1.5 }
  };

  function fond() {
    const el = $('[data-fond]');
    const muet = { reussir() {}, annuler() {}, maj() {} };
    if (!el) return muet;
    el.innerHTML = '<canvas class="fond-gl" data-gl></canvas>';
    const canvas = $('[data-gl]', el);
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { el.classList.add('sans-gl'); return muet; }

    const motif = () => (SCENES[root.dataset.authMotif] ? root.dataset.authMotif : root.dataset.authMotif === 'uni' ? 'uni' : 'relief');
    const vivant = () => mouvement() === 'full' && !document.hidden;
    const intensite = () => ({ subtle: 0.65, standard: 1, bold: 1.45 }[effets()] ?? 1);
    /* Couleur des motifs : teinte des creux, teinte des sommets. */
    const TEINTES = { pale: [[0.76, 0.85, 1], [1, 1, 1]], blanc: [[1, 1, 1], [1, 1, 1]], ciel: [[0.58, 0.77, 0.99], [0.86, 0.92, 1]] };
    const teinte = () => TEINTES[root.dataset.authTeinte] || TEINTES.pale;
    const fin = window.matchMedia('(pointer: fine)');

    /* Programmes compilés à la première utilisation. */
    const programmes = {};
    function compiler(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    function programme(nom) {
      if (programmes[nom]) return programmes[nom];
      const scene = SCENES[nom];
      const prog = gl.createProgram();
      gl.attachShader(prog, compiler(gl.VERTEX_SHADER, scene.sommets));
      gl.attachShader(prog, compiler(gl.FRAGMENT_SHADER, scene.pixels));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      const uniformes = {};
      const u = n => { if (!(n in uniformes)) uniformes[n] = gl.getUniformLocation(prog, n); return uniformes[n]; };
      programmes[nom] = { prog, u, attribut: gl.getAttribLocation(prog, scene.points ? 'a_grille' : 'a_position') };
      return programmes[nom];
    }

    /* Géométries : deux triangles pour l'écran, une grille de points pour le relief. */
    const ecran = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ecran);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const COLONNES = 150;
    const RANGEES = 96;
    const grille = new Float32Array(COLONNES * RANGEES * 2);
    for (let j = 0; j < RANGEES; j += 1) {
      for (let i = 0; i < COLONNES; i += 1) {
        const k = (j * COLONNES + i) * 2;
        grille[k] = (i / (COLONNES - 1)) * 2 - 1;
        grille[k + 1] = j / (RANGEES - 1);
      }
    }
    const points = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, points);
    gl.bufferData(gl.ARRAY_BUFFER, grille, gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let W = 0;
    let H = 0;
    let dpr = 1;
    let image = 0;
    let depart = 0;
    let entreeDepuis = -1;
    let reussiDepuis = -1;
    let redresse = 0;
    const pointeur = { x: -1e4, y: -1e4, lx: -1e4, ly: -1e4, force: 0, cible: 0 };

    function dimensionner() {
      const scene = SCENES[motif()];
      dpr = Math.min(scene ? scene.finesse : 1, window.devicePixelRatio || 1);
      W = el.clientWidth || window.innerWidth;
      H = el.clientHeight || window.innerHeight;
      const largeur = Math.round(W * dpr);
      const hauteur = Math.round(H * dpr);
      if (canvas.width !== largeur || canvas.height !== hauteur) { canvas.width = largeur; canvas.height = hauteur; }
      gl.viewport(0, 0, largeur, hauteur);
    }

    /* Point du sol visé par le pointeur (même caméra que le shader du relief). */
    function solSousPointeur() {
      if (pointeur.force < 0.01) return [0, -100];
      const xn = (pointeur.lx / W) * 2 - 1;
      const yn = 1 - (pointeur.ly / H) * 2;
      const { inclinaison, focale, sol } = CAMERA;
      const cy = Math.cos(inclinaison);
      const sy = Math.sin(inclinaison);
      const denominateur = yn * cy - focale * sy;
      if (denominateur >= -1e-4) return [0, -100];
      const Z = sol * (focale * cy + yn * sy) / denominateur;
      if (Z <= 0) return [0, -100];
      const profondeur = -sol * sy + Z * cy;
      return [(xn * (W / H) * profondeur) / focale, Z];
    }

    function dessiner(maintenant) {
      const nom = motif();
      if (nom === 'uni') { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return; }
      const anime = vivant();
      const temps = anime ? (maintenant - depart) / 1000 : 14;
      const entree = anime && entreeDepuis >= 0 ? Math.min(1, (maintenant - entreeDepuis) / 1700) : 1;
      const onde = reussiDepuis >= 0 && anime ? (maintenant - reussiDepuis) / 1000 : 0;
      redresse += ((reussiDepuis >= 0 ? 1 : 0) - redresse) * (anime ? 0.04 : 1);
      pointeur.lx += (pointeur.x - pointeur.lx) * (anime ? 0.12 : 1);
      pointeur.ly += (pointeur.y - pointeur.ly) * (anime ? 0.12 : 1);
      pointeur.force += (pointeur.cible - pointeur.force) * (anime ? 0.06 : 1);
      const carte = $('[data-carte]')?.getBoundingClientRect();
      const origine = carte ? [(carte.left + carte.width / 2) * dpr, carte.top * dpr] : [W * dpr / 2, H * dpr];

      let p;
      try { p = programme(nom); } catch (erreur) { el.classList.add('sans-gl'); console.warn(erreur); return; }
      gl.useProgram(p.prog);
      gl.uniform1f(p.u('u_temps'), temps);
      gl.uniform1f(p.u('u_intensite'), intensite());
      gl.uniform1f(p.u('u_entree'), entree);
      gl.uniform1f(p.u('u_onde'), onde);
      gl.uniform1f(p.u('u_force'), pointeur.force);
      gl.uniform3fv(p.u('u_base'), teinte()[0]);
      gl.uniform3fv(p.u('u_sommet'), teinte()[1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (SCENES[nom].points) {
        gl.uniform1f(p.u('u_aspect'), W / H);
        gl.uniform1f(p.u('u_dpr'), dpr);
        gl.uniform2f(p.u('u_pointeur'), ...solSousPointeur());
        gl.bindBuffer(gl.ARRAY_BUFFER, points);
        gl.enableVertexAttribArray(p.attribut);
        gl.vertexAttribPointer(p.attribut, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, COLONNES * RANGEES);
      } else {
        gl.uniform2f(p.u('u_taille'), canvas.width, canvas.height);
        gl.uniform2f(p.u('u_pointeur'), pointeur.lx * dpr, pointeur.ly * dpr);
        gl.uniform2f(p.u('u_origine'), origine[0], origine[1]);
        const redresseLoc = p.u('u_redresse');
        if (redresseLoc) gl.uniform1f(redresseLoc, redresse);
        gl.bindBuffer(gl.ARRAY_BUFFER, ecran);
        gl.enableVertexAttribArray(p.attribut);
        gl.vertexAttribPointer(p.attribut, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    function boucle(maintenant) {
      image = 0;
      dessiner(maintenant);
      if (vivant() && motif() !== 'uni') image = requestAnimationFrame(boucle);
    }
    const relancer = () => { if (!image) image = requestAnimationFrame(boucle); };

    window.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      pointeur.x = event.clientX;
      pointeur.y = event.clientY;
      if (pointeur.lx < -9000) { pointeur.lx = pointeur.x; pointeur.ly = pointeur.y; }
      pointeur.cible = fin.matches ? 1 : 0;
      if (!vivant()) relancer();
    }, { passive: true });
    window.addEventListener('pointerout', event => { if (!event.relatedTarget) { pointeur.cible = 0; if (!vivant()) relancer(); } });
    let attente;
    window.addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(() => { dimensionner(); relancer(); }, 120); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) relancer(); });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); el.classList.add('sans-gl'); });

    depart = performance.now();
    dimensionner();
    requestAnimationFrame(t => { entreeDepuis = t + 150; relancer(); });

    return {
      reussir() {
        if (reussiDepuis >= 0) return;
        reussiDepuis = performance.now();
        relancer();
      },
      annuler() {
        reussiDepuis = -1;
        relancer();
      },
      maj() {
        dimensionner();
        relancer();
      }
    };
  }

  /* Cadre et écrans -------------------------------------------------------- */

  /* La hauteur du cadre suit son contenu : chaque changement (écran, message,
     propositions) s'anime au lieu de sauter. */
  function cadre(carte) {
    let hauteur = carte.getBoundingClientRect().height;
    let animation = null;
    const observateur = new ResizeObserver(() => {
      let depart = hauteur;
      if (animation) { depart = carte.getBoundingClientRect().height; animation.cancel(); animation = null; }
      const arrivee = carte.getBoundingClientRect().height;
      hauteur = arrivee;
      if (!carte.hasAttribute('data-pret') || mouvement() !== 'full' || Math.abs(arrivee - depart) < 2) return;
      animation = carte.animate([{ height: `${depart}px` }, { height: `${arrivee}px` }], { duration: Math.min(520, 280 + Math.abs(arrivee - depart) * 0.5), easing: EASE });
      animation.onfinish = () => { animation = null; };
    });
    $$('[data-carte-contenu], [data-carte-pied]', carte).forEach(el => observateur.observe(el));
  }

  function entree(vue, direction = 0) {
    const niveau = mouvement();
    if (niveau === 'none') return;
    const enfants = [...vue.children].filter(el => !el.hidden);
    enfants.forEach((el, i) => {
      const depart = niveau === 'full'
        ? { opacity: 0, transform: direction ? `translateX(${18 * direction}px)` : 'translateY(10px)' }
        : { opacity: 0 };
      el.animate([depart, { opacity: 1, transform: 'none' }], {
        duration: niveau === 'full' ? 460 : 220,
        delay: niveau === 'full' ? (direction ? 40 : 640) + Math.min(i, 8) * 45 : 0,
        easing: EASE_EMPH,
        fill: 'backwards'
      });
    });
  }

  /* Enchaînement des écrans : sortie courte, entrée dans le sens de la marche. */
  function vues(conteneur, { surAffichage, ordre = [] } = {}) {
    const carte = conteneur.closest('[data-carte]');
    const pied = $('[data-carte-pied]', carte);
    const liste = $$('[data-vue]', conteneur);
    let actuelle = null;
    let jeton = 0;
    const rang = nom => { const i = ordre.indexOf(nom); return i < 0 ? ordre.length : i; };
    cadre(carte);
    async function afficher(nom, { focus = 'titre', sens } = {}) {
      const cible = liste.find(vue => vue.dataset.vue === nom);
      if (!cible) return;
      const avant = liste.find(vue => vue.dataset.vue === actuelle);
      const direction = sens ?? (actuelle && rang(nom) < rang(actuelle) ? -1 : 1);
      const moi = ++jeton;
      const niveau = mouvement();
      const change = avant && avant !== cible && !avant.hidden;
      if (change && niveau !== 'none') {
        const sortie = niveau === 'full' ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-12 * direction}px)` }] : [{ opacity: 1 }, { opacity: 0 }];
        await avant.animate(sortie, { duration: 150, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' }).finished.catch(() => {});
        avant.getAnimations().forEach(a => a.cancel());
        if (moi !== jeton) return;
      }
      liste.forEach(vue => { vue.hidden = vue !== cible; });
      if (pied) pied.hidden = !cible.hasAttribute('data-pied');
      actuelle = nom;
      surAffichage?.(nom, cible);
      if (change) entree(cible, direction);
      else if (!avant) entree(cible);
      if (focus === 'titre') $('h1', cible)?.focus({ preventScroll: true });
      else if (focus === 'champ') $('input:not([type="hidden"]):not([tabindex="-1"])', cible)?.focus({ preventScroll: true });
      if (change && carte.getBoundingClientRect().top < 0) carte.scrollIntoView({ block: 'start', behavior: niveau === 'full' ? 'smooth' : 'auto' });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { carte.dataset.pret = ''; }));
    return { afficher, actuelle: () => actuelle };
  }

  /* Champs ---------------------------------------------------------------- */

  function erreur(input, message = '') {
    const sortie = document.getElementById(`${input.id}-erreur`);
    input.setAttribute('aria-invalid', String(Boolean(message)));
    input.closest('.saisie, .otp, .case')?.classList.toggle('is-invalide', Boolean(message));
    if (!sortie) return;
    sortie.innerHTML = message ? `${icon('alert')}<span>${t(message)}</span>` : '';
    sortie.hidden = !message;
  }
  function secouer(el) {
    if (!el || !V.motion.full()) return;
    el.animate([{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 360, easing: EASE });
  }
  function premierInvalide(form) {
    const champ = $('[aria-invalid="true"]', form);
    if (champ) { champ.focus(); secouer(champ.closest('.saisie') || champ.closest('.otp') || champ.closest('.case')); }
    return champ;
  }
  function alerte(el, html = '', ton = 'erreur') {
    if (!el) return;
    el.dataset.ton = ton;
    el.innerHTML = html ? `${icon(ton === 'info' ? 'info' : 'alert')}<div>${html}</div>` : '';
    el.hidden = !html;
    if (html && ton !== 'info') secouer(el);
  }
  function libelle(bouton, texte) { ($('.action-libelle', bouton) || bouton).textContent = V.typo(texte); }
  function occupe(bouton, on, texte) {
    if (!bouton) return;
    const cible = $('.action-libelle', bouton) || bouton;
    if (!bouton.dataset.libelle) bouton.dataset.libelle = cible.textContent;
    bouton.classList.toggle('is-occupe', on);
    bouton.disabled = on;
    cible.textContent = on ? texte : bouton.dataset.libelle;
    bouton.closest('form')?.setAttribute('aria-busy', String(on));
  }
  function reussi(bouton, texte) {
    if (!bouton) return;
    bouton.classList.remove('is-occupe');
    bouton.classList.add('is-reussi');
    libelle(bouton, texte);
  }
  function retablir(bouton) {
    if (!bouton) return;
    bouton.classList.remove('is-occupe', 'is-reussi');
    bouton.disabled = false;
    if (bouton.dataset.libelle) libelle(bouton, bouton.dataset.libelle);
  }

  /* Adresse e-mail : format et faute de frappe dans le domaine. */
  function distance(a, b) {
    const ligne = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let precedent = ligne[0];
      ligne[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const garde = ligne[j];
        ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1));
        precedent = garde;
      }
    }
    return ligne[b.length];
  }
  const emailValide = valeur => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur.trim());
  function messageEmail(valeur) {
    if (!valeur.trim()) return 'Indiquez votre adresse e-mail.';
    if (!emailValide(valeur)) return 'Cette adresse e-mail est incomplète.';
    return '';
  }
  function suggestionEmail(valeur) {
    const m = /^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/i.exec(valeur.trim());
    if (!m) return null;
    const domaine = m[2].toLowerCase();
    if (A.domaines.includes(domaine)) return null;
    /* Faute sur le nom du service (gmial.com) ou sur l'extension (gmail.con),
       jamais sur une extension nationale valide (orange.sn reste orange.sn). */
    const [nom, ...reste] = domaine.split('.');
    const fin = reste.join('.');
    let meilleur = null;
    let score = 3;
    A.domaines.forEach(d => {
      const [dNom, ...dReste] = d.split('.');
      const dFin = dReste.join('.');
      const s = fin === dFin ? distance(nom, dNom) : nom === dNom && distance(fin, dFin) === 1 && fin.length === dFin.length ? 1 : 3;
      if (s > 0 && s < score) { score = s; meilleur = d; }
    });
    return meilleur ? `${m[1]}@${meilleur}` : null;
  }
  function surveillerEmail(input, surChange) {
    const note = document.getElementById(`${input.id}-suggestion`);
    input.addEventListener('input', () => { erreur(input); if (note) note.hidden = true; surChange?.(); });
    if (!note) return;
    input.addEventListener('blur', () => {
      const proposition = suggestionEmail(input.value);
      note.hidden = !proposition;
      note.innerHTML = proposition ? `${icon('info')}<span>Vouliez-vous écrire <button type="button" class="lien" data-corriger="${V.esc(proposition)}">${t(proposition)}</button> ?</span>` : '';
    });
    note.addEventListener('click', event => {
      const bouton = event.target.closest('[data-corriger]');
      if (!bouton) return;
      input.value = bouton.dataset.corriger;
      note.hidden = true;
      erreur(input);
      surChange?.();
      input.focus();
    });
  }

  /* Mot de passe : affichage, majuscules verrouillées et qualité (RG-04). */
  const OEIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="oeil-barre" pathLength="1" d="m4 4 16 16"/></svg>';
  function voir(bouton, input, visible) {
    input.type = visible ? 'text' : 'password';
    bouton.setAttribute('aria-pressed', String(visible));
    if (!bouton.dataset.objet) bouton.dataset.objet = (bouton.getAttribute('aria-label') || 'Afficher le mot de passe').replace(/^(Afficher|Masquer) /, '');
    bouton.setAttribute('aria-label', `${visible ? 'Masquer' : 'Afficher'} ${bouton.dataset.objet}`);
  }
  function motDePasse(scope = document) {
    $$('[data-mdp]', scope).forEach(zone => {
      const input = $('input', zone);
      const bouton = $('[data-voir]', zone);
      const maj = document.getElementById(`${input.id}-maj`);
      bouton.innerHTML = OEIL;
      bouton.addEventListener('click', () => {
        const debut = input.selectionStart;
        const fin = input.selectionEnd;
        voir(bouton, input, input.type === 'password');
        input.focus({ preventScroll: true });
        try { input.setSelectionRange(debut, fin); } catch { /* sélection non prise en charge */ }
      });
      const verifierMaj = event => { if (maj && event.getModifierState) maj.hidden = !event.getModifierState('CapsLock'); };
      input.addEventListener('keydown', verifierMaj);
      input.addEventListener('keyup', verifierMaj);
      input.addEventListener('blur', () => { if (maj) maj.hidden = true; });
    });
  }
  function cacherMotsDePasse(scope = document) {
    $$('[data-mdp]', scope).forEach(zone => voir($('[data-voir]', zone), $('input', zone), false));
  }

  function evaluer(valeur, { pseudo = '', email = '' } = {}) {
    const n = [...valeur].length;
    const bas = valeur.toLowerCase();
    if (!n) return { etat: 'vide', progression: 0 };
    if (n < 12) return { etat: 'court', progression: n / 12, reste: 12 - n };
    if (A.compromis.includes(bas) || /^(.)\1+$/.test(valeur)) return { etat: 'compromis', progression: 1, message: 'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.' };
    const personnel = [pseudo, email.split('@')[0]].map(s => (s || '').toLowerCase()).filter(s => s.length >= 4);
    if (personnel.some(s => bas.includes(s))) return { etat: 'personnel', progression: 1, message: 'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.' };
    return { etat: n >= 16 ? 'solide' : 'valide', progression: 1 };
  }
  /* Jauge en quatre segments : trois pour atteindre 12 caractères, le quatrième à 16. */
  function jauge(input, identite = () => ({}), surChange) {
    const champ = input.closest('.champ');
    const barre = $('[data-force]', champ);
    const aide = $('[data-aide-mdp]', champ);
    const annonce = $('[data-annonce]', champ);
    const AIDE = aide.textContent;
    let precedent = 'vide';
    function maj() {
      const r = evaluer(input.value, identite());
      const segments = { vide: 0, court: Math.min(2, Math.floor(r.progression * 3)), valide: 3, solide: 4, compromis: 4, personnel: 4 }[r.etat];
      barre.dataset.etat = r.etat;
      barre.dataset.n = segments;
      aide.className = `message force-texte${['valide', 'solide'].includes(r.etat) ? ' is-ok' : ''}`;
      if (r.etat === 'vide') aide.textContent = AIDE;
      else if (r.etat === 'court') aide.textContent = V.typo(`Encore ${V.plural(r.reste, 'caractère', 'caractères')}`);
      else if (r.etat === 'valide') aide.textContent = 'Valide';
      else if (r.etat === 'solide') aide.textContent = 'Solide';
      aide.hidden = ['compromis', 'personnel'].includes(r.etat);
      if (r.message) erreur(input, r.message);
      else if (['compromis', 'personnel'].includes(precedent) || input.getAttribute('aria-invalid') === 'true') erreur(input);
      if (r.etat !== precedent && ['valide', 'solide'].includes(r.etat) && annonce) annonce.textContent = r.etat === 'solide' ? 'Mot de passe solide.' : 'Mot de passe valide.';
      precedent = r.etat;
      surChange?.(r);
      return r;
    }
    input.addEventListener('input', maj);
    return { maj, resultat: () => evaluer(input.value, identite()) };
  }

  /* Code à six chiffres : un seul champ (collage et remplissage automatique),
     six cases qui en reflètent la saisie. */
  function codeSixChiffres(zone, surComplet) {
    const input = $('input', zone);
    const cases = $$('.otp-cases > span', zone);
    let avant = '';
    function rendre() {
      const valeur = input.value;
      const actif = document.activeElement === input;
      cases.forEach((c, i) => {
        c.textContent = valeur[i] || '';
        c.classList.toggle('is-rempli', Boolean(valeur[i]));
        c.classList.toggle('is-actif', actif && i === Math.min(valeur.length, 5));
        if (valeur[i] && !avant[i] && V.motion.full()) c.animate([{ transform: 'scale(0.82)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: EASE_EMPH });
      });
      avant = valeur;
    }
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      erreur(input);
      rendre();
      if (input.value.length === 6) surComplet?.();
    });
    const auBout = () => requestAnimationFrame(() => { const n = input.value.length; try { input.setSelectionRange(n, n); } catch { /* champ non textuel */ } rendre(); });
    input.addEventListener('focus', auBout);
    input.addEventListener('click', auBout);
    input.addEventListener('keyup', rendre);
    input.addEventListener('blur', rendre);
    return { vider() { input.value = ''; rendre(); }, rendre };
  }

  /* Retour des services externes ----------------------------------------- */

  let voile;
  async function redirection(service) {
    const s = A.services[service];
    if (!voile) {
      document.body.insertAdjacentHTML('beforeend', '<div class="redirection" role="status" aria-live="polite" data-redirection hidden></div>');
      voile = $('[data-redirection]');
    }
    voile.innerHTML = `<div class="redirection-boite"><span class="redirection-logo">${LOGOS[service]}</span><span class="roue" aria-hidden="true"></span><p>${t(`Redirection vers ${s.nom}…`)}</p></div>`;
    voile.hidden = false;
    await attendre(mouvement() === 'none' ? 450 : 1200);
    voile.hidden = true;
    return s;
  }

  /* Documents légaux -------------------------------------------------------- */

  let fenetreDocuments;
  const ORDRE = ['cgu', 'confidentialite', 'charte'];
  function documents(cle = 'cgu') {
    if (!fenetreDocuments) {
      document.body.insertAdjacentHTML('beforeend', `<dialog class="dialogue" aria-labelledby="doc-titre" data-documents>
        <div class="dialogue-tete"><h2 id="doc-titre">Documents en vigueur</h2><button class="icon-btn" type="button" aria-label="Fermer" data-fermer>${icon('close', '')}</button></div>
        <div class="onglets" role="tablist" aria-label="Documents">${ORDRE.map(id => `<button type="button" role="tab" id="doc-onglet-${id}" aria-controls="doc-${id}" data-doc="${id}">${t(A.documents[id].onglet)}</button>`).join('')}</div>
        ${ORDRE.map(id => { const d = A.documents[id]; return `<section class="document" id="doc-${id}" role="tabpanel" aria-labelledby="doc-onglet-${id}" tabindex="0" hidden>
          <h3>${t(d.titre)}</h3>
          <p class="document-version">${t(`En vigueur depuis le ${d.version}`)}</p>
          <ul>${d.points.map(point => `<li><span>${t(point)}</span></li>`).join('')}</ul>
        </section>`; }).join('')}
        <div class="dialogue-pied"><button class="action action-principale" type="button" data-fermer>Fermer</button></div>
      </dialog>`);
      fenetreDocuments = $('[data-documents]');
      fenetreDocuments.addEventListener('click', event => { if (event.target === fenetreDocuments || event.target.closest('[data-fermer]')) fenetreDocuments.close(); });
      $$('[data-doc]', fenetreDocuments).forEach(onglet => onglet.addEventListener('click', () => choisir(onglet.dataset.doc)));
      $('.onglets', fenetreDocuments).addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const i = ORDRE.indexOf(document.activeElement.dataset.doc);
        const n = event.key === 'Home' ? 0 : event.key === 'End' ? ORDRE.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + ORDRE.length) % ORDRE.length;
        choisir(ORDRE[n], true);
      });
    }
    function choisir(id, focus = false) {
      $$('[data-doc]', fenetreDocuments).forEach(onglet => {
        const on = onglet.dataset.doc === id;
        onglet.setAttribute('aria-selected', String(on));
        onglet.tabIndex = on ? 0 : -1;
        if (on && focus) onglet.focus();
      });
      $$('.document', fenetreDocuments).forEach(section => { section.hidden = section.id !== `doc-${id}`; });
    }
    const id = ORDRE.includes(cle) ? cle : 'cgu';
    choisir(id);
    if (!fenetreDocuments.open) fenetreDocuments.showModal();
    $(`[data-doc="${id}"]`, fenetreDocuments)?.focus();
  }

  /* Aide propre à la page : une liste de questions et de réponses. */
  function aide(questions, action) {
    let el = $('[data-aide-dialogue]');
    if (!el) {
      document.body.insertAdjacentHTML('beforeend', '<dialog class="dialogue" aria-labelledby="aide-titre" data-aide-dialogue></dialog>');
      el = $('[data-aide-dialogue]');
      el.addEventListener('click', event => { if (event.target === el || event.target.closest('[data-fermer]')) el.close(); });
    }
    el.innerHTML = `<div class="dialogue-tete"><h2 id="aide-titre">Aide</h2><button class="icon-btn" type="button" aria-label="Fermer" data-fermer>${icon('close', '')}</button></div>
      <div class="aide"><dl>${questions.map(([q, r]) => `<dt>${t(q)}</dt><dd>${t(r)}</dd>`).join('')}</dl>${action || ''}</div>`;
    el.showModal();
    return el;
  }

  /* Délais ----------------------------------------------------------------- */

  function compte(secondes, surTic, surFin) {
    let reste = secondes;
    surTic(reste);
    const id = setInterval(() => {
      reste -= 1;
      if (reste <= 0) { clearInterval(id); surFin(); } else surTic(reste);
    }, 1000);
    return () => clearInterval(id);
  }

  /* Liens vers les documents, où qu'ils soient dans la page. */
  document.addEventListener('click', event => {
    const doc = event.target.closest('[data-document]');
    if (!doc) return;
    event.preventDefault();
    documents(doc.dataset.document);
  });

  /* Entrée de la page : le cadre monte, puis son contenu. */
  /* Entrée de la page : le cadre monte depuis le bas de l'écran, puis son contenu. */
  function demarrer() {
    const carte = $('[data-carte]');
    const niveau = mouvement();
    if (!carte || niveau === 'none') return;
    carte.animate(niveau === 'full'
      ? [{ transform: 'translateY(calc(100% + 48px))' }, { transform: 'none' }]
      : [{ opacity: 0 }, { opacity: 1 }], { duration: niveau === 'full' ? 1050 : 260, delay: niveau === 'full' ? 220 : 0, easing: EASE_EMPH, fill: 'backwards' });
    $('.auth-tete')?.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 380, easing: EASE_EMPH, fill: 'backwards' });
  }

  return {
    A, LOGOS, logos, attendre, capital, duree,
    APPARENCE, APPARENCE_DEFAUTS, REGLAGES_FOND,
    contexte, liens, repere, retour, libelleRetour, fond, demarrer,
    entree, vues, erreur, secouer, premierInvalide, alerte, libelle, occupe, reussi, retablir,
    emailValide, messageEmail, surveillerEmail,
    motDePasse, cacherMotsDePasse, evaluer, jauge, codeSixChiffres,
    redirection, documents, aide, compte
  };
})();
