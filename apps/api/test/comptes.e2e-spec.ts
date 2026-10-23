import { verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  acceptationDocument,
  documentLegal,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
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

const inscription = {
  email: 'awa.sarr@example.com',
  motDePasse: MOT_DE_PASSE,
  accepteConditions: true,
};

describe('Comptes (F-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const inscrire = (corps: object) =>
    request(serveur())
      .post('/api/v1/comptes')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send(corps);

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur');
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur');
    await contexte.app.close();
  });

  describe('POST /api/v1/comptes', () => {
    it('crée le compte en lecture seule, accepte les documents en vigueur et ouvre la session', async () => {
      const reponse = await inscrire(inscription).expect(201);

      // Session : cookie illisible en JavaScript, envoyé seulement depuis le site (ADR-0005).
      const cookie = cookieRecu(reponse.headers);
      expect(cookie).toMatch(/^vysora_session=[\w-]{43};/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Expires=/);

      // RG-02 : e-mail non vérifié, donc lecture seule ; pseudo tiré au hasard, modifiable.
      expect(reponse.body.etat).toEqual({
        session: 'membre',
        role: 'membre',
        niveau: 'curieux',
        compte: 'email',
      });
      expect(reponse.body.membre.pseudo).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);

      const [cree] = await contexte.db
        .select()
        .from(utilisateur)
        .where(eq(utilisateur.email, 'awa.sarr@example.com'));
      expect(cree).toMatchObject({ role: 'MEMBRE', statutCompte: 'ACTIF', emailVerifie: false });
      // ENF-05 : empreinte Argon2id, jamais le mot de passe.
      expect(cree?.empreinteMotDePasse).toMatch(/^\$argon2id\$/);
      expect(await verify(cree?.empreinteMotDePasse ?? '', MOT_DE_PASSE)).toBe(true);

      // RG-03 : CGU et charte acceptées, datées ; la politique de confidentialité informe seulement.
      const acceptes = await contexte.db
        .select({ type: documentLegal.type })
        .from(acceptationDocument)
        .innerJoin(documentLegal, eq(documentLegal.id, acceptationDocument.documentLegalId))
        .where(eq(acceptationDocument.utilisateurId, cree?.id ?? 0));
      expect(acceptes.map((a) => a.type).toSorted()).toEqual(['CGU', 'CHARTE']);

      // Seule l'empreinte du jeton est conservée.
      const [ouverte] = await contexte.db.select().from(session);
      expect(ouverte?.id).toMatch(/^[0-9a-f]{64}$/);
      expect(cookie).not.toContain(ouverte?.id);
    });

    it('garde le pseudo choisi', async () => {
      const reponse = await inscrire({ ...inscription, pseudo: 'Awa_Sarr' }).expect(201);
      expect(reponse.body.membre).toMatchObject({ pseudo: 'Awa_Sarr', nom: 'Awa_Sarr', points: 0 });
    });

    it('refuse une adresse ou un pseudo déjà utilisés, sans distinction de casse (RG-01, RG-02)', async () => {
      await creerMembre(contexte, { pseudo: 'awa-sarr', email: 'awa.sarr@example.com' });
      const reponse = await inscrire({
        ...inscription,
        email: 'AWA.Sarr@Example.com',
        pseudo: 'AWA-SARR',
      }).expect(409);
      expect(reponse.body).toMatchObject({
        code: 'CONFLIT',
        erreurs: {
          email: 'Cette adresse est déjà associée à un compte Vysora.',
          pseudo: 'Ce pseudo est déjà pris.',
        },
      });
      expect(cookieRecu(reponse.headers)).toBeUndefined();
    });

    it('refuse un pseudo réservé (RG-01)', async () => {
      const reponse = await inscrire({ ...inscription, pseudo: 'Moderateur' }).expect(400);
      expect(reponse.body.erreurs).toEqual({
        pseudo: 'Ce pseudo est réservé. Choisissez-en un autre.',
      });
    });

    it('applique la politique de mot de passe (RG-04)', async () => {
      const cas: [string, string][] = [
        ['court', 'Votre mot de passe compte 12 caractères au moins.'],
        [
          'azerty123456',
          'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.',
        ],
        ['awa.sarr-secret', 'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.'],
      ];
      for (const [motDePasse, message] of cas) {
        const reponse = await inscrire({ ...inscription, motDePasse }).expect(400);
        expect(reponse.body.erreurs.motDePasse).toBe(message);
      }
      expect(await contexte.db.select().from(utilisateur)).toHaveLength(0);
    });

    it('exige l’acceptation des conditions (RG-03)', async () => {
      const reponse = await inscrire({ ...inscription, accepteConditions: false }).expect(400);
      expect(Object.keys(reponse.body.erreurs)).toEqual(['accepteConditions']);
    });

    it('refuse une inscription venue d’un autre site (CSRF)', async () => {
      await request(serveur())
        .post('/api/v1/comptes')
        .set('Origin', 'https://site-malveillant.example')
        .send(inscription)
        .expect(403);
    });

    it('limite les inscriptions à 10 par quart d’heure et par adresse IP', async () => {
      for (let i = 0; i < 10; i += 1)
        await inscrire({ ...inscription, email: `membre${i}@example.com` }).expect(201);
      const reponse = await inscrire({ ...inscription, email: 'membre10@example.com' }).expect(429);
      expect(reponse.body.code).toBe('TROP_DE_REQUETES');
    });
  });

  describe('vérifications de disponibilité', () => {
    it('dit si une adresse est déjà associée à un compte', async () => {
      await creerMembre(contexte);
      const verifier = (email: string) =>
        request(serveur())
          .post('/api/v1/comptes/disponibilite')
          .set('Origin', ORIGINE_SITE)
          .set('X-Forwarded-For', ip)
          .send({ email })
          .expect(200);
      expect((await verifier('Awa.Sarr@example.com')).body).toEqual({ disponible: false });
      expect((await verifier('kofi.mensah@example.com')).body).toEqual({ disponible: true });
    });

    it('vérifie un pseudo et propose des variantes libres (RG-01)', async () => {
      await creerMembre(contexte, { pseudo: 'awa-sarr' });
      await creerMembre(contexte, { pseudo: 'awa_sarr', email: 'awa2@example.com' });
      const verifier = async (pseudo: string) =>
        (
          await request(serveur())
            .get(`/api/v1/pseudos/${encodeURIComponent(pseudo)}/disponibilite`)
            .set('X-Forwarded-For', ip)
            .expect(200)
        ).body;

      expect(await verifier('kofi-mensah')).toEqual({
        pseudo: 'kofi-mensah',
        disponible: true,
        motif: null,
        propositions: [],
      });
      const pris = await verifier('Awa-Sarr');
      expect(pris).toMatchObject({ disponible: false, motif: 'pris' });
      expect(pris.propositions).toContain('awa-sarr-ia');
      expect(pris.propositions).not.toContain('awa_sarr');
      expect(await verifier('admin')).toMatchObject({ disponible: false, motif: 'reserve' });
      expect(await verifier('awa sarr')).toMatchObject({ disponible: false, motif: 'format' });
    });
  });

  describe('PATCH /api/v1/moi', () => {
    it('demande une session (AUTH-06)', async () => {
      const reponse = await request(serveur())
        .patch('/api/v1/moi')
        .set('Origin', ORIGINE_SITE)
        .send({ pseudo: 'kofi-mensah' })
        .expect(401);
      expect(reponse.body).toMatchObject({ code: 'NON_AUTHENTIFIE', raison: 'connexion' });
    });

    it('laisse un compte encore non vérifié choisir son pseudo (paramètres)', async () => {
      const agent = request.agent(serveur());
      await agent
        .post('/api/v1/comptes')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .send(inscription)
        .expect(201);

      const reponse = await agent
        .patch('/api/v1/moi')
        .set('Origin', ORIGINE_SITE)
        .send({ pseudo: 'awa-sarr' })
        .expect(200);
      expect(reponse.body.membre.pseudo).toBe('awa-sarr');
      expect(reponse.body.etat.compte).toBe('email');
      const [modifie] = await contexte.db.select().from(utilisateur);
      expect(modifie?.pseudo).toBe('awa-sarr');
    });

    it('refuse un pseudo déjà pris, mais accepte de changer la casse du sien', async () => {
      await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
      const agent = request.agent(serveur());
      await agent
        .post('/api/v1/comptes')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .send({ ...inscription, pseudo: 'awa-sarr' })
        .expect(201);

      const pris = await agent
        .patch('/api/v1/moi')
        .set('Origin', ORIGINE_SITE)
        .send({ pseudo: 'Kofi-Mensah' })
        .expect(409);
      expect(pris.body.erreurs).toEqual({ pseudo: 'Ce pseudo est déjà pris.' });

      await agent
        .patch('/api/v1/moi')
        .set('Origin', ORIGINE_SITE)
        .send({ pseudo: 'Awa-Sarr' })
        .expect(200);
    });
  });
});
