import type {
  InvitationAdministreeApi,
  JournalAuditApi,
  JournalDecisionsApi,
  ListeInvitationsApi,
  ListeMembresAdministresApi,
  MembreAdministreApi,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { CONFIG } from '../src/config/configuration.module.js';
import type { Configuration } from '../src/config/env.js';
import {
  badge,
  decisionModeration,
  doubleAuthentification,
  invitation,
  journalAudit,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
import { CODE_INVALIDE } from '../src/modules/auth/invitations.service.js';
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

  it('désactive un code libre, jamais un code utilisé ni expiré, et le refuse ensuite à l’inscription (ADM-02)', async () => {
    const agent = await claire();
    const { codes } = (
      await agent.post('/api/v1/admin/invitations').send({ nombre: 3 }).expect(201)
    ).body as { codes: string[] };
    const [libre, utilise, expire] = codes as [string, string, string];
    await contexte.db
      .update(invitation)
      .set({ dateUtilisation: new Date(), utilisateurId: awaId })
      .where(eq(invitation.code, utilise));
    await contexte.db
      .update(invitation)
      .set({ dateExpiration: new Date(Date.now() - 60_000) })
      .where(eq(invitation.code, expire));

    const desactiver = (code: string) =>
      agent.post(`/api/v1/admin/invitations/${code}/desactivation`).send({});
    const desactive = (await desactiver(libre.toLowerCase()).expect(200))
      .body as InvitationAdministreeApi;
    expect(desactive).toMatchObject({ code: libre, libre: false, utilisation: null });
    expect(desactive.dateDesactivation).not.toBeNull();
    // Déjà désactivé : rien ne change.
    expect((await desactiver(libre).expect(200)).body.dateDesactivation).toBe(
      desactive.dateDesactivation,
    );
    expect((await desactiver(utilise).expect(409)).body.detail).toBe(
      'Ce code a déjà servi à une inscription : il ne se désactive pas.',
    );
    await desactiver(expire).expect(409);
    await desactiver('VYS-AAAA-AA').expect(404);
    await desactiver('inconnu').expect(404);

    const liste = (await agent.get('/api/v1/admin/invitations').expect(200))
      .body as ListeInvitationsApi;
    expect(liste).toMatchObject({ total: 3, libres: 0 });
    // Un code utilisé reste compté comme utilisé, même si le membre a supprimé son compte depuis.
    await contexte.db
      .update(invitation)
      .set({ utilisateurId: null })
      .where(eq(invitation.code, utilise));
    expect(
      ((await agent.get('/api/v1/admin/invitations').expect(200)).body as ListeInvitationsApi)
        .libres,
    ).toBe(0);

    // L'inscription et le lien d'invitation le refusent comme un code inconnu.
    expect((await request(serveur()).get(`/api/v1/invitations/${libre}`).expect(200)).body).toEqual(
      { valable: false, par: null },
    );
    const config = contexte.app.get<Configuration>(CONFIG);
    config.INSCRIPTION_SUR_INVITATION = true;
    try {
      const refus = await request(serveur())
        .post('/api/v1/comptes')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ipDeTest())
        .send({
          email: 'kofi.mensah@example.com',
          motDePasse: MOT_DE_PASSE,
          accepteConditions: true,
          codeInvitation: libre,
        })
        .expect(400);
      expect(refus.body.erreurs).toEqual({ codeInvitation: CODE_INVALIDE });
    } finally {
      config.INSCRIPTION_SUR_INVITATION = false;
    }

    const [entree] = (
      (await agent.get('/api/v1/admin/journal?domaine=invitations').expect(200))
        .body as JournalAuditApi
    ).elements;
    expect(entree).toMatchObject({
      action: 'INVITATION_DESACTIVEE',
      acteur: { pseudo: 'claire-dubois' },
      cible: { type: 'invitation', nom: libre },
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

  it('présente le journal d’audit, filtrable par domaine, auteur et période (ENF-09)', async () => {
    const agent = await claire();
    await agent.put(`/api/v1/admin/membres/${awaId}/role`).send({ role: 'MODERATEUR' }).expect(200);
    await agent.post('/api/v1/admin/invitations').send({ nombre: 2, joursValidite: 7 }).expect(201);
    const [podium] = await contexte.db
      .select({ id: badge.id, libelle: badge.libelle })
      .from(badge)
      .where(eq(badge.code, 'PODIUM'));
    await contexte.db.insert(journalAudit).values([
      {
        acteurId: thomasId,
        action: 'BADGE_ARRETE',
        cibleType: 'badge',
        cibleId: podium!.id,
        date: new Date('2026-10-01T10:00:00Z'),
      },
      {
        acteurId: thomasId,
        action: 'DOCUMENT_LEGAL_RETIRE',
        cibleType: 'document_legal',
        cibleId: 999999,
        details: { type: 'CGU', version: '2026-11-15' },
        date: new Date('2026-10-02T10:00:00Z'),
      },
    ]);
    const journal = async (filtres = '') =>
      (await agent.get(`/api/v1/admin/journal${filtres}`).expect(200)).body as JournalAuditApi;

    const tout = await journal();
    expect(tout.total).toBe(4);
    expect(tout.elements.map((e) => e.action)).toEqual([
      'INVITATIONS_CREEES',
      'ROLE_MODIFIE',
      'DOCUMENT_LEGAL_RETIRE',
      'BADGE_ARRETE',
    ]);
    expect(tout.elements[1]).toMatchObject({
      acteur: { pseudo: 'claire-dubois' },
      cible: { type: 'utilisateur', id: awaId, membre: { pseudo: 'awa-sarr' } },
      details: { avant: 'MEMBRE', apres: 'MODERATEUR' },
    });
    expect(tout.elements[0]).toMatchObject({
      cible: null,
      details: { nombre: 2, joursValidite: 7 },
    });
    // Un élément d'un référentiel est nommé ; une version retirée l'est par ses détails.
    expect(tout.elements[3]?.cible).toMatchObject({ type: 'badge', nom: podium!.libelle });
    expect(tout.elements[2]?.cible).toMatchObject({ type: 'document_legal', nom: null });

    expect((await journal('?domaine=equipe')).elements.map((e) => e.action)).toEqual([
      'ROLE_MODIFIE',
    ]);
    expect((await journal('?acteur=thomas-diallo')).total).toBe(2);
    expect((await journal('?du=2026-10-02&au=2026-10-02')).elements.map((e) => e.action)).toEqual([
      'DOCUMENT_LEGAL_RETIRE',
    ]);
    await agent.get('/api/v1/admin/journal?domaine=tout').expect(400);
    const thomas = await agentConnecte('thomas@example.com');
    await thomas.get('/api/v1/admin/journal').expect(403);
  });
});
