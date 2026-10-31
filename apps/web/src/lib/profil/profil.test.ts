import type { ProfilApi, ProfilPriveApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import type { ContexteProfil } from './elements';
import { arrondiHaut, courbe, libelleDetail, progressionHTML } from './progression';
import {
  aproposHTML,
  badgesSectionHTML,
  chiffresHTML,
  contributionsHTML,
  creationsHTML,
  etapesGuide,
  heroHTML,
} from './sections';

const NBSP = ' ';
const NNBSP = ' ';
const maintenant = new Date('2026-10-27T15:00:00Z');
const claude = {
  id: 2,
  nom: 'Claude',
  slug: 'claude',
  logo: 'claude-color',
  logoMonochrome: false,
};
const lea = {
  id: 2,
  pseudo: 'lea-martin',
  nom: 'Léa Martin',
  avatar: null,
  niveau: { code: 'apprenti' as const, libelle: 'Apprenti' },
  reputation: 60,
};

const creation = (id: number, valeurs: Partial<ProfilApi['creations'][number]> = {}) => ({
  id,
  slug: `creation-${id}`,
  type: 'ITERATION' as const,
  titre: `Création ${id}`,
  categorie: { libelle: 'Application web', slug: 'application-web', icone: 'browser' },
  couverture: null,
  resultat: null,
  apercu: 'Crée la page de réservation.',
  outils: [{ outil: claude, modeles: ['Sonnet 4.5'] }],
  utiles: id,
  reproductions: 0,
  reussies: 0,
  tauxReussite: null,
  moments: 1,
  datePublication: `2026-10-${String(10 + id).padStart(2, '0')}T10:00:00Z`,
  ...valeurs,
});

const profil = (valeurs: Partial<ProfilApi> = {}): ProfilApi => ({
  membre: {
    id: 51,
    pseudo: 'clarisse-mendy',
    nom: 'Clarisse Mendy',
    avatar: null,
    niveau: { code: 'apprenti', libelle: 'Apprenti' },
    reputation: 182,
    role: 'MEMBRE',
    biographie: 'Développeuse à Ziguinchor.',
    lien: 'https://clarisse.sn/',
    dateInscription: '2026-09-15T10:00:00Z',
  },
  statistiques: {
    creations: 3,
    utiles: 8,
    reproductions: 4,
    reussies: 3,
    tauxReussite: 75,
    reponsesAcceptees: 2,
    vues: 1284,
  },
  creations: [creation(1), creation(2, { type: 'UN_PROMPT' }), creation(3, { type: 'PROJET' })],
  contributions: [
    {
      genre: 'essai',
      date: '2026-10-20T10:00:00Z',
      resultat: 'PARTIEL',
      creation: { id: 9, slug: 'lettre', titre: 'Lettre de motivation' },
      auteur: lea,
      outil: { ...claude, id: 7, nom: 'Le Chat', slug: 'le-chat' },
      modele: 'Mistral Large 2',
    },
    {
      genre: 'reponse',
      date: '2026-10-19T10:00:00Z',
      acceptee: true,
      sujet: { id: 4, slug: 'creneau', titre: 'Comment éviter deux réservations ?' },
      auteur: lea,
      outil: claude,
    },
  ],
  badges: [],
  prive: null,
  ...valeurs,
});

const visiteur: ContexteProfil = { prive: false, apercu: false, maintenant };
const proprietaire: ContexteProfil = { prive: true, apercu: false, maintenant };

describe('En-tête et chiffres du profil (PROF-01)', () => {
  it('montre au propriétaire ses actions et les points avant le niveau suivant, pas au visiteur', () => {
    const p = profil();
    const prive = heroHTML(p, proprietaire);
    expect(prive).toContain('Modifier le profil');
    expect(prive).toContain('href="?vue=public"');
    expect(prive).toContain(`118${NBSP}points avant Artisan`);
    expect(prive).toContain('>clarisse.sn<');
    expect(prive).toContain('rel="noopener nofollow ugc"');
    const publique = heroHTML(p, visiteur);
    expect(publique).not.toContain('Modifier le profil');
    expect(publique).not.toContain('avant Artisan');
    expect(publique).toContain('Partager le profil');
    expect(publique).toContain('Membre depuis septembre 2026');
  });

  it('nomme le rôle de l’équipe et échappe la biographie', () => {
    const p = profil();
    p.membre.role = 'MODERATEUR';
    p.membre.biographie = '<script>alert(1)</script>';
    const html = heroHTML(p, visiteur);
    expect(html).toContain('Modération');
    expect(html).not.toContain('<script>');
  });

  it('donne le taux de succès à partir de 3 reproductions (RG-43)', () => {
    const html = chiffresHTML(profil());
    expect(html).toContain(`75${NBSP}% de succès`);
    expect(html).toContain(`1${NNBSP}284`);
    const peu = profil();
    peu.statistiques.tauxReussite = null;
    expect(chiffresHTML(peu)).not.toContain('de succès');
  });

  it('compte les étapes restantes de « Complétez votre profil »', () => {
    expect(
      etapesGuide(profil())
        .filter((e) => !e.fait)
        .map((e) => e.titre),
    ).toEqual(['Ajouter une photo', 'Déclarer un premier essai']);
  });
});

describe('Créations et contributions', () => {
  it('filtre par type et trie par votes « Utile »', () => {
    const p = profil();
    const html = creationsHTML(p, visiteur, {
      type: 'UN_PROMPT',
      tri: 'recentes',
      completes: false,
    });
    expect(html.match(/data-pf-carte=/g)).toHaveLength(1);
    expect(html).toContain('aria-pressed="true">');
    const tri = creationsHTML(p, visiteur, { type: 'toutes', tri: 'utiles', completes: false });
    expect([...tri.matchAll(/data-pf-carte="(\d+)"/g)].map((m) => m[1])).toEqual(['3', '2', '1']);
    expect(tri).toContain(`Publiée le 13 oct.`);
  });

  it('propose « Afficher N de plus » au-delà de six créations', () => {
    const p = profil({ creations: Array.from({ length: 8 }, (_, i) => creation(i + 1)) });
    const html = creationsHTML(p, visiteur, { type: 'toutes', tri: 'recentes', completes: false });
    expect(html.match(/data-pf-carte=/g)).toHaveLength(6);
    expect(html).toContain('Afficher 2 de plus');
  });

  it('annonce un profil sans création selon qui regarde', () => {
    const p = profil({ creations: [] });
    expect(
      creationsHTML(p, visiteur, { type: 'toutes', tri: 'recentes', completes: false }),
    ).toContain('Clarisse n’a pas encore publié de création');
    expect(
      creationsHTML(p, proprietaire, { type: 'toutes', tri: 'recentes', completes: false }),
    ).toContain('Publier une création');
  });

  it('présente les essais et les réponses avec leurs liens', () => {
    const html = contributionsHTML(profil(), visiteur, 'tout', false);
    expect(html).toContain('data-resultat="partiel"');
    expect(html).toContain('href="/creations/9-lettre"');
    expect(html).toContain('Réponse acceptée');
    expect(html).toContain('href="/forum/4-creneau"');
    expect(html).toContain('Question de Léa Martin');
    expect(
      contributionsHTML(profil(), visiteur, 'essai', false).match(/class="pf-act"/g),
    ).toHaveLength(1);
  });

  it('réunit les outils des créations et des essais dans « À propos »', () => {
    const html = aproposHTML(profil(), visiteur);
    expect(html).toContain('<b>Claude</b><small>Sonnet 4.5</small>');
    expect(html).toContain('<b>Le Chat</b><small>Mistral Large 2</small>');
    expect(html).toContain('Application web');
    expect(html).toContain('15 septembre 2026');
    expect(html).not.toContain('pf-confidentiel');
  });
});

describe('Progression (RG-88)', () => {
  it('range chaque motif de points dans sa source, au singulier ou au pluriel', () => {
    expect(
      libelleDetail({
        motif: 'VOTE_UTILE_RECU',
        typeContenu: 'MESSAGE',
        pointsUnitaires: null,
        nombre: 1,
        points: 5,
      }),
    ).toEqual({
      un: 'Vote « Utile » reçu sur une réponse',
      plusieurs: 'Votes « Utile » reçus sur vos réponses',
      source: 1,
    });
    expect(
      libelleDetail({
        motif: 'PODIUM_DEFI',
        typeContenu: null,
        pointsUnitaires: 20,
        nombre: 1,
        points: 20,
      }).un,
    ).toBe('Troisième place d’un défi');
    expect(
      libelleDetail({
        motif: 'CAS_REUSSI',
        typeContenu: null,
        pointsUnitaires: null,
        nombre: 3,
        points: 3,
      }).source,
    ).toBe(2);
  });

  it('détaille les points, les limites et le niveau suivant', () => {
    const html = progressionHTML(profil(), {
      reputation: {
        total: 182,
        semaine: 41,
        parSemaine: [{ semaine: '2026-10-26', valeur: 182, gain: 41 }],
        details: [
          { motif: 'CAS_REUSSI', typeContenu: null, pointsUnitaires: null, nombre: 42, points: 42 },
          {
            motif: 'VOTE_UTILE_RECU',
            typeContenu: 'CREATION',
            pointsUnitaires: null,
            nombre: 7,
            points: 70,
          },
        ],
      },
      apprentissage: { casRepondus: 58, casReussis: 42, reproductionsDeclarees: 9 },
      limites: {
        creations: { utilisees: 4, limite: 10 },
        sujets: { utilisees: 1, limite: 10 },
        reponses: { utilisees: 12, limite: 100 },
      },
      brouillons: { nombre: 0, dernier: null },
      prochainsBadges: [],
    });
    expect(html).toContain(
      `Votes «${NBSP}Utile${NBSP}» reçus sur vos créations <small>× 7</small>`,
    );
    expect(html).toContain(`4 sur 10`);
    expect(html).toContain(`118${NBSP}points avant Artisan`);
    expect(html).toContain(`72${NBSP}%`);
    expect(html).toContain('aria-current="step"');
  });

  it('gradue la courbe et nomme le passage d’un niveau', () => {
    expect(arrondiHaut(318)).toEqual({ max: 400, pas: 100 });
    const c = courbe(
      [
        { semaine: '2026-10-05', valeur: 40, gain: 28 },
        { semaine: '2026-10-12', valeur: 78, gain: 38 },
        { semaine: '2026-10-19', valeur: 141, gain: 63 },
      ],
      660,
      141,
    );
    expect(c.svg).toContain('>Apprenti<');
    expect(c.svg).toContain('Cette semaine');
    expect(c.svg).toContain(`Artisan · 300${NBSP}points`);
    expect(c.largeur).toBe(660);
  });
});

describe('Badges (F-74, PROF-02)', () => {
  const prive = (prochainsBadges: ProfilPriveApi['prochainsBadges']): ProfilPriveApi => ({
    reputation: { total: 182, semaine: 0, parSemaine: [], details: [] },
    apprentissage: { casRepondus: 58, casReussis: 42, reproductionsDeclarees: 9 },
    limites: null,
    brouillons: { nombre: 0, dernier: null },
    prochainsBadges,
  });
  const reproductible = {
    code: 'REPRODUCTIBLE',
    libelle: 'Reproductible',
    critere: 'Être reproduit avec succès par 5 membres',
    icone: 'repeat',
    ton: 'VERT' as const,
    valeur: 3,
    objectif: 5,
    unite: 'membres',
  };
  const participant = {
    ...reproductible,
    code: 'PARTICIPANT',
    libelle: 'Participant',
    critere: 'Participer à un défi clôturé',
    valeur: 0,
    objectif: 1,
    unite: 'défi clôturé',
  };
  const assidu = {
    code: 'ASSIDU',
    libelle: 'Assidu',
    critere: 'Répondre à 50 cas Bon réflexe',
    icone: 'history',
    ton: 'AMBRE' as const,
    date: '2026-10-09T10:00:00Z',
  };

  it('montre au seul propriétaire son avancement vers les prochains badges', () => {
    const p = profil({ badges: [assidu], prive: prive([reproductible, participant]) });
    const html = badgesSectionHTML(p, proprietaire);
    expect(html).toContain('Prochains badges <span>Visible par vous uniquement</span>');
    expect(html).toContain('class="emblem is-verrouille"');
    expect(html).toContain('aria-label="3 sur 5 membres"><i style="--v:0.6"></i>');
    expect(html).toContain('<small>0 sur 1 défi clôturé</small>');
    expect(badgesSectionHTML(p, visiteur)).not.toContain('pf-prochains');
    expect(badgesSectionHTML(p, { ...proprietaire, prive: false, apercu: true })).not.toContain(
      'pf-prochains',
    );
  });

  it('attend un premier badge ou un premier pas sur un profil encore vide', () => {
    const vide = profil({ prive: prive([{ ...participant }]) });
    expect(badgesSectionHTML(vide, proprietaire)).toContain('Aucun badge pour le moment');
    expect(badgesSectionHTML(vide, proprietaire)).not.toContain('pf-prochains');
    const entame = profil({ prive: prive([reproductible, participant]) });
    expect(badgesSectionHTML(entame, proprietaire)).toContain('pf-prochains');
  });
});
