import type { ProfilApi, ResultatReproduction } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  badge,
  contenu,
  notification,
  obtentionBadge,
  outil,
  reproduction,
  utilisateur,
} from '../src/db/schema/index.js';
import { BadgesService } from '../src/modules/progression/badges.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Badges (S-09, F-74, RG-86)', () => {
  let contexte: ApplicationDeTest;

  const badgesDe = async (id: number) =>
    (
      await contexte.db
        .select({ code: badge.code })
        .from(obtentionBadge)
        .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
        .where(eq(obtentionBadge.utilisateurId, id))
    ).map((b) => b.code);

  /** Essai d'un nouveau membre sur une création. */
  async function reproduire(n: number, creationId: number, resultat: ResultatReproduction) {
    const membre = await creerMembre(contexte, {
      pseudo: `membre-${n}`,
      email: `membre-${n}@example.com`,
    });
    const [claude] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.nom, 'Claude'));
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'REPRODUCTION', auteurId: membre.id })
      .returning({ id: contenu.id });
    if (!claude || !ligne) throw new Error('Essai non créé');
    await contexte.db.insert(reproduction).values({
      id: ligne.id,
      creationId,
      outilId: claude.id,
      resultat,
      retour: resultat === 'SUCCES' ? null : 'Le calendrier ne gérait pas les jours fériés.',
    });
    return membre;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
    await contexte.app.close();
  });

  it('attribue un badge dont le critère est rempli, une seule fois, et notifie le membre', async () => {
    const awa = await creerMembre(contexte);
    const banni = await creerMembre(contexte, {
      pseudo: 'compte-banni',
      email: 'banni@example.com',
      statutCompte: 'BANNI',
    });
    await creerCreation(contexte, awa.id);
    await creerCreation(contexte, banni.id);
    // Un brouillon ne compte pas.
    const brouillon = await creerMembre(contexte, {
      pseudo: 'lea-martin',
      email: 'lea@example.com',
    });
    await creerCreation(contexte, brouillon.id, { publiee: false });

    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(awa.id)).toEqual(['PREMIERE_CREATION']);
    expect(await badgesDe(banni.id)).toEqual([]);
    expect(await badgesDe(brouillon.id)).toEqual([]);
    const notifications = await contexte.db
      .select({ donnees: notification.donnees })
      .from(notification)
      .where(and(eq(notification.destinataireId, awa.id), eq(notification.type, 'BADGE_OBTENU')));
    expect(notifications).toEqual([{ donnees: { badge: 'PREMIERE_CREATION' } }]);

    // Rejouée, la tâche n'attribue ni ne notifie rien de plus ; le badge reste acquis.
    await contexte.db
      .update(utilisateur)
      .set({ nomAffiche: 'Awa' })
      .where(eq(utilisateur.id, awa.id));
    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(awa.id)).toEqual(['PREMIERE_CREATION']);
    expect(
      await contexte.db.$count(
        notification,
        and(eq(notification.destinataireId, awa.id), eq(notification.type, 'BADGE_OBTENU')),
      ),
    ).toBe(1);
  });

  it('mesure l’avancement vers les badges restants et le montre à son seul propriétaire (PROF-02)', async () => {
    const awa = await creerMembre(contexte);
    const creationId = await creerCreation(contexte, awa.id);
    // Trois membres réussissent sa création, un quatrième n'y parvient qu'en partie.
    const lea = await reproduire(1, creationId, 'SUCCES');
    await reproduire(2, creationId, 'SUCCES');
    await reproduire(3, creationId, 'SUCCES');
    await reproduire(4, creationId, 'PARTIEL');
    const badges = contexte.app.get(BadgesService);
    const avancement = async (id: number) =>
      (await badges.prochains(id)).map((b) => [b.code, b.valeur, b.objectif]);

    // Objectif atteint avant le passage de l'attribution : montré atteint, en premier.
    expect(await avancement(awa.id)).toEqual([
      ['PREMIERE_CREATION', 1, 1],
      ['REPRODUCTIBLE', 3, 5],
      ['PARCOURS_COMPLET', 0, 1],
    ]);
    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(lea.id)).toEqual(['PREMIER_ESSAI']);
    // Les plus avancés d'abord, puis ce qu'il reste à faire, puis l'ordre des badges ; jamais Pionnier.
    expect(await avancement(awa.id)).toEqual([
      ['REPRODUCTIBLE', 3, 5],
      ['PARCOURS_COMPLET', 0, 1],
      ['PREMIER_ESSAI', 0, 1],
    ]);

    const agent = request.agent(contexte.app.getHttpServer());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    const profil = (await agent.get('/api/v1/membres/awa-sarr').expect(200)).body as ProfilApi;
    expect(profil.prive?.prochainsBadges[0]).toEqual({
      code: 'REPRODUCTIBLE',
      libelle: 'Reproductible',
      critere: 'Être reproduit avec succès par 5 membres',
      icone: 'repeat',
      ton: 'VERT',
      valeur: 3,
      objectif: 5,
      unite: 'membres',
    });
    const public_ = (await request(contexte.app.getHttpServer()).get('/api/v1/membres/awa-sarr'))
      .body as ProfilApi;
    expect(public_.prive).toBeNull();

    // Deux réussites de plus : le badge est attribué et quitte les prochains.
    await reproduire(5, creationId, 'SUCCES');
    await reproduire(6, creationId, 'SUCCES');
    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(awa.id)).toEqual(expect.arrayContaining(['REPRODUCTIBLE']));
    expect((await avancement(awa.id)).map(([code]) => code)).not.toContain('REPRODUCTIBLE');
  });
});
