/* Barre de défilement de la page sur les écrans à barres classiques (Windows, Linux), repérés par le
   script du gabarit : la barre du système est masquée (styles/defilement.css) et remplacée par une
   barre superposée, comme sur téléphone. Elle ne prend aucune place, apparaît pendant le défilement
   et au survol du bord droit, se fait glisser à la souris ; un clic sur la piste avance ou recule
   d'un écran. Le défilement reste celui du navigateur (molette, pavé tactile, clavier). */

const racine = document.documentElement;
const MARGE = 2;
const MINIMUM = 40;
const VISIBLE_APRES = 1000;

function barreSuperposee(): void {
  const piste = document.createElement('div');
  piste.className = 'vy-barre';
  piste.setAttribute('aria-hidden', 'true');
  const pouce = document.createElement('div');
  pouce.className = 'vy-barre-pouce';
  piste.append(pouce);
  document.body.append(piste);

  let course = 0;
  let maximum = 0;
  let minuterie = 0;
  let glisse: { y: number; depart: number } | null = null;

  const placer = () => {
    const part = maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0;
    pouce.style.transform = `translateY(${MARGE + part * course}px)`;
  };
  const mesurer = () => {
    const vue = racine.clientHeight;
    const totale = racine.scrollHeight;
    maximum = totale - vue;
    piste.hidden = maximum <= 0;
    const zone = vue - 2 * MARGE;
    const hauteur = Math.max(MINIMUM, (zone * vue) / totale);
    course = zone - hauteur;
    pouce.style.height = `${hauteur}px`;
    placer();
  };
  const montrer = () => {
    piste.classList.add('est-visible');
    window.clearTimeout(minuterie);
    minuterie = window.setTimeout(() => piste.classList.remove('est-visible'), VISIBLE_APRES);
  };

  window.addEventListener(
    'scroll',
    () => {
      placer();
      montrer();
    },
    { passive: true },
  );
  window.addEventListener('resize', mesurer);
  new ResizeObserver(mesurer).observe(document.body);

  pouce.addEventListener('pointerdown', (evenement) => {
    if (evenement.button !== 0) return;
    evenement.preventDefault();
    glisse = { y: evenement.clientY, depart: window.scrollY };
    pouce.setPointerCapture(evenement.pointerId);
    piste.classList.add('est-glisse');
  });
  pouce.addEventListener('pointermove', (evenement) => {
    if (!glisse || course <= 0) return;
    const ecart = ((evenement.clientY - glisse.y) * maximum) / course;
    window.scrollTo({ top: glisse.depart + ecart, behavior: 'instant' });
  });
  pouce.addEventListener('lostpointercapture', () => {
    glisse = null;
    piste.classList.remove('est-glisse');
    montrer();
  });
  piste.addEventListener('pointerdown', (evenement) => {
    if (evenement.target !== piste || evenement.button !== 0) return;
    evenement.preventDefault();
    const sens = evenement.clientY < pouce.getBoundingClientRect().top ? -1 : 1;
    window.scrollBy({ top: sens * racine.clientHeight * 0.9 });
  });

  mesurer();
}

if (racine.classList.contains('barres-classiques')) barreSuperposee();
