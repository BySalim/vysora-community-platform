import type { ActivationDeuxFacteursApi, SessionApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { decoderBase32, hotp, pasDuMoment } from '../src/commun/securite/totp.js';
import { doubleAuthentification } from '../src/db/schema/index.js';
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

/** Code de l'application d'authentification pour cette clé, au pas donné (par défaut, maintenant). */
const codePour = (cle: string, decalage = 0) =>
  hotp(decoderBase32(cle), pasDuMoment(new Date()) + decalage);

describe('Double authentification (SEC-02, ENF-05)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<{ agent: Agent; session: SessionApi }> {
    const agent = request.agent(serveur());
    const reponse = await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return {
      agent: agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip),
      session: reponse.body,
    };
  }

  /** Configuration complète : clé, premier code, codes de secours. */
  async function activer(agent: Agent): Promise<{ cle: string; codes: string[] }> {
    const { cle } = (await agent.post('/api/v1/session/deux-facteurs/configuration').expect(200))
      .body as { cle: string };
    const activation = (
      await agent
        .put('/api/v1/session/deux-facteurs/configuration')
        .send({ code: codePour(cle) })
        .expect(200)
    ).body as ActivationDeuxFacteursApi;
    return { cle, codes: activation.codesSecours };
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur');
    await creerMembre(contexte, {
      pseudo: 'thomas-diallo',
      email: 'thomas@example.com',
      role: 'MODERATEUR',
    });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur');
    await contexte.app.close();
  });

  it('laisse un membre sans étape de plus', async () => {
    await creerMembre(contexte);
    const { session } = await agentConnecte('awa.sarr@example.com');
    expect(session.etat.role).toBe('membre');
    expect(session.deuxFacteurs).toBeUndefined();
  });

  it('fait configurer la double authentification avant de donner accès à la modération', async () => {
    const { agent, session } = await agentConnecte('thomas@example.com');
    expect(session.etat.role).toBe('membre');
    expect(session.deuxFacteurs).toEqual({ etape: 'configurer', role: 'moderateur' });
    await agent.get('/api/v1/moderation/file').expect(403);

    const configuration = (
      await agent.post('/api/v1/session/deux-facteurs/configuration').expect(200)
    ).body as { cle: string; adresse: string };
    expect(configuration.cle).toMatch(/^[A-Z2-7]{32}$/);
    expect(configuration.adresse).toBe(
      `otpauth://totp/Vysora%3Athomas-diallo?secret=${configuration.cle}&issuer=Vysora&algorithm=SHA1&digits=6&period=30`,
    );
    // La clé n'est gardée que chiffrée.
    const [ligne] = await contexte.db.select().from(doubleAuthentification);
    expect(ligne?.secretChiffre).not.toContain(configuration.cle);
    expect(ligne?.dateActivation).toBeNull();

    const refus = await agent
      .put('/api/v1/session/deux-facteurs/configuration')
      .send({ code: '000000' === codePour(configuration.cle) ? '111111' : '000000' })
      .expect(400);
    expect(refus.body.erreurs.code).toMatch(/ne correspond pas/);

    const activation = (
      await agent
        .put('/api/v1/session/deux-facteurs/configuration')
        .send({ code: codePour(configuration.cle) })
        .expect(200)
    ).body as ActivationDeuxFacteursApi;
    expect(activation.codesSecours).toHaveLength(8);
    for (const code of activation.codesSecours) expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(activation.session.etat.role).toBe('moderateur');
    expect(activation.session.deuxFacteurs).toBeUndefined();
    await agent.get('/api/v1/moderation/file').expect(200);
    // Les codes de secours ne sont gardés qu'en empreintes.
    const [active] = await contexte.db.select().from(doubleAuthentification);
    expect(JSON.stringify(active?.codesSecours)).not.toContain(activation.codesSecours[0]);
  });

  it('demande le code à chaque nouvelle connexion et refuse un code déjà servi', async () => {
    const premiere = await agentConnecte('thomas@example.com');
    const { cle } = await activer(premiere.agent);

    const { agent, session } = await agentConnecte('thomas@example.com');
    expect(session.etat.role).toBe('membre');
    expect(session.deuxFacteurs).toEqual({ etape: 'verifier', role: 'moderateur' });
    await agent.get('/api/v1/moderation/file').expect(403);
    // Une clé active ne se remplace pas : ni nouvelle clé ni nouvelle activation.
    await agent.post('/api/v1/session/deux-facteurs/configuration').expect(409);
    await agent
      .put('/api/v1/session/deux-facteurs/configuration')
      .send({ code: codePour(cle) })
      .expect(409);

    // Le code de l'activation a déjà servi (RFC 6238, § 5.2) : le suivant est demandé.
    const rejoue = await agent
      .post('/api/v1/session/deux-facteurs')
      .send({ code: codePour(cle) })
      .expect(400);
    expect(rejoue.body.erreurs.code).toMatch(/Attendez le suivant/);
    const verifiee = (
      await agent
        .post('/api/v1/session/deux-facteurs')
        .send({ code: codePour(cle, 1) })
        .expect(200)
    ).body as SessionApi;
    expect(verifiee.etat.role).toBe('moderateur');
    await agent.get('/api/v1/moderation/file').expect(200);
  });

  it('accepte une seule fois chaque code de secours', async () => {
    const premiere = await agentConnecte('thomas@example.com');
    const { codes } = await activer(premiere.agent);
    const code = codes[0] ?? '';

    const deuxieme = await agentConnecte('thomas@example.com');
    const verifiee = (
      await deuxieme.agent
        .post('/api/v1/session/deux-facteurs')
        .send({ codeSecours: code.toLowerCase() })
        .expect(200)
    ).body as SessionApi;
    expect(verifiee.etat.role).toBe('moderateur');

    const troisieme = await agentConnecte('thomas@example.com');
    const refus = await troisieme.agent
      .post('/api/v1/session/deux-facteurs')
      .send({ codeSecours: code })
      .expect(400);
    expect(refus.body.erreurs.codeSecours).toMatch(/déjà servi/);
    const [ligne] = await contexte.db
      .select({ codes: doubleAuthentification.codesSecours })
      .from(doubleAuthentification)
      .where(eq(doubleAuthentification.utilisateurId, premiere.session.membre?.id ?? 0));
    expect(ligne?.codes).toHaveLength(7);
  });

  it('refuse la vérification sans session', async () => {
    await request(serveur())
      .post('/api/v1/session/deux-facteurs')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ code: '123456' })
      .expect(401);
  });
});
