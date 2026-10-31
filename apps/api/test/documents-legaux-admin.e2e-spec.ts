import type { DocumentLegalAdministreApi, DocumentLegalApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { documentLegal } from '../src/db/schema/index.js';
import { dateDuJour } from '../src/modules/auth/documents-legaux.service.js';
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

const jour = (decalage: number) => dateDuJour(new Date(Date.now() + decalage * 86_400_000));

describe('Documents légaux dans l’administration (ADM-02, EC-25, RG-112)', () => {
  let contexte: ApplicationDeTest;
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await contexte.app.close();
  });

  it('publie une version à venir, la retire, puis la fait entrer en vigueur à sa date', async () => {
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
    const cgu = (documents: DocumentLegalAdministreApi[]) =>
      documents.find((d) => d.type === 'CGU')!;

    const avant = cgu((await a.get('/api/v1/admin/documents-legaux').expect(200)).body);
    expect(avant).toMatchObject({ url: '/cgu', acceptationRequise: true });
    expect(avant.versions[0]).toMatchObject({ etat: 'en-vigueur', retirable: false });

    // Un résumé des changements est exigé pour un document qui s'accepte ; jamais de date passée.
    await a
      .post('/api/v1/admin/documents-legaux')
      .send({ type: 'CGU', dateEffet: jour(10) })
      .expect(400);
    const passee = await a
      .post('/api/v1/admin/documents-legaux')
      .send({ type: 'CGU', dateEffet: jour(-1), resumeChangements: 'Les défis ont leurs règles.' })
      .expect(400);
    expect(passee.body.erreurs.dateEffet).toContain('date à venir');

    const apres = cgu(
      (
        await a
          .post('/api/v1/admin/documents-legaux')
          .send({
            type: 'CGU',
            dateEffet: jour(10),
            resumeChangements: 'Les défis ont leurs règles.',
          })
          .expect(201)
      ).body,
    );
    const aVenir = apres.versions[0]!;
    expect(aVenir).toMatchObject({ version: jour(10), etat: 'a-venir', retirable: true });
    expect(apres.versions[1]?.etat).toBe('en-vigueur');
    // Une version à venir ne s'accepte pas encore.
    const publics = (await request(contexte.app.getHttpServer()).get('/api/v1/documents-legaux'))
      .body as DocumentLegalApi[];
    expect(publics.find((d) => d.type === 'CGU')?.version).toBe(avant.versions[0]!.version);
    await a
      .post('/api/v1/admin/documents-legaux')
      .send({ type: 'CGU', dateEffet: jour(5), resumeChangements: 'Une autre version.' })
      .expect(400);

    await a.delete(`/api/v1/admin/documents-legaux/${aVenir.id}`).expect(200);
    await a.delete(`/api/v1/admin/documents-legaux/${avant.versions[0]!.id}`).expect(409);

    // Publiée pour aujourd'hui, elle entre aussitôt en vigueur et s'accepte (RG-03).
    const maintenant = cgu(
      (
        await a
          .post('/api/v1/admin/documents-legaux')
          .send({
            type: 'CGU',
            dateEffet: jour(0),
            resumeChangements: 'Les défis ont leurs règles.',
          })
          .expect(201)
      ).body,
    );
    expect(maintenant.versions.map((v) => v.etat)).toEqual(['en-vigueur', 'remplacee']);
    const session = await a.get('/api/v1/session').expect(200);
    expect(session.body).toMatchObject({
      etat: { compte: 'conditions' },
      conditionsDepuis: jour(0),
    });
    await contexte.db.delete(documentLegal).where(eq(documentLegal.id, maintenant.versions[0]!.id));
  });
});
