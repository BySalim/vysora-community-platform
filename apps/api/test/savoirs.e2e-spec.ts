import { LIMITES, type ProgressionSavoirsApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { progressionSavoir } from '../src/db/schema/index.js';
import { ExportService } from '../src/modules/membres/export.service.js';
import {
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;

describe('Progression sur les savoirs d’Apprendre (APP-03)', () => {
  let contexte: ApplicationDeTest;
  let membreId: number;
  let agent: Agent;
  const aujourdhui = () => new Date().toISOString().slice(0, 10);
  const lire = async () =>
    (await agent.get('/api/v1/moi/savoirs').expect(200)).body as ProgressionSavoirsApi;
  const enregistrer = (savoir: string, corps: object) =>
    agent.put(`/api/v1/moi/savoirs/${savoir}`).send(corps);

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur');
    membreId = (await creerMembre(contexte)).id;
    const ip = ipDeTest();
    agent = request.agent(contexte.app.getHttpServer());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur');
    await contexte.app.close();
  });

  it('est réservée au membre connecté', async () => {
    await request(contexte.app.getHttpServer()).get('/api/v1/moi/savoirs').expect(401);
    expect(await lire()).toEqual({ acquis: {}, verifications: {} });
  });

  it('enregistre un savoir acquis et la réponse à sa question, datés du jour', async () => {
    await enregistrer('demande-claire', { acquis: true }).expect(200);
    const apres = (
      await enregistrer('contexte', {
        acquis: true,
        verification: { choix: 1, correcte: true },
      }).expect(200)
    ).body as ProgressionSavoirsApi;
    expect(apres).toEqual({
      acquis: { contexte: aujourdhui(), 'demande-claire': aujourdhui() },
      verifications: { contexte: { choix: 1, correcte: true, date: aujourdhui() } },
    });

    // Un savoir déjà acquis garde sa date ; une réponse inchangée aussi.
    await contexte.db
      .update(progressionSavoir)
      .set({ dateAcquis: '2026-09-01', dateVerification: '2026-09-02' })
      .where(eq(progressionSavoir.savoir, 'contexte'));
    await enregistrer('contexte', {
      acquis: true,
      verification: { choix: 1, correcte: true },
    }).expect(200);
    expect((await lire()).verifications.contexte?.date).toBe('2026-09-02');
    expect((await lire()).acquis.contexte).toBe('2026-09-01');

    // Recommencer la question, puis retirer l'acquis : le savoir sort de la progression.
    await enregistrer('contexte', { acquis: true, verification: null }).expect(200);
    expect((await lire()).verifications).toEqual({});
    await enregistrer('contexte', { acquis: false }).expect(200);
    expect(Object.keys((await lire()).acquis)).toEqual(['demande-claire']);

    await enregistrer('Pas un savoir', { acquis: true }).expect(404);
    await enregistrer('contexte', { acquis: 'oui' }).expect(400);
    await enregistrer('contexte', {
      acquis: true,
      verification: { choix: 7, correcte: true },
    }).expect(400);
  });

  it('verse la progression du navigateur au compte sans écraser ce qu’il connaît', async () => {
    await enregistrer('biais', {
      acquis: true,
      verification: { choix: 2, correcte: false },
    }).expect(200);
    const fusion = (
      await agent
        .post('/api/v1/moi/savoirs')
        .send({
          acquis: { biais: '2026-08-15', agent: '2099-01-01' },
          verifications: {
            biais: { choix: 0, correcte: true, date: '2026-08-15' },
            agent: { choix: 3, correcte: true, date: '2026-08-20' },
          },
        })
        .expect(200)
    ).body as ProgressionSavoirsApi;
    expect(fusion).toEqual({
      // La date la plus ancienne l'emporte ; une date à venir devient celle du jour.
      acquis: { agent: aujourdhui(), biais: '2026-08-15' },
      verifications: {
        agent: { choix: 3, correcte: true, date: '2026-08-20' },
        // La réponse déjà enregistrée dans le compte reste.
        biais: { choix: 2, correcte: false, date: aujourdhui() },
      },
    });
    await agent
      .post('/api/v1/moi/savoirs')
      .send({ acquis: { biais: 'hier' } })
      .expect(400);

    const donnees = (await contexte.app.get(ExportService).composer(membreId)) as {
      savoirs_apprendre: unknown[];
    };
    expect(donnees.savoirs_apprendre).toEqual([
      {
        savoir: 'agent',
        acquis_le: aujourdhui(),
        question_de_verification: { option: 4, juste: true, le: '2026-08-20' },
      },
      {
        savoir: 'biais',
        acquis_le: '2026-08-15',
        question_de_verification: { option: 3, juste: false, le: aujourdhui() },
      },
    ]);

    // « Effacer ma progression ».
    expect((await agent.delete('/api/v1/moi/savoirs').expect(200)).body).toEqual({
      acquis: {},
      verifications: {},
    });
    expect(await lire()).toEqual({ acquis: {}, verifications: {} });
  });

  it('borne le nombre de savoirs suivis par un membre', async () => {
    await contexte.db.insert(progressionSavoir).values(
      Array.from({ length: LIMITES.savoirsSuivis }, (_, i) => ({
        utilisateurId: membreId,
        savoir: `savoir-${i}`,
        dateAcquis: '2026-10-01',
      })),
    );
    await enregistrer('savoir-1', { acquis: false }).expect(200);
    await enregistrer('savoir-1', { acquis: true }).expect(200);
    await enregistrer('un-de-trop', { acquis: true }).expect(409);
    await agent
      .post('/api/v1/moi/savoirs')
      .send({ acquis: { 'un-de-trop': '2026-10-01' } })
      .expect(409);
  });
});
