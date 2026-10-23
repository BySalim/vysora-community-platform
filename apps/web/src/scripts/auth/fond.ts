/* Fond animé de la connexion et de l'inscription (porté de prototype/auth.js, `fond`).
   Calculé par la carte graphique (WebGL 2), sans aucune image :
   - Relief : un relief de points en perspective, parcouru de houles, qui se soulève sous le
     pointeur ; à la réussite, une onde part sous le cadre.
   - Lignes de niveau : un relief vu de dessus, qui ondule et se resserre autour du pointeur.
   - Flux : des lignes fines qui ondulent comme un tissu et s'écartent du pointeur.
   Sans WebGL 2, ou avec le fond uni, le bleu seul reste affiché. Le site retient le relief
   (réglage par défaut du prototype) ; les autres scènes restent disponibles. */

import { $, animations } from '../commun/outils';

export interface Fond {
  reussir(): void;
  annuler(): void;
  maj(): void;
}

const racine = document.documentElement;

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

interface Scene {
  sommets: string;
  pixels: string;
  points?: boolean;
  finesse: number;
}

const SCENES: Record<string, Scene> = {
  relief: { sommets: GLSL_RELIEF_SOMMETS, pixels: GLSL_RELIEF_POINTS, points: true, finesse: 2 },
  lignes: { sommets: GLSL_ECRAN, pixels: GLSL_LIGNES, finesse: 1.5 },
  flux: { sommets: GLSL_ECRAN, pixels: GLSL_FLUX, finesse: 1.5 },
};

/** Couleur des motifs : teinte des creux, teinte des sommets. */
const TEINTES: Record<string, [number[], number[]]> = {
  pale: [
    [0.76, 0.85, 1],
    [1, 1, 1],
  ],
  blanc: [
    [1, 1, 1],
    [1, 1, 1],
  ],
  ciel: [
    [0.58, 0.77, 0.99],
    [0.86, 0.92, 1],
  ],
};

interface Programme {
  prog: WebGLProgram;
  u: (nom: string) => WebGLUniformLocation | null;
  attribut: number;
}

const MUET: Fond = { reussir() {}, annuler() {}, maj() {} };

export function fond(): Fond {
  const zone = $('[data-fond]');
  if (!zone) return MUET;
  zone.innerHTML = '<canvas class="fond-gl" data-gl></canvas>';
  const toile = $<HTMLCanvasElement>('[data-gl]', zone);
  const contexte = toile?.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!toile || !contexte) {
    zone.classList.add('sans-gl');
    return MUET;
  }
  const el: HTMLElement = zone;
  const canvas: HTMLCanvasElement = toile;
  const gl: WebGL2RenderingContext = contexte;

  const motif = () => {
    const choisi = racine.dataset.authMotif ?? '';
    return SCENES[choisi] ? choisi : choisi === 'uni' ? 'uni' : 'relief';
  };
  const vivant = () => animations.niveau() === 'full' && !document.hidden;
  const intensite = () =>
    ({ subtle: 0.65, standard: 1, bold: 1.45 })[racine.dataset.effects ?? 'standard'] ?? 1;
  const teinte = () => TEINTES[racine.dataset.authTeinte ?? 'pale'] ?? TEINTES.pale!;
  const fin = window.matchMedia('(pointer: fine)');

  /* Programmes compilés à la première utilisation. */
  const programmes: Record<string, Programme> = {};
  function compiler(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader non créé');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader invalide');
    return shader;
  }
  function programme(nom: string): Programme {
    const existant = programmes[nom];
    if (existant) return existant;
    const scene = SCENES[nom]!;
    const prog = gl.createProgram();
    gl.attachShader(prog, compiler(gl.VERTEX_SHADER, scene.sommets));
    gl.attachShader(prog, compiler(gl.FRAGMENT_SHADER, scene.pixels));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(prog) ?? 'Programme invalide');
    const uniformes = new Map<string, WebGLUniformLocation | null>();
    const u = (n: string) => {
      if (!uniformes.has(n)) uniformes.set(n, gl.getUniformLocation(prog, n));
      return uniformes.get(n) ?? null;
    };
    const cree = {
      prog,
      u,
      attribut: gl.getAttribLocation(prog, scene.points ? 'a_grille' : 'a_position'),
    };
    programmes[nom] = cree;
    return cree;
  }

  /* Géométries : deux triangles pour l'écran, une grille de points pour le relief. */
  const ecran = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ecran);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
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

  function dimensionner(): void {
    const scene = SCENES[motif()];
    dpr = Math.min(scene ? scene.finesse : 1, window.devicePixelRatio || 1);
    W = el.clientWidth || window.innerWidth;
    H = el.clientHeight || window.innerHeight;
    const largeur = Math.round(W * dpr);
    const hauteur = Math.round(H * dpr);
    if (canvas.width !== largeur || canvas.height !== hauteur) {
      canvas.width = largeur;
      canvas.height = hauteur;
    }
    gl.viewport(0, 0, largeur, hauteur);
  }

  /* Point du sol visé par le pointeur (même caméra que le shader du relief). */
  function solSousPointeur(): [number, number] {
    if (pointeur.force < 0.01) return [0, -100];
    const xn = (pointeur.lx / W) * 2 - 1;
    const yn = 1 - (pointeur.ly / H) * 2;
    const { inclinaison, focale, sol } = CAMERA;
    const cy = Math.cos(inclinaison);
    const sy = Math.sin(inclinaison);
    const denominateur = yn * cy - focale * sy;
    if (denominateur >= -1e-4) return [0, -100];
    const Z = (sol * (focale * cy + yn * sy)) / denominateur;
    if (Z <= 0) return [0, -100];
    const profondeur = -sol * sy + Z * cy;
    return [(xn * (W / H) * profondeur) / focale, Z];
  }

  function dessiner(maintenant: number): void {
    const nom = motif();
    if (nom === 'uni') {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    const anime = vivant();
    const temps = anime ? (maintenant - depart) / 1000 : 14;
    const entree = anime && entreeDepuis >= 0 ? Math.min(1, (maintenant - entreeDepuis) / 1700) : 1;
    const onde = reussiDepuis >= 0 && anime ? (maintenant - reussiDepuis) / 1000 : 0;
    redresse += ((reussiDepuis >= 0 ? 1 : 0) - redresse) * (anime ? 0.04 : 1);
    pointeur.lx += (pointeur.x - pointeur.lx) * (anime ? 0.12 : 1);
    pointeur.ly += (pointeur.y - pointeur.ly) * (anime ? 0.12 : 1);
    pointeur.force += (pointeur.cible - pointeur.force) * (anime ? 0.06 : 1);
    const carte = $('[data-carte]')?.getBoundingClientRect();
    const origine = carte
      ? [(carte.left + carte.width / 2) * dpr, carte.top * dpr]
      : [(W * dpr) / 2, H * dpr];

    let p: Programme;
    try {
      p = programme(nom);
    } catch (erreur) {
      el.classList.add('sans-gl');
      console.warn(erreur);
      return;
    }
    const [base, sommet] = teinte();
    gl.useProgram(p.prog);
    gl.uniform1f(p.u('u_temps'), temps);
    gl.uniform1f(p.u('u_intensite'), intensite());
    gl.uniform1f(p.u('u_entree'), entree);
    gl.uniform1f(p.u('u_onde'), onde);
    gl.uniform1f(p.u('u_force'), pointeur.force);
    gl.uniform3fv(p.u('u_base'), base);
    gl.uniform3fv(p.u('u_sommet'), sommet);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (SCENES[nom]?.points) {
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
      gl.uniform2f(p.u('u_origine'), origine[0] ?? 0, origine[1] ?? 0);
      const redresseLoc = p.u('u_redresse');
      if (redresseLoc) gl.uniform1f(redresseLoc, redresse);
      gl.bindBuffer(gl.ARRAY_BUFFER, ecran);
      gl.enableVertexAttribArray(p.attribut);
      gl.vertexAttribPointer(p.attribut, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  function boucle(maintenant: number): void {
    image = 0;
    dessiner(maintenant);
    if (vivant() && motif() !== 'uni') image = requestAnimationFrame(boucle);
  }
  const relancer = () => {
    if (!image) image = requestAnimationFrame(boucle);
  };

  window.addEventListener(
    'pointermove',
    (evenement) => {
      if (evenement.pointerType !== 'mouse') return;
      pointeur.x = evenement.clientX;
      pointeur.y = evenement.clientY;
      if (pointeur.lx < -9000) {
        pointeur.lx = pointeur.x;
        pointeur.ly = pointeur.y;
      }
      pointeur.cible = fin.matches ? 1 : 0;
      if (!vivant()) relancer();
    },
    { passive: true },
  );
  window.addEventListener('pointerout', (evenement) => {
    if (!evenement.relatedTarget) {
      pointeur.cible = 0;
      if (!vivant()) relancer();
    }
  });
  let attente: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(attente);
    attente = setTimeout(() => {
      dimensionner();
      relancer();
    }, 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) relancer();
  });
  canvas.addEventListener('webglcontextlost', (evenement) => {
    evenement.preventDefault();
    el.classList.add('sans-gl');
  });

  depart = performance.now();
  dimensionner();
  requestAnimationFrame((t) => {
    entreeDepuis = t + 150;
    relancer();
  });

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
    },
  };
}
