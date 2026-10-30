/* Composants partagés par la connexion et l'inscription (portés de prototype/auth.js) : cadre et
   enchaînement des écrans, champs, mot de passe et sa jauge, documents en vigueur, aide, délais.
   Les parcours propres à chaque page sont dans connexion.ts et inscription.ts ; le fond animé
   dans fond.ts. Les données affichées viennent du serveur ; rien n'est simulé. */

import { champEmail, evaluerMotDePasse, type EvaluationMotDePasse } from '@vysora/shared';
import { $, $$, animations, esc, icon, pluriel, t, typo } from '../commun/outils';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const EASE_EMPH = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const mouvement = () => animations.niveau();

export const attendre = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** « 0:30 » */
export const duree = (secondes: number) =>
  `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;

/* Logos de Google et GitHub ------------------------------------------------- */

const LOGOS: Record<string, string> = {
  google:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.9a12 12 0 0 1 0-7.8v-5.2H5.8a20 20 0 0 0 0 18.2Z"/><path fill="#EA4335" d="M24 11.7c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.9l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>',
  github:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.7.2 2.9.1 3.2.7.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.4c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"/></svg>',
};

export function logos(zone: ParentNode = document): void {
  for (const el of $$('[data-logo]', zone)) el.innerHTML = LOGOS[el.dataset.logo ?? ''] ?? '';
}

const NOMS_SERVICES: Record<string, string> = { google: 'Google', github: 'GitHub' };

/** F-02 (S-10, AUTH-08) : la connexion par Google et GitHub ouvre plus tard ; le bouton le dit. */
export function servicesBientot(alerteEl: HTMLElement | null, zone: ParentNode = document): void {
  for (const bouton of $$<HTMLButtonElement>('[data-service]', zone)) {
    bouton.addEventListener('click', () => {
      const nom = NOMS_SERVICES[bouton.dataset.service ?? ''] ?? 'ce service';
      alerte(
        alerteEl,
        `<p><b>${t(`La connexion avec ${nom} n’est pas encore ouverte.`)}</b> ${t('Utilisez votre adresse e-mail.')}</p>`,
        'info',
      );
    });
  }
}

/** Session fermée sans recharger la page : l'en-tête redevient celui d'une visiteuse (etats.css). */
export function passerEnVisiteur(): void {
  const racine = document.documentElement;
  racine.dataset.session = 'visiteur';
  for (const nom of ['role', 'niveau', 'compte', 'notifications']) delete racine.dataset[nom];
}

/* Cadre et écrans ---------------------------------------------------------- */

/* La hauteur du cadre suit son contenu : chaque changement (écran, message, propositions)
   s'anime au lieu de sauter. */
function cadre(carte: HTMLElement): void {
  let hauteur = carte.getBoundingClientRect().height;
  let animation: Animation | null = null;
  const observateur = new ResizeObserver(() => {
    let depart = hauteur;
    if (animation) {
      depart = carte.getBoundingClientRect().height;
      animation.cancel();
      animation = null;
    }
    const arrivee = carte.getBoundingClientRect().height;
    hauteur = arrivee;
    if (
      !carte.hasAttribute('data-pret') ||
      mouvement() !== 'full' ||
      Math.abs(arrivee - depart) < 2
    )
      return;
    animation = carte.animate([{ height: `${depart}px` }, { height: `${arrivee}px` }], {
      duration: Math.min(520, 280 + Math.abs(arrivee - depart) * 0.5),
      easing: EASE,
    });
    animation.onfinish = () => {
      animation = null;
    };
  });
  for (const el of $$('[data-carte-contenu], [data-carte-pied]', carte)) observateur.observe(el);
}

function entree(vue: HTMLElement, direction = 0): void {
  const niveau = mouvement();
  if (niveau === 'none') return;
  const enfants = [...vue.children].filter((el) => !(el as HTMLElement).hidden);
  enfants.forEach((el, i) => {
    const depart =
      niveau === 'full'
        ? {
            opacity: 0,
            transform: direction ? `translateX(${18 * direction}px)` : 'translateY(10px)',
          }
        : { opacity: 0 };
    el.animate([depart, { opacity: 1, transform: 'none' }], {
      duration: niveau === 'full' ? 460 : 220,
      delay: niveau === 'full' ? (direction ? 40 : 640) + Math.min(i, 8) * 45 : 0,
      easing: EASE_EMPH,
      fill: 'backwards',
    });
  });
}

export interface Vues {
  afficher(
    nom: string,
    options?: { focus?: 'titre' | 'champ' | false; sens?: number },
  ): Promise<void>;
  actuelle(): string | null;
}

/** Enchaînement des écrans : sortie courte, entrée dans le sens de la marche. */
export function vues(
  conteneur: HTMLElement,
  { surAffichage, ordre = [] }: { surAffichage?: (nom: string) => void; ordre?: string[] } = {},
): Vues {
  const carte = conteneur.closest<HTMLElement>('[data-carte]')!;
  const pied = $('[data-carte-pied]', carte);
  const liste = $$<HTMLElement>('[data-vue]', conteneur);
  // L'écran visible au chargement est choisi par le serveur.
  let actuelle: string | null = liste.find((vue) => !vue.hidden)?.dataset.vue ?? null;
  let jeton = 0;
  const rang = (nom: string) => {
    const i = ordre.indexOf(nom);
    return i < 0 ? ordre.length : i;
  };
  cadre(carte);

  async function afficher(
    nom: string,
    { focus = 'titre', sens }: { focus?: 'titre' | 'champ' | false; sens?: number } = {},
  ): Promise<void> {
    const cible = liste.find((vue) => vue.dataset.vue === nom);
    if (!cible) return;
    const avant = liste.find((vue) => vue.dataset.vue === actuelle);
    const direction = sens ?? (actuelle && rang(nom) < rang(actuelle) ? -1 : 1);
    const moi = ++jeton;
    const niveau = mouvement();
    const change = Boolean(avant && avant !== cible && !avant.hidden);
    if (avant && change && niveau !== 'none') {
      const sortie =
        niveau === 'full'
          ? [
              { opacity: 1, transform: 'none' },
              { opacity: 0, transform: `translateX(${-12 * direction}px)` },
            ]
          : [{ opacity: 1 }, { opacity: 0 }];
      await avant
        .animate(sortie, { duration: 150, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' })
        .finished.catch(() => {});
      for (const animation of avant.getAnimations()) animation.cancel();
      if (moi !== jeton) return;
    }
    for (const vue of liste) vue.hidden = vue !== cible;
    if (pied) pied.hidden = !cible.hasAttribute('data-pied');
    actuelle = nom;
    surAffichage?.(nom);
    if (change) entree(cible, direction);
    else if (!avant) entree(cible);
    if (focus === 'titre') $('h1', cible)?.focus({ preventScroll: true });
    else if (focus === 'champ')
      $$('input:not([type="hidden"]):not([tabindex="-1"])', cible)
        .find((champ) => !champ.closest('[hidden]'))
        ?.focus({ preventScroll: true });
    if (change && carte.getBoundingClientRect().top < 0)
      carte.scrollIntoView({ block: 'start', behavior: niveau === 'full' ? 'smooth' : 'auto' });
  }

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      carte.dataset.pret = '';
    }),
  );
  const visible = liste.find((vue) => vue.dataset.vue === actuelle);
  if (visible) {
    if (pied) pied.hidden = !visible.hasAttribute('data-pied');
    entree(visible);
  }
  return { afficher, actuelle: () => actuelle };
}

/* Champs -------------------------------------------------------------------- */

type Champ = HTMLInputElement;

export function erreur(input: Champ, message = ''): void {
  const sortie = document.getElementById(`${input.id}-erreur`);
  input.setAttribute('aria-invalid', String(Boolean(message)));
  input.closest('.saisie, .otp, .case')?.classList.toggle('is-invalide', Boolean(message));
  if (!sortie) return;
  sortie.innerHTML = message ? `${icon('alert')}<span>${t(message)}</span>` : '';
  sortie.hidden = !message;
}

export function secouer(el: Element | null): void {
  if (!el || !animations.completes()) return;
  el.animate(
    [
      { transform: 'none' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(2px)' },
      { transform: 'none' },
    ],
    { duration: 360, easing: EASE },
  );
}

/** Place le focus sur le premier champ invalide du formulaire ; vrai s'il y en a un. */
export function premierInvalide(form: ParentNode): boolean {
  const champ = $<HTMLElement>('[aria-invalid="true"]', form);
  if (!champ) return false;
  champ.focus();
  secouer(champ.closest('.saisie') ?? champ.closest('.otp') ?? champ.closest('.case'));
  return true;
}

/** Message dans le cadre : `html` est déjà échappé par l'appelant (t()). */
export function alerte(el: HTMLElement | null, html = '', ton: 'erreur' | 'info' = 'erreur'): void {
  if (!el) return;
  el.dataset.ton = ton;
  el.innerHTML = html ? `${icon(ton === 'info' ? 'info' : 'alert')}<div>${html}</div>` : '';
  el.hidden = !html;
  if (html && ton !== 'info') secouer(el);
}

export function libelle(bouton: HTMLElement, texte: string): void {
  ($('.action-libelle', bouton) ?? bouton).textContent = typo(texte);
}

export function occupe(bouton: HTMLButtonElement | null, actif: boolean, texte = ''): void {
  if (!bouton) return;
  const cible = $('.action-libelle', bouton) ?? bouton;
  if (!bouton.dataset.libelle) bouton.dataset.libelle = cible.textContent ?? '';
  bouton.classList.toggle('is-occupe', actif);
  bouton.disabled = actif;
  cible.textContent = actif ? texte : bouton.dataset.libelle;
  bouton.closest('form')?.setAttribute('aria-busy', String(actif));
}

export function reussi(bouton: HTMLButtonElement | null, texte: string): void {
  if (!bouton) return;
  bouton.classList.remove('is-occupe');
  bouton.classList.add('is-reussi');
  libelle(bouton, texte);
}

export function retablir(bouton: HTMLButtonElement | null): void {
  if (!bouton) return;
  bouton.classList.remove('is-occupe', 'is-reussi');
  bouton.disabled = false;
  if (bouton.dataset.libelle) libelle(bouton, bouton.dataset.libelle);
}

/** Code à six chiffres (vérification en deux étapes) : un seul champ, six cases affichées. */
export function codeSixChiffres(
  zone: HTMLElement,
  surComplet?: () => void,
): { vider(): void; rendre(): void } {
  const input = $<HTMLInputElement>('input', zone)!;
  const cases = $$('.otp-cases > span', zone);
  let avant = '';
  function rendre(): void {
    const valeur = input.value;
    const actif = document.activeElement === input;
    cases.forEach((c, i) => {
      c.textContent = valeur[i] ?? '';
      c.classList.toggle('is-rempli', Boolean(valeur[i]));
      c.classList.toggle('is-actif', actif && i === Math.min(valeur.length, 5));
      if (valeur[i] && !avant[i] && animations.completes())
        c.animate(
          [
            { transform: 'scale(0.82)', opacity: 0.4 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 220, easing: EASE_EMPH },
        );
    });
    avant = valeur;
  }
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    erreur(input);
    rendre();
    if (input.value.length === 6) surComplet?.();
  });
  const auBout = () =>
    requestAnimationFrame(() => {
      const n = input.value.length;
      try {
        input.setSelectionRange(n, n);
      } catch {
        // Champ non textuel.
      }
      rendre();
    });
  input.addEventListener('focus', auBout);
  input.addEventListener('click', auBout);
  input.addEventListener('keyup', rendre);
  input.addEventListener('blur', rendre);
  return {
    vider() {
      input.value = '';
      rendre();
    },
    rendre,
  };
}

/* Adresse e-mail : format (même règle que l'API) et faute de frappe dans le domaine. */

export function messageEmail(valeur: string): string {
  const resultat = champEmail.safeParse(valeur);
  return resultat.success ? '' : (resultat.error.issues[0]?.message ?? '');
}

const DOMAINES = [
  'gmail.com',
  'yahoo.fr',
  'yahoo.com',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'outlook.fr',
  'live.fr',
  'icloud.com',
  'orange.fr',
  'free.fr',
  'laposte.net',
  'proton.me',
];

const MESSAGERIES: { motif: RegExp; nom: string; lien: string }[] = [
  { motif: /@(gmail|googlemail)\./, nom: 'Gmail', lien: 'https://mail.google.com/' },
  { motif: /@(outlook|hotmail|live)\./, nom: 'Outlook', lien: 'https://outlook.live.com/mail/' },
  { motif: /@yahoo\./, nom: 'Yahoo Mail', lien: 'https://mail.yahoo.com/' },
  { motif: /@proton\./, nom: 'Proton Mail', lien: 'https://mail.proton.me/' },
];

/** Bouton « Ouvrir Gmail » (ou Outlook…) pour une adresse connue, sinon rien. */
export function boutonMessagerie(email: string): string {
  const messagerie = MESSAGERIES.find((m) => m.motif.test(email.toLowerCase()));
  if (!messagerie) return '';
  return `<a class="action action-principale" href="${messagerie.lien}" target="_blank" rel="noopener noreferrer"><span class="action-libelle">${t(`Ouvrir ${messagerie.nom}`)}</span>${icon('external')}<span class="sr-only">(nouvel onglet)</span></a>`;
}

function distance(a: string, b: string): number {
  const ligne = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let precedent = ligne[0]!;
    ligne[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const garde = ligne[j]!;
      ligne[j] = Math.min(
        ligne[j]! + 1,
        ligne[j - 1]! + 1,
        precedent + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      precedent = garde;
    }
  }
  return ligne[b.length]!;
}

/** « gmial.com » → « gmail.com » ; jamais sur une extension nationale valide (orange.sn reste orange.sn). */
export function suggestionEmail(valeur: string): string | null {
  const m = /^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/i.exec(valeur.trim());
  if (!m) return null;
  const domaine = m[2]!.toLowerCase();
  if (DOMAINES.includes(domaine)) return null;
  const [nom = '', ...reste] = domaine.split('.');
  const fin = reste.join('.');
  let meilleur: string | null = null;
  let score = 3;
  for (const d of DOMAINES) {
    const [dNom = '', ...dReste] = d.split('.');
    const dFin = dReste.join('.');
    const s =
      fin === dFin
        ? distance(nom, dNom)
        : nom === dNom && distance(fin, dFin) === 1 && fin.length === dFin.length
          ? 1
          : 3;
    if (s > 0 && s < score) {
      score = s;
      meilleur = d;
    }
  }
  return meilleur ? `${m[1]}@${meilleur}` : null;
}

export function surveillerEmail(input: Champ, surChange?: () => void): void {
  const note = document.getElementById(`${input.id}-suggestion`);
  input.addEventListener('input', () => {
    erreur(input);
    if (note) note.hidden = true;
    surChange?.();
  });
  if (!note) return;
  input.addEventListener('blur', () => {
    const proposition = suggestionEmail(input.value);
    note.hidden = !proposition;
    note.innerHTML = proposition
      ? `${icon('info')}<span>${t('Vouliez-vous écrire')} <button type="button" class="lien" data-corriger="${esc(proposition)}">${t(proposition)}</button> ?</span>`
      : '';
  });
  note.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as Element).closest<HTMLElement>('[data-corriger]');
    if (!bouton) return;
    input.value = bouton.dataset.corriger ?? '';
    note.hidden = true;
    erreur(input);
    surChange?.();
    input.focus();
  });
}

/* Mot de passe : affichage, majuscules verrouillées et qualité (RG-04). */

const OEIL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="oeil-barre" pathLength="1" d="m4 4 16 16"/></svg>';

function voir(bouton: HTMLElement, input: Champ, visible: boolean): void {
  input.type = visible ? 'text' : 'password';
  bouton.setAttribute('aria-pressed', String(visible));
  bouton.dataset.objet ??= (
    bouton.getAttribute('aria-label') ?? 'Afficher le mot de passe'
  ).replace(/^(Afficher|Masquer) /, '');
  bouton.setAttribute('aria-label', `${visible ? 'Masquer' : 'Afficher'} ${bouton.dataset.objet}`);
}

export function motDePasse(zone: ParentNode = document): void {
  for (const bloc of $$('[data-mdp]', zone)) {
    const input = $<Champ>('input', bloc);
    const bouton = $('[data-voir]', bloc);
    if (!input || !bouton) continue;
    const maj = document.getElementById(`${input.id}-maj`);
    bouton.innerHTML = OEIL;
    bouton.addEventListener('click', () => {
      const debut = input.selectionStart;
      const fin = input.selectionEnd;
      voir(bouton, input, input.type === 'password');
      input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(debut, fin);
      } catch {
        // Sélection non prise en charge par ce type de champ.
      }
    });
    const verifierMaj = (evenement: KeyboardEvent) => {
      if (maj && evenement.getModifierState) maj.hidden = !evenement.getModifierState('CapsLock');
    };
    input.addEventListener('keydown', verifierMaj);
    input.addEventListener('keyup', verifierMaj);
    input.addEventListener('blur', () => {
      if (maj) maj.hidden = true;
    });
  }
}

export function cacherMotsDePasse(zone: ParentNode = document): void {
  for (const bloc of $$('[data-mdp]', zone)) {
    const input = $<Champ>('input', bloc);
    const bouton = $('[data-voir]', bloc);
    if (input && bouton) voir(bouton, input, false);
  }
}

export interface Jauge {
  maj(): EvaluationMotDePasse;
  resultat(): EvaluationMotDePasse;
}

/** Jauge en quatre segments : trois pour atteindre 12 caractères, le quatrième à 16. */
export function jauge(input: Champ, identite: () => { pseudo?: string; email?: string }): Jauge {
  const champ = input.closest('.champ')!;
  const barre = $('[data-force]', champ)!;
  const aideEl = $('[data-aide-mdp]', champ)!;
  const annonce = $('[data-annonce]', champ);
  const AIDE = aideEl.textContent ?? '';
  let precedent = 'vide';
  const evaluer = () => evaluerMotDePasse(input.value, identite());
  function maj(): EvaluationMotDePasse {
    const r = evaluer();
    const segments = {
      vide: 0,
      court: Math.min(2, Math.floor(r.progression * 3)),
      valide: 3,
      solide: 4,
      compromis: 4,
      personnel: 4,
    }[r.etat];
    barre.dataset.etat = r.etat;
    barre.dataset.n = String(segments);
    aideEl.className = `message force-texte${['valide', 'solide'].includes(r.etat) ? ' is-ok' : ''}`;
    if (r.etat === 'vide') aideEl.textContent = AIDE;
    else if (r.etat === 'court')
      aideEl.textContent = typo(`Encore ${pluriel(r.reste ?? 0, 'caractère', 'caractères')}`);
    else if (r.etat === 'valide') aideEl.textContent = 'Valide';
    else if (r.etat === 'solide') aideEl.textContent = 'Solide';
    aideEl.hidden = ['compromis', 'personnel'].includes(r.etat);
    if (r.message) erreur(input, r.message);
    else if (
      ['compromis', 'personnel'].includes(precedent) ||
      input.getAttribute('aria-invalid') === 'true'
    )
      erreur(input);
    if (r.etat !== precedent && ['valide', 'solide'].includes(r.etat) && annonce)
      annonce.textContent = r.etat === 'solide' ? 'Mot de passe solide.' : 'Mot de passe valide.';
    precedent = r.etat;
    return r;
  }
  input.addEventListener('input', maj);
  return { maj, resultat: evaluer };
}

/** Message du champ mot de passe avant l'envoi (RG-04). */
export function messageMotDePasse(r: EvaluationMotDePasse): string {
  if (r.etat === 'vide') return 'Choisissez un mot de passe.';
  if (r.etat === 'court')
    return `Ajoutez encore ${pluriel(r.reste ?? 0, 'caractère', 'caractères')} : 12 au minimum.`;
  return r.message ?? '';
}

/* Documents en vigueur : fenêtre rendue par le serveur (DocumentsDialogue.astro). */

const ORDRE_DOCUMENTS = ['cgu', 'confidentialite', 'charte'];

function documents(cle: string): void {
  const fenetre = $<HTMLDialogElement>('[data-documents]');
  if (!fenetre) return;
  const choisir = (id: string, focus = false) => {
    for (const onglet of $$<HTMLElement>('[data-doc]', fenetre)) {
      const actif = onglet.dataset.doc === id;
      onglet.setAttribute('aria-selected', String(actif));
      onglet.tabIndex = actif ? 0 : -1;
      if (actif && focus) onglet.focus();
    }
    for (const section of $$<HTMLElement>('.document', fenetre))
      section.hidden = section.id !== `doc-${id}`;
  };
  if (!fenetre.dataset.pret) {
    fenetre.dataset.pret = '';
    fenetre.addEventListener('click', (evenement) => {
      const cible = evenement.target as Element;
      if (cible === fenetre || cible.closest('[data-fermer]')) fenetre.close();
    });
    for (const onglet of $$<HTMLElement>('[data-doc]', fenetre))
      onglet.addEventListener('click', () => choisir(onglet.dataset.doc ?? 'cgu'));
    $('.onglets', fenetre)?.addEventListener('keydown', (evenement) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evenement.key)) return;
      evenement.preventDefault();
      const i = ORDRE_DOCUMENTS.indexOf((document.activeElement as HTMLElement)?.dataset.doc ?? '');
      const n =
        evenement.key === 'Home'
          ? 0
          : evenement.key === 'End'
            ? ORDRE_DOCUMENTS.length - 1
            : (i + (evenement.key === 'ArrowRight' ? 1 : -1) + ORDRE_DOCUMENTS.length) %
              ORDRE_DOCUMENTS.length;
      choisir(ORDRE_DOCUMENTS[n] ?? 'cgu', true);
    });
  }
  const id = ORDRE_DOCUMENTS.includes(cle) ? cle : 'cgu';
  choisir(id);
  if (!fenetre.open) fenetre.showModal();
  $<HTMLElement>(`[data-doc="${id}"]`, fenetre)?.focus();
}

/** Liens vers les documents, où qu'ils soient dans la page : la fenêtre s'ouvre à la place de la page. */
document.addEventListener('click', (evenement) => {
  const lien = (evenement.target as Element).closest<HTMLElement>('[data-document]');
  if (!lien) return;
  evenement.preventDefault();
  documents(lien.dataset.document ?? 'cgu');
});

/** Aide propre à la page : une liste de questions et de réponses. `action` est du HTML déjà échappé. */
export function aide(questions: [string, string][], action = ''): HTMLDialogElement {
  let fenetre = $<HTMLDialogElement>('[data-aide-dialogue]');
  if (!fenetre) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog class="dialogue" aria-labelledby="aide-titre" data-aide-dialogue></dialog>',
    );
    fenetre = $<HTMLDialogElement>('[data-aide-dialogue]')!;
    const el = fenetre;
    el.addEventListener('click', (evenement) => {
      const cible = evenement.target as Element;
      if (cible === el || cible.closest('[data-fermer]')) el.close();
    });
  }
  fenetre.innerHTML = `<div class="dialogue-tete"><h2 id="aide-titre">Aide</h2><button class="icon-btn" type="button" aria-label="Fermer" data-fermer>${icon('close', '')}</button></div>
    <div class="aide"><dl>${questions.map(([q, r]) => `<dt>${t(q)}</dt><dd>${t(r)}</dd>`).join('')}</dl>${action}</div>`;
  fenetre.showModal();
  return fenetre;
}

/* Délais -------------------------------------------------------------------- */

/** Compte à rebours d'une seconde à l'autre ; renvoie la fonction qui l'arrête. */
export function compte(
  secondes: number,
  surTic: (reste: number) => void,
  surFin: () => void,
): () => void {
  let reste = secondes;
  surTic(reste);
  const id = setInterval(() => {
    reste -= 1;
    if (reste <= 0) {
      clearInterval(id);
      surFin();
    } else surTic(reste);
  }, 1000);
  return () => clearInterval(id);
}

/** Entrée de la page : le cadre monte depuis le bas de l'écran, puis son contenu. */
export function demarrer(): void {
  const carte = $('[data-carte]');
  const niveau = mouvement();
  if (!carte || niveau === 'none') return;
  carte.animate(
    niveau === 'full'
      ? [{ transform: 'translateY(calc(100% + 48px))' }, { transform: 'none' }]
      : [{ opacity: 0 }, { opacity: 1 }],
    {
      duration: niveau === 'full' ? 1050 : 260,
      delay: niveau === 'full' ? 220 : 0,
      easing: EASE_EMPH,
      fill: 'backwards',
    },
  );
  $('.auth-tete')?.animate(
    [
      { opacity: 0, transform: 'translateY(-8px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 700, delay: 380, easing: EASE_EMPH, fill: 'backwards' },
  );
}

/** Moment clé de la réussite : délai avant de quitter la page, selon le niveau d'animation. */
export const delaiDepart = (): number =>
  ({ full: 2300, reduced: 1100, none: 500 })[mouvement()] ?? 1100;
