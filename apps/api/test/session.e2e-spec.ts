import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  decisionModeration,
  demandeDroit,
  documentLegal,
  mouvementReputation,
  notification,
  session,
  tentativeConnexion,
  utilisateur,
} from '../src/db/schema/index.js';
import { dateDuJour } from '../src/modules/auth/documents-legaux.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  cookieRecu,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const JOUR_MS = 24 * 60 * 60_000;

describe('Session (F-03, ADR-0005)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const connecter = (email: string, motDePasse: string, agent = request(serveur())) =>
    agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse });

  /** Agent connecté (cookie conservé d'une requête à l'autre). */
  async function agentConnecte(email = 'awa.sarr@example.com') {
    const agent = request.agent(serveur());
    await connecter(email, MOT_DE_PASSE, agent).expect(200);
    return agent;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'tentative_connexion');
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'tentative_connexion');
    await contexte.app.close();
  });

  describe('GET /api/v1/session', () => {
    it('présente un visiteur sans cookie', async () => {
      const reponse = await request(serveur()).get('/api/v1/session').expect(200);
      expect(reponse.body).toEqual({
        etat: { session: 'visiteur', role: 'membre', niveau: 'curieux', compte: 'actif' },
        membre: null,
        nonLues: 0,
        suspensionJusqua: null,
        conditionsDepuis: null,
      });
      expect(cookieRecu(reponse.headers)).toBeUndefined();
    });

    it('efface un cookie qui ne correspond à aucune session', async () => {
      const reponse = await request(serveur())
        .get('/api/v1/session')
        .set('Cookie', 'vysora_session=jeton-inconnu')
        .expect(200);
      expect(reponse.body.etat.session).toBe('visiteur');
      expect(cookieRecu(reponse.headers)).toMatch(/^vysora_session=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('calcule le niveau, le rôle et les notifications non lues du membre', async () => {
      const membre = await creerMembre(contexte, { role: 'ADMINISTRATEUR' });
      await contexte.db.insert(mouvementReputation).values([
        { beneficiaireId: membre.id, points: 40, motif: 'CAS_VALIDE' },
        { beneficiaireId: membre.id, points: 20, motif: 'REPONSE_ACCEPTEE' },
      ]);
      await contexte.db.insert(notification).values([
        { destinataireId: membre.id, type: 'BADGE_OBTENU' },
        { destinataireId: membre.id, type: 'NIVEAU_ATTEINT' },
        { destinataireId: membre.id, type: 'NIVEAU_ATTEINT', estLue: true },
      ]);

      const agent = await agentConnecte();
      const reponse = await agent.get('/api/v1/session').expect(200);
      expect(reponse.body).toMatchObject({
        // RG-84 : 60 points, au-delà du seuil d'Apprenti (50).
        etat: { session: 'membre', role: 'admin', niveau: 'apprenti', compte: 'actif' },
        membre: { id: membre.id, pseudo: 'awa-sarr', nom: 'awa-sarr', points: 60, avatar: null },
        nonLues: 2,
        suspensionJusqua: null,
        conditionsDepuis: null,
      });
    });

    it('met le compte en lecture seule pendant une suspension (RG-103)', async () => {
      const membre = await creerMembre(contexte);
      const moderateur = await creerMembre(contexte, {
        pseudo: 'kofi-mensah',
        email: 'kofi@example.com',
        role: 'MODERATEUR',
      });
      const fin = new Date(Date.now() + 3 * JOUR_MS);
      await contexte.db.insert(decisionModeration).values({
        decideurId: moderateur.id,
        membreViseId: membre.id,
        action: 'SUSPENDRE',
        motif: 'Messages répétés hors sujet.',
        dateFinSuspension: fin,
      });

      const reponse = await (await agentConnecte()).get('/api/v1/session').expect(200);
      expect(reponse.body.etat.compte).toBe('suspendu');
      expect(reponse.body.suspensionJusqua).toBe(fin.toISOString());
    });

    it('demande l’acceptation d’une nouvelle version des documents (F-04, RG-112)', async () => {
      await creerMembre(contexte);
      const [nouvelle] = await contexte.db
        .insert(documentLegal)
        .values({ type: 'CGU', version: 'test-session', dateEffet: dateDuJour(), url: '/cgu' })
        .returning();
      try {
        const reponse = await (await agentConnecte()).get('/api/v1/session').expect(200);
        expect(reponse.body.etat.compte).toBe('conditions');
        expect(reponse.body.conditionsDepuis).toBe(dateDuJour());
      } finally {
        await contexte.db.delete(documentLegal).where(eq(documentLegal.id, nouvelle?.id ?? 0));
      }
    });

    it('repousse l’échéance d’une session active et renouvelle le cookie', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      const avant = new Date(Date.now() - 2 * 60 * 60_000);
      await contexte.db
        .update(session)
        .set({ dateDerniereActivite: avant, dateExpiration: new Date(Date.now() + JOUR_MS) });

      const reponse = await agent.get('/api/v1/session').expect(200);
      expect(cookieRecu(reponse.headers)).toMatch(/^vysora_session=[\w-]{43};/);
      const [prolongee] = await contexte.db.select().from(session);
      expect(prolongee?.dateExpiration.getTime()).toBeGreaterThan(Date.now() + 29 * JOUR_MS);
    });

    it('ne reconnaît plus une session expirée', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      await contexte.db.update(session).set({ dateExpiration: new Date(Date.now() - 1000) });
      const reponse = await agent.get('/api/v1/session').expect(200);
      expect(reponse.body.etat.session).toBe('visiteur');
    });
  });

  describe('POST /api/v1/session', () => {
    it('ouvre une session avec les bons identifiants, sans tenir compte de la casse de l’adresse', async () => {
      const membre = await creerMembre(contexte);
      const reponse = await connecter('Awa.Sarr@Example.com', MOT_DE_PASSE).expect(200);
      expect(cookieRecu(reponse.headers)).toMatch(/HttpOnly/);
      expect(reponse.body).toMatchObject({
        etat: { session: 'membre', compte: 'actif' },
        membre: { pseudo: 'awa-sarr' },
        suppressionAnnulee: null,
      });

      const [apres] = await contexte.db
        .select()
        .from(utilisateur)
        .where(eq(utilisateur.id, membre.id));
      expect(apres?.dateDerniereConnexion).toBeInstanceOf(Date);
      const [ouverte] = await contexte.db.select().from(session);
      expect(ouverte).toMatchObject({ utilisateurId: membre.id, deuxFacteursValide: false });
    });

    it('répond de la même façon que l’adresse possède un compte ou non', async () => {
      await creerMembre(contexte);
      const mauvais = await connecter('awa.sarr@example.com', 'pas le bon mot').expect(401);
      const inconnu = await connecter('personne@example.com', 'pas le bon mot').expect(401);
      expect(mauvais.body).toEqual(inconnu.body);
      expect(mauvais.body).toMatchObject({
        code: 'IDENTIFIANTS_INCORRECTS',
        title: 'Adresse e-mail ou mot de passe incorrect.',
      });
    });

    it('temporise après 5 échecs consécutifs, même avec le bon mot de passe ensuite (F-03)', async () => {
      await creerMembre(contexte);
      for (let i = 0; i < 4; i += 1)
        await connecter('awa.sarr@example.com', 'pas le bon mot').expect(401);
      const cinquieme = await connecter('awa.sarr@example.com', 'pas le bon mot').expect(429);
      expect(cinquieme.body).toMatchObject({ code: 'TROP_DE_REQUETES', reessayerDans: 30 });
      expect(cinquieme.headers['retry-after']).toBe('30');

      const bloque = await connecter('awa.sarr@example.com', MOT_DE_PASSE).expect(429);
      expect(bloque.body.reessayerDans).toBeGreaterThan(0);

      // Le délai écoulé, la connexion aboutit et remet le compteur à zéro.
      await contexte.db.update(tentativeConnexion).set({ date: new Date(Date.now() - 60_000) });
      await connecter('awa.sarr@example.com', MOT_DE_PASSE).expect(200);
      await connecter('awa.sarr@example.com', 'pas le bon mot').expect(401);
    });

    it('temporise de la même façon une adresse sans compte', async () => {
      for (let i = 0; i < 4; i += 1)
        await connecter('personne@example.com', 'pas le bon mot').expect(401);
      const reponse = await connecter('personne@example.com', 'pas le bon mot').expect(429);
      expect(reponse.body.reessayerDans).toBe(30);
    });

    it('refuse un compte banni, une fois le mot de passe vérifié', async () => {
      await creerMembre(contexte, { statutCompte: 'BANNI' });
      const reponse = await connecter('awa.sarr@example.com', MOT_DE_PASSE).expect(403);
      expect(reponse.body.detail).toContain('fermé par la modération');
      expect(cookieRecu(reponse.headers)).toBeUndefined();
      await connecter('awa.sarr@example.com', 'pas le bon mot').expect(401);
    });

    it('annule la suppression demandée quand le membre se reconnecte (WF-23)', async () => {
      const membre = await creerMembre(contexte, { statutCompte: 'EN_SUPPRESSION' });
      const dateDemande = new Date(Date.now() - 5 * JOUR_MS);
      await contexte.db.insert(demandeDroit).values({
        utilisateurId: membre.id,
        type: 'SUPPRESSION',
        suppressionCreations: false,
        dateDemande,
      });

      const reponse = await connecter('awa.sarr@example.com', MOT_DE_PASSE).expect(200);
      expect(reponse.body.suppressionAnnulee).toBe(dateDemande.toISOString());
      const [compte] = await contexte.db
        .select()
        .from(utilisateur)
        .where(eq(utilisateur.id, membre.id));
      expect(compte?.statutCompte).toBe('ACTIF');
      const [demande] = await contexte.db
        .select()
        .from(demandeDroit)
        .where(and(eq(demandeDroit.utilisateurId, membre.id)));
      expect(demande?.statut).toBe('ANNULEE');
    });

    it('ferme la session déjà présente sur l’appareil plutôt que de la reprendre', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      const [premiere] = await contexte.db.select().from(session);
      await connecter('awa.sarr@example.com', MOT_DE_PASSE, agent).expect(200);
      const sessions = await contexte.db.select().from(session);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).not.toBe(premiere?.id);
    });

    it('signale chaque champ manquant', async () => {
      const reponse = await connecter('', '').expect(400);
      expect(reponse.body.erreurs).toEqual({
        email: 'Indiquez votre adresse e-mail.',
        motDePasse: 'Indiquez votre mot de passe.',
      });
    });
  });

  describe('DELETE /api/v1/session', () => {
    it('ferme la session de l’appareil courant et efface le cookie', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      const reponse = await agent.delete('/api/v1/session').set('Origin', ORIGINE_SITE).expect(204);
      expect(cookieRecu(reponse.headers)).toMatch(/^vysora_session=;/);
      expect(await contexte.db.select().from(session)).toHaveLength(0);
      expect((await agent.get('/api/v1/session').expect(200)).body.etat.session).toBe('visiteur');
    });

    it('refuse une déconnexion forcée depuis un autre site (CSRF)', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      const reponse = await agent
        .delete('/api/v1/session')
        .set('Origin', 'https://site-malveillant.example')
        .expect(403);
      expect(reponse.body.code).toBe('ORIGINE_REFUSEE');
      // Sans en-tête Origin ni Referer, une requête qui porte le cookie est refusée aussi.
      await agent.delete('/api/v1/session').expect(403);
      expect(await contexte.db.select().from(session)).toHaveLength(1);
    });
  });
});
