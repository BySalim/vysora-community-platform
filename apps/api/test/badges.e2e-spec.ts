import { and, eq } from 'drizzle-orm';
import { badge, notification, obtentionBadge, utilisateur } from '../src/db/schema/index.js';
import {
  creerCreation,
  creerMembre,
  demarrerApplication,
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
});
