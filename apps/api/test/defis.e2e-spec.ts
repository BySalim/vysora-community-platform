import type { DefisApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { creation, defi, vote } from '../src/db/schema/index.js';
import {
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
const JOUR = 86_400_000;

describe('Défis (S-07, F-63 à F-65, RG-73 à RG-75)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let awaId: number;
  let leaId: number;
  let defiId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const lire = async (agent: Agent | ReturnType<typeof request>) =>
    (await agent.get('/api/v1/defis').expect(200)).body as DefisApi;
  const participer = (agent: Agent, creationId: number, id = defiId) =>
    agent.put(`/api/v1/defis/${id}/participation`).send({ creationId });

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    awaId = (await creerMembre(contexte)).id;
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    const [cree] = await contexte.db
      .insert(defi)
      .values({
        organisateurId: awaId,
        titre: 'Une affiche touristique',
        slug: 'une-affiche-touristique',
        enonce: 'Créez l’affiche d’un lieu que vous aimez.',
        contraintes: '- Trois échanges au plus\n- Un lieu réel',
        dateDebut: new Date(Date.now() - 2 * JOUR),
        dateFin: new Date(Date.now() + 3 * JOUR),
        statut: 'PUBLIE',
      })
      .returning({ id: defi.id });
    defiId = cree!.id;
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    await contexte.app.close();
  });

  it('présente le défi en cours, jamais un brouillon', async () => {
    const d = await lire(request(serveur()));
    expect(d.defi).toMatchObject({
      id: defiId,
      etat: 'EN_COURS',
      regles: ['Trois échanges au plus', 'Un lieu réel'],
      participations: 0,
    });
    expect(d.moi).toBeNull();
    await contexte.db.update(defi).set({ statut: 'BROUILLON' }).where(eq(defi.id, defiId));
    expect((await lire(request(serveur()))).defi).toBeNull();
  });

  it('inscrit une création publiée pendant le défi, une par personne (RG-74), classée par votes (RG-75)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const premiere = await creerCreation(contexte, awaId);
    const seconde = await creerCreation(contexte, awaId);
    const ancienne = await creerCreation(contexte, awaId);
    await contexte.db
      .update(creation)
      .set({ datePublication: new Date(Date.now() - 5 * JOUR) })
      .where(eq(creation.id, ancienne));
    const deLea = await creerCreation(contexte, leaId);

    expect((await lire(awa)).moi?.eligibles.map((c) => c.id).toSorted()).toEqual(
      [premiere, seconde].toSorted(),
    );
    expect((await participer(awa, ancienne).expect(409)).body.detail).toMatch(/pendant la période/);
    expect((await participer(awa, deLea).expect(404)).body.detail).toMatch(/introuvable/);
    await participer(awa, premiere).expect(204);
    expect((await participer(awa, seconde).expect(409)).body.detail).toMatch(
      /une création par personne/,
    );
    expect((await lire(awa)).moi).toEqual({
      participation: { id: premiere, titre: 'Cité imaginaire entre ciel et mer' },
      eligibles: [],
    });

    const lea = await agentConnecte('lea@example.com');
    await participer(lea, deLea).expect(204);
    await contexte.db
      .insert(vote)
      .values({ votantId: awaId, contenuId: deLea, typeVoteCode: 'UTILE' });
    const d = await lire(lea);
    expect(d.participations.map((p) => [p.auteur.pseudo, p.utiles, p.monVote])).toEqual([
      ['lea-martin', 1, false],
      ['awa-sarr', 0, false],
    ]);

    await awa.delete(`/api/v1/defis/${defiId}/participation`).expect(204);
    expect((await lire(awa)).participations).toHaveLength(1);
    // Défi passé : les participations sont fermées.
    await contexte.db
      .update(defi)
      .set({ dateDebut: new Date(Date.now() - 10 * JOUR), dateFin: new Date(Date.now() - JOUR) })
      .where(eq(defi.id, defiId));
    expect((await participer(awa, premiere).expect(409)).body.detail).toMatch(/fermées/);
    await request(serveur())
      .put(`/api/v1/defis/${defiId}/participation`)
      .set('Origin', ORIGINE_SITE)
      .send({ creationId: premiere })
      .expect(401);
  });
});
