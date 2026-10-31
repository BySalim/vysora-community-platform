import type { OutilAdministreApi, ReferentielsApi } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import {
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Référentiel des outils et modèles (ADM-02, F-95, RG-110)', () => {
  let contexte: ApplicationDeTest;
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await contexte.app.close();
  });

  it('ajoute un outil et un modèle, puis les archive sans les supprimer', async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    const ip = ipDeTest();
    const admin = request.agent(contexte.app.getHttpServer());
    await admin
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'claire@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'claire@example.com');
    const a = admin.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);

    const outil = (
      await a
        .post('/api/v1/admin/outils')
        .send({
          nom: 'Outil Test Studio',
          editeur: 'Éditeur Test',
          type: 'GENERATEUR_IMAGE',
          famille: 'IMAGE',
        })
        .expect(201)
    ).body as OutilAdministreApi;
    expect(outil).toMatchObject({
      slug: 'outil-test-studio',
      editeur: 'Éditeur Test',
      type: 'GENERATEUR_IMAGE',
      famille: 'IMAGE',
      statut: 'ACTIF',
      utilisations: 0,
      modeles: [],
    });
    await a
      .post('/api/v1/admin/outils')
      .send({
        nom: 'Outil Test Studio',
        editeur: 'Éditeur Test',
        type: 'GENERATEUR_IMAGE',
        famille: 'IMAGE',
      })
      .expect(409);
    const avecModele = (
      await a
        .post(`/api/v1/admin/outils/${outil.id}/modeles`)
        .send({ nom: 'Test Image 2', nomCourt: 'Image 2' })
        .expect(201)
    ).body as OutilAdministreApi;
    const modeleId = avecModele.modeles[0]!.id;
    await a
      .post(`/api/v1/admin/outils/${outil.id}/modeles`)
      .send({ nom: 'Test Image 2', nomCourt: 'Image 2' })
      .expect(409);

    const proposes = async () =>
      (
        (await request(contexte.app.getHttpServer()).get('/api/v1/referentiels').expect(200))
          .body as ReferentielsApi
      ).outils.find((o) => o.id === outil.id);
    expect((await proposes())?.modeles.map((m) => m.id)).toEqual([modeleId]);
    await a.patch(`/api/v1/admin/modeles/${modeleId}`).send({ statut: 'RETIRE' }).expect(200);
    expect((await proposes())?.modeles).toEqual([]);
    await a.patch(`/api/v1/admin/outils/${outil.id}`).send({ statut: 'ARCHIVE' }).expect(200);
    expect(await proposes()).toBeUndefined();
    expect(
      ((await a.get('/api/v1/admin/outils').expect(200)).body as OutilAdministreApi[]).find(
        (o) => o.id === outil.id,
      )?.statut,
    ).toBe('ARCHIVE');
    await contexte.db.execute(sql`delete from outil where id = ${outil.id}`);
    await contexte.db.execute(sql`delete from modele where id = ${modeleId}`);
  });
});
