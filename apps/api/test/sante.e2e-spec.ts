import request from 'supertest';
import { demarrerApplication, type ApplicationDeTest } from './outils.js';

describe('GET /api/health', () => {
  let contexte: ApplicationDeTest;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  afterAll(async () => {
    await contexte.app.close();
  });

  it('indique que l’API et la base de données répondent', async () => {
    const reponse = await request(contexte.app.getHttpServer()).get('/api/health').expect(200);
    expect(reponse.body).toEqual({ statut: 'ok', baseDeDonnees: 'ok' });
  });

  it('répond au format « problem details » pour une adresse inconnue', async () => {
    const reponse = await request(contexte.app.getHttpServer()).get('/api/v1/inconnue').expect(404);
    expect(reponse.headers['content-type']).toContain('application/problem+json');
    expect(reponse.body).toMatchObject({ status: 404, code: 'INTROUVABLE' });
  });
});
