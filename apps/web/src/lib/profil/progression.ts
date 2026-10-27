import {
  NIVEAUX,
  type DetailReputationApi,
  type ProfilApi,
  type ProfilPriveApi,
} from '@vysora/shared';
import { ROUTES } from '../navigation';
import { esc, fmt, t, typo } from '../texte';
import { dateLabel, enTete, hexagone, icone, pct } from './elements';

/* « Votre progression » (prototype/profil.js : renderProgression, serie, dessinerCourbe), visible du
   seul propriétaire (RG-88). */

/** Sources des points (prototype : P.sources), dans l'ordre des couleurs de données de la charte. */
export const SOURCES = ['Créations', 'Entraide', 'Apprentissage', 'Défis'] as const;
const COULEURS = ['#2563EB', '#EB6834', '#1BAF7A', '#EDA100'];
const ORDRE_MOTIFS = [
  'VOTE_UTILE_RECU',
  'REPRODUCTION_REUSSIE_RECUE',
  'REPONSE_ACCEPTEE',
  'VOTE_TESTE_RECU',
  'ACCEPTATION_REPONSE',
  'CAS_VALIDE',
  'CAS_REUSSI',
  'REPRODUCTION_DECLAREE',
  'PARTICIPATION_DEFI',
  'PODIUM_DEFI',
  'AJUSTEMENT_MODERATION',
];

/** Libellé (singulier, pluriel) et source d'un motif de points (prototype : detail). */
export function libelleDetail(d: DetailReputationApi): {
  un: string;
  plusieurs: string;
  source: number | null;
} {
  switch (d.motif) {
    case 'VOTE_UTILE_RECU': {
      const sur = {
        CREATION: ['une création', 'vos créations'],
        MESSAGE: ['une réponse', 'vos réponses'],
        SUJET: ['un sujet', 'vos sujets'],
        CAS_BON_REFLEXE: ['un cas Bon réflexe', 'vos cas Bon réflexe'],
      }[d.typeContenu as 'CREATION' | 'MESSAGE' | 'SUJET' | 'CAS_BON_REFLEXE'];
      return {
        un: sur ? `Vote « Utile » reçu sur ${sur[0]}` : 'Vote « Utile » reçu',
        plusieurs: sur ? `Votes « Utile » reçus sur ${sur[1]}` : 'Votes « Utile » reçus',
        source: d.typeContenu && d.typeContenu !== 'CREATION' ? 1 : 0,
      };
    }
    case 'REPRODUCTION_REUSSIE_RECUE':
      return {
        un: 'Reproduction réussie de votre création',
        plusieurs: 'Reproductions réussies de vos créations',
        source: 0,
      };
    case 'REPONSE_ACCEPTEE':
      return { un: 'Réponse acceptée', plusieurs: 'Réponses acceptées', source: 1 };
    case 'VOTE_TESTE_RECU':
      return {
        un: 'Vote « Testé, ça marche » reçu',
        plusieurs: 'Votes « Testé, ça marche » reçus',
        source: 1,
      };
    case 'ACCEPTATION_REPONSE':
      return {
        un: 'Réponse acceptée à votre question',
        plusieurs: 'Réponses acceptées à vos questions',
        source: 1,
      };
    case 'CAS_VALIDE':
      return { un: 'Cas Bon réflexe validé', plusieurs: 'Cas Bon réflexe validés', source: 1 };
    case 'CAS_REUSSI':
      return { un: 'Cas Bon réflexe réussi', plusieurs: 'Cas Bon réflexe réussis', source: 2 };
    case 'REPRODUCTION_DECLAREE':
      return { un: 'Reproduction déclarée', plusieurs: 'Reproductions déclarées', source: 2 };
    case 'PARTICIPATION_DEFI':
      return { un: 'Participation à un défi', plusieurs: 'Participations à un défi', source: 3 };
    case 'PODIUM_DEFI': {
      const place = { 50: 'Première', 30: 'Deuxième', 20: 'Troisième' }[d.pointsUnitaires ?? 0];
      return place
        ? { un: `${place} place d’un défi`, plusieurs: `${place}s places d’un défi`, source: 3 }
        : { un: 'Podium d’un défi', plusieurs: 'Podiums de défis', source: 3 };
    }
    case 'AJUSTEMENT_MODERATION':
      return { un: 'Ajustement de l’équipe', plusieurs: 'Ajustements de l’équipe', source: null };
  }
}

/** Ce que débloque le niveau suivant (prototype : deverrouille). */
function deverrouille(code: string): string {
  const expert = NIVEAUX.find((n) => n.code === 'expert')?.seuilPoints ?? 1500;
  return (
    {
      curieux:
        'Au niveau Apprenti, vous publiez jusqu’à 10 créations et 10 sujets par jour, et vos signalements comptent pour le masquage automatique.',
      apprenti: `Au niveau Expert, à ${fmt(expert)} points, vous publiez sans limite et vous pouvez proposer des cas Bon réflexe.`,
      artisan: `Au niveau Expert, à ${fmt(expert)} points, vous publiez sans limite et vous pouvez proposer des cas Bon réflexe.`,
      expert:
        'Vous publiez sans limite et vous pouvez proposer des cas Bon réflexe. Le niveau Maître est le plus élevé de Vysora.',
      maitre: 'Vous avez atteint le niveau le plus élevé de Vysora.',
    }[code] ?? ''
  );
}

/** « Votre progression » (prototype : renderProgression). */
export function progressionHTML(p: ProfilApi, prive: ProfilPriveApi): string {
  const points = prive.reputation.total;
  const i = Math.max(
    0,
    NIVEAUX.findIndex((n) => n.code === p.membre.niveau.code),
  );
  const actuel = NIVEAUX[i];
  const suivant = NIVEAUX[i + 1];
  const avance =
    suivant && actuel
      ? (points - actuel.seuilPoints) / (suivant.seuilPoints - actuel.seuilPoints)
      : 1;
  const position = suivant ? (i + Math.min(1, Math.max(0, avance))) / (NIVEAUX.length - 1) : 1;
  const details = prive.reputation.details
    .map((d) => ({ d, ...libelleDetail(d) }))
    .toSorted(
      (a, b) =>
        (a.source ?? 9) - (b.source ?? 9) ||
        ORDRE_MOTIFS.indexOf(a.d.motif) - ORDRE_MOTIFS.indexOf(b.d.motif) ||
        (b.d.pointsUnitaires ?? 0) - (a.d.pointsUnitaires ?? 0),
    );
  const parSource = SOURCES.map((nom, s) => ({
    nom,
    s,
    points: details.filter((x) => x.source === s).reduce((n, x) => n + x.d.points, 0),
  }));
  const somme = parSource.reduce((n, x) => n + Math.max(0, x.points), 0) || 1;
  const a = prive.apprentissage;
  const limites = prive.limites;
  const role = p.membre.role;
  const lignesLimites = limites
    ? (
        [
          ['Créations', limites.creations],
          ['Sujets', limites.sujets],
          ['Réponses et commentaires', limites.reponses],
        ] as const
      )
        .map(
          ([libelle, l]) =>
            `<li><span>${t(libelle)}</span><b>${t(`${fmt(l.utilisees)} sur ${fmt(l.limite)}`)}</b><span class="pf-jauge" role="img" aria-label="${t(`${libelle} : ${l.utilisees} sur ${l.limite}`)}"><i style="--v:${Math.min(1, l.utilisees / l.limite)}"></i></span></li>`,
        )
        .join('')
    : '';
  const semaines = prive.reputation.parSemaine;
  return `<div class="pf-prive">
      ${enTete('pf-t-progression', 'Visible par vous uniquement', 'lock', 'Votre progression', '', `<a class="link-arrow" href="${ROUTES.classements}">Voir les classements${icone('arrow', 'icon-sm')}</a>`)}
      <div class="pf-prog-grille">
        <div class="pf-prog-main">
          <div class="pf-rep">
            <p class="pf-rep-total"><span class="pf-rep-valeur" data-pf-compter="${points}">${t(fmt(points))}</span><span>points de réputation</span></p>
            <p class="pf-rep-semaine">${icone('trend-up', 'icon-sm')}<b>${t(`${prive.reputation.semaine >= 0 ? '+' : ''}${fmt(prive.reputation.semaine)}`)}</b> cette semaine</p>
          </div>
          <div class="pf-courbe" data-pf-courbe tabindex="0" role="group" aria-roledescription="graphique" aria-label="${t(`Réputation par semaine, ${semaines.length > 1 ? `${semaines.length} dernières semaines` : 'semaine en cours'}. Utilisez les flèches pour parcourir les semaines.`)}" aria-describedby="pf-courbe-table">
            <svg class="pf-courbe-svg" data-pf-svg aria-hidden="true"></svg>
            <div class="pf-bulle" data-pf-bulle hidden></div>
          </div>
          <p class="sr-only" aria-live="polite" data-pf-courbe-annonce></p>
          <table class="sr-only" id="pf-courbe-table"><caption>Réputation à la fin de chaque semaine</caption><thead><tr><th scope="col">Semaine du</th><th scope="col">Points</th><th scope="col">Gagnés</th></tr></thead><tbody>${semaines.map((s) => `<tr><th scope="row">${t(dateLabel(s.semaine))}</th><td>${t(fmt(s.valeur))}</td><td>${t(`${s.gain >= 0 ? '+' : ''}${fmt(s.gain)}`)}</td></tr>`).join('')}</tbody></table>

          <div class="pf-sources">
            <h3>D’où viennent vos points</h3>
            <div class="pf-barre" aria-hidden="true">${parSource
              .filter((x) => x.points > 0)
              .map(
                (x) =>
                  `<i style="--w:${x.points / somme};--c:${COULEURS[x.s]}" data-pf-source="${x.s}"></i>`,
              )
              .join('')}</div>
            <ul class="pf-legende">${parSource.map((x) => `<li data-pf-source="${x.s}"><span class="pf-puce" style="--c:${COULEURS[x.s]}" aria-hidden="true"></span><span>${t(x.nom)}</span><b>${t(fmt(x.points))}</b><small>${t(`${pct(Math.max(0, x.points), somme)} %`)}</small></li>`).join('')}</ul>
            ${
              details.length
                ? `<details class="pf-detail">
              <summary>${icone('chevron-down', 'icon-sm')}Détail des points</summary>
              <ul>${details.map((x) => `<li><span class="pf-puce" style="--c:${x.source === null ? 'var(--neutral-400)' : COULEURS[x.source]}" aria-hidden="true"></span><span>${t(x.d.nombre > 1 ? x.plusieurs : x.un)}${x.d.nombre > 1 ? ` <small>× ${t(fmt(x.d.nombre))}</small>` : ''}</span><b>${t(`${x.d.points >= 0 ? '+' : ''}${fmt(x.d.points)}`)}</b></li>`).join('')}</ul>
            </details>`
                : ''
            }
          </div>
        </div>

        <div class="pf-prog-cote">
          <div class="pf-bloc">
            <h3>Niveau</h3>
            <ol class="pf-paliers" style="--p:${position}" aria-label="Niveaux de réputation">
              ${NIVEAUX.map((n, j) => `<li class="${j < i ? 'is-passe' : j === i ? 'is-actuel' : ''}"${j === i ? ' aria-current="step"' : ''}>${hexagone()}<b>${t(n.libelle)}</b><small>${t(fmt(n.seuilPoints))}</small></li>`).join('')}
            </ol>
            <p class="pf-palier-texte">${suivant ? `<b>${t(`${fmt(suivant.seuilPoints - points)} points avant ${suivant.libelle}`)}</b>` : `<b>${t(`${p.membre.niveau.libelle}, niveau le plus élevé`)}</b>`}<span>${t(deverrouille(p.membre.niveau.code))}</span></p>
          </div>
          <div class="pf-bloc">
            <h3>Apprentissage</h3>
            <dl class="pf-appr">
              <div><dt>Cas Bon réflexe répondus</dt><dd>${t(fmt(a.casRepondus))}</dd></div>
              <div><dt>Cas réussis</dt><dd>${t(fmt(a.casReussis))} <small>${t(`${pct(a.casReussis, a.casRepondus)} %`)}</small></dd></div>
              <div><dt>Reproductions déclarées</dt><dd>${t(fmt(a.reproductionsDeclarees))}</dd></div>
            </dl>
            <a class="link-arrow" href="${ROUTES.bonReflexe}">Répondre à un cas${icone('arrow', 'icon-sm')}</a>
          </div>
          <div class="pf-bloc">
            <h3>Publication sur 24 heures</h3>
            ${
              limites
                ? `<ul class="pf-limites">${lignesLimites}</ul>`
                : `<p class="pf-sans-limite">${icone('check-circle', 'icon-sm')}${t(role === 'ADMINISTRATEUR' ? 'Aucune limite pour l’administration.' : role === 'MODERATEUR' ? 'Aucune limite pour la modération.' : 'Aucune limite à votre niveau.')}</p>`
            }
          </div>
        </div>
      </div>
    </div>`;
}

/* Courbe de réputation (prototype : dessinerCourbe) ------------------------------------------------ */

export interface PointCourbe {
  semaine: string;
  valeur: number;
  gain: number;
}

/** Graduation de l'axe des points (prototype : arrondiHaut). */
export function arrondiHaut(v: number): { max: number; pas: number } {
  const pas =
    [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].find((x) => x >= v / 4) ?? 5000;
  return { max: Math.max(pas, Math.ceil(v / pas) * pas), pas };
}

const compact = (v: number): string =>
  v >= 1000 ? `${fmt(Math.round(v / 100) / 10).replace(/,0$/, '')} k` : fmt(v);

/** Courbe : fin de chaque semaine, la semaine en cours en pointillé, seuil du niveau suivant et
    passages de niveau. Renvoie le SVG et la géométrie pour le réticule. */
export function courbe(points: PointCourbe[], largeurBoite: number, total: number) {
  const largeur = Math.max(280, largeurBoite);
  const hauteur = largeur < 520 ? 200 : 232;
  const m = { g: 46, d: 18, h: 26, b: 30 };
  const suivant = NIVEAUX.find((n) => n.seuilPoints > total);
  const plafond = Math.max(...points.map((p) => p.valeur), suivant?.seuilPoints ?? 0, 1) * 1.06;
  const { max, pas } = arrondiHaut(plafond);
  const lw = largeur - m.g - m.d;
  const lh = hauteur - m.h - m.b;
  const n = points.length;
  const x = (i: number) => m.g + (n === 1 ? lw / 2 : (i * lw) / (n - 1));
  const y = (v: number) => m.h + lh - (v / max) * lh;
  const graduations: number[] = [];
  for (let v = 0; v <= max; v += pas) graduations.push(v);
  const chemin = (liste: PointCourbe[]) =>
    liste.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.valeur).toFixed(1)}`).join(' ');
  const ligne = chemin(points);
  const pleine = n > 1 ? chemin(points.slice(0, -1)) : '';
  const avantDernier = points[n - 2];
  const dernier = points[n - 1];
  const cours =
    n > 1 && avantDernier && dernier
      ? `M${x(n - 2).toFixed(1)} ${y(avantDernier.valeur).toFixed(1)} L${x(n - 1).toFixed(1)} ${y(dernier.valeur).toFixed(1)}`
      : '';
  const aire =
    n > 1 ? `${ligne} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : '';
  const passages: { i: number; nom: string }[] = [];
  let avant = points[0] ? points[0].valeur - points[0].gain : 0;
  points.forEach((p, i) => {
    for (const niveau of NIVEAUX)
      if (niveau.seuilPoints > 0 && avant < niveau.seuilPoints && p.valeur >= niveau.seuilPoints)
        passages.push({ i, nom: niveau.libelle });
    avant = p.valeur;
  });
  /* Dates de l'axe : en partant de la semaine en cours, une étiquette n'est gardée que si elle ne
     touche pas la précédente. */
  const libelleX = (p: PointCourbe, i: number) =>
    i === n - 1 ? 'Cette semaine' : dateLabel(p.semaine, false);
  const ancreX = (i: number) =>
    n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle';
  const gardees = new Set<number>();
  let bordGauche = Infinity;
  for (let i = n - 1; i >= 0; i -= 1) {
    const p = points[i];
    if (!p) continue;
    const w = libelleX(p, i).length * 6.4;
    const debut = ancreX(i) === 'end' ? x(i) - w : ancreX(i) === 'start' ? x(i) : x(i) - w / 2;
    if (debut + w + 14 <= bordGauche) {
      gardees.add(i);
      bordGauche = debut;
    }
  }
  const svg = `
      <g class="pf-c-grille">${graduations.map((v) => `<line x1="${m.g}" x2="${largeur - m.d}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.g - 10}" y="${y(v) + 4}" text-anchor="end">${typo(compact(v))}</text>`).join('')}</g>
      ${suivant ? `<g class="pf-c-seuil"><line x1="${m.g}" x2="${largeur - m.d}" y1="${y(suivant.seuilPoints)}" y2="${y(suivant.seuilPoints)}"/><text x="${largeur - m.d}" y="${y(suivant.seuilPoints) - 7}" text-anchor="end">${esc(typo(`${suivant.libelle} · ${fmt(suivant.seuilPoints)} points`))}</text></g>` : ''}
      <g class="pf-c-x">${points.map((p, i) => (gardees.has(i) ? `<text x="${x(i)}" y="${hauteur - 8}" text-anchor="${ancreX(i)}">${esc(libelleX(p, i))}</text>` : '')).join('')}</g>
      ${aire ? `<path class="pf-c-aire" d="${aire}"/>` : ''}
      ${pleine ? `<path class="pf-c-ligne" d="${pleine}" pathLength="1"/>` : ''}
      ${cours ? `<path class="pf-c-cours" d="${cours}"/>` : ''}
      <g class="pf-c-points">${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.valeur)}" r="${i === n - 1 ? 5 : 3.5}" style="--i:${i}"/>`).join('')}</g>
      <g class="pf-c-passages">${passages.map((q) => `<g style="--i:${q.i}"><circle cx="${x(q.i)}" cy="${y(points[q.i]?.valeur ?? 0)}" r="7"/><text x="${x(q.i)}" y="${y(points[q.i]?.valeur ?? 0) - 14}" text-anchor="${q.i === 0 ? 'start' : 'middle'}">${esc(q.nom)}</text></g>`).join('')}</g>
      <line class="pf-c-reticule" data-pf-reticule x1="0" x2="0" y1="${m.h - 6}" y2="${m.h + lh}" visibility="hidden"/>
      <circle class="pf-c-focus" data-pf-focus r="6" cx="0" cy="0" visibility="hidden"/>`;
  return { svg, largeur, hauteur, x, y };
}

/** Bulle d'une semaine (prototype : montrerPoint). */
export const bulleSemaine = (p: PointCourbe, enCours: boolean): string =>
  `<b>${t(`${fmt(p.valeur)} points`)}</b><span>${t(`${p.gain >= 0 ? '+' : ''}${fmt(p.gain)} ${enCours ? 'cette semaine, en cours' : 'cette semaine-là'}`)}</span><small>${t(`Semaine du ${dateLabel(p.semaine)}`)}</small>`;
