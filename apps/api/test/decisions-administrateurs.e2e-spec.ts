import type { DecisionApi, DossierMembreApi, JournalDecisionsApi } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import {
  badge,
  decisionModeration,
  mouvementReputation,
  notification,
  obtentionBadge,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
import { BadgesService } from '../src/modules/progression/badges.service.js';
import {
  confirmerIdentite,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;

describe('Décisions des administrateurs (ADM-02, RG-102, RG-103, CI-24)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let adminId: number;
  let awaId: number;
  let thomasId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, email);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const claire = () => agentConnecte('claire@example.com');
  const dossier = async (agent: Agent, id: number) =>
    (await agent.get(`/api/v1/admin/membres/${id}`).expect(200)).body as DossierMembreApi;
  const badgesDe = async (id: number) =>
    (
      await contexte.db
        .select({ code: badge.code })
        .from(obtentionBadge)
        .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
        .where(eq(obtentionBadge.utilisateurId, id))
    ).map((b) => b.code);
  const decisionsDe = (id: number) =>
    contexte.db
      .select({ donnees: notification.donnees })
      .from(notification)
      .where(
        and(eq(notification.destinataireId, id), eq(notification.type, 'DECISION_MODERATION')),
      );

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'contenu');
    adminId = (
      await creerMembre(contexte, {
        pseudo: 'claire-dubois',
        email: 'claire@example.com',
        role: 'ADMINISTRATEUR',
      })
    ).id;
    awaId = (await creerMembre(contexte)).id;
    thomasId = (
      await creerMembre(contexte, {
        pseudo: 'thomas-diallo',
        email: 'thomas@example.com',
        role: 'MODERATEUR',
      })
    ).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
    await contexte.app.close();
  });

  it('sont réservées aux administrateurs, jamais sur leur propre compte (RG-104)', async () => {
    const thomas = await agentConnecte('thomas@example.com');
    await thomas.get(`/api/v1/admin/membres/${awaId}`).expect(403);
    await thomas
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'BANNIR', motif: 'Fraude.' })
      .expect(403);

    const agent = await claire();
    const soi = await dossier(agent, adminId);
    expect(soi).toMatchObject({ soi: true, actions: [] });
    const refus = await agent
      .post(`/api/v1/admin/membres/${adminId}/decisions`)
      .send({ action: 'AJUSTER_REPUTATION', motif: 'Essai.', points: 100 })
      .expect(403);
    expect(refus.body.detail).toMatch(/un autre administrateur/);
    await agent.get('/api/v1/admin/membres/999999').expect(404);
    // La modération garde ses décisions : un administrateur ne masque rien par cette route.
    expect(
      (
        await agent
          .post(`/api/v1/admin/membres/${awaId}/decisions`)
          .send({ action: 'SUSPENDRE', motif: 'Spam.' })
          .expect(400)
      ).body.erreurs.action,
    ).toBe('Choisissez la décision.');
  });

  it('présente le dossier d’un membre : réputation, badges, décisions et mesures possibles', async () => {
    const creationId = await creerCreation(contexte, awaId);
    await contexte.taches.lancer('badges.attribuer');
    await contexte.db.insert(decisionModeration).values([
      {
        decideurId: thomasId,
        contenuId: creationId,
        action: 'MASQUER',
        motif: 'Données personnelles visibles.',
        date: new Date('2026-10-20T10:00:00Z'),
      },
      {
        decideurId: thomasId,
        membreViseId: awaId,
        action: 'SUSPENDRE',
        motif: 'Récidive.',
        date: new Date(),
        dateFinSuspension: new Date(Date.now() + 3 * 86_400_000),
      },
    ]);
    const vu = await dossier(await claire(), awaId);
    expect(vu).toMatchObject({
      membre: { membre: { pseudo: 'awa-sarr' }, role: 'MEMBRE', statutCompte: 'ACTIF' },
      pointsReputation: 0,
      badges: [{ code: 'PREMIERE_CREATION' }],
      soi: false,
      actions: ['BANNIR', 'AJUSTER_REPUTATION', 'RETIRER_BADGE'],
    });
    expect(vu.suspensionJusqua).not.toBeNull();
    expect(vu.decisions.map((d) => d.action)).toEqual(['SUSPENDRE', 'MASQUER']);
  });

  it('ajuste la réputation par un mouvement justifié, notifié et écrit au membre (CI-24)', async () => {
    const agent = await claire();
    const retrait = (
      await agent
        .post(`/api/v1/admin/membres/${awaId}/decisions`)
        .send({
          action: 'AJUSTER_REPUTATION',
          motif: 'Votes croisés avec trois comptes.',
          points: -30,
        })
        .expect(201)
    ).body as DecisionApi;
    expect(retrait).toMatchObject({
      action: 'AJUSTER_REPUTATION',
      points: -30,
      contenuId: null,
      membreVise: { pseudo: 'awa-sarr' },
      decideur: { pseudo: 'claire-dubois' },
    });
    const [mouvement] = await contexte.db
      .select()
      .from(mouvementReputation)
      .where(eq(mouvementReputation.beneficiaireId, awaId));
    expect(mouvement).toMatchObject({
      motif: 'AJUSTEMENT_MODERATION',
      points: -30,
      decisionId: retrait.id,
      contenuId: null,
    });
    expect(await decisionsDe(awaId)).toEqual([
      {
        donnees: {
          action: 'AJUSTER_REPUTATION',
          motif: 'Votes croisés avec trois comptes.',
          points: -30,
        },
      },
    ]);
    expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
      ['awa.sarr@example.com', 'Votre réputation a été corrigée'],
    ]);

    // Un ajout qui fait passer un palier est notifié comme les autres points (F-71).
    await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'AJUSTER_REPUTATION', motif: 'Points perdus par erreur.', points: 90 })
      .expect(201);
    expect((await dossier(agent, awaId)).pointsReputation).toBe(60);
    expect(
      await contexte.db.$count(
        notification,
        and(eq(notification.destinataireId, awaId), eq(notification.type, 'NIVEAU_ATTEINT')),
      ),
    ).toBe(1);
    // Le journal des décisions donne les points de chaque ajustement.
    const journal = (
      await agent.get('/api/v1/admin/decisions?action=AJUSTER_REPUTATION').expect(200)
    ).body as JournalDecisionsApi;
    expect(journal.elements.map((d) => d.points)).toEqual([90, -30]);
  });

  it('retire un badge, que la tâche d’attribution ne redonne plus', async () => {
    await creerCreation(contexte, awaId);
    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(awaId)).toEqual(['PREMIERE_CREATION']);
    const agent = await claire();
    const autre = await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'RETIRER_BADGE', motif: 'Création recopiée.', badge: 'PODIUM' })
      .expect(400);
    expect(autre.body.erreurs.badge).toBe('Ce membre n’a pas ce badge.');

    const retrait = (
      await agent
        .post(`/api/v1/admin/membres/${awaId}/decisions`)
        .send({ action: 'RETIRER_BADGE', motif: 'Création recopiée.', badge: 'PREMIERE_CREATION' })
        .expect(201)
    ).body as DecisionApi;
    expect(retrait.badge).toEqual({ code: 'PREMIERE_CREATION', libelle: expect.any(String) });
    expect(await badgesDe(awaId)).toEqual([]);
    await contexte.taches.lancer('badges.attribuer');
    expect(await badgesDe(awaId)).toEqual([]);
    const prochains = await contexte.app.get(BadgesService).prochains(awaId);
    expect(prochains.map((b) => b.code)).not.toContain('PREMIERE_CREATION');
    expect(await decisionsDe(awaId)).toEqual([
      {
        donnees: {
          action: 'RETIRER_BADGE',
          motif: 'Création recopiée.',
          badge: 'PREMIERE_CREATION',
        },
      },
    ]);
    expect(contexte.emails.at(-1)?.sujet).toMatch(/^Le badge «\s.+\s» vous a été retiré$/);
    // Plus aucun badge : plus rien à retirer.
    await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'RETIRER_BADGE', motif: 'Encore.', badge: 'PREMIERE_CREATION' })
      .expect(409);
  });

  it('bannit : le compte est fermé avec ses sessions et ne se reconnecte plus (RG-103)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const agent = await claire();
    await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'BANNIR', motif: 'Comptes multiples pour voter.' })
      .expect(201);
    const [compte] = await contexte.db
      .select({ statut: utilisateur.statutCompte })
      .from(utilisateur)
      .where(eq(utilisateur.id, awaId));
    expect(compte?.statut).toBe('BANNI');
    expect(await contexte.db.$count(session, eq(session.utilisateurId, awaId))).toBe(0);
    await awa.patch('/api/v1/moi').send({ nomAffiche: 'Awa' }).expect(401);
    const connexion = await request(serveur())
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
      .expect(403);
    expect(connexion.body.detail).toMatch(/fermé par la modération/);
    // Pas de notification pour un compte qui ne se connecte plus : l'e-mail l'informe.
    expect(await decisionsDe(awaId)).toEqual([]);
    expect(contexte.emails.map((e) => e.sujet)).toEqual(['Votre compte Vysora est fermé']);
    expect((await dossier(agent, awaId)).actions).toEqual([]);
    const encore = await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'AJUSTER_REPUTATION', motif: 'Encore.', points: -5 })
      .expect(409);
    expect(encore.body.detail).toMatch(/Ce compte est fermé/);
  });

  it('ne ferme pas un compte en cours de suppression, ferme celui d’un autre administrateur', async () => {
    await contexte.db
      .update(utilisateur)
      .set({ statutCompte: 'EN_SUPPRESSION' })
      .where(eq(utilisateur.id, awaId));
    const agent = await claire();
    expect((await dossier(agent, awaId)).actions).toEqual(['AJUSTER_REPUTATION']);
    const refus = await agent
      .post(`/api/v1/admin/membres/${awaId}/decisions`)
      .send({ action: 'BANNIR', motif: 'Fraude.' })
      .expect(409);
    expect(refus.body.detail).toMatch(/demandé la suppression/);

    await contexte.db
      .update(utilisateur)
      .set({ role: 'ADMINISTRATEUR' })
      .where(eq(utilisateur.id, thomasId));
    await agent
      .post(`/api/v1/admin/membres/${thomasId}/decisions`)
      .send({ action: 'BANNIR', motif: 'Compte compromis.' })
      .expect(201);
  });
});
