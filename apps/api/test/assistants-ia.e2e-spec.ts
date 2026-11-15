import type { MesureAssistantsApi } from '@vysora/shared';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { passageAssistant } from '../src/db/schema/index.js';
import { ConservationService } from '../src/modules/taches/conservation.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0';
const robot = (nom: string) =>
  `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ${nom}; +https://example.com/bot`;

describe('Assistants d’IA (REF-03)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();

  const signaler = (corps: Record<string, unknown>) =>
    request(serveur())
      .post('/api/v1/assistants-ia/passages')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send(corps);

  async function agentConnecte(email: string): Promise<TestAgent> {
    const ip = ipDeTest();
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, email);
    return agent;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'passage_assistant');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    await creerMembre(contexte, {
      pseudo: 'thomas-diallo',
      email: 'thomas@example.com',
      role: 'MODERATEUR',
    });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'passage_assistant');
    await contexte.app.close();
  });

  it('compte les passages des assistants par page, sans rien garder de la personne', async () => {
    await signaler({ adresse: '/creations/12-cite', userAgent: robot('ChatGPT-User/1.0') }).expect(
      204,
    );
    await signaler({ adresse: '/creations/12-cite', userAgent: robot('ChatGPT-User/1.0') }).expect(
      204,
    );
    await signaler({
      adresse: '/creations/12-cite?utm_source=chatgpt.com',
      userAgent: CHROME,
    }).expect(204);
    await signaler({
      adresse: '/explorer?guide=rendez-vous',
      userAgent: CHROME,
      referent: 'https://www.perplexity.ai/',
    }).expect(204);
    await signaler({ adresse: '/robots.txt', userAgent: robot('GPTBot/1.2') }).expect(204);
    // Ni une visite ordinaire, ni une page de l'équipe, ni une adresse hors du site.
    await signaler({
      adresse: '/forum',
      userAgent: CHROME,
      referent: 'https://google.com/',
    }).expect(204);
    await signaler({ adresse: '/admin/roles', userAgent: robot('Claude-User/1.0') }).expect(204);
    await signaler({ adresse: 'https://exemple.com/', userAgent: robot('Claude-User/1.0') }).expect(
      204,
    );

    const lignes = await contexte.db.select().from(passageAssistant);
    expect(lignes).toHaveLength(4);
    expect(Object.keys(lignes[0] ?? {}).toSorted()).toEqual([
      'assistant',
      'chemin',
      'jour',
      'nature',
      'nombre',
    ]);
    expect(lignes).toContainEqual(
      expect.objectContaining({
        assistant: 'CHATGPT',
        nature: 'LECTURE',
        chemin: '/creations/12-cite',
        nombre: 2,
      }),
    );

    const mesure: MesureAssistantsApi = (
      await (
        await agentConnecte('claire@example.com')
      )
        .get('/api/v1/admin/assistants-ia?jours=7')
        .expect(200)
    ).body;
    expect(mesure.totaux).toEqual({ VISITE: 2, LECTURE: 2, EXPLORATION: 0, ENTRAINEMENT: 1 });
    expect(mesure.assistants[0]).toMatchObject({
      code: 'CHATGPT',
      nom: 'ChatGPT',
      VISITE: 1,
      LECTURE: 2,
      ENTRAINEMENT: 1,
    });
    expect(mesure.assistants.map((a) => a.code)).toEqual(['CHATGPT', 'PERPLEXITY']);
    // Les robots d'entraînement n'entrent pas dans les pages consultées.
    expect(mesure.pages.map((p) => p.chemin)).toEqual([
      '/creations/12-cite',
      '/explorer?guide=rendez-vous',
    ]);
  });

  it('réserve le tableau aux administrateurs et n’accepte que les périodes proposées', async () => {
    await request(serveur()).get('/api/v1/admin/assistants-ia').expect(401);
    await (
      await agentConnecte('thomas@example.com')
    )
      .get('/api/v1/admin/assistants-ia')
      .expect(403);
    const claire = await agentConnecte('claire@example.com');
    const vide: MesureAssistantsApi = (await claire.get('/api/v1/admin/assistants-ia').expect(200))
      .body;
    expect(vide).toMatchObject({ jours: 30, assistants: [], pages: [] });
    await claire.get('/api/v1/admin/assistants-ia?jours=365').expect(400);
  });

  it('efface les compteurs de plus de 13 mois', async () => {
    await contexte.db.insert(passageAssistant).values([
      { jour: '2025-01-10', assistant: 'CLAUDE', nature: 'LECTURE', chemin: '/' },
      { jour: '2026-10-10', assistant: 'CLAUDE', nature: 'LECTURE', chemin: '/' },
    ]);
    const bilan = await contexte.app
      .get(ConservationService)
      .appliquer(new Date('2026-11-15T12:00:00Z'));
    expect(bilan.passagesAssistants).toBe(1);
    expect(await contexte.db.select().from(passageAssistant)).toHaveLength(1);
  });
});
