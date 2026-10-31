import type {
  JournalDecisionsApi,
  ListeInvitationsApi,
  ListeMembresAdministresApi,
  MembreAdministreApi,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import {
  decisionModeration,
  doubleAuthentification,
  journalAudit,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
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

describe('Administration (ADM-01, F-92, F-96, RG-111)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let adminId: number;
  let awaId: number;
  let thomasId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string, verifie = true): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    if (verifie) await confirmerIdentite(contexte, email);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const claire = () => agentConnecte('claire@example.com');

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit', 'invitation');
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
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit', 'invitation');
    await contexte.app.close();
  });

  it('est réservée aux administrateurs dont l’identité est confirmée (SEC-02)', async () => {
    const thomas = await agentConnecte('thomas@example.com');
    await thomas.get('/api/v1/admin/membres').expect(403);
    const nonVerifiee = await agentConnecte('claire@example.com', false);
    await nonVerifiee.get('/api/v1/admin/membres').expect(403);
    await request(serveur()).get('/api/v1/admin/membres').expect(401);
  });

  it('présente l’équipe, puis les membres trouvés', async () => {
    const agent = await claire();
    const equipe = (await agent.get('/api/v1/admin/membres').expect(200))
      .body as ListeMembresAdministresApi;
    expect(equipe.elements.map((m) => [m.membre.pseudo, m.role, m.deuxFacteurs])).toEqual([
      ['claire-dubois', 'ADMINISTRATEUR', 'absente'],
      ['thomas-diallo', 'MODERATEUR', 'absente'],
    ]);
    expect(equipe.administrateursActifs).toBe(1);
    const trouves = (await agent.get('/api/v1/admin/membres?q=awa').expect(200))
      .body as ListeMembresAdministresApi;
    expect(trouves.elements.map((m) => m.membre.pseudo)).toEqual(['awa-sarr']);
    // Recherche exacte par adresse ; un « % » ne joue pas le joker.
    const parAdresse = (await agent.get('/api/v1/admin/membres?q=AWA.SARR@example.com').expect(200))
      .body as ListeMembresAdministresApi;
    expect(parAdresse.elements).toHaveLength(1);
    expect(
      (
        (await agent.get('/api/v1/admin/membres?q=%25').expect(200))
          .body as ListeMembresAdministresApi
      ).elements,
    ).toEqual([]);
  });

  it('attribue et retire un rôle, journalisé, sans jamais retirer le dernier administrateur', async () => {
    const agent = await claire();
    const promue = (
      await agent
        .put(`/api/v1/admin/membres/${awaId}/role`)
        .send({ role: 'MODERATEUR' })
        .expect(200)
    ).body as MembreAdministreApi;
    expect(promue.role).toBe('MODERATEUR');
    const [trace] = await contexte.db.select().from(journalAudit);
    expect(trace).toMatchObject({
      acteurId: adminId,
      action: 'ROLE_MODIFIE',
      cibleType: 'utilisateur',
      cibleId: awaId,
      details: { avant: 'MEMBRE', apres: 'MODERATEUR' },
    });
    expect(trace?.empreinteIp).toMatch(/^[0-9a-f]{64}$/);

    // RG-111 : Claire est la seule administratrice.
    const refus = await agent
      .put(`/api/v1/admin/membres/${adminId}/role`)
      .send({ role: 'MEMBRE' })
      .expect(409);
    expect(refus.body.detail).toMatch(/au moins un administrateur actif/);
    await agent
      .put(`/api/v1/admin/membres/${thomasId}/role`)
      .send({ role: 'ADMINISTRATEUR' })
      .expect(200);
    await agent.put(`/api/v1/admin/membres/${adminId}/role`).send({ role: 'MEMBRE' }).expect(200);
    // Claire n'est plus administratrice : sa session le voit aussitôt.
    await agent.get('/api/v1/admin/membres').expect(403);

    await agent.put(`/api/v1/admin/membres/999999/role`).send({ role: 'MEMBRE' }).expect(403);
    const thomas = await agentConnecte('thomas@example.com');
    await thomas.put(`/api/v1/admin/membres/999999/role`).send({ role: 'MEMBRE' }).expect(404);
    expect(
      (await thomas.put(`/api/v1/admin/membres/${awaId}/role`).send({ role: 'CHEF' }).expect(400))
        .body.erreurs.role,
    ).toBe('Choisissez un rôle.');
  });

  it('réinitialise la double authentification d’un membre de l’équipe', async () => {
    await contexte.db
      .insert(doubleAuthentification)
      .values({ utilisateurId: thomasId, secretChiffre: 'x', dateActivation: new Date() });
    await agentConnecte('thomas@example.com');
    const agent = await claire();
    expect(
      (
        (await agent.get('/api/v1/admin/membres').expect(200)).body as ListeMembresAdministresApi
      ).elements.find((m) => m.membre.id === thomasId)?.deuxFacteurs,
    ).toBe('active');
    const apres = (
      await agent.delete(`/api/v1/admin/membres/${thomasId}/deux-facteurs`).expect(200)
    ).body as MembreAdministreApi;
    expect(apres.deuxFacteurs).toBe('absente');
    const sessions = await contexte.db
      .select({ valide: session.deuxFacteursValide })
      .from(session)
      .where(eq(session.utilisateurId, thomasId));
    expect(sessions.map((s) => s.valide)).toEqual([false]);
    await agent.delete(`/api/v1/admin/membres/${thomasId}/deux-facteurs`).expect(404);
  });

  it('crée et suit les codes d’invitation', async () => {
    const agent = await claire();
    const { codes } = (
      await agent
        .post('/api/v1/admin/invitations')
        .send({ nombre: 3, joursValidite: 30 })
        .expect(201)
    ).body as { codes: string[] };
    expect(codes).toHaveLength(3);
    for (const code of codes) expect(code).toMatch(/^VYS-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
    await agent.post('/api/v1/admin/invitations').send({ nombre: 51 }).expect(400);
    const liste = (await agent.get('/api/v1/admin/invitations').expect(200))
      .body as ListeInvitationsApi;
    expect(liste).toMatchObject({ total: 3, libres: 3, page: 1, pages: 1 });
    expect(liste.elements[0]).toMatchObject({
      createur: { pseudo: 'claire-dubois' },
      utilisation: null,
      libre: true,
    });
  });

  it('présente le journal des décisions, filtrable par modérateur, membre, action et période', async () => {
    const creation = await creerCreation(contexte, awaId);
    await contexte.db.insert(decisionModeration).values([
      {
        decideurId: thomasId,
        contenuId: creation,
        action: 'MASQUER',
        motif: 'Données personnelles visibles.',
        date: new Date('2026-10-20T10:00:00Z'),
      },
      {
        decideurId: thomasId,
        membreViseId: awaId,
        action: 'AVERTIR',
        motif: 'Rappel de la charte.',
        date: new Date('2026-10-22T10:00:00Z'),
      },
      {
        decideurId: adminId,
        membreViseId: thomasId,
        action: 'AVERTIR',
        motif: 'Ton à revoir.',
        date: new Date('2026-10-25T10:00:00Z'),
      },
    ]);
    const agent = await claire();
    const journal = async (filtres = '') =>
      (
        (await agent.get(`/api/v1/admin/decisions${filtres}`).expect(200))
          .body as JournalDecisionsApi
      ).elements.map((d) => d.motif);
    expect(await journal()).toEqual([
      'Ton à revoir.',
      'Rappel de la charte.',
      'Données personnelles visibles.',
    ]);
    expect(await journal('?moderateur=thomas-diallo')).toHaveLength(2);
    // Le membre : sanctions qui le visent et décisions sur ses contenus.
    expect(await journal('?membre=awa-sarr')).toEqual([
      'Rappel de la charte.',
      'Données personnelles visibles.',
    ]);
    expect(await journal('?action=MASQUER')).toEqual(['Données personnelles visibles.']);
    expect(await journal('?du=2026-10-21&au=2026-10-22')).toEqual(['Rappel de la charte.']);
    expect(await journal('?moderateur=personne')).toEqual([]);
    await agent.get('/api/v1/admin/decisions?du=hier').expect(400);
    // Le compte banni n'est pas une raison de perdre son historique.
    await contexte.db
      .update(utilisateur)
      .set({ statutCompte: 'BANNI' })
      .where(eq(utilisateur.id, awaId));
    expect(await journal('?membre=awa-sarr')).toHaveLength(2);
  });
});
